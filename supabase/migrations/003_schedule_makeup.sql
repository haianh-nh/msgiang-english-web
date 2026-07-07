create table if not exists official_session_cancellations (
  session_key text primary key,
  class_id uuid references official_classes(id) on delete cascade,
  session_date date not null,
  day_key text,
  start_time time,
  end_time time,
  reason text,
  created_by uuid references official_users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists official_class_makeup_sessions (
  id uuid primary key default gen_random_uuid(),
  source_session_key text unique not null,
  class_id uuid references official_classes(id) on delete cascade,
  makeup_date date not null,
  day_key text,
  start_time time not null,
  end_time time not null,
  reason text,
  status text not null default 'active' check (status in ('active','cancelled')),
  created_by uuid references official_users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists official_makeup_plans (
  id text primary key,
  absence_id text not null,
  student_id text not null,
  source_class_id text not null,
  source_session_key text,
  target_class_id text not null,
  target_session_key text not null,
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','completed')),
  created_by uuid references official_users(id) on delete set null,
  created_at timestamptz default now(),
  cancelled_at timestamptz
);

create index if not exists official_session_cancellations_class_date_idx on official_session_cancellations(class_id, session_date);
create index if not exists official_class_makeup_sessions_source_idx on official_class_makeup_sessions(source_session_key);
create index if not exists official_class_makeup_sessions_class_date_idx on official_class_makeup_sessions(class_id, makeup_date);
create index if not exists official_makeup_plans_target_idx on official_makeup_plans(target_session_key);
create index if not exists official_makeup_plans_student_idx on official_makeup_plans(student_id);
