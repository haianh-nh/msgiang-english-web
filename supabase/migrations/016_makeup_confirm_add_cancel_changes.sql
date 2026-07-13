-- Confirm additions and cancellations from the Makeup scheduling popup in one transaction.
-- Safe to run more than once. Existing attendance and makeup history are preserved.

create or replace function public.official_apply_makeup_plan_changes(
  p_add_items jsonb,
  p_cancel_plan_ids jsonb,
  p_target_class_id text,
  p_target_session_key text,
  p_created_by uuid,
  p_capacity integer default 15
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_cancel_value jsonb;
  v_absence official_absence_records%rowtype;
  v_target official_classes%rowtype;
  v_plan official_makeup_plans%rowtype;
  v_item_id text;
  v_absence_id text;
  v_student_id text;
  v_source_class_id text;
  v_source_session_key text;
  v_source_month text;
  v_plan_id text;
  v_official_count integer := 0;
  v_makeup_count integer := 0;
  v_add_count integer := 0;
  v_cancel_count integer := 0;
  v_capacity integer := greatest(coalesce(p_capacity, 15), 1);
  v_plans jsonb := '[]'::jsonb;
  v_cancelled_plans jsonb := '[]'::jsonb;
  v_absences jsonb := '[]'::jsonb;
  v_seen_absence_ids text[] := array[]::text[];
  v_seen_student_ids text[] := array[]::text[];
  v_seen_cancel_plan_ids text[] := array[]::text[];
  v_cancel_absence_ids text[] := array[]::text[];
begin
  p_add_items := coalesce(p_add_items, '[]'::jsonb);
  p_cancel_plan_ids := coalesce(p_cancel_plan_ids, '[]'::jsonb);

  if coalesce(jsonb_typeof(p_add_items), '') <> 'array' then
    raise exception 'Danh sách học sinh chờ thêm không hợp lệ' using errcode = 'P0001';
  end if;

  if coalesce(jsonb_typeof(p_cancel_plan_ids), '') <> 'array' then
    raise exception 'Danh sách học sinh chờ hủy không hợp lệ' using errcode = 'P0001';
  end if;

  v_add_count := jsonb_array_length(p_add_items);
  v_cancel_count := jsonb_array_length(p_cancel_plan_ids);

  if v_add_count < 1 and v_cancel_count < 1 then
    raise exception 'Chưa có thay đổi học bù để lưu' using errcode = 'P0001';
  end if;

  if v_add_count > 50 then
    raise exception 'Chỉ được thêm tối đa 50 học sinh mỗi lần' using errcode = 'P0001';
  end if;

  if v_cancel_count > 50 then
    raise exception 'Chỉ được hủy tối đa 50 học sinh mỗi lần' using errcode = 'P0001';
  end if;

  if coalesce(p_target_class_id, '') = '' or coalesce(p_target_session_key, '') = '' then
    raise exception 'Thiếu thông tin buổi nhận học bù' using errcode = 'P0001';
  end if;

  -- Serialize every capacity, duplicate, add and cancel check for this target session.
  perform pg_advisory_xact_lock(hashtext('official_makeup:' || p_target_session_key));

  select * into v_target
  from official_classes
  where id::text = p_target_class_id;

  if not found then
    raise exception 'Không tìm thấy lớp nhận học bù' using errcode = 'P0001';
  end if;

  if lower(coalesce(v_target.status, 'active')) in ('ended','inactive','cancelled','canceled','deleted','archived') then
    raise exception 'Không thể thay đổi học bù của lớp đã kết thúc hoặc đã hủy' using errcode = 'P0001';
  end if;

  -- Stage cancellations first. Any later error rolls all of these updates back.
  for v_cancel_value in select value from jsonb_array_elements(p_cancel_plan_ids)
  loop
    v_plan_id := trim(both '"' from v_cancel_value::text);

    if coalesce(v_plan_id, '') = '' then
      raise exception 'Có lịch học bù thiếu mã để hủy' using errcode = 'P0001';
    end if;

    if v_plan_id = any(v_seen_cancel_plan_ids) then
      raise exception 'Danh sách hủy có lịch học bù bị trùng' using errcode = 'P0001';
    end if;
    v_seen_cancel_plan_ids := array_append(v_seen_cancel_plan_ids, v_plan_id);

    select * into v_plan
    from official_makeup_plans
    where id = v_plan_id
    for update;

    if not found then
      raise exception 'Không tìm thấy một lịch học bù cần hủy' using errcode = 'P0001';
    end if;

    if v_plan.target_class_id::text <> p_target_class_id
       or coalesce(v_plan.target_session_key, '') <> p_target_session_key then
      raise exception 'Có lịch học bù không thuộc buổi đang chỉnh sửa' using errcode = 'P0001';
    end if;

    if coalesce(v_plan.status, '') <> 'scheduled' then
      raise exception 'Có lịch học bù không còn ở trạng thái Đã xếp' using errcode = 'P0001';
    end if;

    if v_plan.absence_id is not null then
      v_cancel_absence_ids := array_append(v_cancel_absence_ids, v_plan.absence_id::text);
    end if;

    update official_makeup_plans
    set status = 'cancelled', cancelled_at = now()
    where id = v_plan_id
    returning * into v_plan;

    v_cancelled_plans := v_cancelled_plans || jsonb_build_array(to_jsonb(v_plan));

    if v_plan.absence_id is not null then
      update official_absence_records
      set status = 'pending', updated_at = now()
      where id = v_plan.absence_id
      returning * into v_absence;

      if found then
        v_absences := v_absences || jsonb_build_array(to_jsonb(v_absence));
      end if;
    end if;
  end loop;

  select count(*)::integer into v_official_count
  from official_students s
  where s.class_id::text = p_target_class_id
    and s.status = 'active';

  select count(*)::integer into v_makeup_count
  from official_makeup_plans p
  where p.target_session_key = p_target_session_key
    and p.status = 'scheduled';

  if v_official_count + v_makeup_count + v_add_count > v_capacity then
    raise exception 'Buổi này chỉ còn % chỗ học bù', greatest(v_capacity - v_official_count - v_makeup_count, 0)
      using errcode = 'P0001';
  end if;

  for v_item in select value from jsonb_array_elements(p_add_items)
  loop
    v_item_id := coalesce(nullif(v_item->>'id', ''), 'mk_' || replace(extract(epoch from clock_timestamp())::text, '.', '') || '_' || substr(md5(random()::text), 1, 8));
    v_absence_id := coalesce(v_item->>'absenceId', '');
    v_student_id := coalesce(v_item->>'studentId', '');
    v_source_class_id := coalesce(v_item->>'sourceClassId', '');
    v_source_session_key := coalesce(v_item->>'sourceSessionKey', '');

    if v_absence_id = '' or v_student_id = '' or v_source_class_id = '' then
      raise exception 'Có học sinh thiếu thông tin xếp học bù' using errcode = 'P0001';
    end if;

    if v_source_class_id = p_target_class_id then
      raise exception 'Học sinh đã thuộc lớp nhận, không cần xếp học bù vào chính lớp gốc' using errcode = 'P0001';
    end if;

    if v_absence_id = any(v_seen_absence_ids) then
      raise exception 'Danh sách thêm có lượt vắng bị trùng' using errcode = 'P0001';
    end if;

    if v_student_id = any(v_seen_student_ids) then
      raise exception 'Một học sinh chỉ được xếp một lượt vắng vào cùng buổi' using errcode = 'P0001';
    end if;

    if v_absence_id = any(v_cancel_absence_ids) then
      raise exception 'Không thể vừa hủy vừa xếp lại cùng một lượt vắng trong một lần lưu' using errcode = 'P0001';
    end if;

    v_seen_absence_ids := array_append(v_seen_absence_ids, v_absence_id);
    v_seen_student_ids := array_append(v_seen_student_ids, v_student_id);

    select * into v_absence
    from official_absence_records
    where id = v_absence_id
    for update;

    if not found then
      raise exception 'Không tìm thấy lượt vắng của một học sinh' using errcode = 'P0001';
    end if;

    if v_absence.student_id::text <> v_student_id or v_absence.source_class_id::text <> v_source_class_id then
      raise exception 'Thông tin học sinh/lớp vắng không khớp' using errcode = 'P0001';
    end if;

    if coalesce(v_absence.status, 'pending') <> 'pending' then
      raise exception 'Có lượt vắng không còn ở trạng thái Chờ xếp' using errcode = 'P0001';
    end if;

    v_source_month := substring(v_absence.source_session_key from '\|([0-9]{4}-[0-9]{2})-[0-9]{2}\|');
    if coalesce(v_source_month, '') <> '' and exists (
      select 1 from official_makeup_deleted_months d where d.month_key = v_source_month
    ) then
      raise exception 'Có dữ liệu vắng thuộc tháng đã bị xóa' using errcode = 'P0001';
    end if;

    if exists (
      select 1
      from official_makeup_plans p
      where p.absence_id::text = v_absence_id
        and p.status <> 'cancelled'
    ) then
      raise exception 'Có lượt vắng đã được xếp học bù ở nơi khác' using errcode = 'P0001';
    end if;

    if exists (
      select 1
      from official_makeup_plans p
      where p.target_session_key = p_target_session_key
        and p.student_id::text = v_student_id
        and p.status = 'scheduled'
    ) then
      raise exception 'Có học sinh đã nằm trong buổi học bù này' using errcode = 'P0001';
    end if;

    insert into official_makeup_plans (
      id, absence_id, student_id, source_class_id, source_session_key,
      target_class_id, target_session_key, status, created_by
    ) values (
      v_item_id, v_absence_id, v_student_id, v_source_class_id,
      coalesce(nullif(v_source_session_key, ''), v_absence.source_session_key),
      p_target_class_id, p_target_session_key, 'scheduled', p_created_by
    )
    returning * into v_plan;

    update official_absence_records
    set status = 'scheduled', updated_at = now()
    where id = v_absence_id
    returning * into v_absence;

    v_plans := v_plans || jsonb_build_array(to_jsonb(v_plan));
    v_absences := v_absences || jsonb_build_array(to_jsonb(v_absence));
  end loop;

  return jsonb_build_object(
    'plans', v_plans,
    'cancelledPlans', v_cancelled_plans,
    'absenceRecords', v_absences,
    'counts', jsonb_build_object(
      'official', v_official_count,
      'makeup', v_makeup_count + v_add_count,
      'total', v_official_count + v_makeup_count + v_add_count,
      'capacity', v_capacity
    )
  );
end;
$$;

revoke all on function public.official_apply_makeup_plan_changes(jsonb,jsonb,text,text,uuid,integer) from public, anon, authenticated;
grant execute on function public.official_apply_makeup_plan_changes(jsonb,jsonb,text,text,uuid,integer) to service_role;

notify pgrst, 'reload schema';
