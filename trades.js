/* =====================================================================
   GRIFFINE — trades.js (الإصدار 89) — تقرير الصفقات للإدارة (من جدول plan_trades)
   الصلاحية: view_reports - والسيرفر بيتحقق من كل طلب (trades_report.php)
   فلاتر: الفترة · نوع الخطة · السهم · العميل ← إجماليات + حسب السهم + حسب العميل + آخر العمليات
   تصدير Excel (CSV) + طباعة / PDF
   ===================================================================== */
const TR_TYPE = { buy:'شراء', sell:'بيع', closed:'صفقة مقفولة' };
function trMoney(n){ return (Math.round((+n || 0) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }); }

async function renderTradesReportPage(f){
  const __tok = screenToken();
  pushNav(() => renderTradesReportPage(f));
  const email = await getSession();
  if (!email) return renderLogin();
  if (!window.__isAdmin) return renderHome();
  if (!hasPermission('view_reports')) return renderAdminHub();
  f = f || { from:'', to:'', kind:'', symbol:'', email:'' };
  window.__lastPageKey = 'trades_report';
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>${pageTitle('trades_report', '📈 تقرير الصفقات')}</div>
      <button class="secondary small" id="trBackBtn">🛡️ رجوع للوحة التحكم</button></div>
    <div class="card"><div class="g-grid-filters">
      <label>من <input type="date" id="trFrom" value="${escapeHtml(f.from)}"></label>
      <label>إلى <input type="date" id="trTo" value="${escapeHtml(f.to)}"></label>
      <label>نوع الخطة <select id="trKind"><option value="">الكل</option><option value="DCA" ${f.kind==='DCA'?'selected':''}>DCA</option><option value="Grid" ${f.kind==='Grid'?'selected':''}>Grid</option></select></label>
      <label>السهم <input id="trSym" dir="ltr" placeholder="COMI" value="${escapeHtml(f.symbol)}"></label>
      <label>العميل <input id="trEmail" dir="ltr" placeholder="email" value="${escapeHtml(f.email)}"></label>
    </div>
    <div class="radio-row u-mt10">
      <button class="small" id="trGo">عرض</button>
      <button class="small secondary" id="trCsv">⬇️ Excel</button>
      <button class="small secondary" id="trPrint">🖨️ طباعة / PDF</button>
      <button class="small secondary" id="trRebuild" title="أول مرة بعد التحديث: يبني الجدول من كل الخطط المحفوظة">🔄 إعادة بناء من الخطط</button>
    </div></div>
    <div id="trBody"><p class="u-muted">جارٍ التحميل...</p></div>
  </div>`;
  const read = () => ({ from: trFrom.value, to: trTo.value, kind: trKind.value, symbol: trSym.value.trim().toUpperCase(), email: trEmail.value.trim() });
  const rerender = () => { window.__navSilent = true; try { renderTradesReportPage(read()); } finally { window.__navSilent = false; } };
  document.getElementById('trBackBtn').onclick = () => goAdminHome();
  document.getElementById('trGo').onclick = rerender;
  document.getElementById('trRebuild').onclick = async () => {
    if (!await gConfirm('إعادة بناء جدول الصفقات لكل العملاء من الخطط المحفوظة؟ (آمن - مبيغيّرش الخطط نفسها)')) return;
    const r = await apiPost('/trades_report.php', { action:'rebuild_all' }).catch(() => ({}));
    GShell.toast(r.success ? `تم: ${r.rows} عملية لـ ${r.accounts} خطة` : (r.message || 'تعذّر التنفيذ'), r.success ? 'ok' : 'err');
    if (r.success) rerender();
  };
  const qs = new URLSearchParams({ action:'report', ...f }).toString();
  const d = await apiGet('/trades_report.php?' + qs).catch(() => ({ success:false, message:'تعذّر الاتصال بالسيرفر' }));
  const body = document.getElementById('trBody');
  if (screenStale(__tok) || !body || !body.isConnected) return;
  if (!d.success) { body.innerHTML = `<div class="card"><p class="u-danger">${escapeHtml(d.message || 'خطأ')}</p></div>`; return; }
  const t = d.totals || {};
  const winRate = t.closed > 0 ? Math.round(t.wins / t.closed * 100) : 0;
  const kpi = (l, v, cls) => `<div class="g-kpi ${cls || ''}"><span>${l}</span><b class="g-num">${v}</b></div>`;
  const sumRow = (r) => `<td>${r.buys || 0}</td><td>${r.sells || 0}</td><td>${r.closed || 0}</td><td class="g-num">${trMoney(r.buy_value)}</td><td class="g-num">${trMoney(r.sell_value)}</td><td class="g-num ${r.profit >= 0 ? 'u-pos' : 'u-neg'}">${trMoney(r.profit)}</td>`;
  const sumHead = `<th>شراء</th><th>بيع</th><th>مقفولة</th><th>قيمة الشراء</th><th>قيمة البيع</th><th>الربح المحقق</th>`;
  body.innerHTML = `
    <div class="g-kpis">
      ${kpi('العملاء', t.customers || 0)}${kpi('الأسهم', t.symbols || 0)}
      ${kpi('عمليات شراء', t.buys || 0)}${kpi('عمليات بيع', t.sells || 0)}
      ${kpi('صفقات مقفولة', t.closed || 0)}${kpi('نسبة الصفقات الرابحة', winRate + '%')}
      ${kpi('إجمالي قيمة الشراء', trMoney(t.buy_value))}${kpi('إجمالي قيمة البيع', trMoney(t.sell_value))}
      ${kpi('الربح المحقق', trMoney(t.profit), t.profit >= 0 ? 'u-pos' : 'u-neg')}
    </div>
    <div class="card"><h3>حسب السهم</h3><div class="table-scroll"><table class="g-table"><thead><tr><th>السهم</th><th>السوق</th><th>العملاء</th>${sumHead}</tr></thead><tbody>
      ${(d.bySymbol || []).map(r => `<tr><td dir="ltr">${escapeHtml(r.symbol)}</td><td>${escapeHtml(r.market || '')}</td><td>${r.customers}</td>${sumRow(r)}</tr>`).join('') || '<tr><td colspan="9" class="u-muted">لا توجد بيانات</td></tr>'}
    </tbody></table></div></div>
    <div class="card"><h3>حسب العميل</h3><div class="table-scroll"><table class="g-table"><thead><tr><th>العميل</th><th>الأسهم</th>${sumHead}</tr></thead><tbody>
      ${(d.byCustomer || []).map(r => `<tr><td dir="ltr">${escapeHtml(r.account_email)}</td><td>${r.symbols}</td>${sumRow(r)}</tr>`).join('') || '<tr><td colspan="8" class="u-muted">لا توجد بيانات</td></tr>'}
    </tbody></table></div></div>
    <div class="card"><h3>آخر العمليات (${(d.recent || []).length})</h3><div class="table-scroll gs-mail-scroll"><table class="g-table"><thead><tr><th>التاريخ</th><th>العميل</th><th>الخطة</th><th>السهم</th><th>العملية</th><th>الكمية</th><th>السعر</th><th>الربح</th></tr></thead><tbody>
      ${(d.recent || []).map(r => `<tr><td>${escapeHtml(r.trade_date || '—')}</td><td dir="ltr">${escapeHtml(r.account_email)}</td><td>${r.plan_kind}</td><td dir="ltr">${escapeHtml(r.symbol)}</td><td>${TR_TYPE[r.trade_type] || r.trade_type}</td><td class="g-num">${trMoney(r.qty)}</td><td class="g-num">${trMoney(r.price)}${r.exit_price != null ? ' → ' + trMoney(r.exit_price) : ''}</td><td class="g-num">${r.profit != null ? trMoney(r.profit) : '—'}</td></tr>`).join('') || '<tr><td colspan="8" class="u-muted">لا توجد عمليات - لو دي أول مرة اضغط "إعادة بناء من الخطط"</td></tr>'}
    </tbody></table></div></div>`;
  const recentRows = (d.recent || []).map(r => [r.trade_date || '', r.account_email, r.plan_kind, r.symbol, r.market || '', TR_TYPE[r.trade_type] || r.trade_type, r.qty, r.price, r.exit_price ?? '', r.profit ?? '', r.capital ?? '']);
  document.getElementById('trCsv').onclick = () => hrDownloadCsv('griffine-trades.csv',
    ['التاريخ', 'العميل', 'الخطة', 'السهم', 'السوق', 'العملية', 'الكمية', 'السعر', 'سعر الخروج', 'الربح', 'رأس المال'], recentRows);
  document.getElementById('trPrint').onclick = () => {
    const tbl = (head, rows) => `<table><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(String(c ?? ''))}</td>`).join('')}</tr>`).join('')}</table>`;
    const period = (f.from || f.to) ? `الفترة: ${f.from || '...'} ← ${f.to || '...'}` : 'كل الفترات';
    hrPrint('تقرير الصفقات', `<p>${escapeHtml(period)}${f.kind ? ' · ' + f.kind : ''}${f.symbol ? ' · ' + escapeHtml(f.symbol) : ''}</p>
      ${tbl(['العملاء', 'عمليات شراء', 'عمليات بيع', 'صفقات مقفولة', 'قيمة الشراء', 'قيمة البيع', 'الربح المحقق', 'نسبة الرابحة'], [[t.customers || 0, t.buys || 0, t.sells || 0, t.closed || 0, trMoney(t.buy_value), trMoney(t.sell_value), trMoney(t.profit), winRate + '%']])}
      <h3>حسب السهم</h3>${tbl(['السهم', 'العملاء', 'شراء', 'بيع', 'مقفولة', 'قيمة الشراء', 'قيمة البيع', 'الربح'], (d.bySymbol || []).map(r => [r.symbol, r.customers, r.buys, r.sells, r.closed, trMoney(r.buy_value), trMoney(r.sell_value), trMoney(r.profit)]))}
      <h3>حسب العميل</h3>${tbl(['العميل', 'الأسهم', 'شراء', 'بيع', 'مقفولة', 'قيمة الشراء', 'قيمة البيع', 'الربح'], (d.byCustomer || []).map(r => [r.account_email, r.symbols, r.buys, r.sells, r.closed, trMoney(r.buy_value), trMoney(r.sell_value), trMoney(r.profit)]))}`);
  };
}
