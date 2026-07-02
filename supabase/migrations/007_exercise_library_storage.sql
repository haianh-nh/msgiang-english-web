create table if not exists official_exercise_library (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('word','audio')),
  title text not null,
  level text default 'All',
  skill text default '',
  unit text default '',
  file_name text not null,
  mime_type text,
  file_size bigint default 0,
  storage_bucket text not null default 'official-exercise-library',
  storage_path text not null,
  public_url text,
  uploaded_by uuid references official_users(id) on delete set null,
  uploader_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create index if not exists official_exercise_library_type_idx on official_exercise_library(type);
create index if not exists official_exercise_library_level_idx on official_exercise_library(level);
create index if not exists official_exercise_library_skill_idx on official_exercise_library(skill);
create index if not exists official_exercise_library_created_idx on official_exercise_library(created_at desc);

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
