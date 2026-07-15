import { NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền reset mật khẩu" }, { status: 403 });

  const { id } = await params;
  const supabase = supabaseAdmin();
  const { data: teacher, error: te } = await supabase.from("official_teachers").select("id,user_id,name,phone").eq("id", id).single();
  if (te || !teacher) return NextResponse.json({ error: "Không tìm thấy giáo viên" }, { status: 404 });

  let userId = teacher.user_id;
  if (!userId) {
    const { data: appUser } = await supabase.from("official_users").select("id").eq("phone", teacher.phone).maybeSingle();
    if (appUser) {
      userId = appUser.id;
      await supabase.from("official_teachers").update({ user_id: userId }).eq("id", id);
    }
  }
  if (!userId) return NextResponse.json({ error: "Giáo viên chưa có tài khoản đăng nhập" }, { status: 400 });

  const tempPassword = String(Math.floor(100000 + Math.random() * 900000));
  const password_hash = await hashPassword(tempPassword);
  const { error } = await supabase
    .from("official_users")
    .update({ password_hash, must_change_password: true, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tempPassword, phone: teacher.phone, name: teacher.name });
}
