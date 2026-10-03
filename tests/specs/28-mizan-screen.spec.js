// الإصدار 116: «ميزان محفظتك AI» شاشة في القائمة الجانبية قبل «بصيرة»
//   + العنصر الجديد بياخد مكانه الطبيعي حتى لو الأدمن كان رتّب القائمة من الاستوديو قبل كده
//   + إعداد الإخفاء (hide_mizan_screen): بيختفي عن العميل من القائمة ومن المحفظة والتقارير ومن حسابي
const { check, summary, launch, page, loginAdmin, q, BASE } = require('../lib');
const CUST = { email: 'paytest@example.com', pass: process.env.GT_CUSTOMER_PASS || 'Test12345x' };
(async () => {
  q("DELETE FROM login_attempts");
  const oldO = q("SELECT data_value FROM ui_customizations WHERE ui_key='overrides'");
  const b = await launch(); const a = await page(b, { width: 1366, height: 900 }); await loginAdmin(a);
  await a.evaluate(() => renderHome()); await a.waitForTimeout(1500);
  const vis = (p) => p.evaluate(() => Array.from(document.querySelectorAll('.gs-sidebar > .gs-side-item:not(.gs-side-cta)')).filter(x => x.offsetParent !== null)
    .map(x => ({ k: x.getAttribute('data-gs-key'), top: Math.round(x.getBoundingClientRect().top), t: x.textContent.trim() })).sort((x, y) => x.top - y.top));
  let v = await vis(a);
  const ks = v.map(x => x.k);
  check('القائمة: «ميزان محفظتك AI» موجودة', v.some(x => x.k === 'mizan' && /ميزان محفظتك AI/.test(x.t)), ks.join(','));
  check('القائمة: ميزان قبل بصيرة على طول', ks.indexOf('mizan') >= 0 && ks.indexOf('mizan') + 1 === ks.indexOf('basira'), ks.join(','));
  await a.click('.gs-sidebar [data-gs-key="mizan"]'); await a.waitForTimeout(1500);
  const op = await a.evaluate(() => ({ t: (document.querySelector('.mz-screen .bs-brand h1') || {}).textContent || '', on: (document.querySelector('.gs-sidebar [data-gs-key="mizan"]') || {}).className || '', top: (document.querySelector('.gs-page-title') || {}).textContent || '' }));
  check('الضغط عليها بيفتح «ميزان محفظتك GRIFFINE AI» والعنصر بيتنوّر', /ميزان محفظتك/.test(op.t) && /active/.test(op.on), JSON.stringify(op));

  // ترتيب قديم من الاستوديو (من غير ميزان) ← ميزان بتدخل مكانها الطبيعي قبل بصيرة (مش آخر القائمة)
  const keys = await a.evaluate(() => Array.from(document.querySelector('.gs-sidebar').children).map(c => c.getAttribute('data-gs-key')).filter(k => k && k !== 'mizan'));
  const order = keys.slice(); const sc = order.splice(order.indexOf('screener'), 1)[0]; order.splice(order.indexOf('home') + 1, 0, sc);
  const ovr = { v: 1, keysV: 1, texts: [], elTexts: [], styles: [], orders: [{ screen: '*', psel: '.gs-sidebar', seq: order.map((_, i) => i + 1), keys: order, mode: 'col', label: 'ترتيب القائمة' }] };
  const sv = await a.evaluate(async (o) => apiPost('/ui_custom_save.php', { key: 'overrides', value: JSON.stringify(o) }), ovr);
  check('حفظ ترتيب قديم للقائمة (الكشاف تحت الرئيسية) من غير العنصر الجديد', sv && sv.success, JSON.stringify(sv).slice(0, 100));
  await a.reload(); await a.waitForTimeout(3000);
  v = await vis(a); const k2 = v.map(x => x.k);
  check('بعد الترتيب القديم: الكشاف تحت الرئيسية + ميزان قبل بصيرة (مش في آخر القائمة)', k2[1] === 'screener' && k2.indexOf('mizan') + 1 === k2.indexOf('basira') && k2.indexOf('mizan') < k2.indexOf('account'), k2.join(','));

  // العميل: نفس الترتيب
  const c = await page(b, { width: 1366, height: 900 });
  await c.evaluate(async ([e, pw]) => { window.alert = () => {}; await apiPost('/login.php', { email: e, password: pw }); invalidateSessionCache(); await getSession(); await refreshTopNav(); }, [CUST.email, CUST.pass]);
  await c.evaluate(() => renderHome()); await c.waitForTimeout(2500);
  const k3 = (await vis(c)).map(x => x.k);
  check('عند العميل: ميزان قبل بصيرة بنفس الترتيب', k3.indexOf('mizan') >= 0 && k3.indexOf('mizan') + 1 === k3.indexOf('basira') && k3[1] === 'screener', k3.join(','));

  // الإخفاء من الإعدادات
  const setHide = (val) => a.evaluate(async (val) => saveAdminSetting('hide_mizan_screen', val), val);
  const hs = await setHide(true);
  check('إعداد «إخفاء ميزان محفظتك AI» بيتحفظ', hs && hs.success !== false, JSON.stringify(hs).slice(0, 120));
  check('الإعداد ظاهر في شاشة إعدادات الإخفاء', await a.evaluate(async () => { await renderAdminSettingsPage(); await new Promise(r => setTimeout(r, 1200)); return /إخفاء «ميزان محفظتك AI» عن العملاء/.test(document.getElementById('app').textContent); }));
  await c.reload(); await c.waitForTimeout(1200);
  await c.evaluate(async ([e, pw]) => { window.alert = () => {}; invalidateSessionCache(); await getSession(); await refreshTopNav(); }, [CUST.email, CUST.pass]);
  await c.evaluate(() => renderHome()); await c.waitForTimeout(2500);
  const hid = await c.evaluate(async () => { const side = !!document.querySelector('.gs-sidebar [data-gs-key="mizan"]'); await renderPortfolio(); await new Promise(r => setTimeout(r, 1500)); return { side, btn: !!document.getElementById('goDiversificationBtn') }; });
  check('بعد الإخفاء: العميل مش شايفها في القائمة ولا زرارها في المحفظة والتقارير', !hid.side && !hid.btn, JSON.stringify(hid));
  await a.evaluate(() => renderHome()); await a.waitForTimeout(1500);
  check('الأدمن بيفضل شايفها', await a.evaluate(() => !!document.querySelector('.gs-sidebar [data-gs-key="mizan"]')));
  await setHide(false);

  check('بدون أخطاء JavaScript', !a.__errors.length && !c.__errors.length, a.__errors[0] || c.__errors[0]);
  if (oldO === '') q("DELETE FROM ui_customizations WHERE ui_key='overrides'"); else q(`REPLACE INTO ui_customizations (ui_key, data_value) VALUES ('overrides', '${oldO.replace(/\\/g, '\\\\').replace(/'/g, "''")}')`);
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
