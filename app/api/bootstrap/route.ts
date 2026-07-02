import { NextResponse } from "next/server";
import { currentUser, sanitizeUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { supabaseAdmin } from "@/lib/supabase";

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
    snapshot = data?.payload || null;
  }

  return NextResponse.json({
    ok: true,
    authenticated: !!user,
    user: sanitizeUser(user),
    settings,
    snapshot,
  });
}
