// الإصدار 130: «ميزان GRIFFINE AI» — العوائد السنوية لكل أصل أونلاين ومجانًا: تلقائي كل شهر / «حدّث الآن» (مرة في اليوم لكل سوق) / يدوي محفوظ على الحساب
// + النسبة اللي مش متاحة أونلاين بتتطلب يدوي + لوحة التحكم (الفروق عن سعر الفائدة / السجل / حدّث الآن)
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
const CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
(async () => {
  q("DELETE FROM login_attempts"); q("DELETE FROM mizan_user_rates"); q("DELETE FROM mizan_rates_log");
  q("REPLACE INTO site_config (config_key, config_value) VALUES ('mizanai_live', '')");
  q(`REPLACE INTO site_config (config_key, config_value) VALUES ('mizanai_rates_cfg', '{"markets":{"مصر":{"index":"^CASE30","url":"http://127.0.0.1:8098/cbe","kw":"Overnight Deposit","fb":""}}}')`);
  const b = await launch();
  const login = async (p) => p.evaluate(async ([e, pw]) => { await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); }, [CUST.email, CUST.pass]);
  const open = async (p) => { await p.evaluate(() => renderMizanAi()); await p.waitForSelector('.mza-mode[data-m="assets"]', { timeout: 20000 }); await p.click('.mza-mode[data-m="assets"]');
    await p.waitForFunction(() => /آخر تحديث|يدوي:/.test((document.getElementById('mzaRInfo') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {}); };
  const vals = (p) => p.evaluate(() => { const o = {}; document.querySelectorAll('#mzaRates [data-rate]').forEach(i => o[i.dataset.rate] = i.value); o.mode = (document.querySelector('#mzaRMode .on') || {}).dataset.v; o.info = mzaRInfo.textContent; return o; });

  // 1) أول فتح ← الأرقام بتتجاب أونلاين من مصادر مجانية
  const c = await page(b, { width: 1366, height: 900 }); await login(c); await open(c);
  const v1 = await vals(c);
  check('الأرقام اتجابت أونلاين: أسهم من المؤشر (20%) + صناديق أسهم ناقص المصاريف (18%) + الذهب بالجنيه (≈18.8%)', v1.stocks === '20' && v1.equity_funds === '18' && Math.abs(+v1.gold - 18.8) < 0.2, JSON.stringify(v1));
  check('الشهادات / التوفير / اليومي / النقدية / الدخل الثابت = سعر الفائدة من صفحة البنك المركزي (22%) ± الفروق', v1.cds === '19' && v1.savings === '16' && v1.daily_bank === '14' && v1.money_funds === '18' && v1.fixed_funds === '19', JSON.stringify(v1));
  const re = await c.evaluate(() => ({ miss: document.getElementById('mzaRf-realestate').classList.contains('mza-miss'), src: mzaRs_realestate = document.getElementById('mzaRs-realestate').textContent, src2: document.getElementById('mzaRs-stocks').textContent }));
  check('العقار مش متاح أونلاين ← خانته منوّرة ومكتوب «اكتبها يدوي» + مصدر كل رقم ظاهر تحته', re.miss && /اكتبها يدوي/.test(re.src) && /مؤشر البورصة/.test(re.src2) && v1.mode === 'auto' && /آخر تحديث/.test(v1.info), JSON.stringify(re));

  // 2) الدراسة مش بتتعمل غير لما النسبة الناقصة تتكتب
  await c.click('#mzaAGo'); await c.waitForTimeout(800);
  const blocked = await c.evaluate(() => ({ out: document.getElementById('mzaOut').textContent.trim().length, need: document.getElementById('mzaRf-realestate').classList.contains('mza-need') }));
  check('«وزّع واحسب النمو» بيطلب كتابة عائد العقار الأول (مش متاح في البحث)', blocked.out === 0 && blocked.need, JSON.stringify(blocked));
  await c.fill('#mzaR-realestate', '12'); await c.waitForTimeout(1200);
  const u1 = q(`SELECT CONCAT(mode, '|', rates) FROM mizan_user_rates WHERE account_email='${CUST.email}'`);
  check('كتابة النسبة الناقصة بس ← الوضع يفضل تلقائي والرقم اتحفظ على الحساب', /^auto\|\{"realestate":12\}$/.test(u1) && (await vals(c)).mode === 'auto', u1);
  await c.click('#mzaAGo'); await c.waitForSelector('#mzaOut .bs-card', { timeout: 20000 }).catch(() => {});
  check('بعد كتابتها الدراسة اتعملت بالعوائد الأونلاين', await c.evaluate(() => document.querySelectorAll('#mzaOut .bs-card').length > 0));

  // 3) تعديل رقم أونلاين ← يدوي ثابت ومحفوظ على الحساب (يظهر من أي جهاز)
  await c.fill('#mzaR-stocks', '25'); await c.waitForTimeout(1200);
  const u2 = q(`SELECT mode FROM mizan_user_rates WHERE account_email='${CUST.email}'`), v2 = await vals(c);
  check('تعديل رقم بيتحول للوضع اليدوي تلقائي (وكل الأرقام بتتحفظ ثابتة)', u2 === 'manual' && v2.mode === 'manual' && /يدوي/.test(v2.info), u2 + ' ' + v2.mode);
  const d = await page(b, { width: 390, height: 844 }); await login(d); await open(d);
  const v3 = await vals(d);
  check('جهاز تاني لنفس الحساب: نفس الأرقام اليدوية (أسهم 25%) والوضع يدوي — ومن غير تمرير أفقي', v3.stocks === '25' && v3.realestate === '12' && v3.mode === 'manual' && await d.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1), JSON.stringify(v3));

  // 4) «حدّث الآن» ← رجوع للأونلاين — والبحث الجديد مرة واحدة في اليوم لكل سوق
  const logs0 = +q("SELECT COUNT(*) FROM mizan_rates_log");
  await d.click('#mzaRNow'); await d.waitForTimeout(2500);
  const v4 = await vals(d);
  check('«حدّث الآن» ← الأرقام الأونلاين رجعت (أسهم 20%) والوضع تلقائي', v4.stocks === '20' && v4.mode === 'auto' && q(`SELECT mode FROM mizan_user_rates WHERE account_email='${CUST.email}'`) === 'auto', JSON.stringify(v4));
  check('نفس اليوم: «حدّث الآن» بياخد آخر أرقام اتجابت النهارده (من غير بحث جديد)', +q("SELECT COUNT(*) FROM mizan_rates_log") === logs0, logs0);

  // 5) التحديث التلقائي الشهري
  q(`UPDATE site_config SET config_value = JSON_SET(config_value, '$."مصر".at', UNIX_TIMESTAMP() - 31 * 86400) WHERE config_key = 'mizanai_live'`);
  const auto = await d.evaluate(async () => { const r = await apiGet('/mizanai_api.php?action=rates&market=' + encodeURIComponent('مصر')); return { fresh: r.live.fresh, at: r.live.at, next: r.live.next }; });
  check('بعد 30 يوم الأرقام بتتحدث أونلاين لوحدها (تلقائي كل شهر) + ميعاد التحديث الجاي', auto.fresh && +q("SELECT COUNT(*) FROM mizan_rates_log WHERE trigger_kind='auto'") >= 2 && !!auto.next, JSON.stringify(auto));

  // 6) لوحة التحكم
  const a = await page(b); await loginAdmin(a); await a.evaluate(() => { window.gConfirm = async () => true; });
  await a.evaluate(() => renderAdminMizanAi()); await a.waitForSelector('#mzrSave', { timeout: 20000 });
  const ad = await a.evaluate(() => ({ rows: document.querySelectorAll('.mzr-mk tr[data-m]').length, log: document.querySelectorAll('#mzaRatesAdm table:last-of-type tbody tr').length, t: document.getElementById('mzaRatesAdm').textContent }));
  check('لوحة التحكم: إعدادات التحديث + جدول الأسواق (المؤشر / صفحة البنك المركزي / فائدة احتياطية) + السجل', ad.rows >= 1 && ad.log >= 2 && /سعر الفائدة/.test(ad.t), JSON.stringify({ rows: ad.rows, log: ad.log }));
  await a.fill('#mzr_cds', '-2'); await a.fill('#mzr_re', '14'); await a.click('#mzrSave'); await a.waitForTimeout(600);
  await a.click('[data-now="مصر"]'); await a.waitForTimeout(2500);
  const live = await a.evaluate(async () => (await apiGet('/mizanai_api.php?action=rates&market=' + encodeURIComponent('مصر'))).live);
  check('الأدمن غيّر فرق الشهادات وتقدير العقار + «حدّث الآن» ← الشهادات 20% والعقار 14% (والسجل اتحدث)', live.rates.cds === 20 && live.rates.realestate === 14 && !live.missing.length && q("SELECT trigger_kind FROM mizan_rates_log ORDER BY id DESC LIMIT 1") === 'admin', JSON.stringify(live.rates));
  q(`UPDATE site_config SET config_value = '{"markets":{"مصر":{"index":"^CASE30","url":"http://127.0.0.1:8098/nothing","kw":"Overnight Deposit","fb":"21"}}}' WHERE config_key = 'mizanai_rates_cfg'`);
  await a.evaluate(async () => apiPost('/mizanai_api.php', { action: 'admin_rates_now', market: 'مصر' }));
  const fb = await a.evaluate(async () => (await apiGet('/mizanai_api.php?action=rates&market=' + encodeURIComponent('مصر'))).live);
  check('صفحة البنك المركزي ماتفتحتش ← سعر الفائدة الاحتياطي من لوحة التحكم (21% ← شهادات 18%)', fb.rates.cds === 18 && /لوحة التحكم/.test(fb.src.cds), JSON.stringify({ cds: fb.rates.cds, src: fb.src.cds }));

  check('بدون أخطاء JavaScript', !c.__errors.length && !d.__errors.length && !a.__errors.length, c.__errors[0] || d.__errors[0] || a.__errors[0]);
  q("REPLACE INTO site_config (config_key, config_value) VALUES ('mizanai_rates_cfg', '')"); q("DELETE FROM mizan_user_rates");
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
