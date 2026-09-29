// الإصدار 97: آخر سعر في شاشات الخطط + ربح على آخر سعر + إخفاء الأعمدة + 7 مستويات + نص إشعارات الخطط وتكرارها
//              + الوقت بتوقيت الجهاز + منع الرموز الغلط + مراجعة الرموز ونقلها للسلة
const { check, summary, launch, loginAdmin, q, BASE } = require('../lib');
const { execSync } = require('child_process');
const MOCK = 'http://127.0.0.1:8098';
const setPx = async (sym, p) => { await fetch(`${MOCK}/set?sym=${sym}&price=${p}`); try { execSync('rm -rf /tmp/griffine_quotes'); } catch(e){} };
const ADMIN = 'top72026@gmail.com';
(async () => {
  q("DELETE FROM login_attempts");
  q(`DELETE FROM user_alerts WHERE account_email='${ADMIN}'`); q(`DELETE FROM alert_targets WHERE account_email='${ADMIN}'`);
  await setPx('COMI', 129);
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'Africa/Cairo' });
  const a = await ctx.newPage(); a.__errors = []; a.on('pageerror', e => a.__errors.push(e.message));
  await a.goto(BASE + '/index.php'); await a.waitForTimeout(1500); await a.evaluate(() => { window.alert = () => {}; localStorage.removeItem('gs_livepx2'); });
  await loginAdmin(a);

  // 1) الوقت بتوقيت الجهاز (القاهرة = جرينتش + 3 في سبتمبر)
  const tm = await a.evaluate(() => { const d = gServerDate('2026-09-29 07:32:22'); return { h: d.getHours(), m: d.getMinutes(), txt: formatDateTimeAr('2026-09-29 07:32:22') }; });
  check('وقت السيرفر (UTC) بيتعرض بتوقيت الجهاز: 07:32 ← 10:32 القاهرة', tm.h === 10 && tm.m === 32, JSON.stringify(tm));
  check('التاريخ من غير وقت بيفضل نفس اليوم', await a.evaluate(() => gServerDate('2026-09-29').getDate() === 29));

  // خطة DCA: 20 سهم بتكلفة 125 وربح الخطة 2% + 10 مستويات
  const old = await a.evaluate(async () => {
    const g = await apiGet('/user_data_get.php?key=plans');
    const lv = [{ level: 1, executed: true, actualQty: 20, actualPrice: 125, execDate: '2026-09-01', sells: [] }];
    for (let i = 2; i <= 10; i++) lv.push({ level: i, executed: false, sells: [] });
    const pl = { COMI: { symbol: 'COMI', market: 'مصر', currency: 'جنيه مصري', currentPrice: 125, capital: 60000, seedAmount: 2500, dropPercent: 5, volumeIncrease: 5, profitTarget: 2, startDate: '2026-09-01', levels: lv, closedTrades: [] } };
    await apiPost('/user_data_save.php', { key: 'plans', value: JSON.stringify(pl), base: JSON.stringify(g.versions || {}) });
    return g.value || '{}';
  });

  // 2) شاشة الخطة: آخر سعر + الربح على آخر سعر + نقطة الخروج
  await a.evaluate(() => renderPlanDetail('COMI')); await a.waitForTimeout(3500);
  const st = await a.evaluate(() => ({ last: document.getElementById('statusLastPriceUsed').textContent, lbl: document.getElementById('statusLastPriceLbl').textContent, un: document.getElementById('statusUnreal').textContent, ex: document.getElementById('statusExitState').textContent, lv1: document.querySelector('#levelsTable td.lv-unreal').textContent }));
  check('شاشة DCA: آخر سعر للسهم (129) من السوق', /129/.test(st.last) && /آخر سعر للسهم/.test(st.lbl), JSON.stringify(st));
  check('شاشة DCA: الربح على آخر سعر = (129 − 125) × 20 = 80', /^80(\.00)?$/.test(st.un.replace(/[^\d.]/g, '')), st.un);
  check('شاشة DCA: ربح المستوى على آخر سعر = 80', st.lv1.replace(/[^\d.]/g, '') === '80.00', st.lv1);
  check('شاشة DCA: الخطة رابحة (129 ≥ 127.50)', /رابحة/.test(st.ex), st.ex);
  await a.evaluate(() => { document.getElementById('manualLastPriceInput').closest('details').open = true; });
  await a.fill('#manualLastPriceInput', '126'); await a.waitForTimeout(200);
  check('سعر التجربة (126): الحالة "باقي"', /باقي/.test(await a.textContent('#statusExitState')));
  await a.fill('#manualLastPriceInput', ''); await a.waitForTimeout(200);

  // 3) الجدول: على قد الشاشة + 7 مستويات + إخفاء عمود يفضل بعد إعادة الرسم
  const tb = await a.evaluate(() => { const t = document.getElementById('levelsTable'), w = t.closest('.gs-tscroll'); const r = [...t.tBodies[0].rows]; const wb = w.getBoundingClientRect();
    return { sw: w.scrollWidth, cw: w.clientWidth, limited: w.classList.contains('gs-rows-limit'), r7: Math.round(r[6].getBoundingClientRect().bottom - wb.top + w.scrollTop), r8: Math.round(r[7].getBoundingClientRect().bottom - wb.top + w.scrollTop), h: w.clientHeight + (w.offsetHeight - w.clientHeight), rows: r.length }; });
  check('جدول المستويات على قد عرض الشاشة', tb.sw <= tb.cw + 2, `${tb.sw} / ${tb.cw}`);
  check('جدول المستويات: 7 مستويات ظاهرين والباقي تمرير', tb.limited && tb.r7 <= tb.h + 2 && tb.r8 > tb.h, JSON.stringify(tb));
  await a.click('#levelsTable th:nth-child(3) .g-colx'); await a.waitForTimeout(200);
  check('زرار إخفاء العمود بيخفيه', await a.evaluate(() => getComputedStyle(document.querySelector('#levelsTable tbody tr td:nth-child(3)')).display === 'none'));
  await a.evaluate(() => renderPlanDetail('COMI')); await a.waitForTimeout(2000);
  check('العمود المخفي بيفضل مخفي بعد إعادة فتح الشاشة', await a.evaluate(() => document.getElementById('levelsTable').classList.contains('g-hc-3')));
  await a.click('.g-hcshow'); await a.click('.g-hcmenu [data-hc="all"]'); await a.waitForTimeout(200);
  check('"إظهار الأعمدة المخفية" بيرجّعها', await a.evaluate(() => !document.getElementById('levelsTable').classList.contains('g-hc-3') && getComputedStyle(document.querySelector('.g-hcshow')).display === 'none'));
  check('إخفاء الأعمدة موجود في جداول تانية (المحفظة)', await (async () => { await a.evaluate(() => renderPortfolio()); await a.waitForTimeout(2500); return a.evaluate(() => document.querySelectorAll('#app table th .g-colx').length > 0); })());

  // 4) إشعار الربح: عندك 20 سهم بتكلفة 125 وربح 2% ← السعر 129 ← ربح 80
  const plans = await a.evaluate(async () => JSON.parse((await apiGet('/user_data_get.php?key=plans')).value));
  await a.evaluate(async (p) => { window.__mkTargetsSig = null; await mkSyncTargets(p, {}, await getSession()); }, plans);
  const al1 = q(`SELECT CONCAT(title, ' || ', body) FROM user_alerts WHERE account_email='${ADMIN}' ORDER BY id DESC LIMIT 1`).replace(/[⁦⁩]/g, '');
  check('إشعار الربح: الخطة رابحة + الكمية + متوسط التكلفة + الربح 80', /رابحة/.test(al1) && /عندك 20 سهم/.test(al1) && /125/.test(al1) && /127\.5/.test(al1) && /ربح 80\.00/.test(al1), al1.slice(0, 260));
  // 5) نفس الشرط تاني ← مفيش إشعار مكرر
  await setPx('COMI', 130);
  await a.evaluate(async (p) => { window.__mkTargetsSig = null; await mkSyncTargets(p, {}, await getSession()); }, plans);
  const n1 = +q(`SELECT COUNT(*) FROM user_alerts WHERE account_email='${ADMIN}' AND title LIKE '%رابحة%'`);
  check('الشرط لسه متحقق ← مفيش إشعار مكرر', n1 === 1, n1);
  // 6) السعر نزل لسعر الشراء التالي ← إشعار شراء بالكمية والقيمة
  await setPx('COMI', 100);
  await a.evaluate(async (p) => { window.__mkTargetsSig = null; await mkSyncTargets(p, {}, await getSession()); }, plans);
  const al2 = q(`SELECT CONCAT(title, ' || ', body) FROM user_alerts WHERE account_email='${ADMIN}' ORDER BY id DESC LIMIT 1`).replace(/[⁦⁩]/g, '');
  check('إشعار الشراء: الكمية المملوكة + المطلوب شراؤه + القيمة + الشرط متحقق', /سعر الشراء التالي/.test(al2) && /عندك 20 سهم/.test(al2) && /المطلوب شراء/.test(al2) && /بقيمة/.test(al2) && /الشرط متحقق/.test(al2), al2.slice(0, 260));
  check('السعر رجع تحت الهدف ← مستوى الربح اتسلّح تاني', q(`SELECT rearmed FROM alert_targets WHERE account_email='${ADMIN}' AND side='sell'`) === '1');
  // 7) رجع فوق الهدف في أقل من 24 ساعة ← مفيش إشعار ، بعد 24 ساعة ← إشعار
  await setPx('COMI', 129);
  await a.evaluate(async (p) => { window.__mkTargetsSig = null; await mkSyncTargets(p, {}, await getSession()); }, plans);
  check('رجع فوق الهدف في أقل من 24 ساعة ← مفيش إشعار', +q(`SELECT COUNT(*) FROM user_alerts WHERE account_email='${ADMIN}' AND title LIKE '%رابحة%'`) === 1);
  q(`UPDATE alert_targets SET triggered_at = NOW() - INTERVAL 25 HOUR WHERE account_email='${ADMIN}' AND side='sell'`);
  await a.evaluate(async (p) => { window.__mkTargetsSig = null; await mkSyncTargets(p, {}, await getSession()); }, plans);
  check('بعد 24 ساعة والسعر عدّى الهدف تاني ← إشعار جديد', +q(`SELECT COUNT(*) FROM user_alerts WHERE account_email='${ADMIN}' AND title LIKE '%رابحة%'`) === 2);

  // 8) Grid: آخر سعر + إشعار حد البيع
  const oldG = await a.evaluate(async () => {
    const g = await apiGet('/user_data_get.php?key=grid_plans');
    const gp = { HRHO: { symbol: 'HRHO', market: 'مصر', capital: 10000, tradeSize: 1000, rangeLow: 15, rangeHigh: 25, createdAt: '2026-09-01', cycleHistory: [], closedTrades: [],
      levels: [{ plannedPrice: 22, plannedQty: 45, status: 'bought', executedQty: 45, executedPrice: 22, sellTargetPrice: 24, sells: [], cycles: 0 }, { plannedPrice: 20, plannedQty: 50, status: 'empty', sells: [], cycles: 0 }, { plannedPrice: 18, plannedQty: 55, status: 'empty', sells: [], cycles: 0 }] } };
    await apiPost('/user_data_save.php', { key: 'grid_plans', value: JSON.stringify(gp), base: JSON.stringify(g.versions || {}) });
    return g.value || '{}';
  });
  await setPx('HRHO', 24.5);
  await a.evaluate(() => { localStorage.removeItem('gs_livepx2'); renderGridPlanDetail('HRHO'); }); await a.waitForTimeout(3500);
  const gs = await a.evaluate(() => ({ last: document.getElementById('gridStatusLastPriceUsed').textContent, un: document.getElementById('gridStatusUnreal').textContent, nx: document.getElementById('gridStatusNext').textContent }));
  check('شاشة Grid: آخر سعر 24.5 والربح (24.5 − 22) × 45 = 112.50', /24\.5/.test(gs.last) && gs.un.replace(/[^\d.]/g, '') === '112.50', JSON.stringify(gs));
  check('شاشة Grid: أقرب حد شراء / بيع', /شراء 20/.test(gs.nx) && /بيع 24/.test(gs.nx), gs.nx);
  const grids = await a.evaluate(async () => JSON.parse((await apiGet('/user_data_get.php?key=grid_plans')).value));
  await a.evaluate(async (g) => { window.__mkTargetsSig = null; await mkSyncTargets({}, g, await getSession()); }, grids);
  const al3 = q(`SELECT CONCAT(title, ' || ', body) FROM user_alerts WHERE account_email='${ADMIN}' AND symbol='HRHO' ORDER BY id DESC LIMIT 1`).replace(/[⁦⁩]/g, '');
  check('إشعار Grid: السعر وصل لحد البيع + ربح المستوى', /وصل لحد البيع 24/.test(al3) && /112\.50/.test(al3), al3.slice(0, 220));

  // 9) منع رمز غير موجود في البورصة
  const c1 = await a.evaluate(() => gCheckSymbol('ZZQX', 'مصر')), c2 = await a.evaluate(() => gCheckSymbol('COMI', 'مصر'));
  check('رمز غلط (ZZQX) مرفوض عند إنشاء خطة', !c1.ok && /غير موجود/.test(c1.msg), JSON.stringify(c1));
  check('رمز صحيح (COMI) مقبول', c2.ok && !c2.unverified);

  // 10) مراجعة الرموز: القائمة الأول ثم النقل للسلة
  q("DELETE FROM user_plans WHERE symbol='BADXQ'");
  q(`INSERT INTO user_plans (account_email, plan_type, symbol, data_value, version, deleted) VALUES ('paytest@example.com', 'plans', 'BADXQ', '{"symbol":"BADXQ","market":"مصر","levels":[]}', 1, 0)`);
  const sc = await a.evaluate(() => apiGet('/symbols_audit.php?action=scan'));
  const bad = (sc.invalid || []).find(x => x.symbol === 'BADXQ');
  check('المراجعة: الرمز الغلط في القائمة والصحيح لأ', sc.success && bad && !(sc.invalid || []).some(x => x.symbol === 'COMI' || x.symbol === 'HRHO'), JSON.stringify(sc).slice(0, 160));
  const tr = await a.evaluate((id) => apiPost('/symbols_audit.php', { action: 'trash', ids: String(id) }), bad ? bad.id : 0);
  check('النقل للسلة: الخطة اتشالت واتحطت في سلة صاحبها', tr.success && tr.moved === 1 && q("SELECT deleted FROM user_plans WHERE symbol='BADXQ'") === '1' && +q("SELECT COUNT(*) FROM trash_bin WHERE owner_email='paytest@example.com' AND item_label LIKE '%BADXQ%'") >= 1);
  const cust = await (await b.newContext()).newPage(); await cust.goto(BASE + '/index.php');
  check('مراجعة الرموز لمدير الموقع بس', await cust.evaluate(() => fetch('/symbols_audit.php?action=scan').then(r => r.status)) === 403);
  check('بدون أخطاء JavaScript', !a.__errors.length, a.__errors[0]);

  // تنظيف
  await a.evaluate(async ([p, g]) => {
    const x = await apiGet('/user_data_get.php?key=plans'); await apiPost('/user_data_save.php', { key: 'plans', value: p, base: JSON.stringify(x.versions || {}) });
    const y = await apiGet('/user_data_get.php?key=grid_plans'); await apiPost('/user_data_save.php', { key: 'grid_plans', value: g, base: JSON.stringify(y.versions || {}) });
  }, [old, oldG]);
  q("DELETE FROM user_plans WHERE symbol='BADXQ'"); q("DELETE FROM trash_bin WHERE item_label LIKE '%BADXQ%'");
  q(`DELETE FROM user_alerts WHERE account_email='${ADMIN}'`); q(`DELETE FROM alert_targets WHERE account_email='${ADMIN}'`); q("DELETE FROM trash_bin WHERE item_type='plan'");
  await setPx('COMI', 80); await setPx('HRHO', 20);
  await b.close();
  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
