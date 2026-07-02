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
    .eq("teacher_id", teacher.id);

  if (error) throw error;
  return (data || []).map((x: any) => x.id);
}

export async function GET(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  const month = new URL(req.url).searchParams.get("month");
  const monthKey = month ? normalizeMonthKey(month) : null;

  try {
    const classIds = await accessibleClassIds(user);
    if (!classIds.length) return NextResponse.json({ ok: true, items: [] });

    let query = supabaseAdmin()
      .from("official_evaluations")
      .select("*")
      .in("class_id", classIds)
      .order("updated_at", { ascending: false });

    if (monthKey) query = query.eq("month_key", monthKey);

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

  const { data: student, error: studentError } = await supabase
    .from("official_students")
    .select("id, class_id, name")
    .eq("id", studentId)
    .single();

  if (studentError || !student) return NextResponse.json({ error: "Không tìm thấy học sinh" }, { status: 404 });

  const classIds = await accessibleClassIds(user);
  if (!classIds.includes(student.class_id)) {
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

  const { data: existing } = await supabase
    .from("official_evaluations")
    .select("id, created_by")
    .eq("student_id", student.id)
    .eq("month_key", monthKey)
    .maybeSingle();

  if (!existing?.id) patch.created_by = user.id;

  const { data, error } = await supabase
    .from("official_evaluations")
    .upsert(patch, { onConflict: "student_id,month_key" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, item: toClientRow(data) });
}
