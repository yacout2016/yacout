// الإصدار 114: «بصيرة GRIFFINE AI» — تحليل آلي شامل لأي سهم (مؤشرات + تقاطعات + توقع لكل فترة + أخبار + ذكاء اصطناعي)
//   + حفظ / PDF / مشاركة / حذف (سلة) + خطة DCA/Grid + أسماء عربية عند الوقوف + لوحة التحكم + الإخفاء
const { check, summary, launch, page, loginAdmin, q, BASE, ADMIN } = require('../lib');
const CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
const http = (u) => fetch(u).then(r => r.json()).catch(() => ({}));
(async () => {
  q("DELETE FROM login_attempts");
  q("DELETE FROM site_config WHERE config_key IN ('basira_cfg','basira_ai_key')");
  q("REPLACE INTO site_config (config_key, config_value) VALUES ('ai_paid_on', '1')");   // الإصدار 127: المدفوع مقفول افتراضيًا ← الاختبارات اللي بتستخدم المفتاح بتفعّله
  q(`DELETE FROM basira_reports WHERE account_email IN ('${ADMIN}','${CUST.email}')`);
  q("DELETE FROM admin_settings WHERE setting_key='hide_basira_screen'");
  await fetch('http://127.0.0.1:8098/set?sym=COMI&price=80').catch(() => {});
  const b = await launch(); const a = await page(b, { width: 1366, height: 900 }); await loginAdmin(a);
  await a.evaluate(async () => { await apiPost('/markets_api.php', { action: 'watch_add', symbol: 'COMI', market: 'مصر' }); });

  // 1) الشاشة + الاقتراحات بالاسم العربي
  await a.evaluate(() => renderBasira()); await a.waitForTimeout(1800);
  const s0 = await a.evaluate(() => ({ disc: /مش نصيحة استثمارية/.test(document.querySelector('.bs-disc').textContent), mk: document.getElementById('bsMkt').value, badge: document.querySelector('.bs-top .bs-chip').textContent }));
  check('الشاشة بتفتح بالتنويه (مش نصيحة استثمارية) واختيار البورصة', s0.disc && s0.mk === 'مصر', JSON.stringify(s0));
  check('من غير مفتاح: «محرك تحليل آلي»', /محرك تحليل آلي/.test(s0.badge), s0.badge);
  await a.click('#bsSym'); await a.fill('#bsSym', 'التجاري'); await a.waitForTimeout(300);
  const sug = await a.evaluate(() => [...document.querySelectorAll('#bsSug [data-s]')].map(x => x.dataset.s + '|' + x.title));
  check('البحث بالاسم العربي بيقترح السهم (COMI — البنك التجاري الدولي)', sug.some(x => /^COMI\|COMI — البنك التجاري الدولي/.test(x)), sug.slice(0, 3).join(' ; '));
  await a.waitForFunction(() => document.querySelector('#bsWl [data-s]'), null, { timeout: 15000 }).catch(() => {});
  const wl = await a.evaluate(() => { const c = document.querySelector('#bsWl [data-s="COMI"]'); return c ? c.title : ''; });
  check('قائمة المتابعة: السهم ظاهر بالدرجة والاسم العربي عند الوقوف', /البنك التجاري الدولي/.test(wl) && /\/100/.test(wl), wl);

  // 2) التحليل
  await a.evaluate(() => { document.getElementById('bsSug').hidden = true; });
  await a.fill('#bsSym', 'COMI'); await a.click('#bsGo');
  await a.waitForSelector('.bs-hero', { timeout: 40000 }).catch(() => {});
  const R = await a.evaluate(() => ({
    sym: (document.querySelector('.bs-sym h3') || {}).textContent, title: (document.querySelector('.bs-sym h3') || {}).title, inputTitle: document.getElementById('bsSym').title,
    hz: [...document.querySelectorAll('.bs-hzc h5')].map(x => x.textContent.trim()), hzV: [...document.querySelectorAll('.bs-hzv')].map(x => x.textContent.trim()),
    inds: document.querySelectorAll('.bs-ind tbody tr').length, main: (document.getElementById('bsMain').innerHTML.match(/<path/g) || []).length, rsi: document.getElementById('bsRsi').innerHTML.length > 50, macd: (document.getElementById('bsMacd').innerHTML.match(/<rect/g) || []).length,
    lv: document.querySelectorAll('.bs-lv div').length, verdict: (document.querySelector('.bs-verdict h4') || {}).textContent, ai: document.querySelector('.bs-ai p').textContent.length,
    scen: document.querySelectorAll('.bs-scen > div').length, news: [...document.querySelectorAll('.bs-nw')].map(x => [x.getAttribute('href'), x.target, x.rel]),
    src: [...document.querySelectorAll('.bs-sec')].map(x => x.textContent).join('|') }));
  check('تقرير السهم COMI (بالاسم العربي عند الوقوف)', R.sym === 'COMI' && /البنك التجاري الدولي/.test(R.title) && /البنك التجاري الدولي/.test(R.inputTitle), JSON.stringify({ t: R.title, i: R.inputTitle }));
  check('التوقع لـ 6 فترات: يوم / أسبوع / شهر / 3 شهور / 6 شهور / سنة (شراء أو بيع أو تعادل) — الإصدار 139', R.hz.join(',') === 'خلال يوم,خلال أسبوع,خلال شهر,خلال 3 شهور,خلال 6 شهور,خلال سنة' && R.hzV.every(v => /^(شراء|بيع|تعادل)$/.test(v)), R.hz.join(',') + ' / ' + R.hzV.join(','));
  check('12 مؤشر فني في الجدول', R.inds === 12, R.inds);
  check('الرسم البياني (سعر + متوسطات) + RSI + MACD', R.main >= 4 && R.rsi && R.macd > 20, JSON.stringify({ m: R.main, macd: R.macd }));
  check('الاتجاه العام + الدعم والمقاومة (5 مستويات) + الرأي + 3 سيناريوهات', /صاعد|هابط|محايد/.test(R.verdict) && R.lv >= 5 && R.ai > 40 && R.scen === 3, JSON.stringify({ v: R.verdict, lv: R.lv, ai: R.ai }));
  check('الأخبار: كل خبر بيفتح مصدره في تبويب جديد', R.news.length >= 3 && R.news.every(([h, t, rel]) => /^https:\/\/example\.com\//.test(h) && t === '_blank' && /noopener/.test(rel)), JSON.stringify(R.news[0]));
  check('الرأي بالمحرك المجاني (محرك GRIFFINE) لما مفيش مفتاح', /محرك GRIFFINE/.test(R.src));
  // تفاعل الرسم: الفترة + المؤشرات
  const p1 = await a.evaluate(() => document.getElementById('bsMain').innerHTML.length);
  await a.selectOption('#bsRng', '22'); await a.click('#bsLegend input[data-k="bb"]'); await a.waitForTimeout(200);
  check('تغيير فترة الرسم وإظهار بولينجر بيعيد الرسم', await a.evaluate((p1) => document.getElementById('bsMain').innerHTML.length !== p1 && /stroke-dasharray="4 4"/.test(document.getElementById('bsMain').innerHTML), p1));
  // الإصدار 142: مدة الرسم قائمة منسدلة فيها يوم وأسبوع — «يوم» = أسعار اليوم كل 5 دقايق
  const ro = await a.evaluate(() => [...document.querySelectorAll('#bsRng option')].map(o => o.textContent).join(','));
  check('مدة الرسم قائمة منسدلة: يوم / أسبوع / شهر / 3 شهور / 6 شهور / سنة', ro === 'يوم,أسبوع,شهر,3 شهور,6 شهور,سنة', ro);
  await a.selectOption('#bsRng', 'd'); await a.waitForTimeout(1200);
  check('«يوم» بيرسم أسعار اليوم (من غير تقاطعات الأيام)', await a.evaluate(() => /<path/.test(document.getElementById('bsMain').innerHTML) && !/<ellipse/.test(document.getElementById('bsMain').innerHTML)));
  await a.selectOption('#bsRng', '5'); await a.waitForTimeout(300);
  check('«أسبوع» بيرسم آخر 5 جلسات', await a.evaluate(() => /<path/.test(document.getElementById('bsMain').innerHTML)));
  await a.click('#bsNtabs [data-f="market"]'); await a.waitForTimeout(100);
  check('تبويب أخبار السوق', await a.evaluate(() => [...document.querySelectorAll('#bsNews .bs-nw small')].every(x => /السوق والقطاع/.test(x.textContent))));

  check('عنوان الشريط العلوي = اسم الشاشة', /بصيرة AI — تحليل الأسهم/.test(await a.textContent('#gsTitle').catch(() => '')));
  await a.setViewportSize({ width: 390, height: 860 }); await a.waitForTimeout(400);
  check('الموبايل: مفيش تمرير بالعرض للصفحة', await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await a.setViewportSize({ width: 1366, height: 900 }); await a.waitForTimeout(300);
  // 3) PDF
  const pdf = await a.evaluate(() => { let html = ''; const ow = window.open; window.open = () => ({ document: { write: (h) => { html += h; }, close(){}, createElement: () => ({ setAttribute(){}, appendChild(){} }), head: { appendChild(){} }, body: { insertBefore(){}, firstChild: null } }, focus(){}, print(){} });
    document.getElementById('bsPdf').click(); window.open = ow; return { h: /تحليل سهم COMI/.test(html), svg: (html.match(/<svg/g) || []).length, disc: /مش نصيحة استثمارية/.test(html), hz: /خلال|أسبوع/.test(html) }; });
  check('تقرير PDF (العنوان + الرسوم + التنويه + الفترات)', pdf.h && pdf.svg >= 4 && pdf.disc && pdf.hz, JSON.stringify(pdf));

  // 4) حفظ + مشاركة + فتح + حذف (سلة)
  await a.click('#bsSave'); await a.waitForTimeout(1500);
  const saved = +q(`SELECT COUNT(*) FROM basira_reports WHERE account_email='${ADMIN}' AND symbol='COMI'`);
  check('حفظ التحليل', saved === 1 && await a.evaluate(() => document.querySelectorAll('#bsSaved .bs-sv').length === 1), saved);
  const share = await a.evaluate(async () => { let url = ''; const oc = navigator.clipboard; Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { url = t; } }, configurable: true }); } catch(e){}
    document.getElementById('bsShare').click(); await new Promise(r => setTimeout(r, 1500)); return url; });
  check('المشاركة برابط', /index\.php\?basira=[a-f0-9]{32}$/.test(share), share);
  const g = await page(b, { width: 1200, height: 900 });
  await g.goto(share); await g.waitForSelector('.bs-hero', { timeout: 15000 }).catch(() => {});
  const gs = await g.evaluate(() => ({ hero: !!document.querySelector('.bs-hero'), acts: !!document.getElementById('bsSave'), sym: (document.querySelector('.bs-sym h3') || {}).textContent, pdf: !!document.getElementById('bsPdf2'), url: location.search }));
  check('رابط المشاركة بيفتح التحليل للقراءة بس (من غير تسجيل دخول)', gs.hero && !gs.acts && gs.sym === 'COMI' && gs.pdf && gs.url === '', JSON.stringify(gs));
  await a.evaluate(() => { window.gConfirm = async () => true; document.querySelector('#bsSaved [data-del]').click(); }); await a.waitForTimeout(1500);
  const tr = q(`SELECT COUNT(*) FROM trash_bin WHERE item_type='basira' AND deleted_by='${ADMIN}' AND restored_at IS NULL`);
  check('حذف التحليل ← سلة المحذوفات', +q(`SELECT COUNT(*) FROM basira_reports WHERE account_email='${ADMIN}'`) === 0 && +tr >= 1, tr);
  const tid = q(`SELECT id FROM trash_bin WHERE item_type='basira' AND deleted_by='${ADMIN}' ORDER BY id DESC LIMIT 1`);
  const rs = await a.evaluate(async (id) => apiPost('/trash_api.php', { action: 'restore', id }), tid);
  check('الاسترجاع من السلة بيرجّع التحليل', rs && rs.success && +q(`SELECT COUNT(*) FROM basira_reports WHERE account_email='${ADMIN}'`) === 1, JSON.stringify(rs));
  check('الرابط المتشارك بيفضل شغال بعد الاسترجاع', (await http(BASE + '/basira_api.php?action=shared&t=' + share.split('=')[1])).success === true);

  // 5) فتح خطة DCA / Grid للسهم
  await a.evaluate(() => renderBasira('COMI', 'مصر')); await a.waitForSelector('#bsDca', { timeout: 30000 });
  await a.click('#bsDca'); await a.waitForTimeout(1500);
  check('زرار «خطة DCA» بيفتح خطة جديدة للسهم', await a.evaluate(() => (document.getElementById('symbol') || {}).value === 'COMI'));
  await a.evaluate(() => renderBasira('COMI', 'مصر')); await a.waitForSelector('#bsGrid', { timeout: 30000 });
  await a.click('#bsGrid'); await a.waitForTimeout(1500);
  check('زرار «خطة Grid» بيفتح خطة شبكة للسهم', await a.evaluate(() => (document.getElementById('g_symbol') || {}).value === 'COMI'));

  // 6) لوحة التحكم «تحليلات بصيرة AI» + الذكاء الاصطناعي
  await a.evaluate(() => renderAdminHub()); await a.waitForTimeout(1500);
  check('زرار «تحليلات بصيرة AI» في لوحة التحكم', await a.evaluate(() => [...document.querySelectorAll('#app button, #app a')].some(x => /تحليلات بصيرة AI/.test(x.textContent))));
  await a.evaluate(() => renderAdminBasira()); await a.waitForTimeout(1500);
  await a.fill('#bsa_name', 'بصيرة برو'); await a.fill('#bsa_cache', String(30 + Math.floor(Math.random() * 900))); await a.fill('#bsa_key', 'sk-bad-key-000000000000000');
  await a.click('#bsaTest'); await a.waitForTimeout(2500);
  check('اختبار مفتاح غلط ← «مفتاح Claude API غير صحيح»', /غير صحيح/.test(await a.textContent('#bsaTestRes')), await a.textContent('#bsaTestRes'));
  await a.evaluate(() => renderAdminBasira()); await a.waitForTimeout(1200);
  await a.fill('#bsa_key', 'sk-test-key-0000000000000000000'); await a.click('#bsaTest'); await a.waitForTimeout(2500);
  check('اختبار مفتاح صحيح ← الاتصال شغال', /شغال/.test(await a.textContent('#bsaTestRes')), await a.textContent('#bsaTestRes'));
  const ag = await a.evaluate(async () => apiGet('/basira_api.php?action=admin_get'));
  check('المفتاح مبيرجعش للمتصفح (بس «متسجّل»)', ag.keySet === true && !JSON.stringify(ag).includes('sk-test-key') && ag.config.name === 'بصيرة برو', JSON.stringify({ keySet: ag.keySet, name: ag.config.name }));
  check('المفتاح مش في site_public_config', !(await http(BASE + '/site_public_config.php').then(x => JSON.stringify(x))).includes('sk-test'));
  await a.evaluate(() => renderBasira('COMI', 'مصر')); await a.waitForSelector('.bs-hero', { timeout: 40000 });
  const ai = await a.evaluate(() => ({ badge: document.querySelector('.bs-top .bs-chip').textContent, name: document.querySelector('.bs-brand h1').textContent, sec: [...document.querySelectorAll('.bs-sec')].map(x => x.textContent).join('|'), op: document.querySelector('.bs-ai p').textContent, week: document.querySelector('.bs-hzc .bs-pr .pos').textContent, note: (document.querySelector('.bs-hnote') || {}).textContent }));
  check('بعد المفتاح: الاسم الجديد + «مدعوم بالذكاء الاصطناعي» + رأي الذكاء الاصطناعي', /بصيرة برو/.test(ai.name) && /مدعوم بالذكاء الاصطناعي/.test(ai.badge) && /رأي الذكاء الاصطناعي/.test(ai.sec) && /رأي تجريبي من الذكاء الاصطناعي/.test(ai.op), JSON.stringify(ai));
  const last = await http('http://127.0.0.1:8098/ai-last');
  const body = last.body || {};
  check('طلب Claude: الموديل الافتراضي claude-opus-5-5 + JSON schema + fallbacks', body.model === 'claude-opus-5-5' && body.output_config && body.output_config.format && body.output_config.format.type === 'json_schema' && body.fallbacks === 'default' && body.output_config.effort === 'medium', JSON.stringify({ m: body.model, oc: body.output_config && Object.keys(body.output_config), f: body.fallbacks }));
  check('طلب Claude: الهيدرز (المفتاح + الإصدار + fallback beta)', last.headers && last.headers['x-api-key'] === 'sk-test-key-0000000000000000000' && last.headers['anthropic-version'] === '2023-06-01' && last.headers['anthropic-beta'] === 'server-side-fallback-2026-07-01', JSON.stringify(last.headers && { v: last.headers['anthropic-version'], b: last.headers['anthropic-beta'] }));
  check('طلب Claude فيه المؤشرات والأخبار (من غير بيانات المستخدم)', /indicators/.test(JSON.stringify(body.messages)) && /news/.test(JSON.stringify(body.messages)) && !JSON.stringify(body).includes(ADMIN));
  check('احتمال الأسبوع: الذكاء الاصطناعي بيعدّل بحد أقصى 15 نقطة (مش 99%)', /صعود (\d+)%/.test(ai.week) && +ai.week.match(/(\d+)/)[1] <= 85 && ai.note === 'زخم قصير', ai.week + ' / ' + ai.note);
  const n1 = last.n;
  await a.evaluate(() => renderBasira('COMI', 'مصر')); await a.waitForSelector('.bs-hero', { timeout: 40000 });
  check('التحليل بيتخزن مؤقتًا (مفيش طلب ذكاء اصطناعي تاني لنفس السهم)', (await http('http://127.0.0.1:8098/ai-last')).n === n1 && /مخزّن/.test(await a.textContent('.bs-at')));

  // 7) الإخفاء من قوائم الإخفاء + العميل
  await a.evaluate(() => renderAdminSettingsPage()); await a.waitForTimeout(1500);
  check('«إخفاء بصيرة AI» موجود في الإعدادات الإلزامية', await a.evaluate(() => /إخفاء «بصيرة AI — تحليل الأسهم» عن العملاء/.test(document.getElementById('app').textContent)));
  const c = await page(b, { width: 1366, height: 900 }); await c.goto(BASE + '/index.php'); await c.waitForTimeout(1000);
  await c.evaluate(async ([e, pw]) => { window.alert = () => {}; await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); }, [CUST.email, CUST.pass]);
  await c.evaluate(() => renderHome()); await c.waitForTimeout(1500);
  const nav1 = await c.evaluate(() => /بصيرة AI/.test(document.body.textContent));
  const api1 = await c.evaluate(async () => apiGet('/basira_api.php?action=config'));
  check('العميل (مشترك) بيشوف «بصيرة AI» في القائمة والشاشة شغالة', nav1 && api1.success, JSON.stringify({ nav1, m: api1.message }));
  q("REPLACE INTO admin_settings (setting_key, setting_value) VALUES ('hide_basira_screen', 1)");
  await c.reload(); await c.waitForTimeout(2500); await c.evaluate(() => renderHome()); await c.waitForTimeout(1200);
  const nav2 = await c.evaluate(() => [...document.querySelectorAll('.gs-side *, nav *')].some(x => x.children.length === 0 && /بصيرة AI/.test(x.textContent)));
  const api2 = await c.evaluate(async () => apiGet('/basira_api.php?action=config'));
  check('بعد الإخفاء: مستخبية من القائمة والـ API بيرفض للعميل', !nav2 && api2.success === false && api2.hidden === true, JSON.stringify({ nav2, api2 }));
  check('الأدمن بيفضل يشوفها بعد الإخفاء', (await a.evaluate(async () => apiGet('/basira_api.php?action=config'))).success === true);
  q("DELETE FROM admin_settings WHERE setting_key='hide_basira_screen'");
  check('بدون أخطاء JavaScript', !a.__errors.length && !g.__errors.length && !c.__errors.length, a.__errors[0] || g.__errors[0] || c.__errors[0]);

  // تنظيف
  q("DELETE FROM site_config WHERE config_key IN ('basira_cfg','basira_ai_key')");
  q(`DELETE FROM basira_reports WHERE account_email IN ('${ADMIN}','${CUST.email}')`);
  q(`DELETE FROM user_watchlist WHERE account_email='${ADMIN}' AND symbol='COMI'`);
  q("DELETE FROM site_config WHERE config_key = 'ai_paid_on'"); await b.close(); process.exit(summary());
})();
