import { NextRequest, NextResponse } from "next/server";
import { requireUser, canTuition } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function normalizeMonth(v: any) {
  const s = String(v || "");
  return /^\d{4}-\d{2}$/.test(s) ? s : currentMonthKey();
}

function isMissingAdjustmentTable(error: any) {
  const text = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  return text.includes("pgrst205") || text.includes("does not exist") || text.includes("could not find the table") || text.includes("schema cache");
}

function compactSnapshot(value: any) {
  if (!value || typeof value !== "object") return null;
  const allowed = [
    "amount",
    "total",
    "totalDue",
    "currentAmount",
    "tuitionAmount",
    "baseTuition",
    "adjustmentAmount",
    "materialFee",
    "creditAmount",
    "plannedSessions",
    "unitPrice",
  ];
  const snapshot: Record<string, any> = {};
  for (const key of allowed) {
    const raw = value[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const n = Number(raw);
    snapshot[key] = Number.isFinite(n) ? Math.round(n) : raw;
  }
  return Object.keys(snapshot).length ? snapshot : null;
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canTuition(user)) return NextResponse.json({ error: "Không có quyền cập nhật học phí" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const monthKey = normalizeMonth(body.monthKey || body.month);
  const action = String(body.action || "sent");
  const rawItems = Array.isArray(body.items) ? body.items : [];

  if (!["sent", "unsent"].includes(action)) {
    return NextResponse.json({ error: "Bulk action không hợp lệ" }, { status: 400 });
  }
  if (!rawItems.length) return NextResponse.json({ error: "Danh sách học sinh trống" }, { status: 400 });
  if (rawItems.length > 500) return NextResponse.json({ error: "Mỗi lần chỉ xử lý tối đa 500 học sinh" }, { status: 400 });

  const unique = new Map<string, any>();
  for (const raw of rawItems) {
    const studentId = String(raw?.studentId || raw?.id || "").trim();
    if (!studentId) continue;
    unique.set(studentId, { studentId, snapshot: compactSnapshot(raw?.snapshot) });
  }
  const items = Array.from(unique.values());
  if (!items.length) return NextResponse.json({ error: "Không có học sinh hợp lệ" }, { status: 400 });

  const now = new Date().toISOString();
  const rows = items.map((item) => ({
    month_key: monthKey,
    student_id: item.studentId,
    message_sent: action === "sent",
    message_sent_at: action === "sent" ? now : null,
    message_sent_by: action === "sent" ? user.id : null,
    updated_at: now,
    ...(item.snapshot ? { snapshot: item.snapshot } : {}),
  }));

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("official_tuition_status")
    .upsert(rows, { onConflict: "month_key,student_id" })
    .select("month_key,student_id,message_sent,message_sent_at,message_sent_by");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let adjustmentWarning = "";
  const studentIds = items.map((item) => item.studentId);
  try {
    if (action === "sent") {
      const { error: adjustmentError } = await supabase
        .from("official_tuition_adjustments")
        .update({ status: "included", included_at: now, included_by: user.id, updated_at: now })
        .eq("target_month", monthKey)
        .in("student_id", studentIds)
        .eq("status", "pending");
      if (adjustmentError && !isMissingAdjustmentTable(adjustmentError)) adjustmentWarning = adjustmentError.message;
    } else {
      const { data: current, error: currentError } = await supabase
        .from("official_tuition_status")
        .select("student_id,paid,message_sent")
        .eq("month_key", monthKey)
        .in("student_id", studentIds);
      if (currentError) throw currentError;
      const unlockedIds = (current || [])
        .filter((row: any) => !row.paid && !row.message_sent)
        .map((row: any) => String(row.student_id));
      if (unlockedIds.length) {
        const { error: adjustmentError } = await supabase
          .from("official_tuition_adjustments")
          .update({ status: "pending", included_at: null, included_by: null, updated_at: now })
          .eq("target_month", monthKey)
          .in("student_id", unlockedIds)
          .eq("status", "included");
        if (adjustmentError && !isMissingAdjustmentTable(adjustmentError)) adjustmentWarning = adjustmentError.message;
      }
    }
  } catch (e: any) {
    if (!isMissingAdjustmentTable(e)) adjustmentWarning = e?.message || "Không cập nhật được trạng thái khoản phát sinh";
  }

  return NextResponse.json({
    ok: true,
    processed: data?.length || rows.length,
    studentIds,
    items: data || [],
    adjustmentWarning: adjustmentWarning || undefined,
  });
}
