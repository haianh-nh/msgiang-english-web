import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const phone = process.env.ADMIN_USERNAME || "admin";
const password = process.env.ADMIN_PASSWORD || "123456";
const name = process.env.ADMIN_NAME || "Admin Ms.Giang";

const password_hash = await bcrypt.hash(password, 12);

const { data: existing } = await supabase
  .from("official_users")
  .select("id")
  .eq("phone", phone)
  .maybeSingle();

if (existing) {
  const { error } = await supabase
    .from("official_users")
    .update({
      name,
      password_hash,
      roles: ["admin"],
      status: "active",
      must_change_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);
  if (error) throw error;
  console.log(`Updated admin account: ${phone} / ${password}`);
} else {
  const { error } = await supabase.from("official_users").insert({
    name,
    phone,
    password_hash,
    roles: ["admin"],
    status: "active",
    must_change_password: false,
  });
  if (error) throw error;
  console.log(`Created admin account: ${phone} / ${password}`);
}
