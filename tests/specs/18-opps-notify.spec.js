// الإصدار 101: البحث عن فرص حسب المؤشرات (الشروط / عكس البيع / التعارض / النتائج / الإشعار / 4 فرص / السلة / خطة من الفرصة)
//              + قنوات الإشعارات لكل مشترك (الموقع / الإيميل / الواتساب مخفي لحد التفعيل / إظهار الإعدادات للمشترك)
const { check, summary, launch, page, loginAdmin, q, BASE } = require('../lib');
const ADMIN = 'top72026@gmail.com', CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
const loginAs = (p, a) => p.evaluate(async ([e, pw]) => { window.alert = () => {}; const x = await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); return x; }, [a.email, a.pass]);
(async () => {
  q("DELETE FROM login_attempts");
  q(`DELETE FROM opportunity_hits WHERE account_email='${ADMIN}'`); q(`DELETE FROM opportunities WHERE account_email='${ADMIN}'`); q(`DELETE FROM user_alerts WHERE account_email='${ADMIN}'`);
  q("DELETE FROM notify_prefs"); q("DELETE FROM trash_bin WHERE item_type='opportunity'");
  const oldCfg = {}; ['wa_notify_on', 'notify_prefs_visible'].forEach(k => { oldCfg[k] = q(`SELECT config_value FROM site_config WHERE config_key='${k}'`); });
  const b = await launch();
  const a = await page(b); await loginAdmin(a);

  // 1) الدخول من كشاف الأسهم + التنبيه
  await a.evaluate(() => renderScreener()); await a.waitForTimeout(1200);
  check('كشاف الأسهم: زرار «البحث عن فرص» + إنها ليست توصية', await a.locator('#goOppsBtn').count() === 1 && /ليست توصية استثمارية/.test(await a.textContent('.opp-entry')));
  await a.click('#goOppsBtn'); await a.waitForSelector('#oppForm', { timeout: 8000 });
  check('شاشة الفرص: تنبيه «مش توصية استثمارية»', /مش توصية استثمارية/.test(await a.textContent('.opp-disc')));
  // 2) عكس الشرط الافتراضي مع البيع
  await a.click('.opp-side [data-side="sell"]'); await a.waitForTimeout(200);
  const sell = await a.evaluate(() => ({ c: document.querySelector('.opp-ind .oppC').value, lvl: document.querySelector('.opp-ind input[data-k="level"]').value, on: document.querySelector('.opp-sell').classList.contains('on') }));
  check('بيع ← الشرط الافتراضي اتعكس (RSI أعلى من 70) والزرار أحمر', sell.c === 'above' && sell.lvl === '70' && sell.on, JSON.stringify(sell));
  await a.click('.opp-side [data-side="buy"]'); await a.waitForTimeout(200);
  // 3) التعارض: RSI تشبع بيعي + السعر فوق المتوسط
  await a.selectOption('#oppCount', '2'); await a.waitForTimeout(200);
  await a.selectOption('.opp-ind[data-i="1"] .oppT', 'sma'); await a.waitForTimeout(200);
  const cf = await a.evaluate(() => ({ w: document.getElementById('oppWarn').textContent, hid: document.getElementById('oppWarn').hidden, dis: document.getElementById('oppSave').disabled }));
  check('إعدادات متعارضة (RSI < 30 + السعر فوق SMA) ← تحذير والحفظ ممنوع', !cf.hid && /متعارضة/.test(cf.w) && cf.dis, cf.w.slice(0, 80));
  const srv = await a.evaluate(() => apiPost('/opps_api.php', { action: 'save', side: 'buy', timeframe: '1d', indicators: JSON.stringify([{ t: 'rsi', p: { period: 14, level: 30 }, c: 'below' }, { t: 'sma', p: { period: 50 }, c: 'above' }]), days: 1, maxSends: 1, sendGap: 60, chApp: '1', chEmail: '1' }));
  check('السيرفر كمان بيرفض الإعدادات المتعارضة', !srv.success && /متعارضة/.test(srv.message || ''), srv.message);
  await a.selectOption('#oppCount', '1'); await a.waitForTimeout(200);

  // 4) فرصة 1: RSI < 30 (شراء) ← DROPX بس (سهم نازل)
  q("DELETE FROM email_log WHERE to_email='" + ADMIN + "'");
  await a.click('#oppSave'); await a.waitForTimeout(1500);
  const o1 = +q(`SELECT id FROM opportunities WHERE account_email='${ADMIN}' AND opp_no=1`);
  check('حفظ «فرصة 1»', o1 > 0);
  await a.evaluate((id) => apiPost('/opps_api.php', { action: 'run', id }), o1); await a.waitForTimeout(500);
  const hits1 = q(`SELECT GROUP_CONCAT(symbol ORDER BY symbol) FROM opportunity_hits WHERE opp_id=${o1}`);
  check('نتائج فرصة 1: الأسهم اللي RSI فيها أقل من 30 بس (DROPX)', hits1 === 'DROPX', hits1);
  const al = q(`SELECT CONCAT(title, ' || ', body) FROM user_alerts WHERE account_email='${ADMIN}' ORDER BY id DESC LIMIT 1`).replace(/[⁦⁩]/g, '');
  check('إشعار على الموقع بجدول الأسهم + تنبيه «ليست توصية»', /فرصة 1/.test(al) && /DROPX/.test(al) && /ليست توصية/.test(al), al.slice(0, 160));
  check('إيميل بالفرصة', +q(`SELECT COUNT(*) FROM email_log WHERE to_email='${ADMIN}'`) >= 1);
  check('الأسهم اتعلّمت إنها اتبعتت', q(`SELECT notified FROM opportunity_hits WHERE opp_id=${o1}`) === '1');
  // 5) فرصة 2: SMA 50 (السعر فوقه) + حجم التداول ← الأسهم الصاعدة
  const r2 = await a.evaluate(() => apiPost('/opps_api.php', { action: 'save', side: 'buy', timeframe: '1d', indicators: JSON.stringify([{ t: 'sma', p: { period: 50, lookback: 3 }, c: 'above' }, { t: 'vol', p: { period: 20, ratio: 150 }, c: 'above' }]), days: 2, maxSends: 3, sendGap: 60, chApp: '1', chEmail: '0' }));
  await a.evaluate((id) => apiPost('/opps_api.php', { action: 'run', id }), r2.id);
  const hits2 = q(`SELECT GROUP_CONCAT(symbol ORDER BY symbol) FROM opportunity_hits WHERE opp_id=${r2.id}`);
  check('فرصة 2 (مؤشرين لازم الاتنين يتحققوا): الأسهم الصاعدة بس', hits2 === 'COMI,CRVX,HRHO,TMGH', hits2);
  // 6) بيع: MACD تحت خط الإشارة ← DROPX
  const r3 = await a.evaluate(() => apiPost('/opps_api.php', { action: 'save', side: 'sell', timeframe: '1wk', indicators: JSON.stringify([{ t: 'sma', p: { period: 20, lookback: 3 }, c: 'below' }]), days: 5, maxSends: 1, sendGap: 60, chApp: '1', chEmail: '0' }));
  await a.evaluate((id) => apiPost('/opps_api.php', { action: 'run', id }), r3.id);
  check('فرصة بيع (أسبوعي): السعر تحت المتوسط ← DROPX', q(`SELECT GROUP_CONCAT(symbol) FROM opportunity_hits WHERE opp_id=${r3.id}`) === 'DROPX');
  // 7) الحد الأقصى 4
  const r4 = await a.evaluate(() => apiPost('/opps_api.php', { action: 'save', side: 'buy', timeframe: '1d', indicators: JSON.stringify([{ t: 'macd', p: { fast: 12, slow: 26, signal: 9, lookback: 3 }, c: 'above' }]), days: 1, maxSends: 1, sendGap: 60, chApp: '1', chEmail: '0' }));
  const r5 = await a.evaluate(() => apiPost('/opps_api.php', { action: 'save', side: 'buy', timeframe: '1d', indicators: JSON.stringify([{ t: 'ema', p: { period: 20, lookback: 3 }, c: 'above' }]), days: 1, maxSends: 1, sendGap: 60, chApp: '1', chEmail: '0' }));
  check('الحد الأقصى 4 فرص مفتوحة (الخامسة مرفوضة)', r4.success && !r5.success && /الحد الأقصى/.test(r5.message || ''), r5.message);
  // 8) الشاشة: القائمة + 5 صفوف والباقي تمرير + زرار خطة
  await a.evaluate(() => renderOpportunities()); await a.waitForTimeout(1500);
  check('الشاشة: 4 فرص بأرقامها', await a.locator('.opp-card').count() === 4 && /فرصة 1/.test(await a.textContent('#oppList')));
  await a.click('.opp-card:nth-child(2) [data-opp-plan="dca"]'); await a.waitForTimeout(1500);
  check('زرار «+ خطة DCA» بيفتح نموذج الخطة بالسهم', ['COMI', 'CRVX', 'HRHO', 'TMGH'].includes(await a.inputValue('#symbol')), await a.inputValue('#symbol'));
  // 9) إيقاف + حذف ← السلة ← استرجاع
  await a.evaluate(() => renderOpportunities()); await a.waitForTimeout(1200);
  await a.click(`[data-opp-act="toggle"][data-id="${o1}"]`); await a.waitForTimeout(800);
  check('إيقاف البحث', q(`SELECT status FROM opportunities WHERE id=${o1}`) === 'paused');
  await a.evaluate(() => { window.gConfirm = async () => true; }); await a.click(`[data-opp-act="delete"][data-id="${o1}"]`); await a.waitForTimeout(800);
  check('الحذف ← سلة المحذوفات', q(`SELECT COUNT(*) FROM opportunities WHERE id=${o1}`) === '0' && +q("SELECT COUNT(*) FROM trash_bin WHERE item_type='opportunity' AND restored_at IS NULL") === 1);
  const tid = q("SELECT id FROM trash_bin WHERE item_type='opportunity' ORDER BY id DESC LIMIT 1");
  const rs = await a.evaluate((id) => apiPost('/trash_api.php', { action: 'restore', id }), tid);
  check('الاسترجاع من السلة بنتايجها', rs.success && q(`SELECT COUNT(*) FROM opportunities WHERE id=${o1}`) === '1' && q(`SELECT COUNT(*) FROM opportunity_hits WHERE opp_id=${o1}`) === '1');

  // 10) قنوات الإشعارات: الواتساب مخفي لحد التفعيل
  q("REPLACE INTO site_config (config_key, config_value) VALUES ('wa_notify_on', '0'), ('notify_prefs_visible', '0')");
  await a.evaluate(() => renderAdminSubscribers()); await a.waitForTimeout(2500);
  check('جدول المشتركين: خانات الموقع والإيميل، والواتساب مخفي', await a.locator('.g-np [data-np="app"]').count() > 0 && await a.locator('.g-np [data-np="wa"]').count() === 0);
  q("REPLACE INTO site_config (config_key, config_value) VALUES ('wa_notify_on', '1')");
  await a.evaluate(() => { window.__npAll = null; renderAdminSubscribers(); }); await a.waitForTimeout(2500);
  check('بعد تفعيل الواتساب: خانة الواتساب + رقم', await a.locator('.g-np [data-np="wa"]').count() > 0 && await a.locator('.g-np [data-np="wa_phone"]').count() > 0);
  const box = `.g-np[data-np-email="${CUST.email}"]`;
  await a.uncheck(`${box} [data-np="email"]`); await a.waitForTimeout(800);
  check('إيقاف الإيميل لمشترك بعينه', q(`SELECT email FROM notify_prefs WHERE account_email='${CUST.email}'`) === '0');
  await a.evaluate(() => renderStaffManagementPage()); await a.waitForTimeout(2000);
  check('جدول الفريق فيه نفس الخانات', await a.locator('#staffTableWrap .g-np').count() > 0);
  // الإيميل المقفول ميوصلش: تنبيه سعر مخصص للعميل
  q(`DELETE FROM email_log WHERE to_email='${CUST.email}'`);
  const c = await page(b); await loginAs(c, CUST);
  await fetch('http://127.0.0.1:8098/set?sym=COMI&price=80');
  const ca = await c.evaluate(() => apiPost('/markets_api.php', { action: 'custom_add', symbol: 'COMI', market: 'مصر', currency: 'EGP', cond: 'gte', price: '1', repeats: '1', interval: '15', note: '' }));
  await c.waitForTimeout(800);
  check('المشترك اللي إيميله مقفول: الإشعار وصل على الموقع ومن غير إيميل', ca.success !== false && +q(`SELECT COUNT(*) FROM user_alerts WHERE account_email='${CUST.email}' AND symbol='COMI'`) >= 1 && +q(`SELECT COUNT(*) FROM email_log WHERE to_email='${CUST.email}'`) === 0, JSON.stringify(ca).slice(0, 100));
  // إظهار الإعدادات للمشترك
  await c.evaluate(() => GShell.renderAccount()); await c.waitForTimeout(1500);
  check('إعدادات الإشعارات مخفية عن المشترك افتراضيًا', await c.locator('.g-np-mine').count() === 0);
  q("REPLACE INTO site_config (config_key, config_value) VALUES ('notify_prefs_visible', '1')");
  await c.evaluate(() => GShell.renderAccount()); await c.waitForTimeout(1500);
  check('الأدمن أظهرها للكل ← المشترك يشوف «استقبال الإشعارات»', await c.locator('.g-np-mine').count() === 1);
  q(`UPDATE notify_prefs SET user_visible = 0 WHERE account_email='${CUST.email}'`);
  await c.evaluate(() => GShell.renderAccount()); await c.waitForTimeout(1500);
  check('استثناء مشترك بعينه (مخفي عنه)', await c.locator('.g-np-mine').count() === 0);
  check('بدون أخطاء JavaScript', !a.__errors.length && !c.__errors.length, a.__errors[0] || c.__errors[0]);

  // تنظيف
  q(`DELETE FROM custom_alerts WHERE account_email='${CUST.email}'`); q(`DELETE FROM user_alerts WHERE account_email IN ('${CUST.email}','${ADMIN}')`);
  q(`DELETE FROM opportunity_hits WHERE account_email='${ADMIN}'`); q(`DELETE FROM opportunities WHERE account_email='${ADMIN}'`); q("DELETE FROM notify_prefs"); q("DELETE FROM trash_bin WHERE item_type='opportunity'");
  Object.entries(oldCfg).forEach(([k, v]) => { if (v === '') q(`DELETE FROM site_config WHERE config_key='${k}'`); else q(`REPLACE INTO site_config (config_key, config_value) VALUES ('${k}', '${v}')`); });
  await b.close();
  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
