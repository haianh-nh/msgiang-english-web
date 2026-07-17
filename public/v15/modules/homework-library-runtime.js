/* Phase 8D.1: Homework and library runtime helpers, loaded with Homework. */

function homeworkTypeOptions(){
      return [
        ['listen_tick','Listening - Listen and tick'],
        ['listen_complete','Listening - Listen and complete'],
        ['listen_number','Listening - Listen and number'],
        ['listen_match','Listening - Listen and match'],
        ['reading_choose','Reading - Choose the correct answer'],
        ['reading_complete','Reading - Look, read and complete'],
        ['reading_match','Reading - Read and match'],
        ['reading_tick_picture','Reading - Tick the correct picture'],
        ['writing_order','Writing - Put the words in order'],
        ['writing_complete','Writing - Complete the sentences'],
        ['writing_missing_letter','Writing - Write the missing letter'],
        ['upload_file','Upload photo/file']
      ];
    }
    function homeworkTypeLabel(t){return (homeworkTypeOptions().find(x=>x[0]===t)||[])[1]||t||'Thư viện bài tập'}
    function assignmentQuestions(a){
      if(a.questions?.length) return a.questions;
      const type=a.type || (a.skill==='Listening'?'listen_tick':a.skill==='Reading'?'reading_choose':a.skill==='Writing'?'writing_complete':'upload_file');
      if(type==='listen_tick') return [{q:'Listen and tick the correct answer.',answer:'B'},{q:'Listen and choose True or False.',answer:'True'},{q:'Listen and tick the picture you hear.',answer:'A'}];
      if(type==='listen_complete') return [{q:'I have a _____.',answer:'book'},{q:'She is in the _____.',answer:'classroom'}];
      if(type==='reading_choose') return [{q:'Choose the correct answer: This is my school.',answer:'school'},{q:'What color is the bag?',answer:'red'}];
      if(type==='reading_complete') return [{q:'Look, read and complete: This is my _____.',answer:'teacher'},{q:'I can see a _____.',answer:'cat'}];
      if(type==='writing_order') return [{q:'Put the words in order: like / I / English',answer:'I like English'},{q:'is / This / pen / my',answer:'This is my pen'}];
      if(type==='writing_missing_letter') return [{q:'Write the missing letter: b_ok',answer:'o'},{q:'c_t',answer:'a'}];
      return [{q:'Upload photo/file of your homework.',answer:''}];
    }
    function assignmentAutoGrade(a){return a.autoGrade!==false && (a.type||'').indexOf('upload')<0 && a.skill!=='Speaking'}
    function homeworkStatusPill(status,gradeStatus){
      if(gradeStatus==='graded') return '<span class="pill green">Đã chấm</span>';
      if(status==='submitted') return '<span class="pill yellow">Đã nộp</span>';
      if(status==='missing') return '<span class="pill red">Chưa nộp</span>';
      return '<span class="pill blue">Đang làm</span>';
    }
    function ensureHomework(){
      db.assignments ||= []; db.submissions ||= [];
      db.assignments.forEach(a=>{a.type ||= a.skill==='Listening'?'listen_tick':a.skill==='Reading'?'reading_choose':a.skill==='Writing'?'writing_complete':a.skill==='Speaking'?'upload_file':'reading_choose'; a.totalScore ||= 100;});
    }
    function homeworkFilteredClasses(){return isParent()?classesForUser():classesForTeachingUser()}
    function assignmentById(id){return db.assignments.find(a=>a.id===id)||{}}
    function submissionById(id){return db.submissions.find(s=>s.id===id)||{}}
    function submissionsForAssignment(id){return db.submissions.filter(s=>s.assignmentId===id)}
    function openHomeworkPreview(assignmentId){
      const a=assignmentById(assignmentId); const qs=assignmentQuestions(a);
      modal(`<div class="modalHead"><h2>${a.title}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="modalInfoGrid"><div><p><b>Lớp:</b> ${classById(a.classId).name}</p><p><b>Dạng bài:</b> ${homeworkTypeLabel(a.type)}</p><p><b>Hạn nộp:</b> ${a.due||'-'}</p></div><div>${a.skill==='Listening'?'<div class="audioMock">Audio : unit-listening.mp3</div>':'<div class="empty">File/ảnh đính kèm </div>'}</div></div>
      <div class="modalTableWrap"><table class="modalTable"><thead><tr><th>STT</th><th>Câu hỏi</th><th>Đáp án </th></tr></thead><tbody>${qs.map((q,i)=>`<tr><td>${i+1}</td><td>${q.q}</td><td>${q.answer||'-'}</td></tr>`).join('')}</tbody></table></div>`)
    }
    function submitHomework(assignmentId,studentId){
      const a=assignmentById(assignmentId);
      let s=db.submissions.find(x=>x.assignmentId===assignmentId&&x.studentId===studentId);
      if(!s){s={id:'sub_'+assignmentId+'_'+studentId,assignmentId,studentId,classId:a.classId}; db.submissions.push(s)}
      s.status='submitted'; s.submittedAt=new Date().toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      if(assignmentAutoGrade(a)){s.gradeStatus='graded'; s.score=88; s.teacherComment='Hệ thống đã tự chấm phần câu hỏi ngắn.'}
      else{s.gradeStatus='need_grade'; s.score=null; s.teacherComment='Chờ giáo viên chấm.'}
      save(); toast('Đã nộp bài '); closeModal(); render();
    }
    function openStudentHomework(assignmentId,studentId){
      const a=assignmentById(assignmentId); const st=studentById(studentId); const qs=assignmentQuestions(a); const sub=db.submissions.find(s=>s.assignmentId===assignmentId&&s.studentId===studentId);
      modal(`<div class="modalHead"><h2>Làm bài: ${a.title}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="modalInfoGrid"><div><p><b>Học sinh:</b> ${st.name}</p><p><b>Kỹ năng:</b> ${a.skill}</p><p><b>Dạng bài:</b> ${homeworkTypeLabel(a.type)}</p><p><b>Hạn nộp:</b> ${a.due}</p></div><div>${a.skill==='Listening'?'<div class="audioMock">Nghe audio </div>':'<div class="empty">Nội dung/ảnh bài tập </div>'}</div></div>
      <div class="questionPreview">${qs.map((q,i)=>`<div class="questionRow"><div class="qNo">${i+1}</div><div><b>${q.q}</b><div class="mini">Học sinh trả lời trực tiếp trên web</div></div><input class="answerBox" placeholder="Nhập/chọn đáp án" value="${i===0?' answer':''}"></div>`).join('')}</div>
      <div style="text-align:right;margin-top:14px">${sub?.status==='submitted'?'<span class="paidBadge">Đã nộp</span>':`<button class="btn primary" onclick="submitHomework('${assignmentId}','${studentId}')">Nộp bài</button>`}</div>`)
    }
    function openGradeSubmission(id){
      const s=submissionById(id); const a=assignmentById(s.assignmentId); const st=studentById(s.studentId);
      modal(`<div class="modalHead"><h2>Chấm bài: ${st.name}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="modalInfoGrid"><div><p><b>Bài:</b> ${a.title}</p><p><b>Dạng:</b> ${homeworkTypeLabel(a.type)}</p><p><b>Nộp lúc:</b> ${s.submittedAt||'-'}</p></div><div class="studentWorkBox"><b>Bài làm </b><p>${a.type==='upload_file'?'Ảnh/file bài làm của học sinh.':'Câu trả lời trực tiếp trên web.'}</p></div></div>
      <div class="formGrid"><label>Điểm<input id="gradeScore" class="input" type="number" min="0" max="100" value="${s.score??90}"></label><label class="full">Nhận xét<textarea id="gradeComment" class="input" rows="4">${s.teacherComment||'Con làm bài tốt, cần chú ý phần phát âm/từ vựng.'}</textarea></label></div>
      <div style="text-align:right;margin-top:14px"><button class="btn primary" onclick="saveSubmissionGrade('${id}')">Lưu điểm</button></div>`)
    }
    function saveSubmissionGrade(id){
      const s=submissionById(id); s.gradeStatus='graded'; s.status='submitted'; s.score=Number(document.getElementById('gradeScore')?.value||0); s.teacherComment=document.getElementById('gradeComment')?.value||''; s.gradedAt=new Date().toLocaleString('vi-VN'); save(); toast('Đã lưu điểm'); closeModal(); render();
    }
    function createAssignmentFromModal(){
      const classId=document.getElementById('hwClass')?.value;
      const skill=document.getElementById('hwSkill')?.value;
      const type=document.getElementById('hwType')?.value;
      const title=document.getElementById('hwTitle')?.value || 'Homework';
      const due=document.getElementById('hwDue')?.value || 'Chủ nhật 20:00';
      const c=classById(classId);
      const id='a_'+Date.now();
      const a={id,classId,title,skill,type,due,status:'published',autoGrade:assignmentAutoGrade({type,skill}),totalScore:100,createdBy:currentUser.id};
      db.assignments.push(a);
      (c.students||[]).forEach(st=>db.submissions.push({id:'sub_'+id+'_'+st.id,assignmentId:id,studentId:st.id,classId,status:'missing',gradeStatus:'missing',score:null,submittedAt:''}));
      save(); toast('Đã giao bài tập'); closeModal(); render();
    }




    function ensureExerciseLibrary(){
      db.exerciseLibrary ||= [];
      db.exerciseLibrary = (db.exerciseLibrary||[]).map(x=>x?.type==='pdf'?{...x,type:'word'}:x).filter(Boolean);
      if(db.libraryTab==='pdf') db.libraryTab='word';
      db.libraryTab ||= 'word';
      return db.exerciseLibrary;
    }
    
    function setLibraryTab(tab){ensureExerciseLibrary(); db.libraryTab=(tab==='pdf'?'word':tab); v18bSetLocalUiState(); render()}
    function setLibrarySearch(v){ensureExerciseLibrary(); db.libraryQ=v; v18bSetLocalUiState(); v18bRenderDebounced('librarySearch',220)}
    function libraryFilterValues(field,type=normalizeLibraryTab()){
      ensureExerciseLibrary();
      const key=v18FastKey()+`|libraryFilterValues|${field}|${type}`;
      v18Memo.libraryFilterValues ||= {};
      if(v18Memo.libraryFilterValues[key]) return v18Memo.libraryFilterValues[key];
      const values=[...new Set((db.exerciseLibrary||[]).filter(x=>x.type===type).map(x=>x[field]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'vi',{numeric:true}));
      v18Memo.libraryFilterValues[key]=values;
      return values;
    }
    function setLibraryFilter(field,value){
      ensureExerciseLibrary();
      if(field==='level') db.libraryLevel=value;
      if(field==='skill') db.librarySkill=value;
      if(field==='unit') db.libraryUnit=value;
      v18bSetLocalUiState(); render();
    }
    function resetLibraryFilters(){
      ensureExerciseLibrary();
      db.libraryQ=''; db.libraryLevel='all'; db.librarySkill='all'; db.libraryUnit='all';
      v18bSetLocalUiState(); render();
    }
    // V19E: library filter UI helpers moved to /v15/modules/library.js
    function libraryItems(type=normalizeLibraryTab()){
      ensureExerciseLibrary();
      const q=String(db.libraryQ||'').toLowerCase().trim();
      const level=db.libraryLevel||'all';
      const skill=db.librarySkill||'all';
      const unit=db.libraryUnit||'all';
      const key=v18FastKey()+`|library|${type}|${q}|${level}|${skill}|${unit}`;
      v18Memo.library ||= {};
      if(v18Memo.library.key===key) return v18Memo.library.rows;
      const rows=(db.exerciseLibrary||[])
        .filter(x=>x.type===type)
        .filter(x=>!q || smartSearchMatch(smartSearchIndex(x.title,x.level,x.skill,x.unit,x.fileName,x.uploadedBy), q))
        .filter(x=>level==='all' || x.level===level)
        .filter(x=>skill==='all' || x.skill===skill)
        .filter(x=>unit==='all' || x.unit===unit)
        .sort((a,b)=>String(b.uploadedAt||b.createdAt||'').localeCompare(String(a.uploadedAt||a.createdAt||''),'vi') || String(a.title).localeCompare(String(b.title),'vi'));
      v18Memo.library={key,rows};
      return rows;
    }

    function libraryExtension(item){
      const ext=String(item?.extension||item?.fileName?.split('.').pop()||'').toLowerCase();
      return ['doc','docx','pdf','mp3','wav','m4a','aac'].includes(ext)?ext:'';
    }
    function libraryTypeLabel(t,item=null){
      if(t==='audio') return 'Audio';
      if(t==='pdf') return 'PDF';
      const ext=libraryExtension(item);
      return ext?`Word .${ext.toUpperCase()}`:'Word';
    }
    function libraryIcon(t){return t==='audio'?'🎧':t==='pdf'?'📄':'📝'}
    

function canManageLibrary(){return canManageOperations()||isTeachingUser()}
    function canDeleteLibrary(){return canManageOperations()}
    function fileSizeLabel(bytes){
      const n=Number(bytes||0);
      if(!n) return 'Không rõ dung lượng';
      if(n<1024*1024) return `${Math.round(n/1024)} KB`;
      return `${(n/1024/1024).toFixed(n<10*1024*1024?1:0)} MB`;
    }
    function libraryDateLabel(v){
      if(!v) return '-';
      const d=new Date(v);
      if(Number.isNaN(d.getTime())) return v;
      return d.toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
    }
    function normalizeLibraryTab(){
      if(!['word','pdf','audio'].includes(db.libraryTab)) db.libraryTab='word';
      db.libraryTab ||= 'word';
      return db.libraryTab;
    }

    // V19E: homeworkPage/libraryCard moved to /v15/modules/library.js. Upload/delete/preview API stays in app core for safety.
    function openLibraryPreview(id){
      const item=(db.exerciseLibrary||[]).find(x=>x.id===id); if(!item) return;
      if(item.type==='word') return openWordPreview(id);
      const url=item.publicUrl||item.url||'';
      if(item.type==='pdf'){
        modal(`<div class="modalHead"><h2>${h(item.title)}</h2><button class="close" onclick="closeModal()">×</button></div>
        <div class="wordPreviewMeta"><span class="pill red">PDF</span><span class="pill gray">${h(item.fileName||'')}</span><span class="pill green">${h(item.level||'All')}</span><span class="pill blue">${fileSizeLabel(item.fileSize)}</span></div>
        ${url?`<iframe class="pdfPreviewFrame" src="${h(url)}#toolbar=1" title="${h(item.title)}"></iframe>`:'<div class="empty">File chưa có link mở.</div>'}
        <div style="text-align:right;margin-top:14px">${url?`<a class="btn primary" href="${h(url)}" target="_blank" rel="noopener">Mở / tải PDF</a>`:''}</div>`);
        return;
      }
      modal(`<div class="modalHead"><h2>${h(item.title)}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="wordPreviewMeta"><span class="pill blue">Audio</span><span class="pill gray">${fileSizeLabel(item.fileSize)}</span><span class="pill green">${h(item.level||'All')}</span></div>
      ${url?`<audio class="libraryAudio" controls src="${h(url)}"></audio>`:'<div class="empty">File chưa có link mở.</div>'}
      <div style="text-align:right;margin-top:14px">${url?`<a class="btn primary" href="${h(url)}" target="_blank" rel="noopener">Mở / tải Audio</a>`:''}</div>`)
    }

    async function openWordPreview(id){
      const item=(db.exerciseLibrary||[]).find(x=>x.id===id); if(!item) return;
      const url=item.publicUrl||item.url||'';
      modal(`<div class="modalHead"><h2>Xem trước Word</h2><button class="close" onclick="closeModal()">×</button></div>
        <div class="wordPreviewMeta"><span class="pill red">${libraryTypeLabel(item.type,item)}</span><span class="pill gray">${h(item.fileName||'')}</span><span class="pill green">${h(item.level||'All')}</span></div>
        <div class="uploadProgressNote">Đang tải nội dung xem trước...</div>`);
      try{
        const data=await officialFetch(`/api/library/${encodeURIComponent(id)}/preview`);
        const text=data.text||'Không có nội dung xem trước.';
        const note=data.previewable?'' : '<div class="uploadProgressNote">File này không hỗ trợ preview trực tiếp. Hãy tải về để xem đầy đủ.</div>';
        modal(`<div class="modalHead"><h2>${h(data.title||item.title)}</h2><button class="close" onclick="closeModal()">×</button></div>
          <div class="wordPreviewMeta"><span class="pill red">${libraryTypeLabel(item.type,{...item,fileName:data.fileName||item.fileName})}</span><span class="pill gray">${h(data.fileName||item.fileName||'')}</span><span class="pill green">${h(item.level||'All')}</span></div>
          ${note}
          <div class="wordPreviewText">${h(text)}</div>
          <div style="text-align:right;margin-top:14px">${url?`<a class="btn primary" href="${h(url)}" target="_blank" rel="noopener">Mở / tải file Word</a>`:''}</div>`);
      }catch(e){
        modal(`<div class="modalHead"><h2>${h(item.title)}</h2><button class="close" onclick="closeModal()">×</button></div>
          <div class="dangerBox"><b>Không xem trước được file này</b><span>${h(e.message||'Có lỗi khi đọc file Word')}</span></div>
          <div style="text-align:right;margin-top:14px">${url?`<a class="btn primary" href="${h(url)}" target="_blank" rel="noopener">Mở / tải file Word</a>`:''}</div>`);
      }
    }

    function openLibraryItemModal(){
      ensureExerciseLibrary();
      const currentType=normalizeLibraryTab();
      modal(`<div class="modalHead"><h2>+ Upload tài liệu vào thư viện</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="libraryUploadBox"><b>File thật sẽ được lưu vào Supabase Storage</b><span class="mini">Hỗ trợ Word (.doc/.docx), PDF, MP3, WAV, M4A, AAC. Tối đa 50MB/file.</span><input id="libFile" class="input" type="file" accept=".doc,.docx,.pdf,.mp3,.wav,.m4a,.aac,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,audio/*" onchange="syncLibraryFileType()"></div>
      <div class="formGrid" style="margin-top:14px"><label>Loại tài liệu<select id="libType" class="input"><option value="word" ${currentType==='word'?'selected':''}>Word</option><option value="pdf" ${currentType==='pdf'?'selected':''}>PDF</option><option value="audio" ${currentType==='audio'?'selected':''}>Audio</option></select></label>
      <label>Tên tài liệu<input id="libTitle" class="input" placeholder="VD: G3 - Unit 7 Worksheet"></label>
      <label>Khối / Level<input id="libLevel" class="input" placeholder="VD: G3, G4, Starter"></label>
      <label>Kỹ năng<select id="libSkill" class="input"><option>Listening</option><option>Reading</option><option>Writing</option><option>Speaking</option><option>Vocabulary</option><option>Grammar</option><option>Other</option></select></label>
      <label class="full">Unit / Chủ đề<input id="libUnit" class="input" placeholder="VD: Unit 7, Review 2, Phonics"></label></div>
      <div id="libUploadStatus"></div>
      <div style="text-align:right;margin-top:18px"><button class="btn ghost" onclick="closeModal()">Hủy</button> <button class="btn primary" onclick="saveLibraryItem()">Upload tài liệu</button></div>`)
    }

    function syncLibraryFileType(){
      const file=document.getElementById('libFile')?.files?.[0];
      if(!file) return;
      const name=file.name.toLowerCase();
      const type=/\.pdf$/i.test(name)||file.type==='application/pdf'
        ? 'pdf'
        : (/\.(doc|docx)$/i.test(name)||file.type.includes('wordprocessingml')||file.type==='application/msword'?'word':'audio');
      const typeEl=document.getElementById('libType'); if(typeEl) typeEl.value=type;
      const titleEl=document.getElementById('libTitle');
      if(titleEl && !titleEl.value) titleEl.value=file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ');
    }

    async function saveLibraryItem(){
      const type=document.getElementById('libType')?.value||'word';
      const title=(document.getElementById('libTitle')?.value||'').trim();
      const level=(document.getElementById('libLevel')?.value||'').trim();
      const skill=document.getElementById('libSkill')?.value||'';
      const unit=(document.getElementById('libUnit')?.value||'').trim();
      const file=document.getElementById('libFile')?.files?.[0];
      const status=document.getElementById('libUploadStatus');
      if(!title){toast('Nhập tên tài liệu');return}
      if(!file){toast('Chọn file Word, PDF hoặc Audio');return}
      try{
        if(status) status.innerHTML='<div class="uploadProgressNote">Đang upload file lên Supabase Storage...</div>';
        const fd=new FormData();
        fd.append('type',type); fd.append('title',title); fd.append('level',level||'All'); fd.append('skill',skill); fd.append('unit',unit); fd.append('file',file);
        const res=await fetch('/api/library',{method:'POST',body:fd,credentials:'include'});
        const data=await res.json().catch(()=>({}));
        if(!res.ok) throw new Error(data.error||'Upload lỗi');
        db.exerciseLibrary ||= [];
        db.exerciseLibrary.unshift(data.item);
        db.libraryTab=data.item.type;
        v18gClearNetworkCache();
        v18fUpdateLibraryModuleCache();
        v20bAfterMutation(['library']);
        save(); closeModal(); render(); toast('Đã upload tài liệu thật');
      }catch(e){
        if(status) status.innerHTML='';
        toast(e.message||'Không upload được tài liệu');
      }
    }

    function openDeleteLibraryItem(id){
      const item=(db.exerciseLibrary||[]).find(x=>x.id===id); if(!item) return;
      modal(`<div class="modalHead"><h2>Xóa tài liệu</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="dangerBox"><b>${h(item.title)}</b><span>Thao tác này sẽ xóa tài liệu khỏi thư viện và xóa file trong Storage. Chỉ Admin/Quản lí/Lễ tân có quyền xóa.</span></div>
      <div style="text-align:right;margin-top:18px"><button class="btn ghost" onclick="closeModal()">Hủy</button> <button class="btn dangerAction" onclick="deleteLibraryItem('${id}')">Xóa tài liệu</button></div>`)
    }

    async function deleteLibraryItem(id){
      try{
        await officialFetch(`/api/library/${encodeURIComponent(id)}`,{method:'DELETE',body:'{}'});
        db.exerciseLibrary=(db.exerciseLibrary||[]).filter(x=>x.id!==id);
        v18fUpdateLibraryModuleCache();
        v20bAfterMutation(['library']);
        save(); closeModal(); render(); toast('Đã xóa tài liệu');
      }catch(e){toast(e.message||'Không xóa được tài liệu')}
    }



    // V19D: tuitionPage moved to /v15/modules/tuition.js. Data/helpers/mutations remain in app core for safety.
