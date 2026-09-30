/* =====================================================================
   GRIFFINE — landing.js (الإصدار 108) — صفحة اللاندينج (واجهة الموقع قبل تسجيل الدخول)
   ---------------------------------------------------------------------
   - بتظهر لأي زائر مش مسجّل مكان شاشة الترحيب (renderPublicHome) لو الأدمن مشغّلها
   - كل النصوص والصور والأقسام والعروض من لوحة التحكم ← «صفحة اللاندينج» (landing-admin.js)
   - الألوان من ثيم الموقع (فاتح/غامق + استوديو التصميم) ، واستوديو التصميم يقدر يعدّل أي عنصر فيها
   - الربط بالموقع (كل واحد يتفصل من لوحة التحكم): عدادات حقيقية / آراء العملاء / الأسئلة الشائعة / الأسعار
   - تسجيل الدخول وإنشاء الحساب = نفس شاشات الموقع الحالية (renderLogin / renderRegister)
   - أي نص بيتعرض بـ escapeHtml ، والكلام بين [[ ]] بيظهر بالذهبي
   ===================================================================== */
(function(){
  'use strict';
  const LP = window.GLanding = {};

  /* ---------------------------------------------------------------------
     01. الإعدادات الافتراضية
     --------------------------------------------------------------------- */
  const BUILTIN = [
    ['ticker', 'شريط الأسعار المتحرك'], ['hero', 'الواجهة الرئيسية (العنوان وشاشة الموبايل)'], ['stats', 'العدادات (الزوار / المستخدمين / الخطط / التنبيهات)'],
    ['markets', 'الأسواق المالية والمنحنيات'], ['features', 'شرح المميزات بالصور'], ['services', 'كل أقسام الموقع'], ['offers', 'العروض والدعاية (كروت)'],
    ['calc', 'حاسبة متوسط التكلفة'], ['steps', 'ابدأ في 3 خطوات'], ['reviews', 'آراء العملاء'], ['about', 'من نحن'], ['faq', 'الأسئلة الشائعة'], ['cta', 'الدعوة الأخيرة للتسجيل']
  ];
  LP.BUILTIN = BUILTIN;
  LP.DEFAULTS = {
    enabled: true,
    sections: BUILTIN.map(([id]) => ({ id, on: true, band: ['markets', 'calc', 'reviews'].includes(id) })),
    theme: { follow: true, brand: '', ink: '', font: '', logo: '', wordmark: true },
    watermark: { on: true, opacity: 6, size: 70 },
    nav: { login: 'تسجيل الدخول', register: 'ابدأ مجانًا', links: true },
    app: { on: true, label: 'حمّل التطبيق', android: '', ios: '', note: 'ثبّت GRIFFINE على موبايلك أو كمبيوترك وافتحه بضغطة واحدة زي أي تطبيق.' },
    hero: {
      pill: 'البورصة المصرية · الخليج · الأسواق العالمية',
      title: 'استثمر بخطة واضحة…',
      words: ['مش بالحظ.', 'بمتوسط تكلفة أذكى.', 'بتوصيات خبراء.', 'بتنبيه في الوقت الصح.', 'بفرص مدروسة.'],
      lead: 'GRIFFINE منصة عربية بتنظّم استثمارك في الأسهم: خطط متوسط التكلفة وخطط الشبكة، توصيات وتحليلات من خبراء ماليين، وبتدوّر لك على الفرص الشرائية بالمؤشرات الفنية، وتنبّهك في اللحظة المناسبة على الموقع والإيميل والواتساب.',
      btn1: 'أنشئ حسابك مجانًا', btn2: 'اكتشف المميزات',
      trust: ['بياناتك محمية ومشفّرة', 'أسعار محدّثة باستمرار', 'بالعربي وسهل الاستخدام'],
      img: '', toasts: true
    },
    stats: { items: [
      { key: 'visitors', icon: '👁️', label: 'زيارة للموقع', mode: 'real', value: 0 },
      { key: 'users', icon: '👥', label: 'مستخدم مسجّل', mode: 'real', value: 0 },
      { key: 'plans', icon: '📈', label: 'خطة استثمار', mode: 'real', value: 0 },
      { key: 'alerts', icon: '🔔', label: 'تنبيه اتبعت للمستخدمين', mode: 'real', value: 0 }
    ] },
    markets: {
      nav: 'الأسواق', eyebrow: 'الأسواق المالية', title: 'الأسواق كلها [[قدامك في شاشة واحدة]]',
      sub: 'البورصة المصرية وأسواق الخليج — بالأسعار والمنحنيات.', mode: 'live',
      note: 'الأسعار متأخرة حتى 15 دقيقة ولأغراض المتابعة فقط.',
      tabs: [
        { label: 'مصر', market: 'مصر', symbols: 'COMI,TMGH,ABUK,ETEL,HRHO' },
        { label: 'السعودية', market: 'السعودية', symbols: '2222,1120,2010,7010,1180' },
        { label: 'الإمارات', market: 'الإمارات', symbols: 'EMAAR,FAB,DIB,ALDAR,EMIRATESNBD' },
        { label: 'قطر', market: 'قطر', symbols: 'QNBK,IQCD,CBQK,QIBK,ORDS' },
        { label: 'الكويت', market: 'الكويت', symbols: 'NBK,KFH,ZAIN,BOUBYAN,AGLTY' }
      ]
    },
    features: {
      nav: 'المميزات', eyebrow: 'ليه GRIFFINE؟', title: 'أدوات المحترفين… [[بسهولة تناسب الكل]]',
      sub: 'كل اللي محتاجه عشان تبني مركزك في السهم بعقل، تتابعه، وتعرف تبيع إمتى.',
      items: [
        { mock: 'opps', title: 'البحث عن [[الفرص الشرائية]] بالمؤشرات الفنية', text: 'اختار لحد 5 مؤشرات (RSI، MACD، المتوسطات المتحركة، بولينجر، الستوكاستك، أحجام التداول…) وحدّد الشروط، وGRIFFINE يفحص أسهم سوقك كله ويبعتلك الأسهم اللي انطبقت عليها الشروط.', checks: ['شراء أو بيع — والشروط بتتعكس تلقائيًا مع البيع', 'إطار زمني يومي، أسبوعي، شهري أو ساعات', 'تحذير لو الشروط اللي اخترتها متعارضة مع بعض', 'من نتيجة الفرصة لخطة DCA أو Grid بضغطة واحدة'], img: '' },
        { mock: 'dca', title: 'خطط [[متوسط التكلفة DCA]] وخطط الشبكة Grid', text: 'قسّم رأس مالك على مستويات شراء مدروسة كل ما السعر ينزل بنسبة تحددها، مع زيادة مبلغ الشراء تدريجيًا. GRIFFINE يحسب لك متوسط التكلفة وسعر البيع المستهدف والربح لحظة بلحظة على آخر سعر.', checks: ['جدول مستويات كامل: السعر، المبلغ، والمتوسط بعد كل مستوى', 'سعر الخروج بنسبة الربح اللي تحددها للمركز كله', 'البيع الجزئي والصفقات المقفولة وأرشيف الأرباح', 'خطط الشبكة Grid: شراء وبيع متكرر على كل مستوى في نطاق سعري'], img: '' },
        { mock: 'recs', title: 'توصيات من [[خبراء ماليين]]', text: 'فريق من المحللين بيتابع السوق ويبعتلك توصيات واضحة على الأسهم في سوق حسابك: سعر الدخول والهدف ووقف الخسارة، مع إشعار فوري أول ما التوصية تنزل.', checks: ['توصيات لسوق حسابك: مصر أو السعودية أو الإمارات وغيرها', 'سعر دخول وأهداف ووقف خسارة لكل توصية', 'إشعار على الموقع والإيميل أول ما التوصية تنزل', 'سجل التوصيات السابقة ونتايجها'], img: '' },
        { mock: 'analysis', title: '[[التحليلات المالية]] والفنية للأسهم', text: 'صفحة لكل سهم بالسعر والمنحنى والمؤشرات الفنية، وأدوات تحليل تساعدك تفهم اتجاه السهم ومناطق الدعم والمقاومة قبل ما تاخد قرارك.', checks: ['منحنى السعر والمؤشرات الفنية لكل سهم', 'مناطق الدعم والمقاومة واتجاه السهم', 'تقارير التنويع وتوزيع المحفظة'], img: '' },
        { mock: 'alerts', title: 'تنبيهات [[في اللحظة المناسبة]]', text: 'متقعدش قدام الشاشة طول اليوم. GRIFFINE يتابع أسعار خططك وقائمة متابعتك ويبعتلك تنبيه أول ما السعر يوصل لمستوى الشراء الجاي أو هدف البيع — على الموقع وبالإيميل وبالواتساب.', checks: ['تنبيه بمستوى الشراء الجاي وسعر البيع المستهدف لكل خطة', 'تنبيهات سعر مخصصة: أكبر من أو أقل من، ومرة واحدة أو متكررة', 'إنت اللي بتختار القناة: الموقع، الإيميل، أو الواتساب'], img: '' },
        { mock: 'watch', title: 'تابع أسهمك [[ومحفظتك]] بوضوح', text: 'قائمة متابعة للأسهم اللي بتراقبها، ومنحنى أداء محفظتك بقيمتها الحالية وأرباحك المحققة وغير المحققة، وتقرير صفقات كامل تنزله PDF أو Excel.', checks: ['قائمة متابعة بالأسعار والتغيّر اليومي', 'منحنى أداء المحفظة وتوزيعها على الأسهم', 'تقرير صفقات كامل وسلة محذوفات تسترجع منها أي حاجة'], img: '' }
      ]
    },
    services: {
      eyebrow: 'الخدمات', title: 'كل [[أقسام الموقع]]', sub: '',
      items: [
        { icon: '📊', title: 'خطط متوسط التكلفة DCA', text: 'مستويات شراء مدروسة ومتوسط تكلفة محسوب تلقائيًا.' },
        { icon: '🧮', title: 'خطط الشبكة Grid', text: 'شراء وبيع متكرر داخل نطاق سعري وجني أرباح كل دورة.' },
        { icon: '🎯', title: 'البحث عن الفرص', text: 'فحص أسهم السوق بالمؤشرات الفنية وتنبيهك بالنتايج.' },
        { icon: '📢', title: 'توصيات من خبراء ماليين', text: 'توصيات بسعر دخول وأهداف ووقف خسارة لسوق حسابك.' },
        { icon: '🔬', title: 'التحليلات المالية', text: 'تحليل فني ومالي للأسهم ومنحنيات ومؤشرات.' },
        { icon: '🔔', title: 'تنبيهات الأسعار', text: 'على الموقع والإيميل والواتساب في اللحظة المناسبة.' },
        { icon: '💼', title: 'المحفظة والتقارير', text: 'قيمة المحفظة وتوزيعها وتقارير PDF وExcel.' },
        { icon: '⭐', title: 'قائمة المتابعة', text: 'راقب الأسهم اللي تهمك بالسعر والتغيّر اليومي.' }
      ]
    },
    offers: { eyebrow: 'عروض', title: 'عروض [[GRIFFINE]]', sub: '' },
    calc: { nav: 'حاسبة المتوسط', eyebrow: 'جرّبها بنفسك', title: 'شوف [[متوسط التكلفة]] بينزل إزاي', sub: 'حرّك الإعدادات وشوف إزاي الشراء على مستويات بيقلّل متوسط سعرك، وبيقرّب نقطة الربح.', btn: 'اعمل خطتك الحقيقية الآن' },
    steps: { eyebrow: 'ابدأ في 3 خطوات', title: 'من التسجيل لأول خطة [[في دقايق]]', items: [
      { title: 'أنشئ حسابك', text: 'سجّل بإيميلك واختار سوق حسابك: مصر أو السعودية أو الإمارات أو غيرها.' },
      { title: 'اعمل خطتك', text: 'اختار السهم ورأس المال ونسب النزول والربح — والباقي علينا.' },
      { title: 'استقبل التنبيهات', text: 'نبلغك بمستوى الشراء الجاي وهدف البيع والتوصيات الجديدة، وتابع من أي جهاز.' }
    ] },
    reviews: { nav: 'آراء العملاء', eyebrow: 'آراء العملاء', title: 'بيقولوا إيه [[عن GRIFFINE]]', mode: 'real', min: 4, count: 6, hidden: [], manual: [] },
    about: { nav: 'من نحن', eyebrow: 'من نحن', title: 'فريق عربي بيحب [[الاستثمار المنظّم]]',
      p1: 'GRIFFINE اتعمل عشان المستثمر العربي يلاقي أداة بلغته تنظّم قراراته في البورصة: خطة واضحة قبل الشراء، ومتابعة هادية بعده، وتنبيه في الوقت الصح بدل التوتر وتقلبات السوق.',
      p2: 'بندعم البورصة المصرية وأسواق الخليج، ومعانا فريق من الخبراء الماليين للتوصيات والتحليلات، وبنطوّر المنصة باستمرار بناءً على اقتراحات مستخدمينا.',
      btn: 'انضم لينا', img: '',
      values: [
        { icon: '🧭', title: 'الوضوح', text: 'كل رقم محسوب قدامك: المتوسط، الهدف، والربح.' },
        { icon: '🛡️', title: 'الأمان', text: 'بياناتك مشفّرة ومحمية، ومحدش يشوف خططك غيرك.' },
        { icon: '⚡', title: 'السرعة', text: 'أسعار وتنبيهات بتوصلك أول بأول.' },
        { icon: '🤝', title: 'الدعم', text: 'فريق دعم بيرد عليك من جوه الموقع.' }
      ] },
    faq: { nav: 'الأسئلة', eyebrow: 'أسئلة شائعة', title: 'عندك [[سؤال؟]]', mode: 'both', count: 10, manual: [
      { q: 'يعني إيه خطة متوسط التكلفة (DCA)؟', a: 'إنك تشتري السهم على كذا مستوى كل ما سعره ينزل بنسبة محددة، فمتوسط سعر شرايك بيقل، ولما السهم يرتد بنسبة بسيطة تقدر تبيع المركز كله بربح.' },
      { q: 'إيه الفرق بين خطة DCA وخطة الشبكة Grid؟', a: 'DCA بتبني مركز واحد وتبيعه مرة واحدة عند الهدف. Grid بتقسم نطاق سعري لمستويات، وكل مستوى بيشتري ويبيع لوحده بشكل متكرر، فبتجني أرباح من تذبذب السعر.' },
      { q: 'الموقع بيدعم أنهي أسواق؟', a: 'البورصة المصرية وأسواق الخليج (السعودية، الإمارات، قطر، الكويت وغيرها).' },
      { q: 'مين اللي بيقدّم التوصيات والتحليلات؟', a: 'فريق من الخبراء الماليين بيتابع السوق وبينزّل التوصيات والتحليلات لسوق حسابك. التوصيات للاسترشاد والقرار النهائي دايمًا ليك.' },
      { q: 'التنبيهات بتوصل إزاي؟', a: 'على الموقع نفسه، وبالإيميل، وبالواتساب — وإنت بتختار القنوات اللي تناسبك.' }
    ] },
    cta: { title: 'جاهز تستثمر [[بخطة؟]]', text: 'أنشئ حسابك دلوقتي وابدأ أول خطة ليك في دقايق.', btn1: 'أنشئ حسابك مجانًا', btn2: 'عندي حساب — دخول' },
    footer: { text: 'منصة عربية لتنظيم الاستثمار في الأسهم: خطط DCA وGrid، توصيات وتحليلات، فرص بالمؤشرات، وتنبيهات فورية.', disclaimer: '⚠️ المحتوى والأدوات لأغراض التنظيم والمتابعة، والتوصيات للاسترشاد وليست ضمانًا للربح. الاستثمار في الأسهم فيه مخاطر.' },
    promos: []
  };

  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  function merge(def, v){
    if (Array.isArray(def)) return Array.isArray(v) ? v : def;
    if (isObj(def)) { const o = {}; Object.keys(def).forEach(k => { o[k] = merge(def[k], isObj(v) ? v[k] : undefined); }); if (isObj(v)) Object.keys(v).forEach(k => { if (!(k in o)) o[k] = v[k]; }); return o; }
    return v === undefined || v === null ? def : v;
  }
  LP.merge = function(cfg){
    const c = merge(JSON.parse(JSON.stringify(LP.DEFAULTS)), cfg || {});
    // أي قسم أساسي مش موجود في الترتيب المحفوظ (قسم جديد في إصدار جاي) ← بيتضاف في الآخر
    const have = new Set((c.sections || []).map(s => s && s.id));
    BUILTIN.forEach(([id]) => { if (!have.has(id)) c.sections.push({ id, on: true }); });
    c.sections = c.sections.filter(s => s && s.id && (s.custom || BUILTIN.some(b => b[0] === s.id)));
    return c;
  };

  /* ---------------------------------------------------------------------
     02. التحميل من السيرفر
     --------------------------------------------------------------------- */
  let loadP = null, visited = false;
  LP.load = function(force){
    if (!loadP || force) {
      const q = 'action=get' + (!visited ? '&visit=1' : ''); visited = true;
      loadP = apiGet('/landing_api.php?' + q).then(r => ({ cfg: LP.merge(r && r.success ? r.config : null), live: (r && r.live) || { stats: {}, reviews: [], faq: [] }, raw: r && r.config }))
        .catch(() => ({ cfg: LP.merge(null), live: { stats: {}, reviews: [], faq: [] }, raw: null }));
    }
    return loadP;
  };
  window.gLandingShouldShow = async function(){ try { const d = await LP.load(); return d.cfg.enabled !== false; } catch(e){ return false; } };

  /* ---------------------------------------------------------------------
     03. أدوات
     --------------------------------------------------------------------- */
  const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const T = (s) => esc(s).replace(/\[\[(.+?)\]\]/g, '<span class="lp-gold">$1</span>');   // [[كلام]] = ذهبي
  const fmt = (n, d = 2) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const hex = (v) => /^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? v : '';
  const imgSrc = (v) => { v = String(v || ''); return /^data:image\/(png|jpe?g|webp|gif);base64,/.test(v) || /^https:\/\//.test(v) || /^[A-Za-z0-9_\-]+\.(png|jpe?g|webp|gif|svg)$/.test(v) ? v : ''; };
  LP.T = T; LP.esc = esc; LP.imgSrc = imgSrc;
  function onColor(h){ const n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111111' : '#FFFFFF'; }
  function rgba(h, a){ const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  function rng(seed){ let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function series(seed, n, end, vol, drift){ const r = rng(seed); const out = []; let v = end; for (let i = 0; i < n; i++){ v *= 1 + (r() - .5) * vol + drift; out.push(v); } const k = end / out[out.length - 1]; return out.map(x => x * k); }
  const pct = (a, b) => b ? (a - b) / b * 100 : 0;
  let root = null;
  const cv = (v) => root ? getComputedStyle(root).getPropertyValue(v).trim() : '';

  function lineSvg(vals, o = {}){
    const w = o.w || 600, h = o.h || 200, pad = o.pad == null ? 8 : o.pad;
    const mn = Math.min(...vals), mx = Math.max(...vals), sp = (mx - mn) || 1;
    const x = (i) => (i / Math.max(1, vals.length - 1)) * w, y = (v) => pad + (1 - (v - mn) / sp) * (h - pad * 2);
    const up = vals[vals.length - 1] >= vals[0];
    const col = o.color || (up ? cv('--lp-up') : cv('--lp-down')) || '#0E9F6E';
    const d = vals.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1)).join('');
    const id = 'lg' + Math.random().toString(36).slice(2, 8);
    const grid = o.grid ? [.25, .5, .75].map(t => `<line x1="0" x2="${w}" y1="${(h * t).toFixed(1)}" y2="${(h * t).toFixed(1)}" stroke="${cv('--lp-border')}" stroke-dasharray="3 5"/>`).join('') : '';
    return { svg: `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity="${o.fill == null ? .25 : o.fill}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${d}L${w},${h}L0,${h}Z" fill="url(#${id})"/><path class="${o.anim ? 'lp-draw' : ''}" d="${d}" fill="none" stroke="${col}" stroke-width="${o.sw || 2.4}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>${o.extra || ''}</svg>`, x, y };
  }

  /* ---------------------------------------------------------------------
     04. بيانات الأسواق (توضيحية لحد ما الأسعار الحقيقية توصل)
     --------------------------------------------------------------------- */
  function demoMarkets(){
    const M = [
      ['مصر', [['EGX30', 'مؤشر البورصة المصرية', 31845.2, .018, .0009], ['COMI', 'البنك التجاري الدولي', 82.4, .022, .0008], ['TMGH', 'طلعت مصطفى', 58.15, .026, .0012], ['ABUK', 'أبو قير للأسمدة', 41.9, .024, -.0002], ['ETEL', 'المصرية للاتصالات', 38.6, .02, .0006]]],
      ['الخليج', [['TASI', 'مؤشر السوق السعودي', 12190.6, .012, .0003], ['ADX', 'مؤشر سوق أبوظبي', 9480.3, .01, .0004], ['DFM', 'مؤشر سوق دبي', 4960.8, .013, .0008], ['QE', 'مؤشر بورصة قطر', 10510.2, .011, .0001], ['BK', 'مؤشر بورصة الكويت', 7980.5, .01, .0003]]],
      ['العالمية', [['S&P 500', 'المؤشر الأمريكي', 5890.4, .01, .0006], ['NASDAQ', 'مؤشر التكنولوجيا', 19240.7, .014, .0008], ['الذهب', 'أوقية / دولار', 2685.4, .01, .0008], ['برنت', 'خام برنت', 74.2, .018, -.0003], ['USD/EGP', 'الدولار / الجنيه', 48.9, .003, .0002]]]
    ];
    let seed = 7;
    return M.map(([label, list]) => ({ label, demo: true, items: list.map(([name, sub, price, vol, drift]) => ({ name, sub, last: price, series: series(seed += 11, 260, price, vol, drift) })) }));
  }

  /* ---------------------------------------------------------------------
     05. رسم الأقسام
     --------------------------------------------------------------------- */
  const SYM_COLORS = ['#2563EB', '#DB2777', '#059669', '#B45309', '#7C3AED', '#0891B2'];
  function secHead(s){ return `<div class="lp-head lp-rev">${s.eyebrow ? `<span class="lp-eyebrow">${esc(s.eyebrow)}</span>` : ''}${s.title ? `<h2>${T(s.title)}</h2>` : ''}${s.sub ? `<p>${esc(s.sub)}</p>` : ''}</div>`; }
  function btnHtml(label, act, main, lg){ return label ? `<button type="button" class="lp-btn ${main ? 'lp-btn-main' : 'lp-btn-ghost'} ${lg ? 'lp-btn-lg' : ''}" data-act="${esc(act)}">${esc(label)}</button>` : ''; }

  const R = {};
  R.ticker = () => `<div class="lp-ticker" aria-label="أسعار الأسواق"><div class="lp-ticker-track" id="lpTicker"></div></div>`;
  R.hero = (c) => { const h = c.hero, img = imgSrc(h.img);
    return `<section class="lp-hero"><div class="lp-bgfx" aria-hidden="true"></div><div class="lp-wrap">
      <div class="lp-rev">
        ${h.pill ? `<span class="lp-pill"><i></i> ${esc(h.pill)}</span>` : ''}
        <h1>${T(h.title)}${(h.words || []).length ? `<br><span class="lp-gold lp-typed" id="lpTyped">${esc(h.words[0])}</span>` : ''}</h1>
        ${h.lead ? `<p class="lp-lead">${esc(h.lead)}</p>` : ''}
        <div class="lp-cta">${btnHtml(h.btn1, 'register', true, true)}${btnHtml(h.btn2, 'section:features', false, true)}</div>
        ${(h.trust || []).length ? `<div class="lp-trust">${h.trust.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="lp-device lp-rev">
        ${img ? `<img class="lp-hero-img" src="${esc(img)}" alt="">` : `
        ${h.toasts ? `<div class="lp-toast t1"><span class="i">🎯</span><div><b>فرصة شراء جديدة</b><small>COMI · RSI أقل من 30 على اليومي</small></div></div>` : ''}
        <div class="lp-phone">
          <div class="lp-pv-top"><div><small>قيمة المحفظة الحالية</small><div class="lp-pv-val"><span class="lp-num" id="lpPvVal">248,650.40</span><sub>EGP</sub></div>
            <span class="lp-chip lp-up" id="lpPvChgW" style="margin-top:8px"><span class="lp-num" id="lpPvChg">+18,420.75</span></span></div>
            <div class="lp-seg" id="lpPvSeg"><button type="button" data-r="30">شهر</button><button type="button" data-r="90" class="on">3 شهور</button><button type="button" data-r="250">سنة</button></div></div>
          <div class="lp-chart" id="lpHeroChart"></div>
          <div class="lp-hold">${[['COMI', 'DCA', 'مفتوحة', 82450, 12.4], ['TMGH', 'Grid', 'مفتوحة', 64120, 8.9], ['ABUK', 'DCA', 'مفتوحة', 41300, -2.1]].map(([s, t, st, v, p], i) => `<div class="lp-hrow"><span class="lp-sym" style="background:${SYM_COLORS[i]}">${s}</span><div class="m"><b>${s}<span class="lp-tag ${t === 'Grid' ? 'g' : ''}">${t}</span></b><small>مصر · ${st}</small></div><div class="e"><b class="lp-num">${fmt(v)}</b><small class="lp-num ${p >= 0 ? 'lp-up' : 'lp-down'}">${p >= 0 ? '+' : ''}${p}%</small></div></div>`).join('')}</div>
        </div>
        ${h.toasts ? `<div class="lp-toast t2"><span class="i">📢</span><div><b>توصية جديدة من الخبراء</b><small>TMGH — دخول 57.5 · هدف 64</small></div></div>
        <div class="lp-toast t3"><span class="i">📉</span><div><b>متوسط التكلفة نزل 5.7%</b><small>بعد تنفيذ المستوى الثالث</small></div></div>` : ''}`}
      </div></div></section>`; };
  R.stats = (c, L) => { const items = c.stats.items.filter(it => it.mode !== 'off'); if (!items.length) return '';
    return `<section class="lp-wrap"><div class="lp-stats">${items.map((it, i) => { const v = it.mode === 'real' ? (+L.stats[it.key] || 0) : (+it.value || 0);
      return `<div class="lp-stat lp-rev">${it.key === 'visitors' && it.mode === 'real' ? '<span class="lp-live"><i></i> مباشر</span>' : ''}<div class="i">${esc(it.icon || '•')}</div><b class="lp-num" data-count="${v}">0</b><span>${esc(it.label)}</span></div>`; }).join('')}</div></section>`; };
  R.markets = (c) => `<div class="lp-wrap">${secHead(c.markets)}
      <div class="lp-tabs lp-rev" id="lpMkTabs"></div>
      <div class="lp-mk lp-rev"><div class="lp-mk-main"><div class="hd"><div><h3 id="lpMkName">—</h3><small style="color:var(--lp-muted)" id="lpMkSub"></small></div>
        <div class="lp-seg" id="lpMkRange"><button type="button" data-r="30">شهر</button><button type="button" data-r="90" class="on">3 شهور</button><button type="button" data-r="180">6 شهور</button><button type="button" data-r="260">سنة</button></div></div>
        <div style="margin-top:12px;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><span class="lp-big lp-num" id="lpMkVal">—</span><span class="lp-chip" id="lpMkChg"></span></div>
        <div class="lp-mk-chart" id="lpMkChart"></div></div>
        <div class="lp-mk-list" id="lpMkList"></div></div>
      <p class="lp-note" id="lpMkNote">${esc(c.markets.note)}</p></div>`;
  const MOCK = {
    opps: () => `<div class="lp-mock"><h4>🎯 فرصة 1 — شراء <small>الإطار: يومي</small></h4>
      <div class="lp-row"><span class="k">RSI 14</span><span class="lp-bar"><i style="--w:28%"></i></span><span class="lp-num">&lt; 30</span></div>
      <div class="lp-row"><span class="k">MACD</span><span class="lp-bar"><i style="--w:62%"></i></span><span>تقاطع صاعد</span></div>
      <div class="lp-row"><span class="k">SMA 50</span><span class="lp-bar"><i style="--w:78%"></i></span><span>السعر فوقه</span></div>
      ${[['COMI', 82.4], ['TMGH', 58.15], ['ABUK', 41.9]].map(([s, p], i) => `<div class="lp-hit"><span class="lp-sym" style="background:${SYM_COLORS[i]}">${s}</span><div><b>${s}</b> <small style="color:var(--lp-muted)">آخر سعر <span class="lp-num">${p}</span></small></div><div class="mini"><span>+ DCA</span><span>+ Grid</span></div></div>`).join('')}
      <div class="lp-floaty" style="top:-18px;left:-10px">⚡ 3 أسهم انطبقت عليها الشروط</div></div>`,
    dca: () => { let q = 0, c = 0; const rows = []; for (let i = 0; i < 5; i++){ const p = 100 * Math.pow(.95, i), a = 10000 * Math.pow(1.2, i); q += a / p; c += a; rows.push([i + 1, p, a, c / q]); }
      const avg3 = rows[2][3];
      return `<div class="lp-mock"><h4>📊 خطة COMI — DCA <small>نزول 5% · زيادة المبلغ 20%</small></h4>
      <table class="lp-tbl"><thead><tr><th>المستوى</th><th>السعر</th><th>المبلغ</th><th>المتوسط بعده</th></tr></thead><tbody>
      ${rows.map(([n, p, a, av]) => `<tr class="${n <= 3 ? 'done' : ''}"><td>${n}</td><td class="lp-num">${fmt(p)}</td><td class="lp-num">${fmt(a, 0)}</td><td class="lp-num">${fmt(av)}</td></tr>`).join('')}</tbody></table>
      <div class="lp-avg"><div><small style="color:var(--lp-muted)">متوسط التكلفة الحالي</small><br><b class="lp-num lp-gold">${fmt(avg3)}</b></div><div style="text-align:left"><small style="color:var(--lp-muted)">سعر البيع المستهدف (+5%)</small><br><b class="lp-num lp-up">${fmt(avg3 * 1.05)}</b></div></div>
      <div class="lp-floaty" style="bottom:-18px;right:-10px"><span class="lp-up">▼ ${(100 - avg3).toFixed(1)}%</span> المتوسط نزل عن أول سعر</div></div>`; },
    recs: () => `<div class="lp-mock"><h4>📢 توصيات الخبراء <small>سوق مصر</small></h4>
      ${[['TMGH', '57.50', '64.00', '54.80', 'جديدة', 1], ['COMI', '80.00', '88.00', '76.50', 'الهدف الأول تحقق ✓', 0], ['ETEL', '37.20', '41.00', '35.40', 'قيد المتابعة', 4]].map(([s, e, t, st, stt, ci]) => `<div class="lp-rec"><span class="lp-sym" style="background:${SYM_COLORS[ci]}">${s}</span><div><b>${s}</b><div class="lvl"><span>دخول <b class="lp-num">${e}</b></span><span>هدف <b class="lp-num lp-up">${t}</b></span><span>وقف <b class="lp-num lp-down">${st}</b></span></div></div><span class="st">${stt}</span></div>`).join('')}
      <div class="lp-floaty" style="top:-16px;right:-8px">🧑‍💼 من فريق المحللين</div></div>`,
    analysis: () => `<div class="lp-mock"><h4>🔬 تحليل COMI <small>يومي</small></h4>
      <div class="lp-gauge"><svg viewBox="0 0 120 70"><path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="rgba(148,163,184,.25)" stroke-width="12" stroke-linecap="round"/><path d="M10 62 A50 50 0 0 1 95 27" fill="none" stroke="var(--lp-up)" stroke-width="12" stroke-linecap="round"/><circle cx="95" cy="27" r="6" fill="var(--lp-surface)" stroke="var(--lp-up)" stroke-width="3"/></svg>
        <div><small style="color:var(--lp-muted)">الاتجاه العام</small><b class="lp-up">صاعد — شراء</b><small style="color:var(--lp-muted)">7 مؤشرات من 10 إيجابية</small></div></div>
      <div class="lp-kv"><div><small>دعم</small><b class="lp-num">78.40</b></div><div><small>مقاومة</small><b class="lp-num">86.90</b></div><div><small>RSI</small><b class="lp-num">58</b></div></div>
      <div style="margin-top:12px" id="lpAnaChart"></div></div>`,
    alerts: () => `<div class="lp-mock"><h4>🔔 تنبيهاتك <small>آخر 24 ساعة</small></h4>
      <div class="lp-chs"><span>الموقع</span><span>الإيميل</span><span>واتساب</span></div>
      <div class="lp-notif"><span class="i">🎯</span><div><b>TMGH وصل لهدف البيع</b><small>السعر <span class="lp-num">61.20</span> — ربح المركز <span class="lp-num lp-up">+8.4%</span></small></div></div>
      <div class="lp-notif"><span class="i">🛒</span><div><b>COMI قرّب من مستوى الشراء الرابع</b><small>المستوى عند <span class="lp-num">85.74</span></small></div></div>
      <div class="lp-notif"><span class="i">📢</span><div><b>توصية جديدة: ETEL</b><small>اتبعت على الواتساب والإيميل</small></div></div></div>`,
    watch: () => `<div class="lp-mock"><h4>⭐ قائمة المتابعة <small>اليوم</small></h4><div class="lp-watch" id="lpWatch"></div></div>`
  };
  R.features = (c) => `<div class="lp-wrap">${secHead(c.features)}${c.features.items.map((f, i) => { const img = imgSrc(f.img);
      return `<div class="lp-feat ${i % 2 ? 'rev' : ''}"><div class="lp-feat-t lp-rev"><div class="lp-badge">${String(i + 1).padStart(2, '0')}</div><h3>${T(f.title)}</h3>${f.text ? `<p>${esc(f.text)}</p>` : ''}
        ${(f.checks || []).length ? `<ul class="lp-checks">${f.checks.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>
        <div class="lp-feat-v lp-rev">${img ? `<div class="lp-mock"><img src="${esc(img)}" alt=""></div>` : (MOCK[f.mock] ? MOCK[f.mock]() : '')}</div></div>`; }).join('')}</div>`;
  R.services = (c) => `<div class="lp-wrap">${secHead(c.services)}<div class="lp-svcs">${c.services.items.map(s => `<div class="lp-svc lp-rev"><div class="i">${esc(s.icon || '•')}</div><h4>${esc(s.title)}</h4><p>${esc(s.text)}</p></div>`).join('')}</div></div>`;
  R.offers = (c) => { const cards = (c.promos || []).filter(p => p && p.on !== false && p.type === 'card'); if (!cards.length) return '';
    return `<div class="lp-wrap">${secHead(c.offers)}<div class="lp-promos">${cards.map(p => { const bg = hex(p.bg), col = hex(p.color) || (bg ? onColor(bg) : ''), img = imgSrc(p.img);
      return `<div class="lp-promo lp-rev" style="${bg ? `background:${bg};border-color:${bg};` : ''}${col ? `color:${col};` : ''}">${img ? `<img src="${esc(img)}" alt="">` : ''}${p.title ? `<h3>${T(p.title)}</h3>` : ''}${p.text ? `<p>${esc(p.text)}</p>` : ''}${p.btn ? `<div>${btnHtml(p.btn, p.action === 'url' ? 'url:' + (p.url || '') : (p.action || 'register'), true)}</div>` : ''}</div>`; }).join('')}</div></div>`; };
  R.calc = (c) => `<div class="lp-wrap">${secHead(c.calc)}<div class="lp-calc lp-rev"><div>
      ${[['cPrice', 'سعر السهم الحالي', 5, 500, 100, 1], ['cCap', 'رأس المال', 5000, 1000000, 50000, 5000], ['cLv', 'عدد مستويات الشراء', 2, 10, 5, 1], ['cDrop', 'نسبة النزول بين كل مستوى %', 1, 15, 5, .5], ['cInc', 'زيادة مبلغ الشراء كل مستوى %', 0, 60, 20, 5], ['cTp', 'نسبة الربح المستهدفة %', 1, 30, 5, .5]].map(([id, l, mn, mx, v, st]) => `<div class="r"><div class="t"><label for="lp_${id}">${l}</label><b class="lp-num" id="lp_${id}V">${v}</b></div><input type="range" id="lp_${id}" min="${mn}" max="${mx}" value="${v}" step="${st}"></div>`).join('')}
    </div><div>
      <div class="lp-out"><div><small>متوسط التكلفة</small><b class="lp-num lp-gold" id="lpOAvg">—</b></div><div><small>سعر البيع المستهدف</small><b class="lp-num lp-up" id="lpOTp">—</b></div><div><small>الربح المتوقع</small><b class="lp-num lp-up" id="lpOPr">—</b></div></div>
      <div class="lp-calc-chart" id="lpCalcChart"></div><div class="lp-legend" id="lpCalcLegend"></div><p class="lp-hint" id="lpCalcHint"></p>
      <div style="margin-top:14px">${btnHtml(c.calc.btn, 'register', true)}</div></div></div></div>`;
  R.steps = (c) => `<div class="lp-wrap">${secHead(c.steps)}<div class="lp-steps">${c.steps.items.map(s => `<div class="lp-step lp-rev"><h4>${esc(s.title)}</h4><p>${esc(s.text)}</p></div>`).join('')}</div></div>`;
  R.reviews = (c, L) => { const r = c.reviews; if (r.mode === 'off') return '';
    const manual = (r.manual || []).filter(x => x && x.text && x.on !== false).map(x => ({ name: x.name, city: x.city, text: x.text, stars: +x.stars || 5 }));
    const real = (L.reviews || []).map(x => ({ name: x.name, city: x.date ? '' : '', text: x.text, stars: x.stars }));
    const list = (r.mode === 'manual' ? manual : r.mode === 'real' ? real : [...manual, ...real]).slice(0, Math.max(1, +r.count || 6));
    if (!list.length) return '';
    return `<div class="lp-wrap">${secHead(r)}<div class="lp-reviews">${list.map((x, i) => `<div class="lp-rv lp-rev"><div class="lp-stars">${'★'.repeat(Math.max(1, Math.min(5, x.stars)))}${'☆'.repeat(5 - Math.max(1, Math.min(5, x.stars)))}</div><p>«${esc(x.text)}»</p><div class="lp-who"><span class="lp-av" style="background:${SYM_COLORS[i % SYM_COLORS.length]}">${esc(String(x.name || '؟').trim().charAt(0))}</span><div><b>${esc(x.name || 'عميل GRIFFINE')}</b>${x.city ? `<small>${esc(x.city)}</small>` : ''}</div></div></div>`).join('')}</div></div>`; };
  R.about = (c) => { const a = c.about, img = imgSrc(a.img);
    return `<div class="lp-wrap lp-about"><div class="lp-rev">${a.eyebrow ? `<span class="lp-eyebrow">${esc(a.eyebrow)}</span>` : ''}<h2 style="font-size:clamp(26px,3.3vw,40px);margin:12px 0 16px;font-weight:800;line-height:1.35">${T(a.title)}</h2>${a.p1 ? `<p>${esc(a.p1)}</p>` : ''}${a.p2 ? `<p>${esc(a.p2)}</p>` : ''}<div style="margin-top:8px">${btnHtml(a.btn, 'register', true)}</div></div>
      <div class="lp-rev">${img ? `<img src="${esc(img)}" alt="" style="width:100%;border-radius:24px">` : `<div class="lp-vals">${a.values.map(v => `<div class="lp-val"><span class="i">${esc(v.icon)}</span><b>${esc(v.title)}</b><small>${esc(v.text)}</small></div>`).join('')}</div>`}</div></div>`; };
  R.faq = (c, L) => { const f = c.faq; if (f.mode === 'off') return '';
    const manual = (f.manual || []).filter(x => x && x.q), site = (L.faq || []).map(x => ({ q: x.q, a: x.a }));
    const list = (f.mode === 'manual' ? manual : f.mode === 'site' ? site : [...manual, ...site]).slice(0, Math.max(1, +f.count || 10));
    if (!list.length) return '';
    return `<div class="lp-wrap">${secHead(f)}<div class="lp-faq lp-rev">${list.map((x, i) => `<details ${i === 0 ? 'open' : ''}><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('')}</div></div>`; };
  R.cta = (c) => `<div class="lp-wrap"><div class="lp-final lp-rev"><h2>${T(c.cta.title)}</h2>${c.cta.text ? `<p>${esc(c.cta.text)}</p>` : ''}<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">${btnHtml(c.cta.btn1, 'register', true, true)}${btnHtml(c.cta.btn2, 'login', false, true)}</div></div></div>`;
  R.custom = (s) => { const img = imgSrc(s.img), lay = img ? (s.layout === 'img-right' ? 'img-right' : 'img-left') : 'no-img';
    return `<div class="lp-wrap"><div class="lp-custom ${lay}"><div class="lp-custom-t lp-rev">${s.eyebrow ? `<span class="lp-eyebrow">${esc(s.eyebrow)}</span>` : ''}${s.title ? `<h2>${T(s.title)}</h2>` : ''}${s.text ? `<p>${esc(s.text)}</p>` : ''}${s.btn ? btnHtml(s.btn, s.action === 'url' ? 'url:' + (s.url || '') : (s.action || 'register'), true) : ''}</div>${img ? `<div class="lp-rev"><img src="${esc(img)}" alt=""></div>` : ''}</div></div>`; };

  const logoHtml = (c) => { const lg = imgSrc(c.theme.logo);
    return lg ? `<img src="${esc(lg)}" alt="GRIFFINE">` : `<img class="lp-logo-l" src="griffine-logo-light.webp?v=112" alt="GRIFFINE"><img class="lp-logo-d" src="griffine-logo-dark.webp?v=112" alt="GRIFFINE">`; };
  const IC = {
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>',
    login: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>',
    app: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M12 7v7M9 11l3 3 3-3"/></svg>',
    burger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
  };

  function pageHtml(c, L, preview){
    const on = (id) => (c.sections.find(s => s.id === id) || {}).on !== false;
    const navSecs = [['features', c.features.nav], ['markets', c.markets.nav], ['calc', c.calc.nav], ['reviews', c.reviews.nav], ['about', c.about.nav], ['faq', c.faq.nav]].filter(([id, l]) => on(id) && l);
    const links = navSecs.map(([id, l]) => `<button type="button" data-act="section:${id}">${esc(l)}</button>`).join('');
    const bar = (c.promos || []).find(p => p && p.on !== false && p.type === 'bar');
    let barDismissed = false; try { barDismissed = !!bar && sessionStorage.getItem('lp_bar_x') === (bar.title || '') + (bar.text || ''); } catch(e){}
    const bodySecs = c.sections.filter(s => s.on !== false).map(s => {
      const inner = s.custom ? R.custom(s) : (R[s.id] ? R[s.id](c, L) : '');
      if (!inner) return '';
      if (s.id === 'ticker' || s.id === 'hero' || s.id === 'stats') return inner;
      return `<section class="lp-sec ${s.band ? 'lp-band' : ''}" id="lp-${esc(s.id)}" data-lp-sec="${esc(s.id)}">${inner}</section>`;
    }).join('');
    const wm = c.watermark;
    return `<div class="lp lp-screen" id="lpRoot">
      ${preview ? `<div class="lp-admin-bar">👁️ معاينة صفحة اللاندينج — الزوار بيشوفوها كده <button type="button" data-act="admin">رجوع لإعدادات اللاندينج</button><button type="button" data-act="studio">تعديل الشكل بالاستوديو</button></div>` : ''}
      ${wm.on ? `<div class="lp-wm" aria-hidden="true" style="--wm-op:${Math.max(1, Math.min(40, +wm.opacity || 6)) / 100};--wm-size:${Math.max(20, Math.min(120, +wm.size || 70))}vmin">${logoHtml(c)}</div>` : ''}
      ${bar && !barDismissed ? `<div class="lp-pbar" style="${hex(bar.bg) ? `background:${bar.bg};color:${hex(bar.color) || onColor(bar.bg)};` : ''}"><span>${T(bar.title || '')}${bar.text ? ' — ' + esc(bar.text) : ''}</span>${bar.btn ? `<button type="button" class="lp-pbar-btn" data-act="${esc(bar.action === 'url' ? 'url:' + (bar.url || '') : (bar.action || 'register'))}">${esc(bar.btn)}</button>` : ''}<button type="button" class="lp-x" data-act="barx" aria-label="إغلاق">×</button></div>` : ''}
      <header class="lp-nav"><div class="lp-wrap">
        <button type="button" class="lp-brand" data-act="top" aria-label="GRIFFINE">${logoHtml(c)}${c.theme.wordmark !== false ? '<span class="lp-word">GRIFFINE</span>' : ''}</button>
        ${c.nav.links !== false ? `<nav class="lp-links">${links}</nav>` : ''}
        <div class="lp-end">
          <button type="button" class="lp-ic" data-act="theme" aria-label="الوضع الليلي / النهاري" title="الوضع الليلي / النهاري">${IC.moon}</button>
          ${c.app.on !== false ? `<button type="button" class="lp-btn lp-btn-ghost lp-app" data-act="app" title="${esc(c.app.label)}">${IC.app}<span class="lbl">${esc(c.app.label)}</span></button>` : ''}
          <button type="button" class="lp-btn lp-btn-ghost lp-login" data-act="login" title="${esc(c.nav.login)}">${IC.login}<span class="lbl">${esc(c.nav.login)}</span></button>
          <button type="button" class="lp-btn lp-btn-main" data-act="register">${esc(c.nav.register)}</button>
          ${c.nav.links !== false && links ? `<button type="button" class="lp-ic lp-burger" data-act="menu" aria-label="القائمة">${IC.burger}</button>` : ''}
        </div></div></header>
      ${c.nav.links !== false && links ? `<div class="lp-mmenu" id="lpMMenu">${links}<button type="button" data-act="login" style="color:var(--lp-gold-deep)">${esc(c.nav.login)}</button></div>` : ''}
      <main>${bodySecs}</main>
      <footer class="lp-foot"><div class="lp-wrap"><div class="g">
        <div><button type="button" class="lp-brand" data-act="top">${logoHtml(c)}${c.theme.wordmark !== false ? '<span class="lp-word">GRIFFINE</span>' : ''}</button>${c.footer.text ? `<p>${esc(c.footer.text)}</p>` : ''}</div>
        <div><h5>المنصة</h5>${navSecs.slice(0, 3).map(([id, l]) => `<button type="button" data-act="section:${id}">${esc(l)}</button>`).join('')}</div>
        <div><h5>الشركة</h5>${navSecs.slice(3).map(([id, l]) => `<button type="button" data-act="section:${id}">${esc(l)}</button>`).join('')}<button type="button" data-act="privacy">سياسة الخصوصية</button></div>
        <div><h5>الحساب</h5><button type="button" data-act="login">${esc(c.nav.login)}</button><button type="button" data-act="register">إنشاء حساب</button>${c.app.on !== false ? `<button type="button" data-act="app">${esc(c.app.label)}</button>` : ''}</div>
      </div><div class="lp-disc"><span>${esc(c.footer.disclaimer)}</span><span>© ${new Date().getFullYear()} GRIFFINE · الإصدار ${esc(L.version || 108)}</span></div></div></footer>
    </div>`;
  }

  /* ---------------------------------------------------------------------
     06. السلوك بعد الرسم (المنحنيات / الحاسبة / العدادات / الأسواق)
     --------------------------------------------------------------------- */
  let MK = null, mkTab = 0, mkCur = 0, mkRange = 90, heroRange = 90, timers = [];
  const heroSeries = series(3, 260, 248650.4, .012, .0012);
  function clearTimers(){ timers.forEach(t => clearInterval(t)); timers = []; }
  const alive = () => root && root.isConnected;

  function drawHero(anim){
    const box = document.getElementById('lpHeroChart'); if (!box) return;
    const vals = heroSeries.slice(-heroRange);
    box.innerHTML = lineSvg(vals, { h: 150, anim, grid: true, color: cv('--lp-gold') }).svg;
    const ch = vals[vals.length - 1] - vals[0], el = document.getElementById('lpPvChg');
    if (el) { el.textContent = `${ch >= 0 ? '+' : ''}${fmt(ch)} (${ch >= 0 ? '+' : ''}${pct(vals[vals.length - 1], vals[0]).toFixed(2)}%)`; document.getElementById('lpPvChgW').className = 'lp-chip ' + (ch >= 0 ? 'lp-up' : 'lp-down'); }
  }
  function drawTicker(){
    const el = document.getElementById('lpTicker'); if (!el || !MK) return;
    const items = [].concat(...MK.map(t => t.items));
    if (!items.length) { el.closest('.lp-ticker').hidden = true; return; }
    const one = items.map(it => { const s = it.series, c = pct(it.last, s[s.length - 2]); return `<span class="lp-tk"><b>${esc(it.name || it.symbol)}</b><span class="p lp-num">${fmt(it.last)}</span><span class="c lp-num ${c >= 0 ? 'lp-up' : 'lp-down'}">${c >= 0 ? '▲' : '▼'} ${Math.abs(c).toFixed(2)}%</span></span>`; }).join('');
    el.innerHTML = one + one;
  }
  function mkItem(){ const t = MK && MK[mkTab]; return t && t.items[mkCur]; }
  function drawMk(anim){
    const tabs = document.getElementById('lpMkTabs'); if (!tabs || !MK) return;
    tabs.innerHTML = MK.map((t, i) => `<button type="button" class="${i === mkTab ? 'on' : ''}" data-tab="${i}">${esc(t.label)}</button>`).join('');
    const t = MK[mkTab]; if (!t) return;
    document.getElementById('lpMkList').innerHTML = t.items.map((it, i) => { const s = it.series, c = pct(it.last, s[s.length - 2]);
      return `<button type="button" class="lp-mk-card ${i === mkCur ? 'on' : ''}" data-i="${i}"><div><b>${esc(it.name || it.symbol)}</b><small>${esc(it.sub || it.market || t.label)}</small></div>${lineSvg(s.slice(-30), { w: 90, h: 34, pad: 3, sw: 1.8, fill: .15 }).svg}<div class="v"><b class="lp-num">${fmt(it.last)}</b><small class="lp-num ${c >= 0 ? 'lp-up' : 'lp-down'}">${c >= 0 ? '+' : ''}${c.toFixed(2)}%</small></div></button>`; }).join('');
    drawMkMain(anim);
  }
  function drawMkMain(anim){
    const it = mkItem(), box = document.getElementById('lpMkChart'); if (!it || !box) return;
    const vals = it.series.slice(-mkRange), c = pct(it.last, vals[0]);
    document.getElementById('lpMkName').textContent = it.name || it.symbol;
    document.getElementById('lpMkSub').textContent = it.sub || it.market || '';
    document.getElementById('lpMkVal').textContent = fmt(it.last);
    const chg = document.getElementById('lpMkChg'); chg.className = 'lp-chip ' + (c >= 0 ? 'lp-up' : 'lp-down'); chg.innerHTML = `<span class="lp-num">${c >= 0 ? '▲ +' : '▼ '}${c.toFixed(2)}%</span>&nbsp;خلال الفترة`;
    const L = lineSvg(vals, { h: 280, anim, grid: true, extra: '<line class="hl" x1="0" x2="0" y1="0" y2="280" stroke-dasharray="4 4" style="opacity:0"/><circle class="hd" r="5" cx="-10" cy="-10" fill="#fff" stroke-width="3"/>' });
    box.innerHTML = L.svg + '<div class="lp-tip" id="lpMkTip"></div>';
    const svg = box.querySelector('svg'), hl = svg.querySelector('.hl'), dot = svg.querySelector('.hd'), tip = document.getElementById('lpMkTip');
    hl.setAttribute('stroke', cv('--lp-muted')); dot.setAttribute('stroke', vals[vals.length - 1] >= vals[0] ? cv('--lp-up') : cv('--lp-down'));
    const move = (e) => { const r = svg.getBoundingClientRect(), px = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width;
      const i = Math.max(0, Math.min(vals.length - 1, Math.round(px * (vals.length - 1)))), X = L.x(i), Y = L.y(vals[i]);
      hl.setAttribute('x1', X); hl.setAttribute('x2', X); hl.style.opacity = 1; dot.setAttribute('cx', X); dot.setAttribute('cy', Y);
      const d = new Date(); d.setDate(d.getDate() - Math.round((vals.length - 1 - i) * 1.4));
      tip.innerHTML = `<b class="lp-num">${fmt(vals[i])}</b> · ${d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}`;
      tip.style.left = (X / 600 * r.width) + 'px'; tip.style.top = (Y / 280 * r.height) + 'px'; tip.style.opacity = 1; };
    svg.addEventListener('mousemove', move); svg.addEventListener('touchmove', move, { passive: true });
    svg.addEventListener('mouseleave', () => { hl.style.opacity = 0; tip.style.opacity = 0; dot.setAttribute('cx', -10); });
  }
  function drawWatch(){
    const box = document.getElementById('lpWatch'); if (!box || !MK) return;
    const items = [].concat(...MK.map(t => t.items)).slice(0, 4);
    box.innerHTML = items.map(it => { const s = it.series, c = pct(it.last, s[s.length - 2]); return `<div class="lp-wcard"><div class="t"><b>${esc(it.name || it.symbol)}</b><span class="lp-chip lp-num ${c >= 0 ? 'lp-up' : 'lp-down'}">${c >= 0 ? '+' : ''}${c.toFixed(2)}%</span></div><div style="font-weight:800;margin-top:4px" class="lp-num">${fmt(it.last)}</div>${lineSvg(s.slice(-40), { w: 200, h: 44, pad: 3, sw: 2 }).svg}</div>`; }).join('');
    const an = document.getElementById('lpAnaChart'); if (an) { an.style.height = '90px'; an.innerHTML = lineSvg(series(21, 90, 82.4, .02, .002), { h: 90, color: cv('--lp-gold') }).svg; }
  }
  function calc(){
    const g = (id) => document.getElementById('lp_' + id); if (!g('cPrice')) return;
    ['cPrice', 'cCap', 'cLv', 'cDrop', 'cInc', 'cTp'].forEach(id => { const r = g(id); r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%'); document.getElementById('lp_' + id + 'V').textContent = id === 'cCap' || id === 'cPrice' ? fmt(r.value, 0) : r.value + (/Drop|Inc|Tp/.test(id) ? '%' : ''); });
    const P = +g('cPrice').value, cap = +g('cCap').value, n = +g('cLv').value, d = +g('cDrop').value / 100, inc = +g('cInc').value / 100, tp = +g('cTp').value / 100;
    const w = Array.from({ length: n }, (_, i) => Math.pow(1 + inc, i)), ws = w.reduce((a, b) => a + b, 0);
    let q = 0, cost = 0; const prices = [], avgs = [];
    for (let i = 0; i < n; i++){ const p = P * Math.pow(1 - d, i), amt = cap * w[i] / ws; q += amt / p; cost += amt; prices.push(p); avgs.push(cost / q); }
    const avg = cost / q, target = avg * (1 + tp), profit = q * target - cost, lastP = prices[n - 1];
    document.getElementById('lpOAvg').textContent = fmt(avg); document.getElementById('lpOTp').textContent = fmt(target); document.getElementById('lpOPr').textContent = '+' + fmt(profit, 0);
    document.getElementById('lpCalcHint').textContent = `لو السعر نزل لـ ${fmt(lastP)} ونفّذت كل المستويات، متوسطك هيبقى ${fmt(avg)} (أقل من أول سعر بـ ${((1 - avg / P) * 100).toFixed(1)}%)، ومحتاج السهم يرتد ${((target / lastP - 1) * 100).toFixed(1)}% بس عشان تبيع المركز كله بربح ${g('cTp').value}%.`;
    const W = 600, H = 210, all = [...prices, ...avgs, target], mn = Math.min(...all) * .97, mx = Math.max(...all) * 1.02;
    const x = (i) => 30 + i * (W - 60) / Math.max(1, n - 1), y = (v) => 10 + (1 - (v - mn) / (mx - mn)) * (H - 30);
    const pl = (a) => a.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1)).join('');
    const gold = cv('--lp-gold'), up = cv('--lp-up'), mut = cv('--lp-muted'), sf = cv('--lp-surface');
    document.getElementById('lpCalcChart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><line x1="0" x2="${W}" y1="${y(target)}" y2="${y(target)}" stroke="${up}" stroke-width="2" stroke-dasharray="6 6"/><path d="${pl(prices)}" fill="none" stroke="${mut}" stroke-width="2" stroke-dasharray="3 5"/><path d="${pl(avgs)}" fill="none" stroke="${gold}" stroke-width="3.2" stroke-linecap="round"/>${prices.map((p, i) => `<circle cx="${x(i)}" cy="${y(p)}" r="5" fill="${sf}" stroke="${mut}" stroke-width="2"/><circle cx="${x(i)}" cy="${y(avgs[i])}" r="5.5" fill="${gold}"/>`).join('')}</svg>`;
    document.getElementById('lpCalcLegend').innerHTML = `<span style="color:${mut}">● سعر الشراء لكل مستوى</span><span style="color:${gold}">● متوسط التكلفة بعده</span><span style="color:${up}">- - الهدف <b class="lp-num">${fmt(target)}</b></span>`;
  }
  function countUp(el){
    const to = +el.dataset.count || 0, t0 = performance.now(), dur = 1600;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e).toLocaleString('en-US'); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function redrawAll(){ drawHero(false); drawTicker(); drawMk(false); drawWatch(); calc(); }
  LP.redraw = redrawAll;

  async function loadLiveMarkets(c){
    if (c.markets.mode !== 'live') return;
    const r = await apiGet('/landing_api.php?action=markets').catch(() => null);
    if (!alive() || !r || !r.success) return;
    const tabs = (r.tabs || []).filter(t => t.items && t.items.length).map(t => ({ label: t.label, items: t.items.map(it => ({ symbol: it.symbol, name: it.symbol, sub: it.market, last: it.last, series: it.series })) }));
    if (!tabs.length) return;
    MK = tabs; mkTab = 0; mkCur = 0;
    const note = document.getElementById('lpMkNote'); if (note) note.textContent = c.markets.note || '';
    drawTicker(); drawMk(true); drawWatch();
  }

  /* ---------------------------------------------------------------------
     07. الأزرار
     --------------------------------------------------------------------- */
  function modal(html){
    const m = document.createElement('div'); m.className = 'lp-modal'; m.innerHTML = `<div class="lp-modal-box">${html}<button type="button" class="lp-x" aria-label="إغلاق">×</button></div>`;
    (root || document.body).appendChild(m);
    const close = () => m.remove();
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('.lp-x')) close(); const a = e.target.closest('[data-act]'); if (a && m.contains(a)) { close(); act(a.dataset.act); } });
    return m;
  }
  function appSheet(c){
    const G = window.GShell;
    if (G && G.deferredInstall) { const p = G.deferredInstall; p.prompt(); p.userChoice && p.userChoice.finally(() => { G.deferredInstall = null; }); return; }
    const a = c.app, ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const links = [a.android && /^https:\/\//.test(a.android) ? `<a class="lp-btn lp-btn-main" href="${esc(a.android)}" target="_blank" rel="noopener">▶ Google Play</a>` : '', a.ios && /^https:\/\//.test(a.ios) ? `<a class="lp-btn lp-btn-ghost" href="${esc(a.ios)}" target="_blank" rel="noopener"> App Store</a>` : ''].join('');
    modal(`<img src="icon-192.png" alt="" style="width:72px;height:72px;border-radius:18px"><h3>${esc(a.label)}</h3><p>${esc(a.note || '')}</p>${links ? `<div class="lp-stores">${links}</div>` : ''}
      <p style="margin-top:14px;font-size:13.5px">${ios ? 'على الآيفون: افتح الموقع من Safari ← زر المشاركة ← «إضافة إلى الشاشة الرئيسية».' : 'على الموبايل أو الكمبيوتر: من قائمة المتصفح اختار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».'}</p>`);
  }
  let CUR = null;
  function act(a){
    a = String(a || '');
    if (a === 'register') return renderRegister();
    if (a === 'login') return renderLogin();
    if (a === 'plans') return typeof renderSubscriptionPlans === 'function' ? renderSubscriptionPlans() : renderRegister();
    if (a === 'privacy') return typeof renderPrivacyPolicyPage === 'function' ? renderPrivacyPolicyPage() : null;
    if (a === 'theme') { if (window.GShell && GShell.toggleTheme) GShell.toggleTheme(); else document.documentElement.toggleAttribute('data-theme'); setTimeout(redrawAll, 30); return; }
    if (a === 'app') return appSheet(CUR);
    if (a === 'menu') { const m = document.getElementById('lpMMenu'); if (m) m.classList.toggle('open'); return; }
    if (a === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (a === 'barx') { const b = root.querySelector('.lp-pbar'); const bar = (CUR.promos || []).find(p => p && p.on !== false && p.type === 'bar'); try { sessionStorage.setItem('lp_bar_x', (bar.title || '') + (bar.text || '')); } catch(e){} if (b) b.remove(); return; }
    if (a === 'admin') return typeof renderAdminLandingPage === 'function' ? renderAdminLandingPage() : null;
    if (a === 'studio') { if (window.GStudio && GStudio.openEditor) GStudio.openEditor(); return; }
    if (a.startsWith('section:')) { const el = document.getElementById('lp-' + a.slice(8)); const m = document.getElementById('lpMMenu'); if (m) m.classList.remove('open'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (a.startsWith('url:')) { const u = a.slice(4); if (/^https:\/\//.test(u)) window.open(u, '_blank', 'noopener'); return; }
  }
  LP.act = act;

  /* ---------------------------------------------------------------------
     08. الشاشة
     --------------------------------------------------------------------- */
  async function renderLanding(preview){
    const __tok = screenToken();
    pushNav(() => window.renderLanding(preview));
    if (typeof setBackButtonVisible === 'function') setBackButtonVisible(false);
    const d = await LP.load(!!preview);
    if (screenStale(__tok)) return;
    const c = d.cfg, L = d.live || { stats: {} }; CUR = c;
    clearTimers();
    app.innerHTML = pageHtml(c, L, !!preview);
    root = document.getElementById('lpRoot');
    document.body.classList.add('lp-on');
    // ألوان خاصة باللاندينج (لو الأدمن فصلها عن ثيم الموقع) + الخط
    if (c.theme.follow === false) {
      const b = hex(c.theme.brand), ink = hex(c.theme.ink);
      if (b) { root.style.setProperty('--lp-gold', b); root.style.setProperty('--lp-gold-deep', b); root.style.setProperty('--lp-tint', rgba(b, .14)); }
      if (ink) { root.style.setProperty('--lp-ink', ink); root.style.setProperty('--lp-on-ink', onColor(ink)); }
    }
    if (c.theme.font) {
      const f = window.GStudio && (GStudio.FONTS || []).find(x => x.name === c.theme.font);
      if (f && f.google && !document.getElementById('lpFont')) { const l = document.createElement('link'); l.id = 'lpFont'; l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`; document.head.appendChild(l); }
      root.style.setProperty('--lp-font', `'${String(c.theme.font).replace(/'/g, '')}','IBM Plex Sans Arabic',Tahoma,sans-serif`);
    }
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b || !root.contains(b) || b.closest('.lp-modal')) return; e.preventDefault(); act(b.dataset.act); });
    // الأسواق: توضيحية فورًا ، وبعدين الحقيقية لو مربوطة
    MK = demoMarkets(); mkTab = 0; mkCur = 0;
    if (c.markets.mode === 'live') { const note = document.getElementById('lpMkNote'); if (note) note.textContent = 'جارٍ تحميل الأسعار الحقيقية…'; }
    drawHero(true); drawTicker(); drawMk(true); drawWatch(); calc();
    root.querySelectorAll('.lp-calc input[type=range]').forEach(r => r.addEventListener('input', calc));
    const seg = document.getElementById('lpPvSeg'); if (seg) seg.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (!b) return; seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); heroRange = +b.dataset.r; drawHero(true); });
    const tabs = document.getElementById('lpMkTabs'); if (tabs) tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; mkTab = +b.dataset.tab; mkCur = 0; drawMk(true); });
    const list = document.getElementById('lpMkList'); if (list) list.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; mkCur = +b.dataset.i; drawMk(true); });
    const rng2 = document.getElementById('lpMkRange'); if (rng2) rng2.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (!b) return; rng2.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); mkRange = +b.dataset.r; drawMkMain(true); });
    // الكتابة المتحركة
    const words = (c.hero.words || []).filter(Boolean), typed = document.getElementById('lpTyped');
    if (typed && words.length > 1) { let wi = 0, ci = words[0].length, del = true;
      const loop = () => { if (!alive()) return; const w = words[wi];
        if (del) { ci--; if (ci <= 0) { del = false; wi = (wi + 1) % words.length; } } else { ci++; if (ci >= words[wi].length) { del = true; typed.textContent = words[wi]; return setTimeout(loop, 2200); } }
        typed.textContent = (del ? w : words[wi]).slice(0, Math.max(0, ci)) || '​'; setTimeout(loop, del ? 45 : 85); };
      setTimeout(loop, 2600); }
    timers.push(setInterval(() => { if (!alive()) return clearTimers(); const v = document.getElementById('lpPvVal'); if (v) { heroSeries[heroSeries.length - 1] *= 1 + (Math.random() - .48) * .0015; v.textContent = fmt(heroSeries[heroSeries.length - 1]); } }, 2500));
    // الظهور مع التمرير + العدادات
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add('lp-in'); e.target.querySelectorAll('[data-count]').forEach(countUp); io.unobserve(e.target); }), { threshold: .12 }) : null;
    root.querySelectorAll('.lp-rev').forEach(el => io ? io.observe(el) : el.classList.add('lp-in'));
    // العرض المنبثق (مرة في الجلسة)
    const pop = (c.promos || []).find(p => p && p.on !== false && p.type === 'popup');
    if (pop && !preview) { let seen = false; const key = 'lp_pop_' + (pop.title || '') + (pop.text || ''); try { seen = !!sessionStorage.getItem(key); } catch(e){}
      if (!seen) setTimeout(() => { if (!alive()) return; try { sessionStorage.setItem(key, '1'); } catch(e){} const img = imgSrc(pop.img);
        modal(`${img ? `<img src="${esc(img)}" alt="">` : ''}<h3>${T(pop.title || '')}</h3>${pop.text ? `<p>${esc(pop.text)}</p>` : ''}${pop.btn ? btnHtml(pop.btn, pop.action === 'url' ? 'url:' + (pop.url || '') : (pop.action || 'register'), true) : ''}`); }, Math.max(1, +pop.delay || 6) * 1000); }
    loadLiveMarkets(c);
  }
  window.renderLanding = renderLanding;
})();
