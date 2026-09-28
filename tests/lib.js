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
async function page(browser, viewport){
  const p = await (await browser.newContext({ viewport: viewport || { width: 1366, height: 900 } })).newPage();
  p.__errors = []; p.on('pageerror', e => p.__errors.push(e.message));
  await p.goto(BASE + '/index.php'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.alert = () => {}; });
  return p;
}
async function loginAdmin(p){
  await p.evaluate(async ([e, pw]) => { await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); }, [ADMIN, ADMIN_PASS]);
}
module.exports = { BASE, ADMIN, check, summary, q, launch, page, loginAdmin };
