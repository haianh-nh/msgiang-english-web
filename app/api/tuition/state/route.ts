import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";

function currentMonthKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}`;
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
  const candidates = [snap.amount, snap.total, snap.totalDue, snap.currentAmount];
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
    adjustmentAmount: 0,
    adjustmentItems: [],
    creditAmount: 0,
    creditItems: [],
    currentAmount: 0,
    previousDebt: 0,
    amount: 0,
    arrearsMonths: [],
    billingEligible: true,
    regularStartMonth: "",
  };
}

function countPlannedSessionsForClass(klass: any, monthKey: string) {
  const start = monthStart(monthKey);
  const end = nextMonthStart(monthKey);
  const classStart = validDateText(klass?.start_date) || start;
  const classEnd = validDateText(klass?.end_date) || "";
  const schedules = Array.isArray(klass?.official_class_schedules) ? klass.official_class_schedules : [];
  const days = new Set(
    schedules
      .map((s: any) => Number(s.day_of_week))
      .filter((n: number) => Number.isFinite(n) && n >= 0 && n <= 6),
  );
  if (!days.size) return 0;

  let count = 0;
  for (let d = start; d < end; d = addDays(d, 1)) {
    if (d < classStart) continue;
    if (classEnd && d > classEnd) continue;
    if (days.has(dayOfWeek(d))) count += schedules.filter((s: any) => Number(s.day_of_week) === dayOfWeek(d)).length;
  }
  return count;
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
  r.adjustmentAmount = Math.max(0, Number(r.adjustmentAmount || 0));
  r.creditAmount = Math.max(0, Number(r.creditAmount || 0));
  r.currentAmount = Math.max(0, r.tuitionAmount + r.materialFee + r.adjustmentAmount - r.creditAmount);
  r.previousDebt = Math.max(0, Number(r.previousDebt || 0));
  r.amount = Math.max(0, r.currentAmount + r.previousDebt);
  return r;
}

export async function GET(req: NextRequest) {
  const started = performance.now();
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền xem học phí" }, { status: 403 });

  const monthKey = normalizeMonth(new URL(req.url).searchParams.get("month"));
  const supabase = supabaseAdmin();
  const settings = await getSettings();
  const unitPrice = Number(settings.tuition_per_session || 70000);

  const queryStarted = performance.now();
  const [classResult, statusResult, creditResult, priorResult, adjustmentResult] = await Promise.all([
    supabase
      .from("official_classes")
      .select("id,name,status,start_date,end_date, official_students(*), official_class_schedules(id,day_of_week,start_time,end_time,sort_order)")
      .order("name", { ascending: true }),
    supabase
      .from("official_tuition_status")
      .select("student_id, month_key, paid, paid_at, paid_by, message_sent, message_sent_at, message_sent_by, material_fee, material_note, material_updated_at, material_updated_by, snapshot")
      .eq("month_key", monthKey),
    supabase
      .from("official_tuition_credits")
      .select("id, student_id, class_id, source_session_key, source_month, target_month, amount, reason, status, created_at")
      .eq("target_month", monthKey)
      .eq("status", "active"),
    supabase
      .from("official_tuition_status")
      .select("student_id, month_key, paid, message_sent, material_fee, material_note, snapshot")
      .lt("month_key", monthKey)
      .neq("paid", true),
    supabase
      .from("official_tuition_adjustments")
      .select("id,student_id,class_id,adjustment_type,source_month,target_month,enrollment_start_date,first_session_key,session_dates,session_count,unit_price,amount,note,status,created_at,updated_at")
      .eq("target_month", monthKey)
      .in("status", ["pending", "included"]),
  ]);
  const queryDuration = performance.now() - queryStarted;

  if (classResult.error) return NextResponse.json({ error: classResult.error.message }, { status: 500 });
  if (statusResult.error) return NextResponse.json({ error: statusResult.error.message }, { status: 500 });
  if (creditResult.error) return NextResponse.json({ error: creditResult.error.message || "Không tải được khấu trừ học phí" }, { status: 500 });
  if (priorResult.error) return NextResponse.json({ error: priorResult.error.message }, { status: 500 });
  if (adjustmentResult.error) {
    const missingText = `${adjustmentResult.error.code || ""} ${adjustmentResult.error.message || ""}`.toLowerCase();
    const missing = missingText.includes("pgrst205") || missingText.includes("does not exist") || missingText.includes("could not find the table") || missingText.includes("schema cache");
    if (!missing) return NextResponse.json({ error: adjustmentResult.error.message }, { status: 500 });
  }

  const classes = classResult.data || [];
  const monthClasses = classes.filter((c: any) => isClassInMonth(c, monthKey));
  const statuses = statusResult.data || [];
  const credits = creditResult.data || [];
  const priorStatuses = priorResult.data || [];
  const adjustments = adjustmentResult.error ? [] : adjustmentResult.data || [];

  const payments: Record<string, any> = {};
  const tuitionMessages: Record<string, any> = {};
  const currentStatusByStudent = new Map<string, any>();
  for (const s of statuses) {
    const sid = String(s.student_id);
    const key = `${monthKey}_${sid}`;
    currentStatusByStudent.set(sid, s);
    if (s.paid) payments[key] = { paid: true, at: s.paid_at, by: s.paid_by };
    if (s.message_sent) tuitionMessages[key] = { sent: true, at: s.message_sent_at, by: s.message_sent_by };
  }

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

  const adjustmentByStudent: Record<string, { total: number; items: any[] }> = {};
  for (const item of adjustments) {
    const sid = String(item.student_id);
    const amount = Math.max(0, Math.round(Number(item.amount || 0)));
    adjustmentByStudent[sid] ||= { total: 0, items: [] };
    adjustmentByStudent[sid].total += amount;
    adjustmentByStudent[sid].items.push({
      id: item.id,
      type: item.adjustment_type,
      sourceMonth: item.source_month,
      targetMonth: item.target_month,
      enrollmentStartDate: item.enrollment_start_date,
      firstSessionKey: item.first_session_key,
      sessionDates: item.session_dates || [],
      sessionCount: Number(item.session_count || 0),
      unitPrice: Number(item.unit_price || 0),
      amount,
      note: item.note || "",
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  const previousDebtByStudent: Record<string, { total: number; months: any[] }> = {};
  for (const row of priorStatuses) {
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
      adjustmentAmount: Number(row.snapshot?.adjustmentAmount || 0),
      materialFee: materialAmount(row),
      creditAmount: Number(row.snapshot?.creditAmount || 0),
      plannedSessions: Number(row.snapshot?.plannedSessions || 0),
      materialNote: row.material_note || "",
    });
  }

  const rollups: Record<string, any> = {};
  for (const klass of monthClasses) {
    const classPlannedSessions = countPlannedSessionsForClass(klass, monthKey);
    const students = (klass.official_students || []).filter((s: any) => String(s.status || "active") !== "inactive");

    for (const st of students) {
      const sid = String(st.id);
      const status = currentStatusByStudent.get(sid);
      const regularStartMonth = String(st.tuition_regular_start_month || "");
      const billingEligible = !regularStartMonth || monthKey >= regularStartMonth;
      const r = emptyRollup();
      r.billingEligible = billingEligible;
      r.regularStartMonth = regularStartMonth;
      r.plannedSessions = billingEligible ? classPlannedSessions : 0;
      r.unitPrice = unitPrice;
      r.materialFee = materialAmount(status);
      r.materialNote = String(status?.material_note || "");
      r.materialUpdatedAt = status?.material_updated_at || null;
      r.materialUpdatedBy = status?.material_updated_by || null;
      r.adjustmentAmount = adjustmentByStudent[sid]?.total || 0;
      r.adjustmentItems = adjustmentByStudent[sid]?.items || [];
      r.creditAmount = creditByStudent[sid]?.total || 0;
      r.creditItems = creditByStudent[sid]?.items || [];
      r.previousDebt = previousDebtByStudent[sid]?.total || 0;
      r.arrearsMonths = (previousDebtByStudent[sid]?.months || []).sort((a, b) => String(a.monthKey).localeCompare(String(b.monthKey)));
      rollups[sid] = finalizeRollup(r);
    }
  }

  for (const [sid, status] of currentStatusByStudent.entries()) {
    if (rollups[sid]) continue;
    const r = emptyRollup();
    r.unitPrice = unitPrice;
    r.materialFee = materialAmount(status);
    r.materialNote = String(status?.material_note || "");
    r.adjustmentAmount = adjustmentByStudent[sid]?.total || 0;
    r.adjustmentItems = adjustmentByStudent[sid]?.items || [];
    r.creditAmount = creditByStudent[sid]?.total || 0;
    r.creditItems = creditByStudent[sid]?.items || [];
    r.previousDebt = previousDebtByStudent[sid]?.total || 0;
    r.arrearsMonths = previousDebtByStudent[sid]?.months || [];
    rollups[sid] = finalizeRollup(r);
  }

  return NextResponse.json(
    {
      ok: true,
      monthKey,
      unitPrice,
      tuitionMode: "prepaid_monthly_with_adjustments",
      rollups,
      payments,
      tuitionMessages,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Server-Timing": `queries;dur=${queryDuration.toFixed(1)},total;dur=${(performance.now() - started).toFixed(1)}`,
      },
    },
  );
}
