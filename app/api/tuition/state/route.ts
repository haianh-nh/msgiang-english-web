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

function monthStart(monthKey: string) {
  return `${monthKey}-01`;
}

function addMonthsToMonth(monthKey: string, offset: number) {
  const [y, m] = String(monthKey).split("-").map(Number);
  const d = new Date(Date.UTC(y, (m || 1) - 1 + offset, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nextMonthStart(monthKey: string) {
  return `${addMonthsToMonth(monthKey, 1)}-01`;
}

function addDays(dateText: string, days: number) {
  const d = new Date(`${dateText}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayOfWeek(dateText: string) {
  return new Date(`${dateText}T00:00:00Z`).getUTCDay();
}

function validDateText(v: any) {
  const s = String(v || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

function materialAmount(row: any) {
  const n = Number(row?.material_fee || 0);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function snapshotAmount(row: any) {
  const snap = row?.snapshot || {};
  const candidates = [
    snap.amount,
    snap.total,
    snap.totalDue,
    snap.currentAmount,
  ];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  const material = materialAmount(row);
  return material > 0 ? material : 0;
}

function emptyRollup(): any {
  return {
    present: 0,
    late: 0,
    makeup: 0,
    absent: 0,
    excused: 0,
    billable: 0,
    plannedSessions: 0,
    unitPrice: 0,
    tuitionAmount: 0,
    materialFee: 0,
    materialNote: "",
    materialUpdatedAt: null,
    materialUpdatedBy: null,
    creditAmount: 0,
    creditItems: [],
    currentAmount: 0,
    previousDebt: 0,
    amount: 0,
    arrearsMonths: [],
  };
}

function countPlannedSessionsForClass(klass: any, monthKey: string) {
  const start = monthStart(monthKey);
  const end = nextMonthStart(monthKey);
  const classStart = validDateText(klass?.start_date) || start;
  const classEnd = validDateText(klass?.end_date) || "";
  const schedules = Array.isArray(klass?.official_class_schedules) ? klass.official_class_schedules : [];
  const days = new Set(schedules.map((s: any) => Number(s.day_of_week)).filter((n: number) => Number.isFinite(n) && n >= 0 && n <= 6));
  if (!days.size) return 0;

  let count = 0;
  for (let d = start; d < end; d = addDays(d, 1)) {
    if (d < classStart) continue;
    if (classEnd && d > classEnd) continue;
    if (days.has(dayOfWeek(d))) count += 1;
  }
  return count;
}

function buildClassStudentRows(classes: any[] = []) {
  const rows: any[] = [];
  for (const c of classes || []) {
    const plannedSessions = countPlannedSessionsForClass(c, "");
    const students = (c.official_students || []).filter((s: any) => String(s.status || "active") !== "inactive");
    for (const s of students) rows.push({ klass: c, student: s, plannedSessions });
  }
  return rows;
}

function isClassInMonth(c: any, monthKey: string) {
  const start = monthStart(monthKey);
  const end = nextMonthStart(monthKey);
  const classStart = validDateText(c?.start_date) || "1900-01-01";
  const classEnd = validDateText(c?.end_date) || "";
  const status = String(c?.status || "active").toLowerCase();
  if (status === "ended" && classEnd && classEnd < start) return false;
  if (classStart >= end) return false;
  return true;
}

function finalizeRollup(r: any) {
  r.plannedSessions = Number(r.plannedSessions || 0);
  r.unitPrice = Number(r.unitPrice || 0);
  r.billable = r.plannedSessions;
  r.tuitionAmount = Math.max(0, r.plannedSessions * r.unitPrice);
  r.materialFee = Number(r.materialFee || 0);
  r.creditAmount = Math.max(0, Number(r.creditAmount || 0));
  r.currentAmount = Math.max(0, r.tuitionAmount + r.materialFee - r.creditAmount);
  r.previousDebt = Math.max(0, Number(r.previousDebt || 0));
  r.amount = Math.max(0, r.currentAmount + r.previousDebt);
  return r;
}

export async function GET(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền xem học phí" }, { status: 403 });

  const monthKey = normalizeMonth(new URL(req.url).searchParams.get("month"));
  const supabase = supabaseAdmin();
  const settings = await getSettings();
  const unitPrice = Number(settings.tuition_per_session || 70000);

  // V20O: học phí thu trước theo tháng. Nền tính tiền là lịch dự kiến của lớp, không phải số buổi đã điểm danh.
  const { data: classes, error: classError } = await supabase
    .from("official_classes")
    .select("id,name,status,start_date,end_date, official_students(id,name,parent_name,parent_phone,note,status), official_class_schedules(id,day_of_week,start_time,end_time,sort_order)")
    .order("name", { ascending: true });

  if (classError) return NextResponse.json({ error: classError.message }, { status: 500 });

  const monthClasses = (classes || []).filter((c: any) => isClassInMonth(c, monthKey));

  // 1) Statuses/material fees in selected month.
  const { data: statuses, error: statusError } = await supabase
    .from("official_tuition_status")
    .select("student_id, month_key, paid, paid_at, paid_by, message_sent, message_sent_at, message_sent_by, material_fee, material_note, material_updated_at, material_updated_by, snapshot")
    .eq("month_key", monthKey);

  if (statusError) return NextResponse.json({ error: statusError.message }, { status: 500 });

  const payments: Record<string, any> = {};
  const tuitionMessages: Record<string, any> = {};
  const currentStatusByStudent = new Map<string, any>();

  for (const s of statuses || []) {
    const sid = String(s.student_id);
    const key = `${monthKey}_${sid}`;
    currentStatusByStudent.set(sid, s);
    if (s.paid) payments[key] = { paid: true, at: s.paid_at, by: s.paid_by };
    if (s.message_sent) tuitionMessages[key] = { sent: true, at: s.message_sent_at, by: s.message_sent_by };
  }

  // 2) Active credits for this month. Created only when Admin/Manager cho nghỉ lớp in previous month.
  let credits: any[] = [];
  const { data: creditRows, error: creditError } = await supabase
    .from("official_tuition_credits")
    .select("id, student_id, class_id, source_session_key, source_month, target_month, amount, reason, status, created_at")
    .eq("target_month", monthKey)
    .eq("status", "active");

  if (creditError) {
    return NextResponse.json({ error: creditError.message || "Không tải được khấu trừ học phí" }, { status: 500 });
  }
  credits = creditRows || [];

  const creditByStudent: Record<string, { total: number; items: any[] }> = {};
  for (const c of credits) {
    const sid = String(c.student_id);
    const amount = Math.max(0, Math.round(Number(c.amount || 0)));
    creditByStudent[sid] ||= { total: 0, items: [] };
    creditByStudent[sid].total += amount;
    creditByStudent[sid].items.push({
      id: c.id,
      amount,
      classId: c.class_id,
      sourceSessionKey: c.source_session_key,
      sourceMonth: c.source_month,
      targetMonth: c.target_month,
      reason: c.reason || "",
      createdAt: c.created_at,
    });
  }

  // 3) Previous unpaid debt. To avoid silently charging old months that were never sent, only use rows that have snapshot/message/material.
  const { data: priorStatuses, error: priorError } = await supabase
    .from("official_tuition_status")
    .select("student_id, month_key, paid, message_sent, material_fee, material_note, snapshot")
    .lt("month_key", monthKey)
    .neq("paid", true);

  if (priorError) return NextResponse.json({ error: priorError.message }, { status: 500 });

  const previousDebtByStudent: Record<string, { total: number; months: any[] }> = {};
  for (const row of priorStatuses || []) {
    const hasCharge = !!row.snapshot || !!row.message_sent || materialAmount(row) > 0;
    if (!hasCharge) continue;
    const amount = snapshotAmount(row);
    if (amount <= 0) continue;
    const sid = String(row.student_id);
    previousDebtByStudent[sid] ||= { total: 0, months: [] };
    previousDebtByStudent[sid].total += amount;
    previousDebtByStudent[sid].months.push({
      monthKey: row.month_key,
      amount,
      tuitionAmount: Number(row.snapshot?.tuitionAmount || row.snapshot?.baseTuition || 0),
      materialFee: materialAmount(row),
      creditAmount: Number(row.snapshot?.creditAmount || 0),
      plannedSessions: Number(row.snapshot?.plannedSessions || 0),
      materialNote: row.material_note || "",
    });
  }

  const rollups: Record<string, any> = {};
  for (const klass of monthClasses) {
    const plannedSessions = countPlannedSessionsForClass(klass, monthKey);
    const students = (klass.official_students || []).filter((s: any) => String(s.status || "active") !== "inactive");

    for (const st of students) {
      const sid = String(st.id);
      const status = currentStatusByStudent.get(sid);
      const r = emptyRollup();
      r.plannedSessions = plannedSessions;
      r.unitPrice = unitPrice;
      r.materialFee = materialAmount(status);
      r.materialNote = String(status?.material_note || "");
      r.materialUpdatedAt = status?.material_updated_at || null;
      r.materialUpdatedBy = status?.material_updated_by || null;
      r.creditAmount = creditByStudent[sid]?.total || 0;
      r.creditItems = creditByStudent[sid]?.items || [];
      r.previousDebt = previousDebtByStudent[sid]?.total || 0;
      r.arrearsMonths = (previousDebtByStudent[sid]?.months || []).sort((a, b) => String(a.monthKey).localeCompare(String(b.monthKey)));
      rollups[sid] = finalizeRollup(r);
    }
  }

  // Keep material/status rows even if a student was just moved and not in monthClasses anymore.
  for (const [sid, status] of currentStatusByStudent.entries()) {
    if (rollups[sid]) continue;
    const r = emptyRollup();
    r.unitPrice = unitPrice;
    r.materialFee = materialAmount(status);
    r.materialNote = String(status?.material_note || "");
    r.creditAmount = creditByStudent[sid]?.total || 0;
    r.creditItems = creditByStudent[sid]?.items || [];
    r.previousDebt = previousDebtByStudent[sid]?.total || 0;
    r.arrearsMonths = previousDebtByStudent[sid]?.months || [];
    rollups[sid] = finalizeRollup(r);
  }

  return NextResponse.json({
    ok: true,
    monthKey,
    unitPrice,
    tuitionMode: "prepaid_monthly",
    rollups,
    payments,
    tuitionMessages,
  });
}
