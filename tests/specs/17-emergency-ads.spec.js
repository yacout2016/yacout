// الإصدار 100: الشاشات الطارئة (صيانة / انقطاع النت / السيرفر / تحميل بطيء) + الدعاية والعروض + البحث عن رمز السهم في نموذج الخطة
const { check, summary, launch, page, loginAdmin, q, BASE } = require('../lib');
const CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
const loginAs = (p, a) => p.evaluate(async ([e, pw]) => { window.alert = () => {}; const x = await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); return x; }, [a.email, a.pass]);
(async () => {
  q("DELETE FROM login_attempts");
  const old = {}; ['emergency_cfg', 'maint_on', 'ads_cfg'].forEach(k => { old[k] = q(`SELECT config_value FROM site_config WHERE config_key='${k}'`); });
  const b = await launch();
  const a = await page(b); await loginAdmin(a);

  // 1) لوحة التحكم: الشاشات الطارئة
  await a.evaluate(() => renderAdminHub()); await a.waitForTimeout(800);
  check('لوحة التحكم: زرار «الشاشات الطارئة» و«الدعاية والعروض»', await a.locator('#goEmergencyBtn').count() === 1 && await a.locator('#goAdsBtn').count() === 1);
  await a.click('#goEmergencyBtn'); await a.waitForSelector('.emg-card', { timeout: 8000 });
  check('صفحة الشاشات الطارئة: 4 شاشات قابلة للتعديل', await a.locator('.emg-card').count() === 4);
  await a.fill('.emg-card[data-k="maint"] .emgTitle', 'صيانة مجدولة قصيرة');
  await a.fill('.emg-card[data-k="slow"] .emgCount', '7');
  await a.click('#emgSave'); await a.waitForTimeout(800);
  const saved = JSON.parse(q("SELECT config_value FROM site_config WHERE config_key='emergency_cfg'") || '{}');
  check('حفظ عنوان شاشة الصيانة والعد التنازلي', saved.maint && saved.maint.title === 'صيانة مجدولة قصيرة' && saved.slow.count === 7, JSON.stringify(saved).slice(0, 120));
  await a.click('.emg-card[data-k="offline"] .emgPrev'); await a.waitForTimeout(300);
  check('المعاينة بتعرض الشاشة', await a.evaluate(() => { const e = document.getElementById('gsEmg'); return e && !e.hidden && e.classList.contains('gs-emg-offline'); }));
  await a.waitForTimeout(6500);
  // تشغيل وضع الصيانة
  await a.evaluate(() => { window.gConfirm = async () => true; }); await a.click('#emgMaintToggle'); await a.waitForTimeout(1200);
  check('تشغيل وضع الصيانة', q("SELECT config_value FROM site_config WHERE config_key='maint_on'") === '1');
  const c = await page(b); await c.waitForTimeout(2500);
  const mt = await c.evaluate(() => { const e = document.getElementById('gsEmg'); return e && !e.hidden ? e.textContent : ''; });
  check('العميل/الزائر بيشوف شاشة الصيانة بعنوانها الجديد', /صيانة مجدولة قصيرة/.test(mt), mt.slice(0, 60));
  await a.goto(BASE + '/index.php'); await a.waitForTimeout(3500);
  check('الأدمن مبيشوفش شاشة الصيانة', await a.evaluate(() => { const e = document.getElementById('gsEmg'); return !e || e.hidden || !e.classList.contains('gs-emg-maint'); }));
  await a.evaluate(() => { window.gConfirm = async () => true; renderEmergencyAdminPage(); }); await a.waitForSelector('#emgMaintToggle'); await a.click('#emgMaintToggle'); await a.waitForTimeout(1000);
  check('إيقاف وضع الصيانة', q("SELECT config_value FROM site_config WHERE config_key='maint_on'") === '0');

  // 2) انقطاع الإنترنت
  const ctx = await b.newContext(); const o = await ctx.newPage(); await o.goto(BASE + '/index.php'); await o.waitForTimeout(2000);
  await ctx.setOffline(true); await o.waitForTimeout(500);
  check('النت قطع ← شاشة انقطاع الإنترنت', await o.evaluate(() => { const e = document.getElementById('gsEmg'); return e && !e.hidden && e.classList.contains('gs-emg-offline'); }));
  await ctx.setOffline(false); await o.waitForTimeout(800);
  check('النت رجع ← الشاشة اختفت لوحدها', await o.evaluate(() => { const e = document.getElementById('gsEmg'); return !e || e.hidden; }));
  // 3) السيرفر مش بيرد (503)
  await o.route('**/*.php*', r => r.request().url().includes('site_public_config') ? r.continue() : r.fulfill({ status: 503, body: '' }));
  await o.evaluate(async () => { await fetch('/user_session.php').catch(() => {}); await fetch('/user_session.php').catch(() => {}); }); await o.waitForTimeout(300);
  const dn = await o.evaluate(() => { const e = document.getElementById('gsEmg'); return e && !e.hidden && e.classList.contains('gs-emg-down') ? e.textContent : ''; });
  check('السيرفر مش بيرد ← شاشة «بنرجع حالًا» مع محاولة تلقائية', /محاولة اتصال تلقائية/.test(dn), dn.slice(0, 80));
  await o.unroute('**/*.php*'); await o.click('#gsEmgRetry'); await o.waitForTimeout(1200);
  check('السيرفر رجع ← الشاشة اختفت', await o.evaluate(() => { const e = document.getElementById('gsEmg'); return !e || e.hidden; }));
  // 4) تحميل بطيء (طلب بعد ضغطة المستخدم أخد أكتر من 4 ثواني) ← الشعار + عد تنازلي
  await o.route('**/slowtest.php*', async r => { await new Promise(s => setTimeout(s, 6500)); r.fulfill({ status: 200, body: '{}' }); });
  await o.mouse.click(5, 5);
  o.evaluate(() => fetch('/slowtest.php').catch(() => {}));
  await o.waitForTimeout(4800);
  const sl = await o.evaluate(() => { const e = document.getElementById('gsEmg'); return e && !e.hidden && e.classList.contains('gs-emg-slow') ? { logo: !!e.querySelector('.gs-emg-logo'), cd: (document.getElementById('gsEmgCd') || {}).textContent } : null; });
  check('تحميل بطيء ← الشعار + عد تنازلي', sl && sl.logo && /^\d+$/.test(sl.cd), JSON.stringify(sl));
  await o.waitForTimeout(2500);
  check('التحميل خلص ← الشاشة اختفت', await o.evaluate(() => { const e = document.getElementById('gsEmg'); return !e || e.hidden; }));

  // 5) الدعاية: Upsell بانر + منبثق + شريط متحرك
  await a.evaluate(() => renderAdsAdminPage()); await a.waitForSelector('#adsAdd');
  await a.click('#adsAdd'); await a.fill('.ad-card:last-child .adTitle', 'عرض خاص للزوار'); await a.selectOption('.ad-card:last-child .adAud', 'all'); await a.selectOption('.ad-card:last-child .adType', 'banner');
  await a.click('#adsAdd'); await a.fill('.ad-card:last-child .adTitle', 'إعلان منبثق'); await a.selectOption('.ad-card:last-child .adAud', 'all'); await a.selectOption('.ad-card:last-child .adType', 'popup'); await a.fill('.ad-card:last-child .adEvery', '0');
  await a.click('#adsAdd'); await a.fill('.ad-card:last-child .adTitle', 'شريط الأخبار'); await a.selectOption('.ad-card:last-child .adAud', 'all'); await a.selectOption('.ad-card:last-child .adType', 'marquee');
  await a.click('#adsSave'); await a.waitForTimeout(800);
  const ads = JSON.parse(q("SELECT config_value FROM site_config WHERE config_key='ads_cfg'") || '{}');
  check('حفظ 3 إعلانات', (ads.items || []).length === 3, (ads.items || []).length);
  const v = await page(b); await v.evaluate(() => renderPublicHome()); await v.waitForTimeout(3500);
  const seen = await v.evaluate(() => ({ banner: !!document.querySelector('.gs-ad-banner'), pop: !!document.querySelector('.gs-ad-ov'), mq: !!document.querySelector('.gs-ad-marquee') }));
  check('الزائر: البانر + المنبثق + الشريط المتحرك', seen.banner && seen.pop && seen.mq, JSON.stringify(seen));
  await v.click('.gs-ad-ov .gs-ad-x'); await v.evaluate(() => renderPublicHome()); await v.waitForTimeout(2500);
  check('المنبثق «مرة واحدة» مبيظهرش تاني', await v.locator('.gs-ad-ov').count() === 0);
  await a.evaluate(() => renderHome()); await a.waitForTimeout(2500);
  check('الإدارة مبتشوفش الدعاية', await a.locator('.gs-ad-banner, .gs-ad-ov').count() === 0);
  // Upsell: المشترك في باقة أقل بس
  q(`REPLACE INTO site_config (config_key, config_value) VALUES ('ads_cfg', '{"items":[{"id":"ups1","on":true,"type":"banner","audience":"upsell","title":"رقّي باقتك","body":"","cta":"plans","ctaLabel":"الباقات","every":0}]}')`);
  const cu = await page(b); await loginAs(cu, CUST); await cu.evaluate(() => { window.__adsCfg = null; window.__adsAud = null; renderHome(); }); await cu.waitForTimeout(4000);
  const aud = await cu.evaluate(async () => [...(await gAdsAudience())]);
  const upShown = await cu.locator('.gs-ad-banner[data-ad="ups1"]').count() === 1;
  check('Upsell بيظهر بس للجمهور المناسب', aud.includes('upsell') ? upShown : !upShown, aud.join(','));

  // 6) نموذج الخطة: البحث عن رمز السهم + آخر سعر + استخدمه أو يدوي
  await a.evaluate(() => renderNewPlanForm()); await a.waitForTimeout(800);
  await a.fill('#symbol', 'COMI'); await a.waitForTimeout(1800);
  const f1 = await a.evaluate(() => ({ st: document.querySelector('.g-symchk').textContent, px: document.getElementById('currentPrice').value, ro: document.getElementById('currentPrice').readOnly }));
  check('اسم سهم مدرج: ✅ موجود + آخر سعر اتكتب في خانة السعر', /موجود/.test(f1.st) && +f1.px > 0 && f1.ro, JSON.stringify(f1));
  await a.check('input[name="currentPrice_mode"][value="manual"]'); await a.fill('#currentPrice', '77');
  check('اختيار «اكتب السعر يدوي» بيسمح بالكتابة', await a.inputValue('#currentPrice') === '77');
  await a.fill('#symbol', 'ZZQXW'); await a.waitForTimeout(1800);
  check('اسم غلط: ❌ غير موجود', /غير موجود/.test(await a.textContent('.g-symchk')));
  await a.check('input[name="listed"][value="0"]'); await a.waitForTimeout(400);
  check('غير مدرج: مفيش بحث والسعر يدوي', /غير مدرج/.test(await a.textContent('.g-symchk')) && !(await a.evaluate(() => document.getElementById('currentPrice').readOnly)));
  await a.evaluate(() => renderGridPlanForm()); await a.waitForTimeout(800);
  await a.fill('#g_symbol', 'HRHO'); await a.waitForTimeout(1800);
  check('نموذج Grid: نفس البحث + آخر سعر', /موجود/.test(await a.textContent('.g-symchk')) && +(await a.inputValue('#g_currentPrice')) > 0);
  check('بدون أخطاء JavaScript', !a.__errors.length && !v.__errors.length && !cu.__errors.length, a.__errors[0] || v.__errors[0] || cu.__errors[0]);

  // تنظيف
  Object.entries(old).forEach(([k, val]) => { if (val === '') q(`DELETE FROM site_config WHERE config_key='${k}'`); else q(`REPLACE INTO site_config (config_key, config_value) VALUES ('${k}', '${val.replace(/\\/g, '\\\\').replace(/'/g, "''")}')`); });
  q("UPDATE site_config SET config_value='0' WHERE config_key='maint_on'");
  await b.close();
  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
