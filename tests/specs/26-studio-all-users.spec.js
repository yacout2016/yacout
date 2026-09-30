// الإصدار 114: أي تنسيق من استوديو التصميم (حساب الأدمن) بيتعمم على كل المستخدمين (قديم وجديد)
//   المشكلة: القائمة الجانبية عند الأدمن فيها عناصر أكتر ← التعديل المحفوظ بالترتيب (nth-child) كان بيروح لعنصر تاني عند العميل
//   الحل: أسماء ثابتة (data-gs-key) + تحويل تلقائي للتعديلات القديمة من متصفح الأدمن
const { check, summary, launch, page, loginAdmin, q, BASE } = require('../lib');
const CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
(async () => {
  q("DELETE FROM login_attempts");
  const old = q("SELECT data_value FROM ui_customizations WHERE ui_key='overrides'");
  const b = await launch(); const a = await page(b, { width: 1366, height: 900 }); await loginAdmin(a);
  await a.evaluate(() => renderHome()); await a.waitForTimeout(1500);

  // تعديلات قديمة بالترتيب زي ما كانت بتتحفظ قبل الإصدار 114 (القائمة من غير عنصر بصيرة الجديد)
  const legacy = await a.evaluate(() => {
    const sb = document.querySelector('.gs-sidebar'), kids = Array.from(sb.children).filter(c => !c.hasAttribute('data-gs-since'));
    const idx = (key) => kids.findIndex(c => c.getAttribute('data-gs-key') === key) + 1;
    const trash = idx('renderTrashPage'), home = idx('home'), scr = idx('screener'), dca = idx('plans-dca'), grid = idx('plans-grid');
    const seq = []; seq.push(1, home, scr, dca, grid); for (let k = 1; k <= kids.length; k++) if (!seq.includes(k)) seq.push(k);
    return { trashSel: `.gs-sidebar > button:nth-child(${trash}) > span:nth-child(2)`, seq, n: kids.length, trash };
  });
  const ovr = { v: 1, texts: [], elTexts: [], styles: [{ screen: '*', sel: legacy.trashSel, css: { color: '#E11D48' }, label: 'سلة المحذوفات' }],
    orders: [{ screen: '*', psel: '.gs-sidebar', seq: legacy.seq, mode: 'col', label: 'ترتيب القائمة' }] };
  const sv = await a.evaluate(async (o) => apiPost('/ui_custom_save.php', { key: 'overrides', value: JSON.stringify(o) }), ovr);
  check('حفظ تعديلات قديمة (بالترتيب) من حساب الأدمن', sv && sv.success, JSON.stringify(sv).slice(0, 120));

  // الأدمن يفتح الموقع ← التحويل التلقائي للأسماء الثابتة
  await a.reload(); await a.waitForTimeout(3500);
  const conv = (await fetch(BASE + '/ui_custom_get.php').then(r => r.json())).overrides || {};
  check('التحويل التلقائي: تنسيق «سلة المحذوفات» بقى بالاسم الثابت', conv.keysV === 1 && conv.styles[0].sel === '.gs-sidebar [data-gs-key="renderTrashPage"] > span:nth-child(2)', conv.styles[0] && conv.styles[0].sel);
  check('التحويل التلقائي: ترتيب القائمة بقى بالأسماء (كشاف الأسهم بعد الرئيسية ثم DCA ثم Grid)', Array.isArray(conv.orders[0].keys) && conv.orders[0].keys.slice(0, 6).join(',') === 'side-brand,home,screener,basira,plans-dca,plans-grid', JSON.stringify(conv.orders[0].keys));
  check('العنصر الجديد (بصيرة) أخد مكانه الطبيعي بعد كشاف الأسهم (مش تحت الحساب)', conv.orders[0].keys.indexOf('basira') < conv.orders[0].keys.indexOf('side-foot'));
  const adm = await a.evaluate(() => { const t = document.querySelector('.gs-sidebar [data-gs-key="renderTrashPage"] > span'); return getComputedStyle(t).color; });
  check('عند الأدمن: «سلة المحذوفات» باللون الأحمر', adm === 'rgb(225, 29, 72)', adm);

  // العميل (مشترك قديم) يشوف نفس التعديلات
  const c = await page(b, { width: 1366, height: 900 }); await c.goto(BASE + '/index.php'); await c.waitForTimeout(1000);
  await c.evaluate(async ([e, pw]) => { window.alert = () => {}; await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); }, [CUST.email, CUST.pass]);
  await c.evaluate(() => renderHome()); await c.waitForTimeout(2000);
  const cu = await c.evaluate(() => {
    const t = document.querySelector('.gs-sidebar [data-gs-key="renderTrashPage"] > span');
    const items = Array.from(document.querySelectorAll('.gs-sidebar > .gs-side-item')).filter(x => x.offsetParent !== null).sort((x, y) => (+getComputedStyle(x).order) - (+getComputedStyle(y).order) || 0);
    const vis = Array.from(document.querySelectorAll('.gs-sidebar > .gs-side-item')).map(x => ({ k: x.getAttribute('data-gs-key'), top: Math.round(x.getBoundingClientRect().top) })).sort((x, y) => x.top - y.top).map(x => x.k);
    return { color: t ? getComputedStyle(t).color : null, order: vis.filter(k => k !== 'basira').slice(0, 4), adminItems: !!document.querySelector('.gs-sidebar [data-gs-key="renderAdminHub"]') };
  });
  check('عند العميل: «سلة المحذوفات» باللون الأحمر (رغم إن قائمته أقصر من الأدمن)', cu.color === 'rgb(225, 29, 72)', JSON.stringify(cu));
  check('عند العميل: الترتيب (الرئيسية ← كشاف الأسهم ← DCA ← Grid)', cu.order.join(',') === 'home,screener,plans-dca,plans-grid' && !cu.adminItems, cu.order.join(','));
  // مستخدم جديد (زائر فاضي الكاش) نفس الشيء
  const n = await page(b, { width: 1366, height: 900 }); await n.goto(BASE + '/index.php'); await n.evaluate(() => { try { localStorage.clear(); } catch(e){} });
  await n.evaluate(async ([e, pw]) => { window.alert = () => {}; await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); }, [CUST.email, CUST.pass]);
  await n.reload(); await n.waitForTimeout(3000);
  const nu = await n.evaluate(() => { const t = document.querySelector('.gs-sidebar [data-gs-key="renderTrashPage"] > span'); return t ? getComputedStyle(t).color : null; });
  check('جهاز جديد (من غير كاش): نفس التعديلات', nu === 'rgb(225, 29, 72)', nu);

  // أي تعديل جديد من الاستوديو بيتحفظ بالاسم الثابت
  const np = await a.evaluate(() => ({ trash: GStudio.cssPath(document.querySelector('.gs-sidebar [data-gs-key="renderTrashPage"] > span')), tab: GStudio.cssPath(document.querySelector('.gs-sidebar [data-gs-key="screener"]')) }));
  check('تعديل جديد من الاستوديو ← محدد بالاسم الثابت', np.trash === '.gs-sidebar [data-gs-key="renderTrashPage"] > span:nth-child(2)' && np.tab === '.gs-sidebar [data-gs-key="screener"]', JSON.stringify(np));
  check('بدون أخطاء JavaScript', !a.__errors.length && !c.__errors.length && !n.__errors.length, a.__errors[0] || c.__errors[0] || n.__errors[0]);

  if (old === '') q("DELETE FROM ui_customizations WHERE ui_key='overrides'"); else q(`REPLACE INTO ui_customizations (ui_key, data_value) VALUES ('overrides', '${old.replace(/\\/g, '\\\\').replace(/'/g, "''")}')`);
  await b.close(); process.exit(summary());
})();
