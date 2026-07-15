import { NextResponse } from "next/server";
import { canAdmin, canManage, requireUser, sanitizeUser } from "@/lib/auth";
import { fetchTeachersV48 } from "@/lib/classes";
import { PUBLIC_USER_SELECT } from "@/lib/db-selects";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) {
    return NextResponse.json({ error: "Không có quyền xem nhân sự" }, { status: 403 });
  }

  try {
    const usersPromise = canAdmin(user)
      ? supabaseAdmin()
          .from("official_users")
          .select(PUBLIC_USER_SELECT)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null } as any);

    const [teachers, usersResult] = await Promise.all([
      fetchTeachersV48(),
      usersPromise,
    ]);

    if (usersResult.error) throw usersResult.error;

    return NextResponse.json(
      {
        ok: true,
        teachers,
        users: canAdmin(user) ? (usersResult.data || []).map(sanitizeUser) : [],
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Không tải được dữ liệu nhân sự" },
      { status: 500 },
    );
  }
}
