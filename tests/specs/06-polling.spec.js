// الاستعلام المتكيّف: بيبطّأ لما المستخدم يسيب الشاشة وبيرجع فورًا مع أول تفاعل
const { check, summary, launch, page } = require('../lib');
(async () => {
  const b = await launch(); const p = await page(b);
  const r = await p.evaluate(async () => {
    let n = 0; const id = setInterval(() => n++, 200); const w = ms => new Promise(r => setTimeout(r, ms));
    await w(1100); const active = n;
    __pollSetIdle(400000); n = 0; await w(1700); const idle = n;
    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true })); await w(30); const resumed = n;
    clearInterval(id); const c = n; await w(500);
    return { active, idle, resumed, cleared: n === c };
  });
  check('نشط: بالسرعة العادية', r.active >= 4, JSON.stringify(r));
  check('خامل: أبطأ بكتير', r.idle <= 1);
  check('أول تفاعل: تحديث فوري', r.resumed > r.idle);
  check('clearInterval شغال', r.cleared);
  await b.close(); process.exit(summary());
})();
