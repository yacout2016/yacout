/* =====================================================================
   GRIFFINE — promo.js (الإصدار 100)
   ---------------------------------------------------------------------
   01. لوحة التحكم ← 🚨 الشاشات الطارئة (صيانة / انقطاع النت / السيرفر / التحميل البطيء)
   02. لوحة التحكم ← 📣 الدعاية والعروض (Upsell / Downsell / بانر / إعلان منبثق / شريط متحرك)
   03. عرض الدعاية للعملاء حسب الجمهور والمدة والتكرار
   الإعدادات في site_config (emergency_cfg / maint_on / ads_cfg) ← site_config_admin.php ، والعرض من site_public_config.php
   ===================================================================== */

/* ---------------------------------------------------------------------
   01. الشاشات الطارئة
   --------------------------------------------------------------------- */
const EMG_KINDS = [
  { k: 'maint',   icon: '🛠️', name: 'وضع الصيانة', hint: 'لما تشغّله بيظهر لكل العملاء فورًا (خلال دقيقة) بدل الموقع، والإدارة والموظفين بيكمّلوا شغل عادي.' },
  { k: 'offline', icon: '📡', name: 'انقطاع الإنترنت عند المستخدم', hint: 'بتظهر تلقائي لما النت يقطع عند العميل وبتختفي أول ما يرجع.' },
  { k: 'down',    icon: '☁️', name: 'السيرفر مش بيرد', hint: 'بتظهر تلقائي لو السيرفر وقع، وبتحاول تتصل كل 10 ثواني وبتختفي لوحدها أول ما يرجع.' },
  { k: 'slow',    icon: '⏳', name: 'التحميل البطيء', hint: 'بتظهر لو التحميل أخد وقت أطول من الطبيعي: الشعار + عد تنازلي.' },
];
async function renderEmergencyAdminPage(){
  const __tok = screenToken();
  pushNav(() => renderEmergencyAdminPage());
  const email = await getSession();
  if (!email) return renderLogin();
  if (!window.__isAdmin) return renderHome();
  if (!hasPermission('manage_admin_settings')) return renderAdminHub();
  const r = await siteCfgAdminApi();
  if (screenStale(__tok)) return;
  const c = (r && r.config) || {};
  let saved = {}; try { saved = JSON.parse(c.emergency_cfg || '{}') || {}; } catch(e){}
  const D = (window.GEmergency && GEmergency.defaults) || {};
  const val = (k, f) => (saved[k] && saved[k][f] != null) ? saved[k][f] : (D[k] ? D[k][f] : '');
  const maintOn = c.maint_on === '1';
  window.__lastPageKey = 'emergency_admin';
  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>${pageTitle('emergency_admin', '🚨 الشاشات الطارئة')}</div><button class="secondary small" id="emgBack">🛡️ رجوع للوحة التحكم</button></div>
    <div class="info">رسائل خفيفة ومطمئنة بتظهر للعميل في الحالات الاستثنائية. تقدر تشغّل أو توقف كل شاشة وتعدّل عنوانها ونصها، وتشوف معاينة قبل الحفظ.</div>
    <div class="section-card emg-maint ${maintOn ? 'on' : ''}">
      <div class="u-row" style="justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div><b>🛠️ وضع الصيانة الآن</b><div class="u-fs12 u-muted">${maintOn ? '🔴 شغّال — العملاء شايفين شاشة الصيانة' : '🟢 متوقف — الموقع شغّال عادي'}</div></div>
        <button class="small ${maintOn ? '' : 'danger'} u-wa" id="emgMaintToggle">${maintOn ? '✅ إيقاف الصيانة وفتح الموقع' : '🛠️ تشغيل وضع الصيانة'}</button>
      </div>
    </div>
    ${EMG_KINDS.map(x => `<div class="section-card emg-card" data-k="${x.k}">
      <div class="u-row" style="justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <b>${x.icon} ${escapeHtml(x.name)}</b>
        ${x.k === 'maint' ? '' : `<label class="u-check"><input type="checkbox" class="emgOn" ${val(x.k, 'on') !== false ? 'checked' : ''}> مفعّلة</label>`}
      </div>
      <div class="u-fs12 u-muted u-mb8">${escapeHtml(x.hint)}</div>
      <label class="u-fs12">العنوان<input class="emgTitle" maxlength="80" value="${escapeHtml(val(x.k, 'title'))}"></label>
      <label class="u-fs12">المحتوى<textarea class="emgBody" rows="2" maxlength="400">${escapeHtml(val(x.k, 'body'))}</textarea></label>
      ${x.k === 'slow' ? `<div class="g-grid-filters">
        <label class="u-fs12">تظهر بعد (ثانية)<input type="number" class="emgAfter" min="1" max="30" value="${escapeHtml(val('slow', 'after'))}"></label>
        <label class="u-fs12">العد التنازلي من (ثانية)<input type="number" class="emgCount" min="3" max="120" value="${escapeHtml(val('slow', 'count'))}"></label>
        <label class="u-check u-fs12"><input type="checkbox" class="emgLogo" ${val('slow', 'logo') !== false ? 'checked' : ''}> إظهار الشعار</label>
      </div>` : ''}
      <button class="small secondary u-wa u-mt8 emgPrev">👁 معاينة 6 ثواني</button>
    </div>`).join('')}
    <button class="u-wa" id="emgSave">💾 حفظ الشاشات الطارئة</button> <span id="emgMsg" class="u-note"></span>
  </div>`;
  const collect = () => { const o = {};
    app.querySelectorAll('.emg-card').forEach(cd => { const k = cd.dataset.k, on = cd.querySelector('.emgOn');
      o[k] = { on: on ? on.checked : true, title: cd.querySelector('.emgTitle').value.trim(), body: cd.querySelector('.emgBody').value.trim() };
      if (k === 'slow') { o[k].after = +cd.querySelector('.emgAfter').value || 4; o[k].count = +cd.querySelector('.emgCount').value || 10; o[k].logo = cd.querySelector('.emgLogo').checked; } });
    return o; };
  document.getElementById('emgBack').onclick = () => goAdminHome();
  app.querySelectorAll('.emgPrev').forEach(b => b.onclick = () => {
    if (!window.GEmergency) return;
    const k = b.closest('.emg-card').dataset.k, cfg = collect(), keep = JSON.stringify(GEmergency.config);
    try { localStorage.setItem('gs_emg_cfg_v1', JSON.stringify(cfg)); } catch(e){}
    GEmergency.refreshLocal && GEmergency.refreshLocal(cfg);
    GEmergency.preview(k, 6000);
    setTimeout(() => { try { localStorage.setItem('gs_emg_cfg_v1', keep); } catch(e){} GEmergency.refreshLocal && GEmergency.refreshLocal(JSON.parse(keep)); }, 6200);
  });
  document.getElementById('emgSave').onclick = async () => {
    const x = await siteCfgAdminApi({ action: 'save', emergency_cfg: JSON.stringify(collect()) });
    document.getElementById('emgMsg').textContent = x && x.success ? 'تم الحفظ ✓ — بيوصل للعملاء خلال دقيقة.' : ((x && x.message) || 'تعذّر الحفظ');
    if (window.GEmergency) GEmergency.refresh();
  };
  document.getElementById('emgMaintToggle').onclick = async () => {
    if (!maintOn && !await gConfirm('تشغيل وضع الصيانة؟ كل العملاء هيشوفوا شاشة الصيانة بدل الموقع لحد ما توقفه (الإدارة والموظفين مش هيتأثروا).', { ok: '🛠️ تشغيل', danger: true })) return;
    const x = await siteCfgAdminApi({ action: 'save', maint_on: maintOn ? '0' : '1' });
    if (x && x.success) { GShell.toast(maintOn ? 'تم فتح الموقع ✓' : 'وضع الصيانة شغّال ✓', 'ok'); window.__navSilent = true; try { renderEmergencyAdminPage(); } finally { window.__navSilent = false; } }
    else GShell.toast((x && x.message) || 'تعذّر', 'err');
  };
}

/* ---------------------------------------------------------------------
   02. الدعاية والعروض (لوحة التحكم)
   --------------------------------------------------------------------- */
const ADS_TYPES = { banner: '🟨 بانر في الرئيسية', popup: '🪟 إعلان منبثق', marquee: '🏃 شريط متحرك أعلى الشاشات' };
const ADS_AUD = {
  all: 'الكل (زوار وعملاء)', visitors: 'الزوار (غير مسجّلين)', no_sub: 'مسجّلين بدون اشتراك',
  subscribers: 'كل المشتركين', upsell: 'Upsell — مشترك في باقة أقل (ترقية لباقة أعلى)',
  downsell: 'Downsell — اشتراكه انتهى (عرض باقة أرخص للرجوع)', expiring: 'اشتراكه هينتهي خلال 7 أيام (تجديد)'
};
const ADS_CTA = { none: 'بدون زرار', plans: 'صفحة الباقات', plan: 'باقة معيّنة', register: 'إنشاء حساب', url: 'رابط خارجي (https)' };
async function renderAdsAdminPage(){
  const __tok = screenToken();
  pushNav(() => renderAdsAdminPage());
  const email = await getSession();
  if (!email) return renderLogin();
  if (!window.__isAdmin) return renderHome();
  if (!hasPermission('manage_plans') && !hasPermission('manage_admin_settings')) return renderAdminHub();
  const [r, pl] = await Promise.all([siteCfgAdminApi(), apiGet('/plans_admin_list.php').catch(() => null)]);
  if (screenStale(__tok)) return;
  let items = []; try { items = (JSON.parse((r && r.config && r.config.ads_cfg) || '{}') || {}).items || []; } catch(e){}
  const plans = (pl && pl.plans) || [];
  window.__lastPageKey = 'ads_admin';
  const planOpts = (sel) => `<option value="">— اختر —</option>` + plans.map(p => `<option value="${escapeHtml(p.id)}" ${p.id === sel ? 'selected' : ''}>${escapeHtml(p.name)} (${escapeHtml(p.market || 'مصر')})</option>`).join('');
  const opt = (map, sel) => Object.entries(map).map(([k, l]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('');
  const row = (a) => `<div class="section-card ad-card" data-id="${escapeHtml(a.id || '')}">
    <div class="u-row" style="justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <label class="u-check"><input type="checkbox" class="adOn" ${a.on ? 'checked' : ''}> <b>مفعّل</b></label>
      <span><button class="small secondary u-wa adPrev">👁 معاينة</button> <button class="small danger u-wa adDel">🗑️ حذف</button></span>
    </div>
    <div class="g-grid-filters u-mt8">
      <label class="u-fs12">النوع<select class="adType">${opt(ADS_TYPES, a.type || 'banner')}</select></label>
      <label class="u-fs12">الجمهور<select class="adAud">${opt(ADS_AUD, a.audience || 'all')}</select></label>
      <label class="u-fs12">المنبثق يظهر كل (دقيقة، 0 = مرة واحدة)<input type="number" class="adEvery" min="0" max="10080" value="${+a.every || 0}"></label>
      <label class="u-fs12">من تاريخ<input type="date" class="adFrom" value="${escapeHtml(a.from || '')}"></label>
      <label class="u-fs12">إلى تاريخ<input type="date" class="adTo" value="${escapeHtml(a.to || '')}"></label>
      <label class="u-fs12">لون مميز<input type="color" class="adColor" value="${escapeHtml(a.color || '#C9A227')}"></label>
    </div>
    <label class="u-fs12">العنوان<input class="adTitle" maxlength="90" value="${escapeHtml(a.title || '')}" placeholder="مثال: رقّي لباقة سنوية ووفّر شهرين"></label>
    <label class="u-fs12">النص<textarea class="adBody" rows="2" maxlength="300">${escapeHtml(a.body || '')}</textarea></label>
    <div class="g-grid-filters">
      <label class="u-fs12">زرار الإجراء<select class="adCta">${opt(ADS_CTA, a.cta || 'none')}</select></label>
      <label class="u-fs12">نص الزرار<input class="adCtaLabel" maxlength="40" value="${escapeHtml(a.ctaLabel || '')}" placeholder="اشترك الآن"></label>
      <label class="u-fs12">الباقة<select class="adPlan">${planOpts(a.plan || '')}</select></label>
      <label class="u-fs12">الرابط<input class="adUrl" dir="ltr" value="${escapeHtml(a.url || '')}" placeholder="https://..."></label>
    </div>
  </div>`;
  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>${pageTitle('ads_admin', '📣 الدعاية والعروض')}</div><button class="secondary small" id="adsBack">🛡️ رجوع للوحة التحكم</button></div>
    <div class="info">اعمل عروض Upsell (ترقية المشترك لباقة أعلى) وDownsell (عرض باقة أرخص لمن انتهى اشتراكه) وتجديد، واختار تظهر إزاي: بانر في الرئيسية، أو إعلان منبثق كل فترة، أو شريط متحرك أعلى الشاشات. الإدارة والموظفين مبيشوفوش الدعاية (غير في المعاينة).</div>
    <div id="adsList">${items.map(row).join('') || '<p class="u-muted" id="adsEmpty">لا توجد إعلانات بعد.</p>'}</div>
    <button class="secondary u-wa" id="adsAdd">+ إعلان / عرض جديد</button> <button class="u-wa" id="adsSave">💾 حفظ الدعاية</button> <span id="adsMsg" class="u-note"></span>
  </div>`;
  const read = (cd) => ({ id: cd.dataset.id, on: cd.querySelector('.adOn').checked, type: cd.querySelector('.adType').value, audience: cd.querySelector('.adAud').value,
    every: +cd.querySelector('.adEvery').value || 0, from: cd.querySelector('.adFrom').value, to: cd.querySelector('.adTo').value, color: cd.querySelector('.adColor').value,
    title: cd.querySelector('.adTitle').value.trim(), body: cd.querySelector('.adBody').value.trim(), cta: cd.querySelector('.adCta').value,
    ctaLabel: cd.querySelector('.adCtaLabel').value.trim(), plan: cd.querySelector('.adPlan').value, url: cd.querySelector('.adUrl').value.trim() });
  const wire = (cd) => {
    cd.querySelector('.adDel').onclick = () => cd.remove();
    cd.querySelector('.adPrev').onclick = () => gAdsShow(read(cd), true);
  };
  app.querySelectorAll('.ad-card').forEach(wire);
  document.getElementById('adsBack').onclick = () => goAdminHome();
  document.getElementById('adsAdd').onclick = () => {
    const e = document.getElementById('adsEmpty'); if (e) e.remove();
    const w = document.createElement('div'); w.innerHTML = row({ on: true, type: 'banner', audience: 'upsell', cta: 'plans', ctaLabel: 'شوف الباقات' });
    const cd = w.firstElementChild; cd.dataset.id = Math.random().toString(36).slice(2, 12); document.getElementById('adsList').appendChild(cd); wire(cd);
  };
  document.getElementById('adsSave').onclick = async () => {
    const list = Array.from(app.querySelectorAll('.ad-card')).map(read);
    const x = await siteCfgAdminApi({ action: 'save', ads_cfg: JSON.stringify({ items: list }) });
    document.getElementById('adsMsg').textContent = x && x.success ? `تم الحفظ ✓ (${list.length} إعلان)` : ((x && x.message) || 'تعذّر الحفظ');
    window.__adsCfg = null;
  };
}

/* ---------------------------------------------------------------------
   03. عرض الدعاية للعملاء
   --------------------------------------------------------------------- */
const ADS_SEEN = 'gs_ads_seen_v1';
const adsSeen = () => { try { return JSON.parse(localStorage.getItem(ADS_SEEN) || '{}') || {}; } catch(e){ return {}; } };
const adsMark = (id, what) => { const m = adsSeen(); m[id + '|' + what] = Date.now(); try { localStorage.setItem(ADS_SEEN, JSON.stringify(m)); } catch(e){} };
async function gAdsAudience(){
  // الجمهور الحالي: visitors / no_sub / subscribers (+ upsell / downsell / expiring)
  if (window.__adsAud && Date.now() - window.__adsAud.at < 5 * 60 * 1000 && window.__adsAud.email === (window.GShell && GShell.email)) return window.__adsAud.set;
  const set = new Set(['all']);
  const email = window.GShell && GShell.email;
  if (!email) set.add('visitors');
  else {
    const [my, pl, hist] = await Promise.all([getMySubscription().catch(() => null), getPlansList().catch(() => null), getMySubscriptionHistory().catch(() => null)]);
    const sub = my && my.success ? my.subscription : null;
    if (sub && sub.active !== false) {
      set.add('subscribers');
      const top = Math.max(0, ...((pl && pl.plans) || []).map(p => +p.amount || 0));
      if ((+sub.amount || 0) < top) set.add('upsell');
      if (sub.endDate && (gServerDate(sub.endDate) - Date.now()) < 7 * 86400000) set.add('expiring');
    } else {
      set.add('no_sub');
      if (hist && hist.success && (hist.events || []).length) set.add('downsell');
    }
  }
  window.__adsAud = { at: Date.now(), email, set };
  return set;
}
function gAdsCta(a){
  if (a.cta === 'url' && /^https:\/\//i.test(a.url || '')) { window.open(a.url, '_blank', 'noopener'); return; }
  if (a.cta === 'register') return renderRegister();
  if (a.cta === 'plans' || a.cta === 'plan') return (window.GShell && GShell.email) ? renderSubscriptionPlans() : (typeof renderPublicPricing === 'function' ? renderPublicPricing() : renderRegister());
}
function gAdsHtml(a, kind){
  const btn = a.cta && a.cta !== 'none' ? `<button type="button" class="small u-wa gs-ad-cta">${escapeHtml(a.ctaLabel || 'اعرف أكتر')}</button>` : '';
  if (kind === 'marquee') return `<div class="gs-ad-marquee" style="--ad:${escapeHtml(a.color || '#C9A227')}" role="marquee"><div class="gs-ad-track"><span><b>${escapeHtml(a.title)}</b> ${escapeHtml(a.body)}</span><span aria-hidden="true"><b>${escapeHtml(a.title)}</b> ${escapeHtml(a.body)}</span></div>${btn}<button type="button" class="gs-ad-x" aria-label="إغلاق">✕</button></div>`;
  return `<div class="gs-ad gs-ad-${kind}" style="--ad:${escapeHtml(a.color || '#C9A227')}"><button type="button" class="gs-ad-x" aria-label="إغلاق">✕</button>
    <div class="gs-ad-t">${escapeHtml(a.title)}</div>${a.body ? `<div class="gs-ad-b">${escapeHtml(a.body)}</div>` : ''}${btn}</div>`;
}
function gAdsShow(a, preview){
  if (a.type === 'popup') {
    const ov = document.createElement('div'); ov.className = 'gs-ad-ov'; ov.innerHTML = gAdsHtml(a, 'popup'); document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('.gs-ad-x')) close(); });
    const c = ov.querySelector('.gs-ad-cta'); if (c) c.onclick = () => { close(); if (!preview) gAdsCta(a); };
    return;
  }
  if (a.type === 'marquee') {
    document.querySelectorAll('.gs-ad-marquee').forEach(x => x.remove());
    const w = document.createElement('div'); w.innerHTML = gAdsHtml(a, 'marquee'); const el = w.firstElementChild;
    document.body.appendChild(el); document.documentElement.classList.add('gs-has-marquee');
    el.querySelector('.gs-ad-x').onclick = () => { el.remove(); document.documentElement.classList.remove('gs-has-marquee'); if (!preview) adsMark(a.id, 'x'); };
    const c = el.querySelector('.gs-ad-cta'); if (c) c.onclick = () => { if (!preview) gAdsCta(a); };
    if (preview) setTimeout(() => { el.remove(); document.documentElement.classList.remove('gs-has-marquee'); }, 8000);
    return;
  }
  // بانر: أول الشاشة الحالية
  const host = document.querySelector('#app .lp-screen main') || document.querySelector('#app .container') || document.getElementById('app'); if (!host) return;   // الإصدار 108: في اللاندينج تحت القائمة
  host.querySelectorAll('.gs-ad-banner[data-ad="' + a.id + '"]').forEach(x => x.remove());
  const w = document.createElement('div'); w.innerHTML = gAdsHtml(a, 'banner'); const el = w.firstElementChild; el.dataset.ad = a.id || 'p';
  host.insertBefore(el, host.firstChild);
  el.querySelector('.gs-ad-x').onclick = () => { el.remove(); if (!preview) adsMark(a.id, 'x'); };
  const c = el.querySelector('.gs-ad-cta'); if (c) c.onclick = () => { if (!preview) gAdsCta(a); };
}
let __adsBusy = false;
async function gAdsAfterScreen(){
  if (__adsBusy || window.__isAdmin) return;
  const scr = window.GShell && GShell.currentScreen;
  if (!scr || /Admin|Login|Register|Checkout|renderLogin|Emergency|Ads/.test(scr)) return;
  __adsBusy = true;
  try {
    if (!window.__adsCfg || Date.now() - window.__adsCfg.at > 5 * 60 * 1000) {
      const j = await apiGet('/site_public_config.php').catch(() => null);
      window.__adsCfg = { at: Date.now(), items: (j && j.config && j.config.ads && j.config.ads.items) || [] };
    }
    const today = new Date().toISOString().slice(0, 10);
    const live = window.__adsCfg.items.filter(a => a.on && (!a.from || a.from <= today) && (!a.to || a.to >= today));
    if (!live.length) return;
    const aud = await gAdsAudience();
    const seen = adsSeen(), now = Date.now();
    const mine = live.filter(a => aud.has(a.audience || 'all'));
    // بانر: في الرئيسية وصفحة الباقات بس، ولو اتقفل ميرجعش غير بعد يوم
    if (/renderHome|renderSubscriptionPlans|renderPublicHome|renderPublicPricing|renderLanding/.test(scr)) {
      mine.filter(a => a.type === 'banner' && !(seen[a.id + '|x'] > now - 86400000)).slice(0, 2).forEach(a => { if (!document.querySelector('.gs-ad-banner[data-ad="' + a.id + '"]')) gAdsShow(a); });
    }
    // شريط متحرك: كل الشاشات، ولو اتقفل ميرجعش غير بعد يوم
    const mq = mine.find(a => a.type === 'marquee' && !(seen[a.id + '|x'] > now - 86400000));
    if (mq && !document.querySelector('.gs-ad-marquee')) gAdsShow(mq);
    // منبثق: مرة واحدة أو كل X دقيقة
    const pop = mine.find(a => a.type === 'popup' && (a.every > 0 ? !(seen[a.id + '|pop'] > now - a.every * 60000) : !seen[a.id + '|pop']));
    if (pop && !document.querySelector('.gs-ad-ov')) { adsMark(pop.id, 'pop'); setTimeout(() => gAdsShow(pop), 1200); }
  } finally { __adsBusy = false; }
}
window.gAdsAfterScreen = gAdsAfterScreen;
