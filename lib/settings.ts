import { supabaseAdmin } from "./supabase";

export type OfficialSettings = {
  tuition_per_session: number;
  session_capacity: number;
  center_name: string;
};

export async function getSettings(): Promise<OfficialSettings> {
  const { data } = await supabaseAdmin().from("official_settings").select("key,value");
  const map = new Map((data || []).map((r: any) => [r.key, r.value]));
  return {
    tuition_per_session: Number(map.get("tuition_per_session") || 70000),
    session_capacity: Number(map.get("session_capacity") || 15),
    center_name: String(map.get("center_name") || "Ms.Giang English Center"),
  };
}

export async function setSetting(key: string, value: string, updatedBy?: string) {
  const allowed = new Set(["tuition_per_session", "session_capacity", "center_name"]);
  if (!allowed.has(key)) throw new Error("Invalid setting key");
  const { error } = await supabaseAdmin()
    .from("official_settings")
    .upsert({ key, value: String(value), updated_by: updatedBy || null, updated_at: new Date().toISOString() });
  if (error) throw error;
}
