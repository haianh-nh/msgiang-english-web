import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

function noStoreJson(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

function browserKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
  ).trim();
}

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = browserKey();

  // Realtime is optional by design. Missing client configuration must never
  // break the existing app or force the server-only service-role key into the browser.
  if (!url || !key) {
    return noStoreJson({
      ok: true,
      enabled: false,
      reason: !url ? "missing_supabase_url" : "missing_publishable_key",
    });
  }

  const { data, error } = await supabaseAdmin()
    .from("official_realtime_config")
    .select("topic, enabled")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    const code = String((error as any)?.code || "");
    const message = String((error as any)?.message || "");
    const missingMigration = code === "42P01" || code === "PGRST205" || /official_realtime_config/i.test(message);
    if (missingMigration) {
      return noStoreJson({ ok: true, enabled: false, reason: "migration_missing" });
    }
    console.warn("Realtime config lookup failed", { code, message });
    return noStoreJson({ ok: true, enabled: false, reason: "config_unavailable" });
  }

  if (!data?.enabled || !data?.topic) {
    return noStoreJson({ ok: true, enabled: false, reason: "disabled" });
  }

  return noStoreJson({
    ok: true,
    enabled: true,
    url,
    key,
    topic: data.topic,
    userId: user?.id || null,
    protocolVersion: 1,
  });
}
