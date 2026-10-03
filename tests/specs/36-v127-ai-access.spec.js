// الإصدار 127: الذكاء الاصطناعي — مجاني 100% افتراضيًا (حتى لو فيه مفتاح) + زرار تفعيل / إيقاف المدفوع + حساب Claude
//   + لكل مشترك: الشاشات التلاتة (تشغيل / إيقاف) + المدفوع (حسب الباقة / مفتوح / مقفول) + الحد اليومي (للمدفوع بس — بعده مجاني)
//   + باقة «برو سنوي» 3000 شاملة الـ AI + المشترك مبيشوفش أي رسالة حدود
const { check, summary, launch, page, loginAdmin, q, ADMIN, BASE } = require('../lib');
const CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
const http = (u) => fetch(u).then(r => r.json()).catch(() => ({}));
const aiN = async () => ((await http('http://127.0.0.1:8098/ai-last')).n || 0);
(async () => {
  q("DELETE FROM login_attempts");
  q("DELETE FROM site_config WHERE config_key IN ('ai_paid_on','ai_account_email','basira_ai_key','basira_cfg')");
  q(`REPLACE INTO site_config (config_key, config_value) VALUES ('basira_ai_key', 'sk-test-key-0000000000000000000'), ('basira_cfg', '{"cache_min": ${300 + Math.floor(Math.random() * 900)}}')`);
  q(`DELETE FROM user_ai_access WHERE account_email IN ('${ADMIN}','${CUST.email}')`);
  const subPlan = q(`SELECT plan_id FROM subscribers WHERE account_email='${CUST.email}' ORDER BY id DESC LIMIT 1`).trim() || 'monthly';
  const b = await launch(); const a = await page(b); await loginAdmin(a);
  const an = (p, s) => p.evaluate(async (sym) => { const r = await apiGet('/basira_api.php?action=analyze&market=' + encodeURIComponent('مصر') + '&symbol=' + sym); return { ok: r.success, src: r.report && r.report.ai && r.report.ai.source, err: r.report && r.report.ai && r.report.ai.aiError || '', mv: r.report && r.report.ai && r.report.ai.market_view || '', msg: r.message || '' }; }, s);
  const ready = (p) => p.evaluate(async () => (await apiGet('/basira_api.php?action=config')).config.aiReady);

  // 1) الافتراضي: مجاني 100% حتى مع وجود مفتاح
  let n0 = await aiN();
  const r1 = await an(a, 'COMI');
  check('الافتراضي: المدفوع مقفول ← التحليل بالمحرك المجاني ومفيش أي طلب AI بيطلع (حتى مع وجود مفتاح)', r1.ok && r1.src !== 'ai' && (await aiN()) === n0 && !(await ready(a)), JSON.stringify(r1).slice(0, 160));
  check('المحرك المجاني أقوى: مستويات دخول / وقف خسارة / أهداف + نوع الخطة المناسبة', /منطقة دخول/.test(r1.mv) && /وقف خسارة/.test(r1.mv) && /(DCA|Grid)/.test(r1.mv), r1.mv.slice(0, 120));

  // 2) شاشة «الذكاء الاصطناعي» في لوحة التحكم
  await a.evaluate(() => renderAdminHub()); await a.waitForTimeout(1200);
  check('زرار «الذكاء الاصطناعي» في لوحة التحكم', await a.evaluate(() => !!document.getElementById('goAiBtn')));
  await a.click('#goAiBtn'); await a.waitForSelector('#aiToggle', { timeout: 10000 });
  const s1 = await a.evaluate(() => ({ t: document.querySelector('.ai-state').textContent, acc: document.getElementById('aiAccount').value, key: document.getElementById('app').textContent.includes('متسجّل ✓'), pay: /console\.anthropic\.com/.test(document.getElementById('app').textContent) }));
  check('الشاشة: «الوضع المجاني 100%: شغّال» + حساب Top72026@gmail.com جاهز + المفتاح متسجّل + شرح الدفع', /المجاني 100%/.test(s1.t) && s1.acc.toLowerCase() === 'top72026@gmail.com' && s1.key && s1.pay, JSON.stringify(s1).slice(0, 160));
  await a.evaluate(() => { window.gConfirm = async () => true; });
  await a.click('#aiToggle'); await a.waitForFunction(() => /مفعّل/.test((document.querySelector('.ai-state') || {}).textContent || ''), null, { timeout: 10000 }).catch(() => {});
  check('«▶ تفعيل المدفوع» ← الحالة «مفعّل»', q("SELECT config_value FROM site_config WHERE config_key='ai_paid_on'").trim() === '1' && await a.evaluate(() => /مفعّل/.test(document.querySelector('.ai-state').textContent)));

  // 3) الأدمن بياخد المدفوع
  n0 = await aiN();
  const r2 = await an(a, 'HRHO');
  check('المدفوع مفعّل: الأدمن بياخد رأي الذكاء الاصطناعي', r2.src === 'ai' && (await aiN()) === n0 + 1 && await ready(a), JSON.stringify(r2).slice(0, 120));

  // 4) مشترك عادي (مش برو) ← مجاني + من غير رسائل
  const c = await page(b); await c.evaluate(async ([e, pw]) => { window.alert = () => {}; await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); }, [CUST.email, CUST.pass]);
  n0 = await aiN();
  const r3 = await an(c, 'TMGH');
  check('مشترك شهري (مش برو): بيكمّل بالمحرك المجاني من غير أي رسالة', r3.ok && r3.src !== 'ai' && !r3.err && (await aiN()) === n0 && !(await ready(c)), JSON.stringify(r3).slice(0, 120));

  // 5) خانات المشترك في جدول المشتركين
  await a.evaluate(() => renderAdminSubscribers()); await a.waitForSelector(`.g-ai[data-ai-email="${CUST.email}"]`, { timeout: 20000 }).catch(() => {});
  const cell = await a.evaluate((e) => { const x = document.querySelector(`.g-ai[data-ai-email="${e}"]`); return x ? { cbs: [...x.querySelectorAll('input[type=checkbox]')].map(i => i.dataset.ai + ':' + i.checked), paid: x.querySelector('[data-ai="paid"]').value, lim: x.querySelector('[data-ai="daily_limit"]').value, txt: x.textContent } : null; }, CUST.email);
  // الإصدار 138: فتح / قفل بصيرة والميزانين لكل مشترك اتنقل لعمود «⭐ المميزات» — العمود ده فيه المدفوع والحد اليومي بس
  check('جدول المشتركين: المدفوع «حسب الباقة» + الحد اليومي «مفتوح» (والشاشات في عمود المميزات)', cell && cell.cbs.length === 0 && cell.paid === '' && cell.lim === '' && /مش برو/.test(cell.txt), JSON.stringify(cell).slice(0, 200));
  await a.selectOption(`.g-ai[data-ai-email="${CUST.email}"] [data-ai="paid"]`, '1'); await a.waitForTimeout(700);
  await a.selectOption(`.g-ai[data-ai-email="${CUST.email}"] [data-ai="daily_limit"]`, '5'); await a.waitForTimeout(700);
  check('فتح المدفوع للمشترك + الحد اليومي 5 من الخانات ← اتحفظ', q(`SELECT CONCAT(paid, '/', daily_limit) FROM user_ai_access WHERE account_email='${CUST.email}'`).trim() === '1/5');
  q(`UPDATE user_ai_access SET daily_limit = 1 WHERE account_email='${CUST.email}'`);
  n0 = await aiN();
  const r4 = await an(c, 'CRVX');
  check('المدفوع مفتوح للمشترك ← رأي الذكاء الاصطناعي + العدّاد = 1', r4.src === 'ai' && (await aiN()) === n0 + 1 && q(`SELECT used_count FROM user_ai_access WHERE account_email='${CUST.email}'`).trim() === '1', JSON.stringify(r4).slice(0, 100));
  n0 = await aiN();
  const r5 = await an(c, 'DROPX');
  check('الحد اليومي (1) خلص ← بيكمّل بالمجاني تلقائي من غير رسالة ولا طلب مدفوع', r5.ok && r5.src !== 'ai' && !r5.err && (await aiN()) === n0 && !(await ready(c)), JSON.stringify(r5).slice(0, 100));

  // 6) الباقة الشاملة للـ AI (برو)
  const pro = q("SELECT CONCAT(amount, '/', includes_ai, '/', duration_days) FROM subscription_plans WHERE id='pro_yearly'").trim();
  check('باقة «برو سنوي» 3000 شاملة الذكاء الاصطناعي موجودة', pro === '3000.00/1/365', pro);
  q(`UPDATE user_ai_access SET paid = NULL, daily_limit = NULL WHERE account_email='${CUST.email}'`);
  check('«حسب الباقة» + اشتراك شهري ← مجاني', !(await ready(c)));
  q(`UPDATE subscribers SET plan_id='pro_yearly' WHERE account_email='${CUST.email}' AND active=1`);
  check('«حسب الباقة» + اشتراك برو ← المدفوع شغال له تلقائي', await ready(c));
  q(`UPDATE subscribers SET plan_id='${subPlan}' WHERE account_email='${CUST.email}' AND plan_id='pro_yearly'`);

  // 7) قفل شاشة لمشترك بعينه
  await a.evaluate((e) => apiPost('/ai_access_api.php', { action: 'admin_set', email: e, field: 'basira', value: '0' }), CUST.email);
  const h1 = await c.evaluate(async () => ({ api: await apiGet('/basira_api.php?action=config'), st: (await apiGet('/admin_settings_get.php')).settings.hide_basira_screen }));
  check('قفل «بصيرة» لمشترك ← الشاشة بتختفي عنده والـ API بيرفض (والباقي شغال)', h1.api.success === false && h1.api.hidden === true && h1.st === true, JSON.stringify(h1.api).slice(0, 100));
  const h2 = await c.evaluate(async () => (await apiGet('/mizanai_api.php?action=config')).success);
  check('ميزان GRIFFINE لسه مفتوح لنفس المشترك', h2 === true);
  await a.evaluate((e) => apiPost('/ai_access_api.php', { action: 'admin_set', email: e, field: 'basira', value: '1' }), CUST.email);

  // 8) إيقاف المدفوع ← رجوع للمجاني للكل
  await a.evaluate(() => renderAdminAi()); await a.waitForSelector('#aiToggle'); await a.click('#aiToggle');
  await a.waitForFunction(() => /المجاني 100%/.test((document.querySelector('.ai-state') || {}).textContent || ''), null, { timeout: 10000 }).catch(() => {});
  check('«⏹ إيقاف المدفوع» ← الأدمن كمان رجع للمجاني', !(await ready(a)) && q("SELECT COALESCE(MAX(config_value), '') FROM site_config WHERE config_key='ai_paid_on'").trim() !== '1');
  check('المفتاح مبيوصلش للمتصفح', await a.evaluate(async () => !JSON.stringify(await apiGet('/ai_access_api.php?action=cfg')).includes('sk-test')));
  check('بدون أخطاء JavaScript', !a.__errors.length && !c.__errors.length, a.__errors[0] || c.__errors[0]);
  q("DELETE FROM site_config WHERE config_key IN ('ai_paid_on','ai_account_email','basira_ai_key','basira_cfg')");
  q(`DELETE FROM user_ai_access WHERE account_email IN ('${ADMIN}','${CUST.email}')`);
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
