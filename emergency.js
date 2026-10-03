/* =====================================================================
   GRIFFINE — emergency.js (الإصدار 100) — الشاشات الطارئة
   ---------------------------------------------------------------------
   رسائل خفيفة ومطمئنة بتظهر للعميل في الحالات الاستثنائية:
     maint   = وضع الصيانة (الأدمن بيشغّله من لوحة التحكم ← بيظهر لكل العملاء، والإدارة بتكمّل شغل عادي)
     offline = الإنترنت اتقطع عند المستخدم (بترجع لوحدها أول ما النت يرجع)
     down    = السيرفر مش بيرد (محاولة تلقائية كل 10 ثواني وبعدين بتختفي لوحدها)
     slow    = التحميل أطول من الطبيعي (الشعار + عد تنازلي)
   العنوان والنص وتشغيل/إيقاف كل شاشة من لوحة التحكم ← «🚨 الشاشات الطارئة» (site_public_config.php → emergency)
   الإعدادات بتتحفظ على الجهاز عشان تظهر حتى لو السيرفر واقع.
   ===================================================================== */
(function(){
  'use strict';
  const KEY = 'gs_emg_cfg_v1';
  const DEF = {
    maint:   { on: true, title: 'بنحسّن الخدمة عشانك', body: 'GRIFFINE في صيانة قصيرة لتحسين الأداء. بياناتك وخططك محفوظة بالكامل — ارجع لنا بعد شوية.' },
    offline: { on: true, title: 'الاتصال بالإنترنت انقطع', body: 'تأكد من الواي فاي أو بيانات الموبايل. أول ما الاتصال يرجع هنكمّل من مكانك تلقائيًا.' },
    down:    { on: true, title: 'بنرجع حالًا', body: 'فيه عطل مؤقت في السيرفر وفريقنا شغال عليه. بياناتك في أمان، وهنحاول نتصل تلقائيًا.' },
    slow:    { on: true, title: 'جارٍ التحميل...', body: 'الاتصال أبطأ من المعتاد — ثواني وكل حاجة تكون جاهزة.', after: 4, count: 10, logo: true },
  };
  const S = (k) => { try { return localStorage.getItem(k); } catch(e){ return null; } };
  const W = (k, v) => { try { localStorage.setItem(k, v); } catch(e){} };
  const merge = (o) => { const c = JSON.parse(JSON.stringify(DEF)); Object.keys(c).forEach(k => { if (o && o[k] && typeof o[k] === 'object') Object.assign(c[k], o[k]); }); return c; };
  let cfg = merge(JSON.parse(S(KEY) || 'null'));
  let maintOn = S(KEY + '_m') === '1';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ---------- الواجهة ---------- */
  let box = null, cur = '', timer = null;
  const PRI = { maint: 4, offline: 3, down: 2, slow: 1 };
  const active = new Set();
  function ensure(){
    if (box) return box;
    box = document.createElement('div'); box.id = 'gsEmg'; box.setAttribute('role', 'alertdialog'); box.setAttribute('aria-live', 'assertive'); box.hidden = true;
    (document.body || document.documentElement).appendChild(box);
    return box;
  }
  const logo = () => { const dark = document.documentElement.getAttribute('data-theme') === 'dark'; return `<img class="gs-emg-logo" src="${dark ? 'griffine-logo-dark.webp' : 'griffine-logo-light.webp'}?v=148" alt="GRIFFINE">`; };
  const ICON = { maint: '🛠️', offline: '📡', down: '☁️', slow: '' };
  function paint(kind, extra){
    const c = cfg[kind] || {}; const b = ensure();
    b.className = 'gs-emg gs-emg-' + kind;
    b.innerHTML = `<div class="gs-emg-card">
      ${kind === 'slow' ? (c.logo !== false ? logo() : '') : `<div class="gs-emg-ic" aria-hidden="true">${ICON[kind]}</div>`}
      <h2 class="gs-emg-t">${esc(c.title)}</h2>
      <p class="gs-emg-b">${esc(c.body)}</p>
      ${kind === 'slow' ? '<div class="gs-emg-spin" aria-hidden="true"></div><div class="gs-emg-cd" id="gsEmgCd"></div>' : ''}
      ${kind === 'down' ? '<div class="gs-emg-cd" id="gsEmgCd"></div><button type="button" class="gs-emg-btn" id="gsEmgRetry">إعادة المحاولة الآن</button>' : ''}
      ${kind === 'offline' ? '<div class="gs-emg-dots" aria-hidden="true"><i></i><i></i><i></i></div>' : ''}
      ${kind === 'maint' ? '<button type="button" class="gs-emg-link" id="gsEmgStaff">دخول فريق العمل</button>' : ''}
      ${extra || ''}
    </div>`;
    b.hidden = false; document.documentElement.classList.add('gs-emg-open');
    const r = b.querySelector('#gsEmgRetry'); if (r) r.onclick = () => ping(true);
    const st = b.querySelector('#gsEmgStaff'); if (st) st.onclick = () => { staffBypass = true; hide('maint'); if (typeof window.renderLogin === 'function') window.renderLogin(); };
  }
  function render(){
    const top = [...active].sort((a, b) => PRI[b] - PRI[a])[0] || '';
    if (top === cur) return;
    clearInterval(timer); cur = top;
    if (!top) { if (box) box.hidden = true; document.documentElement.classList.remove('gs-emg-open'); return; }
    paint(top);
    if (top === 'slow') {
      let n = Math.max(1, parseInt(cfg.slow.count, 10) || 10);
      const cd = () => { const e = document.getElementById('gsEmgCd'); if (e) e.textContent = n > 0 ? `${n}` : 'لسه بنحمّل... شكرًا لصبرك'; n--; };
      cd(); timer = setInterval(cd, 1000);
    }
    if (top === 'down') {
      let n = 10;
      const cd = () => { const e = document.getElementById('gsEmgCd'); if (e) e.textContent = `محاولة اتصال تلقائية بعد ${n} ثانية`; if (--n < 0) { n = 10; ping(); } };
      cd(); timer = setInterval(cd, 1000);
    }
  }
  function show(kind){ if (!cfg[kind] || cfg[kind].on === false) return; active.add(kind); render(); }
  function hide(kind){ active.delete(kind); render(); }

  /* ---------- الإعدادات من السيرفر ---------- */
  const origFetch = window.fetch ? window.fetch.bind(window) : null;
  let staffBypass = false;
  function applyMaint(){
    const admin = !!window.__isAdmin;
    if (maintOn && !admin && !staffBypass) show('maint'); else hide('maint');
  }
  // الإصدار 102: لو السيرفر عليه نسخة أحدث من اللي شغالة على الجهاز (كاش قديم) ← مسح الكاش وإعادة تحميل مرة واحدة
  const BUILD = 148;
  function checkBuild(b){
    b = parseInt(b, 10) || 0; if (b <= BUILD) return;
    let done = null; try { done = sessionStorage.getItem('gs_build_reload'); } catch(e){}
    if (done === String(b)) return;
    try { sessionStorage.setItem('gs_build_reload', String(b)); } catch(e){}
    const jobs = [];
    try { if (navigator.serviceWorker) jobs.push(navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.update().catch(() => {}))))); } catch(e){}
    try { if (window.caches) jobs.push(caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))))); } catch(e){}
    Promise.all(jobs).catch(() => {}).then(() => location.reload());
  }
  function applyConfig(j){
    if (!j || !j.config) return;
    checkBuild(j.config.build);
    if (j.config.emergency) { cfg = merge(j.config.emergency); W(KEY, JSON.stringify(j.config.emergency)); }
    maintOn = !!j.config.maintenance; W(KEY + '_m', maintOn ? '1' : '0');
    applyMaint();
  }
  function ping(manual){
    if (!origFetch) return;
    origFetch('site_public_config.php?ping=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' })
      .then(r => { if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(j => { fails = 0; hide('down'); applyConfig(j); })
      .catch(() => { if (manual) { const e = document.getElementById('gsEmgCd'); if (e) e.textContent = 'لسه مفيش رد — هنحاول تاني تلقائيًا'; } });
  }

  /* ---------- مراقبة الطلبات (السيرفر واقع / التحميل بطيء) ---------- */
  let fails = 0, fg = 0, slowT = null, lastIntent = Date.now();
  ['click', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { lastIntent = Date.now(); }, { capture: true, passive: true }));
  const appEmpty = () => { const a = document.getElementById('app'); return !a || !a.children.length; };
  function fgStart(){
    fg++;
    if (!slowT) slowT = setTimeout(() => { slowT = null; if (fg > 0) show('slow'); }, Math.max(1, +cfg.slow.after || 4) * 1000);
  }
  function fgEnd(){ fg = Math.max(0, fg - 1); if (!fg) { clearTimeout(slowT); slowT = null; hide('slow'); } }
  function fail(){
    if (navigator.onLine === false) { show('offline'); return; }
    if (++fails >= 2) show('down');
  }
  if (origFetch) {
    window.fetch = function(input, init){
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      let same = false; try { const u = new URL(url, location.href); same = u.origin === location.origin && /\.php$/i.test(u.pathname) && !/site_public_config\.php/.test(u.pathname); } catch(e){}
      if (!same) return origFetch(input, init);
      const foreground = appEmpty() || Date.now() - lastIntent < 1500;
      if (foreground) fgStart();
      return origFetch(input, init).then(r => {
        if (foreground) fgEnd();
        if (r.status >= 502 && r.status <= 504) fail(); else { fails = 0; hide('down'); }
        return r;
      }, e => {
        if (foreground) fgEnd();
        if (!(e && e.name === 'AbortError')) fail();
        throw e;
      });
    };
  }
  window.addEventListener('offline', () => show('offline'));
  window.addEventListener('online', () => { hide('offline'); ping(); });
  if (navigator.onLine === false) show('offline');
  // أول تحميل: لو الشاشة لسه فاضية بعد المدة ← شاشة التحميل
  setTimeout(() => { if (appEmpty()) { fg++; show('slow'); const w = setInterval(() => { if (!appEmpty()) { clearInterval(w); fgEnd(); } }, 300); } }, Math.max(1, +cfg.slow.after || 4) * 1000);
  // الإعدادات + وضع الصيانة: أول ما الصفحة تفتح وكل دقيقة
  ping(); setInterval(ping, 60000);
  // الإدارة مبتشوفش شاشة الصيانة (بتتعرف بعد تسجيل الدخول)
  let lastAdmin = null; setInterval(() => { const a = !!window.__isAdmin; if (a !== lastAdmin) { lastAdmin = a; if (!a) staffBypass = staffBypass && !!document.querySelector('.gl-auth, #loginForm'); applyMaint(); } }, 1500);
  applyMaint();

  window.GEmergency = {
    preview(kind, ms){ const was = active.has(kind); active.add(kind); cur = null; render(); setTimeout(() => { if (!was) active.delete(kind); cur = null; render(); }, ms || 6000); },
    refresh: ping, defaults: DEF, get config(){ return cfg; },
    refreshLocal(c){ cfg = merge(c); cur = null; render(); }
  };
})();
