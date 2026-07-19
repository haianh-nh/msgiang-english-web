/* Phase 8D.1: Staff UI/runtime, lazy-loaded for teachers/settings routes. */

    function teacherRoleLabel(t){const v=teacherRoleValue(t); return v==='admin'?'Admin':v==='manager'?'Quản lí':v==='ta'?'TA':'Giáo viên'}
    function teacherRoleClasses(t){const v=teacherRoleValue(t); return v==='admin'?'red':v==='manager'?'blue':v==='ta'?'purple':'green'}
    function classesOfTeacher(t){return db.classes.filter(c=>c.teacherId===t.id || c.taId===t.id || c.teacher===t.name || c.ta===t.name)}
    function v7hNormalizeClassMarker(value){
      return String(value||'')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g,'')
        .replace(/\s+/g,' ')
        .toLocaleLowerCase('vi')
        .trim();
    }
    function v7hIsTutoringClass(c){
      const note=v7hNormalizeClassMarker(c?.note);
      const grade=v7hNormalizeClassMarker(c?.grade);
      const name=v7hNormalizeClassMarker(c?.name);
      const kind=v7hNormalizeClassMarker(c?.sessionKind||c?.session_kind||c?.kind||c?.type);
      const sourceKey=v7hNormalizeClassMarker(c?.sourceSessionKey||c?.source_session_key);
      return c?.isTutoring===true
        || note.startsWith('__tutoring_session__')
        || kind==='tutoring'
        || sourceKey.startsWith('tutoring:')
        || grade==='hoc kem'
        || /^hoc kem(?:\s|$)/.test(name)
        || /^lop hoc kem(?:\s|$)/.test(name);
    }
    function mainClassesOfTeacher(t){return classesOfTeacher(t).filter(c=>!v7hIsTutoringClass(c))}

    function roleChoiceMarkup(active='teacher',prefix='teacherRoleChoice',allowAdmin=isAdmin()){
      const roles=[
        ['teacher','👩‍🏫','Giáo viên'],
        ['ta','🧑‍🏫','TA'],
        ['manager','🛡️','Quản lí'],
        ['admin','👑','Admin']
      ].filter(r=>allowAdmin || r[0]!=='admin');
      return `<div class="teacherPermGrid compactRoleChoices">${roles.map(r=>`<div class="roleChoice ${active===r[0]?'active':''}" onclick="selectTeacherRole('${prefix}','${r[0]}')"><input type="radio" name="${prefix}" value="${r[0]}" ${active===r[0]?'checked':''} style="display:none"><b>${r[1]} ${r[2]}</b></div>`).join('')}</div>`
    }
    function selectTeacherRole(name,value){
      document.querySelectorAll(`input[name="${name}"]`).forEach(i=>{i.checked=i.value===value});
      document.querySelectorAll(`input[name="${name}"]`).forEach(i=>i.closest('.roleChoice')?.classList.toggle('active',i.checked));
      document.querySelector(`input[name="${name}"]:checked`)?.dispatchEvent(new Event('change',{bubbles:true}));
    }
    function selectedTeacherRole(name,def='teacher'){
      return document.querySelector(`input[name="${name}"]:checked`)?.value || def;
    }


    // UI nhân sự: lọc cục bộ và khóa thao tác theo từng action qua utility dùng chung.
    const v7hStaffFilters={q:'',role:'all',status:'all'};
    let v7hStaffFilterTimer=null;
    let v7hConfirmResolver=null;

    function v7hBeginStaffAction(key,button,text){
      return window.MsUiAction.beginLockedAction(key,button,text);
    }
    function v7hEndStaffAction(action){
      window.MsUiAction.endLockedAction(action);
    }
    function v7hStaffSearchText(value){
      return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('vi').trim();
    }
    function v7hReadStaffFilters(){
      v7hStaffFilters.q=v7hStaffSearchText(document.getElementById('staffSearch')?.value||'');
      v7hStaffFilters.role=document.getElementById('staffRoleFilter')?.value||'all';
      v7hStaffFilters.status=document.getElementById('staffStatusFilter')?.value||'all';
      return v7hStaffFilters;
    }
    function v7hScheduleStaffFilter(){
      clearTimeout(v7hStaffFilterTimer);
      v7hStaffFilterTimer=setTimeout(v7hApplyStaffFilters,180);
    }
    function v7hApplyStaffFilters(){
      if(route!=='teachers') return;
      const filters=v7hReadStaffFilters();
      let visible=0;
      const sectionCounts={teacher:0,receptionist:0};
      document.querySelectorAll('[data-staff-card]').forEach(card=>{
        const search=String(card.dataset.staffSearch||'');
        const roleValue=card.dataset.staffRole||'';
        const statusValue=card.dataset.staffStatus||'active';
        const matchQ=!filters.q || search.includes(filters.q);
        const matchRole=filters.role==='all' || roleValue===filters.role;
        const matchStatus=filters.status==='all' || statusValue===filters.status;
        const show=matchQ&&matchRole&&matchStatus;
        card.hidden=!show;
        if(show){visible++;sectionCounts[card.dataset.staffCard==='receptionist'?'receptionist':'teacher']++}
      });
      const receptionistSection=document.getElementById('staffReceptionistSection');
      if(receptionistSection) receptionistSection.hidden=sectionCounts.receptionist===0;
      const teachingSection=document.getElementById('staffTeachingSection');
      if(teachingSection) teachingSection.hidden=sectionCounts.teacher===0;
      const empty=document.getElementById('staffNoResults');
      if(empty) empty.hidden=visible>0;
      const visibleCount=document.getElementById('staffVisibleCount');
      if(visibleCount) visibleCount.textContent=`${visible} kết quả`;
    }
    function v7hStaffFilterToolbar(){
      return `<div class="staffToolbar"><label class="staffSearchBox"><span>Tìm nhân sự</span><input id="staffSearch" class="input" value="${h(v7hStaffFilters.q||'')}" placeholder="Tên, số điện thoại, email hoặc lớp" oninput="v7hScheduleStaffFilter()"></label><label><span>Vai trò</span><select id="staffRoleFilter" class="input" onchange="v7hApplyStaffFilters()"><option value="all">Tất cả</option><option value="teacher">Giáo viên</option><option value="ta">TA</option><option value="manager">Quản lí</option>${isAdmin()?'<option value="receptionist">Lễ tân</option><option value="admin">Admin</option>':''}</select></label><label><span>Trạng thái</span><select id="staffStatusFilter" class="input" onchange="v7hApplyStaffFilters()"><option value="all">Tất cả</option><option value="active">Đang hoạt động</option><option value="inactive">Tạm khóa</option></select></label><span id="staffVisibleCount" class="staffVisibleCount"></span></div>`;
    }
    function v7hRestoreStaffFilterControls(){
      const roleEl=document.getElementById('staffRoleFilter');
      const statusEl=document.getElementById('staffStatusFilter');
      if(roleEl) roleEl.value=v7hStaffFilters.role;
      if(statusEl) statusEl.value=v7hStaffFilters.status;
      requestAnimationFrame(v7hApplyStaffFilters);
    }
    function v7hInlineFieldError(inputId,message=''){
      const input=document.getElementById(inputId);
      if(!input) return false;
      input.classList.toggle('inputError',!!message);
      let error=input.parentElement?.querySelector?.('.fieldError');
      if(message && !error){error=document.createElement('div');error.className='fieldError';input.insertAdjacentElement('afterend',error)}
      if(error){error.textContent=message;error.hidden=!message}
      return !message;
    }
    function v7hClearStaffErrors(){
      modalBackdrop?.querySelectorAll?.('[data-staff-modal] .inputError').forEach(el=>el.classList.remove('inputError'));
      modalBackdrop?.querySelectorAll?.('[data-staff-modal] .fieldError').forEach(el=>{el.textContent='';el.hidden=true});
      v7hStaffFeedback('');
    }
    function v7hValidEmail(value){return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}
    function v7hStaffFeedback(message,type='success'){
      const box=modalBackdrop?.querySelector?.('[data-staff-feedback]');
      if(!box) return false;
      box.textContent=message||'';
      box.className=`staffModalFeedback ${message?type:''}`;
      box.hidden=!message;
      return true;
    }
    function v7hShowStaffError(message){
      const text=message||'Có lỗi khi xử lý nhân sự';
      if(!v7hStaffFeedback(text,'error')) toast(text);
    }
    function v7hStaffFormSnapshot(scope){
      if(!scope) return '';
      const values=[];
      scope.querySelectorAll('input:not([data-ignore-dirty]),select:not([data-ignore-dirty]),textarea:not([data-ignore-dirty])').forEach(el=>{
        if(el.type==='radio'||el.type==='checkbox') values.push(`${el.name}:${el.value}:${el.checked?'1':'0'}`);
        else values.push(`${el.id||el.name}:${el.value}`);
      });
      return values.join('|');
    }
    function v7hInitStaffModal(){
      const scope=modalBackdrop?.querySelector?.('[data-staff-modal]');
      if(!scope) return;
      scope.dataset.initialSnapshot=v7hStaffFormSnapshot(scope);
      scope.dataset.staffDirty='0';
      const mark=(event)=>{
        scope.dataset.staffDirty=v7hStaffFormSnapshot(scope)===scope.dataset.initialSnapshot?'0':'1';
        const target=event?.target;
        if(target?.id && target.classList?.contains('inputError')) v7hInlineFieldError(target.id,'');
        v7hStaffFeedback('');
      };
      scope.querySelectorAll('input:not([data-ignore-dirty]),select:not([data-ignore-dirty]),textarea:not([data-ignore-dirty])').forEach(el=>{el.addEventListener('input',mark);el.addEventListener('change',mark)});
    }
    function v7hMarkStaffModalClean(){
      const scope=modalBackdrop?.querySelector?.('[data-staff-modal]');
      if(!scope) return;
      scope.dataset.initialSnapshot=v7hStaffFormSnapshot(scope);
      scope.dataset.staffDirty='0';
    }
    function v7hStaffModalDirty(){return modalBackdrop?.querySelector?.('[data-staff-modal]')?.dataset?.staffDirty==='1'}
    function v7hConfirm({title='Xác nhận',message='',confirmText='Xác nhận',danger=false}={}){
      if(v7hConfirmResolver) return Promise.resolve(false);
      return new Promise(resolve=>{
        v7hConfirmResolver=resolve;
        const overlay=document.createElement('div');
        overlay.id='v7hConfirmOverlay';
        overlay.className='v7hConfirmOverlay';
        overlay.innerHTML=`<div class="v7hConfirmCard" role="dialog" aria-modal="true"><h3>${h(title)}</h3><div class="v7hConfirmMessage">${h(message).replace(/\n/g,'<br>')}</div><div class="v7hConfirmActions"><button class="btn ghost" onclick="v7hResolveConfirm(false)">Hủy</button><button id="v7hConfirmPrimary" class="btn ${danger?'dangerAction':'primary'}" onclick="v7hResolveConfirm(true)">${h(confirmText)}</button></div></div>`;
        document.body.appendChild(overlay);
        requestAnimationFrame(()=>overlay.classList.add('show'));
        setTimeout(()=>document.getElementById('v7hConfirmPrimary')?.focus(),0);
      });
    }
    function v7hResolveConfirm(result){
      const overlay=document.getElementById('v7hConfirmOverlay');
      const resolver=v7hConfirmResolver;
      v7hConfirmResolver=null;
      if(overlay){overlay.classList.remove('show');setTimeout(()=>overlay.remove(),120)}
      if(resolver) resolver(!!result);
    }
    function v7hClassTagMarkup(classes){
      if(!classes.length) return '';
      const first=classes.slice(0,3).map(c=>`<span class="sessionTag" title="${h(c.name)}">${h(c.name)}</span>`).join('');
      return `${first}${classes.length>3?`<span class="sessionTag more">+${classes.length-3} lớp</span>`:''}`;
    }
    function v7hTeacherClassPanelMarkup(t){
      const cls=mainClassesOfTeacher(t);
      const role=teacherRoleValue(t);
      const assignmentRole=role==='ta'?'ta':'teacher';
      const activeClassOptions=sortClassesByGrade(db.classes)
        .filter(c=>!v7hIsTutoringClass(c))
        .filter(c=>!isClassEnded(c))
        .filter(c=>assignmentRole==='ta'?c.taId!==t.id:c.teacherId!==t.id);
      const classOptions=activeClassOptions.map(c=>`<option value="${c.id}">${h(c.name)}</option>`).join('');
      return `<div id="teacherClassPanel" class="teacherClassBox"><div class="teacherClassTitle"><b>Lớp đang phụ trách</b><span class="pill gray">${cls.length} lớp</span></div><div id="teacherAssignedClassList">${cls.length?cls.map(c=>`<div class="teacherClassRow" data-assigned-class="${c.id}"><span><b>${h(c.name)}</b><span class="mini"> • ${h(c.time||'Chưa có lịch')}</span>${isClassEnded(c)?'<span class="pill gray" style="margin-left:8px">Đã kết thúc</span>':''}</span>${isClassEnded(c)?'<span class="mini">Chỉ xem</span>':`<button class="btn ghost miniCardBtn" onclick="removeTeacherFromClass('${t.id}','${c.id}','${assignmentRole}',this)">Bỏ gán</button>`}</div>`).join(''):'<div class="staffEmptyInline">Chưa được gán lớp</div>'}</div><div class="teacherAssignBox"><label>Gán thêm lớp<select id="teacherAssignClass" class="input" data-ignore-dirty="1"><option value="">-- Chọn lớp --</option>${classOptions}</select></label><button id="assignTeacherClassBtn" class="btn primary" ${classOptions?'':'disabled'} onclick="const v=document.getElementById('teacherAssignClass').value;if(v)assignTeacherToClass('${t.id}',v,'${assignmentRole}',this)">Gán lớp</button></div></div>`;
    }
    function v7hPatchTeacherClassPanel(teacherId){
      const t=teacherById(teacherId); const old=document.getElementById('teacherClassPanel');
      if(!t?.id||!old) return false;
      const scroll=old.closest('.modal')?.scrollTop||0;
      const node=v29StaffCardNode(v7hTeacherClassPanelMarkup(t));
      if(!node) return false;
      old.replaceWith(node);
      requestAnimationFrame(()=>{const modalEl=node.closest('.modal');if(modalEl) modalEl.scrollTop=scroll});
      return true;
    }
    function v7hPatchTeacherModalHeader(t){
      const scope=modalBackdrop?.querySelector?.('[data-staff-modal="teacher"]');
      if(!scope||!t) return;
      const name=scope.querySelector('[data-staff-header-name]');
      const account=scope.querySelector('[data-staff-header-account]');
      const roleBadge=scope.querySelector('[data-staff-header-role]');
      const avatar=scope.querySelector('[data-staff-header-avatar]');
      if(name) name.textContent=t.name||'';
      if(account) account.textContent=t.phone||'-';
      if(roleBadge){roleBadge.textContent=teacherRoleLabel(t);roleBadge.className=`pill ${teacherRoleClasses(t)}`}
      if(avatar) avatar.textContent=(t.name||'T').split(' ').slice(-1)[0][0]||'T';
    }
    function v7hPatchReceptionistModalHeader(u){
      const scope=modalBackdrop?.querySelector?.('[data-staff-modal="receptionist"]');
      if(!scope||!u) return;
      const name=scope.querySelector('[data-staff-header-name]');
      const account=scope.querySelector('[data-staff-header-account]');
      const avatar=scope.querySelector('[data-staff-header-avatar]');
      if(name) name.textContent=u.name||'Lễ tân';
      if(account) account.textContent=u.phone||'-';
      if(avatar) avatar.textContent=(u.name||'L').split(' ').slice(-1)[0][0]||'L';
    }

    function receptionistAccountsForTeachersPage(){
      if(!isAdmin()) return [];
      return (db.users||[])
        .filter(u=>u.roles?.includes('receptionist'))
        .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'vi'));
    }

    function v29StaffPayload(){
      return {teachers:db.teachers||[],users:isAdmin()?(db.users||[]):[]};
    }
    function v29PersistStaffMutation(source='staff-mutation'){
      const payload=v29StaffPayload();
      moduleCacheSet('teachers:latest',payload);
      try{v26StoreSet(v26StoreKey('teachers','latest'),payload,{source})}catch(e){console.warn('Không cập nhật được staff shared store',e)}
      lazyRouteState.teachers={loaded:true,loading:false,loadedAt:Date.now(),mutated:true};
      v20bAfterMutation(['teachers'],{preserveCache:true,delayMs:5000,renderOnRevalidate:false});
      saveLocalOnly();
    }
    function v29StaffCardNode(markup){
      const template=document.createElement('template');
      template.innerHTML=String(markup||'').trim();
      return template.content.firstElementChild;
    }
    function v29SortedStaffInsert(grid,node){
      if(!grid||!node) return;
      const name=String(node.dataset.staffName||'');
      const before=Array.from(grid.children).find(el=>String(el.dataset.staffName||'').localeCompare(name,'vi')>0);
      if(before) grid.insertBefore(node,before); else grid.appendChild(node);
    }
    function v29PatchStaffStats(){
      if(route!=='teachers') return;
      const rows=db.teachers||[];
      const receptionists=receptionistAccountsForTeachersPage();
      const counts={
        staffTeacherCount:rows.length,
        staffManagerCount:rows.filter(t=>t.roles?.includes('manager')).length,
        staffReceptionistCount:receptionists.length,
        staffTaCount:rows.filter(t=>t.roles?.includes('ta')).length,
        staffAdminCount:rows.filter(t=>t.roles?.includes('admin')).length,
        staffReceptionistSectionCount:`${receptionists.length} tài khoản`,
        staffTeachingSectionCount:`${rows.length} nhân sự`,
      };
      Object.entries(counts).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=String(value)});
      const section=document.getElementById('staffReceptionistSection');
      if(section) section.hidden=receptionists.length===0;
    }
    function v29UpsertStaffCard(kind,item){
      if(route!=='teachers'||!item?.id) return false;
      const isReceptionistKind=kind==='receptionist';
      const grid=document.getElementById(isReceptionistKind?'staffReceptionistGrid':'staffTeacherGrid');
      if(!grid) return false;
      const id=`${isReceptionistKind?'receptionist':'teacher'}-card-${item.id}`;
      const old=document.getElementById(id);
      const node=v29StaffCardNode(isReceptionistKind?receptionistCard(item,0):teacherCard(item,0));
      if(!node) return false;
      if(old) old.remove();
      v29SortedStaffInsert(grid,node);
      v29PatchStaffStats();
      v7hApplyStaffFilters();
      return true;
    }
    function v29RemoveStaffCard(kind,id){
      if(route!=='teachers') return false;
      document.getElementById(`${kind==='receptionist'?'receptionist':'teacher'}-card-${id}`)?.remove();
      v29PatchStaffStats();
      v7hApplyStaffFilters();
      return true;
    }
    function v29RefreshStaffUi(kind,item,options={}){
      if(route==='teachers'){
        if(options.remove) v29RemoveStaffCard(kind,options.id||item?.id);
        else v29UpsertStaffCard(kind,item);
        return;
      }
      // The settings page also exposes staff actions. Render only the current
      // page content; the app shell/sidebar stays untouched by V18D.
      if(route==='settings') render();
    }

    function teachersPage(){
      if(!canManageOperations()) return `<div class="blockedBox"><h2>🔒 Không có quyền truy cập</h2></div>`;
      const rows=[...db.teachers].sort((a,b)=>a.name.localeCompare(b.name,'vi'));
      const receptionists=receptionistAccountsForTeachersPage();
      const managerCount=rows.filter(t=>t.roles?.includes('manager')).length;
      const taCount=rows.filter(t=>t.roles?.includes('ta')).length;
      const adminCount=rows.filter(t=>t.roles?.includes('admin')).length;
      const headerActions=`<div class="screenTitleActions">${isAdmin()?`<button class="btn ghost" onclick="openCreateReceptionistModal()">+ Tạo Lễ tân</button>`:''}<button class="btn primary" onclick="openTeacherModal()">+ Tạo giáo viên</button></div>`;
      const markup=`<div class="screenTitle staffScreenTitle"><div><h1>Giáo viên & nhân sự</h1><p>Quản lý tài khoản và phân công lớp.</p></div>${headerActions}</div>
      <div class="staffSummaryBar"><span><b id="staffTeacherCount">${rows.length}</b> giảng dạy</span><span><b id="staffManagerCount">${managerCount}</b> quản lí</span>${isAdmin()?`<span><b id="staffReceptionistCount">${receptionists.length}</b> lễ tân</span>`:''}<span><b id="staffTaCount">${taCount}</b> TA</span><span><b id="staffAdminCount">${adminCount}</b> admin</span></div>
      ${v7hStaffFilterToolbar()}
      <section id="staffReceptionistSection" ${receptionists.length?'':'hidden'}><div class="staffSectionTitle"><h2>Lễ tân</h2><span id="staffReceptionistSectionCount" class="pill yellow">${receptionists.length}</span></div><div id="staffReceptionistGrid" class="grid3 staffGrid">${receptionists.map((u,i)=>receptionistCard(u,i)).join('')}</div></section>
      <section id="staffTeachingSection"><div class="staffSectionTitle"><h2>Giáo viên, TA và Quản lí</h2><span id="staffTeachingSectionCount" class="pill gray">${rows.length}</span></div><div id="staffTeacherGrid" class="grid3 staffGrid">${rows.map((t,i)=>teacherCard(t,i)).join('')}</div></section>
      <div id="staffNoResults" class="staffNoResults" hidden>Không tìm thấy nhân sự phù hợp.</div>`;
      requestAnimationFrame(v7hRestoreStaffFilterControls);
      return markup;
    }

    function teacherCard(t,i){
      const cls=mainClassesOfTeacher(t);
      const active=t.status!=='inactive';
      const id=String(t.id||'');
      const staffName=String(t.name||'').toLocaleLowerCase('vi');
      const role=teacherRoleValue(t);
      const search=v7hStaffSearchText([t.name,t.phone,t.email,...cls.map(c=>c.name)].filter(Boolean).join(' '));
      const contact=[t.phone||'Chưa có SĐT',t.email||''].filter(Boolean).join(' • ');
      return `<div id="teacher-card-${id}" data-staff-card="teacher" data-staff-id="${id}" data-staff-name="${h(staffName)}" data-staff-search="${h(search)}" data-staff-role="${role}" data-staff-status="${active?'active':'inactive'}" class="teacherCard staffCompactCard" style="--i:${i}" onclick="openTeacherDetail('${id}')"><div class="teacherTop"><div class="teacherTopLeft"><div class="teacherAvatar">${(t.name||'T').split(' ').slice(-1)[0][0]||'T'}</div><div class="staffIdentity"><h3>${h(t.name||'')}</h3><div class="mini staffContact" title="${h(contact)}">${h(contact)}</div></div></div><span class="pill ${teacherRoleClasses(t)}">${teacherRoleLabel(t)}</span></div><div class="teacherMeta compact"><span class="staffStatusDot ${active?'active':'inactive'}"></span><span>${active?'Đang hoạt động':'Tạm khóa'}</span><span class="metaDivider">•</span><span>${cls.length} lớp</span></div>${cls.length?`<div class="teacherClassList compact">${v7hClassTagMarkup(cls)}</div>`:''}</div>`;
    }

    function receptionistCard(u,i){
      const active=u.status!=='inactive';
      const initial=(u.name||'L').split(' ').slice(-1)[0][0]||'L';
      const id=String(u.id||'');
      const staffName=String(u.name||'').toLocaleLowerCase('vi');
      const search=v7hStaffSearchText([u.name,u.phone,u.email].filter(Boolean).join(' '));
      const contact=[u.phone||'Chưa có SĐT',u.email||''].filter(Boolean).join(' • ');
      return `<div id="receptionist-card-${id}" data-staff-card="receptionist" data-staff-id="${id}" data-staff-name="${h(staffName)}" data-staff-search="${h(search)}" data-staff-role="receptionist" data-staff-status="${active?'active':'inactive'}" class="teacherCard receptionistCard staffCompactCard" style="--i:${i}" onclick="openReceptionistDetail('${id}')"><div class="teacherTop"><div class="teacherTopLeft"><div class="teacherAvatar receptionistAvatar">${initial}</div><div class="staffIdentity"><h3>${h(u.name||'Lễ tân')}</h3><div class="mini staffContact" title="${h(contact)}">${h(contact)}</div></div></div><span class="pill yellow">Lễ tân</span></div><div class="teacherMeta compact"><span class="staffStatusDot ${active?'active':'inactive'}"></span><span>${active?'Đang hoạt động':'Tạm khóa'}</span></div></div>`;
    }

    function openReceptionistDetail(id){
      if(!isAdmin()) return;
      const u=(db.users||[]).find(x=>String(x.id)===String(id) && x.roles?.includes('receptionist'));
      if(!u){toast('Không tìm thấy tài khoản Lễ tân');return}
      modal(`<div data-staff-modal="receptionist" data-staff-id="${u.id}" class="staffModalContent"><div class="modalHead"><h2>Thông tin Lễ tân</h2><button class="close" onclick="closeModal()">×</button></div><div class="staffModalScroll"><div class="teacherDetailHeader compact"><div data-staff-header-avatar class="teacherAvatar receptionistAvatar">${(u.name||'L').split(' ').slice(-1)[0][0]||'L'}</div><div><h3 data-staff-header-name>${h(u.name||'Lễ tân')}</h3><p class="mini">Tài khoản: <b data-staff-header-account>${h(u.phone||'-')}</b></p><span class="pill yellow">Lễ tân</span></div></div><div class="teacherPopupGrid"><label>Họ tên<input id="editReceptionistName" class="input" value="${h(u.name||'')}"></label><label>Số điện thoại / tài khoản<input id="editReceptionistPhone" class="input" inputmode="tel" value="${h(u.phone||'')}"></label><label>Email<input id="editReceptionistEmail" class="input" type="email" value="${h(u.email||'')}"></label><label>Trạng thái<select id="editReceptionistStatus" class="input"><option value="active" ${u.status!=='inactive'?'selected':''}>Đang hoạt động</option><option value="inactive" ${u.status==='inactive'?'selected':''}>Tạm khóa</option></select></label></div><div data-staff-feedback class="staffModalFeedback" hidden></div></div><div class="staffModalFooter"><div><button id="deleteReceptionistBtn" class="btn ghost dangerMini" onclick="deleteReceptionistAccount('${u.id}',this)">Xóa Lễ tân</button></div><div><button class="btn ghost" onclick="closeModal()">Đóng</button><button id="resetReceptionistPasswordBtn" class="btn ghost" onclick="resetUserPassword('${u.id}',this)">Reset mật khẩu</button><button id="saveReceptionistDetailBtn" class="btn primary" onclick="saveReceptionistDetail('${u.id}')">Lưu thông tin</button></div></div></div>`)
    }

    async function saveReceptionistDetail(id){
      if(!isAdmin()) return;
      const u=(db.users||[]).find(x=>String(x.id)===String(id) && x.roles?.includes('receptionist'));
      if(!u){toast('Không tìm thấy tài khoản Lễ tân');return}
      v7hClearStaffErrors();
      const name=(document.getElementById('editReceptionistName')?.value||'').trim();
      const phone=normalizePhone(document.getElementById('editReceptionistPhone')?.value||'');
      const email=(document.getElementById('editReceptionistEmail')?.value||'').trim();
      const status=document.getElementById('editReceptionistStatus')?.value||'active';
      let valid=true;
      if(!name){v7hInlineFieldError('editReceptionistName','Nhập họ tên Lễ tân');valid=false}
      if(phone.length<8){v7hInlineFieldError('editReceptionistPhone','Số điện thoại/tài khoản chưa hợp lệ');valid=false}
      if(!v7hValidEmail(email)){v7hInlineFieldError('editReceptionistEmail','Email chưa đúng định dạng');valid=false}
      if(!valid){modalBackdrop.querySelector('.inputError')?.focus();return}
      const action=v7hBeginStaffAction(`save:receptionist:${id}`,document.getElementById('saveReceptionistDetailBtn'),'Đang lưu...');
      if(!action) return;
      try{
        const data=await officialFetch('/api/users',{method:'PATCH',body:JSON.stringify({id,name,phone,email,status,role:'receptionist'})});
        db.users=(db.users||[]).map(x=>String(x.id)===String(id)?data.user:x);
        v29PersistStaffMutation('receptionist-updated');
        v29RefreshStaffUi('receptionist',data.user);
        v7hPatchReceptionistModalHeader(data.user);
        v7hEndStaffAction(action);
        v7hMarkStaffModalClean();
        v7hStaffFeedback('Đã lưu thay đổi.','success');
      }catch(e){
        v7hEndStaffAction(action);
        v7hStaffFeedback(e.message||'Không lưu được tài khoản Lễ tân','error');
      }
    }

    async function deleteReceptionistAccount(userId,trigger=null){
      if(!isAdmin()){toast('Chỉ Admin được xóa tài khoản Lễ tân');return}
      const u=(db.users||[]).find(x=>String(x.id)===String(userId) && x.roles?.includes('receptionist'));
      if(!u){toast('Không tìm thấy tài khoản Lễ tân');return}
      const confirmed=await v7hConfirm({title:`Xóa Lễ tân ${u.name||u.phone}?`,message:'Tài khoản đăng nhập và các phiên hiện tại sẽ bị xóa. Dữ liệu lớp không bị ảnh hưởng.',confirmText:'Xóa Lễ tân',danger:true});
      if(!confirmed) return;
      const action=v7hBeginStaffAction(`delete:receptionist:${userId}`,trigger||document.getElementById('deleteReceptionistBtn'),'Đang xóa...');
      if(!action) return;
      try{
        await officialFetch('/api/users',{method:'DELETE',body:JSON.stringify({id:userId})});
        db.users=(db.users||[]).filter(x=>String(x.id)!==String(userId));
        v29PersistStaffMutation('receptionist-deleted');
        v29RefreshStaffUi('receptionist',null,{remove:true,id:userId});
        v7hEndStaffAction(action);
        closeModal(true);
        toast('Đã xóa Lễ tân');
      }catch(e){
        v7hEndStaffAction(action);
        v7hShowStaffError(e.message||'Không xóa được tài khoản Lễ tân');
      }
    }

    function openTeacherModal(){
      modal(`<div data-staff-modal="teacher-create" class="staffModalContent"><div class="modalHead"><h2>+ Tạo tài khoản giáo viên</h2><button class="close" onclick="closeModal()">×</button></div><div class="staffModalScroll"><div class="teacherDetailHeader compact"><div class="teacherAvatar">+</div><div><h3>Tạo nhân sự giảng dạy</h3><span class="mini">Mật khẩu tạm sẽ hiện sau khi tạo thành công.</span></div></div><div class="formGrid"><label>Họ tên<input id="teacherName" class="input" placeholder="VD: Ms Linh"></label><label>Số điện thoại / tài khoản<input id="teacherPhone" class="input" inputmode="tel" placeholder="VD: 0987654321"></label><label class="full">Email<input id="teacherEmail" class="input" type="email" placeholder="Không bắt buộc"></label></div><div class="teacherPermPanel"><b>Phân quyền</b>${roleChoiceMarkup('teacher','teacherRoleChoice',isAdmin())}</div><div data-staff-feedback class="staffModalFeedback" hidden></div></div><div class="staffModalFooter"><div></div><div><button class="btn ghost" onclick="closeModal()">Hủy</button><button id="saveTeacherFromModalBtn" class="btn primary" onclick="saveTeacherFromModal()">Tạo tài khoản</button></div></div></div>`)
    }

    async function saveTeacherFromModal(){
      v7hClearStaffErrors();
      const name=(document.getElementById('teacherName')?.value||'').trim();
      const phone=normalizePhone(document.getElementById('teacherPhone')?.value||'');
      const email=(document.getElementById('teacherEmail')?.value||'').trim();
      let role=selectedTeacherRole('teacherRoleChoice','teacher');
      if(!isAdmin() && role==='admin') role='manager';
      let valid=true;
      if(!name){v7hInlineFieldError('teacherName','Nhập họ tên');valid=false}
      if(phone.length<8){v7hInlineFieldError('teacherPhone','Số điện thoại/tài khoản chưa hợp lệ');valid=false}
      if(!v7hValidEmail(email)){v7hInlineFieldError('teacherEmail','Email chưa đúng định dạng');valid=false}
      if(!valid){modalBackdrop.querySelector('.inputError')?.focus();return}
      const action=v7hBeginStaffAction('create:teacher',document.getElementById('saveTeacherFromModalBtn'),'Đang tạo...');
      if(!action) return;
      try{
        const data=await officialFetch('/api/teachers',{method:'POST',body:JSON.stringify({name,phone,email,role})});
        db.teachers=db.teachers.filter(t=>t.id!==data.teacher.id);
        db.teachers.push(data.teacher);
        v29PersistStaffMutation('teacher-created');
        v29RefreshStaffUi('teacher',data.teacher);
        v7hEndStaffAction(action);
        showTempPasswordModal('Đã tạo tài khoản',data.teacher.phone,data.tempPassword,'close');
      }catch(e){
        v7hEndStaffAction(action);
        v7hStaffFeedback(e.message||'Không tạo được giáo viên','error');
      }
    }

    function openTeacherDetail(id){
      if(!canManageOperations()) return;
      const t=teacherById(id); if(!t?.id) return;
      const role=teacherRoleValue(t);
      modal(`<div data-staff-modal="teacher" data-staff-id="${t.id}" class="staffModalContent"><div class="modalHead"><h2>Thông tin giáo viên</h2><button class="close" onclick="closeModal()">×</button></div><div class="staffModalScroll"><div class="teacherDetailHeader compact"><div data-staff-header-avatar class="teacherAvatar">${(t.name||'T').split(' ').slice(-1)[0][0]||'T'}</div><div><h3 data-staff-header-name>${h(t.name||'')}</h3><p class="mini">Tài khoản: <b data-staff-header-account>${h(t.phone||'-')}</b></p><span data-staff-header-role class="pill ${teacherRoleClasses(t)}">${teacherRoleLabel(t)}</span></div></div><div class="teacherPopupGrid"><label>Họ tên<input id="editTeacherName" class="input" value="${h(t.name||'')}"></label><label>Số điện thoại / tài khoản<input id="editTeacherPhone" class="input" inputmode="tel" value="${h(t.phone||'')}"></label><label>Email<input id="editTeacherEmail" class="input" type="email" value="${h(t.email||'')}"></label><label>Trạng thái<select id="editTeacherStatus" class="input"><option value="active" ${t.status!=='inactive'?'selected':''}>Đang hoạt động</option><option value="inactive" ${t.status==='inactive'?'selected':''}>Tạm khóa</option></select></label></div><div class="teacherPermPanel"><b>Phân quyền</b>${roleChoiceMarkup(role,'editTeacherRoleChoice',isAdmin())}</div>${v7hTeacherClassPanelMarkup(t)}<div data-staff-feedback class="staffModalFeedback" hidden></div></div><div class="staffModalFooter"><div><button id="deleteTeacherBtn" class="btn ghost dangerMini" onclick="deleteTeacher('${t.id}',this)">Xóa giáo viên</button></div><div><button class="btn ghost" onclick="closeModal()">Đóng</button><button id="resetTeacherPasswordBtn" class="btn ghost" onclick="resetTeacherPassword('${t.id}',this)">Reset mật khẩu</button><button id="saveTeacherDetailBtn" class="btn primary" onclick="saveTeacherDetail('${t.id}')">Lưu thông tin</button></div></div></div>`)
    }

    async function saveTeacherDetail(id){
      if(!canManageOperations()) return;
      const t=teacherById(id); if(!t?.id) return;
      v7hClearStaffErrors();
      const name=(document.getElementById('editTeacherName')?.value||'').trim();
      const phone=normalizePhone(document.getElementById('editTeacherPhone')?.value||'');
      const email=(document.getElementById('editTeacherEmail')?.value||'').trim();
      const status=document.getElementById('editTeacherStatus')?.value||'active';
      let role=selectedTeacherRole('editTeacherRoleChoice',teacherRoleValue(t));
      if(!isAdmin() && role==='admin') role='manager';
      let valid=true;
      if(!name){v7hInlineFieldError('editTeacherName','Nhập họ tên');valid=false}
      if(phone.length<8){v7hInlineFieldError('editTeacherPhone','Số điện thoại/tài khoản chưa hợp lệ');valid=false}
      if(!v7hValidEmail(email)){v7hInlineFieldError('editTeacherEmail','Email chưa đúng định dạng');valid=false}
      if(!valid){modalBackdrop.querySelector('.inputError')?.focus();return}
      const action=v7hBeginStaffAction(`save:teacher:${id}`,document.getElementById('saveTeacherDetailBtn'),'Đang lưu...');
      if(!action) return;
      try{
        const data=await officialFetch('/api/teachers',{method:'PATCH',body:JSON.stringify({id,name,phone,email,status,role})});
        db.teachers=db.teachers.map(x=>x.id===id?data.teacher:x);
        db.classes.forEach(c=>{if(c.teacherId===id){c.teacher=data.teacher.name};if(c.taId===id){c.ta=data.teacher.name}});
        v29PersistStaffMutation('teacher-updated');
        v20bAfterMutation(['core'],{delayMs:5000,renderOnRevalidate:false});
        v29RefreshStaffUi('teacher',data.teacher);
        v7hPatchTeacherModalHeader(data.teacher);
        v7hEndStaffAction(action);
        v7hPatchTeacherClassPanel(id);
        v7hMarkStaffModalClean();
        v7hStaffFeedback('Đã lưu thay đổi.','success');
      }catch(e){
        v7hEndStaffAction(action);
        v7hStaffFeedback(e.message||'Không lưu được giáo viên','error');
      }
    }

    async function resetTeacherPassword(teacherId,trigger=null){
      const t=teacherById(teacherId); if(!t?.id) return;
      if(v7hStaffModalDirty()){v7hStaffFeedback('Hãy lưu hoặc bỏ thay đổi trước khi reset mật khẩu.','error');return}
      const action=v7hBeginStaffAction(`reset:teacher:${teacherId}`,trigger||document.getElementById('resetTeacherPasswordBtn'),'Đang reset...');
      if(!action) return;
      try{
        const data=await officialFetch(`/api/teachers/${teacherId}/reset-password`,{method:'POST',body:'{}'});
        v7hEndStaffAction(action);
        showTempPasswordModal('Đã reset mật khẩu',data.phone||t.phone,data.tempPassword,'close');
      }catch(e){
        v7hEndStaffAction(action);
        v7hShowStaffError(e.message||'Không reset được mật khẩu');
      }
    }

    async function assignTeacherToClass(teacherId,classId,assignmentRole='teacher',trigger=null){
      if(!canManageOperations()) return;
      const t=teacherById(teacherId),c=classById(classId);
      if(!t?.id||!c?.id) return;
      if(v7hIsTutoringClass(c)){v7hStaffFeedback('Lớp học kèm không được quản lý trong popup nhân sự.','error');return}
      if(isClassEnded(c)){v7hStaffFeedback('Lớp đã kết thúc, không thể gán.','error');return}
      if(assignmentRole==='ta'&&String(c.teacherId||'')===String(teacherId)){v7hStaffFeedback('Một người không thể vừa là giáo viên chính vừa là TA của cùng lớp.','error');return}
      if(assignmentRole!=='ta'&&String(c.taId||'')===String(teacherId)){v7hStaffFeedback('Một người không thể vừa là giáo viên chính vừa là TA của cùng lớp.','error');return}
      const action=v7hBeginStaffAction(`assign:${teacherId}:${classId}:${assignmentRole}`,trigger||document.getElementById('assignTeacherClassBtn'),'Đang gán...');
      if(!action) return;
      try{
        await officialFetch(`/api/teachers/${teacherId}/classes`,{method:'POST',body:JSON.stringify({classId,action:'assign',assignmentRole})});
        if(assignmentRole==='ta'){c.ta=t.name;c.taId=t.id}else{c.teacher=t.name;c.teacherId=t.id}
        v29PersistStaffMutation('teacher-class-assigned');
        v20bAfterMutation(['core'],{delayMs:5000,renderOnRevalidate:false});
        v29RefreshStaffUi('teacher',t);
        v7hEndStaffAction(action);
        v7hPatchTeacherClassPanel(teacherId);
        v7hStaffFeedback(`Đã gán vào ${c.name}.`,'success');
      }catch(e){
        v7hEndStaffAction(action);
        v7hStaffFeedback(e.message||'Không gán được lớp','error');
      }
    }

    async function removeTeacherFromClass(teacherId,classId,assignmentRole='teacher',trigger=null){
      if(!canManageOperations()) return;
      const c=classById(classId),t=teacherById(teacherId);if(!c?.id||!t?.id) return;
      if(isClassEnded(c)){v7hStaffFeedback('Lớp đã kết thúc, không thể bỏ gán.','error');return}
      const action=v7hBeginStaffAction(`remove:${teacherId}:${classId}:${assignmentRole}`,trigger,'Đang bỏ gán...');
      if(!action) return;
      try{
        await officialFetch(`/api/teachers/${teacherId}/classes`,{method:'POST',body:JSON.stringify({classId,action:'remove',assignmentRole})});
        if(assignmentRole==='ta'&&(c.taId===teacherId||c.ta===t.name)){c.ta='';c.taId=null}
        if(assignmentRole!=='ta'&&(c.teacherId===teacherId||c.teacher===t.name)){c.teacher='';c.teacherId=null}
        v29PersistStaffMutation('teacher-class-removed');
        v20bAfterMutation(['core'],{delayMs:5000,renderOnRevalidate:false});
        v29RefreshStaffUi('teacher',t);
        v7hEndStaffAction(action);
        v7hPatchTeacherClassPanel(teacherId);
        v7hStaffFeedback(`Đã bỏ gán khỏi ${c.name}.`,'success');
      }catch(e){
        v7hEndStaffAction(action);
        v7hStaffFeedback(e.message||'Không bỏ gán được lớp','error');
      }
    }

    async function deleteTeacher(teacherId,trigger=null){
      if(!canManageOperations()) return;
      const t=teacherById(teacherId);if(!t?.id) return;
      const cls=classesOfTeacher(t);
      const ended=cls.filter(isClassEnded);
      if(ended.length){v7hShowStaffError('Không thể xóa nhân sự đang nằm trong lớp đã kết thúc.');return}
      const confirmed=await v7hConfirm({title:`Xóa ${t.name}?`,message:`Tài khoản đăng nhập sẽ bị xóa. ${cls.length} lớp đang học sẽ được bỏ phân công.`,confirmText:'Xóa giáo viên',danger:true});
      if(!confirmed) return;
      const action=v7hBeginStaffAction(`delete:teacher:${teacherId}`,trigger||document.getElementById('deleteTeacherBtn'),'Đang xóa...');
      if(!action) return;
      try{
        await officialFetch('/api/teachers',{method:'DELETE',body:JSON.stringify({id:teacherId})});
        db.teachers=db.teachers.filter(x=>x.id!==teacherId);
        db.users=(db.users||[]).filter(u=>normalizePhone(u.phone)!==normalizePhone(t.phone));
        db.classes.forEach(c=>{if(c.teacherId===teacherId||c.teacher===t.name){c.teacher='';c.teacherId=null};if(c.taId===teacherId||c.ta===t.name){c.ta='';c.taId=null}});
        v29PersistStaffMutation('teacher-deleted');
        v20bAfterMutation(['core'],{delayMs:5000,renderOnRevalidate:false});
        v29RefreshStaffUi('teacher',null,{remove:true,id:teacherId});
        v7hEndStaffAction(action);
        closeModal(true);
        toast('Đã xóa giáo viên');
      }catch(e){
        v7hEndStaffAction(action);
        v7hShowStaffError(e.message||'Không xóa được giáo viên');
      }
    }
