// الإصدار 131: «توصية شراء / بيع» — معاينة قبل الإرسال (إشعار التطبيق / الإيميل / الواتساب) + PDF بالثلاث أشكال + مشاركة
// + مسودة ← حذف لسلة المحذوفات ← استرجاع / حذف نهائي + موافقة الأدمن قبل الإرسال (صلاحية rec_approve) + رفض بسبب
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
const { execSync } = require('child_process');
const CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
const AN = { email: 'analyst131@example.com', pass: 'Test12345an' };   // حساب محلل لقاعدة الاختبار بس
(async () => {
  q("DELETE FROM login_attempts"); q("DELETE FROM rec_outbox"); q("REPLACE INTO site_config (config_key, config_value) VALUES ('recs_cfg', '')");
  q("DELETE FROM recommendations WHERE note LIKE 'اختبار 131%'");
  const b = await launch(); const a = await page(b); await loginAdmin(a);
  await a.evaluate(() => { window.gConfirm = async () => true; window.gPrompt = async () => 'المستويات محتاجة مراجعة'; });
  const fill = async (p, note) => {
    await p.evaluate(() => renderRecommendationsAdminPage()); await p.waitForSelector('#rcSym');
    await p.fill('#rcSym', 'COMI'); await p.waitForSelector('.rc-lv', { timeout: 30000 }).catch(() => {});
    await p.click('#rcSuggest'); await p.uncheck('#rcAttAi'); await p.fill('#rcNote', note); await p.waitForTimeout(400);
  };

  // 1) المعاينة بالثلاث أشكال
  await fill(a, 'اختبار 131 معاينة');
  await a.click('#rcPreviewBtn'); await a.waitForSelector('.rc-pv', { timeout: 30000 }).catch(() => {});
  const pv = await a.evaluate(() => { const ov = document.querySelector('.rc-pv'); if (!ov) return null;
    return { tabs: [...ov.querySelectorAll('#rcPvTabs button')].map(x => x.textContent.trim()), push: (ov.querySelector('.rcpv-push b') || {}).textContent, img: !!ov.querySelector('.rcpv-push img'),
      mail: ov.querySelector('.rcpv-mail').srcdoc, wa: (ov.querySelector('.rcpv-bub') || {}).textContent || '', card: !!ov.querySelector('.rc-card') }; });
  check('«معاينة قبل الإرسال» ← 3 أشكال: إشعار التطبيق / الإيميل / الواتساب', pv && pv.tabs.length === 3 && /إشعار التطبيق/.test(pv.tabs[0]) && /الإيميل/.test(pv.tabs[1]) && /واتساب/.test(pv.tabs[2]), JSON.stringify(pv && pv.tabs));
  check('إشعار التطبيق: العنوان + صورة الرسم + كارت التوصية جوه التطبيق', pv && /توصية شراء/.test(pv.push) && pv.img && pv.card);
  check('الإيميل: نفس الإيميل الاحترافي (خطة التوصية + صورة الرسم) — والواتساب رسالة بسيطة ومعاها اللينك', pv && /خطة التوصية/.test(pv.mail) && /data:image\/png/.test(pv.mail) && /COMI/.test(pv.wa) && /griffine|127\.0\.0\.1/i.test(pv.wa), pv && pv.wa.slice(0, 120));
  check('المعاينة مش بتحفظ ولا بتبعت حاجة', q("SELECT COUNT(*) FROM recommendations WHERE note = 'اختبار 131 معاينة'") === '0');
  const [pop] = await Promise.all([a.waitForEvent('popup', { timeout: 15000 }).catch(() => null), a.click('#rcPvPdfAll')]);
  let pdf = null; if (pop) { await pop.waitForLoadState().catch(() => {}); await pop.waitForTimeout(600); pdf = await pop.evaluate(() => ({ h2: [...document.querySelectorAll('h2')].map(h => h.textContent), bar: [...document.querySelectorAll('#gReportBar button')].map(x => x.textContent) })); await pop.close(); }
  check('«PDF بالثلاث أشكال» ← نافذة فيها الإشعار + الإيميل + الواتساب وأزرار تحميل PDF / مشاركة / طباعة', pdf && pdf.h2.length === 3 && pdf.bar.some(x => /PDF/.test(x)) && pdf.bar.some(x => /مشاركة/.test(x)), JSON.stringify(pdf));
  await a.click('#rcPvClose');

  // 2) مسودة ← سلة المحذوفات ← استرجاع ← حذف نهائي
  await a.fill('#rcNote', 'اختبار 131 مسودة'); await a.click('#rcDraft');
  await a.waitForFunction(() => /مسودة/.test(rcMsg.textContent), null, { timeout: 30000 }).catch(() => {});
  const dr = q("SELECT CONCAT(id, '|', status, '|', archived) FROM recommendations WHERE note = 'اختبار 131 مسودة' ORDER BY id DESC LIMIT 1").split('|');
  check('«حفظ مسودة» ← اتحفظت (مسودة — مش ظاهرة للمشتركين ومفيش إرسال)', dr[1] === 'draft' && dr[2] === '1' && q(`SELECT COUNT(*) FROM rec_outbox WHERE rec_id = ${dr[0]}`) === '0', dr.join('|'));
  await a.waitForSelector(`[data-rc-trash="${dr[0]}"]`, { timeout: 10000 }).catch(() => {});
  const card = await a.evaluate((id) => { const c = document.querySelector(`[data-rc-pv="${id}"]`); const k = c && c.closest('.rc-log'); return k ? { t: k.textContent, pub: !!k.querySelector('[data-rc-pub]'), tr: !!k.querySelector('[data-rc-trash]') } : null; }, dr[0]);
  check('السجل: المسودة فوق ومعاها معاينة / إرسال / حذف', card && /مسودة/.test(card.t) && card.pub && card.tr, JSON.stringify(card).slice(0, 120));
  await a.click(`[data-rc-pv="${dr[0]}"]`); await a.waitForSelector('.rc-pv', { timeout: 20000 }).catch(() => {});
  check('معاينة المسودة المحفوظة (نفس الثلاث أشكال)', await a.evaluate(() => !!document.querySelector('.rc-pv .rcpv-mail') && /خطة التوصية/.test(document.querySelector('.rc-pv .rcpv-mail').srcdoc)));
  await a.click('#rcPvClose');
  await a.click(`[data-rc-trash="${dr[0]}"]`); await a.waitForTimeout(1200);
  const tb = q(`SELECT CONCAT(id, '|', item_type) FROM trash_bin WHERE item_type = 'recommendation' AND restored_at IS NULL ORDER BY id DESC LIMIT 1`).split('|');
  check('«حذف» ← المسودة اتنقلت لسلة المحذوفات', q(`SELECT COUNT(*) FROM recommendations WHERE id = ${dr[0]}`) === '0' && tb[1] === 'recommendation', tb.join('|'));
  const rs = await a.evaluate(async (id) => apiPost('/trash_api.php', { action: 'restore', id }), tb[0]);
  check('الاسترجاع من السلة ← المسودة رجعت', rs.success && q(`SELECT status FROM recommendations WHERE id = ${dr[0]}`) === 'draft', JSON.stringify(rs));
  await a.evaluate(async (id) => apiPost('/recs_api.php', { action: 'trash', id }), dr[0]);
  const tb2 = q(`SELECT id FROM trash_bin WHERE item_type = 'recommendation' AND restored_at IS NULL ORDER BY id DESC LIMIT 1`);
  const pg = await a.evaluate(async (id) => apiPost('/trash_api.php', { action: 'purge', id }), tb2);
  check('الحذف النهائي من السلة', pg.success && q(`SELECT COUNT(*) FROM trash_bin WHERE id = ${tb2}`) === '0', JSON.stringify(pg));

  // 3) موافقة الأدمن قبل الإرسال
  await a.evaluate(() => renderAdminRecsCfg()); await a.waitForSelector('[data-k="approval_on"]');
  await a.check('[data-k="approval_on"]'); await a.click('#rcSaveCfg'); await a.waitForTimeout(800);
  check('لوحة التحكم: تفعيل «موافقة الأدمن قبل الإرسال»', /"approval_on":true/.test(q("SELECT config_value FROM site_config WHERE config_key = 'recs_cfg'")));
  const hash = execSync(`php -r 'echo password_hash("${AN.pass}", PASSWORD_DEFAULT);'`).toString().trim();
  q(`DELETE FROM users WHERE username='${AN.email}'`); q(`INSERT INTO users (username, password, is_admin, email_verified) VALUES ('${AN.email}', '${hash.replace(/\$/g, '\\$')}', 1, 1)`);
  q(`DELETE FROM staff_members WHERE email='${AN.email}'`); q(`INSERT INTO staff_members (email, job_title, active) VALUES ('${AN.email}', 'financial_analyst', 1)`);
  const sid = q(`SELECT id FROM staff_members WHERE email='${AN.email}'`); q(`INSERT INTO staff_permissions (staff_id, permission_key) VALUES (${sid}, 'manage_recommendations')`);
  const z = await page(b); await z.evaluate(() => { window.gConfirm = async () => true; });
  await z.evaluate(async ([e, pw]) => { await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); }, [AN.email, AN.pass]);
  await fill(z, 'اختبار 131 مراجعة');
  const ui = await z.evaluate(() => ({ btn: rcSend.textContent, note: (document.querySelector('.rc-pendnote') || {}).textContent || '' }));
  check('عند المحلل: الزرار «إرسال للمراجعة» + ملاحظة إن التوصية هتروح للأدمن الأول', /للمراجعة/.test(ui.btn) && /موافقة/.test(ui.note), JSON.stringify(ui));
  const alerts0 = q(`SELECT COALESCE(MAX(id), 0) FROM user_alerts`);
  await z.click('#rcSend'); await z.waitForFunction(() => /للمراجعة/.test(rcMsg.textContent), null, { timeout: 30000 }).catch(() => {});
  const pr = q("SELECT CONCAT(id, '|', status, '|', archived) FROM recommendations WHERE note = 'اختبار 131 مراجعة' ORDER BY id DESC LIMIT 1").split('|');
  check('المحلل بعت ← «بانتظار الموافقة» (مش ظاهرة للمشتركين ومفيش إشعار ليهم)', pr[1] === 'pending' && pr[2] === '1' && q(`SELECT COUNT(*) FROM user_alerts WHERE id > ${alerts0} AND account_email = '${CUST.email}'`) === '0', pr.join('|'));
  check('الأدمن جاله إشعار «توصية محتاجة موافقة»', +q(`SELECT COUNT(*) FROM user_alerts WHERE id > ${alerts0} AND account_email = 'top72026@gmail.com' AND title LIKE '%محتاجة موافقة%'`) === 1);
  await a.evaluate(() => renderRecommendationsAdminPage()); await a.waitForSelector(`[data-rc-pub="${pr[0]}"]`, { timeout: 15000 }).catch(() => {});
  const ap = await a.evaluate((id) => { const k = document.querySelector(`[data-rc-pub="${id}"]`); const c = k && k.closest('.rc-log'); return { badge: (document.getElementById('recPendBadge') || {}).textContent, t: c ? c.textContent : '', rej: !!(c && c.querySelector('[data-rc-rej]')), first: document.querySelector('#recListWrap .rc-log') === c }; }, pr[0]);
  check('الأدمن: «⏳ بانتظار الموافقة» فوق السجل + «موافقة وإرسال» و«رفض»', /بانتظار الموافقة/.test(ap.badge) && /موافقة وإرسال/.test(ap.t) && ap.rej && ap.first, JSON.stringify(ap).slice(0, 160));
  await a.click(`[data-rc-pub="${pr[0]}"]`); await a.waitForTimeout(1500);
  const after = q(`SELECT CONCAT(status, '|', archived, '|', approved_by) FROM recommendations WHERE id = ${pr[0]}`);
  check('«موافقة وإرسال» ← التوصية اتبعتت للمشتركين (وصلت إشعار) + اتسجّل مين وافق', /^active\|0\|top72026@gmail\.com$/i.test(after) && +q(`SELECT COUNT(*) FROM user_alerts WHERE id > ${alerts0} AND account_email = '${CUST.email}' AND title LIKE '%توصية شراء%'`) === 1, after);
  check('المحلل جاله إشعار «اتوافق عليها واتبعتت»', +q(`SELECT COUNT(*) FROM user_alerts WHERE id > ${alerts0} AND account_email = '${AN.email}' AND title LIKE '%اتوافق عليها%'`) === 1);
  // رفض بسبب
  await fill(z, 'اختبار 131 رفض'); await z.click('#rcSend'); await z.waitForFunction(() => /للمراجعة/.test(rcMsg.textContent), null, { timeout: 30000 }).catch(() => {});
  const rj = q("SELECT id FROM recommendations WHERE note = 'اختبار 131 رفض' ORDER BY id DESC LIMIT 1");
  await a.evaluate(() => renderRecommendationsAdminPage()); await a.waitForSelector(`[data-rc-rej="${rj}"]`, { timeout: 15000 }).catch(() => {});
  await a.click(`[data-rc-rej="${rj}"]`); await a.waitForTimeout(1200);
  check('«رفض» ← التوصية مرفوضة بالسبب والمحلل جاله الإشعار بالسبب', q(`SELECT CONCAT(status, '|', reject_reason) FROM recommendations WHERE id = ${rj}`) === 'rejected|المستويات محتاجة مراجعة'
    && +q(`SELECT COUNT(*) FROM user_alerts WHERE account_email = '${AN.email}' AND title LIKE '%اترفضت%' AND body LIKE '%المستويات محتاجة مراجعة%'`) >= 1);
  const ownBad = await z.evaluate(async (id) => apiPost('/recs_api.php', { action: 'publish', id }), rj);
  check('المحلل مايقدرش يوافق على توصيته بنفسه', !ownBad.success, ownBad.message);
  // صلاحية «مراجعة واعتماد التوصيات» ← الموظف بيبعت على طول
  q(`INSERT INTO staff_permissions (staff_id, permission_key) VALUES (${sid}, 'rec_approve')`);
  await fill(z, 'اختبار 131 مباشر'); await z.click('#rcSend'); await z.waitForFunction(() => /اتبعتت —/.test(rcMsg.textContent), null, { timeout: 30000 }).catch(() => {});
  check('اللي معاه صلاحية «مراجعة واعتماد التوصيات» توصيته بتتبعت على طول', q("SELECT status FROM recommendations WHERE note = 'اختبار 131 مباشر' ORDER BY id DESC LIMIT 1") === 'active');
  check('الصلاحية الجديدة ظاهرة في قائمة الصلاحيات', await a.evaluate(async () => JSON.stringify(await apiGet('/staff_list.php').catch(() => ({}))).includes('rec_approve')));
  // الإصدار 132: صلاحية المحلل «توصياته لازم الأدمن يوافق عليها» (حتى والموافقة العامة مقفولة — وحتى لو معاه «مُراجِع»)
  q("REPLACE INTO site_config (config_key, config_value) VALUES ('recs_cfg', '')"); q(`INSERT IGNORE INTO staff_permissions (staff_id, permission_key) VALUES (${sid}, 'rec_needs_review')`);
  await fill(z, 'اختبار 131 مراجعة المحلل'); const ui2 = await z.evaluate(() => rcSend.textContent);
  await z.click('#rcSend'); await z.waitForFunction(() => /للمراجعة/.test(rcMsg.textContent), null, { timeout: 30000 }).catch(() => {});
  const nr = q("SELECT CONCAT(id, '|', status) FROM recommendations WHERE note = 'اختبار 131 مراجعة المحلل' ORDER BY id DESC LIMIT 1").split('|');
  check('الإصدار 132: محلل عليه «توصياته لازم الأدمن يوافق عليها» ← بتروح للمراجعة حتى لو معاه «مُراجِع» والموافقة العامة مقفولة', /للمراجعة/.test(ui2) && nr[1] === 'pending', ui2 + ' ' + nr.join('|'));
  const self = await z.evaluate(async (id) => apiPost('/recs_api.php', { action: 'publish', id }), nr[0]);
  check('المحلل اللي معاه «مُراجِع» مايقدرش يوافق على توصيته هو', !self.success && /بنفسك/.test(self.message || ''), self.message);
  q(`DELETE FROM staff_permissions WHERE staff_id = ${sid} AND permission_key = 'rec_needs_review'`);
  // الموافقة مقفولة ← المحلل بيبعت على طول
  q("REPLACE INTO site_config (config_key, config_value) VALUES ('recs_cfg', '')"); q(`DELETE FROM staff_permissions WHERE staff_id = ${sid} AND permission_key = 'rec_approve'`);
  await fill(z, 'اختبار 131 من غير موافقة'); await z.click('#rcSend'); await z.waitForFunction(() => /اتبعتت —/.test(rcMsg.textContent), null, { timeout: 30000 }).catch(() => {});
  check('لو الموافقة مقفولة ← توصية المحلل بتتبعت للمشتركين على طول', q("SELECT status FROM recommendations WHERE note = 'اختبار 131 من غير موافقة' ORDER BY id DESC LIMIT 1") === 'active');

  check('بدون أخطاء JavaScript', !a.__errors.length && !z.__errors.length, a.__errors[0] || z.__errors[0]);
  q("DELETE FROM recommendations WHERE note LIKE 'اختبار 131%'"); q(`DELETE FROM staff_members WHERE email='${AN.email}'`); q(`DELETE FROM users WHERE username='${AN.email}'`);
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
