import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function normalizeMonth(v: string | null) {
  const m = String(v || "").match(/^\d{4}-\d{2}$/);
  return m ? m[0] : currentMonthKey();
}

function nextMonthStart(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
}

function monthStart(monthKey: string) {
  return `${monthKey}-01`;
}

function monthFromDate(dateValue: string) {
  return String(dateValue || "").slice(0, 7);
}

function emptyRollup() {
  return { present: 0, late: 0, makeup: 0, absent: 0, excused: 0, billable: 0, currentAmount: 0 };
}

function addRowToRollup(target: any, row: any) {
  if (row.row_type === "official") {
    if (row.status === "present") target.present += 1;
    if (row.status === "late") target.late += 1;
    if (row.status === "absent") target.absent += 1;
  } else if (row.row_type === "makeup" || row.row_type === "manual_makeup") {
    if (row.status === "present" || row.status === "late") target.makeup += 1;
  }
}

function finalizeRollup(r: any, unitPrice: number) {
  r.billable = r.present + r.late + r.makeup;
  r.currentAmount = r.billable * unitPrice;
  return r;
}

export async function GET(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền xem học phí" }, { status: 403 });

  const monthKey = normalizeMonth(new URL(req.url).searchParams.get("month"));
  const start = monthStart(monthKey);
  const end = nextMonthStart(monthKey);

  const supabase = supabaseAdmin();
  const settings = await getSettings();
  const unitPrice = Number(settings.tuition_per_session || 70000);

  // 1) Attendance rows in the selected month.
  const { data: selectedSessions, error: se } = await supabase
    .from("official_attendance_sessions")
    .select("session_key, session_date, saved")
    .eq("saved", true)
    .gte("session_date", start)
    .lt("session_date", end);

  if (se) return NextResponse.json({ error: se.message }, { status: 500 });

  const selectedKeys = (selectedSessions || []).map((s: any) => s.session_key);
  const selectedDateByKey = new Map((selectedSessions || []).map((s: any) => [s.session_key, s.session_date]));

  let selectedRows: any[] = [];
  if (selectedKeys.length) {
    const { data: r, error: re } = await supabase
      .from("official_attendance_rows")
      .select("*")
      .in("session_key", selectedKeys);
    if (re) return NextResponse.json({ error: re.message }, { status: 500 });
    selectedRows = r || [];
  }

  const rollups: Record<string, any> = {};
  for (const r of selectedRows) {
    const id = String(r.student_id);
    rollups[id] ||= emptyRollup();
    addRowToRollup(rollups[id], r);
  }

  for (const id of Object.keys(rollups)) {
    finalizeRollup(rollups[id], unitPrice);
  }

  // 2) Previous unpaid debt before selected month.
  const { data: prevSessions, error: pe } = await supabase
    .from("official_attendance_sessions")
    .select("session_key, session_date, saved")
    .eq("saved", true)
    .lt("session_date", start);

  if (pe) return NextResponse.json({ error: pe.message }, { status: 500 });

  const prevKeys = (prevSessions || []).map((s: any) => s.session_key);
  const prevDateByKey = new Map((prevSessions || []).map((s: any) => [s.session_key, s.session_date]));

  let prevRows: any[] = [];
  if (prevKeys.length) {
    const { data: r, error: pre } = await supabase
      .from("official_attendance_rows")
      .select("*")
      .in("session_key", prevKeys);
    if (pre) return NextResponse.json({ error: pre.message }, { status: 500 });
    prevRows = r || [];
  }

  const previousByStudentMonth: Record<string, Record<string, any>> = {};
  for (const r of prevRows) {
    const id = String(r.student_id);
    const sessionDate = String(prevDateByKey.get(r.session_key) || "");
    const mk = monthFromDate(sessionDate);
    if (!mk) continue;
    previousByStudentMonth[id] ||= {};
    previousByStudentMonth[id][mk] ||= emptyRollup();
    addRowToRollup(previousByStudentMonth[id][mk], r);
  }

  const priorMonths = Array.from(
    new Set(Object.values(previousByStudentMonth).flatMap((m: any) => Object.keys(m)))
  ).filter((m) => m < monthKey);

  let priorStatusRows: any[] = [];
  if (priorMonths.length) {
    const { data: st, error: ste } = await supabase
      .from("official_tuition_status")
      .select("*")
      .in("month_key", priorMonths);
    if (ste) return NextResponse.json({ error: ste.message }, { status: 500 });
    priorStatusRows = st || [];
  }

  const paidPrior = new Set(
    priorStatusRows
      .filter((s: any) => !!s.paid)
      .map((s: any) => `${s.month_key}_${s.student_id}`)
  );

  for (const studentId of Object.keys(previousByStudentMonth)) {
    let previousDebt = 0;
    const arrearsMonths: any[] = [];
    for (const mk of Object.keys(previousByStudentMonth[studentId]).sort()) {
      if (mk >= monthKey) continue;
      const base = finalizeRollup(previousByStudentMonth[studentId][mk], unitPrice);
      if (!base.billable || base.currentAmount <= 0) continue;
      const statusKey = `${mk}_${studentId}`;
      if (paidPrior.has(statusKey)) continue;
      previousDebt += base.currentAmount;
      arrearsMonths.push({
        monthKey: mk,
        amount: base.currentAmount,
        billable: base.billable,
        present: base.present,
        late: base.late,
        makeup: base.makeup,
        absent: base.absent,
      });
    }

    if (previousDebt > 0) {
      rollups[studentId] ||= finalizeRollup(emptyRollup(), unitPrice);
      rollups[studentId].previousDebt = previousDebt;
      rollups[studentId].arrearsMonths = arrearsMonths;
    }
  }

  for (const id of Object.keys(rollups)) {
    rollups[id].previousDebt = Number(rollups[id].previousDebt || 0);
    rollups[id].currentAmount = Number(rollups[id].currentAmount || rollups[id].billable * unitPrice || 0);
    rollups[id].amount = rollups[id].currentAmount + rollups[id].previousDebt;
  }

  // 3) Statuses in selected month for buttons / sent state.
  const { data: statuses, error: te } = await supabase
    .from("official_tuition_status")
    .select("*")
    .eq("month_key", monthKey);

  if (te) return NextResponse.json({ error: te.message }, { status: 500 });

  const payments: Record<string, any> = {};
  const tuitionMessages: Record<string, any> = {};
  for (const s of statuses || []) {
    const key = `${monthKey}_${s.student_id}`;
    if (s.paid) payments[key] = { paid: true, at: s.paid_at, by: s.paid_by };
    if (s.message_sent) tuitionMessages[key] = { sent: true, at: s.message_sent_at, by: s.message_sent_by };
  }

  return NextResponse.json({
    ok: true,
    monthKey,
    unitPrice,
    rollups,
    payments,
    tuitionMessages,
  });
}
