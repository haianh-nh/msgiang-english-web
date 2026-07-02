import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { response } = await requireUser();
  if (response) return response;

  const supabase = supabaseAdmin();
  const [cRes, cmRes, mRes] = await Promise.all([
    supabase.from("official_session_cancellations").select("*"),
    supabase.from("official_class_makeup_sessions").select("*").neq("status", "cancelled"),
    supabase.from("official_makeup_plans").select("*"),
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

  return NextResponse.json({ ok: true, classCancellations, classMakeupSessions, makeupPlans });
}
