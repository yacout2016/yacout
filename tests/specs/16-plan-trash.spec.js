// الإصدار 99: أي مستخدم (عميل / موظف / أدمن) يحذف خطته (DCA أو Grid) ← سلة المحذوفات ← يسترجعها أو يحذفها نهائيًا
const { check, summary, launch, q, BASE } = require('../lib');
const ACC = [
  { who: 'العميل', email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' },
  { who: 'الموظف', email: 'yacout2021@gmail.com', pass: process.env.GT_STAFF_PASS || 'Test12345' },
  { who: 'الأدمن', email: 'top72026@gmail.com', pass: process.env.GT_ADMIN_PASS || 'Test12345' },
];
const dca = { symbol: 'COMI', market: 'مصر', currency: 'جنيه مصري', currentPrice: 80, capital: 10000, seedAmount: 1000, dropPercent: 5, volumeIncrease: 0, profitTarget: 5,
  levels: [{ level: 1, executed: true, actualQty: 10, actualPrice: 80, execDate: '2026-09-01', sells: [{ qty: 10, price: 90, date: '2026-09-10' }] }, { level: 2, executed: false, sells: [] }], closedTrades: [] };
const dcaOpen = Object.assign({}, dca, { symbol: 'TMGH', levels: [{ level: 1, executed: true, actualQty: 5, actualPrice: 50, execDate: '2026-09-01', sells: [] }, { level: 2, executed: false, sells: [] }] });
const grid = { symbol: 'HRHO', market: 'مصر', capital: 5000, tradeSize: 500, rangeLow: 15, rangeHigh: 25, createdAt: '2026-09-01', cycleHistory: [], closedTrades: [], closed: false,
  levels: [{ plannedPrice: 20, plannedQty: 25, status: 'empty', sells: [], cycles: 0 }, { plannedPrice: 18, plannedQty: 27, status: 'empty', sells: [], cycles: 0 }] };
(async () => {
  q("DELETE FROM login_attempts");
  const b = await launch();
  for (const acc of ACC) {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); p.__errors = []; p.on('pageerror', e => p.__errors.push(e.message));
    await p.goto(BASE + '/index.php'); await p.waitForTimeout(1200);
    const lg = await p.evaluate(async ([e, pw]) => { window.alert = () => {}; const x = await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); return x; }, [acc.email, acc.pass]);
    check(`${acc.who}: تسجيل الدخول`, lg && lg.success);
    q(`DELETE FROM trash_bin WHERE owner_email='${acc.email}' OR deleted_by='${acc.email}'`);
    const old = await p.evaluate(async ([d, g, o]) => {
      const a = await apiGet('/user_data_get.php?key=plans'), c = await apiGet('/user_data_get.php?key=grid_plans');
      await apiPost('/user_data_save.php', { key: 'plans', value: JSON.stringify({ COMI: d, TMGH: o }), base: JSON.stringify(a.versions || {}) });
      await apiPost('/user_data_save.php', { key: 'grid_plans', value: JSON.stringify({ HRHO: g }), base: JSON.stringify(c.versions || {}) });
      return [a.value || '{}', c.value || '{}'];
    }, [dca, grid, dcaOpen]);
    // خطة فيها صفقات مفتوحة ← الحذف مرفوض ولازم تقفلها الأول
    await p.evaluate(() => { window.__lastAlert = ''; window.gAlert = async (m) => { window.__lastAlert = m; return true; }; window.gConfirm = async (m) => { window.__lastConfirm = m; return true; }; });
    await p.evaluate(() => renderPlansList()); await p.waitForTimeout(1500);
    await p.click('.plan-list-item[data-sym="TMGH"] [data-gcall="__delDacPlanFromList"]'); await p.waitForTimeout(1200);
    check(`${acc.who}: خطة فيها صفقات مفتوحة ← الحذف مرفوض مع طلب قفل الصفقات`, /صفقات مفتوحة/.test(await p.evaluate(() => window.__lastAlert)) && q(`SELECT deleted FROM user_plans WHERE account_email='${acc.email}' AND plan_type='plans' AND symbol='TMGH'`) === '0');
    // حذف خطة DCA مقفولة من القائمة (ليها ربح محقق 100 ← رسالة إنها هتتحفظ بحساباتها في السلة)
    await p.click('.plan-list-item[data-sym="COMI"] [data-gcall="__delDacPlanFromList"]'); await p.waitForTimeout(1500);
    check(`${acc.who}: رسالة الحذف بتوضح النتائج المالية (ربح 100) وإنها بتتحفظ في السلة`, /ربح محقق 100/.test(await p.evaluate(() => window.__lastConfirm || '')));
    check(`${acc.who}: حذف خطة DCA من القائمة ← اتشالت`, q(`SELECT deleted FROM user_plans WHERE account_email='${acc.email}' AND plan_type='plans' AND symbol='COMI'`) === '1');
    // حذف خطة Grid من شاشة الخطة
    await p.evaluate(() => { window.gConfirm = async () => true; renderGridPlanDetail('HRHO'); }); await p.waitForTimeout(1800);
    await p.click('#gridDelBtn'); await p.waitForTimeout(1500);
    check(`${acc.who}: حذف خطة Grid من شاشتها ← اتشالت`, q(`SELECT deleted FROM user_plans WHERE account_email='${acc.email}' AND plan_type='grid_plans' AND symbol='HRHO'`) === '1');
    // السلة
    await p.evaluate(() => renderTrashPage()); await p.waitForTimeout(1500);
    const rows = await p.$$eval('#tbRows tr[data-type="plan"]', r => r.map(x => x.textContent));
    check(`${acc.who}: الخطتين في سلة المحذوفات`, rows.some(t => /COMI/.test(t)) && rows.some(t => /HRHO/.test(t)), rows.join(' | ').slice(0, 120));
    // استرجاع DCA
    const resBtn = await p.$('#tbRows tr[data-type="plan"]:has-text("COMI") [data-tbres]'); await resBtn.click(); await p.waitForTimeout(1500);
    check(`${acc.who}: استرجاع خطة DCA ← رجعت مكانها`, q(`SELECT deleted FROM user_plans WHERE account_email='${acc.email}' AND plan_type='plans' AND symbol='COMI'`) === '0');
    const back = await p.evaluate(async () => JSON.parse((await apiGet('/user_data_get.php?key=plans')).value || '{}').COMI);
    check(`${acc.who}: الخطة المسترجعة بنفس بياناتها وحساباتها`, back && back.levels[0].actualQty === 10 && back.levels[0].sells.length === 1 && back.capital === 10000);
    // حذف نهائي لـ Grid من السلة
    await p.evaluate(() => { window.gConfirm = async () => true; }); const delBtn = await p.$('#tbRows tr[data-type="plan"]:has-text("HRHO") [data-tbdel]'); await delBtn.click(); await p.waitForTimeout(1500);
    check(`${acc.who}: حذف نهائي من السلة`, +q(`SELECT COUNT(*) FROM trash_bin WHERE owner_email='${acc.email}' AND item_label LIKE '%HRHO%' AND restored_at IS NULL`) === 0);
    check(`${acc.who}: بدون أخطاء JavaScript`, !p.__errors.length, p.__errors[0]);
    // رجوع الخطط الأصلية
    await p.evaluate(async ([a, c]) => {
      const x = await apiGet('/user_data_get.php?key=plans'); await apiPost('/user_data_save.php', { key: 'plans', value: a, base: JSON.stringify(x.versions || {}) });
      const y = await apiGet('/user_data_get.php?key=grid_plans'); await apiPost('/user_data_save.php', { key: 'grid_plans', value: c, base: JSON.stringify(y.versions || {}) });
    }, old);
    q(`DELETE FROM trash_bin WHERE owner_email='${acc.email}' OR deleted_by='${acc.email}'`);
  }
  // الاسترجاع مبيكتبش فوق خطة جديدة لنفس السهم
  const p = await (await b.newContext()).newPage(); await p.goto(BASE + '/index.php'); await p.waitForTimeout(1000);
  await p.evaluate(async ([e, pw]) => { window.alert = () => {}; await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); }, [ACC[0].email, ACC[0].pass]);
  const r = await p.evaluate(async (d) => {
    const a = await apiGet('/user_data_get.php?key=plans'); const old = a.value || '{}';
    await apiPost('/user_data_save.php', { key: 'plans', value: JSON.stringify({ COMI: d }), base: JSON.stringify(a.versions || {}) });
    const b1 = await apiGet('/user_data_get.php?key=plans'); await apiPost('/user_data_save.php', { key: 'plans', value: '{}', base: JSON.stringify(b1.versions || {}) });   // حذف ← السلة
    const b2 = await apiGet('/user_data_get.php?key=plans'); await apiPost('/user_data_save.php', { key: 'plans', value: JSON.stringify({ COMI: Object.assign({}, d, { capital: 777 }) }), base: JSON.stringify(b2.versions || {}) });   // خطة جديدة لنفس السهم
    const list = await apiGet('/trash_api.php?action=list'); const it = (list.items || []).find(i => /COMI/.test(i.item_label));
    const res = await apiPost('/trash_api.php', { action: 'restore', id: it.id });
    const now = JSON.parse((await apiGet('/user_data_get.php?key=plans')).value).COMI;
    const b3 = await apiGet('/user_data_get.php?key=plans'); await apiPost('/user_data_save.php', { key: 'plans', value: old, base: JSON.stringify(b3.versions || {}) });
    return { ok: res.success, msg: res.message, cap: now.capital };
  }, dca);
  check('الاسترجاع مبيكتبش فوق خطة جديدة لنفس السهم (رسالة واضحة)', !r.ok && /توجد خطة حالية/.test(r.msg || '') && r.cap === 777, JSON.stringify(r));
  q(`DELETE FROM trash_bin WHERE owner_email='${ACC[0].email}'`);
  await b.close();
  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
