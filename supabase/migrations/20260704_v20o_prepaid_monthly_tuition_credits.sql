-- V20O — Prepaid monthly tuition and next-month credit for class cancellation
-- Safe to run more than once. No data deletion.

CREATE TABLE IF NOT EXISTS official_tuition_credits (
  id text PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES official_students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES official_classes(id) ON DELETE CASCADE,
  source_session_key text NOT NULL,
  source_month text NOT NULL,
  target_month text NOT NULL,
  amount numeric(12,0) NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES official_users(id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES official_users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT official_tuition_credits_status_check CHECK (status IN ('active','cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_official_tuition_credits_student_session
ON official_tuition_credits (student_id, source_session_key);

CREATE INDEX IF NOT EXISTS idx_official_tuition_credits_target_month
ON official_tuition_credits (target_month, status);

CREATE INDEX IF NOT EXISTS idx_official_tuition_credits_student_target
ON official_tuition_credits (student_id, target_month, status);

CREATE INDEX IF NOT EXISTS idx_official_tuition_credits_source_session
ON official_tuition_credits (source_session_key, status);

ALTER TABLE official_tuition_status
  ADD COLUMN IF NOT EXISTS snapshot jsonb;
