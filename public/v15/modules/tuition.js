/*
 * Phase 7 Tuition Module
 * One monthly invoice with regular tuition, carried mid-month adjustments,
 * material fees, debt, and credits.
 */

function tuitionPage(){
  if(!canViewTuition()){
    return `<div class="screenTitle"><div><h1>Học phí</h1><p>Giáo viên/TA không có quyền xem thông tin học phí.</p></div></div><div class="blockedBox"><h2>🔒 Không có quyền truy cập</h2><p>Thông tin học phí chỉ hiển thị với Admin và Quản lí.</p></div>`;
  }

  const all=baseBillingRows();
  const rows=filteredBillingRows();
  const f=tuitionFilterState();
  const total=rows.reduce((s,r)=>s+Number(r.amount||0),0);
  const paidTotal=rows.filter(r=>r.paid).reduce((s,r)=>s+Number(r.amount||0),0);
  const creditTotal=rows.reduce((s,r)=>s+Number(r.creditAmount||0),0);
  const adjustmentTotal=rows.reduce((s,r)=>s+Number(r.adjustmentAmount||0),0);
  const sentCount=rows.filter(r=>isTuitionMessageSent(r.student.id)).length;
  const groups=groupBillingRowsByClass(rows);
  const loading=lazyRouteState?.tuition?.loading;

  const groupMarkup=groups.length?groups.map((g,gi)=>{
    const collapsed=isTuitionGroupCollapsed(g.className);
    const groupAdjustment=g.items.reduce((s,r)=>s+Number(r.adjustmentAmount||0),0);
    const groupCredit=g.items.reduce((s,r)=>s+Number(r.creditAmount||0),0);
    const rowsMarkup=g.items.map(r=>{
      const sendKey=`send:${tuitionMonthKey()}:${r.student.id}`;
      const paidKey=`paid:${tuitionMonthKey()}:${r.student.id}`;
      const adjustmentItems=r.adjustmentItems||[];
      const adjustmentDetail=adjustmentItems.length?v27AdjustmentSummary(r):'';
      return `<tr>
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
    }).join('');

    return `<div class="classBillingBlock ${collapsed?'collapsedBillingBlock':''}" style="--i:${gi}">
      <div class="classBillingHead"><div><h2>${g.className}</h2><div class="mini">${g.items.length} học sinh • Tổng ${fmt.format(g.total)}đ • Phát sinh ${fmt.format(groupAdjustment)}đ • Khấu trừ ${fmt.format(groupCredit)}đ • Đã gửi ${g.sent}/${g.items.length}</div></div>
      <div class="billingHeadActions"><button class="btn ghost miniCardBtn" onclick="toggleTuitionClassGroup('${h(g.className)}')">${collapsed?'Mở bảng':'Thu gọn'}</button>${canManageTuition()?`<button class="btn ghost miniCardBtn" onclick="${g.items.map(r=>`sendTuitionMessage('${r.student.id}')`).join(';')}">Gửi lớp này</button>`:''}</div></div>
      ${collapsed?'':`<div class="tableWrap tuitionTableWrap"><table class="tuitionTable tuitionTableV20O"><thead><tr><th class="colStudent">Học sinh</th><th>Buổi dự kiến</th><th>Đơn giá</th><th>Học phí tháng</th><th>Phát sinh</th><th>Học liệu</th><th>Nợ cũ</th><th>Khấu trừ</th><th>Tổng</th><th>Trạng thái</th>${canManageTuition()?'<th>Gửi</th><th>Thao tác</th>':''}</tr></thead><tbody>${rowsMarkup}</tbody></table></div>`}
    </div>`;
  }).join(''):'<div class="empty">Không có học sinh phù hợp bộ lọc.</div>';

  return `${parentChildSelector()}<div class="screenTitle"><div><h1>Học phí</h1><p>Thu trước theo tháng. Học sinh mới giữa tháng có thể gộp khoản phát sinh vào cùng hóa đơn tháng sau.</p></div>${canManageTuition()?`<div class="actions"><button class="btn ghost" onclick="refreshCurrentRouteData()">Tải lại</button><button class="btn primary" ${v20o2BusyButtonAttrs(`sendbulk:${tuitionMonthKey()}`,'Đang gửi...')} onclick="sendTuitionMessageBulk()">Gửi hàng loạt</button></div>`:''}</div>
  <div class="toolbar compactFilters tuitionFilters">
    <label><span>Tháng tính học phí</span><div class="tuitionMonthPick"><select class="input" onchange="setTuitionMonthPart('month',this.value)">${tuitionMonthOptions(tuitionMonthParts(f.month).month)}</select><input class="input" type="number" min="2020" max="2099" value="${tuitionMonthParts(f.month).year}" onchange="setTuitionMonthPart('year',this.value)" placeholder="Năm"></div></label>
    <label><span>Tìm học sinh / lớp</span><input class="input" value="${h(f.q||'')}" placeholder="Nhập tên học sinh, lớp, liên hệ..." oninput="setTuitionFilter('q',this.value)"></label>
    <label><span>Trạng thái</span><select class="input" onchange="setTuitionFilter('status',this.value)"><option value="all" ${f.status==='all'?'selected':''}>Tất cả</option><option value="paid" ${f.status==='paid'?'selected':''}>Đã đóng</option><option value="unpaid" ${f.status==='unpaid'?'selected':''}>Chưa đóng</option></select></label>
    <div class="filterSummary">${loading?'<span class="pill blue">Đang tải...</span>':''} Hiển thị ${rows.length}/${all.length} học sinh</div>
  </div>
  <div class="tuitionQuickActions"><button class="btn ghost" onclick="collapseAllTuitionGroups(false)">Mở tất cả lớp</button><button class="btn ghost" onclick="collapseAllTuitionGroups(true)">Thu gọn tất cả</button></div>
  <div class="statGrid">
    <div class="stat" style="--i:0"><div class="statIcon redgrad">💰</div><div><h3>Tổng đang lọc</h3><strong style="font-size:26px">${fmt.format(total)}</strong><small>đồng</small></div></div>
    <div class="stat" style="--i:1"><div class="statIcon greengrad">✅</div><div><h3>Đã nộp</h3><strong>${fmt.format(paidTotal)}</strong><small>${rows.filter(r=>r.paid).length}/${rows.length} học sinh</small></div></div>
    <div class="stat" style="--i:2"><div class="statIcon bluegrad">➕</div><div><h3>Phát sinh</h3><strong>${fmt.format(adjustmentTotal)}</strong><small>đồng từ học sinh mới</small></div></div>
    <div class="stat" style="--i:3"><div class="statIcon yellowgrad">➖</div><div><h3>Khấu trừ</h3><strong>${fmt.format(creditTotal)}</strong><small>đồng từ tháng trước</small></div></div>
  </div>
  ${groupMarkup}`;
}
