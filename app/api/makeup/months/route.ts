import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

function validMonth(v: any) {
  const s = String(v || "").trim();
  return /^\d{4}-\d{2}$/.test(s) ? s : "";
}

function monthFromSessionKey(key: any) {
  const parts = String(key || "").split("|");
  const date = parts.length >= 2 ? parts[1] : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : "";
}

function uniq(values: any[]) {
  return Array.from(new Set(values.map((v) => String(v || "")).filter(Boolean)));
}

async function monthState(supabase: any) {
  const [absRes, planRes, deletedRes] = await Promise.all([
    supabase.from("official_absence_records").select("source_session_key,created_at"),
    supabase.from("official_makeup_plans").select("source_session_key,target_session_key,created_at"),
    supabase.from("official_makeup_deleted_months").select("month_key,reason,deleted_at").order("month_key", { ascending: false }),
  ]);
  if (absRes.error) throw absRes.error;
  if (planRes.error) throw planRes.error;
  if (deletedRes.error) throw deletedRes.error;

  const deletedMonths = uniq((deletedRes.data || []).map((r: any) => r.month_key));
  const deletedSet = new Set(deletedMonths);
  const allMonths = new Set<string>();

  for (const a of absRes.data || []) {
    const m = monthFromSessionKey(a.source_session_key) || String(a.created_at || "").slice(0, 7);
    if (validMonth(m)) allMonths.add(m);
  }
  for (const p of planRes.data || []) {
    const m = monthFromSessionKey(p.source_session_key) || monthFromSessionKey(p.target_session_key) || String(p.created_at || "").slice(0, 7);
    if (validMonth(m)) allMonths.add(m);
  }

  const months = Array.from(allMonths).filter((m) => !deletedSet.has(m)).sort().reverse();
  return { months, deletedMonths, deletedRows: deletedRes.data || [] };
}

export async function GET() {
  const { response } = await requireUser();
  if (response) return response;

  try {
    const data = await monthState(supabaseAdmin());
    return NextResponse.json({ ok: true, ...data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Không tải được danh sách tháng học bù" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Chỉ Admin/Quản lí được xóa dữ liệu vắng theo tháng" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const month = validMonth(body.month);
  if (!month) return NextResponse.json({ error: "Tháng không hợp lệ" }, { status: 400 });

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("official_makeup_deleted_months")
    .upsert({
      month_key: month,
      reason: String(body.reason || "Xóa dữ liệu vắng/học bù theo tháng").slice(0, 500),
      deleted_by: user.id,
      deleted_at: new Date().toISOString(),
    }, { onConflict: "month_key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    const data = await monthState(supabase);
    return NextResponse.json({ ok: true, month, ...data });
  } catch (e: any) {
    return NextResponse.json({ ok: true, month, warning: e.message || "Đã xóa nhưng không tải lại được danh sách tháng" });
  }
}
