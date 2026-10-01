// الإصدار 128: «توصية شراء / بيع» للمحللين — الاسم وآخر سعر تلقائي + المستويات حسب المدة + أهداف بنسب بيع + وقف على مرحلتين
//   + المعاينة + القنوات + الإيميل على دفعات + رسائل المتابعة + كارت العميل — و«ميزان محفظتك AI» في لوحة التحكم
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
const CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
(async () => {
  q("DELETE FROM login_attempts"); q("DELETE FROM rec_outbox"); q("DELETE FROM recommendation_updates");
  q("DELETE FROM recommendations WHERE symbol IN ('COMI','HRHO')"); q(`DELETE FROM user_alerts WHERE account_email='${CUST.email}'`);
  q("DELETE FROM site_config WHERE config_key='mizan_cfg'");
  const b = await launch(); const a = await page(b); await loginAdmin(a);
  await a.evaluate(() => { window.gConfirm = async () => true; });
  await a.evaluate(() => renderAdminHub()); await a.waitForTimeout(1200);
  const hub = await a.evaluate(() => ({ rec: (document.getElementById('goRecommendationsBtn') || {}).textContent || '', mz: !!document.getElementById('goMizanBtn') }));
  check('لوحة التحكم: «توصية شراء / بيع» + زرار «ميزان محفظتك AI»', /توصية شراء \/ بيع/.test(hub.rec) && hub.mz, JSON.stringify(hub));

  // 1) الشاشة + الكود ← الاسم وآخر سعر والمستويات
  await a.click('#goRecommendationsBtn'); await a.waitForSelector('#rcSym', { timeout: 15000 });
  const t0 = await a.evaluate(() => ({ title: (document.querySelector('.gs-page-title') || {}).textContent, types: [...document.querySelectorAll('#rcType button')].map(x => x.textContent.trim()), mk: [...document.querySelectorAll('#rcMkt option')].map(o => o.textContent) }));
  check('الشاشة: «توصية شراء / بيع» + اختيار شراء / بيع + البورصة بالعملة', /توصية شراء \/ بيع/.test(t0.title) && t0.types.length === 2 && /EGP/.test(t0.mk[0]), JSON.stringify(t0));
  await a.fill('#rcSym', 'comi'); await a.waitForSelector('.rc-lv', { timeout: 30000 }).catch(() => {});
  const s1 = await a.evaluate(() => ({ sym: rcSym.value, name: rcName.value, px: (document.querySelector('.rc-px b') || {}).textContent, lv: [...document.querySelectorAll('.rc-lv')].map(x => x.textContent.replace(/\s+/g, ' ').trim()) }));
  check('كتابة الكود ← الكود بالكابيتال + اسم السهم + آخر سعر (متأخر 15 دقيقة)', s1.sym === 'COMI' && s1.name.length > 2 && +s1.px > 0, JSON.stringify(s1).slice(0, 160));
  check('المستويات: 3 مقاومة + المحوري + 3 دعم', s1.lv.length === 7 && /المحوري/.test(s1.lv[3]), s1.lv.join(' | '));
  await a.selectOption('#rcTf', 'month'); await a.waitForFunction((d) => { const x = document.querySelector('.rc-lv'); return x && x.textContent.replace(/\s+/g, ' ').trim() !== d; }, s1.lv[0], { timeout: 30000 }).catch(() => {});
  const s2 = await a.evaluate(() => ({ h: (document.querySelector('#rcSide h4') || {}).textContent, r3: document.querySelector('.rc-lv').textContent.replace(/\s+/g, ' ').trim() }));
  check('تغيير المدة لـ «شهري» ← المستويات بتتحسب من جديد', /شهري/.test(s2.h) && s2.r3 !== s1.lv[0], s2.r3 + ' ≠ ' + s1.lv[0]);

  // 2) الاقتراح + الحسابات + التحقق
  await a.click('#rcSuggest');
  const s3 = await a.evaluate(() => ({ from: +rcFrom.value, to: +rcTo.value, t: [+rcT1.value, +rcT2.value, +rcT3.value], p: [+rcT1p.value, +rcT2p.value, +rcT3p.value], s: +rcS1.value, sum: rcPctSum.textContent, g1: rcT1g.textContent, rr: rcRR.textContent }));
  check('«انقل المستويات»: منطقة شراء + أهداف أعلى منها (40/30/30 — الإصدار 129) + وقف تحتها', s3.from > 0 && s3.to >= s3.from && s3.t.every(x => x > s3.to) && s3.p.join() === '40,30,30' && s3.s < s3.from && s3.sum === '100%', JSON.stringify(s3));
  check('حساب فوري: نسبة كل هدف من الدخول + العائد للمخاطرة', /^\+\d/.test(s3.g1) && /1 : \d/.test(s3.rr), s3.g1 + ' / ' + s3.rr);
  await a.fill('#rcT3p', '10'); const bad = await a.evaluate(async () => { const r = await apiPost('/recs_api.php', { action: 'send', type: 'buy', symbol: 'COMI', stockName: 'x', market: 'مصر', timeframe: 'month', from: rcFrom.value, to: rcTo.value, t1: rcT1.value, t1pct: 50, t2: rcT2.value, t2pct: 25, t3: rcT3.value, t3pct: 10, stop1: rcS1.value, chApp: '1' }); return r.message; });
  check('مجموع نسب البيع لازم 100% (السيرفر بيرفض 85%)', /100%/.test(bad || ''), bad);
  await a.fill('#rcT3p', '30');
  await a.check('#rcStop3Mode'); await a.fill('#rcS2', String((s3.s * 0.97).toFixed(3))); await a.fill('#rcS3', String((s3.s * 0.94).toFixed(3))); await a.fill('#rcS1p', '50'); await a.fill('#rcS2p', '30'); await a.fill('#rcS3p', '20');
  await a.fill('#rcNote', 'الدخول على مرحلتين مع تأكيد الاختراق'); await a.fill('#rcAnalyst', 'محلل الاختبار');
  const pv = await a.evaluate(() => ({ t: document.getElementById('rcPreview').textContent.replace(/\s+/g, ' '), tp: document.querySelectorAll('#rcPreview .rc-tp').length, sl: document.querySelectorAll('#rcPreview .rc-sl').length }));
  check('المعاينة: الكود + الشراء من/إلى + 3 نقاط بيع بنسبها (باقي الكمية) + وقف 3 مراحل + الملاحظة + المحلل', pv.tp === 3 && pv.sl === 3 && /COMI/.test(pv.t) && /باقي الكمية/.test(pv.t) && /بيع 50%/.test(pv.t) && /مرحلتين/.test(pv.t) && /محلل الاختبار/.test(pv.t), pv.t.slice(0, 200));

  // 3) الإرسال: إشعار المنصة + الإيميل في الطابور ← بيتبعت على دفعات
  await a.click('#rcSend'); await a.waitForFunction(() => /اتبعتت/.test(rcMsg.textContent), null, { timeout: 30000 }).catch(() => {});
  const sent = await a.evaluate(() => rcMsg.textContent);
  const row = q("SELECT CONCAT_WS('|', rec_type, timeframe, currency, resistance1_pct, resistance2_pct, resistance3_pct, stop1_pct, stop2_pct, analyst_name, channels) FROM recommendations WHERE symbol='COMI' ORDER BY id DESC LIMIT 1").trim();
  check('الإرسال ← التوصية اتحفظت بكل البيانات (النوع / المدة / العملة / النسب / الوقف / المحلل / القنوات)', /اتبعتت/.test(sent) && /^buy\|month\|EGP\|40\.00\|30\.00\|30\.00\|50\.00\|30\.00\|محلل الاختبار\|app,email$/.test(row), row + ' — ' + sent);
  const al = q(`SELECT CONCAT(title, '§', body) FROM user_alerts WHERE account_email='${CUST.email}' ORDER BY id DESC LIMIT 1`);
  check('المشترك جاله إشعار على المنصة بالرسالة المنسّقة', /توصية شراء/.test(al) && /نقطة بيع 1/.test(al) && /باقي الكمية/.test(al) && /وقف الخسارة 2/.test(al) && /ملاحظة المحلل/.test(al), al.slice(0, 160));
  await a.waitForFunction(() => /خلص/.test((document.getElementById('rcProg') || {}).textContent || ''), null, { timeout: 60000 }).catch(() => {});
  const ob = q("SELECT CONCAT(SUM(status=0), '/', COUNT(*)) FROM rec_outbox WHERE channel='email'").trim();
  check('الإيميلات اتبعتت على دفعات من الطابور (مفيش حاجة مستنية)', /^0\/[1-9]/.test(ob), ob);

  // 4) توصية بيع + سعر «فشلت»
  await a.evaluate(() => renderRecommendationsAdminPage()); await a.waitForSelector('#rcSym');
  await a.click('#rcType button[data-t="sell"]'); await a.fill('#rcSym', 'HRHO'); await a.waitForSelector('.rc-lv', { timeout: 30000 }).catch(() => {});
  await a.click('#rcSuggest');
  const sl = await a.evaluate(() => ({ h: rcStH.textContent, pct: !document.getElementById('rcSellPctW').hidden, pv: document.getElementById('rcPreview').textContent.replace(/\s+/g, ' ') }));
  check('توصية بيع: منطقة بيع + نسبة البيع + مستويات هبوط + «التوصية فاشلة لو السعر عدّى لفوق»', /فاشلة/.test(sl.h) && sl.pct && /توصية بيع/.test(sl.pv) && /مستويات الهبوط/.test(sl.pv) && /فاشلة/.test(sl.pv), sl.pv.slice(0, 160));
  await a.uncheck('#rcChEmail'); await a.click('#rcSend'); await a.waitForFunction(() => /اتبعتت/.test(rcMsg.textContent), null, { timeout: 30000 }).catch(() => {});
  check('إرسال توصية البيع (المنصة بس)', q("SELECT CONCAT(rec_type, '|', channels) FROM recommendations WHERE symbol='HRHO' ORDER BY id DESC LIMIT 1").trim() === 'sell|app');

  // 5) رسالة متابعة + إغلاق
  await a.evaluate(() => renderRecommendationsAdminPage()); await a.waitForSelector('[data-rc-upd]', { timeout: 15000 });
  const rid = q("SELECT id FROM recommendations WHERE symbol='COMI' ORDER BY id DESC LIMIT 1").trim();
  await a.click(`[data-rc-upd="${rid}"]`); await a.waitForSelector('#rcUMsg');
  await a.selectOption('#rcUKind', 'target'); await a.fill('#rcUMsg', 'الهدف الأول اتحقق — ارفع وقف الخسارة لسعر الدخول'); await a.click('#rcUSend'); await a.waitForTimeout(1500);
  check('رسالة متابعة «تحقق هدف» اتحفظت ووصلت إشعار', q(`SELECT COUNT(*) FROM recommendation_updates WHERE rec_id=${rid} AND kind='target'`).trim() === '1' && /تحقق هدف/.test(q(`SELECT title FROM user_alerts WHERE account_email='${CUST.email}' ORDER BY id DESC LIMIT 1`)));

  // 6) كارت العميل (موبايل) + التحديث تحته
  const c = await page(b, { width: 390, height: 844 });
  await c.evaluate(async ([e, pw]) => { window.alert = () => {}; await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); }, [CUST.email, CUST.pass]);
  await c.evaluate(() => renderRecommendationsCustomerPage()); await c.waitForSelector('.rc-card', { timeout: 15000 }).catch(() => {});
  const cc = await c.evaluate(() => ({ n: document.querySelectorAll('.rc-card').length, buy: !!document.querySelector('.rc-card.rc-buy .rc-tp'), sell: !!document.querySelector('.rc-card.rc-sell'), upd: (document.querySelector('.rc-upd') || {}).textContent || '', plan: !!document.querySelector('.rc-card.rc-buy [data-plan]'), ov: document.documentElement.scrollWidth - innerWidth }));
  check('العميل: كارت شراء (نقاط بيع) + كارت بيع + التحديث تحت التوصية + «حوّل لخطة»', cc.n >= 2 && cc.buy && cc.sell && /تحقق هدف/.test(cc.upd) && cc.plan, JSON.stringify(cc));
  check('العميل على الموبايل: مفيش تمرير أفقي', cc.ov <= 1, cc.ov);
  await a.evaluate((id) => apiPost('/recs_api.php', { action: 'update', id, kind: 'close', message: 'إغلاق التوصية — تحقق الهدف الأول', chApp: '1' }), rid);
  check('«إغلاق التوصية» ← اتقفلت', q(`SELECT CONCAT(archived, status) FROM recommendations WHERE id=${rid}`).trim() === '1closed');

  // 7) ميزان محفظتك في لوحة التحكم
  await a.evaluate(() => renderAdminHub()); await a.waitForSelector('#goMizanBtn'); await a.click('#goMizanBtn'); await a.waitForSelector('#mzSaveCfg', { timeout: 10000 });
  const f = await a.evaluate(() => ({ n: document.querySelectorAll('.mz-adm [data-k]').length, cap: document.querySelector('[data-k="sector_cap"]').value }));
  await a.fill('[data-k="sector_cap"]', '30'); await a.click('#mzSaveCfg'); await a.waitForTimeout(800);
  const saved = await a.evaluate(async () => (await apiGet('/mizan_api.php?action=admin_get')).config.sector_cap);
  check('شاشة «ميزان محفظتك AI» في لوحة التحكم: كل القواعد قابلة للتعديل + الحفظ شغال', f.n >= 20 && f.cap === '40' && saved === 30, JSON.stringify(f) + ' saved=' + saved);
  check('بدون أخطاء JavaScript', !a.__errors.length && !c.__errors.length, a.__errors[0] || c.__errors[0]);
  q("DELETE FROM site_config WHERE config_key='mizan_cfg'"); q("DELETE FROM rec_outbox"); q("DELETE FROM recommendation_updates");
  q("DELETE FROM recommendations WHERE symbol IN ('COMI','HRHO')"); q(`DELETE FROM user_alerts WHERE account_email='${CUST.email}'`);
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
