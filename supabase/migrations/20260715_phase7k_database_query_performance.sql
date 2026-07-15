-- Phase 7K: safe query-performance indexes.
-- No application data or business rules are changed.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Admin staff list: active/inactive filtering plus newest-first ordering.
CREATE INDEX IF NOT EXISTS idx_official_users_status_created_at
ON public.official_users (status, created_at DESC);

-- Exact user login already uses the UNIQUE index on phone. These indexes speed
-- up staff/teacher lookup and case-insensitive exact-name searches used while
-- creating or assigning classes.
CREATE INDEX IF NOT EXISTS idx_official_teachers_status_name
ON public.official_teachers (status, name);

CREATE INDEX IF NOT EXISTS idx_official_teachers_name_trgm
ON public.official_teachers USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_official_classes_name_trgm
ON public.official_classes USING gin (name gin_trgm_ops);

-- Common class roster ordering/filter shape.
CREATE INDEX IF NOT EXISTS idx_official_students_class_status_name
ON public.official_students (class_id, status, name);

ANALYZE public.official_users;
ANALYZE public.official_teachers;
ANALYZE public.official_classes;
ANALYZE public.official_students;
