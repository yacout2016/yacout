/* =====================================================================
   GRIFFINE — app-plans.js (الإصدار 88) — الخطط (DCA / Grid) + المحفظة والتقارير + الملف الشخصي + الإحالة
   (اتفصل من griffine.js - كل الملفات بتتحمّل بالترتيب في index.php وبتشارك نفس المتغيرات العامة)
   ===================================================================== */
/* ================== قائمة الخطط: قسم "تقرير سهم" (بحث + طباعة + تصدير) ==================
   نفس فكرة "تقرير سهم أو أكتر" في شاشة ملخص المحفظة بالظبط (قائمة منسدلة قابلة للبحث
   والفلترة بدل قائمة كروت مفتوحة طول الوقت، عشان لو عندك 100 خطة الشاشة متكبرش) - لكن
   هنا للـ DCA بس (نفس نوع الخطط اللي في الشاشة دي)، وبيستخدم نفس دوال الحساب العامة
   (computeAggregates / buildStockTransactionRows / buildCumulativeProfitPoints) اللي
   شاشة ملخص المحفظة بتستخدمها، عشان الأرقام تفضل متطابقة مع بعض دايمًا. */
function renderDacStockReportSectionHtml(plans, symbols, kind){
  // الإصدار 111: نفس القسم لخطط الشبكة (Grid) - kind='Grid' ← plans هنا هي خطط الشبكة
  const isG = kind === 'Grid', pre = isG ? 'gridRpt' : 'dacRpt';
  const allEntries = symbols.map(s=>({key:s, sym:s, type:isG ? 'Grid' : 'DCA'}));
  const agg = isG ? computeAggregates({}, plans, allEntries, null, null) : computeAggregates(plans, {}, allEntries, null, null);
  return `
    <h2 class="u-mt24">تقرير سهم</h2>
    <div class="section-card">
      <div class="std-filter-daterow">
        <div><label>من تاريخ</label><input type="date" id="${pre}From"></div>
        <div><label>إلى تاريخ</label><input type="date" id="${pre}To"></div>
      </div>
      <label style="display:block;margin-top:10px;">اختر الأسهم للتقرير (مفتوحة أو مقفولة)</label>
      <div class="ms-dropdown" id="${pre}MsDropdown">
        <button type="button" class="ms-toggle" id="${pre}MsToggleBtn">اختر الأسهم ▾</button>
        <div class="ms-panel" id="${pre}MsPanel" style="display:none;">
          <div class="std-filter-search u-mb8"><input type="text" id="${pre}SymSearchInput" placeholder="ابحث باسم السهم..."></div>
          <div class="std-filter-tabs u-mb8">
            <button type="button" class="small secondary ${pre}StatusFilterBtn std-filter-tab btn-active" data-status="all">الكل</button>
            <button type="button" class="small secondary ${pre}StatusFilterBtn std-filter-tab" data-status="مفتوحة">مفتوحة فقط</button>
            <button type="button" class="small secondary ${pre}StatusFilterBtn std-filter-tab" data-status="مغلقة">مغلقة فقط</button>
          </div>
          <label class="ms-item ms-all"><input type="checkbox" id="${pre}SelectAll"> تحديد كل الأسهم</label>
          <div class="ms-sep"></div>
          <div id="${pre}SymbolChecks">
            ${agg.stockRows.map(r=>`<label class="ms-item" data-sym="${r.symbol.toLowerCase()}" data-status="${r.status}"><input type="checkbox" class="${pre}SymCheck" value="${escapeHtml(r.symbol)}"> ${escapeHtml(r.symbol)} <span style="color:#888;font-size:11px;">${r.status}</span></label>`).join('')}
          </div>
          <div id="${pre}SymNoMatch" style="display:none;font-size:12px;color:#888;padding:8px;text-align:center;">لا توجد أسهم مطابقة</div>
          <button type="button" class="small" id="${pre}MsDoneBtn" style="width:100%;margin-top:8px;">تم</button>
        </div>
      </div>
      <button id="${pre}PrintBtn" class="u-mt14">🖨 إصدار تقرير PDF للأسهم المحددة</button>
      <button id="${pre}ExportXlsBtn" class="secondary">⬇ تصدير التقرير Excel</button>
      <div style="font-size:11.5px;color:#888;margin-top:6px;">تقدر تختار سهم واحد أو أكتر أو كل الأسهم (مفتوحة أو مقفولة) — سيب "من/إلى تاريخ" فاضيين لتقرير عن كل الفترة المتاحة.</div>
    </div>`;
}

function wireDacStockReportSection(plans, symbols, kind){
  const isG = kind === 'Grid', pre = isG ? 'gridRpt' : 'dacRpt', $ = (id) => document.getElementById(pre + id);
  const allEntries = symbols.map(s=>({key:s, sym:s, type:isG ? 'Grid' : 'DCA'}));
  const aggOf = (from, to, sel) => isG ? computeAggregates({}, plans, allEntries, from, to, sel) : computeAggregates(plans, {}, allEntries, from, to, sel);
  const pointsOf = (from, to, sel) => isG ? buildCumulativeProfitPoints({}, from, to, sel, plans) : buildCumulativeProfitPoints(plans, from, to, sel, null);
  const rowsOf = (sym, from, to) => isG ? buildGridTransactionRows(plans[sym], from, to) : buildStockTransactionRows(plans[sym], from, to);

  function updateDacRptToggleLabel(){
    const checked = Array.from(document.querySelectorAll(`.${pre}SymCheck:checked`)).map(cb=>cb.value);
    const btn = $('MsToggleBtn');
    if(checked.length===0) btn.textContent = 'اختر الأسهم ▾';
    else if(checked.length===symbols.length) btn.textContent = `كل الأسهم (${symbols.length}) ▾`;
    else if(checked.length<=3) btn.textContent = checked.join('، ') + ' ▾';
    else btn.textContent = `${checked.length} أسهم مختارة ▾`;
  }

  $('MsToggleBtn').onclick = (e) => {
    e.stopPropagation();
    const panel = $('MsPanel');
    panel.style.display = panel.style.display==='none' ? 'block' : 'none';
  };
  $('MsDoneBtn').onclick = () => { $('MsPanel').style.display = 'none'; };
  document.addEventListener('click', (e) => {
    const dd = $('MsDropdown');
    if (dd && !dd.contains(e.target)) $('MsPanel').style.display = 'none';
  });

  $('SelectAll').addEventListener('change', (e)=>{
    document.querySelectorAll(`.${pre}SymCheck`).forEach(cb=>{ cb.checked = e.target.checked; });
    updateDacRptToggleLabel();
  });
  document.querySelectorAll(`.${pre}SymCheck`).forEach(cb=>{
    cb.addEventListener('change', updateDacRptToggleLabel);
  });

  function filterDacRptSymList(){
    const q = $('SymSearchInput').value.trim().toLowerCase();
    const statusFilter = document.querySelector(`.${pre}StatusFilterBtn.btn-active`).dataset.status;
    let anyVisible = false;
    document.querySelectorAll(`#${pre}SymbolChecks .ms-item`).forEach(item=>{
      const matchesSym = !q || item.dataset.sym.includes(q);
      const matchesStatus = statusFilter === 'all' || item.dataset.status === statusFilter;
      const show = matchesSym && matchesStatus;
      item.style.display = show ? '' : 'none';
      if (show) anyVisible = true;
    });
    $('SymNoMatch').style.display = anyVisible ? 'none' : 'block';
  }
  $('SymSearchInput').addEventListener('input', filterDacRptSymList);
  document.querySelectorAll(`.${pre}StatusFilterBtn`).forEach(btn=>{
    btn.onclick = () => {
      document.querySelectorAll(`.${pre}StatusFilterBtn`).forEach(b=>b.classList.remove('btn-active'));
      btn.classList.add('btn-active');
      filterDacRptSymList();
    };
  });

  function buildDacReportDetailSections(selectedSyms, from, to){
    let sections = '';
    selectedSyms.forEach(sym=>{
      const p = plans[sym];
      const { rowsHtml, hasAny } = rowsOf(sym, from, to);
      sections += `<h2 style="color:#14532d;margin-top:26px;border-top:2px solid #eee;padding-top:16px;">تفاصيل عمليات: ${sym} (${isG ? 'Grid' : 'DCA'} — ${p.market||''}${p.currency ? ' - ' + p.currency : ''})</h2>
      <table><thead><tr><th>التاريخ</th><th>العملية</th><th>المستوى</th><th>الكمية</th><th>السعر</th><th>الربح</th></tr></thead>
      <tbody>${hasAny ? rowsHtml : '<tr><td colspan="6">لا يوجد عمليات في هذه الفترة</td></tr>'}</tbody></table>`;
    });
    return sections;
  }

  $('PrintBtn').onclick = () => {
    const selectedSyms = Array.from(document.querySelectorAll(`.${pre}SymCheck:checked`)).map(cb=>cb.value);
    if(selectedSyms.length===0){ alert('اختار سهم واحد على الأقل'); return; }
    const from = $('From').value || null;
    const to = $('To').value || null;

    const reportAgg = aggOf(from, to, selectedSyms);
    const combinedPoints = pointsOf(from, to, selectedSyms);
    const groupLabel = selectedSyms.length===symbols.length ? 'كل الأسهم' : reportAgg.stockRows.map(r=>r.symbol).join('، ');
    const chartImg = renderCumulativeProfitChart(combinedPoints, 'الربح التراكمي — ' + groupLabel);
    const periodLabel = (from && to) ? `${formatDateAr(from)} إلى ${formatDateAr(to)}` : 'كل الفترة المتاحة';
    const detailSections = buildDacReportDetailSections(selectedSyms, from, to);

    const rowsHtml = reportAgg.stockRows.map(r=>`<tr>
      <td>${escapeHtml(r.symbol)}</td><td>${r.status}</td>
      <td>${fmt2(r.openCost)}</td><td>${r.currentValue?fmt2(r.currentValue):'-'}</td>
      <td>${r.dropPercent!=null?r.dropPercent.toFixed(2)+'%':'-'}</td>
      <td>${fmt2(r.unrealized)}</td><td>${fmt2(r.realized)}</td>
      <td>${r.closedCount}</td><td>${fmt2(r.closedProfit)}</td>
    </tr>`).join('');

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير أسهم</title>
      <style>body{font-family:IBM Plex Sans Arabic,Tahoma,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin-top:8px;}
      th,td{border:1px solid #ccc;padding:6px;text-align:center;font-size:12px;} th{background:#14532d;color:#fff;}
      h1{color:#14532d;} .agg{margin-top:16px;font-size:14px;background:#f0f4f2;padding:12px;border-radius:8px;}
      .indicators{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;}
      .indicators div{flex:1;min-width:150px;background:#f8faf9;border:1px solid #e7ebe9;border-radius:8px;padding:10px;text-align:center;}
      .indicators .v{font-size:16px;font-weight:bold;color:#14532d;} .indicators .l{font-size:11px;color:#888;margin-top:3px;}
      img{max-width:100%;margin-top:16px;}</style></head>
      <body>
      ${reportLogoHeaderHtml()}
      <h1>GRIFFINE — تقرير أسهم وخطط${isG ? ' الشبكة' : ''}: ${groupLabel}</h1>
      <p>الفترة: ${periodLabel} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>

      <div class="indicators">
        <div><div class="v">${fmt2(reportAgg.grandTotalInvestedEver)}</div><div class="l">كم استثمرت (${groupLabel})</div></div>
        <div><div class="v">${fmt2(reportAgg.grandTotalProfit)}</div><div class="l">كم ربحت أو خسرت</div></div>
        <div><div class="v">${reportAgg.overallProfitPercent.toFixed(2)}%</div><div class="l">نسبة الربح/الخسارة</div></div>
        <div><div class="v u-fs12">${periodLabel}</div><div class="l">فترة التقرير</div></div>
      </div>

      <img src="${chartImg}" width="720" height="300">

      <table><thead><tr>
        <th>السهم</th><th>الحالة</th><th>تكلفة المراكز المفتوحة</th><th>القيمة الحالية</th><th>الانخفاض</th>
        <th>ربح غير محقق</th><th>ربح محقق</th><th>صفقات مغلقة</th><th>ربح الصفقات المغلقة</th>
      </tr></thead><tbody>
        ${rowsHtml}
        <tr style="font-weight:bold;background:#eef6f2;">
          <td>الإجمالي</td><td></td>
          <td>${fmt2(reportAgg.totalOpenCost)}</td><td>${fmt2(reportAgg.totalCurrentValue)}</td>
          <td>${reportAgg.avgDropRate!=null?reportAgg.avgDropRate.toFixed(2)+'%':'-'}</td>
          <td>${fmt2(reportAgg.totalUnrealized)}</td><td>${fmt2(reportAgg.totalRealized)}</td>
          <td>${reportAgg.totalClosedTradesCount}</td><td>${fmt2(reportAgg.totalClosedProfit)}</td>
        </tr>
      </tbody></table>

      ${detailSections}

      
      </body></html>`);
    w.document.close(); gReportReady(w);
  };

  $('ExportXlsBtn').onclick = () => {
    const selectedSyms = Array.from(document.querySelectorAll(`.${pre}SymCheck:checked`)).map(cb=>cb.value);
    if(selectedSyms.length===0){ alert('اختار سهم واحد على الأقل'); return; }
    const from = $('From').value || null;
    const to = $('To').value || null;

    const reportAgg = aggOf(from, to, selectedSyms);
    const combinedPoints = pointsOf(from, to, selectedSyms);
    const groupLabel = selectedSyms.length===symbols.length ? 'كل الأسهم' : reportAgg.stockRows.map(r=>r.symbol).join('، ');
    const chartImg = renderCumulativeProfitChart(combinedPoints, 'الربح التراكمي — ' + groupLabel);
    const periodLabel = (from && to) ? `${formatDateAr(from)} إلى ${formatDateAr(to)}` : 'كل الفترة المتاحة';

    const th = "background:#14532D;color:#ffffff;font-weight:bold;border:1px solid #000000;padding:6px 10px;text-align:center;";
    const td = "border:1px solid #999999;padding:5px 10px;text-align:center;";
    const totalTd = "border:1px solid #000000;padding:6px 10px;text-align:center;font-weight:bold;background:#E6F4EA;";
    const titleTd = "background:#14532D;color:#ffffff;font-weight:bold;font-size:16px;padding:10px;text-align:center;";

    let body = `<table><tr><td colspan="9" style="${titleTd}">GRIFFINE — تقرير أسهم وخطط${isG ? ' الشبكة' : ''}: ${groupLabel}</td></tr>
      <tr><td colspan="9" style="${td}">الفترة: ${periodLabel} | تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}</td></tr>
      <tr><td style="${th}">السهم</td><td style="${th}">الحالة</td><td style="${th}">تكلفة المراكز المفتوحة</td><td style="${th}">القيمة الحالية</td>
      <td style="${th}">الانخفاض</td><td style="${th}">ربح غير محقق</td><td style="${th}">ربح محقق</td>
      <td style="${th}">صفقات مغلقة</td><td style="${th}">ربح الصفقات المغلقة</td></tr>`;
    reportAgg.stockRows.forEach(r=>{
      body += `<tr><td style="${td}">${escapeHtml(r.symbol)}</td><td style="${td}">${r.status}</td>
        <td style="${td}">${fmt2(r.openCost)}</td><td style="${td}">${r.currentValue?fmt2(r.currentValue):'-'}</td>
        <td style="${td}">${r.dropPercent!=null?r.dropPercent.toFixed(2)+'%':'-'}</td>
        <td style="${td}">${fmt2(r.unrealized)}</td><td style="${td}">${fmt2(r.realized)}</td>
        <td style="${td}">${r.closedCount}</td><td style="${td}">${fmt2(r.closedProfit)}</td></tr>`;
    });
    body += `<tr><td style="${totalTd}">الإجمالي</td><td style="${totalTd}"></td>
      <td style="${totalTd}">${fmt2(reportAgg.totalOpenCost)}</td><td style="${totalTd}">${fmt2(reportAgg.totalCurrentValue)}</td>
      <td style="${totalTd}">${reportAgg.avgDropRate!=null?reportAgg.avgDropRate.toFixed(2)+'%':'-'}</td>
      <td style="${totalTd}">${fmt2(reportAgg.totalUnrealized)}</td><td style="${totalTd}">${fmt2(reportAgg.totalRealized)}</td>
      <td style="${totalTd}">${reportAgg.totalClosedTradesCount}</td><td style="${totalTd}">${fmt2(reportAgg.totalClosedProfit)}</td></tr>
      </table>`;

    selectedSyms.forEach(sym=>{
      const p = plans[sym];
      const { rowsHtml, hasAny } = rowsOf(sym, from, to);
      body += `<table class="u-mt20"><tr><td colspan="6" style="${titleTd}">تفاصيل عمليات: ${sym} (${isG ? 'Grid' : 'DCA'})</td></tr>
        <tr><td style="${th}">التاريخ</td><td style="${th}">العملية</td><td style="${th}">المستوى</td><td style="${th}">الكمية</td><td style="${th}">السعر</td><td style="${th}">الربح</td></tr>
        ${hasAny ? rowsHtml.replace(/<td>/g, `<td style="${td}">`) : `<tr><td colspan="6" style="${td}">لا يوجد عمليات في هذه الفترة</td></tr>`}
        </table>`;
    });

    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>تقرير أسهم</x:Name><x:WorksheetOptions><x:RTL/><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml></head><body dir="rtl">${body}</body></html>`;
    buildAndDownloadMhtmlXls(html, chartImg, `griffine_تقرير_أسهم_وخطط${isG ? '_شبكة' : ''}.xls`);
  };
}

/* ================== قائمة الخطط ================== */
/* الإصدار 97: رمز السهم لازم يكون موجود في البورصة قبل إنشاء خطة
   - بنسأل مصدر الأسعار عن الرمز؛ لو ملقاهوش بنتأكد إن المصدر نفسه شغال (سهم مرجعي) - لو المصدر واقع منمنعش المستخدم */
async function gCheckSymbol(symbol, market){
  const q = (s) => apiGet(`/markets_api.php?action=quote&symbol=${encodeURIComponent(s)}&market=${encodeURIComponent(market || 'مصر')}`).catch(() => null);
  const r = await q(symbol);
  if (r && r.success && +r.last > 0) return { ok: true, last: +r.last };
  const REF = { 'مصر':'COMI', 'السعودية':'2222', 'الإمارات':'EMAAR', 'قطر':'QNBK', 'الكويت':'NBK' };
  const ref = await q(REF[market] || 'COMI');
  if (!(ref && ref.success && +ref.last > 0)) return { ok: true, unverified: true };
  return { ok: false, msg: `الرمز ${symbol} غير موجود في بورصة ${market || 'مصر'} — اكتب رمز السهم كما يظهر في شاشة البورصة (مثل COMI).` };
}

/* الإصدار 100: البحث عن رمز السهم وقت الكتابة في نموذج الخطة (DCA / Grid) - للسهم المدرج في البورصة
   - تحت خانة الاسم: ✅ موجود (الاسم + آخر سعر متأخر 15 دقيقة) أو ❌ غير موجود
   - جنب خانة السعر: «استخدم آخر سعر في الخطة» (بيتملي تلقائي) أو «اكتب السعر يدوي»
   - السهم غير المدرج: مفيش بحث والسعر يدوي */
function gWireSymbolLookup(o){
  const sym = document.getElementById(o.symId), mkt = document.getElementById(o.mktId), px = document.getElementById(o.priceId);
  if (!sym || !mkt || !px) return;
  const st = document.createElement('div'); st.className = 'g-symchk u-fs12'; st.setAttribute('aria-live', 'polite'); sym.insertAdjacentElement('afterend', st);
  const pm = document.createElement('div'); pm.className = 'radio-row g-pxmode u-fs12';
  pm.innerHTML = `<label><input type="radio" name="${o.priceId}_mode" value="auto" checked> استخدم آخر سعر للسهم في الخطة <b class="g-pxlast"></b></label><label><input type="radio" name="${o.priceId}_mode" value="manual"> اكتب السعر يدوي</label>`;
  px.insertAdjacentElement('afterend', pm);
  const listed = () => (document.querySelector(`input[name="${o.listedName}"]:checked`) || {}).value !== '0';
  const mode = () => (pm.querySelector('input:checked') || {}).value || 'auto';
  let last = null, seq = 0, t = null;
  const apply = () => {
    const L = listed();
    pm.hidden = !L; if (!L) { st.innerHTML = '<span class="u-muted">🔕 سهم غير مدرج — اكتب أي اسم وسعر، بدون إشعارات تلقائية.</span>'; px.readOnly = false; return; }
    const auto = mode() === 'auto';
    pm.querySelector('.g-pxlast').textContent = last ? `(${fmt2(last)})` : '';
    px.readOnly = auto && !!last; px.classList.toggle('g-px-auto', auto && !!last);
    if (auto && last) px.value = last;
  };
  const check = async () => {
    const v = sym.value.trim().toUpperCase(); last = null; apply();
    if (!listed()) return;
    if (!v) { st.innerHTML = ''; return; }
    const my = ++seq; st.innerHTML = '<span class="u-muted">🔎 جارٍ البحث في البورصة...</span>';
    const r = await apiGet(`/markets_api.php?action=quote&symbol=${encodeURIComponent(v)}&market=${encodeURIComponent(mkt.value || 'مصر')}`).catch(() => null);
    if (my !== seq) return;
    if (r && r.success && +r.last > 0) {
      last = +r.last;
      st.innerHTML = `<span class="pos">✅ موجود في بورصة ${escapeHtml(mkt.value || 'مصر')}${r.name ? ' — ' + escapeHtml(r.name) : ''} — آخر سعر <b>${fmt2(last)}</b> (متأخر 15 دقيقة)</span>`;
    } else {
      st.innerHTML = `<span class="neg">❌ الرمز ${escapeHtml(v)} غير موجود في بورصة ${escapeHtml(mkt.value || 'مصر')} — اكتب الرمز كما يظهر في شاشة البورصة، أو اختر «سهم غير مدرج في البورصة».</span>`;
    }
    apply();
  };
  sym.addEventListener('input', () => { clearTimeout(t); t = setTimeout(check, 600); });
  mkt.addEventListener('change', check);
  pm.addEventListener('change', apply);
  document.querySelectorAll(`input[name="${o.listedName}"]`).forEach(r => r.addEventListener('change', check));
  if (sym.value.trim()) check(); else apply();
}

/* الإصدار 111: نطاق خطة الشبكة (سقف / قاع) - «تلقائي» (الافتراضي) أو «يدوي»
   تلقائي: تختار المدة (يومي ... سنة) ← أول ما رمز السهم يتكتب بيظهر آخر سعر، والسقف = أعلى سعر والقاع = أقل سعر خلال المدة دي
           (من نفس مصدر الأسعار المتأخرة 15 دقيقة) - والقيمتين بيفضلوا قابلين للتعديل اليدوي
   يدوي: قائمة المدة بتتقفل وبتكتب القيمتين بنفسك. السهم غير المدرج في البورصة ← يدوي بس */
const G_RANGE_PERIODS = [['day','يومي'], ['week','أسبوعي'], ['month','شهري'], ['3months','3 شهور'], ['6months','6 شهور'], ['year','سنة']];
function gWireGridRange(o){
  const hi = document.getElementById(o.highId), lo = document.getElementById(o.lowId), mkt = document.getElementById(o.mktId);
  if (!hi || !lo) return null;
  const row = hi.closest('.grid2') || hi.parentNode;
  const box = document.createElement('div'); box.className = 'g-range-box';
  const nm = o.prefix + '_rangeMode';
  box.innerHTML = `<label>تحديد سقف وقاع النطاق</label>
    <div class="radio-row g-range-mode" role="radiogroup" aria-label="تحديد سقف وقاع النطاق">
      <label><input type="radio" name="${nm}" value="auto"> تلقائي — أعلى وأقل سعر للسهم خلال مدة تختارها</label>
      <label><input type="radio" name="${nm}" value="manual"> يدوي — أكتب السقف والقاع بنفسي</label>
    </div>
    <label for="${o.prefix}_rangePeriod">المدة</label>
    <select id="${o.prefix}_rangePeriod">${G_RANGE_PERIODS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
    <div class="g-range-info u-fs12" id="${o.prefix}_rangeInfo" aria-live="polite"></div>`;
  row.parentNode.insertBefore(box, row);
  const per = box.querySelector('select'), info = box.querySelector('.g-range-info');
  const listed = () => o.isListed ? o.isListed() : true;
  per.value = G_RANGE_PERIODS.some(x => x[0] === o.period) ? o.period : 'month';
  box.querySelector(`input[value="${o.mode === 'manual' ? 'manual' : 'auto'}"]`).checked = true;
  const mode = () => listed() ? ((box.querySelector('input:checked') || {}).value || 'auto') : 'manual';
  const perLabel = () => (G_RANGE_PERIODS.find(x => x[0] === per.value) || [,''])[1];
  let seq = 0, t = null;
  const fetchRange = async (fill) => {
    const sym = String(o.getSym() || '').trim().toUpperCase(), my = ++seq;
    if (mode() !== 'auto') return;
    if (!sym) { info.innerHTML = '<span class="u-muted">اكتب رمز السهم الأول، وبعدها السقف والقاع هيتملوا تلقائيًا.</span>'; return; }
    info.innerHTML = '<span class="u-muted">🔎 جارٍ البحث عن أعلى وأقل سعر...</span>';
    const r = await apiGet(`/markets_api.php?action=quote&symbol=${encodeURIComponent(sym)}&market=${encodeURIComponent((mkt && mkt.value) || 'مصر')}&period=${encodeURIComponent(per.value)}`).catch(() => null);
    if (my !== seq || mode() !== 'auto') return;
    if (!(r && r.success && +r.last > 0)) { info.innerHTML = '<span class="neg">مقدرناش نجيب أسعار السهم دلوقتي — تأكد من الرمز والسوق، أو اختر «يدوي» واكتب القيمتين.</span>'; return; }
    if (r.high > 0 && r.low > 0 && !r.partial) {
      if (fill !== false) { hi.value = +r.high; lo.value = +r.low; hi.dispatchEvent(new Event('input', { bubbles: true })); }
      info.innerHTML = `آخر سعر <b data-g-last>${fmt2(+r.last)}</b> — أعلى سعر خلال (${perLabel()}) <b class="pos" data-g-hi>${fmt2(+r.high)}</b> — أقل سعر <b class="neg" data-g-lo>${fmt2(+r.low)}</b> <span class="u-muted">(متأخر ${+r.delayMinutes || 15} دقيقة — تقدر تعدّل القيمتين بإيدك)</span>`;
    } else {
      info.innerHTML = `آخر سعر <b data-g-last>${fmt2(+r.last)}</b> — <span class="neg">أعلى وأقل سعر للمدة دي مش متاحين حاليًا، اكتبهم يدوي.</span>`;
    }
  };
  const apply = (fill) => {
    const L = listed(), auto = mode() === 'auto';
    box.querySelectorAll('input[type=radio]').forEach(r => { if (r.value === 'auto') r.disabled = !L; });
    if (!L) box.querySelector('input[value="manual"]').checked = true;
    per.disabled = !auto; box.classList.toggle('g-range-manual', !auto);
    if (!auto) { seq++; info.innerHTML = L ? '<span class="u-muted">✍️ يدوي: اكتب سقف وقاع النطاق بنفسك.</span>' : '<span class="u-muted">🔕 سهم غير مدرج — السقف والقاع يدوي.</span>'; return; }
    fetchRange(fill);
  };
  box.addEventListener('change', (e) => { if (e.target.name === nm || e.target === per) apply(); });
  if (mkt) mkt.addEventListener('change', () => apply());
  if (o.symId) { const se = document.getElementById(o.symId); if (se) se.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => apply(), 650); }); }
  if (o.listedName) document.querySelectorAll(`input[name="${o.listedName}"]`).forEach(r => r.addEventListener('change', () => apply()));
  apply(o.fillOnStart !== false);
  return { mode, period: () => per.value };
}

/* الإصدار 99: حذف خطة (DCA / Grid) ← بتنتقل لسلة المحذوفات (أي مستخدم: عميل / موظف / أدمن) ويقدر يرجّعها أو يحذفها نهائيًا من السلة */
async function gDeletePlan(kind, symbol, after){
  const isGrid = kind === 'grid';
  const email = await getSession(); if (!email) return false;
  const all = isGrid ? await getGridPlans(email) : await getPlans(email);
  const plan = all[symbol]; if (!plan) return false;
  /* الإصدار 100: مينفعش تحذف خطة فيها صفقات مفتوحة (كمية مشتراة لسه متباعتش) ← لازم تقفلها الأول
     الخطة اللي ليها نتائج مالية (صفقات مقفولة / ربح محقق) بتتحفظ بحساباتها كاملة في السلة، والحذف النهائي من السلة بيشيلها من النظام نهائي */
  let held = 0, realized = 0, closed = 0;
  if (isGrid) {
    held = (plan.levels || []).filter(l => l.status === 'bought').reduce((a, l) => a + (+l.executedQty || 0), 0);
    realized = (plan.cycleHistory || []).length ? +(plan.cycleHistory[plan.cycleHistory.length - 1].cumulative || 0) : 0;
    closed = (plan.closedTrades || []).length;
  } else {
    let sm = null; try { sm = simulatePlan(plan); } catch(e){}
    held = sm ? +sm.heldQty || 0 : 0;
    realized = (sm ? +sm.totalRealizedProfit || 0 : 0) + (plan.closedTrades || []).reduce((a, t) => a + (+t.profit || 0), 0);
    closed = (plan.closedTrades || []).length;
  }
  if (held > 1e-9) {
    await gAlert(`مينفعش تحذف خطة «${symbol}» وفيها صفقات مفتوحة: ${fmtQty(held)} سهم لسه متباعتش.\nاقفل الصفقات الأول (سجّل بيع الكمية المتبقية)، وبعدين احذف الخطة.`);
    return false;
  }
  const hasResults = closed > 0 || Math.abs(realized) > 1e-9;
  const msg = `حذف ${isGrid ? 'خطة خطوط الشبكة' : 'خطة تعزيز المتوسط'} «${symbol}»؟\n`
    + (hasResults ? `للخطة نتائج مالية: ${realized < 0 ? 'خسارة' : 'ربح'} محقق ${fmt2(Math.abs(realized))}${closed ? ` على ${closed} صفقة مقفولة` : ''} — هتتحفظ بحساباتها كاملة في سلة المحذوفات وتقدر ترجّعها.\nلو حذفتها نهائيًا من السلة، هتتشال كل حساباتها من النظام نهائيًا.`
      : 'هتنتقل إلى سلة المحذوفات، وتقدر ترجّعها من هناك أو تحذفها نهائيًا.');
  if (!await gConfirm(msg, { ok: '🗑️ نقل للسلة', danger: true })) return false;
  delete all[symbol];
  if (isGrid) await saveGridPlans(email, all); else await savePlans(email, all);
  if (window.GShell) GShell.toast('نُقلت الخطة إلى سلة المحذوفات — تقدر ترجّعها من «سلة المحذوفات»', 'ok');
  if (after) after();
  return true;
}

/* الإصدار 98: ربح الخطط المفتوحة على آخر سعر (متأخر 15 دقيقة) في قوائم الخطط
   items = [{ sym, market, held, avg, ccy }] ← بيملا .gpl-px[data-sym] في كل سطر + #gplTotal (إجمالي لكل عملة لوحدها) */

/* الإصدار 110: شارة حالة الخطة (مفتوحة / مغلقة / لم تبدأ) + الضغط على اسم السهم يفتح خطته */
function gPlanStatusBadge(st){
  const k = /مفتوح/.test(st) ? 'open' : /مغلق|مقفول/.test(st) ? 'closed' : /محذوف/.test(st) ? 'del' : 'new';
  const l = { open: 'مفتوحة', closed: 'مغلقة', del: 'محذوفة', new: 'لم تبدأ' }[k];
  return `<span class="g-st g-st-${k}">${l}</span>`;
}
function gPlanLink(sym, kind){ return `<a class="g-plan-link" data-go-plan="${escapeHtml(sym)}" data-kind="${kind === 'Grid' ? 'Grid' : 'DCA'}" title="فتح الخطة">${escapeHtml(sym)}</a>`; }
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('[data-go-plan]'); if (!a) return;
  e.preventDefault(); e.stopPropagation();
  const sym = a.dataset.goPlan; if (a.dataset.kind === 'Grid') renderGridPlanDetail(sym); else renderPlanDetail(sym);
}, true);
/* ================== الإصدار 112: جدول المستويات الموحّد (DCA / Grid) ==================
   - كل معلومة في عمود لوحدها (مفيش مستطيلات شرح جوه الجدول) + كل رقم في سطر واحد برقمين بعد العلامة
   - الإجراءات أزرار صغيرة (شراء / بيع / ✎ تعديل / 🗑 حذف) بتفتح نافذة إدخال (الكمية + السعر + التاريخ)
   - عمليات البيع: سهم ▸ جنب رقم المستوى ← كل عملية بيع في سطر تحته بنفس الأعمدة + تعديل/حذف
   - أول عمود وعمود الإجراءات ثابتين وقت التمرير بالعرض (shell.css) */
const glvN = v => (v == null || !isFinite(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const glvQ = v => (v == null || !isFinite(v)) ? '—' : (Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v).toLocaleString('en-US') : glvN(v));
const glvSign = v => (v == null || !isFinite(v)) ? '' : v > 1e-9 ? 'pos' : v < -1e-9 ? 'neg' : '';
const glvPL = v => (v == null || !isFinite(v)) ? '—' : (v > 1e-9 ? '+' : '') + glvN(v);
function glvTd(v, kind, extra){
  const txt = kind === 'q' ? glvQ(v) : kind === 'pl' ? glvPL(v) : glvN(v);
  const cls = ['glv-n']; if (v == null || !isFinite(v)) cls.push('glv-dim'); if (kind === 'pl') cls.push(glvSign(v)); if (extra) cls.push(extra);
  return `<td class="${cls.filter(Boolean).join(' ')}">${txt}</td>`;
}
function glvLevelCell(n, idx, sellsCount, open){
  return `<td><span class="glv-lvc">${sellsCount ? `<span class="glv-exp" role="button" tabindex="0" data-glv-exp="${idx}" aria-expanded="${open ? 'true' : 'false'}" aria-label="عمليات البيع (${sellsCount})" title="عمليات البيع (${sellsCount})"></span>` : '<span class="glv-exp glv-ph" aria-hidden="true"></span>'}<b>${n}</b></span></td>`;
}
function glvBadge(label, k){ return `<span class="glv-st glv-st-${k}">${escapeHtml(label)}</span>`; }
function glvBtn(label, call, args, o){
  o = o || {};
  return `<button type="button" class="glv-b${o.cls ? ' ' + o.cls : ''}" data-gcall="${call}" data-gargs="${gArgs(args)}"${o.title ? ` title="${escapeHtml(o.title)}" aria-label="${escapeHtml(o.title)}"` : ''}${o.disabled ? ' disabled' : ''}>${label}</button>`;
}
function glvOpenSet(key){ window.__glvOpen = window.__glvOpen || {}; return (window.__glvOpen[key] = window.__glvOpen[key] || new Set()); }
// فتح/قفل عمليات البيع من غير إعادة رسم الشاشة (البحث والفلتر والترتيب بيفضلوا زي ما هما)
function glvToggle(el){
  const t = el.closest('table'); if (!t) return;
  const i = el.dataset.glvExp, open = el.getAttribute('aria-expanded') !== 'true';
  el.setAttribute('aria-expanded', open ? 'true' : 'false');
  t.querySelectorAll(`tr.g-subrow[data-sub-of="${i}"]`).forEach(r => r.classList.toggle('g-sub-closed', !open));
  const set = glvOpenSet(t.dataset.glvKey || t.id); if (open) set.add(String(i)); else set.delete(String(i));
}
document.addEventListener('click', (e) => { const el = e.target.closest && e.target.closest('[data-glv-exp]'); if (el) { e.preventDefault(); glvToggle(el); } });
document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-glv-exp]')) { e.preventDefault(); glvToggle(e.target); } });

// ربح/خسارة كل مستوى على آخر سعر = الكمية المتبقية من المستوى × (آخر سعر − سعر شرائه) + الإجمالي
function glvFillUnreal(tableId, last){
  const t = document.getElementById(tableId); if (!t) return;
  let sum = 0, any = false;
  t.querySelectorAll('td.lv-unreal').forEach(td => {
    const q = +td.dataset.q, p = +td.dataset.p;
    if (!(q > 0) || !(p > 0) || !(last > 0)) { td.textContent = '—'; td.className = 'glv-n glv-dim lv-unreal'; return; }
    const v = (last - p) * q; sum += v; any = true;
    td.textContent = glvPL(v); td.className = 'glv-n lv-unreal ' + glvSign(v);
  });
  const tt = t.querySelector('td.lv-unreal-total');
  if (tt) { tt.textContent = any ? glvPL(sum) : '—'; tt.className = 'glv-n lv-unreal-total ' + (any ? glvSign(sum) : 'glv-dim'); }
}

/* نافذة الإدخال: o = { title, sub, q, p, d, maxQ, onSave(v) ← ترجع نص خطأ أو لا شيء } */
function glvModal(o){
  let ov = document.getElementById('glvOv');
  if (!ov) {
    ov = document.createElement('div'); ov.id = 'glvOv'; ov.className = 'glv-ov'; ov.hidden = true;
    ov.innerHTML = `<div class="glv-modal" role="dialog" aria-modal="true" aria-labelledby="glvMT">
      <h3 id="glvMT"></h3><div class="glv-msub" id="glvMS"></div>
      <label for="glvMQ">الكمية</label><input type="number" step="any" min="0" id="glvMQ" inputmode="decimal">
      <label for="glvMP">السعر</label><input type="number" step="any" min="0" id="glvMP" inputmode="decimal">
      <label for="glvMD">التاريخ</label><input type="date" id="glvMD">
      <div class="glv-mpx" id="glvMX" hidden></div>
      <div class="glv-mcalc"><span>القيمة</span><b id="glvMV">0.00</b></div>
      <div class="glv-mcalc glv-mpl" id="glvMPLRow" hidden><span id="glvMPLLbl">الربح / الخسارة</span><b id="glvMPL">0.00</b></div>
      <div class="glv-mwarn" id="glvMW" role="alert" hidden></div>
      <div class="glv-merr" id="glvME" role="alert"></div>
      <div class="glv-mrow"><button type="button" id="glvMOk">حفظ</button><button type="button" class="secondary" id="glvMNo">إلغاء</button></div>
    </div>`;
    document.body.appendChild(ov);
    // الإصدار 115: في البيع ← الربح / الخسارة بيتحسب على السعر المكتوب (أوتوماتيك أو يدوي) + تحذير لو أقل من متوسط التكلفة
    const calc = () => {
      const q = +document.getElementById('glvMQ').value || 0, pr = +document.getElementById('glvMP').value || 0, o2 = ov._o || {};
      document.getElementById('glvMV').textContent = glvN(q * pr);
      const plRow = document.getElementById('glvMPLRow'), w = document.getElementById('glvMW'), ok = document.getElementById('glvMOk');
      ov._armed = false; ok.textContent = o2.okText || 'حفظ'; ok.classList.remove('glv-danger');
      if (!(o2.cost > 0)) { plRow.hidden = true; w.hidden = true; return; }
      const pl = (pr - o2.cost) * q, pct = (pr - o2.cost) / o2.cost * 100;
      plRow.hidden = !(pr > 0 && q > 0);
      document.getElementById('glvMPLLbl').textContent = pl < 0 ? 'خسارة البيع' : 'ربح البيع';
      const plEl = document.getElementById('glvMPL'); plEl.textContent = `${glvN(Math.abs(pl))} (${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)`; plEl.className = pl < 0 ? 'neg' : 'pos';
      if (pr > 0 && q > 0 && pr < o2.cost - 1e-9) { w.hidden = false; w.textContent = `⚠️ بيع بخسارة ${glvN(Math.abs(pl))} (${pct.toFixed(2)}%) — السعر ${glvN(pr)} أقل من ${o2.costLbl || 'متوسط التكلفة'} ${glvN(o2.cost)}.`; }
      else w.hidden = true;
    };
    ov.querySelectorAll('input').forEach(i => i.addEventListener('input', calc));
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.hidden = true; });
    document.getElementById('glvMNo').onclick = () => { ov.hidden = true; };
    ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') ov.hidden = true; if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); document.getElementById('glvMOk').click(); } });
    ov._calc = calc;
  }
  ov._o = o;
  const mx = document.getElementById('glvMX');
  mx.hidden = !o.pxNote; mx.textContent = o.pxNote || '';
  document.getElementById('glvMT').textContent = o.title || '';
  document.getElementById('glvMS').textContent = o.sub || '';
  document.getElementById('glvMQ').value = o.q != null && o.q !== '' ? +(+o.q).toFixed(4) : '';
  document.getElementById('glvMP').value = o.p != null && o.p !== '' ? +(+o.p).toFixed(4) : '';
  document.getElementById('glvMD').value = String(o.d || new Date().toISOString().slice(0, 10)).slice(0, 10);
  document.getElementById('glvME').textContent = '';
  ov._calc(); ov.hidden = false;
  const ok = document.getElementById('glvMOk'); ok.disabled = false;
  ok.onclick = async () => {
    const v = { q: parseFloat(document.getElementById('glvMQ').value), p: parseFloat(document.getElementById('glvMP').value), d: document.getElementById('glvMD').value || new Date().toISOString().slice(0, 10) };
    const err = document.getElementById('glvME');
    if (!(v.q > 0)) { err.textContent = 'اكتب كمية أكبر من صفر (ممكن تكون كسر عشري).'; return; }
    if (!(v.p > 0)) { err.textContent = 'اكتب سعر أكبر من صفر.'; return; }
    if (o.maxQ != null && v.q > o.maxQ + 1e-9) { err.textContent = `أقصى كمية مسموحة ${glvQ(o.maxQ)}.`; return; }
    // بيع بخسارة ← ضغطة تانية للتأكيد
    if (o.cost > 0 && v.p < o.cost - 1e-9 && !ov._armed) { ov._armed = true; ok.textContent = `تأكيد البيع بخسارة ${glvN(Math.abs((v.p - o.cost) * v.q))}`; ok.classList.add('glv-danger'); return; }
    ok.disabled = true;
    let r; try { r = await o.onSave(v); } catch(e2){ r = 'حصل خطأ — حاول تاني.'; }
    ok.disabled = false;
    if (typeof r === 'string' && r) { err.textContent = r; return; }
    ov.hidden = true;
  };
  setTimeout(() => { const q = document.getElementById('glvMQ'); q.focus(); q.select(); }, 30);
}

/* الإصدار 115: الهدف بيتكيّف مع السوق
   لو آخر سعر للسهم عدّى هدف البيع المخطط (مثال: الهدف 10.5 = 5% والسعر 14) ← الهدف بيتفعّل على سعر السوق
   والربح المعروض = الربح الفعلي (40%) مش النسبة المخططة. لو السعر رجع تحت الهدف ← يرجع الهدف المخطط.
   (مفيش حد خسارة ولا حد حماية - حد خطة DCA هو المبلغ المرصود للسهم) */
function gDynTargetPaint(o){
  const val = document.getElementById(o.valId), lbl = document.getElementById(o.lblId), note = document.getElementById(o.noteId);
  if (!val || !lbl) return;
  const on = o.price > 0 && o.target > 0 && o.held > 0 && o.avg > 0 && o.price > o.target + 1e-9;
  if (!on) { val.textContent = fmtMoney(o.target); val.classList.remove('pos'); lbl.textContent = o.baseLbl; if (note) note.hidden = true; return; }
  const pct = (o.price - o.avg) / o.avg * 100, pnl = (o.price - o.avg) * o.held, planned = (o.target - o.avg) * o.held;
  val.textContent = fmtMoney(o.price); val.classList.add('pos');
  lbl.textContent = `هدف البيع الفعلي على سعر السوق (+${pct.toFixed(2)}% بدل ${o.pt}%)`;
  if (note) { note.hidden = false;
    note.innerHTML = `🚀 <b>السعر عدّى هدف البيع${o.trial ? ' (سعر التجربة)' : ''}:</b> الهدف المخطط ${fmt2(o.target)} (${o.pt}%) والسعر ${fmt2(o.price)} — اتفعّل الهدف على سعر السوق: <b class="pos">ربح فعلي ${fmt2(pnl)} (+${pct.toFixed(2)}%)</b> بدل ${fmt2(planned)} المخطط. لو السعر رجع تحت ${fmt2(o.target)} يرجع الهدف المخطط.`; }
}
function gGridDynTargetPaint(g, price, trial){
  const held = g.levels.filter(l => l.status === 'bought' && l.executedQty > 0 && +l.sellTargetPrice > 0);
  const val = document.getElementById('gridSellTarget'), lbl = document.getElementById('gridSellTargetLbl'), note = document.getElementById('gridDynTargetNote');
  if (!val || !lbl) return;
  const qty = held.reduce((a, l) => a + l.executedQty, 0);
  const over = price > 0 ? held.filter(l => price > +l.sellTargetPrice + 1e-9) : [];
  const avgT = (eff) => qty > 0 ? held.reduce((a, l) => a + (eff ? Math.max(+l.sellTargetPrice, price || 0) : +l.sellTargetPrice) * l.executedQty, 0) / qty : null;
  if (!over.length) { val.textContent = fmtMoney(avgT(false)); val.classList.remove('pos'); lbl.textContent = 'هدف البيع (متوسط)'; if (note) note.hidden = true; return; }
  val.textContent = fmtMoney(avgT(true)); val.classList.add('pos'); lbl.textContent = 'هدف البيع الفعلي (متوسط — على سعر السوق)';
  const plannedPnl = over.reduce((a, l) => a + (l.sellTargetPrice - l.executedPrice) * l.executedQty, 0), realPnl = over.reduce((a, l) => a + (price - l.executedPrice) * l.executedQty, 0);
  if (note) { note.hidden = false;
    note.innerHTML = `🚀 <b>${over.length === 1 ? 'مستوى واحد عدّى' : over.length + ' مستويات عدّت'} هدف البيع${trial ? ' (سعر التجربة)' : ''}:</b> السعر ${fmt2(price)} — اتفعّل هدف ${over.length === 1 ? 'المستوى' : 'المستويات دي'} على سعر السوق: <b class="pos">ربح فعلي ${fmt2(realPnl)}</b> بدل ${fmt2(plannedPnl)} المخطط (المستويات: ${over.map(l => g.levels.indexOf(l) + 1).join('، ')}).`; }
}

/* الإصدار 115: فحص الخطط على آخر سعر - أول حاجة في الرئيسية بعد وصول الأسعار
   1) السعر عدّى هدف البيع ← الهدف اتفعّل على سعر السوق (DCA: الكمية كلها / Grid: المستويات اللي عدّت)
   2) DCA: كل المستويات اتنفذت ← المبلغ المرصود للسهم خلص (عدّل الخطة وزوّد المبلغ لفتح مستويات جديدة)
   3) Grid: السعر نزل تحت قاع النطاق
   4) التركّز: السهم وصل 40% أو أكتر من قيمة المحفظة (نفس العملة) */
const G_CONC_PCT = 40;
function gPlanWatchItems(plans, grids){
  const px = window.__mkLivePx || {}, out = [], val = {}, ccyTot = {};
  const keyOf = (s, m) => String(s).toUpperCase() + '|' + (m || 'مصر');
  const ccyOf = (p) => p.currency || (typeof MARKET_TO_CURRENCY_MAP !== 'undefined' ? MARKET_TO_CURRENCY_MAP[p.market] : '') || '';
  const addVal = (s, c, v) => { if (!(v > 0)) return; const k = s + '|' + c; val[k] = (val[k] || 0) + v; ccyTot[c] = (ccyTot[c] || 0) + v; };
  Object.entries(plans || {}).forEach(([s, p]) => {
    if (!p || !Array.isArray(p.levels)) return;
    let sim; try { sim = simulatePlan(p); } catch(e){ return; }
    if (!(sim.heldQty > 0)) return;
    const last = px[keyOf(s, p.market)] || (+p.manualLastPrice > 0 ? +p.manualLastPrice : null), avg = sim.avgCostCurrent, tgt = sim.sellTargetCurrent;
    addVal(s, ccyOf(p), sim.heldQty * (last || avg || 0));
    if (!(last > 0) || !(avg > 0)) return;
    if (tgt > 0 && last > tgt + 1e-9) {
      const pct = (last - avg) / avg * 100;
      out.push({ kind: 'up', type: 'DCA', sym: s, text: `السعر ${fmt2(last)} عدّى هدف البيع ${fmt2(tgt)} (${+p.profitTarget || 0}%) — الهدف اتفعّل على سعر السوق: ربح فعلي ${fmt2((last - avg) * sim.heldQty)} (+${pct.toFixed(2)}%)` });
    }
    const hasNext = sim.rows.some(r => r.isNext && !r.executed && !r.trimmed);
    if (!hasNext && last < (sim.lastBoughtPrice || 0)) {
      out.push({ kind: 'cap', type: 'DCA', sym: s, text: `كل المستويات اتنفذت والمبلغ المرصود للسهم خلص (السعر ${fmt2(last)} تحت آخر شراء ${fmt2(sim.lastBoughtPrice)}) — تقدر تعدّل الخطة وتزوّد المبلغ لفتح مستويات جديدة.` });
    }
  });
  Object.entries(grids || {}).forEach(([s, g]) => {
    if (!g || !Array.isArray(g.levels) || g.closed) return;
    const held = g.levels.filter(l => l.status === 'bought' && l.executedQty > 0);
    const last = px[keyOf(s, g.market)] || (+g.manualLastPrice > 0 ? +g.manualLastPrice : null);
    const cost = held.reduce((a, l) => a + l.executedQty * l.executedPrice, 0), qty = held.reduce((a, l) => a + l.executedQty, 0);
    addVal(s, ccyOf(g), qty * (last || (qty ? cost / qty : 0)));
    if (!(last > 0) || !held.length) return;
    const over = held.filter(l => +l.sellTargetPrice > 0 && last > +l.sellTargetPrice + 1e-9);
    if (over.length) out.push({ kind: 'up', type: 'Grid', sym: s, text: `السعر ${fmt2(last)} عدّى هدف البيع في ${over.length === 1 ? 'مستوى واحد' : over.length + ' مستويات'} — الهدف اتفعّل على سعر السوق: ربح فعلي ${fmt2(over.reduce((a, l) => a + (last - l.executedPrice) * l.executedQty, 0))} بدل ${fmt2(over.reduce((a, l) => a + (l.sellTargetPrice - l.executedPrice) * l.executedQty, 0))}` });
    if (+g.rangeLow > 0 && last < +g.rangeLow) out.push({ kind: 'cap', type: 'Grid', sym: s, text: `السعر ${fmt2(last)} نزل تحت قاع النطاق ${fmt2(g.rangeLow)} — مستويات الشراء في النطاق خلصت، تقدر تعدّل النطاق أو المبلغ.` });
  });
  // التركّز (لو في العملة دي أكتر من سهم)
  const perSym = {}; Object.keys(val).forEach(k => { const i = k.lastIndexOf('|'); const c = k.slice(i + 1); (perSym[c] = perSym[c] || []).push(k.slice(0, i)); });
  Object.entries(val).forEach(([k, v]) => {
    const i = k.lastIndexOf('|'), s = k.slice(0, i), c = k.slice(i + 1);
    if ((perSym[c] || []).length < 2) return;
    const pct = v / ccyTot[c] * 100;
    if (pct >= G_CONC_PCT) out.push({ kind: 'conc', type: '', sym: s, text: `السهم ده بقى ${pct.toFixed(0)}% من قيمة محفظتك${c ? ' (' + c + ')' : ''} — نسبة تركّز عالية (الحد المقترح أقل من ${G_CONC_PCT}%). ملحوظة للمراجعة، مش أمر بيع.` });
  });
  const ord = { up: 0, cap: 1, conc: 2 };
  return out.sort((a, b) => ord[a.kind] - ord[b.kind]);
}
function gPlanWatchPaint(el, plans, grids){
  if (!el) return;
  let items = []; try { items = gPlanWatchItems(plans, grids); } catch(e){ console.error(e); }
  if (!items.length) { el.innerHTML = ''; return; }
  const ic = { up: '🚀', cap: '🧾', conc: '⚖️' };
  el.innerHTML = `<div class="g-watch" id="gPlanWatch"><div class="g-watch-h"><b>متابعة خططك على آخر سعر</b><small>أسعار متأخرة 15 دقيقة</small></div>
    ${items.slice(0, 8).map(it => `<button type="button" class="g-watch-it k-${it.kind}" data-sym="${escapeHtml(it.sym)}" data-type="${it.type}"><span class="ic">${ic[it.kind]}</span><span><b>${escapeHtml(it.sym)}${it.type ? ` <small>${it.type}</small>` : ''}</b> ${escapeHtml(it.text)}</span></button>`).join('')}
    ${items.length > 8 ? `<small class="u-muted">+ ${items.length - 8} ملاحظات أخرى</small>` : ''}</div>`;
  el.querySelectorAll('.g-watch-it').forEach(b => b.onclick = () => {
    const t = b.dataset.type, s = b.dataset.sym;
    if (t === 'Grid') renderGridPlanDetail(s); else if (t === 'DCA') renderPlanDetail(s); else if (plans && plans[s]) renderPlanDetail(s); else renderGridPlanDetail(s);
  });
}

function gFillListProfits(tok, plans, grids, items){
  if (typeof mkEnsureLivePrices !== 'function' || !items.length) return;
  const paint = () => {
    if (screenStale(tok)) return;
    const px = window.__mkLivePx || {}, tot = {};
    items.forEach(it => {
      const el = document.querySelector(`.gpl-px[data-sym="${CSS.escape(it.sym)}"]`); if (!el) return;
      const last = px[String(it.sym).toUpperCase() + '|' + (it.market || 'مصر')];
      if (!(last > 0)) { el.innerHTML = '<span class="u-muted">آخر سعر غير متاح</span>'; return; }
      if (!(it.held > 0) || !(it.avg > 0)) { el.innerHTML = `آخر سعر <b>${fmt2(last)}</b> — لا توجد كمية مملوكة`; return; }
      const pnl = (last - it.avg) * it.held, pct = (last - it.avg) / it.avg * 100, c = it.ccy || 'جنيه مصري';
      tot[c] = tot[c] || { pnl: 0, cost: 0, value: 0 }; tot[c].pnl += pnl; tot[c].cost += it.avg * it.held; tot[c].value += last * it.held;
      el.innerHTML = `آخر سعر <b>${fmt2(last)}</b> — ${fmtQty(it.held)} سهم بمتوسط ${fmt2(it.avg)} — <b class="${pnl < 0 ? 'neg' : 'pos'}">${pnl < 0 ? 'خسارة' : 'ربح'} ${fmt2(Math.abs(pnl))} (${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)</b>`;
    });
    const t = document.getElementById('gplTotal');
    if (t) { const k = Object.keys(tot); t.hidden = !k.length;
      // الإصدار 108: مربع منسّق فوق القائمة (بعيد عن التمرير) - لكل عملة مربع
      t.innerHTML = k.map(c => { const v = tot[c], pc = v.cost > 0 ? v.pnl / v.cost * 100 : 0, cl = v.pnl < 0 ? 'neg' : 'pos';
        return `<div class="gpl-box"><div class="gpl-head"><span class="gpl-title">ربح/خسارة الخطط المفتوحة على آخر سعر</span><span class="gpl-ccy">${escapeHtml(c)}</span></div>
          <div class="gpl-main ${cl}">${v.pnl < 0 ? '−' : '+'}${fmtMoney(Math.abs(v.pnl))}<small>${pc > 0 ? '+' : ''}${pc.toFixed(2)}%</small></div>
          <div class="gpl-stats"><div><span>التكلفة</span><b>${fmtMoney(v.cost)}</b></div><div><span>القيمة الآن</span><b>${fmtMoney(v.value)}</b></div><div><span>النتيجة</span><b class="${cl}">${v.pnl < 0 ? 'خسارة' : 'ربح'}</b></div></div></div>`; }).join(''); }
  };
  paint();
  mkEnsureLivePrices(plans, grids, 4000).then(() => { paint(); if (window.__mkLivePxPending) window.__mkLivePxPending.then(paint).catch(() => {}); }).catch(() => {});
}

/* الإصدار 98: سهم غير مدرج في البورصة ← خانة "آخر سعر" بتبقى يدوية وبتتحفظ ، ومعاها تنبيه إن مفيش إشعارات تلقائية */
function gUnlistedPriceBox(inputId, plan, onSave){
  const inp = document.getElementById(inputId); if (!inp) return;
  const det = inp.closest('details');
  if (det) { det.open = true; const sm = det.querySelector('summary'); if (sm) sm.textContent = '✍️ آخر سعر للسهم (سهم غير مدرج — تكتبه بنفسك ويُحفظ)'; const lb = det.querySelector('label'); if (lb) lb.textContent = 'السهم غير مدرج في البورصة، فالسعر مش بيتحدّث تلقائيًا ومفيش إشعارات تلقائية عليه — اكتب آخر سعر وهيتحفظ.'; }
  inp.value = +plan.manualLastPrice > 0 ? plan.manualLastPrice : '';
  inp.addEventListener('change', () => { const v = parseFloat(inp.value); onSave(v > 0 ? v : null); });
  const card = det ? det.closest('.section-card') : null;
  if (card && !card.querySelector('.g-unlisted-note')) { const n = document.createElement('div'); n.className = 'info g-unlisted-note'; n.textContent = '🔕 سهم غير مدرج في البورصة — لا يتم التحقق من الكود ولا تصل عليه إشعارات تلقائية.'; card.insertBefore(n, card.firstChild); }
}

/* الإصدار 97: آخر سعر للسهم في شاشة الخطة (DCA / Grid) - من ذاكرة الأسعار فورًا، وبعدين تحديث من السيرفر
   وكل 5 دقائق طول ما الشاشة مفتوحة. onPrice(السعر) بتتنادى لما السعر يتغيّر */
function gPlanLivePrice(tok, plans, grids, key, onPrice){
  if (typeof mkEnsureLivePrices !== 'function') return;
  let last = (window.__mkLivePx || {})[key] || null;
  const check = () => { const v = (window.__mkLivePx || {})[key] || null; if (v !== last && !screenStale(tok)) { last = v; onPrice(v); } };
  const run = async () => {
    try { await mkEnsureLivePrices(plans, grids, 4000); } catch(e){}
    check();
    if (window.__mkLivePxPending) window.__mkLivePxPending.then(check).catch(() => {});
  };
  run();
  clearInterval(window.__planPxTimer);
  window.__planPxTimer = setInterval(() => { if (screenStale(tok)) { clearInterval(window.__planPxTimer); return; } run(); }, 5 * 60 * 1000);
}

async function renderPlansList(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderPlansList());
  setBottomNavActive('plans');
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;
  const plans = await getPlans(email);
  const symbols = Object.keys(plans);

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${email}</strong></div></div>
    <button class="secondary small u-wa" id="homeBtn">🏠 الشاشة الرئيسية</button>
    <button id="newPlanBtn">+ خطة جديدة لسهم</button>
    <h2>${pageTitle('plans_list','خططك الحالية (سهم لكل خطة)')}</h2>
    <div class="gpl-total" id="gplTotal" hidden></div>
    ${symbols.length>0 ? `<div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="dacListSearch" placeholder="🔍 ابحث باسم السهم..."></div>
      <div class="std-filter-tabs">
        <button type="button" class="small secondary dacListFilterBtn std-filter-tab btn-active" data-status="all">الكل</button>
        <button type="button" class="small secondary dacListFilterBtn std-filter-tab" data-status="مفتوحة">مفتوحة فقط</button>
        <button type="button" class="small secondary dacListFilterBtn std-filter-tab" data-status="مقفولة">مقفولة فقط</button>
      </div>
    </div>` : ''}
    <div id="plansListArea" class="plans-list-scroll"></div>
    <div class="std-filter-empty" id="dacListEmpty" style="display:none;">لا توجد خطط مطابقة للبحث/الفلتر</div>
    ${symbols.length>0 ? renderDacStockReportSectionHtml(plans, symbols) : ''}
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();
  document.getElementById('newPlanBtn').onclick=()=>renderNewPlanForm();
  if (symbols.length>0) wireDacStockReportSection(plans, symbols);

  const listArea = document.getElementById('plansListArea');
  if(symbols.length===0){
    listArea.innerHTML = `<p class="u-note">لا يوجد خطط بعد. ابدأ بإنشاء خطة جديدة.</p>`;
  } else {
    listArea.innerHTML = symbols.map(sym=>{
      const p = plans[sym];
      if(!p.closedTrades) p.closedTrades=[];
      const sim = simulatePlan(p);
      const doneCount = p.levels.filter(l=>l.executed).length;
      // نفس المعيار بالظبط المستخدم في "ملخص المحفظة": الخطة "مقفولة" لو لا يوجد عندها
      // كمية محتفظ بيها دلوقتي (heldQty=0) وعندها صفقات مغلقة قبل كده - مش مجرد إن
      // الدورة الحالية بعد مبتداش (كان ده سبب ظهور ABUK/FAWRY كـ"مفتوحة" غلط رغم إنهم
      // مقفولين فعليًا وموجودين كده في تقرير المحفظة)
      const isOpenPosition = sim.heldQty > 0;
      const isActuallyClosed = !isOpenPosition && p.closedTrades.length > 0;
      const statusKey = isActuallyClosed ? 'مقفولة' : 'مفتوحة';
      const stLabel = isOpenPosition ? 'مفتوحة' : isActuallyClosed ? 'مغلقة' : 'لم تبدأ';
      return `<div class="plan-list-item" data-sym="${sym}" data-q="${sym.toLowerCase()}" data-status="${statusKey}">
        <div><strong>${sym}</strong> <span class="g-kind">DCA</span> ${gPlanStatusBadge(stLabel)}<div class="u-fs11 u-muted">${doneCount}/${p.levels.length} مستويات — ${isActuallyClosed?'مقفولة ✅':'مفتوحة'} — ${p.market||''} — ${p.currency||''}${p.listed === false ? ' — <span class="tag">غير مدرج 🔕</span>' : ''}</div>${isOpenPosition ? `<div class="gpl-px u-fs12" data-sym="${escapeHtml(sym)}">جارٍ تحميل آخر سعر...</div>` : ''}</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <button class="small secondary u-wa u-m0" data-gcall="__editDacPlanFromList" data-gargs="${gArgs([String(sym)])}" data-gstop="1">⚙️ تعديل الخطة</button>
          <button class="small danger u-wa u-m0" data-gcall="__delDacPlanFromList" data-gargs="${gArgs([String(sym)])}" data-gstop="1" title="حذف (ينتقل إلى سلة المحذوفات)" aria-label="حذف الخطة">🗑️</button>
          <span>&#8250;</span>
        </div>
      </div>`;
    }).join('');
    listArea.querySelectorAll('.plan-list-item').forEach(el=>{
      el.onclick=(e)=>{ if (e.target.closest('button')) return; renderPlanDetail(el.dataset.sym); };   // أزرار التعديل والحذف مبتفتحش الخطة
    });
    gFillListProfits(__tok, plans, {}, symbols.map(sym => { let sm = null; try { sm = simulatePlan(plans[sym]); } catch(e){}
      return sm && sm.heldQty > 0 ? { sym, market: plans[sym].market || 'مصر', held: sm.heldQty, avg: sm.avgCostCurrent, ccy: plans[sym].currency } : null; }).filter(Boolean));
    window.__editDacPlanFromList = (sym) => renderEditPlanSettings(sym);
    window.__delDacPlanFromList = (sym) => gDeletePlan('dca', sym, () => { window.__navSilent = true; try { renderPlansList(); } finally { window.__navSilent = false; } });

    // فلتر البحث + حالة الخطة (مفتوحة/مقفولة) - نفس الأسلوب اليدوي المستخدم في
    // شاشة "ملخص المحفظة" (تقرير سهم أو أكتر) لأنه مضبوط ومختبر ويشتغل صح
    function filterDacPlansList(){
      const q = document.getElementById('dacListSearch').value.trim().toLowerCase();
      const activeBtn = document.querySelector('.dacListFilterBtn.btn-active');
      const statusFilter = activeBtn ? activeBtn.dataset.status : 'all';
      let anyVisible = false;
      document.querySelectorAll('#plansListArea .plan-list-item').forEach(item=>{
        const matchesQ = !q || (item.dataset.q||'').includes(q);
        const matchesStatus = statusFilter==='all' || item.dataset.status===statusFilter;
        const show = matchesQ && matchesStatus;
        item.style.display = show ? '' : 'none';
        if (show) anyVisible = true;
      });
      document.getElementById('dacListEmpty').style.display = anyVisible ? 'none' : '';
    }
    document.getElementById('dacListSearch').addEventListener('input', filterDacPlansList);
    document.querySelectorAll('.dacListFilterBtn').forEach(btn=>{
      btn.onclick = () => {
        document.querySelectorAll('.dacListFilterBtn').forEach(b=>b.classList.remove('btn-active'));
        btn.classList.add('btn-active');
        filterDacPlansList();
      };
    });
  }
}

/* ================== ملخص المحفظة (كل الأسهم مجمّعة) ================== */
/* ================== ملخص المحفظة (كل الأسهم مجمّعة) ================== */

/* رسم شارت خطي بسيط (Canvas) لنسبة الربح التراكمية عبر الوقت - يرجع Data URL صورة PNG */
function renderCumulativeProfitChart(points, title){
  const canvas = document.createElement('canvas');
  canvas.width = 760; canvas.height = 300;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);

  const padL=55, padR=20, padT=30, padB=40;
  const w = canvas.width-padL-padR, h = canvas.height-padT-padB;

  ctx.fillStyle = '#14532d'; ctx.font = 'bold 14px Tahoma';
  ctx.fillText(title || 'الربح التراكمي', padL, 20);

  if (!points || points.length===0) {
    ctx.fillStyle = '#999'; ctx.font = '13px Tahoma';
    ctx.fillText('لا يوجد بيانات كافية لعرض الشارت في هذه الفترة', padL, padT+h/2);
    return canvas.toDataURL('image/png');
  }

  const values = points.map(p=>p.value);
  let minV = Math.min(0, ...values), maxV = Math.max(0, ...values);
  if (minV===maxV) { minV -= 1; maxV += 1; }
  const rangePad = (maxV-minV)*0.1 || 1;
  minV -= rangePad; maxV += rangePad;

  const xFor = i => padL + (points.length>1 ? (i/(points.length-1))*w : w/2);
  const yFor = v => padT + h - ((v-minV)/(maxV-minV))*h;

  // خط الصفر
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padL, yFor(0)); ctx.lineTo(padL+w, yFor(0)); ctx.stroke();
  ctx.fillStyle = '#888'; ctx.font = '10px Tahoma';
  ctx.fillText('0', 5, yFor(0)+3);
  ctx.fillText(maxV.toFixed(0), 5, padT+3);
  ctx.fillText(minV.toFixed(0), 5, padT+h);

  // المنحنى
  ctx.strokeStyle = '#1b8a5a'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  points.forEach((p,i)=>{ const x=xFor(i), y=yFor(p.value); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke();

  // نقاط
  ctx.fillStyle = '#14532d';
  points.forEach((p,i)=>{ const x=xFor(i), y=yFor(p.value); ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill(); });

  // تواريخ أول ونص وآخر نقطة
  ctx.fillStyle = '#666'; ctx.font = '10px Tahoma';
  if(points.length>0) ctx.fillText(points[0].label, padL-10, canvas.height-15);
  if(points.length>1) ctx.fillText(points[points.length-1].label, padL+w-40, canvas.height-15);
  if(points.length>2) ctx.fillText(points[Math.floor(points.length/2)].label, padL+w/2-20, canvas.height-15);

  return canvas.toDataURL('image/png');
}

/* يبني نقاط الشارت (نسبة ربح تراكمية %) من الصفقات المغلقة عبر كل الأسهم، مفلترة بفترة معينة */
/* يبني صفوف تفاصيل كل عمليات سهم معيّن (شراء/بيع/إغلاق صفقة) خلال فترة معينة - بترجع {rowsHtml, hasAny, periodProfit} */
function buildStockTransactionRows(p, from, to){
  const inRange = (dateStr) => (!from || !to) ? true : (dateStr && dateOnly(dateStr)>=from && dateOnly(dateStr)<=to);
  let rowsHtml = '', hasAny = false, periodProfit = 0;
  p.levels.forEach(lv=>{
    if(lv.executed && inRange(lv.execDate)){
      hasAny = true;
      rowsHtml += `<tr><td>${formatDateAr(lv.execDate)}</td><td>شراء</td><td>مستوى ${lv.level}</td><td>${lv.actualQty}</td><td>${fmt2(lv.actualPrice)}</td><td>-</td></tr>`;
    }
    (lv.sells||[]).forEach(s=>{
      if(inRange(s.date)){
        hasAny = true;
        rowsHtml += `<tr><td>${formatDateAr(s.date)}</td><td>بيع</td><td>مستوى ${lv.level}</td><td>${s.qty}</td><td>${fmt2(s.price)}</td><td>${fmt2(s.profit)}</td></tr>`;
      }
    });
  });
  (p.closedTrades||[]).forEach(ct=>{
    if(inRange(ct.closedDate)){
      hasAny = true;
      periodProfit += ct.profit;
      rowsHtml += `<tr style="font-weight:bold;background:#f0f4f2;"><td>${formatDateAr(ct.closedDate)}</td><td>إغلاق صفقة</td><td>-</td><td>${fmtQty(ct.totalQty)}</td><td>${fmt2(ct.avgEntry)} → ${fmt2(ct.avgExit)}</td><td>${fmt2(ct.profit)}</td></tr>`;
    }
  });
  return { rowsHtml, hasAny, periodProfit };
}

// نفس شكل buildStockTransactionRows بالظبط، بس لبيانات خطة شبكة (Grid) - الحالات المشتراة حاليًا + الدورات المكتملة (شراء+بيع)
function buildGridTransactionRows(g, from, to){
  const inRange = (dateStr) => (!from || !to) ? true : (dateStr && dateOnly(dateStr)>=from && dateOnly(dateStr)<=to);
  let rowsHtml = '', hasAny = false, periodProfit = 0;
  g.levels.forEach(lv=>{
    if(lv.status==='bought' && lv.executedDate && inRange(lv.executedDate)){
      hasAny = true;
      rowsHtml += `<tr><td>${formatDateAr(lv.executedDate)}</td><td>شراء (مفتوح)</td><td>${lv.plannedPrice}</td><td>${lv.executedQty}</td><td>${fmt2(lv.executedPrice)}</td><td>-</td></tr>`;
    }
  });
  (g.cycleHistory||[]).forEach(c=>{
    if(inRange(c.date)){
      hasAny = true;
      periodProfit += c.profit;
      rowsHtml += `<tr style="font-weight:bold;background:#f0f4f2;"><td>${formatDateAr(c.date)}</td><td>دورة مكتملة (شراء ثم بيع)</td><td>-</td><td>-</td><td>-</td><td>${fmt2(c.profit)}</td></tr>`;
    }
  });
  (g.manualExits||[]).forEach(m=>{
    if(inRange(m.date)){
      hasAny = true;
      rowsHtml += `<tr><td>${formatDateAr(m.date)}</td><td>بيع يدوي (خارج الاستراتيجية)</td><td>-</td><td>${m.qty}</td><td>${fmt2(m.price)}</td><td>-</td></tr>`;
    }
  });
  return { rowsHtml, hasAny, periodProfit };
}

function buildCumulativeProfitPoints(plans, from, to, onlySymbols, grids){
  const events = [];
  const symbolsToUse = onlySymbols || Object.keys(plans);
  symbolsToUse.forEach(sym=>{
    if(!plans[sym]) return;
    (plans[sym].closedTrades||[]).forEach(ct=>{
      if((!from || dateOnly(ct.closedDate)>=from) && (!to || dateOnly(ct.closedDate)<=to)){
        events.push({ date: ct.closedDate, profit: ct.profit });
      }
    });
  });
  if (grids) {
    const gridSymbolsToUse = onlySymbols || Object.keys(grids);
    gridSymbolsToUse.forEach(sym=>{
      if(!grids[sym]) return;
      (grids[sym].cycleHistory||[]).forEach(c=>{
        if((!from || dateOnly(c.date)>=from) && (!to || dateOnly(c.date)<=to)){
          events.push({ date: c.date, profit: c.profit });
        }
      });
    });
  }
  events.sort((a,b)=> a.date<b.date? -1 : a.date>b.date?1:0);

  let cumProfit=0;
  return events.map(e=>{
    cumProfit += e.profit;
    return { date: e.date, label: formatDateAr(e.date), value: cumProfit };
  });
}

// عام (مش مقصور على شاشة ملخص المحفظة) عشان أي شاشة تانية (زي "الأسهم والخطط") تقدر
// تستخدم بالظبط نفس حساب الإجماليات وحالة كل سهم (مفتوحة/مغلقة/جديدة) من غير ما تكرر
// نفس المنطق في نسخة تانية ممكن تختلف عنه بالغلط زي ما حصل قبل كده
const MARKET_TO_CURRENCY_MAP = { 'مصر':'جنيه مصري', 'السعودية':'ريال سعودي', 'الإمارات':'درهم إماراتي', 'قطر':'ريال قطري', 'الكويت':'دينار كويتي' };

function computeAggregates(plans, grids, allEntries, from, to, onlyKeys){
  let totalInvested = 0, totalCurrentValue = 0, totalUnrealized = 0, totalRealized = 0, totalOpenCost = 0, pricedLive = 0;
  // الإصدار 91: سعر السوق الحالي (لو متاح) قبل آخر سعر أدخلته يدويًا وقبل آخر سعر شراء
  const livePx = (sym, market) => { const m = window.__mkLivePx || {}; const v = m[String(sym).toUpperCase() + '|' + (market || 'مصر')]; return v > 0 ? v : null; };
  let totalClosedTradesCount = 0, totalClosedCapital = 0, totalClosedProfit = 0;
  let dropSum = 0, dropCount = 0;
  let earliestDate = null;
  const stockRows = [];
  const entriesToUse = onlyKeys ? allEntries.filter(e=>onlyKeys.includes(e.key)) : allEntries;

  entriesToUse.forEach(entry=>{
    if (entry.type === 'DCA') {
      const sym = entry.sym;
      const p = plans[sym];
      if(!p.closedTrades) p.closedTrades = [];
      const sim = simulatePlan(p);
      const isOpenPosition = sim.heldQty > 0;
      const live = livePx(sym, p.market);
      const lastPrice = live != null ? live : ((p.manualLastPrice>0) ? p.manualLastPrice : sim.lastBoughtPrice);
      if (isOpenPosition && live != null) pricedLive++;
      const currentValue = (isOpenPosition && lastPrice!=null) ? sim.heldQty*lastPrice : 0;
      const unrealized = (isOpenPosition && lastPrice!=null && sim.avgCostCurrent!=null) ? (lastPrice-sim.avgCostCurrent)*sim.heldQty : 0;
      const dropPercent = (isOpenPosition && lastPrice!=null && sim.avgCostCurrent>0) ? ((lastPrice-sim.avgCostCurrent)/sim.avgCostCurrent*100) : null;

      totalInvested += sim.totalBuyAmountSpent;
      if (isOpenPosition && sim.avgCostCurrent != null) totalOpenCost += sim.avgCostCurrent * sim.heldQty;   // تكلفة الكمية اللي لسه معاك
      totalCurrentValue += currentValue;
      totalUnrealized += unrealized;
      totalRealized += sim.totalRealizedProfit;
      if(dropPercent!=null){ dropSum += dropPercent; dropCount++; }
      if(p.startDate && (!earliestDate || p.startDate<earliestDate)) earliestDate = p.startDate;

      const closedInRange = (p.closedTrades||[]).filter(ct => (!from || dateOnly(ct.closedDate)>=from) && (!to || dateOnly(ct.closedDate)<=to));
      const closedAgg = closedInRange.reduce((acc,ct)=>({capital:acc.capital+ct.capitalUsed, profit:acc.profit+ct.profit}), {capital:0, profit:0});
      totalClosedTradesCount += closedInRange.length;
      totalClosedCapital += closedAgg.capital;
      totalClosedProfit += closedAgg.profit;

      stockRows.push({
        symbol: sym, planType: 'DCA', market: p.market||'', currency: p.currency||'',
        status: isOpenPosition ? 'مفتوحة' : (p.closedTrades.length ? 'مغلقة' : 'جديدة'),
        invested: sim.totalBuyAmountSpent, openCost: (isOpenPosition && sim.avgCostCurrent != null) ? sim.avgCostCurrent * sim.heldQty : 0, currentValue, dropPercent,
        unrealized, realized: sim.totalRealizedProfit,
        closedCount: closedInRange.length, closedProfit: closedAgg.profit
      });
    } else {
      // خطة شبكة (Grid)
      const sym = entry.sym;
      const g = grids[sym];
      if (!g.cycleHistory) g.cycleHistory = [];
      const boughtLevels = g.levels.filter(l=>l.status==='bought');
      const isOpenPosition = boughtLevels.length > 0;
      const invested = boughtLevels.reduce((s,l)=>s+(l.executedQty*l.executedPrice), 0);
      // الإصدار 91: سعر السوق الحالي لو متاح (قبل كده القيمة الحالية كانت = المستثمر)
      const heldQtyG = boughtLevels.reduce((s,l)=>s+(+l.executedQty||0), 0);
      const liveG = livePx(sym, g.market);
      const currentValue = (isOpenPosition && liveG != null) ? heldQtyG * liveG : invested;
      const unrealized = currentValue - invested;
      const dropPercent = (isOpenPosition && liveG != null && invested > 0) ? (unrealized / invested * 100) : null;
      if (isOpenPosition && liveG != null) pricedLive++;

      totalInvested += invested;
      totalOpenCost += invested;
      totalUnrealized += unrealized;
      totalCurrentValue += currentValue;
      if(g.createdAt){ const d = g.createdAt.split('T')[0]; if(!earliestDate || d<earliestDate) earliestDate = d; }

      const closedInRange = (g.cycleHistory||[]).filter(c => (!from || dateOnly(c.date)>=from) && (!to || dateOnly(c.date)<=to));
      const closedProfitSum = closedInRange.reduce((s,c)=>s+c.profit, 0);
      totalClosedTradesCount += closedInRange.length;
      totalClosedProfit += closedProfitSum;

      stockRows.push({
        symbol: sym, planType: 'Grid', market: g.market||'', currency: MARKET_TO_CURRENCY_MAP[g.market]||'',
        status: isOpenPosition ? 'مفتوحة' : (g.cycleHistory.length ? 'مغلقة' : 'جديدة'),
        invested, openCost: invested, currentValue, dropPercent,
        unrealized, realized: 0,
        closedCount: closedInRange.length, closedProfit: closedProfitSum
      });
    }
  });

  const grandTotalProfit = totalUnrealized + totalRealized + totalClosedProfit;
  const grandTotalInvestedEver = totalInvested + totalClosedCapital;
  const overallProfitPercent = grandTotalInvestedEver>0 ? (grandTotalProfit/grandTotalInvestedEver*100) : 0;
  const avgDropRate = dropCount>0 ? (dropSum/dropCount) : null;
  const totalOpenPositionsCount = stockRows.filter(r=>r.status==='مفتوحة').length;

  return { totalOpenCost, pricedLive, totalInvested, totalCurrentValue, totalUnrealized, totalRealized, totalClosedTradesCount,
    totalClosedCapital, totalClosedProfit, avgDropRate, stockRows, grandTotalProfit,
    grandTotalInvestedEver, overallProfitPercent, earliestDate, totalOpenPositionsCount };
}

async function renderPortfolio(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderPortfolio());
  setBottomNavActive('portfolio');
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;
  const plans = await getPlans(email);
  const symbols = Object.keys(plans);
  const grids = await getGridPlans(email);
  const gridSymbols = Object.keys(grids);
  if (typeof mkEnsureLivePrices === 'function') {   // الإصدار 91: القيم بسعر السوق (والشاشة بتتحدّث لو الأسعار وصلت متأخر)
    try { await mkEnsureLivePrices(plans, grids); } catch(e){}
    if (window.__mkLivePxPending) window.__mkLivePxPending.then(changed => {
      if (changed && !screenStale(__tok)) { window.__navSilent = true; try { renderPortfolio(); } finally { window.__navSilent = false; } }
    });
  }
  // كل الأسهم (DCA + Grid) بمفتاح مركّب "الرمز::النوع" عشان نضمن التفرقة حتى لو نفس الرمز كان في النوعين في أوقات مختلفة
  let allEntries = [...symbols.map(s=>({key:`${s}::DCA`, sym:s, type:'DCA'})), ...gridSymbols.map(s=>({key:`${s}::Grid`, sym:s, type:'Grid'}))];

  // المحفظة بتتعرض بعملة واحدة في المرة - غير ممكن نجمع جنيه على ريال في إجمالي واحد
  const ccyOf = (e) => e.type==='DCA' ? (plans[e.sym].currency || MARKET_TO_CURRENCY_MAP[plans[e.sym].market] || '—') : (MARKET_TO_CURRENCY_MAP[grids[e.sym].market] || '—');
  const ccyList = [...new Set(allEntries.map(ccyOf))].sort((a,b)=>allEntries.filter(e=>ccyOf(e)===b).length - allEntries.filter(e=>ccyOf(e)===a).length);
  let selCcy = ''; try { selCcy = localStorage.getItem('gs_ccy') || ''; } catch(e){}
  if (!ccyList.includes(selCcy)) selCcy = ccyList[0] || '';
  if (ccyList.length > 1) allEntries = allEntries.filter(e => ccyOf(e) === selCcy);
  const ccyChipsHtml = ccyList.length > 1 ? `<div class="gs-seg" style="margin-bottom:16px;">${ccyList.map(c=>`<button type="button" class="${c===selCcy?'on':''}" data-ccy="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div>` : '';

  let agg = computeAggregates(plans, grids, allEntries, null, null);

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('portfolio','📊 ملخص المحفظة')}</div>
      <div><button class="secondary small" id="goDiversificationBtn">🎯 تقرير التنويع</button> <button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button></div>
    </div>

    ${ccyChipsHtml}
    <h2>إجماليات المحفظة${ccyList.length > 1 ? ` <span style="font-size:13px;color:var(--text-muted);font-weight:600;">(${escapeHtml(selCcy)})</span>` : ''}</h2>
    <div class="summary-cards" id="topSummaryCards"></div>

    <h2 class="u-mt20">كل الأسهم (مفتوحة ومغلقة)</h2>
    <div class="section-card" id="portfolioTableWrap"></div>
    ${allEntries.length ? `<div class="topbar u-mt10">
      <button class="small secondary" id="exportPortfolioXlsBtn">⬇ تصدير Excel</button>
      <button class="small secondary" id="exportPortfolioPdfBtn">🖨 تصدير PDF (طباعة)</button>
    </div>` : ''}

    <h2 class="u-mt24">فترة العرض (تؤثر على المؤشرات والشارت وكشف الحساب)</h2>
    <div class="section-card">
      <div class="grid2">
        <div><label>من تاريخ</label><input type="date" id="stmtFrom"></div>
        <div><label>إلى تاريخ</label><input type="date" id="stmtTo"></div>
      </div>
      <div class="radio-row std-filter-tabs">
        <button class="small secondary period-preset std-filter-tab" id="presetDaily">اليوم</button>
        <button class="small secondary period-preset std-filter-tab" id="presetWeekly">آخر أسبوع</button>
        <button class="small secondary period-preset std-filter-tab" id="presetMonthly">آخر شهر</button>
        <button class="small secondary period-preset std-filter-tab btn-active" id="presetAll">كل الفترة</button>
      </div>
      <button id="printStatementBtn" class="secondary">🖨 طباعة كشف الحساب للفترة</button>
      <button id="exportStatementXlsBtn" class="secondary">⬇ تصدير كشف الحساب Excel</button>
    </div>

    <div class="section-card" id="periodIndicators"></div>

    <h2 class="u-mt20">منحنى الربح التراكمي (بالمبلغ)</h2>
    <div class="section-card u-tc">
      <img id="profitChartImg" style="max-width:100%;border-radius:8px;">
    </div>

    <h2 class="u-mt24">تقرير سهم أو أكتر</h2>
    <div class="section-card">
      <label>اختر الأسهم للتقرير</label>
      <div class="ms-dropdown" id="msDropdown">
        <button type="button" class="ms-toggle" id="msToggleBtn">اختر الأسهم ▾</button>
        <div class="ms-panel" id="msPanel" style="display:none;">
          <div class="std-filter-search u-mb8"><input type="text" id="reportSymSearchInput" placeholder="ابحث باسم السهم..."></div>
          <div class="std-filter-tabs u-mb8">
            <button type="button" class="small secondary reportStatusFilterBtn std-filter-tab btn-active" data-status="all">الكل</button>
            <button type="button" class="small secondary reportStatusFilterBtn std-filter-tab" data-status="مفتوحة">مفتوحة فقط</button>
            <button type="button" class="small secondary reportStatusFilterBtn std-filter-tab" data-status="مغلقة">مغلقة فقط</button>
          </div>
          <label class="ms-item ms-all"><input type="checkbox" id="reportSelectAll"> تحديد كل الأسهم</label>
          <div class="ms-sep"></div>
          <div id="reportSymbolChecks">
            ${allEntries.map(en=>{
              const row = agg.stockRows.find(r=>r.symbol===en.sym && r.planType===en.type);
              const st = row ? row.status : '';
              return `<label class="ms-item" data-sym="${en.sym.toLowerCase()}" data-status="${st}"><input type="checkbox" class="reportSymCheck" value="${en.key}"> ${en.sym} (${en.type}) <span style="color:#888;font-size:11px;">${st}</span></label>`;
            }).join('')}
          </div>
          <div id="reportSymNoMatch" style="display:none;font-size:12px;color:#888;padding:8px;text-align:center;">لا توجد أسهم مطابقة</div>
          <button type="button" class="small" id="msDoneBtn" style="width:100%;margin-top:8px;">تم</button>
        </div>
      </div>
      <button id="printStockReportBtn" class="u-mt14">🖨 إصدار تقرير PDF للأسهم المحددة</button>
      <button id="exportStockReportXlsBtn" class="secondary">⬇ تصدير التقرير Excel</button>
      <div style="font-size:11.5px;color:#888;margin-top:6px;">يمكنك اختيار سهم واحد أو أكثر أو كل الأسهم — سيستخدم التقرير الفترة نفسها (من - إلى) المحددة أعلاه.</div>
    </div>

    <p class="disclaimer">تنويه: الأرقام هنا مبنية على بيانات كل الأسهم المسجّلة في حسابك ولا تُعد توصية استثمارية مضمونة.</p>
  </div>`;

  document.getElementById('reportSymSearchInput').addEventListener('input', filterReportSymList);
  document.querySelectorAll('.reportStatusFilterBtn').forEach(btn=>{
    btn.onclick = () => {
      document.querySelectorAll('.reportStatusFilterBtn').forEach(b=>b.classList.remove('btn-active'));
      btn.classList.add('btn-active');
      filterReportSymList();
    };
  });
  function filterReportSymList(){
    const q = document.getElementById('reportSymSearchInput').value.trim().toLowerCase();
    const statusFilter = document.querySelector('.reportStatusFilterBtn.btn-active').dataset.status;
    let anyVisible = false;
    document.querySelectorAll('#reportSymbolChecks .ms-item').forEach(item=>{
      const matchesSym = !q || item.dataset.sym.includes(q);
      const matchesStatus = statusFilter === 'all' || item.dataset.status === statusFilter;
      const show = matchesSym && matchesStatus;
      item.style.display = show ? '' : 'none';
      if (show) anyVisible = true;
    });
    document.getElementById('reportSymNoMatch').style.display = anyVisible ? 'none' : 'block';
  }

  document.getElementById('homeBtn').onclick=()=>renderHome();
  document.getElementById('goDiversificationBtn').onclick=()=>renderDiversificationReport();
  app.querySelectorAll('[data-ccy]').forEach(b => b.onclick = () => {
    try { localStorage.setItem('gs_ccy', b.dataset.ccy); } catch(e){}
    window.__navSilent = true; try { renderPortfolio(); } finally { window.__navSilent = false; }
  });

  function renderTopSummary(a){
    document.getElementById('topSummaryCards').innerHTML = `
      <div class="summary-card"><div class="val">${fmtMoney(a.totalOpenCost)}</div><div class="lbl">تكلفة المراكز المفتوحة (الأسهم التي معك الآن)</div></div>
      <div class="summary-card"><div class="val">${fmtMoney(a.totalCurrentValue)}</div><div class="lbl">قيمة المحفظة الحالية${a.pricedLive ? ' (بسعر السوق)' : ''}</div></div>
      <div class="summary-card"><div class="val ${a.avgDropRate==null?'':(a.avgDropRate<0?'neg':'pos')}">${a.avgDropRate!=null?a.avgDropRate.toFixed(2)+'%':'-'}</div><div class="lbl">معدل الانخفاض (متوسط المراكز المفتوحة)</div></div>
      <div class="summary-card">
        <div style="display:flex;align-items:stretch;justify-content:space-around;">
          <div style="flex:1;text-align:center;"><div class="val">${a.totalOpenPositionsCount}</div><div class="lbl">صفقات مفتوحة</div></div>
          <div style="width:1px;background:var(--border);margin:2px 10px;"></div>
          <div style="flex:1;text-align:center;"><div class="val">${a.totalClosedTradesCount}</div><div class="lbl">صفقات مغلقة</div></div>
        </div>
      </div>
      <div class="summary-card"><div class="val ${a.grandTotalProfit>=0?'pos':'neg'}">${fmtMoney(a.grandTotalProfit)}</div><div class="lbl">إجمالي الربح (محقق + غير محقق)</div></div>
      <div class="summary-card"><div class="val ${a.overallProfitPercent>=0?'pos':'neg'}">${a.overallProfitPercent.toFixed(2)}%</div><div class="lbl">نسبة الربح/الخسارة الإجمالية</div></div>`;
  }

  function renderTable(a){
    const r = a.stockRows;
    document.getElementById('portfolioTableWrap').innerHTML = r.length ? `<table id="portfolioTable">
      <thead><tr>
        <th>السهم</th><th>النوع</th><th>الحالة</th><th>تكلفة المراكز المفتوحة</th><th>القيمة الحالية</th>
        <th>نسبة الانخفاض</th><th>ربح غير محقق</th><th>ربح محقق (مراكز مفتوحة)</th>
        <th>عدد صفقات مغلقة</th><th>ربح الصفقات المغلقة</th>
      </tr></thead>
      <tbody>
        ${r.map(x=>`<tr>
          <td>${gPlanLink(x.symbol, x.planType)}</td><td class="u-nowrap"><span class="tag ${x.planType==='DCA'?'tag-done':'tag-next'}">${x.planType}</span> ${gPlanStatusBadge(x.status)}</td><td>${gPlanStatusBadge(x.status)}</td>
          <td>${fmtMoney(x.openCost)}</td><td>${x.currentValue?fmtMoney(x.currentValue):'-'}</td>
          <td class="${x.dropPercent==null?'':(x.dropPercent<0?'neg':'pos')}">${x.dropPercent!=null?x.dropPercent.toFixed(2)+'%':'-'}</td>
          <td class="${x.unrealized<0?'neg':x.unrealized>0?'pos':''}">${fmtMoney(x.unrealized)}</td>
          <td class="${x.realized<0?'neg':x.realized>0?'pos':''}">${fmtMoney(x.realized)}</td>
          <td>${x.closedCount}</td>
          <td class="${x.closedProfit<0?'neg':x.closedProfit>0?'pos':''}">${fmtMoney(x.closedProfit)}</td>
        </tr>`).join('')}
        <tr style="font-weight:bold;background:#f0f4f2;">
          <td>الإجمالي</td><td></td><td></td>
          <td>${fmtMoney(a.totalOpenCost)}</td><td>${fmtMoney(a.totalCurrentValue)}</td>
          <td class="${a.avgDropRate==null?'':(a.avgDropRate<0?'neg':'pos')}">${a.avgDropRate!=null?a.avgDropRate.toFixed(2)+'%':'-'}</td>
          <td class="${a.totalUnrealized<0?'neg':'pos'}">${fmtMoney(a.totalUnrealized)}</td>
          <td class="${a.totalRealized<0?'neg':'pos'}">${fmtMoney(a.totalRealized)}</td>
          <td>${a.totalClosedTradesCount}</td>
          <td class="${a.totalClosedProfit<0?'neg':'pos'}">${fmtMoney(a.totalClosedProfit)}</td>
        </tr>
      </tbody>
    </table>` : '<p class="u-note">لا يوجد أسهم مضافة بعد.</p>';
  }

  function renderIndicators(a, from, to){
    const periodLabel = (from && to) ? `${formatDateAr(from)} إلى ${formatDateAr(to)}` : (a.earliestDate ? `${formatDateAr(a.earliestDate)} إلى اليوم` : 'كل الفترة المتاحة');
    document.getElementById('periodIndicators').innerHTML = `
      <div class="summary-cards">
        <div class="summary-card"><div class="val">${fmtMoney(a.grandTotalInvestedEver)}</div><div class="lbl">كم استثمرت</div></div>
        <div class="summary-card"><div class="val ${a.grandTotalProfit>=0?'pos':'neg'}">${fmtMoney(a.grandTotalProfit)}</div><div class="lbl">كم ربحت أو خسرت</div></div>
        <div class="summary-card"><div class="val ${a.overallProfitPercent>=0?'pos':'neg'}">${a.overallProfitPercent.toFixed(2)}%</div><div class="lbl">نسبة الربح/الخسارة على المبلغ المستثمر</div></div>
        <div class="summary-card"><div class="val u-fs13">${periodLabel}</div><div class="lbl">فترة الاستثمار / نسبة الربح خلال الفترة: ${a.overallProfitPercent.toFixed(2)}%</div></div>
      </div>`;
  }

  function refreshAll(from, to){
    agg = computeAggregates(plans, grids, allEntries, from, to);
    renderTopSummary(agg);
    renderTable(agg);
    renderIndicators(agg, from, to);
    const points = buildCumulativeProfitPoints(plans, from, to, null, grids);
    document.getElementById('profitChartImg').src = renderCumulativeProfitChart(points, 'الربح التراكمي ' + (from&&to?`(${formatDateAr(from)} - ${formatDateAr(to)})`:'(كل الفترة)'));
  }

  function isoDaysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0]; }
  function computeEarliestDate(){
    // بناخد أقدم تاريخ من: تاريخ بداية أي خطة حالية (مفتوحة)، أو تاريخ أي صفقة اتقفلت قبل كده (DCA أو Grid) -
    // مش بس تاريخ بداية الدورة الحالية، عشان "كل الفترة" تشمل فعلًا كل تاريخ الحساب مش بس آخر دورة مفتوحة
    let earliest = null;
    const consider = (d) => { const dd = dateOnly(d); if(dd && (!earliest || dd<earliest)) earliest = dd; };
    symbols.forEach(sym=>{
      consider(plans[sym].startDate);
      (plans[sym].closedTrades||[]).forEach(ct=>consider(ct.closedDate));
    });
    gridSymbols.forEach(sym=>{
      consider(grids[sym].createdAt);
      (grids[sym].cycleHistory||[]).forEach(c=>consider(c.date));
    });
    return earliest || isoDaysAgo(0);
  }
  function setActivePreset(btn){
    document.querySelectorAll('.period-preset').forEach(b=>b.classList.remove('btn-active'));
    if(btn) btn.classList.add('btn-active');
  }
  function applyPreset(fromVal, toVal, btn){
    document.getElementById('stmtFrom').value = fromVal;
    document.getElementById('stmtTo').value = toVal;
    setActivePreset(btn);
    refreshAll(fromVal||null, toVal||null);
  }

  // أول ما تفتح الصفحة: املأ الفترة بداية من تاريخ أول سهم في المحفظة حتى النهاردة تلقائيًا
  document.getElementById('stmtFrom').value = computeEarliestDate();
  document.getElementById('stmtTo').value = isoDaysAgo(0);
  refreshAll(document.getElementById('stmtFrom').value, document.getElementById('stmtTo').value);

  document.getElementById('presetDaily').onclick=()=>applyPreset(isoDaysAgo(0), isoDaysAgo(0), document.getElementById('presetDaily'));
  document.getElementById('presetWeekly').onclick=()=>applyPreset(isoDaysAgo(7), isoDaysAgo(0), document.getElementById('presetWeekly'));
  document.getElementById('presetMonthly').onclick=()=>applyPreset(isoDaysAgo(30), isoDaysAgo(0), document.getElementById('presetMonthly'));
  document.getElementById('presetAll').onclick=()=>applyPreset(computeEarliestDate(), isoDaysAgo(0), document.getElementById('presetAll'));

  ['stmtFrom','stmtTo'].forEach(id=>{
    document.getElementById(id).addEventListener('change', ()=>{
      setActivePreset(null); // فترة مخصصة - لا يوجد زرار جاهز متطابق
      const from = document.getElementById('stmtFrom').value || null;
      const to = document.getElementById('stmtTo').value || null;
      refreshAll(from, to);
    });
  });

  if(symbols.length){
    document.getElementById('exportPortfolioXlsBtn').onclick = () => {
      const th = "background:#14532D;color:#ffffff;font-weight:bold;border:1px solid #000000;padding:6px 10px;text-align:center;";
      const td = "border:1px solid #999999;padding:5px 10px;text-align:center;";
      const totalTd = "border:1px solid #000000;padding:6px 10px;text-align:center;font-weight:bold;background:#E6F4EA;";
      const titleTd = "background:#14532D;color:#ffffff;font-weight:bold;font-size:16px;padding:10px;text-align:center;";
      const numFmt = "mso-number-format:'#,##0.00';";
      const chartImg = document.getElementById('profitChartImg').src;
      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8">
      <xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>المحفظة</x:Name><x:WorksheetOptions><x:RTL/><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
      </head><body dir="rtl">
      <table style="border-collapse:collapse;font-family:IBM Plex Sans Arabic,Tahoma,Arial;direction:rtl;" dir="rtl">
        <tr><td colspan="10" style="${titleTd}">GRIFFINE — ملخص المحفظة</td></tr>
        <tr><td colspan="10" style="border:none;padding:6px;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</td></tr>
        <tr><td colspan="10" class="u-bn"></td></tr>
        <tr>
          <td style="${th}">السهم</td><td style="${th}">النوع</td><td style="${th}">الحالة</td><td style="${th}">تكلفة المراكز المفتوحة</td><td style="${th}">القيمة الحالية</td>
          <td style="${th}">نسبة الانخفاض</td><td style="${th}">ربح غير محقق</td><td style="${th}">ربح محقق</td>
          <td style="${th}">صفقات مغلقة</td><td style="${th}">ربح الصفقات المغلقة</td>
        </tr>
        ${agg.stockRows.map(r=>`<tr>
          <td style="${td}">${escapeHtml(r.symbol)}</td><td style="${td}">${r.planType}</td><td style="${td}">${r.status}</td>
          <td style="${td}${numFmt}">${r.openCost.toFixed(2)}</td><td style="${td}${numFmt}">${r.currentValue.toFixed(2)}</td>
          <td style="${td}">${r.dropPercent!=null?r.dropPercent.toFixed(2)+'%':'-'}</td>
          <td style="${td}${numFmt}">${r.unrealized.toFixed(2)}</td><td style="${td}${numFmt}">${r.realized.toFixed(2)}</td>
          <td style="${td}">${r.closedCount}</td><td style="${td}${numFmt}">${r.closedProfit.toFixed(2)}</td>
        </tr>`).join('')}
        <tr>
          <td style="${totalTd}">الإجمالي</td><td style="${totalTd}"></td><td style="${totalTd}"></td>
          <td style="${totalTd}${numFmt}">${agg.totalOpenCost.toFixed(2)}</td><td style="${totalTd}${numFmt}">${agg.totalCurrentValue.toFixed(2)}</td>
          <td style="${totalTd}">${agg.avgDropRate!=null?agg.avgDropRate.toFixed(2)+'%':'-'}</td>
          <td style="${totalTd}${numFmt}">${agg.totalUnrealized.toFixed(2)}</td><td style="${totalTd}${numFmt}">${agg.totalRealized.toFixed(2)}</td>
          <td style="${totalTd}">${agg.totalClosedTradesCount}</td><td style="${totalTd}${numFmt}">${agg.totalClosedProfit.toFixed(2)}</td>
        </tr>
        <tr><td colspan="10" style="border:none;padding:10px;text-align:center;"><img src="chart.png" width="600" height="237"></td></tr>
      </table>
      </body></html>`;
      buildAndDownloadMhtmlXls(html, chartImg, `griffine_ملخص_المحفظة.xls`);
    };

    document.getElementById('exportPortfolioPdfBtn').onclick = () => {
      const chartImg = document.getElementById('profitChartImg').src;
      const w = window.open('', '_blank');
      const rowsHtml = agg.stockRows.map(r=>`<tr>
        <td>${escapeHtml(r.symbol)}</td><td>${r.planType}</td><td>${r.status}</td><td>${fmt2(r.openCost)}</td><td>${fmt2(r.currentValue)}</td>
        <td>${r.dropPercent!=null?r.dropPercent.toFixed(2)+'%':'-'}</td><td>${fmt2(r.unrealized)}</td>
        <td>${fmt2(r.realized)}</td><td>${r.closedCount}</td><td>${fmt2(r.closedProfit)}</td>
      </tr>`).join('');
      w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>ملخص المحفظة</title>
        <style>body{font-family:IBM Plex Sans Arabic,Tahoma,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin-top:14px;}
        th,td{border:1px solid #ccc;padding:7px;text-align:center;font-size:12px;} th{background:#14532d;color:#fff;}
        h1{color:#14532d;} .agg{margin-top:16px;font-size:14px;background:#f0f4f2;padding:10px;border-radius:8px;}
        img{max-width:100%;margin-top:16px;}</style></head>
        <body>
        ${reportLogoHeaderHtml()}
        <h1>GRIFFINE — ملخص المحفظة</h1>
        <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
        <table><thead><tr><th>السهم</th><th>النوع</th><th>الحالة</th><th>تكلفة المراكز المفتوحة</th><th>القيمة الحالية</th><th>الانخفاض</th><th>ربح غير محقق</th><th>ربح محقق</th><th>صفقات مغلقة</th><th>ربح الصفقات المغلقة</th></tr></thead>
        <tbody>${rowsHtml}</tbody></table>
        <div class="agg"><strong>الإجمالي:</strong> تكلفة المراكز المفتوحة: ${fmt2(agg.totalOpenCost)} | قيمة حالية: ${fmt2(agg.totalCurrentValue)} |
        ربح إجمالي: ${fmt2(agg.grandTotalProfit)} (${agg.overallProfitPercent.toFixed(2)}%)</div>
        <img src="${chartImg}">
        
        </body></html>`);
      w.document.close(); gReportReady(w);
    };
  }

  function buildStatementSections(from, to){
    let sections = '', periodTotalProfit = 0;
    symbols.forEach(sym=>{
      const p = plans[sym];
      const { rowsHtml, hasAny, periodProfit } = buildStockTransactionRows(p, from, to);
      periodTotalProfit += periodProfit;
      if(hasAny){
        sections += `<h3 style="color:#14532d;margin-top:20px;">${sym} (DCA — ${p.market||''} - ${p.currency||''})</h3>
        <table><thead><tr><th>التاريخ</th><th>العملية</th><th>المستوى</th><th>الكمية</th><th>السعر</th><th>الربح</th></tr></thead>
        <tbody>${rowsHtml}</tbody></table>`;
      }
    });
    gridSymbols.forEach(sym=>{
      const g = grids[sym];
      const { rowsHtml, hasAny, periodProfit } = buildGridTransactionRows(g, from, to);
      periodTotalProfit += periodProfit;
      if(hasAny){
        sections += `<h3 style="color:#14532d;margin-top:20px;">${sym} (Grid — ${g.market||''})</h3>
        <table><thead><tr><th>التاريخ</th><th>العملية</th><th>المستوى</th><th>الكمية</th><th>السعر</th><th>الربح</th></tr></thead>
        <tbody>${rowsHtml}</tbody></table>`;
      }
    });
    return { sections, periodTotalProfit };
  }

  document.getElementById('printStatementBtn').onclick = () => {
    const from = document.getElementById('stmtFrom').value;
    const to = document.getElementById('stmtTo').value;
    if(!from || !to){ alert('اختار الفترة من وإلى الأول'); return; }
    const { sections, periodTotalProfit } = buildStatementSections(from, to);
    const stAgg = computeAggregates(plans, grids, allEntries, from, to);
    const stPoints = buildCumulativeProfitPoints(plans, from, to, null, grids);
    const stChartImg = renderCumulativeProfitChart(stPoints, 'الربح التراكمي — كل المحفظة');
    const periodLabel = `${formatDateAr(from)} إلى ${formatDateAr(to)}`;

    const rowsHtml = stAgg.stockRows.map(r=>`<tr>
      <td>${escapeHtml(r.symbol)}</td><td>${r.planType}</td><td>${r.status}</td>
      <td>${fmt2(r.openCost)}</td><td>${r.currentValue?fmt2(r.currentValue):'-'}</td>
      <td>${r.dropPercent!=null?r.dropPercent.toFixed(2)+'%':'-'}</td>
      <td>${fmt2(r.unrealized)}</td><td>${fmt2(r.realized)}</td>
      <td>${r.closedCount}</td><td>${fmt2(r.closedProfit)}</td>
    </tr>`).join('');

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>كشف حساب المحفظة</title>
      <style>body{font-family:IBM Plex Sans Arabic,Tahoma,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin-top:8px;}
      th,td{border:1px solid #ccc;padding:6px;text-align:center;font-size:12px;} th{background:#14532d;color:#fff;}
      h1{color:#14532d;} h2{color:#14532d;} .agg{margin-top:20px;font-size:15px;background:#f0f4f2;padding:12px;border-radius:8px;}
      .indicators{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;}
      .indicators div{flex:1;min-width:150px;background:#f8faf9;border:1px solid #e7ebe9;border-radius:8px;padding:10px;text-align:center;}
      .indicators .v{font-size:16px;font-weight:bold;color:#14532d;} .indicators .l{font-size:11px;color:#888;margin-top:3px;}
      img{max-width:100%;margin-top:16px;}</style></head>
      <body>
      ${reportLogoHeaderHtml()}
      <h1>GRIFFINE — كشف حساب شامل للمحفظة</h1>
      <p>الفترة من ${periodLabel} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>

      <div class="indicators">
        <div><div class="v">${fmt2(stAgg.grandTotalInvestedEver)}</div><div class="l">إجمالي المستثمر (كل المحفظة)</div></div>
        <div><div class="v">${fmt2(stAgg.grandTotalProfit)}</div><div class="l">إجمالي الربح/الخسارة</div></div>
        <div><div class="v">${stAgg.overallProfitPercent.toFixed(2)}%</div><div class="l">نسبة الربح/الخسارة الإجمالية</div></div>
        <div><div class="v u-fs12">${periodLabel}</div><div class="l">فترة الكشف</div></div>
      </div>

      <img src="${stChartImg}" width="720" height="300">

      <h2 class="u-mt20">إجماليات كل الأسهم</h2>
      <table><thead><tr>
        <th>السهم</th><th>النوع</th><th>الحالة</th><th>تكلفة المراكز المفتوحة</th><th>القيمة الحالية</th><th>الانخفاض</th>
        <th>ربح غير محقق</th><th>ربح محقق</th><th>صفقات مغلقة</th><th>ربح الصفقات المغلقة</th>
      </tr></thead><tbody>
        ${rowsHtml}
        <tr style="font-weight:bold;background:#eef6f2;">
          <td>الإجمالي</td><td></td><td></td>
          <td>${fmt2(stAgg.totalOpenCost)}</td><td>${fmt2(stAgg.totalCurrentValue)}</td>
          <td>${stAgg.avgDropRate!=null?stAgg.avgDropRate.toFixed(2)+'%':'-'}</td>
          <td>${fmt2(stAgg.totalUnrealized)}</td><td>${fmt2(stAgg.totalRealized)}</td>
          <td>${stAgg.totalClosedTradesCount}</td><td>${fmt2(stAgg.totalClosedProfit)}</td>
        </tr>
      </tbody></table>

      <h2 style="margin-top:26px;">تفاصيل كل عمليات كل سهم</h2>
      ${sections || '<p>لا يوجد أي عمليات في هذه الفترة.</p>'}
      <div class="agg"><strong>إجمالي أرباح الصفقات المغلقة خلال الفترة:</strong> ${fmt2(periodTotalProfit)}</div>
      
      </body></html>`);
    w.document.close(); gReportReady(w);
  };

  document.getElementById('exportStatementXlsBtn').onclick = () => {
    const from = document.getElementById('stmtFrom').value;
    const to = document.getElementById('stmtTo').value;
    if(!from || !to){ alert('اختار الفترة من وإلى الأول'); return; }
    const th = "background:#14532D;color:#ffffff;font-weight:bold;border:1px solid #000000;padding:6px 10px;text-align:center;";
    const td = "border:1px solid #999999;padding:5px 10px;text-align:center;";
    const totalTd = "border:1px solid #000000;padding:6px 10px;text-align:center;font-weight:bold;background:#E6F4EA;";
    const titleTd = "background:#14532D;color:#ffffff;font-weight:bold;font-size:16px;padding:10px;text-align:center;";
    const sectionTd = "background:#eef6f2;color:#14532d;font-weight:bold;padding:8px;text-align:right;";

    const stAgg = computeAggregates(plans, grids, allEntries, from, to);
    const stPoints = buildCumulativeProfitPoints(plans, from, to, null, grids);
    const stChartImg = renderCumulativeProfitChart(stPoints, 'الربح التراكمي — كل المحفظة');
    const periodLabel = `${formatDateAr(from)} إلى ${formatDateAr(to)}`;

    const aggRowsHtml = stAgg.stockRows.map(r=>`<tr>
      <td style="${td}">${escapeHtml(r.symbol)}</td><td style="${td}">${r.planType}</td><td style="${td}">${r.status}</td>
      <td style="${td}">${r.openCost.toFixed(2)}</td><td style="${td}">${r.currentValue.toFixed(2)}</td>
      <td style="${td}">${r.dropPercent!=null?r.dropPercent.toFixed(2)+'%':'-'}</td>
      <td style="${td}">${r.unrealized.toFixed(2)}</td><td style="${td}">${r.realized.toFixed(2)}</td>
      <td style="${td}">${r.closedCount}</td><td style="${td}">${r.closedProfit.toFixed(2)}</td>
    </tr>`).join('');

    let body = `<table style="border-collapse:collapse;font-family:IBM Plex Sans Arabic,Tahoma,Arial;direction:rtl;" dir="rtl">
      <tr><td colspan="10" style="${titleTd}">GRIFFINE — كشف حساب شامل للمحفظة</td></tr>
      <tr><td colspan="10" style="border:none;padding:6px;">الفترة من ${periodLabel} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</td></tr>
      <tr><td colspan="10" class="u-bn"></td></tr>
      <tr>
        <td style="${th}">السهم</td><td style="${th}">النوع</td><td style="${th}">الحالة</td><td style="${th}">تكلفة المراكز المفتوحة</td><td style="${th}">القيمة الحالية</td>
        <td style="${th}">نسبة الانخفاض</td><td style="${th}">ربح غير محقق</td><td style="${th}">ربح محقق</td>
        <td style="${th}">صفقات مغلقة</td><td style="${th}">ربح الصفقات المغلقة</td>
      </tr>
      ${aggRowsHtml}
      <tr>
        <td style="${totalTd}">الإجمالي</td><td style="${totalTd}"></td><td style="${totalTd}"></td>
        <td style="${totalTd}">${stAgg.totalOpenCost.toFixed(2)}</td><td style="${totalTd}">${stAgg.totalCurrentValue.toFixed(2)}</td>
        <td style="${totalTd}">${stAgg.avgDropRate!=null?stAgg.avgDropRate.toFixed(2)+'%':'-'}</td>
        <td style="${totalTd}">${stAgg.totalUnrealized.toFixed(2)}</td><td style="${totalTd}">${stAgg.totalRealized.toFixed(2)}</td>
        <td style="${totalTd}">${stAgg.totalClosedTradesCount}</td><td style="${totalTd}">${stAgg.totalClosedProfit.toFixed(2)}</td>
      </tr>
      <tr><td colspan="10" style="border:none;padding:10px;text-align:center;"><img src="chart.png" width="600" height="237"></td></tr>
      <tr><td colspan="10" class="u-bn"></td></tr>`;

    let periodTotalProfit = 0;
    symbols.forEach(sym=>{
      const p = plans[sym];
      const { rowsHtml, hasAny, periodProfit } = buildStockTransactionRows(p, from, to);
      periodTotalProfit += periodProfit;
      if(hasAny){
        body += `<tr><td colspan="10" style="${sectionTd}">تفاصيل عمليات: ${sym} (DCA — ${p.market||''} - ${p.currency||''})</td></tr>
          <tr><td style="${th}">التاريخ</td><td style="${th}">العملية</td><td style="${th}">المستوى</td><td style="${th}">الكمية</td><td style="${th}" colspan="3">السعر</td><td style="${th}" colspan="3">الربح</td></tr>
          ${rowsHtml.replace(/<td>/g, `<td style="${td}">`)}
          <tr><td colspan="10" style="border:none;padding:4px;"></td></tr>`;
      }
    });
    gridSymbols.forEach(sym=>{
      const g = grids[sym];
      const { rowsHtml, hasAny, periodProfit } = buildGridTransactionRows(g, from, to);
      periodTotalProfit += periodProfit;
      if(hasAny){
        body += `<tr><td colspan="10" style="${sectionTd}">تفاصيل عمليات: ${sym} (Grid — ${g.market||''})</td></tr>
          <tr><td style="${th}">التاريخ</td><td style="${th}">العملية</td><td style="${th}">المستوى</td><td style="${th}">الكمية</td><td style="${th}" colspan="3">السعر</td><td style="${th}" colspan="3">الربح</td></tr>
          ${rowsHtml.replace(/<td>/g, `<td style="${td}">`)}
          <tr><td colspan="10" style="border:none;padding:4px;"></td></tr>`;
      }
    });
    body += `<tr><td colspan="9" style="${th}">إجمالي أرباح الصفقات المغلقة خلال الفترة</td><td style="${th}">${periodTotalProfit.toFixed(2)}</td></tr></table>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>كشف حساب</x:Name><x:WorksheetOptions><x:RTL/><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml></head><body dir="rtl">${body}</body></html>`;
    buildAndDownloadMhtmlXls(html, stChartImg, `griffine_كشف_حساب.xls`);
  };

  function updateMsToggleLabel(){
    const checked = Array.from(document.querySelectorAll('.reportSymCheck:checked')).map(cb=>cb.value);
    const btn = document.getElementById('msToggleBtn');
    if(checked.length===0) btn.textContent = 'اختر الأسهم ▾';
    else if(checked.length===allEntries.length) btn.textContent = `كل الأسهم (${allEntries.length}) ▾`;
    else if(checked.length<=3) btn.textContent = checked.join('، ') + ' ▾';
    else btn.textContent = `${checked.length} أسهم مختارة ▾`;
  }

  document.getElementById('msToggleBtn').onclick = (e) => {
    e.stopPropagation();
    const panel = document.getElementById('msPanel');
    panel.style.display = panel.style.display==='none' ? 'block' : 'none';
  };
  document.getElementById('msDoneBtn').onclick = () => { document.getElementById('msPanel').style.display = 'none'; };
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('msDropdown');
    if (dd && !dd.contains(e.target)) document.getElementById('msPanel').style.display = 'none';
  });

  document.getElementById('reportSelectAll').addEventListener('change', (e)=>{
    document.querySelectorAll('.reportSymCheck').forEach(cb=>{ cb.checked = e.target.checked; });
    updateMsToggleLabel();
  });
  document.querySelectorAll('.reportSymCheck').forEach(cb=>{
    cb.addEventListener('change', updateMsToggleLabel);
  });

  function buildReportDetailSections(selectedKeys, from, to){
    let sections = '';
    selectedKeys.forEach(key=>{
      const [sym, type] = key.split('::');
      if (type === 'DCA') {
        const p = plans[sym];
        const { rowsHtml, hasAny } = buildStockTransactionRows(p, from, to);
        sections += `<h2 style="color:#14532d;margin-top:26px;border-top:2px solid #eee;padding-top:16px;">تفاصيل عمليات: ${sym} (DCA — ${p.market||''} - ${p.currency||''})</h2>
        <table><thead><tr><th>التاريخ</th><th>العملية</th><th>المستوى</th><th>الكمية</th><th>السعر</th><th>الربح</th></tr></thead>
        <tbody>${hasAny ? rowsHtml : '<tr><td colspan="6">لا يوجد عمليات في هذه الفترة</td></tr>'}</tbody></table>`;
      } else {
        const g = grids[sym];
        const { rowsHtml, hasAny } = buildGridTransactionRows(g, from, to);
        sections += `<h2 style="color:#14532d;margin-top:26px;border-top:2px solid #eee;padding-top:16px;">تفاصيل عمليات: ${sym} (Grid — ${g.market||''})</h2>
        <table><thead><tr><th>التاريخ</th><th>العملية</th><th>المستوى</th><th>الكمية</th><th>السعر</th><th>الربح</th></tr></thead>
        <tbody>${hasAny ? rowsHtml : '<tr><td colspan="6">لا يوجد عمليات في هذه الفترة</td></tr>'}</tbody></table>`;
      }
    });
    return sections;
  }

  document.getElementById('printStockReportBtn').onclick = () => {
    const selectedKeys = Array.from(document.querySelectorAll('.reportSymCheck:checked')).map(cb=>cb.value);
    if(selectedKeys.length===0){ alert('اختار سهم واحد على الأقل'); return; }
    const from = document.getElementById('stmtFrom').value || null;
    const to = document.getElementById('stmtTo').value || null;

    const reportAgg = computeAggregates(plans, grids, allEntries, from, to, selectedKeys);
    const plainSyms = [...new Set(selectedKeys.map(k=>k.split('::')[0]))];
    const combinedPoints = buildCumulativeProfitPoints(plans, from, to, plainSyms, grids);
    const groupLabel = selectedKeys.length===allEntries.length ? 'كل الأسهم' : reportAgg.stockRows.map(r=>`${escapeHtml(r.symbol)} (${r.planType})`).join('، ');
    const chartImg = renderCumulativeProfitChart(combinedPoints, 'الربح التراكمي — ' + groupLabel);
    const periodLabel = (from && to) ? `${formatDateAr(from)} إلى ${formatDateAr(to)}` : 'كل الفترة المتاحة';
    const detailSections = buildReportDetailSections(selectedKeys, from, to);

    const rowsHtml = reportAgg.stockRows.map(r=>`<tr>
      <td>${escapeHtml(r.symbol)}</td><td>${r.planType}</td><td>${r.status}</td>
      <td>${fmt2(r.openCost)}</td><td>${r.currentValue?fmt2(r.currentValue):'-'}</td>
      <td>${r.dropPercent!=null?r.dropPercent.toFixed(2)+'%':'-'}</td>
      <td>${fmt2(r.unrealized)}</td><td>${fmt2(r.realized)}</td>
      <td>${r.closedCount}</td><td>${fmt2(r.closedProfit)}</td>
    </tr>`).join('');

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير أسهم</title>
      <style>body{font-family:IBM Plex Sans Arabic,Tahoma,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin-top:8px;}
      th,td{border:1px solid #ccc;padding:6px;text-align:center;font-size:12px;} th{background:#14532d;color:#fff;}
      h1{color:#14532d;} .agg{margin-top:16px;font-size:14px;background:#f0f4f2;padding:12px;border-radius:8px;}
      .indicators{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;}
      .indicators div{flex:1;min-width:150px;background:#f8faf9;border:1px solid #e7ebe9;border-radius:8px;padding:10px;text-align:center;}
      .indicators .v{font-size:16px;font-weight:bold;color:#14532d;} .indicators .l{font-size:11px;color:#888;margin-top:3px;}
      img{max-width:100%;margin-top:16px;}</style></head>
      <body>
      ${reportLogoHeaderHtml()}
      <h1>GRIFFINE — تقرير مجمّع: ${groupLabel}</h1>
      <p>الفترة: ${periodLabel} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>

      <div class="indicators">
        <div><div class="v">${fmt2(reportAgg.grandTotalInvestedEver)}</div><div class="l">كم استثمرت (${groupLabel})</div></div>
        <div><div class="v">${fmt2(reportAgg.grandTotalProfit)}</div><div class="l">كم ربحت أو خسرت</div></div>
        <div><div class="v">${reportAgg.overallProfitPercent.toFixed(2)}%</div><div class="l">نسبة الربح/الخسارة</div></div>
        <div><div class="v u-fs12">${periodLabel}</div><div class="l">فترة التقرير</div></div>
      </div>

      <img src="${chartImg}" width="720" height="300">

      <table><thead><tr>
        <th>السهم</th><th>النوع</th><th>الحالة</th><th>تكلفة المراكز المفتوحة</th><th>القيمة الحالية</th><th>الانخفاض</th>
        <th>ربح غير محقق</th><th>ربح محقق</th><th>صفقات مغلقة</th><th>ربح الصفقات المغلقة</th>
      </tr></thead><tbody>
        ${rowsHtml}
        <tr style="font-weight:bold;background:#eef6f2;">
          <td>الإجمالي</td><td></td><td></td>
          <td>${fmt2(reportAgg.totalOpenCost)}</td><td>${fmt2(reportAgg.totalCurrentValue)}</td>
          <td>${reportAgg.avgDropRate!=null?reportAgg.avgDropRate.toFixed(2)+'%':'-'}</td>
          <td>${fmt2(reportAgg.totalUnrealized)}</td><td>${fmt2(reportAgg.totalRealized)}</td>
          <td>${reportAgg.totalClosedTradesCount}</td><td>${fmt2(reportAgg.totalClosedProfit)}</td>
        </tr>
      </tbody></table>

      ${detailSections}

      
      </body></html>`);
    w.document.close(); gReportReady(w);
  };

  document.getElementById('exportStockReportXlsBtn').onclick = () => {
    const selectedKeys = Array.from(document.querySelectorAll('.reportSymCheck:checked')).map(cb=>cb.value);
    if(selectedKeys.length===0){ alert('اختار سهم واحد على الأقل'); return; }
    const from = document.getElementById('stmtFrom').value || null;
    const to = document.getElementById('stmtTo').value || null;

    const reportAgg = computeAggregates(plans, grids, allEntries, from, to, selectedKeys);
    const plainSyms = [...new Set(selectedKeys.map(k=>k.split('::')[0]))];
    const combinedPoints = buildCumulativeProfitPoints(plans, from, to, plainSyms, grids);
    const groupLabel = selectedKeys.length===allEntries.length ? 'كل الأسهم' : reportAgg.stockRows.map(r=>`${escapeHtml(r.symbol)} (${r.planType})`).join('، ');
    const chartImg = renderCumulativeProfitChart(combinedPoints, 'الربح التراكمي — ' + groupLabel);
    const periodLabel = (from && to) ? `${formatDateAr(from)} إلى ${formatDateAr(to)}` : 'كل الفترة المتاحة';

    const th = "background:#14532D;color:#ffffff;font-weight:bold;border:1px solid #000000;padding:6px 10px;text-align:center;";
    const td = "border:1px solid #999999;padding:5px 10px;text-align:center;";
    const totalTd = "border:1px solid #000000;padding:6px 10px;text-align:center;font-weight:bold;background:#E6F4EA;";
    const titleTd = "background:#14532D;color:#ffffff;font-weight:bold;font-size:16px;padding:10px;text-align:center;";
    const sectionTd = "background:#eef6f2;color:#14532d;font-weight:bold;padding:8px;text-align:right;";

    const rowsHtml = reportAgg.stockRows.map(r=>`<tr>
      <td style="${td}">${escapeHtml(r.symbol)}</td><td style="${td}">${r.planType}</td><td style="${td}">${r.status}</td>
      <td style="${td}">${r.openCost.toFixed(2)}</td><td style="${td}">${r.currentValue.toFixed(2)}</td>
      <td style="${td}">${r.dropPercent!=null?r.dropPercent.toFixed(2)+'%':'-'}</td>
      <td style="${td}">${r.unrealized.toFixed(2)}</td><td style="${td}">${r.realized.toFixed(2)}</td>
      <td style="${td}">${r.closedCount}</td><td style="${td}">${r.closedProfit.toFixed(2)}</td>
    </tr>`).join('');

    let detailRows = '';
    selectedKeys.forEach(key=>{
      const [sym, type] = key.split('::');
      const { rowsHtml: r2, hasAny } = type === 'DCA' ? buildStockTransactionRows(plans[sym], from, to) : buildGridTransactionRows(grids[sym], from, to);
      const marketLabel = type === 'DCA' ? `${plans[sym].market||''} - ${plans[sym].currency||''}` : `${grids[sym].market||''}`;
      detailRows += `<tr><td colspan="10" style="${sectionTd}">تفاصيل عمليات: ${sym} (${type} — ${marketLabel})</td></tr>
        <tr><td style="${th}">التاريخ</td><td style="${th}">العملية</td><td style="${th}">المستوى</td><td style="${th}">الكمية</td><td style="${th}" colspan="3">السعر</td><td style="${th}" colspan="3">الربح</td></tr>
        ${hasAny ? r2.replace(/<td>/g, `<td style="${td}">`) : `<tr><td colspan="10" style="${td}">لا يوجد عمليات في هذه الفترة</td></tr>`}
        <tr><td colspan="10" style="border:none;padding:4px;"></td></tr>`;
    });

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8">
      <xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>تقرير</x:Name><x:WorksheetOptions><x:RTL/><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
      </head><body dir="rtl">
      <table style="border-collapse:collapse;font-family:IBM Plex Sans Arabic,Tahoma,Arial;direction:rtl;" dir="rtl">
        <tr><td colspan="10" style="${titleTd}">GRIFFINE — تقرير مجمّع: ${groupLabel}</td></tr>
        <tr><td colspan="10" style="border:none;padding:6px;">الفترة: ${periodLabel} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</td></tr>
        <tr><td colspan="10" class="u-bn"></td></tr>
        <tr>
          <td style="${th}">السهم</td><td style="${th}">النوع</td><td style="${th}">الحالة</td><td style="${th}">تكلفة المراكز المفتوحة</td><td style="${th}">القيمة الحالية</td>
          <td style="${th}">نسبة الانخفاض</td><td style="${th}">ربح غير محقق</td><td style="${th}">ربح محقق</td>
          <td style="${th}">صفقات مغلقة</td><td style="${th}">ربح الصفقات المغلقة</td>
        </tr>
        ${rowsHtml}
        <tr>
          <td style="${totalTd}">الإجمالي</td><td style="${totalTd}"></td><td style="${totalTd}"></td>
          <td style="${totalTd}">${reportAgg.totalOpenCost.toFixed(2)}</td><td style="${totalTd}">${reportAgg.totalCurrentValue.toFixed(2)}</td>
          <td style="${totalTd}">${reportAgg.avgDropRate!=null?reportAgg.avgDropRate.toFixed(2)+'%':'-'}</td>
          <td style="${totalTd}">${reportAgg.totalUnrealized.toFixed(2)}</td><td style="${totalTd}">${reportAgg.totalRealized.toFixed(2)}</td>
          <td style="${totalTd}">${reportAgg.totalClosedTradesCount}</td><td style="${totalTd}">${reportAgg.totalClosedProfit.toFixed(2)}</td>
        </tr>
        <tr><td colspan="10" style="border:none;padding:10px;text-align:center;"><img src="chart.png" width="600" height="237"></td></tr>
        <tr><td colspan="10" class="u-bn"></td></tr>
        ${detailRows}
      </table>
      </body></html>`;
    buildAndDownloadMhtmlXls(html, chartImg, `griffine_تقرير_${groupLabel.substring(0,20)}.xls`);
  };
}

/* ================== تقرير تنويع المحفظة (خدمة جديدة - بند 43) ================== */
/* الإصدار 115: تقرير توزيع التنوع اتنقل لـ mizan.js («ميزان محفظتك AI») */

/* ================== برنامج الإحالة - ادعُ صديق (خدمة جديدة - بند 43) ================== */
async function renderReferralPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderReferralPage());
  const email = await getSession();
  if(!email) return renderLogin();

  const res = await getReferralInfo();
  const info = (res && res.success) ? res : { code: '', totalReferred: 0, rewardedCount: 0, bonusDays: 15 };
  const link = `${location.origin}${location.pathname}?ref=${info.code}`;

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>${pageTitle('referral','🎁 ادعُ صديق')}</div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button></div>
    <div class="info">اقنع صاحبك يجرّب GRIFFINE — لما يشترك باقة مدفوعة، انتوا الاتنين تاخدوا ${info.bonusDays} يوم إضافي مجاني على اشتراككم الحالي تلقائيًا.</div>

    <h2>كود الإحالة الخاص بك</h2>
    <div class="section-card u-tc">
      <div style="font-size:26px;font-weight:bold;letter-spacing:4px;color:var(--green-dark);">${escapeHtml(info.code)}</div>
      <label class="u-mt12">أو شارك الرابط المباشر</label>
      <input type="text" id="refLinkInput" readonly value="${link}">
      <button id="copyRefLinkBtn" class="u-mt8">📋 نسخ الرابط</button>
      <div id="copyResult"></div>
    </div>

    <h2 class="u-mt20">إحصائياتك</h2>
    <div class="summary-cards">
      <div class="summary-card"><div class="val">${info.totalReferred}</div><div class="lbl">إجمالي من سجّلوا بكودك</div></div>
      <div class="summary-card"><div class="val">${info.rewardedCount}</div><div class="lbl">مكافآت اتصرفت فعليًا</div></div>
    </div>
    <p class="disclaimer">تتفعّل المكافأة تلقائيًا فقط عندما يشترك صديقك في باقة مدفوعة وتتفعّل فعليًا (وليس عند التسجيل فقط).</p>
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();
  document.getElementById('copyRefLinkBtn').onclick=async()=>{
    try {
      await navigator.clipboard.writeText(link);
      document.getElementById('copyResult').innerHTML = '<div class="info u-mt8">✅ اتنسخ الرابط.</div>';
    } catch(e) {
      document.getElementById('refLinkInput').select();
      document.getElementById('copyResult').innerHTML = '<div class="info u-mt8">حدد الرابط وانسخه يدويًا.</div>';
    }
  };
}

/* ================== الملف الشخصي - بيانات الحساب + تفضيل الشكل + المكان الوحيد لتسجيل الخروج ================== */
async function renderProfilePage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderProfilePage());
  const email = await getSession();
  if(!email) return renderLogin();

  const subRes = await getMySubscription();
  const sub = (subRes && subRes.success) ? subRes.subscription : null;
  let theme = 'light'; try { theme = localStorage.getItem('griffine_theme') || 'light'; } catch(e){}
  let currentAvatar = null;
  try { const avatarRes = await apiGet('/avatar_get.php'); if (avatarRes && avatarRes.success) currentAvatar = avatarRes.avatar; } catch(e){ /* الأفاتار مش أساسية */ }
  const presets = presetAvatars();

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>${pageTitle('profile','👤 الملف الشخصي')}</div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button></div>

    <h2>الصورة الشخصية</h2>
    <div class="section-card u-tc">
      <img id="currentAvatarPreview" src="${escapeHtml(currentAvatar || presets[0])}" alt="الصورة الشخصية" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:2px solid var(--border);margin-bottom:12px;">
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:12px;">
        ${presets.map((p,i)=>`<img src="${p}" class="avatarPresetOption" data-idx="${i}" alt="أفاتار ${i+1}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;cursor:pointer;border:2px solid transparent;">`).join('')}
      </div>
      <input type="file" accept="image/*" id="avatarUploadInput" style="display:none;">
      <button id="avatarUploadBtn" class="secondary u-wa">📤 رفع صورة شخصية</button>
      ${currentAvatar ? `<button id="avatarRemoveBtn" class="danger" style="width:auto;margin-inline-start:8px;">إزالة الصورة</button>` : ''}
      <div id="avatarResult"></div>
    </div>

    <h2 class="u-mt20">بياناتك</h2>
    <div class="section-card">
      <div class="u-mb6"><strong>البريد الإلكتروني:</strong> ${escapeHtml(email)}</div>
      <button id="requestEmailChangeToggleBtn" class="secondary small" style="width:auto;margin-bottom:12px;">✏️ طلب تعديل البريد الإلكتروني</button>
      <button id="requestPasswordChangeBtn" class="secondary small" style="width:auto;margin-bottom:12px;margin-inline-start:8px;">🔑 طلب تعديل كلمة المرور</button>
      <div id="passwordChangeResult"></div>
      <div id="emailChangeForm" style="display:none;margin-bottom:12px;padding:10px;border:1px solid var(--border);border-radius:8px;">
        <div style="font-size:12.5px;color:#666;margin-bottom:8px;">تعديل البريد الإلكتروني (بريد الدخول) يحتاج موافقة الأدمن أولًا. اكتب البريد الجديد وابعت الطلب، وهيتم مراجعته.</div>
        <input type="email" id="newEmailInput" placeholder="البريد الإلكتروني الجديد">
        <button id="submitEmailChangeBtn" class="secondary small u-wa u-mt8">إرسال الطلب</button>
        <div id="emailChangeResult"></div>
      </div>
      ${sub ? `
        <label style="font-size:13px;color:#666;">الاسم</label>
        <input type="text" id="profileNameInput" value="${escapeHtml(sub.name || '')}" class="u-mb10">
        <label style="font-size:13px;color:#666;">رقم الهاتف</label>
        <input type="tel" id="profilePhoneInput" value="${escapeHtml(sub.phone || '')}" class="u-mb10">
        <div style="margin-bottom:10px;font-size:13px;"><strong>إيميل التواصل:</strong> ${escapeHtml(sub.contactEmail || '-')}</div>
        <label style="font-size:13px;color:#666;">الرقم القومي (اختياري)</label>
        <input type="text" id="profileNationalIdInput" value="${escapeHtml(sub.nationalId || '')}" class="u-mb10">
        <label style="font-size:13px;color:#666;">العنوان (اختياري)</label>
        <input type="text" id="profileAddressInput" value="${escapeHtml(sub.address || '')}" class="u-mb10">
        <button id="saveProfileDataBtn" class="secondary u-mt6">💾 حفظ التعديلات</button>
        <div id="profileSaveResult"></div>
      ` : '<div class="u-note">بعد معملتش أي اشتراك.</div>'}
    </div>

    ${sub ? `
    <h2 class="u-mt20">اشتراكك الحالي</h2>
    <div class="section-card">
      <div class="u-mb6"><strong>الباقة:</strong> ${escapeHtml(sub.planName || '-')}</div>
      <div class="u-mb6"><strong>الحالة:</strong> ${sub.active ? '<span class="tag tag-done">نشط</span>' : '<span class="tag tag-wait">بانتظار التفعيل</span>'}</div>
      <div class="u-mb6"><strong>ينتهي في:</strong> ${formatDateAr(sub.endDate)}</div>
      ${sub.pendingPlanName ? `<div style="margin-top:6px;color:#8a6d1b;">📅 في انتظار التفعيل: ${escapeHtml(sub.pendingPlanName)}</div>` : ''}
    </div>` : ''}

    <h2 class="u-mt20">مظهر الموقع</h2>
    <div class="section-card">
      <div class="u-row">
        <span>الوضع الحالي: ${theme === 'dark' ? '🌙 ليلي' : '☀️ نهاري'}</span>
        <button id="toggleThemeFromProfile" class="secondary u-wa u-m0">تبديل</button>
      </div>
    </div>

    <h2 class="u-mt20">الحساب</h2>
    <div class="section-card">
      <button id="goSubHistoryFromProfileBtn" class="secondary u-mt0">📄 سجل اشتراكي</button>
      <button id="goReferralFromProfileBtn" class="secondary u-mt10">🎁 ادعُ صديق</button>
      <button id="logoutFromProfileBtn" class="danger u-mt10">تسجيل الخروج</button>
    </div>
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();
  document.getElementById('goSubHistoryFromProfileBtn').onclick=()=>renderMySubscriptionHistory();
  document.getElementById('goReferralFromProfileBtn').onclick=()=>renderReferralPage();
  document.getElementById('toggleThemeFromProfile').onclick=()=>{
    const toggleBtn = document.getElementById('darkModeToggle');
    if (toggleBtn) toggleBtn.click();
    renderProfilePage();
  };
  document.getElementById('logoutFromProfileBtn').onclick=async()=>{ await setSession(''); window.__screens = []; window.__screenIndex = -1; await refreshTopNav(); gAfterLogout(); };
  document.getElementById('requestEmailChangeToggleBtn').onclick = () => {
    const form = document.getElementById('emailChangeForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  };
  document.getElementById('requestPasswordChangeBtn').onclick = async () => {
    const resEl = document.getElementById('passwordChangeResult');
    resEl.innerHTML = '<div style="font-size:12.5px;color:#888;margin-top:6px;">جاري الإرسال...</div>';
    const r = await forgotPassword(email);
    if (r && r.success) {
      resEl.innerHTML = `<div class="info u-mt6">✅ ${escapeHtml(r.message)}</div>`;
    } else {
      resEl.innerHTML = '<div class="error u-mt6">حصل خطأ في إرسال الطلب.</div>';
    }
  };
  document.getElementById('submitEmailChangeBtn').onclick = async () => {
    const resEl = document.getElementById('emailChangeResult');
    const newEmail = document.getElementById('newEmailInput').value.trim();
    if (!newEmail) { resEl.innerHTML = '<div class="error u-mt8">أدخل البريد الإلكتروني الجديد.</div>'; return; }
    const r = await apiPost('/request_email_change.php', { new_email: newEmail });
    if (r && r.success) {
      resEl.innerHTML = '<div class="info u-mt8">✅ تم إرسال طلبك، هيتم مراجعته من الأدمن.</div>';
    } else {
      resEl.innerHTML = `<div class="error u-mt8">${(r&&r.message)||'حصل خطأ'}</div>`;
    }
  };
  if (sub) {
    document.getElementById('saveProfileDataBtn').onclick = async () => {
      const resEl = document.getElementById('profileSaveResult');
      const name = document.getElementById('profileNameInput').value.trim();
      const phone = document.getElementById('profilePhoneInput').value.trim();
      const nationalId = document.getElementById('profileNationalIdInput').value.trim();
      const address = document.getElementById('profileAddressInput').value.trim();
      if (!name || !phone) { resEl.innerHTML = '<div class="error u-mt8">الاسم ورقم الهاتف مطلوبين.</div>'; return; }
      const r = await apiPost('/update_my_profile.php', { name, phone, national_id: nationalId, address });
      if (r && r.success) {
        resEl.innerHTML = '<div class="info u-mt8">✅ تم حفظ التعديلات.</div>';
      } else {
        resEl.innerHTML = `<div class="error u-mt8">${(r&&r.message)||'حصل خطأ في الحفظ'}</div>`;
      }
    };
  }

  async function saveAvatar(dataUrl){
    const resEl = document.getElementById('avatarResult');
    const r = await apiPost('/avatar_save.php', { avatar: dataUrl });
    if (r && r.success) {
      document.getElementById('currentAvatarPreview').src = dataUrl || presets[0];
      resEl.innerHTML = '<div class="info u-mt8">✅ اتحفظت الصورة.</div>';
      await refreshTopNavAvatar();
    } else {
      resEl.innerHTML = `<div class="error u-mt8">${(r&&r.message)||'حصل خطأ في حفظ الصورة'}</div>`;
    }
  }

  document.querySelectorAll('.avatarPresetOption').forEach(img=>{
    img.onclick = () => saveAvatar(img.src);
  });

  document.getElementById('avatarUploadBtn').onclick = () => document.getElementById('avatarUploadInput').click();
  document.getElementById('avatarUploadInput').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 200;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size/img.width, size/img.height);
        const w = img.width*scale, h = img.height*scale;
        ctx.drawImage(img, (size-w)/2, (size-h)/2, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        saveAvatar(compressed);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  const removeBtn = document.getElementById('avatarRemoveBtn');
  if (removeBtn) removeBtn.onclick = () => saveAvatar(null);
}


/* ================== خطط الشبكة (Grid Trading) - أداة جديدة منفصلة عن تعزيز المتوسط ================== */
async function renderGridPlansList(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderGridPlansList());
  setBottomNavActive('plans');
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;

  // الإصدار 111: نفس شكل قائمة خطط الـ DCA بالظبط (بحث + الكل/مفتوحة/مقفولة + قائمة واحدة بتمرير + قسم «تقرير سهم» PDF/Excel)
  const grids = await getGridPlans(email);
  const symbols = Object.keys(grids);
  const CCY = { 'مصر':'جنيه مصري', 'السعودية':'ريال سعودي', 'الإمارات':'درهم إماراتي', 'قطر':'ريال قطري', 'الكويت':'دينار كويتي' };
  const heldOf = (g) => (g.levels || []).filter(l => l.status === 'bought' && l.executedQty > 0);

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${escapeHtml(email)}</strong></div></div>
    <button class="secondary small u-wa" id="homeBtn">🏠 الشاشة الرئيسية</button>
    <button id="goNewGridBtn">+ خطة شبكة جديدة لسهم</button>
    <h2>${pageTitle('grid_plans_list','خطط الشبكة (Grid) — سهم لكل خطة')}</h2>
    <div class="gpl-total" id="gplTotal" hidden></div>
    ${symbols.length>0 ? `<div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="gridListSearch" placeholder="🔍 ابحث باسم السهم..."></div>
      <div class="std-filter-tabs">
        <button type="button" class="small secondary gridListFilterBtn std-filter-tab btn-active" data-status="all">الكل</button>
        <button type="button" class="small secondary gridListFilterBtn std-filter-tab" data-status="مفتوحة">مفتوحة فقط</button>
        <button type="button" class="small secondary gridListFilterBtn std-filter-tab" data-status="مقفولة">مقفولة فقط</button>
      </div>
    </div>` : ''}
    <div id="gridListWrap" class="plans-list-scroll"></div>
    <div class="std-filter-empty" id="gridListEmpty" style="display:none;">لا توجد خطط مطابقة للبحث/الفلتر</div>
    ${symbols.length>0 ? renderDacStockReportSectionHtml(grids, symbols, 'Grid') : ''}
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();
  document.getElementById('goNewGridBtn').onclick=()=>renderGridPlanForm();
  if (symbols.length>0) wireDacStockReportSection(grids, symbols, 'Grid');

  const listWrap = document.getElementById('gridListWrap');
  if (!symbols.length) {
    listWrap.innerHTML = '<p class="u-note">لا يوجد خطط شبكة بعد. ابدأ بإنشاء خطة جديدة.</p>';
    return;
  }
  listWrap.innerHTML = symbols.map(sym => {
    const g = grids[sym];
    const bought = heldOf(g).length;
    const totalCycles = (g.levels || []).reduce((s,l)=>s+(l.cycles||0),0);
    const isOpenPosition = bought > 0;
    const isActuallyClosed = !!g.closed || (!isOpenPosition && ((g.cycleHistory || []).length > 0 || (g.closedTrades || []).length > 0));
    const statusKey = isActuallyClosed && !isOpenPosition ? 'مقفولة' : 'مفتوحة';
    const stLabel = isOpenPosition ? 'مفتوحة' : isActuallyClosed ? 'مغلقة' : 'لم تبدأ';
    return `<div class="plan-list-item" data-sym="${escapeHtml(sym)}" data-q="${escapeHtml(sym.toLowerCase())}" data-status="${statusKey}">
      <div><strong>${escapeHtml(sym)}</strong> <span class="g-kind g-kind-grid">Grid</span> ${gPlanStatusBadge(stLabel)}<div class="u-fs11 u-muted">${bought}/${(g.levels || []).length} مستويات مشتراة — دورات مكتملة: ${totalCycles} — ${statusKey === 'مقفولة' ? 'مقفولة ✅' : 'مفتوحة'} — ${escapeHtml(g.market||'')} — ${escapeHtml(g.currency || CCY[g.market || 'مصر'] || '')}${g.listed === false ? ' — <span class="tag">غير مدرج 🔕</span>' : ''}</div>${isOpenPosition ? `<div class="gpl-px u-fs12" data-sym="${escapeHtml(sym)}">جارٍ تحميل آخر سعر...</div>` : ''}</div>
      <div style="display:flex;align-items:center;gap:10px;">
        <button class="small secondary u-wa u-m0" data-gcall="__editGridFromList" data-gargs="${gArgs([String(sym)])}" data-gstop="1">⚙️ تعديل الخطة</button>
        <button class="small danger u-wa u-m0" data-gcall="__delGridFromList" data-gargs="${gArgs([String(sym)])}" data-gstop="1" title="حذف (ينتقل إلى سلة المحذوفات)" aria-label="حذف الخطة">🗑️</button>
        <span>&#8250;</span>
      </div>
    </div>`;
  }).join('');
  listWrap.querySelectorAll('.plan-list-item').forEach(el=>{
    el.onclick=(e)=>{ if (e.target.closest('button')) return; renderGridPlanDetail(el.dataset.sym); };   // أزرار التعديل والحذف مبتفتحش الخطة
  });
  window.__openGrid = (sym) => renderGridPlanDetail(sym);
  window.__editGridFromList = (sym) => renderGridEditPlanSettings(sym);
  window.__delGridFromList = (sym) => gDeletePlan('grid', sym, () => { window.__navSilent = true; try { renderGridPlansList(); } finally { window.__navSilent = false; } });
  { const act = {}; symbols.forEach(sym => { if (heldOf(grids[sym]).length) act[sym] = grids[sym]; });
    gFillListProfits(__tok, {}, act, Object.keys(act).map(sym => { const b = heldOf(grids[sym]);
      const held = b.reduce((a, l) => a + (+l.executedQty || 0), 0), cost = b.reduce((a, l) => a + (+l.executedQty || 0) * (+l.executedPrice || 0), 0);
      return held > 0 ? { sym, market: grids[sym].market || 'مصر', held, avg: cost / held, ccy: grids[sym].currency || CCY[grids[sym].market || 'مصر'] } : null; }).filter(Boolean)); }

  function filterGridPlansList(){
    const q = document.getElementById('gridListSearch').value.trim().toLowerCase();
    const activeBtn = document.querySelector('.gridListFilterBtn.btn-active');
    const statusFilter = activeBtn ? activeBtn.dataset.status : 'all';
    let anyVisible = false;
    document.querySelectorAll('#gridListWrap .plan-list-item').forEach(item=>{
      const show = (!q || (item.dataset.q||'').includes(q)) && (statusFilter==='all' || item.dataset.status===statusFilter);
      item.style.display = show ? '' : 'none';
      if (show) anyVisible = true;
    });
    document.getElementById('gridListEmpty').style.display = anyVisible ? 'none' : '';
  }
  document.getElementById('gridListSearch').addEventListener('input', filterGridPlansList);
  document.querySelectorAll('.gridListFilterBtn').forEach(btn=>{
    btn.onclick = () => {
      document.querySelectorAll('.gridListFilterBtn').forEach(b=>b.classList.remove('btn-active'));
      btn.classList.add('btn-active');
      filterGridPlansList();
    };
  });
}

async function renderGridPlanForm(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderGridPlanForm());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;
  const prefill = window.__prefillGridPlan || {};
  window.__prefillGridPlan = null;

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>${pageTitle('grid_plan_new','+ خطة شبكة جديدة')}</div><button class="secondary small" id="backBtn">🔲 كل خطط الشبكة</button></div>
    <form id="gridForm">
<div class="radio-row g-listed" role="radiogroup" aria-label="نوع السهم">
        <label><input type="radio" name="g_listed" value="1" checked> سهم مدرج في البورصة (يتم التحقق من الكود + آخر سعر + إشعارات تلقائية)</label>
        <label><input type="radio" name="g_listed" value="0"> سهم غير مدرج في البورصة (أي اسم وسعر تكتبه بنفسك — بدون إشعارات تلقائية)</label>
      </div>
      <label>كود السهم</label>
      <input type="text" id="g_symbol" required placeholder="مثال: COMI">
      <label>السوق</label>
      <select id="g_market">
        <option value="مصر">مصر (EGX)</option>
        <option value="السعودية">السعودية</option>
        <option value="الإمارات">الإمارات</option>
        <option value="قطر">قطر</option>
        <option value="الكويت">الكويت</option>
      </select>
      <label>رأس المال المخصص لهذا السهم</label>
      <input type="number" step="any" id="g_capital" required placeholder="مثال: 10000">
      <label>نسبة المخاطرة % (تحدد حجم كل صفقة تلقائيًا)</label>
      <input type="number" step="any" id="g_risk" required placeholder="مثال: 5">
      <div class="info" id="g_tradeSizePreview" style="display:none;"></div>
      <label>سعر السهم الحالي</label>
      <input type="number" step="any" id="g_currentPrice" placeholder="مثال: 19.50">
      <div class="grid2">
        <div><label>سقف النطاق (أعلى سعر)</label><input type="number" step="any" id="g_high" required></div>
        <div><label>قاع النطاق (أقل سعر)</label><input type="number" step="any" id="g_low" required></div>
      </div>
      <label>عدد المستويات (يُحدَّد تلقائيًا حسب رأس المال ونسبة المخاطرة، ويمكنك تعديله)</label>
      <input type="number" id="g_levels" required>

      <label style="margin-top:16px;">طريقة توزيع الكمية على المستويات</label>
      <div class="radio-row" style="display:flex;gap:16px;margin:6px 0 12px;flex-wrap:wrap;">
        <label class="u-check"><input type="radio" name="g_qtyMode" value="equal" checked> توزيع متساوٍ (تلقائي)</label>
        <label class="u-check"><input type="radio" name="g_qtyMode" value="manual"> تحديد يدوي لكل مستوى</label>
        <label class="u-check"><input type="radio" name="g_qtyMode" value="progressive"> زيادة الكمية بنسبة المخاطرة مع كل مستوى</label>
      </div>

      <label class="u-mt10">نسبة ربح الخروج الكلي % (اختياري)</label>
      <input type="number" step="any" id="g_exitProfitPercent" placeholder="مثال: 10">
      <div style="font-size:11px;color:#888;margin-top:4px;">إذا حددتها، سيوضح لك الموقع السعر الذي يمكنك عنده الخروج من كل المستويات المفتوحة معًا وتحقيق نسبة الربح هذه على متوسط تكلفتك، وسيُبرز المستوى الأقرب لسعر الخروج هذا باللون الأخضر في جدول المستويات.</div>

      <button type="button" id="genLevelsBtn" class="secondary u-mt14">توليد جدول المستويات</button>
    </form>

    <div id="levelsPreviewWrap" style="display:none;margin-top:16px;">
      <h2>جدول المستويات — عدّل الكمية الإرشادية لو حابب</h2>
      <div class="section-card u-ox">
        <table>
          <thead><tr><th>#</th><th>السعر المخطط</th><th>الكمية الإرشادية</th></tr></thead>
          <tbody id="levelsPreviewBody"></tbody>
        </table>
      </div>
      <button id="createGridBtn" class="u-mt14">إنشاء الخطة</button>
    </div>
    <div id="gridFormResult"></div>
  </div>`;
  gWireSymbolLookup({ symId: 'g_symbol', mktId: 'g_market', priceId: 'g_currentPrice', listedName: 'g_listed' });   // الإصدار 100
  document.getElementById('backBtn').onclick=()=>renderGridPlansList();
  if (prefill.symbol) document.getElementById('g_symbol').value = prefill.symbol;
  if (prefill.market) document.getElementById('g_market').value = prefill.market;
  if (prefill.price) document.getElementById('g_currentPrice').value = prefill.price;
  const gRange = gWireGridRange({ prefix: 'g', symId: 'g_symbol', getSym: () => document.getElementById('g_symbol').value, mktId: 'g_market', highId: 'g_high', lowId: 'g_low', listedName: 'g_listed',
    isListed: () => (document.querySelector('input[name="g_listed"]:checked') || {}).value !== '0', mode: 'auto', period: 'month' });   // الإصدار 111

  function updatePreview(){
    const capital = parseFloat(document.getElementById('g_capital').value);
    const risk = parseFloat(document.getElementById('g_risk').value);
    const preview = document.getElementById('g_tradeSizePreview');
    if (capital > 0 && risk > 0) {
      const tradeSize = capital * risk / 100;
      const maxLevels = Math.floor(capital / tradeSize);
      document.getElementById('g_levels').value = maxLevels;
      preview.style.display = '';
      preview.textContent = `حجم كل صفقة: ${tradeSize.toFixed(2)} — أقصى عدد مستويات ممكن (بحيث يكفي رأس المال إذا نُفّذت كلها): ${maxLevels}`;
    } else {
      preview.style.display = 'none';
    }
  }
  document.getElementById('g_capital').addEventListener('input', updatePreview);
  document.getElementById('g_risk').addEventListener('input', updatePreview);

  let generatedLevels = [];
  document.getElementById('genLevelsBtn').onclick = () => {
    const capital = parseFloat(document.getElementById('g_capital').value);
    const risk = parseFloat(document.getElementById('g_risk').value);
    const high = parseFloat(document.getElementById('g_high').value);
    const low = parseFloat(document.getElementById('g_low').value);
    const numLevels = parseInt(document.getElementById('g_levels').value);
    const resultEl = document.getElementById('gridFormResult');
    if (!capital || !risk || high<=low || !numLevels || numLevels<1) {
      resultEl.innerHTML = '<div class="error u-mt10">تأكد إن رأس المال ونسبة المخاطرة والنطاق وعدد المستويات كلهم مدخلين صح (السقف أكبر من القاع).</div>';
      return;
    }
    resultEl.innerHTML = '';
    const tradeSize = capital * risk / 100;
    const step = (high - low) / numLevels;
    const qtyMode = document.querySelector('input[name="g_qtyMode"]:checked').value;
    const baseQty = tradeSize / (high - step);
    generatedLevels = [];
    for (let i = 0; i < numLevels; i++) {
      const price = Number((high - step * (i + 1)).toFixed(4));
      let guidedQty = null;
      if (qtyMode === 'equal') guidedQty = Number((tradeSize/price).toFixed(2));
      else if (qtyMode === 'progressive') guidedQty = Number((baseQty * Math.pow(1 + risk/100, i)).toFixed(2));
      generatedLevels.push({ plannedPrice: price, plannedQty: guidedQty });
    }
    document.getElementById('levelsPreviewBody').innerHTML = generatedLevels.map((lv,idx)=>`<tr>
      <td>${idx+1}</td>
      <td>${lv.plannedPrice}</td>
      <td><input type="number" step="any" min="0" id="prevQty_${idx}" value="${lv.plannedQty??''}" placeholder="أدخل الكمية" style="max-width:120px;"></td>
    </tr>`).join('');
    document.getElementById('levelsPreviewWrap').style.display = '';
  };

  document.getElementById('createGridBtn').onclick = async () => {
    const symbol = document.getElementById('g_symbol').value.trim().toUpperCase();
    const market = document.getElementById('g_market').value;
    const capital = parseFloat(document.getElementById('g_capital').value);
    const risk = parseFloat(document.getElementById('g_risk').value);
    const high = parseFloat(document.getElementById('g_high').value);
    const low = parseFloat(document.getElementById('g_low').value);
    const numLevels = generatedLevels.length;
    const resultEl = document.getElementById('gridFormResult');

    if (!symbol) {
      resultEl.innerHTML = '<div class="error u-mt10">أدخل كود السهم.</div>';
      return;
    }
    const gListed = (document.querySelector('input[name="g_listed"]:checked') || {}).value !== '0';
    if (gListed) { const symChk = await gCheckSymbol(symbol, market); if (!symChk.ok) { resultEl.innerHTML = `<div class="error u-mt10">${escapeHtml(symChk.msg)} لو السهم غير مدرج في البورصة اختر «سهم غير مدرج في البورصة».</div>`; return; } }
    const existingDacPlans = await getPlans(email);
    if (existingDacPlans[symbol]) {
      resultEl.innerHTML = '<div class="error u-mt10">هذا السهم لديه خطة تعزيز متوسط (DCA) بالفعل — لا يمكن أن يكون السهم نفسه في خطتين في الوقت نفسه. احذف خطة الـDCA أولًا إذا أردت بدء خطة شبكة بدلًا منها.</div>';
      return;
    }
    const tradeSize = capital * risk / 100;
    const step = (high - low) / numLevels;
    const levels = generatedLevels.map((glv, idx) => {
      const qtyInput = document.getElementById('prevQty_'+idx);
      const q = parseFloat(qtyInput.value);
      return {
        plannedPrice: glv.plannedPrice,
        plannedQty: (!isNaN(q) && q>0) ? q : null,
        executedQty: null, executedPrice: null, executedDate: null,
        status: 'empty', sellTargetPrice: null,
        sells: [],
        cycles: 0,
      };
    });
    const currentPrice = parseFloat(document.getElementById('g_currentPrice').value) || null;
    const grids = await getGridPlans(email);
    const exitProfitPercent = parseFloat(document.getElementById('g_exitProfitPercent').value);
    grids[symbol] = { symbol, market, currentPrice, capital, risk, tradeSize, rangeHigh: high, rangeLow: low, step, levels, manualExits: [], cycleHistory: [], closedTrades: [], closed: false, rangeMode: gRange ? gRange.mode() : 'manual', rangePeriod: gRange && gRange.mode() === 'auto' ? gRange.period() : null, exitProfitPercent: (!isNaN(exitProfitPercent) && exitProfitPercent>0) ? exitProfitPercent : null, createdAt: new Date().toISOString() };
    if (!gListed) { grids[symbol].listed = false; grids[symbol].manualLastPrice = currentPrice || null; }
    await saveGridPlans(email, grids);
    renderGridPlanDetail(symbol);
  };
}

async function renderGridPlanDetail(symbol){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderGridPlanDetail(symbol));
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;

  let grids = await getGridPlans(email);
  let g = grids[symbol];
  if (!g) return renderGridPlansList();
  if (!g.cycleHistory) g.cycleHistory = [];
  if (!g.closedTrades) g.closedTrades = [];
  g.levels.forEach(lv=>{ if(!lv.sells) lv.sells = []; });

  const totalProfit = g.cycleHistory.length ? g.cycleHistory[g.cycleHistory.length-1].cumulative : 0;

  function computeGridSummary(){
    const boughtLevels = g.levels.filter(l=>l.status==='bought' && l.executedQty>0);
    const heldQty = boughtLevels.reduce((s,l)=>s+l.executedQty, 0);
    const totalInvested = boughtLevels.reduce((s,l)=>s+(l.executedQty*l.executedPrice), 0);
    const avgCostCurrent = heldQty>0 ? totalInvested/heldQty : null;
    const avgSellTarget = heldQty>0 ? boughtLevels.reduce((s,l)=>s+(l.sellTargetPrice*l.executedQty), 0)/heldQty : null;
    const expectedProfitIfSoldNow = boughtLevels.reduce((s,l)=>s+((l.sellTargetPrice-l.executedPrice)*l.executedQty), 0);
    const exitTargetPrice = (avgCostCurrent!=null && g.exitProfitPercent) ? avgCostCurrent * (1 + g.exitProfitPercent/100) : null;
    return { heldQty, totalInvested, avgCostCurrent, avgSellTarget, expectedProfitIfSoldNow, exitTargetPrice };
  }
  let gsum = computeGridSummary();

  function computeClosedAgg(){
    return g.closedTrades.reduce((acc,ct)=>({ qty: acc.qty+ct.totalQty, capital: acc.capital+ct.capitalUsed, profit: acc.profit+ct.profit }), {qty:0, capital:0, profit:0});
  }
  let closedAgg = computeClosedAgg();
  let closedAggProfitPercent = closedAgg.capital>0 ? (closedAgg.profit/closedAgg.capital*100) : 0;

  window.__lastPageKey='grid_plan_detail'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div style="background:var(--green-dark);color:#fff;padding:10px 16px;border-radius:10px;margin-bottom:14px;font-weight:700;font-size:15px;">
      🔲 ${escapeHtml(symbol)} — خطة شبكة <span style="font-weight:400;font-size:12.5px;opacity:.85;">(${escapeHtml(g.market||'')} — بدأت ${formatDateAr(g.createdAt)}) ${g.closed ? ' — مقفولة' : ''}</span>
    </div>
    <div class="topbar">
      <div></div>
      <div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button> <button class="secondary small" id="exportXlsGridBtn">⬇ تصدير Excel</button> <button class="secondary small" id="exportPdfGridBtn">🖨 تصدير PDF (طباعة)</button> <button class="secondary small" id="gridDelBtn">🗑️ حذف الخطة</button> <button class="secondary small" id="backBtn">🔲 كل خطط الشبكة</button></div>
    </div>

    <div class="section-card">
      <button class="small secondary u-wa" id="gridEditSettingsBtn">⚙️ تعديل إعدادات وخطة السهم</button>
    </div>

    <div class="section-card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <span>رأس المال الحالي المخصص للسهم:</span>
      <input type="number" step="any" id="gridCapitalInput" value="${g.capital}" style="max-width:160px;">
      <button class="small u-wa" id="gridUpdateCapitalBtn">تحديث</button>
    </div>

    <div class="section-card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <span>نسبة ربح الخروج الكلي % (لخروج كل المستويات المفتوحة مع بعض)</span>
      <input type="number" step="any" id="gridExitProfitInput" value="${g.exitProfitPercent??''}" placeholder="مثال: 10" style="max-width:160px;">
      <button class="small u-wa" id="gridUpdateExitProfitBtn">تحديث</button>
    </div>
    ${gsum.exitTargetPrice!=null ? `<div class="info">🎯 لو السعر وصل <strong>${fmt2(gsum.exitTargetPrice)}</strong>، فإن بيع كل المستويات المفتوحة الآن سيحقق نسبة ربح ${g.exitProfitPercent}% على متوسط تكلفتك — المستوى الأقرب لذلك مُبرز باللون الأخضر في الجدول أدناه.</div>` : ''}

    <div class="summary-cards">
      <div class="summary-card"><div class="val">${fmtMoney(gsum.avgCostCurrent)}</div><div class="lbl">متوسط التكلفة الحالي</div></div>
      <div class="summary-card"><div class="val" id="gridSellTarget">${fmtMoney(gsum.avgSellTarget)}</div><div class="lbl" id="gridSellTargetLbl">هدف البيع (متوسط)</div></div>
      <div class="summary-card"><div class="val" id="gridHeldQty">${fmtQty(gsum.heldQty)}</div><div class="lbl">الكمية المتبقية حاليًا</div></div>
      <div class="summary-card"><div class="val">${fmtMoney(gsum.totalInvested)}</div><div class="lbl">إجمالي المبلغ المستثمر</div></div>
      <div class="summary-card"><div class="val ${gsum.expectedProfitIfSoldNow>=0?'pos':'neg'}">${fmtMoney(gsum.expectedProfitIfSoldNow)}</div><div class="lbl">الربح المتوقع لو البيع الآن</div></div>
      <div class="summary-card"><div class="val ${totalProfit>=0?'pos':'neg'}">${fmtMoney(totalProfit)}</div><div class="lbl">الربح المحقق حتى الآن</div></div>
    </div>

    <div id="gridDynTargetNote" class="g-dyn-target" hidden></div>

    <h2 class="u-mt20">موقف السهم على آخر سعر</h2>
    <div class="section-card">
      <div class="summary-cards">
        <div class="summary-card"><div class="val" id="gridStatusLastPriceUsed">-</div><div class="lbl" id="gridStatusLastPriceLbl">آخر سعر للسهم (متأخر 15 دقيقة)</div></div>
        <div class="summary-card"><div class="val" id="gridStatusTotalValue">-</div><div class="lbl">القيمة الحالية للكمية المملوكة</div></div>
        <div class="summary-card"><div class="val" id="gridStatusUnreal">-</div><div class="lbl">الربح / الخسارة على آخر سعر</div></div>
        <div class="summary-card"><div class="val" id="gridStatusDropPercent">-</div><div class="lbl">نسبة السعر عن متوسط التكلفة</div></div>
        <div class="summary-card"><div class="val" id="gridStatusNext">-</div><div class="lbl">أقرب حد شراء / بيع</div></div>
      </div>
      <details class="u-mt10"><summary class="u-fs12">🧪 سعر افتراضي للتجربة (اختياري)</summary>
        <label class="u-fs12">اكتب سعرًا لترى الحسابات عليه — لا يُحفظ، وعند مسحه يرجع الحساب على آخر سعر للسهم</label>
        <input type="number" step="any" id="gridManualLastPriceInput" value="" placeholder="مثال: 45.20" style="font-weight:bold;font-size:16px;max-width:220px;">
      </details>
      <div id="rangeAlertWrap" class="u-mt10"><div id="rangeAlert"></div></div>
    </div>

    <h2 class="u-mt20">منحنى الربح التراكمي</h2>
    <div class="section-card" id="curveWrap"></div>

    <h2 class="u-mt20">مستويات الشبكة</h2>
    <button class="secondary small u-wa" id="gridToggleDatesBtn">📅 إظهار/إخفاء أعمدة التواريخ</button>
    <div class="section-card u-ox">
      <table id="gridLevelsTable" class="dates-hidden glv" data-g-rows="7" data-glv-key="grid|${escapeHtml(symbol)}">
        <thead><tr>
          <th>المستوى</th><th>السعر المخطط</th><th>الكمية الإرشادية</th><th>الحالة</th>
          <th>كمية الشراء</th><th>سعر الشراء</th><th>قيمة الشراء</th><th>هدف البيع</th>
          <th>الكمية المباعة</th><th>متوسط سعر البيع</th><th>الكمية المتبقية</th>
          <th>المتبقي تراكمي</th><th>متوسط التكلفة تراكمي</th>
          <th>الربح المحقق</th><th>ربح/خسارة على آخر سعر</th><th>دورات</th>
          <th class="date-col">تاريخ الشراء</th><th class="date-col">آخر بيع</th>
          <th>إجراءات</th>
        </tr></thead>
        <tbody id="gridLevelsBody"></tbody>
      </table>
    </div>

    <h2 class="u-mt20">سجل الصفقات المغلقة — ${symbol}</h2>
    <div id="gridClosedTradesWrap"></div>

    <h2 class="u-mt20">بيع كل الكمية المتبقية في كل المستويات (خروج فوري من كل المراكز المفتوحة)</h2>
    <div class="section-card">
      <div class="info" id="gridSellAllInfo">لا توجد كمية مشتراة حاليًا لبيعها.</div>
      <label>اكتب هنا السعر الفعلي الذي ستبيع به الآن (سيُطبَّق على كل المستويات المفتوحة دفعة واحدة)</label>
      <input type="number" step="any" id="sellAllPrice" placeholder="مثال: 45.20" style="font-weight:bold;color:#111;font-size:16px;">
      <div style="font-size:11px;color:#888;margin-top:4px;">هذا ليس سعرًا تلقائيًا — يجب أن تكتب سعر البورصة الحالي بنفسك.</div>
      <button id="sellAllBtn" class="danger u-mt8">بيع كل الكمية المتبقية الآن</button>
      <div id="sellAllResult"></div>
    </div>

    <h2 class="u-mt20">${g.closed ? 'إعادة فتح الخطة' : 'إغلاق الخطة'}</h2>
    <div class="section-card">
      <p style="font-size:12.5px;color:#666;">${g.closed ? 'هذه الخطة مغلقة حاليًا ولا تظهر كنشطة. يمكنك فتحها مرة أخرى متى شئت.' : 'إغلاق الخطة يوقف التنبيهات والتتبع النشط لها دون حذف أي بيانات — يمكنك فتحها مرة أخرى متى شئت.'}</p>
      <button id="toggleCloseBtn" class="${g.closed ? '' : 'danger'}">${g.closed ? 'إعادة فتح الخطة' : 'إغلاق الخطة'}</button>
    </div>
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();
  document.getElementById('backBtn').onclick=()=>renderGridPlansList();
  document.getElementById('gridEditSettingsBtn').onclick=()=>renderGridEditPlanSettings(symbol);
  document.getElementById('gridToggleDatesBtn').onclick=()=>{ document.getElementById('gridLevelsTable').classList.toggle('dates-hidden'); };
  document.getElementById('gridDelBtn').onclick = () => gDeletePlan('grid', symbol, () => renderGridPlansList());

  (function renderCurveInline(){
    const points = g.cycleHistory.map(c => ({ label: c.date, value: c.cumulative }));
    const chartImg = renderCumulativeProfitChart(points, `الربح التراكمي — ${symbol}`);
    document.getElementById('curveWrap').innerHTML = `<img src="${chartImg}" style="width:100%;border-radius:8px;">`;
  })();

  document.getElementById('exportXlsGridBtn').onclick = () => {
    const points = g.cycleHistory.map(c => ({ label: c.date, value: c.cumulative }));
    const chartImg = renderCumulativeProfitChart(points, `الربح التراكمي — ${symbol}`);
    const rowsHtml = g.levels.map(lv => `<tr>
      <td>${lv.plannedPrice}</td>
      <td>${lv.status==='empty'?'فارغ':'مشترى - بانتظار البيع'}</td>
      <td>${lv.executedPrice ?? ''}</td><td>${lv.executedQty ?? ''}</td>
      <td>${lv.sellTargetPrice!=null?lv.sellTargetPrice.toFixed(3):''}</td>
      <td>${(lv.sells||[]).map(s=>`${s.qty}@${s.price}`).join(', ')}</td><td>${lv.cycles||0}</td>
    </tr>`).join('');
    const html = `<html><head><meta charset="UTF-8"></head><body dir="rtl">
      ${reportLogoHeaderHtml()}
      <h1 style="color:#14532d;">GRIFFINE — تقرير خطة شبكة: ${symbol}</h1>
      <p>السوق: ${g.market||'-'} | رأس المال: ${g.capital} | حجم الصفقة: ${g.tradeSize} | النطاق: ${g.rangeLow} إلى ${g.rangeHigh} | تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}</p>
      <table border="1" style="width:100%;border-collapse:collapse;">
        <tr style="background:#14532d;color:#fff;"><th>المستوى المخطط</th><th>الحالة</th><th>سعر شراء فعلي</th><th>كمية شراء</th><th>هدف بيع</th><th>عمليات بيع فعلي</th><th>دورات</th></tr>
        ${rowsHtml}
      </table>
      <div style="margin-top:16px;font-size:14px;background:#f0f4f2;padding:10px;border-radius:8px;">
        <strong>الإجمالي:</strong> دورات مكتملة: ${g.levels.reduce((s,l)=>s+(l.cycles||0),0)} | الربح الإجمالي المحقق: ${totalProfit.toFixed(2)}
      </div>
      </body></html>`;
    buildAndDownloadMhtmlXls(html, chartImg, `griffine_${symbol}_تقرير_شبكة.xls`);
  };

  document.getElementById('exportPdfGridBtn').onclick = () => {
    const w = window.open('', '_blank');
    const rowsHtml = g.levels.map(lv => `<tr>
      <td>${lv.plannedPrice}</td>
      <td>${lv.status==='empty'?'فارغ':'مشترى - بانتظار البيع'}</td>
      <td>${lv.executedPrice ?? '-'}</td><td>${lv.executedQty ?? '-'}</td>
      <td>${lv.sellTargetPrice!=null?lv.sellTargetPrice.toFixed(3):'-'}</td>
      <td>${(lv.sells||[]).map(s=>`${s.qty}@${s.price}`).join(', ') || '-'}</td><td>${lv.cycles||0}</td>
    </tr>`).join('');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير خطة شبكة ${symbol}</title>
      <style>body{font-family:IBM Plex Sans Arabic,Tahoma,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin-top:14px;}
      th,td{border:1px solid #ccc;padding:8px;text-align:center;font-size:13px;} th{background:#14532d;color:#fff;}
      h1{color:#14532d;} .agg{margin-top:16px;font-size:14px;background:#f0f4f2;padding:10px;border-radius:8px;}</style></head>
      <body>
      ${reportLogoHeaderHtml()}
      <h1>GRIFFINE — تقرير خطة شبكة: ${symbol}</h1>
      <p>السوق: ${g.market||'-'} | رأس المال: ${g.capital} | حجم الصفقة: ${g.tradeSize} | النطاق: ${g.rangeLow} إلى ${g.rangeHigh} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
      <table><thead><tr><th>المستوى المخطط</th><th>الحالة</th><th>سعر شراء فعلي</th><th>كمية شراء</th><th>هدف بيع</th><th>عمليات بيع فعلي</th><th>دورات</th></tr></thead>
      <tbody>${rowsHtml}</tbody></table>
      <div class="agg"><strong>الإجمالي:</strong> دورات مكتملة: ${g.levels.reduce((s,l)=>s+(l.cycles||0),0)} | الربح الإجمالي المحقق: ${totalProfit.toFixed(2)}</div>
      
      </body></html>`);
    w.document.close(); gReportReady(w);
  };

  renderClosedTradesUI('gridClosedTradesWrap', () => g.closedTrades, {
    afterChange: async () => { await persist(); },
    onClearAll: async () => { g.closedTrades = []; await persist(); },
    onExportXlsx: (trades) => {
      const exAgg = trades.reduce((acc,t)=>({qty:acc.qty+t.totalQty, capital:acc.capital+t.capitalUsed, profit:acc.profit+t.profit}), {qty:0,capital:0,profit:0});
      const exPct = exAgg.capital>0 ? (exAgg.profit/exAgg.capital*100) : 0;
      const rowsHtml = trades.slice().reverse().map(ct=>`<tr>
        <td>${formatDateTimeAr(ct.closedDate)}</td><td>${fmtQty(ct.totalQty)}</td><td>${fmt2(ct.avgEntry)}</td>
        <td>${fmt2(ct.avgExit)}</td><td>${ct.profit.toFixed(2)}</td><td>${ct.profitPercent.toFixed(2)}%</td><td>${ct.capitalUsed.toFixed(2)}</td>
      </tr>`).join('');
      const html = `<html><head><meta charset="UTF-8"></head><body dir="rtl">
        ${reportLogoHeaderHtml()}
        <h1 style="color:#14532d;">GRIFFINE — سجل الصفقات المغلقة (شبكة): ${symbol}</h1>
        <p>تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}</p>
        <table border="1" style="width:100%;border-collapse:collapse;">
          <tr style="background:#14532d;color:#fff;"><th>تاريخ ووقت الإغلاق</th><th>الكمية</th><th>متوسط الدخول</th><th>متوسط الخروج</th><th>الربح</th><th>نسبة الربح</th><th>رأس المال المستخدم</th></tr>
          ${rowsHtml}
        </table>
        <div style="margin-top:16px;font-size:14px;background:#f0f4f2;padding:10px;border-radius:8px;">
          <strong>الإجمالي:</strong> الكمية: ${fmtQty(exAgg.qty)} | رأس المال: ${exAgg.capital.toFixed(2)} | الربح: ${exAgg.profit.toFixed(2)} | النسبة: ${exPct.toFixed(2)}%
        </div>
        </body></html>`;
      buildAndDownloadMhtmlXls(html, null, `griffine_${symbol}_صفقات_مغلقة_شبكة.xls`);
    },
    onExportPdf: (trades) => {
      const w = window.open('', '_blank');
      const exAgg = trades.reduce((acc,t)=>({qty:acc.qty+t.totalQty, capital:acc.capital+t.capitalUsed, profit:acc.profit+t.profit}), {qty:0,capital:0,profit:0});
      const exPct = exAgg.capital>0 ? (exAgg.profit/exAgg.capital*100) : 0;
      const rowsHtml = trades.slice().reverse().map(ct=>`<tr>
        <td>${formatDateTimeAr(ct.closedDate)}</td><td>${fmtQty(ct.totalQty)}</td><td>${fmt2(ct.avgEntry)}</td>
        <td>${fmt2(ct.avgExit)}</td><td>${fmt2(ct.profit)}</td><td>${ct.profitPercent.toFixed(2)}%</td><td>${fmt2(ct.capitalUsed)}</td>
      </tr>`).join('');
      w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>سجل صفقات مغلقة ${symbol}</title>
        <style>body{font-family:IBM Plex Sans Arabic,Tahoma,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin-top:14px;}
        th,td{border:1px solid #ccc;padding:8px;text-align:center;font-size:13px;} th{background:#14532d;color:#fff;}
        h1{color:#14532d;} .agg{margin-top:16px;font-size:14px;background:#f0f4f2;padding:10px;border-radius:8px;}</style></head>
        <body>
        ${reportLogoHeaderHtml()}
        <h1>GRIFFINE — سجل الصفقات المغلقة (شبكة): ${symbol}</h1>
        <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
        <table><thead><tr><th>تاريخ ووقت الإغلاق</th><th>الكمية</th><th>متوسط الدخول</th><th>متوسط الخروج</th><th>الربح</th><th>نسبة الربح</th><th>رأس المال المستخدم</th></tr></thead>
        <tbody>${rowsHtml}</tbody></table>
        <div class="agg"><strong>الإجمالي:</strong> الكمية: ${fmtQty(exAgg.qty)} | رأس المال: ${exAgg.capital.toFixed(2)} | الربح: ${exAgg.profit.toFixed(2)} | النسبة: ${exPct.toFixed(2)}%</div>
        
        </body></html>`);
      w.document.close(); gReportReady(w);
    },
  });

  document.getElementById('toggleCloseBtn').onclick = async () => {
    g.closed = !g.closed;
    await persist();
    renderGridPlanDetail(symbol);
  };

  document.getElementById('gridUpdateCapitalBtn').onclick = async () => {
    const newCap = parseFloat(document.getElementById('gridCapitalInput').value);
    if (!newCap || newCap<=0) { alert('أدخل رأس مال أكبر من صفر'); return; }
    g.capital = newCap;
    await persist();
    renderGridPlanDetail(symbol);
  };

  document.getElementById('gridUpdateExitProfitBtn').onclick = async () => {
    const val = parseFloat(document.getElementById('gridExitProfitInput').value);
    g.exitProfitPercent = (!isNaN(val) && val>0) ? val : null;
    await persist();
    renderGridPlanDetail(symbol);
  };

  // الإصدار 97: الحسابات على آخر سعر للسهم (متأخر 15 دقيقة) - أو سعر التجربة لو اتكتب - ولو السعر مش متاح ← آخر تنفيذ
  const gPxKey = String(symbol).toUpperCase() + '|' + (g.market || 'مصر');
  let gLivePx = (window.__mkLivePx || {})[gPxKey] || null;
  document.getElementById('gridManualLastPriceInput').addEventListener('input', updateStatusCards);
  function updateStatusCards(){
    gsum = computeGridSummary();
    const inp = document.getElementById('gridManualLastPriceInput'); if (!inp) return;
    const manualVal = parseFloat(inp.value);
    const lastExec = (() => { const ex = g.levels.flatMap(l => [l.executedPrice, ...(l.sells||[]).map(s=>s.price)]).filter(p => p != null); return ex.length ? ex[ex.length-1] : null; })();
    const lastPrice = manualVal > 0 ? manualVal : (gLivePx || lastExec);
    const lbl = document.getElementById('gridStatusLastPriceLbl');
    if (lbl) lbl.textContent = g.listed === false ? 'آخر سعر (يدوي — سهم غير مدرج)' : manualVal > 0 ? 'سعر افتراضي للتجربة' : (gLivePx ? 'آخر سعر للسهم (متأخر 15 دقيقة)' : 'آخر تنفيذ (سعر السوق غير متاح الآن)');
    document.getElementById('gridStatusLastPriceUsed').textContent = lastPrice!=null ? fmtMoney(lastPrice) : '-';
    document.getElementById('gridStatusTotalValue').textContent = (lastPrice!=null && gsum.heldQty>0) ? fmtMoney(lastPrice*gsum.heldQty) : '-';
    const dropEl = document.getElementById('gridStatusDropPercent'), unEl = document.getElementById('gridStatusUnreal');
    if (lastPrice!=null && gsum.avgCostCurrent>0 && gsum.heldQty>0) {
      const pct = (lastPrice-gsum.avgCostCurrent)/gsum.avgCostCurrent*100, pnl = (lastPrice-gsum.avgCostCurrent)*gsum.heldQty;
      dropEl.textContent = (pct>0?'+':'') + pct.toFixed(2)+'%'; dropEl.className = 'val ' + (pct<0?'neg':'pos');
      unEl.textContent = fmtMoney(pnl); unEl.className = 'val ' + (pnl<0?'neg':'pos');
    } else { dropEl.textContent = '-'; dropEl.className = 'val'; unEl.textContent = '-'; unEl.className = 'val'; }
    // أقرب حد شراء (أعلى مستوى فاضي تحت/عند السعر) وأقرب حد بيع (أقل هدف بيع لمستوى مشترى)
    const nb = g.levels.filter(l => l.status !== 'bought' && +l.plannedPrice > 0).map(l => +l.plannedPrice).sort((a, b) => b - a)[0];
    const ns = g.levels.filter(l => l.status === 'bought' && l.executedQty > 0 && +l.sellTargetPrice > 0).map(l => +l.sellTargetPrice).sort((a, b) => a - b)[0];
    const nxEl = document.getElementById('gridStatusNext');
    if (nxEl) nxEl.innerHTML = `${nb ? `شراء ${fmt2(nb)}${lastPrice!=null && lastPrice <= nb ? ' ✅' : ''}` : 'شراء -'}<br>${ns ? `بيع ${fmt2(ns)}${lastPrice!=null && lastPrice >= ns ? ' ✅' : ''}` : 'بيع -'}`;
    glvFillUnreal('gridLevelsTable', lastPrice);
    gGridDynTargetPaint(g, lastPrice, manualVal > 0);

    const alertEl = document.getElementById('rangeAlert');
    if (lastPrice == null) {
      alertEl.innerHTML = '<p class="u-note">لا يوجد تنفيذ فعلي مسجّل بعد.</p>';
    } else if (lastPrice < g.rangeLow) {
      alertEl.innerHTML = `<div class="error">⚠️ آخر سعر مسجّل (${lastPrice}) كسر قاع النطاق (${g.rangeLow}) — قد تكون فرضية التذبذب لم تعد صحيحة. القرار قرارك الشخصي (الاحتفاظ حتى الارتداد، أو بيع كل الكمية من القسم أدناه).</div>`;
    } else if (lastPrice > g.rangeHigh) {
      alertEl.innerHTML = `<div class="info">📈 آخر سعر مسجّل (${lastPrice}) كسر سقف النطاق (${g.rangeHigh}) للأعلى — هذا تنبيه فقط، يمكنك ترك الباقي يعمل أو مراجعة النطاق.</div>`;
    } else {
      alertEl.innerHTML = `<div class="info">آخر سعر مسجّل: <strong>${lastPrice}</strong> — ما زال داخل النطاق (${g.rangeLow} - ${g.rangeHigh}).</div>`;
    }

    const sellAllInfo = document.getElementById('gridSellAllInfo');
    if (gsum.heldQty > 0) {
      sellAllInfo.textContent = `إجمالي الكمية المتبقية في كل المستويات المشتراة: ${fmtQty(gsum.heldQty)} — متوسط سعر الشراء: ${fmtMoney(gsum.avgCostCurrent)}`;
    } else {
      sellAllInfo.textContent = 'لا توجد كمية مشتراة حاليًا لبيعها.';
    }
  }

  async function persist(){
    grids[symbol] = g;
    await saveGridPlans(email, grids);
  }

  // ترحيل دورة مكتملة لسجل الصفقات المغلقة + منحنى الربح، ويظهر إشعار للمستخدم زي ما بيحصل في DCA
  function closeCycle(lv, closeDate){
    lv.cycles = (lv.cycles || 0) + 1;
    const totalSoldQty = lv.sells.reduce((s,sl)=>s+sl.qty, 0);
    const totalCycleProfit = lv.sells.reduce((s,sl)=>s+((sl.price-lv.executedPrice)*sl.qty), 0);
    const avgExit = totalSoldQty>0 ? lv.sells.reduce((s,sl)=>s+(sl.price*sl.qty),0)/totalSoldQty : lv.executedPrice;
    const capitalUsed = totalSoldQty * lv.executedPrice;
    const prevCum = g.cycleHistory.length ? g.cycleHistory[g.cycleHistory.length-1].cumulative : 0;
    g.cycleHistory.push({ date: closeDate, profit: totalCycleProfit, cumulative: prevCum + totalCycleProfit });
    g.closedTrades.push({
      closedDate: closeDate, totalQty: totalSoldQty, avgEntry: lv.executedPrice, avgExit,
      profit: totalCycleProfit, profitPercent: capitalUsed>0 ? (totalCycleProfit/capitalUsed*100) : 0,
      capitalUsed,
    });
    lv.status = 'empty';
    lv.executedQty = null; lv.executedPrice = null; lv.executedDate = null; lv.sellTargetPrice = null; lv.sells = [];
  }

  // نسخة مجمّعة لغلق كل المستويات المفتوحة مع بعض كصفقة واحدة مغلقة (صف واحد في السجل) - تُستخدم بس مع "بيع كل الكمية المتبقية"
  function closeCycleCombined(levelsToClose, closeDate){
    let totalSoldQty = 0, totalCapitalUsed = 0, totalProfit = 0, totalExitValue = 0;
    levelsToClose.forEach(lv => {
      const lvSoldQty = lv.sells.reduce((s,sl)=>s+sl.qty, 0);
      const lvProfit = lv.sells.reduce((s,sl)=>s+((sl.price-lv.executedPrice)*sl.qty), 0);
      const lvExitValue = lv.sells.reduce((s,sl)=>s+(sl.price*sl.qty), 0);
      totalSoldQty += lvSoldQty;
      totalCapitalUsed += lvSoldQty * lv.executedPrice;
      totalProfit += lvProfit;
      totalExitValue += lvExitValue;
      lv.cycles = (lv.cycles || 0) + 1;
      lv.status = 'empty';
      lv.executedQty = null; lv.executedPrice = null; lv.executedDate = null; lv.sellTargetPrice = null; lv.sells = [];
    });
    const avgEntry = totalSoldQty>0 ? totalCapitalUsed/totalSoldQty : 0;
    const avgExit = totalSoldQty>0 ? totalExitValue/totalSoldQty : 0;
    const prevCum = g.cycleHistory.length ? g.cycleHistory[g.cycleHistory.length-1].cumulative : 0;
    g.cycleHistory.push({ date: closeDate, profit: totalProfit, cumulative: prevCum + totalProfit });
    g.closedTrades.push({
      closedDate: closeDate, totalQty: totalSoldQty, avgEntry, avgExit,
      profit: totalProfit, profitPercent: totalCapitalUsed>0 ? (totalProfit/totalCapitalUsed*100) : 0,
      capitalUsed: totalCapitalUsed,
    });
  }

  function renderLevels(){
    let exitHighlightIdx = null;
    if (gsum.exitTargetPrice != null) {
      let bestDiff = Infinity;
      g.levels.forEach((lv, idx) => {
        const diff = Math.abs(lv.plannedPrice - gsum.exitTargetPrice);
        if (diff < bestDiff) { bestDiff = diff; exitHighlightIdx = idx; }
      });
    }
    // الإصدار 112: جدول المستويات الجديد - executedQty في الشبكة = الكمية المتبقية (بتقل مع كل بيع) ← كمية الشراء = المتبقي + المباع
    const lvOpen = glvOpenSet('grid|' + symbol);
    const nextIdx = g.levels.findIndex(l => l.status !== 'bought');
    let cumQty = 0, cumInvested = 0;
    const tot = { bq: 0, bv: 0, sq: 0, rem: 0, real: 0, cyc: 0 };
    document.getElementById('gridLevelsBody').innerHTML = g.levels.map((lv, idx) => {
      const bought = lv.status === 'bought';
      const sells = lv.sells || [];
      const soldQ = sells.reduce((a, x) => a + (+x.qty || 0), 0);
      const rem = bought ? Math.max(0, +lv.executedQty || 0) : null;
      const bq = bought ? rem + soldQ : null;
      const soldAvg = soldQ > 0 ? sells.reduce((a, x) => a + x.qty * x.price, 0) / soldQ : null;
      const real = bought ? sells.reduce((a, x) => a + (x.price - lv.executedPrice) * x.qty, 0) : null;
      if (bought && rem > 0) { cumQty += rem; cumInvested += rem * lv.executedPrice; }
      if (bought) { tot.bq += bq; tot.bv += bq * lv.executedPrice; tot.sq += soldQ; tot.rem += rem; tot.real += real; }
      tot.cyc += lv.cycles || 0;
      const isExit = idx === exitHighlightIdx;
      let st = !bought ? (idx === nextIdx ? glvBadge('فارغ — القادم', 'next') : glvBadge('فارغ', 'empty'))
        : rem <= 1e-6 ? glvBadge('اتباعت كلها — جاهزة للترحيل', 'sold') : soldQ > 0 ? glvBadge('بيع جزئي', 'part') : glvBadge('مشترى — بانتظار البيع', 'held');
      if (isExit) st += ' ' + glvBadge('🎯 نقطة خروج', 'exit');
      let acts = '';
      if (!bought) acts = glvBtn('شراء', '__gridBuyLevel', [idx], { cls: 'glv-buy', title: `شراء عند ${glvN(lv.plannedPrice)}` });
      else {
        if (rem > 1e-6) acts += glvBtn('بيع', '__gridSellAtLevel', [idx, rem], { cls: 'glv-sell', title: `بيع — أقصى كمية ${glvQ(rem)}` });
        else acts += glvBtn('ترحيل', '__gridArchiveCycle', [idx], { cls: 'glv-buy', title: 'ترحيل الدورة لسجل الصفقات المغلقة وبدء دورة جديدة' });
        acts += glvBtn('✎', '__gridStartEditBuy', [idx], { title: 'تعديل الشراء' });
        acts += glvBtn('🗑', '__gridDeleteBuy', [idx], { cls: 'glv-del', title: 'حذف الشراء' });
      }
      const open = lvOpen.has(String(idx));
      const main = `<tr data-lv="${idx}" class="${!bought && idx === nextIdx ? 'glv-next' : ''}${isExit ? ' glv-exit' : ''}">
        ${glvLevelCell(idx + 1, idx, bought ? sells.length : 0, open)}
        ${glvTd(lv.plannedPrice, 'n')}
        ${glvTd(lv.plannedQty, 'q')}
        <td>${st}</td>
        ${glvTd(bq, 'q')}
        ${glvTd(bought ? lv.executedPrice : null, 'n')}
        ${glvTd(bought ? bq * lv.executedPrice : null, 'n')}
        ${glvTd(bought ? lv.sellTargetPrice : null, 'n')}
        ${glvTd(soldQ || null, 'q')}
        ${glvTd(soldAvg, 'n')}
        ${glvTd(rem, 'q', 'glv-hi')}
        ${glvTd(bought && cumQty > 0 ? cumQty : null, 'q')}
        ${glvTd(bought && cumQty > 0 ? cumInvested / cumQty : null, 'n')}
        ${glvTd(real, 'pl')}
        <td class="glv-n lv-unreal" data-q="${bought ? rem : 0}" data-p="${bought ? (+lv.executedPrice || 0) : 0}">—</td>
        ${glvTd(lv.cycles || 0, 'q')}
        <td class="date-col glv-n glv-dim">${bought && lv.executedDate ? escapeHtml(String(lv.executedDate).slice(0, 10)) : '—'}</td>
        <td class="date-col glv-n glv-dim">${sells.length ? escapeHtml(String(sells[sells.length - 1].date || '').slice(0, 10)) || '—' : '—'}</td>
        <td><span class="glv-acts">${acts}</span></td>
      </tr>`;
      const subs = bought ? sells.map((sl, k) => `<tr class="g-subrow${open ? '' : ' g-sub-closed'}" data-sub-of="${idx}">
        <td><span class="glv-subtag">بيع ${k + 1}</span></td><td></td><td></td><td><span class="glv-subtag">عملية بيع</span></td>
        <td></td><td></td><td></td><td></td>
        ${glvTd(sl.qty, 'q')}${glvTd(sl.price, 'n')}<td></td><td></td><td></td>
        ${glvTd((sl.price - lv.executedPrice) * sl.qty, 'pl')}<td></td><td></td>
        <td class="date-col"></td><td class="date-col glv-n glv-dim">${sl.date ? escapeHtml(String(sl.date).slice(0, 10)) : '—'}</td>
        <td><span class="glv-acts">${glvBtn('✎', '__gridStartEditSell', [idx, k], { title: 'تعديل البيع' })}${glvBtn('🗑', '__gridRemoveSell', [idx, k], { cls: 'glv-del', title: 'حذف البيع' })}</span></td>
      </tr>`).join('') : '';
      return main + subs;
    }).join('') + `<tr class="g-total"><td>الإجمالي</td><td></td><td></td><td></td>${glvTd(tot.bq, 'q')}<td></td>${glvTd(tot.bv, 'n')}<td></td>${glvTd(tot.sq, 'q')}<td></td>${glvTd(tot.rem, 'q', 'glv-hi')}<td></td><td></td>${glvTd(tot.real, 'pl')}<td class="glv-n lv-unreal-total">—</td>${glvTd(tot.cyc, 'q')}<td class="date-col"></td><td class="date-col"></td><td></td></tr>`;

    updateStatusCards();
  }
  renderLevels();
  if (g.listed === false) { gLivePx = +g.manualLastPrice > 0 ? +g.manualLastPrice : null; gUnlistedPriceBox('gridManualLastPriceInput', g, async (v) => { g.manualLastPrice = v; await persist(); gLivePx = v; updateStatusCards(); }); updateStatusCards(); }
  else gPlanLivePrice(__tok, {}, { [symbol]: g }, gPxKey, (v) => { gLivePx = v; updateStatusCards(); });

  // الإصدار 112: الشراء / التعديل / البيع من نافذة إدخال - نفس قواعد رأس المال والكمية
  window.__gridBuyLevel = (idx) => {
    const lv0 = g.levels[idx];
    glvModal({ title: `شراء — المستوى ${idx + 1}`, sub: `السعر المخطط ${glvN(lv0.plannedPrice)}${lv0.plannedQty ? ` — الكمية الإرشادية ${glvQ(lv0.plannedQty)}` : ''}`, q: lv0.plannedQty, p: +(+lv0.plannedPrice).toFixed(2),
      onSave: async (v) => {
        const gridsNow = await getGridPlans(email);
        const gNow = gridsNow[symbol];
        const invested = gNow.levels.filter(l => l.status === 'bought').reduce((a, l) => a + (l.executedQty * l.executedPrice), 0);
        const remainingBudget = gNow.capital - invested;
        if (v.q * v.p > remainingBudget + 1e-6) return `⚠️ المبلغ (${glvN(v.q * v.p)}) أكبر من المتاح من رأس المال (${glvN(Math.max(remainingBudget, 0))}).`;
        const lv = gNow.levels[idx];
        lv.executedQty = v.q; lv.executedPrice = v.p; lv.executedDate = v.d;
        lv.status = 'bought'; lv.sells = [];
        lv.sellTargetPrice = Number((v.p + gNow.step).toFixed(4));
        grids = gridsNow; g = gNow;
        await persist();
        renderGridPlanDetail(symbol);
      } });
  };
  window.__gridStartEditBuy = (idx) => {
    const lv = g.levels[idx];
    const soldQ = (lv.sells || []).reduce((a, x) => a + x.qty, 0);
    glvModal({ title: `تعديل الشراء — المستوى ${idx + 1}`, sub: soldQ ? `اتباع من المستوى ده ${glvQ(soldQ)} — الكمية لازم تكون ${glvQ(soldQ)} أو أكتر` : 'عدّل الكمية أو السعر أو التاريخ',
      q: (+lv.executedQty || 0) + soldQ, p: lv.executedPrice, d: lv.executedDate,
      onSave: async (v) => {
        if (v.q < soldQ - 1e-9) return `الكمية لازم تكون ${glvQ(soldQ)} أو أكتر (الكمية المباعة).`;
        const othersInvested = g.levels.filter((l, i) => i !== idx && l.status === 'bought').reduce((a, l) => a + (l.executedQty * l.executedPrice), 0);
        const remainingBudget = g.capital - othersInvested;
        if ((v.q - soldQ) * v.p > remainingBudget + 1e-6) return `⚠️ المبلغ الجديد أكبر من المتاح. أقصى مبلغ للمستوى ده ${glvN(Math.max(remainingBudget, 0))}.`;
        lv.executedQty = Number((v.q - soldQ).toFixed(6)); lv.executedPrice = v.p; lv.executedDate = v.d;
        lv.sellTargetPrice = Number((v.p + g.step).toFixed(4));
        await persist();
        renderGridPlanDetail(symbol);
      } });
  };
  window.__gridDeleteBuy = async (idx) => {
    const lv = g.levels[idx];
    const hasSells = (lv.sells||[]).length > 0;
    const msg = hasSells
      ? 'هذا المستوى عليه عمليات بيع مسجلة، وحذف الشراء سيلغي عمليات البيع هذه أيضًا. هل أنت متأكد؟'
      : 'هل أنت متأكد من إلغاء عملية الشراء هذه؟';
    if(!await gConfirm(msg)) return;
    lv.status = 'empty';
    lv.executedQty = null; lv.executedPrice = null; lv.executedDate = null; lv.sellTargetPrice = null; lv.sells = [];
    window.__gridEditingBuy = null;
    await persist();
    renderGridPlanDetail(symbol);
  };

  window.__gridSellAtLevel = (idx, maxQty) => {
    const lv = g.levels[idx];
    // الإصدار 115: السعر = آخر سعر للسهم (متأخر 15 دقيقة) أوتوماتيك ، ولو مش متاح ← هدف البيع - وتقدر تكتب سعر تاني
    const px = gLivePx > 0 ? gLivePx : null;
    glvModal({ title: `بيع — المستوى ${idx + 1}`, sub: `الكمية المتاحة للبيع ${glvQ(maxQty)} — سعر الشراء ${glvN(lv.executedPrice)} — هدف البيع ${glvN(lv.sellTargetPrice)}`,
      q: maxQty, p: px != null ? +px.toFixed(2) : (lv.sellTargetPrice != null ? +(+lv.sellTargetPrice).toFixed(2) : ''), maxQ: maxQty,
      cost: +lv.executedPrice, costLbl: 'سعر شراء المستوى', okText: 'تنفيذ البيع',
      pxNote: px != null ? `السعر = آخر سعر للسهم (متأخر 15 دقيقة) ${glvN(px)} — تقدر تكتب سعر تاني والحساب هيمشي عليه.` : 'آخر سعر للسهم غير متاح الآن — السعر المكتوب هو هدف البيع، وتقدر تغيّره.',
      onSave: async (v) => {
        if (!lv.sells) lv.sells = [];
        lv.sells.push({ qty: v.q, price: v.p, date: v.d });
        lv.executedQty = Number((lv.executedQty - v.q).toFixed(6));
        glvOpenSet('grid|' + symbol).add(String(idx));
        await persist();
        renderGridPlanDetail(symbol);
      } });
  };
  window.__gridArchiveCycle = async (idx) => {
    const lv = g.levels[idx];
    closeCycle(lv, new Date().toISOString());
    await persist();
    renderGridPlanDetail(symbol);
  };
  window.__gridStartEditSell = (idx, sIdx) => {
    const lv = g.levels[idx], cur = (lv.sells || [])[sIdx]; if (!cur) return;
    const maxAllowed = (+lv.executedQty || 0) + cur.qty;
    glvModal({ title: `تعديل البيع ${sIdx + 1} — المستوى ${idx + 1}`, sub: `أقصى كمية ${glvQ(maxAllowed)}`, q: cur.qty, p: cur.price, d: cur.date, maxQ: maxAllowed, cost: +lv.executedPrice, costLbl: 'سعر شراء المستوى',
      onSave: async (v) => {
        lv.sells[sIdx] = { qty: v.q, price: v.p, date: v.d };
        lv.executedQty = Number((maxAllowed - v.q).toFixed(6));
        await persist();
        renderGridPlanDetail(symbol);
      } });
  };
  window.__gridRemoveSell = async (idx, sIdx) => {
    if(!await gConfirm('هل أنت متأكد من حذف عملية البيع هذه؟')) return;
    const lv = g.levels[idx];
    const removedQty = lv.sells[sIdx].qty;
    lv.sells.splice(sIdx,1);
    lv.executedQty = Number((lv.executedQty + removedQty).toFixed(6));
    window.__gridEditingSell = null;
    await persist();
    renderGridPlanDetail(symbol);
  };

  document.getElementById('sellAllBtn').onclick = async () => {
    const price = parseFloat(document.getElementById('sellAllPrice').value);
    const resultEl = document.getElementById('sellAllResult');
    if (!price || price<=0) { resultEl.innerHTML = '<div class="error u-mt8">أدخل سعر بيع صحيح.</div>'; return; }
    const boughtLevels = g.levels.filter(l=>l.status==='bought' && l.executedQty>0);
    if (!boughtLevels.length) { resultEl.innerHTML = '<div class="error u-mt8">لا توجد كمية مشتراة حاليًا لبيعها.</div>'; return; }
    if (!await gConfirm(`ستبيع إجمالي ${fmtQty(boughtLevels.reduce((s,l)=>s+l.executedQty,0))} سهم بسعر ${price} على كل المستويات المفتوحة، وهترحّل كصفقة واحدة مغلقة. متأكد؟`)) return;
    const closeDate = new Date().toISOString().slice(0,10);
    const closeDateTime = new Date().toISOString();
    const totalQtySold = boughtLevels.reduce((s,l)=>s+l.executedQty, 0);
    boughtLevels.forEach(lv=>{
      lv.sells.push({ qty: lv.executedQty, price, date: closeDate });
    });
    closeCycleCombined(boughtLevels, closeDateTime);
    g.manualExits.push({ qty: totalQtySold, price, date: closeDate, note: 'بيع كل الكمية المتبقية في كل المستويات' });
    await persist();
    renderGridPlanDetail(symbol);
    setTimeout(()=>alert('✅ تم بيع كل الكمية المتبقية على كل المستويات، وتم ترحيلها كصفقة واحدة مغلقة في السجل أدناه.'), 150);
  };
}

/* ================== تعديل إعدادات وخطة سهم شبكة قائم - بنفس فلسفة تعديل خطة DCA ================== */
async function renderGridEditPlanSettings(symbol, error){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderGridEditPlanSettings(symbol));
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;
  const grids = await getGridPlans(email);
  const g = grids[symbol];
  if(!g) return renderGridPlansList();
  const hasBought = g.levels.some(l=>l.status==='bought');

  if (hasBought) {
    window.__lastPageKey='grid_edit_plan_settings'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}<h2>تعديل إعدادات خطة ${symbol}</h2>
      <div class="error">توجد مستويات مشتراة حاليًا في هذه الخطة، لذلك لا يمكن تغيير النطاق أو عدد المستويات أو طريقة توزيع الكمية الآن (سيؤدي ذلك إلى بعثرة حساب المستويات الحالية). بِع كل المستويات المفتوحة ورحّلها أولًا (من شاشة الخطة)، ثم عُد هنا وغيّر ما تريد.</div>
      <div class="info">ما زال بإمكانك تعديل رأس المال ونسبة ربح الخروج الكلي من شاشة الخطة نفسها دون أي قيود.</div>
      <div class="muted-link"><a id="cancelBtn">رجوع لشاشة الخطة</a></div></div>`;
    document.getElementById('cancelBtn').onclick = () => renderGridPlanDetail(symbol);
    return;
  }

  window.__lastPageKey='grid_edit_plan_settings'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}<h2>تعديل إعدادات خطة ${symbol}</h2>
    <div class="info">لا توجد مستويات مشتراة حاليًا في هذه الخطة، لذلك يمكنك تغيير أي شيء بحرية كاملة — ستُولَّد مستويات الشبكة من جديد بناءً على القيم الجديدة.</div>
    ${error?`<div class="error">${error}</div>`:''}
    <form id="gridEditForm">
      <label>السوق</label>
      <select id="ge_market">
        <option value="مصر">مصر (EGX)</option>
        <option value="السعودية">السعودية</option>
        <option value="الإمارات">الإمارات</option>
        <option value="قطر">قطر</option>
        <option value="الكويت">الكويت</option>
      </select>
      <label>رأس المال المخصص لهذا السهم</label>
      <input type="number" step="any" id="ge_capital" required value="${g.capital}">
      <label>نسبة المخاطرة % (تحدد حجم كل صفقة تلقائيًا)</label>
      <input type="number" step="any" id="ge_risk" required value="${g.risk}">
      <div class="info" id="ge_tradeSizePreview" style="display:none;"></div>
      <label>سعر السهم الحالي</label>
      <input type="number" step="any" id="ge_currentPrice" value="${g.currentPrice??''}">
      <div class="grid2">
        <div><label>سقف النطاق (أعلى سعر)</label><input type="number" step="any" id="ge_high" required value="${g.rangeHigh}"></div>
        <div><label>قاع النطاق (أقل سعر)</label><input type="number" step="any" id="ge_low" required value="${g.rangeLow}"></div>
      </div>
      <label>عدد المستويات</label>
      <input type="number" id="ge_levels" required value="${g.levels.length}">

      <label style="margin-top:16px;">طريقة توزيع الكمية على المستويات</label>
      <div class="radio-row" style="display:flex;gap:16px;margin:6px 0 12px;flex-wrap:wrap;">
        <label class="u-check"><input type="radio" name="ge_qtyMode" value="equal" checked> توزيع متساوٍ (تلقائي)</label>
        <label class="u-check"><input type="radio" name="ge_qtyMode" value="manual"> تحديد يدوي لكل مستوى</label>
        <label class="u-check"><input type="radio" name="ge_qtyMode" value="progressive"> زيادة الكمية بنسبة المخاطرة مع كل مستوى</label>
      </div>
      <button type="button" id="geGenLevelsBtn" class="secondary">توليد جدول المستويات الجديد</button>
    </form>

    <div id="geLevelsPreviewWrap" style="display:none;margin-top:16px;">
      <h2>جدول المستويات الجديد — عدّل الكمية الإرشادية لو حابب</h2>
      <div class="section-card u-ox">
        <table>
          <thead><tr><th>#</th><th>السعر المخطط</th><th>الكمية الإرشادية</th></tr></thead>
          <tbody id="geLevelsPreviewBody"></tbody>
        </table>
      </div>
      <button id="geSaveBtn" class="u-mt14">حفظ التعديلات</button>
    </div>
    <div class="muted-link"><a id="cancelBtn">إلغاء والرجوع</a></div></div>`;

  document.getElementById('ge_market').value = g.market || 'مصر';
  document.getElementById('cancelBtn').onclick = () => renderGridPlanDetail(symbol);
  // الإصدار 111: النطاق تلقائي/يدوي - الخطط القديمة (من غير اختيار محفوظ) بتفتح «يدوي» عشان السقف والقاع المحفوظين ميتغيروش لوحدهم
  const geRange = gWireGridRange({ prefix: 'ge', getSym: () => symbol, mktId: 'ge_market', highId: 'ge_high', lowId: 'ge_low', isListed: () => g.listed !== false,
    mode: g.rangeMode || 'manual', period: g.rangePeriod || 'month', fillOnStart: false });

  function updatePreview(){
    const capital = parseFloat(document.getElementById('ge_capital').value);
    const risk = parseFloat(document.getElementById('ge_risk').value);
    const preview = document.getElementById('ge_tradeSizePreview');
    if (capital > 0 && risk > 0) {
      const tradeSize = capital * risk / 100;
      preview.style.display = '';
      preview.textContent = `حجم كل صفقة: ${tradeSize.toFixed(2)}`;
    } else { preview.style.display = 'none'; }
  }
  document.getElementById('ge_capital').addEventListener('input', updatePreview);
  document.getElementById('ge_risk').addEventListener('input', updatePreview);
  updatePreview();

  let generatedLevels = [];
  document.getElementById('geGenLevelsBtn').onclick = () => {
    const capital = parseFloat(document.getElementById('ge_capital').value);
    const risk = parseFloat(document.getElementById('ge_risk').value);
    const high = parseFloat(document.getElementById('ge_high').value);
    const low = parseFloat(document.getElementById('ge_low').value);
    const numLevels = parseInt(document.getElementById('ge_levels').value);
    if (!capital || !risk || high<=low || !numLevels || numLevels<1) {
      alert('تأكد إن رأس المال ونسبة المخاطرة والنطاق وعدد المستويات كلهم مدخلين صح (السقف أكبر من القاع).');
      return;
    }
    const tradeSize = capital * risk / 100;
    const step = (high - low) / numLevels;
    const qtyMode = document.querySelector('input[name="ge_qtyMode"]:checked').value;
    const baseQty = tradeSize / (high - step);
    generatedLevels = [];
    for (let i = 0; i < numLevels; i++) {
      const price = Number((high - step * (i + 1)).toFixed(4));
      let guidedQty = null;
      if (qtyMode === 'equal') guidedQty = Number((tradeSize/price).toFixed(2));
      else if (qtyMode === 'progressive') guidedQty = Number((baseQty * Math.pow(1 + risk/100, i)).toFixed(2));
      generatedLevels.push({ plannedPrice: price, plannedQty: guidedQty });
    }
    document.getElementById('geLevelsPreviewBody').innerHTML = generatedLevels.map((lv,idx)=>`<tr>
      <td>${idx+1}</td>
      <td>${lv.plannedPrice}</td>
      <td><input type="number" step="any" min="0" id="gePrevQty_${idx}" value="${lv.plannedQty??''}" placeholder="أدخل الكمية" style="max-width:120px;"></td>
    </tr>`).join('');
    document.getElementById('geLevelsPreviewWrap').style.display = '';
  };

  document.getElementById('geSaveBtn').onclick = async () => {
    const market = document.getElementById('ge_market').value;
    const capital = parseFloat(document.getElementById('ge_capital').value);
    const risk = parseFloat(document.getElementById('ge_risk').value);
    const currentPrice = parseFloat(document.getElementById('ge_currentPrice').value) || null;
    const high = parseFloat(document.getElementById('ge_high').value);
    const low = parseFloat(document.getElementById('ge_low').value);
    const numLevels = generatedLevels.length;
    const tradeSize = capital * risk / 100;
    const step = (high - low) / numLevels;
    const levels = generatedLevels.map((glv, idx) => {
      const qtyInput = document.getElementById('gePrevQty_'+idx);
      const q = parseFloat(qtyInput.value);
      return {
        plannedPrice: glv.plannedPrice,
        plannedQty: (!isNaN(q) && q>0) ? q : null,
        executedQty: null, executedPrice: null, executedDate: null,
        status: 'empty', sellTargetPrice: null,
        sells: [], cycles: 0,
      };
    });
    const grids2 = await getGridPlans(email);
    grids2[symbol] = { ...grids2[symbol], market, currentPrice, capital, risk, tradeSize, rangeHigh: high, rangeLow: low, step, levels, rangeMode: geRange ? geRange.mode() : 'manual', rangePeriod: geRange && geRange.mode() === 'auto' ? geRange.period() : null };
    await saveGridPlans(email, grids2);
    renderGridPlanDetail(symbol);
  };
}

/* ================== اختيار نوع الخطة - تعزيز متوسط (DCA) أو شبكة (Grid) ================== */
async function renderPlanTypeChooser(prefill){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderPlanTypeChooser(prefill));
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>${pageTitle('plan_type_chooser','اختر نوع الخطة')}</div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button></div>
    <div class="info">اختر الأسلوب المناسب للسهم الذي تفكر فيه — الفرق الأساسي: DCA مبنية على ثقتك بأن السهم سيصعد على المدى الطويل، وGrid مبنية على أن السهم سيتذبذب داخل نطاق سعري معيّن.</div>

    <div class="section-card" data-gcall="__chooseDac" style="cursor:pointer;">
      <div style="background:var(--green-dark);color:#fff;padding:8px 12px;border-radius:8px 8px 0 0;margin:-16px -18px 12px;font-weight:700;">📈 خطة تعزيز المتوسط (DCA)</div>
      <p style="font-size:13px;color:#555;text-align:right;margin-top:10px;">
        تشتري كميات إضافية كلما انخفض السعر، لتقليل متوسط سعر شرائك الإجمالي. مناسبة لسهم تثق فيه على المدى الطويل وتريد "تشتري في الهبوط" بدل ما تخاف منه.
      </p>
      <button class="btn-active u-mt14">اختيار تعزيز المتوسط</button>
    </div>
    <div class="section-card" data-gcall="__chooseGrid" style="cursor:pointer;margin-top:14px;">
      <div style="background:var(--green-dark);color:#fff;padding:8px 12px;border-radius:8px 8px 0 0;margin:-16px -18px 12px;font-weight:700;">🔲 خطة الشبكة (Grid)</div>
      <p style="font-size:13px;color:#555;text-align:right;">
        تحدد نطاقًا سعريًا (سقفًا وقاعًا)، وتشتري وتبيع الكمية نفسها كلما تحرك السعر بين المستويات، وتكرر الدورة. مناسبة لسهم متذبذب ليس في اتجاه واضح، وتربح من التذبذب نفسه.
      </p>
      <button class="btn-active u-mt14">اختيار الشبكة</button>
    </div>
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();
  window.__chooseDac = () => { if (prefill) window.__prefillPlan = prefill; renderNewPlanForm(); };
  window.__chooseGrid = () => { if (prefill) window.__prefillGridPlan = prefill; renderGridPlanForm(); };
}

async function renderNewPlanForm(error, formState){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderNewPlanForm());
  const email0 = await getSession();
  if(!email0) return renderLogin();
  if(!(await ensureAccess())) return;
  const today = new Date().toISOString().split('T')[0];
  const prefill = window.__prefillPlan || {};
  window.__prefillPlan = null;
  const fs = formState || {};

  window.__lastPageKey='new_plan_form'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar">
      <button class="secondary small" id="homeBtnNewPlan">🏠 الشاشة الرئيسية</button>
      <button class="btn-lightgreen small" id="plansBtnNewPlan">📈 الأسهم والخطط</button>
    </div>
    <h2>خطة تعزيز متوسط جديدة</h2>
    ${error?`<div class="error">${error}</div>`:''}
    <form id="planForm">
<div class="radio-row g-listed" role="radiogroup" aria-label="نوع السهم">
        <label><input type="radio" name="listed" value="1" checked> سهم مدرج في البورصة (يتم التحقق من الكود + آخر سعر + إشعارات تلقائية)</label>
        <label><input type="radio" name="listed" value="0"> سهم غير مدرج في البورصة (أي اسم وسعر تكتبه بنفسك — بدون إشعارات تلقائية)</label>
      </div>
      <label>اسم السهم</label><input type="text" id="symbol" required placeholder="مثال: ABUK" value="${fs.symbol??prefill.symbol??''}">
      <div class="grid2">
        <div><label>الدولة / البورصة</label>
          <select id="market">
            <option value="مصر">مصر (EGX)</option>
            <option value="السعودية">السعودية (تداول)</option>
            <option value="الإمارات">الإمارات</option>
            <option value="قطر">قطر</option>
            <option value="الكويت">الكويت</option>
          </select>
        </div>
        <div><label>العملة</label>
          <select id="currency">
            <option value="جنيه مصري">جنيه مصري</option>
            <option value="ريال سعودي">ريال سعودي</option>
            <option value="درهم إماراتي">درهم إماراتي</option>
            <option value="دينار كويتي">دينار كويتي</option>
            <option value="ريال قطري">ريال قطري</option>
          </select>
        </div>
      </div>
      <div class="grid2">
        <div><label>تاريخ بداية الاستثمار</label><input type="date" id="startDate" value="${today}"></div>
        <div></div>
      </div>
      <label>السعر الحالي</label><input type="number" step="any" id="currentPrice" required value="${fs.currentPrice??prefill.price??''}">
      <label>رأس المال المخطط للمضاربة (بالكامل)</label><input type="number" step="any" id="capital" required value="${fs.capital??''}">

      <label>نسبة المخاطرة المطلوبة (اختياري)</label>
      <div class="radio-row">
        <label><input type="radio" name="riskMode" value="auto" ${fs.riskMode!=='manual'?'checked':''}> استخدام نسبة مخاطرة (كل شيء يُحسب تلقائيًا)</label>
        <label><input type="radio" name="riskMode" value="manual" ${fs.riskMode==='manual'?'checked':''}> إدخال النسب يدويًا</label>
      </div>
      <div id="riskAutoField">
        <label>نسبة المخاطرة %</label><input type="number" step="any" id="riskPercent" value="${fs.riskPercent??5}">
        <div class="risk-preview" id="riskPreview"></div>
      </div>

      <div id="manualFields" style="display:${fs.riskMode==='manual'?'block':'none'};">
        <label>طريقة تحديد عدد المستويات</label>
        <div class="radio-row">
          <label><input type="radio" name="levelMode" value="manual" ${fs.levelMode!=='auto'?'checked':''}> يدوي (أحدد العدد)</label>
          <label><input type="radio" name="levelMode" value="auto" ${fs.levelMode==='auto'?'checked':''}> تلقائي (يحسبها البرنامج)</label>
        </div>
        <div id="manualLevelsField" style="display:${fs.levelMode==='auto'?'none':'block'};"><label>عدد المستويات</label><input type="number" id="levels" value="${fs.levels??7}"></div>
        <label>مبلغ الشراء الأول</label><input type="number" step="any" id="seedAmount" value="${fs.seedAmount??''}" placeholder="مثال: 1000">
        <div class="grid2">
          <div><label>نسبة الربح المستهدفة %</label><input type="number" step="any" id="profitTarget" value="${fs.profitTarget??5}"></div>
          <div><label>نسبة الانخفاض لكل مستوى %</label><input type="number" step="any" id="dropPercent" value="${fs.dropPercent??7.5}"></div>
          <div><label>نسبة زيادة قيمة الشراء لكل مستوى %</label><input type="number" step="any" id="volumeIncrease" value="${fs.volumeIncrease??10}"></div>
        </div>
        <div class="risk-preview" id="manualCoveragePreview"></div>
      </div>

      <label class="u-mt10">نسبة ربح الخروج الكلي % (اختياري)</label>
      <input type="number" step="any" id="exitProfitPercent" value="${fs.exitProfitPercent??''}" placeholder="مثال: 10">
      <div style="font-size:11px;color:#888;margin-top:4px;">إذا حددتها، سيوضح لك الموقع السعر الذي يمكنك عنده بيع كل الكمية المملوكة وتحقيق نسبة الربح هذه على متوسط تكلفتك، وسيُبرز المستوى الأقرب لسعر الخروج هذا باللون الأخضر في جدول المستويات.</div>

      <div id="suggestionsBox"></div>
      <button type="submit">إنشاء الخطة</button>
    </form>
    <div class="muted-link"><a id="backBtn">📈 كل خطط الـ DCA</a></div></div>`;

  function updateRiskPreview(){
    const capital = parseFloat(document.getElementById('capital').value) || 0;
    const riskPercent = parseFloat(document.getElementById('riskPercent').value) || 0;
    const d = computeRiskDerived(capital, riskPercent);
    document.getElementById('riskPreview').innerHTML = capital>0 ? `
      سيتم تلقائيًا: مبلغ الشراء الأول = <strong>${d.seedAmount}</strong> —
      نسبة الربح = <strong>${d.profitTarget}%</strong> —
      نسبة زيادة الشراء = <strong>${d.volumeIncrease}%</strong> —
      نسبة الانخفاض = <strong>${d.dropPercent}%</strong> — عدد المستويات المحسوب = <strong>${d.levelsCount}</strong> (يغطي انخفاض إجمالي حتى 50%)
    ` : 'أدخل رأس المال أولًا لمعاينة الحساب التلقائي';
  }
  document.getElementById('capital').addEventListener('input', updateRiskPreview);
  document.getElementById('riskPercent').addEventListener('input', updateRiskPreview);
  updateRiskPreview();

  function updateManualCoveragePreview(){
    const capital = parseFloat(document.getElementById('capital').value) || 0;
    const levelMode = document.querySelector('input[name="levelMode"]:checked').value;
    const dropPercent = parseFloat(document.getElementById('dropPercent').value) || 0;
    const volumeIncrease = parseFloat(document.getElementById('volumeIncrease').value) || 0;
    const seedAmount = parseFloat(document.getElementById('seedAmount').value) || 0;
    let count;
    if (levelMode==='manual') {
      count = parseInt(document.getElementById('levels').value) || 0;
    } else {
      count = (capital>0 && seedAmount>0) ? buildLevelsAuto({ capital, volumeIncrease, seedAmount }).length : 0;
    }
    const box = document.getElementById('manualCoveragePreview');
    if (count>0 && dropPercent>0) {
      const totalDrop = (1 - Math.pow(1-dropPercent/100, count)) * 100;
      box.innerHTML = `📊 بهذه النسب، ستغطي الخطة حتى <strong>المستوى ${count}</strong>، بنسبة انخفاض تراكمي حتى <strong>${totalDrop.toFixed(1)}%</strong> من السعر الأصلي.`;
    } else {
      box.innerHTML = 'أدخل عدد المستويات (أو مبلغ الشراء الأول لو تلقائي) ونسبة الانخفاض لمعاينة التغطية.';
    }
  }
  ['levels','dropPercent','volumeIncrease','seedAmount','capital'].forEach(id=>{
    document.getElementById(id).addEventListener('input', updateManualCoveragePreview);
  });
  document.querySelectorAll('input[name="levelMode"]').forEach(r=>{ r.addEventListener('change', updateManualCoveragePreview); });
  updateManualCoveragePreview();

  document.querySelectorAll('input[name="riskMode"]').forEach(r=>{
    r.onchange = (e)=>{
      const isAuto = e.target.value==='auto';
      document.getElementById('riskAutoField').style.display = isAuto?'block':'none';
      document.getElementById('manualFields').style.display = isAuto?'none':'block';
    };
  });
  document.querySelectorAll('input[name="levelMode"]').forEach(r=>{
    r.onchange = (e)=>{
      document.getElementById('manualLevelsField').style.display = e.target.value==='manual'?'block':'none';
    };
  });

  document.getElementById('homeBtnNewPlan').onclick=()=>renderHome();
  document.getElementById('plansBtnNewPlan').onclick=()=>renderPlansList();
  document.getElementById('backBtn').onclick=()=>renderPlansList();

  gWireSymbolLookup({ symId: 'symbol', mktId: 'market', priceId: 'currentPrice', listedName: 'listed' });   // الإصدار 100
  document.getElementById('planForm').onsubmit=async(e)=>{
    e.preventDefault();
    const email = await getSession();
    const symbol = document.getElementById('symbol').value.trim().toUpperCase();
    const currentPrice = parseFloat(document.getElementById('currentPrice').value);
    const capital = parseFloat(document.getElementById('capital').value);
    const currency = document.getElementById('currency').value;
    const market = document.getElementById('market').value;
    const startDate = document.getElementById('startDate').value;
    const riskMode = document.querySelector('input[name="riskMode"]:checked').value;

    const plans = await getPlans(email);
    if(plans[symbol]) return renderNewPlanForm('توجد خطة بالفعل لهذا السهم — احذفها أولًا إذا أردت البدء من جديد');
    // الإصدار 98: سهم مدرج ← لازم الكود يكون موجود في البورصة ، غير مدرج ← أي اسم وسعر ومفيش إشعارات تلقائية
    const listed = (document.querySelector('input[name="listed"]:checked') || {}).value !== '0';
    if (listed) { const symChk = await gCheckSymbol(symbol, market); if (!symChk.ok) return renderNewPlanForm(symChk.msg + ' لو السهم غير مدرج في البورصة اختر «سهم غير مدرج في البورصة».'); }
    const existingGrids = await getGridPlans(email);
    if(existingGrids[symbol] && !existingGrids[symbol].closed) return renderNewPlanForm('هذا السهم لديه خطة شبكة (Grid) نشطة بالفعل — لا يمكن أن يكون السهم نفسه في خطتين (تعزيز متوسط + شبكة) في الوقت نفسه. أغلق خطة الشبكة أولًا إذا أردت بدء خطة تعزيز متوسط بدلًا منها.');

    let levelMode, levelsCount, seedAmount, profitTarget, dropPercent, volumeIncrease, riskPercent=null;

    if (riskMode==='auto') {
      riskPercent = parseFloat(document.getElementById('riskPercent').value) || 0;
      if(riskPercent<=0) return renderNewPlanForm('أدخل نسبة مخاطرة صحيحة');
      const d = computeRiskDerived(capital, riskPercent);
      seedAmount = d.seedAmount; profitTarget = d.profitTarget; volumeIncrease = d.volumeIncrease; dropPercent = d.dropPercent;
      levelsCount = d.levelsCount;
      levelMode = 'manual';
    } else {
      levelMode = document.querySelector('input[name="levelMode"]:checked').value;
      levelsCount = parseInt(document.getElementById('levels').value);
      seedAmount = parseFloat(document.getElementById('seedAmount').value);
      profitTarget = parseFloat(document.getElementById('profitTarget').value) || 0;
      dropPercent = parseFloat(document.getElementById('dropPercent').value) || 0;
      volumeIncrease = parseFloat(document.getElementById('volumeIncrease').value) || 0;
      if(!seedAmount || seedAmount<=0) return renderNewPlanForm('أدخل مبلغ الشراء الأول', {symbol,currentPrice,capital,riskMode:'manual',levelMode,levels:levelsCount,seedAmount,profitTarget,dropPercent,volumeIncrease});

      if (!window.__bypassSuggestions) {
        const issues = validateManualInputs({ capital, seedAmount, profitTarget, dropPercent, volumeIncrease });
        if (issues.length){
          const box = document.getElementById('suggestionsBox');
          box.innerHTML = `<div class="suggest-box">
            <strong>⚠️ في مدخلات ممكن تكون غير متوازنة:</strong>
            ${issues.map(i=>`<div class="suggest-item">${escapeHtml(i.message)}<br>الحالي: <strong>${i.current}</strong> — المقترح: <strong>${i.suggested}</strong></div>`).join('')}
            <button type="button" class="small u-wa" id="applySuggestBtn">تطبيق كل المقترحات</button>
            <button type="button" class="small secondary u-wa" id="ignoreSuggestBtn">المتابعة بالقيم الحالية</button>
          </div>`;
          document.getElementById('applySuggestBtn').onclick = () => {
            const patch = {};
            issues.forEach(i=>{ patch[i.field] = i.suggested; });
            renderNewPlanForm(null, { symbol,currentPrice,capital,riskMode:'manual',levelMode,levels:levelsCount,
              seedAmount: patch.seedAmount??seedAmount, profitTarget, dropPercent: patch.dropPercent??dropPercent, volumeIncrease: patch.volumeIncrease??volumeIncrease });
          };
          document.getElementById('ignoreSuggestBtn').onclick = () => {
            window.__bypassSuggestions = true;
            document.getElementById('planForm').requestSubmit();
          };
          return;
        }
      }
      window.__bypassSuggestions = false;
    }

    let levels;
    if (levelMode==='manual') {
      levels = buildLevelsManual({ levels: levelsCount });
    } else {
      levels = buildLevelsAuto({ capital, volumeIncrease, seedAmount });
    }

    const exitProfitPercent = parseFloat(document.getElementById('exitProfitPercent').value);
    plans[symbol] = { symbol, currentPrice, capital, riskMode, riskPercent, profitTarget, dropPercent, volumeIncrease, seedAmount, currency, market, startDate, levelMode, levels, closedTrades: [], exitProfitPercent: (!isNaN(exitProfitPercent) && exitProfitPercent>0) ? exitProfitPercent : null };
    if (!listed) { plans[symbol].listed = false; plans[symbol].manualLastPrice = currentPrice; }
    await savePlans(email, plans);
    renderPlanDetail(symbol);
  };
}

/* ================== تعديل إعدادات خطة سهم قائم ================== */
async function renderEditPlanSettings(symbol, error, formState){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderEditPlanSettings(symbol));
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;
  const plans = await getPlans(email);
  const planObj = plans[symbol];
  if(!planObj) return renderPlansList();
  const hasExecuted = planObj.levels.some(lv=>lv.executed);
  const fs = formState || {};

  if (!hasExecuted) {
    // لا يوجد صفقات مفتوحة حاليًا - نفس حرية إنشاء خطة جديدة بالظبط (اختيار نسبة مخاطرة تلقائية أو إدخال يدوي كامل)
    window.__lastPageKey='edit_plan_settings'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}<h2>تعديل إعدادات خطة ${symbol}</h2>
      <div class="info">لا توجد صفقات مفتوحة حاليًا لهذا السهم، لذلك يمكنك تغيير أي شيء في الخطة بحرية كاملة كما لو كنت تنشئ خطة جديدة.</div>
      ${error?`<div class="error">${error}</div>`:''}
      <form id="editSettingsForm">
        <div class="grid2">
          <div><label>الدولة / البورصة</label>
            <select id="e_market">
              <option value="مصر">مصر (EGX)</option>
              <option value="السعودية">السعودية (تداول)</option>
              <option value="الإمارات">الإمارات</option>
              <option value="قطر">قطر</option>
              <option value="الكويت">الكويت</option>
            </select>
          </div>
          <div><label>العملة</label>
            <select id="e_currency">
              <option value="جنيه مصري">جنيه مصري</option>
              <option value="ريال سعودي">ريال سعودي</option>
              <option value="درهم إماراتي">درهم إماراتي</option>
              <option value="دينار كويتي">دينار كويتي</option>
              <option value="ريال قطري">ريال قطري</option>
            </select>
          </div>
        </div>
        <label>السعر الحالي</label><input type="number" step="any" id="e_currentPrice" value="${fs.currentPrice??planObj.currentPrice}" required>
        <label>رأس المال المخطط للمضاربة</label><input type="number" step="any" id="e_capital" value="${fs.capital??planObj.capital}" required>

        <label>نسبة المخاطرة المطلوبة (اختياري)</label>
        <div class="radio-row">
          <label><input type="radio" name="e_riskMode" value="auto" ${fs.riskMode!=='manual'?'checked':''}> استخدام نسبة مخاطرة (كل شيء يُحسب تلقائيًا)</label>
          <label><input type="radio" name="e_riskMode" value="manual" ${fs.riskMode==='manual'?'checked':''}> إدخال النسب يدويًا</label>
        </div>
        <div id="e_riskAutoField">
          <label>نسبة المخاطرة %</label><input type="number" step="any" id="e_riskPercent" value="${fs.riskPercent??planObj.riskPercent??5}">
          <div class="risk-preview" id="e_riskPreview"></div>
        </div>

        <div id="e_manualFields" style="display:${fs.riskMode==='manual'?'block':'none'};">
          <label>طريقة تحديد عدد المستويات</label>
          <div class="radio-row">
            <label><input type="radio" name="e_levelMode" value="manual" ${fs.levelMode!=='auto'?'checked':''}> يدوي (أحدد العدد)</label>
            <label><input type="radio" name="e_levelMode" value="auto" ${fs.levelMode==='auto'?'checked':''}> تلقائي (يحسبها البرنامج)</label>
          </div>
          <div id="e_manualLevelsField" style="display:${fs.levelMode==='auto'?'none':'block'};"><label>عدد المستويات</label><input type="number" id="e_levels" value="${fs.levels??planObj.levels.length}"></div>
          <label>مبلغ الشراء الأول</label><input type="number" step="any" id="e_seedAmount" value="${fs.seedAmount??planObj.seedAmount??''}">
          <div class="grid2">
            <div><label>نسبة الربح المستهدفة %</label><input type="number" step="any" id="e_profitTarget" value="${fs.profitTarget??planObj.profitTarget}"></div>
            <div><label>نسبة الانخفاض لكل مستوى %</label><input type="number" step="any" id="e_dropPercent" value="${fs.dropPercent??planObj.dropPercent}"></div>
            <div><label>نسبة زيادة قيمة الشراء لكل مستوى %</label><input type="number" step="any" id="e_volumeIncrease" value="${fs.volumeIncrease??planObj.volumeIncrease}"></div>
          </div>
          <div class="risk-preview" id="e_manualCoveragePreview"></div>
        </div>

        <div id="e_suggestionsBox"></div>
        <button type="submit">حفظ التعديلات</button>
      </form>
      <div class="muted-link"><a id="cancelBtn">إلغاء والرجوع</a></div></div>`;

    document.getElementById('e_market').value = planObj.market || 'مصر';
    document.getElementById('e_currency').value = planObj.currency || 'جنيه مصري';
    document.getElementById('cancelBtn').onclick = () => renderPlanDetail(symbol);

    function updateRiskPreview(){
      const capital = parseFloat(document.getElementById('e_capital').value) || 0;
      const riskPercent = parseFloat(document.getElementById('e_riskPercent').value) || 0;
      const d = computeRiskDerived(capital, riskPercent);
      document.getElementById('e_riskPreview').innerHTML = capital>0 ? `
        سيتم تلقائيًا: مبلغ الشراء الأول = <strong>${d.seedAmount}</strong> —
        نسبة الربح = <strong>${d.profitTarget}%</strong> —
        نسبة زيادة الشراء = <strong>${d.volumeIncrease}%</strong> —
        نسبة الانخفاض = <strong>${d.dropPercent}%</strong> — عدد المستويات المحسوب = <strong>${d.levelsCount}</strong> (يغطي انخفاض إجمالي حتى 50%)
      ` : 'أدخل رأس المال أولًا لمعاينة الحساب التلقائي';
    }
    document.getElementById('e_capital').addEventListener('input', updateRiskPreview);
    document.getElementById('e_riskPercent').addEventListener('input', updateRiskPreview);
    updateRiskPreview();

    document.querySelectorAll('input[name="e_riskMode"]').forEach(r=>{
      r.onchange = (e)=>{
        const isAuto = e.target.value==='auto';
        document.getElementById('e_riskAutoField').style.display = isAuto?'block':'none';
        document.getElementById('e_manualFields').style.display = isAuto?'none':'block';
      };
    });
    document.querySelectorAll('input[name="e_levelMode"]').forEach(r=>{
      r.onchange = (e)=>{
        document.getElementById('e_manualLevelsField').style.display = e.target.value==='manual'?'block':'none';
      };
    });

    function updateManualCoveragePreviewEdit(){
      const capital = parseFloat(document.getElementById('e_capital').value) || 0;
      const levelMode = document.querySelector('input[name="e_levelMode"]:checked').value;
      const dropPercent = parseFloat(document.getElementById('e_dropPercent').value) || 0;
      const volumeIncrease = parseFloat(document.getElementById('e_volumeIncrease').value) || 0;
      const seedAmount = parseFloat(document.getElementById('e_seedAmount').value) || 0;
      let count;
      if (levelMode==='manual') {
        count = parseInt(document.getElementById('e_levels').value) || 0;
      } else {
        count = (capital>0 && seedAmount>0) ? buildLevelsAuto({ capital, volumeIncrease, seedAmount }).length : 0;
      }
      const box = document.getElementById('e_manualCoveragePreview');
      if (count>0 && dropPercent>0) {
        const totalDrop = (1 - Math.pow(1-dropPercent/100, count)) * 100;
        box.innerHTML = `📊 بهذه النسب، ستغطي الخطة حتى <strong>المستوى ${count}</strong>، بنسبة انخفاض تراكمي حتى <strong>${totalDrop.toFixed(1)}%</strong> من السعر الأصلي.`;
      } else {
        box.innerHTML = 'أدخل عدد المستويات (أو مبلغ الشراء الأول لو تلقائي) ونسبة الانخفاض لمعاينة التغطية.';
      }
    }
    ['e_levels','e_dropPercent','e_volumeIncrease','e_seedAmount','e_capital'].forEach(id=>{
      document.getElementById(id).addEventListener('input', updateManualCoveragePreviewEdit);
    });
    document.querySelectorAll('input[name="e_levelMode"]').forEach(r=>{ r.addEventListener('change', updateManualCoveragePreviewEdit); });
    updateManualCoveragePreviewEdit();

    document.getElementById('editSettingsForm').onsubmit = async (e) => {
      e.preventDefault();
      const plans2 = await getPlans(email);
      const p = plans2[symbol];
      p.market = document.getElementById('e_market').value;
      p.currency = document.getElementById('e_currency').value;
      p.currentPrice = parseFloat(document.getElementById('e_currentPrice').value);
      p.capital = parseFloat(document.getElementById('e_capital').value);
      const riskMode = document.querySelector('input[name="e_riskMode"]:checked').value;

      let levelMode, levelsCount, seedAmount, profitTarget, dropPercent, volumeIncrease, riskPercent=null;

      if (riskMode==='auto') {
        riskPercent = parseFloat(document.getElementById('e_riskPercent').value) || 0;
        if(riskPercent<=0) return renderEditPlanSettings(symbol, 'أدخل نسبة مخاطرة صحيحة');
        const d = computeRiskDerived(p.capital, riskPercent);
        seedAmount = d.seedAmount; profitTarget = d.profitTarget; volumeIncrease = d.volumeIncrease; dropPercent = d.dropPercent;
        levelsCount = d.levelsCount;
        levelMode = 'manual';
      } else {
        levelMode = document.querySelector('input[name="e_levelMode"]:checked').value;
        levelsCount = parseInt(document.getElementById('e_levels').value);
        seedAmount = parseFloat(document.getElementById('e_seedAmount').value);
        profitTarget = parseFloat(document.getElementById('e_profitTarget').value) || 0;
        dropPercent = parseFloat(document.getElementById('e_dropPercent').value) || 0;
        volumeIncrease = parseFloat(document.getElementById('e_volumeIncrease').value) || 0;
        if(!seedAmount || seedAmount<=0) return renderEditPlanSettings(symbol, 'أدخل مبلغ الشراء الأول', {riskMode:'manual',levelMode,levels:levelsCount,seedAmount,profitTarget,dropPercent,volumeIncrease,capital:p.capital,currentPrice:p.currentPrice});

        if (!window.__bypassSuggestionsEdit) {
          const issues = validateManualInputs({ capital: p.capital, seedAmount, profitTarget, dropPercent, volumeIncrease });
          if (issues.length){
            const box = document.getElementById('e_suggestionsBox');
            box.innerHTML = `<div class="suggest-box">
              <strong>⚠️ في مدخلات ممكن تكون غير متوازنة:</strong>
              ${issues.map(i=>`<div class="suggest-item">${escapeHtml(i.message)}<br>الحالي: <strong>${i.current}</strong> — المقترح: <strong>${i.suggested}</strong></div>`).join('')}
              <button type="button" class="small u-wa" id="e_applySuggestBtn">تطبيق كل المقترحات</button>
              <button type="button" class="small secondary u-wa" id="e_ignoreSuggestBtn">المتابعة بالقيم الحالية</button>
            </div>`;
            document.getElementById('e_applySuggestBtn').onclick = () => {
              const patch = {};
              issues.forEach(i=>{ patch[i.field] = i.suggested; });
              renderEditPlanSettings(symbol, null, { riskMode:'manual', levelMode, levels:levelsCount,
                seedAmount: patch.seedAmount??seedAmount, profitTarget, dropPercent: patch.dropPercent??dropPercent, volumeIncrease: patch.volumeIncrease??volumeIncrease,
                capital:p.capital, currentPrice:p.currentPrice });
            };
            document.getElementById('e_ignoreSuggestBtn').onclick = () => {
              window.__bypassSuggestionsEdit = true;
              document.getElementById('editSettingsForm').requestSubmit();
            };
            return;
          }
        }
        window.__bypassSuggestionsEdit = false;
      }

      p.riskMode = riskMode; p.riskPercent = riskPercent;
      p.profitTarget = profitTarget; p.dropPercent = dropPercent; p.volumeIncrease = volumeIncrease; p.seedAmount = seedAmount;
      p.levelMode = levelMode;
      if(levelMode==='manual'){
        p.levels = buildLevelsManual({ levels: levelsCount });
      } else {
        p.levels = buildLevelsAuto({ capital: p.capital, volumeIncrease, seedAmount });
      }

      await savePlans(email, plans2);
      renderPlanDetail(symbol);
    };
    return;
  }

  // فيه صفقات مفتوحة حاليًا - تعديل محدود لباقي الإعدادات فقط (بدون تغيير هيكل المستويات)
  window.__lastPageKey='edit_plan_settings'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}<h2>تعديل إعدادات خطة ${symbol}</h2>
    ${error?`<div class="error">${error}</div>`:''}
    <div class="info">فيه مستويات منفذة حاليًا، فمينفعش تتغير طريقة تحديد عدد المستويات أو مبلغ الشراء الأول إلا بعد إغلاق كل الصفقات وترحيلها. باقي الإعدادات تقدر تعدّلها بحرية.</div>
    <form id="editSettingsForm">
      <div class="grid2">
        <div><label>الدولة / البورصة</label>
          <select id="e_market">
            <option value="مصر">مصر (EGX)</option>
            <option value="السعودية">السعودية (تداول)</option>
            <option value="الإمارات">الإمارات</option>
            <option value="قطر">قطر</option>
            <option value="الكويت">الكويت</option>
          </select>
        </div>
        <div><label>العملة</label>
          <select id="e_currency">
            <option value="جنيه مصري">جنيه مصري</option>
            <option value="ريال سعودي">ريال سعودي</option>
            <option value="درهم إماراتي">درهم إماراتي</option>
            <option value="دينار كويتي">دينار كويتي</option>
            <option value="ريال قطري">ريال قطري</option>
          </select>
        </div>
      </div>
      <label>رأس المال المخطط للمضاربة</label><input type="number" step="any" id="e_capital" value="${planObj.capital}" required>
      <label>نسبة المخاطرة %</label><input type="number" step="any" id="e_riskPercent" value="${planObj.riskPercent||''}" placeholder="اختياري">
      <div class="grid2">
        <div><label>نسبة الربح المستهدفة %</label><input type="number" step="any" id="e_profitTarget" value="${planObj.profitTarget}" required></div>
        <div><label>نسبة الانخفاض لكل مستوى %</label><input type="number" step="any" id="e_dropPercent" value="${planObj.dropPercent}" required></div>
        <div><label>نسبة زيادة قيمة الشراء لكل مستوى %</label><input type="number" step="any" id="e_volumeIncrease" value="${planObj.volumeIncrease}" required></div>
      </div>
      <div id="e_suggestionsBox"></div>
      <button type="submit">حفظ التعديلات</button>
    </form>
    <div class="muted-link"><a id="cancelBtn">إلغاء والرجوع</a></div></div>`;

  document.getElementById('e_market').value = planObj.market || 'مصر';
  document.getElementById('e_currency').value = planObj.currency || 'جنيه مصري';
  document.getElementById('cancelBtn').onclick = () => renderPlanDetail(symbol);

  document.getElementById('editSettingsForm').onsubmit = async (e) => {
    e.preventDefault();
    const plans2 = await getPlans(email);
    const p = plans2[symbol];

    p.market = document.getElementById('e_market').value;
    p.currency = document.getElementById('e_currency').value;
    p.capital = parseFloat(document.getElementById('e_capital').value);
    p.riskPercent = parseFloat(document.getElementById('e_riskPercent').value) || null;
    const profitTarget = parseFloat(document.getElementById('e_profitTarget').value) || 0;
    const dropPercent = parseFloat(document.getElementById('e_dropPercent').value) || 0;
    const volumeIncrease = parseFloat(document.getElementById('e_volumeIncrease').value) || 0;

    if (!window.__bypassSuggestionsEdit) {
      const issues = validateManualInputs({ capital: p.capital, seedAmount: p.seedAmount||0, profitTarget, dropPercent, volumeIncrease });
      if (issues.length){
        const box = document.getElementById('e_suggestionsBox');
        box.innerHTML = `<div class="suggest-box">
          <strong>⚠️ في مدخلات ممكن تكون غير متوازنة:</strong>
          ${issues.map(i=>`<div class="suggest-item">${escapeHtml(i.message)}<br>الحالي: <strong>${i.current}</strong> — المقترح: <strong>${i.suggested}</strong></div>`).join('')}
          <button type="button" class="small u-wa" id="e_applySuggestBtn">تطبيق كل المقترحات</button>
          <button type="button" class="small secondary u-wa" id="e_ignoreSuggestBtn">المتابعة بالقيم الحالية</button>
        </div>`;
        document.getElementById('e_applySuggestBtn').onclick = () => {
          issues.forEach(i=>{
            if(i.field==='dropPercent') document.getElementById('e_dropPercent').value = i.suggested;
            if(i.field==='volumeIncrease') document.getElementById('e_volumeIncrease').value = i.suggested;
          });
        };
        document.getElementById('e_ignoreSuggestBtn').onclick = () => {
          window.__bypassSuggestionsEdit = true;
          document.getElementById('editSettingsForm').requestSubmit();
        };
        return;
      }
    }
    window.__bypassSuggestionsEdit = false;

    p.profitTarget = profitTarget; p.dropPercent = dropPercent; p.volumeIncrease = volumeIncrease;

    await savePlans(email, plans2);
    renderPlanDetail(symbol);
  };
}

/* ================== تفاصيل خطة ================== */
async function renderPlanDetail(symbol){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderPlanDetail(symbol));
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;
  const plans = await getPlans(email);
  const planObj = plans[symbol];
  if(!planObj) return renderPlansList();
  if(!planObj.closedTrades) planObj.closedTrades = [];
  planObj.levels.forEach(lv=>{ if(!lv.sells) lv.sells = []; });
  if (ensureEnoughLevels(planObj)) { await savePlans(email, plans); }

  const sim = simulatePlan(planObj);
  // الإصدار 97: نقطة الخروج الكلي = متوسط التكلفة × (1 + نسبة ربح الخروج الكلي) - ولو مش متحددة ← نسبة ربح الخطة
  const exitPct = (+planObj.exitProfitPercent > 0) ? +planObj.exitProfitPercent : (+planObj.profitTarget > 0 ? +planObj.profitTarget : null);
  const exitTargetPrice = (sim.avgCostCurrent!=null && sim.heldQty > 0 && exitPct!=null) ? sim.avgCostCurrent * (1 + exitPct/100) : null;

  let trimmedShown = false;
  const rowsToRender = sim.rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => {
      if (!r.trimmed) return true;
      if (!trimmedShown) { trimmedShown = true; return true; }
      return false;
    });
  let exitHighlightIdx = null;
  if (exitTargetPrice != null) {
    let bestDiff = Infinity;
    sim.rows.forEach((r, i) => {
      const diff = Math.abs(r.price - exitTargetPrice);
      if (diff < bestDiff) { bestDiff = diff; exitHighlightIdx = i; }
    });
  }
  // الإصدار 112: جدول المستويات الجديد - كل معلومة في عمود + أزرار الإجراءات + عمليات البيع في سطور تحت المستوى
  const lvOpen = glvOpenSet('dca|' + symbol);
  const tot = { bq: 0, bv: 0, sq: 0, rem: 0, real: 0 };
  const tableRows = rowsToRender.map(({ r, i: idx }) => {
    const lv = planObj.levels[idx];
    const isExit = idx === exitHighlightIdx;
    let st;
    if (r.trimmed) st = glvBadge('ملغى — تجاوز رأس المال', 'off');
    else if (r.executed) {
      const sold = r.sells.reduce((a, x) => a + x.qty, 0);
      st = r.cumHeldQty <= 0 && r.sells.length ? glvBadge('اتباعت كلها', 'sold') : sold > 0 ? glvBadge('بيع جزئي', 'part') : glvBadge('تم الشراء', 'held');
    } else st = r.isNext ? glvBadge('القادم', 'next') : glvBadge('بعد', 'empty');
    if (isExit) st += ' ' + glvBadge('🎯 نقطة خروج', 'exit');
    const soldQ = r.executed ? r.sells.reduce((a, x) => a + x.qty, 0) : null;
    const soldAvg = soldQ ? r.sells.reduce((a, x) => a + x.qty * x.price, 0) / soldQ : null;
    const rem = r.executed && !r.trimmed ? Math.max(0, (+r.qty || 0) - (soldQ || 0)) : null;
    const real = r.executed ? r.sells.reduce((a, x) => a + (+x.profit || 0), 0) : null;
    if (r.executed) { tot.bq += +r.qty || 0; tot.bv += +r.amount || 0; tot.sq += soldQ || 0; tot.rem += rem || 0; tot.real += real || 0; }
    const planned = !r.executed;   // المستوى لسه متنفذش ← السعر والكمية المخططين (باهت)

    let acts = '';
    if (!r.trimmed) {
      if (!r.executed) {
        if (r.isNext) acts = sim.isClosed ? glvBtn('شراء', '__buyLevel', [String(symbol), idx, r.maxQty], { cls: 'glv-buy', disabled: true, title: 'رحّل الصفقة المقفولة الأول (الزر أعلى الجدول)' })
                                          : glvBtn('شراء', '__buyLevel', [String(symbol), idx, r.maxQty], { cls: 'glv-buy', title: `شراء المستوى ${r.level}` });
        else acts = glvBtn('شراء', '__buyLevel', [String(symbol), idx, r.maxQty], { cls: 'glv-buy', disabled: true, title: 'اشترِ المستوى القادم الأول' });
      } else {
        if (r.cumHeldQty > 0) acts += glvBtn('بيع', '__sellAtLevel', [String(symbol), idx, r.cumHeldQty], { cls: 'glv-sell', title: `بيع — أقصى كمية ${glvQ(r.cumHeldQty)}` });
        acts += glvBtn('✎', '__startEditBuy', [String(symbol), idx], { title: 'تعديل الشراء' });
        acts += glvBtn('🗑', '__deleteBuy', [String(symbol), idx], idx === sim.lastBoughtIndex ? { cls: 'glv-del', title: 'حذف الشراء' } : { cls: 'glv-del', disabled: true, title: 'تقدر تحذف آخر مستوى اشتريته بس' });
      }
    }
    const open = lvOpen.has(String(idx));
    const main = `<tr data-lv="${idx}" class="${r.isNext && !r.executed ? 'glv-next' : ''}${isExit ? ' glv-exit' : ''}${r.trimmed ? ' glv-off' : ''}">
      ${glvLevelCell(r.level, idx, r.executed ? r.sells.length : 0, open)}
      <td>${st}</td>
      ${glvTd(r.trimmed ? null : r.price, 'n', planned ? 'glv-plan' : '')}
      ${glvTd(r.trimmed ? null : r.qty, 'q', planned ? 'glv-plan' : '')}
      ${glvTd(r.trimmed ? null : r.amount, 'n', planned ? 'glv-plan' : '')}
      ${glvTd(soldQ || null, 'q')}
      ${glvTd(soldAvg, 'n')}
      ${glvTd(rem, 'q', 'glv-hi')}
      ${glvTd(r.executed ? r.cumHeldQty : null, 'q')}
      ${glvTd(r.cumAvgCost, 'n')}
      ${glvTd(r.cumSellTarget, 'n')}
      ${glvTd(real, 'pl')}
      ${glvTd(r.executed ? r.cumRealizedProfit : null, 'pl')}
      <td class="glv-n lv-unreal" data-q="${rem || 0}" data-p="${r.executed ? (+r.price || 0) : 0}">—</td>
      <td class="date-col glv-n glv-dim">${r.execDate ? escapeHtml(String(r.execDate).slice(0, 10)) : '—'}</td>
      <td class="date-col glv-n glv-dim">${r.daysElapsed != null ? r.daysElapsed : '—'}</td>
      <td class="date-col glv-n glv-dim">${r.tradeCloseDate ? escapeHtml(String(r.tradeCloseDate).slice(0, 10)) : '—'}</td>
      <td><span class="glv-acts">${acts}</span></td>
    </tr>`;
    const subs = r.executed ? r.sells.map((sl, k) => `<tr class="g-subrow${open ? '' : ' g-sub-closed'}" data-sub-of="${idx}">
      <td><span class="glv-subtag">بيع ${k + 1}</span></td><td><span class="glv-subtag">عملية بيع</span></td>
      <td></td><td></td><td></td>
      ${glvTd(sl.qty, 'q')}${glvTd(sl.price, 'n')}<td></td><td></td><td></td><td></td>
      ${glvTd(sl.profit, 'pl')}<td></td><td></td>
      <td class="date-col glv-n glv-dim">${sl.date ? escapeHtml(String(sl.date).slice(0, 10)) : '—'}</td><td class="date-col"></td><td class="date-col"></td>
      <td><span class="glv-acts">${glvBtn('✎', '__startEditSell', [String(symbol), idx, sl.idx], { title: 'تعديل البيع' })}${glvBtn('🗑', '__removeSell', [String(symbol), idx, sl.idx], { cls: 'glv-del', title: 'حذف البيع' })}</span></td>
    </tr>`).join('') : '';
    return main + subs;
  }).join('') + `<tr class="g-total"><td>الإجمالي</td><td></td><td></td>${glvTd(tot.bq, 'q')}${glvTd(tot.bv, 'n')}${glvTd(tot.sq, 'q')}<td></td>${glvTd(tot.rem, 'q', 'glv-hi')}<td></td><td></td><td></td>${glvTd(tot.real, 'pl')}<td></td><td class="glv-n lv-unreal-total">—</td><td class="date-col"></td><td class="date-col"></td><td class="date-col"></td><td></td></tr>`;

  const agg = planObj.closedTrades.reduce((acc,ct)=>({
    capital: acc.capital+ct.capitalUsed, profit: acc.profit+ct.profit, qty: acc.qty+ct.totalQty
  }), {capital:0, profit:0, qty:0});
  const aggProfitPercent = agg.capital>0 ? (agg.profit/agg.capital*100) : 0;

  window.__lastPageKey='plan_detail'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div><strong>${symbol}</strong> — خطة تعزيز متوسط <span class="meta-line">(${planObj.market||''} — ${planObj.currency} — بدأت ${planObj.startDate||'-'})</span></div>
      <div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button> <button class="secondary small" id="delBtn">🗑️ حذف الخطة</button> <button class="secondary small" id="backBtn">📈 كل خطط الـ DCA</button></div>
    </div>

    ${sim.isClosed ? `<div class="success-banner">
      🎉 <strong>تم بيع كل الكمية — الصفقة جاهزة للترحيل!</strong><br>
      إجمالي الكمية: ${fmtQty(sim.totalBoughtQty)} | متوسط الدخول: ${fmt2(sim.avgEntryPrice)} | متوسط الخروج: ${fmt2(sim.avgExitPrice)} |
      الربح الإجمالي: <strong>${sim.totalRealizedProfit.toFixed(2)}</strong> (${((sim.totalRealizedProfit/sim.totalBuyAmountSpent)*100).toFixed(2)}%)
      <div style="font-size:11.5px;color:#666;margin-top:6px;">ما زال بإمكانك تعديل أي عملية بيع أعلاه إذا وجدت خطأً في الكمية أو السعر. عندما تتأكد أن كل شيء صحيح، اضغط ترحيل لإغلاق الصفقة وبدء دورة جديدة — لن يقبل الجدول أي شراء جديد حتى تُرحّل.</div>
      <button class="small u-mt8" id="archiveBtn">✅ ترحيل الصفقة وبدء دورة جديدة</button>
    </div>` : ''}

    <div class="section-card">
      <button class="small secondary u-wa" id="editSettingsBtn">⚙️ تعديل إعدادات وخطة السهم</button>
    </div>

    <div class="section-card">
      <div class="capital-edit">
        <span>رأس المال الحالي المخصص:</span>
        <input type="number" step="any" id="capitalInput" value="${planObj.capital}">
        <button class="small" id="updateCapitalBtn">تحديث</button>
      </div>
    </div>

    <div class="section-card">
      <div class="capital-edit">
        <span>نسبة ربح الخروج الكلي % (لخروج كل الكمية مع بعض):</span>
        <input type="number" step="any" id="exitProfitInput" value="${planObj.exitProfitPercent??''}" placeholder="مثال: 10">
        <button class="small" id="updateExitProfitBtn">تحديث</button>
      </div>
    </div>
    ${exitTargetPrice!=null ? `<div class="info">🎯 نقطة الخروج الكلي: <strong>${fmt2(exitTargetPrice)}</strong> — لو آخر سعر للسهم وصلها أو زاد عنها، بيع كل الكمية المملوكة (${fmtQty(sim.heldQty)} سهم) يحقق ربح ${exitPct}% أو أكثر على متوسط تكلفتك (${fmt2(sim.avgCostCurrent)})${+planObj.exitProfitPercent > 0 ? '' : ' — محسوبة بنسبة ربح الخطة لأن نسبة الخروج الكلي غير محددة'}. المستوى الأقرب لها مُبرز بالأخضر في الجدول.</div>` : ''}

    <div class="summary-cards">
      <div class="summary-card"><div class="val">${fmtMoney(sim.avgCostCurrent)}</div><div class="lbl">متوسط التكلفة الحالي</div></div>
      <div class="summary-card"><div class="val" id="statusSellTarget">${fmtMoney(sim.sellTargetCurrent)}</div><div class="lbl" id="statusSellTargetLbl">هدف البيع (${planObj.profitTarget}%)</div></div>
      <div class="summary-card"><div class="val">${sim.heldQty.toLocaleString('en-US')}</div><div class="lbl">الكمية المتبقية حاليًا</div></div>
      <div class="summary-card"><div class="val">${fmtMoney(sim.totalBuyAmountSpent)}</div><div class="lbl">إجمالي المبلغ المستثمر</div></div>
      <div class="summary-card"><div class="val" id="statusSellNow">-</div><div class="lbl">الربح لو بعت كل الكمية على آخر سعر</div></div>
      <div class="summary-card"><div class="val ${sim.totalRealizedProfit>=0?'pos':'neg'}">${fmtMoney(sim.totalRealizedProfit)}</div><div class="lbl">الربح المحقق حتى الآن</div></div>
    </div>

    <div id="dynTargetNote" class="g-dyn-target" hidden></div>

    <h2 class="u-mt20">موقف السهم على آخر سعر</h2>
    <div class="section-card">
      <div class="summary-cards">
        <div class="summary-card"><div class="val" id="statusLastPriceUsed">-</div><div class="lbl" id="statusLastPriceLbl">آخر سعر للسهم (متأخر 15 دقيقة)</div></div>
        <div class="summary-card"><div class="val" id="statusTotalValue">-</div><div class="lbl">القيمة الحالية للكمية المملوكة</div></div>
        <div class="summary-card"><div class="val" id="statusUnreal">-</div><div class="lbl">الربح / الخسارة على آخر سعر</div></div>
        <div class="summary-card"><div class="val" id="statusDropPercent">-</div><div class="lbl">نسبة السعر عن متوسط التكلفة</div></div>
        <div class="summary-card"><div class="val">${exitTargetPrice!=null ? fmtMoney(exitTargetPrice) : '-'}</div><div class="lbl">نقطة الخروج الكلي${exitPct!=null ? ` (+${exitPct}%)` : ''}</div></div>
        <div class="summary-card"><div class="val" id="statusExitState">-</div><div class="lbl">حالة الخروج الكلي</div></div>
      </div>
      <details class="u-mt10"><summary class="u-fs12">🧪 سعر افتراضي للتجربة (اختياري)</summary>
        <label class="u-fs12">اكتب سعرًا لترى الحسابات عليه — لا يُحفظ، وعند مسحه يرجع الحساب على آخر سعر للسهم</label>
        <input type="number" step="any" id="manualLastPriceInput" value="" placeholder="مثال: 45.20" style="font-weight:bold;font-size:16px;max-width:220px;">
      </details>
    </div>

    <h2 class="u-mt20">جدول المستويات (تراكمي)</h2>
    <button class="secondary small u-wa" id="toggleDatesBtn">📅 إظهار/إخفاء أعمدة التواريخ</button>
    <div class="section-card u-ox">
      <table id="levelsTable" class="dates-hidden glv" data-g-rows="7" data-glv-key="dca|${escapeHtml(symbol)}">
        <thead><tr>
          <th>المستوى</th><th>الحالة</th><th>سعر الشراء</th><th>عدد الأسهم</th><th>قيمة الشراء</th>
          <th>الكمية المباعة</th><th>متوسط سعر البيع</th><th>الكمية المتبقية</th>
          <th>المتبقي تراكمي</th><th>متوسط التكلفة تراكمي</th><th>هدف البيع تراكمي</th>
          <th>الربح المحقق</th><th>الربح المحقق تراكمي</th><th>ربح/خسارة على آخر سعر</th>
          <th class="date-col">تاريخ الشراء</th><th class="date-col">الأيام المنقضية</th><th class="date-col">تاريخ غلق الصفقة</th>
          <th>إجراءات</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>

    <div class="info">طريقة تفعيل المستوى التالي: عند انخفاض السعر ${planObj.dropPercent}%</div>
    ${sim.spacingClamped ? `<div class="error">⚠️ الانخفاض المطلوب كبير جدًا بالنسبة للكمية الحالية في بعض المستويات، فتم تعديله تلقائيًا لمنع وصول السعر لصفر.</div>` : ''}

    <h2 class="u-mt20">سجل الصفقات المغلقة — ${symbol}</h2>
    <div id="dacClosedTradesWrap"></div>

    <p class="disclaimer">تنويه: هذه الحسابات مبنية فقط على المدخلات التي حددتها، ولا تُعد توصية استثمارية مضمونة.</p>
  </div>`;

  document.getElementById('homeBtn').onclick=()=>renderHome();
  document.getElementById('backBtn').onclick=()=>renderPlansList();
  document.getElementById('editSettingsBtn').onclick=()=>renderEditPlanSettings(symbol);
  document.getElementById('toggleDatesBtn').onclick=()=>{
    document.getElementById('levelsTable').classList.toggle('dates-hidden');
  };
  document.getElementById('delBtn').onclick = () => gDeletePlan('dca', symbol, () => renderPlansList());
  document.getElementById('updateCapitalBtn').onclick=async()=>{
    const newCap = parseFloat(document.getElementById('capitalInput').value);
    if(!newCap || newCap<=0) return;
    const plans2 = await getPlans(email);
    plans2[symbol].capital = newCap;
    await savePlans(email, plans2);
    renderPlanDetail(symbol);
  };

  document.getElementById('updateExitProfitBtn').onclick=async()=>{
    const val = parseFloat(document.getElementById('exitProfitInput').value);
    const plans2 = await getPlans(email);
    plans2[symbol].exitProfitPercent = (!isNaN(val) && val>0) ? val : null;
    await savePlans(email, plans2);
    renderPlanDetail(symbol);
  };

  // الإصدار 97: كل الحسابات على آخر سعر للسهم (متأخر 15 دقيقة) - أو سعر التجربة لو اتكتب - ولو السعر مش متاح ← آخر سعر شراء
  const pxKey = String(symbol).toUpperCase() + '|' + (planObj.market || 'مصر');
  let livePx = (window.__mkLivePx || {})[pxKey] || null;
  function updateStatusFields(){
    const inp = document.getElementById('manualLastPriceInput'); if (!inp) return;
    const manualVal = parseFloat(inp.value);
    const lastPriceUsed = (manualVal>0) ? manualVal : (livePx || sim.lastBoughtPrice);
    const src = planObj.listed === false ? 'آخر سعر (يدوي — سهم غير مدرج)' : manualVal>0 ? 'سعر افتراضي للتجربة' : (livePx ? 'آخر سعر للسهم (متأخر 15 دقيقة)' : 'آخر سعر شراء (سعر السوق غير متاح الآن)');
    const set = (id, txt, cls) => { const el = document.getElementById(id); if (el) { el.textContent = txt; if (cls !== undefined) el.className = 'val ' + cls; } };
    const lbl = document.getElementById('statusLastPriceLbl'); if (lbl) lbl.textContent = src;
    if (lastPriceUsed==null) { ['statusLastPriceUsed','statusTotalValue','statusUnreal','statusDropPercent','statusExitState','statusSellNow'].forEach(id => set(id, '-')); glvFillUnreal('levelsTable', null); return; }
    set('statusLastPriceUsed', fmtMoney(lastPriceUsed));
    set('statusTotalValue', fmtMoney(sim.heldQty * lastPriceUsed));
    const avg = sim.avgCostCurrent;
    if (avg!=null && avg>0 && sim.heldQty>0) {
      const pnl = (lastPriceUsed - avg) * sim.heldQty, pct = (lastPriceUsed - avg) / avg * 100;
      set('statusUnreal', fmtMoney(pnl), pnl<0 ? 'neg' : 'pos');
      set('statusSellNow', fmtMoney(pnl), pnl<0 ? 'neg' : 'pos');
      set('statusDropPercent', (pct>0?'+':'') + pct.toFixed(2) + '%', pct<0 ? 'neg' : 'pos');
      if (exitTargetPrice!=null) {
        if (lastPriceUsed >= exitTargetPrice) set('statusExitState', '✅ رابحة — تقدر تبيع الكل', 'pos');
        else set('statusExitState', `باقي ${((exitTargetPrice - lastPriceUsed) / lastPriceUsed * 100).toFixed(2)}%`, '');
      } else set('statusExitState', '-', '');
    } else { ['statusUnreal','statusDropPercent','statusExitState','statusSellNow'].forEach(id => set(id, '-', '')); }
    // ربح/خسارة كل مستوى على آخر سعر = الكمية المتبقية من المستوى × (آخر سعر − سعر شرائه)
    glvFillUnreal('levelsTable', lastPriceUsed);
    // الإصدار 115: السعر عدّى هدف البيع ← الهدف بيتفعّل على سعر السوق (الربح الفعلي بدل النسبة المخططة)
    gDynTargetPaint({ price: lastPriceUsed, target: sim.sellTargetCurrent, avg, held: sim.heldQty, pt: +planObj.profitTarget || 0,
      valId: 'statusSellTarget', lblId: 'statusSellTargetLbl', noteId: 'dynTargetNote', baseLbl: `هدف البيع (${planObj.profitTarget}%)`, trial: manualVal > 0 });
  }
  document.getElementById('manualLastPriceInput').addEventListener('input', updateStatusFields);
  if (planObj.listed === false) gUnlistedPriceBox('manualLastPriceInput', planObj, async (v) => { const p2 = await getPlans(email); if (p2[symbol]) { p2[symbol].manualLastPrice = v; await savePlans(email, p2); } planObj.manualLastPrice = v; livePx = v; updateStatusFields(); });
  updateStatusFields();
  if (planObj.listed !== false) gPlanLivePrice(__tok, { [symbol]: planObj }, {}, pxKey, (v) => { livePx = v; updateStatusFields(); });

  if (sim.isClosed) {
    document.getElementById('archiveBtn').onclick = async () => {
      const plans2 = await getPlans(email);
      const p = plans2[symbol];
      const s = simulatePlan(p);
      p.closedTrades.push({
        closedDate: new Date().toISOString(),
        totalQty: s.totalBoughtQty, avgEntry: s.avgEntryPrice, avgExit: s.avgExitPrice,
        profit: s.totalRealizedProfit, profitPercent: (s.totalRealizedProfit/s.totalBuyAmountSpent)*100,
        capitalUsed: s.totalBuyAmountSpent
      });
      p.levels.forEach(lv=>{ lv.executed=false; lv.actualQty=null; lv.actualPrice=null; lv.execDate=null; lv.sells=[]; });
      await savePlans(email, plans2);
      renderPlanDetail(symbol);
    };
  }

  renderClosedTradesUI('dacClosedTradesWrap', () => planObj.closedTrades, {
    afterChange: async () => { const plans2 = await getPlans(email); plans2[symbol] = planObj; await savePlans(email, plans2); },
    onClearAll: async () => { planObj.closedTrades = []; const plans2 = await getPlans(email); plans2[symbol] = planObj; await savePlans(email, plans2); },
    onExportXlsx: (trades) => {
      try{
        const numFmt = "mso-number-format:'#,##0.00';";
        const intFmt = "mso-number-format:'#,##0';";
        const th = "background:#14532D;color:#ffffff;font-weight:bold;border:1px solid #000000;padding:6px 10px;text-align:center;";
        const td = "border:1px solid #999999;padding:5px 10px;text-align:center;";
        const tdLabel = "border:1px solid #999999;padding:5px 10px;font-weight:bold;background:#EEF6F2;text-align:right;";
        const totalTd = "border:1px solid #000000;padding:6px 10px;text-align:center;font-weight:bold;background:#E6F4EA;";
        const titleTd = "background:#14532D;color:#ffffff;font-weight:bold;font-size:16px;padding:10px;text-align:center;";
        const exAgg = trades.reduce((acc,t)=>({qty:acc.qty+t.totalQty, capital:acc.capital+t.capitalUsed, profit:acc.profit+t.profit}), {qty:0,capital:0,profit:0});
        const exPct = exAgg.capital>0 ? (exAgg.profit/exAgg.capital*100) : 0;

        let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8">
        <xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
        <x:Name>${symbol}</x:Name><x:WorksheetOptions><x:RTL/><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
        </head><body dir="rtl">
        <table style="border-collapse:collapse;font-family:IBM Plex Sans Arabic,Tahoma,Arial;direction:rtl;" dir="rtl">
          <tr><td colspan="7" style="${titleTd}">GRIFFINE — بيان الصفقات المغلقة</td></tr>
          <tr><td style="${tdLabel}">اسم السهم</td><td colspan="6" style="${td}">${symbol}</td></tr>
          <tr><td style="${tdLabel}">الدولة / البورصة</td><td colspan="6" style="${td}">${planObj.market||''}</td></tr>
          <tr><td style="${tdLabel}">العملة</td><td colspan="6" style="${td}">${planObj.currency||''}</td></tr>
          <tr><td style="${tdLabel}">تاريخ بداية الاستثمار</td><td colspan="6" style="${td}">${planObj.startDate||''}</td></tr>
          <tr><td style="${tdLabel}">تاريخ الطباعة</td><td colspan="6" style="${td}">${new Date().toLocaleDateString('ar-EG')}</td></tr>
          <tr><td colspan="7" class="u-bn"></td></tr>
          <tr>
            <td style="${th}">تاريخ ووقت الإغلاق</td><td style="${th}">الكمية</td><td style="${th}">متوسط الدخول</td>
            <td style="${th}">متوسط الخروج</td><td style="${th}">الربح</td><td style="${th}">نسبة الربح %</td><td style="${th}">رأس المال المستخدم</td>
          </tr>
          ${trades.slice().reverse().map(ct=>`<tr>
            <td style="${td}">${formatDateTimeAr(ct.closedDate)}</td>
            <td style="${td}${intFmt}">${fmtQty(ct.totalQty)}</td>
            <td style="${td}${numFmt}">${ct.avgEntry.toFixed(2)}</td>
            <td style="${td}${numFmt}">${ct.avgExit.toFixed(2)}</td>
            <td style="${td}${numFmt}">${ct.profit.toFixed(2)}</td>
            <td style="${td}${numFmt}">${ct.profitPercent.toFixed(2)}</td>
            <td style="${td}${numFmt}">${ct.capitalUsed.toFixed(2)}</td>
          </tr>`).join('')}
          <tr>
            <td style="${totalTd}">الإجمالي</td>
            <td style="${totalTd}${intFmt}">${fmtQty(exAgg.qty)}</td>
            <td style="${totalTd}"></td><td style="${totalTd}"></td>
            <td style="${totalTd}${numFmt}">${exAgg.profit.toFixed(2)}</td>
            <td style="${totalTd}${numFmt}">${exPct.toFixed(2)}</td>
            <td style="${totalTd}${numFmt}">${exAgg.capital.toFixed(2)}</td>
          </tr>
        </table>
        </body></html>`;

        const blob = new Blob(['\ufeff'+html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `griffine_${symbol}_صفقات_مغلقة.xls`;
        a.click(); URL.revokeObjectURL(url);
      }catch(err){
        alert('حصل خطأ في تصدير الإكسيل: '+err.message);
      }
    },
    onExportPdf: (trades) => {
      const w = window.open('', '_blank');
      const exAgg = trades.reduce((acc,t)=>({qty:acc.qty+t.totalQty, capital:acc.capital+t.capitalUsed, profit:acc.profit+t.profit}), {qty:0,capital:0,profit:0});
      const exPct = exAgg.capital>0 ? (exAgg.profit/exAgg.capital*100) : 0;
      const rowsHtml = trades.slice().reverse().map(ct=>`<tr>
        <td>${formatDateTimeAr(ct.closedDate)}</td><td>${fmtQty(ct.totalQty)}</td><td>${fmt2(ct.avgEntry)}</td>
        <td>${fmt2(ct.avgExit)}</td><td>${ct.profit.toFixed(2)}</td><td>${ct.profitPercent.toFixed(2)}%</td><td>${fmt2(ct.capitalUsed)}</td>
      </tr>`).join('');
      w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>بيان صفقات ${symbol}</title>
        <style>body{font-family:IBM Plex Sans Arabic,Tahoma,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin-top:14px;}
        th,td{border:1px solid #ccc;padding:8px;text-align:center;font-size:13px;} th{background:#14532d;color:#fff;}
        h1{color:#14532d;} .agg{margin-top:16px;font-size:14px;background:#f0f4f2;padding:10px;border-radius:8px;}</style></head>
        <body>
        ${reportLogoHeaderHtml()}
        <h1>GRIFFINE — بيان الصفقات المغلقة: ${symbol}</h1>
        <p>العملة: ${planObj.currency} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
        <table><thead><tr><th>تاريخ ووقت الإغلاق</th><th>الكمية</th><th>متوسط الدخول</th><th>متوسط الخروج</th><th>الربح</th><th>نسبة الربح</th><th>رأس المال المستخدم</th></tr></thead>
        <tbody>${rowsHtml}</tbody></table>
        <div class="agg"><strong>الإجمالي التراكمي:</strong> الكمية: ${fmtQty(exAgg.qty)} | رأس المال المستخدم: ${exAgg.capital.toFixed(2)} |
        الربح: ${exAgg.profit.toFixed(2)} | نسبة الربح: ${exPct.toFixed(2)}%</div>
        
        </body></html>`);
      w.document.close(); gReportReady(w);
    },
  });

  // الإصدار 112: الشراء / التعديل / البيع من نافذة إدخال (بدل الخانات جوه الجدول) - نفس قواعد رأس المال والكمية
  window.__buyLevel = (sym, idx, maxQty) => {
    const r = sim.rows[idx] || {};
    glvModal({ title: `شراء — المستوى ${r.level}`, sub: `السعر المخطط ${glvN(r.price)} — الكمية المخططة ${glvQ(r.qty)}${maxQty ? ` — أقصى كمية على السعر ده ${glvQ(maxQty)}` : ''}`,
      q: r.qty, p: r.price != null ? +(+r.price).toFixed(2) : '', d: new Date().toISOString().slice(0, 10),
      onSave: async (v) => {
        const plans2 = await getPlans(email);
        const p = plans2[sym];
        const simBefore = simulatePlan(p);
        const remainingBudget = p.capital - simBefore.totalBuyAmountSpent;
        if (v.q * v.p > remainingBudget + 1e-6) return `⚠️ المبلغ (${glvN(v.q * v.p)}) أكبر من المتاح من رأس المال (${glvN(Math.max(remainingBudget, 0))}).`;
        const lv = p.levels[idx];
        lv.executed = true; lv.actualQty = v.q; lv.actualPrice = v.p; lv.execDate = v.d; lv.sells = [];
        await savePlans(email, plans2);
        renderPlanDetail(sym);
      } });
  };
  window.__startEditBuy = (sym, idx) => {
    const lv = planObj.levels[idx];
    glvModal({ title: `تعديل الشراء — المستوى ${lv.level}`, sub: 'عدّل الكمية أو السعر أو التاريخ', q: lv.actualQty, p: lv.actualPrice, d: lv.execDate,
      onSave: async (v) => {
        const plans2 = await getPlans(email);
        const p = plans2[sym];
        const oldAmount = (p.levels[idx].actualQty || 0) * (p.levels[idx].actualPrice || 0);
        const spentByOthers = simulatePlan(p).totalBuyAmountSpent - oldAmount;
        const remainingBudget = p.capital - spentByOthers;
        if (v.q * v.p > remainingBudget + 1e-6) return `⚠️ المبلغ الجديد (${glvN(v.q * v.p)}) أكبر من المتاح. أقصى مبلغ للمستوى ده ${glvN(Math.max(remainingBudget, 0))}.`;
        p.levels[idx].actualQty = v.q; p.levels[idx].actualPrice = v.p; p.levels[idx].execDate = v.d;
        await savePlans(email, plans2);
        renderPlanDetail(sym);
      } });
  };
  window.__deleteBuy = async (sym, idx) => {
    const plans2 = await getPlans(email);
    const hasSells = (plans2[sym].levels[idx].sells||[]).length > 0;
    const msg = hasSells
      ? 'هذا المستوى عليه عمليات بيع مسجلة، وحذف الشراء سيلغي عمليات البيع هذه أيضًا. هل أنت متأكد؟'
      : 'هل أنت متأكد من إلغاء عملية الشراء هذه؟';
    if(!await gConfirm(msg)) return;
    plans2[sym].levels[idx].executed = false;
    plans2[sym].levels[idx].actualQty = null;
    plans2[sym].levels[idx].actualPrice = null;
    plans2[sym].levels[idx].execDate = null;
    plans2[sym].levels[idx].sells = [];
    await savePlans(email, plans2);
    window.__editingBuy = null;
    renderPlanDetail(sym);
  };

  window.__sellAtLevel = (sym, idx, maxQty) => {
    const lv = planObj.levels[idx];
    // الإصدار 115: السعر = آخر سعر للسهم (متأخر 15 دقيقة) أوتوماتيك - وتقدر تكتب سعر تاني بإيدك
    const px = livePx > 0 ? livePx : null;
    glvModal({ title: `بيع — المستوى ${lv.level}`, sub: `الكمية المتاحة للبيع ${glvQ(maxQty)} — متوسط التكلفة ${glvN(sim.avgCostCurrent)}`, q: maxQty, p: px != null ? +px.toFixed(2) : '', maxQ: maxQty,
      cost: sim.avgCostCurrent, okText: 'تنفيذ البيع',
      pxNote: px != null ? `السعر = آخر سعر للسهم (متأخر 15 دقيقة) ${glvN(px)} — تقدر تكتب سعر تاني والحساب هيمشي عليه.` : 'آخر سعر للسهم غير متاح الآن — اكتب سعر البيع.',
      onSave: async (v) => {
        const plans2 = await getPlans(email);
        const L = plans2[sym].levels[idx]; if (!L.sells) L.sells = [];
        L.sells.push({ qty: v.q, price: v.p, date: v.d });
        glvOpenSet('dca|' + sym).add(String(idx));
        await savePlans(email, plans2);
        renderPlanDetail(sym);
      } });
  };
  window.__startEditSell = (sym, idx, sIdx) => {
    const cur = planObj.levels[idx].sells[sIdx]; if (!cur) return;
    // أقصى كمية = المتاح في المستوى ده بعد استبعاد البيع ده
    const tmp = JSON.parse(JSON.stringify(planObj)); tmp.levels[idx].sells[sIdx].qty = 0;
    const maxAllowed = simulatePlan(tmp).rows[idx].cumHeldQty;
    glvModal({ title: `تعديل البيع ${sIdx + 1} — المستوى ${planObj.levels[idx].level}`, sub: `أقصى كمية ${glvQ(maxAllowed)}`, q: cur.qty, p: cur.price, d: cur.date, maxQ: maxAllowed, cost: (() => { const ss = ((sim.rows[idx] || {}).sells || []).find(x => x.idx === sIdx); return ss && ss.avgCostAtSale > 0 ? ss.avgCostAtSale : sim.avgCostCurrent; })(),
      onSave: async (v) => {
        const plans2 = await getPlans(email);
        plans2[sym].levels[idx].sells[sIdx] = { qty: v.q, price: v.p, date: v.d };
        await savePlans(email, plans2);
        renderPlanDetail(sym);
      } });
  };
  window.__removeSell = async (sym, idx, sIdx) => {
    if(!await gConfirm('هل أنت متأكد من حذف عملية البيع هذه؟')) return;
    const plans2 = await getPlans(email);
    plans2[sym].levels[idx].sells.splice(sIdx,1);
    await savePlans(email, plans2);
    window.__editingSell = null;
    renderPlanDetail(sym);
  };
}

