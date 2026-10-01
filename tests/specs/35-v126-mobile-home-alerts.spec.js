// الإصدار 126: تنبيهات الرئيسية على الجوال — مفيش صندوق تمرير داخلي (كان بياخد 92% من الشاشة ويمسك السحب ← الصفحة بتهنّج)
//   آخر 3 تنبيهات بس + كل تنبيه سطرين (لمسة تفتح الباقي) + «عرض الكل (7)» — والكمبيوتر زي ما هو (5 ظاهرين والباقي تمرير)
const { check, summary, launch, page, loginAdmin, q, ADMIN } = require('../lib');
(async () => {
  q("DELETE FROM login_attempts"); q(`DELETE FROM user_alerts WHERE account_email='${ADMIN}'`);
  for (let i = 1; i <= 7; i++) q(`INSERT INTO user_alerts (account_email, title, body, symbol, market) VALUES ('${ADMIN}', 'وصل السهم للمستوى ${i}', 'السهم COMI وصل لسعر الشراء التالي في خطة تعزيز المتوسط.\\nالكمية المقترحة 50 سهم بمتوسط تكلفة 120.5\\nالربح على آخر سعر +2.3%', 'COMI', 'مصر')`);
  const b = await launch();
  const m = await page(b, { width: 390, height: 844 }); await loginAdmin(m);
  await m.evaluate(() => renderHome()); await m.waitForSelector('#gsAlertsCard .gs-alert-row', { timeout: 20000 }).catch(() => {}); await m.waitForTimeout(1200);
  const r = await m.evaluate(() => { const l = document.querySelector('#gsAlertsCard .gs-alert-list'), cs = getComputedStyle(l), card = document.querySelector('#gsAlertsCard .gs-alert-card');
    const inner = [...document.querySelectorAll('#app *')].filter(e => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2 && e.offsetParent !== null && !e.closest('table, .gs-sidebar'); }).map(e => e.className);
    return { rows: document.querySelectorAll('#gsAlertsCard .gs-alert-row').length, ov: cs.overflowY, osb: cs.overscrollBehaviorY, h: Math.round(card.getBoundingClientRect().height), vh: innerHeight, title: document.querySelector('#gsAlertsCard strong').textContent, all: document.getElementById('gsAlertsAll').textContent, inner }; });
  check('الجوال: آخر 3 تنبيهات بس + العنوان بالعدد الكلي (7) + «عرض الكل (7)»', r.rows === 3 && /\(7\)/.test(r.title) && /عرض الكل \(7\)/.test(r.all), JSON.stringify(r));
  check('الجوال: الكارت من غير تمرير داخلي ومبيمسكش السحب', r.ov === 'visible' && r.osb === 'auto', r.ov + ' / ' + r.osb);
  check('الجوال: مفيش أي صندوق تمرير داخلي في الرئيسية', !r.inner.length, r.inner.join(' | '));
  check('الجوال: طول كارت التنبيهات أقل من نص الشاشة', r.h < r.vh / 2, r.h + ' / ' + r.vh);
  const cl = await m.evaluate(() => { const d = document.querySelector('#gsAlertsCard .gs-alert-row > div'); const h1 = d.getBoundingClientRect().height; d.click(); const h2 = d.getBoundingClientRect().height; return { h1, h2 }; });
  check('الجوال: كل تنبيه سطرين ولمسة بتفتح النص كامل', cl.h2 > cl.h1 + 5, JSON.stringify(cl));
  const y0 = await m.evaluate(() => scrollY); await m.mouse.move(195, 600); await m.mouse.wheel(0, 500); await m.waitForTimeout(400);
  check('الجوال: السحب فوق التنبيهات بيحرّك الصفحة نفسها', await m.evaluate((y) => scrollY > y + 100, y0), await m.evaluate(() => scrollY));
  await m.click('#gsAlertsAll'); await m.waitForTimeout(1500);
  check('«عرض الكل» ← شاشة التنبيهات بكل الإشعارات', await m.evaluate(() => window.__lastPageKey === 'alerts' && document.querySelectorAll('.gs-notif').length === 7));
  // الكمبيوتر زي ما هو
  const a = await page(b, { width: 1366, height: 900 }); await loginAdmin(a);
  await a.evaluate(() => renderHome()); await a.waitForSelector('#gsAlertsCard .gs-alert-row', { timeout: 20000 }).catch(() => {}); await a.waitForTimeout(1000);
  const d = await a.evaluate(() => { const l = document.querySelector('#gsAlertsCard .gs-alert-list'); return { rows: document.querySelectorAll('#gsAlertsCard .gs-alert-row').length, ov: getComputedStyle(l).overflowY }; });
  check('الكمبيوتر: كل التنبيهات السبعة + تمرير داخلي زي الأول', d.rows === 7 && d.ov === 'auto', JSON.stringify(d));
  check('بدون أخطاء JavaScript', !a.__errors.length && !m.__errors.length, a.__errors[0] || m.__errors[0]);
  q(`DELETE FROM user_alerts WHERE account_email='${ADMIN}'`);
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
