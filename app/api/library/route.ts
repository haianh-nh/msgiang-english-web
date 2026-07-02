import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "official-exercise-library";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const SKILLS = new Set(["Listening", "Speaking", "Reading", "Writing", "Vocabulary", "Grammar", "Other"]);
const WORD_MIMES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function rolesOf(user: any) {
  return Array.isArray(user?.roles) ? user.roles : [];
}

function canUseLibrary(user: any) {
  const roles = rolesOf(user);
  return roles.includes("admin") || roles.includes("manager") || roles.includes("teacher");
}

function isWordFile(file?: File) {
  const mime = file?.type || "";
  const name = file?.name || "";
  return WORD_MIMES.has(mime) || /\.(doc|docx)$/i.test(name);
}

function normalizeType(value: any, file?: File) {
  const raw = String(value || "").toLowerCase();
  if (raw === "word" || raw === "audio") return raw;
  if (isWordFile(file)) return "word";
  if ((file?.type || "").startsWith("audio/")) return "audio";
  return "word";
}

function validateFile(type: string, file: File) {
  if (!file || file.size <= 0) return "Chọn file Word hoặc Audio";
  if (file.size > MAX_FILE_SIZE) return "File quá lớn, tối đa 50MB";
  const mime = file.type || "";
  const name = file.name || "";
  if (type === "word" && !WORD_MIMES.has(mime) && !/\.(doc|docx)$/i.test(name)) {
    return "Tài liệu bài tập phải là file Word .doc hoặc .docx";
  }
  if (type === "audio" && !mime.startsWith("audio/") && !/\.(mp3|wav|m4a|aac)$/i.test(name)) {
    return "Audio phải là file .mp3, .wav, .m4a hoặc .aac";
  }
  return "";
}

function safeFileName(name: string) {
  const cleaned = String(name || "file")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "file";
}

function toClientRow(row: any) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    level: row.level || "All",
    skill: row.skill || "",
    unit: row.unit || "",
    fileName: row.file_name,
    mimeType: row.mime_type || "",
    fileSize: Number(row.file_size || 0),
    bucket: row.storage_bucket,
    storagePath: row.storage_path,
    publicUrl: row.public_url || "",
    url: row.public_url || "",
    uploadedBy: row.uploader_name || "Unknown",
    uploadedById: row.uploaded_by || "",
    uploadedAt: row.created_at,
    createdAt: row.created_at,
  };
}

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canUseLibrary(user)) return NextResponse.json({ error: "Không có quyền xem thư viện" }, { status: 403 });

  const { data, error } = await supabaseAdmin()
    .from("official_exercise_library")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: (data || []).map(toClientRow) });
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canUseLibrary(user)) return NextResponse.json({ error: "Không có quyền thêm tài liệu" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Chưa chọn file" }, { status: 400 });
  }

  const type = normalizeType(form.get("type"), file);
  const fileError = validateFile(type, file);
  if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });

  const title = String(form.get("title") || "").trim();
  const level = String(form.get("level") || "All").trim() || "All";
  let skill = String(form.get("skill") || "").trim();
  const unit = String(form.get("unit") || "").trim();

  if (!title) return NextResponse.json({ error: "Nhập tên tài liệu" }, { status: 400 });
  if (!SKILLS.has(skill)) skill = skill || "Other";

  const extName = safeFileName(file.name);
  const time = Date.now();
  const storagePath = `${type}/${level}/${time}-${extName}`;

  const supabase = supabaseAdmin();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const fallbackContentType = type === "word"
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : "audio/mpeg";

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || fallbackContentType,
      upsert: false,
    });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const publicUrl = publicData.publicUrl || "";

  const { data, error } = await supabase
    .from("official_exercise_library")
    .insert({
      type,
      title,
      level,
      skill,
      unit,
      file_name: file.name,
      mime_type: file.type || "",
      file_size: file.size,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      public_url: publicUrl,
      uploaded_by: user.id,
      uploader_name: user.name || user.phone || "Unknown",
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: toClientRow(data) });
}
