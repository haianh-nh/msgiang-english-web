import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền thêm học sinh" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(()=>({}));
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Thiếu tên học sinh" }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data: klass, error: classError } = await supabase
    .from("official_classes")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();

  if (classError) return NextResponse.json({ error: classError.message }, { status: 500 });
  if (!klass) return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });
  if (String(klass.status || "active").toLowerCase() === "ended") {
    return NextResponse.json({ error: "Lớp đã kết thúc, không thể thêm học sinh." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("official_students")
    .insert({
      class_id: id,
      name,
      parent_phone: body.parentPhone || body.parent_phone || null,
      parent_name: body.parentName || body.parent_name || null,
      contact: body.contact || null,
      note: body.note || null,
      status: "active",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    student: {
      id: data.id,
      name: data.name,
      contact: [data.parent_phone, data.note].filter(Boolean).join(" • ") || "Chưa có",
      parentName: data.parent_name || "",
      parentPhone: data.parent_phone || "",
      note: data.note || "",
    }
  });
}
