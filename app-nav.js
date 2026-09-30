/* =====================================================================
   GRIFFINE — app-nav.js (الإصدار 88) — التنقل والفلاتر والشريط العلوي/السفلي والإعلانات والسجل
   (اتفصل من griffine.js - كل الملفات بتتحمّل بالترتيب في index.php وبتشارك نفس المتغيرات العامة)
   ===================================================================== */
/* ================== سجل تنقّل عام - زرار "رجوع" + أزرار البروزر نفسها (Back/Forward) ==================
   بدل ما زرار البروزر يخرج من الموقع، كل شاشة بندخلها بتتسجل كخطوة حقيقية في سجل تصفح المتصفح،
   وزرار البروزر Back/Forward بيرجّع/يقدّم بين شاشات الموقع نفسه (زي أي تطبيق SPA احترافي) */
window.__screens = [];      // كل شاشة اتزارت بالترتيب (array من دوال الرسم)
window.__screenIndex = -1;  // مكاننا الحالي جوه المصفوفة دي
window.__navSilent = false; // true وقت ما إحنا بنعيد رسم شاشة من التاريخ، عشان الشاشة الراجعة ميدخلش نفسها تاني كخطوة جديدة

/* ================== نظام فلترة موحّد - دالة عامة تفعّل مربع بحث و/أو تابات حالة لأي قائمة في الموقع ==================
   الاستخدام: كل عنصر في القائمة لازم يكون عليه data-q="نص البحث" وdata-status="القيمة" (اختياري لو فيه تابات حالة) */
function wireStdFilterBar(opts){
  const input = opts.searchInputId ? document.getElementById(opts.searchInputId) : null;
  const tabs = opts.tabsSelector ? Array.from(document.querySelectorAll(opts.tabsSelector)) : [];
  function apply(){
    const q = input ? input.value.trim().toLowerCase() : '';
    const activeTab = tabs.find(t=>t.classList.contains('btn-active'));
    const statusFilter = activeTab ? activeTab.dataset.status : null;
    let anyVisible = false;
    document.querySelectorAll(opts.itemSelector).forEach(item=>{
      const matchesQ = !q || (item.dataset.q||'').includes(q);
      const matchesStatus = !statusFilter || statusFilter==='all' || item.dataset.status===statusFilter;
      const show = matchesQ && matchesStatus;
      item.style.display = show ? '' : 'none';
      if (show) anyVisible = true;
    });
    if (opts.emptyStateId){
      const empty = document.getElementById(opts.emptyStateId);
      if (empty) empty.style.display = anyVisible ? 'none' : '';
    }
    if (opts.onApply) opts.onApply();
    return anyVisible;
  }
  if (input) input.addEventListener('input', apply);
  tabs.forEach(tab=>{
    tab.onclick = () => { tabs.forEach(t=>t.classList.remove('btn-active')); tab.classList.add('btn-active'); apply(); };
  });
  apply();
}


function pushNav(fn){
  // كل شاشة جديدة تفترض إن زرار الرجوع للخلف ظاهر بشكل افتراضي - والشاشة الرئيسية بتلغيه بعدين صراحة
  if (typeof setBackButtonVisible === 'function') setBackButtonVisible(true);
  if (window.__navSilent) return;
  window.__screenIndex++;
  window.__screens.length = window.__screenIndex; // امسح أي "تقدّم" قديم لو كنا رجعنا لورا وبعدين فتحنا مسار جديد
  window.__screens.push(fn);
  if (window.__screens.length > 100) { window.__screens.shift(); window.__screenIndex--; }
  try {
    if (window.__screenIndex === 0) history.replaceState({ griffineIdx: 0 }, '', location.href);
    else history.pushState({ griffineIdx: window.__screenIndex }, '', location.href);
  } catch(e){}
}

// زرار الرجوع بتاعنا بيسيب المتصفح نفسه يرجع خطوة - وده هيطلق popstate اللي هو المسؤول الوحيد عن إعادة الرسم
function goBack(){
  history.back();
}

// لو سجل التنقل ضاع (نادر)، نرجّع المستخدم لشاشته الرئيسية الصحيحة حسب حالة تسجيل دخوله -
// مسجّل دخول يرجعله renderHome() مش الصفحة العامة، عشان ميحسّش إنه اتسجّل خروج فجأة
async function fallbackHomeRender(){
  const email = await getSession().catch(() => null);
  return email ? renderHome() : renderPublicHome();
}
window.addEventListener('popstate', (e) => {
  if (!e.state || typeof e.state.griffineIdx !== 'number') {
    // خرجنا برا سجل شاشات الموقع (نادر) - ارجع للشاشة الرئيسية الصحيحة بدل ما نسيب حد يطلع برا الموقع من غير قصد
    window.__navSilent = true;
    fallbackHomeRender().finally(() => { window.__navSilent = false; });
    return;
  }
  const idx = e.state.griffineIdx;
  window.__screenIndex = idx;
  const fn = window.__screens[idx];
  window.__navSilent = true;
  if (fn) {
    try { fn(); } finally { window.__navSilent = false; }
  } else {
    fallbackHomeRender().finally(() => { window.__navSilent = false; });
  }
});

function initBackButton(){
  const btn = document.createElement('button');
  btn.id = 'globalBackBtn';
  btn.type = 'button';
  btn.className = 'gtopnav-icon-btn gtopnav-back-btn';
  // سهم عريض بيشاور لليمين (على طراز انستجرام/فيسبوك) - لأن اتجاه الموقع RTL فالرجوع بصريًا بيكون ناحية اليمين
  btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>';
  btn.title = 'رجوع للصفحة السابقة';
  btn.onclick = () => goBack();
  const row1 = document.getElementById('gtopnavRow1');
  if (row1) row1.appendChild(btn); else document.body.appendChild(btn);
}
// بتتحكم في ظهور/اختفاء زرار الرجوع للخلف - بيتخفي في الشاشة الرئيسية فقط بأمر مباشر من الشاشات نفسها
function setBackButtonVisible(visible){
  const btn = document.getElementById('globalBackBtn');
  if (btn) btn.style.display = visible ? '' : 'none';
}

// زرار تسجيل خروج ثابت في الشريط العلوي - بيظهر بس لو فيه مستخدم مسجّل دخول (refreshTopNav هي اللي بتتحكم في ظهوره)
function initLogoutButton(){
  const btn = document.createElement('button');
  btn.id = 'globalLogoutBtn';
  btn.type = 'button';
  btn.className = 'gtopnav-icon-btn';
  btn.innerHTML = '🚪';
  btn.title = 'تسجيل الخروج';
  btn.style.display = 'none';
  btn.onclick = async () => {
    await setSession('');
    window.__screens = [];
    window.__screenIndex = -1;
    await refreshTopNav();
    gAfterLogout();
  };
  const row1 = document.getElementById('gtopnavRow1');
  if (row1) row1.appendChild(btn); else document.body.appendChild(btn);
}

/* ================== تبديل الوضع الليلي - زرار ثابت في كل صفحات الموقع ================== */
function initDarkModeToggle(){
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const btn = document.createElement('button');
  btn.id = 'darkModeToggle';
  btn.type = 'button';
  btn.className = 'gtopnav-icon-btn';
  btn.textContent = isDark ? '☀️' : '🌙';
  btn.onclick = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (dark) { document.documentElement.removeAttribute('data-theme'); btn.textContent = '🌙'; }
    else { document.documentElement.setAttribute('data-theme', 'dark'); btn.textContent = '☀️'; }
    try { localStorage.setItem('griffine_theme', dark ? 'light' : 'dark'); } catch(e){}
    document.querySelectorAll('img[alt="GRIFFINE"], img.brand-logo-img, img[alt*="GRIFFINE"]').forEach(img=>{ img.src = griffineLogoSrc(); });
    document.querySelectorAll('img[alt="Top7"]').forEach(img=>{ img.src = top7LogoSrc(); });
  };
  const row1 = document.getElementById('gtopnavRow1');
  if (row1) row1.appendChild(btn); else document.body.appendChild(btn);
}

/* ================== الشريط العلوي الثابت بقوائم منسدلة - على طراز أمازون ================== */
async function refreshTopNav(){
  const email = await getSession();
  if (window.GShell && GShell.enabled) GShell.refresh(email);
  syncChatWidget(email); // الإصدار 78: الشات بيتبع الحساب الحالي بعد أي دخول/خروج
  const isAdmin = window.__isAdmin;
  if (isAdmin) updateChatUnreadBadge();
  const row1 = document.getElementById('gtopnavRow1');
  const row2 = document.getElementById('gtopnavRow2');
  if (!row1 || !row2) return;
  const settings = (email && !isAdmin) ? await getAdminSettings() : {};
  const hidden = (key) => settings[key] === true;

  // بيقسم اللابل لأيقونة + نص عشان نعرض الأيقونة في فقاعة دائرية زي قوائم فيسبوك (مستخدمة جوا كل قائمة منسدلة)
  function fbItemHtml(act, label){
    const m = label.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*(.*)$/u);
    const icon = m ? m[1] : '•';
    const text = m ? m[2] : label;
    return `<button type="button" class="gtopnav-fb-item" data-act="${act}"><span class="gtopnav-fb-icon">${icon}</span><span class="gtopnav-fb-label">${text}</span></button>`;
  }
  // عنوان قسم جوا القائمة المنسدلة الواحدة (زي عناوين الأقسام في قايمة فيسبوك)
  function sectionHtml(label, items){
    const visible = items.filter(it => !it.hideKey || !hidden(it.hideKey));
    if (!visible.length) return '';
    return `<div class="gtopnav-fb-section-title">${label}</div>${visible.map(it=>fbItemHtml(it.act, it.label)).join('')}`;
  }

  // كل عناصر التنقل التانوية (الرئيسية/حسابي/معلومات وتواصل + لوحة التحكم) بقت جوا قائمة منسدلة واحدة بس -
  // مقسّمة بعناوين أقسام جوا نفس القائمة، بدل ما تكون منتشرة كأزرار منفصلة في الشريط
  let panelHtml = sectionHtml('🏠 الرئيسية', [
    { act:'dac', label:'📈 خطط تعزيز المتوسط (DCA)', hideKey:'hide_dac_screen' },
    { act:'grid', label:'🔲 '+pageTitle('grid_plans_list','خطط الشبكة (Grid)'), hideKey:'hide_grid_screen' },
    { act:'screener', label:'🔍 '+pageTitle('screener','كشاف الأسهم'), hideKey:'hide_screener_screen' },
  ]);
  panelHtml += sectionHtml('👤 حسابي', [
    ...(email ? [{ act:'profile', label:'⚙️ '+pageTitle('profile','الملف الشخصي') }] : []),
    { act:'portfolio', label:'📊 '+pageTitle('portfolio','ملخص المحفظة') },
    { act:'subscription', label:'💳 الباقات والأسعار' },
  ]);
  panelHtml += sectionHtml('ℹ️ معلومات وتواصل', [
    { act:'about', label:'ℹ️ '+pageTitle('about_page','عن GRIFFINE') },
    { act:'contactPublic', label:'📞 '+pageTitle('contact_info','تواصل معنا') },
    { act:'articles', label:'📰 '+pageTitle('articles_list','مقالات'), hideKey:'hide_articles_screen' },
    { act:'testimonials', label:'⭐ '+pageTitle('testimonials','آراء العملاء'), hideKey:'hide_testimonials_screen' },
    { act:'suggestions', label:'💡 '+pageTitle('suggestions_page','شاركنا مقترحاتك'), hideKey:'hide_suggestions_screen' },
    { act:'refundPolicy', label:'📄 '+pageTitle('refund_policy_page','سياسة استرداد الاشتراك') },
  ]);
  if (isAdmin) panelHtml += sectionHtml('🛡️ الإدارة', [{ act:'adminPanel', label:'🛡️ '+pageTitle('admin_hub','لوحة التحكم') }]);

  const existingBack = document.getElementById('globalBackBtn');
  const existingTheme = document.getElementById('darkModeToggle');
  const existingLogout = document.getElementById('globalLogoutBtn');
  row1.innerHTML = `<div class="gtopnav-brand" id="gtopnavLogoBtn" style="cursor:pointer;">
      <img src="${griffineLogoSrc()}" class="gtopnav-logo" alt="GRIFFINE">
    </div>
    <div class="gtopnav-groups" id="gtopnavGroups">
      <div class="gtopnav-item" id="gtopnavMoreMenu">
        <button type="button" class="gtopnav-icon-btn" title="القائمة">☰</button>
        <div class="gtopnav-panel">${panelHtml}</div>
      </div>
    </div>
    <div class="gtopnav-main-icons">
      <button type="button" class="gtopnav-icon-btn" data-bn="home" title="الرئيسية">🏠</button>
      <button type="button" class="gtopnav-icon-btn" data-bn="plans" title="خططي">📈</button>
      <button type="button" class="gtopnav-icon-btn" data-bn="portfolio" title="ملخص المحفظة">📊</button>
    </div>
    <div class="gtopnav-spacer"></div>
    <div class="gtopnav-greet" id="gtopnavGreetBtn">
      ${email ? `<img id="gtopnavAvatarImg" src="" alt="" style="width:26px;height:26px;border-radius:50%;object-fit:cover;display:none;">` : ''}
      ${email ? `<span><strong>${email}</strong></span>` : `<span>مرحبًا بك<br><strong>سجّل الدخول</strong></span>`}
    </div>`;
  if (existingBack) row1.appendChild(existingBack);
  if (existingTheme) row1.appendChild(existingTheme);
  if (existingLogout) { row1.appendChild(existingLogout); existingLogout.style.display = email ? '' : 'none'; }
  row2.innerHTML = '';
  document.getElementById('gtopnavGreetBtn').onclick = () => { email ? renderProfilePage() : openLoginModal(); };
  document.getElementById('gtopnavLogoBtn').onclick = () => { email ? renderHome() : renderPublicHome(); };
  if (email) refreshTopNavAvatar();
  wireTopNavMainIcons(row1, email);

  const actions = {
    newPlan: renderPlanTypeChooser, dac: renderPlansList, grid: renderGridPlansList,
    portfolio: renderPortfolio, screener: renderScreener, recommendations: renderRecommendationsCustomerPage,
    subscription: () => email ? renderSubscriptionPlans() : renderPublicPricing(), subHistory: renderMySubscriptionHistory, referral: renderReferralPage,
    profile: renderProfilePage, contact: renderContactInfo, testimonials: renderTestimonialsPage,
    articles: renderArticlesListPage, disclaimer: () => renderDisclaimerPage({ backTo: () => (email ? renderHome() : renderPublicHome()) }),
    about: renderAboutPage, refundPolicy: renderRefundPolicyPage, contactPublic: renderContactInfo,
    suggestions: renderSuggestionsPage,
    adminPanel: renderAdminSubscribers,
  };
  const groupsEl = document.getElementById('gtopnavGroups');
  groupsEl.querySelectorAll('.gtopnav-panel button, .gtopnav-item > button[data-act]').forEach(btn=>{
    btn.onclick = () => { closeAllNavDropdowns(); const fn = actions[btn.dataset.act]; if (fn) fn(); };
  });
  groupsEl.querySelectorAll('.gtopnav-item > button:not([data-act])').forEach(trigger=>{
    trigger.onclick = (e) => {
      e.stopPropagation();
      const item = trigger.parentElement;
      const wasOpen = item.classList.contains('open');
      closeAllNavPanels();
      if (!wasOpen) item.classList.add('open');
    };
  });
}
async function refreshTopNavAvatar(){
  const imgEl = document.getElementById('gtopnavAvatarImg');
  if (!imgEl) return;
  try{
    const r = await apiGet('/avatar_get.php');
    if (r && r.success && r.avatar) {
      imgEl.src = r.avatar;
      imgEl.style.display = '';
    }
  }catch(e){ /* الأفاتار مش أساسية - أي فشل هنا يتجاهل */ }
}
function closeAllNavPanels(){
  document.querySelectorAll('.gtopnav-item.open').forEach(el=>el.classList.remove('open'));
}
function closeAllNavDropdowns(){
  closeAllNavPanels();
  const row2 = document.getElementById('gtopnavRow2');
  if (row2) row2.classList.remove('mobile-open');
  syncNavBackdrop();
}
// بتظبط ظهور طبقة التعتيم خلف قائمة الموبايل المنسدلة - بتوضح إنها Overlay فوق الشاشة الحالية مش شاشة جديدة
function syncNavBackdrop(){
  const row2 = document.getElementById('gtopnavRow2');
  const backdrop = document.getElementById('gtopnavBackdrop');
  if (!row2 || !backdrop) return;
  backdrop.classList.toggle('show', row2.classList.contains('mobile-open'));
}
document.addEventListener('click', (e)=>{ if (!e.target.closest('.gtopnav-item') && !e.target.closest('#gtopnavGreetBtn') && !e.target.closest('.gtopnav-main-icons')) closeAllNavDropdowns(); });

// بتوصل ضغطات الأيقونات الثلاث السريعة (الرئيسية/خططي/المحفظة) اللي جنب الشعار فوق - بتتنفذ من refreshTopNav كل مرة لأن row1 بيتبني من جديد في كل تنقل
function wireTopNavMainIcons(row1, email){
  const icons = row1.querySelectorAll('.gtopnav-main-icons .gtopnav-icon-btn[data-bn]');
  icons.forEach(btn=>{
    btn.onclick = async (e) => {
      e.stopPropagation();
      const key = btn.dataset.bn;
      if (key !== 'plans') closeBottomSheet();
      const sess = (typeof email !== 'undefined' && email !== null) ? email : await getSession();
      closeAllNavDropdowns();
      if (key === 'home') { setBottomNavActive('home'); sess ? renderHome() : renderPublicHome(); return; }
      if (key === 'plans') { setBottomNavActive('plans'); toggleBottomSheet(); return; }
      if (key === 'portfolio') { setBottomNavActive('portfolio'); sess ? renderPortfolio() : renderLogin(); return; }
    };
  });
}

function initTopNav(){
  const nav = document.createElement('div');
  nav.className = 'gtopnav';
  nav.innerHTML = `<div class="gtopnav-row1" id="gtopnavRow1"></div><div class="gtopnav-row2" id="gtopnavRow2"></div>`;
  document.body.insertBefore(nav, document.body.firstChild);
  const backdrop = document.createElement('div');
  backdrop.className = 'gtopnav-backdrop';
  backdrop.id = 'gtopnavBackdrop';
  backdrop.onclick = () => closeAllNavDropdowns();
  document.body.insertBefore(backdrop, nav.nextSibling);
}

/* ================== شريط التنقل السفلي - 4 وجهات أساسية للموبايل، بديل سريع عن فتح القائمة العلوية كل مرة ================== */
function setBottomNavActive(key){
  document.querySelectorAll('.gtopnav-main-icons .gtopnav-icon-btn[data-bn]').forEach(b=>b.classList.toggle('active', b.dataset.bn===key));
}
function toggleBottomSheet(){
  const sheet = document.getElementById('gbottomnavSheet');
  if (!sheet) return;
  sheet.classList.toggle('show');
}
function closeBottomSheet(){
  const sheet = document.getElementById('gbottomnavSheet');
  if (sheet) sheet.classList.remove('show');
}
// بتنشئ شيت "خططي" السريع مرة واحدة بس - بيتفتح لما يدوس المستخدم على أيقونة 📈 خططي في الشريط العلوي
function initBottomNav(){
  if (document.getElementById('gbottomnavSheet')) return;
  const sheet = document.createElement('div');
  sheet.className = 'gbottomnav-sheet';
  sheet.id = 'gbottomnavSheet';
  sheet.innerHTML = `
    <button type="button" id="gbnSheetDac">📈 خطط تعزيز المتوسط (DCA)</button>
    <button type="button" id="gbnSheetGrid">🔲 خطط الشبكة (Grid)</button>
    <button type="button" id="gbnSheetScreener">🔍 كشاف الأسهم</button>
  `;
  document.body.appendChild(sheet);
  document.getElementById('gbnSheetDac').onclick = () => { closeBottomSheet(); renderPlansList(); };
  document.getElementById('gbnSheetGrid').onclick = () => { closeBottomSheet(); renderGridPlansList(); };
  document.getElementById('gbnSheetScreener').onclick = () => { closeBottomSheet(); renderScreener(); };

  document.addEventListener('click', (e)=>{
    if (!e.target.closest('#gbottomnavSheet') && !e.target.closest('[data-bn="plans"]')) closeBottomSheet();
  });
}


function initSiteFooter(){
  const footer = document.createElement('div');
  footer.id = 'siteFooter';
  footer.style.cssText = 'text-align:center;padding:14px 10px;font-size:12px;color:#888;border-top:1px solid #eee;margin-top:20px;';
  footer.innerHTML = `<a id="footerDisclaimerLink" style="color:#888;text-decoration:underline;cursor:pointer;">إخلاء المسؤولية</a>`;
  document.body.appendChild(footer);
  document.getElementById('footerDisclaimerLink').onclick = () => renderDisclaimerPage();
}

/* ================== شريط إعلان + شكل الموقع (لكل الزوار، حتى قبل تسجيل الدخول) ================== */
window.__siteContent = {};
/* ألوان وخط الموقع من لوحة التحكم (تنسيق الموقع)
   - الألوان بتتطبق على الوضع النهاري بس - الوضع الليلي ليه ألوانه الثابتة عشان النص ميختفيش أبدًا
   - لون الأزرار بيتطبق على الأزرار الأساسية بس، مش على كل زرار في الموقع (كان بيبوّظ شاشة الترحيب والأيقونات)
   - لون النص/الزر بيتحسب تلقائيًا (أبيض أو غامق) حسب درجة اللون عشان يفضل مقروء */
function applySiteTheme(content){
  const hex = (v) => (/^#[0-9a-f]{6}$/i.test(String(v||'').trim()) ? String(v).trim() : null);
  const lum = (h) => { const n = parseInt(h.slice(1), 16); const f = (c) => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }; return .2126*f(n>>16&255) + .7152*f(n>>8&255) + .0722*f(n&255); };
  const L = 'html:not([data-theme="dark"]) body.g-shell';
  let css = '';
  const bg = hex(content.bg_color), tx = hex(content.text_color), ac = hex(content.accent_color);
  if (bg && lum(bg) > 0.55) css += `${L}{--gs-bg:${bg};}`;
  if (tx && lum(tx) < 0.2) css += `${L}{--gs-text:${tx};}`;
  if (ac) {
    const onInk = lum(ac) > 0.45 ? '#0F172A' : '#FFFFFF';
    css += `${L}{--gs-ink:${ac};--gs-on-ink:${onInk};}`;
    if (lum(ac) < 0.4) css += `${L} #app a{color:${ac};}`;
  }
  const font = String(content.font_family || '').trim();
  if (/^[A-Za-z0-9 ]{2,40}$/.test(font)) css += `body,input,select,textarea,button{font-family:'${font}','IBM Plex Sans Arabic',Tahoma,sans-serif !important;}`;
  const fs = parseInt(content.font_size_base, 10);
  if (fs >= 12 && fs <= 22) css += `body.g-shell{font-size:${fs}px;}`;
  const fw = parseInt(content.font_weight, 10);
  if ([400,500,600,700].includes(fw)) css += `body.g-shell #app .section-card, body.g-shell #app label{font-weight:${fw};}`;
  let tag = document.getElementById('siteThemeOverride');
  if (!css) { if (tag) tag.remove(); return; }
  if (!tag) { tag = document.createElement('style'); tag.id = 'siteThemeOverride'; document.head.appendChild(tag); }
  tag.textContent = css;
}
async function initAnnouncementBanner(){
  try{
    const res = await getSiteContent();
    if (!res || !res.success) return;
    const content = res.content || {};
    window.__siteContent = content;
    applySiteTheme(content);
    if (content.announcement_enabled !== '1' || !content.announcement_text) return;
    const bar = document.createElement('div');
    bar.id = 'siteAnnouncementBar';
    bar.style.cssText = 'background:var(--green);color:#fff;text-align:center;padding:8px 36px 8px 12px;font-size:13px;position:relative;';
    bar.innerHTML = `<span></span><button id="announcementCloseBtn" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#fff;font-size:16px;cursor:pointer;">✕</button>`;
    bar.querySelector('span').textContent = content.announcement_text; // textContent - مش innerHTML - عشان محدش يقدر يحقن HTML من نص الإعلان
    document.body.prepend(bar);
    document.getElementById('announcementCloseBtn').onclick = () => bar.remove();
  }catch(e){ /* الإعلان مش أساسي - أي فشل هنا يتجاهل */ }
}

// بيرجع HTML البانر الرئيسي + الأزرار المخصصة، أو نص فارغ لو لا يوجد حاجة متظبطة
function siteHeroHtml(){
  const content = window.__siteContent || {};
  let buttons = [];
  try { buttons = JSON.parse(content.custom_buttons || '[]'); } catch(e) { buttons = []; }

  const hasMedia = content.hero_banner_type && content.hero_banner_type !== 'none' && content.hero_banner_url;
  const hasText = content.hero_title || content.hero_subtitle;
  if (!hasMedia && !hasText && buttons.length === 0) return '';

  function buttonHref(b){
    if (b.type === 'whatsapp') return `https://wa.me/${b.value.replace(/[^0-9]/g,'')}`;
    if (b.type === 'phone') return `tel:${b.value}`;
    if (b.type === 'email') return `mailto:${b.value}`;
    // روابط عادية بس (http/https) - أي بروتوكول تاني زي javascript: مرفوض
    return /^https?:\/\//i.test(String(b.value||'').trim()) ? b.value : '#';
  }

  let mediaHtml = '';
  if (hasMedia && content.hero_banner_type === 'image') {
    mediaHtml = `<img src="${escapeHtml(content.hero_banner_url)}" alt="" style="width:100%;border-radius:10px;margin-bottom:12px;">`;
  } else if (hasMedia && content.hero_banner_type === 'video') {
    mediaHtml = `<video src="${escapeHtml(content.hero_banner_url)}" autoplay muted loop playsinline style="width:100%;border-radius:10px;margin-bottom:12px;"></video>`;
  }

  const textHtml = hasText ? `
    ${content.hero_title ? `<h2 style="margin:0 0 4px;">${escapeHtml(content.hero_title)}</h2>` : ''}
    ${content.hero_subtitle ? `<p style="margin:0 0 10px;color:#666;">${escapeHtml(content.hero_subtitle)}</p>` : ''}
  ` : '';

  const buttonsHtml = buttons.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
    ${buttons.map(b=>`<a href="${escapeHtml(buttonHref(b))}" target="_blank" rel="noopener" class="secondary small" style="width:auto;display:inline-block;text-decoration:none;padding:8px 14px;">${escapeHtml(b.label)}</a>`).join('')}
  </div>` : '';

  return `<div style="margin-bottom:16px;">${mediaHtml}${textHtml}${buttonsHtml}</div>`;
}
/* ============ سجل صفقات مغلقة عام - قابل لإعادة الاستخدام بين DCA والشبكة ============
   بيدعم: ترتيب الأحدث أولًا، صفحات (10 لكل صفحة)، إخفاء/إظهار الجدول، أرشفة، سلة محذوفات قابلة للاسترجاع.
   getTrades() لازم يرجع نفس المصفوفة الحية (مش نسخة) عشان التعديل عن طريق مرجع الكائن يعكس فورًا. */
function renderClosedTradesUI(containerId, getTrades, opts){
  let page = 0;
  let view = 'active'; // active | archived | trash
  let hidden = false;
  const perPage = 10;

  function render(){
    const container = document.getElementById(containerId);
    if (!container) return;
    const all = getTrades();
    all.forEach((t,i)=>{ if(t.archived==null) t.archived=false; if(t.deleted==null) t.deleted=false; if(t.__uid==null) t.__uid = 'u'+i+'_'+Math.random().toString(36).slice(2,8); });
    const activeCount = all.filter(t=>!t.archived && !t.deleted).length;
    const archivedCount = all.filter(t=>t.archived && !t.deleted).length;
    const trashCount = all.filter(t=>t.deleted).length;

    if (hidden) {
      container.innerHTML = `<button class="small secondary" id="${containerId}_showBtn">👁 إظهار الصفقات المغلقة (${activeCount})</button>`;
      document.getElementById(containerId+'_showBtn').onclick = () => { hidden = false; render(); };
      return;
    }

    const filtered = all.filter(t => view==='active' ? (!t.archived && !t.deleted) : view==='archived' ? (t.archived && !t.deleted) : t.deleted);
    const ordered = filtered.slice().reverse();
    const totalPages = Math.max(1, Math.ceil(ordered.length / perPage));
    if (page >= totalPages) page = totalPages - 1;
    if (page < 0) page = 0;
    const pageItems = ordered.slice(page*perPage, page*perPage+perPage);

    const agg = filtered.reduce((acc,t)=>({qty:acc.qty+t.totalQty, capital:acc.capital+t.capitalUsed, profit:acc.profit+t.profit}), {qty:0,capital:0,profit:0});
    const aggProfitPercent = agg.capital>0 ? (agg.profit/agg.capital*100) : 0;

    let html = '';
    if (view === 'active') {
      html += `<div class="summary-cards">
        <div class="summary-card"><div class="val">${fmtQty(agg.qty)}</div><div class="lbl">إجمالي الأسهم المتداولة</div></div>
        <div class="summary-card"><div class="val">${fmtMoney(agg.capital)}</div><div class="lbl">إجمالي رأس المال المستخدم</div></div>
        <div class="summary-card"><div class="val ${agg.profit>=0?'pos':'neg'}">${fmtMoney(agg.profit)}</div><div class="lbl">إجمالي الربح/الخسارة</div></div>
        <div class="summary-card"><div class="val ${aggProfitPercent>=0?'pos':'neg'}">${aggProfitPercent.toFixed(2)}%</div><div class="lbl">نسبة الربح/الخسارة</div></div>
      </div>`;
    }
    html += `<div class="topbar" style="margin-top:10px;flex-wrap:wrap;">
      <button class="small secondary${view==='active'?' btn-active':''}" id="${containerId}_viewActive">النشطة (${activeCount})</button>
      <button class="small secondary${view==='archived'?' btn-active':''}" id="${containerId}_viewArchived">🗄️ الأرشيف (${archivedCount})</button>
      <button class="small secondary${view==='trash'?' btn-active':''}" id="${containerId}_viewTrash">🗑️ المحذوفة (${trashCount})</button>
      ${view==='active' ? `
        <button class="small secondary" id="${containerId}_hideBtn">🙈 إخفاء الصفقات المغلقة</button>
        ${opts.onExportXlsx ? `<button class="small secondary" id="${containerId}_exportXlsx">⬇ تصدير Excel</button>` : ''}
        ${opts.onExportPdf ? `<button class="small secondary" id="${containerId}_exportPdf">🖨 تصدير PDF (طباعة)</button>` : ''}
        <button class="small danger" id="${containerId}_clearAll">مسح كل الصفقات المغلقة</button>
      ` : ''}
    </div>`;

    if (!ordered.length) {
      html += `<p style="color:#888;font-size:12.5px;margin-top:10px;">${view==='active'?'لا يوجد صفقات مغلقة بعد.':view==='archived'?'الأرشيف فارغ.':'سلة المحذوفات فارغة.'}</p>`;
    } else {
      html += `<div class="section-card" style="overflow-x:auto;margin-top:10px;">
        <table>
          <thead><tr>
            <th>تاريخ ووقت الإغلاق</th><th>الكمية</th><th>متوسط الدخول</th><th>متوسط الخروج</th>
            <th>الربح</th><th>نسبة الربح</th><th>رأس المال المستخدم</th><th></th>
          </tr></thead>
          <tbody>
            ${pageItems.map(t=>`<tr>
              <td>${formatDateTimeAr(t.closedDate)}</td>
              <td>${fmtQty(t.totalQty)}</td>
              <td>${fmt2(t.avgEntry)}</td>
              <td>${fmt2(t.avgExit)}</td>
              <td class="${t.profit>=0?'pos':'neg'}">${fmt2(t.profit)}</td>
              <td class="${t.profitPercent>=0?'pos':'neg'}">${t.profitPercent.toFixed(2)}%</td>
              <td>${fmt2(t.capitalUsed)}</td>
              <td>
                ${view==='active' ? `
                  <button class="small secondary" data-act="archive" data-uid="${t.__uid}">🗄️ أرشفة</button>
                  <button class="small danger" data-act="delete" data-uid="${t.__uid}">حذف</button>
                ` : `
                  <button class="small" data-act="restore" data-uid="${t.__uid}">↩️ استرجاع</button>
                  ${view==='trash' ? `<button class="small danger" data-act="permadelete" data-uid="${t.__uid}">حذف نهائي</button>` : ''}
                `}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="display:flex;justify-content:center;align-items:center;gap:10px;margin-top:10px;">
        <button class="small secondary" id="${containerId}_prevPage" ${page<=0?'disabled':''}>◀ السابق</button>
        <span style="font-size:12px;color:var(--text-muted);">صفحة ${page+1} من ${totalPages} (${ordered.length} صفقة)</span>
        <button class="small secondary" id="${containerId}_nextPage" ${page>=totalPages-1?'disabled':''}>التالي ▶</button>
      </div>`;
    }

    container.innerHTML = html;

    document.getElementById(containerId+'_viewActive').onclick = () => { view='active'; page=0; render(); };
    document.getElementById(containerId+'_viewArchived').onclick = () => { view='archived'; page=0; render(); };
    document.getElementById(containerId+'_viewTrash').onclick = () => { view='trash'; page=0; render(); };
    const hideBtn = document.getElementById(containerId+'_hideBtn');
    if (hideBtn) hideBtn.onclick = () => { hidden = true; render(); };
    const clearBtn = document.getElementById(containerId+'_clearAll');
    if (clearBtn) clearBtn.onclick = async () => {
      if(!await gConfirm('هل أنت متأكد من حذف كل سجل الصفقات المغلقة نهائيًا؟ هذا الإجراء نهائي ولن يُسجَّل في المحذوفات.')) return;
      await opts.onClearAll();
      render();
    };
    const exXlsx = document.getElementById(containerId+'_exportXlsx');
    if (exXlsx) exXlsx.onclick = () => opts.onExportXlsx(all.filter(t=>!t.archived && !t.deleted));
    const exPdf = document.getElementById(containerId+'_exportPdf');
    if (exPdf) exPdf.onclick = () => opts.onExportPdf(all.filter(t=>!t.archived && !t.deleted));
    const prevBtn = document.getElementById(containerId+'_prevPage');
    if (prevBtn) prevBtn.onclick = () => { page--; render(); };
    const nextBtn = document.getElementById(containerId+'_nextPage');
    if (nextBtn) nextBtn.onclick = () => { page++; render(); };

    container.querySelectorAll('button[data-act]').forEach(btn=>{
      btn.onclick = async () => {
        const uid = btn.dataset.uid;
        const trade = all.find(t=>String(t.__uid)===uid);
        if (!trade) return;
        if (btn.dataset.act === 'archive') trade.archived = true;
        else if (btn.dataset.act === 'delete') trade.deleted = true;
        else if (btn.dataset.act === 'restore') { trade.archived = false; trade.deleted = false; }
        else if (btn.dataset.act === 'permadelete') { if(!await gConfirm('حذف نهائي لا يمكن التراجع عنه. متأكد؟')) return; all.splice(all.indexOf(trade),1); }
        await opts.afterChange();
        render();
      };
    });
  }
  render();
}

function escapeHtml(s){
  // آمن للنص وللـ attributes (بيهرّب & < > " ')
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* مجموعة أفاتارات جاهزة - كلها SVG مولّدة محليًا (لا يوجد صور خارجية)، كل واحدة خلفية بلون مختلف ورمز بسيط */
function presetAvatars(){
  const items = [
    { bg: '#131921', glyph: '🦅' },
    { bg: '#007185', glyph: '📈' },
    { bg: '#f0c14b', glyph: '🐯' },
    { bg: '#1b8a5a', glyph: '🌿' },
    { bg: '#8e44ad', glyph: '🦁' },
    { bg: '#c0392b', glyph: '🐺' },
    { bg: '#2c3e50', glyph: '🦉' },
    { bg: '#e67e22', glyph: '🐉' },
  ];
  return items.map(it => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="50" fill="${it.bg}"/>
      <text x="50" y="62" font-size="46" text-anchor="middle">${it.glyph}</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  });
}

