create table if not exists official_attendance_sessions (
  session_key text primary key,
  class_id uuid references official_classes(id) on delete cascade,
  session_date date not null,
  day_key text,
  start_time time,
  end_time time,
  session_type text not null default 'regular' check (session_type in ('regular','class_makeup')),
  saved boolean not null default false,
  editable boolean not null default true,
  manual_makeups jsonb not null default '[]'::jsonb,
  updated_by uuid references official_users(id) on delete set null,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists official_attendance_rows (
  id uuid primary key default gen_random_uuid(),
  session_key text references official_attendance_sessions(session_key) on delete cascade,
  student_id text not null,
  row_type text not null check (row_type in ('official','makeup','manual_makeup')),
  status text not null check (status in ('present','late','absent')),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(session_key, row_type, student_id)
);

create table if not exists official_absence_records (
  id text primary key,
  student_id text not null,
  source_class_id text not null,
  source_session_key text not null,
  source_session_label text,
  reason text,
  generated_from_attendance boolean not null default true,
  status text not null default 'pending' check (status in ('pending','scheduled','cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists official_attendance_sessions_class_date_idx on official_attendance_sessions(class_id, session_date);
create index if not exists official_attendance_rows_session_idx on official_attendance_rows(session_key);
create index if not exists official_attendance_rows_student_idx on official_attendance_rows(student_id);
create index if not exists official_absence_records_session_idx on official_absence_records(source_session_key);
create index if not exists official_absence_records_student_idx on official_absence_records(student_id);
