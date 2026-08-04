import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import mammoth from "mammoth";

const MAX_DOCX_PREVIEW_BYTES = 15 * 1024 * 1024;
const MAX_DOCX_HTML_BYTES = 6 * 1024 * 1024;

function rolesOf(user: any) {
  return Array.isArray(user?.roles) ? user.roles : [];
}

function canUseLibrary(user: any) {
  const roles = rolesOf(user);
  return roles.includes("admin") || roles.includes("manager") || roles.includes("receptionist") || roles.includes("teacher") || roles.includes("ta");
}

function extensionOf(name = "") {
  return String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
}

function isDocx(name = "", mime = "") {
  return extensionOf(name) === "docx" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function isLegacyDoc(name = "", mime = "") {
  return extensionOf(name) === "doc" || mime === "application/msword";
}

function sanitizeMammothHtml(input = "") {
  let html = String(input || "");
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select|option)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  html = html.replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select|option)\b[^>]*\/?\s*>/gi, "");
  html = html.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/\s+(href|src)\s*=\s*(["'])(.*?)\2/gi, (_match, attr: string, quote: string, value: string) => {
    const target = String(value || "").trim();
    if (/^(?:javascript|vbscript):/i.test(target)) return "";
    if (String(attr).toLowerCase() === "src" && /^data:/i.test(target) && !/^data:image\//i.test(target)) return "";
    return ` ${attr}=${quote}${target}${quote}`;
  });
  return html.trim();
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

  const fileName = String(item.file_name || "");
  const mimeType = String(item.mime_type || "");
  if (isLegacyDoc(fileName, mimeType)) {
    return NextResponse.json({
      ok: true,
      previewable: false,
      reason: "legacy-doc",
      title: item.title,
      fileName,
      message: "File .doc cũ chưa thể xem trước trực tiếp. Vui lòng tải xuống hoặc chuyển sang định dạng .docx.",
    });
  }
  if (!isDocx(fileName, mimeType)) {
    return NextResponse.json({ error: "File này không phải DOCX hợp lệ" }, { status: 400 });
  }

  const declaredSize = Number(item.file_size || 0);
  if (declaredSize > MAX_DOCX_PREVIEW_BYTES) {
    return NextResponse.json({
      ok: true,
      previewable: false,
      reason: "too-large",
      title: item.title,
      fileName,
      message: "File DOCX quá lớn để xem trước an toàn trên trình duyệt. Vui lòng tải xuống để mở đầy đủ.",
    });
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(item.storage_bucket)
    .download(item.storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: downloadError?.message || "Không tải được file Word" }, { status: 500 });
  }
  if (fileData.size > MAX_DOCX_PREVIEW_BYTES) {
    return NextResponse.json({
      ok: true,
      previewable: false,
      reason: "too-large",
      title: item.title,
      fileName,
      message: "File DOCX quá lớn để xem trước an toàn trên trình duyệt. Vui lòng tải xuống để mở đầy đủ.",
    });
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
      ],
      convertImage: mammoth.images.imgElement(async (image: any) => {
        const base64 = await image.read("base64");
        return { src: `data:${image.contentType || "image/png"};base64,${base64}` };
      }),
    },
  );

  const html = sanitizeMammothHtml(result.value || "");
  if (Buffer.byteLength(html, "utf8") > MAX_DOCX_HTML_BYTES) {
    return NextResponse.json({
      ok: true,
      previewable: false,
      reason: "preview-output-too-large",
      title: item.title,
      fileName,
      message: "Bản xem trước có quá nhiều hình ảnh hoặc nội dung. Vui lòng tải xuống để mở tài liệu đầy đủ.",
    });
  }
  const messages = (result.messages || []).slice(0, 20).map((entry: any) => String(entry?.message || entry || "")).filter(Boolean);

  return NextResponse.json(
    {
      ok: true,
      previewable: true,
      title: item.title,
      fileName,
      html: html || "<p>File Word không có nội dung có thể hiển thị.</p>",
      messages,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
