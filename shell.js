/* =====================================================================
   GRIFFINE App Shell — واجهة التطبيق الجديدة
   - شريط علوي + شريط تبويبات سفلي (موبايل) / شريط جانبي (كمبيوتر)
   - شاشة رئيسية جديدة بقيمة المحفظة والأرباح والاستثمارات
   - شاشة "حسابي" بدل القائمة المنسدلة القديمة
   - إشعارات Toast بدل نوافذ alert
   - تثبيت الموقع كتطبيق (PWA)
   كل النصوص اللي جاية من المستخدم بتعدّي على esc() قبل ما تتعرض.
   ===================================================================== */
(function(){
  'use strict';
  /* الاستعلامات المتكررة (الدردشة/التوصيات) بتقف لما التبويب يكون مخفي أو الموبايل مقفول
     - بتوفّر ضغط على سيرفر هوستنجر وبطارية الموبايل، وبترجع تشتغل أول ما الصفحة تظهر */
  (function(){
    const nativeSetInterval = window.setInterval.bind(window);
    window.setInterval = function(fn, ms){
      const rest = Array.prototype.slice.call(arguments, 2);
      if (typeof fn !== 'function' || !(ms < 60000)) return nativeSetInterval.apply(window, arguments);
      return nativeSetInterval(function(){ if (document.hidden) return; fn.apply(this, rest); }, ms);
    };
  })();

  const GS = window.GShell = { enabled: false, seq: 0, tab: 'home', email: null, settings: {}, deferredInstall: null };

  /* ---------------- أدوات مساعدة ---------------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  GS.esc = esc;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const store = {
    get(k, d){ try{ const v = localStorage.getItem(k); return v == null ? d : v; }catch(e){ return d; } },
    set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  };

  /* أيقونات خطية موحّدة (على طراز Lucide) - بدل الإيموجي */
  const P = {
    home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    layers:'<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
    pie:'<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M21 12a9 9 0 0 0-9-9"/>',
    radar:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M8 11.5 10 13l4-4"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    bell:'<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    back:'<path d="m9 6 6 6-6 6"/>',
    chev:'<path d="m15 6-6 6 6 6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    trend:'<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    report:'<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="M9 17v-3M12 17v-5M15 17v-2"/>',
    megaphone:'<path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M17 8a5 5 0 0 1 0 8"/>',
    card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
    receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8S10.5 3 8 4.5 9 8 12 8zM12 8s1.5-5 4-3.5S15 8 12 8z"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    news:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
    star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    bulb:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    shield:'<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    refund:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    logout:'<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    admin:'<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff:'<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    check:'<path d="M20 6 9 17l-5-5"/>',
    alert:'<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    x:'<path d="M18 6 6 18M6 6l12 12"/>',
    download:'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    login:'<path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="M14 17l5-5-5-5M19 12H8"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || P.info}</svg>`;
  GS.icon = icon;

  const CCY_CODE = { 'جنيه مصري':'EGP', 'ريال سعودي':'SAR', 'درهم إماراتي':'AED', 'ريال قطري':'QAR', 'دينار كويتي':'KWD' };
  const PALETTE = ['#D4AF37','#3B82F6','#10B981','#F97316','#A855F7','#EC4899','#14B8A6','#EAB308'];
  const symColor = (s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return ['#1F2A44','#0F766E','#7C3AED','#B45309','#1D4ED8','#BE123C','#047857','#374151'][h % 8]; };
  const money = (n) => (typeof fmtMoney === 'function') ? fmtMoney(n) : Number(n || 0).toFixed(2);
  const hidden = (k) => GS.settings && GS.settings[k] === true;
  const valuesHidden = () => store.get('gs_hide_values', '0') === '1';
  const mask = (s) => valuesHidden() ? '••••••' : s;
  const pct = (n) => (n == null || isNaN(n)) ? '—' : `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`;
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'صباح الخير' : 'مساء الخير'; };

  /* ---------------- Toast بدل alert ---------------- */
  GS.toast = function(msg, type){
    msg = String(msg == null ? '' : msg).trim();
    if (!msg) return;
    if (!type) {
      if (/خطأ|فشل|تعذّر|تعذر|مينفعش|غير صحيح|غير صالح|لازم|مش موجود|مرفوض|لا يمكن|حدث خطأ/.test(msg)) type = 'err';
      else if (/تم |تم$|بنجاح|اتحفظ|اتبعت|✅/.test(msg)) type = 'ok';
      else type = 'info';
    }
    let wrap = $('.gs-toasts');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'gs-toasts'; wrap.setAttribute('role','status'); wrap.setAttribute('aria-live','polite'); document.body.appendChild(wrap); }
    const t = document.createElement('div');
    t.className = 'gs-toast ' + type;
    t.innerHTML = `<span class="ti">${icon(type === 'err' ? 'alert' : type === 'ok' ? 'check' : 'info')}</span><span class="tx"></span><button type="button" class="tc" aria-label="إغلاق">${icon('x')}</button>`;
    t.querySelector('.tx').textContent = msg.replace(/^[✅❌⚠️\s]+/u, '');
    const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 200); };
    t.querySelector('.tc').onclick = close;
    wrap.appendChild(t);
    while (wrap.children.length > 3) wrap.firstChild.remove();
    setTimeout(close, Math.min(9000, 3200 + msg.length * 45));
  };

  /* ---------------- Bottom Sheet ---------------- */
  GS.sheet = function(title, html, onMount){
    GS.closeSheet();
    const back = document.createElement('div'); back.className = 'gs-sheet-back'; back.id = 'gsSheetBack';
    const sh = document.createElement('div'); sh.className = 'gs-sheet'; sh.id = 'gsSheet'; sh.setAttribute('role','dialog'); sh.setAttribute('aria-modal','true');
    sh.innerHTML = `<div class="gs-sheet-grab"></div>${title ? `<h4>${esc(title)}</h4>` : ''}${html}`;
    document.body.appendChild(back); document.body.appendChild(sh);
    back.onclick = GS.closeSheet;
    requestAnimationFrame(() => { back.classList.add('show'); sh.classList.add('show'); });
    if (onMount) onMount(sh);
    return sh;
  };
  GS.closeSheet = function(){
    const b = $('#gsSheetBack'), s = $('#gsSheet');
    if (b) { b.classList.remove('show'); setTimeout(() => b.remove(), 220); }
    if (s) { s.classList.remove('show'); setTimeout(() => s.remove(), 260); }
  };

  /* ---------------- التنقل ---------------- */
  // كل تبويب ليه شاشة جذر - الشاشات دي مبيظهرش فيها زرار الرجوع
  const TAB_OF = {
    renderHome:'home',
    renderPlansList:'plans', renderGridPlansList:'plans', renderPlanDetail:'plans', renderGridPlanDetail:'plans',
    renderPlanTypeChooser:'plans', renderNewPlanForm:'plans', renderGridPlanForm:'plans', renderEditPlanSettings:'plans', renderGridEditPlanSettings:'plans',
    renderPortfolio:'portfolio', renderDiversificationReport:'portfolio',
    renderScreener:'screener',
    renderRecommendationsCustomerPage:'rec',
    renderAccount:'account', renderProfilePage:'account', renderSubscriptionPlans:'account', renderMySubscriptionHistory:'account',
    renderReferralPage:'account', renderAboutPage:'account', renderContactInfo:'account', renderRefundPolicyPage:'account',
    renderArticlesListPage:'account', renderArticleDetailPage:'account', renderTestimonialsPage:'account', renderSuggestionsPage:'account',
    renderDisclaimerPage:'account', renderPrivacyPolicyPage:'account', renderCheckoutForm:'account', renderPlanChangeCheckout:'account'
  };
  const ROOTS = { renderHome:1, renderPlansList:1, renderPortfolio:1, renderScreener:1, renderAccount:1, renderPublicHome:1 };

  function wrapRenderers(){
    // بنلف بس دوال الشاشات الحقيقية (اللي بتسجّل نفسها في سجل التنقل pushNav) - مش دوال الرسم المساعدة
    Object.keys(window).filter(k => /^render[A-Z]/.test(k) && typeof window[k] === 'function' && !window[k].__gsWrapped && /pushNav\(/.test(Function.prototype.toString.call(window[k]))).forEach(name => {
      const orig = window[name];
      const tab = TAB_OF[name] || (/^renderAdmin|^renderChatAdmin|^renderStaff|^renderBlacklist|^renderPlansManagement|^renderSiteDesign|^renderSiteTexts|^renderContentAdmin|^renderRecommendationsAdmin|^renderSuggestionsAdmin|^renderArchived/.test(name) ? 'admin' : null);
      const wrapped = function(){
        GS.seq++;
        GS.sub = /Grid/.test(name) ? 'grid' : (tab === 'plans' ? 'dca' : null);
        if (tab) GS.setTab(tab);
        GS.isRoot = !!ROOTS[name];
        GS.currentScreen = name;
        GS.titleHint = (name === 'renderPlanDetail' || name === 'renderGridPlanDetail') && arguments[0] ? `${arguments[0]} · ${name === 'renderGridPlanDetail' ? 'خطة شبكة Grid' : 'خطة DCA'}` : '';
        // شاشة جديدة تبدأ من فوق (زي أي تطبيق)
        try { window.scrollTo(0, 0); } catch(e){}
        const r = orig.apply(this, arguments);
        if (name === 'renderPlansList' || name === 'renderGridPlansList') {
          const my = GS.seq;
          Promise.resolve(r).then(() => { if (GS.seq === my) GS.injectPlanSwitch(name === 'renderPlansList' ? 'dca' : 'grid'); });
        }
        return r;
      };
      wrapped.__gsWrapped = true;
      window[name] = wrapped;
    });
    // دالة الرجوع القديمة بتخفي/تظهر زرارها - بنربطها بزرار الرجوع الجديد
    const origBackVis = window.setBackButtonVisible;
    window.setBackButtonVisible = function(v){ try{ origBackVis && origBackVis(v); }catch(e){} GS.setBackVisible(v); };
  }

  GS.setTab = function(tab){
    GS.tab = tab;
    document.querySelectorAll('.gs-tab').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
    document.querySelectorAll('.gs-side-item').forEach(el => {
      let on;
      if (el.dataset.sub) on = tab === 'plans' && GS.sub === el.dataset.sub;
      else if (el.dataset.screen) on = el.dataset.screen === GS.currentScreen;
      else on = el.dataset.tab === tab;
      el.classList.toggle('active', !!on);
    });
  };
  GS.setBackVisible = function(v){
    const b = $('#gsBackBtn'), brand = $('#gsBrandBtn');
    if (!b) return;
    const show = v && !GS.isRoot;
    b.style.display = show ? '' : 'none';
    if (brand) brand.style.display = show ? 'none' : '';
  };

  function tabsForUser(){
    const tabs = [ { tab:'home', label:'الرئيسية', ic:'home', go:() => renderHome() } ];
    if (!(hidden('hide_dac_screen') && hidden('hide_grid_screen'))) tabs.push({ tab:'plans', label:'خططي', ic:'layers', go:() => hidden('hide_dac_screen') ? renderGridPlansList() : renderPlansList() });
    if (!hidden('hide_portfolio_screen')) tabs.push({ tab:'portfolio', label:'المحفظة', ic:'pie', go:() => renderPortfolio() });
    if (!hidden('hide_screener_screen')) tabs.push({ tab:'screener', label:'الكشاف', ic:'radar', go:() => renderScreener() });
    else if (!hidden('hide_recommendations_screen')) tabs.push({ tab:'rec', label:'التوصيات', ic:'megaphone', go:() => renderRecommendationsCustomerPage() });
    tabs.push({ tab:'account', label:'حسابي', ic:'user', go:() => GS.renderAccount() });
    return tabs;
  }

  function sideItems(){
    const items = [
      { tab:'home', label:'الرئيسية', ic:'home', go:() => renderHome() },
      !hidden('hide_dac_screen') && { tab:'plans', sub:'dca', label:'خطط تعزيز المتوسط (DCA)', ic:'layers', go:() => renderPlansList() },
      !hidden('hide_grid_screen') && { tab:'plans', sub:'grid', label:'خطط الشبكة (Grid)', ic:'grid', go:() => renderGridPlansList() },
      !hidden('hide_portfolio_screen') && { tab:'portfolio', label:'المحفظة والتقارير', ic:'pie', go:() => renderPortfolio() },
      !hidden('hide_screener_screen') && { tab:'screener', label:'كشاف الأسهم', ic:'radar', go:() => renderScreener() },
      !hidden('hide_recommendations_screen') && { tab:'rec', label:'التوصيات', ic:'megaphone', go:() => renderRecommendationsCustomerPage() },
      { sec:'حسابي' },
      { tab:'account', label:'حسابي والإعدادات', ic:'settings', go:() => GS.renderAccount() },
      { screen:'renderSubscriptionPlans', label:'الاشتراك والباقات', ic:'card', go:() => renderSubscriptionPlans() },
      !hidden('hide_referral_screen') && { screen:'renderReferralPage', label:'ادعُ صديقك', ic:'gift', go:() => renderReferralPage() },
    ].filter(Boolean);
    if (window.__isAdmin) items.push({ sec:'الإدارة' }, { tab:'admin', label:'لوحة التحكم', ic:'admin', go:() => renderAdminSubscribers() });
    return items;
  }

  /* ---------------- بناء الهيكل ---------------- */
  function buildChrome(){
    if (!$('.gs-appbar')) {
      const bar = document.createElement('header');
      bar.className = 'gs-appbar';
      bar.innerHTML = `
        <button type="button" class="gs-iconbtn" id="gsBackBtn" aria-label="رجوع" style="display:none">${icon('back')}</button>
        <button type="button" class="gs-appbar-brand" id="gsBrandBtn" aria-label="الرئيسية"><img alt="GRIFFINE" id="gsBrandImg"><span>GRIFFINE</span></button>
        <div class="gs-appbar-title" id="gsTitle"></div>
        <div id="gsBarEnd" style="display:flex;align-items:center;"></div>`;
      document.body.appendChild(bar);
      $('#gsBackBtn').onclick = () => (typeof goBack === 'function' ? goBack() : history.back());
      $('#gsBrandBtn').onclick = () => GS.email ? renderHome() : renderPublicHome();
    }
    if (!$('.gs-tabbar')) {
      const tb = document.createElement('nav'); tb.className = 'gs-tabbar'; tb.setAttribute('aria-label','التنقل الرئيسي');
      document.body.appendChild(tb);
    }
    if (!$('.gs-sidebar')) {
      const sb = document.createElement('aside'); sb.className = 'gs-sidebar'; sb.setAttribute('aria-label','القائمة الجانبية');
      document.body.appendChild(sb);
    }
  }

  function brandSrc(){ try { return griffineLogoSrc(); } catch(e){ return ''; } }

  GS.refresh = async function(email){
    if (!GS.enabled) return;
    GS.email = email || null;
    document.body.classList.toggle('gs-anon', !email);
    try { GS.settings = (email && !window.__isAdmin) ? await getAdminSettings() : {}; } catch(e){ GS.settings = {}; }
    const img = $('#gsBrandImg'); if (img) img.src = brandSrc();

    // أزرار نهاية الشريط العلوي
    const end = $('#gsBarEnd');
    if (email) {
      end.innerHTML = `${!hidden('hide_recommendations_screen') ? `<button type="button" class="gs-iconbtn" id="gsBellBtn" aria-label="التوصيات">${icon('bell')}<span class="gs-badge" id="gsBellBadge" style="display:none"></span></button>` : ''}
        <button type="button" class="gs-iconbtn" id="gsThemeBtn" aria-label="تبديل الوضع الليلي">${icon('moon')}</button>`;
      const bell = $('#gsBellBtn'); if (bell) bell.onclick = () => { GS.markRecsSeen(); renderRecommendationsCustomerPage(); };
    } else {
      end.innerHTML = `<button type="button" class="gs-iconbtn" id="gsThemeBtn" aria-label="تبديل الوضع الليلي">${icon('moon')}</button>
        <button type="button" class="gs-iconbtn" id="gsAnonMenu" aria-label="القائمة">${icon('menu')}</button>`;
      $('#gsAnonMenu').onclick = GS.openPublicMenu;
    }
    $('#gsThemeBtn').onclick = GS.toggleTheme;

    // التبويبات السفلية
    const tb = $('.gs-tabbar');
    if (email) {
      const tabs = tabsForUser();
      tb.style.gridTemplateColumns = `repeat(${tabs.length},1fr)`;
      tb.innerHTML = tabs.map((t, i) => `<button type="button" class="gs-tab" data-tab="${t.tab}" data-i="${i}"><span class="gs-tab-icon">${icon(t.ic)}</span><span>${t.label}</span></button>`).join('');
      tb.querySelectorAll('.gs-tab').forEach(b => b.onclick = () => { GS.closeSheet(); tabs[+b.dataset.i].go(); });
    } else tb.innerHTML = '';

    // الشريط الجانبي
    const sb = $('.gs-sidebar');
    if (email) {
      const items = sideItems();
      sb.innerHTML = `<div class="gs-side-brand" id="gsSideBrand"><img src="${brandSrc()}" alt="GRIFFINE"><span>GRIFFINE</span></div>
        ${items.map((it, i) => it.sec ? `<div class="gs-side-sec">${it.sec}</div>` : `<button type="button" class="gs-side-item" data-i="${i}" ${it.tab ? `data-tab="${it.tab}"` : ''} ${it.screen ? `data-screen="${it.screen}"` : ''} ${it.sub ? `data-sub="${it.sub}"` : ''}>${icon(it.ic)}<span>${it.label}</span></button>`).join('')}
        <div class="gs-side-foot"><div class="gs-side-user" id="gsSideUser"><span class="gs-avatar" id="gsSideAvatar">${esc(email.charAt(0).toUpperCase())}</span><span class="t"><b>${esc(email)}</b><small>الملف الشخصي والإعدادات</small></span></div></div>`;
      sb.querySelectorAll('.gs-side-item').forEach(b => b.onclick = () => items[+b.dataset.i].go());
      $('#gsSideBrand').onclick = () => renderHome();
      $('#gsSideUser').onclick = () => GS.renderAccount();
      GS.loadAvatar().then(src => { const a = $('#gsSideAvatar'); if (src && a) a.innerHTML = `<img src="${esc(src)}" alt="">`; });
      GS.updateBell();
    } else sb.innerHTML = '';
    GS.setTab(GS.tab);
  };

  GS.loadAvatar = async function(){
    if (GS._avatar !== undefined) return GS._avatar;
    try { const r = await apiGet('/avatar_get.php'); GS._avatar = (r && r.success && r.avatar && /^(data:image\/|file_get\.php)/.test(r.avatar)) ? r.avatar : null; }
    catch(e){ GS._avatar = null; }
    return GS._avatar;
  };

  GS.toggleTheme = function(){
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (dark) document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme','dark');
    store.set('griffine_theme', dark ? 'light' : 'dark');
    document.querySelectorAll('img[alt="GRIFFINE"], img.brand-logo-img').forEach(img => { img.src = brandSrc(); });
    try { document.querySelectorAll('img[alt="Top7"]').forEach(img => { img.src = top7LogoSrc(); }); } catch(e){}
    const meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', dark ? '#F3F4F6' : '#0A0F16');
    const sw = $('#gsDarkSwitch'); if (sw) sw.checked = !dark;
  };

  GS.logout = async function(){
    GS._avatar = undefined;
    await setSession('');
    window.__screens = []; window.__screenIndex = -1;
    await refreshTopNav();
    renderLogin();
  };

  /* ---------------- التوصيات: عداد الجرس ---------------- */
  GS.updateBell = async function(recs){
    const badge = $('#gsBellBadge'); if (!badge) return;
    try {
      if (!recs) { const r = await getRecommendations(); recs = (r && r.success) ? (r.recommendations || r.items || r.rows || []) : []; }
      GS._recs = recs;
      const seen = new Set(store.get('gs_seen_recs', '').split(',').filter(Boolean));
      const n = recs.filter(x => !seen.has(String(x.id))).length;
      badge.textContent = n > 9 ? '9+' : String(n);
      badge.style.display = n ? '' : 'none';
    } catch(e){}
  };
  GS.markRecsSeen = function(){
    if (GS._recs) store.set('gs_seen_recs', GS._recs.map(x => x.id).join(','));
    const badge = $('#gsBellBadge'); if (badge) badge.style.display = 'none';
  };

  /* ---------------- معالجة كل شاشة بعد رسمها ---------------- */
  const EMOJI_LEAD = /^[\s‍️⃣\p{Extended_Pictographic}]+/u;
  function stripLeadingEmoji(el){
    // أول عقدة نصية فعلية بس (لو فيه عنصر قبلها زي checkbox عادي)
    const tn = Array.from(el.childNodes).find(n => n.nodeType === 3 && n.nodeValue.trim());
    if (!tn) return;
    const v = tn.nodeValue, nv = v.replace(EMOJI_LEAD, '');
    if (nv !== v && nv.trim()) tn.nodeValue = nv;
  }
  let processing = false;
  function processScreen(){
    if (processing) return;
    processing = true;
    try {
      const app = document.getElementById('app');
      if (!app) return;
      const fullScreen = !!app.querySelector('.wl-screen, .gl-screen');
      document.body.classList.toggle('gs-no-shell', fullScreen);
      if (fullScreen) return;

      // عبارات الترحيب القديمة ("مرحبًا email") مش محتاجينها - الحساب ظاهر في الشريط
      app.querySelectorAll('.topbar').forEach(tb => {
        const first = tb.firstElementChild;
        if (first && /^\s*مرحب/.test(first.textContent)) first.classList.add('gs-hide');
        const visible = Array.from(tb.children).some(c => !c.classList.contains('gs-hide') && c.offsetParent !== null);
        if (!visible) tb.classList.add('gs-hide');
      });
      // أزرار "الشاشة الرئيسية" داخل الصفحات - شريط التبويبات بيغني عنها
      app.querySelectorAll('button').forEach(b => {
        if (b.id === 'homeBtn' || /^\s*🏠/u.test(b.textContent) || /^\s*(🏠\s*)?الشاشة الرئيسية\s*$/.test(b.textContent)) b.classList.add('gs-hide');
      });
      // إيموجي في أول الأزرار والعناوين → نص نظيف (الأيقونات الموحدة في الشريط والقوائم)
      app.querySelectorAll('button, h2, h3, .topbar > div, .info, .lbl, label, [style*="var(--green-dark)"]').forEach(stripLeadingEmoji);
      // أيقونات لوحة التحكم (كانت إيموجي)
      const ADMIN_IC = { goChatAdminBtn:'chat', goContentBtn:'star', goSuggestionsAdminBtn:'bulb', goPlansMgmtBtn:'card', goReportsBtn:'report',
        goRecommendationsBtn:'megaphone', goStaffBtn:'user', goSettingsBtn:'settings', goBlacklistBtn:'shield', goSiteDesignBtn:'grid', goSiteTextsBtn:'news', goArchiveBtn:'receipt', goSubscribersBtn:'user', goExportScreensBtn:'report', goExportExcelBtn:'download' };
      app.querySelectorAll('.admin-nav-card .nav-icon').forEach(el => {
        if (el.dataset.gs) return;
        const id = el.closest('.admin-nav-card').id;
        el.dataset.gs = '1'; el.innerHTML = icon(ADMIN_IC[id] || 'settings');
      });
      // إيموجي داخل placeholder مربعات البحث (الأيقونة بقت مرسومة)
      app.querySelectorAll('input[placeholder]').forEach(i => { const v = i.getAttribute('placeholder'), nv = v.replace(EMOJI_LEAD, ''); if (nv !== v && nv.trim()) i.setAttribute('placeholder', nv); });
      // topbars فاضية بعد إخفاء زرار الرئيسية
      app.querySelectorAll('.topbar').forEach(tb => {
        const any = Array.from(tb.querySelectorAll('*')).some(c => !c.closest('.gs-hide') && (c.tagName === 'BUTTON' || c.textContent.trim()) );
        if (!any && !tb.textContent.trim()) tb.classList.add('gs-hide');
      });
      // عنوان الشريط العلوي
      const t = app.querySelector('.gs-page-title') || Array.from(app.querySelectorAll('.container > .topbar:not(.gs-hide) > div:first-child:not(.gs-hide), .container > h2, .container h2')).find(e => e.textContent.trim());
      const title = GS.titleHint || (t ? t.textContent.replace(EMOJI_LEAD, '').replace(/\s+/g, ' ').trim() : '');
      const tt = $('#gsTitle'); if (tt) tt.textContent = GS.currentScreen === 'renderHome' ? '' : title.slice(0, 60);
      document.title = title && GS.currentScreen !== 'renderHome' ? `${title} — GRIFFINE` : 'GRIFFINE';
      GS.setBackVisible(!GS.isRoot);
    } finally {
      // نسيب المراقب يتجاهل التعديلات اللي عملناها إحنا
      setTimeout(() => { processing = false; }, 0);
    }
  }
  let raf = 0;
  function scheduleProcess(){ if (processing) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(processScreen); }

  function onScroll(){
    const bar = $('.gs-appbar'); if (!bar) return;
    bar.classList.toggle('scrolled', window.scrollY > 40);
  }

  /* ---------------- مفتاح DCA / Grid فوق قوائم الخطط ---------------- */
  GS.injectPlanSwitch = function(active){
    const c = document.querySelector('#app > .container'); if (!c || c.querySelector('.gs-seg')) return;
    if (hidden('hide_dac_screen') || hidden('hide_grid_screen')) return;
    const seg = document.createElement('div');
    seg.className = 'gs-seg'; seg.setAttribute('role','tablist');
    seg.innerHTML = `<button type="button" role="tab" class="${active === 'dca' ? 'on' : ''}" data-k="dca">تعزيز المتوسط DCA</button><button type="button" role="tab" class="${active === 'grid' ? 'on' : ''}" data-k="grid">الشبكة Grid</button>`;
    seg.querySelectorAll('button').forEach(b => b.onclick = () => { if (b.dataset.k !== active) (b.dataset.k === 'dca' ? renderPlansList : renderGridPlansList)(); });
    c.insertBefore(seg, c.firstChild);
    GS.isRoot = true; GS.setBackVisible(false);
  };

  /* =====================================================================
     الشاشة الرئيسية الجديدة
     ===================================================================== */
  GS.renderHome = async function(){
    pushNav(() => renderHome());
    const my = GS.seq;
    const email = await getSession();
    if (!email) return renderLogin();
    setBackButtonVisible(false);
    if (!(await ensureAccess())) return;
    if (GS.seq !== my) return;

    app.innerHTML = `<div class="container gs-home">
      <div class="gs-greet"><div><div class="hello">${greeting()}</div><div class="gs-skel" style="width:160px;height:26px;margin-top:6px"></div></div><span class="gs-avatar"></span></div>
      <div class="gs-skel" style="height:220px;border-radius:24px"></div>
      <div class="gs-skel" style="height:70px;margin-top:18px"></div>
      <div class="gs-skel" style="height:220px;margin-top:24px"></div></div>`;

    const [settings, plans, grids, subRes, avatar] = await Promise.all([
      getAdminSettings().catch(() => ({})), getPlans(email).catch(() => ({})), getGridPlans(email).catch(() => ({})),
      getMySubscription().catch(() => null), GS.loadAvatar()
    ]);
    if (GS.seq !== my) return;
    GS.settings = window.__isAdmin ? {} : (settings || {});
    const sub = subRes && subRes.success ? subRes.subscription : null;
    const displayName = (sub && sub.name) ? String(sub.name).split(/\s+/)[0] : email.split('@')[0];

    const entries = [
      ...Object.keys(plans || {}).map(s => ({ key:`${s}::DCA`, sym:s, type:'DCA' })),
      ...Object.keys(grids || {}).map(s => ({ key:`${s}::Grid`, sym:s, type:'Grid' }))
    ];
    const ccyOf = (e) => e.type === 'DCA' ? (plans[e.sym].currency || MARKET_TO_CURRENCY_MAP[plans[e.sym].market] || '') : (MARKET_TO_CURRENCY_MAP[grids[e.sym].market] || '');
    let all = { stockRows: [] };
    try { all = computeAggregates(plans, grids, entries, null, null); } catch(e){ console.error(e); }
    const rowCcy = {}; entries.forEach(e => { rowCcy[`${e.sym}::${e.type}`] = ccyOf(e); });

    // المحفظة مقسّمة حسب العملة (مينفعش نجمع جنيه على ريال)
    const byCcy = {};
    entries.forEach(e => { const c = ccyOf(e) || '—'; (byCcy[c] = byCcy[c] || []).push(e.key); });
    const ccys = Object.keys(byCcy).map(c => {
      let a; try { a = computeAggregates(plans, grids, entries, null, null, byCcy[c]); } catch(err){ a = null; }
      return { c, a };
    }).filter(x => x.a).sort((x, y) => (y.a.totalCurrentValue + y.a.totalInvested) - (x.a.totalCurrentValue + x.a.totalInvested));
    let sel = store.get('gs_ccy', '');
    if (!ccys.find(x => x.c === sel)) sel = ccys.length ? ccys[0].c : '';

    const quick = [
      { k:'new', label:'خطة جديدة', ic:'plus', brand:true, go:() => renderPlanTypeChooser(), show: !(hidden('hide_dac_screen') && hidden('hide_grid_screen')) },
      { k:'dca', label:'خطط DCA', ic:'layers', go:() => renderPlansList(), show: !hidden('hide_dac_screen') },
      { k:'grid', label:'خطط Grid', ic:'grid', go:() => renderGridPlansList(), show: !hidden('hide_grid_screen') },
      { k:'scr', label:'الكشاف', ic:'radar', go:() => renderScreener(), show: !hidden('hide_screener_screen') },
      { k:'rep', label:'التقارير', ic:'report', go:() => renderPortfolio(), show: !hidden('hide_portfolio_screen') },
    ].filter(q => q.show);

    const rows = (all.stockRows || []).slice().sort((a, b) => {
      const o = (r) => r.status === 'مفتوحة' ? 0 : r.status === 'جديدة' ? 1 : 2;
      return o(a) - o(b) || (b.currentValue - a.currentValue);
    });

    const installCard = GS.installCardHtml();

    app.innerHTML = `<div class="container gs-home">
      <div class="gs-greet">
        <div><div class="hello">${greeting()}</div><div class="name">${esc(displayName)}</div></div>
        <button type="button" class="gs-avatar" id="gsHomeAvatar" aria-label="حسابي">${avatar ? `<img src="${esc(avatar)}" alt="">` : esc(displayName.charAt(0).toUpperCase())}</button>
      </div>
      ${installCard}
      <div class="gs-home-cols"><div class="c1">
      <div id="gsHero"></div>
      ${quick.length ? `<div class="gs-quick" style="grid-template-columns:repeat(${quick.length},1fr)">${quick.map((q, i) => `<button type="button" data-i="${i}"><span class="ic ${q.brand ? 'brand' : ''}">${icon(q.ic)}</span>${q.label}</button>`).join('')}</div>` : ''}
      <div id="gsRecs"></div>
      </div><div class="c2">
      <div class="gs-sec-head"><h2>استثماراتي</h2>${rows.length > 6 ? `<button type="button" class="gs-link" id="gsAllHold">عرض الكل (${rows.length})</button>` : ''}</div>
      <div id="gsHoldings"></div>
      <p class="disclaimer" style="margin-top:18px">الأرقام محسوبة من بيانات خططك وآخر سعر أدخلته، وليست توصية استثمارية.</p>
      </div></div>
    </div>`;

    $('#gsHomeAvatar').onclick = () => GS.renderAccount();
    document.querySelectorAll('.gs-quick button').forEach(b => b.onclick = () => quick[+b.dataset.i].go());
    GS.wireInstallCard();

    function drawHero(){
      const cur = ccys.find(x => x.c === sel);
      const hero = $('#gsHero'); if (!hero) return;
      if (!cur) {
        hero.innerHTML = `<div class="gs-hero"><div class="gs-hero-top"><span class="gs-hero-label">قيمة المحفظة</span></div>
          <div class="gs-hero-value">0.00</div><div class="gs-hero-pl">ابدأ أول خطة لسهم وهتظهر قيمة محفظتك وأرباحك هنا.</div></div>`;
        return;
      }
      const a = cur.a, code = CCY_CODE[cur.c] || cur.c;
      const pl = a.grandTotalProfit || 0, plPct = a.overallProfitPercent || 0;
      const openRows = a.stockRows.filter(r => r.status === 'مفتوحة' && r.currentValue > 0).sort((x, y) => y.currentValue - x.currentValue);
      const totalOpen = openRows.reduce((s, r) => s + r.currentValue, 0);
      const top = openRows.slice(0, 5), rest = openRows.slice(5).reduce((s, r) => s + r.currentValue, 0);
      const parts = top.map((r, i) => ({ label:r.symbol, v:r.currentValue, color:PALETTE[i] }));
      if (rest > 0) parts.push({ label:'أخرى', v:rest, color:'#64748B' });
      hero.innerHTML = `<div class="gs-hero">
        <div class="gs-hero-top">
          <span class="gs-hero-label">قيمة المحفظة الحالية</span>
          <span style="display:flex;gap:6px;align-items:center">
            ${ccys.length > 1 ? `<span class="gs-ccy">${ccys.map(x => `<button type="button" class="${x.c === sel ? 'on' : ''}" data-c="${esc(x.c)}">${esc(CCY_CODE[x.c] || x.c)}</button>`).join('')}</span>` : ''}
            <button type="button" class="gs-eye" id="gsEye" aria-label="${valuesHidden() ? 'إظهار الأرقام' : 'إخفاء الأرقام'}">${icon(valuesHidden() ? 'eyeoff' : 'eye')}</button>
          </span>
        </div>
        <div class="gs-hero-value">${mask(money(a.totalCurrentValue))}<small>${esc(code)}</small></div>
        <div class="gs-hero-pl"><span class="gs-chip ${pl >= 0 ? 'pos' : 'neg'}">${mask((pl >= 0 ? '+' : '') + money(pl))} (${pct(plPct)})</span><span>إجمالي الربح المحقق وغير المحقق</span></div>
        ${parts.length ? `<div class="gs-alloc" aria-hidden="true">${parts.map(p => `<span style="width:${(p.v / totalOpen * 100).toFixed(2)}%;background:${p.color}"></span>`).join('')}</div>
          <div class="gs-legend">${parts.map(p => `<span><i style="background:${p.color}"></i>${esc(p.label)} ${(p.v / totalOpen * 100).toFixed(0)}%</span>`).join('')}</div>` : ''}
        <div class="gs-hero-stats">
          <div>المستثمر حاليًا<b>${mask(money(a.totalInvested))}</b></div>
          <div>الربح المحقق<b class="${(a.totalRealized + a.totalClosedProfit) >= 0 ? '' : ''}">${mask(money((a.totalRealized || 0) + (a.totalClosedProfit || 0)))}</b></div>
          <div>مراكز مفتوحة<b>${a.totalOpenPositionsCount || 0} / ${a.stockRows.length}</b></div>
        </div>
      </div>`;
      hero.querySelectorAll('.gs-ccy button').forEach(b => b.onclick = () => { sel = b.dataset.c; store.set('gs_ccy', sel); drawHero(); });
      $('#gsEye').onclick = () => { store.set('gs_hide_values', valuesHidden() ? '0' : '1'); drawHero(); drawHoldings(); };
    }

    function holdingRow(r){
      const ccy = CCY_CODE[rowCcy[`${r.symbol}::${r.planType}`]] || '';
      const open = r.status === 'مفتوحة';
      const main = open ? mask(money(r.currentValue)) : (r.status === 'مغلقة' ? mask(money(r.closedProfit || 0)) : '—');
      const openPct = (r.dropPercent != null) ? r.dropPercent : (r.invested > 0 ? (r.unrealized / r.invested * 100) : null);
      const subV = open ? pct(openPct) : (r.status === 'مغلقة' ? 'ربح الصفقات المغلقة' : 'لم تبدأ بعد');
      const cls = open ? (openPct == null ? '' : openPct >= 0 ? 'pos' : 'neg') : (r.status === 'مغلقة' ? ((r.closedProfit || 0) >= 0 ? 'pos' : 'neg') : '');
      const label = r.symbol.length > 4 ? r.symbol.slice(0, 4) : r.symbol;
      return `<button type="button" class="gs-row" data-sym="${esc(r.symbol)}" data-type="${r.planType}">
        <span class="gs-sym" style="background:${symColor(r.symbol)}">${esc(label)}</span>
        <span class="gs-row-main"><b>${esc(r.symbol)}<span class="gs-pill ${r.planType === 'Grid' ? 'grid' : 'dca'}">${r.planType === 'Grid' ? 'Grid' : 'DCA'}</span></b>
          <small>${esc(r.market || '')}${r.market ? ' · ' : ''}${esc(r.status)}${ccy ? ' · ' + ccy : ''}</small></span>
        <span class="gs-row-end"><b>${main}</b><small class="${cls}">${esc(subV)}</small></span>
      </button>`;
    }
    function drawHoldings(showAll){
      const el = $('#gsHoldings'); if (!el) return;
      if (!rows.length) {
        el.innerHTML = `<div class="gs-empty"><div class="ic">${icon('trend')}</div><b>مفيش خطط لسه</b><p>أنشئ أول خطة لسهم (DCA أو Grid) وتابع متوسط التكلفة والأرباح من هنا.</p>
          ${quick.find(q => q.k === 'new') ? `<button type="button" id="gsEmptyNew">إنشاء خطة جديدة</button>` : ''}</div>`;
        const b = $('#gsEmptyNew'); if (b) b.onclick = () => renderPlanTypeChooser();
        return;
      }
      const list = showAll ? rows : rows.slice(0, 6);
      el.innerHTML = `<div class="gs-list">${list.map(holdingRow).join('')}</div>`;
      el.querySelectorAll('.gs-row').forEach(b => b.onclick = () => b.dataset.type === 'Grid' ? renderGridPlanDetail(b.dataset.sym) : renderPlanDetail(b.dataset.sym));
    }
    drawHero(); drawHoldings();
    const allBtn = $('#gsAllHold'); if (allBtn) allBtn.onclick = () => { drawHoldings(true); allBtn.remove(); };

    // آخر التوصيات
    if (!hidden('hide_recommendations_screen')) {
      getRecommendations().then(r => {
        if (GS.seq !== my) return;
        const recs = (r && r.success) ? (r.recommendations || r.items || r.rows || []) : [];
        GS.updateBell(recs);
        const box = $('#gsRecs'); if (!box || !recs.length) return;
        box.innerHTML = `<div class="gs-sec-head"><h2>أحدث التوصيات</h2><button type="button" class="gs-link" id="gsRecAll">عرض الكل</button></div>
          <div class="gs-list">${recs.slice(0, 2).map(x => `<button type="button" class="gs-row gs-rec" data-id="${esc(x.id)}">
            <span class="gs-sym" style="background:${symColor(x.symbol)}">${esc(String(x.symbol || '').slice(0, 4))}</span>
            <span class="gs-row-main"><b>${esc(x.stockName || x.symbol)}</b><small>منطقة الدخول ${esc(fmt2(x.buyFrom))} – ${esc(fmt2(x.buyTo))}</small></span>
            <span class="gs-chev">${icon('chev')}</span></button>`).join('')}</div>`;
        const go = () => { GS.markRecsSeen(); renderRecommendationsCustomerPage(); };
        $('#gsRecAll').onclick = go; box.querySelectorAll('.gs-rec').forEach(b => b.onclick = go);
      }).catch(() => {});
    }
  };

  /* =====================================================================
     شاشة حسابي
     ===================================================================== */
  GS.renderAccount = async function(){
    pushNav(() => GS.renderAccount());
    try { window.scrollTo(0, 0); } catch(e){}
    GS.seq++; GS.setTab('account'); GS.isRoot = true; GS.currentScreen = 'renderAccount';
    const my = GS.seq;
    const email = await getSession();
    if (!email) return renderLogin();
    setBackButtonVisible(false);
    const [subRes, avatar, settings] = await Promise.all([ getMySubscription().catch(() => null), GS.loadAvatar(), window.__isAdmin ? {} : getAdminSettings().catch(() => ({})) ]);
    if (GS.seq !== my) return;
    GS.settings = settings || {};
    const sub = subRes && subRes.success ? subRes.subscription : null;
    const name = sub && sub.name ? sub.name : email.split('@')[0];
    let subChip = '';
    if (window.__isAdmin) subChip = `<span class="gs-sub-chip">${window.__isSuperAdmin ? 'مدير الموقع' : 'فريق العمل'}</span>`;
    else if (sub) {
      const end = sub.endDate ? new Date(sub.endDate) : null;
      const days = end ? Math.ceil((end - new Date()) / 86400000) : null;
      subChip = sub.active
        ? `<span class="gs-sub-chip ${days != null && days <= 5 ? 'warn' : ''}">${esc(sub.planName || 'مشترك')}${days != null ? ` · متبقي ${Math.max(days, 0)} يوم` : ''}</span>`
        : `<span class="gs-sub-chip warn">بانتظار التفعيل</span>`;
    }
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const R = (id, ic, label, extra) => `<button type="button" class="gs-row ${extra || ''}" id="${id}"><span class="gs-row-ic">${icon(ic)}</span><span class="gs-row-main"><b>${label}</b></span><span class="gs-chev">${icon('chev')}</span></button>`;
    const pt = (k, f) => { try { return pageTitle(k, f); } catch(e){ return f; } };

    app.innerHTML = `<div class="container">
      <div class="gs-page-title">حسابي</div>
      <div class="gs-list"><div class="gs-profile">
        <span class="gs-avatar">${avatar ? `<img src="${esc(avatar)}" alt="">` : esc(name.charAt(0).toUpperCase())}</span>
        <span style="min-width:0"><b>${esc(name)}</b><small>${esc(email)}</small><br>${subChip}</span>
      </div>${R('gsAccProfile','user','الملف الشخصي والصورة')}</div>

      <div class="gs-list-title">الاشتراك</div>
      <div class="gs-list">
        ${R('gsAccSub','card','الباقات وتجديد الاشتراك')}
        ${!hidden('hide_sub_history_screen') ? R('gsAccHist','receipt','سجل اشتراكي') : ''}
        ${!hidden('hide_referral_screen') ? R('gsAccRef','gift','ادعُ صديقك واكسب أيامًا مجانية') : ''}
      </div>

      <div class="gs-list-title">الأدوات</div>
      <div class="gs-list">
        ${!hidden('hide_recommendations_screen') ? R('gsAccRec','megaphone','التوصيات') : ''}
        ${!hidden('hide_grid_screen') ? R('gsAccGrid','grid','خطط الشبكة (Grid)') : ''}
        ${!hidden('hide_portfolio_screen') ? R('gsAccDiv','target','تقرير التنويع') : ''}
        ${!hidden('hide_screener_screen') ? R('gsAccScr','radar','كشاف الأسهم') : ''}
      </div>

      ${window.__isAdmin ? `<div class="gs-list-title">الإدارة</div><div class="gs-list">${R('gsAccAdmin','admin','لوحة التحكم')}</div>` : ''}

      <div class="gs-list-title">المظهر</div>
      <div class="gs-list"><label class="gs-row" style="cursor:pointer;margin:0">
        <span class="gs-row-ic">${icon('moon')}</span><span class="gs-row-main"><b>الوضع الليلي</b></span>
        <span class="gs-switch"><input type="checkbox" id="gsDarkSwitch" ${dark ? 'checked' : ''} aria-label="الوضع الليلي"><span></span></span>
      </label></div>

      <div class="gs-list-title">عن GRIFFINE</div>
      <div class="gs-list">
        ${R('gsAccAbout','info', esc(pt('about_page','عن GRIFFINE')))}
        ${R('gsAccContact','phone', esc(pt('contact_info','تواصل معنا')))}
        ${!hidden('hide_articles_screen') ? R('gsAccArt','news', esc(pt('articles_list','مقالات'))) : ''}
        ${!hidden('hide_testimonials_screen') ? R('gsAccTesti','star', esc(pt('testimonials','آراء العملاء'))) : ''}
        ${!hidden('hide_suggestions_screen') ? R('gsAccSug','bulb', esc(pt('suggestions_page','شاركنا مقترحاتك'))) : ''}
        ${R('gsAccRefund','refund', esc(pt('refund_policy_page','سياسة استرداد الاشتراك')))}
        ${R('gsAccDisc','shield','إخلاء المسؤولية')}
        ${R('gsAccPriv','lock','سياسة الخصوصية')}
      </div>

      <div class="gs-list" style="margin-top:22px">${R('gsAccLogout','logout','تسجيل الخروج','danger')}</div>
      ${window.__isSuperAdmin ? '' : `<div class="gs-list" style="margin-top:12px">${R('gsAccDelete','x','حذف الحساب نهائيًا','danger')}</div>`}
      <div class="gs-version">GRIFFINE · الإصدار 70</div>
    </div>`;

    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
    on('gsAccProfile', () => renderProfilePage());
    on('gsAccSub', () => renderSubscriptionPlans());
    on('gsAccHist', () => renderMySubscriptionHistory());
    on('gsAccRef', () => renderReferralPage());
    on('gsAccRec', () => { GS.markRecsSeen(); renderRecommendationsCustomerPage(); });
    on('gsAccGrid', () => renderGridPlansList());
    on('gsAccDiv', () => renderDiversificationReport());
    on('gsAccScr', () => renderScreener());
    on('gsAccAdmin', () => renderAdminSubscribers());
    on('gsAccAbout', () => renderAboutPage());
    on('gsAccContact', () => renderContactInfo());
    on('gsAccArt', () => renderArticlesListPage());
    on('gsAccTesti', () => renderTestimonialsPage());
    on('gsAccSug', () => renderSuggestionsPage());
    on('gsAccRefund', () => renderRefundPolicyPage());
    on('gsAccDisc', () => renderDisclaimerPage({ backTo: () => GS.renderAccount() }));
    on('gsAccPriv', () => renderPrivacyPolicyPage());
    on('gsAccLogout', async () => { if (confirm('تسجيل الخروج من GRIFFINE؟')) GS.logout(); });
    on('gsAccDelete', () => GS.renderDeleteAccount());
    const sw = $('#gsDarkSwitch'); if (sw) sw.onchange = () => GS.toggleTheme();
  };

  /* =====================================================================
     حذف الحساب (متطلب Google Play: مسار داخل التطبيق + رابط ويب index.php?page=delete-account)
     ===================================================================== */
  GS.renderDeleteAccount = async function(){
    pushNav(() => GS.renderDeleteAccount());
    try { window.scrollTo(0, 0); } catch(e){}
    GS.seq++; GS.setTab('account'); GS.isRoot = false; GS.currentScreen = 'renderDeleteAccount';
    const email = await getSession();
    if (!email) { window.__afterLoginTarget = 'deleteAccount'; return renderLogin(); }
    app.innerHTML = `<div class="container">
      <div class="gs-page-title">حذف الحساب</div>
      <div class="error" style="line-height:1.8">الحذف نهائي ومينفعش يرجع. هيتمسح حسابك <b dir="ltr">${esc(email)}</b> وكل خططك (DCA وGrid) وصفقاتك المغلقة وصورتك الشخصية ومقترحاتك ومحادثاتك.</div>
      <div class="section-card" style="font-size:14px;line-height:1.9">
        <b>اللي بيفضل محفوظ (مطلوب قانونيًا ومحاسبيًا):</b><br>
        سجل الاشتراكات والمبالغ المدفوعة بدون اسمك أو رقمك، وسجل موافقتك على إخلاء المسؤولية.<br>
        لو عندك اشتراك مدفوع شغال، الحذف مش بيرجّع قيمته تلقائيًا — راجع سياسة الاسترداد قبل الحذف.
      </div>
      <form id="gsDelForm">
        <label for="gsDelPw">كلمة المرور</label>
        <input type="password" id="gsDelPw" autocomplete="current-password" required dir="ltr">
        <label for="gsDelConfirm">اكتب كلمة «حذف» للتأكيد</label>
        <input type="text" id="gsDelConfirm" required autocomplete="off">
        <div id="gsDelMsg" style="margin-top:10px"></div>
        <button type="submit" class="danger" id="gsDelBtn" style="margin-top:14px">حذف حسابي نهائيًا</button>
      </form>
      <button type="button" class="secondary" id="gsDelCancel" style="margin-top:10px">إلغاء والرجوع</button>
    </div>`;
    document.getElementById('gsDelCancel').onclick = () => GS.renderAccount();
    document.getElementById('gsDelForm').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('gsDelBtn'), msg = document.getElementById('gsDelMsg');
      const confirmWord = document.getElementById('gsDelConfirm').value.trim();
      if (confirmWord !== 'حذف') { msg.innerHTML = '<div class="error">اكتب كلمة «حذف» بالظبط للتأكيد.</div>'; return; }
      btn.disabled = true; btn.textContent = 'جاري الحذف...';
      let r; try { r = await apiPost('/account_delete.php', { password: document.getElementById('gsDelPw').value, confirm: confirmWord }); } catch(err){ r = { success:false, message:'تعذّر الاتصال بالسيرفر.' }; }
      if (!r || !r.success) { msg.innerHTML = `<div class="error">${esc((r && r.message) || 'تعذّر الحذف.')}</div>`; btn.disabled = false; btn.textContent = 'حذف حسابي نهائيًا'; return; }
      try { ['griffine_remembered_email','griffine_plans:'+email,'griffine_grid_plans:'+email,'griffine_subscription:'+email].forEach(k => localStorage.removeItem(k)); } catch(err){}
      GS._avatar = undefined;
      invalidateSessionCache();
      window.__screens = []; window.__screenIndex = -1;
      await refreshTopNav();
      GS.toast('تم حذف حسابك وبياناتك نهائيًا.', 'ok');
      renderPublicHome();
    };
  };

  /* =====================================================================
     طباعة صور كل الشاشات في ملف PDF واحد (من لوحة التحكم)
     بيفتح كل شاشة بالترتيب، يصوّرها بالشكل الحالي (فاتح/ليلي، موبايل/كمبيوتر)، ويجمعهم في PDF
     ===================================================================== */
  function loadScript(src){
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('تعذّر تحميل ' + src)); document.head.appendChild(s); });
  }
  GS.exportScreensPdf = async function(){
    if (GS._exporting) return;
    const L = [
      ['— الشاشات العامة —'],
      ['شاشة الترحيب', 'renderPublicHome'], ['تسجيل الدخول', 'renderLogin'], ['إنشاء حساب', 'renderRegister'], ['نسيت كلمة المرور', 'renderForgotPassword'],
      ['الباقات والأسعار (للزوار)', 'renderPublicPricing'],
      ['— شاشات العميل —'],
      ['الرئيسية', 'renderHome'], ['خطط DCA', 'renderPlansList'], ['خطط Grid', 'renderGridPlansList'], ['اختيار نوع الخطة', 'renderPlanTypeChooser'],
      ['خطة DCA جديدة', 'renderNewPlanForm'], ['خطة Grid جديدة', 'renderGridPlanForm'], ['ملخص المحفظة', 'renderPortfolio'], ['تقرير التنويع', 'renderDiversificationReport'],
      ['كشاف الأسهم', 'renderScreener'], ['التوصيات', 'renderRecommendationsCustomerPage'], ['حسابي', 'GS:renderAccount'], ['الملف الشخصي', 'renderProfilePage'],
      ['الاشتراك والباقات', 'renderSubscriptionPlans'], ['سجل اشتراكي', 'renderMySubscriptionHistory'], ['ادعُ صديقك', 'renderReferralPage'],
      ['عن GRIFFINE', 'renderAboutPage'], ['تواصل معنا', 'renderContactInfo'], ['مقالات', 'renderArticlesListPage'], ['آراء العملاء', 'renderTestimonialsPage'],
      ['شاركنا مقترحاتك', 'renderSuggestionsPage'], ['سياسة الاسترداد', 'renderRefundPolicyPage'], ['إخلاء المسؤولية', 'renderDisclaimerPage'], ['سياسة الخصوصية', 'renderPrivacyPolicyPage'],
      ['— لوحة التحكم —'],
      ['لوحة التحكم', 'renderAdminHub'], ['المشتركون', 'renderAdminSubscribers'], ['التقارير', 'renderAdminReportsPage'], ['الإعدادات الإلزامية', 'renderAdminSettingsPage'],
      ['الفريق والصلاحيات', 'renderStaffManagementPage'], ['القائمة السوداء', 'renderBlacklist'], ['إدارة الباقات', 'renderPlansManagementPage'],
      ['توصيات الشراء (إدارة)', 'renderRecommendationsAdminPage'], ['الدردشة الفورية (إدارة)', 'renderChatAdminPage'], ['تنسيق الموقع', 'renderSiteDesignPage'],
      ['نصوص الشاشات', 'renderSiteTextsAdminPage'], ['آراء العملاء والمقالات (إدارة)', 'renderContentAdminPage'], ['مقترحات العملاء (إدارة)', 'renderSuggestionsAdminPage'], ['الأرشيف', 'renderArchivedCustomers'],
    ];
    const list = L.filter(x => x.length === 1 || (x[1].startsWith('GS:') ? typeof GS[x[1].slice(3)] === 'function' : typeof window[x[1]] === 'function'));
    const total = list.filter(x => x.length > 1).length;
    if (!confirm(`هيتم فتح ${total} شاشة وتصويرها واحدة واحدة وتجميعها في ملف PDF.\nالعملية بتاخد حوالي دقيقة - متقفلش الصفحة.\n\nالصور هتطلع بالشكل الحالي (${document.documentElement.getAttribute('data-theme') === 'dark' ? 'الوضع الليلي' : 'الوضع النهاري'}، ${window.innerWidth < 1024 ? 'موبايل' : 'كمبيوتر'}).`)) return;
    GS._exporting = true;
    document.documentElement.classList.add('gs-exporting');
    const ov = document.createElement('div');
    ov.id = 'gsExportOverlay'; ov.setAttribute('data-html2canvas-ignore', 'true');
    ov.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(2,6,12,.72);display:flex;align-items:center;justify-content:center;color:#fff;font:600 16px/1.8 inherit;text-align:center;padding:24px';
    ov.innerHTML = '<div><div id="gsExportTxt">جاري تحميل أدوات الطباعة...</div><div style="margin-top:12px;width:260px;height:6px;border-radius:3px;background:rgba(255,255,255,.2);overflow:hidden"><div id="gsExportBar" style="height:100%;width:0;background:#D4AF37;transition:width .2s"></div></div></div>';
    document.body.appendChild(ov);
    const setTxt = (t, p) => { const e = document.getElementById('gsExportTxt'); if (e) e.textContent = t; const b = document.getElementById('gsExportBar'); if (b && p != null) b.style.width = p + '%'; };
    const origAlert = window.alert; window.alert = () => {};
    const origConfirm = window.confirm; 
    try {
      if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      if (!window.jspdf) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      window.confirm = () => false; // أي تأكيد بيظهر من شاشة أثناء التصوير بيتلغي تلقائيًا
      const { jsPDF } = window.jspdf;
      let pdf = null, done = 0, section = '';
      const bg = getComputedStyle(document.body).backgroundColor || '#ffffff';
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      for (const item of list) {
        if (item.length === 1) { section = item[0].replace(/—/g, '').trim(); continue; }
        const [label, fnName] = item;
        done++; setTxt(`جاري تصوير الشاشة ${done} من ${total}: ${label}`, Math.round(done / total * 100));
        window.__navSilent = true;
        try {
          const fn = fnName.startsWith('GS:') ? GS[fnName.slice(3)] : window[fnName];
          await Promise.race([Promise.resolve(fn()), new Promise(r => setTimeout(r, 6000))]);
        } catch(e){ /* شاشة فشلت - نكمل الباقي */ }
        finally { window.__navSilent = false; }
        await new Promise(r => setTimeout(r, 1100));
        window.scrollTo(0, 0);
        document.querySelectorAll('.gs-toast').forEach(t => t.remove());
        let shot;
        try {
          shot = await html2canvas(document.body, { backgroundColor: bg, scale: 1.5, useCORS: true, logging: false,
            windowWidth: document.documentElement.clientWidth, height: Math.min(document.documentElement.scrollHeight, 9000),
            ignoreElements: (el) => el.id === 'gsExportOverlay' || el.id === 'chatBubble' || el.tagName === 'IFRAME' });
        } catch(e){ console.warn('screen capture failed:', label, e && e.message); continue; }
        // شريط عنوان فوق كل صورة (اسم الشاشة + القسم)
        const head = 64 * 1.5, c = document.createElement('canvas');
        c.width = shot.width; c.height = shot.height + head;
        const g = c.getContext('2d');
        g.fillStyle = dark ? '#111923' : '#0F172A'; g.fillRect(0, 0, c.width, head);
        g.fillStyle = '#D4AF37'; g.fillRect(0, head - 4, c.width, 4);
        g.direction = 'rtl'; g.textAlign = 'right'; g.fillStyle = '#FFFFFF';
        g.font = `700 ${Math.round(22 * 1.5)}px "IBM Plex Sans Arabic", Tahoma, sans-serif`;
        g.fillText(`${done}. ${label}`, c.width - 24, head * 0.45);
        g.font = `500 ${Math.round(13 * 1.5)}px "IBM Plex Sans Arabic", Tahoma, sans-serif`; g.fillStyle = 'rgba(255,255,255,.7)';
        g.fillText(`${section} · GRIFFINE`, c.width - 24, head * 0.8);
        g.drawImage(shot, 0, head);
        const wmm = 210, hmm = Math.min(Math.round(c.height * wmm / c.width), 5000);
        const img = c.toDataURL('image/jpeg', 0.82);
        if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [wmm, hmm], orientation: hmm >= wmm ? 'portrait' : 'landscape', compress: true });
        else pdf.addPage([wmm, hmm], hmm >= wmm ? 'portrait' : 'landscape');
        pdf.addImage(img, 'JPEG', 0, 0, wmm, hmm, undefined, 'FAST');
      }
      if (!pdf) throw new Error('مفيش شاشات اتصورت');
      setTxt('جاري حفظ الملف...', 100);
      pdf.save(`griffine-screens-${new Date().toISOString().slice(0, 10)}.pdf`);
      GS.toast(`تم حفظ ملف PDF بصور ${done} شاشة`, 'ok');
    } catch(e){
      GS.toast('تعذّر إنشاء ملف PDF: ' + (e && e.message ? e.message : e), 'err');
    } finally {
      window.alert = origAlert; window.confirm = origConfirm;
      ov.remove(); GS._exporting = false; document.documentElement.classList.remove('gs-exporting');
      try { renderAdminHub(); } catch(e){}
    }
  };

  /* قائمة الزائر (قبل تسجيل الدخول) */
  GS.openPublicMenu = function(){
    const pt = (k, f) => { try { return pageTitle(k, f); } catch(e){ return f; } };
    const items = [
      ['login','تسجيل الدخول / إنشاء حساب', () => openLoginModal ? openLoginModal() : renderLogin()],
      ['card','الباقات والأسعار', () => renderPublicPricing()],
      ['info', pt('about_page','عن GRIFFINE'), () => renderAboutPage()],
      ['phone', pt('contact_info','تواصل معنا'), () => renderContactInfo()],
      ['news', pt('articles_list','مقالات'), () => renderArticlesListPage()],
      ['bulb', pt('suggestions_page','شاركنا مقترحاتك'), () => renderSuggestionsPage()],
      ['refund', pt('refund_policy_page','سياسة استرداد الاشتراك'), () => renderRefundPolicyPage()],
      ['shield','إخلاء المسؤولية', () => renderDisclaimerPage()],
    ];
    GS.sheet('القائمة', `<div class="gs-list">${items.map((it, i) => `<button type="button" class="gs-row" data-i="${i}"><span class="gs-row-ic">${icon(it[0])}</span><span class="gs-row-main"><b>${esc(it[1])}</b></span><span class="gs-chev">${icon('chev')}</span></button>`).join('')}</div>`,
      (sh) => sh.querySelectorAll('.gs-row').forEach(b => b.onclick = () => { GS.closeSheet(); items[+b.dataset.i][2](); }));
  };

  /* =====================================================================
     التثبيت كتطبيق (PWA)
     ===================================================================== */
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  GS.installCardHtml = function(){
    if (isStandalone() || store.get('gs_install_dismissed', '0') === '1') return '';
    if (!GS.deferredInstall && !isIOS()) return '';
    return `<div class="gs-install" id="gsInstall"><img src="icon-192.png" alt=""><div class="t"><b>ثبّت تطبيق GRIFFINE ${window.innerWidth >= 1024 ? 'على جهازك' : 'على موبايلك'}</b>${isIOS() && !GS.deferredInstall ? 'من زر المشاركة اختر «إضافة إلى الشاشة الرئيسية»' : 'افتحه بضغطة واحدة زي أي تطبيق'}</div>
      ${GS.deferredInstall ? `<button type="button" id="gsInstallBtn">تثبيت</button>` : ''}<button type="button" class="x gs-iconbtn" id="gsInstallX" aria-label="إخفاء">${icon('x')}</button></div>`;
  };
  GS.wireInstallCard = function(){
    const b = $('#gsInstallBtn'), x = $('#gsInstallX');
    if (b) b.onclick = async () => { const p = GS.deferredInstall; if (!p) return; p.prompt(); try { await p.userChoice; } catch(e){} GS.deferredInstall = null; const c = $('#gsInstall'); if (c) c.remove(); };
    if (x) x.onclick = () => { store.set('gs_install_dismissed', '1'); const c = $('#gsInstall'); if (c) c.remove(); };
  };
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); GS.deferredInstall = e; });
  window.addEventListener('appinstalled', () => { GS.deferredInstall = null; const c = $('#gsInstall'); if (c) c.remove(); GS.toast('تم تثبيت GRIFFINE على جهازك', 'ok'); });

  function registerSW(){
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  /* =====================================================================
     التشغيل
     ===================================================================== */
  GS.init = function(email){
    if (GS.enabled) return;
    GS.enabled = true;
    GS.email = email || null;
    document.body.classList.add('g-shell');
    buildChrome();
    wrapRenderers();
    // alert → Toast (نفس الرسالة بس من غير ما توقف الشاشة)
    window.__nativeAlert = window.alert.bind(window);
    window.alert = (m) => GS.toast(m);
    const appEl = document.getElementById('app');
    // شاشات الترحيب/الدخول الكاملة بتتعرف فورًا (قبل الرسم) عشان تنسيقات الشاشات الداخلية متلمسهاش
    const syncFull = () => { if (appEl) document.body.classList.toggle('gs-no-shell', !!appEl.querySelector('.wl-screen, .gl-screen')); };
    if (appEl) new MutationObserver(() => { syncFull(); scheduleProcess(); }).observe(appEl, { childList:true, subtree:true });
    syncFull();
    window.addEventListener('scroll', onScroll, { passive:true });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') GS.closeSheet(); });
    registerSW();
    // اختصارات أيقونة التطبيق (ضغطة مطوّلة على الأيقونة): ?go=new أو ?go=portfolio
    try {
      const qs = new URLSearchParams(location.search);
      const go = qs.get('go'); if (go === 'new' || go === 'portfolio') window.__afterLoginTarget = go;
      if (qs.get('page') === 'delete-account') window.__afterLoginTarget = 'deleteAccount';
    } catch(e){}
  };
})();
