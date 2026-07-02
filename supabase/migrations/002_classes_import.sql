alter table official_classes add column if not exists assistant_name text;
alter table official_students add column if not exists parent_name text;
alter table official_students add column if not exists contact text;

create index if not exists official_classes_name_idx on official_classes(name);
create index if not exists official_teachers_name_idx on official_teachers(name);
create index if not exists official_class_schedules_class_idx on official_class_schedules(class_id);
