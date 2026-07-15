/*
 * V19A Classes Module
 * Tách riêng phần render trang Lớp học để giảm app core và chuẩn bị tách module thật.
 * Không đổi UI/UX, wording, màu sắc, popup hoặc logic nghiệp vụ.
 */

function classGroupsMarkup(rows){
      const key=v18eRowsSignature(rows,'classGroups');
      v18Memo.classGroupsMarkup ||= {};
      if(v18Memo.classGroupsMarkup.key===key) return v18Memo.classGroupsMarkup.html;
      const groups=groupClassesByGrade(rows);
      const html=groups.length?groups.map((g,gi)=>`<section class="gradeGroup" data-class-grade="${h(g.grade)}" style="--i:${gi}"><div class="gradeHeader"><h2>${g.grade}</h2><span class="pill blue">${g.items.length} lớp</span></div><div class="gradeClassGrid">${g.items.map((c,i)=>`<div data-class-item="${h(c.id)}" onclick="openClassDetail('${c.id}')">${classCard(c,i)}</div>`).join('')}</div></section>`).join(''):'<div class="empty">Không tìm thấy lớp.</div>';
      v18Memo.classGroupsMarkup={key,html};
      return html;
    }
    function classSectionsMarkup(rows){
      const key=v18eRowsSignature(rows,'classSections');
      v18Memo.classSectionsMarkup ||= {};
      if(v18Memo.classSectionsMarkup.key===key) return v18Memo.classSectionsMarkup.html;
      const active=sortClassesByGrade(rows.filter(c=>c.status!=='ended'));
      const ended=sortClassesByGrade(rows.filter(c=>c.status==='ended'));
      const html=`<section class="classSection"><div class="classSectionHead"><h2>Lớp đang học</h2><span class="pill green">${active.length} lớp</span></div>${classGroupsMarkup(active)}</section><section class="classSection archivedClassBlock"><div class="classSectionHead"><h2>Lớp đã học</h2><span class="pill gray">${ended.length} lớp</span></div>${classGroupsMarkup(ended)}</section>`;
      v18Memo.classSectionsMarkup={key,html};
      return html;
    }

function classCard(c,i){
      const active=c.status!=='ended';
      return `<div class="classCard" data-class-card="${h(c.id)}" style="--i:${i}"><h3 data-class-name>${c.name}</h3><div class="classMeta" data-class-meta>GV: <b>${c.teacher||'-'}</b>${c.ta?`<br>TA: ${c.ta}`:''}</div><div class="classCount" data-class-count>${c.students.length} học sinh</div><div class="classStatusLine"><span class="pill red" data-class-time>${c.time||'Chưa có lịch'}</span><span class="pill ${active?'green':'gray'}" data-class-status>${active?'Đang học':'Đã kết thúc'}</span></div></div>`
    }




    function classesPage(){
      const cls=sortClassesByGrade(classesForClassPage());
      const active=cls.filter(c=>c.status!=='ended'), ended=cls.filter(c=>c.status==='ended');
      return `<div class="screenTitle"><div><h1>Danh sách lớp học</h1><p>Chia theo lớp đang học và lớp đã học.</p></div>${canManageOperations()?'<div class="actions"><button class="btn ghost" onclick="openImportClassesModal()">Import file</button><button class="btn primary" onclick="openClassModal()">+ Thêm lớp</button></div>':''}</div>
      ${managerScopeControl('managerClassScope','Hiển thị lớp học')}
      <div class="toolbar"><input id="classSearch" class="input" placeholder="Tìm lớp, giáo viên..." oninput="filterClasses()"><span id="classActiveCount" class="pill green">${active.length} đang học</span><span id="classEndedCount" class="pill gray">${ended.length} đã học</span><span id="classStudentCount" class="pill purple">${cls.reduce((s,c)=>s+c.students.length,0)} học sinh</span></div><div id="classList">${classSectionsMarkup(cls)}</div>`
    }


    function filterClasses(){
      v18bDebounce('classFilter', v18bUpdateClassListNow, 180);
    }
