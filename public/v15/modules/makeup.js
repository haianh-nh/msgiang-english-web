/*
 * Phase 8D.2 makeup.js
 * Tách runtime nghiệp vụ liên kết khỏi app core. Không đổi API hoặc nghiệp vụ.
 */

function makeupTabStateForMonth(monthKey=makeupCurrentMonthKey()){
      const st=db.makeupTabState;
      if(st && st.month===monthKey){
        return {
          month: monthKey,
          makeupPlans: Array.isArray(st.makeupPlans)?st.makeupPlans:[],
          absenceRecords: Array.isArray(st.absenceRecords)?st.absenceRecords:[],
          attendanceSessions: st.attendanceSessions||{}
        };
      }
      return {
        month: monthKey,
        makeupPlans: db.makeupPlans||[],
        absenceRecords: db.absenceRecords||[],
        attendanceSessions: db.attendanceSessions||{}
      };
    }

function makeupTabAttendanceRow(plan,state){
      if(!plan?.targetSessionKey) return null;
      const rec=(state.attendanceSessions||{})[attendanceKey(plan.targetSessionKey)] || (db.attendanceSessions||{})[attendanceKey(plan.targetSessionKey)];
      if(!rec?.saved) return null;
      return rec.rows?.[`makeup_${plan.studentId}`] || rec.rows?.[`manual_makeup_${plan.studentId}`] || null;
    }

function makeupTabCompleted(plan,state){
      if(String(plan?.status||'')==='completed') return true;
      const row=makeupTabAttendanceRow(plan,state);
      return !!row && (row.status==='present' || row.status==='late');
    }

function makeupTabMissed(plan,state){
      if(makeupTabCompleted(plan,state)) return false;
      const row=makeupTabAttendanceRow(plan,state);
      return row?.status==='absent';
    }

function makeupTabSourceAbsenceExists(plan,state){
      if(!plan?.absenceId) return true;
      return (state.absenceRecords||[]).some(a=>String(a.id)===String(plan.absenceId));
    }

function makeupTabCancelledBySourceCorrection(plan,state){
      return String(plan?.status||'')==='cancelled' && plan?.absenceId && !makeupTabSourceAbsenceExists(plan,state);
    }

function makeupTabAbsenceRecordStatus(absenceIdValue,state){
      const plans=(state.makeupPlans||[]).filter(p=>String(p?.absenceId||'')===String(absenceIdValue));
      if(plans.some(p=>makeupTabCompleted(p,state))) return 'completed';
      const scheduled=plans.find(p=>String(p?.status||'scheduled')==='scheduled' && !makeupTabMissed(p,state));
      return scheduled?'scheduled':'pending';
    }

function makeupTabActiveRows(state,monthKey){
      return (state.makeupPlans||[])
        .filter(p=>p && !makeupTabCancelledBySourceCorrection(p,state))
        .filter(p=>!monthKey || makeupPlanMonth(p)===monthKey)
        .filter(p=>String(p.status||'scheduled')==='scheduled' && !makeupTabCompleted(p,state) && !makeupTabMissed(p,state))
        .map(p=>({plan:p,student:studentById(p.studentId),sourceClass:classById(p.sourceClassId),targetClass:classById(p.targetClassId)}))
        .filter(x=>x.student?.id)
        .sort((a,b)=>String(a.plan.targetSessionKey||'').localeCompare(String(b.plan.targetSessionKey||'')) || String(a.student.name||'').localeCompare(String(b.student.name||''),'vi'));
    }

function makeupTabPendingRows(state,monthKey){
      return (state.absenceRecords||[])
        .filter(a=>a && (!monthKey || absenceRecordMonth(a)===monthKey))
        .filter(a=>makeupTabAbsenceRecordStatus(a.id,state)==='pending')
        .map(a=>({record:a, student:studentById(a.studentId), sourceClass:classById(a.sourceClassId), sourceSession:sessionObjectFromKey(a.sourceSessionKey)}))
        .filter(x=>x.student?.id && x.sourceClass?.id)
        .sort((a,b)=>String(a.sourceClass?.name||'').localeCompare(String(b.sourceClass?.name||''),'vi',{numeric:true}) || String(a.student.name||'').localeCompare(String(b.student.name||''),'vi'));
    }

function makeupTabCompletedRows(state,monthKey){
      return (state.makeupPlans||[])
        .filter(p=>p && !makeupTabCancelledBySourceCorrection(p,state))
        .filter(p=>!monthKey || makeupPlanMonth(p)===monthKey)
        .filter(p=>makeupTabCompleted(p,state))
        .map(p=>({plan:p,student:studentById(p.studentId),sourceClass:classById(p.sourceClassId),targetClass:classById(p.targetClassId)}))
        .filter(x=>x.student?.id)
        .sort((a,b)=>String(b.plan.targetSessionKey||b.plan.createdAt||'').localeCompare(String(a.plan.targetSessionKey||a.plan.createdAt||'')) || String(a.student.name||'').localeCompare(String(b.student.name||''),'vi'));
    }

function makeupMonthOptions(selected){
      const months=makeupAvailableMonths();
      return months.map(m=>`<option value="${m}" ${m===selected?'selected':''}>${formatMonthKeyVN(m)}</option>`).join('') || `<option value="${selected}">${formatMonthKeyVN(selected)}</option>`;
    }

async function setMakeupMonth(value){
      const month=String(value||'').trim();
      if(!/^\d{4}-\d{2}$/.test(month)){toast('Tháng không hợp lệ');return}
      db.settings ||= {}; db.settings.makeupFilter ||= {}; db.settings.makeupFilter.month=month;
      db.makeupMonth=month;
      saveLocalOnly();
      renderApp();
      try{await refreshOfficialMakeupState({month,force:true,applyGlobal:true}); if(route==='makeup') renderApp();}
      catch(e){toast(e.message||'Không tải được dữ liệu học bù tháng này')}
    }

async function refreshMakeupMonths(){
      try{
        const data=await officialFetch('/api/makeup/months');
        db.deletedMakeupMonths=data.deletedMonths||[];
        db.makeupAvailableMonths=data.months||[];
        if(makeupMonthDeleted(makeupSelectedMonthKey())){
          db.settings ||= {}; db.settings.makeupFilter ||= {};
          db.settings.makeupFilter.month=(db.makeupAvailableMonths||[])[0] || makeupCurrentMonthKey();
          db.makeupMonth=db.settings.makeupFilter.month;
        }
        saveLocalOnly();
        return data;
      }catch(e){console.warn('Không tải được tháng học bù',e); return null}
    }

async function deleteMakeupMonth(){
      if(!canManageOperations()){toast('Không có quyền xóa dữ liệu vắng');return}
      const month=document.getElementById('deleteMakeupMonthSelect')?.value || makeupSelectedMonthKey();
      if(!/^\d{4}-\d{2}$/.test(month)){toast('Chọn tháng cần xóa');return}
      if(!confirm(`Bạn có chắc muốn xóa dữ liệu vắng/học bù ${formatMonthKeyVN(month)} không?\n\nSau khi xóa, tháng này sẽ không còn hiện trong tab Học bù và không dùng để xếp học bù nữa. Lịch sử điểm danh trong Lịch dạy vẫn được giữ.`)) return;
      try{
        const data=await officialFetch('/api/makeup/months',{method:'POST',body:JSON.stringify({month,reason:'Xóa dữ liệu vắng từ giao diện'})});
        db.deletedMakeupMonths=data.deletedMonths||[...(db.deletedMakeupMonths||[]),month];
        db.makeupAvailableMonths=data.months||[];
        db.makeupTabState=null; db.makeupPlans=[]; db.absenceRecords=[];
        const next=(db.makeupAvailableMonths||[])[0] || makeupCurrentMonthKey();
        db.settings ||= {}; db.settings.makeupFilter ||= {}; db.settings.makeupFilter.month=next; db.makeupMonth=next;
        moduleCacheSet(`makeup:${month}`,{makeupMonth:month,makeupPlans:[],absenceRecords:[],attendanceSessions:{},supportClasses:[],deletedMonths:db.deletedMakeupMonths,availableMonths:db.makeupAvailableMonths});
        v20bAfterMutation(['makeup','schedule','attendance'],{month,force:true});
        save(); toast('Đã xóa dữ liệu vắng của '+formatMonthKeyVN(month));
        await refreshOfficialMakeupState({month:next,applyGlobal:true,skipSave:true});
        renderApp();
      }catch(e){toast(e.message||'Không xóa được dữ liệu vắng')}
    }

function openDeleteMakeupMonthModal(){
      const selected=makeupSelectedMonthKey();
      const options=makeupMonthOptions(selected);
      modal(`<div class="modalHead"><h2>Xóa dữ liệu vắng</h2><button class="close" onclick="closeModal()">×</button></div>
        <div class="blockedBox"><h2>⚠️ Xác nhận trước khi xóa</h2><p>Tháng đã xóa sẽ không còn hiển thị trong tab Học bù và không còn dùng để xếp học bù. Lịch sử điểm danh ở Lịch dạy vẫn được giữ.</p></div>
        <label>Chọn tháng cần xóa<select id="deleteMakeupMonthSelect" class="input">${options}</select></label>
        <div style="text-align:right;margin-top:14px"><button class="btn ghost" onclick="closeModal()">Hủy</button><button class="btn primary" onclick="deleteMakeupMonth()">Xóa dữ liệu tháng</button></div>`);
    }

function makeupPage(){
      db.makeupPlans ||= []; ensureAbsenceRecords(); normalizeMakeupPlans();
      const monthKey=makeupSelectedMonthKey();
      if(!db.makeupAvailableMonths || !db.makeupAvailableMonths.length) refreshMakeupMonths().then(()=>{if(route==='makeup') renderApp()});
      const tabState=makeupTabStateForMonth(monthKey);
      const activeRows=makeupMonthDeleted(monthKey)?[]:makeupTabActiveRows(tabState,monthKey);
      const pendingRows=makeupMonthDeleted(monthKey)?[]:makeupTabPendingRows(tabState,monthKey);
      const completedRows=makeupMonthDeleted(monthKey)?[]:makeupTabCompletedRows(tabState,monthKey);
      const monthAbsenceCount=makeupMonthDeleted(monthKey)?0:(tabState.absenceRecords||[]).filter(a=>absenceRecordMonth(a)===monthKey).length;
      const monthControls=`<div class="inline2"><label>Tháng hiển thị<select class="input" onchange="setMakeupMonth(this.value)">${makeupMonthOptions(monthKey)}</select></label>${canManageOperations()?`<button class="btn ghost" onclick="openDeleteMakeupMonthModal()">Xóa dữ liệu vắng</button>`:''}</div>`;
      const activeTable=activeRows.length?activeRows.map((x,i)=>`<tr><td>${i+1}</td><td><b>${safeStudentName(x.plan.studentId)}</b></td><td>${safeClassName(x.plan.sourceClassId)}${x.plan.sourceSessionKey?`<div class="mini">${safeSessionLabel(x.plan.sourceSessionKey)}</div>`:''}</td><td>${safeClassName(x.plan.targetClassId)}</td><td>${x.plan.targetSessionKey?`<span class="sessionTag">${safeSessionLabel(x.plan.targetSessionKey)}</span>`:'-'}</td><td><span class="pill blue">${h(x.plan.status||'scheduled')}</span><div class="mini">${h(makeupTargetStatusText(x.plan))}</div></td><td><button class="btn ghost" data-cancel-makeup-id="${x.plan.id}" onclick="cancelMakeupPlan('${x.plan.id}','${x.plan.targetClassId}','${x.plan.targetSessionKey}')">Hủy</button></td></tr>`).join(''):'<tr><td colspan="7">Chưa có lịch học bù đã xếp.</td></tr>';
      const pendingTable=pendingRows.length?pendingRows.map((x,i)=>`<tr><td>${i+1}</td><td><b>${h(x.student.name)}</b><div class="mini">${h(classGradeLabel(x.sourceClass.name))}</div></td><td>${h(x.sourceClass.name)}</td><td>${h(x.record.sourceSessionLabel||safeSessionLabel(x.record.sourceSessionKey))}</td><td>${h(x.record.reason||'Vắng')}</td><td><span class="pill yellow">Chờ xếp</span></td></tr>`).join(''):'<tr><td colspan="6">Chưa có học sinh chờ học bù trong tháng này.</td></tr>';
      const completedTable=completedRows.length?completedRows.map((x,i)=>`<tr><td>${i+1}</td><td><b>${safeStudentName(x.plan.studentId)}</b><div class="mini">${h(x.student?.contact||'')}</div></td><td>${safeClassName(x.plan.sourceClassId)}</td><td>${x.plan.sourceSessionKey?`<span class="sessionTag">${safeSessionLabel(x.plan.sourceSessionKey)}</span>`:'-'}</td><td>${safeClassName(x.plan.targetClassId)}</td><td>${x.plan.targetSessionKey?`<span class="sessionTag">${safeSessionLabel(x.plan.targetSessionKey)}</span>`:'-'}</td><td><span class="pill green">Đã học bù</span></td></tr>`).join(''):'<tr><td colspan="7">Chưa có học sinh đã hoàn tất học bù.</td></tr>';
      return `<div class="screenTitle"><div><h1>Học bù</h1><p>Đang xem <b>${formatMonthKeyVN(monthKey)}</b></p></div><button class="btn primary" onclick="go('schedule')">Sang lịch dạy để xếp</button></div>
      <div class="panel"><div class="panelHead"><div><h2>Bộ lọc tháng</h2><div class="mini">Dữ liệu học bù không tự xóa. Admin/Quản lí/Lễ tân có thể xóa tháng không cần xử lý tiếp.</div></div>${monthControls}</div></div>
      <div class="statGrid"><div class="stat"><div class="statIcon redgrad">🚫</div><div><h3>Lượt vắng</h3><strong>${monthAbsenceCount}</strong><small>trong ${formatMonthKeyVN(monthKey)}</small></div></div><div class="stat"><div class="statIcon bluegrad">🔁</div><div><h3>Đã xếp</h3><strong>${activeRows.length}</strong><small>đang có lịch học bù tháng này</small></div></div><div class="stat"><div class="statIcon greengrad">✅</div><div><h3>Đã học bù</h3><strong>${completedRows.length}</strong><small>lịch sử hoàn tất tháng này</small></div></div><div class="stat"><div class="statIcon yellowgrad">⏳</div><div><h3>Chờ xếp</h3><strong>${pendingRows.length}</strong><small>trong tháng này</small></div></div></div>
      <div class="panel"><div class="panelHead"><div><h2>Chờ xếp học bù</h2><div class="mini">Học sinh vắng buổi chính trong ${formatMonthKeyVN(monthKey)}</div></div><button class="btn ghost" onclick="refreshCurrentRouteData()">Tải lại dữ liệu</button></div><div class="tableWrap"><table><thead><tr><th>STT</th><th>Học sinh</th><th>Lớp vắng</th><th>Buổi vắng</th><th>Lý do</th><th>Trạng thái</th></tr></thead><tbody>${pendingTable}</tbody></table></div></div>
      <div class="panel"><div class="panelHead"><h2>Đã xếp học bù</h2><span class="pill blue">${activeRows.length} lượt</span></div><div class="tableWrap"><table><thead><tr><th>STT</th><th>Học sinh</th><th>Lượt vắng</th><th>Lớp nhận</th><th>Buổi học bù</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${activeTable}</tbody></table></div></div>
      <div class="panel"><div class="panelHead"><div><h2>Đã học bù</h2><div class="mini">Ai vắng buổi nào và đã học bù vào buổi nào.</div></div><span class="pill green">${completedRows.length} lượt</span></div><div class="tableWrap"><table><thead><tr><th>STT</th><th>Học sinh</th><th>Lớp vắng</th><th>Buổi vắng</th><th>Lớp học bù</th><th>Buổi học bù</th><th>Trạng thái</th></tr></thead><tbody>${completedTable}</tbody></table></div></div>`;
    }
