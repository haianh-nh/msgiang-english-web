import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const { data, error } = await supabaseAdmin()
    .from("official_v48_state")
    .select("payload, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, payload: data?.payload || null, updated_at: data?.updated_at || null });
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const payload = body.payload || body.data;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  const { error } = await supabaseAdmin().from("official_v48_state").upsert({
    user_id: user.id,
    payload,
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
