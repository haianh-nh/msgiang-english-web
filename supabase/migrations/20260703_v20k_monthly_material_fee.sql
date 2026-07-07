-- V20K — Monthly material fee per student
-- Adds per-student, per-month material fee fields into the existing tuition status table.
-- Safe: no data deletion, no table rename.

ALTER TABLE official_tuition_status
  ADD COLUMN IF NOT EXISTS material_fee numeric(12,0) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS material_note text,
  ADD COLUMN IF NOT EXISTS material_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS material_updated_by uuid;

CREATE INDEX IF NOT EXISTS idx_official_tuition_status_month_material
ON official_tuition_status (month_key, material_fee);

CREATE INDEX IF NOT EXISTS idx_official_tuition_status_student_month_material
ON official_tuition_status (student_id, month_key, material_fee);
