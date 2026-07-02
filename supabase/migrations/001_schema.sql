create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin','manager','teacher')),
  status text not null default 'active',
  must_change_password boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete set null,
  name text not null,
  phone text unique not null,
  role text not null default 'teacher',
  status text not null default 'active'
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  grade text,
  teacher_id uuid references teachers(id) on delete set null,
  assistant_name text,
  start_date date not null,
  end_date date,
  status text not null default 'active' check (status in ('active','ended')),
  created_at timestamptz default now()
);

create table if not exists class_schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  day_of_week int not null,
  start_time time not null,
  end_time time not null
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  name text not null,
  parent_name text,
  parent_phone text,
  contact_note text,
  status text not null default 'active',
  created_at timestamptz default now()
);

create table if not exists attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  session_date date not null,
  start_time time not null default '17:00',
  end_time time not null default '18:30',
  is_closed boolean not null default true,
  unique(class_id, session_date, start_time)
);

create table if not exists attendance_rows (
  id uuid primary key default gen_random_uuid(),
  attendance_session_id uuid references attendance_sessions(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  status text not null check (status in ('present','late','absent')),
  note text,
  updated_by uuid references app_users(id) on delete set null,
  updated_at timestamptz default now(),
  unique(attendance_session_id, student_id)
);

create table if not exists tuition_status (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  month text not null,
  paid boolean not null default false,
  paid_at timestamptz,
  unique(student_id, month)
);

create table if not exists evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  month text not null,
  listening int default 3,
  speaking int default 3,
  reading int default 3,
  writing int default 3,
  vocabulary int default 3,
  participation int default 3,
  homework int default 3,
  comment text default '',
  strengths text default '',
  improvements text default '',
  suggestion text default '',
  status text default 'draft',
  updated_at timestamptz default now(),
  unique(student_id, month)
);

create table if not exists exercise_library (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('pdf','audio')),
  title text not null,
  level text,
  skill text,
  unit text,
  file_name text not null,
  file_path text not null,
  uploaded_by uuid references app_users(id) on delete set null,
  created_at timestamptz default now()
);
