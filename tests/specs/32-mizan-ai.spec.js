// الإصدار 122: «ميزان GRIFFINE AI» — مخطِّط توزيع الاستثمار (3 أوضاع) بقطاعات البورصة الحقيقية (محرك بصيرة)
//   قبل كشاف الأسهم في القائمة + الشركات المرشحة بتفتح في بصيرة + «ابدأ خطة» + رأي الذكاء الاصطناعي
//   + حفظ / مشاركة / حذف (سلة المحذوفات) + لوحة التحكم + الإخفاء
const { check, summary, launch, page, loginAdmin, q, BASE } = require('../lib');
(async () => {
  q("DELETE FROM login_attempts");
  q("DELETE FROM site_config WHERE config_key IN ('basira_cfg','basira_ai_key','mizanai_cfg')");
  q("DELETE FROM mizan_studies");
  const b = await launch(); const a = await page(b, { width: 1366, height: 900 }); await loginAdmin(a);
  await a.evaluate(() => renderHome()); await a.waitForTimeout(1500);
  const ks = await a.evaluate(() => [...document.querySelectorAll('.gs-sidebar > .gs-side-item')].filter(x => x.offsetParent !== null).map(x => ({ k: x.getAttribute('data-gs-key'), top: x.getBoundingClientRect().top })).sort((x, y) => x.top - y.top).map(x => x.k));
  check('القائمة: «ميزان GRIFFINE AI» قبل كشاف الأسهم على طول', ks.indexOf('mizanai') >= 0 && ks.indexOf('mizanai') + 1 === ks.indexOf('screener'), ks.join(','));
  await a.click('.gs-sidebar [data-gs-key="mizanai"]');
  await a.waitForFunction(() => document.querySelectorAll('#mzaSEx button').length >= 3, null, { timeout: 90000 }).catch(() => {});
  const f = await a.evaluate(() => ({ modes: [...document.querySelectorAll('.mza-mode b')].map(x => x.textContent), ex: [...document.querySelectorAll('#mzaSEx button')].map(x => x.textContent), title: document.querySelector('.mza-screen .bs-brand h1').textContent }));
  check('الشاشة: «ميزان GRIFFINE AI» + الأوضاع التلاتة', /ميزان/.test(f.title) && f.modes.join('|') === 'توزيع على قطاعات الأسهم|توزيع شامل للأصول|فحص توزيعتي الحالية', f.modes.join('|'));
  check('القطاعات من البورصة الحقيقية (محرك بصيرة) بالعربي', f.ex.includes('المالية والبنوك') && f.ex.length >= 3, f.ex.join(' | '));

  // 1) قطاعات الأسهم (من غير مفتاح ← رأي بالقواعد)
  await a.click('#mzaSEx button:has-text("تجارة التجزئة")');
  await a.fill('#mzaSAmt', '100000'); await a.click('#mzaSGo');
  await a.waitForSelector('.mza-sectors', { timeout: 60000 }).catch(() => {});
  const s1 = await a.evaluate(() => { const rows = [...document.querySelectorAll('#mzaOut .mza-table tbody tr')].map(r => ({ n: r.cells[0].textContent.trim(), p: parseFloat(r.cells[1].textContent.replace(/[^\d.]/g, '')), amt: r.cells[2].textContent.trim() }));
    return { rows, sum: rows.reduce((x, r) => x + r.p, 0), cos: [...document.querySelectorAll('.mza-co-open')].map(x => x.dataset.s), plans: [...document.querySelectorAll('.mza-plan')].map(x => x.textContent.trim()), ai: document.querySelector('#mzaAiWrap .bs-chip').textContent, kpis: [...document.querySelectorAll('#mzaOut .mz-kpi span')].map(x => x.textContent) }; });
  check('توزيع المبلغ على القطاعات = 100% + القطاع المستثنى (تجارة التجزئة) مش موجود', s1.rows.length >= 2 && Math.abs(s1.sum - 100) < 0.2 && !s1.rows.some(r => r.n === 'تجارة التجزئة'), JSON.stringify(s1.rows));
  check('الشركات المرشحة في كل قطاع + زرار «ابدأ خطة DCA / Grid»', s1.cos.length >= 2 && s1.plans.length === s1.cos.length && s1.plans.every(x => /ابدأ خطة (DCA|Grid)/.test(x)), JSON.stringify({ cos: s1.cos, plans: s1.plans }));
  check('من غير مفتاح الذكاء الاصطناعي ← «الرأي الآلي» (قواعد) + المؤشرات', /قواعد/.test(s1.ai) && s1.kpis.some(k => /العائد التقديري/.test(k)), s1.ai);
  // حفظ + مشاركة
  await a.click('#mzaSave'); await a.waitForTimeout(1500);
  const sv = await a.evaluate(() => [...document.querySelectorAll('#mzaSaved .mza-sv b')].map(x => x.textContent));
  check('حفظ الدراسة ← ظاهرة في «دراساتي المحفوظة»', sv.length === 1 && /توزيع 100,000 على/.test(sv[0]), sv.join(' | '));
  const share = await a.evaluate(async () => { const l = await apiGet('/mizanai_api.php?action=list'); return apiPost('/mizanai_api.php', { action: 'share', id: l.items[0].id }); });
  check('رابط مشاركة للقراءة', share.success && /index\.php\?mizan=[a-f0-9]{32}/.test(share.url), share.url);
  const anon = await (await b.newContext()).newPage(); await anon.goto(BASE + '/' + share.url); await anon.waitForSelector('.mza-sectors', { timeout: 30000 }).catch(() => {});
  check('الرابط المتشارك بيفتح الدراسة من غير تسجيل دخول (من غير أزرار الحفظ والخطط)', await anon.evaluate(() => !!document.querySelector('.mza-sectors') && !document.getElementById('mzaSave') && !document.querySelector('.mza-plan')));
  // «ابدأ خطة» ← نموذج الخطة بالسهم ورأس المال
  const plan = await a.evaluate(() => { const b0 = document.querySelector('.mza-plan[data-t="DCA"]') || document.querySelector('.mza-plan'); return { s: b0.dataset.s, t: b0.dataset.t, a: b0.dataset.a }; });
  await a.click(`.mza-plan[data-s="${plan.s}"]`); await a.waitForTimeout(1500);
  const pf = await a.evaluate((t) => t === 'Grid' ? { s: document.getElementById('g_symbol').value, c: document.getElementById('g_capital').value } : { s: document.getElementById('symbol').value, c: document.getElementById('capital').value }, plan.t);
  check('«ابدأ خطة» بيفتح نموذج الخطة بالسهم ورأس المال المقترح', pf.s === plan.s && +pf.c === +plan.a, JSON.stringify({ plan, pf }));
  // الشركة المرشحة ← بصيرة
  await a.evaluate(() => renderMizanAi()); await a.waitForFunction(() => document.querySelectorAll('#mzaSEx button').length >= 3, null, { timeout: 60000 });
  await a.click('#mzaSGo'); await a.waitForSelector('.mza-co-open', { timeout: 60000 });
  const co = await a.evaluate(() => document.querySelector('.mza-co-open').dataset.s);
  await a.click('.mza-co-open'); await a.waitForSelector('.bs-hero', { timeout: 40000 }).catch(() => {});
  check('الضغط على الشركة المرشحة ← تحليلها الكامل في بصيرة', await a.evaluate((s) => (document.getElementById('bsSym') || {}).value === s && !!document.querySelector('.bs-hero'), co), co);

  // 2) الأصول (مبلغ شهري) + 3) الفحص — بالمفتاح ← رأي الذكاء الاصطناعي
  await a.evaluate(async () => apiPost('/basira_api.php', { action: 'admin_save', config: JSON.stringify({ cache_min: 30 + Math.floor(Math.random() * 900) }), ai_key: 'sk-test-key-0000000000000000000' }));
  await a.evaluate(() => renderMizanAi()); await a.waitForSelector('.mza-mode[data-m="assets"]');
  await a.click('.mza-mode[data-m="assets"]'); await a.click('#mzaAType button[data-v="monthly"]'); await a.fill('#mzaAMon', '5000'); await a.selectOption('#mzaAHz', '36');
  await a.click('#mzaAGo'); await a.waitForSelector('.mza-grow', { timeout: 20000 }).catch(() => {});
  await a.waitForFunction(() => /AI/.test((document.querySelector('#mzaAiWrap .bs-chip') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
  const as = await a.evaluate(() => ({ rows: [...document.querySelectorAll('#mzaOut .mza-table tbody tr')].map(r => r.cells[0].textContent.trim()), path: document.querySelectorAll('.mza-grow path').length, kpi: [...document.querySelectorAll('#mzaOut .mz-kpi b')].map(x => x.textContent), ai: document.querySelector('#mzaAiWrap p').textContent, chip: document.querySelector('#mzaAiWrap .bs-chip').textContent }));
  check('توزيع الأصول (مبلغ شهري 5000 × 36 شهر) + منحنى النمو (أساسي / متفائل / متشائم)', as.rows.length >= 5 && as.path >= 4 && as.kpi[0] === '180,000', JSON.stringify(as.kpi));
  check('بالمفتاح ← رأي الذكاء الاصطناعي', /AI/.test(as.chip) && /رأي تجريبي من الذكاء الاصطناعي على دراسة ميزان/.test(as.ai), as.chip + ' / ' + as.ai.slice(0, 60));
  await a.click('.mza-mode[data-m="check"]'); await a.waitForFunction(() => document.querySelectorAll('#mzaCRows .mza-row').length >= 3, null, { timeout: 30000 });
  await a.click('#mzaCGo'); await a.waitForSelector('#mzaOut .mz-gauge', { timeout: 20000 }).catch(() => {});
  const ck = await a.evaluate(() => ({ g: !!document.querySelector('#mzaOut .mz-gauge'), al: document.querySelectorAll('#mzaOut .mz-al').length, rows: document.querySelectorAll('#mzaOut .mza-table tbody tr').length, cmp: document.querySelectorAll('.mza-cmprow').length }));
  check('فحص التوزيعة: درجة الخطورة + مراكز الخطورة + الحالي مقابل المقترح + خطوات إعادة التوزيع', ck.g && ck.al >= 1 && ck.rows >= 5 && ck.cmp >= 5, JSON.stringify(ck));

  // حذف ← سلة المحذوفات
  await a.evaluate(() => { window.gConfirm = async () => true; });
  await a.click('#mzaSaved [data-d]'); await a.waitForTimeout(1500);
  const tr = q("SELECT COUNT(*) FROM trash_bin WHERE item_type='mizan'");
  check('حذف الدراسة ← اتنقلت لسلة المحذوفات', +tr >= 1 && await a.evaluate(() => !document.querySelector('#mzaSaved .mza-sv')), tr);

  // لوحة التحكم + الإخفاء
  await a.evaluate(() => renderAdminHub()); await a.waitForTimeout(1500);
  check('زرار «ميزان GRIFFINE AI» في لوحة التحكم', await a.evaluate(() => !!document.getElementById('goMizanAiBtn')));
  await a.click('#goMizanAiBtn'); await a.waitForSelector('#mzaaSave', { timeout: 10000 }).catch(() => {});
  await a.fill('[data-rate="cds"]', '21.5'); await a.click('#mzaaSave'); await a.waitForTimeout(800);
  const cfg = await a.evaluate(async () => apiGet('/mizanai_api.php?action=config'));
  check('لوحة التحكم: تعديل العائد الافتراضي للشهادات ← 21.5%', cfg.success && cfg.config.rates.cds === 21.5, JSON.stringify(cfg.config && cfg.config.rates));
  await a.evaluate(() => renderAdminSettingsPage()); await a.waitForTimeout(1500);
  check('إعداد إخفاء «ميزان GRIFFINE AI» في شاشة الإخفاء', await a.evaluate(() => /إخفاء «ميزان GRIFFINE AI»/.test(document.getElementById('app').textContent)));

  // موبايل
  const m = await page(b, { width: 390, height: 844 }); await loginAdmin(m);
  await m.evaluate(() => renderMizanAi()); await m.waitForFunction(() => document.querySelectorAll('#mzaSEx button').length >= 3, null, { timeout: 60000 }).catch(() => {});
  await m.click('#mzaSGo'); await m.waitForSelector('.mza-sectors', { timeout: 30000 }).catch(() => {});
  const ov = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('الموبايل: مفيش تمرير أفقي', ov <= 1, ov);
  check('بدون أخطاء JavaScript', !a.__errors.length && !m.__errors.length, a.__errors[0] || m.__errors[0]);
  q("DELETE FROM site_config WHERE config_key IN ('basira_cfg','basira_ai_key','mizanai_cfg')");
  q("DELETE FROM mizan_studies"); q("DELETE FROM trash_bin WHERE item_type='mizan'");
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
