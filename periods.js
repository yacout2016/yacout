/* =====================================================================
   GRIFFINE — periods.js (الإصدار 144) — التحكم في قوائم المدد في كل الموقع
   ---------------------------------------------------------------------
   كل قائمة مدة (يوم / أسبوع / شهر …) ليها اسم ثابت هنا (REG) ومكانها في الموقع.
   الأدمن بيشوف جنب كل قائمة زرار ⚙ ← يشيل أي اختيار (يتمسح عند الكل) أو يغيّر الافتراضي.
   وكمان كلهم في صفحة واحدة: لوحة التحكم ← «🛠 الشاشة الرئيسية والقوائم المنسدلة (مدد البحث)» (كروت الرئيسية + كل القوائم) (renderAdminPeriods).
   التخزين: periods_api.php ← site_config.periods_cfg = { id: { h:[المخفي], d:'الافتراضي' } }

   الاستخدام في أي شاشة:
     gPerDef(id)                    ← الافتراضي (من الاختيارات الظاهرة)
     gPerFilter(id, arr, keyFn)     ← الاختيارات الظاهرة (الأدمن بيشوف الكل)
     gPerOpts(id, arr, sel)         ← <option> جاهزة (المخفي مكتوب جنبه «مخفي» عند الأدمن بس)
     gPerGear(id) + gPerWire(root, onSaved)  ← زرار ⚙ للأدمن
   ===================================================================== */
(function(){
  'use strict';
  const HZ6 = [['day', 'يوم'], ['week', 'أسبوع'], ['month', 'شهر'], ['3m', '3 شهور'], ['6m', '6 شهور'], ['year', 'سنة']];
  const REG = {
    home_curve: { scr: 'الرئيسية', go: 'renderHome', l: 'مدة منحنى أداء المحفظة', d: '1d',
      o: [['1d', 'يوم'], ['1w', 'أسبوع'], ['1m', 'شهر'], ['3m', '3 شهور'], ['6m', '6 شهور'], ['1y', 'سنة'], ['all', 'الكل']] },
    bs_chart: { scr: 'بصيرة AI — تحليل السهم', go: 'renderBasira', l: 'مدة الرسم البياني', d: 'd',
      o: [['d', 'يوم'], ['5', 'أسبوع'], ['22', 'شهر'], ['66', '3 شهور'], ['132', '6 شهور'], ['260', 'سنة']] },
    bs_hz: { scr: 'بصيرة AI — تحليل السهم', go: 'renderBasira', l: 'فترات التوقع (الكروت)', multi: true, o: HZ6 },
    bs_scan: { scr: 'بصيرة AI — مسح السوق', go: 'renderBasira', l: 'مدة البحث (الأسهم المتوقع صعودها خلال)', d: 'day', o: HZ6 },
    rc_scan: { scr: 'التوصيات — مسح السوق (دوّر على فرصة)', go: 'renderRecommendationsAdminPage', l: 'المتوقع خلال', d: 'week', o: HZ6, note: 'لو مدة التوصية نفسها ظاهرة بتتختار هي، وإلا الافتراضي' },
    opps_tf: { scr: 'البحث عن فرص', go: 'renderOpportunities', l: 'الإطار الزمني', d: '1d',
      o: [['1d', 'يومي'], ['1wk', 'أسبوعي'], ['1mo', 'شهري'], ['4h', '4 ساعات'], ['1h', 'ساعة']] },
    scr_hl: { scr: 'كشاف الأسهم', go: 'renderScreener', l: 'فترة أعلى وأقل سعر', d: 'month',
      o: [['day', 'يوم'], ['week', 'أسبوع'], ['month', 'شهر'], ['2months', 'شهرين'], ['3months', '3 شهور'], ['6months', '6 شهور'], ['year', 'سنة']] },
    grid_rng: { scr: 'خطة Grid جديدة', go: 'renderGridPlanForm', l: 'فترة النطاق التلقائي (أعلى / أقل سعر)', d: 'month',
      o: [['day', 'يومي'], ['week', 'أسبوعي'], ['month', 'شهري'], ['3months', '3 شهور'], ['6months', '6 شهور'], ['year', 'سنة']] },
    mza_s: { scr: 'ميزان GRIFFINE AI — توزيع على القطاعات', go: 'renderMizanAi', l: 'مدة الاستثمار', d: '12',
      o: [['3', '3 شهور'], ['6', '6 شهور'], ['12', 'سنة'], ['36', '3 سنين']] },
    mza_a: { scr: 'ميزان GRIFFINE AI — توزيع شامل للأصول', go: 'renderMizanAi', l: 'المدة', d: '12',
      o: [['1', 'شهر'], ['6', '6 شهور'], ['12', 'سنة'], ['36', '3 سنين'], ['60', '5 سنين']] },
    lp_hero: { scr: 'صفحة الموقع العامة (قبل الدخول)', go: 'renderLanding', l: 'رسم المحفظة التوضيحي', d: '2',
      o: [['2', 'يوم'], ['7', 'أسبوع'], ['30', 'شهر'], ['90', '3 شهور'], ['250', 'سنة']] },
    lp_mk: { scr: 'صفحة الموقع العامة (قبل الدخول)', go: 'renderLanding', l: 'رسم حركة السوق', d: '2',
      o: [['2', 'يوم'], ['7', 'أسبوع'], ['30', 'شهر'], ['90', '3 شهور'], ['180', '6 شهور'], ['260', 'سنة']] },
  };
  window.G_PERIODS = REG;

  const KEY = 'g_periods_v1';
  let CFG = {}; try { CFG = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch(e){ CFG = {}; }
  let P = null;
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const setCfg = (c) => { CFG = (c && typeof c === 'object') ? c : {}; try { localStorage.setItem(KEY, JSON.stringify(CFG)); } catch(e){} };
  window.gPerLoad = function(force){
    if (force || !P) P = fetch('periods_api.php?action=get', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json())
      .then(j => { if (j && j.success) setCfg(j.cfg); return CFG; }).catch(() => CFG);
    return P;
  };
  const isAdm = () => !!window.__isAdmin && (typeof hasPermission !== 'function' || hasPermission('manage_admin_settings'));
  const keys = (id) => (REG[id] ? REG[id].o.map(x => String(x[0])) : []);
  const hid = (id) => { const c = CFG[id]; return c && Array.isArray(c.h) ? c.h.map(String) : []; };
  const vis = (id) => { const h = hid(id); const v = keys(id).filter(k => !h.includes(k)); return v.length ? v : keys(id); };
  window.gPerVisible = vis;
  window.gPerIsHidden = (id, k) => !vis(id).includes(String(k));
  window.gPerDef = function(id){
    const r = REG[id]; if (!r) return ''; const v = vis(id), c = CFG[id];
    let d = c && c.d ? String(c.d) : String(r.d || '');
    if (!v.includes(d)) d = v.includes(String(r.d)) ? String(r.d) : v[0];
    return d;
  };
  window.gPerFilter = function(id, arr, kf){
    kf = kf || (x => x[0]); if (!REG[id] || isAdm()) return arr;
    const v = vis(id); const out = arr.filter(x => !keys(id).includes(String(kf(x))) || v.includes(String(kf(x))));
    return out.length ? out : arr;
  };
  window.gPerOpts = function(id, arr, sel, kf, lf){
    kf = kf || (x => x[0]); lf = lf || (x => x[1]);
    return gPerFilter(id, arr, kf).map(x => { const k = String(kf(x)); return `<option value="${E(k)}" ${k === String(sel) ? 'selected' : ''}>${E(lf(x))}${isAdm() && gPerIsHidden(id, k) ? ' (مخفي)' : ''}</option>`; }).join('');
  };
  window.gPerGear = (id) => (isAdm() && REG[id]) ? `<button type="button" class="gper-gear" data-gper="${id}" title="التحكم في هذه القائمة (للأدمن): إخفاء اختيارات + الافتراضي" aria-label="التحكم في القائمة">⚙</button>` : '';
  window.gPerWire = function(root, onSaved){
    (root || document).querySelectorAll('[data-gper]').forEach(b => {
      if (b.__gw) return; b.__gw = 1;
      b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); gPerEdit(b.dataset.gper, onSaved); });
    });
  };
  const toast = (m, t) => { if (window.GShell && GShell.toast) GShell.toast(m, t); else if (typeof showToast === 'function') showToast(m); };

  // لوح التعديل: علامة ✓ قدام كل اختيار (الشيل = يختفي عند الكل) + الافتراضي
  window.gPerEdit = function(id, onSaved){
    const r = REG[id]; if (!r || !isAdm()) return;
    const old = document.getElementById('gperOv'); if (old) old.remove();
    const h = hid(id), d0 = gPerDef(id);
    const ov = document.createElement('div'); ov.id = 'gperOv'; ov.className = 'gper-ov';
    ov.innerHTML = `<div class="gper-dlg" role="dialog" aria-label="التحكم في القائمة">
      <div class="gper-head"><div><b>⏱ ${E(r.l)}</b><small>${E(r.scr)}</small></div><button type="button" class="gper-x" data-x aria-label="إغلاق">✕</button></div>
      <div class="gper-sub">علّم الاختيارات اللي تظهر للمستخدمين — اللي تشيل علامته يتمسح من القائمة عند الكل.</div>
      <div class="gper-list">${r.o.map(([k, l]) => `<label class="gper-it"><input type="checkbox" value="${E(k)}" ${h.includes(String(k)) ? '' : 'checked'}><span>${E(l)}</span>${h.includes(String(k)) ? '<em>مخفي</em>' : ''}</label>`).join('')}</div>
      ${r.multi ? '' : `<label class="gper-def">الافتراضي (بيفتح عليه الكل)<select id="gperDef"></select></label>`}
      ${r.note ? `<div class="gper-sub">${E(r.note)}</div>` : ''}
      <div class="gper-msg" id="gperMsg"></div>
      <div class="gper-btns"><button type="button" class="gper-save" id="gperSave">💾 حفظ للكل</button><button type="button" class="secondary small" id="gperReset">↩ رجوع للأصل</button><button type="button" class="secondary small" data-x>إلغاء</button></div>
    </div>`;
    document.body.appendChild(ov);
    const q = (s) => ov.querySelector(s), boxes = [...ov.querySelectorAll('.gper-it input')];
    const fillDef = () => {
      const sel = q('#gperDef'); if (!sel) return; const cur = sel.value || d0;
      const on = r.o.filter(([k]) => boxes.find(b => b.value === String(k)).checked);
      sel.innerHTML = on.map(([k, l]) => `<option value="${E(k)}">${E(l)}</option>`).join('');
      sel.value = on.some(([k]) => String(k) === cur) ? cur : (on[0] ? String(on[0][0]) : '');
    };
    fillDef();
    boxes.forEach(b => b.onchange = () => {
      if (!boxes.some(x => x.checked)) { b.checked = true; q('#gperMsg').textContent = '⚠️ لازم يفضل اختيار واحد على الأقل ظاهر.'; return; }
      q('#gperMsg').textContent = ''; fillDef();
    });
    const close = () => ov.remove();
    ov.querySelectorAll('[data-x]').forEach(b => b.onclick = close);
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    const done = (j) => {
      if (!j || !j.success) { q('#gperMsg').textContent = (j && j.message) || 'تعذّر الحفظ.'; return; }
      setCfg(j.cfg); P = Promise.resolve(CFG); close(); toast(j.message || 'تم الحفظ', 'ok');
      if (typeof onSaved === 'function') { try { onSaved(id); } catch(e){} }
    };
    q('#gperSave').onclick = async () => {
      const hh = boxes.filter(b => !b.checked).map(b => b.value), dd = q('#gperDef') ? q('#gperDef').value : '';
      q('#gperSave').disabled = true;
      try { done(await apiPost('/periods_api.php', { action: 'save', id, h: JSON.stringify(hh), d: dd })); } catch(e){ q('#gperMsg').textContent = 'تعذّر الاتصال بالسيرفر.'; }
      q('#gperSave').disabled = false;
    };
    q('#gperReset').onclick = async () => { try { done(await apiPost('/periods_api.php', { action: 'reset', id })); } catch(e){} };
  };

  // صفحة لوحة التحكم: كل القوائم في كل الشاشات في مكان واحد
  window.renderAdminPeriods = async function(){
    const tok = typeof screenToken === 'function' ? screenToken() : 0;
    pushNav(() => renderAdminPeriods());
    const email = await getSession(); if (!email) return renderLogin();
    if (!window.__isAdmin) return renderHome();
    const [, HS] = await Promise.all([gPerLoad(true), typeof getAdminSettings === 'function' ? getAdminSettings().catch(() => ({})) : {}]);
    if (typeof screenStale === 'function' && screenStale(tok)) return;
    // الإصدار 144: كروت الشاشة الرئيسية (إخفاء / إظهار للكل) في نفس الصفحة
    const HOME = [['hide_home_hero', 'قيمة المحفظة'], ['hide_curve_home', 'منحنى أداء المحفظة'], ['hide_home_alerts', 'تنبيهات الأسعار'], ['hide_home_quick', 'الاختصارات'], ['hide_home_recs', 'أحدث التوصيات'], ['hide_home_holdings', 'استثماراتي']];
    const homeHtml = `<div class="section-card gper-grp" id="gperHome"><div class="section-title">🏠 كروت الشاشة الرئيسية</div>
      <div class="gper-sub">دوسة على الكارت تخفيه عن كل العملاء (إنت بتفضل شايفه باهت في الرئيسية ومكتوب «مخفي»)، ودوسة تانية ترجّعه.</div>
      ${HOME.map(([k, l]) => { const off = HS && HS[k] === true; return `<div class="gper-row"><div class="gper-row-t"><b>${E(l)}</b><small>${off ? '<span class="gper-hid">🙈 مخفي عن العملاء</span>' : '👁 ظاهر للكل'}</small></div>
        <span class="gper-row-b"><button type="button" class="small ${off ? '' : 'secondary'}" data-hk="${k}" data-off="${off ? 1 : 0}">${off ? '👁 إظهار' : '🙈 إخفاء'}</button></span></div>`; }).join('')}
      <div class="gper-row"><span class="gper-row-b"><button type="button" class="secondary small" id="gperGoHome">↗ افتح الشاشة الرئيسية</button></span></div></div>`;
    const groups = {};
    Object.keys(REG).forEach(id => { (groups[REG[id].scr] = groups[REG[id].scr] || []).push(id); });
    const row = (id) => {
      const r = REG[id], v = vis(id), hh = r.o.filter(([k]) => !v.includes(String(k)));
      const lbl = (k) => (r.o.find(x => String(x[0]) === String(k)) || [0, k])[1];
      return `<div class="gper-row"><div class="gper-row-t"><b>${E(r.l)}</b>
        <small>${r.multi ? '' : `الافتراضي: <b>${E(lbl(gPerDef(id)))}</b> · `}ظاهر: ${v.length} من ${r.o.length}${hh.length ? ` · <span class="gper-hid">مخفي: ${hh.map(x => E(x[1])).join('، ')}</span>` : ''}</small></div>
        <span class="gper-row-b">${isAdm() ? `<button type="button" class="small" data-ed="${id}">⚙ تعديل</button>` : ''}${typeof window[r.go] === 'function' ? `<button type="button" class="secondary small" data-open="${r.go}">↗ الشاشة</button>` : ''}</span></div>`;
    };
    app.innerHTML = `<div class="container">${typeof logoHeader === 'function' ? logoHeader() : ''}
      <div class="topbar"><div>${typeof pageTitle === 'function' ? pageTitle('admin_periods', '🏠 الشاشة الرئيسية والقوائم المنسدلة (مدد البحث)') : '<h1>🏠 الشاشة الرئيسية والقوائم المنسدلة</h1>'}</div>
        <button class="secondary small" id="gperBack">🛡️ رجوع للوحة التحكم</button></div>
      ${homeHtml}
      <h2 class="u-mt20">⏱ القوائم المنسدلة — مدد البحث والرسم في كل شاشة</h2>
      <div class="info">كل قوائم المدة في الموقع (يوم / أسبوع / شهر …) لكل شاشة لوحدها. «⚙ تعديل» ← شيل أي اختيار يتمسح من عند الكل، أو غيّر الافتراضي اللي بيفتح عليه الكل. نفس الزرار ⚙ موجود جنب القائمة جوه كل شاشة (بيظهر لك إنت بس).</div>
      ${Object.keys(groups).map(g => `<div class="section-card gper-grp"><div class="section-title">${E(g)}</div>${groups[g].map(row).join('')}</div>`).join('')}
    </div>`;
    document.getElementById('gperBack').onclick = () => (typeof renderAdminHub === 'function' ? renderAdminHub() : renderHome());
    app.querySelectorAll('[data-hk]').forEach(b => b.onclick = async () => {
      b.disabled = true;
      const r = await apiPost('/admin_settings_save.php', { key: b.dataset.hk, value: b.dataset.off === '1' ? 0 : 1 }).catch(() => null);
      if (r && r.success) { toast(b.dataset.off === '1' ? '👁 رجع يظهر للعملاء' : '🙈 اتخفى عن العملاء', 'ok'); renderAdminPeriods(); }
      else { b.disabled = false; toast((r && r.message) || 'تعذّر الحفظ', 'err'); }
    });
    document.getElementById('gperGoHome').onclick = () => renderHome();
    app.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => gPerEdit(b.dataset.ed, () => renderAdminPeriods()));
    app.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { try { window[b.dataset.open](); } catch(e){} });
  };

  gPerLoad();
})();
