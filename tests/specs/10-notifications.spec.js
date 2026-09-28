// الإشعارات (الإصدار 91): تفضل في الرئيسية لحد ما تتقفل ← تفضل في شاشة التنبيهات ← الحذف للسلة والاسترجاع
// + 5 ظاهرين والباقي تمرير + النص العربي من غير انعكاس (أسماء الخطط بالعربي والرموز/الأرقام معزولة)
const { check, summary, launch, page, loginAdmin, q, ADMIN } = require('../lib');
(async () => {
  q(`DELETE FROM user_alerts WHERE account_email='${ADMIN}'`);
  for (let i = 1; i <= 7; i++) q(`INSERT INTO user_alerts (account_email, title, body, symbol, market) VALUES ('${ADMIN}', 'تنبيه اختبار ${i}', 'نص ${i}', 'COMI', 'مصر')`);
  const b = await launch(); const p = await page(b, { width: 1280, height: 1000 }); await loginAdmin(p);
  await p.evaluate(() => renderHome()); await p.waitForTimeout(3500);
  check('الرئيسية: كل التنبيهات السبعة ظاهرة في الكارت', await p.locator('#gsAlertsCard .gs-alert-row').count() === 7);
  const vis = async (sel, item) => p.evaluate(([sel, item]) => { const box = document.querySelector(sel); if (!box) return -1; const bb = box.getBoundingClientRect().bottom + 1; return [...box.querySelectorAll(item)].filter(r => r.getBoundingClientRect().bottom <= bb).length; }, [sel, item]);
  check('الرئيسية: 5 ظاهرين والباقي تمرير', await vis('#gsAlertsCard .gs-alert-list', '.gs-alert-row') === 5);
  // فتح صفحة السهم من تنبيه ثم الرجوع ← التنبيهات لسه موجودة
  await p.locator('#gsAlertsCard [data-sym]').first().click(); await p.waitForTimeout(2000);
  await p.evaluate(() => renderHome()); await p.waitForTimeout(3000);
  check('بعد فتح تنبيه: التنبيهات فضلت موجودة', await p.locator('#gsAlertsCard .gs-alert-row').count() === 7);
  await p.locator('#gsAlertsCard [data-dis]').first().click(); await p.waitForTimeout(1500);
  check('✕ يقفل تنبيه واحد من الرئيسية', await p.locator('#gsAlertsCard .gs-alert-row').count() === 6);
  await p.evaluate(() => renderAlertsPage()); await p.waitForTimeout(2500);
  check('المقفول لسه في شاشة التنبيهات (7)', await p.locator('.gs-notif-list .gs-notif').count() === 7);
  check('شاشة التنبيهات: 5 ظاهرين والباقي تمرير', await vis('.gs-notif-list', '.gs-notif') === 5);
  await p.locator('[data-ndel]').first().click(); await p.waitForTimeout(1800);
  check('حذف إشعار ← اختفى من الشاشة', await p.locator('.gs-notif-list .gs-notif').count() === 6);
  const tid = q(`SELECT id FROM trash_bin WHERE item_type='notification' AND restored_at IS NULL ORDER BY id DESC LIMIT 1`);
  check('الإشعار المحذوف في سلة المحذوفات', !!tid);
  await p.evaluate(async id => apiPost('/trash_api.php', { action:'restore', id }), tid);
  check('استرجاع الإشعار', +q(`SELECT COUNT(*) FROM user_alerts WHERE account_email='${ADMIN}'`) === 7);
  // النص العربي: تنبيه مستوى خطة
  q(`DELETE FROM alert_targets WHERE account_email='${ADMIN}'`);
  q(`INSERT INTO alert_targets (account_email, symbol, market, plan_kind, side, price, label) VALUES ('${ADMIN}', 'COMI', 'مصر', 'DCA', 'buy', 999, 'المستوى 2')`);
  await p.evaluate(() => fetch('/price_alerts_check.php').then(r => r.json()));
  const body = q(`SELECT CONCAT(title, ' || ', body) FROM user_alerts WHERE account_email='${ADMIN}' AND title LIKE '%الشراء%' ORDER BY id DESC LIMIT 1`);
  check('نص الإشعار: «خطة تعزيز المتوسط» بدل DCA ومفيش EGP', /خطة تعزيز المتوسط/.test(body) && !/DCA|EGP/.test(body), body.replace(/[⁦⁩]/g, ''));
  check('نص الإشعار: السعر الحالي وسعر الشراء واضحين', /السعر الحالي/.test(body) && /سعر الشراء في/.test(body));
  check('الرموز والأرقام معزولة (من غير انعكاس)', body.includes('⁦COMI⁩'));
  q(`DELETE FROM alert_targets WHERE account_email='${ADMIN}'`); q(`DELETE FROM user_alerts WHERE account_email='${ADMIN}'`); q(`DELETE FROM trash_bin`);
  check('بدون أخطاء JavaScript', !p.__errors.length, p.__errors[0]);
  await b.close(); process.exit(summary());
})();
