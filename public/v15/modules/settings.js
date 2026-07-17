/* Phase 8D.1: Settings/account UI, lazy-loaded for Settings. */

function parentMessagesPage(){go('tuition'); return ''}

    function notificationsPage(){return overview()}

    
    function accountLinkedRows(){
      const map=new Map();
      (db.teachers||[]).forEach(t=>map.set('teacher_'+t.id,{kind:'teacher',teacher:t,name:t.name,phone:t.phone,roles:t.roles||['teacher'],status:t.status||'active',classes:classesOfTeacher(t)}));
      if(isAdmin()){
        (db.users||[]).filter(u=>u.roles?.some(role=>role==='admin'||role==='receptionist')).forEach(u=>{
          const exists=[...map.values()].some(r=>normalizePhone(r.phone)===normalizePhone(u.phone));
          if(!exists) map.set('user_'+u.id,{kind:'user',user:u,name:u.name,phone:u.phone,roles:u.roles||[],status:u.status||'active',classes:[]});
        });
      }
      return [...map.values()].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'vi'));
    }
    function accountRoleLabel(roles=[]){
      if(roles.includes('admin')) return 'Admin';
      if(roles.includes('manager')) return 'Quản lí';
      if(roles.includes('receptionist')) return 'Lễ tân';
      if(roles.includes('ta')) return 'TA';
      return 'Giáo viên';
    }
    function accountRoleClass(roles=[]){
      if(roles.includes('admin')) return 'red';
      if(roles.includes('manager')) return 'blue';
      if(roles.includes('receptionist')) return 'yellow';
      if(roles.includes('ta')) return 'purple';
      return 'green';
    }

    
    
    function securityPasswordPanel(){
      if(!currentUser) return '';
      return `<div class="panel"><div class="panelHead"><div><h2>Đổi mật khẩu tài khoản</h2><div class="mini">Đổi mật khẩu cho tài khoản đang đăng nhập. Với Admin, đây là mật khẩu Admin hiện tại.</div></div><span class="pill red">Bảo mật</span></div>
        <div class="formGrid">
          <label>Mật khẩu mới<input id="securityPw1" class="input" type="password" autocomplete="new-password" placeholder="Tối thiểu 6 ký tự"></label>
          <label>Nhập lại mật khẩu<input id="securityPw2" class="input" type="password" autocomplete="new-password" placeholder="Nhập lại mật khẩu mới"></label>
        </div>
        <div style="text-align:right;margin-top:12px"><button class="btn primary" onclick="changeCurrentPassword()">Đổi mật khẩu</button></div>
      </div>`
    }
    async function changeCurrentPassword(){
      const p1=document.getElementById('securityPw1')?.value||'';
      const p2=document.getElementById('securityPw2')?.value||'';
      if(p1.length<6){toast('Mật khẩu mới tối thiểu 6 ký tự');return}
      if(p1!==p2){toast('Hai mật khẩu chưa giống nhau');return}
      try{
        await officialFetch('/api/auth/change-password',{method:'POST',body:JSON.stringify({password:p1})});
        currentUser.mustChangePassword=false;
        toast('Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới.');
        const a=document.getElementById('securityPw1'), b=document.getElementById('securityPw2');
        if(a) a.value=''; if(b) b.value='';
      }catch(e){toast(e.message||'Không đổi được mật khẩu')}
    }

function productionPanel(){
      if(!isAdmin()) return '';
      return `<div class="panel"><div class="panelHead"><div><h2>Production & Backup</h2><div class="mini">Kiểm tra cấu hình, Storage, bảng dữ liệu và xuất backup JSON.</div></div><span class="pill blue">V9</span></div>
        <div class="prodGrid">
          <div class="prodCard"><b>Kiểm tra hệ thống</b><span class="mini">Kiểm tra env, Supabase, các bảng bắt buộc và bucket lưu bài tập.</span><button class="btn primary" onclick="runHealthCheck()">Chạy kiểm tra</button></div>
          <div class="prodCard"><b>Backup dữ liệu</b><span class="mini">Xuất toàn bộ dữ liệu chính thành file JSON để lưu ngoài Supabase.</span><button class="btn ghost" onclick="downloadBackup()">Tải backup JSON</button></div>
          <div class="prodCard"><b>Dọn phiên hết hạn</b><span class="mini">Xóa session đã hết hạn để hệ thống gọn hơn. Không ảnh hưởng dữ liệu học.</span><button class="btn ghost" onclick="clearExpiredSessions()">Dọn session</button></div>
        </div>
        <div id="prodStatus"></div>
      </div>`
    }
    function healthStatusRow(name,ok,desc=''){
      return `<div class="prodStatusRow ${ok?'ok':'bad'}"><div><b>${h(name)}</b>${desc?`<div class="mini">${h(desc)}</div>`:''}</div><span class="pill ${ok?'green':'red'}">${ok?'OK':'Lỗi'}</span></div>`
    }
    async function runHealthCheck(){
      const box=document.getElementById('prodStatus');
      if(box) box.innerHTML='<div class="uploadProgressNote">Đang kiểm tra hệ thống...</div>';
      try{
        const data=await officialFetch('/api/health');
        const rows=[];
        rows.push(healthStatusRow('Supabase URL',!!data.env?.NEXT_PUBLIC_SUPABASE_URL));
        rows.push(healthStatusRow('Service Role Key',!!data.env?.SUPABASE_SERVICE_ROLE_KEY));
        rows.push(healthStatusRow('Storage official-exercise-library',!!data.storage?.ok,data.storage?.error||'Bucket lưu Word/Audio'));
        (data.tables||[]).forEach(t=>rows.push(healthStatusRow(t.table,t.ok,t.ok?`${t.count} dòng`:t.error)));
        if(box) box.innerHTML=`<div class="prodStatusList">${rows.join('')}</div>`;
        toast(data.ok?'Hệ thống OK':'Có mục cần kiểm tra');
      }catch(e){
        if(box) box.innerHTML=`<div class="dangerBox"><b>Không kiểm tra được hệ thống</b><span>${h(e.message||'Lỗi không xác định')}</span></div>`;
        toast(e.message||'Không kiểm tra được hệ thống');
      }
    }
    function downloadBackup(){
      window.open('/api/backup/export','_blank');
      toast('Đang tải backup JSON');
    }
    async function clearExpiredSessions(){
      try{
        const data=await officialFetch('/api/maintenance/clear-expired-sessions',{method:'POST',body:'{}'});
        toast(`Đã dọn ${data.deleted||0} session hết hạn`);
      }catch(e){toast(e.message||'Không dọn được session')}
    }

function settingsPage(){
      if(!canManageOperations()) return `<div class="screenTitle"><div><h1>Tài khoản</h1><p>Không có quyền quản lý tài khoản.</p></div></div>`;
      const rows=accountLinkedRows();
      return `<div class="screenTitle"><div><h1>${isAdmin()?'Cài đặt & tài khoản':'Quản lý tài khoản'}</h1><p>Tài khoản nội bộ được liên kết trực tiếp với danh sách giáo viên và nhân viên trung tâm.</p></div></div>
      ${isAdmin()?`<div class="panel" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">
        <label>Đơn giá/buổi <input class="input" type="number" value="${db.settings.unitPrice||70000}" onchange="db.settings.unitPrice=+this.value;save();updateBackendSetting('tuition_per_session',this.value,'Đã cập nhật đơn giá')"></label>
        <label>Giới hạn học sinh/buổi <input class="input" type="number" value="${db.settings.capacity||15}" onchange="db.settings.capacity=+this.value;save();updateBackendSetting('session_capacity',this.value,'Đã cập nhật giới hạn sĩ số')"></label>
      </div>`:''}
      ${securityPasswordPanel()}${productionPanel()}
      <div class="panel accountTable"><div class="panelHead"><div><h2>Tài khoản giáo viên / nhân viên</h2><div class="mini">Lễ tân có quyền vận hành nhưng không truy cập Học phí.</div></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="pill red">${rows.length} tài khoản</span>${isAdmin()?`<button class="btn primary" onclick="openCreateReceptionistModal()">+ Tạo Lễ tân</button>`:''}</div></div>
      <div class="accountLinkedGrid"><div class="accountLinkedRow head"><div>Tên</div><div>Tài khoản</div><div>Vai trò</div><div>Lớp</div><div>Thao tác</div></div>
      ${rows.map(r=>`<div class="accountLinkedRow"><div><b>${r.name}</b><div class="mini">${r.kind==='teacher'?'Liên kết giáo viên':'Tài khoản hệ thống'}</div></div><div>${r.phone||'-'}</div><div><span class="pill ${accountRoleClass(r.roles)}">${accountRoleLabel(r.roles)}</span></div><div>${r.classes?.length?`<span class="pill gray">${r.classes.length} lớp</span>`:'<span class="mini">Chưa gán lớp</span>'}</div><div class="accountActions">${r.kind==='teacher'?`<button class="btn ghost miniCardBtn" onclick="openTeacherDetail('${r.teacher.id}')">Chi tiết</button><button class="btn ghost miniCardBtn" onclick="resetTeacherPassword('${r.teacher.id}',this)">Reset</button><button class="btn ghost miniCardBtn dangerMini" onclick="deleteTeacher('${r.teacher.id}',this)">Xóa</button>`:(r.roles?.includes('admin')?'<span class="mini">Tài khoản Admin</span>':`<button class="btn ghost miniCardBtn" onclick="resetUserPassword('${r.user.id}',this)">Reset</button><button class="btn ghost miniCardBtn dangerMini" onclick="deleteReceptionistAccount('${r.user.id}',this)">Xóa</button>`)}</div></div>`).join('')}</div></div>`
    }
