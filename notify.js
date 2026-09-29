/* =====================================================================
   GRIFFINE — notify.js (الإصدار 101) — قنوات الإشعارات (الموقع / الإيميل / الواتساب)
   01. خانات القنوات قدام كل مشترك وموظف في لوحة التحكم (الأدمن بس)
   02. قسم «🔔 قنوات الإشعارات والواتساب» في الإعدادات
   03. «🔔 استقبال الإشعارات» في حساب المستخدم (بيظهر بس لو الأدمن أظهره له)
   ===================================================================== */
async function gNpLoad(force){
  if (!force && window.__npAll && Date.now() - window.__npAll.at < 30000) return window.__npAll;
  const r = await apiGet('/notify_prefs_api.php?action=admin_all').catch(() => null);
  window.__npAll = r && r.success ? Object.assign(r, { at: Date.now() }) : { prefs: {}, waVisible: false, visibleAll: false, canEdit: false, at: Date.now() };
  return window.__npAll;
}
// خانات القنوات لشخص (الإيميل = مفتاح الحساب)
function gNpCellHtml(email){
  const A = window.__npAll; if (!A || !email) return '';
  const p = A.prefs[String(email).toLowerCase()] || { app: true, email: true, wa: false, phone: '', visible: null };
  const dis = A.canEdit ? '' : 'disabled';
  const cb = (f, label, on) => `<label class="u-check g-np-cb" title="${label}"><input type="checkbox" data-np="${f}" ${on ? 'checked' : ''} ${dis}> ${label}</label>`;
  return `<div class="g-np" data-np-email="${escapeHtml(String(email).toLowerCase())}">
    ${cb('app', '📱 الموقع', p.app)}${cb('email', '✉️ الإيميل', p.email)}${A.waVisible ? cb('wa', '🟢 واتساب', p.wa) + `<input class="g-np-phone" data-np="wa_phone" dir="ltr" placeholder="رقم الواتساب" value="${escapeHtml(p.phone || '')}" ${dis}>` : ''}
    <select class="g-np-vis" data-np="user_visible" title="إظهار إعدادات الإشعارات للمشترك" ${dis}>
      <option value="" ${p.visible === null ? 'selected' : ''}>👁 حسب الإعداد العام (${A.visibleAll ? 'ظاهر' : 'مخفي'})</option>
      <option value="1" ${p.visible === true ? 'selected' : ''}>👁 ظاهر له</option>
      <option value="0" ${p.visible === false ? 'selected' : ''}>🙈 مخفي عنه</option>
    </select></div>`;
}
function gNpWire(root){
  (root || document).querySelectorAll('.g-np [data-np]').forEach(el => {
    if (el.__npw) return; el.__npw = true;
    el.addEventListener('change', async () => {
      const box = el.closest('.g-np'), email = box.dataset.npEmail, field = el.dataset.np;
      const value = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value.trim();
      if (el.type === 'checkbox' && !el.checked && !Array.from(box.querySelectorAll('input[type=checkbox]')).some(x => x.checked)) {
        if (!await gConfirm('كده الشخص ده مش هيستقبل أي إشعارات خالص. متأكد؟')) { el.checked = true; return; }
      }
      const r = await apiPost('/notify_prefs_api.php', { action: 'admin_set', email, field, value }).catch(() => null);
      if (r && r.success) { const A = window.__npAll; if (A) A.prefs[email] = r.prefs; GShell.toast('تم حفظ قنوات الإشعارات ✓', 'ok'); }
      else { GShell.toast((r && r.message) || 'تعذّر الحفظ', 'err'); if (el.type === 'checkbox') el.checked = !el.checked; }
    });
  });
}

// 02. قسم الإعدادات
function gNpSettingsHtml(){
  return `<h2 class="u-mt20">🔔 قنوات الإشعارات والواتساب</h2>
    <div class="info">الافتراضي لكل مشترك: إشعارات الموقع + الإيميل. تقدر تغيّر قنوات أي مشترك أو موظف من الخانات قدام اسمه في جدول المشتركين وجدول الفريق.
      الواتساب بيتبعت من رقم واتساب الموقع (نفس إعدادات واتساب في «الدخول والأمان») بقالب رسالة معتمد من Meta فيه متغيّر واحد {{1}} = نص الإشعار.
      <b>لحد ربط الخط البزنس سيب الواتساب مقفول</b> — كل حاجة تخصه بتبقى مخفية من الجداول.</div>
    <div class="section-card" id="npCfgWrap">
      <label class="u-check"><input type="checkbox" id="npWaOn"> تفعيل إرسال الإشعارات على الواتساب (وإظهار خانات الواتساب في الجداول)</label>
      <label class="u-fs12">اسم قالب إشعار الواتساب المعتمد (حروف إنجليزي صغيرة وأرقام و _)<input id="npWaTpl" dir="ltr" placeholder="griffine_notify"></label>
      <label class="u-check"><input type="checkbox" id="npVisAll"> إظهار إعدادات «استقبال الإشعارات» لكل المشتركين في حسابهم (وتقدر تستثني أي حد من الخانة قدام اسمه)</label>
      <button class="small u-wa u-mt8" id="npSave">💾 حفظ</button> <span id="npMsg" class="u-note"></span>
    </div>`;
}
function gNpSettingsWire(){
  const w = document.getElementById('npCfgWrap'); if (!w) return;
  siteCfgAdminApi().then(r => { const c = (r && r.config) || {};
    document.getElementById('npWaOn').checked = c.wa_notify_on === '1'; document.getElementById('npWaTpl').value = c.wa_notify_template || ''; document.getElementById('npVisAll').checked = c.notify_prefs_visible === '1'; });
  document.getElementById('npSave').onclick = async () => {
    const x = await siteCfgAdminApi({ action: 'save', wa_notify_on: document.getElementById('npWaOn').checked ? '1' : '0', wa_notify_template: document.getElementById('npWaTpl').value.trim(), notify_prefs_visible: document.getElementById('npVisAll').checked ? '1' : '0' });
    document.getElementById('npMsg').textContent = x && x.success ? 'تم الحفظ ✓' : ((x && x.message) || 'تعذّر الحفظ');
    window.__npAll = null;
  };
}

// 03. حساب المستخدم: «🔔 استقبال الإشعارات» (لو الأدمن أظهرها له)
async function gNpMineCard(host){
  if (!host) return;
  const r = await apiGet('/notify_prefs_api.php?action=mine').catch(() => null);
  if (!r || !r.success || !r.visible || !host.isConnected) return;
  const card = document.createElement('div'); card.className = 'section-card g-np-mine';
  card.innerHTML = `<b>🔔 استقبال الإشعارات</b><div class="u-fs12 u-muted u-mb8">اختار إزاي توصلك التنبيهات والفرص وإشعارات الخطط.</div>
    <label class="u-check"><input type="checkbox" data-m="app" ${r.app ? 'checked' : ''}> 📱 إشعارات الموقع</label>
    <label class="u-check"><input type="checkbox" data-m="email" ${r.email ? 'checked' : ''}> ✉️ الإيميل</label>
    ${r.waAvailable ? `<label class="u-check"><input type="checkbox" data-m="wa" ${r.wa ? 'checked' : ''}> 🟢 واتساب</label><input data-m="phone" dir="ltr" placeholder="رقم الواتساب" value="${escapeHtml(r.phone || '')}">` : ''}
    <button class="small u-wa u-mt8" data-m="save">💾 حفظ</button>`;
  host.appendChild(card);
  card.querySelector('[data-m="save"]').onclick = async () => {
    const v = (k) => { const e = card.querySelector(`[data-m="${k}"]`); return e ? (e.type === 'checkbox' ? (e.checked ? '1' : '0') : e.value.trim()) : undefined; };
    const d = { action: 'save_mine', app: v('app'), email: v('email') }; if (r.waAvailable) { d.wa = v('wa'); d.phone = v('phone'); }
    const x = await apiPost('/notify_prefs_api.php', d).catch(() => null);
    GShell.toast(x && x.success ? (x.message || 'تم الحفظ ✓') : ((x && x.message) || 'تعذّر الحفظ'), x && x.success ? 'ok' : 'err');
  };
}
