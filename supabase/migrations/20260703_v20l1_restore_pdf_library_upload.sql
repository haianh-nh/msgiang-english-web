-- V20L.1 — Restore PDF upload support for exercise library
-- Run this once in Supabase SQL Editor before uploading PDF files.
--
-- Safe:
-- - does not delete rows
-- - keeps Word and Audio support
-- - re-allows PDF as a library file type
-- - updates Storage bucket MIME whitelist to include application/pdf

do $$
declare
  c record;
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'official_exercise_library'
  ) then
    -- Remove old type CHECK constraint that only allowed word/audio.
    for c in
      select conname
      from pg_constraint
      where conrelid = 'public.official_exercise_library'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%type%'
    loop
      execute format('alter table public.official_exercise_library drop constraint if exists %I', c.conname);
    end loop;

    alter table public.official_exercise_library
      add constraint official_exercise_library_type_check
      check (type in ('word','pdf','audio'));
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'official-exercise-library',
  'official-exercise-library',
  true,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/aac',
    'audio/m4a',
    'audio/x-m4a'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
