create table if not exists official_evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references official_students(id) on delete cascade,
  class_id uuid references official_classes(id) on delete cascade,
  month_key text not null,
  scores jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published')),
  comment text default '',
  strengths text default '',
  improvements text default '',
  suggestion text default '',
  created_by uuid references official_users(id) on delete set null,
  updated_by uuid references official_users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(student_id, month_key)
);

create index if not exists official_evaluations_student_idx on official_evaluations(student_id);
create index if not exists official_evaluations_class_idx on official_evaluations(class_id);
create index if not exists official_evaluations_month_idx on official_evaluations(month_key);
create index if not exists official_evaluations_status_idx on official_evaluations(status);
