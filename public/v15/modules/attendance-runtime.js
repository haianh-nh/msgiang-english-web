/*
 * Phase 8D.2 attendance-runtime.js
 * Tách runtime nghiệp vụ liên kết khỏi app core. Không đổi API hoặc nghiệp vụ.
 */

function v8bScheduleAttendanceDraftPersist(){
      clearTimeout(v8bAttendanceDraftTimer);
      v8bAttendanceDraftTimer=setTimeout(()=>{
        v8bAttendanceDraftTimer=null;
        window.MsUiAction.runWhenIdle(()=>saveLocalOnly(),500);
      },280);
    }

function v8bCancelAttendanceDraftPersist(){
      clearTimeout(v8bAttendanceDraftTimer);
      v8bAttendanceDraftTimer=null;
    }

function setAttendanceStatus(sessionKey,studentId,type,status){
      if(!attendanceCanEditSession(sessionKey,true)){toast('Bạn không có quyền sửa điểm danh buổi này');return}
      const rec=attendanceRecord(sessionKey); const rowKey=`${type}_${studentId}`;
      rec.rows[rowKey] ||= {studentId,type,status:'present',note:''};
      rec.rows[rowKey].status=status; rec.saved=false;
      // Attendance drafts stay local until the explicit Save button is pressed.
      // Avoid queueing /api/v48-state after every status click.
      v8bScheduleAttendanceDraftPersist();
      if(!v18bUpdateAttendanceStatusUI(sessionKey,studentId,type,status)){
        openAttendance(sessionObjectFromKey(sessionKey).classId,sessionKey,true,{preserveScroll:true});
      }
    }

function setAttendanceNote(sessionKey,studentId,type,value){
      if(!attendanceCanEditSession(sessionKey,true)){toast('Bạn không có quyền sửa điểm danh buổi này');return}
      const rec=attendanceRecord(sessionKey); const rowKey=`${type}_${studentId}`;
      rec.rows[rowKey] ||= {studentId,type,status:'present',note:''};
      rec.rows[rowKey].note=value;
      rec.saved=false;
      v8bScheduleAttendanceDraftPersist();
    }

function syncAbsenceRecordsForAttendance(sessionKey){
      const s=sessionObjectFromKey(sessionKey); if(!s) return;
      const c=classById(s.classId); const rec=ensureAttendanceSessions()[attendanceKey(sessionKey)];
      if(!rec?.saved) return;
      db.absenceRecords ||= [];
      const existingById=new Map(db.absenceRecords.filter(a=>a.sourceSessionKey===sessionKey).map(a=>[a.id,a]));
      const generated=[];
      const roster=rosterForAttendance(s.classId,sessionKey).filter(x=>x.type==='official');
      roster.forEach(x=>{
        const row=rec.rows[`official_${x.student.id}`];
        if(row?.status==='absent'){
          const id=absenceId(x.student.id,sessionKey);
          const old=existingById.get(id)||{};
          generated.push({
            id,
            studentId:x.student.id,
            sourceClassId:c.id,
            sourceSessionKey:sessionKey,
            sourceSessionLabel:sessionLabelFromKey(sessionKey),
            reason:row.note||old.reason||'Vắng',
            generatedFromAttendance:true,
            createdAt:old.createdAt||new Date().toLocaleString('vi-VN')
          });
        }
      });
      db.absenceRecords = db.absenceRecords.filter(a=>a.sourceSessionKey!==sessionKey || absenceRecordStatus(a.id)==='scheduled');
      const generatedIds=new Set(generated.map(a=>a.id));
      db.absenceRecords = db.absenceRecords.filter(a=>!(generatedIds.has(a.id) && a.sourceSessionKey===sessionKey));
      db.absenceRecords.push(...generated);
    }

function v20l4InvalidateScheduleAfterAttendanceSave(sessionKey){
      // Phase 8B: patch đúng thẻ buổi học, không dựng lại sidebar/trang Lịch.
      if(v18Memo.scheduleCellMap) v18Memo.scheduleCellMap.key='';
      if(v18Memo.scheduleDayMap) v18Memo.scheduleDayMap.key='';
      v18Memo.weekKey='';
      v18Memo.weekSessions=null;
      v18Touch();
      v18fUpdateAttendanceModuleCache();
      v18fUpdateScheduleModuleCache();
      lazyRouteState.schedule={...(lazyRouteState.schedule||{}),loaded:true,loadedAt:Date.now(),mutated:true};
      if(route==='schedule' && !v8bPatchScheduleSessions([sessionKey])) v18dRenderPageOnly(navItems());
    }

async function saveAttendance(sessionKey){
      const busyKey=`attendance:${sessionKey}`;
      if(v20o2IsBusy(busyKey)) return;
      const rec=attendanceRecord(sessionKey);
      const s=sessionObjectFromKey(sessionKey);
      if(!s){toast('Không tìm thấy buổi học');return}
      if(!attendanceCanEditSession(sessionKey,true)){toast('Điểm danh chỉ mở từ giờ bắt đầu buổi học. Admin/Quản lí/Lễ tân không được điểm danh trước giờ học.');return}
      // Khi lưu, tự tạo dòng Có mặt mặc định cho toàn bộ roster.
      rosterForAttendance(s.classId,sessionKey).forEach(x=>{
        const rowKey=`${x.type}_${x.student.id}`;
        rec.rows[rowKey] ||= {studentId:x.student.id,type:x.type,status:'present',note:''};
      });

      // A draft status click used to queue /api/v48-state after 650 ms. Cancel that
      // snapshot write so it cannot compete with the canonical attendance request.
      clearTimeout(officialSaveTimer);
      officialSaveTimer=null;
      v8bCancelAttendanceDraftPersist();
      v20o2SetBusy(busyKey,true);
      try{
        const data=await window.MsUiAction.measureAsync('Lưu điểm danh',()=>officialFetch('/api/attendance/save',{method:'POST',body:JSON.stringify({
          sessionKey,
          classId:s.classId,
          date:s.date,
          day:s.day,
          start:s.start,
          end:s.end,
          type:s.type||'regular',
          sessionLabel:sessionLabelFromKey(sessionKey),
          rows:rec.rows,
          manualMakeups:rec.manualMakeups||[],
          pendingMakeupPlans:rec.pendingMakeupPlans||[],
          capacity:Number(db.settings?.capacity||15)
        })}),450);

        const affectedMakeupMonths=new Set([sessionKeyMonth(sessionKey)].filter(Boolean));
        const collectMakeupMonth=value=>{const month=sessionKeyMonth(String(value||''));if(month)affectedMakeupMonths.add(month)};

        rec.saved=true;
        rec.editable=false;
        rec.rows=data.session?.rows || rec.rows;
        rec.manualMakeups=data.session?.manualMakeups || rec.manualMakeups || [];
        rec.pendingMakeupPlans=[];
        rec.updatedAt=data.session?.updatedAt || new Date().toLocaleString('vi-VN');

        (data.makeupPlansCreated||[]).forEach(plan=>{
          collectMakeupMonth(plan.sourceSessionKey);
          collectMakeupMonth(plan.targetSessionKey);
          db.makeupPlans ||= [];
          db.makeupPlans = db.makeupPlans.filter(p=>String(p.id)!==String(plan.id));
          db.makeupPlans.push(plan);
        });
        db.absenceRecords = (db.absenceRecords||[]).filter(a=>a.sourceSessionKey!==sessionKey);
        (data.absenceRecords||[]).forEach(a=>collectMakeupMonth(a.sourceSessionKey));
        db.absenceRecords.push(...(data.absenceRecords||[]));
        (data.makeupPlanUpdates||[]).forEach(u=>{
          const p=(db.makeupPlans||[]).find(x=>String(x.id)===String(u.id));
          if(p){
            collectMakeupMonth(p.sourceSessionKey);
            collectMakeupMonth(p.targetSessionKey);
            p.status=u.status;
            if(Object.prototype.hasOwnProperty.call(u,'cancelledAt')) p.cancelledAt=u.cancelledAt;
          }
        });
        const resolvedAbsenceIds=new Set((data.makeupResolvedAbsenceIds||[]).map(String));
        if(resolvedAbsenceIds.size){
          db.absenceRecords = (db.absenceRecords||[]).filter(a=>!resolvedAbsenceIds.has(String(a.id)));
        }
        (data.makeupAbsenceRecords||[]).forEach(a=>{
          collectMakeupMonth(a.sourceSessionKey);
          db.absenceRecords = (db.absenceRecords||[]).filter(x=>String(x.id)!==String(a.id));
          if(String(a.status||'pending')==='pending') db.absenceRecords.push(a);
        });

        // Patch the shared week/month snapshots immediately. No tuition request and
        // no full attendance/schedule reload is allowed to block the success state.
        v18fUpdateScheduleModuleCache();
        v18fUpdateAttendanceModuleCache();
        v20l4InvalidateScheduleAfterAttendanceSave(sessionKey);
        v20bAfterMutation(['attendance','schedule'],{
          sessionKey,
          targetSessionKey:sessionKey,
          preserveCache:true,
          delayMs:6500,
          renderOnRevalidate:false
        });
        // Makeup state can span the target month and older source-absence months.
        // Invalidate those exact month snapshots so the next Makeup-tab visit fetches
        // canonical data instead of persisting an incomplete local monthly bundle.
        v20bAfterMutation(['makeup'],{
          months:Array.from(affectedMakeupMonths),
          noRefresh:true
        });
        saveLocalOnly();

        // Clear busy before rebuilding the modal, otherwise the new button stays disabled.
        v20o2SetBusy(busyKey,false);
        toast('Đã lưu điểm danh');
        openAttendance(s.classId,sessionKey,false,{preserveScroll:true});
      }catch(e){
        v8bScheduleAttendanceDraftPersist();
        toast(e.message||'Không lưu được điểm danh');
      }finally{
        v20o2SetBusy(busyKey,false);
      }
    }

function editAttendance(sessionKey){
      const w=attendanceWindowInfo(sessionKey);
      if(w.isEarly){toast('Điểm danh chưa mở. Tất cả tài khoản chỉ được lưu/sửa sau giờ bắt đầu buổi học.');return}
      if(!w.open && !attendanceCanOverride()){toast('Chỉ Admin/Quản lí/Lễ tân được sửa điểm danh ngoài giờ hoặc đã đóng');return}
      const rec=attendanceRecord(sessionKey); rec.editable=true; saveLocalOnly(); openAttendance(sessionObjectFromKey(sessionKey).classId,sessionKey,true,{preserveScroll:true})
    }

function classStudentsForManualMakeup(targetClassId){
      // V20L: thêm học bù thủ công cũng bỏ điều kiện cùng khối.
      // Chỉ lấy học sinh thuộc lớp còn hoạt động và khác lớp nhận.
      return allStudents().filter(s=>{
        const c=classById(s.classId);
        return s.classId!==targetClassId && canReceiveMakeupClass(c);
      }).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'vi') || String(a.className||'').localeCompare(String(b.className||''),'vi'));
    }

function addManualMakeupToAttendance(targetClassId,sessionKey){
      const studentId=document.getElementById('manualMakeupStudent')?.value;
      if(!studentId){toast('Chọn học sinh học bù');return}
      const targetSession=sessionObjectFromKey(sessionKey);
      if(!targetSession || !canReceiveMakeupSession(sessionKey)){toast(makeupSessionPlacementReason(sessionKey)||'Không thể xếp học bù vào buổi này');return}
      if(!canReceiveMakeupClass(classById(targetClassId))){toast('Không thể xếp học bù vào lớp đã kết thúc hoặc đã hủy');return}
      const currentTotal=totalRosterCountForSession(targetClassId,sessionKey);
      if(currentTotal>=(db.settings.capacity||15)){toast(`Lớp đã đủ tối đa ${db.settings.capacity||15} học sinh, không thể thêm học bù`);return}
      const st=studentById(studentId); const rec=attendanceRecord(sessionKey);
      if(rec.manualMakeups.some(m=>m.student.id===studentId) || makeupStudentsForSession(sessionKey).some(x=>x.student.id===studentId)){toast('Học sinh đã có trong danh sách học bù buổi này');return}
      rec.manualMakeups.push({id:'manual_'+Date.now(),student:{...st,className:classById(st.classId).name},sourceClassId:st.classId,targetClassId,targetSessionKey:sessionKey,status:'manual'});
      rec.rows[`manual_makeup_${studentId}`]={studentId,type:'manual_makeup',status:'present',note:'Thêm học bù'};
      v8bScheduleAttendanceDraftPersist(); toast('Đã thêm học bù'); openAttendance(targetClassId,sessionKey,true,{preserveScroll:true});
    }

function rollupAttendanceFromSessions(studentId){
      const rows=Object.values(ensureAttendanceSessions()).flatMap(rec=>Object.values(rec.rows||{}).filter(r=>r.studentId===studentId && rec.saved));
      const present=rows.filter(r=>r.status==='present' && r.type==='official').length;
      const late=rows.filter(r=>r.status==='late' && r.type==='official').length;
      const absent=rows.filter(r=>r.status==='absent' && r.type==='official').length;
      const makeup=rows.filter(r=>(r.type==='makeup'||r.type==='manual_makeup') && (r.status==='present'||r.status==='late')).length;
      return {present,late,absent,excused:0,makeup};
    }
