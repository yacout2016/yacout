// الإصدار 105: تقرير الصفقات مباشر من الخطط (نفس حساب الرئيسية) - كل المشتركين + اختيار مشترك/أكتر + فلاتر + إجماليات
//              + العميل يشوف معاملاته هو بس + جدول plan_trades لسه بيتبني مع الحفظ
const { check, summary, launch, page, loginAdmin, q, ADMIN } = require('../lib');
const CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
const NOPLAN = 'trnoplan@example.com';
const loginAs = (p, a) => p.evaluate(async ([e, pw]) => { window.alert = () => {}; const x = await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); return x; }, [a.email, a.pass]);
const kpis = (p) => p.$$eval('#trBody .g-kpi', d => Object.fromEntries(d.map(k => [k.querySelector('span').textContent.trim(), k.querySelector('b').textContent.replace(/,/g, '').trim()])));
(async () => {
  q("DELETE FROM login_attempts");
  const oldHide = q("SELECT setting_value FROM admin_settings WHERE setting_key='hide_trades_screen'");
  const b = await launch(); const p = await page(b); await loginAdmin(p);
  // الإصدار 105: الريفريش مبيخرجش من الحساب
  await p.reload(); await p.waitForTimeout(1500);
  check('ريفريش الصفحة: لسه مسجّل دخول', await p.evaluate(async () => { invalidateSessionCache(); return await getSession(); }) === ADMIN);
  const ck = (await p.context().cookies()).find(c => /PHPSESSID|sess/i.test(c.name));
  check('كوكي الجلسة بيفضل 30 يوم (مش بيتمسح مع قفل المتصفح)', ck && ck.expires > Date.now() / 1000 + 29 * 86400, ck && ck.expires);
  await p.evaluate(async () => {
    const dca = { TSTX: { market:'مصر', levels:[{ level:1, executed:true, actualQty:100, actualPrice:10, execDate:'2026-09-01', sells:[{ qty:40, price:12, date:'2026-09-10' }] }, { level:2, executed:false, sells:[] }],
      closedTrades:[{ closedDate:'2026-08-20T10:00:00Z', totalQty:50, avgEntry:8, avgExit:9, profit:50, capitalUsed:400 }] } };
    const grid = { TSTG: { market:'مصر', levels:[{ status:'bought', executedQty:10, executedPrice:5, executedDate:'2026-09-05', sells:[] }],
      closedTrades:[{ closedDate:'2026-09-02', totalQty:10, avgEntry:5, avgExit:4, profit:-10, capitalUsed:50 }], cycleHistory:[{ date:'2026-09-02', profit:-10, cumulative:-10 }] } };
    await apiPost('/user_data_save.php', { key:'plans', value: JSON.stringify(dca) });
    await apiPost('/user_data_save.php', { key:'grid_plans', value: JSON.stringify(grid) });
  });
  const rows = q(`SELECT GROUP_CONCAT(CONCAT(plan_kind,':',trade_type) ORDER BY id) FROM plan_trades WHERE account_email='${ADMIN}' AND symbol IN ('TSTX','TSTG')`);
  check('الحفظ لسه بيبني جدول الصفقات (شراء/بيع/مقفولة)', rows === 'DCA:buy,DCA:sell,DCA:closed,Grid:buy,Grid:closed', rows);
  // مشترك تاني بخطة + مشترك من غير أي خطة
  q(`DELETE FROM user_plans WHERE account_email='${CUST.email}' AND symbol IN ('TSTC','TSTD')`);
  q(`INSERT INTO user_plans (account_email, plan_type, symbol, data_value) VALUES ('${CUST.email}', 'plans', 'TSTC', '{"market":"مصر","levels":[{"level":1,"executed":true,"actualQty":10,"actualPrice":20,"execDate":"2026-09-03","sells":[]}],"closedTrades":[]}')`);
  q(`DELETE FROM subscribers WHERE account_email='${NOPLAN}'`);
  q(`INSERT INTO subscribers (account_email,name,phone,contact_email,plan_id,plan_name,start_date,end_date) VALUES ('${NOPLAN}','عميل بدون خطط','0100','${NOPLAN}','monthly','الخطة الشهرية',CURDATE()-INTERVAL 40 DAY,CURDATE()-INTERVAL 10 DAY)`);

  // 1) الإدارة: كل المشتركين حتى اللي مالوش صفقات
  await p.evaluate(() => renderAdminHub()); await p.waitForTimeout(1200);
  await p.click('#goTradesBtn'); await p.waitForSelector('#trCustTable', { timeout: 10000 }); await p.waitForTimeout(800);
  const custRows = await p.$$eval('#trCustTable tbody tr', t => t.map(r => r.textContent));
  check('المشتركين: كل الحسابات ظاهرة (حتى اللي مالوش خطط) + حالة الاشتراك', custRows.some(r => r.includes('trnoplan@example.com') && r.includes('منتهي')) && custRows.some(r => r.includes(CUST.email)) && custRows.some(r => r.includes('top72026')), custRows.length);
  check('السهم: قائمة اختيار من الأسهم الموجودة فعلًا', await p.$$eval('#trSym option', o => o.map(x => x.value).join(',')).then(v => v.includes('TSTX') && v.includes('TSTC')));
  // 2) مطابقة الشاشة الرئيسية: نفس computeAggregates لخطط الأدمن
  const home = await p.evaluate(async () => { const e = await getSession(); const pl = await getPlans(e), gr = await getGridPlans(e); await mkEnsureLivePrices(pl, gr);
    const en = [...Object.keys(pl).map(s => ({ key: s + '::DCA', sym: s, type: 'DCA' })), ...Object.keys(gr).map(s => ({ key: s + '::Grid', sym: s, type: 'Grid' }))];
    const a = computeAggregates(pl, gr, en, null, null); return { realized: Math.round((a.totalRealized + a.totalClosedProfit) * 100) / 100, cost: Math.round(a.totalOpenCost * 100) / 100 }; });
  await p.evaluate(() => { const r = [...document.querySelectorAll('#trCustTable tr.tr-pick')].find(x => x.dataset.email === 'top72026@gmail.com'); r.click(); }); await p.waitForTimeout(600);
  const k1 = await kpis(p);
  check('اختيار مشترك واحد ← بياناته بس (المشتركين = 1)', k1['المشتركين'] === '1' && await p.$$eval('#trCustTable tbody tr', t => t.length) === 1, JSON.stringify(k1).slice(0, 120));
  check('الأرقام = الشاشة الرئيسية (المحقق وتكلفة المفتوح)', Math.abs(+k1['الربح المحقق'] - home.realized) < 0.01 && Math.abs(+k1['تكلفة المراكز المفتوحة'] - home.cost) < 0.01, `${k1['الربح المحقق']}/${home.realized} · ${k1['تكلفة المراكز المفتوحة']}/${home.cost}`);
  // 3) فلتر السهم (فوري): TSTX = شراء 1 / بيع 1 / محقق 80 (بيع جزئي) + 50 (مقفولة) = 130
  await p.selectOption('#trSym', 'TSTX'); await p.waitForTimeout(500);
  const k2 = await kpis(p);
  check('فلتر السهم TSTX: شراء 1 / بيع 1 / مقفولة 1 / المحقق 130', k2['عمليات شراء'] === '1' && k2['عمليات بيع'] === '1' && k2['صفقات مقفولة'] === '1' && k2['الربح المحقق'] === '130', JSON.stringify(k2).slice(0, 160));
  // 4) الفترة: سبتمبر بس ← الصفقة المقفولة في أغسطس خارج الفترة
  await p.fill('#trFrom', '2026-09-01'); await p.dispatchEvent('#trFrom', 'change'); await p.waitForTimeout(500);
  const k3 = await kpis(p);
  check('فلتر الفترة: المقفولة القديمة برا والبيع الجزئي جوه (المحقق 80)', k3['صفقات مقفولة'] === '0' && k3['الربح المحقق'] === '80', JSON.stringify(k3).slice(0, 160));
  // 5) اختيار مشتركين اتنين من القائمة
  await p.click('#trClear'); await p.waitForTimeout(400);
  await p.click('#trCustBtn'); await p.waitForTimeout(200);
  await p.check(`#trCustList input[value="${ADMIN}"]`); await p.check(`#trCustList input[value="${CUST.email}"]`); await p.waitForTimeout(500);
  const k4 = await kpis(p);
  check('اختيار مشتركين اتنين ← المشتركين = 2', k4['المشتركين'] === '2' && /2 مشتركين/.test(await p.textContent('#trCustBtn')), k4['المشتركين']);
  await p.check('#trCustAll'); await p.waitForTimeout(400);
  check('«كل المشتركين» ترجع الكل', +(await kpis(p))['المشتركين'] >= 3);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  check('Esc بيقفل قائمة المشتركين', await p.locator('#trCustPanel').isHidden());
  // 6) تحديث مباشر: خطة اتضافت ← «تحديث الآن» يجيبها من غير إعادة بناء
  q(`INSERT INTO user_plans (account_email, plan_type, symbol, data_value) VALUES ('${CUST.email}', 'plans', 'TSTD', '{"market":"مصر","levels":[],"closedTrades":[]}')`);
  await p.click('#trRefresh'); await p.waitForTimeout(1500);
  check('تحديث مباشر: الخطة الجديدة ظاهرة فورًا', await p.$$eval('#trSym option', o => o.some(x => x.value === 'TSTD')));
  check('تحديث تلقائي: «آخر تحديث» ظاهر', /آخر تحديث/.test(await p.textContent('#trAt')));
  const anon = await page(b);
  check('غير المسجّل ممنوع (403)', await anon.evaluate(() => fetch('/trades_report.php?action=live').then(r => r.status)) === 403);
  check('الأدمن: بدون أخطاء JavaScript', !p.__errors || !p.__errors.length, p.__errors && p.__errors[0]);

  // 7) العميل: معاملاته هو بس
  q("REPLACE INTO admin_settings (setting_key, setting_value) VALUES ('hide_trades_screen', '0')");
  const c = await page(b); await c.context().addCookies([{ name: 'g_in', value: '1', url: require('../lib').BASE }]);   // الإصدار 149: جهاز مسجّل (الصفحة الكاملة)
  await c.goto(require('../lib').BASE + '/index.php'); await c.waitForTimeout(1500);
  const lr = await loginAs(c, CUST);
  const live = await c.evaluate(() => apiGet('/trades_report.php?action=live'));
  check('العميل: السيرفر بيرجّع خططه هو بس', live.success && live.mine && live.accounts.length === 1 && live.plans.every(x => x.e === 'paytest@example.com') && live.plans.some(x => x.s === 'TSTC'), lr && lr.success);
  await c.evaluate(() => renderTradesReportPage()); await c.waitForSelector('#trPosTable', { timeout: 10000 });
  check('العميل: من غير جدول المشتركين وفلتر المشتركين', await c.locator('#trCustTable').count() === 0 && await c.locator('#trCustBtn').count() === 0);
  check('العميل: المراكز = خططه (TSTC)', /TSTC/.test(await c.textContent('#trPosTable')) && !/TSTX/.test(await c.textContent('#trPosTable')));

  // تنظيف
  q(`DELETE FROM user_plans WHERE account_email='${CUST.email}' AND symbol IN ('TSTC','TSTD')`); q(`DELETE FROM subscribers WHERE account_email='${NOPLAN}'`);
  if (oldHide === '') q("DELETE FROM admin_settings WHERE setting_key='hide_trades_screen'"); else q(`REPLACE INTO admin_settings (setting_key, setting_value) VALUES ('hide_trades_screen', '${oldHide}')`);
  await b.close(); process.exit(summary());
})();
