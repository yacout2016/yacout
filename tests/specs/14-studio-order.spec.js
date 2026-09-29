// الإصدار 96: الاستوديو - تحريك عنصر داخل نفس المجموعة (أسهم + حفظ + يفضل بعد إعادة التحميل + إرجاع) + خط لكل ثيم + مفيش أسماء منافسين
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
(async () => {
  q("DELETE FROM login_attempts");
  const oldO = q("SELECT data_value FROM ui_customizations WHERE ui_key='overrides'");
  const b = await launch();
  const a = await page(b); await loginAdmin(a);
  await a.evaluate(() => renderAdminSettingsPage()); await a.waitForTimeout(1500);
  // عنصر في مجموعة فيها 3 عناصر أو أكتر جوه الشاشة
  const target = await a.evaluate(() => {
    const vis = (x) => getComputedStyle(x).display !== 'none';
    const kids = document.querySelectorAll('#app > div > *');
    for (const c of kids) if (Array.from(c.parentElement.children).filter(vis).length >= 3 && vis(c) && c.textContent.trim() && Array.from(c.parentElement.children).slice(0, Array.prototype.indexOf.call(c.parentElement.children, c)).some(vis)) { c.setAttribute('data-t-target', '1'); return { txt: c.textContent.trim().slice(0, 30), idx: Array.prototype.indexOf.call(c.parentElement.children, c) + 1 }; }
    return null;
  });
  check('فيه عنصر للتجربة', !!target, JSON.stringify(target));
  const posOf = () => a.evaluate(() => { const t = document.querySelector('[data-t-target]'); const sibs = Array.from(t.parentElement.children).filter(x => getComputedStyle(x).display !== 'none'); return sibs.sort((x, y) => x.getBoundingClientRect().top - y.getBoundingClientRect().top || 0).indexOf(t); });
  const before = await posOf();
  await a.evaluate(() => GStudio.openEditor()); await a.waitForSelector('#gstPick', { timeout: 10000 });
  await a.evaluate(() => GStudioEditor.select(document.querySelector('[data-t-target]'))); await a.waitForSelector('#gstUp', { timeout: 5000 }).catch(() => {});
  check('لوح العنصر فيه "الترتيب داخل المجموعة"', await a.locator('#gstOrdList .gst-ord').count() >= 3);
  await a.click('#gstUp'); await a.waitForTimeout(400);
  const after = await posOf();
  check('تحريك لأعلى: العنصر طلع مكان واحد لفوق (معاينة)', after === before - 1, `${before} → ${after}`);
  check('المسودة فيها قاعدة ترتيب', await a.evaluate(() => (GStudio.overrides.orders || []).length === 1));
  await a.click('#gstSave'); await a.waitForTimeout(1500);
  const saved = q("SELECT data_value FROM ui_customizations WHERE ui_key='overrides'");
  check('الحفظ: الترتيب اتحفظ في السيرفر', /"orders":\[\{/.test(saved), saved.slice(0, 120));
  // متصفح جديد (تحميل من السيرفر) ← الترتيب الجديد ظاهر
  const v = await page(b); await loginAdmin(v); await v.evaluate(() => renderAdminSettingsPage()); await v.waitForTimeout(1800);
  const vPos = await v.evaluate((idx) => { const kids = document.querySelectorAll('#app > div > *'); let t = null; for (const c of kids) if (Array.prototype.indexOf.call(c.parentElement.children, c) + 1 === idx) { t = c; break; } if (!t) return -9; const sibs = Array.from(t.parentElement.children).filter(x => getComputedStyle(x).display !== 'none'); return sibs.sort((x, y) => x.getBoundingClientRect().top - y.getBoundingClientRect().top).indexOf(t); }, target.idx);
  check('متصفح جديد: الترتيب المحفوظ ظاهر', vPos === after, vPos);
  // الإرجاع
  await a.click('#gstOrdReset'); await a.waitForTimeout(300);
  check('إرجاع ترتيب المجموعة: رجع مكانه', await posOf() === before);
  // السحب والإفلات في قائمة المجموعة
  await a.locator('#gstOrdList .gst-ord.on').dragTo(a.locator('#gstOrdList .gst-ord').first()); await a.waitForTimeout(400);
  const dragged = await a.evaluate(() => (GStudio.overrides.orders || [])[0]);
  check('السحب والإفلات: العنصر بقى أول المجموعة', dragged && dragged.seq[0] === 4, JSON.stringify(dragged && dragged.seq));
  await a.click('#gstOrdReset'); await a.waitForTimeout(300);
  await a.click('#gstSave'); await a.waitForTimeout(1200);
  check('الإرجاع اتحفظ', !/"orders":\[\{/.test(q("SELECT data_value FROM ui_customizations WHERE ui_key='overrides'")));
  // الثيمات: خط لكل ثيم + مفيش أسماء منافسين
  const th = await a.evaluate(() => ({ fonts: GStudio.PRESETS.every(p => p.font), txt: JSON.stringify(GStudio.PRESETS), f: GStudio.themeFromPreset('green').font }));
  check('كل ثيم جاهز ليه خط', th.fonts && th.f === 'Tajawal');
  check('مفيش أسماء تطبيقات منافسة في الثيمات', !/ثاندر|منثم|راية|thndr/i.test(th.txt));
  await a.evaluate(() => { GStudio.applyTheme(GStudio.themeFromPreset('green')); }); await a.waitForTimeout(300);
  const ff = await a.evaluate(() => getComputedStyle(document.querySelector('#app')).fontFamily);
  check('اختيار الثيم بيطبّق خطه على الشاشات', /Tajawal/.test(ff), ff);
  await a.evaluate(() => GStudio.applyTheme(GStudio.theme));
  check('بدون أخطاء JavaScript', !a.__errors.length && !v.__errors.length, a.__errors[0] || v.__errors[0]);
  if (oldO === '') q("DELETE FROM ui_customizations WHERE ui_key='overrides'");
  else q(`UPDATE ui_customizations SET data_value='${oldO.replace(/\\/g, '\\\\').replace(/'/g, "''")}' WHERE ui_key='overrides'`);
  await b.close();
  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
