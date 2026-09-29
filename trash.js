/* =====================================================================
   GRIFFINE — trash.js (الإصدار 89) — سلة المحذوفات (زي ويندوز)
   كل واحد بيشوف اللي هو مسحه (عميل / موظف / أدمن) ويقدر يرجّعه أو يحذفه نهائيًا
   مدير الموقع يقدر يعرض "كل المحذوفات" في الموقع
   ===================================================================== */
const TRASH_TYPES = {
  plan:'خطة', watchlist:'قائمة المتابعة', price_alert:'تنبيه سعر', staff:'موظف', hr_employee:'موظف (HR)', hr_document:'مستند',
  job_title:'مسمى وظيفي', faq:'المساعد الذكي', article:'مقال', testimonial:'رأي عميل', blacklist:'القائمة السوداء',
  subscription_plan:'باقة', suggestion:'مقترح', chat:'محادثة شات', customer:'عميل', notification:'إشعار', opportunity:'فرصة (كشاف الأسهم)'
};
async function renderTrashPage(all){
  if (!window.__isAdmin && window.GShell && GShell.settings && GShell.settings.hide_trash_screen === true) return renderHome();   // الإصدار 96: الشاشة مخفية من لوحة التحكم
  const __tok = screenToken();
  pushNav(() => renderTrashPage(all));
  const email = await getSession();
  if (!email) return renderLogin();
  window.__lastPageKey = 'trash';
  const d = await apiGet('/trash_api.php?action=list' + (all ? '&all=1' : '')).catch(() => ({ success:false, message:'تعذّر الاتصال بالسيرفر' }));
  if (screenStale(__tok)) return;
  const items = d.items || [];
  const types = [...new Set(items.map(i => i.item_type))];
  app.innerHTML = `<div class="container wide"><div class="gs-page-title">🗑️ سلة المحذوفات</div>
    <div class="info">أي شيء تحذفه من الموقع ينتقل إلى هنا، ويمكنك استرجاعه لمكانه أو حذفه نهائيًا. يُحذف تلقائيًا ما مر عليه ${d.keepDays || 90} يومًا.</div>
    ${d.success ? '' : `<div class="section-card u-danger">${escapeHtml(d.message || 'خطأ')}</div>`}
    <div class="radio-row u-mb10">
      ${d.isSuper ? `<button class="small ${all ? '' : 'secondary'} u-wa" id="tbAll">${all ? '👤 محذوفاتي فقط' : '🛡️ كل المحذوفات في الموقع'}</button>` : ''}
      <select id="tbType" class="u-wa u-m0"><option value="">كل الأنواع (${items.length})</option>${types.map(t => `<option value="${t}">${TRASH_TYPES[t] || t} (${items.filter(i => i.item_type === t).length})</option>`).join('')}</select>
      <input id="tbSearch" class="u-wa u-m0" placeholder="بحث...">
      ${items.length ? `<button class="small danger u-wa" id="tbEmpty">تفريغ السلة</button>` : ''}
    </div>
    <div class="section-card"><div class="table-scroll"><table class="g-table"><thead><tr><th>العنصر</th><th></th><th>النوع</th><th>تاريخ الحذف</th>${all ? '<th>حذفه</th>' : ''}</tr></thead><tbody id="tbRows">
      ${items.map(i => `<tr data-type="${escapeHtml(i.item_type)}" data-text="${escapeHtml((i.item_label + ' ' + i.deleted_by).toLowerCase())}"><td>${escapeHtml(i.item_label)}</td>
        <td><button class="small u-wa" data-tbres="${i.id}">↩️ استرجاع</button> <button class="small danger u-wa" data-tbdel="${i.id}">حذف نهائي</button></td>
        <td>${escapeHtml(TRASH_TYPES[i.item_type] || i.item_type)}</td>
        <td class="g-num">${escapeHtml(formatDateTimeAr(i.deleted_at))}</td>${all ? `<td dir="ltr" class="u-fs12">${escapeHtml(i.deleted_by)}</td>` : ''}</tr>`).join('')
        || `<tr><td colspan="${all ? 5 : 4}" class="u-muted">السلة فارغة</td></tr>`}
    </tbody></table></div></div></div>`;
  const reload = () => { window.__navSilent = true; try { renderTrashPage(all); } finally { window.__navSilent = false; } };
  const filter = () => { const t = tbType.value, q = tbSearch.value.trim().toLowerCase();
    app.querySelectorAll('#tbRows tr[data-type]').forEach(tr => { tr.style.display = (!t || tr.dataset.type === t) && (!q || tr.dataset.text.includes(q)) ? '' : 'none'; }); };
  tbType.onchange = filter; tbSearch.oninput = filter;
  const allBtn = document.getElementById('tbAll'); if (allBtn) allBtn.onclick = () => { window.__navSilent = true; try { renderTrashPage(!all); } finally { window.__navSilent = false; } };
  app.querySelectorAll('[data-tbres]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const r = await apiPost('/trash_api.php', { action:'restore', id: b.dataset.tbres }).catch(() => ({}));
    if (r.success) {
      GShell.toast('تم الاسترجاع إلى مكانه', 'ok'); reload();
    } else { b.disabled = false; GShell.toast(r.message || 'تعذّر الاسترجاع', 'err'); }
  });
  app.querySelectorAll('[data-tbdel]').forEach(b => b.onclick = async () => {
    if (!await gConfirm('حذف نهائي؟ لن يمكن استرجاعه بعد ذلك.')) return;
    const r = await apiPost('/trash_api.php', { action:'purge', id: b.dataset.tbdel }).catch(() => ({})); if (r.success) reload(); else GShell.toast(r.message || 'خطأ', 'err');
  });
  const emp = document.getElementById('tbEmpty'); if (emp) emp.onclick = async () => {
    if (!await gConfirm(all ? 'تفريغ كل سلة الموقع نهائيًا؟' : 'تفريغ السلة نهائيًا؟ لن يمكن استرجاع أي عنصر.')) return;
    const r = await apiPost('/trash_api.php', { action:'empty', all: all ? '1' : '' }).catch(() => ({})); if (r.success) reload();
  };
}
