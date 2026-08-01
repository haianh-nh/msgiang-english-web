-- Read-only diagnostics for teacher attendance permissions.
-- This file does not change any data.

-- 1) Teacher-role users without a linked teacher profile.
select
  u.id as user_id,
  u.name as user_name,
  u.phone as user_phone,
  u.roles,
  u.status as user_status
from public.official_users u
left join public.official_teachers t on t.user_id = u.id
where (u.roles @> array['teacher']::text[] or u.roles @> array['ta']::text[])
  and t.id is null
order by u.name;

-- 2) Multiple teacher profiles linked to the same account.
select
  t.user_id,
  count(*) as teacher_profile_count,
  array_agg(t.id order by t.updated_at desc nulls last) as teacher_ids,
  array_agg(t.name order by t.updated_at desc nulls last) as teacher_names
from public.official_teachers t
where t.user_id is not null
group by t.user_id
having count(*) > 1
order by count(*) desc;

-- 3) Teacher profiles sharing the same normalized phone number.
select
  regexp_replace(coalesce(t.phone, ''), '\\D', '', 'g') as normalized_phone,
  count(*) as teacher_profile_count,
  array_agg(t.id order by t.updated_at desc nulls last) as teacher_ids,
  array_agg(t.name order by t.updated_at desc nulls last) as teacher_names
from public.official_teachers t
where regexp_replace(coalesce(t.phone, ''), '\\D', '', 'g') <> ''
group by regexp_replace(coalesce(t.phone, ''), '\\D', '', 'g')
having count(*) > 1
order by count(*) desc;

-- 4) Active classes assigned to teacher rows that are inactive or not linked to a user.
select
  c.id as class_id,
  c.name as class_name,
  c.teacher_id,
  main_t.name as teacher_name,
  main_t.status as teacher_status,
  main_t.user_id as teacher_user_id,
  c.assistant_teacher_id,
  assistant_t.name as assistant_name,
  assistant_t.status as assistant_status,
  assistant_t.user_id as assistant_user_id
from public.official_classes c
left join public.official_teachers main_t on main_t.id = c.teacher_id
left join public.official_teachers assistant_t on assistant_t.id = c.assistant_teacher_id
where coalesce(c.status, 'active') = 'active'
  and (
    (c.teacher_id is not null and (main_t.id is null or main_t.user_id is null or coalesce(main_t.status, 'active') <> 'active'))
    or
    (c.assistant_teacher_id is not null and (assistant_t.id is null or assistant_t.user_id is null or coalesce(assistant_t.status, 'active') <> 'active'))
  )
order by c.name;
