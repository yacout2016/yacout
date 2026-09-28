// المساعد الذكي في الشات: اقتراحات + رد تلقائي + تحويل لموظف + يسكت بعد رد موظف + إدارة
const { check, summary, launch, page, loginAdmin, q } = require('../lib');
(async () => {
  const b = await launch();
  const v = await page(b, { width: 420, height: 860 });
  await v.click('#chatBubbleBtn, .chat-bubble, #chatBubble'); await v.waitForTimeout(800);
  if (await v.isVisible('#chatStartBtn')) await v.click('#chatStartBtn');
  await v.waitForTimeout(1800);
  check('اقتراحات الأسئلة ظاهرة في الشات', await v.locator('.chat-faq-chip').count() > 0);
  await v.fill('#chatTextInput', 'كم سعر الباقات؟'); await v.click('#chatSendBtn'); await v.waitForTimeout(2200);
  check('المساعد رد على سؤال الأسعار', await v.locator('.chat-msg.admin.bot').count() === 1);
  await v.fill('#chatTextInput', 'عايز اكلم موظف'); await v.click('#chatSendBtn'); await v.waitForTimeout(2200);
  check('«موظف» ← تحويل لفريق الدعم', (await v.locator('.chat-msg.admin.bot').last().textContent()).includes('حوّلت محادثتك'));
  await v.fill('#chatTextInput', 'رسالة عادية xyz'); await v.click('#chatSendBtn'); await v.waitForTimeout(1800);
  check('رسالة بدون تطابق ← لا رد تلقائي', await v.locator('.chat-msg.admin.bot').count() === 2);
  const a = await page(b); await loginAdmin(a);
  const vid = q("SELECT visitor_id FROM chat_messages WHERE sender='visitor' ORDER BY id DESC LIMIT 1");
  await a.evaluate(async id => apiPost('/chat_admin_reply.php', { visitorId: id, message: 'معك فريق الدعم' }), vid);
  await v.fill('#chatTextInput', 'كم سعر الباقة'); await v.click('#chatSendBtn'); await v.waitForTimeout(2000);
  check('بعد رد موظف ← المساعد يسكت', await v.locator('.chat-msg.admin.bot').count() === 2);
  await a.evaluate(() => renderFaqAdminPage()); await a.waitForTimeout(1500);
  await a.fill('#faqTestIn', 'ازاي ادفع الاشتراك'); await a.click('#faqTestBtn'); await a.waitForTimeout(800);
  check('تجربة المطابقة من لوحة التحكم', (await a.textContent('#faqTestOut')).includes('كيف أشترك'));
  const anon = await page(b);
  check('إدارة الأسئلة ممنوعة لغير الأدمن (403)', await anon.evaluate(() => fetch('/chat_faq_api.php?action=list').then(r => r.status)) === 403);
  await b.close(); process.exit(summary());
})();
