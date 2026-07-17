/* Phase 8D.1: Student transfer UI/runtime, loaded with Classes. */

function v30StudentTransferRequestId(studentId,targetClassId){
      const random=(window.crypto&&typeof window.crypto.randomUUID==='function')?window.crypto.randomUUID():`${Date.now()}_${Math.random().toString(36).slice(2)}`;
      return `student-transfer:${studentId}:${targetClassId}:${random}`;
    }
    function v30StudentTransferFeedback(message='',type='error'){
      const el=document.getElementById('studentTransferFeedback');
      if(!el) return;
      el.hidden=!message;
      el.className=`staffModalFeedback ${type}`;
      el.textContent=message;
    }
    function v30ActiveTransferTargets(sourceClassId){
      return sortClassesByGrade(operationalClasses().filter(c=>String(c.id)!==String(sourceClassId)&&!isClassEnded(c)));
    }
    function v30EnrollmentHistoryMarkup(rows=[]){
      if(!rows.length) return '<div class="studentHistoryEmpty">Không có lịch sử chuyển lớp</div>';
      return `<div class="studentHistoryList">${rows.map(row=>`<div class="studentHistoryItem"><div><b>${h(row.className||'Lớp')}</b><div class="mini">${row.startDate?formatVNDate(parseISODate(row.startDate)):'-'} → ${row.endDate?formatVNDate(parseISODate(row.endDate)):'Hiện tại'}</div>${row.reason?`<div class="mini">Lý do: ${h(row.reason)}</div>`:''}</div><span class="pill ${row.status==='active'?'green':'gray'}">${row.status==='active'?'Đang học':'Đã chuyển'}</span></div>`).join('')}</div>`;
    }
    async function v30LoadStudentHistory(studentId,containerId='studentTransferHistory'){
      const box=document.getElementById(containerId);
      if(!box) return;
      box.innerHTML='<div class="mini">Đang tải lịch sử lớp...</div>';
      try{
        const data=await officialFetch(`/api/students/${encodeURIComponent(studentId)}/transfer`);
        const current=document.getElementById(containerId);
        if(current) current.innerHTML=v30EnrollmentHistoryMarkup(data.history||[]);
      }catch(e){
        const current=document.getElementById(containerId);
        const message=String(e?.message||'');
        const missingHistoryTable=/official_student_enrollments|schema cache|relation .* does not exist|PGRST205/i.test(message);
        if(current) current.innerHTML=missingHistoryTable
          ? '<div class="studentHistoryEmpty">Không có lịch sử chuyển lớp</div>'
          : `<div class="mini errorText">${h(message||'Không tải được lịch sử lớp')}</div>`;
      }
    }
    function openStudentTransferModal(sourceClassId,studentId){
      if(!canManageOperations()) return;
      const source=assertActiveClassEditable(sourceClassId,'chuyển lớp học sinh'); if(!source) return;
      const student=(source.students||[]).find(item=>String(item.id)===String(studentId));
      if(!student?.id){toast('Không tìm thấy học sinh trong lớp hiện tại');return}
      const targets=v30ActiveTransferTargets(sourceClassId);
      if(!targets.length){toast('Chưa có lớp đang học khác để chuyển đến');return}
      const today=isoDate(new Date());
      modal(`<div data-student-transfer-modal data-student-id="${h(studentId)}" class="staffModalContent"><div class="modalHead"><h2>Chuyển lớp học sinh</h2><button class="close" onclick="closeModal()">×</button></div><div class="staffModalScroll"><div class="transferStudentSummary"><div class="transferStudentInfoBlock"><span class="transferStudentLabel">Tên học sinh</span><h3 class="transferStudentName">${h(student.name)}</h3></div><div class="transferStudentInfoBlock transferCurrentClassBlock"><span class="transferStudentLabel">Lớp hiện tại</span><b class="transferCurrentClassName">${h(source.name)}</b></div></div><div class="formGrid"><label>Lớp chuyển đến<select id="studentTransferTarget" class="input">${targets.map(c=>`<option value="${h(c.id)}">${h(c.name)} • ${c.students?.length||0} học sinh</option>`).join('')}</select></label><label>Ngày bắt đầu lớp mới<input id="studentTransferDate" class="input" type="date" value="${today}"></label><label class="full">Lý do chuyển lớp<input id="studentTransferReason" class="input" maxlength="500" placeholder="VD: Điều chỉnh trình độ / thay đổi lịch học"></label></div><div id="studentTransferFeedback" class="staffModalFeedback" hidden></div><div class="studentHistoryPanel"><b>Lịch sử lớp</b><div id="studentTransferHistory" style="margin-top:8px"><div class="mini">Đang tải lịch sử lớp...</div></div></div></div><div class="staffModalFooter"><div></div><div><button class="btn ghost" onclick="openClassDetail('${sourceClassId}')">Hủy</button><button id="confirmStudentTransferBtn" class="btn primary" onclick="confirmStudentTransfer('${sourceClassId}','${studentId}')">Xác nhận chuyển lớp</button></div></div></div>`);
      setTimeout(()=>v30LoadStudentHistory(studentId),0);
    }
    function openStudentClassHistory(sourceClassId,studentId){
      const source=classById(sourceClassId);
      const student=(source?.students||[]).find(item=>String(item.id)===String(studentId));
      if(!student?.id) return;
      modal(`<div class="modalHead"><h2>Lịch sử lớp • ${h(student.name)}</h2><button class="close" onclick="closeModal()">×</button></div><div id="studentClassHistoryOnly"><div class="mini">Đang tải lịch sử lớp...</div></div><div style="text-align:right;margin-top:18px"><button class="btn ghost" onclick="openClassDetail('${sourceClassId}')">Quay lại lớp</button></div>`);
      setTimeout(()=>v30LoadStudentHistory(studentId,'studentClassHistoryOnly'),0);
    }
    function v30PatchTransferredStudentUi(sourceClassId,targetClassId){
      const scrollY=window.scrollY;
      v28InvalidateClassMarkupMemo();
      if(route==='classes'){
        const searchValue=document.getElementById('classSearch')?.value||'';
        if(searchValue) v18bUpdateClassListNow();
        else{
          v28PatchClassCard(sourceClassId);
          v28PatchClassCard(targetClassId);
        }
        v28UpdateClassSummaryCounts();
      }
      requestAnimationFrame(()=>{
        if(Math.abs(window.scrollY-scrollY)>2) window.scrollTo({top:scrollY,left:0,behavior:'auto'});
      });
    }
    function v30PersistStudentTransfer(sourceClassId,targetClassId,transferDate){
      v20bAfterMutation(['core'],{preserveCache:true,delayMs:5000,renderOnRevalidate:false,classId:sourceClassId});
      const modules=canViewTuition()?['schedule','makeup','evaluation','tuition']:['schedule','makeup','evaluation'];
      v20bAfterMutation(modules,{delayMs:5000,renderOnRevalidate:false,classId:targetClassId,month:String(transferDate||'').slice(0,7)});
      const corePayload={classes:db.classes||[],teachers:db.teachers||[]};
      v18iHashPayload('classes:latest',corePayload);
      moduleCacheSet('classes:latest',corePayload);
      lazyRouteState.core={loaded:true,loading:false,loadedAt:Date.now(),mutated:true,sharedFresh:true};
      saveLocalOnly();
      v30PatchTransferredStudentUi(sourceClassId,targetClassId);
    }
    async function confirmStudentTransfer(sourceClassId,studentId){
      if(!canManageOperations()) return;
      const source=assertActiveClassEditable(sourceClassId,'chuyển lớp học sinh'); if(!source) return;
      const existing=(source.students||[]).find(item=>String(item.id)===String(studentId));
      if(!existing?.id){v30StudentTransferFeedback('Học sinh không còn trong lớp hiện tại. Hãy tải lại dữ liệu.');return}
      const targetClassId=document.getElementById('studentTransferTarget')?.value||'';
      const transferDate=document.getElementById('studentTransferDate')?.value||isoDate(new Date());
      const reason=(document.getElementById('studentTransferReason')?.value||'').trim();
      const target=classById(targetClassId);
      if(!target?.id || isClassEnded(target)){v30StudentTransferFeedback('Chọn một lớp đang học hợp lệ.');return}
      if(String(targetClassId)===String(sourceClassId)){v30StudentTransferFeedback('Lớp chuyển đến phải khác lớp hiện tại.');return}
      const button=document.getElementById('confirmStudentTransferBtn');
      const action=window.MsUiAction.beginLockedAction(`student-transfer:${studentId}`,button,'Đang chuyển lớp...');
      if(!action) return;
      v30StudentTransferFeedback('');
      const modalEl=document.querySelector('[data-student-transfer-modal]');
      const requestId=modalEl?.dataset.transferRequestId||v30StudentTransferRequestId(studentId,targetClassId);
      if(modalEl) modalEl.dataset.transferRequestId=requestId;

      let data;
      try{
        data=await window.MsUiAction.measureAsync('Chuyển lớp học sinh',()=>officialFetch(`/api/students/${encodeURIComponent(studentId)}/transfer`,{
          method:'POST',
          body:JSON.stringify({targetClassId,transferDate,reason,requestId})
        }),450);
      }catch(e){
        window.MsUiAction.endLockedAction(action);
        v30StudentTransferFeedback(e.message||'Không chuyển lớp được. Dữ liệu đã nhập vẫn được giữ.');
        return;
      }

      try{
        const moved={...existing,...(data.student||{}),id:studentId,classId:targetClassId};
        source.students=(source.students||[]).filter(item=>String(item.id)!==String(studentId));
        target.students ||= [];
        target.students=target.students.filter(item=>String(item.id)!==String(studentId));
        target.students.push(moved);
        target.students.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'vi'));
        v30PersistStudentTransfer(sourceClassId,targetClassId,transferDate);
      }catch(uiError){
        console.error('Đã chuyển lớp trên server nhưng cập nhật giao diện cục bộ gặp lỗi',uiError);
        v28RecoverClassUi('',true);
      }

      window.MsUiAction.endLockedAction(action);
      closeModal(true);
      toast(`Chuyển lớp thành công: ${existing.name} → ${target.name}.`);
    }
