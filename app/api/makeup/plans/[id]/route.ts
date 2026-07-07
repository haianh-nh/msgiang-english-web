import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("official_makeup_plans")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data?.absence_id) {
    await supabase.from("official_absence_records").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", data.absence_id);
  }

  return NextResponse.json({ ok: true, plan: data });
}
