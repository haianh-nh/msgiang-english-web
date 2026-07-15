/*
 * Phase 7F Evaluation Module
 * Accordion/lazy class rendering and local student-card updates.
 * Score changes are persisted by a debounced draft writer in app core.
 */

function evaluationMonthPanel(){
  const p=evaluationMonthParts();
  return `<div class="evalMonthPanel"><label>Tháng đánh giá<div class="evalMonthPick"><select class="input" onchange="setEvaluationMonthPart('month',this.value)">${evaluationMonthOptions(p.month)}</select><input class="input" type="number" min="2020" max="2099" value="${p.year}" onchange="setEvaluationMonthPart('year',this.value)"></div></label><span class="pill red">${formatEvaluationMonth()}</span></div>`;
}
function evaluationGroupsForCurrentUser(){
  const classes=canManageOperations()?classesForUser():classesForTeachingUser();
  return classes.map(c=>({c,students:(c.students||[]).map(s=>({...s,classId:c.id,className:c.name}))}));
}
function evaluationGroupState(){
  db.settings ||= {};
  db.settings.evaluationOpenGroups ||= {};
  return db.settings.evaluationOpenGroups;
}
function evaluationActiveGroupId(groups=evaluationGroupsForCurrentUser()){
  const month=evaluationMonthKey();
  const state=evaluationGroupState();
  if(Object.prototype.hasOwnProperty.call(state,month)){
    const saved=String(state[month]||'');
    if(saved==='__none__') return '';
    if(saved && groups.some(g=>String(g.c.id)===saved)) return saved;
  }
  const first=String(groups[0]?.c?.id||'');
  if(first) state[month]=first;
  return first;
}
function isEvaluationGroupOpen(classId,groups=evaluationGroupsForCurrentUser()){
  return String(evaluationActiveGroupId(groups))===String(classId);
}
function toggleEvaluationClassGroup(classId){
  const groups=evaluationGroupsForCurrentUser();
  const month=evaluationMonthKey();
  const state=evaluationGroupState();
  state[month]=String(evaluationActiveGroupId(groups))===String(classId)?'__none__':String(classId);
  v18bSetLocalUiState();
  if(!evaluationRenderGroupsDom() && route==='evaluation') renderApp();
}
function evaluationPage(){
  const cls=isParent()?classesForUser():(canManageOperations()?classesForUser():classesForTeachingUser());
  if(isParent()){
    const selected=selectedParentChildId();
    const st=studentById(selected) || parentChildren()[0];
    if(!st) return `<div class="empty">Chưa có học sinh liên kết với phụ huynh.</div>`;
    return `<div id="evaluationPageRoot">${parentChildSelector()}<div class="screenTitle"><div><h1>Đánh giá học sinh</h1><p>Đánh giá chi tiết theo tháng, biểu đồ kỹ năng và nhận xét giáo viên.</p></div></div>${evaluationMonthPanel()}
    <div class="parentEvalLayout">${parentOverallScoreboard(st.id)}${parentDetailedEvaluationPanel(st.id)}</div></div>`;
  }
  const groups=cls.map(c=>({c,students:(c.students||[]).map(s=>({...s,classId:c.id,className:c.name}))}));
  evaluationActiveGroupId(groups);
  return `<div id="evaluationPageRoot"><div class="screenTitle"><div><h1>Đánh giá học sinh</h1><p>Đánh giá theo tháng. Chỉ lớp đang mở được dựng danh sách để thao tác nhanh hơn.</p></div></div>${evaluationMonthPanel()}
  <div id="evaluationGroups" class="evaluationAccordion">${groups.map((g,i)=>evaluationGroupCard(g.c,g.students,i,groups)).join('')}</div></div>`;
}
function evaluationMapForCurrentMonth(){
  const key=v18FastKey()+'|evaluationMap|'+evaluationMonthKey();
  v18Memo.evaluationMap ||= {};
  if(v18Memo.evaluationMap.key===key) return v18Memo.evaluationMap.map;
  const map=new Map();
  (db.evaluations||[]).forEach(e=>{
    if(normalizeEvaluationMonthValue(e.monthKey||e.month)===evaluationMonthKey()) map.set(e.studentId,e);
  });
  v18Memo.evaluationMap={key,map};
  return map;
}
function evaluationStudentRowMarkup(c,s){
  const ev=peekEvaluation(s.id);
  const av=evalAverage(ev);
  const sendKey=`evalsend:${evaluationMonthKey()}:${s.id}`;
  return `<div id="evalStudent_${v18bSafeId(s.id)}" data-eval-student-row="${h(s.id)}" class="studentEvalRow"><div><b>${s.name}</b><div class="mini">${c.name} • ${formatEvaluationMonth()}</div></div><span class="pill ${av>=4?'green':av>=3?'yellow':'red'}">${av?av.toFixed(1):'-'}/5</span><span class="pill ${ev?.status==='published'?'green':'yellow'}">${ev?.status==='published'?'Đã gửi':'Nháp'}</span><div class="tableActionStack"><button class="btn ghost miniCardBtn" onclick="openEvaluationImage('${s.id}')">Tạo ảnh</button><button class="btn ghost miniCardBtn" ${v20o2BusyButtonAttrs(sendKey,'Đang gửi...')} onclick="sendEvaluationToParent('${s.id}')">Gửi</button><button class="btn primary miniCardBtn" onclick="openEvalModal('${s.id}')">Đánh giá</button></div></div>`;
}
function evaluationGroupStats(c,students){
  const evals=(students||[]).map(s=>peekEvaluation(s.id));
  const avg=evals.length?evals.reduce((sum,e)=>sum+evalAverage(e),0)/evals.length:0;
  const published=evals.filter(e=>e?.status==='published').length;
  return {avg,published,total:students.length};
}
function evaluationGroupStatsMarkup(c,students){
  const stats=evaluationGroupStats(c,students);
  return `<span class="pill blue">${stats.total} học sinh</span><span class="pill green">${stats.published} đã gửi</span><span class="pill red">TB ${stats.avg.toFixed(1)}/5</span>`;
}
function evaluationGroupCard(c,students,i,groups=evaluationGroupsForCurrentUser()){
  const open=isEvaluationGroupOpen(c.id,groups);
  return `<div id="evalGroup_${v18bSafeId(c.id)}" data-eval-group="${h(c.id)}" class="panel groupPanel evaluationGroupPanel ${open?'isOpen':'isCollapsed'}" style="--i:${i}"><div class="classGroupHeader evaluationGroupHeader"><div><h2>${c.name}</h2><div class="sub">${c.teacher} • ${c.time}</div></div><div class="evaluationGroupHeadRight"><div id="evalGroupStats_${v18bSafeId(c.id)}" class="miniStats">${evaluationGroupStatsMarkup(c,students)}</div><button class="btn ghost miniCardBtn" onclick="toggleEvaluationClassGroup('${c.id}')">${open?'Thu gọn':'Mở danh sách'}</button></div></div>
  ${open?`<div class="evaluationGroupBody">${students.map(s=>evaluationStudentRowMarkup(c,s)).join('')}</div>`:'<div class="evaluationCollapsedHint">Danh sách học sinh chưa được dựng. Bấm “Mở danh sách” để xem.</div>'}</div>`;
}
function evaluationRenderGroupsDom(){
  const wrap=document.getElementById('evaluationGroups');
  if(!wrap || isParent()) return false;
  const groups=evaluationGroupsForCurrentUser();
  wrap.innerHTML=groups.map((g,i)=>evaluationGroupCard(g.c,g.students,i,groups)).join('');
  return true;
}
function evaluationPatchStudentDom(studentId){
  const st=studentById(studentId);
  const c=st?classById(st.classId):null;
  if(!st || !c) return false;
  const row=document.getElementById(`evalStudent_${v18bSafeId(studentId)}`);
  if(row) row.outerHTML=evaluationStudentRowMarkup(c,st);
  const stats=document.getElementById(`evalGroupStats_${v18bSafeId(c.id)}`);
  if(stats) stats.innerHTML=evaluationGroupStatsMarkup(c,(c.students||[]).map(s=>({...s,classId:c.id,className:c.name})));
  return !!row || !!stats;
}

function monthScoreData(studentId){
  const ev=peekEvaluation(studentId);
  const base=evalAverage(ev)||3.2;
  const months=['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6'];
  return months.map((m,i)=>({month:m,score:Math.min(5,Math.max(1,+(base-0.55+i*0.16+((i%2)*0.08)).toFixed(1)))}));
}
function weeklyEvaluationData(studentId){
  const ev=peekEvaluation(studentId);
  const avg=evalAverage(ev)||3.5;
  return [
    {week:'Tuần 1',focus:'Ổn định nề nếp học',score:Math.max(1,+(avg-.3).toFixed(1)),note:'Bé tham gia lớp tốt, cần chủ động phát biểu hơn.'},
    {week:'Tuần 2',focus:'Vocabulary & Listening',score:Math.max(1,+(avg-.1).toFixed(1)),note:'Từ vựng tiến bộ, nghe hiểu nội dung chính tốt hơn.'},
    {week:'Tuần 3',focus:'Speaking practice',score:Math.min(5,+(avg+.1).toFixed(1)),note:'Bé trả lời tốt hơn nhưng cần nói to, rõ và đủ câu.'},
    {week:'Tuần 4',focus:'Review & Homework',score:Math.min(5,+(avg+.25).toFixed(1)),note:'Hoàn thành bài tập tốt, phụ huynh duy trì luyện nghe tại nhà.'}
  ];
}
function parentOverallScoreboard(studentId){
  const st=studentById(studentId); const data=monthScoreData(studentId); const latest=data[data.length-1]; const ev=peekEvaluation(studentId);
  return `<div class="panel overallScorePanel"><div class="panelHead"><div><h2>Bảng điểm tổng quan</h2><div class="mini">${st.name} • Theo từng tháng trong kỳ học</div></div><span class="pill red">${latest.score}/5</span></div>
  <div class="monthScoreChart">${data.map((d,i)=>`<div class="monthBar" style="--i:${i}"><div class="monthTrack"><div class="monthFill" style="height:${d.score/5*100}%"></div></div><small>${d.score}</small><b>${d.month.replace('Tháng ','T')}</b></div>`).join('')}</div>
  <div class="note" style="margin-top:12px"><b>Nhận xét tổng quan</b><p>${h(ev.comment)}</p></div></div>`;
}
function parentDetailedEvaluationPanel(studentId){
  const st=studentById(studentId); const ev=peekEvaluation(studentId);
  return `<div class="panel parentDetailPanel"><div class="panelHead"><div><h2>Đánh giá chi tiết</h2><div class="mini">${st.name} • ${classById(st.classId).name}</div></div><span class="pill red">${evalAverage(ev).toFixed(1)}/5</span></div>
  <div class="evalStatusBar"><div><span class="pill ${ev.status==='published'?'green':'yellow'}">${ev.status==='published'?'Đã gửi':'Nháp'}</span> <span class="pill red">${classById(st.classId).name}</span></div></div>
  <div class="evalBarBox parentInlineChart" id="evalbar_${studentId}">${skillBarChart(ev.scores)}</div>
  <div class="panelHead" style="margin-top:12px"><h2>Nhận xét giáo viên</h2><span class="pill gray">Chế độ xem</span></div>
  <div class="commentBox">${evalViewContent(studentId,ev)}</div></div>`;
}
function openEvalModal(studentId,edit=false){
  const st=studentById(studentId); if(!st) return;
  if(edit) v7fBeginEvaluationEdit(studentId);
  modal(`<div data-evaluation-modal="1" data-evaluation-student="${h(studentId)}"><div class="modalHead"><h2>Đánh giá ${st.name}</h2><button class="close" onclick="closeModal()">×</button></div><div id="evalModalContent_${v18bSafeId(studentId)}">${evalDetail(studentId,edit)}</div></div>`);
}
function renderEvalStudent(id){
  const area=document.getElementById('evalArea');
  if(area) area.innerHTML=evalDetail(id,false);
}
function evalDetail(studentId,edit=false){
  const st=studentById(studentId); const ev=edit?ensureEvaluation(studentId):peekEvaluation(studentId); const canEdit=!isParent();
  const saveKey=`evalsave:${evaluationMonthKey()}:${studentId}`;
  return `<div class="evalStatusBar"><div><span id="evalModalStatus_${v18bSafeId(studentId)}" class="pill ${ev.status==='published'?'green':'yellow'}">${ev.status==='published'?'Đã gửi':'Nháp'}</span> <span class="pill red">${classById(st.classId).name}</span></div>${canEdit?`<div class="editActions">${edit?`<button class="btn ghost" onclick="v7fCancelEvaluationEdit('${studentId}')">Hủy</button><button class="btn ghost" ${v20o2BusyButtonAttrs(saveKey,'Đang lưu...')} onclick="saveEvaluation('${studentId}','draft')">Lưu nháp</button><button class="btn primary" ${v20o2BusyButtonAttrs(saveKey,'Đang gửi...')} onclick="saveEvaluation('${studentId}','published')">Gửi</button>`:`<button class="btn ghost" onclick="openEvaluationImage('${studentId}')">Tạo ảnh</button><button class="btn ghost" ${v20o2BusyButtonAttrs(`evalsend:${evaluationMonthKey()}:${studentId}`,'Đang gửi...')} onclick="sendEvaluationToParent('${studentId}')">Gửi</button><button class="btn primary" onclick="openEvalModal('${studentId}',true)">Chỉnh sửa</button>`}</div>`:''}</div>
  <div class="splitEval"><div class="panel"><div class="panelHead"><h2>Biểu đồ cột kỹ năng</h2><span class="pill red" id="evalavg_${studentId}">${evalAverage(ev).toFixed(1)}/5</span></div><div class="evalBarBox" id="evalbar_${studentId}">${skillBarChart(ev.scores)}</div></div>
  <div class="panel"><div class="panelHead"><h2>Nhận xét giáo viên</h2>${edit?'<span class="pill blue">Đang chỉnh sửa</span>':'<span class="pill gray">Xem chi tiết</span>'}</div><div class="commentBox">${edit?evalEditForm(studentId,ev):evalViewContent(studentId,ev)}</div></div></div>`;
}
function evalViewContent(studentId,ev){
  return `<div class="note"><b>Tổng quan</b><p>${h(ev.comment)}</p></div><div class="note"><b>Điểm mạnh</b><p>${h(ev.strengths)}</p></div><div class="note"><b>Cần cải thiện</b><p>${h(ev.improvements)}</p></div><div class="note"><b>Gợi ý phụ huynh</b><p>${h(ev.suggestion)}</p></div>${!isParent()?scoreButtons(studentId,ev,false):''}`;
}
function evalEditForm(studentId,ev){
  return `<div class="note"><b>Tổng quan</b><textarea id="ev_comment_${studentId}" class="evalTextarea" oninput="v7fCaptureEvaluationField('${studentId}','comment',this.value)">${h(ev.comment)}</textarea></div>
  <div class="note"><b>Điểm mạnh</b><textarea id="ev_strengths_${studentId}" class="evalTextarea" oninput="v7fCaptureEvaluationField('${studentId}','strengths',this.value)">${h(ev.strengths)}</textarea></div>
  <div class="note"><b>Cần cải thiện</b><textarea id="ev_improvements_${studentId}" class="evalTextarea" oninput="v7fCaptureEvaluationField('${studentId}','improvements',this.value)">${h(ev.improvements)}</textarea></div>
  <div class="note"><b>Gợi ý phụ huynh</b><textarea id="ev_suggestion_${studentId}" class="evalTextarea" oninput="v7fCaptureEvaluationField('${studentId}','suggestion',this.value)">${h(ev.suggestion)}</textarea></div>
  ${scoreButtons(studentId,ev,true)}`;
}
function skillNameVI(k){
  return {Listening:'Nghe',Speaking:'Nói',Reading:'Đọc',Writing:'Viết',Vocabulary:'Từ vựng',Participation:'Tham gia',Homework:'Bài tập'}[k]||k;
}
function skillShortVI(k){
  return {Listening:'Nghe',Speaking:'Nói',Reading:'Đọc',Writing:'Viết',Vocabulary:'Từ vựng',Participation:'Tham gia',Homework:'Bài tập'}[k]||k;
}
function skillBarChart(scores){
  return `<div class="skillBarChart">${Object.entries(scores).map(([k,v],i)=>`<div class="skillBar" style="--i:${i}"><div class="skillBarTrack"><div class="skillBarFill" style="height:${Math.max(6,Number(v)/5*100)}%"></div></div><b>${v}/5</b><small>${skillShortVI(k)}</small></div>`).join('')}</div><div class="mini" style="text-align:center;margin-top:8px">Thang điểm 1–5: 1 cần hỗ trợ thêm, 5 rất tốt</div>`;
}
function radarSvg(scores){return skillBarChart(scores)}
function scoreButtons(studentId,ev,editable=false){
  return `<div class="note"><b>Chấm nhanh</b><div class="mini">${editable?'Bấm điểm 1–5, biểu đồ cập nhật ngay.':'Điểm hiện tại theo thang 1–5.'}</div>${Object.entries(ev.scores).map(([k,v])=>`<div class="scoreRow"><span>${skillNameVI(k)}</span><div class="scoreBtns">${[1,2,3,4,5].map(n=>`<button class="btn ${n===v?'primary':''}" data-eval-student="${studentId}" data-eval-skill="${k}" data-eval-score="${n}" ${editable?`onclick="setEvalScore('${studentId}','${k}',${n})"`:''}>${n}</button>`).join('')}</div></div>`).join('')}</div>`;
}
