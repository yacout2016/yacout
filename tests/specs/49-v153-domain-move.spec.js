// الإصدار 153: نقل الموقع لـ www.griffine.app (مفيش أي griffine.store في الكود) + «📢 إبلاغ كل المستخدمين بالرابط الجديد» (إشعار + إيميل على دفعات)
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
const fs = require('fs'), path = require('path');
(async () => {
  const root = path.join(__dirname, '..', '..');
  const bad = fs.readdirSync(root).filter(f => /\.(php|js|xml|txt|htaccess)$/.test(f) && f !== 'GRIFFINE-CHANGELOG.txt')
    .filter(f => /griffine\.store/.test(fs.readFileSync(path.join(root, f), 'utf8').replace(/griffine\\\.store/g, '').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*|#)/.test(l) && !/الدومين القديم/.test(l)).join('\n')));
  check('مفيش أي رابط griffine.store في الكود (كله www.griffine.app)', !bad.length, bad.join(', '));
  check('الكوكي على .griffine.app + روابط الإيميلات www.griffine.app', /\.griffine\.app/.test(fs.readFileSync(path.join(root, 'session_boot.php'), 'utf8')) && /'https:\/\/www\.griffine\.app'/.test(fs.readFileSync(path.join(root, 'db.php'), 'utf8')));
  check('.htaccess: الدومين القديم وgriffine.app من غير www ← https://www.griffine.app', /RewriteRule \^ https:\/\/www\.griffine\.app%\{REQUEST_URI\}/.test(fs.readFileSync(path.join(root, '.htaccess'), 'utf8')));
  q("DELETE FROM login_attempts"); try { q("DELETE FROM rate_limits"); } catch(e){}
  q("DELETE FROM site_config WHERE config_key='domain_notice'");
  const vals = Array.from({ length: 30 }, (_, i) => `('dn${i}@example.com','x',0,1)`).join(',');
  q("DELETE FROM users WHERE username LIKE 'dn%@example.com'"); q(`INSERT INTO users (username, password, is_admin, email_verified) VALUES ${vals}`);
  const total = +q("SELECT COUNT(*) FROM users WHERE COALESCE(archived,0)=0");
  const a0 = +q("SELECT COUNT(*) FROM user_alerts"), m0 = +q("SELECT COUNT(*) FROM email_log WHERE mail_type='domain_notice'");
  const b = await launch(); const a = await page(b); await loginAdmin(a); await a.evaluate(() => { window.gConfirm = async () => true; });
  await a.evaluate(() => renderAdminHub()); await a.waitForSelector('#goDomainBtn', { timeout: 20000 }).catch(() => {});
  check('لوحة التحكم: زرار «📢 إبلاغ كل المستخدمين بالرابط الجديد»', !!(await a.$('#goDomainBtn')));
  await a.click('#goDomainBtn'); await a.waitForSelector('#dnSend', { timeout: 20000 }).catch(() => {});
  check('الشاشة بتوضح العدد والرابط الجديد', await a.evaluate((n) => { const t = document.getElementById('app').innerText; return /www\.griffine\.app/.test(t) && t.includes(String(n)) && /لسه ماتبعتش/.test(t); }, total));
  await a.click('#dnSend'); await a.waitForFunction(() => /خلص/.test((document.getElementById('dnProg') || {}).textContent || ''), null, { timeout: 120000 }).catch(() => {});
  check('اتبعت على دفعات لكل المستخدمين (إشعار جوه الموقع لكل حساب)', +q("SELECT COUNT(*) FROM user_alerts") - a0 === total, (+q("SELECT COUNT(*) FROM user_alerts") - a0) + ' / ' + total);
  check('إيميل لكل حساب فيه الرابط الجديد (اتسجّل في سجل الإيميلات)', +q("SELECT COUNT(*) FROM email_log WHERE mail_type='domain_notice'") - m0 === total);
  check('الإشعار نصه فيه www.griffine.app وتسجيل الدخول من جديد', /www\.griffine\.app.*سجّل دخولك/.test(q("SELECT body FROM user_alerts WHERE account_email='dn5@example.com' ORDER BY id DESC LIMIT 1")));
  const st = JSON.parse(q("SELECT config_value FROM site_config WHERE config_key='domain_notice'"));
  check('اتسجّل إن الإبلاغ اتبعت (عشان مايتبعتش مرتين بالغلط)', st.running === false && st.app === total, JSON.stringify(st));
  await a.evaluate(() => renderAdminDomainNotice()); await a.waitForSelector('#dnLast', { timeout: 15000 }).catch(() => {});
  check('الشاشة بتقول آخر إرسال إمتى وكام', await a.evaluate(() => /آخر إرسال/.test(document.getElementById('dnLast').textContent)));
  const c = await page(b); const r = await c.evaluate(async () => (await fetch('domain_notice.php', { credentials: 'same-origin' })).status);
  check('الزائر ممنوع من الصفحة (403)', r === 403, r);
  check('بدون أخطاء JavaScript', !a.__errors.length, a.__errors[0]);
  q("DELETE FROM user_alerts WHERE account_email LIKE 'dn%@example.com'"); q("DELETE FROM users WHERE username LIKE 'dn%@example.com'"); q("DELETE FROM site_config WHERE config_key='domain_notice'");
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
