import { NextResponse } from "next/server";
import { currentUser, sanitizeSettingsForUser, sanitizeUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ authenticated: false });
  return NextResponse.json({
    authenticated: true,
    user: sanitizeUser(user),
    settings: sanitizeSettingsForUser(await getSettings(), user),
  });
}
