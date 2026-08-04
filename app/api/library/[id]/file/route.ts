import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

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

function inferredMime(name = "", storedMime = "") {
  if (storedMime) return storedMime;
  const ext = extensionOf(name);
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "doc") return "application/msword";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  if (ext === "m4a") return "audio/mp4";
  if (ext === "aac") return "audio/aac";
  return "application/octet-stream";
}

function asciiFileName(name = "file") {
  const clean = String(name || "file")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return clean || "file";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canUseLibrary(user)) return NextResponse.json({ error: "Không có quyền truy cập tài liệu" }, { status: 403 });

  const { id } = await params;
  const supabase = supabaseAdmin();
  const { data: item, error: itemError } = await supabase
    .from("official_exercise_library")
    .select("id, title, file_name, mime_type, storage_bucket, storage_path")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (itemError || !item) return NextResponse.json({ error: "Không tìm thấy tài liệu" }, { status: 404 });

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(item.storage_bucket)
    .download(item.storage_path);
  if (downloadError || !fileData) {
    return NextResponse.json({ error: downloadError?.message || "Không tải được tài liệu" }, { status: 500 });
  }

  const fileName = String(item.file_name || item.title || "tai-lieu");
  const download = req.nextUrl.searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";
  const body = await fileData.arrayBuffer();

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": inferredMime(fileName, String(item.mime_type || fileData.type || "")),
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `${disposition}; filename="${asciiFileName(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
