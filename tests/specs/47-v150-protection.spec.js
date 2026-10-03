// الإصدار 150: الحماية — حد أقصى للطلبات من نفس الجهاز (ضد سحب البيانات بالبوتات) + تنويه حقوق الملكية
const { check, summary, launch, page, loginAdmin, q, BASE } = require('../lib');
(async () => {
  q("DELETE FROM login_attempts"); try { q("DELETE FROM rate_limits"); } catch(e){}
  const b = await launch();
  const g = await page(b, null, { lite: true });
  const codes = await g.evaluate(async () => { const out = []; for (let i = 0; i < 620; i++) { const r = await fetch('landing_api.php?action=get'); out.push(r.status); } return out; });
  const ok = codes.filter(c => c === 200).length, lim = codes.filter(c => c === 429).length;
  check('زائر عادي: أول 600 طلب في الدقيقة شغالين عادي (حتى لو ناس كتير على نفس عنوان النت)', ok >= 590 && codes.slice(0, 580).every(c => c === 200), ok);
  check('بوت بيسحب بسرعة: بعد الحد ← 429 «طلبات كتير جدًا»', lim >= 15, lim);
  const msg = await g.evaluate(async () => (await (await fetch('landing_api.php?action=get')).json()).message);
  check('رسالة واضحة بالعربي', /طلبات كتير/.test(msg || ''), msg);
  const a = await page(b); await loginAdmin(a);
  const ad = await a.evaluate(async () => { let n = 0; for (let i = 0; i < 200; i++) { const r = await fetch('landing_api.php?action=get'); if (r.status === 200) n++; } return n; });
  check('الأدمن مستثنى من الحد', ad === 200, ad);
  q("DELETE FROM rate_limits");
  const g2 = await page(b, null, { lite: true }); await g2.waitForSelector('.lp-screen', { timeout: 15000 }).catch(() => {});
  check('تنويه «جميع الحقوق محفوظة — يُمنع نسخ التصميم أو المحتوى» في آخر الصفحة', await g2.evaluate(() => /جميع الحقوق محفوظة/.test(document.querySelector('.lp-disc') ? document.querySelector('.lp-disc').textContent : '')));
  check('الصفحة فيها علامة الملكية (copyright)', await g2.evaluate(() => /GRIFFINE/.test((document.querySelector('meta[name="copyright"]') || {}).content || '')));
  check('ملفات الإعدادات الداخلية (rate_lib / perks_lib …) مقفولة في .htaccess', /rate_lib\|recs_lib/.test(require('fs').readFileSync(__dirname + '/../../.htaccess', 'utf8')));
  check('بدون أخطاء JavaScript', !g2.__errors.length && !a.__errors.length, g2.__errors[0] || a.__errors[0]);
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
