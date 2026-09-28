// تنبيهات السعر المخصّصة: آخر سعر ← حفظ ≥ / ≤ ← إيميل + شات + جرس ← التكرار (حد 3) والفرق الزمني
const { check, summary, launch, page, loginAdmin, q, ADMIN } = require('../lib');
const http = require('http');
// الأسعار بتتخزن مؤقتًا 5 دقائق على السيرفر - الاختبار بيمسح التخزين بعد تغيير السعر
const QCACHE = process.env.GT_QUOTE_CACHE || require('os').tmpdir() + '/griffine_quotes';
const setPrice = (sym, price) => new Promise(r => http.get(`http://127.0.0.1:8098/set?sym=${sym}&price=${price}`, res => { res.resume(); res.on('end', () => { require('fs').rmSync(QCACHE, { recursive: true, force: true }); r(); }); }));
(async () => {
  q(`DELETE FROM custom_alerts WHERE account_email='${ADMIN}'`);
  await setPrice('HRHO', 20);
  const b = await launch(); const p = await page(b); await loginAdmin(p);
  await p.evaluate(() => renderAlertsPage()); await p.waitForTimeout(1800);
  await p.fill('#caSym', 'HRHO'); await p.click('#caQuote'); await p.waitForTimeout(1500);
  check('يعرض آخر سعر (متأخر 15 دقيقة)', /20/.test(await p.textContent('#caQuoteBox')) && /متأخر/.test(await p.textContent('#caQuoteBox')));
  check('العملة اتظبطت حسب البورصة', await p.inputValue('#caCcy') === 'EGP');
  await p.selectOption('#caCond', 'gte'); await p.fill('#caPrice', '22'); await p.selectOption('#caRep', '2'); await p.selectOption('#caInt', '15');
  await p.click('#caSave'); await p.waitForTimeout(2000);
  check('التنبيه اتحفظ ومفيش إرسال (السعر 20 < 22)', q(`SELECT CONCAT(sent_count,':',active) FROM custom_alerts WHERE account_email='${ADMIN}' AND symbol='HRHO'`) === '0:1');
  await setPrice('HRHO', 23);
  const before = +q(`SELECT COUNT(*) FROM chat_messages WHERE message LIKE '🔔 تنبيه سعر%'`);
  await p.evaluate(() => fetch('/price_alerts_check.php').then(r => r.json()));
  check('السعر 23 ≥ 22 ← أول تذكير', q(`SELECT sent_count FROM custom_alerts WHERE account_email='${ADMIN}' AND symbol='HRHO'`) === '1');
  check('رسالة في شات الموقع', +q(`SELECT COUNT(*) FROM chat_messages WHERE message LIKE '🔔 تنبيه سعر%'`) === before + 1);
  check('تنبيه في الجرس', +q(`SELECT COUNT(*) FROM user_alerts WHERE account_email='${ADMIN}' AND symbol='HRHO' AND created_at > NOW() - INTERVAL 2 MINUTE`) >= 1);
  await p.evaluate(() => fetch('/price_alerts_check.php').then(r => r.json()));
  check('مفيش تكرار قبل مرور الفرق الزمني (15 دقيقة)', q(`SELECT sent_count FROM custom_alerts WHERE account_email='${ADMIN}' AND symbol='HRHO'`) === '1');
  q(`UPDATE custom_alerts SET last_sent_at = NOW() - INTERVAL 16 MINUTE WHERE account_email='${ADMIN}' AND symbol='HRHO'`);
  await p.evaluate(() => fetch('/price_alerts_check.php').then(r => r.json()));
  check('بعد 15 دقيقة ← التذكير الثاني والأخير ثم يتوقف', q(`SELECT CONCAT(sent_count,':',active) FROM custom_alerts WHERE account_email='${ADMIN}' AND symbol='HRHO'`) === '2:0');
  // ≤
  await p.evaluate(() => renderAlertsPage()); await p.waitForTimeout(1500);
  await p.fill('#caSym', 'HRHO'); await p.selectOption('#caCond', 'lte'); await p.fill('#caPrice', '25'); await p.click('#caSave'); await p.waitForTimeout(2000);
  check('شرط ≤ متحقق من البداية ← تذكير فوري', q(`SELECT sent_count FROM custom_alerts WHERE account_email='${ADMIN}' AND symbol='HRHO' AND cond='lte'`) === '1');
  await setPrice('HRHO', 20);
  await b.close(); process.exit(summary());
})();
