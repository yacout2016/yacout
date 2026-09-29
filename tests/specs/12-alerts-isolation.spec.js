// الإصدار 93: كل حساب (أدمن / موظف / عميل) بيشوف إشعاراته هو بس - من خططه ومدخلاته
// كل حساب عنده خطة لسهم مختلف، سعر الشراء التالي فيها أعلى من سعر السوق ← التنبيه لازم يروح لصاحب الخطة بس
const { check, summary, launch, q, BASE } = require('../lib');
const ACC = [
  { who: 'الأدمن', email: 'top72026@gmail.com', pass: process.env.GT_ADMIN_PASS || 'Test12345', sym: 'COMI' },
  { who: 'الموظف', email: 'yacout2021@gmail.com', pass: process.env.GT_STAFF_PASS || 'Test12345', sym: 'HRHO' },
  { who: 'العميل', email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x', sym: 'TMGH' },
];
const plan = (sym) => ({ [sym]: { symbol: sym, market: 'مصر', currency: 'جنيه مصري', currentPrice: 999, capital: 100000, seedAmount: 1000, dropPercent: 5, volumeIncrease: 0, profitTarget: 5, levels: [{ level: 1, executed: false, sells: [] }, { level: 2, executed: false, sells: [] }], closedTrades: [] } });
async function login(ctx, a){
  const p = await ctx.newPage(); p.__errors = []; p.on('pageerror', e => p.__errors.push(e.message));
  await p.goto(BASE + '/index.php'); await p.waitForTimeout(1200);
  const r = await p.evaluate(async ([e, pw]) => { window.alert = () => {}; const x = await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); return x; }, [a.email, a.pass]);
  return { p, ok: r && r.success };
}
(async () => {
  q("DELETE FROM login_attempts");
  const emails = ACC.map(a => `'${a.email}'`).join(',');
  q(`DELETE FROM user_alerts WHERE account_email IN (${emails})`); q(`DELETE FROM alert_targets WHERE account_email IN (${emails})`);
  q(`DELETE FROM user_plans WHERE plan_type='grid_plans' AND account_email IN (${emails})`); q(`DELETE FROM user_data_store WHERE data_key='grid_plans' AND account_email IN (${emails})`);   // خطط شبكة متبقية من اختبارات تانية بتضيف مستويات
  const b = await launch(); const pages = {};
  for (const a of ACC) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } });
    const { p, ok } = await login(ctx, a); pages[a.email] = p;
    check(`${a.who}: تسجيل الدخول`, ok);
    // خطة الحساب ده بس (بنحفظ نسخة خططه القديمة ونرجّعها في الآخر)
    a.old = await p.evaluate(async (pl) => { const g = await apiGet('/user_data_get.php?key=plans'); await apiPost('/user_data_save.php', { key: 'plans', value: JSON.stringify(pl), base: JSON.stringify(g.versions || {}) }); return g.value || '{}'; }, plan(a.sym));
    await p.evaluate(() => renderHome()); await p.waitForTimeout(6000);   // الرئيسية ← مستويات التنبيه من خططه + فحص فوري
  }
  for (const a of ACC) {
    const others = ACC.filter(x => x !== a);
    const tg = q(`SELECT GROUP_CONCAT(DISTINCT symbol) FROM alert_targets WHERE account_email='${a.email}'`);
    check(`${a.who}: مستويات التنبيه من خطته هو بس (${a.sym})`, tg === a.sym, tg);
    const al = q(`SELECT GROUP_CONCAT(DISTINCT symbol) FROM user_alerts WHERE account_email='${a.email}'`);
    check(`${a.who}: الإشعار اتسجّل له عن سهمه`, al === a.sym, al);
    const p = pages[a.email];
    const api = await p.evaluate(() => apiGet('/markets_api.php?action=alerts'));
    const syms = [...new Set((api.alerts || []).map(x => x.symbol))];
    check(`${a.who}: شاشة التنبيهات فيها إشعاراته بس`, syms.length === 1 && syms[0] === a.sym, syms.join(','));
    await p.evaluate(() => renderHome()); await p.waitForTimeout(4000);
    const card = (await p.textContent('#gsAlertsCard')).replace(/[⁦⁩]/g, '');
    check(`${a.who}: كارت الرئيسية تحت الشارت = إشعاراته بس`, card.includes(a.sym) && others.every(o => !card.includes(o.sym)), card.slice(0, 90));
    check(`${a.who}: بدون أخطاء JavaScript`, !p.__errors.length, p.__errors[0]);
  }
  // نفس المتصفح: العميل يخرج والأدمن يدخل ← مفيش أي إشعار أو مستوى من العميل يظهر للأدمن
  const cp = pages['paytest@example.com'];
  await cp.evaluate(async () => { await apiPost('/logout.php', {}).catch(() => {}); invalidateSessionCache(); });
  await cp.evaluate(async ([e, pw]) => { await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); }, [ACC[0].email, ACC[0].pass]);
  await cp.evaluate(() => renderHome()); await cp.waitForTimeout(5000);
  const card2 = (await cp.textContent('#gsAlertsCard')).replace(/[⁦⁩]/g, '');
  check('تبديل الحساب في نفس المتصفح: الأدمن مش شايف إشعارات العميل', !card2.includes('TMGH') && card2.includes('COMI'), card2.slice(0, 80));
  check('تبديل الحساب: مستويات الأدمن متأثرتش بخطط العميل', q(`SELECT GROUP_CONCAT(DISTINCT symbol) FROM alert_targets WHERE account_email='top72026@gmail.com'`) === 'COMI');
  // غير مسجّل
  const anon = await (await b.newContext()).newPage(); await anon.goto(BASE + '/index.php');
  check('غير المسجّل ممنوع (401)', await anon.evaluate(() => fetch('/markets_api.php?action=alerts').then(r => r.status)) === 401);
  // إرجاع الخطط الأصلية + تنظيف
  for (const a of ACC) {
    const ctx = await b.newContext(); const { p } = await login(ctx, a);
    await p.evaluate(async (old) => { const g = await apiGet('/user_data_get.php?key=plans'); await apiPost('/user_data_save.php', { key: 'plans', value: old, base: JSON.stringify(g.versions || {}) }); }, a.old);
  }
  q(`DELETE FROM user_alerts WHERE account_email IN (${emails})`); q(`DELETE FROM alert_targets WHERE account_email IN (${emails})`); q("DELETE FROM trash_bin");
  await b.close(); process.exit(summary());
})();
