// الإصدار 112: جدول المستويات الجديد (DCA + Grid)
//   كل معلومة في عمود لوحدها + كل رقم برقمين بعد العلامة جوه خانته + أزرار (شراء / بيع / ✎ / 🗑) بنافذة إدخال
//   + عمليات البيع في سطور تحت المستوى (▸) بتعديل/حذف + الترتيب والفلتر مبيفصلوش البيع عن مستواه + صف الإجمالي
const { check, summary, launch, page, loginAdmin } = require('../lib');
(async () => {
  const b = await launch(); const a = await page(b, { width: 1366, height: 900 }); await loginAdmin(a);
  const old = await a.evaluate(async () => {
    window.gConfirm = async () => true;
    const d = await apiGet('/user_data_get.php?key=plans'), g = await apiGet('/user_data_get.php?key=grid_plans');
    const lv = [{ level: 1, executed: true, actualQty: 20, actualPrice: 125, execDate: '2026-09-01', sells: [{ qty: 5, price: 131.456, date: '2026-09-05' }] },
                { level: 2, executed: true, actualQty: 22, actualPrice: 118.75, execDate: '2026-09-08', sells: [] }];
    for (let i = 3; i <= 10; i++) lv.push({ level: i, executed: false, sells: [] });
    await apiPost('/user_data_save.php', { key: 'plans', value: JSON.stringify({ COMI: { symbol: 'COMI', market: 'مصر', currency: 'جنيه مصري', currentPrice: 125, capital: 60000, seedAmount: 2500, dropPercent: 5, volumeIncrease: 5, profitTarget: 2, startDate: '2026-09-01', levels: lv, closedTrades: [] } }), base: JSON.stringify(d.versions || {}) });
    const L = []; const step = 0.5; for (let i = 0; i < 10; i++) L.push({ plannedPrice: +(22.5 - step * i).toFixed(4), plannedQty: 45.5, status: 'empty', sells: [], cycles: 0 });
    Object.assign(L[0], { status: 'bought', executedQty: 6.56, executedPrice: 22, executedDate: '2026-09-20', sellTargetPrice: 22.5, sells: [{ qty: 10, price: 22.073, date: '2026-09-22' }] });
    Object.assign(L[1], { status: 'bought', executedQty: 30, executedPrice: 21, executedDate: '2026-09-21', sellTargetPrice: 21.5 });
    await apiPost('/user_data_save.php', { key: 'grid_plans', value: JSON.stringify({ HRHO: { symbol: 'HRHO', market: 'مصر', capital: 5000, tradeSize: 500, rangeLow: 17.5, rangeHigh: 23, step, createdAt: '2026-09-01', cycleHistory: [], closedTrades: [], manualExits: [], levels: L } }), base: JSON.stringify(g.versions || {}) });
    return { d: d.value || '{}', g: g.value || '{}' };
  });
  const T = (id) => a.evaluate((id) => {
    const t = document.getElementById(id);
    const heads = [...t.tHead.rows[0].cells].map(c => c.childNodes[0] ? c.childNodes[0].textContent.trim() : '');
    const nums = [...t.querySelectorAll('td.glv-n')].map(c => c.textContent.trim());
    const bad = nums.filter(x => x !== '—' && !/^\d{4}-\d{2}-\d{2}$/.test(x) && !/^[+\-−]?[\d,]+(\.\d{2})?$/.test(x));
    return { heads, bad, boxes: t.querySelectorAll('.trade-group, .sell-line, .info, .success-banner, input').length - t.querySelectorAll('.g-filter-row input').length };
  }, id);
  const openModal = async (sel) => { await a.click(sel); await a.waitForTimeout(250); return a.evaluate(() => !document.getElementById('glvOv').hidden); };
  const fill = async (q, p) => { if (q != null) await a.fill('#glvMQ', String(q)); if (p != null) await a.fill('#glvMP', String(p)); };
  const save = async () => { await a.click('#glvMOk'); await a.waitForTimeout(1800); };
  const plan = () => a.evaluate(async () => (await getPlans(await getSession())).COMI);
  const grid = () => a.evaluate(async () => (await getGridPlans(await getSession())).HRHO);

  /* ============ DCA ============ */
  await a.evaluate(() => renderPlanDetail('COMI')); await a.waitForTimeout(2500);
  let t = await T('levelsTable');
  check('DCA: الأعمدة الجديدة (كل معلومة في عمود)', t.heads.join('|') === 'المستوى|الحالة|سعر الشراء|عدد الأسهم|قيمة الشراء|الكمية المباعة|متوسط سعر البيع|الكمية المتبقية|المتبقي تراكمي|متوسط التكلفة تراكمي|هدف البيع تراكمي|الربح المحقق|الربح المحقق تراكمي|ربح/خسارة على آخر سعر|تاريخ الشراء|الأيام المنقضية|تاريخ غلق الصفقة|إجراءات', t.heads.join('|'));
  check('DCA: مفيش مستطيلات شرح ولا خانات إدخال جوه الجدول', t.boxes === 0, t.boxes);
  check('DCA: كل الأرقام برقمين بعد العلامة', t.bad.length === 0, t.bad.slice(0, 5).join(' , '));
  const r1 = await a.evaluate(() => { const r = document.querySelector('#levelsTable tr[data-lv="0"]'); const c = [...r.cells].map(x => x.textContent.trim()); return c; });
  check('DCA: متوسط سعر البيع 131.46 (مش 131.456) + الكمية المباعة 5 + المتبقي 15', r1[6] === '131.46' && r1[5] === '5' && r1[7] === '15', r1.slice(2, 9).join(' | '));
  const acts = await a.evaluate(() => [0, 1, 2, 3].map(i => [...document.querySelectorAll(`#levelsTable tr[data-lv="${i}"] .glv-acts button`)].map(b => b.textContent.trim() + (b.disabled ? '(x)' : '')).join(',')));
  check('DCA: الإجراءات لكل مستوى (بيع ✎ 🗑 / شراء القادم بس)', acts[0] === 'بيع,✎,🗑(x)' && acts[1] === 'بيع,✎,🗑' && acts[2] === 'شراء' && acts[3] === 'شراء(x)', acts.join(' ; '));
  const st = await a.evaluate(() => { const t = document.getElementById('levelsTable'), r = t.tBodies[0].rows[0]; return [getComputedStyle(r.cells[0]).position, getComputedStyle(r.cells[r.cells.length - 1]).position]; });
  check('DCA: أول عمود وعمود الإجراءات ثابتين', st[0] === 'sticky' && st[1] === 'sticky', st.join(','));
  // صف الإجمالي + الربح على آخر سعر (سعر تجربة 100)
  await a.evaluate(() => { const i = document.getElementById('manualLastPriceInput'); i.closest('details').open = true; });
  await a.fill('#manualLastPriceInput', '100'); await a.waitForTimeout(250);
  const tot = await a.evaluate(() => { const r = [...document.querySelectorAll('#levelsTable tr')].find(x => /^الإجمالي$/.test(x.cells[0].textContent.trim())); return r ? { bq: r.cells[3].textContent.trim(), rem: r.cells[7].textContent.trim(), un: r.cells[13].textContent.trim(), lv1: document.querySelector('#levelsTable tr[data-lv="0"] td.lv-unreal').textContent.trim() } : null; });
  check('DCA: صف الإجمالي (كمية الشراء 42 + المتبقي 37)', tot && tot.bq === '42' && tot.rem === '37', JSON.stringify(tot));
  check('DCA: ربح/خسارة على آخر سعر للمستوى (−375.00) والإجمالي (−787.50)', tot && tot.lv1 === '-375.00' && tot.un === '-787.50', JSON.stringify(tot));
  await a.fill('#manualLastPriceInput', ''); await a.waitForTimeout(150);

  // فتح عمليات البيع
  const sub0 = await a.evaluate(() => { const s = document.querySelector('#levelsTable tr.g-subrow[data-sub-of="0"]'); return s ? getComputedStyle(s).display : 'none-found'; });
  await a.click('#levelsTable [data-glv-exp="0"]'); await a.waitForTimeout(150);
  const sub1 = await a.evaluate(() => { const s = document.querySelector('#levelsTable tr.g-subrow[data-sub-of="0"]'); return { d: getComputedStyle(s).display, cells: [...s.cells].map(c => c.textContent.trim()), btns: [...s.querySelectorAll('button')].map(b => b.textContent.trim()).join(',') }; });
  check('DCA: عمليات البيع مقفولة في الأول', sub0 === 'none');
  check('DCA: ▸ بيفتح سطر البيع بنفس الأعمدة (الكمية 5 — السعر 131.46) + ✎ 🗑', sub1.d !== 'none' && sub1.cells[5] === '5' && sub1.cells[6] === '131.46' && sub1.btns === '✎,🗑', JSON.stringify(sub1));

  // بيع من النافذة (المستوى 2) - أكتر من المتاح مرفوض
  check('DCA: زرار بيع بيفتح نافذة', await openModal('#levelsTable tr[data-lv="1"] button[data-gcall="__sellAtLevel"]'));
  await fill(999, 125.5); await a.click('#glvMOk'); await a.waitForTimeout(200);
  check('DCA: كمية أكبر من المتاح ← رسالة خطأ والنافذة مفتوحة', /أقصى كمية/.test(await a.textContent('#glvME')) && await a.evaluate(() => !document.getElementById('glvOv').hidden));
  await fill(10, 125.5); await save();
  let P = await plan();
  check('DCA: البيع اتسجل (10 × 125.50)', P.levels[1].sells.length === 1 && P.levels[1].sells[0].qty === 10 && P.levels[1].sells[0].price === 125.5, JSON.stringify(P.levels[1].sells));
  check('DCA: بعد البيع سطر العملية ظاهر تحت المستوى', await a.evaluate(() => { const s = document.querySelector('#levelsTable tr.g-subrow[data-sub-of="1"]'); return !!s && getComputedStyle(s).display !== 'none'; }));
  // تعديل البيع
  await openModal('#levelsTable tr.g-subrow[data-sub-of="1"] button[data-gcall="__startEditSell"]');
  check('DCA: نافذة تعديل البيع فيها القيم الحالية', await a.evaluate(() => document.getElementById('glvMQ').value === '10' && document.getElementById('glvMP').value === '125.5'));
  await fill(8, 126); await save(); P = await plan();
  check('DCA: تعديل البيع (8 × 126)', P.levels[1].sells[0].qty === 8 && P.levels[1].sells[0].price === 126, JSON.stringify(P.levels[1].sells));
  // حذف البيع
  await a.evaluate(() => { window.gConfirm = async () => true; });
  await a.click('#levelsTable tr.g-subrow[data-sub-of="1"] button[data-gcall="__removeSell"]'); await a.waitForTimeout(1800); P = await plan();
  check('DCA: حذف البيع', P.levels[1].sells.length === 0);
  // شراء المستوى القادم من النافذة + تعديله + حذفه
  await openModal('#levelsTable tr[data-lv="2"] button[data-gcall="__buyLevel"]');
  const pre = await a.evaluate(() => ({ q: document.getElementById('glvMQ').value, p: document.getElementById('glvMP').value }));
  check('DCA: نافذة الشراء بالكمية والسعر المخططين (السعر برقمين)', +pre.q > 0 && /^\d+(\.\d{1,2})?$/.test(pre.p), JSON.stringify(pre));
  await fill(24, 112.5); await save(); P = await plan();
  check('DCA: الشراء اتسجل (24 × 112.50)', P.levels[2].executed && P.levels[2].actualQty === 24 && P.levels[2].actualPrice === 112.5, JSON.stringify(P.levels[2]));
  await openModal('#levelsTable tr[data-lv="2"] button[data-gcall="__startEditBuy"]'); await fill(25, null); await save(); P = await plan();
  check('DCA: تعديل الشراء (25)', P.levels[2].actualQty === 25);
  await a.evaluate(() => { window.gConfirm = async () => true; });
  await a.click('#levelsTable tr[data-lv="2"] button[data-gcall="__deleteBuy"]'); await a.waitForTimeout(1800); P = await plan();
  check('DCA: حذف آخر شراء', !P.levels[2].executed);
  // الترتيب والفلتر مبيفصلوش البيع عن مستواه
  await a.evaluate(() => renderPlanDetail('COMI')); await a.waitForTimeout(2000);
  await a.evaluate(() => { const th = [...document.querySelectorAll('#levelsTable thead tr:first-child th')].find(x => /^سعر الشراء/.test(x.textContent.trim())); th.click(); th.click(); });
  await a.waitForTimeout(200);
  const glued = await a.evaluate(() => [...document.querySelectorAll('#levelsTable tr.g-subrow')].every(s => { let p = s.previousElementSibling; while (p && p.classList.contains('g-subrow')) p = p.previousElementSibling; return p && p.dataset.lv === s.dataset.subOf; }));
  check('DCA: بعد الترتيب سطور البيع لسه تحت مستواها', glued);
  const fsel = await a.evaluate(() => { const s = [...document.querySelectorAll('#levelsTable .g-filter-row select')].find(x => [...x.options].some(o => o.textContent === 'تم الشراء')); if (!s) return null;
    s.value = 'تم الشراء'; s.dispatchEvent(new Event('change')); const vis = [...document.querySelectorAll('#levelsTable tbody tr[data-lv]')].filter(r => r.style.display !== 'none').map(r => r.dataset.lv);
    const subHidden = [...document.querySelectorAll('#levelsTable tr.g-subrow[data-sub-of="0"]')].every(x => x.style.display === 'none'); s.value = ''; s.dispatchEvent(new Event('change')); return { vis, subHidden }; });
  check('DCA: فلتر الحالة (قائمة) ← «تم الشراء» بس + سطور بيع المستوى المستخبي بتستخبى', fsel && fsel.vis.join(',') === '1' && fsel.subHidden, JSON.stringify(fsel));
  await a.click('#toggleDatesBtn'); await a.waitForTimeout(100);
  check('DCA: أعمدة التواريخ بتظهر بالزرار', await a.evaluate(() => !document.getElementById('levelsTable').classList.contains('dates-hidden')));

  /* ============ Grid ============ */
  await a.evaluate(() => { window.gConfirm = async () => true; renderGridPlanDetail('HRHO'); }); await a.waitForTimeout(2500);
  t = await T('gridLevelsTable');
  check('Grid: الأعمدة الجديدة', t.heads.join('|') === 'المستوى|السعر المخطط|الكمية الإرشادية|الحالة|كمية الشراء|سعر الشراء|قيمة الشراء|هدف البيع|الكمية المباعة|متوسط سعر البيع|الكمية المتبقية|المتبقي تراكمي|متوسط التكلفة تراكمي|الربح المحقق|ربح/خسارة على آخر سعر|دورات|تاريخ الشراء|آخر بيع|إجراءات', t.heads.join('|'));
  check('Grid: مفيش مستطيلات شرح ولا خانات إدخال جوه الجدول', t.boxes === 0, t.boxes);
  check('Grid: كل الأرقام برقمين بعد العلامة', t.bad.length === 0, t.bad.slice(0, 5).join(' , '));
  const g0 = await a.evaluate(() => [...document.querySelector('#gridLevelsTable tr[data-lv="0"]').cells].map(c => c.textContent.trim()));
  check('Grid: كمية الشراء 16.56 = المتبقي 6.56 + المباع 10 — متوسط البيع 22.07 — الربح 0.73', g0[4] === '16.56' && g0[8] === '10' && g0[10] === '6.56' && g0[9] === '22.07' && g0[13] === '+0.73', g0.join(' | '));
  // بيع الباقي ← جاهزة للترحيل ← ترحيل
  await openModal('#gridLevelsTable tr[data-lv="0"] button[data-gcall="__gridSellAtLevel"]');
  check('Grid: نافذة البيع بالكمية المتاحة وسعر هدف البيع', await a.evaluate(() => document.getElementById('glvMQ').value === '6.56' && document.getElementById('glvMP').value === '22.5'));
  await save();
  let G = await grid();
  check('Grid: البيع اتسجل والمتبقي صفر', G.levels[0].sells.length === 2 && Math.abs(G.levels[0].executedQty) < 1e-9, JSON.stringify(G.levels[0]));
  const rd = await a.evaluate(() => ({ st: document.querySelector('#gridLevelsTable tr[data-lv="0"] td:nth-child(4)').textContent, b: [...document.querySelectorAll('#gridLevelsTable tr[data-lv="0"] .glv-acts button')].map(x => x.textContent.trim()).join(',') }));
  check('Grid: «اتباعت كلها — جاهزة للترحيل» + زرار ترحيل', /جاهزة للترحيل/.test(rd.st) && rd.b === 'ترحيل,✎,🗑', JSON.stringify(rd));
  await a.click('#gridLevelsTable tr[data-lv="0"] button[data-gcall="__gridArchiveCycle"]'); await a.waitForTimeout(1800); G = await grid();
  check('Grid: الترحيل ← صفقة مغلقة + المستوى فاضي + دورة', G.closedTrades.length === 1 && G.levels[0].status === 'empty' && G.levels[0].cycles === 1, JSON.stringify({ c: G.closedTrades.length, s: G.levels[0].status }));
  // شراء أكبر من رأس المال مرفوض
  await openModal('#gridLevelsTable tr[data-lv="2"] button[data-gcall="__gridBuyLevel"]');
  await fill(100000, 21.5); await a.click('#glvMOk'); await a.waitForTimeout(1200);
  check('Grid: شراء أكبر من رأس المال ← رسالة خطأ', /رأس المال/.test(await a.textContent('#glvME')));
  await fill(40, 21.5); await save(); G = await grid();
  check('Grid: الشراء اتسجل + هدف البيع = السعر + الخطوة', G.levels[2].status === 'bought' && G.levels[2].executedQty === 40 && G.levels[2].sellTargetPrice === 22, JSON.stringify(G.levels[2]));
  // تعديل الشراء + بيع جزئي + تعديل الشراء لأقل من المباع مرفوض
  await openModal('#gridLevelsTable tr[data-lv="1"] button[data-gcall="__gridSellAtLevel"]'); await fill(10, 21.6); await save();
  await openModal('#gridLevelsTable tr[data-lv="1"] button[data-gcall="__gridStartEditBuy"]');
  check('Grid: تعديل الشراء بيعرض كمية الشراء الأصلية (30)', await a.evaluate(() => document.getElementById('glvMQ').value === '30'));
  await fill(5, null); await a.click('#glvMOk'); await a.waitForTimeout(300);
  check('Grid: كمية شراء أقل من المباع مرفوضة', /أو أكتر/.test(await a.textContent('#glvME')));
  await fill(35, null); await save(); G = await grid();
  check('Grid: تعديل الشراء (35) ← المتبقي 25', G.levels[1].executedQty === 25, G.levels[1].executedQty);
  // تعديل وحذف البيع
  await a.click('#gridLevelsTable [data-glv-exp="1"]').catch(() => {}); await a.waitForTimeout(100);
  await a.evaluate(() => { const s = document.querySelector('#gridLevelsTable tr.g-subrow[data-sub-of="1"]'); if (s && getComputedStyle(s).display === 'none') document.querySelector('#gridLevelsTable [data-glv-exp="1"]').click(); });
  await openModal('#gridLevelsTable tr.g-subrow[data-sub-of="1"] button[data-gcall="__gridStartEditSell"]'); await fill(12, null); await save(); G = await grid();
  check('Grid: تعديل البيع (12) ← المتبقي 23', G.levels[1].sells[0].qty === 12 && G.levels[1].executedQty === 23, JSON.stringify(G.levels[1]));
  await a.evaluate(() => { window.gConfirm = async () => true; });
  await a.click('#gridLevelsTable tr.g-subrow[data-sub-of="1"] button[data-gcall="__gridRemoveSell"]'); await a.waitForTimeout(1800); G = await grid();
  check('Grid: حذف البيع ← الكمية ترجع (35)', G.levels[1].sells.length === 0 && G.levels[1].executedQty === 35, JSON.stringify(G.levels[1]));
  await a.click('#gridToggleDatesBtn'); await a.waitForTimeout(100);
  check('Grid: زرار أعمدة التواريخ', await a.evaluate(() => !document.getElementById('gridLevelsTable').classList.contains('dates-hidden')));
  const gt = await a.evaluate(() => { const r = [...document.querySelectorAll('#gridLevelsTable tr')].find(x => /^الإجمالي$/.test(x.cells[0].textContent.trim())); return r ? r.cells[10].textContent.trim() : null; });
  check('Grid: صف الإجمالي (الكمية المتبقية 75)', gt === '75', gt);

  // الموبايل: الصفحة مبتتمدّش بالعرض والإجراءات ظاهرة
  await a.setViewportSize({ width: 390, height: 800 }); await a.waitForTimeout(400);
  const mb = await a.evaluate(() => { const t = document.getElementById('gridLevelsTable'), w = t.closest('.gs-tscroll'), wb = w.getBoundingClientRect(), r = t.tBodies[0].rows[0], act = r.cells[r.cells.length - 1].getBoundingClientRect();
    return { hs: document.documentElement.scrollWidth > window.innerWidth + 1, actIn: act.left >= wb.left - 1 && act.right <= wb.right + 1 }; });
  check('الموبايل: مفيش تمرير بالعرض للصفحة + عمود الإجراءات ظاهر', !mb.hs && mb.actIn, JSON.stringify(mb));
  check('بدون أخطاء JavaScript', !a.__errors.length, a.__errors[0]);

  await a.evaluate(async (o) => {
    const d = await apiGet('/user_data_get.php?key=plans'); await apiPost('/user_data_save.php', { key: 'plans', value: o.d, base: JSON.stringify(d.versions || {}) });
    const g = await apiGet('/user_data_get.php?key=grid_plans'); await apiPost('/user_data_save.php', { key: 'grid_plans', value: o.g, base: JSON.stringify(g.versions || {}) });
  }, old);
  await b.close(); process.exit(summary());
})();
