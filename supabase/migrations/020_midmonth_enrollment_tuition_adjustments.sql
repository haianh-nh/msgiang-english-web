-- Phase 7: mid-month student enrollment tuition adjustment.
-- One monthly invoice can contain regular tuition plus a carried adjustment.
-- Safe to run more than once. No existing student or tuition data is deleted.

alter table public.official_students
  add column if not exists enrollment_start_date date,
  add column if not exists tuition_regular_start_month text;

alter table public.official_students
  drop constraint if exists official_students_tuition_regular_start_month_check;

alter table public.official_students
  add constraint official_students_tuition_regular_start_month_check
  check (tuition_regular_start_month is null or tuition_regular_start_month ~ '^[0-9]{4}-[0-9]{2}$');

create table if not exists public.official_tuition_adjustments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.official_students(id) on delete cascade,
  class_id uuid not null references public.official_classes(id) on delete cascade,
  adjustment_type text not null default 'new_student_proration',
  source_month text not null,
  target_month text not null,
  enrollment_start_date date not null,
  first_session_key text,
  session_dates jsonb not null default '[]'::jsonb,
  session_count integer not null default 0,
  unit_price numeric(12,0) not null default 0,
  amount numeric(12,0) not null default 0,
  note text,
  status text not null default 'pending',
  created_by uuid references public.official_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  included_at timestamptz,
  included_by uuid references public.official_users(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references public.official_users(id) on delete set null,
  constraint official_tuition_adjustments_type_check
    check (adjustment_type in ('new_student_proration','manual')),
  constraint official_tuition_adjustments_month_check
    check (source_month ~ '^[0-9]{4}-[0-9]{2}$' and target_month ~ '^[0-9]{4}-[0-9]{2}$'),
  constraint official_tuition_adjustments_status_check
    check (status in ('pending','included','cancelled')),
  constraint official_tuition_adjustments_values_check
    check (session_count >= 0 and unit_price >= 0 and amount >= 0)
);

create unique index if not exists idx_official_tuition_adjustments_student_source_active
  on public.official_tuition_adjustments(student_id, source_month, adjustment_type)
  where status <> 'cancelled';

create index if not exists idx_official_tuition_adjustments_target_status_student
  on public.official_tuition_adjustments(target_month, status, student_id);

create index if not exists idx_official_tuition_adjustments_student_target
  on public.official_tuition_adjustments(student_id, target_month);

create index if not exists idx_official_students_regular_billing_start
  on public.official_students(tuition_regular_start_month, status);

create or replace function public.official_add_student_with_prorated_tuition(
  p_class_id uuid,
  p_name text,
  p_parent_phone text default null,
  p_parent_name text default null,
  p_contact text default null,
  p_note text default null,
  p_enrollment_start_date date default null,
  p_regular_start_month text default null,
  p_adjustment jsonb default null,
  p_actor uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.official_classes%rowtype;
  v_student public.official_students%rowtype;
  v_adjustment public.official_tuition_adjustments%rowtype;
  v_source_month text;
  v_target_month text;
  v_session_count integer;
  v_unit_price numeric(12,0);
  v_session_dates jsonb;
  v_amount numeric(12,0);
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Thiếu tên học sinh';
  end if;

  select * into v_class
  from public.official_classes
  where id = p_class_id
  for share;

  if not found then
    raise exception 'Không tìm thấy lớp';
  end if;

  if lower(coalesce(v_class.status, 'active')) = 'ended' then
    raise exception 'Lớp đã kết thúc, không thể thêm học sinh';
  end if;

  if p_regular_start_month is not null and p_regular_start_month !~ '^[0-9]{4}-[0-9]{2}$' then
    raise exception 'Tháng bắt đầu thu học phí không hợp lệ';
  end if;

  insert into public.official_students (
    class_id,
    name,
    parent_phone,
    parent_name,
    contact,
    note,
    status,
    enrollment_start_date,
    tuition_regular_start_month,
    updated_at
  ) values (
    p_class_id,
    trim(p_name),
    nullif(trim(coalesce(p_parent_phone, '')), ''),
    nullif(trim(coalesce(p_parent_name, '')), ''),
    nullif(trim(coalesce(p_contact, '')), ''),
    nullif(trim(coalesce(p_note, '')), ''),
    'active',
    p_enrollment_start_date,
    p_regular_start_month,
    now()
  ) returning * into v_student;

  if p_adjustment is not null and coalesce((p_adjustment->>'enabled')::boolean, false) then
    v_source_month := p_adjustment->>'sourceMonth';
    v_target_month := p_adjustment->>'targetMonth';
    v_session_count := greatest(0, coalesce((p_adjustment->>'sessionCount')::integer, 0));
    v_unit_price := greatest(0, coalesce((p_adjustment->>'unitPrice')::numeric, 0));
    v_session_dates := coalesce(p_adjustment->'sessionDates', '[]'::jsonb);
    v_amount := v_session_count * v_unit_price;

    if v_source_month is null or v_source_month !~ '^[0-9]{4}-[0-9]{2}$' then
      raise exception 'Tháng phát sinh không hợp lệ';
    end if;
    if v_target_month is null or v_target_month !~ '^[0-9]{4}-[0-9]{2}$' then
      raise exception 'Tháng thu khoản phát sinh không hợp lệ';
    end if;
    if v_target_month <= v_source_month then
      raise exception 'Khoản phát sinh phải được thu từ tháng kế tiếp trở đi';
    end if;
    if jsonb_typeof(v_session_dates) <> 'array' then
      raise exception 'Danh sách buổi học không hợp lệ';
    end if;
    if jsonb_array_length(v_session_dates) <> v_session_count then
      raise exception 'Số buổi học không khớp dữ liệu xem trước';
    end if;

    insert into public.official_tuition_adjustments (
      student_id,
      class_id,
      adjustment_type,
      source_month,
      target_month,
      enrollment_start_date,
      first_session_key,
      session_dates,
      session_count,
      unit_price,
      amount,
      note,
      status,
      created_by,
      updated_at
    ) values (
      v_student.id,
      p_class_id,
      'new_student_proration',
      v_source_month,
      v_target_month,
      coalesce(p_enrollment_start_date, current_date),
      nullif(p_adjustment->>'firstSessionKey', ''),
      v_session_dates,
      v_session_count,
      v_unit_price,
      v_amount,
      nullif(trim(coalesce(p_adjustment->>'note', '')), ''),
      'pending',
      p_actor,
      now()
    ) returning * into v_adjustment;
  end if;

  return jsonb_build_object(
    'student', to_jsonb(v_student),
    'adjustment', case when v_adjustment.id is null then null else to_jsonb(v_adjustment) end
  );
end;
$$;

revoke all on function public.official_add_student_with_prorated_tuition(
  uuid,text,text,text,text,text,date,text,jsonb,uuid
) from public, anon, authenticated;
grant execute on function public.official_add_student_with_prorated_tuition(
  uuid,text,text,text,text,text,date,text,jsonb,uuid
) to service_role;

-- Realtime invalidation for the new tuition table. Payload contains only scopes.
create or replace function public.official_emit_tuition_adjustment_realtime()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_topic text;
  v_enabled boolean;
begin
  select topic, enabled into v_topic, v_enabled
  from public.official_realtime_config
  where id = 1;

  if not coalesce(v_enabled, false) or coalesce(v_topic, '') = '' then
    return null;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'v', 1,
      'modules', '["tuition"]'::jsonb,
      'table', 'official_tuition_adjustments',
      'operation', tg_op,
      'changedAt', floor(extract(epoch from clock_timestamp()) * 1000)::bigint
    ),
    'db-change',
    v_topic,
    false
  );
  return null;
end;
$$;

revoke all on function public.official_emit_tuition_adjustment_realtime() from public, anon, authenticated;
grant execute on function public.official_emit_tuition_adjustment_realtime() to service_role;

drop trigger if exists trg_rt_official_tuition_adjustments on public.official_tuition_adjustments;
create trigger trg_rt_official_tuition_adjustments
after insert or update or delete on public.official_tuition_adjustments
for each statement execute function public.official_emit_tuition_adjustment_realtime();

notify pgrst, 'reload schema';
