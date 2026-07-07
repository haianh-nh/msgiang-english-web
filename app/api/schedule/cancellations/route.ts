import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";

function monthKeyFromDate(dateValue: any) {
  const s = String(dateValue || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.slice(0, 7) : new Date().toISOString().slice(0, 7);
}

function addMonthsToMonth(monthKey: string, offset: number) {
  const [y, m] = String(monthKey).split("-").map(Number);
  const d = new Date(Date.UTC(y, (m || 1) - 1 + offset, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function safeText(v: any, fallback = "") {
  const s = String(v || fallback || "").trim();
  return s.slice(0, 500);
}

function creditId(studentId: string, sessionKey: string) {
  return `credit_${Buffer.from(`${studentId}|${sessionKey}`).toString("base64url").slice(0, 44)}`;
}

function makeupAttendanceSessionKey(row: any) {
  const start = String(row.start_time || "").slice(0, 5);
  const end = String(row.end_time || "").slice(0, 5);
  return `${row.class_id}|${row.makeup_date}|${row.day_key}|${start}-${end}`;
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  // V20O: Cho nghỉ lớp ảnh hưởng học phí tháng sau, chỉ Admin/Quản lí được thao tác.
  if (!canManage(user)) return NextResponse.json({ error: "Chỉ Admin/Quản lí được cho nghỉ lớp" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const sessionKey = String(body.sessionKey || "");
  if (!sessionKey) return NextResponse.json({ error: "Thiếu sessionKey" }, { status: 400 });

  const classId = String(body.classId || "");
  const sessionDate = String(body.date || "");
  const sourceMonth = monthKeyFromDate(sessionDate);
  const targetMonth = addMonthsToMonth(sourceMonth, 1);
  const reason = safeText(body.reason, "Trung tâm cho nghỉ lớp");
  const supabase = supabaseAdmin();
  const settings = await getSettings();
  const unitPrice = Math.max(0, Math.round(Number(settings.tuition_per_session || 70000)));

  const { data, error } = await supabase
    .from("official_session_cancellations")
    .upsert({
      session_key: sessionKey,
      class_id: classId || body.classId,
      session_date: body.date,
      day_key: body.day,
      start_time: body.start,
      end_time: body.end,
      reason,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // V20O: tạo credit tháng sau cho từng học sinh chính thức đang active tại thời điểm cho nghỉ.
  const { data: students, error: studentError } = await supabase
    .from("official_students")
    .select("id,name,status")
    .eq("class_id", classId)
    .or("status.is.null,status.neq.inactive");

  if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 });

  const creditRows = (students || []).map((s: any) => ({
    id: creditId(String(s.id), sessionKey),
    student_id: String(s.id),
    class_id: classId,
    source_session_key: sessionKey,
    source_month: sourceMonth,
    target_month: targetMonth,
    amount: unitPrice,
    reason: `Trung tâm cho nghỉ lớp ngày ${sessionDate}${reason ? `: ${reason}` : ""}`,
    status: "active",
    created_by: user.id,
    cancelled_at: null,
    cancelled_by: null,
    updated_at: new Date().toISOString(),
  }));

  if (creditRows.length) {
    const { error: creditError } = await supabase
      .from("official_tuition_credits")
      .upsert(creditRows, { onConflict: "student_id,source_session_key" });

    if (creditError) return NextResponse.json({ error: creditError.message || "Không tạo được khấu trừ học phí tháng sau" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    cancellation: {
      sessionKey: data.session_key,
      classId: data.class_id,
      date: data.session_date,
      day: data.day_key,
      start: String(data.start_time || "").slice(0, 5),
      end: String(data.end_time || "").slice(0, 5),
      reason: data.reason,
      createdAt: data.created_at,
      creditTargetMonth: targetMonth,
      creditsCreated: creditRows.length,
      creditAmountPerStudent: unitPrice,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Chỉ Admin/Quản lí được mở lại buổi học" }, { status: 403 });

  const url = new URL(req.url);
  const sessionKey = url.searchParams.get("sessionKey") || "";
  if (!sessionKey) return NextResponse.json({ error: "Thiếu sessionKey" }, { status: 400 });

  const supabase = supabaseAdmin();

  const { data: makeupRows, error: makeupFindError } = await supabase
    .from("official_class_makeup_sessions")
    .select("id, class_id, source_session_key, makeup_date, day_key, start_time, end_time, status")
    .eq("source_session_key", sessionKey)
    .neq("status", "cancelled");

  if (makeupFindError) return NextResponse.json({ error: makeupFindError.message }, { status: 500 });

  const activeMakeups = makeupRows || [];
  if (activeMakeups.length) {
    const attendanceKeys = activeMakeups.map(makeupAttendanceSessionKey).filter(Boolean);

    if (attendanceKeys.length) {
      const { data: attended, error: attError } = await supabase
        .from("official_attendance_sessions")
        .select("session_key, saved")
        .in("session_key", attendanceKeys)
        .eq("saved", true)
        .limit(1);

      if (attError) return NextResponse.json({ error: attError.message }, { status: 500 });
      if ((attended || []).length) {
        return NextResponse.json({
          error: "Buổi dạy bù này đã có điểm danh, không thể mở lại buổi nghỉ."
        }, { status: 409 });
      }
    }

    const { error: makeupCancelError } = await supabase
      .from("official_class_makeup_sessions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("source_session_key", sessionKey)
      .neq("status", "cancelled");

    if (makeupCancelError) return NextResponse.json({ error: makeupCancelError.message }, { status: 500 });
  }

  const { error } = await supabase.from("official_session_cancellations").delete().eq("session_key", sessionKey);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // V20O: mở lại buổi nghỉ phải hủy credit tháng sau phát sinh từ buổi đó.
  const { error: creditCancelError } = await supabase
    .from("official_tuition_credits")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("source_session_key", sessionKey)
    .eq("status", "active");

  if (creditCancelError) return NextResponse.json({ error: creditCancelError.message || "Không hủy được khấu trừ học phí" }, { status: 500 });

  return NextResponse.json({
    ok: true,
    reopened: true,
    sessionKey,
    cancelledClassMakeups: activeMakeups.map((r:any)=>r.id),
  });
}
