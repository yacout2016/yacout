// الإصدار 154/156: «📢 الرسائل» — أشخاص بالاسم (بحث + الأدمن أول واحد) أو مجموعات · قنوات · معاينة · سجل · سلة (المسح للأدمن بس)
//   + بريد داخلي بين الأدمن والموظفين (أي موظف) · المشتركين محتاجين send_broadcast · 📥 الوارد + ↩️ رد
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
const { execSync } = require('child_process');
const ST = { email: 'bcstaff154@example.com', pass: 'Test12345bc' };   // موظف لقاعدة الاختبار بس
(async () => {
  q("DELETE FROM login_attempts"); try { q("DELETE FROM rate_limits"); } catch(e){}
  q("DELETE FROM broadcasts"); q("DELETE FROM broadcast_recipients"); q("DELETE FROM users WHERE username LIKE 'bc%@example.com'");
  const vals = Array.from({ length: 28 }, (_, i) => `('bc${i}@example.com','x',0,1)`).join(','); q(`INSERT INTO users (username, password, is_admin, email_verified) VALUES ${vals}`);
  q("INSERT INTO subscribers (account_email, name, phone, contact_email, plan_id, plan_name, amount, active, start_date, end_date) VALUES ('bc7@example.com', 'سمير بسيوني', '01000000000', 'bc7@example.com', 'trial', 'تجربة', 0, 1, CURDATE(), CURDATE() + INTERVAL 10 DAY)");
  const hash = execSync(`php -r 'echo password_hash("${ST.pass}", PASSWORD_DEFAULT);'`).toString().trim();
  q(`INSERT INTO users (username, password, is_admin, email_verified) VALUES ('${ST.email}', '${hash.replace(/\$/g, '\\$')}', 1, 1)`);
  q(`DELETE FROM staff_members WHERE email='${ST.email}'`); q(`INSERT INTO staff_members (email, job_title, active) VALUES ('${ST.email}', 'customer_service', 1)`);
  const sid = q(`SELECT id FROM staff_members WHERE email='${ST.email}'`);
  const total = +q("SELECT COUNT(*) FROM users WHERE COALESCE(archived,0)=0");
  const a0 = +q("SELECT COUNT(*) FROM user_alerts"), m0 = +q("SELECT COUNT(*) FROM email_log WHERE mail_type='broadcast'");
  const b = await launch(); const a = await page(b); await loginAdmin(a); await a.evaluate(() => { window.gConfirm = async () => true; });
  await a.evaluate(() => renderAdminHub()); await a.waitForSelector('#goBroadcastBtn', { timeout: 20000 }).catch(() => {});
  check('لوحة التحكم: زرار «📢 الرسائل»', !!(await a.$('#goBroadcastBtn')));
  await a.click('#goBroadcastBtn'); await a.waitForSelector('#bcSend', { timeout: 20000 }).catch(() => {});
  check('مفيش «تجربة على إيميلي» ولا «نص الدومين» تاني', !(await a.$('#bcTest')) && !(await a.$('#bcPreset')));
  check('«مين يستلم»: أشخاص بالاسم أول اختيار + الموظفين + مجموعات المشتركين', await a.evaluate(() => { const o = [...document.querySelectorAll('#bcAud option')].map(x => x.value); return o[0] === 'people' && o.includes('staff') && o.includes('active') && o.length === 7; }));
  check('الليستة: الأدمن أول واحد + الموظف + المشترك باسمه', await a.evaluate(() => { const r = [...document.querySelectorAll('.bc-p')]; return r.length > 3 && /الأدمن/.test(r[0].textContent) && r.some(x => /bcstaff154/.test(x.textContent) && /موظف/.test(x.textContent)) && r.some(x => /سمير بسيوني/.test(x.textContent) && /مشترك/.test(x.textContent)); }));
  await a.fill('#bcQ', 'bc1'); await a.waitForTimeout(1200);
  check('🔎 البحث بالإيميل', await a.evaluate(() => { const r = [...document.querySelectorAll('.bc-p')]; return r.length >= 1 && r.every(x => /bc1/.test(x.textContent)); }));
  await a.check('[data-pe="bc1@example.com"]');
  await a.fill('#bcQ', 'سمير'); await a.waitForTimeout(1200);
  check('🔎 البحث بالاسم', await a.evaluate(() => /bc7@example\.com/.test(document.getElementById('bcPeople').textContent)));
  await a.check('[data-pe="bc7@example.com"]');
  await a.fill('#bcQ', ''); await a.waitForTimeout(1200); await a.check('.bc-p:first-child input');
  check('اخترت 3 (الأدمن + 2) ← ظاهرين فوق', await a.evaluate(() => document.querySelectorAll('.bc-chip').length === 3 && /الأدمن/.test(document.getElementById('bcChips').textContent)));
  await a.fill('#bcTitle', 'رسالة أشخاص التجريبية'); await a.fill('#bcBody', 'السطر الأول\nالسطر التاني');
  await a.click('#bcPrev'); await a.waitForTimeout(200);
  check('👁 معاينة الإشعار والإيميل بالشعار', await a.evaluate(() => /رسالة أشخاص/.test(document.getElementById('bcPv').textContent) && !!document.querySelector('#bcPv img')));
  await a.click('#bcSend'); await a.waitForSelector('.bc-item', { timeout: 60000 }).catch(() => {}); await a.waitForTimeout(500);
  check('اتبعتت للـ 3 بس (إشعار + إيميل)', q("SELECT CONCAT(audience,'|',total,'|',sent_app,'|',sent_mail,'|',status) FROM broadcasts ORDER BY id DESC LIMIT 1") === 'people|3|3|3|done');
  check('السجل بيوضح المستلمين بالاسم', await a.evaluate(() => /سمير بسيوني/.test(document.querySelector('.bc-item').textContent)));
  check('الإشعار جوه الموقع بشعار GRIFFINE (kind = bc)', q("SELECT kind FROM user_alerts WHERE account_email='bc7@example.com' ORDER BY id DESC LIMIT 1") === 'bc');
  // مجموعة: كل المستخدمين
  await a.selectOption('#bcAud', 'all'); await a.fill('#bcTitle', 'رسالة للكل التجريبية'); await a.fill('#bcBody', 'نص للكل');
  await a.click('#bcSend'); await a.waitForFunction(() => /خلص/.test(document.body.textContent) || document.querySelectorAll('.bc-item').length >= 2, null, { timeout: 120000 }).catch(() => {}); await a.waitForTimeout(1500);
  check('مجموعة «كل المستخدمين» على دفعات', q("SELECT CONCAT(sent_app,'|',total,'|',status) FROM broadcasts WHERE title='رسالة للكل التجريبية'") === `${total}|${total}|done`);
  check('إيميلات المجموعة اتسجلت', +q("SELECT COUNT(*) FROM email_log WHERE mail_type='broadcast' AND subject LIKE '%للكل التجريبية%'") === total);
  // 🔁 + سلة
  await a.evaluate(() => renderAdminBroadcast('sent')); await a.waitForSelector('[data-reuse]', { timeout: 15000 }).catch(() => {});
  const pid = q("SELECT id FROM broadcasts WHERE title='رسالة أشخاص التجريبية'");
  await a.click(`[data-id="${pid}"] [data-reuse]`); await a.waitForTimeout(300);
  check('🔁 استخدمها تاني ← النص والأشخاص رجعوا', await a.evaluate(() => document.getElementById('bcTitle').value === 'رسالة أشخاص التجريبية' && document.querySelectorAll('.bc-chip').length === 3));
  await a.click(`[data-trash="${pid}"]`); await a.waitForTimeout(1200);
  check('🗑 مسح ← السلة', q(`SELECT deleted FROM broadcasts WHERE id=${pid}`) === '1');
  await a.evaluate(() => renderAdminBroadcast('trash')); await a.waitForSelector(`[data-restore="${pid}"]`, { timeout: 15000 }).catch(() => {});
  await a.click(`[data-restore="${pid}"]`); await a.waitForTimeout(1200);
  check('↩️ استرجاع من السلة', q(`SELECT deleted FROM broadcasts WHERE id=${pid}`) === '0');
  await a.evaluate(() => renderAdminBroadcast('sent')); await a.waitForSelector(`[data-trash="${pid}"]`, { timeout: 15000 }).catch(() => {}); await a.click(`[data-trash="${pid}"]`); await a.waitForTimeout(1000);
  await a.evaluate(() => renderAdminBroadcast('trash')); await a.waitForSelector(`[data-purge="${pid}"]`, { timeout: 15000 }).catch(() => {}); await a.click(`[data-purge="${pid}"]`); await a.waitForTimeout(1200);
  check('🗑 حذف نهائي', q(`SELECT COUNT(*) FROM broadcasts WHERE id=${pid}`) === '0');
  // موظف من غير أي صلاحية: يبعت للأدمن بس (بريد داخلي)
  const z = await page(b); await z.evaluate(() => { window.gConfirm = async () => true; });
  await z.evaluate(async ([e, pw]) => { await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); }, [ST.email, ST.pass]);
  await z.evaluate(() => renderAdminBroadcast()); await z.waitForSelector('#bcSend', { timeout: 20000 }).catch(() => {});
  check('الموظف (من غير صلاحية): المستلمين الأدمن والموظفين بس', await z.evaluate(() => { const o = [...document.querySelectorAll('#bcAud option')].map(x => x.value); const r = [...document.querySelectorAll('.bc-p')]; return o.join() === 'people,staff' && /الأدمن/.test(r[0].textContent) && r.every(x => !/مشترك/.test(x.textContent)); }));
  const bad = await z.evaluate(() => apiPost('/broadcast_api.php', { action: 'create', title: 't', body: 'b', ch_app: 1, audience: 'people', to: 'bc3@example.com' }).catch(() => ({})));
  check('السيرفر بيرفض إرسال الموظف لمشترك', !bad.success);
  await z.check('.bc-p:first-child input'); await z.fill('#bcTitle', 'طلب إجازة'); await z.fill('#bcBody', 'محتاج إجازة بكرة');
  await z.click('#bcSend'); await z.waitForTimeout(4000);
  check('الموظف بعت للأدمن (إشعار فيه «من: …»)', /من:.*bcstaff154/.test(q("SELECT body FROM user_alerts WHERE account_email='top72026@gmail.com' AND title='طلب إجازة' ORDER BY id DESC LIMIT 1")));
  check('الموظف مفيش عنده مسح ولا سلة', await z.evaluate(() => !document.querySelector('[data-trash]') && !document.querySelector('[data-bctab="trash"]')));
  const r = await z.evaluate(async (i) => apiPost('/broadcast_api.php', { action: 'trash', ids: String(i) }).catch(() => ({ success: false })), q("SELECT id FROM broadcasts WHERE title='طلب إجازة'"));
  check('السيرفر بيرفض مسح الموظف', !r.success);
  // الأدمن: 📥 الوارد ← ↩️ رد للموظف
  await a.evaluate(() => renderAdminBroadcast('inbox')); await a.waitForSelector('[data-reply]', { timeout: 15000 }).catch(() => {});
  check('📥 الوارد عند الأدمن فيه رسالة الموظف ومن مين', await a.evaluate(() => /طلب إجازة/.test(document.querySelector('.bc-in').textContent) && /من:/.test(document.querySelector('.bc-in').textContent)));
  await a.click('[data-reply]'); await a.waitForSelector('#bcSend', { timeout: 15000 }).catch(() => {}); await a.waitForTimeout(500);
  check('↩️ رد ← العنوان «رد: …» والموظف متحدد', await a.evaluate(() => /^رد: طلب إجازة/.test(document.getElementById('bcTitle').value) && /bcstaff154|bcstaff/.test(document.getElementById('bcChips').textContent + JSON.stringify([...document.querySelectorAll('.bc-chip')].map(x => x.textContent)))));
  await a.fill('#bcBody', 'موافق'); await a.click('#bcSend'); await a.waitForTimeout(3000);
  await z.evaluate(() => renderAdminBroadcast('inbox')); await z.waitForSelector('.bc-in', { timeout: 15000 }).catch(() => {});
  check('الموظف وصله الرد في 📥 الوارد', await z.evaluate(() => /رد: طلب إجازة/.test(document.getElementById('app').textContent)));
  const c = await page(b); const s403 = await c.evaluate(async () => (await fetch('broadcast_api.php', { credentials: 'same-origin' })).status);
  check('الزائر ممنوع (403)', s403 === 403, s403);
  check('بدون أخطاء JavaScript', !a.__errors.length && !z.__errors.length, a.__errors[0] || z.__errors[0]);
  q("DELETE FROM user_alerts WHERE account_email LIKE 'bc%@example.com' OR title IN ('طلب إجازة','رد: طلب إجازة','رسالة أشخاص التجريبية','رسالة للكل التجريبية')"); q("DELETE FROM subscribers WHERE account_email='bc7@example.com'");
  q("DELETE FROM users WHERE username LIKE 'bc%@example.com'"); q(`DELETE FROM staff_permissions WHERE staff_id=${sid}`); q(`DELETE FROM staff_members WHERE email='${ST.email}'`); q("DELETE FROM broadcasts"); q("DELETE FROM broadcast_recipients");
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
