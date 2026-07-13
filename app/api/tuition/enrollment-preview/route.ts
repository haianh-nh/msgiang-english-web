import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { buildEnrollmentTuitionPreview } from "@/lib/tuition-enrollment";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const started = performance.now();
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền tính học phí phát sinh" }, { status: 403 });

  const url = new URL(req.url);
  try {
    const preview = await buildEnrollmentTuitionPreview({
      classId: url.searchParams.get("classId") || "",
      startDate: url.searchParams.get("startDate") || "",
      firstSessionKey: url.searchParams.get("firstSessionKey") || "",
      targetMonth: url.searchParams.get("targetMonth") || "",
    });
    return NextResponse.json(
      { ok: true, preview },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "Server-Timing": `total;dur=${(performance.now() - started).toFixed(1)}`,
        },
      },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Không tính được học phí phát sinh" }, { status: 400 });
  }
}
