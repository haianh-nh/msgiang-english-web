create extension if not exists pgcrypto;

create table if not exists official_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text unique not null,
  email text,
  password_hash text not null,
  roles text[] not null default array['teacher']::text[],
  status text not null default 'active' check (status in ('active','inactive')),
  must_change_password boolean not null default false,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint official_users_roles_check check (
    roles <@ array['admin','manager','teacher']::text[]
    and cardinality(roles) >= 1
  )
);

create table if not exists official_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references official_users(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists official_settings (
  key text primary key,
  value text not null,
  updated_by uuid references official_users(id) on delete set null,
  updated_at timestamptz default now()
);

insert into official_settings(key, value) values
  ('tuition_per_session', '70000'),
  ('session_capacity', '15'),
  ('center_name', 'Ms.Giang English Center')
on conflict (key) do nothing;

create table if not exists official_teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references official_users(id) on delete set null,
  name text not null,
  phone text,
  email text,
  status text not null default 'active' check (status in ('active','inactive')),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists official_classes (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  grade text,
  teacher_id uuid references official_teachers(id) on delete set null,
  assistant_teacher_id uuid references official_teachers(id) on delete set null,
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('active','ended','archived')),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists official_class_schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references official_classes(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  sort_order int not null default 1,
  created_at timestamptz default now()
);

create table if not exists official_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references official_classes(id) on delete cascade,
  name text not null,
  parent_phone text,
  note text,
  status text not null default 'active' check (status in ('active','inactive','transferred')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists official_v48_state (
  user_id uuid primary key references official_users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists official_import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text,
  row_count int default 0,
  imported_by uuid references official_users(id) on delete set null,
  status text not null default 'completed',
  error_log jsonb,
  created_at timestamptz default now()
);

create table if not exists official_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references official_users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  payload jsonb,
  created_at timestamptz default now()
);

create index if not exists official_sessions_token_idx on official_sessions(token);
create index if not exists official_sessions_expires_idx on official_sessions(expires_at);
create index if not exists official_classes_status_idx on official_classes(status);
create index if not exists official_students_class_idx on official_students(class_id);
