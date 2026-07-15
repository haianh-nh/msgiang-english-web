-- Phase 8.0: preserve a student's identity and history when moving classes.

create table if not exists public.official_student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.official_students(id) on delete cascade,
  class_id uuid references public.official_classes(id) on delete set null,
  class_name_snapshot text not null,
  start_date date not null,
  end_date date,
  status text not null default 'active' check (status in ('active','transferred','ended')),
  transfer_reason text,
  request_id text unique,
  created_by uuid references public.official_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint official_student_enrollments_valid_dates check (end_date is null or end_date >= start_date)
);

create unique index if not exists official_student_enrollments_one_active_idx
  on public.official_student_enrollments(student_id)
  where status = 'active' and end_date is null;

create index if not exists official_student_enrollments_student_history_idx
  on public.official_student_enrollments(student_id, start_date desc);

create index if not exists official_student_enrollments_class_idx
  on public.official_student_enrollments(class_id, status);

create or replace function public.official_create_initial_student_enrollment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_name text;
  v_class_start date;
begin
  select name, start_date into v_class_name, v_class_start
  from public.official_classes
  where id = new.class_id;

  if not exists (
    select 1 from public.official_student_enrollments
    where student_id = new.id and status = 'active' and end_date is null
  ) then
    insert into public.official_student_enrollments(
      student_id, class_id, class_name_snapshot, start_date, status, created_at, updated_at
    ) values (
      new.id,
      new.class_id,
      coalesce(v_class_name, 'Lớp không xác định'),
      coalesce(new.enrollment_start_date, v_class_start, new.created_at::date, current_date),
      'active',
      coalesce(new.created_at, now()),
      now()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists official_students_initial_enrollment_trigger on public.official_students;
create trigger official_students_initial_enrollment_trigger
after insert on public.official_students
for each row execute function public.official_create_initial_student_enrollment();

-- Create the first active enrollment for existing students without changing any data.
insert into public.official_student_enrollments (
  student_id,
  class_id,
  class_name_snapshot,
  start_date,
  status,
  created_at,
  updated_at
)
select
  s.id,
  s.class_id,
  coalesce(c.name, 'Lớp không xác định'),
  coalesce(s.enrollment_start_date, c.start_date, s.created_at::date, current_date),
  'active',
  coalesce(s.created_at, now()),
  now()
from public.official_students s
left join public.official_classes c on c.id = s.class_id
where not exists (
  select 1
  from public.official_student_enrollments e
  where e.student_id = s.id
    and e.status = 'active'
    and e.end_date is null
);

create or replace function public.official_transfer_student(
  p_student_id uuid,
  p_target_class_id uuid,
  p_transfer_date date,
  p_reason text,
  p_actor uuid,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.official_students%rowtype;
  v_source_class public.official_classes%rowtype;
  v_target_class public.official_classes%rowtype;
  v_existing public.official_student_enrollments%rowtype;
  v_new_enrollment public.official_student_enrollments%rowtype;
  v_transfer_date date := coalesce(p_transfer_date, current_date);
  v_source_start date;
  v_active_start date;
begin
  if p_request_id is not null and btrim(p_request_id) <> '' then
    select * into v_existing
    from public.official_student_enrollments
    where request_id = btrim(p_request_id)
    limit 1;

    if found then
      if v_existing.student_id <> p_student_id then
        raise exception 'Mã yêu cầu chuyển lớp không hợp lệ';
      end if;
      select * into v_student from public.official_students where id = p_student_id;
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'studentId', p_student_id,
        'sourceClassId', null,
        'targetClassId', v_existing.class_id,
        'enrollmentId', v_existing.id
      );
    end if;
  end if;

  select * into v_student
  from public.official_students
  where id = p_student_id
  for update;

  if not found then
    raise exception 'Không tìm thấy học sinh';
  end if;

  select * into v_source_class
  from public.official_classes
  where id = v_student.class_id;

  select * into v_target_class
  from public.official_classes
  where id = p_target_class_id;

  if not found then
    raise exception 'Không tìm thấy lớp chuyển đến';
  end if;

  if coalesce(lower(v_target_class.status), 'active') = 'ended' then
    raise exception 'Lớp chuyển đến đã kết thúc';
  end if;

  if v_student.class_id = p_target_class_id then
    raise exception 'Học sinh đang ở lớp này';
  end if;

  v_source_start := coalesce(
    v_student.enrollment_start_date,
    v_source_class.start_date,
    v_student.created_at::date,
    v_transfer_date
  );

  select start_date into v_active_start
  from public.official_student_enrollments
  where student_id = p_student_id and status = 'active' and end_date is null
  limit 1;

  if v_transfer_date < coalesce(v_active_start, v_source_start) then
    raise exception 'Ngày chuyển lớp không thể trước ngày bắt đầu lớp hiện tại';
  end if;

  -- Close the current enrollment. Backfill it first if this is legacy data.
  update public.official_student_enrollments
  set
    end_date = greatest(start_date, v_transfer_date - 1),
    status = 'transferred',
    transfer_reason = nullif(btrim(coalesce(p_reason, '')), ''),
    updated_at = now()
  where student_id = p_student_id
    and status = 'active'
    and end_date is null;

  if not found then
    insert into public.official_student_enrollments (
      student_id, class_id, class_name_snapshot, start_date, end_date,
      status, transfer_reason, created_by
    ) values (
      p_student_id,
      v_student.class_id,
      coalesce(v_source_class.name, 'Lớp không xác định'),
      v_source_start,
      greatest(v_source_start, v_transfer_date - 1),
      'transferred',
      nullif(btrim(coalesce(p_reason, '')), ''),
      p_actor
    );
  end if;

  insert into public.official_student_enrollments (
    student_id, class_id, class_name_snapshot, start_date, status,
    transfer_reason, request_id, created_by
  ) values (
    p_student_id,
    p_target_class_id,
    v_target_class.name,
    v_transfer_date,
    'active',
    nullif(btrim(coalesce(p_reason, '')), ''),
    nullif(btrim(coalesce(p_request_id, '')), ''),
    p_actor
  )
  returning * into v_new_enrollment;

  update public.official_students
  set
    class_id = p_target_class_id,
    status = 'active',
    updated_at = now()
  where id = p_student_id;

  insert into public.official_audit_logs(actor_id, action, entity_type, entity_id, payload)
  values (
    p_actor,
    'student_transfer',
    'student',
    p_student_id::text,
    jsonb_build_object(
      'sourceClassId', v_student.class_id,
      'sourceClassName', v_source_class.name,
      'targetClassId', p_target_class_id,
      'targetClassName', v_target_class.name,
      'transferDate', v_transfer_date,
      'reason', nullif(btrim(coalesce(p_reason, '')), ''),
      'requestId', nullif(btrim(coalesce(p_request_id, '')), '')
    )
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'studentId', p_student_id,
    'sourceClassId', v_student.class_id,
    'targetClassId', p_target_class_id,
    'enrollmentId', v_new_enrollment.id
  );
end;
$$;

revoke all on function public.official_transfer_student(uuid, uuid, date, text, uuid, text) from public;
grant execute on function public.official_transfer_student(uuid, uuid, date, text, uuid, text) to service_role;

notify pgrst, 'reload schema';
