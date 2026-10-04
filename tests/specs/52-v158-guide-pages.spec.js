// الإصدار 158: «📚 دليل المستثمر» — صفحات ثابتة بالعربي لكل كلمة بحث (تعزيز المتوسط / الشبكة / المؤشرات / الاستراتيجيات …)
//   جوجل بيقراها من غير JavaScript + مربوطة في sitemap وفوتر اللاندينج + زرار «ابدأ مجانًا» بيفتح التسجيل
const { check, summary, launch, page, BASE } = require('../lib');
const fs = require('fs'), path = require('path');
(async () => {
  const root = path.join(__dirname, '..', '..');
  const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const urls = [...sm.matchAll(/<loc>https:\/\/www\.griffine\.app\/([^<]*)<\/loc>/g)].map(m => m[1]).filter(Boolean);
  check('sitemap فيه الدليل + 9 صفحات شرح', urls.length >= 10 && urls.includes('guide.html') && urls.includes('dca-strategy.html'), urls.join(', '));
  let bad = [];
  for (const u of urls) {
    const r = await fetch(BASE + '/' + u); const h = await r.text();
    const ld = (h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1]; let ok = false; try { JSON.parse(ld); ok = true; } catch(e){}
    if (r.status !== 200 || !/<title>[^<]*جريفين/.test(h) || !/<meta name="description" content="[^"]{80,}"/.test(h) || !h.includes(`<link rel="canonical" href="https://www.griffine.app/${u}">`) || !/<h1>/.test(h) || !ok || /<script(?! type="application\/ld\+json")/.test(h)) bad.push(u);
  }
  check('كل صفحة: عنوان فيه «جريفين» + تعريف + canonical + H1 + بيانات منظمة صحيحة + من غير JavaScript', !bad.length, bad.join(', '));
  const dca = await (await fetch(BASE + '/dca-strategy.html')).text();
  check('صفحة تعزيز المتوسط فيها الكلمات المهمة + أسئلة شائعة (FAQPage)', /تعزيز المتوسط/.test(dca) && /متوسط التكلفة/.test(dca) && /"FAQPage"/.test(dca) && /<details>/.test(dca));
  check('مفيش أسماء منافسين ولا .store', !urls.some(u => /griffine\.store/.test(fs.readFileSync(path.join(root, u), 'utf8'))));
  const rb = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  check('robots.txt بيسمح بصفحات الدليل', /Allow: \/\*\.html\$/.test(rb) && /Allow: \/guide\.css/.test(rb));
  const b = await launch();
  const g = await page(b, { width: 390, height: 844 }, { lite: true }); g.__errors = [];
  await g.goto(BASE + '/technical-indicators.html'); await g.waitForTimeout(500);
  check('صفحة الدليل على الموبايل من غير سكرول بالعرض', await g.evaluate(() => document.documentElement.scrollWidth <= 392));
  await g.click('.g-top .g-btn'); await g.waitForTimeout(3500);
  check('«ابدأ مجانًا» ← شاشة التسجيل على طول', await g.evaluate(() => /index\.php\?page=register/.test(location.href) && !!document.querySelector('#app') && /إنشاء|تسجيل/.test(document.getElementById('app').textContent)));
  const l = await page(b, null, { lite: true }); await l.waitForTimeout(2500);
  check('فوتر اللاندينج فيه روابط «📚 دليل المستثمر»', await l.evaluate(() => !!document.querySelector('.lp-guide a[href="dca-strategy.html"]') && !!document.querySelector('.lp-guide a[href="guide.html"]')));
  const ix = await (await fetch(BASE + '/index.php')).text();
  check('الصفحة الرئيسية (للزاحف) فيها روابط الدليل', /<noscript>[\s\S]*href="grid-trading\.html"/.test(ix));
  check('بدون أخطاء JavaScript', !l.__errors.length && !g.__errors.length, l.__errors[0] || g.__errors[0]);
  await b.close(); process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
