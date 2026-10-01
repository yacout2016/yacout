// الإصدار 121: قائمة المتابعة ← زرار «تحليل ↗» جنب كل سهم بيفتح تحليله في بصيرة + الجدول جوه عرض الصفحة (من غير تمرير يمين وشمال)
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
(async () => {
  q("DELETE FROM login_attempts");
  const b = await launch();
  for (const [w, h, tag] of [[1366, 900, 'كمبيوتر'], [390, 844, 'موبايل']]) {
    const a = await page(b, { width: w, height: h }); await loginAdmin(a);
    await a.evaluate(async () => { const r = await MK.get('action=watchlist'); for (const x of (r.items || [])) await MK.post({ action: 'watch_remove', id: x.id });
      await MK.post({ action: 'watch_add', symbol: 'COMI', market: 'مصر' }); await MK.post({ action: 'watch_add', symbol: 'HRHO', market: 'مصر' }); });
    await a.evaluate(() => renderWatchlistPage()); await a.waitForSelector('#wlRows .wl-bs', { timeout: 20000 }).catch(() => {});
    const r = await a.evaluate(() => { const card = document.querySelector('.wl-card'), t = document.getElementById('wlTable'), sc = t.closest('.gs-tscroll') || card;
      return { btns: [...document.querySelectorAll('#wlRows .wl-bs')].map(x => x.textContent.trim()), tw: Math.round(t.getBoundingClientRect().right - t.getBoundingClientRect().left), cw: card.clientWidth, sx: sc.scrollWidth - sc.clientWidth, page: document.documentElement.scrollWidth - window.innerWidth,
        vis: [...document.querySelectorAll('#wlRows .wl-bs')].every(x => { const rr = x.getBoundingClientRect(); return rr.left >= 0 && rr.right <= window.innerWidth && rr.width > 0; }) }; });
    check(`${tag}: زرار «تحليل ↗» جنب كل سهم في قائمة المتابعة`, r.btns.length === 2 && r.btns.every(x => x === 'تحليل ↗') && r.vis, JSON.stringify(r.btns));
    check(`${tag}: الجدول جوه عرض الصفحة (مفيش تمرير يمين وشمال)`, r.sx <= 1 && r.page <= 1 && r.tw <= r.cw + 1, JSON.stringify(r));
    if (tag === 'كمبيوتر') {
      // الإصدار 128: إخفاء عمود ← زرار «إظهار الأعمدة المخفية» لازم يفضل ظاهر ويرجّع العمود
      await a.evaluate(() => { try { localStorage.removeItem('gs_hidecols_v1'); } catch (e) {} }); await a.waitForTimeout(600);
      await a.click('#wlTable thead th:nth-child(4) .g-colx'); await a.waitForTimeout(300);
      const h = await a.evaluate(() => { const s = document.querySelector('.g-hcshow'); return { vis: !!(s && s.offsetParent), hidden: getComputedStyle(document.querySelector('#wlTable thead th:nth-child(4)')).display === 'none' }; });
      if (h.vis) { await a.click('.g-hcshow'); await a.waitForTimeout(300); }
      const back = await a.evaluate(() => getComputedStyle(document.querySelector('#wlTable thead th:nth-child(4)')).display !== 'none');
      check('قائمة المتابعة: بعد إخفاء عمود يظهر زرار «إظهار الأعمدة المخفية» ويرجّعه', h.vis && h.hidden && back, JSON.stringify({ ...h, back }));
      await a.evaluate(() => { try { localStorage.removeItem('gs_hidecols_v1'); } catch (e) {} });
      await a.click('#wlRows .wl-bs[data-bs="HRHO"]'); await a.waitForSelector('.bs-hero', { timeout: 40000 }).catch(() => {});
      const d = await a.evaluate(() => ({ sym: (document.getElementById('bsSym') || {}).value, hero: !!document.querySelector('.bs-hero'), title: (document.querySelector('.bs-hero') || {}).textContent || '' }));
      check('الضغط على «تحليل» بيفتح تحليل السهم في بصيرة مباشرة', d.sym === 'HRHO' && d.hero, JSON.stringify({ sym: d.sym, hero: d.hero }));
    }
    check(`${tag}: بدون أخطاء JavaScript`, !a.__errors.length, a.__errors[0]);
    await a.evaluate(async () => { const r = await MK.get('action=watchlist'); for (const x of (r.items || [])) await MK.post({ action: 'watch_remove', id: x.id }); });
    await a.close();
  }
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
