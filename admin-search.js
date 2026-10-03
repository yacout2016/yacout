/* =====================================================================
   GRIFFINE — admin-search.js (الإصدار 148) — بحث لوحة التحكم (للإدارة بس)
   ---------------------------------------------------------------------
   خانة بحث فوق لوحة التحكم: اكتب أي كلمة (مثلًا «واتساب» / «الدفع» / «العدادات» / «إخفاء» / «أسبوع»)
   ← بيجيب كل الأماكن اللي ليها علاقة بالكلمة، وقدام كل نتيجة «مكانها» (لوحة التحكم ← القسم ← البند)،
   والضغط عليها بيفتح المكان وينوّر البند.
   المصادر: أزرار لوحة التحكم + كل الإعدادات الإلزامية وإخفاء الشاشات + أقسام صفحة الإعدادات
            + كروت الرئيسية وقوائم المدد + أقسام صفحة اللاندينج + شاشات الموقع كلها
   ===================================================================== */
(function(){
  'use strict';
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (t) => String(t || '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/\s+/g, ' ').trim();
  const P0 = 'لوحة التحكم';
  const can = (perm) => !perm || [].concat(perm).some(k => typeof hasPermission === 'function' && hasPermission(k));
  const goBtn = (id) => () => { const b = document.getElementById(id); if (b) return b.click(); renderAdminHub(); setTimeout(() => { const x = document.getElementById(id); if (x) x.click(); }, 600); };

  // أقسام صفحة «الصلاحيات والإعدادات الإلزامية»
  const SETTINGS_SECTIONS = [
    ['🔐 الدخول والأمان', 'رابط سري دخول الإدارة كود تحقق OTP بريد SMS واتساب'],
    ['💳 طرق الدفع ورقم الخدمة', 'فودافون كاش انستاباي Paymob بطاقة فيزا رقم الخدمة تحويل'],
    ['🏷️ رقم الإصدار المعروض', 'رقم الإصدار V حسابي'],
    ['🌍 الأسواق وطرق الدفع لكل سوق', 'الأسواق مصر السعودية الامارات قطر الكويت بورصة تحويل بنكي'],
    ['إخفاء شاشات عن العميل', 'إخفاء شاشة زرار العميل'],
    ['إعدادات محرك إشارات كشاف الأسهم', 'الكشاف إشارات مؤشرات'],
    ['نسخة احتياطية يدوية', 'نسخة احتياطية backup تحميل'],
  ];
  // أقسام صفحة اللاندينج
  const LANDING = [
    ['general', '⚙️ عام', 'الثيم الألوان الشعار القائمة'], ['sections', '🧩 الأقسام والنصوص', 'الواجهة العنوان المميزات الخدمات الحاسبة الخطوات من نحن الأسئلة قسم مخصص صورة'],
    ['links', '🔗 الربط بالموقع', 'العدادات الزوار المستخدمين الخطط التنبيهات زيادة يومية الأرقام الحقيقية آراء العملاء الأسئلة الشائعة الأسواق'],
    ['promos', '📣 العروض والدعاية', 'عروض خصم بانر'],
  ];

  // كلمات بتوصف محتوى كل شاشة في لوحة التحكم (عشان البحث يلاقي الحاجة حتى لو مش مكتوبة في اسم الزرار)
  const KW = {
    goSubscribersBtn: 'مشترك مشتركين اشتراك باقة تفعيل هدية مميزات المشترك تجديد كود العضوية إيميل رقم الموبايل قنوات الإشعارات واتساب',
    goStaffBtn: 'موظف موظفين صلاحيات صلاحية دور محلل مراجع اعتماد التوصيات', goHrBtn: 'رواتب حضور انصراف مستندات موظفين اجازات',
    goJobTitlesBtn: 'مسميات وظيفية وظيفة', goArchiveBtn: 'أرشيف محذوفين استرجاع عميل',
    goChatAdminBtn: 'شات دردشة رسائل العملاء محادثات تنبيهات الشات واتساب إيميل رفع ملفات صور موظف رد',
    goContentBtn: 'آراء العملاء تقييمات مقالات', goSuggestionsAdminBtn: 'مقترحات العملاء', goFaqBtn: 'المساعد الذكي أسئلة أجوبة شات رد تلقائي',
    goPlansMgmtBtn: 'باقات أسعار سعر خطط مميزات الباقات شهري سنوي برو مجانية فترة التعرف مميزات مخفية',
    goReportsBtn: 'تقارير إيرادات مبيعات مدفوعات مشتركين', goTradesBtn: 'صفقات شراء بيع أرباح عملاء تقرير',
    goRecommendationsBtn: 'توصيات توصية محلل مالي شراء بيع موافقة رفض مراجعة مسح السوق إرسال واتساب إيميل مرفقات',
    goSettingsBtn: 'صلاحيات إعدادات إلزامية الدفع فودافون كاش انستاباي paymob بطاقة واتساب OTP كود تحقق رابط سري دخول الإدارة أسواق رقم الإصدار نسخة احتياطية إخفاء شاشات الشات',
    goPeriodsBtn: 'الرئيسية كروت مدد فترات قائمة منسدلة يوم أسبوع شهر افتراضي منحنى',
    goEmergencyBtn: 'صيانة انقطاع النت السيرفر تحميل بطيء شاشة طارئة', goEmailCenterBtn: 'إيميل بريد سجل الإرسال اختبار رسائل',
    goAiBtn: 'ذكاء اصطناعي claude مفتاح api مدفوع مجاني بصيرة ميزان', goBlacklistBtn: 'حظر قائمة سوداء منع إيميل',
    goLandingBtn: 'لاندينج واجهة الموقع الصفحة العامة قبل الدخول العدادات آراء أسئلة عروض شريط الأسعار',
    goBasiraBtn: 'بصيرة تحليل الأسهم مسح السوق فترات التوقع أخبار مشاركة', goMizanBtn: 'ميزان المحفظة نسب مقترحة تنبيهات تركيز تنويع',
    goRecsCfgBtn: 'نصوص أزرار افتراضيات التوصيات موافقة الأدمن مرفقات صورة pdf ملف تنويه الإيميل',
    goMizanAiBtn: 'ميزان GRIFFINE AI توزيع قطاعات أصول عوائد شهادات ذهب عقار', goStudioBtn: 'ثيم ثيمات ألوان خط استوديو إخفاء عنصر تعديل نص ترتيب',
    goSiteDesignBtn: 'تنسيق الموقع ألوان خلفية', goSiteTextsBtn: 'نصوص الشاشات الشروط والأحكام الخصوصية الاسترداد عن تواصل',
    goRdBtn: 'تحليلات زوار متصفحين أجهزة موبايل مصادر تيك توك فيسبوك جوجل أخطاء بطء سرعة تقرير التطوير اقتراحات تسجيل اشتراك رحلة الزائر بحث مالقاش أسئلة الشات',
    goMktBtn: 'تسويق مسوق محتوى بوست ريلز فيديو سكريبت كابشن هاشتاج تيك توك فيسبوك انستجرام واتساب يوتيوب جدول نشر حملة رابط تتبع utm مطلوب منك مهام أداء إشهار دعاية',
    goAdsBtn: 'دعاية عروض خصم upsell downsell بانر شريط متحرك نافذة', goExportScreensBtn: 'طباعة صور pdf الشاشات', goExportExcelBtn: 'تصدير excel إكسل الحسابات المدخلات',
  };
  function buildIndex(){
    const L = [];
    const add = (title, path, go, extra) => L.push({ title, path, go, k: norm(title + ' ' + path + ' ' + (extra || '')) });
    // 1) أزرار لوحة التحكم
    if (!window.__adminNavGroups && typeof adminNavButtonsHtml === 'function') { try { adminNavButtonsHtml(); } catch(e){} }
    (window.__adminNavGroups || []).forEach(g => g.items.forEach(it => { if (can(it.perm) && (!it.superOnly || window.__isSuperAdmin)) add(`${it.icon} ${it.label}`, `${P0} ← ${g.title}`, goBtn(it.id), KW[it.id]); }));
    // 2) الإعدادات الإلزامية + إخفاء الشاشات (كل مفتاح لوحده)
    if (can('manage_admin_settings')) {
      const S = `${P0} ← الإدارة والصلاحيات ← ⚙️ الصلاحيات والإعدادات الإلزامية`;
      (window.ADMIN_SETTING_ITEMS || (typeof ADMIN_SETTING_ITEMS !== 'undefined' ? ADMIN_SETTING_ITEMS : [])).forEach(it => add(it.label, S, openAndFlash(() => renderAdminSettingsPage(), it.label), it.desc));
      (typeof ADMIN_VIS_ITEMS !== 'undefined' ? ADMIN_VIS_ITEMS : []).forEach(it => add(it.label, S + ' ← إخفاء شاشات عن العميل', openAndFlash(() => renderAdminSettingsPage(), it.label), it.desc));
      SETTINGS_SECTIONS.forEach(([t, kw]) => add(t, S, openAndFlash(() => renderAdminSettingsPage(), t.replace(/^\S+\s/, '')), kw));
      // 3) كروت الرئيسية + قوائم المدد
      const H = `${P0} ← الإدارة والصلاحيات ← 🛠 التحكم في الشاشة الرئيسية والقوائم المنسدلة للمدد الزمنية`;
      [['قيمة المحفظة', 'hide_home_hero'], ['منحنى أداء المحفظة', 'hide_curve_home'], ['تنبيهات الأسعار', 'hide_home_alerts'], ['الاختصارات', 'hide_home_quick'], ['أحدث التوصيات', 'hide_home_recs'], ['استثماراتي', 'hide_home_holdings']]
        .forEach(([l]) => add(`كارت «${l}» في الرئيسية (إخفاء / إظهار)`, H, openAndFlash(() => renderHomeEdit(), l), 'الرئيسية كارت إخفاء إظهار'));
      const R = window.G_PERIODS || {};
      Object.keys(R).forEach(id => add(`⏱ ${R[id].l}`, `${H} ← ${R[id].scr}`, openAndFlash(() => renderHomeEdit(), R[id].l), 'مدة مدد فترة قائمة منسدلة افتراضي يوم اسبوع شهر سنة ' + R[id].o.map(x => x[1]).join(' ')));
    }
    // 4) صفحة اللاندينج
    if (can('edit_site_design')) LANDING.forEach(([tab, t, kw]) => add(t, `${P0} ← المحتوى والتنسيق ← 🏁 صفحة اللاندينج`, () => renderAdminLandingPage(tab), kw));
    if (can('edit_site_design')) add('📎 السماح للمحلل برفع صورة أو PDF مع التوصية', `${P0} ← المحتوى والتنسيق ← 📢 شاشة التوصيات (النصوص والأزرار والافتراضيات)`, openAndFlash(() => renderAdminRecsCfg(), 'المرفقات من جهاز المحلل'), 'مرفق ملف صورة pdf رفع توصية محلل');
    if (can('manage_site_content')) [['الشروط والأحكام', 'terms'], ['سياسة الخصوصية', 'privacy'], ['سياسة استرداد الاشتراك', 'refund'], ['عن GRIFFINE', 'about'], ['تواصل معنا', 'contact']]
      .forEach(([l]) => add(`📝 نص «${l}»`, `${P0} ← المحتوى والتنسيق ← 📝 نصوص شاشات الموقع`, openAndFlash(() => renderSiteTextsAdminPage(), l), 'نص صفحة تعديل'));
    return L;
  }
  // فتح الصفحة وتنوير البند (أصغر عنصر فيه النص)
  function openAndFlash(open, text){
    return async () => {
      try { await open(); } catch(e){}
      const t0 = Date.now(), want = norm(text);
      const tick = () => {
        const els = [...document.querySelectorAll('#app h2, #app h3, #app .setting-label, #app .section-title, #app label, #app b, #app .gper-row-t, #app .gs-hctl, #app button')];
        const hit = els.find(e => norm(e.textContent).includes(want));
        if (hit) { const box = hit.closest('.setting-row, .gper-row, .section-card, label, .gs-hctl') || hit; try { box.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch(e){} box.classList.add('asr-flash'); setTimeout(() => box.classList.remove('asr-flash'), 3500); return; }
        if (Date.now() - t0 < 6000) setTimeout(tick, 300);
      };
      setTimeout(tick, 350);
    };
  }

  async function screensIndex(){
    try {
      const cat = window.GShell && GShell.getScreenCatalog ? await GShell.getScreenCatalog() : [];
      return cat.map(it => ({ title: it.label, path: `شاشات الموقع ← ${it.section}`, go: () => { try { it.arg !== undefined ? it.fn(it.arg) : it.fn(); } catch(e){} }, k: norm(it.label + ' ' + it.section) }));
    } catch(e){ return []; }
  }

  let IDX = null, SCR = null;
  window.adminSearchHtml = () => window.__isAdmin ? `<div class="asr" id="asrBox"><input type="search" id="asrInput" placeholder="🔎 ابحث في لوحة التحكم: أي إعداد أو شاشة أو زرار (مثلًا واتساب / الدفع / العدادات / إخفاء)" autocomplete="off" aria-label="بحث في لوحة التحكم"><div class="asr-res" id="asrRes" hidden></div></div>` : '';
  window.adminSearchWire = function(){
    const inp = document.getElementById('asrInput'), res = document.getElementById('asrRes'); if (!inp || !res) return;
    let last = [];
    const run = async () => {
      const q = norm(inp.value); if (q.length < 2) { res.hidden = true; res.innerHTML = ''; return; }
      if (!IDX) IDX = buildIndex(); if (!SCR) SCR = await screensIndex();
      const words = q.split(' ').filter(Boolean);
      const score = (it) => words.every(w => it.k.includes(w)) ? (norm(it.title).includes(q) ? 3 : 1) + (norm(it.title).startsWith(q) ? 1 : 0) : 0;
      last = [...IDX, ...SCR].map(it => [score(it), it]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 30).map(x => x[1]);
      res.hidden = false;
      res.innerHTML = last.length ? `<div class="asr-n">${last.length} نتيجة</div>` + last.map((it, i) => `<button type="button" class="asr-it" data-i="${i}"><b>${E(it.title)}</b><small>📍 ${E(it.path)}</small></button>`).join('')
        : '<div class="asr-n">مفيش نتايج — جرّب كلمة تانية.</div>';
    };
    let t = null; inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 150); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && last[0]) { e.preventDefault(); res.hidden = true; last[0].go(); } if (e.key === 'Escape') { res.hidden = true; } });
    res.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; res.hidden = true; const it = last[+b.dataset.i]; if (it) it.go(); });
  };
})();
