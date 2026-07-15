import { NextResponse } from "next/server";
import { requireUser, canAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const REQUIRED_TABLES = [
  "official_users",
  "official_sessions",
  "official_teachers",
  "official_classes",
  "official_class_schedules",
  "official_students",
  "official_student_enrollments",
  "official_v48_state",
  "official_settings",
  "official_attendance_sessions",
  "official_attendance_rows",
  "official_tuition_status",
  "official_exercise_library",
  "official_evaluations",
];

async function countTable(table: string) {
  const { count, error } = await supabaseAdmin()
    .from(table)
    .select("*", { count: "exact", head: true });

  return {
    table,
    ok: !error,
    count: count ?? 0,
    error: error?.message || "",
  };
}

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canAdmin(user)) return NextResponse.json({ error: "Chỉ Admin được kiểm tra hệ thống" }, { status: 403 });

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SESSION_DAYS: process.env.SESSION_DAYS || "14",
  };

  const tableChecks = await Promise.all(REQUIRED_TABLES.map(countTable));

  const { data: buckets, error: bucketError } = await supabaseAdmin().storage.listBuckets();
  const bucketNames = (buckets || []).map((b: any) => b.name);
  const storage = {
    ok: !bucketError && bucketNames.includes("official-exercise-library"),
    bucket: "official-exercise-library",
    buckets: bucketNames,
    error: bucketError?.message || "",
  };

  const ok = Object.values(env).every(Boolean) && tableChecks.every((x) => x.ok) && storage.ok;

  return NextResponse.json({
    ok,
    checkedAt: new Date().toISOString(),
    env,
    tables: tableChecks,
    storage,
  });
}
