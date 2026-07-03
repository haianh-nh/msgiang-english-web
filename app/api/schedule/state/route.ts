import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

function validDate(v: string | null) {
  const s = String(v || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

export async function GET(req: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const url = new URL(req.url);
  const start = validDate(url.searchParams.get("start"));
  const end = validDate(url.searchParams.get("end"));

  const supabase = supabaseAdmin();

  let cancellationsQuery = supabase
    .from("official_session_cancellations")
    .select("id, session_key, class_id, session_date, day_key, start_time, end_time, reason, created_at")
    .order("session_date", { ascending: true });

  let makeupSessionsQuery = supabase
    .from("official_class_makeup_sessions")
    .select("id, class_id, source_session_key, makeup_date, day_key, start_time, end_time, reason, status, created_at, updated_at")
    .neq("status", "cancelled")
    .order("makeup_date", { ascending: true });

  if (start && end) {
    cancellationsQuery = cancellationsQuery.gte("session_date", start).lt("session_date", end);
    makeupSessionsQuery = makeupSessionsQuery.gte("makeup_date", start).lt("makeup_date", end);
  }

  const [cRes, cmRes, mRes] = await Promise.all([
    cancellationsQuery,
    makeupSessionsQuery,
    supabase
      .from("official_makeup_plans")
      .select("id, absence_id, student_id, source_class_id, source_session_key, target_class_id, target_session_key, status, created_by, created_at, cancelled_at")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false }),
  ]);

  if (cRes.error) return NextResponse.json({ error: cRes.error.message }, { status: 500 });
  if (cmRes.error) return NextResponse.json({ error: cmRes.error.message }, { status: 500 });
  if (mRes.error) return NextResponse.json({ error: mRes.error.message }, { status: 500 });

  const classCancellations: Record<string, any> = {};
  for (const r of cRes.data || []) {
    classCancellations[r.session_key] = {
      sessionKey: r.session_key,
      classId: r.class_id,
      date: r.session_date,
      day: r.day_key,
      start: String(r.start_time || "").slice(0, 5),
      end: String(r.end_time || "").slice(0, 5),
      reason: r.reason || "Nghỉ buổi học",
      createdAt: r.created_at,
    };
  }

  const classMakeupSessions = (cmRes.data || []).map((r: any) => ({
    id: r.id,
    classId: r.class_id,
    sourceSessionKey: r.source_session_key,
    date: r.makeup_date,
    day: r.day_key,
    start: String(r.start_time || "").slice(0, 5),
    end: String(r.end_time || "").slice(0, 5),
    reason: r.reason || "Dạy bù",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  const makeupPlans = (mRes.data || []).map((r: any) => ({
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
  }));

  return NextResponse.json({ ok: true, start: start || null, end: end || null, classCancellations, classMakeupSessions, makeupPlans });
}
