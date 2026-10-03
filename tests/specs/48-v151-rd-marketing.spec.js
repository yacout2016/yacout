// الإصدار 151: «🔬 البحث والتطوير» (تحليلات الزوار + اقتراحات بقواعد ثابتة) + «📣 التسويق» (محتوى بقوالب ثابتة + جدول + مطلوب منك + الأداء)
const { check, summary, launch, page, loginAdmin, q, BASE } = require('../lib');
(async () => {
  q("DELETE FROM login_attempts"); try { q("DELETE FROM site_events"); q("DELETE FROM mkt_items"); q("DELETE FROM site_config WHERE config_key='mkt_cfg'"); q("DELETE FROM rate_limits"); } catch(e){}
  const b = await launch();
  // زائر من تيك توك (حملة launch) على الموبايل + خطأ + بحث مالقاش + تسجيل
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', lite: true });
  const g = await ctx.newPage(); g.__errors = []; await g.goto(BASE + '/index.php?utm_source=tiktok&utm_campaign=launch'); await g.waitForTimeout(2500);
  await g.evaluate(() => renderRegister()); await g.waitForTimeout(700);
  await g.evaluate(() => { gTrack('miss', 'search', 'zzzz سهم'); gTrack('sig', 'renderRegister'); setTimeout(() => { throw new Error('rd test err'); }, 10); }); await g.waitForTimeout(1500);
  const g2 = await page(b, null, { lite: true }); await g2.waitForTimeout(1500);   // زائر مباشر على الكمبيوتر
  const ev = q("SELECT GROUP_CONCAT(DISTINCT ev ORDER BY ev) FROM site_events");
  check('الزوار بيتسجّلوا (مشاهدات + خطأ + بحث + تسجيل) من غير أي خدمة خارجية', /err/.test(ev) && /miss/.test(ev) && /pv/.test(ev) && /sig/.test(ev), ev);
  check('مصدر الزيارة والحملة اتعرفوا (tiktok.launch) والجهاز موبايل وiOS', q("SELECT CONCAT(src,'|',device,'|',os) FROM site_events WHERE ev='pv' AND src LIKE 'tiktok%' LIMIT 1") === 'tiktok.launch|mobile|iOS');
  const a = await page(b); await loginAdmin(a); await a.evaluate(() => { window.gConfirm = async () => true; });
  const before = +q("SELECT COUNT(*) FROM site_events");
  await a.evaluate(() => renderAdminHub()); await a.waitForSelector('#goRdBtn', { timeout: 20000 }).catch(() => {});
  check('لوحة التحكم ← «التطوير والتسويق»: زرار «🔬 البحث والتطوير» و«📣 التسويق»', !!(await a.$('#goRdBtn')) && !!(await a.$('#goMktBtn')));
  await a.click('#goRdBtn'); await a.waitForSelector('.rd-kpis', { timeout: 20000 }).catch(() => {});
  await a.evaluate(() => renderAdminRD(1)); await a.waitForSelector('.rd-kpis', { timeout: 20000 }).catch(() => {}); await a.waitForTimeout(500);
  const t = await a.evaluate(() => document.getElementById('app').innerText);
  check('البحث والتطوير: الزوار + الأجهزة + المصادر (تيك توك · launch)', /زوار/.test(t) && /تيك توك/.test(t) && /launch/.test(t) && /موبايل/.test(t), t.slice(0, 200));
  check('الأخطاء عند المستخدمين + «دوّروا ومالقوش» + رحلة الزائر', /rd test err/.test(t) && /zzzz/.test(t) && /رحلة الزائر/.test(t));
  check('📋 تقرير التطوير فيه اقتراحات (قواعد ثابتة)', await a.evaluate(() => document.querySelectorAll('.rd-sug').length >= 1));
  await a.click('#rdCopy'); await a.waitForTimeout(500);
  check('«نسخ التقرير» ← نص كامل جاهز تبعته للتطوير', await a.evaluate(() => /تقرير التطوير/.test(rdTxt.value) && /الاقتراحات/.test(rdTxt.value) && /rd test err/.test(rdTxt.value)));
  check('زيارات الأدمن مش بتتحسب', +q("SELECT COUNT(*) FROM site_events") === before, q("SELECT COUNT(*) FROM site_events") + ' vs ' + before);
  // التسويق
  await a.evaluate(() => renderAdminMkt('gen')); await a.waitForSelector('#mkGo', { timeout: 20000 }).catch(() => {});
  await a.selectOption('#mkPf', 'tiktok'); await a.selectOption('#mkTp', 'basira'); await a.fill('#mkCmp', 'launch'); await a.click('#mkGo'); await a.waitForTimeout(300);
  const out = await a.evaluate(() => document.getElementById('mkOut').innerText);
  check('✨ اقترح محتوى: سكريبت فيديو تيك توك + كابشن + هاشتاجات + رابط تتبع', /سكريبت فيديو/.test(out) && /#GRIFFINE/.test(out) && /utm_source=tiktok/.test(out) && /utm_campaign=launch/.test(out), out.slice(0, 120));
  await a.click('#mkAgain'); await a.waitForTimeout(200);
  await a.click('#mkSave'); await a.waitForTimeout(1500);
  check('حفظ في جدول النشر ← اتسجل في قاعدة البيانات', q("SELECT CONCAT(kind,'|',platform,'|',status,'|',campaign) FROM mkt_items WHERE kind='post' ORDER BY id DESC LIMIT 1") === 'post|tiktok|scheduled|launch');
  await a.evaluate(() => renderAdminMkt('tasks')); await a.waitForSelector('.mk-item', { timeout: 15000 }).catch(() => {});
  const tasks = await a.evaluate(() => document.getElementById('mkBody').innerText);
  check('📝 مطلوب منك: مهام اتكتبت لوحدها (روابط الحسابات / 3 بوستات / الرد على التعليقات)', /رابط حسابك على تيك توك/.test(tasks) && /3 بوستات/.test(tasks) && /رد على كل التعليقات/.test(tasks), tasks.slice(0, 160));
  await a.click('.mk-item [data-done]'); await a.waitForTimeout(1500);
  check('علّمت مهمة «خلصت» ← اتسجّلت بتاريخها في السجل', +q("SELECT COUNT(*) FROM mkt_items WHERE status='done' AND done_at IS NOT NULL") === 1);
  await a.evaluate(() => renderAdminMkt('perf')); await a.waitForSelector('.mk-perf', { timeout: 15000 }).catch(() => {});
  const perf = await a.evaluate(() => document.querySelector('.mk-perf').innerText.replace(/\s+/g, ' '));
  check('📊 الأداء: تيك توك · launch ← 1 زائر و1 تسجيل', /tiktok\.launch 1 1/.test(perf), perf);
  await a.evaluate(() => renderAdminMkt('acc')); await a.waitForSelector('#mkL_tiktok', { timeout: 15000 }).catch(() => {});
  await a.fill('#mkL_tiktok', 'https://www.tiktok.com/@griffine'); await a.click('#mkLinksSave'); await a.waitForTimeout(1200);
  check('🔗 روابط الحسابات اتحفظت (من غير أي كلمة سر)', /tiktok\.com\/@griffine/.test(q("SELECT config_value FROM site_config WHERE config_key='mkt_cfg'")) && await a.evaluate(() => /كلمة سر/.test(document.querySelector('.mk-warn').textContent)));
  await a.click('#mkLgo'); await a.waitForTimeout(200);
  check('رابط تتبع لأي بوست', await a.evaluate(() => /utm_source=tiktok/.test(document.getElementById('mkLout').textContent)));
  check('بدون أخطاء JavaScript', !a.__errors.length && !g2.__errors.length, a.__errors[0] || g2.__errors[0]);
  q("DELETE FROM site_events"); q("DELETE FROM mkt_items"); q("DELETE FROM site_config WHERE config_key='mkt_cfg'");
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
