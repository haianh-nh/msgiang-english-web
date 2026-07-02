import { supabaseAdmin } from "./supabase";

export function money(v:number) {
  return new Intl.NumberFormat("vi-VN").format(v || 0) + "đ";
}

export function gradeOf(name:string) {
  const m = String(name || "").match(/G?\s*(\d+)/i);
  if (m) return `G${m[1]}`;
  if (/GK/i.test(name || "")) return "GK";
  return "Other";
}

export async function teachers() {
  const { data } = await supabaseAdmin().from("teachers").select("*").order("name");
  return data || [];
}

export async function classesFor(user:any, scope="mine") {
  const supabase = supabaseAdmin();
  let q = supabase.from("classes").select("*, teachers(*), students(*), class_schedules(*)").order("name");
  if (user.role === "teacher" || (user.role === "manager" && scope !== "all")) {
    const { data:t } = await supabase.from("teachers").select("id").eq("phone", user.phone).single();
    if (!t) return [];
    q = q.eq("teacher_id", t.id);
  }
  const { data } = await q;
  return data || [];
}
