/* =====================================================================
   GRIFFINE Studio — محرّك الهوية البصرية (الإصدار 72)
   ---------------------------------------------------------------------
   الملف ده بيتحمّل عند كل الزوار، وشغلته "تطبيق" اللي الأدمن حفظه بس:
     - الثيم: اللون الرئيسي ← الموقع بيولّد منه كل الألوان المتناسقة (نهاري + ليلي)
              + نوع الخط + حجم الخط + استدارة الحواف + شكل الأزرار + الجداول في سطر واحد
     - تعديلات الشاشات: تغيير أي كلمة (عنوان / زرار / اسم عمود / اختيار في قائمة منسدلة)
                         وتنسيق أي عنصر (لون / خط / حجم / خلفية / إخفاء)

   المستخدم العادي مالوش أي تحكم هنا - عنده بس الوضع الليلي/النهاري (في shell.js).
   شاشة التعديل نفسها (studio-editor.js) بتتحمّل للأدمن بس وقت ما يفتحها.

   ---------------------------------------------------------------------
   فهرس الأقسام:
     00. الثوابت (الخطوط المسموحة / خصائص التنسيق المسموحة / الثيمات الجاهزة)
     01. أدوات الألوان (HEX ↔ HSL / التباين / الشفافية)
     02. توليد ألوان الثيم من اللون الرئيسي
     03. تطبيق الثيم (CSS متغيرات + خط + حجم + أزرار)
     04. تعديلات الشاشات: التنسيق (CSS لكل عنصر)
     05. تعديلات الشاشات: النصوص (قاموس الكلمات + نص عنصر بعينه)
     06. التحميل من السيرفر والحفظ
     07. فتح شاشة التعديل (للأدمن)
     08. التشغيل

   كل حاجة بتتحفظ في جدول ui_customizations عن طريق ui_custom_get.php / ui_custom_save.php
   ===================================================================== */
(function(){
  'use strict';

  const ST = window.GStudio = {
    theme: null,                                           // الثيم المحفوظ (null = الشكل الأصلي)
    overrides: { v:1, texts:[], elTexts:[], styles:[], orders:[] },  // تعديلات الشاشات المحفوظة
    loaded: false
  };
  const CACHE_KEY = 'gs_studio_cache_v1';                   // نسخة محلية عشان الشكل يظهر فورًا من غير وميض


  /* =====================================================================
     00. الثوابت
     ===================================================================== */

  // الخطوط المسموحة (نفس القائمة في ui_custom_save.php) - google = اسم الخط في Google Fonts
  ST.FONTS = [
    { name:'IBM Plex Sans Arabic', label:'آي بي إم بلكس (الافتراضي)', google:'IBM+Plex+Sans+Arabic:wght@400;500;600;700' },
    { name:'Noto Kufi Arabic',     label:'نوتو كوفي',                 google:'Noto+Kufi+Arabic:wght@400;500;700;800' },
    { name:'Cairo',                label:'القاهرة Cairo',              google:'Cairo:wght@400;500;600;700;800' },
    { name:'Tajawal',              label:'تجوال Tajawal',              google:'Tajawal:wght@400;500;700;800' },
    { name:'Almarai',              label:'المراعي Almarai',            google:'Almarai:wght@400;700;800' },
    { name:'Readex Pro',           label:'ريدكس برو',                  google:'Readex+Pro:wght@400;500;600;700' },
    { name:'Changa',               label:'تشانجا Changa',              google:'Changa:wght@400;500;600;700' },
    { name:'El Messiri',           label:'المسيري El Messiri',         google:'El+Messiri:wght@400;500;600;700' },
    { name:'Tahoma',               label:'Tahoma (مدمج في الجهاز)',    google:null },
    { name:'Arial',                label:'Arial (مدمج في الجهاز)',     google:null },
  ];

  // خصائص التنسيق اللي الأدمن يقدر يغيّرها لأي عنصر (نفس القائمة في ui_custom_save.php)
  ST.CSS_PROPS = ['color','background-color','font-size','font-weight','font-family','font-style','text-align',
                  'text-decoration','letter-spacing','line-height','padding','border-radius','border-color','display','opacity',
                  // الإصدار 107: حجم العنصر + ترتيب العناصر جوه الصندوق (يمين / وسط / شمال / عمودين ...)
                  'width','min-height','flex-wrap','flex-direction','justify-content','align-items','gap','grid-template-columns'];
  // قيم مسموحة بالظبط لخصائص الترتيب (أي حاجة غيرها بتترفض)
  ST.LAYOUT_VALUES = { display: ['none', 'flex', 'grid'], 'flex-wrap': ['wrap', 'nowrap'], 'flex-direction': ['row', 'column'],
    'justify-content': ['flex-start', 'center', 'flex-end', 'space-between', 'stretch'], 'align-items': ['flex-start', 'center', 'flex-end', 'stretch'] };

  /* الثيمات الجاهزة - كل ثيم = لون رئيسي + لون الأزرار (اختياري) + خط خاص بيه (بيتطبّق على كل الشاشات) + شوية لمسات
     باقي الألوان (الخلفية / البطاقات / الحدود / النص / الوضع الليلي) بتتولد تلقائيًا في قسم 02.
     لإضافة ثيم جديد: سطر جديد هنا فقط. */
  ST.PRESETS = [
    { id:'griffine', name:'ذهبي GRIFFINE',        note:'الهوية الأصلية: ذهبي مع كحلي غامق',        primary:'#C9A227', ink:'#0F172A', font:'IBM Plex Sans Arabic', native:true },
    { id:'yellow',   name:'أصفر مشرق',            note:'أصفر قوي مع أسود - تباين عالي وواضح',     primary:'#FFD200', ink:'#111111', bg:'#F6F6F1', buttons:'filled', radius:14, font:'Readex Pro' },
    { id:'green',    name:'أخضر نعناعي',          note:'أخضر هادي مع درجات النعناع',               primary:'#10B981', ink:'#064E3B', radius:16, font:'Tajawal' },
    { id:'blue',     name:'أزرق بنكي',            note:'أزرق واثق مع أبيض نظيف',                   primary:'#1D4ED8', ink:'#1E3A8A', radius:12, font:'Noto Kufi Arabic' },
    { id:'purple',   name:'بنفسجي عصري',          note:'بنفسجي مع لمسة وردي',                       primary:'#7C3AED', ink:'#2E1065', radius:18, font:'Changa' },
    { id:'orange',   name:'برتقالي دافي',         note:'برتقالي حيوي مع رمادي فحمي',                primary:'#F97316', ink:'#1C1917', radius:14, font:'Cairo' },
    { id:'teal',     name:'فيروزي',               note:'فيروزي بحري مع كحلي',                        primary:'#0D9488', ink:'#134E4A', radius:16, font:'Almarai' },
    { id:'red',      name:'أحمر ملكي',            note:'أحمر عميق مع أسود',                          primary:'#DC2626', ink:'#1F1111', radius:12, font:'El Messiri' },
  ];

  // القيم الافتراضية لأي ثيم
  ST.THEME_DEFAULTS = { preset:'custom', primary:'#C9A227', ink:'', bg:'', surface:'', text:'', font:'', scale:100, radius:18, buttons:'filled', tableNowrap:true };

  // ثيم كامل من ثيم جاهز
  ST.themeFromPreset = function(id){
    const p = ST.PRESETS.find(x => x.id === id) || ST.PRESETS[0];
    return Object.assign({}, ST.THEME_DEFAULTS, { preset:p.id, primary:p.primary, ink:p.ink || '', bg:p.bg || '', buttons:p.buttons || 'filled', radius:p.radius != null ? p.radius : 18, font:p.font || '' });
  };


  /* =====================================================================
     01. أدوات الألوان
     ===================================================================== */
  const isHex = (v) => /^#[0-9a-f]{6}$/i.test(String(v || ''));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function hexToRgb(h){ const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgbToHex(r, g, b){ return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase(); }

  function hexToHsl(h){
    let [r, g, b] = hexToRgb(h).map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let hh = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > .5 ? d / (2 - max - min) : d / (max + min);
      hh = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hh *= 60;
    }
    return [hh, s * 100, l * 100];
  }
  function hsl(h, s, l){
    s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
  }
  // درجة الإضاءة (للتباين)
  function luminance(h){
    const f = (c) => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
    const [r, g, b] = hexToRgb(h); return .2126 * f(r) + .7152 * f(g) + .0722 * f(b);
  }
  function contrast(a, b){ const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  // لون النص المناسب فوق لون معيّن (أبيض أو غامق)
  const onColor = (h) => contrast(h, '#FFFFFF') >= contrast(h, '#0F172A') ? '#FFFFFF' : '#0F172A';
  const rgba = (h, a) => { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; };
  // غمّق/فتّح اللون حتى ما يبقى مقروء على خلفية معيّنة
  function readableOn(color, bg, min){
    let [h, s, l] = hexToHsl(color); let c = color, i = 0;
    const darker = luminance(bg) > .4;
    while (contrast(c, bg) < min && i++ < 40) { l += darker ? -2 : 2; c = hsl(h, s, l); }
    return c;
  }
  ST.color = { isHex, hexToHsl, hsl, contrast, onColor, luminance };


  /* =====================================================================
     02. توليد ألوان الثيم من اللون الرئيسي
     ---------------------------------------------------------------------
     بيرجّع { light:{...}, dark:{...}, hero:{light, dark} } بأسماء متغيرات shell.css
     الأدمن يقدر يثبّت أي لون (الأزرار / الخلفية / البطاقات / النص) والباقي بيتولد.
     ===================================================================== */
  ST.buildPalette = function(theme){
    const t = Object.assign({}, ST.THEME_DEFAULTS, theme || {});
    const P = isHex(t.primary) ? t.primary : ST.THEME_DEFAULTS.primary;
    const [h, s, l] = hexToHsl(P);
    const sat = (k, max) => Math.min(s * k, max);   // تشبّع هادي مشتق من اللون الرئيسي

    // ---- الوضع النهاري ----
    const Lbg = isHex(t.bg) ? t.bg : hsl(h, sat(.28, 28), 96);
    const Lsurface = isHex(t.surface) ? t.surface : '#FFFFFF';
    const Ltext = isHex(t.text) ? t.text : hsl(h, sat(.35, 32), 11);
    const Link = isHex(t.ink) ? t.ink : hsl(h, sat(.45, 45), 16);
    const light = {
      '--gs-bg': Lbg, '--gs-surface': Lsurface,
      '--gs-surface-2': hsl(h, sat(.3, 30), 98.5), '--gs-surface-3': hsl(h, sat(.25, 24), 93.5),
      '--gs-border': hsl(h, sat(.2, 20), 88.5),
      '--gs-text': Ltext, '--gs-muted': hsl(h, sat(.14, 14), 42), '--gs-faint': hsl(h, sat(.12, 12), 62),
      '--gs-brand': P, '--gs-brand-strong': readableOn(hsl(h, s, clamp(l - 12, 18, 48)), Lsurface, 3.2),
      '--gs-brand-tint': rgba(P, .15),
      '--gs-ink': Link, '--gs-on-ink': onColor(Link),
      '--gs-info-tint': hsl(h, sat(.3, 30), 95),
      '--gs-bg-glass': rgba(Lbg, .82), '--gs-surface-glass': rgba(Lsurface, .92),
      '--gs-on-brand': onColor(P)
    };

    // ---- الوضع الليلي (بيتولد دايمًا تلقائيًا عشان النص يفضل مقروء) ----
    const Dbrand = l < 52 ? hsl(h, Math.max(s, 55), 60) : P;
    const Dbg = hsl(h, sat(.35, 28), 5.5), Dsurface = hsl(h, sat(.3, 24), 9.5);
    const dark = {
      '--gs-bg': Dbg, '--gs-surface': Dsurface,
      '--gs-surface-2': hsl(h, sat(.28, 22), 12.5), '--gs-surface-3': hsl(h, sat(.25, 20), 15.5),
      '--gs-border': hsl(h, sat(.22, 18), 20),
      '--gs-text': hsl(h, sat(.2, 18), 95), '--gs-muted': hsl(h, sat(.12, 12), 66), '--gs-faint': hsl(h, sat(.1, 10), 46),
      '--gs-brand': Dbrand, '--gs-brand-strong': hsl(hexToHsl(Dbrand)[0], hexToHsl(Dbrand)[1], Math.min(hexToHsl(Dbrand)[2] + 10, 80)),
      '--gs-brand-tint': rgba(Dbrand, .17),
      '--gs-ink': Dbrand, '--gs-on-ink': onColor(Dbrand),
      '--gs-info-tint': hsl(h, sat(.28, 22), 12.5),
      '--gs-bg-glass': rgba(Dbg, .82), '--gs-surface-glass': rgba(Dsurface, .92),
      '--gs-on-brand': onColor(Dbrand)
    };

    // ---- بطاقة قيمة المحفظة في الرئيسية ----
    const hero = {
      dark:  `radial-gradient(120% 140% at 100% 0%, ${hsl(h, sat(.5, 40), 17)} 0%, ${hsl(h, sat(.4, 30), 9)} 50%, ${hsl(h, sat(.3, 20), 6)} 100%)`,
      glow:  rgba(Dbrand, .28)
    };
    return { light, dark, hero, theme: t };
  };


  /* =====================================================================
     03. تطبيق الثيم
     ---------------------------------------------------------------------
     بيكتب <style id="gsStudioTheme"> في آخر <head> عشان يغلب تنسيقات shell.css
     وتنسيق الموقع القديم (siteThemeOverride). المحددات هنا بنفس قوة المحددات القديمة أو أقوى.
     ===================================================================== */
  const LIGHT = 'html:not([data-theme="dark"]) body.g-shell';
  const DARK = 'html[data-theme="dark"] body.g-shell';
  const APP = 'body.g-shell:not(.gs-no-shell)';

  const loadedFonts = new Set();
  function loadFont(name){
    const f = ST.FONTS.find(x => x.name === name);
    if (!f || !f.google || loadedFonts.has(name)) return;
    loadedFonts.add(name);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`;
    document.head.appendChild(link);
  }

  // style مخصص بيتنقل دايمًا لآخر head (عشان يكسب أي تنسيق اتضاف بعده)
  function styleTag(id){
    let tag = document.getElementById(id);
    if (!tag) { tag = document.createElement('style'); tag.id = id; }
    document.head.appendChild(tag);
    return tag;
  }

  ST.themeCss = function(theme){
    if (!theme) return '';
    const { light, dark, hero, theme: t } = ST.buildPalette(theme);
    const preset = ST.PRESETS.find(p => p.id === t.preset);
    // الثيم الأصلي من غير أي تعديل ألوان = منلمسش ألوان shell.css خالص
    const sameInk = !t.ink || (preset && t.ink.toUpperCase() === String(preset.ink).toUpperCase());
    const nativeColors = !!(preset && preset.native && t.primary.toUpperCase() === preset.primary.toUpperCase() && sameInk && !t.bg && !t.surface && !t.text);
    const vars = (obj) => Object.keys(obj).map(k => `${k}:${obj[k]};`).join('');
    let css = '';

    // ---- 1) الألوان ----
    if (!nativeColors) {
      css += `${LIGHT}{${vars(light)}--gold:${light['--gs-brand']};--gold-dark:${light['--gs-brand-strong']};}`;
      css += `${DARK}{${vars(dark)}--gold:${dark['--gs-brand']};--gold-dark:${dark['--gs-brand-strong']};}`;
      // الوضع النهاري: البطاقة فاتحة (من shell.css بمتغيرات الثيم) - بنلوّن الليلي بس هنا (الإصدار 75)
      css += `${DARK} .gs-hero{background:${hero.dark} !important;border-color:${dark['--gs-border']} !important;}`;
      css += `${DARK} .gs-hero::after{background:radial-gradient(circle, ${hero.glow}, transparent 70%);}`;
      css += `${APP} .gs-quick .ic.brand{color:var(--gs-on-brand) !important;}`;
      css += `${APP} .gs-switch input:checked + span{background:var(--gs-brand);border-color:var(--gs-brand);}`;
      // شاشات الترحيب والدخول
      css += `body.g-shell .gl-input:focus-within{border-color:var(--gs-brand);box-shadow:0 0 0 4px var(--gs-brand-tint);}`;
      css += `body.g-shell .gl-check input{accent-color:var(--gs-brand);}`;
    }

    // ---- 2) شكل الأزرار ----
    if (t.buttons === 'soft') {
      css += `${APP} button{background:var(--gs-brand-tint);color:var(--gs-brand-strong);border-color:transparent;}`;
      css += `${APP} button:hover{background:var(--gs-brand-tint);filter:brightness(.97);}`;
      css += `${DARK} button{color:var(--gs-brand);}`;
    } else if (t.buttons === 'outline') {
      css += `${APP} button{background:transparent;color:var(--gs-text);border:1.5px solid var(--gs-ink);}`;
      css += `${APP} button:hover{background:var(--gs-brand-tint);filter:none;}`;
    }

    // ---- 3) الخط ----
    if (t.font) {
      loadFont(t.font);
      const fam = `'${t.font}','IBM Plex Sans Arabic',Tahoma,sans-serif`;
      css += `body.g-shell{--font:${fam};--font-head:${fam};--font-num:${fam};}`;
      css += `body.g-shell, body.g-shell input, body.g-shell select, body.g-shell textarea, body.g-shell button, body.g-shell h1, body.g-shell h2, body.g-shell h3, body.g-shell h4{font-family:${fam} !important;}`;
    }

    // ---- 4) حجم الخط (تكبير/تصغير محتوى الشاشات كله بنسبة) ----
    const scale = clamp(parseInt(t.scale, 10) || 100, 80, 130);
    if (scale !== 100) css += `${APP} #app{zoom:${scale / 100};}`;

    // ---- 5) استدارة الحواف ----
    const r = clamp(parseInt(t.radius, 10), 0, 32);
    if (!isNaN(r) && r !== 18) {
      css += `body.g-shell{--gs-radius:${r}px;--gs-radius-sm:${Math.round(r * .66)}px;--radius:${r}px;--radius-sm:${Math.round(r * .66)}px;}`;
      css += `${APP} button:not(.small):not(.gs-avatar):not(.gs-eye){border-radius:${Math.round(r * .75)}px;}`;
      css += `${APP} .gs-hero{border-radius:${r + 6}px;}`;
      css += `${APP} .gs-quick .ic{border-radius:${Math.round(r * .9)}px;}`;
    }

    // ---- 6) الجداول (سطر واحد افتراضيًا - من shell.css) ----
    if (t.tableNowrap === false) css += `${APP} #app th, ${APP} #app td{white-space:normal !important;}`;
    return css;
  };

  ST.applyTheme = function(theme){
    styleTag('gsStudioTheme').textContent = ST.themeCss(theme);
  };


  /* =====================================================================
     04. تعديلات الشاشات: التنسيق
     ---------------------------------------------------------------------
     كل تعديل = { screen, sel, css:{خاصية:قيمة} }
       screen = اسم دالة الشاشة (renderPortfolio ...) أو * لكل الشاشات
       sel    = محدد CSS للعنصر (بيتولّد تلقائيًا من شاشة التعديل)
     الشاشة الحالية مكتوبة على body كـ data-gs-screen (من shell.js)
     ===================================================================== */
  const SAFE_SEL = /^[A-Za-z0-9_\-#.:() >\[\]="]{1,400}$/;
  const SAFE_VAL = /^[#A-Za-z0-9 .,%()'"\-]{1,80}$/;
  ST.safeSelector = (s) => SAFE_SEL.test(String(s || '').trim());
  ST.safeValue = (p, v) => {
    v = String(v == null ? '' : v).trim();
    if (!v || /url\s*\(|expression|javascript/i.test(v) || !SAFE_VAL.test(v)) return false;
    if (ST.LAYOUT_VALUES[p]) return ST.LAYOUT_VALUES[p].includes(v);
    if (p === 'grid-template-columns') return /^repeat\([1-6], ?(1fr|max-content|auto)\)$/.test(v);
    if (p === 'width') return /^(\d{1,4}px|\d{1,3}%|auto)$/.test(v);
    if (p === 'min-height' || p === 'gap') return /^\d{1,4}px$/.test(v);
    return true;
  };

  /* الإصدار 114: محدد CSS ثابت للعنصر - نفس العنصر عند كل المستخدمين (الأدمن والعميل والقديم والجديد)
     - أقرب عنصر ليه id فريد ← #id
     - عنصر ليه اسم ثابت (data-gs-key: عناصر القائمة الجانبية / التبويبات) ← .gs-sidebar [data-gs-key="..."]
       (قبل كده كان بالترتيب: عناصر القائمة عند الأدمن أكتر من العميل فالترتيب بيختلف والتعديل مكانش بيوصل)
     - غير كده بترتيب العناصر جوه الأب */
  const KEY_RE = /^[A-Za-z0-9_\-]{1,60}$/;
  ST.KEY_RE = KEY_RE;
  ST.cssPath = function(el){
    const parts = [];
    let cur = el, prefix = '';
    while (cur && cur !== document.body && cur !== document.documentElement) {
      if (cur.id && /^[A-Za-z][A-Za-z0-9_-]*$/.test(cur.id) && document.querySelectorAll('#' + cur.id).length === 1) { parts.unshift('#' + cur.id); break; }
      const anchor = ['gs-sidebar', 'gs-appbar', 'gs-tabbar'].find(c => cur.classList && cur.classList.contains(c));
      if (anchor) { parts.unshift('.' + anchor); break; }
      const k = cur.getAttribute && cur.getAttribute('data-gs-key');
      if (k && KEY_RE.test(k)) {
        const anc = cur.closest('.gs-sidebar, .gs-appbar, .gs-tabbar');
        if (anc) { parts.unshift(`[data-gs-key="${k}"]`); prefix = '.' + ['gs-sidebar', 'gs-appbar', 'gs-tabbar'].find(c => anc.classList.contains(c)) + ' '; break; }
        if (document.querySelectorAll(`[data-gs-key="${k}"]`).length === 1) { parts.unshift(`[data-gs-key="${k}"]`); break; }
      }
      const parent = cur.parentElement;
      if (!parent) break;
      parts.unshift(`${cur.tagName.toLowerCase()}:nth-child(${Array.prototype.indexOf.call(parent.children, cur) + 1})`);
      cur = parent;
      if (cur === document.body) parts.unshift('body');
    }
    const sel = prefix + parts.join(' > ');
    try { if (ST.safeSelector(sel) && document.querySelector(sel) === el) return sel; } catch(e){}
    return null;
  };

  ST.stylesCss = function(ovr){
    return ((ovr && ovr.styles) || []).map(r => {
      if (!ST.safeSelector(r.sel) || !r.css) return '';
      const scope = r.screen && r.screen !== '*' ? `body[data-gs-screen="${String(r.screen).replace(/[^A-Za-z0-9_]/g, '')}"] ` : '';
      const decl = Object.keys(r.css).filter(p => ST.CSS_PROPS.includes(p) && ST.safeValue(p, r.css[p]))
        .map(p => p === 'font-family' ? `font-family:'${r.css[p].replace(/'/g, '')}',Tahoma,sans-serif !important;` : `${p}:${r.css[p]} !important;`).join('');
      if (!decl) return '';
      // لو اتغيّر الخط بنحمّله
      if (r.css['font-family']) loadFont(r.css['font-family']);
      return `${scope}${r.sel}{${decl}}`;
    }).join('\n');
  };


  /* الإصدار 96: ترتيب العناصر داخل نفس المجموعة (نفس الأب) بـ CSS order
     - مبنحرّكش العناصر في الصفحة نفسها (عشان محددات التنسيق والنصوص تفضل شغالة) ← بنغيّر ترتيب ظهورها بس
     - mode: col = الأب بيتحوّل لعمود مرن ، row = صف مرن بيلف ، '' = الأب أصلًا flex/grid
     - أي عنصر مش في الترتيب المحفوظ (زي عنصر جديد) بيظهر في الآخر */
  ST.ordersCss = function(ovr){
    return ((ovr && ovr.orders) || []).map(r => {
      if (!ST.safeSelector(r.psel) || !Array.isArray(r.seq) || r.seq.length < 2) return '';
      const scope = r.screen && r.screen !== '*' ? `body[data-gs-screen="${String(r.screen).replace(/[^A-Za-z0-9_]/g, '')}"] ` : '';
      const P = scope + r.psel;
      let css = r.mode === 'col' ? `${P}{display:flex !important;flex-direction:column !important;}`
              : r.mode === 'row' ? `${P}{display:flex !important;flex-direction:row !important;flex-wrap:wrap !important;align-items:center !important;column-gap:6px;}` : '';
      css += `${P} > *{order:1000;}`;
      if (Array.isArray(r.keys) && r.keys.length >= 2) r.keys.forEach((k, i) => { if (KEY_RE.test(k)) css += `${P} > [data-gs-key="${k}"]{order:${i + 1} !important;}`; });   // الإصدار 114: بالأسماء الثابتة
      else r.seq.forEach((n, i) => { n = parseInt(n, 10); if (n >= 1 && n <= 200) css += `${P} > :nth-child(${n}){order:${i + 1} !important;}`; });
      return css;
    }).join('\n');
  };


  /* =====================================================================
     05. تعديلات الشاشات: النصوص
     ---------------------------------------------------------------------
     نوعين:
       texts   = قاموس: { screen, from, to } ← أي نص بالظبط = from بيتغيّر لـ to
                 (في شاشة معيّنة، أو * في كل الموقع) - بيشمل العناوين / الأزرار / أسماء الأعمدة /
                 اختيارات القوائم المنسدلة / القائمة الجانبية / التبويبات / placeholder
       elTexts = { screen, sel, text } ← نص عنصر واحد بعينه بس
     النص الأصلي بيتحفظ في الذاكرة (ORIG) عشان لو التعديل اتشال يرجع زي ما كان.
     ===================================================================== */
  const ORIG = new WeakMap();        // عقدة نص ← نصها الأصلي
  const ORIG_ATTR = new WeakMap();   // عنصر ← { placeholder: الأصلي }
  let touchedEls = new Set();        // عناصر اتغيّر نصها بـ elTexts (عشان نرجّعها لو التعديل اتشال)

  const currentScreen = () => document.body.getAttribute('data-gs-screen') || '';
  ST.originalText = (node) => ORIG.has(node) ? ORIG.get(node) : node.nodeValue;
  ST.originalAttr = (el, attr) => { const o = ORIG_ATTR.get(el); return o && attr in o ? o[attr] : el.getAttribute(attr); };

  // القاموس الفعّال للشاشة الحالية (تعديل الشاشة بيغلب تعديل كل الموقع)
  function dictionaryFor(screen){
    const map = new Map();
    const list = (ST.overrides && ST.overrides.texts) || [];
    list.forEach(r => { if (r.screen === '*') map.set(r.from.trim(), r.to); });
    list.forEach(r => { if (r.screen === screen) map.set(r.from.trim(), r.to); });
    return map;
  }

  /* الإصدار 79: النص المعدّل ممكن يبقى أكتر من سطر (Enter في شاشة التعديل)
     ← العنصر اللي فيه النص بياخد class gs-st-br (white-space:pre-line) عشان السطور تظهر تحت بعض */
  function markLineBreaks(node){
    const p = node.parentElement; if (!p) return;
    p.classList.toggle('gs-st-br', /\n/.test(node.nodeValue));
  }

  // عناصر مستثناة: شاشة التعديل نفسها + حقول الكتابة
  const SKIP = 'script,style,textarea,noscript,[data-gs-studio],[contenteditable="true"]';

  function applyTexts(){
    const dict = dictionaryFor(currentScreen());
    const hasRules = dict.size > 0;
    if (!hasRules && !ST._textsTouched) return;
    ST._textsTouched = ST._textsTouched || hasRules;

    // أ) عقد النصوص
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n){ const p = n.parentElement; return (!p || p.closest(SKIP)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    let n;
    while ((n = walker.nextNode())) {
      if (n.__gsEl) continue;                                 // متعدّل بـ elTexts - ليه الأولوية
      const orig = ST.originalText(n), key = orig.trim();
      if (!key) continue;
      const to = dict.get(key);
      if (to != null) {
        const next = orig.replace(key, to);
        if (n.nodeValue !== next) { if (!ORIG.has(n)) ORIG.set(n, orig); n.nodeValue = next; markLineBreaks(n); }
      } else if (ORIG.has(n) && n.nodeValue !== orig) {
        n.nodeValue = orig; markLineBreaks(n);                 // التعديل اتشال ← رجوع للأصل
      }
    }

    // ب) النص الإرشادي جوه الحقول (placeholder)
    document.querySelectorAll('[placeholder]').forEach(el => {
      if (el.closest('[data-gs-studio]')) return;
      const orig = ST.originalAttr(el, 'placeholder') || '', key = orig.trim();
      if (!key) return;
      const to = dict.get(key);
      const o = ORIG_ATTR.get(el) || {};
      if (to != null) { if (!('placeholder' in o)) { o.placeholder = orig; ORIG_ATTR.set(el, o); } el.setAttribute('placeholder', orig.replace(key, to)); }
      else if ('placeholder' in o) el.setAttribute('placeholder', o.placeholder);
    });
  }

  // أول عقدة نص فعلية جوه العنصر
  ST.firstTextNode = (el) => Array.from(el.childNodes).find(c => c.nodeType === 3 && c.nodeValue.trim());

  function applyElTexts(){
    const screen = currentScreen();
    const rules = ((ST.overrides && ST.overrides.elTexts) || []).filter(r => r.screen === '*' || r.screen === screen);
    const now = new Set();
    rules.forEach(r => {
      if (!ST.safeSelector(r.sel)) return;
      let el; try { el = document.querySelector(r.sel); } catch(e){ return; }
      if (!el || el.closest('[data-gs-studio]')) return;
      const tn = ST.firstTextNode(el);
      if (!tn) return;
      const orig = ST.originalText(tn);
      if (!ORIG.has(tn)) ORIG.set(tn, orig);
      const next = orig.replace(orig.trim(), r.text);
      if (tn.nodeValue !== next) { tn.nodeValue = next; markLineBreaks(tn); }
      tn.__gsEl = true;
      now.add(tn);
    });
    // عناصر كانت متعدّلة والتعديل اتشال
    touchedEls.forEach(tn => { if (!now.has(tn) && tn.isConnected) { tn.__gsEl = false; tn.nodeValue = ORIG.get(tn); markLineBreaks(tn); } });
    touchedEls = now;
  }

  /* الإصدار 114: تحويل تعديلات القائمة الجانبية / التبويبات القديمة (المحفوظة بالترتيب) للأسماء الثابتة
     - بيحصل مرة واحدة في متصفح الأدمن (نفس القائمة اللي التعديلات اتعملت عليها) وبيتحفظ على السيرفر ← يوصل لكل المستخدمين
     - العناصر اللي اتضافت بعد كده (data-gs-since) بتتشال مؤقتًا أثناء التحويل عشان الترتيب القديم يطابق */
  ST.migrateKeys = async function(){
    const O = ST.overrides;
    if (ST._migrating || ST._keysChecked || !ST.loaded || !O || O.keysV === 1 || !ST.canEdit() || !document.querySelector('.gs-sidebar [data-gs-key]')) return false;
    const CH = /^\.gs-(sidebar|appbar|tabbar)\b/;
    const legacy = (O.styles || []).concat(O.elTexts || []).some(r => CH.test(r.sel || '') && /nth-child/.test(r.sel)) || (O.orders || []).some(r => CH.test(r.psel || '') && !r.keys);
    ST._migrating = true;
    const held = [];
    try {
      if (legacy) {
        document.querySelectorAll('.gs-sidebar [data-gs-since], .gs-tabbar [data-gs-since]').forEach(el => { const pv = el.previousElementSibling; held.push([el, el.parentNode, el.nextSibling, pv && pv.getAttribute('data-gs-key')]); el.remove(); });
        const fix = (sel) => { if (!CH.test(sel || '') || !/nth-child/.test(sel)) return sel; let el = null; try { el = document.querySelector(sel); } catch(e){} if (!el) return sel; return ST.cssPath(el) || sel; };
        (O.styles || []).forEach(r => { r.sel = fix(r.sel); });
        (O.elTexts || []).forEach(r => { r.sel = fix(r.sel); });
        (O.orders || []).forEach(r => {
          if (!CH.test(r.psel || '') || r.keys) return;
          let p = null; try { p = document.querySelector(r.psel); } catch(e){} if (!p) return;
          const kids = Array.from(p.children);
          if (!kids.every(c => KEY_RE.test(c.getAttribute('data-gs-key') || ''))) return;
          r.keys = r.seq.map(n => kids[n - 1] && kids[n - 1].getAttribute('data-gs-key')).filter(Boolean);
          // العناصر الجديدة (اللي اتشالت مؤقتًا) بتاخد مكانها الطبيعي بعد العنصر اللي قبلها
          held.forEach(([el, par, nx, pvKey]) => { if (par !== p) return; const k = el.getAttribute('data-gs-key'), at = r.keys.indexOf(pvKey); if (k && !r.keys.includes(k)) r.keys.splice(at >= 0 ? at + 1 : r.keys.length, 0, k); });
          r.psel = ST.cssPath(p) || r.psel;
        });
      }
    } finally { held.reverse().forEach(([el, par, nx]) => { if (par) par.insertBefore(el, nx && nx.parentNode === par ? nx : null); }); }
    ST._keysChecked = true;
    if (legacy) {
      O.keysV = 1;
      try { await ST.save('overrides', O); if (window.GShell) GShell.toast('تم تعميم تعديلات استوديو التصميم على كل المستخدمين ✅', 'ok'); }
      catch(e){ O.keysV = 0; ST._keysChecked = false; }
    }
    ST._migrating = false;
    ST.apply();
    return true;
  };

  // تطبيق كل تعديلات الشاشات (بيتنادى من shell.js بعد رسم أي شاشة)
  ST.apply = function(){
    if (!ST._migrating && !ST._keysChecked && ST.loaded && ST.overrides && ST.overrides.keysV !== 1 && window.__isAdmin) setTimeout(() => { ST.migrateKeys(); }, 0);
    try {
      // .gs-st-br = نص فيه أكتر من سطر (بيغلب "الجداول في سطر واحد" كمان)
      styleTag('gsStudioRules').textContent = '.gs-st-br{white-space:pre-line !important;}\n' + ST.ordersCss(ST.overrides) + '\n' + ST.stylesCss(ST.overrides);   // الإصدار 107: التنسيق بعد الترتيب ← ترتيب الصندوق (عمودين / وسط ...) بيغلب
      applyElTexts();
      applyTexts();
    } catch(e){ console.warn('studio apply:', e); }
  };


  /* =====================================================================
     06. التحميل من السيرفر والحفظ
     ===================================================================== */
  function readCache(){ try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch(e){ return null; } }
  function writeCache(){ try { localStorage.setItem(CACHE_KEY, JSON.stringify({ theme: ST.theme, overrides: ST.overrides })); } catch(e){} }
  const emptyOverrides = () => ({ v:1, texts:[], elTexts:[], styles:[], orders:[] });
  const normalizeOverrides = (o) => Object.assign(emptyOverrides(), o || {});

  ST.load = async function(){
    try {
      const res = await fetch('ui_custom_get.php', { credentials:'same-origin', cache:'no-store' });
      const r = await res.json();
      if (!r || !r.success) return;
      ST.theme = r.theme || null;
      ST.overrides = normalizeOverrides(r.overrides);
      ST.loaded = true;
      writeCache();
      ST.applyTheme(ST.theme);
      ST.apply();
    } catch(e){ /* السيرفر مش متاح - بنفضل على النسخة المحلية */ }
  };

  // حفظ (للأدمن) - key = theme | overrides ، value = null لمسح التخصيص
  ST.save = async function(key, value){
    if (typeof apiPost !== 'function') throw new Error('الموقع ما زال يُحمَّل');
    const r = await apiPost('/ui_custom_save.php', { key, value: JSON.stringify(value) });
    if (!r || !r.success) throw new Error((r && r.message) || 'تعذّر الحفظ');
    if (key === 'theme') ST.theme = r.value || null;
    else ST.overrides = normalizeOverrides(r.value);
    writeCache();
    return r.value;
  };


  /* =====================================================================
     07. فتح شاشة التعديل (للأدمن بصلاحية "تنسيق الموقع" بس)
     ===================================================================== */
  ST.canEdit = () => !!window.__isAdmin && (typeof hasPermission !== 'function' || hasPermission('edit_site_design'));

  ST.openEditor = async function(){
    if (!ST.canEdit()) { if (window.GShell) GShell.toast('استوديو التصميم متاح لمدير الموقع فقط.', 'err'); return; }
    if (!window.GStudioEditor) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'studio-editor.js?v=115'; s.onload = res; s.onerror = () => rej(new Error('تعذّر تحميل استوديو التصميم'));
        document.head.appendChild(s);
      }).catch(e => { if (window.GShell) GShell.toast(e.message, 'err'); });
    }
    if (window.GStudioEditor) window.GStudioEditor.open();
  };


  /* =====================================================================
     08. التشغيل: النسخة المحلية فورًا ← وبعدين أحدث نسخة من السيرفر
     ===================================================================== */
  const cached = readCache();
  if (cached) {
    ST.theme = cached.theme || null;
    ST.overrides = normalizeOverrides(cached.overrides);
    ST.applyTheme(ST.theme);
  }
  ST.load();
})();
