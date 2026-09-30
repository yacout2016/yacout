// الإصدار 111: قائمة خطط الشبكة (Grid) بنفس شكل قائمة الـ DCA (بحث + الكل/مفتوحة/مقفولة + «تقرير سهم» PDF/Excel)
//              + نطاق خطة الشبكة «تلقائي / يدوي» + المدة (يومي ... سنة) ← آخر سعر + أعلى/أقل سعر للمدة
const { check, summary, launch, page, loginAdmin } = require('../lib');
(async () => {
  const b = await launch(); const a = await page(b, { width: 1280, height: 900 }); await loginAdmin(a);

  const old = await a.evaluate(async () => {
    const d = await apiGet('/user_data_get.php?key=plans'), g = await apiGet('/user_data_get.php?key=grid_plans');
    const lvD = [{ level: 1, executed: true, actualQty: 10, actualPrice: 70, execDate: '2026-09-01', sells: [] }, { level: 2, executed: false, sells: [] }];
    await apiPost('/user_data_save.php', { key: 'plans', value: JSON.stringify({ COMI: { symbol: 'COMI', market: 'مصر', currency: 'جنيه مصري', currentPrice: 70, capital: 5000, seedAmount: 700, dropPercent: 5, volumeIncrease: 0, profitTarget: 5, startDate: '2026-09-01', levels: lvD, closedTrades: [] } }), base: JSON.stringify(d.versions || {}) });
    const gp = {
      HRHO: { symbol: 'HRHO', market: 'مصر', capital: 10000, tradeSize: 1000, rangeLow: 15, rangeHigh: 25, createdAt: '2026-09-01', cycleHistory: [{ date: '2026-09-05', profit: 50, cumulative: 50 }], closedTrades: [],
        levels: [{ plannedPrice: 22, plannedQty: 45, status: 'bought', executedQty: 45, executedPrice: 22, executedDate: '2026-09-02', sellTargetPrice: 24, sells: [], cycles: 1 }, { plannedPrice: 20, plannedQty: 50, status: 'empty', sells: [], cycles: 0 }] },
      TMGH: { symbol: 'TMGH', market: 'مصر', capital: 8000, tradeSize: 800, rangeLow: 40, rangeHigh: 60, createdAt: '2026-08-01', closed: true, cycleHistory: [{ date: '2026-08-20', profit: 120, cumulative: 120 }],
        closedTrades: [{ closedDate: '2026-08-20T10:00:00', totalQty: 20, avgEntry: 45, avgExit: 51, profit: 120, profitPercent: 13.3, capitalUsed: 900 }],
        levels: [{ plannedPrice: 50, plannedQty: 16, status: 'empty', sells: [], cycles: 1 }] },
    };
    await apiPost('/user_data_save.php', { key: 'grid_plans', value: JSON.stringify(gp), base: JSON.stringify(g.versions || {}) });
    return { d: d.value || '{}', g: g.value || '{}' };
  });

  // 1) نفس هيكل قائمة الـ DCA
  const shape = async () => a.evaluate(() => [...document.querySelector('#app .container').children].filter(e => !e.matches('.gs-shell-skip,script,style') && e.offsetParent !== null || e.id === 'gplTotal')
    .map(e => e.id === 'gplTotal' ? 'gpl' : e.matches('.topbar') ? 'topbar' : e.matches('.std-filter-bar') ? 'filter' : e.matches('.plans-list-scroll') ? 'list' : e.matches('.section-card') ? 'card' : e.tagName === 'H2' ? 'h2' : e.tagName === 'BUTTON' ? 'btn' : '').filter(Boolean).join(','));
  await a.evaluate(() => renderPlansList()); await a.waitForTimeout(2200);
  const dShape = await shape();
  await a.evaluate(() => renderGridPlansList()); await a.waitForTimeout(2500);
  const gShape = await shape();
  check('قائمة الشبكة بنفس ترتيب عناصر قائمة الـ DCA', dShape === gShape && /filter,list/.test(gShape) && /card/.test(gShape), `${gShape} | DCA: ${dShape}`);
  const L = await a.evaluate(() => ({
    tabs: [...document.querySelectorAll('.gridListFilterBtn')].map(x => x.textContent.trim()),
    items: document.querySelectorAll('#gridListWrap .plan-list-item').length,
    arrows: document.querySelectorAll('#gridListWrap .plan-list-item span').length,
    edit: document.querySelectorAll('#gridListWrap [data-gcall="__editGridFromList"]').length,
    rpt: !!document.getElementById('gridRptPrintBtn') && !!document.getElementById('gridRptExportXlsBtn') && !!document.getElementById('gridRptFrom'),
    rptSyms: [...document.querySelectorAll('.gridRptSymCheck')].map(x => x.value).sort().join(','),
    px: (document.querySelector('.gpl-px[data-sym="HRHO"]') || {}).textContent || '',
  }));
  check('فلاتر: الكل / مفتوحة فقط / مقفولة فقط', L.tabs.join('|') === 'الكل|مفتوحة فقط|مقفولة فقط', L.tabs.join('|'));
  check('كل الخطط (النشطة والمقفولة) في قائمة واحدة + تعديل لكل خطة', L.items === 2 && L.edit === 2, JSON.stringify(L));
  check('ربح الخطة المفتوحة على آخر سعر', /آخر سعر/.test(L.px) && /20/.test(L.px), L.px);
  check('قسم «تقرير سهم» (من/إلى + اختيار الأسهم + PDF + Excel)', L.rpt && L.rptSyms === 'HRHO,TMGH', JSON.stringify(L));
  const vis = () => a.evaluate(() => [...document.querySelectorAll('#gridListWrap .plan-list-item')].filter(x => x.style.display !== 'none').map(x => x.dataset.sym).join(','));
  await a.click('.gridListFilterBtn[data-status="مفتوحة"]'); const v1 = await vis();
  await a.click('.gridListFilterBtn[data-status="مقفولة"]'); const v2 = await vis();
  await a.click('.gridListFilterBtn[data-status="all"]'); await a.fill('#gridListSearch', 'hr'); const v3 = await vis();
  await a.fill('#gridListSearch', 'zzz'); const emp = await a.evaluate(() => document.getElementById('gridListEmpty').style.display !== 'none');
  await a.fill('#gridListSearch', '');
  check('فلتر «مفتوحة فقط» ← HRHO', v1 === 'HRHO', v1);
  check('فلتر «مقفولة فقط» ← TMGH', v2 === 'TMGH', v2);
  check('البحث باسم السهم', v3 === 'HRHO', v3);
  check('رسالة «لا توجد خطط مطابقة»', emp);

  // 2) تقرير سهم: PDF + Excel لخطط الشبكة
  const rep = await a.evaluate(async () => {
    let html = '', xls = '', name = '';
    window.open = () => ({ document: { write: (h) => { html += h; }, close(){} }, focus(){}, print(){}, addEventListener(){}, set onload(f){}, closed: false });
    window.buildAndDownloadMhtmlXls = (h, img, n) => { xls = h; name = n; };
    document.getElementById('gridRptSelectAll').click();
    const lbl = document.getElementById('gridRptMsToggleBtn').textContent;
    try { document.getElementById('gridRptPrintBtn').click(); } catch(e){}
    document.getElementById('gridRptExportXlsBtn').click();
    return { lbl, pdf: /HRHO/.test(html) && /TMGH/.test(html) && /تفاصيل عمليات: HRHO \(Grid/.test(html) && /دورة مكتملة/.test(html), xls: /تفاصيل عمليات: TMGH \(Grid\)/.test(xls) && /الإجمالي/.test(xls), name };
  });
  check('تحديد كل الأسهم', /كل الأسهم \(2\)/.test(rep.lbl), rep.lbl);
  check('تقرير PDF للأسهم المحددة (ملخص + تفاصيل عمليات الشبكة)', rep.pdf);
  check('تصدير التقرير Excel', rep.xls && /شبكة/.test(rep.name), rep.name);

  // 3) الضغط على الخطة يفتحها
  await a.evaluate(() => renderGridPlansList()); await a.waitForTimeout(1500);
  await a.click('#gridListWrap .plan-list-item[data-sym="HRHO"] strong'); await a.waitForTimeout(1500);
  check('الضغط على الخطة يفتح تفاصيلها', await a.evaluate(() => window.__lastPageKey === 'grid_plan_detail' && /HRHO/.test(document.querySelector('#app').textContent)));

  // 4) خطة جديدة: النطاق تلقائي (الافتراضي) + المدة
  await a.evaluate(() => renderGridPlanForm()); await a.waitForTimeout(1200);
  const f0 = await a.evaluate(() => ({ auto: document.querySelector('input[name="g_rangeMode"][value="auto"]').checked, per: document.getElementById('g_rangePeriod').value, dis: document.getElementById('g_rangePeriod').disabled,
    opts: [...document.getElementById('g_rangePeriod').options].map(o => o.textContent).join('|'),
    order: (() => { const box = document.querySelector('.g-range-box'), hi = document.getElementById('g_high'); return !!(box.compareDocumentPosition(hi) & Node.DOCUMENT_POSITION_FOLLOWING); })() }));
  check('الافتراضي «تلقائي» والمدة شغالة (شهري)', f0.auto && f0.per === 'month' && !f0.dis, JSON.stringify(f0));
  check('المدد: يومي / أسبوعي / شهري / 3 شهور / 6 شهور / سنة', f0.opts === 'يومي|أسبوعي|شهري|3 شهور|6 شهور|سنة', f0.opts);
  check('اختيار التلقائي/اليدوي والمدة قبل خانات السقف والقاع', f0.order);
  await a.fill('#g_symbol', 'HRHO'); await a.waitForTimeout(2200);
  const r1 = await a.evaluate(() => ({ hi: document.getElementById('g_high').value, lo: document.getElementById('g_low').value, info: document.getElementById('g_rangeInfo').textContent }));
  check('بعد كتابة السهم: آخر سعر يظهر (20)', /آخر سعر\s*20/.test(r1.info), r1.info);
  check('شهري: السقف = أعلى سعر (22) والقاع = أقل سعر (18)', +r1.hi === 22 && +r1.lo === 18, JSON.stringify(r1));
  await a.selectOption('#g_rangePeriod', '3months'); await a.waitForTimeout(1800);
  const r2 = await a.evaluate(() => [document.getElementById('g_high').value, document.getElementById('g_low').value]);
  check('3 شهور: 24 / 16', +r2[0] === 24 && +r2[1] === 16, r2.join('/'));
  await a.selectOption('#g_rangePeriod', 'day'); await a.waitForTimeout(1800);
  const r3 = await a.evaluate(() => [document.getElementById('g_high').value, document.getElementById('g_low').value, document.getElementById('g_rangeInfo').textContent]);
  check('يومي: 20.4 / 19.6', +r3[0] === 20.4 && +r3[1] === 19.6, r3.join('/'));
  await a.selectOption('#g_rangePeriod', 'week'); await a.waitForTimeout(2200);
  const r4 = await a.evaluate(() => [+document.getElementById('g_high').value, +document.getElementById('g_low').value]);
  check('أسبوعي: أعلى وأقل سعر من شموع آخر أسبوع', r4[0] >= 20 && r4[1] > 0 && r4[1] < 20 && r4[0] > r4[1], r4.join('/'));
  await a.fill('#g_high', '23.5'); await a.fill('#g_low', '17'); await a.waitForTimeout(300);
  check('تعديل يدوي للقيمتين في الوضع التلقائي', await a.evaluate(() => document.getElementById('g_high').value === '23.5' && document.getElementById('g_low').value === '17' && !document.getElementById('g_high').readOnly));
  await a.selectOption('#g_rangePeriod', 'month'); await a.waitForTimeout(1800);

  // يدوي ← المدة مطفية
  await a.check('input[name="g_rangeMode"][value="manual"]'); await a.waitForTimeout(300);
  const m1 = await a.evaluate(() => ({ dis: document.getElementById('g_rangePeriod').disabled, info: document.getElementById('g_rangeInfo').textContent, hi: document.getElementById('g_high').value }));
  check('يدوي: قائمة المدة مطفية', m1.dis && /يدوي/.test(m1.info), JSON.stringify(m1));
  await a.fill('#g_high', '30'); await a.fill('#g_low', '10'); await a.fill('#g_symbol', 'HRH'); await a.fill('#g_symbol', 'HRHO'); await a.waitForTimeout(1800);
  check('يدوي: تغيير السهم مبيغيّرش القيم اللي كتبتها', await a.evaluate(() => document.getElementById('g_high').value === '30' && document.getElementById('g_low').value === '10'));
  await a.check('input[name="g_rangeMode"][value="auto"]'); await a.waitForTimeout(1800);
  check('رجوع للتلقائي ← القيم تتملى تاني للمدة المختارة', await a.evaluate(() => +document.getElementById('g_high').value === 22 && +document.getElementById('g_low').value === 18 && !document.getElementById('g_rangePeriod').disabled));

  // سهم غير مدرج ← يدوي بس
  await a.check('input[name="g_listed"][value="0"]'); await a.waitForTimeout(300);
  const u1 = await a.evaluate(() => ({ autoDis: document.querySelector('input[name="g_rangeMode"][value="auto"]').disabled, man: document.querySelector('input[name="g_rangeMode"][value="manual"]').checked, per: document.getElementById('g_rangePeriod').disabled }));
  check('سهم غير مدرج: يدوي بس والمدة مطفية', u1.autoDis && u1.man && u1.per, JSON.stringify(u1));
  await a.check('input[name="g_listed"][value="1"]'); await a.check('input[name="g_rangeMode"][value="auto"]');

  // إنشاء الخطة ← الاختيار والمدة بيتحفظوا
  await a.fill('#g_symbol', 'CRVX'); await a.waitForTimeout(2200);
  await a.selectOption('#g_rangePeriod', '3months'); await a.waitForTimeout(1800);
  await a.fill('#g_capital', '5000'); await a.fill('#g_risk', '10'); await a.waitForTimeout(200);
  await a.click('#genLevelsBtn'); await a.waitForTimeout(300);
  await a.click('#createGridBtn'); await a.waitForTimeout(2500);
  const saved = await a.evaluate(async () => { const g = (await getGridPlans(await getSession())).CRVX; return g ? { m: g.rangeMode, p: g.rangePeriod, hi: g.rangeHigh, lo: g.rangeLow } : null; });
  check('الخطة اتحفظت بـ «تلقائي — 3 شهور» والسقف والقاع (14.4 / 9.6)', saved && saved.m === 'auto' && saved.p === '3months' && saved.hi === 14.4 && saved.lo === 9.6, JSON.stringify(saved));

  // تعديل الخطة: الاختيار محفوظ + القيم المحفوظة متتغيرش لوحدها عند الفتح
  await a.evaluate(async () => { const e = await getSession(), g = await getGridPlans(e); g.CRVX.rangeHigh = 14; await saveGridPlans(e, g); renderGridEditPlanSettings('CRVX'); }); await a.waitForTimeout(2200);
  const e1 = await a.evaluate(() => ({ auto: document.querySelector('input[name="ge_rangeMode"][value="auto"]').checked, per: document.getElementById('ge_rangePeriod').value, hi: document.getElementById('ge_high').value, info: document.getElementById('ge_rangeInfo').textContent }));
  check('شاشة التعديل: «تلقائي — 3 شهور» زي ما اتحفظ', e1.auto && e1.per === '3months', JSON.stringify(e1));
  check('شاشة التعديل: السقف المحفوظ (14) ميتغيرش عند الفتح + آخر سعر ظاهر', e1.hi === '14' && /آخر سعر\s*12/.test(e1.info), JSON.stringify(e1));
  await a.selectOption('#ge_rangePeriod', 'month'); await a.waitForTimeout(1800);
  check('شاشة التعديل: تغيير المدة ← شهري 13.2 / 10.8', await a.evaluate(() => +document.getElementById('ge_high').value === 13.2 && +document.getElementById('ge_low').value === 10.8));
  await a.evaluate(async () => { const e = await getSession(), g = await getGridPlans(e); delete g.CRVX.rangeMode; delete g.CRVX.rangePeriod; await saveGridPlans(e, g); renderGridEditPlanSettings('CRVX'); }); await a.waitForTimeout(1500);
  check('خطة قديمة (من غير اختيار محفوظ) بتفتح «يدوي»', await a.evaluate(() => document.querySelector('input[name="ge_rangeMode"][value="manual"]').checked && document.getElementById('ge_rangePeriod').disabled));

  check('بدون أخطاء JavaScript', !a.__errors.length, a.__errors[0]);

  // تنظيف
  await a.evaluate(async (o) => {
    const d = await apiGet('/user_data_get.php?key=plans'); await apiPost('/user_data_save.php', { key: 'plans', value: o.d, base: JSON.stringify(d.versions || {}) });
    const g = await apiGet('/user_data_get.php?key=grid_plans'); await apiPost('/user_data_save.php', { key: 'grid_plans', value: o.g, base: JSON.stringify(g.versions || {}) });
  }, old);
  await b.close(); process.exit(summary());
})();
