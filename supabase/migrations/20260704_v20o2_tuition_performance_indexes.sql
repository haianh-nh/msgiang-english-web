-- V20O.2 — Safe performance indexes for tuition screens and next-month credits.

CREATE INDEX IF NOT EXISTS idx_official_tuition_status_month_paid_sent
ON official_tuition_status (month_key, paid, message_sent);

CREATE INDEX IF NOT EXISTS idx_official_tuition_status_student_month_paid
ON official_tuition_status (student_id, month_key, paid);

CREATE INDEX IF NOT EXISTS idx_official_tuition_credits_target_status_student
ON official_tuition_credits (target_month, status, student_id);

CREATE INDEX IF NOT EXISTS idx_official_tuition_credits_source_status
ON official_tuition_credits (source_session_key, status);

CREATE INDEX IF NOT EXISTS idx_official_session_cancellations_month_class
ON official_session_cancellations (session_date, class_id);
