// سلة المحذوفات: الحذف بينقل للسلة ← الاسترجاع بيرجّع العنصر لمكانه ← الحذف النهائي
const { check, summary, launch, page, loginAdmin, q, ADMIN } = require('../lib');
(async () => {
  const b = await launch(); const p = await page(b); await loginAdmin(p);
  q(`DELETE FROM trash_bin`);
  // 1) خطة DCA
  // بنضيف خطة TRSH لخطط الحساب الموجودة وبعدين نمسحها هي بس
  await p.evaluate(async () => {
    let g = await apiGet('/user_data_get.php?key=plans'); const cur = JSON.parse(g.value || '{}');
    cur.TRSH = { market:'مصر', levels:[{ level:1, executed:true, actualQty:5, actualPrice:3, execDate:'2026-09-01', sells:[] }], closedTrades:[] };
    await apiPost('/user_data_save.php', { key:'plans', value: JSON.stringify(cur), base: JSON.stringify(g.versions || {}) });
    g = await apiGet('/user_data_get.php?key=plans'); const now = JSON.parse(g.value || '{}'); delete now.TRSH;
    await apiPost('/user_data_save.php', { key:'plans', value: JSON.stringify(now), base: JSON.stringify(g.versions || {}) });
  });
  check('حذف الخطة نقلها للسلة', +q(`SELECT COUNT(*) FROM trash_bin WHERE item_type='plan' AND item_label LIKE '%TRSH%'`) === 1);
  // 2) سؤال المساعد
  const fid = q(`INSERT INTO chat_faq (question, answer) VALUES ('سؤال للحذف', 'x'); SELECT LAST_INSERT_ID()`);
  await p.evaluate(async id => apiPost('/chat_faq_api.php', { action:'delete', id }), fid);
  // 3) موظف HR
  const eid = q(`INSERT INTO hr_employees (full_name, salary, status) VALUES ('موظف للاختبار', 1000, 'active'); SELECT LAST_INSERT_ID()`);
  await p.evaluate(async id => apiPost('/hr_api.php', { action:'delete_employee', id }), eid);
  check('المسح من الجداول تم', +q(`SELECT COUNT(*) FROM chat_faq WHERE id=${fid}`) === 0 && +q(`SELECT COUNT(*) FROM hr_employees WHERE id=${eid}`) === 0);
  await p.evaluate(() => renderTrashPage()); await p.waitForTimeout(1500);
  check('شاشة السلة فيها 3 عناصر', await p.locator('[data-tbres]').count() === 3, q(`SELECT GROUP_CONCAT(item_label SEPARATOR ' | ') FROM trash_bin WHERE restored_at IS NULL`));
  const restoreBy = async (txt) => { await p.locator('#tbRows tr', { hasText: txt }).locator('[data-tbres]').click(); await p.waitForTimeout(1500); };
  await restoreBy('موظف للاختبار'); await restoreBy('سؤال للحذف');
  check('استرجاع موظف HR', +q(`SELECT COUNT(*) FROM hr_employees WHERE id=${eid}`) === 1);
  check('استرجاع سؤال المساعد', +q(`SELECT COUNT(*) FROM chat_faq WHERE id=${fid}`) === 1);
  await restoreBy('TRSH');
  check('استرجاع الخطة (تظهر للعميل من جديد)', await p.evaluate(async () => { const g = await apiGet('/user_data_get.php?key=plans'); return !!JSON.parse(g.value || '{}').TRSH; }));
  check('الصفقات اتبنت بعد الاسترجاع', +q(`SELECT COUNT(*) FROM plan_trades WHERE symbol='TRSH'`) === 1);
  // حذف نهائي
  await p.evaluate(async id => apiPost('/chat_faq_api.php', { action:'delete', id }), fid);
  await p.evaluate(() => renderTrashPage()); await p.waitForTimeout(1200);
  await p.locator('[data-tbdel]').first().click(); await p.waitForTimeout(400); await p.click('.g-sheet-btn.primary'); await p.waitForTimeout(1200);
  check('الحذف النهائي من السلة', +q(`SELECT COUNT(*) FROM trash_bin WHERE restored_at IS NULL`) === 0);
  // عميل تاني ما يشوفش سلة الأدمن
  const other = await page(b);
  check('غير المسجّل ممنوع (401)', await other.evaluate(() => fetch('/trash_api.php?action=list').then(r => r.status)) === 401);
  // تنظيف
  await p.evaluate(async () => { const g = await apiGet('/user_data_get.php?key=plans'); const m = JSON.parse(g.value || '{}'); delete m.TRSH; await apiPost('/user_data_save.php', { key:'plans', value: JSON.stringify(m), base: JSON.stringify(g.versions || {}) }); });
  q(`DELETE FROM hr_employees WHERE id=${eid}`); q(`DELETE FROM trash_bin`);
  await b.close(); process.exit(summary());
})();
