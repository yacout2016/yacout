/* =====================================================================
   GRIFFINE — faq.js (الإصدار 89) — إدارة المساعد الذكي في الشات
   الأدمن بيضيف (سؤال + كلمات مفتاحية + إجابة) ← المساعد بيرد تلقائي على العميل ويحوّله لموظف لو طلب
   الصلاحية: manage_content أو manage_admin_settings - والسيرفر بيتحقق (chat_faq_api.php)
   ===================================================================== */
const FAQ = {
  get: (q) => apiGet('/chat_faq_api.php?' + q).catch(() => ({ success:false, message:'تعذّر الاتصال بالسيرفر' })),
  post: (d) => apiPost('/chat_faq_api.php', d).catch(() => ({ success:false, message:'تعذّر الاتصال بالسيرفر' })),
};

async function renderFaqAdminPage(){
  const __tok = screenToken();
  pushNav(() => renderFaqAdminPage());
  const email = await getSession();
  if (!email) return renderLogin();
  if (!window.__isAdmin) return renderHome();
  if (!hasPermission('manage_content') && !hasPermission('manage_admin_settings')) return renderAdminHub();
  window.__lastPageKey = 'chat_faq';
  const d = await FAQ.get('action=list');
  if (screenStale(__tok)) return;
  const items = d.items || [];
  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>${pageTitle('chat_faq', '💡 المساعد الذكي في الشات')}</div>
      <button class="secondary small" id="faqBackBtn">🛡️ رجوع للوحة التحكم</button></div>
    ${d.success ? '' : `<div class="card"><p class="u-danger">${escapeHtml(d.message || 'خطأ')}</p></div>`}
    <div class="card">
      <div class="u-row"><div><b>المساعد ${d.enabled ? 'يعمل ✅' : 'متوقف ⛔'}</b>
        <p class="u-note u-m0">يرد فورًا على أي سؤال من الأسئلة الشائعة في كل مرة. لو السؤال غير معروف يوجّه العميل للأسئلة أو لكتابة «موظف»، و«موظف» يحوّله لفريق الدعم ويرسل لك إيميل.</p></div>
        <button class="small ${d.enabled ? 'danger' : ''} u-wa" id="faqToggle">${d.enabled ? 'إيقاف المساعد' : 'تشغيل المساعد'}</button></div>
    </div>
    <div class="card">
      <h3>تجربة</h3>
      <div class="u-row"><input id="faqTestIn" placeholder="اكتب سؤالًا كما يكتبه العميل..."><button class="small secondary u-wa" id="faqTestBtn">جرّب</button></div>
      <div id="faqTestOut" class="u-note u-mt8"></div>
    </div>
    <div class="card">
      <div class="u-row"><h3 class="u-m0">الأسئلة (${items.length})</h3><button class="small u-wa" id="faqAddBtn">➕ سؤال جديد</button></div>
      <div class="table-scroll u-mt10"><table class="g-table"><thead><tr><th>#</th><th>السؤال</th><th>الكلمات المفتاحية</th><th>الحالة</th><th>مرات الرد</th><th></th></tr></thead><tbody>
        ${items.map(it => `<tr><td>${it.sort_order}</td><td>${escapeHtml(it.question)}</td><td class="u-fs12 u-muted">${escapeHtml(it.keywords || '')}</td>
          <td>${it.active ? 'ظاهر' : 'مخفي'}</td><td class="g-num">${it.hits}</td>
          <td><button class="small secondary u-wa" data-edit="${it.id}">✏️ تعديل</button> <button class="small danger u-wa" data-del="${it.id}">🗑️</button></td></tr>`).join('') || '<tr><td colspan="6" class="u-muted">لا توجد أسئلة بعد</td></tr>'}
      </tbody></table></div>
    </div>
    <div id="faqForm"></div>
  </div>`;
  const reload = () => { window.__navSilent = true; try { renderFaqAdminPage(); } finally { window.__navSilent = false; } };
  document.getElementById('faqBackBtn').onclick = () => goAdminHome();
  document.getElementById('faqToggle').onclick = async () => { const r = await FAQ.post({ action:'toggle', enabled: d.enabled ? '0' : '1' }); if (r.success) reload(); else GShell.toast(r.message || 'خطأ', 'err'); };
  document.getElementById('faqTestBtn').onclick = async () => {
    const out = document.getElementById('faqTestOut');
    const r = await FAQ.post({ action:'test', text: document.getElementById('faqTestIn').value });
    out.innerHTML = !r.success ? escapeHtml(r.message || 'خطأ') : r.handoff ? 'سيتم تحويل العميل لفريق الدعم.' : r.match ? `سيرد بإجابة: <b>${escapeHtml(r.match.question)}</b>` : 'لا يوجد تطابق - الرسالة ستنتظر رد موظف.';
  };
  const form = (it) => {
    it = it || { id:0, question:'', keywords:'', answer:'', active:1, sort_order: items.length + 1 };
    const box = document.getElementById('faqForm');
    box.innerHTML = `<div class="card"><h3>${it.id ? 'تعديل سؤال' : 'سؤال جديد'}</h3>
      <label>السؤال (يظهر للعميل كاقتراح)<input id="fqQ" maxlength="300" value="${escapeHtml(it.question)}"></label>
      <label>كلمات مفتاحية (مفصولة بفاصلة) - لو رسالة العميل فيها أي كلمة منها يرد المساعد<input id="fqK" maxlength="500" value="${escapeHtml(it.keywords || '')}" placeholder="سعر, باقة, اشتراك"></label>
      <label>الإجابة<textarea id="fqA" rows="5" maxlength="4000">${escapeHtml(it.answer)}</textarea></label>
      <div class="u-row"><label class="u-check"><input type="checkbox" id="fqAct" ${it.active ? 'checked' : ''}> ظاهر ويعمل</label>
        <label class="u-check">الترتيب <input type="number" id="fqSo" value="${it.sort_order}" style="width:80px"></label></div>
      <div class="radio-row u-mt10"><button class="small u-wa" id="fqSave">💾 حفظ</button><button class="small secondary u-wa" id="fqCancel">إلغاء</button></div></div>`;
    box.scrollIntoView({ behavior:'smooth' });
    document.getElementById('fqCancel').onclick = () => { box.innerHTML = ''; };
    document.getElementById('fqSave').onclick = async () => {
      const r = await FAQ.post({ action:'save', id: it.id, question: fqQ.value, keywords: fqK.value, answer: fqA.value, active: fqAct.checked ? '1' : '0', sort_order: fqSo.value });
      if (r.success) { GShell.toast('تم الحفظ', 'ok'); reload(); } else GShell.toast(r.message || 'خطأ', 'err');
    };
  };
  document.getElementById('faqAddBtn').onclick = () => form();
  app.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => form(items.find(x => x.id === +b.dataset.edit)));
  app.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!await gConfirm('حذف هذا السؤال؟ (ينتقل إلى سلة المحذوفات ويمكن استرجاعه)')) return;
    const r = await FAQ.post({ action:'delete', id: b.dataset.del }); if (r.success) reload(); else GShell.toast(r.message || 'خطأ', 'err');
  });
}
