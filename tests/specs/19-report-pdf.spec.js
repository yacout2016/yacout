// الإصدار 106: تحميل PDF للتقارير ← النص أسود دايمًا حتى لو الموقع على الثيم الداكن (كان بيطلع رصاصي)
const { check, summary, launch, page, loginAdmin } = require('../lib');
(async () => {
  const b = await launch(); const p = await page(b); await loginAdmin(p);
  for (const theme of ['dark', 'light']) {
    await p.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); renderTradesReportPage(); }, theme);
    await p.waitForSelector('#trPosTable', { timeout: 10000 }); await p.waitForTimeout(800);
    // بدل التصوير الحقيقي: بنقرا الألوان الفعلية للنسخة اللي بتتصوّر
    await p.evaluate(() => { window.__pdfColors = null; window.jspdf = window.jspdf || { jsPDF: function(){ return { addImage(){}, addPage(){}, output(){ return new Blob(['x']); }, save(){} }; } };
      window.html2canvas = async (host) => { const q = (s) => host.querySelector(s); const col = (e) => e ? getComputedStyle(e).color : null; const bg = (e) => e ? getComputedStyle(e).backgroundColor : null;
        window.__pdfColors = { td: col(q('td')), th: col(q('th')), p: col(q('p')), h3: col(q('h3')), tdBg: bg(q('td')) };
        const c = document.createElement('canvas'); c.width = 10; c.height = 10; return c; }; });
    const [pop] = await Promise.all([p.waitForEvent('popup'), p.click('#trPrint')]);
    await pop.waitForLoadState(); await pop.waitForTimeout(400);
    await pop.evaluate(() => { const x = [...document.querySelectorAll('#gReportBar button')].find(e => /PDF/.test(e.textContent)); x.click(); });
    await p.waitForFunction(() => window.__pdfColors, null, { timeout: 8000 }).catch(() => {});
    const c = await p.evaluate(() => window.__pdfColors);
    const dark = (v) => { const m = String(v).match(/\d+/g); return m && (+m[0] + +m[1] + +m[2]) / 3 < 80; };
    const white = (v) => /rgba\(0, 0, 0, 0\)|rgb\(255, 255, 255\)/.test(String(v));
    check(`PDF (${theme === 'dark' ? 'الثيم الداكن' : 'الثيم الفاتح'}): أرقام الجداول والعناوين سودا والخلفية بيضا`, c && dark(c.td) && dark(c.th) && dark(c.h3) && white(c.tdBg), JSON.stringify(c));
    await pop.close();
  }
  check('بدون أخطاء JavaScript', !p.__errors.length, p.__errors[0]);
  await b.close(); process.exit(summary());
})();
