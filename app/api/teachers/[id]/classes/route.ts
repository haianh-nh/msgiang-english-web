import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền gán lớp" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const classId = String(body.classId || "");
  const action = String(body.action || "assign");

  if (!classId) return NextResponse.json({ error: "Thiếu lớp" }, { status: 400 });

  const supabase = supabaseAdmin();

  if (action === "remove") {
    const { error } = await supabase
      .from("official_classes")
      .update({ teacher_id: null, updated_at: new Date().toISOString() })
      .eq("id", classId)
      .eq("teacher_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("official_classes")
    .update({ teacher_id: id, updated_at: new Date().toISOString() })
    .eq("id", classId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
