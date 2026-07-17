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


/* Phase 8D.3: Evaluation editing, image and local DOM runtime. */
async function sendEvaluationToParent(studentId){
      // Phase 7F: publish status only; update the current card/modal in place.
      const modalStudent=modalBackdrop?.querySelector?.('[data-evaluation-modal]')?.getAttribute('data-evaluation-student');
      return saveEvaluation(studentId,'published',String(modalStudent)===String(studentId));
    }

function evaluationImageData(studentId){
      const st=studentById(studentId); const ev=peekEvaluation(studentId); const cls=classById(st.classId);
      const c=document.createElement('canvas'); c.width=1800; c.height=1350; const ctx=c.getContext('2d');

      // V19F.3: tinh chỉnh lại vị trí nhãn cột và chiều cao các ô nhận xét để ảnh không chồng chéo.
      const grad=ctx.createLinearGradient(0,0,1800,1350); grad.addColorStop(0,'#fff5f7'); grad.addColorStop(1,'#ffffff'); ctx.fillStyle=grad; ctx.fillRect(0,0,c.width,c.height);
      fillRoundRect(ctx,28,28,1744,1294,34,'#ffffff','#fecdd3');

      ctx.fillStyle='#be123c'; ctx.font='bold 52px Arial'; ctx.fillText('Ms.Giang English',72,96);
      ctx.fillStyle='#fb7185'; ctx.font='26px Arial'; ctx.fillText('Đánh giá học sinh',74,136);
      fillRoundRect(ctx,1360,58,320,58,24,'#fff1f2','#fecdd3');
      ctx.fillStyle='#9f1239'; ctx.font='bold 28px Arial'; ctx.textAlign='center'; ctx.fillText(formatEvaluationMonth(),1520,97); ctx.textAlign='left';

      fillRoundRect(ctx,60,174,1680,116,26,'#fff7f8','#fecdd3');
      ctx.fillStyle='#111827'; ctx.font='bold 38px Arial'; ctx.fillText(st.name,92,234);
      ctx.fillStyle='#6b7280'; ctx.font='25px Arial';
      ctx.fillText(`Lớp: ${cls?.name||'-'}`,92,268);
      ctx.fillText(`Điểm trung bình: ${evalAverage(ev).toFixed(1)}/5`,620,258);
      ctx.fillText(`Trạng thái: ${ev.status==='published'?'Đã gửi':'Nháp'}`,1000,258);

      const leftX=60, leftY=330, leftW=620, leftH=900;
      const rightX=710, rightY=330, rightW=1030, rightH=900;
      fillRoundRect(ctx,leftX,leftY,leftW,leftH,28,'#ffffff','#fecdd3');
      fillRoundRect(ctx,rightX,rightY,rightW,rightH,28,'#ffffff','#fecdd3');

      ctx.fillStyle='#111827'; ctx.font='bold 30px Arial'; ctx.fillText('Biểu đồ kỹ năng',leftX+30,leftY+48);
      ctx.fillStyle='#64748b'; ctx.font='20px Arial'; ctx.fillText('Chú thích: Nghe, Nói, Đọc, Viết, Từ vựng, Tham gia, Bài tập',leftX+30,leftY+80);

      const scores=ev.scores || {};
      const labels=[
        ['Listening',['Nghe']],
        ['Speaking',['Nói']],
        ['Reading',['Đọc']],
        ['Writing',['Viết']],
        ['Vocabulary',['Từ','vựng']],
        ['Participation',['Tham','gia']],
        ['Homework',['Bài tập']]
      ];
      const chartX=leftX+35, chartY=leftY+154, trackH=365, barGap=13, barW=68;
      labels.forEach((arr,i)=>{
        const [key,labelLines]=arr; const val=Math.max(1,Math.min(5,Number(scores[key]||0)));
        const x=chartX + i*(barW+barGap);
        fillRoundRect(ctx,x,chartY,barW,trackH,34,'#fce7ef');
        const fillH=Math.max(12,trackH*(val/5));
        fillRoundRect(ctx,x,chartY+trackH-fillH,barW,fillH,34,'#e11d48');
        ctx.fillStyle='#be123c'; ctx.font='bold 22px Arial'; ctx.textAlign='center'; ctx.fillText(`${val}/5`,x+barW/2,chartY+trackH+34);
        ctx.fillStyle='#475569'; ctx.font='bold 18px Arial';
        const baseY = chartY + trackH + 62;
        labelLines.forEach((line, lineIdx)=>{
          ctx.fillText(line, x+barW/2, baseY + lineIdx*21);
        });
      });
      ctx.textAlign='left';

      fillRoundRect(ctx,leftX+34,leftY+710,leftW-68,140,24,'#fff1f2','#fecdd3');
      ctx.fillStyle='#9f1239'; ctx.font='bold 30px Arial'; ctx.fillText('Tổng quan điểm số',leftX+50,leftY+760);
      ctx.fillStyle='#e11d48'; ctx.font='bold 68px Arial'; ctx.fillText(`${evalAverage(ev).toFixed(1)}/5`,leftX+50,leftY+836);

      ctx.fillStyle='#111827'; ctx.font='bold 30px Arial'; ctx.fillText('Nhận xét giáo viên',rightX+26,rightY+48);
      ctx.fillStyle='#64748b'; ctx.font='19px Arial'; ctx.fillText('Chữ được thu nhỏ để phù hợp khi giáo viên nhận xét dài.',rightX+26,rightY+78);

      const sections=[
        ['Tổng quan',ev.comment],
        ['Điểm mạnh',ev.strengths],
        ['Cần cải thiện',ev.improvements],
        ['Gợi ý phụ huynh',ev.suggestion]
      ];
      let sy=rightY+102;
      const boxH=150, gap=16;
      sections.forEach((sec)=>{
        fillRoundRect(ctx,rightX+20,sy,rightW-40,boxH,22,'#fff7f8','#fecdd3');
        ctx.fillStyle='#111827'; ctx.font='bold 24px Arial'; ctx.fillText(sec[0],rightX+44,sy+38);
        drawCanvasText(ctx,sec[1]||'Chưa có nhận xét.',rightX+44,sy+72,rightW-88,24,'#374151','20px Arial',4);
        sy += boxH + gap;
      });

      return c.toDataURL('image/png');
    }

function openEvaluationImage(studentId){
      const st=studentById(studentId); if(!st){toast('Không tìm thấy học sinh');return}
      const url=evaluationImageData(studentId);
      openGeneratedImageModal(`Ảnh đánh giá • ${st.name}`,url,`danhgia_${st.name.replace(/\s+/g,'_')}.png`,'Ảnh đánh giá đã sẵn sàng. Có thể tải về và gửi phụ huynh.');
    }

function evalAverage(ev){
      if(!ev||!ev.scores) return 0;
      const vals=Object.values(ev.scores).map(Number).filter(n=>Number.isFinite(n)); return vals.length? vals.reduce((a,b)=>a+b,0)/vals.length:0;
    }

function evaluationKeyFor(studentId,monthKey=evaluationMonthKey()){return `${studentId}__${monthKey}`}

function v7fDefaultEvaluationScores(){
      return {Listening:3,Speaking:3,Reading:3,Writing:3,Vocabulary:3,Participation:3,Homework:3};
    }

function v7fNormalizeEvaluationObject(ev,studentId){
      const monthKey=evaluationMonthKey();
      const st=studentById(studentId);
      ev ||= {studentId,classId:st?.classId||'',monthKey,month:monthKey,status:'draft',comment:'',strengths:'',improvements:'',suggestion:''};
      ev.studentId ||= studentId;
      ev.classId ||= st?.classId||'';
      ev.monthKey ||= normalizeEvaluationMonthValue(ev.month);
      ev.month=ev.monthKey;
      ev.scores={...v7fDefaultEvaluationScores(),...(ev.scores||{})};
      Object.keys(v7fDefaultEvaluationScores()).forEach(k=>{ev.scores[k]=Math.max(1,Math.min(5,Number(ev.scores[k]||3)))});
      ev.status=ev.status==='published'?'published':'draft';
      ev.strengths ??= '';
      ev.improvements ??= '';
      ev.suggestion ??= '';
      ev.comment ??= '';
      return ev;
    }

function peekEvaluation(studentId){
      db.evaluations ||= [];
      const monthKey=evaluationMonthKey();
      const existing=db.evaluations.find(e=>e.studentId===studentId && normalizeEvaluationMonthValue(e.monthKey||e.month)===monthKey);
      return existing?v7fNormalizeEvaluationObject(existing,studentId):v7fNormalizeEvaluationObject(null,studentId);
    }

function ensureEvaluation(studentId){
      db.evaluations ||= [];
      const monthKey=evaluationMonthKey();
      let ev=db.evaluations.find(e=>e.studentId===studentId && normalizeEvaluationMonthValue(e.monthKey||e.month)===monthKey);
      if(!ev){
        ev=v7fNormalizeEvaluationObject(null,studentId);
        db.evaluations.push(ev);
      }
      return v7fNormalizeEvaluationObject(ev,studentId);
    }

// Phase 7F: debounced evaluation drafts + local student-card/modal updates.
    const v7fEvaluationDirtyKeys=new Set();

const v7fEvaluationEditSnapshots=new Map();

function v7fEvaluationDraftKey(studentId){return `${evaluationMonthKey()}:${studentId}`}

function v7fIsEvaluationDirty(studentId){return v7fEvaluationDirtyKeys.has(v7fEvaluationDraftKey(studentId))}

function v7fMarkEvaluationDirty(studentId){
      v7fEvaluationDirtyKeys.add(v7fEvaluationDraftKey(studentId));
      const status=document.getElementById(`evalModalStatus_${v18bSafeId(studentId)}`);
      if(status){status.classList.remove('green');status.classList.add('yellow');status.textContent='Nháp'}
    }

function v7fClearEvaluationDirty(studentId){
      v7fEvaluationDirtyKeys.delete(v7fEvaluationDraftKey(studentId));
      v7fEvaluationEditSnapshots.delete(v7fEvaluationDraftKey(studentId));
    }

function v7fScheduleEvaluationDraftPersist(studentId){
      const key=v7fEvaluationDraftKey(studentId);
      v18bDebounce(`evaluationDraft:${key}`,()=>{
        v18fUpdateEvaluationModuleCache();
        saveLocalOnly();
      },750);
    }

function v7fBeginEvaluationEdit(studentId){
      const key=v7fEvaluationDraftKey(studentId);
      if(!v7fEvaluationEditSnapshots.has(key)){
        const ev=ensureEvaluation(studentId);
        v7fEvaluationEditSnapshots.set(key,JSON.parse(JSON.stringify(ev)));
      }
    }

function v7fCaptureEvaluationField(studentId,key,value){
      if(!['comment','strengths','improvements','suggestion'].includes(key)) return;
      const ev=ensureEvaluation(studentId);
      ev[key]=String(value??'');
      ev.status='draft';
      v18Touch();
      v7fMarkEvaluationDirty(studentId);
      v7fScheduleEvaluationDraftPersist(studentId);
    }

function v7fRestoreEvaluationSnapshot(studentId){
      const key=v7fEvaluationDraftKey(studentId);
      const snapshot=v7fEvaluationEditSnapshots.get(key);
      if(!snapshot) return false;
      db.evaluations=(db.evaluations||[]).filter(e=>!(e.studentId===studentId && normalizeEvaluationMonthValue(e.monthKey||e.month)===evaluationMonthKey()));
      db.evaluations.push(JSON.parse(JSON.stringify(snapshot)));
      v18Touch();
      v7fClearEvaluationDirty(studentId);
      v18fUpdateEvaluationModuleCache();
      saveLocalOnly();
      return true;
    }

function v7fCancelEvaluationEdit(studentId){
      if(v7fIsEvaluationDirty(studentId) && !confirm('Bỏ các thay đổi đánh giá chưa lưu?')) return;
      v7fRestoreEvaluationSnapshot(studentId);
      const content=document.getElementById(`evalModalContent_${v18bSafeId(studentId)}`);
      if(content) content.innerHTML=evalDetail(studentId,false);
      else openEvalModal(studentId,false);
      if(typeof evaluationPatchStudentDom==='function') evaluationPatchStudentDom(studentId);
    }

function v7fRefreshEvaluationModal(studentId,edit=false){
      const content=document.getElementById(`evalModalContent_${v18bSafeId(studentId)}`);
      if(!content) return false;
      const modalStudent=modalBackdrop?.querySelector?.('[data-evaluation-modal]')?.getAttribute('data-evaluation-student');
      if(String(modalStudent)!==String(studentId)) return false;
      const scrollTop=modalBackdrop?.querySelector?.('.modal')?.scrollTop||0;
      content.innerHTML=evalDetail(studentId,edit);
      const modalEl=modalBackdrop?.querySelector?.('.modal');
      if(modalEl) modalEl.scrollTop=scrollTop;
      return true;
    }

function v7fPatchEvaluationUi(studentId){
      if(route==='evaluation' && typeof evaluationPatchStudentDom==='function') evaluationPatchStudentDom(studentId);
      const status=document.getElementById(`evalModalStatus_${v18bSafeId(studentId)}`);
      const ev=peekEvaluation(studentId);
      if(status){
        status.classList.toggle('green',ev.status==='published');
        status.classList.toggle('yellow',ev.status!=='published');
        status.textContent=ev.status==='published'?'Đã gửi':'Nháp';
      }
    }

function v7fRefreshEvaluationBackground(studentId){
      setTimeout(async()=>{
        try{
          const changed=await refreshOfficialEvaluations({skipSave:true,forceNetwork:true});
          if(changed){
            v18fUpdateEvaluationModuleCache();
            saveLocalOnly();
            if(route==='evaluation'){
              if(typeof evaluationPatchStudentDom==='function') evaluationPatchStudentDom(studentId);
              if(!v7fIsEvaluationDirty(studentId)) v7fRefreshEvaluationModal(studentId,false);
            }
          }
        }catch(e){console.warn('Không refresh nền được đánh giá',e)}
      },900);
    }

function setEvalScore(studentId,key,value){
      const ev=ensureEvaluation(studentId);
      ev.scores[key]=Math.max(1,Math.min(5,Number(value||3)));
      ev.status='draft';
      v18Touch();
      v7fMarkEvaluationDirty(studentId);
      v7fScheduleEvaluationDraftPersist(studentId);

      // Update only the current modal controls; no popup/page rebuild.
      const box=document.getElementById('evalbar_'+studentId);
      if(box) box.innerHTML=skillBarChart(ev.scores);
      const avg=document.getElementById('evalavg_'+studentId);
      if(avg) avg.textContent=evalAverage(ev).toFixed(1)+'/5';
      document.querySelectorAll(`[data-eval-student="${CSS.escape(String(studentId))}"][data-eval-skill="${CSS.escape(String(key))}"]`).forEach(btn=>{
        btn.classList.toggle('primary', Number(btn.getAttribute('data-eval-score'))===Number(value));
      });
    }

async function saveEvaluation(studentId,status='draft',reopen=true){
      const busyKey=status==='published'?`evalsend:${evaluationMonthKey()}:${studentId}`:`evalsave:${evaluationMonthKey()}:${studentId}`;
      const alternateKey=`evalsave:${evaluationMonthKey()}:${studentId}`;
      if(v20o2IsBusy(busyKey)||v20o2IsBusy(alternateKey)) return;
      const ev=ensureEvaluation(studentId);
      ['comment','strengths','improvements','suggestion'].forEach(k=>{
        const el=document.getElementById(`ev_${k}_${studentId}`);
        if(el) ev[k]=el.value.trim();
      });
      const previousStatus=ev.status;
      ev.status=status;
      ev.updatedAt=new Date().toLocaleString('vi-VN');
      v18Touch();
      v7fScheduleEvaluationDraftPersist(studentId);
      try{
        v20o2SetBusy(busyKey,true);
        if(busyKey!==alternateKey) v20o2SetBusy(alternateKey,true);
        const data=await officialFetch('/api/evaluations',{method:'POST',body:JSON.stringify({
          studentId,
          monthKey:evaluationMonthKey(),
          status,
          scores:ev.scores,
          comment:ev.comment,
          strengths:ev.strengths,
          improvements:ev.improvements,
          suggestion:ev.suggestion
        })});
        db.evaluations=(db.evaluations||[]).filter(e=>!(e.studentId===studentId && normalizeEvaluationMonthValue(e.monthKey||e.month)===evaluationMonthKey()));
        db.evaluations.push(v7fNormalizeEvaluationObject(data.item,studentId));
        v7fClearEvaluationDirty(studentId);
        v20bAfterMutation(['evaluation'],{preserveCache:true,noRefresh:true});
        v18fUpdateEvaluationModuleCache();
        saveLocalOnly();
        v7fPatchEvaluationUi(studentId);
        if(reopen && modalBackdrop?.classList?.contains('show')) v7fRefreshEvaluationModal(studentId,false);
        toast(status==='published'?'Đã gửi đánh giá':'Đã lưu nháp đánh giá');
      }catch(e){
        ev.status=previousStatus==='published'?'published':'draft';
        v7fMarkEvaluationDirty(studentId);
        v7fPatchEvaluationUi(studentId);
        toast(e.message||'Không lưu được đánh giá');
      }finally{
        v20o2SetBusy(busyKey,false);
        if(busyKey!==alternateKey) v20o2SetBusy(alternateKey,false);
      }
    }
