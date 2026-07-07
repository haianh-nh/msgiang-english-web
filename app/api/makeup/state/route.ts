import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

function validMonth(v: string | null) {
  const s = String(v || "");
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  return new Date().toISOString().slice(0, 7);
}

function attendanceKey(sessionKey: string) {
  return `att_${sessionKey}`;
}

function sessionKeyMonthLike(monthKey: string) {
  // Session key format: classId|YYYY-MM-DD|Day|HH:mm-HH:mm
  return `%|${monthKey}-%`;
}

function mapAbsence(a: any) {
  return {
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
  };
}

function mapPlan(r: any) {
  return {
    id: r.id,
    absenceId: r.absence_id,
    studentId: r.student_id,
    sourceClassId: r.source_class_id,
    sourceSessionKey: r.source_session_key,
    targetClassId: r.target_class_id,
    targetSessionKey: r.target_session_key,
    status: r.status,
    createdBy: r.created_by,
    createdAt: r.created_at,
    cancelledAt: r.cancelled_at,
  };
}

export async function GET(req: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const url = new URL(req.url);
  const month = validMonth(url.searchParams.get("month"));
  const supabase = supabaseAdmin();

  // API riêng cho tab Học bù: chỉ kéo dữ liệu của tháng đang xem.
  // Điều này tránh việc tab Học bù phải tải toàn bộ lịch/điểm danh nhiều tháng rồi lọc ở frontend.
  const [absRes, planRes] = await Promise.all([
    supabase
      .from("official_absence_records")
      .select("id, student_id, source_class_id, source_session_key, source_session_label, reason, generated_from_attendance, status, created_at, updated_at")
      .like("source_session_key", sessionKeyMonthLike(month))
      .order("created_at", { ascending: true }),
    supabase
      .from("official_makeup_plans")
      .select("id, absence_id, student_id, source_class_id, source_session_key, target_class_id, target_session_key, status, created_by, created_at, cancelled_at")
      .like("source_session_key", sessionKeyMonthLike(month))
      .order("created_at", { ascending: false }),
  ]);

  if (absRes.error) return NextResponse.json({ error: absRes.error.message }, { status: 500 });
  if (planRes.error) return NextResponse.json({ error: planRes.error.message }, { status: 500 });

  const plans = planRes.data || [];
  const targetSessionKeys = Array.from(new Set(plans.map((p: any) => String(p.target_session_key || "")).filter(Boolean)));

  let attendanceSessions: Record<string, any> = {};
  if (targetSessionKeys.length) {
    const [sessionRes, rowRes] = await Promise.all([
      supabase
        .from("official_attendance_sessions")
        .select("session_key, session_date, saved, editable, manual_makeups, updated_at")
        .in("session_key", targetSessionKeys),
      supabase
        .from("official_attendance_rows")
        .select("session_key, student_id, row_type, status, note")
        .in("session_key", targetSessionKeys),
    ]);

    if (sessionRes.error) return NextResponse.json({ error: sessionRes.error.message }, { status: 500 });
    if (rowRes.error) return NextResponse.json({ error: rowRes.error.message }, { status: 500 });

    const rowsBySession = new Map<string, any[]>();
    for (const r of rowRes.data || []) {
      const arr = rowsBySession.get(r.session_key) || [];
      arr.push(r);
      rowsBySession.set(r.session_key, arr);
    }

    for (const s of sessionRes.data || []) {
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
  }

  return NextResponse.json({
    ok: true,
    month,
    attendanceSessions,
    absenceRecords: (absRes.data || []).map(mapAbsence),
    makeupPlans: plans.map(mapPlan),
  });
}
