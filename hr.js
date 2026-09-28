/* =====================================================================
   GRIFFINE — hr.js (الإصدار 85) — شؤون الموظفين (HR) + المسميات الوظيفية
   ---------------------------------------------------------------------
   01. أدوات مشتركة (API / تنسيق / تصدير Excel / طباعة تقرير)
   02. شاشة شؤون الموظفين: التبويبات (الموظفين · الحضور والرواتب · التقارير)
   03. تبويب الموظفين: القائمة + الإضافة/التعديل + المستندات
   04. تقرير موظف واحد (بيانات + سجل الحضور والرواتب + المستندات)
   05. تبويب الحضور والرواتب الشهري (حساب الراتب حسب الحضور)
   06. تبويب التقارير (كل الموظفين / كشف رواتب شهر)
   07. شاشة المسميات الوظيفية (إضافة / تعديل الاسم والصلاحيات الافتراضية / حذف)
   الصلاحية: manage_hr (والمسميات الوظيفية كمان لـ manage_staff) - والسيرفر بيتحقق من كل طلب
   ===================================================================== */

/* ---------------------------------------------------------------------
   01. أدوات مشتركة
   --------------------------------------------------------------------- */
const HR = {
  get: (q) => apiGet('/hr_api.php?' + q).catch(() => ({ success:false, message:'تعذّر الاتصال بالسيرفر' })),
  post: (d) => apiPost('/hr_api.php', d).catch(() => ({ success:false, message:'تعذّر الاتصال بالسيرفر' })),
  money: (n) => (Math.round((+n || 0) * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
  net: (base, work, present, bonus, ded) => { const r = +work > 0 ? Math.min(1, Math.max(0, +present / +work)) : 0; return Math.round(((+base || 0) * r + (+bonus || 0) - (+ded || 0)) * 100) / 100; },
  thisMonth: () => new Date().toISOString().slice(0, 7),
  monthLabel: (m) => { try { const [y, mm] = m.split('-'); return new Date(+y, +mm - 1, 1).toLocaleDateString('ar-EG', { month:'long', year:'numeric' }); } catch(e){ return m; } },
  titleOf: (titles, k) => (titles && titles[k]) || (k ? k : '—'),
};
// تصدير Excel (CSV بترميز UTF-8 عشان العربي يظهر صح في Excel)
function hrDownloadCsv(filename, header, rows){
  const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = '﻿' + [header, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
// تقرير للطباعة / الحفظ PDF (نفس أسلوب تقارير المشتركين)
function hrPrint(title, bodyHtml){
  const w = window.open('', '_blank');
  if (!w) { alert('المتصفح منع فتح نافذة التقرير - اسمح بالنوافذ المنبثقة للموقع.'); return; }
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin:0 0 4px}.meta{color:#666;font-size:12px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;font-size:12.5px;margin:10px 0}th,td{border:1px solid #ddd;padding:6px 8px;text-align:right}th{background:#f3f4f6}
    .tot td{font-weight:bold;background:#fafafa}.kv{display:grid;grid-template-columns:160px 1fr;gap:6px 12px;font-size:13px;margin:10px 0}.kv b{color:#555}
    .logo{height:48px}@media print{button{display:none}}</style></head><body>
    <img class="logo" src="${griffineLogoSrc()}" alt="GRIFFINE"><h1>${escapeHtml(title)}</h1>
    <div class="meta">GRIFFINE · شؤون الموظفين · ${new Date().toLocaleString('ar-EG')}</div>${bodyHtml}
</body></html>`);
  w.document.close(); gReportReady(w);   // الإصدار 88: شريط طباعة / PDF / مشاركة
}

/* ---------------------------------------------------------------------
   02. شاشة شؤون الموظفين
   --------------------------------------------------------------------- */
async function renderHrPage(tab){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderHrPage(tab));
  const email = await getSession();
  if (!email) return renderLogin();
  if (!window.__isAdmin) return renderHome();
  if (!hasPermission('manage_hr')) return renderAdminHub();
  tab = tab || 'employees';
  window.__lastPageKey = 'hr';
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>${pageTitle('hr', '🧑‍💼 شؤون الموظفين (HR)')}</div>
      <button class="secondary small" id="hrBackBtn">🛡️ رجوع للوحة التحكم</button></div>
    <div class="radio-row std-filter-tabs" style="margin-bottom:12px;">
      <button class="small secondary std-filter-tab ${tab === 'employees' ? 'btn-active' : ''}" data-tab="employees">👥 الموظفين</button>
      <button class="small secondary std-filter-tab ${tab === 'attendance' ? 'btn-active' : ''}" data-tab="attendance">🗓️ الحضور والرواتب</button>
      <button class="small secondary std-filter-tab ${tab === 'reports' ? 'btn-active' : ''}" data-tab="reports">📊 التقارير</button>
      <button class="small secondary" id="hrTitlesBtn" style="width:auto;margin-inline-start:auto;">🏷️ المسميات الوظيفية</button>
    </div>
    <div id="hrBody"><p class="u-muted">جارٍ التحميل...</p></div>
  </div>`;
  document.getElementById('hrBackBtn').onclick = () => goAdminHome();
  document.getElementById('hrTitlesBtn').onclick = () => renderJobTitlesPage();
  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { window.__navSilent = true; try { renderHrPage(b.dataset.tab); } finally { window.__navSilent = false; } });
  if (tab === 'attendance') return hrAttendanceTab(HR.thisMonth());
  if (tab === 'reports') return hrReportsTab();
  return hrEmployeesTab();
}

/* ---------------------------------------------------------------------
   03. تبويب الموظفين
   --------------------------------------------------------------------- */
async function hrEmployeesTab(){
  const body = document.getElementById('hrBody');
  const res = await HR.get('action=employees');
  if (!body || !body.isConnected) return;   // الإصدار 88: المستخدم ساب الشاشة أثناء التحميل
  if (!res.success) { body.innerHTML = `<p class="error">${escapeHtml(res.message || 'تعذّر التحميل')}</p>`; return; }
  const titles = res.titles || {};
  body.innerHTML = `
    <div class="grid2 u-mb10">
      <div class="section-card u-m0"><div class="u-fs12 u-muted">الموظفين الحاليين</div><div style="font-size:24px;font-weight:800;">${res.activeCount}</div></div>
      <div class="section-card u-m0"><div class="u-fs12 u-muted">إجمالي الرواتب الشهرية</div><div style="font-size:24px;font-weight:800;" dir="ltr">${HR.money(res.totalSalaries)}</div></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
      <button id="hrAddBtn" class="u-wa">➕ إضافة موظف</button>
      <input type="text" id="hrSearch" placeholder="🔍 ابحث بالاسم أو الهاتف أو الرقم القومي..." style="flex:1;min-width:200px;margin:0;">
    </div>
    <div id="hrFormWrap"></div>
    <div class="section-card" style="padding:0;overflow:auto;"><table class="std-table u-w100"><thead><tr>
      <th>الاسم</th><th>المسمى</th><th>الهاتف</th><th>الإيميل</th><th>الرقم القومي</th><th>الراتب</th><th>بدء العمل</th><th>الحالة</th><th>📎</th><th></th></tr></thead>
      <tbody id="hrRows"></tbody></table></div>`;
  const draw = () => {
    const q = (document.getElementById('hrSearch').value || '').trim().toLowerCase();
    const list = res.employees.filter(e => !q || [e.name, e.phone, e.nationalId, e.email].join(' ').toLowerCase().includes(q));
    document.getElementById('hrRows').innerHTML = list.length ? list.map(e => `<tr style="${e.status === 'left' ? 'opacity:.55' : ''}">
      <td><strong>${escapeHtml(e.name)}</strong></td><td>${escapeHtml(HR.titleOf(titles, e.jobTitle))}</td>
      <td dir="ltr">${escapeHtml(e.phone || '')}</td><td dir="ltr">${escapeHtml(e.email || '')}</td><td dir="ltr">${escapeHtml(e.nationalId || '')}</td>
      <td dir="ltr">${HR.money(e.salary)}</td><td>${e.startDate ? formatDateAr(e.startDate) : '—'}</td>
      <td>${e.status === 'left' ? 'ترك العمل' : 'على رأس العمل'}</td><td>${e.docs || 0}</td>
      <td style="white-space:nowrap;"><button class="small secondary u-wa" data-edit="${e.id}">✏️</button>
        <button class="small secondary u-wa" data-docs="${e.id}">📎 المستندات</button>
        <button class="small secondary u-wa" data-rep="${e.id}">📄 تقرير</button></td></tr>`).join('')
      : `<tr><td colspan="10" style="text-align:center;color:#888;padding:16px;">${res.employees.length ? 'لا توجد نتائج مطابقة' : 'لا يوجد موظفون بعد - اضغط "إضافة موظف".'}</td></tr>`;
    app.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => hrEmployeeForm(res.employees.find(x => x.id === +b.dataset.edit), titles));
    app.querySelectorAll('[data-docs]').forEach(b => b.onclick = () => hrDocsPanel(+b.dataset.docs));
    app.querySelectorAll('[data-rep]').forEach(b => b.onclick = () => hrEmployeeReport(+b.dataset.rep));
  };
  document.getElementById('hrSearch').oninput = draw;
  document.getElementById('hrAddBtn').onclick = () => hrEmployeeForm(null, titles);
  draw();
}

function hrEmployeeForm(emp, titles){
  const e = emp || { status: 'active' };
  const wrap = document.getElementById('hrFormWrap');
  const opt = Object.entries(titles).map(([k, l]) => `<option value="${escapeHtml(k)}" ${e.jobTitle === k ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('');
  wrap.innerHTML = `<div class="section-card">
    <div class="section-title">${emp ? '✏️ تعديل بيانات: ' + escapeHtml(e.name) : '➕ موظف جديد'}</div>
    <form id="hrForm" novalidate>
      <div class="grid2">
        <div><label>الاسم بالكامل *</label><input id="hfName" required value="${escapeHtml(e.name || '')}"></div>
        <div><label>المسمى الوظيفي</label><select id="hfTitle"><option value="">—</option>${opt}</select></div>
        <div><label>رقم الهاتف</label><input id="hfPhone" type="tel" dir="ltr" value="${escapeHtml(e.phone || '')}"></div>
        <div><label>الإيميل</label><input id="hfEmail" type="email" dir="ltr" value="${escapeHtml(e.email || '')}"></div>
        <div><label>الرقم القومي (14 رقم)</label><input id="hfNid" inputmode="numeric" maxlength="14" dir="ltr" value="${escapeHtml(e.nationalId || '')}"></div>
        <div><label>الراتب الشهري</label><input id="hfSalary" type="number" min="0" step="0.01" dir="ltr" value="${e.salary != null ? e.salary : ''}"></div>
        <div><label>تاريخ بدء العمل</label><input id="hfStart" type="date" value="${escapeHtml(e.startDate || '')}"></div>
        <div><label>الحالة</label><select id="hfStatus"><option value="active" ${e.status !== 'left' ? 'selected' : ''}>على رأس العمل</option><option value="left" ${e.status === 'left' ? 'selected' : ''}>ترك العمل</option></select></div>
        <div id="hfEndWrap" style="${e.status === 'left' ? '' : 'display:none'}"><label>تاريخ ترك العمل</label><input id="hfEnd" type="date" value="${escapeHtml(e.endDate || '')}"></div>
      </div>
      <label>ملاحظات</label><textarea id="hfNotes" rows="2">${escapeHtml(e.notes || '')}</textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
        <button type="submit" class="u-wa">💾 حفظ</button>
        <button type="button" class="secondary u-wa" id="hfCancel">إلغاء</button>
        ${emp ? '<button type="button" class="danger" id="hfDelete" style="width:auto;margin-inline-start:auto;">🗑️ حذف الموظف نهائيًا</button>' : ''}
      </div>
      <div id="hfMsg" class="error" style="display:none;margin-top:8px;"></div>
    </form></div>`;
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('hfStatus').onchange = (ev) => { document.getElementById('hfEndWrap').style.display = ev.target.value === 'left' ? '' : 'none'; };
  document.getElementById('hfCancel').onclick = () => { wrap.innerHTML = ''; };
  const del = document.getElementById('hfDelete');
  if (del) del.onclick = async () => {
    if (!await gConfirm(`حذف "${e.name}" (ينتقل إلى سلة المحذوفات ويمكن استرجاعه) مع كل مستنداته وسجل حضوره؟ (لو ساب الشغل، الأفضل تغيّر حالته لـ "ترك العمل" حتى يبقى سجله محفوظًا)`, { ok: 'حذف نهائي', danger: true })) return;
    const r = await HR.post({ action: 'delete_employee', id: e.id });
    if (r.success) hrEmployeesTab(); else alert(r.message || 'تعذّر الحذف');
  };
  document.getElementById('hrForm').onsubmit = async (ev) => {
    ev.preventDefault();
    const v = (id) => document.getElementById(id).value.trim();
    const r = await HR.post({ action: 'save_employee', id: e.id || 0, name: v('hfName'), jobTitle: v('hfTitle'), phone: v('hfPhone'), email: v('hfEmail'),
      nationalId: v('hfNid'), salary: v('hfSalary') || 0, startDate: v('hfStart'), status: v('hfStatus'), endDate: v('hfStatus') === 'left' ? v('hfEnd') : '', notes: v('hfNotes') });
    if (r.success) { alert('✅ تم الحفظ'); hrEmployeesTab(); }
    else { const m = document.getElementById('hfMsg'); m.textContent = r.message || 'تعذّر الحفظ'; m.style.display = ''; }
  };
}

// المستندات: رفع / تحميل / حذف
async function hrDocsPanel(empId){
  const wrap = document.getElementById('hrFormWrap');
  wrap.innerHTML = '<div class="section-card">جارٍ التحميل...</div>';
  const res = await HR.get('action=employee&id=' + empId);
  if (!wrap.isConnected) return;
  if (!res.success) { wrap.innerHTML = `<div class="section-card error">${escapeHtml(res.message || '')}</div>`; return; }
  wrap.innerHTML = `<div class="section-card">
    <div class="section-title">📎 مستندات: ${escapeHtml(res.employee.name)}</div>
    <div style="font-size:12px;color:#888;margin-bottom:8px;">صورة البطاقة، العقد، الشهادات... (صور، PDF، Word، Excel، ZIP - حتى 15 ميجا للملف). الملفات محفوظة في مكان محمي ولا يفتحها إلا من لديه صلاحية شؤون الموظفين.</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <input type="file" id="hrDocFile" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.pptx,.zip" style="flex:1;min-width:200px;">
      <button id="hrDocUpload" class="u-wa">⬆️ رفع</button>
      <button class="secondary u-wa" id="hrDocClose">إغلاق</button>
    </div>
    <div id="hrDocMsg" style="font-size:12.5px;margin-top:6px;"></div>
    <ul style="list-style:none;padding:0;margin:10px 0 0;">${res.documents.length ? res.documents.map(d => `<li style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-soft);">
      <span>📄 ${escapeHtml(d.name)} <small class="u-muted">— ${escapeHtml(d.at || '')}</small></span>
      <span style="white-space:nowrap;"><a href="${escapeHtml(d.url)}" target="_blank" rel="noopener"><button class="small secondary u-wa">⬇️ تنزيل / عرض</button></a>
      <button class="small danger u-wa" data-deldoc="${d.id}">🗑️</button></span></li>`).join('') : '<li class="u-muted">لا يوجد مستندات بعد.</li>'}</ul>
  </div>`;
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('hrDocClose').onclick = () => { wrap.innerHTML = ''; hrEmployeesTab(); };
  document.getElementById('hrDocUpload').onclick = async () => {
    const f = document.getElementById('hrDocFile').files[0];
    const msg = document.getElementById('hrDocMsg');
    if (!f) { msg.textContent = 'اختار ملف الأول.'; return; }
    if (f.size > 15 * 1024 * 1024) { msg.textContent = 'الملف كبير - أقصى حجم 15 ميجا.'; return; }
    msg.textContent = '⏳ جاري الرفع...';
    const r = await HR.post({ action: 'upload_doc', employee_id: empId, file: f });
    if (r.success) hrDocsPanel(empId); else msg.textContent = r.message || 'تعذّر الرفع';
  };
  app.querySelectorAll('[data-deldoc]').forEach(b => b.onclick = async () => {
    if (!await gConfirm('حذف هذا المستند؟ (ينتقل إلى سلة المحذوفات ويمكن استرجاعه)', { ok: 'حذف', danger: true })) return;
    const r = await HR.post({ action: 'delete_doc', id: +b.dataset.deldoc });
    if (r.success) hrDocsPanel(empId); else alert(r.message || 'تعذّر');
  });
}

/* ---------------------------------------------------------------------
   04. تقرير موظف واحد
   --------------------------------------------------------------------- */
async function hrEmployeeReport(empId){
  const res = await HR.get('action=employee&id=' + empId);
  if (!res.success) { alert(res.message || 'تعذّر'); return; }
  const e = res.employee, t = res.titles || {};
  const totNet = res.attendance.reduce((s, a) => s + a.net, 0);
  hrPrint('تقرير موظف: ' + e.name, `
    <div class="kv"><b>الاسم</b><span>${escapeHtml(e.name)}</span><b>المسمى الوظيفي</b><span>${escapeHtml(HR.titleOf(t, e.jobTitle))}</span>
      <b>الهاتف</b><span dir="ltr">${escapeHtml(e.phone || '—')}</span><b>الإيميل</b><span dir="ltr">${escapeHtml(e.email || '—')}</span>
      <b>الرقم القومي</b><span dir="ltr">${escapeHtml(e.nationalId || '—')}</span><b>الراتب الشهري</b><span>${HR.money(e.salary)}</span>
      <b>تاريخ بدء العمل</b><span>${e.startDate ? formatDateAr(e.startDate) : '—'}</span><b>الحالة</b><span>${e.status === 'left' ? 'ترك العمل' + (e.endDate ? ' (' + formatDateAr(e.endDate) + ')' : '') : 'على رأس العمل'}</span>
      ${e.notes ? `<b>ملاحظات</b><span>${escapeHtml(e.notes)}</span>` : ''}</div>
    <h3>الحضور والرواتب (آخر 24 شهر)</h3>
    <table><thead><tr><th>الشهر</th><th>أيام العمل</th><th>الحضور</th><th>الراتب الأساسي</th><th>مكافأة</th><th>خصم</th><th>المستحق</th><th>ملاحظة</th></tr></thead><tbody>
    ${res.attendance.map(a => `<tr><td>${HR.monthLabel(a.month)}</td><td>${a.workDays}</td><td>${a.presentDays}</td><td>${HR.money(a.baseSalary)}</td><td>${HR.money(a.bonus)}</td><td>${HR.money(a.deductions)}</td><td><b>${HR.money(a.net)}</b></td><td>${escapeHtml(a.note || '')}</td></tr>`).join('') || '<tr><td colspan="8">لا يوجد حضور مسجّل</td></tr>'}
    ${res.attendance.length ? `<tr class="tot"><td colspan="6">الإجمالي المستحق</td><td>${HR.money(totNet)}</td><td></td></tr>` : ''}</tbody></table>
    <h3>المستندات</h3><ul>${res.documents.map(d => `<li>${escapeHtml(d.name)} — ${escapeHtml(d.at || '')}</li>`).join('') || '<li>لا يوجد</li>'}</ul>`);
}

/* ---------------------------------------------------------------------
   05. الحضور والرواتب الشهري
   --------------------------------------------------------------------- */
async function hrAttendanceTab(month){
  const body = document.getElementById('hrBody');
  const res = await HR.get('action=attendance&month=' + encodeURIComponent(month));
  if (!body || !body.isConnected) return;   // الإصدار 88: المستخدم ساب الشاشة أثناء التحميل
  if (!res.success) { body.innerHTML = `<p class="error">${escapeHtml(res.message || 'تعذّر التحميل')}</p>`; return; }
  const rows = res.rows, titles = res.titles || {};
  body.innerHTML = `
    <div class="section-card" style="display:flex;gap:10px;align-items:end;flex-wrap:wrap;">
      <div><label>الشهر</label><input type="month" id="haMonth" value="${escapeHtml(month)}" class="u-m0"></div>
      <div><label>أيام العمل في الشهر (للكل)</label><div style="display:flex;gap:6px;"><input type="number" id="haWorkAll" min="1" max="31" step="0.5" value="${rows[0] ? rows[0].workDays : 26}" style="width:90px;margin:0;" dir="ltr"><button class="small secondary u-wa u-m0" id="haApplyWork">تطبيق على الكل</button></div></div>
      <div style="margin-inline-start:auto;font-size:12px;color:#888;line-height:1.8;">المستحق = الراتب × (الحضور ÷ أيام العمل) + المكافأة − الخصم</div>
    </div>
    <div class="section-card" style="padding:0;overflow:auto;"><table class="std-table u-w100"><thead><tr>
      <th>الموظف</th><th>المسمى</th><th>الراتب الأساسي</th><th>أيام العمل</th><th>أيام الحضور</th><th>مكافأة</th><th>خصم</th><th>المستحق</th><th>ملاحظة</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr data-i="${i}">
        <td><strong>${escapeHtml(r.name)}</strong>${r.saved ? '' : ' <small style="color:#b7791f;">(لم يُسجَّل بعد)</small>'}</td><td>${escapeHtml(HR.titleOf(titles, r.jobTitle))}</td>
        <td dir="ltr">${HR.money(r.baseSalary)}</td>
        <td><input type="number" class="haW" min="1" max="31" step="0.5" value="${r.workDays}" style="width:70px;margin:0;" dir="ltr"></td>
        <td><input type="number" class="haP" min="0" max="31" step="0.5" value="${r.presentDays}" style="width:70px;margin:0;" dir="ltr"></td>
        <td><input type="number" class="haB" min="0" step="0.01" value="${r.bonus}" style="width:90px;margin:0;" dir="ltr"></td>
        <td><input type="number" class="haD" min="0" step="0.01" value="${r.deductions}" style="width:90px;margin:0;" dir="ltr"></td>
        <td class="haNet" dir="ltr" style="font-weight:800;"></td>
        <td><input type="text" class="haN" value="${escapeHtml(r.note || '')}" style="min-width:120px;margin:0;"></td></tr>`).join('') || '<tr><td colspan="9" style="text-align:center;color:#888;padding:16px;">لا يوجد موظفون على رأس العمل.</td></tr>'}
      </tbody><tfoot><tr><td colspan="7" style="text-align:left;font-weight:800;">إجمالي المستحق للشهر</td><td id="haTotal" dir="ltr" style="font-weight:800;"></td><td></td></tr></tfoot></table></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button id="haSave" class="u-wa">💾 حفظ حضور الشهر</button>
      <button class="secondary u-wa" id="haPrint">🖨️ طباعة كشف الرواتب</button>
      <button class="secondary u-wa" id="haCsv">⬇️ Excel</button>
    </div><div id="haMsg" style="font-size:12.5px;margin-top:6px;"></div>`;
  const read = () => rows.map((r, i) => { const tr = body.querySelector(`tr[data-i="${i}"]`); const g = (c) => tr.querySelector(c).value;
    return { id: r.id, name: r.name, jobTitle: r.jobTitle, baseSalary: r.baseSalary, workDays: +g('.haW'), presentDays: +g('.haP'), bonus: +g('.haB') || 0, deductions: +g('.haD') || 0, note: g('.haN').trim() }; });
  const recalc = () => {
    let tot = 0;
    read().forEach((r, i) => { const n = HR.net(r.baseSalary, r.workDays, r.presentDays, r.bonus, r.deductions); tot += n; body.querySelector(`tr[data-i="${i}"] .haNet`).textContent = HR.money(n); });
    document.getElementById('haTotal').textContent = HR.money(tot);
  };
  body.querySelectorAll('tbody input').forEach(inp => inp.addEventListener('input', recalc));
  recalc();
  document.getElementById('haMonth').onchange = (ev) => { if (ev.target.value) hrAttendanceTab(ev.target.value); };
  document.getElementById('haApplyWork').onclick = () => { const v = document.getElementById('haWorkAll').value; body.querySelectorAll('.haW').forEach(x => { x.value = v; }); recalc(); };
  document.getElementById('haSave').onclick = async () => {
    const data = read();
    const bad = data.find(r => !(r.workDays > 0 && r.workDays <= 31) || r.presentDays < 0 || r.presentDays > r.workDays);
    if (bad) { alert(`راجع أيام "${bad.name}": يجب أن يكون الحضور بين 0 وعدد أيام العمل.`); return; }
    const r = await HR.post({ action: 'save_attendance', month, rows: JSON.stringify(data) });
    const m = document.getElementById('haMsg');
    if (r.success) { m.textContent = `✓ تم حفظ حضور ${r.saved} موظف لشهر ${HR.monthLabel(month)}`; m.style.color = 'var(--green)'; hrAttendanceTab(month); }
    else { m.textContent = r.message || 'تعذّر الحفظ'; m.style.color = '#c0392b'; }
  };
  const payroll = () => read().map(r => ({ ...r, net: HR.net(r.baseSalary, r.workDays, r.presentDays, r.bonus, r.deductions) }));
  document.getElementById('haPrint').onclick = () => {
    const d = payroll(), tot = d.reduce((s, r) => s + r.net, 0);
    hrPrint('كشف رواتب ' + HR.monthLabel(month), `<table><thead><tr><th>#</th><th>الموظف</th><th>المسمى</th><th>الراتب الأساسي</th><th>أيام العمل</th><th>الحضور</th><th>مكافأة</th><th>خصم</th><th>المستحق</th><th>ملاحظة</th></tr></thead><tbody>
      ${d.map((r, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(HR.titleOf(titles, r.jobTitle))}</td><td>${HR.money(r.baseSalary)}</td><td>${r.workDays}</td><td>${r.presentDays}</td><td>${HR.money(r.bonus)}</td><td>${HR.money(r.deductions)}</td><td><b>${HR.money(r.net)}</b></td><td>${escapeHtml(r.note)}</td></tr>`).join('')}
      <tr class="tot"><td colspan="8">الإجمالي</td><td>${HR.money(tot)}</td><td></td></tr></tbody></table>`);
  };
  document.getElementById('haCsv').onclick = () => hrDownloadCsv(`griffine-payroll-${month}.csv`,
    ['الموظف', 'المسمى', 'الراتب الأساسي', 'أيام العمل', 'أيام الحضور', 'مكافأة', 'خصم', 'المستحق', 'ملاحظة'],
    payroll().map(r => [r.name, HR.titleOf(titles, r.jobTitle), r.baseSalary, r.workDays, r.presentDays, r.bonus, r.deductions, r.net, r.note]));
}

/* ---------------------------------------------------------------------
   06. التقارير
   --------------------------------------------------------------------- */
async function hrReportsTab(){
  const body = document.getElementById('hrBody');
  body.innerHTML = `<div class="section-card">
    <div class="section-title">📊 تقارير شؤون الموظفين</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 14px;">
      <button id="hrRepAll" class="u-wa">🖨️ تقرير كل الموظفين</button>
      <button class="secondary u-wa" id="hrRepAllCsv">⬇️ كل الموظفين Excel</button>
    </div>
    <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;">
      <div><label>كشف رواتب شهر</label><input type="month" id="hrRepMonth" value="${HR.thisMonth()}" class="u-m0"></div>
      <button class="secondary u-wa u-m0" id="hrRepMonthBtn">فتح الشهر (طباعة / Excel)</button>
    </div>
    <p style="font-size:12px;color:#888;margin-top:12px;">تقرير موظف واحد: من تبويب "الموظفين" ← زرار "📄 تقرير" جنب الموظف.</p></div>`;
  const load = async () => { const r = await HR.get('action=employees'); if (!r.success) { alert(r.message || 'تعذّر'); return null; } return r; };
  document.getElementById('hrRepAll').onclick = async () => {
    const r = await load(); if (!r) return; const t = r.titles || {};
    hrPrint('تقرير الموظفين', `<p>عدد الموظفين الحاليين: <b>${r.activeCount}</b> — إجمالي الرواتب الشهرية: <b>${HR.money(r.totalSalaries)}</b></p>
      <table><thead><tr><th>#</th><th>الاسم</th><th>المسمى</th><th>الهاتف</th><th>الإيميل</th><th>الرقم القومي</th><th>الراتب</th><th>بدء العمل</th><th>الحالة</th><th>مستندات</th></tr></thead><tbody>
      ${r.employees.map((e, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(e.name)}</td><td>${escapeHtml(HR.titleOf(t, e.jobTitle))}</td><td>${escapeHtml(e.phone || '')}</td><td>${escapeHtml(e.email || '')}</td><td>${escapeHtml(e.nationalId || '')}</td><td>${HR.money(e.salary)}</td><td>${e.startDate ? formatDateAr(e.startDate) : ''}</td><td>${e.status === 'left' ? 'ترك العمل' : 'على رأس العمل'}</td><td>${e.docs || 0}</td></tr>`).join('')}
      <tr class="tot"><td colspan="6">إجمالي رواتب الموظفين الحاليين</td><td>${HR.money(r.totalSalaries)}</td><td colspan="3"></td></tr></tbody></table>`);
  };
  document.getElementById('hrRepAllCsv').onclick = async () => {
    const r = await load(); if (!r) return; const t = r.titles || {};
    hrDownloadCsv('griffine-employees.csv', ['الاسم', 'المسمى', 'الهاتف', 'الإيميل', 'الرقم القومي', 'الراتب', 'بدء العمل', 'الحالة', 'ترك العمل', 'مستندات', 'ملاحظات'],
      r.employees.map(e => [e.name, HR.titleOf(t, e.jobTitle), e.phone, e.email, e.nationalId, e.salary, e.startDate, e.status === 'left' ? 'ترك العمل' : 'على رأس العمل', e.endDate, e.docs, e.notes]));
  };
  document.getElementById('hrRepMonthBtn').onclick = () => {
    const m = document.getElementById('hrRepMonth').value || HR.thisMonth();
    window.__navSilent = true; try { renderHrPage('attendance'); } finally { window.__navSilent = false; }
    setTimeout(() => hrAttendanceTab(m), 50);
  };
}

/* ---------------------------------------------------------------------
   07. المسميات الوظيفية (manage_hr أو manage_staff)
   --------------------------------------------------------------------- */
async function renderJobTitlesPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderJobTitlesPage());
  const email = await getSession();
  if (!email) return renderLogin();
  if (!window.__isAdmin) return renderHome();
  if (!hasPermission('manage_hr') && !hasPermission('manage_staff')) return renderAdminHub();
  window.__lastPageKey = 'job_titles';
  const res = await HR.get('action=titles');
  if (!res.success) { if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}<p class="error">${escapeHtml(res.message || 'تعذّر التحميل')}</p></div>`; return; }
  const pk = res.permissionKeys || {};
  const permBoxes = (sel, idp) => Object.entries(pk).map(([k, l]) => `<label class="ms-item u-fs12"><input type="checkbox" class="${idp}" value="${k}" ${sel.includes(k) ? 'checked' : ''}> ${escapeHtml(l)}</label>`).join('');
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>${pageTitle('job_titles', '🏷️ المسميات الوظيفية')}</div>
      <button class="secondary small" id="jtBack">🛡️ رجوع للوحة التحكم</button></div>
    <div class="info">أضف أو عدّل أي مسمى وظيفي. الصلاحيات هنا "افتراضية": تُضاف تلقائيًا عند إضافة عضو فريق بهذا المسمى، وبعدها يمكنك زيادتها أو إنقاصها لكل شخص من "الفريق والصلاحيات".</div>
    <div class="section-card"><div class="section-title">➕ مسمى جديد</div>
      <input type="text" id="jtNewLabel" placeholder="مثال: محاسب، مدير فرع، مسؤول HR">
      <details class="u-mt6"><summary style="cursor:pointer;font-size:13px;">الصلاحيات الافتراضية (اختياري)</summary><div class="ms-grid u-mt6">${permBoxes([], 'jtNewPerm')}</div></details>
      <button id="jtAdd" class="u-wa u-mt8">إضافة</button></div>
    ${res.titles.map(t => `<div class="section-card" data-key="${escapeHtml(t.key)}">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <input type="text" class="jtLabel" value="${escapeHtml(t.label)}" style="flex:1;min-width:180px;margin:0;font-weight:700;">
        <button class="small jtSave u-wa u-m0">💾 حفظ</button>
        <button class="small danger jtDel u-wa u-m0">🗑️</button>
      </div>
      <details class="u-mt6"><summary style="cursor:pointer;font-size:12.5px;color:#888;">الصلاحيات الافتراضية (${t.perms.length})</summary><div class="ms-grid u-mt6">${permBoxes(t.perms, 'jtPerm')}</div></details>
    </div>`).join('')}
  </div>`;
  document.getElementById('jtBack').onclick = () => goAdminHome();
  document.getElementById('jtAdd').onclick = async () => {
    const label = document.getElementById('jtNewLabel').value.trim();
    if (!label) { alert('اكتب اسم المسمى.'); return; }
    const perms = [...document.querySelectorAll('.jtNewPerm:checked')].map(x => x.value);
    const r = await HR.post({ action: 'save_title', label, perms: JSON.stringify(perms) });
    if (r.success) { alert('✅ تمت إضافة المسمى'); window.__navSilent = true; try { renderJobTitlesPage(); } finally { window.__navSilent = false; } } else alert(r.message || 'تعذّر');
  };
  app.querySelectorAll('[data-key]').forEach(card => {
    const key = card.dataset.key;
    card.querySelector('.jtSave').onclick = async () => {
      const perms = [...card.querySelectorAll('.jtPerm:checked')].map(x => x.value);
      const r = await HR.post({ action: 'save_title', key, label: card.querySelector('.jtLabel').value.trim(), perms: JSON.stringify(perms) });
      alert(r.success ? '✅ تم الحفظ' : (r.message || 'تعذّر'));
    };
    card.querySelector('.jtDel').onclick = async () => {
      if (!await gConfirm(`حذف المسمى "${card.querySelector('.jtLabel').value}"؟`, { ok: 'حذف', danger: true })) return;
      const r = await HR.post({ action: 'delete_title', key });
      if (r.success) card.remove(); else alert(r.message || 'تعذّر');
    };
  });
}
