-- Performance phase 2: atomic makeup mutations and one-round-trip month state.
-- Safe to run more than once. No existing attendance/history rows are deleted.

create index if not exists idx_official_students_class_status
  on official_students (class_id, status);

create index if not exists idx_official_makeup_plans_absence_status
  on official_makeup_plans (absence_id, status);

create index if not exists idx_official_makeup_plans_target_status
  on official_makeup_plans (target_session_key, status);

create index if not exists idx_official_makeup_plans_target_student_status
  on official_makeup_plans (target_session_key, student_id, status);

create index if not exists idx_official_attendance_rows_session_type_student
  on official_attendance_rows (session_key, row_type, student_id);

-- Atomically validate and schedule one makeup plan.
create or replace function public.official_schedule_makeup_plan(
  p_id text,
  p_absence_id text,
  p_student_id text,
  p_source_class_id text,
  p_source_session_key text,
  p_target_class_id text,
  p_target_session_key text,
  p_created_by uuid,
  p_capacity integer default 15
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_absence official_absence_records%rowtype;
  v_target official_classes%rowtype;
  v_plan official_makeup_plans%rowtype;
  v_official_count integer := 0;
  v_makeup_count integer := 0;
  v_source_month text := '';
begin
  if coalesce(p_id, '') = '' or coalesce(p_absence_id, '') = '' or
     coalesce(p_student_id, '') = '' or coalesce(p_source_class_id, '') = '' or
     coalesce(p_target_class_id, '') = '' or coalesce(p_target_session_key, '') = '' then
    raise exception 'Thiếu thông tin xếp học bù' using errcode = 'P0001';
  end if;

  if p_source_class_id = p_target_class_id then
    raise exception 'Học sinh đã thuộc lớp này, không cần xếp học bù vào chính lớp gốc' using errcode = 'P0001';
  end if;

  -- Serialize capacity checks for the same target session.
  perform pg_advisory_xact_lock(hashtext('official_makeup:' || p_target_session_key));

  select * into v_absence
  from official_absence_records
  where id = p_absence_id
  for update;

  if not found then
    raise exception 'Không tìm thấy lượt vắng' using errcode = 'P0001';
  end if;

  if v_absence.student_id <> p_student_id or v_absence.source_class_id <> p_source_class_id then
    raise exception 'Thông tin học sinh/lớp vắng không khớp' using errcode = 'P0001';
  end if;

  if coalesce(v_absence.status, 'pending') <> 'pending' then
    raise exception 'Lượt vắng này đã được xếp học bù' using errcode = 'P0001';
  end if;

  select * into v_target
  from official_classes
  where id::text = p_target_class_id;

  if not found then
    raise exception 'Không tìm thấy lớp nhận học bù' using errcode = 'P0001';
  end if;

  if lower(coalesce(v_target.status, 'active')) in ('ended','inactive','cancelled','canceled','deleted','archived') then
    raise exception 'Không thể xếp học bù vào lớp đã kết thúc hoặc đã hủy' using errcode = 'P0001';
  end if;

  v_source_month := substring(v_absence.source_session_key from '\|([0-9]{4}-[0-9]{2})-[0-9]{2}\|');
  if coalesce(v_source_month, '') <> '' and exists (
    select 1 from official_makeup_deleted_months d where d.month_key = v_source_month
  ) then
    raise exception 'Tháng dữ liệu vắng này đã bị xóa, không thể xếp học bù' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from official_makeup_plans p
    where p.absence_id = p_absence_id
      and p.status <> 'cancelled'
  ) then
    raise exception 'Lượt vắng này đã được xếp học bù' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from official_makeup_plans p
    where p.target_session_key = p_target_session_key
      and p.student_id = p_student_id
      and p.status = 'scheduled'
  ) then
    raise exception 'Học sinh đã có trong buổi học bù này' using errcode = 'P0001';
  end if;

  select count(*)::integer into v_official_count
  from official_students s
  where s.class_id::text = p_target_class_id
    and s.status = 'active';

  select count(*)::integer into v_makeup_count
  from official_makeup_plans p
  where p.target_session_key = p_target_session_key
    and p.status = 'scheduled';

  if v_official_count + v_makeup_count >= greatest(coalesce(p_capacity, 15), 1) then
    raise exception 'Buổi này đã đủ % học sinh', greatest(coalesce(p_capacity, 15), 1) using errcode = 'P0001';
  end if;

  insert into official_makeup_plans (
    id, absence_id, student_id, source_class_id, source_session_key,
    target_class_id, target_session_key, status, created_by
  ) values (
    p_id, p_absence_id, p_student_id, p_source_class_id,
    coalesce(nullif(p_source_session_key, ''), v_absence.source_session_key),
    p_target_class_id, p_target_session_key, 'scheduled', p_created_by
  )
  returning * into v_plan;

  update official_absence_records
  set status = 'scheduled', updated_at = now()
  where id = p_absence_id
  returning * into v_absence;

  return jsonb_build_object(
    'plan', to_jsonb(v_plan),
    'absenceRecord', to_jsonb(v_absence),
    'counts', jsonb_build_object(
      'official', v_official_count,
      'makeup', v_makeup_count + 1,
      'total', v_official_count + v_makeup_count + 1,
      'capacity', greatest(coalesce(p_capacity, 15), 1)
    )
  );
end;
$$;

-- Atomically cancel a scheduled makeup plan and return its source absence to pending.
create or replace function public.official_cancel_makeup_plan(p_plan_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan official_makeup_plans%rowtype;
  v_absence official_absence_records%rowtype;
begin
  select * into v_plan
  from official_makeup_plans
  where id = p_plan_id
  for update;

  if not found then
    raise exception 'Không tìm thấy lịch học bù' using errcode = 'P0001';
  end if;

  if v_plan.status = 'completed' then
    raise exception 'Lịch học bù đã hoàn tất, không thể hủy bằng thao tác này' using errcode = 'P0001';
  end if;

  if v_plan.status <> 'cancelled' then
    update official_makeup_plans
    set status = 'cancelled', cancelled_at = now()
    where id = p_plan_id
    returning * into v_plan;
  end if;

  if coalesce(v_plan.absence_id, '') <> '' then
    update official_absence_records
    set status = 'pending', updated_at = now()
    where id = v_plan.absence_id
    returning * into v_absence;
  end if;

  return jsonb_build_object(
    'plan', to_jsonb(v_plan),
    'absenceRecord', case when v_absence.id is null then null else to_jsonb(v_absence) end
  );
end;
$$;

-- Return all data required by the monthly Makeup tab in one database call.
create or replace function public.official_get_makeup_month_state(p_month text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted boolean := false;
  v_pattern text;
begin
  if p_month is null or p_month !~ '^[0-9]{4}-[0-9]{2}$' then
    raise exception 'Tháng không hợp lệ' using errcode = 'P0001';
  end if;

  v_pattern := '%|' || p_month || '-%';
  select exists(select 1 from official_makeup_deleted_months d where d.month_key = p_month)
    into v_deleted;

  return (
    with monthly_absences as (
      select a.*
      from official_absence_records a
      where not v_deleted
        and a.source_session_key like v_pattern
    ),
    relevant_plans as (
      select p.*
      from official_makeup_plans p
      where not v_deleted
        and (
          p.source_session_key like v_pattern
          or p.target_session_key like v_pattern
          or exists (select 1 from monthly_absences a where a.id = p.absence_id)
        )
    ),
    support_class_ids as (
      select source_class_id as id from monthly_absences
      union select source_class_id from relevant_plans
      union select target_class_id from relevant_plans
    ),
    support_classes as (
      select
        c.id, c.name, c.grade, c.teacher_id, c.assistant_teacher_id,
        c.assistant_name, c.start_date, c.end_date, c.status, c.note,
        c.created_at,
        t.name as teacher_name,
        ta.name as assistant_teacher_name
      from official_classes c
      left join official_teachers t on t.id = c.teacher_id
      left join official_teachers ta on ta.id = c.assistant_teacher_id
      where c.id::text in (select id from support_class_ids where coalesce(id, '') <> '')
    ),
    target_session_keys as (
      select distinct target_session_key as session_key
      from relevant_plans
      where coalesce(target_session_key, '') <> ''
    ),
    attendance_data as (
      select
        s.session_key, s.session_date, s.saved, s.editable,
        s.manual_makeups, s.updated_at,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'session_key', r.session_key,
              'student_id', r.student_id,
              'row_type', r.row_type,
              'status', r.status,
              'note', r.note
            ) order by r.row_type, r.student_id
          ) filter (where r.id is not null),
          '[]'::jsonb
        ) as rows
      from official_attendance_sessions s
      left join official_attendance_rows r on r.session_key = s.session_key
      where s.session_key in (select session_key from target_session_keys)
      group by s.session_key, s.session_date, s.saved, s.editable, s.manual_makeups, s.updated_at
    ),
    all_months as (
      select substring(a.source_session_key from '\|([0-9]{4}-[0-9]{2})-[0-9]{2}\|') as month_key
      from official_absence_records a
      union
      select substring(p.source_session_key from '\|([0-9]{4}-[0-9]{2})-[0-9]{2}\|')
      from official_makeup_plans p
      union
      select substring(p.target_session_key from '\|([0-9]{4}-[0-9]{2})-[0-9]{2}\|')
      from official_makeup_plans p
    )
    select jsonb_build_object(
      'deleted', v_deleted,
      'deletedMonths', coalesce((
        select jsonb_agg(d.month_key order by d.month_key desc)
        from official_makeup_deleted_months d
      ), '[]'::jsonb),
      'deletedRows', coalesce((
        select jsonb_agg(jsonb_build_object(
          'month_key', d.month_key,
          'reason', d.reason,
          'deleted_at', d.deleted_at
        ) order by d.month_key desc)
        from official_makeup_deleted_months d
      ), '[]'::jsonb),
      'availableMonths', coalesce((
        select jsonb_agg(m.month_key order by m.month_key desc)
        from (
          select distinct am.month_key
          from all_months am
          where am.month_key ~ '^[0-9]{4}-[0-9]{2}$'
            and not exists (
              select 1 from official_makeup_deleted_months d where d.month_key = am.month_key
            )
        ) m
      ), '[]'::jsonb),
      'absenceRecords', case when v_deleted then '[]'::jsonb else coalesce((
        select jsonb_agg(to_jsonb(a) order by a.created_at asc)
        from monthly_absences a
      ), '[]'::jsonb) end,
      'makeupPlans', case when v_deleted then '[]'::jsonb else coalesce((
        select jsonb_agg(to_jsonb(p) order by p.created_at desc)
        from relevant_plans p
      ), '[]'::jsonb) end,
      'supportClasses', case when v_deleted then '[]'::jsonb else coalesce((
        select jsonb_agg(to_jsonb(c) order by c.name asc)
        from support_classes c
      ), '[]'::jsonb) end,
      'attendanceSessions', case when v_deleted then '[]'::jsonb else coalesce((
        select jsonb_agg(to_jsonb(s) order by s.session_key asc)
        from attendance_data s
      ), '[]'::jsonb) end
    )
  );
end;
$$;

-- Lightweight month list, avoiding multiple REST round trips.
create or replace function public.official_get_makeup_months()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with all_months as (
    select substring(a.source_session_key from '\|([0-9]{4}-[0-9]{2})-[0-9]{2}\|') as month_key
    from official_absence_records a
    union
    select substring(p.source_session_key from '\|([0-9]{4}-[0-9]{2})-[0-9]{2}\|')
    from official_makeup_plans p
    union
    select substring(p.target_session_key from '\|([0-9]{4}-[0-9]{2})-[0-9]{2}\|')
    from official_makeup_plans p
  )
  select jsonb_build_object(
    'months', coalesce((
      select jsonb_agg(m.month_key order by m.month_key desc)
      from (
        select distinct am.month_key
        from all_months am
        where am.month_key ~ '^[0-9]{4}-[0-9]{2}$'
          and not exists (
            select 1 from official_makeup_deleted_months d where d.month_key = am.month_key
          )
      ) m
    ), '[]'::jsonb),
    'deletedMonths', coalesce((
      select jsonb_agg(d.month_key order by d.month_key desc)
      from official_makeup_deleted_months d
    ), '[]'::jsonb),
    'deletedRows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month_key', d.month_key,
        'reason', d.reason,
        'deleted_at', d.deleted_at
      ) order by d.month_key desc)
      from official_makeup_deleted_months d
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.official_schedule_makeup_plan(text,text,text,text,text,text,text,uuid,integer) from public, anon, authenticated;
revoke all on function public.official_cancel_makeup_plan(text) from public, anon, authenticated;
revoke all on function public.official_get_makeup_month_state(text) from public, anon, authenticated;
revoke all on function public.official_get_makeup_months() from public, anon, authenticated;

grant execute on function public.official_schedule_makeup_plan(text,text,text,text,text,text,text,uuid,integer) to service_role;
grant execute on function public.official_cancel_makeup_plan(text) to service_role;
grant execute on function public.official_get_makeup_month_state(text) to service_role;
grant execute on function public.official_get_makeup_months() to service_role;
