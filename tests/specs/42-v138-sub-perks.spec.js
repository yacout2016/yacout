// الإصدار 138: جدول المشتركين — الباقة من قائمة منسدلة قدام كل مشترك + مميزات كل مشترك (الافتراضي = باقته، والأدمن يزوّد / يشيل)
//   + أي حساب جديد بيتسجّل على الباقة المجانية تلقائي
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
const R = { email: 'subperk.v138@example.com', pass: 'Subperk12345' };
(async () => {
  q("DELETE FROM login_attempts");
  q(`DELETE FROM subscribers WHERE account_email='${R.email}'`); q(`DELETE FROM users WHERE username='${R.email}'`); q(`DELETE FROM user_perks WHERE account_email='${R.email}'`);
  q("UPDATE subscription_plans SET perks = NULL"); q("DELETE FROM site_config WHERE config_key = 'perks_cfg'");
  const b = await launch();
  const v = await page(b);
  const reg = await v.evaluate(([e, pw]) => apiPost('/register.php', { email: e, password: pw, acceptDisclaimer: '1', market: 'مصر' }), [R.email, R.pass]);
  q(`UPDATE users SET email_verified = 1 WHERE username='${R.email}'`);
  const row = q(`SELECT plan_id, active, amount FROM subscribers WHERE account_email='${R.email}'`);
  check('تسجيل حساب جديد ← بيتسجّل على الباقة المجانية تلقائي (ويظهر في جدول المشتركين)', reg.success && /^trial\s+1\s+0/.test(row), row);
  const me = () => v.evaluate(() => apiGet('/perks_api.php?action=me'));
  await v.evaluate(async () => { invalidateSessionCache(); await getSession(); });
  let s = await me();
  check('الحساب الجديد: فترة التعرّف شغالة', s.phase === 'full', s.phase);
  const subId = q(`SELECT id FROM subscribers WHERE account_email='${R.email}'`);

  // الأدمن: القائمة المنسدلة للباقة
  const a = await page(b); await loginAdmin(a); await a.evaluate(() => { window.gConfirm = async () => true; window.gChoice = async () => 0; });
  await a.evaluate(() => renderAdminSubscribers()); await a.waitForSelector(`td.pk-subplan-td[data-subid="${subId}"] select.pk-subplan`, { timeout: 20000 }).catch(() => {});
  const opts = await a.evaluate((id) => [...document.querySelectorAll(`td.pk-subplan-td[data-subid="${id}"] option`)].map(o => o.value), subId);
  check('قدام كل مشترك: الباقة قائمة منسدلة فيها كل الباقات (المجانية ← الشهرية ← السنوية ← برو)', opts.join(',') === 'trial,monthly,yearly,pro_yearly', opts.join(','));
  const flt = await a.evaluate(() => { const th = [...document.querySelectorAll('#subscribersTableWrap thead tr:first-child th')], i = th.findIndex(x => /الخطة/.test(x.textContent)); const fr = document.querySelector('#subscribersTableWrap .g-filter-row'); return i >= 0 && fr ? !!fr.children[i].querySelector('select, input') : false; });
  check('عمود الخطة لسه عليه فلتر «الكل» زي الأول', flt);
  check('عمود «🤖 الذكاء الاصطناعي» اتشال منه فتح/قفل بصيرة والميزانين (اتنقلوا لـ «المميزات»)', await a.evaluate(() => !document.querySelector('.g-ai [data-ai="basira"]')));
  await a.selectOption(`td.pk-subplan-td[data-subid="${subId}"] select.pk-subplan`, 'pro_yearly'); await a.waitForTimeout(1500);
  const r2 = q(`SELECT plan_id, amount, is_comp, start_date = CURDATE(), DATEDIFF(end_date, start_date) FROM subscribers WHERE id=${subId}`);
  check('اختيار «برو» من القائمة (هدية) ← اتفعّلت من النهارده لمدة سنة', /^pro_yearly\s+0\.00\s+1\s+1\s+365/.test(r2), r2);
  s = await me();
  check('المشترك بقى بيشوف مميزات برو كلها', s.phase === 'paid' && s.keys.length === 14 && s.planName.includes('برو'), JSON.stringify({ p: s.phase, n: s.keys.length }));
  const paid = await a.evaluate(async (id) => apiPost('/perks_api.php', { action: 'set_plan', subId: id, planId: 'trial', mode: 'gift' }), subId);
  q(`UPDATE subscribers SET start_date = DATE_SUB(CURDATE(), INTERVAL 25 DAY), end_date = DATE_ADD(CURDATE(), INTERVAL 5 DAY) WHERE id=${subId}`); q(`UPDATE users SET created_at = DATE_SUB(NOW(), INTERVAL 25 DAY) WHERE username='${R.email}'`);
  s = await me();
  check('رجّعته المجانية (بعد فترة التعرّف) ← مميزات المجانية بس', paid.success && s.phase === 'basic' && !s.keys.includes('basira'), s.keys.join(','));

  // مميزات إضافية فوق المجانية (بصيرة + ميزان GRIFFINE AI) وشيل ميزة
  await a.evaluate(() => renderAdminSubscribers()); await a.waitForSelector(`td[data-pksub="${R.email}"] summary`, { timeout: 20000 }).catch(() => {});
  await a.click(`td[data-pksub="${R.email}"] summary`); await a.waitForSelector(`td[data-pksub="${R.email}"] [data-pksubsave]`, { timeout: 10000 }).catch(() => {});
  const dd = await a.evaluate((e) => { const td = document.querySelector(`td[data-pksub="${e}"]`); return { n: td.querySelectorAll('.pk-dd-it input').length, on: [...td.querySelectorAll('.pk-dd-it input:checked')].map(i => i.value).sort().join(','), inB: /في باقته/.test(td.textContent) }; }, R.email);
  check('«⭐ المميزات» للمشترك: الافتراضي متعلّم = مميزات باقته', dd.n === 14 && dd.on === 'alerts,dca,recs_short,watchlist' && dd.inB, JSON.stringify(dd));
  await a.check(`td[data-pksub="${R.email}"] .pk-dd-it input[value="basira"]`); await a.check(`td[data-pksub="${R.email}"] .pk-dd-it input[value="mizanai"]`); await a.uncheck(`td[data-pksub="${R.email}"] .pk-dd-it input[value="alerts"]`);
  await a.click(`td[data-pksub="${R.email}"] [data-pksubsave]`); await a.waitForTimeout(1500);
  s = await me();
  check('حفظ ← بصيرة وميزان GRIFFINE AI مفتوحين له فوق المجانية + التنبيهات اتقفلت عنده بس', s.keys.includes('basira') && s.keys.includes('mizanai') && !s.keys.includes('alerts') && s.extra.sort().join(',') === 'basira,mizanai' && s.removed.join(',') === 'alerts', JSON.stringify({ k: s.keys, x: s.extra, r: s.removed }));
  const bs = await v.evaluate(async () => apiGet('/basira_api.php?action=config'));
  check('السيرفر: بصيرة شغالة له فعلًا', bs.success === true, JSON.stringify(bs).slice(0, 100));
  const sumTxt = await a.evaluate((e) => document.querySelector(`td[data-pksub="${e}"] summary`).textContent, R.email);
  check('في الجدول: «+2 إضافي / −1»', /\+2/.test(sumTxt) && /−1/.test(sumTxt), sumTxt);
  await v.evaluate(async () => { await gPerksLoad(); GShell.renderAccount(); }); await v.waitForSelector('#pkMine', { timeout: 15000 }).catch(() => {});
  check('عند المشترك: الميزة الإضافية مكتوب جنبها «🎁 ميزة إضافية من الإدارة»', await v.evaluate(() => /ميزة إضافية من الإدارة/.test(document.getElementById('pkMine').textContent)));
  // بتفضل معاه لما الباقة تتغير
  await a.evaluate(async (id) => apiPost('/perks_api.php', { action: 'set_plan', subId: id, planId: 'monthly', mode: 'paid' }), subId);
  s = await me();
  check('تغيير الباقة للشهرية (مدفوعة) ← الإضافي والمتشال لسه معاه', s.phase === 'paid' && s.keys.includes('mizanai') && !s.keys.includes('alerts') && q(`SELECT amount FROM subscribers WHERE id=${subId}`) === '200.00', JSON.stringify(s.keys));
  await a.evaluate(async (e) => apiPost('/perks_api.php', { action: 'sub_reset', email: e }), R.email);
  s = await me();
  check('«رجوع لمميزات الباقة» ← مميزات الشهرية بالظبط', !s.keys.includes('mizanai') && s.keys.includes('alerts') && !s.extra.length, s.keys.join(','));

  check('بدون أخطاء JavaScript', !a.__errors.length && !v.__errors.length, a.__errors[0] || v.__errors[0]);
  q(`DELETE FROM subscribers WHERE account_email='${R.email}'`); q(`DELETE FROM users WHERE username='${R.email}'`); q(`DELETE FROM user_perks WHERE account_email='${R.email}'`);
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
