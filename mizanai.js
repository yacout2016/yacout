/* =====================================================================
   GRIFFINE — mizanai.js (الإصدار 122) — «ميزان GRIFFINE AI»: مخطِّط توزيع الاستثمار الذكي
   ---------------------------------------------------------------------
   renderMizanAi()            ← الشاشة: 3 أوضاع
       1) توزيع مبلغ على قطاعات الأسهم (قطاعات البورصة الحقيقية بمحرك بصيرة) + الشركات المرشحة (بتفتح في بصيرة) + «ابدأ الخطة» DCA / Grid
       2) توزيع شامل للأصول (أسهم / عقار / شهادات / ادخار / ذهب / مصاريف) — مبلغ ثابت أو شهري + النمو شهر بشهر (متشائم / أساسي / متفائل)
       3) فحص توزيعتي الحالية ← درجة الخطورة + التركيز (HHI) + مراكز الخطورة + الحالي مقابل المقترح + خطوات إعادة التوزيع
       + رأي الذكاء الاصطناعي (نفس مفتاح بصيرة) ولو مش متاح ← رأي بالقواعد
       + حفظ / PDF / مشاركة / حذف (سلة المحذوفات) + دراساتي المحفوظة
   renderMizanAiShared(token) ← دراسة متشاركة (للقراءة بس)
   renderAdminMizanAi()       ← لوحة التحكم: الاسم / التنويه / العوائد السنوية / نسب الأصول لكل مستوى مخاطرة / الحفظ والمشاركة
   دراسة آلية تعليمية - مش نصيحة استثمارية.
   ===================================================================== */
(function(){
  'use strict';
  const E = (s) => escapeHtml(String(s == null ? '' : s));
  const f0 = (v) => Math.round(+v || 0).toLocaleString('en-US');
  const f2 = (v) => Number(+v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const toast = (m, k) => { if (window.GShell && GShell.toast) GShell.toast(m, k || 'ok'); };
  const COLORS = ['#D4AF37', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6', '#F59E0B', '#06B6D4', '#F43F5E', '#64748B', '#22C55E', '#A855F7', '#EAB308'];
  const MKTS = ['مصر', 'السعودية', 'الإمارات', 'قطر', 'الكويت'];
  const allowedMkts = () => { try { const a = window.gAllowedMarkets && window.gAllowedMarkets(); if (a && a.length) return a; } catch(e){} return MKTS; };
  const ASSETS = [
    // الإصدار 123: كل أصل لوحده (الادخار منفصل عن الصناديق النقدية + أنواع الصناديق + الحسابات البنكية)
    { k: 'stocks', n: 'أسهم (قطاعات البورصة عبر خطط DCA / Grid)', ic: '📈', vol: 18, risk: 3 },
    { k: 'equity_funds', n: 'صناديق أسهم (دخل متغير)', ic: '📊', vol: 14, risk: 3 },
    { k: 'fixed_funds', n: 'صناديق دخل ثابت', ic: '🧾', vol: 2, risk: 1 },
    { k: 'money_funds', n: 'صناديق نقدية', ic: '💧', vol: 0.5, risk: 1 },
    { k: 'realestate', n: 'عقار', ic: '🏠', vol: 8, risk: 2 },
    { k: 'gold', n: 'ذهب', ic: '🥇', vol: 12, risk: 2 },
    { k: 'cds', n: 'شهادات بنكية', ic: '📜', vol: 0.5, risk: 1 },
    { k: 'daily_bank', n: 'حساب بنكي بعوائد يومية', ic: '🏦', vol: 0.3, risk: 1 },
    { k: 'savings', n: 'حساب توفير بعوائد سنوية', ic: '🐖', vol: 0.3, risk: 1 },
    { k: 'expenses', n: 'مصاريف طوارئ (سيولة)', ic: '💵', vol: 0, risk: 0 },
  ];
  const RISKW = { 'منخفض': 1, 'متوسط': 2, 'مرتفع': 3 };
  const RL = { low: 'محافظ', mid: 'متوازن', high: 'مغامر' };
  const CASH = new Set(['expenses', 'savings', 'daily_bank', 'money_funds']);
  let CFG = null, SEC = {}, MODE = 'stocks', LAST = null, LAST_ID = null, RATES = {};

  async function loadCfg(){
    const r = await apiGet('/mizanai_api.php?action=config').catch(() => null);
    if (r && r.success) { CFG = r.config; CFG.__ready = r.ready; RATES = Object.assign({}, CFG.rates, { expenses: 0 }); }
    return r;
  }
  async function loadSectors(market){
    if (SEC[market]) return SEC[market];
    const r = await apiGet('/mizanai_api.php?action=sectors&market=' + encodeURIComponent(market)).catch(() => null);
    if (r && r.success) { SEC[market] = r.sectors; return r.sectors; }
    throw new Error((r && r.message) || 'تعذّر جلب قطاعات البورصة.');
  }
  // الإصدار 125: كل اختيار ممكن يكون تحته سطر صغير (النسبة) + علامة (!) بالشرح
  const seg = (id, opts, on) => `<div class="mza-seg${opts.some(o => o[2]) ? ' mza-seg2' : ''}" id="${id}">${opts.map(([v, l, sub, tip]) => `<button type="button" data-v="${v}" class="${v === on ? 'on' : ''}"><span class="mza-seg-l">${l}${tip ? gTipI(tip) : ''}</span>${sub != null ? `<small class="mza-seg-s">${sub}</small>` : ''}</button>`).join('')}</div>`;
  // نص القاعدة لكل مستوى مخاطرة في كل وضع
  function riskOpts(mode){
    if (mode === 'stocks') { const c = capVal(); return [
      ['low', 'محافظ', `حد ${Math.min(c, 25)}% للقطاع`, `محافظ: أقصى ${Math.min(c, 25)}% لأي قطاع واحد (25% أو أقل لو اخترت أقل) ← توزيع متقارب على قطاعات أكتر، وبيختار أهدى شركتين في كل قطاع (أقل تذبذب).`],
      ['mid', 'متوازن', `حد ${c}% للقطاع`, `متوازن: أقصى نسبة لأي قطاع = اللي اخترتها في «أقصى نسبة لقطاع واحد» (${c}%) ← الوزن حسب درجة بصيرة واتجاه القطاع، و3 شركات في كل قطاع.`],
      ['high', 'مغامر', `حد ${Math.min(100, c + 10)}% للقطاع`, `مغامر: أقصى نسبة لأي قطاع = اختيارك + 10% (${Math.min(100, c + 10)}%) ← تركيز أكبر على القطاعات الأقوى والصاعدة، وبيختار الشركات الأعلى في احتمال الصعود.`]]; }
    if (mode === 'assets') { const P = (CFG && CFG.profiles) || {}, st = (r) => { const p = P[r] || {}, t = Object.values(p).reduce((a, b) => a + b, 0) || 1; return Math.round(((p.stocks || 0) + (p.equity_funds || 0)) / t * 100); };
      return [['low', 'محافظ', `أسهم ${st('low')}%`, `محافظ: الأسهم وصناديق الأسهم حوالي ${st('low')}% بس، والباقي في أصول بعائد ثابت (شهادات، حسابات بنكية، صناديق نقدية ودخل ثابت) + عقار وذهب.`],
        ['mid', 'متوازن', `أسهم ${st('mid')}%`, `متوازن: الأسهم وصناديق الأسهم حوالي ${st('mid')}%، والباقي موزّع بين العائد الثابت والعقار والذهب.`],
        ['high', 'مغامر', `أسهم ${st('high')}%`, `مغامر: الأسهم وصناديق الأسهم حوالي ${st('high')}% عشان نمو أعلى على المدى الطويل — مع تذبذب أكبر.`]]; }
    return [['low', 'محافظ', 'حد 25% للبند', 'محافظ: المقترح إن مفيش بند يعدّي 25% من المحفظة، والأسهم كلها حوالي 30% أو أقل.'],
      ['mid', 'متوازن', 'حد 30% للبند', 'متوازن: المقترح إن مفيش بند يعدّي 30%، والأسهم كلها حوالي 55%.'],
      ['high', 'مغامر', 'حد 35% للبند', 'مغامر: المقترح إن مفيش بند يعدّي 35%، والأسهم ممكن توصل حوالي 75%.']];
  }
  // أقصى نسبة لقطاع واحد: 25 / 30 / 40 أو أي نسبة يكتبها (5 – 100)
  function capVal(){ const s = document.getElementById('mzaSCap'); if (!s) return 30; if (s.value !== 'custom') return +s.value || 30;
    const v = Math.round(+(document.getElementById('mzaSCapC') || {}).value || 0); return Math.max(5, Math.min(100, v || 30)); }
  function paintRiskSubs(){ const o = riskOpts('stocks'); o.forEach(([v, , sub, tip]) => { const b = document.querySelector(`#mzaSRisk button[data-v="${v}"]`); if (!b) return; b.querySelector('.mza-seg-s').textContent = sub; const t = b.querySelector('.g-tip'); if (t) { t.dataset.tip = tip; t.setAttribute('aria-label', tip); } }); }
  const segVal = (id) => { const b = document.querySelector(`#${id} .on`); return b ? b.dataset.v : ''; };
  /* الإصدار 123: اختيار القطاعات / الأصول المطلوبة أو المستثناة من قوائم منسدلة (بدل زراير كتير بتاخد مساحة)
     القائمة الأولى: كل / المطلوبة بس / استثني ← التانية بتفتح قائمة فيها كل قطاع لوحده بعلامة صح */
  const msBox = (id, what) => `<div class="mza-pick"><select id="${id}M"><option value="all">كل ${what}</option><option value="only">${what} المطلوبة بس</option><option value="ex">استثني ${what}</option></select>
    <div class="mza-ms" id="${id}" hidden><button type="button" class="mza-ms-btn" aria-haspopup="listbox" aria-expanded="false"><span>اختار من القائمة</span><i>▾</i></button><div class="mza-ms-pop" role="listbox" hidden><span class="u-muted u-fs12">جارٍ التحميل…</span></div></div></div>`;
  function msFill(id, items){ const el = document.getElementById(id); if (!el) return; const was = new Set(msVals(id));
    el.querySelector('.mza-ms-pop').innerHTML = items.map(([k, l, t]) => `<label class="mza-ms-opt"${t ? ` title="${E(t)}"` : ''}><input type="checkbox" value="${E(k)}"${was.has(k) ? ' checked' : ''}><span>${E(l)}</span></label>`).join('') || '<span class="u-muted u-fs12">لا يوجد</span>';
    msLabel(id); }
  const msVals = (id) => [...document.querySelectorAll(`#${id} .mza-ms-pop input:checked`)].map(i => i.value);
  function msLabel(id){ const el = document.getElementById(id); if (!el) return; const names = [...el.querySelectorAll('.mza-ms-pop input:checked')].map(i => i.nextElementSibling.textContent);
    el.querySelector('.mza-ms-btn span').textContent = names.length ? `${names.length} مختار: ${names.join('، ')}` : 'اختار من القائمة'; }
  function msWire(id){ const el = document.getElementById(id), mode = document.getElementById(id + 'M'); if (!el || !mode) return;
    const btn = el.querySelector('.mza-ms-btn'), pop = el.querySelector('.mza-ms-pop');
    const open = (v) => { pop.hidden = !v; btn.setAttribute('aria-expanded', v ? 'true' : 'false'); };
    mode.onchange = () => { el.hidden = mode.value === 'all'; if (mode.value !== 'all') open(true); else open(false); };
    btn.onclick = (e) => { e.stopPropagation(); open(pop.hidden); };
    pop.addEventListener('change', () => msLabel(id));
    pop.addEventListener('click', (e) => e.stopPropagation());
    const close = () => { if (!el.isConnected) return document.removeEventListener('click', close); open(false); };
    document.addEventListener('click', close); }
  // المستثنى فعليًا: «استثني» ← المختار / «المطلوبة بس» ← كل اللي مش مختار (ولو مفيش اختيار ← كله)
  function msExcluded(id, allKeys){ const m = (document.getElementById(id + 'M') || {}).value || 'all', v = new Set(msVals(id));
    if (m === 'ex') return v; if (m === 'only' && v.size) return new Set(allKeys.filter(k => !v.has(k))); return new Set(); }
  function msClear(id){ const m = document.getElementById(id + 'M'); if (m) { m.value = 'all'; m.onchange && m.onchange(); }
    document.querySelectorAll(`#${id} .mza-ms-pop input`).forEach(i => { i.checked = false; }); msLabel(id); }
  function wireSeg(id, cb){ const el = document.getElementById(id); if (!el) return; el.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); if (cb) cb(b.dataset.v); }; }
  function gauge(score){ const a = Math.PI * (1 - score / 100), x = 75 + 62 * Math.cos(a), y = 82 - 62 * Math.sin(a), col = score >= 65 ? 'var(--gs-neg,#DC2626)' : score >= 45 ? '#D97706' : 'var(--gs-pos,#0E9F6E)';
    return `<path d="M13,82 A62,62 0 0 1 137,82" fill="none" stroke="var(--gs-surface-3,#E5E7EB)" stroke-width="12" stroke-linecap="round"/><path d="M13,82 A62,62 0 0 1 ${x.toFixed(1)},${y.toFixed(1)}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"/><text x="75" y="76" text-anchor="middle" font-size="22" font-weight="700" fill="currentColor">${score}</text><text x="75" y="90" text-anchor="middle" font-size="9" fill="currentColor" opacity=".6">من 100</text>`; }
  function donut(parts, center, sub){
    const R = 80, C = 2 * Math.PI * R, tot = parts.reduce((a, p) => a + p.v, 0) || 1; let off = 0;
    return `<svg class="mza-donut" viewBox="0 0 220 220" aria-hidden="true"><g transform="rotate(-90 110 110)">${parts.map(p => { const L = p.v / tot * C, s = `<circle cx="110" cy="110" r="${R}" fill="none" stroke="${p.c}" stroke-width="30" stroke-dasharray="${L} ${C - L}" stroke-dashoffset="${-off}"><title>${E(p.l)}: ${p.v}%</title></circle>`; off += L; return s; }).join('')}</g>
      <text x="110" y="106" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor" style="direction:ltr">${E(center)}</text><text x="110" y="128" text-anchor="middle" font-size="12" fill="currentColor" opacity=".6">${E(sub)}</text></svg>`;
  }
  const legend = (parts) => `<div class="mza-legend">${parts.map(p => `<div class="mza-lg"><i style="background:${p.c}"></i>${E(p.l)}<b class="n">${p.v}%</b></div>`).join('')}</div>`;
  const kpi = (l, v, cls) => `<div class="mz-kpi"><span>${l}</span><b class="n ${cls || ''}">${v}</b></div>`;
  const hzLabel = (m) => m >= 12 ? (m / 12 === 1 ? 'سنة' : (m / 12) + ' سنين') : m + (m === 1 ? ' شهر' : ' شهور');

  /* ===================== الشاشة ===================== */
  window.renderMizanAi = async function(){
    const __tok = screenToken();
    pushNav(() => window.renderMizanAi());
    const email = await getSession(); if (!email) return renderLogin();
    if (!(await ensureAccess())) return;
    if (!window.__isAdmin && window.GShell && GShell.settings && GShell.settings.hide_mizanai_screen === true) return renderHome();
    const r = await loadCfg();
    if (screenStale(__tok)) return;
    if (!r || !r.success) {
      app.innerHTML = `<div class="container">${logoHeader()}<div class="bs-card bs-gate"><h2>⚖️ ميزان GRIFFINE AI</h2><p>${E((r && r.message) || 'تعذّر تحميل الشاشة.')}</p>${r && r.requiresSubscription ? '<button type="button" class="u-wa" id="mzaSub">الاشتراك والباقات</button>' : ''}</div></div>`;
      const b = document.getElementById('mzaSub'); if (b) b.onclick = () => renderSubscriptionPlans();
      return;
    }
    const mk = allowedMkts();
    window.__lastPageKey = 'mizanai';
    app.innerHTML = `<div class="container wide bs-screen mz-screen mza-screen">${logoHeader()}<span class="gs-page-title" hidden>${E(CFG.name)} GRIFFINE AI — توزيع الاستثمار</span>
      <div class="bs-top"><div class="bs-brand"><div class="bs-logo" aria-hidden="true">⚖</div><div><h1>${E(CFG.name)} <span>GRIFFINE AI</span></h1><p>مخطِّط المحفظة الذكي: يوزّع فلوسك على القطاعات والأسهم أو على الأصول كلها، ويكشف مراكز الخطورة</p></div></div>
        <span class="bs-chip ${CFG.aiReady ? 'bs-c-gold' : 'bs-c-neu'}">${CFG.aiReady ? '✨ مدعوم بالذكاء الاصطناعي' : '⚙️ محرك آلي'}</span></div>
      <div class="bs-disc" role="note">⚠️ <div><b>تنويه:</b> ${E(CFG.disclaimer)}</div></div>
      <div class="mza-modes" role="tablist">
        <button type="button" class="mza-mode on" data-m="stocks" role="tab"><span class="i">📊</span><b>توزيع على قطاعات الأسهم</b><small>مبلغ للأسهم ← نسبة ومبلغ لكل قطاع + الشركات المرشحة وخطة DCA / Grid لكل واحدة</small></button>
        <button type="button" class="mza-mode" data-m="assets" role="tab"><span class="i">🏦</span><b>توزيع شامل للأصول</b><small>أسهم + عقار + شهادات + ادخار + ذهب + مصاريف — مبلغ ثابت أو شهري، وهيبقى كام بعد مدة</small></button>
        <button type="button" class="mza-mode" data-m="check" role="tab"><span class="i">🩺</span><b>فحص توزيعتي الحالية</b><small>اكتب استثماراتك الحالية ← مراكز الخطورة ودرجة التركيز وإزاي تعيد التوزيع صح</small></button>
      </div>
      <div class="bs-card mza-form" id="mzaF-stocks">
        <div class="mza-grid">
          <div><label for="mzaSAmt">المبلغ اللي عايز تستثمره في الأسهم</label><input id="mzaSAmt" type="number" min="1000" step="1000" value="100000"></div>
          <div><label for="mzaSMkt">البورصة</label><select id="mzaSMkt">${mk.map(x => `<option>${E(x)}</option>`).join('')}</select></div>
          <div><label for="mzaSHz">مدة الاستثمار</label><select id="mzaSHz"><option value="3">3 شهور</option><option value="6">6 شهور</option><option value="12" selected>سنة</option><option value="36">3 سنين</option></select></div>
          <div><label>مستوى المخاطرة</label>${seg('mzaSRisk', riskOpts('stocks'), 'mid')}</div>
          <div class="wide"><label for="mzaSExM">القطاعات</label>${msBox('mzaSEx', 'القطاعات')}</div>
          <div><label for="mzaSMax">أقصى عدد قطاعات</label><select id="mzaSMax"><option>4</option><option selected>6</option><option>8</option></select></div>
          <div><label for="mzaSCap">أقصى نسبة لقطاع ${gTipI('أكبر نسبة ممكن تتحط في قطاع واحد. اختار 25 / 30 / 40 أو «نسبة أخرى» واكتب اللي انت عايزه (من 5% لـ 100%)')}</label><select id="mzaSCap"><option value="25">25%</option><option value="30" selected>30%</option><option value="40">40%</option><option value="custom">نسبة أخرى…</option></select>
            <input id="mzaSCapC" type="number" min="5" max="100" step="5" placeholder="اكتب النسبة % (مثلًا 60)" aria-label="أقصى نسبة لقطاع واحد %" hidden></div>
        </div>
        <div class="mza-actions"><button type="button" class="secondary small mza-clear" data-f="stocks">🧹 تفريغ الخانات</button><button type="button" class="mza-go" id="mzaSGo">✨ وزّع بالذكاء الاصطناعي</button><span class="u-muted u-fs12">بيستخدم: اتجاه كل قطاع + مؤشرات أكبر شركاته (بصيرة) + مستوى المخاطرة اللي اخترته</span></div>
      </div>
      <div class="bs-card mza-form" id="mzaF-assets" hidden>
        <div class="mza-grid">
          <div><label>نوع الاستثمار</label>${seg('mzaAType', [['lump', 'مبلغ ثابت'], ['monthly', 'تدفقات شهرية']], 'lump')}</div>
          <div><label for="mzaAAmt" id="mzaAAmtL">المبلغ</label><input id="mzaAAmt" type="number" min="0" step="1000" value="100000"></div>
          <div id="mzaAMonW" hidden><label for="mzaAMon">المبلغ الشهري</label><input id="mzaAMon" type="number" min="100" step="100" value="5000"></div>
          <div><label for="mzaAHz">المدة</label><select id="mzaAHz"><option value="1">شهر</option><option value="6">6 شهور</option><option value="12" selected>سنة</option><option value="36">3 سنين</option><option value="60">5 سنين</option></select></div>
          <div><label for="mzaAMkt">بورصة قطاعات الأسهم</label><select id="mzaAMkt">${mk.map(x => `<option>${E(x)}</option>`).join('')}</select></div>
          <div><label>مستوى المخاطرة</label>${seg('mzaARisk', riskOpts('assets'), 'mid')}</div>
          <div class="wide"><label for="mzaAExM">الأصول</label>${msBox('mzaAEx', 'الأصول')}</div>
          <div><label for="mzaAExp">نسبة المصاريف / الطوارئ</label><select id="mzaAExp"><option value="0">من غير</option><option value="5">5%</option><option value="10" selected>10%</option><option value="15">15%</option></select></div>
        </div>
        <div class="mza-rates" id="mzaRatesBox">
          <div class="mza-rhead"><b>📈 العوائد السنوية المتوقعة لكل أصل ${gTipI('تلقائي: الأرقام بتتحدث أونلاين مجانًا كل شهر (مؤشر البورصة / سعر الذهب / سعر الفائدة من البنك المركزي). «حدّث الآن» بيجيب أحدث أرقام. يدوي: انت بتكتب نسبك وتفضل ثابتة ومحفوظة على حسابك.')}</b>
            ${seg('mzaRMode', [['auto', '🔄 تلقائي أونلاين'], ['manual', '✍️ يدوي']], 'auto')}<button type="button" class="secondary small mza-rnow" id="mzaRNow">⟳ حدّث الآن</button></div>
          <div class="mza-rinfo u-fs12" id="mzaRInfo">جارٍ تحميل أحدث العوائد…</div>
          <div class="mza-grid u-mt10" id="mzaRates">${ASSETS.filter(a => a.k !== 'expenses').map(a => `<div class="mza-rf" id="mzaRf-${a.k}"><label for="mzaR-${a.k}">${a.ic} ${E(a.n)} (% سنويًا)</label><input id="mzaR-${a.k}" type="number" step="0.5" data-rate="${a.k}" value="${RATES[a.k] ?? ''}"><small class="mza-rsrc" id="mzaRs-${a.k}"></small></div>`).join('')}</div>
        </div>
        <div class="mza-actions"><button type="button" class="secondary small mza-clear" data-f="assets">🧹 تفريغ الخانات</button><button type="button" class="mza-go" id="mzaAGo">✨ وزّع واحسب النمو</button></div>
      </div>
      <div class="bs-card mza-form" id="mzaF-check" hidden>
        <div class="mz-note">اكتب استثماراتك الحالية (قطاع أسهم أو نوع أصل + المبلغ). الأداة بتحسب التركيز والخطورة وبتقترح إعادة توزيع. <button type="button" class="gs-link" id="mzaToPort">لتحليل أسهم خططك الفعلية افتح «ميزان محفظتك AI» ↗</button></div>
        <div class="mza-grid"><div><label for="mzaCMkt">بورصة قطاعات الأسهم</label><select id="mzaCMkt">${mk.map(x => `<option>${E(x)}</option>`).join('')}</select></div><div><label>مستوى المخاطرة</label>${seg('mzaCRisk', riskOpts('check'), 'mid')}</div></div>
        <div class="mza-rows" id="mzaCRows"><span class="u-muted u-fs12">جارٍ تحميل القطاعات…</span></div>
        <div class="mza-actions"><button type="button" class="secondary small" id="mzaCAdd">+ إضافة بند</button><button type="button" class="secondary small mza-clear" data-f="check">🧹 تفريغ الخانات</button><button type="button" class="mza-go" id="mzaCGo">🩺 افحص توزيعتي</button></div>
      </div>
      <div class="mza-loading" id="mzaLoading" hidden></div>
      <div id="mzaOut"></div>
      <h2 class="mz-sec-title"><span class="ic">🗂</span> دراساتي المحفوظة</h2>
      <div id="mzaSaved" class="mza-saved"><span class="u-muted u-fs12">جارٍ التحميل…</span></div>
      <p class="bs-foot">${E(CFG.name)} GRIFFINE AI — دراسة آلية تعليمية وليست نصيحة استثمارية. العوائد السابقة أو المتوقعة لا تضمن النتائج المستقبلية.</p>
    </div>`;
    wireForms(__tok);
    loadSaved(__tok);
  };

  function showMode(m){
    MODE = m;
    document.querySelectorAll('.mza-mode').forEach(x => x.classList.toggle('on', x.dataset.m === m));
    ['stocks', 'assets', 'check'].forEach(k => { const f = document.getElementById('mzaF-' + k); if (f) f.hidden = k !== m; });
    const o = document.getElementById('mzaOut'); if (o) o.innerHTML = '';
  }
  function wireForms(tok){
    document.querySelectorAll('.mza-mode').forEach(b => b.onclick = () => showMode(b.dataset.m));
    ['mzaSRisk', 'mzaARisk', 'mzaCRisk'].forEach(id => wireSeg(id));
    const capS = document.getElementById('mzaSCap'), capC = document.getElementById('mzaSCapC');
    capS.onchange = () => { capC.hidden = capS.value !== 'custom'; if (!capC.hidden) { if (!capC.value) capC.value = 60; capC.focus(); } paintRiskSubs(); };
    capC.oninput = paintRiskSubs;
    wireSeg('mzaAType', (v) => { document.getElementById('mzaAMonW').hidden = v !== 'monthly'; document.getElementById('mzaAAmtL').textContent = v === 'monthly' ? 'مبلغ البداية (اختياري)' : 'المبلغ'; const a = document.getElementById('mzaAAmt'); if (v === 'monthly' && +a.value === 100000) a.value = 0; });
    msWire('mzaSEx'); msWire('mzaAEx');
    msFill('mzaAEx', ASSETS.filter(a => a.k !== 'expenses').map(a => [a.k, a.ic + ' ' + a.n]));
    wireRates(tok);
    const sm = document.getElementById('mzaSMkt'), cm = document.getElementById('mzaCMkt');
    const paintEx = async () => { const pop = document.querySelector('#mzaSEx .mza-ms-pop'); pop.innerHTML = '<span class="u-muted u-fs12">جارٍ تحميل قطاعات البورصة وتحليل أكبر شركاتها…</span>';
      try { const S = await loadSectors(sm.value); if (tok && screenStale(tok)) return; msFill('mzaSEx', S.map(s => [s.k, s.n, s.why])); }
      catch(e){ pop.innerHTML = `<span class="bs-err u-fs12">${E(e.message)}</span>`; } };
    const paintRows = async () => { const box = document.getElementById('mzaCRows'); box.innerHTML = '<span class="u-muted u-fs12">جارٍ تحميل القطاعات…</span>';
      let S = []; try { S = await loadSectors(cm.value); } catch(e){}
      if (tok && screenStale(tok)) return;
      box.innerHTML = ''; box._opts = [...S.map(s => ['s:' + s.k, 'أسهم — ' + s.n]), ...ASSETS.filter(a => a.k !== 'stocks').map(a => ['a:' + a.k, a.ic + ' ' + a.n])];
      const pick = (i) => (box._opts[i] || box._opts[0] || [''])[0];
      [[pick(0), 40000], [pick(1), 25000], [pick(2), 15000], ['a:cds', 10000], ['a:expenses', 5000]].forEach(([k, v]) => addRow(k, v)); };
    sm.onchange = paintEx; cm.onchange = paintRows;
    paintEx(); paintRows();
    document.getElementById('mzaCAdd').onclick = () => addRow('', 0);
    // الإصدار 123: تفريغ الخانات — المبالغ فاضية + كل القطاعات/الأصول مسموحة + النتيجة تتمسح
    document.querySelectorAll('.mza-clear').forEach(b => b.onclick = () => {
      const f = document.getElementById('mzaF-' + b.dataset.f); if (!f) return;
      f.querySelectorAll('input[type=number]:not([data-rate])').forEach(i => { i.value = ''; });
      f.querySelectorAll('.mza-ms').forEach(x => msClear(x.id));
      if (b.dataset.f === 'check') { const box = document.getElementById('mzaCRows'); box.innerHTML = ''; addRow('', 0); }
      if (b.dataset.f === 'stocks') { const cs = document.getElementById('mzaSCap'); cs.value = '30'; cs.onchange(); }
      const o = document.getElementById('mzaOut'); if (o) o.innerHTML = ''; LAST = null; LAST_ID = null;
      const first = f.querySelector('input[type=number]'); if (first) first.focus();
      toast('اتفرّغت الخانات');
    });
    document.getElementById('mzaToPort').onclick = () => { if (typeof renderDiversificationReport === 'function') renderDiversificationReport(); };
    document.getElementById('mzaSGo').onclick = () => allocStocks(tok);
    document.getElementById('mzaAGo').onclick = () => allocAssets(tok);
    document.getElementById('mzaCGo').onclick = () => checkMine(tok);
  }
  function addRow(k, v){
    const box = document.getElementById('mzaCRows'); if (!box) return;
    const d = document.createElement('div'); d.className = 'mza-row';
    d.innerHTML = `<select aria-label="البند">${(box._opts || []).map(([x, l]) => `<option value="${E(x)}" ${x === k ? 'selected' : ''}>${E(l)}</option>`).join('')}</select><input type="number" min="0" step="1000" value="${v || ''}" placeholder="المبلغ" aria-label="المبلغ"><button type="button" class="secondary small" aria-label="حذف البند">🗑</button>`;
    d.querySelector('button').onclick = () => d.remove(); box.appendChild(d);
  }
  function loading(steps){
    const box = document.getElementById('mzaLoading'); box.hidden = false;
    box.innerHTML = steps.map(s => `<div class="mz-step" style="opacity:1"><span class="mz-spin"></span>${E(s)}</div>`).join('');
    const o = document.getElementById('mzaOut'); if (o) o.classList.add('mza-dim');
    return () => { box.hidden = true; if (o) o.classList.remove('mza-dim'); };
  }

  /* ---------- 1) قطاعات الأسهم ---------- */
  async function allocStocks(tok){
    const amt = Math.max(0, +document.getElementById('mzaSAmt').value || 0), market = document.getElementById('mzaSMkt').value;
    const max = +document.getElementById('mzaSMax').value, cap = capVal() / 100, r = segVal('mzaSRisk'), hz = +document.getElementById('mzaSHz').value;
    if (amt < 1000) return toast('اكتب مبلغ 1,000 على الأقل', 'err');
    const done = loading(['قراءة قطاعات البورصة وأكبر شركاتها', 'تقييم كل شركة بمحرك بصيرة (المؤشرات + احتمال الصعود + التذبذب)', 'حساب التوزيع حسب المخاطرة وحدود التركيز', 'الذكاء الاصطناعي بيكتب الرأي']);
    let S; try { S = await loadSectors(market); } catch(e){ done(); return toast(e.message, 'err'); }
    if (tok && screenStale(tok)) return;
    const ex = msExcluded('mzaSEx', S.map(s => s.k));
    // الإصدار 123: المخاطرة بتأثر فعلًا — محافظ: حد أقصى أقل لكل قطاع (تنويع أكتر) / مغامر: تركيز أعلى على القطاعات الأقوى
    const capR = r === 'low' ? Math.min(cap, 0.25) : r === 'high' ? Math.min(1, cap + 0.1) : cap;
    const list = splitSectors(S.filter(s => !ex.has(s.k)), r, max, capR);
    if (!list.length) { done(); return toast('استثنيت كل القطاعات — سيب قطاع واحد على الأقل', 'err'); }
    list.forEach(s => { s.amt = amt * s.p / 100; const cos = (r === 'low' ? s.co.slice().sort((x, y) => (x.vol || 0) - (y.vol || 0)).slice(0, 2) : r === 'high' ? s.co.slice().sort((x, y) => (y.up || 0) - (x.up || 0)).slice(0, 3) : s.co.slice(0, 3)), tw = cos.reduce((a, c) => a + Math.max(1, c.score), 0); s.pick = cos.map(c => Object.assign({}, c, { amt: s.amt * Math.max(1, c.score) / tw })); });
    // العائد التقديري: من درجة القطاع (بصيرة) - افتراض تعليمي
    const exp = list.reduce((a, s) => a + s.p / 100 * Math.max(-15, Math.min(35, (s.score - 45) * 0.8)), 0) * hz / 12;
    const hh = list.reduce((a, s) => a + (s.p / 100) ** 2, 0), riskAvg = list.reduce((a, s) => a + s.p / 100 * (RISKW[s.risk] || 2), 0);
    LAST = { mode: 'stocks', market, amt, risk: r, hz, max, cap: Math.round(capR * 100), ex: [...ex].map(k => (S.find(s => s.k === k) || {}).n).filter(Boolean), list, exp, hh, riskAvg, at: new Date().toISOString() };
    LAST_ID = null;
    LAST.rule = ruleStocks(LAST);
    done(); renderOut(LAST, false); askAI(LAST, tok);
  }
  // وزن كل قطاع = درجة بصيرة ± مستوى المخاطرة والاتجاه ← أعلى max قطاع + حد أقصى cap لأي قطاع (مجموعهم 100%)
  function splitSectors(S, r, max, cap){
    let list = S.map(s => { let w = s.score; const rw = RISKW[s.risk] || 2;
      if (r === 'low') w -= (rw - 1) * 8; if (r === 'high') w += (rw - 1) * 6 + (s.trend === 'صاعد' ? 5 : 0); if (s.trend === 'هابط') w -= 10; if (s.trend === 'صاعد') w += 4;
      return Object.assign({}, s, { w: Math.pow(Math.max(3, w - 35), r === 'high' ? 1.6 : r === 'low' ? 0.6 : 1) }); });
    if (!list.length) return list;
    list.sort((a, b) => b.w - a.w); list = list.slice(0, max);
    const capE = Math.max(cap, 1 / list.length);
    const tot = list.reduce((a, s) => a + s.w, 0); list.forEach(s => s.p = s.w / tot);
    for (let it = 0; it < 8; it++) { let extra = 0; list.forEach(s => { if (s.p > capE) { extra += s.p - capE; s.p = capE; } }); const free = list.filter(s => s.p < capE - 1e-9), ft = free.reduce((a, s) => a + s.p, 0); if (!extra || !ft) break; free.forEach(s => s.p += extra * s.p / ft); }
    list.forEach(s => { s.p = Math.round(s.p * 1000) / 10; });
    const diff = Math.round((100 - list.reduce((a, s) => a + s.p, 0)) * 10) / 10; list[0].p = Math.round((list[0].p + diff) * 10) / 10;
    return list;
  }
  function ruleStocks(L){
    return { summary: `بناءً على اتجاه قطاعات ${L.market} الحالي ومستوى المخاطرة «${RL[L.risk]}»، التوزيع بيركّز على القطاعات اللي بتجمع بين اتجاه ${L.list[0] ? L.list[0].trend : ''} ودرجة بصيرة أعلى (${L.list.slice(0, 2).map(s => s.n).join(' و')})، ومعاها قطاعات أهدى بتقلل التذبذب. ${L.ex.length ? `استثنينا ${L.ex.length} قطاع حسب طلبك وأعدنا توزيع نسبهم. ` : ''}متوسط مخاطرة التوزيع ${L.riskAvg < 1.6 ? 'منخفض' : L.riskAvg < 2.3 ? 'متوسط' : 'مرتفع'}، وأقصى قطاع واحد ${Math.max(...L.list.map(s => s.p))}%. يُفضّل الدخول على مراحل بخطط DCA بدل المبلغ كله مرة واحدة، ومراجعة التوزيع كل 3 شهور.`,
      strengths: ['قطاعات مترتبة بدرجة بصيرة الحقيقية لأكبر شركاتها', `تنويع على ${L.list.length} قطاعات`, `حد أقصى ${L.cap}% لأي قطاع`], risks: ['تقلبات أسعار الفائدة والعملة', 'اتجاه القطاع ممكن يتغير بسرعة مع الأخبار', 'العائد التقديري افتراض ممكن ميتحققش'],
      steps: ['ابدأ خطة DCA أو Grid لكل شركة مرشحة من الزرار جنبها', 'ادخل على مراحل خلال شهر أو اتنين', 'راجع التوزيع كل 3 شهور'] };
  }

  /* ---------- الإصدار 130: العوائد السنوية أونلاين (تلقائي كل شهر / حدّث الآن / يدوي محفوظ على الحساب) ---------- */
  let LIVE = null, RU = { mode: 'auto', rates: {} }, RMKT = '', rSaveT = null;
  const RKEYS = () => ASSETS.filter(a => a.k !== 'expenses').map(a => a.k);
  const fmtD = (d) => d ? String(d).slice(0, 10) : '—';
  async function loadRates(market, now){
    const info = document.getElementById('mzaRInfo'); if (info) info.textContent = now ? '⏳ بندوّر على أحدث الأرقام أونلاين…' : 'جارٍ تحميل أحدث العوائد…';
    const r = await apiGet('/mizanai_api.php?action=rates&market=' + encodeURIComponent(market) + (now ? '&now=1' : '')).catch(() => null);
    if (!document.getElementById('mzaRates')) return null;
    if (!r || !r.success) { if (info) info.textContent = (r && r.message) || 'تعذّر تحميل العوائد أونلاين — الأرقام الحالية افتراضية وتقدر تعدّلها.'; return r; }
    RMKT = r.market; LIVE = r.live; RU = { mode: r.user.mode, rates: Object.assign({}, r.user.rates || {}) };
    if (now && RU.mode !== 'auto') { RU.mode = 'auto'; saveRates(true); }
    applyRates(); return r;
  }
  function applyRates(){
    const auto = RU.mode !== 'manual', L = (LIVE && LIVE.rates) || {}, S = (LIVE && LIVE.src) || {};
    document.querySelectorAll('#mzaRMode button').forEach(b => b.classList.toggle('on', b.dataset.v === (auto ? 'auto' : 'manual')));
    RKEYS().forEach(k => {
      const live = L[k] != null ? +L[k] : null, mine = RU.rates[k] != null ? +RU.rates[k] : null;
      const v = auto ? (live != null ? live : mine) : (mine != null ? mine : live);
      RATES[k] = v; const inp = document.getElementById('mzaR-' + k), src = document.getElementById('mzaRs-' + k), box = document.getElementById('mzaRf-' + k);
      if (inp && document.activeElement !== inp) inp.value = v == null ? '' : v;
      if (inp) inp.placeholder = v == null ? 'اكتبها يدوي' : '';
      const miss = v == null;
      if (box) { box.classList.toggle('mza-miss', miss); if (!miss) box.classList.remove('mza-need'); }
      if (src) src.textContent = miss ? '⚠️ مش متاحة في البحث الأونلاين — اكتبها يدوي' : !auto ? '✍️ يدوي — محفوظة على حسابك' : live != null ? '🔄 ' + (S[k] || 'أونلاين') : '✍️ كتبتها انت (مش متاحة أونلاين)';
    });
    const info = document.getElementById('mzaRInfo'); if (!info) return;
    const nm = (LIVE && LIVE.missing || []).length;
    info.innerHTML = auto ? `🔄 <b>تلقائي:</b> بتتحدث أونلاين مجانًا كل ${LIVE ? LIVE.autoDays : 30} يوم — آخر تحديث <b class="n">${E(fmtD(LIVE && LIVE.at))}</b>${LIVE && LIVE.next ? ` — التحديث الجاي <b class="n">${E(LIVE.next)}</b>` : ''}${nm ? ` — <span class="neg">${nm} نسبة مش متاحة أونلاين: اكتبها يدوي</span>` : ''}`
      : `✍️ <b>يدوي:</b> نسبك ثابتة ومحفوظة على حسابك لحد ما تغيّرها — اضغط «⟳ حدّث الآن» أو «تلقائي» عشان ترجع للأرقام الأونلاين.`;
  }
  function saveRates(now){
    clearTimeout(rSaveT);
    const go = () => apiPost('/mizanai_api.php', { action: 'user_rates', market: RMKT || 'مصر', mode: RU.mode, rates: JSON.stringify(RU.rates) }).catch(() => null);
    if (now) return go(); rSaveT = setTimeout(go, 700);
  }
  function wireRates(tok){
    const mk = document.getElementById('mzaAMkt');
    wireSeg('mzaRMode', (v) => {
      if (v === 'manual') { RKEYS().forEach(k => { if (RATES[k] != null) RU.rates[k] = RATES[k]; }); RU.mode = 'manual'; }
      else { RU.mode = 'auto'; RKEYS().forEach(k => { if (LIVE && LIVE.rates && LIVE.rates[k] != null) delete RU.rates[k]; }); }
      applyRates(); saveRates(true);
    });
    document.getElementById('mzaRates').addEventListener('input', (e) => {
      const k = e.target.dataset.rate; if (!k) return; const v = e.target.value === '' ? null : +e.target.value;
      if (RU.mode !== 'manual' && LIVE && LIVE.rates && LIVE.rates[k] != null) {   // تعديل رقم أونلاين ← الوضع بيتحول يدوي (بكل الأرقام الحالية)
        RKEYS().forEach(x => { if (RATES[x] != null) RU.rates[x] = RATES[x]; }); RU.mode = 'manual'; toast('اتحولت للوضع اليدوي — نسبك هتفضل ثابتة ومحفوظة على حسابك');
      }
      if (v == null) delete RU.rates[k]; else RU.rates[k] = v;
      RATES[k] = v; applyRates(); saveRates();
    });
    document.getElementById('mzaRNow').onclick = async () => {
      const b = document.getElementById('mzaRNow'); b.disabled = true;
      const r = await loadRates(mk.value, true); b.disabled = false;
      if (r && r.success) toast(r.live.fresh ? 'اتحدثت العوائد من النت ✓' : r.live.todayDone ? 'العوائد اتحدثت النهارده بالفعل — دي أحدث أرقام' : 'دي أحدث أرقام متاحة');
    };
    mk.addEventListener('change', () => loadRates(mk.value));
    loadRates(mk.value);
  }

  /* ---------- 2) الأصول ---------- */
  async function allocAssets(tok){
    const type = segVal('mzaAType'), amt = Math.max(0, +document.getElementById('mzaAAmt').value || 0), mon = type === 'monthly' ? Math.max(0, +document.getElementById('mzaAMon').value || 0) : 0;
    const hz = +document.getElementById('mzaAHz').value, expP = +document.getElementById('mzaAExp').value, r = segVal('mzaARisk');
    if (amt <= 0 && mon <= 0) return toast('اكتب مبلغ أو مبلغ شهري', 'err');
    const ex = msExcluded('mzaAEx', ASSETS.filter(a => a.k !== 'expenses').map(a => a.k));
    const base = Object.assign({}, CFG.profiles[r] || {}); ex.forEach(k => delete base[k]);
    const t = Object.values(base).reduce((a, b) => a + b, 0); if (!t) return toast('سيب أصل واحد على الأقل', 'err');
    // الإصدار 130: أصل عائده مش متاح أونلاين ومتكتبش يدوي ← لازم المستثمر يكتبه
    const miss = Object.keys(base).filter(k => base[k] > 0 && (RATES[k] == null || RATES[k] === '' || isNaN(RATES[k])));
    if (miss.length) { const a = ASSETS.find(x => x.k === miss[0]); miss.forEach(k => { const f = document.getElementById('mzaRf-' + k); if (f) f.classList.add('mza-miss', 'mza-need'); });
      const i = document.getElementById('mzaR-' + miss[0]); if (i) { i.scrollIntoView({ behavior: 'smooth', block: 'center' }); i.focus(); }
      return toast(`اكتب العائد السنوي لـ «${a ? a.n : miss[0]}» — مش متاح في البحث الأونلاين`, 'err'); }
    const list = Object.keys(base).filter(k => base[k] > 0).map(k => Object.assign({}, ASSETS.find(a => a.k === k), { p: base[k] / t * (100 - expP) }));
    if (expP) list.push(Object.assign({}, ASSETS.find(a => a.k === 'expenses'), { p: expP }));
    list.forEach(a => a.p = Math.round(a.p * 10) / 10);
    const series = [], bal = { base: {}, low: {}, high: {} };
    list.forEach(a => ['base', 'low', 'high'].forEach(s => bal[s][a.k] = amt * a.p / 100));
    for (let m = 0; m <= hz; m++) {
      if (m > 0) list.forEach(a => { const rr = (RATES[a.k] || 0) / 100, v = (a.vol || 0) / 100, R = { base: rr, low: rr - v * 0.8, high: rr + v * 0.6 }; ['base', 'low', 'high'].forEach(s => bal[s][a.k] = bal[s][a.k] * (1 + R[s] / 12) + mon * a.p / 100); });
      const sum = (o) => Object.values(o).reduce((x, y) => x + y, 0);
      series.push({ m, base: sum(bal.base), low: sum(bal.low), high: sum(bal.high), per: Object.assign({}, bal.base) });
    }
    // جزء الأسهم بيتوزع على قطاعات البورصة الحقيقية (بصيرة)
    const st = list.find(a => a.k === 'stocks'), market = document.getElementById('mzaAMkt').value; let secs = [];
    if (st && st.p > 0) { try { const SS = await loadSectors(market); if (tok && screenStale(tok)) return;
      const base0 = (amt || mon) * st.p / 100; secs = splitSectors(SS, r, r === 'low' ? 4 : r === 'high' ? 7 : 6, 0.35).map(s => ({ n: s.n, p: s.p, amt: base0 * s.p / 100, trend: s.trend, risk: s.risk, score: s.score })); } catch(e){} }
    LAST = { mode: 'assets', amt, mon, hz, expP, risk: r, ex: [...ex], list, S: series, invested: amt + mon * hz, rates: Object.assign({}, RATES), market, secs, at: new Date().toISOString() };
    LAST_ID = null; LAST.rule = ruleAssets(LAST);
    renderOut(LAST, false); askAI(LAST, tok);
  }
  function ruleAssets(L){
    const end = L.S[L.S.length - 1];
    return { summary: `التوزيع بيوازن بين أصول بعائد ثابت (شهادات وحسابات بنكية وصناديق نقدية ودخل ثابت) بتحمي رأس المال، وأصول نمو (أسهم وصناديق أسهم وعقار وذهب) بتحمي من التضخم على المدى الطويل، حسب مستوى المخاطرة «${RL[L.risk]}». ${L.mon ? 'التدفق الشهري بيستفيد من متوسط التكلفة (DCA) في الأسهم والذهب. ' : ''}${L.expP ? `سيبنا ${L.expP}% سيولة للمصاريف والطوارئ عشان متضطرش تبيع وقت هبوط. ` : ''}القيمة المتوقعة بعد ${hzLabel(L.hz)} حوالي ${f0(end.base)} في السيناريو الأساسي، وبين ${f0(end.low)} و${f0(end.high)} حسب أداء السوق.`,
      strengths: ['تنويع بين أصول بعائد ثابت وأصول نمو', 'حماية من التضخم بالعقار والذهب', 'سيولة للطوارئ'], risks: ['العوائد افتراضات ممكن تتغير', 'العقار صعب تسييله بسرعة', 'تغيّر أسعار الفائدة بيأثر على الشهادات والأسهم'],
      steps: [L.secs && L.secs.length ? `جزء الأسهم موزّع على ${L.secs.length} قطاعات في ${L.market} — للشركات المرشحة استخدم الوضع الأول` : 'وزّع جزء الأسهم على القطاعات من الوضع الأول', 'ثبّت تحويل شهري تلقائي لو اخترت تدفقات شهرية', 'راجع النسب كل 3 شهور'] };
  }

  /* ---------- 3) الفحص ---------- */
  async function checkMine(tok){
    const market = document.getElementById('mzaCMkt').value, r = segVal('mzaCRisk');
    const rows = [...document.querySelectorAll('#mzaCRows .mza-row')].map(d => ({ k: d.querySelector('select').value, v: +d.querySelector('input').value || 0 })).filter(x => x.v > 0 && x.k);
    if (!rows.length) return toast('اكتب بند واحد على الأقل بمبلغ', 'err');
    let S = []; try { S = await loadSectors(market); } catch(e){}
    if (tok && screenStale(tok)) return;
    const agg = {}; rows.forEach(x => agg[x.k] = (agg[x.k] || 0) + x.v);
    const total = Object.values(agg).reduce((a, b) => a + b, 0);
    const items = Object.entries(agg).map(([k, v]) => { const [t, key] = k.split(':'); const src = t === 's' ? S.find(s => s.k === key) : ASSETS.find(a => a.k === key); if (!src) return null;
      const risk = t === 's' ? (RISKW[src.risk] || 2) + 0.5 : src.risk; return { k, t, key, n: t === 's' ? 'أسهم — ' + src.n : src.n, ic: t === 's' ? '📈' : src.ic, trend: t === 's' ? src.trend : '', v, p: v / total * 100, risk }; }).filter(Boolean).sort((a, b) => b.v - a.v);
    const hhi = items.reduce((a, x) => a + (x.p / 100) ** 2, 0), stocksP = items.filter(x => x.t === 's').reduce((a, x) => a + x.p, 0), cash = items.filter(x => CASH.has(x.key)).reduce((a, x) => a + x.p, 0);
    const riskScore = Math.round(Math.min(100, items.reduce((a, x) => a + x.p * x.risk, 0) / 3.5 + hhi * 60));
    const maxP = r === 'low' ? 25 : r === 'high' ? 35 : 30, alerts = [];
    items.forEach(x => { if (x.p > maxP + 5) alerts.push({ k: 'neg', t: `تركيز عالي في ${x.n} (${f2(x.p)}%)`, d: `أي هبوط فيه هيأثر جامد على المحفظة كلها. المفضّل لمستوى «${RL[r]}» ميعدّيش حوالي ${maxP}%.` }); });
    items.filter(x => x.trend === 'هابط').forEach(x => alerts.push({ k: 'warn', t: `${x.n} في اتجاه هابط`, d: 'متوسط احتمال الصعود لأكبر شركات القطاع ضعيف حاليًا — راجع أسهمه في بصيرة.' }));
    if (cash < 5) alerts.push({ k: 'warn', t: 'مفيش سيولة كفاية للطوارئ', d: 'يُفضّل 5–10% سيولة عشان متضطرش تبيع وقت هبوط.' });
    if (hhi > 0.3) alerts.push({ k: 'neg', t: 'تنويع ضعيف', d: `مؤشر التركيز (HHI) = ${f2(hhi)} — المحفظة معتمدة على بنود قليلة.` });
    const target = { low: 30, mid: 55, high: 75 }[r];
    if (stocksP > target + 15) alerts.push({ k: 'warn', t: `نسبة الأسهم ${f2(stocksP)}% عالية لمستوى «${RL[r]}»`, d: `المعتاد لمستوى المخاطرة ده حوالي ${target}% أو أقل.` });
    if (!alerts.length) alerts.push({ k: 'pos', t: 'توزيعتك متوازنة', d: 'مفيش مراكز خطورة واضحة — راجعها كل 3 شهور.' });
    const tgt = items.map(x => { let p = Math.min(x.p, maxP); if (x.trend === 'هابط') p *= 0.6; return Object.assign({}, x, { tp: p }); });
    if (cash < 5) { const e = tgt.find(x => x.key === 'expenses'); if (e) e.tp = Math.max(e.tp, 8); else tgt.push({ k: 'a:expenses', t: 'a', key: 'expenses', n: 'مصاريف طوارئ (سيولة)', ic: '💵', v: 0, p: 0, risk: 0, tp: 8 }); }
    if (!tgt.some(x => x.key === 'cds') && r !== 'high') tgt.push({ k: 'a:cds', t: 'a', key: 'cds', n: 'شهادات بنكية', ic: '📜', v: 0, p: 0, risk: 1, tp: 10 });
    // المقترح: نسبة الأسهم كلها ميعدّيش المعتاد لمستوى المخاطرة (+10) + ولا بند يعدّي الحد الأقصى — والفرق بيروح للأصول الأهدى
    const isS = (x) => x.t === 's';
    const sS = tgt.filter(isS).reduce((a, x) => a + x.tp, 0), sN = tgt.filter(x => !isS(x)).reduce((a, x) => a + x.tp, 0);
    const stockShare = Math.min(sS / ((sS + sN) || 1) * 100, target + 10);
    tgt.forEach(x => { x.tp = isS(x) ? (sS ? x.tp / sS * stockShare : 0) : (sN ? x.tp / sN * (100 - stockShare) : 0); });
    if (!sN) { tgt.push({ k: 'a:cds', t: 'a', key: 'cds', n: 'شهادات بنكية', ic: '📜', v: 0, p: 0, risk: 1, tp: 100 - stockShare }); }
    for (let it = 0; it < 10; it++) {
      let extra = 0; tgt.forEach(x => { if (x.tp > maxP) { extra += x.tp - maxP; x.tp = maxP; } });
      if (extra < 0.01) break;
      const room = tgt.filter(x => x.tp < maxP - 0.01 && !isS(x)); const pool = room.length ? room : tgt.filter(x => x.tp < maxP - 0.01);
      if (!pool.length) break; const ft = pool.reduce((a, x) => a + (maxP - x.tp), 0);
      pool.forEach(x => { x.tp += extra * (maxP - x.tp) / ft; });
    }
    const ts = tgt.reduce((a, x) => a + x.tp, 0) || 1; tgt.forEach(x => { x.tp = Math.round(x.tp / ts * 1000) / 10; x.tv = total * x.tp / 100; x.diff = x.tv - x.v; });
    const plus = tgt.filter(x => x.diff > total * 0.01).map(x => ({ n: x.n, v: x.diff })), minus = tgt.filter(x => x.diff < -total * 0.01).map(x => ({ n: x.n, v: -x.diff })), moves = [];
    let i = 0, j = 0; while (i < minus.length && j < plus.length) { const v = Math.min(minus[i].v, plus[j].v); moves.push({ from: minus[i].n, to: plus[j].n, v }); minus[i].v -= v; plus[j].v -= v; if (minus[i].v < 1) i++; if (plus[j].v < 1) j++; }
    LAST = { mode: 'check', market, total, items, tgt, hhi, riskScore, alerts, stocksP, cash, risk: r, maxP, moves, at: new Date().toISOString() };
    LAST_ID = null;
    LAST.rule = { summary: `توزيعتك الحالية ${riskScore >= 65 ? 'فيها خطورة عالية' : riskScore >= 45 ? 'متوسطة الخطورة' : 'متوازنة'} (${riskScore} من 100). ${items[0] ? `أكبر بند عندك «${items[0].n}» بنسبة ${f2(items[0].p)}%، ` : ''}والمقترح لمستوى «${RL[r]}» إن مفيش بند يعدّي حوالي ${maxP}% عشان هبوط قطاع واحد ميأثرش على المحفظة كلها، مع سيولة للطوارئ وتقليل القطاعات اللي اتجاهها هابط. التحويل ممكن يتعمل على مراحل خلال شهر أو اتنين.`,
      strengths: ['تقليل التركيز في بند واحد', 'سيولة للطوارئ', 'تقليل القطاعات الهابطة'], risks: ['تكاليف البيع والشراء والضرائب', 'بيع وقت هبوط بيثبّت الخسارة — خليه تدريجي'], steps: ['نفّذ التحويلات على مراحل', 'ابدأ بالبنود الأعلى تركيزًا', 'اعمل فحص تاني بعد 3 شهور'] };
    renderOut(LAST, false); askAI(LAST, tok);
  }

  /* ---------- الذكاء الاصطناعي ---------- */
  function aiSummary(L){
    if (L.mode === 'stocks') return { market: L.market, risk: RL[L.risk], horizon_months: L.hz, amount: Math.round(L.amt), expected_return_pct: +L.exp.toFixed(2), hhi: +L.hh.toFixed(3), excluded_sectors: L.ex,
      sectors: L.list.map(s => ({ sector: s.n, weight_pct: s.p, basira_score: s.score, trend: s.trend, risk: s.risk, up_prob_month: s.up, return_1y_pct: s.y1, companies: s.pick.map(c => c.s + ' ' + c.n + ' (' + c.score + ')') })) };
    if (L.mode === 'assets') { const end = L.S[L.S.length - 1]; return { risk: RL[L.risk], horizon_months: L.hz, lump: Math.round(L.amt), monthly: Math.round(L.mon), expenses_pct: L.expP, invested: Math.round(L.invested), value_base: Math.round(end.base), value_low: Math.round(end.low), value_high: Math.round(end.high),
      assets: L.list.map(a => ({ asset: a.n, weight_pct: a.p, annual_rate_pct: L.rates[a.k] || 0 })), stock_sectors: (L.secs || []).map(s => ({ sector: s.n, pct_of_stocks: s.p, trend: s.trend })) }; }
    return { risk: RL[L.risk], total: Math.round(L.total), risk_score: L.riskScore, hhi: +L.hhi.toFixed(3), stocks_pct: +L.stocksP.toFixed(1), cash_pct: +L.cash.toFixed(1), items: L.items.map(x => ({ item: x.n, pct: +x.p.toFixed(1), trend: x.trend })), suggested: L.tgt.map(x => ({ item: x.n, pct: x.tp })), alerts: L.alerts.map(a => a.t) };
  }
  async function askAI(L, tok){
    if (!CFG.aiReady) return;
    const box = document.getElementById('mzaAi'); if (box) box.classList.add('mza-thinking');
    const r = await apiPost('/mizanai_api.php', { action: 'opinion', mode: L.mode, summary: JSON.stringify(aiSummary(L)) }).catch(() => null);
    if (LAST !== L || (tok && screenStale(tok))) return;
    const b2 = document.getElementById('mzaAi'); if (b2) b2.classList.remove('mza-thinking');
    if (r && r.success && r.ai && r.ai.summary) { L.ai = r.ai; const a = document.getElementById('mzaAiWrap'); if (a) a.innerHTML = aiBlock(L); }
    else if (r && r.message) { const n = document.getElementById('mzaAiNote'); if (n) n.textContent = '(' + r.message + ')'; }
  }
  function aiBlock(L){
    const o = L.ai || L.rule || {}, isAi = !!L.ai;
    return `<h2 class="mz-sec-title"><span class="ic">🤖</span> ${isAi ? 'رأي الذكاء الاصطناعي' : 'تحليل محرك GRIFFINE'} <span class="bs-chip ${isAi ? 'bs-c-gold' : 'bs-c-neu'}">${isAi ? '✨ AI' : '⚙️ قواعد'}</span></h2>
      <div class="bs-card mz-ai" id="mzaAi"><p>${E(o.summary)}</p>
        <div class="mz-two mz-two-flat"><div><b class="pos">نقاط القوة</b><ul>${(o.strengths || []).map(x => `<li>${E(x)}</li>`).join('')}</ul></div><div><b class="neg">مخاطر تنتبه لها</b><ul>${(o.risks || []).map(x => `<li>${E(x)}</li>`).join('')}</ul></div></div>
        ${(o.steps || []).length ? `<b>خطوات التنفيذ</b><div class="mz-moves">${o.steps.map(x => `<div class="mz-mv"><span>✅</span><span>${E(x)}</span></div>`).join('')}</div>` : ''}
        <small class="u-muted" id="mzaAiNote"></small></div>`;
  }

  /* ===================== رسم النتيجة ===================== */
  function renderOut(L, readOnly, box){
    const out = box || document.getElementById('mzaOut'); if (!out) return;
    let html = '';
    if (L.mode === 'stocks') {
      const parts = L.list.map((s, i) => ({ l: s.n, v: s.p, c: COLORS[i % COLORS.length] }));
      html = `<div class="mz-kpis">${kpi('المبلغ', f0(L.amt))}${kpi('عدد القطاعات', L.list.length)}${kpi(`العائد التقديري خلال ${hzLabel(L.hz)}`, (L.exp >= 0 ? '+' : '') + f2(L.exp) + '%', L.exp >= 0 ? 'pos' : 'neg')}${kpi('درجة التنويع', L.hh < 0.2 ? 'ممتازة' : L.hh < 0.3 ? 'جيدة' : 'ضعيفة', L.hh < 0.2 ? 'pos' : L.hh < 0.3 ? 'warn' : 'neg')}</div>
      <div class="mz-two"><div class="bs-card"><h3 class="mz-h">🥧 توزيع المبلغ على القطاعات</h3><div class="mz-donut-wrap">${donut(parts, f0(L.amt), 'المبلغ')}${legend(parts)}</div></div>
        <div class="bs-card"><h3 class="mz-h">🧾 جدول التوزيع — ${E(L.market)}</h3><table class="mza-table g-no-enh"><thead><tr><th>القطاع</th><th>النسبة</th><th>المبلغ</th><th>الاتجاه</th><th>المخاطرة</th><th>درجة بصيرة</th></tr></thead><tbody>
          ${L.list.map((s, i) => `<tr><td>${E(s.n)}</td><td><div class="mza-pbar"><div class="mz-bar"><i style="width:${Math.min(100, s.p / Math.max(30, L.cap) * 100)}%;background:${COLORS[i % COLORS.length]}"></i></div><b class="n">${s.p}%</b></div></td><td class="n">${f0(s.amt)}</td>
            <td><span class="bs-chip ${s.trend === 'صاعد' ? 'bs-c-pos' : s.trend === 'هابط' ? 'bs-c-neg' : 'bs-c-neu'}">${s.trend}</span></td><td><span class="bs-chip ${s.risk === 'منخفض' ? 'bs-c-pos' : s.risk === 'مرتفع' ? 'bs-c-neg' : 'bs-c-gold'}">${s.risk}</span></td><td class="n">${s.score}</td></tr>`).join('')}
          </tbody><tfoot><tr><td>الإجمالي</td><td class="n">100%</td><td class="n">${f0(L.amt)}</td><td colspan="3"></td></tr></tfoot></table></div></div>
      <h2 class="mz-sec-title"><span class="ic">🏢</span> الشركات المرشحة في كل قطاع <span class="bs-chip bs-c-gold">دوس على أي شركة ← تحليلها الكامل في بصيرة</span></h2>
      <div class="mza-sectors">${L.list.map((s, i) => `<div class="mza-sc" style="--c:${COLORS[i % COLORS.length]}"><h4>${E(s.n)} <span class="bs-chip bs-c-gold">${s.p}%</span></h4><div class="mza-amt">المبلغ: <b class="n">${f0(s.amt)}</b> — اتجاه ${s.trend} — مخاطرة ${s.risk}</div><p>${E(s.why)}</p>
        ${s.pick.map(c => `<div class="mza-co"><button type="button" class="mza-co-open" data-s="${E(c.s)}" data-coname="${E(c.n)}"><span class="av">${E(c.s.slice(0, 6))}</span><span class="mza-co-t"><b class="g-coname">${E(c.n)}</b><b class="mza-co-sym">${E(c.s)}</b><small>درجة بصيرة ${c.score}/100 • احتمال الصعود خلال شهر ${c.up}% • خطة مقترحة: ${c.plan}</small></span><span class="mza-co-a"><b class="n">${f0(c.amt)}</b><span class="go">🔮 التفاصيل ↗</span></span></button>
          ${readOnly ? '' : `<button type="button" class="small mza-plan" data-s="${E(c.s)}" data-t="${c.plan}" data-a="${Math.round(c.amt)}" data-p="${c.last || ''}">+ ابدأ خطة ${c.plan}</button>`}</div>`).join('')}</div>`).join('')}</div>
      <div class="mz-note u-mt10">كل شركة ليها نوع خطة مقترح: <b>DCA</b> للشركات الأهدى على المدى الطويل (تعزيز متوسط مع الهبوط)، و<b>Grid</b> للأسهم المتذبذبة في نطاق (شراء وبيع على مستويات). المبلغ المقترح لكل شركة بيتحط كرأس مال الخطة.</div>`;
    } else if (L.mode === 'assets') {
      const end = L.S[L.S.length - 1], gain = end.base - L.invested, parts = L.list.map((a, i) => ({ l: a.n, v: a.p, c: COLORS[i % COLORS.length] }));
      html = `<div class="mz-kpis">${kpi('إجمالي المستثمَر', f0(L.invested))}${kpi(`القيمة المتوقعة بعد ${hzLabel(L.hz)}`, f0(end.base), 'pos')}${kpi('الربح المتوقع', (gain >= 0 ? '+' : '') + f0(gain) + ` (${f2(gain / (L.invested || 1) * 100)}%)`, gain >= 0 ? 'pos' : 'neg')}${kpi('النطاق (متشائم — متفائل)', f0(end.low) + ' — ' + f0(end.high))}</div>
      <div class="mz-two"><div class="bs-card"><h3 class="mz-h">🥧 توزيع ${L.mon ? 'المبلغ والتدفق الشهري' : 'المبلغ'}</h3><div class="mz-donut-wrap">${donut(parts, L.mon ? f0(L.mon) + '/شهر' : f0(L.amt), L.mon ? 'شهريًا' : 'المبلغ')}${legend(parts)}</div></div>
        <div class="bs-card"><h3 class="mz-h">📈 نمو المحفظة شهر بشهر</h3><svg class="mza-grow" viewBox="0 0 1000 280" preserveAspectRatio="none">${growSvg(L)}</svg>
          <div class="mza-glg"><span><i style="background:#D4AF37"></i> أساسي</span><span><i style="background:var(--gs-pos,#0E9F6E)"></i> متفائل</span><span><i style="background:var(--gs-neg,#DC2626)"></i> متشائم</span><span><i style="background:#94A3B8"></i> المستثمَر</span></div></div></div>
      <div class="bs-card u-mt10"><h3 class="mz-h">🧾 تفاصيل كل أصل</h3><table class="mza-table g-no-enh"><thead><tr><th>الأصل</th><th>النسبة</th><th>${L.mon ? 'المبلغ الشهري' : 'المبلغ'}</th><th>العائد السنوي المفترض</th><th>القيمة بعد ${hzLabel(L.hz)}</th><th>الربح</th><th>المخاطرة</th></tr></thead><tbody>
        ${L.list.map(a => { const inv = (L.amt + L.mon * L.hz) * a.p / 100, fv = end.per[a.k] || 0; return `<tr><td>${a.ic} ${E(a.n)}</td><td class="n">${a.p}%</td><td class="n">${f0((L.mon || L.amt) * a.p / 100)}</td><td class="n">${f2(L.rates[a.k] || 0)}%</td><td class="n">${f0(fv)}</td><td class="n ${fv - inv >= 0 ? 'pos' : 'neg'}">${fv - inv >= 0 ? '+' : ''}${f0(fv - inv)}</td><td><span class="bs-chip ${a.risk <= 1 ? 'bs-c-pos' : a.risk === 2 ? 'bs-c-gold' : 'bs-c-neg'}">${['بدون', 'منخفضة', 'متوسطة', 'مرتفعة'][a.risk]}</span></td></tr>`; }).join('')}
        </tbody><tfoot><tr><td>الإجمالي</td><td class="n">100%</td><td class="n">${f0(L.mon || L.amt)}</td><td></td><td class="n">${f0(end.base)}</td><td class="n ${gain >= 0 ? 'pos' : 'neg'}">${gain >= 0 ? '+' : ''}${f0(gain)}</td><td></td></tr></tfoot></table>${(L.secs || []).length ? `<h3 class="mz-h u-mt10">📈 توزيع جزء الأسهم على قطاعات ${E(L.market)}</h3><table class="mza-table g-no-enh"><thead><tr><th>القطاع</th><th>من جزء الأسهم</th><th>${L.mon ? 'المبلغ الشهري' : 'المبلغ'}</th><th>الاتجاه</th><th>المخاطرة</th><th>درجة بصيرة</th></tr></thead><tbody>${L.secs.map(s => `<tr><td>${E(s.n)}</td><td class="n">${s.p}%</td><td class="n">${f0(s.amt)}</td><td><span class="bs-chip ${s.trend === 'صاعد' ? 'bs-c-pos' : s.trend === 'هابط' ? 'bs-c-neg' : 'bs-c-neu'}">${E(s.trend)}</span></td><td><span class="bs-chip ${s.risk === 'منخفض' ? 'bs-c-pos' : s.risk === 'مرتفع' ? 'bs-c-neg' : 'bs-c-gold'}">${E(s.risk)}</span></td><td class="n">${s.score}</td></tr>`).join('')}</tbody></table>` : ''}
        ${!readOnly && L.list.some(a => a.k === 'stocks') ? `<div class="mz-note u-mt10">📊 جزء الأسهم (${L.list.find(a => a.k === 'stocks').p}%) تقدر توزّعه على القطاعات والشركات — <button type="button" class="small mza-to-stocks" id="mzaToStocks">وزّع جزء الأسهم على القطاعات ←</button></div>` : ''}</div>`;
    } else {
      const rc = L.riskScore >= 65 ? 'neg' : L.riskScore >= 45 ? 'warn' : 'pos';
      const mx = Math.max(...L.tgt.map(x => Math.max(x.p, x.tp)), 1);
      html = `<div class="mz-two"><div class="bs-card"><h3 class="mz-h">🩺 درجة خطورة المحفظة</h3>
          <div class="mz-risk"><svg class="mz-gauge" viewBox="0 0 150 92" aria-hidden="true">${gauge(L.riskScore)}</svg><div class="mz-risk-txt"><h3 class="${rc}">${L.riskScore >= 65 ? 'خطورة عالية' : L.riskScore >= 45 ? 'خطورة متوسطة' : 'خطورة منخفضة'}</h3>
            <div class="mz-sub">الإجمالي <b class="n">${f0(L.total)}</b> • التركيز HHI <b class="n">${f2(L.hhi)}</b> • أسهم <b class="n">${f2(L.stocksP)}%</b> • سيولة <b class="n">${f2(L.cash)}%</b></div></div></div>
          <h3 class="mz-h u-mt10">🚨 مراكز الخطورة</h3><div class="mz-alerts">${L.alerts.map(a => `<div class="mz-al k-${a.k}"><span class="d">${a.k === 'pos' ? '✅' : a.k === 'neg' ? '⛔' : '⚠️'}</span><div><b>${E(a.t)}</b><small>${E(a.d)}</small></div></div>`).join('')}</div></div>
        <div class="bs-card"><h3 class="mz-h">⚖️ الحالي مقابل المقترح</h3><div class="mza-cmp">${L.tgt.map(x => `<div class="mza-cmprow"><span class="mza-cmpn">${E(x.n.replace('أسهم — ', ''))}</span><div class="mza-cmpb"><div><i class="cur" style="width:${x.p / mx * 100}%"></i><small class="n">${f2(x.p)}%</small></div><div><i class="tgt" style="width:${x.tp / mx * 100}%"></i><small class="n">${f2(x.tp)}%</small></div></div></div>`).join('')}</div>
          <div class="mza-glg"><span><i style="background:#94A3B8"></i> الحالي</span><span><i style="background:#D4AF37"></i> المقترح</span></div></div></div>
      <h2 class="mz-sec-title"><span class="ic">🔁</span> خطوات إعادة التوزيع</h2>
      <div class="bs-card"><table class="mza-table g-no-enh"><thead><tr><th>البند</th><th>الحالي</th><th>المقترح</th><th>المطلوب</th></tr></thead><tbody>
        ${L.tgt.map(x => { const same = Math.abs(x.diff) < L.total * 0.01; return `<tr><td>${x.ic} ${E(x.n)}</td><td class="n">${f0(x.v)} (${f2(x.p)}%)</td><td class="n">${f0(x.tv)} (${f2(x.tp)}%)</td><td class="${same ? 'u-muted' : x.diff > 0 ? 'pos' : 'neg'}">${same ? 'زي ما هو' : (x.diff > 0 ? '⬆ زوّد ' : '⬇ قلّل ') + '<b class="n">' + f0(Math.abs(x.diff)) + '</b>'}</td></tr>`; }).join('')}
      </tbody></table><div class="mz-moves u-mt10">${L.moves.map(m => `<div class="mz-mv"><span>🔁</span><span>انقل <b class="n">${f0(m.v)}</b> من <b>${E(m.from)}</b> إلى <b>${E(m.to)}</b></span></div>`).join('') || '<div class="u-muted">مفيش تحويلات مطلوبة.</div>'}</div></div>`;
    }
    html += `<div id="mzaAiWrap">${aiBlock(L)}</div>
      <h2 class="mz-sec-title"><span class="ic">🎓</span> الأسس المالية المستخدمة</h2>
      <div class="mz-sci">
        <div><b>نظرية المحفظة الحديثة (ماركويتز)</b>التنويع بين أصول وقطاعات مش مرتبطة ببعض بيقلل المخاطرة من غير ما يقلل العائد المتوقع بنفس القدر.</div>
        <div><b>مؤشر التركيز (HHI)</b>مجموع مربعات النسب — أقل من 0.2 ممتاز، أكبر من 0.3 ضعيف.</div>
        <div><b>توزيع الأصول حسب المخاطرة</b>نسبة الأسهم والأصول الثابتة بتتحدد حسب تحملك للمخاطرة ومدة الاستثمار.</div>
        <div><b>الفائدة المركبة وDCA</b>النمو شهر بشهر لكل أصل، والشراء على مراحل بيقلل أثر توقيت الدخول.</div>
      </div>
      ${readOnly ? '' : `<div class="mza-actions mza-outacts"><button type="button" class="mza-go" id="mzaSave">💾 حفظ الدراسة</button><button type="button" class="secondary small" id="mzaPdf">🖨 تقرير PDF</button><button type="button" class="secondary small" id="mzaShare">🔗 مشاركة</button><button type="button" class="secondary small" id="mzaEdit">✏️ تعديل المدخلات</button></div>`}`;
    out.innerHTML = html;
    if (typeof gLabelCells === 'function') out.querySelectorAll('table.mza-table').forEach(gLabelCells);   // الإصدار 123: كروت على الموبايل
    out.querySelectorAll('.mza-co-open').forEach(b => b.onclick = () => { if (typeof window.renderBasira === 'function') window.renderBasira(b.dataset.s, L.market); });
    if (readOnly) return;
    out.querySelectorAll('.mza-plan').forEach(b => b.onclick = () => { const pf = { symbol: b.dataset.s, market: L.market, capital: +b.dataset.a || undefined, price: +b.dataset.p || undefined };
      if (b.dataset.t === 'Grid') { window.__prefillGridPlan = pf; renderGridPlanForm(); } else { window.__prefillPlan = pf; renderNewPlanForm(); } });
    const ts = document.getElementById('mzaToStocks'); if (ts) ts.onclick = () => { const st = L.list.find(a => a.k === 'stocks'); showMode('stocks'); document.getElementById('mzaSAmt').value = Math.round(((L.amt || 0) + L.mon * L.hz) * st.p / 100); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    document.getElementById('mzaSave').onclick = () => saveStudy();
    document.getElementById('mzaPdf').onclick = () => printStudy(LAST);
    document.getElementById('mzaShare').onclick = () => shareStudy();
    document.getElementById('mzaEdit').onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function growSvg(L){
    const S = L.S, W = 1000, H = 280, pad = 16, mx = Math.max(...S.map(s => s.high)) * 1.03, mn = Math.min(L.amt || 0, ...S.map(s => s.low)) * 0.97;
    const x = (i) => S.length > 1 ? i / (S.length - 1) * W : W / 2, y = (v) => pad + (1 - (v - mn) / ((mx - mn) || 1)) * (H - pad * 2);
    const path = (arr) => arr.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1)).join('');
    let g = ''; for (let k = 0; k <= 4; k++) { const yy = pad + k / 4 * (H - pad * 2); g += `<line x1="0" x2="${W}" y1="${yy}" y2="${yy}" stroke="currentColor" opacity=".08" vector-effect="non-scaling-stroke"/>`; }
    g += `<path d="${path(S.map(s => s.high))}${S.slice().reverse().map((s, j) => 'L' + x(S.length - 1 - j).toFixed(1) + ',' + y(s.low).toFixed(1)).join('')}Z" fill="#D4AF37" opacity=".13"/>`;
    g += `<path d="${path(S.map((s, i) => (L.amt || 0) + L.mon * i))}" fill="none" stroke="#94A3B8" stroke-width="1.4" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>`;
    g += `<path d="${path(S.map(s => s.low))}" fill="none" stroke="var(--gs-neg,#DC2626)" stroke-width="1.5" vector-effect="non-scaling-stroke"/><path d="${path(S.map(s => s.high))}" fill="none" stroke="var(--gs-pos,#0E9F6E)" stroke-width="1.5" vector-effect="non-scaling-stroke"/><path d="${path(S.map(s => s.base))}" fill="none" stroke="#D4AF37" stroke-width="2.6" vector-effect="non-scaling-stroke"/>`;
    return g;
  }

  /* ===================== الحفظ / المشاركة / PDF ===================== */
  const titleOf = (L) => L.mode === 'stocks' ? `توزيع ${f0(L.amt)} على ${L.list.length} قطاعات (${L.market})` : L.mode === 'assets' ? `توزيع شامل ${L.mon ? f0(L.mon) + ' شهريًا' : f0(L.amt)} لمدة ${hzLabel(L.hz)}` : `فحص توزيعة ${f0(L.total)} — خطورة ${L.riskScore}`;
  async function saveStudy(){
    if (!LAST) return;
    if (LAST_ID) { toast('الدراسة دي محفوظة بالفعل ✅'); return LAST_ID; }
    const r = await apiPost('/mizanai_api.php', { action: 'save', mode: LAST.mode, title: titleOf(LAST), data: JSON.stringify(LAST) }).catch(() => null);
    if (!r || !r.success) { toast((r && r.message) || 'تعذّر الحفظ', 'err'); return null; }
    LAST_ID = r.id; toast('اتحفظت الدراسة في «دراساتي المحفوظة» ✅'); loadSaved(null); return r.id;
  }
  async function shareStudy(id){
    if (!CFG.shareOn) return toast('المشاركة مقفولة من الإدارة', 'err');
    id = id || LAST_ID || await saveStudy(); if (!id) return;
    const r = await apiPost('/mizanai_api.php', { action: 'share', id }).catch(() => null);
    if (!r || !r.success) return toast((r && r.message) || 'تعذّر إنشاء الرابط', 'err');
    const url = location.origin + '/' + r.url;
    try { if (navigator.share) { await navigator.share({ title: 'دراسة ميزان GRIFFINE AI', text: 'دراسة توزيع استثمار — دراسة آلية وليست نصيحة استثمارية', url }); return; } } catch(e){ return; }
    try { await navigator.clipboard.writeText(url); toast('اتنسخ رابط المشاركة ✅'); } catch(e){ prompt('رابط المشاركة:', url); }
  }
  async function loadSaved(tok){
    const box = document.getElementById('mzaSaved'); if (!box) return;
    const r = await apiGet('/mizanai_api.php?action=list').catch(() => null);
    if (tok && screenStale(tok)) return;
    const b = document.getElementById('mzaSaved'); if (!b) return;
    if (!r || !r.success) { b.innerHTML = `<span class="u-muted u-fs12">${E((r && r.message) || 'تعذّر التحميل.')}</span>`; return; }
    const ic = { stocks: '📊 قطاعات', assets: '🏦 أصول', check: '🩺 فحص' };
    b.innerHTML = r.items.length ? r.items.map(x => `<div class="mza-sv"><span class="bs-chip bs-c-gold">${ic[x.mode] || x.mode}</span><div class="mza-svt"><b>${E(x.title)}</b><small>${E(String(x.at).slice(0, 16))}${x.shared ? ' • 🔗 متشاركة' : ''}</small></div>
        <div class="mza-svb"><button type="button" class="small" data-o="${x.id}">فتح</button><button type="button" class="small secondary" data-sh="${x.id}">🔗</button><button type="button" class="small secondary" data-d="${x.id}" aria-label="حذف">🗑</button></div></div>`).join('')
      : '<div class="u-muted u-fs12">لسه مفيش دراسات محفوظة — اعمل دراسة ودوس «💾 حفظ الدراسة».</div>';
    b.querySelectorAll('[data-o]').forEach(x => x.onclick = async () => { const g = await apiGet('/mizanai_api.php?action=get&id=' + x.dataset.o).catch(() => null);
      if (!g || !g.success) return toast((g && g.message) || 'تعذّر الفتح', 'err');
      showMode(g.mode); LAST = g.study; LAST_ID = g.id; renderOut(LAST, false); window.scrollTo({ top: document.getElementById('mzaOut').offsetTop - 80, behavior: 'smooth' }); });
    b.querySelectorAll('[data-sh]').forEach(x => x.onclick = () => shareStudy(+x.dataset.sh));
    b.querySelectorAll('[data-d]').forEach(x => x.onclick = async () => { if (typeof gConfirm === 'function' && !(await gConfirm('نقل الدراسة لسلة المحذوفات؟'))) return;
      const d = await apiPost('/mizanai_api.php', { action: 'delete', id: x.dataset.d }).catch(() => null);
      if (d && d.success) { if (LAST_ID === +x.dataset.d) LAST_ID = null; toast('اتنقلت لسلة المحذوفات'); loadSaved(null); } else toast((d && d.message) || 'تعذّر الحذف', 'err'); });
  }
  function printStudy(L){
    if (!L) return;
    const w = window.open('', '_blank'); if (!w) { toast('المتصفح منع فتح نافذة التقرير — اسمح بالنوافذ المنبثقة', 'err'); return; }
    const box = document.createElement('div'); renderOut(L, true, box);
    const o = L.ai || L.rule || {};
    const tables = [...box.querySelectorAll('table')].map(t => t.outerHTML).join('<br>');
    const kp = [...box.querySelectorAll('.mz-kpi')].map(k => `<div><span>${E(k.querySelector('span').textContent)}</span><b>${E(k.querySelector('b').textContent)}</b></div>`).join('');
    const extra = L.mode === 'stocks' ? `<h2>الشركات المرشحة</h2><table><thead><tr><th>القطاع</th><th>الشركة</th><th>درجة بصيرة</th><th>الخطة</th><th>المبلغ</th></tr></thead><tbody>${L.list.flatMap(s => s.pick.map(c => `<tr><td>${E(s.n)}</td><td>${E(c.s)} — ${E(c.n)}</td><td>${c.score}</td><td>${c.plan}</td><td>${f0(c.amt)}</td></tr>`)).join('')}</tbody></table>`
      : L.mode === 'check' ? `<h2>مراكز الخطورة</h2><ul>${L.alerts.map(a => `<li><b>${E(a.t)}:</b> ${E(a.d)}</li>`).join('')}</ul>${L.moves.length ? '<h2>التحويلات المقترحة</h2><ul>' + L.moves.map(m => `<li>انقل ${f0(m.v)} من ${E(m.from)} إلى ${E(m.to)}</li>`).join('') + '</ul>' : ''}` : '';
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>${E(CFG ? CFG.name : 'ميزان')} GRIFFINE AI — ${E(titleOf(L))}</title>
      <style>body{font-family:IBM Plex Sans Arabic,Tahoma,sans-serif;padding:24px;color:#111;background:#fff}h1{margin:0 0 4px;font-size:22px}h2{font-size:16px;margin:20px 0 8px;border-bottom:2px solid #eee;padding-bottom:6px}
      table{width:100%;border-collapse:collapse;font-size:12.5px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:right}th{background:#f3f4f6}.n{direction:ltr;unicode-bidi:plaintext}.pos{color:#15803d}.neg{color:#b91c1c}
      .kv{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.kv div{background:#f8fafc;border:1px solid #eee;border-radius:8px;padding:8px;text-align:center}.kv span{display:block;font-size:11px;color:#666}.mz-bar{display:none}
      .disc{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;font-size:12px;margin:10px 0}p{line-height:1.8;font-size:13.5px}li{font-size:13px;margin-bottom:3px}</style></head><body>
      <h1>${E(CFG ? CFG.name : 'ميزان')} GRIFFINE AI — ${E(titleOf(L))}</h1><div style="color:#555;font-size:13px">${E(new Date(L.at).toLocaleString('ar-EG'))} — مستوى المخاطرة: ${RL[L.risk]}</div>
      <div class="disc">⚠️ ${E(CFG ? CFG.disclaimer : '')}</div>${kp ? `<div class="kv">${kp}</div>` : ''}<h2>الأرقام</h2>${tables}${extra}
      <h2>${L.ai ? 'رأي الذكاء الاصطناعي' : 'تحليل محرك GRIFFINE'}</h2><p>${E(o.summary)}</p>
      <table><thead><tr><th class="pos">نقاط القوة</th><th class="neg">المخاطر</th></tr></thead><tbody><tr><td><ul>${(o.strengths || []).map(x => `<li>${E(x)}</li>`).join('')}</ul></td><td><ul>${(o.risks || []).map(x => `<li>${E(x)}</li>`).join('')}</ul></td></tr></tbody></table>
      ${(o.steps || []).length ? `<h2>خطوات التنفيذ</h2><ul>${o.steps.map(x => `<li>${E(x)}</li>`).join('')}</ul>` : ''}
      <div class="disc">دراسة آلية تعليمية — مش نصيحة استثمارية. العوائد المتوقعة افتراضات.</div></body></html>`);
    w.document.close(); if (typeof gReportReady === 'function') gReportReady(w);
  }

  /* ===================== دراسة متشاركة ===================== */
  window.renderMizanAiShared = async function(token){
    const __tok = screenToken();
    const r = await apiGet('/mizanai_api.php?action=shared&t=' + encodeURIComponent(token)).catch(() => null);
    if (screenStale(__tok)) return;
    if (!r || !r.success) { app.innerHTML = `<div class="container">${logoHeader()}<div class="bs-card bs-gate"><h2>⚖️ ميزان GRIFFINE AI</h2><p>${E((r && r.message) || 'تعذّر فتح الدراسة.')}</p></div></div>`; return; }
    CFG = Object.assign({ shareOn: false, aiReady: false }, r.config);
    app.innerHTML = `<div class="container wide bs-screen mz-screen mza-screen">${logoHeader()}<span class="gs-page-title" hidden>${E(CFG.name)} GRIFFINE AI — دراسة متشاركة</span>
      <div class="bs-top"><div class="bs-brand"><div class="bs-logo" aria-hidden="true">⚖</div><div><h1>${E(CFG.name)} <span>GRIFFINE AI</span></h1><p>${E(r.title)} — ${E(String(r.savedAt).slice(0, 16))}</p></div></div><span class="bs-chip bs-c-neu">🔗 دراسة متشاركة (للقراءة)</span></div>
      <div class="bs-disc" role="note">⚠️ <div><b>تنويه:</b> ${E(CFG.disclaimer)}</div></div><div id="mzaOut"></div></div>`;
    renderOut(r.study, true);
  };

  /* ===================== لوحة التحكم ===================== */
  window.renderAdminMizanAi = async function(){
    const __tok = screenToken();
    pushNav(() => window.renderAdminMizanAi());
    const r = await apiGet('/mizanai_api.php?action=admin_get').catch(() => null);
    if (screenStale(__tok)) return;
    if (!r || !r.success) { app.innerHTML = `<div class="container">${logoHeader()}<div class="error">${E((r && r.message) || 'غير مصرح.')}</div></div>`; return; }
    const c = r.config, A = ASSETS.filter(a => a.k !== 'expenses');
    app.innerHTML = `<div class="container wide bs-admin">${logoHeader()}<span class="gs-page-title" hidden>ميزان GRIFFINE AI (الإعدادات)</span>
      <div class="topbar"><div><b>⚖️ ميزان GRIFFINE AI — الإعدادات</b></div><button type="button" class="secondary small" id="mzaBack">🛡️ رجوع للوحة التحكم</button></div>
      ${r.ready ? '' : '<div class="error">شغّل ALL_SCHEMA_UPDATES.sql (الإصدار 122) عشان حفظ الدراسات يشتغل.</div>'}
      <div class="info">رأي الذكاء الاصطناعي بيستخدم مفتاح وموديل «تحليلات بصيرة AI» ${r.aiKey ? '(المفتاح متسجّل ✅)' : '(المفتاح مش متسجّل — الرأي هيتكتب بالقواعد)'}. إخفاء الشاشة عن العملاء من «الإعدادات الإلزامية».</div>
      <div class="section-card mza-adm">
        <div><label for="mzaa_name">اسم الشاشة</label><input id="mzaa_name" value="${E(c.name)}"></div>
        <div class="wide"><label for="mzaa_disc">التنويه</label><textarea id="mzaa_disc" rows="3">${E(c.disclaimer)}</textarea></div>
        <label class="u-check"><input type="checkbox" id="mzaa_ai" ${c.ai_on ? 'checked' : ''}> رأي الذكاء الاصطناعي على الدراسات</label>
        <label class="u-check"><input type="checkbox" id="mzaa_share" ${c.share_on ? 'checked' : ''}> مشاركة الدراسات برابط</label>
        <div><label for="mzaa_save">أقصى دراسات محفوظة لكل مستخدم</label><input type="number" id="mzaa_save" min="5" max="200" value="${c.save_max}"></div>
        <div><label for="mzaa_secs">أقصى عدد قطاعات تتحلل</label><input type="number" id="mzaa_secs" min="4" max="20" value="${c.sectors_max}"></div>
        <div><label for="mzaa_per">شركات مرشحة لكل قطاع</label><input type="number" id="mzaa_per" min="1" max="5" value="${c.per_sector}"></div>
      </div>
      <h3>🔄 تحديث العوائد أونلاين (مجاني) — الإصدار 130</h3>
      <div id="mzaRatesAdm"><div class="gs-skel" style="height:120px"></div></div>
      <h3>العوائد المبدئية لكل أصل (%) <small class="u-muted u-fs12">— بتظهر بس لحد ما الأرقام الأونلاين تتحمّل</small></h3>
      <div class="section-card mza-adm">${A.map(a => `<div><label>${a.ic} ${E(a.n)}</label><input type="number" step="0.5" data-rate="${a.k}" value="${c.rates[a.k]}"></div>`).join('')}</div>
      <h3>نسب الأصول لكل مستوى مخاطرة (%)</h3>
      <div class="section-card u-ox"><table class="std-table g-no-enh"><thead><tr><th>الأصل</th><th>محافظ</th><th>متوازن</th><th>مغامر</th></tr></thead><tbody>${A.map(a => `<tr><td>${a.ic} ${E(a.n)}</td>${['low', 'mid', 'high'].map(rk => `<td><input type="number" min="0" max="100" step="1" data-prof="${rk}|${a.k}" value="${c.profiles[rk][a.k]}" style="max-width:90px"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="mza-actions"><button type="button" id="mzaaSave">💾 حفظ الإعدادات</button><button type="button" class="secondary" id="mzaaReset">↩ الافتراضي</button><span id="mzaaMsg" class="u-fs12"></span></div></div>`;
    document.getElementById('mzaBack').onclick = () => renderAdminHub();
    const v = (id) => document.getElementById(id);
    v('mzaaSave').onclick = async () => {
      const rates = {}, profiles = { low: {}, mid: {}, high: {} };
      document.querySelectorAll('[data-rate]').forEach(i => rates[i.dataset.rate] = +i.value || 0);
      document.querySelectorAll('[data-prof]').forEach(i => { const [rk, k] = i.dataset.prof.split('|'); profiles[rk][k] = +i.value || 0; });
      const cfg = { name: v('mzaa_name').value, disclaimer: v('mzaa_disc').value, ai_on: v('mzaa_ai').checked, share_on: v('mzaa_share').checked, save_max: +v('mzaa_save').value || 50, sectors_max: +v('mzaa_secs').value || 12, per_sector: +v('mzaa_per').value || 3, rates, profiles };
      const s = await apiPost('/mizanai_api.php', { action: 'admin_save', config: JSON.stringify(cfg) }).catch(() => null);
      v('mzaaMsg').textContent = s && s.success ? '✅ اتحفظت' : ((s && s.message) || 'تعذّر الحفظ'); v('mzaaMsg').className = 'u-fs12 ' + (s && s.success ? 'pos' : 'neg');
    };
    v('mzaaReset').onclick = async () => { const s = await apiPost('/mizanai_api.php', { action: 'admin_save', config: 'null' }).catch(() => null); if (s && s.success) window.renderAdminMizanAi(); };
    adminRates(__tok);
  };
  // الإصدار 130: إعدادات تحديث العوائد أونلاين + آخر أرقام لكل سوق + «حدّث الآن» + سجل التحديثات
  async function adminRates(tok){
    const box = document.getElementById('mzaRatesAdm'); if (!box) return;
    const r = await apiGet('/mizanai_api.php?action=admin_rates_get').catch(() => null);
    if ((tok && screenStale(tok)) || !document.getElementById('mzaRatesAdm')) return;
    if (!r || !r.success) { box.innerHTML = `<div class="error">${E((r && r.message) || 'تعذّر التحميل')}</div>`; return; }
    const c = r.config, A = ASSETS.filter(a => a.k !== 'expenses'), nm = (k) => { const a = ASSETS.find(x => x.k === k); return a ? a.ic + ' ' + a.n : k; };
    const num = (id, l, val, tip) => `<div><label for="${id}">${E(l)} ${tip ? gTipI(tip) : ''}</label><input id="${id}" type="number" step="0.5" value="${E(val)}"></div>`;
    const TR = { auto: 'تلقائي', now: 'حدّث الآن (مستثمر)', admin: 'الأدمن' };
    box.innerHTML = `${r.ready ? '' : '<div class="error">شغّل ALL_SCHEMA_UPDATES.sql (الإصدار 130) أولًا.</div>'}
      <div class="info">كل الأرقام من مصادر مجانية: مؤشر البورصة (الأسهم وصناديق الأسهم) — سعر الذهب بالعملة المحلية — سعر الفائدة من صفحة البنك المركزي ± الفروق اللي تحت. أي رقم مش متاح بيتطلب من المستثمر يكتبه يدوي. «حدّث الآن» عند المستثمر بيعمل بحث جديد مرة واحدة في اليوم لكل سوق.</div>
      <div class="section-card mza-adm">
        ${num('mzr_days', 'التحديث التلقائي كل (يوم)', c.auto_days)}${num('mzr_fee', 'مصاريف صناديق الأسهم % (بتتخصم من عائد المؤشر)', c.fund_fee)}
        ${num('mzr_re', 'تقدير عائد العقار % (فاضي = المستثمر يكتبه)', c.re_est, 'مفيش مصدر مجاني موثوق لعائد العقار')}
        ${num('mzr_cds', 'الشهادات = سعر الفائدة ±', c.sp_cds)}${num('mzr_sav', 'حساب التوفير = سعر الفائدة ±', c.sp_savings)}${num('mzr_daily', 'الحساب اليومي = سعر الفائدة ±', c.sp_daily)}
        ${num('mzr_money', 'الصناديق النقدية = سعر الفائدة ±', c.sp_money)}${num('mzr_fixed', 'صناديق الدخل الثابت = سعر الفائدة ±', c.sp_fixed)}
      </div>
      <div class="section-card u-ox"><table class="std-table g-no-enh mzr-mk"><thead><tr><th>السوق</th><th>رمز المؤشر</th><th>صفحة البنك المركزي</th><th>الكلمة جنب سعر الفائدة</th><th>سعر فائدة احتياطي %</th><th>آخر أرقام</th><th></th></tr></thead><tbody>
        ${r.markets.map(m => { const x = c.markets[m] || {}, L = r.live[m]; return `<tr data-m="${E(m)}"><td><b>${E(m)}</b></td><td><input data-f="index" dir="ltr" value="${E(x.index || '')}"></td><td><input data-f="url" dir="ltr" value="${E(x.url || '')}" placeholder="https://..."></td><td><input data-f="kw" dir="ltr" value="${E(x.kw || '')}"></td><td><input data-f="fb" type="number" step="0.25" value="${E(x.fb || '')}" placeholder="لو الصفحة ماتفتحتش"></td>
          <td class="u-fs12">${L ? `${E(L.at)}${L.policy != null ? ` — فائدة ${L.policy}%` : ''}<br>${A.map(a => `${nm(a.k)}: <b class="n">${L.rates[a.k] == null ? '—' : L.rates[a.k] + '%'}</b>`).join(' · ')}` : '<span class="u-muted">لسه ما اتحدثش</span>'}</td>
          <td><button type="button" class="small u-wa" data-now="${E(m)}">⟳ حدّث الآن</button></td></tr>`; }).join('')}</tbody></table></div>
      <div class="mza-actions"><button type="button" id="mzrSave">💾 حفظ إعدادات التحديث</button><button type="button" class="secondary" id="mzrReset">↩ الافتراضي</button><span id="mzrMsg" class="u-fs12"></span></div>
      <h4>📜 سجل التحديثات</h4>
      <div class="section-card u-ox">${r.log.length ? `<table class="std-table g-no-enh"><thead><tr><th>الوقت</th><th>السوق</th><th>بواسطة</th><th>التغيير</th></tr></thead><tbody>${r.log.map(l => `<tr><td class="n">${E(l.at)}</td><td>${E(l.market)}</td><td>${E(TR[l.trigger] || l.trigger)}${l.by ? `<br><small>${E(l.by)}</small>` : ''}</td><td class="u-fs12">${A.map(a => { const o = l.old ? l.old[a.k] : null, n = l.new ? l.new[a.k] : null; return o === n ? '' : `${nm(a.k)}: ${o == null ? '—' : o} ← <b>${n == null ? '—' : n}</b>`; }).filter(Boolean).join(' · ') || 'من غير تغيير'}</td></tr>`).join('')}</tbody></table>` : '<span class="u-muted u-fs12">لسه مفيش تحديثات.</span>'}</div>`;
    const g = (id) => +document.getElementById(id).value;
    document.getElementById('mzrSave').onclick = async () => {
      const markets = {}; box.querySelectorAll('tr[data-m]').forEach(tr => { const o = {}; tr.querySelectorAll('[data-f]').forEach(i => o[i.dataset.f] = i.value.trim()); markets[tr.dataset.m] = o; });
      const cfg = { auto_days: g('mzr_days'), fund_fee: g('mzr_fee'), re_est: document.getElementById('mzr_re').value.trim(), sp_cds: g('mzr_cds'), sp_savings: g('mzr_sav'), sp_daily: g('mzr_daily'), sp_money: g('mzr_money'), sp_fixed: g('mzr_fixed'), markets };
      const s = await apiPost('/mizanai_api.php', { action: 'admin_rates_save', config: JSON.stringify(cfg) }).catch(() => null);
      const m = document.getElementById('mzrMsg'); m.textContent = s && s.success ? '✅ اتحفظت' : ((s && s.message) || 'تعذّر الحفظ'); m.className = 'u-fs12 ' + (s && s.success ? 'pos' : 'neg');
    };
    document.getElementById('mzrReset').onclick = async () => { if (!await gConfirm('رجوع إعدادات التحديث للافتراضي؟')) return; await apiPost('/mizanai_api.php', { action: 'admin_rates_save', config: 'null' }).catch(() => null); adminRates(); };
    box.querySelectorAll('[data-now]').forEach(b => b.onclick = async () => { b.disabled = true; b.textContent = '⏳'; const x = await apiPost('/mizanai_api.php', { action: 'admin_rates_now', market: b.dataset.now }).catch(() => null);
      toast(x && x.success ? `اتحدثت عوائد ${b.dataset.now} ✓${x.missing.length ? ` — ${x.missing.length} نسبة مش متاحة` : ''}` : ((x && x.message) || 'تعذّر التحديث'), x && x.success ? 'ok' : 'err'); adminRates(); });
  }
})();
