// الإصدار 107: الاستوديو - ترتيب الأزرار جوه الصندوق (يمين / وسط / شمال / عمودين) + حجم وخط ولون الزرار + الحفظ
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
(async () => {
  q("DELETE FROM login_attempts");
  const oldO = q("SELECT data_value FROM ui_customizations WHERE ui_key='overrides'");
  q("DELETE FROM ui_customizations WHERE ui_key='overrides'");
  const b = await launch();
  const a = await page(b); await loginAdmin(a);
  await a.evaluate(() => renderTradesReportPage()); await a.waitForSelector('#trPosTable', { timeout: 10000 }); await a.waitForTimeout(600);
  // زي صندوق التصدير في الصورة: شوية أزرار بس في الصندوق
  await a.evaluate(() => ['trPrint', 'trCsvCust', 'trCsvPos', 'trAt'].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); }));
  await a.evaluate(() => GStudio.openEditor()); await a.waitForSelector('#gstPick', { timeout: 10000 });
  await a.evaluate(() => GStudioEditor.select(document.getElementById('trCsv'))); await a.waitForSelector('#gstLay', { timeout: 5000 }).catch(() => {});
  check('لوح الزرار فيه «ترتيب العناصر داخل الصندوق»', await a.locator('#gstLay [data-lp]').count() === 5 && await a.locator('#gstLay [data-lc]').count() === 5);
  const geo = () => a.evaluate(() => { const box = document.getElementById('trCsv').parentElement; const bb = box.getBoundingClientRect();
    const bs = [...box.children].filter(x => getComputedStyle(x).display !== 'none').map(x => x.getBoundingClientRect());
    return { left: Math.round(Math.min(...bs.map(r => r.left)) - bb.left), right: Math.round(bb.right - Math.max(...bs.map(r => r.right))), tops: bs.map(r => Math.round(r.top)), disp: getComputedStyle(box).display, jc: getComputedStyle(box).justifyContent }; });
  const g0 = await geo();
  // شمال
  await a.click('#gstLay [data-lp="flex-end"]'); await a.waitForTimeout(400);
  const g1 = await geo();
  check('«شمال»: الأزرار اتنقلت ناحية الشمال', g1.left < 20 && g1.right > g0.right, JSON.stringify({ before: [g0.left, g0.right], after: [g1.left, g1.right] }));
  // وسط
  await a.click('#gstLay [data-lp="center"]'); await a.waitForTimeout(400);
  const g2 = await geo();
  check('«وسط»: المسافة يمين = شمال تقريبًا', Math.abs(g2.left - g2.right) < 40 && g2.left > 20, `${g2.left} / ${g2.right}`);
  // عمودين
  await a.click('#gstLay [data-lc="2"]'); await a.waitForTimeout(400);
  const g3 = await geo();
  check('«عمودين»: اتنين في كل صف (٢ فوق ٢)', g3.disp === 'grid' && g3.tops[0] === g3.tops[1] && g3.tops[2] > g3.tops[0], JSON.stringify(g3.tops));
  await a.fill('#gstLayGap', '20'); await a.waitForTimeout(400);
  check('المسافة بين العناصر', await a.evaluate(() => getComputedStyle(document.getElementById('trCsv').parentElement).columnGap) === '20px');
  // حجم وخط ولون الزرار نفسه
  await a.evaluate(() => GStudioEditor.select(document.getElementById('trCsv'))); await a.waitForTimeout(300);
  await a.fill('#gstBody input[data-p="font-size"]', '11'); await a.fill('#gstBody input[data-p="width"]', '180');
  await a.evaluate(() => { const c = document.querySelector('#gstBody input[data-p="background-color"]'); c.value = '#aa0000'; c.dispatchEvent(new Event('change', { bubbles: true })); });
  await a.waitForTimeout(500);
  const st = await a.evaluate(() => { const c = getComputedStyle(document.getElementById('trCsv')); return { fs: c.fontSize, w: c.width, bg: c.backgroundColor }; });
  check('الزرار: الخط 11 والعرض 180 واللون اتغيّروا', st.fs === '11px' && st.w === '180px' && st.bg === 'rgb(170, 0, 0)', JSON.stringify(st));
  // الحفظ
  await a.click('#gstSave'); await a.waitForTimeout(1500);
  const saved = q("SELECT data_value FROM ui_customizations WHERE ui_key='overrides'");
  check('الحفظ: السيرفر قبل خصائص الترتيب والحجم', /repeat\(2, max-content\)/.test(saved) && /"justify-content":"center"/.test(saved) && /"width":"180px"/.test(saved) && /"gap":"20px"/.test(saved), saved.slice(0, 160));
  const v = await page(b); await loginAdmin(v); await v.evaluate(() => renderTradesReportPage()); await v.waitForSelector('#trPosTable', { timeout: 10000 }); await v.waitForTimeout(800);
  const vg = await v.evaluate(() => { const box = document.getElementById('trCsv').parentElement; return { d: getComputedStyle(box).display, w: getComputedStyle(document.getElementById('trCsv')).width }; });
  check('متصفح جديد: الترتيب والحجم المحفوظين ظاهرين', vg.d === 'grid' && vg.w === '180px', JSON.stringify(vg));
  // قيم غريبة مترفضش من السيرفر بس، والإرجاع
  const bad = await a.evaluate(() => apiPost('/ui_custom_save.php', { key: 'overrides', value: JSON.stringify({ v: 1, texts: [], elTexts: [], orders: [], styles: [{ screen: '*', sel: '#trCsv', css: { display: 'contents', width: '99vw', 'grid-template-columns': 'repeat(99, 1fr)', 'justify-content': 'evil' } }] }) }));
  const after = q("SELECT data_value FROM ui_customizations WHERE ui_key='overrides'");
  check('السيرفر بيرفض القيم الغلط (display/width/أعمدة/محاذاة)', !/contents|99vw|repeat\(99|evil/.test(after), (bad && bad.success) + ' ' + after.slice(0, 100));
  await a.evaluate(() => GStudioEditor.select(document.getElementById('trCsv'))); await a.waitForTimeout(300);
  check('بدون أخطاء JavaScript', !a.__errors.length && !v.__errors.length, a.__errors[0] || v.__errors[0]);
  // رجوع الإعدادات
  if (oldO === '') q("DELETE FROM ui_customizations WHERE ui_key='overrides'"); else q(`UPDATE ui_customizations SET data_value='${oldO.replace(/\\/g, '\\\\').replace(/'/g, "''")}' WHERE ui_key='overrides'`);
  await b.close(); process.exit(summary());
})();
