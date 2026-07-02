-- Ms.Giang English Official V48 Port
-- This file records official schema requirements for the backend wiring phase.
-- The UI in this package is intentionally a 1:1 static port of the approved V48 HTML.
-- Backend wiring should map the V48 actions/modals to Supabase/API routes without changing UI.

-- Confirmed official requirements:
-- 1. Parent role is removed entirely.
-- 2. Default tuition per attended session: 70000 VND.
-- 3. Admin can edit tuition rate in Settings.
-- 4. Default capacity: 15 students/session.
-- 5. Capacity includes regular students + make-up students.
-- 6. Class/student data supports both manual entry and file import.

-- Suggested settings table for next backend phase:
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

insert into app_settings(key, value) values
  ('tuition_per_session', '70000'),
  ('session_capacity', '15'),
  ('center_name', 'Ms.Giang English Center')
on conflict (key) do nothing;
