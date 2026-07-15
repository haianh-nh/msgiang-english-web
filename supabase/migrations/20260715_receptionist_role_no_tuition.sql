-- V20P — Receptionist role (operational management, no tuition access)
-- API authorization is enforced in the application. This migration only
-- allows the new role value in official_users.roles.

ALTER TABLE official_users
  DROP CONSTRAINT IF EXISTS official_users_roles_check;

ALTER TABLE official_users
  ADD CONSTRAINT official_users_roles_check CHECK (
    roles <@ array['admin','manager','receptionist','teacher','ta','parent']::text[]
    and cardinality(roles) >= 1
  );

CREATE INDEX IF NOT EXISTS idx_official_users_roles_gin
ON official_users USING gin (roles);
