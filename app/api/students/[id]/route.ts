import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền xóa học sinh" }, { status: 403 });

  const { id } = await params;
  const supabase = supabaseAdmin();

  const { data: student, error: studentError } = await supabase
    .from("official_students")
    .select("id,class_id")
    .eq("id", id)
    .maybeSingle();

  if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 });
  if (!student) return NextResponse.json({ error: "Không tìm thấy học sinh" }, { status: 404 });

  const { data: klass, error: classError } = await supabase
    .from("official_classes")
    .select("id,status")
    .eq("id", student.class_id)
    .maybeSingle();

  if (classError) return NextResponse.json({ error: classError.message }, { status: 500 });
  if (String(klass?.status || "active").toLowerCase() === "ended") {
    return NextResponse.json({ error: "Lớp đã kết thúc, không thể xóa học sinh." }, { status: 409 });
  }

  const { error } = await supabase.from("official_students").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
