import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

function isMissingRpc(error: any, name: string) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return error?.code === "PGRST202" || error?.code === "42883" || (msg.includes(name.toLowerCase()) && (msg.includes("not found") || msg.includes("does not exist")));
}

function mapPlan(r: any) {
  if (!r) return null;
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

function mapAbsence(a: any) {
  if (!a) return null;
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

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const started = performance.now();
  const { response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  const supabase = supabaseAdmin();
  const rpcStarted = performance.now();
  const rpc = await supabase.rpc("official_cancel_makeup_plan", { p_plan_id: id });

  let plan: any = null;
  let absenceRecord: any = null;
  let mode = "rpc";

  if (!rpc.error) {
    plan = mapPlan(rpc.data?.plan);
    absenceRecord = mapAbsence(rpc.data?.absenceRecord);
  } else if (isMissingRpc(rpc.error, "official_cancel_makeup_plan")) {
    mode = "legacy";
    const { data, error } = await supabase
      .from("official_makeup_plans")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    plan = mapPlan(data);

    if (data?.absence_id) {
      const { data: absence, error: absenceError } = await supabase
        .from("official_absence_records")
        .update({ status: "pending", updated_at: new Date().toISOString() })
        .eq("id", data.absence_id)
        .select("*")
        .maybeSingle();
      if (absenceError) return NextResponse.json({ error: absenceError.message }, { status: 500 });
      absenceRecord = mapAbsence(absence);
    }
  } else {
    const status = rpc.error?.code === "P0001" ? 400 : 500;
    return NextResponse.json({ error: rpc.error.message || "Không hủy được lịch học bù" }, { status });
  }

  const res = NextResponse.json({ ok: true, plan, absenceRecord, mode });
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Server-Timing", `rpc;dur=${(performance.now() - rpcStarted).toFixed(1)},total;dur=${(performance.now() - started).toFixed(1)}`);
  return res;
}
