import { NextResponse } from "next/server";
import { requireUser, canAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const TABLES = [
  "official_settings",
  "official_users",
  "official_teachers",
  "official_classes",
  "official_class_schedules",
  "official_students",
  "official_student_enrollments",
  "official_attendance_sessions",
  "official_attendance_rows",
  "official_makeup_plans",
  "official_tuition_status",
  "official_tuition_credits",
  "official_tuition_adjustments",
  "official_exercise_library",
  "official_evaluations",
  "official_import_batches",
];

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canAdmin(user)) return NextResponse.json({ error: "Chỉ Admin được xuất backup" }, { status: 403 });

  const supabase = supabaseAdmin();
  const tables: Record<string, any[]> = {};
  const errors: Record<string, string> = {};

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      tables[table] = [];
      errors[table] = error.message;
    } else {
      tables[table] = data || [];
    }
  }

  const payload = {
    app: "Ms.Giang English Center",
    version: "official-backend-v9",
    exportedAt: new Date().toISOString(),
    exportedBy: { id: user.id, name: user.name, phone: user.phone },
    tables,
    errors,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="msgiang-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
