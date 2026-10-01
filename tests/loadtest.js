// الإصدار 127: اختبار ضغط — محاكاة مشتركين فاتحين الموقع في نفس الوقت (نفس الطلبات اللي المتصفح بيبعتها)
//   الاستخدام: GT_BASE=http://127.0.0.1:8096 node loadtest.js [مدة كل مرحلة بالثواني] [مستويات التزامن مفصولة بفاصلة]
//   بيطلع لكل مستوى: عدد الطلبات في الثانية + زمن الرد (المتوسط / 95% / الأقصى) + الأخطاء
//   + تقدير عدد المشتركين اللي السيرفر يستحملهم في نفس الوقت بالطلبات الدورية الجديدة (الإصدار 127) والقديمة
const http = require('http');
const BASE = new URL(process.env.GT_BASE || 'http://127.0.0.1:8099');
const EMAIL = process.env.GT_ADMIN || 'top72026@gmail.com', PASS = process.env.GT_ADMIN_PASS || 'Test12345';
const DUR = +(process.argv[2] || 15), LEVELS = (process.argv[3] || '10,25,50,100').split(',').map(Number);
const agent = new http.Agent({ keepAlive: true, maxSockets: 1000 });
let cookie = '', csrf = '';
function req(method, path, body){
  return new Promise((res) => {
    const t0 = process.hrtime.bigint();
    const data = body ? new URLSearchParams(body).toString() : null;
    const r = http.request({ host: BASE.hostname, port: BASE.port, path, method, agent, headers: Object.assign({ Cookie: cookie }, data ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) } : {}) }, (x) => {
      const sc = x.headers['set-cookie']; if (sc) cookie = sc.map(c => c.split(';')[0]).join('; ');
      let b = ''; x.on('data', d => b += d); x.on('end', () => res({ ok: x.statusCode < 500, code: x.statusCode, ms: Number(process.hrtime.bigint() - t0) / 1e6, body: b }));
    });
    r.on('error', () => res({ ok: false, code: 0, ms: Number(process.hrtime.bigint() - t0) / 1e6, body: '' }));
    r.setTimeout(30000, () => r.destroy());
    if (data) r.write(data); r.end();
  });
}
// الطلبات الدورية لكل مشترك فاتح الموقع (في الدقيقة) — قبل وبعد الإصدار 127
const PER_MIN_OLD = { chat: 60 / 8, ping: 1, nav: 2 * 4 };
const PER_MIN_NEW = { chat: 60 / 25, ping: 1, nav: 2 * 4 };
// خليط الطلبات اللي بنضغط بيها (بنفس نسب الاستخدام الجديد)
const MIX = [
  ['chat', 'GET', () => '/chat_history.php?visitorId=lt_' + Math.floor(Math.random() * 500)],
  ['ping', 'GET', () => '/site_public_config.php?ping=' + Date.now()],
  ['nav', 'GET', () => '/session_check.php'], ['nav', 'GET', () => '/admin_settings_get.php'],
  ['nav', 'GET', () => '/user_data_get.php?key=plans'], ['nav', 'GET', () => '/my_subscription.php'],
];
const W = MIX.map(m => PER_MIN_NEW[m[0]] / MIX.filter(x => x[0] === m[0]).length), WT = W.reduce((a, b) => a + b, 0);
const pick = () => { let r = Math.random() * WT; for (let i = 0; i < MIX.length; i++) { r -= W[i]; if (r <= 0) return MIX[i]; } return MIX[0]; };
const pct = (a, p) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0;

(async () => {
  const s = await req('GET', '/session_check.php'); try { csrf = JSON.parse(s.body).csrfToken || ''; } catch(e){}
  const l = await req('POST', '/login.php', { email: EMAIL, password: PASS, csrf_token: csrf });
  const chk = await req('GET', '/session_check.php'); let me = ''; try { me = JSON.parse(chk.body).email || ''; } catch(e){}
  console.log(`السيرفر: ${BASE.origin} — الدخول: ${me ? 'تم (' + me + ')' : 'فشل (' + l.code + ')'} — مدة كل مرحلة ${DUR} ثانية`);
  const out = [];
  for (const C of LEVELS) {
    const lat = []; let n = 0, err = 0; const end = Date.now() + DUR * 1000;
    await Promise.all(Array.from({ length: C }, async () => { while (Date.now() < end) { const m = pick(); const r = await req(m[1], m[2]()); n++; lat.push(r.ms); if (!r.ok) err++; } }));
    lat.sort((a, b) => a - b);
    const rps = n / DUR, avg = lat.reduce((a, b) => a + b, 0) / (lat.length || 1);
    out.push({ C, rps: +rps.toFixed(1), avg: +avg.toFixed(0), p95: +pct(lat, 0.95).toFixed(0), max: +(lat[lat.length - 1] || 0).toFixed(0), err });
    console.log(`تزامن ${String(C).padStart(4)} | ${rps.toFixed(1).padStart(7)} طلب/ث | متوسط ${avg.toFixed(0).padStart(5)}ms | 95% ${pct(lat, 0.95).toFixed(0).padStart(5)}ms | أقصى ${(lat[lat.length - 1] || 0).toFixed(0).padStart(6)}ms | أخطاء ${err}`);
  }
  // أقصى معدل والزمن لسه مقبول (95% أقل من ثانية)
  const good = out.filter(x => x.p95 < 1000 && x.err === 0), best = good.length ? Math.max(...good.map(x => x.rps)) : Math.max(...out.map(x => x.rps));
  const perUser = (o) => Object.values(o).reduce((a, b) => a + b, 0) / 60;
  console.log(`\nأقصى معدل بزمن رد مقبول: ${best.toFixed(1)} طلب/ث`);
  console.log(`كل مشترك فاتح الموقع: ${perUser(PER_MIN_NEW).toFixed(3)} طلب/ث (الإصدار 127) — كان ${perUser(PER_MIN_OLD).toFixed(3)} قبله`);
  console.log(`تقدير المشتركين المتصلين في نفس الوقت: حوالي ${Math.floor(best / perUser(PER_MIN_NEW))} (كان حوالي ${Math.floor(best / perUser(PER_MIN_OLD))})`);
  console.log('JSON ' + JSON.stringify({ levels: out, best, perUserNew: perUser(PER_MIN_NEW), perUserOld: perUser(PER_MIN_OLD) }));
  process.exit(0);
})();
