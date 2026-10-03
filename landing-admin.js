/* =====================================================================
   GRIFFINE — landing-admin.js (الإصدار 108) — لوحة تحكم «صفحة اللاندينج» (زرار واحد في لوحة التحكم)
   ---------------------------------------------------------------------
   كل التحكم في مكان واحد:
     عام        : تشغيل/إيقاف الصفحة ، الشعار والعلامة المائية ، الألوان والخط (أو ثيم الموقع) ، القائمة وزرار التطبيق ، الفوتر
     الأقسام    : إظهار/إخفاء/ترتيب أي قسم + تعديل كل نصوصه وصوره + أقسام مخصصة جديدة (نص وصورة وزرار)
     الربط      : العدادات (حقيقي / يدوي / مخفي) ، آراء العملاء (حقيقية من الموقع مع اختيار اللي يظهر / يدوي / الاتنين / مقفول)
                  الأسئلة الشائعة (من المساعد الذكي / يدوي) ، الأسعار (حقيقية / توضيحية) والأسهم المعروضة
     العروض     : شريط علوي / كروت عروض / نافذة منبثقة (Upsell / Downsell / أي دعاية)
   الشكل التفصيلي (مكان ولون وخط أي زرار أو كلام) ← زرار «تعديل الشكل بالاستوديو»
   الحفظ: landing_api.php?action=save (صلاحية edit_site_design)
   ===================================================================== */
(function(){
  'use strict';
  const esc = (s) => escapeHtml(String(s == null ? '' : s));
  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setP = (o, p, v) => { const ks = p.split('.'); let a = o; ks.slice(0, -1).forEach(k => { if (a[k] == null) a[k] = /^\d+$/.test(k) ? [] : {}; a = a[k]; }); a[ks[ks.length - 1]] = v; };

  const ACTIONS = [['register', 'إنشاء حساب'], ['login', 'تسجيل الدخول'], ['plans', 'الباقات والأسعار'], ['section:features', 'قسم المميزات'], ['section:markets', 'قسم الأسواق'], ['section:calc', 'حاسبة المتوسط'], ['section:faq', 'الأسئلة'], ['url', 'رابط خارجي (https)']];
  const MOCKS = [['opps', 'البحث عن الفرص'], ['dca', 'جدول DCA'], ['recs', 'توصيات الخبراء'], ['analysis', 'التحليل الفني'], ['alerts', 'التنبيهات'], ['watch', 'قائمة المتابعة'], ['none', 'بدون شكل']];
  const MARKETS = ['مصر', 'السعودية', 'الإمارات', 'قطر', 'الكويت'];

  // حقول كل قسم: [المسار داخل القسم, العنوان, النوع, اختيارات]
  const GOLD = 'الكلام اللي بين [[ ]] بيظهر ذهبي';
  const HEAD = [['eyebrow', 'العنوان الصغير فوق', 'text'], ['title', 'العنوان (' + GOLD + ')', 'text'], ['sub', 'الوصف تحت العنوان', 'area']];
  const NAV = [['nav', 'اسمه في القائمة اللي فوق (فاضي = مش ظاهر في القائمة)', 'text']];
  const SCHEMA = {
    ticker: [],
    hero: [['pill', 'الشارة فوق العنوان', 'text'], ['title', 'العنوان الرئيسي (' + GOLD + ')', 'text'], ['words', 'الكلمات المتغيرة تحت العنوان (سطر لكل جملة)', 'lines'], ['lead', 'الوصف', 'area'], ['btn1', 'زرار إنشاء الحساب', 'text'], ['btn2', 'الزرار التاني (بيروح للمميزات)', 'text'], ['trust', 'نقاط الثقة (سطر لكل نقطة)', 'lines'], ['img', 'صورة بدل شاشة الموبايل (اختياري)', 'img'], ['toasts', 'إظهار الإشعارات الطايرة حوالين الموبايل', 'bool']],
    stats: [],
    markets: [...NAV, ...HEAD, ['note', 'ملاحظة تحت الأسعار', 'text']],
    features: [...NAV, ...HEAD, ['items', 'المميزات (كل ميزة: عنوان ونص ونقاط وشكل أو صورة)', 'list', [['title', 'العنوان (' + GOLD + ')', 'text'], ['text', 'النص', 'area'], ['checks', 'النقاط (سطر لكل نقطة)', 'lines'], ['mock', 'الشكل التوضيحي', 'select', MOCKS], ['img', 'صورة بدل الشكل (اختياري)', 'img']]]],
    services: [...HEAD, ['items', 'الخدمات', 'list', [['icon', 'الأيقونة (إيموجي)', 'text'], ['title', 'الاسم', 'text'], ['text', 'الوصف', 'area']]]],
    offers: [...HEAD, ['_hint', 'الكروت نفسها بتتعمل من تبويب «العروض والدعاية» (النوع: كارت)', 'hint']],
    calc: [...NAV, ...HEAD, ['btn', 'زرار تحت الحاسبة', 'text']],
    steps: [['eyebrow', 'العنوان الصغير', 'text'], ['title', 'العنوان', 'text'], ['items', 'الخطوات', 'list', [['title', 'العنوان', 'text'], ['text', 'الوصف', 'area']]]],
    reviews: [...NAV, ['eyebrow', 'العنوان الصغير', 'text'], ['title', 'العنوان', 'text'], ['_hint', 'مصدر الآراء واختيار اللي يظهر من تبويب «الربط بالموقع»', 'hint']],
    about: [...NAV, ['eyebrow', 'العنوان الصغير', 'text'], ['title', 'العنوان', 'text'], ['p1', 'الفقرة الأولى', 'area'], ['p2', 'الفقرة التانية', 'area'], ['btn', 'الزرار', 'text'], ['img', 'صورة بدل كروت القيم (اختياري)', 'img'], ['values', 'القيم', 'list', [['icon', 'أيقونة', 'text'], ['title', 'العنوان', 'text'], ['text', 'الوصف', 'text']]]],
    faq: [...NAV, ['eyebrow', 'العنوان الصغير', 'text'], ['title', 'العنوان', 'text'], ['_hint', 'مصدر الأسئلة من تبويب «الربط بالموقع»', 'hint']],
    cta: [['title', 'العنوان (' + GOLD + ')', 'text'], ['text', 'النص', 'area'], ['btn1', 'زرار إنشاء الحساب', 'text'], ['btn2', 'زرار الدخول', 'text']],
    custom: [['eyebrow', 'العنوان الصغير', 'text'], ['title', 'العنوان (' + GOLD + ')', 'text'], ['text', 'النص', 'area'], ['img', 'صورة', 'img'], ['layout', 'مكان الصورة', 'select', [['img-left', 'الصورة شمال'], ['img-right', 'الصورة يمين']]], ['btn', 'نص الزرار (فاضي = من غير زرار)', 'text'], ['action', 'الزرار بيودّي على', 'select', ACTIONS], ['url', 'الرابط (لو رابط خارجي)', 'text']]
  };

  // تصغير الصورة قبل الحفظ (أقصى عرض 1400 بكسل)
  function readImage(file, maxW){
    return new Promise((res, rej) => {
      if (!file || !/^image\//.test(file.type)) return rej(new Error('اختار صورة'));
      const fr = new FileReader();
      fr.onload = () => { const im = new Image(); im.onload = () => {
        const k = Math.min(1, (maxW || 1400) / im.width), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        let out = c.toDataURL('image/webp', .82); if (!/^data:image\/webp/.test(out)) out = c.toDataURL('image/jpeg', .85);
        res(out); }; im.onerror = () => rej(new Error('صورة غير صالحة')); im.src = fr.result; };
      fr.onerror = () => rej(new Error('تعذّر قراءة الصورة')); fr.readAsDataURL(file);
    });
  }

  async function renderAdminLandingPage(tab){
    const __tok = screenToken();
    pushNav(() => window.renderAdminLandingPage(tab));
    const email = await getSession();
    if (!email) return renderLogin();
    if (!window.__isAdmin) return renderHome();
    if (!hasPermission('edit_site_design')) return renderAdminHub();
    const L = window.GLanding;
    const d = await L.load(true);
    const rv = await apiGet('/landing_api.php?action=admin_reviews').catch(() => ({}));
    if (screenStale(__tok)) return;
    window.__lastPageKey = 'landing_admin';
    const C = L.merge(d.raw), live = d.live || { stats: {} }, allReviews = (rv && rv.reviews) || [];
    let cur = tab || 'general', open = {}, dirty = false;

    const val = (p) => getP(C, p);
    function field(p, label, type, opts){
      const v = val(p);
      if (type === 'hint') return `<div class="u-note u-fs12">${esc(label)}</div>`;
      if (type === 'bool') return `<label class="u-check lpa-f"><input type="checkbox" data-p="${p}" data-t="bool" ${v ? 'checked' : ''}> ${esc(label)}</label>`;
      if (type === 'area') return `<label class="lpa-f">${esc(label)}<textarea data-p="${p}" rows="3">${esc(v || '')}</textarea></label>`;
      if (type === 'lines') return `<label class="lpa-f">${esc(label)}<textarea data-p="${p}" data-t="lines" rows="4">${esc((v || []).join('\n'))}</textarea></label>`;
      if (type === 'num') return `<label class="lpa-f">${esc(label)}<input type="number" data-p="${p}" data-t="num" value="${esc(v == null ? '' : v)}" ${opts ? `min="${opts[0]}" max="${opts[1]}"` : ''}></label>`;
      if (type === 'select') return `<label class="lpa-f">${esc(label)}<select data-p="${p}">${opts.map(([k, l]) => `<option value="${esc(k)}" ${String(v) === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
      if (type === 'color') return `<label class="lpa-f">${esc(label)}<span class="lpa-color"><input type="color" data-p="${p}" value="${esc(/^#[0-9a-fA-F]{6}$/.test(v || '') ? v : '#C9A227')}"><span class="u-fs12 u-muted">${v ? esc(v) : 'افتراضي'}</span><button type="button" class="small secondary u-wa" data-clear="${p}">افتراضي</button></span></label>`;
      if (type === 'img') { const src = L.imgSrc(v);
        return `<div class="lpa-f">${esc(label)}<div class="lpa-img">${src ? `<img src="${esc(src)}" alt="">` : '<span class="u-muted u-fs12">مفيش صورة</span>'}<label class="small secondary lpa-up">📷 رفع صورة<input type="file" accept="image/*" data-img="${p}" hidden></label>${src ? `<button type="button" class="small danger u-wa" data-clear="${p}">حذف الصورة</button>` : ''}</div></div>`; }
      if (type === 'list') { const arr = Array.isArray(v) ? v : [];
        return `<div class="lpa-list"><div class="lpa-list-h"><b>${esc(label)}</b><button type="button" class="small u-wa" data-add="${p}">+ إضافة</button></div>
          ${arr.map((it, i) => `<div class="lpa-item"><div class="lpa-item-h"><b>${i + 1}. ${esc((it && (it.title || it.name || it.q || it.label)) || '')}</b><span><button type="button" class="small secondary u-wa" data-mv="${p}|${i}|-1">▲</button><button type="button" class="small secondary u-wa" data-mv="${p}|${i}|1">▼</button><button type="button" class="small danger u-wa" data-del="${p}|${i}">🗑️</button></span></div>
            ${opts.map(([k, l, t, o]) => field(`${p}.${i}.${k}`, l, t, o)).join('')}</div>`).join('') || '<div class="u-muted u-fs12">فاضي</div>'}</div>`; }
      return `<label class="lpa-f">${esc(label)}<input type="text" data-p="${p}" value="${esc(v || '')}"></label>`;
    }
    const card = (title, inner, note) => `<div class="section-card lpa-card"><h3 class="u-mt0">${title}</h3>${note ? `<div class="u-note u-fs12">${note}</div>` : ''}${inner}</div>`;
    const secName = (s) => s.custom ? ('قسم مخصص: ' + (s.title || 'بدون عنوان')) : ((L.BUILTIN.find(b => b[0] === s.id) || [])[1] || s.id);

    const TABS = {
      general: () => [
        card('تشغيل الصفحة', field('enabled', 'تشغيل صفحة اللاندينج للزوار (لو اتقفلت الزائر يشوف شاشة الترحيب القديمة)', 'bool')
          + `<div class="u-row u-mt8" style="gap:8px;flex-wrap:wrap"><button type="button" class="small u-wa" data-do="preview">👁 حفظ ومعاينة</button><button type="button" class="small secondary u-wa" data-do="studio">🖌️ تعديل الشكل بالاستوديو (مكان ولون وخط أي عنصر)</button><button type="button" class="small danger u-wa" data-do="reset">↺ رجوع للإعدادات الأصلية</button></div>`),
        card('الشعار والعلامة المائية', field('theme.logo', 'شعار مخصص (فاضي = شعار GRIFFINE الأصلي للفاتح والغامق)', 'img') + field('theme.wordmark', 'إظهار كلمة GRIFFINE جنب الشعار', 'bool')
          + field('watermark.on', 'الشعار كعلامة مائية في خلفية الصفحة (فاتح وغامق)', 'bool') + `<div class="lpa-grid">${field('watermark.opacity', 'شفافية العلامة المائية % (1-40)', 'num', [1, 40])}${field('watermark.size', 'حجم العلامة المائية (20-120)', 'num', [20, 120])}</div>`),
        card('الألوان والخط', field('theme.follow', 'الصفحة تمشي على ثيم الموقع وألوانه (فاتح/غامق + استوديو التصميم)', 'bool')
          + `<div class="lpa-grid">${field('theme.brand', 'اللون المميز (لو فصلت عن ثيم الموقع)', 'color')}${field('theme.ink', 'لون الأزرار الأساسية (لو فصلت عن ثيم الموقع)', 'color')}</div>`
          + field('theme.font', 'نوع الخط', 'select', [['', '— خط الموقع —'], ...((window.GStudio && GStudio.FONTS) || []).map(f => [f.name, f.label])]), 'الألوان بتتطبق في الوضعين الفاتح والغامق. للتحكم التفصيلي في أي زرار أو كلام استخدم «تعديل الشكل بالاستوديو».'),
        card('القائمة اللي فوق وزرار التطبيق', `<div class="lpa-grid">${field('nav.login', 'زرار تسجيل الدخول', 'text')}${field('nav.register', 'زرار إنشاء الحساب', 'text')}</div>` + field('nav.links', 'إظهار روابط الأقسام في القائمة', 'bool')
          + field('app.on', 'زرار «تحميل التطبيق» جنب زرار الليلي/النهاري', 'bool') + `<div class="lpa-grid">${field('app.label', 'اسم الزرار', 'text')}${field('app.android', 'رابط Google Play (اختياري)', 'text')}${field('app.ios', 'رابط App Store (اختياري)', 'text')}</div>` + field('app.note', 'الرسالة اللي بتظهر لما يدوس الزرار', 'area'),
          'لو مفيش روابط متاجر: الزرار بيثبّت الموقع كتطبيق على الجهاز (PWA) أو بيشرح طريقة الإضافة للشاشة الرئيسية.'),
        card('الفوتر', field('footer.text', 'النبذة تحت الشعار', 'area') + field('footer.disclaimer', 'تنبيه المخاطر', 'area'))
      ].join(''),
      sections: () => card('الأقسام (الترتيب من فوق لتحت)', C.sections.map((s, i) => `<div class="lpa-sec ${s.on === false ? 'off' : ''}">
          <div class="lpa-sec-h"><label class="u-check"><input type="checkbox" data-p="sections.${i}.on" data-t="bool" ${s.on !== false ? 'checked' : ''}> <b>${esc(secName(s))}</b></label>
            <span><label class="u-check u-fs12"><input type="checkbox" data-p="sections.${i}.band" data-t="bool" ${s.band ? 'checked' : ''}> خلفية مختلفة</label>
            <button type="button" class="small secondary u-wa" data-smv="${i}|-1">▲</button><button type="button" class="small secondary u-wa" data-smv="${i}|1">▼</button>
            ${(SCHEMA[s.custom ? 'custom' : s.id] || []).length ? `<button type="button" class="small u-wa" data-open="${esc(s.id)}">${open[s.id] ? 'إخفاء النصوص' : '✏️ تعديل النصوص والصور'}</button>` : ''}
            ${s.custom ? `<button type="button" class="small danger u-wa" data-sdel="${i}">🗑️</button>` : ''}</span></div>
          ${open[s.id] ? `<div class="lpa-sec-b">${(SCHEMA[s.custom ? 'custom' : s.id] || []).map(([k, l, t, o]) => field(s.custom ? `sections.${i}.${k}` : `${s.id}.${k}`, l, t, o)).join('')}</div>` : ''}
        </div>`).join('') + `<button type="button" class="u-wa u-mt10" data-do="addsec">+ إضافة قسم مخصص (نص وصورة وزرار)</button>`, 'علّم على القسم عشان يظهر، واستخدم ▲▼ للترتيب. شريط الأسعار بياخد أسهمه من إعدادات الأسعار في «الربط بالموقع».'),
      links: () => {
        const hidden = new Set((C.reviews.hidden || []).map(Number));
        return [
          card('العدادات', C.stats.items.map((it, i) => `<div class="lpa-item"><div class="lpa-grid">${field(`stats.items.${i}.label`, 'الاسم', 'text')}${field(`stats.items.${i}.icon`, 'أيقونة', 'text')}${field(`stats.items.${i}.mode`, 'المصدر', 'select', [['real', 'حقيقي من الموقع'], ['manual', 'رقم أكتبه بنفسي'], ['off', 'مخفي']])}${field(`stats.items.${i}.value`, 'الرقم اليدوي', 'num')}</div><div class="u-fs12 u-muted">الرقم الحقيقي دلوقتي: <b>${(+live.stats[it.key] || 0).toLocaleString('en-US')}</b></div></div>`).join(''), 'الزوار = زيارات صفحة اللاندينج (مرة لكل جلسة) · المستخدمين = الحسابات المسجلة · الخطط = خطط DCA وGrid · التنبيهات = التنبيهات اللي اتبعتت.' +
            `<br><b>قبل الإطلاق:</b> خلّي المصدر «رقم أكتبه بنفسي» واكتب الأرقام المناسبة. عداد الزوار الحقيقي واقف ومش بيحسب زياراتك أو زيارات الموظفين.
            <br><b>بعد الإطلاق وحضور زوار حقيقيين:</b> دوس الزرار ده ← عداد الزوار يتصفّر وكل العدادات تبقى حقيقية.<br><button type="button" class="small u-wa u-mt6" data-do="statsLive">🚀 ابدأ الأرقام الحقيقية (بعد الإطلاق)</button>`),
          card('آراء العملاء', `<div class="lpa-grid">${field('reviews.mode', 'المصدر', 'select', [['real', 'حقيقية من الموقع (شاشة آراء العملاء)'], ['manual', 'أكتبها بنفسي'], ['both', 'الاتنين مع بعض'], ['off', 'مقفولة (القسم مخفي)']])}${field('reviews.min', 'أقل تقييم يظهر (1-5)', 'num', [1, 5])}${field('reviews.count', 'أقصى عدد آراء', 'num', [1, 30])}</div>
            <h4>الآراء الحقيقية من الموقع (${allReviews.length}) — علّم على اللي يظهر</h4>
            <div class="lpa-reviews">${allReviews.map(r => `<label class="lpa-rv ${r.stars < (+C.reviews.min || 4) ? 'low' : ''}"><input type="checkbox" data-rv="${r.id}" ${hidden.has(r.id) ? '' : 'checked'}> <span><b>${esc(r.name)}</b> ${'★'.repeat(r.stars)} <small class="u-muted">${esc(r.date)}${r.stars < (+C.reviews.min || 4) ? ' · أقل من الحد الأدنى' : ''}</small><br>${esc(r.text)}</span></label>`).join('') || '<div class="u-muted u-fs12">لسه مفيش آراء — العملاء بيكتبوا آراءهم من شاشة «آراء العملاء» في حسابهم.</div>'}</div>`
            + field('reviews.manual', 'آراء مكتوبة يدويًا', 'list', [['name', 'الاسم', 'text'], ['city', 'المدينة / الوصف', 'text'], ['stars', 'التقييم (1-5)', 'num', [1, 5]], ['text', 'الرأي', 'area'], ['on', 'ظاهر', 'bool']])),
          card('الأسئلة الشائعة', `<div class="lpa-grid">${field('faq.mode', 'المصدر', 'select', [['site', 'من أسئلة المساعد الذكي في الموقع'], ['manual', 'أكتبها بنفسي'], ['both', 'اليدوي الأول وبعده أسئلة الموقع'], ['off', 'مقفولة (القسم مخفي)']])}${field('faq.count', 'أقصى عدد أسئلة', 'num', [1, 40])}</div>
            <div class="u-fs12 u-muted">أسئلة المساعد الذكي النشطة دلوقتي: ${(live.faq || []).length} <button type="button" class="small secondary u-wa" data-do="faqadmin">تعديلها</button></div>`
            + field('faq.manual', 'أسئلة مكتوبة يدويًا', 'list', [['q', 'السؤال', 'text'], ['a', 'الإجابة', 'area']])),
          card('الأسعار والمنحنيات', field('markets.mode', 'مصدر الأسعار', 'select', [['live', 'حقيقية من مصدر أسعار الموقع (متأخرة حتى 15 دقيقة)'], ['demo', 'توضيحية (مش مربوطة بالموقع)']])
            + field('markets.tabs', 'تبويبات الأسواق', 'list', [['label', 'اسم التبويب', 'text'], ['market', 'السوق', 'select', MARKETS.map(m => [m, m])], ['symbols', 'رموز الأسهم (مفصولة بفاصلة، لحد 8)', 'text']]), 'الأسعار الحقيقية بتتحمّل في الخلفية وبتتخزن 6 ساعات. لو مصدر الأسعار مش متاح بتظهر الأسعار التوضيحية.')
        ].join(''); },
      promos: () => card('العروض والدعاية', field('promos', 'العروض', 'list', [['on', 'مفعّل', 'bool'], ['type', 'النوع', 'select', [['bar', 'شريط أعلى الصفحة'], ['card', 'كارت في قسم العروض'], ['popup', 'نافذة منبثقة (مرة في الجلسة)']]], ['title', 'العنوان (' + GOLD + ')', 'text'], ['text', 'النص', 'area'], ['btn', 'نص الزرار', 'text'], ['action', 'الزرار بيودّي على', 'select', ACTIONS], ['url', 'الرابط (لو رابط خارجي)', 'text'], ['bg', 'لون الخلفية', 'color'], ['color', 'لون الكلام', 'color'], ['img', 'صورة (اختياري)', 'img'], ['delay', 'النافذة المنبثقة تظهر بعد (ثانية)', 'num', [1, 120]]]),
        'مثال Upsell: «رقّي لباقة سنوية ووفّر شهرين» بزرار «الباقات والأسعار». Downsell: «باقة شهرية بسعر أقل» … الكروت بتظهر في قسم «العروض والدعاية» (فعّله من تبويب الأقسام).')
    };

    const TAB_NAMES = [['general', '⚙️ عام'], ['sections', '🧩 الأقسام والنصوص'], ['links', '🔗 الربط بالموقع'], ['promos', '📣 العروض والدعاية']];
    function draw(){
      const y = window.scrollY;
      app.innerHTML = `<div class="container wide lpa">${logoHeader()}
        <div class="topbar"><div>${pageTitle('landing_admin', '🏁 صفحة اللاندينج')}</div><button class="secondary small" id="lpaBack">🛡️ رجوع للوحة التحكم</button></div>
        <div class="info u-fs13">الواجهة اللي الزائر بيشوفها قبل ما يسجّل دخول. كل حاجة هنا بتتحفظ لما تدوس «حفظ» تحت. زرار تسجيل الدخول وإنشاء الحساب بيفتحوا شاشات الدخول الحالية للموقع.</div>
        <div class="lpa-tabs">${TAB_NAMES.map(([k, l]) => `<button type="button" class="small ${k === cur ? '' : 'secondary'} u-wa" data-tab="${k}">${l}</button>`).join('')}</div>
        <div id="lpaBody">${TABS[cur]()}</div>
        <div class="lpa-save"><span id="lpaDirty" class="u-fs12">${dirty ? '● فيه تعديلات مش محفوظة' : ''}</span><button type="button" class="u-wa" id="lpaSave">💾 حفظ</button><button type="button" class="secondary u-wa" data-do="preview">👁 حفظ ومعاينة</button></div>
      </div>`;
      window.scrollTo(0, y);
    }
    const markDirty = () => { dirty = true; const e = document.getElementById('lpaDirty'); if (e) e.textContent = '● فيه تعديلات مش محفوظة'; };
    async function save(silent){
      const b = document.getElementById('lpaSave'); if (b) { b.disabled = true; b.textContent = '⏳ جارٍ الحفظ...'; }
      const r = await apiPost('/landing_api.php', { action: 'save', config: JSON.stringify(C) }).catch(() => ({ success: false, message: 'تعذّر الاتصال بالسيرفر' }));
      if (b) { b.disabled = false; b.textContent = '💾 حفظ'; }
      if (r && r.success) { dirty = false; await L.load(true); if (!silent && GShell && GShell.toast) GShell.toast('تم حفظ صفحة اللاندينج', 'ok'); const e = document.getElementById('lpaDirty'); if (e) e.textContent = ''; return true; }
      if (GShell && GShell.toast) GShell.toast((r && r.message) || 'تعذّر الحفظ', 'err'); return false;
    }
    draw();

    app.oninput = app.onchange = (e) => {
      const t = e.target; if (!t.closest || !t.closest('.lpa')) return;
      if (t.dataset.rv) { const id = +t.dataset.rv; const h = new Set((C.reviews.hidden || []).map(Number)); if (t.checked) h.delete(id); else h.add(id); C.reviews.hidden = [...h]; markDirty(); return; }
      if (t.dataset.img && e.type === 'change') { const f = t.files && t.files[0]; readImage(f).then(u => { setP(C, t.dataset.img, u); markDirty(); draw(); }).catch(err => GShell.toast(err.message, 'err')); return; }
      const p = t.dataset.p; if (!p) return;
      let v = t.value;
      if (t.dataset.t === 'bool') v = t.checked;
      else if (t.dataset.t === 'lines') v = t.value.split('\n').map(s => s.trim()).filter(Boolean);
      else if (t.dataset.t === 'num') v = t.value === '' ? '' : +t.value;
      setP(C, p, v); markDirty();
      if (t.type === 'color') { const s = t.parentElement.querySelector('span'); if (s) s.textContent = v; }
      if (e.type === 'change' && (/^sections\.\d+\.on$/.test(p))) t.closest('.lpa-sec').classList.toggle('off', !v);
    };
    app.onclick = async (e) => {
      const b = e.target.closest('button'); if (!b || !b.closest('.lpa')) return;
      if (b.id === 'lpaBack') { if (dirty && !await gConfirm('فيه تعديلات مش محفوظة — تخرج من غير حفظ؟')) return; app.oninput = app.onchange = app.onclick = null; return goAdminHome(); }
      if (b.id === 'lpaSave') return save();
      const ds = b.dataset;
      if (ds.tab) { cur = ds.tab; return draw(); }
      if (ds.open) { open[ds.open] = !open[ds.open]; return draw(); }
      if (ds.clear) { setP(C, ds.clear, ''); markDirty(); return draw(); }
      if (ds.add) { const arr = getP(C, ds.add) || []; arr.push({ on: true, stars: 5, type: 'card', action: 'register', mock: 'none', market: 'مصر' }); setP(C, ds.add, arr); markDirty(); return draw(); }
      if (ds.del) { const [p, i] = ds.del.split('|'); getP(C, p).splice(+i, 1); markDirty(); return draw(); }
      if (ds.mv) { const [p, i, dir] = ds.mv.split('|'); const a = getP(C, p), j = +i + +dir; if (j < 0 || j >= a.length) return; [a[+i], a[j]] = [a[j], a[+i]]; markDirty(); return draw(); }
      if (ds.smv) { const [i, dir] = ds.smv.split('|').map(Number), j = i + dir; if (j < 0 || j >= C.sections.length) return; [C.sections[i], C.sections[j]] = [C.sections[j], C.sections[i]]; markDirty(); return draw(); }
      if (ds.sdel) { if (!await gConfirm('حذف القسم المخصص ده؟')) return; C.sections.splice(+ds.sdel, 1); markDirty(); return draw(); }
      if (ds.do === 'addsec') { const id = 'c' + Date.now().toString(36); C.sections.push({ id, custom: true, on: true, band: false, title: 'عنوان القسم الجديد', text: '', img: '', layout: 'img-left', btn: '', action: 'register', url: '' }); open[id] = true; markDirty(); return draw(); }
      if (ds.do === 'statsLive') {   // الإصدار 146
        if (!await gConfirm('بدء الأرقام الحقيقية؟ عداد الزوار هيتصفّر وكل العدادات هتعرض الأرقام الحقيقية من الموقع.')) return;
        const r = await apiPost('/landing_api.php', { action: 'stats_reset' }).catch(() => null);
        if (!(r && r.success)) return GShell.toast('تعذّر التصفير', 'err');
        C.stats.items.forEach(it => { if (it.mode !== 'off') it.mode = 'real'; }); markDirty();
        if (await save(true)) { GShell.toast('🚀 العدادات بقت حقيقية — عداد الزوار بدأ من الصفر', 'ok'); return draw(); } return;
      }
      if (ds.do === 'preview') { if (await save(true)) { app.oninput = app.onchange = app.onclick = null; renderLanding(true); } return; }
      if (ds.do === 'studio') { if (await save(true)) { app.oninput = app.onchange = app.onclick = null; await renderLanding(true); if (window.GStudio && GStudio.openEditor) GStudio.openEditor(); } return; }
      if (ds.do === 'faqadmin') { app.oninput = app.onchange = app.onclick = null; return renderFaqAdminPage(); }
      if (ds.do === 'reset') { if (!await gConfirm('رجوع كل إعدادات صفحة اللاندينج للأصل؟ (النصوص والصور والعروض هتتمسح)')) return;
        const r = await apiPost('/landing_api.php', { action: 'save', config: 'null' }).catch(() => ({})); if (r && r.success) { await L.load(true); app.oninput = app.onchange = app.onclick = null; return window.renderAdminLandingPage(cur); } }
    };
  }
  window.renderAdminLandingPage = renderAdminLandingPage;
})();
