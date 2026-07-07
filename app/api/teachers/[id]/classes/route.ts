import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

function teacherIsTA(teacher: any) {
  const user = Array.isArray(teacher?.official_users) ? teacher.official_users[0] : teacher?.official_users;
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return roles.includes("ta") && !roles.includes("teacher") && !roles.includes("manager") && !roles.includes("admin");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền gán lớp" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const classId = String(body.classId || "");
  const action = String(body.action || "assign");
  const assignmentRole = String(body.assignmentRole || "").toLowerCase();

  if (!classId) return NextResponse.json({ error: "Thiếu lớp" }, { status: 400 });

  const supabase = supabaseAdmin();

  const { data: klass, error: classError } = await supabase
    .from("official_classes")
    .select("id,status,teacher_id,assistant_teacher_id")
    .eq("id", classId)
    .maybeSingle();

  if (classError) return NextResponse.json({ error: classError.message }, { status: 500 });
  if (!klass?.id) return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });
  if (String(klass.status || "active").toLowerCase() === "ended") {
    return NextResponse.json({ error: "Lớp đã kết thúc, không thể gán hoặc bỏ gán giáo viên/TA." }, { status: 409 });
  }

  const { data: teacher, error: te } = await supabase
    .from("official_teachers")
    .select("id,name, official_users:user_id(roles)")
    .eq("id", id)
    .maybeSingle();
  if (te) return NextResponse.json({ error: te.message }, { status: 500 });
  if (!teacher?.id) return NextResponse.json({ error: "Không tìm thấy giáo viên/TA" }, { status: 404 });

  const asTA = assignmentRole === "ta" || (!assignmentRole && teacherIsTA(teacher));

  if (action !== "remove") {
    if (asTA && String(klass.teacher_id || "") === String(id)) {
      return NextResponse.json({ error: "Một người không nên vừa là giáo viên chính vừa là TA của cùng lớp." }, { status: 400 });
    }
    if (!asTA && String(klass.assistant_teacher_id || "") === String(id)) {
      return NextResponse.json({ error: "Một người không nên vừa là giáo viên chính vừa là TA của cùng lớp." }, { status: 400 });
    }
  }

  if (action === "remove") {
    const update = asTA
      ? { assistant_teacher_id: null, assistant_name: null }
      : { teacher_id: null };

    const { error } = await supabase
      .from("official_classes")
      .update(update)
      .eq("id", classId)
      .eq(asTA ? "assistant_teacher_id" : "teacher_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, assignmentRole: asTA ? "ta" : "teacher" });
  }

  const update = asTA
    ? { assistant_teacher_id: id, assistant_name: teacher.name || null }
    : { teacher_id: id };

  const { error } = await supabase
    .from("official_classes")
    .update(update)
    .eq("id", classId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, assignmentRole: asTA ? "ta" : "teacher" });
}
