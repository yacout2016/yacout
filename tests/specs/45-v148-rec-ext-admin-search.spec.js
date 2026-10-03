// الإصدار 148: المحلل يرفع صورة أو PDF مع التوصية (الأدمن يشغّل/يقفل من إعدادات شاشة التوصيات — مقفول افتراضيًا)
//   + بحث لوحة التحكم (للإدارة بس): أي كلمة ← كل الأماكن ومكانها، والضغط بيفتح المكان وينوّر البند
const { check, summary, launch, page, loginAdmin, q, BASE } = require('../lib');
const CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PDF = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF').toString('base64');
const BAD = 'data:image/png;base64,' + Buffer.from('<?php echo 1; ?> not an image at all').toString('base64');
(async () => {
  q("DELETE FROM login_attempts"); q("DELETE FROM recommendations WHERE note LIKE 'ext 148%'");
  const oldCfg = q("SELECT config_value FROM site_config WHERE config_key='recs_cfg'");
  q("DELETE FROM site_config WHERE config_key='recs_cfg'");
  const b = await launch();
  const a = await page(b); await loginAdmin(a); await a.evaluate(() => { window.gConfirm = async () => true; });
  const send = (note, file) => a.evaluate(async ([n, f]) => apiPost('/recs_api.php', { action: 'send', type: 'buy', symbol: 'COMI', stockName: 'مرفق', market: 'مصر', timeframe: 'day', from: 10, to: 10.1, t1: 11, t1pct: 100, stop1: 9, validityHours: 3, note: n, chApp: '1', chEmail: '0', attach: 'ext', ext_file: f }), [note, file]);
  const att = (note) => q(`SELECT attach FROM recommendations WHERE note='${note}' ORDER BY id DESC LIMIT 1`);

  // 1) مقفول افتراضيًا
  await a.evaluate(() => renderRecommendationsAdminPage()); await a.waitForSelector('#rcAnalyst', { timeout: 20000 }).catch(() => {});
  check('مقفول افتراضيًا: مفيش اختيار «صورة أو PDF من جهازك» عند المحلل', !(await a.$('#rcAttExt')));
  const r0 = await send('ext 148 off', PNG);
  check('السيرفر كمان بيتجاهل الملف وهو مقفول', r0.success && !/ext/.test(att('ext 148 off')), JSON.stringify(r0).slice(0, 120));
  await a.evaluate(() => renderAdminRecsCfg()); await a.waitForSelector('[data-k="allow_ext"]', { timeout: 15000 }).catch(() => {});
  check('لوحة التحكم ← شاشة التوصيات: اختيار «السماح للمحلل برفع صورة أو ملف PDF» (مش متعلّم)', await a.evaluate(() => { const c = document.querySelector('[data-k="allow_ext"]'); return !!c && !c.checked; }));
  // 2) الأدمن يشغّله
  await a.evaluate(async () => { const r = await apiGet('/recs_api.php?action=admin_get'); const c = Object.assign({}, r.config, { allow_ext: true }); return apiPost('/recs_api.php', { action: 'admin_save', config: JSON.stringify(c) }); });
  await a.evaluate(() => renderRecommendationsAdminPage()); await a.waitForSelector('#rcAttExt', { timeout: 20000 }).catch(() => {});
  check('بعد التشغيل: «📎 صورة أو PDF من جهازك» ظاهر عند المحلل', !!(await a.$('#rcAttExt')));
  await a.check('#rcAttExt'); await a.setInputFiles('#rcExtFile', { name: 'chart.png', mimeType: 'image/png', buffer: Buffer.from(PNG.split(',')[1], 'base64') }); await a.waitForTimeout(800);
  check('اختيار صورة ← مكتوب اسم الملف ✅ والمعاينة فيها الصورة', await a.evaluate(() => /chart\.png/.test(rcExtInfo.textContent) && !!document.querySelector('.rc-card img[alt="مرفق المحلل"]')));
  // 3) الإرسال بصورة و PDF
  const r1 = await send('ext 148 img', PNG); const r2 = await send('ext 148 pdf', PDF); const r3 = await send('ext 148 bad', BAD);
  check('إرسال بصورة ← اتحفظت مع التوصية', r1.success && /ext/.test(att('ext 148 img')), JSON.stringify(r1).slice(0, 100));
  check('إرسال بـ PDF ← اتحفظ مع التوصية', r2.success && /ext/.test(att('ext 148 pdf')), JSON.stringify(r2).slice(0, 100));
  check('ملف مش صورة ولا PDF (حتى لو متسمّي png) ← مرفوض برسالة واضحة', !r3.success && /صورة|PDF/.test(r3.message || ''), JSON.stringify(r3).slice(0, 140));
  const log = await a.evaluate(async () => (await apiGet('/recommendations_log.php')).recommendations.filter(r => /^ext 148 (img|pdf)$/.test(r.note)).map(r => ({ n: r.note, u: r.extUrl, t: r.extType })));
  const img = log.find(x => x.n === 'ext 148 img') || {}, pdf = log.find(x => x.n === 'ext 148 pdf') || {};
  const ct = await a.evaluate(async ([u1, u2]) => { const x = await fetch(u1); const y = await fetch(u2); return [x.status + ' ' + x.headers.get('content-type'), y.status + ' ' + y.headers.get('content-type')]; }, [img.u, pdf.u]);
  check('الملفات بتتعرض صح (الصورة image/png والـ PDF application/pdf)', img.t === 'img' && pdf.t === 'pdf' && /^200 image\/png/.test(ct[0]) && /^200 application\/pdf/.test(ct[1]), JSON.stringify({ log, ct }));
  // 4) العميل بيشوف المرفق في كارت التوصية
  const c = await page(b); await c.evaluate(async ([e, pw]) => { await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); }, [CUST.email, CUST.pass]);
  await c.evaluate(() => renderRecommendationsCustomerPage()); await c.waitForTimeout(3500);
  check('العميل: الصورة ظاهرة في الكارت + زرار «📄 فتح ملف PDF المرفق»', await c.evaluate(() => !!document.querySelector('.rc-card img[alt="مرفق المحلل"]') && !!document.querySelector('.rc-card .rc-extpdf')));

  // 5) بحث لوحة التحكم
  await a.evaluate(() => renderAdminHub()); await a.waitForSelector('#asrInput', { timeout: 30000 }).catch(() => {});
  check('لوحة التحكم: خانة البحث فوق', !!(await a.$('#asrInput')));
  const look = async (w) => { await a.fill('#asrInput', w); await a.waitForTimeout(700); return a.evaluate(() => [...document.querySelectorAll('#asrRes .asr-it')].map(x => x.textContent.replace(/\s+/g, ' ').trim())); };
  const w1 = await look('واتساب');
  check('البحث عن «واتساب» ← نتايج ومكان كل واحدة (📍 لوحة التحكم ← …)', w1.length >= 1 && w1.every(t => /📍/.test(t)) && w1.some(t => /الدخول والأمان|الإشعار|واتساب/.test(t)), w1.slice(0, 4).join(' || '));
  const w2 = await look('العدادات');
  check('«العدادات» ← صفحة اللاندينج ← الربط بالموقع', w2.some(t => /الربط بالموقع/.test(t) && /صفحة اللاندينج/.test(t)), w2.slice(0, 3).join(' || '));
  const w3 = await look('مرفق pdf');
  check('«مرفق pdf» ← إعداد رفع الصورة / PDF في شاشة التوصيات', w3.some(t => /PDF/.test(t) && /شاشة التوصيات/.test(t)), w3.slice(0, 3).join(' || '));
  const w4 = await look('ايقونة الدردشه');   // من غير همزات / تاء مربوطة
  check('البحث بيفهم الكتابة من غير همزات (ايقونة الدردشه)', w4.some(t => /أيقونة الدردشة/.test(t)), w4.slice(0, 3).join(' || '));
  await a.click('#asrRes .asr-it'); await a.waitForTimeout(2500);
  check('الضغط على النتيجة ← بيفتح «الصلاحيات والإعدادات» وينوّر البند', await a.evaluate(() => !!document.querySelector('.asr-flash') && /أيقونة الدردشة/.test(document.querySelector('.asr-flash').textContent)));
  const cs = await c.evaluate(() => { renderHome(); return new Promise(ok => setTimeout(() => ok(!!document.getElementById('asrInput')), 2500)); });
  check('العميل مبيشوفش بحث لوحة التحكم', !cs);

  check('بدون أخطاء JavaScript', !a.__errors.length && !c.__errors.length, a.__errors[0] || c.__errors[0]);
  q("DELETE FROM recommendations WHERE note LIKE 'ext 148%'"); q("DELETE FROM site_config WHERE config_key='recs_cfg'");
  if (oldCfg) q(`INSERT INTO site_config (config_key, config_value) VALUES ('recs_cfg', ${JSON.stringify(oldCfg)})`);
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
