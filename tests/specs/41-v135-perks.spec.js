// الإصدار 135: مميزات كل باقة — قائمة منسدلة قدام كل باقة في لوحة التحكم + ميزات جديدة من الأدمن
//   + الباقة المجانية (أول 20 يوم كل حاجة ثم 10 أيام مميزات المجانية) + القفل في الشاشات والسيرفر + ✅/🔒 تحت الباقات
const { execSync } = require('child_process');
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
const CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
const NEW = { email: 'perknew@example.com', pass: 'Perk12345x' };
(async () => {
  q("DELETE FROM login_attempts");
  q("UPDATE subscription_plans SET perks = NULL"); q("DELETE FROM site_config WHERE config_key = 'perks_cfg'");
  const hash = execSync(`php -r 'echo password_hash("${NEW.pass}", PASSWORD_DEFAULT);'`).toString().trim();
  q(`DELETE FROM subscribers WHERE account_email='${NEW.email}'`); q(`DELETE FROM users WHERE username='${NEW.email}'`);
  q(`INSERT INTO users (username, password, is_admin, email_verified, created_at) VALUES ('${NEW.email}', '${hash.replace(/\$/g, '\\$')}', 0, 1, NOW())`);
  const b = await launch();
  const login = async (p, u) => { await p.evaluate(async ([e, pw]) => { await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); try { await acceptDisclaimer(); } catch(x){} await refreshTopNav(); }, [u.email, u.pass]); };
  const me = (p) => p.evaluate(() => apiGet('/perks_api.php?action=me'));

  // 1) حساب جديد ← فترة التعرّف (كل المميزات) ثم الباقة المجانية ثم مفيش
  const n = await page(b); await login(n, NEW);
  let s = await me(n);
  check('حساب جديد: فترة التعرّف — كل المميزات (ماعدا الذكاء المتقدم) و20 يوم', s.phase === 'full' && s.daysLeft === 20 && s.keys.includes('mizanai') && s.keys.includes('recs_long') && !s.keys.includes('ai_pro') && s.catalog.length === 14, JSON.stringify({ p: s.phase, d: s.daysLeft, n: s.keys.length }));
  await n.evaluate(() => renderHome()); await n.waitForSelector('.pk-home', { timeout: 15000 }).catch(() => {});
  check('الرئيسية: كارت «فترة التعرّف» واضح', await n.evaluate(() => { const c = document.querySelector('.pk-home.full'); return !!c && /فترة التعرّف/.test(c.textContent) && /20/.test(c.textContent); }));
  await n.evaluate(() => renderMizanAi()); await n.waitForTimeout(2500);
  check('فترة التعرّف: ميزان GRIFFINE AI بيفتح عادي (مش مقفول)', await n.evaluate(() => !document.querySelector('.pk-lock')));
  q(`UPDATE users SET created_at = DATE_SUB(NOW(), INTERVAL 25 DAY) WHERE username='${NEW.email}'`);
  s = await me(n);
  check('بعد 20 يوم: الباقة المجانية (داك + متابعة + تنبيهات + توصيات قصيرة) و5 أيام باقيين', s.phase === 'basic' && s.daysLeft === 5 && s.keys.slice().sort().join(',') === 'alerts,dca,recs_short,watchlist', JSON.stringify({ p: s.phase, d: s.daysLeft, k: s.keys }));
  await n.evaluate(() => refreshTopNav()); await n.waitForTimeout(800);
  const side = await n.evaluate(() => ({ cta: !!document.querySelector('.gs-sidebar .gs-side-cta'), lockMza: !!document.querySelector('.gs-sidebar [data-tab="mizanai"] .gs-side-lock'), lockDca: !!document.querySelector('.gs-sidebar [data-sub="dca"] .gs-side-lock') }));
  check('القائمة الجانبية: زرار «الباقات والأسعار» مميز + 🔒 على المقفول بس', side.cta && side.lockMza && !side.lockDca, JSON.stringify(side));
  await n.evaluate(() => renderOpportunities()); await n.waitForSelector('.pk-lock', { timeout: 15000 }).catch(() => {});
  const lk = await n.evaluate(() => ({ t: (document.querySelector('.pk-lock') || {}).textContent || '', chips: document.querySelectorAll('.pk-lock .pk-chip').length, mine: !!document.querySelector('#pkMine .pk-it.off') }));
  check('شاشة مقفولة (فرصة) ← «مش ضمن باقتك» + الباقات اللي فيها + مميزاتي ✅/🔒', /مش ضمن باقتك/.test(lk.t) && /فرصة/.test(lk.t) && lk.chips >= 1 && lk.mine, JSON.stringify(lk).slice(0, 160));
  await n.evaluate(() => renderGridPlansList()); await n.waitForTimeout(2500);
  check('قائمة خطط الجريد (مش في الباقة) ← بتفتح بشريط «تتابع اللي عندك بس»', await n.evaluate(() => /تتابع اللي عندك بس/.test((document.querySelector('.pk-banner') || {}).textContent || '')));
  const gsave = await n.evaluate(async () => apiPost('/user_data_save.php', { key: 'grid_plans', value: JSON.stringify({ NEWX: { a: 1 } }) }));
  check('السيرفر: خطة جريد جديدة من غير الميزة ← مرفوضة', gsave.success === false && gsave.perkLocked === 'grid', JSON.stringify(gsave).slice(0, 140));
  const mz = await n.evaluate(async () => apiGet('/mizanai_api.php?action=config'));
  check('السيرفر: ميزان GRIFFINE AI ← مرفوض برسالة الباقة', mz.success === false && mz.perkLocked === 'mizanai' && /مش ضمن باقتك/.test(mz.message), JSON.stringify(mz).slice(0, 140));
  const rl = await n.evaluate(async () => apiGet('/recommendations_list.php'));
  check('التوصيات: قصيرة المدى بس (الطويلة مقفولة)', rl.success && rl.perkLocked === 'recs_long', JSON.stringify(rl).slice(0, 120));
  q(`UPDATE users SET created_at = DATE_SUB(NOW(), INTERVAL 40 DAY) WHERE username='${NEW.email}'`);
  s = await me(n);
  check('بعد 30 يوم: مفيش باقة شغالة', s.phase === 'none' && s.keys.length === 0, s.phase);
  const wa = await n.evaluate(async () => apiPost('/markets_api.php', { action: 'watch_add', symbol: 'COMI', market: 'مصر' }));
  check('السيرفر: قائمة المتابعة من غير باقة ← مرفوضة', wa.success === false && wa.requiresSubscription, JSON.stringify(wa).slice(0, 120));

  // 2) مشترك الشهرية (الافتراضي)
  const c = await page(b); await login(c, CUST);
  s = await me(c);
  check('الشهرية (افتراضي): بصيرة + الكشاف — من غير ميزان GRIFFINE AI والتوصيات الطويلة', s.phase === 'paid' && s.keys.includes('basira') && s.keys.includes('screener') && !s.keys.includes('mizanai') && !s.keys.includes('recs_long') && !s.keys.includes('basira_scan'), s.keys.join(','));
  const bs = await c.evaluate(async () => ({ cfg: await apiGet('/basira_api.php?action=config'), scan: await apiGet('/basira_api.php?action=scan&limit=0') }));
  check('بصيرة: «تحليل سهم» شغال و«مسح السوق» مقفول من السيرفر', bs.cfg.success && bs.scan.success === false && bs.scan.perkLocked === 'basira_scan', JSON.stringify(bs.scan).slice(0, 120));
  await c.evaluate(() => renderBasira()); await c.waitForSelector('#bsTabScan', { timeout: 20000 }).catch(() => {}); await c.waitForTimeout(800);
  check('بصيرة: تبويب «مسح السوق» عليه 🔒', await c.evaluate(() => /🔒/.test(document.getElementById('bsTabScan').textContent)));
  await c.click('#bsTabScan'); await c.waitForSelector('.pk-lock', { timeout: 10000 }).catch(() => {});
  check('الضغط على «مسح السوق» ← شاشة القفل', await c.evaluate(() => /مسح السوق/.test((document.querySelector('.pk-lock') || {}).textContent || '')));
  await c.evaluate(() => renderSubscriptionPlans()); await c.waitForSelector('.price-card .pk-plan', { timeout: 15000 }).catch(() => {});
  const pc = await c.evaluate(() => [...document.querySelectorAll('.price-card')].map(x => ({ id: x.dataset.plan, on: x.querySelectorAll('.pk-plan li.on').length, off: x.querySelectorAll('.pk-plan li.off').length })));
  const yr = pc.find(x => x.id === 'yearly'), pro = pc.find(x => x.id === 'pro_yearly');
  check('«الباقات والأسعار»: تحت كل باقة ✅ الموجود و🔒 الناقص', pc.length >= 2 && yr && yr.on === 13 && yr.off === 1 && pro && pro.on === 14 && pro.off === 0, JSON.stringify(pc));
  await c.evaluate(() => GShell.renderAccount()); await c.waitForSelector('#pkMine', { timeout: 15000 }).catch(() => {});
  check('حسابي: «مميزات باقتك» + زرار الباقات المميز', await c.evaluate(() => !!document.querySelector('#pkMine .pk-it.on') && !!document.querySelector('.pk-cta-wide')));

  // 3) الأدمن: القائمة المنسدلة قدام كل باقة + الحفظ يبقى الافتراضي
  const a = await page(b); await loginAdmin(a); await a.evaluate(() => { window.gConfirm = async () => true; });
  await a.evaluate(() => renderPlansManagementPage()); await a.waitForSelector('td[data-pkplan="monthly"] .pk-dd', { timeout: 20000 }).catch(() => {});
  const ad = await a.evaluate(() => ({ dd: document.querySelectorAll('.pk-dd').length, sum: (document.querySelector('td[data-pkplan="monthly"] summary') || {}).textContent || '', free: !!document.getElementById('pkFullDays') }));
  check('لوحة التحكم: «المميزات» قائمة منسدلة قدام كل باقة (10/14 افتراضي للشهرية) + إعدادات المجانية', ad.dd >= 4 && /10\/14/.test(ad.sum) && /افتراضي/.test(ad.sum) && ad.free, JSON.stringify(ad));
  await a.click('td[data-pkplan="monthly"] summary');
  await a.check('td[data-pkplan="monthly"] .pk-dd-it input[value="mizanai"]'); await a.uncheck('td[data-pkplan="monthly"] .pk-dd-it input[value="opps"]');
  await a.click('td[data-pkplan="monthly"] [data-pksave]'); await a.waitForTimeout(1200);
  const saved = JSON.parse(q("SELECT perks FROM subscription_plans WHERE id = 'monthly'") || '[]');
  check('حفظ مميزات الشهرية (ضفت ميزان GRIFFINE AI وشلت فرصة)', saved.includes('mizanai') && !saved.includes('opps'), saved.join(','));
  s = await me(c);
  check('المشترك بيشوف التغيير فورًا', s.keys.includes('mizanai') && !s.keys.includes('opps'));
  // ميزة / شاشة جديدة من الأدمن
  const add = await a.evaluate(async () => apiPost('/perks_api.php', { action: 'add_custom', label: 'أولوية في الدعم الفني', screen: 'renderReferralPage' }));
  check('إضافة ميزة جديدة مربوطة بشاشة', add.success && /^c_/.test(add.k), JSON.stringify(add).slice(0, 100));
  await c.evaluate(() => gPerksLoad()); await c.evaluate(() => renderReferralPage()); await c.waitForSelector('.pk-lock', { timeout: 10000 }).catch(() => {});
  check('الشاشة المربوطة بميزة مش في الباقة ← مقفولة', await c.evaluate(() => /أولوية في الدعم الفني/.test((document.querySelector('.pk-lock') || {}).textContent || '')));
  await a.evaluate(async (k) => apiPost('/perks_api.php', { action: 'save_plan', planId: 'monthly', keys: JSON.stringify(['dca', 'grid', 'basira', 'screener', k]) }), add.k);
  await c.evaluate(() => gPerksLoad()); await c.evaluate(() => renderReferralPage()); await c.waitForTimeout(1500);
  check('بعد ما الأدمن ضافها للشهرية ← الشاشة بتفتح', await c.evaluate(() => !document.querySelector('.pk-lock')));
  await a.evaluate(async (k) => apiPost('/perks_api.php', { action: 'del_custom', k }), add.k);
  check('حذف الميزة الجديدة', !(await me(c)).catalog.some(x => x.k === add.k));
  await a.evaluate(async () => apiPost('/perks_api.php', { action: 'reset_plan', planId: 'monthly' }));
  check('«الاختيارات الأصلية» ← رجعت للافتراضي', q("SELECT COALESCE(perks, 'NULL') FROM subscription_plans WHERE id = 'monthly'") === 'NULL');
  // إعدادات الباقة المجانية
  q(`UPDATE users SET created_at = DATE_SUB(NOW(), INTERVAL 12 DAY) WHERE username='${NEW.email}'`);
  await a.evaluate(async () => apiPost('/perks_api.php', { action: 'save_cfg', fullDays: 10, fullAi: '0' }));
  s = await me(n);
  check('فترة التعرّف 10 أيام من الإعدادات ← يوم 12 = الباقة المجانية', s.phase === 'basic' && s.daysLeft === 18, JSON.stringify({ p: s.phase, d: s.daysLeft }));
  q("DELETE FROM site_config WHERE config_key = 'perks_cfg'");
  const ai = await a.evaluate(async () => apiPost('/perks_api.php', { action: 'save_plan', planId: 'yearly', keys: JSON.stringify(['dca', 'ai_pro']) }));
  check('«الذكاء المتقدم» في الباقة ← includes_ai بيتظبط معاه', ai.success && q("SELECT includes_ai FROM subscription_plans WHERE id = 'yearly'") === '1');
  await a.evaluate(async () => apiPost('/perks_api.php', { action: 'reset_plan', planId: 'yearly' })); q("UPDATE subscription_plans SET includes_ai = 0 WHERE id = 'yearly'");

  // موبايل: زرار الباقات المميز في حسابي
  const m = await page(b, { width: 390, height: 844 }); await login(m, CUST);
  await m.evaluate(() => GShell.renderAccount()); await m.waitForSelector('.pk-cta-wide', { timeout: 15000 }).catch(() => {});
  check('موبايل: زرار «الباقات والأسعار» المميز في حسابي + مفيش تمرير أفقي', await m.evaluate(() => !!document.querySelector('.pk-cta-wide') && document.documentElement.scrollWidth - window.innerWidth <= 1));
  check('بدون أخطاء JavaScript', ![n, c, a, m].some(p => p.__errors.length), [n, c, a, m].map(p => p.__errors[0]).filter(Boolean)[0]);
  q(`DELETE FROM users WHERE username='${NEW.email}'`); q("UPDATE subscription_plans SET perks = NULL");
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
