/* =====================================================================
   GRIFFINE — app-public.js (الإصدار 88) — الشاشات العامة + الدخول وإنشاء الحساب + الرئيسية + إخلاء المسؤولية
   (اتفصل من griffine.js - كل الملفات بتتحمّل بالترتيب في index.php وبتشارك نفس المتغيرات العامة)
   ===================================================================== */
/* ================== تسجيل الدخول / الحساب ================== */
/* ================== الصفحة الرئيسية العامة - أي زائر يقدر يتصفحها من غير حساب ================== */
// بيرجّع خلفية الشاشة المرفوعة من الأدمن (تنسيق الموقع) لو موجودة، وإلا الصورة الافتراضية المدمجة
function screenBgOr(key, fallbackUrl){
  const pv = window.__pageBackgroundsPreview;
  if (pv && Object.prototype.hasOwnProperty.call(pv, key)) return pv[key] || fallbackUrl;
  const v = window.__pageBackgrounds && window.__pageBackgrounds[key];
  return v || fallbackUrl;
}
// الشعار الفرعي اللي بيظهر فوق صورة الجريفين في شاشتي الترحيب والدخول (نص حقيقي قابل للتعديل من الأدمن)
function appMottoHtml(){
  return `<div class="ap-motto">${pageTitle('public_home_motto','الانضباط يحسب لك الحرية')}</div>`;
}

async function renderPublicHome(){
  // الإصدار 108: صفحة اللاندينج بدل شاشة الترحيب (لو الأدمن مشغّلها من لوحة التحكم ← «صفحة اللاندينج»)
  if (typeof gLandingShouldShow === 'function' && typeof renderLanding === 'function' && await gLandingShouldShow()) return renderLanding();
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderPublicHome());
  setBottomNavActive('home');
  setBackButtonVisible(false);

  const svg = (inner) => `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  // كل أيقونة بتفتح الأداة الحقيقية في الموقع (بعد تسجيل الدخول لو الزائر بعد مسجّلش)
  const tiles = [
    { act:'screener',  title:'نمِّ',  sub:'بثقة',           icon: svg('<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>') },
    { act:'dac',       title:'خطط',  sub:'بنظام DCA',      icon: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>') },
    { act:'grid',      title:'احسب', sub:'البيع والشراء',  icon: svg('<rect x="5" y="3" width="14" height="18" rx="2.5"/><rect x="8" y="6" width="8" height="3" rx=".6"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01" stroke-width="2.4"/>') },
    { act:'portfolio', title:'تابع', sub:'محفظتك',         icon: svg('<rect x="4" y="12" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="16" y="4" width="4" height="16" rx="1"/>') },
  ];
  const globe = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z"/></svg>';
  const arrow = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  const extra = siteHeroHtml();
  if (screenStale(__tok)) return; app.innerHTML = `<div class="wl-screen">
    <div class="wl-main">
      <div class="wl-lang"><span>العربية</span>${globe}</div>
      <div class="wl-logo"><img src="${griffineLogoSrc()}" alt="GRIFFINE"><div class="wl-wordmark">GRIFFINE</div></div>
      <div class="wl-tagline">${pageTitle('public_home_tagline','قرارات أذكى. محافظ أقوى.')}</div>
      <div class="wl-tiles">
        ${tiles.map(t => `<button type="button" class="wl-tile" data-act="${t.act}"><span class="wl-tile-ico">${t.icon}</span><span class="wl-tile-t">${escapeHtml(t.title)}</span><span class="wl-tile-s">${t.sub}</span></button>`).join('')}
      </div>
    </div>
    <div class="wl-art ${window.__pageBackgrounds && window.__pageBackgrounds['splash'] ? 'wl-custom' : ''}">
      ${window.__pageBackgrounds && window.__pageBackgrounds['splash']
        ? `<img src="${escapeHtml(window.__pageBackgrounds['splash'])}" alt="" draggable="false">`
        : `<picture><source media="(min-width:1024px)" srcset="login_hero.webp"><img src="welcome_hero.webp" alt="" draggable="false"></picture>`}
      ${appMottoHtml()}
    </div>
    <div class="wl-cta">
      <button type="button" class="wl-start" id="splashStartBtn">${arrow}<span>ابدأ الآن</span></button>
      <div class="wl-cap">لمستقبل مالي أفضل</div>
      <div class="wl-login">عندك حساب بالفعل؟ <a id="splashLoginLink">سجل دخول</a></div>
    </div>
  </div>${extra ? `<div class="container u-mt0">${extra}</div>` : ''}`;

  document.getElementById('splashStartBtn').onclick = () => renderRegister();
  document.getElementById('splashLoginLink').onclick = () => renderLogin();
  document.querySelectorAll('.wl-tile').forEach(btn => {
    btn.onclick = async () => {
      window.__afterLoginTarget = btn.dataset.act;
      const email = await getSession();
      if (email) postLoginRedirect(email); else renderLogin();
    };
  });
}

// صفحة تعريفية عامة بفكرة "خطط تعزيز المتوسط" - للزوار قبل ما يسجّلوا حساب
async function renderPublicPlansInfo(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderPublicPlansInfo());
  window.__lastPageKey='public_plans_info'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <h2>📈 خطط تعزيز متوسط الأسهم</h2>
    <div class="section-card">
      <p style="font-size:13.5px;color:#444;line-height:1.8;">
        تساعدك خطة تعزيز المتوسط على إدارة شراء سهم على مستويات سعرية متدرجة بدلًا من شراء الكمية كلها بسعر واحد — كلما انخفض السعر إلى مستوى محدد، تشتري كمية إضافية، وهذا يقلل متوسط سعر شرائك الإجمالي.
      </p>
      <ul style="font-size:13px;color:#555;padding-right:18px;line-height:2;">
        <li>تحدد أنت مستويات الشراء ومقدار كل دفعة</li>
        <li>يحسب الموقع متوسط السعر والكمية الإجمالية تلقائيًا أولًا بأول</li>
        <li>تتابع حالة كل خطة (شغالة / مكتملة / مقفولة) من مكان واحد</li>
        <li>يمكنك تحديد نقاط بيع وخروج بنسب مختلفة عند كل مستوى مقاومة</li>
      </ul>
    </div>
    <button id="plansInfoRegisterBtn" class="btn-active">✨ إنشاء حساب مجاني وابدأ خطتك</button>
  </div>`;
  document.getElementById('plansInfoRegisterBtn').onclick=()=>renderRegister();
}

// لأي زائر مسجّلش دخول بعد ويحاول يستخدم أداة فعلية (يحسب في الكشاف، يعمل خطة، يشترك) - بدل ما نرفض بصمت، نوجهه بلطف للتسجيل
function promptSignupToContinue(message, backFn){
  app.innerHTML = `<div class="container">${logoHeader()}
    <h2>سجّل حساب مجاني للمتابعة</h2>
    <div class="info">${message || 'يجب أن يكون لديك حساب لتتمكن من استخدام هذه الأداة.'}</div>
    <button id="promptRegisterBtn" class="btn-active">✨ إنشاء حساب مجاني</button>
    <button id="promptLoginBtn" class="secondary">عندي حساب بالفعل - تسجيل الدخول</button>
    <button id="promptBackBtn" class="btn-gray">رجوع</button>
  </div>`;
  document.getElementById('promptRegisterBtn').onclick=()=>renderRegister();
  document.getElementById('promptLoginBtn').onclick=()=>openLoginModal();
  document.getElementById('promptBackBtn').onclick=()=>{ if (backFn) backFn(); else renderPublicHome(); };
}

// نسخة عامة من صفحة الباقات - أي زائر يقدر يشوف الأسعار، وزرار "اشترك" بيوديه يسجّل حساب الأول
async function renderPublicPricing(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderPublicPricing());
  const email = await getSession();
  if (email) return renderSubscriptionPlans();

  const res = await getPlansList();
  const plans = (res && res.success) ? res.plans : [];

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>${pageTitle('public_pricing','الباقات والأسعار')}</div><button class="secondary small" id="pubBackBtn">🏠 الرئيسية</button></div>
    <div class="pricing-grid">
      ${plans.map(p=>`<div class="price-card ${p.badge?'featured':''}">
        ${p.badge?`<div class="price-badge">${escapeHtml(p.badge)}</div>`:''}
        <div class="price-plan-name">${escapeHtml(p.name)}</div>
        <div class="price-amount">${p.amount===0?'مجانًا':fmtMoney(p.amount)}<span> / ${escapeHtml(p.periodLabel)}</span></div>
        ${p.saveNote?`<div class="price-save">${escapeHtml(p.saveNote)}</div>`:''}
        <ul class="price-features">${(p.features||[]).map(f=>`<li>${escapeHtml(f)}</li>`).join('')}</ul>
        <button class="btn-active" data-gcall="renderRegister">اشترك الآن</button>
      </div>`).join('')}
    </div>
    <p class="disclaimer">سجّل حسابًا مجانيًا أولًا لتتمكن من الاشتراك في أي باقة.</p>
  </div>`;
  document.getElementById('pubBackBtn').onclick=()=>renderPublicHome();
}

/* ================== آراء العملاء - عرض عام + إضافة لأي عميل مسجّل دخول ================== */
async function renderTestimonialsPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderTestimonialsPage());
  const email = await getSession();
  const res = await getTestimonials();
  const items = (res && res.success) ? res.testimonials : [];

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>${pageTitle('testimonials','⭐ آراء العملاء')}</div><button class="secondary small" id="testiBackBtn">🏠 الرئيسية</button></div>

    ${email ? `
    <div class="section-card">
      <h3 class="u-mt0">شاركنا رأيك</h3>
      <label>اسمك (سيظهر مع رأيك)</label>
      <input type="text" id="testiName" maxlength="100" placeholder="مثال: أحمد م.">
      <label>التقييم</label>
      <select id="testiRating">
        <option value="5">⭐⭐⭐⭐⭐ ممتاز</option>
        <option value="4">⭐⭐⭐⭐ جيد جدًا</option>
        <option value="3">⭐⭐⭐ جيد</option>
        <option value="2">⭐⭐ مقبول</option>
        <option value="1">⭐ ضعيف</option>
      </select>
      <label>تعليقك (حد أقصى 500 حرف)</label>
      <textarea id="testiComment" rows="3" maxlength="500"></textarea>
      <button id="testiSubmitBtn" class="u-mt10">إرسال</button>
      <div id="testiResult"></div>
    </div>` : `<div class="info">سجّل حسابًا مجانيًا لتتمكن من إضافة رأيك.</div>`}

    <h2 class="u-mt20">آراء موجودة</h2>
    <div id="testiListWrap"></div>
  </div>`;
  document.getElementById('testiBackBtn').onclick=()=>{ email ? renderHome() : renderPublicHome(); };

  function renderList(list){
    document.getElementById('testiListWrap').innerHTML = list.length ? list.map(t=>`
      <div class="section-card u-mb10">
        <div>${'⭐'.repeat(t.rating)}</div>
        <div style="font-size:13.5px;color:#444;margin:6px 0;">"${escapeHtml(t.comment)}"</div>
        <div class="u-hint">— ${escapeHtml(t.displayName)} · ${formatDateAr(t.createdAt)}</div>
        ${window.__isAdmin && hasPermission('manage_testimonials') ? `<button class="small danger" style="width:auto;margin-top:6px;" data-gcall="__deleteTesti" data-gargs="${gArgs([String(t.id)])}">حذف</button>` : ''}
      </div>`).join('') : '<p class="u-note">لا توجد لدينا آراء منشورة بعد.</p>';
  }
  renderList(items);

  window.__deleteTesti = async (id) => {
    if (!await gConfirm('هل أنت متأكد من حذف هذا الرأي؟')) return;
    const r = await deleteTestimonial(id);
    if (r.success) { const fresh = await getTestimonials(); renderList(fresh.success ? fresh.testimonials : []); }
    else alert(r.message || 'حصل خطأ');
  };

  if (email) {
    document.getElementById('testiSubmitBtn').onclick = async () => {
      const name = document.getElementById('testiName').value.trim();
      const rating = document.getElementById('testiRating').value;
      const comment = document.getElementById('testiComment').value.trim();
      const r = await addTestimonial(name, rating, comment);
      const resultEl = document.getElementById('testiResult');
      if (r.success) {
        resultEl.innerHTML = '<div class="info u-mt8">✅ شكرًا لمشاركة رأيك.</div>';
        document.getElementById('testiName').value = ''; document.getElementById('testiComment').value = '';
        const fresh = await getTestimonials();
        renderList(fresh.success ? fresh.testimonials : []);
      } else {
        resultEl.innerHTML = `<div class="error u-mt8">${r.message || 'حصل خطأ'}</div>`;
      }
    };
  }
}

/* ================== مقالات (محتوى تسويقي/SEO) - عرض عام ================== */
async function renderArticlesListPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderArticlesListPage());
  const email = await getSession();
  const res = await getArticles();
  const articles = (res && res.success) ? res.articles : [];

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>${pageTitle('articles_list','📰 مقالات')}</div><button class="secondary small" id="artBackBtn">🏠 الرئيسية</button></div>
    ${articles.length ? articles.map(a=>`
      <div class="section-card" style="margin-bottom:10px;cursor:pointer;" data-gcall="__openArticle" data-gargs="${gArgs([String(a.slug)])}">
        <strong style="color:var(--green-dark);">${escapeHtml(a.title)}</strong>
        <div style="font-size:12.5px;color:#666;margin-top:4px;">${escapeHtml(a.summary || '')}</div>
        <div style="font-size:11px;color:#888;margin-top:4px;">${formatDateAr(a.createdAt)}</div>
      </div>`).join('') : '<p class="u-note">لا توجد لدينا مقالات منشورة بعد.</p>'}
  </div>`;
  document.getElementById('artBackBtn').onclick=()=>{ email ? renderHome() : renderPublicHome(); };
  window.__openArticle = (slug) => renderArticleDetailPage(slug);
}

async function renderArticleDetailPage(slug){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderArticleDetailPage(slug));
  const email = await getSession();
  const res = await getArticle(slug);
  if (!res || !res.success) {
    if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}<div class="error">المقال غير موجود.</div><button id="artNotFoundBackBtn" class="secondary">رجوع</button></div>`;
    document.getElementById('artNotFoundBackBtn').onclick=()=>renderArticlesListPage();
    return;
  }
  const a = res.article;
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>${pageTitle('article_detail','📰 مقال')}</div><button class="secondary small" id="artDetailBackBtn">رجوع للمقالات</button></div>
    <h2>${escapeHtml(a.title)}</h2>
    <div style="font-size:11px;color:#888;margin-bottom:10px;">${formatDateAr(a.createdAt)}</div>
    <div class="section-card" style="white-space:pre-wrap;line-height:1.9;font-size:14px;"></div>
  </div>`;
  app.querySelector('.section-card').textContent = a.body;
  document.getElementById('artDetailBackBtn').onclick=()=>renderArticlesListPage();
}

function closeLoginModal(){
  const el = document.getElementById('loginModalOverlay');
  if (el) el.remove();
}
// تسجيل الدخول دلوقتي بيبدأ من الشاشة الجديدة — النافذة المنبثقة القديمة اتلغت
/* ================== شاشات الدخول وإنشاء الحساب (تصميم موحّد - الإصدار 69) ==================
   كل الشاشات دي بنفس الشكل: صورة الغلاف فوق، الشعار، العنوان، والنموذج - وبتملى الشاشة من غير سكرول على الموبايل */
const AUTH_ICONS = {
  back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  mail: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7.5 8.5 6 8.5-6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="11" width="15" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg>',
  eye: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
};
function authScreen(o){
  const custom = window.__pageBackgrounds && window.__pageBackgrounds['login'];
  const pv = window.__pageBackgroundsPreview;
  const heroSrc = (pv && Object.prototype.hasOwnProperty.call(pv, 'login') && pv.login) || custom || 'login_hero.webp';
  const isCustom = heroSrc !== 'login_hero.webp';
  return `<div class="gl-screen gl-auth ${isCustom ? 'gl-custom-bg' : ''}">
    ${o.back ? `<button type="button" class="gl-back" id="glBackBtn" aria-label="رجوع">${AUTH_ICONS.back}</button>` : ''}
    <div class="gl-hero"><img src="${escapeHtml(heroSrc)}" alt="" draggable="false">${isCustom ? '' : appMottoHtml()}</div>
    <div class="gl-body">
      <div class="gl-logo"><img src="${griffineLogoSrc()}" alt="GRIFFINE"><div class="gl-wordmark">GRIFFINE</div></div>
      <h1 class="gl-title">${escapeHtml(o.title)}</h1>
      ${o.sub ? `<p class="gl-sub">${o.sub}</p>` : ''}
      ${o.error ? `<div class="gl-alert err" role="alert">${escapeHtml(o.error)}</div>` : ''}
      ${o.body}
      <p class="gl-terms">باستخدامك GRIFFINE أنت توافق على <a id="glTermsLink">إخلاء المسؤولية</a> و<a id="glPrivacyLink">سياسة الخصوصية</a>.</p>
    </div>
  </div>`;
}
function authField(id, type, label, icon, attrs){
  const isPw = type === 'password';
  return `<label class="gl-field" for="${id}"><span class="gl-field-label">${label}</span>
    <span class="gl-input">${icon}<input id="${id}" type="${type}" ${attrs || ''}>${isPw ? `<button type="button" class="gl-eye" data-for="${id}" aria-label="إظهار كلمة المرور">${AUTH_ICONS.eye}</button>` : ''}</span></label>`;
}
function wireAuthCommon(backTo, selfFn){
  const b = document.getElementById('glBackBtn'); if (b) b.onclick = backTo || (() => renderPublicHome());
  document.getElementById('glTermsLink').onclick = () => renderDisclaimerPage({ backTo: selfFn });
  document.getElementById('glPrivacyLink').onclick = () => renderPrivacyPolicyPage({ backTo: selfFn });
  document.querySelectorAll('.gl-eye').forEach(btn => btn.onclick = () => {
    const inp = document.getElementById(btn.dataset.for); if (!inp) return;
    const show = inp.type === 'password'; inp.type = show ? 'text' : 'password';
    btn.innerHTML = show ? AUTH_ICONS.eyeOff : AUTH_ICONS.eye;
    btn.setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
  });
}
function authBusy(btn, busy, label){ btn.disabled = busy; btn.innerHTML = busy ? '<span class="gl-spin" aria-hidden="true"></span>' + label : label; }

function openLoginModal(){ if (typeof closeLoginModal === 'function') closeLoginModal(); renderLogin(); }

// تسجيل الدخول (خطوة واحدة: الإيميل + كلمة المرور) - لو الإيميل محفوظ من قبل بيظهر كاسم بس والمطلوب كلمة المرور
async function renderLogin(error){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderLogin());
  window.__lastPageKey = 'login';
  let remembered = ''; try { remembered = localStorage.getItem('griffine_remembered_email') || ''; } catch(e){}
  if (screenStale(__tok)) return; app.innerHTML = authScreen({
    back: true,
    title: window.__staffGate ? '🛡️ دخول الإدارة' : (remembered ? 'أهلاً بعودتك' : 'تسجيل الدخول'),
    sub: window.__staffGate ? 'دخول فريق الإدارة والموظفين (الرابط صالح 30 دقيقة).' : (remembered ? '' : 'ادخل ببريدك الإلكتروني وكلمة المرور.'),
    error,
    body: `<form id="loginForm" novalidate>
      ${remembered ? `<div class="gl-who"><span class="gl-who-av">${escapeHtml(remembered.charAt(0).toUpperCase())}</span><span class="gl-who-t">${escapeHtml(remembered)}</span><button type="button" class="gl-link" id="notMeLink">حساب آخر</button></div>
        <input type="hidden" id="email" value="${escapeHtml(remembered)}">`
      : authField('email', 'email', 'البريد الإلكتروني', AUTH_ICONS.mail, 'autocomplete="email" inputmode="email" required dir="ltr"')}
      ${authField('password', 'password', 'كلمة المرور', AUTH_ICONS.lock, 'autocomplete="current-password" required dir="ltr"')}
      <div class="gl-row-end"><button type="button" class="gl-link" id="goForgotPassword">نسيت كلمة المرور؟</button></div>
      <button type="submit" class="gl-btn gl-btn-primary" id="loginSubmit">تسجيل الدخول</button>
    </form>
    <div class="gl-divider"><span>جديد على GRIFFINE؟</span></div>
    <button type="button" class="gl-btn gl-btn-outline" id="goRegister">إنشاء حساب جديد</button>`
  });
  wireAuthCommon(() => renderPublicHome(), () => renderLogin());
  document.getElementById('goRegister').onclick = () => renderRegister();
  document.getElementById('goForgotPassword').onclick = () => renderForgotPassword();
  const notMe = document.getElementById('notMeLink');
  if (notMe) notMe.onclick = () => { try { localStorage.removeItem('griffine_remembered_email'); } catch(e){} window.__navSilent = true; try { renderLogin(); } finally { window.__navSilent = false; } };
  const pw = document.getElementById('password'); if (pw && remembered) setTimeout(() => pw.focus(), 50);
  document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    if (!email || !password) return renderLogin('اكتب البريد الإلكتروني وكلمة المرور.');
    const btn = document.getElementById('loginSubmit'); authBusy(btn, true, 'جاري الدخول...');
    try{
      const r = await apiPost('/login.php', { email, password });
      if (r && r.otpRequired) return renderOtpStep(email, r);   // الإصدار 84: كود التحقق
      if (!r.success) return renderLogin(r.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      await finishLogin(email, r);
    } catch(err){ renderLogin('تعذّر الاتصال بالسيرفر. تأكد من الإنترنت وحاول مرة أخرى.'); }
  };
}
/* بعد نجاح الدخول (بكلمة المرور أو بعد كود التحقق) */
async function finishLogin(email, r){
      try { localStorage.setItem('griffine_remembered_email', email); } catch(e){}
      if (r && r.csrfToken) window.__csrfToken = r.csrfToken;
      window.__staffGate = false;
      invalidateSessionCache();
      window.__isAdmin = !!r.is_admin;
      await refreshTopNav();
      // لو الجلسة متحفظتش في المتصفح (كوكيز قديمة/محظورة) - نقول كده بوضوح بدل ما نعرض شاشة غلط
      if (!(await getSession())) return renderLogin('تم التحقق من بياناتك لكن المتصفح لا يحتفظ بالجلسة. امسح بيانات الموقع (الكوكيز) من إعدادات المتصفح وحاول مرة أخرى.');
      postLoginRedirect(email);
}
/* =====================================================================
   الإصدار 84: خطوة كود التحقق (OTP) - بيتبعت بالإيميل أو SMS حسب إعدادات الأدمن
   ===================================================================== */
function renderOtpStep(email, info, error){
  window.__lastPageKey = 'login_otp';
  app.innerHTML = authScreen({
    back: true,
    title: 'كود التحقق',
    sub: escapeHtml((info && info.message) || 'أرسلنا إليك كودًا من 6 أرقام.'),
    error,
    body: `<form id="otpForm" novalidate>
      ${authField('otpCode', 'text', 'الكود (6 أرقام)', AUTH_ICONS.lock, 'autocomplete="one-time-code" inputmode="numeric" maxlength="6" pattern="[0-9]*" required dir="ltr"')}
      <button type="submit" class="gl-btn gl-btn-primary" id="otpSubmit">تأكيد</button>
    </form>
    <div class="gl-row-end" style="justify-content:space-between;margin-top:10px;"><button type="button" class="gl-link" id="otpResend">إعادة إرسال الكود</button><button type="button" class="gl-link" id="otpBack">رجوع لتسجيل الدخول</button></div>`
  });
  wireAuthCommon(() => renderLogin(), () => renderOtpStep(email, info));
  const inp = document.getElementById('otpCode'); if (inp) setTimeout(() => inp.focus(), 50);
  document.getElementById('otpBack').onclick = () => renderLogin();
  document.getElementById('otpResend').onclick = async () => {
    const r = await apiPost('/otp_verify.php', { resend: 1 }).catch(() => null);
    renderOtpStep(email, r && r.resent ? { message: r.message } : info, r && !r.resent ? r.message : '');
  };
  document.getElementById('otpForm').onsubmit = async (e) => {
    e.preventDefault();
    const code = (inp.value || '').replace(/\D/g, '');
    if (code.length !== 6) return renderOtpStep(email, info, 'اكتب الكود كامل (6 أرقام).');
    const btn = document.getElementById('otpSubmit'); authBusy(btn, true, 'جاري التحقق...');
    try {
      const r = await apiPost('/otp_verify.php', { code });
      if (r && r.success) return finishLogin(email, r);
      if (r && r.restart) return renderLogin((r && r.message) || 'سجّل الدخول مرة أخرى.');
      renderOtpStep(email, info, (r && r.message) || 'الكود غير صحيح.');
    } catch(err){ renderOtpStep(email, info, 'تعذّر الاتصال بالسيرفر.'); }
  };
}
// اسم قديم لنفس الشاشة (بتتنادى من أماكن تانية في الموقع)
async function renderLoginEmail(error){ return renderLogin(error); }

async function renderRegister(error){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderRegister());
  window.__lastPageKey = 'register';
  let refCode = ''; try { refCode = localStorage.getItem('griffine_ref_code') || ''; } catch(e){}
  if (screenStale(__tok)) return; app.innerHTML = authScreen({
    back: true,
    title: 'إنشاء حساب جديد',
    sub: 'دقيقة واحدة وتبدأ تنظّم خططك ومحفظتك.',
    error,
    body: `<form id="regForm" novalidate>
      ${authField('email', 'email', 'البريد الإلكتروني', AUTH_ICONS.mail, 'autocomplete="email" inputmode="email" required dir="ltr"')}
      ${authField('password', 'password', 'كلمة المرور', AUTH_ICONS.lock, 'autocomplete="new-password" required minlength="8" dir="ltr"')}
      <div class="gl-hint" id="pwHint">8 أحرف على الأقل، وفيها حرف ورقم.</div>
      <div id="regMarketWrap" hidden></div>
      ${refCode ? `<div class="gl-alert ok">${AUTH_ICONS.check}<span>كود الدعوة <b dir="ltr">${escapeHtml(refCode)}</b> سيُسجَّل مع حسابك.</span></div>` : ''}
      <label class="gl-check"><input type="checkbox" id="acceptDisclaimer"><span>قرأت <a id="viewDisclaimerLink">إخلاء المسؤولية</a> وأوافق عليه: الأدوات هنا للتحليل والتعليم، وليست توصية استثمارية، والقرار والمسؤولية المالية عليّ بالكامل.</span></label>
      <button type="submit" class="gl-btn gl-btn-primary" id="regSubmit">إنشاء الحساب</button>
    </form>
    <div class="gl-foot-link">عندك حساب بالفعل؟ <button type="button" class="gl-link" id="goLogin">تسجيل الدخول</button></div>`
  });
  wireAuthCommon(() => renderPublicHome(), () => renderRegister());
  document.getElementById('goLogin').onclick = () => renderLogin();
  document.getElementById('viewDisclaimerLink').onclick = (e) => { e.preventDefault(); renderDisclaimerPage({ backTo: () => renderRegister() }); };
  const pwIn = document.getElementById('password'), hint = document.getElementById('pwHint');
  const pwOk = (v) => v.length >= 8 && /[0-9]/.test(v) && /[A-Za-z؀-ۿ]/.test(v);
  pwIn.addEventListener('input', () => { hint.classList.toggle('ok', pwOk(pwIn.value)); });
  // الإصدار 96: سوق الحساب - بيظهر بس لو الأدمن مفعّل أكتر من سوق (غير كده الحساب مصري تلقائي)
  apiGet('/account_market.php').then(m => {
    const w = document.getElementById('regMarketWrap'); if (!w || !m || !m.success || (m.active || []).length < 2) return;
    w.innerHTML = `<label class="gl-mkt-label" for="regMarket">بورصة حسابك</label>
      <select id="regMarket" class="gl-mkt-select">${m.active.map(x => `<option value="${escapeHtml(x)}">${escapeHtml(x)} — ${escapeHtml(m.markets[x].ccyAr)}</option>`).join('')}</select>
      <div class="gl-hint">كل شيء في حسابك (الباقات والخطط والتقارير) سيكون بعملة هذه البورصة، ولا يمكن تغييرها بعد التسجيل. لبورصة أخرى سجّل حسابًا جديدًا ببريد مختلف.</div>`;
    w.hidden = false;
  }).catch(() => {});
  document.getElementById('regForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = pwIn.value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return renderRegister('اكتب بريد إلكتروني صحيح.');
    if (!pwOk(password)) return renderRegister('يجب أن تكون كلمة المرور 8 أحرف على الأقل وتحتوي على حرف ورقم.');
    if (!document.getElementById('acceptDisclaimer').checked) return renderRegister('يجب الموافقة على إخلاء المسؤولية لإكمال التسجيل.');
    const btn = document.getElementById('regSubmit'); authBusy(btn, true, 'جاري إنشاء الحساب...');
    try{
      const mSel = document.getElementById('regMarket');
      const r = await apiPost('/register.php', { email, password, acceptDisclaimer: '1', refCode, market: mSel ? mSel.value : 'مصر' });
      if (!r.success) return renderRegister(r.message || 'حصل خطأ أثناء إنشاء الحساب.');
      try { localStorage.setItem('griffine_remembered_email', email); } catch(e){}
      invalidateSessionCache();
      window.__isAdmin = !!r.is_admin;
      await refreshTopNav();
      postLoginRedirect(email);
    } catch(err){ renderRegister('تعذّر الاتصال بالسيرفر. تأكد من الإنترنت وحاول مرة أخرى.'); }
  };
}

async function renderForgotPassword(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderForgotPassword());
  window.__lastPageKey = 'forgot_password';
  if (screenStale(__tok)) return; app.innerHTML = authScreen({
    back: true,
    title: 'نسيت كلمة المرور؟',
    sub: 'اكتب بريدك المسجّل وهنبعتلك رابط تعيين كلمة مرور جديدة.',
    body: `<form id="forgotForm" novalidate>
      ${authField('fpEmail', 'email', 'البريد الإلكتروني', AUTH_ICONS.mail, 'autocomplete="email" inputmode="email" required dir="ltr"')}
      <div id="forgotResult"></div>
      <button type="submit" class="gl-btn gl-btn-primary" id="forgotSubmit">إرسال الرابط</button>
    </form>
    <div class="gl-foot-link"><button type="button" class="gl-link" id="backToLoginFromForgot">رجوع لتسجيل الدخول</button></div>`
  });
  wireAuthCommon(() => renderLogin(), () => renderForgotPassword());
  document.getElementById('backToLoginFromForgot').onclick = () => renderLogin();
  document.getElementById('forgotForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('fpEmail').value.trim().toLowerCase();
    const out = document.getElementById('forgotResult');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { out.innerHTML = '<div class="gl-alert err">اكتب بريد إلكتروني صحيح.</div>'; return; }
    const btn = document.getElementById('forgotSubmit'); authBusy(btn, true, 'جاري الإرسال...');
    let r; try { r = await forgotPassword(email); } catch(err){ r = { message: 'تعذّر الاتصال بالسيرفر.' }; }
    out.innerHTML = `<div class="gl-alert ok">${AUTH_ICONS.check}<span>${escapeHtml(r.message || 'إذا كان البريد مسجّلًا لدينا فسيصلك رابط خلال دقائق.')}</span></div>`;
    authBusy(btn, false, 'إرسال الرابط');
  };
}

async function renderResetPassword(token){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderResetPassword(token));
  window.__lastPageKey = 'reset_password';
  if (screenStale(__tok)) return; app.innerHTML = authScreen({
    back: false,
    title: 'كلمة مرور جديدة',
    sub: 'اختار كلمة مرور قوية (8 أحرف على الأقل، وفيها حرف ورقم).',
    body: `<form id="resetForm" novalidate>
      ${authField('rpPassword', 'password', 'كلمة المرور الجديدة', AUTH_ICONS.lock, 'autocomplete="new-password" required minlength="8" dir="ltr"')}
      ${authField('rpPassword2', 'password', 'تأكيد كلمة المرور', AUTH_ICONS.lock, 'autocomplete="new-password" required minlength="8" dir="ltr"')}
      <div id="resetResult"></div>
      <button type="submit" class="gl-btn gl-btn-primary" id="resetSubmit">حفظ كلمة المرور</button>
    </form>`
  });
  wireAuthCommon(null, () => renderResetPassword(token));
  document.getElementById('resetForm').onsubmit = async (e) => {
    e.preventDefault();
    const p1 = document.getElementById('rpPassword').value, p2 = document.getElementById('rpPassword2').value;
    const out = document.getElementById('resetResult');
    if (p1.length < 8 || !/[0-9]/.test(p1) || !/[A-Za-z؀-ۿ]/.test(p1)) { out.innerHTML = '<div class="gl-alert err">يجب أن تكون كلمة المرور 8 أحرف على الأقل وتحتوي على حرف ورقم.</div>'; return; }
    if (p1 !== p2) { out.innerHTML = '<div class="gl-alert err">كلمتا المرور غير متطابقتين.</div>'; return; }
    const btn = document.getElementById('resetSubmit'); authBusy(btn, true, 'جاري الحفظ...');
    let r; try { r = await resetPassword(token, p1); } catch(err){ r = { success:false, message:'تعذّر الاتصال بالسيرفر.' }; }
    if (r.success) {
      try { history.replaceState(null, '', location.pathname); } catch(e){}
      out.innerHTML = `<div class="gl-alert ok">${AUTH_ICONS.check}<span>${escapeHtml(r.message || 'تم تغيير كلمة المرور.')}</span></div>`;
      btn.disabled = false; btn.textContent = 'تسجيل الدخول'; btn.type = 'button';
      btn.onclick = () => renderLogin();
      document.getElementById('resetForm').onsubmit = (ev) => { ev.preventDefault(); renderLogin(); };
    } else {
      out.innerHTML = `<div class="gl-alert err">${escapeHtml(r.message || 'الرابط غير صالح أو منتهي.')}</div>`;
      authBusy(btn, false, 'حفظ كلمة المرور');
    }
  };
}

// سياسة الخصوصية — النص الافتراضي تحت، والأدمن يقدر يستبدله بنص مخصص من "📝 تعديل نصوص شاشات الموقع"
async function renderPrivacyPolicyPage(options){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderPrivacyPolicyPage(options));
  options = options || {};
  const email = await getSession();
  const pc = await getPageContent('privacy');
  const custom = (pc && pc.success && pc.content) ? pc.content : null;
  const p = 'font-size:13.5px;line-height:1.8;margin:0 0 12px;';
  const defaultHtml = `
      <h3>البيانات التي نجمعها</h3>
      <p style="${p}">بيانات حسابك (البريد الإلكتروني وكلمة المرور — وتُخزَّن كلمة المرور مشفّرة). ونحفظ كذلك بيانات الاشتراك التي تدخلها بنفسك، والخطط والصفقات التي تسجّلها داخل الموقع.</p>
      <h3>فيمَ نستخدمها</h3>
      <p style="${p}">تشغيل حسابك ومتابعة اشتراكك، وإرسال التنبيهات والإشعارات التي فعّلتها، والرد على استفساراتك، وحماية الموقع من الاستخدام الخاطئ.</p>
      <h3>المشاركة</h3>
      <p style="${p}">لا نبيع بياناتك، ولا نشاركها مع أي طرف آخر إلا إذا كان ذلك مطلوبًا قانونًا أو ضروريًا لتشغيل خدمة أساسية (مثل إرسال البريد الإلكتروني).</p>
      <h3>الحماية</h3>
      <p style="${p}">يعمل الموقع باتصال مشفّر (HTTPS) ونحمي البيانات بإجراءات معقولة، لكن لا يوجد نظام آمن بنسبة 100%.</p>
      <h3>حقوقك وحذف الحساب</h3>
      <p style="${p}">يمكنك تعديل بياناتك من "الملف الشخصي"، وتحذف حسابك بنفسك في أي وقت من: حسابي ← حذف الحساب نهائيًا، أو من الرابط www.griffine.store/index.php?page=delete-account. الحذف يمسح حسابك وخططك وصفقاتك وصورتك ومقترحاتك ومحادثاتك فورًا. نحتفظ فقط بسجل الاشتراكات والمبالغ المدفوعة (بدون اسمك ورقمك) لأغراض محاسبية، وبسجل الموافقة على إخلاء المسؤولية، وببريد الحساب داخل سجل الاشتراكات لمنع تكرار التجربة المجانية.</p>
      <p style="font-size:12px;color:var(--text-faint);margin:0;">قد نحدّث هذه السياسة من وقت لآخر، وأي تحديث سيظهر هنا.</p>`;
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <h2>${pageTitle('privacy_page','سياسة الخصوصية')}</h2>
    <div class="section-card">
      ${custom ? `<div class="u-prose">${escapeHtml(custom)}</div>` : defaultHtml}
    </div>
    <button class="btn-gray" id="privacyBackBtn">رجوع</button>
  </div>`;
  document.getElementById('privacyBackBtn').onclick = () => {
    if (options.backTo) return options.backTo();
    return email ? renderHome() : renderPublicHome();
  };
}

async function renderVerifyEmailResult(token){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderVerifyEmailResult(token));
  window.__lastPageKey='verify_email_result'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}<h2>تفعيل البريد الإلكتروني</h2>
    <div id="verifyResultArea">جاري التحقق...</div></div>`;
  const r = await verifyEmailToken(token);
  const email = await getSession();
  document.getElementById('verifyResultArea').innerHTML = r.success
    ? `<div class="success-banner">✅ ${escapeHtml(r.message)}
        <button class="small u-mt10" id="continueAfterVerifyBtn">${email ? 'المتابعة إلى الموقع' : 'تسجيل الدخول'}</button>
      </div>`
    : `<div class="error">${escapeHtml(r.message)}</div>
       <button class="secondary u-mt12" id="backToLoginAfterVerifyFail">رجوع لتسجيل الدخول</button>`;
  const contBtn = document.getElementById('continueAfterVerifyBtn');
  if (contBtn) contBtn.onclick = () => { email ? postLoginRedirect(email) : renderLogin(); };
  const backBtn = document.getElementById('backToLoginAfterVerifyFail');
  if (backBtn) backBtn.onclick = () => renderLogin();
}
/* ================== الشاشة الرئيسية ================== */
async function renderHome(){
  const __tok = screenToken();   // الإصدار 88
  if (window.GShell && GShell.enabled) return GShell.renderHome();
  pushNav(() => renderHome());
  setBottomNavActive('home');
  const email = await getSession();
  if(!email) return renderLogin();
  setBackButtonVisible(false);
  if(!(await ensureAccess())) return;
  const settings = await getAdminSettings();
  const hidden = (key) => settings[key] === true;
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container">
    <div class="home-band">
      <div class="home-band-bg"><img src="${screenBgOr('home','login_hero.webp')}" alt="" draggable="false"></div>
      <div class="home-logo"><img src="${griffineLogoSrc()}" alt="GRIFFINE"><div class="home-wordmark">GRIFFINE</div></div>
      <div class="home-greet">
        <div style="font-size:13px;opacity:.85;">أهلًا بك في GRIFFINE</div>
        <div style="font-size:20px;font-weight:800;margin-top:4px;">${email}</div>
        <div style="font-size:12.5px;opacity:.9;margin-top:10px;">استخدم القوائم في الشريط العلوي للتنقّل بين خطط الأسهم، المحفظة، والحساب — أو ابدأ من هنا مباشرة.</div>
      </div>
      <h2>${pageTitle('home','ابدأ من هنا')}</h2>
      <div class="action-grid cols-3">
        <button id="goNewPlanBtn" class="btn-lightgreen u-mt0">+ خطة جديدة لسهم</button>
        <button id="goPlansListBtn" class="btn-lightgreen u-mt0">📈 الأسهم والخطط</button>
        ${hidden('hide_portfolio_screen') ? '' : `<button id="goPortfolioBtn" class="btn-lightblue u-mt0">📊 ملخص المحفظة</button>`}
        ${hidden('hide_screener_screen') ? '' : `<button id="goScreenerBtn" class="secondary u-mt0">🔍 كشاف الأسهم</button>`}
      </div>
    </div>
  </div>`;
  document.getElementById('goNewPlanBtn').onclick=()=>renderPlanTypeChooser();
  document.getElementById('goPlansListBtn').onclick=()=>renderPlansList();
  if(document.getElementById('goPortfolioBtn')) document.getElementById('goPortfolioBtn').onclick=()=>renderPortfolio();
  if(document.getElementById('goScreenerBtn')) document.getElementById('goScreenerBtn').onclick=()=>renderScreener();
}

/* ================== سجل اشتراكي (تقرير العميل) ================== */
async function renderMySubscriptionHistory(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderMySubscriptionHistory());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;

  const res = await getMySubscriptionHistory();
  const events = (res && res.success) ? res.events : [];
  const typeLabel = { new_subscription:'اشتراك جديد', plan_change:'تغيير باقة', renewal:'تجديد', gift:'باقة هدية' };

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${email}</strong></div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button></div>
    <h2>${pageTitle('my_subscription_history','📄 سجل اشتراكي')}</h2>
    <div class="section-card">
      ${events.length ? `<table>
        <thead><tr><th>التاريخ</th><th>النوع</th><th>الباقة</th><th>المبلغ</th></tr></thead>
        <tbody>
          ${events.map(ev=>`<tr>
            <td>${formatDateAr(ev.eventDate)}</td>
            <td>${typeLabel[ev.eventType] || ev.eventType}</td>
            <td>${ev.planName || '-'}</td>
            <td>${ev.amount ? fmtMoney(ev.amount) : 'مجانًا'}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<p class="u-note">لا توجد لديك أي اشتراكات مسجّلة بعد.</p>'}
    </div>
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();
}

/* ================== إخلاء المسؤولية - صفحة كاملة + بوابة موافقة إلزامية ================== */
async function renderDisclaimerPage(options){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderDisclaimerPage(options));
  options = options || {};
  const res = await getPublicDisclaimerText();
  const text = (res && res.success) ? res.text : '';
  const email = await getSession();
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <h2>${pageTitle('disclaimer_page','⚠️ إخلاء المسؤولية (Disclaimer)')}</h2>
    <div class="section-card" id="disclaimerTextWrap" style="line-height:1.9;font-size:14.5px;"></div>
    <button class="secondary small u-mt14" id="disclaimerBackBtn">رجوع</button>
  </div>`;
  document.getElementById('disclaimerTextWrap').textContent = text;
  document.getElementById('disclaimerBackBtn').onclick = () => {
    if (options.backTo) return options.backTo();
    if (email) return renderHome();
    return renderLogin();
  };
}

// بيتأكد إن العميل (مش الأدمن) وافق على النسخة الحالية من إخلاء المسؤولية قبل ما يكمل استخدام الموقع
async function ensureDisclaimerAccepted(email){
  if (window.__isAdmin) return true;
  const res = await getDisclaimerStatus();
  if (!res || !res.success) return true; // فشل مؤقت في السيرفر مش سبب كافي نقفل الموقع بسببه
  if (res.accepted) return true;
  renderDisclaimerGate(email, res.text);
  return false;
}

async function renderDisclaimerGate(email, text){
  const __tok = screenToken();   // الإصدار 88
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <h2>${pageTitle('disclaimer_gate','⚠️ إخلاء المسؤولية')}</h2>
    <div class="info">قبل أن تكمل استخدام الموقع، يجب أن توافق على النص التالي:</div>
    <div class="section-card" id="gateTextWrap" style="max-height:280px;overflow-y:auto;line-height:1.9;font-size:14.5px;"></div>
    <label style="display:flex;align-items:flex-start;gap:8px;font-weight:normal;margin-top:14px;">
      <input type="checkbox" id="gateAccept" style="margin-top:3px;"> أوافق على إخلاء المسؤولية وأتحمل كامل المسؤولية عن قراراتي الاستثمارية
    </label>
    <button id="gateContinueBtn" class="u-mt14" disabled>أوافق وأكمل</button>
    <button class="secondary small u-mt8" id="gateLogoutBtn">تسجيل خروج</button>
    <div id="gateResult"></div>
  </div>`;
  document.getElementById('gateTextWrap').textContent = text;
  document.getElementById('gateAccept').onchange = (e)=>{ document.getElementById('gateContinueBtn').disabled = !e.target.checked; };
  document.getElementById('gateLogoutBtn').onclick = async()=>{ await setSession(''); window.__screens = []; window.__screenIndex = -1; await refreshTopNav(); renderLogin(); };
  document.getElementById('gateContinueBtn').onclick = async () => {
    const r = await acceptDisclaimer();
    if (r.success) { postLoginRedirect(email); } else { document.getElementById('gateResult').innerHTML = `<div class="error u-mt8">${r.message||'حصل خطأ'}</div>`; }
  };
}

async function renderAboutPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderAboutPage());
  const email = await getSession();
  const pc = await getPageContent('about');
  const custom = (pc && pc.success && pc.content) ? pc.content : null;
  const defaultHtml = `
      <p style="font-size:13.5px;line-height:1.8;margin:0 0 12px;">GRIFFINE أداة لمتابعة خطط تعزيز متوسط الأسهم (DCA) وخطط الشبكة (Grid)، مع كشاف لفرص الشراء وملخص شامل لمحفظتك في مكان واحد.</p>
      <p style="font-size:13.5px;line-height:1.8;margin:0 0 12px;">التطبيق تابع لشركة Top7 المصرية، ويهدف لتبسيط تخطيط ومتابعة استراتيجيات الشراء التدريجي للأسهم.</p>
      <p style="font-size:12px;color:var(--text-faint);margin:0;">الأرقام والتقارير داخل GRIFFINE مبنية على بيانات تسجّلها بنفسك، ولا تُعد توصية استثمارية بأي شكل.</p>`;
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container">
    <div class="logo-header"><img src="${griffineLogoSrc()}" alt="GRIFFINE" class="brand-logo-img"><h1>GRIFFINE</h1></div>
    <h2>${pageTitle('about_page','عن GRIFFINE')}</h2>
    <div class="section-card">
      ${custom ? `<div class="u-prose">${escapeHtml(custom)}</div>` : defaultHtml}
    </div>
    <button class="btn-gray" id="backHomeFromAboutBtn">🏠 رجوع للشاشة الرئيسية</button>
  </div>`;
  document.getElementById('backHomeFromAboutBtn').onclick=()=>{ email ? renderHome() : renderPublicHome(); };
}

async function renderRefundPolicyPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderRefundPolicyPage());
  const email = await getSession();
  const pc = await getPageContent('refund_policy');
  const custom = (pc && pc.success && pc.content) ? pc.content : null;
  const defaultHtml = `
      <p style="font-size:13.5px;line-height:1.8;margin:0 0 12px;">الاشتراك في GRIFFINE يمنحك وصولًا لأدوات المتابعة والتخطيط طوال مدة الباقة (شهرية أو سنوية) التي اخترتها.</p>
      <p style="font-size:13.5px;line-height:1.8;margin:0 0 12px;">لو حابب تلغي اشتراكك أو تسترجع قيمته، تواصل معانا من صفحة "تواصل معنا" مع ذكر تاريخ الاشتراك وسبب الطلب، وهنرد عليك بأقرب وقت ممكن لمراجعة الطلب.</p>
      <p style="font-size:12px;color:var(--text-faint);margin:0;">المبالغ المستردة (إذا تمت الموافقة عليها) تُعاد بوسيلة الدفع نفسها المستخدمة وقت الاشتراك.</p>`;
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container">
    <div class="logo-header"><img src="${griffineLogoSrc()}" alt="GRIFFINE" class="brand-logo-img"><h1>GRIFFINE</h1></div>
    <h2>${pageTitle('refund_policy_page','سياسة استرداد الاشتراك')}</h2>
    <div class="section-card">
      ${custom ? `<div class="u-prose">${escapeHtml(custom)}</div>` : defaultHtml}
    </div>
    <button class="btn-gray" id="backHomeFromRefundBtn">🏠 رجوع للشاشة الرئيسية</button>
  </div>`;
  document.getElementById('backHomeFromRefundBtn').onclick=()=>{ email ? renderHome() : renderPublicHome(); };
}

async function renderSuggestionsPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderSuggestionsPage());
  const email = await getSession();
  if(!email) return renderLogin();

  const pc = await getPageContent('suggestions');
  const introText = (pc && pc.success && pc.content) ? pc.content : 'اكتب أي فكرة تفيد الموقع، أو اشرح طريقة أو ميزة محتاجها — لو الاقتراح استخدمناه في تطوير الموقع، ممكن نكافئك بفترة اشتراك مجانية. تقدر ترفق صورة أو ملف PDF يوضّح فكرتك.';

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>${pageTitle('suggestions_page','💡 شاركنا مقترحاتك')}</div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button></div>
    <div class="info" style="white-space:pre-wrap;">${escapeHtml(introText)}</div>
    <form id="suggestionForm">
      <label>اقتراحك أو فكرتك</label>
      <textarea id="suggestionMessage" rows="6" required placeholder="مثال: حابب أقدر أصفّي الأسهم حسب القطاع في كشاف الأسهم..."></textarea>
      <label>إرفاق صورة أو PDF (اختياري)</label>
      <input type="file" accept="image/*,application/pdf" id="suggestionFile">
      <div id="suggestionFilePreview"></div>
      <button type="submit" class="u-mt14">إرسال الاقتراح</button>
    </form>
    <div id="suggestionResult"></div>
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();

  let attachmentDataUrl = null;
  let attachmentName = null;
  document.getElementById('suggestionFile').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    const previewEl = document.getElementById('suggestionFilePreview');
    if (!file) { attachmentDataUrl = null; attachmentName = null; previewEl.innerHTML = ''; return; }
    attachmentName = file.name;
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        attachmentDataUrl = ev.target.result;
        previewEl.innerHTML = `<div class="info u-mt6">📎 ${escapeHtml(file.name)}</div>`;
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1000;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          canvas.width = img.width * scale; canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          attachmentDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          previewEl.innerHTML = `<img src="${attachmentDataUrl}" style="max-width:200px;border-radius:8px;margin-top:6px;">`;
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      previewEl.innerHTML = '<div class="error u-mt6">يجب أن يكون الملف صورة أو PDF فقط.</div>';
      attachmentDataUrl = null; attachmentName = null;
    }
  });

  document.getElementById('suggestionForm').onsubmit = async (e) => {
    e.preventDefault();
    const message = document.getElementById('suggestionMessage').value.trim();
    const resultEl = document.getElementById('suggestionResult');
    if (!message) { resultEl.innerHTML = '<div class="error u-mt10">اكتب اقتراحك الأول.</div>'; return; }
    const r = await apiPost('/suggestion_submit.php', { message, attachment: attachmentDataUrl, attachmentName });
    if (r && r.success) {
      resultEl.innerHTML = '<div class="info u-mt10">✅ شكرًا لك! وصلنا اقتراحك وهنراجعه.</div>';
      document.getElementById('suggestionForm').reset();
      document.getElementById('suggestionFilePreview').innerHTML = '';
      attachmentDataUrl = null; attachmentName = null;
    } else {
      resultEl.innerHTML = `<div class="error u-mt10">${(r&&r.message)||'حصل خطأ في إرسال الاقتراح'}</div>`;
    }
  };
}

async function renderContactInfo(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderContactInfo());
  const email = await getSession();
  const pc = await getPageContent('contact');
  const custom = (pc && pc.success && pc.content) ? pc.content : null;
  // الإصدار 84: رقم التواصل = رقم الخدمة من لوحة التحكم
  const svcPhone = (await getSiteConfig()).servicePhone;
  const svcWa = String(svcPhone).replace(/\D/g, '').replace(/^00/, '').replace(/^0(1\d{9})$/, '20$1');
  const defaultHtml = `
      <p style="font-size:13px;color:#555;margin:0 0 10px;">تطبيق GRIFFINE تابع لشركة Top7</p>
      <div style="font-size:14px;margin:10px 0;"><strong>📧 البريد الإلكتروني:</strong> <a href="mailto:info@griffine.store" style="color:var(--green-dark);font-weight:600;">info@griffine.store</a></div>
      <div style="font-size:14px;margin:10px 0;"><strong>📱 رقم التواصل:</strong> <span dir="ltr">${escapeHtml(svcPhone)}</span></div>
      <div style="font-size:14px;margin:10px 0;display:flex;align-items:center;gap:8px;">
        <strong>واتساب:</strong>
        <a href="https://wa.me/${svcWa}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;color:var(--green-dark);font-weight:600;">
          <svg width="22" height="22" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="16" fill="#25D366"/>
            <path d="M22.6 9.4c-1.7-1.7-4-2.6-6.4-2.6-5 0-9 4-9 9 0 1.6.4 3.1 1.2 4.5L7 25l4.8-1.3c1.3.7 2.8 1.1 4.4 1.1 5 0 9-4 9-9 0-2.4-.9-4.7-2.6-6.4zm-6.4 13.8c-1.4 0-2.7-.4-3.9-1.1l-.3-.2-2.9.8.8-2.8-.2-.3c-.8-1.2-1.2-2.6-1.2-4.1 0-4.1 3.3-7.4 7.4-7.4 2 0 3.8.8 5.2 2.2 1.4 1.4 2.2 3.2 2.2 5.2.1 4.1-3.3 7.4-7.1 7.4zm4-5.5c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.7.9-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.2.2-.4.1-.1 0-.3 0-.4-.1-.1-.5-1.3-.7-1.7-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.2.9 2.4.1.2 1.6 2.4 3.8 3.4.5.2.9.4 1.3.5.5.2 1 .1 1.3.1.4-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1-.1-.1-.2-.1-.4-.2z" fill="#fff"/>
          </svg>
          <span dir="ltr">${escapeHtml(svcPhone)}</span>
        </a>
      </div>`;
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container">
    <div class="logo-header"><img src="${top7LogoSrc()}" alt="Top7" style="height:70px;"></div>
    <div class="topbar"><div>${email ? `مرحبًا <strong>${email}</strong>` : pageTitle('contact_info','بيانات التواصل')}</div></div>
    <div style="text-align:left;margin-bottom:10px;">
      <img src="${griffineLogoSrc()}" alt="GRIFFINE" style="height:70px;">
      <div class="griffine-wordmark" style="font-weight:bold;letter-spacing:3px;font-size:16px;color:var(--green-dark);margin-top:4px;font-family:var(--font-head);">GRIFFINE</div>
    </div>
    <h2>بيانات التواصل</h2>
    <div class="section-card">
      ${custom ? `<div class="u-prose">${escapeHtml(custom)}</div>` : defaultHtml}
    </div>
    <button class="btn-gray" id="backHomeFromContactBtn">🏠 رجوع للشاشة الرئيسية</button>
  </div>`;
  document.getElementById('backHomeFromContactBtn').onclick=()=>{ email ? renderHome() : renderPublicHome(); };
}

