// GRIFFINE tests — أدوات مشتركة
const { chromium } = require('playwright-core');
const { execSync } = require('child_process');
const BASE = process.env.GT_BASE || 'http://127.0.0.1:8099';
const ADMIN = process.env.GT_ADMIN || 'top72026@gmail.com';
const ADMIN_PASS = process.env.GT_ADMIN_PASS || 'Test12345';   // كلمة سر حساب الأدمن في قاعدة الاختبار فقط
const DB = process.env.GT_DB_CMD || 'mariadb -ugt -pgt gtest';
const CHROME = process.env.GT_CHROME || '/opt/pw-browsers/chromium';

let failed = 0, passed = 0;
function check(name, ok, info){ if (ok) passed++; else failed++; console.log(`${ok ? '  ✔' : '  ✘'} ${name}${info !== undefined ? '  → ' + String(info).slice(0, 160) : ''}`); }
function summary(){ console.log(`  = ${passed} نجح، ${failed} فشل`); return failed; }
const q = (sql) => execSync(`${DB} -N -e "SET NAMES utf8mb4; ${sql.replace(/"/g, '\\"')}"`).toString().trim();
async function launch(){ return chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] }); }
// الإصدار 149: الاختبارات بتفتح الموقع الكامل (كأن الجهاز مسجّل قبل كده) — page(b, vp, { lite: true }) = صفحة الزائر الخفيفة
async function page(browser, viewport, opts){
  const ctx = await browser.newContext({ viewport: viewport || { width: 1366, height: 900 } });
  if (!(opts && opts.lite)) await ctx.addCookies([{ name: 'g_in', value: '1', url: BASE }]);
  const p = await ctx.newPage();
  p.__errors = []; p.on('pageerror', e => p.__errors.push(e.message));
  await p.goto(BASE + '/index.php'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.alert = () => {}; });
  return p;
}
async function loginAdmin(p){
  await p.evaluate(async ([e, pw]) => { await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); }, [ADMIN, ADMIN_PASS]);
}
// الإصدار 100: الحذف التلقائي للرموز الغلط متوقف في قاعدة الاختبار (بيانات الاختبار فيها رموز وهمية) - اختبار 15 بيجرّبه لوحده
// الإصدار 130: عوائد «ميزان GRIFFINE AI» أونلاين من السيرفر التجريبي (صفحة البنك المركزي + تقدير عقار) — اختبار 39 بيظبط إعداداته بنفسه
try { q(`REPLACE INTO site_config (config_key, config_value) VALUES ('mizanai_rates_cfg', '{"re_est":"18","markets":{"مصر":{"index":"^CASE30","url":"http://127.0.0.1:8098/cbe","kw":"Overnight Deposit","fb":""}}}'), ('mizanai_live', '')`); } catch(e){}
try { q("REPLACE INTO site_config (config_key, config_value) VALUES ('symbols_clean_at', '9999999999')"); q("DELETE FROM symbol_checks WHERE banned = 1 AND symbol NOT LIKE 'BAD%'"); } catch(e){}
// الإصدار 135: مميزات الباقات — اختبارات الشاشات القديمة بتشتغل على الشهرية بكل المميزات (اختبار 41 بيجرّب الافتراضي بنفسه)
try { q(`UPDATE subscription_plans SET perks = '["dca","grid","portfolio","opps","basira","basira_scan","mizan","mizanai","recs_short","recs_long","screener","alerts","watchlist"]' WHERE id = 'monthly'`); } catch(e){}
module.exports = { BASE, ADMIN, check, summary, q, launch, page, loginAdmin };
