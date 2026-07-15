import { NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Chỉ Admin/Quản lí/Lễ tân được xóa tài liệu" }, { status: 403 });

  const { id } = await params;
  const supabase = supabaseAdmin();

  const { data: item, error: findError } = await supabase
    .from("official_exercise_library")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (findError || !item) return NextResponse.json({ error: "Không tìm thấy tài liệu" }, { status: 404 });

  const { error } = await supabase
    .from("official_exercise_library")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (item.storage_bucket && item.storage_path) {
    await supabase.storage.from(item.storage_bucket).remove([item.storage_path]);
  }

  return NextResponse.json({ ok: true, id });
}
