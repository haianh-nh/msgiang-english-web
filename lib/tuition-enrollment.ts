import { supabaseAdmin } from "./supabase";
import { getSettings } from "./settings";

const DAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function normalizeMonthKey(value: unknown) {
  const s = String(value || "").trim();
  return /^\d{4}-\d{2}$/.test(s) ? s : "";
}

export function validDateText(value: unknown) {
  const s = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

export function monthKeyFromDate(dateText: string) {
  return validDateText(dateText) ? dateText.slice(0, 7) : "";
}

export function addMonthsToMonth(monthKey: string, offset: number) {
  const normalized = normalizeMonthKey(monthKey);
  if (!normalized) return "";
  const [year, month] = normalized.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function vietnamTodayText() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function monthStart(monthKey: string) {
  return `${monthKey}-01`;
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

function hhmm(value: unknown) {
  return String(value || "").slice(0, 5);
}

function sessionKey(classId: string, date: string, dayKey: string, start: string, end: string) {
  return `${classId}|${date}|${dayKey}|${start}-${end}`;
}

export type EnrollmentSession = {
  sessionKey: string;
  date: string;
  day: string;
  start: string;
  end: string;
};

export type EnrollmentTuitionPreview = {
  classId: string;
  className: string;
  startDate: string;
  sourceMonth: string;
  targetMonth: string;
  minimumTargetMonth: string;
  firstSessionKey: string;
  sessions: EnrollmentSession[];
  availableSessions: EnrollmentSession[];
  sessionCount: number;
  unitPrice: number;
  amount: number;
};

export async function buildEnrollmentTuitionPreview(input: {
  classId: string;
  startDate?: string;
  firstSessionKey?: string;
  targetMonth?: string;
}): Promise<EnrollmentTuitionPreview> {
  const classId = String(input.classId || "").trim();
  if (!classId) throw new Error("Thiếu lớp học");

  const startDate = validDateText(input.startDate) || vietnamTodayText();
  const sourceMonth = monthKeyFromDate(startDate);
  const minimumTargetMonth = addMonthsToMonth(sourceMonth, 1);
  const targetMonth = normalizeMonthKey(input.targetMonth) || minimumTargetMonth;
  if (!targetMonth || targetMonth < minimumTargetMonth) {
    throw new Error(`Tháng thu phải từ ${minimumTargetMonth} trở đi`);
  }

  const supabase = supabaseAdmin();
  const [classResult, cancellationResult, settings] = await Promise.all([
    supabase
      .from("official_classes")
      .select("id,name,status,start_date,end_date, official_class_schedules(id,day_of_week,start_time,end_time,sort_order)")
      .eq("id", classId)
      .maybeSingle(),
    supabase
      .from("official_session_cancellations")
      .select("session_key,session_date,start_time,end_time")
      .eq("class_id", classId)
      .gte("session_date", monthStart(sourceMonth))
      .lt("session_date", nextMonthStart(sourceMonth)),
    getSettings(),
  ]);

  if (classResult.error) throw classResult.error;
  if (!classResult.data) throw new Error("Không tìm thấy lớp học");
  if (String(classResult.data.status || "active").toLowerCase() === "ended") {
    throw new Error("Lớp đã kết thúc, không thể thêm học sinh");
  }
  if (cancellationResult.error) throw cancellationResult.error;

  const klass: any = classResult.data;
  const classStart = validDateText(klass.start_date) || monthStart(sourceMonth);
  const classEnd = validDateText(klass.end_date) || "";
  const schedules = Array.isArray(klass.official_class_schedules)
    ? [...klass.official_class_schedules].sort((a: any, b: any) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    : [];

  const cancelledKeys = new Set<string>();
  const cancelledSlots = new Set<string>();
  for (const row of cancellationResult.data || []) {
    cancelledKeys.add(String(row.session_key || ""));
    cancelledSlots.add(`${row.session_date}|${hhmm(row.start_time)}|${hhmm(row.end_time)}`);
  }

  const availableSessions: EnrollmentSession[] = [];
  const fromDate = [startDate, classStart, monthStart(sourceMonth)].sort().at(-1) || startDate;
  const untilExclusive = nextMonthStart(sourceMonth);

  for (let date = fromDate; date < untilExclusive; date = addDays(date, 1)) {
    if (classEnd && date > classEnd) break;
    const dow = dayOfWeek(date);
    const dayKey = DAY_KEYS[dow] || "Mon";
    for (const schedule of schedules) {
      if (Number(schedule.day_of_week) !== dow) continue;
      const start = hhmm(schedule.start_time);
      const end = hhmm(schedule.end_time);
      if (!start || !end || start >= end) continue;
      const key = sessionKey(classId, date, dayKey, start, end);
      if (cancelledKeys.has(key) || cancelledSlots.has(`${date}|${start}|${end}`)) continue;
      availableSessions.push({ sessionKey: key, date, day: dayKey, start, end });
    }
  }

  availableSessions.sort((a, b) => `${a.date}|${a.start}|${a.end}`.localeCompare(`${b.date}|${b.start}|${b.end}`));
  const requestedFirst = String(input.firstSessionKey || "").trim();
  const selectedIndex = requestedFirst
    ? availableSessions.findIndex((item) => item.sessionKey === requestedFirst)
    : 0;
  if (requestedFirst && selectedIndex < 0) throw new Error("Buổi đầu tiên không còn hợp lệ. Vui lòng tải lại danh sách buổi học.");

  const startIndex = Math.max(0, selectedIndex);
  const sessions = availableSessions.slice(startIndex);
  const unitPrice = Math.max(0, Math.round(Number(settings.tuition_per_session || 70000)));

  return {
    classId,
    className: String(klass.name || ""),
    startDate,
    sourceMonth,
    targetMonth,
    minimumTargetMonth,
    firstSessionKey: sessions[0]?.sessionKey || "",
    sessions,
    availableSessions,
    sessionCount: sessions.length,
    unitPrice,
    amount: sessions.length * unitPrice,
  };
}
