// الإصدار 116: أيقونة «تثبيت التطبيق» جنب أيقونة الوضع الليلي + البحث العام في الموقع
//   + زرارين في «الإعدادات الإلزامية» (إخفاء أيقونة التثبيت / إخفاء البحث) - البحث تحت التثبيت
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
const CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
(async () => {
  q("DELETE FROM login_attempts");
  const b = await launch();
  for (const [w, h, tag] of [[1366, 900, 'كمبيوتر'], [390, 844, 'موبايل']]) {
    const a = await page(b, { width: w, height: h }); await loginAdmin(a);
    await a.evaluate(() => renderHome()); await a.waitForTimeout(1500);
    const bar = await a.evaluate(() => { const ids = [...document.querySelectorAll('#gsBarEnd button')].map(x => x.id); const r = (id) => { const e = document.getElementById(id); return e ? e.getBoundingClientRect() : null; };
      const t = r('gsThemeBtn'), i = r('gsInstallIcon'), bar = document.querySelector('.gs-appbar').getBoundingClientRect(); return { ids, near: !!(t && i && Math.abs(t.top - i.top) < 4 && Math.abs(i.left - t.right) < 20), vis: !!(i && i.width > 0 && i.left >= 0 && i.right <= window.innerWidth), ov: document.documentElement.scrollWidth - window.innerWidth }; });
    check(`${tag}: أيقونة تثبيت التطبيق جنب أيقونة الوضع الليلي + البحث`, bar.near && bar.vis && bar.ids.includes('gsSearchBtn'), JSON.stringify(bar));
    check(`${tag}: مفيش تمرير أفقي بعد الأيقونات الجديدة`, bar.ov <= 1, bar.ov);
    await a.close();
  }

  const a = await page(b, { width: 1366, height: 900 }); await loginAdmin(a);
  await a.evaluate(() => renderHome()); await a.waitForTimeout(1500);
  await a.click('#gsInstallIcon'); await a.waitForTimeout(400);
  check('الضغط على أيقونة التثبيت ← إرشاد التثبيت (المتصفح مش عارض طلب التثبيت في الاختبار)', await a.evaluate(() => /تثبيت التطبيق|Install app|متثبّت/.test((document.querySelector('.gs-toast') || {}).textContent || '')));

  // البحث
  await a.click('#gsSearchBtn'); await a.waitForTimeout(800);
  const open0 = await a.evaluate(() => ({ open: !document.getElementById('gsSearchOv').hidden, focus: document.activeElement && document.activeElement.id, n: document.querySelectorAll('.gs-search-it').length }));
  check('البحث: بيفتح والمؤشر في خانة البحث + اقتراحات من القائمة', open0.open && open0.focus === 'gsSearchQ' && open0.n > 3, JSON.stringify(open0));
  const res = async (t) => { await a.fill('#gsSearchQ', t); await a.waitForTimeout(150); return a.evaluate(() => [...document.querySelectorAll('.gs-search-it b')].map(x => x.textContent)); };
  let r = await res('ميزان');
  check('بحث «ميزان» ← ميزان محفظتك AI', r.some(x => /ميزان محفظتك AI/.test(x)), r.join(' | '));
  r = await res('سله');
  check('بحث بدون همزات/تاء مربوطة «سله» ← سلة المحذوفات', r.some(x => /سلة المحذوفات/.test(x)), r.join(' | '));
  r = await res('تنويع');
  check('بحث بكلمة مساعدة «تنويع» (مش في الاسم الأساسي) ← ميزان', r.some(x => /ميزان/.test(x)), r.join(' | '));
  r = await res('مفتاح claude');
  check('الأدمن: بحث «مفتاح claude» ← إعدادات بصيرة في لوحة التحكم', r.some(x => /تحليلات بصيرة/.test(x)), r.join(' | '));
  r = await res('COMI');
  check('بحث برمز سهم ← «تحليل سهم COMI في بصيرة»', r.some(x => /تحليل سهم COMI في بصيرة/.test(x)), r.join(' | '));
  r = await res('ميزان'); await a.keyboard.press('Enter'); await a.waitForTimeout(1500);
  check('Enter ← بيفتح الشاشة مباشرة ويقفل البحث', await a.evaluate(() => document.getElementById('gsSearchOv').hidden && !!document.querySelector('.mz-screen')));
  await a.keyboard.press('Control+k'); await a.waitForTimeout(600);
  check('Ctrl+K بيفتح البحث', await a.evaluate(() => !document.getElementById('gsSearchOv').hidden));
  await a.keyboard.press('Escape'); await a.waitForTimeout(200);
  check('Esc بيقفل البحث', await a.evaluate(() => document.getElementById('gsSearchOv').hidden));

  // العميل: الشاشات المخفية عنه مبتظهرش في البحث + مفيش لوحة التحكم
  await a.evaluate(() => saveAdminSetting('hide_mizan_screen', true));
  const c = await page(b, { width: 1366, height: 900 });
  await c.evaluate(async ([e, pw]) => { window.alert = () => {}; await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); }, [CUST.email, CUST.pass]);
  await c.evaluate(() => renderHome()); await c.waitForTimeout(1500);
  await c.click('#gsSearchBtn'); await c.waitForTimeout(800);
  const cr = async (t) => { await c.fill('#gsSearchQ', t); await c.waitForTimeout(150); return c.evaluate(() => [...document.querySelectorAll('.gs-search-it b')].map(x => x.textContent)); };
  const m = await cr('ميزان'), adm = await cr('المشتركون'), trash = await cr('المحذوفات');
  check('العميل: الشاشة المخفية (ميزان) مش في البحث + مفيش شاشات لوحة التحكم', !m.some(x => /ميزان محفظتك/.test(x)) && !adm.length && trash.length > 0, JSON.stringify({ m, adm, trash }));
  await a.evaluate(() => saveAdminSetting('hide_mizan_screen', false));

  // زرارين الإخفاء في لوحة التحكم (البحث تحت التثبيت)
  await a.evaluate(() => renderAdminSettingsPage()); await a.waitForTimeout(1500);
  const pos = await a.evaluate(() => { const t = document.getElementById('app').textContent; return { i: t.indexOf('إخفاء أيقونة «تثبيت التطبيق»'), s: t.indexOf('إخفاء «البحث العام في الموقع»') }; });
  check('الإعدادات: زرار إخفاء أيقونة التثبيت + زرار إخفاء البحث تحته', pos.i > 0 && pos.s > pos.i, JSON.stringify(pos));
  await a.evaluate(async () => { await saveAdminSetting('hide_install_icon', true); await saveAdminSetting('hide_site_search', true); });
  for (const p of [a, c]) { await p.evaluate(async () => { await refreshTopNav(); renderHome(); }); await p.waitForTimeout(1500); }
  const off = await Promise.all([a, c].map(p => p.evaluate(() => ({ i: !!document.getElementById('gsInstallIcon'), s: !!document.getElementById('gsSearchBtn'), t: !!document.getElementById('gsThemeBtn') }))));
  check('بعد الإخفاء: الأيقونتين اختفوا عند الأدمن والعميل (والهلال موجود)', off.every(x => !x.i && !x.s && x.t), JSON.stringify(off));
  await a.evaluate(async () => { await saveAdminSetting('hide_install_icon', false); await saveAdminSetting('hide_site_search', false); await refreshTopNav(); });
  await a.waitForTimeout(800);
  check('إظهارهم تاني', await a.evaluate(() => !!document.getElementById('gsInstallIcon') && !!document.getElementById('gsSearchBtn')));

  check('بدون أخطاء JavaScript', !a.__errors.length && !c.__errors.length, a.__errors[0] || c.__errors[0]);
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
