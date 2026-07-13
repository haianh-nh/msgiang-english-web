-- Phase 5B: fast, atomic attendance save.
-- This RPC keeps attendance, absence and makeup updates in one database transaction.

create index if not exists idx_official_absence_records_source_generated
  on public.official_absence_records (source_session_key, generated_from_attendance);

create or replace function public.official_save_attendance_fast(
  p_session_key text,
  p_class_id uuid,
  p_session_date date,
  p_day_key text,
  p_start_time time,
  p_end_time time,
  p_session_type text,
  p_manual_makeups jsonb,
  p_rows jsonb,
  p_pending_makeup_plans jsonb,
  p_updated_by uuid,
  p_can_manage boolean,
  p_session_label text,
  p_capacity integer default 15
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_rows jsonb := coalesce(p_rows, '[]'::jsonb);
  v_pending jsonb := coalesce(p_pending_makeup_plans, '[]'::jsonb);
  v_manual jsonb := coalesce(p_manual_makeups, '[]'::jsonb);
  v_invalid_count integer := 0;
  v_row_count integer := 0;
  v_unique_row_count integer := 0;
  v_student_count integer := 0;
  v_requested_plan_count integer := 0;
  v_created_plan_count integer := 0;
  v_correction_updates jsonb := '[]'::jsonb;
  v_created_plans jsonb := '[]'::jsonb;
  v_completed_updates jsonb := '[]'::jsonb;
  v_missed_updates jsonb := '[]'::jsonb;
  v_makeup_absence_records jsonb := '[]'::jsonb;
  v_absence_records jsonb := '[]'::jsonb;
  v_completed_absence_ids text[] := array[]::text[];
  v_missed_absence_ids text[] := array[]::text[];
  v_resolved_absence_ids jsonb := '[]'::jsonb;
begin
  if coalesce(trim(p_session_key), '') = '' or p_class_id is null or p_session_date is null then
    raise exception using message = 'Thiếu thông tin buổi điểm danh', errcode = 'P0001';
  end if;

  if p_updated_by is null then
    raise exception using message = 'Không xác định được người lưu điểm danh', errcode = 'P0001';
  end if;

  if p_session_type not in ('regular', 'class_makeup') then
    raise exception using message = 'Loại buổi học không hợp lệ', errcode = 'P0001';
  end if;

  if jsonb_typeof(v_rows) <> 'array' or jsonb_typeof(v_pending) <> 'array' or jsonb_typeof(v_manual) <> 'array' then
    raise exception using message = 'Dữ liệu điểm danh không hợp lệ', errcode = 'P0001';
  end if;

  -- Serialize writes to the same lesson so two devices cannot replace each other's rows.
  perform pg_advisory_xact_lock(hashtextextended('official-attendance:' || p_session_key, 0));

  select count(*)
  into v_invalid_count
  from jsonb_to_recordset(v_rows) as r(student_id text, row_type text, status text, note text)
  where coalesce(trim(r.student_id), '') = ''
     or r.row_type not in ('official', 'makeup', 'manual_makeup')
     or r.status not in ('present', 'late', 'absent');

  if v_invalid_count > 0 then
    raise exception using message = 'Có dòng điểm danh không hợp lệ', errcode = 'P0001';
  end if;

  select
    count(*),
    count(distinct concat_ws('|', r.row_type, r.student_id)),
    count(distinct r.student_id)
  into v_row_count, v_unique_row_count, v_student_count
  from jsonb_to_recordset(v_rows) as r(student_id text, row_type text, status text, note text);

  if v_row_count <> v_unique_row_count then
    raise exception using message = 'Danh sách điểm danh có học sinh bị trùng', errcode = 'P0001';
  end if;


  -- A regular teacher may correct a pending absence, but once a makeup plan exists
  -- the source correction must be handled by Admin/Manager so linked plans are cancelled.
  if not coalesce(p_can_manage, false) and exists (
    select 1
    from public.official_absence_records a
    join jsonb_to_recordset(v_rows) as r(student_id text, row_type text, status text, note text)
      on r.row_type = 'official'
     and a.id = p_session_key || '__' || r.student_id
     and r.status <> 'absent'
    join public.official_makeup_plans mp on mp.absence_id = a.id
    where a.source_session_key = p_session_key
      and a.generated_from_attendance = true
  ) then
    raise exception using message = 'Lượt vắng này đã được xếp học bù. Hãy báo Admin/Quản lí sửa điểm danh gốc để hệ thống hủy lịch học bù đúng cách.', errcode = 'P0001';
  end if;

  if coalesce(p_can_manage, false) then
    with corrected as (
      select distinct a.id
      from public.official_absence_records a
      join jsonb_to_recordset(v_rows) as r(student_id text, row_type text, status text, note text)
        on r.row_type = 'official'
       and a.id = p_session_key || '__' || r.student_id
       and r.status <> 'absent'
      where a.source_session_key = p_session_key
        and a.generated_from_attendance = true
    ), updated as (
      update public.official_makeup_plans mp
      set status = 'cancelled', cancelled_at = v_now
      where mp.absence_id in (select id from corrected)
        and mp.status <> 'cancelled'
      returning mp.id, mp.absence_id, mp.status, mp.cancelled_at
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'absenceId', absence_id,
      'status', status,
      'cancelledAt', cancelled_at
    )), '[]'::jsonb)
    into v_correction_updates
    from updated;
  end if;

  -- Plans added from the closed-attendance screen are created in the same transaction.
  if jsonb_array_length(v_pending) > 0 then
    -- Coordinate with the existing makeup scheduling RPCs for this target lesson.
    perform pg_advisory_xact_lock(hashtext('official_makeup:' || p_session_key));

    if not coalesce(p_can_manage, false) then
      raise exception using message = 'Chỉ Admin/Quản lí được thêm học bù trong màn điểm danh đã đóng', errcode = 'P0001';
    end if;

    if v_student_count > greatest(coalesce(p_capacity, 15), 1) then
      raise exception using message = format('Buổi học vượt quá sĩ số tối đa %s học sinh', greatest(coalesce(p_capacity, 15), 1)), errcode = 'P0001';
    end if;

    select count(distinct p.absence_id)
    into v_requested_plan_count
    from jsonb_to_recordset(v_pending) as p(
      id text,
      absence_id text,
      student_id text,
      source_class_id text,
      source_session_key text,
      target_class_id text,
      target_session_key text
    );

    if exists (
      with raw as (
        select *
        from jsonb_to_recordset(v_pending) as p(
          id text,
          absence_id text,
          student_id text,
          source_class_id text,
          source_session_key text,
          target_class_id text,
          target_session_key text
        )
      )
      select 1
      from raw p
      where coalesce(trim(p.absence_id), '') = ''
         or coalesce(trim(p.student_id), '') = ''
         or coalesce(trim(p.source_class_id), '') = ''
         or coalesce(trim(p.source_session_key), '') = ''
         or p.target_class_id <> p_class_id::text
         or p.target_session_key <> p_session_key
         or p.source_class_id = p_class_id::text
    ) then
      raise exception using message = 'Có lượt học bù không hợp lệ trong danh sách điểm danh', errcode = 'P0001';
    end if;

    if exists (
      with raw as (
        select *
        from jsonb_to_recordset(v_pending) as p(
          id text,
          absence_id text,
          student_id text,
          source_class_id text,
          source_session_key text,
          target_class_id text,
          target_session_key text
        )
      )
      select 1
      from raw p
      join public.official_makeup_deleted_months d
        on d.month_key = to_char(public.official_session_key_date(p.source_session_key), 'YYYY-MM')
    ) then
      raise exception using message = 'Tháng dữ liệu vắng đã bị xóa, không thể thêm học bù', errcode = 'P0001';
    end if;

    with raw as (
      select *
      from jsonb_to_recordset(v_pending) as p(
        id text,
        absence_id text,
        student_id text,
        source_class_id text,
        source_session_key text,
        target_class_id text,
        target_session_key text
      )
    ), dedup as (
      select distinct on (absence_id)
        coalesce(nullif(id, ''), 'mk_' || substr(md5(p_session_key || ':' || absence_id || ':' || v_now::text), 1, 24)) as id,
        absence_id,
        student_id,
        source_class_id,
        source_session_key,
        target_class_id,
        target_session_key
      from raw
      order by absence_id, id nulls last
    ), eligible as (
      select d.*
      from dedup d
      join public.official_absence_records a
        on a.id = d.absence_id
       and a.student_id = d.student_id
       and a.source_class_id = d.source_class_id
       and a.source_session_key = d.source_session_key
       and a.status = 'pending'
      where not exists (
        select 1
        from public.official_makeup_plans old
        where old.absence_id = d.absence_id
          and old.status <> 'cancelled'
      )
    ), inserted as (
      insert into public.official_makeup_plans (
        id, absence_id, student_id, source_class_id, source_session_key,
        target_class_id, target_session_key, status, created_by
      )
      select
        e.id, e.absence_id, e.student_id, e.source_class_id, e.source_session_key,
        e.target_class_id, e.target_session_key, 'scheduled', p_updated_by
      from eligible e
      on conflict (id) do nothing
      returning *
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'absenceId', absence_id,
      'studentId', student_id,
      'sourceClassId', source_class_id,
      'sourceSessionKey', source_session_key,
      'targetClassId', target_class_id,
      'targetSessionKey', target_session_key,
      'status', status,
      'createdBy', created_by,
      'createdAt', created_at
    )), '[]'::jsonb)
    into v_created_plans
    from inserted;

    v_created_plan_count := jsonb_array_length(v_created_plans);
    if v_created_plan_count <> v_requested_plan_count then
      raise exception using message = 'Một hoặc nhiều lượt học bù không còn ở trạng thái chờ xếp. Hãy tải lại danh sách rồi thử lại.', errcode = 'P0001';
    end if;

    update public.official_absence_records a
    set status = 'scheduled', updated_at = v_now
    where a.id in (
      select item->>'absenceId'
      from jsonb_array_elements(v_created_plans) item
    );
  end if;

  insert into public.official_attendance_sessions (
    session_key, class_id, session_date, day_key, start_time, end_time,
    session_type, saved, editable, manual_makeups, updated_by, updated_at
  ) values (
    p_session_key, p_class_id, p_session_date, p_day_key, p_start_time, p_end_time,
    p_session_type, true, false, v_manual, p_updated_by, v_now
  )
  on conflict (session_key) do update set
    class_id = excluded.class_id,
    session_date = excluded.session_date,
    day_key = excluded.day_key,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    session_type = excluded.session_type,
    saved = true,
    editable = false,
    manual_makeups = excluded.manual_makeups,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  delete from public.official_attendance_rows
  where session_key = p_session_key;

  insert into public.official_attendance_rows (
    session_key, student_id, row_type, status, note, updated_at
  )
  select
    p_session_key,
    r.student_id,
    r.row_type,
    r.status,
    nullif(r.note, ''),
    v_now
  from jsonb_to_recordset(v_rows) as r(student_id text, row_type text, status text, note text);

  -- Present/Late in a makeup lesson completes the plan.
  with status_rows as (
    select student_id, status
    from jsonb_to_recordset(v_rows) as r(student_id text, row_type text, status text, note text)
    where row_type = 'makeup' and status in ('present', 'late')
  ), updated as (
    update public.official_makeup_plans mp
    set status = 'completed', cancelled_at = null
    from status_rows r
    where mp.target_session_key = p_session_key
      and mp.student_id = r.student_id
    returning mp.id, mp.absence_id, mp.status, mp.cancelled_at
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'absenceId', absence_id,
      'status', status,
      'cancelledAt', cancelled_at
    )), '[]'::jsonb),
    coalesce(array_agg(distinct absence_id) filter (where absence_id is not null), array[]::text[])
  into v_completed_updates, v_completed_absence_ids
  from updated;

  if cardinality(v_completed_absence_ids) > 0 then
    update public.official_absence_records
    set status = 'scheduled', updated_at = v_now
    where id = any(v_completed_absence_ids);

    select coalesce(jsonb_agg(x), '[]'::jsonb)
    into v_resolved_absence_ids
    from unnest(v_completed_absence_ids) x;
  end if;

  -- Absent in a makeup lesson cancels that attempt and returns the source absence to pending.
  with status_rows as (
    select student_id, status
    from jsonb_to_recordset(v_rows) as r(student_id text, row_type text, status text, note text)
    where row_type = 'makeup' and status = 'absent'
  ), updated as (
    update public.official_makeup_plans mp
    set status = 'cancelled', cancelled_at = v_now
    from status_rows r
    where mp.target_session_key = p_session_key
      and mp.student_id = r.student_id
    returning mp.id, mp.absence_id, mp.status, mp.cancelled_at
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'absenceId', absence_id,
      'status', status,
      'cancelledAt', cancelled_at
    )), '[]'::jsonb),
    coalesce(array_agg(distinct absence_id) filter (where absence_id is not null), array[]::text[])
  into v_missed_updates, v_missed_absence_ids
  from updated;

  if cardinality(v_missed_absence_ids) > 0 then
    update public.official_absence_records
    set status = 'pending', updated_at = v_now
    where id = any(v_missed_absence_ids);

    select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id,
      'studentId', a.student_id,
      'sourceClassId', a.source_class_id,
      'sourceSessionKey', a.source_session_key,
      'sourceSessionLabel', a.source_session_label,
      'reason', coalesce(a.reason, 'Vắng'),
      'generatedFromAttendance', a.generated_from_attendance,
      'status', a.status,
      'createdAt', a.created_at,
      'updatedAt', a.updated_at
    )), '[]'::jsonb)
    into v_makeup_absence_records
    from public.official_absence_records a
    where a.id = any(v_missed_absence_ids);
  end if;

  -- Remove generated source absences that are no longer absent.
  delete from public.official_absence_records a
  where a.source_session_key = p_session_key
    and a.generated_from_attendance = true
    and not exists (
      select 1
      from jsonb_to_recordset(v_rows) as r(student_id text, row_type text, status text, note text)
      where r.row_type = 'official'
        and a.id = p_session_key || '__' || r.student_id
        and r.status = 'absent'
    )
    and (
      a.status <> 'scheduled'
      or (
        coalesce(p_can_manage, false)
        and exists (
          select 1
          from jsonb_to_recordset(v_rows) as r(student_id text, row_type text, status text, note text)
          where r.row_type = 'official'
            and a.id = p_session_key || '__' || r.student_id
            and r.status <> 'absent'
        )
      )
    );

  -- Upsert official absences while preserving a source absence already scheduled for makeup.
  with absent_rows as (
    select student_id, note
    from jsonb_to_recordset(v_rows) as r(student_id text, row_type text, status text, note text)
    where row_type = 'official' and status = 'absent'
  ), prepared as (
    select
      p_session_key || '__' || r.student_id as id,
      r.student_id,
      p_class_id::text as source_class_id,
      p_session_key as source_session_key,
      coalesce(nullif(p_session_label, ''), p_day_key || ' ' || p_session_date::text || ' • ' || to_char(p_start_time, 'HH24:MI') || ' - ' || to_char(p_end_time, 'HH24:MI')) as source_session_label,
      coalesce(nullif(r.note, ''), old.reason, 'Vắng') as reason,
      case when old.status = 'scheduled' then 'scheduled' else 'pending' end as status
    from absent_rows r
    left join public.official_absence_records old
      on old.id = p_session_key || '__' || r.student_id
  )
  insert into public.official_absence_records (
    id, student_id, source_class_id, source_session_key, source_session_label,
    reason, generated_from_attendance, status, updated_at
  )
  select
    id, student_id, source_class_id, source_session_key, source_session_label,
    reason, true, status, v_now
  from prepared
  on conflict (id) do update set
    student_id = excluded.student_id,
    source_class_id = excluded.source_class_id,
    source_session_key = excluded.source_session_key,
    source_session_label = excluded.source_session_label,
    reason = excluded.reason,
    generated_from_attendance = true,
    status = excluded.status,
    updated_at = excluded.updated_at;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'studentId', a.student_id,
    'sourceClassId', a.source_class_id,
    'sourceSessionKey', a.source_session_key,
    'sourceSessionLabel', a.source_session_label,
    'reason', coalesce(a.reason, 'Vắng'),
    'generatedFromAttendance', a.generated_from_attendance,
    'status', a.status,
    'createdAt', a.created_at,
    'updatedAt', a.updated_at
  )), '[]'::jsonb)
  into v_absence_records
  from public.official_absence_records a
  where a.source_session_key = p_session_key;

  return jsonb_build_object(
    'ok', true,
    'updatedAt', v_now,
    'absenceRecords', v_absence_records,
    'makeupPlansCreated', v_created_plans,
    'makeupPlanUpdates', v_correction_updates || v_completed_updates || v_missed_updates,
    'makeupAbsenceRecords', v_makeup_absence_records,
    'makeupResolvedAbsenceIds', v_resolved_absence_ids
  );
end;
$$;

revoke all on function public.official_save_attendance_fast(
  text, uuid, date, text, time, time, text, jsonb, jsonb, jsonb, uuid, boolean, text, integer
) from public, anon, authenticated;

grant execute on function public.official_save_attendance_fast(
  text, uuid, date, text, time, time, text, jsonb, jsonb, jsonb, uuid, boolean, text, integer
) to service_role;

notify pgrst, 'reload schema';
