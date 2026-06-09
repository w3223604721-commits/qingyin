// ============================================
// 轻印 - 旅行记忆 交互脚本 v2.3
// ============================================

// ---- 登录系统 (Cloudflare Workers) ----
const API_BASE = 'https://qingyin-api.w3223604721.workers.dev';
const API_TIMEOUT = 15000; // 15秒超时

function getToken() { return localStorage.getItem('qingyin_token'); }
function setToken(t) { localStorage.setItem('qingyin_token', t); }
function clearToken() { localStorage.removeItem('qingyin_token'); localStorage.removeItem('qingyin_user'); }

function getStoredUser() {
  try { var u = localStorage.getItem('qingyin_user'); return u ? JSON.parse(u) : null; }
  catch(e) { return null; }
}

// 检查登录状态
function checkLogin() {
  var token = getToken();
  if (!token) return false;
  try {
    var parts = token.split('.');
    if (parts.length !== 3) { clearToken(); return false; }
    var payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp < Date.now()) { clearToken(); return false; }
    return true;
  } catch(e) { clearToken(); return false; }
}

function showLogin() {
  $('loginOverlay').style.setProperty('display', 'flex', 'important');
  $('appContent').style.setProperty('display', 'none', 'important');
  var bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) bottomNav.style.setProperty('display', 'none', 'important');
  $('fabBtn').style.setProperty('display', 'none', 'important');
  switchLoginView('login');
}

function hideLogin() {
  $('loginOverlay').style.setProperty('display', 'none', 'important');
  $('appContent').style.setProperty('display', 'block', 'important');
  var bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) bottomNav.style.setProperty('display', 'flex', 'important');
  $('fabBtn').style.setProperty('display', 'flex', 'important');
}

// 带超时的 API 调用
async function apiCall(path, body) {
  var controller = new AbortController();
  var timeout = setTimeout(function() { controller.abort(); }, API_TIMEOUT);
  try {
    var res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    clearTimeout(timeout);

    // 关键修复：只读取一次 response body！避免 "body stream already read" 错误
    var data = null;
    try {
      data = await res.json();
    } catch(e) {
      throw new Error('服务器返回了无效数据');
    }

    if (!res.ok && data) {
      if (data.error) console.warn('[API] HTTP '+res.status+':', data.error);
      else console.warn('[API] HTTP '+res.status+' (no error field)');
    }
    return data;
  } catch(e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') throw new Error('请求超时（'+API_TIMEOUT/1000+'秒），请检查网络');
    throw e;
  }
}

// ── 登录 ──
async function doLogin() {
  var username = $('loginUsername').value.trim();
  var password = $('loginPassword').value;
  if (!username || !password) { showLoginError('请输入用户名和密码'); shakeLoginCard(); return; }
  if (!$('loginAgreed').checked) { showLoginError('请先阅读并同意用户协议和隐私声明'); shakeLoginCard(); return; }
  hideAllErrors();
  var btn = $('btnLoginSubmit');
  btn.disabled = true; btn.textContent = '登录中...';

  try {
    console.log('[登录] 发送请求 username='+username);
    var data = await apiCall('/api/login', { username: username, password: password });
    console.log('[登录] 返回:', JSON.stringify(data));

    if (data && data.ok) {
      setToken(data.token);
      localStorage.setItem('qingyin_user', JSON.stringify(data.user));
      if (data.user && data.user.nickname) {
        appData.profile.name = data.user.nickname;
        saveData(appData);
      }
      hideLogin();
      initApp();
      showToast('登录成功', 'success');
    } else {
      var errMsg = data && data.error ? data.error : '账号或密码错误';
      console.error('[登录] 失败:', errMsg);
      showLoginError(errMsg);
      shakeLoginCard();
    }
  } catch(e) {
    console.error('[登录] 异常:', e.message);
    showLoginError('网络连接失败（'+e.message+'），请稍后重试');
    shakeLoginCard();
  } finally {
    btn.disabled = false; btn.textContent = '登录';
  }
}

// ── 注册 ──
async function doRegister() {
  var username = $('regUsername').value.trim();
  var securityQuestion = $('regSecurityQ').value;
  var securityAnswer = $('regSecurityA').value.trim();
  var password = $('regPassword').value;

  if (!username || !password) { showRegisterError('用户名和密码不能为空'); shakeLoginCard(); return; }
  if (username.length < 5 || username.length > 24) { showRegisterError('用户名需要5-24位'); shakeLoginCard(); return; }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) { showRegisterError('用户名只能包含字母、数字和下划线'); shakeLoginCard(); return; }
  if (!securityQuestion) { showRegisterError('请选择密保问题'); shakeLoginCard(); return; }
  if (!securityAnswer || securityAnswer.length < 2) { showRegisterError('密保答案至少2个字符'); shakeLoginCard(); return; }
  if (password.length < 6) { showRegisterError('密码至少需要6位'); shakeLoginCard(); return; }

  hideAllErrors();
  var btn = $('btnRegSubmit');
  btn.disabled = true; btn.textContent = '注册中...';

  try {
    console.log('[注册] 发送请求 username='+username);
    var data = await apiCall('/api/register', {
      username: username,
      password: password,
      securityQuestion: securityQuestion,
      securityAnswer: securityAnswer
    });
    console.log('[注册] 返回:', JSON.stringify(data));

    if (data && data.ok) {
      // 注册成功，自动登录
      setToken(data.token);
      localStorage.setItem('qingyin_user', JSON.stringify(data.user));
      if (data.user && data.user.nickname) {
        appData.profile.name = data.user.nickname;
        saveData(appData);
      }
      hideLogin();
      initApp();
      showToast('注册成功！欢迎加入轻印', 'success');
    } else {
      var errMsg = data && data.error ? data.error : '注册失败';
      console.error('[注册] 失败:', errMsg);
      showRegisterError(errMsg);
      shakeLoginCard();
    }
  } catch(e) {
    console.error('[注册] 异常:', e.message);
    showRegisterError('网络连接失败（'+e.message+'），请检查网络后重试');
    shakeLoginCard();
  } finally {
    btn.disabled = false; btn.textContent = '注册并登录';
  }
}

// ── 忘记密码 ──
async function doQuerySecurity() {
  var username = $('fpUsername').value.trim();
  if (!username) { showFpError('请输入用户名'); return; }
  hideFpMsg();

  var btn = $('btnFpQuery');
  btn.disabled = true; btn.textContent = '查询中...';

  try {
    console.log('[忘记密码] 查询账号 username='+username);
    var data = await apiCall('/api/forgot-password', { username: username });
    console.log('[忘记密码] 返回:', JSON.stringify(data));

    if (data && data.ok) {
      $('fpQuestionText').innerHTML = '您的密保问题：<strong>' + data.securityQuestion + '</strong>';
      $('fpStep2').style.display = 'flex';
      $('btnFpQuery').textContent = '已确认账号';
      $('btnFpQuery').disabled = true;
      $('fpUsername').disabled = true;
      $('forgotPwdError').style.display = 'none';
      setTimeout(function() { $('fpAnswer').focus(); }, 200);
    } else {
      var errMsg = data && data.error ? data.error : '查询失败';
      showFpError(errMsg);
      btn.disabled = false; btn.textContent = '查询账号';
    }
  } catch(e) {
    console.error('[忘记密码] 异常:', e.message);
    showFpError('网络连接失败（'+e.message+'），请稍后重试');
    btn.disabled = false; btn.textContent = '查询账号';
  }
}

async function doResetPassword() {
  var username = $('fpUsername').value.trim();
  var answer = $('fpAnswer').value.trim();
  var newPwd = $('fpNewPwd').value;

  if (!answer) { showFpError('请输入密保答案'); return; }
  if (!newPwd || newPwd.length < 6) { showFpError('新密码至少需要6位'); return; }
  hideFpMsg();

  var btn = $('btnFpReset');
  btn.disabled = true; btn.textContent = '重置中...';

  try {
    console.log('[重置密码] 发送请求 username='+username);
    var data = await apiCall('/api/reset-password', {
      username: username,
      securityAnswer: answer,
      newPassword: newPwd
    });
    console.log('[重置密码] 返回:', JSON.stringify(data));

    if (data && data.ok) {
      showFpSuccess(data.message || '密码重置成功，请返回登录');
      clearToken();
      setTimeout(function() {
        resetForgotForm();
        switchLoginView('login');
      }, 2000);
    } else {
      var errMsg = data && data.error ? data.error : '重置失败';
      showFpError(errMsg);
      if (data && data.error === '密保答案错误') {
        $('fpAnswer').value = '';
        $('fpAnswer').focus();
      }
    }
  } catch(e) {
    console.error('[重置密码] 异常:', e.message);
    showFpError('网络连接失败（'+e.message+'），请稍后重试');
  } finally {
    btn.disabled = false; btn.textContent = '确认重置密码';
  }
}

function resetForgotForm() {
  $('fpUsername').value = '';
  $('fpUsername').disabled = false;
  $('fpStep2').style.display = 'none';
  $('fpAnswer').value = '';
  $('fpNewPwd').value = '';
  $('btnFpQuery').disabled = false;
  $('btnFpQuery').textContent = '查询账号';
  hideFpMsg();
}

// ── 忘记密码初始化 ──
function initForgotPassword() {
  resetForgotForm();
}

// ── 密码可见切换（通用） ──
function togglePwd(inputId, iconId) {
  var inp = $(inputId), icon = $(iconId);
  if (!inp || !icon) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 012 12a10.07 10.07 0 0115.94-5.94M10 16l4-4M16 10l-4 4M19.07 4.93L4.93 19.07" stroke="#6366F1" stroke-width="1.5" stroke-linecap="round"/>';
  } else {
    inp.type = 'password';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>';
  }
}

// ── 错误消息显示 ──
function showLoginError(msg) {
  var el = $('loginFormError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function showRegisterError(msg) {
  var el = $('registerFormError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function showFpError(msg) {
  var el = $('forgotPwdError');
  if (el) { el.textContent = msg; el.style.display = 'block'; el.style.background = '#FFF0F0'; el.style.color = '#E74C3C'; }
}

function showFpSuccess(msg) {
  var el = $('forgotPwdError');
  if (el) { el.textContent = msg; el.style.display = 'block'; el.style.background = '#F0FFF4'; el.style.color = '#27AE60'; }
}

function hideAllErrors() {
  var els = ['loginFormError','registerFormError','forgotPwdError'];
  for (var i=0;i<els.length;i++) { var e = $(els[i]); if (e) e.style.display = 'none'; }
}

function hideFpMsg() {
  var el = $('forgotPwdError');
  if (el) el.style.display = 'none';
}

// ── 卡片抖动 ──
function shakeLoginCard() {
  var card = document.querySelector('.login-container') || document.querySelector('.login-overlay');
  if (!card) return;
  card.style.animation = 'none';
  card.offsetHeight;
  card.style.animation = 'loginShake 0.5s ease';
}

// ── 表单切换 ──
function switchLoginView(view) {
  hideAllErrors();
  hideFpMsg();

  if (view === 'login') {
    $('loginFormView').style.display = '';
    $('registerFormView').style.display = 'none';
    $('forgotPwdView').style.display = 'none';
  } else if (view === 'register') {
    $('loginFormView').style.display = 'none';
    $('registerFormView').style.display = '';
    $('forgotPwdView').style.display = 'none';
  } else if (view === 'forgot') {
    $('loginFormView').style.display = 'none';
    $('registerFormView').style.display = 'none';
    $('forgotPwdView').style.display = '';
    initForgotPassword();
  }
}

// ── 协议页面 ──
function openAgreementPage() {
  $('agreementPageOverlay').style.display = 'block';
  $('agreementPageTitle').textContent = '轻印用户协议';
  $('agreementPageBody').innerHTML = '<h3>轻印用户协议</h3><p>更新日期：2026年6月9日</p><p>欢迎使用轻印！</p><h4>1. 服务说明</h4><p>轻印是一款旅行记忆记录工具，帮助您记录旅行足迹、管理照片和日记。</p><h4>2. 用户账号</h4><p>您需要注册账号以使用云端同步功能。请妥善保管您的账号和密码。</p><h4>3. 用户行为规范</h4><p>您承诺不利用本服务上传、发布、传播任何违法违规内容。</p><h4>4. 数据存储</h4><p>您的旅行数据将存储在本地浏览器和云端服务器。我们承诺不会将您的数据分享给第三方。</p><h4>5. 免责声明</h4><p>本产品为内测版本，可能存在不完善之处，我们会持续改进。</p><h4>6. 联系方式</h4><p>如有问题，请通过应用内"和开发者聊聊天"功能联系我们。</p>';
}

function openPrivacyPage() {
  $('agreementPageOverlay').style.display = 'block';
  $('agreementPageTitle').textContent = '轻印隐私声明';
  $('agreementPageBody').innerHTML = '<h3>轻印隐私声明</h3><p>更新日期：2026年6月9日</p><h4>1. 信息收集</h4><p>我们收集的信息包括：您注册时提供的用户名、手机号（选填），以及您使用应用过程中产生的旅行数据。</p><h4>2. 信息使用</h4><p>收集的信息仅用于为您提供旅行记录和云端同步服务，不会用于其他商业目的。</p><h4>3. 信息存储</h4><p>您的账号信息存储在 Cloudflare D1 数据库，旅行数据存储在您的浏览器本地存储中。</p><h4>4. 信息安全</h4><p>我们采用 SHA-256 哈希算法保护您的密码，使用 JWT Token 进行身份验证。</p><h4>5. 用户权利</h4><p>您可以随时导出或删除您的数据。如需彻底删除账号，请联系我们。</p><h4>6. 隐私政策更新</h4><p>我们可能会不时更新本隐私声明，更新后的声明将在应用内公布。</p>';
}

function closeAgreementPage() {
  $('agreementPageOverlay').style.display = 'none';
}

// ---- 权限管理系统 ----
const PERM_STORAGE_KEY = 'qingyin_permissions';

function loadPermissions() {
  try {
    const raw = localStorage.getItem(PERM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

function savePermissions(perms) {
  localStorage.setItem(PERM_STORAGE_KEY, JSON.stringify(perms));
}

let appPermissions = loadPermissions();

// 权限弹窗通用函数
function showPermissionModal(config) {
  const overlay = $('permissionOverlay');
  const icon = $('permissionIcon');
  const title = $('permissionTitle');
  const desc = $('permissionDesc');
  const actions = $('permissionActions');

  icon.className = 'permission-icon ' + (config.iconClass || '');
  icon.textContent = config.icon || '';
  title.textContent = config.title || '';
  desc.innerHTML = config.desc || '';
  actions.innerHTML = config.actionsHTML || '';
  actions.className = 'permission-actions' + (config.rowLayout ? ' row-layout' : '');

  // 绑定事件
  if (config.onBind) {
    setTimeout(() => config.onBind(actions), 50);
  }

  overlay.style.display = 'flex';
}

function hidePermissionModal() {
  $('permissionOverlay').style.display = 'none';
}

// ---- 数据存储 ----
const STORAGE_KEY = 'qingyin_data';
const TIANDITU_KEY = 'b467feef6280075e4d11fad1ea502609';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : getDefaultData();
  } catch(e) { return getDefaultData(); }
}

function getDefaultData() {
  return {
    journeys: [],
    checkins: [],
    footprintTracks: [], // 足迹记录轨迹
    profile: { name:'旅行者', bio:'探索世界，记录美好', avatar:null },
    currentJourneyId: null,
    trash: [], // 回收站
    carouselIndex: {}, // 每个旅程的记忆点轮播位置 { journeyId: index }
  };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let appData = loadData();

// ---- 工具函数 ----
function $(id) { return document.getElementById(id); }

function showToast(msg, type='') {
  const toast = $('toast');
  toast.textContent = msg;
  toast.className = 'toast show '+type;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 2200);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateCN(dateStr) {
  if(!dateStr) return '';
  const d=new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function formatTime(dateStr) {
  if(!dateStr) return '';
  const d=new Date(dateStr);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatDateRange(start, end) {
  if(!start&&!end) return '';
  const s=start?formatDate(start):'?';
  const e=end?formatDate(end):'?';
  return s===e ? s : `${s} - ${e}`;
}

function escapeHtml(str) {
  if(!str) return '';
  const d=document.createElement('div');
  d.textContent=str;
  return d.innerHTML;
}

function generateId(prefix) { return prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,7); }

// ---- 模态框 ----
function openModal(id) {
  $(id).style.display='flex';
  document.body.style.overflow='hidden';
}
function closeModal(id) {
  $(id).style.display='none';
  document.body.style.overflow='';
}
function closeModalOutside(event, id) {
  if(event.target===event.currentTarget) closeModal(id);
}

// ---- Tab 切换 ----
function switchTab(tabName) {
  document.querySelectorAll('.tab-page').forEach(p=>p.classList.remove('active'));
  const tp=document.getElementById('tab-'+tabName);
  if(tp) tp.classList.add('active');

  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  const nt=document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
  if(nt) nt.classList.add('active');

  const fab=$('fabBtn');
  if(tabName==='journal') fab.style.display='flex';
  else fab.style.display='none';

  // 刷新对应页面
  if(tabName==='checkin') {
    setTimeout(()=>{ if(map){ map.invalidateSize(); renderCheckinMarkers(); tryLocateUser(); } },300);
  }
  if(tabName==='journal') renderJournals();
  if(tabName==='share') { renderShareList(); initTplJourneySelect(); }
  if(tabName==='profile') renderProfile();

  // 如果在旅程详情视图且切换离开日志页
  const jd=$('journeyDetail');
  if(jd&&jd.style.display!=='none'&&tabName!=='journal'){
    jd.style.display='none';
    $('journalList').style.display='';
  }
  // 关闭子页面
  document.querySelectorAll('.sub-page').forEach(p=>p.style.display='none');
}

// ---- FAB 按钮 ----
function handleFabClick() {
  const active=document.querySelector('.tab-page.active');
  if(!active) return;
  if(active.id==='tab-journal') {
    const jd=$('journeyDetail');
    if(jd&&jd.style.display!=='none') openDayModal();
    else openJourneyModal();
  } else if(active.id==='tab-checkin') openCheckinModal();
}

// ============================================
//  旅程管理
// ============================================
function openJourneyModal(editId=null) {
  $('journeyModalTitle').textContent=editId?'编辑旅程':'新建旅程';
  $('journeyEditId').value=editId||'';

  if(editId) {
    const j=appData.journeys.find(j=>j.id===editId);
    if(j) {
      $('journeyName').value=j.name||'';
      $('journeyCity').value=j.city||'';
      $('journeyStart').value=j.startDate||'';
      $('journeyEnd').value=j.endDate||'';
      $('journeyDesc').value=j.desc||'';
      // 封面预览
      const cp=$('coverPhotoPreview');
      if(j.coverPhoto) cp.innerHTML=`<img src="${j.coverPhoto}" alt="封面">`;
      else cp.innerHTML='<span>📷 点击上传封面（拍摄/选取图片）</span>';
    }
  } else {
    $('journeyName').value=''; $('journeyCity').value='';
    $('journeyStart').value=''; $('journeyEnd').value='';
    $('journeyDesc').value=''; $('coverPhotoPreview').innerHTML='<span>📷 点击上传封面（拍摄/选取图片）</span>';
  }
  openModal('journeyModal');
}

function previewCoverPhoto(input) {
  const file=input.files[0]; if(!file)return;
  const r=new FileReader();
  r.onload=e=>$('coverPhotoPreview').innerHTML=`<img src="${e.target.result}" alt="封面">`;
  r.readAsDataURL(file);
}

function saveJourney() {
  const name=$('journeyName').value.trim();
  if(!name){ showToast('请输入旅程名称','error'); return; }

  const editId=$('journeyEditId').value;
  // 获取封面图数据
  let coverPhoto=null;
  const coverImg=$('coverPhotoPreview').querySelector('img');
  if(coverImg) coverPhoto=coverImg.src;

  const jData={
    id:editId||generateId('j'),
    name:name,
    city:$('journeyCity').value.trim(),
    startDate:$('journeyStart').value,
    endDate:$('journeyEnd').value,
    desc:$('journeyDesc').value.trim(),
    coverPhoto:coverPhoto,
    days:editId?(appData.journeys.find(j=>j.id===editId)?.days||[]):[],
    createdAt:editId?(appData.journeys.find(j=>j.id===editId)?.createdAt||new Date().toISOString()):new Date().toISOString()
  };

  if(editId) {
    const idx=appData.journeys.findIndex(j=>j.id===editId);
    if(idx>=0){
      jData.days=appData.journeys[idx].days;
      jData.createdAt=appData.journeys[idx].createdAt;
      appData.journeys[idx]=jData;
    }
  } else appData.journeys.unshift(jData);

  saveData(appData); closeModal('journeyModal'); renderJournals(); updateAllStats();
  showToast(editId?'旅程已更新':'旅程已创建','success');
}

function deleteJourney(id) {
  if(!confirm('确定删除这个旅程吗？此操作不可恢复。'))return;

  const journey=appData.journeys.find(j=>j.id===id);
  // 移入回收站
  if(journey) {
    appData.trash.push({ ...journey, type:'journey', deletedAt:new Date().toISOString() });
  }

  appData.checkins=appData.checkins.filter(c=>c.journeyId!==id);
  appData.journeys=appData.journeys.filter(j=>j.id!==id);

  if(appData.currentJourneyId===id){
    appData.currentJourneyId=null;
    $('journeyDetail').style.display='none';
    $('journalList').style.display='';
  }

  delete appData.carouselIndex[id];
  saveData(appData); renderJournals(); updateAllStats(); showToast('旅程已删除（可从回收站恢复）','success');
}

function viewJourney(id) {
  appData.currentJourneyId=id;
  const journey=appData.journeys.find(j=>j.id===id); if(!journey)return;

  $('journalList').style.display='none';
  $('journeyDetail').style.display='block';
  $('currentJourneyTitle').textContent=journey.name;

  buildCarousel(journey);
  renderDays();
}

function backToJournals() {
  appData.currentJourneyId=null;
  $('journeyDetail').style.display='none';
  $('journalList').style.display='';
  renderJournals();
}

function showJourneyMenuDetail() {
  if(!appData.currentJourneyId)return;
  showJourneyMenu(appData.currentJourneyId);
}

function showJourneyMenu(id) {
  const actions=[
    {text:'✏️ 编辑',action:()=>openJourneyModal(id)},
    {text:'🗑️ 删除',action:()=>deleteJourney(id)}
  ];
  const menu=document.createElement('div');
  menu.className='journey-context-menu';
  menu.style.cssText=`position:fixed;background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-md);box-shadow:var(--shadow-lg);z-index:500;padding:4px;min-width:140px;`;
  actions.forEach(a=>{
    const btn=document.createElement('button');
    btn.textContent=a.text;
    btn.style.cssText=`display:block;width:100%;padding:10px 14px;border:none;background:none;text-align:left;cursor:pointer;font-size:0.9rem;border-radius:var(--radius-sm);color:var(--text-primary);`;
    btn.onmouseenter=()=>btn.style.background='var(--bg-tertiary)';
    btn.onmouseleave=()=>btn.style.background='none';
    btn.onclick=()=>{document.body.removeChild(menu);a.action();};
    menu.appendChild(btn);
  });
  const ev=window.event;
  menu.style.left=Math.min(ev.clientX, window.innerWidth-160)+'px';
  menu.style.top=Math.min(ev.clientY, window.innerHeight-120)+'px';
  document.body.appendChild(menu);
  const closeMenu=e=>{
    if(!menu.contains(e.target)){document.body.removeChild(menu);document.removeEventListener('click',closeMenu);}
  };
  setTimeout(()=>document.addEventListener('click',closeMenu),0);
}

function renderJournals() {
  const list=$('journalList'); const empty=$('journalEmpty');
  if(appData.journeys.length===0){
    list.innerHTML=''; list.appendChild(empty); empty.style.display=''; return;
  }
  empty.style.display='none';

  list.innerHTML=appData.journeys.map(j=>{
    const ci=appData.checkins.filter(c=>c.journeyId===j.id).length;
    const dc=j.days?j.days.length:0;
    const cities=j.city?j.city.split(/[,，、]/).filter(Boolean):[];
    const ct=cities.slice(0,3).map(c=>`<span class="journey-tag">${escapeHtml(c.trim())}</span>`).join('');
    const coverHtml=j.coverPhoto?`<img class="journey-cover-img" src="${j.coverPhoto}" alt="">`:'';

    return `
      <div class="journey-card ${j.coverPhoto?'has-cover':''}" onclick="viewJourney('${j.id}')">
        ${coverHtml}
        <div class="journey-card-header">
          <h3>${escapeHtml(j.name)}</h3>
          <button class="journey-menu-btn" onclick="event.stopPropagation();showJourneyMenu('${j.id}')" title="更多">⋯</button>
        </div>
        <div class="journey-card-meta">
          <span>📅 ${formatDateRange(j.startDate,j.endDate)||'未设置日期'}</span>
          <span>📍 ${ci} 打卡</span>
          <span>📝 ${dc} 天</span>
        </div>
        ${j.desc?`<div class="journey-card-desc">${escapeHtml(j.desc)}</div>`:''}
        ${ct?`<div class="journey-card-tags">${ct}</div>`:''}
      </div>`;
  }).join('');
}

// ============================================
// 图片轮播（记忆点）
// ============================================
let carouselTimer=null;

function buildCarousel(journey) {
  const container=$('carouselContainer');
  const track=$('carouselTrack');
  const dots=$('carouselDots');
  const counter=$('carouselCounter');
  const emptyHint=$('carouselEmptyHint');

  // 清除旧的定时器
  clearInterval(carouselTimer);

  // 收集所有日记中的所有图片
  let allPhotos=[];
  const days=journey.days||[];
  days.forEach(day=>{
    if(day.photos&&day.photos.length>0){
      day.photos.forEach((photo,idx)=>{
        allPhotos.push({
          src:photo,
          dayTitle:day.title,
          dayDate:day.date,
          photoIndex:idx+1,
          note:(day.photoNotes&&day.photoNotes[idx])||''
        });
      });
    }
  });

  if(allPhotos.length===0){
    container.style.display='block';
    track.innerHTML='';
    dots.innerHTML='';
    counter.textContent='';
    emptyHint.style.display='flex';
    // 重置轮播数据
    window.__currentCarousel=null;
    return;
  }

  container.style.display='block';
  emptyHint.style.display='none';

  // 从上次退出的位置继续
  const savedIdx=appData.carouselIndex[journey.id]||0;
  const startIdx=Math.min(savedIdx, allPhotos.length-1);

  // 预加载第一张图片确保不黑屏
  const firstImg=new Image();
  firstImg.onload=function(){
    renderCarouselSlides();
  };
  firstImg.onerror=function(){
    renderCarouselSlides(); // 即使失败也渲染
  };
  firstImg.src=allPhotos[startIdx].src;

  function renderCarouselSlides(){
    track.innerHTML=allPhotos.map((p,i)=>`
      <div class="carousel-slide">
        <img src="${p.src}" alt="" onclick="openLightboxFromCarousel(${i})" style="cursor:pointer;" loading="lazy">
        <div class="carousel-slide-overlay">
          ${p.dayDate?formatDateCN(p.dayDate)+' · ':''}${p.dayTitle||''}
          ${(p.note)?'<br>'+escapeHtml(p.note):''}
        </div>
      </div>
    `).join('');

    dots.innerHTML=allPhotos.map((_,i)=>
      `<div class="carousel-dot${i===startIdx?' active':''}" onclick="goToCarouselSlide(${i})"></div>`
    ).join('');
    counter.textContent=`${startIdx+1} / ${allPhotos.length}`;

    // 设置初始位置
    track.style.transform=`translateX(-${startIdx*100}%)`;

    // 存储轮播数据供全局使用
    window.__currentCarousel={photos:allPhotos, index:startIdx, journeyId:journey.id};

    // 自动播放（每4秒）
    carouselTimer=setInterval(()=>{
      if(window.__currentCarousel&&window.__currentCarousel.journeyId!==journey.id){clearInterval(carouselTimer);return;}
      const nextIdx=(window.__currentCarousel.index+1)%allPhotos.length;
      goToCarouselSlide(nextIdx);
    },4000);
  }
}

function goToCarouselSlide(index) {
  const c=window.__currentCarousel;if(!c)return;
  if(index<0||index>=c.photos.length) return;
  c.index=index;
  $('carouselTrack').style.transform=`translateX(-${index*100}%)`;

  document.querySelectorAll('.carousel-dot').forEach((d,i)=>{
    d.classList.toggle('active',i===index);
  });
  $('carouselCounter').textContent=`${index+1} / ${c.photos.length}`;

  // 记忆当前位置
  if(c.journeyId) appData.carouselIndex[c.journeyId]=index;
}

// ============================================
// 日记录管理（支持多图片）
// ============================================
function openDayModal(editId=null) {
  $('dayModalTitle').textContent=editId?'编辑日记':'新的一天';
  $('dayEditId').value=editId||'';
  $('dayJourneyId').value=appData.currentJourneyId||'';
  $('dayPhotoGrid').innerHTML='';

  if(editId) {
    const journey=getCurrentJourney();
    if(journey){
      const day=journey.days.find(d=>d.id===editId);
      if(day){
        $('dayDate').value=day.date||'';
        $('dayTitle').value=day.title||'';
        $('dayContent').value=day.content||'';
        // 加载已有图片
        if(day.photos&&day.photos.length>0){
          day.photos.forEach((src,i)=>{
            addPhotoToGrid('dayPhotoGrid', src, i, (day.photoNotes&&day.photoNotes[i])||'');
          });
        }
      }
    }
  } else {
    $('dayDate').value=new Date().toISOString().split('T')[0];
    $('dayTitle').value=''; $('dayContent').value='';
  }
  // 更新计数
  updatePhotoCount('dayPhotoGrid');
  openModal('dayModal');
}

function handleDayPhotos(input) {
  const files=input.files;if(!files.length)return;
  const grid=$('dayPhotoGrid');
  const currentCount=grid.querySelectorAll('.photo-grid-item').length;
  const maxAdd=50-currentCount;

  Array.from(files).slice(0,maxAdd).forEach(file=>{
    const reader=new FileReader();
    reader.onload=function(e){
      addPhotoToGrid('dayPhotoGrid',e.target.result);
      updatePhotoCount('dayPhotoGrid');
    };
    reader.readAsDataURL(file);
  });
  input.value='';
  updatePhotoCount('dayPhotoGrid');
}

function addPhotoToGrid(gridId, src, index, note) {
  const grid=$(gridId);
  const item=document.createElement('div');
  item.className='photo-grid-item';
  item.innerHTML=`
    <img src="${src}" alt="" onclick="openLightboxForGrid('${gridId}',${index||grid.querySelectorAll('.photo-grid-item').length})">
    <button class="remove-photo-btn" onclick="removePhotoFromGrid(this.parentElement,'${gridId}')">✕</button>
  `;
  grid.appendChild(item);
}

function removePhotoFromGrid(itemEl, gridId) {
  itemEl.remove();
  updatePhotoCount(gridId);
}

function updatePhotoCount(gridId) {
  const grid=$(gridId);
  const count=grid.querySelectorAll('.photo-grid-item').length;
  // 找到旁边的提示或添加按钮区域
  const parent=grid.closest('.multi-photo-upload');
  if(parent){
    let hint=parent.querySelector('.photo-count-hint');
    if(!hint){
      hint=document.createElement('span'); hint.className='photo-count-hint';
      hint.style.cssText='font-size:0.78rem;color:var(--text-muted);width:100%;display:block;text-align:center;margin-top:4px;';
      parent.insertBefore(hint, parent.querySelector('.add-photo-btn'));
    }
    hint.textContent=`${count}/50 张照片`;
    const addBtn=parent.querySelector('.add-photo-btn');
    if(addBtn) addBtn.style.display=count>=50?'none':'flex';
  }
}

function getPhotosFromGrid(gridId) {
  const grid=$(gridId);
  const items=grid.querySelectorAll('.photo-grid-item img');
  return Array.from(items).map(img=>img.src);
}

function saveDay() {
  const journey=getCurrentJourney(); if(!journey)return;
  const title=$('dayTitle').value.trim();
  if(!title){showToast('请输入标题','error');return;}

  const editId=$('dayEditId').value;
  const photos=getPhotosFromGrid('dayPhotoGrid');

  const dayData={
    id:editId||generateId('d'),
    date:$('dayDate').value,
    title:title,
    content:$('dayContent').value.trim(),
    photos:photos
  };

  if(!journey.days) journey.days=[];
  if(editId){
    const idx=journey.days.findIndex(d=>d.id===editId);
    if(idx>=0) journey.days[idx]=dayData;
  } else journey.days.unshift(dayData);

  journey.days.sort((a,b)=>new Date(b.date)-new Date(a.date));

  saveData(appData); closeModal('dayModal'); renderDays();
  buildCarousel(getCurrentJourney()); // 刷新轮播
  showToast(editId?'日记已更新':'日记已添加','success');
}

function deleteDay(id) {
  if(!confirm('确定删除这篇日记吗？'))return;
  const journey=getCurrentJourney();if(!journey)return;
  journey.days=journey.days.filter(d=>d.id!==id);
  saveData(appData);renderDays();buildCarousel(journey);
  showToast('日记已删除','success');
}

function viewDayDetail(id) {
  const journey=getCurrentJourney();if(!journey)return;
  const day=journey.days.find(d=>d.id===id);if(!day)return;

  $('dayDetailTitle').textContent=formatDate(day.date)+' - '+day.title;

  let bodyHtml=`
    <div class="form-group"><label>日期</label><input type="date" id="ddDate" value="${day.date||''}"></div>
    <div class="form-group"><label>标题</label><input type="text" id="ddTitle" value="${escapeHtml(day.title)}"></div>
    <div class="form-group"><label>内容</label><textarea id="ddContent" rows="3">${escapeHtml(day.content||'')}</textarea></div>

    <div class="day-detail-photos">
      <div class="day-detail-photos-label">
        照片 (<span id="ddPhotoCount">${(day.photos||[]).length}</span>/50)
        <span>
          <input type="file" id="ddPhotoInput" accept="image/*" multiple onchange="handleDDPhotos(this)" style="display:none;">
          <button class="btn btn-secondary" style="font-size:0.72rem;padding:2px 8px;" onclick="triggerImagePicker({multiple:true,onFileSelected:function(input){transferFilesToInput(input,'ddPhotoInput');handleDDPhotos($('ddPhotoInput'));}})">添加照片（拍摄/选取）</button>
        </span>
      </div>
      <div class="photo-grid" id="ddPhotoGrid"></div>
    </div>
  `;
  $('dayDetailBody').innerHTML=bodyHtml;

  // 填充已有图片
  const ddGrid=$('ddPhotoGrid');
  if(day.photos){
    day.photos.forEach((src,i)=>{
      addPhotoToGrid('ddPhotoGrid', src, i);
    });
  }
  updatePhotoCount('ddPhotoGrid');

  $('dayDetailBody').dataset.dayId=id;
  openModal('dayDetailModal');
}

function handleDDPhotos(input){
  const files=input.files;if(!files.length)return;
  const grid=$('ddPhotoGrid');
  const currentCount=grid.querySelectorAll('.photo-grid-item').length;
  const maxAdd=50-currentCount;
  Array.from(files).slice(0,maxAdd).forEach(f=>{
    const r=new FileReader();
    r.onload=e=>{ addPhotoToGrid('ddPhotoGrid',e.target.result); updatePhotoCount('ddPhotoGrid'); };
    r.readAsDataURL(f);
  }); input.value='';
}

function saveDayFromDetail(){
  const dayId=$('dayDetailBody').dataset.dayId;
  const journey=getCurrentJourney();if(!journey)return;
  const day=journey.days.find(d=>d.id===dayId);if(!day)return;

  day.date=$('ddDate').value;
  day.title=$('ddTitle').value.trim();
  day.content=$('ddContent').value.trim();
  day.photos=getPhotosFromGrid('ddPhotoGrid');

  journey.days.sort((a,b)=>new Date(b.date)-new Date(a.date));
  saveData(appData);closeModal('dayDetailModal');renderDays();buildCarousel(journey);
  showToast('日记已保存','success');
}

function deleteDayFromDetail(){
  const dayId=$('dayDetailBody').dataset.dayId;
  if(!dayId)return;
  if(!confirm('确定删除这篇日记吗？'))return;
  closeModal('dayDetailModal');
  deleteDay(dayId);
}

function getCurrentJourney(){
  return appData.journeys.find(j=>j.id===appData.currentJourneyId);
}

function renderDays() {
  const journey=getCurrentJourney();const list=$('dayList');
  if(!journey||!list) return;
  const days=journey.days||[];

  if(days.length===0){
    list.innerHTML='<div class="empty-state small"><div class="empty-icon">📝</div><p>还没有日记，点击下方按钮添加</p></div>';
    return;
  }

  list.innerHTML=days.map(d=>{
    const photoCount=d.photos?d.photos.length:0;
    const photoThumbs=photoCount>0?
      `<div class="day-photo-preview-row">
         ${d.photos.slice(0,4).map((src,i)=>`
           <div class="day-photo-thumb" onclick="event.stopPropagation();openDayLightbox('${d.id}',${i})">
             <img src="${src}" alt="">
             ${i===3&&photoCount>4?`<div class="day-photo-count-badge">+${photoCount-4}</div>`:''}
           </div>
         `).join('')}
       </div>`:'';

    return `
      <div class="day-card" onclick="viewDayDetail('${d.id}')">
        <div class="day-card-header">
          <span class="day-card-date">📅 ${formatDate(d.date)}</span>
          <button class="day-card-delete" onclick="event.stopPropagation();deleteDay('${d.id}')">🗑️</button>
        </div>
        <h4>${escapeHtml(d.title)}</h4>
        ${d.content?`<p>${escapeHtml(d.content)}</p>`:''}
        ${photoThumbs}
      </div>`;
  }).join('');
}

// ============================================
// 打卡管理
// ============================================
function openCheckinModal() {
  $('checkinPlace').value='';$('checkinCity').value='';
  $('checkinProvince').value='';$('checkinNote').value='';
  $('checkinPhoto').value='';
  $('photoPreview').innerHTML='<span>📷 点击上传照片（拍摄/选取图片）</span>';
  openModal('checkinModal');
}

function previewCheckinPhoto() {
  const file=$('checkinPhoto').files[0];if(!file)return;
  const r=new FileReader();
  r.onload=e=>{$('photoPreview').innerHTML=`<img src="${e.target.result}" alt="预览">`;};
  r.readAsDataURL(file);
}

function saveCheckin() {
  const place=$('checkinPlace').value.trim();
  if(!place){showToast('请输入地点名称','error');return;}
  const city=$('checkinCity').value.trim();
  const province=$('checkinProvince').value.trim();
  const file=$('checkinPhoto').files[0];

  const processCheckin=(photoData)=>{
    // 根据省份/城市获取大致坐标
    const coords=getCoordsByLocation(province, city);
    const checkin={
      id:generateId('c'),
      place:place,
      city:city,
      province:province,
      lat:coords.lat,
      lng:coords.lng,
      photo:photoData||null,
      note:$('checkinNote').value.trim(),
      journeyId:appData.currentJourneyId||(appData.journeys[0]?.id||null),
      createdAt:new Date().toISOString()
    };
    appData.checkins.unshift(checkin);
    saveData(appData);closeModal('checkinModal');
    updateAllStats();renderCheckins();renderCheckinMarkers();

    // 检查是否需要点亮勋章
    checkAndUnlockMedal(province, city, place);
    showToast('打卡成功！','success');
  };
  if(file){
    const r=new FileReader();
    r.onload=e=>processCheckin(e.target.result);r.readAsDataURL(file);
  } else processCheckin(null);
}

function getCoordsByLocation(province, city) {
  // 中国各省市的大致坐标（用于地图标记）
  const cityMap={
    '北京':[39.9042,116.4074], '天津':[39.3434,117.3616],
    '上海':[31.2304,121.4737], '重庆':[29.4316,106.9123],
    '石家庄':[38.0428,114.5149], '太原':[37.8706,112.5489],
    '呼和浩特':[40.8414,111.7519], '沈阳':[41.8057,123.432],
    '长春':[43.8171,125.3235], '哈尔滨':[45.8038,126.535],
    '南京':[32.0603,118.7969], '杭州':[30.2741,120.1551],
    '合肥':[31.8206,117.2272],
    '南昌':[28.6820,115.8579], '济南':[36.6512,117.1201],
    '郑州':[34.7466,113.6254], '武汉':[30.5928,114.3055],
    '长沙':[28.2282,112.9388], '广州':[23.1291,113.2644],
    '南宁':[22.8170,108.3665], '海口':[20.0174,110.3492],
    '成都':[30.5728,104.0668], '贵阳':[26.6470,106.6302],
    '昆明':[25.0389,102.7183], '拉萨':[29.6500,91.1000],
    '西安':[34.3416,108.9398], '兰州':[36.0611,103.8343],
    '西宁':[36.6171,101.7782], '银川':[38.4872,106.2309],
    '乌鲁木齐':[43.8256,87.6168], '呼和浩特':[40.8414,111.7519],
    '桂林':[25.2744,110.2900], '三亚':[18.2528,109.5120],
    '青岛':[36.0671,120.3826], '大连':[38.9140,121.6147],
    '厦门':[24.4798,118.0894], '深圳':[22.5431,114.0579],
    '苏州':[31.2989,120.5853], '宁波':[29.8683,121.5440],
    '黄山':[30.1370,118.1689], '张家界':[29.1160,110.4790],
    '丽江':[26.8721,100.2290], '大理':[25.6007,100.2166]
  };
  // 先精确匹配城市
  for(const [k,v] of Object.entries(cityMap)){
    if(city.includes(k)||k.includes(city)) return {lat:v[0],lng:v[1]};
  }
  // 匹配省份前缀
  if(province){
    for(const [k,v] of Object.entries(cityMap)){
      if(k.startsWith(province.slice(0,2))) return {lat:v[0]+(Math.random()-0.5)*1,lng:v[1]+(Math.random()-0.5)*1};
    }
  }
  // 默认中国中心偏移
  return {lat:35+(Math.random()-0.5)*15, lng:105+(Math.random()-0.5)*20};
}

function deleteCheckin(id) {
  if(!confirm('确定删除这个打卡记录吗？'))return;
  appData.checkins=appData.checkins.filter(c=>c.id!==id);
  saveData(appData);updateAllStats();renderCheckins();renderCheckinMarkers();
  showToast('打卡已删除','success');
}

function renderCheckins() {
  // 打卡列表已从界面移除，仅保留函数供其他模块调用
  // 打卡数据现在通过地图标记和统计面板展示
}

function showCheckinDetail(checkinId){
  const c=appData.checkins.find(x=>x.id===checkinId);
  if(!c) return;
  // 切换到打卡页面并在地图上高亮该标记
  switchTab('checkin');
  setTimeout(()=>{
    if(map && c.lat && c.lng){
      map.setView([c.lat, c.lng], 15);
      markersLayer.eachLayer(function(layer){
        if(layer._checkinData && layer._checkinData.id===checkinId){
          layer.openPopup();
        }
      });
    }
  },500);
}

// ============================================
// 地图 (天地图)
// ============================================
let map=null;
let markersLayer=null;
let replayTimer=null;
let fullscreenMap=null;
let footprintTracking=false;
let footprintWatchId=null;
let footprintPoints=[];
let footprintPolyline=null;
let footprintMarkersLayer=null;

function initMap() {
  if(map)return;
  map=L.map('map',{
    center:[35.86,104.19], zoom:4,
    zoomControl:false, attributionControl:false,
    minZoom:3, maxZoom:18,
    maxBounds:[[14,72],[54,136]] // 限制在中国范围
  });

  // 天地图矢量底图
  L.tileLayer(`http://t0.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=${TIANDITU_KEY}`,{
    maxZoom:18, subdomains:['t0','t1','t2','t3','t4','t5','t6','t7']
  }).addTo(map);

  // 天地图注记
  L.tileLayer(`http://t0.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=${TIANDITU_KEY}`,{
    maxZoom:18, subdomains:['t0','t1','t2','t3','t4','t5','t6','t7']
  }).addTo(map);

  L.control.zoom({position:'topleft'}).addTo(map);
  markersLayer=L.layerGroup().addTo(map);
  footprintMarkersLayer=L.layerGroup().addTo(map);

  // 加载中国省级行政区划边界
  loadChinaProvinces();

  renderCheckinMarkers();

  // 尝试获取用户位置
  tryLocateUser();
}

// 加载中国省级行政区划 GeoJSON 并叠加到地图
function loadChinaProvinces(){
  fetch('china_provinces.json')
    .then(r=>r.json())
    .then(geojson=>{
      L.geoJSON(geojson,{
        style:{
          color:'#6366F1',
          weight:1.5,
          fillColor:'#A5B4FC',
          fillOpacity:0.08,
          dashArray:'4 3'
        },
        onEachFeature:function(feature, layer){
          if(feature.properties&&feature.properties.name){
            layer.bindTooltip(feature.properties.name,{
              permanent:false,
              direction:'center',
              className:'province-tooltip',
              offset:[0,0]
            });
          }
          // 鼠标悬停高亮效果
          layer.on({
            mouseover:function(e){ e.target.setStyle({weight:2.5,fillColor:'#818CF8',fillOpacity:0.2,color:'#4F46E5'}); },
            mouseout:function(e){ e.target.setStyle({color:'#6366F1',weight:1.5,fillColor:'#A5B4FC',fillOpacity:0.08,dashArray:'4 3'}); }
          });
        }
      }).addTo(map);
    })
    .catch(err=>{
      console.warn('省级行政区划数据加载失败:', err);
    });
}

function tryLocateUser(){
  if(!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(function(pos){
    if(map){
      map.setView([pos.coords.latitude, pos.coords.longitude], 14);
      L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
        radius:8, color:'#6366F1', fillColor:'#6366F1', fillOpacity:0.3, weight:2
      }).addTo(map).bindPopup('📍 我的位置');
    }
  }, function(){}, {enableHighAccuracy:true, timeout:10000});
}

function locateUserOnMap(){
  if(!navigator.geolocation){ showToast('您的设备不支持定位','error'); return; }
  showToast('正在定位...','');
  navigator.geolocation.getCurrentPosition(function(pos){
    if(map){
      map.setView([pos.coords.latitude, pos.coords.longitude], 15);
      L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
        radius:8, color:'#6366F1', fillColor:'#6366F1', fillOpacity:0.4, weight:2
      }).addTo(map).bindPopup('📍 我的位置').openPopup();
      showToast('定位成功','success');
    }
  }, function(err){
    showToast('定位失败：'+(err.message||'未知原因'),'error');
  }, {enableHighAccuracy:true, timeout:15000});
}

function renderCheckinMarkers() {
  if(!map)initMap();if(!markersLayer)return;
  markersLayer.clearLayers();
  const markers=[];

  appData.checkins.forEach(c=>{
    const marker=L.marker([c.lat,c.lng])
      .bindPopup(`
        <div style="font-family:sans-serif;min-width:140px;font-size:13px;">
          <strong style="font-size:15px;">${escapeHtml(c.place)}</strong>
          ${c.province?`<br><span style="color:#64748B;">${escapeHtml(c.province)}</span>`:''}
          ${c.city?`<br><span style="color:#64748B;">${escapeHtml(c.city)}</span>`:''}
          ${c.note?`<br><span style="margin-top:4px;display:block;color:#475569;">${escapeHtml(c.note)}</span>`:''}
          ${c.photo?`<br><img src="${c.photo}" style="width:100%;max-width:160px;margin-top:6px;border-radius:6px;">`:''}
        </div>`,{maxWidth:220});
    marker._checkinData=c;
    markers.push(marker);
    markersLayer.addLayer(marker);
  });

  if(markers.length>0){
    const group=L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2),{maxZoom:12});
  }
  return markers;
}

// ============================================
// 足迹记录功能
// ============================================
function toggleFootprintTracking(){
  if(footprintTracking){
    stopFootprintTracking();
  } else {
    startFootprintTracking();
  }
}

function startFootprintTracking(){
  if(!navigator.geolocation){
    showToast('您的设备不支持定位功能','error'); return;
  }

  footprintTracking=true;
  footprintPoints=[];
  if(footprintPolyline){map.removeLayer(footprintPolyline);footprintPolyline=null;}
  if(footprintMarkersLayer){footprintMarkersLayer.clearLayers();}

  // UI 更新
  const btn=$('fpTrackBtn');
  btn.classList.add('recording');
  btn.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>停止记录';

  const status=$('footprintStatus');
  status.classList.add('tracking');
  $('footprintStatusText').textContent='记录中...';
  $('fpPointCount').textContent='0';

  showToast('开始记录足迹...','success');

  footprintWatchId=navigator.geolocation.watchPosition(
    function(pos){
      const pt={lat:pos.coords.latitude, lng:pos.coords.longitude, time:new Date().toISOString()};
      footprintPoints.push(pt);
      $('fpPointCount').textContent=footprintPoints.length;

      // 添加足迹标记
      if(footprintMarkersLayer){
        L.circleMarker([pt.lat, pt.lng], {
          radius:4, color:'#EF4444', fillColor:'#EF4444', fillOpacity:0.6, weight:1
        }).addTo(footprintMarkersLayer);
      }

      // 更新轨迹线
      if(footprintPoints.length>=2){
        if(footprintPolyline) map.removeLayer(footprintPolyline);
        footprintPolyline=L.polyline(
          footprintPoints.map(p=>[p.lat, p.lng]),
          {color:'#EF4444', weight:3, opacity:0.7, dashArray:'8 4'}
        ).addTo(map);
      }

      // 跟随位置
      if(map) map.panTo([pt.lat, pt.lng], {animate:true});
    },
    function(err){
      console.error('定位错误:', err);
      showToast('定位失败，请检查定位权限','error');
    },
    {enableHighAccuracy:true, timeout:15000, maximumAge:0}
  );
}

function stopFootprintTracking(){
  footprintTracking=false;
  if(footprintWatchId){
    navigator.geolocation.clearWatch(footprintWatchId);
    footprintWatchId=null;
  }

  // UI 更新
  const btn=$('fpTrackBtn');
  btn.classList.remove('recording');
  btn.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>开始记录';

  const status=$('footprintStatus');
  status.classList.remove('tracking');
  $('footprintStatusText').textContent='就绪';

  const count=footprintPoints.length;
  if(count>0){
    showToast(`足迹记录完成，共记录 ${count} 个位置点`,'success');

    // 将足迹点保存到数据中
    if(!appData.footprintTracks) appData.footprintTracks=[];
    appData.footprintTracks.push({
      id:generateId('fp'),
      points:footprintPoints,
      startedAt:footprintPoints[0]?.time,
      endedAt:footprintPoints[footprintPoints.length-1]?.time,
      pointCount:count,
      createdAt:new Date().toISOString()
    });
    saveData(appData);
  }

  // 调整地图视野以显示整条轨迹
  if(footprintPoints.length>0 && map){
    const bounds=L.latLngBounds(footprintPoints.map(p=>[p.lat, p.lng]));
    map.fitBounds(bounds.pad(0.2));
  }
}

function toggleReplay() {
  const btn=$('btnReplay');
  if(replayTimer){
    clearInterval(replayTimer);replayTimer=null;
    btn.innerHTML=`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>足迹回放`;
    btn.style.background='var(--bg-primary)';btn.style.color='var(--text-primary)';
    if(map&&markersLayer){
      const ms=[]; markersLayer.eachLayer(l=>ms.push(l));
      if(ms.length>0) map.fitBounds(L.featureGroup(ms).getBounds().pad(0.2));
    } return;
  }

  const checkins=[...appData.checkins].reverse();
  if(checkins.length===0){showToast('还没有打卡记录','error');return;}
  btn.innerHTML=`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>停止回放`;
  btn.style.background='var(--danger)';btn.style.color='white';

  const mks=[]; markersLayer.eachLayer(l=>mks.push(l));
  if(mks.length===0) return;

  map.setView(mks[0].getLatLng(),10);
  let idx=0;
  replayTimer=setInterval(()=>{
    if(idx>=mks.length){
      clearInterval(replayTimer);replayTimer=null;
      btn.innerHTML=`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>足迹回放`;
      btn.style.background='var(--bg-primary)';btn.style.color='var(--text-primary)';
      showToast('回放完成','success'); return;
    }
    const mk=mks[idx];map.setView(mk.getLatLng(),10);mk.openPopup();
    const el=mk.getElement();
    if(el){el.style.filter='hue-rotate(180deg)brightness(1.3)';setTimeout(()=>{if(el)el.style.filter='';},700);}
    idx++;
  },1200);
}

// 全屏地图
function openMapFullscreen(ev){
  // 只在非控制按钮区域触发（如果通过点击地图触发）
  if(ev&&ev.target&&ev.target.closest&&ev.target.closest('.map-controls-overlay'))return;
  $('fullscreenMapOverlay').style.display='flex';
  if(!fullscreenMap){
    fullscreenMap=L.map('fullscreenMapEl',{center:[35.86,104.19],zoom:4,zoomControl:true,attributionControl:false,minZoom:3,maxZoom:18});
    L.tileLayer(`http://t0.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=${TIANDITU_KEY}`,{maxZoom:18}).addTo(fullscreenMap);
    L.tileLayer(`http://t0.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=${TIANDITU_KEY}`,{maxZoom:18}).addTo(fullscreenMap);
  }
  // 复制标记
  fullscreenMap.eachLayer(l=>{if(l!==fullscreenMap)fullscreenMap.removeLayer(l);});
  const fsGroup=L.layerGroup().addTo(fullscreenMap);
  appData.checkins.forEach(c=>{
    L.marker([c.lat,c.lng]).bindPopup(`<strong>${escapeHtml(c.place)}</strong>${c.city?'<br>'+escapeHtml(c.city):''}`).addTo(fsGroup);
  });
  if(appData.checkins.length>0){
    const g=L.featureGroup(fsGroup.getLayers());
    fullscreenMap.fitBounds(g.getBounds().pad(0.1));
  }
  setTimeout(()=>fullscreenMap.invalidateSize(),200);
}
function closeFullscreenMap(ev){
  if(ev.target===ev.currentTarget) closeFullscreenMapDirect();
}
function closeFullscreenMapDirect(){ $('fullscreenMapOverlay').style.display='none'; }

// ============================================
// 统计详情面板
// ============================================
function openStatDetail(type) {
  const titles={checkins:'打卡点详情',photos:'照片集锦',provinces:'省份/城市分布',journeys:'旅程列表'};
  $('statDetailTitle').textContent=titles[type]||'统计详情';

  let html='';
  switch(type){
    case 'checkins':
      html=appData.checkins.length>0?appData.checkins.map(c=>`
        <div class="stat-detail-item" onclick="showCheckinDetail('${c.id}')">
          <div class="stat-detail-icon">${c.photo?`<img src="${c.photo}" style="width:100%;height:100%;object-fit:cover;">`:'📍'}</div>
          <div class="stat-detail-text">
            <h5>${escapeHtml(c.place)}</h5>
            <small>${c.province?escapeHtml(c.province):''}${c.province&&c.city?' / ':''}${c.city?escapeHtml(c.city):''}</small>
            ${c.note?`<div class="stat-detail-note">${escapeHtml(c.note)}</div>`:''}
            ${c.createdAt?`<small class="stat-detail-time">${formatDateCN(c.createdAt)}</small>`:''}
          </div>
        </div>`).join(''):'<div class="empty-state small"><p>暂无打卡记录</p></div>';
      break;
    case 'photos':
      const photosWithCheckins=appData.checkins.filter(c=>c.photo);
      html=photosWithCheckins.length>0?photosWithCheckins.map(c=>`
        <div class="stat-detail-item">
          <div class="stat-detail-icon"><img src="${c.photo}"></div>
          <div class="stat-detail-text">
            <h5>${escapeHtml(c.place)}</h5>
            <small>${c.city?escapeHtml(c.city):''}</small>
          </div>
        </div>`).join(''):'<div class="empty-state small"><p>暂无照片</p></div>';
      break;
    case 'provinces':
      const provSet={};
      appData.checkins.forEach(c=>{
        const p=c.province||c.city||'未知';
        if(!provSet[p]) provSet[p]={count:0,places:[]};
        provSet[p].count++;
        provSet[p].places.push(c.place);
      });
      html=Object.keys(provSet).length>0?Object.entries(provSet).map(([p,data])=>`
        <div class="stat-detail-item">
          <div class="stat-detail-icon">🗺️</div>
          <div class="stat-detail-text">
            <h5>${escapeHtml(p)} (${data.count}个)</h5>
            <small>${data.places.slice(0,5).map(pl=>escapeHtml(pl)).join(', ')}</small>
          </div>
        </div>`).join(''):'<div class="empty-state small"><p>暂无数据</p></div>';
      break;
    case 'journeys':
      html=appData.journeys.length>0?appData.journeys.map(j=>`
        <div class="stat-detail-item">
          <div class="stat-detail-icon">${j.coverPhoto?`<img src="${j.coverPhoto}">`:'📖'}</div>
          <div class="stat-detail-text">
            <h5>${escapeHtml(j.name)}</h5>
            <small>${formatDateRange(j.startDate,j.endDate)} · ${(j.days||[]).length}天</small>
          </div>
        </div>`).join(''):'<div class="empty-state small"><p>暂无旅程</p></div>';
      break;
  }
  $('statDetailBody').innerHTML=html;
  openModal('statDetailModal');
}

// ============================================
// 分享模块
// ============================================
function switchShareTab(tab) {
  document.querySelectorAll('.share-tab').forEach(t=>t.classList.remove('active'));
  document.querySelector(`.share-tab[data-share-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.share-panel').forEach(p=>p.classList.remove('active'));
  $(`sharePanel${tab.charAt(0).toUpperCase()+tab.slice(1)}`).classList.add('active');
}

function renderShareList() {
  const list=$('shareJourneyList');const empty=$('shareEmpty');
  if(appData.journeys.length===0){
    list.innerHTML='';list.appendChild(empty);empty.style.display='';return;
  }
  empty.style.display='none';
  list.innerHTML=appData.journeys.map(j=>{
    const ci=appData.checkins.filter(c=>c.journeyId===j.id).length;
    const pc=appData.checkins.filter(c=>c.journeyId===j.id&&c.photo).length;
    const dc=j.days?j.days.length:0;
    // 收集预览照片（最多4张）
    const previewPhotos=[];
    if(j.coverPhoto) previewPhotos.push(j.coverPhoto);
    if(j.days) j.days.forEach(d=>{if(d.photos) d.photos.forEach(p=>previewPhotos.push(p));});
    const thumbs=previewPhotos.slice(0,4);
    const moreCount=Math.max(0,previewPhotos.length-4);

    return `
      <div class="share-journey-card">
        <div class="share-card-header">
          <div class="share-card-title-row">
            <h4>${escapeHtml(j.name)}</h4>
            ${j.city?`<span class="share-card-badge">${escapeHtml(j.city)}</span>`:''}
          </div>
        </div>
        <div class="share-card-body">
          <div class="share-card-meta-row">
            <span class="share-meta-item">📅 ${formatDateRange(j.startDate,j.endDate)||'未设置日期'}</span>
            <span class="share-meta-item">📝 ${dc}天日记</span>
            <span class="share-meta-item">📍 ${ci}打卡</span>
            <span class="share-meta-item">📷 ${pc}照片</span>
          </div>
          ${j.desc?`<div class="share-card-desc">${escapeHtml(j.desc)}</div>`:''}
          ${thumbs.length>0?`
            <div class="share-card-thumbs">
              ${thumbs.map(src=>`<div class="share-card-thumb"><img src="${src}" alt=""></div>`).join('')}
              ${moreCount>0?`<div class="share-card-thumb more">+${moreCount}</div>`:''}
            </div>
          `:''}
        </div>
        <div class="share-card-footer">
          <button class="share-card-action export-action" onclick="exportJourneyAsImage('${j.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            导出图片
          </button>
          <button class="share-card-action receipt-action" onclick="openReceipt('${j.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="13" y2="16"/></svg>
            小票分享
          </button>
        </div>
      </div>`;
  }).join('');
}

// 模板风格选择
function selectTemplateStyle(style) {
  document.querySelectorAll('.template-style-card').forEach(c=>{
    c.classList.toggle('active',c.dataset.style===style);
  });
  if(style!=='receipt'){
    showToast(`${style.toUpperCase()} 风格即将上线，敬请期待！`,'');
  }
}

// 初始化模板（已废弃旅程选择，改用自定义图片列表）
function initTplJourneySelect() {
  // 保留函数以防其他地方调用，不再使用旅程选择器
}

// 自定义模板照片处理（每张图配文字、地点、日期）
let tplCustomPhotos=[]; // [{src, text, place, date}]
function handleTplPhotos(input){
  const files=input.files;if(!files.length)return;
  const maxAdd=9-tplCustomPhotos.length;
  if(maxAdd<=0){ showToast('最多只能添加9张图片','error'); return; }
  Array.from(files).slice(0,maxAdd).forEach(f=>{
    const r=new FileReader();
    r.onload=e=>{ tplCustomPhotos.push({src:e.target.result, text:'', place:'', date:''}); renderTplPhotoEditor(); };
    r.readAsDataURL(f);
  }); input.value='';
}
function renderTplPhotoEditor(){
  const list=$('tplPhotoEditorList');
  const addBtn=$('tplAddPhotoBtn');
  const hint=$('tplPhotoCountHint');
  if(!list) return;

  list.innerHTML=tplCustomPhotos.map((item,i)=>`
    <div class="tpl-photo-edit-row">
      <div class="tpl-photo-edit-img">
        <img src="${item.src}" alt="">
        <button class="remove-photo-btn" onclick="removeTplPhoto(${i})">✕</button>
      </div>
      <div class="tpl-photo-edit-inputs">
        <input type="text" placeholder="为这张图片写一句话..." maxlength="50"
               value="${escapeHtml(item.text)}"
               oninput="updateTplPhotoField(${i},'text',this.value)">
        <div class="tpl-photo-meta-row">
          <input type="text" placeholder="地点" maxlength="30"
                 value="${escapeHtml(item.place||'')}"
                 oninput="updateTplPhotoField(${i},'place',this.value)">
          <input type="date"
                 value="${item.date||''}"
                 oninput="updateTplPhotoField(${i},'date',this.value)">
        </div>
      </div>
    </div>
  `).join('');

  if(hint) hint.textContent=`${tplCustomPhotos.length}/9 张`;
  if(addBtn) addBtn.style.display=tplCustomPhotos.length>=9?'none':'flex';
}
function updateTplPhotoField(i, field, value){
  if(tplCustomPhotos[i]) tplCustomPhotos[i][field]=value;
}
function removeTplPhoto(i){
  tplCustomPhotos.splice(i,1);
  renderTplPhotoEditor();
}

// 生成自定义小票预览（仅用自定义图片和文字，不用旅程数据）
function generateCustomReceipt(){
  const customTitle=$('tplCustomTitle').value.trim()||'这一段生活的小票';

  if(tplCustomPhotos.length===0){
    showToast('请至少添加2张图片','error');return;
  }
  if(tplCustomPhotos.length<2){
    showToast('请至少添加2张图片来生成小票','error');return;
  }

  // 用自定义图片构建条目（每张图独立携带地点、日期、文字）
  const photoItems=tplCustomPhotos.slice(0,9).map((item,i)=>({
    img:item.src,
    time:item.date?formatDateCN(item.date):(item.place?'': ''),
    place:item.place||'',
    title:`PHOTO ${String(i+1).padStart(2,'0')}`,
    desc:item.text||'美好的一刻'
  }));

  // 汇总信息行
  const hasAnyDate=photoItems.some(p=>p.time);
  const hasAnyPlace=photoItems.some(p=>p.place);
  let infoHtml='';
  if(hasAnyPlace||hasAnyDate){
    infoHtml='<div class="receipt-journey-info">';
    if(hasAnyPlace){
      const places=photoItems.map(p=>p.place).filter(Boolean);
      if(places.length>0) infoHtml+=`<div class="rct-place" style="font-size:0.9rem;font-weight:700;color:var(--receipt-text);">${[...new Set(places)].join(' · ')}</div>`;
    }
    infoHtml+=`<div class="rct-date-range">${photoItems.length} PHOTOS</div></div>`;
  }

  const bodyHtml=`
    ${infoHtml}
    ${photoItems.map(pi=>`
      <div class="receipt-photo-item">
        <div class="rp-photo-box"><img src="${pi.img}" alt=""></div>
        <div class="rp-photo-info">
          <div class="rp-photo-time">${pi.place?pi.place+(pi.time?' · '+pi.time:''):(pi.time||'')}</div>
          <div class="rp-photo-title">${pi.title}</div>
          <div class="rp-photo-desc">${escapeHtml(pi.desc)}😊</div>
        </div>
      </div>`).join('')}
    <div class="receipt-footer-note">
      几张照片跨过不止一天，像把一小段生活折迭进了同一张纸里。
    </div>
    <div class="receipt-qr-section" id="receiptQRSection">
      <div class="qr-placeholder" style="text-align:center;margin:12px 0;">
        <div style="width:100px;height:100px;margin:0 auto;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border-radius:8px;color:#999;font-size:0.7rem;">QR CODE</div>
      </div>
      <div class="receipt-qr-hint">扫码进入这个链接，也能生成自己的生活小票</div>
    </div>
    <div class="receipt-qr-toggle-wrap">
      <label class="receipt-qr-toggle">
        <input type="checkbox" id="receiptQRToggle" checked onchange="toggleReceiptQR()">
        <span class="receipt-qr-toggle-label">显示二维码</span>
      </label>
    </div>
  `;

  $('rctMainTitle').textContent=customTitle;
  $('receiptBodyContent').innerHTML=bodyHtml;

  // 存储当前小票数据供导出使用
  window.__receiptData={title:customTitle, photoItems, isCustom:true};

  $('receiptOverlay').style.display='flex';
}

function toggleReceiptQR(){
  const checked=$('receiptQRToggle').checked;
  const qrSection=$('receiptQRSection');
  if(qrSection) qrSection.style.display=checked?'':'none';
}

// 小票打开（原有功能）
function openReceipt(journeyId){
  const journey=appData.journeys.find(j=>j.id===journeyId);if(!journey)return;
  const checkins=appData.checkins.filter(c=>c.journeyId===journeyId);

  let photoItems=[];
  // 打卡照片
  checkins.filter(c=>c.photo).forEach(c=>{
    photoItems.push({img:c.photo,time:formatTime(c.createdAt)||'00:00',place:c.city||'',title:`PHOTO ${String(photoItems.length+1).padStart(2,'0')}`,desc:c.note||escapeHtml(c.place)});
  });
  // 日记照片
  if(journey.days) journey.days.forEach(day=>{
    if(day.photos) day.photos.forEach(p=>{
      photoItems.push({img:p,time:formatDate(day.date)||'',place:day.title||'',title:`PHOTO ${String(photoItems.length+1).padStart(2,'0')}`,desc:day.content?day.content.slice(0,30):'美好时刻'});
    });
  });
  photoItems=photoItems.slice(0,9);

  const bodyHtml=`\n    <div class="receipt-journey-info">\n      <div class="rct-date-range" style="color:var(--warning);">📖 旅程记录</div>\n      <div class="rct-date-range">${formatDateRange(journey.startDate,journey.endDate)||'--'}</div>\n      <div class="rct-place">${journey.city||''} · ${photoItems.length} PHOTOS</div>\n    </div>\n    ${photoItems.map(pi=>`\n      <div class="receipt-photo-item">\n        <div class="rp-photo-box"><img src="${pi.img}" alt=""></div>\n        <div class="rp-photo-info">\n          <div class="rp-photo-time">${pi.time}${pi.place?' · '+escapeHtml(pi.place):''}</div>\n          <div class="rp-photo-title">${pi.title}</div>\n          <div class="rp-photo-desc">${pi.desc}😊</div>\n        </div>\n      </div>`).join('')}\n    <div class="receipt-footer-note">几张照片跨过不止一天，像把一小段生活折迭进了同一张纸里。</div>\n    <div class="receipt-qr-section" id="receiptQRSection">\n      <div class="qr-placeholder" style="text-align:center;margin:12px 0;">\n        <div style="width:100px;height:100px;margin:0 auto;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border-radius:8px;color:#999;font-size:0.7rem;">QR CODE</div>\n      </div>\n      <div class="receipt-qr-hint">扫码进入这个链接，也能生成自己的生活小票</div>\n    </div>\n    <div class="receipt-qr-toggle-wrap">\n      <label class="receipt-qr-toggle">\n        <input type="checkbox" id="receiptQRToggle" checked onchange="toggleReceiptQR()">\n        <span class="receipt-qr-toggle-label">显示二维码</span>\n      </label>\n    </div>\n  `;

  $('rctMainTitle').textContent=journey.name;
  $('receiptBodyContent').innerHTML=bodyHtml;
  window.__receiptData={title:journey.name,photoItems,journey};
  $('receiptOverlay').style.display='flex';
}

function closeReceipt(event){if(event.target===event.currentTarget)$('receiptOverlay').style.display='none';}
function closeReceiptDirect(){$('receiptOverlay').style.display='none';}

// 分享操作
function shareToWechat(){
  const rd=window.__receiptData;if(!rd)return;
  showToast('正在生成图片...','success');
  setTimeout(()=>{
    receiptToImage(img=>{
      showToast('已复制分享文案，请粘贴到微信分享图片','success');
    });
  },300);
}
function shareToQQ(){
  showToast('已复制分享文案，请粘贴到QQ','success');
}
function saveAsImage(){
  showToast('正在生成图片...','success');
  receiptToImage(img=>{
    const a=document.createElement('a');
    a.href=img;a.download=(window.__receiptData?.title||'qingyin_receipt')+'.png';a.click();
    showToast('图片已保存！','success');
  });
}
function shareMore(){
  showToast('更多分享方式开发中...','');
}

// 将小票转为图片
function receiptToImage(callback){
  const paper=$('receiptPaper');
  html2canvas(paper,{
    backgroundColor:'#FFFAF0',
    scale:2,
    useCORS:true,
    logging:false
  }).then(canvas=>{
    const img=canvas.toDataURL('image/png');
    callback(img);
  }).catch(err=>{
    console.error(err);
    showToast('图片生成失败','error');
  });
}

// 导出旅程为图片
function exportJourneyAsImage(journeyId){
  const journey=appData.journeys.find(j=>j.id===journeyId);if(!journey){showToast('旅程不存在','error');return;}

  // 创建导出预览容器
  const wrap=$('exportCanvasWrap');
  const days=journey.days||[];
  const allPhotos=[];
  days.forEach(d=>{if(d.photos)d.photos.forEach(p=>allPhotos.push({src:p,title:d.title,date:d.date,content:d.content}));});

  let content=`
    <div style="background:white;padding:24px 20px;min-height:400px;font-family:-apple-system,sans-serif;">
      <div style="text-align:center;margin-bottom:16px;">
        <h1 style="font-size:1.4rem;font-weight:900;color:#1E293B;margin-bottom:4px;">${escapeHtml(journey.name)}</h1>
        <p style="color:#64748B;font-size:0.85rem;">${formatDateRange(journey.startDate,journey.endDate)}${journey.city?' · '+escapeHtml(journey.city):''}</p>
      </div>
  `;

  if(journey.coverPhoto){
    content+=`<img src="${journey.coverPhoto}" style="width:100%;border-radius:12px;margin-bottom:16px;">`;
  }

  if(days.length>0){
    days.forEach(day=>{
      content+=`
        <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px dashed #E2E8F0;">
          <div style="font-size:0.82rem;color:#6366F1;font-weight:700;margin-bottom:4px;">📅 ${formatDate(day.date)} — ${escapeHtml(day.title)}</div>
          ${day.content?`<p style="font-size:0.85rem;color:#475569;line-height:1.6;margin-bottom:6px;">${escapeHtml(day.content)}</p>`:''}
          ${day.photos&&day.photos.length>0?`<div style="display:flex;gap:6px;flex-wrap:wrap;">${day.photos.map(p=>`<img src="${p}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;">`).join('')}</div>`:''}
        </div>`;
    });
  } else {
    content+='<p style="text-align:center;color:#94A3B8;">暂无日记内容</p>';
  }
  content+='</div>';

  wrap.innerHTML=content;
  openModal('exportImageModal');
}

function downloadExportImage(){
  const wrap=$('exportCanvasWrap');
  html2canvas(wrap.firstChild,{backgroundColor:'#fff',scale:2,useCORS:true,logging:false}).then(canvas=>{
    const img=canvas.toDataURL('image/png');
    const a=document.createElement('a');a.href=img;a.download='qingyin_journal.png';a.click();
    showToast('已保存到下载','success');closeModal('exportImageModal');
  }).catch(err=>{console.error(err);showToast('导出失败','error');});
}

// ============================================
// 个人资料 & 头像
// ============================================
function renderProfile() {
  const p=appData.profile;
  $('profileName').textContent=p.name;
  $('profileBio').textContent=p.bio;
  const avatarImg=$('avatarImg');
  const avatarText=$('avatarText');
  if(p.avatar){
    avatarImg.src=p.avatar;avatarImg.style.display='block';avatarText.style.display='none';
  } else {
    avatarImg.style.display='none';avatarText.style.display='flex';avatarText.textContent=p.name.charAt(0)||'旅';
  }
  $('profileJourneys').textContent=appData.journeys.length+' 段旅程';
  $('profileCheckins').textContent=appData.checkins.length+' 个打卡';

  // 勋章统计
  updateMedalStats();
  // 旅行人格
  updatePersonality();
}

function openProfileModal(){
  $('profileNickname').value=appData.profile.name;
  $('profileSignature').value=appData.profile.bio;
  // 头像预览
  const prevImg=$('profileAvatarImgPreview');
  const prevTxt=$('profileAvatarTextPreview');
  if(appData.profile.avatar){
    prevImg.src=appData.profile.avatar;prevImg.style.display='block';prevTxt.style.display='none';
  } else {
    prevImg.style.display='none';prevTxt.style.display='flex';prevTxt.textContent=appData.profile.name.charAt(0)||'旅';
  }
  openModal('profileModal');
}

function previewProfileAvatar(input){
  const file=input.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=e=>{
    const img=$('profileAvatarImgPreview');
    img.src=e.target.result;img.style.display='block';
    $('profileAvatarTextPreview').style.display='none';
  };r.readAsDataURL(file);
}

function saveProfile(){
  const name=$('profileNickname').value.trim()||'旅行者';
  const bio=$('profileSignature').value.trim()||'探索世界，记录美好';

  // 保存头像
  let avatar=appData.profile.avatar;
  const avImg=$('profileAvatarImgPreview');
  if(avImg.style.display!=='none'&&avImg.src) avatar=avImg.src;

  appData.profile={name,bio,avatar};saveData(appData);
  closeModal('profileModal');renderProfile();showToast('资料已更新','success');
}

function openAvatarModal(){
  openProfileModal();
}

// ============================================
// 勋章系统 (34个省/直辖市/自治区 + 特别行政区)
// ============================================
const PROVINCE_MEDALS=[
  {code:'bj',name:'北京市',icon:'🏛️',building:'天安门',lit:false},
  {code:'sh',name:'上海市',icon:'🗼',building:'东方明珠',lit:false},
  {code:'tj',name:'天津市',icon:'⛪',building:'天津之眼',lit:false},
  {code:'cq',name:'重庆市',icon:'🌉', building:'洪崖洞',lit:false},
  {code:'he',name:'河北省',icon:'🏯',building:'赵州桥',lit:false},
  {code:'sx',name:'山西省',icon:'🏔️',building:'悬空寺',lit:false},
  {code:'nm',name:'内蒙古自治区',icon:'🐎',building:'蒙古包',lit:false},
  {code:'ln',name:'辽宁省',icon:'🏰',building:'沈阳故宫',lit:false},
  {code:'jl',name:'吉林省',icon:'❄️',building:'长白山天池',lit:false},
  {code:'hlj',name:'黑龙江省',icon:'🧊',building:'冰雪大世界',lit:false},
  {code:'js',name:'江苏省',icon:'🏮',building:'夫子庙',lit:false},
  {code:'zj',name:'浙江省',icon:'🌊',building:'西湖断桥',lit:false},
  {code:'ah',name:'安徽省',icon:'⛰️',building:'黄山迎客松',lit:false},
  {code:'fj',name:'福建省',icon:'🏡',building:'土楼',lit:false},
  {code:'jx',name:'江西省',icon:'🏞️',building:'庐山瀑布',lit:false},
  {code:'sd',name:'山东省',icon:'⛰️',building:'泰山',lit:false},
  {code:'ha',name:'河南省',icon:'🥋',building:'少林寺',lit:false},
  {code:'hb',name:'湖北省',icon:'🏯',building:'黄鹤楼',lit:false},
  {code:'hn',name:'湖南省',icon:'🗻',building:'张家界',lit:false},
  {code:'gd',name:'广东省',icon:'🗼',building:'广州塔',lit:false},
  {code:'gx',name:'广西壮族自治区',icon:'🌴', building:'象鼻山',lit:false},
  {code:'hi',name:'海南省',icon:'🏝️',building:'天涯海角',lit:false},
  {code:'sc',name:'四川省',icon:'🐼',building:'熊猫基地',lit:false},
  {code:'gz',name:'贵州省',icon:'🏔️',building:'黄果树瀑布',lit:false},
  {code:'yn', name:'云南省',icon:'🦚',building:'石林',lit:false},
  {code:'xz',name:'西藏自治区',icon:'🙏',building:'布达拉宫',lit:false},
  {code:'sn',name:'陕西省',icon:'🐎',building:'兵马俑',lit:false},
  {code:'gs',name:'甘肃省',icon:'🐫',building:'敦煌莫高窟',lit:false},
  {code:'qh',name:'青海省',icon:'🏔️',building:'青海湖',lit:false},
  {code:'nx',name:'宁夏回族自治区',icon:'🏜️',building:'沙坡头',lit:false},
  {code:'xj',name:'新疆维吾尔自治区',icon:'🍇',building:'喀纳斯',lit:false},
  {code:'hk',name:'香港特别行政区',icon:'🌆',building:'维多利亚港',lit:false},
  {code:'mo',name:'澳门特别行政区',icon:'🎰',building:'大三巴牌坊',lit:false},
  {code:'tw',name:'台湾省',icon:'🗼',building:'台北101',lit:false}
];

function loadMedals(){
  const saved=localStorage.getItem('qingyin_medals');
  if(saved){
    try{
      const data=JSON.parse(saved);
      PROVINCE_MEDALS.forEach(m=>{
        const found=data.find(s=>s.code===m.code);
        if(found) m.lit=found.lit;
      });
    }catch(e){}
  }
}

function saveMedals(){
  localStorage.setItem('qingyin_medals',JSON.stringify(PROVINCE_MEDALS));
}

function checkAndUnlockMedal(province, city, place){
  if(!province&&!city)return;
  const loc=(province||city).replace(/[省市自治区特别行政区]/g,'').trim();
  let unlocked=false;

  PROVINCE_MEDALS.forEach(m=>{
    if(m.lit) return;
    const mName=m.name.replace(/[省市自治区特别行政区]/g,'');
    if(loc.includes(mName)||(mName.includes(loc))||loc.length<=2&&mName.includes(loc)){
      m.lit=true;unlocked=true;
      showToast(`🏅 恭喜点亮「${m.name}」勋章！${m.icon}`,'success');
    }
  });

  if(unlocked){
    saveMedals();updateMedalStats();
  }
}

function updateMedalStats(){
  const litCount=PROVINCE_MEDALS.filter(m=>m.lit).length;
  $('medalLitCount').textContent=litCount;
  $('medalTotalCount').textContent=PROVINCE_MEDALS.length;
  const mp=$('medalPageLit');if(mp)mp.textContent=litCount;
  const mp2=$('medalPagePercent');if(mp2)mp2.textContent=Math.round(litCount/PROVINCE_MEDALS.length*100)+'%';
}

function updatePersonality(){
  const litCount=PROVINCE_MEDALS.filter(m=>m.lit).length;
  const totalCheckins=appData.checkins.length;
  const totalJourneys=appData.journeys.length;

  let badge='🧭 探索者';let desc='每一段旅程都是新的发现';
  if(litCount>=20){badge='🌏 旅行大师';desc='足迹遍布大半个中国，真正的旅行家';}
  else if(litCount>=10){badge='🗺️ 行走的地图';desc='走遍万水千山，故事说不完';}
  else if(litCount>=5){badge='🎒 背包客';desc='在路上，永远年轻';}
  else if(totalJourneys>=5){badge='📝 故事收藏家';desc='用文字记录每一个精彩瞬间';}
  else if(totalCheckins>=10){badge='📍 打卡达人';desc='走到哪打到哪，一个都不落下';}

  const pb=$('personalityBadge');if(pb)pb.textContent=badge;
  const pd=$('personalityDesc');if(pd)pd.textContent=desc;
}

function openMedalPage(){
  $('medalPage').style.display='block';
  renderMedalGrid('all');
  document.querySelector('.bottom-nav').style.display='none';
}

function closeMedalPage(){
  $('medalPage').style.display='none';
  document.querySelector('.bottom-nav').style.display='flex';
}

function filterMedals(filter, btn){
  document.querySelectorAll('.medal-filter-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderMedalGrid(filter);
}

function renderMedalGrid(filter){
  const grid=$('medalGrid');
  let medals=[...PROVINCE_MEDALS];
  if(filter==='lit') medals=medals.filter(m=>m.lit);
  else if(filter==='unlit') medals=medals.filter(m=>!m.lit);

  grid.innerHTML=medals.map(m=>`
    <div class="medal-item ${m.lit?'lit':'unlit'}" data-code="${m.code}">
      <span class="medal-icon-lg">${m.icon}</span>
      <div class="medal-name">${m.name}</div>
      <div style="font-size:0.62rem;color:var(--text-muted);margin-top:2px;">${m.building}</div>
      ${m.lit?'<span class="medal-lit-mark">✨</span>':''}
    </div>
  `).join('');
}

// ============================================
// 设置子页面
// ============================================
function openSettingsModal(){openModal('settingsModal');}
function openAboutModal(){openModal('aboutModal');}
function openFeedback(){
  closeModal('settingsModal');
  $('subPageFeedback').style.display='block';
  document.querySelector('.bottom-nav').style.display='none';
}

function openAccountSecurity(){
  closeModal('settingsModal');
  $('subPageAccount').style.display='block';
  document.querySelector('.bottom-nav').style.display='none';
  // 填充设备信息
  let deviceId=localStorage.getItem('qingyin_device_id');
  if(!deviceId){
    deviceId='DEV_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
    localStorage.setItem('qingyin_device_id',deviceId);
  }
  $('deviceIdDisplay').textContent=deviceId;
  $('accountCreatedTime').textContent=appData.journeys.length>0
    ?formatDate(appData.journeys[appData.journeys.length-1].createdAt)
    :formatDate(new Date().toISOString());
}

function openTrashPage(){
  closeModal('settingsModal');
  renderTrashList();
  $('subPageTrash').style.display='block';
  document.querySelector('.bottom-nav').style.display='none';
}

function renderTrashList(){
  const container=$('trashContent');
  if(appData.trash.length===0){
    container.innerHTML='<div class="empty-state small"><div class="empty-icon">🗑️</div><p>回收站是空的</p></div>';return;
  }
  container.innerHTML=appData.trash.map((item,i)=>`
    <div class="trash-item">
      <div class="trash-item-info">
        <h4>${escapeHtml(item.name)}</h4>
        <p>删除于 ${formatDate(item.deletedAt)}</p>
      </div>
      <div class="trash-actions">
        <button class="btn-restore" onclick="restoreTrash(${i})">恢复</button>
        <button class="btn-delete-forever" onclick="permanentDeleteTrash(${i})">永久删除</button>
      </div>
    </div>`).join('');
}

function restoreTrash(index){
  const item=appData.trash[index];
  if(!item)return;
  item.type=null;item.deletedAt=null;
  appData.journeys.push(item);
  appData.trash.splice(index,1);
  saveData(appData);renderTrashList();showToast('已恢复旅程','success');
}

function permanentDeleteTrash(index){
  if(!confirm('永久删除此旅程？不可恢复'))return;
  appData.trash.splice(index,1);
  saveData(appData);renderTrashList();showToast('已永久删除','success');
}

function closeSubPage(pageId){
  $(pageId).style.display='none';
  document.querySelector('.bottom-nav').style.display='flex';
}

function openFeedbackPage(){
  closeModal('settingsModal');
  $('subPageFeedback').style.display='block';
  document.querySelector('.bottom-nav').style.display='none';
}

// 权限设置页面
function openPermissionSettings() {
  closeModal('settingsModal');
  $('subPagePermissions').style.display = 'block';
  document.querySelector('.bottom-nav').style.display = 'none';
  renderPermissionSettings();
}

function renderPermissionSettings() {
  var container = $('permissionSettingsContent');
  var perms = appPermissions;

  var notifStatus = perms.notification === 'granted' ? '✅ 已允许' : (perms.notification === 'denied' ? '❌ 已拒绝' : '⚪ 未设置');
  var locLabels = {
    'never': '❌ 永不',
    'ask_next': '🔄 下次询问',
    'while_using': '✅ 使用App期间',
    'always': '✅ 始终'
  };
  var locStatus = locLabels[perms.location] || '⚪ 未设置';
  var photoStatus = perms.photoLibrary === 'full' ? '✅ 完全访问' : (perms.photoLibrary === 'limited' ? '⚠️ 受限访问' : (perms.photoLibrary === 'denied' ? '❌ 已拒绝' : '⚪ 未设置'));
  var cameraStatus = perms.camera === 'granted' ? '✅ 已允许' : (perms.camera === 'denied' ? '❌ 已拒绝' : '⚪ 未设置');

  container.innerHTML = `
    <div class="account-card" style="margin-bottom:12px;">
      <div class="account-row" style="cursor:pointer;" onclick="resetPermission('notification')">
        <span class="account-label">🔔 通知</span>
        <span class="account-value">${notifStatus}</span>
      </div>
      <div class="account-row" style="cursor:pointer;" onclick="resetPermission('location')">
        <span class="account-label">📍 位置</span>
        <span class="account-value">${locStatus}</span>
      </div>
      <div class="account-row" style="cursor:pointer;" onclick="resetPermission('photoLibrary')">
        <span class="account-label">🖼️ 照片图库</span>
        <span class="account-value">${photoStatus}</span>
      </div>
      <div class="account-row" style="cursor:pointer;" onclick="resetPermission('camera')">
        <span class="account-label">📸 相机</span>
        <span class="account-value">${cameraStatus}</span>
      </div>
    </div>
    <div class="info-card">
      <p style="font-size:0.82rem;color:var(--text-muted);">💡 点击任一权限可重置，下次使用时将重新询问。</p>
    </div>
  `;
}

function resetPermission(type) {
  if (!confirm('确定要重置该权限设置吗？下次使用时会重新询问。')) return;
  delete appPermissions[type];
  savePermissions(appPermissions);
  renderPermissionSettings();
  showToast('权限已重置，下次将重新询问', 'success');
}

function submitFeedback(){
  const type=$('fbType').value;
  const content=$('fbContent').value.trim();
  if(!content){showToast('请输入反馈内容','error');return;}
  // 模拟提交
  showToast('感谢你的反馈！我们会尽快处理 🙏','success');
  $('fbContent').value='';
  $('fbContact').value='';
}

function clearAllData(){
  if(!confirm('确定要清除所有数据吗？此操作不可恢复！'))return;
  if(!confirm('再次确认：所有旅程、打卡、日记将被永久删除！'))return;
  localStorage.removeItem(STORAGE_KEY);localStorage.removeItem('qingyin_medals');
  appData=getDefaultData();
  PROVINCE_MEDALS.forEach(m=>m.lit=false);
  closeModal('settingsModal');renderAll();showToast('所有数据已清除','success');
}

// ============================================
// 数据导入导出
// ============================================
function exportData(){
  const json=JSON.stringify({...appData,medals:PROVINCE_MEDALS},null,2);
  const blob=new Blob([json],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;
  a.download='qingyin_backup_'+new Date().toISOString().split('T')[0]+'.json';a.click();
  URL.revokeObjectURL(url);showToast('数据已导出','success');
}

function importData(){
  const input=document.createElement('input');
  input.type='file';input.accept='.json';
  input.onchange=function(e){
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=function(ev){
      try{
        const data=JSON.parse(ev.target.result);
        if(!data.journeys) throw new Error('格式错误');
        if(!confirm('导入将覆盖当前数据，确定继续吗？'))return;
        appData=data;
        if(data.medals)data.medals.forEach(sm=>{
          const m=PROVINCE_MEDALS.find(pm=>pm.code===sm.code);if(m)m.lit=sm.lit;
        });
        saveData(appData);saveMedals();renderAll();showToast('数据导入成功','success');
      }catch(err){showToast('导入失败：'+err.message,'error');}
    };r.readAsText(f);};input.click();
}

// ============================================
// Lightbox 图片查看器
// ============================================
let lightboxImages=[];let lightboxIndex=0;

function openLightbox(src){
  if(!src)return;
  lightboxImages=[src];lightboxIndex=0;
  $('lightboxImg').src=src;$('lightboxCounter').textContent='1 / 1';
  $('lightboxOverlay').style.display='flex';
}

function openLightboxSingle(src){openLightbox(src);}

function openLightboxForGrid(gridId, index){
  const grid=$(gridId);if(!grid)return;
  const imgs=grid.querySelectorAll('.photo-grid-item img');
  lightboxImages=Array.from(imgs).map(i=>i.src);lightboxIndex=Math.min(index,lightboxImages.length-1);
  updateLightbox();$('lightboxOverlay').style.display='flex';
}

function openDayLightbox(dayId, photoIndex){
  const journey=getCurrentJourney();if(!journey)return;
  const day=journey.days.find(d=>d.id===dayId);if(!day||!day.photos)return;
  lightboxImages=day.photos;lightboxIndex=Math.min(photoIndex,lightboxImages.length-1);
  updateLightbox();$('lightboxOverlay').style.display='flex';
}

function openLightboxFromCarousel(index){
  const c=window.__currentCarousel;if(!c)return;
  lightboxImages=c.photos.map(p=>p.src);lightboxIndex=Math.min(index,lightboxImages.length-1);
  updateLightbox();$('lightboxOverlay').style.display='flex';
  // 暂停轮播
  clearInterval(carouselTimer);
}

function updateLightbox(){
  if(lightboxImages.length===0)return;
  $('lightboxImg').src=lightboxImages[lightboxIndex];
  $('lightboxCounter').textContent=`${lightboxIndex+1} / ${lightboxImages.length}`;
  $('lightboxPrev').style.display=lightboxImages.length>1?'flex':'none';
  $('lightboxNext').style.display=lightboxImages.length>1?'flex':'none';
}

function lightBoxPrev(){
  lightboxIndex=(lightboxIndex-1+lightboxImages.length)%lightboxImages.length;updateLightbox();
}
function lightBoxNext(){
  lightboxIndex=(lightboxIndex+1)%lightboxImages.length;updateLightbox();
}

function closeLightbox(event){if(event.target===event.currentTarget)closeLightboxDirect();}
function closeLightboxDirect(){
  $('lightboxOverlay').style.display='none';
  // 恢复轮播
  if(window.__currentCarousel){
    const journeyId=window.__currentCarousel.journeyId;
    const journey=appData.journeys.find(j=>j.id===journeyId);
    if(journey){clearInterval(carouselTimer);buildCarousel(journey);}
  }
}

// ============================================
// 统计更新
// ============================================
function updateAllStats(){
  const tc=appData.checkins.length;
  const tp=appData.checkins.filter(c=>c.photo).length;
  const provinces=new Set(appData.checkins.map(c=>c.province||c.city).filter(Boolean));

  $('statCheckins').textContent=tc;
  $('statPhotos').textContent=tp;
  $('statProvinces').textContent=provinces.size;
  $('statJourneys').textContent=appData.journeys.length;

  if($('profileJourneys')){
    $('profileJourneys').textContent=appData.journeys.length+' 段旅程';
    $('profileCheckins').textContent=tc+' 个打卡';
  }
  updateInsights();
}

// ============================================
// 数据洞察计算 & 可视化
// ============================================

function toggleInsightDetail(){
  const panel=$('insightDetailPanel');
  if(panel.style.display==='none'||!panel.style.display){
    openInsightPanel('monthly');
  } else {
    panel.style.display='none';
  }
}

let currentInsightTab='monthly';

function switchInsightTab(tabName){
  currentInsightTab=tabName;
  document.querySelectorAll('.insight-tab').forEach(t=>{
    t.classList.toggle('active', t.dataset.insightTab===tabName);
  });
  renderInsightChart(tabName);
}

function openInsightPanel(tabName){
  const panel=$('insightDetailPanel');
  panel.style.display='block';
  // 隐藏概览卡片
  $('insightCards').style.display='none';
  switchInsightTab(tabName);
}

function closeInsightPanel(){
  $('insightDetailPanel').style.display='none';
  $('insightCards').style.display='grid';
}

function updateInsights(){
  // 月度活跃：近12个月旅行活跃度
  const now=new Date();
  const months=[];
  for(let i=11;i>=0;i--){
    const d=new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push({year:d.getFullYear(), month:d.getMonth()+1, label:`${d.getMonth()+1}月`, count:0});
  }

  // 收集所有旅程的日期范围，计算每月覆盖
  appData.journeys.forEach(j=>{
    if(!j.startDate) return;
    const start=new Date(j.startDate);
    const end=j.endDate?new Date(j.endDate):new Date(j.startDate);
    months.forEach(m=>{
      const mStart=new Date(m.year, m.month-1, 1);
      const mEnd=new Date(m.year, m.month, 0);
      if(start<=mEnd&&end>=mStart) m.count++;
    });
  });

  // 也统计打卡
  appData.checkins.forEach(c=>{
    if(!c.createdAt) return;
    const cd=new Date(c.createdAt);
    months.forEach(m=>{
      if(cd.getFullYear()===m.year&&(cd.getMonth()+1)===m.month) m.count++;
    });
  });

  const activeMonths=months.filter(m=>m.count>0).length;
  const maxCount=Math.max(1,...months.map(m=>m.count));
  $('insightMonthlyValue').textContent=`${activeMonths}/12 月`;
  $('insightMonthly').querySelector('.insight-sub').textContent=
    `近12个月活跃${activeMonths}个月，最高${maxCount}次/月`;

  // 足迹增长：近12天足迹点统计
  const footDays=[];
  for(let i=11;i>=0;i--){
    const d=new Date(now);
    d.setDate(d.getDate()-i);
    footDays.push({date:formatDate(d), count:0});
  }

  appData.checkins.forEach(c=>{
    if(!c.createdAt) return;
    const cd=formatDate(c.createdAt);
    const fd=footDays.find(f=>f.date===cd);
    if(fd) fd.count++;
  });

  const totalRecent=footDays.reduce((s,f)=>s+f.count,0);
  const daysWithFootprint=footDays.filter(f=>f.count>0).length;
  $('insightFootprintValue').textContent=`${totalRecent} 个点`;
  $('insightFootprint').querySelector('.insight-sub').textContent=
    `近12天新增足迹，覆盖${daysWithFootprint}天`;

  // 季节分布：季节旅行偏好
  const seasonCount={spring:0,summer:0,autumn:0,winter:0};
  const allDates=[];
  appData.journeys.forEach(j=>{
    if(j.startDate) allDates.push(new Date(j.startDate));
    if(j.endDate) allDates.push(new Date(j.endDate));
  });
  appData.checkins.forEach(c=>{
    if(c.createdAt) allDates.push(new Date(c.createdAt));
  });

  allDates.forEach(d=>{
    const m=d.getMonth()+1;
    if(m>=3&&m<=5) seasonCount.spring++;
    else if(m>=6&&m<=8) seasonCount.summer++;
    else if(m>=9&&m<=11) seasonCount.autumn++;
    else seasonCount.winter++;
  });

  const totalSeason=seasonCount.spring+seasonCount.summer+seasonCount.autumn+seasonCount.winter||1;
  const topSeason=Object.entries(seasonCount).sort((a,b)=>b[1]-a[1])[0];
  const seasonNames={spring:'🌸 春',summer:'☀️ 夏',autumn:'🍂 秋',winter:'❄️ 冬'};
  const pct=Math.round(topSeason[1]/totalSeason*100);
  $('insightSeasonValue').textContent=seasonNames[topSeason[0]]||'--';
  $('insightSeason').querySelector('.insight-sub').textContent=
    `偏好${seasonNames[topSeason[0]]}季（${pct}%）`;

  // 标签统计：标签使用统计
  const tagMap={};
  appData.journeys.forEach(j=>{
    if(j.city){
      j.city.split(/[,，、]/).forEach(t=>{
        const tag=t.trim();if(tag){tagMap[tag]=(tagMap[tag]||0)+1;}
      });
    }
  });
  const totalTags=Object.keys(tagMap).length;
  const topTags=Object.entries(tagMap).sort((a,b)=>b[1]-a[1]).slice(0,3);
  $('insightTagsValue').textContent=`${totalTags} 个标签`;
  $('insightTags').querySelector('.insight-sub').textContent=
    topTags.length>0?`常用：${topTags.map(t=>t[0]).join('、')}`:'暂无标签数据';

  // 如果面板已展开，刷新当前图表
  if($('insightDetailPanel').style.display==='block'){
    renderInsightChart(currentInsightTab);
  }
}

// ---- 图表渲染函数 ----
function renderInsightChart(type){
  const area=$('insightChartArea');
  if(!area) return;

  switch(type){
    case 'monthly': renderMonthlyChart(area); break;
    case 'footprint': renderFootprintChart(area); break;
    case 'season': renderSeasonChart(area); break;
    case 'tags': renderTagsChart(area); break;
  }
}

function renderMonthlyChart(container){
  const now=new Date();
  const months=[];
  for(let i=11;i>=0;i--){
    const d=new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push({year:d.getFullYear(), month:d.getMonth()+1, label:`${d.getMonth()+1}月`, count:0});
  }
  // 统计旅程和打卡
  appData.journeys.forEach(j=>{
    if(!j.startDate) return;
    const start=new Date(j.startDate); const end=j.endDate?new Date(j.endDate):new Date(j.startDate);
    months.forEach(m=>{ if(start<=new Date(m.year,m.month,0)&&end>=new Date(m.year,m.month-1,1)) m.count++; });
  });
  appData.checkins.forEach(c=>{
    if(!c.createdAt) return;
    const cd=new Date(c.createdAt);
    months.forEach(m=>{ if(cd.getFullYear()===m.year&&(cd.getMonth()+1)===m.month) m.count++; });
  });

  const maxCount=Math.max(1,...months.map(m=>m.count));
  container.innerHTML=`
    <div style="text-align:center;margin-bottom:8px;">
      <span style="font-size:0.85rem;font-weight:700;color:var(--text-primary);">近12个月旅行活跃度</span>
      <span style="font-size:0.72rem;color:var(--text-muted);margin-left:6px;">最高 ${maxCount} 次/月</span>
    </div>
    <div class="monthly-bar-chart">
      ${months.map(m=>`
        <div class="monthy-bar-item">
          <div class="monthly-bar-count">${m.count}</div>
          <div class="monthly-bar" style="height:${Math.max(2,(m.count/maxCount)*110)}px;"></div>
          <div class="monthly-bar-label">${m.label}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderFootprintChart(container){
  const now=new Date();
  const days=[];
  for(let i=11;i>=0;i--){
    const d=new Date(now); d.setDate(d.getDate()-i);
    days.push({date:formatDate(d), dayLabel:['日','一','二','三','四','五','六'][d.getDay()], count:0});
  }
  appData.checkins.forEach(c=>{
    if(!c.createdAt) return;
    const cd=formatDate(c.createdAt);
    const fd=days.find(f=>f.date===cd);
    if(fd) fd.count++;
  });

  const maxCount=Math.max(1,...days.map(d=>d.count));
  const total=days.reduce((s,d)=>s+d.count,0);

  container.innerHTML=`
    <div style="text-align:center;margin-bottom:8px;">
      <span style="font-size:0.85rem;font-weight:700;color:var(--text-primary);">近12天足迹增长</span>
      <span style="font-size:0.72rem;color:var(--text-muted);margin-left:6px;">共 ${total} 个点</span>
    </div>
    <div class="footprint-line-chart">
      ${days.map(d=>`
        <div class="footprint-line-dot">
          <div class="footprint-line-bar" style="height:${Math.max(2,(d.count/maxCount)*100)}px;"></div>
          <div class="footprint-line-day-label">${d.dayLabel}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSeasonChart(container){
  const seasonCount={spring:0,summer:0,autumn:0,winter:0};
  appData.journeys.forEach(j=>{
    if(j.startDate){ const m=new Date(j.startDate).getMonth()+1; addSeason(seasonCount,m); }
    if(j.endDate){ const m=new Date(j.endDate).getMonth()+1; addSeason(seasonCount,m); }
  });
  appData.checkins.forEach(c=>{
    if(c.createdAt){ const m=new Date(c.createdAt).getMonth()+1; addSeason(seasonCount,m); }
  });

  function addSeason(sc, month){
    if(month>=3&&month<=5) sc.spring++;
    else if(month>=6&&month<=8) sc.summer++;
    else if(month>=9&&month<=11) sc.autumn++;
    else sc.winter++;
  }

  const total=seasonCount.spring+seasonCount.summer+seasonCount.autumn+seasonCount.winter||1;
  const colors={spring:'#34D399',summer:'#FBBF24',autumn:'#FB923C',winter:'#93C5FD'};
  const names={spring:'🌸 春季',summer:'☀️ 夏季',autumn:'🍂 秋季',winter:'❄️ 冬季'};

  // 构建环形图的 conic-gradient
  let gradientStart=0;
  let gradientParts='';
  const legendItems=Object.entries(seasonCount).map(([key,val])=>{
    const pct=val/total*100;
    const start=gradientStart;
    gradientStart+=pct;
    gradientParts+=`${colors[key]} ${start}% ${gradientStart}% `;
    return {key,val,pct};
  }).sort((a,b)=>b.val-a.val);

  const bgGradient=gradientParts.trim()||'#E2E8F0';

  container.innerHTML=`
    <div style="text-align:center;margin-bottom:10px;">
      <span style="font-size:0.85rem;font-weight:700;color:var(--text-primary);">季节分布</span>
    </div>
    <div class="season-donut-container">
      <div class="season-donut" style="background:conic-gradient(${bgGradient});">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
          <div style="width:60px;height:60px;border-radius:50%;background:var(--bg-primary);display:flex;flex-direction:column;align-items:center;justify-content:center;">
            <strong style="font-size:1rem;color:var(--primary);">${total}</strong>
            <span style="font-size:0.55rem;color:var(--text-muted);">记录</span>
          </div>
        </div>
      </div>
      <div class="season-legend">
        ${legendItems.map(l=>`
          <div class="season-legend-item">
            <span class="season-dot" style="background:${colors[l.key]}"></span>
            <span>${names[l.key]}</span>
            <span style="color:var(--text-muted);margin-left:auto;">${l.val} (${Math.round(l.pct)}%)</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderTagsChart(container){
  // 统计城市分布（类似截图中的城市排行）
  const cityMap={};
  appData.checkins.forEach(c=>{
    const city=c.city||'未知';
    cityMap[city]=(cityMap[city]||0)+1;
  });

  const cities=Object.entries(cityMap).sort((a,b)=>b[1]-a[1]);
  const maxCity=Math.max(1,...cities.map(c=>c[1]));

  // 统计省份分布
  const provMap={};
  appData.checkins.forEach(c=>{
    const p=c.province||c.city||'未知';
    provMap[p]=(provMap[p]||0)+1;
  });
  const provinces=Object.keys(provMap).length;

  if(cities.length===0){
    container.innerHTML=`<div class="insight-empty-hint"><span class="insight-empty-icon">📍</span><p>还没有打卡数据<br>去地图上打卡吧</p></div>`;
    return;
  }

  container.innerHTML=`
    <div style="text-align:center;margin-bottom:4px;">
      <span style="font-size:0.85rem;font-weight:700;color:var(--text-primary);">足迹分布</span>
      <span style="font-size:0.72rem;color:var(--text-muted);margin-left:6px;">${provinces} 省/市 · ${appData.checkins.length} 打卡</span>
    </div>

    <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border);">
      <div style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">🏙️ 城市排行</div>
      <div class="city-rank-list">
        ${cities.slice(0,5).map(([name,count])=>`
          <div class="city-rank-item">
            <span class="city-rank-name">${escapeHtml(name)}</span>
            <span class="city-rank-count">${count} 地点</span>
            <div class="city-rank-bar-wrap"><div class="city-rank-bar" style="width:${(count/maxCity)*100}%;"></div></div>
          </div>
        `).join('')}
      </div>
    </div>

    <div>
      <div style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">🗺️ 省份分布 (${provinces})</div>
      <div class="tag-stats-list">
        ${Object.entries(provMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,count])=>`
          <div class="tag-stat-item">
            <span class="tag-stat-name">${escapeHtml(name)}</span>
            <span class="tag-stat-badge">${count} 个打卡</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ============================================
// 渲染所有
// ============================================
function renderAll(){
  renderJournals();renderCheckins();renderCheckinMarkers();renderShareList();renderProfile();updateAllStats();
  $('journeyDetail').style.display='none';
  $('journalList').style.display='';
  appData.currentJourneyId=null;
}

// ============================================
// 权限询问流程
// ============================================

// 1. 通知权限询问
function askNotificationPermission() {
  if (appPermissions.notification !== undefined) return; // 已有记忆，不询问

  showPermissionModal({
    icon: '🔔',
    iconClass: 'icon-notification',
    title: '「轻印」想给您发送通知',
    desc: '通知可能包括旅行提醒、打卡纪念和分享互动。您可以在设置中随时更改。',
    rowLayout: true,
    actionsHTML: `
      <button class="permission-btn secondary" data-action="deny">不允许</button>
      <button class="permission-btn primary" data-action="allow">允许</button>
    `,
    onBind: function(container) {
      container.querySelector('[data-action="allow"]').onclick = function() {
        appPermissions.notification = 'granted';
        savePermissions(appPermissions);
        hidePermissionModal();
        // 尝试请求浏览器通知权限
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
        // 继续下一个权限询问
        askLocationPermission();
      };
      container.querySelector('[data-action="deny"]').onclick = function() {
        appPermissions.notification = 'denied';
        savePermissions(appPermissions);
        hidePermissionModal();
        askLocationPermission();
      };
    }
  });
}

// 2. 位置权限询问
function askLocationPermission() {
  if (appPermissions.location !== undefined) return; // 已有记忆，不询问

  showPermissionModal({
    icon: '📍',
    iconClass: 'icon-location',
    title: '「轻印」想访问您的位置',
    desc: '位置信息用于在地图上记录您的旅行足迹和打卡地点。',
    actionsHTML: `
      <div class="permission-location-options" id="locOptions">
        <div class="permission-location-option" data-value="never">
          <div class="loc-opt-radio"></div>
          <div class="loc-opt-text">
            <span class="loc-opt-title">永不</span>
            <span class="loc-opt-sub">不允许访问位置信息</span>
          </div>
        </div>
        <div class="permission-location-option" data-value="ask_next">
          <div class="loc-opt-radio"></div>
          <div class="loc-opt-text">
            <span class="loc-opt-title">下次询问或在我共享时</span>
            <span class="loc-opt-sub">每次使用时询问</span>
          </div>
        </div>
        <div class="permission-location-option selected" data-value="while_using">
          <div class="loc-opt-radio"></div>
          <div class="loc-opt-text">
            <span class="loc-opt-title">使用App期间</span>
            <span class="loc-opt-sub">仅在使用应用时允许访问位置</span>
          </div>
        </div>
        <div class="permission-location-option" data-value="always">
          <div class="loc-opt-radio"></div>
          <div class="loc-opt-text">
            <span class="loc-opt-title">始终</span>
            <span class="loc-opt-sub">始终允许访问位置信息</span>
          </div>
        </div>
      </div>
      <button class="permission-btn primary full" id="locConfirmBtn">确认</button>
    `,
    onBind: function(container) {
      let selectedLoc = 'while_using';

      // 选项点击切换
      container.querySelectorAll('.permission-location-option').forEach(function(opt) {
        opt.onclick = function() {
          container.querySelectorAll('.permission-location-option').forEach(function(o) {
            o.classList.remove('selected');
          });
          opt.classList.add('selected');
          selectedLoc = opt.dataset.value;
        };
      });

      container.querySelector('#locConfirmBtn').onclick = function() {
        appPermissions.location = selectedLoc;
        savePermissions(appPermissions);
        hidePermissionModal();
        // 如果选择了允许定位，尝试请求浏览器定位
        if (selectedLoc === 'while_using' || selectedLoc === 'always') {
          tryLocateUserSilent();
        }
      };
    }
  });
}

// 静默定位尝试
function tryLocateUserSilent() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(function(){}, function(){}, {timeout:5000});
}

// 3. 照片图库权限询问
function askPhotoLibraryPermission(callback) {
  if (appPermissions.photoLibrary !== undefined) {
    // 已有记忆，根据记忆处理
    if (appPermissions.photoLibrary === 'denied') {
      showToast('照片访问权限已被拒绝，请在设置中更改', 'error');
      return false;
    }
    // 完全访问或受限访问，直接继续
    if (callback) callback(appPermissions.photoLibrary);
    return true;
  }

  // 首次询问
  showPermissionModal({
    icon: '🖼️',
    iconClass: 'icon-photo',
    title: '「轻印」想访问您的照片图库',
    desc: '访问照片用于在日记、打卡和分享中添加图片。您可以控制访问范围。',
    actionsHTML: `
      <button class="permission-btn secondary full" data-action="deny" style="margin-bottom:4px;">不允许</button>
      <button class="permission-btn outline full" data-action="limited" style="margin-bottom:4px;">受限访问</button>
      <button class="permission-btn primary full" data-action="full">完全访问</button>
      <p style="font-size:0.7rem;color:var(--text-muted);margin-top:6px;">受限访问：仅您所选图片和照片添加许可后可访问</p>
    `,
    onBind: function(container) {
      container.querySelector('[data-action="deny"]').onclick = function() {
        appPermissions.photoLibrary = 'denied';
        savePermissions(appPermissions);
        hidePermissionModal();
        showToast('照片访问已被拒绝', 'error');
      };
      container.querySelector('[data-action="limited"]').onclick = function() {
        appPermissions.photoLibrary = 'limited';
        savePermissions(appPermissions);
        hidePermissionModal();
        if (callback) callback('limited');
      };
      container.querySelector('[data-action="full"]').onclick = function() {
        appPermissions.photoLibrary = 'full';
        savePermissions(appPermissions);
        hidePermissionModal();
        if (callback) callback('full');
      };
    }
  });
  return 'pending';
}

// 4. 相机权限询问
function askCameraPermission(callback) {
  if (appPermissions.camera !== undefined) {
    if (appPermissions.camera === 'denied') {
      showToast('相机权限已被拒绝，请在设置中更改', 'error');
      return false;
    }
    if (callback) callback();
    return true;
  }

  showPermissionModal({
    icon: '📸',
    iconClass: 'icon-camera',
    title: '「轻印」想访问您的相机',
    desc: '需要使用相机来拍摄照片，用于日记记录和打卡分享。',
    rowLayout: true,
    actionsHTML: `
      <button class="permission-btn secondary" data-action="deny">不允许</button>
      <button class="permission-btn primary" data-action="allow">允许</button>
    `,
    onBind: function(container) {
      container.querySelector('[data-action="allow"]').onclick = function() {
        appPermissions.camera = 'granted';
        savePermissions(appPermissions);
        hidePermissionModal();
        if (callback) callback();
      };
      container.querySelector('[data-action="deny"]').onclick = function() {
        appPermissions.camera = 'denied';
        savePermissions(appPermissions);
        hidePermissionModal();
        showToast('相机访问已被拒绝', 'error');
      };
    }
  });
  return 'pending';
}

// 统一：添加图片入口（拍摄/选取图片）
function showImagePicker(options) {
  var opts = options || {};
  var accept = opts.accept || 'image/*';
  var multiple = opts.multiple || false;
  var onFileSelected = opts.onFileSelected || null;
  var onCapture = opts.onCapture || null;

  // 创建选择菜单弹窗
  var menuOverlay = document.createElement('div');
  menuOverlay.className = 'permission-overlay';
  menuOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:610;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 0.2s ease;';
  menuOverlay.onclick = function(e) {
    if (e.target === menuOverlay) {
      document.body.removeChild(menuOverlay);
    }
  };

  var sheet = document.createElement('div');
  sheet.style.cssText = 'background:var(--bg-primary);border-radius:var(--radius-xl) var(--radius-xl) 0 0;width:100%;max-width:500px;padding:8px 0 20px;animation:slideUp 0.3s ease;';
  sheet.onclick = function(e) { e.stopPropagation(); };

  sheet.innerHTML = `
    <div style="text-align:center;padding:12px 0 4px;font-size:0.9rem;font-weight:700;color:var(--text-primary);">添加图片</div>
    <button style="display:flex;align-items:center;gap:12px;width:100%;padding:16px 24px;border:none;background:none;cursor:pointer;font-size:0.95rem;color:var(--text-primary);transition:background 0.15s;"
      onmouseenter="this.style.background='var(--bg-tertiary)'" onmouseleave="this.style.background='none'"
      data-action="camera">
      <span style="font-size:1.4rem;">📸</span> 拍摄
    </button>
    <button style="display:flex;align-items:center;gap:12px;width:100%;padding:16px 24px;border:none;background:none;cursor:pointer;font-size:0.95rem;color:var(--text-primary);transition:background 0.15s;"
      onmouseenter="this.style.background='var(--bg-tertiary)'" onmouseleave="this.style.background='none'"
      data-action="gallery">
      <span style="font-size:1.4rem;">🖼️</span> 选取图片
    </button>
    <div style="height:8px;background:var(--bg-tertiary);margin:4px 0;"></div>
    <button style="display:flex;align-items:center;justify-content:center;width:100%;padding:16px 24px;border:none;background:none;cursor:pointer;font-size:0.95rem;color:var(--text-secondary);transition:background 0.15s;"
      onmouseenter="this.style.background='var(--bg-tertiary)'" onmouseleave="this.style.background='none'"
      data-action="cancel">取消</button>
  `;

  menuOverlay.appendChild(sheet);
  document.body.appendChild(menuOverlay);

  // 拍摄按钮
  sheet.querySelector('[data-action="camera"]').onclick = function() {
    document.body.removeChild(menuOverlay);

    // 先询问相机权限
    var cameraAllowed = askCameraPermission(function() {
      // 创建相机输入
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // 后置摄像头
      input.onchange = function(e) {
        if (onFileSelected) onFileSelected(input);
        else if (onCapture) onCapture(input.files);
      };
      input.click();
    });

    // 如果已有权限记忆且允许，askCameraPermission 内部会直接执行 callback
    // 如果被拒绝，回调不会执行
    if (cameraAllowed === false) {
      // 已被拒绝
    }
  };

  // 选取图片按钮
  sheet.querySelector('[data-action="gallery"]').onclick = function() {
    document.body.removeChild(menuOverlay);

    // 先询问照片图库权限
    askPhotoLibraryPermission(function(level) {
      // 创建文件输入
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      if (multiple) input.multiple = true;
      input.onchange = function(e) {
        if (onFileSelected) onFileSelected(input);
        else if (onCapture) onCapture(input.files);
      };
      input.click();
    });
  };

  // 取消按钮
  sheet.querySelector('[data-action="cancel"]').onclick = function() {
    document.body.removeChild(menuOverlay);
  };
}

// 辅助：触发图片选择器
function triggerImagePicker(opts) {
  showImagePicker(opts);
}

// 将文件从 source input 转移到 target input
function transferFileToInput(sourceInput, targetInputId) {
  var target = $(targetInputId);
  if (!target || !sourceInput.files || !sourceInput.files.length) return;
  // 创建新的 DataTransfer 来设置文件
  var dt = new DataTransfer();
  dt.items.add(sourceInput.files[0]);
  target.files = dt.files;
  // 手动触发 onchange
  target.dispatchEvent(new Event('change', { bubbles: true }));
}

function transferFilesToInput(sourceInput, targetInputId) {
  var target = $(targetInputId);
  if (!target || !sourceInput.files || !sourceInput.files.length) return;
  var dt = new DataTransfer();
  for (var i = 0; i < sourceInput.files.length; i++) {
    dt.items.add(sourceInput.files[i]);
  }
  target.files = dt.files;
  target.dispatchEvent(new Event('change', { bubbles: true }));
}

// ============================================
// 初始化
// ============================================
document.addEventListener('DOMContentLoaded', function(){
  // 首先检查登录状态
  if (!checkLogin()) {
    showLogin();
    return;
  }
  initApp();
});

function initApp() {
  renderJournals();updateAllStats();renderProfile();loadMedals();updateMedalStats();

  // 权限询问流程：先通知，再位置
  setTimeout(function() {
    askNotificationPermission();
  }, 500);

  // 地图延迟加载
  const ct=document.getElementById('tab-checkin');
  const obs=new MutationObserver(function(mutations){
    mutations.forEach(function(m){
      if(m.target.classList.contains('active')){
        if(!map){setTimeout(initMap,300);}else{setTimeout(()=>{map.invalidateSize();renderCheckinMarkers();tryLocateUser();},200);}
      }
    });
  });
  if(ct) obs.observe(ct,{attributes:true,attributeFilter:['class']});

  $('dayDate').value=new Date().toISOString().split('T')[0];

  // 键盘事件
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      document.querySelectorAll('.modal-overlay').forEach(o=>{if(o.style.display==='flex')o.style.display='none';});
      $('receiptOverlay').style.display='none';
      $('fullscreenMapOverlay').style.display='none';
      $('lightboxOverlay').style.display='none';
      $('medalPage').style.display='none';
      document.querySelectorAll('.sub-page').forEach(p=>p.style.display='none');
      document.querySelector('.bottom-nav').style.display='flex';
      document.body.style.overflow='';
    }
  });

  // 左右箭头控制 Lightbox
  document.addEventListener('keydown',function(e){
    if($('lightboxOverlay').style.display==='flex'){
      if(e.key==='ArrowLeft') lightBoxPrev();
      if(e.key==='ArrowRight') lightBoxNext();
    }
  });
}
