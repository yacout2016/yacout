// الإصدار 144: الأدمن يتحكم في كل قوائم المدد في الموقع (لكل شاشة: يشيل اختيار يتمسح من الكل + الافتراضي)
//   + الرئيسية كاملة عند الأدمن ويخفي / يظهر أي كارت للكل + «كل المخفي» في الاستوديو في فاصل مستقل (كل بند قدامه شاشته + إظهار)
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
const CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
(async () => {
  q("DELETE FROM login_attempts");
  q("DELETE FROM site_config WHERE config_key = 'periods_cfg'");
  q("DELETE FROM admin_settings WHERE setting_key LIKE 'hide_home_%'");
  const b = await launch();
  const login = async (p, u) => { await p.evaluate(async ([e, pw]) => { await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); try { await acceptDisclaimer(); } catch(x){} await refreshTopNav(); }, [u.email, u.pass]); };
  const a = await page(b); await loginAdmin(a); await a.evaluate(() => { window.gConfirm = async () => true; });
  const c = await page(b); await login(c, CUST);

  // 1) صفحة «⏱ المدد والفترات» في لوحة التحكم
  await a.evaluate(() => renderAdminHub()); await a.waitForSelector('#goPeriodsBtn', { timeout: 15000 }).catch(() => {});
  check('لوحة التحكم: زرار واحد «الشاشة الرئيسية والقوائم المنسدلة (مدد البحث)»', await a.evaluate(() => /الشاشة الرئيسية والقوائم المنسدلة/.test((document.getElementById('goPeriodsBtn') || {}).textContent || '')));
  await a.click('#goPeriodsBtn'); await a.waitForSelector('.gper-row', { timeout: 15000 }).catch(() => {});
  const pg = await a.evaluate(() => ({ n: document.querySelectorAll('.gper-row').length, t: document.getElementById('app').textContent }));
  check('نفس الصفحة: كروت الشاشة الرئيسية (6) بزرار إخفاء / إظهار لكل كارت', await a.evaluate(() => document.querySelectorAll('#gperHome [data-hk]').length === 6));
  check('الصفحة فيها كل قوائم المدد لكل شاشة (الرئيسية / بصيرة / المسح / الفرص / الكشاف / Grid / الميزان / الموقع العام)', pg.n >= 12 && /منحنى أداء المحفظة/.test(pg.t) && /مدة البحث/.test(pg.t) && /الإطار الزمني/.test(pg.t) && /النطاق التلقائي/.test(pg.t), pg.n);

  await a.click('#gperHome [data-hk="hide_home_recs"]'); await a.waitForTimeout(1200); await a.waitForSelector('#gperHome', { timeout: 10000 }).catch(() => {});
  check('من نفس الصفحة: إخفاء «أحدث التوصيات» ← اتحفظ ومكتوب «مخفي عن العملاء»', q("SELECT setting_value FROM admin_settings WHERE setting_key='hide_home_recs'") === '1' && await a.evaluate(() => /مخفي عن العملاء/.test(document.getElementById('gperHome').textContent)));
  await a.click('#gperHome [data-hk="hide_home_recs"]'); await a.waitForTimeout(1200); await a.waitForSelector('#gperHome', { timeout: 10000 }).catch(() => {});
  check('ودوسة تانية ← رجع ظاهر للكل', q("SELECT setting_value FROM admin_settings WHERE setting_key='hide_home_recs'") === '0');
  // 2) منحنى الرئيسية: شيل «يوم» وخلي الافتراضي «أسبوع»
  await a.click('[data-ed="home_curve"]'); await a.waitForSelector('#gperOv', { timeout: 5000 });
  await a.uncheck('#gperOv .gper-it input[value="1d"]'); await a.uncheck('#gperOv .gper-it input[value="all"]');
  const defOpts = await a.evaluate(() => [...document.querySelectorAll('#gperDef option')].map(o => o.value).join(','));
  check('لوح ⚙: الافتراضي بيختار من الظاهر بس (يوم اتشال من الافتراضي)', !defOpts.split(',').includes('1d') && defOpts.includes('1w'), defOpts);
  await a.selectOption('#gperDef', '1w'); await a.click('#gperSave'); await a.waitForTimeout(800);
  const saved = JSON.parse(q("SELECT config_value FROM site_config WHERE config_key='periods_cfg'") || '{}');
  check('اتحفظت في السيرفر: يوم والكل مخفيين + الافتراضي أسبوع', saved.home_curve && saved.home_curve.d === '1w' && saved.home_curve.h.includes('1d'), JSON.stringify(saved));
  // آخر اختيار ماينفعش يتشال
  await a.click('[data-ed="opps_tf"]'); await a.waitForSelector('#gperOv');
  for (const k of ['1d', '1wk', '1mo', '4h']) await a.uncheck(`#gperOv .gper-it input[value="${k}"]`);
  await a.click('#gperOv .gper-it input[value="1h"]');
  check('لازم يفضل اختيار واحد على الأقل ظاهر', await a.evaluate(() => document.querySelector('#gperOv .gper-it input[value="1h"]').checked && /اختيار واحد/.test(document.getElementById('gperMsg').textContent)));
  await a.click('#gperOv [data-x]');

  // 3) العميل: الرئيسية بتفتح على أسبوع ومفيش «يوم»
  await c.evaluate(async () => { await gPerLoad(true); renderHome(); }); await c.waitForSelector('.gs-curve-rngsel', { timeout: 30000 }).catch(() => {});
  const cc = await c.evaluate(() => { const s = document.querySelector('.gs-curve-rngsel'); return s ? { v: s.value, o: [...s.options].map(o => o.value).join(','), gear: !!document.querySelector('.gper-gear') } : null; });
  check('العميل: منحنى الرئيسية بيفتح على «أسبوع» و«يوم» و«الكل» اتمسحوا من القائمة', cc && cc.v === '1w' && !cc.o.split(',').includes('1d') && !cc.o.split(',').includes('all'), JSON.stringify(cc));
  check('العميل مبيشوفش زرار ⚙', cc && !cc.gear);

  // 4) الأدمن: الرئيسية كاملة + ⚙ جنب القائمة + المخفي مكتوب جنبه «مخفي»
  await a.evaluate(async () => { await gPerLoad(true); renderHome(); }); await a.waitForSelector('.gs-hctl-bar', { timeout: 30000 }).catch(() => {});
  const ah = await a.evaluate(() => ({ bar: document.querySelectorAll('.gs-hctl-b').length, hero: !!document.querySelector('#gsHero .gs-hero'), gear: !!document.querySelector('.gs-hctl-bar .gper-gear') }));
  check('رئيسية الأدمن: شريط «🛠 التحكم في الرئيسية» فيه كل الكروت (6) + ⚙ مدة المنحنى + قيمة المحفظة ظاهرة', ah.bar === 6 && ah.hero && ah.gear, JSON.stringify(ah));

  // 5) إخفاء كارت «الاختصارات» من الرئيسية للكل
  await a.click('.gs-hctl-b[data-hk="hide_home_quick"]'); await a.waitForTimeout(1500); await a.waitForSelector('.gs-hctl-bar', { timeout: 20000 }).catch(() => {});
  check('الأدمن خفى «الاختصارات» ← اتحفظ + لسه شايفه باهت ومكتوب «مخفي»', q("SELECT setting_value FROM admin_settings WHERE setting_key='hide_home_quick'") === '1' && await a.evaluate(() => !!document.querySelector('.gs-hblk.gs-hoff .gs-quick') && /مخفي/.test(document.querySelector('.gs-hctl-b[data-hk="hide_home_quick"]').textContent)));
  await c.evaluate(() => renderHome()); await c.waitForSelector('#gsHero', { timeout: 20000 }).catch(() => {}); await c.waitForTimeout(600);
  check('العميل: «الاختصارات» اختفت من الرئيسية', await c.evaluate(() => { const g = document.querySelector('.gs-quick'); return !g || g.offsetParent === null; }));

  // 6) بصيرة: مدة البحث (المسح) — شيل «يوم» والافتراضي «شهر»
  await a.evaluate(async () => apiPost('/periods_api.php', { action: 'save', id: 'bs_scan', h: JSON.stringify(['day']), d: 'month' }));
  const scanOf = async (p) => { await p.evaluate(async () => { await gPerLoad(true); renderBasira(); }); await p.waitForSelector('#bsTabScan', { timeout: 30000 }).catch(() => {});
    await p.click('#bsTabScan'); await p.waitForSelector('#bsScHz', { timeout: 20000 }).catch(() => {});
    return p.evaluate(() => { const s = document.getElementById('bsScHz'); return s ? { v: s.value, o: [...s.options].map(o => o.value + ':' + o.textContent).join(','), gear: !!document.querySelector('#bsScanWrap .gper-gear') } : null; }); };
  const sh = await scanOf(c);
  check('العميل: مسح السوق بيفتح على «شهر» و«يوم» مش في القائمة (ومفيش ⚙)', sh && sh.v === 'month' && !/day:/.test(sh.o) && !sh.gear, JSON.stringify(sh));
  const sa = await scanOf(a);
  check('الأدمن: ⚙ جنب «مدة البحث» + «يوم» ظاهر له ومكتوب جنبه «مخفي»', sa && sa.gear && /day:يومي \(مخفي\)/.test(sa.o) && sa.v === 'month', JSON.stringify(sa));

  // 7) الاستوديو: «كل المخفي» في فاصل مستقل + كل بند قدامه شاشته + إظهار
  await a.evaluate(() => renderHome()); await a.waitForSelector('#gsHomeAvatar', { timeout: 20000 }).catch(() => {});
  await a.evaluate(() => GStudio.openEditor()); await a.waitForSelector('#gstHidden', { timeout: 10000 });
  await a.evaluate(() => GStudioEditor.select(document.querySelector('#gsHomeAvatar'))); await a.waitForSelector('[data-toggle="display"]', { timeout: 5000 }).catch(() => {});
  await a.check('[data-toggle="display"]'); await a.waitForTimeout(400);
  await a.click('#gstThemes'); await a.waitForTimeout(500);
  const hs = await a.evaluate(() => { const sec = document.querySelector('#gstBody .gst-hidsec'); return sec ? { t: sec.textContent, n: sec.querySelectorAll('.gst-hid').length, cnt: document.getElementById('gstHidCount').textContent } : null; });
  check('لوح الثيمات: فاصل «🙈 كل المخفي» فيه العنصر اللي اتخفى + كارت الاختصارات + اختيارات المدد المخفية', hs && /كل المخفي/.test(hs.t) && /الاختصارات/.test(hs.t) && /«يوم» في مدة منحنى/.test(hs.t) && hs.n >= 4, hs && hs.t.slice(0, 300));
  check('كل بند مكتوب قدامه شاشته (📍 الرئيسية / 📍 بصيرة …)', hs && /📍 الرئيسية/.test(hs.t) && /📍 بصيرة AI — مسح السوق/.test(hs.t));
  await a.click('#gstList'); await a.waitForTimeout(300);
  check('نفس الفاصل في «التعديلات» + عدّاد «🙈 المخفي» في الشريط', await a.evaluate(() => !!document.querySelector('#gstBody .gst-hidsec')) && +hs.cnt >= 4, hs && hs.cnt);
  // إظهار العنصر المخفي من الاستوديو ← يرجع في مكانه
  const idx = await a.evaluate(() => [...document.querySelectorAll('#gstBody .gst-hid')].findIndex(r => /مخفي من الاستوديو/.test(r.textContent)));
  await a.click(`#gstBody [data-hun="${idx}"]`); await a.waitForTimeout(1200);
  check('«إظهار» للعنصر المخفي بالاستوديو ← رجع ظاهر في مكانه', await a.evaluate(() => { const e = document.querySelector('#gsHomeAvatar'); return !!e && getComputedStyle(e).display !== 'none'; }));
  // إظهار كارت الاختصارات من نفس الفاصل
  await a.click('#gstHidden'); await a.waitForTimeout(300);
  const qi = await a.evaluate(() => [...document.querySelectorAll('#gstBody .gst-hid')].findIndex(r => /الاختصارات/.test(r.textContent)));
  await a.click(`#gstBody [data-hun="${qi}"]`); await a.waitForTimeout(1500);
  check('«إظهار» لكارت الاختصارات من الاستوديو ← رجع للعملاء', q("SELECT setting_value FROM admin_settings WHERE setting_key='hide_home_quick'") === '0');
  const pi = await a.evaluate(() => [...document.querySelectorAll('#gstBody .gst-hid')].findIndex(r => /«يوم» في مدة البحث/.test(r.textContent)));
  await a.click(`#gstBody [data-hun="${pi}"]`); await a.waitForTimeout(1500);
  const sv = JSON.parse(q("SELECT config_value FROM site_config WHERE config_key='periods_cfg'") || '{}');
  check('«إظهار» لاختيار مدة مخفي ← رجع في القائمة للكل (والافتراضي زي ما هو)', sv.bs_scan && !sv.bs_scan.h.includes('day') && sv.bs_scan.d === 'month', JSON.stringify(sv.bs_scan));
  await a.evaluate(() => { const x = document.getElementById('gstExit'); if (x) x.click(); }); await a.waitForTimeout(300);

  check('بدون أخطاء JavaScript', !a.__errors.length && !c.__errors.length, a.__errors[0] || c.__errors[0]);
  q("DELETE FROM site_config WHERE config_key = 'periods_cfg'"); q("DELETE FROM admin_settings WHERE setting_key LIKE 'hide_home_%'");
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
