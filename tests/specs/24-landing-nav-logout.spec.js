// الإصدار 113: عناوين الشريط العلوي في اللاندينج مبتتداخلش (حتى قبل ما الخط يتحمّل) + تسجيل الخروج بيرجّع للاندينج
const { check, summary, launch, page, loginAdmin, q, BASE } = require('../lib');
(async () => {
  q("DELETE FROM login_attempts");
  const b = await launch();
  const g = await page(b, { width: 1500, height: 900 });
  await g.goto(BASE + '/index.php'); await g.waitForSelector('.lp-screen', { timeout: 12000 }).catch(() => {}); await g.waitForTimeout(1200);
  const overlap = () => g.evaluate(() => {
    const nav = document.querySelector('.lp-nav'), end = nav.querySelector('.lp-end').getBoundingClientRect(), links = nav.querySelector('.lp-links');
    const vis = [...nav.querySelectorAll('.lp-links button')].filter(x => x.offsetParent !== null);
    const hit = vis.some(x => { const r = x.getBoundingClientRect(); return r.right > end.left + 1 && r.left < end.right - 1; });
    const lr = links.getBoundingClientRect();
    const cut = vis.some(x => { const r = x.getBoundingClientRect(); return r.left < lr.left - 1 || r.right > lr.right + 1; });
    return { hit, cut, shown: vis.length, tight: nav.classList.contains('lp-tight'), collapse: nav.classList.contains('lp-collapse'), burger: getComputedStyle(nav.querySelector('.lp-burger')).display !== 'none' };
  });
  const o1 = await overlap();
  check('الشاشة العادية (1500): العناوين كلها ظاهرة ومش متداخلة', o1.shown >= 5 && !o1.hit && !o1.cut && !o1.collapse, JSON.stringify(o1));
  // محاكاة أول فتح: الخط البديل أعرض من الخط الأصلي
  await g.addStyleTag({ content: '.lp-links button, .lp-end .lp-btn{ font-size:24px !important; font-family:serif !important; }' });
  await g.evaluate(() => window.dispatchEvent(new Event('resize'))); await g.waitForTimeout(500);
  const o2 = await overlap();
  check('خط أعرض (أول فتح): مفيش تداخل — بيتصغّر أو بيتحول لقائمة ☰', !o2.hit && !o2.cut && (o2.tight || o2.collapse), JSON.stringify(o2));
  check('لو اتحول لقائمة: زرار ☰ ظاهر والقائمة بتفتح', !o2.collapse || (o2.burger && await (async () => { await g.click('.lp-nav .lp-burger'); await g.waitForTimeout(450); return g.evaluate(() => { const m = document.getElementById('lpMMenu'); return m.classList.contains('open') && getComputedStyle(m).display !== 'none' && m.getBoundingClientRect().top >= 0; }); })()), JSON.stringify(o2));
  await g.evaluate(() => { document.querySelectorAll('style').forEach(s => { if (/font-size:24px/.test(s.textContent)) s.remove(); }); window.dispatchEvent(new Event('resize')); }); await g.waitForTimeout(500);
  const o3 = await overlap();
  check('بعد تحميل الخط الأصلي: العناوين بترجع ظاهرة', o3.shown >= 5 && !o3.hit && !o3.collapse, JSON.stringify(o3));
  await g.setViewportSize({ width: 1260, height: 900 }); await g.waitForTimeout(500);
  const o4 = await overlap();
  check('شاشة أضيق (1260): مفيش تداخل', !o4.hit && !o4.cut, JSON.stringify(o4));

  // تسجيل الخروج ← اللاندينج
  const a = await page(b, { width: 1366, height: 900 }); await loginAdmin(a);
  await a.evaluate(() => renderHome()); await a.waitForTimeout(1500);
  await a.evaluate(() => GShell.logout()); await a.waitForTimeout(2500);
  const s1 = await a.evaluate(async () => ({ lp: !!document.querySelector('.lp-screen'), login: !!document.getElementById('loginForm'), sess: await getSession() }));
  check('تسجيل الخروج (القائمة الجانبية) ← صفحة اللاندينج مش شاشة الدخول', s1.lp && !s1.login && !s1.sess, JSON.stringify(s1));
  await loginAdmin(a); await a.evaluate(() => renderProfilePage()).catch(() => {}); await a.waitForTimeout(1800);
  const hasBtn = await a.evaluate(() => !!document.getElementById('logoutFromProfileBtn'));
  if (hasBtn) { await a.evaluate(() => document.getElementById('logoutFromProfileBtn').click()); await a.waitForTimeout(2500); }
  const s2 = await a.evaluate(() => ({ lp: !!document.querySelector('.lp-screen'), login: !!document.getElementById('loginForm') }));
  check('تسجيل الخروج من صفحة الحساب ← اللاندينج', !hasBtn || (s2.lp && !s2.login), JSON.stringify({ hasBtn, ...s2 }));
  await a.click('.lp-nav [data-act="login"]'); await a.waitForTimeout(1200);
  check('من اللاندينج زرار «تسجيل الدخول» بيفتح شاشة الدخول', await a.locator('#loginForm').count() === 1);
  check('بدون أخطاء JavaScript', !g.__errors.length && !a.__errors.length, g.__errors[0] || a.__errors[0]);
  await b.close(); process.exit(summary());
})();
