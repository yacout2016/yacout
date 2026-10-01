/* =====================================================================
   GRIFFINE — ai_access.js (الإصدار 127) — التحكم في الذكاء الاصطناعي
   01. شاشة «🤖 الذكاء الاصطناعي» في لوحة التحكم: تفعيل / إيقاف المدفوع + حساب Claude + المفتاح + اختبار + شرح الدفع
   02. خانات قدام كل مشترك: بصيرة / ميزان المحفظة / ميزان GRIFFINE (تشغيل / إيقاف) + المدفوع + الحد اليومي
   الافتراضي: المدفوع مقفول ← كل حاجة شغالة مجانًا بالمحرك الداخلي لكل المشتركين.
   ===================================================================== */
async function gAiLoad(force){
  if (!force && window.__aiAll && Date.now() - window.__aiAll.at < 30000) return window.__aiAll;
  const r = await apiGet('/ai_access_api.php?action=admin_all').catch(() => null);
  window.__aiAll = r && r.success ? Object.assign(r, { at: Date.now() }) : { access: {}, pro: {}, canEdit: false, ready: false, paidActive: false, at: Date.now() };
  return window.__aiAll;
}
const AI_LIMITS = ['', '5', '10', '20', '50'];
// 02. خانات المشترك (الإيميل = مفتاح الحساب)
function gAiCellHtml(email){
  const A = window.__aiAll; if (!A || !email) return '';
  const e = String(email).toLowerCase(), p = A.access[e] || { basira: true, mizan: true, mizanai: true, paid: null, limit: null, used: 0 }, pro = !!A.pro[e];
  const dis = A.canEdit && A.ready ? '' : 'disabled';
  const cb = (f, label, tip) => `<label class="u-check g-np-cb" title="${tip}"><input type="checkbox" data-ai="${f}" ${p[f] ? 'checked' : ''} ${dis}> ${label}</label>`;
  const lim = p.limit == null ? '' : String(p.limit), custom = lim !== '' && !AI_LIMITS.includes(lim);
  return `<div class="g-np g-ai" data-ai-email="${escapeHtml(e)}">
    ${cb('basira', '🔮 بصيرة', 'شاشة بصيرة AI — تحليل الأسهم')}${cb('mizan', '⚖️ ميزان المحفظة', 'شاشة ميزان محفظتك AI')}${cb('mizanai', '🧭 ميزان GRIFFINE', 'شاشة ميزان GRIFFINE AI')}
    <select class="g-np-vis" data-ai="paid" title="الذكاء الاصطناعي المدفوع (Claude) للمشترك ده" ${dis}>
      <option value="" ${p.paid === null ? 'selected' : ''}>💳 المدفوع: حسب الباقة (${pro ? 'برو ✓' : 'مش برو'})</option>
      <option value="1" ${p.paid === true ? 'selected' : ''}>💳 المدفوع: مفتوح له</option>
      <option value="0" ${p.paid === false ? 'selected' : ''}>💳 المدفوع: مقفول (مجاني بس)</option>
    </select>
    <select class="g-np-vis" data-ai="daily_limit" title="الحد اليومي لتحليلات الـ AI المدفوع — بعده بيكمّل بالمجاني" ${dis}>
      ${AI_LIMITS.map(v => `<option value="${v}" ${(!custom && lim === v) ? 'selected' : ''}>${v === '' ? '♾ الحد اليومي: مفتوح' : 'الحد اليومي: ' + v}</option>`).join('')}
      ${custom ? `<option value="${lim}" selected>الحد اليومي: ${lim}</option>` : ''}<option value="custom">رقم آخر…</option>
    </select><small class="u-muted" title="تحليلات AI مدفوعة النهارده">النهارده: ${p.used || 0}</small></div>`;
}
function gAiWire(root){
  (root || document).querySelectorAll('.g-ai [data-ai]').forEach(el => {
    if (el.__aiw) return; el.__aiw = true;
    const prev = () => el.dataset.prev ?? (el.type === 'checkbox' ? '' : el.value); el.dataset.prev = el.type === 'checkbox' ? '' : el.value;
    el.addEventListener('change', async () => {
      const box = el.closest('.g-ai'), email = box.dataset.aiEmail, field = el.dataset.ai;
      let value = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value;
      if (field === 'daily_limit' && value === 'custom') {
        const v = await gPrompt('الحد اليومي لتحليلات الذكاء الاصطناعي المدفوع (رقم من 0 لـ 1000):', '30');
        if (v == null || !/^\d+$/.test(String(v).trim()) || +v > 1000) { el.value = prev(); return; }
        value = String(+v);
        if (!el.querySelector(`option[value="${value}"]`)) el.insertAdjacentHTML('afterbegin', `<option value="${value}">الحد اليومي: ${value}</option>`);
        el.value = value;
      }
      const r = await apiPost('/ai_access_api.php', { action: 'admin_set', email, field, value }).catch(() => null);
      if (r && r.success) { const A = window.__aiAll; if (A) A.access[email] = r.access; if (el.type !== 'checkbox') el.dataset.prev = el.value; GShell.toast('تم حفظ صلاحيات الذكاء الاصطناعي ✓', 'ok'); }
      else { GShell.toast((r && r.message) || 'تعذّر الحفظ', 'err'); if (el.type === 'checkbox') el.checked = !el.checked; else el.value = prev(); }
    });
  });
}

// 01. شاشة لوحة التحكم
async function renderAdminAi(){
  const __tok = screenToken();
  pushNav(() => renderAdminAi());
  window.__lastPageKey = 'admin_ai';
  app.innerHTML = '<div class="container"><div class="gs-skel" style="height:320px"></div></div>';
  const r = await apiGet('/ai_access_api.php?action=cfg').catch(() => null);
  if (screenStale(__tok)) return;
  if (!r || !r.success) { app.innerHTML = `<div class="container"><div class="section-card error">${escapeHtml((r && r.message) || 'غير مصرح')}</div><button class="secondary u-wa" id="aiBack">رجوع</button></div>`; document.getElementById('aiBack').onclick = () => goAdminHome(); return; }
  const paint = (s) => {
    app.innerHTML = `<div class="container">
      <div class="u-row"><h2>🤖 الذكاء الاصطناعي</h2><button class="secondary u-wa" id="aiBack">← لوحة التحكم</button></div>
      <div class="section-card ai-state ${s.active ? 'on' : 'off'}">
        <div class="ai-big">${s.active ? '💳 الذكاء الاصطناعي المدفوع: <b>مفعّل</b>' : '🆓 الوضع المجاني 100%: <b>شغّال</b>'}</div>
        <p class="u-fs13">${s.active
          ? 'Claude بيشتغل للأدمن ولمشتركين الباقة الشاملة للـ AI (برو) ولأي مشترك فاتحله «المدفوع» من جدول المشتركين. الباقي بيكمّل بالمحرك المجاني. لو الرصيد خلص أو حصل أي خطأ ← المحرك المجاني تلقائيًا ومفيش حاجة بتقف عند المشتركين.'
          : 'بصيرة وميزان المحفظة وميزان GRIFFINE شغالين لكل المشتركين بالمحرك الداخلي المجاني (أسعار ومؤشرات وأخبار مجانية) — مفيش أي تكلفة ومفيش أي طلب مدفوع بيطلع من الموقع، حتى لو فيه مفتاح متسجّل.'}</p>
        <button class="u-wa ${s.paidOn ? 'danger' : ''}" id="aiToggle">${s.paidOn ? '⏹ إيقاف المدفوع (رجوع للمجاني)' : '▶ تفعيل المدفوع'}</button>
        ${s.paidOn && !s.keySet ? '<div class="warning u-mt8">المدفوع مفعّل بس مفيش مفتاح — الموقع شغال مجاني لحد ما تحط المفتاح.</div>' : ''}
      </div>
      <div class="section-card">
        <h3>حساب Claude</h3>
        <label>إيميل الحساب (للتذكير — الدفع والشحن بيتعملوا على الحساب ده)</label>
        <input id="aiAccount" dir="ltr" value="${escapeHtml(s.account)}">
        <label class="u-mt8">مفتاح API ${s.keySet ? '<span class="tag tag-done">متسجّل ✓</span>' : '<span class="tag tag-wait">مش متسجّل</span>'}</label>
        <input id="aiKey" type="password" dir="ltr" autocomplete="off" placeholder="${s.keySet ? '•••••••• (اكتب مفتاح جديد عشان تغيّره)' : 'sk-ant-...'}">
        <label class="u-mt8">الموديل</label>
        <select id="aiModel">${Object.entries(s.models).map(([k, l]) => `<option value="${k}" ${k === s.model ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('')}</select>
        <div class="u-row u-mt10" style="justify-content:flex-start;gap:8px;flex-wrap:wrap">
          <button class="u-wa" id="aiSave">💾 حفظ</button><button class="secondary u-wa" id="aiTest" ${s.keySet ? '' : 'disabled'}>🧪 اختبار المفتاح</button>
          ${s.keySet ? '<button class="danger u-wa" id="aiClear">🗑 مسح المفتاح</button>' : ''}<span id="aiMsg" class="u-note"></span></div>
        <p class="u-fs12 u-muted u-mt8">المفتاح بيتحفظ على السيرفر بس ومبيوصلش لأي متصفح. طلبات AI المدفوعة النهارده للموقع كله: ${s.siteToday}${s.siteMax ? ' من ' + s.siteMax : ''}.</p>
      </div>
      <div class="section-card">
        <h3>إزاي أدفع لو حبيت أشغّل المدفوع؟</h3>
        <ol class="u-fs13" style="line-height:2">
          <li>ادخل <b dir="ltr">console.anthropic.com</b> بإيميل <b dir="ltr">${escapeHtml(s.account)}</b>.</li>
          <li>من <b>Billing</b>: ضيف كارت واشحن رصيد مقدّم (مثلًا 10 أو 20 دولار) — وتقدر تحط حد أقصى للصرف الشهري من هناك.</li>
          <li>من <b>API Keys</b>: اعمل مفتاح جديد والزقه فوق، ودوس «حفظ» وبعدين «اختبار المفتاح».</li>
          <li>دوس «▶ تفعيل المدفوع». الدفع على قد الاستخدام بس — مفيش اشتراك شهري.</li>
        </ol>
        <div class="info u-fs12">اشتراك Claude العادي بتاع الشات (Pro / Max) <b>مش بيغطي</b> الموقع — الـ API حساب دفع منفصل. ولو الرصيد خلص الموقع بيرجع للمجاني تلقائيًا.</div>
      </div>
      <div class="section-card"><h3>لكل مشترك</h3><p class="u-fs13">من <b>جدول المشتركين</b> (عمود «🤖 الذكاء الاصطناعي») تقدر تقفل أو تفتح أي شاشة من التلاتة لمشترك بعينه، وتفتح له المدفوع أو تقفله، وتحدد حده اليومي (5 / 10 / 20 / أي رقم — الافتراضي مفتوح). الحد اليومي بيتطبق على المدفوع بس — بعده بيكمّل بالمجاني.</p></div>
    </div>`;
    document.getElementById('aiBack').onclick = () => goAdminHome();
    const msg = (t) => { document.getElementById('aiMsg').textContent = t; };
    const save = async (extra) => {
      const body = Object.assign({ action: 'cfg_save', account: document.getElementById('aiAccount').value.trim(), model: document.getElementById('aiModel').value }, extra || {});
      const k = document.getElementById('aiKey').value.trim(); if (k && !body.key) body.key = k;
      const x = await apiPost('/ai_access_api.php', body).catch(() => null);
      if (x && x.success) { paint(x); document.getElementById('aiMsg').textContent = 'تم الحفظ ✓'; GShell.toast('تم الحفظ ✓', 'ok'); } else msg((x && x.message) || 'تعذّر الحفظ');
    };
    document.getElementById('aiSave').onclick = () => save();
    document.getElementById('aiToggle').onclick = async () => {
      if (!s.paidOn && !await gConfirm('تفعيل الذكاء الاصطناعي المدفوع؟ هيتخصم من رصيد حساب Claude على قد استخدام الأدمن ومشتركين برو واللي فاتحلهم المدفوع.')) return;
      save({ paid_on: s.paidOn ? '0' : '1' });
    };
    const clr = document.getElementById('aiClear'); if (clr) clr.onclick = async () => { if (await gConfirm('مسح المفتاح؟ الموقع هيشتغل مجاني بس.')) save({ key: '__clear__' }); };
    document.getElementById('aiTest').onclick = async () => { msg('⏳ جارٍ الاختبار…'); const x = await apiPost('/ai_access_api.php', { action: 'test' }).catch(() => null); msg((x && x.message) || 'تعذّر الاختبار'); };
  };
  paint(r);
}
window.renderAdminAi = renderAdminAi;
