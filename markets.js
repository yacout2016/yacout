/* =====================================================================
   GRIFFINE — markets.js (الإصدار 88) — الأسهم والمتابعة والتنبيهات
   ---------------------------------------------------------------------
   01. أدوات مشتركة (API / الأسواق / تنسيق)
   02. صفحة السهم الموحّدة: السعر + شارت TradingView + خطتك + التوصية + "ابدأ خطة"
   03. قائمة المتابعة بأسعار تلقائية (تتحدّث كل دقيقة والشاشة مفتوحة)
   04. تنبيهات وصول السعر لمستويات خطة العميل (بتتحسب من الخطط ← السيرفر بيقارنها بالسعر)
   05. منحنى أداء المحفظة في الرئيسية (لقطة يومية لقيمة المحفظة)
   ===================================================================== */

/* ---------------------------------------------------------------------
   01. أدوات مشتركة
   --------------------------------------------------------------------- */
const MK = {
  get: (q) => apiGet('/markets_api.php?' + q).catch(() => ({ success:false, message:'تعذّر الاتصال بالسيرفر' })),
  post: (d) => apiPost('/markets_api.php', d).catch(() => ({ success:false, message:'تعذّر الاتصال بالسيرفر' })),
  markets: ['مصر', 'السعودية', 'الإمارات', 'قطر', 'الكويت'],
  tvExchange: { 'مصر':'EGX', 'السعودية':'TADAWUL', 'الإمارات':'DFM', 'قطر':'QSE', 'الكويت':'KSE' },
  n: (v, d = 2) => (v == null || isNaN(v)) ? '—' : (+v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d }),
  chg: (last, prev) => (last != null && prev) ? ((last - prev) / prev * 100) : null,
};
function mkMarketSelect(id, sel){ return `<select id="${id}" class="u-m0">${MK.markets.map(m => `<option ${m === sel ? 'selected' : ''}>${m}</option>`).join('')}</select>`; }
function mkChgHtml(last, prev){
  const c = MK.chg(last, prev); if (c == null) return '';
  return `<span class="${c >= 0 ? 'pos' : 'neg'}" dir="ltr">${c >= 0 ? '▲' : '▼'} ${Math.abs(c).toFixed(2)}%</span>`;
}

/* ---------------------------------------------------------------------
   02. صفحة السهم الموحّدة
   --------------------------------------------------------------------- */
async function renderStockPage(symbol, market){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderStockPage(symbol, market));
  const email = await getSession();
  if (!email) return renderLogin();
  symbol = String(symbol || '').toUpperCase().trim(); market = market || 'مصر';
  window.__lastPageKey = 'stock_page';
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide"><div class="gs-page-title">📈 ${escapeHtml(symbol)}</div><div class="gs-skel" style="height:420px"></div></div>`;
  const [q, plans, grids] = await Promise.all([ MK.get('action=quote&symbol=' + encodeURIComponent(symbol) + '&market=' + encodeURIComponent(market)), getPlans(email).catch(() => ({})), getGridPlans(email).catch(() => ({})) ]);
  const plan = plans && plans[symbol], grid = grids && grids[symbol];
  const tvSym = (MK.tvExchange[market] || 'EGX') + ':' + symbol;
  const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const chartUrl = 'https://s.tradingview.com/widgetembed/?frameElementId=gtv&symbol=' + encodeURIComponent(tvSym) + '&interval=D&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=f1f3f6&studies=%5B%5D&theme=' + theme + '&style=1&timezone=Africa%2FCairo&withdateranges=1&locale=ar_AE';

  // ملخص خطتك على السهم ده
  let planHtml = '';
  if (plan) {
    let sim = null; try { sim = simulatePlan(plan); } catch(e){}
    const next = sim && sim.rows.find(r => r.isNext && !r.trimmed);
    planHtml += `<div class="section-card"><div class="section-title">خطة DCA على ${escapeHtml(symbol)}</div>
      <div class="grid2" style="font-size:13px;line-height:2;">
        <div>الكمية المحتفظ بها: <b>${MK.n(sim && sim.heldQty, 4)}</b></div><div>متوسط التكلفة: <b>${MK.n(sim && sim.avgCostCurrent, 4)}</b></div>
        <div>سعر الشراء التالي: <b>${next ? MK.n(next.price, 4) : '—'}</b></div><div>هدف البيع: <b>${sim && sim.heldQty > 0 ? MK.n(sim.sellTargetCurrent, 4) : '—'}</b></div>
      </div><button type="button" class="small secondary u-wa u-mt8" id="spOpenPlan">فتح الخطة</button></div>`;
  }
  if (grid) {
    const bought = (grid.levels || []).filter(l => l.status === 'bought');
    const nextBuy = (grid.levels || []).filter(l => l.status !== 'bought').map(l => +l.plannedPrice).sort((a, b) => b - a)[0];
    const nextSell = bought.map(l => +l.sellTargetPrice).filter(Boolean).sort((a, b) => a - b)[0];
    planHtml += `<div class="section-card"><div class="section-title">خطة Grid على ${escapeHtml(symbol)}</div>
      <div class="grid2" style="font-size:13px;line-height:2;"><div>مستويات مشتراة: <b>${bought.length}/${(grid.levels || []).length}</b></div>
        <div>الشراء التالي: <b>${MK.n(nextBuy, 4)}</b></div><div>أقرب هدف بيع: <b>${MK.n(nextSell, 4)}</b></div></div>
      <button type="button" class="small secondary u-wa u-mt8" id="spOpenGrid">فتح الخطة</button></div>`;
  }

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">
    <div class="gs-page-title">📈 ${escapeHtml(symbol)} ${q.success && q.name ? `<small style="font-size:14px;opacity:.7">— ${escapeHtml(q.name)}</small>` : ''}</div>
    <div class="section-card" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;">
      ${q.success ? `<div><div style="font-size:30px;font-weight:800;" dir="ltr">${MK.n(q.last, 4)} <small style="font-size:14px;">${escapeHtml(q.currency || '')}</small></div>
        <div class="u-fs13">${mkChgHtml(q.last, q.prevClose)} <span class="ta-delay-badge">⏱️ متأخر ${q.delayMinutes || 15} دقيقة</span></div></div>
        <div style="font-size:12.5px;line-height:1.9;opacity:.85;">أعلى اليوم: <b dir="ltr">${MK.n(q.high, 4)}</b><br>أقل اليوم: <b dir="ltr">${MK.n(q.low, 4)}</b><br>الإغلاق السابق: <b dir="ltr">${MK.n(q.prevClose, 4)}</b></div>`
        : `<div class="error" style="margin:0">${escapeHtml(q.message || 'لم نجد أسعارًا لهذا السهم')}</div>`}
      <div style="margin-inline-start:auto;display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="small ${q.watchId ? 'secondary' : ''} u-wa" id="spWatch">${q.watchId ? '✓ في قائمة المتابعة' : '⭐ أضف للمتابعة'}</button>
        <button type="button" class="small u-wa" id="spNewPlan">➕ ابدأ خطة</button>
      </div>
    </div>
    <div class="section-card" style="padding:0;overflow:hidden;"><iframe title="شارت ${escapeHtml(symbol)}" src="${chartUrl}" style="width:100%;height:420px;border:0;display:block;" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups"></iframe></div>
    <div class="gs-home-cols"><div class="c1">${planHtml || '<div class="section-card u-muted">لا توجد لديك خطة على هذا السهم بعد.</div>'}</div>
    <div class="c2"><div id="spRec"></div></div></div>
    <p class="disclaimer">الأسعار متأخرة 15 دقيقة من مصدر بيانات مجاني، والشارت من TradingView. المعلومات للمتابعة فقط وليست توصية استثمارية.</p>
  </div>`;
  document.getElementById('spNewPlan').onclick = () => renderPlanTypeChooser({ symbol, price: q.success ? q.last : undefined, market });
  const op = document.getElementById('spOpenPlan'); if (op) op.onclick = () => renderPlanDetail(symbol);
  const og = document.getElementById('spOpenGrid'); if (og) og.onclick = () => renderGridPlanDetail(symbol);
  document.getElementById('spWatch').onclick = async () => {
    const r = q.watchId ? await MK.post({ action: 'watch_remove', id: q.watchId }) : await MK.post({ action: 'watch_add', symbol, market });
    if (!r.success) { alert(r.message || 'تعذّر'); return; }
    window.__navSilent = true; try { renderStockPage(symbol, market); } finally { window.__navSilent = false; }
  };
  // التوصية النشطة على السهم (للمشتركين)
  try {
    const rr = await apiGet('/recommendations_list.php');
    const rec = rr && rr.success && (rr.recommendations || []).find(x => String(x.symbol || '').toUpperCase() === symbol);
    const box = document.getElementById('spRec');
    if (box && rec) {
      const res = (rec.resistances || []).filter(x => x && x.level).map(x => MK.n(x.level, 4)).join(' / ');
      const sup = (rec.supports || []).filter(Boolean).map(v => MK.n(v, 4)).join(' / ');
      box.innerHTML = `<div class="section-card"><div class="section-title">📢 توصية نشطة${rec.stockName ? ' — ' + escapeHtml(rec.stockName) : ''}</div>
        <div style="font-size:13px;line-height:2;">منطقة الشراء: <b dir="ltr">${MK.n(rec.buyFrom, 4)} – ${MK.n(rec.buyTo, 4)}</b><br>${res ? 'المقاومات: <b dir="ltr">' + res + '</b><br>' : ''}${sup ? 'الدعوم: <b dir="ltr">' + sup + '</b>' : ''}</div></div>`;
    }
  } catch(e){}
}

/* ---------------------------------------------------------------------
   03. قائمة المتابعة
   --------------------------------------------------------------------- */
async function renderWatchlistPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderWatchlistPage());
  const email = await getSession();
  if (!email) return renderLogin();
  window.__lastPageKey = 'watchlist';
  if (window.__mkWatchTimer) { clearInterval(window.__mkWatchTimer); window.__mkWatchTimer = null; }
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">
    <div class="gs-page-title">⭐ قائمة المتابعة</div>
    <div class="section-card" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;">
      <div><label>رمز السهم</label><input type="text" id="wlSym" placeholder="مثال: COMI" dir="ltr" style="margin:0;text-transform:uppercase;width:150px;"></div>
      <div><label>السوق</label>${mkMarketSelect('wlMkt', 'مصر')}</div>
      <button type="button" id="wlAdd" class="u-wa u-m0">➕ إضافة</button>
      <span style="font-size:12px;opacity:.7;margin-inline-start:auto;">الأسعار تتحدّث تلقائيًا كل دقيقة (متأخرة 15 دقيقة)</span>
    </div>
    <div class="section-card" style="padding:0;overflow:auto;"><table class="std-table u-w100"><thead><tr>
      <th>السهم</th><th>آخر سعر</th><th>التغير</th><th>أعلى</th><th>أقل</th><th></th></tr></thead><tbody id="wlRows"><tr><td colspan="6" style="padding:14px;color:#888;">جارٍ التحميل...</td></tr></tbody></table></div>
    <div id="wlMsg" style="font-size:12.5px;"></div>
  </div>`;
  const load = async () => {
    const tb = document.getElementById('wlRows'); if (!tb) { clearInterval(window.__mkWatchTimer); return; }
    const r = await MK.get('action=watchlist');
    if (!r.success) { tb.innerHTML = `<tr><td colspan="6" class="error">${escapeHtml(r.message || '')}</td></tr>`; return; }
    tb.innerHTML = r.items.length ? r.items.map(x => `<tr>
      <td><button type="button" class="gs-link" data-open="${escapeHtml(x.symbol)}" data-mkt="${escapeHtml(x.market)}" style="font-weight:800;">${escapeHtml(x.symbol)}</button><div style="font-size:11px;opacity:.7">${escapeHtml(x.name || '')} · ${escapeHtml(x.market)}</div></td>
      <td dir="ltr"><b>${x.ok ? MK.n(x.last, 4) : '—'}</b> <small>${escapeHtml(x.currency || '')}</small></td>
      <td>${x.ok ? mkChgHtml(x.last, x.prevClose) : '<small class="neg">لا توجد بيانات</small>'}</td>
      <td dir="ltr">${MK.n(x.high, 4)}</td><td dir="ltr">${MK.n(x.low, 4)}</td>
      <td><button type="button" class="small danger u-wa" data-del="${x.id}">✕</button></td></tr>`).join('')
      : '<tr><td colspan="6" style="padding:14px;color:#888;">قائمتك فارغة - أضف رمز سهم من الأعلى.</td></tr>';
    tb.querySelectorAll('[data-open]').forEach(b => b.onclick = () => renderStockPage(b.dataset.open, b.dataset.mkt));
    tb.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await MK.post({ action: 'watch_remove', id: +b.dataset.del }); load(); });
  };
  document.getElementById('wlAdd').onclick = async () => {
    const sym = document.getElementById('wlSym').value.trim().toUpperCase();
    if (!sym) return;
    const m = document.getElementById('wlMsg'); m.textContent = '⏳ جاري الإضافة...';
    const r = await MK.post({ action: 'watch_add', symbol: sym, market: document.getElementById('wlMkt').value });
    m.textContent = r.success ? '' : (r.message || 'تعذّر'); m.className = r.success ? '' : 'error';
    if (r.success) { document.getElementById('wlSym').value = ''; load(); }
  };
  document.getElementById('wlSym').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('wlAdd').click(); });
  await load();
  window.__mkWatchTimer = setInterval(load, 60000);
}

/* ---------------------------------------------------------------------
   04. تنبيهات الأسعار
   --------------------------------------------------------------------- */
// مستويات التنبيه من الخطط: DCA ← سعر الشراء التالي + هدف البيع، Grid ← الشراء التالي + أقرب هدف بيع
function mkComputeTargets(plans, grids){
  const out = [];
  Object.keys(plans || {}).forEach(sym => {
    const p = plans[sym]; let sim = null; try { sim = simulatePlan(p); } catch(e){ return; }
    if (!sim || sim.isClosed) return;
    const next = sim.rows.find(r => r.isNext && !r.trimmed);
    if (next && next.price > 0) out.push({ symbol: sym, market: p.market || 'مصر', kind: 'DCA', side: 'buy', price: next.price, label: `المستوى ${next.level}` });
    if (sim.heldQty > 0 && sim.sellTargetCurrent > 0) out.push({ symbol: sym, market: p.market || 'مصر', kind: 'DCA', side: 'sell', price: +sim.sellTargetCurrent.toFixed(4), label: 'هدف البيع' });
  });
  Object.keys(grids || {}).forEach(sym => {
    const g = grids[sym], lv = g.levels || [];
    const nb = lv.filter(l => l.status !== 'bought' && +l.plannedPrice > 0).map(l => +l.plannedPrice).sort((a, b) => b - a)[0];
    const ns = lv.filter(l => l.status === 'bought' && +l.sellTargetPrice > 0).map(l => +l.sellTargetPrice).sort((a, b) => a - b)[0];
    if (nb) out.push({ symbol: sym, market: g.market || 'مصر', kind: 'Grid', side: 'buy', price: nb, label: 'الشراء التالي' });
    if (ns) out.push({ symbol: sym, market: g.market || 'مصر', kind: 'Grid', side: 'sell', price: ns, label: 'أقرب هدف بيع' });
  });
  return out;
}
async function mkSyncTargets(plans, grids, email){
  const t = mkComputeTargets(plans, grids);
  const sig = JSON.stringify(t);
  // الإصدار 93: المستويات بتخص صاحب الخطط بس - لو الحساب اتغيّر (خروج/دخول بحساب تاني) منبعتش خطط الحساب القديم باسم الجديد
  if (email && (await getSession().catch(() => null)) !== email) return;
  if (window.__mkTargetsSig === (email || '') + '|' + sig) return;   // نفس الحساب ونفس المستويات ← لا يوجد داعي نبعت تاني
  window.__mkTargetsSig = (email || '') + '|' + sig;
  await MK.post({ action: 'sync_targets', targets: sig });
}
// الإصدار 91: قائمة بتعرض أول n عناصر والباقي بالتمرير لفوق وتحت (الارتفاع محسوب من العنصر رقم n الفعلي)
function mkLimitList(box, n){
  if (!box) return;
  const fit = () => {
    const kids = box.children; if (kids.length <= n) { box.style.maxHeight = ''; return; }
    const top = box.getBoundingClientRect().top - box.scrollTop, last = kids[n - 1].getBoundingClientRect();
    const mb = parseFloat(getComputedStyle(kids[n - 1]).marginBottom) || 0;
    const h = Math.ceil(last.bottom + mb - top); if (h > 0) box.style.maxHeight = h + 'px';
  };
  fit(); setTimeout(fit, 350); try { document.fonts && document.fonts.ready.then(fit); } catch(e){}
}
// الإصدار 91: التنبيهات بتفضل في الرئيسية لحد ما تقفلها (✕) - وبعدها بتفضل في شاشة التنبيهات
async function mkAlertsCard(el){
  if (!el) return;
  const r = await MK.get('action=alerts');
  if (!el.isConnected) return;
  window.__mkUnread = r.success ? r.unread : 0; mkUpdateAlertBadge();
  const list = r.success ? r.alerts.filter(a => !a.dismissed) : [];
  el.innerHTML = list.length ? `<div class="section-card gs-alert-card"><div class="u-row"><strong>🔔 تنبيهات الأسعار (${list.length})</strong>
      <span><button type="button" class="gs-link" id="gsAlertsCloseAll">إغلاق الكل</button> · <button type="button" class="gs-link" id="gsAlertsAll">عرض الكل</button></span></div>
    <div class="gs-alert-list">${list.map(a => `<div class="gs-alert-row${a.is_read ? '' : ' unread'}" data-aid="${a.id}">
      <button type="button" class="gs-alert-x" data-dis="${a.id}" aria-label="إغلاق" title="إغلاق (يبقى في شاشة التنبيهات)">✕</button>
      <b>${escapeHtml(a.title)}</b><div>${escapeHtml(a.body || '')}</div>
      <small class="u-muted">${escapeHtml(a.created_at || '')}</small>${a.symbol ? ` · <button type="button" class="gs-link" data-sym="${escapeHtml(a.symbol)}" data-mkt="${escapeHtml(a.market || 'مصر')}">صفحة السهم</button>` : ''}</div>`).join('')}</div></div>` : '';
  mkLimitList(el.querySelector('.gs-alert-list'), 5);
  const b = document.getElementById('gsAlertsAll'); if (b) b.onclick = () => renderAlertsPage();
  const ca = document.getElementById('gsAlertsCloseAll'); if (ca) ca.onclick = async () => { await MK.post({ action:'alert_dismiss', all:'1' }); mkAlertsCard(el); };
  el.querySelectorAll('[data-dis]').forEach(x => x.onclick = async (ev) => { ev.stopPropagation(); await MK.post({ action:'alert_dismiss', id: x.dataset.dis }); mkAlertsCard(el); });
  el.querySelectorAll('[data-sym]').forEach(x => x.onclick = () => renderStockPage(x.dataset.sym, x.dataset.mkt));
}
function mkUpdateAlertBadge(){
  document.querySelectorAll('[data-gs-alerts-badge]').forEach(e => { e.textContent = window.__mkUnread || ''; e.style.display = window.__mkUnread ? '' : 'none'; });
}
/* الإصدار 89: تنبيهات سعر مخصّصة - البورصة + العملة + السهم ← آخر سعر (متأخر 15 دقيقة) ← السعر المطلوب
   الشرط ≥ أو ≤ + عدد مرات التذكير (حد أقصى 3) + الفرق بين كل تذكير (حد أقصى 24 ساعة)
   الإشعار: إيميل + رسالة في شات الموقع + الجرس */
const MK_CCY_AR = { EGP:'جنيه', SAR:'ريال سعودي', AED:'درهم إماراتي', QAR:'ريال قطري', KWD:'دينار كويتي', USD:'دولار' };
const MK_CCY = { 'مصر':'EGP', 'السعودية':'SAR', 'الإمارات':'AED', 'قطر':'QAR', 'الكويت':'KWD' };
const MK_INTERVALS = [[15,'15 دقيقة'],[30,'30 دقيقة'],[60,'ساعة'],[120,'ساعتان'],[180,'3 ساعات'],[360,'6 ساعات'],[720,'12 ساعة'],[1440,'24 ساعة']];
function mkIntervalLabel(m){ const x = MK_INTERVALS.find(i => i[0] === +m); return x ? x[1] : m + ' دقيقة'; }
async function renderAlertsPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderAlertsPage());
  const email = await getSession();
  if (!email) return renderLogin();
  window.__lastPageKey = 'alerts';
  const [r, c] = await Promise.all([MK.get('action=alerts'), MK.get('action=custom_list')]);
  if (screenStale(__tok)) return;
  const mine = (c.success && c.alerts) || [];
  const statusOf = (a) => a.active ? (a.sent_count ? `يعمل — أُرسل ${a.sent_count} من ${a.max_repeats}` : 'يعمل — في الانتظار') : (a.sent_count >= a.max_repeats ? `اكتمل (${a.sent_count} من ${a.max_repeats})` : 'متوقف');
  app.innerHTML = `<div class="container wide"><div class="gs-page-title">🔔 تنبيهات الأسعار</div>
    <div class="section-card">
      <div class="section-title">➕ تنبيه سعر جديد</div>
      <div class="g-grid-filters">
        <label>البورصة ${mkMarketSelect('caMkt', 'مصر')}</label>
        <label>العملة <select id="caCcy" class="u-m0">${[...new Set(Object.values(MK_CCY))].concat(['USD']).map(x => `<option ${x === 'EGP' ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label>رمز السهم <input id="caSym" dir="ltr" placeholder="COMI" class="u-m0"></label>
        <label>&nbsp;<button type="button" class="secondary u-m0" id="caQuote">عرض آخر سعر</button></label>
      </div>
      <div id="caQuoteBox" class="u-note u-mt8"></div>
      <div class="g-grid-filters u-mt10">
        <label>الشرط <select id="caCond" class="u-m0"><option value="gte">السعر أكبر من أو يساوي ≥</option><option value="lte">السعر أقل من أو يساوي ≤</option></select></label>
        <label>السعر المطلوب <input id="caPrice" type="number" step="0.001" min="0" inputmode="decimal" class="u-m0"></label>
        <label>عدد مرات التذكير <select id="caRep" class="u-m0"><option>1</option><option>2</option><option>3</option></select></label>
        <label>الفرق بين كل تذكير <select id="caInt" class="u-m0">${MK_INTERVALS.map(([v, l]) => `<option value="${v}" ${v === 60 ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <label class="u-mt8">ملاحظة (اختياري)<input id="caNote" maxlength="150" placeholder="مثلًا: وقت الشراء"></label>
      <div class="u-hint u-mt6">عند تحقق الشرط يصلك إيميل + رسالة في شات الموقع + تنبيه في الجرس. الأسعار متأخرة 15 دقيقة.</div>
      <button type="button" class="u-mt10" id="caSave">💾 حفظ التنبيه</button>
    </div>
    <div class="section-card">
      <div class="section-title">تنبيهاتي (${mine.length})</div>
      ${mine.length ? `<div class="table-scroll"><table class="g-table"><thead><tr><th>السهم</th><th>الشرط</th><th></th><th>الحالة</th><th>آخر سعر</th><th>التذكير</th></tr></thead><tbody>
        ${mine.map(a => `<tr><td dir="ltr"><b>${escapeHtml(a.symbol)}</b> <small class="u-muted">${escapeHtml(a.market)}</small></td>
          <td>${a.cond === 'lte' ? 'أقل من أو يساوي' : 'أكبر من أو يساوي'} <b class="g-num">${MK.n(a.target_price, 4)}</b> ${escapeHtml(MK_CCY_AR[a.currency] || a.currency)}${a.note ? `<div class="u-hint">${escapeHtml(a.note)}</div>` : ''}</td>
          <td><button type="button" class="small secondary u-wa" data-catog="${a.id}" data-on="${a.active ? 0 : 1}">${a.active ? 'إيقاف' : 'تشغيل من جديد'}</button>
            <button type="button" class="small danger u-wa" data-cadel="${a.id}">🗑️</button></td>
          <td class="${a.active ? 'u-pos' : 'u-muted'}">${statusOf(a)}</td>
          <td class="g-num">${MK.n(a.last_price, 4)}</td>
          <td>${a.max_repeats} × كل ${mkIntervalLabel(a.repeat_minutes)}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="u-muted">لا توجد تنبيهات مخصّصة بعد.</div>'}
    </div>
    <div class="section-title u-mt14">سجل الإشعارات (${r.success ? r.alerts.length : 0})</div>
    <div class="info">تصلك هنا أيضًا تنبيهات مستويات خططك (سعر الشراء التالي وهدف البيع). الحذف ينقل الإشعار إلى سلة المحذوفات.</div>
    ${r.success && r.alerts.length ? `<div class="gs-notif-list">${r.alerts.map(a => `<div class="section-card gs-notif${a.is_read ? ' read' : ''}"><div class="u-row"><b>${escapeHtml(a.title)}</b>
        <span><small class="u-muted">${escapeHtml(a.created_at)}</small> <button type="button" class="small danger u-wa" data-ndel="${a.id}" title="حذف (ينتقل إلى سلة المحذوفات)">🗑️</button></span></div>
      <div class="u-fs13" style="line-height:1.9;">${escapeHtml(a.body || '')}</div>${a.symbol ? `<button type="button" class="small secondary u-wa u-mt6" data-sym="${escapeHtml(a.symbol)}" data-mkt="${escapeHtml(a.market || 'مصر')}">📈 صفحة السهم</button>` : ''}</div>`).join('')}</div>`
      : '<div class="section-card u-muted">لا توجد إشعارات.</div>'}</div>`;
  const reload = () => { window.__navSilent = true; try { renderAlertsPage(); } finally { window.__navSilent = false; } };
  const mkt = document.getElementById('caMkt'), ccy = document.getElementById('caCcy');
  mkt.onchange = () => { ccy.value = MK_CCY[mkt.value] || 'EGP'; document.getElementById('caQuoteBox').textContent = ''; };
  document.getElementById('caQuote').onclick = async () => {
    const box = document.getElementById('caQuoteBox'), sym = document.getElementById('caSym').value.trim().toUpperCase();
    if (!sym) { box.textContent = 'اكتب رمز السهم أولًا.'; return; }
    box.textContent = '⏳ جارٍ جلب السعر...';
    const q = await MK.get('action=quote&symbol=' + encodeURIComponent(sym) + '&market=' + encodeURIComponent(mkt.value));
    if (!q.success) { box.innerHTML = `<span class="u-danger">${escapeHtml(q.message || 'لم نجد أسعارًا لهذا الرمز')}</span>`; return; }
    if (q.currency) { if (![...ccy.options].some(o => o.value === q.currency)) ccy.add(new Option(q.currency, q.currency)); ccy.value = q.currency; }
    box.innerHTML = `<b>${escapeHtml(q.name || sym)}</b> — آخر سعر: <b class="g-num u-fs135">${MK.n(q.last, 4)}</b> ${escapeHtml(q.currency || ccy.value)} ${mkChgHtml(q.last, q.prevClose)} <span class="u-hint">(متأخر ${q.delayMinutes || 15} دقيقة)</span>`;
    const pr = document.getElementById('caPrice'); if (!pr.value && q.last) pr.value = q.last;
  };
  document.getElementById('caSave').onclick = async () => {
    const d = { action:'custom_add', market: mkt.value, currency: ccy.value, symbol: document.getElementById('caSym').value.trim().toUpperCase(), cond: document.getElementById('caCond').value,
      price: document.getElementById('caPrice').value, repeats: document.getElementById('caRep').value, interval: document.getElementById('caInt').value, note: document.getElementById('caNote').value };
    const res = await MK.post(d);
    if (!res.success) { GShell.toast(res.message || 'تعذّر الحفظ', 'err'); return; }
    GShell.toast(res.fired ? 'تم الحفظ — الشرط متحقق الآن وأُرسل أول تذكير' : 'تم حفظ التنبيه', 'ok'); reload();
  };
  app.querySelectorAll('[data-catog]').forEach(b => b.onclick = async () => { const x = await MK.post({ action:'custom_toggle', id: b.dataset.catog, active: b.dataset.on }); if (x.success) reload(); });
  app.querySelectorAll('[data-cadel]').forEach(b => b.onclick = async () => {
    if (!await gConfirm('حذف هذا التنبيه؟ (ينتقل إلى سلة المحذوفات ويمكنك استرجاعه)')) return;
    const x = await MK.post({ action:'custom_delete', id: b.dataset.cadel }); if (x.success) { GShell.toast('نُقل إلى سلة المحذوفات', 'ok'); reload(); }
  });
  mkLimitList(app.querySelector('.gs-notif-list'), 5);
  app.querySelectorAll('[data-ndel]').forEach(b => b.onclick = async () => {
    const x = await MK.post({ action:'alert_delete', id: b.dataset.ndel }); if (x.success) { GShell.toast('نُقل الإشعار إلى سلة المحذوفات', 'ok'); reload(); }
  });
  app.querySelectorAll('[data-sym]').forEach(b => b.onclick = () => renderStockPage(b.dataset.sym, b.dataset.mkt));
  if (r.success && r.unread) { await MK.post({ action: 'alerts_read' }); window.__mkUnread = 0; mkUpdateAlertBadge(); }
}

/* ---------------------------------------------------------------------
   05. منحنى أداء المحفظة (SVG من غير مكتبات)
   --------------------------------------------------------------------- */
/* الإصدار 91: أسعار السوق الحالية لأسهم الخطط (متأخرة 15 دقيقة) - بطاقة المحفظة + المحفظة والتقارير + المنحنى
   window.__mkLivePx['SYM|السوق'] = السعر. تخزين مؤقت 5 دقائق في الجلسة. لو السعر مش متاح ← آخر سعر أدخلته / آخر سعر شراء */
window.__mkLivePx = window.__mkLivePx || {};
async function mkEnsureLivePrices(plans, grids, timeoutMs = 1500){
  const need = {};
  Object.entries(plans || {}).forEach(([s, p]) => { if (p) need[s.toUpperCase() + '|' + (p.market || 'مصر')] = { symbol: s, market: p.market || 'مصر' }; });
  Object.entries(grids || {}).forEach(([s, g]) => { if (g) need[s.toUpperCase() + '|' + (g.market || 'مصر')] = { symbol: s, market: g.market || 'مصر' }; });
  let cache = { at: 0, map: {} }; try { cache = JSON.parse(sessionStorage.getItem('gs_livepx') || '') || cache; } catch(e){}
  const fresh = Date.now() - (cache.at || 0) < 5 * 60 * 1000;
  const missing = Object.keys(need).filter(k => !fresh || !(k in cache.map));
  // الشاشة بتترسم فورًا (بآخر أسعار متاحة) - ولو الأسعار وصلت بعد كده window.__mkLivePxPending بيرجّع true والشاشة بتتحدّث
  const apply = () => { let changed = false; Object.keys(need).forEach(k => { const v = cache.map[k] > 0 ? cache.map[k] : undefined; if (window.__mkLivePx[k] !== v) changed = true; if (v) window.__mkLivePx[k] = v; else delete window.__mkLivePx[k]; }); return changed; };
  window.__mkLivePxPending = null;
  if (missing.length) {
    let done = false;
    const req = MK.post({ action: 'prices', items: JSON.stringify(missing.map(k => need[k])) }).then(r => {
      if (r && r.success) { const map = fresh ? cache.map : {}; Object.entries(r.prices || {}).forEach(([k, v]) => { map[k] = v ? v.last : null; });
        cache = { at: fresh ? cache.at : Date.now(), map }; try { sessionStorage.setItem('gs_livepx', JSON.stringify(cache)); } catch(e){} }
      done = true;
    }).catch(() => { done = true; });
    await Promise.race([req, new Promise(res => setTimeout(res, timeoutMs))]);
    if (!done) window.__mkLivePxPending = req.then(() => apply());
  }
  apply();
  return window.__mkLivePx;
}
/* الإصدار 89: المنحنى بيظهر فورًا - النقاط القديمة بتتحسب من عمليات الشراء والبيع في الخطط
   (كل مركز مفتوح بقيمته على آخر سعر اتنفّذ عليه)، وبعدين اللقطات اليومية الحقيقية بتكمّل عليه.
   العملة بتتبعت بالكود (EGP / SAR ...) - قبل كده كانت بالاسم العربي وكل العملات كانت بتتسجّل EGP */
const MK_CCY_CODE = { 'جنيه مصري':'EGP', 'ريال سعودي':'SAR', 'درهم إماراتي':'AED', 'ريال قطري':'QAR', 'دينار كويتي':'KWD', 'دولار أمريكي':'USD' };
const mkCode = (c) => MK_CCY_CODE[c] || (/^[A-Z]{3}$/.test(c || '') ? c : '');
/* الإصدار 91: منحنى أداء المحفظة الصحيح
   القيمة في كل يوم = Σ (الكمية اللي كانت معاك يومها × سعر إغلاق السهم الحقيقي في نفس اليوم)
   - أسعار الإغلاق اليومية من السيرفر (markets_api history) - ولو السهم ملوش أسعار تاريخية ← آخر سعر اتنفّذ عليه
   - آخر نقطة = قيمة المحفظة الحالية (نفس بطاقة القيمة بالظبط)
   - خط منقّط = المبلغ المستثمر في المراكز المفتوحة (عشان تشوف الربح/الخسارة في أي وقت) */
function mkPlanPositions(plans, grids, code){
  const d10 = (x) => x ? String(x).slice(0, 10) : '';
  const ccyMap = (typeof MARKET_TO_CURRENCY_MAP !== 'undefined') ? MARKET_TO_CURRENCY_MAP : {};
  const out = [];
  const add = (key, sym, market, evs) => { evs = evs.filter(e => e.d && e.q && e.p > 0).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : (b.q - a.q)); if (evs.length) out.push({ key, sym, market: market || 'مصر', evs }); };
  Object.entries(plans || {}).forEach(([sym, p]) => {
    if (!p || mkCode(p.currency || ccyMap[p.market] || 'جنيه مصري') !== code) return;
    const evs = [];
    (p.levels || []).forEach(lv => {
      if (lv.executed && +lv.actualQty && +lv.actualPrice) evs.push({ d: d10(lv.execDate), q: +lv.actualQty, p: +lv.actualPrice });
      (lv.sells || []).forEach(sl => evs.push({ d: d10(sl.date), q: -(+sl.qty), p: +sl.price }));
    });
    add('D:' + sym, sym, p.market, evs);
  });
  Object.entries(grids || {}).forEach(([sym, g]) => {
    if (!g || mkCode(ccyMap[g.market] || 'جنيه مصري') !== code) return;
    const evs = [];
    (g.levels || []).forEach(lv => {
      if (lv.status === 'bought' && +lv.executedQty && +lv.executedPrice) evs.push({ d: d10(lv.executedDate), q: +lv.executedQty, p: +lv.executedPrice });
      (lv.sells || []).forEach(sl => evs.push({ d: d10(sl.date), q: -(+sl.qty), p: +sl.price }));
    });
    add('G:' + sym, sym, g.market, evs);
  });
  return out;
}
function mkDays(from, to){
  const out = []; const d = new Date(from + 'T00:00:00Z'), end = new Date(to + 'T00:00:00Z');
  while (d <= end && out.length < 2000) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}
function mkBuildSeries(positions, hist, today, nowValue, nowCost){
  if (!positions.length) return [];
  const first = positions.reduce((m, p) => p.evs[0].d < m ? p.evs[0].d : m, today);
  const days = mkDays(first, today);
  const st = positions.map(p => {
    const h = hist[p.sym.toUpperCase() + '|' + p.market]; const closes = {};
    ((h && h.rows) || []).forEach(([d, c]) => { closes[d] = +c; });
    return { p, i: 0, qty: 0, cost: 0, lastPx: 0, closes, hasHist: !!(h && h.rows && h.rows.length) };
  });
  const pts = days.map(d => {
    let v = 0, c = 0;
    st.forEach(s => {
      while (s.i < s.p.evs.length && s.p.evs[s.i].d <= d) {
        const e = s.p.evs[s.i++];
        if (e.q > 0) { s.qty += e.q; s.cost += e.q * e.p; }
        else { const sell = Math.min(s.qty, -e.q); const avg = s.qty > 0 ? s.cost / s.qty : 0; s.qty -= sell; s.cost -= sell * avg; if (s.qty < 1e-9) { s.qty = 0; s.cost = 0; } }
        if (!s.hasHist || s.lastPx === 0) s.lastPx = e.p;
      }
      if (s.closes[d] != null) s.lastPx = s.closes[d];   // سعر الإغلاق الحقيقي لليوم (وأيام الإجازة بتاخد آخر إغلاق)
      v += s.qty * s.lastPx; c += s.cost;
    });
    return { d, v, c };
  });
  // آخر نقطة = قيمة المحفظة الحالية (نفس البطاقة)
  if (pts.length && nowValue != null) { pts[pts.length - 1].v = nowValue; if (nowCost != null) pts[pts.length - 1].c = nowCost; }
  return pts;
}
async function mkPortfolioCurve(el, ccys, sel, plans, grids, rangeKey){
  if (!el) return;
  const items = (ccys || []).filter(x => mkCode(x.c)).map(x => ({ currency: mkCode(x.c), value: +(x.a.totalCurrentValue || 0).toFixed(2), cost: +(x.a.totalOpenCost || 0).toFixed(2) }));
  if (items.length && !el.__snapDone) { el.__snapDone = true; MK.post({ action: 'snapshot', items: JSON.stringify(items) }); }   // لقطة يومية (سجل)
  const code = mkCode(sel) || (items[0] && items[0].currency) || 'EGP';
  const now = items.find(x => x.currency === code);
  const positions = mkPlanPositions(plans, grids, code);
  const today = new Date().toISOString().slice(0, 10);
  if (!positions.length) { el.innerHTML = `<div class="section-card gs-curve"><div class="section-title">📈 أداء إجمالي المحفظة</div><div class="u-fs13 u-muted">سيظهر المنحنى بعد تسجيل أول عملية شراء في خططك (بتاريخ التنفيذ).</div></div>`; return; }
  // أسعار الإغلاق التاريخية (مرة واحدة لكل فتح للرئيسية)
  const firstD = positions.reduce((m, p) => p.evs[0].d < m ? p.evs[0].d : m, today);
  const spanDays = (Date.parse(today) - Date.parse(firstD)) / 86400000;
  const range = spanDays <= 85 ? '3mo' : spanDays <= 175 ? '6mo' : spanDays <= 360 ? '1y' : spanDays <= 720 ? '2y' : '5y';
  const cacheKey = code + '|' + range + '|' + positions.map(p => p.sym).join(',');
  if (!el.__hist || el.__histKey !== cacheKey) {
    el.innerHTML = `<div class="section-card gs-curve"><div class="section-title">📈 أداء إجمالي المحفظة (${escapeHtml(MK_CCY_AR[code] || code)})</div><div class="gs-skel" style="height:170px"></div></div>`;
    const uniq = {}; positions.forEach(p => { uniq[p.sym.toUpperCase() + '|' + p.market] = { symbol: p.sym, market: p.market }; });
    const r = await MK.post({ action: 'history', range, items: JSON.stringify(Object.values(uniq)) });
    if (!el.isConnected) return;
    el.__hist = (r && r.success && r.history) || {}; el.__histKey = cacheKey;
  }
  // آخر نقطة = بطاقة المحفظة بالظبط (الاتنين دلوقتي بسعر السوق وبنفس تعريف التكلفة)
  const all = mkBuildSeries(positions, el.__hist, today, now ? now.value : null, now ? now.cost : null);
  const RANGES = [['3m', '3 شهور', 92], ['6m', '6 شهور', 183], ['1y', 'سنة', 366], ['all', 'الكل', 99999]];
  rangeKey = rangeKey || el.__range || 'all'; el.__range = rangeKey;
  const lim = (RANGES.find(x => x[0] === rangeKey) || RANGES[3])[2];
  const cut = new Date(Date.now() - lim * 86400000).toISOString().slice(0, 10);
  let pts = all.filter(p => p.d >= cut); if (pts.length < 2) pts = all.slice(-2);
  const missing = positions.filter(p => { const h = el.__hist[p.sym.toUpperCase() + '|' + p.market]; return !(h && h.rows && h.rows.length); }).map(p => p.sym);
  const W = 600, H = 180, P = 8;
  const vals = pts.flatMap(p => [p.v, p.c]), min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;
  const x = (i) => P + i * (W - 2 * P) / Math.max(1, pts.length - 1), y = (v) => H - P - (v - min) / span * (H - 2 * P);
  const path = (k) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1], firstP = pts[0];
  const pl = last.v - last.c, plPct = last.c ? pl / last.c * 100 : 0, up = pl >= 0;
  const chg = last.v - firstP.v;
  const color = up ? 'var(--gs-pos, #0E9F6E)' : 'var(--gs-neg, #E02424)';
  el.innerHTML = `<div class="section-card gs-curve">
    <div class="u-row" style="align-items:flex-start;flex-wrap:wrap;gap:6px;">
      <div><div class="section-title u-m0">📈 أداء إجمالي المحفظة (${escapeHtml(MK_CCY_AR[code] || code)})</div>
        <div class="u-fs13 u-mt4"><b class="g-num">${MK.n(last.v)}</b> <span class="u-muted">القيمة الحالية</span> · <span style="color:${color}" class="g-num">${up ? '▲' : '▼'} ${MK.n(Math.abs(pl))} (${Math.abs(plPct).toFixed(2)}%)</span> <span class="u-muted">مقابل المستثمر ${MK.n(last.c)}</span></div></div>
      <div class="gs-curve-rng">${RANGES.map(([k, l]) => `<button type="button" class="${k === rangeKey ? 'on' : ''}" data-rng="${k}">${l}</button>`).join('')}</div>
    </div>
    <div class="gs-curve-box">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="gs-curve-svg" role="img" aria-label="منحنى قيمة المحفظة">
        <path d="${path('v')} L${x(pts.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z" fill="${color}" opacity=".12"></path>
        <path d="${path('c')}" fill="none" stroke="var(--text-muted, #888)" stroke-width="1.6" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"></path>
        <path d="${path('v')}" fill="none" stroke="${color}" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"></path>
        <line class="gs-curve-cursor" x1="0" x2="0" y1="0" y2="${H}" stroke="var(--text-muted, #999)" stroke-width="1" vector-effect="non-scaling-stroke" style="display:none"></line>
      </svg>
      <div class="gs-curve-tip" hidden></div>
    </div>
    <div class="gs-curve-legend"><span><i style="background:${color}"></i>القيمة السوقية</span><span><i class="dash"></i>المبلغ المستثمر</span><span class="u-muted">من ${escapeHtml(firstP.d)} · التغير في الفترة <b class="g-num" style="color:${chg >= 0 ? 'var(--gs-pos,#0E9F6E)' : 'var(--gs-neg,#E02424)'}">${chg >= 0 ? '+' : '−'}${MK.n(Math.abs(chg))}</b></span></div>
    <div class="u-hint u-mt4">القيمة في كل يوم = الكمية التي كانت لديك × سعر إغلاق السهم في ذلك اليوم (الأسعار متأخرة).${missing.length ? ` لا توجد أسعار تاريخية لـ ${missing.map(x => `<bdi>${escapeHtml(x)}</bdi>`).join('، ')} — حُسبت بآخر سعر تنفيذ.` : ''} آخر نقطة = قيمة المحفظة الحالية بسعر السوق (نفس البطاقة).</div>
  </div>`;
  el.querySelectorAll('[data-rng]').forEach(b => b.onclick = () => mkPortfolioCurve(el, ccys, sel, plans, grids, b.dataset.rng));
  const svg = el.querySelector('.gs-curve-svg'), tip = el.querySelector('.gs-curve-tip'), cur = el.querySelector('.gs-curve-cursor');
  const move = (ev) => {
    const r = svg.getBoundingClientRect(); const cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    const i = Math.max(0, Math.min(pts.length - 1, Math.round((cx / r.width * W - P) / ((W - 2 * P) / Math.max(1, pts.length - 1)))));
    const p = pts[i]; const px = x(i) / W * r.width;
    cur.setAttribute('x1', x(i)); cur.setAttribute('x2', x(i)); cur.style.display = '';
    tip.hidden = false; tip.innerHTML = `<b>${escapeHtml(p.d)}</b><br>القيمة: <b class="g-num">${MK.n(p.v)}</b><br>المستثمر: <span class="g-num">${MK.n(p.c)}</span>`;
    tip.style.left = Math.max(0, Math.min(r.width - tip.offsetWidth, px - tip.offsetWidth / 2)) + 'px';
  };
  svg.addEventListener('mousemove', move); svg.addEventListener('touchmove', move, { passive: true }); svg.addEventListener('touchstart', move, { passive: true });
  svg.addEventListener('mouseleave', () => { tip.hidden = true; cur.style.display = 'none'; });
}
// بتتنادى من الرئيسية (shell.js) بعد الرسم
async function mkAfterHome(plans, grids, ccys, sel, email){
  try { await mkSyncTargets(plans, grids, email); } catch(e){}
  mkAlertsCard(document.getElementById('gsAlertsCard'));
  mkPortfolioCurve(document.getElementById('gsCurve'), ccys, sel, plans, grids);
}
