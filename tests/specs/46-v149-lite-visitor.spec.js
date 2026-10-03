// الإصدار 149: الزائر (أول مرة / من غير حساب) بيحمّل ملفات الصفحة العامة بس — أخف بكتير على الموبايل
//   بعد تسجيل الدخول الصفحة بتتحمّل كاملة لوحدها، وبعد الخروج المرة الجاية بترجع خفيفة
const { check, summary, launch, page, q, BASE } = require('../lib');
const CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
(async () => {
  q("DELETE FROM login_attempts");
  const b = await launch();
  const g = await page(b, { width: 390, height: 844 }, { lite: true });
  const srcs = () => g.evaluate(() => [...document.scripts].map(s => (s.getAttribute('src') || '').split('?')[0]).filter(Boolean));
  const s1 = await srcs();
  check('الزائر: صفحة خفيفة (مفيش ملفات لوحة التحكم / الخطط / بصيرة / الميزان)', await g.evaluate(() => document.body.dataset.glite === '1') && !s1.some(x => /app-admin|app-plans|basira|mizanai|recs|hr\.js/.test(x)) && s1.includes('landing.js'), s1.join(','));
  const kb = await g.evaluate(() => Math.round(performance.getEntriesByType('resource').filter(r => /\.(js|css)$/.test(new URL(r.name).pathname)).reduce((t, r) => t + (r.decodedBodySize || 0), 0) / 1024));
  check('حجم ملفات الزائر أقل من 1.3 ميجا (كان حوالي 2.3)', kb > 100 && kb < 1300, kb + ' KB');
  await g.waitForSelector('.lp-screen', { timeout: 15000 }).catch(() => {});
  check('صفحة الموقع العامة ظاهرة عادي', await g.locator('.lp-screen').count() === 1);
  for (const [fn, sel, nm] of [['renderLogin', '#loginForm', 'الدخول'], ['renderRegister', '#regForm', 'التسجيل'], ['renderForgotPassword', 'input', 'نسيت كلمة المرور'], ['renderPrivacyPolicyPage', '.section-card', 'سياسة الخصوصية'], ['renderTermsPage', '.section-card', 'الشروط والأحكام']]) {
    await g.evaluate((f) => window[f](), fn); await g.waitForTimeout(900);
    check(`الزائر (خفيف): شاشة ${nm} شغالة`, await g.locator(sel).count() >= 1);
  }
  await g.evaluate(() => renderPublicHome()); await g.waitForSelector('#chatBubble', { timeout: 10000 }).catch(() => {});
  await g.click('#chatBubble').catch(() => {}); await g.waitForTimeout(1500);
  check('الزائر (خفيف): أيقونة الشات بتفتح', await g.evaluate(() => !!document.getElementById('chatPanel') && getComputedStyle(document.getElementById('chatPanel')).display !== 'none'));
  await g.evaluate(() => { const x = document.getElementById('chatCloseBtn'); if (x) x.click(); else { const p = document.getElementById('chatPanel'); if (p) p.classList.remove('open'); } }); await g.waitForTimeout(400);
  // الدخول من الشاشة نفسها ← الموقع كامل لوحده
  await g.evaluate(() => renderLogin()); await g.waitForSelector('#loginForm', { timeout: 10000 });
  await g.fill('#email', CUST.email).catch(() => {}); await g.fill('#password', CUST.pass);
  await Promise.all([g.waitForNavigation({ timeout: 20000 }).catch(() => {}), g.click('#loginSubmit')]);
  await g.waitForSelector('#gsHero, .gs-home', { timeout: 30000 }).catch(() => {});
  const s2 = await srcs();
  check('بعد الدخول: الصفحة اتحمّلت كاملة لوحدها (الخطط / بصيرة / التوصيات) والرئيسية ظاهرة', await g.evaluate(() => document.body.dataset.glite !== '1' && typeof renderPlansList === 'function' && typeof renderBasira === 'function') && s2.some(x => /app-plans/.test(x)) && await g.locator('.gs-home').count() >= 1, s2.length);
  check('علامة الدخول اتسجّلت (g_in)', (await g.context().cookies()).some(c => c.name === 'g_in' && c.value === '1'));
  // الخروج ← المرة الجاية خفيفة
  await g.evaluate(async () => { await setSession(null); }); await g.goto(BASE + '/index.php'); await g.waitForTimeout(2000);
  check('بعد الخروج: الزيارة الجاية صفحة خفيفة تاني', await g.evaluate(() => document.body.dataset.glite === '1'));
  // حساب مسجّل بس الجهاز ملوش العلامة (مثلًا أول مرة بعد التحديث) ← بيتحمّل كامل لوحده
  const h = await page(b, null, { lite: true });
  await h.evaluate(async ([e, pw]) => apiPost('/login.php', { email: e, password: pw }), [CUST.email, CUST.pass]);
  await h.context().clearCookies({ name: 'g_in' }).catch(async () => {});
  await h.goto(BASE + '/index.php'); await h.waitForTimeout(4000);
  check('حساب مسجّل من غير العلامة ← الصفحة بتتحمّل كاملة لوحدها مرة واحدة', await h.evaluate(() => document.body.dataset.glite !== '1' && typeof renderPlansList === 'function'));
  // رابط بصيرة المتشارك بيتحمّل كامل على طول
  const s = await page(b, null, { lite: true }); await s.goto(BASE + '/index.php?basira=x'); await s.waitForTimeout(1500);
  check('روابط بصيرة / الميزان المتشاركة بتتحمّل كاملة', await s.evaluate(() => document.body.dataset.glite !== '1' && typeof renderBasiraShared === 'function'));
  check('بدون أخطاء JavaScript', !g.__errors.length && !h.__errors.length, g.__errors[0] || h.__errors[0]);
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
