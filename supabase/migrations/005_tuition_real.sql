create table if not exists official_tuition_status (
  month_key text not null,
  student_id text not null,
  paid boolean not null default false,
  paid_at timestamptz,
  paid_by uuid references official_users(id) on delete set null,
  message_sent boolean not null default false,
  message_sent_at timestamptz,
  message_sent_by uuid references official_users(id) on delete set null,
  snapshot jsonb,
  updated_at timestamptz default now(),
  primary key(month_key, student_id)
);

create index if not exists official_tuition_status_month_idx on official_tuition_status(month_key);
create index if not exists official_tuition_status_student_idx on official_tuition_status(student_id);
