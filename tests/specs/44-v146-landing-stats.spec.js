// الإصدار 146: عدادات صفحة الموقع العامة — قبل الإطلاق أرقام يدوية مناسبة (العداد الحقيقي واقف ومش بيحسب الأدمن)
//   + زرار «🚀 ابدأ الأرقام الحقيقية» في لوحة التحكم (تصفير الزوار وكل العدادات حقيقية) + الزائر مفيش عنده خطأ 401
const { check, summary, launch, page, loginAdmin, q, BASE } = require('../lib');
(async () => {
  q("DELETE FROM login_attempts");
  const old = q("SELECT data_value FROM ui_customizations WHERE ui_key='landing'");
  q("DELETE FROM ui_customizations WHERE ui_key='landing'");
  q("INSERT INTO site_config (config_key, config_value) VALUES ('landing_visits', '5') ON DUPLICATE KEY UPDATE config_value = '5'");
  const b = await launch();
  const guest = async () => { const g = await page(b); await g.goto(BASE + '/index.php'); await g.waitForSelector('.lp-stats', { timeout: 15000 }).catch(() => {});
    await g.evaluate(() => document.querySelector('.lp-stats').scrollIntoView()); await g.waitForTimeout(2300); return g; };
  const g = await guest();
  const st = await g.$$eval('.lp-stat b', d => d.map(x => +x.textContent.replace(/,/g, '')));
  check('الزائر: العدادات أرقام مناسبة (12,480 زيارة / 860 مستخدم / 2,140 خطة / 9,750 تنبيه)', [12480, 860, 2140, 9750].every(v => st.includes(v)), JSON.stringify(st));
  check('العداد الحقيقي واقف قبل الإطلاق (الزيارة ماتحسبتش) + من غير «مباشر»', q("SELECT config_value FROM site_config WHERE config_key='landing_visits'") === '5' && !(await g.$('.lp-live')));
  const g401 = await g.evaluate(async () => { const r = await fetch('admin_settings_get.php', { credentials: 'same-origin' }); return r.status; });
  check('الزائر: admin_settings_get بيرجع عادي (مش 401) ← مفيش خطأ في الكونسول', g401 === 200, g401);
  const a = await page(b); await loginAdmin(a); await a.evaluate(() => { window.gConfirm = async () => true; });
  await a.evaluate(() => renderAdminLandingPage('links')); await a.waitForSelector('[data-do="statsLive"]', { timeout: 20000 }).catch(() => {});
  check('لوحة التحكم ← صفحة اللاندينج ← العدادات: زرار «🚀 ابدأ الأرقام الحقيقية (بعد الإطلاق)»', !!(await a.$('[data-do="statsLive"]')));
  await a.click('[data-do="statsLive"]'); await a.waitForTimeout(2000);
  const cfg = JSON.parse(q("SELECT data_value FROM ui_customizations WHERE ui_key='landing'") || '{}');
  check('بعد الزرار: عداد الزوار اتصفّر + كل العدادات «حقيقي»', q("SELECT config_value FROM site_config WHERE config_key='landing_visits'") === '0' && cfg.stats && cfg.stats.items.every(i => i.mode === 'real'), JSON.stringify(cfg.stats));
  await a.goto(BASE + '/index.php'); await a.evaluate(() => apiGet('/landing_api.php?action=get&visit=1')); await a.waitForTimeout(400);
  check('زيارة الأدمن مش بتتحسب', q("SELECT config_value FROM site_config WHERE config_key='landing_visits'") === '0');
  const g2 = await guest();
  check('زائر حقيقي بعد الإطلاق ← اتحسب (1) و«مباشر» ظاهر', q("SELECT config_value FROM site_config WHERE config_key='landing_visits'") === '1' && !!(await g2.$('.lp-live')));
  check('بدون أخطاء JavaScript', !g.__errors.length && !a.__errors.length && !g2.__errors.length, g.__errors[0] || a.__errors[0] || g2.__errors[0]);
  q("DELETE FROM ui_customizations WHERE ui_key='landing'");
  if (old) q(`INSERT INTO ui_customizations (ui_key, data_value) VALUES ('landing', ${JSON.stringify(old)})`);
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
