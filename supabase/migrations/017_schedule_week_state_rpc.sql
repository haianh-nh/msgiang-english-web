-- Performance Phase 4B
-- One-round-trip weekly schedule state, including attendance required by the Schedule screen.
-- Safe to run more than once. Existing schedule, attendance and makeup data are not modified.

create or replace function public.official_session_key_date(p_key text)
returns date
language plpgsql
immutable
strict
parallel safe
set search_path = public
as $$
declare
  v_date_text text;
begin
  v_date_text := substring(p_key from '\|([0-9]{4}-[0-9]{2}-[0-9]{2})\|');
  if v_date_text is null then
    return null;
  end if;
  begin
    return v_date_text::date;
  exception when others then
    return null;
  end;
end;
$$;

-- These expression indexes let week queries use an exact date range instead of many LIKE clauses.
create index if not exists idx_official_makeup_plans_target_session_date
  on official_makeup_plans (public.official_session_key_date(target_session_key));

create index if not exists idx_official_absence_records_source_session_date
  on official_absence_records (public.official_session_key_date(source_session_key));

create or replace function public.official_get_schedule_week_state(
  p_start date,
  p_end date,
  p_user_id uuid,
  p_user_phone text,
  p_can_manage boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_teacher_id uuid;
  v_month_start date;
  v_month_end date;
begin
  if p_start is null or p_end is null or p_end <= p_start then
    raise exception 'Khoảng tuần không hợp lệ' using errcode = 'P0001';
  end if;

  -- The UI is week-based. Reject accidental broad reads while allowing a small safety margin.
  if (p_end - p_start) > 14 then
    raise exception 'Khoảng lịch vượt quá giới hạn cho phép' using errcode = 'P0001';
  end if;

  if not coalesce(p_can_manage, false) then
    if p_user_id is not null then
      select t.id
      into v_teacher_id
      from official_teachers t
      where t.user_id = p_user_id
      order by (t.status = 'active') desc, t.updated_at desc nulls last, t.created_at desc
      limit 1;
    end if;

    if v_teacher_id is null and coalesce(trim(p_user_phone), '') <> '' then
      select t.id
      into v_teacher_id
      from official_teachers t
      where t.phone = trim(p_user_phone)
      order by (t.status = 'active') desc, t.updated_at desc nulls last, t.created_at desc
      limit 1;
    end if;
  end if;

  v_month_start := date_trunc('month', p_start)::date;
  v_month_end := (date_trunc('month', p_end - 1) + interval '1 month')::date;

  return (
    with week_cancellations as (
      select
        c.session_key,
        c.class_id,
        c.session_date,
        c.day_key,
        c.start_time,
        c.end_time,
        c.reason,
        c.created_at
      from official_session_cancellations c
      where c.session_date >= p_start
        and c.session_date < p_end
    ),
    visible_makeups as (
      select
        m.id,
        m.class_id,
        m.source_session_key,
        m.teacher_id,
        m.makeup_date,
        m.day_key,
        m.start_time,
        m.end_time,
        m.reason,
        m.status,
        m.created_at,
        m.updated_at,
        c.name as class_name,
        c.grade,
        c.note as class_note,
        c.teacher_id as class_teacher_id,
        c.assistant_teacher_id,
        c.assistant_name,
        c.start_date,
        c.end_date,
        c.status as class_status,
        c.created_at as class_created_at,
        assigned_teacher.name as assigned_teacher_name,
        class_teacher.name as class_teacher_name,
        assistant_teacher.name as assistant_teacher_name
      from official_class_makeup_sessions m
      join official_classes c on c.id = m.class_id
      left join official_teachers assigned_teacher on assigned_teacher.id = m.teacher_id
      left join official_teachers class_teacher on class_teacher.id = c.teacher_id
      left join official_teachers assistant_teacher on assistant_teacher.id = c.assistant_teacher_id
      where m.status <> 'cancelled'
        and m.makeup_date >= p_start
        and m.makeup_date < p_end
        and (
          coalesce(p_can_manage, false)
          or (
            v_teacher_id is not null
            and (
              m.teacher_id = v_teacher_id
              or c.teacher_id = v_teacher_id
              or c.assistant_teacher_id = v_teacher_id
            )
          )
        )
    ),
    visible_class_ids as (
      select distinct m.class_id from visible_makeups m
    ),
    student_sets as (
      select
        s.class_id,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', s.id,
              'name', s.name,
              'contact', case
                when coalesce(trim(concat_ws(' • ', nullif(s.parent_phone, ''), nullif(s.note, ''))), '') = '' then 'Chưa có'
                else concat_ws(' • ', nullif(s.parent_phone, ''), nullif(s.note, ''))
              end,
              'parentName', coalesce(s.parent_name, ''),
              'parentPhone', coalesce(s.parent_phone, ''),
              'note', coalesce(s.note, '')
            )
            order by lower(s.name), s.id
          ),
          '[]'::jsonb
        ) as students
      from official_students s
      join visible_class_ids v on v.class_id = s.class_id
      group by s.class_id
    ),
    week_plans as (
      select
        p.id,
        p.absence_id,
        p.student_id,
        p.source_class_id,
        p.source_session_key,
        p.target_class_id,
        p.target_session_key,
        p.status,
        p.created_by,
        p.created_at,
        p.cancelled_at
      from official_makeup_plans p
      where public.official_session_key_date(p.target_session_key) >= p_start
        and public.official_session_key_date(p.target_session_key) < p_end
    ),
    source_absences as (
      select distinct
        a.id,
        a.student_id,
        a.source_class_id,
        a.source_session_key,
        a.source_session_label,
        a.reason,
        a.generated_from_attendance,
        a.status,
        a.created_at,
        a.updated_at
      from official_absence_records a
      join week_plans p on p.absence_id = a.id
    ),
    week_attendance as (
      select
        s.session_key,
        s.session_date,
        s.saved,
        s.editable,
        s.manual_makeups,
        s.updated_at
      from official_attendance_sessions s
      where s.session_date >= p_start
        and s.session_date < p_end
    ),
    attendance_row_sets as (
      select
        r.session_key,
        jsonb_object_agg(
          r.row_type || '_' || r.student_id,
          jsonb_build_object(
            'studentId', r.student_id,
            'type', r.row_type,
            'status', r.status,
            'note', coalesce(r.note, '')
          )
        ) as rows
      from official_attendance_rows r
      join week_attendance s on s.session_key = r.session_key
      group by r.session_key
    ),
    pending_absences as (
      select
        a.id,
        a.student_id,
        a.source_class_id,
        a.source_session_key,
        a.source_session_label,
        a.reason,
        a.generated_from_attendance,
        a.status,
        a.created_at,
        a.updated_at
      from official_absence_records a
      where a.status = 'pending'
        and public.official_session_key_date(a.source_session_key) >= v_month_start
        and public.official_session_key_date(a.source_session_key) < v_month_end
    )
    select jsonb_build_object(
      'currentTeacherId', v_teacher_id,
      'classCancellations', coalesce((
        select jsonb_object_agg(
          c.session_key,
          jsonb_build_object(
            'sessionKey', c.session_key,
            'classId', c.class_id,
            'date', c.session_date,
            'day', c.day_key,
            'start', to_char(c.start_time, 'HH24:MI'),
            'end', to_char(c.end_time, 'HH24:MI'),
            'reason', coalesce(c.reason, 'Nghỉ buổi học'),
            'createdAt', c.created_at
          )
        )
        from week_cancellations c
      ), '{}'::jsonb),
      'classMakeupSessions', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'classId', m.class_id,
            'sourceSessionKey', m.source_session_key,
            'teacherId', m.teacher_id,
            'teacher', coalesce(m.assigned_teacher_name, ''),
            'ta', coalesce(m.assistant_teacher_name, m.assistant_name, ''),
            'className', coalesce(m.class_name, ''),
            'classSnapshot', jsonb_build_object(
              'id', m.class_id,
              'name', coalesce(m.class_name, ''),
              'teacher', coalesce(m.class_teacher_name, ''),
              'teacherId', m.class_teacher_id,
              'taId', m.assistant_teacher_id,
              'ta', coalesce(m.assistant_teacher_name, m.assistant_name, ''),
              'month', '',
              'students', coalesce(ss.students, '[]'::jsonb),
              'status', coalesce(m.class_status, 'active'),
              'startDate', coalesce(m.start_date::text, '2026-06-01'),
              'endDate', coalesce(m.end_date::text, ''),
              'createdAt', coalesce(m.class_created_at::text, ''),
              'grade', coalesce(m.grade, ''),
              'note', coalesce(m.class_note, '')
            ),
            'visibleToCurrentUser', true,
            'date', m.makeup_date,
            'day', m.day_key,
            'start', to_char(m.start_time, 'HH24:MI'),
            'end', to_char(m.end_time, 'HH24:MI'),
            'reason', coalesce(
              nullif(m.reason, ''),
              case when m.source_session_key like 'tutoring:%' then 'Lớp học kèm' else 'Dạy bù' end
            ),
            'sessionKind', case when m.source_session_key like 'tutoring:%' then 'tutoring' else 'class_makeup' end,
            'createdAt', m.created_at,
            'updatedAt', m.updated_at
          )
          order by m.makeup_date, m.start_time, m.class_name
        )
        from visible_makeups m
        left join student_sets ss on ss.class_id = m.class_id
      ), '[]'::jsonb),
      'makeupPlans', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'absenceId', p.absence_id,
            'studentId', p.student_id,
            'sourceClassId', p.source_class_id,
            'sourceSessionKey', p.source_session_key,
            'targetClassId', p.target_class_id,
            'targetSessionKey', p.target_session_key,
            'status', p.status,
            'createdBy', p.created_by,
            'createdAt', p.created_at,
            'cancelledAt', p.cancelled_at
          )
          order by p.created_at desc
        )
        from week_plans p
      ), '[]'::jsonb),
      'sourceAbsenceRecords', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'studentId', a.student_id,
            'sourceClassId', a.source_class_id,
            'sourceSessionKey', a.source_session_key,
            'sourceSessionLabel', a.source_session_label,
            'reason', coalesce(a.reason, 'Vắng'),
            'generatedFromAttendance', coalesce(a.generated_from_attendance, false),
            'status', coalesce(a.status, 'pending'),
            'createdAt', a.created_at,
            'updatedAt', a.updated_at
          )
          order by a.created_at
        )
        from source_absences a
      ), '[]'::jsonb),
      'attendanceSessions', coalesce((
        select jsonb_object_agg(
          'att_' || s.session_key,
          jsonb_build_object(
            'sessionKey', s.session_key,
            'saved', coalesce(s.saved, false),
            'editable', coalesce(s.editable, true),
            'rows', coalesce(r.rows, '{}'::jsonb),
            'manualMakeups', coalesce(s.manual_makeups, '[]'::jsonb),
            'updatedAt', s.updated_at
          )
        )
        from week_attendance s
        left join attendance_row_sets r on r.session_key = s.session_key
      ), '{}'::jsonb),
      'absenceRecords', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'studentId', a.student_id,
            'sourceClassId', a.source_class_id,
            'sourceSessionKey', a.source_session_key,
            'sourceSessionLabel', a.source_session_label,
            'reason', coalesce(a.reason, 'Vắng'),
            'generatedFromAttendance', coalesce(a.generated_from_attendance, false),
            'status', coalesce(a.status, 'pending'),
            'createdAt', a.created_at,
            'updatedAt', a.updated_at
          )
          order by a.created_at
        )
        from pending_absences a
      ), '[]'::jsonb),
      'meta', jsonb_build_object(
        'cancellations', (select count(*) from week_cancellations),
        'classMakeups', (select count(*) from visible_makeups),
        'makeupPlans', (select count(*) from week_plans),
        'attendanceSessions', (select count(*) from week_attendance),
        'pendingAbsences', (select count(*) from pending_absences)
      )
    )
  );
end;
$$;

revoke all on function public.official_session_key_date(text) from public, anon, authenticated;
revoke all on function public.official_get_schedule_week_state(date,date,uuid,text,boolean) from public, anon, authenticated;

grant execute on function public.official_session_key_date(text) to service_role;
grant execute on function public.official_get_schedule_week_state(date,date,uuid,text,boolean) to service_role;

notify pgrst, 'reload schema';
