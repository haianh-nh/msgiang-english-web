/*
 * V19C Attendance Module
 * Tách riêng phần render trang Điểm danh và modal điểm danh.
 * Không đổi UI/UX, wording, màu sắc, nút trạng thái hoặc logic lưu điểm danh.
 * Các hàm mutation/save vẫn nằm ở app core để giảm rủi ro.
 */

function attendancePage(){
      const sessions=sessionsForAttendancePage().sort((a,b)=>dateTimeForSession(a,'start')-dateTimeForSession(b,'start'));
      return `<div class="screenTitle"><div><h1>Điểm danh</h1><p>Theo buổi học trong tuần. Giáo viên điểm danh trong giờ mở; Admin/Quản lí có thể điểm danh sớm và sửa ngoài giờ.</p></div></div>
      ${managerScopeControl('managerAttendanceScope','Hiển thị điểm danh')}
      <div class="grid3">${sessions.map((s,i)=>{const key=sessionKeyFor(s); const w=attendanceWindowInfo(key); const rec=ensureAttendanceSessions()[attendanceKey(key)]; const mk=makeupDisplayCountForSession(key); const total=totalRosterDisplayCountForSession(s.classId,key); const capacity=db.settings.capacity||15; const canClosedEdit=attendanceCanOverride() && rec?.saved && !w.open; return `<div class="classCard" style="--i:${i}"><h3>${s.className}</h3><div class="classMeta">${dayNameFromKey(s.day)} • ${s.start}-${s.end}<br>${s.teacher||''}</div><div class="classCount"><b>${s.students} chính thức • ${mk} học bù</b></div><div style="margin:8px 0"><span class="capacityBadge ${total>=capacity?'full':''}">Tổng ${total}/${capacity}</span></div>${attendanceCardStatusMarkup(key)}<div class="attendanceActionRow"><button class="btn primary" onclick="openAttendance('${s.classId}','${key}')">${attendancePrimaryActionLabel(key)}</button>${canClosedEdit?`<button class="tinyEditBtn" onclick="editAttendance('${key}')">Sửa</button>`:''}</div></div>`}).join('')||'<div class="empty">Không có lớp phù hợp với bộ lọc hiện tại.</div>'}</div>`
    }

    function attendanceStatusButtons(sessionKey,studentId,type,current,editable){
      const id='attBtns_'+v18bSafeId(`${sessionKey}_${type}_${studentId}`);
      return `<div class="attStatusBtns" id="${id}">${[['present','Có mặt'],['late','Muộn'],['absent','Vắng']].map(([v,l])=>`<button data-status="${v}" class="${current===v?'active':''}" ${editable?`onclick="setAttendanceStatus('${sessionKey}','${studentId}','${type}','${v}')"`:'disabled'}>${l}</button>`).join('')}</div>`
    }


    function openAttendance(id,sessionKey=null,forceEdit=false){
      normalizeMakeupPlans();
      if(!sessionKey) sessionKey=defaultSessionKeyForClass(id);
      const c=classById(id);
      const s=sessionObjectFromKey(sessionKey);
      const w=attendanceWindowInfo(sessionKey);
      const rec=attendanceRecord(sessionKey);
      const canEdit=attendanceCanEditSession(sessionKey,forceEdit);
      const canOpenClosedEdit=attendanceCanOverride() && rec.saved && !w.open && !canEdit;
      const roster=rosterForAttendance(id,sessionKey);
      const activeTotal=totalRosterCountForSession(id,sessionKey);
      const total=roster.length;
      const capacity=db.settings.capacity||15;
      const mk=makeupDisplayCountForSession(sessionKey);
      const manualCanPlace=sessionStatus(s).key==='todo';
      const manualOptions=classStudentsForManualMakeup(id).map(st=>`<option value="${st.id}">${st.name} • ${st.className}</option>`).join('');
      modal(`<div class="modalHead"><h2>Điểm danh ${c.name}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="${attendanceModalBoxClass(sessionKey,canEdit)}"><b>${attendanceModalStatusTitle(sessionKey,canEdit)}</b><p>${sessionLabelFromKey(sessionKey)} • ${w.label}</p><div><span class="capacityBadge ${total>=capacity?'full':''}">Tổng ${total}/${capacity}</span> <span class="makeupBadge">${mk} học bù</span></div>${rec.saved?`<span class="attSavedTag">Đã lưu lúc ${rec.updatedAt||'-'}</span>`:''}</div>
      ${(!w.open && !canEdit)?`<div class="blockedBox"><h2>🔒 ${attendanceCanOverride()?'Điểm danh đã khóa':'Điểm danh chưa mở/đã khóa'}</h2><p>Giáo viên chỉ điểm danh từ 15 phút trước giờ học đến 23:59 cùng ngày. Admin/Quản lí có thể điểm danh sớm hoặc sửa ngoài giờ.</p>${canOpenClosedEdit?`<div style="margin-top:12px"><button class="tinyEditBtn" onclick="editAttendance('${sessionKey}')">Sửa điểm danh</button></div>`:''}</div>`:`
      <div class="manualMakeupBox"><b>Thêm học bù</b><div class="mini">Thêm học sinh khác lớp vào buổi này.</div><div class="inline2" style="margin-top:8px"><label>Chọn học sinh khác lớp<select id="manualMakeupStudent" class="input" ${(!canEdit||activeTotal>=capacity||!manualCanPlace)?'disabled':''}><option value="">-- Chọn học sinh --</option>${manualOptions}</select></label>${!manualCanPlace?'<button class="btn ghost" disabled>Chỉ xếp trước giờ học</button>':activeTotal>=capacity?`<button class="btn ghost" disabled>Đã đủ ${capacity} học sinh</button>`:`<button class="btn primary" ${canEdit?`onclick="addManualMakeupToAttendance('${id}','${sessionKey}')"`:'disabled'}>+ Thêm học bù</button>`}</div></div>
      <div class="tableWrap"><table><thead><tr><th>Học sinh</th><th>Loại</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead><tbody>
      ${roster.map(x=>{const rowKey=`${x.type}_${x.student.id}`; const row=rec.rows[rowKey]||{status:'present',note:''}; const label=x.type==='official'?'Chính thức':x.type==='makeup'?'🔁 Học bù':'🔁 Học bù'; return `<tr><td><b>${x.student.name}</b><div class="mini">${x.type==='official'?c.name:`Lớp chính: ${x.sourceClass.name||x.student.className||'-'}`}</div></td><td><span class="pill ${x.type==='official'?'gray':'blue'}">${label}</span></td><td>${attendanceStatusButtons(sessionKey,x.student.id,x.type,row.status,canEdit)}</td><td><input class="attNote" value="${String(row.note||'').replace(/"/g,'&quot;')}" ${canEdit?`oninput="setAttendanceNote('${sessionKey}','${x.student.id}','${x.type}',this.value)"`:'disabled'} placeholder="Ghi chú..."></td></tr>`}).join('')}
      </tbody></table></div>
      <div style="text-align:right;margin-top:14px">${rec.saved&&!canEdit&&(w.open||attendanceCanOverride())?`<button class="btn ghost" onclick="editAttendance('${sessionKey}')">Chỉnh sửa</button>`:''}${canEdit?`<button class="btn primary" onclick="saveAttendance('${sessionKey}')">${rec.saved?'Lưu lại điểm danh':'Lưu điểm danh'}</button>`:''}</div>`}`)
    }
