import { NextRequest, NextResponse } from "next/server";
import { getSettings, setSetting } from "@/lib/settings";
import { requireAdmin, requireUser } from "@/lib/auth";

export async function GET() {
  const { response } = await requireUser();
  if (response) return response;
  return NextResponse.json({ ok: true, settings: await getSettings() });
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const key = String(body.key || "");
  const value = String(body.value ?? "");

  if (key === "tuition_per_session" && Number(value) < 0) {
    return NextResponse.json({ error: "Đơn giá không hợp lệ" }, { status: 400 });
  }
  if (key === "session_capacity" && (Number(value) < 1 || Number(value) > 100)) {
    return NextResponse.json({ error: "Giới hạn sĩ số không hợp lệ" }, { status: 400 });
  }

  try {
    await setSetting(key, value, user.id);
    return NextResponse.json({ ok: true, settings: await getSettings() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Không thể cập nhật cài đặt" }, { status: 400 });
  }
}
