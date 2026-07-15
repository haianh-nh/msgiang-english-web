import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { teacherForUser } from "@/lib/classes";

const SCORE_KEYS = ["Listening", "Speaking", "Reading", "Writing", "Vocabulary", "Participation", "Homework"];

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function normalizeMonthKey(v: any) {
  const s = String(v || "");
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\/(\d{4})$/);
  if (m) return `${m[2]}-${m[1]}`;
  return currentMonthKey();
}

function sanitizeScores(value: any) {
  const src = value && typeof value === "object" ? value : {};
  const scores: Record<string, number> = {};
  for (const k of SCORE_KEYS) {
    const n = Number(src[k] ?? 3);
    scores[k] = Math.max(1, Math.min(5, Number.isFinite(n) ? Math.round(n) : 3));
  }
  return scores;
}

function sanitizeText(v: any, max = 1200) {
  return String(v || "").trim().slice(0, max);
}

function toClientRow(row: any) {
  return {
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id,
    monthKey: row.month_key,
    month: row.month_key,
    scores: row.scores || {},
    status: row.status || "draft",
    comment: row.comment || "",
    strengths: row.strengths || "",
    improvements: row.improvements || "",
    suggestion: row.suggestion || "",
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    createdBy: row.created_by || "",
    updatedBy: row.updated_by || "",
  };
}


async function canAccessClass(user: any, classId: string) {
  if (canManage(user)) return true;
  const teacher = await teacherForUser(user);
  if (!teacher?.id) return false;
  const { data, error } = await supabaseAdmin()
    .from("official_classes")
    .select("id")
    .eq("id", classId)
    .or(`teacher_id.eq.${teacher.id},assistant_teacher_id.eq.${teacher.id}`)
    .maybeSingle();
  if (error) throw error;
  return !!data?.id;
}

async function accessibleClassIds(user: any) {
  const supabase = supabaseAdmin();

  if (canManage(user)) {
    const { data, error } = await supabase.from("official_classes").select("id");
    if (error) throw error;
    return (data || []).map((x: any) => x.id);
  }

  const teacher = await teacherForUser(user);
  if (!teacher?.id) return [];
  const { data, error } = await supabase
    .from("official_classes")
    .select("id")
    .or(`teacher_id.eq.${teacher.id},assistant_teacher_id.eq.${teacher.id}`);

  if (error) throw error;
  return (data || []).map((x: any) => x.id);
}

export async function GET(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  const month = new URL(req.url).searchParams.get("month");
  const monthKey = month ? normalizeMonthKey(month) : null;

  try {
    let query = supabaseAdmin()
      .from("official_evaluations")
      .select("id, student_id, class_id, month_key, scores, status, comment, strengths, improvements, suggestion, updated_at, published_at, created_by, updated_by")
      .order("updated_at", { ascending: false });

    if (monthKey) query = query.eq("month_key", monthKey);

    if (!canManage(user)) {
      const classIds = await accessibleClassIds(user);
      if (!classIds.length) return NextResponse.json({ ok: true, items: [] });
      query = query.in("class_id", classIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true, items: (data || []).map(toClientRow) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Không tải được đánh giá" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const studentId = String(body.studentId || "");
  const monthKey = normalizeMonthKey(body.monthKey || body.month);
  const status = String(body.status || "draft") === "published" ? "published" : "draft";

  if (!studentId) return NextResponse.json({ error: "Thiếu học sinh" }, { status: 400 });

  const supabase = supabaseAdmin();

  // Phase 7G: fetch the student and the current-month evaluation metadata in
  // one request. This removes the extra "does an evaluation already exist?"
  // round trip before every save/publish action.
  const { data: student, error: studentError } = await supabase
    .from("official_students")
    .select("id,class_id,name,official_evaluations(id,created_by,month_key)")
    .eq("id", studentId)
    .eq("official_evaluations.month_key", monthKey)
    .single();

  if (studentError || !student) return NextResponse.json({ error: "Không tìm thấy học sinh" }, { status: 404 });

  if (!(await canAccessClass(user, String(student.class_id)))) {
    return NextResponse.json({ error: "Không có quyền đánh giá học sinh này" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const patch: any = {
    student_id: student.id,
    class_id: student.class_id,
    month_key: monthKey,
    scores: sanitizeScores(body.scores),
    status,
    comment: sanitizeText(body.comment),
    strengths: sanitizeText(body.strengths),
    improvements: sanitizeText(body.improvements),
    suggestion: sanitizeText(body.suggestion),
    updated_by: user.id,
    updated_at: now,
  };

  if (status === "published") patch.published_at = now;

  const existingRows = Array.isArray((student as any).official_evaluations)
    ? (student as any).official_evaluations
    : [(student as any).official_evaluations].filter(Boolean);
  const existing = existingRows.find((row: any) => String(row?.month_key || "") === monthKey);
  if (!existing?.id) patch.created_by = user.id;

  const { data, error } = await supabase
    .from("official_evaluations")
    .upsert(patch, { onConflict: "student_id,month_key" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, item: toClientRow(data) });
}
