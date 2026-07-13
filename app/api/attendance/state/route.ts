import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

function attendanceKey(sessionKey: string) {
  return `att_${sessionKey}`;
}

function validDate(v: string | null) {
  const s = String(v || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

function parseYmdUtc(date: string) {
  const [y, m, d] = String(date || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function monthsInDateRange(start: string, end: string) {
  if (!start || !end) return [];
  const out: string[] = [];
  const d = parseYmdUtc(start);
  const endDate = parseYmdUtc(end);
  if (!d || !endDate || !Number.isFinite(d.getTime()) || !Number.isFinite(endDate.getTime())) return [];
  // end is exclusive; include every month touched by [start, end).
  while (d.getTime() < endDate.getTime()) {
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!out.includes(key)) out.push(key);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function applySessionMonthFilter(query: any, column: string, months: string[]) {
  const safe = months.filter((m) => /^\d{4}-\d{2}$/.test(m));
  if (!safe.length) return query;
  if (safe.length === 1) return query.like(column, `%|${safe[0]}-%`);
  return query.or(safe.map((m) => `${column}.like.*|${m}-*`).join(","));
}

export async function GET(req: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const url = new URL(req.url);
  const start = validDate(url.searchParams.get("start"));
  const end = validDate(url.searchParams.get("end"));

  const supabase = supabaseAdmin();

  let sessionsQuery = supabase
    .from("official_attendance_sessions")
    .select("session_key, session_date, saved, editable, manual_makeups, updated_at")
    .order("session_date", { ascending: true });

  if (start && end) {
    sessionsQuery = sessionsQuery.gte("session_date", start).lt("session_date", end);
  }

  let absQuery = supabase
    .from("official_absence_records")
    .select("id, student_id, source_class_id, source_session_key, source_session_label, reason, generated_from_attendance, status, created_at, updated_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  // Pending học bù chỉ cần theo tháng của tuần đang xem; tránh kéo toàn bộ nhiều tháng về frontend.
  if (start && end) {
    absQuery = applySessionMonthFilter(absQuery, "source_session_key", monthsInDateRange(start, end));
  }

  const [sessionsRes, absRes] = await Promise.all([
    sessionsQuery,
    absQuery,
  ]);

  if (sessionsRes.error) return NextResponse.json({ error: sessionsRes.error.message }, { status: 500 });
  if (absRes.error) return NextResponse.json({ error: absRes.error.message }, { status: 500 });

  const sessionKeys = (sessionsRes.data || []).map((s: any) => s.session_key).filter(Boolean);

  let rowsData: any[] = [];
  if (sessionKeys.length) {
    const { data, error } = await supabase
      .from("official_attendance_rows")
      .select("session_key, student_id, row_type, status, note")
      .in("session_key", sessionKeys);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rowsData = data || [];
  }

  const rowsBySession = new Map<string, any[]>();
  for (const r of rowsData) {
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

  return NextResponse.json({ ok: true, start: start || null, end: end || null, attendanceSessions, absenceRecords });
}
