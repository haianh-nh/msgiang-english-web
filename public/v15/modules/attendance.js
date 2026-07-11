/*
 * V19C Attendance Module
 * Tách riêng phần render trang Điểm danh và modal điểm danh.
 * Không đổi UI/UX, wording, màu sắc, nút trạng thái hoặc logic lưu điểm danh.
 * Các hàm mutation/save vẫn nằm ở app core để giảm rủi ro.
 */

function attendancePage(){
      const sessions=sessionsForAttendancePage().sort((a,b)=>dateTimeForSession(a,'start')-dateTimeForSession(b,'start'));
      return `<div class="screenTitle"><div><h1>Điểm danh</h1><p>Theo buổi học trong tuần. Điểm danh chỉ mở từ giờ bắt đầu buổi học; Admin/Quản lí có thể sửa ngoài giờ sau khi buổi học đã bắt đầu.</p></div></div>
      ${managerScopeControl('managerAttendanceScope','Hiển thị điểm danh')}
      <div class="grid3">${sessions.map((s,i)=>{const key=sessionKeyFor(s); const w=attendanceWindowInfo(key); const rec=ensureAttendanceSessions()[attendanceKey(key)]; const mk=makeupDisplayCountForSession(key); const total=totalRosterDisplayCountForSession(s.classId,key); const capacity=db.settings.capacity||15; const canClosedEdit=attendanceCanOverride() && rec?.saved && !w.open && !w.isEarly; return `<div class="classCard" style="--i:${i}"><h3>${s.className}</h3><div class="classMeta">${dayNameFromKey(s.day)} • ${s.start}-${s.end}<br>${s.teacher||''}</div><div class="classCount"><b>${s.students} chính thức • ${mk} học bù</b></div><div style="margin:8px 0"><span class="capacityBadge ${total>=capacity?'full':''}">Tổng ${total}/${capacity}</span></div>${attendanceCardStatusMarkup(key)}<div class="attendanceActionRow"><button class="btn primary" onclick="openAttendance('${s.classId}','${key}')">${attendancePrimaryActionLabel(key)}</button>${canClosedEdit?`<button class="tinyEditBtn" onclick="editAttendance('${key}')">Sửa</button>`:''}</div></div>`}).join('')||'<div class="empty">Không có lớp phù hợp với bộ lọc hiện tại.</div>'}</div>`
    }

    function attendanceStatusButtons(sessionKey,studentId,type,current,editable){
      const id='attBtns_'+v18bSafeId(`${sessionKey}_${type}_${studentId}`);
      return `<div class="attStatusBtns" id="${id}">${[['present','Có mặt'],['late','Muộn'],['absent','Vắng']].map(([v,l])=>`<button data-status="${v}" class="${current===v?'active':''}" ${editable?`onclick="setAttendanceStatus('${sessionKey}','${studentId}','${type}','${v}')"`:'disabled'}>${l}</button>`).join('')}</div>`
    }

    let attendanceMakeupMonthLoadingKey='';
    function attendanceLinkedMakeupCanPlace(sessionKey,canEdit){
      const s=sessionObjectFromKey(sessionKey);
      if(!s || !canEdit || !(isAdmin()||isManager())) return false;
      const st=sessionStatus(s).key;
      // Chỉ tích hợp thêm học bù trong màn điểm danh cho buổi đã học/đã đóng.
      // Buổi chưa học vẫn dùng luồng xếp lịch học bù trước giờ học.
      return st==='done' && canReceiveMakeupSession(sessionKey);
    }
    function attendanceLinkedMakeupCandidates(targetClassId,sessionKey){
      const rec=attendanceRecord(sessionKey);
      const already=new Set([
        ...rosterForAttendance(targetClassId,sessionKey).filter(x=>x.type!=='official').map(x=>String(x.student.id)),
        ...Object.values(rec.rows||{}).filter(r=>r && (r.type==='makeup'||r.type==='manual_makeup')).map(r=>String(r.studentId))
      ]);
      return pendingAbsenceCandidates(targetClassId,sessionKey).filter(x=>!already.has(String(x.student.id)));
    }
    function attendanceLinkedMakeupOptions(targetClassId,sessionKey){
      const rows=attendanceLinkedMakeupCandidates(targetClassId,sessionKey);
      return rows.map(x=>{
        const label=x.record.sourceSessionLabel||sessionLabelFromKey(x.record.sourceSessionKey);
        return `<option value="${h(x.record.id)}">${h(x.student.name)} • ${h(x.sourceClass.name)} • ${h(label)}</option>`;
      }).join('');
    }
    function attendanceLinkedMakeupBox(targetClassId,sessionKey,canEdit,activeTotal,capacity){
      if(!attendanceLinkedMakeupCanPlace(sessionKey,canEdit)) return '';
      const candidates=attendanceLinkedMakeupCandidates(targetClassId,sessionKey);
      if(activeTotal>=capacity){
        return `<div class="manualMakeupBox"><b>Thêm học bù</b><div class="empty">Buổi này đã đủ ${capacity} học sinh.</div></div>`;
      }
      return `<div class="manualMakeupBox"><b>Thêm học bù vào điểm danh</b><div class="mini">Chọn học sinh đang chờ học bù, thêm vào danh sách điểm danh rồi bấm Lưu điểm danh.</div><div class="inline2" style="margin-top:8px"><label>Học sinh chờ học bù<select id="linkedMakeupAbsence" class="input" ${(!canEdit||!candidates.length)?'disabled':''}><option value="">-- Chọn học sinh --</option>${attendanceLinkedMakeupOptions(targetClassId,sessionKey)}</select></label>${candidates.length?`<button class="btn primary" ${canEdit?`onclick="addPendingMakeupToAttendance('${targetClassId}','${sessionKey}')"`:'disabled'}>+ Thêm vào điểm danh</button>`:'<button class="btn ghost" disabled>Không có lượt chờ</button>'}</div></div>`;
    }

    function addPendingMakeupToAttendance(targetClassId,sessionKey){
      if(!attendanceCanEditSession(sessionKey,true)){toast('Bạn cần mở quyền sửa điểm danh trước khi thêm học bù');return}
      const absenceId=document.getElementById('linkedMakeupAbsence')?.value;
      if(!absenceId){toast('Chọn học sinh chờ học bù');return}
      const item=attendanceLinkedMakeupCandidates(targetClassId,sessionKey).find(x=>String(x.record.id)===String(absenceId));
      if(!item){toast('Không tìm thấy lượt vắng đang chờ học bù');return}
      const capacity=db.settings.capacity||15;
      if(totalRosterCountForSession(targetClassId,sessionKey)>=capacity){toast(`Buổi này đã đủ ${capacity} học sinh`);return}
      const rec=attendanceRecord(sessionKey);
      rec.pendingMakeupPlans ||= [];
      if(rec.pendingMakeupPlans.some(p=>String(p.absenceId)===String(item.record.id)) || plannedMakeupsForSession(sessionKey).some(p=>String(p.absenceId)===String(item.record.id))){toast('Lượt vắng này đã có trong buổi học bù này');return}
      const plan={
        id:'mk_'+Date.now(),
        absenceId:item.record.id,
        studentId:item.student.id,
        sourceClassId:item.sourceClass.id,
        sourceSessionKey:item.record.sourceSessionKey,
        targetClassId,
        targetSessionKey:sessionKey,
        status:'scheduled',
        pendingCreate:true,
        createdAt:new Date().toLocaleString('vi-VN')
      };
      db.makeupPlans ||= [];
      db.makeupPlans.push(plan);
      const st=db.makeupTabState;
      if(st && st.month===sessionKeyMonth(sessionKey)){
        st.makeupPlans ||= [];
        st.makeupPlans.push(plan);
        const ar=(st.absenceRecords||[]).find(a=>String(a.id)===String(item.record.id));
        if(ar) ar.status='scheduled';
      }
      const ar=(db.absenceRecords||[]).find(a=>String(a.id)===String(item.record.id));
      if(ar) ar.status='scheduled';
      rec.pendingMakeupPlans.push(plan);
      rec.rows[`makeup_${item.student.id}`]={studentId:item.student.id,type:'makeup',status:'present',note:'Thêm học bù sau điểm danh'};
      rec.saved=false;
      rec.editable=true;
      v18Memo.rosterKey='';
      v20bAfterMutation(['schedule','attendance','makeup']);
      save();
      toast('Đã thêm học sinh học bù. Kiểm tra trạng thái rồi bấm Lưu điểm danh.');
      openAttendance(targetClassId,sessionKey,true);
    }


    function openAttendance(id,sessionKey=null,forceEdit=false){
      normalizeMakeupPlans();
      if(!sessionKey) sessionKey=defaultSessionKeyForClass(id);
      const targetMonth=sessionKeyMonth(sessionKey)||makeupCurrentMonthKey();
      const monthStateOk=!!(db.makeupTabState && db.makeupTabState.month===targetMonth && Date.now()-(db.makeupTabState.updatedAt||0)<15000);
      if((isAdmin()||isManager()) && !monthStateOk && attendanceMakeupMonthLoadingKey!==sessionKey){
        attendanceMakeupMonthLoadingKey=sessionKey;
        modal(`<div class="modalHead"><h2>Điểm danh</h2><button class="close" onclick="closeModal()">×</button></div><div class="empty">Đang tải dữ liệu học bù tháng này...</div>`);
        refreshOfficialMakeupState({skipSave:true,month:targetMonth,applyGlobal:true}).catch(e=>toast(e.message||'Không tải được dữ liệu học bù')).finally(()=>{
          attendanceMakeupMonthLoadingKey='';
          openAttendance(id,sessionKey,forceEdit);
        });
        return;
      }
      const c=classById(id);
      const s=sessionObjectFromKey(sessionKey);
      const w=attendanceWindowInfo(sessionKey);
      const rec=attendanceRecord(sessionKey);
      const canEdit=attendanceCanEditSession(sessionKey,forceEdit);
      const canOpenClosedEdit=attendanceCanOverride() && rec.saved && !w.open && !w.isEarly && !canEdit;
      const roster=rosterForAttendance(id,sessionKey);
      const activeTotal=totalRosterCountForSession(id,sessionKey);
      const total=roster.length;
      const capacity=db.settings.capacity||15;
      const mk=makeupDisplayCountForSession(sessionKey);
      const manualCanPlace=sessionStatus(s).key==='todo';
      const manualOptions=classStudentsForManualMakeup(id).map(st=>`<option value="${st.id}">${st.name} • ${st.className}</option>`).join('');
      const linkedMakeupBox=attendanceLinkedMakeupBox(id,sessionKey,canEdit,activeTotal,capacity);
      const freeManualBox=manualCanPlace?`<div class="manualMakeupBox"><b>Thêm học bù</b><div class="mini">Thêm học sinh khác lớp vào buổi này.</div><div class="inline2" style="margin-top:8px"><label>Chọn học sinh khác lớp<select id="manualMakeupStudent" class="input" ${(!canEdit||activeTotal>=capacity)?'disabled':''}><option value="">-- Chọn học sinh --</option>${manualOptions}</select></label>${activeTotal>=capacity?`<button class="btn ghost" disabled>Đã đủ ${capacity} học sinh</button>`:`<button class="btn primary" ${canEdit?`onclick="addManualMakeupToAttendance('${id}','${sessionKey}')"`:'disabled'}>+ Thêm học bù</button>`}</div></div>`:'';
      modal(`<div class="modalHead"><h2>Điểm danh ${c.name}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="${attendanceModalBoxClass(sessionKey,canEdit)}"><b>${attendanceModalStatusTitle(sessionKey,canEdit)}</b><p>${sessionLabelFromKey(sessionKey)} • ${w.label}</p><div><span class="capacityBadge ${total>=capacity?'full':''}">Tổng ${total}/${capacity}</span> <span class="makeupBadge">${mk} học bù</span></div>${rec.saved?`<span class="attSavedTag">Đã lưu lúc ${rec.updatedAt||'-'}</span>`:''}</div>
      ${(!w.open && !canEdit)?`<div class="blockedBox"><h2>🔒 ${w.isEarly?'Điểm danh chưa mở':'Điểm danh đã khóa'}</h2><p>Điểm danh chỉ mở từ giờ bắt đầu buổi học. Admin/Quản lí không được điểm danh trước giờ học, nhưng có thể sửa ngoài giờ sau khi buổi học đã bắt đầu.</p>${canOpenClosedEdit?`<div style="margin-top:12px"><button class="tinyEditBtn" onclick="editAttendance('${sessionKey}')">Sửa điểm danh</button></div>`:''}</div>`:`
      ${linkedMakeupBox}${freeManualBox}
      <div class="tableWrap"><table><thead><tr><th>Học sinh</th><th>Loại</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead><tbody>
      ${roster.map(x=>{const rowKey=`${x.type}_${x.student.id}`; const row=rec.rows[rowKey]||{status:'present',note:''}; const label=x.type==='official'?'Chính thức':x.type==='makeup'?'🔁 Học bù':'🔁 Học bù'; return `<tr><td><b>${x.student.name}</b><div class="mini">${x.type==='official'?c.name:`Lớp chính: ${x.sourceClass.name||x.student.className||'-'}`}</div></td><td><span class="pill ${x.type==='official'?'gray':'blue'}">${label}</span></td><td>${attendanceStatusButtons(sessionKey,x.student.id,x.type,row.status,canEdit)}</td><td><input class="attNote" value="${String(row.note||'').replace(/"/g,'&quot;')}" ${canEdit?`oninput="setAttendanceNote('${sessionKey}','${x.student.id}','${x.type}',this.value)"`:'disabled'} placeholder="Ghi chú..."></td></tr>`}).join('')}
      </tbody></table></div>
      <div style="text-align:right;margin-top:14px">${rec.saved&&!canEdit&&(w.open||(attendanceCanOverride()&&!w.isEarly))?`<button class="btn ghost" onclick="editAttendance('${sessionKey}')">Chỉnh sửa</button>`:''}${canEdit?`<button class="btn primary" onclick="saveAttendance('${sessionKey}')">${rec.saved?'Lưu lại điểm danh':'Lưu điểm danh'}</button>`:''}</div>`}`)
    }
