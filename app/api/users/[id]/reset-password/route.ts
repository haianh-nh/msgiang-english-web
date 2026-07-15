import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { supabaseAdmin } from "@/lib/supabase";

function tempPassword() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user: actor, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const supabase = supabaseAdmin();
  const { data: target, error: findError } = await supabase
    .from("official_users")
    .select("id,name,phone,roles")
    .eq("id", id)
    .maybeSingle();

  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!target) return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });

  // Standalone staff reset is intended for receptionist accounts. Teacher,
  // manager and TA passwords continue to use the teacher-account endpoint.
  const roles = Array.isArray(target.roles) ? target.roles : [];
  if (!roles.includes("receptionist")) {
    return NextResponse.json({ error: "Chỉ reset tài khoản Lễ tân tại mục này" }, { status: 400 });
  }

  const password = tempPassword();
  const passwordHash = await hashPassword(password);
  const { error: updateError } = await supabase
    .from("official_users")
    .update({
      password_hash: passwordHash,
      must_change_password: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Invalidate old sessions so the new temporary password takes effect safely.
  await supabase.from("official_sessions").delete().eq("user_id", id);

  return NextResponse.json({
    ok: true,
    account: { id: target.id, name: target.name, phone: target.phone, roles },
    tempPassword: password,
    resetBy: actor?.id || null,
  });
}
