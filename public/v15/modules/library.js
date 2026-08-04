/*
 * V19E Library Module
 * Tách riêng phần render UI Thư viện.
 * Phase 8D.4.12: tab Tất cả mặc định và render cục bộ tốc độ cao.
 * Runtime upload/delete/preview/API nằm trong homework-library-runtime.js.
 */

function filterSelect(label,field,current,values){
      return `<label>${label}<select id="libraryFilter_${field}" class="input" onchange="setLibraryFilter('${field}',this.value)"><option value="all" ${current==='all'?'selected':''}>Tất cả</option>${values.map(v=>`<option value="${h(v)}" ${current===v?'selected':''}>${h(v)}</option>`).join('')}</select></label>`;
    }
    function activeLibraryFiltersText(){
      const chips=[];
      if(db.libraryQ) chips.push(`<span class="pill blue">Tìm: ${h(db.libraryQ)}</span>`);
      if(db.libraryLevel && db.libraryLevel!=='all') chips.push(`<span class="pill gray">Khối: ${h(db.libraryLevel)}</span>`);
      if(db.librarySkill && db.librarySkill!=='all') chips.push(`<span class="pill green">Kỹ năng: ${h(db.librarySkill)}</span>`);
      if(db.libraryUnit && db.libraryUnit!=='all') chips.push(`<span class="pill red">Unit: ${h(db.libraryUnit)}</span>`);
      return chips.length?`<div class="activeFilterLine">${chips.join('')}</div>`:'';
    }
    function libraryGridMarkup(items){
      return items.map((item,i)=>libraryCard(item,i)).join('')||'<div class="libraryEmptyHint">Chưa có tài liệu phù hợp. Bấm “Upload tài liệu” để thêm file Word/PDF/Audio thật.</div>';
    }
    function libraryTabButtonLabel(type,stats){
      if(type==='all') return `🗂️ Tất cả (${stats.all})`;
      if(type==='pdf') return `📄 PDF (${stats.pdf})`;
      if(type==='audio') return `🎧 Audio (${stats.audio})`;
      return `📝 Word (${stats.word})`;
    }
    function libraryTabButtons(tab,stats){
      return ['all','word','pdf','audio'].map(type=>`<button data-library-tab="${type}" class="${tab===type?'active':''}" onclick="setLibraryTab('${type}')">${libraryTabButtonLabel(type,stats)}</button>`).join('');
    }
    function librarySelectOptions(field,current,type){
      const values=libraryFilterValues(field,type);
      return `<option value="all" ${current==='all'?'selected':''}>Tất cả</option>${values.map(v=>`<option value="${h(v)}" ${current===v?'selected':''}>${h(v)}</option>`).join('')}`;
    }
    function renderLibraryResultsDom(options={}){
      if(typeof route==='undefined' || route!=='homework') return false;
      const tab=normalizeLibraryTab();
      normalizeLibraryFiltersForTab(tab);
      const items=libraryItems(tab);
      const stats=libraryCatalogStats();
      document.querySelectorAll('[data-library-tab]').forEach(btn=>{
        const type=btn.getAttribute('data-library-tab');
        btn.classList.toggle('active',type===tab);
        btn.innerHTML=libraryTabButtonLabel(type,stats);
      });
      const wordCount=document.getElementById('libraryWordCount'); if(wordCount) wordCount.textContent=String(stats.word);
      const pdfCount=document.getElementById('libraryPdfCount'); if(pdfCount) pdfCount.textContent=String(stats.pdf);
      const audioCount=document.getElementById('libraryAudioCount'); if(audioCount) audioCount.textContent=String(stats.audio);
      const wordBreakdown=document.getElementById('libraryWordBreakdown'); if(wordBreakdown) wordBreakdown.textContent=`.doc ${stats.doc} • .docx ${stats.docx}`;
      if(options.syncFilters){
        [['level',db.libraryLevel||'all'],['skill',db.librarySkill||'all'],['unit',db.libraryUnit||'all']].forEach(([field,current])=>{
          const el=document.getElementById(`libraryFilter_${field}`);
          if(el) el.innerHTML=librarySelectOptions(field,current,tab);
        });
      }
      if(options.syncSearch){
        const input=document.getElementById('librarySearchInput');
        if(input && input.value!==(db.libraryQ||'')) input.value=db.libraryQ||'';
      }
      const count=document.getElementById('libraryResultCount');
      if(count) count.textContent=`${items.length} tài liệu`;
      const kind=document.getElementById('libraryKindChip');
      if(kind) kind.textContent=libraryTypeLabel(tab,null);
      const filters=document.getElementById('libraryActiveFilters');
      if(filters) filters.innerHTML=activeLibraryFiltersText();
      const grid=document.getElementById('libraryResultGrid');
      if(grid) grid.innerHTML=libraryGridMarkup(items);
      return true;
    }

function homeworkPage(){
      ensureExerciseLibrary();
      if(isParent()) return `<div class="screenTitle"><div><h1>Thư viện bài tập</h1><p>Phần này chỉ dành cho giáo viên và quản trị trung tâm.</p></div></div><div class="blockedBox"><h2>🔒 Không có quyền truy cập</h2></div>`;
      const tab=normalizeLibraryTab();
      normalizeLibraryFiltersForTab(tab);
      const items=libraryItems(tab);
      const stats=libraryCatalogStats();
      const levels=libraryFilterValues('level',tab);
      const skills=libraryFilterValues('skill',tab);
      const units=libraryFilterValues('unit',tab);
      return `<div class="screenTitle"><div><h1>Thư viện bài tập</h1><p>Upload và quản lý file Word (.doc/.docx), PDF và Audio thật bằng Supabase Storage.</p></div>${canManageLibrary()?'<button class="btn primary" onclick="openLibraryItemModal()">+ Upload tài liệu</button>':''}</div>
      <div class="statGrid"><div class="stat"><div class="statIcon redgrad">📝</div><div><h3>Word</h3><strong id="libraryWordCount">${stats.word}</strong><small id="libraryWordBreakdown">.doc ${stats.doc} • .docx ${stats.docx}</small></div></div><div class="stat"><div class="statIcon greengrad">📄</div><div><h3>PDF</h3><strong id="libraryPdfCount">${stats.pdf}</strong><small>phiếu bài tập / tài liệu</small></div></div><div class="stat"><div class="statIcon bluegrad">🎧</div><div><h3>Audio</h3><strong id="libraryAudioCount">${stats.audio}</strong><small>nghe / phát âm</small></div></div></div>
      <div class="libraryTabs">${libraryTabButtons(tab,stats)}</div>
      <div class="libraryFilterPanel">
        <div class="libraryToolbar">
          <label>Tìm tài liệu<input id="librarySearchInput" class="input" value="${h(db.libraryQ||'')}" placeholder="Tên tài liệu, file, unit, người upload..." oninput="setLibrarySearch(this.value)"></label>
          ${filterSelect('Khối / Level','level',db.libraryLevel||'all',levels)}
          ${filterSelect('Kỹ năng','skill',db.librarySkill||'all',skills)}
          ${filterSelect('Unit / Chủ đề','unit',db.libraryUnit||'all',units)}
          <div class="filterActions"><button class="btn ghost" onclick="resetLibraryFilters()">Xóa lọc</button><button id="libraryReloadBtn" class="btn ghost" onclick="reloadLibraryNow()">Tải lại</button></div>
          <span id="libraryResultCount" class="pill blue">${items.length} tài liệu</span><span id="libraryKindChip" class="pill gray">${libraryTypeLabel(tab,null)}</span>
        </div>
        <div id="libraryActiveFilters">${activeLibraryFiltersText()}</div>
      </div>
      <div id="libraryResultGrid" class="simpleLibraryGrid">${libraryGridMarkup(items)}</div>`
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
        ${isAudio?(item.publicUrl||item.url)?`<audio class="libraryAudio" controls preload="none" src="${h(item.publicUrl||item.url)}"></audio>`:'':''}
        <div class="simpleLibraryActions ${canDeleteLibrary()?'hasDelete':'noDelete'}">
          <button class="btn ghost libraryActionPreview" type="button" onclick="openLibraryPreview('${item.id}')">Xem trước</button>
          <a class="btn primary libraryActionDownload" href="${h(libraryDownloadUrl(item.id))}">Tải xuống</a>
          ${canDeleteLibrary()?`<button class="btn ghost dangerMini libraryActionDelete" type="button" onclick="openDeleteLibraryItem('${item.id}')">Xóa</button>`:''}
        </div>
      </div>`
    }
