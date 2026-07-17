/*
 * Phase 7G Tuition Module
 * Fast local DOM updates plus one-request class/global message status updates.
 * Collapsed classes do not build student-row HTML until opened.
 */

function tuitionRowDomId(studentId){
  return `tuitionRow_${v18bSafeId(studentId)}`;
}
function tuitionGroupDomId(className){
  return `tuitionGroup_${v18bSafeId(className)}`;
}
function tuitionGroupSummaryDomId(className){
  return `tuitionGroupSummary_${v18bSafeId(className)}`;
}
function tuitionGroupSummaryText(g){
  const groupAdjustment=(g.items||[]).reduce((s,r)=>s+Number(r.adjustmentAmount||0),0);
  const groupCredit=(g.items||[]).reduce((s,r)=>s+Number(r.creditAmount||0),0);
  return `${g.items.length} học sinh • Tổng ${fmt.format(g.total)}đ • Phát sinh ${fmt.format(groupAdjustment)}đ • Khấu trừ ${fmt.format(groupCredit)}đ • Đã gửi ${g.sent}/${g.items.length}`;
}
function tuitionStudentRowMarkup(r){
  const sendKey=`send:${tuitionMonthKey()}:${r.student.id}`;
  const paidKey=`paid:${tuitionMonthKey()}:${r.student.id}`;
  const adjustmentItems=r.adjustmentItems||[];
  const adjustmentDetail=adjustmentItems.length?v27AdjustmentSummary(r):'';
  return `<tr id="${tuitionRowDomId(r.student.id)}" data-tuition-student="${h(r.student.id)}" data-tuition-class="${h(r.className)}">
    <td class="studentCell"><b>${r.student.name}</b><div class="mini">${r.student.contact||''}</div></td>
    <td class="countCell plannedCell"><b>${r.plannedSessions||0}</b></td>
    <td class="money smallMoney unitPriceCell">${fmt.format(Number(r.unitPrice||0))}đ</td>
    <td class="money smallMoney amountCell">${fmt.format(Number(r.tuitionAmount||0))}đ</td>
    <td class="adjustmentCell">
      <div class="adjustmentAmount"><b>${fmt.format(Number(r.adjustmentAmount||0))}đ</b></div>
      ${adjustmentDetail?`<div class="mini adjustmentDetailText">${h(adjustmentDetail)}</div>`:''}
      ${canManageTuition()&&adjustmentItems.length?`<button class="btn ghost miniCardBtn adjustmentEditBtn" onclick="openTuitionAdjustmentModal('${r.student.id}')">Sửa phát sinh</button>`:''}
    </td>
    <td class="materialFeeCell"><div class="materialFeeAmount"><b>${fmt.format(Number(r.materialFee||0))}đ</b></div>${r.materialNote?`<div class="mini materialNoteText">${h(r.materialNote)}</div>`:''}${canManageTuition()?`<button class="btn ghost miniCardBtn materialEditBtn" onclick="openMaterialFeeModal('${r.student.id}')">Sửa học liệu</button>`:''}</td>
    <td class="debtCell">${Number(r.previousDebt||0)?`<b>${fmt.format(Number(r.previousDebt||0))}đ</b><div class="mini">${h(tuitionArrearsText(r))}</div>`:'0đ'}</td>
    <td class="money creditCell">${Number(r.creditAmount||0)?`-${fmt.format(Number(r.creditAmount||0))}đ`:'0đ'}</td>
    <td class="money totalCell">${fmt.format(Number(r.amount||0))}đ</td>
    <td class="statusCell">${r.paid?'<span class="paidBadge">Đã đóng học phí</span>':'<span class="unpaidBadge">Chưa đóng</span>'}</td>
    ${canManageTuition()?`<td class="sendCell"><div class="tableActionStack tuitionSendStack">${isTuitionMessageSent(r.student.id)?'<span class="sentBadge">Đã gửi</span>':`<button class="btn ghost miniCardBtn" ${v20o2BusyButtonAttrs(sendKey,'Đang gửi...')} onclick="openTuitionMessage('${r.student.id}')">Gửi</button>`}<button class="btn ghost miniCardBtn" onclick="copyTuitionMessage('${r.student.id}')">Copy</button><button class="btn ghost miniCardBtn" onclick="openTuitionImage('${r.student.id}')">Tạo ảnh</button></div></td><td class="paidActionCell">${r.paid?`<div class="tableActionStack"><span class="paidBadge">Đã nộp</span><button class="btn ghost miniCardBtn" ${v20o2BusyButtonAttrs(paidKey,'Đang lưu...')} onclick="unmarkPaid('${r.student.id}')">Bỏ nộp</button></div>`:`<button class="btn primary miniCardBtn" ${v20o2BusyButtonAttrs(paidKey,'Đang lưu...')} onclick="markPaid('${r.student.id}')">Đã nộp</button>`}</td>`:''}
  </tr>`;
}
function tuitionGroupBlockMarkup(g,gi=0){
  const collapsed=isTuitionGroupCollapsed(g.className);
  const classSendKey=`sendclass:${tuitionMonthKey()}:${v18bSafeId(g.className)}`;
  // Phase 7F: never build hundreds of row nodes for a class that is closed.
  const rowsMarkup=collapsed?'':(g.items||[]).map(tuitionStudentRowMarkup).join('');
  return `<div id="${tuitionGroupDomId(g.className)}" data-tuition-group="${h(g.className)}" class="classBillingBlock ${collapsed?'collapsedBillingBlock':''}" style="--i:${gi}">
    <div class="classBillingHead"><div><h2>${g.className}</h2><div id="${tuitionGroupSummaryDomId(g.className)}" class="mini">${tuitionGroupSummaryText(g)}</div></div>
    <div class="billingHeadActions"><button class="btn ghost miniCardBtn" onclick="toggleTuitionClassGroup('${h(g.className)}')">${collapsed?'Mở bảng':'Thu gọn'}</button>${canManageTuition()?`<button class="btn ghost miniCardBtn" ${v20o2BusyButtonAttrs(classSendKey,'Đang gửi...')} onclick="sendTuitionClassBulk(this)">Gửi lớp này</button>`:''}</div></div>
    ${collapsed?'':`<div class="tableWrap tuitionTableWrap"><table class="tuitionTable tuitionTableV20O"><thead><tr><th class="colStudent">Học sinh</th><th>Buổi dự kiến</th><th>Đơn giá</th><th>Học phí tháng</th><th>Phát sinh</th><th>Học liệu</th><th>Nợ cũ</th><th>Khấu trừ</th><th>Tổng</th><th>Trạng thái</th>${canManageTuition()?'<th>Gửi</th><th>Thao tác</th>':''}</tr></thead><tbody>${rowsMarkup}</tbody></table></div>`}
  </div>`;
}
function tuitionGroupsMarkup(groups=groupBillingRowsByClass(filteredBillingRows())){
  return groups.length?groups.map((g,gi)=>tuitionGroupBlockMarkup(g,gi)).join(''):'<div class="empty">Không có học sinh phù hợp bộ lọc.</div>';
}
function tuitionPatchStatsDom(){
  const root=document.getElementById('tuitionPageRoot');
  if(!root) return false;
  const all=baseBillingRows();
  const rows=filteredBillingRows();
  const total=rows.reduce((s,r)=>s+Number(r.amount||0),0);
  const paidRows=rows.filter(r=>r.paid);
  const paidTotal=paidRows.reduce((s,r)=>s+Number(r.amount||0),0);
  const creditTotal=rows.reduce((s,r)=>s+Number(r.creditAmount||0),0);
  const adjustmentTotal=rows.reduce((s,r)=>s+Number(r.adjustmentAmount||0),0);
  const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text};
  set('tuitionFilterSummaryText',`Hiển thị ${rows.length}/${all.length} học sinh`);
  set('tuitionStatTotal',fmt.format(total));
  set('tuitionStatPaidTotal',fmt.format(paidTotal));
  set('tuitionStatPaidCount',`${paidRows.length}/${rows.length} học sinh`);
  set('tuitionStatAdjustment',fmt.format(adjustmentTotal));
  set('tuitionStatCredit',fmt.format(creditTotal));
  return true;
}
function tuitionPatchGroupSummaryDom(className){
  const groups=groupBillingRowsByClass(filteredBillingRows());
  const group=groups.find(g=>String(g.className)===String(className));
  const el=document.getElementById(tuitionGroupSummaryDomId(className));
  if(!group || !el) return false;
  el.textContent=tuitionGroupSummaryText(group);
  return true;
}
function tuitionRenderGroupDom(className){
  const groups=groupBillingRowsByClass(filteredBillingRows());
  const index=groups.findIndex(g=>String(g.className)===String(className));
  const old=document.getElementById(tuitionGroupDomId(className));
  if(index<0 || !old) return false;
  old.outerHTML=tuitionGroupBlockMarkup(groups[index],index);
  tuitionPatchStatsDom();
  return true;
}
function tuitionRenderAllGroupsDom(){
  const wrap=document.getElementById('tuitionGroups');
  if(!wrap) return false;
  wrap.innerHTML=tuitionGroupsMarkup();
  tuitionPatchStatsDom();
  return true;
}

function tuitionPage(){
  if(!canViewTuition()){
    return `<div class="screenTitle"><div><h1>Học phí</h1><p>Giáo viên/TA không có quyền xem thông tin học phí.</p></div></div><div class="blockedBox"><h2>🔒 Không có quyền truy cập</h2><p>Thông tin học phí chỉ hiển thị với Admin và Quản lí.</p></div>`;
  }

  const all=baseBillingRows();
  const rows=filteredBillingRows();
  const f=tuitionFilterState();
  const total=rows.reduce((s,r)=>s+Number(r.amount||0),0);
  const paidRows=rows.filter(r=>r.paid);
  const paidTotal=paidRows.reduce((s,r)=>s+Number(r.amount||0),0);
  const creditTotal=rows.reduce((s,r)=>s+Number(r.creditAmount||0),0);
  const adjustmentTotal=rows.reduce((s,r)=>s+Number(r.adjustmentAmount||0),0);
  const groups=groupBillingRowsByClass(rows);
  const loading=lazyRouteState?.tuition?.loading;

  return `<div id="tuitionPageRoot">${parentChildSelector()}<div class="screenTitle"><div><h1>Học phí</h1><p>Thu trước theo tháng. Học sinh mới giữa tháng có thể gộp khoản phát sinh vào cùng hóa đơn tháng sau.</p></div>${canManageTuition()?`<div class="actions"><button class="btn ghost" onclick="refreshCurrentRouteData()">Tải lại</button><button class="btn primary" ${v20o2BusyButtonAttrs(`sendbulk:${tuitionMonthKey()}`,'Đang gửi...')} onclick="sendTuitionMessageBulk()">Gửi hàng loạt</button></div>`:''}</div>
  <div class="toolbar compactFilters tuitionFilters">
    <label><span>Tháng tính học phí</span><div class="tuitionMonthPick"><select class="input" onchange="setTuitionMonthPart('month',this.value)">${tuitionMonthOptions(tuitionMonthParts(f.month).month)}</select><input class="input" type="number" min="2020" max="2099" value="${tuitionMonthParts(f.month).year}" onchange="setTuitionMonthPart('year',this.value)" placeholder="Năm"></div></label>
    <label><span>Tìm học sinh / lớp</span><input class="input" value="${h(f.q||'')}" placeholder="Nhập tên học sinh, lớp, liên hệ..." oninput="setTuitionFilter('q',this.value)"></label>
    <label><span>Trạng thái</span><select class="input" onchange="setTuitionFilter('status',this.value)"><option value="all" ${f.status==='all'?'selected':''}>Tất cả</option><option value="paid" ${f.status==='paid'?'selected':''}>Đã đóng</option><option value="unpaid" ${f.status==='unpaid'?'selected':''}>Chưa đóng</option></select></label>
    <div class="filterSummary">${loading?'<span class="pill blue">Đang tải...</span>':''} <span id="tuitionFilterSummaryText">Hiển thị ${rows.length}/${all.length} học sinh</span></div>
  </div>
  <div class="tuitionQuickActions"><button class="btn ghost" onclick="collapseAllTuitionGroups(false)">Mở tất cả lớp</button><button class="btn ghost" onclick="collapseAllTuitionGroups(true)">Thu gọn tất cả</button></div>
  <div class="statGrid">
    <div class="stat" style="--i:0"><div class="statIcon redgrad">💰</div><div><h3>Tổng đang lọc</h3><strong id="tuitionStatTotal" style="font-size:26px">${fmt.format(total)}</strong><small>đồng</small></div></div>
    <div class="stat" style="--i:1"><div class="statIcon greengrad">✅</div><div><h3>Đã nộp</h3><strong id="tuitionStatPaidTotal">${fmt.format(paidTotal)}</strong><small id="tuitionStatPaidCount">${paidRows.length}/${rows.length} học sinh</small></div></div>
    <div class="stat" style="--i:2"><div class="statIcon bluegrad">➕</div><div><h3>Phát sinh</h3><strong id="tuitionStatAdjustment">${fmt.format(adjustmentTotal)}</strong><small>đồng từ học sinh mới</small></div></div>
    <div class="stat" style="--i:3"><div class="statIcon yellowgrad">➖</div><div><h3>Khấu trừ</h3><strong id="tuitionStatCredit">${fmt.format(creditTotal)}</strong><small>đồng từ tháng trước</small></div></div>
  </div>
  <div id="tuitionGroups">${tuitionGroupsMarkup(groups)}</div></div>`;
}


/* Phase 8D.3: Tuition interaction, DOM patching and image runtime. */
async function markPaid(studentId){
      const busyKey=`paid:${tuitionMonthKey()}:${studentId}`;
      if(v20o2IsBusy(busyKey)) return;
      const r=tuitionRowByStudentId(studentId);
      try{
        v20o2SetBusy(busyKey,true);
        await officialFetch('/api/tuition/status',{method:'POST',body:JSON.stringify({studentId,monthKey:tuitionMonthKey(),monthKeys:[tuitionMonthKey(),...((r?.arrearsMonths||[]).map(x=>x.monthKey))],action:'paid',snapshot:r||null})});
        ensurePayments()[paymentKey(studentId)]={paid:true,at:new Date().toLocaleString('vi-VN'),by:currentUser.id};
        v27MarkLocalAdjustmentsIncluded(studentId,true);
        v20o2RerenderTuitionLight(studentId);
        v20o2RefreshTuitionBackground();
        toast('Đã đánh dấu đã nộp học phí');
      }catch(e){toast(e.message||'Không cập nhật được học phí')}
      finally{v20o2SetBusy(busyKey,false)}
    }

async function unmarkPaid(studentId){
      const busyKey=`paid:${tuitionMonthKey()}:${studentId}`;
      if(v20o2IsBusy(busyKey)) return;
      try{
        v20o2SetBusy(busyKey,true);
        await officialFetch('/api/tuition/status',{method:'POST',body:JSON.stringify({studentId,monthKey:tuitionMonthKey(),action:'unpaid'})});
        delete ensurePayments()[paymentKey(studentId)];
        v20o2RerenderTuitionLight(studentId);
        v20o2RefreshTuitionBackground();
        toast('Đã bỏ trạng thái đã nộp');
      }catch(e){toast(e.message||'Không cập nhật được học phí')}
      finally{v20o2SetBusy(busyKey,false)}
    }

function openMaterialFeeModal(studentId){
      if(!canManageTuition()) return;
      const r=tuitionRowByStudentId(studentId);
      if(!r){toast('Không tìm thấy học sinh trong bảng học phí');return}
      modal(`<div class="modalHead"><h2>Tiền học liệu • ${h(r.student.name)}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="materialFeeSummary">
        <div><span>Tháng</span><b>${formatTuitionMonth(tuitionMonthKey())}</b></div>
        <div><span>Học phí tháng</span><b>${fmt.format(Number(r.tuitionAmount||0))}đ</b></div>
        <div><span>Học liệu hiện tại</span><b>${fmt.format(Number(r.materialFee||0))}đ</b></div>
      </div>
      <div class="formGrid" style="margin-top:14px">
        <label>Số tiền học liệu<input id="materialFeeInput" class="input" inputmode="numeric" value="${Number(r.materialFee||0)}" placeholder="VD: 120000"></label>
        <label class="full">Ghi chú học liệu<input id="materialNoteInput" class="input" value="${h(r.materialNote||'')}" placeholder="VD: Sách + photo đề tháng này"></label>
      </div>
      <div class="mini" style="margin-top:10px">Khoản này tính riêng theo từng học sinh và từng tháng. Nhập 0 nếu tháng này không thu học liệu.</div>
      <div style="text-align:right;margin-top:18px" class="billingActions"><button class="btn ghost" onclick="closeModal()">Hủy</button><button class="btn primary" ${v20o2BusyButtonAttrs(`material:${tuitionMonthKey()}:${studentId}`,'Đang lưu...')} onclick="saveMaterialFee('${studentId}')">Lưu học liệu</button></div>`)
    }

async function saveMaterialFee(studentId){
      const busyKey=`material:${tuitionMonthKey()}:${studentId}`;
      if(v20o2IsBusy(busyKey)) return;
      const fee=Number(String(document.getElementById('materialFeeInput')?.value||'0').replace(/[^0-9.-]/g,''));
      if(!Number.isFinite(fee) || fee<0){toast('Tiền học liệu không hợp lệ');return}
      const note=(document.getElementById('materialNoteInput')?.value||'').trim();
      try{
        v20o2SetBusy(busyKey,true);
        await officialFetch('/api/tuition/status',{method:'POST',body:JSON.stringify({studentId,monthKey:tuitionMonthKey(),action:'material',materialFee:Math.round(fee),materialNote:note})});
        v20o2PatchLocalTuitionRow(studentId,{materialFee:Math.round(fee),materialNote:note,materialUpdatedAt:new Date().toISOString(),materialUpdatedBy:currentUser.id});
        v20o2RerenderTuitionLight(studentId);
        closeModal();
        toast('Đã lưu tiền học liệu');
        v20o2RefreshTuitionBackground();
      }catch(e){toast(e.message||'Không lưu được tiền học liệu')}
      finally{v20o2SetBusy(busyKey,false)}
    }

function v27NormalizeAdjustmentItem(item){
      if(!item) return null;
      return {
        id:item.id,
        type:item.type||item.adjustment_type||'new_student_proration',
        sourceMonth:item.sourceMonth||item.source_month||'',
        targetMonth:item.targetMonth||item.target_month||'',
        enrollmentStartDate:item.enrollmentStartDate||item.enrollment_start_date||'',
        firstSessionKey:item.firstSessionKey||item.first_session_key||'',
        sessionDates:item.sessionDates||item.session_dates||[],
        sessionCount:Number(item.sessionCount??item.session_count??0),
        unitPrice:Number(item.unitPrice??item.unit_price??0),
        amount:Number(item.amount||0),
        note:item.note||'',
        status:item.status||'pending',
        createdAt:item.createdAt||item.created_at||'',
        updatedAt:item.updatedAt||item.updated_at||''
      };
    }

function v27AdjustmentDetailText(item){
      const x=v27NormalizeAdjustmentItem(item); if(!x) return '';
      return `${v27MonthLabel(x.sourceMonth)}: ${x.sessionCount} buổi × ${fmt.format(x.unitPrice)}đ = ${fmt.format(x.amount)}đ`;
    }

function v27AdjustmentSummary(r){
      const items=(r?.adjustmentItems||[]).map(v27NormalizeAdjustmentItem).filter(Boolean);
      return items.map(v27AdjustmentDetailText).join('; ');
    }

function v27PatchAdjustmentLocal(studentId,adjustment){
      const currentMonth=tuitionMonthKey();
      const row=(db.tuitionRollup||{})[studentId]||zeroFeeRow();
      let items=(row.adjustmentItems||[]).map(v27NormalizeAdjustmentItem).filter(Boolean).filter(x=>String(x.id)!==String(adjustment?.id));
      const normalized=v27NormalizeAdjustmentItem(adjustment);
      if(normalized && normalized.status!=='cancelled' && normalized.targetMonth===currentMonth) items.push(normalized);
      const adjustmentAmount=items.reduce((sum,x)=>sum+Number(x.amount||0),0);
      return v20o2PatchLocalTuitionRow(studentId,{adjustmentItems:items,adjustmentAmount});
    }

function v27MarkLocalAdjustmentsIncluded(studentId,included=true){
      const row=(db.tuitionRollup||{})[studentId];
      if(!row||!Array.isArray(row.adjustmentItems)||!row.adjustmentItems.length) return;
      const now=new Date().toISOString();
      const items=row.adjustmentItems.map(item=>({...v27NormalizeAdjustmentItem(item),status:included?'included':'pending',updatedAt:now}));
      v20o2PatchLocalTuitionRow(studentId,{adjustmentItems:items});
    }

function openTuitionAdjustmentModal(studentId){
      if(!canManageTuition()) return;
      const r=tuitionRowByStudentId(studentId);
      const item=v27NormalizeAdjustmentItem((r?.adjustmentItems||[])[0]);
      if(!r||!item){toast('Không tìm thấy khoản phát sinh trong tháng này');return}
      const locked=item.status==='included';
      modal(`<div class="modalHead"><h2>Học phí phát sinh • ${h(r.student.name)}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="adjustmentInfoGrid">
        <div><span>Tháng phát sinh</span><b>${h(v27MonthLabel(item.sourceMonth))}</b></div>
        <div><span>Ngày bắt đầu</span><b>${item.enrollmentStartDate?h(formatVNDate(parseISODate(item.enrollmentStartDate))):'-'}</b></div>
        <div><span>Trạng thái</span><b>${item.status==='included'?'Đã đưa vào hóa đơn':'Chờ đưa vào hóa đơn'}</b></div>
        <div><span>Thành tiền</span><b>${fmt.format(item.amount)}đ</b></div>
      </div>
      ${locked?'<div class="dangerBox compactDanger"><b>Hóa đơn đã được gửi hoặc đã nộp</b><span>Hãy bỏ trạng thái gửi/nộp trước khi thay đổi khoản phát sinh.</span></div>':''}
      <div class="formGrid" style="margin-top:14px">
        <label>Số buổi<input id="adjustmentSessionCount" class="input" type="number" min="0" max="100" value="${item.sessionCount}" ${locked?'disabled':''}></label>
        <label>Đơn giá/buổi<input id="adjustmentUnitPrice" class="input" inputmode="numeric" value="${item.unitPrice}" ${locked?'disabled':''}></label>
        <label>Tháng thu<input id="adjustmentTargetMonth" class="input" type="month" min="${addMonthsToMonthKey(item.sourceMonth,1)}" value="${h(item.targetMonth)}" ${locked?'disabled':''}></label>
        <label class="full">Ghi chú<input id="adjustmentNote" class="input" value="${h(item.note||'')}" ${locked?'disabled':''}></label>
      </div>
      <div style="text-align:right;margin-top:18px" class="billingActions"><button class="btn ghost" onclick="closeModal()">Đóng</button>${locked?'':`<button class="btn dangerAction" ${v20o2BusyButtonAttrs(`adjustment:${item.id}`,'Đang hủy...')} onclick="cancelTuitionAdjustment('${studentId}','${item.id}')">Không tính khoản này</button><button class="btn primary" ${v20o2BusyButtonAttrs(`adjustment:${item.id}`,'Đang lưu...')} onclick="saveTuitionAdjustment('${studentId}','${item.id}')">Lưu thay đổi</button>`}</div>`)
    }

async function saveTuitionAdjustment(studentId,adjustmentId){
      const busyKey=`adjustment:${adjustmentId}`; if(v20o2IsBusy(busyKey)) return;
      const sessionCount=Number(document.getElementById('adjustmentSessionCount')?.value||0);
      const unitPrice=Number(String(document.getElementById('adjustmentUnitPrice')?.value||0).replace(/[^0-9.-]/g,''));
      const targetMonth=document.getElementById('adjustmentTargetMonth')?.value||'';
      const note=(document.getElementById('adjustmentNote')?.value||'').trim();
      if(!Number.isInteger(sessionCount)||sessionCount<0){toast('Số buổi không hợp lệ');return}
      if(!Number.isFinite(unitPrice)||unitPrice<0){toast('Đơn giá không hợp lệ');return}
      try{
        v20o2SetBusy(busyKey,true);
        const data=await officialFetch(`/api/tuition/adjustments/${encodeURIComponent(adjustmentId)}`,{method:'PATCH',body:JSON.stringify({action:'update',sessionCount,unitPrice,targetMonth,note})});
        v27PatchAdjustmentLocal(studentId,data.adjustment);
        v20o2RerenderTuitionLight(studentId); closeModal(); toast('Đã cập nhật khoản học phí phát sinh');
        v20o2RefreshTuitionBackground();
      }catch(e){toast(e.message||'Không cập nhật được khoản phát sinh')}
      finally{v20o2SetBusy(busyKey,false)}
    }

async function cancelTuitionAdjustment(studentId,adjustmentId){
      const busyKey=`adjustment:${adjustmentId}`; if(v20o2IsBusy(busyKey)) return;
      if(!confirm('Không tính khoản học phí phát sinh này? Khoản sẽ bị loại khỏi hóa đơn tháng đang chọn.')) return;
      try{
        v20o2SetBusy(busyKey,true);
        const data=await officialFetch(`/api/tuition/adjustments/${encodeURIComponent(adjustmentId)}`,{method:'PATCH',body:JSON.stringify({action:'cancel'})});
        v27PatchAdjustmentLocal(studentId,data.adjustment);
        v20o2RerenderTuitionLight(studentId); closeModal(); toast('Đã hủy khoản học phí phát sinh');
        v20o2RefreshTuitionBackground();
      }catch(e){toast(e.message||'Không hủy được khoản phát sinh')}
      finally{v20o2SetBusy(busyKey,false)}
    }

function tuitionRowByStudentId(studentId){return visibleBillingRows().find(r=>r.student.id===studentId)}

function tuitionArrearsText(r){
      const arr=r.arrearsMonths||[];
      if(!arr.length) return '0đ';
      return arr.map(x=>`${formatTuitionMonth(x.monthKey)}: ${fmt.format(Number(x.amount||0))}đ`).join('; ');
    }

function tuitionPaymentInfoText(){
      return `Thông tin chuyển khoản:
Ngân hàng Techcombank Hà Thành
STK: 4246388338
CTK: CAO HUONG GIANG`;
    }

function tuitionMessageText(r){
      const planned=Number(r.plannedSessions||r.billable||0), unit=Number(r.unitPrice||db.settings?.unitPrice||70000), tuitionAmount=Number(r.tuitionAmount||0), materialFee=Number(r.materialFee||0), adjustmentAmount=Number(r.adjustmentAmount||0), previousDebt=Number(r.previousDebt||0), creditAmount=Number(r.creditAmount||0), total=Number(r.amount||0);
      const adjustmentLines=(r.adjustmentItems||[]).map(item=>{const x=v27NormalizeAdjustmentItem(item); return x?`- Học phí phát sinh ${v27MonthLabel(x.sourceMonth).toLowerCase()}: ${x.sessionCount} buổi × ${fmt.format(x.unitPrice)}đ = ${fmt.format(x.amount)}đ`:''}).filter(Boolean).join('\n');
      return `Kính gửi phụ huynh bé ${r.student.name},

Trung tâm Ms.Giang English gửi thông tin học phí ${formatTuitionMonth(tuitionMonthKey()).toLowerCase()} của bé:
- Lớp: ${r.className}
- Số buổi dự kiến trong tháng: ${planned} buổi
- Đơn giá/buổi: ${fmt.format(unit)}đ
- Học phí tháng: ${fmt.format(tuitionAmount)}đ
${adjustmentLines?adjustmentLines+'\n':''}- Tiền học liệu: ${fmt.format(materialFee)}đ${r.materialNote?` (${r.materialNote})`:''}
- Công nợ cũ chưa nộp: ${fmt.format(previousDebt)}đ${previousDebt?` (${tuitionArrearsText(r)})`:''}
- Khấu trừ từ tháng trước: ${fmt.format(creditAmount)}đ
- Tổng cần đóng: ${fmt.format(total)}đ
- Trạng thái: ${r.paid?'Đã đóng học phí':'Chưa đóng học phí'}

Phụ huynh vui lòng kiểm tra và thanh toán đúng hạn. Xin cảm ơn!

${tuitionPaymentInfoText()}

Ms.Giang English`;
    }

async function copyTuitionMessage(studentId){
      if(!canManageTuition()) return;
      const r=tuitionRowByStudentId(studentId);
      if(!r){toast('Không tìm thấy học sinh trong bảng học phí');return}
      const text=tuitionMessageText(r);
      try{
        if(navigator.clipboard?.writeText){
          await navigator.clipboard.writeText(text);
        }else{
          const ta=document.createElement('textarea');
          ta.value=text; ta.setAttribute('readonly','');
          ta.style.position='fixed'; ta.style.left='-9999px';
          document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        }
        toast('Đã copy nội dung học phí');
      }catch(e){
        console.warn('Không copy được nội dung học phí',e);
        toast('Không copy được. Vui lòng thử lại hoặc copy thủ công.');
      }
    }

function openTuitionMessage(studentId){
      if(!canManageTuition()) return;
      const r=tuitionRowByStudentId(studentId);
      if(!r){toast('Không tìm thấy học sinh trong bảng học phí');return}
      modal(`<div class="modalHead"><h2>Gửi học phí phụ huynh</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="tuitionMessageBox" id="tuitionMessageBox_${studentId}">${h(tuitionMessageText(r))}</div>
      <div style="margin-top:14px;text-align:right" class="billingActions tuitionMessageActions"><button class="btn ghost" onclick="closeModal()">Đóng</button><button class="btn ghost" onclick="copyTuitionMessage('${studentId}')">Copy</button><button class="btn ghost" onclick="openTuitionImage('${studentId}')">Tạo ảnh</button><button class="btn primary" ${v20o2BusyButtonAttrs(`send:${tuitionMonthKey()}:${studentId}`,'Đang gửi...')} onclick="sendTuitionMessage('${studentId}')">Gửi</button>${r.paid?'<span class="paidBadge">Đã nộp</span>':`<button class="btn green" ${v20o2BusyButtonAttrs(`paid:${tuitionMonthKey()}:${studentId}`,'Đang lưu...')} onclick="markPaid('${studentId}')">Đã nộp</button>`}</div>`)
    }

async function sendTuitionMessage(studentId){
      const busyKey=`send:${tuitionMonthKey()}:${studentId}`;
      if(v20o2IsBusy(busyKey)) return;
      const r=tuitionRowByStudentId(studentId);
      try{
        v20o2SetBusy(busyKey,true);
        await officialFetch('/api/tuition/status',{method:'POST',body:JSON.stringify({studentId,monthKey:tuitionMonthKey(),action:'sent',snapshot:r||null})});
        ensureTuitionMessages()[paymentKey(studentId)]={sent:true,at:new Date().toLocaleString('vi-VN'),by:currentUser.id};
        v27MarkLocalAdjustmentsIncluded(studentId,true);
        v20o2RerenderTuitionLight(studentId);
        v20o2RefreshTuitionBackground();
        toast('Đã đánh dấu đã gửi học phí');
      }catch(e){toast(e.message||'Không cập nhật trạng thái gửi')}
      finally{v20o2SetBusy(busyKey,false)}
    }

function v7gCommitBulkTuitionSent(rows){
      const at=new Date().toLocaleString('vi-VN');
      rows.forEach(r=>{
        ensureTuitionMessages()[paymentKey(r.student.id)]={sent:true,at,by:currentUser.id};
        v27MarkLocalAdjustmentsIncluded(r.student.id,true);
      });
      v20o2InvalidateTuitionRows();
      v20bAfterMutation(['tuition'],{preserveCache:true,noRefresh:true});
      v18fUpdateTuitionModuleCache();
      saveLocalOnly();
      if(route==='tuition' && !v7fPatchTuitionVisibleDom()) v7fRenderTuitionPageOnly();
    }

async function v7gSendTuitionRowsBulk(rows,busyKey,label){
      if(!canManageTuition() || v20o2IsBusy(busyKey)) return;
      const pending=(rows||[]).filter(r=>r?.student?.id && !isTuitionMessageSent(r.student.id));
      if(!pending.length){toast('Tất cả học sinh trong danh sách đã được đánh dấu đã gửi');return}
      try{
        v20o2SetBusy(busyKey,true);
        const data=await officialFetch('/api/tuition/status/bulk',{method:'POST',body:JSON.stringify({
          monthKey:tuitionMonthKey(),
          action:'sent',
          items:pending.map(r=>({studentId:r.student.id,snapshot:r}))
        })});
        v7gCommitBulkTuitionSent(pending);
        v20o2RefreshTuitionBackground();
        toast(`${label}: ${Number(data?.processed||pending.length)} học sinh`);
        if(data?.adjustmentWarning) console.warn('Tuition adjustment bulk warning',data.adjustmentWarning);
      }catch(e){toast(e.message||'Không cập nhật được trạng thái gửi hàng loạt')}
      finally{v20o2SetBusy(busyKey,false)}
    }

async function sendTuitionClassBulk(button){
      if(!canManageTuition()) return;
      const block=button?.closest?.('[data-tuition-group]');
      const className=block?.getAttribute('data-tuition-group')||'';
      const rows=visibleBillingRows().filter(r=>String(r.className)===String(className));
      if(!rows.length){toast('Không có học sinh trong lớp này');return}
      const pending=rows.filter(r=>!isTuitionMessageSent(r.student.id));
      if(!pending.length){toast('Lớp này đã được đánh dấu gửi hết');return}
      if(!confirm(`Đánh dấu đã gửi cho ${pending.length} học sinh lớp ${className}?`)) return;
      const busyKey=button?.getAttribute?.('data-busy-key')||`sendclass:${tuitionMonthKey()}:${className}`;
      return v7gSendTuitionRowsBulk(pending,busyKey,'Đã gửi lớp');
    }

async function sendTuitionMessageBulk(){
      if(!canManageTuition()) return;
      const rows=visibleBillingRows();
      const pending=rows.filter(r=>!isTuitionMessageSent(r.student.id));
      if(!rows.length){toast('Không có học sinh trong danh sách lọc');return}
      if(!pending.length){toast('Danh sách đang lọc đã được đánh dấu gửi hết');return}
      if(!confirm(`Đánh dấu đã gửi cho ${pending.length} học sinh trong danh sách đang lọc?`)) return;
      return v7gSendTuitionRowsBulk(pending,`sendbulk:${tuitionMonthKey()}`,'Đã gửi hàng loạt');
    }

function tuitionImageData(studentId){
      const r=tuitionRowByStudentId(studentId); if(!r) return '';
      const planned=Number(r.plannedSessions||0), unit=Number(r.unitPrice||db.settings?.unitPrice||70000), tuitionAmount=Number(r.tuitionAmount||0), adjustmentAmount=Number(r.adjustmentAmount||0), materialFee=Number(r.materialFee||0), previousDebt=Number(r.previousDebt||0), creditAmount=Number(r.creditAmount||0), totalDue=Number(r.amount||0);
      const c=document.createElement('canvas'); c.width=1800; c.height=1540; const ctx=c.getContext('2d');
      const grad=ctx.createLinearGradient(0,0,1800,1540); grad.addColorStop(0,'#fff5f7'); grad.addColorStop(1,'#ffffff'); ctx.fillStyle=grad; ctx.fillRect(0,0,c.width,c.height);
      fillRoundRect(ctx,28,28,1744,1484,34,'#ffffff','#fecdd3');
      ctx.fillStyle='#be123c'; ctx.font='bold 54px Arial'; ctx.fillText('Ms.Giang English',72,100);
      ctx.fillStyle='#fb7185'; ctx.font='28px Arial'; ctx.fillText('Thông báo học phí thu trước theo tháng',74,142);
      fillRoundRect(ctx,1360,58,330,58,24,'#fff1f2','#fecdd3');
      ctx.fillStyle='#9f1239'; ctx.font='bold 30px Arial'; ctx.textAlign='center'; ctx.fillText(formatTuitionMonth(tuitionMonthKey()),1525,97); ctx.textAlign='left';

      fillRoundRect(ctx,60,182,1680,110,26,'#fff7f8','#fecdd3');
      ctx.fillStyle='#111827'; ctx.font='bold 42px Arial'; ctx.fillText(r.student.name,92,240);
      ctx.fillStyle='#6b7280'; ctx.font='28px Arial'; ctx.fillText(`Lớp: ${r.className}`,92,278); ctx.fillText(`Liên hệ: ${r.student.contact||'Chưa có'}`,700,278);

      const leftX=60, leftY=330, leftW=690, leftH=1120;
      const rightX=780, rightY=330, rightW=960, rightH=1120;
      fillRoundRect(ctx,leftX,leftY,leftW,leftH,28,'#ffffff','#fecdd3');
      fillRoundRect(ctx,rightX,rightY,rightW,rightH,28,'#ffffff','#fecdd3');

      const cards=[['Buổi dự kiến',planned],['Đơn giá',fmt.format(unit)+'đ'],['Phát sinh',fmt.format(adjustmentAmount)+'đ'],['Học liệu',fmt.format(materialFee)+'đ'],['Khấu trừ',creditAmount?'-'+fmt.format(creditAmount)+'đ':'0đ'],['Nợ cũ',fmt.format(previousDebt)+'đ']];
      cards.forEach((it,i)=>{
        const x=leftX+26+(i%2)*310; const y=leftY+26+Math.floor(i/2)*145;
        fillRoundRect(ctx,x,y,275,110,22,'#fff','#fecdd3');
        ctx.fillStyle='#6b7280'; ctx.font='26px Arial'; ctx.fillText(it[0],x+20,y+40);
        ctx.fillStyle=i===4&&creditAmount?'#16a34a':'#e11d48'; ctx.font='bold 36px Arial'; ctx.fillText(String(it[1]),x+20,y+88);
      });

      fillRoundRect(ctx,leftX+26,leftY+478,leftW-52,235,24,'#fff1f2','#fecdd3');
      ctx.fillStyle='#9f1239'; ctx.font='bold 31px Arial'; ctx.fillText('Tổng học phí cần đóng',leftX+48,leftY+528);
      ctx.fillStyle='#e11d48'; ctx.font='bold 66px Arial'; ctx.fillText(fmt.format(totalDue)+'đ',leftX+48,leftY+608);
      ctx.fillStyle='#374151'; ctx.font='25px Arial';
      ctx.fillText(`Học phí tháng: ${fmt.format(tuitionAmount)}đ`,leftX+48,leftY+666);
      ctx.fillText(`Phát sinh: ${fmt.format(adjustmentAmount)}đ`,leftX+48,leftY+704);
      ctx.fillText(`Trạng thái: ${r.paid?'Đã đóng học phí':'Chưa đóng học phí'}`,leftX+48,leftY+742);

      fillRoundRect(ctx,leftX+26,leftY+782,leftW-52,118,24,'#ffffff','#fecdd3',true);
      ctx.strokeStyle='#fecdd3'; ctx.lineWidth=3; ctx.setLineDash([12,10]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle='#9ca3af'; ctx.font='bold 30px Arial'; ctx.textAlign='center';
      ctx.fillText('QR thanh toán',leftX + leftW/2,leftY+837);
      ctx.fillStyle='#cbd5e1'; ctx.font='23px Arial';
      ctx.fillText('Để trống - sẽ thêm QR sau',leftX + leftW/2,leftY+872);
      ctx.textAlign='left';

      ctx.fillStyle='#111827'; ctx.font='bold 34px Arial'; ctx.fillText('Nội dung gửi phụ huynh',rightX+30,rightY+48);
      fillRoundRect(ctx,rightX+24,rightY+76,rightW-48,1004,24,'#fff7f8','#fecdd3');
      drawCanvasText(ctx,tuitionMessageText(r),rightX+48,rightY+126,rightW-96,36,'#374151','24px Arial',27);

      return c.toDataURL('image/png');
    }

function openTuitionImage(studentId){
      const r=tuitionRowByStudentId(studentId); if(!r){toast('Không tìm thấy học sinh');return}
      const url=tuitionImageData(studentId);
      openGeneratedImageModal(`Ảnh học phí • ${r.student.name}`,url,`hocphi_${r.student.name.replace(/\s+/g,'_')}.png`,'Ảnh thông báo học phí đã sẵn sàng. Bạn có thể tải về hoặc gửi thủ công cho phụ huynh.');
    }

let v7fTuitionBackgroundTimer=null;

function v20o2InvalidateTuitionRows(){
      v18Memo.billingKey='';
      v18Memo.billingRows=null;
      v18Memo.billingGroups={};
    }

function v7fRenderTuitionPageOnly(){
      if(route!=='tuition') return false;
      const pageEl=document.getElementById('appPage');
      if(!pageEl || typeof tuitionPage!=='function') return false;
      const scrollTop=window.scrollY||document.documentElement.scrollTop||0;
      pageEl.innerHTML=tuitionPage();
      pageEl.__v20dLastHtml=pageEl.innerHTML;
      requestAnimationFrame(()=>window.scrollTo({top:scrollTop,left:0,behavior:'auto'}));
      return true;
    }

function v7fPatchTuitionStudentDom(studentId){
      if(route!=='tuition' || !document.getElementById('tuitionPageRoot') || typeof tuitionStudentRowMarkup!=='function') return false;
      const existing=document.getElementById(tuitionRowDomId(studentId));
      const next=filteredBillingRows().find(r=>String(r.student.id)===String(studentId));
      const className=next?.className || existing?.getAttribute('data-tuition-class') || '';
      const collapsed=className?isTuitionGroupCollapsed(className):false;
      // If a paid/unpaid filter makes a row appear/disappear, rebuild only the route body.
      if((existing&&!next) || (!existing&&next&&!collapsed)) return false;
      if(existing&&next) existing.outerHTML=tuitionStudentRowMarkup(next);
      if(typeof tuitionPatchStatsDom==='function') tuitionPatchStatsDom();
      if(className && typeof tuitionPatchGroupSummaryDom==='function') tuitionPatchGroupSummaryDom(className);
      return true;
    }

function v7fPatchTuitionVisibleDom(){
      if(route!=='tuition' || !document.getElementById('tuitionPageRoot') || typeof tuitionStudentRowMarkup!=='function') return false;
      const rows=filteredBillingRows();
      const byId=new Map(rows.map(r=>[String(r.student.id),r]));
      let mismatch=false;
      document.querySelectorAll('[data-tuition-student]').forEach(el=>{
        const id=String(el.getAttribute('data-tuition-student')||'');
        const row=byId.get(id);
        if(!row){mismatch=true;return}
        el.outerHTML=tuitionStudentRowMarkup(row);
      });
      const groups=groupBillingRowsByClass(rows);
      groups.forEach(g=>{
        const block=document.getElementById(tuitionGroupDomId(g.className));
        if(!block){mismatch=true;return}
        const expected=isTuitionGroupCollapsed(g.className)?0:g.items.length;
        const actual=block.querySelectorAll('[data-tuition-student]').length;
        if(expected!==actual) mismatch=true;
        if(typeof tuitionPatchGroupSummaryDom==='function') tuitionPatchGroupSummaryDom(g.className);
      });
      if(mismatch) return v7fRenderTuitionPageOnly();
      if(typeof tuitionPatchStatsDom==='function') tuitionPatchStatsDom();
      return true;
    }

function v20o2RerenderTuitionLight(studentId=''){
      v20o2InvalidateTuitionRows();
      // Keep current route/store hot; no delayed full-page re-render for this local write.
      v20bAfterMutation(['tuition'],{preserveCache:true,noRefresh:true});
      v18fUpdateTuitionModuleCache();
      saveLocalOnly();
      if(route!=='tuition') return;
      if(studentId && v7fPatchTuitionStudentDom(studentId)) return;
      v7fRenderTuitionPageOnly();
    }

function v20o2PatchLocalTuitionRow(studentId,patch={}){
      db.tuitionRollup ||= {};
      const existing=db.tuitionRollup[studentId] || {};
      const row={...existing,...patch};
      const planned=Number(row.plannedSessions ?? row.billable ?? 0);
      const unit=Number(row.unitPrice || db.settings?.unitPrice || 70000);
      const tuitionAmount=Number(row.tuitionAmount ?? planned*unit);
      const materialFee=Number(row.materialFee||0);
      const adjustmentAmount=Number(row.adjustmentAmount||0);
      const creditAmount=Number(row.creditAmount||0);
      const previousDebt=Number(row.previousDebt||0);
      row.plannedSessions=planned;
      row.billable=planned;
      row.unitPrice=unit;
      row.tuitionAmount=tuitionAmount;
      row.adjustmentAmount=adjustmentAmount;
      row.adjustmentItems=Array.isArray(row.adjustmentItems)?row.adjustmentItems:[];
      row.currentAmount=Math.max(0, tuitionAmount + materialFee + adjustmentAmount - creditAmount);
      row.previousDebt=previousDebt;
      row.amount=Math.max(0, row.currentAmount + previousDebt);
      db.tuitionRollup[studentId]=row;
      return row;
    }

function v20o2RefreshTuitionBackground(){
      if(!canViewTuition()) return;
      clearTimeout(v7fTuitionBackgroundTimer);
      v7fTuitionBackgroundTimer=setTimeout(async()=>{
        v7fTuitionBackgroundTimer=null;
        try{
          const changed=await refreshOfficialTuitionState({skipSave:true,forceNetwork:true});
          if(changed){
            v20o2InvalidateTuitionRows();
            v18fUpdateTuitionModuleCache();
            saveLocalOnly();
            if(route==='tuition') v7fPatchTuitionVisibleDom();
          }
        }catch(e){console.warn('Không refresh nền được học phí',e)}
      },650);
    }

function v20o2TuitionGroupState(){
      db.settings ||= {};
      db.settings.tuitionCollapsedGroups ||= {};
      return db.settings.tuitionCollapsedGroups;
    }

function isTuitionGroupCollapsed(className){
      return !!v20o2TuitionGroupState()[String(className||'')];
    }

function toggleTuitionClassGroup(className){
      const s=v20o2TuitionGroupState();
      const key=String(className||'');
      s[key]=!s[key];
      saveLocalOnly();
      if(route==='tuition' && typeof tuitionRenderGroupDom==='function' && tuitionRenderGroupDom(key)) return;
      if(route==='tuition') v7fRenderTuitionPageOnly();
    }

function collapseAllTuitionGroups(collapsed){
      const s=v20o2TuitionGroupState();
      groupBillingRowsByClass(filteredBillingRows()).forEach(g=>{s[g.className]=!!collapsed});
      saveLocalOnly();
      if(route==='tuition' && typeof tuitionRenderAllGroupsDom==='function' && tuitionRenderAllGroupsDom()) return;
      if(route==='tuition') v7fRenderTuitionPageOnly();
    }
