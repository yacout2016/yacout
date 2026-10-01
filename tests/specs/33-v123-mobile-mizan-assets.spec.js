// الإصدار 123: أزرار مستوى المخاطرة في ميزان GRIFFINE (الاختيار بيبان وبيغيّر النتيجة) + الأصول المنفصلة في «توزيع شامل» و«فحص توزيعتي»
//   + جزء الأسهم موزّع على القطاعات + زرار «تفريغ الخانات» + «خطة السهم» في تنبيهات الرئيسية + الجداول كروت على الموبايل
const { check, summary, launch, page, loginAdmin, q, ADMIN } = require('../lib');
(async () => {
  q("DELETE FROM login_attempts");
  q("DELETE FROM site_config WHERE config_key IN ('basira_cfg','basira_ai_key','mizanai_cfg')");
  q("REPLACE INTO site_config (config_key, config_value) VALUES ('ai_paid_on', '1')");   // الإصدار 127: المدفوع مقفول افتراضيًا ← الاختبارات اللي بتستخدم المفتاح بتفعّله
  const b = await launch(); const a = await page(b, { width: 1366, height: 900 }); await loginAdmin(a);
  await a.evaluate(() => renderMizanAi()); await a.waitForFunction(() => document.querySelectorAll('#mzaSEx .mza-ms-opt').length >= 3, null, { timeout: 90000 }).catch(() => {});

  // 1) أزرار المخاطرة: الزرار المختار لونه بيتغير فعلًا + النتيجة بتختلف
  const bg = (sel) => a.evaluate((s) => getComputedStyle(document.querySelector(s)).backgroundColor, sel);
  await a.click('#mzaSRisk button[data-v="low"]');
  const on = await bg('#mzaSRisk button[data-v="low"]'), off = await bg('#mzaSRisk button[data-v="high"]');
  check('المخاطرة: الزرار المختار (محافظ) ليه لون مختلف وواضح عن الباقي', on !== off && /212, 175, 55/.test(on), on + ' / ' + off);
  await a.fill('#mzaSAmt', '100000'); await a.click('#mzaSGo'); await a.waitForSelector('#mzaOut .mza-table', { timeout: 60000 });
  const lowRows = await a.evaluate(() => [...document.querySelectorAll('#mzaOut .mza-table tbody tr')].map(r => r.cells[0].textContent.trim() + r.cells[1].textContent.trim()).join('|'));
  const lowCos = await a.evaluate(() => document.querySelectorAll('.mza-co-open').length);
  await a.click('#mzaSRisk button[data-v="high"]'); await a.click('#mzaSGo'); await a.waitForTimeout(1200);
  const hiRows = await a.evaluate(() => [...document.querySelectorAll('#mzaOut .mza-table tbody tr')].map(r => r.cells[0].textContent.trim() + r.cells[1].textContent.trim()).join('|'));
  const hiCos = await a.evaluate(() => document.querySelectorAll('.mza-co-open').length);
  check('المخاطرة: «مغامر» بيدّي توزيع مختلف عن «محافظ»', lowRows !== hiRows || lowCos !== hiCos, lowRows.slice(0, 80) + ' ≠ ' + hiRows.slice(0, 80));
  check('المخاطرة: «مغامر» متسجّل في النتيجة', await a.evaluate(() => /مغامر/.test(document.getElementById('mzaAiWrap').textContent)));

  // كل قطاع مستقل — مفيش قطاعين في اسم واحد
  const secs = await a.evaluate(() => [...document.querySelectorAll('#mzaSEx .mza-ms-opt')].map(x => x.textContent.trim()));
  check('القطاعات مستقلة (البنوك / المقاولات / الأدوية) — مفيش «المالية والبنوك» ولا «الخدمات الاستهلاكية والسياحة»', secs.includes('البنوك') && secs.includes('المقاولات') && secs.includes('الأدوية') && !secs.some(x => /المالية والبنوك|والسياحة|والرعاية/.test(x)), secs.join(' | '));
  // 2) زرار تفريغ الخانات
  await a.click('#mzaF-stocks .mza-clear');
  const cl = await a.evaluate(() => ({ amt: document.getElementById('mzaSAmt').value, out: document.getElementById('mzaOut').innerHTML.trim() }));
  check('«تفريغ الخانات»: المبلغ فاضي والنتيجة اتمسحت', cl.amt === '' && cl.out === '', JSON.stringify(cl));

  // 3) الأصول المنفصلة في التوزيع الشامل + جزء الأسهم على القطاعات
  await a.click('.mza-mode[data-m="assets"]');
  const ex = await a.evaluate(() => [...document.querySelectorAll('#mzaAEx .mza-ms-opt')].map(x => x.textContent.trim()));
  const need = ['حساب بنكي بعوائد يومية', 'حساب توفير بعوائد سنوية', 'صناديق نقدية', 'صناديق دخل ثابت', 'صناديق أسهم', 'عقار', 'ذهب', 'شهادات بنكية', 'أسهم'];
  check('توزيع شامل: كل الأصول منفصلة (يومي / توفير سنوي / نقدية / دخل ثابت / صناديق أسهم / عقار / ذهب / شهادات / أسهم)', need.every(n => ex.some(x => x.includes(n))), ex.join(' | '));
  // القوائم المنسدلة: «المطلوبة بس» ← الأصول المختارة بس
  await a.selectOption('#mzaAExM', 'only');
  const popOpen = await a.evaluate(() => !document.querySelector('#mzaAEx .mza-ms-pop').hidden);
  await a.click('#mzaAEx .mza-ms-opt:has-text("ذهب")'); await a.click('#mzaAEx .mza-ms-opt:has-text("شهادات بنكية")'); await a.click('body', { position: { x: 5, y: 5 } });
  const lbl = await a.evaluate(() => document.querySelector('#mzaAEx .mza-ms-btn').textContent);
  await a.click('#mzaAGo'); await a.waitForTimeout(1200);
  const only = await a.evaluate(() => [...document.querySelectorAll('#mzaOut .mza-table')[0].tBodies[0].rows].map(r => r.cells[0].textContent.trim()));
  check('قائمة منسدلة: «الأصول المطلوبة بس» ← ذهب + شهادات (+ الطوارئ) بس', popOpen && /2 مختار/.test(lbl) && only.length === 3 && only.some(x => /ذهب/.test(x)) && only.some(x => /شهادات/.test(x)), lbl + ' / ' + only.join(' | '));
  await a.click('#mzaF-assets .mza-clear'); await a.fill('#mzaAAmt', '100000');
  await a.click('#mzaAGo'); await a.waitForSelector('.mza-grow', { timeout: 30000 }).catch(() => {});
  await a.waitForFunction(() => document.querySelectorAll('#mzaOut .mza-table').length >= 2, null, { timeout: 30000 }).catch(() => {});
  const as = await a.evaluate(() => { const t = [...document.querySelectorAll('#mzaOut .mza-table')]; const rows = t[0] ? [...t[0].tBodies[0].rows].map(r => ({ n: r.cells[0].textContent.trim(), p: parseFloat(r.cells[1].textContent) })) : [];
    const sec = t[1] ? [...t[1].tBodies[0].rows].map(r => parseFloat(r.cells[1].textContent)) : []; return { rows, sum: rows.reduce((x, r) => x + r.p, 0), sec, secSum: sec.reduce((x, y) => x + y, 0), h: [...document.querySelectorAll('#mzaOut h3')].map(x => x.textContent).join(' | ') }; });
  check('توزيع شامل: الأصول الجديدة في النتيجة ومجموعها 100%', as.rows.length >= 9 && Math.abs(as.sum - 100) < 0.5 && as.rows.some(r => /صناديق نقدية/.test(r.n)) && as.rows.some(r => /بعوائد يومية/.test(r.n)), JSON.stringify(as.rows.map(r => r.n + ' ' + r.p)));
  check('توزيع شامل: جزء الأسهم متوزّع على قطاعات البورصة (= 100% من جزء الأسهم)', as.sec.length >= 2 && Math.abs(as.secSum - 100) < 0.5 && /توزيع جزء الأسهم على قطاعات/.test(as.h), JSON.stringify(as.sec));
  await a.click('#mzaARisk button[data-v="low"]'); await a.click('#mzaAGo'); await a.waitForTimeout(1500);
  const lowStocks = await a.evaluate(() => { const r = [...document.querySelectorAll('#mzaOut .mza-table')[0].tBodies[0].rows].find(r => /^📈/.test(r.cells[0].textContent.trim())); return r ? parseFloat(r.cells[1].textContent) : 0; });
  const midStocks = as.rows.find(r => /^📈/.test(r.n));
  check('توزيع شامل: «محافظ» نسبة الأسهم أقل من «متوازن»', midStocks && lowStocks < midStocks.p, lowStocks + ' < ' + (midStocks && midStocks.p));
  await a.click('#mzaF-assets .mza-clear');
  check('«تفريغ الخانات» في التوزيع الشامل', await a.evaluate(() => document.getElementById('mzaAAmt').value === '' && document.getElementById('mzaAExM').value === 'all' && !document.querySelector('#mzaAEx input:checked') && !document.getElementById('mzaOut').innerHTML.trim()));

  // 4) الفحص: كل الأصول + قطاعات الأسهم في القائمة
  await a.click('.mza-mode[data-m="check"]'); await a.waitForFunction(() => document.querySelectorAll('#mzaCRows .mza-row').length >= 3, null, { timeout: 30000 });
  const opts = await a.evaluate(() => [...document.querySelector('#mzaCRows select').options].map(o => o.value));
  check('فحص توزيعتي: القائمة فيها قطاعات الأسهم + كل الأصول الجديدة', opts.some(v => v.startsWith('s:')) && ['a:daily_bank', 'a:savings', 'a:money_funds', 'a:fixed_funds', 'a:equity_funds', 'a:realestate', 'a:gold', 'a:expenses', 'a:cds'].every(k => opts.includes(k)), opts.filter(v => v.startsWith('a:')).join(','));
  await a.evaluate(() => { const box = document.getElementById('mzaCRows'); box.innerHTML = ''; });
  await a.evaluate(() => { const add = (k, v) => { document.getElementById('mzaCAdd').click(); const r = [...document.querySelectorAll('#mzaCRows .mza-row')].pop(); r.querySelector('select').value = k; r.querySelector('input').value = v; };
    add('a:money_funds', 20000); add('a:daily_bank', 10000); add('a:equity_funds', 30000); add('a:fixed_funds', 15000); });
  await a.click('#mzaCGo'); await a.waitForSelector('#mzaOut .mz-gauge', { timeout: 20000 }).catch(() => {});
  const ck = await a.evaluate(() => [...document.querySelectorAll('#mzaOut .mza-table tbody tr')].map(r => r.cells[0].textContent.trim()).join(' | '));
  check('فحص توزيعتي بالأصول الجديدة (نقدية + حساب يومي + صناديق أسهم + دخل ثابت)', /صناديق نقدية/.test(ck) && /بعوائد يومية/.test(ck) && /صناديق أسهم/.test(ck) && /دخل ثابت/.test(ck), ck);
  await a.click('#mzaF-check .mza-clear');
  check('«تفريغ الخانات» في الفحص ← بند واحد فاضي', await a.evaluate(() => { const r = document.querySelectorAll('#mzaCRows .mza-row'); return r.length === 1 && r[0].querySelector('input').value === ''; }));

  // 5) تنبيهات الرئيسية: «خطة السهم» بس للسهم اللي ليه خطة
  q(`DELETE FROM user_alerts WHERE account_email='${ADMIN}'`);
  q(`INSERT INTO user_alerts (account_email, title, body, symbol, market) VALUES ('${ADMIN}', 'تنبيه خطة', 'نص', 'PLNX', 'مصر'), ('${ADMIN}', 'تنبيه بدون خطة', 'نص', 'NOPLX', 'مصر')`);
  await a.evaluate(async () => { const e = await getSession(), g = await getPlans(e); g.PLNX = { market:'مصر', listed:false, capital:10000, dropPercent:5, volumeIncrease:10, profitTarget:5, currentPrice:40, seedAmount:400, levels: [], closedTrades:[] }; await savePlans(e, g); });
  await a.evaluate(() => renderHome()); await a.waitForSelector('.gs-alert-row', { timeout: 20000 }).catch(() => {});
  const al = await a.evaluate(() => [...document.querySelectorAll('.gs-alert-row')].map(r => ({ t: r.querySelector('b').textContent, plan: !!r.querySelector('[data-plan-sym]'), page: !!r.querySelector('[data-sym]') })));
  const withP = al.find(x => x.t === 'تنبيه خطة'), noP = al.find(x => x.t === 'تنبيه بدون خطة');
  check('تنبيه سهم ليه خطة ← «صفحة السهم» + «خطة السهم»', withP && withP.plan && withP.page, JSON.stringify(al));
  check('تنبيه سهم من غير خطة ← «صفحة السهم» بس', noP && !noP.plan && noP.page, JSON.stringify(noP));
  await a.click('.gs-alert-row [data-plan-sym="PLNX"]'); await a.waitForTimeout(2000);
  check('«خطة السهم» بتفتح تفاصيل الخطة', await a.evaluate(() => window.__lastPageKey !== 'home' && /PLNX/.test(document.getElementById('app').textContent)), await a.evaluate(() => window.__lastPageKey));
  await a.evaluate(async () => { const e = await getSession(), g = await getPlans(e); delete g.PLNX; await savePlans(e, g); });
  q(`DELETE FROM user_alerts WHERE account_email='${ADMIN}'`);

  // 6) الموبايل: الجداول كروت (اسم الخانة جنب القيمة) من غير تمرير أفقي
  const m = await page(b, { width: 390, height: 844 }); await loginAdmin(m);
  await m.evaluate(() => renderMizanAi()); await m.waitForFunction(() => document.querySelectorAll('#mzaSEx .mza-ms-opt').length >= 3, null, { timeout: 60000 }).catch(() => {});
  await m.click('#mzaSRisk button[data-v="low"]'); await m.click('#mzaSGo'); await m.waitForSelector('#mzaOut .mza-table', { timeout: 30000 }).catch(() => {});
  const mc = await m.evaluate(() => { const t = document.querySelector('#mzaOut .mza-table'), td = t.tBodies[0].rows[0].cells[1];
    return { cards: t.classList.contains('g-cards'), head: getComputedStyle(t.tHead).display, lbl: td.getAttribute('data-label'), before: getComputedStyle(td, '::before').content, ov: document.documentElement.scrollWidth - window.innerWidth }; });
  check('الموبايل: جدول ميزان كروت + اسم كل خانة ظاهر جنب القيمة', mc.cards && mc.head === 'none' && mc.lbl === 'النسبة' && /النسبة/.test(mc.before), JSON.stringify(mc));
  check('الموبايل: مفيش تمرير أفقي', mc.ov <= 1, mc.ov);
  // الإصدار 124: على الموبايل كود الشركة بس — الاسم بيظهر لما تقف عليه (ماوس / ضغطة طويلة)
  const co = await m.evaluate(() => { const b = document.querySelector('.mza-co-open'), nm = b.querySelector('.g-coname'), sy = b.querySelector('.mza-co-sym');
    return { name: getComputedStyle(nm).display, sym: getComputedStyle(sy).display, code: sy.textContent, coname: b.getAttribute('data-coname') }; });
  check('الموبايل: الشركة المرشحة بالكود بس (الاسم مستخبي)', co.name === 'none' && co.sym !== 'none' && co.code && co.coname, JSON.stringify(co));
  await m.evaluate(() => document.querySelector('.mza-co-open').scrollIntoView({ block: 'center' })); await m.waitForTimeout(300); await m.hover('.mza-co-open'); await m.waitForTimeout(200);
  const tip = await m.evaluate(() => { const t = document.querySelector('.g-cotip'); return t && !t.hidden ? t.textContent : ''; });
  check('الوقوف على الكود ← اسم الشركة بيظهر في فقاعة', tip && tip === co.coname, tip);
  await m.evaluate(async () => { const r = await MK.get('action=watchlist'); for (const x of (r.items || [])) await MK.post({ action: 'watch_remove', id: x.id }); await MK.post({ action: 'watch_add', symbol: 'COMI', market: 'مصر' }); });
  await m.evaluate(() => renderWatchlistPage()); await m.waitForSelector('#wlRows [data-coname]', { timeout: 20000 }).catch(() => {});
  const wl = await m.evaluate(() => { const c = document.querySelector('#wlRows .g-coname'), d = document.querySelector('#wlRows [data-coname]'); return { hidden: c ? getComputedStyle(c).display === 'none' : false, n: d ? d.getAttribute('data-coname') : '' }; });
  check('الموبايل: قائمة المتابعة بالكود بس + الاسم في data-coname', wl.hidden && /COMI/.test(wl.n || ''), JSON.stringify(wl));
  await m.evaluate(async () => { const r = await MK.get('action=watchlist'); for (const x of (r.items || [])) await MK.post({ action: 'watch_remove', id: x.id }); });
  check('بدون أخطاء JavaScript', !a.__errors.length && !m.__errors.length, a.__errors[0] || m.__errors[0]);
  q("DELETE FROM site_config WHERE config_key IN ('basira_cfg','basira_ai_key','mizanai_cfg')");
  q("DELETE FROM site_config WHERE config_key = 'ai_paid_on'"); await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
