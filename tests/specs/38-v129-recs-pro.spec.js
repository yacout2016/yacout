// الإصدار 129: شاشة المحلل الاحترافية — السهم والسعر المحوري والرسم يمين والرسالة شمال + «تحليل السهم» و«مسح السوق» + نقل المستويات (منطقة ≤ 1% من المحوري)
// + وقف 3 مراحل + الرسم بالمؤشرات وفيبوناتشي (صور برابط سري) + رأي بصيرة + الصلاحية من ساعة لـ 12 شهر («طويلة المدى») + إشعار الانتهاء
// + اسم المحلل مقفول إلا بصلاحية + نصوص الشاشة من لوحة التحكم
const { check, summary, launch, page, loginAdmin, q, BASE } = require('../lib');
const { execSync } = require('child_process');
const CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
const AN = { email: 'analyst129@example.com', pass: 'Test12345an' };   // حساب محلل لقاعدة الاختبار بس
(async () => {
  q("DELETE FROM login_attempts"); q("DELETE FROM rec_outbox"); q("REPLACE INTO site_config (config_key, config_value) VALUES ('recs_cfg', '')");
  const b = await launch(); const a = await page(b); await loginAdmin(a);
  await a.evaluate(() => { window.gConfirm = async () => true; });

  // 1) لوحة التحكم
  await a.evaluate(() => renderAdminHub()); await a.waitForTimeout(800);
  check('لوحة التحكم: زرار «شاشة التوصيات (النصوص والأزرار والافتراضيات)»', await a.evaluate(() => /شاشة التوصيات/.test((document.getElementById('goRecsCfgBtn') || {}).textContent || '')));

  // 2) الترتيب: السهم والمحوري يمين — الرسالة شمال جنبه
  await a.evaluate(() => renderRecommendationsAdminPage()); await a.waitForSelector('#rcSym');
  const lay = await a.evaluate(() => { const s = document.getElementById('rcStockPane').getBoundingClientRect(), f = document.querySelector('.rc-form').getBoundingClientRect(), sym = document.getElementById('rcSym').closest('#rcStockPane');
    return { right: s.left > f.left, top: Math.abs(s.top - f.top) < 4, an: (document.getElementById('rcBtnAnalyze') || {}).textContent, sc: (document.getElementById('rcBtnScan') || {}).textContent, sym: !!sym,
      valid: [...document.querySelectorAll('#rcValid option')].map(o => o.textContent) }; });
  check('الترتيب: السهم والسعر المحوري يمين + رسالة التوصية شمال جنبه', lay.right && lay.top && lay.sym, JSON.stringify(lay).slice(0, 120));
  check('جنب كود السهم: «تحليل السهم» + «مسح السوق»', /تحليل السهم/.test(lay.an) && /مسح السوق/.test(lay.sc), lay.an + ' / ' + lay.sc);
  check('الصلاحية: ساعة / 3 / 6 / 9 / 12 / 24 ساعة ... 3 أسابيع / شهر / 3 / 6 / 12 شهر', lay.valid.length === 15 && lay.valid[0] === 'ساعة' && lay.valid.includes('9 ساعات') && lay.valid.includes('3 أسابيع') && lay.valid.includes('6 شهور') && lay.valid[14] === '12 شهر', lay.valid.join('، '));
  await a.selectOption('#rcValid', '168'); const l1 = await a.evaluate(() => ({ off: rcLong.classList.contains('rc-off'), vis: !!rcLong.offsetParent, tip: !!rcLong.querySelector('.g-tip') && /أسبوعين/.test(rcLong.querySelector('.g-tip').dataset.tip) }));
  await a.selectOption('#rcValid', '336'); const l2 = await a.evaluate(() => ({ off: rcLong.classList.contains('rc-off'), t: rcLong.textContent }));
  check('«توصية طويلة المدى» ظاهرة مطفية + علامة (!) بالشرح — ومن أول «أسبوعين» بتنوّر (الإصدار 130)', l1.off && l1.vis && l1.tip && !l2.off && /طويلة المدى/.test(l2.t), JSON.stringify([l1, l2]));

  // 3) السهم ← المستويات + الرسم + بصيرة
  await a.fill('#rcSym', 'COMI'); await a.waitForSelector('.rc-lv', { timeout: 30000 }).catch(() => {});
  await a.waitForSelector('#rcChart svg', { timeout: 10000 }).catch(() => {});
  const lv = await a.evaluate(() => [...document.querySelectorAll('.rc-lv')].map(x => +x.dataset.v));
  check('الرسم البياني بيظهر بعد اختيار السهم + المؤشرات الافتراضية (SMA 20 / SMA 50 / RSI)', await a.evaluate(() => !!document.querySelector('#rcChart svg') && [...document.querySelectorAll('.rc-indchip')].map(x => x.dataset.ind).join() === 'sma20,sma50,rsi'));
  await a.selectOption('#rcIndAdd', 'macd');
  const ind = await a.evaluate(() => ({ chips: [...document.querySelectorAll('.rc-indchip')].map(x => x.dataset.ind), svg: document.querySelector('#rcChart svg').textContent, notes: rcCross.textContent }));
  check('إضافة مؤشر من القائمة المنسدلة (MACD) ← بيترسم + ملاحظته (القيمة / التقاطع)', ind.chips.includes('macd') && /MACD/.test(ind.svg) && /MACD/.test(ind.notes), ind.notes.slice(0, 120));
  await a.waitForFunction(() => /الدرجة/.test(rcBsBox.textContent), null, { timeout: 40000 }).catch(() => {});
  check('رأي بصيرة AI بيتجاب تلقائي مع اختيار السهم (ومرفق افتراضيًا)', await a.evaluate(() => /الدرجة/.test(rcBsBox.textContent) && rcAttAi.checked && rcAttChart.checked && rcAttInd.checked && !rcAttFib.checked));

  // 4) نقل المستويات
  await a.click('#rcSuggest');
  const tr = await a.evaluate(() => ({ from: +rcFrom.value, to: +rcTo.value, t: [+rcT1.value, +rcT2.value, +rcT3.value], p: [rcT1p.value, rcT2p.value, rcT3p.value].join(), s1: +rcS1.value, s1p: rcS1p.value, more: rcStopMore.hidden }));
  const [S3, S2, S1, PV, R1, R2, R3] = lv;
  check('«انقل المستويات»: المنطقة من المحوري −1% لحد المحوري + الأهداف = المقاومات 1/2/3 (40/30/30) + الوقف = أول دعم 100%',
    tr.to === PV && Math.abs(tr.from / PV - 0.99) < 0.002 && tr.t.every(x => x > tr.to) && tr.t[2] === R3 && tr.p === '40,30,30' && tr.s1 < tr.from && tr.s1p === '100' && tr.more, JSON.stringify(tr) + ' lv=' + lv.join(','));
  await a.check('#rcStop3Mode'); await a.click('#rcSuggest');
  const st = await a.evaluate(() => ({ s: [+rcS1.value, +rcS2.value, +rcS3.value], p: [rcS1p.value, rcS2p.value, rcS3p.value].join(), more: rcStopMore.hidden }));
  check('وقف 3 مراحل: الدعوم S1 / S2 / S3 بنسب 50 / 30 / 20', !st.more && st.s[0] > st.s[1] && st.s[1] > st.s[2] && st.s[2] > 0 && st.p === '50,30,20', JSON.stringify(st));
  await a.fill('#rcFrom', String(tr.from)); await a.fill('#rcT1', String(tr.t[0] + 0.5));
  check('الخانات بتتعدّل باليد عادي بعد النقل', await a.evaluate(() => +rcT1.value) === tr.t[0] + 0.5);
  await a.fill('#rcT1', String(tr.t[0]));

  // 5) الإرسال: الرسم + فيبوناتشي + بصيرة + المؤشرات ← صور برابط سري
  await a.check('#rcAttFib'); await a.waitForSelector('#rcFib svg', { timeout: 5000 }).catch(() => {});
  check('فيبوناتشي بيترسم (مستويات التصحيح والامتداد + الأهداف والوقف)', await a.evaluate(() => { const t = (document.querySelector('#rcFib svg') || {}).textContent || ''; return /61\.8%/.test(t) && /امتداد/.test(t) && /هدف 1/.test(t); }));
  await a.fill('#rcNote', 'اختبار 129'); await a.click('#rcSend');
  await a.waitForFunction(() => /اتبعتت|تعذّر|لازم/.test(rcMsg.textContent), null, { timeout: 60000 }).catch(() => {});
  const sent = await a.evaluate(() => rcMsg.textContent);
  const row = q("SELECT CONCAT_WS('|', id, attach, img_key, validity_hours, stop1_pct, stop2_pct, stop3_pct, IF(ai_text <> '', 'ai', 'noai'), IF(indicators LIKE '%MACD%', 'macd', 'nomacd')) FROM recommendations WHERE note='اختبار 129' ORDER BY id DESC LIMIT 1").split('|');
  check('الإرسال ← اتحفظ: المرفقات (رسم / بصيرة / مؤشرات / فيبوناتشي) + وقف 3 مراحل + أسبوعين', /اتبعتت/.test(sent) && row[1] === 'chart,ai,ind,fib' && row[3] === '336' && row.slice(4, 7).join() === '50.00,30.00,20.00' && row[7] === 'ai' && row[8] === 'macd', sent + ' — ' + row.join('|'));
  const img = await a.evaluate(async (k) => { const out = {}; for (const n of ['chart', 'fib']) { const r = await fetch('/rec_img.php?k=' + k + '&n=' + n, { credentials: 'omit' }); out[n] = r.status + ' ' + r.headers.get('content-type') + ' ' + (await r.arrayBuffer()).byteLength; } out.bad = (await fetch('/rec_img.php?k=../x&n=chart')).status; return out; }, row[2]);
  check('صورة الرسم وفيبوناتشي بتتعرض برابط سري من غير تسجيل دخول (للإيميل والإشعار) — ورابط غلط 404', /^200 image\/png \d{5,}/.test(img.chart) && /^200 image\/png \d{5,}/.test(img.fib) && img.bad === 404, JSON.stringify(img));
  const al = q(`SELECT body FROM user_alerts WHERE account_email='${CUST.email}' ORDER BY id DESC LIMIT 1`);
  check('إشعار التطبيق: الأهداف + 3 مراحل وقف + المؤشرات + رأي بصيرة + «طويلة المدى»', /وقف الخسارة 3/.test(al) && /المؤشرات/.test(al) && /رأي بصيرة/.test(al) && /طويلة المدى/.test(al), al.slice(0, 160));
  await a.waitForFunction(() => /خلص/.test((document.getElementById('rcProg') || {}).textContent || ''), null, { timeout: 60000 }).catch(() => {});
  check('الإيميل الاحترافي اتبعت من الطابور', /^0\/[1-9]/.test(q(`SELECT CONCAT(SUM(status=0), '/', COUNT(*)) FROM rec_outbox WHERE rec_id=${row[0]} AND channel='email'`)));

  // 5ب) الإصدار 130: «مسح السوق» = نفس مسح بصيرة بنفس اللون — كل البورصة حسب المدة + صاعد / هابط / محايد
  const scanBg = await a.evaluate(() => getComputedStyle(document.getElementById('rcBtnScan')).backgroundImage);
  await a.selectOption('#rcTf', '3m'); await a.waitForTimeout(400); await a.click('#rcBtnScan');
  await a.waitForFunction(() => /اكتمل المسح/.test((document.getElementById('rcScTxt') || {}).textContent || ''), null, { timeout: 90000 }).catch(() => {});
  const sc = await a.evaluate(() => { const c = {}; document.querySelectorAll('#rcScDir button').forEach(b => c[b.dataset.d] = +b.querySelector('b').textContent);
    return { hz: (document.querySelector('#rcScHz .on') || {}).dataset?.k, th: rcScHzTh.textContent, c, head: document.querySelector('.rc-scanhead').textContent, cls: !!document.querySelector('.rc-scan .bs-scan .bs-go') }; });
  check('«مسح السوق» بنفس لون بصيرة + بيفتح نفس شاشة المسح على كل البورصة بالمدة المختارة (3 شهور)', /gradient/.test(scanBg) && sc.cls && sc.hz === '3m' && /3 شهور/.test(sc.th) && sc.c.all >= 5, JSON.stringify(sc) + ' ' + scanBg.slice(0, 40));
  check('المسح بيجيب الصاعد والهابط والمحايد (عشان توصية بيع أو إغلاق توصية)', sc.c.up >= 1 && sc.c.down >= 1 && sc.c.up + sc.c.down + sc.c.flat === sc.c.all, JSON.stringify(sc.c));
  await a.click('#rcScDir button[data-d="down"]');
  const dn = await a.evaluate(() => [...document.querySelectorAll('#rcScBody [data-pick]')].map(b => b.dataset.pick + ':' + b.textContent.trim()));
  await a.click('#rcScBody [data-pick="DROPX"]', { timeout: 5000 }).catch(async () => { await a.evaluate(() => { const o = document.querySelector('.rc-ov'); if (o) o.remove(); }); }); await a.waitForSelector('.rc-lv', { timeout: 30000 }).catch(() => {});
  const pk = await a.evaluate(() => ({ sym: rcSym.value, type: (document.querySelector('#rcType .on') || {}).dataset?.t, ov: !!document.querySelector('.rc-scan') }));
  check('«هابط» ← السهم النازل + «توصية بيع» بتحطه في التوصية وتحوّلها بيع', dn.some(x => /^DROPX:توصية بيع/.test(x)) && pk.sym === 'DROPX' && pk.type === 'sell' && !pk.ov, JSON.stringify({ dn, pk }));

  // 6) العميل: الكارت بالرسم والمرفقات ← انتهاء الصلاحية ← إشعار «انتهت» مرة واحدة
  const c = await page(b, { width: 390, height: 844 });
  await c.evaluate(async ([e, pw]) => { await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); }, [CUST.email, CUST.pass]);
  await c.evaluate(() => renderRecommendationsCustomerPage()); await c.waitForSelector('.rc-card', { timeout: 20000 }).catch(() => {}); await c.waitForTimeout(1500);
  const cc = await c.evaluate(() => { const k = document.querySelector('.rc-card'); return { imgs: [...k.querySelectorAll('.rc-cimg img')].map(i => i.naturalWidth), ai: !!k.querySelector('.rc-ai'), long: !!k.querySelector('.rc-longtag'), sl: k.querySelectorAll('.rc-sl').length, ov: document.documentElement.scrollWidth - innerWidth }; });
  check('العميل: الكارت فيه الرسم + فيبوناتشي + رأي بصيرة + 3 مراحل وقف + «طويلة المدى» — ومن غير تمرير أفقي', cc.imgs.length === 2 && cc.imgs.every(w => w > 600) && cc.ai && cc.long && cc.sl === 3 && cc.ov <= 1, JSON.stringify(cc));
  const maxA = q('SELECT COALESCE(MAX(id), 0) FROM user_alerts');
  q(`UPDATE recommendations SET validity_hours = 1, created_at = DATE_SUB(NOW(), INTERVAL 2 HOUR) WHERE id = ${row[0]}`);
  await c.evaluate(async () => { await apiGet('/recommendations_list.php?expired=1'); await apiGet('/recommendations_list.php'); });
  const ex = q(`SELECT CONCAT(archived, status, '|', (SELECT COUNT(*) FROM recommendation_updates WHERE rec_id=${row[0]} AND kind='expired'), '|', (SELECT COUNT(*) FROM user_alerts WHERE account_email='${CUST.email}' AND title LIKE '%انتهت صلاحية%' AND id > ${maxA})) FROM recommendations WHERE id=${row[0]}`);
  check('انتهاء الصلاحية ← التوصية اتقفلت + إشعار «انتهت صلاحية التوصية» للمشترك مرة واحدة بس', ex === '1expired|1|1', ex);
  await c.evaluate(() => renderRecommendationsCustomerPage()); await c.waitForTimeout(1500);
  check('العميل: التوصية المنتهية بتظهر بعلامة «انتهت» ومن غير «حوّل لخطة»', await c.evaluate(() => { const k = document.querySelector('.rc-card.rc-expired'); return !!k && /انتهت صلاحية/.test(k.textContent) && !k.querySelector('[data-plan]'); }));

  // 7) اسم المحلل: مقفول على الاسم المسجّل — وتغييره بصلاحية بس
  const hash = execSync(`php -r 'echo password_hash("${AN.pass}", PASSWORD_DEFAULT);'`).toString().trim();
  q(`DELETE FROM users WHERE username='${AN.email}'`); q(`INSERT INTO users (username, password, is_admin, email_verified) VALUES ('${AN.email}', '${hash.replace(/\$/g, '\\$')}', 1, 1)`);
  q(`DELETE FROM staff_members WHERE email='${AN.email}'`); q(`INSERT INTO staff_members (email, job_title, active) VALUES ('${AN.email}', 'financial_analyst', 1)`);
  const sid = q(`SELECT id FROM staff_members WHERE email='${AN.email}'`); q(`INSERT INTO staff_permissions (staff_id, permission_key) VALUES (${sid}, 'manage_recommendations')`);
  q(`DELETE FROM hr_employees WHERE email='${AN.email}'`); q(`INSERT INTO hr_employees (full_name, email, status) VALUES ('د. ماهر', '${AN.email}', 'active')`);
  const z = await page(b); await z.evaluate(() => { window.gConfirm = async () => true; });
  const lg = await z.evaluate(async ([e, pw]) => { const r = await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); return r; }, [AN.email, AN.pass]);
  await z.evaluate(() => renderRecommendationsAdminPage()); await z.waitForSelector('#rcAnalyst', { timeout: 15000 }).catch(() => {});
  const nm = await z.evaluate(() => ({ v: rcAnalyst.value, ro: rcAnalyst.readOnly }));
  check('المحلل من غير صلاحية: الاسم بينزل من حسابه («د. ماهر») ومقفول', lg && lg.success && nm.v === 'د. ماهر' && nm.ro, JSON.stringify(nm) + ' ' + JSON.stringify(lg));
  const sendAs = (an) => z.evaluate(async (an) => { const r = await apiPost('/recs_api.php', { action: 'send', type: 'buy', symbol: 'COMI', stockName: 'اختبار اسم', market: 'مصر', timeframe: 'day', from: 10, to: 10.1, t1: 11, t1pct: 100, stop1: 9, validityHours: 3, analyst: an, note: 'اسم 129', chApp: '1', chEmail: '0' }); return r.analyst || r.message; }, an);
  const n1 = await sendAs('اسم مزيف');
  check('السيرفر بيتجاهل أي اسم تاني من غير الصلاحية ← بيتبعت باسمه المسجّل', n1 === 'د. ماهر' && q("SELECT analyst_name FROM recommendations WHERE note='اسم 129' ORDER BY id DESC LIMIT 1") === 'د. ماهر', n1);
  q(`INSERT INTO staff_permissions (staff_id, permission_key) VALUES (${sid}, 'rec_custom_analyst_name')`);
  await z.evaluate(() => renderRecommendationsAdminPage()); await z.waitForSelector('#rcAnalyst', { timeout: 15000 }).catch(() => {});
  const ro2 = await z.evaluate(() => rcAnalyst.readOnly); const n2 = await sendAs('فريق التحليل الفني');
  check('بصلاحية «تغيير اسم المحلل» ← الخانة مفتوحة والاسم الجديد بيظهر للمتداول', !ro2 && n2 === 'فريق التحليل الفني', ro2 + ' ' + n2);
  check('الصلاحية الجديدة ظاهرة في قائمة الصلاحيات + المسمّى «محلل مالي»', await a.evaluate(async () => { const r = await apiGet('/staff_list.php').catch(() => null); return JSON.stringify(r || {}).includes('rec_custom_analyst_name'); }) && q("SELECT label FROM job_titles WHERE title_key='financial_analyst'") === 'محلل مالي');

  // 8) نصوص الشاشة من لوحة التحكم
  await a.evaluate(() => renderAdminRecsCfg()); await a.waitForSelector('#rcSaveCfg');
  const nf = await a.evaluate(() => document.querySelectorAll('.mz-adm [data-k]').length);
  await a.fill('[data-k="t_btn_transfer"]', '⬇ حط المستويات'); await a.fill('[data-k="tp1"]', '50'); await a.click('#rcSaveCfg'); await a.waitForTimeout(800);
  const bad = await a.evaluate(() => rcCfgMsg.textContent);
  await a.fill('[data-k="tp2"]', '25'); await a.fill('[data-k="tp3"]', '25'); await a.click('#rcSaveCfg'); await a.waitForTimeout(800);
  await a.evaluate(() => renderRecommendationsAdminPage()); await a.waitForSelector('#rcSuggest');
  const cf = await a.evaluate(() => ({ b: rcSuggest.textContent, p: rcT1p.value }));
  check('لوحة التحكم: كل نصوص وأزرار الشاشة + الافتراضيات قابلة للتعديل (ومجموع النسب لازم 100%)', nf >= 45 && /100%/.test(bad) && /حط المستويات/.test(cf.b) && cf.p === '50', nf + ' ' + bad + ' ' + JSON.stringify(cf));
  q("REPLACE INTO site_config (config_key, config_value) VALUES ('recs_cfg', '')");

  check('بدون أخطاء JavaScript', !a.__errors.length && !c.__errors.length && !z.__errors.length, a.__errors[0] || c.__errors[0] || z.__errors[0]);
  q(`DELETE FROM recommendations WHERE note IN ('اسم 129')`); q(`DELETE FROM hr_employees WHERE email='${AN.email}'`); q(`DELETE FROM staff_members WHERE email='${AN.email}'`); q(`DELETE FROM users WHERE username='${AN.email}'`);
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
