// Phase 7K: centralized, explicit column lists for hot API queries.
// Literal string types let Supabase infer response fields while keeping
// password hashes and unrelated columns out of API payloads.

export const AUTH_LOGIN_USER_SELECT = "id,name,phone,email,password_hash,roles,status,must_change_password" as const;

export const AUTH_SESSION_USER_SELECT = "id,name,phone,email,roles,status,must_change_password" as const;

export const PUBLIC_USER_SELECT = "id,name,phone,email,roles,status,must_change_password,created_at,updated_at" as const;

export const TEACHER_BASE_SELECT = "id,user_id,name,phone,email,status,note,created_at,updated_at" as const;

export const STUDENT_CLIENT_SELECT = "id,class_id,name,parent_name,parent_phone,contact,note,status,enrollment_start_date,tuition_regular_start_month,created_at,updated_at" as const;

export const EVALUATION_CLIENT_SELECT = "id,student_id,class_id,month_key,scores,status,comment,strengths,improvements,suggestion,updated_at,published_at,created_by,updated_by" as const;

export const CLASS_WITH_RELATIONS_SELECT = `
  id,
  name,
  grade,
  teacher_id,
  assistant_teacher_id,
  assistant_name,
  start_date,
  end_date,
  status,
  note,
  created_at,
  updated_at,
  official_teachers:teacher_id(id,name),
  official_assistant_teacher:assistant_teacher_id(id,name),
  official_students(
    id,
    class_id,
    name,
    parent_name,
    parent_phone,
    contact,
    note,
    status,
    enrollment_start_date,
    tuition_regular_start_month,
    created_at,
    updated_at
  ),
  official_class_schedules(id,day_of_week,start_time,end_time,sort_order)
` as const;
