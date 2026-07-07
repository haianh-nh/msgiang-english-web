/*
 * V19F Evaluation Module
 * Tách riêng phần render UI Đánh giá.
 * Không đổi UI/UX, wording, biểu đồ, modal hoặc nút đánh giá.
 * Các hàm setEvalScore/saveEvaluation/sendEvaluationToParent/openEvaluationImage/evaluationImageData vẫn nằm ở app core để giảm rủi ro dữ liệu.
 */

function evaluationMonthPanel(){
      const p=evaluationMonthParts();
      return `<div class="evalMonthPanel"><label>Tháng đánh giá<div class="evalMonthPick"><select class="input" onchange="setEvaluationMonthPart('month',this.value)">${evaluationMonthOptions(p.month)}</select><input class="input" type="number" min="2020" max="2099" value="${p.year}" onchange="setEvaluationMonthPart('year',this.value)"></div></label><span class="pill red">${formatEvaluationMonth()}</span></div>`
    }

    function evaluationPage(){
      const cls=isParent()?classesForUser():classesForTeachingUser(); 
      if(isParent()){
        const selected=selectedParentChildId();
        const st=studentById(selected) || parentChildren()[0];
        if(!st) return `<div class="empty">Chưa có học sinh liên kết với phụ huynh.</div>`;
        ensureEvaluation(st.id);
        return `${parentChildSelector()}<div class="screenTitle"><div><h1>Đánh giá học sinh</h1><p>Đánh giá chi tiết theo tháng, biểu đồ kỹ năng và nhận xét giáo viên.</p></div></div>${evaluationMonthPanel()}
        <div class="parentEvalLayout">
          ${parentOverallScoreboard(st.id)}
          ${parentDetailedEvaluationPanel(st.id)}
        </div>`
      }
      const groups=cls.map(c=>({c, students:c.students.map(s=>({...s,classId:c.id,className:c.name}))}));
      return `<div class="screenTitle"><div><h1>Đánh giá học sinh</h1><p>Đánh giá theo tháng.</p></div></div>${evaluationMonthPanel()}
      <div class="grid2">${groups.map((g,i)=>evaluationGroupCard(g.c,g.students,i)).join('')}</div>`
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
    function evaluationGroupCard(c,students,i){
      const evalMap=evaluationMapForCurrentMonth();
      const getEval=s=>evalMap.get(s.id)||ensureEvaluation(s.id);
      const evals=students.map(getEval).filter(Boolean);
      const avg=evals.length?evals.reduce((sum,e)=>sum+evalAverage(e),0)/evals.length:0;
      return `<div class="panel groupPanel" style="--i:${i}"><div class="classGroupHeader"><div><h2>${c.name}</h2><div class="sub">${c.teacher} • ${c.time}</div></div><div class="miniStats"><span class="pill blue">${students.length} học sinh</span><span class="pill red">TB ${avg.toFixed(1)}/5</span></div></div>
      ${students.map(s=>{const ev=getEval(s); const av=evalAverage(ev); return `<div class="studentEvalRow"><div><b>${s.name}</b><div class="mini">${c.name} • ${formatEvaluationMonth()}</div></div><span class="pill ${av>=4?'green':av>=3?'yellow':'red'}">${av?av.toFixed(1):'-'}/5</span><span class="pill ${ev?.status==='published'?'green':'yellow'}">${ev?.status==='published'?'Đã gửi':'Nháp'}</span><div class="tableActionStack"><button class="btn ghost miniCardBtn" onclick="openEvaluationImage('${s.id}')">Tạo ảnh</button><button class="btn ghost miniCardBtn" onclick="sendEvaluationToParent('${s.id}')">Gửi</button><button class="btn primary miniCardBtn" onclick="openEvalModal('${s.id}')">Đánh giá</button></div></div>`}).join('')}</div>`
    }


    function monthScoreData(studentId){
      const ev=ensureEvaluation(studentId);
      const base=evalAverage(ev)||3.2;
      const months=['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6'];
      return months.map((m,i)=>({month:m,score:Math.min(5,Math.max(1,+(base-0.55+i*0.16+((i%2)*0.08)).toFixed(1)))}));
    }
    function weeklyEvaluationData(studentId){
      const ev=ensureEvaluation(studentId);
      const avg=evalAverage(ev)||3.5;
      return [
        {week:'Tuần 1',focus:'Ổn định nề nếp học',score:Math.max(1,+(avg-.3).toFixed(1)),note:'Bé tham gia lớp tốt, cần chủ động phát biểu hơn.'},
        {week:'Tuần 2',focus:'Vocabulary & Listening',score:Math.max(1,+(avg-.1).toFixed(1)),note:'Từ vựng tiến bộ, nghe hiểu nội dung chính tốt hơn.'},
        {week:'Tuần 3',focus:'Speaking practice',score:Math.min(5,+(avg+.1).toFixed(1)),note:'Bé trả lời tốt hơn nhưng cần nói to, rõ và đủ câu.'},
        {week:'Tuần 4',focus:'Review & Homework',score:Math.min(5,+(avg+.25).toFixed(1)),note:'Hoàn thành bài tập tốt, phụ huynh duy trì luyện nghe tại nhà.'}
      ];
    }
    function parentOverallScoreboard(studentId){
      const st=studentById(studentId); const data=monthScoreData(studentId); const latest=data[data.length-1];
      return `<div class="panel overallScorePanel"><div class="panelHead"><div><h2>Bảng điểm tổng quan</h2><div class="mini">${st.name} • Theo từng tháng trong kỳ học</div></div><span class="pill red">${latest.score}/5</span></div>
      <div class="monthScoreChart">${data.map((d,i)=>`<div class="monthBar" style="--i:${i}"><div class="monthTrack"><div class="monthFill" style="height:${d.score/5*100}%"></div></div><small>${d.score}</small><b>${d.month.replace('Tháng ','T')}</b></div>`).join('')}</div>
      <div class="note" style="margin-top:12px"><b>Nhận xét tổng quan</b><p>${h(ensureEvaluation(studentId).comment)}</p></div></div>`
    }

    function parentDetailedEvaluationPanel(studentId){
      const st=studentById(studentId); const ev=ensureEvaluation(studentId);
      return `<div class="panel parentDetailPanel"><div class="panelHead"><div><h2>Đánh giá chi tiết</h2><div class="mini">${st.name} • ${classById(st.classId).name}</div></div><span class="pill red">${evalAverage(ev).toFixed(1)}/5</span></div>
      <div class="evalStatusBar"><div><span class="pill ${ev.status==='published'?'green':'yellow'}">${ev.status==='published'?'Đã gửi':'Nháp'}</span> <span class="pill red">${classById(st.classId).name}</span></div></div>
      <div class="evalBarBox parentInlineChart" id="evalbar_${studentId}">${skillBarChart(ev.scores)}</div>
      <div class="panelHead" style="margin-top:12px"><h2>Nhận xét giáo viên</h2><span class="pill gray">Chế độ xem</span></div>
      <div class="commentBox">${evalViewContent(studentId,ev)}</div></div>`
    }

    function openEvalModal(studentId,edit=false){
      const st=studentById(studentId); ensureEvaluation(studentId);
      modal(`<div class="modalHead"><h2>Đánh giá ${st.name}</h2><button class="close" onclick="closeModal()">×</button></div>${evalDetail(studentId,edit)}`)
    }


    function renderEvalStudent(id){document.getElementById('evalArea').innerHTML=evalDetail(id,false)}



    function evalDetail(studentId,edit=false){
      const st=studentById(studentId); const ev=ensureEvaluation(studentId); const canEdit=!isParent();
      return `<div class="evalStatusBar"><div><span class="pill ${ev.status==='published'?'green':'yellow'}">${ev.status==='published'?'Đã gửi':'Nháp'}</span> <span class="pill red">${classById(st.classId).name}</span></div>${canEdit?`<div class="editActions">${edit?`<button class="btn ghost" onclick="openEvalModal('${studentId}',false)">Hủy</button><button class="btn ghost" onclick="saveEvaluation('${studentId}','draft')">Lưu nháp</button><button class="btn primary" onclick="saveEvaluation('${studentId}','published')">Gửi</button>`:`<button class="btn ghost" onclick="openEvaluationImage('${studentId}')">Tạo ảnh</button><button class="btn ghost" onclick="sendEvaluationToParent('${studentId}')">Gửi</button><button class="btn primary" onclick="openEvalModal('${studentId}',true)">Chỉnh sửa</button>`}</div>`:''}</div>
      <div class="splitEval"><div class="panel"><div class="panelHead"><h2>Biểu đồ cột kỹ năng</h2><span class="pill red" id="evalavg_${studentId}">${evalAverage(ev).toFixed(1)}/5</span></div><div class="evalBarBox" id="evalbar_${studentId}">${skillBarChart(ev.scores)}</div></div>
      <div class="panel"><div class="panelHead"><h2>Nhận xét giáo viên</h2>${edit?'<span class="pill blue">Đang chỉnh sửa</span>':'<span class="pill gray">Xem chi tiết</span>'}</div><div class="commentBox">
      ${edit?evalEditForm(studentId,ev):evalViewContent(studentId,ev)}
      </div></div></div>`
    }

    function evalViewContent(studentId,ev){
      return `<div class="note"><b>Tổng quan</b><p>${h(ev.comment)}</p></div><div class="note"><b>Điểm mạnh</b><p>${h(ev.strengths)}</p></div><div class="note"><b>Cần cải thiện</b><p>${h(ev.improvements)}</p></div><div class="note"><b>Gợi ý phụ huynh</b><p>${h(ev.suggestion)}</p></div>${!isParent()?scoreButtons(studentId,ev,false):''}`
    }
    function evalEditForm(studentId,ev){
      return `<div class="note"><b>Tổng quan</b><textarea id="ev_comment_${studentId}" class="evalTextarea">${h(ev.comment)}</textarea></div>
      <div class="note"><b>Điểm mạnh</b><textarea id="ev_strengths_${studentId}" class="evalTextarea">${h(ev.strengths)}</textarea></div>
      <div class="note"><b>Cần cải thiện</b><textarea id="ev_improvements_${studentId}" class="evalTextarea">${h(ev.improvements)}</textarea></div>
      <div class="note"><b>Gợi ý phụ huynh</b><textarea id="ev_suggestion_${studentId}" class="evalTextarea">${h(ev.suggestion)}</textarea></div>
      ${scoreButtons(studentId,ev,true)}`
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
      return `<div class="note"><b>Chấm nhanh</b><div class="mini">${editable?'Bấm điểm 1–5, biểu đồ cập nhật ngay.':'Điểm hiện tại theo thang 1–5.'}</div>${Object.entries(ev.scores).map(([k,v])=>`<div class="scoreRow"><span>${skillNameVI(k)}</span><div class="scoreBtns">${[1,2,3,4,5].map(n=>`<button class="btn ${n===v?'primary':''}" data-eval-student="${studentId}" data-eval-skill="${k}" data-eval-score="${n}" ${editable?`onclick="setEvalScore('${studentId}','${k}',${n})"`:''}>${n}</button>`).join('')}</div></div>`).join('')}</div>`
    }
