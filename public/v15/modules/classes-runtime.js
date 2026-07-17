/*
 * Phase 8D.2 classes-runtime.js
 * Tách runtime nghiệp vụ liên kết khỏi app core. Không đổi API hoặc nghiệp vụ.
 */

function openClassDetail(id,sessionKey=null){
      normalizeMakeupPlans(); normalizeClassOperations();
      const c=classById(id);
      const mk=sessionKey?makeupStudentsForSession(sessionKey):makeupStudentsForClass(id);
      const active=!isClassEnded(c);
      const canEdit=canEditActiveClass(c);
      const actionMarkup=canManageOperations()
        ? (canEdit
          ? `<button class="btn primary" onclick="openEditClassModal('${id}')">Sửa lớp</button><button class="btn primary" onclick="openAddStudentModal('${id}')">+ Thêm học sinh</button><button class="btn primary" onclick="openPromoteClassModal('${id}')">Chuyển cả lớp</button><button class="btn ghost" onclick="openEndClassModal('${id}')">Kết thúc lớp</button><button class="btn ghost" onclick="openDeleteClassModal('${id}')">Xóa lớp</button>`
          : `<span class="pill gray">Lớp đã kết thúc • chỉ xem</span>`)
        : '';
      modal(`<div class="modalHead"><h2>${c.name}</h2><div class="classActionRow">${actionMarkup}<button class="close" onclick="closeModal()">×</button></div></div>
      ${!active?'<div class="lockedClassNotice">🔒 Lớp đã kết thúc. Dữ liệu lớp này được khóa để giữ lịch sử, không thể chỉnh sửa thông tin, học sinh, lịch học hoặc chuyển lớp.</div>':''}
      <div class="modalInfoGrid">
        <div><p><b>Giáo viên:</b> ${c.teacher||'-'}</p><p><b>TA:</b> ${c.ta||'-'}</p><p><b>Lịch học:</b> ${c.time||'-'}</p></div>
        <div><p><b>Ngày bắt đầu:</b> ${c.startDate?formatVNDate(parseISODate(c.startDate)):'-'}</p><p><b>Ngày kết thúc:</b> ${c.endDate?formatVNDate(parseISODate(c.endDate)):'-'}</p><p><span class="pill ${active?'green':'gray'}">${active?'Đang học':'Đã kết thúc'}</span></p></div>
      </div>
      ${c.note?`<div class="rulesBox"><b>Ghi chú lớp:</b> ${h(c.note)}</div>`:''}
      <div class="rosterSectionTitle"><h3>Học sinh chính thức</h3><span class="officialBadge">${c.students.length} học sinh</span></div>
      <div class="modalTableWrap"><table class="modalTable"><thead><tr><th>STT</th><th>Học sinh</th><th>Liên hệ</th><th>Loại</th>${canEdit?'<th>Thao tác</th>':''}</tr></thead><tbody>${c.students.map((s,i)=>`<tr><td>${i+1}</td><td><b>${s.name}</b></td><td>${s.contact||'Chưa có'}</td><td><span class="pill gray">Chính thức</span></td>${canEdit?`<td><div class="studentRowActions"><button class="studentActionBtn transfer" onclick="v8d1OpenStudentTransferAction('transfer','${c.id}','${s.id}',this)">Chuyển lớp</button><button class="studentActionBtn history" onclick="v8d1OpenStudentTransferAction('history','${c.id}','${s.id}',this)">Lịch sử</button><button class="studentActionBtn danger" onclick="openDeleteStudentModal('${c.id}','${s.id}')">Xóa</button></div></td>`:''}</tr>`).join('')}</tbody></table></div>
      <div class="rosterSectionTitle"><h3>${sessionKey?'Học bù buổi này':'Học bù của lớp'}</h3><span class="makeupBadge">${mk.length} học bù</span></div>
      ${sessionKey?makeupStudentMarkupForSession(sessionKey):makeupStudentMarkup(id)}`)
    }

function isClassEnded(c){
      return String(c?.status || '').toLowerCase()==='ended';
    }

function canEditActiveClass(c){
      return canManageOperations() && !!c?.id && !isClassEnded(c);
    }

function assertActiveClassEditable(classId,action='chỉnh sửa lớp'){
      const c=classById(classId);
      if(!c?.id){toast('Không tìm thấy lớp');return null}
      if(!canEditActiveClass(c)){
        toast('Lớp đã kết thúc, không thể chỉnh sửa.');
        return null;
      }
      return c;
    }

function teacherRoleValue(t){return t?.roles?.includes('admin')?'admin':t?.roles?.includes('manager')?'manager':t?.roles?.includes('ta')?'ta':'teacher'}

function classNameExists(name,excludeId=null){
      const key=String(name||'').trim().toLowerCase();
      // V20M: chỉ kiểm tra trùng với lớp đang học. Lớp đã kết thúc là dữ liệu lịch sử.
      return !!key && db.classes.some(c=>String(c.id)!==String(excludeId||'') && !isClassEnded(c) && String(c.name||'').trim().toLowerCase()===key);
    }

function staffRoleMini(t){
      const r=teacherRoleValue(t);
      return r==='manager'?' • Quản lí':r==='admin'?' • Admin':r==='ta'?' • TA':'';
    }

function isPureTA(t){
      const roles=t?.roles||[];
      return roles.includes('ta') && !roles.includes('teacher') && !roles.includes('manager') && !roles.includes('admin');
    }

function staffOptionsForClass(selectedId='',mode='teacher'){
      const selected=String(selectedId||'');
      const rows=(db.teachers||[]).filter(t=>t.status!=='inactive').filter(t=>mode==='ta' || !isPureTA(t));
      const blank=mode==='ta'?'<option value="">-- Không chọn TA --</option>':'';
      return blank + rows.map(t=>`<option value="${h(t.id)}" ${String(t.id)===selected?'selected':''}>${h(t.name)}${staffRoleMini(t)}</option>`).join('');
    }

function editDayOptions(selected='Mon'){
      return WEEK_DAYS.map(d=>`<option value="${d.key}" ${d.key===selected?'selected':''}>${d.label}</option>`).join('');
    }

function editSlotOptions(selected='17:00-18:30'){
      return CLASS_TIME_SLOTS.map(s=>{const v=`${s.start}-${s.end}`;return `<option value="${v}" ${v===selected?'selected':''}>${s.label}</option>`}).join('');
    }

function editInitialSessions(c){
      const parsed=parseClassSessions(c||{}).slice(0,2);
      const fallback1={day:'Mon',start:'17:00',end:'18:30'};
      const fallback2={day:'Wed',start:'17:00',end:'18:30'};
      const s1=parsed[0]||fallback1;
      const s2=parsed[1]||fallback2;
      return [
        {day:s1.day||'Mon',slot:`${s1.start||'17:00'}-${s1.end||'18:30'}`},
        {day:s2.day||'Wed',slot:`${s2.start||'17:00'}-${s2.end||'18:30'}`}
      ];
    }

function buildEditClassTimeFromForm(){
      const count=Number(document.getElementById('editSessionCount')?.value||1);
      const sessions=[];
      for(let i=1;i<=count;i++){
        const day=document.getElementById(`editDay${i}`)?.value || 'Mon';
        const slot=timeSlotByValue(document.getElementById(`editSlot${i}`)?.value || '17:00-18:30');
        sessions.push(`${slot.start.replace(':','h')} - ${slot.end.replace(':','h')} ${day}`);
      }
      return sessions.join('; ');
    }

function schedulePayloadFromEditClassForm(){
      const count=Number(document.getElementById('editSessionCount')?.value||1);
      const schedules=[];
      const seen=new Set();
      for(let i=1;i<=count;i++){
        const day=document.getElementById(`editDay${i}`)?.value || 'Mon';
        const slot=timeSlotByValue(document.getElementById(`editSlot${i}`)?.value || '17:00-18:30');
        const key=`${day}|${slot.start}-${slot.end}`;
        if(seen.has(key)) return {error:'Hai buổi học không được trùng cùng thứ và cùng khung giờ.',schedules:[]};
        seen.add(key);
        schedules.push({day,start:slot.start,end:slot.end});
      }
      return {schedules,error:''};
    }

function scheduleSignatureFromPayload(rows=[]){
      return (rows||[]).map(s=>`${s.day}|${s.start}-${s.end}`).sort().join(';');
    }

function scheduleSignatureForClass(c){
      return scheduleSignatureFromPayload(parseClassSessions(c||{}).map(s=>({day:s.day,start:s.start,end:s.end})));
    }

function scheduleDateFromKey(key){
      const parts=String(key||'').split('|');
      return parts.length>=4 ? parts[1] : '';
    }

function classHasFutureMakeupTargets(classId){
      const today=isoDate(new Date());
      return (db.makeupPlans||[]).some(p=>{
        if(String(p.targetClassId)!==String(classId) || String(p.status||'')==='cancelled') return false;
        const d=scheduleDateFromKey(p.targetSessionKey);
        return !d || d>=today;
      });
    }

function classHasSavedAttendanceInLoadedWeek(classId){
      return Object.values(ensureAttendanceSessions()).some(rec=>{
        const key=String(rec?.sessionKey||'');
        return rec?.saved && key.startsWith(`${classId}|`);
      });
    }

function updateEditClassPreview(){
      const el=document.getElementById('editClassPreview'); if(el) el.textContent=buildEditClassTimeFromForm();
      document.querySelectorAll('.editSession2Only').forEach(x=>x.style.display=Number(document.getElementById('editSessionCount')?.value||1)===2?'block':'none');
    }

function openEditClassModal(classId){
      const c=assertActiveClassEditable(classId,'sửa lớp'); if(!c) return;
      const sessions=editInitialSessions(c);
      const sessionCount=parseClassSessions(c).length>=2?2:1;
      const teacherOptions=staffOptionsForClass(c.teacherId,'teacher');
      const taOptions=staffOptionsForClass(c.taId,'ta');
      modal(`<div class="modalHead"><h2>Sửa lớp ${h(c.name)}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="editClassNotice"><b>Chỉ lớp đang học được chỉnh sửa.</b><br>Lớp đã kết thúc sẽ bị khóa hoàn toàn để giữ dữ liệu lịch sử.</div>
      <div class="formGrid">
        <label>Tên lớp<input id="editClassName" class="input" value="${h(c.name)}" placeholder="VD: G3.1"></label>
        <label>Giáo viên<select id="editTeacher" class="input">${teacherOptions||'<option value="">Chưa phân công</option>'}</select></label>
        <label>Ngày bắt đầu<input id="editStartDate" class="input" type="date" value="${h(c.startDate||isoDate(new Date()))}"></label>
        <label>TA / Trợ giảng<select id="editTA" class="input">${taOptions}</select></label>
        <label>Số buổi/tuần<select id="editSessionCount" class="input" onchange="updateEditClassPreview()"><option value="1" ${sessionCount===1?'selected':''}>1 buổi / tuần</option><option value="2" ${sessionCount===2?'selected':''}>2 buổi / tuần</option></select></label>
        <div></div>
        <div class="full sessionConfigurator">
          <h3>Buổi 1</h3>
          <div class="inline2"><label>Ngày học<select id="editDay1" class="input" onchange="updateEditClassPreview()">${editDayOptions(sessions[0].day)}</select></label><label>Khung giờ<select id="editSlot1" class="input" onchange="updateEditClassPreview()">${editSlotOptions(sessions[0].slot)}</select></label></div>
          <div class="editSession2Only">
            <h3 style="margin-top:14px">Buổi 2</h3>
            <div class="inline2"><label>Ngày học<select id="editDay2" class="input" onchange="updateEditClassPreview()">${editDayOptions(sessions[1].day)}</select></label><label>Khung giờ<select id="editSlot2" class="input" onchange="updateEditClassPreview()">${editSlotOptions(sessions[1].slot)}</select></label></div>
          </div>
          <div class="slotPreview"><b>Lịch học mới:</b> <span id="editClassPreview"></span></div>
        </div>
        <label class="full">Ghi chú lớp<textarea id="editClassNote" class="input" rows="3" placeholder="Ghi chú nội bộ về lớp...">${h(c.note||'')}</textarea></label>
      </div>
      <div style="text-align:right;margin-top:18px"><button class="btn ghost" onclick="openClassDetail('${classId}')">Hủy</button> <button class="btn primary" onclick="saveEditedClass('${classId}')">Lưu thay đổi</button></div>`);
      setTimeout(updateEditClassPreview,0);
    }

async function saveEditedClass(classId){
      const c=assertActiveClassEditable(classId,'sửa lớp'); if(!c) return;
      const name=(document.getElementById('editClassName')?.value||'').trim();
      const teacherId=document.getElementById('editTeacher')?.value||'';
      const taId=document.getElementById('editTA')?.value||'';
      const startDate=document.getElementById('editStartDate')?.value||c.startDate||isoDate(new Date());
      const note=(document.getElementById('editClassNote')?.value||'').trim();
      if(!name){toast('Nhập tên lớp');return}
      if(teacherId && taId && String(teacherId)===String(taId)){toast('Giáo viên chính và TA không nên là cùng một người.');return}
      if(classNameExists(name,classId)){toast('Tên lớp đang học đã tồn tại. Vui lòng chọn tên khác.');return}
      const {schedules,error}=schedulePayloadFromEditClassForm();
      if(error){toast(error);return}
      const oldScheduleSig=scheduleSignatureForClass(c);
      const newScheduleSig=scheduleSignatureFromPayload(schedules);
      const scheduleChanged=oldScheduleSig!==newScheduleSig;
      if(scheduleChanged && classHasFutureMakeupTargets(classId)){
        toast('Lớp đang có học sinh học bù đã xếp vào lịch tương lai. Hãy hủy/xử lý học bù trước khi đổi lịch học.');
        return;
      }
      if(scheduleChanged && classHasSavedAttendanceInLoadedWeek(classId)){
        const ok=confirm('Lớp này đã có điểm danh trong tuần. Đổi lịch sẽ áp dụng cho các buổi mới, dữ liệu điểm danh cũ vẫn được giữ. Tiếp tục lưu?');
        if(!ok) return;
      }
      const action=v28BeginModalAction(document.querySelector('.modal .btn.primary[onclick^="saveEditedClass"]'),'Đang lưu...');
      if(!action) return;

      let data;
      try{
        data=await officialFetch(`/api/classes/${encodeURIComponent(classId)}`,{
          method:'PATCH',
          body:JSON.stringify({name,teacherId,assistantTeacherId:taId,startDate,note,schedules})
        });
      }catch(e){
        v28EndModalAction(action);
        toast(e.message||'Không lưu được lớp');
        return;
      }

      try{
        const updated=data.class || {...c,name,teacherId,taId,startDate,note,time:buildEditClassTimeFromForm()};
        const i=(db.classes||[]).findIndex(x=>String(x.id)===String(classId));
        if(i>=0) db.classes[i]={...db.classes[i],...updated,status:'active'};
        else db.classes.push({...updated,status:'active'});
        v28AfterClassMutation(['schedule','attendance','makeup','evaluation'],{
          classId,
          structural:true,
          delayMs:V28_CLASS_REVALIDATE_DELAY_MS
        });
        openClassDetail(classId);
      }catch(uiError){
        console.error('Đã lưu lớp trên server nhưng cập nhật giao diện cục bộ gặp lỗi',uiError);
        closeModal(true);
        v28RecoverClassUi(classId,true);
      }
      toast(`Đã cập nhật lớp ${name}.`);
    }

function v27VietnamTodayText(){
      try{
        const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
        return `${parts.year}-${parts.month}-${parts.day}`;
      }catch(e){return isoDate(new Date())}
    }

function v27EnrollmentSessionLabel(item){
      if(!item) return '-';
      return `${dayNameFromKey(item.day)||item.day} ${formatVNDate(parseISODate(item.date))} • ${item.start} - ${item.end}`;
    }

function v27ToggleEnrollmentTuition(classId){
      const enabled=!!document.getElementById('newStudentTuitionEnabled')?.checked;
      const box=document.getElementById('newStudentTuitionFields');
      if(box) box.style.display=enabled?'':'none';
      const preview=document.getElementById('newStudentTuitionPreview');
      if(!enabled){
        v27EnrollmentPreviewCache=null;
        if(preview) preview.innerHTML='<div class="mini">Không thu phần còn lại của tháng này. Học phí thường sẽ bắt đầu từ tháng kế tiếp.</div>';
        const btn=document.getElementById('saveNewStudentBtn'); if(btn) btn.disabled=false;
        return;
      }
      v27RefreshEnrollmentPreview(classId,false);
    }

async function v27RefreshEnrollmentPreview(classId,preserveFirst=true){
      const enabled=!!document.getElementById('newStudentTuitionEnabled')?.checked;
      if(!enabled) return;
      const startDate=canViewTuition()?(document.getElementById('newStudentStartDate')?.value||v27VietnamTodayText()):'';
      const targetMonth=canViewTuition()?(document.getElementById('newStudentTargetMonth')?.value||addMonthsToMonthKey(startDate.slice(0,7),1)):'';
      const firstSelect=document.getElementById('newStudentFirstSession');
      const previousFirst=preserveFirst?(firstSelect?.value||''):'';
      const previewBox=document.getElementById('newStudentTuitionPreview');
      const saveBtn=document.getElementById('saveNewStudentBtn');
      const seq=++v27EnrollmentPreviewSeq;
      if(previewBox) previewBox.innerHTML='<div class="mini">Đang tính các buổi còn lại...</div>';
      if(saveBtn) saveBtn.disabled=true;
      try{
        const qs=new URLSearchParams({classId,startDate,targetMonth});
        if(previousFirst) qs.set('firstSessionKey',previousFirst);
        const data=await officialFetch(`/api/tuition/enrollment-preview?${qs.toString()}`);
        if(seq!==v27EnrollmentPreviewSeq) return;
        const pv=data.preview||{};
        v27EnrollmentPreviewCache=pv;
        const targetInput=document.getElementById('newStudentTargetMonth');
        if(targetInput){
          targetInput.min=pv.minimumTargetMonth||'';
          if(targetInput.value!==pv.targetMonth) targetInput.value=pv.targetMonth||'';
        }
        if(firstSelect){
          const options=(pv.availableSessions||[]).map(item=>`<option value="${h(item.sessionKey)}" ${item.sessionKey===pv.firstSessionKey?'selected':''}>${h(v27EnrollmentSessionLabel(item))}</option>`).join('');
          firstSelect.innerHTML=options||'<option value="">Không còn buổi học hợp lệ</option>';
          firstSelect.disabled=!(pv.availableSessions||[]).length;
        }
        if(previewBox){
          const sessions=pv.sessions||[];
          const first=sessions[0];
          const last=sessions[sessions.length-1];
          previewBox.innerHTML=sessions.length?`<div class="enrollmentTuitionPreviewGrid">
            <div><span>Tháng phát sinh</span><b>${h(v27MonthLabel(pv.sourceMonth))}</b></div>
            <div><span>Số buổi còn lại</span><b>${Number(pv.sessionCount||0)} buổi</b></div>
            <div><span>Đơn giá</span><b>${fmt.format(Number(pv.unitPrice||0))}đ</b></div>
            <div><span>Chuyển sang thu</span><b>${h(v27MonthLabel(pv.targetMonth))}</b></div>
          </div>
          <div class="enrollmentTuitionTotal"><span>Khoản phát sinh</span><strong>${fmt.format(Number(pv.amount||0))}đ</strong></div>
          <div class="mini">Từ ${h(v27EnrollmentSessionLabel(first))}${last&&last.sessionKey!==first?.sessionKey?` đến ${h(v27EnrollmentSessionLabel(last))}`:''}. Các buổi trung tâm đã cho nghỉ không được tính.</div>`:
          '<div class="dangerBox compactDanger"><b>Không còn buổi học hợp lệ</b><span>Hãy chọn ngày bắt đầu khác hoặc tắt khoản học phí phát sinh.</span></div>';
        }
        if(saveBtn) saveBtn.disabled=!(pv.sessionCount>0);
      }catch(e){
        if(seq!==v27EnrollmentPreviewSeq) return;
        v27EnrollmentPreviewCache=null;
        if(previewBox) previewBox.innerHTML=`<div class="dangerBox compactDanger"><b>Không tính được học phí</b><span>${h(e.message||'Vui lòng thử lại')}</span></div>`;
        if(saveBtn) saveBtn.disabled=true;
      }
    }

function v27ChangeEnrollmentFirstSession(classId){v27RefreshEnrollmentPreview(classId,true)}

function openAddStudentModal(classId){
      const c=assertActiveClassEditable(classId,'thêm học sinh'); if(!c) return;
      const today=v27VietnamTodayText();
      const nextMonth=addMonthsToMonthKey(today.slice(0,7),1);
      v27EnrollmentPreviewCache=null;
      modal(`<div class="modalHead"><h2>+ Thêm học sinh vào ${h(c.name)}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="formGrid">
        <label>Họ tên học sinh<input id="newStudentName" class="input" placeholder="VD: Minh Anh - Mia"></label>
        <label>Tên phụ huynh / người liên hệ<input id="newParentName" class="input" placeholder="VD: Mẹ Minh Anh"></label>
        <label>Số điện thoại liên hệ<input id="newParentPhone" class="input" placeholder="VD: 0987654321"></label>
        <label>Thông tin liên hệ khác<input id="newStudentContact" class="input" placeholder="VD: Zalo mẹ / bố"></label>
        <label class="full">Ghi chú<input id="newStudentNote" class="input" placeholder="VD: mới đăng ký / cần theo sát"></label>
      </div>
      ${canViewTuition()?`<div class="enrollmentTuitionBlock">
        <label class="checkLine"><input id="newStudentTuitionEnabled" type="checkbox" checked onchange="v27ToggleEnrollmentTuition('${classId}')"><span><b>Tính học phí các buổi còn lại của tháng này</b><small>Tạo một khoản phát sinh và đưa vào cùng hóa đơn tháng sau.</small></span></label>
        <div id="newStudentTuitionFields">
          <div class="formGrid" style="margin-top:12px">
            <label>Ngày bắt đầu học<input id="newStudentStartDate" class="input" type="date" value="${today}" onchange="v27RefreshEnrollmentPreview('${classId}',false)"></label>
            <label>Tháng thu khoản phát sinh<input id="newStudentTargetMonth" class="input" type="month" min="${nextMonth}" value="${nextMonth}" onchange="v27RefreshEnrollmentPreview('${classId}',true)"></label>
            <label class="full">Buổi đầu tiên tính học phí<select id="newStudentFirstSession" class="input" onchange="v27ChangeEnrollmentFirstSession('${classId}')"><option>Đang tải...</option></select></label>
          </div>
          <div id="newStudentTuitionPreview" class="enrollmentTuitionPreview"><div class="mini">Đang tính các buổi còn lại...</div></div>
        </div>
      </div>`:''}
      <div style="text-align:right;margin-top:18px"><button class="btn ghost" onclick="openClassDetail('${classId}')">Quay lại lớp</button> <button id="saveNewStudentBtn" class="btn primary" ${canViewTuition()?'disabled':''} onclick="saveStudentToClass('${classId}',false)">Thêm học sinh</button></div>`);
      if(canViewTuition()) setTimeout(()=>v27RefreshEnrollmentPreview(classId,false),0);
    }

async function saveStudentToClass(classId,quick=false){
      const c=assertActiveClassEditable(classId,'thêm học sinh'); if(!c) return;
      const name=(document.getElementById(quick?`quickStudentName_${classId}`:'newStudentName')?.value||'').trim();
      const contact=(document.getElementById(quick?`quickStudentContact_${classId}`:'newStudentContact')?.value||'').trim();
      const note=(document.getElementById('newStudentNote')?.value||'').trim();
      const parentName=(document.getElementById('newParentName')?.value||'').trim();
      const parentPhone=normalizePhone(document.getElementById('newParentPhone')?.value||'');
      const tuitionEnabled=canViewTuition() && !!document.getElementById('newStudentTuitionEnabled')?.checked;
      const startDate=canViewTuition()?(document.getElementById('newStudentStartDate')?.value||v27VietnamTodayText()):'';
      const targetMonth=canViewTuition()?(document.getElementById('newStudentTargetMonth')?.value||addMonthsToMonthKey(startDate.slice(0,7),1)):'';
      const firstSessionKey=canViewTuition()?(document.getElementById('newStudentFirstSession')?.value||''):'';
      if(!name){toast('Nhập tên học sinh');return}
      if(tuitionEnabled && !firstSessionKey){toast('Chọn buổi đầu tiên tính học phí');return}
      const action=v28BeginModalAction(document.getElementById('saveNewStudentBtn'),'Đang thêm...');
      if(!action) return;

      let data;
      try{
        data=await officialFetch(`/api/classes/${classId}/students`,{method:'POST',body:JSON.stringify({
          name,contact,note,parentName,parentPhone,
          tuitionEnrollment:canViewTuition()?{enabled:tuitionEnabled,startDate,targetMonth,firstSessionKey}:null
        })});
      }catch(e){
        v28EndModalAction(action);
        toast(e.message||'Không thêm được học sinh');
        return;
      }

      const pv=data.tuitionPreview;
      const regularStartMonth=data.student?.tuitionRegularStartMonth||targetMonth;
      const msg=!canViewTuition()?`Đã thêm ${name} vào ${c.name}.`:data.tuitionAdjustment&&pv
        ? `Đã thêm ${name} vào ${c.name}. Khoản phát sinh ${pv.sessionCount} buổi (${fmt.format(Number(pv.amount||0))}đ) sẽ thu trong ${v27MonthLabel(pv.targetMonth)}.`
        : `Đã thêm ${name} vào ${c.name}. Học phí sẽ bắt đầu được tính từ ${v27MonthLabel(regularStartMonth)}.`;

      // Server đã lưu thành công: không được báo thất bại chỉ vì bước patch UI gặp lỗi.
      try{
        c.students ||= [];
        if(!c.students.some(s=>String(s.id)===String(data.student?.id))) c.students.push(data.student);
        db.evaluations ||= [];
        if(data.student?.id && !db.evaluations.some(x=>String(x.studentId)===String(data.student.id) && String(x.classId)===String(c.id))){
          db.evaluations.push({studentId:data.student.id,classId:c.id,month:new Date().toLocaleDateString('vi-VN',{month:'2-digit',year:'numeric'}),scores:{Listening:3,Speaking:3,Reading:3,Writing:3,Vocabulary:3,Participation:3,Homework:3},status:'draft',comment:'Học sinh mới, cần theo dõi thêm trong các buổi tới.',strengths:'Có tinh thần học tập tốt.',improvements:'Cần làm quen với nề nếp lớp và luyện phản xạ nói.',suggestion:'Phụ huynh hỗ trợ bé ôn từ vựng 10 phút mỗi ngày.'});
        }
        v28AfterClassMutation(canViewTuition()?['schedule','attendance','evaluation','tuition']:['schedule','attendance','evaluation'],{
          classId,
          structural:false,
          month:targetMonth,
          months:[startDate.slice(0,7),targetMonth],
          delayMs:V28_CLASS_REVALIDATE_DELAY_MS
        });
      }catch(uiError){
        console.error('Đã thêm học sinh trên server nhưng cập nhật giao diện cục bộ gặp lỗi',uiError);
        v28RecoverClassUi(classId,false);
      }

      closeModal(true);
      toast(msg);
    }

function openDeleteStudentModal(classId,studentId){
      if(!canManageOperations()) return;
      const c=assertActiveClassEditable(classId,'xóa học sinh'); if(!c) return;
      const st=(c.students||[]).find(s=>s.id===studentId);
      if(!c?.id || !st?.id) return;
      modal(`<div class="modalHead"><h2>Xóa học sinh khỏi ${c.name}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="dangerBox"><b>Xác nhận xóa học sinh</b><span>Học sinh <b>${h(st.name)}</b> sẽ được xóa khỏi lớp này trong . Không cần xác nhận mật khẩu.</span></div>
      <div class="modalInfoGrid"><div><p><b>Học sinh:</b> ${h(st.name)}</p><p><b>Lớp:</b> ${h(c.name)}</p></div><div><p><b>Liên hệ:</b> ${h(st.contact||'Chưa có')}</p></div></div>
      <div style="text-align:right;margin-top:18px"><button class="btn ghost" onclick="openClassDetail('${classId}')">Hủy</button> <button class="btn dangerAction" onclick="confirmDeleteStudent('${classId}','${studentId}')">Xóa học sinh</button></div>`)
    }

async function confirmDeleteStudent(classId,studentId){
      if(!canManageOperations()) return;
      const c=assertActiveClassEditable(classId,'xóa học sinh'); if(!c) return;
      const st=(c.students||[]).find(s=>String(s.id)===String(studentId));
      const action=v28BeginModalAction(document.querySelector('.modal .dangerAction[onclick^="confirmDeleteStudent"]'),'Đang xóa...');
      if(!action) return;

      try{
        await officialFetch(`/api/students/${studentId}`,{method:'DELETE'});
      }catch(e){
        v28EndModalAction(action);
        toast(e.message||'Không xóa được học sinh');
        return;
      }

      try{
        c.students=(c.students||[]).filter(s=>String(s.id)!==String(studentId));
        db.submissions=(db.submissions||[]).filter(s=>String(s.studentId)!==String(studentId));
        db.evaluations=(db.evaluations||[]).filter(e=>String(e.studentId)!==String(studentId));
        db.attendance=(db.attendance||[]).filter(a=>String(a.studentId)!==String(studentId));
        db.absenceRecords=(db.absenceRecords||[]).filter(a=>String(a.studentId)!==String(studentId));
        db.makeupPlans=(db.makeupPlans||[]).filter(p=>String(p.studentId)!==String(studentId));
        db.payments=db.payments||{}; delete db.payments[studentId];
        db.tuitionMessages=db.tuitionMessages||{}; delete db.tuitionMessages[studentId];

        if(db.attendanceSessions){
          Object.values(db.attendanceSessions).forEach(rec=>{
            if(rec.rows){
              Object.keys(rec.rows).forEach(k=>{if(String(rec.rows[k]?.studentId)===String(studentId)) delete rec.rows[k]});
            }
            if(Array.isArray(rec.manualMakeups)) rec.manualMakeups=rec.manualMakeups.filter(m=>String(m.student?.id)!==String(studentId));
          });
        }
        (db.users||[]).forEach(u=>{
          if(Array.isArray(u.children)) u.children=u.children.filter(id=>String(id)!==String(studentId));
        });

        v28AfterClassMutation(canViewTuition()?['attendance','tuition','evaluation','schedule','makeup']:['attendance','evaluation','schedule','makeup'],{
          classId,
          structural:false,
          delayMs:V28_CLASS_REVALIDATE_DELAY_MS
        });
        openClassDetail(classId);
      }catch(uiError){
        console.error('Đã xóa học sinh trên server nhưng cập nhật giao diện cục bộ gặp lỗi',uiError);
        closeModal(true);
        v28RecoverClassUi(classId,false);
      }
      toast(`Đã xóa ${st?.name||'học sinh'} khỏi lớp ${c.name}.`);
    }

function suggestPromotedClassName(name){
      const raw=String(name||'').trim();
      let m=raw.match(/^G\s*(\d+)\s*\.(\d+)/i);
      if(m) return `G${Number(m[1])+1}.${m[2]}`;
      m=raw.match(/^(\d+)\s*\.(\d+)/);
      if(m) return `G${Number(m[1])+1}.${m[2]}`;
      if(/^GK/i.test(raw)) return 'G1.1';
      return raw?`${raw} - New`:'G4.1';
    }

function buildPromoteClassTimeFromForm(){
      const count=Number(document.getElementById('promoteSessionCount')?.value||1);
      const sessions=[];
      for(let i=1;i<=count;i++){
        const day=document.getElementById(`promoteDay${i}`)?.value || 'Mon';
        const slot=timeSlotByValue(document.getElementById(`promoteSlot${i}`)?.value || '17:00-18:30');
        sessions.push(`${slot.start.replace(':','h')} - ${slot.end.replace(':','h')} ${day}`);
      }
      return sessions.join('; ');
    }

function schedulePayloadFromPromoteClassForm(){
      const count=Number(document.getElementById('promoteSessionCount')?.value||1);
      const schedules=[];
      for(let i=1;i<=count;i++){
        const day=document.getElementById(`promoteDay${i}`)?.value || 'Mon';
        const slot=timeSlotByValue(document.getElementById(`promoteSlot${i}`)?.value || '17:00-18:30');
        schedules.push({day,start:slot.start,end:slot.end});
      }
      return schedules;
    }

function firstUpcomingDateFromPromoteForm(){
      const count=Number(document.getElementById('promoteSessionCount')?.value||1);
      let best=null;
      for(let i=1;i<=count;i++){
        const day=document.getElementById(`promoteDay${i}`)?.value || 'Mon';
        const d=nextDateForDay(day);
        if(!best || d<best) best=d;
      }
      return best || new Date();
    }

function updatePromoteClassPreview(){
      const el=document.getElementById('promoteClassPreview'); if(el) el.textContent=buildPromoteClassTimeFromForm();
      document.querySelectorAll('.promoteSession2Only').forEach(x=>x.style.display=Number(document.getElementById('promoteSessionCount')?.value||1)===2?'block':'none');
      const start=document.getElementById('promoteStartDate'); if(start && !start.value) start.value=isoDate(firstUpcomingDateFromPromoteForm());
    }

function togglePromoteStudents(checked){document.querySelectorAll('.promoteStudent').forEach(x=>x.checked=checked)}

function openPromoteClassModal(classId){
      if(!canManageOperations()) return;
      const c=assertActiveClassEditable(classId,'chuyển lớp'); if(!c) return;
      const dayOptions=WEEK_DAYS.map(d=>`<option value="${d.key}">${d.label}</option>`).join('');
      const slotOptions=CLASS_TIME_SLOTS.map(s=>`<option value="${s.start}-${s.end}">${s.label}</option>`).join('');
      const suggested=suggestPromotedClassName(c.name);
      const teacherOptions=staffOptionsForClass(c.teacherId,'teacher');
      const taOptions=staffOptionsForClass(c.taId,'ta');
      modal(`<div class="modalHead"><h2>Chuyển lớp từ ${c.name}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="promoteNotice"><b>Tạo lớp mới cho kỳ tiếp theo.</b><br>Lớp cũ sẽ tự chuyển sang mục <b>Lớp đã học</b>. Dữ liệu điểm danh, đánh giá và lịch sử lớp cũ vẫn được giữ lại cho đến khi Admin/Quản lí/Lễ tân xóa lớp.</div>
      <div class="formGrid">
        <label>Tên lớp mới<input id="promoteClassName" class="input" value="${h(suggested)}" placeholder="VD: G4.1"></label>
        <label>Giáo viên<select id="promoteTeacher" class="input">${teacherOptions}</select></label>
        <label>Ngày bắt đầu<input id="promoteStartDate" class="input" type="date"></label>
        <label>TA / Trợ giảng<select id="promoteTA" class="input">${taOptions}</select></label>
        <label>Số buổi/tuần<select id="promoteSessionCount" class="input" onchange="updatePromoteClassPreview()"><option value="1">1 buổi / tuần</option><option value="2" selected>2 buổi / tuần</option></select></label>
        <div></div>
        <div class="full sessionConfigurator"><h3>Buổi 1</h3><div class="inline2"><label>Ngày học<select id="promoteDay1" class="input" onchange="updatePromoteClassPreview()">${dayOptions}</select></label><label>Khung giờ<select id="promoteSlot1" class="input" onchange="updatePromoteClassPreview()">${slotOptions}</select></label></div><div class="promoteSession2Only"><h3 style="margin-top:14px">Buổi 2</h3><div class="inline2"><label>Ngày học<select id="promoteDay2" class="input" onchange="updatePromoteClassPreview()">${dayOptions.replace('value="Wed"','value="Wed" selected')}</select></label><label>Khung giờ<select id="promoteSlot2" class="input" onchange="updatePromoteClassPreview()">${slotOptions}</select></label></div></div><div class="slotPreview"><b>Lịch học:</b> <span id="promoteClassPreview"></span></div></div>
        <div class="full"><div class="rosterSectionTitle"><h3>Học sinh chuyển lên lớp mới</h3><span><button class="btn ghost" onclick="togglePromoteStudents(true)">Chọn tất cả</button> <button class="btn ghost" onclick="togglePromoteStudents(false)">Bỏ chọn</button></span></div><div class="promoteStudentGrid">${(c.students||[]).map(s=>`<label class="promoteStudentItem"><input class="promoteStudent" type="checkbox" value="${s.id}" checked><span>${h(s.name)}</span></label>`).join('')}</div></div>
      </div>
      <div style="text-align:right;margin-top:18px"><button class="btn ghost" onclick="openClassDetail('${classId}')">Hủy</button> <button class="btn primary" onclick="savePromotedClass('${classId}')">Tạo lớp mới & chuyển lớp</button></div>`);
      setTimeout(()=>{updatePromoteClassPreview(); const el=document.getElementById('promoteStartDate'); if(el&&!el.value) el.value=isoDate(firstUpcomingDateFromPromoteForm())},0);
    }

async function savePromotedClass(sourceClassId){
      if(!canManageOperations()) return;
      const old=assertActiveClassEditable(sourceClassId,'chuyển lớp'); if(!old) return;

      const name=(document.getElementById('promoteClassName')?.value||'').trim();
      if(!name){toast('Nhập tên lớp mới');return}
      if(classNameExists(name)){toast('Tên lớp mới đã tồn tại. Vui lòng chọn tên khác.');return}

      const promoteTeacherId=document.getElementById('promoteTeacher')?.value||'';
      const promoteTAId=document.getElementById('promoteTA')?.value||'';
      if(promoteTeacherId && promoteTAId && String(promoteTeacherId)===String(promoteTAId)){toast('Giáo viên chính và TA không nên là cùng một người.');return}

      const selected=Array.from(document.querySelectorAll('.promoteStudent:checked')).map(x=>x.value);
      if(!selected.length){toast('Chọn ít nhất 1 học sinh để chuyển lớp');return}

      const action=v28BeginModalAction(document.querySelector('.modal .btn.primary[onclick^="savePromotedClass"]'),'Đang chuyển lớp...');
      if(!action) return;

      const teacherId=promoteTeacherId;
      const taId=promoteTAId;
      const startDate=document.getElementById('promoteStartDate')?.value || isoDate(firstUpcomingDateFromPromoteForm());
      const oldEndDate=isoDate(addDays(parseISODate(startDate),-1));
      const schedules=schedulePayloadFromPromoteClassForm();

      let result;
      try{
        result=await officialFetch('/api/classes/transfer',{
          method:'POST',
          body:JSON.stringify({sourceClassId,name,teacherId,assistantTeacherId:taId,startDate,oldEndDate,schedules,studentIds:selected})
        });
      }catch(e){
        v28EndModalAction(action);
        toast(e.message||'Không chuyển lớp được');
        return;
      }

      try{
        const oldClass=result.oldClass;
        const newClass=result.newClass;
        if(!oldClass?.id || !newClass?.id) throw new Error('Server chưa trả đủ dữ liệu chuyển lớp');

        const oldIndex=(db.classes||[]).findIndex(c=>String(c.id)===String(oldClass.id));
        if(oldIndex>=0) db.classes[oldIndex]={...db.classes[oldIndex],...oldClass,status:'ended'};
        else db.classes.push({...oldClass,status:'ended'});

        const newIndex=(db.classes||[]).findIndex(c=>String(c.id)===String(newClass.id));
        if(newIndex>=0) db.classes[newIndex]={...db.classes[newIndex],...newClass,status:'active'};
        else db.classes.push({...newClass,status:'active'});

        v28AfterClassMutation(canViewTuition()?['evaluation','schedule','tuition','attendance']:['evaluation','schedule','attendance'],{
          classId:newClass.id,
          structural:true,
          delayMs:V28_CLASS_REVALIDATE_DELAY_MS
        });
      }catch(uiError){
        console.error('Đã chuyển lớp trên server nhưng cập nhật giao diện cục bộ gặp lỗi',uiError);
        v28RecoverClassUi('',true);
      }

      closeModal(true);
      toast(`Đã chuyển ${old.name} sang ${name}.`);
    }

function openEndClassModal(classId){
      const c=assertActiveClassEditable(classId,'kết thúc lớp'); if(!c) return; const today=isoDate(new Date());
      modal(`<div class="modalHead"><h2>Kết thúc lớp ${c.name}</h2><button class="close" onclick="closeModal()">×</button></div><div class="formGrid"><label>Ngày kết thúc<input id="endClassDate" class="input" type="date" value="${today}"></label><label>Trạng thái<input class="input" value="Đã kết thúc" disabled></label></div><div class="rulesBox"><b>Lưu ý:</b> Lớp sẽ chuyển xuống phần <b>Lớp đã học</b>. Dữ liệu điểm danh, đánh giá và lịch sử liên quan vẫn được giữ lại cho đến khi Admin/Quản lí/Lễ tân xóa lớp.</div><div style="text-align:right;margin-top:18px"><button class="btn ghost" onclick="openClassDetail('${classId}')">Hủy</button> <button class="btn primary" onclick="endClass('${classId}')">Kết thúc lớp</button></div>`)
    }

async function endClass(classId){
      if(!canManageOperations()) return;
      const c=assertActiveClassEditable(classId,'kết thúc lớp'); if(!c) return;
      const endDate=document.getElementById('endClassDate')?.value || isoDate(new Date());
      const action=v28BeginModalAction(document.querySelector('.modal .btn.primary[onclick^="endClass"]'),'Đang kết thúc...');
      if(!action) return;

      let data;
      try{
        data=await officialFetch(`/api/classes/${encodeURIComponent(classId)}`,{
          method:'PATCH',
          body:JSON.stringify({status:'ended',endDate})
        });
      }catch(e){
        v28EndModalAction(action);
        toast(e.message||'Không kết thúc được lớp');
        return;
      }

      try{
        const updated=data.class || {...c,status:'ended',endDate};
        const i=(db.classes||[]).findIndex(x=>String(x.id)===String(classId));
        if(i>=0) db.classes[i]={...db.classes[i],...updated,status:'ended',endDate:updated.endDate||endDate};
        else db.classes.push({...updated,status:'ended',endDate:updated.endDate||endDate});
        v28AfterClassMutation(['schedule','attendance'],{
          classId,
          structural:true,
          delayMs:V28_CLASS_REVALIDATE_DELAY_MS
        });
      }catch(uiError){
        console.error('Đã kết thúc lớp trên server nhưng cập nhật giao diện cục bộ gặp lỗi',uiError);
        v28RecoverClassUi(classId,true);
      }

      closeModal(true);
      toast(`Đã kết thúc lớp ${c.name}.`);
    }

async function reactivateClass(classId){
      if(!canManageOperations()) return;
      toast('Lớp đã kết thúc, không thể mở lại hoặc chỉnh sửa.');
      return;
      const c=classById(classId); if(!c?.id) return;
      try{
        const data=await officialFetch(`/api/classes/${encodeURIComponent(classId)}`,{
          method:'PATCH',
          body:JSON.stringify({status:'active',endDate:null})
        });
        const updated=data.class || {...c,status:'active',endDate:''};
        const i=(db.classes||[]).findIndex(x=>String(x.id)===String(classId));
        if(i>=0) db.classes[i]={...db.classes[i],...updated,status:'active',endDate:''};
        else db.classes.push({...updated,status:'active',endDate:''});
        v20bAfterMutation(['core','schedule']);
        v20b13InvalidateScheduleAfterMutation();
        save();
        await refreshOfficialClasses({skipSave:true});
        const persisted=(db.classes||[]).find(x=>String(x.id)===String(classId));
        if(persisted && String(persisted.status)==='ended'){
          persisted.status='active';
          persisted.endDate='';
        }
        toast('Đã mở lại lớp');
        closeModal();
        route='classes'; saveUser(); render();
      }catch(e){toast(e.message||'Không mở lại được lớp')}
    }

function currentPasswordMatches(pw){
      const u=db.users.find(x=>x.id===currentUser?.id) || findUserByPhone(currentUser?.phone);
      return !!u && u.password===pw;
    }

function openDeleteClassModal(classId){
      if(!canManageOperations()) return;
      const c=classById(classId); if(!c?.id) return;
      modal(`<div class="modalHead"><h2>Xóa lớp ${c.name}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="dangerBox">
        <b>Thao tác này sẽ xóa lớp khỏi hệ thống.</b>
        <span>Dữ liệu liên quan của lớp như học sinh, lịch, điểm danh, bài tập và học bù sẽ được gỡ khỏi giao diện.</span>
        <span>Để xác nhận, nhập mật khẩu tài khoản đang đăng nhập.</span>
      </div>
      <div class="formGrid">
        <label>Tên lớp<input class="input" value="${h(c.name)}" disabled></label>
        <label>Mật khẩu xác nhận<input id="deleteClassPassword" class="input" type="password" placeholder="Nhập mật khẩu của bạn"></label>
      </div>
      <div style="text-align:right;margin-top:18px">
        <button class="btn ghost" onclick="openClassDetail('${classId}')">Hủy</button>
        <button class="btn dangerAction" onclick="confirmDeleteClass('${classId}')">Xác nhận xóa lớp</button>
      </div>`)
    }

async function confirmDeleteClass(classId){
      if(!canManageOperations()) return;
      const pw=document.getElementById('deleteClassPassword')?.value||'';
      if(!currentPasswordMatches(pw)){toast('Mật khẩu xác nhận không đúng');return}
      const c=classById(classId); if(!c?.id){toast('Không tìm thấy lớp');return}
      const studentIds=(c.students||[]).map(s=>s.id);
      const assignmentIds=(db.assignments||[]).filter(a=>a.classId===classId).map(a=>a.id);
      const action=v28BeginModalAction(document.querySelector('.modal .dangerAction[onclick^="confirmDeleteClass"]'),'Đang xóa...');
      if(!action) return;

      try{
        await officialFetch(`/api/classes/${encodeURIComponent(classId)}`,{method:'DELETE'});
      }catch(e){
        v28EndModalAction(action);
        toast(e.message||'Không xóa được lớp trên server');
        return;
      }

      try{
        db.classes=(db.classes||[]).filter(x=>String(x.id)!==String(classId));
        db.assignments=(db.assignments||[]).filter(a=>String(a.classId)!==String(classId));
        db.submissions=(db.submissions||[]).filter(s=>String(s.classId)!==String(classId) && !assignmentIds.includes(s.assignmentId) && !studentIds.includes(s.studentId));
        db.evaluations=(db.evaluations||[]).filter(e=>String(e.classId)!==String(classId) && !studentIds.includes(e.studentId));
        db.attendance=(db.attendance||[]).filter(a=>String(a.classId)!==String(classId) && !studentIds.includes(a.studentId));
        db.absenceRecords=(db.absenceRecords||[]).filter(a=>String(a.sourceClassId)!==String(classId) && !studentIds.includes(a.studentId));
        db.makeupPlans=(db.makeupPlans||[]).filter(p=>String(p.sourceClassId)!==String(classId) && String(p.targetClassId)!==String(classId) && !studentIds.includes(p.studentId));
        db.classMakeupSessions=(db.classMakeupSessions||[]).filter(m=>String(m.classId)!==String(classId));
        db.tuitionRollup=db.tuitionRollup||{};
        studentIds.forEach(id=>{delete db.tuitionRollup[id]});
        db.payments=db.payments||{};
        studentIds.forEach(id=>{delete db.payments[id]});
        db.tuitionMessages=db.tuitionMessages||{};
        studentIds.forEach(id=>{delete db.tuitionMessages[id]});

        if(db.classCancellations){
          Object.keys(db.classCancellations).forEach(k=>{if(k.startsWith(classId+'|')) delete db.classCancellations[k]});
        }
        if(db.attendanceSessions){
          Object.keys(db.attendanceSessions).forEach(k=>{
            const rec=db.attendanceSessions[k];
            if(k.startsWith(classId+'|') || k.includes('|'+classId+'|') || String(rec?.sessionKey||'').startsWith(classId+'|') || String(rec?.classId)===String(classId)) delete db.attendanceSessions[k];
          });
        }
        (db.users||[]).forEach(u=>{
          if(Array.isArray(u.children)) u.children=u.children.filter(id=>!studentIds.includes(id));
        });

        v28AfterClassMutation(canViewTuition()?['schedule','attendance','tuition','evaluation','makeup']:['schedule','attendance','evaluation','makeup'],{
          classId,
          structural:true,
          delayMs:V28_CLASS_REVALIDATE_DELAY_MS
        });
      }catch(uiError){
        console.error('Đã xóa lớp trên server nhưng cập nhật giao diện cục bộ gặp lỗi',uiError);
        v28RecoverClassUi('',true);
      }

      closeModal(true);
      toast(`Đã xóa lớp ${c.name} và dữ liệu liên quan.`);
    }

function openImportClassesModal(){
      modal(`<div class="modalHead"><h2>Import lớp / học sinh</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="modalInfoGrid"><div><p><b>Mẫu file:</b> CSV hoặc Excel.</p><p>Các cột nên có: class_name, teacher_name, schedule_1_day, schedule_1_start, schedule_1_end, schedule_2_day, schedule_2_start, schedule_2_end, student_name, parent_phone, note.</p></div><div><a class="btn ghost" href="/import-template.xlsx" download="mau-import-lop-hoc.xlsx">Tải file mẫu Excel</a></div></div>
      <label>Chọn file<input id="classImportFile" class="input" type="file" accept=".xlsx,.xls,.csv"></label>
      <div style="text-align:right;margin-top:18px"><button class="btn ghost" onclick="closeModal()">Hủy</button> <button class="btn primary" onclick="uploadClassImport()">Import</button></div>`)
    }

async function uploadClassImport(){
      const file=document.getElementById('classImportFile')?.files?.[0];
      if(!file){toast('Chọn file import');return}
      const action=v28BeginModalAction(document.querySelector('.modal .btn.primary[onclick^="uploadClassImport"]'),'Đang import...');
      if(!action) return;
      const fd=new FormData(); fd.append('file',file);
      let data;
      try{
        const res=await fetch('/api/import/classes',{method:'POST',body:fd,credentials:'include'});
        data=await res.json().catch(()=>({}));
        if(!res.ok) throw new Error(data.error||'Import lỗi');
        await refreshOfficialClasses({skipSave:true,forceNetwork:true});
      }catch(e){
        v28EndModalAction(action);
        toast(e.message||'Import lỗi');
        return;
      }

      try{
        v28AfterClassMutation(['schedule','attendance'],{
          structural:true,
          delayMs:V28_CLASS_REVALIDATE_DELAY_MS
        });
      }catch(uiError){
        console.error('Import đã thành công nhưng cập nhật giao diện cục bộ gặp lỗi',uiError);
        v28RecoverClassUi('',true);
      }
      closeModal(true);
      toast(`Import xong: ${data.classCount} lớp, ${data.studentCount} học sinh.`);
    }

function openClassModal(){
      const dayOptions=WEEK_DAYS.map(d=>`<option value="${d.key}">${d.label}</option>`).join('');
      const slotOptions=CLASS_TIME_SLOTS.map(s=>`<option value="${s.start}-${s.end}">${s.label}</option>`).join('');
      const teacherOptions=staffOptionsForClass('','teacher');
      const taOptions=staffOptionsForClass('','ta');
      modal(`<div class="modalHead"><h2>+ Thêm lớp mới</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="formGrid">
        <label>Tên lớp<input id="newClassName" class="input" value="G3.4" placeholder="VD: G3.4"></label>
        <label>Giáo viên<select id="newTeacher" class="input">${teacherOptions}</select></label>
        <label>Ngày bắt đầu<input id="newStartDate" class="input" type="date"></label>
        <label>TA / Trợ giảng<select id="newTA" class="input">${taOptions}</select></label>
        <label>Số buổi/tuần<select id="newSessionCount" onchange="updateNewClassPreview()"><option value="1">1 buổi / tuần</option><option value="2" selected>2 buổi / tuần</option></select></label>
        <div></div>
        <div class="full sessionConfigurator">
          <h3>Buổi 1</h3>
          <div class="inline2"><label>Ngày học<select id="newDay1" onchange="updateNewClassPreview()">${dayOptions}</select></label><label>Khung giờ<select id="newSlot1" onchange="updateNewClassPreview()">${slotOptions}</select></label></div>
          <div class="session2Only">
            <h3 style="margin-top:14px">Buổi 2</h3>
            <div class="inline2"><label>Ngày học<select id="newDay2" onchange="updateNewClassPreview()">${dayOptions.replace('value="Wed"','value="Wed" selected')}</select></label><label>Khung giờ<select id="newSlot2" onchange="updateNewClassPreview()">${slotOptions}</select></label></div>
          </div>
          <div class="slotPreview"><b>Lịch học:</b> <span id="newClassPreview"></span></div>
        </div>
      </div>
      <div style="text-align:right;margin-top:18px"><button class="btn ghost" onclick="closeModal()">Hủy</button> <button class="btn primary" onclick="saveNewClassFromModal()">Tạo lớp</button></div>`);
      setTimeout(()=>{updateNewClassPreview(); const el=document.getElementById('newStartDate'); if(el&&!el.value) el.value=isoDate(firstUpcomingDateFromForm())},0);
    }

async function saveNewClassFromModal(){
      const name=(document.getElementById('newClassName')?.value||'').trim();
      if(!name){toast('Nhập tên lớp');return}
      if(classNameExists(name)){toast('Tên lớp đã tồn tại. Vui lòng chọn tên khác.');return}
      const teacherId=document.getElementById('newTeacher')?.value||'';
      const taId=document.getElementById('newTA')?.value||'';
      if(teacherId && taId && String(teacherId)===String(taId)){toast('Giáo viên chính và TA không nên là cùng một người.');return}
      const startDate=document.getElementById('newStartDate')?.value || isoDate(firstUpcomingDateFromForm());
      const action=v28BeginModalAction(document.querySelector('.modal .btn.primary[onclick^="saveNewClassFromModal"]'),'Đang tạo...');
      if(!action) return;

      let data;
      try{
        data=await officialFetch('/api/classes',{method:'POST',body:JSON.stringify({
          name,
          teacherId,
          assistantTeacherId:taId,
          startDate,
          schedules:schedulePayloadFromNewClassForm()
        })});
      }catch(e){
        v28EndModalAction(action);
        toast(e.message||'Không tạo được lớp');
        return;
      }

      try{
        if(data.class?.id && !(db.classes||[]).some(c=>String(c.id)===String(data.class.id))) db.classes.push(data.class);
        v28AfterClassMutation(['schedule','attendance'],{
          classId:data.class?.id,
          structural:true,
          delayMs:V28_CLASS_REVALIDATE_DELAY_MS
        });
      }catch(uiError){
        console.error('Đã tạo lớp trên server nhưng cập nhật giao diện cục bộ gặp lỗi',uiError);
        v28RecoverClassUi(data.class?.id||'',true);
      }
      closeModal(true);
      toast(`Đã tạo lớp ${name}.`);
    }
