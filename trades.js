/* =====================================================================
   GRIFFINE — trades.js (الإصدار 105) — تقرير الصفقات
   ---------------------------------------------------------------------
   مصدر البيانات: الخطط نفسها (user_plans) لحظة فتح التقرير ← trades_report.php?action=live
   والحساب بنفس دالة الشاشة الرئيسية والمحفظة (computeAggregates + simulatePlan) وبآخر سعر من السوق
   ← الأرقام بتطابق بيانات كل مشترك بالظبط، وبتتحدّث تلقائيًا كل دقيقة طول ما الشاشة مفتوحة.
   الإدارة (view_reports): كل المشتركين (حتى اللي مالوش صفقات) + اختيار مشترك أو أكتر + حالة الاشتراك
   العميل: معاملاته هو بس
   الفلاتر (فورية من غير تحميل): الفترة · نوع الخطة · السهم · المشتركين · حالة المركز · حالة الاشتراك · السوق
   ===================================================================== */
const TR_TYPE = { buy:'شراء', sell:'بيع', closed:'صفقة مقفولة' };
const TR_SUB = { active:'نشط', expired:'منتهي', stopped:'موقوف', none:'بدون اشتراك' };
const TR_CCY = { 'جنيه مصري':'EGP', 'ريال سعودي':'SAR', 'درهم إماراتي':'AED', 'ريال قطري':'QAR', 'دينار كويتي':'KWD', 'دولار أمريكي':'USD' };
function trMoney(n){ return (Math.round((+n || 0) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
const trDay = (d) => d ? String(d).slice(0, 10) : '';
const trCcyOf = (kind, p) => { const c = kind === 'DCA' ? (p.currency || MARKET_TO_CURRENCY_MAP[p.market] || '') : (MARKET_TO_CURRENCY_MAP[p.market] || ''); return TR_CCY[c] || c || 'EGP'; };

// عمليات خطة واحدة (شراء / بيع / صفقة مقفولة) - من نفس البيانات اللي شاشة الخطة بتعرضها
function trPlanEvents(kind, sym, p){
  const ev = [];
  if (kind === 'DCA') {
    const sim = simulatePlan(p);
    (sim.rows || []).forEach(r => {
      if (!r.executed) return;
      ev.push({ type:'buy', date: trDay(r.execDate), qty: +r.qty || 0, price: +r.price || 0, level: r.level });
      (r.sells || []).forEach(s => ev.push({ type:'sell', date: trDay(s.date), qty: +s.qty || 0, price: +s.price || 0, profit: +s.profit || 0, level: r.level }));
    });
  } else {
    (p.levels || []).forEach((lv, i) => {
      if (lv.status !== 'bought' || !(+lv.executedQty > 0)) return;
      ev.push({ type:'buy', date: trDay(lv.executedDate), qty: +lv.executedQty, price: +lv.executedPrice || 0, level: lv.level || i + 1 });
      (lv.sells || []).forEach(s => ev.push({ type:'sell', date: trDay(s.date), qty: +s.qty || 0, price: +s.price || 0, profit: ((+s.price || 0) - (+lv.executedPrice || 0)) * (+s.qty || 0), level: lv.level || i + 1 }));
    });
  }
  (p.closedTrades || []).forEach(c => ev.push({ type:'closed', date: trDay(c.closedDate), qty: +c.totalQty || 0, price: +c.avgEntry || 0, exit: c.avgExit != null ? +c.avgExit : null, profit: +c.profit || 0, capital: +c.capitalUsed || 0 }));
  return ev;
}

async function renderTradesReportPage(f){
  const __tok = screenToken();
  pushNav(() => renderTradesReportPage(f));
  const email = await getSession();
  if (!email) return renderLogin();
  const staff = window.__isAdmin && hasPermission('view_reports');
  if (!staff && (window.__isAdmin || (window.GShell && GShell.settings && GShell.settings.hide_trades_screen !== false))) return window.__isAdmin ? renderAdminHub() : renderHome();
  const F = Object.assign({ from:'', to:'', kind:'', symbol:'', status:'', sub:'', emails:[] }, f || {});
  window.__lastPageKey = 'trades_report';
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>${staff ? pageTitle('trades_report', '📈 تقرير الصفقات') : pageTitle('my_trades_report', '📈 تقرير صفقاتي')}</div>
      ${staff ? '<button class="secondary small" id="trBackBtn">🛡️ رجوع للوحة التحكم</button>' : ''}</div>
    <div class="card"><div class="g-grid-filters">
      <label>من <input type="date" id="trFrom" value="${escapeHtml(F.from)}"></label>
      <label>إلى <input type="date" id="trTo" value="${escapeHtml(F.to)}"></label>
      <label>نوع الخطة <select id="trKind"><option value="">الكل</option><option value="DCA">DCA</option><option value="Grid">Grid</option></select></label>
      <label>السهم <select id="trSym"><option value="">كل الأسهم</option></select></label>
      <label>حالة المركز <select id="trStatus"><option value="">الكل</option><option value="مفتوحة">مفتوحة</option><option value="مغلقة">مغلقة</option><option value="جديدة">لم تبدأ</option></select></label>
      ${staff ? `<label>الاشتراك <select id="trSub"><option value="">الكل</option>${Object.entries(TR_SUB).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <div class="tr-cust"><span class="tr-lbl">المشتركين</span><div class="ms-dropdown" id="trCust"><button type="button" class="ms-toggle" id="trCustBtn">كل المشتركين ▾</button>
        <div class="ms-panel" id="trCustPanel" hidden><input type="search" id="trCustQ" placeholder="بحث بالاسم أو الإيميل أو الكود"><label class="ms-item"><input type="checkbox" id="trCustAll"> <b>كل المشتركين</b></label><div id="trCustList"></div></div></div></div>` : ''}
    </div>
    ${staff && typeof gAdminMarketBarHtml === 'function' ? gAdminMarketBarHtml('trMarket') : ''}
    <div class="radio-row u-mt10">
      <button class="small" id="trRefresh">🔄 تحديث الآن</button>
      <button class="small secondary" id="trClear">مسح الفلاتر</button>
      ${staff ? '<button class="small secondary" id="trCsvCust">⬇️ Excel المشتركين</button>' : ''}
      <button class="small secondary" id="trCsvPos">⬇️ Excel المراكز</button>
      <button class="small secondary" id="trCsv">⬇️ Excel العمليات</button>
      <button class="small secondary" id="trPrint">🖨️ طباعة / PDF</button>
      <span class="u-muted tr-at" id="trAt"></span>
    </div></div>
    <div id="trBody"><p class="u-muted">جارٍ التحميل...</p></div>
  </div>`;
  const $ = (id) => document.getElementById(id);
  $('trKind').value = F.kind; $('trStatus').value = F.status; if ($('trSub')) $('trSub').value = F.sub;
  const bb = $('trBackBtn'); if (bb) bb.onclick = () => goAdminHome();

  let D = null, R = null;
  const sel = new Set(F.emails || []);
  const read = () => { F.from = $('trFrom').value; F.to = $('trTo').value; F.kind = $('trKind').value; F.symbol = $('trSym').value; F.status = $('trStatus').value; F.sub = $('trSub') ? $('trSub').value : ''; F.emails = [...sel]; };

  // ---- اختيار المشتركين (واحد أو أكتر - الافتراضي الكل) ----
  const accLabel = (a) => [a.code, a.name, a.email].filter(Boolean).join(' · ');
  function drawCustList(){
    const box = $('trCustList'); if (!box || !D) return;
    const q = ($('trCustQ').value || '').trim().toLowerCase();
    box.innerHTML = D.accounts.filter(a => !q || accLabel(a).toLowerCase().includes(q)).map(a =>
      `<label class="ms-item"><input type="checkbox" value="${escapeHtml(a.email)}" ${sel.has(a.email) ? 'checked' : ''}> <span><b>${escapeHtml(a.name || a.email)}</b>${a.code ? ` <small class="u-muted">${escapeHtml(a.code)}</small>` : ''}${a.name ? `<br><small class="u-muted" dir="ltr">${escapeHtml(a.email)}</small>` : ''}</span></label>`).join('') || '<p class="u-muted">لا يوجد</p>';
    $('trCustAll').checked = !sel.size;
    $('trCustBtn').textContent = (!sel.size ? 'كل المشتركين' : sel.size === 1 ? accLabel(D.accounts.find(a => a.email === [...sel][0]) || { email: [...sel][0] }) : `${sel.size} مشتركين مختارين`) + ' ▾';
  }
  if (staff) {
    $('trCustBtn').onclick = (e) => { e.stopPropagation(); const pn = $('trCustPanel'); pn.hidden = !pn.hidden; if (!pn.hidden) $('trCustQ').focus(); };
    $('trCustPanel').onclick = (e) => e.stopPropagation();
    document.addEventListener('click', function close(){ const pn = $('trCustPanel'); if (!pn) return document.removeEventListener('click', close); pn.hidden = true; });
    $('trCustQ').oninput = drawCustList;
    $('trCustPanel').onkeydown = (e) => { if (e.key === 'Escape') { $('trCustPanel').hidden = true; $('trCustBtn').focus(); } };
    document.addEventListener('keydown', function esc(e){ const pn = $('trCustPanel'); if (!pn) return document.removeEventListener('keydown', esc); if (e.key === 'Escape') pn.hidden = true; });
    $('trCustAll').onchange = () => { sel.clear(); drawCustList(); apply(); };
    $('trCustList').onchange = (e) => { const c = e.target; if (!c.value) return; if (c.checked) sel.add(c.value); else sel.delete(c.value); drawCustList(); apply(); };
  }
  ['trFrom', 'trTo', 'trKind', 'trSym', 'trStatus', 'trSub'].forEach(id => { const el = $(id); if (el) el.onchange = apply; });
  $('trClear').onclick = () => { ['trFrom', 'trTo', 'trKind', 'trSym', 'trStatus', 'trSub'].forEach(id => { const el = $(id); if (el) el.value = ''; }); sel.clear(); drawCustList(); apply(); };
  $('trRefresh').onclick = () => load(true);
  if (staff && typeof gWireAdminMarket === 'function') gWireAdminMarket('trMarket', () => load(true));

  // ---- الحساب: لكل مشترك بنفس دالة الرئيسية ----
  function compute(){
    read(); window.__mkLivePx = window.__mkLivePx || {};
    const from = F.from || null, to = F.to || null;
    const inRange = (d) => (!from && !to) || (d && (!from || d >= from) && (!to || d <= to));
    const byAcc = {};
    D.plans.forEach(x => { (byAcc[x.e] = byAcc[x.e] || []).push(x); });
    const accs = D.accounts.filter(a => (!sel.size || sel.has(a.email)) && (!F.sub || a.sub === F.sub));
    const out = { customers: [], positions: [], events: [] };
    accs.forEach(a => {
      const plans = {}, grids = {}, meta = {};
      (byAcc[a.email] || []).forEach(x => {
        if (F.kind && x.k !== F.kind) return;
        if (F.symbol && x.s.toUpperCase() !== F.symbol) return;
        const obj = JSON.parse(JSON.stringify(x.p));
        if (x.k === 'DCA') { if (!Array.isArray(obj.levels)) obj.levels = []; plans[x.s] = obj; } else { if (!Array.isArray(obj.levels)) obj.levels = []; grids[x.s] = obj; }
        meta[x.s + '::' + x.k] = { ccy: trCcyOf(x.k, obj) };
        // سهم غير مدرج: سعره = آخر سعر كتبه المشترك ده بنفسه
        if (obj.listed === false) { const k = x.s.toUpperCase() + '|' + (obj.market || 'مصر'); if (+obj.manualLastPrice > 0) window.__mkLivePx[k] = +obj.manualLastPrice; else delete window.__mkLivePx[k]; }
      });
      let entries = [...Object.keys(plans).map(s => ({ key: `${s}::DCA`, sym: s, type: 'DCA' })), ...Object.keys(grids).map(s => ({ key: `${s}::Grid`, sym: s, type: 'Grid' }))];
      let agg = computeAggregates(plans, grids, entries, from, to);
      if (F.status) { const keep = agg.stockRows.filter(r => r.status === F.status).map(r => `${r.symbol}::${r.planType}`); entries = entries.filter(e => keep.includes(e.key)); agg = computeAggregates(plans, grids, entries, from, to); }
      const c = { acc: a, plans: entries.length, open: 0, openCost: 0, value: 0, unreal: 0, realized: 0, closedProfit: 0, buys: 0, sells: 0, closed: 0, wins: 0, buyValue: 0, sellValue: 0, last: '', ccys: new Set() };
      agg.stockRows.forEach(r => {
        const key = `${r.symbol}::${r.planType}`, src = r.planType === 'DCA' ? plans[r.symbol] : grids[r.symbol];
        const ev = trPlanEvents(r.planType, r.symbol, src);
        const ccy = meta[key].ccy; c.ccys.add(ccy);
        // الربح المحقق من البيع الجزئي (جوه الفترة لو فيه فترة) - الصفقات المقفولة جاية من computeAggregates بنفس فلتر الفترة
        const realizedSells = (from || to) ? ev.filter(e => e.type === 'sell' && r.planType === 'DCA' && inRange(e.date)).reduce((s, e) => s + e.profit, 0) : (+r.realized || 0);
        const pos = { acc: a, symbol: r.symbol, kind: r.planType, market: r.market || '', ccy, status: r.status, openCost: +r.openCost || 0, value: +r.currentValue || 0,
          unreal: +r.unrealized || 0, pct: r.dropPercent, realized: realizedSells, closedCount: r.closedCount || 0, closedProfit: +r.closedProfit || 0, buys: 0, sells: 0, buyValue: 0, sellValue: 0, wins: 0, last: '' };
        ev.forEach(e => {
          if (e.date && e.date > pos.last) pos.last = e.date;
          if (!inRange(e.date)) return;
          if (e.type === 'buy') { pos.buys++; pos.buyValue += e.qty * e.price; }
          else if (e.type === 'sell') { pos.sells++; pos.sellValue += e.qty * e.price; }
          else if (e.profit > 0) pos.wins++;
          out.events.push(Object.assign({ acc: a, symbol: r.symbol, kind: r.planType, market: r.market || '', ccy }, e));
        });
        pos.total = pos.unreal + pos.realized + pos.closedProfit;
        out.positions.push(pos);
        if (r.status === 'مفتوحة') c.open++;
        ['openCost', 'value', 'unreal', 'realized', 'closedProfit', 'buys', 'sells', 'buyValue', 'sellValue', 'wins'].forEach(k => { c[k] += pos[k]; });
        c.closed += pos.closedCount;
        if (pos.last > c.last) c.last = pos.last;
      });
      c.total = c.unreal + c.realized + c.closedProfit;
      c.ccy = [...c.ccys].join(' / ') || '';
      out.customers.push(c);
    });
    out.events.sort((x, y) => (y.date || '').localeCompare(x.date || ''));
    // إجماليات لكل عملة لوحدها (ممنوع نجمع جنيه على ريال)
    const tot = {};
    out.positions.forEach(p => {
      const t = tot[p.ccy] = tot[p.ccy] || { plans: 0, open: 0, openCost: 0, value: 0, unreal: 0, realized: 0, closedProfit: 0, buys: 0, sells: 0, closed: 0, wins: 0, buyValue: 0, sellValue: 0, custs: new Set(), openCusts: new Set() };
      t.plans++; if (p.status === 'مفتوحة') { t.open++; t.openCusts.add(p.acc.email); } t.custs.add(p.acc.email);
      ['openCost', 'value', 'unreal', 'realized', 'closedProfit', 'buys', 'sells', 'buyValue', 'sellValue', 'wins'].forEach(k => { t[k] += p[k]; });
      t.closed += p.closedCount;
    });
    out.totals = tot;
    // حسب السهم
    const bs = {};
    out.positions.forEach(p => {
      const k = p.symbol + '|' + p.ccy, s = bs[k] = bs[k] || { symbol: p.symbol, market: p.market, ccy: p.ccy, custs: new Set(), plans: 0, open: 0, openCost: 0, value: 0, unreal: 0, realized: 0, closedProfit: 0, buys: 0, sells: 0, closed: 0, buyValue: 0, sellValue: 0 };
      s.custs.add(p.acc.email); s.plans++; if (p.status === 'مفتوحة') s.open++;
      ['openCost', 'value', 'unreal', 'realized', 'closedProfit', 'buys', 'sells', 'buyValue', 'sellValue'].forEach(x => { s[x] += p[x]; });
      s.closed += p.closedCount;
    });
    out.bySymbol = Object.values(bs).map(s => Object.assign(s, { customers: s.custs.size, total: s.unreal + s.realized + s.closedProfit })).sort((x, y) => y.openCost - x.openCost || y.total - x.total);
    out.accounts = accs.length;
    return out;
  }

  // ---- العرض ----
  const cls = (v) => v > 0 ? 'u-pos' : v < 0 ? 'u-neg' : '';
  const m = (v) => `<td class="g-num ${cls(v)}">${trMoney(v)}</td>`;
  const mn = (v) => `<td class="g-num">${trMoney(v)}</td>`;
  const kpi = (l, v, c) => `<div class="g-kpi ${c || ''}"><span>${l}</span><b class="g-num">${v}</b></div>`;
  function draw(){
    const body = $('trBody'); if (!body || !D) return;
    R = compute();
    const ccys = Object.keys(R.totals);
    const kpis = (ccys.length ? ccys : ['']).map(c => {
      const t = R.totals[c] || { plans: 0, open: 0, openCost: 0, value: 0, unreal: 0, realized: 0, closedProfit: 0, buys: 0, sells: 0, closed: 0, wins: 0, buyValue: 0, sellValue: 0, custs: new Set(), openCusts: new Set() };
      const realized = t.realized + t.closedProfit, total = realized + t.unreal, win = t.closed ? Math.round(t.wins / t.closed * 100) : 0;
      return `${ccys.length > 1 ? `<h3 class="u-mt10">بعملة ${escapeHtml(c)}</h3>` : ''}<div class="g-kpis">
        ${staff ? kpi('المشتركين', ccys.length > 1 ? t.custs.size : R.accounts) + kpi('عندهم مراكز مفتوحة', t.openCusts.size) : ''}
        ${kpi('الخطط', t.plans)}${kpi('مراكز مفتوحة', t.open)}
        ${kpi('تكلفة المراكز المفتوحة', trMoney(t.openCost))}${kpi('القيمة الحالية', trMoney(t.value))}
        ${kpi('ربح/خسارة غير محقق', trMoney(t.unreal), cls(t.unreal))}${kpi('الربح المحقق', trMoney(realized), cls(realized))}
        ${kpi('إجمالي الربح', trMoney(total), cls(total))}
        ${kpi('عمليات شراء', t.buys)}${kpi('عمليات بيع', t.sells)}${kpi('صفقات مقفولة', t.closed)}${kpi('نسبة الصفقات الرابحة', win + '%')}
        ${kpi('إجمالي قيمة الشراء', trMoney(t.buyValue))}${kpi('إجمالي قيمة البيع', trMoney(t.sellValue))}
      </div>`;
    }).join('');
    const subCell = (a) => a.sub ? `<td><span class="tr-sub tr-sub-${a.sub}">${TR_SUB[a.sub] || ''}</span>${a.plan ? `<small class="u-muted"> ${escapeHtml(a.plan)}${a.end ? ' · حتى ' + escapeHtml(a.end) : ''}</small>` : ''}</td>` : '';
    body.innerHTML = `${kpis}
      <p class="u-muted tr-note">القيم الحالية وغير المحققة بآخر سعر في السوق (متأخر حتى 15 دقيقة) — ونفس حساب الشاشة الرئيسية لكل مشترك.${(F.from || F.to) ? ' الفترة بتطبّق على العمليات والأرباح المحققة؛ المراكز المفتوحة بحالتها الحالية.' : ''}</p>
      ${staff ? `<div class="card"><h3>المشتركين (${R.customers.length})</h3><div class="table-scroll"><table class="g-table" id="trCustTable"><thead><tr><th>الكود</th><th>الاسم</th><th>الإيميل</th><th>السوق</th><th>الاشتراك</th><th>الخطط</th><th>مفتوحة</th><th>تكلفة المفتوح</th><th>القيمة الحالية</th><th>غير محقق</th><th>المحقق</th><th>إجمالي الربح</th><th>شراء</th><th>بيع</th><th>مقفولة</th><th>العملة</th><th>آخر عملية</th></tr></thead><tbody>
        ${R.customers.map(c => `<tr class="tr-pick" data-email="${escapeHtml(c.acc.email)}" title="اضغط لعرض بيانات المشترك ده بس"><td>${escapeHtml(c.acc.code || '—')}</td><td>${escapeHtml(c.acc.name || '—')}</td><td dir="ltr">${escapeHtml(c.acc.email)}</td><td>${escapeHtml(c.acc.market || '')}</td>${subCell(c.acc)}<td>${c.plans}</td><td>${c.open}</td>${mn(c.openCost)}${mn(c.value)}${m(c.unreal)}${m(c.realized + c.closedProfit)}${m(c.total)}<td>${c.buys}</td><td>${c.sells}</td><td>${c.closed}</td><td>${escapeHtml(c.ccy)}</td><td>${escapeHtml(c.last || '—')}</td></tr>`).join('') || '<tr><td colspan="17" class="u-muted">لا يوجد مشتركين بالفلاتر دي</td></tr>'}
      </tbody></table></div></div>` : ''}
      <div class="card"><h3>حسب السهم (${R.bySymbol.length})</h3><div class="table-scroll"><table class="g-table" id="trSymTable"><thead><tr><th>السهم</th><th>السوق</th>${staff ? '<th>المشتركين</th>' : ''}<th>الخطط</th><th>مفتوحة</th><th>تكلفة المفتوح</th><th>القيمة الحالية</th><th>غير محقق</th><th>المحقق</th><th>إجمالي الربح</th><th>شراء</th><th>بيع</th><th>مقفولة</th><th>قيمة الشراء</th><th>قيمة البيع</th><th>العملة</th></tr></thead><tbody>
        ${R.bySymbol.map(s => `<tr><td dir="ltr">${escapeHtml(s.symbol)}</td><td>${escapeHtml(s.market)}</td>${staff ? `<td>${s.customers}</td>` : ''}<td>${s.plans}</td><td>${s.open}</td>${mn(s.openCost)}${mn(s.value)}${m(s.unreal)}${m(s.realized + s.closedProfit)}${m(s.total)}<td>${s.buys}</td><td>${s.sells}</td><td>${s.closed}</td>${mn(s.buyValue)}${mn(s.sellValue)}<td>${escapeHtml(s.ccy)}</td></tr>`).join('') || `<tr><td colspan="${staff ? 16 : 15}" class="u-muted">لا توجد بيانات</td></tr>`}
      </tbody></table></div></div>
      <div class="card"><h3>المراكز — كل خطة وموقفها (${R.positions.length})</h3><div class="table-scroll"><table class="g-table" id="trPosTable"><thead><tr>${staff ? '<th>المشترك</th>' : ''}<th>السهم</th><th>الخطة</th><th>الحالة</th><th>تكلفة المفتوح</th><th>القيمة الحالية</th><th>التغير %</th><th>غير محقق</th><th>المحقق</th><th>ربح المقفولة</th><th>إجمالي الربح</th><th>العملة</th><th>آخر عملية</th></tr></thead><tbody>
        ${R.positions.map(p => { const own = !staff || p.acc.email === email; const st = typeof gPlanStatusBadge === 'function' ? gPlanStatusBadge(p.status) : escapeHtml(p.status);
          return `<tr>${staff ? `<td dir="auto">${escapeHtml(p.acc.name || p.acc.email)}</td>` : ''}<td dir="ltr">${own && typeof gPlanLink === 'function' ? gPlanLink(p.symbol, p.kind) : escapeHtml(p.symbol)}</td><td class="u-nowrap">${p.kind} ${st}</td><td>${st}</td>${mn(p.openCost)}${mn(p.value)}<td class="g-num ${cls(p.pct)}">${p.pct == null ? '—' : (p.pct > 0 ? '+' : '') + p.pct.toFixed(2) + '%'}</td>${m(p.unreal)}${m(p.realized)}${m(p.closedProfit)}${m(p.total)}<td>${escapeHtml(p.ccy)}</td><td>${escapeHtml(p.last || '—')}</td></tr>`; }).join('') || `<tr><td colspan="${staff ? 13 : 12}" class="u-muted">لا توجد خطط</td></tr>`}
      </tbody></table></div></div>
      <div class="card"><h3>العمليات (${R.events.length})</h3><div class="table-scroll"><table class="g-table" id="trOpsTable"><thead><tr><th>التاريخ</th>${staff ? '<th>المشترك</th>' : ''}<th>الخطة</th><th>السهم</th><th>العملية</th><th>الكمية</th><th>السعر</th><th>القيمة</th><th>الربح</th><th>العملة</th></tr></thead><tbody>
        ${R.events.slice(0, 3000).map(e => `<tr><td>${escapeHtml(e.date || '—')}</td>${staff ? `<td dir="auto">${escapeHtml(e.acc.name || e.acc.email)}</td>` : ''}<td>${e.kind}</td><td dir="ltr">${escapeHtml(e.symbol)}</td><td>${TR_TYPE[e.type]}</td><td class="g-num">${trMoney(e.qty)}</td><td class="g-num">${trMoney(e.price)}${e.exit != null ? ' → ' + trMoney(e.exit) : ''}</td>${mn(e.type === 'closed' ? (e.capital || e.qty * e.price) : e.qty * e.price)}${e.profit != null ? m(e.profit) : '<td>—</td>'}<td>${escapeHtml(e.ccy)}</td></tr>`).join('') || `<tr><td colspan="${staff ? 10 : 9}" class="u-muted">لا توجد عمليات</td></tr>`}
      </tbody></table></div></div>`;
    body.querySelectorAll('.tr-pick').forEach(tr => tr.ondblclick = tr.onclick = (e) => { if (e.target.closest('input,button,select,a')) return; sel.clear(); sel.add(tr.dataset.email); drawCustList(); apply(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }
  function apply(){ draw(); }
  function fillSymbols(){
    const s = $('trSym'); const cur = F.symbol;
    const syms = [...new Set(D.plans.map(x => x.s.toUpperCase()))].sort();
    s.innerHTML = '<option value="">كل الأسهم</option>' + syms.map(x => `<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('');
    s.value = syms.includes(cur) ? cur : '';
  }

  // ---- التحميل (مباشر من الخطط) + تحديث تلقائي كل دقيقة ----
  async function load(manual){
    const market = staff && typeof gAdminMarket === 'function' ? gAdminMarket() : '';
    const d = await apiGet('/trades_report.php?' + new URLSearchParams({ action: 'live', market }).toString()).catch(() => ({ success: false, message: 'تعذّر الاتصال بالسيرفر' }));
    const body = $('trBody');
    if (screenStale(__tok) || !body || !body.isConnected) return false;
    if (!d.success) { if (!D) body.innerHTML = `<div class="card"><p class="u-danger">${escapeHtml(d.message || 'خطأ')}</p></div>`; return true; }
    read(); D = d;
    [...sel].forEach(e => { if (!D.accounts.some(a => a.email === e)) sel.delete(e); });
    fillSymbols(); drawCustList();
    // آخر سعر من السوق لكل الأسهم (نفس مصدر الرئيسية)
    const allP = {}, allG = {};
    D.plans.forEach(x => { if (x.p && x.p.listed !== false) (x.k === 'DCA' ? allP : allG)[x.s] = { market: x.p.market || 'مصر' }; });
    if (typeof mkEnsureLivePrices === 'function') {
      try { await mkEnsureLivePrices(allP, allG); } catch(e){}
      if (window.__mkLivePxPending) window.__mkLivePxPending.then(ch => { if (ch && !screenStale(__tok) && $('trBody')) draw(); });
    }
    if (screenStale(__tok) || !$('trBody')) return false;
    draw();
    const at = $('trAt'); if (at) at.textContent = 'آخر تحديث: ' + new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (manual && GShell && GShell.toast) GShell.toast('تم تحديث التقرير', 'ok');
    return true;
  }
  if (!(await load(false))) return;
  const timer = setInterval(async () => {
    if (screenStale(__tok) || !$('trBody')) return clearInterval(timer);
    if (document.hidden) return;
    const pn = $('trCustPanel'); if (pn && !pn.hidden) return;   // المستخدم بيختار مشتركين ← منقاطعهوش
    await load(false);
  }, 60000);

  // ---- التصدير والطباعة ----
  const csv = (name, head, rows) => hrDownloadCsv(name, head, rows);
  const cb = $('trCsvCust'); if (cb) cb.onclick = () => csv('griffine-trades-customers.csv',
    ['الكود', 'الاسم', 'الإيميل', 'الهاتف', 'السوق', 'الاشتراك', 'الباقة', 'ينتهي', 'الخطط', 'مفتوحة', 'تكلفة المفتوح', 'القيمة الحالية', 'غير محقق', 'المحقق', 'إجمالي الربح', 'شراء', 'بيع', 'مقفولة', 'العملة', 'آخر عملية'],
    R.customers.map(c => [c.acc.code, c.acc.name, c.acc.email, c.acc.phone, c.acc.market, TR_SUB[c.acc.sub] || '', c.acc.plan, c.acc.end || '', c.plans, c.open, c.openCost.toFixed(2), c.value.toFixed(2), c.unreal.toFixed(2), (c.realized + c.closedProfit).toFixed(2), c.total.toFixed(2), c.buys, c.sells, c.closed, c.ccy, c.last]));
  $('trCsvPos').onclick = () => csv('griffine-trades-positions.csv',
    [...(staff ? ['المشترك', 'الإيميل'] : []), 'السهم', 'الخطة', 'الحالة', 'تكلفة المفتوح', 'القيمة الحالية', 'التغير %', 'غير محقق', 'المحقق', 'ربح المقفولة', 'إجمالي الربح', 'العملة', 'آخر عملية'],
    R.positions.map(p => [...(staff ? [p.acc.name, p.acc.email] : []), p.symbol, p.kind, p.status, p.openCost.toFixed(2), p.value.toFixed(2), p.pct == null ? '' : p.pct.toFixed(2), p.unreal.toFixed(2), p.realized.toFixed(2), p.closedProfit.toFixed(2), p.total.toFixed(2), p.ccy, p.last]));
  $('trCsv').onclick = () => csv('griffine-trades.csv',
    ['التاريخ', ...(staff ? ['المشترك', 'الإيميل'] : []), 'الخطة', 'السهم', 'السوق', 'العملية', 'الكمية', 'السعر', 'سعر الخروج', 'الربح', 'رأس المال', 'العملة'],
    R.events.map(e => [e.date, ...(staff ? [e.acc.name, e.acc.email] : []), e.kind, e.symbol, e.market, TR_TYPE[e.type], e.qty, e.price, e.exit ?? '', e.profit ?? '', e.capital ?? '', e.ccy]));
  $('trPrint').onclick = () => {
    const tbl = (head, rows) => `<table><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(String(c ?? ''))}</td>`).join('')}</tr>`).join('')}</table>`;
    const period = (F.from || F.to) ? `الفترة: ${F.from || '...'} ← ${F.to || '...'}` : 'كل الفترات';
    const who = !staff ? '' : !sel.size ? ' · كل المشتركين' : ' · ' + [...sel].map(e => { const a = D.accounts.find(x => x.email === e); return a ? (a.name || a.email) : e; }).join('، ');
    const totRows = Object.entries(R.totals).map(([c, t]) => [c, t.plans, t.open, trMoney(t.openCost), trMoney(t.value), trMoney(t.unreal), trMoney(t.realized + t.closedProfit), trMoney(t.unreal + t.realized + t.closedProfit), t.buys, t.sells, t.closed]);
    hrPrint(staff ? 'تقرير الصفقات' : 'تقرير صفقاتي', `<p>${escapeHtml(period + who)}${F.kind ? ' · ' + F.kind : ''}${F.symbol ? ' · ' + escapeHtml(F.symbol) : ''}${F.status ? ' · ' + escapeHtml(F.status) : ''}${staff && typeof gAdminMarket === 'function' && gAdminMarket() ? ' · السوق: ' + escapeHtml(gAdminMarket()) : ''}</p>
      ${tbl(['العملة', 'الخطط', 'مفتوحة', 'تكلفة المفتوح', 'القيمة الحالية', 'غير محقق', 'المحقق', 'إجمالي الربح', 'شراء', 'بيع', 'مقفولة'], totRows)}
      ${staff ? `<h3>المشتركين</h3>${tbl(['الكود', 'الاسم', 'الإيميل', 'الاشتراك', 'الخطط', 'مفتوحة', 'تكلفة المفتوح', 'القيمة', 'غير محقق', 'المحقق', 'إجمالي الربح'], R.customers.map(c => [c.acc.code, c.acc.name, c.acc.email, TR_SUB[c.acc.sub] || '', c.plans, c.open, trMoney(c.openCost), trMoney(c.value), trMoney(c.unreal), trMoney(c.realized + c.closedProfit), trMoney(c.total)]))}` : ''}
      <h3>حسب السهم</h3>${tbl(['السهم', 'الخطط', 'مفتوحة', 'تكلفة المفتوح', 'القيمة', 'غير محقق', 'المحقق', 'إجمالي الربح', 'العملة'], R.bySymbol.map(s => [s.symbol, s.plans, s.open, trMoney(s.openCost), trMoney(s.value), trMoney(s.unreal), trMoney(s.realized + s.closedProfit), trMoney(s.total), s.ccy]))}
      <h3>المراكز</h3>${tbl([...(staff ? ['المشترك'] : []), 'السهم', 'الخطة', 'الحالة', 'تكلفة المفتوح', 'القيمة', 'غير محقق', 'المحقق', 'ربح المقفولة', 'العملة'], R.positions.map(p => [...(staff ? [p.acc.name || p.acc.email] : []), p.symbol, p.kind, p.status, trMoney(p.openCost), trMoney(p.value), trMoney(p.unreal), trMoney(p.realized), trMoney(p.closedProfit), p.ccy]))}`, staff ? 'تقرير الصفقات' : 'تقرير صفقاتي');
  };
}
