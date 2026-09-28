// المساعد الذكي في الشات: اقتراحات + رد تلقائي في كل مرة + تحويل لموظف + توجيه للسؤال غير المعروف + إدارة
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
(async () => {
  const b = await launch();
  // الإصدار 94: 20 سؤال طويل ← القائمة على الموبايل عمودية وبتتمرر لفوق وتحت بس
  for (let i = 1; i <= 16; i++) q(`INSERT INTO chat_faq (question, keywords, answer, sort_order) VALUES ('سؤال تجريبي رقم ${i} عن طريقة استخدام الخطط والتقارير والتنبيهات في الموقع بشكل مفصل', 'zzqq${i}', 'x', ${100 + i})`);
  const v = await page(b, { width: 360, height: 740 });
  await v.click('#chatBubbleBtn, .chat-bubble, #chatBubble'); await v.waitForTimeout(800);
  if (await v.isVisible('#chatStartBtn')) await v.click('#chatStartBtn');
  await v.waitForTimeout(1800);
  // الإصدار 92: الأسئلة قائمة منسدلة من زرار ❓ (مقفولة افتراضيًا - مساحة الشات للرسائل)
  const bodyH0 = await v.evaluate(() => document.getElementById('chatBody').clientHeight);
  check('الأسئلة مقفولة افتراضيًا وزرار ❓ ظاهر', !(await v.isVisible('#chatFaq')) && await v.isVisible('#chatFaqBtn'));
  await v.click('#chatFaqBtn'); await v.waitForTimeout(200);
  check('❓ يفتح قائمة الأسئلة', await v.locator('.chat-faq-chip:visible').count() >= 3);
  const lay = await v.evaluate(() => { const l = document.querySelector('.chat-faq-list'); const c = [...l.querySelectorAll('.chat-faq-chip')];
    return { n: c.length, cols: new Set(c.map(x => Math.round(x.getBoundingClientRect().left))).size, v: l.scrollHeight > l.clientHeight, h: l.scrollWidth > l.clientWidth + 1 }; });
  check('الموبايل: كل الأسئلة (20+) في عمود واحد بتمرير لفوق وتحت ومفيش تمرير بالعرض', lay.n >= 20 && lay.cols === 1 && lay.v && !lay.h, JSON.stringify(lay));
  q("DELETE FROM chat_faq WHERE keywords LIKE 'zzqq%'");
  check('القائمة مش بتصغّر مساحة الرسائل', await v.evaluate(() => document.getElementById('chatBody').clientHeight) === bodyH0);
  await v.click('.chat-faq-x'); await v.waitForTimeout(200);
  check('✕ يقفل القائمة', !(await v.isVisible('#chatFaq')));
  await v.fill('#chatTextInput', 'كم سعر الباقات؟'); await v.click('#chatSendBtn'); await v.waitForTimeout(2200);
  check('المساعد رد على سؤال الأسعار', await v.locator('.chat-msg.admin.bot').count() === 1);
  await v.fill('#chatTextInput', 'عايز اكلم موظف'); await v.click('#chatSendBtn'); await v.waitForTimeout(2200);
  check('«موظف» ← تحويل لفريق الدعم', (await v.locator('.chat-msg.admin.bot').last().textContent()).includes('حوّلت محادثتك'));
  // الإصدار 91: طلب موظف ← المحادثة غير مقروءة عند الإدارة + إيميل تنبيه (قبل كده رد المساعد كان بيخفيها)
  const adm = await page(b); await loginAdmin(adm);
  const un = await adm.evaluate(() => apiGet('/chat_unread_count.php'));
  check('طلب «موظف» ← إشعار عند شات الإدارة (غير مقروءة)', un && un.unreadCount >= 1, JSON.stringify(un));
  check('طلب «موظف» ← إيميل تنبيه للإدارة', +q("SELECT COUNT(*) FROM email_log WHERE mail_type='chat_handoff' AND created_at > NOW() - INTERVAL 2 MINUTE") >= 1);
  await v.fill('#chatTextInput', 'رسالة عادية xyz'); await v.click('#chatSendBtn'); await v.waitForTimeout(1800);
  check('بعد التحويل لموظف: رسالة غير معروفة ← المساعد يسيبها للموظف', await v.locator('.chat-msg.admin.bot').count() === 2);
  const a = await page(b); await loginAdmin(a);
  const vid = q("SELECT visitor_id FROM chat_messages WHERE sender='visitor' ORDER BY id DESC LIMIT 1");
  await a.evaluate(async id => apiPost('/chat_admin_reply.php', { visitorId: id, message: 'معك فريق الدعم' }), vid);
  await v.fill('#chatTextInput', 'كم سعر الباقة'); await v.click('#chatSendBtn'); await v.waitForTimeout(2000);
  check('بعد رد موظف ← المساعد لسه بيرد على الأسئلة المعروفة (الإصدار 95)', await v.locator('.chat-msg.admin.bot').count() === 3);
  await v.fill('#chatTextInput', 'كم سعر الباقة'); await v.click('#chatSendBtn'); await v.waitForTimeout(2000);
  check('نفس السؤال مرة تانية ← بيترد عليه تاني', await v.locator('.chat-msg.admin.bot').count() === 4);
  // زائر جديد: سؤال غير معروف ← توجيه (مرة واحدة بس)
  const g = await page(b, { width: 412, height: 860 });
  await g.click('#chatBubbleBtn, .chat-bubble, #chatBubble'); await g.waitForTimeout(800);
  if (await g.isVisible('#chatStartBtn')) await g.click('#chatStartBtn');
  await g.waitForTimeout(1500);
  await g.fill('#chatTextInput', 'qwe سؤال غريب جدا'); await g.click('#chatSendBtn'); await g.waitForTimeout(2000);
  const fb = await g.locator('.chat-msg.admin.bot').count(); const fbTxt = fb ? await g.locator('.chat-msg.admin.bot').last().textContent() : '';
  await g.fill('#chatTextInput', 'asd سؤال غريب تاني'); await g.click('#chatSendBtn'); await g.waitForTimeout(2000);
  check('سؤال غير معروف ← توجيه للأسئلة أو «موظف» (مرة واحدة)', fb === 1 && fbTxt.includes('لم أجد إجابة') && await g.locator('.chat-msg.admin.bot').count() === 1);
  await a.evaluate(() => renderFaqAdminPage()); await a.waitForTimeout(1500);
  await a.fill('#faqTestIn', 'ازاي ادفع الاشتراك'); await a.click('#faqTestBtn'); await a.waitForTimeout(800);
  check('تجربة المطابقة من لوحة التحكم', (await a.textContent('#faqTestOut')).includes('كيف أشترك'));
  const anon = await page(b);
  check('إدارة الأسئلة ممنوعة لغير الأدمن (403)', await anon.evaluate(() => fetch('/chat_faq_api.php?action=list').then(r => r.status)) === 403);
  await b.close(); process.exit(summary());
})();
