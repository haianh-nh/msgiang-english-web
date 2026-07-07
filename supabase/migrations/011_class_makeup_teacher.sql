-- V20B.6: Allow assigning a specific teacher to a whole-class makeup session.
alter table official_class_makeup_sessions
  add column if not exists teacher_id uuid references official_teachers(id) on delete set null;

create index if not exists official_class_makeup_sessions_teacher_date_idx
  on official_class_makeup_sessions(teacher_id, makeup_date);
