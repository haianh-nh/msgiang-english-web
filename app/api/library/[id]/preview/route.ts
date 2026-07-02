import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import mammoth from "mammoth";

function rolesOf(user: any) {
  return Array.isArray(user?.roles) ? user.roles : [];
}

function canUseLibrary(user: any) {
  const roles = rolesOf(user);
  return roles.includes("admin") || roles.includes("manager") || roles.includes("teacher");
}

function isDocx(name = "", mime = "") {
  return (
    /\.docx$/i.test(name) ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canUseLibrary(user)) return NextResponse.json({ error: "Không có quyền xem trước tài liệu" }, { status: 403 });

  const { id } = await params;
  const supabase = supabaseAdmin();

  const { data: item, error: itemError } = await supabase
    .from("official_exercise_library")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (itemError || !item) return NextResponse.json({ error: "Không tìm thấy tài liệu" }, { status: 404 });
  if (item.type !== "word") return NextResponse.json({ error: "Chỉ xem trước file Word" }, { status: 400 });

  if (!isDocx(item.file_name || "", item.mime_type || "")) {
    return NextResponse.json({
      ok: true,
      previewable: false,
      title: item.title,
      fileName: item.file_name,
      text: "File .doc cũ không hỗ trợ xem trước trực tiếp. Vui lòng bấm Mở / tải file Word để xem bằng Microsoft Word hoặc Google Docs.",
    });
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(item.storage_bucket)
    .download(item.storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: downloadError?.message || "Không tải được file Word" }, { status: 500 });
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const result = await mammoth.extractRawText({ buffer });
  const text = (result.value || "").trim();

  return NextResponse.json({
    ok: true,
    previewable: true,
    title: item.title,
    fileName: item.file_name,
    text: text || "File Word không có nội dung text để xem trước.",
    messages: result.messages || [],
  });
}
