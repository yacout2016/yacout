// جدول الصفقات (plan_trades) بيتبني مع حفظ الخطط + تقرير الإدارة + إعادة البناء
const { check, summary, launch, page, loginAdmin, q, ADMIN } = require('../lib');
(async () => {
  const b = await launch(); const p = await page(b); await loginAdmin(p);
  await p.evaluate(async () => {
    const dca = { TSTX: { market:'مصر', levels:[{ level:1, executed:true, actualQty:100, actualPrice:10, execDate:'2026-09-01', sells:[{ qty:40, price:12, date:'2026-09-10' }] }, { level:2, executed:false, sells:[] }],
      closedTrades:[{ closedDate:'2026-08-20T10:00:00Z', totalQty:50, avgEntry:8, avgExit:9, profit:50, capitalUsed:400 }] } };
    const grid = { TSTG: { market:'مصر', levels:[{ status:'bought', executedQty:10, executedPrice:5, executedDate:'2026-09-05', sells:[] }],
      closedTrades:[{ closedDate:'2026-09-02', totalQty:10, avgEntry:5, avgExit:4, profit:-10, capitalUsed:50 }] } };
    await apiPost('/user_data_save.php', { key:'plans', value: JSON.stringify(dca) });
    await apiPost('/user_data_save.php', { key:'grid_plans', value: JSON.stringify(grid) });
  });
  const rows = q(`SELECT GROUP_CONCAT(CONCAT(plan_kind,':',trade_type) ORDER BY id) FROM plan_trades WHERE account_email='${ADMIN}' AND symbol IN ('TSTX','TSTG')`);
  check('الحفظ بيبني 5 صفوف (شراء/بيع/مقفولة)', rows === 'DCA:buy,DCA:sell,DCA:closed,Grid:buy,Grid:closed', rows);
  await p.evaluate(() => renderAdminHub()); await p.waitForTimeout(1200);
  await p.click('#goTradesBtn'); await p.waitForTimeout(2000);
  await p.fill('#trSym', 'TSTX'); await p.click('#trGo'); await p.waitForTimeout(1800);
  const k = (await p.textContent('.g-kpis')).replace(/\s+/g, '');
  check('إجماليات TSTX: شراء 1 / بيع 1 / ربح 50', k.includes('عملياتشراء1') && k.includes('عملياتبيع1') && k.includes('الربحالمحقق50'), k);
  q(`DELETE FROM plan_trades WHERE account_email='${ADMIN}'`);
  await p.click('#trRebuild'); await p.waitForTimeout(400); await p.click('.g-sheet-btn.primary'); await p.waitForTimeout(2500);
  check('إعادة البناء من الخطط', +q(`SELECT COUNT(*) FROM plan_trades WHERE account_email='${ADMIN}' AND symbol IN ('TSTX','TSTG')`) === 5);
  const anon = await page(b);
  check('غير المسجّل ممنوع من التقرير (403)', await anon.evaluate(() => fetch('/trades_report.php?action=report').then(r => r.status)) === 403);
  await b.close(); process.exit(summary());
})();
