-- Phase 6: safe cross-device invalidation using Supabase Realtime Broadcast.
-- Broadcast payloads contain cache scopes only; no student names, attendance rows,
-- phone numbers, or other business data are sent through the public channel.

create table if not exists public.official_realtime_config (
  id smallint primary key default 1 check (id = 1),
  topic text not null default (
    'official:' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  ),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.official_realtime_config (id)
values (1)
on conflict (id) do nothing;

alter table public.official_realtime_config enable row level security;
revoke all on table public.official_realtime_config from anon, authenticated;
grant select on table public.official_realtime_config to service_role;

-- Fail clearly if Realtime database broadcast is not available on the project.
do $$
begin
  if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is null then
    raise exception 'Supabase Realtime function realtime.send(jsonb,text,text,boolean) is unavailable';
  end if;
end
$$;

create or replace function public.official_emit_realtime_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_topic text;
  v_enabled boolean;
  v_modules jsonb;
  v_guard_key text;
begin
  -- Statement triggers can fire several times in one transaction. Emit at most
  -- once per table/transaction so attendance batch saves do not create a storm.
  v_guard_key := 'msgiang.realtime_' || tg_table_name;
  if current_setting(v_guard_key, true) = '1' then
    return null;
  end if;
  perform set_config(v_guard_key, '1', true);

  select topic, enabled
  into v_topic, v_enabled
  from public.official_realtime_config
  where id = 1;

  if not coalesce(v_enabled, false) or coalesce(v_topic, '') = '' then
    return null;
  end if;

  v_modules := case tg_table_name
    when 'official_users' then '["teachers","core"]'::jsonb
    when 'official_teachers' then '["teachers","core","schedule"]'::jsonb
    when 'official_settings' then '["teachers","makeup","tuition"]'::jsonb

    when 'official_classes' then '["core","schedule","attendance","makeup","evaluation","tuition"]'::jsonb
    when 'official_class_schedules' then '["core","schedule","attendance"]'::jsonb
    when 'official_students' then '["core","schedule","attendance","makeup","evaluation","tuition"]'::jsonb

    when 'official_session_cancellations' then '["schedule","attendance"]'::jsonb
    when 'official_class_makeup_sessions' then '["schedule","attendance","makeup"]'::jsonb
    when 'official_makeup_plans' then '["schedule","attendance","makeup"]'::jsonb
    when 'official_makeup_deleted_months' then '["schedule","attendance","makeup"]'::jsonb

    when 'official_attendance_sessions' then '["schedule","attendance","makeup"]'::jsonb
    when 'official_attendance_rows' then '["schedule","attendance","makeup"]'::jsonb
    when 'official_absence_records' then '["schedule","attendance","makeup"]'::jsonb

    when 'official_tuition_status' then '["tuition"]'::jsonb
    when 'official_tuition_credits' then '["tuition"]'::jsonb
    when 'official_exercise_library' then '["library"]'::jsonb
    when 'official_evaluations' then '["evaluation"]'::jsonb
    else '["core"]'::jsonb
  end;

  perform realtime.send(
    jsonb_build_object(
      'v', 1,
      'modules', v_modules,
      'table', tg_table_name,
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

revoke all on function public.official_emit_realtime_change() from public, anon, authenticated;
grant execute on function public.official_emit_realtime_change() to service_role;

-- Attach one statement-level trigger to each business table. The DO block keeps
-- the migration idempotent and safely skips an optional table that is not present.
do $$
declare
  v_table text;
  v_trigger text;
begin
  foreach v_table in array array[
    'official_users',
    'official_teachers',
    'official_settings',
    'official_classes',
    'official_class_schedules',
    'official_students',
    'official_session_cancellations',
    'official_class_makeup_sessions',
    'official_makeup_plans',
    'official_makeup_deleted_months',
    'official_attendance_sessions',
    'official_attendance_rows',
    'official_absence_records',
    'official_tuition_status',
    'official_tuition_credits',
    'official_exercise_library',
    'official_evaluations'
  ]
  loop
    if to_regclass('public.' || v_table) is null then
      continue;
    end if;

    v_trigger := 'trg_rt_' || v_table;
    execute format('drop trigger if exists %I on public.%I', v_trigger, v_table);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each statement execute function public.official_emit_realtime_change()',
      v_trigger,
      v_table
    );
  end loop;
end
$$;

notify pgrst, 'reload schema';
