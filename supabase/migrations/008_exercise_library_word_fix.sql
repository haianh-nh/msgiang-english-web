-- V7 Word Fix: đổi thư viện bài tập từ PDF sang Word (.doc/.docx) + Audio.
-- Chạy file này nếu bạn đã từng chạy migration 007 trước đó.

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'official_exercise_library'
  ) then
    update official_exercise_library
    set type = 'word', updated_at = now()
    where type = 'pdf';

    alter table official_exercise_library
      drop constraint if exists official_exercise_library_type_check;

    alter table official_exercise_library
      add constraint official_exercise_library_type_check
      check (type in ('word','audio'));
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'official-exercise-library',
  'official-exercise-library',
  true,
  52428800,
  array[
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
