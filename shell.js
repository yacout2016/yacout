/* =====================================================================
   GRIFFINE App Shell — واجهة التطبيق (الإصدار 82)
   ---------------------------------------------------------------------
   الملف ده هو "الهيكل" اللي بيلف كل شاشات الموقع القديمة (ملفات app-*.js - كانت griffine.js قبل الإصدار 88):
     - شريط علوي + شريط تبويبات سفلي (موبايل) / شريط جانبي (كمبيوتر)
     - الشاشة الرئيسية الجديدة (قيمة المحفظة والأرباح والاستثمارات)
     - شاشة "حسابي" بدل القائمة المنسدلة القديمة
     - إشعارات Toast بدل نوافذ alert
     - تثبيت الموقع كتطبيق (PWA)
     - طباعة صور كل الشاشات في ملف PDF واحد (من لوحة التحكم)
     - ربط استوديو التصميم (studio.js): بعد رسم أي شاشة بيتطبق الثيم وتعديلات النصوص والتنسيق

   قاعدة أمان: كل نص جاي من المستخدم بيعدّي على esc() قبل ما يتعرض.

   ---------------------------------------------------------------------
   فهرس الأقسام (كل قسم عليه فاصل ورقمه):
     00. إعدادات عامة (رقم الإصدار + إيقاف الاستعلامات والصفحة مخفية)
     01. أدوات مساعدة (esc / $ / store)
     02. الأيقونات الخطية
     03. ثوابت ودوال التنسيق (العملات / الألوان / الأرقام)
     04. الإشعارات المنبثقة Toast
     05. القائمة المنبثقة من الأسفل (Bottom Sheet)
     06. التنقل: ربط كل شاشة بالتبويب بتاعها
     07. بناء الهيكل (الشريط العلوي / التبويبات / الشريط الجانبي)
     08. الوضع الليلي/النهاري + الشعارين (فاتح وغامق)
     09. الصورة الشخصية + تسجيل الخروج
     10. التوصيات: عداد الجرس
     11. معالجة كل شاشة بعد رسمها (تنظيف الإيموجي / العنوان / زر الرجوع)
     12. مفتاح DCA / Grid فوق قوائم الخطط
     13. الشاشة الرئيسية
     14. شاشة حسابي
     15. حذف الحساب
     15ب. مركز الإيميلات (لوحة التحكم)
     16. طباعة صور كل الشاشات (PDF)
     17. قائمة الزائر (قبل تسجيل الدخول)
     18. التثبيت كتطبيق (PWA)
     19. التشغيل (init)

   طريقة الإضافة (قابلية التطوير):
     - شاشة جديدة للعميل: أضفها في TAB_OF (قسم 06) وفي SCREENS_TO_PRINT (قسم 16)
       (SCREENS_TO_PRINT هي نفسها قائمة الشاشات في استوديو التصميم)
     - عنصر جديد في الشريط الجانبي: sideItems() (قسم 06)
     - أيقونة جديدة: جدول P (قسم 02)
   ===================================================================== */
(function(){
  'use strict';

  /* =====================================================================
     00. إعدادات عامة
     ===================================================================== */

  // رقم الإصدار - بيظهر في شاشة "حسابي" (غيّره مع ?v= في index.php و VERSION في sw.js)
  const APP_VERSION = 135;

  /* الاستعلامات المتكررة (الدردشة/التوصيات/قائمة المتابعة) - استعلام متكيّف (الإصدار 89)
     - بتقف لما التبويب يكون مخفي أو الموبايل مقفول
     - لو المستخدم مش بيتفاعل (مفيش لمس/كتابة/سكرول): المدة بتطول تدريجيًا (×3 بعد دقيقتين، ×8 بعد 5 دقائق، بحد أقصى دقيقتين)
     - أول ما المستخدم يرجع يتفاعل أو الصفحة تظهر: كل الاستعلامات بتشتغل فورًا وترجع لسرعتها العادية
     - أي مؤقت أطول من دقيقة بيفضل شغال عادي */
  (function(){
    const nativeSetInterval = window.setInterval.bind(window);
    const nativeClearInterval = window.clearInterval.bind(window);
    window.__nativeSetInterval = nativeSetInterval;   // للحاجات اللي لازم تفضل شغالة في الخلفية (زي إشعارات شات الأدمن)
    const polls = new Map();
    let lastActive = Date.now();
    const factor = () => { const idle = Date.now() - lastActive; return idle > 300000 ? 8 : idle > 120000 ? 3 : 1; };
    const runAll = () => polls.forEach(p => { if (Date.now() - p.last > p.ms * 0.8) { p.last = Date.now(); try { p.fn.apply(window, p.rest); } catch(e){ console.error(e); } } });
    const onActive = () => { const wasIdle = factor() > 1; lastActive = Date.now(); if (wasIdle && !document.hidden) runAll(); };
    ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(ev => window.addEventListener(ev, onActive, { passive:true, capture:true }));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastActive = Date.now(); runAll(); } });
    window.setInterval = function(fn, ms){
      const rest = Array.prototype.slice.call(arguments, 2);
      if (typeof fn !== 'function' || !(ms <= 60000)) return nativeSetInterval.apply(window, arguments);
      const p = { fn, ms, rest, last: Date.now() };
      const id = nativeSetInterval(function(){
        if (document.hidden) return;
        const every = Math.min(ms * factor(), Math.max(ms, 120000));
        if (Date.now() - p.last < every - 50) return;
        p.last = Date.now(); fn.apply(this, rest);
      }, ms);
      polls.set(id, p);
      return id;
    };
    window.clearInterval = function(id){ polls.delete(id); return nativeClearInterval(id); };
    window.__pollIdleFactor = factor;   // للاختبارات
    window.__pollSetIdle = (msAgo) => { lastActive = Date.now() - msAgo; };
  })();

  // الكائن العام للهيكل - متاح لملفات app-*.js باسم window.GShell
  const GS = window.GShell = {
    enabled: false,          // اتفعّل ولا بعد (init)
    seq: 0,                  // عدّاد الشاشات - أي تحميل متأخر لشاشة قديمة بيتلغي لو الرقم اتغيّر
    tab: 'home',             // التبويب النشط
    email: null,             // بريد المستخدم الحالي (null = زائر)
    settings: {},            // إعدادات إخفاء الشاشات من لوحة التحكم
    deferredInstall: null,   // حدث تثبيت التطبيق (PWA) حتى ما المستخدم يدوس "تثبيت"
    version: APP_VERSION
  };


  /* =====================================================================
     01. أدوات مساعدة
     ===================================================================== */

  // تأمين النصوص قبل وضعها في HTML
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  GS.esc = esc;

  // اختصار querySelector
  const $ = (sel, root) => (root || document).querySelector(sel);

  // التخزين المحلي - محمي بـ try عشان وضع التصفح الخفي
  const store = {
    get(k, d){ try{ const v = localStorage.getItem(k); return v == null ? d : v; }catch(e){ return d; } },
    set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  };

  // انتظار عدد ملي ثانية
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));


  /* =====================================================================
     02. الأيقونات الخطية (على طراز Lucide) - بدل الإيموجي
     ===================================================================== */
  const P = {
    home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    layers:'<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
    pie:'<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M21 12a9 9 0 0 0-9-9"/>',
    balance:'<path d="M12 3v18"/><path d="M7 21h10"/><path d="M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0z"/><path d="M19 7l-3 7a3 3 0 0 0 6 0z"/>',   // الإصدار 116: ميزان
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
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    brush:'<path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L12 14.8 9.2 12z"/><path d="M9.2 12c-2 0-3.6 1.6-3.6 3.6 0 1.6-1.1 2.9-2.6 3.4 1 1.3 2.6 2 4.3 2 3.2 0 5.7-2.6 5.7-5.7z"/>',
    // الإصدار 89: أيقونات إضافية للأزرار (بدل الإيموجي)
    trash:'<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>',
    printer:'<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    save:'<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v6h8V3M7 21v-7h10v7"/>',
    edit:'<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    refresh:'<path d="M20 11a8 8 0 0 0-14.8-4M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.8 4M20 20v-4h-4"/>',
    upload:'<path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 3h14"/>',
    share:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
    archive:'<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/>',
    tag:'<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    clip:'<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 13.5a7 7 0 0 1 4 6.5"/>',
    key:'<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l2 2"/>',
    file:'<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
    bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || P.info}</svg>`;
  GS.icon = icon;
  /* الإصدار 96: أسواق الحسابات - window.__acct = { market, currency, ccyAr, active[], markets{}, payment }
     allowedMarkets(): العميل ← سوق حسابه بس ، الأدمن/الموظف ← الأسواق المفعّلة */
  GS.loadAccountMarket = async (fresh) => {
    if (!fresh && window.__acct) return window.__acct;
    const r = await apiGet('/account_market.php');
    if (r && r.success) window.__acct = r;
    return window.__acct;
  };
  window.gAllowedMarkets = () => { const a = window.__acct; if (!a) return null; return (window.__isAdmin ? a.active : [a.market]).slice(); };
  window.gCcyAr = (m) => { const a = window.__acct; return a && a.markets && a.markets[m] ? a.markets[m].ccyAr : ''; };
  GS.versionLabel = () => { if (!GS.__verP) GS.__verP = apiGet('/site_public_config.php').then(r => (r && r.config && r.config.versionLabel) || '').catch(() => ''); return GS.__verP; };


  /* =====================================================================
     03. ثوابت ودوال التنسيق
     ===================================================================== */

  // اسم العملة بالعربي → الكود المختصر
  const CCY_CODE = { 'جنيه مصري':'EGP', 'ريال سعودي':'SAR', 'درهم إماراتي':'AED', 'ريال قطري':'QAR', 'دينار كويتي':'KWD' };

  // ألوان شريط توزيع المحفظة
  const PALETTE = ['#D4AF37','#3B82F6','#10B981','#F97316','#A855F7','#EC4899','#14B8A6','#EAB308'];

  // لون ثابت لكل رمز سهم (نفس الرمز = نفس اللون دايمًا)
  const SYMBOL_COLORS = ['#1F2A44','#0F766E','#7C3AED','#B45309','#1D4ED8','#BE123C','#047857','#374151'];
  const symColor = (s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return SYMBOL_COLORS[h % SYMBOL_COLORS.length]; };

  // تنسيق المبالغ (بيستخدم fmtMoney من app-core.js لو موجودة)
  const money = (n) => (typeof fmtMoney === 'function') ? fmtMoney(n) : Number(n || 0).toFixed(2);

  // هل الشاشة دي مخفية من لوحة التحكم؟
  const hidden = (k) => GS.settings && GS.settings[k] === true;

  // زرار "العين" لإخفاء الأرقام في الرئيسية
  const valuesHidden = () => store.get('gs_hide_values', '0') === '1';
  const mask = (s) => valuesHidden() ? '••••••' : s;

  // نسبة مئوية بعلامة + / -
  const pct = (n) => (n == null || isNaN(n)) ? '—' : `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`;

  // تحية حسب الوقت
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'صباح الخير' : 'مساء الخير'; };


  /* =====================================================================
     04. الإشعارات المنبثقة Toast (بدل alert)
     - النوع بيتحدد تلقائيًا من نص الرسالة لو مش متحدد (خطأ / نجاح / معلومة)
     - أقصى 3 إشعارات ظاهرة في نفس الوقت
     ===================================================================== */
  GS.toast = function(msg, type){
    msg = String(msg == null ? '' : msg).trim();
    if (!msg) return;

    // 1) تحديد النوع
    if (!type) {
      if (/خطأ|فشل|تعذّر|تعذر|غير ممكن|غير ممكن|غير صحيح|غير صالح|لازم|يجب|غير موجود|غير موجود|مرفوض|لا يمكن|حدث خطأ|انقطع|لم يصل|لم تتم|غير متاح/.test(msg)) type = 'err';
      else if (/تم |تم$|بنجاح|تم الحفظ|أُرسلت|أُرسل|✅/.test(msg)) type = 'ok';
      else type = 'info';
    }

    // 2) الحاوية (بتتعمل مرة واحدة)
    let wrap = $('.gs-toasts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'gs-toasts';
      wrap.setAttribute('role','status');
      wrap.setAttribute('aria-live','polite');
      document.body.appendChild(wrap);
    }

    // 3) الإشعار نفسه
    const t = document.createElement('div');
    t.className = 'gs-toast ' + type;
    t.innerHTML = `<span class="ti">${icon(type === 'err' ? 'alert' : type === 'ok' ? 'check' : 'info')}</span><span class="tx"></span><button type="button" class="tc" aria-label="إغلاق">${icon('x')}</button>`;
    t.querySelector('.tx').textContent = msg.replace(/^[✅❌⚠️\s]+/u, '');

    const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 200); };
    t.querySelector('.tc').onclick = close;
    wrap.appendChild(t);
    while (wrap.children.length > 3) wrap.firstChild.remove();

    // 4) يختفي لوحده (مدة أطول للرسائل الطويلة)
    setTimeout(close, Math.min(9000, 3200 + msg.length * 45));
  };


  /* =====================================================================
     05. القائمة المنبثقة من الأسفل (Bottom Sheet)
     - على الكمبيوتر بتظهر كنافذة في النص (من shell.css)
     ===================================================================== */
  GS.sheet = function(title, html, onMount){
    GS.closeSheet();
    const back = document.createElement('div');
    back.className = 'gs-sheet-back'; back.id = 'gsSheetBack';

    const sh = document.createElement('div');
    sh.className = 'gs-sheet'; sh.id = 'gsSheet';
    sh.setAttribute('role','dialog'); sh.setAttribute('aria-modal','true');
    sh.innerHTML = `<div class="gs-sheet-grab"></div>${title ? `<h4>${esc(title)}</h4>` : ''}${html}`;

    document.body.appendChild(back);
    document.body.appendChild(sh);
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


  /* =====================================================================
     06. التنقل: ربط كل شاشة بالتبويب بتاعها
     ===================================================================== */

  // كل دالة شاشة → التبويب اللي يتنوّر وهي مفتوحة
  const TAB_OF = {
    renderHome:'home',
    renderPlansList:'plans', renderGridPlansList:'plans', renderPlanDetail:'plans', renderGridPlanDetail:'plans',
    renderPlanTypeChooser:'plans', renderNewPlanForm:'plans', renderGridPlanForm:'plans', renderEditPlanSettings:'plans', renderGridEditPlanSettings:'plans',
    renderPortfolio:'portfolio', renderDiversificationReport:'mizan',
    renderScreener:'screener',
    renderBasira:'basira', renderMizanAi:'mizanai',
    renderRecommendationsCustomerPage:'rec',
    renderAccount:'account', renderProfilePage:'account', renderSubscriptionPlans:'account', renderMySubscriptionHistory:'account',
    renderReferralPage:'account', renderAboutPage:'account', renderContactInfo:'account', renderRefundPolicyPage:'account',
    renderArticlesListPage:'account', renderArticleDetailPage:'account', renderTestimonialsPage:'account', renderSuggestionsPage:'account',
    renderDisclaimerPage:'account', renderPrivacyPolicyPage:'account', renderCheckoutForm:'account', renderPlanChangeCheckout:'account'
  };

  /* ---------------------------------------------------------------------
     نظام التنقل بالمستويات (الإصدار 72)
     المستوى الأول (الجذر) = الشاشات اللي ليها زرار مباشر في التبويبات / القائمة الجانبية
         ← الشريط العلوي فيه الشعار، ومفيش زرار رجوع
     المستوى التاني وأعمق = أي شاشة بتتفتح من جوه شاشة تانية
         ← الشريط العلوي ثابت: سهم رجوع + اسم الصفحة (والعنوان مبيتكررش جوه الصفحة)
         ← على الموبايل شريط التبويبات السفلي بيختفي
     الرجوع: للشاشة اللي جيت منها، ولو السجل فارغ (رابط مباشر / تحديث الصفحة) ← للشاشة الأم في PARENT
     --------------------------------------------------------------------- */
  const ROOTS = { renderHome:1, renderPlansList:1, renderGridPlansList:1, renderPortfolio:1, renderScreener:1, renderAccount:1, renderPublicHome:1, renderAdminHub:1 };
  // التوصيات بتبقى جذر لو هي اللي واخدة مكان الكشاف في التبويبات
  const isRootScreen = (name) => !!ROOTS[name] || (name === 'renderRecommendationsCustomerPage' && hidden('hide_screener_screen'));

  /* الشاشة الأم لكل شاشة داخلية: (args) => فتح الشاشة الأم
     args = نفس المدخلات اللي الشاشة الحالية اتفتحت بيها (زي رمز السهم) */
  const toAccount = () => GS.email ? GS.renderAccount() : renderPublicHome();
  const PARENT = {
    renderPlanDetail: () => renderPlansList(),
    renderEditPlanSettings: (a) => a[0] ? renderPlanDetail(a[0]) : renderPlansList(),
    renderPlanTypeChooser: () => renderPlansList(),
    renderNewPlanForm: () => renderPlanTypeChooser(),
    renderGridPlanDetail: () => renderGridPlansList(),
    renderGridEditPlanSettings: (a) => a[0] ? renderGridPlanDetail(a[0]) : renderGridPlansList(),
    renderGridPlanForm: () => renderPlanTypeChooser(),
    renderDiversificationReport: () => renderHome(),
    renderRecommendationsCustomerPage: () => renderHome(),
    renderArticleDetailPage: () => renderArticlesListPage(),
    renderCheckoutForm: () => renderSubscriptionPlans(),
    renderPlanChangeCheckout: () => renderSubscriptionPlans(),
    renderDeleteAccount: toAccount,
    renderEmailCenter: () => renderAdminHub(),
    // الإصدار 88
    renderStockPage: () => renderWatchlistPage(),
    renderWatchlistPage: () => renderHome(),
    renderAlertsPage: () => renderHome(),
    renderHrPage: () => renderAdminHub(),
    renderJobTitlesPage: () => renderAdminHub(),
    // الإصدار 89
    renderTradesReportPage: () => renderAdminHub(),
    renderFaqAdminPage: () => renderAdminHub(),
    renderTrashPage: toAccount,
  };
  ['renderProfilePage','renderSubscriptionPlans','renderMySubscriptionHistory','renderReferralPage','renderAboutPage','renderContactInfo',
   'renderRefundPolicyPage','renderArticlesListPage','renderTestimonialsPage','renderSuggestionsPage','renderDisclaimerPage','renderPrivacyPolicyPage']
    .forEach(n => { PARENT[n] = toAccount; });

  function parentOf(name){
    if (PARENT[name]) return PARENT[name];
    if (ADMIN_SCREEN_RE.test(name)) return () => renderAdminHub();
    return () => (GS.email ? renderHome() : renderPublicHome());
  }

  // زرار الرجوع في الشريط العلوي
  GS.goBack = function(){
    if (window.__screenIndex > 0) return history.back();          // فيه شاشة قبلها في السجل
    const go = parentOf(GS.currentScreen);                          // لا يوجد ← الشاشة الأم
    const args = GS.screenArgs || [];
    // الشاشة الأم بتاخد مكان الشاشة الحالية في السجل (مش فوقها) - عشان الرجوع التاني يطلع لفوق مش يلف تاني
    window.__screens = []; window.__screenIndex = -1;
    try { go(args); } catch(e){ GS.email ? renderHome() : renderPublicHome(); }
  };

  // تطبيق شكل المستوى على الهيكل (body.gs-sub = شاشة داخلية)
  GS.applyNavMode = function(){
    const sub = !GS.isRoot;
    document.body.classList.toggle('gs-sub', sub);
    const bar = $('.gs-appbar'); if (bar) bar.classList.toggle('title-always', sub);
    GS.setBackVisible(sub);
  };

  // شاشات لوحة التحكم (بتنوّر تبويب "الإدارة")
  const ADMIN_SCREEN_RE = /^renderAdmin|^renderChatAdmin|^renderStaff|^renderHr|^renderJobTitles|^renderBlacklist|^renderPlansManagement|^renderSiteDesign|^renderSiteTexts|^renderContentAdmin|^renderRecommendationsAdmin|^renderSuggestionsAdmin|^renderArchived/;

  /* بنلف دوال الشاشات الحقيقية بس (اللي بتسجّل نفسها في سجل التنقل pushNav)
     عشان قبل كل شاشة: نحدّث التبويب النشط، ونعرف هي جذر ولا لأ، ونرجع لأول الصفحة */
  function wrapRenderers(){
    Object.keys(window)
      .filter(k => /^render[A-Z]/.test(k) && typeof window[k] === 'function' && !window[k].__gsWrapped && /pushNav\(/.test(Function.prototype.toString.call(window[k])))
      .forEach(name => {
        const orig = window[name];
        const tab = TAB_OF[name] || (ADMIN_SCREEN_RE.test(name) ? 'admin' : null);

        const wrapped = function(){
          GS.seq++;
          GS.sub = /Grid/.test(name) ? 'grid' : (tab === 'plans' ? 'dca' : null);
          if (tab) GS.setTab(tab);
          GS.isRoot = isRootScreen(name);
          GS.screenArgs = Array.prototype.slice.call(arguments);
          GS.markScreen(name);
          GS.applyNavMode();
          GS.titleHint = (name === 'renderPlanDetail' || name === 'renderGridPlanDetail') && arguments[0]
            ? `${arguments[0]} · ${name === 'renderGridPlanDetail' ? 'خطة شبكة Grid' : 'خطة DCA'}`
            : '';

          // شاشة جديدة تبدأ من فوق (زي أي تطبيق)
          try { window.scrollTo(0, 0); } catch(e){}

          const r = orig.apply(this, arguments);

          // مفتاح DCA/Grid فوق قوائم الخطط بعد ما الشاشة تخلص رسم
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

  // تنوير التبويب/العنصر النشط في الشريط السفلي والجانبي
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

  // زرار الرجوع مكان الشعار (في غير شاشات الجذر)
  GS.setBackVisible = function(v){
    const b = $('#gsBackBtn'), brand = $('#gsBrandBtn');
    if (!b) return;
    const show = v && !GS.isRoot;
    b.style.display = show ? '' : 'none';
    if (brand) brand.style.display = show ? 'none' : '';
  };

  /* اسم الشاشة الحالية على body (data-gs-screen) - استوديو التصميم بيستخدمه
     عشان تعديلات كل شاشة تتطبق عليها هي بس */
  GS.markScreen = function(name){
    GS.currentScreen = name;
    document.body.setAttribute('data-gs-screen', name);
    GS.setTab(GS.tab);   // تنوير العنصر الصح في القائمة الجانبية (العناصر المربوطة بشاشة معيّنة)
  };

  // تطبيق تعديلات استوديو التصميم (لو الملف متحمّل)
  const applyStudio = () => { if (window.GStudio) window.GStudio.apply(); };

  // تبويبات الموبايل السفلية (حسب الشاشات المسموحة)
  function tabsForUser(){
    const tabs = [ { tab:'home', label:'الرئيسية', ic:'home', go:() => renderHome() } ];
    if (!(hidden('hide_dac_screen') && hidden('hide_grid_screen'))) tabs.push({ tab:'plans', label:'خططي', ic:'layers', go:() => hidden('hide_dac_screen') ? renderGridPlansList() : renderPlansList() });
    if (!hidden('hide_portfolio_screen')) tabs.push({ tab:'portfolio', label:'المحفظة', ic:'pie', go:() => renderPortfolio() });
    if (!hidden('hide_screener_screen')) tabs.push({ tab:'screener', label:'الكشاف', ic:'radar', go:() => renderScreener() });
    else if (!hidden('hide_recommendations_screen')) tabs.push({ tab:'rec', label:'التوصيات', ic:'megaphone', go:() => renderRecommendationsCustomerPage() });
    tabs.push({ tab:'account', label:'حسابي', ic:'user', go:() => GS.renderAccount() });
    return tabs;
  }

  // عناصر الشريط الجانبي على الكمبيوتر ({sec} = عنوان قسم)
  function sideItems(){
    const items = [
      // الإصدار 135: زرار «الباقات والأسعار» بلون مميز فوق للمشترك (يختار / يرقّي باقته من غير ما يدوّر)
      !window.__isAdmin && { screen:'renderSubscriptionPlans', cta:true, label:'💎 الباقات والأسعار', ic:'card', go:() => renderSubscriptionPlans() },
      { tab:'home', label:'الرئيسية', ic:'home', go:() => renderHome() },
      !hidden('hide_dac_screen') && { tab:'plans', sub:'dca', pk:'dca', label:'خطط تعزيز المتوسط (DCA)', ic:'layers', go:() => renderPlansList() },
      !hidden('hide_grid_screen') && { tab:'plans', sub:'grid', pk:'grid', label:'خطط الشبكة (Grid)', ic:'grid', go:() => renderGridPlansList() },
      !hidden('hide_portfolio_screen') && { tab:'portfolio', pk:'portfolio', label:'المحفظة والتقارير', ic:'pie', go:() => renderPortfolio() },
      (window.__isAdmin || !hidden('hide_mizanai_screen')) && { tab:'mizanai', since:'122', pk:'mizanai', label:'ميزان GRIFFINE AI', ic:'balance', go:() => renderMizanAi() },   // الإصدار 122: مخطِّط التوزيع (قبل كشاف الأسهم)
      !hidden('hide_screener_screen') && { tab:'screener', pk:'screener', label:'كشاف الأسهم', ic:'radar', go:() => renderScreener() },
      (window.__isAdmin || !hidden('hide_mizan_screen')) && { tab:'mizan', since:'116', pk:'mizan', label:'ميزان محفظتك AI', ic:'balance', go:() => renderDiversificationReport() },   // الإصدار 116
      (window.__isAdmin || !hidden('hide_basira_screen')) && { tab:'basira', since:'114', pk:'basira|basira_scan', label:'بصيرة AI — تحليل الأسهم', ic:'bulb', go:() => renderBasira() },   // الإصدار 114
      !hidden('hide_recommendations_screen') && { tab:'rec', pk:'recs_short|recs_long', label:'التوصيات', ic:'megaphone', go:() => renderRecommendationsCustomerPage() },
      // الإصدار 88: قائمة المتابعة + تنبيهات الأسعار
      !hidden('hide_watchlist_screen') && { screen:'renderWatchlistPage', pk:'watchlist', label:'قائمة المتابعة', ic:'star', go:() => renderWatchlistPage() },
      !hidden('hide_alerts_screen') && { screen:'renderAlertsPage', pk:'alerts', label:'تنبيهات الأسعار', ic:'alert', badge:'alerts', go:() => renderAlertsPage() },
      !window.__isAdmin && !hidden('hide_trades_screen') && { screen:'renderTradesReportPage', pk:'portfolio', label:'تقرير صفقاتي', ic:'trend', go:() => renderTradesReportPage() },
      { sec:'حسابي' },
      { tab:'account', label:'حسابي والإعدادات', ic:'settings', go:() => GS.renderAccount() },
      { screen:'renderSubscriptionPlans', label:'الاشتراك والباقات', ic:'card', go:() => renderSubscriptionPlans() },
      !hidden('hide_referral_screen') && { screen:'renderReferralPage', label:'ادعُ صديقك', ic:'gift', go:() => renderReferralPage() },
      !hidden('hide_trash_screen') && { screen:'renderTrashPage', label:'سلة المحذوفات', ic:'trash', go:() => renderTrashPage() },
    ].filter(Boolean);
    // لوحة التحكم بتفتح شاشة الأزرار (renderAdminHub) - الشاشات الفرعية مبقتش بتكرر الأزرار دي (الإصدار 72)
    // + اختصارات مباشرة لأهم شاشات الإدارة حسب صلاحيات كل موظف (الإصدار 73)
    if (window.__isAdmin) {
      const can = (perm) => typeof hasPermission === 'function' && hasPermission(perm);
      items.push({ sec:'الإدارة' }, { screen:'renderAdminHub', label:'لوحة التحكم', ic:'admin', go:() => renderAdminHub() });
      if (can('manage_subscribers')) items.push({ screen:'renderAdminSubscribers', label:'المشتركون والاشتراكات', ic:'card', go:() => renderAdminSubscribers() });
      if (can('manage_staff')) items.push({ screen:'renderStaffManagementPage', label:'الموظفين والصلاحيات', ic:'user', go:() => renderStaffManagementPage() });
      if (can('manage_hr')) items.push({ screen:'renderHrPage', label:'شؤون الموظفين (HR)', ic:'user', go:() => renderHrPage() });
      if (can('view_reports')) items.push({ screen:'renderTradesReportPage', label:'تقرير الصفقات', ic:'trend', go:() => renderTradesReportPage() });
      if (can('view_chat')) items.push({ screen:'renderChatAdminPage', label:'الدردشة الفورية', ic:'chat', go:() => renderChatAdminPage() });
    }
    return items;
  }


  /* =====================================================================
     07. بناء الهيكل (بيتعمل مرة واحدة) + تحديثه مع كل دخول/خروج
     ===================================================================== */
  function buildChrome(){
    // الشريط العلوي
    if (!$('.gs-appbar')) {
      const bar = document.createElement('header');
      bar.className = 'gs-appbar';
      bar.innerHTML = `
        <button type="button" class="gs-iconbtn" id="gsBackBtn" aria-label="رجوع" style="display:none">${icon('back')}</button>
        <button type="button" class="gs-appbar-brand" id="gsBrandBtn" aria-label="الرئيسية"><img alt="GRIFFINE" id="gsBrandImg"><span>GRIFFINE</span></button>
        <div class="gs-appbar-title" id="gsTitle"></div>
        <div id="gsBarEnd" style="display:flex;align-items:center;"></div>`;
      document.body.appendChild(bar);
      $('#gsBackBtn').onclick = () => GS.goBack();
      $('#gsBrandBtn').onclick = () => GS.email ? renderHome() : renderPublicHome();
    }
    // شريط التبويبات السفلي (موبايل)
    if (!$('.gs-tabbar')) {
      const tb = document.createElement('nav');
      tb.className = 'gs-tabbar'; tb.setAttribute('aria-label','التنقل الرئيسي');
      document.body.appendChild(tb);
    }
    // الشريط الجانبي (كمبيوتر)
    if (!$('.gs-sidebar')) {
      const sb = document.createElement('aside');
      sb.className = 'gs-sidebar'; sb.setAttribute('aria-label','القائمة الجانبية');
      document.body.appendChild(sb);
    }
  }

  // تحديث الهيكل كله حسب المستخدم الحالي (بتتنادى من refreshTopNav في app-nav.js)
  GS.refresh = async function(email){
    if (!GS.enabled) return;
    GS.email = email || null;
    document.body.classList.toggle('gs-anon', !email);
    try { GS.allSettings = email ? await getAdminSettings() : {}; } catch(e){ GS.allSettings = {}; }
    try { if (email && window.gPerksLoad) await window.gPerksLoad(); } catch(e){}   // الإصدار 135: مميزات الباقة (🔒 في القائمة)
    GS.settings = (email && !window.__isAdmin) ? (GS.allSettings || {}) : {};
    // الإصدار 96: سوق الحساب وعملته + الأسواق المفعّلة (الأدمن بيشتغل على الأسواق المفعّلة كلها)
    try { await GS.loadAccountMarket(true); } catch(e){}
    const img = $('#gsBrandImg'); if (img) img.src = brandSrc();

    // ---- أزرار نهاية الشريط العلوي ----
    const end = $('#gsBarEnd');
    if (email) {
      end.innerHTML = `${!hidden('hide_recommendations_screen') ? `<button type="button" class="gs-iconbtn" id="gsBellBtn" aria-label="التوصيات">${icon('bell')}<span class="gs-badge" id="gsBellBadge" style="display:none"></span></button>` : ''}
        ${GS.allSettings && GS.allSettings.hide_site_search === true ? '' : `<button type="button" class="gs-iconbtn" id="gsSearchBtn" aria-label="بحث في الموقع" title="بحث في الموقع">${icon('search')}</button>`}
        ${isStandalone() || (GS.allSettings && GS.allSettings.hide_install_icon === true) ? '' : `<button type="button" class="gs-iconbtn" id="gsInstallIcon" aria-label="تثبيت التطبيق" title="تثبيت تطبيق GRIFFINE">${icon('download')}</button>`}
        <button type="button" class="gs-iconbtn" id="gsThemeBtn" aria-label="تبديل الوضع الليلي">${icon('moon')}</button>`;
      const sBtn = $('#gsSearchBtn'); if (sBtn) sBtn.onclick = () => GS.openSearch();
      const iBtn = $('#gsInstallIcon'); if (iBtn) iBtn.onclick = () => GS.installApp();
      const bell = $('#gsBellBtn'); if (bell) bell.onclick = () => { GS.markRecsSeen(); renderRecommendationsCustomerPage(); };
    } else {
      end.innerHTML = `<button type="button" class="gs-iconbtn" id="gsThemeBtn" aria-label="تبديل الوضع الليلي">${icon('moon')}</button>
        <button type="button" class="gs-iconbtn" id="gsAnonMenu" aria-label="القائمة">${icon('menu')}</button>`;
      $('#gsAnonMenu').onclick = GS.openPublicMenu;
    }
    $('#gsThemeBtn').onclick = GS.toggleTheme;

    // ---- التبويبات السفلية ----
    const tb = $('.gs-tabbar');
    if (email) {
      const tabs = tabsForUser();
      tb.style.gridTemplateColumns = `repeat(${tabs.length},1fr)`;
      tb.innerHTML = tabs.map((t, i) => `<button type="button" class="gs-tab" data-tab="${t.tab}" data-i="${i}" data-gs-key="tab-${t.tab}"><span class="gs-tab-icon">${icon(t.ic)}</span><span>${t.label}</span></button>`).join('');
      tb.querySelectorAll('.gs-tab').forEach(b => b.onclick = () => { GS.closeSheet(); tabs[+b.dataset.i].go(); });
    } else tb.innerHTML = '';

    // ---- الشريط الجانبي ----
    const sb = $('.gs-sidebar');
    if (email) {
      const items = sideItems();
      // الإصدار 114: كل عنصر ليه اسم ثابت (data-gs-key) ← تعديلات استوديو التصميم بتتطبق على نفس العنصر عند كل المستخدمين مهما اختلفت القائمة
      const pkOff = (it) => !!(it.pk && window.gPerk && !String(it.pk).split('|').some(k => window.gPerk(k)));   // الإصدار 135
      const skey = (it) => it.sec ? 'sec-' + ({ 'حسابي': 'account', 'الإدارة': 'admin' }[it.sec] || 'x') : (it.screen || (it.tab + (it.sub ? '-' + it.sub : '')));
      sb.innerHTML = `<div class="gs-side-brand" id="gsSideBrand" data-gs-key="side-brand"><img src="${brandSrc()}" alt="GRIFFINE"><span>GRIFFINE</span></div>
        ${items.map((it, i) => it.sec
          ? `<div class="gs-side-sec" data-gs-key="${skey(it)}">${it.sec}</div>`
          : `<button type="button" class="gs-side-item${it.cta ? ' gs-side-cta' : ''}${pkOff(it) ? ' gs-side-locked' : ''}" data-i="${i}" data-gs-key="${it.cta ? 'side-plans-cta' : skey(it)}"${it.since ? ` data-gs-since="${it.since}"` : ''} ${it.tab ? `data-tab="${it.tab}"` : ''} ${it.screen && !it.cta ? `data-screen="${it.screen}"` : ''} ${it.sub ? `data-sub="${it.sub}"` : ''}>${icon(it.ic)}<span>${it.label}</span>${pkOff(it) ? '<i class="gs-side-lock" title="مش ضمن باقتك">🔒</i>' : ''}${it.badge ? `<b class="gs-side-badge" data-gs-alerts-badge style="display:none"></b>` : ''}</button>`).join('')}
        <div class="gs-side-foot" data-gs-key="side-foot"><div class="gs-side-user" id="gsSideUser"><span class="gs-avatar" id="gsSideAvatar">${esc(email.charAt(0).toUpperCase())}</span><span class="t"><b>${esc(email)}</b><small>الملف الشخصي والإعدادات</small></span></div></div>`;
      sb.querySelectorAll('.gs-side-item').forEach(b => b.onclick = () => items[+b.dataset.i].go());
      $('#gsSideBrand').onclick = () => renderHome();
      $('#gsSideUser').onclick = () => GS.renderAccount();
      GS.loadAvatar().then(src => { const a = $('#gsSideAvatar'); if (src && a) a.innerHTML = `<img src="${esc(src)}" alt="">`; });
      GS.updateBell();
    } else sb.innerHTML = '';

    GS.setTab(GS.tab);
    applyStudio();   // نصوص القائمة الجانبية والتبويبات المعدّلة من استوديو التصميم
  };


  /* =====================================================================
     08. الوضع الليلي/النهاري + الشعارين
     ---------------------------------------------------------------------
     عندنا شعارين في griffine.js:
       GRIFFINE_LOGO_B64       → غامق على خلفية شفافة (للوضع النهاري)
       GRIFFINE_LOGO_DARK_B64  → فاتح على خلفية شفافة (للوضع الليلي) - عكس الأول بالظبط
     griffineLogoSrc() بترجع المناسب حسب الوضع الحالي.
     إصلاح الإصدار 71: أيقونة الدردشة مكانتش بتتحدّث مع تبديل الوضع (كان بيفضل الشعار الفاتح
     على خلفية بيضا فميبانش) - دلوقتي syncThemeAssets بتحدّث كل صور الشعار في الصفحة.
     ===================================================================== */
  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  function brandSrc(){ try { return griffineLogoSrc(); } catch(e){ return ''; } }

  // تحديث كل حاجة مرتبطة بالوضع: الشعارات + لون شريط المتصفح + مفتاح "حسابي"
  GS.syncThemeAssets = function(){
    // كل صور شعار GRIFFINE (الشريط / الجانبي / الترحيب / الدردشة ...) - ماعدا أيقونة التطبيق في لافتة التثبيت
    document.querySelectorAll('img[alt*="GRIFFINE"], img.brand-logo-img').forEach(img => { img.src = brandSrc(); });
    try { document.querySelectorAll('img[alt="Top7"]').forEach(img => { img.src = top7LogoSrc(); }); } catch(e){}
    const meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', isDark() ? '#0A0F16' : '#F3F4F6');
    const sw = $('#gsDarkSwitch'); if (sw) sw.checked = isDark();
  };

  GS.toggleTheme = function(){
    const toDark = !isDark();
    if (toDark) document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.removeAttribute('data-theme');
    store.set('griffine_theme', toDark ? 'dark' : 'light');
    GS.syncThemeAssets();
  };


  /* =====================================================================
     09. الصورة الشخصية + تسجيل الخروج
     ===================================================================== */
  GS.loadAvatar = async function(){
    if (GS._avatar !== undefined) return GS._avatar;   // متحملة قبل كده
    try {
      const r = await apiGet('/avatar_get.php');
      GS._avatar = (r && r.success && r.avatar && /^(data:image\/|file_get\.php)/.test(r.avatar)) ? r.avatar : null;
    } catch(e){ GS._avatar = null; }
    return GS._avatar;
  };

  GS.logout = async function(){
    GS._avatar = undefined;
    await setSession('');
    window.__screens = []; window.__screenIndex = -1;
    await refreshTopNav();
    gAfterLogout();
  };


  /* =====================================================================
     10. التوصيات: عداد الجرس (عدد التوصيات اللي المستخدم بعد مشافهاش)
     ===================================================================== */
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


  /* =====================================================================
     11. معالجة كل شاشة بعد رسمها
     - بتتنادى تلقائيًا من MutationObserver (قسم 19) مع أي تغيير في #app
     ===================================================================== */
  const EMOJI_LEAD = /^[\s‍️⃣\p{Extended_Pictographic}]+/u;

  // شيل الإيموجي من أول عقدة نصية فعلية في العنصر
  // الإصدار 89: الإيموجي المعروف في أول الأزرار والعناوين بيتحوّل لأيقونة SVG موحّدة (الباقي بيتشال زي الأول)
  const EMOJI_IC = {
    '🗑':'trash', '⬇':'download', '📥':'download', '🖨':'printer', '🛡':'admin', '💾':'save', '📈':'trend', '⚙':'settings', '🗄':'archive',
    '↩':'undo', '🔙':'undo', '📤':'share', '🔄':'refresh', '✅':'check', '✓':'check', '✏':'edit', '✎':'edit', '🏷':'tag', '👁':'eye', '🙈':'eyeoff',
    '📄':'file', '📋':'file', '🔍':'search', '📊':'report', '➕':'plus', '📞':'phone', '💳':'card', '📨':'mail', '📧':'mail', '📎':'clip',
    '❌':'x', '✕':'x', '🔔':'bell', '🔐':'lock', '🔑':'key', '🖼':'image', '📢':'megaphone', '⚡':'bolt', '🎯':'target', '🎁':'gift',
    '📅':'calendar', '🗓':'calendar', '👥':'users', '⬆':'upload', '💬':'chat', '🔒':'lock', '💡':'bulb', '⭐':'star', '👤':'user'
  };
  function stripLeadingEmoji(el){
    const tn = Array.from(el.childNodes).find(n => n.nodeType === 3 && n.nodeValue.trim());
    if (!tn) return;
    const v = tn.nodeValue, nv = v.replace(EMOJI_LEAD, '');
    if (nv === v || !nv.trim()) return;
    tn.nodeValue = nv;
    const em = v.slice(0, v.length - nv.length).replace(/[\s\uFE0F\u200D]/g, '');
    const name = EMOJI_IC[em];
    if (name && P[name] && /^(BUTTON|H2|H3)$/.test(el.tagName) && !el.querySelector(':scope > .g-ic')) {
      const sp = document.createElement('span'); sp.className = 'g-ic'; sp.innerHTML = icon(name);
      el.insertBefore(sp, tn);
    }
  }

  // أيقونات بطاقات لوحة التحكم (كانت إيموجي)
  const ADMIN_IC = {
    goChatAdminBtn:'chat', goContentBtn:'star', goSuggestionsAdminBtn:'bulb', goPlansMgmtBtn:'card', goReportsBtn:'report',
    goRecommendationsBtn:'megaphone', goStaffBtn:'user', goSettingsBtn:'settings', goEmergencyBtn:'shield', goAdsBtn:'megaphone', goBlacklistBtn:'shield', goSiteDesignBtn:'grid',
    goSiteTextsBtn:'news', goArchiveBtn:'receipt', goSubscribersBtn:'user', goExportScreensBtn:'report', goExportExcelBtn:'download',
    goStudioBtn:'brush', goLandingBtn:'grid', goEmailCenterBtn:'mail', goAiBtn:'bulb', goTradesBtn:'trend', goHrBtn:'users', goJobTitlesBtn:'tag', goFaqBtn:'bulb'
  };

  let processing = false;
  function processScreen(){
    if (processing) return;
    processing = true;
    try {
      const app = document.getElementById('app');
      if (!app) return;

      // 1) شاشات الترحيب/الدخول بتملى الشاشة كلها - من غير هيكل
      const fullScreen = !!app.querySelector('.wl-screen, .gl-screen, .lp-screen');
      document.body.classList.toggle('gs-no-shell', fullScreen);
      document.body.classList.toggle('lp-on', !!app.querySelector('.lp-screen'));   // الإصدار 108: صفحة اللاندينج
      if (fullScreen) { applyStudio(); if (app.querySelector('.lp-screen') && window.gAdsAfterScreen) setTimeout(() => { try { window.gAdsAfterScreen(); } catch(e){} }, 0); return; }   // الإصدار 108: الدعاية كمان على اللاندينج   // الإصدار 108: تعديلات الاستوديو بتتطبق كمان على الشاشات اللي بتملى الشاشة (اللاندينج)

      // 2) عبارات الترحيب القديمة ("مرحبًا email") - الحساب ظاهر في الشريط
      app.querySelectorAll('.topbar').forEach(tb => {
        const first = tb.firstElementChild;
        if (first && /^\s*مرحب/.test(first.textContent)) first.classList.add('gs-hide');
        const visible = Array.from(tb.children).some(c => !c.classList.contains('gs-hide') && c.offsetParent !== null);
        if (!visible) tb.classList.add('gs-hide');
      });

      // 3) أزرار "الشاشة الرئيسية" داخل الصفحات - شريط التبويبات بيغني عنها
      app.querySelectorAll('button').forEach(b => {
        if (b.id === 'homeBtn' || /^\s*🏠/u.test(b.textContent) || /^\s*(🏠\s*)?الشاشة الرئيسية\s*$/.test(b.textContent)) b.classList.add('gs-hide');
      });

      // 4) إيموجي في أول الأزرار والعناوين → نص نظيف
      app.querySelectorAll('button, h2, h3, .topbar > div, .info, .lbl, label, [style*="var(--green-dark)"]').forEach(stripLeadingEmoji);

      // 5) أيقونات لوحة التحكم
      app.querySelectorAll('.admin-nav-card .nav-icon').forEach(el => {
        if (el.dataset.gs) return;
        const id = el.closest('.admin-nav-card').id;
        el.dataset.gs = '1'; el.innerHTML = icon(ADMIN_IC[id] || 'settings');
      });

      // 6) إيموجي داخل placeholder مربعات البحث
      app.querySelectorAll('input[placeholder]').forEach(i => {
        const v = i.getAttribute('placeholder'), nv = v.replace(EMOJI_LEAD, '');
        if (nv !== v && nv.trim()) i.setAttribute('placeholder', nv);
      });

      // 7) topbars بقت فاضية بعد إخفاء زرار الرئيسية
      app.querySelectorAll('.topbar').forEach(tb => {
        const any = Array.from(tb.querySelectorAll('*')).some(c => !c.closest('.gs-hide') && (c.tagName === 'BUTTON' || c.textContent.trim()));
        if (!any && !tb.textContent.trim()) tb.classList.add('gs-hide');
      });

      // 8) عنوان الشريط العلوي + عنوان التبويب في المتصفح
      const t = app.querySelector('.gs-page-title') || Array.from(app.querySelectorAll('.container > .topbar:not(.gs-hide) > div:first-child:not(.gs-hide), .container > h2, .container h2')).find(e => e.textContent.trim());
      const title = GS.titleHint || (t ? t.textContent.replace(EMOJI_LEAD, '').replace(/\s+/g, ' ').trim() : '');
      const tt = $('#gsTitle'); if (tt) tt.textContent = GS.currentScreen === 'renderHome' ? '' : title.slice(0, 60);
      document.title = title && GS.currentScreen !== 'renderHome' ? `${title} — GRIFFINE` : 'GRIFFINE';

      // 9) الشاشات الداخلية: العنوان ظاهر في الشريط العلوي ← نخفي نسخته اللي في أول الصفحة + أزرار "رجوع" القديمة جوه الصفحة
      markTopDuplicates(app, t);

      // 9ب) زرار الرجوع وشكل المستوى
      GS.applyNavMode();

      // 10) الجداول: كل جدول جوه غلاف بيتحرك يمين وشمال، والبيانات في سطر واحد (shell.css)
      wrapTables(app);
      enhanceTables(app);   // الإصدار 96: ترتيب + فلتر لكل عمود + بحث في كل الجداول
      lockMarkets(app);     // الإصدار 96: قوائم السوق والعملة ← سوق الحساب بس (الأدمن: الأسواق المفعّلة)
      // 10أ) الإصدار 90: شاشة المحفظة والتقارير ← كل جدول بيعرض 10 صفوف والباقي بالتمرير لفوق وتحت
      if (ROWS10_SCREENS[GS.currentScreen]) { limitTableRows(app, ROWS10_SCREENS[GS.currentScreen]); setTimeout(relimit, 400); }
      // 10ب) الإصدار 97: زرار إخفاء فوق كل عمود + "إظهار الأعمدة المخفية" ، وأي جدول عليه data-g-rows="7" ← 7 صفوف والباقي تمرير
      colHide(app);
      if (app.querySelector('table[data-g-rows]')) { limitMarkedRows(app); setTimeout(() => { const a = document.getElementById('app'); if (a) limitMarkedRows(a); }, 400); }
    } finally {
      // 11) الثيم وتعديلات استوديو التصميم (حتى لشاشات الترحيب والدخول)
      applyStudio();
      // 12) الإصدار 100: الدعاية والعروض (promo.js) حسب الجمهور
      if (window.gAdsAfterScreen) setTimeout(() => { try { window.gAdsAfterScreen(); } catch(e){} }, 0);
      // نسيب المراقب يتجاهل التعديلات اللي عملناها إحنا
      setTimeout(() => { processing = false; }, 0);
    }
  }

  /* عنوان الصفحة لو هو أول حاجة في الشاشة ← class gs-dup-title (بيختفي في الشاشات الداخلية بس من shell.css)
     + أزرار "رجوع ..." القديمة في أول الصفحة ← gs-dup-back (زرار الرجوع في الشريط العلوي بيغني عنها) */
  function markTopDuplicates(app, t){
    const c = app.querySelector(':scope > .container'); if (!c) return;
    const skip = (el) => el.classList.contains('gs-hide') || el.matches('.logo-header, .screen-bg-layer, .gs-install, .gs-seg, script, style') || getComputedStyle(el).display === 'none';
    const first = Array.from(c.children).find(el => !skip(el));
    if (!first) return;
    c.querySelectorAll(':scope > .topbar button').forEach(b => { if (/^\s*رجوع/.test(b.textContent)) b.classList.add('gs-dup-back'); });
    if (!t) return;
    if (t === first) { t.classList.add('gs-dup-title'); return; }
    if (first.classList.contains('topbar') && t.parentElement === first) {
      t.classList.add('gs-dup-title');
      // التوب بار ملوش لازمة لو مفيهوش غير العنوان وأزرار الرجوع
      const rest = Array.from(first.children).filter(el => el !== t && !el.classList.contains('gs-hide') && !el.classList.contains('gs-dup-back') && getComputedStyle(el).display !== 'none');
      if (!rest.length) first.classList.add('gs-dup-title');
    }
  }

  // الإصدار 90: أقصى 10 صفوف ظاهرة في جداول شاشة المحفظة والتقارير (الباقي تمرير رأسي + رأس الجدول ثابت)
  const ROWS10_SCREENS = { renderPortfolio:7, renderDiversificationReport:10, renderTradesReportPage:10 };   // الإصدار 110: المحفظة 7 صفوف (زي DCA وGrid)
  // إعادة الحساب بعد تحميل الخطوط وتغيير حجم الشاشة (ارتفاع الصفوف بيتغير)
  const relimit = () => { const a = document.getElementById('app'); if (a && ROWS10_SCREENS[GS.currentScreen]) limitTableRows(a, ROWS10_SCREENS[GS.currentScreen]); if (a && a.querySelector('table[data-g-rows]')) limitMarkedRows(a); };
  window.addEventListener('resize', () => { clearTimeout(relimit.t); relimit.t = setTimeout(relimit, 150); });
  try { document.fonts && document.fonts.ready.then(relimit); } catch(e){}
  function limitMarkedRows(root){
    root.querySelectorAll('table[data-g-rows]').forEach(t => { const w = t.closest('.gs-tscroll'); if (w) limitWrapRows(w, t, parseInt(t.dataset.gRows, 10) || 7); });
  }
  function limitTableRows(root, n){
    root.querySelectorAll('.gs-tscroll').forEach(w => { const t = w.querySelector('table'); if (t) limitWrapRows(w, t, n); });
  }
  const rows_moreThan = (k, n) => k > n;
  function limitWrapRows(w, t, n){
    {
      // الإصدار 110: صف «الإجمالي» مبيتحسبش من الصفوف ، وبيفضل ثابت تحت ظاهر وقت التمرير
      const all = t.tBodies[0] ? Array.from(t.tBodies[0].rows) : [];
      all.forEach(r => { const c = r.cells[0]; if (c && /^\s*(الإجمالي|الاجمالي|الإجماليات)\s*$/.test(c.textContent)) r.classList.add('gs-total-row'); });
      // صف الإجمالي بيتنقل لذيل الجدول (tfoot) ويتثبت تحت - والفلتر والترتيب مبيحركوهوش
      const tots = all.filter(r => r.classList.contains('gs-total-row'));
      if (tots.length && rows_moreThan(all.length - tots.length, n)) { const tf = t.tFoot || t.createTFoot(); tots.forEach(r => tf.appendChild(r)); }
      const rows = all.filter(r => !r.classList.contains('gs-total-row') && !r.classList.contains('g-subrow'));   // الإصدار 112: سطور عمليات البيع مبتتحسبش
      const want = rows.length > n;
      let h = 0;
      if (want) {
        // من أول الجدول لحد آخر الصف العاشر (بالمكان الفعلي - بيشمل الرأس والحدود)
        const wb = w.getBoundingClientRect(), r = rows[n - 1].getBoundingClientRect();
        h = Math.ceil(r.bottom - wb.top - w.clientTop + w.scrollTop);   // من أول الغلاف (فيه مسافة قبل الجدول) لحد آخر الصف العاشر
      }
      if (want && h > 0 && t.tFoot) h += Math.ceil(t.tFoot.getBoundingClientRect().height);
      if (want && h > 0) {
        const extra = Math.max(0, w.offsetHeight - w.clientHeight - w.clientTop);   // شريط التمرير الأفقي + الحد السفلي
        const v = (h + extra + 1) + 'px';
        if (w.style.maxHeight !== v) w.style.maxHeight = v;
        w.classList.add('gs-rows-limit');
      } else if (w.classList.contains('gs-rows-limit')) { w.classList.remove('gs-rows-limit'); w.style.maxHeight = ''; }
    }
  }

  // غلاف تمرير أفقي لكل جدول (لو الأب نفسه مش بيتحرك لوحده)
  /* الإصدار 96: كل جدول فيه عناوين أعمدة (th) وأكتر من صف ← خانة بحث فوقه + سطر فلتر تحت العناوين + ترتيب بالضغط على العنوان
     - أرقام بتترتب كأرقام (حتى لو فيها فواصل أو % أو عملة) ، تواريخ بالتاريخ ، نص أبجدي عربي
     - عمود قيمه قليلة (الحالة / النوع) ← قائمة منسدلة ، غير كده ← خانة كتابة
     - سطر "الإجمالي" بيفضل في الآخر ومبيدخلش في الترتيب ولا الفلتر
     - جدول عليه class="g-no-enh" ← مبيتلمسش */
  const T_NORM = (t) => String(t || '').replace(/[⁦-⁩‎‏]/g, '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\s+/g, ' ').trim();
  const T_NUM = (t) => { const x = T_NORM(t).replace(/[−–]/g, '-').replace(/[,\s%+]|EGP|SAR|AED|QAR|KWD|USD|جنيه|ريال|درهم|دينار|ج\.م/g, ''); return /^-?\d+(\.\d+)?$/.test(x) ? parseFloat(x) : null; };
  const T_DATE = (t) => { const m = T_NORM(t).match(/^(\d{4}-\d{2}-\d{2})/); return m ? m[1] : null; };
  function tableParts(t){
    let head = t.tHead ? t.tHead.rows[0] : null;
    let body = t.tBodies[0] ? Array.from(t.tBodies[0].rows) : [];
    if (!head && body.length && body[0].cells.length && Array.from(body[0].cells).every(c => c.tagName === 'TH')) { head = body[0]; body = body.slice(1); }
    return { head, body };
  }
  const isTotalRow = (r) => /^(الإجمالي|الاجمالي|المجموع|الإجمالى)/.test(T_NORM(r.cells[0] && r.cells[0].textContent)) || r.classList.contains('g-total');
  function enhanceTables(root){
    root.querySelectorAll('table').forEach(t => {
      if (window.gShortHeads && !t.closest('.chat-msg')) window.gShortHeads(t);   // الإصدار 125: عناوين مختصرة + (!) للتفاصيل
      if (t.dataset.gEnh || t.classList.contains('g-no-enh') || t.closest('.g-no-enh, .gs-alert-list, .chat-msg')) return;
      const { head, body } = tableParts(t);
      if (!head || head.cells.length < 2) return;
      const dataRows = body.filter(r => !isTotalRow(r) && !r.classList.contains('g-subrow') && r.cells.length >= head.cells.length - 1);
      if (dataRows.length < 2) return;
      t.dataset.gEnh = '1'; t.classList.add('g-enh');
      const rowsNow = () => tableParts(t).body.filter(r => !r.classList.contains('g-filter-row') && !r.classList.contains('g-subrow') && !isTotalRow(r));
      // الإصدار 112: سطور عمليات البيع (tr.g-subrow[data-sub-of]) بتفضل تحت مستواها (tr[data-lv]) في الترتيب والفلتر
      const subsOf = (r) => r.dataset.lv == null ? [] : Array.from(t.querySelectorAll(`tr.g-subrow[data-sub-of="${r.dataset.lv}"]`));
      const cols = head.cells.length;
      // ---- أنواع الأعمدة
      const kinds = [];
      for (let c = 0; c < cols; c++) {
        const vals = dataRows.map(r => r.cells[c] ? T_NORM(r.cells[c].textContent) : '').filter(v => v && v !== '-' && v !== '—');
        const nums = vals.filter(v => T_NUM(v) !== null).length, dates = vals.filter(v => T_DATE(v)).length;
        const hasCtl = dataRows.some(r => r.cells[c] && r.cells[c].querySelector('button, input, select'));
        const distinct = [...new Set(vals)];
        kinds.push({ type: hasCtl ? 'ctl' : (dates && dates >= vals.length * 0.7 ? 'date' : (nums && nums >= vals.length * 0.7 ? 'num' : 'text')), distinct });
      }
      // ---- الترتيب بالضغط على العنوان
      let sortCol = -1, sortDir = 1;
      Array.from(head.cells).forEach((th, c) => {
        if (kinds[c].type === 'ctl' || !T_NORM(th.textContent)) return;
        th.classList.add('g-sortable'); th.title = 'اضغط للترتيب';
        th.addEventListener('click', () => {
          sortDir = sortCol === c ? -sortDir : (kinds[c].type === 'text' ? 1 : -1); sortCol = c;
          head.querySelectorAll('.g-sortable').forEach(x => x.removeAttribute('data-sort')); th.dataset.sort = sortDir > 0 ? 'asc' : 'desc';
          const rows = rowsNow(); if (!rows.length) return;
          const k = kinds[c].type, tb = rows[0].parentNode, totals = Array.from(tb.rows).filter(isTotalRow);
          const key = (r) => { const tx = r.cells[c] ? r.cells[c].textContent : ''; return k === 'num' ? T_NUM(tx) : k === 'date' ? T_DATE(tx) : T_NORM(tx); };
          rows.sort((a, b) => { const x = key(a), y = key(b);
            if (x === null || x === '' ) return 1; if (y === null || y === '') return -1;
            return (k === 'num' ? x - y : String(x).localeCompare(String(y), 'ar')) * sortDir; });
          rows.forEach(r => { const sb = subsOf(r); tb.appendChild(r); sb.forEach(x => tb.appendChild(x)); }); totals.forEach(r => tb.appendChild(r));
        });
      });
      // ---- سطر الفلتر + خانة البحث
      const fr = document.createElement('tr'); fr.className = 'g-filter-row'; fr.setAttribute('data-html2canvas-ignore', '');
      const filters = [];
      for (let c = 0; c < cols; c++) {
        const td = document.createElement('th'); const k = kinds[c];
        if (head.cells[c].classList.contains('date-col')) td.className = 'date-col';   // أعمدة بتستخبى بزرار (التواريخ)
        if (k.type === 'ctl') { fr.appendChild(td); filters.push(null); continue; }
        let el;
        if (k.distinct.length > 1 && k.distinct.length <= 8 && k.type !== 'num' && dataRows.length > 3) {
          el = document.createElement('select'); el.innerHTML = '<option value="">الكل</option>' + k.distinct.sort((a, b) => a.localeCompare(b, 'ar')).map(v => `<option>${esc(v)}</option>`).join('');
        } else { el = document.createElement('input'); el.type = 'search'; el.placeholder = 'فلتر'; }
        el.className = 'g-filter'; el.setAttribute('aria-label', 'فلتر ' + T_NORM(head.cells[c].textContent));
        td.appendChild(el); fr.appendChild(td); filters.push(el);
      }
      head.parentNode.insertBefore(fr, head.nextSibling);
      const bar = document.createElement('div'); bar.className = 'g-tbar'; bar.setAttribute('data-html2canvas-ignore', '');
      bar.innerHTML = `<input type="search" class="g-tsearch" placeholder="بحث في الجدول..." aria-label="بحث في الجدول"><span class="g-tcount"></span>`;
      const wrap = t.closest('.gs-tscroll') || t;
      const old = wrap.previousElementSibling;
      if (old && old.classList.contains('g-tbar')) { const hc = old.querySelector('.g-hcbox'); if (hc) bar.insertBefore(hc, bar.firstChild); old.remove(); }   // شريط جدول قديم اتبدّل — الإصدار 128: زرار «إظهار الأعمدة المخفية» بيتنقل للشريط الجديد بدل ما يضيع
      wrap.parentNode.insertBefore(bar, wrap);
      const q = bar.querySelector('.g-tsearch'), cnt = bar.querySelector('.g-tcount');
      const apply = () => {
        const qs = T_NORM(q.value).toLowerCase(); let shown = 0; const rows = rowsNow();
        rows.forEach(r => {
          let ok = !qs || T_NORM(r.textContent).toLowerCase().includes(qs);
          for (let c = 0; ok && c < cols; c++) {
            const f = filters[c]; if (!f || !f.value) continue;
            const v = r.cells[c] ? T_NORM(r.cells[c].textContent) : '';
            ok = f.tagName === 'SELECT' ? v === f.value : v.toLowerCase().includes(T_NORM(f.value).toLowerCase());
          }
          r.style.display = ok ? '' : 'none'; if (ok) shown++; subsOf(r).forEach(x => { x.style.display = ok ? '' : 'none'; });
        });
        cnt.textContent = (qs || filters.some(f => f && f.value)) ? `${shown} من ${rows.length}` : `${rows.length} صف`;
      };
      q.addEventListener('input', apply); filters.forEach(f => f && f.addEventListener(f.tagName === 'SELECT' ? 'change' : 'input', apply));
      apply();
    });
  }

  /* الإصدار 97: إخفاء الأعمدة في كل الجداول
     - زرار ✕ صغير في أعلى كل عمود بيخفيه ، وزرار عام "إظهار الأعمدة المخفية (عددها)" فوق الجدول بيرجّعها (واحد واحد أو الكل)
     - الاختيار بيتحفظ على الجهاز لكل جدول (الشاشة + عناوين الأعمدة) - وبيفضل حتى لو صفوف الجدول اترسمت تاني
     - الإخفاء بـ CSS (table.g-hc-N) فبيشمل الصفوف الجديدة وصف الفلتر والطباعة */
  const HC_KEY = 'gs_hidecols_v1';
  const hcLoad = () => { try { return JSON.parse(localStorage.getItem(HC_KEY) || '{}') || {}; } catch(e){ return {}; } };
  const hcSave = (m) => { try { localStorage.setItem(HC_KEY, JSON.stringify(m)); } catch(e){} };
  (function hcCss(){
    if (document.getElementById('gsHideColsCss')) return;
    let css = ''; for (let i = 1; i <= 40; i++) css += `table.g-hc-${i} tr > :nth-child(${i}){display:none !important;}`;
    const st = document.createElement('style'); st.id = 'gsHideColsCss'; st.textContent = css; document.head.appendChild(st);
  })();
  function colHide(root){
    root.querySelectorAll('table').forEach(t => {
      if (t.dataset.gHc || t.classList.contains('g-no-enh') || t.closest('.g-no-enh, .gs-alert-list, .chat-msg')) return;
      const head = t.tHead && t.tHead.rows[0]; if (!head || head.cells.length < 3) return;
      if (Array.from(head.cells).some(c => c.colSpan > 1)) return;
      const names = Array.from(head.cells).map(c => T_NORM(c.textContent));
      const key = (document.body.getAttribute('data-gs-screen') || '') + '|' + (t.id || '') + '|' + names.join('¦').slice(0, 300);
      t.dataset.gHc = '1';
      const all = hcLoad(); let hidden = (all[key] || []).filter(i => i >= 1 && i <= head.cells.length);
      const wrap = t.closest('.gs-tscroll') || t;
      let bar = wrap.previousElementSibling && wrap.previousElementSibling.classList.contains('g-tbar') ? wrap.previousElementSibling : null;
      if (!bar) { bar = document.createElement('div'); bar.className = 'g-tbar g-tbar-mini'; bar.setAttribute('data-html2canvas-ignore', ''); wrap.parentNode.insertBefore(bar, wrap); }
      const box = document.createElement('span'); box.className = 'g-hcbox';
      box.innerHTML = `<button type="button" class="g-hcshow small secondary" aria-haspopup="true"></button><div class="g-hcmenu" hidden></div>`;
      bar.insertBefore(box, bar.firstChild);
      const btn = box.querySelector('.g-hcshow'), menu = box.querySelector('.g-hcmenu');
      const paint = () => {
        for (let i = 1; i <= 40; i++) t.classList.toggle('g-hc-' + i, hidden.includes(i));
        btn.textContent = `👁 إظهار الأعمدة المخفية (${hidden.length})`; btn.hidden = !hidden.length;
        menu.innerHTML = hidden.length ? hidden.slice().sort((a, b) => a - b).map(i => `<button type="button" data-hc="${i}">↩ ${esc(names[i - 1] || ('عمود ' + i))}</button>`).join('') + `<button type="button" data-hc="all"><b>إظهار الكل</b></button>` : '';
        if (!hidden.length) menu.hidden = true;
        const m = hcLoad(); if (hidden.length) m[key] = hidden; else delete m[key]; hcSave(m);
      };
      btn.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
      menu.addEventListener('click', (e) => { const b = e.target.closest('[data-hc]'); if (!b) return; e.stopPropagation();
        hidden = b.dataset.hc === 'all' ? [] : hidden.filter(i => i !== +b.dataset.hc); paint(); });
      document.addEventListener('click', (e) => { if (!box.contains(e.target)) menu.hidden = true; });
      Array.from(head.cells).forEach((th, i) => {
        if (!names[i]) return;
        const x = document.createElement('button'); x.type = 'button'; x.className = 'g-colx'; x.textContent = '✕';
        x.title = 'إخفاء العمود'; x.setAttribute('aria-label', 'إخفاء عمود ' + names[i]); x.setAttribute('data-html2canvas-ignore', '');
        x.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault();
          if (hidden.length >= head.cells.length - 1) return;   // عمود واحد على الأقل يفضل ظاهر
          hidden = [...new Set([...hidden, i + 1])]; paint(); });
        th.appendChild(x);
      });
      paint();
    });
  }

  /* الإصدار 96: أي قائمة اختيار سوق (مصر/السعودية/...) أو عملة (جنيه مصري/ريال سعودي أو EGP/SAR) في أي شاشة
     ← بتتقصر على الأسواق المسموحة: العميل سوق حسابه بس ، الأدمن الأسواق المفعّلة
     - قوائم تعديل خطة قديمة (e_ / ge_) بتحتفظ بقيمتها الحالية حتى لو سوق تاني (عشان متتبوظش)
     - القائمة اللي عليها data-g-mkt="skip" (فلتر السوق في لوحة الإدارة) مبتتلمسش */
  function lockMarkets(root){
    const allowed = window.gAllowedMarkets && window.gAllowedMarkets(); if (!allowed || !allowed.length) return;
    const a = window.__acct, ccyAr = allowed.map(m => a.markets[m].ccyAr), ccyCode = allowed.map(m => a.markets[m].ccy);
    root.querySelectorAll('select:not([data-g-mkt])').forEach(sel => {
      const val = (o) => o.value || o.textContent.trim();
      const vals = Array.from(sel.options).map(val);
      const isMkt = vals.includes('مصر') && vals.includes('السعودية');
      const isAr = vals.includes('جنيه مصري') && vals.includes('ريال سعودي');
      const isCode = vals.includes('EGP') && vals.includes('SAR');
      if (!isMkt && !isAr && !isCode) return;
      sel.dataset.gMkt = '1';
      const keep = /^(e_|ge_|edit)/i.test(sel.id) ? sel.value : null;
      const list = isMkt ? allowed : isAr ? ccyAr : ccyCode;
      Array.from(sel.options).forEach(o => { const v = val(o); if (!list.includes(v) && v !== keep) o.remove(); });
      if (!Array.from(sel.options).some(o => val(o) === sel.value) || !sel.value) { if (sel.options[0]) { sel.value = val(sel.options[0]); sel.dispatchEvent(new Event('change', { bubbles: true })); } }
      if (sel.options.length <= 1) { sel.classList.add('g-locked'); sel.title = 'حسب بورصة حسابك'; }
    });
  }

  function wrapTables(root){
    root.querySelectorAll('table').forEach(t => {
      if (t.closest('.gs-tscroll')) return;
      const p = t.parentElement; if (!p) return;
      const ox = getComputedStyle(p).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && p.children.length === 1) { p.classList.add('gs-tscroll'); return; }
      const w = document.createElement('div');
      w.className = 'gs-tscroll';
      p.insertBefore(w, t); w.appendChild(t);
    });
  }

  let raf = 0;
  function scheduleProcess(){ if (processing) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(processScreen); }

  // تسطير الشريط العلوي بعد السكرول
  function onScroll(){
    const bar = $('.gs-appbar'); if (!bar) return;
    bar.classList.toggle('scrolled', window.scrollY > 40);
  }


  /* =====================================================================
     12. مفتاح DCA / Grid فوق قوائم الخطط
     ===================================================================== */
  GS.injectPlanSwitch = function(active){
    const c = document.querySelector('#app > .container'); if (!c || c.querySelector('.gs-seg')) return;
    if (hidden('hide_dac_screen') || hidden('hide_grid_screen')) return;
    const seg = document.createElement('div');
    seg.className = 'gs-seg'; seg.setAttribute('role','tablist');
    seg.innerHTML = `<button type="button" role="tab" class="${active === 'dca' ? 'on' : ''}" data-k="dca">تعزيز المتوسط DCA</button><button type="button" role="tab" class="${active === 'grid' ? 'on' : ''}" data-k="grid">الشبكة Grid</button>`;
    seg.querySelectorAll('button').forEach(b => b.onclick = () => { if (b.dataset.k !== active) (b.dataset.k === 'dca' ? renderPlansList : renderGridPlansList)(); });
    c.insertBefore(seg, c.firstChild);
    GS.isRoot = true; GS.applyNavMode();
  };


  /* =====================================================================
     13. الشاشة الرئيسية
     ---------------------------------------------------------------------
     الترتيب: هيكل تحميل (skeleton) ← جلب البيانات ← رسم الشاشة ← رسم الأجزاء:
       drawHero()      بطاقة قيمة المحفظة (لكل عملة لوحدها)
       drawHoldings()  قائمة استثماراتي
       آخر التوصيات   (بتتحمّل في الخلفية)
     ===================================================================== */
  GS.renderHome = async function(){
    pushNav(() => renderHome());
    const my = GS.seq;
    const email = await getSession();
    if (!email) return renderLogin();
    setBackButtonVisible(false);
    // الإصدار 85: الرئيسية متاحة لأي حساب مفعّل - اللي ماشتركش بيشوف كارت "اختار باقتك" فوق
    if (window.gPerksLoad && !window.__isAdmin) { try { await window.gPerksLoad(); } catch(e){} }   // الإصدار 135: المميزات لحظة بلحظة
    const acc = await ensureAccess({ soft: true });
    if (!acc) return;
    if (GS.seq !== my) return;

    // ---- 1) هيكل التحميل ----
    app.innerHTML = `<div class="container gs-home">
      <div class="gs-greet"><div><div class="hello">${greeting()}</div><div class="gs-skel" style="width:160px;height:26px;margin-top:6px"></div></div><span class="gs-avatar"></span></div>
      <div class="gs-skel" style="height:220px;border-radius:24px"></div>
      <div class="gs-skel" style="height:70px;margin-top:18px"></div>
      <div class="gs-skel" style="height:220px;margin-top:24px"></div></div>`;

    // ---- 2) البيانات ----
    const [settings, plans, grids, subRes, avatar] = await Promise.all([
      getAdminSettings().catch(() => ({})), getPlans(email).catch(() => ({})), getGridPlans(email).catch(() => ({})),
      getMySubscription().catch(() => null), GS.loadAvatar()
    ]);
    if (GS.seq !== my) return;
    // الإصدار 91: أسعار السوق الحالية لأسهم الخطط (قيمة المحفظة بسعر السوق - نفس المنحنى)
    // الإصدار 96: الأسعار المحفوظة على الجهاز بتترسم فورًا - والتحديث في الخلفية بيحدّث الأرقام بس (مش الشاشة كلها)
    if (typeof mkEnsureLivePrices === 'function') { try { await mkEnsureLivePrices(plans, grids); } catch(e){} if (GS.seq !== my) return; }
    const pxPending = window.__mkLivePxPending, pxReady = window.__mkLivePxReady !== false;
    GS.settings = window.__isAdmin ? {} : (settings || {});
    const sub = subRes && subRes.success ? subRes.subscription : null;
    const displayName = (sub && sub.name) ? String(sub.name).split(/\s+/)[0] : email.split('@')[0];

    // كل الخطط (DCA + Grid) في قائمة واحدة
    const entries = [
      ...Object.keys(plans || {}).map(s => ({ key:`${s}::DCA`, sym:s, type:'DCA' })),
      ...Object.keys(grids || {}).map(s => ({ key:`${s}::Grid`, sym:s, type:'Grid' }))
    ];
    const ccyOf = (e) => e.type === 'DCA'
      ? (plans[e.sym].currency || MARKET_TO_CURRENCY_MAP[plans[e.sym].market] || '')
      : (MARKET_TO_CURRENCY_MAP[grids[e.sym].market] || '');

    const rowCcy = {}; entries.forEach(e => { rowCcy[`${e.sym}::${e.type}`] = ccyOf(e); });
    // المحفظة مقسّمة حسب العملة (غير ممكن نجمع جنيه على ريال)
    const byCcy = {};
    entries.forEach(e => { const c = ccyOf(e) || '—'; (byCcy[c] = byCcy[c] || []).push(e.key); });
    // الإصدار 96: الحسابات في دالة واحدة بتتنادى تاني لما أسعار أحدث توصل (من غير إعادة رسم الشاشة)
    let all = { stockRows: [] }, ccys = [], rows = [];
    const computeHome = () => {
      try { all = computeAggregates(plans, grids, entries, null, null); } catch(e){ console.error(e); all = { stockRows: [] }; }
      ccys = Object.keys(byCcy).map(c => {
        let a; try { a = computeAggregates(plans, grids, entries, null, null, byCcy[c]); } catch(err){ a = null; }
        return { c, a };
      }).filter(x => x.a).sort((x, y) => (y.a.totalCurrentValue + y.a.totalInvested) - (x.a.totalCurrentValue + x.a.totalInvested));
      // ترتيب الاستثمارات: المفتوحة ← الجديدة ← المغلقة، وبعدين الأكبر قيمة
      rows = (all.stockRows || []).slice().sort((a, b) => {
        const o = (r) => r.status === 'مفتوحة' ? 0 : r.status === 'جديدة' ? 1 : 2;
        return o(a) - o(b) || (b.currentValue - a.currentValue);
      });
    };
    computeHome();
    let sel = store.get('gs_ccy', '');
    if (!ccys.find(x => x.c === sel)) sel = ccys.length ? ccys[0].c : '';

    // الاختصارات السريعة
    const quick = [
      { k:'new', label:'خطة جديدة', ic:'plus', brand:true, go:() => renderPlanTypeChooser(), show: !(hidden('hide_dac_screen') && hidden('hide_grid_screen')) },
      { k:'dca', label:'خطط DCA', ic:'layers', go:() => renderPlansList(), show: !hidden('hide_dac_screen') },
      { k:'grid', label:'خطط Grid', ic:'grid', go:() => renderGridPlansList(), show: !hidden('hide_grid_screen') },
      { k:'scr', label:'الكشاف', ic:'radar', go:() => renderScreener(), show: !hidden('hide_screener_screen') },
      { k:'rep', label:'التقارير', ic:'report', go:() => renderPortfolio(), show: !hidden('hide_portfolio_screen') },
    ].filter(q => q.show);

    const installCard = GS.installCardHtml();

    // ---- 3) رسم الشاشة ----
    app.innerHTML = `<div class="container gs-home">
      <div class="gs-greet">
        <div><div class="hello">${greeting()}</div><div class="name">${esc(displayName)}</div></div>
        <button type="button" class="gs-avatar" id="gsHomeAvatar" aria-label="حسابي">${avatar ? `<img src="${esc(avatar)}" alt="">` : esc(displayName.charAt(0).toUpperCase())}</button>
      </div>
      ${accessGateCardHtml(acc)}
      ${installCard}
      <div class="gs-home-cols"><div class="c1">
      <div id="gsHero"></div>
      <div id="gsCurve"></div>
      <div id="gsAlertsCard"></div>
      ${quick.length ? `<div class="gs-quick" style="grid-template-columns:repeat(${quick.length},1fr)">${quick.map((q, i) => `<button type="button" data-i="${i}"><span class="ic ${q.brand ? 'brand' : ''}">${icon(q.ic)}</span>${q.label}</button>`).join('')}</div>` : ''}
      <div id="gsRecs"></div>
      </div><div class="c2">
      <div class="gs-sec-head gs-hold-head"><h2>استثماراتي</h2>
        ${rows.length ? `<span class="gs-hold-ctl"><select id="gsHoldFilter" aria-label="عرض الصفقات"><option value="open">المفتوحة</option><option value="closed">المغلقة</option><option value="all">الكل</option></select>
        <button type="button" class="gs-link" id="gsAllHold" hidden></button></span>` : ''}</div>
      <div id="gsHoldings"></div>
      <p class="disclaimer" style="margin-top:18px">الأرقام محسوبة من بيانات خططك وآخر سعر أدخلته، وليست توصية استثمارية.</p>
      </div></div>
    </div>`;

    $('#gsHomeAvatar').onclick = () => GS.renderAccount();
    wireAccessGateCard(acc);   // الإصدار 85
    if (typeof mkAfterHome === 'function') mkAfterHome(plans, grids, ccys, sel, email, { noCurve: hidden('hide_curve_home'), noAlerts: hidden('hide_alerts_screen') });   // منحنى الأداء + تنبيهات الأسعار (الإصدار 89: للأدمن والموظفين كمان)
    document.querySelectorAll('.gs-quick button').forEach(b => b.onclick = () => quick[+b.dataset.i].go());
    GS.wireInstallCard();

    // ---- 3أ) بطاقة قيمة المحفظة ----
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

      // توزيع المراكز المفتوحة: أكبر 5 + "أخرى"
      const openRows = a.stockRows.filter(r => r.status === 'مفتوحة' && r.currentValue > 0).sort((x, y) => y.currentValue - x.currentValue);
      const totalOpen = openRows.reduce((s, r) => s + r.currentValue, 0);
      const top = openRows.slice(0, 5), rest = openRows.slice(5).reduce((s, r) => s + r.currentValue, 0);
      const parts = top.map((r, i) => ({ label:r.symbol, v:r.currentValue, color:PALETTE[i] }));
      if (rest > 0) parts.push({ label:'أخرى', v:rest, color:'#64748B' });

      hero.innerHTML = `<div class="gs-hero">
        <div class="gs-hero-top">
          <span class="gs-hero-label">قيمة المحفظة الحالية${a.pricedLive ? ' <small class="gs-hero-src">بسعر السوق</small>' : ''}</span>
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
          <div>تكلفة المراكز المفتوحة<b>${mask(money(a.totalOpenCost || 0))}</b></div>
          <div>ربح غير محقق<b class="${(a.totalUnrealized || 0) >= 0 ? 'pos' : 'neg'}">${mask(((a.totalUnrealized || 0) >= 0 ? '+' : '') + money(a.totalUnrealized || 0))}</b></div>
          <div>الربح المحقق<b>${mask(money((a.totalRealized || 0) + (a.totalClosedProfit || 0)))}</b></div>
          <div>مراكز مفتوحة<b>${a.totalOpenPositionsCount || 0} / ${a.stockRows.length}</b></div>
        </div>
      </div>`;
      hero.querySelectorAll('.gs-ccy button').forEach(b => b.onclick = () => { sel = b.dataset.c; store.set('gs_ccy', sel); drawHero(); if (typeof mkPortfolioCurve === 'function' && !hidden('hide_curve_home')) mkPortfolioCurve(document.getElementById('gsCurve'), ccys, sel, plans, grids); });
      $('#gsEye').onclick = () => { store.set('gs_hide_values', valuesHidden() ? '0' : '1'); drawHero(); drawHoldings(holdAll); };
    }

    // ---- 3ب) صف واحد في قائمة استثماراتي ----
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

    // ---- 3ج) قائمة استثماراتي ----
    function drawHoldings(showAll){
      const el = $('#gsHoldings'); if (!el) return;
      if (!rows.length) {
        el.innerHTML = `<div class="gs-empty"><div class="ic">${icon('trend')}</div><b>لا توجد خطط بعد</b><p>أنشئ أول خطة لسهم (DCA أو Grid) وتابع متوسط التكلفة والأرباح من هنا.</p>
          ${quick.find(q => q.k === 'new') ? `<button type="button" id="gsEmptyNew">إنشاء خطة جديدة</button>` : ''}</div>`;
        const b = $('#gsEmptyNew'); if (b) b.onclick = () => renderPlanTypeChooser();
        return;
      }
      // الإصدار 91: فلتر (المفتوحة افتراضيًا / المغلقة / الكل) + 5 صفوف والباقي تمرير + زرار عرض الكل / إغلاق
      const f = holdFilter;
      const filtered = rows.filter(r => f === 'all' ? true : f === 'closed' ? r.status === 'مغلقة' : r.status === 'مفتوحة');
      const allBtn = $('#gsAllHold');
      // الإصدار 100: كل الأسهم في القائمة - 5 ظاهرين والباقي تمرير لفوق وتحت (من غير زرار عرض الكل)
      if (allBtn) { allBtn.hidden = true; }
      showAll = true;
      if (!filtered.length) { el.innerHTML = `<div class="gs-empty-mini u-muted">${f === 'closed' ? 'لا توجد صفقات مغلقة.' : f === 'open' ? 'لا توجد صفقات مفتوحة الآن.' : 'لا توجد خطط.'}</div>`; return; }
      const list = showAll ? filtered : filtered.slice(0, 5);
      el.innerHTML = `<div class="gs-list gs-hold-list">${list.map(holdingRow).join('')}</div>${list.length > 5 ? `<small class="gs-hold-more">↕ ${list.length} خطة — مرّر القائمة لفوق وتحت لعرض الباقي</small>` : ''}`;
      el.querySelectorAll('.gs-row').forEach(b => b.onclick = () => b.dataset.type === 'Grid' ? renderGridPlanDetail(b.dataset.sym) : renderPlanDetail(b.dataset.sym));
      const box = el.querySelector('.gs-hold-list');
      if (showAll && typeof mkLimitList === 'function') mkLimitList(box, 5); else if (box) box.style.maxHeight = '';
    }

    let holdFilter = store.get('gs_hold_filter', 'open'); if (!['open', 'closed', 'all'].includes(holdFilter)) holdFilter = 'open';
    let holdAll = false;
    // أول فتح خالص (مفيش أسعار محفوظة): تحميل مكان الأرقام بدل أرقام غلط
    // الإصدار 119: «متابعة خططك على آخر سعر» اتنقلت لشاشات الخطط (DCA / Grid)
    if (pxReady) { drawHero(); drawHoldings(false); }
    else { const h = $('#gsHero'); if (h) h.innerHTML = '<div class="gs-skel" style="height:220px;border-radius:24px"></div>'; const hd = $('#gsHoldings'); if (hd) hd.innerHTML = '<div class="gs-skel" style="height:220px"></div>'; }
    // أسعار أحدث وصلت ← الأرقام بس بتتحدّث (البطاقة + استثماراتي + المنحنى)
    if (pxPending) pxPending.then(changed => {
      if (GS.seq !== my || GS.currentScreen !== 'renderHome' || !document.getElementById('gsHero')) return;
      if (!changed && pxReady) return;
      computeHome(); drawHero(); drawHoldings(holdAll);
      if (typeof mkPortfolioCurve === 'function' && !hidden('hide_curve_home')) mkPortfolioCurve(document.getElementById('gsCurve'), ccys, sel, plans, grids);
    });
    const hf = $('#gsHoldFilter'); if (hf) { hf.value = holdFilter; hf.onchange = () => { holdFilter = hf.value; store.set('gs_hold_filter', holdFilter); holdAll = false; drawHoldings(false); }; }
    const allBtn = $('#gsAllHold'); if (allBtn) allBtn.onclick = () => { holdAll = !holdAll; drawHoldings(holdAll); };

    // ---- 3د) آخر التوصيات (في الخلفية) ----
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
     14. شاشة حسابي
     ===================================================================== */
  GS.renderAccount = async function(){
    pushNav(() => GS.renderAccount());
    try { window.scrollTo(0, 0); } catch(e){}
    GS.seq++; GS.setTab('account'); GS.isRoot = true; GS.screenArgs = []; GS.markScreen('renderAccount'); GS.applyNavMode();
    const my = GS.seq;
    const email = await getSession();
    if (!email) return renderLogin();
    setBackButtonVisible(false);

    const [subRes, avatar, settings] = await Promise.all([
      getMySubscription().catch(() => null), GS.loadAvatar(), window.__isAdmin ? {} : getAdminSettings().catch(() => ({})),
      window.gPerksLoad && !window.__isAdmin ? window.gPerksLoad().catch(() => null) : null   // الإصدار 135
    ]);
    if (GS.seq !== my) return;
    GS.settings = settings || {};
    const sub = subRes && subRes.success ? subRes.subscription : null;
    const name = sub && sub.name ? sub.name : email.split('@')[0];

    // شارة الاشتراك تحت الاسم
    let subChip = '';
    if (window.__isAdmin) subChip = `<span class="gs-sub-chip">${window.__isSuperAdmin ? 'مدير الموقع' : 'فريق العمل'}</span>`;
    else if (sub) {
      const end = sub.endDate ? new Date(sub.endDate) : null;
      const days = end ? Math.ceil((end - new Date()) / 86400000) : null;
      subChip = sub.active
        ? `<span class="gs-sub-chip ${days != null && days <= 5 ? 'warn' : ''}">${esc(sub.planName || 'مشترك')}${days != null ? ` · متبقي ${Math.max(days, 0)} يوم` : ''}</span>`
        : `<span class="gs-sub-chip warn">بانتظار التفعيل</span>`;
    }

    // صف في القائمة: R(id, أيقونة, النص, كلاس إضافي)
    const R = (id, ic, label, extra) => `<button type="button" class="gs-row ${extra || ''}" id="${id}"><span class="gs-row-ic">${icon(ic)}</span><span class="gs-row-main"><b>${label}</b></span><span class="gs-chev">${icon('chev')}</span></button>`;
    // عنوان الشاشة المخصص من لوحة التحكم (لو موجود)
    const pt = (k, f) => { try { return pageTitle(k, f); } catch(e){ return f; } };

    app.innerHTML = `<div class="container">
      <div class="gs-page-title">حسابي</div>
      <div class="gs-list"><div class="gs-profile">
        <span class="gs-avatar">${avatar ? `<img src="${esc(avatar)}" alt="">` : esc(name.charAt(0).toUpperCase())}</span>
        <span style="min-width:0"><b>${esc(name)}</b><small>${esc(email)}</small><br>${subChip}</span>
      </div>${R('gsAccProfile','user','الملف الشخصي والصورة')}</div>

      ${!window.__isAdmin ? `<button type="button" class="pk-cta pk-cta-wide" data-pk-plans>💎 الباقات والأسعار — اختار أو رقّي باقتك</button>` : ''}
      ${!window.__isAdmin && window.pkMineHtml ? window.pkMineHtml() : ''}
      <div class="gs-list-title">الاشتراك</div>
      <div class="gs-list">
        ${R('gsAccSub','card','الباقات وتجديد الاشتراك')}
        ${!hidden('hide_sub_history_screen') ? R('gsAccHist','receipt','سجل اشتراكي') : ''}
        ${!hidden('hide_referral_screen') ? R('gsAccRef','gift','ادعُ صديقك واكسب أيامًا مجانية') : ''}
        ${!hidden('hide_trash_screen') ? R('gsAccTrash','trash','سلة المحذوفات (استرجاع ما حذفته)') : ''}
        ${!window.__isAdmin && !hidden('hide_trades_screen') ? R('gsAccTrades','trend','تقرير صفقاتي') : ''}
      </div>

      <div class="gs-list-title">الأدوات</div>
      <div class="gs-list">
        ${!hidden('hide_recommendations_screen') ? R('gsAccRec','megaphone','التوصيات') : ''}
        ${!hidden('hide_grid_screen') ? R('gsAccGrid','grid','خطط الشبكة (Grid)') : ''}
        ${!hidden('hide_portfolio_screen') && (window.__isAdmin || !hidden('hide_mizan_screen')) ? R('gsAccDiv','target','ميزان محفظتك AI (توزيع التنوع)') : ''}
        ${!hidden('hide_screener_screen') ? R('gsAccScr','radar','كشاف الأسهم') : ''}
      </div>

      ${window.__isAdmin ? `<div class="gs-list-title">الإدارة</div><div class="gs-list">${R('gsAccAdmin','admin','لوحة التحكم')}</div>` : ''}

      <div id="gsNpMineHost"></div>
      <div class="gs-list-title">المظهر</div>
      <div class="gs-list"><label class="gs-row" style="cursor:pointer;margin:0">
        <span class="gs-row-ic">${icon('moon')}</span><span class="gs-row-main"><b>الوضع الليلي</b></span>
        <span class="gs-switch"><input type="checkbox" id="gsDarkSwitch" ${isDark() ? 'checked' : ''} aria-label="الوضع الليلي"><span></span></span>
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
      <div class="gs-version" id="gsVersion">GRIFFINE · الإصدار ${APP_VERSION}</div>
    </div>`;

    // ربط الأزرار (on = لو العنصر موجود)
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
    on('gsAccProfile', () => renderProfilePage());
    on('gsAccSub', () => renderSubscriptionPlans());
    on('gsAccHist', () => renderMySubscriptionHistory());
    on('gsAccRef', () => renderReferralPage());
    on('gsAccTrash', () => renderTrashPage());
    if (typeof gNpMineCard === 'function') gNpMineCard(document.getElementById('gsNpMineHost'));   // الإصدار 101: قنوات الإشعارات (لو الأدمن أظهرها)
    // الإصدار 96: رقم الإصدار اللي الأدمن كتبه (لو فاضي ← الرقم التلقائي) + رقم البناء الداخلي للتأكد إن الجهاز على آخر نسخة
    GS.versionLabel().then(v => { const el = $('#gsVersion'); if (el) el.innerHTML = `GRIFFINE · الإصدار <bdi>${esc(v || String(APP_VERSION))}</bdi>${v && v !== String(APP_VERSION) ? ` <small class="gs-build">(بناء ${APP_VERSION})</small>` : ''}`; });
    on('gsAccTrades', () => renderTradesReportPage());
    on('gsAccRec', () => { GS.markRecsSeen(); renderRecommendationsCustomerPage(); });
    on('gsAccGrid', () => renderGridPlansList());
    on('gsAccDiv', () => renderDiversificationReport());
    on('gsAccScr', () => renderScreener());
    on('gsAccAdmin', () => renderAdminHub());
    on('gsAccAbout', () => renderAboutPage());
    on('gsAccContact', () => renderContactInfo());
    on('gsAccArt', () => renderArticlesListPage());
    on('gsAccTesti', () => renderTestimonialsPage());
    on('gsAccSug', () => renderSuggestionsPage());
    on('gsAccRefund', () => renderRefundPolicyPage());
    on('gsAccDisc', () => renderDisclaimerPage({ backTo: () => GS.renderAccount() }));
    on('gsAccPriv', () => renderPrivacyPolicyPage());
    on('gsAccLogout', async () => { if (await gConfirm('تسجيل الخروج من GRIFFINE؟', { ok: 'تسجيل الخروج' })) GS.logout(); });
    on('gsAccDelete', () => GS.renderDeleteAccount());
    const sw = $('#gsDarkSwitch'); if (sw) sw.onchange = () => GS.toggleTheme();
  };


  /* =====================================================================
     15. حذف الحساب
     (متطلب Google Play: مسار داخل التطبيق + رابط ويب index.php?page=delete-account)
     ===================================================================== */
  GS.renderDeleteAccount = async function(){
    pushNav(() => GS.renderDeleteAccount());
    try { window.scrollTo(0, 0); } catch(e){}
    GS.seq++; GS.setTab('account'); GS.isRoot = false; GS.screenArgs = []; GS.markScreen('renderDeleteAccount'); GS.applyNavMode();
    const email = await getSession();
    if (!email) { window.__afterLoginTarget = 'deleteAccount'; return renderLogin(); }

    app.innerHTML = `<div class="container">
      <div class="gs-page-title">حذف الحساب</div>
      <div class="error" style="line-height:1.8">الحذف نهائي ولا يمكن التراجع عنه. سيُحذف حسابك <b dir="ltr">${esc(email)}</b> وكل خططك (DCA وGrid) وصفقاتك المغلقة وصورتك الشخصية ومقترحاتك ومحادثاتك.</div>
      <div class="section-card" style="font-size:14px;line-height:1.9">
        <b>ما يبقى محفوظًا (مطلوب قانونيًا ومحاسبيًا):</b><br>
        سجل الاشتراكات والمبالغ المدفوعة بدون اسمك أو رقمك، وسجل موافقتك على إخلاء المسؤولية.<br>
        إذا كان لديك اشتراك مدفوع ساري، فالحذف لا يعيد قيمته تلقائيًا — راجع سياسة الاسترداد قبل الحذف.
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

      // 1) التأكد من كلمة «حذف»
      const confirmWord = document.getElementById('gsDelConfirm').value.trim();
      if (confirmWord !== 'حذف') { msg.innerHTML = '<div class="error">اكتب كلمة «حذف» بالظبط للتأكيد.</div>'; return; }

      // 2) طلب الحذف من السيرفر
      btn.disabled = true; btn.textContent = 'جاري الحذف...';
      let r;
      try { r = await apiPost('/account_delete.php', { password: document.getElementById('gsDelPw').value, confirm: confirmWord }); }
      catch(err){ r = { success:false, message:'تعذّر الاتصال بالسيرفر.' }; }
      if (!r || !r.success) {
        msg.innerHTML = `<div class="error">${esc((r && r.message) || 'تعذّر الحذف.')}</div>`;
        btn.disabled = false; btn.textContent = 'حذف حسابي نهائيًا';
        return;
      }

      // 3) تنظيف بيانات الجهاز والرجوع لشاشة الترحيب
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
     15ب. مركز الإيميلات (الإصدار 72) - لوحة التحكم
     ---------------------------------------------------------------------
     - حالة الإرسال: SMTP (كلمة سر info@griffine.store متحطة في db.php) ولا mail() العادية
     - إرسال إيميل تجربة لأي عنوان
     - سجل آخر 150 إيميل (أُرسلت / فشل + السبب) - من email_center.php
     ===================================================================== */
  const MAIL_TYPES = {
    verification:'تفعيل الحساب', password_reset:'استرجاع كلمة المرور', reminder:'تذكير انتهاء الاشتراك', chat_transcript:'نسخة محادثة شات',
    chat_new:'محادثة شات جديدة', subscription_active:'تفعيل اشتراك', subscription_pending:'استلام طلب اشتراك', subscription_paused:'إيقاف اشتراك',
    subscription_extended:'تمديد اشتراك', subscription_gift:'باقة هدية', plan_change:'تغيير باقة', email_change:'تغيير الإيميل',
    admin_new_subscription:'تنبيه: اشتراك جديد', admin_plan_change:'تنبيه: تغيير باقة', test:'تجربة', general:'عام', notify:'تنبيه'
  };

  // أزرار كل إيميل حسب المكان اللي هو فيه
  function mailRowActions(view, id){
    const B = (act, label, cls) => `<button type="button" class="small ${cls || 'secondary'}" data-mact="${act}" data-mid="${id}" style="width:auto;margin:0 2px;padding:4px 8px !important;min-height:0 !important;font-size:11.5px !important;">${label}</button>`;
    if (view === 'trash') return B('restore', '↩️ استرجاع') + B('purge', '🗑️ نهائي', 'danger');
    if (view === 'archive') return B('unarchive', '↩️ للوارد') + B('trash', '🗑️');
    return B('archive', '🗄️ أرشفة') + B('trash', '🗑️');
  }
  function mailBulkButtons(view){
    const B = (act, label, cls) => `<button type="button" class="small ${cls || 'secondary'} u-wa u-m0" data-mact="${act}">${label}</button>`;
    if (view === 'trash') return B('restore', '↩️ استرجاع المحدد') + B('purge', '🗑️ حذف المحدد نهائيًا', 'danger') + B('empty_trash', 'تفريغ السلة', 'danger');
    if (view === 'archive') return B('unarchive', '↩️ رجوع المحدد للوارد') + B('trash', '🗑️ نقل المحدد للسلة');
    return B('archive', '🗄️ أرشفة المحدد') + B('trash', '🗑️ نقل المحدد للسلة');
  }

  GS.renderEmailCenter = async function(view){
    view = view || 'inbox';   // الإصدار 88: inbox | archive | trash
    pushNav(() => GS.renderEmailCenter(view));
    try { window.scrollTo(0, 0); } catch(e){}
    GS.seq++; GS.setTab('admin'); GS.isRoot = false; GS.screenArgs = []; GS.markScreen('renderEmailCenter'); GS.applyNavMode();
    const my = GS.seq;
    const email = await getSession();
    if (!email) return renderLogin();
    if (!window.__isAdmin) return renderHome();

    app.innerHTML = `<div class="container wide"><div class="gs-page-title">مركز الإيميلات</div><div class="gs-skel" style="height:260px"></div></div>`;
    let r; try { r = await apiGet('/email_center.php?view=' + view); } catch(e){ r = null; }
    if (GS.seq !== my) return;
    if (!r || !r.success) { app.innerHTML = `<div class="container"><div class="gs-page-title">مركز الإيميلات</div><div class="error">${esc((r && r.message) || 'تعذّر تحميل البيانات.')}</div></div>`; return; }

    const stats = r.stats7d || {};
    const rows = (r.log || []).map(x => `<tr data-id="${+x.id}">
        ${r.canOrganize ? `<td><input type="checkbox" class="gsMailChk" value="${+x.id}" aria-label="تحديد"></td>` : ''}
        <td>${esc(x.created_at)}</td>
        <td dir="ltr" style="text-align:right">${esc(x.to_email)}</td>
        <td>${esc(MAIL_TYPES[x.mail_type] || x.mail_type)}</td>
        <td>${esc(x.subject)}</td>
        <td>${x.status === 'sent' ? '<span class="tag" style="background:var(--gs-pos-tint);color:var(--gs-pos)">أُرسلت</span>' : '<span class="tag" style="background:var(--gs-neg-tint);color:var(--gs-neg)">فشل</span>'}</td>
        <td>${esc(x.transport || '')}</td>
        <td>${esc(x.error_text || '')}</td>
        ${r.canOrganize ? `<td style="white-space:nowrap">${mailRowActions(view, +x.id)}</td>` : ''}</tr>`).join('');
    const cnt = r.counts || {};

    app.innerHTML = `<div class="container wide">
      <div class="gs-page-title">مركز الإيميلات</div>
      <div class="summary-cards">
        <div class="summary-card"><div class="val" dir="ltr">${esc(r.from)}</div><div class="lbl">المرسل</div></div>
        <div class="summary-card"><div class="val ${r.smtp ? 'pos' : 'neg'}">${r.smtp ? 'SMTP هوستنجر' : 'mail() العادية'}</div><div class="lbl">طريقة الإرسال</div></div>
        <div class="summary-card"><div class="val pos">${stats.sent || 0}</div><div class="lbl">أُرسلت (آخر 7 أيام)</div></div>
        <div class="summary-card"><div class="val ${stats.failed ? 'neg' : ''}">${stats.failed || 0}</div><div class="lbl">فشل (آخر 7 أيام)</div></div>
      </div>
      ${r.smtp ? '' : `<div class="info" style="margin-top:12px;line-height:1.9">تُرسل الرسائل الآن بالطريقة العادية. ولضمان وصولها وعدم ذهابها إلى Spam:<br>
        افتح <b dir="ltr">griffine_config.php</b> واكتب كلمة سر صندوق <b dir="ltr">${esc(r.from)}</b> في السطر <b dir="ltr">define('MAIL_SMTP_PASS', '...')</b>.</div>`}
      ${r.hasLog ? '' : `<div class="error" style="margin-top:12px">سجل الرسائل لا يعمل بعد — شغّل ملف ALL_SCHEMA_UPDATES.sql (جدول email_log).</div>`}
      <h2>إرسال إيميل تجربة</h2>
      <div class="section-card">
        <label for="gsMailTestTo">ابعت لـ</label>
        <input type="email" id="gsMailTestTo" dir="ltr" value="${esc(r.adminTo || '')}">
        <button type="button" id="gsMailTestBtn" style="margin-top:12px">إرسال إيميل تجربة</button>
        <div id="gsMailTestMsg" style="margin-top:10px"></div>
      </div>
      <h2>سجل الإيميلات</h2>
      ${r.canOrganize ? `<div class="radio-row std-filter-tabs u-mb10">
        <button class="small secondary std-filter-tab ${view === 'inbox' ? 'btn-active' : ''}" data-mview="inbox">📥 الوارد (${cnt.inbox || 0})</button>
        <button class="small secondary std-filter-tab ${view === 'archive' ? 'btn-active' : ''}" data-mview="archive">🗄️ الأرشيف (${cnt.archive || 0})</button>
        <button class="small secondary std-filter-tab ${view === 'trash' ? 'btn-active' : ''}" data-mview="trash">🗑️ سلة المحذوفات (${cnt.trash || 0})</button>
      </div>
      <div class="gs-mail-bulk" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">
        <label style="display:flex;align-items:center;gap:6px;margin:0;font-size:13px;"><input type="checkbox" id="gsMailAll" class="u-wa u-m0"> تحديد الكل</label>
        ${mailBulkButtons(view)}
      </div>` : `<div class="info">شغّل ملف ALL_SCHEMA_UPDATES.sql (الإصدار 88) لتتمكن من أرشفة الرسائل وحذفها.</div>`}
      <div class="section-card gs-mail-scroll" style="padding:0">${rows ? `<table><thead><tr>${r.canOrganize ? '<th></th>' : ''}<th>الوقت</th><th>إلى</th><th>النوع</th><th>العنوان</th><th>الحالة</th><th>الطريقة</th><th>السبب لو فشل</th>${r.canOrganize ? '<th></th>' : ''}</tr></thead><tbody>${rows}</tbody></table>` : `<p class="disclaimer" style="padding:14px">${view === 'trash' ? 'سلة المحذوفات فارغة.' : view === 'archive' ? 'الأرشيف فارغ.' : 'لا توجد رسائل هنا.'}</p>`}</div>
    </div>`;

    // الإصدار 88: الأرشيف / سلة المحذوفات / الاسترجاع / الحذف النهائي (لإيميل واحد أو المحدد)
    const go = async (action, ids) => {
      if (!ids.length && action !== 'empty_trash') { alert('اختار إيميل واحد على الأقل.'); return; }
      if ((action === 'purge' || action === 'empty_trash') && !await gConfirm(action === 'empty_trash' ? 'تفريغ سلة المحذوفات نهائيًا؟ لا يمكن التراجع.' : `حذف ${ids.length} رسالة نهائيًا؟ لا يمكن التراجع.`, { ok: 'حذف نهائي', danger: true })) return;
      let x; try { x = await apiPost('/email_center.php', { action, ids: ids.join(',') }); } catch(e){ x = null; }
      if (!x || !x.success) { alert((x && x.message) || 'تعذّر التنفيذ'); return; }
      window.__navSilent = true; try { GS.renderEmailCenter(view); } finally { window.__navSilent = false; }
    };
    const selected = () => [...document.querySelectorAll('.gsMailChk:checked')].map(c => +c.value);
    document.querySelectorAll('[data-mview]').forEach(b => b.onclick = () => GS.renderEmailCenter(b.dataset.mview));
    document.querySelectorAll('[data-mact]').forEach(b => b.onclick = () => go(b.dataset.mact, b.dataset.mid ? [+b.dataset.mid] : selected()));
    const all = $('#gsMailAll'); if (all) all.onchange = () => document.querySelectorAll('.gsMailChk').forEach(c => { c.checked = all.checked; });

    $('#gsMailTestBtn').onclick = async () => {
      const b = $('#gsMailTestBtn'), m = $('#gsMailTestMsg');
      b.disabled = true; b.textContent = 'جاري الإرسال...';
      let t; try { t = await apiPost('/email_center.php', { to: $('#gsMailTestTo').value.trim() }); } catch(e){ t = { success:false, message:'تعذّر الاتصال بالسيرفر.' }; }
      m.innerHTML = `<div class="${t && t.success ? 'info' : 'error'}">${esc((t && t.message) || 'حصل خطأ')}</div>`;
      b.disabled = false; b.textContent = 'إرسال إيميل تجربة';
      if (t && t.success) setTimeout(() => { if (GS.currentScreen === 'renderEmailCenter') GS.renderEmailCenter(); }, 1500);
    };
  };


  /* =====================================================================
     16. طباعة صور كل الشاشات في ملف PDF واحد (من لوحة التحكم)
     ---------------------------------------------------------------------
     بيفتح كل شاشة بالترتيب، يصوّرها بالشكل الحالي (فاتح/ليلي، موبايل/كمبيوتر)،
     ويجمعهم في PDF: صفحة غلاف ← صفحة لكل شاشة ← صفحة ملخص في الآخر.

     إصلاح الإصدار 71 (الملف كان بيطلع 4 شاشات بس):
       السبب: أداة التصوير html2canvas 1.4.1 بتقف عند أي لون مكتوب بـ color-mix()
       (كان موجود في الشريط العلوي وشريط التبويبات) - فأول ما بنوصل لأول شاشة داخلية
       كل الشاشات اللي بعدها كانت بتفشل في صمت. الحل:
         1) shell.css بقى من غير color-mix خالص (ألوان rgba جاهزة)
         2) أي شاشة تفشل بتاخد صفحة فيها سبب الفشل بدل ما تختفي، وبتظهر في صفحة الملخص
         3) إضافة شاشات التفاصيل (أول خطة DCA / Grid وتعديلها، أول مقال...)

     إضافة شاشة جديدة للطباعة: سطر جديد في SCREENS_TO_PRINT بالشكل
         ['اسم الشاشة', 'اسم_الدالة']            ← دالة في ملفات app-*.js
         ['اسم الشاشة', 'GS:اسم_الدالة']         ← دالة في الملف ده
         ['اسم الشاشة', 'اسم_الدالة', 'dca']     ← بتاخد رمز أول خطة DCA (أو grid / article)
     ===================================================================== */

  // ---- 16أ) قائمة الشاشات بالترتيب (سطر من عنصر واحد = عنوان قسم) ----
  const SCREENS_TO_PRINT = [
    ['— الشاشات العامة —'],
    ['شاشة الترحيب', 'renderPublicHome'],
    ['صفحة اللاندينج (قبل الدخول)', 'renderLanding'],
    ['تسجيل الدخول', 'renderLogin'],
    ['إنشاء حساب', 'renderRegister'],
    ['نسيت كلمة المرور', 'renderForgotPassword'],
    ['خطط الاستثمار (للزوار)', 'renderPublicPlansInfo'],
    ['الباقات والأسعار (للزوار)', 'renderPublicPricing'],

    ['— شاشات العميل —'],
    ['الرئيسية', 'renderHome'],
    ['خطط DCA', 'renderPlansList'],
    ['تفاصيل خطة DCA', 'renderPlanDetail', 'dca'],
    ['إعدادات خطة DCA', 'renderEditPlanSettings', 'dca'],
    ['خطط Grid', 'renderGridPlansList'],
    ['تفاصيل خطة Grid', 'renderGridPlanDetail', 'grid'],
    ['إعدادات خطة Grid', 'renderGridEditPlanSettings', 'grid'],
    ['اختيار نوع الخطة', 'renderPlanTypeChooser'],
    ['خطة DCA جديدة', 'renderNewPlanForm'],
    ['خطة Grid جديدة', 'renderGridPlanForm'],
    ['ملخص المحفظة', 'renderPortfolio'],
    ['ميزان محفظتك AI (توزيع التنوع)', 'renderDiversificationReport'],
    ['ميزان GRIFFINE AI — توزيع الاستثمار', 'renderMizanAi'],
    ['كشاف الأسهم', 'renderScreener'],
    ['التوصيات', 'renderRecommendationsCustomerPage'],
    ['حسابي', 'GS:renderAccount'],
    ['الملف الشخصي', 'renderProfilePage'],
    ['الاشتراك والباقات', 'renderSubscriptionPlans'],
    ['سجل اشتراكي', 'renderMySubscriptionHistory'],
    ['ادعُ صديقك', 'renderReferralPage'],
    ['عن GRIFFINE', 'renderAboutPage'],
    ['تواصل معنا', 'renderContactInfo'],
    ['مقالات', 'renderArticlesListPage'],
    ['تفاصيل مقال', 'renderArticleDetailPage', 'article'],
    ['آراء العملاء', 'renderTestimonialsPage'],
    ['شاركنا مقترحاتك', 'renderSuggestionsPage'],
    ['سياسة الاسترداد', 'renderRefundPolicyPage'],
    ['إخلاء المسؤولية', 'renderDisclaimerPage'],
    ['سياسة الخصوصية', 'renderPrivacyPolicyPage'],
    ['حذف الحساب', 'GS:renderDeleteAccount'],

    ['— لوحة التحكم —'],
    ['لوحة التحكم', 'renderAdminHub'],
    ['المشتركون', 'renderAdminSubscribers'],
    ['التقارير', 'renderAdminReportsPage'],
    ['تقرير الصفقات', 'renderTradesReportPage'],
    ['المساعد الذكي في الشات', 'renderFaqAdminPage'],
    ['سلة المحذوفات', 'renderTrashPage'],
    ['الإعدادات الإلزامية', 'renderAdminSettingsPage'],
    ['الشاشات الطارئة', 'renderEmergencyAdminPage'],
    ['البحث عن فرص', 'renderOpportunities'],
    ['بصيرة AI — تحليل سهم', 'renderBasira'],
    ['تحليلات بصيرة AI (الإعدادات)', 'renderAdminBasira'],
    ['ميزان GRIFFINE AI (الإعدادات)', 'renderAdminMizanAi'],
    ['الدعاية والعروض', 'renderAdsAdminPage'],
    ['الفريق والصلاحيات', 'renderStaffManagementPage'],
    ['شؤون الموظفين (HR)', 'renderHrPage'],
    ['المسميات الوظيفية', 'renderJobTitlesPage'],
    ['القائمة السوداء', 'renderBlacklist'],
    ['إدارة الباقات', 'renderPlansManagementPage'],
    ['توصية شراء / بيع (المحللين)', 'renderRecommendationsAdminPage'],
    ['الدردشة الفورية (إدارة)', 'renderChatAdminPage'],
    ['تنسيق الموقع', 'renderSiteDesignPage'],
    ['نصوص الشاشات', 'renderSiteTextsAdminPage'],
    ['آراء العملاء والمقالات (إدارة)', 'renderContentAdminPage'],
    ['مقترحات العملاء (إدارة)', 'renderSuggestionsAdminPage'],
    ['مركز الإيميلات', 'GS:renderEmailCenter'],
    ['الأرشيف', 'renderArchivedCustomers'],
  ];

  // إعدادات التصوير
  const PRINT = {
    scale: 1.5,            // دقة الصورة (1.5 = أوضح من الشاشة بنص مرة)
    waitAfterRender: 1200, // انتظار بعد فتح الشاشة (تحميل البيانات والصور)
    renderTimeout: 6000,   // أقصى انتظار لشاشة بطيئة
    maxShotHeight: 9000,   // أقصى طول للصورة (بكسل) - الشاشات الطويلة جدًا بتتقص
    pageWidthMm: 210,      // عرض صفحة PDF (A4)
    maxPageHeightMm: 5000, // أقصى طول لصفحة PDF (حد مكتبة jsPDF)
    headerPx: 64,          // ارتفاع شريط العنوان فوق كل صورة
    gold: '#D4AF37',
    font: '"IBM Plex Sans Arabic", Tahoma, sans-serif'
  };

  // تحميل مكتبة خارجية مرة واحدة
  function loadScript(src){
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('تعذّر تحميل ' + src));
      document.head.appendChild(s);
    });
  }

  // ---- 16ب) البيانات اللي شاشات التفاصيل محتاجاها (أول خطة / أول مقال) ----
  async function loadPrintArgs(){
    const args = { dca: null, grid: null, article: null };
    try {
      const email = await getSession();
      if (email) {
        const [plans, grids] = await Promise.all([getPlans(email).catch(() => ({})), getGridPlans(email).catch(() => ({}))]);
        args.dca = Object.keys(plans || {})[0] || null;
        args.grid = Object.keys(grids || {})[0] || null;
      }
    } catch(e){}
    try {
      const r = await getArticles();
      const list = (r && r.success && r.articles) || [];
      args.article = list.length ? list[0].slug : null;
    } catch(e){}
    return args;
  }

  // ---- 16ج) بناء القائمة النهائية (بنشيل اللي دالته مش موجودة أو محتاج بيانات مش موجودة) ----
  function buildPrintList(args){
    const fnOf = (name) => name.startsWith('GS:') ? GS[name.slice(3)] : window[name];
    const list = [];
    let section = '';
    SCREENS_TO_PRINT.forEach(row => {
      if (row.length === 1) { section = row[0].replace(/—/g, '').trim(); return; }
      const [label, fnName, argKey] = row;
      if (typeof fnOf(fnName) !== 'function') return;          // الشاشة مش موجودة في الإصدار ده
      if (argKey && !args[argKey]) return;                      // لا يوجد خطة/مقال نعرض تفاصيله
      list.push({ section, label: argKey ? `${label} (${args[argKey]})` : label, fnName, arg: argKey ? args[argKey] : undefined, fn: fnOf(fnName) });
    });
    return list;
  }

  // قائمة كل الشاشات بالترتيب (بيستخدمها استوديو التصميم في اختيار الشاشة)
  GS.getScreenCatalog = async function(){ return buildPrintList(await loadPrintArgs()); };

  // ---- 16د) أدوات الرسم على canvas (العناوين والصفحات النصية) ----

  // شريط العنوان الغامق بخط ذهبي تحته
  function drawHeaderBar(g, width, title, subtitle){
    const s = PRINT.scale, head = PRINT.headerPx * s;
    g.fillStyle = isDark() ? '#111923' : '#0F172A'; g.fillRect(0, 0, width, head);
    g.fillStyle = PRINT.gold; g.fillRect(0, head - 4, width, 4);
    g.direction = 'rtl'; g.textAlign = 'right'; g.fillStyle = '#FFFFFF';
    g.font = `700 ${Math.round(22 * s)}px ${PRINT.font}`;
    g.fillText(title, width - 24, head * 0.45);
    g.font = `500 ${Math.round(13 * s)}px ${PRINT.font}`; g.fillStyle = 'rgba(255,255,255,.7)';
    g.fillText(subtitle, width - 24, head * 0.8);
    return head;
  }

  // صفحة نصية كاملة (غلاف / شاشة فشلت / ملخص): lines = [{ text, size, bold, color }]
  function textPage(title, subtitle, lines){
    const s = PRINT.scale;
    const width = Math.round(document.documentElement.clientWidth * s);
    const lineH = (l) => Math.round((l.size || 15) * 1.9 * s);
    const bodyH = lines.reduce((h, l) => h + lineH(l), 0);
    const c = document.createElement('canvas');
    c.width = width; c.height = Math.round(PRINT.headerPx * s + bodyH + 60 * s);
    const g = c.getContext('2d');
    g.fillStyle = isDark() ? '#0A0F16' : '#FFFFFF'; g.fillRect(0, 0, c.width, c.height);
    let y = drawHeaderBar(g, width, title, subtitle) + 30 * s;
    g.direction = 'rtl'; g.textAlign = 'right';
    lines.forEach(l => {
      y += lineH(l) * 0.75;
      g.font = `${l.bold ? 700 : 500} ${Math.round((l.size || 15) * s)}px ${PRINT.font}`;
      g.fillStyle = l.color || (isDark() ? '#F1F5F9' : '#0F172A');
      g.fillText(l.text, width - 32 * s, y);
      y += lineH(l) * 0.25;
    });
    return c;
  }

  // تصوير الشاشة الحالية
  async function captureCurrentScreen(bg){
    return html2canvas(document.body, {
      backgroundColor: bg, scale: PRINT.scale, useCORS: true, logging: false,
      windowWidth: document.documentElement.clientWidth,
      height: Math.min(document.documentElement.scrollHeight, PRINT.maxShotHeight),
      ignoreElements: (el) => el.id === 'gsExportOverlay' || el.id === 'chatBubble' || el.id === 'chatPanel' || el.tagName === 'IFRAME'
    });
  }

  // إضافة canvas كصفحة في الـPDF (الصفحة بعرض A4 وطولها حسب الصورة)
  function addCanvasPage(state, canvas){
    const wmm = PRINT.pageWidthMm;
    const hmm = Math.min(Math.round(canvas.height * wmm / canvas.width), PRINT.maxPageHeightMm);
    const orient = hmm >= wmm ? 'portrait' : 'landscape';
    const img = canvas.toDataURL('image/jpeg', 0.82);
    if (!state.pdf) state.pdf = new state.jsPDF({ unit: 'mm', format: [wmm, hmm], orientation: orient, compress: true });
    else state.pdf.addPage([wmm, hmm], orient);
    state.pdf.addImage(img, 'JPEG', 0, 0, wmm, hmm, undefined, 'FAST');
  }

  // ---- 16هـ) شاشة التقدّم فوق الصفحة أثناء التصوير ----
  function showExportOverlay(){
    const ov = document.createElement('div');
    ov.id = 'gsExportOverlay'; ov.setAttribute('data-html2canvas-ignore', 'true');
    ov.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(2,6,12,.72);display:flex;align-items:center;justify-content:center;color:#fff;font:600 16px/1.8 inherit;text-align:center;padding:24px';
    ov.innerHTML = '<div><div id="gsExportTxt">جاري تحميل أدوات الطباعة...</div><div style="margin-top:12px;width:260px;height:6px;border-radius:3px;background:rgba(255,255,255,.2);overflow:hidden"><div id="gsExportBar" style="height:100%;width:0;background:#D4AF37;transition:width .2s"></div></div></div>';
    document.body.appendChild(ov);
    return {
      set(t, p){
        const e = document.getElementById('gsExportTxt'); if (e) e.textContent = t;
        const b = document.getElementById('gsExportBar'); if (b && p != null) b.style.width = p + '%';
      },
      remove(){ ov.remove(); }
    };
  }

  // ---- 16و) الدالة الرئيسية (زرار "طباعة صور كل الشاشات" في لوحة التحكم) ----
  GS.exportScreensPdf = async function(){
    if (GS._exporting) return;

    // 1) تجهيز القائمة
    const args = await loadPrintArgs();
    const list = buildPrintList(args);
    const total = list.length;
    const themeName = isDark() ? 'الوضع الليلي' : 'الوضع النهاري';
    const deviceName = window.innerWidth < 1024 ? 'موبايل' : 'كمبيوتر';
    if (!await gConfirm(`سيتم فتح ${total} شاشة وتصويرها واحدة واحدة وتجميعها في ملف PDF.\nتستغرق العملية حوالي دقيقتين - لا تغلق الصفحة.\n\nستخرج الصور بالشكل الحالي (${themeName}، ${deviceName}).`)) return;

    // 2) قفل الصفحة أثناء التصوير
    GS._exporting = true;
    document.documentElement.classList.add('gs-exporting');
    const overlay = showExportOverlay();
    const origAlert = window.alert, origConfirm = window.confirm;
    window.alert = () => {};

    const results = [];   // { label, ok, reason }
    try {
      // 3) تحميل المكتبات
      if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      if (!window.jspdf) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      window.confirm = () => false; // أي تأكيد بيظهر من شاشة أثناء التصوير بيتلغي تلقائيًا

      const state = { jsPDF: window.jspdf.jsPDF, pdf: null };
      const dateStr = new Date().toISOString().slice(0, 10);

      // 4) صفحة الغلاف
      addCanvasPage(state, textPage('GRIFFINE — صور كل الشاشات', `الإصدار ${APP_VERSION} · ${dateStr}`, [
        { text: `عدد الشاشات: ${total}`, size: 20, bold: true },
        { text: `الشكل: ${themeName} · ${deviceName} (عرض ${document.documentElement.clientWidth}px)`, size: 16 },
        { text: 'كل شاشة في صفحة لوحدها بالترتيب، وفي آخر الملف ملخص بكل الشاشات.', size: 15 },
      ]));

      // 5) الشاشات واحدة واحدة
      let n = 0;
      for (const item of list) {
        n++;
        overlay.set(`جاري تصوير الشاشة ${n} من ${total}: ${item.label}`, Math.round(n / total * 100));

        // أ) فتح الشاشة من غير ما تتسجل في سجل الرجوع
        window.__navSilent = true;
        try {
          await Promise.race([Promise.resolve(item.arg !== undefined ? item.fn(item.arg) : item.fn()), sleep(PRINT.renderTimeout)]);
        } catch(e){ /* الشاشة رمت خطأ - هنصوّر اللي اترسم منها */ }
        finally { window.__navSilent = false; }
        await sleep(PRINT.waitAfterRender);
        window.scrollTo(0, 0);
        document.querySelectorAll('.gs-toast').forEach(t => t.remove());

        // ب) التصوير
        const bg = getComputedStyle(document.body).backgroundColor || '#ffffff';
        let shot = null, reason = '';
        try { shot = await captureCurrentScreen(bg); }
        catch(e){ reason = (e && e.message) || String(e); console.warn('screen capture failed:', item.label, reason); }

        // ج) صفحة الشاشة (أو صفحة توضّح إنها فشلت - عشان لا يوجد شاشة تختفي من الملف)
        if (shot) {
          const c = document.createElement('canvas');
          const head = PRINT.headerPx * PRINT.scale;
          c.width = shot.width; c.height = shot.height + head;
          const g = c.getContext('2d');
          drawHeaderBar(g, c.width, `${n}. ${item.label}`, `${item.section} · GRIFFINE`);
          g.drawImage(shot, 0, head);
          addCanvasPage(state, c);
          results.push({ label: item.label, ok: true });
        } else {
          addCanvasPage(state, textPage(`${n}. ${item.label}`, `${item.section} · GRIFFINE`, [
            { text: 'تعذّر تصوير هذه الشاشة', size: 20, bold: true, color: '#E02424' },
            { text: `السبب: ${reason.slice(0, 120)}`, size: 14 },
          ]));
          results.push({ label: item.label, ok: false, reason });
        }
      }

      // 6) صفحة الملخص في الآخر
      const okCount = results.filter(r => r.ok).length;
      addCanvasPage(state, textPage('ملخص الشاشات', `${okCount} من ${total} اتصورت بنجاح`,
        results.map((r, i) => ({ text: `${i + 1}. ${r.label} — ${r.ok ? 'تم ✓' : 'فشل ✗'}`, size: 14, color: r.ok ? undefined : '#E02424' }))));

      // 7) الحفظ
      overlay.set('جاري حفظ الملف...', 100);
      state.pdf.save(`griffine-screens-v${APP_VERSION}-${dateStr}-${isDark() ? 'DARK' : 'LIGHT'}.pdf`);
      GS.toast(okCount === total ? `تم حفظ ملف PDF بصور ${total} شاشة` : `تم حفظ ملف PDF: ${okCount} من ${total} شاشة (الباقي موضّح في آخر صفحة)`, okCount === total ? 'ok' : 'info');
    } catch(e){
      GS.toast('تعذّر إنشاء ملف PDF: ' + (e && e.message ? e.message : e), 'err');
    } finally {
      // 8) رجوع كل حاجة زي ما كانت
      window.alert = origAlert; window.confirm = origConfirm;
      overlay.remove(); GS._exporting = false;
      document.documentElement.classList.remove('gs-exporting');
      try { renderAdminHub(); } catch(e){}
    }
  };


  /* =====================================================================
     17. قائمة الزائر (قبل تسجيل الدخول)
     ===================================================================== */
  GS.openPublicMenu = function(){
    const pt = (k, f) => { try { return pageTitle(k, f); } catch(e){ return f; } };
    const items = [
      ['login','تسجيل الدخول / إنشاء حساب', () => (typeof openLoginModal === 'function') ? openLoginModal() : renderLogin()],
      ['card','الباقات والأسعار', () => renderPublicPricing()],
      ['info', pt('about_page','عن GRIFFINE'), () => renderAboutPage()],
      ['phone', pt('contact_info','تواصل معنا'), () => renderContactInfo()],
      ['news', pt('articles_list','مقالات'), () => renderArticlesListPage()],
      ['bulb', pt('suggestions_page','شاركنا مقترحاتك'), () => renderSuggestionsPage()],
      ['refund', pt('refund_policy_page','سياسة استرداد الاشتراك'), () => renderRefundPolicyPage()],
      ['shield','إخلاء المسؤولية', () => renderDisclaimerPage()],
    ];
    GS.sheet('القائمة',
      `<div class="gs-list">${items.map((it, i) => `<button type="button" class="gs-row" data-i="${i}"><span class="gs-row-ic">${icon(it[0])}</span><span class="gs-row-main"><b>${esc(it[1])}</b></span><span class="gs-chev">${icon('chev')}</span></button>`).join('')}</div>`,
      (sh) => sh.querySelectorAll('.gs-row').forEach(b => b.onclick = () => { GS.closeSheet(); items[+b.dataset.i][2](); }));
  };


  /* =====================================================================
     17أ. البحث العام في الموقع (الإصدار 116) - أي شاشة / أداة / خطة / سهم ← تفتحها مباشرة
     بيتخفي من لوحة التحكم (hide_site_search). الشاشات المخفية عن العميل مبتظهرش في البحث.
     ===================================================================== */
  const SEARCH_HIDE = { renderPlansList:'hide_dac_screen', renderNewPlanForm:'hide_dac_screen', renderGridPlansList:'hide_grid_screen', renderGridPlanForm:'hide_grid_screen',
    renderPortfolio:'hide_portfolio_screen', renderDiversificationReport:'hide_mizan_screen', renderMizanAi:'hide_mizanai_screen', renderScreener:'hide_screener_screen', renderBasira:'hide_basira_screen',
    renderRecommendationsCustomerPage:'hide_recommendations_screen', renderReferralPage:'hide_referral_screen', renderTrashPage:'hide_trash_screen', renderWatchlistPage:'hide_watchlist_screen',
    renderAlertsPage:'hide_alerts_screen', renderTradesReportPage:'hide_trades_screen', renderMySubscriptionHistory:'hide_sub_history_screen', renderContactInfo:'hide_contact_screen',
    renderTestimonialsPage:'hide_testimonials_screen', renderArticlesListPage:'hide_articles_screen', renderSuggestionsPage:'hide_suggestions_screen', renderOpportunities:'hide_opps_screen' };
  // كلمات إضافية بتساعد توصل للشاشة حتى لو مش فاكر اسمها
  const SEARCH_WORDS = {
    renderHome:'رئيسية بداية قيمة المحفظة', renderPlansList:'dca داك تعزيز متوسط خطط شراء', renderNewPlanForm:'dca خطة جديدة داك إضافة سهم',
    renderGridPlansList:'grid جريد شبكة خطط', renderGridPlanForm:'grid شبكة جريد خطة جديدة نطاق', renderPlanTypeChooser:'خطة جديدة إنشاء',
    renderPortfolio:'محفظة تقارير أرباح ملخص', renderDiversificationReport:'ميزان تنويع توزيع مخاطرة hhi قطاعات ذكاء اصطناعي ai',
    renderScreener:'كشاف مؤشرات تحليل فني فلترة أسهم',
    renderMizanAi:'ميزان توزيع استثمار قطاعات أصول عقار شهادات ذهب ادخار مبلغ شهري فحص توزيعة مخطط',
    renderAdminMizanAi:'ميزان إعدادات عوائد نسب أصول مخاطرة', renderBasira:'بصيرة تحليل سهم ذكاء اصطناعي ai أخبار توقع', renderOpportunities:'فرص مؤشرات إشعارات rsi',
    renderRecommendationsCustomerPage:'توصيات شراء', renderWatchlistPage:'متابعة مفضلة نجمة', renderAlertsPage:'تنبيه سعر إشعار', renderTradesReportPage:'صفقات تقرير بيع شراء',
    renderSubscriptionPlans:'اشتراك باقة دفع تجديد سعر', renderMySubscriptionHistory:'سجل اشتراك فواتير', renderProfilePage:'ملف شخصي اسم صورة موبايل كلمة سر',
    renderReferralPage:'إحالة دعوة صديق كود', renderTrashPage:'سلة محذوفات استرجاع حذف', renderContactInfo:'تواصل واتساب تليفون إيميل', renderAboutPage:'عن الموقع الإصدار',
    renderSuggestionsPage:'اقتراح شكوى رأي', renderArticlesListPage:'مقالات تعليم', renderAdminSettingsPage:'إعدادات إخفاء إظهار صلاحيات أزرار', renderSiteDesignPage:'تصميم ثيم ألوان خط استوديو',
    renderAdminBasira:'مفتاح claude api ذكاء اصطناعي إعدادات بصيرة', renderAdminSubscribers:'مشتركين عملاء', renderEmergencyAdminPage:'صيانة طوارئ', renderAdsAdminPage:'إعلانات دعاية بانر'
  };
  const nrm = (t) => String(t || '').toLowerCase().replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ًٌٍَُِّْـ]/g, '').replace(/\s+/g, ' ').trim();
  async function searchIndex(){
    const out = [], seen = new Set();
    const add = (label, sub, go, words, fn) => { const k = nrm(label); if (seen.has(k)) return; seen.add(k); out.push({ label, sub, go, hay: nrm(label + ' ' + sub + ' ' + (words || '')) , fn }); };
    let sec = '';
    SCREENS_TO_PRINT.forEach(r => {
      if (r.length === 1) { sec = r[0].replace(/—/g, '').trim(); return; }
      const [label, fn, need] = r; if (need) return;
      if (/العامة/.test(sec)) return;
      if (/لوحة التحكم/.test(sec) && !window.__isAdmin) return;
      if (!window.__isAdmin && SEARCH_HIDE[fn] && hidden(SEARCH_HIDE[fn])) return;
      const isGS = fn.startsWith('GS:'), name = isGS ? fn.slice(3) : fn;
      const f = isGS ? GS[name] : window[name]; if (typeof f !== 'function') return;
      add(label, /لوحة التحكم/.test(sec) ? 'لوحة التحكم' : 'شاشة', () => (isGS ? GS[name]() : window[name]()), SEARCH_WORDS[name], name);
    });
    try { sideItems().forEach(it => { if (it.label && it.go) add(it.label, 'القائمة', it.go, SEARCH_WORDS[it.screen] || ''); }); } catch(e){}
    add('الوضع الليلي / النهاري', 'أداة', () => GS.toggleTheme(), 'ليلي نهاري داكن فاتح هلال ثيم');
    if (!(GS.allSettings && GS.allSettings.hide_install_icon === true)) add('تثبيت التطبيق على الجهاز', 'أداة', () => GS.installApp(), 'تطبيق موبايل تحميل pwa');
    // خطط المستخدم نفسه
    try {
      const [p, g] = await Promise.all([getPlans(GS.email).catch(() => ({})), getGridPlans(GS.email).catch(() => ({}))]);
      Object.keys(p || {}).forEach(s => add(`خطة ${s}`, 'DCA', () => renderPlanDetail(s), 'dca داك ' + s));
      Object.keys(g || {}).forEach(s => add(`خطة ${s}`, 'Grid', () => renderGridPlanDetail(s), 'grid شبكة ' + s));
    } catch(e){}
    return out;
  }
  GS.openSearch = async function(){
    let ov = $('#gsSearchOv');
    if (!ov) {
      ov = document.createElement('div'); ov.id = 'gsSearchOv'; ov.className = 'gs-search-ov';
      ov.innerHTML = `<div class="gs-search" role="dialog" aria-modal="true" aria-label="بحث في الموقع">
        <div class="gs-search-in">${icon('search')}<input type="search" id="gsSearchQ" placeholder="ابحث عن أي شاشة أو أداة أو خطة أو سهم…" autocomplete="off"><button type="button" class="gs-iconbtn" id="gsSearchX" aria-label="إغلاق">${icon('x')}</button></div>
        <div class="gs-search-res" id="gsSearchRes" role="listbox"></div><small class="gs-search-hint">↑ ↓ للتنقل • Enter للفتح • Esc للإغلاق</small></div>`;
      document.body.appendChild(ov);
      ov.addEventListener('click', (e) => { if (e.target === ov) GS.closeSearch(); });
      $('#gsSearchX').onclick = () => GS.closeSearch();
    }
    ov.hidden = false; document.body.classList.add('gs-search-open');
    const q = $('#gsSearchQ'), res = $('#gsSearchRes'); q.value = '';
    res.innerHTML = '<div class="gs-search-empty">جاري التحميل…</div>';
    const idx = await searchIndex(); let cur = [], sel = 0;
    const paint = () => {
      const t = nrm(q.value), words = t ? t.split(' ') : [];
      cur = !words.length ? idx.filter(x => x.sub === 'القائمة').slice(0, 12)
        : idx.map(x => ({ x, sc: words.every(w => x.hay.includes(w)) ? (nrm(x.label).startsWith(words[0]) ? 3 : nrm(x.label).includes(t) ? 2 : 1) : 0 })).filter(y => y.sc).sort((a, b) => b.sc - a.sc).map(y => y.x).slice(0, 14);
      const raw = q.value.trim().toUpperCase();
      if (/^[A-Z0-9.\-]{2,12}$/.test(raw) && typeof window.renderBasira === 'function' && (window.__isAdmin || !hidden('hide_basira_screen'))) cur.push({ label: `تحليل سهم ${raw} في بصيرة`, sub: 'بصيرة AI', go: () => window.renderBasira(raw) });
      sel = Math.min(sel, Math.max(0, cur.length - 1));
      res.innerHTML = cur.length ? cur.map((x, i) => `<button type="button" class="gs-search-it${i === sel ? ' on' : ''}" data-i="${i}" role="option"><b>${esc(x.label)}</b><small>${esc(x.sub)}</small></button>`).join('')
        : `<div class="gs-search-empty">مفيش نتايج لـ «${esc(q.value)}» — جرّب كلمة تانية.</div>`;
      res.querySelectorAll('.gs-search-it').forEach(b => b.onclick = () => go(+b.dataset.i));
    };
    const go = (i) => { const x = cur[i]; if (!x) return; GS.closeSearch(); try { x.go(); } catch(e){ console.error(e); } };
    q.oninput = () => { sel = 0; paint(); };
    q.onkeydown = (e) => {
      if (e.key === 'Escape') { GS.closeSearch(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + cur.length) % Math.max(1, cur.length); paint(); const on = res.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' }); }
      if (e.key === 'Enter') { e.preventDefault(); go(sel); }
    };
    paint(); setTimeout(() => q.focus(), 20);
  };
  GS.closeSearch = function(){ const ov = $('#gsSearchOv'); if (ov) ov.hidden = true; document.body.classList.remove('gs-search-open'); };
  // Ctrl+K / ⌘K
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K') && GS.email && $('#gsSearchBtn')) { e.preventDefault(); GS.openSearch(); } });


  /* =====================================================================
     18. التثبيت كتطبيق (PWA)
     ===================================================================== */
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  // لافتة "ثبّت التطبيق" في الرئيسية
  GS.installCardHtml = function(){
    if (isStandalone() || store.get('gs_install_dismissed', '0') === '1') return '';
    if (!GS.deferredInstall && !isIOS()) return '';
    return `<div class="gs-install" id="gsInstall"><img src="icon-192.png" alt=""><div class="t"><b>ثبّت تطبيق GRIFFINE ${window.innerWidth >= 1024 ? 'على جهازك' : 'على موبايلك'}</b>${isIOS() && !GS.deferredInstall ? 'من زر المشاركة اختر «إضافة إلى الشاشة الرئيسية»' : 'افتحه بضغطة واحدة مثل أي تطبيق'}</div>
      ${GS.deferredInstall ? `<button type="button" id="gsInstallBtn">تثبيت</button>` : ''}<button type="button" class="x gs-iconbtn" id="gsInstallX" aria-label="إخفاء">${icon('x')}</button></div>`;
  };

  GS.wireInstallCard = function(){
    const b = $('#gsInstallBtn'), x = $('#gsInstallX');
    if (b) b.onclick = async () => {
      const p = GS.deferredInstall; if (!p) return;
      p.prompt();
      try { await p.userChoice; } catch(e){}
      GS.deferredInstall = null;
      const c = $('#gsInstall'); if (c) c.remove();
    };
    if (x) x.onclick = () => { store.set('gs_install_dismissed', '1'); const c = $('#gsInstall'); if (c) c.remove(); };
  };

  // الإصدار 116: أيقونة تثبيت التطبيق في الشريط العلوي (جنب الهلال) - تتخفي من لوحة التحكم (hide_install_icon)
  GS.installApp = async function(){
    if (isStandalone()) { GS.toast('التطبيق متثبّت ومفتوح بالفعل ✅', 'ok'); return; }
    const p = GS.deferredInstall;
    if (p) { p.prompt(); try { await p.userChoice; } catch(e){} GS.deferredInstall = null; return; }
    if (isIOS()) { GS.toast('من زر المشاركة في Safari اختر «إضافة إلى الشاشة الرئيسية»', 'info'); return; }
    GS.toast('من قائمة المتصفح (⋮) اختر «تثبيت التطبيق» أو «Install app» — ولو مش ظاهر يبقى التطبيق متثبّت بالفعل', 'info');
  };
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); GS.deferredInstall = e; });
  window.addEventListener('appinstalled', () => { GS.deferredInstall = null; const c = $('#gsInstall'); if (c) c.remove(); const ib = $('#gsInstallIcon'); if (ib) ib.remove(); GS.toast('تم تثبيت GRIFFINE على جهازك', 'ok'); });

  function registerSW(){
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }


  /* =====================================================================
     19. التشغيل (بيتنادى مرة واحدة من init في app-init.js)
     ===================================================================== */
  GS.init = function(email){
    if (GS.enabled) return;
    GS.enabled = true;
    GS.email = email || null;
    document.body.classList.add('g-shell');

    // 1) الهيكل + لف دوال الشاشات
    buildChrome();
    wrapRenderers();

    // 2) alert → Toast (نفس الرسالة بس من غير ما توقف الشاشة)
    window.__nativeAlert = window.alert.bind(window);
    window.alert = (m) => GS.toast(m);

    // 3) مراقبة تغيير الشاشات
    const appEl = document.getElementById('app');
    // شاشات الترحيب/الدخول الكاملة بتتعرف فورًا (قبل الرسم) عشان تنسيقات الشاشات الداخلية متلمسهاش
    const syncFull = () => { if (appEl) document.body.classList.toggle('gs-no-shell', !!appEl.querySelector('.wl-screen, .gl-screen, .lp-screen')); };
    if (appEl) new MutationObserver(() => { syncFull(); scheduleProcess(); }).observe(appEl, { childList:true, subtree:true });
    syncFull();

    // 4) أحداث عامة
    window.addEventListener('scroll', onScroll, { passive:true });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') GS.closeSheet(); });
    registerSW();

    // 5) اختصارات أيقونة التطبيق (ضغطة مطوّلة على الأيقونة): ?go=new أو ?go=portfolio
    try {
      const qs = new URLSearchParams(location.search);
      const go = qs.get('go'); if (go === 'new' || go === 'portfolio') window.__afterLoginTarget = go;
      if (qs.get('page') === 'delete-account') window.__afterLoginTarget = 'deleteAccount';
    } catch(e){}
  };
})();
