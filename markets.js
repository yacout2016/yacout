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
function mkMarketSelect(id, sel){ return `<select id="${id}" style="margin:0;">${MK.markets.map(m => `<option ${m === sel ? 'selected' : ''}>${m}</option>`).join('')}</select>`; }
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
      </div><button type="button" class="small secondary" id="spOpenPlan" style="width:auto;margin-top:8px;">فتح الخطة</button></div>`;
  }
  if (grid) {
    const bought = (grid.levels || []).filter(l => l.status === 'bought');
    const nextBuy = (grid.levels || []).filter(l => l.status !== 'bought').map(l => +l.plannedPrice).sort((a, b) => b - a)[0];
    const nextSell = bought.map(l => +l.sellTargetPrice).filter(Boolean).sort((a, b) => a - b)[0];
    planHtml += `<div class="section-card"><div class="section-title">خطة Grid على ${escapeHtml(symbol)}</div>
      <div class="grid2" style="font-size:13px;line-height:2;"><div>مستويات مشتراة: <b>${bought.length}/${(grid.levels || []).length}</b></div>
        <div>الشراء التالي: <b>${MK.n(nextBuy, 4)}</b></div><div>أقرب هدف بيع: <b>${MK.n(nextSell, 4)}</b></div></div>
      <button type="button" class="small secondary" id="spOpenGrid" style="width:auto;margin-top:8px;">فتح الخطة</button></div>`;
  }

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">
    <div class="gs-page-title">📈 ${escapeHtml(symbol)} ${q.success && q.name ? `<small style="font-size:14px;opacity:.7">— ${escapeHtml(q.name)}</small>` : ''}</div>
    <div class="section-card" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;">
      ${q.success ? `<div><div style="font-size:30px;font-weight:800;" dir="ltr">${MK.n(q.last, 4)} <small style="font-size:14px;">${escapeHtml(q.currency || '')}</small></div>
        <div style="font-size:13px;">${mkChgHtml(q.last, q.prevClose)} <span class="ta-delay-badge">⏱️ متأخر ${q.delayMinutes || 15} دقيقة</span></div></div>
        <div style="font-size:12.5px;line-height:1.9;opacity:.85;">أعلى اليوم: <b dir="ltr">${MK.n(q.high, 4)}</b><br>أقل اليوم: <b dir="ltr">${MK.n(q.low, 4)}</b><br>الإغلاق السابق: <b dir="ltr">${MK.n(q.prevClose, 4)}</b></div>`
        : `<div class="error" style="margin:0">${escapeHtml(q.message || 'لم نجد أسعارًا لهذا السهم')}</div>`}
      <div style="margin-inline-start:auto;display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="small ${q.watchId ? 'secondary' : ''}" id="spWatch" style="width:auto;">${q.watchId ? '✓ في قائمة المتابعة' : '⭐ أضف للمتابعة'}</button>
        <button type="button" class="small" id="spNewPlan" style="width:auto;">➕ ابدأ خطة</button>
      </div>
    </div>
    <div class="section-card" style="padding:0;overflow:hidden;"><iframe title="شارت ${escapeHtml(symbol)}" src="${chartUrl}" style="width:100%;height:420px;border:0;display:block;" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups"></iframe></div>
    <div class="gs-home-cols"><div class="c1">${planHtml || '<div class="section-card" style="color:#888;">لا توجد لديك خطة على هذا السهم بعد.</div>'}</div>
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
      <button type="button" id="wlAdd" style="width:auto;margin:0;">➕ إضافة</button>
      <span style="font-size:12px;opacity:.7;margin-inline-start:auto;">الأسعار تتحدّث تلقائيًا كل دقيقة (متأخرة 15 دقيقة)</span>
    </div>
    <div class="section-card" style="padding:0;overflow:auto;"><table class="std-table" style="width:100%;"><thead><tr>
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
      <td><button type="button" class="small danger" data-del="${x.id}" style="width:auto;">✕</button></td></tr>`).join('')
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
async function mkSyncTargets(plans, grids){
  const t = mkComputeTargets(plans, grids);
  const sig = JSON.stringify(t);
  if (window.__mkTargetsSig === sig) return;   // نفس المستويات ← لا يوجد داعي نبعت تاني في نفس الجلسة
  window.__mkTargetsSig = sig;
  await MK.post({ action: 'sync_targets', targets: sig });
}
async function mkAlertsCard(el){
  if (!el) return;
  const r = await MK.get('action=alerts');
  window.__mkUnread = r.success ? r.unread : 0; mkUpdateAlertBadge();
  const list = r.success ? r.alerts.filter(a => !a.is_read).slice(0, 3) : [];
  el.innerHTML = list.length ? `<div class="section-card gs-alert-card"><div style="display:flex;justify-content:space-between;align-items:center;"><strong>🔔 تنبيهات الأسعار (${r.unread})</strong><button type="button" class="gs-link" id="gsAlertsAll">عرض الكل</button></div>
    ${list.map(a => `<div class="gs-alert-row"><b>${escapeHtml(a.title)}</b><div>${escapeHtml(a.body || '')}</div></div>`).join('')}</div>` : '';
  const b = document.getElementById('gsAlertsAll'); if (b) b.onclick = () => renderAlertsPage();
}
function mkUpdateAlertBadge(){
  document.querySelectorAll('[data-gs-alerts-badge]').forEach(e => { e.textContent = window.__mkUnread || ''; e.style.display = window.__mkUnread ? '' : 'none'; });
}
async function renderAlertsPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderAlertsPage());
  const email = await getSession();
  if (!email) return renderLogin();
  window.__lastPageKey = 'alerts';
  const r = await MK.get('action=alerts');
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide"><div class="gs-page-title">🔔 تنبيهات الأسعار</div>
    <div class="info">نبلغك هنا وعلى بريدك عندما يصل سعر السهم إلى سعر الشراء التالي أو هدف البيع في خطتك (الأسعار متأخرة 15 دقيقة).</div>
    ${r.success && r.alerts.length ? r.alerts.map(a => `<div class="section-card" style="${a.is_read ? 'opacity:.7' : ''}"><div style="display:flex;justify-content:space-between;gap:8px;"><b>${escapeHtml(a.title)}</b><small style="opacity:.7">${escapeHtml(a.created_at)}</small></div>
      <div style="font-size:13px;line-height:1.9;">${escapeHtml(a.body || '')}</div>${a.symbol ? `<button type="button" class="small secondary" data-sym="${escapeHtml(a.symbol)}" data-mkt="${escapeHtml(a.market || 'مصر')}" style="width:auto;margin-top:6px;">📈 صفحة السهم</button>` : ''}</div>`).join('')
      : '<div class="section-card" style="color:#888;">لا توجد تنبيهات بعد. أنشئ خطة وسننبهك عند وصول السعر لمستوياتها.</div>'}</div>`;
  document.querySelectorAll('[data-sym]').forEach(b => b.onclick = () => renderStockPage(b.dataset.sym, b.dataset.mkt));
  if (r.success && r.unread) { await MK.post({ action: 'alerts_read' }); window.__mkUnread = 0; mkUpdateAlertBadge(); }
}

/* ---------------------------------------------------------------------
   05. منحنى أداء المحفظة (SVG من غير مكتبات)
   --------------------------------------------------------------------- */
async function mkPortfolioCurve(el, ccys, sel){
  if (!el) return;
  // لقطة النهارده لكل عملة
  const items = (ccys || []).filter(x => x.c && x.c !== '—').map(x => ({ currency: x.c, value: +(x.a.totalCurrentValue || 0).toFixed(2), cost: +(x.a.totalInvested || 0).toFixed(2) }));
  if (items.length) await MK.post({ action: 'snapshot', items: JSON.stringify(items) });
  const r = await MK.get('action=snapshots&days=180');
  const series = (r.success && r.series) || {};
  const ccy = series[sel] ? sel : Object.keys(series)[0];
  const pts = ccy ? series[ccy] : [];
  if (!pts || pts.length < 2) { el.innerHTML = `<div class="section-card gs-curve"><div class="section-title">📈 أداء المحفظة</div><div style="font-size:12.5px;opacity:.75;">المنحنى يبدأ في الظهور بعد يومين من تسجيل قيمة محفظتك (يُحفظ تلقائيًا كل يوم تفتح فيه الموقع).</div></div>`; return; }
  const W = 600, H = 170, P = 8;
  const vals = pts.map(p => p.v), min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;
  const x = (i) => P + i * (W - 2 * P) / (pts.length - 1), y = (v) => H - P - (v - min) / span * (H - 2 * P);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const first = pts[0].v, last = pts[pts.length - 1].v, diff = last - first, pct = first ? diff / first * 100 : 0, up = diff >= 0;
  const color = up ? 'var(--gs-pos, #0E9F6E)' : 'var(--gs-neg, #E02424)';
  el.innerHTML = `<div class="section-card gs-curve"><div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px;">
      <div class="section-title" style="margin:0">📈 أداء المحفظة (${escapeHtml(ccy)})</div>
      <div style="font-size:13px;"><b dir="ltr">${MK.n(last)}</b> <span style="color:${color}" dir="ltr">${up ? '▲' : '▼'} ${MK.n(Math.abs(diff))} (${Math.abs(pct).toFixed(2)}%)</span> <small style="opacity:.7">منذ ${escapeHtml(pts[0].d)}</small></div></div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:170px;display:block;margin-top:8px;" role="img" aria-label="منحنى قيمة المحفظة">
      <path d="${line} L${x(pts.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z" fill="${color}" opacity=".12"></path>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"></path>
    </svg></div>`;
}
// بتتنادى من الرئيسية (shell.js) بعد الرسم
async function mkAfterHome(plans, grids, ccys, sel){
  try { await mkSyncTargets(plans, grids); } catch(e){}
  mkAlertsCard(document.getElementById('gsAlertsCard'));
  mkPortfolioCurve(document.getElementById('gsCurve'), ccys, sel);
}
