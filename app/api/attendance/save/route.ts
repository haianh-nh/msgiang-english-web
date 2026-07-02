import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

function absenceId(studentId: string, sessionKey: string) {
  return `${sessionKey}__${studentId}`;
}

function sessionLabelFromBody(body: any) {
  const date = body.date || "";
  const slot = `${body.start || ""}-${body.end || ""}`.replace("-", " - ");
  return `${body.day || ""} ${date} • ${slot}`.trim();
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const sessionKey = String(body.sessionKey || "");
  const classId = String(body.classId || "");
  const rows = body.rows || {};
  const manualMakeups = Array.isArray(body.manualMakeups) ? body.manualMakeups : [];

  if (!sessionKey || !classId) {
    return NextResponse.json({ error: "Thiếu thông tin buổi điểm danh" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const sessionRow = {
    session_key: sessionKey,
    class_id: classId,
    session_date: body.date,
    day_key: body.day,
    start_time: body.start,
    end_time: body.end,
    session_type: body.type || "regular",
    saved: true,
    editable: false,
    manual_makeups: manualMakeups,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { error: sessionError } = await supabase
    .from("official_attendance_sessions")
    .upsert(sessionRow, { onConflict: "session_key" });

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  await supabase.from("official_attendance_rows").delete().eq("session_key", sessionKey);

  const rowValues = Object.values(rows || {})
    .filter((r: any) => r && r.studentId && r.type && r.status)
    .map((r: any) => ({
      session_key: sessionKey,
      student_id: String(r.studentId),
      row_type: String(r.type),
      status: String(r.status),
      note: r.note || null,
      updated_at: new Date().toISOString(),
    }));

  if (rowValues.length) {
    const { error: rowsError } = await supabase.from("official_attendance_rows").insert(rowValues);
    if (rowsError) return NextResponse.json({ error: rowsError.message }, { status: 500 });
  }

  const officialRows = rowValues.filter((r: any) => r.row_type === "official");
  const absentRows = officialRows.filter((r: any) => r.status === "absent");
  const generatedIds = officialRows.map((r: any) => absenceId(r.student_id, sessionKey));

  if (generatedIds.length) {
    await supabase
      .from("official_absence_records")
      .delete()
      .eq("source_session_key", sessionKey)
      .eq("generated_from_attendance", true)
      .in("id", generatedIds);
  }

  if (absentRows.length) {
    const absenceRows = absentRows.map((r: any) => ({
      id: absenceId(r.student_id, sessionKey),
      student_id: r.student_id,
      source_class_id: classId,
      source_session_key: sessionKey,
      source_session_label: body.sessionLabel || sessionLabelFromBody(body),
      reason: r.note || "Vắng",
      generated_from_attendance: true,
      status: "pending",
      updated_at: new Date().toISOString(),
    }));

    const { error: absError } = await supabase
      .from("official_absence_records")
      .upsert(absenceRows, { onConflict: "id" });

    if (absError) return NextResponse.json({ error: absError.message }, { status: 500 });
  }

  const { data: absData } = await supabase
    .from("official_absence_records")
    .select("*")
    .eq("source_session_key", sessionKey);

  return NextResponse.json({
    ok: true,
    session: {
      sessionKey,
      saved: true,
      editable: false,
      rows,
      manualMakeups,
      updatedAt: sessionRow.updated_at,
    },
    absenceRecords: (absData || []).map((a: any) => ({
      id: a.id,
      studentId: a.student_id,
      sourceClassId: a.source_class_id,
      sourceSessionKey: a.source_session_key,
      sourceSessionLabel: a.source_session_label,
      reason: a.reason || "Vắng",
      generatedFromAttendance: !!a.generated_from_attendance,
      status: a.status || "pending",
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    })),
  });
}
