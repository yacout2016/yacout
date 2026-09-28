// GRIFFINE — تشغيل كل الاختبارات بالترتيب: node run-all.js [filter]
const { spawnSync } = require('child_process'); const fs = require('fs'); const path = require('path');
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
const only = process.argv[2] || '';
const specs = fs.readdirSync(path.join(__dirname, 'specs')).filter(f => f.endsWith('.spec.js') && f.includes(only)).sort();
let bad = 0;
for (const s of specs) {
  console.log(`\n▶ ${s}`);
  const r = spawnSync('node', [path.join(__dirname, 'specs', s)], { stdio: 'inherit', timeout: 180000 });
  if (r.status !== 0) bad++;
}
console.log(`\n${bad ? '✘' : '✔'} ${specs.length - bad}/${specs.length} ملفات اختبار نجحت`);
process.exit(bad ? 1 : 0);
