-- V20 reset/optimization: speed up monthly makeup filters that search session_key by month.
-- Session keys are stored as: classId|YYYY-MM-DD|Day|HH:mm-HH:mm.
-- Trigram indexes help LIKE '%|YYYY-MM-%' queries used by /api/makeup/state and monthly pending absence lookup.
create extension if not exists pg_trgm;

create index if not exists idx_official_absence_records_source_session_trgm
  on official_absence_records using gin (source_session_key gin_trgm_ops);

create index if not exists idx_official_makeup_plans_source_session_trgm
  on official_makeup_plans using gin (source_session_key gin_trgm_ops);

create index if not exists idx_official_makeup_plans_target_session_trgm
  on official_makeup_plans using gin (target_session_key gin_trgm_ops);

create index if not exists idx_official_absence_records_status_source_session
  on official_absence_records(status, source_session_key);

create index if not exists idx_official_makeup_plans_status_source_session
  on official_makeup_plans(status, source_session_key);
