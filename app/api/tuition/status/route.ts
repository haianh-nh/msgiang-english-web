import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function normalizeMonth(v: any) {
  const s = String(v || "");
  return /^\d{4}-\d{2}$/.test(s) ? s : currentMonthKey();
}

function normalizeMonthKeys(value: any, fallback: string) {
  const raw = Array.isArray(value) ? value : [fallback];
  const out = raw.map(normalizeMonth).filter(Boolean);
  return Array.from(new Set(out.length ? out : [fallback]));
}

function sanitizeMaterialFee(v: any) {
  const n = Number(String(v ?? 0).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function sanitizeText(v: any, max = 500) {
  return String(v || "").trim().slice(0, max);
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền cập nhật học phí" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const studentId = String(body.studentId || "");
  const monthKey = normalizeMonth(body.monthKey || body.month);
  const action = String(body.action || "");
  const snapshot = body.snapshot || null;

  if (!studentId) return NextResponse.json({ error: "Thiếu học sinh" }, { status: 400 });

  const now = new Date().toISOString();
  const monthKeys = action === "paid"
    ? normalizeMonthKeys(body.monthKeys || body.payMonths, monthKey)
    : [monthKey];

  if (!["paid", "unpaid", "sent", "unsent", "material"].includes(action)) {
    return NextResponse.json({ error: "Action không hợp lệ" }, { status: 400 });
  }

  const rows = monthKeys.map((mk) => {
    const patch: any = {
      month_key: mk,
      student_id: studentId,
      updated_at: now,
    };
    if (snapshot) patch.snapshot = snapshot;

    if (action === "paid") {
      patch.paid = true;
      patch.paid_at = now;
      patch.paid_by = user.id;
    } else if (action === "unpaid") {
      patch.paid = false;
      patch.paid_at = null;
      patch.paid_by = null;
    } else if (action === "sent") {
      patch.message_sent = true;
      patch.message_sent_at = now;
      patch.message_sent_by = user.id;
    } else if (action === "unsent") {
      patch.message_sent = false;
      patch.message_sent_at = null;
      patch.message_sent_by = null;
    } else if (action === "material") {
      patch.material_fee = sanitizeMaterialFee(body.materialFee ?? body.amount);
      patch.material_note = sanitizeText(body.materialNote ?? body.note);
      patch.material_updated_at = now;
      patch.material_updated_by = user.id;
    }

    return patch;
  });

  const { data, error } = await supabaseAdmin()
    .from("official_tuition_status")
    .upsert(rows, { onConflict: "month_key,student_id" })
    .select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let adjustmentWarning = "";
  const adjustmentMonths = monthKeys;
  try {
    if (["paid", "sent"].includes(action)) {
      const { error: adjustmentError } = await supabaseAdmin()
        .from("official_tuition_adjustments")
        .update({ status: "included", included_at: now, included_by: user.id, updated_at: now })
        .eq("student_id", studentId)
        .in("target_month", adjustmentMonths)
        .eq("status", "pending");
      if (adjustmentError) adjustmentWarning = adjustmentError.message;
    } else if (["unpaid", "unsent"].includes(action)) {
      const { data: current } = await supabaseAdmin()
        .from("official_tuition_status")
        .select("month_key,paid,message_sent")
        .eq("student_id", studentId)
        .in("month_key", adjustmentMonths);
      const unlockedMonths = (current || [])
        .filter((row: any) => !row.paid && !row.message_sent)
        .map((row: any) => String(row.month_key));
      if (unlockedMonths.length) {
        const { error: adjustmentError } = await supabaseAdmin()
          .from("official_tuition_adjustments")
          .update({ status: "pending", included_at: null, included_by: null, updated_at: now })
          .eq("student_id", studentId)
          .in("target_month", unlockedMonths)
          .eq("status", "included");
        if (adjustmentError) adjustmentWarning = adjustmentError.message;
      }
    }
  } catch (adjustmentError: any) {
    adjustmentWarning = adjustmentError?.message || "Không cập nhật được trạng thái khoản phát sinh";
  }

  return NextResponse.json({ ok: true, items: data || [], adjustmentWarning: adjustmentWarning || undefined });
}
