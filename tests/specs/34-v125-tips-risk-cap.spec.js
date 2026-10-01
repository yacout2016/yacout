// الإصدار 125: النسبة تحت محافظ / متوازن / مغامر + علامة (!) بالشرح + «نسبة أخرى» لأقصى قطاع (مثلًا 60%)
//   + قاعدة الموقع كله: عناوين الجداول الطويلة مختصرة وجنبها (!) بالتفاصيل
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
(async () => {
  q("DELETE FROM login_attempts");
  q("DELETE FROM site_config WHERE config_key IN ('basira_cfg','basira_ai_key','mizanai_cfg')");
  const b = await launch(); const a = await page(b, { width: 1366, height: 900 }); await loginAdmin(a);
  await a.evaluate(() => renderMizanAi()); await a.waitForFunction(() => document.querySelectorAll('#mzaSEx .mza-ms-opt').length >= 3, null, { timeout: 90000 }).catch(() => {});

  // 1) النسبة تحت كل مستوى + (!) بالشرح
  const subs = () => a.evaluate(() => [...document.querySelectorAll('#mzaSRisk button')].map(x => ({ l: x.querySelector('.mza-seg-l').textContent.replace('!', '').trim(), s: x.querySelector('.mza-seg-s').textContent, tip: (x.querySelector('.g-tip') || {}).dataset ? x.querySelector('.g-tip').dataset.tip : '' })));
  let s0 = await subs();
  check('تحت محافظ / متوازن / مغامر النسبة (25 / 30 / 40)', s0.map(x => x.l + ':' + x.s).join('|') === 'محافظ:حد 25% للقطاع|متوازن:حد 30% للقطاع|مغامر:حد 40% للقطاع', JSON.stringify(s0));
  check('جنب كل مستوى علامة (!) فيها شرح القاعدة', s0.every(x => x.tip.length > 30) && /أقصى 25%/.test(s0[0].tip) && /أهدى/.test(s0[0].tip), s0[0].tip);
  await a.hover('#mzaSRisk button[data-v="low"] .g-tip'); await a.waitForTimeout(250);
  const tip = await a.evaluate(() => { const t = document.querySelector('.g-cotip'); return t && !t.hidden ? t.textContent : ''; });
  check('الوقوف على (!) ← الشرح بيظهر', /محافظ: أقصى 25%/.test(tip), tip.slice(0, 60));
  const others = await a.evaluate(() => ({ as: [...document.querySelectorAll('#mzaARisk .mza-seg-s')].map(x => x.textContent), ck: [...document.querySelectorAll('#mzaCRisk .mza-seg-s')].map(x => x.textContent) }));
  check('توزيع الأصول والفحص كمان فيهم النسبة تحت كل مستوى', others.as.every(x => /^أسهم \d+%$/.test(x)) && others.ck.join('|') === 'حد 25% للبند|حد 30% للبند|حد 35% للبند', JSON.stringify(others));

  // 2) «نسبة أخرى» ← 60%
  await a.selectOption('#mzaSCap', 'custom');
  const shown = await a.evaluate(() => !document.getElementById('mzaSCapC').hidden);
  await a.fill('#mzaSCapC', '60'); await a.dispatchEvent('#mzaSCapC', 'input');
  s0 = await subs();
  check('«نسبة أخرى…» بتفتح خانة تكتب فيها النسبة (60%) والنسب تحت المستويات بتتحدث', shown && s0[1].s === 'حد 60% للقطاع' && s0[2].s === 'حد 70% للقطاع' && s0[0].s === 'حد 25% للقطاع', JSON.stringify(s0.map(x => x.s)));
  await a.click('#mzaSRisk button[data-v="mid"]'); await a.selectOption('#mzaSMax', '4');
  await a.fill('#mzaSAmt', '100000'); await a.click('#mzaSGo'); await a.waitForSelector('#mzaOut .mza-table', { timeout: 60000 });
  const mx = await a.evaluate(() => Math.max(...[...document.querySelectorAll('#mzaOut .mza-table')[0].tBodies[0].rows].map(r => parseFloat(r.cells[1].textContent))));
  check('التوزيع بيحترم النسبة المكتوبة (أقصى قطاع ≤ 60% وأكتر من 30%)', mx <= 60.05 && mx > 30, mx);
  await a.click('#mzaF-stocks .mza-clear');
  check('«تفريغ الخانات» بيرجّع أقصى نسبة لـ 30%', await a.evaluate(() => document.getElementById('mzaSCap').value === '30' && document.getElementById('mzaSCapC').hidden));

  // 3) عناوين الجداول المختصرة + (!) — جدول الأصول
  await a.click('.mza-mode[data-m="assets"]'); await a.click('#mzaAGo'); await a.waitForSelector('.mza-grow', { timeout: 30000 }).catch(() => {});
  const th = await a.evaluate(() => [...document.querySelectorAll('#mzaOut .mza-table')[0].tHead.rows[0].cells].map(c => ({ t: c.childNodes[0].textContent.trim(), full: c.getAttribute('data-full'), tip: !!c.querySelector('.g-tip') })));
  const rate = th.find(x => x.full === 'العائد السنوي المفترض');
  check('عنوان طويل («العائد السنوي المفترض») ← مختصر «العائد» + (!) بالتفاصيل', rate && rate.t === 'العائد' && rate.tip, JSON.stringify(th));
  check('العناوين القصيرة زي ما هي من غير (!)', th[1].t === 'النسبة' && !th[1].tip, JSON.stringify(th[1]));

  // 4) نفس القاعدة في جداول الموقع (جدول عادي بيتحسّن تلقائي)
  const gen = await a.evaluate(() => { const box = document.createElement('div'); box.innerHTML = '<table><thead><tr><th>السهم</th><th>تكلفة المراكز المفتوحة</th></tr></thead><tbody><tr><td>A</td><td>1</td></tr><tr><td>B</td><td>2</td></tr></tbody></table>'; document.getElementById('app').appendChild(box);
    gShortHeads(box.querySelector('table')); const c = box.querySelector('th:nth-child(2)'); const r = { t: c.childNodes[0].textContent.trim(), tip: c.querySelector('.g-tip').dataset.tip }; box.remove(); return r; });
  check('أي جدول في الموقع: «تكلفة المراكز المفتوحة» ← «تكلفة المفتوح» + (!)', gen.t === 'تكلفة المفتوح' && /ماتباعتش/.test(gen.tip), JSON.stringify(gen));

  // 5) موبايل: (!) بتظهر الشرح باللمس + مفيش تمرير أفقي
  const m = await page(b, { width: 390, height: 844 }); await loginAdmin(m);
  await m.evaluate(() => renderMizanAi()); await m.waitForFunction(() => document.querySelectorAll('#mzaSEx .mza-ms-opt').length >= 3, null, { timeout: 60000 }).catch(() => {});
  await m.evaluate(() => document.querySelector('#mzaSRisk').scrollIntoView({ block: 'center' })); await m.waitForTimeout(300);
  await m.click('#mzaSRisk button[data-v="high"] .g-tip'); await m.waitForTimeout(250);
  const mt = await m.evaluate(() => { const t = document.querySelector('.g-cotip'); return { tip: t && !t.hidden ? t.textContent : '', on: document.querySelector('#mzaSRisk .on').dataset.v, ov: document.documentElement.scrollWidth - innerWidth }; });
  check('الموبايل: لمس (!) جنب «مغامر» ← الشرح بيظهر', /^مغامر:/.test(mt.tip), mt.tip.slice(0, 50));
  check('الموبايل: مفيش تمرير أفقي', mt.ov <= 1, mt.ov);
  check('بدون أخطاء JavaScript', !a.__errors.length && !m.__errors.length, a.__errors[0] || m.__errors[0]);
  q("DELETE FROM site_config WHERE config_key IN ('basira_cfg','basira_ai_key','mizanai_cfg')");
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
