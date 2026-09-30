// الإصدار 115:
//   1) نافذة البيع: السعر = آخر سعر (متأخر 15 دقيقة) أوتوماتيك + الربح/الخسارة + تحذير «بيع بخسارة» وضغطة تأكيد + السعر اليدوي
//   2) الهدف بيتكيّف مع السوق: السعر عدّى هدف البيع ← الهدف والربح على سعر السوق (DCA + Grid)
//   3) فحص الخطط في الرئيسية: الهدف اتفعّل / المبلغ المرصود خلص / التركّز 40%
//   4) «ميزان محفظتك AI» (تقرير توزيع التنوع): النسب المالية + القطاعات + الذكاء الاصطناعي + الشركات المرشحة (بصيرة)
const { check, summary, launch, page, loginAdmin, q, ADMIN } = require('../lib');
const http = (u) => fetch(u).then(r => r.json());
(async () => {
  q("DELETE FROM login_attempts");
  q("DELETE FROM site_config WHERE config_key IN ('basira_cfg','basira_ai_key')");
  // أسعار السيرفر متخزنة 5 دقايق (من اختبارات قبل كده) ← نمسحها عشان الأسعار الجديدة تتقري
  try { require('child_process').execSync('find /tmp/griffine_quotes -type f -delete'); } catch(e){}
  await http('http://127.0.0.1:8098/set?sym=COMI&price=140'); await http('http://127.0.0.1:8098/set?sym=HRHO&price=23'); await http('http://127.0.0.1:8098/set?sym=TMGH&price=55');
  const b = await launch(); const a = await page(b, { width: 1366, height: 900 }); await loginAdmin(a);
  const old = await a.evaluate(async () => {
    window.gConfirm = async () => true; try { localStorage.removeItem('gs_livepx2'); } catch(e){}
    const d = await apiGet('/user_data_get.php?key=plans'), g = await apiGet('/user_data_get.php?key=grid_plans');
    const lv = [{ level: 1, executed: true, actualQty: 10, actualPrice: 100, execDate: '2026-09-01', sells: [] }];
    for (let i = 2; i <= 6; i++) lv.push({ level: i, executed: false, sells: [] });
    const tl = [{ level: 1, executed: true, actualQty: 2, actualPrice: 70, execDate: '2026-09-01', sells: [] }, { level: 2, executed: true, actualQty: 2, actualPrice: 65, execDate: '2026-09-05', sells: [] }];
    await apiPost('/user_data_save.php', { key: 'plans', value: JSON.stringify({
      COMI: { symbol: 'COMI', market: 'مصر', currency: 'جنيه مصري', currentPrice: 100, capital: 10000, seedAmount: 1000, dropPercent: 5, volumeIncrease: 0, profitTarget: 5, startDate: '2026-09-01', levels: lv, closedTrades: [] },
      TMGH: { symbol: 'TMGH', market: 'مصر', currency: 'جنيه مصري', currentPrice: 70, capital: 270, seedAmount: 140, dropPercent: 5, volumeIncrease: 0, profitTarget: 5, startDate: '2026-09-01', levels: tl, closedTrades: [] } }), base: JSON.stringify(d.versions || {}) });
    const L = []; for (let i = 0; i < 6; i++) L.push({ plannedPrice: +(20 - 0.5 * i).toFixed(2), plannedQty: 10, status: 'empty', sells: [], cycles: 0 });
    Object.assign(L[0], { status: 'bought', executedQty: 10, executedPrice: 20, executedDate: '2026-09-20', sellTargetPrice: 20.5 });
    Object.assign(L[1], { status: 'bought', executedQty: 10, executedPrice: 19.5, executedDate: '2026-09-21', sellTargetPrice: 20 });
    await apiPost('/user_data_save.php', { key: 'grid_plans', value: JSON.stringify({ HRHO: { symbol: 'HRHO', market: 'مصر', capital: 3000, tradeSize: 200, rangeLow: 17.5, rangeHigh: 21, step: 0.5, createdAt: '2026-09-01', cycleHistory: [], closedTrades: [], manualExits: [], levels: L } }), base: JSON.stringify(g.versions || {}) });
    return { d: d.value || '{}', g: g.value || '{}' };
  });

  /* ============ فحص الخطط في الرئيسية ============ */
  await a.evaluate(() => { try { sessionStorage.clear(); } catch(e){} renderHome(); }); await a.waitForSelector('#gPlanWatch .k-conc', { timeout: 30000 }).catch(() => {});
  const w = await a.evaluate(() => [...document.querySelectorAll('#gPlanWatch .g-watch-it')].map(x => ({ k: x.className.replace(/.*k-/, ''), s: x.dataset.sym, t: x.textContent.replace(/\s+/g, ' ') })));
  const has = (k, s, re) => w.some(x => x.k === k && x.s === s && (!re || re.test(x.t)));
  check('الرئيسية: DCA عدّى الهدف ← الهدف اتفعّل على سعر السوق (ربح فعلي 400 = +40%)', has('up', 'COMI', /ربح فعلي 400\.00 \(\+40\.00%\)/), JSON.stringify(w).slice(0, 300));
  check('الرئيسية: Grid عدّى الهدف في مستويين (ربح فعلي 65 بدل 10)', has('up', 'HRHO', /مستويات[\s\S]*ربح فعلي 65\.00 بدل 10\.00/));
  check('الرئيسية: DCA كل المستويات اتنفذت ← المبلغ المرصود خلص', has('cap', 'TMGH', /المبلغ المرصود/));
  check('الرئيسية: التركّز حسب «النسبة المقترحة» من ميزان المحفظة (مش 40% ثابت) + «يُفضّل تنزل لـ» + ملحوظة مش أمر بيع', has('conc', 'COMI', /من قيمة محفظتك[\s\S]*النسبة المقترحة ليه حسب ميزان المحفظة \d+%[\s\S]*يُفضّل تنزل لـ \d+%[\s\S]*مش أمر بيع/) && !w.some(x => /40%/.test(x.t)), (w.find(x => x.k === 'conc') || {}).t);
  check('الرئيسية: TMGH (قطاع تاني وأقل من نسبته المقترحة) مالوش ملحوظة تركّز', !has('conc', 'TMGH'));
  check('الرئيسية: مفيش حد خسارة / حد حماية في الملاحظات', !w.some(x => /حد (الخسارة|الحماية)|وقف الخسارة/.test(x.t)));

  /* ============ DCA: الهدف + نافذة البيع ============ */
  await a.evaluate(() => { try { localStorage.removeItem('gs_livepx2'); } catch(e){} renderPlanDetail('COMI'); });
  await a.waitForFunction(() => { const n = document.getElementById('dynTargetNote'); return n && !n.hidden; }, null, { timeout: 15000 }).catch(() => {});
  const dt = await a.evaluate(() => ({ v: document.getElementById('statusSellTarget').textContent.trim(), l: document.getElementById('statusSellTargetLbl').textContent, n: document.getElementById('dynTargetNote').hidden ? '' : document.getElementById('dynTargetNote').textContent }));
  check('DCA: هدف البيع بقى سعر السوق (140) بدل 105 + «على سعر السوق (+40% بدل 5%)»', /140\.00/.test(dt.v) && /على سعر السوق \(\+40\.00% بدل 5%\)/.test(dt.l), JSON.stringify(dt));
  check('DCA: تنبيه «السعر عدّى هدف البيع» بالربح الفعلي 400 بدل 50', /السعر عدّى هدف البيع/.test(dt.n) && /ربح فعلي 400\.00/.test(dt.n) && /بدل 50\.00/.test(dt.n), dt.n);
  // سعر التجربة تحت الهدف ← يرجع الهدف المخطط
  await a.evaluate(() => { const i = document.getElementById('manualLastPriceInput'); i.closest('details').open = true; });
  await a.fill('#manualLastPriceInput', '102'); await a.waitForTimeout(200);
  const dt2 = await a.evaluate(() => ({ v: document.getElementById('statusSellTarget').textContent.trim(), hid: document.getElementById('dynTargetNote').hidden }));
  check('DCA: السعر تحت الهدف ← يرجع الهدف المخطط (105)', /105\.00/.test(dt2.v) && dt2.hid, JSON.stringify(dt2));
  await a.fill('#manualLastPriceInput', ''); await a.waitForTimeout(200);

  await a.click('#levelsTable tr[data-lv="0"] button[data-gcall="__sellAtLevel"]'); await a.waitForTimeout(300);
  const m1 = await a.evaluate(() => ({ p: document.getElementById('glvMP').value, note: document.getElementById('glvMX').textContent, pl: document.getElementById('glvMPL').textContent, plc: document.getElementById('glvMPL').className, warn: document.getElementById('glvMW').hidden, ok: document.getElementById('glvMOk').textContent }));
  check('نافذة البيع: السعر اتملى بآخر سعر (140) أوتوماتيك + مكتوب مصدره', m1.p === '140' && /متأخر 15 دقيقة/.test(m1.note), JSON.stringify(m1));
  check('نافذة البيع: ربح البيع 400.00 (+40%) ومفيش تحذير', /400\.00 \(\+40\.00%\)/.test(m1.pl) && m1.plc === 'pos' && m1.warn && m1.ok === 'تنفيذ البيع', JSON.stringify(m1));
  await a.fill('#glvMQ', '4'); await a.fill('#glvMP', '90'); await a.waitForTimeout(100);
  const m2 = await a.evaluate(() => ({ pl: document.getElementById('glvMPL').textContent, plc: document.getElementById('glvMPL').className, warn: document.getElementById('glvMW').hidden ? '' : document.getElementById('glvMW').textContent }));
  check('السعر اليدوي 90 × 4: الحساب على السعر المكتوب ← خسارة 40.00 + تحذير «بيع بخسارة»', /40\.00 \(-10\.00%\)/.test(m2.pl) && m2.plc === 'neg' && /بيع بخسارة 40\.00/.test(m2.warn) && /متوسط التكلفة 100\.00/.test(m2.warn), JSON.stringify(m2));
  await a.click('#glvMOk'); await a.waitForTimeout(600);
  const m3 = await a.evaluate(async () => ({ open: !document.getElementById('glvOv').hidden, ok: document.getElementById('glvMOk').textContent, sells: (await getPlans(await getSession())).COMI.levels[0].sells.length }));
  check('البيع بخسارة: أول ضغطة مبتنفذش ← «تأكيد البيع بخسارة 40.00»', m3.open && /تأكيد البيع بخسارة 40\.00/.test(m3.ok) && m3.sells === 0, JSON.stringify(m3));
  await a.click('#glvMOk'); await a.waitForTimeout(2000);
  const s1 = await a.evaluate(async () => (await getPlans(await getSession())).COMI.levels[0].sells);
  check('الضغطة التانية: البيع اتنفذ بالسعر اليدوي (4 × 90)', s1.length === 1 && s1[0].qty === 4 && s1[0].price === 90, JSON.stringify(s1));
  // تعديل البيع بيحسب على متوسط التكلفة وقت البيع
  if (!(await a.isVisible('#levelsTable tr.g-subrow[data-sub-of="0"]'))) { await a.click('#levelsTable [data-glv-exp="0"]'); await a.waitForTimeout(150); }
  await a.click('#levelsTable tr.g-subrow[data-sub-of="0"] button[data-gcall="__startEditSell"]'); await a.waitForTimeout(300);
  const m4 = await a.evaluate(() => ({ pl: document.getElementById('glvMPL').textContent, warn: !document.getElementById('glvMW').hidden }));
  check('تعديل البيع: الربح/الخسارة ظاهر (خسارة 40.00) مع التحذير', /40\.00/.test(m4.pl) && m4.warn, JSON.stringify(m4));
  await a.click('#glvMNo');

  /* ============ Grid: الهدف + نافذة البيع ============ */
  await a.evaluate(() => renderGridPlanDetail('HRHO'));
  await a.waitForFunction(() => { const n = document.getElementById('gridDynTargetNote'); return n && !n.hidden; }, null, { timeout: 15000 }).catch(() => {});
  const gt = await a.evaluate(() => ({ v: document.getElementById('gridSellTarget').textContent.trim(), l: document.getElementById('gridSellTargetLbl').textContent, n: document.getElementById('gridDynTargetNote').hidden ? '' : document.getElementById('gridDynTargetNote').textContent }));
  check('Grid: هدف البيع الفعلي على سعر السوق (23) + «مستويات عدّت هدف البيع» ربح فعلي 65 بدل 10', /23\.00/.test(gt.v) && /سعر السوق/.test(gt.l) && /2 مستويات عدّت هدف البيع/.test(gt.n) && /ربح فعلي 65\.00/.test(gt.n) && /بدل 10\.00/.test(gt.n), JSON.stringify(gt));
  await a.click('#gridLevelsTable tr[data-lv="1"] button[data-gcall="__gridSellAtLevel"]'); await a.waitForTimeout(300);
  const g1 = await a.evaluate(() => ({ p: document.getElementById('glvMP').value, pl: document.getElementById('glvMPL').textContent }));
  check('Grid نافذة البيع: السعر = آخر سعر 23 (مش هدف البيع 20) + ربح 35.00', g1.p === '23' && /35\.00/.test(g1.pl), JSON.stringify(g1));
  await a.fill('#glvMP', '19'); await a.waitForTimeout(100);
  const g2 = await a.evaluate(() => document.getElementById('glvMW').hidden ? '' : document.getElementById('glvMW').textContent);
  check('Grid: سعر أقل من سعر شراء المستوى ← «بيع بخسارة 5.00»', /بيع بخسارة 5\.00/.test(g2) && /سعر شراء المستوى 19\.50/.test(g2), g2);
  await a.click('#glvMNo');

  /* ============ ميزان محفظتك AI ============ */
  // من غير مفتاح ← المحرك الآلي
  await a.evaluate(() => renderDiversificationReport());
  await a.waitForSelector('.mz-risk-card', { timeout: 40000 }).catch(() => {});
  const z1 = await a.evaluate(() => ({ title: (document.querySelector('.mz-screen .bs-brand h1') || {}).textContent, chip: (document.querySelector('.mz-sub .bs-chip') || {}).textContent, kpis: [...document.querySelectorAll('.mz-kpi span')].map(x => x.textContent),
    rows: [...document.querySelectorAll('.mz-table tbody tr')].map(r => [...r.cells].map(c => c.textContent.trim())), secs: [...document.querySelectorAll('.mz-sec-top span')].map(x => x.textContent),
    gauge: !!document.querySelector('.mz-gauge text'), alerts: [...document.querySelectorAll('.mz-al b')].map(x => x.textContent), moves: [...document.querySelectorAll('.mz-mv')].map(x => x.textContent) }));
  check('ميزان: الشاشة الجديدة «ميزان محفظتك GRIFFINE AI» + درجة الخطورة', /ميزان محفظتك/.test(z1.title || '') && z1.gauge, z1.title);
  check('ميزان: النسب المالية (HHI + عدد الأسهم الفعلي + التذبذب + أقصى تراجع + الارتباط + نسبة التنويع)', ['HHI', 'عدد الأسهم الفعلي', 'التذبذب السنوي', 'أقصى تراجع', 'متوسط الارتباط', 'نسبة التنويع'].every(k => z1.kpis.some(x => x.includes(k))), z1.kpis.join('|'));
  const comi = (z1.rows.find(r => /^COMI/.test(r[0])) || []);
  check('ميزان: القيمة بسعر السوق (6 × 140 = 840 بعد البيع) مش آخر سعر شراء', comi[5] === '840.00', comi.join(' | '));
  check('ميزان: القطاعات من السوق بالعربي (المالية والبنوك / الخدمات الصناعية)', z1.secs.includes('المالية والبنوك') && z1.secs.some(x => /الخدمات الصناعية/.test(x)), z1.secs.join('|'));
  check('ميزان: DCA + Grid لنفس القطاع متجمعين + كل سهم ليه نوع خطته', z1.rows.length === 3 && z1.rows.some(r => /^HRHO/.test(r[0]) && r[2] === 'Grid'), z1.rows.map(r => r[0] + ':' + r[2]).join(','));
  const tr = await a.evaluate(() => [...document.querySelectorAll('.mz-table tbody tr')].map(r => ({ s: r.cells[0].textContent.trim().slice(0, 4), t: (r.querySelector('.mz-tgt b') || {}).textContent, why: (r.querySelector('.mz-why') || {}).textContent || '' })));
  check('ميزان من غير مفتاح: «النسبة المقترحة» لكل سهم بالقواعد + السبب (قطاع مسيطر ← COMI أقل من الوزن المتساوي+الهامش)', tr.length === 3 && tr.every(x => /^\d+%$/.test(x.t || '')) && /قطاع «المالية والبنوك»/.test((tr.find(x => x.s === 'COMI') || {}).why), JSON.stringify(tr));
  check('ميزان: التنبيه «فوق النسبة المقترحة» مع «يُفضّل تنزل لـ»', z1.alerts.some(x => /COMI فوق النسبة المقترحة/.test(x)));
  check('ميزان: من غير مفتاح ← «تحليل آلي» + تنبيهات + إعادة توازن بالأرقام', /تحليل آلي/.test(z1.chip || '') && z1.alerts.length > 0 && z1.moves.length > 0, (z1.chip || '') + ' / ' + z1.alerts.join('|'));

  // بالمفتاح ← رأي الذكاء الاصطناعي + الشركات المرشحة (من قائمة السوق بس)
  const sv = await a.evaluate(async () => apiPost('/basira_api.php', { action: 'admin_save', config: JSON.stringify({ cache_min: 30 + Math.floor(Math.random() * 900) }), ai_key: 'sk-test-key-0000000000000000000' }));
  check('حفظ مفتاح الذكاء الاصطناعي (إعدادات بصيرة)', sv && sv.success && sv.keySet, JSON.stringify(sv).slice(0, 100));
  await a.click('#mzFresh'); await a.waitForSelector('.mz-risk-card', { timeout: 40000 }).catch(() => {}); await a.waitForTimeout(300);
  const z2 = await a.evaluate(() => ({ chip: (document.querySelector('.mz-sub .bs-chip') || {}).textContent, sum: (document.querySelector('.mz-ai p') || {}).textContent, aim: [...document.querySelectorAll('.mz-ai .mz-mv')].map(x => x.textContent), cands: [...document.querySelectorAll('.mz-co')].map(x => x.dataset.s) }));
  const last = await http('http://127.0.0.1:8098/ai-last'); const body = last.body || {};
  check('ميزان بالمفتاح: «ذكاء اصطناعي» + الملخص من Claude', /ذكاء اصطناعي/.test(z2.chip || '') && /تحليل تجريبي من الذكاء الاصطناعي/.test(z2.sum || ''), JSON.stringify(z2).slice(0, 200));
  const tg = await a.evaluate(() => [...document.querySelectorAll('.mz-table tbody tr')].map(r => ({ s: r.cells[0].textContent.trim().slice(0, 4), t: r.querySelector('.mz-tgt b').textContent, src: r.querySelector('.mz-tgt .bs-chip').textContent })));
  const tC = tg.find(x => x.s === 'COMI') || {}, tT = tg.find(x => x.s === 'TMGH') || {};
  check('ميزان بالمفتاح: «النسبة المقترحة» من الذكاء الاصطناعي (COMI = 30%) + علامة AI', tC.t === '30%' && /AI/.test(tC.src), JSON.stringify(tg));
  check('ميزان: نسبة الذكاء الاصطناعي المبالغ فيها (99%) اتقصت لحد ±25 من القواعد', parseInt(tT.t) < 99, JSON.stringify(tT));
  check('ميزان: خطوات الذكاء الاصطناعي بس برموز المحفظة (الرمز الوهمي اتشال)', z2.aim.some(x => /COMI/.test(x)) && !z2.aim.some(x => /FAKE1/.test(x)), z2.aim.join(' | '));
  check('ميزان: الشركات المرشحة من قائمة السوق بس (NOPE9 اتشال) ومش من الأسهم المملوكة', z2.cands.length === 1 && !['COMI', 'HRHO', 'TMGH', 'NOPE9'].includes(z2.cands[0]), z2.cands.join(','));
  check('طلب Claude لميزان: JSON schema خاص (candidates) + النسب + من غير الإيميل', body.output_config && body.output_config.format.schema.properties.candidates && /hhi/.test(JSON.stringify(body.messages)) && !JSON.stringify(body).includes(ADMIN), JSON.stringify(body.output_config && Object.keys(body.output_config.format.schema.properties)));
  await a.click('.mz-co'); await a.waitForTimeout(800);
  check('الشركة المرشحة بتفتح في «بصيرة»', await a.evaluate(() => !!document.querySelector('.bs-screen:not(.mz-screen)')));

  // موبايل: مفيش تمرير أفقي
  const mb = await page(b, { width: 390, height: 844 }); await loginAdmin(mb);
  await mb.evaluate(() => renderDiversificationReport()); await mb.waitForSelector('.mz-risk-card', { timeout: 40000 }).catch(() => {});
  const ov = await mb.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('ميزان على الموبايل: مفيش تمرير أفقي للصفحة', ov <= 1, ov);

  check('بدون أخطاء JavaScript', !a.__errors.length && !mb.__errors.length, a.__errors[0] || mb.__errors[0]);
  await a.evaluate(async (o) => {
    const d = await apiGet('/user_data_get.php?key=plans'); await apiPost('/user_data_save.php', { key: 'plans', value: o.d, base: JSON.stringify(d.versions || {}) });
    const g = await apiGet('/user_data_get.php?key=grid_plans'); await apiPost('/user_data_save.php', { key: 'grid_plans', value: o.g, base: JSON.stringify(g.versions || {}) });
  }, old);
  q("DELETE FROM site_config WHERE config_key IN ('basira_cfg','basira_ai_key')");
  await http('http://127.0.0.1:8098/set?sym=COMI&price=80'); await http('http://127.0.0.1:8098/set?sym=HRHO&price=20');
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
