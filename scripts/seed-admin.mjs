import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing env");

const supabase = createClient(url, key);
const hash = await bcrypt.hash("123456", 10);

const { error } = await supabase.from("app_users").upsert({
  name: "Admin Ms.Giang",
  phone: "admin",
  password_hash: hash,
  role: "admin",
  status: "active",
  must_change_password: true
}, { onConflict: "phone" });

if (error) throw error;
console.log("Admin ready: admin / 123456");
