import { NextRequest, NextResponse } from "next/server";
import { requireUser, canTuition } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeMonthKey } from "@/lib/tuition-enrollment";

function cleanMoney(value: unknown) {
  const n = Number(String(value ?? 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : NaN;
}

function cleanCount(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 100 ? n : NaN;
}

function sessionKeysFromAdjustment(row: any) {
  const list = Array.isArray(row?.session_dates) ? row.session_dates : [];
  return Array.from(new Set(list.map((item: any) => String(item?.sessionKey || item || "")).filter(Boolean)));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const started = performance.now();
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canTuition(user)) return NextResponse.json({ error: "Không có quyền sửa khoản phát sinh" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "update");
  const supabase = supabaseAdmin();

  const { data: row, error: findError } = await supabase
    .from("official_tuition_adjustments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Không tìm thấy khoản phát sinh" }, { status: 404 });

  const { data: lockedInvoice, error: statusError } = await supabase
    .from("official_tuition_status")
    .select("paid,message_sent")
    .eq("student_id", String(row.student_id))
    .eq("month_key", String(row.target_month))
    .maybeSingle();

  if (statusError) return NextResponse.json({ error: statusError.message }, { status: 500 });
  if (lockedInvoice?.paid || lockedInvoice?.message_sent || row.status === "included") {
    return NextResponse.json({
      error: "Khoản này đã nằm trong hóa đơn đã gửi hoặc đã nộp. Hãy bỏ trạng thái gửi/nộp trước khi chỉnh sửa.",
    }, { status: 409 });
  }

  const now = new Date().toISOString();
  let patch: Record<string, any>;

  if (action === "cancel") {
    patch = {
      status: "cancelled",
      cancelled_at: now,
      cancelled_by: user.id,
      updated_at: now,
    };
  } else if (action === "restore") {
    patch = {
      status: "pending",
      cancelled_at: null,
      cancelled_by: null,
      updated_at: now,
    };
  } else if (action === "update") {
    const targetMonth = normalizeMonthKey(body.targetMonth || row.target_month);
    const sessionCount = cleanCount(body.sessionCount ?? row.session_count);
    const unitPrice = cleanMoney(body.unitPrice ?? row.unit_price);
    if (!targetMonth || targetMonth <= String(row.source_month)) {
      return NextResponse.json({ error: "Tháng thu phải sau tháng phát sinh" }, { status: 400 });
    }
    if (!Number.isFinite(sessionCount)) return NextResponse.json({ error: "Số buổi không hợp lệ" }, { status: 400 });
    if (!Number.isFinite(unitPrice)) return NextResponse.json({ error: "Đơn giá không hợp lệ" }, { status: 400 });

    patch = {
      target_month: targetMonth,
      session_count: sessionCount,
      unit_price: unitPrice,
      amount: sessionCount * unitPrice,
      note: String(body.note ?? row.note ?? "").trim().slice(0, 500) || null,
      updated_at: now,
    };
  } else {
    return NextResponse.json({ error: "Thao tác không hợp lệ" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("official_tuition_adjustments")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const relatedSessionKeys = sessionKeysFromAdjustment(row);
  let creditWarning = "";
  if (relatedSessionKeys.length && ["cancel", "restore"].includes(action)) {
    if (action === "cancel") {
      const { error: creditError } = await supabase
        .from("official_tuition_credits")
        .update({ status: "cancelled", cancelled_at: now, cancelled_by: user.id, updated_at: now })
        .eq("student_id", String(row.student_id))
        .in("source_session_key", relatedSessionKeys)
        .eq("status", "active");
      if (creditError) creditWarning = creditError.message;
    } else {
      const { data: cancellations, error: cancellationError } = await supabase
        .from("official_session_cancellations")
        .select("session_key")
        .in("session_key", relatedSessionKeys);
      if (cancellationError) {
        creditWarning = cancellationError.message;
      } else {
        const activeCancellationKeys = (cancellations || []).map((item: any) => String(item.session_key)).filter(Boolean);
        if (activeCancellationKeys.length) {
          const { error: creditError } = await supabase
            .from("official_tuition_credits")
            .update({ status: "active", cancelled_at: null, cancelled_by: null, updated_at: now })
            .eq("student_id", String(row.student_id))
            .in("source_session_key", activeCancellationKeys)
            .eq("status", "cancelled");
          if (creditError) creditWarning = creditError.message;
        }
      }
    }
  }

  return NextResponse.json(
    { ok: true, adjustment: data, creditWarning: creditWarning || undefined },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Server-Timing": `total;dur=${(performance.now() - started).toFixed(1)}`,
      },
    },
  );
}
