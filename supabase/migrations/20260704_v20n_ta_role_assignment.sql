-- V20N — TA Role & Class Assignment
-- Adds a real TA/assistant teacher link so TA accounts can see and work with assigned classes.

ALTER TABLE official_classes
  ADD COLUMN IF NOT EXISTS assistant_teacher_id uuid REFERENCES official_teachers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_official_classes_assistant_teacher_id
ON official_classes (assistant_teacher_id);

-- Backfill assistant_teacher_id from the existing assistant_name text when there is an exact teacher name match.
UPDATE official_classes c
SET assistant_teacher_id = t.id,
    assistant_name = COALESCE(NULLIF(c.assistant_name, ''), t.name)
FROM official_teachers t
WHERE c.assistant_teacher_id IS NULL
  AND c.assistant_name IS NOT NULL
  AND lower(trim(c.assistant_name)) = lower(trim(t.name));

-- Allow the new TA role in the existing text[] role constraint.
ALTER TABLE official_users
  DROP CONSTRAINT IF EXISTS official_users_roles_check;

ALTER TABLE official_users
  ADD CONSTRAINT official_users_roles_check CHECK (
    roles <@ array['admin','manager','teacher','ta','parent']::text[]
    and cardinality(roles) >= 1
  );

-- Helpful index for role lookups stored in official_users.roles text[].
CREATE INDEX IF NOT EXISTS idx_official_users_roles_gin
ON official_users USING gin (roles);
