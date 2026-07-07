alter table official_teachers add column if not exists user_id uuid references official_users(id) on delete set null;
alter table official_teachers add column if not exists email text;
alter table official_teachers add column if not exists status text default 'active';
alter table official_teachers add column if not exists note text;
alter table official_teachers add column if not exists updated_at timestamptz default now();

create index if not exists official_teachers_user_idx on official_teachers(user_id);
create index if not exists official_teachers_phone_idx on official_teachers(phone);

-- Link teachers to users by phone where possible.
update official_teachers t
set user_id = u.id,
    updated_at = now()
from official_users u
where t.user_id is null
  and t.phone is not null
  and u.phone = t.phone;

-- Ensure every active teacher row has at least a teacher user when it already has a phone.
insert into official_users(name, phone, email, password_hash, roles, status, must_change_password)
select
  t.name,
  t.phone,
  t.email,
  '$2a$12$B9c2nXX3N5FK1UlkZg33v.EFiT8LyksJEsuNfTNQnEPjhDlfqg9YK', -- default 123456, reset in UI for real use
  array['teacher']::text[],
  'active',
  true
from official_teachers t
left join official_users u on u.phone = t.phone
where t.phone is not null and t.phone <> '' and u.id is null
on conflict (phone) do nothing;

update official_teachers t
set user_id = u.id,
    updated_at = now()
from official_users u
where t.user_id is null
  and t.phone is not null
  and u.phone = t.phone;
