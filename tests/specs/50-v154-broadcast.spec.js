// الإصدار 154: «📢 رسالة لكل المستخدمين» — نص من الأدمن · قنوات · مين يستلم · معاينة · تجربة · سجل · سلة (المسح للأدمن بس) · صلاحية send_broadcast للموظف
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
const { execSync } = require('child_process');
const ST = { email: 'bcstaff154@example.com', pass: 'Test12345bc' };   // موظف لقاعدة الاختبار بس
(async () => {
  q("DELETE FROM login_attempts"); try { q("DELETE FROM rate_limits"); } catch(e){}
  q("DELETE FROM broadcasts"); q("DELETE FROM users WHERE username LIKE 'bc%@example.com'");
  const vals = Array.from({ length: 28 }, (_, i) => `('bc${i}@example.com','x',0,1)`).join(','); q(`INSERT INTO users (username, password, is_admin, email_verified) VALUES ${vals}`);
  const total = +q("SELECT COUNT(*) FROM users WHERE COALESCE(archived,0)=0");
  const a0 = +q("SELECT COUNT(*) FROM user_alerts"), m0 = +q("SELECT COUNT(*) FROM email_log WHERE mail_type='broadcast'");
  const b = await launch(); const a = await page(b); await loginAdmin(a); await a.evaluate(() => { window.gConfirm = async () => true; });
  await a.evaluate(() => renderAdminHub()); await a.waitForSelector('#goBroadcastBtn', { timeout: 20000 }).catch(() => {});
  check('لوحة التحكم: زرار «📢 رسالة لكل المستخدمين»', !!(await a.$('#goBroadcastBtn')));
  await a.click('#goBroadcastBtn'); await a.waitForSelector('#bcSend', { timeout: 20000 }).catch(() => {});
  check('قائمة منسدلة «مين يستلم» (الكل / النشطين / المدفوع / المجاني / اللي خلص) بالعدد', await a.evaluate(() => document.querySelectorAll('#bcAud option').length === 5 && /كل المستخدمين/.test(document.getElementById('bcAud').textContent)));
  await a.click('#bcPreset'); await a.waitForTimeout(200);
  check('«🌐 نص الدومين الجديد» بيملا الخانات', await a.evaluate(() => /griffine\.app/.test(document.getElementById('bcBody').value) && /griffine\.app/.test(document.getElementById('bcBtnU').value)));
  await a.fill('#bcTitle', 'عرض 154 التجريبي'); await a.fill('#bcBody', 'السطر الأول من الرسالة\nالسطر التاني'); await a.fill('#bcBtnL', 'شوف العرض'); await a.fill('#bcBtnU', 'https://www.griffine.app/index.php');
  await a.click('#bcPrev'); await a.waitForTimeout(200);
  check('👁 معاينة الإشعار والإيميل', await a.evaluate(() => /عرض 154/.test(document.getElementById('bcPv').textContent) && /شوف العرض/.test(document.getElementById('bcPv').textContent)));
  await a.click('#bcTest'); await a.waitForTimeout(1500);
  check('🧪 تجربة على إيميلي بس', +q("SELECT COUNT(*) FROM email_log WHERE mail_type='broadcast_test' AND subject LIKE '%التجريبي%'") >= 1);
  await a.click('#bcSend'); await a.waitForSelector('.bc-item', { timeout: 120000 }).catch(() => {});
  check('اتبعتت لكل المستخدمين على دفعات (إشعار لكل حساب)', +q("SELECT COUNT(*) FROM user_alerts") - a0 === total, (+q("SELECT COUNT(*) FROM user_alerts") - a0) + '/' + total);
  check('إيميل لكل حساب بالعنوان اللي كتبته', +q("SELECT COUNT(*) FROM email_log WHERE mail_type='broadcast' AND subject LIKE '%التجريبي%'") - m0 === total);
  check('الإشعار جوه الموقع بشعار GRIFFINE (kind = bc)', q("SELECT kind FROM user_alerts WHERE account_email='bc3@example.com' ORDER BY id DESC LIMIT 1") === 'bc');
  check('الإيميل فيه شعار GRIFFINE (PNG) فوق', require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'mailer.php'), 'utf8').includes('/griffine-logo-email.png') && require('fs').existsSync(require('path').join(__dirname, '..', '..', 'griffine-logo-email.png')));
  check('السجل: الرسالة اتسجلت «✅ اتبعتت» بالعدد', q("SELECT CONCAT(status,'|',sent_app,'|',total) FROM broadcasts ORDER BY id DESC LIMIT 1") === `done|${total}|${total}` && await a.evaluate(() => /اتبعتت/.test(document.querySelector('.bc-item').textContent)));
  // إشعار بس لفئة «اللي اشتراكهم خلص» (مفيش حد) ← رسالة واضحة
  await a.selectOption('#bcAud', 'expired'); await a.uncheck('#bcMail');
  const ex = +q("SELECT COUNT(*) FROM users u WHERE COALESCE(u.archived,0)=0 AND EXISTS (SELECT 1 FROM subscribers s WHERE LOWER(s.account_email)=LOWER(u.username)) AND NOT EXISTS (SELECT 1 FROM subscribers s WHERE LOWER(s.account_email)=LOWER(u.username) AND s.active=1 AND COALESCE(s.archived,0)=0 AND (s.end_date IS NULL OR s.end_date>=CURDATE()))");
  check('عدد «اللي اشتراكهم خلص» مظبوط', await a.evaluate((n) => new RegExp('\\(' + n + '\\)').test(document.querySelector('#bcAud option[value=expired]').textContent), ex));
  // 🔁 استخدمها تاني + مسح ← السلة ← استرجاع ← حذف نهائي
  await a.click('[data-reuse]'); await a.waitForTimeout(200);
  await a.evaluate(() => { const al = { id: 1, title: 'x', body: 'y', kind: 'bc', is_read: false, created_at: '2026-10-03 10:00:00' }; document.body.insertAdjacentHTML('beforeend', '<div id="bcLogoT">' + mkBcLogo(al) + '</div>'); });
  check('شاشة الإشعارات بتعرض الشعار مكان أي إيموجي', await a.evaluate(() => !!document.querySelector('#bcLogoT img.gs-bc-logo[src*="griffine-logo"]')));
  check('🔁 استخدمها تاني ← النص رجع في الخانات', await a.evaluate(() => document.getElementById('bcTitle').value === 'عرض 154 التجريبي'));
  const id = q("SELECT id FROM broadcasts ORDER BY id DESC LIMIT 1");
  await a.click(`[data-trash="${id}"]`); await a.waitForTimeout(1200);
  check('🗑 مسح ← راحت السلة (مش اتحذفت)', q(`SELECT CONCAT(deleted,'|',deleted_by) FROM broadcasts WHERE id=${id}`) === '1|top72026@gmail.com');
  await a.click('#bcTabTrash'); await a.waitForSelector(`[data-restore="${id}"]`, { timeout: 15000 }).catch(() => {});
  await a.click(`[data-restore="${id}"]`); await a.waitForTimeout(1200);
  check('↩️ استرجاع من السلة', q(`SELECT deleted FROM broadcasts WHERE id=${id}`) === '0');
  await a.evaluate(() => renderAdminBroadcast('sent')); await a.waitForSelector(`[data-trash="${id}"]`, { timeout: 15000 }).catch(() => {});
  await a.click(`[data-trash="${id}"]`); await a.waitForTimeout(1000);
  await a.evaluate(() => renderAdminBroadcast('trash')); await a.waitForSelector(`[data-purge="${id}"]`, { timeout: 15000 }).catch(() => {});
  await a.click(`[data-purge="${id}"]`); await a.waitForTimeout(1200);
  check('🗑 حذف نهائي من السلة', q(`SELECT COUNT(*) FROM broadcasts WHERE id=${id}`) === '0');
  // موظف بصلاحية send_broadcast بس: يبعت ومايقدرش يمسح
  const hash = execSync(`php -r 'echo password_hash("${ST.pass}", PASSWORD_DEFAULT);'`).toString().trim();
  q(`DELETE FROM users WHERE username='${ST.email}'`); q(`INSERT INTO users (username, password, is_admin, email_verified) VALUES ('${ST.email}', '${hash.replace(/\$/g, '\\$')}', 1, 1)`);
  q(`DELETE FROM staff_members WHERE email='${ST.email}'`); q(`INSERT INTO staff_members (email, job_title, active) VALUES ('${ST.email}', 'customer_service', 1)`);
  const sid = q(`SELECT id FROM staff_members WHERE email='${ST.email}'`); q(`INSERT INTO staff_permissions (staff_id, permission_key) VALUES (${sid}, 'send_broadcast')`);
  q("INSERT INTO broadcasts (title, body, total, status, created_by) VALUES ('رسالة الأدمن', 'نص', 1, 'done', 'top72026@gmail.com')");
  const aid = q("SELECT id FROM broadcasts WHERE title='رسالة الأدمن'");
  const z = await page(b); await z.evaluate(() => { window.gConfirm = async () => true; });
  await z.evaluate(async ([e, pw]) => { await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); }, [ST.email, ST.pass]);
  await z.evaluate(() => renderAdminBroadcast()); await z.waitForSelector('#bcSend', { timeout: 20000 }).catch(() => {});
  check('الموظف بصلاحية الإرسال بيفتح الشاشة ويشوف السجل', !!(await z.$('#bcSend')) && await z.evaluate(() => /رسالة الأدمن/.test(document.getElementById('app').textContent)));
  check('الموظف مفيش عنده زرار مسح ولا سلة', await z.evaluate(() => !document.querySelector('[data-trash]') && !document.getElementById('bcTabTrash')));
  const r = await z.evaluate(async (i) => apiPost('/broadcast_api.php', { action: 'trash', ids: String(i) }).catch(e => ({ success: false })), aid);
  check('حتى من غير الشاشة: السيرفر بيرفض مسح الموظف', !r.success && q(`SELECT deleted FROM broadcasts WHERE id=${aid}`) === '0');
  const c = await page(b); const s403 = await c.evaluate(async () => (await fetch('broadcast_api.php', { credentials: 'same-origin' })).status);
  check('الزائر ممنوع (403)', s403 === 403, s403);
  check('بدون أخطاء JavaScript', !a.__errors.length && !z.__errors.length, a.__errors[0] || z.__errors[0]);
  q("DELETE FROM user_alerts WHERE account_email LIKE 'bc%@example.com'"); q("DELETE FROM users WHERE username LIKE 'bc%@example.com'"); q(`DELETE FROM staff_permissions WHERE staff_id=${sid}`); q(`DELETE FROM staff_members WHERE email='${ST.email}'`); q("DELETE FROM broadcasts");
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
