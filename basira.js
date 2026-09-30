/* =====================================================================
   GRIFFINE — basira.js (الإصدار 114) — «بصيرة GRIFFINE AI»: شاشة التحليل الذكي لأي سهم
   ---------------------------------------------------------------------
   renderBasira(symbol?, market?)  ← الشاشة: اختيار البورصة والسهم (أو من قائمة المتابعة) ← تحليل كامل:
       الاتجاه العام + التوقع لكل فترة (أسبوع ... سنة) + الرسم البياني والتقاطعات + 12 مؤشر + الدعم والمقاومة
       + رأي الذكاء الاصطناعي والسيناريوهات + الموقف العام + الأخبار (كل خبر بيفتح مصدره)
       + حفظ / PDF / مشاركة / حذف (سلة المحذوفات) + فتح خطة DCA أو Grid للسهم
   renderBasiraShared(token)       ← تحليل متشارك (للقراءة بس - من غير تسجيل دخول)
   renderAdminBasira()             ← لوحة التحكم «تحليلات بصيرة AI» (الاسم / التنويه / مفتاح Claude / الموديل / الأخبار / الفترات / الأسماء العربية)
   gArName(symbol, market)         ← اسم السهم بالعربي (القائمة الجاهزة + اللي الأدمن أضافه) - بيظهر عند الوقوف على أي سهم
   تحليل آلي - مش نصيحة استثمارية.
   ===================================================================== */
(function(){
  'use strict';
  /* ---------- أسماء الأسهم بالعربي: من السيرفر (basira_names.json + اللي الأدمن أضافه من «تحليلات بصيرة AI») ---------- */
  let AR = {};
  const MKTS = ['مصر', 'السعودية', 'الإمارات', 'قطر', 'الكويت'];
  let CFG = null, CUR = null, CUR_ID = null, RANGE = 132, SHOW = { s20: true, s50: true, s200: true, bb: false };
  window.gArName = function(sym, market){
    const s = String(sym || '').toUpperCase(), cust = AR['*'] || {};
    if (cust[s]) return cust[s];
    if (market && AR[market] && AR[market][s]) return AR[market][s];
    for (const m of MKTS) if (AR[m] && AR[m][s]) return AR[m][s];
    return '';
  };
  const E = (s) => escapeHtml(String(s == null ? '' : s));
  const n2 = (v) => (v == null || !isFinite(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (v) => (v == null || !isFinite(v)) ? '—' : (v > 0 ? '+' : '') + Number(v).toFixed(2) + '%';
  const cls = (v) => v > 0 ? 'pos' : v < 0 ? 'neg' : '';
  const vk = (score) => score >= 58 ? 'pos' : score <= 42 ? 'neg' : 'neu';
  const toast = (m, k) => { if (window.GShell && GShell.toast) GShell.toast(m, k || 'ok'); };
  const allowedMkts = () => { try { const a = window.gAllowedMarkets && window.gAllowedMarkets(); if (a && a.length) return a; } catch(e){} return MKTS; };
  async function loadCfg(force){
    if (CFG && !force) return CFG;
    const r = await apiGet('/basira_api.php?action=config').catch(() => null);
    if (r && r.success) { CFG = r.config; AR = CFG.names || {}; CFG.__ready = r.ready; }
    return r;
  }

  /* ===================== الشاشة ===================== */
  window.renderBasira = async function(sym, market){
    const __tok = screenToken();
    pushNav(() => window.renderBasira(sym, market));
    const email = await getSession(); if (!email) return renderLogin();
    if (!(await ensureAccess())) return;
    const r = await loadCfg(true);
    if (screenStale(__tok)) return;
    if (!r || !r.success) {
      app.innerHTML = `<div class="container">${logoHeader()}<div class="bs-card bs-gate"><h2>🔮 بصيرة AI</h2><p>${E((r && r.message) || 'تعذّر تحميل الشاشة.')}</p>
        ${r && r.requiresSubscription ? '<button type="button" class="u-wa" id="bsSub">الاشتراك والباقات</button>' : ''}</div></div>`;
      const b = document.getElementById('bsSub'); if (b) b.onclick = () => renderSubscriptionPlans();
      return;
    }
    const mk = allowedMkts(), m0 = mk.includes(market) ? market : mk[0];
    window.__lastPageKey = 'basira';
    app.innerHTML = `<div class="container wide bs-screen">${logoHeader()}<span class="gs-page-title" hidden>${E(CFG.name)} AI — تحليل الأسهم</span>
      <div class="bs-top"><div class="bs-brand"><div class="bs-logo" aria-hidden="true">ب</div><div><h1>${E(CFG.name)} <span>GRIFFINE AI</span></h1><p>${E(CFG.tagline)}</p></div></div>
        <span class="bs-chip ${CFG.aiReady ? 'bs-c-gold' : 'bs-c-neu'}" title="${CFG.aiReady ? 'الرأي بيتكتب بالذكاء الاصطناعي' : 'الرأي بيتكتب بالمحرك الآلي من المؤشرات'}">${CFG.aiReady ? '✨ مدعوم بالذكاء الاصطناعي' : '⚙️ محرك تحليل آلي'}</span></div>
      <div class="bs-disc" role="note">⚠️ <div><b>تنويه:</b> ${E(CFG.disclaimer)}</div></div>
      ${CFG.scanOn ? `<div class="bs-tabs" role="tablist"><button type="button" role="tab" id="bsTabOne" class="on" aria-selected="true">🔍 تحليل سهم</button><button type="button" role="tab" id="bsTabScan" aria-selected="false">📊 مسح السوق — الأسهم المتوقع صعودها</button></div>
      <div id="bsScanWrap" hidden></div>` : ''}
      <div class="bs-card bs-pick" id="bsOneWrap">
        <div class="bs-pickrow">
          <div><label for="bsMkt">البورصة</label><select id="bsMkt">${mk.map(x => `<option ${x === m0 ? 'selected' : ''}>${E(x)}</option>`).join('')}</select></div>
          <div class="bs-symwrap"><label for="bsSym">رمز السهم</label><input id="bsSym" autocomplete="off" placeholder="اكتب رمز السهم أو اسمه (مثال: COMI أو التجاري)" value="${E(sym || '')}" aria-autocomplete="list" aria-controls="bsSug"><div class="bs-sug" id="bsSug" role="listbox" hidden></div></div>
          <button type="button" class="bs-go" id="bsGo">✨ حلّل السهم الآن</button>
        </div>
        <div class="bs-wl"><span class="bs-lbl">من قائمة المتابعة:</span><span id="bsWl" class="bs-wlchips"><span class="u-muted u-fs12">جارٍ التحميل…</span></span></div>
        <div class="bs-loading" id="bsLoading" hidden></div>
      </div>
      <div id="bsReport"></div>
      <h2 class="bs-sec"><span class="bs-ic">🗂</span> تحليلاتي المحفوظة</h2>
      <div id="bsSaved" class="bs-saved"><span class="u-muted u-fs12">جارٍ التحميل…</span></div>
      <p class="bs-foot">${E(CFG.name)} GRIFFINE AI — تحليل آلي تعليمي وليس نصيحة استثمارية. الأداء السابق لا يضمن النتائج المستقبلية.</p>
    </div>`;
    wirePicker(__tok);
    if (CFG.scanOn) wireScanTabs(__tok, m0);
    loadWatch(__tok); loadSaved(__tok);
    if (sym) analyze(sym, m0, false, __tok);
  };

  /* ===================== الإصدار 118: مسح السوق =====================
     كل أسهم البورصة (أو قطاع) ← نفس محرك بصيرة لكل سهم ← ترتيب حسب احتمال الصعود في الفترة المختارة
     بالدفعات (10 أسهم كل طلب) مع شريط تقدّم وإيقاف - والضغط على أي سهم بيفتح تحليله الكامل */
  const HZ = [['week', 'أسبوع'], ['month', 'شهر'], ['3m', '3 شهور'], ['6m', '6 شهور'], ['year', 'سنة']];
  let SCAN = { items: [], total: 0, run: 0, hz: 'month', market: '', sector: '', sort: 'up', dir: -1 };
  // الإصدار 120: أعمدة جدول المسح (lock = مبيتخفاش) + إظهار/إخفاء محفوظ على الجهاز + الجدول جوه الصفحة من غير تمرير يمين وشمال
  const SC_COLS = [
    { k: 'n', l: '#', lock: true }, { k: 'sym', l: 'السهم', lock: true, sort: 'sym' }, { k: 'sec', l: 'القطاع', sort: 'sec' },
    { k: 'px', l: 'آخر سعر / اليوم', sort: 'chg' }, { k: 'up', l: 'احتمال الصعود', lock: true, sort: 'up' }, { k: 'v', l: 'التوقع' },
    { k: 'rng', l: 'النطاق المتوقع', off: true }, { k: 'sc', l: 'درجة الاتجاه', sort: 'score' }, { k: 'y1', l: 'عائد سنة', sort: 'y1' }, { k: 'go', l: '', lock: true }];
  const SC_KEY = 'bs_scan_cols_v1';
  function scHidden(){
    try { const v = JSON.parse(localStorage.getItem(SC_KEY) || 'null'); if (Array.isArray(v)) return v; } catch(e){}
    return SC_COLS.filter(c => c.off || (window.innerWidth < 700 && ['sec', 'sc', 'y1'].includes(c.k))).map(c => c.k);
  }
  function scApplyCols(){
    const t = document.getElementById('bsScTable'); if (!t) return;
    const hid = scHidden(); SC_COLS.forEach(c => t.classList.toggle('bs-hc-' + c.k, hid.includes(c.k)));
    const b = document.getElementById('bsColHid'); if (b) b.textContent = hid.length ? `(${hid.length} مخفي)` : '';
    const m = document.getElementById('bsColMenu');
    if (m) m.innerHTML = SC_COLS.filter(c => !c.lock).map(c => `<label><input type="checkbox" data-k="${c.k}" ${hid.includes(c.k) ? '' : 'checked'}> ${E(c.l)}</label>`).join('') + '<button type="button" class="bs-colall">إظهار كل الأعمدة</button>';
  }
  function scWireCols(){
    const btn = document.getElementById('bsColBtn'), m = document.getElementById('bsColMenu'); if (!btn || btn._w) return; btn._w = 1;
    btn.onclick = (e) => { e.stopPropagation(); m.hidden = !m.hidden; btn.setAttribute('aria-expanded', String(!m.hidden)); };
    m.addEventListener('click', (e) => e.stopPropagation());
    m.addEventListener('change', (e) => { const k = e.target.dataset.k; if (!k) return; let h = scHidden(); h = e.target.checked ? h.filter(x => x !== k) : [...new Set([...h, k])]; try { localStorage.setItem(SC_KEY, JSON.stringify(h)); } catch(e2){} scApplyCols(); m.hidden = false; });
    m.addEventListener('click', (e) => { if (!e.target.closest('.bs-colall')) return; try { localStorage.setItem(SC_KEY, '[]'); } catch(e2){} scApplyCols(); });
    document.addEventListener('click', () => { m.hidden = true; btn.setAttribute('aria-expanded', 'false'); });
    document.querySelectorAll('#bsScTable th[data-sort]').forEach(th => { const go = () => { const k = th.dataset.sort; if (SCAN.sort === k) SCAN.dir *= -1; else { SCAN.sort = k; SCAN.dir = (k === 'sym' || k === 'sec') ? 1 : -1; } paintScan(); };
      th.onclick = go; th.onkeydown = (e) => { if (e.key === 'Enter') go(); }; });
    scApplyCols();
  }
  function wireScanTabs(tok, m0){
    const one = document.getElementById('bsTabOne'), sc = document.getElementById('bsTabScan');
    const show = (scan) => {
      one.classList.toggle('on', !scan); sc.classList.toggle('on', scan); one.setAttribute('aria-selected', String(!scan)); sc.setAttribute('aria-selected', String(scan));
      document.getElementById('bsScanWrap').hidden = !scan; document.getElementById('bsOneWrap').hidden = scan;
      const rep = document.getElementById('bsReport'); if (rep) rep.hidden = scan;
      if (scan && !document.getElementById('bsScTable')) buildScan(tok, m0);
    };
    one.onclick = () => show(false); sc.onclick = () => show(true);
    window.__bsShowSingle = () => show(false);
  }
  async function buildScan(tok, m0){
    const wrap = document.getElementById('bsScanWrap'), mk = allowedMkts();
    const hz = HZ.filter(([k]) => !CFG.horizons || CFG.horizons[k] !== false);
    if (!hz.find(([k]) => k === SCAN.hz)) SCAN.hz = (hz[1] || hz[0] || ['month'])[0];
    wrap.innerHTML = `<div class="bs-card bs-scan">
      <div class="bs-scrow">
        <div><label for="bsScMkt">البورصة</label><select id="bsScMkt">${mk.map(x => `<option ${x === m0 ? 'selected' : ''}>${E(x)}</option>`).join('')}</select></div>
        <div><label for="bsScSec">القطاع</label><select id="bsScSec"><option value="">كل البورصة</option></select></div>
        <div><label>الأسهم المتوقع صعودها خلال</label><div class="bs-seg" id="bsScHz">${hz.map(([k, l]) => `<button type="button" data-k="${k}" class="${k === SCAN.hz ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <div class="bs-scbtns"><button type="button" class="bs-go" id="bsScGo">📊 ابدأ المسح</button><button type="button" class="secondary small" id="bsScStop" hidden>⏹ إيقاف</button></div>
      </div>
      <div class="bs-scprog" id="bsScProg" hidden><div class="bs-scbar"><i id="bsScBar"></i></div><small id="bsScTxt"></small></div>
      <small class="u-muted bs-scnote">كل سهم بيتحلل بنفس محرك بصيرة (12 مؤشر + التقاطعات + الدعم والمقاومة + التذبذب). الأسهم اللي اتحللت بالكامل قريب بتاخد تعديل الذكاء الاصطناعي. اضغط على أي سهم لتحليله الكامل.</small>
    </div>
    <div id="bsScTop"></div>
    <div class="bs-card" id="bsScRes" hidden>
      <div class="bs-sctools"><span class="u-muted u-fs12" id="bsScCount"></span>
        <span class="bs-colbox"><button type="button" class="bs-colbtn" id="bsColBtn" aria-haspopup="true" aria-expanded="false">👁 إظهار / إخفاء الأعمدة <b id="bsColHid"></b></button><div class="bs-colmenu" id="bsColMenu" hidden></div></span></div>
      <div class="bs-scbody"><table id="bsScTable" class="bs-sctable g-no-enh"><thead><tr>${SC_COLS.map(c => `<th data-col="${c.k}"${c.sort ? ` data-sort="${c.sort}" tabindex="0" title="ترتيب"` : ''}>${c.k === 'up' ? '<span id="bsScHzTh">احتمال الصعود</span>' : c.l}${c.sort ? '<i class="bs-sorti"></i>' : ''}</th>`).join('')}</tr></thead><tbody></tbody></table></div></div>`;
    const mkt = document.getElementById('bsScMkt'), sec = document.getElementById('bsScSec');
    const loadSecs = async () => {
      sec.innerHTML = '<option value="">كل البورصة</option>';
      const r = await apiGet(`/basira_api.php?action=scan&market=${encodeURIComponent(mkt.value)}&limit=0`).catch(() => null);
      if (tok && screenStale(tok)) return;
      if (r && r.success) sec.innerHTML = `<option value="">كل البورصة (${r.total} سهم)</option>` + r.sectors.map(x => `<option value="${E(x.name)}">${E(x.name)} (${x.n})</option>`).join('');
    };
    mkt.onchange = () => { SCAN.run++; loadSecs(); };
    document.querySelectorAll('#bsScHz button').forEach(b => b.onclick = () => { SCAN.hz = b.dataset.k; document.querySelectorAll('#bsScHz button').forEach(x => x.classList.toggle('on', x === b)); paintScan(); });
    scWireCols();
    document.getElementById('bsScGo').onclick = () => runScan(tok);
    document.getElementById('bsScStop').onclick = () => { SCAN.run++; scanDone('اتوقف المسح — النتايج اللي اتحللت ظاهرة تحت.'); };
    await loadSecs();
  }
  function scanDone(msg){
    const st = document.getElementById('bsScStop'), go = document.getElementById('bsScGo'), t = document.getElementById('bsScTxt');
    if (st) st.hidden = true; if (go) go.disabled = false; if (t && msg) t.textContent = msg;
  }
  async function runScan(tok){
    const my = ++SCAN.run, mkt = document.getElementById('bsScMkt').value, sector = document.getElementById('bsScSec').value;
    SCAN.items = []; SCAN.total = 0; SCAN.market = mkt; SCAN.sector = sector;
    document.getElementById('bsScGo').disabled = true; document.getElementById('bsScStop').hidden = false;
    document.getElementById('bsScProg').hidden = false; document.getElementById('bsScRes').hidden = false;
    const bar = document.getElementById('bsScBar'), txt = document.getElementById('bsScTxt');
    txt.textContent = 'جارٍ تحميل قائمة الأسهم…'; bar.style.width = '0%'; paintScan();
    let off = 0, fails = 0;
    while (true) {
      const r = await apiGet(`/basira_api.php?action=scan&market=${encodeURIComponent(mkt)}&sector=${encodeURIComponent(sector)}&offset=${off}&limit=10`).catch(() => null);
      if (my !== SCAN.run || (tok && screenStale(tok))) return;
      if (!r || !r.success) { if (++fails > 2) { scanDone((r && r.message) || 'تعذّر إكمال المسح — حاول تاني.'); return; } continue; }
      SCAN.total = r.total; SCAN.items = SCAN.items.concat(r.items.filter(x => x.ok)); off += r.items.length;
      const p = r.total ? Math.min(100, off / r.total * 100) : 100;
      bar.style.width = p.toFixed(1) + '%'; txt.textContent = `تم تحليل ${off} من ${r.total} سهم${sector ? ' في «' + sector + '»' : ''}…`;
      paintScan();
      if (!r.items.length || off >= r.total) break;
    }
    scanDone(`✅ اكتمل المسح: ${SCAN.items.length} سهم متحلل${SCAN.total - SCAN.items.length > 0 ? ` (${SCAN.total - SCAN.items.length} مفيش ليهم بيانات كفاية)` : ''} — مترتبين حسب احتمال الصعود خلال ${(HZ.find(h => h[0] === SCAN.hz) || [0, ''])[1]}.`);
  }
  function paintScan(){
    const tb = document.querySelector('#bsScTable tbody'); if (!tb) return;
    const hl = (HZ.find(h => h[0] === SCAN.hz) || [0, ''])[1];
    const th = document.getElementById('bsScHzTh'); if (th) th.textContent = `احتمال الصعود (${hl})`;
    const up = (x) => (x.hz && x.hz[SCAN.hz] ? x.hz[SCAN.hz].up : 0);
    const val = { up, sym: (x) => x.symbol, sec: (x) => x.sector || '', chg: (x) => x.chg || 0, score: (x) => x.score || 0, y1: (x) => (x.y1 == null ? -1e9 : x.y1) };
    const f = val[SCAN.sort] || up;
    const L = SCAN.items.slice().sort((a, b) => { const A = f(a), B = f(b); const c = typeof A === 'string' ? A.localeCompare(B, 'ar') : A - B; return c * SCAN.dir || up(b) - up(a) || b.score - a.score; });
    document.querySelectorAll('#bsScTable th[data-sort]').forEach(th => { th.classList.toggle('on', th.dataset.sort === SCAN.sort); th.classList.toggle('asc', th.dataset.sort === SCAN.sort && SCAN.dir > 0); });
    const cnt = document.getElementById('bsScCount'); if (cnt) cnt.textContent = SCAN.items.length ? `${SCAN.items.length} سهم — اضغط على عنوان العمود للترتيب` : '';
    tb.innerHTML = L.map((x, i) => { const h = x.hz[SCAN.hz] || {}, u = h.up || 0, v = u >= 58 ? 'pos' : u <= 42 ? 'neg' : 'neu', ar = x.ar || gArName(x.symbol, SCAN.market);
      return `<tr class="bs-scr" data-s="${E(x.symbol)}" tabindex="0" title="${E(x.symbol)} — ${E(ar || x.name)}"><td data-col="n" class="n">${i + 1}</td>
        <td data-col="sym"><b class="n">${E(x.symbol)}</b>${x.src === 'ai' ? ' <span class="bs-chip bs-c-gold" title="فيه تعديل الذكاء الاصطناعي">AI</span>' : ''}<small class="bs-scname">${E(ar || x.name)}</small></td>
        <td data-col="sec"><span class="bs-scsec">${E(x.sector)}</span></td><td data-col="px"><span class="n">${n2(x.last)}</span><small class="n ${cls(x.chg)}">${pct(x.chg)}</small></td>
        <td data-col="up"><div class="bs-scup"><div class="bs-scbar sm"><i class="${v}" style="width:${u}%"></i></div><b class="n ${v}">${u}%</b></div></td>
        <td data-col="v"><span class="bs-chip ${v === 'pos' ? 'bs-c-pos' : v === 'neg' ? 'bs-c-neg' : 'bs-c-neu'}">${u >= 58 ? 'صعود محتمل' : u <= 42 ? 'هبوط محتمل' : 'عرضي'}</span></td>
        <td data-col="rng" class="n">${h.lo != null ? n2(h.lo) + ' — ' + n2(h.hi) : '—'}</td><td data-col="sc" class="n ${vk(x.score)}">${x.score}</td><td data-col="y1" class="n ${cls(x.y1)}">${pct(x.y1)}</td>
        <td data-col="go"><button type="button" class="secondary small bs-scopen" data-s="${E(x.symbol)}" title="التحليل الكامل" aria-label="التحليل الكامل لـ ${E(x.symbol)}">↗</button></td></tr>`; }).join('') || `<tr><td colspan="10" class="u-muted">لسه مفيش نتايج…</td></tr>`;
    scApplyCols();
    const open = (s) => { if (window.__bsShowSingle) window.__bsShowSingle(); const inp = document.getElementById('bsSym'), mk = document.getElementById('bsMkt'); if (inp) inp.value = s; if (mk) mk.value = SCAN.market; window.scrollTo({ top: 0, behavior: 'smooth' }); analyze(s, SCAN.market, false, null); };
    tb.querySelectorAll('tr.bs-scr').forEach(r => { r.onclick = (e) => { open(r.dataset.s); }; r.onkeydown = (e) => { if (e.key === 'Enter') open(r.dataset.s); }; });
    // أفضل 3 للفترة
    const top = document.getElementById('bsScTop');
    if (top) top.innerHTML = L.length >= 3 ? `<h2 class="bs-sec"><span class="bs-ic">🏆</span> الأعلى احتمالًا للصعود خلال ${hl}${SCAN.sector ? ' — ' + E(SCAN.sector) : ''}</h2><div class="bs-sctop">${L.slice(0, 3).map((x, i) => { const u = up(x); return `<button type="button" class="bs-sctc" data-s="${E(x.symbol)}"><span class="bs-scrank">${i + 1}</span><b class="n">${E(x.symbol)}</b><small>${E(x.ar || gArName(x.symbol, SCAN.market) || x.name)}</small><span class="bs-scpct ${u >= 58 ? 'pos' : u <= 42 ? 'neg' : 'neu'}">${u}%</span><small class="u-muted">${E(x.sector)}</small></button>`; }).join('')}</div>` : '';
    if (top) top.querySelectorAll('.bs-sctc').forEach(b => b.onclick = () => open(b.dataset.s));
  }

  function wirePicker(tok){
    const inp = document.getElementById('bsSym'), sug = document.getElementById('bsSug'), mkt = document.getElementById('bsMkt');
    const tip = () => { const a = gArName(inp.value.trim(), mkt.value); inp.title = a ? `${inp.value.trim().toUpperCase()} — ${a}` : ''; };
    const list = () => {
      const q = inp.value.trim().toLowerCase(), m = mkt.value, base = Object.assign({}, AR[m] || {}, AR['*'] || {});
      const items = Object.keys(base).map(s => [s, gArName(s, m)]).filter(([s, a]) => !q || s.toLowerCase().includes(q) || a.toLowerCase().includes(q)).slice(0, 12);
      if (!items.length || document.activeElement !== inp) { sug.hidden = true; return; }
      sug.innerHTML = items.map(([s, a]) => `<button type="button" role="option" data-s="${E(s)}" title="${E(s)} — ${E(a)}"><b>${E(s)}</b><span>${E(a)}</span></button>`).join('');
      sug.hidden = false;
    };
    inp.addEventListener('input', () => { tip(); list(); });
    inp.addEventListener('focus', list);
    inp.addEventListener('blur', () => setTimeout(() => { sug.hidden = true; }, 180));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sug.hidden = true; analyze(inp.value, mkt.value, false, tok); } if (e.key === 'Escape') sug.hidden = true; });
    sug.addEventListener('mousedown', (e) => { const b = e.target.closest('[data-s]'); if (!b) return; e.preventDefault(); inp.value = b.dataset.s; tip(); sug.hidden = true; analyze(b.dataset.s, mkt.value, false, tok); });
    mkt.addEventListener('change', tip);
    document.getElementById('bsGo').onclick = () => analyze(inp.value, mkt.value, false, tok);
    tip();
  }
  async function loadWatch(tok){
    const r = await apiGet('/basira_api.php?action=watch').catch(() => null);
    if (tok && screenStale(tok)) return;
    const el = document.getElementById('bsWl'); if (!el) return;
    const items = (r && r.success && r.items) || [];
    if (!items.length) { el.innerHTML = '<span class="u-muted u-fs12">قائمة المتابعة فاضية — ضيف أسهم من «قائمة المتابعة» عشان تتحلل هنا تلقائيًا.</span>'; return; }
    el.innerHTML = items.map(x => { const a = gArName(x.symbol, x.market);
      return `<button type="button" class="bs-wlc bs-wl-${x.ok ? vk(x.score) : 'neu'}" data-s="${E(x.symbol)}" data-m="${E(x.market)}" title="${E(x.symbol)}${a ? ' — ' + E(a) : ''}${x.ok ? ' • ' + E(x.verdict) + ' (' + x.score + '/100)' : ''}">${E(x.symbol)}${x.ok ? ` <i>${x.score}</i>` : ''}</button>`; }).join('');
    el.onclick = (e) => { const b = e.target.closest('[data-s]'); if (!b) return; document.getElementById('bsSym').value = b.dataset.s; const m = document.getElementById('bsMkt'); if ([...m.options].some(o => o.value === b.dataset.m)) m.value = b.dataset.m; analyze(b.dataset.s, b.dataset.m, false, tok); };
  }
  async function loadSaved(tok){
    const r = await apiGet('/basira_api.php?action=list').catch(() => null);
    if (tok && screenStale(tok)) return;
    const el = document.getElementById('bsSaved'); if (!el) return;
    const items = (r && r.success && r.items) || [];
    el.innerHTML = items.length ? items.map(x => `<div class="bs-sv"><span class="bs-chip bs-c-${vk(x.score)}">${x.score}</span><div><b title="${E(gArName(x.symbol, x.market))}">${E(x.symbol)}</b> <span class="u-muted u-fs12">${E(gArName(x.symbol, x.market))}</span> — ${E(x.verdict)}<br><small>${E(x.market)} • ${E(typeof gServerDate === 'function' ? gServerDate(x.at).toLocaleString('ar-EG') : x.at)}${x.shared ? ' • 🔗 متشارك' : ''}</small></div>
        <div class="bs-svact"><button type="button" class="small secondary u-wa u-m0" data-open="${x.id}">فتح</button><button type="button" class="small danger u-wa u-m0" data-del="${x.id}" aria-label="حذف التحليل">🗑 حذف</button></div></div>`).join('')
      : `<div class="u-muted u-fs12">${r && r.success === false ? E(r.message) : 'لسه مفيش تحليلات محفوظة — حلّل سهم ودوس «💾 حفظ التحليل».'}</div>`;
    el.onclick = async (e) => {
      const o = e.target.closest('[data-open]'), d = e.target.closest('[data-del]');
      if (o) { const x = await apiGet('/basira_api.php?action=get&id=' + o.dataset.open).catch(() => null); if (x && x.success) { CUR = x.report; CUR_ID = x.id; paint(CUR, { savedAt: x.savedAt }); window.scrollTo({ top: 0, behavior: 'smooth' }); } }
      if (d) { if (!await gConfirm('حذف التحليل ده؟ هيتنقل لسلة المحذوفات وتقدر ترجّعه.', { ok: '🗑 نقل للسلة', danger: true })) return;
        const x = await apiPost('/basira_api.php', { action: 'delete', id: d.dataset.del }).catch(() => null);
        if (x && x.success) { if (String(CUR_ID) === d.dataset.del) CUR_ID = null; toast('اتنقل التحليل لسلة المحذوفات'); loadSaved(tok); } else toast((x && x.message) || 'تعذّر الحذف', 'err'); }
    };
  }

  const STEPS = ['جلب أسعار السهم لآخر سنتين', 'حساب 12 مؤشر فني والتقاطعات', 'تحديد الدعم والمقاومة والتوقع لكل فترة', 'جمع أخبار السهم والسوق وتقييمها', 'كتابة الرأي والسيناريوهات'];
  async function analyze(sym, market, fresh, tok){
    sym = String(sym || '').trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, '');
    if (!sym) { toast('اكتب رمز السهم بالإنجليزي (مثال: COMI)', 'err'); return; }
    const box = document.getElementById('bsLoading'), rep = document.getElementById('bsReport'), inp = document.getElementById('bsSym');
    if (inp) inp.value = sym;
    box.hidden = false; box.innerHTML = STEPS.map(s => `<div class="bs-step"><i></i>${s}</div>`).join(''); rep.classList.add('bs-dim');
    const els = [...box.children]; let k = 0;
    const tick = setInterval(() => { els.forEach((e, i) => { e.className = 'bs-step' + (i < k ? ' done' : i === k ? ' doing' : ''); }); if (k < els.length - 1) k++; }, 700);
    const r = await apiGet(`/basira_api.php?action=analyze&symbol=${encodeURIComponent(sym)}&market=${encodeURIComponent(market)}${fresh ? '&fresh=1' : ''}`).catch(() => null);
    clearInterval(tick);
    if (tok && screenStale(tok)) return;
    box.hidden = true; rep.classList.remove('bs-dim');
    if (!r || !r.success) { rep.innerHTML = `<div class="bs-card bs-err">❌ ${E((r && r.message) || 'تعذّر التحليل — حاول تاني.')}</div>`; return; }
    CUR = r.report; CUR_ID = null;
    paint(CUR, {});
    try { history.replaceState(history.state, ''); } catch(e){}
  }

  /* ===================== رسم التقرير ===================== */
  function paint(R, o){
    const rep = document.getElementById('bsReport'); if (!rep) return;
    rep.innerHTML = reportHtml(R, Object.assign({ actions: true }, o));
    drawCharts(R);
    wireReport(R);
  }
  function reportHtml(R, o){
    const ar = R.arName || gArName(R.symbol, R.market), v = vk(R.score), hz = R.horizons.filter(h => !CFG || !CFG.horizons || CFG.horizons[h.key] !== false);
    const I = R.inds || [], ai = R.ai || {}, lv = R.levels || {};
    const at = o.savedAt ? ('محفوظ ' + (typeof gServerDate === 'function' ? gServerDate(o.savedAt).toLocaleString('ar-EG') : o.savedAt)) : ('آخر تحديث ' + new Date(R.at).toLocaleString('ar-EG'));
    const newsPos = (R.news || []).filter(n => n.m === 'pos').length, newsNeg = (R.news || []).filter(n => n.m === 'neg').length;
    return `
    <div class="bs-hero">
      <div class="bs-card">
        <div class="bs-sym"><div class="bs-av">${E(String(R.symbol).slice(0, 5))}</div><div><h3 title="${E(ar)}">${E(R.symbol)}</h3><small>${E(ar || R.name || 'سهم مدرج')} — ${E(R.market)}</small></div>
          <span class="bs-chip bs-c-gold bs-at">${E(at)}${R.cached ? ' • مخزّن' : ''}</span></div>
        <div class="bs-px"><span class="n">${n2(R.last)}</span> <span class="n bs-chg ${cls(R.chg)}">${R.chg >= 0 ? '▲' : '▼'} ${pct(R.chg)}</span> <small class="u-muted">${E(R.currency || '')}</small></div>
        <div class="bs-meta"><span>أعلى شهر <b class="n">${n2(R.hi22)}</b></span><span>أقل شهر <b class="n">${n2(R.lo22)}</b></span><span>متأخر 15 دقيقة</span></div>
        <div class="bs-kpis"><div><span>تغير سنة</span><b class="n ${cls(R.y1)}">${pct(R.y1)}</b></div><div><span>RSI</span><b class="n">${n2(R.rsiNow)}</b></div><div><span>التذبذب اليومي</span><b class="n">${n2(R.vol)}%</b></div></div>
      </div>
      <div class="bs-card">
        <div class="bs-verdict"><svg class="bs-gauge" viewBox="0 0 150 92" aria-label="درجة التحليل ${R.score} من 100">${gauge(R.score)}</svg>
          <div><div class="u-muted u-fs12">الاتجاه العام</div><h4 class="${v}">${E(R.verdict)}</h4><div class="u-fs13"><b>${R.pos}</b> مؤشرات إيجابية من <b>${I.length}</b> — درجة الثقة ${R.score > 70 || R.score < 30 ? 'عالية' : R.score >= 58 || R.score <= 42 ? 'متوسطة' : 'منخفضة'}</div></div></div>
        <div class="bs-meter"><i style="width:${R.pos / I.length * 100}%" class="bs-mp"></i><i style="width:${R.neu / I.length * 100}%" class="bs-mn"></i><i style="width:${R.neg / I.length * 100}%" class="bs-mg"></i></div>
        <div class="bs-meterlbl"><span class="pos">إيجابي ${R.pos}</span><span class="u-muted">محايد ${R.neu}</span><span class="neg">سلبي ${R.neg}</span></div>
        ${o.actions ? `<div class="bs-acts">
          <button type="button" class="small secondary u-wa u-m0" id="bsSave">💾 حفظ التحليل</button>
          <button type="button" class="small secondary u-wa u-m0" id="bsPdf">🖨 تقرير PDF</button>
          ${CFG && CFG.shareOn ? '<button type="button" class="small secondary u-wa u-m0" id="bsShare">🔗 مشاركة</button>' : ''}
          <button type="button" class="small secondary u-wa u-m0" id="bsFresh" title="تحليل جديد بآخر أسعار وأخبار">🔄 تحديث</button>
          ${CFG && CFG.plansOn ? '<button type="button" class="small u-wa u-m0 bs-plan" id="bsDca">+ خطة DCA للسهم</button><button type="button" class="small u-wa u-m0 bs-plan" id="bsGrid">+ خطة Grid للسهم</button>' : ''}
        </div>` : ''}
      </div>
    </div>

    <h2 class="bs-sec"><span class="bs-ic">🎯</span> التوقع حسب الفترة الزمنية</h2>
    <div class="bs-hz">${hz.map(h => { const k = h.verdict === 'شراء' ? 'pos' : h.verdict === 'بيع' ? 'neg' : 'gold';
      return `<div class="bs-hzc bs-hz-${k}"><h5>خلال ${E(h.label)}</h5><div class="bs-hzv">${E(h.verdict)}</div><div class="bs-bar"><i style="width:${h.up}%"></i></div>
        <div class="bs-pr"><span class="pos">صعود ${h.up}%</span><span class="neg">هبوط ${h.dn}%</span></div>
        <div class="bs-rg">النطاق المتوقع<br><b class="n">${n2(h.lo)}</b> — <b class="n">${n2(h.hi)}</b></div>${h.note ? `<div class="bs-hnote">${E(h.note)}</div>` : ''}</div>`; }).join('')}</div>

    <h2 class="bs-sec"><span class="bs-ic">📈</span> الرسم البياني وتقاطع المؤشرات</h2>
    <div class="bs-card bs-chart">
      <div class="bs-chead"><div class="bs-seg" id="bsRng">${[[22, 'شهر'], [66, '3 شهور'], [132, '6 شهور'], [260, 'سنة']].map(([d, l]) => `<button type="button" data-r="${d}" class="${d === RANGE ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="bs-legend" id="bsLegend">${[['s20', 'متوسط 20', '#60A5FA'], ['s50', 'متوسط 50', '#A78BFA'], ['s200', 'متوسط 200', '#F472B6'], ['bb', 'بولينجر', '#94A3B8']].map(([k, l, c]) => `<label><input type="checkbox" data-k="${k}" ${SHOW[k] ? 'checked' : ''}><i style="background:${c}"></i>${l}</label>`).join('')}
          <label class="bs-lx"><i class="bs-dotp"></i>تقاطع إيجابي</label><label class="bs-lx"><i class="bs-dotn"></i>تقاطع سلبي</label></div></div>
      <div class="bs-chartbox"><svg class="bs-svg" id="bsMain" viewBox="0 0 1000 320" preserveAspectRatio="none"></svg><div class="bs-tip" id="bsTip"></div></div>
      <div class="bs-sub">RSI (14)</div><svg class="bs-svg" id="bsRsi" viewBox="0 0 1000 90" preserveAspectRatio="none"></svg>
      <div class="bs-sub">MACD (12, 26, 9)</div><svg class="bs-svg" id="bsMacd" viewBox="0 0 1000 90" preserveAspectRatio="none"></svg>
    </div>

    <div class="bs-two">
      <div class="bs-card">
        <h2 class="bs-sec bs-sec0"><span class="bs-ic">🧮</span> المؤشرات المستخدمة <span class="bs-chip bs-c-gold">${I.length} مؤشر</span></h2>
        <div class="u-ox"><table class="bs-ind g-no-enh"><thead><tr><th>المؤشر</th><th>القيمة</th><th>الإشارة</th><th>المعنى</th></tr></thead><tbody>
          ${I.map(x => `<tr><td><b>${E(x.name)}</b></td><td class="n">${x.value == null ? '—' : Math.abs(x.value) >= 1e5 ? (x.value / 1e6).toFixed(2) + 'M' : n2(x.value)}</td><td>${x.s > 0 ? '<span class="bs-chip bs-c-pos">إيجابي</span>' : x.s < 0 ? '<span class="bs-chip bs-c-neg">سلبي</span>' : '<span class="bs-chip bs-c-neu">محايد</span>'}</td><td class="bs-x">${E(x.note)}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="bs-col">
        <div class="bs-card"><h2 class="bs-sec bs-sec0"><span class="bs-ic">✂️</span> التقاطعات الأخيرة</h2>
          <div class="bs-xl">${(R.cross || []).length ? R.cross.slice().reverse().map(x => `<div class="bs-xr"><div class="bs-xd bs-c-${x.k}">${x.k === 'pos' ? '↗' : '↘'}</div><div><b>${E(x.t)}</b><small>${E(x.d)} — من ${x.days} جلسة (${E(x.date)})</small></div></div>`).join('') : '<div class="u-muted u-fs12">مفيش تقاطعات مهمة في آخر 90 جلسة.</div>'}</div></div>
        <div class="bs-card"><h2 class="bs-sec bs-sec0"><span class="bs-ic">🧱</span> الدعم والمقاومة</h2>
          <div class="bs-lv">${[['دعم 2', lv.s2, 'pos'], ['دعم 1', lv.s1, 'pos'], ['المحور', lv.p, ''], ['مقاومة 1', lv.r1, 'neg'], ['مقاومة 2', lv.r2, 'neg']].map(([l, x, c]) => `<div><span>${l}</span><b class="n ${c}">${n2(x)}</b></div>`).join('')}</div></div>
      </div>
    </div>

    <h2 class="bs-sec"><span class="bs-ic">🤖</span> ${ai.source === 'ai' ? 'رأي الذكاء الاصطناعي' : 'الرأي الآلي'} <span class="bs-chip ${ai.source === 'ai' ? 'bs-c-gold' : 'bs-c-neu'}">${ai.source === 'ai' ? '✨ ذكاء اصطناعي' : '⚙️ محرك آلي من المؤشرات'}</span></h2>
    <div class="bs-card bs-ai">
      <p>${E(ai.opinion)}</p>
      ${ai.aiError && window.__isAdmin ? `<div class="bs-adminnote">للإدارة: الذكاء الاصطناعي ماشتغلش في التحليل ده — ${E(ai.aiError)}</div>` : ''}
      <div class="bs-drv"><div><h6 class="pos">عوامل إيجابية</h6><ul>${(ai.positives || []).map(x => `<li>${E(x)}</li>`).join('')}</ul></div><div><h6 class="neg">عوامل سلبية ومخاطر</h6><ul>${(ai.negatives || []).map(x => `<li>${E(x)}</li>`).join('')}</ul></div></div>
      <div class="bs-scen">${[['السيناريو الإيجابي', ai.bull, 'pos'], ['السيناريو الأساسي', ai.base, ''], ['السيناريو السلبي', ai.bear, 'neg']].map(([t, s, c]) => `<div><h6 class="${c}">${t}</h6><b class="n ${c}">${s ? s.prob : 0}%</b><p>${E(s ? s.text : '')}</p></div>`).join('')}</div>
    </div>

    <h2 class="bs-sec"><span class="bs-ic">🌍</span> الموقف العام والسوق</h2>
    <div class="bs-card"><div class="bs-lv bs-lv4">
      <div><span>الاتجاه القصير (أسبوع)</span><b class="${hz[0] && hz[0].verdict === 'شراء' ? 'pos' : hz[0] && hz[0].verdict === 'بيع' ? 'neg' : ''}">${E(hz[0] ? hz[0].verdict : '—')}</b></div>
      <div><span>الاتجاه الطويل (سنة)</span><b class="${R.horizons[4] && R.horizons[4].verdict === 'شراء' ? 'pos' : R.horizons[4] && R.horizons[4].verdict === 'بيع' ? 'neg' : ''}">${E(R.horizons[4] ? R.horizons[4].verdict : '—')}</b></div>
      <div><span>أداء السنة</span><b class="n ${cls(R.y1)}">${pct(R.y1)}</b></div>
      <div><span>مزاج الأخبار</span><b class="${newsPos > newsNeg ? 'pos' : newsNeg > newsPos ? 'neg' : ''}">${newsPos > newsNeg ? 'إيجابي' : newsNeg > newsPos ? 'سلبي' : 'محايد'}</b></div></div>
      ${ai.market_view ? `<p class="bs-mv">${E(ai.market_view)}</p>` : ''}</div>

    ${(R.news || []).length || (CFG && CFG.newsOn) ? `<h2 class="bs-sec"><span class="bs-ic">📰</span> أخبار السهم وأخبار ممكن تأثر عليه</h2>
    <div class="bs-card">
      <div class="bs-ntabs" id="bsNtabs"><button type="button" class="small u-wa u-m0 on" data-f="all">الكل</button><button type="button" class="small secondary u-wa u-m0" data-f="stock">أخبار السهم</button><button type="button" class="small secondary u-wa u-m0" data-f="market">السوق والقطاع</button></div>
      <div class="u-fs13 u-muted bs-nsum">${ai.news_summary ? E(ai.news_summary) + ' ' : ''}<b class="pos">${newsPos} إيجابي</b> — <b class="neg">${newsNeg} سلبي</b> — ${(R.news || []).length - newsPos - newsNeg} محايد. دوس على أي خبر يفتح مصدره.</div>
      <div class="bs-news" id="bsNews">${newsHtml(R.news || [], 'all')}</div>
    </div>` : ''}

    <h2 class="bs-sec"><span class="bs-ic">🔬</span> إزاي اتعمل التحليل</h2>
    <div class="bs-how">
      <div><b>1. البيانات</b>أسعار يومية لآخر سنتين (متأخرة 15 دقيقة) وأحجام التداول.</div>
      <div><b>2. المؤشرات</b>${I.length} مؤشر فني بيتحسبوا آليًا، ورصد التقاطعات والدعم والمقاومة والتذبذب.</div>
      <div><b>3. الأخبار</b>جمع أخبار السهم والسوق من مصادر منشورة وتقييم أثر كل خبر.</div>
      <div><b>4. ${ai.source === 'ai' ? 'الذكاء الاصطناعي' : 'المحرك الآلي'}</b>${ai.source === 'ai' ? 'بيجمع كل ده في رأي مكتوب واحتمالات لكل فترة (بحد أقصى ±15 نقطة عن الحساب الآلي).' : 'بيكتب الرأي والسيناريوهات من المؤشرات مباشرة.'}</div>
    </div>
    <div class="bs-disc bs-disc2">⚠️ <div>${E(CFG ? CFG.disclaimer : '')}</div></div>`;
  }
  function newsHtml(list, f){
    const L = list.filter(x => f === 'all' || x.k === f);
    if (!L.length) return '<div class="u-muted u-fs12">مفيش أخبار متاحة حاليًا.</div>';
    return L.map(x => `<a class="bs-nw" href="${E(x.url)}" target="_blank" rel="noopener noreferrer"><div class="bs-src">${E(String(x.src || '').slice(0, 4))}</div><div><h6>${E(x.t)}</h6><small>${E(x.src || '')}${x.at ? ' • ' + E(new Date(x.at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })) : ''} • ${x.k === 'stock' ? 'خبر السهم' : 'السوق والقطاع'}</small></div>
      <span class="bs-chip bs-c-${x.m}">${x.m === 'pos' ? 'إيجابي' : x.m === 'neg' ? 'سلبي' : 'محايد'}</span><span class="bs-go2" aria-hidden="true">↗</span></a>`).join('');
  }
  function gauge(score, print){
    const a = Math.PI * (1 - score / 100), cx = 75, cy = 82, R = 62, x = cx + R * Math.cos(a), y = cy - R * Math.sin(a);
    const col = score >= 58 ? (print ? '#15803d' : 'var(--gs-pos,#0E9F6E)') : score <= 42 ? (print ? '#b91c1c' : 'var(--gs-neg,#E02424)') : (print ? '#a16207' : 'var(--gs-brand,#C9A227)');
    const track = print ? '#e5e7eb' : 'var(--gs-surface-3,#EEF1F5)', txt = print ? '#111' : 'var(--gs-text,#111)', mut = print ? '#666' : 'var(--gs-muted,#64748B)';
    return `<path d="M13,82 A62,62 0 0 1 137,82" fill="none" stroke="${track}" stroke-width="12" stroke-linecap="round"/>
      <path d="M13,82 A62,62 0 0 1 ${x.toFixed(1)},${y.toFixed(1)}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"/>
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${print ? '#fff' : 'var(--gs-surface,#fff)'}" stroke="${col}" stroke-width="3"/>
      <text x="75" y="76" text-anchor="middle" font-size="22" font-weight="700" fill="${txt}">${score}</text><text x="75" y="90" text-anchor="middle" font-size="9" fill="${mut}">من 100</text>`;
  }
  function path(arr, x0, n, W, H, mn, mx, pad){ let d = ''; for (let i = 0; i < n; i++) { const v = arr[x0 + i]; if (v == null) continue; const x = n > 1 ? i / (n - 1) * W : 0, y = pad + (1 - (v - mn) / ((mx - mn) || 1)) * (H - pad * 2); d += (d ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1); } return d; }
  function chartSvgs(R, range, show, print){
    const C = R.chart, N = C.c.length, n = Math.min(range, N), x0 = N - n, W = 1000, H = 320, pad = 14;
    const col = print ? { price: '#a16207', grid: '#e5e7eb', mut: '#666', pos: '#15803d', neg: '#b91c1c', fill: '#a16207', bb: '#94a3b8', card: '#fff' }
                      : { price: 'var(--gs-brand,#C9A227)', grid: 'var(--gs-border,#E5E7EB)', mut: 'var(--gs-muted,#64748B)', pos: 'var(--gs-pos,#0E9F6E)', neg: 'var(--gs-neg,#E02424)', fill: '#D4AF37', bb: '#94A3B8', card: 'var(--gs-surface,#fff)' };
    const sets = [C.c]; if (show.s20) sets.push(C.s20); if (show.s50) sets.push(C.s50); if (show.s200) sets.push(C.s200); if (show.bb) sets.push(C.bbU, C.bbL);
    let mn = Infinity, mx = -Infinity; sets.forEach(a => { for (let i = x0; i < N; i++) { const v = a[i]; if (v != null) { mn = Math.min(mn, v); mx = Math.max(mx, v); } } });
    let g = '';
    for (let k = 0; k <= 4; k++) { const y = pad + k / 4 * (H - pad * 2); g += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="${col.grid}" stroke-width="1" vector-effect="non-scaling-stroke"/>`; }
    const pp = path(C.c, x0, n, W, H, mn, mx, pad);
    g += `<defs><linearGradient id="bsGf${print ? 'p' : ''}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${col.fill}" stop-opacity=".25"/><stop offset="1" stop-color="${col.fill}" stop-opacity="0"/></linearGradient></defs><path d="${pp}L${W},${H}L0,${H}Z" fill="url(#bsGf${print ? 'p' : ''})"/>`;
    if (show.bb) g += `<path d="${path(C.bbU, x0, n, W, H, mn, mx, pad)}" fill="none" stroke="${col.bb}" stroke-dasharray="4 4" stroke-width="1.2" vector-effect="non-scaling-stroke"/><path d="${path(C.bbL, x0, n, W, H, mn, mx, pad)}" fill="none" stroke="${col.bb}" stroke-dasharray="4 4" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`;
    [['s200', '#F472B6'], ['s50', '#A78BFA'], ['s20', '#60A5FA']].forEach(([k, c]) => { if (show[k]) g += `<path d="${path(C[k], x0, n, W, H, mn, mx, pad)}" fill="none" stroke="${c}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`; });
    g += `<path d="${pp}" fill="none" stroke="${col.price}" stroke-width="2.4" vector-effect="non-scaling-stroke"/>`;
    (R.cross || []).forEach(x => { if (x.at < x0 || x.at >= N) return; const i = x.at - x0, X = i / (n - 1) * W, Y = pad + (1 - (C.c[x.at] - mn) / ((mx - mn) || 1)) * (H - pad * 2);
      g += `<ellipse cx="${X}" cy="${Y}" rx="7" ry="7" fill="${x.k === 'pos' ? col.pos : col.neg}" stroke="${col.card}" stroke-width="2" vector-effect="non-scaling-stroke"><title>${E(x.t)} — ${E(x.date)}</title></ellipse>`; });
    const main = g;
    let r = `<rect x="0" y="${0.3 * 90}" width="1000" height="${0.4 * 90}" fill="${print ? '#fef9c3' : 'var(--gs-brand-tint,rgba(201,162,39,.14))'}"/>`;
    [30, 70].forEach(v => r += `<line x1="0" x2="1000" y1="${(1 - v / 100) * 90}" y2="${(1 - v / 100) * 90}" stroke="${col.grid}" vector-effect="non-scaling-stroke"/>`);
    r += `<path d="${path(C.rsi, x0, n, 1000, 90, 0, 100, 0)}" fill="none" stroke="#60A5FA" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`;
    let mm = Infinity, mX = -Infinity; for (let i = x0; i < N; i++) [C.macd[i], C.sig[i], C.hist[i]].forEach(v => { if (v != null) { mm = Math.min(mm, v); mX = Math.max(mX, v); } });
    if (!isFinite(mm)) { mm = -1; mX = 1; }
    const yz = (v) => 4 + (1 - (v - mm) / ((mX - mm) || 1)) * 82, bw = 1000 / n;
    let m = `<line x1="0" x2="1000" y1="${yz(0)}" y2="${yz(0)}" stroke="${col.grid}" vector-effect="non-scaling-stroke"/>`;
    for (let i = 0; i < n; i++) { const h = C.hist[x0 + i]; if (h == null) continue; m += `<rect x="${(i * bw).toFixed(2)}" width="${Math.max(0.6, bw - 0.6).toFixed(2)}" y="${Math.min(yz(0), yz(h)).toFixed(2)}" height="${Math.abs(yz(h) - yz(0)).toFixed(2)}" fill="${h >= 0 ? col.pos : col.neg}" opacity=".55"/>`; }
    m += `<path d="${path(C.macd, x0, n, 1000, 90, mm, mX, 4)}" fill="none" stroke="${col.price}" stroke-width="1.5" vector-effect="non-scaling-stroke"/><path d="${path(C.sig, x0, n, 1000, 90, mm, mX, 4)}" fill="none" stroke="#A78BFA" stroke-width="1.3" vector-effect="non-scaling-stroke"/>`;
    return { main, rsi: r, macd: m, mn, mx, x0, n };
  }
  function drawCharts(R){
    const s = chartSvgs(R, RANGE, SHOW, false), svg = document.getElementById('bsMain'); if (!svg) return;
    svg.innerHTML = s.main + `<line id="bsCross" x1="0" x2="0" y1="0" y2="320" stroke="var(--gs-muted,#64748B)" stroke-dasharray="3 3" opacity="0" vector-effect="non-scaling-stroke"/><rect id="bsHover" x="0" y="0" width="1000" height="320" fill="transparent"/>`;
    document.getElementById('bsRsi').innerHTML = s.rsi; document.getElementById('bsMacd').innerHTML = s.macd;
    const tip = document.getElementById('bsTip'), cross = svg.querySelector('#bsCross'), C = R.chart;
    const move = (cx) => { const b = svg.getBoundingClientRect(), fx = Math.max(0, Math.min(1, (cx - b.left) / b.width)), i = Math.round(fx * (s.n - 1)), j = s.x0 + i;
      cross.setAttribute('x1', fx * 1000); cross.setAttribute('x2', fx * 1000); cross.setAttribute('opacity', 1);
      tip.innerHTML = `<b>${new Date(C.t[j] * 1000).toISOString().slice(0, 10)}</b><br>السعر <b class="n">${n2(C.c[j])}</b>${C.s50[j] != null ? `<br>م50 <span class="n">${n2(C.s50[j])}</span>` : ''}${C.s200[j] != null ? ` — م200 <span class="n">${n2(C.s200[j])}</span>` : ''}<br>RSI <span class="n">${n2(C.rsi[j])}</span>`;
      tip.style.display = 'block'; const tx = cx - b.left; tip.style.left = (tx > b.width / 2 ? tx - tip.offsetWidth - 12 : tx + 12) + 'px'; tip.style.top = '8px'; };
    const hov = svg.querySelector('#bsHover');
    hov.addEventListener('mousemove', (e) => move(e.clientX));
    hov.addEventListener('touchmove', (e) => { if (e.touches[0]) move(e.touches[0].clientX); }, { passive: true });
    hov.addEventListener('mouseleave', () => { tip.style.display = 'none'; cross.setAttribute('opacity', 0); });
  }
  function wireReport(R){
    const q = (id) => document.getElementById(id);
    const rng = q('bsRng'); if (rng) rng.onclick = (e) => { const b = e.target.closest('[data-r]'); if (!b) return; RANGE = +b.dataset.r; rng.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); drawCharts(R); };
    const lg = q('bsLegend'); if (lg) lg.onchange = (e) => { const k = e.target.dataset.k; if (k) { SHOW[k] = e.target.checked; drawCharts(R); } };
    const nt = q('bsNtabs'); if (nt) nt.onclick = (e) => { const b = e.target.closest('[data-f]'); if (!b) return; nt.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.classList.toggle('secondary', x !== b); }); q('bsNews').innerHTML = newsHtml(R.news || [], b.dataset.f); };
    const save = async () => {
      if (CUR_ID) return CUR_ID;
      const r = await apiPost('/basira_api.php', { action: 'save', symbol: R.symbol, market: R.market }).catch(() => null);
      if (r && r.success) { CUR_ID = r.id; toast('اتحفظ التحليل في «تحليلاتي المحفوظة»'); loadSaved(null); return r.id; }
      toast((r && r.message) || 'تعذّر الحفظ', 'err'); return null;
    };
    if (q('bsSave')) q('bsSave').onclick = save;
    if (q('bsPdf')) q('bsPdf').onclick = () => printReport(R);
    if (q('bsShare')) q('bsShare').onclick = async () => {
      const id = await save(); if (!id) return;
      const r = await apiPost('/basira_api.php', { action: 'share', id }).catch(() => null);
      if (!(r && r.success)) { toast((r && r.message) || 'تعذّر إنشاء رابط المشاركة', 'err'); return; }
      const url = new URL(r.url, location.href).href, text = `تحليل ${CFG.name} GRIFFINE AI لسهم ${R.symbol}: ${R.verdict} (${R.score}/100) — تحليل آلي وليس نصيحة استثمارية`;
      try { if (navigator.share) { await navigator.share({ title: `${CFG.name} GRIFFINE AI — ${R.symbol}`, text, url }); return; } } catch(e){ if (e && e.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(url); toast('اتنسخ رابط المشاركة 🔗'); } catch(e){ window.prompt('انسخ رابط المشاركة:', url); }
      loadSaved(null);
    };
    if (q('bsFresh')) q('bsFresh').onclick = () => analyze(R.symbol, R.market, true, null);
    if (q('bsDca')) q('bsDca').onclick = () => { window.__prefillPlan = { symbol: R.symbol, price: R.last, market: R.market }; renderNewPlanForm(); };
    if (q('bsGrid')) q('bsGrid').onclick = () => { window.__prefillGridPlan = { symbol: R.symbol, price: R.last, market: R.market }; renderGridPlanForm(); };
  }

  /* ---------- تقرير PDF (نافذة التقارير بتاعة الموقع: طباعة / تحميل PDF / مشاركة) ---------- */
  function printReport(R){
    const w = window.open('', '_blank'); if (!w) { toast('المتصفح منع فتح نافذة التقرير — اسمح بالنوافذ المنبثقة', 'err'); return; }
    const s = chartSvgs(R, Math.min(260, R.chart.c.length), { s20: true, s50: true, s200: true, bb: false }, true), ai = R.ai || {}, ar = R.arName || gArName(R.symbol, R.market);
    const hz = R.horizons.filter(h => !CFG || !CFG.horizons || CFG.horizons[h.key] !== false);
    const e = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>${e((CFG ? CFG.name : 'بصيرة') + ' GRIFFINE AI — ' + R.symbol)}</title>
      <style>body{font-family:IBM Plex Sans Arabic,Tahoma,sans-serif;padding:24px;color:#111;background:#fff}h1{margin:0 0 4px;font-size:22px}h2{font-size:16px;margin:20px 0 8px;border-bottom:2px solid #eee;padding-bottom:6px}
      table{width:100%;border-collapse:collapse;font-size:12.5px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:right}th{background:#f3f4f6}.n{direction:ltr;unicode-bidi:plaintext;font-variant-numeric:tabular-nums}
      .pos{color:#15803d}.neg{color:#b91c1c}.box{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.kv{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.kv div{background:#f8fafc;border:1px solid #eee;border-radius:8px;padding:8px;text-align:center}.kv span{display:block;font-size:11px;color:#666}
      .disc{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;font-size:12px;margin:10px 0}svg{width:100%;display:block;direction:ltr}p{line-height:1.8;font-size:13.5px}li{font-size:13px;margin-bottom:3px}</style></head><body>
      <h1>${e(CFG ? CFG.name : 'بصيرة')} GRIFFINE AI — تحليل سهم ${e(R.symbol)}</h1><div style="color:#555;font-size:13px">${e(ar || R.name || '')} — ${e(R.market)} — ${e(new Date(R.at).toLocaleString('ar-EG'))}</div>
      <div class="disc">⚠️ ${e(CFG ? CFG.disclaimer : '')}</div>
      <div class="box"><svg viewBox="0 0 150 92" style="width:150px">${gauge(R.score, true)}</svg><div><div style="color:#666;font-size:12px">الاتجاه العام</div><div style="font-size:20px;font-weight:700" class="${R.score >= 58 ? 'pos' : R.score <= 42 ? 'neg' : ''}">${e(R.verdict)}</div>
        <div style="font-size:13px">${R.pos} مؤشرات إيجابية — ${R.neu} محايد — ${R.neg} سلبي • آخر سعر <b class="n">${n2(R.last)}</b> (<span class="n ${cls(R.chg)}">${pct(R.chg)}</span>)</div></div></div>
      <h2>التوقع حسب الفترة الزمنية</h2><table><thead><tr><th>الفترة</th><th>التوقع</th><th>احتمال الصعود</th><th>احتمال الهبوط</th><th>النطاق المتوقع</th></tr></thead><tbody>
        ${hz.map(h => `<tr><td>${e(h.label)}</td><td class="${h.verdict === 'شراء' ? 'pos' : h.verdict === 'بيع' ? 'neg' : ''}"><b>${e(h.verdict)}</b></td><td class="n pos">${h.up}%</td><td class="n neg">${h.dn}%</td><td class="n">${n2(h.lo)} — ${n2(h.hi)}</td></tr>`).join('')}</tbody></table>
      <h2>الرسم البياني (سنة) — السعر والمتوسطات 20 / 50 / 200 والتقاطعات</h2><svg viewBox="0 0 1000 320" preserveAspectRatio="none" style="height:260px">${s.main}</svg>
      <div style="font-size:11px;color:#666">RSI (14)</div><svg viewBox="0 0 1000 90" preserveAspectRatio="none" style="height:70px">${s.rsi}</svg>
      <div style="font-size:11px;color:#666">MACD</div><svg viewBox="0 0 1000 90" preserveAspectRatio="none" style="height:70px">${s.macd}</svg>
      <h2>المؤشرات المستخدمة (${(R.inds || []).length})</h2><table><thead><tr><th>المؤشر</th><th>القيمة</th><th>الإشارة</th><th>المعنى</th></tr></thead><tbody>
        ${(R.inds || []).map(x => `<tr><td>${e(x.name)}</td><td class="n">${x.value == null ? '—' : Math.abs(x.value) >= 1e5 ? (x.value / 1e6).toFixed(2) + 'M' : n2(x.value)}</td><td class="${x.s > 0 ? 'pos' : x.s < 0 ? 'neg' : ''}">${x.s > 0 ? 'إيجابي' : x.s < 0 ? 'سلبي' : 'محايد'}</td><td>${e(x.note)}</td></tr>`).join('')}</tbody></table>
      <h2>الدعم والمقاومة</h2><div class="kv">${[['دعم 2', R.levels.s2], ['دعم 1', R.levels.s1], ['المحور', R.levels.p], ['مقاومة 1', R.levels.r1], ['مقاومة 2', R.levels.r2]].map(([l, x]) => `<div><span>${l}</span><b class="n">${n2(x)}</b></div>`).join('')}</div>
      ${(R.cross || []).length ? `<h2>التقاطعات الأخيرة</h2><ul>${R.cross.slice().reverse().map(x => `<li class="${x.k}"><b>${e(x.t)}</b> — ${e(x.d)} (${e(x.date)})</li>`).join('')}</ul>` : ''}
      <h2>${ai.source === 'ai' ? 'رأي الذكاء الاصطناعي' : 'الرأي الآلي'}</h2><p>${e(ai.opinion)}</p>
      <table><thead><tr><th class="pos">عوامل إيجابية</th><th class="neg">عوامل سلبية ومخاطر</th></tr></thead><tbody><tr><td><ul>${(ai.positives || []).map(x => `<li>${e(x)}</li>`).join('')}</ul></td><td><ul>${(ai.negatives || []).map(x => `<li>${e(x)}</li>`).join('')}</ul></td></tr></tbody></table>
      <h2>السيناريوهات</h2><table><tbody>${[['الإيجابي', ai.bull, 'pos'], ['الأساسي', ai.base, ''], ['السلبي', ai.bear, 'neg']].map(([t, x, c]) => `<tr><td class="${c}"><b>${t}</b></td><td class="n ${c}"><b>${x ? x.prob : 0}%</b></td><td>${e(x ? x.text : '')}</td></tr>`).join('')}</tbody></table>
      ${ai.market_view ? `<h2>الموقف العام</h2><p>${e(ai.market_view)}</p>` : ''}
      ${(R.news || []).length ? `<h2>الأخبار</h2><table><tbody>${R.news.map(x => `<tr><td class="${x.m}">${x.m === 'pos' ? 'إيجابي' : x.m === 'neg' ? 'سلبي' : 'محايد'}</td><td><a href="${e(x.url)}">${e(x.t)}</a><br><small style="color:#666">${e(x.src)}</small></td></tr>`).join('')}</tbody></table>` : ''}
      <div class="disc">⚠️ تحليل آلي تعليمي معتمد على المؤشرات${ai.source === 'ai' ? ' والذكاء الاصطناعي' : ''} والأخبار — مش نصيحة استثمارية. الأداء السابق لا يضمن النتائج المستقبلية.</div>
      </body></html>`);
    w.document.close(); if (typeof gReportReady === 'function') gReportReady(w);
  }

  /* ===================== تحليل متشارك (للقراءة بس) ===================== */
  window.renderBasiraShared = async function(token){
    const __tok = screenToken();
    const r = await apiGet('/basira_api.php?action=shared&t=' + encodeURIComponent(token)).catch(() => null);
    if (screenStale(__tok)) return;
    try { history.replaceState(null, '', '/index.php'); } catch(e){}
    if (!r || !r.success) { app.innerHTML = `<div class="container">${logoHeader()}<div class="bs-card bs-gate"><h2>🔮 بصيرة AI</h2><p>${E((r && r.message) || 'الرابط غير صحيح.')}</p><button type="button" class="u-wa" id="bsHome">الصفحة الرئيسية</button></div></div>`; document.getElementById('bsHome').onclick = () => renderPublicHome(); return; }
    CFG = Object.assign({ horizons: {}, shareOn: false, plansOn: false, newsOn: true }, r.config); CUR = r.report;
    app.innerHTML = `<div class="container wide bs-screen">${logoHeader()}<span class="gs-page-title" hidden>${E(CFG.name)} AI — تحليل متشارك</span>
      <div class="bs-top"><div class="bs-brand"><div class="bs-logo" aria-hidden="true">ب</div><div><h1>${E(CFG.name)} <span>GRIFFINE AI</span></h1><p>تحليل متشارك — للقراءة بس</p></div></div>
        <button type="button" class="small u-wa u-m0 bs-plan" id="bsTry">جرّب ${E(CFG.name)} بنفسك</button></div>
      <div class="bs-disc" role="note">⚠️ <div><b>تنويه:</b> ${E(CFG.disclaimer)}</div></div>
      <div id="bsReport"></div></div>`;
    const rep = document.getElementById('bsReport'); rep.innerHTML = reportHtml(CUR, { actions: false, savedAt: r.savedAt }) + '<div class="bs-acts"><button type="button" class="small secondary u-wa u-m0" id="bsPdf2">🖨 تقرير PDF</button></div>';
    drawCharts(CUR); wireReport(CUR);
    document.getElementById('bsPdf2').onclick = () => printReport(CUR);
    document.getElementById('bsTry').onclick = async () => { if (await getSession()) window.renderBasira(CUR.symbol, CUR.market); else if (typeof renderRegister === 'function') renderRegister(); else renderLogin(); };
  };

  /* ===================== لوحة التحكم «تحليلات بصيرة AI» ===================== */
  window.renderAdminBasira = async function(){
    const __tok = screenToken();
    pushNav(() => window.renderAdminBasira());
    const r = await apiGet('/basira_api.php?action=admin_get').catch(() => null);
    if (screenStale(__tok)) return;
    if (!r || !r.success) { app.innerHTML = `<div class="container">${logoHeader()}<div class="error">${E((r && r.message) || 'غير مصرح.')}</div></div>`; return; }
    const c = r.config, H = [['week', 'أسبوع'], ['month', 'شهر'], ['3m', '3 شهور'], ['6m', '6 شهور'], ['year', 'سنة']];
    window.__lastPageKey = 'basira_admin';
    app.innerHTML = `<div class="container wide bs-admin">${logoHeader()}
      <div class="topbar"><div>${typeof pageTitle === 'function' ? pageTitle('basira_admin', '🔮 تحليلات بصيرة AI') : '🔮 تحليلات بصيرة AI'}</div><button type="button" class="secondary small" id="bsaPrev">👁 فتح الشاشة</button></div>
      ${r.ready ? '' : '<div class="error">شغّل ALL_SCHEMA_UPDATES.sql (الإصدار 114) عشان حفظ التحليلات يشتغل.</div>'}
      <div class="info">الشاشة بتحلل أي سهم آليًا (12 مؤشر فني + التقاطعات + الدعم والمقاومة + الأخبار). لو سجّلت مفتاح <b>Claude API</b> الرأي والسيناريوهات بتتكتب بالذكاء الاصطناعي، ومن غيره بتتكتب بالمحرك الآلي. إخفاء الشاشة عن العملاء من «الصلاحيات والإعدادات الإلزامية».</div>
      <div class="section-card"><h3>الاسم والنصوص</h3>
        <label>اسم الشاشة</label><input id="bsa_name" value="${E(c.name)}" maxlength="40">
        <label>السطر التعريفي</label><input id="bsa_tagline" value="${E(c.tagline)}" maxlength="160">
        <label>نص التنويه (بيظهر فوق وتحت كل تحليل وفي تقرير PDF)</label><textarea id="bsa_disc" rows="3">${E(c.disclaimer)}</textarea></div>
      <div class="section-card"><h3>الذكاء الاصطناعي (Claude)</h3>
        <label class="u-check"><input type="checkbox" id="bsa_ai" ${c.ai_on ? 'checked' : ''}> تشغيل رأي الذكاء الاصطناعي</label>
        <label>مفتاح Claude API <span class="u-fs12 ${r.keySet ? 'pos' : 'u-muted'}">(${r.keySet ? '✅ متسجّل — سيبه فاضي عشان يفضل زي ما هو' : 'مش متسجّل'})</span></label>
        <input id="bsa_key" type="password" autocomplete="new-password" placeholder="sk-ant-..." dir="ltr">
        ${r.keySet ? '<label class="u-check u-fs12"><input type="checkbox" id="bsa_keyclear"> مسح المفتاح المتسجّل</label>' : ''}
        <div class="u-fs12 u-muted">المفتاح بيتحفظ على السيرفر بس وعمره ما بيظهر في المتصفح. بتجيبه من حسابك في console.anthropic.com، والتكلفة على حسابك هناك حسب عدد التحليلات.</div>
        <div class="bs-agrid">
          <div><label>الموديل</label><select id="bsa_model">${Object.entries(r.models).map(([k, l]) => `<option value="${E(k)}" ${k === c.model ? 'selected' : ''}>${E(l)}</option>`).join('')}</select></div>
          <div><label>عمق التفكير</label><select id="bsa_effort">${[['low', 'منخفض (أسرع وأوفر)'], ['medium', 'متوسط (الافتراضي)'], ['high', 'عالي (أدق وأغلى)']].map(([k, l]) => `<option value="${k}" ${k === c.effort ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div><label>أقصى طلبات للذكاء الاصطناعي في اليوم</label><input type="number" id="bsa_daily" min="0" max="5000" value="${c.ai_daily_max}"><div class="u-fs12 u-muted">النهارده: ${r.aiToday} طلب — 0 = من غير حد</div></div>
          <div><label>مدة الاحتفاظ بالتحليل (دقيقة)</label><input type="number" id="bsa_cache" min="5" max="1440" value="${c.cache_min}"><div class="u-fs12 u-muted">نفس السهم خلال المدة دي بيرجع من التخزين (أسرع وبدون تكلفة)</div></div>
        </div>
        <button type="button" class="secondary u-wa" id="bsaTest">🔌 اختبار الاتصال بالمفتاح</button> <span id="bsaTestRes" class="u-fs13"></span></div>
      <div class="section-card"><h3>المحتوى</h3>
        <div class="bs-agrid">
          <label class="u-check"><input type="checkbox" id="bsa_news" ${c.news_on ? 'checked' : ''}> رصد الأخبار</label>
          <div><label>عدد الأخبار</label><input type="number" id="bsa_newsmax" min="0" max="20" value="${c.news_max}"></div>
          <div><label>أقصى أسهم من قائمة المتابعة</label><input type="number" id="bsa_watch" min="1" max="30" value="${c.watch_max}"></div>
          <label class="u-check"><input type="checkbox" id="bsa_scan" ${c.scan_on ? 'checked' : ''}> مسح السوق (كل الأسهم / قطاع مترتبين حسب احتمال الصعود)</label>
          <div><label>أقصى عدد أسهم في مسح السوق</label><input type="number" id="bsa_scanmax" min="20" max="800" value="${c.scan_max}"></div>
          <div><label>أقصى تحليلات محفوظة لكل مستخدم</label><input type="number" id="bsa_save" min="5" max="200" value="${c.save_max}"></div>
          <label class="u-check"><input type="checkbox" id="bsa_share" ${c.share_on ? 'checked' : ''}> السماح بالمشاركة برابط</label>
          <label class="u-check"><input type="checkbox" id="bsa_plans" ${c.plans_on ? 'checked' : ''}> أزرار فتح خطة DCA / Grid</label>
        </div>
        <label>الفترات الظاهرة</label><div class="bs-hchk">${H.map(([k, l]) => `<label class="u-check"><input type="checkbox" data-hz="${k}" ${c.horizons[k] !== false ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
      <div class="section-card"><h3>أسماء الأسهم بالعربي</h3>
        <div class="u-fs12 u-muted">فيه قائمة جاهزة لأشهر أسهم مصر والخليج. هنا تقدر تضيف أو تغيّر: سطر لكل سهم بالشكل ده <b dir="ltr">COMI=البنك التجاري الدولي</b>. الاسم بيظهر لما المستخدم يقف على أي سهم.</div>
        <textarea id="bsa_ar" rows="6" dir="rtl" placeholder="COMI=البنك التجاري الدولي">${E(c.ar_names)}</textarea></div>
      <div class="bs-asave"><button type="button" id="bsaSave">💾 حفظ الإعدادات</button><button type="button" class="secondary" id="bsaReset">↩ رجوع للإعدادات الافتراضية</button></div>
    </div>`;
    const v = (id) => document.getElementById(id);
    const collect = () => ({ name: v('bsa_name').value.trim() || 'بصيرة', tagline: v('bsa_tagline').value.trim(), disclaimer: v('bsa_disc').value.trim() || r.defaults.disclaimer, ai_on: v('bsa_ai').checked,
      model: v('bsa_model').value, effort: v('bsa_effort').value, ai_daily_max: +v('bsa_daily').value || 0, cache_min: +v('bsa_cache').value || 60, news_on: v('bsa_news').checked,
      news_max: +v('bsa_newsmax').value || 0, watch_max: +v('bsa_watch').value || 12, scan_on: v('bsa_scan').checked, scan_max: +v('bsa_scanmax').value || 300, save_max: +v('bsa_save').value || 50, share_on: v('bsa_share').checked, plans_on: v('bsa_plans').checked,
      horizons: Object.fromEntries([...document.querySelectorAll('[data-hz]')].map(x => [x.dataset.hz, x.checked])), ar_names: v('bsa_ar').value });
    const doSave = async () => {
      const body = { action: 'admin_save', config: JSON.stringify(collect()) };
      if (v('bsa_keyclear') && v('bsa_keyclear').checked) body.ai_key = '__clear__'; else if (v('bsa_key').value.trim()) body.ai_key = v('bsa_key').value.trim();
      const x = await apiPost('/basira_api.php', body).catch(() => null);
      if (x && x.success) { toast('اتحفظت إعدادات بصيرة ✅'); CFG = null; return true; }
      toast((x && x.message) || 'تعذّر الحفظ', 'err'); return false;
    };
    v('bsaSave').onclick = async () => { if (await doSave()) window.renderAdminBasira(); };
    v('bsaReset').onclick = async () => { if (!await gConfirm('رجوع كل إعدادات بصيرة للافتراضي؟ (المفتاح المتسجّل مش هيتمسح)')) return; const x = await apiPost('/basira_api.php', { action: 'admin_save', config: 'null' }).catch(() => null); if (x && x.success) { toast('رجعت للإعدادات الافتراضية'); window.renderAdminBasira(); } };
    v('bsaTest').onclick = async () => { const out = v('bsaTestRes'); out.textContent = '⏳ جارٍ الاختبار…'; out.className = 'u-fs13';
      if (v('bsa_key').value.trim() || (v('bsa_keyclear') && v('bsa_keyclear').checked)) await doSave();
      const x = await apiPost('/basira_api.php', { action: 'admin_test' }).catch(() => null);
      out.textContent = (x && x.message) || 'تعذّر الاختبار'; out.className = 'u-fs13 ' + (x && x.success ? 'pos' : 'neg'); };
    v('bsaPrev').onclick = () => window.renderBasira();
  };
})();
