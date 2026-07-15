-- Phase 7G: focused indexes for tuition arrears and monthly evaluation reads.

CREATE INDEX IF NOT EXISTS idx_official_tuition_status_unpaid_charge_student_month
ON official_tuition_status (student_id, month_key)
WHERE paid = false
  AND (message_sent = true OR material_fee > 0 OR snapshot IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_official_evaluations_month_class_updated
ON official_evaluations (month_key, class_id, updated_at DESC);

ANALYZE official_tuition_status;
ANALYZE official_evaluations;
