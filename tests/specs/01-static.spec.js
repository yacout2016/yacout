// فحص ثابت: كل ملفات PHP بدون أخطاء صياغة + كل ملفات JS + مفيش tag فيه class= مرتين + مفيش أسرار في db.php
const { check, summary } = require('../lib');
const { execSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
(async () => {
  const php = fs.readdirSync(ROOT).filter(f => f.endsWith('.php'));
  let bad = php.filter(f => { try { execSync(`php -l "${path.join(ROOT, f)}"`, { stdio: 'pipe' }); return false; } catch(e){ return true; } });
  check(`PHP: ${php.length} ملف بدون أخطاء صياغة`, !bad.length, bad.join(', '));
  const js = fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && f !== 'sw.js');
  bad = js.filter(f => { try { execSync(`node --check "${path.join(ROOT, f)}"`, { stdio: 'pipe' }); return false; } catch(e){ return true; } });
  check(`JS: ${js.length} ملف بدون أخطاء صياغة`, !bad.length, bad.join(', '));
  const dup = [];
  js.forEach(f => { const s = fs.readFileSync(path.join(ROOT, f), 'utf8'); (s.match(/<[a-zA-Z][^<>]*>/g) || []).forEach(t => { if ((t.match(/\sclass="/g) || []).length > 1) dup.push(f + ': ' + t.slice(0, 60)); }); });
  check('مفيش عنصر فيه class= مرتين (تحويل التنسيقات)', !dup.length, dup[0]);
  const db = fs.readFileSync(path.join(ROOT, 'db.php'), 'utf8');
  check('db.php مفيهوش كلمات سر', !/define\(\s*'DB_PASS'\s*,\s*'[^']+'/.test(db));
  const idx = fs.readFileSync(path.join(ROOT, 'index.php'), 'utf8');
  const vers = [...new Set((idx.match(/\?v=(\d+)/g) || []))];
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').match(/griffine-v(\d+)/)[1];
  const app = fs.readFileSync(path.join(ROOT, 'shell.js'), 'utf8').match(/APP_VERSION = (\d+)/)[1];
  check('رقم الإصدار موحّد (index ?v= / sw.js / APP_VERSION)', vers.length === 1 && vers[0] === '?v=' + sw && sw === app, `${vers} sw=${sw} app=${app}`);
  process.exit(summary());
})();
