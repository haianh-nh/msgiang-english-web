window.MSGIANG_BUILD_VERSION='20phase8d4-12-library-all-fast-loading';
const SEED = {
      classes: [],
      teachers: [],
      users: [],
      assignments: [],
      submissions: [],
      attendance: [],
      evaluations: [],
      settings: {unitPrice:70000,capacity:15,evaluationFilter:{month:new Date().toISOString().slice(0,7)}}
    };
    const fmt = new Intl.NumberFormat('vi-VN');
    const V18H_LOCAL_STATE_VERSION=1;
    function v18hCompactDbSnapshot(source=db){
      const s=source||{};
      const settings=s.settings||{};
      const billingAllowed=!!(currentUser?.roles||[]).some(r=>r==='admin'||r==='manager');
      const compactSettings={
        capacity:Number(settings.capacity||15),
        weekStart:settings.weekStart||null,
        evaluationFilter:settings.evaluationFilter||{month:new Date().toISOString().slice(0,7)}
      };
      if(billingAllowed){
        compactSettings.unitPrice=Number(settings.unitPrice||70000);
        const savedTuitionFilter=settings.tuitionFilter||{};
        // Search text is session-only. Never restore it after a browser reload.
        compactSettings.tuitionFilter={
          q:'',
          status:savedTuitionFilter.status||'all',
          month:savedTuitionFilter.month||new Date().toISOString().slice(0,7)
        };
      }
      return {
        _v18hCompact:true,
        _v18hVersion:V18H_LOCAL_STATE_VERSION,
        savedAt:Date.now(),
        settings:compactSettings,
        managerClassScope:s.managerClassScope||'mine',
                libraryTab:'all',
        libraryQ:'',
        libraryLevel:'all',
        librarySkill:'all',
        libraryUnit:'all'
      };
    }
    function v18hResetPersistedTuitionSearch(settings){
      const next={...(settings||{})};
      if(next.tuitionFilter){
        next.tuitionFilter={
          ...next.tuitionFilter,
          q:'',
          status:next.tuitionFilter.status||'all',
          month:next.tuitionFilter.month||new Date().toISOString().slice(0,7)
        };
      }
      return next;
    }
    function v18hMergeLocalDb(raw){
      const base=JSON.parse(JSON.stringify(SEED));
      if(!raw || typeof raw!=='object') return base;
      if(raw._v18hCompact){
        base.settings={...(base.settings||{}),...v18hResetPersistedTuitionSearch(raw.settings||{})};
        if(raw.managerClassScope!==undefined) base.managerClassScope=raw.managerClassScope;
        base.libraryTab='all'; base.libraryQ=''; base.libraryLevel='all'; base.librarySkill='all'; base.libraryUnit='all';
        return base;
      }
      // Snapshot cũ/full: dùng được cho phiên hiện tại, nhưng bộ lọc tìm kiếm Học phí luôn bắt đầu trống.
      return {...base,...raw,libraryTab:'all',libraryQ:'',libraryLevel:'all',librarySkill:'all',libraryUnit:'all',settings:{...(base.settings||{}),...v18hResetPersistedTuitionSearch(raw.settings||{})}};
    }
    function v18hLoadLocalDb(){
      try{return v18hMergeLocalDb(JSON.parse(localStorage.getItem('msgiang_v48_data')||'null'))}
      catch(e){return JSON.parse(JSON.stringify(SEED))}
    }
    let v20eLocalSaveTimer=null;
    let v20ePendingLocalJson='';
    let v20eLastLocalJson='';
    function v20eCompactLocalJson(){
      return JSON.stringify(v18hCompactDbSnapshot(db));
    }
    function v20eCommitLocalJson(json){
      if(!json || json===v20eLastLocalJson) return false;
      try{
        localStorage.setItem('msgiang_v48_data', json);
        v20eLastLocalJson=json;
        return true;
      }catch(e){
        console.warn('Local compact save failed',e);
        return false;
      }
    }
    function v18hSaveCompactLocalDb(options={}){
      const immediate=options.immediate!==false;
      let json='';
      try{json=v20eCompactLocalJson()}catch(e){console.warn('Local compact serialize failed',e); return false}
      if(json===v20eLastLocalJson || json===v20ePendingLocalJson) return false;
      if(immediate){
        clearTimeout(v20eLocalSaveTimer);
        v20ePendingLocalJson='';
        return v20eCommitLocalJson(json);
      }
      v20ePendingLocalJson=json;
      clearTimeout(v20eLocalSaveTimer);
      v20eLocalSaveTimer=setTimeout(()=>{
        const pending=v20ePendingLocalJson;
        v20ePendingLocalJson='';
        v20eCommitLocalJson(pending);
      },650);
      return true;
    }
    function v20eFlushLocalSave(){
      clearTimeout(v20eLocalSaveTimer);
      if(v20ePendingLocalJson){
        const pending=v20ePendingLocalJson;
        v20ePendingLocalJson='';
        v20eCommitLocalJson(pending);
      }
    }
    function v18hStorageBytesForKey(key){
      try{return new Blob([localStorage.getItem(key)||'']).size}catch(e){return 0}
    }
    function v18hCleanupLegacyStorage(){
      try{
        // Chỉ dọn key nội bộ cũ của app, không đụng key ngoài hệ thống.
        const keep=new Set(['msgiang_v48_data','msgiang_v48_route',moduleCacheUserKey()]);
        Object.keys(localStorage).forEach(k=>{
          if(/^msgiang_module_cache_v1[0-4]_/.test(k)) localStorage.removeItem(k);
          if(k.startsWith('msgiang_module_cache_v15_') && !keep.has(k)){
            const raw=localStorage.getItem(k);
            if(!raw || raw.length<4) localStorage.removeItem(k);
          }
        });
        const raw=localStorage.getItem('msgiang_v48_data');
        if(raw && raw.length>180000) v18hSaveCompactLocalDb();
      }catch(e){console.warn('Local cleanup skipped',e)}
    }
    let db = v18hLoadLocalDb();
    let currentUser = null;
    let route = localStorage.getItem('msgiang_v48_route') || 'overview';
    if(route==='notifications') route='overview';
    let notifOpen = false;
    const root = document.getElementById('root');
    const modalBackdrop = document.getElementById('modalBackdrop');
    let officialSaveTimer=null;
    let suppressLocalSave=false;
    let v18PerfVersion=0;
    let v18LocalSaveTimer=null;
    let v18LocalSaveIdleHandle=null;
    const v18Memo={index:null,indexKey:'',billingKey:'',billingRows:null,weekKey:'',weekSessions:null,rosterKey:'',rosterRows:null};
    function v18Touch(){
      v18PerfVersion++;
      v18Memo.billingKey='';
      v18Memo.weekKey='';
      v18Memo.rosterKey='';
      v18Memo.indexKey='';
      if(v18Memo.scheduleCellMap) v18Memo.scheduleCellMap.key='';
      if(v18Memo.scheduleDayMap) v18Memo.scheduleDayMap.key='';
    }
    function v18FastKey(){
      return [
        v18PerfVersion,
        currentUser?.id||currentUser?.phone||'',
        route,
        db.classes?.length||0,
        db.classMakeupSessions?.length||0,
        Object.keys(db.classCancellations||{}).length,
        Object.keys(db.attendanceSessions||{}).length,
        db.absenceRecords?.length||0,
        db.evaluations?.length||0,
        db.tuitionRollupMonth||'',
        Object.keys(db.payments||{}).length,
        Object.keys(db.tuitionMessages||{}).length,
        db.settings?.weekStart||'',
        db.settings?.tuitionFilter?.month||'',
        db.settings?.evaluationFilter?.month||''
      ].join('|');
    }
    function v18BuildIndex(){
      const key=v18FastKey()+'|index';
      if(v18Memo.index && v18Memo.indexKey===key) return v18Memo.index;
      const classMap=new Map();
      const studentMap=new Map();
      const students=[];
      (db.classes||[]).forEach(c=>{
        classMap.set(c.id,c);
        (c.students||[]).forEach(s=>{
          const row={...s,classId:c.id,className:c.name};
          students.push(row);
          studentMap.set(s.id,row);
        });
      });
      v18Memo.index={classMap,studentMap,students};
      v18Memo.indexKey=key;
      return v18Memo.index;
    }
    function v18CancelIdleLocalSave(){
      if(v18LocalSaveIdleHandle==null) return;
      if(typeof cancelIdleCallback==='function') cancelIdleCallback(v18LocalSaveIdleHandle);
      else clearTimeout(v18LocalSaveIdleHandle);
      v18LocalSaveIdleHandle=null;
    }
    function v18ScheduleLocalSave(){
      clearTimeout(v18LocalSaveTimer);
      v18CancelIdleLocalSave();
      v18LocalSaveTimer=setTimeout(()=>{
        const commit=()=>{
          v18LocalSaveIdleHandle=null;
          v18hSaveCompactLocalDb({immediate:false});
        };
        if(typeof requestIdleCallback==='function') v18LocalSaveIdleHandle=requestIdleCallback(commit,{timeout:1600});
        else v18LocalSaveIdleHandle=setTimeout(commit,0);
      },380);
    }
    // V19F.2: evaluation image layout expanded to avoid overlapping boxes.
    let v18bRenderTimer=null;
    const v18bTimers={};
    function v18bDebounce(key,fn,delay=220){
      clearTimeout(v18bTimers[key]);
      v18bTimers[key]=setTimeout(fn,delay);
    }
    function v18bRenderDebounced(key='render',delay=180){
      clearTimeout(v18bRenderTimer);
      v18bRenderTimer=setTimeout(()=>render(),delay);
    }
    function v18bSafeId(v){
      return String(v||'').replace(/[^a-zA-Z0-9_-]/g,'_');
    }
    function v18bSetLocalUiState(){
      v18Touch();
      v18ScheduleLocalSave();
    }
    function v18bUpdateAttendanceStatusUI(sessionKey,studentId,type,status){
      const id='attBtns_'+v18bSafeId(`${sessionKey}_${type}_${studentId}`);
      const wrap=document.getElementById(id);
      if(!wrap) return false;
      wrap.querySelectorAll('button').forEach(btn=>{
        btn.classList.toggle('active', btn.getAttribute('data-status')===status);
      });
      const saved=document.querySelector('.attSavedTag');
      if(saved) saved.textContent='Chưa lưu thay đổi';
      return true;
    }
    function smartNormalizeText(v){
      return String(v??'')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g,'')
        .replace(/đ/g,'d')
        .replace(/[^a-z0-9]+/g,' ')
        .replace(/\s+/g,' ')
        .trim();
    }
    function smartInitials(text){
      return smartNormalizeText(text).split(' ').filter(Boolean).map(t=>t[0]).join('');
    }
    function smartSearchIndex(...parts){
      const clean=smartNormalizeText(parts.filter(x=>x!==null&&x!==undefined).join(' '));
      const compact=clean.replace(/\s+/g,'');
      const initials=clean.split(' ').filter(Boolean).map(t=>t[0]).join('');
      return `${clean} ${compact} ${initials}`.trim();
    }
    function smartSubsequence(needle,haystack){
      needle=String(needle||''); haystack=String(haystack||'');
      if(needle.length<2 || haystack.length<needle.length) return false;
      let j=0;
      for(let i=0;i<haystack.length&&j<needle.length;i++) if(haystack[i]===needle[j]) j++;
      return j===needle.length;
    }
    function smartSearchMatch(index,query){
      const q=smartNormalizeText(query);
      if(!q) return true;
      const idx=String(index||'');
      const compactIdx=idx.replace(/\s+/g,'');
      const compactQ=q.replace(/\s+/g,'');
      if(idx.includes(q) || compactIdx.includes(compactQ)) return true;
      return q.split(' ').filter(Boolean).every(token=>idx.includes(token) || compactIdx.includes(token) || smartSubsequence(token,compactIdx));
    }
    function v18bUpdateClassListNow(){
      const list=document.getElementById('classList');
      if(!list) return;
      const q=document.getElementById('classSearch')?.value||'';
      const cls=sortClassesByGrade(classesForClassPage().filter(c=>smartSearchMatch(smartSearchIndex(c.name,c.teacher,c.ta,c.time,classGradeLabel(c.name),(c.students||[]).map(s=>s.name).join(' ')),q)));
      list.innerHTML=classSectionsMarkup(cls);
    }

    // Phase 7B: phản hồi cục bộ cho tab Lớp học.
    // Mọi mutation chỉ patch card/danh sách liên quan, giữ nguyên thanh tìm kiếm,
    // vị trí cuộn và app shell; dữ liệu server được đối chiếu ở nền.
    const V28_CLASS_REVALIDATE_DELAY_MS=5000;
    function v28InvalidateClassMarkupMemo(){
      v18Memo.classGroupsMarkup={};
      v18Memo.classSectionsMarkup={};
    }
    function v28ClassPageRows(){return sortClassesByGrade(classesForClassPage())}
    function v28UpdateClassSummaryCounts(){
      const rows=v28ClassPageRows();
      const active=rows.filter(c=>c.status!=='ended').length;
      const ended=rows.filter(c=>c.status==='ended').length;
      const students=rows.reduce((sum,c)=>sum+(c.students||[]).length,0);
      const activeEl=document.getElementById('classActiveCount');
      const endedEl=document.getElementById('classEndedCount');
      const studentEl=document.getElementById('classStudentCount');
      if(activeEl) activeEl.textContent=`${active} đang học`;
      if(endedEl) endedEl.textContent=`${ended} đã học`;
      if(studentEl) studentEl.textContent=`${students} học sinh`;
    }
    function v28ClassItemById(classId){
      return Array.from(document.querySelectorAll('[data-class-item]')).find(el=>String(el.dataset.classItem||'')===String(classId||''))||null;
    }
    function v28PatchClassCard(classId){
      if(route!=='classes') return false;
      const item=v28ClassItemById(classId);
      const c=classById(classId);
      if(!item||!c?.id) return false;
      item.innerHTML=classCard(c,0);
      v28UpdateClassSummaryCounts();
      return true;
    }
    function v28RefreshClassListScoped(options={}){
      if(route!=='classes') return false;
      const list=document.getElementById('classList');
      if(!list) return false;
      const classId=options.classId||'';
      const structural=!!options.structural;
      const searchValue=document.getElementById('classSearch')?.value||'';
      const scrollY=window.scrollY;
      v28InvalidateClassMarkupMemo();
      const patched=!structural && !searchValue && classId && v28PatchClassCard(classId);
      if(!patched){
        v18bUpdateClassListNow();
        v28UpdateClassSummaryCounts();
      }
      requestAnimationFrame(()=>{
        if(Math.abs(window.scrollY-scrollY)>2) window.scrollTo({top:scrollY,left:0,behavior:'auto'});
      });
      return true;
    }
    function v28BeginModalAction(button,savingText='Đang lưu...'){
      return window.MsUiAction.beginModalAction(button,savingText);
    }
    function v28EndModalAction(action){
      window.MsUiAction.endModalAction(action);
    }
    function v28AfterClassMutation(invalidateModules=[],options={}){
      const delayMs=Math.max(800,Number(options.delayMs||V28_CLASS_REVALIDATE_DELAY_MS));
      // Core đã được patch bằng response API nên lưu thẳng snapshot mới.
      v20bAfterMutation(['core'],{
        preserveCache:true,
        delayMs,
        renderOnRevalidate:false,
        classId:options.classId||''
      });
      const invalidate=v21NormalizeMutationModules(invalidateModules).filter(key=>key!=='core');
      if(invalidate.length){
        v20bAfterMutation(invalidate,{
          delayMs,
          renderOnRevalidate:false,
          classId:options.classId||'',
          month:options.month,
          months:options.months||[]
        });
      }
      const corePayload={classes:db.classes||[],teachers:db.teachers||[]};
      v18iHashPayload('classes:latest',corePayload);
      moduleCacheSet('classes:latest',corePayload);
      lazyRouteState.core={loaded:true,loading:false,loadedAt:Date.now(),mutated:true,sharedFresh:true};
      saveLocalOnly();
      v28RefreshClassListScoped({classId:options.classId,structural:!!options.structural});
    }
    function v28RecoverClassUi(classId='',structural=true){
      Promise.resolve(refreshOfficialClasses({skipSave:true,forceNetwork:true}))
        .then(()=>{
          saveLocalOnly();
          v28RefreshClassListScoped({classId,structural});
        })
        .catch(error=>console.warn('Không đối chiếu lại được danh sách lớp',error));
    }
    let v18dShellKey='';
    function v18dSafeAttr(v){return String(v||'').replace(/"/g,'&quot;')}
    function v18dShellKeyFor(nav){
      return [
        currentUser?.id||currentUser?.phone||'',
        roleLabel(),
        nav.map(n=>n[0]).join(','),
        currentUser?.mustChangePassword?'force':'normal'
      ].join('|');
    }
    function v18dNavMarkup(nav){
      return nav.map(n=>`<button data-route="${v18dSafeAttr(n[0])}" class="${route===n[0]?'active':''}" onclick="go('${n[0]}')"><span class="ico">${n[1]}</span>${n[2]}</button>`).join('');
    }
    function v18dBottomNavMarkup(nav){
      return nav.slice(0,5).map(n=>`<button data-route="${v18dSafeAttr(n[0])}" class="${route===n[0]?'active':''}" onclick="go('${n[0]}')"><span>${n[1]}</span>${n[2].split(' ')[0]}</button>`).join('');
    }
    function v18dSyncActiveNav(){
      document.querySelectorAll('[data-route]').forEach(btn=>{
        btn.classList.toggle('active', btn.getAttribute('data-route')===route);
      });
    }
    function v20dSetPageHtml(pageEl,html){
      if(!pageEl) return false;
      const next=String(html||'');
      if(pageEl.__v20dLastHtml===next || pageEl.innerHTML===next){
        pageEl.__v20dLastHtml=next;
        return false;
      }
      pageEl.__v20dLastHtml=next;
      pageEl.innerHTML=next;
      pageEl.classList.remove('v20dPageReady');
      requestAnimationFrame(()=>pageEl.classList.add('v20dPageReady'));
      return true;
    }
    function v18dRenderPageOnly(nav){
      const pageEl=document.getElementById('appPage');
      if(!pageEl) return false;
      v20dSetPageHtml(pageEl,page());
      v18dSyncActiveNav();
      return true;
    }
    function v7iRenderActiveRoute(options={}){
      if(!currentUser || currentUser.mustChangePassword) return false;
      // Use the narrowest existing patcher first. Fall back to replacing only
      // #appPage, never the sidebar/topbar shell, for runtime refreshes.
      if(route==='tuition' && typeof v7fPatchTuitionVisibleDom==='function'){
        try{if(v7fPatchTuitionVisibleDom()) return true}catch(e){console.warn('Tuition DOM patch failed',e)}
      }
      if(route==='evaluation' && typeof evaluationRenderGroupsDom==='function'){
        try{if(evaluationRenderGroupsDom()) return true}catch(e){console.warn('Evaluation DOM patch failed',e)}
      }
      return v18dRenderPageOnly(navItems());
    }
    function v7iActiveRouteRealtimeStale(){
      const key=routeDataKey(route);
      return !!lazyRouteState[key]?.realtimeStale;
    }
    function v7iResumeDeferredWork(){
      if(!currentUser || currentUser.mustChangePassword) return;
      if(v21MutationRefreshState.pending) v24aArmMutationRefresh();
      if(v27Realtime.pendingModules.size) v27ArmRealtimeFlush(80);
      else if(v7iActiveRouteRealtimeStale()){
        const key=routeDataKey(route);
        v21ScheduleMutationRefresh([key],{delayMs:80,force:true,renderOnRevalidate:true});
      }
    }
    function v18eRowsSignature(rows, fields='default'){
      return `${v18FastKey()}|${fields}|${(rows||[]).length}|${(rows||[]).map(r=>{
        const st=r.student||r;
        return [r.id,st.id,st.name,r.className,r.status,r.amount,r.currentAmount,r.previousDebt,r.materialFee,r.materialNote,r.plannedSessions,r.unitPrice,r.tuitionAmount,r.adjustmentAmount,r.creditAmount,r.paid?1:0,r.sent?1:0].filter(v=>v!==undefined&&v!==null).join(':');
      }).join(',')}`;
    }
    function dayKeyFromDateText(dateText){
      // Date inputs/session keys are Vietnam calendar dates (YYYY-MM-DD).
      // Use UTC calendar math to avoid browser/server timezone shifting the weekday.
      const m=String(dateText||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if(!m) return '';
      const d=new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3])));
      return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()]||'';
    }
    function scheduleDisplayDayKey(s){return dayKeyFromDateText(s?.date)||s?.day||'Mon'}
    function v18eScheduleCellMap(sessions){
      const key=v18FastKey()+'|scheduleCellMap|'+(sessions||[]).map(s=>`${s.classId}:${scheduleDisplayDayKey(s)}:${s.slot}:${s.type}:${s.date}`).join(',');
      v18Memo.scheduleCellMap ||= {};
      if(v18Memo.scheduleCellMap.key===key) return v18Memo.scheduleCellMap.map;
      const map=new Map();
      (sessions||[]).forEach(s=>{
        const cellKey=`${s.slot}|${scheduleDisplayDayKey(s)}`;
        if(!map.has(cellKey)) map.set(cellKey,[]);
        map.get(cellKey).push(s);
      });
      v18Memo.scheduleCellMap={key,map};
      return map;
    }
    function v18eScheduleDayMap(sessions){
      const key=v18FastKey()+'|scheduleDayMap|'+(sessions||[]).map(s=>`${s.classId}:${scheduleDisplayDayKey(s)}:${s.start}:${s.type}:${s.date}`).join(',');
      v18Memo.scheduleDayMap ||= {};
      if(v18Memo.scheduleDayMap.key===key) return v18Memo.scheduleDayMap.map;
      const map=new Map();
      (sessions||[]).forEach(s=>{
        const day=scheduleDisplayDayKey(s);
        if(!map.has(day)) map.set(day,[]);
        map.get(day).push(s);
      });
      map.forEach(rows=>rows.sort((a,b)=>a.start.localeCompare(b.start)));
      v18Memo.scheduleDayMap={key,map};
      return map;
    }
    function v8bScheduleElements(attribute,sessionKey){
      return Array.from(document.querySelectorAll(`[${attribute}]`)).filter(el=>String(el.getAttribute(attribute)||'')===String(sessionKey||''));
    }
    function v8bUpdateScheduleLegend(){
      if(route!=='schedule') return;
      const counts=scheduleCounts();
      const values={done:`Đã dạy: ${counts.done}`,live:`Đang dạy: ${counts.live}`,todo:`Chưa dạy: ${counts.todo}`,cancelled:`Nghỉ: ${counts.cancelled||0}`,classes:`${classesForUser().length} lớp`};
      Object.entries(values).forEach(([key,value])=>{
        const el=document.querySelector(`[data-schedule-count="${key}"]`);
        if(el) el.textContent=value;
      });
    }
    function v8bPatchScheduleSessions(sessionKeys=[]){
      if(route!=='schedule' || typeof lessonCard!=='function') return false;
      const keys=[...new Set((Array.isArray(sessionKeys)?sessionKeys:[sessionKeys]).filter(Boolean).map(String))];
      let patched=0;
      keys.forEach(key=>{
        const session=sessionObjectFromKey(key);
        if(!session) return;
        v8bScheduleElements('data-schedule-session',key).forEach(el=>{
          el.outerHTML=lessonCard(session,0,true);
          patched++;
        });
        if(typeof mobileScheduleLesson==='function'){
          v8bScheduleElements('data-mobile-schedule-session',key).forEach(el=>{
            el.outerHTML=mobileScheduleLesson(session);
            patched++;
          });
        }
      });
      if(patched) v8bUpdateScheduleLegend();
      return patched>0;
    }

    function v18fUpdateScheduleModuleCache(){
      db.classMakeupSessions=v20bMergeClassMakeupSessions([],db.classMakeupSessions||[]);
      v20b7MergeClassSnapshotsFromMakeups(db.classMakeupSessions);
      const week=isoDate(weekStartDate());
      const bundle=v26WeekBundleFromDb(week,{keepExistingAttendance:true,source:'local-schedule'});
      moduleCacheSet(`schedule:${week}`,bundle.schedule);
      v26StoreSet(v26WeekStoreKey(week),bundle,{source:'local-schedule'});
    }
    function v18fUpdateAttendanceModuleCache(){
      const week=isoDate(weekStartDate());
      const bundle=v26WeekBundleFromDb(week,{keepExistingAttendance:false,source:'local-attendance'});
      moduleCacheSet(`attendance:${week}`,bundle.attendance);
      v26StoreSet(v26WeekStoreKey(week),bundle,{source:'local-attendance'});
    }
    function v18fUpdateMakeupModuleCache(){
      const month=makeupSelectedMonthKey();
      const st=(db.makeupTabState && db.makeupTabState.month===month) ? db.makeupTabState : null;
      const payload={
        makeupMonth: month,
        makeupPlans: st?.makeupPlans || db.makeupPlans || [],
        absenceRecords: st?.absenceRecords || db.absenceRecords || [],
        attendanceSessions: st?.attendanceSessions || db.attendanceSessions || {},
        supportClasses: st?.supportClasses || [],
        deletedMonths: db.deletedMakeupMonths || [],
        availableMonths: db.makeupAvailableMonths || [],
        pendingScope: st?.pendingScope || ''
      };
      moduleCacheSet(makeupModuleCacheKey(month), payload);
      v26StoreSet(v26MakeupStoreKey(month),payload,{source:'local-makeup'});
    }
    function v18fUpdateTuitionModuleCache(){
      const payload={
        tuitionRollup: db.tuitionRollup || {},
        tuitionRollupMonth: db.tuitionRollupMonth || tuitionMonthKey(),
        payments: db.payments || {},
        tuitionMessages: db.tuitionMessages || {},
        unitPrice: db.settings?.unitPrice || 70000
      };
      moduleCacheSet(`tuition:${tuitionMonthKey()}`, payload);
      v26StoreSet(v26TuitionStoreKey(),payload,{source:'local-tuition'});
    }
    function v18fUpdateLibraryModuleCache(){
      const payload={exerciseLibrary:db.exerciseLibrary||[]};
      moduleCacheSet('library:latest',payload);
      v26StoreSet(v26StoreKey('library','latest'),payload,{source:'local-library'});
    }
    function v18fUpdateEvaluationModuleCache(){
      const currentMonth=evaluationMonthKey();
      const payload={evaluations:(db.evaluations||[]).filter(e=>normalizeEvaluationMonthValue(e.monthKey||e.month)===currentMonth)};
      moduleCacheSet(`evaluation:${currentMonth}`,payload);
      v26StoreSet(v26EvaluationStoreKey(currentMonth),payload,{source:'local-evaluation'});
    }

    function v20bNormalizeMutationKey(key){
      if(key==='classes'||key==='class') return 'core';
      if(key==='teacher'||key==='teachers'||key==='settings') return 'teachers';
      if(key==='homework'||key==='library') return 'library';
      return key;
    }
    function v20bMarkLoaded(key){
      lazyRouteState[key]={loaded:true,loading:false,loadedAt:Date.now(),mutated:true};
    }
    function v21MutationMonths(options={}){
      const months=new Set();
      const addMonth=v=>{const m=String(v||'').trim(); if(/^\d{4}-\d{2}$/.test(m)) months.add(m);};
      const addSession=v=>{const m=sessionKeyMonth(String(v||'')); if(m) months.add(m);};
      addMonth(options.month);
      (options.months||[]).forEach(addMonth);
      addSession(options.sessionKey);
      addSession(options.targetSessionKey);
      addSession(options.sourceSessionKey);
      (options.sessionKeys||[]).forEach(addSession);
      if(options.plan){addSession(options.plan.targetSessionKey);addSession(options.plan.sourceSessionKey)}
      if(options.record){addSession(options.record.sourceSessionKey)}
      addMonth(makeupSelectedMonthKey());
      return Array.from(months);
    }
    function v21NormalizeMutationModules(keys=[]){
      const modules=Array.from(new Set((Array.isArray(keys)?keys:[keys]).filter(Boolean).map(v20bNormalizeMutationKey)));
      const billingAllowed=!!(currentUser?.roles||[]).some(r=>r==='admin'||r==='manager');
      return billingAllowed?modules:modules.filter(key=>key!=='tuition');
    }
    function v21InvalidateMutationCaches(keys=[],options={}){
      const modules=v21NormalizeMutationModules(keys);
      v26InvalidateSharedStoreForModules(modules,options);
      const weekKey=isoDate(weekStartDate());
      const months=v21MutationMonths(options);
      v18gClearNetworkCache();
      modules.forEach(key=>{
        if(key==='core'){
          moduleCacheRemove('classes:latest');
          lazyRouteState.core={};
        }else if(key==='teachers'){
          moduleCacheRemove('teachers:latest');
          lazyRouteState.teachers={};
        }else if(key==='schedule'){
          moduleCacheRemove(`schedule:${weekKey}`);
          lazyRouteState.schedule={};
          v18Memo.weekKey='';
          v18Memo.weekSessions=null;
        }else if(key==='attendance'){
          moduleCacheRemove(`attendance:${weekKey}`);
          lazyRouteState.attendance={};
          v18Memo.rosterKey='';
          v18Memo.rosterRows=null;
        }else if(key==='makeup'){
          months.forEach(m=>{
            moduleCacheRemove(makeupModuleCacheKey(m));
            v22InvalidateMakeupMonthMemory(m);
          });
          lazyRouteState.makeup={};
        }else if(key==='tuition'){
          moduleCacheRemove(`tuition:${tuitionMonthKey()}`);
          lazyRouteState.tuition={};
        }else if(key==='library'){
          moduleCacheRemove('library:latest');
          lazyRouteState.library={};
        }else if(key==='evaluation'){
          moduleCacheRemove(`evaluation:${evaluationMonthKey()}`);
          lazyRouteState.evaluation={};
        }
      });
    }
    function v20bUpdateCacheForKey(key){
      // Sau mutation, cache cũ dễ làm Lịch dạy/Học bù/Điểm danh hiển thị lệch.
      // Không ghi cache từ state tạm; chỉ invalidate đúng phạm vi để refresh manager tải lại dữ liệu thật.
      v21InvalidateMutationCaches([key]);
    }

    const v21MutationRefreshState={timer:null,pending:null,running:false};
    function v21MergeMutationContext(base={},next={}){
      const merged={...(base||{})};
      merged.modules=v21NormalizeMutationModules([...(merged.modules||[]),...(next.modules||[])]);
      merged.months=Array.from(new Set([...(merged.months||[]),...v21MutationMonths(next)]));
      ['sessionKey','targetSessionKey','sourceSessionKey'].forEach(k=>{if(next[k]) merged[k]=next[k]});
      merged.sessionKeys=Array.from(new Set([...(merged.sessionKeys||[]),...(next.sessionKeys||[]),next.sessionKey,next.targetSessionKey,next.sourceSessionKey].filter(Boolean)));
      merged.force=!!(merged.force||next.force);
      merged.applyMakeupGlobal=!!(merged.applyMakeupGlobal||next.applyMakeupGlobal);
      merged.preserveCache=!!(merged.preserveCache||next.preserveCache);
      // Phase 4A: mọi mutation liên tiếp dùng cùng một mốc refresh trailing.
      // Mốc xa nhất thắng để không khởi chạy schedule/state giữa lúc giáo viên còn thao tác.
      merged.revalidateAt=Math.max(Number(merged.revalidateAt||0),Number(next.revalidateAt||0));
      if(next.renderOnRevalidate===false) merged.renderOnRevalidate=false;
      else if(merged.renderOnRevalidate===undefined) merged.renderOnRevalidate=true;
      return merged;
    }
    function v24aArmMutationRefresh(){
      clearTimeout(v21MutationRefreshState.timer);
      v21MutationRefreshState.timer=null;
      if(!v21MutationRefreshState.pending || !currentUser) return;
      // Phase 7I: do not spend network/CPU while the tab is hidden. Keep the
      // merged context and run exactly one trailing refresh when the tab returns.
      if(document.visibilityState==='hidden') return;
      const runAt=Number(v21MutationRefreshState.pending.revalidateAt||Date.now());
      const waitMs=Math.max(0,runAt-Date.now());
      v21MutationRefreshState.timer=setTimeout(()=>{
        v21MutationRefreshState.timer=null;
        v21RunMutationRefresh().catch(e=>console.warn('Mutation refresh failed',e));
      },waitMs);
    }
    function v21ScheduleMutationRefresh(keys=[],options={}){
      if(!currentUser || options.noRefresh) return Promise.resolve(false);
      const delayMs=Math.max(0,Number(options.delayMs??140));
      const ctx=v21MergeMutationContext(v21MutationRefreshState.pending||{}, {
        ...options,
        modules:v21NormalizeMutationModules(keys),
        revalidateAt:Date.now()+delayMs
      });
      v21MutationRefreshState.pending=ctx;
      v24aArmMutationRefresh();
      return Promise.resolve(true);
    }
    async function v21RunMutationRefresh(){
      if(v21MutationRefreshState.running) return false;
      if(document.visibilityState==='hidden') return false;
      const ctx=v21MutationRefreshState.pending;
      v21MutationRefreshState.pending=null;
      if(!ctx || !currentUser) return false;
      v21MutationRefreshState.running=true;
      const modules=new Set(v21NormalizeMutationModules(ctx.modules||[]));
      const activeKey=routeDataKey(route);
      let changed=false;
      try{
        await runRefreshWithoutRepeatedSaves(async()=>{
          if(modules.has('core') && routeNeedsCoreData(route)) changed=(await refreshOfficialClasses({skipSave:true,forceNetwork:true}))||changed;
          if(modules.has('teachers') && ['teachers','settings'].includes(route)) changed=(await refreshOfficialTeachers({skipSave:true,forceNetwork:true}))||changed;
          if((modules.has('makeup')||modules.has('schedule')||modules.has('attendance')) && activeKey==='makeup'){
            const months=ctx.months&&ctx.months.length?ctx.months:[makeupSelectedMonthKey()];
            const selected=makeupSelectedMonthKey();
            const ordered=[selected,...months.filter(m=>m!==selected)];
            for(const month of ordered){
              changed=(await refreshOfficialMakeupState({month,applyGlobal:month===selected,skipSave:true,forceNetwork:true}))||changed;
            }
          }
          if((modules.has('attendance')||modules.has('makeup')||modules.has('schedule')) && activeKey==='attendance'){
            changed=(await refreshOfficialAttendanceState({skipSave:true,forceNetwork:true}))||changed;
          }
          if((modules.has('schedule')||modules.has('makeup')||modules.has('attendance')||modules.has('core')) && activeKey==='schedule'){
            changed=(await refreshOfficialScheduleState({skipSave:true,forceNetwork:true}))||changed;
          }
          if(modules.has('tuition') && activeKey==='tuition') changed=(await refreshOfficialTuitionState({skipSave:true,forceNetwork:true}))||changed;
          if(modules.has('library') && activeKey==='library') changed=(await refreshOfficialLibrary({skipSave:true,forceNetwork:true}))||changed;
          if(modules.has('evaluation') && activeKey==='evaluation') changed=(await refreshOfficialEvaluations({skipSave:true,forceNetwork:true}))||changed;
        });
        saveLocalOnly();
        const activeAffected=(activeKey==='schedule'&&(modules.has('schedule')||modules.has('makeup')||modules.has('attendance')||modules.has('core'))) ||
          (activeKey==='attendance'&&(modules.has('attendance')||modules.has('makeup')||modules.has('schedule'))) ||
          (activeKey==='makeup'&&(modules.has('makeup')||modules.has('schedule')||modules.has('attendance'))) ||
          (activeKey==='tuition'&&modules.has('tuition')) ||
          (activeKey==='library'&&modules.has('library')) ||
          (activeKey==='evaluation'&&modules.has('evaluation')) ||
          (activeKey==='core'&&modules.has('core'));
        if(ctx.renderOnRevalidate!==false && (changed || ctx.force || activeAffected)){
          try{v7iRenderActiveRoute({reason:'mutation-refresh'})}catch(e){console.warn('Render after mutation refresh failed',e)}
        }
        return changed;
      }finally{
        v21MutationRefreshState.running=false;
        // Nếu có mutation mới trong lúc refresh đang chạy, chỉ chạy một lượt trailing
        // sau đúng mốc idle đã gộp; tuyệt đối không chạy song song.
        if(v21MutationRefreshState.pending) v24aArmMutationRefresh();
      }
    }
    function v22MutationNetworkPrefixes(keys=[],options={}){
      const modules=new Set(v21NormalizeMutationModules(keys));
      const prefixes=[];
      if(modules.has('core')) prefixes.push('/api/classes');
      if(modules.has('schedule')) prefixes.push('/api/schedule/state');
      if(modules.has('attendance')) prefixes.push('/api/attendance/state');
      if(modules.has('makeup')){
        const months=v21MutationMonths(options);
        if(months.length) months.forEach(m=>prefixes.push(`/api/makeup/state?month=${encodeURIComponent(m)}`));
        else prefixes.push('/api/makeup/state');
        prefixes.push('/api/makeup/months');
      }
      return prefixes;
    }
    function v22PersistMakeupMonthCache(month){
      if(!/^\d{4}-\d{2}$/.test(String(month||''))) return;
      const st=(db.makeupTabState && db.makeupTabState.month===month)?db.makeupTabState:null;
      const old=moduleCacheGet(makeupModuleCacheKey(month))||{};
      const payload={
        makeupMonth:month,
        makeupPlans:st?.makeupPlans||old.makeupPlans||db.makeupPlans||[],
        absenceRecords:st?.absenceRecords||old.absenceRecords||db.absenceRecords||[],
        attendanceSessions:st?.attendanceSessions||old.attendanceSessions||{},
        supportClasses:st?.supportClasses||old.supportClasses||[],
        deletedMonths:db.deletedMakeupMonths||old.deletedMonths||[],
        availableMonths:db.makeupAvailableMonths||old.availableMonths||[],
        pendingScope:st?.pendingScope||old.pendingScope||''
      };
      moduleCacheSet(makeupModuleCacheKey(month),payload);
      v22InvalidateMakeupMonthMemory(month);
      v22MakeupMonthMemoryCache.set(month,{ts:Date.now(),payload:v18gCloneJson(payload)});
    }
    function v22PersistMutationCaches(keys=[],options={}){
      const modules=new Set(v21NormalizeMutationModules(keys));
      if(modules.has('schedule')) v18fUpdateScheduleModuleCache();
      if(modules.has('attendance')) v18fUpdateAttendanceModuleCache();
      if(modules.has('makeup')) v21MutationMonths(options).forEach(v22PersistMakeupMonthCache);
      modules.forEach(key=>{
        if(['schedule','attendance','makeup'].includes(key)){
          lazyRouteState[key]={...(lazyRouteState[key]||{}),loaded:true,loading:false,loadedAt:Date.now(),mutated:true};
        }
      });
      v26PatchSharedStoreForModules(modules,options);
    }
    function v20bAfterMutation(keys=[],options={}){
      const modules=v21NormalizeMutationModules(keys);
      // Phase 6: remember this tab's own writes so the matching database
      // broadcast does not cause an immediate duplicate refresh on the sender.
      v27RecordLocalMutation(modules);
      if(options.preserveCache){
        v22PersistMutationCaches(modules,options);
        v22ClearNetworkCacheMatching(v22MutationNetworkPrefixes(modules,options));
      }else{
        v21InvalidateMutationCaches(modules,options);
      }
      v18Touch();
      v21ScheduleMutationRefresh(modules,options);
    }
    function v20b13InvalidateScheduleAfterMutation(){
      lazyRouteState.schedule={};
      lazyRouteState.attendance={};
      lazyRouteState.makeup={};
      v18Memo.weekKey='';
      v18Memo.weekSessions=null;
      v18gClearNetworkCache();
    }
    function v18fRenderCacheFirst(r){
      const key=routeDataKey(r);
      if(key) lazyRouteState[key]={};
      // Phase 5: hydrate the shared memory snapshot first. A fresh snapshot does
      // not need another request; stale/disk snapshots are revalidated in background.
      const hydrated=hydrateRouteCache(r);
      const sharedFresh=!!lazyRouteState[key]?.sharedFresh;
      saveLocalOnly();
      render();
      const forceNetwork=!hydrated||!sharedFresh;
      if(['schedule','attendance','makeup'].includes(r)) ensurePageData(r,{force:forceNetwork});
      else ensureRouteData(r,{force:forceNetwork});
    }
    const V18G_GET_TTL_MS=1800;
    const V20B13_SCHEDULE_STALE_MS=15000; // Phase 5: week store is shared for 15s; mutations still patch immediately.
    const V20C_PREFETCH_DELAY_MS=750;
    const V20C_PREFETCH_GAP_MS=650;
    const V20C_PREFETCH_RECENT_MS=60000;
    // V22 Phase 3: dữ liệu học bù dùng cho popup được preload nền và giữ ngắn hạn trong RAM.
    // Lịch dạy không còn phải chờ /api/makeup/state mới render xong.
    const V22_MAKEUP_PREFETCH_TTL_MS=60000;
    // Phase 4A: danh sách lớp thay đổi ít; giữ 5 phút và vẫn invalidate ngay khi Admin/Quản lí/Lễ tân sửa lớp.
    const V22_CORE_ROUTE_REFRESH_TTL_MS=5*60*1000;
    // Mutation học bù đã patch UI từ response, nên chỉ đối chiếu server sau khi người dùng ngừng thao tác.
    const V24A_MUTATION_REVALIDATE_IDLE_MS=4500;
    const V24A_BATCH_REVALIDATE_IDLE_MS=6500;
    const v22MakeupMonthMemoryCache=new Map();
    const v22MakeupMonthInflight=new Map();
    const v22MakeupMonthGeneration=new Map();
    const v18gCloneJson=data=>window.MsNetworkRuntime.cloneJson(data);
    const v18gCanDedupeFetch=(path,options={})=>window.MsNetworkRuntime.canDedupe(path,options);
    const v18gGetCacheKey=(path,options={})=>window.MsNetworkRuntime.cacheKey(path,options);
    const v18gClearNetworkCache=()=>window.MsNetworkRuntime.clear();
    const v22ClearNetworkCacheMatching=(prefixes=[])=>window.MsNetworkRuntime.clearMatching(prefixes);
    const v18iRefreshHashes={};
    function v18iStableStringify(value){
      const seen=new WeakSet();
      const normalize=v=>{
        if(v===null || typeof v!=='object') return v;
        if(seen.has(v)) return '[Circular]';
        seen.add(v);
        if(Array.isArray(v)) return v.map(normalize);
        return Object.keys(v).sort().reduce((acc,k)=>{acc[k]=normalize(v[k]); return acc}, {});
      };
      try{return JSON.stringify(normalize(value))}
      catch(e){try{return JSON.stringify(value)}catch(_){return String(value)}}
    }
    function v18iHashPayload(key,payload){
      const hash=v18iStableStringify(payload);
      const changed=v18iRefreshHashes[key]!==hash;
      v18iRefreshHashes[key]=hash;
      return changed;
    }
    function v18iTouchIfChanged(cacheKey,payload,options={}){
      const changed=v18iHashPayload(cacheKey,payload);
      moduleCacheSet(cacheKey,payload);
      if(changed){
        v18Touch();
        if(!options.skipSave) save();
      }
      return changed;
    }
    function v18iAnyChanged(results){
      return (results||[]).some(r=>r && r.status==='fulfilled' && r.value===true);
    }
    const lazyRouteState={};
    const v7l1RouteLoadWaiters=new Map();
    function v7l1WaitForRouteLoad(key,options={}){
      return new Promise(resolve=>{
        const list=v7l1RouteLoadWaiters.get(key)||[];
        list.push({resolve,renderAfter:!options.prefetch,route:options.route||route});
        v7l1RouteLoadWaiters.set(key,list);
      });
    }
    function v7l1ResolveRouteLoadWaiters(key){
      const list=v7l1RouteLoadWaiters.get(key)||[];
      if(!list.length) return;
      v7l1RouteLoadWaiters.delete(key);
      const shouldRender=list.some(item=>item.renderAfter && routeDataKey(route)===key);
      list.forEach(item=>{try{item.resolve(true)}catch(e){}});
      if(shouldRender && currentUser){
        requestAnimationFrame(()=>{
          if(currentUser && routeDataKey(route)===key) render();
        });
      }
    }
    let v20aLastCoreLoadError='';
    function v20b4ResetRouteLoadState(){
      Object.keys(lazyRouteState).forEach(k=>delete lazyRouteState[k]);
      v7l1RouteLoadWaiters.forEach(list=>(list||[]).forEach(item=>{try{item.resolve(false)}catch(e){}}));
      v7l1RouteLoadWaiters.clear();
      Object.keys(v18iRefreshHashes).forEach(k=>delete v18iRefreshHashes[k]);
      v22MakeupMonthMemoryCache.clear();
      v22MakeupMonthInflight.clear();
      v22MakeupMonthGeneration.clear();
      v26StoreReset();
      v20aLastCoreLoadError='';
    }
    function v20b4ResetSessionMemo(){
      v18Memo.billingKey='';
      v18Memo.billingRows=null;
      v18Memo.weekKey='';
      v18Memo.weekSessions=null;
      v18Memo.rosterKey='';
      v18Memo.rosterRows=null;
      v18Memo.indexKey='';
      v18Memo.index=null;
      if(v18Memo.classesForUser) v18Memo.classesForUser={};
    }
    function routeDataKey(r){
      // V20L.3: makeup page needs both schedule data and attendance/absence data.
      // Keep it as a separate lazy key so a cached schedule route cannot make the Makeup tab look empty.
      if(r==='makeup') return 'makeup';
      if(r==='schedule') return 'schedule';
      if(r==='attendance') return 'attendance';
      if(r==='tuition') return 'tuition';
      if(r==='homework') return 'library';
      if(r==='evaluation') return 'evaluation';
      if(r==='teachers'||r==='settings') return 'teachers';
      return 'core';
    }
    function routeNeedsCoreData(r){
      return !!currentUser;
    }
    function routeNeedsLazyData(r){
      if(r==='tuition' && !canViewTuition()) return false;
      return ['schedule','makeup','attendance','tuition','homework','evaluation','teachers','settings'].includes(r);
    }
    function v20dSkLine(w='100%',h=14){
      return `<span class="v20dSkLine" style="width:${w};height:${h}px"></span>`;
    }
    function v20dSkCard(lines=3){
      return `<div class="v20dSkCard">${Array.from({length:lines},(_,i)=>v20dSkLine(i===0?'70%':i===lines-1?'46%':'92%',i===0?18:13)).join('')}</div>`;
    }
    function v20dSkeletonSchedule(){
      const days=WEEK_DAYS||[];
      const rows=Array.from({length:4},(_,ri)=>`<tr><td class="timeCol">${v20dSkLine('68px',13)}</td>${days.map(()=>`<td class="scheduleCell"><div class="v20dSkLesson">${v20dSkLine('70%',14)}${v20dSkLine('46%',11)}${v20dSkLine('55%',11)}</div></td>`).join('')}</tr>`).join('');
      return `<div class="v20dSkeletonBlock"><div class="weekToolbar v20dSkToolbar">${v20dSkLine('220px',18)}${v20dSkLine('160px',18)}</div><div class="timetableShell v20dSkTable"><table class="timetable"><thead><tr><th class="timeCol">${v20dSkLine('70px',13)}</th>${days.map(d=>`<th>${d.label}<div class="mini">${v20dSkLine('58px',10)}</div></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }
    function v20dSkeletonCards(){
      return `<div class="v20dSkeletonBlock"><div class="statGrid">${Array.from({length:4},()=>v20dSkCard(3)).join('')}</div><div class="classGrid">${Array.from({length:6},()=>v20dSkCard(4)).join('')}</div></div>`;
    }
    function v20dSkeletonTable(){
      return `<div class="v20dSkeletonBlock"><div class="v20dSkToolbar">${v20dSkLine('240px',18)}${v20dSkLine('130px',18)}</div><div class="modalTableWrap"><table class="modalTable"><thead><tr><th>${v20dSkLine('50px',12)}</th><th>${v20dSkLine('120px',12)}</th><th>${v20dSkLine('140px',12)}</th><th>${v20dSkLine('90px',12)}</th></tr></thead><tbody>${Array.from({length:6},()=>`<tr><td>${v20dSkLine('36px',12)}</td><td>${v20dSkLine('120px',12)}</td><td>${v20dSkLine('160px',12)}</td><td>${v20dSkLine('80px',12)}</td></tr>`).join('')}</tbody></table></div></div>`;
    }
    function routeLoadingMarkup(title='Đang tải dữ liệu...'){
      const key=routeDataKey(route);
      const body=(key==='schedule')?v20dSkeletonSchedule():(['attendance','tuition','evaluation','teachers'].includes(key)?v20dSkeletonTable():v20dSkeletonCards());
      return `<div class="screenTitle v20dLoadingTitle"><div><h1>${h(title.replace(/^Đang tải\s*/,'')||'Đang tải')}</h1><p>Đang chuẩn bị dữ liệu, app sẽ tự hiển thị ngay khi tải xong.</p></div><button class="btn ghost" onclick="refreshCurrentRouteData()">Tải lại</button></div>${body}`;
    }
    function refreshCurrentRouteData(){
      const key=routeDataKey(route);
      lazyRouteState[key]={};
      if(routeNeedsCoreData(route)) lazyRouteState.core={};
      render();
      ensurePageData(route,{force:true});
    }

    const MODULE_CACHE_TTL_MS=10*60*1000;
    const MODULE_CACHE_LIBRARY_TTL_MS=24*60*60*1000;
    const MODULE_CACHE_MAX_KEYS=18;
    function moduleCacheTtlMs(cacheKey){return String(cacheKey||'').startsWith('library:')?MODULE_CACHE_LIBRARY_TTL_MS:MODULE_CACHE_TTL_MS}
    function moduleCacheUserKey(){
      const uid=currentUser?.id || currentUser?.phone || currentUser?.name || 'anonymous';
      return `msgiang_module_cache_v15_${uid}`;
    }
    function pruneModuleCacheStore(store){
      const now=Date.now();
      const cleaned={};
      Object.entries(store||{}).forEach(([k,v])=>{
        if(v && v.ts && now-v.ts<=moduleCacheTtlMs(k)) cleaned[k]=v;
      });
      const keys=Object.keys(cleaned).sort((a,b)=>(cleaned[b]?.ts||0)-(cleaned[a]?.ts||0));
      keys.slice(MODULE_CACHE_MAX_KEYS).forEach(k=>delete cleaned[k]);
      return cleaned;
    }
    let v20eModuleCacheKey='';
    let v20eModuleCacheStore=null;
    let v20eModuleCacheTimer=null;
    let v20eModuleCacheLastJson='';
    function readModuleCacheStore(){
      const key=moduleCacheUserKey();
      if(v20eModuleCacheKey===key && v20eModuleCacheStore) return pruneModuleCacheStore(v20eModuleCacheStore);
      try{
        const store=pruneModuleCacheStore(JSON.parse(localStorage.getItem(key)||'{}')||{});
        v20eModuleCacheKey=key;
        v20eModuleCacheStore=store;
        v20eModuleCacheLastJson=JSON.stringify(store);
        return store;
      }
      catch(e){
        v20eModuleCacheKey=key;
        v20eModuleCacheStore={};
        v20eModuleCacheLastJson='';
        return {};
      }
    }
    function v20eCommitModuleCache(){
      clearTimeout(v20eModuleCacheTimer);
      if(!v20eModuleCacheKey || !v20eModuleCacheStore) return;
      try{
        const cleaned=pruneModuleCacheStore(v20eModuleCacheStore);
        v20eModuleCacheStore=cleaned;
        const json=JSON.stringify(cleaned);
        if(json===v20eModuleCacheLastJson) return;
        localStorage.setItem(v20eModuleCacheKey, json);
        v20eModuleCacheLastJson=json;
      }
      catch(e){console.warn('Module cache save failed',e)}
    }
    function writeModuleCacheStore(store){
      const key=moduleCacheUserKey();
      const cleaned=pruneModuleCacheStore(store||{});
      v20eModuleCacheKey=key;
      v20eModuleCacheStore=cleaned;
      clearTimeout(v20eModuleCacheTimer);
      v20eModuleCacheTimer=setTimeout(v20eCommitModuleCache,700);
    }
    function makeupModuleCacheKey(month=makeupSelectedMonthKey()){return `makeup-all-open-v1:${month}`}
    function moduleCacheKeyForRoute(r){
      const key=routeDataKey(r);
      if(key==='core') return 'classes:latest';
      if(key==='schedule') return `schedule:${isoDate(weekStartDate())}`;
      if(key==='attendance') return `attendance:${isoDate(weekStartDate())}`;
      if(key==='makeup') return makeupModuleCacheKey();
      if(key==='tuition') return `tuition:${tuitionMonthKey()}`;
      if(key==='evaluation') return `evaluation:${evaluationMonthKey()}`;
      if(key==='library') return 'library:latest';
      if(key==='teachers') return 'teachers:latest';
      return `core:${key}`;
    }
    function moduleCacheGet(cacheKey){
      const store=readModuleCacheStore();
      const item=store[cacheKey];
      if(!item || !item.ts || Date.now()-item.ts>moduleCacheTtlMs(cacheKey)) return null;
      return item.payload || null;
    }
    function moduleCacheSet(cacheKey,payload){
      if(!cacheKey || !payload) return;
      const store=readModuleCacheStore();
      store[cacheKey]={ts:Date.now(),payload};
      writeModuleCacheStore(store);
    }
    function moduleCacheRemove(cacheKey){
      const store=readModuleCacheStore();
      delete store[cacheKey];
      writeModuleCacheStore(store);
    }
    function v20bMergeClassMakeupSessions(existing=[],incoming=[]){
      const map=new Map();
      [...(existing||[]),...(incoming||[])].forEach(m=>{
        if(!m) return;
        const key=String(m.sourceSessionKey||m.id||'');
        if(!key) return;
        map.set(key,{...(map.get(key)||{}),...m});
      });
      return Array.from(map.values()).filter(m=>m.status!=='cancelled');
    }
    function v20b12SafeClassSnapshotMerge(current={},snap={}){
      // Snapshot từ class makeup chỉ để giúp giáo viên được gán render buổi dạy bù.
      // Không được ghi đè dữ liệu lớp chính như time/schedules bằng chuỗi rỗng.
      const merged={...current};
      ['id','name','teacher','teacherId','ta','status','startDate','endDate','createdAt','grade','note'].forEach(k=>{
        if(snap[k]!==undefined && snap[k]!==null && String(snap[k]).trim()!=='') merged[k]=snap[k];
      });
      if((snap.students||[]).length) merged.students=snap.students;
      else merged.students=current.students||[];
      if(String(snap.time||'').trim()) merged.time=snap.time;
      else merged.time=current.time||'';
      return merged;
    }
    function v20b7MergeClassSnapshotsFromMakeups(makeups=[]){
      db.classes ||= [];
      (makeups||[]).forEach(m=>{
        const snap=m?.classSnapshot;
        if(!snap?.id) return;
        const i=db.classes.findIndex(c=>String(c.id)===String(snap.id));
        if(i>=0){
          db.classes[i]=v20b12SafeClassSnapshotMerge(db.classes[i],snap);
        }else{
          db.classes.push(v20b12SafeClassSnapshotMerge({},snap));
        }
      });
    }
    function v20tMergeSupportClasses(classes=[]){
      db.classes ||= [];
      (classes||[]).forEach(c=>{
        if(!c?.id) return;
        const i=db.classes.findIndex(x=>String(x.id)===String(c.id));
        const normalized={...c, students:Array.isArray(c.students)?c.students:[], time:c.time||''};
        if(i>=0) db.classes[i]=v20b12SafeClassSnapshotMerge(db.classes[i],normalized);
        else db.classes.push(v20b12SafeClassSnapshotMerge({},normalized));
      });
    }
    function v20b7MakeupClassFallback(m){
      const c=classById(m.classId);
      if(c?.id) return c;
      const snap=m.classSnapshot||{};
      return {
        id:m.classId,
        name:m.className||snap.name||m.reason||'Lớp dạy bù',
        teacher:snap.teacher||'',
        teacherId:snap.teacherId||null,
        ta:snap.ta||'',
        students:snap.students||[],
        startDate:snap.startDate||'2026-06-01',
        endDate:snap.endDate||'',
        grade:snap.grade||'',
        note:snap.note||''
      };
    }
    function applyCachedPayload(key,payload){
      if(!payload) return false;
      if(key==='core'){
        db.classes=payload.classes||[];
        if(Array.isArray(payload.teachers) && payload.teachers.length) db.teachers=payload.teachers;
        return true;
      }
      if(key==='schedule'){
        db.classCancellations=payload.classCancellations||{};
        db.classMakeupSessions=(payload.classMakeupSessions||[]).filter(m=>m?.status!=='cancelled');
        v20b7MergeClassSnapshotsFromMakeups(db.classMakeupSessions);
        db.makeupPlans=payload.makeupPlans||[];
        // Phase 4B: schedule cache can carry the attendance state required by the Schedule screen.
        // Older cache entries remain compatible because this branch only applies when bundled=true.
        if(payload.attendanceBundled===true){
          db.attendanceSessions=payload.attendanceSessions||{};
          db.absenceRecords=[...(payload.absenceRecords||[])];
        }
        if(payload.sourceAbsenceRecords?.length) mergeAbsenceRecords(payload.sourceAbsenceRecords);
        return true;
      }
      if(key==='attendance'){
        db.attendanceSessions=payload.attendanceSessions||{};
        db.absenceRecords=payload.absenceRecords||[];
        return true;
      }
      if(key==='makeup'){
        const month=payload.makeupMonth||makeupCurrentMonthKey();
        db.makeupMonth=month;
        db.makeupTabState={
          month,
          makeupPlans: payload.makeupPlans||[],
          absenceRecords: payload.absenceRecords||[],
          attendanceSessions: payload.attendanceSessions||{},
          supportClasses: payload.supportClasses||[],
          pendingScope: payload.pendingScope||'',
          updatedAt: Date.now()
        };
        db.deletedMakeupMonths=payload.deletedMonths||db.deletedMakeupMonths||[];
        db.makeupAvailableMonths=payload.availableMonths||db.makeupAvailableMonths||[];
        // Giữ global để các helper cũ vẫn hoạt động khi đang ở tab Học bù,
        // nhưng dữ liệu tab Học bù chính thức luôn nằm trong db.makeupTabState.
        v20tMergeSupportClasses(payload.supportClasses||[]);
        db.makeupPlans=payload.makeupPlans||[];
        db.absenceRecords=payload.absenceRecords||[];
        if(payload.attendanceSessions){
          db.deletedMakeupMonths=payload.deletedMonths||db.deletedMakeupMonths||[];
          db.makeupAvailableMonths=payload.availableMonths||db.makeupAvailableMonths||[];
          db.attendanceSessions={...(db.attendanceSessions||{}),...(payload.attendanceSessions||{})};
        }
        return true;
      }
      if(key==='tuition'){
        db.tuitionRollup=payload.tuitionRollup||{};
        db.tuitionRollupMonth=payload.tuitionRollupMonth||tuitionMonthKey();
        db.payments=payload.payments||{};
        db.tuitionMessages=payload.tuitionMessages||{};
        if(payload.unitPrice) db.settings.unitPrice=Number(payload.unitPrice);
        return true;
      }
      if(key==='library'){
        db.exerciseLibrary=payload.exerciseLibrary||[];
        v18Memo.library={}; v18Memo.libraryCatalogStats={}; v18Memo.libraryFilterValues={};
        return true;
      }
      if(key==='evaluation'){
        const currentMonth=evaluationMonthKey();
        const other=(db.evaluations||[]).filter(e=>normalizeEvaluationMonthValue(e.monthKey||e.month)!==currentMonth);
        db.evaluations=[...other,...(payload.evaluations||[])];
        return true;
      }
      if(key==='teachers'){
        db.teachers=payload.teachers||[];
        if(Array.isArray(payload.users) && isAdmin()) db.users=payload.users;
        return true;
      }
      return false;
    }
    // Phase 5: shared in-memory store used by all front-end modules.
    // It keeps one snapshot per logical scope (core, week, month), deduplicates
    // concurrent loaders and protects optimistic mutations from stale responses.
    const V26_SHARED_STORE_TTL={
      core:5*60*1000,
      week:15*1000,
      makeup:60*1000,
      tuition:60*1000,
      library:5*60*1000,
      evaluation:2*60*1000,
      teachers:5*60*1000,
      settings:5*60*1000
    };
    const V26_SHARED_STORE_RETENTION_MS=15*60*1000;
    const v26SharedStore={
      entries:new Map(),
      inflight:new Map(),
      generations:new Map(),
      listeners:new Set(),
      stats:{hits:0,misses:0,inflightHits:0,loads:0,invalidations:0,updates:0}
    };
    function v26StoreKey(type,scope=''){
      return scope?`${type}:${scope}`:String(type||'');
    }
    function v26WeekStoreKey(start=isoDate(weekStartDate())){return v26StoreKey('week',start)}
    function v26MakeupStoreKey(month=makeupSelectedMonthKey()){return v26StoreKey('makeup',`${month}:all-open-v1`)}
    function v26TuitionStoreKey(month=tuitionMonthKey()){return v26StoreKey('tuition',month)}
    function v26EvaluationStoreKey(month=evaluationMonthKey()){return v26StoreKey('evaluation',month)}
    function v26StoreTtl(key){
      const type=String(key||'').split(':')[0];
      return Number(V26_SHARED_STORE_TTL[type]||60*1000);
    }
    function v26StoreGeneration(key){return Number(v26SharedStore.generations.get(key)||0)}
    function v26StoreBumpGeneration(key){
      const next=v26StoreGeneration(key)+1;
      v26SharedStore.generations.set(key,next);
      return next;
    }
    function v26StoreNotify(event){
      v26SharedStore.listeners.forEach(fn=>{try{fn(event)}catch(e){console.warn('Shared store listener failed',e)}});
    }
    function v26StoreGet(key,options={}){
      const entry=v26SharedStore.entries.get(String(key||''));
      if(!entry){v26SharedStore.stats.misses++;return null}
      const age=Date.now()-Number(entry.ts||0);
      if(age>V26_SHARED_STORE_RETENTION_MS){
        v26SharedStore.entries.delete(key);
        v26SharedStore.stats.misses++;
        return null;
      }
      const fresh=age<=Number(entry.ttl||v26StoreTtl(key));
      if(!fresh && !options.allowStale){v26SharedStore.stats.misses++;return null}
      v26SharedStore.stats.hits++;
      return {payload:v18gCloneJson(entry.payload),fresh,ts:entry.ts,age,source:entry.source||'memory'};
    }
    function v26StoreSet(key,payload,options={}){
      if(!key || payload==null) return payload;
      const generation=v26StoreBumpGeneration(key);
      const ttl=Number(options.ttl||v26StoreTtl(key));
      const entry={
        payload:v18gCloneJson(payload),
        ts:options.stale?(Date.now()-ttl-1):Date.now(),
        ttl,
        generation,
        source:options.source||'memory'
      };
      v26SharedStore.entries.set(key,entry);
      v26SharedStore.stats.updates++;
      v26StoreNotify({type:'set',key,payload:v18gCloneJson(payload),source:entry.source});
      return payload;
    }
    function v26StoreInvalidate(key,options={}){
      const normalized=String(key||'');
      if(!normalized) return;
      v26StoreBumpGeneration(normalized);
      if(options.markStale){
        const entry=v26SharedStore.entries.get(normalized);
        if(entry) v26SharedStore.entries.set(normalized,{...entry,ts:Date.now()-Number(entry.ttl||v26StoreTtl(normalized))-1});
      }else{
        v26SharedStore.entries.delete(normalized);
      }
      v26SharedStore.inflight.delete(normalized);
      v26SharedStore.stats.invalidations++;
      v26StoreNotify({type:'invalidate',key:normalized});
    }
    function v26StoreInvalidatePrefix(prefix){
      const value=String(prefix||'');
      if(!value) return;
      const keys=new Set([
        ...Array.from(v26SharedStore.entries.keys()).filter(k=>String(k).startsWith(value)),
        ...Array.from(v26SharedStore.inflight.keys()).filter(k=>String(k).startsWith(value))
      ]);
      keys.forEach(k=>v26StoreInvalidate(k));
    }
    function v26StoreReset(){
      v26SharedStore.entries.clear();
      v26SharedStore.inflight.clear();
      v26SharedStore.generations.clear();
      Object.keys(v26SharedStore.stats).forEach(k=>v26SharedStore.stats[k]=0);
      v26StoreNotify({type:'reset'});
    }
    async function v26StoreLoad(key,loader,options={}){
      const normalized=String(key||'');
      const cached=!options.force?v26StoreGet(normalized):null;
      if(cached) return {...cached,fromStore:true};
      const existing=v26SharedStore.inflight.get(normalized);
      if(existing){
        v26SharedStore.stats.inflightHits++;
        return v18gCloneJson(await existing);
      }
      const startedGeneration=v26StoreGeneration(normalized);
      v26SharedStore.stats.loads++;
      const promise=(async()=>{
        const payload=await loader();
        if(v26StoreGeneration(normalized)!==startedGeneration){
          const latest=v26StoreGet(normalized,{allowStale:true});
          if(latest) return {...latest,fromStore:true,superseded:true};
          return {payload:null,fresh:false,source:'superseded',fromStore:false,superseded:true};
        }
        v26StoreSet(normalized,payload,{ttl:options.ttl,source:options.source||'network'});
        const saved=v26StoreGet(normalized,{allowStale:true});
        return {...saved,fromStore:false,source:options.source||'network'};
      })();
      v26SharedStore.inflight.set(normalized,promise);
      try{return v18gCloneJson(await promise)}
      finally{if(v26SharedStore.inflight.get(normalized)===promise) v26SharedStore.inflight.delete(normalized)}
    }
    function v26SessionKeyDateValue(sessionKey){
      const parts=String(sessionKey||'').split('|');
      const date=parts.length>=4?parts[1]:'';
      return /^\d{4}-\d{2}-\d{2}$/.test(date)?date:'';
    }
    function v26DateWithinWeek(date,start){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))) return false;
      const end=isoDate(addDays(parseISODate(start),7));
      return String(date)>=String(start)&&String(date)<end;
    }
    function v26WeekBundleFromDb(start=isoDate(weekStartDate()),options={}){
      const key=v26WeekStoreKey(start);
      const existing=v26StoreGet(key,{allowStale:true})?.payload||{};
      const currentPlans=(db.makeupPlans||[]).filter(plan=>v26DateWithinWeek(v26SessionKeyDateValue(plan?.targetSessionKey),start));
      const planAbsenceIds=new Set(currentPlans.map(p=>String(p?.absenceId||'')).filter(Boolean));
      const currentWeekAbsences=(db.absenceRecords||[]).filter(a=>v26DateWithinWeek(v26SessionKeyDateValue(a?.sourceSessionKey),start));
      const currentSourceAbsences=(db.absenceRecords||[]).filter(a=>planAbsenceIds.has(String(a?.id||'')));
      const existingAttendance=existing.attendance||{};
      const useExistingAttendance=!!options.keepExistingAttendance&&!!existing.attendance;
      const attendance={
        attendanceSessions:useExistingAttendance?(existingAttendance.attendanceSessions||{}):(db.attendanceSessions||{}),
        absenceRecords:useExistingAttendance?(existingAttendance.absenceRecords||[]):currentWeekAbsences
      };
      const sourceMap=new Map();
      [...(existing.schedule?.sourceAbsenceRecords||[]),...currentSourceAbsences].forEach(a=>{if(a?.id)sourceMap.set(String(a.id),a)});
      const cancellations=Object.fromEntries(Object.entries(db.classCancellations||{}).filter(([sessionKey])=>{
        const date=v26SessionKeyDateValue(sessionKey);
        return !date||v26DateWithinWeek(date,start);
      }));
      const classMakeups=(db.classMakeupSessions||[]).filter(m=>{
        const date=String(m?.date||v26SessionKeyDateValue(m?.sourceSessionKey)||'');
        return v26DateWithinWeek(date,start)&&m?.status!=='cancelled';
      });
      return {
        start,
        end:isoDate(addDays(parseISODate(start),7)),
        schedule:{
          classCancellations:cancellations,
          classMakeupSessions:classMakeups,
          makeupPlans:currentPlans,
          sourceAbsenceRecords:Array.from(sourceMap.values()),
          attendanceBundled:true,
          attendanceSessions:attendance.attendanceSessions,
          absenceRecords:attendance.absenceRecords
        },
        attendance,
        attendanceBundled:true,
        source:options.source||'local'
      };
    }
    function v26StoreDescriptorForRoute(r){
      const key=routeDataKey(r);
      if(key==='core') return {storeKey:v26StoreKey('core'),kind:'core'};
      if(key==='schedule'||key==='attendance') return {storeKey:v26WeekStoreKey(),kind:'week'};
      if(key==='makeup') return {storeKey:v26MakeupStoreKey(),kind:'makeup'};
      if(key==='tuition') return {storeKey:v26TuitionStoreKey(),kind:'tuition'};
      if(key==='library') return {storeKey:v26StoreKey('library','latest'),kind:'library'};
      if(key==='evaluation') return {storeKey:v26EvaluationStoreKey(),kind:'evaluation'};
      if(key==='teachers') return {storeKey:v26StoreKey('teachers','latest'),kind:'teachers'};
      return null;
    }
    function v26ApplySharedStoreRoute(r,entry){
      if(!entry?.payload) return false;
      const key=routeDataKey(r);
      if(key==='schedule'||key==='attendance'){
        const bundle=entry.payload||{};
        let ok=false;
        // Apply attendance first, then schedule so source absence records bundled
        // for makeup placement are merged last instead of being overwritten.
        if(bundle.attendance) ok=applyCachedPayload('attendance',bundle.attendance)||ok;
        if(bundle.schedule) ok=applyCachedPayload('schedule',bundle.schedule)||ok;
        return ok;
      }
      return applyCachedPayload(key,entry.payload);
    }
    function v26HydrateRouteFromSharedStore(r){
      const descriptor=v26StoreDescriptorForRoute(r);
      if(!descriptor) return {ok:false,fresh:false};
      const entry=v26StoreGet(descriptor.storeKey,{allowStale:true});
      if(!entry) return {ok:false,fresh:false};
      const ok=v26ApplySharedStoreRoute(r,entry);
      return {ok,fresh:entry.fresh,ts:entry.ts,source:entry.source,storeKey:descriptor.storeKey};
    }
    function v26CaptureRouteToSharedStore(r,options={}){
      const descriptor=v26StoreDescriptorForRoute(r);
      if(!descriptor) return;
      let payload=null;
      if(descriptor.kind==='core') payload={classes:db.classes||[],teachers:db.teachers||[]};
      if(descriptor.kind==='week') payload=v26WeekBundleFromDb(undefined,{keepExistingAttendance:false,source:options.source||'local'});
      if(descriptor.kind==='makeup'){
        const month=makeupSelectedMonthKey();
        const st=(db.makeupTabState&&db.makeupTabState.month===month)?db.makeupTabState:null;
        payload={
          makeupMonth:month,
          makeupPlans:st?.makeupPlans||db.makeupPlans||[],
          absenceRecords:st?.absenceRecords||db.absenceRecords||[],
          attendanceSessions:st?.attendanceSessions||db.attendanceSessions||{},
          supportClasses:st?.supportClasses||[],
          deletedMonths:db.deletedMakeupMonths||[],
          availableMonths:db.makeupAvailableMonths||[],
          pendingScope:st?.pendingScope||''
        };
      }
      if(descriptor.kind==='tuition' && canViewTuition()) payload={tuitionRollup:db.tuitionRollup||{},tuitionRollupMonth:db.tuitionRollupMonth||tuitionMonthKey(),payments:db.payments||{},tuitionMessages:db.tuitionMessages||{},unitPrice:db.settings?.unitPrice||70000};
      if(descriptor.kind==='library') payload={exerciseLibrary:db.exerciseLibrary||[]};
      if(descriptor.kind==='evaluation') payload={evaluations:(db.evaluations||[]).filter(e=>normalizeEvaluationMonthValue(e.monthKey||e.month)===evaluationMonthKey())};
      if(descriptor.kind==='teachers') payload={teachers:db.teachers||[],users:isAdmin()?(db.users||[]):[]};
      if(payload) v26StoreSet(descriptor.storeKey,payload,{stale:!!options.stale,source:options.source||'local'});
    }
    function v26SessionWeekStart(sessionKey){
      const parts=String(sessionKey||'').split('|');
      const date=parts.length>=4?parts[1]:'';
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
      return isoDate(mondayOf(parseISODate(date)));
    }
    function v26MutationWeekStarts(options={}){
      const weeks=new Set([isoDate(weekStartDate())]);
      const add=value=>{const week=v26SessionWeekStart(value);if(week) weeks.add(week)};
      [options.sessionKey,options.targetSessionKey,options.sourceSessionKey].forEach(add);
      (options.sessionKeys||[]).forEach(add);
      if(options.plan){add(options.plan.targetSessionKey);add(options.plan.sourceSessionKey)}
      if(options.record) add(options.record.sourceSessionKey);
      return Array.from(weeks);
    }
    function v26InvalidateSharedStoreForModules(keys=[],options={}){
      const modules=new Set(v21NormalizeMutationModules(keys));
      if(modules.has('core')) v26StoreInvalidate(v26StoreKey('core'));
      if(modules.has('schedule')||modules.has('attendance')) v26MutationWeekStarts(options).forEach(week=>v26StoreInvalidate(v26WeekStoreKey(week)));
      if(modules.has('makeup')){
        const months=v21MutationMonths(options);
        if(months.length) months.forEach(m=>v26StoreInvalidate(v26MakeupStoreKey(m)));
        else v26StoreInvalidatePrefix('makeup:');
      }
      if(modules.has('tuition')) v26StoreInvalidate(v26TuitionStoreKey());
      if(modules.has('library')) v26StoreInvalidate(v26StoreKey('library','latest'));
      if(modules.has('evaluation')) v26StoreInvalidate(v26EvaluationStoreKey());
      if(modules.has('teachers')) v26StoreInvalidate(v26StoreKey('teachers','latest'));
    }
    function v26PatchSharedStoreForModules(keys=[],options={}){
      const modules=new Set(v21NormalizeMutationModules(keys));
      if(modules.has('core')) v26CaptureRouteToSharedStore('overview',{source:'mutation'});
      if(modules.has('schedule')||modules.has('attendance')){
        const currentWeek=isoDate(weekStartDate());
        v26MutationWeekStarts(options).forEach(week=>{
          if(week===currentWeek) v26StoreSet(v26WeekStoreKey(week),v26WeekBundleFromDb(week,{keepExistingAttendance:!modules.has('attendance'),source:'mutation'}),{source:'mutation'});
          else v26StoreInvalidate(v26WeekStoreKey(week));
        });
      }
      if(modules.has('makeup')){
        const months=v21MutationMonths(options);
        months.forEach(month=>{
          const st=(db.makeupTabState&&db.makeupTabState.month===month)?db.makeupTabState:null;
          const old=v26StoreGet(v26MakeupStoreKey(month),{allowStale:true})?.payload||{};
          v26StoreSet(v26MakeupStoreKey(month),{
            makeupMonth:month,
            makeupPlans:st?.makeupPlans||old.makeupPlans||db.makeupPlans||[],
            absenceRecords:st?.absenceRecords||old.absenceRecords||db.absenceRecords||[],
            attendanceSessions:st?.attendanceSessions||old.attendanceSessions||db.attendanceSessions||{},
            supportClasses:st?.supportClasses||old.supportClasses||[],
            deletedMonths:db.deletedMakeupMonths||old.deletedMonths||[],
            availableMonths:db.makeupAvailableMonths||old.availableMonths||[],
            pendingScope:st?.pendingScope||old.pendingScope||''
          },{source:'mutation'});
        });
      }
      if(modules.has('tuition')) v26CaptureRouteToSharedStore('tuition',{source:'mutation'});
      if(modules.has('library')) v26CaptureRouteToSharedStore('homework',{source:'mutation'});
      if(modules.has('evaluation')) v26CaptureRouteToSharedStore('evaluation',{source:'mutation'});
      if(modules.has('teachers')) v26CaptureRouteToSharedStore('teachers',{source:'mutation'});
    }
    function v26SharedStoreSubscribe(fn){
      if(typeof fn!=='function') return ()=>{};
      v26SharedStore.listeners.add(fn);
      return ()=>v26SharedStore.listeners.delete(fn);
    }
    if(typeof window!=='undefined'){
      window.msgiangSharedStore={
        stats:()=>({...v26SharedStore.stats,entries:v26SharedStore.entries.size,inflight:v26SharedStore.inflight.size}),
        keys:()=>Array.from(v26SharedStore.entries.keys()),
        subscribe:v26SharedStoreSubscribe
      };
    }

    function hydrateRouteCache(r){
      if(!currentUser) return false;
      const key=routeDataKey(r);
      if(key!=='core' && !routeNeedsLazyData(r)) return false;

      // Phase 5: memory store is the first source. Schedule and Attendance share
      // the same week bundle, so switching between them is immediate and does not
      // start another request while the snapshot is still fresh.
      const shared=v26HydrateRouteFromSharedStore(r);
      if(shared.ok){
        lazyRouteState[key]={
          loaded:true,
          loading:false,
          loadedAt:Number(shared.ts||Date.now()),
          fromCache:!shared.fresh,
          fromSharedStore:true,
          sharedFresh:!!shared.fresh,
          storeKey:shared.storeKey
        };
        saveLocalOnly();
        return true;
      }

      const mainPayload=moduleCacheGet(moduleCacheKeyForRoute(r));
      let ok=false;
      if(mainPayload) ok=applyCachedPayload(key,mainPayload);
      if(key==='schedule'){
        const attendancePayload=moduleCacheGet(`attendance:${isoDate(weekStartDate())}`);
        if(attendancePayload) applyCachedPayload('attendance',attendancePayload);
      }
      if(key==='attendance'){
        const schedulePayload=moduleCacheGet(`schedule:${isoDate(weekStartDate())}`);
        if(schedulePayload) applyCachedPayload('schedule',schedulePayload);
      }
      if(key==='makeup'){
        // Học bù có API/cache riêng theo tháng, không cần hydrate từ lịch tuần/điểm danh tuần nữa.
      }
      if(ok){
        // Disk cache only paints the screen quickly. Seed it into the shared store
        // as stale so every module can reuse it, then revalidate in the background.
        v26CaptureRouteToSharedStore(r,{stale:true,source:'disk-cache'});
        lazyRouteState[key]={loaded:true,loading:false,loadedAt:Date.now(),fromCache:true,fromSharedStore:false,sharedFresh:false};
        saveLocalOnly();
      }
      return ok;
    }

    async function ensureCoreData(options={}){
      if(!currentUser) return false;
      const key='core';
      if(!options.force && !lazyRouteState[key]?.loaded && hydrateRouteCache('overview')){
        if(!lazyRouteState[key]?.sharedFresh) ensureCoreData({force:true,cacheRefresh:true,prefetch:!!options.prefetch});
        return false;
      }
      if(lazyRouteState[key]?.loaded && !options.force) return false;
      if(lazyRouteState[key]?.loading) return false;
      const wasLoadedBefore=!!lazyRouteState[key]?.loaded;
      lazyRouteState[key]={...(lazyRouteState[key]||{}),loading:true};
      const startedRoute=route;
      try{
        const changed=await refreshOfficialClasses({skipSave:true,forceNetwork:!!options.force});
        if(v20aLastCoreLoadError){
          lazyRouteState[key]={loaded:false,loading:false,error:v20aLastCoreLoadError};
          return false;
        }
        lazyRouteState[key]={loaded:true,loading:false,loadedAt:Date.now(),unchanged:!changed};
        saveLocalOnly();
        if(!options.prefetch && route===startedRoute && (!wasLoadedBefore || changed)) renderApp();
        return changed;
      }catch(e){
        console.warn('Core route refresh failed',e);
        lazyRouteState[key]={loaded:false,loading:false,error:e?.message||String(e)};
        return false;
      }
    }

    async function ensureRouteData(r, options={}){
      if(!currentUser || !routeNeedsLazyData(r)) return;
      const key=routeDataKey(r);

      // V20B.9:
      // Cache chỉ dùng để render nhanh, không được coi là dữ liệu cuối cùng.
      // Trường hợp Admin vừa gán dạy bù cho giáo viên, cache cũ của giáo viên có thể vẫn rỗng.
      // Nếu dừng ở cache, giáo viên sẽ thấy "Chưa có dữ liệu lịch học" cho tới khi refresh/đổi tuần.
      if(!options.force && !lazyRouteState[key]?.loaded && hydrateRouteCache(r)){
        if(!lazyRouteState[key]?.sharedFresh){
          ensureRouteData(r,{force:true,cacheRefresh:true,prefetch:!!options.prefetch});
        }
        return;
      }
      if(lazyRouteState[key]?.loaded && !options.force){
        const isScheduleLike=['schedule','attendance','makeup'].includes(key);
        const age=Date.now()-(lazyRouteState[key]?.loadedAt||0);
        const shouldRefreshAfterCache=lazyRouteState[key]?.fromCache;
        const shouldRefreshStale=isScheduleLike && age>V20B13_SCHEDULE_STALE_MS;
        if((shouldRefreshAfterCache || shouldRefreshStale) && !lazyRouteState[key]?.refreshingAfterCache){
          lazyRouteState[key]={...(lazyRouteState[key]||{}),refreshingAfterCache:true};
          ensureRouteData(r,{force:true,cacheRefresh:true,prefetch:!!options.prefetch});
        }
        return;
      }
      if(lazyRouteState[key]?.loading) return v7l1WaitForRouteLoad(key,{...options,route:r});
      const wasLoadedBefore=!!lazyRouteState[key]?.loaded;
      lazyRouteState[key]={...(lazyRouteState[key]||{}),loading:true};
      const startedRoute=route;
      let anyChanged=false;
      try{
        await runRefreshWithoutRepeatedSaves(async()=>{
          const jobs=[];
          // V22 Phase 3:
          // - Core/classes đã được ensureCoreData tải trước, nên không gọi lại /api/classes nếu vẫn còn mới.
          // - Lịch dạy render bằng schedule + attendance trước; makeup tháng được preload nền cho popup.
          const coreState=lazyRouteState.core||{};
          const coreAge=Date.now()-(coreState.loadedAt||0);
          // ensurePageData Phase 4A tải core và route song song. Khi core đang tải,
          // route không tự khởi tạo thêm một request /api/classes trùng lặp.
          const shouldRefreshClasses=(!coreState.loaded && !coreState.loading) || (coreState.loaded && coreAge>V22_CORE_ROUTE_REFRESH_TTL_MS);
          const classJob=()=>refreshOfficialClasses({skipSave:true,forceNetwork:!!options.force}).then(changed=>{
            lazyRouteState.core={...(lazyRouteState.core||{}),loaded:true,loading:false,loadedAt:Date.now(),unchanged:!changed};
            return changed;
          });
          if(key==='schedule'){
            if(shouldRefreshClasses) jobs.push(classJob());
            jobs.push(v25RefreshScheduleAndAttendance({skipSave:true,forceNetwork:!!options.force}));
          }
          if(key==='makeup'){
            if(shouldRefreshClasses) jobs.push(classJob());
            jobs.push(refreshOfficialMakeupState({skipSave:true,forceNetwork:!!options.force}));
          }
          if(key==='attendance'){
            if(shouldRefreshClasses) jobs.push(classJob());
            jobs.push(v25RefreshScheduleAndAttendance({skipSave:true,forceNetwork:!!options.force}));
          }
          if(key==='tuition') jobs.push(refreshOfficialTuitionState({skipSave:true,forceNetwork:!!options.force}));
          if(key==='library') jobs.push(refreshOfficialLibrary({skipSave:true,forceNetwork:!!options.force}));
          if(key==='evaluation') jobs.push(refreshOfficialEvaluations({skipSave:true,forceNetwork:!!options.force}));
          if(key==='teachers') jobs.push(refreshOfficialTeachers({skipSave:true,forceNetwork:!!options.force}));
          const results=await Promise.allSettled(jobs);
          anyChanged=v18iAnyChanged(results);
        });
        if(key==='makeup') v18fUpdateMakeupModuleCache();
        lazyRouteState[key]={loaded:true,loading:false,loadedAt:Date.now(),unchanged:!anyChanged,fromCache:false,refreshingAfterCache:false};
        saveLocalOnly();
        if(key==='schedule') v22PreloadVisibleMakeupMonths();
      }catch(e){
        console.warn('Lazy route refresh failed',r,e);
        lazyRouteState[key]={loaded:false,loading:false,error:e?.message||String(e)};
      }
      // V18I: nếu refresh nền trả về dữ liệu không đổi thì không render lại để tránh nháy UI.
      if(!options.prefetch && route===startedRoute && (!wasLoadedBefore || anyChanged)) renderApp();
      v7l1ResolveRouteLoadWaiters(key);
      return anyChanged;
    }
    async function ensurePageData(r, options={}){
      if(!currentUser) return;
      const jobs=[];
      // Phase 4A: /api/classes, route state và attendance state bắt đầu cùng lúc.
      // ensureCoreData được gọi trước nên cờ core.loading đã bật trước khi ensureRouteData kiểm tra.
      if(routeNeedsCoreData(r)) jobs.push(ensureCoreData(options));
      if(routeNeedsLazyData(r)) jobs.push(ensureRouteData(r, options));
      if(jobs.length) await Promise.all(jobs);
    }

    let v20cPrefetchTimer=null;
    let v20cPrefetchRunId=0;
    let v20cPrefetchActive=false;

    function v20cAvailableRouteSet(){
      try{
        return new Set((navItems()||[]).map(n=>n && n[0]).filter(Boolean));
      }catch(e){
        const fallback=['overview','classes','schedule','makeup','homework','evaluation','teachers','settings'];
        if(canViewTuition()) fallback.push('tuition');
        return new Set(fallback);
      }
    }
    function v20cPrefetchPlan(fromRoute){
      const adminLike=canManageOperations();
      const teacherLike=isTeachingUser();
      const plan={
        overview: adminLike?['schedule','homework']:teacherLike?['schedule','homework']:['homework','evaluation'],
        classes:['schedule'],
        // Phase 4A: không preload Học phí tự động từ Lịch dạy/Điểm danh.
        // Học phí chỉ tải khi người dùng thực sự mở tab đó.
        schedule: adminLike?[]:['evaluation'],
        makeup:['schedule'],
        tuition:['schedule'],
        homework:['evaluation'],
        evaluation:['schedule'],
        teachers:['settings','schedule'],
        settings:['teachers','schedule']
      };
      const allowed=v20cAvailableRouteSet();
      const seenKeys=new Set();
      return (plan[fromRoute]||['schedule'])
        .filter(r=>r && r!==fromRoute && allowed.has(r) && routeNeedsLazyData(r))
        .filter(r=>{
          const key=routeDataKey(r);
          if(seenKeys.has(key)) return false;
          seenKeys.add(key);
          return true;
        })
        .slice(0,2);
    }
    function v20cRouteNeedsPrefetch(r){
      if(!currentUser || !routeNeedsLazyData(r)) return false;
      const key=routeDataKey(r);
      const st=lazyRouteState[key]||{};
      if(st.loading || st.prefetching) return false;
      if(st.loaded && Date.now()-(st.loadedAt||0)<V20C_PREFETCH_RECENT_MS) return false;
      return true;
    }
    function v20cRunWhenIdle(fn){
      if(typeof window!=='undefined' && typeof window.requestIdleCallback==='function'){
        window.requestIdleCallback(fn,{timeout:1600});
      }else{
        setTimeout(fn,0);
      }
    }
    async function v20cPrefetchRoutes(fromRoute,runId){
      if(v20cPrefetchActive) return;
      v20cPrefetchActive=true;
      try{
        const list=v20cPrefetchPlan(fromRoute).filter(v20cRouteNeedsPrefetch);
        for(const r of list){
          if(runId!==v20cPrefetchRunId || !currentUser || currentUser.mustChangePassword) break;
          if(document.getElementById('modalBackdrop')?.classList.contains('show')) break;
          const key=routeDataKey(r);
          lazyRouteState[key]={...(lazyRouteState[key]||{}),prefetching:true};
          try{
            await ensureRouteData(r,{prefetch:true});
          }catch(e){
            console.warn('V20C prefetch failed',r,e);
          }finally{
            if(lazyRouteState[key]?.prefetching) lazyRouteState[key]={...(lazyRouteState[key]||{}),prefetching:false};
            saveLocalOnly();
          }
          await new Promise(resolve=>setTimeout(resolve,V20C_PREFETCH_GAP_MS));
        }
      }finally{
        v20cPrefetchActive=false;
      }
    }
    function v20cSchedulePrefetch(fromRoute=route){
      if(!currentUser || currentUser.mustChangePassword) return;
      clearTimeout(v20cPrefetchTimer);
      const runId=++v20cPrefetchRunId;
      v20cPrefetchTimer=setTimeout(()=>{
        if(runId!==v20cPrefetchRunId) return;
        if(!currentUser || currentUser.mustChangePassword) return;
        if(document.getElementById('modalBackdrop')?.classList.contains('show')) return;
        v20cRunWhenIdle(()=>v20cPrefetchRoutes(fromRoute,runId));
      },V20C_PREFETCH_DELAY_MS);
    }
    function isRouteWaitingForData(r){
      if(routeNeedsCoreData(r)){
        if(!lazyRouteState.core?.loaded) hydrateRouteCache('overview');
        if(!lazyRouteState.core?.loaded) return true;
      }
      if(!routeNeedsLazyData(r)) return false;
      const key=routeDataKey(r);
      if(!lazyRouteState[key]?.loaded) hydrateRouteCache(r);
      return !lazyRouteState[key]?.loaded;
    }
    normalizeV9Data();
    function mapBackendUser(u){
      if(!u) return null;
      return {id:u.id,name:u.name,phone:u.phone,password:'',roles:u.roles||[],mustChangePassword:!!u.mustChangePassword,status:u.status||'active'};
    }
    async function officialFetch(path,options={}){
      return window.MsNetworkRuntime.request(path,options);
    }
    // Phase 6: cross-device synchronization through Supabase Realtime Broadcast.
    // Only cache scopes are broadcast by the database; business rows and student
    // information are always reloaded through the authenticated application APIs.
    const V27_REALTIME_VENDOR_SRC='/v15/vendor/supabase.js?v=2.110.2';
    const V27_REALTIME_ALLOWED_MODULES=new Set(['core','teachers','schedule','attendance','makeup','tuition','library','evaluation']);
    const V27_REALTIME_LOCAL_SUPPRESS_MS=5000;
    const V27_REALTIME_DEBOUNCE_MS=850;
    const v27Realtime={
      client:null,
      channel:null,
      startPromise:null,
      reconnectTimer:null,
      flushTimer:null,
      generation:0,
      status:'idle',
      reason:'',
      pendingModules:new Set(),
      pendingTables:new Set(),
      localMutationAt:new Map(),
      stats:{received:0,merged:0,localEchoes:0,refreshes:0,reconnects:0,lastEventAt:0,lastSubscribedAt:0}
    };
    function v27RecordLocalMutation(keys=[]){
      const now=Date.now();
      v21NormalizeMutationModules(keys).forEach(key=>v27Realtime.localMutationAt.set(key,now));
    }
    function v27StoreMarkPrefixStale(prefix){
      const value=String(prefix||'');
      if(!value) return;
      Array.from(v26SharedStore.entries.keys()).filter(key=>String(key).startsWith(value)).forEach(key=>v26StoreInvalidate(key,{markStale:true}));
    }
    function v27MarkLazyStateStale(key){
      const state=lazyRouteState[key];
      if(state?.loaded) lazyRouteState[key]={...state,loaded:true,loading:false,sharedFresh:false,realtimeStale:true,loadedAt:0};
    }
    function v27MarkRealtimeCachesStale(keys=[]){
      const modules=new Set(v21NormalizeMutationModules(keys));
      v18gClearNetworkCache();
      if(modules.has('core')){
        v26StoreInvalidate(v26StoreKey('core'),{markStale:true});
        v27MarkLazyStateStale('core');
      }
      if(modules.has('teachers')){
        v26StoreInvalidate(v26StoreKey('teachers','latest'),{markStale:true});
        v27MarkLazyStateStale('teachers');
      }
      if(modules.has('schedule')||modules.has('attendance')){
        v27StoreMarkPrefixStale('week:');
        v27MarkLazyStateStale('schedule');
        v27MarkLazyStateStale('attendance');
        v18Memo.weekKey='';
        v18Memo.weekSessions=null;
      }
      if(modules.has('makeup')){
        v27StoreMarkPrefixStale('makeup:');
        for(const month of Array.from(v22MakeupMonthMemoryCache.keys())) v22InvalidateMakeupMonthMemory(month);
        v27MarkLazyStateStale('makeup');
      }
      if(modules.has('tuition')){
        v27StoreMarkPrefixStale('tuition:');
        v27MarkLazyStateStale('tuition');
      }
      if(modules.has('library')){
        v26StoreInvalidate(v26StoreKey('library','latest'),{markStale:true});
        v27MarkLazyStateStale('library');
      }
      if(modules.has('evaluation')){
        v27StoreMarkPrefixStale('evaluation:');
        v27MarkLazyStateStale('evaluation');
      }
    }
    function v27ActiveRouteAffected(keys=[]){
      const modules=new Set(v21NormalizeMutationModules(keys));
      const active=routeDataKey(route);
      if(active==='schedule') return modules.has('schedule')||modules.has('attendance')||modules.has('makeup')||modules.has('core');
      if(active==='attendance') return modules.has('attendance')||modules.has('schedule')||modules.has('makeup')||modules.has('core');
      if(active==='makeup') return modules.has('makeup')||modules.has('schedule')||modules.has('attendance')||modules.has('core');
      if(active==='tuition') return modules.has('tuition')||modules.has('core');
      if(active==='library') return modules.has('library');
      if(active==='evaluation') return modules.has('evaluation')||modules.has('core');
      if(active==='teachers') return modules.has('teachers')||modules.has('core');
      return active==='core'&&modules.has('core');
    }
    function v27ModalBlocksRefresh(){
      return !!modalBackdrop?.classList?.contains('show');
    }
    function v27ArmRealtimeFlush(delay=V27_REALTIME_DEBOUNCE_MS){
      clearTimeout(v27Realtime.flushTimer);
      v27Realtime.flushTimer=null;
      // Phase 7I: merge events while hidden and flush once after visibility resumes.
      if(document.visibilityState==='hidden') return;
      v27Realtime.flushTimer=setTimeout(()=>{
        v27Realtime.flushTimer=null;
        v27FlushRealtimeEvents().catch(error=>console.warn('Realtime refresh failed',error));
      },Math.max(0,Number(delay)||0));
    }
    async function v27FlushRealtimeEvents(){
      if(!currentUser || !v27Realtime.pendingModules.size) return false;
      if(document.visibilityState==='hidden') return false;
      if(v27ModalBlocksRefresh()){
        v27ArmRealtimeFlush(1200);
        return false;
      }
      const modules=Array.from(v27Realtime.pendingModules);
      v27Realtime.pendingModules.clear();
      v27Realtime.pendingTables.clear();
      const now=Date.now();
      const isLikelyLocalEcho=modules.some(key=>now-Number(v27Realtime.localMutationAt.get(key)||0)<V27_REALTIME_LOCAL_SUPPRESS_MS);
      if(isLikelyLocalEcho) v27Realtime.stats.localEchoes++;
      if(!v27ActiveRouteAffected(modules)) return true;
      v27Realtime.stats.refreshes++;
      await v21ScheduleMutationRefresh(modules,{
        delayMs:isLikelyLocalEcho?3600:120,
        force:true,
        renderOnRevalidate:true
      });
      return true;
    }
    function v27HandleRealtimePayload(payload={}){
      if(!currentUser || Number(payload?.v)!==1) return;
      const modules=v21NormalizeMutationModules(Array.isArray(payload?.modules)?payload.modules:[])
        .filter(key=>V27_REALTIME_ALLOWED_MODULES.has(key))
        .filter(key=>key!=='tuition'||canViewTuition());
      if(!modules.length) return;
      v27Realtime.stats.received++;
      v27Realtime.stats.lastEventAt=Date.now();
      modules.forEach(key=>{
        if(v27Realtime.pendingModules.has(key)) v27Realtime.stats.merged++;
        v27Realtime.pendingModules.add(key);
      });
      if(payload?.table) v27Realtime.pendingTables.add(String(payload.table));
      // Keep the current UI visible, but mark all affected shared snapshots stale.
      // The active screen is revalidated after a short debounce; inactive screens
      // reuse their stale snapshot immediately and refresh when opened.
      v27MarkRealtimeCachesStale(modules);
      v27ArmRealtimeFlush();
    }
    function v27LoadRealtimeVendor(){
      if(window.supabase?.createClient) return Promise.resolve(window.supabase);
      const existing=document.querySelector('script[data-msgiang-realtime-vendor]');
      if(existing){
        return new Promise((resolve,reject)=>{
          if(window.supabase?.createClient) return resolve(window.supabase);
          existing.addEventListener('load',()=>resolve(window.supabase),{once:true});
          existing.addEventListener('error',()=>reject(new Error('Không tải được Supabase Realtime client')),{once:true});
        });
      }
      return new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src=V27_REALTIME_VENDOR_SRC;
        script.async=true;
        script.dataset.msgiangRealtimeVendor='1';
        script.onload=()=>window.supabase?.createClient?resolve(window.supabase):reject(new Error('Supabase Realtime client không hợp lệ'));
        script.onerror=()=>reject(new Error('Không tải được Supabase Realtime client'));
        document.head.appendChild(script);
      });
    }
    function v27ScheduleReconnect(delay=5000){
      if(!currentUser || currentUser.mustChangePassword) return;
      clearTimeout(v27Realtime.reconnectTimer);
      v27Realtime.reconnectTimer=setTimeout(()=>{
        v27Realtime.reconnectTimer=null;
        if(document.visibilityState==='hidden') return v27ScheduleReconnect(5000);
        v27Realtime.stats.reconnects++;
        v27StopRealtime({preservePending:true});
        v27StartRealtime();
      },Math.max(1500,Number(delay)||5000));
    }
    async function v27StartRealtime(){
      if(!currentUser || currentUser.mustChangePassword) return false;
      if(v27Realtime.status==='subscribed') return true;
      if(v27Realtime.startPromise) return v27Realtime.startPromise;
      const generation=++v27Realtime.generation;
      v27Realtime.status='connecting';
      v27Realtime.reason='';
      v27Realtime.startPromise=(async()=>{
        try{
          const config=await officialFetch('/api/realtime/config',{noDedupe:true,preserveGetCache:true});
          if(generation!==v27Realtime.generation) return false;
          if(!config?.enabled){
            v27Realtime.status='disabled';
            v27Realtime.reason=String(config?.reason||'disabled');
            return false;
          }
          await v27LoadRealtimeVendor();
          if(generation!==v27Realtime.generation) return false;
          const client=window.supabase.createClient(config.url,config.key,{
            auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
            realtime:{params:{eventsPerSecond:20}}
          });
          const channel=client.channel(config.topic,{
            config:{private:false,broadcast:{self:false,ack:false}}
          });
          channel.on('broadcast',{event:'db-change'},message=>v27HandleRealtimePayload(message?.payload||{}));
          v27Realtime.client=client;
          v27Realtime.channel=channel;
          channel.subscribe((status,error)=>{
            if(generation!==v27Realtime.generation) return;
            v27Realtime.status=String(status||'unknown').toLowerCase();
            if(status==='SUBSCRIBED'){
              v27Realtime.status='subscribed';
              v27Realtime.reason='';
              v27Realtime.stats.lastSubscribedAt=Date.now();
              clearTimeout(v27Realtime.reconnectTimer);
            }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
              v27Realtime.reason=String(error?.message||status||'connection_error');
              v27ScheduleReconnect(status==='CLOSED'?3500:5000);
            }
          });
          return true;
        }catch(error){
          if(generation!==v27Realtime.generation) return false;
          v27Realtime.status='error';
          v27Realtime.reason=String(error?.message||error||'connection_error');
          console.warn('Realtime disabled temporarily',error);
          v27ScheduleReconnect(6000);
          return false;
        }finally{
          if(generation===v27Realtime.generation) v27Realtime.startPromise=null;
        }
      })();
      return v27Realtime.startPromise;
    }
    function v27StopRealtime(options={}){
      v27Realtime.generation++;
      clearTimeout(v27Realtime.reconnectTimer);
      v27Realtime.reconnectTimer=null;
      clearTimeout(v27Realtime.flushTimer);
      v27Realtime.flushTimer=null;
      const client=v27Realtime.client;
      const channel=v27Realtime.channel;
      v27Realtime.client=null;
      v27Realtime.channel=null;
      v27Realtime.startPromise=null;
      v27Realtime.status='idle';
      v27Realtime.reason='';
      if(!options.preservePending){
        v27Realtime.pendingModules.clear();
        v27Realtime.pendingTables.clear();
        v27Realtime.localMutationAt.clear();
      }
      try{if(client&&channel) client.removeChannel(channel)}catch(e){}
      try{client?.realtime?.disconnect?.()}catch(e){}
    }
    if(typeof window!=='undefined'){
      window.msgiangRealtime={
        status:()=>({
          status:v27Realtime.status,
          reason:v27Realtime.reason,
          buildVersion:window.MSGIANG_BUILD_VERSION||'20phase8-student-transfer-schedule-attendance',
          pendingModules:Array.from(v27Realtime.pendingModules),
          ...v27Realtime.stats
        }),
        reconnect:()=>{v27StopRealtime({preservePending:true});return v27StartRealtime()},
        disconnect:()=>v27StopRealtime()
      };
    }

    function applyOfficialSettings(settings){
      if(!settings) return;
      db.settings ||= {};
      const billingAllowed=canViewTuition();
      if(billingAllowed && (settings.tuition_per_session!==undefined || settings.unitPrice!==undefined)){
        db.settings.unitPrice=Number(settings.tuition_per_session??settings.unitPrice??70000);
      }else if(!billingAllowed){
        delete db.settings.unitPrice;
        delete db.settings.tuitionFilter;
      }
      db.settings.capacity=Number(settings.session_capacity||settings.capacity||15);
      if(typeof v26StoreSet==='function'){
        const safeSettings={capacity:db.settings.capacity};
        if(billingAllowed) safeSettings.unitPrice=db.settings.unitPrice||70000;
        v26StoreSet(v26StoreKey('settings','latest'),{settings:safeSettings},{ttl:V26_SHARED_STORE_TTL.settings,source:'settings-api'});
      }
    }
    function applyBootstrapSnapshot(snapshot){
      if(!snapshot || typeof snapshot!=='object') return;
      const incomingSettings=v18hResetPersistedTuitionSearch(snapshot.settings||{});
      db.settings={...(db.settings||{}),...incomingSettings};
      if(db.settings?.tuitionFilter) db.settings.tuitionFilter.q='';
      if(snapshot.managerClassScope!==undefined) db.managerClassScope=snapshot.managerClassScope;
      db.libraryTab='all'; db.libraryQ=''; db.libraryLevel='all'; db.librarySkill='all'; db.libraryUnit='all';
    }
    async function bootstrapOfficial(){
      let renderedEarly=false;
      try{
        const data=await officialFetch('/api/bootstrap');
        currentUser=mapBackendUser(data.user);
        applyBootstrapSnapshot(data.snapshot);
        applyOfficialSettings(data.settings);
        scrubTuitionDataForCurrentUser();
        // Khi tải lại trang trong tab Lịch dạy, luôn bắt đầu ở tuần hiện tại.
        if(route==='schedule') resetScheduleWeekToCurrent();
        if(currentUser){
          v20b4ResetRouteLoadState();
          v20b4ResetSessionMemo();
          const bootstrapSettings={capacity:db.settings?.capacity||15};
          if(canViewTuition()) bootstrapSettings.unitPrice=db.settings?.unitPrice||70000;
          v26StoreSet(v26StoreKey('settings','latest'),{settings:bootstrapSettings},{ttl:V26_SHARED_STORE_TTL.settings,source:'bootstrap'});
          v18gClearNetworkCache();
          v18hCleanupLegacyStorage();
          clearVolatileOfficialState();
          const hadCoreCache=hydrateRouteCache('overview');
          const hadPageCache=routeNeedsLazyData(route) ? hydrateRouteCache(route) : false;
          if(hadCoreCache || hadPageCache){
            render();
            renderedEarly=true;
          }
          if(hadCoreCache) ensureCoreData({force:true});
          else await ensureCoreData({force:true});
          if(routeNeedsLazyData(route)){
            if(hadPageCache) ensureRouteData(route,{force:true});
            else await ensureRouteData(route,{force:true});
          }
        }
      }catch(e){
        console.warn('Official bootstrap failed',e);
        currentUser=null;
      }
      if(!renderedEarly) render();
      if(currentUser && !currentUser.mustChangePassword){
        v27StartRealtime();
        window.MsSmartWarmup?.schedule?.('bootstrap');
      }
    }
    function queueOfficialSave(){
      if(!currentUser) return;
      clearTimeout(officialSaveTimer);
      officialSaveTimer=setTimeout(async()=>{
        try{
          // Keep the tuition search query local to the current page session.
          const payload={...db,libraryTab:'all',libraryQ:'',libraryLevel:'all',librarySkill:'all',libraryUnit:'all',settings:{...(db.settings||{})}};
          if(payload.settings.tuitionFilter){
            payload.settings.tuitionFilter={...payload.settings.tuitionFilter,q:''};
          }
          await officialFetch('/api/v48-state',{method:'POST',body:JSON.stringify({payload})});
        }
        catch(e){console.warn('Official save failed',e);}
      },650);
    }
    async function updateBackendSetting(key,value,msg){
      if(!currentUser?.roles?.includes('admin')) return;
      try{
        const data=await officialFetch('/api/settings',{method:'POST',body:JSON.stringify({key,value})});
        applyOfficialSettings(data.settings);
        toast(msg||'Đã cập nhật cài đặt');
        save();
      }catch(e){toast(e.message||'Không cập nhật được cài đặt')}
    }
    
    
    
    function scrubTuitionDataForCurrentUser(){
      if(canViewTuition()) return;
      db.tuitionRollup={};
      db.tuitionRollupMonth='';
      db.payments={};
      db.tuitionMessages={};
      db.settings ||= {};
      delete db.settings.unitPrice;
      delete db.settings.tuitionFilter;
      if(route==='tuition') route='overview';
      try{v26StoreInvalidatePrefix('tuition:')}catch(e){}
      try{
        const store=readModuleCacheStore();
        Object.keys(store||{}).filter(k=>k.startsWith('tuition:')).forEach(k=>delete store[k]);
        writeModuleCacheStore(store);
      }catch(e){console.warn('Không dọn được cache học phí',e)}
    }
    function clearVolatileOfficialState(){
      db.classes=[];
      db.classCancellations={};
      db.classMakeupSessions=[];
      db.makeupPlans=[];
      db.attendanceSessions={};
      db.absenceRecords=[];
      db.tuitionRollup={};
      db.tuitionRollupMonth='';
      db.payments={};
      db.tuitionMessages={};
      scrubTuitionDataForCurrentUser();
    }

    async function runRefreshWithoutRepeatedSaves(fn){
      const previous=suppressLocalSave;
      suppressLocalSave=true;
      try{return await fn();}
      finally{suppressLocalSave=previous;}
    }

    async function refreshAllOfficialDataForCurrentUser(options={}){
      if(!currentUser) return;
      const includeCurrentPageOnly = options.includeCurrentPageOnly !== false;

      await runRefreshWithoutRepeatedSaves(async()=>{
        await ensureCoreData({force:true});
        if(includeCurrentPageOnly && routeNeedsLazyData(route)) await ensureRouteData(route,{force:true});
      });

      saveLocalOnly();
    }

    async function refreshOfficialDataInBackground(){
      if(!currentUser) return;
      try{
        await ensurePageData(route);
      }catch(e){console.warn('Background refresh failed',e)}
    }

    async function refreshOfficialClasses(options={}){
      if(!currentUser) return false;
      try{
        v20aLastCoreLoadError='';
        const loaded=await v26StoreLoad(v26StoreKey('core'),async()=>{
          const data=await officialFetch('/api/classes');
          return {classes:data.classes||[],teachers:Array.isArray(data.teachers)?data.teachers:[]};
        },{ttl:V26_SHARED_STORE_TTL.core,force:!!options.forceNetwork,source:'classes-api'});
        if(!loaded?.payload) return false;
        const payload=loaded.payload;
        const changed=v18iHashPayload('classes:latest',payload);
        const localMissingClassTime=(payload.classes||[]).some(pc=>{
          const lc=(db.classes||[]).find(c=>String(c.id)===String(pc.id));
          return pc?.id && String(pc.time||'').trim() && (!lc || !String(lc.time||'').trim());
        });
        const localNeedsApply=((db.classes||[]).length===0 && payload.classes.length>0) || ((db.teachers||[]).length===0 && payload.teachers.length>0) || localMissingClassTime;
        if(changed || localNeedsApply){
          db.classes=payload.classes;
          if(payload.teachers.length) db.teachers=payload.teachers;
          v18Touch();
          if(!options.skipSave) save();
        }
        moduleCacheSet('classes:latest', payload);
        return changed || localNeedsApply;
      }catch(e){
        v20aLastCoreLoadError=e?.message||'Không tải được lớp thật';
        console.warn('Không tải được lớp thật',e);
        return false
      }
    }
    async function refreshOfficialTeachers(options={}){
      if(!currentUser || !(currentUser.roles||[]).some(r=>r==='admin'||r==='manager'||r==='receptionist')) return false;
      try{
        const loaded=await v26StoreLoad(v26StoreKey('teachers','latest'),async()=>{
          const data=await officialFetch('/api/staff/overview');
          return {teachers:data.teachers||[],users:isAdmin()?(data.users||[]):[]};
        },{ttl:V26_SHARED_STORE_TTL.teachers,force:!!options.forceNetwork,source:'staff-overview-api'});
        if(!loaded?.payload) return false;
        const payload=loaded.payload;
        const changed=v18iHashPayload('teachers:latest',payload);
        if(changed){
          db.teachers=payload.teachers||[];
          if(isAdmin()) db.users=payload.users||[];
          v18Touch();
          if(!options.skipSave) save();
        }
        moduleCacheSet('teachers:latest', payload);
        return changed;
      }catch(e){console.warn('Không tải được giáo viên/tài khoản thật',e); return false}
    }

    async function refreshVisibleClassMakeups(options={}){
      // V20B.13: /api/schedule/state đã trả luôn class makeup visible theo user hiện tại.
      // Giữ hàm này dạng no-op để tương thích code cũ, tránh gọi thêm API thứ hai khi vào Lịch dạy.
      return false;
    }

    async function v26FetchWeekBundle(start,end){
      const scheduleData=await officialFetch(`/api/schedule/state?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      const bundled=scheduleData.attendanceBundled===true;
      let attendanceData=null;
      if(!bundled){
        attendanceData=await officialFetch(`/api/attendance/state?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      }
      const attendanceSessions=bundled?(scheduleData.attendanceSessions||{}):(attendanceData?.attendanceSessions||{});
      const absenceRecords=bundled?(scheduleData.absenceRecords||[]):(attendanceData?.absenceRecords||[]);
      const schedulePayload={
        classCancellations:scheduleData.classCancellations||{},
        classMakeupSessions:scheduleData.classMakeupSessions||[],
        makeupPlans:scheduleData.makeupPlans||[],
        sourceAbsenceRecords:scheduleData.sourceAbsenceRecords||[],
        attendanceBundled:true,
        attendanceSessions,
        absenceRecords
      };
      return {
        start,
        end,
        schedule:schedulePayload,
        attendance:{attendanceSessions,absenceRecords},
        attendanceBundled:true,
        serverBundled:bundled,
        mode:scheduleData.mode||'legacy'
      };
    }
    function v26ApplyWeekBundle(bundle,options={}){
      const start=bundle?.start||isoDate(weekStartDate());
      const schedulePayload=bundle?.schedule||{};
      const attendancePayload=bundle?.attendance||{attendanceSessions:{},absenceRecords:[]};
      const scheduleChanged=v18iHashPayload(`schedule:${start}`,schedulePayload);
      const attendanceChanged=v18iHashPayload(`attendance:${start}`,attendancePayload);
      const localNeedsScheduleApply=
        (!Object.keys(db.classCancellations||{}).length && Object.keys(schedulePayload.classCancellations||{}).length>0) ||
        (!(db.classMakeupSessions||[]).length && (schedulePayload.classMakeupSessions||[]).length>0) ||
        (schedulePayload.classMakeupSessions||[]).some(m=>!(db.classMakeupSessions||[]).some(x=>String(x.id||x.sourceSessionKey)===String(m.id||m.sourceSessionKey) && String(x.teacherId||'')===String(m.teacherId||''))) ||
        (!(db.makeupPlans||[]).length && (schedulePayload.makeupPlans||[]).length>0) ||
        (schedulePayload.sourceAbsenceRecords||[]).some(a=>!(db.absenceRecords||[]).some(x=>String(x.id)===String(a.id) && String(x.status||'')===String(a.status||'') && String(x.updatedAt||'')===String(a.updatedAt||'')));
      const localNeedsAttendanceApply=
        (!Object.keys(db.attendanceSessions||{}).length && Object.keys(attendancePayload.attendanceSessions||{}).length>0) ||
        (!(db.absenceRecords||[]).length && (attendancePayload.absenceRecords||[]).length>0);
      if(scheduleChanged || attendanceChanged || localNeedsScheduleApply || localNeedsAttendanceApply || options.forceApply){
        db.classCancellations=schedulePayload.classCancellations||{};
        // The week bundle is the single source for Schedule and Attendance.
        // Apply both together so one module can never keep an older week snapshot.
        db.classMakeupSessions=schedulePayload.classMakeupSessions||[];
        v20b7MergeClassSnapshotsFromMakeups(db.classMakeupSessions);
        db.makeupPlans=schedulePayload.makeupPlans||[];
        db.attendanceSessions=attendancePayload.attendanceSessions||{};
        db.absenceRecords=[...(attendancePayload.absenceRecords||[])];
        if(schedulePayload.sourceAbsenceRecords?.length) mergeAbsenceRecords(schedulePayload.sourceAbsenceRecords);
        v18Touch();
        if(!options.skipSave) save();
      }
      const scheduleCache={
        classCancellations:db.classCancellations||{},
        classMakeupSessions:db.classMakeupSessions||[],
        makeupPlans:db.makeupPlans||[],
        sourceAbsenceRecords:schedulePayload.sourceAbsenceRecords||[],
        attendanceBundled:true,
        attendanceSessions:db.attendanceSessions||{},
        absenceRecords:attendancePayload.absenceRecords||[]
      };
      const attendanceCache={attendanceSessions:db.attendanceSessions||{},absenceRecords:attendancePayload.absenceRecords||[]};
      moduleCacheSet(`schedule:${start}`,scheduleCache);
      moduleCacheSet(`attendance:${start}`,attendanceCache);
      return scheduleChanged||attendanceChanged||localNeedsScheduleApply||localNeedsAttendanceApply||!!options.forceApply;
    }
    async function v26RefreshWeekState(options={}){
      if(!currentUser) return {changed:false,attendanceBundled:false};
      try{
        const start=isoDate(weekStartDate());
        const end=isoDate(addDays(weekStartDate(),7));
        const storeKey=v26WeekStoreKey(start);
        const loaded=await v26StoreLoad(storeKey,()=>v26FetchWeekBundle(start,end),{
          ttl:V26_SHARED_STORE_TTL.week,
          force:!!options.forceNetwork,
          source:'schedule-week-api'
        });
        const bundle=loaded?.payload||null;
        if(!bundle) return {changed:false,attendanceBundled:false};
        const changed=v26ApplyWeekBundle(bundle,options);
        return {changed,attendanceBundled:true,serverBundled:bundle.serverBundled!==false,fromStore:!!loaded.fromStore,mode:bundle.mode||''};
      }catch(e){
        console.warn('Không tải được dữ liệu lịch/điểm danh',e);
        return {changed:false,attendanceBundled:false};
      }
    }
    async function refreshOfficialScheduleState(options={}){
      const result=await v26RefreshWeekState(options);
      return options.returnMeta?result:!!result.changed;
    }
    async function refreshOfficialAttendanceState(options={}){
      const result=await v26RefreshWeekState(options);
      return !!result.changed;
    }
    async function v25RefreshScheduleAndAttendance(options={}){
      const result=await v26RefreshWeekState(options);
      return !!result.changed;
    }

    function v22MakeupPayload(month,data={}){
      return {
        makeupMonth:data.month||data.makeupMonth||month,
        makeupPlans:data.makeupPlans||[],
        absenceRecords:data.absenceRecords||[],
        attendanceSessions:data.attendanceSessions||{},
        supportClasses:data.supportClasses||[],
        deletedMonths:data.deletedMonths||[],
        availableMonths:data.availableMonths||data.months||[],
        pendingScope:data.pendingScope||''
      };
    }
    function v22MakeupMonthGenerationValue(month){
      return Number(v22MakeupMonthGeneration.get(String(month||''))||0);
    }
    function v22InvalidateMakeupMonthMemory(month){
      const key=String(month||'');
      if(!key) return;
      v22MakeupMonthGeneration.set(key,v22MakeupMonthGenerationValue(key)+1);
      v22MakeupMonthMemoryCache.delete(key);
      v22MakeupMonthInflight.delete(key);
      v26StoreInvalidate(v26MakeupStoreKey(key));
    }
    function v22RememberMakeupMonthPayload(month,payload){
      if(!/^\d{4}-\d{2}$/.test(String(month||'')) || !payload) return payload;
      const copy=v18gCloneJson(payload);
      v22MakeupMonthMemoryCache.set(month,{ts:Date.now(),payload:copy});
      v26StoreSet(v26MakeupStoreKey(month),copy,{ttl:V26_SHARED_STORE_TTL.makeup,source:'makeup-memory'});
      moduleCacheSet(makeupModuleCacheKey(month),copy);
      return payload;
    }
    function v22FreshMakeupMonthPayload(month){
      const shared=v26StoreGet(v26MakeupStoreKey(month));
      if(shared?.payload) return v18gCloneJson(shared.payload);
      const mem=v22MakeupMonthMemoryCache.get(String(month||''));
      if(mem && Date.now()-mem.ts<V22_MAKEUP_PREFETCH_TTL_MS) return v18gCloneJson(mem.payload);
      return null;
    }
    function v22CurrentMakeupStateFresh(month){
      return !!(db.makeupTabState && db.makeupTabState.month===month && db.makeupTabState.pendingScope==='all-open-months' && Date.now()-(db.makeupTabState.updatedAt||0)<V22_MAKEUP_PREFETCH_TTL_MS);
    }
    function v22ApplyMakeupPayloadForPopup(month,payload){
      if(!payload) return false;
      applyCachedPayload('makeup',{...payload,makeupMonth:month});
      if(db.makeupTabState) db.makeupTabState.updatedAt=Date.now();
      v22RememberMakeupMonthPayload(month,{...payload,makeupMonth:month});
      v18Touch();
      saveLocalOnly();
      return true;
    }
    async function v22PreloadMakeupMonth(month,options={}){
      const key=String(month||'');
      if(!/^\d{4}-\d{2}$/.test(key) || !currentUser) return null;
      if(!options.force){
        const cached=v22FreshMakeupMonthPayload(key);
        if(cached) return cached;
        if(v22CurrentMakeupStateFresh(key)){
          return v22MakeupPayload(key,{
            month:key,
            makeupPlans:db.makeupTabState.makeupPlans||[],
            absenceRecords:db.makeupTabState.absenceRecords||[],
            attendanceSessions:db.makeupTabState.attendanceSessions||{},
            supportClasses:db.makeupTabState.supportClasses||[],
            deletedMonths:db.deletedMakeupMonths||[],
            availableMonths:db.makeupAvailableMonths||[],
            pendingScope:db.makeupTabState.pendingScope||''
          });
        }
      }
      if(v22MakeupMonthInflight.has(key)) return v18gCloneJson(await v22MakeupMonthInflight.get(key));
      const generation=v22MakeupMonthGenerationValue(key);
      const promise=officialFetch(`/api/makeup/state?month=${encodeURIComponent(key)}`).then(async data=>{
        const payload=v22MakeupPayload(key,data);
        if(generation!==v22MakeupMonthGenerationValue(key)){
          const fresh=v22FreshMakeupMonthPayload(key);
          return fresh || v22PreloadMakeupMonth(key,{force:true});
        }
        return v22RememberMakeupMonthPayload(key,payload);
      });
      v22MakeupMonthInflight.set(key,promise);
      try{return v18gCloneJson(await promise)}
      finally{if(v22MakeupMonthInflight.get(key)===promise) v22MakeupMonthInflight.delete(key)}
    }
    function v22VisibleWeekMonthKeys(){
      const start=weekStartDate();
      const months=new Set();
      for(let i=0;i<7;i++) months.add(isoDate(addDays(start,i)).slice(0,7));
      return Array.from(months).filter(m=>/^\d{4}-\d{2}$/.test(m));
    }
    function v22PreloadVisibleMakeupMonths(){
      if(!currentUser || !canScheduleMakeup()) return;
      const months=v22VisibleWeekMonthKeys();
      months.forEach((month,index)=>{
        setTimeout(()=>v22PreloadMakeupMonth(month).catch(e=>console.warn('Makeup month preload failed',month,e)),index*120);
      });
    }
    function preloadScheduleMakeupForSession(sessionKey){
      const month=sessionKeyMonth(String(sessionKey||''))||makeupCurrentMonthKey();
      v22PreloadMakeupMonth(month).catch(()=>{});
    }

    async function refreshOfficialMakeupState(options={}){
      if(!currentUser) return false;
      try{
        const month=options.month || makeupSelectedMonthKey();
        const payload=await v22PreloadMakeupMonth(month,{force:!!options.forceNetwork});
        if(!payload) return false;
        const changed=v18iHashPayload(`makeup:${month}`,payload);
        const currentState=(db.makeupTabState && db.makeupTabState.month===month) ? db.makeupTabState : {};
        const currentMakeupComparable={
          makeupMonth:currentState.month||db.makeupMonth||'',
          makeupPlans:currentState.makeupPlans||[],
          absenceRecords:currentState.absenceRecords||[],
          attendanceSessions:currentState.attendanceSessions||{},
          supportClasses:currentState.supportClasses||[],
          deletedMonths:db.deletedMakeupMonths||[],
          availableMonths:db.makeupAvailableMonths||[],
          pendingScope:currentState.pendingScope||''
        };
        const payloadComparable={
          makeupMonth:payload.makeupMonth||month,
          makeupPlans:payload.makeupPlans||[],
          absenceRecords:payload.absenceRecords||[],
          attendanceSessions:payload.attendanceSessions||{},
          supportClasses:payload.supportClasses||[],
          deletedMonths:payload.deletedMonths||[],
          availableMonths:payload.availableMonths||[],
          pendingScope:payload.pendingScope||''
        };
        const localNeedsApply=JSON.stringify(currentMakeupComparable)!==JSON.stringify(payloadComparable);
        if(changed || localNeedsApply || options.applyGlobal){
          db.makeupMonth=payload.makeupMonth||month;
          db.makeupTabState={
            month:db.makeupMonth,
            makeupPlans:payload.makeupPlans||[],
            absenceRecords:payload.absenceRecords||[],
            attendanceSessions:payload.attendanceSessions||{},
            supportClasses:payload.supportClasses||[],
            pendingScope:payload.pendingScope||'',
            updatedAt:Date.now()
          };
          v20tMergeSupportClasses(payload.supportClasses||[]);
          // Khi đang ở tab Học bù, đồng bộ global để các thao tác phụ dùng dữ liệu tháng đúng.
          // Khi sang Lịch dạy/Điểm danh, global có thể bị thay bằng subset theo tuần nhưng
          // db.makeupTabState vẫn giữ nguồn dữ liệu tháng cho tab Học bù.
          if(route==='makeup' || options.applyGlobal){
            db.makeupPlans=payload.makeupPlans||[];
            db.absenceRecords=payload.absenceRecords||[];
          }
          db.deletedMakeupMonths=payload.deletedMonths||db.deletedMakeupMonths||[];
          db.makeupAvailableMonths=payload.availableMonths||db.makeupAvailableMonths||[];
          db.attendanceSessions={...(db.attendanceSessions||{}),...(payload.attendanceSessions||{})};
          v18Touch();
          if(!options.skipSave) save();
        }
        moduleCacheSet(makeupModuleCacheKey(month), payload);
        return changed || localNeedsApply || !!options.applyGlobal;
      }catch(e){console.warn('Không tải được dữ liệu học bù theo tháng',e); return false}
    }


    function tuitionMonthKey(){
      db.settings ||= {};
      db.settings.tuitionFilter ||= {};
      return db.settings.tuitionFilter.month || new Date().toISOString().slice(0,7);
    }
    function formatTuitionMonth(key=tuitionMonthKey()){
      const [y,m]=String(key).split('-');
      return m&&y?`Tháng ${m} / ${y}`:'Tháng hiện tại';
    }
    function tuitionMonthParts(key=tuitionMonthKey()){
      const now=new Date();
      const [y,m]=String(key||'').split('-');
      const year=/^\d{4}$/.test(y||'')?y:String(now.getFullYear());
      const month=/^\d{2}$/.test(m||'')?m:String(now.getMonth()+1).padStart(2,'0');
      return {year,month};
    }
    function tuitionMonthOptions(selected=tuitionMonthParts().month){
      return Array.from({length:12},(_,i)=>{
        const value=String(i+1).padStart(2,'0');
        return `<option value="${value}" ${value===selected?'selected':''}>Tháng ${i+1}</option>`;
      }).join('');
    }
    async function setTuitionMonthPart(part,value){
      const f=tuitionFilterState();
      const cur=tuitionMonthParts(f.month);
      const month=part==='month'?String(value).padStart(2,'0'):cur.month;
      const year=part==='year'?String(value||cur.year).replace(/\D/g,'').slice(0,4):cur.year;
      if(!/^\d{4}$/.test(year)){toast('Nhập năm gồm 4 số');return}
      f.month=`${year}-${month}`;
      db.tuitionRollup={};
      db.tuitionRollupMonth='';
      db.payments={};
      db.tuitionMessages={};
      v20o2InvalidateTuitionRows();
      lazyRouteState.tuition={};
      hydrateRouteCache('tuition');
      saveLocalOnly();
      renderApp();
      toast('Đang tải học phí '+formatTuitionMonth(f.month));
      try{
        await ensureRouteData('tuition',{force:true});
        if(route==='tuition') renderApp();
      }catch(e){console.warn('Không tải được học phí tháng mới',e)}
    }
    async function refreshOfficialTuitionState(options={}){
      if(!currentUser || !(currentUser.roles||[]).some(r=>r==='admin'||r==='manager')) return false;
      try{
        const month=tuitionMonthKey();
        const loaded=await v26StoreLoad(v26TuitionStoreKey(month),async()=>{
          const data=await officialFetch(`/api/tuition/state?month=${encodeURIComponent(month)}`);
          return {
            tuitionRollup:data.rollups||{},
            tuitionRollupMonth:data.monthKey||month,
            payments:data.payments||{},
            tuitionMessages:data.tuitionMessages||{},
            unitPrice:data.unitPrice?Number(data.unitPrice):(db.settings?.unitPrice||70000)
          };
        },{ttl:V26_SHARED_STORE_TTL.tuition,force:!!options.forceNetwork,source:'tuition-api'});
        if(!loaded?.payload) return false;
        const payload=loaded.payload;
        const changed=v18iHashPayload(`tuition:${month}`,payload);
        if(changed){
          db.tuitionRollup=payload.tuitionRollup||{};
          db.tuitionRollupMonth=payload.tuitionRollupMonth||month;
          db.payments=payload.payments||{};
          db.tuitionMessages=payload.tuitionMessages||{};
          db.settings.unitPrice=Number(payload.unitPrice||db.settings?.unitPrice||70000);
          v18Touch();
          if(!options.skipSave) save();
        }
        moduleCacheSet(`tuition:${month}`, payload);
        return changed;
      }catch(e){console.warn('Không tải được dữ liệu học phí',e); return false}
    }

    async function refreshOfficialLibrary(options={}){
      if(!currentUser || !(currentUser.roles||[]).some(r=>['admin','manager','receptionist','teacher','ta'].includes(r))) return false;
      try{
        const loaded=await v26StoreLoad(v26StoreKey('library','latest'),async()=>{
          const data=await officialFetch('/api/library');
          return {exerciseLibrary:data.items||[]};
        },{ttl:V26_SHARED_STORE_TTL.library,force:!!options.forceNetwork,source:'library-api'});
        if(!loaded?.payload) return false;
        const payload=loaded.payload;
        const changed=v18iHashPayload('library:latest',payload);
        if(changed){
          db.exerciseLibrary=payload.exerciseLibrary||[];
          v18Memo.library={}; v18Memo.libraryCatalogStats={}; v18Memo.libraryFilterValues={};
          v18Touch();
          if(!options.skipSave) save();
        }
        moduleCacheSet('library:latest', payload);
        return changed;
      }catch(e){console.warn('Không tải được thư viện bài tập',e); if(options.throwOnError) throw e; return false}
    }

    function evaluationMonthKey(){
      db.settings ||= {};
      db.settings.evaluationFilter ||= {};
      db.settings.evaluationFilter.month ||= new Date().toISOString().slice(0,7);
      return db.settings.evaluationFilter.month;
    }
    function formatEvaluationMonth(key=evaluationMonthKey()){
      const [y,m]=String(key||'').split('-');
      return y&&m?`Tháng ${m} / ${y}`:'Tháng hiện tại';
    }
    function evaluationMonthParts(key=evaluationMonthKey()){
      const now=new Date();
      const [y,m]=String(key||'').split('-');
      const year=/^\d{4}$/.test(y||'')?y:String(now.getFullYear());
      const month=/^\d{2}$/.test(m||'')?m:String(now.getMonth()+1).padStart(2,'0');
      return {year,month};
    }
    function evaluationMonthOptions(selected=evaluationMonthParts().month){
      return Array.from({length:12},(_,i)=>{
        const value=String(i+1).padStart(2,'0');
        return `<option value="${value}" ${value===selected?'selected':''}>Tháng ${i+1}</option>`;
      }).join('');
    }
    async function setEvaluationMonthPart(part,value){
      const cur=evaluationMonthParts(evaluationMonthKey());
      const month=part==='month'?String(value).padStart(2,'0'):cur.month;
      const year=part==='year'?String(value||cur.year).replace(/\D/g,'').slice(0,4):cur.year;
      if(!/^\d{4}$/.test(year)){toast('Nhập năm gồm 4 số');return}
      db.settings.evaluationFilter ||= {};
      db.settings.evaluationFilter.month=`${year}-${month}`;
      lazyRouteState.evaluation={};
      // V18F: không xóa cache tháng; hydrate cache trước rồi refresh thật.
      v18fRenderCacheFirst('evaluation');
    }
    async function refreshOfficialEvaluations(options={}){
      if(!currentUser || !(currentUser.roles||[]).some(r=>['admin','manager','receptionist','teacher','ta'].includes(r))) return false;
      try{
        const currentMonth=evaluationMonthKey();
        const loaded=await v26StoreLoad(v26EvaluationStoreKey(currentMonth),async()=>{
          const data=await officialFetch(`/api/evaluations?month=${encodeURIComponent(currentMonth)}`);
          return {evaluations:data.items||[]};
        },{ttl:V26_SHARED_STORE_TTL.evaluation,force:!!options.forceNetwork,source:'evaluation-api'});
        if(!loaded?.payload) return false;
        const payload=loaded.payload;
        const changed=v18iHashPayload(`evaluation:${currentMonth}`,payload);
        if(changed){
          const other=(db.evaluations||[]).filter(e=>normalizeEvaluationMonthValue(e.monthKey||e.month)!==currentMonth);
          db.evaluations=[...other,...(payload.evaluations||[])];
          v18Touch();
          if(!options.skipSave) save();
        }
        moduleCacheSet(`evaluation:${currentMonth}`, payload);
        return changed;
      }catch(e){console.warn('Không tải được đánh giá thật',e); return false}
    }

    function schedulePayloadFromNewClassForm(){
      const count=Number(document.getElementById('newSessionCount')?.value||1);
      const schedules=[];
      for(let i=1;i<=count;i++){
        const day=document.getElementById(`newDay${i}`)?.value || 'Mon';
        const slot=timeSlotByValue(document.getElementById(`newSlot${i}`)?.value || '17:00-18:30');
        schedules.push({day,start:slot.start,end:slot.end});
      }
      return schedules;
    }

    function normalizeV9Data(){
      db.settings ||= {};
      db.settings.evaluationFilter ||= {month:new Date().toISOString().slice(0,7)};
      if(!['all','word','pdf','audio'].includes(db.libraryTab)) db.libraryTab='all';
      db.evaluations ||= [];
      db.evaluations.forEach(e=>{e.monthKey ||= normalizeEvaluationMonthValue?normalizeEvaluationMonthValue(e.month):new Date().toISOString().slice(0,7); e.month=e.monthKey});
    }
        function save(){if(suppressLocalSave) return; v18Touch(); v18ScheduleLocalSave(); queueOfficialSave()}
    function saveLocalOnly(){v18Touch(); v18ScheduleLocalSave()}
    let v20eLastSavedRoute=localStorage.getItem('msgiang_v48_route') || '';
    function saveUser(){
      if(route===v20eLastSavedRoute) return;
      try{
        localStorage.setItem('msgiang_v48_route', route);
        v20eLastSavedRoute=route;
      }catch(e){console.warn('Route save failed',e)}
    }
    const hasRole = r => currentUser?.roles?.includes(r);
    const isAdmin = () => hasRole('admin'); const isManager = () => hasRole('manager'); const isReceptionist = () => hasRole('receptionist'); const isTeacher = () => hasRole('teacher'); const isTA = () => hasRole('ta'); const isTeachingUser = () => isTeacher() || isTA(); const isParent = () => hasRole('parent');
    const canManageOperations = () => isAdmin() || isManager() || isReceptionist();
    const canViewTuition = () => isAdmin() || isManager();
    const canManageTuition = () => isAdmin() || isManager();
    const canScheduleMakeup = () => canManageOperations() || isTeachingUser();
    const teacherByName = n => db.teachers.find(t=>t.name===n) || {};
    const teacherById = id => db.teachers.find(t=>t.id===id) || {};
    const currentTeacherName = () => currentUser?.name;
    const currentTeacherRecord = () => db.teachers.find(t=>t.phone===currentUser?.phone || t.name===currentUser?.name) || {};
    const classById = id => v18BuildIndex().classMap.get(id) || {};
    const studentById = id => v18BuildIndex().studentMap.get(id) || {};
    const allStudents = () => v18BuildIndex().students;

    function normalizeClassOperations(){
      db.classCancellations ||= {};
      db.classMakeupSessions ||= [];
      db.classes.forEach(c=>{
        c.status ||= 'active';
        c.startDate ||= '2026-06-01';
        c.students ||= [];
      });
    }
    function isTutoringSupportClass(c){
      return String(c?.note||'').startsWith('__tutoring_session__') || String(c?.grade||'').toLowerCase()==='học kèm';
    }
    function operationalClasses(){
      normalizeClassOperations();
      return (db.classes||[]).filter(c=>!isTutoringSupportClass(c));
    }
    function classStartDate(c){return parseISODate(c.startDate || '2026-06-01')}
    function classEndDate(c){return c.endDate?parseISODate(c.endDate):null}
    function classActiveForSchedule(c){
      const st=String(c?.status||'active').toLowerCase();
      return !['ended','inactive','cancelled','canceled','deleted','archived'].includes(st);
    }
    function classSessionVisible(c,dateStr){
      if(!classActiveForSchedule(c)) return false;
      const d=parseISODate(dateStr); d.setHours(0,0,0,0);
      const s=classStartDate(c); s.setHours(0,0,0,0);
      const e=classEndDate(c); if(e) e.setHours(23,59,59,999);
      return d>=s && (!e || d<=e);
    }
    function sessionCancelRecord(sessionKey){normalizeClassOperations(); return db.classCancellations[sessionKey] || null}
    function isSessionCancelled(sessionKey){return !!sessionCancelRecord(sessionKey)}
    function classMakeupForSourceSession(sessionKey){
      return (db.classMakeupSessions||[]).find(m=>m.sourceSessionKey===sessionKey && m.status!=='cancelled') || null;
    }
    function classMakeupSessionKey(m){
      if(!m) return '';
      return `${m.classId}|${m.date}|${m.day}|${m.start}-${m.end}`;
    }
    function classMakeupForAnySessionKey(sessionKey){
      const direct=classMakeupForSourceSession(sessionKey);
      if(direct) return direct;
      const parts=String(sessionKey||'').split('|');
      if(parts.length<4) return null;
      const [classId,date,day,slot]=parts;
      const [start,end]=String(slot||'').split('-');
      return (db.classMakeupSessions||[]).find(m=>
        m.status!=='cancelled' &&
        String(m.classId)===String(classId) &&
        String(m.date)===String(date) &&
        String(m.day)===String(day) &&
        String(m.start)===String(start) &&
        String(m.end)===String(end)
      ) || null;
    }
    function classMakeupHasSavedAttendance(m){
      const key=classMakeupSessionKey(m);
      if(!key) return false;
      return !!ensureAttendanceSessions()[attendanceKey(key)]?.saved;
    }
    function classMakeupLabel(m){
      if(!m) return '';
      const date=m.date?formatVNDate(parseISODate(m.date)):'';
      const day=dayNameFromKey(m.day)||m.day||'';
      const slot=`${m.start||''} - ${m.end||''}`.trim();
      const teacher=m.teacher?` • GV: ${m.teacher}`:'';
      return `${day}${date?` ${date}`:''}${slot?` • ${slot}`:''}${teacher}`;
    }
    function classMakeupTeacherOptions(selectedId='',fallbackTeacherId=''){
      const active=(db.teachers||[]).filter(t=>t.status!=='inactive');
      const chosen=String(selectedId||fallbackTeacherId||'');
      return active.map(t=>`<option value="${t.id}" ${String(t.id)===chosen?'selected':''}>${h(t.name)}${t.roles?.includes('manager')?' • Quản lí':''}</option>`).join('');
    }
    function classMakeupAssignedToCurrentTeacher(m){
      const me=currentTeacherRecord();
      if(String(m.teacherId||'') || String(m.assistantTeacherId||'')){
        return !!me?.id && (String(m.teacherId||'')===String(me.id) || String(m.assistantTeacherId||'')===String(me.id));
      }
      // Fallback chỉ cho dữ liệu cũ chưa có teacherId.
      const n=String(currentUser?.name||'').toLowerCase();
      const t=String(m.teacher||'').toLowerCase();
      return !!n && !!t && (t===n || t.includes(n) || n.includes(t));
    }
    function weekEndDate(){return addDays(weekStartDate(),6)}
    function nextDateForDay(dayKey){
      const today=new Date(); today.setHours(0,0,0,0);
      const idx=WEEK_DAYS.findIndex(d=>d.key===dayKey);
      const target=(idx+1)%7;
      const delta=(target - today.getDay() + 7) % 7;
      return addDays(today, delta);
    }
    function firstUpcomingDateFromForm(){
      const count=Number(document.getElementById('newSessionCount')?.value||1);
      let best=null;
      for(let i=1;i<=count;i++){
        const day=document.getElementById(`newDay${i}`)?.value || 'Mon';
        const d=nextDateForDay(day);
        if(!best || d<best) best=d;
      }
      return best || new Date();
    }
    function ensureLifecycle(){
      normalizeClassOperations();
      if(db._v32Lifecycle) return;
      const c=classById('c07');
      if(c?.id){c.endDate ||= '';}
      db._v32Lifecycle=true;
      save();
    }


    function classBelongsToTeacher(c,name=currentUser?.name||''){
      const me=currentTeacherRecord();
      if(me?.id && (c.teacherId===me.id || c.taId===me.id)) return true;
      const n=String(name).toLowerCase();
      const t=String(c.teacher||'').toLowerCase();
      const ta=String(c.ta||'').toLowerCase();
      if(!n) return false;
      if(t===n || ta===n || t.includes(n) || ta.includes(n)) return true;
      const aliases={kate:['kate','an (kate)'],giang:['giang','stella'],dung:['dung'],luna:['luna','chi']};
      return Object.values(aliases).some(list=>list.some(a=>n.includes(a)) && list.some(a=>t.includes(a)||ta.includes(a)));
    }

    const classesForTeachingUser = () => {
      normalizeClassOperations();
      if(isAdmin()) return operationalClasses();
      // /api/classes đã giới hạn đúng phạm vi Giáo viên/TA ở phía server.
      // Không lọc lại bằng tên/SĐT ở trình duyệt vì hồ sơ cũ hoặc tên đổi có thể
      // làm mất lớp và khiến giáo viên không mở được điểm danh.
      if(isTeachingUser()) return operationalClasses();
      if(isParent()) return operationalClasses().filter(c=>c.students.some(s=>selectedParentChildIds().includes(s.id)));
      return [];
    };
    const classesForUser = () => {
      normalizeClassOperations();
      const key=v18FastKey()+'|classesForUser';
      v18Memo.classesForUser ||= {};
      if(v18Memo.classesForUser.key===key) return v18Memo.classesForUser.rows;
      let rows=[];
      if(canManageOperations()) rows=operationalClasses();
      else if(isTeachingUser()) rows=operationalClasses();
      else if(isParent()){
        const selected=new Set(selectedParentChildIds());
        rows=operationalClasses().filter(c=>(c.students||[]).some(s=>selected.has(s.id)));
      }
      v18Memo.classesForUser={key,rows};
      return rows;
    };

    function managerOwnedClasses(){
      normalizeClassOperations();
      return operationalClasses().filter(c=>classBelongsToTeacher(c,currentUser.name));
    }
    function managerScopeValue(key){
      db[key] ||= 'mine';
      return db[key] || 'mine';
    }
    function setManagerScope(key,value){
      db[key]=value==='all'?'all':'mine';
      save(); render();
    }
    function managerScopeControl(key,label){
      if(!isManager() || isAdmin()) return '';
      const val=managerScopeValue(key);
      return `<div class="managerScopeBox"><label>${label}<select class="input" onchange="setManagerScope('${key}',this.value)"><option value="mine" ${val==='mine'?'selected':''}>Chỉ lớp mình dạy</option><option value="all" ${val==='all'?'selected':''}>Tất cả các lớp</option></select></label><span class="pill ${val==='mine'?'blue':'gray'}">${val==='mine'?'Đang lọc lớp mình dạy':'Đang hiện tất cả'}</span></div>`;
    }
    function classesForClassPage(){
      if(isManager() && !isAdmin()) return managerScopeValue('managerClassScope')==='all'?db.classes:managerOwnedClasses();
      return classesForUser();
    }
    function ensurePayments(){db.payments ||= {}; return db.payments}
    function paymentKey(studentId){return `${tuitionMonthKey()}_${studentId}`}
    function isPaid(studentId){return !!ensurePayments()[paymentKey(studentId)]}













    function ensureTuitionMessages(){db.tuitionMessages ||= {}; return db.tuitionMessages}
    function isTuitionMessageSent(studentId){return !!ensureTuitionMessages()[paymentKey(studentId)]?.sent}






















    function parentChildren(){return allStudents().filter(s=>(currentUser.children||[]).includes(s.id))}
    function selectedParentChildId(){
      const kids=parentChildren(); if(!kids.length) return null;
      currentUser.selectedChildId ||= kids[0].id;
      if(!kids.some(k=>k.id===currentUser.selectedChildId)) currentUser.selectedChildId=kids[0].id;
      return currentUser.selectedChildId;
    }
    function selectedParentChildIds(){return isParent()?[selectedParentChildId()].filter(Boolean):(currentUser.children||[])}
    function setParentChild(id){currentUser.selectedChildId=id; saveUser(); render()}

    function normalizePhone(v){
      const s=String(v||'').trim();
      if(s==='admin') return 'admin';
      return s.replace(/\D/g,'');
    }
    function findUserByPhone(phone){
      const p=normalizePhone(phone);
      return db.users.find(u=>normalizePhone(u.phone)===p);
    }
    function generateTempPassword(){return String(Math.floor(100000+Math.random()*900000))}
    function userRoleLabel(u){
      if(u.roles?.includes('admin')) return 'Admin';
      if(u.roles?.includes('manager')) return 'Quản lí';
      if(u.roles?.includes('receptionist')) return 'Lễ tân';
      if(u.roles?.includes('ta')) return 'TA / Trợ giảng';
      if(u.roles?.includes('teacher')) return 'Giáo viên';
      if(u.roles?.includes('parent')) return 'Phụ huynh';
      return 'User';
    }
    function issueTempPasswordToUser(u){
      const temp=generateTempPassword();
      u.password=temp;
      u.tempPassword=temp;
      u.mustChangePassword=true;
      u.tempIssuedAt=new Date().toLocaleString('vi-VN');
      return temp;
    }
    function showTempPasswordModal(title,phone,temp,after='close'){
      modal(`<div class="modalHead"><h2>${title}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="credentialBox">
        <div class="credentialLine"><span>Tài khoản</span><b>${phone}</b></div>
        <div class="credentialLine"><span>Mật khẩu tạm</span><span class="credentialValue">${temp}</span></div>
        <div class="mini">Gửi thông tin này cho người dùng qua Zalo/SMS. Khi đăng nhập, hệ thống sẽ bắt đổi mật khẩu mới.</div>
      </div>
      <div style="text-align:right"><button class="btn primary" onclick="${after==='render'?'closeModal();render()':'closeModal()'}">Đã hiểu</button></div>`)
    }
    function createOrLinkParentAccount(parentName,phone,studentId){
      const p=normalizePhone(phone);
      if(!p || p.length<8) return {user:null,created:false,temp:null};
      let u=findUserByPhone(p);
      if(u){
        u.roles ||= ['parent'];
        if(!u.roles.includes('parent')) u.roles.push('parent');
        u.children ||= [];
        if(!u.children.includes(studentId)) u.children.push(studentId);
        return {user:u,created:false,temp:null};
      }
      const temp=generateTempPassword();
      u={id:'parent_'+Date.now(),name:parentName||('Phụ huynh '+p.slice(-4)),phone:p,password:temp,roles:['parent'],children:[studentId],mustChangePassword:true,tempPassword:temp,tempIssuedAt:new Date().toLocaleString('vi-VN')};
      db.users.push(u);
      return {user:u,created:true,temp};
    }
    async function resetUserPassword(userId,trigger=null){
      if(!isAdmin()){toast('Chỉ Admin được reset tài khoản Lễ tân');return}
      const u=(db.users||[]).find(x=>String(x.id)===String(userId));
      if(!u){toast('Không tìm thấy tài khoản');return}
      if(v7hStaffModalDirty()){v7hStaffFeedback('Hãy lưu hoặc bỏ thay đổi trước khi reset mật khẩu.','error');return}
      const action=v7hBeginStaffAction(`reset:receptionist:${userId}`,trigger||document.getElementById('resetReceptionistPasswordBtn'),'Đang reset...');
      if(!action) return;
      try{
        const data=await officialFetch(`/api/users/${encodeURIComponent(userId)}/reset-password`,{method:'POST',body:'{}'});
        u.mustChangePassword=true;
        v29PersistStaffMutation('receptionist-password-reset');
        v7hEndStaffAction(action);
        showTempPasswordModal('Đã reset mật khẩu Lễ tân',u.phone,data.tempPassword,'close');
      }catch(e){
        v7hEndStaffAction(action);
        v7hShowStaffError(e.message||'Không reset được mật khẩu');
      }
    }
    function openCreateReceptionistModal(){
      if(!isAdmin()){toast('Chỉ Admin được tạo tài khoản Lễ tân');return}
      modal(`<div data-staff-modal="receptionist-create" class="staffModalContent"><div class="modalHead"><h2>+ Tạo tài khoản Lễ tân</h2><button class="close" onclick="closeModal()">×</button></div><div class="staffModalScroll"><div class="formGrid"><label>Họ tên<input id="receptionistName" class="input" placeholder="VD: Nguyễn Thị Lan"></label><label>Số điện thoại / tài khoản<input id="receptionistPhone" class="input" inputmode="tel" placeholder="VD: 0987654321"></label><label class="full">Email<input id="receptionistEmail" class="input" type="email" placeholder="Không bắt buộc"></label></div><div data-staff-feedback class="staffModalFeedback" hidden></div></div><div class="staffModalFooter"><div></div><div><button class="btn ghost" onclick="closeModal()">Hủy</button><button id="saveReceptionistBtn" class="btn primary" onclick="saveReceptionistAccount()">Tạo tài khoản</button></div></div></div>`)
    }
    async function saveReceptionistAccount(){
      if(!isAdmin()) return;
      v7hClearStaffErrors();
      const name=(document.getElementById('receptionistName')?.value||'').trim();
      const phone=normalizePhone(document.getElementById('receptionistPhone')?.value||'');
      const email=(document.getElementById('receptionistEmail')?.value||'').trim();
      let valid=true;
      if(!name){v7hInlineFieldError('receptionistName','Nhập họ tên Lễ tân');valid=false}
      if(phone.length<8){v7hInlineFieldError('receptionistPhone','Số điện thoại/tài khoản chưa hợp lệ');valid=false}
      if(!v7hValidEmail(email)){v7hInlineFieldError('receptionistEmail','Email chưa đúng định dạng');valid=false}
      if(!valid){modalBackdrop.querySelector('.inputError')?.focus();return}
      const action=v7hBeginStaffAction('create:receptionist',document.getElementById('saveReceptionistBtn'),'Đang tạo...');
      if(!action) return;
      try{
        const data=await officialFetch('/api/users',{method:'POST',body:JSON.stringify({name,phone,email,role:'receptionist'})});
        db.users||=[];
        db.users=db.users.filter(u=>String(u.id)!==String(data.user?.id));
        if(data.user) db.users.push(data.user);
        v29PersistStaffMutation('receptionist-created');
        if(data.user) v29RefreshStaffUi('receptionist',data.user);
        v7hEndStaffAction(action);
        showTempPasswordModal('Đã tạo tài khoản Lễ tân',phone,data.tempPassword,'close');
      }catch(e){
        v7hEndStaffAction(action);
        v7hStaffFeedback(e.message||'Không tạo được tài khoản Lễ tân','error');
      }
    }

    function parentAccountRows(){
      return db.users.filter(u=>u.roles?.includes('parent')).map(u=>({user:u,kids:(u.children||[]).map(studentById).filter(s=>s.id)}));
    }
    function forceChangePasswordPage(){
      return `<div class="forcePasswordWrap"><div class="forcePasswordCard">
        <div class="forcePasswordHeader"><div class="forcePasswordIcon">🔐</div><div><h1>Đổi mật khẩu</h1><p class="forceIntro">Tài khoản đang sử dụng mật khẩu tạm. Vui lòng đặt mật khẩu mới để tiếp tục sử dụng hệ thống.</p></div></div>
        <div class="credentialBox"><div class="credentialLine"><span>Tài khoản</span><b>${currentUser.phone}</b></div><div class="credentialLine"><span>Vai trò</span><b>${userRoleLabel(currentUser)}</b></div></div>
        <div class="passwordFormGrid">
          <label>Mật khẩu mới<input id="forcePw1" class="input" type="password" placeholder="Tối thiểu 6 ký tự"></label>
          <label>Nhập lại mật khẩu<input id="forcePw2" class="input" type="password" placeholder="Nhập lại mật khẩu mới"></label>
        </div>
        <div class="passwordActions"><button class="btn primary" onclick="saveForcedPassword()">Lưu mật khẩu mới</button><button class="btn ghost" onclick="logout()">Đăng xuất</button></div>
      </div></div>`;
    }
    function renderForceChangePassword(){root.innerHTML=forceChangePasswordPage()}
    async function saveForcedPassword(){
      const p1=document.getElementById('forcePw1')?.value||'', p2=document.getElementById('forcePw2')?.value||'';
      if(p1.length<6){toast('Mật khẩu mới tối thiểu 6 ký tự');return}
      if(p1!==p2){toast('Hai mật khẩu chưa giống nhau');return}
      try{
        await officialFetch('/api/auth/change-password',{method:'POST',body:JSON.stringify({password:p1})});
        currentUser.mustChangePassword=false;
        v18dShellKey='';
        route='overview'; saveUser(); render(); v27StartRealtime(); toast('Đã đổi mật khẩu');
      }catch(e){toast(e.message||'Không đổi được mật khẩu')}
    }


    // V20O.2: UX/performance helpers for tuition and class-cancellation workflows.
    const v20o2BusyKeys = new Set();

    function v20o2IsBusy(key){return v20o2BusyKeys.has(String(key||''))}
    function v20o2SetBusy(key,on=true){
      key=String(key||'');
      if(!key) return;
      if(on) v20o2BusyKeys.add(key);
      else v20o2BusyKeys.delete(key);
      document.querySelectorAll(`[data-busy-key="${CSS.escape(key)}"]`).forEach(el=>{
        el.classList.toggle('isBusy', !!on);
        if('disabled' in el) el.disabled=!!on;
        const busyText=el.getAttribute('data-busy-text');
        const idleText=el.getAttribute('data-idle-text');
        if(on && busyText){
          if(!el.getAttribute('data-idle-text')) el.setAttribute('data-idle-text', el.textContent || '');
          el.textContent=busyText;
        }else if(!on && idleText){
          el.textContent=idleText;
          el.removeAttribute('data-idle-text');
        }
      });
    }
    function v20o2BusyButtonAttrs(key,busyText='Đang lưu...'){
      return `data-busy-key="${h(key)}" data-busy-text="${h(busyText)}" ${v20o2IsBusy(key)?'disabled':''}`;
    }












    function parentChildSelector(){
      if(!isParent()) return '';
      const kids=parentChildren(); if(kids.length<=1) return '';
      const selected=selectedParentChildId();
      return `<div class="childSwitch"><b>Chọn học sinh:</b>${kids.map(k=>`<button class="childTab ${k.id===selected?'active':''}" onclick="setParentChild('${k.id}')">${k.name}<span class="mini"> • ${k.className}</span></button>`).join('')}</div>`;
    }
    function gradeSortValue(className){const g=gradeOfClassName(className); if(g==='K') return -1; const n=parseInt(g,10); return Number.isFinite(n)?n:99}

    function sortBillingRows(rows){return [...rows].sort((a,b)=>String(a.className).localeCompare(String(b.className),'vi',{numeric:true})||String(a.student.name).localeCompare(String(b.student.name),'vi'))}
    function groupBillingRowsByClass(rows){
      const key=v18eRowsSignature(rows,'billingGroups|'+tuitionMonthKey());
      v18Memo.billingGroups ||= {};
      if(v18Memo.billingGroups.key===key) return v18Memo.billingGroups.groups;
      const map=new Map();
      // rows đã được sort từ baseBillingRows/filteredBillingRows, không sort lại nếu không cần.
      (rows||[]).forEach(r=>{
        if(!map.has(r.className)) map.set(r.className,{className:r.className,items:[],total:0,paid:0,sent:0});
        const g=map.get(r.className);
        g.items.push(r);
        g.total += Number(r.amount||0);
        if(r.paid) g.paid++;
        if(isTuitionMessageSent(r.student.id)) g.sent++;
      });
      const groups=[...map.values()];
      v18Memo.billingGroups={key,groups};
      return groups;
    }

    function addMonthsToMonthKey(monthKey,offset){
      const [y,m]=String(monthKey||new Date().toISOString().slice(0,7)).split('-').map(Number);
      const d=new Date(Date.UTC(y||new Date().getFullYear(),(m||1)-1+offset,1));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
    }
    function firstDayOfMonthKey(monthKey){return `${monthKey}-01`}
    function nextMonthFirstDay(monthKey){return `${addMonthsToMonthKey(monthKey,1)}-01`}
    function utcDayOfDateText(dateText){return new Date(`${dateText}T00:00:00Z`).getUTCDay()}
    function addDaysText(dateText,days){const d=new Date(`${dateText}T00:00:00Z`); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10)}
    function countClassPlannedSessionsForMonth(c,monthKey=tuitionMonthKey()){
      const sessions=parseClassSessions(c||{});
      if(!sessions.length) return 0;
      const start=firstDayOfMonthKey(monthKey);
      const end=nextMonthFirstDay(monthKey);
      const classStart=String(c?.startDate||start).slice(0,10);
      const classEnd=String(c?.endDate||'').slice(0,10);
      const dayNums=new Set(sessions.map(s=>WEEK_DAYS.findIndex(d=>d.key===s.day)).filter(n=>n>=0));
      let count=0;
      for(let d=start; d<end; d=addDaysText(d,1)){
        if(d<classStart) continue;
        if(classEnd && d>classEnd) continue;
        if(dayNums.has(utcDayOfDateText(d))) count++;
      }
      return count;
    }
    function zeroFeeRow(){return {present:0,late:0,makeup:0,absent:0,excused:0,billable:0,plannedSessions:0,unitPrice:db.settings?.unitPrice||70000,tuitionAmount:0,materialFee:0,materialNote:'',adjustmentAmount:0,adjustmentItems:[],creditAmount:0,creditItems:[],currentAmount:0,previousDebt:0,amount:0,arrearsMonths:[],billingEligible:true,regularStartMonth:''}}
    function feeRowForStudent(st){
      const month=tuitionMonthKey();
      const rollupLoaded=db.tuitionRollupMonth===month;
      const api=(db.tuitionRollup||{})[st.id];

      const normalizeApiRow=(apiRow)=>{
        const plannedSessions=Number(apiRow.plannedSessions ?? apiRow.billable ?? 0);
        const unitPrice=Number(apiRow.unitPrice || db.settings?.unitPrice || 70000);
        const tuitionAmount=Number(apiRow.tuitionAmount ?? (plannedSessions*unitPrice));
        const materialFee=Number(apiRow.materialFee||0);
        const materialNote=String(apiRow.materialNote||'');
        const adjustmentAmount=Number(apiRow.adjustmentAmount||0);
        const creditAmount=Number(apiRow.creditAmount||0);
        const currentAmount=Number(apiRow.currentAmount ?? Math.max(0,tuitionAmount+materialFee+adjustmentAmount-creditAmount));
        const previousDebt=Number(apiRow.previousDebt||0);
        const amount=Number(apiRow.amount ?? Math.max(0,currentAmount+previousDebt));
        return {
          present:Number(apiRow.present||0),
          late:Number(apiRow.late||0),
          makeup:Number(apiRow.makeup||0),
          absent:Number(apiRow.absent||0),
          excused:Number(apiRow.excused||0),
          billable:plannedSessions,
          plannedSessions,
          unitPrice,
          tuitionAmount,
          materialFee,
          materialNote,
          adjustmentAmount,
          adjustmentItems:apiRow.adjustmentItems||[],
          creditAmount,
          creditItems:apiRow.creditItems||[],
          currentAmount,
          previousDebt,
          arrearsMonths:apiRow.arrearsMonths||[],
          amount,
          billingEligible:apiRow.billingEligible!==false,
          regularStartMonth:String(apiRow.regularStartMonth||''),
          paid:isPaid(st.id)
        };
      };

      if(rollupLoaded){
        if(api) return normalizeApiRow(api);
        const c=classById(st.classId);
        const regularStart=String(st.tuitionRegularStartMonth||'');
        const billingEligible=!regularStart || month>=regularStart;
        const plannedSessions=billingEligible?countClassPlannedSessionsForMonth(c,month):0;
        const unitPrice=db.settings?.unitPrice||70000;
        const tuitionAmount=plannedSessions*unitPrice;
        return {...zeroFeeRow(),billingEligible,regularStartMonth:regularStart,plannedSessions,billable:plannedSessions,unitPrice,tuitionAmount,currentAmount:tuitionAmount,amount:tuitionAmount,paid:isPaid(st.id)}
      }

      const c=classById(st.classId);
      const regularStart=String(st.tuitionRegularStartMonth||'');
      const billingEligible=!regularStart || month>=regularStart;
      const plannedSessions=billingEligible?countClassPlannedSessionsForMonth(c,month):0;
      const unitPrice=db.settings?.unitPrice||70000;
      const tuitionAmount=plannedSessions*unitPrice;
      return {...zeroFeeRow(),billingEligible,regularStartMonth:regularStart,plannedSessions,billable:plannedSessions,unitPrice,tuitionAmount,currentAmount:tuitionAmount,amount:tuitionAmount,paid:isPaid(st.id)}
    }

    function gradeOfClassName(name){
      const cleaned=(name||'').trim();
      let m=cleaned.match(/^G\s*(\d+)\s*\./i);
      if(m) return m[1];
      m=cleaned.match(/^(\d+)\s*\./);
      if(m) return m[1];
      if(/^GK/i.test(cleaned)) return 'K';
      return null;
    }

    function classGradeLabel(name){const g=gradeOfClassName(name); return g==='K'?'Khối K':g?`Khối ${g}`:'Khối khác'}
    function gradeOrderValue(name){const g=gradeOfClassName(name); if(g==='K') return 0; const n=parseInt(g,10); return Number.isFinite(n)?n:99}
    function classNumberValue(name){const m=String(name||'').match(/(?:G\s*)?\d+\s*\.\s*(\d+)/i); return m?parseInt(m[1],10):0}
    function sortClassesByGrade(rows){return [...rows].sort((a,b)=>gradeOrderValue(a.name)-gradeOrderValue(b.name)||classNumberValue(a.name)-classNumberValue(b.name)||String(a.name).localeCompare(String(b.name),'vi',{numeric:true}))}
    function groupClassesByGrade(rows){const map=new Map(); sortClassesByGrade(rows).forEach(c=>{const k=classGradeLabel(c.name); if(!map.has(k)) map.set(k,[]); map.get(k).push(c)}); return [...map.entries()].map(([grade,items])=>({grade,items}))}
    // V19A: class group/list markup moved to /v15/modules/classes.js
    function sameGradeDifferentClass(sourceClassId,targetClassId){
      // V20L: giữ tên hàm để tương thích code cũ, nhưng không còn ràng buộc cùng khối.
      return String(sourceClassId||'')!==String(targetClassId||'');
    }
    function canReceiveMakeupClass(c){
      if(!c?.id) return false;
      const st=String(c.status||'active').toLowerCase();
      return !['ended','inactive','cancelled','canceled','deleted','archived'].includes(st);
    }
    function canReceiveMakeupSession(sessionKey){
      const s=sessionObjectFromKey(sessionKey);
      if(!s) return false;
      if(!canReceiveMakeupClass(classById(s.classId))) return false;
      const st=sessionStatus(s).key;
      // Dùng cho màn điểm danh: buổi chưa dạy được xếp trước, Admin/Quản lí/Lễ tân
      // vẫn được thêm học bù vào màn điểm danh của buổi đã dạy/đã đóng.
      return st==='todo' || (canManageOperations() && st==='done');
    }
    function canOpenScheduleMakeupPopup(sessionKey){
      const s=sessionObjectFromKey(sessionKey);
      if(!s) return false;
      if(!canReceiveMakeupClass(classById(s.classId))) return false;
      // Popup "Xếp học bù" riêng chỉ dùng cho buổi chưa dạy.
      // Buổi đã điểm danh phải thêm học bù trong màn "Mở/Xem điểm danh" rồi lưu lại.
      return sessionStatus(s).key==='todo';
    }
    function makeupSessionPlacementReason(sessionKey){
      const s=sessionObjectFromKey(sessionKey);
      if(!s) return 'Chọn đúng một buổi học trong thời khóa biểu.';
      if(!canReceiveMakeupClass(classById(s.classId))) return 'Không thể xếp học bù vào lớp đã kết thúc hoặc đã hủy.';
      const st=sessionStatus(s);
      if(st.key==='done' && !canManageOperations()) return 'Buổi này đã đóng điểm danh. Chỉ Admin/Quản lí/Lễ tân được xếp học bù bổ sung.';
      if(st.key==='live') return 'Buổi này đang diễn ra. Hãy xếp trước giờ học hoặc để Admin/Quản lí/Lễ tân xử lý sau khi buổi học kết thúc.';
      if(st.key==='cancelled') return 'Không thể xếp học bù vào buổi đã nghỉ.';
      if(st.key!=='todo' && st.key!=='done') return `Buổi này đang ở trạng thái ${st.label||'-'}.`;
      return '';
    }
    function makeupFreeSearchText(...parts){
      return smartSearchIndex(...parts);
    }
    function filterMakeupCandidates(q){
      const rows=[...document.querySelectorAll('[data-makeup-candidate]')];
      let shown=0;
      rows.forEach(row=>{
        const ok=smartSearchMatch(row.dataset.search||'',q);
        row.style.display=ok?'':'none';
        if(ok) shown++;
      });
      document.querySelectorAll('[data-makeup-group]').forEach(group=>{
        const visible=[...group.querySelectorAll('[data-makeup-candidate]')].some(row=>row.style.display!=='none');
        group.style.display=visible?'':'none';
      });
      const el=document.getElementById('makeupSearchCount');
      if(el) el.textContent=`Hiện ${shown}/${rows.length} lượt chờ`;
    }
    function absentCandidatesForTarget(targetClassId){
      // V20L: học bù tự do, không lọc cùng khối. Chỉ loại chính lớp nhận.
      return db.attendance
        .filter(a=>(a.absent||0)+(a.excused||0)>0)
        .map(a=>({att:a, student:studentById(a.studentId), sourceClass:classById(a.classId)}))
        .filter(x=>x.student?.id && x.sourceClass?.id && x.sourceClass.id!==targetClassId);
    }


    function sessionObjectFromKey(key){
      if(!key) return null;
      const parts=String(key).split('|');
      let classId,date,day,slot;
      if(parts.length>=4){[classId,date,day,slot]=parts}else{[classId,day,slot]=parts; date=isoDate(dayDateFor(day))}
      const [start,end] = String(slot||'').split('-');
      const c=classById(classId);
      if(!c?.id || !day || !start || !end) return null;
      const makeup=classMakeupForAnySessionKey(key);
      return {classId, className:c.name, teacher:makeup?.teacher||c.teacher, teacherId:makeup?.teacherId||c.teacherId, ta:c.ta, students:c.students?.length||0, day, date, start, end, slot, raw:c.time, type:makeup?'class_makeup':'regular', sessionKind:makeup?.sessionKind||(makeup?'class_makeup':'regular'), makeupId:makeup?.id||null};
    }



    function absentCountForSession(sessionKey){
      // V20L.4: lịch dạy phải hiện số vắng ngay sau khi lưu điểm danh,
      // Admin/Quản lí/Lễ tân cũng không được điểm danh trước giờ bắt đầu buổi học.
      const s=sessionObjectFromKey(sessionKey); if(!s) return 0;
      return absenteesForSession(sessionKey).length;
    }

    function attendanceSavedForScheduleSession(sessionKey){
      return !!ensureAttendanceSessions()[attendanceKey(sessionKey)]?.saved;
    }
    function scheduleAbsenceCountVisible(sessionKey){
      return attendanceSavedForScheduleSession(sessionKey) || absentCountForSession(sessionKey)>0;
    }
    function scheduleAbsenceBadgeMarkup(sessionKey,mode='full'){
      const absent=absentCountForSession(sessionKey);
      const cls=absent>0?'absenceBtn':'pill green';
      const label=`Vắng: ${absent}`;
      if(absent>0) return `<button class="${cls}" onclick="openAbsencePopup('${sessionKey}')">${label}</button>`;
      return `<span class="${cls}">${label}</span>`;
    }


    function absenteesForSession(sessionKey){
      const s=sessionObjectFromKey(sessionKey); if(!s) return [];
      const c=classById(s.classId);
      ensureAbsenceRecords();

      // 1) Nếu buổi này đã điểm danh thật, số vắng trên lịch phải là tổng vắng của buổi học:
      //    học chính thức vắng + học bù vắng. Học bù vắng chỉ là lịch sử/cần xếp lại,
      //    không tạo thêm absenceRecord mới.
      const rec=ensureAttendanceSessions()[attendanceKey(sessionKey)];
      if(rec?.saved){
        const roster=rosterForAttendance(s.classId,sessionKey);
        return roster.map(x=>{
          const rowKey=`${x.type}_${x.student.id}`;
          const row=rec.rows?.[rowKey];
          if(!rosterRowCountsAsAbsent(x,row)) return null;
          const isOfficial=x.type==='official';
          const isMakeup=x.type==='makeup' || x.type==='manual_makeup';
          const sourceClass=isOfficial ? c : (x.sourceClass||classById(x.student.classId)||c);
          return {
            type:x.type,
            plan:x.plan||null,
            record:isOfficial ? {id:absenceId(x.student.id,sessionKey),reason:row.note||'Vắng'} : null,
            student:x.student,
            sourceClass,
            sourceSessionKey:sessionKey,
            reason:row.note || (isMakeup?'Vắng học bù':'Vắng')
          };
        }).filter(x=>x?.student?.id);
      }

      // 2) Nếu chưa có bản điểm danh đã lưu, chỉ lấy các lượt vắng chính thức đã ghi nhận.
      const fromRecords=db.absenceRecords.filter(a=>a.sourceSessionKey===sessionKey);
      return fromRecords.map(a=>({
        type:'official',
        plan:null,
        record:a,
        student:studentById(a.studentId),
        sourceClass:c,
        sourceSessionKey:sessionKey,
        reason:a.reason||'Vắng'
      })).filter(x=>x.student?.id);
    }

    function completedSessionsSameGrade(targetClassId){
      // V20L: kept for compatibility. Completed absence source sessions can come from any grade.
      return weekSessionsForUser().filter(s=>s.classId!==targetClassId && sessionStatus(s).key==='done');
    }


    function absentCandidatesForTargetSession(targetClassId,targetSessionKey,options={}){
      return pendingAbsenceCandidates(targetClassId,targetSessionKey,options);
    }

    function dayDateForWeek(dayKey,weekStart){
      const idx=WEEK_DAYS.findIndex(d=>d.key===dayKey);
      return addDays(weekStart, idx<0?0:idx);
    }
    function dateTimeForSessionAtWeek(s,field,weekStart){
      const [hh,mm]=String(s[field]||'00:00').split(':').map(Number);
      const d=dayDateForWeek(s.day,weekStart); d.setHours(hh||0,mm||0,0,0); return d;
    }
    function sessionLabelAtWeek(s,weekStart){
      return `${dayNameFromKey(s.day)} ${formatVNDate(dayDateForWeek(s.day,weekStart))} • ${s.start}-${s.end}`;
    }
    function simulatedAbsenteesForCompletedSession(s,weekStart){
      const c=classById(s.classId);
      const a=db.attendance.find(x=>x.classId===s.classId)||{};
      const count=(a.absent||0)+(a.excused||0);
      return (c.students||[]).slice(0,count).map((student,i)=>({
        student:{...student,classId:c.id,className:c.name},
        sourceClass:c,
        sourceSessionKey:sessionKeyFor(s),
        sourceSessionLabel:sessionLabelAtWeek(s,weekStart),
        reason:i < (a.excused||0) ? 'Vắng có phép' : 'Vắng không phép'
      }));
    }

    function completedAbsenceCandidatesBeforeTarget(targetClassId,targetSessionKey){
      return pendingAbsenceCandidates(targetClassId,targetSessionKey);
    }




    
    function rosterStatusPill(row){
      if(!row) return '<span class="pill gray">Chưa điểm danh</span>';
      if(row.status==='present') return '<span class="pill statusPresent">Có mặt</span>';
      if(row.status==='late') return '<span class="pill statusLate">Muộn</span>';
      if(row.status==='absent') return '<span class="pill statusAbsent">Vắng</span>';
      return '<span class="pill gray">Chưa chọn</span>';
    }
    function rosterRowCountsAsAbsent(x,row){
      if(row?.status!=='absent') return false;
      if((x.type==='makeup'||x.type==='manual_makeup') && x.plan && makeupPlanCancelledBySourceCorrection(x.plan)) return false;
      return true;
    }
    function sessionPopupStudentRow(x,sessionKey){
      const rec=ensureAttendanceSessions()[attendanceKey(sessionKey)];
      const row=rec?.rows?.[`${x.type}_${x.student.id}`];
      const source=x.type==='official'?'Học chính thức':x.type==='makeup'?`Học bù từ ${x.sourceClass?.name||'-'}`:'Học bù thêm';
      const history=x.type==='makeup' && x.plan ? `<div class="mini">${h(makeupPlanHistoryText(x.plan))}</div>` : '';
      return `<div class="rosterStudent"><div><b>${h(x.student.name)}</b><div class="mini">${source}${x.student.contact?` • ${h(x.student.contact)}`:''}</div>${history}${row?.note?`<div class="mini">Ghi chú: ${h(row.note)}</div>`:''}</div>${rosterStatusPill(row)}</div>`;
    }
    function openSessionRosterPopup(sessionKey){
      const s=sessionObjectFromKey(sessionKey);
      if(!s){toast('Không tìm thấy buổi học');return}
      const c=classById(s.classId);
      const roster=rosterForAttendance(s.classId,sessionKey);
      const official=roster.filter(x=>x.type==='official');
      const makeups=roster.filter(x=>x.type!=='official');
      const rec=ensureAttendanceSessions()[attendanceKey(sessionKey)];
      const absentRows=roster.filter(x=>rosterRowCountsAsAbsent(x,rec?.rows?.[`${x.type}_${x.student.id}`]));
      const st=scheduleDisplayStatus(s);
      const title=`${s.className} • ${sessionLabelFromKey(sessionKey)}`;
      modal(`<div class="modalHead"><h2>Danh sách buổi học</h2><button class="close" onclick="closeModal()">×</button></div>
        <div class="modalInfoGrid">
          <div><p><b>Lớp:</b> ${h(s.className)}</p><p><b>Thời gian:</b> ${sessionLabelFromKey(sessionKey)}</p><p><b>Giáo viên:</b> ${h(s.teacher||'-')}</p></div>
          <div><p><b>Trạng thái:</b> <span class="statusDot ${st.key}">${st.label}</span></p><p><b>Sĩ số:</b> ${official.length} chính thức + ${makeups.length} học bù = ${roster.length}/${db.settings.capacity||15}</p><p><b>Điểm danh:</b> ${rec?.saved?'Đã lưu':'Chưa lưu'}</p></div>
        </div>
        <div class="sessionRosterGrid">
          <div class="rosterPanel"><h3>Danh sách lớp chính thức (${official.length})</h3><div class="rosterList">${official.length?official.map(x=>sessionPopupStudentRow(x,sessionKey)).join(''):'<div class="empty">Chưa có học sinh chính thức.</div>'}</div></div>
          <div class="rosterPanel"><h3>Học bù trong buổi này (${makeups.length})</h3><div class="rosterList">${makeups.length?makeups.map(x=>sessionPopupStudentRow(x,sessionKey)).join(''):'<div class="empty">Không có học sinh học bù trong buổi này.</div>'}</div></div>
          <div class="rosterPanel" style="grid-column:1/-1"><h3>Học sinh vắng (${absentRows.length})</h3><div class="rosterList">${absentRows.length?absentRows.map(x=>sessionPopupStudentRow(x,sessionKey)).join(''):(rec?.saved?'<div class="empty">Buổi này không có học sinh vắng.</div>':'<div class="empty">Chưa lưu điểm danh nên chưa có danh sách vắng.</div>')}</div></div>
        </div>
        <div class="sessionPopupActions">
          <button class="btn ghost" onclick="closeModal()">Đóng</button>
          ${st.key!=='cancelled'?`<button class="btn primary" onclick="openAttendance('${s.classId}','${sessionKey}',false)">Mở điểm danh</button>`:''}
          ${st.key==='done'&&absentRows.length?`<button class="btn ghost" onclick="openAbsencePopup('${sessionKey}')">Xem vắng</button>`:''}
          ${canScheduleMakeup()&&canOpenScheduleMakeupPopup(sessionKey)?`<button class="btn primary" onclick="openScheduleMakeup('${s.classId}','${sessionKey}')">Xếp học bù</button>`:''}
          ${canManageOperations()&&st.key==='todo'&&s.type!=='class_makeup'?`<button class="btn ghost" onclick="cancelClassSession('${sessionKey}')">Cho nghỉ lớp</button>`:''}
          ${canManageOperations()&&st.key==='cancelled'?`<button class="btn ghost" onclick="uncancelClassSession('${sessionKey}')">Mở lại buổi học</button>`:''}
          ${canManageOperations()&&classMakeupForAnySessionKey(sessionKey)?`<button class="btn ghost" onclick="cancelClassMakeup('${classMakeupForAnySessionKey(sessionKey).sourceSessionKey}')">Hủy dạy bù</button>`:''}
        </div>`);
    }

    function openAbsencePopup(sourceSessionKey){
      const s=sessionObjectFromKey(sourceSessionKey);
      const rows=absenteesForSession(sourceSessionKey);
      modal(`<div class="modalHead"><h2>Danh sách vắng - ${s?.className||''}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="modalInfoGrid"><div><p><b>Buổi học:</b> ${s?sessionLabelFromKey(sourceSessionKey):'-'}</p><p><b>Số học sinh vắng:</b> ${rows.length}</p></div></div>
      ${rows.length?`<div class="modalTableWrap"><table class="modalTable"><thead><tr><th>STT</th><th>Học sinh</th><th>Lớp</th><th>Ghi chú</th><th>Trạng thái</th></tr></thead><tbody>${rows.map((x,i)=>{const isMakeup=x.type==='makeup'||x.type==='manual_makeup'; const status=isMakeup?(x.plan?makeupPlanStatusBadge(x.plan):'<span class="pill red">Vắng học bù</span>'):(x.record?.id?absenceRecordStatusBadge(x.record.id):'<span class="unpaidBadge">Chờ xếp</span>'); const note=isMakeup?`${h(x.reason||'Vắng học bù')}<div class="mini">Cần xếp lại nếu chưa hoàn tất</div>`:h(x.reason||'Vắng'); return `<tr><td>${i+1}</td><td><b>${h(x.student.name)}</b></td><td>${h(x.sourceClass?.name||'-')}</td><td>${note}</td><td>${status}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Buổi này không có học sinh vắng.</div>'}`)
    }



    function plannedMakeupsForClass(classId){
      return activeMakeupPlans().filter(p=>p.targetClassId===classId);
    }

    function makeupStudentsForClass(classId){
      return plannedMakeupsForClass(classId).map(p=>({plan:p, student:studentById(p.studentId), sourceClass:classById(p.sourceClassId)})).filter(x=>x.student?.id);
    }

    function makeupStudentMarkup(classId,compact=false){
      const rows=makeupStudentsForClass(classId);
      if(!rows.length) return compact?'':'<div class="empty">Chưa có học sinh học bù trong lớp/buổi này.</div>';
      if(compact) return rows.map((x,i)=>`<div class="makeupStudentRow" style="--i:${i}"><div><b>${x.student.name}</b><div class="mini">Học bù từ ${x.sourceClass.name} → ${classById(classId).name}</div></div><span class="makeupBadge">Học bù</span></div>`).join('');
      return `<div class="modalTableWrap"><table class="modalTable"><thead><tr><th>STT</th><th>Học sinh</th><th>Lớp chính</th><th>Buổi học bù</th><th>Trạng thái</th><th>Xếp lúc</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td>${i+1}</td><td><b>${x.student.name}</b></td><td>${x.sourceClass.name}</td><td>${x.plan.targetSessionKey?sessionLabelFromKey(x.plan.targetSessionKey):'Tổng lớp'}</td><td><span class="makeupBadge">Học bù</span></td><td>${x.plan.createdAt||'-'}</td></tr>`).join('')}</tbody></table></div>`;
    }

    function sessionKeyFor(s,weekStart=weekStartDate()){
      const date=s.date || isoDate(dayDateForWeek(s.day,weekStart));
      return `${s.classId}|${date}|${s.day}|${s.start}-${s.end}`;
    }
    function sessionLabelFromKey(key){
      if(!key) return 'Tất cả buổi';
      const parts=String(key).split('|');
      let classId,date,day,slot;
      if(parts.length>=4){[classId,date,day,slot]=parts}else{[classId,day,slot]=parts; date=isoDate(dayDateFor(day))}
      const displayDay=dayKeyFromDateText(date)||day;
      return `${dayNameFromKey(displayDay)||displayDay} ${date?formatVNDate(parseISODate(date)):''} • ${(slot||'').replace('-', ' - ')}`;
    }

    function classSessionKeyAtWeek(classId,sessionIndex,weekStart){
      const c=classById(classId); const sessions=parseClassSessions(c); const s=sessions[sessionIndex % sessions.length];
      return sessionKeyFor(s,weekStart);
    }




    function plannedMakeupsForSession(sessionKey){
      return activeMakeupPlans().filter(p=>p.targetSessionKey===sessionKey);
    }

    function makeupPlanSourceAbsenceExists(plan){
      if(!plan?.absenceId) return true;
      return (db.absenceRecords||[]).some(a=>String(a.id)===String(plan.absenceId));
    }
    function makeupPlanCancelledBySourceCorrection(plan){
      // Không cần thêm cột DB: nếu plan đã cancelled nhưng absenceRecord gốc không còn,
      // nghĩa là Admin/Quản lí/Lễ tân đã sửa điểm danh gốc từ Vắng -> Có mặt/Muộn.
      // Trường hợp này không được hiển thị như Vắng học bù và không tính vào sĩ số.
      return String(plan?.status||'')==='cancelled' && plan?.absenceId && !makeupPlanSourceAbsenceExists(plan);
    }
    function makeupPlanVisibleInSessionRoster(plan){
      if(!plan || makeupPlanCancelledBySourceCorrection(plan)) return false;
      const st=String(plan.status||'scheduled');
      // Hủy thủ công từ tab Học bù chỉ là gỡ lịch xếp, không còn hiển thị ở Lịch dạy.
      // Riêng Vắng học bù thật vẫn phải giữ lịch sử trong popup buổi đó.
      if(st==='cancelled' && !makeupPlanMissed(plan) && !makeupPlanCompleted(plan)) return false;
      return true;
    }
    function makeupPlansForSession(sessionKey){
      // Lịch dạy/điểm danh cần xem được scheduled, completed và lịch sử Vắng học bù thật.
      // Không hiển thị plan đã hủy thủ công hoặc hủy do sửa điểm danh gốc.
      normalizeMakeupPlans();
      return (db.makeupPlans||[]).filter(p=>p?.targetSessionKey===sessionKey && makeupPlanVisibleInSessionRoster(p));
    }

    function makeupPlanStatusBadge(plan){
      const st=String(plan?.status||'scheduled');
      if(makeupPlanCancelledBySourceCorrection(plan)) return '<span class="pill gray">Đã hủy xếp học bù</span>';
      if(st==='completed' || makeupPlanCompleted(plan)) return '<span class="pill green">Đã học bù</span>';
      if(st==='cancelled') return makeupPlanMissed(plan)?'<span class="pill red">Vắng học bù</span>':'<span class="pill gray">Đã hủy xếp học bù</span>';
      if(makeupPlanMissed(plan)) return '<span class="pill red">Vắng học bù</span>';
      return '<span class="makeupBadge">Đã xếp học bù</span>';
    }

    function makeupPlanHistoryText(plan){
      const st=String(plan?.status||'scheduled');
      if(makeupPlanCancelledBySourceCorrection(plan)) return 'Đã hủy do sửa điểm danh gốc';
      if(st==='completed' || makeupPlanCompleted(plan)) return 'Đã đến học bù';
      if(st==='cancelled') return makeupPlanMissed(plan)?'Không đến buổi học bù này • Cần xếp lại':'Đã hủy xếp học bù';
      if(makeupPlanMissed(plan)) return 'Không đến buổi học bù này • Cần xếp lại';
      return 'Đang được xếp vào buổi này';
    }


    function normalizeMakeupPlans(){
      db.makeupPlans ||= [];
      db.makeupPlans = db.makeupPlans.map(p=>{
        if(p.targetSessionKey) return p;
        return {...p, targetSessionKey:null, legacyClassWide:true};
      });
    }

    function absenceId(studentId,sourceSessionKey){return `${sourceSessionKey}__${studentId}`}


    function ensureAbsenceRecords(){
      db.absenceRecords ||= [];
      return db.absenceRecords;
    }
    function mergeAbsenceRecords(rows=[]){
      ensureAbsenceRecords();
      const byId=new Map((db.absenceRecords||[]).map(a=>[String(a.id),a]));
      (rows||[]).forEach(a=>{
        if(!a?.id) return;
        const old=byId.get(String(a.id))||{};
        byId.set(String(a.id),{...old,...a});
      });
      db.absenceRecords=[...byId.values()];
      return db.absenceRecords;
    }

    function makeupPlanAttendanceRow(plan){
      if(!plan?.targetSessionKey) return null;
      const rec=ensureAttendanceSessions()[attendanceKey(plan.targetSessionKey)];
      if(!rec?.saved) return null;
      return rec.rows?.[`makeup_${plan.studentId}`] || rec.rows?.[`manual_makeup_${plan.studentId}`] || null;
    }
    function targetSessionPast(plan){
      const s=sessionObjectFromKey(plan?.targetSessionKey);
      if(!s) return false;
      const d=s.date?parseISODate(s.date):dayDateFor(s.day);
      const [hh,mm]=String(s.end||s.start||'23:59').split(':').map(Number);
      d.setHours(hh||23,mm||59,59,999);
      return d.getTime()<Date.now();
    }
    function makeupPlanCompleted(plan){
      if(makeupPlanCancelledBySourceCorrection(plan)) return false;
      if(String(plan?.status||'')==='completed') return true;
      const row=makeupPlanAttendanceRow(plan);
      return !!row && (row.status==='present' || row.status==='late');
    }
    function makeupPlanMissed(plan){
      // Chỉ coi là lỡ học bù khi buổi học bù đã được lưu điểm danh và học sinh bị đánh Vắng.
      // Không tự ẩn plan chỉ vì đã qua giờ kết thúc, vì giáo viên vẫn được điểm danh đến 23:59
      // và Admin/Quản lí/Lễ tân còn có thể sửa ngoài giờ.
      if(makeupPlanCancelledBySourceCorrection(plan)) return false;
      if(makeupPlanCompleted(plan)) return false;
      const row=makeupPlanAttendanceRow(plan);
      return row?.status==='absent';
    }
    function activeMakeupPlans(){
      normalizeMakeupPlans();
      return (db.makeupPlans||[]).filter(p=>{
        if(!p || makeupPlanCancelledBySourceCorrection(p)) return false;
        const st=String(p.status||'scheduled');
        return st==='scheduled' && !makeupPlanCompleted(p) && !makeupPlanMissed(p);
      });
    }
    function absenceRecordStatus(absenceIdValue){
      const plans=(db.makeupPlans||[]).filter(p=>p?.absenceId===absenceIdValue);
      // Ưu tiên dữ liệu điểm danh thật. Nếu plan từng bị Vắng học bù/cancelled
      // nhưng sau đó giáo viên sửa lại thành Có mặt/Muộn, phải hiện Đã học bù,
      // không được giữ ở Chờ xếp.
      if(plans.some(p=>String(p.status||'')==='completed' || makeupPlanCompleted(p))) return 'completed';
      const scheduled=plans.find(p=>{
        const st=String(p?.status||'scheduled');
        return st==='scheduled' && !makeupPlanMissed(p);
      });
      return scheduled?'scheduled':'pending';
    }
    function absenceRecordStatusBadge(absenceIdValue){
      const st=absenceRecordStatus(absenceIdValue);
      if(st==='completed') return '<span class="pill green">Đã học bù</span>';
      if(st==='scheduled') return '<span class="makeupBadge">Đã xếp học bù</span>';
      return '<span class="unpaidBadge">Chờ xếp</span>';
    }



    
function safeStudentName(id){return h(studentById(id)?.name || 'Không tìm thấy học sinh')}
    function classNameForDisplay(id){
      const c=classById(id);
      return c?.name || 'Không tìm thấy lớp';
    }
    function safeClassName(id){return h(classNameForDisplay(id))}
    function safeSessionLabel(key){return key?sessionLabelFromKey(key):'-'}
    function sessionKeyMonth(key){
      const parts=String(key||'').split('|');
      const date=parts.length>=4?parts[1]:'';
      return /^\d{4}-\d{2}-\d{2}$/.test(date)?date.slice(0,7):'';
    }
    function makeupCurrentMonthKey(){
      return isoDate(new Date()).slice(0,7);
    }
    function makeupSelectedMonthKey(){
      db.settings ||= {};
      db.settings.makeupFilter ||= {};
      return db.settings.makeupFilter.month || db.makeupMonth || makeupCurrentMonthKey();
    }
    function makeupDeletedMonthSet(){
      return new Set((db.deletedMakeupMonths||[]).map(String));
    }
    function makeupMonthDeleted(monthKey){
      return makeupDeletedMonthSet().has(String(monthKey||''));
    }
    function makeupAvailableMonths(){
      const set=new Set([makeupCurrentMonthKey(), makeupSelectedMonthKey()]);
      (db.makeupAvailableMonths||[]).forEach(m=>set.add(String(m)));
      const deleted=makeupDeletedMonthSet();
      return [...set].filter(m=>/^\d{4}-\d{2}$/.test(m) && !deleted.has(m)).sort().reverse();
    }
    function formatMonthKeyVN(key=makeupCurrentMonthKey()){
      const [y,m]=String(key||'').split('-');
      return /^\d{4}$/.test(y||'') && /^\d{2}$/.test(m||'') ? `Tháng ${m} / ${y}` : 'Tháng hiện tại';
    }
    function absenceRecordMonth(record){
      return sessionKeyMonth(record?.sourceSessionKey) || String(record?.createdAt||'').slice(0,7);
    }
    function makeupPlanMonth(plan){
      return sessionKeyMonth(plan?.sourceSessionKey) || sessionKeyMonth(plan?.targetSessionKey) || String(plan?.createdAt||'').slice(0,7);
    }
    function sameMakeupMonth(item,monthKey=makeupCurrentMonthKey()){
      if(!monthKey) return true;
      if(item?.record) return absenceRecordMonth(item.record)===monthKey;
      if(item?.plan) return makeupPlanMonth(item.plan)===monthKey;
      return absenceRecordMonth(item)===monthKey || makeupPlanMonth(item)===monthKey;
    }
    function makeupPlanRows(monthKey=null){
      return activeMakeupPlans().map(p=>({
        plan:p,
        student:studentById(p.studentId),
        sourceClass:classById(p.sourceClassId),
        targetClass:classById(p.targetClassId)
      })).filter(x=>!monthKey || sameMakeupMonth(x,monthKey));
    }
    function completedMakeupRows(monthKey=null){
      normalizeMakeupPlans();
      return (db.makeupPlans||[])
        .filter(p=>p && !makeupPlanCancelledBySourceCorrection(p))
        .filter(p=>!monthKey || makeupPlanMonth(p)===monthKey)
        .filter(p=>String(p.status||'')==='completed' || makeupPlanCompleted(p))
        .map(p=>({
          plan:p,
          student:studentById(p.studentId),
          sourceClass:classById(p.sourceClassId),
          targetClass:classById(p.targetClassId)
        }))
        .filter(x=>x.student?.id)
        .sort((a,b)=>{
          const ak=String(a.plan.targetSessionKey||a.plan.createdAt||'');
          const bk=String(b.plan.targetSessionKey||b.plan.createdAt||'');
          return bk.localeCompare(ak) || String(a.student.name||'').localeCompare(String(b.student.name||''),'vi');
        });
    }
    function pendingMakeupRows(monthKey=null){
      if(monthKey && makeupMonthDeleted(monthKey)) return [];
      if(db.makeupTabState && (!monthKey || db.makeupTabState.month===monthKey)){
        return makeupTabPendingRows(db.makeupTabState,monthKey);
      }
      ensureAbsenceRecords();
      return (db.absenceRecords||[])
        .filter(a=>a && !makeupMonthDeleted(absenceRecordMonth(a)))
        .filter(a=>a && (!monthKey || absenceRecordMonth(a)===monthKey))
        .filter(a=>a && absenceRecordStatus(a.id)==='pending')
        .map(a=>({record:a, student:studentById(a.studentId), sourceClass:classById(a.sourceClassId), sourceSession:sessionObjectFromKey(a.sourceSessionKey)}))
        .filter(x=>x.student?.id && x.sourceClass?.id)
        .sort((a,b)=>String(a.record?.sourceSessionKey||'').localeCompare(String(b.record?.sourceSessionKey||'')) || String(a.sourceClass?.name||'').localeCompare(String(b.sourceClass?.name||''),'vi',{numeric:true}) || String(a.student.name||'').localeCompare(String(b.student.name||''),'vi'));
    }
    function makeupTargetStatusText(plan){
      const s=sessionObjectFromKey(plan.targetSessionKey);
      if(!s) return 'Không xác định';
      return sessionStatus(s).label;
    }

    function pendingAbsenceCandidates(targetClassId,targetSessionKey,options={}){
      normalizeMakeupPlans();
      const target=classById(targetClassId);
      const targetSession=sessionObjectFromKey(targetSessionKey);
      if(!canReceiveMakeupClass(target) || !targetSession || !canReceiveMakeupSession(targetSessionKey)) return [];
      const capacity=db.settings.capacity||15;
      const stagedCancelIds=new Set((options?.cancelPlanIds||[]).map(String));
      const stagedCancelCount=plannedMakeupsForSession(targetSessionKey).filter(p=>stagedCancelIds.has(String(p.id))).length;
      if(Math.max(0,totalRosterCountForSession(targetClassId,targetSessionKey)-stagedCancelCount)>=capacity) return [];
      const alreadyInTarget=new Set(plannedMakeupsForSession(targetSessionKey).filter(p=>!stagedCancelIds.has(String(p.id))).map(p=>p.studentId));
      // V20L.3: dữ liệu học bù lấy từ attendance/state. Không giới hạn cùng khối và không ẩn do khác tuần.
      // Chỉ loại chính lớp nhận, lượt đã xếp, học sinh đã có trong buổi đích, và lớp nhận không còn hoạt động.
      return pendingMakeupRows(null)
        .filter(x=>!alreadyInTarget.has(x.student.id))
        .filter(x=>String(x.sourceClass.id)!==String(targetClassId))
        .sort((a,b)=>String(a.student.name||'').localeCompare(String(b.student.name||''),'vi') || String(a.sourceClass.name||'').localeCompare(String(b.sourceClass.name||''),'vi',{numeric:true}));
    }

    function removeMakeupPlanFromLocalState(planId){
      const id=String(planId||'');
      db.makeupPlans=(db.makeupPlans||[]).filter(p=>String(p?.id||'')!==id);
      if(db.makeupTabState?.makeupPlans){
        db.makeupTabState.makeupPlans=(db.makeupTabState.makeupPlans||[]).filter(p=>String(p?.id||'')!==id);
        db.makeupTabState.updatedAt=0;
      }
    }

    function restoreAbsencePendingAfterMakeupCancel(plan){
      if(!plan?.absenceId) return;
      const setPending=(arr=[])=>arr.forEach(a=>{ if(String(a?.id||'')===String(plan.absenceId)) a.status='pending'; });
      setPending(db.absenceRecords||[]);
      setPending(db.makeupTabState?.absenceRecords||[]);
    }

    async function cancelMakeupPlan(planId,targetClassId,targetSessionKey){
      const schedulePopupOpen=!!modalBackdrop?.querySelector?.('[data-schedule-makeup-modal]');
      const p=(db.makeupPlans||[]).find(x=>String(x?.id||'')===String(planId))
        || (db.makeupTabState?.makeupPlans||[]).find(x=>String(x?.id||'')===String(planId));
      if(!p){toast('Không tìm thấy lịch học bù');return}
      const studentName=safeStudentName(p.studentId);
      const targetLabel=p.targetSessionKey?safeSessionLabel(p.targetSessionKey):'buổi học bù này';
      if(!confirm(`Hủy lịch học bù của ${studentName} ở ${targetLabel}?\n\nHọc sinh sẽ quay lại danh sách Chờ xếp.`)) return;
      try{
        const data=await officialFetch(`/api/makeup/plans/${encodeURIComponent(planId)}`,{method:'DELETE',preserveGetCache:true});
        const cancelledPlan=data?.plan||p;
        const updatedAbsence=data?.absenceRecord||null;
        if(updatedAbsence){
          const mergeOne=(arr=[])=>{
            const i=arr.findIndex(a=>String(a?.id||'')===String(updatedAbsence.id||''));
            if(i>=0) arr[i]={...arr[i],...updatedAbsence}; else arr.push(updatedAbsence);
          };
          db.absenceRecords ||= [];
          mergeOne(db.absenceRecords);
          if(db.makeupTabState){db.makeupTabState.absenceRecords ||= []; mergeOne(db.makeupTabState.absenceRecords);db.makeupTabState.updatedAt=Date.now();}
        }else restoreAbsencePendingAfterMakeupCancel(cancelledPlan);
        removeMakeupPlanFromLocalState(planId);
        if(db.makeupTabState) db.makeupTabState.updatedAt=Date.now();
        v20bAfterMutation(['schedule','makeup'],{
          targetSessionKey:cancelledPlan.targetSessionKey,
          sourceSessionKey:cancelledPlan.sourceSessionKey,
          month:makeupPlanMonth(cancelledPlan),
          preserveCache:true,
          renderOnRevalidate:false,
          delayMs:V24A_MUTATION_REVALIDATE_IDLE_MS
        });
        if(typeof window.v22RefreshScheduleBehindMakeupModal==='function') window.v22RefreshScheduleBehindMakeupModal();
        if(route==='makeup') lazyRouteState.makeup={loaded:true,loading:false,loadedAt:Date.now(),mutated:true};
        if(route==='schedule') lazyRouteState.schedule={loaded:true,loading:false,loadedAt:Date.now(),mutated:true};
        saveLocalOnly();
        toast('Đã hủy học bù. Học sinh đã quay lại Chờ xếp.');
        if(schedulePopupOpen && targetClassId && targetSessionKey){
          if(typeof window.refreshScheduleMakeupDraftDom==='function') window.refreshScheduleMakeupDraftDom(targetClassId,targetSessionKey);
        }else if(route==='makeup'){
          renderApp();
        }else{
          const btn=document.querySelector(`[data-cancel-makeup-id="${String(planId).replace(/"/g,'\"')}"]`);
          const row=btn?.closest('tr');
          if(row){ row.remove(); }
          renderApp();
        }
      }catch(e){toast(e.message||'Không hủy được học bù')}
    }


    function attendanceKey(sessionKey){return `att_${sessionKey}`}
    function ensureAttendanceSessions(){db.attendanceSessions ||= {}; return db.attendanceSessions}

    function sessionDateEndOfDay(s){const d=s.date?parseISODate(s.date):dayDateFor(s.day); d.setHours(23,59,59,999); return d}


    function attendanceWindowInfo(sessionKey){
      const s=sessionObjectFromKey(sessionKey); if(!s) return {open:false,label:'Không xác định buổi học',isEarly:false,isLate:false,cancelled:false};
      if(isSessionCancelled(sessionKey)) return {open:false,label:'Buổi học đã nghỉ',session:s,isEarly:false,isLate:false,cancelled:true};
      const openAt=dateTimeForSession(s,'start');
      const closeAt=sessionDateEndOfDay(s);
      const now=new Date();
      const open=now>=openAt && now<=closeAt;
      return {
        open,
        openAt,
        closeAt,
        now,
        session:s,
        isEarly:now<openAt,
        isLate:now>closeAt,
        cancelled:false,
        label:`Mở từ ${openAt.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'})} đến 23:59 (giờ Việt Nam)`
      };
    }

    function attendanceCanOverride(){return canManageOperations()}
    function attendanceCanEditSession(sessionKey,forceEdit=false){
      const w=attendanceWindowInfo(sessionKey);
      if(w.cancelled) return false;
      const rec=attendanceRecord(sessionKey);
      if(attendanceCanOverride()){
        if(w.isEarly) return false;
        return forceEdit || rec.editable || !rec.saved || w.open;
      }
      return w.open && (forceEdit || rec.editable || !rec.saved);
    }
    function attendanceCardStatusMarkup(sessionKey){
      const w=attendanceWindowInfo(sessionKey);
      const rec=ensureAttendanceSessions()[attendanceKey(sessionKey)];
      if(w.cancelled) return '<span class="pill gray">Buổi nghỉ</span>';
      if(rec?.saved){
        if(w.open) return '<span class="attSavedTag">Đã lưu • đang mở</span>';
        return attendanceCanOverride()?'<span class="pill blue">Đã khóa • Có thể sửa</span>':'<span class="pill gray">Đã khóa</span>';
      }
      if(w.open) return '<span class="pill green">Đang mở điểm danh</span>';
      if(attendanceCanOverride()) return w.isEarly?'<span class="pill red">Chưa mở điểm danh</span>':'<span class="pill blue">Đã khóa • Có thể sửa</span>';
      return w.isEarly?'<span class="pill red">Chưa mở điểm danh</span>':'<span class="pill gray">Đã khóa</span>';
    }
    function attendancePrimaryActionLabel(sessionKey){
      const w=attendanceWindowInfo(sessionKey);
      const rec=ensureAttendanceSessions()[attendanceKey(sessionKey)];
      if(rec?.saved) return ((attendanceCanOverride() && !w.isEarly) || w.open)?'Xem / sửa':'Xem';
      if(w.isEarly) return 'Chưa mở';
      if(attendanceCanOverride() && !w.open) return 'Điểm danh ngoài giờ';
      return 'Điểm danh';
    }
    function attendanceModalStatusTitle(sessionKey,canEdit=false){
      const w=attendanceWindowInfo(sessionKey);
      const rec=ensureAttendanceSessions()[attendanceKey(sessionKey)];
      if(w.cancelled) return 'Buổi học đã nghỉ';
      if(w.open) return rec?.saved && canEdit?'Đang sửa điểm danh':'Đang mở điểm danh';
      if(attendanceCanOverride()){
        if(canEdit) return 'Admin/Quản lí/Lễ tân đang sửa ngoài giờ';
        return rec?.saved?'Đã khóa • Admin/Quản lí/Lễ tân có thể sửa':(w.isEarly?'Chưa mở điểm danh':'Đã khóa • Có thể sửa');
      }
      return w.isEarly?'Chưa mở điểm danh':'Đã khóa điểm danh';
    }
    function attendanceModalBoxClass(sessionKey,canEdit=false){
      const w=attendanceWindowInfo(sessionKey);
      if(w.open) return 'attendanceOpen';
      if(canEdit && attendanceCanOverride()) return 'attendanceOverride';
      return 'attendanceLock';
    }

    function rosterForAttendance(classId,sessionKey){
      normalizeMakeupPlans();
      const key=v18FastKey()+`|roster|${classId}|${sessionKey}`;
      if(v18Memo.rosterKey===key && v18Memo.rosterRows) return v18Memo.rosterRows;
      const c=classById(classId);
      const official=(c.students||[]).map(s=>({student:{...s,classId:c.id,className:c.name}, type:'official', sourceClass:c, plan:null}));
      const makeup=makeupStudentsForSession(sessionKey).map(x=>({student:{...x.student,classId:x.sourceClass.id,className:x.sourceClass.name}, type:'makeup', sourceClass:x.sourceClass, plan:x.plan}));
      const manual=(ensureAttendanceSessions()[attendanceKey(sessionKey)]?.manualMakeups||[]).map(m=>({student:m.student, type:'manual_makeup', sourceClass:classById(m.sourceClassId)||{}, plan:m}));
      const ids=new Set();
      const rows=[...official,...makeup,...manual].filter(x=>{const k=`${x.type}_${x.student.id}`; if(ids.has(k)) return false; ids.add(k); return true});
      v18Memo.rosterKey=key; v18Memo.rosterRows=rows;
      return rows;
    }
    function attendanceRecord(sessionKey){
      const store=ensureAttendanceSessions(); const key=attendanceKey(sessionKey);
      store[key] ||= {sessionKey, saved:false, editable:true, rows:{}, manualMakeups:[], updatedAt:null};
      return store[key];
    }

    function manualMakeupsForSession(sessionKey){
      const rec=ensureAttendanceSessions()[attendanceKey(sessionKey)];
      return rec?.manualMakeups || [];
    }
    function makeupCountForSession(sessionKey){
      // Chỉ tính học bù đang scheduled để kiểm tra sức chứa/xếp mới.
      return plannedMakeupsForSession(sessionKey).length + manualMakeupsForSession(sessionKey).length;
    }
    function makeupDisplayCountForSession(sessionKey){
      // Dùng cho giao diện lịch sử: scheduled + completed + cancelled/missed.
      return makeupPlansForSession(sessionKey).length + manualMakeupsForSession(sessionKey).length;
    }
    function totalRosterCountForSession(classId,sessionKey){
      return (classById(classId).students||[]).length + makeupCountForSession(sessionKey);
    }
    function totalRosterDisplayCountForSession(classId,sessionKey){
      return (classById(classId).students||[]).length + makeupDisplayCountForSession(sessionKey);
    }

    function statusLabel(v){return v==='present'?'Có mặt':v==='late'?'Muộn':v==='absent'?'Vắng':'Chưa chọn'}
    let v8bAttendanceDraftTimer=null;
    
    // Phase 8D.2: v8bScheduleAttendanceDraftPersist moved to lazy runtime module.

    
    // Phase 8D.2: v8bCancelAttendanceDraftPersist moved to lazy runtime module.

    
    // Phase 8D.2: setAttendanceStatus moved to lazy runtime module.

    
    // Phase 8D.2: setAttendanceNote moved to lazy runtime module.


    
    // Phase 8D.2: syncAbsenceRecordsForAttendance moved to lazy runtime module.


    
    // Phase 8D.2: v20l4InvalidateScheduleAfterAttendanceSave moved to lazy runtime module.


    
    // Phase 8D.2: saveAttendance moved to lazy runtime module.


    
    // Phase 8D.2: editAttendance moved to lazy runtime module.

    
    // Phase 8D.2: classStudentsForManualMakeup moved to lazy runtime module.


    
    // Phase 8D.2: addManualMakeupToAttendance moved to lazy runtime module.


    
    // Phase 8D.2: rollupAttendanceFromSessions moved to lazy runtime module.




    function makeupStudentsForSession(sessionKey){
      return makeupPlansForSession(sessionKey).map(p=>({plan:p, student:studentById(p.studentId), sourceClass:classById(p.sourceClassId)})).filter(x=>x.student?.id);
    }


    function makeupStudentMarkupForSession(sessionKey){
      const rows=makeupStudentsForSession(sessionKey);
      if(!rows.length) return '<div class="empty">Chưa có học sinh học bù trong đúng buổi này.</div>';
      return `<div class="modalTableWrap"><table class="modalTable"><thead><tr><th>STT</th><th>Học sinh</th><th>Lớp chính</th><th>Buổi học bù</th><th>Trạng thái</th><th>Ghi chú</th><th>Xếp lúc</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td>${i+1}</td><td><b>${x.student.name}</b></td><td>${x.sourceClass.name}</td><td>${sessionLabelFromKey(sessionKey)}</td><td>${makeupPlanStatusBadge(x.plan)}</td><td><span class="mini">${h(makeupPlanHistoryText(x.plan))}</span></td><td>${x.plan.createdAt||'-'}</td></tr>`).join('')}</tbody></table></div>`;
    }

    function normalizeEvaluationMonthValue(v){
      const s=String(v||'');
      if(/^\d{4}-\d{2}$/.test(s)) return s;
      const m=s.match(/^(\d{2})\/(\d{4})$/);
      return m?`${m[2]}-${m[1]}`:evaluationMonthKey();
    }





    function h(v){return String(v??'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]))}

    const WEEK_DAYS = [
      {key:'Mon', label:'Thứ 2'},
      {key:'Tue', label:'Thứ 3'},
      {key:'Wed', label:'Thứ 4'},
      {key:'Thu', label:'Thứ 5'},
      {key:'Fri', label:'Thứ 6'},
      {key:'Sat', label:'Thứ 7'},
      {key:'Sun', label:'Chủ nhật'}
    ];
    const DAY_ALIASES = [
      ['Thu', /\b(thu|thur|thurs|thursday)\b/ig],
      ['Tue', /\b(tue|tues|tuesday)\b/ig],
      ['Mon', /\b(mon|monday)\b/ig],
      ['Wed', /\b(wed|wednesday)\b/ig],
      ['Fri', /\b(fri|friday)\b/ig],
      ['Sat', /\b(sat|saturday)\b/ig],
      ['Sun', /\b(sun|sunday)\b/ig]
    ];
    function normTime(h,m){
      h=String(h||'0').padStart(2,'0');
      m=String(m||'').trim();
      if(!m) m='00';
      m=m.padStart(2,'0');
      if(m.length>2) m=m.slice(0,2);
      return `${h}:${m}`;
    }
    function extractTimeRange(segment,lastRange){
      const s=(segment||'').replace(/[–—]/g,'-').replace(/\s+/g,' ');
      const m=s.match(/(\d{1,2})\s*h?\s*(\d{0,2})\s*-\s*(\d{1,2})\s*h?\s*(\d{0,2})/i);
      if(m){
        return {start:normTime(m[1],m[2]), end:normTime(m[3],m[4])};
      }
      return lastRange;
    }
    function extractDays(segment){
      const found=[];
      DAY_ALIASES.forEach(([key,rgx])=>{
        rgx.lastIndex=0;
        if(rgx.test(segment||'')) found.push(key);
      });
      return [...new Set(found)];
    }

    function parseClassSessions(c){
      let lastRange=null;
      const parts=String(c.time||'').split(';').map(x=>x.trim()).filter(Boolean);
      const sessions=[];
      parts.forEach(part=>{
        const range=extractTimeRange(part,lastRange);
        if(range) lastRange=range;
        const days=extractDays(part);
        if(range && days.length){
          days.forEach(day=>sessions.push({classId:c.id, className:c.name, teacher:c.teacher, ta:c.ta, students:c.students?.length||0, day, start:range.start, end:range.end, slot:`${range.start}-${range.end}`, raw:c.time, type:'regular'}));
        }
      });
      return sessions;
    }
    function sessionDateInCurrentWeek(s,wk=weekStartDate()){return isoDate(dayDateForWeek(s.day,wk))}

    function weekSessionsForUser(){
      normalizeClassOperations();
      const key=v18FastKey()+'|weekSessions';
      if(v18Memo.weekKey===key && v18Memo.weekSessions) return v18Memo.weekSessions;
      const wk=weekStartDate(); const end=addDays(wk,6);
      const cls=classesForUser();
      const allowed=new Set(cls.map(c=>c.id));
      const base=cls.flatMap(c=>parseClassSessions(c).map(s=>({...s,date:sessionDateInCurrentWeek(s,wk),type:'regular'})).filter(s=>classSessionVisible(c,s.date)));
      const canSeeMakeup=m=>{
        if(canManageOperations()) return true;
        if(isTeachingUser()) return m.visibleToCurrentUser===true || classMakeupAssignedToCurrentTeacher(m);
        return allowed.has(m.classId);
      };
      const makeup=(db.classMakeupSessions||[]).filter(canSeeMakeup).filter(m=>{const d=parseISODate(m.date); return d>=wk && d<=end;}).map(m=>{const c=v20b7MakeupClassFallback(m); return {classId:c.id||m.classId,className:c.name,teacher:m.teacher||c.teacher,teacherId:m.teacherId||c.teacherId,ta:c.ta,students:c.students?.length||m.classSnapshot?.students?.length||0,day:m.day,start:m.start,end:m.end,slot:`${m.start}-${m.end}`,date:m.date,type:'class_makeup',sessionKind:m.sessionKind||'class_makeup',sourceSessionKey:m.sourceSessionKey,makeupId:m.id,reason:m.reason||''}});
      const rows=[...base,...makeup];
      v18Memo.weekKey=key; v18Memo.weekSessions=rows;
      return rows;
    }
    function sessionsForClass(classId){
      normalizeClassOperations();
      const wk=weekStartDate(); const end=addDays(wk,6); const c=classById(classId);
      const base=parseClassSessions(c).map(s=>({...s,date:sessionDateInCurrentWeek(s,wk),type:'regular'})).filter(s=>classSessionVisible(c,s.date));
      const makeup=(db.classMakeupSessions||[]).filter(m=>m.classId===classId).filter(m=>{const d=parseISODate(m.date); return d>=wk && d<=end;}).map(m=>{const cc=v20b7MakeupClassFallback(m); return {classId:cc.id||m.classId,className:cc.name,teacher:m.teacher||cc.teacher,teacherId:m.teacherId||cc.teacherId,ta:cc.ta,students:cc.students?.length||m.classSnapshot?.students?.length||0,day:m.day,start:m.start,end:m.end,slot:`${m.start}-${m.end}`,date:m.date,type:'class_makeup',sessionKind:m.sessionKind||'class_makeup',sourceSessionKey:m.sourceSessionKey,makeupId:m.id,reason:m.reason||''}});
      return [...base,...makeup];
    }
    function defaultSessionKeyForClass(classId){const s=sessionsForClass(classId)[0]; return s?sessionKeyFor(s):''}
    function sessionSelectOptions(classId,selected=''){
      return sessionsForClass(classId).map(s=>{const k=sessionKeyFor(s);return `<option value="${k}" ${k===selected?'selected':''}>${dayNameFromKey(s.day)} • ${s.start} - ${s.end}</option>`}).join('');
    }
    function switchMakeupSession(classId,key){openScheduleMakeup(classId,key)}
    function sortedWeekSlots(sessions){
      return [...new Set(sessions.map(s=>s.slot))].sort((a,b)=>a.localeCompare(b, 'vi'));
    }

    const CLASS_TIME_SLOTS = [
      {label:'09:00 - 10:30', start:'09:00', end:'10:30'},
      {label:'15:30 - 17:00', start:'15:30', end:'17:00'},
      {label:'16:30 - 18:00', start:'16:30', end:'18:00'},
      {label:'17:00 - 18:30', start:'17:00', end:'18:30'},
      {label:'17:30 - 19:00', start:'17:30', end:'19:00'},
      {label:'18:00 - 19:30', start:'18:00', end:'19:30'},
      {label:'18:30 - 20:00', start:'18:30', end:'20:00'}
    ];
    function isoDate(d){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
    function parseISODate(v){const [y,m,d]=String(v).split('-').map(Number);return new Date(y,m-1,d)}
    function mondayOf(d){const x=new Date(d); const day=x.getDay()||7; x.setDate(x.getDate()-day+1); x.setHours(0,0,0,0); return x}
    function addDays(d,n){const x=new Date(d); x.setDate(x.getDate()+n); return x}
    function currentWeekStartISO(){
      // Tính thứ Hai theo lịch Việt Nam, không phụ thuộc múi giờ của máy hoặc Vercel.
      const vn=new Date(Date.now()+7*60*60*1000);
      const day=vn.getUTCDay()||7;
      const monday=new Date(Date.UTC(vn.getUTCFullYear(),vn.getUTCMonth(),vn.getUTCDate()));
      monday.setUTCDate(monday.getUTCDate()-day+1);
      return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth()+1).padStart(2,'0')}-${String(monday.getUTCDate()).padStart(2,'0')}`;
    }
    function resetScheduleWeekToCurrent(options={}){
      db.settings ||= {};
      const current=currentWeekStartISO();
      const changed=String(db.settings.weekStart||'')!==current;
      db.settings.weekStart=current;
      if(changed){
        lazyRouteState.schedule={};
        lazyRouteState.attendance={};
        v18Memo.weekKey='';
        v18Memo.weekSessions=null;
        if(options.persist!==false) saveLocalOnly();
      }
      return changed;
    }
    function weekStartDate(){db.settings.weekStart ||= currentWeekStartISO(); return parseISODate(db.settings.weekStart)}
    function setWeekStart(v){
      db.settings.weekStart=isoDate(mondayOf(parseISODate(v)));
      lazyRouteState.schedule={}; lazyRouteState.attendance={};
      // V18F: không xóa cache tuần; dùng cache trước rồi refresh nền.
      v18fRenderCacheFirst(route);
    }
    function shiftWeek(n){
      db.settings.weekStart=isoDate(addDays(weekStartDate(),n*7));
      lazyRouteState.schedule={}; lazyRouteState.attendance={};
      // V18F: giữ cache tuần đã từng xem để quay lại tuần cũ nhanh hơn.
      v18fRenderCacheFirst(route);
    }
    function formatVNDate(d){return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`}
    function weekLabel(){const m=weekStartDate(); return `${formatVNDate(m)} - ${formatVNDate(addDays(m,6))}/${addDays(m,6).getFullYear()}`}
    function dayDateFor(dayKey){const idx=WEEK_DAYS.findIndex(d=>d.key===dayKey); return addDays(weekStartDate(), idx<0?0:idx)}

    function dateTimeForSession(s,field){
      // Điểm danh/lịch dạy luôn theo giờ Việt Nam, không phụ thuộc timezone
      // đang cài trên máy giáo viên. Date.now() là thời điểm tuyệt đối; chỉ phần
      // ghép ngày + giờ cần gắn rõ UTC+07:00.
      const dateKey=String(s?.date||isoDate(dayDateFor(s?.day||'Mon')));
      const timeKey=String(s?.[field]||'00:00').slice(0,5);
      const timestamp=Date.parse(`${dateKey}T${timeKey}:00+07:00`);
      if(Number.isFinite(timestamp)) return new Date(timestamp);
      const [hh,mm]=timeKey.split(':').map(Number);
      const fallback=parseISODate(dateKey); fallback.setHours(hh||0,mm||0,0,0); return fallback;
    }


    function sessionStatus(s){
      const key=sessionKeyFor(s);
      if(isSessionCancelled(key)) return {key:'cancelled',label:'Nghỉ'};
      const now=new Date(), start=dateTimeForSession(s,'start'), end=dateTimeForSession(s,'end');
      if(s.type==='class_makeup'){
        if(now < start) return {key:'todo',label:'Dạy bù'};
        if(now >= start && now <= end) return {key:'live',label:'Đang dạy bù'};
        return {key:'done',label:'Đã dạy bù'};
      }
      if(now < start) return {key:'todo',label:'Chưa dạy'};
      if(now >= start && now <= end) return {key:'live',label:'Đang dạy'};
      return {key:'done',label:'Đã dạy'};
    }

    function sessionEndedInVietnam(s){
      const dateKey=String(s?.date||isoDate(dayDateFor(s?.day||'Mon')));
      const endTime=String(s?.end||'00:00').slice(0,5);
      const endAt=Date.parse(`${dateKey}T${endTime}:00+07:00`);
      return Number.isFinite(endAt) ? Date.now()>endAt : sessionStatus(s).key==='done';
    }

    function scheduleDisplayStatus(s){
      const base=sessionStatus(s);
      if(base.key==='cancelled') return base;
      const key=sessionKeyFor(s);
      if(sessionEndedInVietnam(s) && !attendanceSavedForScheduleSession(key)){
        return {key:'unattended',label:'Chưa điểm danh'};
      }
      return base;
    }

    function sameDate(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
    function isTodayDayKey(dayKey){return sameDate(dayDateFor(dayKey), new Date())}
    function realtimeText(){
      const now=new Date();
      return now.toLocaleString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
    }

    function scheduleCounts(){
      const sessions=weekSessionsForUser();
      return sessions.reduce((acc,s)=>{const k=sessionStatus(s).key; acc[k]=(acc[k]||0)+1; return acc},{done:0,live:0,todo:0,cancelled:0});
    }

    function dayNameFromKey(k){return (WEEK_DAYS.find(d=>d.key===k)||{}).label||k}
    function timeSlotByValue(v){return CLASS_TIME_SLOTS.find(x=>`${x.start}-${x.end}`===v)||CLASS_TIME_SLOTS[3]}
    function buildClassTimeFromForm(){
      const count=Number(document.getElementById('newSessionCount')?.value||1);
      const sessions=[];
      for(let i=1;i<=count;i++){
        const day=document.getElementById(`newDay${i}`)?.value || 'Mon';
        const slot=timeSlotByValue(document.getElementById(`newSlot${i}`)?.value || '17:00-18:30');
        sessions.push(`${slot.start.replace(':','h')} - ${slot.end.replace(':','h')} ${day}`);
      }
      return sessions.join('; ');
    }

    function updateNewClassPreview(){
      const el=document.getElementById('newClassPreview'); if(!el) return;
      el.textContent = buildClassTimeFromForm();
      document.querySelectorAll('.session2Only').forEach(x=>x.style.display=Number(document.getElementById('newSessionCount')?.value||1)===2?'block':'none');
      const start=document.getElementById('newStartDate'); if(start) start.value=isoDate(firstUpcomingDateFromForm());
    }

    function roleLabel(){ if(isAdmin()) return 'Admin'; if(isManager()) return 'Quản lí kiêm giáo viên'; if(isReceptionist()) return 'Lễ tân'; if(isTA()) return 'TA / Trợ giảng'; if(isTeacher()) return 'Giáo viên'; if(isParent()) return 'Phụ huynh'; return 'User'}







    function navItems(){
      const core=[['overview','🏠','Tổng quan'],['classes','🏫','Lớp học'],['schedule','📅','Lịch dạy'],['homework','📚','Thư viện bài tập'],['evaluation','📊','Đánh giá HS']];
      if(isTeachingUser() && !isManager()) return core.filter(x=>x[0]!=='classes').concat([['makeup','🔁','Học bù']]);
      if(isReceptionist()) return core.concat([['teachers','👩‍🏫','Giáo viên'],['makeup','🔁','Học bù'],['settings','⚙️','Tài khoản']]);
      if(isManager()) return core.concat([['teachers','👩‍🏫','Giáo viên'],['tuition','💰','Học phí'],['makeup','🔁','Học bù'],['settings','⚙️','Tài khoản']]);
      return core.concat([['teachers','👩‍🏫','Giáo viên'],['tuition','💰','Học phí'],['makeup','🔁','Học bù'],['settings','⚙️','Cài đặt']]);
    }


    window.MsAppWarmupBridge=Object.freeze({
      isAuthenticated:()=>!!currentUser && !currentUser.mustChangePassword,
      currentRoute:()=>route,
      availableRoutes:()=>new Set((navItems()||[]).map(item=>item[0])),
      canViewTuition:()=>canViewTuition(),
      roleFlags:()=>({admin:isAdmin(),manager:isManager(),receptionist:isReceptionist(),teaching:isTeachingUser()}),
      isModalOpen:()=>!!document.getElementById('modalBackdrop')?.classList.contains('show'),
      hydrate:r=>hydrateRouteCache(r),
      ensureData:(r,options={})=>ensureRouteData(r,options),
      isDataReady:r=>!routeNeedsLazyData(r) || !!lazyRouteState[routeDataKey(r)]?.loaded,
      renderIfActive:r=>{if(currentUser && route===r) render();}
    });


    function animateRoute(){const p=document.getElementById('topProgress'); p.classList.remove('go'); void p.offsetWidth; p.classList.add('go'); setTimeout(()=>p.classList.remove('go'),520)}
    function go(r){
      if(r==='notifications') r='overview';
      if(r==='attendance') r='schedule';
      if(r==='tuition' && !canViewTuition()){toast('Tài khoản này không có quyền truy cập mục này');r='overview';}
      // Mỗi lần mở Lịch dạy đều quay về đúng tuần hiện tại; đổi tuần thủ công vẫn hoạt động
      // cho tới khi người dùng rời tab và mở Lịch dạy lại.
      if(r==='schedule') resetScheduleWeekToCurrent();
      if(r==='homework'){db.libraryTab='all';db.libraryQ='';db.libraryLevel='all';db.librarySkill='all';db.libraryUnit='all';}
      route=r; notifOpen=false; saveUser(); animateRoute();
      // Phase 5: apply the route snapshot before painting. Schedule, Attendance
      // and Makeup now reuse the shared store and only revalidate when stale.
      hydrateRouteCache(r);
      render();
      Promise.resolve(ensurePageData(r)).finally(()=>v20cSchedulePrefetch(r));
      closeDrawer()
    }


    async function login(phone,pw){
      const input=String(phone||'').trim();
      const btn=document.getElementById('loginBtn'); if(btn){btn.disabled=true; btn.textContent='Đang đăng nhập...'}
      try{
        const data=await officialFetch('/api/auth/login',{method:'POST',body:JSON.stringify({phone:input,password:String(pw||'')})});
        currentUser=mapBackendUser(data.user);
        v18dShellKey='';
        v20b4ResetRouteLoadState();
        v20b4ResetSessionMemo();
        v18gClearNetworkCache();
        v18hCleanupLegacyStorage();
        applyOfficialSettings(data.settings);
        route='overview';
        saveUser();

        // V20B.5: sau logout/login trong cùng tab, phải reset cả trạng thái loaded và hash so sánh payload.
        // Nếu hash cũ còn giữ, /api/classes có thể trả dữ liệu đúng nhưng app không apply vì tưởng payload không đổi.
        clearVolatileOfficialState();
        lazyRouteState.core={};
        await ensureCoreData({force:true});
        if(v20aLastCoreLoadError || !(db.classes||[]).length){
          await new Promise(resolve=>setTimeout(resolve,250));
          lazyRouteState.core={};
          await ensureCoreData({force:true});
        }

        render();
        if(!currentUser?.mustChangePassword){
          window.MsRouteModules?.preload(isTeachingUser()&&!isManager()?['schedule']:['classes','schedule']);
        }
        toast(currentUser?.mustChangePassword?'Cần đổi mật khẩu trước khi sử dụng':'Đăng nhập thành công');
        if(!currentUser?.mustChangePassword) v27StartRealtime();
        Promise.resolve(ensurePageData(route)).finally(()=>{
          v20cSchedulePrefetch(route);
          window.MsSmartWarmup?.schedule?.('login');
        });
      }catch(e){
        toast(e.message||'Sai thông tin đăng nhập');
      } finally { if(btn){btn.disabled=false; btn.textContent='Đăng nhập'} }
    }

    async function logout(){
      v27StopRealtime();
      try{await officialFetch('/api/auth/logout',{method:'POST',body:'{}'});}catch(e){}
      v20b4ResetRouteLoadState();
      v20b4ResetSessionMemo();
      v18gClearNetworkCache();
      clearVolatileOfficialState();
      currentUser=null;
      v18dShellKey='';
      localStorage.removeItem('msgiang_v48_user');
      render();
    }
    async function reset(){
      localStorage.removeItem('msgiang_v48_data');
      db=JSON.parse(JSON.stringify(SEED));
      normalizeV9Data();
      v20b4ResetRouteLoadState();
      v18gClearNetworkCache();
      if(currentUser) await ensurePageData(route,{force:true});
      v18hSaveCompactLocalDb();
      toast('Đã làm mới dữ liệu cục bộ');
      render();
    }
    function render(){
      try{
        if(!currentUser) return renderLogin();
        if(currentUser.mustChangePassword) return renderForceChangePassword();
        renderApp();
      }catch(e){
        console.error('Render error',e);
        root.innerHTML=`<div class="app"><main class="main" style="padding:32px"><div class="blockedBox"><h2>⚠️ Lỗi giao diện</h2><p>${h(e.message||'Có lỗi khi mở trang này')}</p><button class="btn primary" onclick="route='overview';saveUser();render()">Về tổng quan</button></div></main></div>`;
      }
    }
    function renderLogin(){root.innerHTML=`<div class="login"><div class="loginHero"><div><img src="/v15/assets/logo-msgiang.webp" width="640" height="307" decoding="async" fetchpriority="high" alt="Ms.Giang English"><h1>Quản lý trung tâm tiếng Anh mượt hơn, rõ hơn.</h1><p>Hệ thống quản lý lớp học, lịch dạy, điểm danh, học bù, học phí, đánh giá và thư viện tài liệu cho Ms.Giang English Center.</p></div><div class="pill red">✨ Ms.Giang English Center</div></div><div class="loginCard"><h2>Đăng nhập</h2><label>Số điện thoại / tài khoản<input id="lgPhone" class="input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Nhập tài khoản"></label><label>Mật khẩu<input id="lgPw" class="input" type="password" autocomplete="off" placeholder="Nhập mật khẩu"></label><button id="loginBtn" class="btn primary" style="width:100%" onclick="login(document.getElementById('lgPhone').value,document.getElementById('lgPw').value)">Đăng nhập</button></div></div>`}
    function quick(phone){toast('Chức năng đăng nhập nhanh đã tắt trên bản production')}
    function renderApp(){
      if(currentUser?.mustChangePassword) return renderForceChangePassword();
      if(route==='attendance') route='schedule';
      const nav=navItems(); const unread=0;
      if(!nav.some(n=>n[0]===route)) route='overview';
      const shellKey=v18dShellKeyFor(nav);

      // V18D: Khi app shell đã có sẵn và quyền/nav không đổi, chỉ render lại phần nội dung.
      // Giữ nguyên sidebar/topbar/bottomNav để đổi tab và thao tác trong app mượt hơn.
      if(v18dShellKey===shellKey && v18dRenderPageOnly(nav)) return;

      v18dShellKey=shellKey;
      const initialPage=page();
      root.innerHTML=`<div class="drawerOverlay" id="drawerOverlay" onclick="closeDrawer()"></div><div class="app"><aside class="sidebar" id="sidebar"><div class="logoBox"><img src="/v15/assets/logo-msgiang.webp" width="640" height="307" decoding="async" alt="logo"></div><div class="roleChip">${roleLabel()}</div><nav class="nav">${v18dNavMarkup(nav)}</nav></aside><main class="main"><header class="topbar"><div class="topbarLeft"><button class="hamb" onclick="openDrawer()">☰</button><span class="mobileBrand">Ms.Giang</span></div><div class="userpill"><div class="avatar">${isParent()?'👪':isAdmin()?'👑':isManager()?'🧭':isReceptionist()?'🛎️':'👩‍🏫'}</div><div class="userText"><b>${currentUser.name}</b><div class="mini">${roleLabel()}</div></div><button class="logout" onclick="logout()">Thoát</button></div></header><section class="content"><div class="page v20dPageReady" id="appPage">${initialPage}</div></section><nav class="bottomNav">${v18dBottomNavMarkup(nav)}</nav></main></div>`;
      const pageEl=document.getElementById('appPage');
      if(pageEl) pageEl.__v20dLastHtml=initialPage;
    }
    function openDrawer(){document.getElementById('sidebar')?.classList.add('open');document.getElementById('drawerOverlay')?.classList.add('show')}
    function closeDrawer(){document.getElementById('sidebar')?.classList.remove('open');document.getElementById('drawerOverlay')?.classList.remove('show')}
    function toggleNotif(){notifOpen=!notifOpen; renderApp()}
    function page(){
      try{
        if(isRouteWaitingForData(route)){
          ensureRouteData(route);
          const names={overview:'tổng quan',classes:'lớp học',schedule:'lịch dạy',makeup:'học bù',homework:'thư viện bài tập',evaluation:'đánh giá học sinh',tuition:'học phí',teachers:'giáo viên',settings:'cài đặt'};
          return routeLoadingMarkup(`Đang tải ${names[route]||'dữ liệu'}...`);
        }
        const lazyRendererNames={overview:'overview',classes:'classesPage',schedule:'schedulePage',makeup:'makeupPage',homework:'homeworkPage',evaluation:'evaluationPage',tuition:'tuitionPage',teachers:'teachersPage',settings:'settingsPage'};
        const lazyRendererName=lazyRendererNames[route];
        const lazyRouteReady=!lazyRendererName || (typeof window[lazyRendererName]==='function' && window.MsRouteModules?.isReady(route));
        if(lazyRendererName && !lazyRouteReady){
          const waitingRoute=route;
          window.MsRouteModules?.ensure(waitingRoute).then(()=>{
            if(currentUser && route===waitingRoute) render();
          }).catch(error=>{
            console.error('Route module load error',waitingRoute,error);
            if(currentUser && route===waitingRoute) toast(error.message||'Không tải được chức năng');
          });
          const names={classes:'lớp học',schedule:'lịch dạy',makeup:'học bù',homework:'thư viện bài tập',evaluation:'đánh giá học sinh',tuition:'học phí'};
          return routeLoadingMarkup(`Đang mở ${names[waitingRoute]||'chức năng'}...`);
        }
        const renderer=lazyRendererName?window[lazyRendererName]:window.overview;
        return renderer();
      }catch(e){
        console.error('Page render error',route,e);
        return `<div class="blockedBox"><h2>⚠️ Không mở được trang</h2><p>${h(e.message||'Có lỗi khi tải trang này')}</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" onclick="route='overview';saveUser();render()">Về tổng quan</button><button class="btn ghost" onclick="go('settings')">Mở cài đặt</button></div></div>`
      }
    }




    
// V19A: classesPage/classCard/filterClasses moved to /v15/modules/classes.js

    async function v8d1OpenStudentTransferAction(mode,classId,studentId,trigger=null){
      const key=`student-transfer-module:${mode}:${studentId}`;
      const action=window.MsUiAction?.beginLockedAction?.(key,trigger,mode==='history'?'Đang mở...':'Đang tải...');
      if(trigger && !action) return;
      try{
        await window.MsRouteModules?.ensure('studentTransfer');
        if(mode==='history') return window.openStudentClassHistory(classId,studentId);
        return window.openStudentTransferModal(classId,studentId);
      }catch(e){
        toast(e?.message||'Không tải được chức năng chuyển lớp');
      }finally{
        if(action) window.MsUiAction?.endLockedAction?.(action);
      }
    }

    
    // Phase 8D.2: openClassDetail moved to lazy runtime module.




    
    // Phase 8D.2: isClassEnded moved to lazy runtime module.

    
    // Phase 8D.2: canEditActiveClass moved to lazy runtime module.

    
    // Phase 8D.2: assertActiveClassEditable moved to lazy runtime module.

    
    // Phase 8D.2: teacherRoleValue moved to lazy runtime module.

    
    // Phase 8D.2: classNameExists moved to lazy runtime module.

    
    // Phase 8D.2: staffRoleMini moved to lazy runtime module.

    
    // Phase 8D.2: isPureTA moved to lazy runtime module.

    
    // Phase 8D.2: staffOptionsForClass moved to lazy runtime module.


    
    // Phase 8D.2: editDayOptions moved to lazy runtime module.

    
    // Phase 8D.2: editSlotOptions moved to lazy runtime module.

    
    // Phase 8D.2: editInitialSessions moved to lazy runtime module.

    
    // Phase 8D.2: buildEditClassTimeFromForm moved to lazy runtime module.

    
    // Phase 8D.2: schedulePayloadFromEditClassForm moved to lazy runtime module.

    
    // Phase 8D.2: scheduleSignatureFromPayload moved to lazy runtime module.

    
    // Phase 8D.2: scheduleSignatureForClass moved to lazy runtime module.

    
    // Phase 8D.2: scheduleDateFromKey moved to lazy runtime module.

    
    // Phase 8D.2: classHasFutureMakeupTargets moved to lazy runtime module.

    
    // Phase 8D.2: classHasSavedAttendanceInLoadedWeek moved to lazy runtime module.

    
    // Phase 8D.2: updateEditClassPreview moved to lazy runtime module.

    
    // Phase 8D.2: openEditClassModal moved to lazy runtime module.

    
    // Phase 8D.2: saveEditedClass moved to lazy runtime module.


    
    // Phase 8D.2: v27VietnamTodayText moved to lazy runtime module.

    function v27MonthLabel(monthKey){return formatTuitionMonth(monthKey||'')}
    
    // Phase 8D.2: v27EnrollmentSessionLabel moved to lazy runtime module.

    let v27EnrollmentPreviewSeq=0;
    let v27EnrollmentPreviewCache=null;
    
    // Phase 8D.2: v27ToggleEnrollmentTuition moved to lazy runtime module.

    
    // Phase 8D.2: v27RefreshEnrollmentPreview moved to lazy runtime module.

    
    // Phase 8D.2: v27ChangeEnrollmentFirstSession moved to lazy runtime module.


    
    // Phase 8D.2: openAddStudentModal moved to lazy runtime module.


    
    // Phase 8D.2: saveStudentToClass moved to lazy runtime module.



    
    // Phase 8D.2: openDeleteStudentModal moved to lazy runtime module.

    
    // Phase 8D.2: confirmDeleteStudent moved to lazy runtime module.



    
    // Phase 8D.2: suggestPromotedClassName moved to lazy runtime module.

    
    // Phase 8D.2: buildPromoteClassTimeFromForm moved to lazy runtime module.

    
    // Phase 8D.2: schedulePayloadFromPromoteClassForm moved to lazy runtime module.

    
    // Phase 8D.2: firstUpcomingDateFromPromoteForm moved to lazy runtime module.

    
    // Phase 8D.2: updatePromoteClassPreview moved to lazy runtime module.

    
    // Phase 8D.2: togglePromoteStudents moved to lazy runtime module.

    
    // Phase 8D.2: openPromoteClassModal moved to lazy runtime module.

    
    // Phase 8D.2: savePromotedClass moved to lazy runtime module.



    
    // Phase 8D.2: openEndClassModal moved to lazy runtime module.

    
    // Phase 8D.2: endClass moved to lazy runtime module.

    
    // Phase 8D.2: reactivateClass moved to lazy runtime module.


    
    // Phase 8D.2: currentPasswordMatches moved to lazy runtime module.

    
    // Phase 8D.2: openDeleteClassModal moved to lazy runtime module.

    
    // Phase 8D.2: confirmDeleteClass moved to lazy runtime module.



    // V19B: schedulePage/weeklyTable/lessonCard/mobileScheduleList moved to /v15/modules/schedule.js
    
    // Phase 8D.2: cancelClassSession moved to lazy runtime module.

    
    // Phase 8D.2: uncancelClassSession moved to lazy runtime module.

    
    // Phase 8D.2: cancelClassMakeup moved to lazy runtime module.



    
    // Phase 8D.2: teacherOptionsWithEmpty moved to lazy runtime module.

    
    // Phase 8D.2: tutoringPendingRows moved to lazy runtime module.

    
    // Phase 8D.2: tutoringStudentChecklist moved to lazy runtime module.

    
    // Phase 8D.2: openTutoringClassModal moved to lazy runtime module.

    
    // Phase 8D.2: submitTutoringClass moved to lazy runtime module.


    
    // Phase 8D.2: openClassMakeupModal moved to lazy runtime module.



    
    // Phase 8D.2: saveClassMakeup moved to lazy runtime module.


    
    // Phase 8D.2: makeupCandidateSearchIndex moved to lazy runtime module.

    let scheduleMakeupDraft=null;
    
    // Phase 8D.2: scheduleMakeupDraftState moved to lazy runtime module.

    
    // Phase 8D.2: scheduleMakeupDraftItems moved to lazy runtime module.

    
    // Phase 8D.2: scheduleMakeupDraftRecord moved to lazy runtime module.

    
    // Phase 8D.2: scheduleMakeupDraftRows moved to lazy runtime module.

    
    // Phase 8D.2: rememberScheduleMakeupSearch moved to lazy runtime module.

    
    // Phase 8D.2: queueMakeupCandidate moved to lazy runtime module.

    
    // Phase 8D.2: removeQueuedMakeup moved to lazy runtime module.

    
    // Phase 8D.2: queueMakeupCancellation moved to lazy runtime module.

    
    // Phase 8D.2: undoQueuedMakeupCancellation moved to lazy runtime module.

    
    // Phase 8D.2: makeupCandidateTableRows moved to lazy runtime module.

    
    // Phase 8D.2: groupedMakeupCandidateTables moved to lazy runtime module.

    
    // Phase 8D.2: scheduledMakeupTable moved to lazy runtime module.


    
    // Phase 8D.2: scheduleMakeupCandidatesRegionHtml moved to lazy runtime module.

    
    // Phase 8D.2: refreshScheduleMakeupDraftDom moved to lazy runtime module.


    let scheduleMakeupMonthLoadingKey='';
    
    // Phase 8D.2: openScheduleMakeup moved to lazy runtime module.


    
    // Phase 8D.2: mergeConfirmedMakeupBatch moved to lazy runtime module.

    
    // Phase 8D.2: v22RefreshScheduleBehindMakeupModal moved to lazy runtime module.


    
    // Phase 8D.2: confirmScheduleMakeupBatch moved to lazy runtime module.


    // Backward-compatible alias: selecting a row no longer writes to Supabase immediately.
    
    // Phase 8D.2: scheduleMakeupFromAbsence moved to lazy runtime module.



    // Phase 8.0: popup điểm danh nằm trong /v15/modules/attendance-modal.js và chỉ mở từ Lịch dạy.
    function tuitionFilterState(){
      db.settings.tuitionFilter ||= {q:'',status:'all',month:new Date().toISOString().slice(0,7)};
      db.settings.tuitionFilter.month ||= new Date().toISOString().slice(0,7);
      return db.settings.tuitionFilter;
    }
    async function setTuitionFilter(field,value){
      tuitionFilterState()[field]=value;
      if(field==='month'){
        save();
        db.tuitionRollup={}; db.tuitionRollupMonth=''; db.payments={}; db.tuitionMessages={};
        await refreshOfficialTuitionState();
        render();
        return;
      }
      v18bSetLocalUiState();
      if(field==='q') v18bRenderDebounced('tuitionFilter',220);
      else render();
    }
    function baseBillingRows(){
      if(isTeachingUser()&&!isManager()) return [];
      const key=v18FastKey()+'|billing|'+tuitionMonthKey();
      if(v18Memo.billingKey===key && v18Memo.billingRows) return v18Memo.billingRows;
      let rows=[];
      if(isParent()){
        const ch=new Set(selectedParentChildIds());
        rows=allStudents().filter(s=>ch.has(s.id)).map(st=>({...feeRowForStudent(st),student:st,className:st.className}));
      }else{
        rows=classesForUser().flatMap(c=>(c.students||[]).map(st=>({...feeRowForStudent(st),student:{...st,classId:c.id,className:c.name},className:c.name})));
      }
      // Phase 8D.4.3: giữ toàn bộ học sinh đang có trong lớp; học sinh chưa tới tháng tính phí hiển thị 0đ và trạng thái riêng.
      rows=sortBillingRows(rows);
      v18Memo.billingKey=key; v18Memo.billingRows=rows;
      return rows;
    }
    function visibleBillingRows(){return baseBillingRows()}
    function filteredBillingRows(){
      const f=tuitionFilterState(); const q=String(f.q||'').trim();
      return baseBillingRows().filter(r=>{
        const okQ=!q || smartSearchMatch(smartSearchIndex(r.student.name,smartInitials(r.student.name),r.className,classGradeLabel(r.className),r.student.contact||''), q);
        const okStatus=f.status==='paid'?r.paid:f.status==='unpaid'?!r.paid:true;
        return okQ && okStatus;
      });
    }



















    
    // Phase 8D.2: makeupTabStateForMonth moved to lazy runtime module.

    
    // Phase 8D.2: makeupTabAttendanceRow moved to lazy runtime module.

    
    // Phase 8D.2: makeupTabCompleted moved to lazy runtime module.

    
    // Phase 8D.2: makeupTabMissed moved to lazy runtime module.

    
    // Phase 8D.2: makeupTabSourceAbsenceExists moved to lazy runtime module.

    
    // Phase 8D.2: makeupTabCancelledBySourceCorrection moved to lazy runtime module.

    
    // Phase 8D.2: makeupTabAbsenceRecordStatus moved to lazy runtime module.

    
    // Phase 8D.2: makeupTabActiveRows moved to lazy runtime module.

    
    // Phase 8D.2: makeupTabPendingRows moved to lazy runtime module.

    
    // Phase 8D.2: makeupTabCompletedRows moved to lazy runtime module.


    
    // Phase 8D.2: makeupMonthOptions moved to lazy runtime module.

    
    // Phase 8D.2: setMakeupMonth moved to lazy runtime module.

    
    // Phase 8D.2: refreshMakeupMonths moved to lazy runtime module.

    
    // Phase 8D.2: deleteMakeupMonth moved to lazy runtime module.

    
    // Phase 8D.2: openDeleteMakeupMonthModal moved to lazy runtime module.


    
    // Phase 8D.2: makeupPage moved to lazy runtime module.



    
    // Phase 8D.2: openImportClassesModal moved to lazy runtime module.

    
    // Phase 8D.2: uploadClassImport moved to lazy runtime module.


    
    // Phase 8D.2: openClassModal moved to lazy runtime module.



    
    // Phase 8D.2: saveNewClassFromModal moved to lazy runtime module.


    function modal(html,options={}){
      const existing=modalBackdrop.querySelector('.modal');
      const wasOpen=modalBackdrop.classList.contains('show') && !!existing;
      const preserveScroll=!!options.preserveScroll;
      const modalClass=['modal',String(options.className||'').trim()].filter(Boolean).join(' ');
      const previousScroll=preserveScroll?Number(existing?.scrollTop||0):0;
      if(wasOpen){
        existing.className=modalClass;
        existing.innerHTML=html;
        existing.removeAttribute('data-saving');
        existing.removeAttribute('aria-busy');
        existing.scrollTop=preserveScroll?previousScroll:0;
      }else{
        modalBackdrop.innerHTML=`<div class="${h(modalClass)}">${html}</div>`;
        modalBackdrop.classList.add('show');
      }
      // Phase 8B: thay nội dung trên cùng modal shell để tránh fade/nháy khi chuyển bước.
      setTimeout(()=>{
        if(typeof window.v7hInitStaffModal==='function') window.v7hInitStaffModal();
        const modalEl=modalBackdrop.querySelector('.modal');
        if(preserveScroll && modalEl) modalEl.scrollTop=previousScroll;
        if(modalBackdrop.querySelector('[data-disable-modal-autofocus]')) return;
        const first=modalBackdrop.querySelector('.modal input:not([type="hidden"]):not([disabled]), .modal select:not([disabled]), .modal textarea:not([disabled])');
        if(first && first.type!=='file' && !preserveScroll) first.focus({preventScroll:true});
      },0);
    }
    function closeModal(force=false){
      const activeModal=modalBackdrop?.querySelector?.('.modal');
      if(!force && activeModal?.dataset?.saving==='1'){
        toast('Hệ thống đang xử lý, vui lòng chờ một chút.');
        return;
      }
      if(!force && typeof window.v7hStaffModalDirty==='function' && window.v7hStaffModalDirty()){
        window.v7hConfirm({title:'Bỏ thay đổi chưa lưu?',message:'Các nội dung vừa chỉnh sửa trong popup sẽ không được lưu.',confirmText:'Bỏ thay đổi',danger:true}).then(ok=>{if(ok) closeModal(true)});
        return;
      }
      const evaluationModal=activeModal?.querySelector?.('[data-evaluation-modal]');
      const evaluationStudentId=evaluationModal?.getAttribute?.('data-evaluation-student')||'';
      if(!force && evaluationStudentId && typeof v7fIsEvaluationDirty==='function' && v7fIsEvaluationDirty(evaluationStudentId)){
        if(!confirm('Đánh giá có thay đổi chưa gửi. Đóng popup vẫn giữ bản nháp trên thiết bị. Bạn có muốn đóng?')) return;
      }
      const isScheduleMakeupModal=!!modalBackdrop?.querySelector?.('[data-schedule-makeup-modal]');
      const hasUnsavedMakeupChanges=(scheduleMakeupDraft?.items||[]).length || (scheduleMakeupDraft?.cancelPlanIds||[]).length;
      if(!force && isScheduleMakeupModal && hasUnsavedMakeupChanges){
        if(!confirm('Bạn có thay đổi chưa được lưu. Đóng popup sẽ bỏ các thay đổi này.')) return;
      }
      if(isScheduleMakeupModal) scheduleMakeupDraft=null;
      modalBackdrop.classList.remove('show');
      if(v27Realtime.pendingModules.size) v27ArmRealtimeFlush(80);
    }
    let v8bToastTimer=null;
    let v8bLastToast={message:'',at:0};
    function toast(msg){
      const message=String(msg||'').trim();
      if(!message) return;
      const now=Date.now();
      if(v8bLastToast.message===message && now-v8bLastToast.at<700) return;
      v8bLastToast={message,at:now};
      const t=document.getElementById('toast');
      if(!t) return;
      clearTimeout(v8bToastTimer);
      t.textContent=message;
      t.classList.add('show');
      v8bToastTimer=setTimeout(()=>t.classList.remove('show'),2200);
    }

    function v20b19IsModalOpen(){
      return !!modalBackdrop?.classList?.contains('show');
    }
    function v20b19PrimaryButton(scope){
      if(!scope) return null;
      return scope.querySelector('button.btn.primary:not([disabled]), button.primary:not([disabled])');
    }
    function v20b19ClickPrimary(scope){
      const btn=v20b19PrimaryButton(scope);
      if(!btn) return false;
      btn.click();
      return true;
    }
    function v20b19IsTextInputTarget(el){
      if(!el) return false;
      const tag=String(el.tagName||'').toLowerCase();
      if(tag==='textarea' || tag==='select') return true;
      if(tag!=='input') return false;
      const type=String(el.type||'text').toLowerCase();
      return !['button','submit','reset','checkbox','radio','file','range','color','hidden'].includes(type);
    }
    function v20b19HandleKeyboard(e){
      if(e.defaultPrevented || e.isComposing) return;
      const target=e.target;
      const key=e.key;

      if(key==='Escape'){
        if(document.getElementById('v7hConfirmOverlay')){
          e.preventDefault();
          if(typeof window.v7hResolveConfirm==='function') window.v7hResolveConfirm(false);
          return;
        }
        if(v20b19IsModalOpen()){
          e.preventDefault();
          closeModal();
        }
        return;
      }

      if(key!=='Enter') return;
      if(target?.closest?.('button,a,[role="button"]')) return;

      // Login: nhập tài khoản/mật khẩu rồi Enter để đăng nhập.
      if(!currentUser && target?.closest?.('.loginCard')){
        if(v20b19IsTextInputTarget(target)){
          e.preventDefault();
          login(document.getElementById('lgPhone')?.value, document.getElementById('lgPw')?.value);
        }
        return;
      }

      // Đổi mật khẩu bắt buộc: Enter để lưu khi đang ở ô mật khẩu.
      if(currentUser?.mustChangePassword && target?.closest?.('.forcePasswordCard')){
        if(v20b19IsTextInputTarget(target)){
          e.preventDefault();
          saveForcedPassword();
        }
        return;
      }

      if(!v20b19IsModalOpen()) return;
      const modalEl=target?.closest?.('.modal') || modalBackdrop.querySelector('.modal');
      if(!modalEl) return;

      const tag=String(target?.tagName||'').toLowerCase();
      const isTextarea=tag==='textarea';

      // Textarea giữ Enter để xuống dòng; Ctrl/Cmd + Enter mới bấm nút chính.
      if(isTextarea){
        if(e.ctrlKey || e.metaKey){
          e.preventDefault();
          v20b19ClickPrimary(modalEl);
        }
        return;
      }

      // Modal dạng form ngắn: Enter khi đang focus input/select sẽ bấm nút chính.
      if(v20b19IsTextInputTarget(target)){
        e.preventDefault();
        v20b19ClickPrimary(modalEl);
      }
    }
    window.addEventListener('keydown', v20b19HandleKeyboard);
    function v20eFlushAllLocalCaches(){
      try{
        clearTimeout(v18LocalSaveTimer);
        v18CancelIdleLocalSave();
        v18hSaveCompactLocalDb({immediate:true});
        v20eFlushLocalSave();
      }catch(e){}
      try{v20eCommitModuleCache()}catch(e){}
    }
    window.addEventListener('pagehide', v20eFlushAllLocalCaches);
    window.addEventListener('beforeunload', v20eFlushAllLocalCaches);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='hidden'){
        v20eFlushAllLocalCaches();
        clearTimeout(v27Realtime.flushTimer);
        v27Realtime.flushTimer=null;
        clearTimeout(v21MutationRefreshState.timer);
        v21MutationRefreshState.timer=null;
      }else{
        if(currentUser && !currentUser.mustChangePassword && v27Realtime.status!=='subscribed') v27StartRealtime();
        v7iResumeDeferredWork();
      }
    });
    ensureLifecycle();
    bootstrapOfficial();
    // Phase 7I: removed the unconditional 30-second schedule render. Schedule,
    // attendance and makeup now update from local mutations, realtime broadcasts,
    // route revalidation and one visibility-resume synchronization only.
