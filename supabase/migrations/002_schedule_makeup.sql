create table if not exists session_cancellations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  reason text default 'Nghỉ buổi học',
  status text not null default 'cancelled' check (status in ('cancelled','rescheduled')),
  makeup_class_id uuid references classes(id) on delete set null,
  makeup_session_date date,
  created_at timestamptz default now(),
  unique(class_id, session_date, start_time)
);

create table if not exists makeup_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  source_class_id uuid references classes(id) on delete cascade,
  source_session_date date not null,
  target_class_id uuid references classes(id) on delete cascade,
  target_session_date date not null,
  target_start_time time,
  target_end_time time,
  status text not null default 'planned' check (status in ('planned','done','cancelled')),
  note text default '',
  created_at timestamptz default now()
);

create index if not exists idx_makeup_plans_target on makeup_plans(target_class_id, target_session_date, status);
create index if not exists idx_makeup_plans_source on makeup_plans(student_id, source_class_id, source_session_date, status);
