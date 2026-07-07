-- V14 Performance indexes
-- Safe to run more than once. These indexes do not change app logic or data.

create index if not exists idx_official_classes_teacher_id
  on official_classes(teacher_id);

create index if not exists idx_official_classes_status_grade
  on official_classes(status, grade);

create index if not exists idx_official_students_class_id
  on official_students(class_id);

create index if not exists idx_official_class_schedules_class_id_day
  on official_class_schedules(class_id, day_of_week);

create index if not exists idx_official_attendance_sessions_date
  on official_attendance_sessions(session_date);

create index if not exists idx_official_attendance_sessions_saved_date
  on official_attendance_sessions(saved, session_date);

create index if not exists idx_official_attendance_sessions_class_date
  on official_attendance_sessions(class_id, session_date);

create index if not exists idx_official_attendance_rows_session_key
  on official_attendance_rows(session_key);

create index if not exists idx_official_attendance_rows_student_id
  on official_attendance_rows(student_id);

create index if not exists idx_official_attendance_rows_session_type
  on official_attendance_rows(session_key, row_type);

create index if not exists idx_official_absence_records_status
  on official_absence_records(status);

create index if not exists idx_official_absence_records_student
  on official_absence_records(student_id);

create index if not exists idx_official_absence_records_source_class
  on official_absence_records(source_class_id);

create index if not exists idx_official_absence_records_source_session
  on official_absence_records(source_session_key);

create index if not exists idx_official_makeup_plans_status
  on official_makeup_plans(status);

create index if not exists idx_official_makeup_plans_student
  on official_makeup_plans(student_id);

create index if not exists idx_official_makeup_plans_source_class
  on official_makeup_plans(source_class_id);

create index if not exists idx_official_makeup_plans_target_class
  on official_makeup_plans(target_class_id);

create index if not exists idx_official_makeup_plans_target_session
  on official_makeup_plans(target_session_key);

create index if not exists idx_official_makeup_plans_absence
  on official_makeup_plans(absence_id);

create index if not exists idx_official_session_cancellations_date
  on official_session_cancellations(session_date);

create index if not exists idx_official_session_cancellations_class
  on official_session_cancellations(class_id);

create index if not exists idx_official_session_cancellations_session
  on official_session_cancellations(session_key);

create index if not exists idx_official_class_makeup_sessions_date
  on official_class_makeup_sessions(makeup_date);

create index if not exists idx_official_class_makeup_sessions_class
  on official_class_makeup_sessions(class_id);

create index if not exists idx_official_class_makeup_sessions_status_date
  on official_class_makeup_sessions(status, makeup_date);

create index if not exists idx_official_tuition_status_month
  on official_tuition_status(month_key);

create index if not exists idx_official_tuition_status_student
  on official_tuition_status(student_id);

create index if not exists idx_official_tuition_status_month_student
  on official_tuition_status(month_key, student_id);

create index if not exists idx_official_evaluations_month
  on official_evaluations(month_key);

create index if not exists idx_official_evaluations_class_month
  on official_evaluations(class_id, month_key);

create index if not exists idx_official_evaluations_student_month
  on official_evaluations(student_id, month_key);

create index if not exists idx_official_exercise_library_active_created
  on official_exercise_library(created_at desc)
  where deleted_at is null;

create index if not exists idx_official_exercise_library_type_skill
  on official_exercise_library(type, skill)
  where deleted_at is null;

create index if not exists idx_official_sessions_user_expires
  on official_sessions(user_id, expires_at);

create index if not exists idx_official_sessions_token
  on official_sessions(token);

create index if not exists idx_official_settings_key
  on official_settings(key);
