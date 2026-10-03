/* =====================================================================
   GRIFFINE — perks.js (الإصدار 135) — مميزات كل باقة
   - window.gPerk(k): الميزة شغالة للمشترك؟ (الأدمن دايمًا)
   - قفل الشاشات حسب الباقة: الشاشة المقفولة ← شاشة «🔒 مش ضمن باقتك» + الباقات اللي فيها الميزة
     (قوائم خطط الداك / الجريد + قائمة المتابعة + تنبيهات الأسعار: بتفتح عادي مع شريط تنبيه — يتابع اللي عنده بس)
   - ✅ / 🔒 تحت كل باقة في «الباقات والأسعار» + كارت «مميزات باقتك» في الرئيسية وحسابي
   - لوحة التحكم ← إدارة الباقات: قائمة منسدلة بالمميزات قدام كل باقة + إضافة ميزة / شاشة جديدة + إعدادات الباقة المجانية
   ===================================================================== */
(function(){
  const E = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  let PK = null;   // {phase, keys, plan, planName, daysLeft, freeLeft, fullDays, catalog}

  /* الشاشة ← الميزة: '!' = تتقفل كاملة، من غيرها = تفتح بشريط تنبيه، 'a|b' = تكفي واحدة منهم */
  const PK_SCREENS = {
    renderPlansList: 'dca', renderPlanDetail: 'dca', renderNewPlanForm: 'dca!', renderEditPlanSettings: 'dca!',
    renderGridPlansList: 'grid', renderGridPlanDetail: 'grid', renderGridPlanForm: 'grid!', renderGridEditPlanSettings: 'grid!',
    renderPortfolio: 'portfolio!', renderTradesReportPage: 'portfolio!', renderOpportunities: 'opps!',
    renderBasira: 'basira|basira_scan', renderDiversificationReport: 'mizan!', renderMizanAi: 'mizanai!',
    renderRecommendationsCustomerPage: 'recs_short|recs_long', renderScreener: 'screener!',
    renderAlertsPage: 'alerts', renderWatchlistPage: 'watchlist',
  };
  // شاشات المشترك اللي ممكن الأدمن يربطها بميزة جديدة
  const PK_LINKABLE = [['', '— ميزة نصية بس (من غير شاشة) —'], ['renderPortfolio', 'المحفظة والتقارير'], ['renderTradesReportPage', 'تقرير صفقاتي'], ['renderScreener', 'كشاف الأسهم'],
    ['renderStockPage', 'صفحة السهم'], ['renderWatchlistPage', 'قائمة المتابعة'], ['renderAlertsPage', 'تنبيهات الأسعار'], ['renderReferralPage', 'ادعُ صديقك'], ['renderTrashPage', 'سلة المحذوفات'],
    ['renderMySubscriptionHistory', 'سجل اشتراكي'], ['renderArticlesListPage', 'المقالات'], ['renderTestimonialsPage', 'آراء العملاء'], ['renderSuggestionsPage', 'المقترحات'],
    ['renderOpportunities', 'فرصة'], ['renderBasira', 'بصيرة AI'], ['renderDiversificationReport', 'ميزان محفظتك AI'], ['renderMizanAi', 'ميزان GRIFFINE AI'],
    ['renderRecommendationsCustomerPage', 'التوصيات'], ['renderPlansList', 'خطط الداك'], ['renderGridPlansList', 'خطط الجريد']];

  const isAdm = () => !!window.__isAdmin;
  const active = () => PK && !isAdm() && PK.phase !== 'admin' && PK.phase !== 'none';
  window.gPerk = (k) => { if (isAdm() || !PK || PK.phase === 'admin') return true; return (PK.keys || []).includes(k); };
  window.gPerkState = () => PK;
  const catalog = () => (PK && PK.catalog) || [];
  const label = (k) => { const c = catalog().find(x => x.k === k); return c ? c.l : k; };
  const ic = (k) => { const c = catalog().find(x => x.k === k); return c ? c.ic : '•'; };

  window.gPerksLoad = async function(){
    try { const r = await apiGet('/perks_api.php?action=me'); PK = r && r.success ? r : null; } catch(e){ PK = null; }
    return PK;
  };

  // الشاشة دي محتاجة إيه؟ ← {keys:[...], any, hard} أو null
  function need(name){
    let spec = PK_SCREENS[name] || '';
    const cust = catalog().filter(c => c.custom && c.screen === name).map(c => c.k);
    if (!spec && !cust.length) return null;
    const hard = /!$/.test(spec) || (!spec && cust.length > 0); spec = spec.replace('!', '');
    return { keys: spec ? spec.split('|') : [], any: spec.includes('|'), hard, cust };
  }
  function allowed(n){
    if (n.cust.some(k => !gPerk(k))) return false;
    if (!n.keys.length) return true;
    return n.any ? n.keys.some(gPerk) : n.keys.every(gPerk);
  }

  /* ---- شاشة «الميزة مش ضمن باقتك» (فيها pushNav عشان الهيكل يتعامل معاها كشاشة عادية) */
  window.renderPerkLocked = async function(k, from){
    const __tok = screenToken();
    pushNav(() => renderPerkLocked(k, from));
    const res = await getPlansList().catch(() => null);
    const plans = (res && res.success ? res.plans : []).filter(p => (p.perks || []).includes(k));
    window.__lastPageKey = 'perk_locked'; if (screenStale(__tok)) return;
    app.innerHTML = `<div class="container"><div class="section-card pk-lock">
      <div class="pk-lock-ic">🔒</div>
      <h2>${E(ic(k))} ${E(label(k))}</h2>
      <p>الميزة دي <b>مش ضمن باقتك الحالية</b>${PK && PK.planName ? ` (<b>${E(PK.planName)}</b>)` : ''}.</p>
      ${plans.length ? `<p class="u-fs13">متاحة في: ${plans.map(p => `<span class="pk-chip">${E(p.name)}</span>`).join(' ')}</p>` : ''}
      <div class="pk-lock-btns"><button type="button" class="pk-cta" id="pkGoPlans">💎 الباقات والأسعار</button><button type="button" class="secondary" id="pkGoMine">مميزات باقتي</button></div>
    </div>${pkMineHtml()}</div>`;
    document.getElementById('pkGoPlans').onclick = () => renderSubscriptionPlans();
    document.getElementById('pkGoMine').onclick = () => { const m = document.getElementById('pkMine'); if (m) m.scrollIntoView({ behavior: 'smooth' }); };
  };

  // شريط التنبيه فوق الشاشات اللي بتفتح (يتابع اللي عنده بس)
  function banner(k){
    const c = document.querySelector('#app .container'); if (!c || c.querySelector('.pk-banner')) return;
    const d = document.createElement('div'); d.className = 'pk-banner';
    d.innerHTML = `<span>🔒 «${E(label(k))}» مش ضمن باقتك الحالية — تقدر تتابع اللي عندك بس، ومش هتقدر تضيف جديد.</span><button type="button" class="pk-cta small">💎 ترقية الباقة</button>`;
    d.querySelector('button').onclick = () => renderSubscriptionPlans();
    c.insertBefore(d, c.firstElementChild && c.firstElementChild.classList.contains('gs-page-title') ? c.firstElementChild.nextSibling : c.firstChild);
  }
  const later = (fn) => { let n = 0; const t = () => { if (fn() || ++n > 12) return; setTimeout(t, 250); }; setTimeout(t, 60); };

  function wrapAll(){
    const names = new Set([...Object.keys(PK_SCREENS), ...PK_LINKABLE.map(x => x[0]).filter(Boolean)]);
    names.forEach(name => {
      const orig = window[name]; if (typeof orig !== 'function' || orig.__pk) return;
      const w = function(){
        const n = need(name);
        if (!n || !active() || allowed(n)) {
          const r = orig.apply(this, arguments);
          if (n && active() && n.any && n.keys.some(k => !gPerk(k))) Promise.resolve(r).then(() => later(() => partial(name, n)));
          return r;
        }
        if (!n.hard && !n.any && !n.cust.some(k => !gPerk(k))) { const r = orig.apply(this, arguments); Promise.resolve(r).then(() => later(() => { banner(n.keys.find(k => !gPerk(k))); return !!document.querySelector('.pk-banner'); })); return r; }
        return renderPerkLocked(n.cust.find(k => !gPerk(k)) || n.keys.find(k => !gPerk(k)) || n.keys[0], name);
      };
      w.__pk = true; w.__gsWrapped = true; window[name] = w;
    });
  }
  // شاشة فيها جزءين وواحد بس مقفول (بصيرة: تحليل سهم / مسح السوق — التوصيات: قصيرة / طويلة)
  function partial(name, n){
    const miss = n.keys.filter(k => !gPerk(k));
    if (name === 'renderBasira') {
      const sc = document.getElementById('bsTabScan'), one = document.getElementById('bsTabOne'); if (!sc || !one) return false;
      const lock = (b, k) => { if (b.__pk) return; b.__pk = 1; b.insertAdjacentHTML('beforeend', ' 🔒'); b.onclick = (e) => { e.preventDefault(); e.stopImmediatePropagation(); renderPerkLocked(k, name); }; };
      if (miss.includes('basira_scan')) lock(sc, 'basira_scan');
      if (miss.includes('basira')) { sc.click(); lock(one, 'basira'); }
      return true;
    }
    banner(miss[0]); return !!document.querySelector('.pk-banner');
  }

  /* ---- «مميزات باقتك»: الشغال ✅ والواقف 🔒 */
  function phaseLine(){
    if (!PK) return '';
    if (PK.phase === 'full') return `🎁 <b>فترة التعرّف:</b> كل مميزات الموقع مفتوحة لك — باقي <b>${PK.daysLeft}</b> يوم، وبعدها ${PK.freeLeft != null ? `<b>${Math.max(0, PK.freeLeft - PK.daysLeft)}</b> يوم ` : ''}بمميزات الباقة المجانية.`;
    if (PK.phase === 'basic') return `🆓 <b>الباقة المجانية:</b> باقي <b>${PK.daysLeft}</b> يوم — اشترك عشان تفتح باقي المميزات.`;
    if (PK.phase === 'paid') return `💎 <b>${E(PK.planName)}</b>${PK.daysLeft != null ? ` — باقي ${PK.daysLeft} يوم` : ''}`;
    if (PK.phase === 'none') return `⌛ مفيش باقة شغالة دلوقتي — اختار باقتك عشان تفتح المميزات.`;
    return '';
  }
  function pkMineHtml(){
    if (!PK || PK.phase === 'admin') return '';
    const on = catalog().filter(c => gPerk(c.k)), off = catalog().filter(c => !gPerk(c.k));
    return `<div class="section-card pk-mine" id="pkMine"><div class="pk-mine-h">⭐ مميزات باقتك${PK.planName ? ` — ${E(PK.planName)}` : ''}</div>
      <div class="pk-phase">${phaseLine()}</div>
      <div class="pk-grid">${on.map(c => `<div class="pk-it on">✅ ${E(c.l)}</div>`).join('')}${off.map(c => `<div class="pk-it off">🔒 ${E(c.l)}</div>`).join('')}</div>
      <button type="button" class="pk-cta u-mt10" data-pk-plans>💎 الباقات والأسعار</button></div>`;
  }
  window.pkMineHtml = pkMineHtml;
  // كارت الرئيسية (فترة التعرّف / الباقة المجانية)
  window.pkHomeCardHtml = function(){
    if (!PK || (PK.phase !== 'full' && PK.phase !== 'basic')) return '';
    const off = catalog().filter(c => !gPerk(c.k)).length, on = catalog().length - off;
    return `<div class="section-card pk-home ${PK.phase}"><div class="pk-phase">${phaseLine()}</div>
      <div class="u-fs12 u-mt8">${on} ميزة شغالة${off ? ` • ${off} واقفة 🔒` : ''}</div>
      <div class="pk-lock-btns"><button type="button" class="pk-cta small" data-pk-plans>💎 الباقات والأسعار</button><button type="button" class="secondary small" data-pk-mine>مميزات باقتي</button></div></div>`;
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-pk-plans]')) { e.preventDefault(); renderSubscriptionPlans(); }
    else if (e.target.closest('[data-pk-mine]')) { e.preventDefault(); renderPerkMine(); }
  });
  window.renderPerkMine = async function(){
    const __tok = screenToken();
    pushNav(() => renderPerkMine());
    await gPerksLoad();
    window.__lastPageKey = 'perk_mine'; if (screenStale(__tok)) return;
    app.innerHTML = `<div class="container">${pkMineHtml() || '<div class="section-card">حسابك حساب إدارة — كل المميزات مفتوحة.</div>'}</div>`;
  };

  // ✅ / 🔒 تحت كل باقة (بيتنادى من شاشة الباقات)
  window.pkPlanPerksHtml = function(p, cat){
    if (!p || !Array.isArray(p.perks) || !(cat || []).length) return '';
    const has = cat.filter(c => p.perks.includes(c.k)), no = cat.filter(c => !p.perks.includes(c.k));
    return `<div class="pk-plan"><div class="pk-plan-h">مميزات الباقة</div>
      ${p.isFree && (window.__pkFullDays || 0) > 0 ? `<div class="pk-plan-note">🎁 أول ${window.__pkFullDays} يوم: كل المميزات مفتوحة</div>` : ''}
      <ul>${has.map(c => `<li class="on">✅ ${E(c.l)}</li>`).join('')}${no.map(c => `<li class="off">🔒 ${E(c.l)}</li>`).join('')}</ul></div>`;
  };

  /* ---- لوحة التحكم: مميزات الباقات (بيتنادى بعد رسم جدول الباقات) */
  let ADM = null;
  async function admLoad(){ const r = await apiGet('/perks_api.php?action=admin').catch(() => null); ADM = r && r.success ? r : null; return r; }
  window.pkAdminDecorate = async function(wrap, plansShown){
    if (!wrap || !hasPermissionSafe('manage_plans')) return;
    const r = await admLoad();
    let top = document.getElementById('pkAdmTop');
    if (!top) { top = document.createElement('div'); top.id = 'pkAdmTop'; wrap.parentNode.insertBefore(top, wrap); }
    if (!ADM) { top.innerHTML = `<div class="section-card u-note">⭐ مميزات الباقات: ${E((r && r.message) || 'تعذّر التحميل')}</div>`; return; }
    const cat = ADM.catalog, pl = ADM.plans;
    top.innerHTML = `<div class="section-card pk-adm">
      <div class="pk-mine-h">⭐ مميزات كل باقة</div>
      <div class="u-fs12 u-muted">اضغط على «المميزات» قدام أي باقة، علّم على اللي فيها واحفظ — ده بيبقى الافتراضي بتاعها. اللي مش متعلّم عليه بيتقفل عند مشتركينها 🔒 ويظهر تحت الباقة.</div>
      <div class="pk-adm-free">
        <b>🆓 الباقة المجانية (${E((pl.find(p => p.isFree) || {}).name || 'trial')}):</b>
        أول <input type="number" id="pkFullDays" min="0" max="365" value="${ADM.fullDays}" class="pk-num"> يوم كل المميزات مفتوحة (فترة التعرّف)، وباقي مدة الباقة (${(pl.find(p => p.isFree) || {}).durationDays || 30} يوم إجمالي) بمميزاتها المتعلّم عليها.
        <label class="u-check"><input type="checkbox" id="pkFullAi" ${ADM.fullAi ? 'checked' : ''}> فترة التعرّف تشمل «الذكاء الاصطناعي المتقدم» (بيستهلك رصيد)</label>
        <button type="button" class="small u-wa" id="pkSaveCfg">حفظ</button>
      </div>
      <details class="pk-adm-add"><summary>➕ إضافة ميزة أو شاشة جديدة للباقات</summary>
        <div class="pk-adm-row"><input type="text" id="pkNewL" maxlength="120" placeholder="اسم الميزة (مثلًا: أولوية في الدعم الفني)">
          <select id="pkNewS">${PK_LINKABLE.map(([v, l]) => `<option value="${v}">${E(l)}</option>`).join('')}</select>
          <button type="button" class="small u-wa" id="pkAdd">إضافة</button></div>
        ${cat.filter(c => c.custom).length ? `<div class="pk-adm-cust">${cat.filter(c => c.custom).map(c => `<span class="pk-chip">${E(c.l)}${c.screen ? ` <small>(${E((PK_LINKABLE.find(x => x[0] === c.screen) || [0, c.screen])[1])})</small>` : ''} <button type="button" class="pk-x" data-pkdel="${E(c.k)}" title="حذف">✕</button></span>`).join('')}</div>` : ''}
      </details></div>`;
    document.getElementById('pkSaveCfg').onclick = async () => { const x = await apiPost('/perks_api.php', { action: 'save_cfg', fullDays: document.getElementById('pkFullDays').value, fullAi: document.getElementById('pkFullAi').checked ? '1' : '0' }).catch(() => null); alert((x && x.message) || 'تعذّر الحفظ'); };
    document.getElementById('pkAdd').onclick = async () => { const x = await apiPost('/perks_api.php', { action: 'add_custom', label: document.getElementById('pkNewL').value, screen: document.getElementById('pkNewS').value }).catch(() => null); alert((x && x.message) || 'تعذّر'); if (x && x.success) pkAdminDecorate(wrap, plansShown); };
    top.querySelectorAll('[data-pkdel]').forEach(b => b.onclick = async () => { if (!await gConfirm('حذف الميزة دي من كل الباقات؟', { ok: 'حذف', danger: true })) return; const x = await apiPost('/perks_api.php', { action: 'del_custom', k: b.dataset.pkdel }).catch(() => null); if (x && x.success) pkAdminDecorate(wrap, plansShown); });
    // القائمة المنسدلة قدام كل باقة
    wrap.querySelectorAll('[data-pkplan]').forEach(td => {
      const p = pl.find(x => x.id === td.dataset.pkplan); if (!p) { td.textContent = '—'; return; }
      td.innerHTML = `<details class="pk-dd"><summary>⭐ المميزات <b>${p.keys.length}/${cat.length}</b>${p.isDefault ? ' <small>(افتراضي)</small>' : ''}</summary>
        <div class="pk-dd-box">
          <div class="pk-dd-tools"><button type="button" class="small secondary u-wa" data-pkall="1">اختيار الكل</button><button type="button" class="small secondary u-wa" data-pkall="0">إلغاء الكل</button></div>
          ${cat.map(c => `<label class="pk-dd-it"><input type="checkbox" value="${E(c.k)}" ${p.keys.includes(c.k) ? 'checked' : ''}> ${E(c.ic)} ${E(c.l)}</label>`).join('')}
          <div class="pk-dd-tools"><button type="button" class="small u-wa" data-pksave>💾 حفظ مميزات الباقة</button>${!p.isDefault ? '<button type="button" class="small secondary u-wa" data-pkreset>↩ الاختيارات الأصلية</button>' : ''}</div>
        </div></details>`;
      td.querySelectorAll('[data-pkall]').forEach(b => b.onclick = () => td.querySelectorAll('.pk-dd-it input').forEach(i => { i.checked = b.dataset.pkall === '1'; }));
      td.querySelector('[data-pksave]').onclick = async () => {
        const keys = [...td.querySelectorAll('.pk-dd-it input:checked')].map(i => i.value);
        const x = await apiPost('/perks_api.php', { action: 'save_plan', planId: p.id, keys: JSON.stringify(keys) }).catch(() => null);
        alert((x && x.message) || 'تعذّر الحفظ'); if (x && x.success) pkAdminDecorate(wrap, plansShown);
      };
      const rs = td.querySelector('[data-pkreset]');
      if (rs) rs.onclick = async () => { const x = await apiPost('/perks_api.php', { action: 'reset_plan', planId: p.id }).catch(() => null); alert((x && x.message) || 'تعذّر'); if (x && x.success) pkAdminDecorate(wrap, plansShown); };
    });
  };
  function hasPermissionSafe(p){ try { return !!window.__isSuperAdmin || (typeof hasPermission === 'function' && hasPermission(p)); } catch(e){ return false; } }

  // اللف بعد ما الهيكل يلف دوال الشاشات (GShell.init)
  const hook = () => {
    if (window.GShell && typeof GShell.init === 'function' && !GShell.init.__pk) {
      const oi = GShell.init; GShell.init = function(){ const r = oi.apply(this, arguments); wrapAll(); return r; }; GShell.init.__pk = true;
      if (GShell.enabled) wrapAll();
    } else wrapAll();
  };
  hook();
})();
