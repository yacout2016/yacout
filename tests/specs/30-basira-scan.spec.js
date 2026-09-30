// الإصدار 118: «مسح السوق» في بصيرة — كل البورصة أو قطاع ← الأسهم مترتبة حسب احتمال الصعود (أسبوع / شهر / 3 / 6 شهور / سنة)
//   + أفضل 3 + الضغط على أي سهم بيفتح تحليله الكامل + إيقاف من لوحة التحكم
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
(async () => {
  q("DELETE FROM login_attempts");
  q("DELETE FROM site_config WHERE config_key IN ('basira_cfg','basira_ai_key')");
  const b = await launch(); const a = await page(b, { width: 1366, height: 900 }); await loginAdmin(a);
  await a.evaluate(() => renderBasira()); await a.waitForSelector('#bsTabScan', { timeout: 20000 }).catch(() => {});
  check('بصيرة: تبويبين «تحليل سهم» و«مسح السوق — الأسهم المتوقع صعودها»', await a.evaluate(() => /تحليل سهم/.test(document.getElementById('bsTabOne').textContent) && /مسح السوق/.test(document.getElementById('bsTabScan').textContent)));
  await a.click('#bsTabScan'); await a.waitForFunction(() => document.querySelectorAll('#bsScSec option').length > 1, null, { timeout: 20000 }).catch(() => {});
  const ui = await a.evaluate(() => ({ one: document.getElementById('bsOneWrap').hidden, secs: [...document.querySelectorAll('#bsScSec option')].map(o => o.textContent), hz: [...document.querySelectorAll('#bsScHz button')].map(x => x.textContent), on: (document.querySelector('#bsScHz .on') || {}).textContent }));
  check('المسح: قائمة القطاعات من السوق بالعربي (كل البورصة + المالية والبنوك)', ui.one && ui.secs[0].includes('كل البورصة') && ui.secs.some(x => /المالية والبنوك \(2\)/.test(x)), ui.secs.join(' | '));
  check('المسح: الفترات أسبوع / شهر / 3 شهور / 6 شهور / سنة (الافتراضي شهر)', ui.hz.join(',') === 'أسبوع,شهر,3 شهور,6 شهور,سنة' && ui.on === 'شهر', ui.hz.join(','));

  // كل البورصة
  await a.click('#bsScGo');
  await a.waitForFunction(() => /اكتمل المسح/.test((document.getElementById('bsScTxt') || {}).textContent || ''), null, { timeout: 90000 }).catch(() => {});
  const rowsOf = () => a.evaluate(() => [...document.querySelectorAll('#bsScTable tbody tr.bs-scr')].map(r => ({ s: r.dataset.s, up: parseInt(r.cells[5].textContent), sec: r.cells[2].textContent.trim() })));
  let rows = await rowsOf();
  const sorted = (L) => L.every((x, i) => i === 0 || L[i - 1].up >= x.up);
  check('كل البورصة: الأسهم اتحللت كلها + شريط التقدّم اكتمل', rows.length === 5 && await a.evaluate(() => document.getElementById('bsScBar').style.width === '100%'), JSON.stringify(rows.map(r => r.s)));
  check('مترتبة حسب احتمال الصعود خلال شهر (الأعلى الأول)', sorted(rows) && await a.evaluate(() => /شهر/.test(document.getElementById('bsScHzTh').textContent)), rows.map(r => r.s + ':' + r.up).join(', '));
  check('الأعلى احتمالًا (أفضل 3) فوق الجدول', await a.evaluate(() => document.querySelectorAll('.bs-sctc').length === 3 && /الأعلى احتمالًا للصعود خلال شهر/.test(document.getElementById('bsScTop').textContent)));
  check('السهم النازل (DROPX) مش في الأول', rows[0].s !== 'DROPX', rows[0].s);
  await a.click('#bsScHz button[data-k="year"]'); await a.waitForTimeout(200);
  rows = await rowsOf();
  check('تغيير الفترة لسنة ← إعادة الترتيب فورًا (من غير مسح تاني)', sorted(rows) && await a.evaluate(() => /سنة/.test(document.getElementById('bsScHzTh').textContent) && /خلال سنة/.test(document.getElementById('bsScTop').textContent)), rows.map(r => r.s + ':' + r.up).join(', '));

  // قطاع واحد
  await a.selectOption('#bsScSec', 'المالية والبنوك'); await a.click('#bsScGo');
  await a.waitForFunction(() => /اكتمل المسح/.test((document.getElementById('bsScTxt') || {}).textContent || ''), null, { timeout: 60000 }).catch(() => {});
  rows = await rowsOf();
  check('فلتر «المالية والبنوك» ← شركات القطاع بس (COMI + HRHO)', rows.length === 2 && rows.every(r => r.sec === 'المالية والبنوك') && rows.map(r => r.s).sort().join(',') === 'COMI,HRHO', JSON.stringify(rows));

  // الضغط على سهم ← التحليل الكامل
  const pick = rows[0].s;
  await a.click(`#bsScTable tr.bs-scr[data-s="${pick}"]`); await a.waitForSelector('.bs-hero', { timeout: 40000 }).catch(() => {});
  const det = await a.evaluate(() => ({ one: !document.getElementById('bsOneWrap').hidden, scan: document.getElementById('bsScanWrap').hidden, sym: document.getElementById('bsSym').value, hero: !!document.querySelector('.bs-hero'), inds: document.querySelectorAll('.bs-ind, .bs-inds tr').length }));
  check('الضغط على السهم ← يفتح تحليله الكامل (نفس شاشة السهم لوحده)', det.one && det.scan && det.sym === pick && det.hero, JSON.stringify(det));
  await a.click('#bsTabScan'); await a.waitForTimeout(300);
  check('الرجوع لتبويب المسح ← النتايج لسه موجودة', (await rowsOf()).length === 2);

  // API: من غير اشتراك / متوقف من لوحة التحكم
  const meta = await a.evaluate(async () => apiGet('/basira_api.php?action=scan&market=' + encodeURIComponent('مصر') + '&limit=0'));
  check('API: limit=0 ← القطاعات والعدد بس', meta.success && meta.total === 5 && meta.items.length === 0 && meta.sectors.length >= 3, JSON.stringify({ t: meta.total, n: meta.items && meta.items.length }));
  await a.evaluate(async () => apiPost('/basira_api.php', { action: 'admin_save', config: JSON.stringify({ scan_on: false }) }));
  await a.evaluate(() => renderBasira()); await a.waitForTimeout(2500);
  const off = await a.evaluate(async () => ({ tab: !!document.getElementById('bsTabScan'), api: await apiGet('/basira_api.php?action=scan&limit=1') }));
  check('إيقاف «مسح السوق» من لوحة التحكم ← التبويب بيختفي والـ API بيرفض', !off.tab && off.api.success === false && /متوقف/.test(off.api.message), JSON.stringify(off).slice(0, 160));
  await a.evaluate(() => renderAdminBasira()); await a.waitForTimeout(1500);
  check('لوحة التحكم «تحليلات بصيرة AI»: خيار مسح السوق + أقصى عدد أسهم', await a.evaluate(() => !!document.getElementById('bsa_scan') && !!document.getElementById('bsa_scanmax')));
  q("DELETE FROM site_config WHERE config_key IN ('basira_cfg','basira_ai_key')");

  // موبايل
  const m = await page(b, { width: 390, height: 844 }); await loginAdmin(m);
  await m.evaluate(() => renderBasira()); await m.waitForSelector('#bsTabScan', { timeout: 20000 }).catch(() => {});
  await m.click('#bsTabScan'); await m.waitForTimeout(1500);
  const ov = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('المسح على الموبايل: مفيش تمرير أفقي للصفحة', ov <= 1, ov);
  check('بدون أخطاء JavaScript', !a.__errors.length && !m.__errors.length, a.__errors[0] || m.__errors[0]);
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
