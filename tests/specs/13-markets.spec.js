// الإصدار 96: أسواق الحسابات - الأدمن يفعّل السعودية ← التسجيل يسأل عن السوق ← الحساب السعودي يشوف باقات السعودية بالريال والدفع البنكي بس
const { check, summary, launch, page, loginAdmin, q, BASE } = require('../lib');
const SA = 'sa.market.test@example.com', SA_PASS = 'Test12345s';
const KEYS = ['active_markets', 'bank_on_sa', 'bank_name_sa', 'bank_holder_sa', 'bank_iban_sa'];
(async () => {
  q("DELETE FROM login_attempts");
  const old = {}; KEYS.forEach(k => { old[k] = q(`SELECT config_value FROM site_config WHERE config_key='${k}'`); });
  const oldDomain = q("SELECT setting_value FROM admin_settings WHERE setting_key='require_valid_email_domain'");
  q(`DELETE FROM subscribers WHERE account_email='${SA}'`); q(`DELETE FROM users WHERE username='${SA}'`);
  q("DELETE FROM subscription_plans WHERE id='sa_monthly_t'");
  q("REPLACE INTO site_config (config_key, config_value) VALUES ('active_markets', 'مصر')");
  q("REPLACE INTO admin_settings (setting_key, setting_value) VALUES ('require_valid_email_domain', 0)");
  const b = await launch();

  // 1) سوق واحد مفعّل ← التسجيل مبيسألش عن السوق
  const v = await page(b);
  await v.evaluate(() => renderRegister()); await v.waitForTimeout(1500);
  check('سوق واحد مفعّل: التسجيل من غير اختيار سوق', await v.locator('#regMarket').count() === 0);

  // 2) الأدمن يفعّل السعودية ويجهّز التحويل البنكي من الإعدادات
  const a = await page(b); await loginAdmin(a);
  await a.evaluate(() => renderAdminSettingsPage()); await a.waitForSelector('#marketsCfgWrap .mktOn', { timeout: 15000 });
  await a.evaluate(() => {
    document.querySelector('.mktOn[value="السعودية"]').checked = true; document.getElementById('bank_on_sa').checked = true;
    document.getElementById('bank_name_sa').value = 'بنك اختبار'; document.getElementById('bank_holder_sa').value = 'Top7'; document.getElementById('bank_iban_sa').value = 'SA0012345';
    document.getElementById('mktSave').click();
  });
  await a.waitForTimeout(1500);
  check('الأدمن: حفظ الأسواق المفعّلة', q("SELECT config_value FROM site_config WHERE config_key='active_markets'") === 'مصر,السعودية', await a.textContent('#mktMsg'));
  check('الأدمن: حفظ بيانات البنك للسعودية', q("SELECT config_value FROM site_config WHERE config_key='bank_iban_sa'") === 'SA0012345');
  // باقة للسعودية بسعر محلي
  const ps = await a.evaluate(() => apiPost('/plans_save.php', { id: 'sa_monthly_t', name: 'باقة السعودية', amount: 49, periodLabel: 'شهريًا', durationDays: 30, features: 'ميزة', sortOrder: 9, market: 'السعودية' }));
  check('الأدمن: إضافة باقة للسعودية', ps.success && q("SELECT market FROM subscription_plans WHERE id='sa_monthly_t'") === 'السعودية', JSON.stringify(ps));

  // 3) التسجيل بيسأل عن السوق دلوقتي
  await v.evaluate(() => renderRegister()); await v.waitForSelector('#regMarket', { timeout: 8000 }).catch(() => {});
  const opts = await v.$$eval('#regMarket option', o => o.map(x => x.value));
  check('سوقين مفعّلين: التسجيل فيه اختيار السوق (مصر + السعودية)', opts.join(',') === 'مصر,السعودية', opts.join(','));
  const reg = await v.evaluate(([e, pw]) => apiPost('/register.php', { email: e, password: pw, acceptDisclaimer: '1', market: 'السعودية' }), [SA, SA_PASS]);
  check('تسجيل حساب بسوق السعودية', reg.success && q(`SELECT account_market FROM users WHERE username='${SA}'`) === 'السعودية', JSON.stringify(reg).slice(0, 120));
  const bad = await v.evaluate(() => apiPost('/register.php', { email: 'kw.market.test@example.com', password: 'Test12345k', acceptDisclaimer: '1', market: 'الكويت' }));
  check('سوق غير مفعّل (الكويت) بيتحوّل لأول سوق مفعّل', bad.success && q("SELECT account_market FROM users WHERE username='kw.market.test@example.com'") === 'مصر');
  q("DELETE FROM users WHERE username='kw.market.test@example.com'");

  // 4) الحساب السعودي
  q(`UPDATE users SET email_verified = 1 WHERE username='${SA}'`);
  const c = await page(b);
  const lg = await c.evaluate(async ([e, pw]) => { const x = await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); return x; }, [SA, SA_PASS]);
  check('الحساب السعودي: تسجيل الدخول', lg && lg.success, JSON.stringify(lg).slice(0, 100));
  const am = await c.evaluate(() => apiGet('/account_market.php'));
  check('account_market: السوق والعملة', am.market === 'السعودية' && am.currency === 'SAR' && am.payment.bank && !am.payment.paymob, JSON.stringify({ m: am.market, c: am.currency }));
  const pl = await c.evaluate(() => apiGet('/plans_list.php'));
  check('الباقات: باقات السعودية بس', pl.plans.length > 0 && pl.plans.every(p => p.market === 'السعودية'), pl.plans.map(p => p.id).join(','));
  await c.evaluate(() => GShell.loadAccountMarket(true)); await c.evaluate(() => renderSubscriptionPlans()); await c.waitForTimeout(2500);
  const subOpts = await c.$$eval('#subMarket option:not([hidden]):not([disabled])', o => o.map(x => x.value));
  check('شاشة الباقات: السوق مقفول على السعودية', subOpts.join(',') === 'السعودية', subOpts.join(','));
  const card = await c.textContent('#pricingGrid');
  check('شاشة الباقات: السعر بالريال', card.includes('ريال سعودي') && card.includes('49'), card.slice(0, 80));
  await c.click('.choosePlanBtn[data-plan="sa_monthly_t"]'); await c.waitForTimeout(2000);
  const methods = await c.$$eval('select[id$="Method"] option', o => o.map(x => x.value));
  check('الدفع: تحويل بنكي بس (من غير فودافون/إنستاباي/Paymob)', methods.join(',') === 'bank', methods.join(','));
  const note = await c.evaluate(() => { const n = document.querySelector('[id$="PayNote"]'); return n ? n.textContent : ''; });
  check('الدفع: بيانات البنك ظاهرة', note.includes('SA0012345') && note.includes('بنك اختبار'), note.slice(0, 80));
  // باقة مصر مرفوضة من السيرفر للحساب السعودي، وفودافون كاش مرفوض
  const r1 = await c.evaluate(() => apiPost('/subscribers_add.php', { name: 'اختبار', phone: '0500000001', contactEmail: 'x@example.com', planId: 'monthly', paymentMethod: 'bank', paymentRef: '1', paymentProof: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }));
  check('السيرفر: باقة مصر مرفوضة للحساب السعودي', !r1.success, r1.message);
  const r2 = await c.evaluate(() => apiPost('/subscribers_add.php', { name: 'اختبار', phone: '0500000001', contactEmail: 'x@example.com', planId: 'sa_monthly_t', paymentMethod: 'vodafone', paymentRef: '1', paymentProof: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }));
  check('السيرفر: فودافون كاش مرفوض للسعودية', !r2.success, r2.message);
  const r3 = await c.evaluate(() => apiPost('/subscribers_add.php', { name: 'اختبار', phone: '0500000001', contactEmail: 'x@example.com', planId: 'sa_monthly_t', paymentMethod: 'bank', paymentRef: '1', paymentProof: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }));
  check('السيرفر: اشتراك سعودي بتحويل بنكي مقبول بالريال', r3.success && q(`SELECT CONCAT(currency,'|',market) FROM subscribers WHERE account_email='${SA}'`) === 'SAR|السعودية', r3.message);
  q(`UPDATE subscribers SET active = 1 WHERE account_email='${SA}'`); await c.evaluate(() => { invalidateSessionCache && invalidateSessionCache(); });
  // نماذج الخطط والكشاف: السوق والعملة مقفولين على السعودية
  await c.evaluate(() => renderNewPlanForm()); await c.waitForTimeout(1500);
  const pm = await c.$$eval('#market option:not([hidden]):not([disabled])', o => o.map(x => x.value));
  const pc = await c.evaluate(() => { const s = document.getElementById('currency'); return s ? [...s.options].filter(o => !o.hidden && !o.disabled).map(o => o.value) : []; });
  check('خطة DCA جديدة: السوق مقفول على السعودية', pm.join(',') === 'السعودية', pm.join(','));
  check('خطة DCA جديدة: العملة ريال بس', pc.length === 1 && /ريال سعودي|SAR/.test(pc[0]), pc.join(','));
  await c.evaluate(() => renderGridPlanForm()); await c.waitForTimeout(1500);
  const gm = await c.$$eval('#g_market option:not([hidden]):not([disabled])', o => o.map(x => x.value));
  check('خطة Grid جديدة: السوق مقفول على السعودية', gm.join(',') === 'السعودية', gm.join(','));
  check('الحساب السعودي: بدون أخطاء JavaScript', !c.__errors.length, c.__errors[0]);

  // 5) تقارير الأدمن: ملخص لكل سوق بعملته + فلتر السوق
  const rep = await a.evaluate(() => apiGet('/admin_reports.php'));
  const sa = (rep.summary || []).find(x => x.market === 'السعودية');
  check('التقارير: ملخص السعودية بالريال منفصل', sa && sa.ccy === 'SAR' && sa.registered >= 1, JSON.stringify(sa));
  const repSa = await a.evaluate(() => apiGet('/admin_reports.php?market=' + encodeURIComponent('السعودية')));
  check('التقارير: فلتر السعودية', repSa.success && repSa.market === 'السعودية' && repSa.currency === 'SAR');
  const subs = await a.evaluate(() => apiGet('/subscribers_list.php'));
  const row = (subs.subscribers || []).find(x => x.accountEmail === SA || x.account_email === SA);
  check('المشتركين: سوق الحساب ظاهر', row && row.accountMarket === 'السعودية', row && row.accountMarket);
  await a.evaluate(() => { localStorage.setItem('gs_admin_market', 'السعودية'); renderAdminReportsPage(); }); await a.waitForTimeout(2500);
  check('صفحة التقارير: شريط السوق = السعودية', await a.inputValue('#repMarket') === 'السعودية');
  q(`INSERT INTO plan_trades (account_email, plan_kind, symbol, market, trade_type, qty, price, trade_date) VALUES ('paytest@example.com', 'DCA', 'MKTT', 'مصر', 'buy', 1, 10, CURDATE()), ('${SA}', 'DCA', 'MKTS', 'السعودية', 'buy', 1, 20, CURDATE())`);
  const trAll = await a.evaluate(() => apiGet('/trades_report.php?action=report'));
  const trSa = await a.evaluate(() => apiGet('/trades_report.php?action=report&market=' + encodeURIComponent('السعودية')));
  check('تقرير الصفقات: فلتر السوق (السعودية = صفقات حساباتها بس)', trAll.success && trSa.success && (trSa.recent || []).map(r => r.symbol).join(',') === 'MKTS' && (trAll.recent || []).some(r => r.symbol === 'MKTT'), `${(trAll.recent || []).length} / ${(trSa.recent || []).map(r => r.symbol).join(',')}`);
  q("DELETE FROM plan_trades WHERE symbol IN ('MKTT','MKTS')");
  check('الأدمن: بدون أخطاء JavaScript', !a.__errors.length, a.__errors[0]);

  // تنظيف وإرجاع الإعدادات
  await a.evaluate(() => localStorage.removeItem('gs_admin_market'));
  q(`DELETE FROM subscribers WHERE account_email='${SA}'`); q(`DELETE FROM subscription_events WHERE account_email='${SA}'`); q(`DELETE FROM users WHERE username='${SA}'`);
  q("DELETE FROM subscription_plans WHERE id='sa_monthly_t'");
  KEYS.forEach(k => { if (old[k] === '') q(`DELETE FROM site_config WHERE config_key='${k}'`); else q(`REPLACE INTO site_config (config_key, config_value) VALUES ('${k}', '${old[k].replace(/'/g, "''")}')`); });
  if (oldDomain === '') q("DELETE FROM admin_settings WHERE setting_key='require_valid_email_domain'"); else q(`REPLACE INTO admin_settings (setting_key, setting_value) VALUES ('require_valid_email_domain', '${oldDomain}')`);
  await b.close();
  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
