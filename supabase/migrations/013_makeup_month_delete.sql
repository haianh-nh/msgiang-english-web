-- Manual monthly makeup data closing.
-- This is a soft delete: attendance history stays intact, but the month is hidden from Hoc bu workflows.

create table if not exists official_makeup_deleted_months (
  month_key text primary key check (month_key ~ '^\d{4}-\d{2}$'),
  reason text,
  deleted_by uuid references official_users(id) on delete set null,
  deleted_at timestamptz default now()
);

create index if not exists idx_official_makeup_deleted_months_deleted_at
  on official_makeup_deleted_months(deleted_at);
