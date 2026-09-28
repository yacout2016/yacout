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
  el.innerHTML = list.length ? `<div class="section-card gs-alert-card"><div class="u-row"><strong>🔔 تنبيهات الأسعار (${r.unread})</strong><button type="button" class="gs-link" id="gsAlertsAll">عرض الكل</button></div>
    ${list.map(a => `<div class="gs-alert-row"><b>${escapeHtml(a.title)}</b><div>${escapeHtml(a.body || '')}</div></div>`).join('')}</div>` : '';
  const b = document.getElementById('gsAlertsAll'); if (b) b.onclick = () => renderAlertsPage();
}
function mkUpdateAlertBadge(){
  document.querySelectorAll('[data-gs-alerts-badge]').forEach(e => { e.textContent = window.__mkUnread || ''; e.style.display = window.__mkUnread ? '' : 'none'; });
}
/* الإصدار 89: تنبيهات سعر مخصّصة - البورصة + العملة + السهم ← آخر سعر (متأخر 15 دقيقة) ← السعر المطلوب
   الشرط ≥ أو ≤ + عدد مرات التذكير (حد أقصى 3) + الفرق بين كل تذكير (حد أقصى 24 ساعة)
   الإشعار: إيميل + رسالة في شات الموقع + الجرس */
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
          <td>${a.cond === 'lte' ? '≤' : '≥'} <b class="g-num">${MK.n(a.target_price, 4)}</b> ${escapeHtml(a.currency)}${a.note ? `<div class="u-hint">${escapeHtml(a.note)}</div>` : ''}</td>
          <td><button type="button" class="small secondary u-wa" data-catog="${a.id}" data-on="${a.active ? 0 : 1}">${a.active ? 'إيقاف' : 'تشغيل من جديد'}</button>
            <button type="button" class="small danger u-wa" data-cadel="${a.id}">🗑️</button></td>
          <td class="${a.active ? 'u-pos' : 'u-muted'}">${statusOf(a)}</td>
          <td class="g-num">${MK.n(a.last_price, 4)}</td>
          <td>${a.max_repeats} × كل ${mkIntervalLabel(a.repeat_minutes)}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="u-muted">لا توجد تنبيهات مخصّصة بعد.</div>'}
    </div>
    <div class="section-title u-mt14">سجل الإشعارات</div>
    <div class="info">تصلك هنا أيضًا تنبيهات مستويات خططك (سعر الشراء التالي وهدف البيع).</div>
    ${r.success && r.alerts.length ? r.alerts.map(a => `<div class="section-card" style="${a.is_read ? 'opacity:.7' : ''}"><div style="display:flex;justify-content:space-between;gap:8px;"><b>${escapeHtml(a.title)}</b><small style="opacity:.7">${escapeHtml(a.created_at)}</small></div>
      <div style="font-size:13px;line-height:1.9;">${escapeHtml(a.body || '')}</div>${a.symbol ? `<button type="button" class="small secondary u-wa u-mt6" data-sym="${escapeHtml(a.symbol)}" data-mkt="${escapeHtml(a.market || 'مصر')}">📈 صفحة السهم</button>` : ''}</div>`).join('')
      : '<div class="section-card u-muted">لا توجد إشعارات بعد.</div>'}</div>`;
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
  app.querySelectorAll('[data-sym]').forEach(b => b.onclick = () => renderStockPage(b.dataset.sym, b.dataset.mkt));
  if (r.success && r.unread) { await MK.post({ action: 'alerts_read' }); window.__mkUnread = 0; mkUpdateAlertBadge(); }
}

/* ---------------------------------------------------------------------
   05. منحنى أداء المحفظة (SVG من غير مكتبات)
   --------------------------------------------------------------------- */
/* الإصدار 89: المنحنى بيظهر فورًا - النقاط القديمة بتتحسب من عمليات الشراء والبيع في الخطط
   (كل مركز مفتوح بقيمته على آخر سعر اتنفّذ عليه)، وبعدين اللقطات اليومية الحقيقية بتكمّل عليه.
   العملة بتتبعت بالكود (EGP / SAR ...) - قبل كده كانت بالاسم العربي وكل العملات كانت بتتسجّل EGP */
const MK_CCY_CODE = { 'جنيه مصري':'EGP', 'ريال سعودي':'SAR', 'درهم إماراتي':'AED', 'ريال قطري':'QAR', 'دينار كويتي':'KWD', 'دولار أمريكي':'USD' };
const mkCode = (c) => MK_CCY_CODE[c] || (/^[A-Z]{3}$/.test(c || '') ? c : '');
function mkHistoryFromPlans(plans, grids, code){
  const ev = [];
  const d10 = (x) => x ? String(x).slice(0, 10) : '';
  const ccyOfDca = (p) => mkCode(p.currency || (typeof MARKET_TO_CURRENCY_MAP !== 'undefined' ? MARKET_TO_CURRENCY_MAP[p.market] : '') || 'جنيه مصري');
  const ccyOfGrid = (g) => mkCode((typeof MARKET_TO_CURRENCY_MAP !== 'undefined' ? MARKET_TO_CURRENCY_MAP[g.market] : '') || 'جنيه مصري');
  Object.entries(plans || {}).forEach(([sym, p]) => {
    if (!p || ccyOfDca(p) !== code) return;
    (p.levels || []).forEach(lv => {
      if (lv.executed && +lv.actualQty && +lv.actualPrice && d10(lv.execDate)) ev.push({ d: d10(lv.execDate), k: 'D:' + sym, q: +lv.actualQty, p: +lv.actualPrice });
      (lv.sells || []).forEach(sl => { if (+sl.qty && d10(sl.date)) ev.push({ d: d10(sl.date), k: 'D:' + sym, q: -sl.qty, p: +sl.price }); });
    });
  });
  Object.entries(grids || {}).forEach(([sym, g]) => {
    if (!g || ccyOfGrid(g) !== code) return;
    (g.levels || []).forEach(lv => {
      if (lv.status === 'bought' && +lv.executedQty && +lv.executedPrice && d10(lv.executedDate)) ev.push({ d: d10(lv.executedDate), k: 'G:' + sym, q: +lv.executedQty, p: +lv.executedPrice });
      (lv.sells || []).forEach(sl => { if (+sl.qty && d10(sl.date)) ev.push({ d: d10(sl.date), k: 'G:' + sym, q: -sl.qty, p: +sl.price }); });
    });
  });
  ev.sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
  const qty = {}, last = {}, out = [];
  ev.forEach(e => {
    qty[e.k] = Math.max(0, (qty[e.k] || 0) + e.q); last[e.k] = e.p;
    const v = Object.keys(qty).reduce((s, k) => s + qty[k] * (last[k] || 0), 0);
    if (out.length && out[out.length - 1].d === e.d) out[out.length - 1].v = v; else out.push({ d: e.d, v });
  });
  return out;
}
async function mkPortfolioCurve(el, ccys, sel, plans, grids){
  if (!el) return;
  // لقطة النهارده لكل عملة (بالكود)
  const items = (ccys || []).filter(x => mkCode(x.c)).map(x => ({ currency: mkCode(x.c), value: +(x.a.totalCurrentValue || 0).toFixed(2), cost: +(x.a.totalInvested || 0).toFixed(2) }));
  if (items.length) await MK.post({ action: 'snapshot', items: JSON.stringify(items) });
  const r = await MK.get('action=snapshots&days=365');
  if (!el.isConnected) return;
  const series = (r.success && r.series) || {};
  const ccy = mkCode(sel) || Object.keys(series)[0] || 'EGP';
  const snaps = (series[ccy] || []).map(p => ({ d: p.d, v: p.v }));
  // تاريخ من الخطط قبل أول لقطة + اللقطات الحقيقية
  const firstSnap = snaps.length ? snaps[0].d : '9999-12-31';
  const hist = mkHistoryFromPlans(plans, grids, ccy).filter(p => p.d < firstSnap);
  const pts = hist.concat(snaps);
  if (pts.length < 2) { el.innerHTML = `<div class="section-card gs-curve"><div class="section-title">📈 أداء المحفظة</div><div class="u-fs13 u-muted">سيظهر المنحنى بعد تسجيل أول عمليات شراء في خططك (بتاريخ التنفيذ)، ويتحدث تلقائيًا كل يوم تفتح فيه الموقع.</div></div>`; return; }
  const W = 600, H = 170, P = 8;
  const vals = pts.map(p => p.v), min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;
  const x = (i) => P + i * (W - 2 * P) / (pts.length - 1), y = (v) => H - P - (v - min) / span * (H - 2 * P);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const first = pts[0].v, lastV = pts[pts.length - 1].v, diff = lastV - first, pct = first ? diff / first * 100 : 0, up = diff >= 0;
  const color = up ? 'var(--gs-pos, #0E9F6E)' : 'var(--gs-neg, #E02424)';
  el.innerHTML = `<div class="section-card gs-curve"><div class="u-row" style="align-items:baseline;flex-wrap:wrap;gap:6px;">
      <div class="section-title u-m0">📈 أداء إجمالي المحفظة (${escapeHtml(ccy)})</div>
      <div class="u-fs13"><b class="g-num">${MK.n(lastV)}</b> <span style="color:${color}" class="g-num">${up ? '▲' : '▼'} ${MK.n(Math.abs(diff))} (${Math.abs(pct).toFixed(2)}%)</span> <small class="u-muted">منذ ${escapeHtml(pts[0].d)}</small></div></div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:170px;display:block;margin-top:8px;" role="img" aria-label="منحنى قيمة المحفظة">
      <path d="${line} L${x(pts.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z" fill="${color}" opacity=".12"></path>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"></path>
    </svg>${hist.length ? `<div class="u-hint u-mt4">النقاط قبل ${escapeHtml(snaps.length ? firstSnap : 'اليوم')} محسوبة من عمليات الشراء والبيع في خططك (بسعر التنفيذ)، وبعدها قيمة المحفظة الفعلية يوميًا.</div>` : ''}</div>`;
}
// بتتنادى من الرئيسية (shell.js) بعد الرسم
async function mkAfterHome(plans, grids, ccys, sel){
  try { await mkSyncTargets(plans, grids); } catch(e){}
  mkAlertsCard(document.getElementById('gsAlertsCard'));
  mkPortfolioCurve(document.getElementById('gsCurve'), ccys, sel, plans, grids);
}
