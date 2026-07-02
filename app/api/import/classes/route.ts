import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { dayKeyToNum, ensureTeacherByName, gradeOf } from "@/lib/classes";

export const runtime = "nodejs";

function pick(row: any, keys: string[]) {
  for (const k of keys) {
    const found = Object.keys(row).find(x => x.trim().toLowerCase() === k.toLowerCase());
    if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== "") return String(row[found]).trim();
  }
  return "";
}

function parseRows(buffer: Buffer, fileName: string) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];
}

function time(v: string, fallback: string) {
  const s = String(v || "").trim();
  if (!s) return fallback;
  const m = s.match(/(\d{1,2})[:h]?(\d{0,2})/i);
  if (!m) return fallback;
  return `${String(m[1]).padStart(2,"0")}:${String(m[2] || "00").padStart(2,"0").slice(0,2)}`;
}

async function upsertSchedule(classId: string, row: any) {
  const supabase = supabaseAdmin();
  const schedules: any[] = [];
  const d1 = pick(row, ["schedule_1_day","day_1","thu_1","thứ 1","ngày học 1","day1"]);
  const s1 = pick(row, ["schedule_1_start","start_1","giờ bắt đầu 1","start1"]);
  const e1 = pick(row, ["schedule_1_end","end_1","giờ kết thúc 1","end1"]);
  const d2 = pick(row, ["schedule_2_day","day_2","thu_2","thứ 2","ngày học 2","day2"]);
  const s2 = pick(row, ["schedule_2_start","start_2","giờ bắt đầu 2","start2"]);
  const e2 = pick(row, ["schedule_2_end","end_2","giờ kết thúc 2","end2"]);

  if (d1) schedules.push({ class_id: classId, day_of_week: dayKeyToNum(d1), start_time: time(s1,"17:00"), end_time: time(e1,"18:30"), sort_order: 1 });
  if (d2) schedules.push({ class_id: classId, day_of_week: dayKeyToNum(d2), start_time: time(s2,time(s1,"17:00")), end_time: time(e2,time(e1,"18:30")), sort_order: 2 });

  if (schedules.length) {
    await supabase.from("official_class_schedules").delete().eq("class_id", classId);
    const { error } = await supabase.from("official_class_schedules").insert(schedules);
    if (error) throw error;
  }
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền import" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Thiếu file import" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = parseRows(buffer, file.name);
  const supabase = supabaseAdmin();

  let classCount = 0, studentCount = 0, skipped = 0;
  const errors: any[] = [];
  const classMap = new Map<string,string>();

  for (let i=0;i<rows.length;i++) {
    const row = rows[i];
    try {
      const className = pick(row, ["class_name","tên lớp","lop","lớp","class"]);
      const studentName = pick(row, ["student_name","tên học sinh","hoc sinh","học sinh","student"]);
      const teacherName = pick(row, ["teacher_name","giáo viên","giao vien","teacher"]);
      const parentPhone = pick(row, ["parent_phone","sđt phụ huynh","sdt phu huynh","phone","số điện thoại"]);
      const note = pick(row, ["note","ghi chú","ghi chu"]);
      if (!className) { skipped++; continue; }

      let classId = classMap.get(className);
      if (!classId) {
        const teacher = await ensureTeacherByName(teacherName || "Chưa phân công");
        const { data: existing } = await supabase.from("official_classes").select("id").eq("name", className).maybeSingle();
        if (existing?.id) {
          classId = existing.id;
        } else {
          const { data: klass, error: ce } = await supabase.from("official_classes").insert({
            name: className,
            grade: gradeOf(className),
            teacher_id: teacher?.id || null,
            start_date: new Date().toISOString().slice(0,10),
            status: "active",
          }).select("id").single();
          if (ce) throw ce;
          classId = klass.id;
          classCount++;
        }
        classMap.set(className, classId!);
        await upsertSchedule(classId!, row);
      }

      if (studentName) {
        const { data: dup } = await supabase
          .from("official_students")
          .select("id")
          .eq("class_id", classId)
          .ilike("name", studentName)
          .maybeSingle();

        if (!dup) {
          const { error: se } = await supabase.from("official_students").insert({
            class_id: classId,
            name: studentName,
            parent_phone: parentPhone || null,
            note: note || null,
            status: "active",
          });
          if (se) throw se;
          studentCount++;
        }
      }
    } catch (e:any) {
      errors.push({ row: i+2, error: e.message || String(e) });
    }
  }

  await supabase.from("official_import_batches").insert({
    file_name: file.name,
    row_count: rows.length,
    imported_by: user.id,
    status: errors.length ? "completed_with_errors" : "completed",
    error_log: errors,
  });

  return NextResponse.json({ ok: true, rows: rows.length, classCount, studentCount, skipped, errors });
}
