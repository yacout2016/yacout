// شاشة بطيئة (الموظفين / HR) ثم الرئيسية فورًا ← الشاشة القديمة ممنوع ترسم فوق الجديدة
const { check, summary, launch, page, loginAdmin } = require('../lib');
(async () => {
  const b = await launch(); const p = await page(b);
  await p.route('**/staff_list.php*', async r => { await new Promise(res => setTimeout(res, 1500)); r.continue(); });
  await p.route('**/hr_api.php*', async r => { await new Promise(res => setTimeout(res, 1500)); r.continue(); });
  await loginAdmin(p);
  for (const fn of ['renderStaffManagementPage', 'renderHrPage']) {
    await p.evaluate(fn => { window[fn](); setTimeout(() => renderHome(), 200); }, fn);
    await p.waitForTimeout(3000);
    check(`${fn} ← الرئيسية: الرئيسية فضلت ظاهرة`, await p.evaluate(() => document.body.dataset.gsScreen) === 'renderHome');
  }
  // الإصدار 89: شاشة HR كانت بتخطف أزرار القائمة الجانبية (data-tab) - أي زرار كان بيفتح HR
  await p.unrouteAll();
  const labels = await p.$$eval('.gs-side-item', x => x.map(e => e.textContent.trim()).filter(t => !/HR/.test(t)));
  let stuck = [];
  for (const l of labels) {
    await p.evaluate(() => renderHrPage()); await p.waitForTimeout(900);
    await p.locator('.gs-side-item', { hasText: l }).first().click(); await p.waitForTimeout(1300);
    if (await p.locator('#hrBody').count()) stuck.push(l);
  }
  check(`بعد HR: كل عناصر القائمة الجانبية (${labels.length}) بتفتح شاشتها`, !stuck.length, stuck.join(', '));
  await b.close(); process.exit(summary());
})();
