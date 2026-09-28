// كل شاشات الإدارة والعميل: صفر مخالفات CSP وصفر أخطاء JavaScript
const { check, summary, launch, page, loginAdmin } = require('../lib');
(async () => {
  const b = await launch(); const p = await page(b); const viol = [];
  p.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) viol.push(m.text().slice(0, 160)); });
  const csp = (await (await p.request.get(p.url())).headers())['content-security-policy'] || '';
  check('هيدر CSP موجود', /script-src 'self'/.test(csp));
  await loginAdmin(p);
  const screens = ['renderAdminHub()', 'renderAdminSubscribers()', 'renderStaffManagementPage()', 'renderHrPage()', 'renderChatAdminPage()', 'renderAdminSettingsPage()',
    'GShell.renderEmailCenter()', 'renderScreener()', 'renderWatchlistPage()', 'renderAlertsPage()', 'renderPlansList()', 'renderGridPlansList()', 'renderPortfolio()',
    'renderTradesReportPage()', 'renderFaqAdminPage()', 'renderTrashPage()', 'renderTrashPage(true)', 'renderAdminReportsPage()', 'renderBlacklist()', 'renderHome()'];
  for (const sc of screens) { try { await p.evaluate(sc); } catch(e){ p.__errors.push(sc + ': ' + e.message); } await p.waitForTimeout(1200); }
  check(`${screens.length} شاشة بدون مخالفات CSP`, !viol.length, viol[0]);
  check('بدون أخطاء JavaScript', !p.__errors.length, p.__errors[0]);
  await b.close(); process.exit(summary());
})();
