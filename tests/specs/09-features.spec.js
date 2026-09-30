// مراجعة شاملة: كل ميزة في الإصدارات 88 و89 موجودة وشغالة فعليًا في الواجهة (حساب الأدمن)
const { check, summary, launch, page, loginAdmin, q, ADMIN } = require('../lib');
(async () => {
  const b = await launch(); const p = await page(b); await loginAdmin(p);
  const txt = async () => (await p.textContent('#app')).replace(/\s+/g, ' ');
  const go = async (fn, ms = 1800) => { await p.evaluate(fn); await p.waitForTimeout(ms); };
  // خطة فيها عمليات بتواريخ مختلفة ← المنحنى يظهر فورًا
  await p.evaluate(async () => {
    const g = await apiGet('/user_data_get.php?key=plans'); const m = JSON.parse(g.value || '{}');
    m.CRVX = { market:'مصر', levels:[{ level:1, executed:true, actualQty:100, actualPrice:10, execDate:'2026-07-01', sells:[] }, { level:2, executed:true, actualQty:100, actualPrice:9, execDate:'2026-08-01', sells:[{ qty:50, price:12, date:'2026-09-01' }] }], closedTrades:[] };
    await apiPost('/user_data_save.php', { key:'plans', value: JSON.stringify(m), base: JSON.stringify(g.versions || {}) });
  });
  await go(() => renderHome(), 3500);
  check('الرئيسية: بطاقة إجمالي المحفظة', await p.locator('#gsHero').count() === 1 && (await p.textContent('#gsHero')).trim().length > 0);
  check('الرئيسية: منحنى أداء إجمالي المحفظة ظاهر للأدمن (SVG)', await p.locator('#gsCurve svg').count() === 1, (await p.textContent('#gsCurve')).slice(0, 80));
  // الإصدار 90: جداول المحفظة والتقارير 10 صفوف والباقي تمرير
  await p.evaluate(async () => { const g = await apiGet('/user_data_get.php?key=plans'); const m = JSON.parse(g.value || '{}');
    for (let i = 1; i <= 12; i++) m['RW' + i] = { market:'مصر', levels:[{ level:1, executed:true, actualQty:10, actualPrice:5 + i, execDate:'2026-09-02', sells:[] }], closedTrades:[] };
    await apiPost('/user_data_save.php', { key:'plans', value: JSON.stringify(m), base: JSON.stringify(g.versions || {}) }); });
  await go(() => renderPortfolio(), 3000);
  const lim = await p.evaluate(() => { const w = document.querySelector('#app .gs-rows-limit'); if (!w) return null; const t = w.querySelector('table'); const top = t.tFoot ? t.tFoot.getBoundingClientRect().top : w.getBoundingClientRect().bottom;
    return { rows: t.tBodies[0].rows.length, visible: [...t.tBodies[0].rows].filter(r => r.getBoundingClientRect().bottom <= top + 2).length, scroll: w.scrollHeight > w.clientHeight }; });
  check('المحفظة والتقارير: 7 صفوف ظاهرة والباقي تمرير', lim && lim.rows > 7 && lim.visible === 7 && lim.scroll, JSON.stringify(lim));
  await p.evaluate(async () => { const g = await apiGet('/user_data_get.php?key=plans'); const m = JSON.parse(g.value || '{}'); for (let i = 1; i <= 12; i++) delete m['RW' + i]; await apiPost('/user_data_save.php', { key:'plans', value: JSON.stringify(m), base: JSON.stringify(g.versions || {}) }); });
  q(`DELETE FROM trash_bin WHERE item_label LIKE '%RW%'`);
  await go(() => renderHome(), 2500);
  const side = await p.$$eval('.gs-side-item', x => x.map(e => e.textContent.trim()).join('|'));
  for (const l of ['قائمة المتابعة', 'تنبيهات الأسعار', 'سلة المحذوفات', 'تقرير الصفقات', 'شؤون الموظفين'])
    check(`القائمة الجانبية: ${l}`, side.includes(l));
  await go(() => renderWatchlistPage());
  check('قائمة المتابعة (v88)', /قائمة المتابعة/.test(await txt()));
  await go(() => renderStockPage('COMI', 'مصر'), 2500);
  check('صفحة السهم بالسعر والشارت (v88)', /COMI/.test(await txt()) && await p.locator('iframe, .tradingview-widget-container, [id*="tv"]').count() > 0);
  await go(() => renderAlertsPage());
  check('تنبيهات السعر المخصّصة: البورصة/العملة/السهم/الشرط/التكرار/الفرق (v89)', await p.locator('#caMkt, #caCcy, #caSym, #caCond, #caRep, #caInt').count() === 6);
  await go(() => renderTrashPage());
  check('سلة المحذوفات (v89)', /سلة المحذوفات/.test(await txt()));
  await go(() => renderTradesReportPage(), 2500);
  check('تقرير الصفقات (v89)', await p.locator('.g-kpis').count() === 1);
  await go(() => renderFaqAdminPage());
  check('إدارة المساعد الذكي (v89)', await p.locator('#faqToggle').count() === 1);
  await go(() => renderHrPage());
  check('شؤون الموظفين HR', await p.locator('#hrBody').count() === 1);
  await go(() => renderAdminSettingsPage(), 2500);
  check('لوحة التحكم: قناة OTP + رقم الموقع + واتساب (v88)', await p.locator('#cfgOtpChannel, #cfgSiteNumber, #cfgWaPhoneId').count() === 3);
  await go(() => GShell.renderEmailCenter());
  const ec = await txt();
  check('مركز الإيميلات: الوارد + الأرشيف + سلة المحذوفات (v88)', /الأرشيف/.test(ec) && /سلة/.test(ec));
  const rn = await p.evaluate(() => apiGet('/renewal_api.php?action=status'));
  check('التجديد التلقائي مع Paymob (v88)', rn && rn.success === true);
  // اللغة: فصحى بسيطة في الشاشات الرئيسية
  const colloquial = /(دلوقتي|عشان|إزاي|ازاي|علشان|بتاعك|عايز|مفيش)/;
  const bad = [];
  for (const fn of ['renderHome()', 'renderPlansList()', 'renderPortfolio()', 'renderAlertsPage()', 'renderTrashPage()', 'GShell.renderAccount()']) {
    await go(fn, 1500); const m = (await txt()).match(colloquial); if (m) bad.push(fn + ': ' + m[0]);
  }
  check('لغة الواجهة فصحى بسيطة في الشاشات الرئيسية (v88)', !bad.length, bad.join(', '));
  await go(() => renderAdminHub());
  check('أيقونات SVG موحّدة في الأزرار (v89)', await p.locator('button .g-ic svg, .nav-icon svg').count() > 5);
  check('بدون أخطاء JavaScript', !p.__errors.length, p.__errors[0]);
  // تنظيف
  await p.evaluate(async () => { const g = await apiGet('/user_data_get.php?key=plans'); const m = JSON.parse(g.value || '{}'); delete m.CRVX; await apiPost('/user_data_save.php', { key:'plans', value: JSON.stringify(m), base: JSON.stringify(g.versions || {}) }); });
  q(`DELETE FROM trash_bin WHERE item_label LIKE '%CRVX%'`);
  await b.close(); process.exit(summary());
})();
