import { NextResponse } from "next/server";
import { currentUser, sanitizeUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { supabaseAdmin } from "@/lib/supabase";

function sanitizeBootstrapSnapshot(payload: any) {
  if (!payload || typeof payload !== "object") return null;
  return {
    settings: payload.settings || {},
    managerClassScope: payload.managerClassScope || "all",
    managerAttendanceScope: payload.managerAttendanceScope || "all",
    libraryTab: payload.libraryTab || "word",
    libraryQ: payload.libraryQ || "",
    libraryLevel: payload.libraryLevel || "all",
    librarySkill: payload.librarySkill || "all",
    libraryUnit: payload.libraryUnit || "all",
  };
}

export async function GET() {
  const user = await currentUser();
  const settings = await getSettings();

  let snapshot = null;
  if (user) {
    const { data } = await supabaseAdmin()
      .from("official_v48_state")
      .select("payload")
      .eq("user_id", user.id)
      .maybeSingle();
    snapshot = sanitizeBootstrapSnapshot(data?.payload || null);
  }

  return NextResponse.json({
    ok: true,
    authenticated: !!user,
    user: sanitizeUser(user),
    settings,
    snapshot,
  });
}
