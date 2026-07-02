import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

function attendanceKey(sessionKey: string) {
  return `att_${sessionKey}`;
}

export async function GET() {
  const { response } = await requireUser();
  if (response) return response;

  const supabase = supabaseAdmin();
  const [sessionsRes, rowsRes, absRes] = await Promise.all([
    supabase.from("official_attendance_sessions").select("*"),
    supabase.from("official_attendance_rows").select("*"),
    supabase.from("official_absence_records").select("*"),
  ]);

  if (sessionsRes.error) return NextResponse.json({ error: sessionsRes.error.message }, { status: 500 });
  if (rowsRes.error) return NextResponse.json({ error: rowsRes.error.message }, { status: 500 });
  if (absRes.error) return NextResponse.json({ error: absRes.error.message }, { status: 500 });

  const rowsBySession = new Map<string, any[]>();
  for (const r of rowsRes.data || []) {
    const arr = rowsBySession.get(r.session_key) || [];
    arr.push(r);
    rowsBySession.set(r.session_key, arr);
  }

  const attendanceSessions: Record<string, any> = {};
  for (const s of sessionsRes.data || []) {
    const rows: Record<string, any> = {};
    for (const r of rowsBySession.get(s.session_key) || []) {
      rows[`${r.row_type}_${r.student_id}`] = {
        studentId: r.student_id,
        type: r.row_type,
        status: r.status,
        note: r.note || "",
      };
    }
    attendanceSessions[attendanceKey(s.session_key)] = {
      sessionKey: s.session_key,
      saved: !!s.saved,
      editable: !!s.editable,
      rows,
      manualMakeups: Array.isArray(s.manual_makeups) ? s.manual_makeups : [],
      updatedAt: s.updated_at,
    };
  }

  const absenceRecords = (absRes.data || []).map((a: any) => ({
    id: a.id,
    studentId: a.student_id,
    sourceClassId: a.source_class_id,
    sourceSessionKey: a.source_session_key,
    sourceSessionLabel: a.source_session_label,
    reason: a.reason || "Vắng",
    generatedFromAttendance: !!a.generated_from_attendance,
    status: a.status || "pending",
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  }));

  return NextResponse.json({ ok: true, attendanceSessions, absenceRecords });
}
