import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage, canAdmin, sanitizeUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";
import { fetchTeachersV48 } from "@/lib/classes";

const ALLOWED_ROLES = new Set(["admin", "manager", "teacher", "ta"]);

function normalizePhone(v: any) {
  const s = String(v || "").trim();
  if (s === "admin") return "admin";
  return s.replace(/\D/g, "");
}

function normalizeRoles(value: any, actor: any) {
  const roles = Array.isArray(value) ? value : [value].filter(Boolean);
  let clean = roles.map(String).filter((r) => ALLOWED_ROLES.has(r));
  if (!clean.length) clean = ["teacher"];
  if (!canAdmin(actor)) clean = clean.filter((r) => r !== "admin");
  if (!clean.includes("teacher") && !clean.includes("ta") && !clean.includes("admin")) clean.push("teacher");
  return Array.from(new Set(clean));
}

function roleValueToRoles(role: any, actor: any) {
  const r = String(role || "teacher");
  if (r === "admin" && canAdmin(actor)) return ["admin"];
  if (r === "manager") return ["teacher", "manager"];
  if (r === "ta") return ["ta"];
  return ["teacher"];
}

async function fullTeacher(id: string) {
  const { data, error } = await supabaseAdmin()
    .from("official_teachers")
    .select("*, official_users:user_id(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  const user = Array.isArray(data.official_users) ? data.official_users[0] : data.official_users;
  return {
    id: data.id,
    userId: data.user_id || user?.id || "",
    name: data.name,
    phone: data.phone || user?.phone || "",
    email: data.email || user?.email || "",
    roles: Array.isArray(user?.roles) ? user.roles : ["teacher"],
    status: data.status || user?.status || "active",
    mustChangePassword: !!user?.must_change_password,
    note: data.note || "",
  };
}

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền xem giáo viên" }, { status: 403 });

  try {
    const teachers = await fetchTeachersV48();
    return NextResponse.json({ ok: true, teachers });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Không tải được giáo viên" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền tạo giáo viên" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const phone = normalizePhone(body.phone);
  const email = String(body.email || "").trim();
  const roles = body.roles ? normalizeRoles(body.roles, user) : roleValueToRoles(body.role, user);
  const tempPassword = String(body.password || Math.floor(100000 + Math.random() * 900000));

  if (!name || !phone) return NextResponse.json({ error: "Thiếu tên hoặc SĐT/tài khoản" }, { status: 400 });

  const supabase = supabaseAdmin();
  const password_hash = await hashPassword(tempPassword);

  let appUser: any = null;
  const { data: existingUser } = await supabase.from("official_users").select("*").eq("phone", phone).maybeSingle();

  if (existingUser) {
    const { data, error } = await supabase
      .from("official_users")
      .update({ name, email, roles, status: "active", password_hash, must_change_password: true, updated_at: new Date().toISOString() })
      .eq("id", existingUser.id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    appUser = data;
  } else {
    const { data, error } = await supabase
      .from("official_users")
      .insert({ name, phone, email, roles, password_hash, status: "active", must_change_password: true })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    appUser = data;
  }

  const { data: existingTeacher } = await supabase.from("official_teachers").select("*").eq("phone", phone).maybeSingle();

  let teacherId = "";
  if (existingTeacher) {
    const { data, error } = await supabase
      .from("official_teachers")
      .update({ user_id: appUser.id, name, phone, email, status: "active", updated_at: new Date().toISOString() })
      .eq("id", existingTeacher.id)
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    teacherId = data.id;
  } else {
    const { data, error } = await supabase
      .from("official_teachers")
      .insert({ user_id: appUser.id, name, phone, email, status: "active" })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    teacherId = data.id;
  }

  const teacher = await fullTeacher(teacherId);
  return NextResponse.json({ ok: true, teacher, user: sanitizeUser(appUser), tempPassword });
}

export async function PATCH(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền sửa giáo viên" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Thiếu id giáo viên" }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data: teacher } = await supabase.from("official_teachers").select("*").eq("id", id).single();
  if (!teacher) return NextResponse.json({ error: "Không tìm thấy giáo viên" }, { status: 404 });

  const name = String(body.name ?? teacher.name ?? "").trim();
  const phone = normalizePhone(body.phone ?? teacher.phone);
  const email = String(body.email ?? teacher.email ?? "").trim();
  const status = String(body.status ?? teacher.status ?? "active");
  const roles = body.roles ? normalizeRoles(body.roles, user) : roleValueToRoles(body.role || "teacher", user);

  if (!name || !phone) return NextResponse.json({ error: "Thiếu tên hoặc số điện thoại" }, { status: 400 });

  let userId = teacher.user_id;
  if (!userId) {
    const { data: existingUser } = await supabase.from("official_users").select("*").eq("phone", phone).maybeSingle();
    if (existingUser) userId = existingUser.id;
    else {
      const password_hash = await hashPassword(String(Math.floor(100000 + Math.random() * 900000)));
      const { data: newUser, error: ue } = await supabase
        .from("official_users")
        .insert({ name, phone, email, roles, status, password_hash, must_change_password: true })
        .select("*")
        .single();
      if (ue) return NextResponse.json({ error: ue.message }, { status: 500 });
      userId = newUser.id;
    }
  }

  const { error: ue } = await supabase
    .from("official_users")
    .update({ name, phone, email, roles, status, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (ue) return NextResponse.json({ error: ue.message }, { status: 500 });

  const { error: te } = await supabase
    .from("official_teachers")
    .update({ user_id: userId, name, phone, email, status, note: body.note || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (te) return NextResponse.json({ error: te.message }, { status: 500 });

  return NextResponse.json({ ok: true, teacher: await fullTeacher(id) });
}

export async function DELETE(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền xóa giáo viên" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Thiếu id giáo viên" }, { status: 400 });

  const supabase = supabaseAdmin();

  const { data: teacher, error: te } = await supabase
    .from("official_teachers")
    .select("*, official_users:user_id(*)")
    .eq("id", id)
    .single();

  if (te || !teacher) return NextResponse.json({ error: "Không tìm thấy giáo viên" }, { status: 404 });

  const appUser = Array.isArray(teacher.official_users) ? teacher.official_users[0] : teacher.official_users;
  const roles = Array.isArray(appUser?.roles) ? appUser.roles : [];

  if (appUser?.id === user.id) {
    return NextResponse.json({ error: "Không thể xóa chính tài khoản đang đăng nhập" }, { status: 400 });
  }

  if (roles.includes("admin") && !canAdmin(user)) {
    return NextResponse.json({ error: "Chỉ Admin mới được xóa tài khoản Admin" }, { status: 403 });
  }

  const { data: endedAssignments, error: endedAssignmentError } = await supabase
    .from("official_classes")
    .select("id,name,status")
    .or(`teacher_id.eq.${id},assistant_teacher_id.eq.${id}`)
    .eq("status", "ended")
    .limit(1);

  if (endedAssignmentError) return NextResponse.json({ error: endedAssignmentError.message }, { status: 500 });
  if ((endedAssignments || []).length) {
    return NextResponse.json({
      error: "Không thể xóa nhân sự đang nằm trong lớp đã kết thúc. Cần giữ nguyên lịch sử lớp.",
    }, { status: 409 });
  }

  // Gỡ giáo viên/TA khỏi các lớp đang học trước để giao diện không còn gán lớp cũ.
  await supabase
    .from("official_classes")
    .update({ teacher_id: null })
    .eq("teacher_id", id)
    .neq("status", "ended");

  await supabase
    .from("official_classes")
    .update({ assistant_teacher_id: null, assistant_name: null })
    .eq("assistant_teacher_id", id)
    .neq("status", "ended");

  const userId = teacher.user_id || appUser?.id || null;

  const { error: de } = await supabase.from("official_teachers").delete().eq("id", id);
  if (de) return NextResponse.json({ error: de.message }, { status: 500 });

  if (userId) {
    await supabase.from("official_sessions").delete().eq("user_id", userId);
    const { error: ue } = await supabase.from("official_users").delete().eq("id", userId);
    if (ue) return NextResponse.json({ error: ue.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deletedTeacherId: id, deletedUserId: userId });
}

