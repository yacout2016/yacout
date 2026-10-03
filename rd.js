/* =====================================================================
   GRIFFINE — rd.js (الإصدار 151) — لوحة التحكم ← «🔬 البحث والتطوير»
   تحليلات الزوار (من غير خدمة خارجية) + رحلة التسجيل والاشتراك + الأخطاء والسرعة + البحث اللي مالقاش
   + أسئلة الشات اللي مالهاش رد + «📋 تقرير التطوير» (اقتراحات بقواعد ثابتة) بزرار نسخ تبعته للتطوير
   ===================================================================== */
(function(){
  'use strict';
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const N = (n) => (+n || 0).toLocaleString('en-US');
  const LBL = {
    direct: 'مباشر / من غير رابط', tiktok: 'تيك توك', facebook: 'فيسبوك', instagram: 'إنستجرام', google: 'جوجل', whatsapp: 'واتساب', x: 'X (تويتر)', youtube: 'يوتيوب', telegram: 'تيليجرام', bing: 'بينج', other: 'مواقع تانية',
    mobile: '📱 موبايل', desktop: '💻 كمبيوتر', tablet: '📟 تابلت', EG: '🇪🇬 مصر', SA: '🇸🇦 السعودية', AE: '🇦🇪 الإمارات', QA: '🇶🇦 قطر', KW: '🇰🇼 الكويت', '': 'غير معروف'
  };
  const lbl = (k) => LBL[k] != null ? LBL[k] : (LBL[String(k).split('.')[0]] ? LBL[String(k).split('.')[0]] + ' · ' + String(k).split('.').slice(1).join('.') : k);
  let SCREEN_NAMES = {};
  async function screenNames(){
    try { const cat = window.GShell && GShell.getScreenCatalog ? await GShell.getScreenCatalog() : []; cat.forEach(it => { SCREEN_NAMES[String(it.fnName || '').replace(/^GS:/, '')] = it.label; }); } catch(e){}
    Object.assign(SCREEN_NAMES, { renderLanding: 'الصفحة العامة (قبل الدخول)', renderPublicHome: 'الصفحة العامة', renderLogin: 'تسجيل الدخول', renderRegister: 'إنشاء حساب', renderHome: 'الرئيسية', renderForgotPassword: 'نسيت كلمة المرور', renderTermsPage: 'الشروط والأحكام', renderPrivacyPolicyPage: 'سياسة الخصوصية' });
  }
  const sn = (k) => SCREEN_NAMES[k] || k;
  const bars = (rows, total, fmt) => rows.length ? `<div class="rd-bars">${rows.map(r => { const p = total ? Math.round(+r.n / total * 100) : 0; return `<div class="rd-bar"><span class="rd-bl">${E(fmt ? fmt(r.k) : r.k)}</span><span class="rd-bt"><i style="width:${Math.max(2, p)}%"></i></span><b>${N(r.n)}</b><small>${p}%</small></div>`; }).join('')}</div>` : '<div class="u-muted u-fs12">لسه مفيش بيانات.</div>';
  const LV = { high: ['🔴', 'مهم جدًا'], mid: ['🟠', 'مهم'], low: ['🟢', 'تحسين'], info: ['ℹ️', 'ملاحظة'] };

  function reportText(d){
    const L = [];
    L.push(`📋 تقرير التطوير — GRIFFINE — آخر ${d.days} يوم (من ${d.from})`);
    L.push(`الزوار: ${d.kpi.visitors} · مشاهدات الشاشات: ${d.kpi.views} · حسابات جديدة: ${d.kpi.newUsers} (فعّلوا ${d.kpi.verified}) · اشتراكات مدفوعة: ${d.kpi.paid} · موبايل: ${d.kpi.mobilePct}%`);
    L.push(`رحلة الزائر: الصفحة العامة ${d.funnel.landing} ← شاشة التسجيل ${d.funnel.register} ← حساب جديد ${d.funnel.users} ← فعّل الإيميل ${d.funnel.verified} ← اشتراك مدفوع ${d.funnel.paid}`);
    L.push('');
    L.push('الاقتراحات:');
    d.suggestions.forEach((s, i) => L.push(`${i + 1}) ${LV[s.level][0]} ${s.title} — ${s.detail}`));
    if (d.errors.length) { L.push(''); L.push('الأخطاء عند المستخدمين:'); d.errors.forEach(e => L.push(`- (${e.n}×) ${e.k}${e.s ? ' — شاشة ' + e.s : ''}`)); }
    if (d.misses.length) { L.push(''); L.push('كلمات اتدوّر عليها ومالقتش: ' + d.misses.map(m => `${m.k} (${m.n})`).join('، ')); }
    if (d.unanswered.length) { L.push(''); L.push('أسئلة الشات اللي مالهاش رد: ' + d.unanswered.map(m => `«${m.k}» (${m.n})`).join(' | ')); }
    if (d.sources.length) { L.push(''); L.push('مصادر الزيارات: ' + d.sources.map(s => `${lbl(s.k)} ${s.n}`).join('، ')); }
    return L.join('\n');
  }

  window.renderAdminRD = async function(days){
    const tok = screenToken(); pushNav(() => renderAdminRD(days)); window.__lastPageKey = 'admin_rd';
    const email = await getSession(); if (!email) return renderLogin();
    if (!window.__isAdmin) return renderHome();
    days = [1, 7, 30, 90].includes(+days) ? +days : 7;
    app.innerHTML = `<div class="container wide">${logoHeader()}<div class="topbar"><div>${pageTitle('admin_rd', '🔬 البحث والتطوير')}</div></div><div class="gs-skel" style="height:300px"></div></div>`;
    const [d] = await Promise.all([apiGet('/rd_api.php?action=summary&days=' + days).catch(() => null), screenNames()]);
    if (screenStale(tok)) return;
    if (!d || !d.success) { app.innerHTML = `<div class="container"><div class="section-card error">${E((d && d.message) || 'تعذّر التحميل')}</div></div>`; return; }
    const k = d.kpi, f = d.funnel, maxSeries = Math.max(1, ...d.series.map(x => +x.v));
    const kpi = (l, v, s) => `<div class="rd-kpi"><span>${l}</span><b>${v}</b>${s ? `<small>${s}</small>` : ''}</div>`;
    const step = (l, v, prev) => `<div class="rd-step"><b>${N(v)}</b><span>${l}</span>${prev != null ? `<small>${prev ? Math.round(v / prev * 100) : 0}% من اللي قبلها</small>` : ''}</div>`;
    const loadTxt = d.load.map(x => `${lbl(x.k)}: <b>${(x.ms / 1000).toFixed(1)} ث</b>`).join(' · ') || 'لسه مفيش قياسات';
    app.innerHTML = `<div class="container wide rd">${logoHeader()}
      <div class="topbar"><div>${pageTitle('admin_rd', '🔬 البحث والتطوير')}</div><button class="secondary small" id="rdBack">🛡️ رجوع للوحة التحكم</button></div>
      <div class="info">تحليلات زوار موقعك من غير أي خدمة خارجية ومن غير تكلفة (الأدمن والموظفين مش بيتحسبوا). وتحت «📋 تقرير التطوير»: اقتراحات مرتبة حسب الأهمية — انسخه وابعتهولي عشان أطوّر.</div>
      <div class="rd-period"><label>الفترة <select id="rdDays">${[[1, 'النهارده'], [7, 'آخر 7 أيام'], [30, 'آخر 30 يوم'], [90, 'آخر 90 يوم']].map(([v, l]) => `<option value="${v}" ${v === days ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <div class="rd-kpis">${kpi('👁️ زوار', N(k.visitors))}${kpi('📄 مشاهدات الشاشات', N(k.views))}${kpi('👥 حسابات جديدة', N(k.newUsers), `فعّلوا الإيميل ${N(k.verified)}`)}${kpi('💳 اشتراكات مدفوعة', N(k.paid))}${kpi('📱 موبايل', k.mobilePct + '%')}${kpi('🧭 مستخدمين من غير خطط', N(k.noPlans), `من ${N(k.allUsers)} مستخدم`)}</div>

      <div class="section-card"><div class="section-title">📋 تقرير التطوير — اقتراحات (قواعد ثابتة)</div>
        <div class="rd-sugs">${d.suggestions.map(s => `<div class="rd-sug rd-${s.level}"><b>${LV[s.level][0]} ${E(s.title)}</b><span class="rd-lvl">${LV[s.level][1]}</span><p>${E(s.detail)}</p></div>`).join('') || '<div class="u-muted">مفيش اقتراحات دلوقتي — كل حاجة تمام.</div>'}</div>
        <div class="rd-acts"><button type="button" id="rdCopy">📋 نسخ التقرير للتطوير</button><span class="u-muted u-fs12">انسخه وابعتهولي في الشات وأنا أنفّذ.</span></div>
        <textarea id="rdTxt" class="rd-txt" readonly hidden></textarea></div>

      <div class="section-card"><div class="section-title">🧭 رحلة الزائر</div>
        <div class="rd-funnel">${step('زار الصفحة العامة', f.landing)}${step('فتح شاشة التسجيل', f.register, f.landing)}${step('عمل حساب', f.users, f.register || f.landing)}${step('فعّل الإيميل', f.verified, f.users)}${step('اشترك مدفوع', f.paid, f.verified)}</div></div>

      <div class="section-card"><div class="section-title">📈 الزوار يوم بيوم</div>
        <div class="rd-series">${d.series.map(x => `<div class="rd-col" title="${E(x.d)}: ${x.v} زائر"><i style="height:${Math.max(4, Math.round(x.v / maxSeries * 100))}%"></i><small>${E(String(x.d).slice(5))}</small><b>${x.v}</b></div>`).join('') || '<div class="u-muted u-fs12">لسه مفيش بيانات.</div>'}</div></div>

      <div class="rd-grid">
        <div class="section-card"><div class="section-title">🔗 جايين منين</div>${bars(d.sources, k.visitors, lbl)}<div class="u-fs12 u-muted u-mt6">روابط الحملات (utm) من شاشة التسويق بتظهر هنا باسم الحملة.</div></div>
        <div class="section-card"><div class="section-title">📱 الأجهزة</div>${bars(d.devices, k.visitors, lbl)}<div class="u-fs12 u-mt6">⏱ متوسط سرعة أول فتح: ${loadTxt}</div></div>
        <div class="section-card"><div class="section-title">🌐 المتصفحات</div>${bars(d.browsers, k.visitors)}</div>
        <div class="section-card"><div class="section-title">💻 أنظمة التشغيل</div>${bars(d.os, k.visitors)}</div>
        <div class="section-card"><div class="section-title">🌍 البلاد</div>${bars(d.countries, k.visitors, lbl)}</div>
        <div class="section-card"><div class="section-title">📄 أكتر الشاشات استخدامًا</div>${bars(d.screens.slice(0, 15), k.views, sn)}</div>
      </div>
      <div class="rd-grid">
        <div class="section-card"><div class="section-title">🐞 أخطاء عند المستخدمين</div>${d.errors.length ? `<div class="rd-list">${d.errors.map(e => `<div><b>${N(e.n)}×</b> ${E(e.k)}${e.s ? ` <small>— ${E(sn(e.s))}</small>` : ''}</div>`).join('')}</div>` : '<div class="u-muted u-fs12">مفيش أخطاء 👍</div>'}</div>
        <div class="section-card"><div class="section-title">🔎 دوّروا ومالقوش</div>${d.misses.length ? `<div class="rd-list">${d.misses.map(m => `<div><b>${N(m.n)}×</b> «${E(m.k)}»</div>`).join('')}</div>` : '<div class="u-muted u-fs12">مفيش.</div>'}</div>
        <div class="section-card"><div class="section-title">💬 أسئلة الشات اللي مالهاش رد</div>${d.unanswered.length ? `<div class="rd-list">${d.unanswered.map(m => `<div><b>${N(m.n)}×</b> «${E(m.k)}»</div>`).join('')}</div><button type="button" class="secondary small u-mt6" id="rdFaq">➕ ضيفها في المساعد الذكي</button>` : '<div class="u-muted u-fs12">مفيش.</div>'}</div>
      </div>
    </div>`;
    document.getElementById('rdBack').onclick = () => renderAdminHub();
    document.getElementById('rdDays').onchange = (e) => renderAdminRD(+e.target.value);
    const fq = document.getElementById('rdFaq'); if (fq) fq.onclick = () => renderFaqAdminPage();
    document.getElementById('rdCopy').onclick = async () => {
      const txt = reportText(d), ta = document.getElementById('rdTxt'); ta.value = txt; ta.hidden = false;
      try { await navigator.clipboard.writeText(txt); GShell.toast('✅ اتنسخ التقرير — ابعتهولي في الشات', 'ok'); } catch(e){ ta.select(); GShell.toast('علّم على النص وانسخه', 'info'); }
    };
  };
})();
