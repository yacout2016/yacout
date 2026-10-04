// الإصدار 157: «🔎 الظهور في جوجل» — العنوان والتعريف وكود التحقق من لوحة التحكم + بيانات منظمة (JSON-LD) + تعريف للزاحف (noscript)
const { check, summary, launch, page, loginAdmin, q, BASE } = require('../lib');
(async () => {
  q("DELETE FROM login_attempts"); try { q("DELETE FROM rate_limits"); } catch(e){}
  const get = async () => (await fetch(BASE + '/index.php')).text();
  let h = await get();
  check('العنوان الافتراضي فيه «جريفين» و GRIFFINE', /<title>GRIFFINE جريفين/.test(h));
  check('تعريف الموقع (description) بالعربي', /<meta name="description" content="جريفين GRIFFINE منصة عربية/.test(h));
  check('robots: index, follow', /<meta name="robots" content="index, follow/.test(h));
  const ld = (h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
  let j = null; try { j = JSON.parse(ld); } catch(e){}
  check('بيانات منظمة JSON-LD صحيحة (Organization + WebSite + الاسم العربي + الشعار)', j && j['@graph'].some(x => x['@type'] === 'Organization' && x.alternateName.includes('جريفين') && /icon-512/.test(x.logo)) && j['@graph'].some(x => x['@type'] === 'WebSite'));
  check('canonical ثابت على https://www.griffine.app/', /<link rel="canonical" href="https:\/\/www\.griffine\.app\/">/.test(h));
  check('تعريف للزاحف جوه <body> (noscript)', /<body[^>]*>\s*<noscript>[\s\S]*جريفين/.test(h));
  const b = await launch(); const a = await page(b); await loginAdmin(a);
  await a.evaluate(() => renderAdminHub()); await a.waitForSelector('#goSeoBtn', { timeout: 20000 }).catch(() => {});
  check('لوحة التحكم ← «🔎 الظهور في جوجل»', !!(await a.$('#goSeoBtn')));
  await a.click('#goSeoBtn'); await a.waitForSelector('#seoSave', { timeout: 20000 }).catch(() => {});
  check('معاينة شكل النتيجة + الخطوات (Search Console / Sitemap / Request indexing)', await a.evaluate(() => /جريفين/.test(document.getElementById('seoPvT').textContent) && /Search Console/.test(document.querySelector('.seo-steps').textContent) && /sitemap\.xml/.test(document.querySelector('.seo-steps').textContent)));
  await a.fill('#seoG', 'غلط'); await a.click('#seoSave'); await a.waitForTimeout(1000);
  check('كود تحقق غلط بيترفض', !/google-site-verification/.test(await get()));
  await a.fill('#seoT', 'جريفين GRIFFINE — عنوان تجربة 157'); await a.fill('#seoD', 'تعريف تجربة للموقع في نتايج البحث 157');
  await a.fill('#seoG', '<meta name="google-site-verification" content="AbCdEf_1234567890-xyz" />'); await a.fill('#seoB', 'B1C2D3E4F5A6B7C8D9E0');
  await a.click('#seoSave'); await a.waitForTimeout(1500);
  h = await get();
  check('الـ meta tag كله اتقبل ← كود جوجل في الصفحة', /<meta name="google-site-verification" content="AbCdEf_1234567890-xyz">/.test(h));
  check('كود Bing في الصفحة', /<meta name="msvalidate.01" content="B1C2D3E4F5A6B7C8D9E0">/.test(h));
  check('العنوان والتعريف الجديد في الصفحة (وفي واتساب / فيسبوك)', /<title>جريفين GRIFFINE — عنوان تجربة 157<\/title>/.test(h) && /og:description" content="تعريف تجربة للموقع/.test(h));
  check('اتحفظ في قاعدة البيانات', /عنوان تجربة 157/.test(q("SELECT config_value FROM site_config WHERE config_key='seo_cfg'")));
  await a.evaluate(() => { for (const id of ['seoT', 'seoD', 'seoG', 'seoB']) document.getElementById(id).value = ''; }); await a.click('#seoSave'); await a.waitForTimeout(1500);
  check('فاضي ← رجع للافتراضي', /<title>GRIFFINE جريفين/.test(await get()));
  const c = await page(b); const s = await c.evaluate(async () => (await fetch('seo_api.php', { credentials: 'same-origin' })).status);
  check('الزائر ممنوع (403)', s === 403, s);
  check('بدون أخطاء JavaScript', !a.__errors.length, a.__errors[0]);
  q("DELETE FROM site_config WHERE config_key='seo_cfg'");
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
