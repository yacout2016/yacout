// الإصدار 118: «مسح السوق» في بصيرة — كل البورصة أو قطاع ← الأسهم مترتبة حسب احتمال الصعود (أسبوع / شهر / 3 / 6 شهور / سنة)
//   + أفضل 3 + الضغط على أي سهم بيفتح تحليله الكامل + إيقاف من لوحة التحكم
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
(async () => {
  q("DELETE FROM login_attempts");
  q("DELETE FROM site_config WHERE config_key IN ('basira_cfg','basira_ai_key')");
  q("REPLACE INTO site_config (config_key, config_value) VALUES ('ai_paid_on', '1')");   // الإصدار 127: المدفوع مقفول افتراضيًا ← الاختبارات اللي بتستخدم المفتاح بتفعّله
  const b = await launch(); const a = await page(b, { width: 1366, height: 900 }); await loginAdmin(a);
  await a.evaluate(() => renderBasira()); await a.waitForSelector('#bsTabScan', { timeout: 20000 }).catch(() => {});
  check('بصيرة: تبويبين «تحليل سهم» و«مسح السوق — الأسهم المتوقع صعودها»', await a.evaluate(() => /تحليل سهم/.test(document.getElementById('bsTabOne').textContent) && /مسح السوق/.test(document.getElementById('bsTabScan').textContent)));
  await a.click('#bsTabScan'); await a.waitForFunction(() => document.querySelectorAll('#bsScSec option').length > 1, null, { timeout: 20000 }).catch(() => {});
  const ui = await a.evaluate(() => ({ one: document.getElementById('bsOneWrap').hidden, secs: [...document.querySelectorAll('#bsScSec option')].map(o => o.textContent), hz: [...document.querySelectorAll('#bsScHz button')].map(x => x.textContent), on: (document.querySelector('#bsScHz .on') || {}).textContent }));
  check('المسح: قائمة القطاعات من السوق بالعربي (كل البورصة + البنوك)', ui.one && ui.secs[0].includes('كل البورصة') && ui.secs.some(x => /البنوك \(2\)/.test(x)), ui.secs.join(' | '));
  check('المسح: الفترات أسبوع / شهر / 3 شهور / 6 شهور / سنة (الافتراضي شهر)', ui.hz.join(',') === 'أسبوع,شهر,3 شهور,6 شهور,سنة' && ui.on === 'شهر', ui.hz.join(','));

  // كل البورصة
  await a.click('#bsScGo');
  await a.waitForFunction(() => /اكتمل المسح/.test((document.getElementById('bsScTxt') || {}).textContent || ''), null, { timeout: 90000 }).catch(() => {});
  const rowsOf = () => a.evaluate(() => [...document.querySelectorAll('#bsScTable tbody tr.bs-scr')].map(r => ({ s: r.dataset.s, up: parseInt(r.querySelector('[data-col="up"]').textContent), sec: r.querySelector('[data-col="sec"]').textContent.trim() })));
  let rows = await rowsOf();
  const sorted = (L) => L.every((x, i) => i === 0 || L[i - 1].up >= x.up);
  check('كل البورصة: الأسهم اتحللت كلها + شريط التقدّم اكتمل', rows.length === 5 && await a.evaluate(() => document.getElementById('bsScBar').style.width === '100%'), JSON.stringify(rows.map(r => r.s)));
  check('مترتبة حسب احتمال الصعود خلال شهر (الأعلى الأول)', sorted(rows) && await a.evaluate(() => /شهر/.test(document.getElementById('bsScHzTh').textContent)), rows.map(r => r.s + ':' + r.up).join(', '));
  check('الأعلى احتمالًا (أفضل 3) فوق الجدول', await a.evaluate(() => document.querySelectorAll('.bs-sctc').length === 3 && /الأعلى احتمالًا للصعود خلال شهر/.test(document.getElementById('bsScTop').textContent)));
  check('السهم النازل (DROPX) مش في الأول', rows[0].s !== 'DROPX', rows[0].s);
  await a.click('#bsScHz button[data-k="year"]'); await a.waitForTimeout(200);
  rows = await rowsOf();
  check('تغيير الفترة لسنة ← إعادة الترتيب فورًا (من غير مسح تاني)', sorted(rows) && await a.evaluate(() => /سنة/.test(document.getElementById('bsScHzTh').textContent) && /خلال سنة/.test(document.getElementById('bsScTop').textContent)), rows.map(r => r.s + ':' + r.up).join(', '));

  // الإصدار 120: الجدول جوه حدود الصفحة + إظهار/إخفاء الأعمدة + ألوان الزراير
  const fit = await a.evaluate(() => { const t = document.getElementById('bsScTable'), card = document.getElementById('bsScRes'), sym = t.querySelector('th[data-col="sym"]').getBoundingClientRect().width, n = t.querySelector('th[data-col="n"]').getBoundingClientRect().width;
    return { tw: Math.round(t.getBoundingClientRect().width), cw: Math.round(card.clientWidth), sx: card.querySelector('.bs-scbody').scrollWidth - card.querySelector('.bs-scbody').clientWidth, sym: Math.round(sym), n: Math.round(n), page: document.documentElement.scrollWidth - window.innerWidth }; });
  check('الجدول جوه حدود الصفحة: مفيش تمرير يمين وشمال + عمود السهم والمسلسل مش عريضين', fit.sx <= 1 && fit.page <= 1 && fit.sym <= 170 && fit.sym >= 40 && fit.n <= 40, JSON.stringify(fit));
  // الإصدار 134: بعد المسلسل ← الكود ثم اسم السهم ثم القطاع، والاسم ظاهر
  const hd = await a.evaluate(() => ({ cols: [...document.querySelectorAll('#bsScTable thead th')].map(th => th.dataset.col).slice(0, 4), nm: (document.querySelector('#bsScTable tbody td[data-col="nm"]') || {}).textContent || '' }));
  check('v134: الترتيب # ← الكود ← اسم السهم ← القطاع + الاسم مكتوب', hd.cols.join(',') === 'n,sym,nm,sec' && hd.nm.trim().length > 1, JSON.stringify(hd));
  // الإصدار 134: بحث + فلتر لكل عمود
  const syms = async () => (await rowsOf()).map(r => r.s).join(',');
  const setF = async (sel, v) => { await a.evaluate(([s, val]) => { const el = document.querySelector(s); el.value = val; el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }, [sel, v]); await a.waitForTimeout(300); };
  check('v134: صف الفلاتر ظاهر على الكمبيوتر + خانة البحث', await a.evaluate(() => !document.getElementById('bsScFr').hidden && !!document.getElementById('bsScQ')));
  await setF('#bsScQ', 'comi');
  check('v134: البحث بالكود (comi) ← سهم واحد + العداد «1 من 5»', (await syms()) === 'COMI' && await a.evaluate(() => /1 من 5/.test(document.getElementById('bsScCount').textContent)), await syms());
  await setF('#bsScQ', 'التجاري'); check('v134: البحث بالاسم العربي', (await syms()) === 'COMI', await syms());
  await setF('#bsScQ', '');
  await setF('#bsScFr select[data-f="sec"]', 'البنوك'); check('v134: فلتر القطاع (قائمة) ← البنوك بس', (await syms()).split(',').sort().join(',') === 'COMI,HRHO', await syms());
  await setF('#bsScFr select[data-f="sec"]', '');
  const all5 = await rowsOf(), thr = all5.map(r => r.up).sort((x, y) => y - x)[2], expUp = all5.filter(r => r.up > thr).map(r => r.s).sort().join(',');
  await setF('#bsScFr input[data-f="up"]', '>' + thr); check('v134: فلتر رقمي على الاحتمال (>رقم)', (await syms()).split(',').sort().join(',') === expUp && expUp.length > 0, thr + ' → ' + await syms());
  await setF('#bsScFr input[data-f="up"]', '20-30'); check('v134: فلتر رقمي من-إلى (20-30)', (await syms()) === 'DROPX', await syms());
  await setF('#bsScFr input[data-f="up"]', '');
  await setF('#bsScFr select[data-f="v"]', 'neg'); check('v134: فلتر التوقع (هبوط محتمل)', (await syms()) === 'DROPX', await syms());
  await setF('#bsScFr select[data-f="v"]', '');
  await setF('#bsScFr input[data-f="nm"]', 'طلعت'); check('v134: فلتر عمود الاسم', (await syms()) === 'TMGH', await syms());
  await setF('#bsScFr input[data-f="nm"]', '');
  check('v134: مسح الفلاتر ← الخمسة رجعوا', (await rowsOf()).length === 5);
  const btnVis = () => a.evaluate(() => { const b = document.getElementById('bsColBtn'); return !!(b && b.offsetParent !== null); });
  check('زرار «إظهار / إخفاء الأعمدة» ظاهر دايمًا', await btnVis());
  await a.click('#bsColBtn'); await a.waitForTimeout(150);
  await a.uncheck('#bsColMenu input[data-k="sec"]'); await a.uncheck('#bsColMenu input[data-k="y1"]'); await a.waitForTimeout(150);
  const hid = await a.evaluate(() => ({ sec: getComputedStyle(document.querySelector('#bsScTable td[data-col="sec"]')).display, y1: getComputedStyle(document.querySelector('#bsScTable th[data-col="y1"]')).display, lbl: document.getElementById('bsColHid').textContent }));
  check('إخفاء عمودين (القطاع + عائد سنة) من القائمة', hid.sec === 'none' && hid.y1 === 'none' && /مخفي/.test(hid.lbl), JSON.stringify(hid));
  await a.click('body', { position: { x: 5, y: 5 } }); await a.waitForTimeout(150);
  check('بعد الإخفاء: زرار إظهار الأعمدة لسه ظاهر', await btnVis());
  await a.click('#bsColBtn'); await a.click('#bsColMenu .bs-colall'); await a.waitForTimeout(150);
  check('«إظهار كل الأعمدة» بيرجّعهم', await a.evaluate(() => getComputedStyle(document.querySelector('#bsScTable td[data-col="sec"]')).display !== 'none' && getComputedStyle(document.querySelector('#bsScTable td[data-col="rng"]')).display !== 'none'));
  await a.evaluate(() => { localStorage.removeItem('bs_scan_cols_v2'); }); await a.click('body', { position: { x: 5, y: 5 } });
  await a.click('#bsScTable th[data-sort="sym"]'); await a.waitForTimeout(150);
  const bySym = (await rowsOf()).map(r => r.s);
  check('الضغط على عنوان العمود بيرتّب (السهم أبجدي)', bySym.join(',') === bySym.slice().sort().join(','), bySym.join(','));
  await a.click('#bsScTable th[data-sort="up"]'); await a.waitForTimeout(150);
  const col = await a.evaluate(() => ({ go: getComputedStyle(document.getElementById('bsScGo')).backgroundColor, tab: getComputedStyle(document.getElementById('bsTabScan')).backgroundImage, one: getComputedStyle(document.getElementById('bsTabOne')).backgroundImage }));
  check('زرار «ابدأ المسح» أصفر + تبويب «مسح السوق» بلون مختلف واضح', col.go === 'rgb(250, 204, 21)' && /gradient/.test(col.tab) && !/gradient/.test(col.one), JSON.stringify(col));
  // قطاع واحد
  await a.selectOption('#bsScSec', 'البنوك'); await a.click('#bsScGo');
  await a.waitForFunction(() => /اكتمل المسح/.test((document.getElementById('bsScTxt') || {}).textContent || ''), null, { timeout: 60000 }).catch(() => {});
  rows = await rowsOf();
  check('فلتر «البنوك» ← شركات القطاع بس (COMI + HRHO)', rows.length === 2 && rows.every(r => r.sec === 'البنوك') && rows.map(r => r.s).sort().join(',') === 'COMI,HRHO', JSON.stringify(rows));

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
  await m.click('#bsScGo');
  await m.waitForFunction(() => /اكتمل المسح/.test((document.getElementById('bsScTxt') || {}).textContent || ''), null, { timeout: 90000 }).catch(() => {});
  const mw = await m.evaluate(() => { const r = document.querySelector('#bsScTable tbody tr.bs-scr'), w = (k) => { const c = r && r.querySelector(`[data-col="${k}"]`); return c && getComputedStyle(c).display !== 'none' ? Math.round(c.getBoundingClientRect().width) : 0; };
    const bd = document.querySelector('#bsScRes .bs-scbody'); return { sym: w('sym'), nm: w('nm'), sec: w('sec'), px: w('px'), up: w('up'), name: (r && r.querySelector('[data-col="nm"]').textContent || '').trim(), sx: bd.scrollWidth - bd.clientWidth, page: document.documentElement.scrollWidth - window.innerWidth }; });
  check('v134 موبايل: الكود + اسم السهم + القطاع + السعر + الاحتمال ظاهرين كلهم ومفيش عمود مقفول', mw.sym >= 40 && mw.nm >= 60 && mw.sec >= 50 && mw.px >= 40 && mw.up >= 30 && mw.name.length > 1, JSON.stringify(mw));
  check('v134 موبايل: الجدول جوه الشاشة من غير تمرير يمين وشمال', mw.sx <= 1 && mw.page <= 1, JSON.stringify(mw));
  const mf = await m.evaluate(() => { const bd = document.querySelector('#bsScRes .bs-scbody'); return { open: !document.getElementById('bsScFr').hidden && !document.getElementById('bsScFBtn'), sx: bd.scrollWidth - bd.clientWidth, page: document.documentElement.scrollWidth - window.innerWidth }; });
  check('v135 موبايل: الفلتر ظاهر دايمًا على راس كل عمود (من غير زرار) والجدول جوه الشاشة', mf.open && mf.sx <= 1 && mf.page <= 1, JSON.stringify(mf));
  await m.click('#bsColBtn'); await m.waitForTimeout(150);
  const keys = await m.evaluate(() => [...document.querySelectorAll('#bsColMenu input[data-k]')].map(i => i.dataset.k));
  check('v134: كل الأعمدة في قائمة الإخفاء (الكود والاسم والقطاع والاحتمال والزرار)', ['sym', 'nm', 'sec', 'up', 'go'].every(k => keys.includes(k)), keys.join(','));
  await m.uncheck('#bsColMenu input[data-k="sym"]'); await m.uncheck('#bsColMenu input[data-k="nm"]'); await m.waitForTimeout(150);
  const hz2 = await m.evaluate(() => ['sym', 'nm'].map(k => getComputedStyle(document.querySelector(`#bsScTable td[data-col="${k}"]`)).display));
  check('v134: إخفاء الكود واسم السهم شغال', hz2.every(d => d === 'none'), hz2.join(','));
  await m.evaluate(() => localStorage.removeItem('bs_scan_cols_v2'));
  check('بدون أخطاء JavaScript', !a.__errors.length && !m.__errors.length, a.__errors[0] || m.__errors[0]);
  q("DELETE FROM site_config WHERE config_key = 'ai_paid_on'"); await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
