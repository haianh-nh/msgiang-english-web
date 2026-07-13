import { supabaseAdmin } from "./supabase";

export type OfficialSettings = {
  tuition_per_session: number;
  session_capacity: number;
  center_name: string;
};

const SETTINGS_TTL_MS = 60_000;
let settingsCache: { value: OfficialSettings; expiresAt: number } | null = null;
let settingsPromise: Promise<OfficialSettings> | null = null;

function defaultSettings(): OfficialSettings {
  return {
    tuition_per_session: 70000,
    session_capacity: 15,
    center_name: "Ms.Giang English Center",
  };
}

export function clearSettingsCache() {
  settingsCache = null;
  settingsPromise = null;
}

export async function getSettings(options: { force?: boolean } = {}): Promise<OfficialSettings> {
  const now = Date.now();
  if (!options.force && settingsCache && settingsCache.expiresAt > now) return settingsCache.value;
  if (!options.force && settingsPromise) return settingsPromise;

  settingsPromise = (async () => {
    const { data, error } = await supabaseAdmin().from("official_settings").select("key,value");
    if (error) throw error;
    const map = new Map((data || []).map((r: any) => [r.key, r.value]));
    const fallback = defaultSettings();
    const value: OfficialSettings = {
      tuition_per_session: Number(map.get("tuition_per_session") || fallback.tuition_per_session),
      session_capacity: Number(map.get("session_capacity") || fallback.session_capacity),
      center_name: String(map.get("center_name") || fallback.center_name),
    };
    settingsCache = { value, expiresAt: Date.now() + SETTINGS_TTL_MS };
    return value;
  })();

  try {
    return await settingsPromise;
  } finally {
    settingsPromise = null;
  }
}

export async function setSetting(key: string, value: string, updatedBy?: string) {
  const allowed = new Set(["tuition_per_session", "session_capacity", "center_name"]);
  if (!allowed.has(key)) throw new Error("Invalid setting key");
  const { error } = await supabaseAdmin()
    .from("official_settings")
    .upsert({ key, value: String(value), updated_by: updatedBy || null, updated_at: new Date().toISOString() });
  if (error) throw error;
  clearSettingsCache();
}
