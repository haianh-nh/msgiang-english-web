import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { addMonthsToMonth, buildEnrollmentTuitionPreview, monthKeyFromDate, normalizeMonthKey, validDateText } from "@/lib/tuition-enrollment";

function isMissingRpc(error: any) {
  const text = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  return text.includes("pgrst202") || text.includes("could not find the function") || text.includes("does not exist");
}

function studentPayload(data: any) {
  return {
    id: data.id,
    name: data.name,
    contact: [data.parent_phone, data.note].filter(Boolean).join(" • ") || "Chưa có",
    parentName: data.parent_name || "",
    parentPhone: data.parent_phone || "",
    note: data.note || "",
    enrollmentStartDate: data.enrollment_start_date || "",
    tuitionRegularStartMonth: data.tuition_regular_start_month || "",
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const started = performance.now();
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền thêm học sinh" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Thiếu tên học sinh" }, { status: 400 });

  const tuitionEnrollment = body.tuitionEnrollment && typeof body.tuitionEnrollment === "object"
    ? body.tuitionEnrollment
    : null;
  const tuitionEnabled = !!tuitionEnrollment?.enabled;

  let preview: any = null;
  if (tuitionEnabled) {
    try {
      preview = await buildEnrollmentTuitionPreview({
        classId: id,
        startDate: tuitionEnrollment.startDate,
        firstSessionKey: tuitionEnrollment.firstSessionKey,
        targetMonth: tuitionEnrollment.targetMonth,
      });
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || "Không tính được học phí phát sinh" }, { status: 400 });
    }
    if (!preview.sessionCount) {
      return NextResponse.json({ error: "Không còn buổi học hợp lệ trong tháng phát sinh. Hãy tắt khoản phát sinh hoặc chọn ngày khác." }, { status: 400 });
    }
  }

  const enrollmentStartDate = validDateText(tuitionEnrollment?.startDate) || null;
  const defaultRegularMonth = enrollmentStartDate ? addMonthsToMonth(monthKeyFromDate(enrollmentStartDate), 1) : "";
  const requestedRegularMonth = normalizeMonthKey(tuitionEnrollment?.targetMonth) || defaultRegularMonth;
  const regularStartMonth = tuitionEnrollment ? (tuitionEnabled ? preview.targetMonth : requestedRegularMonth) : null;
  const supabase = supabaseAdmin();
  const adjustmentInput = tuitionEnabled
    ? {
        enabled: true,
        sourceMonth: preview.sourceMonth,
        targetMonth: preview.targetMonth,
        firstSessionKey: preview.firstSessionKey,
        sessionCount: preview.sessionCount,
        unitPrice: preview.unitPrice,
        sessionDates: preview.sessions,
        note: `Học phí phát sinh học sinh mới từ ${preview.startDate}`,
      }
    : null;

  const rpcStarted = performance.now();
  const { data: rpcData, error: rpcError } = await supabase.rpc("official_add_student_with_prorated_tuition", {
    p_class_id: id,
    p_name: name,
    p_parent_phone: body.parentPhone || body.parent_phone || null,
    p_parent_name: body.parentName || body.parent_name || null,
    p_contact: body.contact || null,
    p_note: body.note || null,
    p_enrollment_start_date: enrollmentStartDate,
    p_regular_start_month: regularStartMonth,
    p_adjustment: adjustmentInput,
    p_actor: user.id,
  });
  const rpcDuration = performance.now() - rpcStarted;

  if (!rpcError && rpcData?.student) {
    return NextResponse.json(
      {
        ok: true,
        mode: "rpc-enrollment",
        student: studentPayload(rpcData.student),
        tuitionAdjustment: rpcData.adjustment || null,
        tuitionPreview: preview,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "Server-Timing": `rpc;dur=${rpcDuration.toFixed(1)},total;dur=${(performance.now() - started).toFixed(1)}`,
        },
      },
    );
  }

  if (rpcError && (!isMissingRpc(rpcError) || tuitionEnabled)) {
    const message = isMissingRpc(rpcError) && tuitionEnabled
      ? "Chưa chạy migration 020 nên không thể tạo khoản học phí phát sinh an toàn."
      : rpcError.message;
    return NextResponse.json({ error: message }, { status: isMissingRpc(rpcError) ? 409 : 500 });
  }

  // Safe legacy fallback only when no tuition adjustment was requested.
  const { data, error } = await supabase
    .from("official_students")
    .insert({
      class_id: id,
      name,
      parent_phone: body.parentPhone || body.parent_phone || null,
      parent_name: body.parentName || body.parent_name || null,
      contact: body.contact || null,
      note: body.note || null,
      status: "active",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { ok: true, mode: "legacy", student: studentPayload(data), tuitionAdjustment: null },
    { headers: { "Server-Timing": `total;dur=${(performance.now() - started).toFixed(1)}` } },
  );
}
