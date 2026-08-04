/*
 * V19E Library Module
 * Tách riêng phần render UI Thư viện.
 * Phase 8D.4.9: chuẩn hóa card và nút thao tác Thư viện.
 * Runtime upload/delete/preview/API nằm trong homework-library-runtime.js.
 */

function filterSelect(label,field,current,values){
      return `<label>${label}<select class="input" onchange="setLibraryFilter('${field}',this.value)"><option value="all" ${current==='all'?'selected':''}>Tất cả</option>${values.map(v=>`<option value="${h(v)}" ${current===v?'selected':''}>${h(v)}</option>`).join('')}</select></label>`;
    }
    function activeLibraryFiltersText(){
      const chips=[];
      if(db.libraryQ) chips.push(`<span class="pill blue">Tìm: ${h(db.libraryQ)}</span>`);
      if(db.libraryLevel && db.libraryLevel!=='all') chips.push(`<span class="pill gray">Khối: ${h(db.libraryLevel)}</span>`);
      if(db.librarySkill && db.librarySkill!=='all') chips.push(`<span class="pill green">Kỹ năng: ${h(db.librarySkill)}</span>`);
      if(db.libraryUnit && db.libraryUnit!=='all') chips.push(`<span class="pill red">Unit: ${h(db.libraryUnit)}</span>`);
      return chips.length?`<div class="activeFilterLine">${chips.join('')}</div>`:'';
    }

function homeworkPage(){
      ensureExerciseLibrary();
      if(isParent()) return `<div class="screenTitle"><div><h1>Thư viện bài tập</h1><p>Phần này chỉ dành cho giáo viên và quản trị trung tâm.</p></div></div><div class="blockedBox"><h2>🔒 Không có quyền truy cập</h2></div>`;
      const tab=normalizeLibraryTab();
      const items=libraryItems(tab);
      const wordCount=(db.exerciseLibrary||[]).filter(x=>libraryFileKind(x)==='word').length;
      const pdfCount=(db.exerciseLibrary||[]).filter(x=>libraryFileKind(x)==='pdf').length;
      const docCount=(db.exerciseLibrary||[]).filter(x=>libraryFileKind(x)==='word' && libraryExtension(x)==='doc').length;
      const docxCount=(db.exerciseLibrary||[]).filter(x=>libraryFileKind(x)==='word' && libraryExtension(x)==='docx').length;
      const audioCount=(db.exerciseLibrary||[]).filter(x=>libraryFileKind(x)==='audio').length;
      const levels=libraryFilterValues('level',tab);
      const skills=libraryFilterValues('skill',tab);
      const units=libraryFilterValues('unit',tab);
      return `<div class="screenTitle"><div><h1>Thư viện bài tập</h1><p>Upload và quản lý file Word (.doc/.docx), PDF và Audio thật bằng Supabase Storage.</p></div>${canManageLibrary()?'<button class="btn primary" onclick="openLibraryItemModal()">+ Upload tài liệu</button>':''}</div>
      <div class="statGrid"><div class="stat"><div class="statIcon redgrad">📝</div><div><h3>Word</h3><strong>${wordCount}</strong><small>.doc ${docCount} • .docx ${docxCount}</small></div></div><div class="stat"><div class="statIcon greengrad">📄</div><div><h3>PDF</h3><strong>${pdfCount}</strong><small>phiếu bài tập / tài liệu</small></div></div><div class="stat"><div class="statIcon bluegrad">🎧</div><div><h3>Audio</h3><strong>${audioCount}</strong><small>nghe / phát âm</small></div></div></div>
      <div class="libraryTabs"><button class="${tab==='word'?'active':''}" onclick="setLibraryTab('word')">📝 Word (${wordCount})</button><button class="${tab==='pdf'?'active':''}" onclick="setLibraryTab('pdf')">📄 PDF (${pdfCount})</button><button class="${tab==='audio'?'active':''}" onclick="setLibraryTab('audio')">🎧 Audio (${audioCount})</button></div>
      <div class="libraryFilterPanel">
        <div class="libraryToolbar">
          <label>Tìm tài liệu<input class="input" value="${h(db.libraryQ||'')}" placeholder="Tên tài liệu, file, unit, người upload..." oninput="setLibrarySearch(this.value)"></label>
          ${filterSelect('Khối / Level','level',db.libraryLevel||'all',levels)}
          ${filterSelect('Kỹ năng','skill',db.librarySkill||'all',skills)}
          ${filterSelect('Unit / Chủ đề','unit',db.libraryUnit||'all',units)}
          <div class="filterActions"><button class="btn ghost" onclick="resetLibraryFilters()">Xóa lọc</button><button class="btn ghost" onclick="refreshOfficialLibrary().then(()=>render())">Tải lại</button></div>
          <span class="pill blue">${items.length} tài liệu</span><span class="pill gray">${libraryTypeLabel(tab,null)}</span>
        </div>
        ${activeLibraryFiltersText()}
      </div>
      <div class="simpleLibraryGrid">${items.map((item,i)=>libraryCard(item,i)).join('')||'<div class="libraryEmptyHint">Chưa có tài liệu phù hợp. Bấm “Upload tài liệu” để thêm file Word/PDF/Audio thật.</div>'}</div>`
    }

    
function libraryCard(item,i){
      const kind=libraryFileKind(item);
      const isAudio=kind==='audio';
      const pillClass=isAudio?'blue':kind==='pdf'?'green':'red';
      const meta=`${h(item.level||'All')} • ${h(item.skill||'-')} • ${h(item.unit||'-')}`;
      return `<div class="simpleLibraryCard" style="--i:${i}">
        <div class="simpleLibraryHead">
          <div class="simpleLibraryTitle"><h3>${h(item.title)}</h3><div class="mini">${meta}</div></div>
          <span class="pill ${pillClass}">${libraryTypeLabel(kind,item)}</span>
        </div>
        <div class="mini">${libraryDateLabel(item.uploadedAt||item.createdAt)}${item.uploadedBy?` • ${h(item.uploadedBy)}`:''}</div>
        ${isAudio?(item.publicUrl||item.url)?`<audio class="libraryAudio" controls preload="metadata" src="${h(item.publicUrl||item.url)}"></audio>`:'':''}
        <div class="simpleLibraryActions ${canDeleteLibrary()?'hasDelete':'noDelete'}">
          <button class="btn ghost libraryActionPreview" type="button" onclick="openLibraryPreview('${item.id}')">Xem trước</button>
          <a class="btn primary libraryActionDownload" href="${h(libraryDownloadUrl(item.id))}">Tải xuống</a>
          ${canDeleteLibrary()?`<button class="btn ghost dangerMini libraryActionDelete" type="button" onclick="openDeleteLibraryItem('${item.id}')">Xóa</button>`:''}
        </div>
      </div>`
    }
