// الإصدار 108: صفحة اللاندينج (واجهة الموقع قبل الدخول) + لوحة التحكم «صفحة اللاندينج» + الربط بالموقع
const { check, summary, launch, page, loginAdmin, q, BASE } = require('../lib');
const CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
const loginAs = (p, a) => p.evaluate(async ([e, pw]) => { window.alert = () => {}; const x = await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); return x; }, [a.email, a.pass]);
const ctr = (p, sel) => p.locator(sel).first().evaluate(e => e.scrollIntoView({ block: 'center' }));
const guest = async (b, vp) => { const g = await page(b, vp); await g.goto(BASE + '/index.php'); await g.waitForSelector('.lp-screen', { timeout: 12000 }).catch(() => {}); await g.waitForTimeout(900); return g; };
(async () => {
  q("DELETE FROM login_attempts");
  const old = q("SELECT data_value FROM ui_customizations WHERE ui_key='landing'");
  q("DELETE FROM ui_customizations WHERE ui_key='landing'");
  q("DELETE FROM testimonials WHERE customer_email='lp-test@example.com'");
  const b = await launch();

  // 1) الزائر: اللاندينج بدل شاشة الترحيب
  const g = await guest(b);
  check('الزائر بيشوف صفحة اللاندينج', await g.locator('.lp-screen').count() === 1 && await g.locator('.wl-screen').count() === 0);
  const nav = await g.evaluate(() => { const links = [...document.querySelectorAll('.lp-links button')]; return { n: links.length, oneLine: links.every(l => l.getBoundingClientRect().height < 50), hs: links.map(l => Math.round(l.getBoundingClientRect().height)), navH: Math.round(document.querySelector('.lp-nav').getBoundingClientRect().height) }; });
  check('عناوين القائمة كل واحد في سطر واحد', nav.n >= 5 && nav.oneLine && nav.navH <= 74, JSON.stringify(nav));
  const logo = await g.evaluate(() => ({ l: getComputedStyle(document.querySelector('.lp-nav .lp-logo-l')).display, d: getComputedStyle(document.querySelector('.lp-nav .lp-logo-d')).display, wm: !!document.querySelector('.lp-wm img') }));
  check('الشعار: نسخة الفاتح ظاهرة والغامق مستخبية + علامة مائية', logo.l !== 'none' && logo.d === 'none' && logo.wm, JSON.stringify(logo));
  await g.click('.lp-nav [data-act="theme"]'); await g.waitForTimeout(300);
  const logo2 = await g.evaluate(() => ({ l: getComputedStyle(document.querySelector('.lp-nav .lp-logo-l')).display, d: getComputedStyle(document.querySelector('.lp-nav .lp-logo-d')).display, dark: document.documentElement.getAttribute('data-theme') }));
  check('الوضع الليلي: الشعار بيتبدّل لنسخة الغامق', logo2.dark === 'dark' && logo2.l === 'none' && logo2.d !== 'none', JSON.stringify(logo2));
  await g.click('.lp-nav [data-act="theme"]'); await g.waitForTimeout(200);
  check('زرار تحميل التطبيق جنب زرار الليلي/النهاري', await g.locator('.lp-end [data-act="theme"] + [data-act="app"]').count() === 1);
  await g.click('.lp-end [data-act="app"]'); await g.waitForTimeout(300);
  check('زرار التطبيق بيفتح شرح التثبيت', await g.locator('.lp-modal').count() === 1); await g.click('.lp-modal .lp-x');
  const secs = await g.evaluate(() => [...document.querySelectorAll('[data-lp-sec]')].map(s => s.dataset.lpSec).join(','));
  check('الأقسام الأساسية ظاهرة (المميزات / الخدمات / الأسواق / الحاسبة / الأسئلة)', ['features', 'services', 'markets', 'calc', 'faq'].every(x => secs.includes(x)), secs);
  const txt = await g.textContent('.lp-screen');
  check('فيه خدمة التوصيات من خبراء ماليين والتحليلات المالية', /خبراء ماليين/.test(txt) && /التحليلات المالية/.test(txt));
  const users = +q("SELECT COUNT(*) FROM users WHERE COALESCE(archived,0)=0");
  await g.evaluate(() => document.querySelector('.lp-stats').scrollIntoView()); await g.waitForTimeout(2200);
  const st = await g.$$eval('.lp-stat b', d => d.map(x => +x.textContent.replace(/,/g, '')));
  check('العدادات حقيقية من الموقع (عدد المستخدمين)', st.includes(users), JSON.stringify(st) + ' users=' + users);
  await g.waitForFunction(() => /COMI|TMGH|HRHO/.test((document.getElementById('lpTicker') || {}).textContent || ''), null, { timeout: 12000 }).catch(() => {});
  check('شريط الأسعار بأسعار حقيقية من مصدر أسعار الموقع', /COMI|TMGH|HRHO/.test(await g.textContent('#lpTicker')));
  await g.click('.lp-nav [data-act="login"]'); await g.waitForTimeout(1200);
  check('زرار تسجيل الدخول بيفتح شاشة الدخول الحالية للموقع', await g.locator('#loginForm').count() === 1);
  await g.evaluate(() => renderPublicHome()); await g.waitForSelector('.lp-screen'); await g.click('.lp-nav [data-act="register"]'); await g.waitForTimeout(1200);
  check('زرار إنشاء الحساب بيفتح شاشة التسجيل الحالية', await g.locator('#regForm').count() === 1);
  check('الزائر: بدون أخطاء JavaScript', !g.__errors.length, g.__errors[0]);

  // 2) الأدمن: زرار واحد «صفحة اللاندينج»
  const a = await page(b); await loginAdmin(a);
  await a.evaluate(() => renderAdminHub()); await a.waitForTimeout(1200);
  check('لوحة التحكم فيها زرار «صفحة اللاندينج»', await a.locator('#goLandingBtn').count() === 1);
  await ctr(a, '#goLandingBtn'); await a.click('#goLandingBtn'); await a.waitForSelector('.lpa', { timeout: 8000 });
  check('لوحة اللاندينج: 4 تبويبات (عام / الأقسام / الربط / العروض)', await a.locator('.lpa-tabs button').count() === 4);
  // عام: العلامة المائية + ألوان خاصة
  await ctr(a, '[data-p="watermark.on"]'); await a.uncheck('[data-p="watermark.on"]'); await ctr(a, '[data-p="theme.follow"]'); await a.uncheck('[data-p="theme.follow"]');
  await a.evaluate(() => { const c = document.querySelector('[data-p="theme.brand"]'); c.value = '#aa2200'; c.dispatchEvent(new Event('input', { bubbles: true })); });
  // الأقسام: نص العنوان + إخفاء الحاسبة + قسم مخصص
  await ctr(a, '.lpa-tabs [data-tab="sections"]'); await a.click('.lpa-tabs [data-tab="sections"]'); await a.waitForTimeout(200);
  await ctr(a, '[data-open="hero"]'); await a.click('[data-open="hero"]'); await a.waitForTimeout(200);
  await ctr(a, '[data-p="hero.title"]'); await a.fill('[data-p="hero.title"]', 'عنوان تجربة [[ذهبي]]');
  const calcIdx = await a.evaluate(() => { const el = [...document.querySelectorAll('.lpa-sec')].findIndex(x => /حاسبة/.test(x.textContent)); return el; });
  await ctr(a, `[data-p="sections.${calcIdx}.on"]`); await a.uncheck(`[data-p="sections.${calcIdx}.on"]`);
  await ctr(a, '[data-do="addsec"]'); await a.click('[data-do="addsec"]'); await a.waitForTimeout(300);
  const ci = await a.evaluate(() => document.querySelectorAll('.lpa-sec').length - 1);
  await ctr(a, `[data-p="sections.${ci}.title"]`); await a.fill(`[data-p="sections.${ci}.title"]`, 'قسم مخصص للتجربة');
  // الربط: عداد يدوي + آراء يدوية + أسئلة يدوية بس
  await ctr(a, '.lpa-tabs [data-tab="links"]'); await a.click('.lpa-tabs [data-tab="links"]'); await a.waitForTimeout(200);
  await ctr(a, '[data-p="stats.items.1.mode"]'); await a.selectOption('[data-p="stats.items.1.mode"]', 'manual'); await ctr(a, '[data-p="stats.items.1.value"]'); await a.fill('[data-p="stats.items.1.value"]', '777');
  await ctr(a, '[data-p="reviews.mode"]'); await a.selectOption('[data-p="reviews.mode"]', 'manual');
  await ctr(a, '[data-add="reviews.manual"]'); await a.click('[data-add="reviews.manual"]'); await a.waitForTimeout(200);
  await ctr(a, '[data-p="reviews.manual.0.name"]'); await a.fill('[data-p="reviews.manual.0.name"]', 'منى'); await ctr(a, '[data-p="reviews.manual.0.text"]'); await a.fill('[data-p="reviews.manual.0.text"]', 'رأي يدوي للتجربة');
  await ctr(a, '[data-p="faq.mode"]'); await a.selectOption('[data-p="faq.mode"]', 'manual');
  // العروض: شريط علوي
  await ctr(a, '.lpa-tabs [data-tab="promos"]'); await a.click('.lpa-tabs [data-tab="promos"]'); await a.waitForTimeout(200);
  await ctr(a, '[data-add="promos"]'); await a.click('[data-add="promos"]'); await a.waitForTimeout(200);
  await ctr(a, '[data-p="promos.0.type"]'); await a.selectOption('[data-p="promos.0.type"]', 'bar'); await ctr(a, '[data-p="promos.0.title"]'); await a.fill('[data-p="promos.0.title"]', 'عرض الترقية للتجربة'); await ctr(a, '[data-p="promos.0.btn"]'); await a.fill('[data-p="promos.0.btn"]', 'اشترك');
  await ctr(a, '#lpaSave'); await a.click('#lpaSave'); await a.waitForTimeout(1500);
  const saved = q("SELECT data_value FROM ui_customizations WHERE ui_key='landing'");
  check('الحفظ: الإعدادات اتحفظت في السيرفر', /عنوان تجربة/.test(saved) && /777/.test(saved) && /عرض الترقية للتجربة/.test(saved), saved.slice(0, 120));
  check('الأدمن: بدون أخطاء JavaScript', !a.__errors.length, a.__errors[0]);

  // 3) الزائر بيشوف التعديلات
  const g2 = await guest(b);
  const v = await g2.evaluate(() => ({ h1: document.querySelector('.lp-hero h1').innerHTML, calc: !!document.getElementById('lp-calc'), bar: (document.querySelector('.lp-pbar') || {}).textContent || '', wm: !!document.querySelector('.lp-wm'), gold: getComputedStyle(document.getElementById('lpRoot')).getPropertyValue('--lp-gold').trim(), custom: [...document.querySelectorAll('.lp-custom h2')].map(x => x.textContent).join('|'), rv: (document.getElementById('lp-reviews') || {}).textContent || '', faq: (document.getElementById('lp-faq') || {}).textContent || '' }));
  check('العنوان الجديد + [[ ]] ذهبي', /عنوان تجربة/.test(v.h1) && /class="lp-gold">ذهبي/.test(v.h1), v.h1.slice(0, 90));
  check('الحاسبة اتخفت + القسم المخصص ظهر', !v.calc && /قسم مخصص للتجربة/.test(v.custom), v.custom);
  check('شريط العروض فوق + العلامة المائية اتشالت + اللون الخاص', /عرض الترقية للتجربة/.test(v.bar) && !v.wm && v.gold === '#aa2200', `${v.bar} / wm=${v.wm} / ${v.gold}`);
  check('الآراء اليدوية ظاهرة والأسئلة يدوية بس (من غير أسئلة المساعد)', /رأي يدوي للتجربة/.test(v.rv) && /DCA/.test(v.faq) && !/ما هي الباقات والأسعار/.test(v.faq), v.faq.slice(0, 60));
  await g2.evaluate(() => document.querySelector('.lp-stats').scrollIntoView()); await g2.waitForTimeout(2000);
  check('العداد اليدوي (777)', (await g2.$$eval('.lp-stat b', d => d.map(x => x.textContent))).includes('777'));

  // 4) الآراء الحقيقية من الموقع + إخفاء رأي من اللاندينج
  q("INSERT INTO testimonials (customer_email, display_name, rating, comment_text) VALUES ('lp-test@example.com', 'عميل حقيقي', 5, 'رأي حقيقي من الموقع للتجربة')");
  const tid = +q("SELECT id FROM testimonials WHERE customer_email='lp-test@example.com' ORDER BY id DESC LIMIT 1");
  await a.evaluate(() => renderAdminLandingPage('links')); await a.waitForSelector('.lpa'); await a.waitForTimeout(400);
  await ctr(a, '[data-p="reviews.mode"]'); await a.selectOption('[data-p="reviews.mode"]', 'both'); await ctr(a, '[data-p="faq.mode"]'); await a.selectOption('[data-p="faq.mode"]', 'site'); await ctr(a, '#lpaSave'); await a.click('#lpaSave'); await a.waitForTimeout(1200);
  const g3 = await guest(b);
  const rv3 = await g3.evaluate(() => ({ rv: (document.getElementById('lp-reviews') || {}).textContent || '', faq: (document.getElementById('lp-faq') || {}).textContent || '' }));
  check('آراء حقيقية من الموقع + اليدوية مع بعض', /رأي حقيقي من الموقع للتجربة/.test(rv3.rv) && /رأي يدوي للتجربة/.test(rv3.rv));
  const faqQ = q("SELECT question FROM chat_faq WHERE active=1 ORDER BY sort_order, id LIMIT 1");
  check('الأسئلة الشائعة من أسئلة المساعد الذكي في الموقع', rv3.faq.includes(faqQ), faqQ);
  await a.evaluate(() => renderAdminLandingPage('links')); await a.waitForSelector('.lpa'); await a.waitForTimeout(400);
  await ctr(a, `[data-rv="${tid}"]`); await a.uncheck(`[data-rv="${tid}"]`); await ctr(a, '#lpaSave'); await a.click('#lpaSave'); await a.waitForTimeout(1200);
  const g4 = await guest(b);
  check('الأدمن أخفى الرأي ← اختفى من اللاندينج', !/رأي حقيقي من الموقع للتجربة/.test(await g4.evaluate(() => (document.getElementById('lp-reviews') || {}).textContent || '')));

  // 5) الاستوديو يقدر يعدّل اللاندينج + المعاينة
  check('صفحة اللاندينج في قائمة شاشات استوديو التصميم', await a.evaluate(async () => (await GShell.getScreenCatalog()).some(x => /اللاندينج/.test(x.label))));
  await a.evaluate(() => renderAdminLandingPage()); await a.waitForSelector('.lpa'); await ctr(a, '[data-do="preview"]'); await a.click('[data-do="preview"]'); await a.waitForSelector('.lp-screen', { timeout: 8000 });
  check('حفظ ومعاينة: الأدمن بيشوف الصفحة زي الزوار مع شريط رجوع', await a.locator('.lp-admin-bar').count() === 1);

  // 6) الأمان: العميل مش مسموحله يحفظ ، والصور الغلط بتتشال
  const c = await page(b); await c.goto(BASE + '/index.php'); await c.waitForTimeout(1200); await loginAs(c, CUST);
  const deny = await c.evaluate(() => fetch('/landing_api.php', { method: 'POST', body: new URLSearchParams({ action: 'save', config: '{}' }) }).then(r => r.status));
  check('العميل ممنوع من تعديل اللاندينج (403)', deny === 403);
  const bad = await a.evaluate(() => apiPost('/landing_api.php', { action: 'save', config: JSON.stringify({ enabled: true, hero: { img: 'javascript:alert(1)', title: 'x' }, theme: { logo: 'data:text/html;base64,AAAA' } }) }));
  const saved2 = q("SELECT data_value FROM ui_customizations WHERE ui_key='landing'");
  check('السيرفر بيشيل أي صورة مش صورة حقيقية', bad.success && !/javascript:|text\/html/.test(saved2), saved2.slice(0, 120));

  // 7) إيقاف اللاندينج ← شاشة الترحيب القديمة
  await a.evaluate(() => apiPost('/landing_api.php', { action: 'save', config: JSON.stringify({ enabled: false }) }));
  const g5 = await page(b); await g5.goto(BASE + '/index.php'); await g5.waitForTimeout(2500);
  check('إيقاف اللاندينج: الزائر بيشوف شاشة الترحيب القديمة', await g5.locator('.wl-screen').count() === 1 && await g5.locator('.lp-screen').count() === 0);

  // 7ب) الشاشات الطارئة شغالة قبل اللاندينج: تحميل بطيء (الشعار + عد تنازلي) ثم الصفحة / وضع الصيانة فوقها
  q("DELETE FROM ui_customizations WHERE ui_key='landing'");
  const slow = await page(b);
  await slow.route('**/landing_api.php?action=get*', async (r) => { await new Promise(res => setTimeout(res, 7000)); await r.continue(); });
  await slow.goto(BASE + '/index.php'); await slow.waitForTimeout(5500);
  const sl = await slow.evaluate(() => { const e = document.getElementById('gsEmg'); return { on: !!e && !e.hidden && /slow/.test(e.className), logo: !!(e && e.querySelector('.gs-emg-logo')), lp: !!document.querySelector('.lp-screen') }; });
  check('نت بطيء: شاشة التحميل (الشعار + العد التنازلي) بتظهر قبل اللاندينج', sl.on && sl.logo && !sl.lp, JSON.stringify(sl));
  await slow.waitForSelector('.lp-screen', { timeout: 15000 }).catch(() => {}); await slow.waitForTimeout(800);
  check('بعد التحميل: اللاندينج ظهرت وشاشة التحميل اختفت', await slow.evaluate(() => { const e = document.getElementById('gsEmg'); return !!document.querySelector('.lp-screen') && (!e || e.hidden); }));
  q("REPLACE INTO site_config (config_key, config_value) VALUES ('maint_on', '1')");
  const mt = await page(b); await mt.goto(BASE + '/index.php'); await mt.waitForTimeout(3000);
  check('وضع الصيانة: شاشة الصيانة بتظهر للزائر فوق اللاندينج', await mt.evaluate(() => { const e = document.getElementById('gsEmg'); return !!e && !e.hidden && /maint/.test(e.className); }));
  q("REPLACE INTO site_config (config_key, config_value) VALUES ('maint_on', '0')");

  // 8) الموبايل
  q("DELETE FROM ui_customizations WHERE ui_key='landing'");
  const m = await guest(b, { width: 390, height: 844 });
  const mm = await m.evaluate(() => ({ ov: document.documentElement.scrollWidth > innerWidth + 1, login: getComputedStyle(document.querySelector('.lp-end .lp-login')).display !== 'none', burger: getComputedStyle(document.querySelector('.lp-burger')).display !== 'none' }));
  check('الموبايل: من غير تمرير بالعرض + أيقونة الدخول والقائمة ظاهرين', !mm.ov && mm.login && mm.burger, JSON.stringify(mm));
  check('كل الصفحات: بدون أخطاء JavaScript', ![g2, g3, g4, g5, m, a].some(x => x.__errors.length), [g2, g3, g4, g5, m, a].map(x => x.__errors[0]).filter(Boolean)[0]);

  // تنظيف
  q("DELETE FROM testimonials WHERE customer_email='lp-test@example.com'");
  if (old === '') q("DELETE FROM ui_customizations WHERE ui_key='landing'"); else q(`REPLACE INTO ui_customizations (ui_key, data_value) VALUES ('landing', '${old.replace(/\\/g, '\\\\').replace(/'/g, "''")}')`);
  await b.close(); process.exit(summary());
})();
