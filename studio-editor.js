/* =====================================================================
   GRIFFINE Studio Editor — شاشة التعديل الحية (الإصدار 72) — للأدمن بس
   ---------------------------------------------------------------------
   بتتحمّل بس لما الأدمن يدوس "استوديو التصميم" في لوحة التحكم (studio.js → openEditor).
   طريقة الشغل:
     1) شريط أدوات تحت: اختيار الشاشة / تحديد عنصر / الثيمات / كل التعديلات / حفظ / خروج
     2) الشاشة المختارة بتظهر حية وتفاعلية زي ما العميل شايفها بالظبط
     3) "تحديد عنصر" ← اضغط على أي حاجة في الشاشة (أو القائمة الجانبية) ← لوح التعديل بيفتح:
          النص / الخط / الحجم / السماكة / اللون / الخلفية / المحاذاة / الحواف / إخفاء
     4) كل تعديل بيظهر فورًا (معاينة) - ومبيتحفظش لكل الزوار غير لما تدوس "حفظ"

   ---------------------------------------------------------------------
   فهرس الأقسام:
     00. الحالة العامة + أدوات مساعدة
     01. التعرف على العنصر (وصفه بالعربي + محدد CSS ثابت له)
     02. تعديل المسودة (نصوص / تنسيق) + المعاينة
     03. بناء الواجهة (شريط الأدوات / اللوح / إطارات التحديد)
     04. وضع التحديد (الضغط على أي عنصر)
     05. لوح العنصر المحدد
     06. لوح الثيمات
     07. لوح كل التعديلات
     08. الحفظ والخروج
     09. الفتح
   ===================================================================== */
(function(){
  'use strict';

  const ST = window.GStudio, GS = window.GShell;
  const E = window.GStudioEditor = {};


  /* =====================================================================
     00. الحالة العامة + أدوات مساعدة
     ===================================================================== */
  const state = {
    isOpen: false,
    picking: false,       // وضع التحديد شغال؟
    el: null,             // العنصر المحدد
    panel: 'welcome',     // welcome | element | themes | list
    draft: null,          // مسودة تعديلات الشاشات
    themeDraft: null,     // مسودة الثيم
    savedO: null,         // آخر نسخة محفوظة (للرجوع لو خرجنا من غير حفظ)
    savedT: null,
    dirtyO: false,
    dirtyT: false,
    catalog: [],          // قائمة الشاشات
    place: null,          // مكان التعديل: اسم الشاشة أو *
    textMode: 'el'        // el = هذا العنصر فقط | word = نفس الكلمة في كل مكان
  };

  const esc = GS.esc;
  const icon = GS.icon;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const clone = (o) => JSON.parse(JSON.stringify(o == null ? null : o));
  const screenNow = () => document.body.getAttribute('data-gs-screen') || '';
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  // لون محسوب من المتصفح (rgb/rgba) → #RRGGBB (عشان خانة اختيار اللون)
  function toHex(c){
    const m = String(c || '').match(/rgba?\(([^)]+)\)/);
    if (!m) return /^#[0-9a-f]{6}$/i.test(c) ? c : '#000000';
    const [r, g, b] = m[1].split(',').map(x => parseFloat(x));
    return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  // اسم الشاشة بالعربي
  function screenLabel(name){
    if (!name || name === '*') return 'كل الشاشات';
    const it = state.catalog.find(x => x.fnName.replace(/^GS:/, '') === name);
    return it ? it.label : name;
  }


  /* =====================================================================
     01. التعرف على العنصر
     ===================================================================== */
  const CHROME_SEL = '.gs-sidebar, .gs-appbar, .gs-tabbar';
  const isChrome = (el) => !!(el && el.closest(CHROME_SEL));

  // وصف العنصر بالعربي
  function describe(el){
    const tag = el.tagName.toLowerCase();
    const kind = {
      h1:'عنوان رئيسي', h2:'عنوان', h3:'عنوان فرعي', h4:'عنوان فرعي', button:'زرار', a:'رابط', th:'اسم عمود',
      td:'خانة في جدول', select:'قائمة منسدلة', option:'اختيار في قائمة', input:'حقل إدخال', textarea:'مربع كتابة',
      label:'عنوان حقل', img:'صورة', p:'فقرة', small:'نص صغير', b:'نص عريض', strong:'نص عريض', li:'عنصر في قائمة',
      span:'نص', div:'مربع', svg:'أيقونة', table:'جدول', tr:'صف في جدول', nav:'شريط تنقل', aside:'القائمة الجانبية', header:'الشريط العلوي'
    }[tag] || 'عنصر';
    const tn = ST.firstTextNode(el);
    const txt = (tn ? tn.nodeValue : (el.getAttribute('placeholder') || el.textContent || '')).trim().replace(/\s+/g, ' ');
    return { kind, txt: txt.slice(0, 40) + (txt.length > 40 ? '…' : '') };
  }

  // محدد CSS ثابت للعنصر (الإصدار 114: الأسماء الثابتة data-gs-key ← نفس العنصر عند كل المستخدمين) - في studio.js
  function cssPath(el){ return ST.cssPath(el); }


  /* =====================================================================
     02. تعديل المسودة + المعاينة
     ===================================================================== */
  function preview(){
    ST.overrides = state.draft;
    ST.apply();
    ST.applyTheme(state.themeDraft);
    updateCounters();
  }
  const markO = () => { state.dirtyO = true; preview(); };
  const markT = () => { state.dirtyT = true; preview(); };

  // قاموس الكلمات: from → to في مكان معيّن
  function setWord(place, from, to){
    from = String(from || '').trim(); if (!from) return;
    const list = state.draft.texts;
    const i = list.findIndex(r => r.screen === place && r.from === from);
    if (to == null || to.trim() === from) { if (i >= 0) list.splice(i, 1); }
    else if (i >= 0) list[i].to = to;
    else list.push({ screen: place, from, to });
  }

  // نص عنصر واحد بعينه
  function setElText(place, sel, text, original){
    const list = state.draft.elTexts;
    const i = list.findIndex(r => r.screen === place && r.sel === sel);
    if (text == null || text.trim() === String(original || '').trim()) { if (i >= 0) list.splice(i, 1); }
    else if (i >= 0) list[i].text = text;
    else list.push({ screen: place, sel, text });
  }

  // تنسيق عنصر: خاصية واحدة (قيمة فاضية = شيل الخاصية)
  function setStyle(place, sel, prop, value, label){
    const list = state.draft.styles;
    let r = list.find(x => x.screen === place && x.sel === sel);
    if (!r) { r = { screen: place, sel, css: {}, label: label || '' }; list.push(r); }
    if (value === '' || value == null) delete r.css[prop];
    else if (ST.safeValue(prop, value)) r.css[prop] = String(value);
    if (!Object.keys(r.css).length) list.splice(list.indexOf(r), 1);
  }

  // كل تعديلات عنصر (في المكانين: الشاشة دي + كل الشاشات)
  function rulesFor(sel){
    const places = [screenNow(), '*'];
    return {
      styles: state.draft.styles.filter(r => r.sel === sel && places.includes(r.screen)),
      elTexts: state.draft.elTexts.filter(r => r.sel === sel && places.includes(r.screen))
    };
  }
  function styleOf(sel, place, prop){
    const r = state.draft.styles.find(x => x.sel === sel && x.screen === place);
    return r && r.css[prop] != null ? r.css[prop] : '';
  }

  /* الإصدار 96: ترتيب العناصر داخل نفس المجموعة (نفس الأب)
     بيرجّع { p, psel, n, seq, mode, rule } أو null لو المجموعة مينفعش تترتب (جداول / قوائم منسدلة / أب متغيّر) */
  function groupOf(el, place){
    const p = el && el.parentElement;
    if (!p || p === document.body || p === document.documentElement || inStudio(p)) return null;
    if (/^(TABLE|TBODY|THEAD|TFOOT|TR|SELECT|OPTGROUP|COLGROUP|DATALIST)$/.test(p.tagName) || /^(TD|TH|OPTION)$/.test(el.tagName)) return null;
    const psel = cssPath(p); if (!psel) return null;
    const n = p.children.length; if (n < 2 || n > 60) return null;
    const rule = state.draft.orders.find(r => r.screen === place && r.psel === psel);
    // الإصدار 114: لو كل العناصر ليها أسماء ثابتة ← الترتيب بيتحفظ بالأسماء (نفس الترتيب عند كل المستخدمين)
    const kids = Array.from(p.children), keysNow = kids.every(c => ST.KEY_RE.test(c.getAttribute('data-gs-key') || '')) ? kids.map(c => c.getAttribute('data-gs-key')) : null;
    let seq = rule ? (rule.keys && keysNow ? rule.keys.map(k => keysNow.indexOf(k) + 1).filter(k => k >= 1) : rule.seq.filter(k => k >= 1 && k <= n)) : [];
    for (let k = 1; k <= n; k++) if (!seq.includes(k)) seq.push(k);
    let mode = rule ? rule.mode : '';
    if (!rule) {
      const d = getComputedStyle(p).display;
      if (!/flex|grid/.test(d)) {
        const blocky = Array.from(p.children).every(c => { const cd = getComputedStyle(c).display; return cd === 'none' || /^(block|flex|grid|table|list-item|flow-root)$/.test(cd); });
        mode = blocky ? 'col' : 'row';
      }
    }
    return { p, psel, n, seq, mode, rule, keys: keysNow };
  }
  function setOrder(place, g, seq, label){
    const list = state.draft.orders;
    const i = list.findIndex(r => r.screen === place && r.psel === g.psel);
    const identity = seq.every((k, j) => k === j + 1);
    if (identity) { if (i >= 0) list.splice(i, 1); return; }
    const r = { screen: place, psel: g.psel, seq: seq.slice(), mode: g.mode, label: label || '' };
    if (g.keys) r.keys = seq.map(k => g.keys[k - 1]).filter(Boolean);   // الإصدار 114
    if (i >= 0) list[i] = r; else list.push(r);
  }


  /* =====================================================================
     03. بناء الواجهة
     ===================================================================== */
  let ui = null;
  function buildUi(){
    if (!document.getElementById('gsStudioCss')) {
      const l = document.createElement('link');
      l.id = 'gsStudioCss'; l.rel = 'stylesheet'; l.href = 'studio.css?v=133';
      document.head.appendChild(l);
    }
    const root = document.createElement('div');
    root.id = 'gsStudio'; root.setAttribute('data-gs-studio', '1'); root.setAttribute('data-html2canvas-ignore', 'true');
    root.innerHTML = `
      <div class="gst-hover" id="gstHover"></div>
      <div class="gst-selbox" id="gstSel"></div>
      <aside class="gst-panel" id="gstPanel" aria-label="لوح التعديل">
        <div class="gst-panel-head"><b id="gstPanelTitle">استوديو التصميم</b>
          <button type="button" class="gst-ic" id="gstCollapse" aria-label="تصغير">${icon('chev')}</button></div>
        <div class="gst-panel-body" id="gstBody"></div>
      </aside>
      <div class="gst-bar" role="toolbar" aria-label="أدوات استوديو التصميم">
        <span class="gst-brand">${icon('brush')}<span>استوديو التصميم</span></span>
        <select id="gstScreen" aria-label="اختيار الشاشة"><option>جاري تحميل الشاشات...</option></select>
        <button type="button" id="gstPick" class="gst-btn">${icon('target')}<span>تحديد عنصر</span></button>
        <button type="button" id="gstThemes" class="gst-btn">${icon('grid')}<span>الثيمات</span></button>
        <button type="button" id="gstList" class="gst-btn">${icon('report')}<span>التعديلات <i id="gstCount">0</i></span></button>
        <button type="button" id="gstMode" class="gst-btn" title="معاينة الوضع الليلي/النهاري">${icon('moon')}</button>
        <span class="gst-spacer"></span>
        <button type="button" id="gstSave" class="gst-btn gst-primary">${icon('check')}<span>حفظ</span></button>
        <button type="button" id="gstExit" class="gst-btn">${icon('x')}<span>خروج</span></button>
      </div>`;
    document.body.appendChild(root);
    document.body.classList.add('gs-studio-on');
    ui = root;

    $('#gstPick').onclick = () => setPicking(!state.picking);
    $('#gstThemes').onclick = () => showPanel('themes');
    $('#gstList').onclick = () => showPanel('list');
    $('#gstMode').onclick = () => GS.toggleTheme();
    $('#gstSave').onclick = save;
    $('#gstExit').onclick = exit;
    $('#gstCollapse').onclick = () => $('#gstPanel').classList.toggle('collapsed');
    $('#gstScreen').onchange = openScreenFromPicker;
    fillScreenPicker();
  }

  // قائمة الشاشات (مجمّعة بالأقسام)
  async function fillScreenPicker(){
    try { state.catalog = await GS.getScreenCatalog(); } catch(e){ state.catalog = []; }
    const sel = $('#gstScreen'); if (!sel) return;
    const groups = {};
    state.catalog.forEach((it, i) => { (groups[it.section] = groups[it.section] || []).push(`<option value="${i}">${esc(it.label)}</option>`); });
    sel.innerHTML = `<option value="">— اختر الشاشة التي تريد تعديلها —</option>` +
      Object.keys(groups).map(g => `<optgroup label="${esc(g)}">${groups[g].join('')}</optgroup>`).join('');
    syncScreenPicker();
  }
  function syncScreenPicker(){
    const sel = $('#gstScreen'); if (!sel) return;
    const i = state.catalog.findIndex(x => x.fnName.replace(/^GS:/, '') === screenNow());
    sel.value = i >= 0 ? String(i) : '';
  }
  async function openScreenFromPicker(){
    const it = state.catalog[+$('#gstScreen').value];
    if (!it) return;
    select(null);
    try { await (it.arg !== undefined ? it.fn(it.arg) : it.fn()); } catch(e){}
  }

  function updateCounters(){
    const d = state.draft || {};
    const n = (d.texts || []).length + (d.elTexts || []).length + (d.styles || []).length + (d.orders || []).length;
    const c = $('#gstCount'); if (c) c.textContent = n;
    const s = $('#gstSave'); if (s) s.classList.toggle('pulse', state.dirtyO || state.dirtyT);
  }

  // إطار حوالين العنصر (بيتحدّث مع السكرول)
  function placeBox(box, el){
    if (!box) return;
    if (!el || !el.isConnected) { box.style.display = 'none'; return; }
    const r = el.getBoundingClientRect();
    box.style.display = 'block';
    box.style.top = r.top + 'px'; box.style.left = r.left + 'px';
    box.style.width = r.width + 'px'; box.style.height = r.height + 'px';
  }
  let rafId = 0;
  function loop(){
    if (!state.isOpen) return;
    if (state.el && !state.el.isConnected) select(null);        // الشاشة اتغيّرت
    placeBox($('#gstSel'), state.el);
    rafId = requestAnimationFrame(loop);
  }


  /* =====================================================================
     04. وضع التحديد
     ---------------------------------------------------------------------
     وهو شغال: أي ضغطة على الشاشة بتحدد العنصر بدل ما تنفّذه (زرار / رابط / قائمة).
     وهو واقف: الشاشة بتشتغل عادي (تقدر تفتح قوائم وتتنقل وتشوف الشكل الحقيقي).
     ===================================================================== */
  function setPicking(on){
    state.picking = on;
    document.body.classList.toggle('gs-studio-picking', on);
    const b = $('#gstPick'); if (b) b.classList.toggle('on', on);
    if (!on) placeBox($('#gstHover'), null);
    if (on && state.panel === 'welcome') renderWelcome();
  }

  const inStudio = (t) => t && t.closest && t.closest('[data-gs-studio]');
  function targetOf(e){
    let t = e.target;
    if (t && t.nodeType === 3) t = t.parentElement;
    if (t && t.closest && t.closest('svg')) t = t.closest('svg').parentElement;   // الأيقونة ← العنصر اللي فيها
    return t;
  }
  function blockEvent(e){
    if (!state.picking || inStudio(e.target)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (e.type === 'click') { const t = targetOf(e); if (t && t !== document.body && t !== document.documentElement) select(t); }
  }
  function onHover(e){
    if (!state.picking || inStudio(e.target)) { placeBox($('#gstHover'), null); return; }
    placeBox($('#gstHover'), targetOf(e));
  }
  function onKey(e){
    if (e.key !== 'Escape' || !state.isOpen) return;
    if (state.el) select(null); else if (state.picking) setPicking(false);
  }
  const BLOCKED = ['pointerdown', 'mousedown', 'mouseup', 'click', 'dblclick', 'submit', 'contextmenu'];
  function listen(on){
    const f = on ? 'addEventListener' : 'removeEventListener';
    BLOCKED.forEach(t => window[f](t, blockEvent, true));
    window[f]('mousemove', onHover, true);
    window[f]('keydown', onKey, true);
  }


  /* =====================================================================
     05. لوح العنصر المحدد
     ===================================================================== */
  function select(el){
    state.el = el;
    if (!el) { placeBox($('#gstSel'), null); if (state.panel === 'element') renderWelcome(); return; }
    const chrome = isChrome(el);
    state.place = chrome ? '*' : screenNow();
    state.textMode = chrome ? 'word' : 'el';
    showPanel('element');
  }

  E.select = (el) => { if (state.isOpen) select(el); };   // تحديد عنصر برمجيًا (للاختبارات)

  function showPanel(name){
    state.panel = name;
    $('#gstPanel').classList.remove('collapsed');
    ['gstThemes', 'gstList'].forEach(id => { const b = $('#' + id); if (b) b.classList.toggle('on', (id === 'gstThemes' && name === 'themes') || (id === 'gstList' && name === 'list')); });
    if (name === 'element' && state.el) renderElement();
    else if (name === 'themes') renderThemes();
    else if (name === 'list') renderList();
    else renderWelcome();
  }
  function setBody(title, html){ $('#gstPanelTitle').textContent = title; $('#gstBody').innerHTML = html; }

  function renderWelcome(){
    state.panel = 'welcome';
    setBody('استوديو التصميم', `
      <div class="gst-steps">
        <p><b>1.</b> اختر الشاشة من القائمة أدناه (أو تنقّل في الموقع بشكل عادي).</p>
        <p><b>2.</b> اضغط <b>تحديد عنصر</b> ← ثم اضغط على أي كلمة أو زر أو عنوان أو اسم عمود أو عنصر في القائمة الجانبية.</p>
        <p><b>3.</b> عدّل النص أو الخط أو اللون أو الخلفية - يظهر التعديل أمامك فورًا.</p>
        <p><b>4.</b> من <b>الثيمات</b> اختار هوية جاهزة (ذهبي / أصفر / أخضر / أزرق ...) وعدّل ألوانها وخطها.</p>
        <p><b>5.</b> اضغط <b>حفظ</b> حتى تظهر التعديلات لكل الزوار.</p>
      </div>
      <div class="gst-note">وقّف "تحديد عنصر" إذا أردت التعامل مع الشاشة بشكل عادي (فتح قائمة منسدلة أو تبويب) ثم شغّله مرة أخرى.<br>زر Esc يلغي التحديد.</div>
      <div class="gst-note">شاشة الأدمن هذه تظهر لمدير الموقع فقط - المستخدم العادي لديه الوضع الليلي/النهاري فقط.</div>`);
  }

  function renderElement(){
    const el = state.el;
    const sel = cssPath(el);
    const d = describe(el);
    if (!sel) {
      setBody('العنصر المحدد', `<div class="gst-note">لا يمكن تحديد هذا العنصر بشكل ثابت (يتغيّر مع البيانات). جرّب الضغط على العنصر المحيط به.</div>
        <button type="button" class="gst-btn" id="gstParent">${icon('back')}<span>تحديد العنصر الأكبر</span></button>`);
      $('#gstParent').onclick = () => { if (el.parentElement && el.parentElement !== document.body) select(el.parentElement); };
      return;
    }
    const label = `${d.kind}${d.txt ? ': ' + d.txt : ''}`;
    // مكان التعديل ثابت للوح ده (لو اتحدد عنصر تاني، أي قيمة متأخرة من اللوح القديم بتتسجل في مكانها الصح)
    const place = state.place;
    const cs = getComputedStyle(el);
    const tn = ST.firstTextNode(el);
    const isSelect = el.tagName === 'SELECT';
    const hasPh = el.hasAttribute('placeholder');
    const sv = (p) => styleOf(sel, place, p);
    const fontOpts = `<option value="">— مثل الموقع —</option>` + ST.FONTS.map(f => `<option value="${esc(f.name)}" ${sv('font-family') === f.name ? 'selected' : ''}>${esc(f.label)}</option>`).join('');

    // ---- النص ----
    let textHtml = '';
    if (tn) {
      textHtml = `<div class="gst-sec"><div class="gst-sec-t">النص</div>
        <textarea id="gstText" rows="3">${esc(tn.nodeValue.trim())}</textarea>
        <div class="gst-row2" style="margin:6px 0 0;grid-template-columns:auto 1fr;align-items:center;">
          <button type="button" class="gst-btn" id="gstNewLine" title="انقل النص الذي بعد المؤشر إلى سطر جديد">↵ سطر جديد</button>
          <span class="gst-hint" style="margin:0;">أو اضغط Enter داخل الخانة في المكان الذي تريد التقسيم منه</span>
        </div>
        <div class="gst-radio">
          <label><input type="radio" name="gstTM" value="el" ${state.textMode === 'el' ? 'checked' : ''}> هذا العنصر فقط</label>
          <label><input type="radio" name="gstTM" value="word" ${state.textMode === 'word' ? 'checked' : ''}> نفس الكلمة في كل مكان</label>
        </div>
        <div class="gst-hint">الأصلي: «${esc(ST.originalText(tn).trim().slice(0, 80))}»</div></div>`;
    }
    if (hasPh) {
      textHtml += `<div class="gst-sec"><div class="gst-sec-t">النص الإرشادي داخل الحقل</div>
        <input type="text" id="gstPh" value="${esc(el.getAttribute('placeholder') || '')}"></div>`;
    }
    if (isSelect) {
      textHtml += `<div class="gst-sec"><div class="gst-sec-t">اختيارات القائمة المنسدلة</div>
        ${Array.from(el.options).map((o, i) => { const t = o.firstChild; return t ? `<input type="text" class="gst-opt" data-i="${i}" value="${esc(o.text)}">` : ''; }).join('')}</div>`;
    }

    // ---- الترتيب داخل المجموعة (الإصدار 96) ----
    const grp = groupOf(el, place);
    const myIdx = grp ? Array.prototype.indexOf.call(grp.p.children, el) + 1 : 0;
    let orderHtml = '';
    if (grp) {
      const rows = grp.seq.map(k => { const c = grp.p.children[k - 1], dd = describe(c), hidden = getComputedStyle(c).display === 'none';
        return `<div class="gst-ord ${k === myIdx ? 'on' : ''}" draggable="true" data-k="${k}"><span class="gst-ord-h" aria-hidden="true">⋮⋮</span><span class="gst-ord-t"><b>${esc(dd.kind)}</b> ${esc(dd.txt || '')}${hidden ? ' <small>(مخفي)</small>' : ''}</span>
          <button type="button" class="gst-ic" data-mv="-1" aria-label="لأعلى">▲</button><button type="button" class="gst-ic" data-mv="1" aria-label="لأسفل">▼</button></div>`; }).join('');
      orderHtml = `<div class="gst-sec"><div class="gst-sec-t">الترتيب داخل المجموعة</div>
        <div class="gst-row2"><button type="button" class="gst-btn" id="gstUp">▲<span>تحريك لأعلى</span></button><button type="button" class="gst-btn" id="gstDown">▼<span>تحريك لأسفل</span></button></div>
        <div class="gst-ordlist" id="gstOrdList">${rows}</div>
        <div class="gst-hint">اسحب أي عنصر أو استخدم الأسهم لتغيير مكانه بين عناصر نفس المجموعة.</div>
        ${grp.rule ? `<button type="button" class="gst-btn" id="gstOrdReset">${icon('refund')}<span>إرجاع ترتيب المجموعة</span></button>` : ''}</div>`;
    }

    // ---- الإصدار 107: ترتيب العناصر جوه الصندوق (يمين / وسط / شمال / عمودين ...) ----
    const kids = Array.from(el.children).filter(c => !inStudio(c));
    const box = kids.length >= 2 ? el : (grp ? grp.p : null);
    const boxSel = box ? cssPath(box) : '';
    let layHtml = '';
    if (box && boxSel) {
      const bv = (p) => styleOf(boxSel, place, p);
      const gtc = bv('grid-template-columns'), m = gtc.match(/repeat\((\d)/);
      const curCols = m ? (m[1] === '1' ? 'col' : m[1]) : (bv('display') === 'flex' ? (bv('flex-direction') === 'column' ? 'col' : 'row') : '');
      const curPlace = /1fr/.test(gtc) ? 'stretch' : bv('justify-content');
      const seg = (attr, cur, opts) => `<div class="gst-seg">${opts.map(([v, t]) => `<button type="button" data-${attr}="${v}" class="${cur === v ? 'on' : ''}">${t}</button>`).join('')}</div>`;
      const bd = describe(box);
      layHtml = `<div class="gst-sec" id="gstLay"><div class="gst-sec-t">ترتيب العناصر داخل الصندوق</div>
        <div class="gst-hint" style="margin-top:0">الصندوق: <b>${esc(bd.kind)}</b> ${esc((bd.txt || '').slice(0, 40))} (${box.children.length} عناصر)</div>
        <div class="gst-lbl">مكان العناصر</div>
        ${seg('lp', curPlace, [['flex-start', '⇥ يمين'], ['center', '↔ وسط'], ['flex-end', '⇤ شمال'], ['space-between', '⇹ موزّعة'], ['stretch', '▭ بعرض الصندوق']])}
        <div class="gst-lbl">التقسيم</div>
        ${seg('lc', curCols, [['row', 'صف واحد'], ['col', 'عمود واحد'], ['2', 'عمودين (٢ فوق ٢)'], ['3', '3 أعمدة'], ['4', '4 أعمدة']])}
        <div class="gst-grid2">
          <label class="gst-f">المسافة بين العناصر (px)<input type="number" min="0" max="80" id="gstLayGap" value="${esc(parseFloat(bv('gap')) || '')}" placeholder="${Math.round(parseFloat(getComputedStyle(box).columnGap)) || 0}"></label>
          <label class="gst-f">المحاذاة الرأسية<select id="gstLayAlign">${[['', '— كما هي —'], ['flex-start', 'أعلى'], ['center', 'وسط'], ['flex-end', 'أسفل'], ['stretch', 'نفس الارتفاع']].map(([v, t]) => `<option value="${v}" ${bv('align-items') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        </div>
        ${styleOf(boxSel, place, 'display') ? `<button type="button" class="gst-btn" id="gstLayReset">${icon('refund')}<span>إرجاع شكل الصندوق</span></button>` : ''}
        <div class="gst-hint">مثال: اختار «عمودين» عشان الأزرار تبقى اتنين فوق اتنين، و«شمال» أو «وسط» عشان تنقلهم. ولتكبير أو تصغير زرار معيّن حدّده هو وغيّر الحجم تحت.</div></div>`;
    }

    setBody('العنصر المحدد', `
      <div class="gst-el"><span class="gst-kind">${esc(d.kind)}</span><span class="gst-eltxt">${esc(d.txt || '')}</span></div>
      <div class="gst-row2">
        <button type="button" class="gst-btn" id="gstParent">${icon('back')}<span>العنصر الأكبر</span></button>
        <button type="button" class="gst-btn" id="gstDesel">${icon('x')}<span>إلغاء التحديد</span></button>
      </div>
      <div class="gst-sec"><div class="gst-sec-t">مكان التعديل</div>
        <div class="gst-radio">
          <label><input type="radio" name="gstPlace" value="screen" ${place !== '*' ? 'checked' : ''}> هذه الشاشة فقط (${esc(screenLabel(screenNow()))})</label>
          <label><input type="radio" name="gstPlace" value="*" ${place === '*' ? 'checked' : ''}> كل الشاشات</label>
        </div></div>
      ${layHtml}
      ${orderHtml}
      ${textHtml}
      <div class="gst-sec"><div class="gst-sec-t">الخط</div>
        <label class="gst-f">نوع الخط<select data-p="font-family">${fontOpts}</select></label>
        <div class="gst-grid2">
          <label class="gst-f">الحجم (px)<input type="number" min="8" max="72" data-p="font-size" data-unit="px" value="${esc(parseFloat(sv('font-size')) || '')}" placeholder="${Math.round(parseFloat(cs.fontSize))}"></label>
          <label class="gst-f">السماكة<select data-p="font-weight">
            ${[['', '— كما هو —'], ['400', 'عادي'], ['500', 'متوسط'], ['600', 'نص عريض'], ['700', 'عريض'], ['800', 'عريض جدًا']].map(([v, t]) => `<option value="${v}" ${sv('font-weight') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        </div>
        <div class="gst-grid2">
          <label class="gst-f">لون النص<span class="gst-color"><input type="color" data-p="color" value="${esc(sv('color') || toHex(cs.color))}"><button type="button" class="gst-clear" data-clear="color">افتراضي</button></span></label>
          <label class="gst-f">المحاذاة<select data-p="text-align">
            ${[['', '— كما هي —'], ['right', 'يمين'], ['center', 'وسط'], ['left', 'شمال']].map(([v, t]) => `<option value="${v}" ${sv('text-align') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        </div>
        <div class="gst-checks">
          <label><input type="checkbox" data-toggle="font-style" data-on="italic" ${sv('font-style') === 'italic' ? 'checked' : ''}> مائل</label>
          <label><input type="checkbox" data-toggle="text-decoration" data-on="underline" ${sv('text-decoration') === 'underline' ? 'checked' : ''}> تحته خط</label>
        </div></div>
      <div class="gst-sec"><div class="gst-sec-t">الشكل</div>
        <div class="gst-grid2">
          <label class="gst-f">الخلفية<span class="gst-color"><input type="color" data-p="background-color" value="${esc(sv('background-color') || toHex(cs.backgroundColor))}"><button type="button" class="gst-clear" data-clear="background-color">افتراضي</button></span></label>
          <label class="gst-f">لون الإطار<span class="gst-color"><input type="color" data-p="border-color" value="${esc(sv('border-color') || toHex(cs.borderTopColor))}"><button type="button" class="gst-clear" data-clear="border-color">افتراضي</button></span></label>
        </div>
        <div class="gst-grid2">
          <label class="gst-f">الاستدارة (px)<input type="number" min="0" max="60" data-p="border-radius" data-unit="px" value="${esc(parseFloat(sv('border-radius')) || '')}" placeholder="${Math.round(parseFloat(cs.borderTopLeftRadius)) || 0}"></label>
          <label class="gst-f">المسافة الداخلية (px)<input type="number" min="0" max="80" data-p="padding" data-unit="px" value="${esc(parseFloat(sv('padding')) || '')}" placeholder="${Math.round(parseFloat(cs.paddingTop)) || 0}"></label>
        </div>
        <div class="gst-grid2">
          <label class="gst-f">العرض (px)<input type="number" min="20" max="2000" data-p="width" data-unit="px" value="${esc(/px$/.test(sv('width')) ? parseFloat(sv('width')) : '')}" placeholder="${Math.round(parseFloat(cs.width)) || ''}"></label>
          <label class="gst-f">الارتفاع (px)<input type="number" min="10" max="1000" data-p="min-height" data-unit="px" value="${esc(parseFloat(sv('min-height')) || '')}" placeholder="${Math.round(parseFloat(cs.height)) || ''}"></label>
        </div>
        <div class="gst-checks">
          <label><input type="checkbox" data-toggle="width" data-on="100%" ${sv('width') === '100%' ? 'checked' : ''}> بعرض المكان كله</label>
          <label><input type="checkbox" data-toggle="width" data-on="auto" ${sv('width') === 'auto' ? 'checked' : ''}> على قد الكلام</label>
        </div>
        <div class="gst-checks"><label><input type="checkbox" data-toggle="display" data-on="none" ${sv('display') === 'none' ? 'checked' : ''}> إخفاء هذا العنصر</label></div></div>
      <button type="button" class="gst-btn gst-danger" id="gstReset">${icon('refund')}<span>إرجاع العنصر لأصله</span></button>
      <div class="gst-hint">يظهر التعديل فورًا كمعاينة - اضغط «حفظ» أدناه ليُطبَّق على كل الزوار.</div>`);

    const body = $('#gstBody');
    $('#gstParent').onclick = () => { const p = el.parentElement; if (p && p !== document.body && !inStudio(p)) select(p); };
    $('#gstDesel').onclick = () => select(null);

    // مكان التعديل
    body.querySelectorAll('input[name="gstPlace"]').forEach(r => r.onchange = () => { state.place = r.value === '*' ? '*' : screenNow(); renderElement(); });

    // النص
    const txt = $('#gstText');
    if (txt) {
      const origText = ST.originalText(tn).trim();
      // المكان والنوع بيتاخدوا لحظة الكتابة (مش لحظة التنفيذ) - عشان لو اتحدد عنصر تاني بسرعة
      const applyText = (place, mode, value) => {
        // المسافات الزيادة بتتشال، بس السطور الجديدة (Enter) بتفضل - الإصدار 79
        const v = value.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        // نشيل أي تعديل قديم للعنصر ده في المكان ده وبعدين نحط الجديد حسب النوع
        setElText(place, sel, null, origText);
        setWord(place, origText, null);
        if (mode === 'el') setElText(place, sel, v, origText);
        else setWord(place, origText, v);
        markO();
      };
      const applyTextLater = debounce(applyText, 250);
      txt.oninput = () => applyTextLater(place, state.textMode, txt.value);
      body.querySelectorAll('input[name="gstTM"]').forEach(r => r.onchange = () => { state.textMode = r.value; applyText(place, state.textMode, txt.value); });
      // زرار "سطر جديد": بيحط سطر جديد مكان المؤشر (مفيد على الموبايل)
      $('#gstNewLine').onclick = () => {
        const a = txt.selectionStart != null ? txt.selectionStart : txt.value.length, b = txt.selectionEnd != null ? txt.selectionEnd : a;
        txt.value = txt.value.slice(0, a) + '\n' + txt.value.slice(b);
        txt.focus(); txt.selectionStart = txt.selectionEnd = a + 1;
        applyText(place, state.textMode, txt.value);
      };
    }
    const ph = $('#gstPh');
    if (ph) {
      const origPh = ST.originalAttr(el, 'placeholder') || '';
      const later = debounce((place, v) => { setWord(place, origPh, v); markO(); }, 250);
      ph.oninput = () => later(place, ph.value);
    }
    body.querySelectorAll('.gst-opt').forEach(inp => {
      const opt = el.options[+inp.dataset.i];
      const orig = ST.originalText(opt.firstChild).trim();
      const later = debounce((place, v) => { setWord(place, orig, v); markO(); }, 250);
      inp.oninput = () => later(place, inp.value);
    });

    // التنسيق
    const lbl = label.slice(0, 80);
    body.querySelectorAll('[data-p]').forEach(inp => {
      const handler = (place, raw) => {
        let v = String(raw).trim();
        if (v && inp.dataset.unit) v = v + inp.dataset.unit;
        setStyle(place, sel, inp.dataset.p, v, lbl);
        markO();
      };
      const later = debounce(handler, inp.type === 'color' ? 60 : 200);
      inp.oninput = () => later(place, inp.value);
      inp.onchange = () => handler(place, inp.value);
    });
    body.querySelectorAll('[data-clear]').forEach(b => b.onclick = () => { setStyle(place, sel, b.dataset.clear, '', lbl); markO(); renderElement(); });
    body.querySelectorAll('[data-toggle]').forEach(c => c.onchange = () => { setStyle(place, sel, c.dataset.toggle, c.checked ? c.dataset.on : '', lbl); markO(); if (c.dataset.toggle === 'width') renderElement(); });

    // ترتيب الصندوق (الإصدار 107)
    if (box && boxSel) {
      const bdd = describe(box), blbl = ('صندوق: ' + bdd.kind + (bdd.txt ? ' ' + bdd.txt : '')).slice(0, 80);
      const bv = (p) => styleOf(boxSel, place, p);
      const setB = (p, v) => setStyle(place, boxSel, p, v, blbl);
      const layout = (cols, where) => {
        const gtc = bv('grid-template-columns'), m = gtc.match(/repeat\((\d)/);
        cols = cols || (m ? (m[1] === '1' ? 'col' : m[1]) : (bv('flex-direction') === 'column' ? 'col' : 'row'));
        where = where != null ? where : (/1fr/.test(gtc) ? 'stretch' : bv('justify-content'));
        const n = Math.min(6, Math.max(1, box.children.length));
        if (cols === 'row' && where !== 'stretch') {
          setB('display', 'flex'); setB('flex-direction', 'row'); setB('flex-wrap', 'wrap'); setB('grid-template-columns', '');
        } else {
          const N = cols === 'col' ? 1 : cols === 'row' ? n : +cols;
          setB('display', 'grid'); setB('flex-direction', ''); setB('flex-wrap', '');
          setB('grid-template-columns', `repeat(${N}, ${where === 'stretch' ? '1fr' : 'max-content'})`);
        }
        setB('justify-content', where && where !== 'stretch' ? where : '');
        markO(); renderElement();
      };
      body.querySelectorAll('[data-lp]').forEach(b => b.onclick = () => layout('', b.dataset.lp));
      body.querySelectorAll('[data-lc]').forEach(b => b.onclick = () => layout(b.dataset.lc, null));
      const gap = $('#gstLayGap'); const gapLater = debounce((v) => { setB('gap', v ? v + 'px' : ''); markO(); }, 200);
      gap.oninput = () => gapLater(String(gap.value).trim());
      $('#gstLayAlign').onchange = (e) => { setB('align-items', e.target.value); markO(); };
      const lr = $('#gstLayReset'); if (lr) lr.onclick = () => { ['display', 'flex-direction', 'flex-wrap', 'grid-template-columns', 'justify-content', 'align-items', 'gap'].forEach(p => setB(p, '')); markO(); renderElement(); };
    }

    // الترتيب
    if (grp) {
      const glbl = describe(grp.p); const gl = `${glbl.kind}${glbl.txt ? ': ' + glbl.txt : ''}`.slice(0, 80);
      const commit = (seq) => { setOrder(place, grp, seq, gl); markO(); renderElement(); };
      // التحريك بيعدّي العناصر المخفية (عشان كل ضغطة تبان على الشاشة)
      const shown = (k) => getComputedStyle(grp.p.children[k - 1]).display !== 'none';
      const move = (k, dir) => {
        const seq = grp.seq.slice(), i = seq.indexOf(k); if (i < 0) return;
        let j = i + dir; while (j >= 0 && j < seq.length && !shown(seq[j])) j += dir;
        if (j < 0 || j >= seq.length) return;
        seq.splice(i, 1); seq.splice(j, 0, k); commit(seq);
      };
      $('#gstUp').onclick = () => move(myIdx, -1);
      $('#gstDown').onclick = () => move(myIdx, 1);
      const listEl = $('#gstOrdList');
      listEl.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => move(+b.closest('.gst-ord').dataset.k, +b.dataset.mv));
      let dragK = 0;
      listEl.querySelectorAll('.gst-ord').forEach(row => {
        row.addEventListener('dragstart', e => { dragK = +row.dataset.k; row.classList.add('drag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragK)); } catch(x){} });
        row.addEventListener('dragend', () => row.classList.remove('drag'));
        row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('over'); });
        row.addEventListener('dragleave', () => row.classList.remove('over'));
        row.addEventListener('drop', e => {
          e.preventDefault(); row.classList.remove('over');
          const to = +row.dataset.k; if (!dragK || dragK === to) return;
          const seq = grp.seq.filter(k => k !== dragK), at = seq.indexOf(to), from = grp.seq.indexOf(dragK), toI = grp.seq.indexOf(to);
          seq.splice(from < toI ? at + 1 : at, 0, dragK); commit(seq);
        });
      });
      const orr = $('#gstOrdReset'); if (orr) orr.onclick = () => commit(Array.from({ length: grp.n }, (_, i) => i + 1));
    }

    // إرجاع للأصل
    $('#gstReset').onclick = () => {
      const r = rulesFor(sel);
      r.styles.forEach(x => state.draft.styles.splice(state.draft.styles.indexOf(x), 1));
      r.elTexts.forEach(x => state.draft.elTexts.splice(state.draft.elTexts.indexOf(x), 1));
      if (tn) { const o = ST.originalText(tn).trim(); [screenNow(), '*'].forEach(p => setWord(p, o, null)); }
      markO(); renderElement();
    };
  }


  /* =====================================================================
     06. لوح الثيمات
     ===================================================================== */
  function renderThemes(){
    const t = state.themeDraft;
    const cards = ST.PRESETS.map(p => {
      const pal = ST.buildPalette(ST.themeFromPreset(p.id)).light;
      const on = t && t.preset === p.id;
      return `<button type="button" class="gst-theme ${on ? 'on' : ''}" data-preset="${p.id}">
        <span class="gst-sw"><i style="background:${pal['--gs-brand']}"></i><i style="background:${pal['--gs-ink']}"></i><i style="background:${pal['--gs-bg']}"></i><i style="background:${ST.buildPalette(ST.themeFromPreset(p.id)).dark['--gs-surface']}"></i></span>
        <b>${esc(p.name)}</b><small>${esc(p.note)}${p.font ? ' — الخط: ' + esc(((ST.FONTS.find(f => f.name === p.font) || {}).label) || p.font) : ''}</small></button>`;
    }).join('');

    const color = (key, lbl, auto) => {
      const val = t && t[key] ? t[key] : '';
      const shown = val || ST.buildPalette(t || ST.THEME_DEFAULTS).light[{ primary:'--gs-brand', ink:'--gs-ink', bg:'--gs-bg', surface:'--gs-surface', text:'--gs-text' }[key]];
      return `<label class="gst-f">${lbl}<span class="gst-color"><input type="color" data-t="${key}" value="${esc(shown)}">
        ${auto ? `<label class="gst-auto"><input type="checkbox" data-auto="${key}" ${val ? '' : 'checked'}> تلقائي</label>` : ''}</span></label>`;
    };

    setBody('الثيمات والهوية البصرية', `
      <div class="gst-sec"><div class="gst-sec-t">ثيمات جاهزة</div>
        <div class="gst-themes">${cards}
          <button type="button" class="gst-theme ${!t ? 'on' : ''}" data-preset=""><span class="gst-sw"><i style="background:#C9A227"></i><i style="background:#0F172A"></i><i style="background:#F3F4F6"></i><i style="background:#111923"></i></span><b>الشكل الأصلي</b><small>بدون أي ثيم (كما صُمّم الموقع)</small></button>
        </div></div>
      ${t ? `
      <div class="gst-sec"><div class="gst-sec-t">تخصيص الثيم</div>
        ${color('primary', 'اللون الرئيسي', false)}
        <div class="gst-grid2">${color('ink', 'لون الأزرار', true)}${color('text', 'لون النص', true)}</div>
        <div class="gst-grid2">${color('bg', 'خلفية الصفحة', true)}${color('surface', 'لون البطاقات', true)}</div>
        <div class="gst-hint">"تلقائي" = يتولّد اللون من اللون الرئيسي. والوضع الليلي يتولّد تلقائيًا دائمًا حتى يبقى النص مقروءًا.</div>
      </div>
      <div class="gst-sec"><div class="gst-sec-t">الخط والأحجام</div>
        <label class="gst-f">نوع الخط<select data-t="font"><option value="">— الافتراضي —</option>${ST.FONTS.map(f => `<option value="${esc(f.name)}" ${t.font === f.name ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</select></label>
        <label class="gst-f">حجم الخط في الشاشات: <b id="gstScaleV">${t.scale}%</b><input type="range" min="80" max="130" step="5" data-t="scale" value="${t.scale}"></label>
        <label class="gst-f">استدارة الحواف: <b id="gstRadV">${t.radius}px</b><input type="range" min="0" max="32" step="2" data-t="radius" value="${t.radius}"></label>
        <label class="gst-f">شكل الأزرار<select data-t="buttons">
          ${[['filled', 'ممتلئ (لون الأزرار)'], ['soft', 'فاتح (درجة من اللون الرئيسي)'], ['outline', 'إطار فقط']].map(([v, l]) => `<option value="${v}" ${t.buttons === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <div class="gst-checks"><label><input type="checkbox" data-t="tableNowrap" ${t.tableNowrap !== false ? 'checked' : ''}> بيانات الجداول في سطر واحد</label></div>
      </div>
      <button type="button" class="gst-btn" id="gstPreviewMode">${icon('moon')}<span>معاينة الوضع الليلي / النهاري</span></button>` : `
      <div class="gst-note">اختر ثيمًا من الأعلى لتبدأ في تخصيص ألوانه وخطه.</div>`}`);

    const body = $('#gstBody');
    body.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
      state.themeDraft = b.dataset.preset ? ST.themeFromPreset(b.dataset.preset) : null;
      markT(); renderThemes();
    });
    if (!t) return;
    const setT = (k, v) => { state.themeDraft[k] = v; markT(); };
    body.querySelectorAll('[data-t]').forEach(inp => {
      const k = inp.dataset.t;
      const handler = () => {
        if (inp.type === 'checkbox') return setT(k, inp.checked);
        if (inp.type === 'range') { setT(k, +inp.value); const lb = $(k === 'scale' ? '#gstScaleV' : '#gstRadV'); if (lb) lb.textContent = inp.value + (k === 'scale' ? '%' : 'px'); return; }
        if (inp.type === 'color') { const a = body.querySelector(`[data-auto="${k}"]`); if (a) a.checked = false; }
        setT(k, inp.value);
      };
      inp.oninput = inp.type === 'color' ? debounce(handler, 60) : handler;
      inp.onchange = handler;
    });
    body.querySelectorAll('[data-auto]').forEach(c => c.onchange = () => {
      const k = c.dataset.auto;
      setT(k, c.checked ? '' : body.querySelector(`[data-t="${k}"]`).value);
    });
    $('#gstPreviewMode').onclick = () => GS.toggleTheme();
  }


  /* =====================================================================
     07. لوح كل التعديلات
     ===================================================================== */
  function renderList(){
    const d = state.draft;
    const row = (kind, i, main, sub) => `<div class="gst-rule"><span><b>${main}</b><small>${sub}</small></span>
      <button type="button" class="gst-ic" data-del="${kind}:${i}" aria-label="حذف">${icon('x')}</button></div>`;
    const propNames = { 'color':'لون', 'background-color':'خلفية', 'font-size':'حجم', 'font-weight':'سماكة', 'font-family':'خط', 'font-style':'مائل',
      'text-align':'محاذاة', 'text-decoration':'تسطير', 'padding':'مسافة', 'border-radius':'استدارة', 'border-color':'إطار', 'display':'مخفي', 'opacity':'شفافية', 'letter-spacing':'تباعد', 'line-height':'ارتفاع السطر' };

    setBody('كل التعديلات', `
      <div class="gst-sec"><div class="gst-sec-t">تغيير كلمات (${d.texts.length})</div>
        ${d.texts.map((r, i) => row('texts', i, `${esc(r.from)} ← ${esc(r.to)}`, esc(screenLabel(r.screen)))).join('') || '<div class="gst-hint">لا يوجد</div>'}</div>
      <div class="gst-sec"><div class="gst-sec-t">نصوص عناصر بعينها (${d.elTexts.length})</div>
        ${d.elTexts.map((r, i) => row('elTexts', i, esc(r.text), esc(screenLabel(r.screen)))).join('') || '<div class="gst-hint">لا يوجد</div>'}</div>
      <div class="gst-sec"><div class="gst-sec-t">تنسيقات (${d.styles.length})</div>
        ${d.styles.map((r, i) => row('styles', i, esc(r.label || r.sel.split(' > ').slice(-1)[0]), `${esc(screenLabel(r.screen))} · ${Object.keys(r.css).map(p => propNames[p] || p).join('، ')}`)).join('') || '<div class="gst-hint">لا يوجد</div>'}</div>
      <div class="gst-sec"><div class="gst-sec-t">ترتيب عناصر (${d.orders.length})</div>
        ${d.orders.map((r, i) => row('orders', i, esc(r.label || r.psel.split(' > ').slice(-1)[0]), esc(screenLabel(r.screen)) + ' · ترتيب جديد')).join('') || '<div class="gst-hint">لا يوجد</div>'}</div>
      <button type="button" class="gst-btn gst-danger" id="gstClearAll">${icon('x')}<span>مسح كل تعديلات الشاشات</span></button>
      <div class="gst-hint">الحذف هنا معاينة فقط حتى تضغط «حفظ».</div>`);

    const body = $('#gstBody');
    body.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      const [kind, i] = b.dataset.del.split(':');
      state.draft[kind].splice(+i, 1);
      markO(); renderList();
    });
    $('#gstClearAll').onclick = async () => {
      if (!await gConfirm('مسح كل تعديلات النصوص والتنسيق والترتيب في كل الشاشات؟ (لن يتأثر الثيم)')) return;
      state.draft = { v:1, texts:[], elTexts:[], styles:[], orders:[] };
      markO(); renderList();
    };
  }


  /* =====================================================================
     08. الحفظ والخروج
     ===================================================================== */
  async function save(){
    if (!state.dirtyO && !state.dirtyT) { GS.toast('لا توجد تعديلات جديدة للحفظ.', 'info'); return; }
    const btn = $('#gstSave'); btn.disabled = true;
    try {
      if (state.dirtyO) { await ST.save('overrides', state.draft); state.draft = clone(ST.overrides); state.savedO = clone(ST.overrides); state.dirtyO = false; }
      if (state.dirtyT) { const v = await ST.save('theme', state.themeDraft); state.themeDraft = clone(v); state.savedT = clone(v); state.dirtyT = false; }
      preview();
      GS.toast('تم حفظ التعديلات - وستظهر لكل الزوار.', 'ok');
    } catch(e){
      GS.toast('تعذّر الحفظ: ' + e.message, 'err');
    } finally { btn.disabled = false; updateCounters(); }
  }

  async function exit(){
    if ((state.dirtyO || state.dirtyT) && !await gConfirm('توجد تعديلات لم تُحفظ. هل تريد الخروج وإلغاءها؟')) return;
    // رجوع لآخر نسخة محفوظة
    ST.overrides = clone(state.savedO) || { v:1, texts:[], elTexts:[], styles:[], orders:[] };
    ST.theme = clone(state.savedT);
    ST.applyTheme(ST.theme); ST.apply();
    setPicking(false);
    listen(false);
    cancelAnimationFrame(rafId);
    if (screenObserver) { screenObserver.disconnect(); screenObserver = null; }
    if (ui) ui.remove(); ui = null;
    document.body.classList.remove('gs-studio-on', 'gs-studio-picking');
    state.isOpen = false; state.el = null;
  }


  /* =====================================================================
     09. الفتح
     ===================================================================== */
  let screenObserver = null;
  E.open = function(){
    if (state.isOpen) return;
    if (!ST.canEdit()) { GS.toast('استوديو التصميم متاح لمدير الموقع فقط.', 'err'); return; }
    state.isOpen = true;
    state.savedO = clone(ST.overrides);
    state.savedT = clone(ST.theme);
    state.draft = clone(ST.overrides) || { v:1, texts:[], elTexts:[], styles:[], orders:[] };
    ['texts', 'elTexts', 'styles', 'orders'].forEach(k => { if (!Array.isArray(state.draft[k])) state.draft[k] = []; });
    state.themeDraft = clone(ST.theme);
    state.dirtyO = state.dirtyT = false;
    buildUi();
    listen(true);
    renderWelcome();
    updateCounters();
    loop();
    // الشاشة بتتغيّر ← نحدّث اختيار الشاشة في الشريط
    const app = document.getElementById('app');
    if (app) { screenObserver = new MutationObserver(debounce(() => { if (state.isOpen) syncScreenPicker(); }, 150)); screenObserver.observe(app, { childList: true }); }
  };
})();
