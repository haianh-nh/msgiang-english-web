import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage, canTuition } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { STUDENT_CLIENT_SELECT } from "@/lib/db-selects";

function validDate(value: unknown) {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function isMissingEnrollmentHistoryTable(error: any) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  return code === "PGRST205" || /official_student_enrollments|schema cache|relation .* does not exist/i.test(message);
}

function mapStudent(row: any, includeTuition: boolean) {
  const student: any = {
    id: row.id,
    name: row.name,
    contact: [row.parent_phone, row.note].filter(Boolean).join(" • ") || row.contact || "Chưa có",
    parentName: row.parent_name || "",
    parentPhone: row.parent_phone || "",
    note: row.note || "",
    status: row.status || "active",
  };
  if (includeTuition) {
    student.enrollmentStartDate = row.enrollment_start_date || "";
    student.tuitionRegularStartMonth = row.tuition_regular_start_month || "";
  }
  return student;
}

async function readHistory(studentId: string) {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("official_student_enrollments")
    .select("id,student_id,class_id,class_name_snapshot,start_date,end_date,status,transfer_reason,created_at,updated_at")
    .eq("student_id", studentId)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id,
    className: row.class_name_snapshot,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    reason: row.transfer_reason || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền xem lịch sử chuyển lớp" }, { status: 403 });

  const { id } = await params;
  try {
    const history = await readHistory(id);
    return NextResponse.json({ ok: true, history }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error: any) {
    if (isMissingEnrollmentHistoryTable(error)) {
      return NextResponse.json(
        { ok: true, history: [], historyUnavailable: true },
        { headers: { "Cache-Control": "private, no-store, max-age=0" } },
      );
    }
    return NextResponse.json({ error: error?.message || "Không tải được lịch sử lớp" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền chuyển lớp học sinh" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const targetClassId = String(body.targetClassId || "").trim();
  const transferDate = validDate(body.transferDate) || new Date().toISOString().slice(0, 10);
  const reason = String(body.reason || "").trim().slice(0, 500);
  const requestId = String(body.requestId || "").trim().slice(0, 120) || null;

  if (!targetClassId) return NextResponse.json({ error: "Chọn lớp chuyển đến" }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data: result, error: transferError } = await supabase.rpc("official_transfer_student", {
    p_student_id: id,
    p_target_class_id: targetClassId,
    p_transfer_date: transferDate,
    p_reason: reason || null,
    p_actor: user.id,
    p_request_id: requestId,
  });

  if (transferError) {
    const rawMessage = String(transferError.message || "Không chuyển lớp được");
    const migrationMissing = /official_transfer_student|official_student_enrollments|schema cache|function .* does not exist|PGRST202|PGRST205/i.test(rawMessage);
    const message = migrationMissing
      ? "Chức năng chuyển lớp chưa được kích hoạt trên Supabase. Hãy chạy migration Phase 8.0 rồi thử lại."
      : rawMessage;
    const status = migrationMissing ? 503 : /không tìm thấy/i.test(message) ? 404 : /đang ở lớp|đã kết thúc/i.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const sourceClassId = String(result?.sourceClassId || "");
  const resolvedTargetClassId = String(result?.targetClassId || targetClassId);

  const [studentResult, sourceResult, targetResult, history] = await Promise.all([
    supabase.from("official_students").select(STUDENT_CLIENT_SELECT).eq("id", id).maybeSingle(),
    sourceClassId
      ? supabase.from("official_classes").select("id,name,status").eq("id", sourceClassId).maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
    supabase.from("official_classes").select("id,name,status").eq("id", resolvedTargetClassId).maybeSingle(),
    readHistory(id).catch(() => []),
  ]);

  await supabase.from("official_v48_state").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");

  return NextResponse.json(
    {
      ok: true,
      idempotent: !!result?.idempotent,
      student: studentResult.data ? mapStudent(studentResult.data, canTuition(user)) : null,
      sourceClass: sourceResult.data || (sourceClassId ? { id: sourceClassId } : null),
      targetClass: targetResult.data || { id: resolvedTargetClassId },
      transferDate,
      reason,
      history,
      warning: studentResult.error || targetResult.error ? "Đã chuyển lớp nhưng chưa tải lại được toàn bộ chi tiết." : "",
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
