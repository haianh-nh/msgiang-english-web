-- V5: tuition, teacher assignment, library metadata parity with demo v48

alter table if exists tuition_status
  add column if not exists sent_at timestamptz,
  add column if not exists amount integer default 0,
  add column if not exists billable_sessions integer default 0,
  add column if not exists note text default '';

alter table if exists teachers
  add column if not exists email text,
  add column if not exists note text default '',
  add column if not exists updated_at timestamptz default now();

alter table if exists classes
  add column if not exists assistant_teacher_id uuid references teachers(id) on delete set null;

alter table if exists exercise_library
  add column if not exists description text default '',
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_tuition_status_month on tuition_status(month, paid, sent_at);
create index if not exists idx_classes_assistant_teacher_id on classes(assistant_teacher_id);
create index if not exists idx_exercise_library_type_filters on exercise_library(type, level, skill, unit);
