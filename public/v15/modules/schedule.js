/*
 * Phase 8B Schedule Module
 * Render trang Lịch dạy và hỗ trợ patch đúng thẻ buổi học sau mutation.
 * Không đổi nghiệp vụ, màu sắc, trạng thái hoặc quyền thao tác.
 */

function schedulePage(){
      ensureLifecycle();
      const cls=classesForUser();
      const sessions=weekSessionsForUser();
      const slots=sortedWeekSlots(sessions);
      const counts=scheduleCounts();
      return `<div class="screenTitle"><div><h1>Thời khóa biểu tuần</h1><p>${weekLabel()}</p></div><div style="display:flex;gap:8px;flex-wrap:wrap">${canScheduleMakeup()?'<button class="btn ghost" onclick="openTutoringClassModal()">+ Thêm lớp học kèm</button>':''}${canManageOperations()?'<button class="btn primary" onclick="openClassModal()">+ Tạo lớp mới</button>':''}</div></div>
      <div class="weekToolbar">
        <div class="weekPicker"><button class="btn ghost" onclick="shiftWeek(-1)">‹ Tuần trước</button><span class="weekRange">${weekLabel()}</span><button class="btn ghost" onclick="shiftWeek(1)">Tuần sau ›</button><input class="input" type="date" value="${isoDate(weekStartDate())}" onchange="setWeekStart(this.value)"></div>
        <div class="weekLegend"><span class="pill green" data-schedule-count="done">Đã dạy: ${counts.done}</span><span class="pill orange" data-schedule-count="live">Đang dạy: ${counts.live}</span><span class="pill blue" data-schedule-count="todo">Chưa dạy: ${counts.todo}</span><span class="pill gray" data-schedule-count="cancelled">Nghỉ: ${counts.cancelled||0}</span><span class="pill red" data-schedule-count="classes">${cls.length} lớp</span></div>
      </div>
      ${weeklyTable(sessions,slots)}
      ${mobileScheduleList(sessions)}`
    }

    function weeklyTable(sessions,slots){
      if(!slots.length) return '<div class="empty">Chưa có dữ liệu lịch học.</div>';
      const cellMap=v18eScheduleCellMap(sessions);
      return `<div class="timetableShell"><table class="timetable"><thead><tr><th class="timeCol">Khung giờ</th>${WEEK_DAYS.map(d=>`<th class="${isTodayDayKey(d.key)?'todayColumn':''}">${d.label}<div class="mini">${formatVNDate(dayDateFor(d.key))}${isTodayDayKey(d.key)?' • Hôm nay':''}</div></th>`).join('')}</tr></thead><tbody>${slots.map((slot,ri)=>`<tr><td class="timeCol">${slot.replace('-', ' - ')}</td>${WEEK_DAYS.map(d=>{const daySessions=cellMap.get(`${slot}|${d.key}`)||[]; return `<td class="scheduleCell ${isTodayDayKey(d.key)?'todayColumn':''}">${daySessions.length?daySessions.map((s,i)=>lessonCard(s,ri+i)).join(''):'<div class="emptySlot">Trống</div>'}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`;
    }

    function lessonCard(s,i,isPatch=false){
      const key=sessionKeyFor(s);
      const baseSt=sessionStatus(s);
      const st=scheduleDisplayStatus(s);
      const activePlans=makeupCountForSession(key);
      const plans=makeupDisplayCountForSession(key);
      const hasAttendance=scheduleAbsenceCountVisible(key);
      const isMakeup=s.type==='class_makeup';
      const statusPill=`<span class="statusDot ${st.key}">${st.label}</span>`;
      let bodyAction='';
      let extraClass=isMakeup?'classMakeupCard':'';
      if(baseSt.key==='cancelled'){
        extraClass='cancelledCard';
        const rec=sessionCancelRecord(key)||{};
        const cm=classMakeupForSourceSession(key);
        const makeupText=cm?`<span class="classMakeupBadge">Dạy bù: ${classMakeupLabel(cm)}</span>`:'';
        bodyAction=`<div class="strictStateLine"><span class="pill gray">${rec.reason||'Nghỉ buổi học'}</span>${makeupText}</div>`;
      }else if(st.key==='unattended'){
        extraClass+=' strictUnattended';
        bodyAction=`<div class="strictStateLine"><span class="statusDot unattended">Chưa điểm danh</span></div>`;
      }else if(isMakeup){
        extraClass+=' strictTodo';
        bodyAction=`<div class="strictStateLine"><span class="classMakeupBadge">${s.sessionKind==='tutoring'?'Học kèm':'Dạy bù cả lớp'}</span></div>`;
      }else if(baseSt.key==='done'){
        extraClass+=' strictDone';
        bodyAction=`<div class="strictStateLine">${scheduleAbsenceBadgeMarkup(key)}</div>`;
      }else if(baseSt.key==='live'){
        extraClass+=' strictLive';
        bodyAction=`<div class="strictStateLine"><span class="statusDot live">${st.label}</span>${hasAttendance?` ${scheduleAbsenceBadgeMarkup(key)}`:''}</div>`;
      }else{
        extraClass+=' strictTodo';
        bodyAction=`<div class="strictStateLine">${hasAttendance?scheduleAbsenceBadgeMarkup(key):(activePlans?`<span class="makeupBadge">${plans} học bù</span>`:'<span class="pill gray">Chưa dạy</span>')}</div>`;
      }
      const total=isMakeup?Number(s.students||0)+plans:totalRosterDisplayCountForSession(s.classId,key);
      return `<div class="lessonCard ${extraClass}${isPatch?' noEntryAnimation':''}" data-schedule-session="${h(key)}" style="--i:${i}" title="Bấm để xem danh sách lớp" onclick="if(event.target.closest('button'))return;openSessionRosterPopup('${key}')"><b>${s.className}</b>${statusPill}${isMakeup?`<span class="classMakeupBadge">${s.sessionKind==='tutoring'?'Học kèm':'Dạy bù cả lớp'}</span>`:''}<div class="mini">${s.start} - ${s.end} • ${s.teacher||'-'} ${s.ta?`• TA: ${s.ta}`:''}</div><div class="mini">${s.students} chính thức • ${plans} học bù • Tổng ${total}/${db.settings.capacity||15}</div>${classById(s.classId).createdAt?'<div class="createdBadge">Lớp mới</div>':''}${bodyAction}</div>`;
    }

    function mobileScheduleLesson(s){
      const baseSt=sessionStatus(s);
      const st=scheduleDisplayStatus(s);
      const key=sessionKeyFor(s);
      const activePlans=makeupCountForSession(key);
      const plans=makeupDisplayCountForSession(key);
      const hasAttendance=scheduleAbsenceCountVisible(key);
      const isMakeup=s.type==='class_makeup';
      let action='';
      if(baseSt.key==='cancelled'){
        const cm=classMakeupForSourceSession(key);
        action=cm?`<span class="classMakeupBadge">Dạy bù: ${classMakeupLabel(cm)}</span>`:'<span class="pill gray">Nghỉ buổi học</span>';
      }else if(st.key==='unattended') action='<span class="statusDot unattended">Chưa điểm danh</span>';
      else if(isMakeup) action=`<span class="classMakeupBadge">${s.sessionKind==='tutoring'?'Học kèm':'Dạy bù cả lớp'}</span>`;
      else if(baseSt.key==='done') action=scheduleAbsenceBadgeMarkup(key);
      else if(baseSt.key==='live') action=`<span class="statusDot live">${baseSt.label}</span>${hasAttendance?` ${scheduleAbsenceBadgeMarkup(key)}`:''}`;
      else action=hasAttendance?scheduleAbsenceBadgeMarkup(key):(activePlans?`<span class="makeupBadge">${plans} học bù</span>`:'<span class="pill gray">Chưa dạy</span>');
      const total=isMakeup?Number(s.students||0)+plans:totalRosterDisplayCountForSession(s.classId,key);
      return `<div class="dayLesson" data-mobile-schedule-session="${h(key)}"><b>${s.start} - ${s.end} • ${s.className}</b> <span class="statusDot ${st.key}">${st.label}</span>${isMakeup?` <span class="classMakeupBadge">${s.sessionKind==='tutoring'?'Học kèm':'Dạy bù'}</span>`:''}<div class="mini">${s.teacher||'-'} • Tổng ${total}/${db.settings.capacity||15}</div><div class="lessonActions">${action}</div></div>`;
    }

    function mobileScheduleList(sessions){
      const dayMap=v18eScheduleDayMap(sessions);
      const byDay=WEEK_DAYS.map((d,i)=>({day:d, sessions:dayMap.get(d.key)||[], i}));
      return `<div class="mobileScheduleList">${byDay.map(({day,sessions,i})=>`<div class="dayBlock ${isTodayDayKey(day.key)?'todayColumn':''}" style="--i:${i}"><h3>${day.label} <span class="mini">${formatVNDate(dayDateFor(day.key))}${isTodayDayKey(day.key)?' • Hôm nay':''}</span></h3>${sessions.length?sessions.map(mobileScheduleLesson).join(''):'<div class="emptySlot">Không có lớp</div>'}</div>`).join('')}</div>`;
    }
