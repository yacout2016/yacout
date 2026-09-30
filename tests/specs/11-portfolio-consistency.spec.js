// الإصدار 91: أرقام المحفظة متطابقة في الرئيسية (البطاقة + المنحنى) وشاشة المحفظة والتقارير - كلها بسعر السوق
// + قائمة استثماراتي: فلتر (المفتوحة افتراضيًا / المغلقة / الكل) + 5 صفوف والباقي تمرير + زرار عرض الكل / إغلاق
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
const num = (t) => { const m = String(t || '').replace(/[⁦⁩]/g, '').match(/-?[\d,]+(\.\d+)?/); return m ? +m[0].replace(/,/g, '') : NaN; };
(async () => {
  require('fs').rmSync(require('os').tmpdir() + '/griffine_quotes', { recursive: true, force: true });
  const b = await launch(); const p = await page(b, { width: 1280, height: 1000 }); await loginAdmin(p);
  await p.evaluate(async () => { try { sessionStorage.removeItem('gs_livepx'); localStorage.removeItem('gs_hold_filter'); } catch(e){}
    const g = await apiGet('/user_data_get.php?key=plans'); const m = {};
    // CRVX-2 → أسعار CRVX (12) ، COMI (80): اشترى 100@10 و100@9 وباع 50@12 / اشترى 10@70
    m['CRVX-2'] = { market:'مصر', levels:[{ level:1, executed:true, actualQty:100, actualPrice:10, execDate:'2026-07-01', sells:[] }, { level:2, executed:true, actualQty:100, actualPrice:9, execDate:'2026-08-01', sells:[{ qty:50, price:12, date:'2026-09-01' }] }], closedTrades:[] };
    m['COMI'] = { market:'مصر', levels:[{ level:1, executed:true, actualQty:10, actualPrice:70, execDate:'2026-08-10', sells:[] }], closedTrades:[] };
    for (let i = 1; i <= 6; i++) m['OPN' + i] = { market:'مصر', levels:[{ level:1, executed:true, actualQty:1, actualPrice:10, execDate:'2026-09-10', sells:[] }], closedTrades:[] };
    for (let i = 1; i <= 2; i++) m['CLS' + i] = { market:'مصر', currentPrice:5, capital:100, seedAmount:50, dropPercent:5, volumeIncrease:0, profitTarget:5, levels:[{ level:1, executed:false, sells:[] }], closedTrades:[{ closedDate:'2026-08-01', totalQty:10, avgEntry:5, avgExit:6, profit:10, capitalUsed:50 }] };
    await apiPost('/user_data_save.php', { key:'plans', value: JSON.stringify(m), base: JSON.stringify(g.versions || {}) });
    const gg = await apiGet('/user_data_get.php?key=grid_plans'); await apiPost('/user_data_save.php', { key:'grid_plans', value: '{}', base: JSON.stringify(gg.versions || {}) }); });
  await p.evaluate(() => renderHome()); await p.waitForTimeout(7000);
  const heroV = num(await p.textContent('#gsHero .gs-hero-value'));
  const stats = await p.$$eval('#gsHero .gs-hero-stats div', d => d.map(x => x.textContent));
  const heroCost = num(stats.find(t => t.includes('تكلفة')).replace('تكلفة المراكز المفتوحة', ''));
  const curveTxt = (await p.textContent('#gsCurve')).replace(/[⁦⁩]/g, '');
  const curveV = num(curveTxt.split('أداء إجمالي المحفظة')[1].split(')')[1]);
  const curveCost = num(curveTxt.split('مقابل المستثمر')[1]);
  // المتوقع: OPN (6×10=60 تكلفة، ملهاش سعر سوق ← آخر سعر شراء 10) + CRVX 150×12=1800 (تكلفة 1425) + COMI 10×80=800 (تكلفة 700)
  check('الرئيسية: القيمة بسعر السوق = 2,660', Math.abs(heroV - 2660) < 0.01, heroV);
  check('الرئيسية: تكلفة المراكز المفتوحة = 2,185', Math.abs(heroCost - 2185) < 0.01, heroCost);
  check('المنحنى: آخر نقطة = البطاقة (القيمة والتكلفة)', Math.abs(curveV - heroV) < 0.01 && Math.abs(curveCost - heroCost) < 0.01, `${curveV} / ${curveCost}`);
  // استثماراتي
  const rows = () => p.locator('#gsHoldings .gs-row').count();
  // الإصدار 100: كل الصفوف في القائمة - 5 ظاهرين والباقي تمرير (من غير زرار عرض الكل)
  const vis = () => p.evaluate(() => { const box = document.querySelector('.gs-hold-list'); const bb = box.getBoundingClientRect().bottom + 1; return [...box.querySelectorAll('.gs-row')].filter(r => r.getBoundingClientRect().bottom <= bb).length; });
  await p.waitForTimeout(500);
  check('استثماراتي: الافتراضي «المفتوحة» (8 صفوف: 5 ظاهرين والباقي تمرير)', await p.inputValue('#gsHoldFilter') === 'open' && await rows() === 8 && await vis() === 5, await vis());
  await p.selectOption('#gsHoldFilter', 'closed'); await p.waitForTimeout(300);
  check('فلتر «المغلقة»', await rows() === 2);
  await p.selectOption('#gsHoldFilter', 'all'); await p.waitForTimeout(600);
  check('فلتر «الكل» (10 خطط، 5 ظاهرين والباقي تمرير)', await rows() === 10 && await vis() === 5);
  // الإصدار 102: تمرير حقيقي بعجلة الماوس (مش scrollTop من الكود - ده كان بيشتغل حتى مع overflow:hidden)
  const hb = await p.locator('.gs-hold-list').boundingBox();
  await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.mouse.wheel(0, 400); await p.waitForTimeout(400);
  const wheel = await p.evaluate(() => { const b = document.querySelector('.gs-hold-list'); return { top: b.scrollTop, ov: getComputedStyle(b).overflowY, hint: !!document.querySelector('.gs-hold-more') }; });
  check('«الكل»: القائمة بتتحرك بعجلة الماوس لتحت + تلميح التمرير', wheel.top > 0 && wheel.ov === 'auto' && wheel.hint, JSON.stringify(wheel));
  await p.mouse.wheel(0, -400); await p.waitForTimeout(400);
  check('وبترجع لفوق', await p.evaluate(() => document.querySelector('.gs-hold-list').scrollTop) === 0);
  // نفس الكلام على شاشة موبايل (الفلتر «الكل» محفوظ)
  await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => renderHome()); await p.waitForTimeout(3500);
  const mob = await p.evaluate(() => { const box = document.querySelector('.gs-hold-list'); const bb = box.getBoundingClientRect().bottom + 1; const rs = [...box.querySelectorAll('.gs-row')];
    box.scrollTop = 9999; const scrolled = box.scrollTop > 0; box.scrollTop = 0; return { rows: rs.length, vis: rs.filter(r => r.getBoundingClientRect().bottom <= bb).length, scrolled }; });
  check('موبايل + «الكل»: 10 صفوف، 5 ظاهرين والباقي تمرير لفوق وتحت', mob.rows === 10 && mob.vis === 5 && mob.scrolled, JSON.stringify(mob));
  await p.setViewportSize({ width: 1366, height: 900 });
  // شاشة المحفظة والتقارير
  await p.evaluate(() => renderPortfolio()); await p.waitForTimeout(4000);
  const cards = await p.$$eval('#topSummaryCards .summary-card', d => d.map(x => x.textContent.replace(/\s+/g, ' ')));
  const pCost = num(cards.find(t => t.includes('تكلفة المراكز المفتوحة')));
  const pVal = num(cards.find(t => t.includes('قيمة المحفظة الحالية')));
  check('المحفظة والتقارير = الرئيسية (القيمة والتكلفة)', Math.abs(pVal - heroV) < 0.01 && Math.abs(pCost - heroCost) < 0.01, `${pVal} / ${pCost}`);
  const tot = await p.evaluate(() => { const r = document.querySelector('#portfolioTable tr.gs-total-row') || document.querySelector('#portfolioTable tbody tr:last-child'); return [...r.cells].map(x => x.textContent); });
  check('إجمالي جدول المحفظة = الرئيسية', Math.abs(num(tot[3]) - heroCost) < 0.01 && Math.abs(num(tot[4]) - heroV) < 0.01, tot.slice(3, 5).join(' / '));
  // الإصدار 110: جدول المحفظة 7 صفوف والباقي تمرير + الرأس ثابت + صف الإجمالي ثابت تحت
  await p.evaluate(() => document.getElementById('portfolioTable').closest('.gs-tscroll').scrollIntoView());
  const ptb = await p.locator('#portfolioTable').boundingBox();
  await p.mouse.move(ptb.x + ptb.width / 2, ptb.y + 200); await p.mouse.wheel(0, 250); await p.waitForTimeout(400);
  const pt = await p.evaluate(() => { const t = document.getElementById('portfolioTable'), w = t.closest('.gs-tscroll'), wr = w.getBoundingClientRect(), hr = t.tHead.getBoundingClientRect();
    const data = [...t.tBodies[0].rows].filter(r => !r.classList.contains('gs-total-row')), tr = t.querySelector('tr.gs-total-row');
    w.scrollTop = 0; const vis0 = data.filter(r => r.getBoundingClientRect().bottom <= (tr ? tr.getBoundingClientRect().top : wr.bottom) + 1).length;
    return { limit: w.classList.contains('gs-rows-limit'), rows: data.length, vis: vis0, headTop: Math.round(hr.top - wr.top), total: !!tr && tr.getBoundingClientRect().bottom <= wr.bottom + 1 }; });
  const scrolledP = await p.evaluate(() => true);
  check('جدول المحفظة: 7 صفوف ظاهرين والباقي تمرير + صف الإجمالي ظاهر تحت', pt.limit && pt.rows > 7 && pt.vis === 7 && pt.total, JSON.stringify(pt));
  // الإصدار 110: حالة الخطة جنب نوعها + الضغط على اسم السهم يفتح خطته
  const stp = await p.evaluate(() => { const r = document.querySelector('#portfolioTable tbody tr'); return { badge: !!r.cells[1].querySelector('.g-st'), label: (r.cells[1].querySelector('.g-st') || {}).textContent, link: !!r.cells[0].querySelector('a.g-plan-link'), sym: (r.cells[0].querySelector('a') || {}).textContent, kind: (r.cells[0].querySelector('a') || {}).dataset && r.cells[0].querySelector('a').dataset.kind }; });
  check('جدول المحفظة: حالة الخطة جنب نوعها (مفتوحة / مغلقة / لم تبدأ)', stp.badge && /مفتوحة|مغلقة|لم تبدأ/.test(stp.label), JSON.stringify(stp));
  await p.evaluate(() => document.querySelector('#portfolioTable tbody tr a.g-plan-link').scrollIntoView({ block: 'center' }));
  await p.click('#portfolioTable tbody tr a.g-plan-link'); await p.waitForTimeout(2500);
  const scr = await p.evaluate(() => ({ s: GShell.currentScreen, a: (GShell.screenArgs || [])[0] }));
  check('الضغط على اسم السهم في المحفظة بيفتح خطته', (scr.s === 'renderPlanDetail' || scr.s === 'renderGridPlanDetail') && scr.a === stp.sym, JSON.stringify(scr));
  await p.evaluate(() => renderPortfolio()); await p.waitForTimeout(2500);
  await p.evaluate(async () => { const g = await apiGet('/user_data_get.php?key=plans'); await apiPost('/user_data_save.php', { key:'plans', value: '{}', base: JSON.stringify(g.versions || {}) }); });
  q("DELETE FROM trash_bin");
  check('بدون أخطاء JavaScript', !p.__errors.length, p.__errors[0]);
  await b.close(); process.exit(summary());
})();
