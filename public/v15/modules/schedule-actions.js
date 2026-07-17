/*
 * Phase 8D.2 schedule-actions.js
 * Tách runtime nghiệp vụ liên kết khỏi app core. Không đổi API hoặc nghiệp vụ.
 */

async function cancelClassSession(sessionKey){
      if(!canManageOperations()) return;
      const busyKey=`cancelClass:${sessionKey}`;
      if(v20o2IsBusy(busyKey)) return;
      const s=sessionObjectFromKey(sessionKey); if(!s) return;
      const ok=confirm(canViewTuition()
        ? 'Cho nghỉ cả lớp buổi này? Khoản tiền của buổi nghỉ sẽ được khấu trừ vào học phí tháng sau cho học sinh trong lớp.'
        : 'Cho nghỉ cả lớp buổi này? Hệ thống sẽ cập nhật toàn bộ dữ liệu liên quan theo quy định của trung tâm.');
      if(!ok) return;
      const reason=prompt('Lý do cho nghỉ lớp:', 'Trung tâm cho nghỉ lớp') || 'Trung tâm cho nghỉ lớp';
      normalizeClassOperations();
      try{
        v20o2SetBusy(busyKey,true);
        const data=await officialFetch('/api/schedule/cancellations',{method:'POST',body:JSON.stringify({sessionKey,classId:s.classId,date:s.date,day:s.day,start:s.start,end:s.end,reason})});
        db.classCancellations[sessionKey]=data.cancellation;
        if(canViewTuition()) await refreshOfficialTuitionState({skipSave:true});
        v18fUpdateScheduleModuleCache();
        if(canViewTuition()) v18fUpdateTuitionModuleCache();
        v20bAfterMutation(canViewTuition()?['schedule','attendance','tuition']:['schedule','attendance']);
        v20b13InvalidateScheduleAfterMutation();
        save(); toast(canViewTuition()?'Đã cho nghỉ lớp và tạo khấu trừ tháng sau':'Đã cho nghỉ lớp'); render();
      }catch(e){toast(e.message||'Không thể cho nghỉ lớp')}
      finally{v20o2SetBusy(busyKey,false)}
    }

async function uncancelClassSession(sessionKey){
      if(!canManageOperations()) return;
      const busyKey=`uncancelClass:${sessionKey}`;
      if(v20o2IsBusy(busyKey)) return;
      normalizeClassOperations();
      const cm=classMakeupForSourceSession(sessionKey);
      if(cm && classMakeupHasSavedAttendance(cm)){
        toast('Buổi dạy bù này đã có điểm danh, không thể mở lại buổi nghỉ.');
        return;
      }
      const msg=canViewTuition()
        ? (cm
          ? 'Buổi nghỉ này đang có lịch dạy bù. Mở lại buổi học sẽ hủy mềm lịch dạy bù liên quan và hủy khấu trừ tháng sau. Tiếp tục?'
          : 'Mở lại buổi học này? Khoản khấu trừ tháng sau phát sinh từ buổi nghỉ sẽ bị hủy.')
        : (cm
          ? 'Buổi nghỉ này đang có lịch dạy bù. Mở lại buổi học sẽ hủy lịch dạy bù liên quan. Tiếp tục?'
          : 'Mở lại buổi học này?');
      if(!confirm(msg)) return;
      try{
        v20o2SetBusy(busyKey,true);
        await officialFetch(`/api/schedule/cancellations?sessionKey=${encodeURIComponent(sessionKey)}`,{method:'DELETE'});
        delete db.classCancellations[sessionKey];
        if(cm){
          db.classMakeupSessions=(db.classMakeupSessions||[]).map(m=>m.sourceSessionKey===sessionKey?{...m,status:'cancelled'}:m);
        }
        if(canViewTuition()) await refreshOfficialTuitionState({skipSave:true});
        v18fUpdateScheduleModuleCache();
        if(canViewTuition()) v18fUpdateTuitionModuleCache();
        v20bAfterMutation(canViewTuition()?['schedule','attendance','tuition']:['schedule','attendance']);
        v20b13InvalidateScheduleAfterMutation();
        save(); closeModal(); toast(canViewTuition()?'Đã mở lại buổi học và hủy khấu trừ liên quan':'Đã mở lại buổi học'); render();
      }catch(e){toast(e.message||'Không mở lại được buổi học')}
      finally{v20o2SetBusy(busyKey,false)}
    }

async function cancelClassMakeup(sourceSessionKey){
      if(!canManageOperations()) return;
      normalizeClassOperations();
      const cm=classMakeupForSourceSession(sourceSessionKey) || classMakeupForAnySessionKey(sourceSessionKey);
      if(!cm){toast('Không tìm thấy lịch dạy bù cần hủy');return}
      if(classMakeupHasSavedAttendance(cm)){
        toast('Buổi dạy bù này đã có điểm danh, không thể hủy dạy bù.');
        return;
      }
      if(!confirm('Hủy lịch dạy bù này? Buổi nghỉ gốc vẫn được giữ và có thể xếp dạy bù lại.')) return;
      try{
        await officialFetch(`/api/schedule/class-makeup?sourceSessionKey=${encodeURIComponent(cm.sourceSessionKey)}`,{method:'DELETE'});
        db.classMakeupSessions=(db.classMakeupSessions||[]).map(m=>m.sourceSessionKey===cm.sourceSessionKey?{...m,status:'cancelled'}:m);
        v18fUpdateScheduleModuleCache();
        v20bAfterMutation(['schedule','attendance','makeup']);
        v20b13InvalidateScheduleAfterMutation();
        save(); closeModal(); toast('Đã hủy lịch dạy bù'); render();
      }catch(e){toast(e.message||'Không hủy được lịch dạy bù')}
    }

function teacherOptionsWithEmpty(selectedId='',emptyLabel='Không chọn'){
      const active=(db.teachers||[]).filter(t=>t.status!=='inactive');
      return `<option value="">${h(emptyLabel)}</option>`+active.map(t=>`<option value="${t.id}" ${String(t.id)===String(selectedId||'')?'selected':''}>${h(t.name)}${t.roles?.includes('manager')?' • Quản lí':''}</option>`).join('');
    }

function tutoringPendingRows(monthKey=makeupSelectedMonthKey()){
      if(makeupMonthDeleted(monthKey)) return [];
      const st=makeupTabStateForMonth(monthKey);
      return makeupTabPendingRows(st,monthKey);
    }

function tutoringStudentChecklist(monthKey=makeupSelectedMonthKey(),query=''){
      const rows=tutoringPendingRows(monthKey).filter(x=>smartSearchMatch(smartSearchIndex(x.student?.name,x.sourceClass?.name,x.record?.sourceSessionLabel,x.record?.reason,classGradeLabel(x.sourceClass?.name)),query));
      if(!rows.length) return '<div class="empty">Không có học sinh chờ học bù trong tháng này.</div>';
      const grouped=new Map();
      rows.forEach(x=>{const g=classGradeLabel(x.sourceClass?.name||'Khác')||'Khác'; if(!grouped.has(g)) grouped.set(g,[]); grouped.get(g).push(x);});
      return [...grouped.entries()].map(([grade,items])=>`<div class="makeupGroup"><h3>${h(grade)}</h3><div class="modalTableWrap"><table class="modalTable"><thead><tr><th>Chọn</th><th>Học sinh</th><th>Lớp vắng</th><th>Buổi vắng</th></tr></thead><tbody>${items.map(x=>`<tr><td><input type="checkbox" class="tutoringAbsenceCheck" value="${h(x.record.id)}"></td><td><b>${h(x.student.name)}</b></td><td>${h(x.sourceClass.name)}</td><td>${h(x.record.sourceSessionLabel||safeSessionLabel(x.record.sourceSessionKey))}</td></tr>`).join('')}</tbody></table></div></div>`).join('');
    }

async function openTutoringClassModal(monthKey=makeupSelectedMonthKey()){
      if(!canManageOperations()){toast('Không có quyền tạo lớp học kèm');return}
      if(!db.makeupTabState || db.makeupTabState.month!==monthKey){
        modal(`<div class="modalHead"><h2>Thêm lớp học kèm</h2><button class="close" onclick="closeModal()">×</button></div><div class="empty">Đang tải danh sách chờ học bù...</div>`);
        await refreshOfficialMakeupState({month:monthKey,applyGlobal:true,skipSave:true}).catch(e=>toast(e.message||'Không tải được học bù'));
      }
      await refreshMakeupMonths();
      const today=isoDate(new Date());
      const monthOptions=makeupMonthOptions(monthKey);
      const teacherOptions=classMakeupTeacherOptions('', currentTeacherRecord()?.id||'') || '<option value="">Chưa có giáo viên</option>';
      const taOptions=teacherOptionsWithEmpty('', 'Không chọn TA');
      modal(`<div class="modalHead"><h2>Thêm lớp học kèm</h2><button class="close" onclick="closeModal()">×</button></div>
        <div class="formGrid"><label>Tên lớp học kèm<input id="tutoringName" class="input" placeholder="VD: Học kèm G3.3 tối thứ 7"></label><label>Tháng dữ liệu vắng<select id="tutoringMonth" class="input" onchange="openTutoringClassModal(this.value)">${monthOptions}</select></label><label>Giáo viên dạy<select id="tutoringTeacher" class="input">${teacherOptions}</select></label><label>TA<select id="tutoringTA" class="input">${taOptions}</select></label><label>Ngày dạy<input id="tutoringDate" class="input" type="date" value="${today}"></label><label>Giờ bắt đầu<input id="tutoringStart" class="input" type="time" value="19:00"></label><label>Giờ kết thúc<input id="tutoringEnd" class="input" type="time" value="20:30"></label><label>Tìm học sinh<input id="tutoringSearch" class="input" placeholder="Tìm tên, lớp, buổi vắng..." oninput="document.getElementById('tutoringList').innerHTML=tutoringStudentChecklist(document.getElementById('tutoringMonth').value,this.value)"></label></div>
        <div class="panel softPanel"><div class="panelHead"><h2>Chọn học sinh chờ học bù</h2><span class="pill yellow">${formatMonthKeyVN(monthKey)}</span></div><div id="tutoringList">${tutoringStudentChecklist(monthKey)}</div></div>
        <div style="text-align:right;margin-top:14px"><button class="btn ghost" onclick="closeModal()">Hủy</button><button class="btn primary" onclick="submitTutoringClass()">Tạo lớp học kèm</button></div>`);
    }

async function submitTutoringClass(){
      const name=(document.getElementById('tutoringName')?.value||'').trim();
      const teacherId=document.getElementById('tutoringTeacher')?.value||'';
      const assistantTeacherId=document.getElementById('tutoringTA')?.value||'';
      const date=document.getElementById('tutoringDate')?.value||'';
      const start=document.getElementById('tutoringStart')?.value||'';
      const end=document.getElementById('tutoringEnd')?.value||'';
      const absenceIds=[...document.querySelectorAll('.tutoringAbsenceCheck:checked')].map(x=>x.value);
      if(!name){toast('Nhập tên lớp học kèm');return}
      if(!teacherId){toast('Chọn giáo viên dạy');return}
      if(!date||!start||!end||start>=end){toast('Ngày hoặc giờ học chưa hợp lệ');return}
      if(!absenceIds.length){toast('Chọn ít nhất một học sinh');return}
      try{
        const data=await officialFetch('/api/schedule/tutoring',{method:'POST',body:JSON.stringify({name,teacherId,assistantTeacherId,date,start,end,absenceIds})});
        db.classMakeupSessions=v20bMergeClassMakeupSessions(db.classMakeupSessions||[],[data.classMakeup]);
        v20b7MergeClassSnapshotsFromMakeups(db.classMakeupSessions);
        db.makeupPlans=[...(db.makeupPlans||[]).filter(p=>!(data.makeupPlans||[]).some(np=>String(np.id)===String(p.id))),...(data.makeupPlans||[])];
        const ids=new Set(absenceIds.map(String));
        (db.absenceRecords||[]).forEach(a=>{if(ids.has(String(a.id))) a.status='scheduled'});
        if(db.makeupTabState){
          db.makeupTabState.makeupPlans=[...(db.makeupTabState.makeupPlans||[]).filter(p=>!(data.makeupPlans||[]).some(np=>String(np.id)===String(p.id))),...(data.makeupPlans||[])];
          (db.makeupTabState.absenceRecords||[]).forEach(a=>{if(ids.has(String(a.id))) a.status='scheduled'});
        }
        v20bAfterMutation(['schedule','makeup','attendance'],{targetSessionKey:data.targetSessionKey||data.classMakeup?.sourceSessionKey,month:date.slice(0,7),force:true});
        v20b13InvalidateScheduleAfterMutation();
        save(); toast('Đã tạo lớp học kèm'); closeModal(); if(route==='schedule') renderApp();
      }catch(e){toast(e.message||'Không tạo được lớp học kèm')}
    }

function openClassMakeupModal(sourceSessionKey){
      const s=sessionObjectFromKey(sourceSessionKey); if(!s) return;
      const old=(db.classMakeupSessions||[]).find(m=>m.sourceSessionKey===sourceSessionKey);
      const c=classById(s.classId);
      const defaultDate=old?.date || isoDate(addDays(parseISODate(s.date),7));
      const currentSlot=old?`${old.start}-${old.end}`:`${s.start}-${s.end}`;
      const slotOptions=CLASS_TIME_SLOTS.map(x=>`<option value="${x.start}-${x.end}" ${`${x.start}-${x.end}`===currentSlot?'selected':''}>${x.label}</option>`).join('');
      const teacherOptions=classMakeupTeacherOptions(old?.teacherId,c.teacherId);
      modal(`<div class="modalHead"><h2>Xếp / đổi lịch dạy bù</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="formGrid"><label>Buổi nghỉ<input class="input" value="${sessionLabelFromKey(sourceSessionKey)}" disabled></label><label>Ngày dạy bù<input id="classMakeupDate" class="input" type="date" value="${defaultDate}"></label><label>Khung giờ<select id="classMakeupSlot" class="input">${slotOptions}</select></label><label>Giáo viên dạy bù<select id="classMakeupTeacher" class="input">${teacherOptions||'<option value="">Chưa có danh sách giáo viên</option>'}</select></label><label class="full">Ghi chú<input id="classMakeupReason" class="input" value="${old?.reason||'Dạy bù buổi nghỉ'}"></label></div>
      <div style="text-align:right;margin-top:18px"><button class="btn ghost" onclick="closeModal()">Hủy</button> <button class="btn primary" onclick="saveClassMakeup('${sourceSessionKey}')">Lưu lịch dạy bù</button></div>`)
    }

async function saveClassMakeup(sourceSessionKey){
      const src=sessionObjectFromKey(sourceSessionKey); if(!src) return;
      const date=document.getElementById('classMakeupDate')?.value;
      const slot=document.getElementById('classMakeupSlot')?.value||`${src.start}-${src.end}`;
      const [start,end]=slot.split('-');
      if(!date){toast('Chọn ngày dạy bù');return}
      const d=parseISODate(date); const day=WEEK_DAYS[(d.getDay()+6)%7].key;
      const reason=(document.getElementById('classMakeupReason')?.value||'Dạy bù');
      const teacherId=document.getElementById('classMakeupTeacher')?.value||'';
      const teacherName=(db.teachers||[]).find(t=>String(t.id)===String(teacherId))?.name || '';
      if(!teacherId){toast('Chọn giáo viên dạy bù');return}
      try{
        const data=await officialFetch('/api/schedule/class-makeup',{method:'POST',body:JSON.stringify({sourceSessionKey,classId:src.classId,date,day,start,end,reason,teacherId,teacherName})});
        db.classMakeupSessions = v20bMergeClassMakeupSessions(db.classMakeupSessions||[], [data.classMakeup]);
        v20b7MergeClassSnapshotsFromMakeups(db.classMakeupSessions);
        v20bAfterMutation(['schedule','attendance','makeup']);
        v20b13InvalidateScheduleAfterMutation();
        save(); closeModal(); toast('Đã lưu lịch dạy bù'); render();
      }catch(e){toast(e.message||'Không lưu được lịch dạy bù')}
    }

function makeupCandidateSearchIndex(x,label,reason){
      return makeupFreeSearchText(
        x.student?.name,
        smartInitials(x.student?.name),
        x.sourceClass?.name,
        classGradeLabel(x.sourceClass?.name),
        label,
        reason,
        String(label||'').replace(/\D/g,''),
        String(x.record?.sourceSessionKey||'').replace(/\D/g,'')
      );
    }

function scheduleMakeupDraftState(targetClassId,targetSessionKey){
      const same=scheduleMakeupDraft && String(scheduleMakeupDraft.targetClassId)===String(targetClassId) && String(scheduleMakeupDraft.targetSessionKey)===String(targetSessionKey);
      if(!same){
        scheduleMakeupDraft={targetClassId:String(targetClassId||''),targetSessionKey:String(targetSessionKey||''),items:[],cancelPlanIds:[],searchQuery:''};
      }
      scheduleMakeupDraft.items ||= [];
      scheduleMakeupDraft.cancelPlanIds ||= [];
      return scheduleMakeupDraft;
    }

function scheduleMakeupDraftItems(targetClassId,targetSessionKey){
      return scheduleMakeupDraftState(targetClassId,targetSessionKey).items||[];
    }

function scheduleMakeupDraftRecord(absenceIdValue){
      const id=String(absenceIdValue||'');
      return (db.makeupTabState?.absenceRecords||[]).find(a=>String(a?.id||'')===id)
        || (db.absenceRecords||[]).find(a=>String(a?.id||'')===id)
        || null;
    }

function scheduleMakeupDraftRows(targetClassId,targetSessionKey){
      return scheduleMakeupDraftItems(targetClassId,targetSessionKey).map(item=>({
        item,
        record:scheduleMakeupDraftRecord(item.absenceId),
        student:studentById(item.studentId),
        sourceClass:classById(item.sourceClassId)
      })).filter(x=>x.student?.id && x.sourceClass?.id);
    }

function rememberScheduleMakeupSearch(){
      if(!scheduleMakeupDraft) return;
      scheduleMakeupDraft.searchQuery=document.getElementById('makeupCandidateSearch')?.value||scheduleMakeupDraft.searchQuery||'';
      scheduleMakeupDraft.scrollTop=modalBackdrop?.querySelector?.('.modal')?.scrollTop||0;
    }

function queueMakeupCandidate(absenceIdValue,studentId,sourceClassId,sourceSessionKey,targetClassId,targetSessionKey=''){
      rememberScheduleMakeupSearch();
      const draft=scheduleMakeupDraftState(targetClassId,targetSessionKey);
      if(!targetSessionKey){toast('Bạn cần chọn đúng buổi học bù trước');return}
      const targetSession=sessionObjectFromKey(targetSessionKey);
      if(!targetSession || !canOpenScheduleMakeupPopup(targetSessionKey)){
        toast(sessionStatus(targetSession).key==='done'?'Buổi đã điểm danh: hãy bấm Mở điểm danh để thêm học bù rồi lưu lại.':(makeupSessionPlacementReason(targetSessionKey)||'Không thể xếp học bù vào buổi này'));
        return;
      }
      if(!canReceiveMakeupClass(classById(targetClassId))){toast('Không thể xếp học bù vào lớp đã kết thúc hoặc đã hủy');return}
      if(String(sourceClassId||'')===String(targetClassId||'')){toast('Học sinh đã thuộc lớp này, không cần xếp học bù vào chính lớp gốc');return}
      if(draft.items.some(x=>String(x.absenceId)===String(absenceIdValue))){toast('Lượt vắng này đã được chọn');return}
      if(draft.items.some(x=>String(x.studentId)===String(studentId))){toast('Mỗi học sinh chỉ được chọn một lượt vắng cho cùng buổi học bù');return}
      if(plannedMakeupsForSession(targetSessionKey).some(p=>String(p.studentId)===String(studentId))){toast('Học sinh đã có trong buổi học bù này');return}
      const rec=scheduleMakeupDraftRecord(absenceIdValue);
      if(!rec){toast('Không tìm thấy lượt vắng');return}
      if(absenceRecordStatus(absenceIdValue)==='scheduled'){toast('Lượt vắng này đã được xếp học bù');return}
      const capacity=db.settings.capacity||15;
      const cancelIds=new Set((draft.cancelPlanIds||[]).map(String));
      const cancelCount=plannedMakeupsForSession(targetSessionKey).filter(p=>cancelIds.has(String(p.id))).length;
      const projected=Math.max(0,totalRosterCountForSession(targetClassId,targetSessionKey)-cancelCount)+draft.items.length;
      if(projected>=capacity){toast(`Buổi này đã đủ ${capacity} học sinh`);return}
      draft.items.push({
        id:`mk_${Date.now()}_${draft.items.length}_${Math.random().toString(36).slice(2,8)}`,
        absenceId:String(absenceIdValue),
        studentId:String(studentId),
        sourceClassId:String(sourceClassId),
        sourceSessionKey:String(sourceSessionKey||rec.sourceSessionKey||'')
      });
      refreshScheduleMakeupDraftDom(targetClassId,targetSessionKey);
    }

function removeQueuedMakeup(absenceIdValue,targetClassId,targetSessionKey){
      rememberScheduleMakeupSearch();
      const draft=scheduleMakeupDraftState(targetClassId,targetSessionKey);
      draft.items=draft.items.filter(x=>String(x.absenceId)!==String(absenceIdValue));
      refreshScheduleMakeupDraftDom(targetClassId,targetSessionKey);
    }

function queueMakeupCancellation(planId,targetClassId,targetSessionKey){
      rememberScheduleMakeupSearch();
      const draft=scheduleMakeupDraftState(targetClassId,targetSessionKey);
      const plan=plannedMakeupsForSession(targetSessionKey).find(p=>String(p?.id||'')===String(planId||''));
      if(!plan){toast('Không tìm thấy lịch học bù đang hoạt động');return}
      if(String(plan.targetClassId||'')!==String(targetClassId||'') || String(plan.targetSessionKey||'')!==String(targetSessionKey||'')){
        toast('Lịch học bù không thuộc buổi đang mở');return;
      }
      if(!draft.cancelPlanIds.some(id=>String(id)===String(planId))) draft.cancelPlanIds.push(String(planId));
      refreshScheduleMakeupDraftDom(targetClassId,targetSessionKey);
    }

function undoQueuedMakeupCancellation(planId,targetClassId,targetSessionKey){
      rememberScheduleMakeupSearch();
      const draft=scheduleMakeupDraftState(targetClassId,targetSessionKey);
      draft.cancelPlanIds=draft.cancelPlanIds.filter(id=>String(id)!==String(planId));
      refreshScheduleMakeupDraftDom(targetClassId,targetSessionKey);
    }

function makeupCandidateTableRows(rows,targetClassId,targetSessionKey){
      return rows.map((x,i)=>{
        const label=x.record.sourceSessionLabel||sessionLabelFromKey(x.record.sourceSessionKey);
        const reason=x.record.reason||'Vắng';
        const search=makeupCandidateSearchIndex(x,label,reason);
        return `<tr data-makeup-candidate data-absence-id="${h(x.record.id)}" data-student-id="${h(x.student.id)}" data-search="${h(search)}"><td>${i+1}</td><td><b>${h(x.student.name)}</b><div class="mini">${h(classGradeLabel(x.sourceClass.name))}</div></td><td><span class="pill blue">${h(x.sourceClass.name)}</span></td><td>${h(label)}</td><td>${h(reason)}</td><td><button class="btn primary smallBtn" onclick="queueMakeupCandidate('${x.record.id}','${x.student.id}','${x.sourceClass.id}','${x.record.sourceSessionKey}','${targetClassId}','${targetSessionKey}')">Chọn</button></td></tr>`;
      }).join('');
    }

function groupedMakeupCandidateTables(candidates,targetClassId,targetSessionKey){
      const map=new Map();
      candidates.forEach(x=>{
        const k=classGradeLabel(x.sourceClass?.name);
        if(!map.has(k)) map.set(k,[]);
        map.get(k).push(x);
      });
      const groups=[...map.entries()].sort((a,b)=>{
        const av=a[1][0]?.sourceClass?.name||a[0];
        const bv=b[1][0]?.sourceClass?.name||b[0];
        return gradeOrderValue(av)-gradeOrderValue(bv) || String(a[0]).localeCompare(String(b[0]),'vi',{numeric:true});
      });
      return groups.map(([grade,items])=>{
        const sorted=items.sort((a,b)=>String(a.sourceClass?.name||'').localeCompare(String(b.sourceClass?.name||''),'vi',{numeric:true}) || String(a.student?.name||'').localeCompare(String(b.student?.name||''),'vi'));
        return `<section class="makeupGroup" data-makeup-group><div class="makeupGroupHead"><h3>${h(grade)}</h3><span class="pill gray">${sorted.length} lượt</span></div><div class="modalTableWrap makeupAssignTableWrap"><table class="modalTable makeupAssignTable"><thead><tr><th>STT</th><th>Học sinh</th><th>Lớp vắng</th><th>Buổi vắng</th><th>Lý do</th><th></th></tr></thead><tbody>${makeupCandidateTableRows(sorted,targetClassId,targetSessionKey)}</tbody></table></div></section>`;
      }).join('');
    }

function scheduledMakeupTable(plans,draftRows,draft,targetClassId,targetSessionKey){
      const cancelIds=new Set((draft?.cancelPlanIds||[]).map(String));
      const cancelCount=plans.filter(p=>cancelIds.has(String(p.id))).length;
      const changeCount=draftRows.length+cancelCount;
      const projectedAssigned=Math.max(0,plans.length-cancelCount+draftRows.length);
      const confirmLabel=changeCount===1?'Lưu 1 thay đổi':`Lưu ${changeCount} thay đổi`;
      const rows=[
        ...plans.map((p,i)=>{
          const pendingCancel=cancelIds.has(String(p.id));
          return `<tr class="${pendingCancel?'makeupCancelDraftRow':''}"><td>${i+1}</td><td><b>${safeStudentName(p.studentId)}</b>${pendingCancel?'<div class="mini">Sẽ quay lại danh sách Chờ xếp sau khi lưu</div>':''}</td><td>${safeClassName(p.sourceClassId)}</td><td>${safeSessionLabel(p.targetSessionKey)}</td><td>${pendingCancel?'<span class="pill red">Chờ hủy</span>':makeupPlanStatusBadge(p)}</td><td>${pendingCancel?`<button class="btn ghost smallBtn" onclick="undoQueuedMakeupCancellation('${p.id}','${targetClassId}','${targetSessionKey}')">Hoàn tác</button>`:`<button class="btn ghost smallBtn" onclick="queueMakeupCancellation('${p.id}','${targetClassId}','${targetSessionKey}')">Hủy</button>`}</td></tr>`;
        }),
        ...draftRows.map((x,i)=>`<tr class="makeupDraftRow"><td>${plans.length+i+1}</td><td><b>${h(x.student.name)}</b><div class="mini">Chưa lưu vào hệ thống</div></td><td>${h(x.sourceClass.name)}</td><td>${safeSessionLabel(targetSessionKey)}</td><td><span class="pill yellow">Chờ thêm</span></td><td><button class="btn ghost smallBtn" onclick="removeQueuedMakeup('${x.item.absenceId}','${targetClassId}','${targetSessionKey}')">Bỏ chọn</button></td></tr>`)
      ];
      return `<section id="makeupAssignedSection" class="makeupAssignedSection"><div class="makeupAssignedHead"><div><h3>Đã xếp trong buổi này (${projectedAssigned})</h3><div class="mini">${Math.max(0,plans.length-cancelCount)} giữ nguyên${draftRows.length?` • ${draftRows.length} chờ thêm`:''}${cancelCount?` • ${cancelCount} chờ hủy`:''}</div></div><button id="confirmMakeupBatchBtn" class="btn primary" ${changeCount?'':'disabled'} onclick="confirmScheduleMakeupBatch('${targetClassId}','${targetSessionKey}')">${changeCount?confirmLabel:'Lưu thay đổi'}</button></div><div class="modalTableWrap makeupAssignTableWrap makeupAssignedTableWrap"><table class="modalTable makeupAssignTable"><thead><tr><th>STT</th><th>Học sinh</th><th>Lớp gốc</th><th>Buổi học bù</th><th>Trạng thái</th><th></th></tr></thead><tbody>${rows.length?rows.join(''):'<tr><td colspan="6"><div class="empty compactEmpty">Chưa có học sinh được xếp vào buổi này.</div></td></tr>'}</tbody></table></div></section>`;
    }

function scheduleMakeupCandidatesRegionHtml(candidates,targetClassId,targetSessionKey,emptyReason,draft){
      const candidateTables=groupedMakeupCandidateTables(candidates,targetClassId,targetSessionKey);
      return `<div id="makeupCandidatesRegion"><div class="makeupSearchBox"><label>Tìm học sinh chờ học bù<input id="makeupCandidateSearch" class="input" value="${h(draft.searchQuery||'')}" placeholder="Gõ tên, viết tắt, lớp, buổi vắng..." oninput="scheduleMakeupDraft.searchQuery=this.value;filterMakeupCandidates(this.value)"></label><span class="pill gray" id="makeupSearchCount">Hiện ${candidates.length}/${candidates.length} lượt chờ</span></div><h3 id="makeupPendingHeading">Chờ xếp (${candidates.length})</h3>${candidates.length?candidateTables:`<div class="empty">${h(emptyReason)}</div>`}</div>`;
    }

function refreshScheduleMakeupDraftDom(targetClassId,targetSessionKey){
      const root=modalBackdrop?.querySelector?.('[data-schedule-makeup-modal]');
      if(!root){
        openScheduleMakeup(targetClassId,targetSessionKey);
        return;
      }
      rememberScheduleMakeupSearch();
      const modalEl=modalBackdrop?.querySelector?.('.modal');
      const scrollTop=modalEl?.scrollTop||0;
      const activeId=document.activeElement?.id||'';
      const selectionStart=activeId==='makeupCandidateSearch'?document.activeElement?.selectionStart:null;
      const draft=scheduleMakeupDraftState(targetClassId,targetSessionKey);
      const targetMonth=sessionKeyMonth(targetSessionKey)||makeupCurrentMonthKey();
      const plans=plannedMakeupsForSession(targetSessionKey);
      const draftRows=scheduleMakeupDraftRows(targetClassId,targetSessionKey);
      const cancelIds=new Set((draft.cancelPlanIds||[]).map(String));
      const cancelCount=plans.filter(p=>cancelIds.has(String(p.id))).length;
      const savedTotal=totalRosterCountForSession(targetClassId,targetSessionKey);
      const projectedTotal=Math.max(0,savedTotal-cancelCount+draftRows.length);
      const capacity=db.settings.capacity||15;
      const allPending=pendingMakeupRows(targetMonth);
      const draftAbsenceIds=new Set(draft.items.map(x=>String(x.absenceId)));
      const draftStudentIds=new Set(draft.items.map(x=>String(x.studentId)));
      const canPlace=canOpenScheduleMakeupPopup(targetSessionKey) && projectedTotal<capacity;
      const allCandidates=absentCandidatesForTargetSession(targetClassId,targetSessionKey,{cancelPlanIds:[...cancelIds]});
      const candidates=canPlace?allCandidates.filter(x=>!draftAbsenceIds.has(String(x.record.id)) && !draftStudentIds.has(String(x.student.id))):[];
      const sessionPlacementReason=makeupSessionPlacementReason(targetSessionKey);
      const emptyReason=sessionPlacementReason || (projectedTotal>=capacity?`Buổi này đã đủ ${capacity} học sinh.`:allPending.length?'Không có lượt vắng phù hợp cho buổi này.':'Chưa có học sinh chờ học bù. Hãy lưu điểm danh với trạng thái Vắng trước.');
      const assignedEl=root.querySelector('#makeupAssignedSection');
      if(assignedEl) assignedEl.outerHTML=scheduledMakeupTable(plans,draftRows,draft,targetClassId,targetSessionKey);
      const summaryEl=root.querySelector('#makeupScheduleSummary');
      if(summaryEl){
        summaryEl.innerHTML=`<span class="capacityBadge ${projectedTotal>=capacity?'full':''}">Tổng dự kiến ${projectedTotal}/${capacity}</span> <span class="pill blue">${Math.max(0,plans.length-cancelCount)} giữ nguyên</span>${draftRows.length?` <span class="pill yellow">${draftRows.length} chờ thêm</span>`:''}${cancelCount?` <span class="pill red">${cancelCount} chờ hủy</span>`:''} <span class="pill gray">${allPending.length} lượt đang chờ</span>`;
      }
      const candidatesEl=root.querySelector('#makeupCandidatesRegion');
      if(candidatesEl) candidatesEl.outerHTML=scheduleMakeupCandidatesRegionHtml(candidates,targetClassId,targetSessionKey,emptyReason,draft);
      if(draft.searchQuery) filterMakeupCandidates(draft.searchQuery);
      if(modalEl) modalEl.scrollTop=scrollTop;
      if(activeId==='makeupCandidateSearch'){
        const input=document.getElementById('makeupCandidateSearch');
        if(input){
          input.focus({preventScroll:true});
          if(Number.isInteger(selectionStart)) input.setSelectionRange(selectionStart,selectionStart);
        }
      }
    }

function openScheduleMakeup(targetClassId,targetSessionKey=null){
      normalizeMakeupPlans(); ensureAbsenceRecords();
      const targetMonth=targetSessionKey?(sessionKeyMonth(targetSessionKey)||makeupCurrentMonthKey()):makeupCurrentMonthKey();
      let monthStateOk=v22CurrentMakeupStateFresh(targetMonth);
      if(!monthStateOk){
        const prefetched=v22FreshMakeupMonthPayload(targetMonth);
        if(prefetched) monthStateOk=v22ApplyMakeupPayloadForPopup(targetMonth,prefetched);
      }
      if(targetSessionKey && !monthStateOk && scheduleMakeupMonthLoadingKey!==targetSessionKey){
        scheduleMakeupMonthLoadingKey=targetSessionKey;
        modal(`<div data-schedule-makeup-modal data-disable-modal-autofocus><div class="modalHead"><h2>Xếp học bù</h2><button class="close" onclick="closeModal()">×</button></div><div class="empty">Đang tải dữ liệu học bù tháng này...</div></div>`);
        v22PreloadMakeupMonth(targetMonth,{force:true}).then(payload=>v22ApplyMakeupPayloadForPopup(targetMonth,payload)).catch(e=>toast(e.message||'Không tải được dữ liệu học bù')).finally(()=>{
          scheduleMakeupMonthLoadingKey='';
          openScheduleMakeup(targetClassId,targetSessionKey);
        });
        return;
      }
      const draft=scheduleMakeupDraftState(targetClassId,targetSessionKey);
      const target=classById(targetClassId)||{};
      const targetSession=sessionObjectFromKey(targetSessionKey);
      const plans=targetSessionKey?plannedMakeupsForSession(targetSessionKey):[];
      const draftRows=scheduleMakeupDraftRows(targetClassId,targetSessionKey);
      const cancelIds=new Set((draft.cancelPlanIds||[]).map(String));
      const cancelCount=plans.filter(p=>cancelIds.has(String(p.id))).length;
      const savedTotal=targetSessionKey?totalRosterCountForSession(targetClassId,targetSessionKey):0;
      const projectedTotal=Math.max(0,savedTotal-cancelCount+draftRows.length);
      const capacity=db.settings.capacity||15;
      const canPlace=!!(targetSessionKey && canOpenScheduleMakeupPopup(targetSessionKey) && projectedTotal<capacity);
      const allPending=pendingMakeupRows(targetMonth);
      const draftAbsenceIds=new Set(draft.items.map(x=>String(x.absenceId)));
      const draftStudentIds=new Set(draft.items.map(x=>String(x.studentId)));
      const allCandidates=targetSessionKey?absentCandidatesForTargetSession(targetClassId,targetSessionKey,{cancelPlanIds:[...cancelIds]}):[];
      const candidates=canPlace?allCandidates.filter(x=>!draftAbsenceIds.has(String(x.record.id)) && !draftStudentIds.has(String(x.student.id))):[];
      const assignedTable=scheduledMakeupTable(plans,draftRows,draft,targetClassId,targetSessionKey);
      const sessionPlacementReason=targetSessionKey?makeupSessionPlacementReason(targetSessionKey):'Chọn một buổi trong thời khóa biểu.';
      const emptyReason=!targetSessionKey?'Chọn một buổi trong thời khóa biểu.':sessionPlacementReason || (projectedTotal>=capacity?`Buổi này đã đủ ${capacity} học sinh.`:allPending.length?'Không có lượt vắng phù hợp cho buổi này.':'Chưa có học sinh chờ học bù. Hãy lưu điểm danh với trạng thái Vắng trước.');
      modal(`<div data-schedule-makeup-modal data-disable-modal-autofocus><div class="modalHead"><h2>Xếp học bù - ${h(target.name||'Lớp')}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="rulesBox compactRules"><b>${targetSessionKey?sessionLabelFromKey(targetSessionKey):'Chưa chọn buổi'}</b><div id="makeupScheduleSummary" style="margin-top:8px"><span class="capacityBadge ${projectedTotal>=capacity?'full':''}">Tổng dự kiến ${projectedTotal}/${capacity}</span> <span class="pill blue">${Math.max(0,plans.length-cancelCount)} giữ nguyên</span>${draftRows.length?` <span class="pill yellow">${draftRows.length} chờ thêm</span>`:''}${cancelCount?` <span class="pill red">${cancelCount} chờ hủy</span>`:''} <span class="pill gray">${allPending.length} lượt đang chờ</span></div></div>
      ${assignedTable}
      ${!targetSessionKey?`<div class="empty">${h(emptyReason)}</div>`:scheduleMakeupCandidatesRegionHtml(candidates,targetClassId,targetSessionKey,emptyReason,draft)}
      </div>`);
      setTimeout(()=>{
        if(draft.searchQuery) filterMakeupCandidates(draft.searchQuery);
        const modalEl=modalBackdrop?.querySelector?.('.modal');
        if(modalEl && draft.scrollTop) modalEl.scrollTop=draft.scrollTop;
      },0);
    }

function mergeConfirmedMakeupBatch(data){
      const plans=Array.isArray(data?.plans)?data.plans:(data?.plan?[data.plan]:[]);
      const cancelledPlans=Array.isArray(data?.cancelledPlans)?data.cancelledPlans:[];
      const absenceRecords=Array.isArray(data?.absenceRecords)?data.absenceRecords:(data?.absenceRecord?[data.absenceRecord]:[]);
      db.makeupPlans ||= [];
      [...plans,...cancelledPlans].forEach(plan=>{
        db.makeupPlans=db.makeupPlans.filter(p=>String(p?.id||'')!==String(plan?.id||''));
        db.makeupPlans.push(plan);
      });
      const mergeAbsences=(arr=[])=>{
        absenceRecords.forEach(updated=>{
          const i=arr.findIndex(a=>String(a?.id||'')===String(updated?.id||''));
          if(i>=0) arr[i]={...arr[i],...updated}; else arr.push(updated);
        });
      };
      db.absenceRecords ||= [];
      mergeAbsences(db.absenceRecords);
      if(db.makeupTabState){
        db.makeupTabState.makeupPlans ||= [];
        [...plans,...cancelledPlans].forEach(plan=>{
          db.makeupTabState.makeupPlans=db.makeupTabState.makeupPlans.filter(p=>String(p?.id||'')!==String(plan?.id||''));
          db.makeupTabState.makeupPlans.push(plan);
        });
        db.makeupTabState.absenceRecords ||= [];
        mergeAbsences(db.makeupTabState.absenceRecords);
        db.makeupTabState.updatedAt=Date.now();
      }
      return {plans,cancelledPlans};
    }

function v22RefreshScheduleBehindMakeupModal(sessionKeys=[]){
      if(v18Memo.scheduleCellMap) v18Memo.scheduleCellMap.key='';
      if(v18Memo.scheduleDayMap) v18Memo.scheduleDayMap.key='';
      v18Memo.weekKey='';
      v18Memo.weekSessions=null;
      lazyRouteState.schedule={...(lazyRouteState.schedule||{}),loaded:true,loading:false,loadedAt:Date.now(),mutated:true};
      if(route==='schedule' && !v8bPatchScheduleSessions(sessionKeys)) v18dRenderPageOnly(navItems());
    }

async function confirmScheduleMakeupBatch(targetClassId,targetSessionKey){
      rememberScheduleMakeupSearch();
      const draft=scheduleMakeupDraftState(targetClassId,targetSessionKey);
      const items=[...(draft.items||[])];
      const cancelPlanIds=[...(draft.cancelPlanIds||[])];
      if(!items.length && !cancelPlanIds.length){toast('Chưa có thay đổi để lưu');return}
      const targetSession=sessionObjectFromKey(targetSessionKey);
      if(!targetSession){toast('Không tìm thấy buổi học');return}
      if(items.length && !canOpenScheduleMakeupPopup(targetSessionKey)){toast('Buổi này không còn nhận học bù theo cách xếp trước giờ học');return}
      const capacity=db.settings.capacity||15;
      const validCancelCount=plannedMakeupsForSession(targetSessionKey).filter(p=>cancelPlanIds.some(id=>String(id)===String(p.id))).length;
      if(Math.max(0,totalRosterCountForSession(targetClassId,targetSessionKey)-validCancelCount)+items.length>capacity){toast(`Số học sinh vượt quá sĩ số tối đa ${capacity}`);return}
      const btn=document.getElementById('confirmMakeupBatchBtn');
      const action=window.MsUiAction.beginLockedAction(`makeup-batch:${targetSessionKey}`,btn,'Đang lưu...');
      if(!action) return;
      try{
        const data=await window.MsUiAction.measureAsync('Lưu xếp học bù',()=>officialFetch('/api/makeup/plans',{method:'POST',body:JSON.stringify({targetClassId,targetSessionKey,items,cancelPlanIds}),preserveGetCache:true}),450);
        const merged=mergeConfirmedMakeupBatch(data);
        draft.items=[];
        draft.cancelPlanIds=[];
        draft.scrollTop=0;
        const firstChangedPlan=merged.plans[0]||merged.cancelledPlans[0]||null;
        const mutationMonth=sessionKeyMonth(items[0]?.sourceSessionKey||firstChangedPlan?.sourceSessionKey)||sessionKeyMonth(targetSessionKey);
        v20bAfterMutation(['schedule','makeup'],{
          targetSessionKey,
          sourceSessionKey:items[0]?.sourceSessionKey||firstChangedPlan?.sourceSessionKey||'',
          sessionKeys:[
            targetSessionKey,
            ...items.map(x=>x.sourceSessionKey),
            ...merged.cancelledPlans.flatMap(x=>[x?.targetSessionKey,x?.sourceSessionKey])
          ].filter(Boolean),
          month:mutationMonth,
          preserveCache:true,
          renderOnRevalidate:false,
          delayMs:V24A_BATCH_REVALIDATE_IDLE_MS
        });
        saveLocalOnly();
        const changedSessionKeys=[targetSessionKey,...items.map(x=>x.sourceSessionKey),...merged.cancelledPlans.flatMap(x=>[x?.targetSessionKey,x?.sourceSessionKey])].filter(Boolean);
        v22RefreshScheduleBehindMakeupModal(changedSessionKeys);
        const addedCount=merged.plans.length||items.length;
        const cancelledCount=merged.cancelledPlans.length||cancelPlanIds.length;
        const parts=[];
        if(addedCount) parts.push(`thêm ${addedCount}`);
        if(cancelledCount) parts.push(`hủy ${cancelledCount}`);
        toast(`Đã lưu thay đổi: ${parts.join(', ')} học sinh`);
        window.MsUiAction.endLockedAction(action);
        refreshScheduleMakeupDraftDom(targetClassId,targetSessionKey);
      }catch(e){
        window.MsUiAction.endLockedAction(action);
        toast(e.message||'Không xác nhận được danh sách học bù');
        refreshScheduleMakeupDraftDom(targetClassId,targetSessionKey);
      }
    }

function scheduleMakeupFromAbsence(absenceIdValue,studentId,sourceClassId,sourceSessionKey,targetClassId,targetSessionKey=''){
      queueMakeupCandidate(absenceIdValue,studentId,sourceClassId,sourceSessionKey,targetClassId,targetSessionKey);
    }
