// الإصدار 153: نقل الموقع لـ www.griffine.app (مفيش أي griffine.store في الكود) + «📢 إبلاغ كل المستخدمين بالرابط الجديد» (إشعار + إيميل على دفعات)
const { check, summary } = require('../lib');
const fs = require('fs'), path = require('path');
(async () => {
  const root = path.join(__dirname, '..', '..');
  const bad = fs.readdirSync(root).filter(f => /\.(php|js|xml|txt|htaccess)$/.test(f) && f !== 'GRIFFINE-CHANGELOG.txt')
    .filter(f => /griffine\.store/.test(fs.readFileSync(path.join(root, f), 'utf8').replace(/griffine\\\.store/g, '').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*|#)/.test(l) && !/الدومين القديم/.test(l)).join('\n')));
  check('مفيش أي رابط griffine.store في الكود (كله www.griffine.app)', !bad.length, bad.join(', '));
  check('الكوكي على .griffine.app + روابط الإيميلات www.griffine.app', /\.griffine\.app/.test(fs.readFileSync(path.join(root, 'session_boot.php'), 'utf8')) && /'https:\/\/www\.griffine\.app'/.test(fs.readFileSync(path.join(root, 'db.php'), 'utf8')));
  check('.htaccess: الدومين القديم وgriffine.app من غير www ← https://www.griffine.app', /RewriteRule \^ https:\/\/www\.griffine\.app%\{REQUEST_URI\}/.test(fs.readFileSync(path.join(root, '.htaccess'), 'utf8')));
  check('زرار الإبلاغ القديم اتشال (بقى «📢 رسالة لكل المستخدمين» في الإصدار 154)', !fs.existsSync(path.join(root, 'domain_notice.php')));
  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
