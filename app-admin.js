/* =====================================================================
   GRIFFINE — app-admin.js (الإصدار 88) — لوحة التحكم وكل شاشات الإدارة
   (اتفصل من griffine.js - كل الملفات بتتحمّل بالترتيب في index.php وبتشارك نفس المتغيرات العامة)
   ===================================================================== */
/* ================== لوحة تحكم المدير — كل المشتركين (للتجربة الآن، تُقيَّد بصلاحية مدير بعد إطلاق الموقع) ================== */
/* ================== شريط تنقّل لوحة التحكم - مبني حسب صلاحيات المستخدم الحالي ================== */
function adminNavButtonsHtml(){
  // كل زرار: id, الصلاحية المطلوبة (null = يظهر دايمًا), الأيقونة, النص، وأي HTML إضافي (زي البادج)
  const groups = [
    // الإصدار 73: المشتركين والموظفين أول قسم (كانوا ملهمش كارت في لوحة التحكم)
    { title: 'المشتركون والفريق', items: [
      { id:'goSubscribersBtn', perm:'manage_subscribers', icon:'👤', label:'المشتركون والاشتراكات' },
      { id:'goStaffBtn', perm:'manage_staff', icon:'👥', label:'الموظفين والصلاحيات' },
      { id:'goHrBtn', perm:'manage_hr', icon:'🧑‍💼', label:'شؤون الموظفين (HR): الرواتب والحضور والمستندات' },
      { id:'goJobTitlesBtn', perm:'manage_staff', icon:'🏷️', label:'المسميات الوظيفية' },
      { id:'goArchiveBtn', perm:'manage_subscribers', icon:'🗄️', label:'أرشيف العملاء المحذوفين' },
    ]},
    { title: 'التواصل والدعم', items: [
      { id:'goChatAdminBtn', perm:'view_chat', icon:'💬', label:'الدردشة الفورية', extra:`<span id="chatUnreadBadge" class="nav-badge" style="display:none;">0</span>` },
      { id:'goContentBtn', perm:['manage_testimonials', 'manage_content'], icon:'📰', label:'آراء العملاء والمقالات' },
      { id:'goSuggestionsAdminBtn', perm:'manage_suggestions', icon:'💡', label:'مقترحات العملاء' },
      { id:'goFaqBtn', perm:['manage_content', 'manage_admin_settings'], icon:'🤖', label:'المساعد الذكي في الشات (أسئلة وأجوبة)' },
    ]},
    { title: 'الإدارة المالية', items: [
      { id:'goPlansMgmtBtn', perm:'manage_plans', icon:'💳', label:'إدارة الخطط والأسعار' },
      { id:'goReportsBtn', perm:'view_reports', icon:'📊', label:'التقارير' },
      { id:'goTradesBtn', perm:'view_reports', icon:'📈', label:'تقرير الصفقات (شراء / بيع / أرباح العملاء)' },
      { id:'goRecommendationsBtn', perm:'manage_recommendations', icon:'📢', label:'توصية شراء / بيع (المحللين)' },
    ]},
    { title: 'الإدارة والصلاحيات', items: [
      { id:'goSettingsBtn', perm:'manage_admin_settings', icon:'⚙️', label:'الصلاحيات والإعدادات الإلزامية' },
      { id:'goPeriodsBtn', perm:'manage_admin_settings', icon:'🛠', label:'التحكم في الشاشة الرئيسية والقوائم المنسدلة للمدد الزمنية' },
      { id:'goEmergencyBtn', perm:'manage_admin_settings', icon:'🚨', label:'الشاشات الطارئة (الصيانة / انقطاع النت / السيرفر / التحميل)' },
      { id:'goEmailCenterBtn', perm:'manage_admin_settings', icon:'📧', label:'مركز الإيميلات (اختبار وسجل الإرسال)' },
      { id:'goBroadcastBtn', icon:'📢', label:'الرسائل: للمشتركين وبين الإدارة والموظفين (إشعار + إيميل)' },
      { id:'goAiBtn', perm:'manage_admin_settings', icon:'🤖', label:'الذكاء الاصطناعي (مجاني / مدفوع + حساب Claude)' },
      { id:'goBlacklistBtn', perm:'manage_blacklist', icon:'🚫', label:'القائمة السوداء' },
    ]},
    { title: 'التطوير والتسويق', items: [
      { id:'goRdBtn', perm:['manage_admin_settings', 'view_reports'], icon:'🔬', label:'البحث والتطوير (تحليلات الزوار واقتراحات التطوير)' },
      { id:'goMktBtn', perm:['manage_admin_settings', 'manage_plans'], icon:'📣', label:'التسويق (محتوى لكل منصة · جدول نشر · مطلوب منك · الأداء)' },
    ]},
    { title: 'المحتوى والتنسيق', items: [
      { id:'goLandingBtn', perm:'edit_site_design', icon:'🏁', label:'صفحة اللاندينج (واجهة الموقع قبل الدخول)' },
      { id:'goBasiraBtn', perm:'edit_site_design', icon:'🔮', label:'تحليلات بصيرة AI' },
      { id:'goMizanBtn', perm:'edit_site_design', icon:'⚖️', label:'ميزان محفظتك AI (النسب المقترحة والتنبيهات)' },
      { id:'goRecsCfgBtn', perm:'edit_site_design', icon:'📢', label:'شاشة التوصيات (النصوص والأزرار والافتراضيات)' },
      { id:'goMizanAiBtn', perm:'edit_site_design', icon:'🧭', label:'ميزان GRIFFINE AI' },
      { id:'goStudioBtn', perm:'edit_site_design', icon:'🖌️', label:'استوديو التصميم (الثيمات وتعديل أي شاشة)' },
      { id:'goSiteDesignBtn', perm:'edit_site_design', icon:'🎨', label:'تنسيق الموقع' },
      { id:'goSiteTextsBtn', perm:'manage_site_content', icon:'📝', label:'نصوص شاشات الموقع' },
    ]},
    { title: 'الدعاية والتسويق', items: [
      { id:'goAdsBtn', perm:['manage_plans', 'manage_admin_settings'], icon:'📣', label:'الدعاية والعروض (Upsell / Downsell / بانر / شريط متحرك)' },
    ]},
    { title: 'التصدير والطباعة', items: [
      { id:'goExportScreensBtn', perm:'view_reports', icon:'🖨️', label:'طباعة صور كل الشاشات (PDF)' },
      { id:'goExportExcelBtn', perm:'manage_staff', superOnly:true, icon:'📊', label:'تصدير كل الحسابات والمدخلات (Excel)' },
    ]},
  ];

  window.__adminNavGroups = groups;   // الإصدار 148: لبحث لوحة التحكم
  const cardHtml = it => `<button class="admin-nav-card" id="${it.id}"><span class="nav-icon">${it.icon}</span><span class="nav-label">${escapeHtml(it.label)}</span>${it.extra||''}</button>`;

  const groupsHtml = groups.map(g => {
    // perm ممكن تكون صلاحية واحدة أو أكتر (يكفي واحدة منهم) - الإصدار 85
    const items = g.items.filter(it => (!it.perm || [].concat(it.perm).some(k => hasPermission(k))) && (!it.superOnly || window.__isSuperAdmin));
    if (!items.length) return '';
    return `<div class="admin-nav-group">
      <div class="admin-nav-group-title">${escapeHtml(g.title)}</div>
      <div class="admin-nav-grid">${items.map(cardHtml).join('')}</div>
    </div>`;
  }).join('');

  return `<div class="admin-nav-groups">
    ${window.adminSearchHtml ? adminSearchHtml() : ''}
    ${groupsHtml}
    <div class="admin-nav-grid"><button class="admin-nav-card" id="homeBtn"><span class="nav-icon">🏠</span><span class="nav-label">الشاشة الرئيسية</span></button></div>
  </div>`;
}
function wireAdminNavButtons(){
  if (window.__recLogTick) { clearInterval(window.__recLogTick); window.__recLogTick = null; }
  const map = {
    goSubscribersBtn: renderAdminSubscribers,
    goPlansMgmtBtn: renderPlansManagementPage,
    goChatAdminBtn: renderChatAdminPage,
    goSettingsBtn: renderAdminSettingsPage,
    goPeriodsBtn: () => renderAdminPeriods(),
    goRdBtn: () => renderAdminRD(),                       // الإصدار 151 (rd.js)
    goBroadcastBtn: () => renderAdminBroadcast(),          // الإصدار 154 (mkt.js)
    goMktBtn: () => renderAdminMkt(),                     // الإصدار 151 (mkt.js)            // الإصدار 144 (periods.js)
    goEmergencyBtn: () => renderEmergencyAdminPage(),   // الإصدار 100 (promo.js)
    goAdsBtn: () => renderAdsAdminPage(),               // الإصدار 100 (promo.js)
    goLandingBtn: () => renderAdminLandingPage(),       // الإصدار 108 (landing-admin.js)
    goBasiraBtn: () => renderAdminBasira(),             // الإصدار 114 (basira.js)
    goMizanAiBtn: () => renderAdminMizanAi(),           // الإصدار 122 (mizanai.js)
    goMizanBtn: () => renderAdminMizan(),               // الإصدار 128 (mizan.js)
    goRecsCfgBtn: () => renderAdminRecsCfg(),           // الإصدار 129 (recs.js)
    goBlacklistBtn: renderBlacklist,
    goArchiveBtn: renderArchivedCustomers,
    goStaffBtn: renderStaffManagementPage,
    goHrBtn: () => renderHrPage(),
    goJobTitlesBtn: () => renderJobTitlesPage(),
    goSiteDesignBtn: renderSiteDesignPage,
    goStudioBtn: () => GStudio.openEditor(), // الإصدار 72: استوديو التصميم (studio.js)
    goEmailCenterBtn: () => GShell.renderEmailCenter(), // الإصدار 72: مركز الإيميلات (shell.js)
    goAiBtn: () => renderAdminAi(),                     // الإصدار 127 (ai_access.js)
    goReportsBtn: renderAdminReportsPage,
    goTradesBtn: () => renderTradesReportPage(),
    goFaqBtn: () => renderFaqAdminPage(),
    goRecommendationsBtn: renderRecommendationsAdminPage,
    goContentBtn: renderContentAdminPage,
    goSuggestionsAdminBtn: renderSuggestionsAdminPage,
    goSiteTextsBtn: renderSiteTextsAdminPage,
    goExportScreensBtn: () => GShell.exportScreensPdf(),
    goExportExcelBtn: () => { GShell.toast('جارٍ تجهيز ملف Excel... سيبدأ التحميل خلال ثوانٍ', 'info'); location.href = 'admin_export_excel.php'; },
    homeBtn: renderHome,
  };
  Object.keys(map).forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.onclick = map[id];
  });
  if (window.adminSearchWire) adminSearchWire();   // الإصدار 148: بحث لوحة التحكم
  updateChatUnreadBadge();
}
async function updateChatUnreadBadge(){
  const badge = document.getElementById('chatUnreadBadge');
  if (!badge || !hasPermission('view_chat')) return;
  try {
    const res = await apiGet('/chat_unread_count.php');
    if (res && res.success && res.unreadCount > 0) {
      badge.textContent = res.unreadCount > 9 ? '9+' : res.unreadCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  } catch (e) { /* الشبكة ممكن تفشل مرة، هتحاول تاني في الدورة الجاية */ }
}

// لوحة استقبال عامة لأي عضو فريق مالوش صلاحية "إدارة المشتركين" (يعني الصفحة الرئيسية بتاعت لوحة التحكم مش مناسبة له)
async function renderAdminHub(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderAdminHub());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('admin_hub','🛡️ لوحة التحكم')}</div>
      ${adminNavButtonsHtml()}
    </div>
    <div class="info">مرحبًا <strong>${email}</strong> — اختر من الأزرار أعلاه القسم الذي يمكنك دخوله حسب صلاحياتك. إذا لم ترَ أي زر غير "الشاشة الرئيسية"، فهذا يعني أنه لا توجد لديك أي صلاحية بعد — تواصل مع مدير الموقع ليمنحك الصلاحية المناسبة.</div>
  </div>`;
  wireAdminNavButtons();
  // الإصدار 98: حذف الأسهم المكتوبة غلط تلقائيًا (في الخلفية - كل 6 ساعات بالكتير، حتى لو الـ Cron مش متظبط)
  if (window.__isSuperAdmin && !window.__symAutoRan) { window.__symAutoRan = true;
    apiGet('/symbols_audit.php?action=auto').then(r => { if (r && r.success && r.deleted && r.deleted.length && window.GShell) GShell.toast(`🧹 تم حذف ${r.deleted.length} خطة/سهم برموز غير موجودة في البورصة`, 'ok'); }).catch(() => {}); }
}

// زرار "رجوع للوحة التحكم" في كل الصفحات الفرعية بيستخدم ده - يودّي لصفحة المشتركين لو عنده صلاحيتها، وإلا لواجهة الاستقبال العامة
function goAdminHome(){
  if (hasPermission('manage_subscribers')) return renderAdminSubscribers();
  return renderAdminHub();
}

async function renderAdminSubscribers(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderAdminSubscribers());
  const email = await getSession(); // getSession() بتحدّث window.__isAdmin من السيرفر
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('manage_subscribers')) return renderAdminHub();
  let subscribers = await getAllSubscribers();
  await gNpLoad(true);   // الإصدار 101: قنوات الإشعارات لكل مشترك
  if (typeof gAiLoad === 'function') await gAiLoad(true);   // الإصدار 127: الذكاء الاصطناعي لكل مشترك
  let emailChangeRequests = [];
  try {
    const ecRes = await apiGet('/admin_list_email_change_requests.php');
    if (ecRes && ecRes.success) emailChangeRequests = ecRes.items.filter(r => r.status === 'pending');
  } catch (e) { /* لو حصل خطأ، القسم ده بس مش هيظهر، والباقي يفضل شغال عادي */ }
  function computeTotals(list){
    return list.reduce((s,r)=>s+(r.amount||0), 0);
  }

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('admin_subscribers','🛡️ لوحة تحكم المدير — المشتركون')}</div>
      ${adminNavButtonsHtml()}
    </div>
    <div class="info">🛡️ هذه اللوحة متصلة بقاعدة بيانات حقيقية — كل البيانات هنا فعلية.</div>
    ${gAdminMarketBarHtml('admSubMarket')}

    ${emailChangeRequests.length ? `
    <h2 class="u-mt20">✏️ طلبات تعديل البريد الإلكتروني (${emailChangeRequests.length})</h2>
    <div class="section-card">
      <table class="u-w100">
        <thead><tr><th>البريد الحالي</th><th>البريد المطلوب</th><th>تاريخ الطلب</th><th></th></tr></thead>
        <tbody>
          ${emailChangeRequests.map(r => `<tr>
            <td>${escapeHtml(r.currentEmail)}</td><td>${escapeHtml(r.requestedEmail)}</td><td class="u-fs12">${escapeHtml(formatDateTimeAr(r.requestedAt))}</td>
            <td>
              <button class="secondary small u-wa" data-gcall="__reviewEmailChange" data-gargs="${gArgs([r.id, 'approved'])}">✅ موافقة</button>
              <button class="danger small u-wa" data-gcall="__reviewEmailChange" data-gargs="${gArgs([r.id, 'rejected'])}">❌ رفض</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <h2>إجماليات المشتركين</h2>
    <div class="summary-cards" id="adminSummaryCards"></div>

    <h2 class="u-mt20">فترة العرض</h2>
    <div class="section-card">
      <div class="grid2">
        <div><label>من تاريخ</label><input type="date" id="admFrom"></div>
        <div><label>إلى تاريخ</label><input type="date" id="admTo"></div>
      </div>
      <div class="radio-row std-filter-tabs">
        <button class="small secondary period-preset std-filter-tab" id="admPresetDaily">اليوم</button>
        <button class="small secondary period-preset std-filter-tab" id="admPresetWeekly">آخر أسبوع</button>
        <button class="small secondary period-preset std-filter-tab" id="admPresetMonthly">آخر شهر</button>
        <button class="small secondary period-preset std-filter-tab btn-active" id="admPresetAll">كل الفترة</button>
      </div>
    </div>

    <h2 class="u-mt20">إعدادات التذكيرات ومدة السماح (تُطبَّق على كل مشترك جديد، ويمكنك تخصيص كل مشترك على حدة أدناه)</h2>
    <div class="section-card">
      <div class="grid2">
        <div><label>يبدأ التذكير قبل انتهاء الاشتراك بـ (أيام)</label><input type="number" id="remStartBefore" min="1"></div>
        <div><label>كل كم يومًا يتكرر التذكير</label><input type="number" id="remInterval" min="1"></div>
      </div>
      <label>مدة السماح بعد انتهاء الاشتراك (أيام) — يستمر العميل في استخدام الموقع خلالها حتى يجدد</label>
      <input type="number" id="remGracePeriod" min="0" style="max-width:150px;">
      <button class="small secondary u-wa" id="saveRemDefaultsBtn">حفظ الإعدادات الافتراضية</button>
      <div class="info u-mt8">
        ✅ إرسال تذكيرات البريد يعمل الآن فعليًا (يشمل مشتركي الباقة المجانية أيضًا). ولكي يصبح تلقائيًا يوميًا دون الضغط على أي زر، يجب ضبط <strong>Cron Job</strong> من هوستنجر (تفاصيل في README_DEPLOY.md).
        سيتم تفعيل الواتساب لاحقًا بعد تجهيز ربط الـ API.
      </div>
      <button id="simulateRemindersBtn" class="secondary u-mt10">📨 معاينة: مين المستحق له تذكير النهارده</button>
      <button id="sendRemindersNowBtn" class="u-mt8">📤 إرسال التذكيرات الآن فعليًا (إيميل)</button>
      <div id="reminderSimResult"></div>
    </div>

    <h2 class="u-mt20">كل المشتركين</h2>
    <div class="section-card" id="subscribersTableWrap"></div>

    <h2 class="u-mt24">طباعة / تصدير بيان</h2>
    <div class="section-card">
      <label>اختر المشتركين للبيان</label>
      <div class="ms-dropdown" id="admMsDropdown">
        <button type="button" class="ms-toggle" id="admMsToggleBtn">اختر المشتركين ▾</button>
        <div class="ms-panel" id="admMsPanel" style="display:none;">
          <label class="ms-item ms-all"><input type="checkbox" id="admSelectAll"> تحديد الكل</label>
          <div class="ms-sep"></div>
          <div id="admSubChecks"></div>
          <button type="button" class="small" id="admMsDoneBtn" style="width:100%;margin-top:8px;">تم</button>
        </div>
      </div>
      <button id="admPrintBtn" class="u-mt14">🖨 طباعة بيان المشتركين (PDF)</button>
      <button id="admExportXlsBtn" class="secondary">⬇ تصدير Excel</button>
      <div style="font-size:11.5px;color:#888;margin-top:6px;">يأخذ البيان في الاعتبار فترة العرض المحددة أعلاه + المشتركين المختارين هنا.</div>
    </div>

    <h2 class="u-mt24">إضافة مشترك تجريبي</h2>
    <div class="section-card">
      <div class="info">⚠️ الموقع الآن متصل بقاعدة بيانات حقيقية — أي بيانات هنا تُحفظ فعليًا. استخدم هذا الزر للتجربة فقط، واحذف السجل التجريبي بعد ذلك من جدول المشتركين أدناه.</div>
      <button class="small secondary u-mt8" id="admAddTestBtn">+ إضافة مشترك تجريبي عشوائي</button>
    </div>

    <p class="disclaimer">تنويه: هذه الأرقام لأغراض العرض والتجربة، ولا تُعد بيانات مالية رسمية حتى يتم ربط الموقع بنظام دفع وقاعدة بيانات حقيقية.</p>
  </div>`;

  wireAdminNavButtons();

  let currentFrom = null, currentTo = null;

  function isoDaysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0]; }
  function setActiveAdminPreset(btn){
    document.querySelectorAll('#admFrom, #admTo').forEach(()=>{});
    document.querySelectorAll('.period-preset').forEach(b=>b.classList.remove('btn-active'));
    if(btn) btn.classList.add('btn-active');
  }

  function filteredList(){
    const mkt = gAdminMarket();   // الإصدار 96: فلتر السوق
    return subscribers.filter(r => (!currentFrom || r.startDate>=currentFrom) && (!currentTo || r.startDate<=currentTo) && (!mkt || (r.accountMarket || 'مصر') === mkt));
  }

  function renderSummary(list){
    const total = computeTotals(list);
    document.getElementById('adminSummaryCards').innerHTML = `
      <div class="summary-card"><div class="val">${list.length}</div><div class="lbl">عدد المشتركين (في الفترة المحددة)</div></div>
      <div class="summary-card"><div class="val">${gTotalsByCcy(list, r => r.amount, r => gMktCcy(r.accountMarket))}</div><div class="lbl">إجمالي السداد${gAdminMarket() ? ' — ' + escapeHtml(gAdminMarket()) : ' (لكل عملة لوحدها)'}</div></div>
      <div class="summary-card"><div class="val">${list.filter(r=>r.planId==='monthly').length}</div><div class="lbl">مشتركين شهري</div></div>
      <div class="summary-card"><div class="val">${list.filter(r=>r.planId==='yearly').length}</div><div class="lbl">مشتركين سنوي</div></div>
      <div class="summary-card"><div class="val">${list.filter(r=>r.planId==='trial').length}</div><div class="lbl">تجربة مجانية</div></div>`;
  }

  function renderTable(list){
    document.getElementById('subscribersTableWrap').innerHTML = list.length ? `<table data-g-rows="5" class="g-one-line">
      <thead><tr>
        <th>الكود</th><th>الاسم</th><th>الهاتف</th><th>الإيميل</th><th>الخطة</th><th>⭐ المميزات</th><th>بداية الخطة</th><th>تاريخ الانتهاء</th><th>قيمة السداد</th><th>طريقة السداد</th><th>الحالة</th><th>التذكيرات</th><th>صلاحيات خاصة</th><th>🔔 الإشعارات</th><th>🤖 الذكاء الاصطناعي</th><th></th>
      </tr></thead>
      <tbody>
        ${list.map(r=>{
          const isActive = r.active !== false;
          const remEnabled = r.reminderEnabled !== false;
          return `<tr>
          <td dir="ltr"><b>${escapeHtml(r.memberCode || '')}</b>${r.staffCode ? ` <span class="u-fs11 u-muted">${escapeHtml(r.staffCode)}</span>` : ''}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.phone)}</td><td dir="ltr">${escapeHtml(r.contactEmail || r.accountEmail)}</td><td class="pk-subplan-td" data-gtext="${escapeHtml(r.planName)}${r.isComp ? ' هدية' : ''}" data-subid="${escapeHtml(String(r.id))}" data-plan="${escapeHtml(r.planId || '')}" data-mkt="${escapeHtml(r.accountMarket || 'مصر')}"><span class="pk-subplan-txt">${escapeHtml(r.planName)}</span>${r.isComp?' <span class="tag" style="background:#e6f4ea;color:var(--green);">هدية</span>':''}</td>
          <td class="pk-td" data-pksub="${escapeHtml(String(r.accountEmail || '').toLowerCase())}">…</td>
          <td>${formatDateAr(r.startDate)}</td><td>${formatDateAr(r.endDate)}</td>
          <td>${r.amount===0?'مجانًا':fmtMoney(r.amount)+' '+r.currency}</td>
          <td>${r.paymentMethod ? escapeHtml(payMethodLabel(r.paymentMethod)) : '-'}
            ${r.paymentProof?` <button class="small secondary u-wa u-mt4" data-gcall="__viewProof" data-gargs="${gArgs([String(r.id)])}">📎 عرض الإثبات</button>`:''}
          </td>
          <td>
            <span class="tag ${isActive?'tag-done':'tag-wait'}">${isActive?'مفعّل':'موقوف'}</span>
            <button class="small ${isActive?'danger':'secondary'} u-wa u-mt4" data-gcall="__toggleSubActive" data-gargs="${gArgs([String(r.id)])}">${isActive?'إيقاف':'تفعيل'}</button>
          </td>
          <td>
            ${remEnabled ? `كل ${r.reminderIntervalDays||2} يوم` : '<span style="color:#c0392b;">موقوف</span>'}
            <button class="small secondary u-wa u-mt4" data-gcall="__editReminder" data-gargs="${gArgs([String(r.id)])}">تعديل</button>
          </td>
          <td>
            <button class="small secondary" style="width:auto;margin-bottom:4px;" data-gcall="__extendDays" data-gargs="${gArgs([String(r.id)])}">+ أيام مجانية</button>
            ${r.planId==='trial' ? `<button class="small btn-lightgreen" style="width:auto;margin-bottom:4px;" data-gcall="__convertFree" data-gargs="${gArgs([String(r.id)])}">تحويل لباقة مدفوعة مجانًا</button>` : ''}
          </td>
          <td>${gNpCellHtml(r.accountEmail)}</td>
          <td>${typeof gAiCellHtml === 'function' ? gAiCellHtml(r.accountEmail) : ''}</td>
          <td><button class="small danger u-wa" data-gcall="__deleteSubRow" data-gargs="${gArgs([String(r.id)])}">🗄️ أرشفة</button></td>
        </tr>`}).join('')}
        <tr style="font-weight:bold;background:#f0f4f2;">
          <td colspan="8">الإجمالي</td><td>${fmtMoney(computeTotals(list))}</td><td colspan="7"></td>
        </tr>
      </tbody>
    </table>` : '<p class="u-note">لا يوجد مشتركين في هذه الفترة.</p>';
    gNpWire(document.getElementById('subscribersTableWrap'));
    if (typeof gAiWire === 'function') gAiWire(document.getElementById('subscribersTableWrap'));   // الإصدار 127
    if (window.pkSubsDecorate) window.pkSubsDecorate(document.getElementById('subscribersTableWrap'), async () => { subscribers = await getAllSubscribers(); refreshAdmin(); });   // الإصدار 138: الباقة + المميزات لكل مشترك

    window.__viewProof = (id) => {
      const rec = list.find(x=>x.id===id) || subscribers.find(x=>x.id===id);
      if(!rec || !rec.paymentProof) return;
      const overlay = document.createElement('div');
      overlay.className = 'proof-modal-overlay';
      overlay.innerHTML = `<div class="proof-modal-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <strong>إثبات السداد — ${escapeHtml(rec.name)}</strong>
          <button class="small secondary u-wa" id="closeProofModalBtn">✕ إغلاق</button>
        </div>
        <img src="${escapeHtml(rec.paymentProof)}" style="max-width:100%;max-height:70vh;border-radius:8px;display:block;margin:0 auto;">
      </div>`;
      document.body.appendChild(overlay);
      overlay.onclick = (e) => { if(e.target===overlay) overlay.remove(); };
      document.getElementById('closeProofModalBtn').onclick = () => overlay.remove();
    };

    window.__toggleSubActive = async (id) => {
      await toggleSubscriberActive(id);
      subscribers = await getAllSubscribers();
      refreshAdmin();
    };

    window.__deleteSubRow = async (id) => {
      if(!await gConfirm('سيُنقل هذا العميل وكل تسجيلاته إلى الأرشيف — يمكنك استرجاعه أو حذفه نهائيًا من صفحة الأرشيف. هل أنت متأكد؟')) return;
      await deleteSubscriber(id);
      subscribers = await getAllSubscribers();
      refreshAdmin();
    };

    window.__extendDays = async (id) => {
      const rec = subscribers.find(x=>x.id===id);
      if(!rec) return;
      const val = await gPrompt(`كم يومًا تريد إضافتها مجانًا لـ"${rec.name}"؟ (تاريخ الانتهاء الحالي: ${formatDateAr(rec.endDate)})`, '30', { type: 'number', ok: 'إضافة الأيام' });
      if(!val || isNaN(val) || +val===0) return;
      const r = await extendSubscriberDays(id, +val);
      if(r.success){
        alert(`تم — تاريخ الانتهاء الجديد: ${formatDateAr(r.newEndDate)}`);
        subscribers = await getAllSubscribers();
        refreshAdmin();
      } else {
        alert(r.message || 'حصل خطأ');
      }
    };


    window.__reviewEmailChange = async (id, decision) => {
      const msg = decision === 'approved' ? 'تأكيد الموافقة على تغيير البريد الإلكتروني؟ سيتغيّر في كل مكان (تسجيل الدخول، الاشتراك).' : 'تأكيد رفض الطلب؟';
      if (!await gConfirm(msg)) return;
      const res = await apiPost('/admin_review_email_change.php', { id, decision });
      if (res && res.success) { alert('تم التنفيذ بنجاح'); renderAdminSubscribers(); }
      else alert((res && res.message) || 'حصل خطأ');
    };

    window.__convertFree = async (id) => {
      const rec = subscribers.find(x=>x.id===id);
      if(!rec) return;
      // الإصدار 84: اختيار واضح بزرارين بدل "موافق = شهري / إلغاء = سنوي" (كان سهل الأدمن يغلط)
      const pick = await gChoice(`تحويل "${rec.name}" من التجربة المجانية لباقة مدفوعة بدون رسوم. اختار الباقة:`, ['الخطة الشهرية', 'الخطة السنوية']);
      if (pick === null) return;
      const planId = pick === 0 ? 'monthly' : 'yearly';
      const planName = pick === 0 ? 'الخطة الشهرية' : 'الخطة السنوية';
      const r = await convertSubscriberFree(id, planId, planName);
      if(r.success){
        alert(`تم التحويل — الخطة الجديدة سارية حتى ${formatDateAr(r.endDate)} بدون أي رسوم.`);
        subscribers = await getAllSubscribers();
        refreshAdmin();
      } else {
        alert(r.message || 'حصل خطأ');
      }
    };

    window.__editReminder = async (id) => {
      const rec = subscribers.find(x=>x.id===id);
      if(!rec) return;
      const currentInterval = rec.reminderIntervalDays || 2;
      const currentEnabled = rec.reminderEnabled !== false;
      const pick = await gChoice(`إعدادات تذكير "${rec.name}"\nحالة الإرسال الحالية: ${currentEnabled?'شغال كل '+currentInterval+' يوم':'موقوف'}`, ['تغيير عدد الأيام', currentEnabled ? 'إيقاف الإرسال' : 'تشغيل الإرسال']);
      if (pick === null) return;
      let newEnabled = currentEnabled, newInterval = currentInterval;
      if(pick === 0){
        const val = await gPrompt('كل كم يومًا يتكرر التذكير لهذا المشترك؟', currentInterval, { type: 'number' });
        if(val && !isNaN(val) && +val>0){
          newInterval = +val;
          newEnabled = true;
        } else { return; }
      } else {
        newEnabled = !currentEnabled;
      }
      await updateSubscriberReminder(id, newEnabled, newInterval);
      subscribers = await getAllSubscribers();
      refreshAdmin();
    };
  }

  function renderMsChecks(list){
    document.getElementById('admSubChecks').innerHTML = list.map(r=>`
      <label class="ms-item"><input type="checkbox" class="admSubCheck" value="${r.id}"> <b dir="ltr">${escapeHtml(r.memberCode || '')}</b> ${escapeHtml(r.name)} — <span dir="ltr">${escapeHtml(r.accountEmail || r.contactEmail || '')}</span> — ${escapeHtml(r.planName)}</label>`).join('') ||
      '<div style="font-size:12px;color:#888;padding:6px;">لا يوجد مشتركين</div>';
  }

  let reminderDefaults = { startBeforeDays:6, intervalDays:2, gracePeriodDays:3 };
  async function loadReminderDefaultsUI(){
    reminderDefaults = await getReminderDefaults();
    document.getElementById('remStartBefore').value = reminderDefaults.startBeforeDays;
    document.getElementById('remInterval').value = reminderDefaults.intervalDays;
    document.getElementById('remGracePeriod').value = reminderDefaults.gracePeriodDays;
  }

  function refreshAdmin(){
    const list = filteredList();
    renderSummary(list);
    renderTable(list);
    renderMsChecks(list);
  }
  refreshAdmin();
  gWireAdminMarket('admSubMarket', () => refreshAdmin());   // الإصدار 96
  loadReminderDefaultsUI();

  document.getElementById('saveRemDefaultsBtn').onclick = async () => {
    const startBeforeDays = parseInt(document.getElementById('remStartBefore').value) || 6;
    const intervalDays = parseInt(document.getElementById('remInterval').value) || 2;
    const gracePeriodDays = parseInt(document.getElementById('remGracePeriod').value);
    const gpd = isNaN(gracePeriodDays) ? 3 : gracePeriodDays;
    await saveReminderDefaults({ startBeforeDays, intervalDays, gracePeriodDays: gpd });
    reminderDefaults = { startBeforeDays, intervalDays, gracePeriodDays: gpd };
    alert('تم حفظ الإعدادات الافتراضية بنجاح');
  };

  document.getElementById('simulateRemindersBtn').onclick = async () => {
    const due = subscribers.filter(r => r.active!==false && isReminderDueToday(r, reminderDefaults));
    document.getElementById('reminderSimResult').innerHTML = due.length ? `
      <div class="info u-mt10">
        <strong>📨 ${due.length} مشترك المفروض ياخد تذكير النهارده (${new Date().toLocaleDateString('ar-EG')}):</strong>
        <ul style="margin:8px 0 0;padding-right:18px;font-size:12.5px;">
          ${due.map(r=>`<li>${escapeHtml(r.name)} (${escapeHtml(r.contactEmail)} / ${escapeHtml(r.phone)}) — ينتهي الاشتراك ${formatDateAr(r.endDate)}</li>`).join('')}
        </ul>
      </div>` : `<div class="info u-mt10">لا يوجد أي مشترك مستحق للتذكير اليوم حسب الإعدادات الحالية.</div>`;
  };

  document.getElementById('sendRemindersNowBtn').onclick = async () => {
    const btn = document.getElementById('sendRemindersNowBtn');
    btn.disabled = true; btn.textContent = 'جاري الإرسال...';
    const r = await sendReminderEmailsNow();
    btn.disabled = false; btn.textContent = '📤 إرسال التذكيرات الآن فعليًا (إيميل)';
    if (r && r.success) {
      document.getElementById('reminderSimResult').innerHTML = `
        <div class="success-banner u-mt10">
          ✅ تم إرسال ${r.sentCount} إيميل تذكير فعليًا.
          ${r.log && r.log.length ? `<ul style="margin:8px 0 0;padding-right:18px;font-size:12.5px;">
            ${r.log.map(x=>`<li>${escapeHtml(x.name)} (${escapeHtml(x.email)}) — متبقي ${x.daysLeft} يوم — ${x.sent?'✅ أُرسلت':'❌ فشل الإرسال'}</li>`).join('')}
          </ul>` : '<div style="font-size:12.5px;margin-top:6px;">لا يوجد أي مشترك مستحق للتذكير الآن.</div>'}
        </div>`;
    } else {
      document.getElementById('reminderSimResult').innerHTML = `<div class="error u-mt10">${(r&&r.message)||'حصل خطأ في الإرسال'}</div>`;
    }
  };

  document.getElementById('admPresetDaily').onclick=()=>{ currentFrom=isoDaysAgo(0); currentTo=isoDaysAgo(0); document.getElementById('admFrom').value=currentFrom; document.getElementById('admTo').value=currentTo; setActiveAdminPreset(document.getElementById('admPresetDaily')); refreshAdmin(); };
  document.getElementById('admPresetWeekly').onclick=()=>{ currentFrom=isoDaysAgo(7); currentTo=isoDaysAgo(0); document.getElementById('admFrom').value=currentFrom; document.getElementById('admTo').value=currentTo; setActiveAdminPreset(document.getElementById('admPresetWeekly')); refreshAdmin(); };
  document.getElementById('admPresetMonthly').onclick=()=>{ currentFrom=isoDaysAgo(30); currentTo=isoDaysAgo(0); document.getElementById('admFrom').value=currentFrom; document.getElementById('admTo').value=currentTo; setActiveAdminPreset(document.getElementById('admPresetMonthly')); refreshAdmin(); };
  document.getElementById('admPresetAll').onclick=()=>{ currentFrom=null; currentTo=null; document.getElementById('admFrom').value=''; document.getElementById('admTo').value=''; setActiveAdminPreset(document.getElementById('admPresetAll')); refreshAdmin(); };
  ['admFrom','admTo'].forEach(id=>{
    document.getElementById(id).addEventListener('change', ()=>{
      currentFrom = document.getElementById('admFrom').value || null;
      currentTo = document.getElementById('admTo').value || null;
      setActiveAdminPreset(null);
      refreshAdmin();
    });
  });

  document.getElementById('admMsToggleBtn').onclick = (e) => {
    e.stopPropagation();
    const panel = document.getElementById('admMsPanel');
    panel.style.display = panel.style.display==='none' ? 'block' : 'none';
  };
  document.getElementById('admMsDoneBtn').onclick = () => { document.getElementById('admMsPanel').style.display='none'; };
  document.addEventListener('click', (e)=>{
    const dd = document.getElementById('admMsDropdown');
    if (dd && !dd.contains(e.target)) document.getElementById('admMsPanel').style.display = 'none';
  });
  document.getElementById('admSelectAll').addEventListener('change', (e)=>{
    document.querySelectorAll('.admSubCheck').forEach(cb=>{ cb.checked = e.target.checked; });
  });

  document.getElementById('admAddTestBtn').onclick = async () => {
    const names = ['محمد أحمد','سارة علي','خالد إبراهيم','منى سعيد','يوسف حسن'];
    const plansArr = [{id:'monthly',name:'الخطة الشهرية',amount:100},{id:'yearly',name:'الخطة السنوية',amount:1000},{id:'trial',name:'تجربة مجانية',amount:0}];
    const p = plansArr[Math.floor(Math.random()*plansArr.length)];
    const startDate = new Date().toISOString().split('T')[0];
    const record = {
      id: 'sub_' + Date.now() + '_' + Math.floor(Math.random()*10000),
      accountEmail: email, name: names[Math.floor(Math.random()*names.length)],
      phone: '010'+Math.floor(10000000+Math.random()*89999999),
      contactEmail: 'test'+Math.floor(Math.random()*1000)+'@example.com',
      planId: p.id, planName: p.name, amount: p.amount, currency:'جنيه مصري', market:'مصر',
      paymentMethod:'wallet', paymentRef:'TEST-'+Math.floor(Math.random()*99999),
      startDate, endDate: computeSubscriptionEndDate(startDate, p.id), createdAt: startDate,
    };
    await addSubscriberRecord(record);
    subscribers = await getAllSubscribers();
    refreshAdmin();
  };

  document.getElementById('admPrintBtn').onclick = () => {
    const selectedIds = Array.from(document.querySelectorAll('.admSubCheck:checked')).map(cb=>cb.value);
    const list = filteredList().filter(r => selectedIds.length===0 || selectedIds.includes(r.id));
    const total = computeTotals(list);
    const periodLabel = (currentFrom && currentTo) ? `${formatDateAr(currentFrom)} إلى ${formatDateAr(currentTo)}` : 'كل الفترة';
    const rowsHtml = list.map(r=>`<tr>
      <td dir="ltr">${escapeHtml(r.memberCode || '')}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.phone)}</td><td dir="ltr">${escapeHtml(r.contactEmail || r.accountEmail)}</td><td>${escapeHtml(r.planName)}</td>
      <td>${formatDateAr(r.startDate)}</td><td>${formatDateAr(r.endDate)}</td>
      <td>${r.amount===0?'مجانًا':fmt2(r.amount)+' '+r.currency}</td>
    </tr>`).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>بيان المشتركين</title>
      <style>body{font-family:IBM Plex Sans Arabic,Tahoma,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin-top:14px;}
      th,td{border:1px solid #ccc;padding:7px;text-align:center;font-size:12px;} th{background:#14532d;color:#fff;}
      h1{color:#14532d;} .agg{margin-top:16px;font-size:14px;background:#f0f4f2;padding:10px;border-radius:8px;}</style></head>
      <body>
      ${reportLogoHeaderHtml()}
      <h1>GRIFFINE — بيان المشتركين</h1>
      <p>الفترة: ${periodLabel} | عدد المشتركين: ${list.length} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
      <table><thead><tr><th>الكود</th><th>الاسم</th><th>الهاتف</th><th>الإيميل</th><th>الخطة</th><th>بداية الخطة</th><th>تاريخ الانتهاء</th><th>قيمة السداد</th></tr></thead>
      <tbody>${rowsHtml}</tbody></table>
      <div class="agg"><strong>إجمالي السداد لكل العملاء:</strong> ${fmt2(total)}</div>
      
      </body></html>`);
    w.document.close(); gReportReady(w);
  };

  document.getElementById('admExportXlsBtn').onclick = () => {
    const selectedIds = Array.from(document.querySelectorAll('.admSubCheck:checked')).map(cb=>cb.value);
    const list = filteredList().filter(r => selectedIds.length===0 || selectedIds.includes(r.id));
    const total = computeTotals(list);
    const periodLabel = (currentFrom && currentTo) ? `${formatDateAr(currentFrom)} إلى ${formatDateAr(currentTo)}` : 'كل الفترة';

    const th = "background:#14532D;color:#ffffff;font-weight:bold;border:1px solid #000000;padding:6px 10px;text-align:center;";
    const td = "border:1px solid #999999;padding:5px 10px;text-align:center;";
    const totalTd = "border:1px solid #000000;padding:6px 10px;text-align:center;font-weight:bold;background:#E6F4EA;";
    const titleTd = "background:#14532D;color:#ffffff;font-weight:bold;font-size:16px;padding:10px;text-align:center;";

    const rowsHtml = list.map(r=>`<tr>
      <td style="${td}">${escapeHtml(r.memberCode || '')}</td><td style="${td}">${escapeHtml(r.name)}</td><td style="${td}">${escapeHtml(r.phone)}</td><td style="${td}">${escapeHtml(r.contactEmail || r.accountEmail)}</td>
      <td style="${td}">${escapeHtml(r.planName)}</td><td style="${td}">${formatDateAr(r.startDate)}</td><td style="${td}">${formatDateAr(r.endDate)}</td>
      <td style="${td}">${r.amount.toFixed(2)}</td>
    </tr>`).join('');

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>المشتركين</x:Name><x:WorksheetOptions><x:RTL/><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml></head><body dir="rtl">
      <table style="border-collapse:collapse;font-family:IBM Plex Sans Arabic,Tahoma,Arial;direction:rtl;" dir="rtl">
        <tr><td colspan="8" style="${titleTd}">GRIFFINE — بيان المشتركين</td></tr>
        <tr><td colspan="8" style="border:none;padding:6px;">الفترة: ${periodLabel} | عدد المشتركين: ${list.length}</td></tr>
        <tr><td colspan="7" class="u-bn"></td></tr>
        <tr>
          <td style="${th}">الكود</td><td style="${th}">الاسم</td><td style="${th}">الهاتف</td><td style="${th}">الإيميل</td><td style="${th}">الخطة</td>
          <td style="${th}">بداية الخطة</td><td style="${th}">تاريخ الانتهاء</td><td style="${th}">قيمة السداد</td>
        </tr>
        ${rowsHtml}
        <tr><td colspan="7" style="${totalTd}">الإجمالي</td><td style="${totalTd}">${total.toFixed(2)}</td></tr>
      </table>
      </body></html>`;
    const blob = new Blob(['\ufeff'+html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `griffine_بيان_المشتركين.xls`;
    a.click(); URL.revokeObjectURL(url);
  };
}

/* ================== أرشيف العملاء المحذوفين ================== */
async function renderArchivedCustomers(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderArchivedCustomers());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('manage_subscribers')) return renderAdminHub();

  let archived = [];
  const res = await getArchivedCustomers();
  if (res && res.success) archived = res.archived;

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('archived_customers','🗄️ أرشيف العملاء المحذوفين')}</div>
      <button class="secondary small" id="backToAdminBtn">🛡️ رجوع للوحة التحكم</button>
    </div>
    <div class="info">العملاء هنا محذوفون من كل صفحات الموقع وتسجيلاته الحالية. يمكنك استرجاعهم في أي وقت، أو حذفهم نهائيًا بلا رجعة. إذا سجّل أي منهم في الموقع مرة أخرى بالبريد نفسه، فسيُعامل كأنه أول مرة.</div>
    <div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="archivedSearch" placeholder="🔍 ابحث بالاسم أو الإيميل أو الهاتف..."></div>
    </div>
    <div class="section-card" id="archivedTableWrap"></div>
  </div>`;

  document.getElementById('backToAdminBtn').onclick=()=>goAdminHome();

  function renderArchivedTable(){
    const q = (document.getElementById('archivedSearch')?.value || '').trim().toLowerCase();
    const visible = q ? archived.filter(r => (r.name||'').toLowerCase().includes(q) || (r.accountEmail||'').toLowerCase().includes(q) || (r.phone||'').toLowerCase().includes(q)) : archived;
    document.getElementById('archivedTableWrap').innerHTML = archived.length===0 ? '<p class="u-note">الأرشيف فارغ حاليًا.</p>'
      : (visible.length ? `<table>
      <thead><tr><th>الاسم</th><th>الإيميل</th><th>الهاتف</th><th>آخر باقة</th><th>بداية</th><th>نهاية</th><th></th></tr></thead>
      <tbody>
        ${visible.map(r=>`<tr>
          <td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.accountEmail)}</td><td>${escapeHtml(r.phone)}</td><td>${escapeHtml(r.planName)}</td>
          <td>${formatDateAr(r.startDate)}</td><td>${formatDateAr(r.endDate)}</td>
          <td>
            <button class="small btn-lightgreen u-wa" data-gcall="__restoreCustomer" data-gargs="${gArgs([String(r.accountEmail)])}">↩️ استرجاع</button>
            <button class="small danger u-wa" data-gcall="__purgeCustomer" data-gargs="${gArgs([String(r.accountEmail)])}">🗑️ حذف نهائي</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p class="std-filter-empty">لا توجد نتائج مطابقة للبحث</p>');
  }
  renderArchivedTable();
  const archivedSearchEl = document.getElementById('archivedSearch');
  if (archivedSearchEl) archivedSearchEl.addEventListener('input', renderArchivedTable);

  window.__restoreCustomer = async (accountEmail) => {
    if(!await gConfirm(`استرجاع "${accountEmail}" من الأرشيف؟`)) return;
    const r = await restoreCustomer(accountEmail);
    if(r.success){
      archived = archived.filter(x=>x.accountEmail!==accountEmail);
      renderArchivedTable();
    } else {
      alert(r.message || 'حصل خطأ');
    }
  };

  window.__purgeCustomer = async (accountEmail) => {
    if(!await gConfirm(`حذف "${accountEmail}" مع كل سجلاته؟ سينتقل إلى سلة المحذوفات ويمكن استرجاعه منها.`)) return;
    const r = await purgeCustomer(accountEmail);
    if(r.success){
      archived = archived.filter(x=>x.accountEmail!==accountEmail);
      renderArchivedTable();
    } else {
      alert(r.message || 'حصل خطأ');
    }
  };
}

/* ================== القائمة السوداء ================== */
/* ================== صلاحيات وإعدادات إلزامية (تفعيل/إيقاف كل قاعدة إلزامية في الموقع) ================== */
/* ================== لوحة محادثات الشات (للمدير) ================== */
/* ================== إدارة الخطط والأسعار (صلاحيات الأدمن) ================== */
async function renderPlansManagementPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderPlansManagementPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('manage_plans')) return renderAdminHub();

  let plans = [];

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('plans_management','💳 إدارة الخطط والأسعار')}</div>
      <button class="secondary small" id="backToAdminFromPlansBtn">🛡️ رجوع للوحة التحكم</button>
    </div>
    <div class="info">أي تعديل هنا (سعر، إيقاف، حذف) يؤثر فقط على الاشتراكات الجديدة من الآن — ولا يغيّر شيئًا في اشتراكات العملاء السارية حاليًا، لأن بياناتها تُحفظ مستقلة وقت الاشتراك. يمكنك استخدام ذلك لعمل عروض وتخفيضات في أي وقت.</div>

    ${gAdminMarketBarHtml('plansMarket')}
    <div class="info">كل باقة تتبع سوقًا واحدًا، وسعرها بعملة هذا السوق. العميل يرى باقات بورصة حسابه فقط. يمكنك تجهيز باقات سوق غير مفعّل مسبقًا.</div>
    <h2>الخطط الحالية</h2>
    <div class="section-card" id="plansListWrap"></div>

    <h2 class="u-mt20" id="formTitle">إضافة خطة جديدة</h2>
    <div class="section-card">
      <form id="planForm">
        <label>معرّف الخطة (حروف إنجليزية وأرقام فقط، بدون مسافات - مثل monthly)</label>
        <input type="text" id="planIdInput" required placeholder="مثال: quarterly">
        <label>السوق (الباقة وسعرها بعملته)</label>
        <select id="planMarketInput" data-g-mkt="skip">${Object.entries((window.__acct && window.__acct.markets) || { 'مصر': { ccyAr: 'جنيه مصري', active: true } }).map(([m, x]) => `<option value="${escapeHtml(m)}">${escapeHtml(m)} — ${escapeHtml(x.ccyAr)}${x.active ? '' : ' (غير مفعّل)'}</option>`).join('')}</select>
        <label>اسم الخطة</label>
        <input type="text" id="planNameInput" required placeholder="مثال: الخطة ربع السنوية">
        <label>السعر</label>
        <input type="number" id="planAmountInput" step="0.01" min="0" required placeholder="0 للمجانية">
        <label>نص المدة المعروض للعميل (مثال: شهريًا / سنويًا / ٩٠ يوم)</label>
        <input type="text" id="planPeriodInput" required placeholder="مثال: كل 3 شهور">
        <label>عدد أيام الاشتراك الفعلي</label>
        <input type="number" id="planDurationInput" min="1" required placeholder="مثال: 90">
        <label>شارة اختيارية (تظهر أعلى البطاقة، مثل "الأكثر توفيرًا")</label>
        <input type="text" id="planBadgeInput" placeholder="اختياري">
        <label>ملاحظة توفير اختيارية (تظهر أسفل السعر)</label>
        <input type="text" id="planSaveNoteInput" placeholder="اختياري">
        <label>المميزات (سطر لكل ميزة)</label>
        <textarea id="planFeaturesInput" rows="4" placeholder="ميزة 1&#10;ميزة 2&#10;ميزة 3"></textarea>
        <label>ترتيب الظهور (رقم أصغر = يظهر الأول)</label>
        <input type="number" id="planSortInput" value="0">
        <label class="u-check u-mt8"><input type="checkbox" id="planAiInput"> ✨ باقة شاملة خدمات الذكاء الاصطناعي (برو) — مشتركينها بيستخدموا الـ AI المدفوع لو مفعّل من «الذكاء الاصطناعي»</label>
        <button type="submit" id="planFormSubmitBtn">حفظ الخطة</button>
        <button type="button" class="secondary" id="planFormCancelBtn" style="display:none;">إلغاء التعديل</button>
      </form>
    </div>
  </div>`;

  document.getElementById('backToAdminFromPlansBtn').onclick=()=>goAdminHome();

  let editingId = null;
  function resetForm(){
    editingId = null;
    document.getElementById('formTitle').textContent = 'إضافة خطة جديدة';
    document.getElementById('planForm').reset();
    document.getElementById('planMarketInput').value = gAdminMarket() || 'مصر';
    document.getElementById('planIdInput').disabled = false;
    document.getElementById('planFormSubmitBtn').textContent = 'حفظ الخطة';
    document.getElementById('planFormCancelBtn').style.display = 'none';
  }

  async function refreshPlansList(){
    const wrap = document.getElementById('plansListWrap');
    const res = await getPlansAdminList();
    const mf = gAdminMarket();   // الإصدار 96: باقات السوق المختار
    plans = ((res && res.success) ? res.plans : []).filter(p => !mf || (p.market || 'مصر') === mf);
    const ccyOfM = (m) => ((window.__acct && window.__acct.markets && window.__acct.markets[m || 'مصر']) || {}).ccy || '';
    wrap.innerHTML = plans.length ? `<table>
      <thead><tr><th>السوق</th><th>الاسم</th><th>السعر</th><th>المدة</th><th>الحالة</th><th>المميزات</th><th></th></tr></thead>
      <tbody>
        ${plans.map(p=>`<tr>
          <td>${escapeHtml(p.market || 'مصر')}</td>
          <td>${escapeHtml(p.name)} ${p.includesAi ? '<span class="tag tag-done">✨ AI</span> ' : ''}${p.badge?`<span class="tag" style="background:#e6f4ea;color:var(--green);">${escapeHtml(p.badge)}</span>`:''}</td>
          <td>${p.amount===0?'مجانًا':fmtMoney(p.amount) + ' ' + ccyOfM(p.market)}</td>
          <td>${escapeHtml(p.periodLabel)} (${p.durationDays} يوم)</td>
          <td><span class="tag ${p.isActive?'tag-done':'tag-wait'}">${p.isActive?'مفعّلة':'موقوفة'}</span></td>
          <td class="pk-td" data-pkplan="${escapeHtml(String(p.id))}">…</td>
          <td style="white-space:nowrap;">
            <button class="small secondary u-wa" data-gcall="__editPlan" data-gargs="${gArgs([String(p.id)])}">تعديل</button>
            <button class="small ${p.isActive?'danger':'btn-lightgreen'} u-wa" data-gcall="__togglePlan" data-gargs="${gArgs([String(p.id)])}">${p.isActive?'إيقاف':'تفعيل'}</button>
            <button class="small danger u-wa" data-gcall="__deletePlan" data-gargs="${gArgs([String(p.id)])}">حذف</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p class="u-note">لا توجد خطط مضافة بعد.</p>';
    if (window.pkAdminDecorate) window.pkAdminDecorate(wrap, plans);   // الإصدار 135: مميزات كل باقة (قائمة منسدلة)
  }
  await refreshPlansList();
  document.getElementById('planMarketInput').value = gAdminMarket() || 'مصر';
  gWireAdminMarket('plansMarket', () => { refreshPlansList(); if (!editingId) document.getElementById('planMarketInput').value = gAdminMarket() || 'مصر'; });

  window.__editPlan = (id) => {
    const p = plans.find(x=>x.id===id);
    if (!p) return;
    editingId = id;
    document.getElementById('formTitle').textContent = 'تعديل خطة: ' + p.name;
    document.getElementById('planIdInput').value = p.id;
    document.getElementById('planIdInput').disabled = true; // غير ممكن تغيّر المعرّف وقت التعديل
    document.getElementById('planMarketInput').value = p.market || 'مصر';
    document.getElementById('planNameInput').value = p.name;
    document.getElementById('planAmountInput').value = p.amount;
    document.getElementById('planPeriodInput').value = p.periodLabel;
    document.getElementById('planDurationInput').value = p.durationDays;
    document.getElementById('planBadgeInput').value = p.badge || '';
    document.getElementById('planSaveNoteInput').value = p.saveNote || '';
    document.getElementById('planFeaturesInput').value = (p.features||[]).join('\n');
    document.getElementById('planSortInput').value = p.sortOrder || 0;
    document.getElementById('planAiInput').checked = !!p.includesAi;
    document.getElementById('planFormSubmitBtn').textContent = 'حفظ التعديلات';
    document.getElementById('planFormCancelBtn').style.display = 'inline-block';
    window.scrollTo({top: document.getElementById('formTitle').offsetTop, behavior:'smooth'});
  };

  window.__togglePlan = async (id) => {
    await togglePlanActive(id);
    refreshPlansList();
  };

  window.__deletePlan = async (id) => {
    if(!await gConfirm('حذف هذه الخطة؟ (تنتقل إلى سلة المحذوفات ويمكن استرجاعها) لن يتأثر العملاء الحاليون على هذه الخطة، لكن لن يتمكن أحد من الاشتراك فيها مرة أخرى.')) return;
    await deletePlan(id);
    if (editingId===id) resetForm();
    refreshPlansList();
  };

  document.getElementById('planFormCancelBtn').onclick = resetForm;

  document.getElementById('planForm').onsubmit = async (e) => {
    e.preventDefault();
    const plan = {
      id: document.getElementById('planIdInput').value.trim(),
      name: document.getElementById('planNameInput').value.trim(),
      market: document.getElementById('planMarketInput').value,
      amount: parseFloat(document.getElementById('planAmountInput').value) || 0,
      periodLabel: document.getElementById('planPeriodInput').value.trim(),
      durationDays: parseInt(document.getElementById('planDurationInput').value) || 30,
      badge: document.getElementById('planBadgeInput').value.trim(),
      saveNote: document.getElementById('planSaveNoteInput').value.trim(),
      features: document.getElementById('planFeaturesInput').value.trim(),
      sortOrder: parseInt(document.getElementById('planSortInput').value) || 0,
      includesAi: document.getElementById('planAiInput').checked ? '1' : '0',
    };
    const btn = document.getElementById('planFormSubmitBtn');
    btn.disabled = true;
    const r = await savePlan(plan);
    btn.disabled = false;
    if (r.success){
      resetForm();
      refreshPlansList();
    } else {
      alert(r.message || 'حصل خطأ في الحفظ');
    }
  };
}

async function renderChatAdminPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderChatAdminPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('view_chat')) return renderAdminHub();

  if (window.__chatAdminListPoll) clearInterval(window.__chatAdminListPoll);
  if (window.__chatAdminMsgPoll) clearInterval(window.__chatAdminMsgPoll);
  if (window.__chatAdminHeartbeat) clearInterval(window.__chatAdminHeartbeat);

  let conversations = [];
  let openVisitorId = null;
  let currentView = 'active'; // active | archived | trash

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('chat_admin','💬 الدردشة الفورية')} <span style="color:var(--green);font-size:11px;">🟢 أنت متصل الآن</span></div>
      <button class="secondary small" id="backToAdminFromChatBtn">🛡️ رجوع للوحة التحكم</button>
    </div>
    <div class="info">الشات هنا مباشر بينك وبين العميل. تصلك رسالة تنبيه على info@griffine.app عندما يبدأ عميل محادثة جديدة (وليس مع كل رسالة). عند انتهاء المحادثة اضغط "📧 إنهاء وإرسال نسخة" وستصلك كاملة مع الصور والملفات كمرفقات. فتح المحادثة يجعلها مقروءة تلقائيًا. لا يستطيع العميل إرسال صور أو ملفات إلا عندما تضغط "افتح للعميل رفع ملف/صورة"، وبجانبه تكتب أقصى حجم للملف بالميجا (مثلًا 100 أو 500) - ويُغلق تلقائيًا عند إنهاء المحادثة. التنبيهات نقطة حمراء + صوت على أيقونة الشات (دون رسائل منبثقة). تتحدّث المحادثات كل 3 ثوانٍ.</div>
    <div class="radio-row std-filter-tabs u-mb10">
      <button class="small secondary period-preset std-filter-tab btn-active" id="tabActiveBtn">المحادثات النشطة</button>
      <button class="small secondary period-preset std-filter-tab" id="tabArchivedBtn">🗄️ الأرشيف</button>
      <button class="small secondary period-preset std-filter-tab" id="tabTrashBtn">🗑️ سلة المحذوفات</button>
      <button class="small secondary" id="chatMarkAllReadBtn" style="width:auto;margin-inline-start:auto;">✓ تعليم الكل كمقروء</button>
      ${hasPermission('manage_admin_settings') ? '<button class="small secondary u-wa" id="chatNotifySettingsBtn">🔔 إعدادات التنبيهات</button>' : ''}
    </div>
    <div class="section-card chat-notify-admin" id="chatNotifyAdminWrap" style="display:none;"></div>
    <div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="chatConvSearch" placeholder="🔍 ابحث بالإيميل أو آخر رسالة..."></div>
    </div>
    <div class="grid2" style="align-items:start;">
      <div class="section-card" id="conversationsListWrap" style="max-height:520px;overflow-y:auto;"></div>
      <div class="section-card" id="conversationDetailWrap"><p class="u-note">اختر محادثة من القائمة.</p></div>
    </div>
  </div>`;
  document.getElementById('chatConvSearch').addEventListener('input', () => renderConvList());

  document.getElementById('backToAdminFromChatBtn').onclick=()=>{
    if (window.__chatAdminListPoll) { clearInterval(window.__chatAdminListPoll); window.__chatAdminListPoll = null; }
    if (window.__chatAdminMsgPoll) { clearInterval(window.__chatAdminMsgPoll); window.__chatAdminMsgPoll = null; }
    if (window.__chatAdminHeartbeat) { clearInterval(window.__chatAdminHeartbeat); window.__chatAdminHeartbeat = null; }
    goAdminHome();
  };

  function setTab(view){
    currentView = view;
    openVisitorId = null;
    document.getElementById('conversationDetailWrap').innerHTML = '<p class="u-note">اختر محادثة من القائمة.</p>';
    document.querySelectorAll('.period-preset').forEach(b=>b.classList.remove('btn-active'));
    document.getElementById({active:'tabActiveBtn', archived:'tabArchivedBtn', trash:'tabTrashBtn'}[view]).classList.add('btn-active');
    refreshList();
  }
  document.getElementById('tabActiveBtn').onclick = () => setTab('active');
  document.getElementById('tabArchivedBtn').onclick = () => setTab('archived');
  document.getElementById('tabTrashBtn').onclick = () => setTab('trash');
  const notifyBtn = document.getElementById('chatNotifySettingsBtn');
  if (notifyBtn) notifyBtn.onclick = () => {
    const w = document.getElementById('chatNotifyAdminWrap');
    if (w.style.display === 'none') { w.style.display = ''; renderChatNotifyAdmin(w); } else w.style.display = 'none';
  };
  document.getElementById('chatMarkAllReadBtn').onclick = async () => {
    await markAllChatRead();
    await refreshList();
    refreshChatUnreadIndicators();
  };

  // "أنا متصل الآن" - بيتحدث كل 30 ثانية طول ما الصفحة دي مفتوحة عشان العملاء يشوفوا إنك موجود
  await sendChatAdminHeartbeat();
  window.__chatAdminHeartbeat = setInterval(sendChatAdminHeartbeat, 30000);

  function renderConvList(){
    const wrap = document.getElementById('conversationsListWrap');
    if (!wrap) return;
    const q = (document.getElementById('chatConvSearch')?.value || '').trim().toLowerCase();
    const visible = q ? conversations.filter(c => (c.email||'').toLowerCase().includes(q) || (c.lastMessage||'').toLowerCase().includes(q)) : conversations;
    if (!conversations.length) {
      wrap.innerHTML = `<p class="u-note">${currentView==='trash'?'سلة المحذوفات فارغة.':currentView==='archived'?'الأرشيف فارغ.':'لا يوجد محادثات نشطة.'}</p>`;
    } else if (!visible.length) {
      wrap.innerHTML = '<p class="std-filter-empty">لا توجد محادثات مطابقة للبحث</p>';
    } else {
      wrap.innerHTML = visible.map(c=>`
      <div class="plan-list-item ${c.visitorId===openVisitorId?'selected':''} ${c.unread?'chat-unread':''}" data-vid="${escapeHtml(c.visitorId)}" style="cursor:pointer;">
        <div><strong>${c.unread ? '<span class="chat-unread-dot" title="غير مقروءة"></span>' : ''}${escapeHtml(c.email || 'زائر بدون إيميل')}</strong> ${chatKindBadge(c)}${c.allowUpload ? ' <span title="رفع الملفات مفتوح للعميل">📎</span>' : ''}<div class="u-fs11 u-muted">${escapeHtml((c.lastMessage||'').substring(0,40))}${(c.lastMessage||'').length>40?'...':''}</div></div>
        <div style="font-size:10px;color:#aaa;">${formatChatTime(c.lastAt)}</div>
      </div>`).join('');
    }
    document.querySelectorAll('#conversationsListWrap .plan-list-item').forEach(el=>{
      el.onclick = () => renderConversationDetail(el.dataset.vid, conversations.find(c=>c.visitorId===el.dataset.vid));
    });
  }
  async function refreshList(){
    const wrap = document.getElementById('conversationsListWrap');
    if (!wrap) return; // الصفحة اتغيّرت
    const res = await getChatConversations(currentView);
    conversations = (res && res.success) ? res.conversations : [];
    renderConvList();
  }
  await refreshList();
  window.__chatAdminListPoll = setInterval(refreshList, 4000);

  async function renderConversationDetail(visitorId, convInfo){
    openVisitorId = visitorId;
    if (window.__chatAdminMsgPoll) clearInterval(window.__chatAdminMsgPoll);
    // فتح المحادثة = اتقرت (على السيرفر) ← العلامة الحمرا والرقم بيختفوا فورًا
    if (window.__adminChatSeen && convInfo) window.__adminChatSeen(convInfo.lastAt);
    if (currentView === 'active') {
      markChatRead(visitorId).then(() => {
        const c = conversations.find(x => x.visitorId === visitorId); if (c) c.unread = false;
        renderConvList(); refreshChatUnreadIndicators();
      });
    }
    const detail = document.getElementById('conversationDetailWrap');

    let actionsHtml = '';
    if (currentView === 'active') {
      actionsHtml = `
        <button class="small secondary u-wa" id="chatEndConvBtn">📧 إنهاء وإرسال نسخة</button>
        <button class="small secondary u-wa" id="chatArchiveBtn">🗄️ أرشفة</button>
        <button class="small danger u-wa" id="chatDeleteBtn">🗑️ حذف</button>`;
    } else if (currentView === 'archived') {
      actionsHtml = `
        <button class="small btn-lightgreen u-wa" id="chatUnarchiveBtn">↩️ رجوع للنشطة</button>
        <button class="small danger u-wa" id="chatDeleteBtn">🗑️ حذف</button>`;
    } else {
      actionsHtml = `
        <button class="small btn-lightgreen u-wa" id="chatRestoreBtn">↩️ استرجاع</button>
        <button class="small danger u-wa" id="chatPurgeBtn">🗑️ حذف نهائي</button>`;
    }

    // الإصدار 83: حالة الرفع + أقصى حجم بالميجا (بيتكتب جنب زرار الفتح)
    const upState = { on: !!(convInfo && convInfo.allowUpload), mb: +(convInfo && convInfo.maxUploadMb) || CHAT_DEFAULT_UPLOAD_MB,
      onChange: (st) => { const c = conversations.find(x => x.visitorId === visitorId); if (c) { c.allowUpload = st.on; c.maxUploadMb = st.mb; } renderConvList(); } };
    detail.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
        <div style="font-size:13px;font-weight:bold;">${escapeHtml((convInfo&&convInfo.email) || 'زائر بدون إيميل')} ${convInfo ? chatKindBadge(convInfo) : ''}</div>
        <div>${actionsHtml}</div>
      </div>
      ${currentView === 'active' ? `<div class="u-mb8">${chatUploadBtnHtml('chatUploadToggle', upState.on, upState.mb)}</div>` : ''}
      <div id="chatAdminMsgs" class="chat-body" style="max-height:360px;overflow-y:auto;border-radius:8px;padding:10px;"></div>
      ${currentView === 'active' ? `
      <div class="chat-attach-chip" id="chatAdminAttachChip" style="display:none;"></div>
      <div style="display:flex;gap:6px;margin-top:10px;align-items:center;">
        <label class="chat-attach-label" for="chatAdminFile" title="إرسال صورة / PDF / فيديو / ملف للعميل">📎</label>
        <input type="file" id="chatAdminFile" accept="${CHAT_FILE_ACCEPT}" style="display:none;">
        <input type="text" id="chatAdminReplyInput" placeholder="اكتب الرد..." style="flex:1;margin:0;">
        <button id="chatAdminReplyBtn" class="u-wa u-m0">إرسال</button>
      </div>` : ''}`;
    wireChatUploadBtn('chatUploadToggle', visitorId, upState);
    const adminAttach = wireAdminAttach('chatAdminFile', 'chatAdminAttachChip');

    const endBtn = document.getElementById('chatEndConvBtn');
    if (endBtn) endBtn.onclick = async () => {
      if(!await gConfirm('سيتم إرسال نسخة كاملة من هذه المحادثة إلى info@griffine.app. متأكد؟')) return;
      const r = await endChatConversation(visitorId);
      alert(r.message || (r.success ? 'تم إرسال نسخة المحادثة بالإيميل.' : 'حصل خطأ'));
      // الإصدار 82: إنهاء المحادثة بيقفل رفع الملفات عند العميل تلقائيًا
      syncChatUploadCtl('chatUploadToggle', visitorId, upState, { success: true, allowUpload: false });
      refreshList();
    };
    const archiveBtn = document.getElementById('chatArchiveBtn');
    if (archiveBtn) archiveBtn.onclick = async () => {
      await archiveChatConversation(visitorId);
      openVisitorId = null;
      detail.innerHTML = '<p class="u-note">اختر محادثة من القائمة.</p>';
      refreshList();
    };
    const unarchiveBtn = document.getElementById('chatUnarchiveBtn');
    if (unarchiveBtn) unarchiveBtn.onclick = async () => {
      await unarchiveChatConversation(visitorId);
      openVisitorId = null;
      detail.innerHTML = '<p class="u-note">اختر محادثة من القائمة.</p>';
      refreshList();
    };
    const deleteBtn = document.getElementById('chatDeleteBtn');
    if (deleteBtn) deleteBtn.onclick = async () => {
      if(!await gConfirm('سيتم نقل هذه المحادثة إلى سلة المحذوفات. يمكنك استرجاعها لاحقًا. هل أنت متأكد؟')) return;
      await deleteChatConversation(visitorId);
      openVisitorId = null;
      detail.innerHTML = '<p class="u-note">اختر محادثة من القائمة.</p>';
      refreshList();
    };
    const restoreBtn = document.getElementById('chatRestoreBtn');
    if (restoreBtn) restoreBtn.onclick = async () => {
      await restoreChatConversation(visitorId);
      openVisitorId = null;
      detail.innerHTML = '<p class="u-note">اختر محادثة من القائمة.</p>';
      refreshList();
    };
    const purgeBtn = document.getElementById('chatPurgeBtn');
    if (purgeBtn) purgeBtn.onclick = async () => {
      if(!await gConfirm('حذف كل رسائل هذه المحادثة؟ ستنتقل إلى سلة المحذوفات ويمكن استرجاعها منها.')) return;
      await purgeChatConversation(visitorId);
      openVisitorId = null;
      detail.innerHTML = '<p class="u-note">اختر محادثة من القائمة.</p>';
      refreshList();
    };

    let lastCount = -1;
    async function refreshMsgs(){
      const msgsWrap = document.getElementById('chatAdminMsgs');
      if (!msgsWrap) return; // اتقفلت أو اتغيّرت المحادثة
      const res2 = await getChatHistory(visitorId);
      const msgs = (res2 && res2.success) ? res2.messages : [];
      // حالة رفع الملفات ممكن تتغيّر من جهاز تاني / إنهاء المحادثة
      syncChatUploadCtl('chatUploadToggle', visitorId, upState, res2);
      if (msgs.length === lastCount) return;
      // رسايل جديدة وصلت والمحادثة مفتوحة قدام الأدمن ← تتعلم مقروءة تلقائيًا
      // الإصدار 80: بس لو المحادثة قدام الأدمن فعلًا (الصفحة ظاهرة ومركّز عليها) - مش مفتوحة في تبويب منسي
      if (lastCount !== -1 && msgs.length > lastCount && currentView === 'active' && !document.hidden && document.hasFocus()) markChatRead(visitorId).then(refreshChatUnreadIndicators);
      lastCount = msgs.length;
      const wasNearBottom = (msgsWrap.scrollHeight - msgsWrap.scrollTop - msgsWrap.clientHeight) < 40;
      chatRenderInto(msgsWrap, msgs, '<p class="u-fs12 u-muted">لا يوجد رسائل.</p>');   // الإصدار 96: الجديدة بس
      if (wasNearBottom) msgsWrap.scrollTop = msgsWrap.scrollHeight;
    }
    await refreshMsgs();
    if (currentView === 'active') window.__chatAdminMsgPoll = setInterval(refreshMsgs, 3000);

    const replyBtn = document.getElementById('chatAdminReplyBtn');
    const sendReply = async () => {
      const text = document.getElementById('chatAdminReplyInput').value.trim();
      const att = adminAttach ? adminAttach.get() : { file: null };
      if (!text && !att.file) return;
      replyBtn.disabled = true;
      let r;
      try { r = await sendChatAdminReplyWithFile(visitorId, text, adminAttach); } catch(e){ r = { success:false, message:'حدث خطأ في الاتصال بالسيرفر، حاول مرة أخرى.' }; }
      replyBtn.disabled = false;
      if (r && r.success){
        document.getElementById('chatAdminReplyInput').value = '';
        if (adminAttach) adminAttach.clear();
        lastCount = -1;
        refreshMsgs();
      } else {
        alert((r && r.message) || 'حصل خطأ');
      }
    };
    if (replyBtn) {
      replyBtn.onclick = sendReply;
      document.getElementById('chatAdminReplyInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendReply(); });
    }
  }
}

/* =====================================================================
   الإصدار 83: إعدادات تنبيهات الشات (للأدمن - صلاحية manage_admin_settings)
   - صورة أيقونة الشات لكل الموقع (بدل شعار GRIFFINE)
   - صوت التنبيه الافتراضي
   - السماح للمشتركين/الزوار يغيّروا الصورة أو الصوت أو يكتموه من ⚙️ في الشات
   ===================================================================== */
async function renderChatNotifyAdmin(wrap){
  const cfg = await loadChatNotifyCfg();
  wrap.innerHTML = `
    <div class="section-title">🔔 تنبيهات الشات</div>
    <p style="font-size:12px;color:#888;line-height:1.8;margin:4px 0 10px;">أصبح التنبيه مثل ماسنجر: نقطة حمراء على أيقونة الشات + صوت، دون أي رسائل منبثقة (Push) على الشاشة.</p>
    <div class="chat-notify-grid">
      <div>
        <strong class="u-fs13">صورة أيقونة الشات</strong>
        <div style="display:flex;align-items:center;gap:10px;margin:8px 0;">
          <img src="${escapeHtml(cfg.icon || griffineLogoSrc())}" alt="أيقونة الشات" class="chat-notify-preview">
          <div style="display:flex;flex-direction:column;gap:6px;">
            <label class="small secondary chat-icon-upload">📷 رفع صورة جديدة<input type="file" id="cnIconFile" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none;"></label>
            ${cfg.icon ? '<button type="button" class="small secondary u-wa" id="cnIconClear">↩️ رجوع لشعار GRIFFINE</button>' : ''}
          </div>
        </div>
      </div>
      <div>
        <strong class="u-fs13">صوت التنبيه الافتراضي</strong>
        <div style="display:flex;gap:6px;align-items:center;margin:8px 0;">
          <select id="cnSound" class="u-m0">${Object.entries(CHAT_SOUNDS).map(([k, l]) => `<option value="${k}" ${cfg.sound === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <button type="button" class="small secondary u-wa u-m0" id="cnSoundTest">▶️</button>
        </div>
      </div>
    </div>
    <label class="chat-notify-check"><input type="checkbox" id="cnUserIcon" ${cfg.userIcon ? 'checked' : ''}> المشترك/الزائر يقدر يغيّر صورة أيقونة الشات عنده</label>
    <label class="chat-notify-check"><input type="checkbox" id="cnUserSound" ${cfg.userSound ? 'checked' : ''}> المشترك/الزائر يقدر يغيّر صوت التنبيه أو يكتمه (بدون صوت)</label>
    <div id="cnMsg" style="font-size:12px;margin-top:6px;"></div>`;
  const msg = (t, ok) => { const m = document.getElementById('cnMsg'); if (m) { m.textContent = t; m.style.color = ok ? 'var(--green)' : '#c0392b'; } };
  async function save(data){
    const r = await apiPost('/chat_notify_save.php', data).catch(() => null);
    if (!r || !r.success) { msg((r && r.message) || 'تعذّر الحفظ', false); return false; }
    window.__chatNotifyCfg = r.settings; applyChatBubbleIcon();
    return true;
  }
  document.getElementById('cnSound').onchange = async (e) => { if (await save({ sound: e.target.value })) { msg('✓ تم حفظ الصوت', true); playChatSound(e.target.value); } };
  document.getElementById('cnSoundTest').onclick = () => { chatAudioCtx(); setTimeout(() => playChatSound(document.getElementById('cnSound').value), 60); };
  document.getElementById('cnUserIcon').onchange = async (e) => { if (await save({ userIcon: e.target.checked ? 1 : 0 })) msg('✓ تم الحفظ', true); };
  document.getElementById('cnUserSound').onchange = async (e) => { if (await save({ userSound: e.target.checked ? 1 : 0 })) msg('✓ تم الحفظ', true); };
  const clr = document.getElementById('cnIconClear');
  if (clr) clr.onclick = async () => { if (await save({ clearIcon: 1 })) renderChatNotifyAdmin(wrap); };
  document.getElementById('cnIconFile').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) { alert('الصورة كبيرة - أقصى حجم 2 ميجا.'); e.target.value = ''; return; }
    const rd = new FileReader();
    rd.onload = async () => { msg('جاري الرفع...', true); if (await save({ icon: rd.result })) renderChatNotifyAdmin(wrap); };
    rd.readAsDataURL(f);
  };
}

/* =====================================================================
   الإصدار 84: لوحة التحكم ← "الدخول والأمان" + "طرق الدفع ورقم الخدمة"
   ===================================================================== */
async function siteCfgAdminApi(data){
  try { return data ? await apiPost('/site_config_admin.php', data) : await apiGet('/site_config_admin.php'); }
  catch(e){ return { success:false, message:'تعذّر الاتصال بالسيرفر' }; }
}
function cfgToggle(id, on, label, desc){
  return `<div class="setting-row">
    <div><div class="setting-label">${label}</div>${desc ? `<div class="setting-desc">${desc}</div>` : ''}</div>
    <label class="toggle-switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span class="toggle-slider"></span></label></div>`;
}
async function renderSiteConfigAdmin(){
  const secWrap = document.getElementById('securityCfgWrap'), payWrap = document.getElementById('paymentCfgWrap');
  if (!secWrap || !payWrap) return;
  const res = await siteCfgAdminApi();
  if (!res || !res.success) { secWrap.innerHTML = payWrap.innerHTML = `<p class="error">${escapeHtml((res && res.message) || 'تعذّر التحميل')}</p>`; return; }
  const c = res.config;
  const secretHint = (set) => set ? '<span style="color:var(--green);font-size:11.5px;">✓ مسجّل (اكتب قيمة جديدة إذا أردت تغييره، أو - لمسحه)</span>' : '<span style="color:#c0392b;font-size:11.5px;">غير مسجّل</span>';

  // ---------- الدخول والأمان
  secWrap.innerHTML = `
    <div style="padding:6px 0 12px;border-bottom:1px solid var(--border-soft);">
      <strong class="u-fs135">🛡️ رابط دخول الإدارة السري</strong>
      <div style="font-size:11.5px;color:#888;line-height:1.8;margin:3px 0 8px;">عند التفعيل، لن تتمكن حسابات الأدمن والموظفين من الدخول من صفحة الدخول العادية إطلاقًا - الدخول من هذا الرابط فقط (يفتح بوابة الدخول 30 دقيقة). احفظ الرابط في مكان آمن ولا ترسله لأحد غير فريقك.</div>
      ${c.admin_gate_url ? `<div class="gate-url" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;"><code id="gateUrl" dir="ltr" style="background:rgba(0,0,0,.05);padding:6px 10px;border-radius:8px;word-break:break-all;font-size:12px;">${escapeHtml(c.admin_gate_url)}</code>
        <button type="button" class="small secondary u-wa" id="gateCopy">📋 نسخ</button></div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;"><button type="button" class="small secondary u-wa" id="gateNew">🔄 رابط جديد (القديم يبطل)</button><button type="button" class="small danger u-wa" id="gateOff">إيقاف الرابط السري</button></div>`
      : `<button type="button" class="small u-wa" id="gateNew">تفعيل رابط دخول الإدارة السري</button>`}
    </div>
    ${cfgToggle('cfgAdminOtp', c.admin_otp === '1', 'كود تحقق (OTP) لحسابات الإدارة والموظفين', 'بعد كلمة المرور يُرسل كود من 6 أرقام. ⚠️ تأكد أولًا أن البريد يعمل من مركز الإيميلات قبل تفعيله' + (c.smtp_ready ? '' : ' — <b style="color:#c0392b">كلمة سر SMTP غير مسجّلة في griffine_config.php</b>'))}
    ${cfgToggle('cfgOtpLogin', c.otp_login === '1', 'كود تحقق (OTP) للعملاء عند تسجيل الدخول', 'حسب رغبتك: شغّله لأمان أعلى أو اقفله لدخول أسرع.')}
    <div style="padding:10px 0;border-bottom:1px solid var(--border-soft);">
      <strong class="u-fs135">طريقة إرسال الكود</strong>
      <select id="cfgOtpChannel" class="u-mt6"><option value="email" ${c.otp_channel === 'email' || !c.otp_channel ? 'selected' : ''}>📧 الإيميل (مجاني - يعمل فورًا)</option><option value="whatsapp" ${c.otp_channel === 'whatsapp' ? 'selected' : ''}>🟢 واتساب من رقم الموقع (ولو فشل يُرسل بالإيميل)</option><option value="sms" ${c.otp_channel === 'sms' ? 'selected' : ''}>📱 رسالة SMS عن طريق مزود رسائل (ولو فشلت تُرسل بالإيميل)</option></select>
    </div>
    <div style="padding:10px 0;border-bottom:1px solid var(--border-soft);" id="cfgSiteNumberBox">
      <strong class="u-fs135">📱 رقم الموقع لإرسال الكود على واتساب</strong>
      <div style="font-size:11.5px;color:#888;line-height:1.8;margin:3px 0 8px;">هذا الرقم هو رقم الخدمة نفسه (استقبال تحويلات فودافون كاش). لكي يصل الكود للعميل على واتساب من هذا الرقم، يجب تسجيل الرقم مرة واحدة في <b>WhatsApp Business Platform</b> من Meta (business.facebook.com ← WhatsApp Manager)، وتعمل قالب رسالة من نوع <b>Authentication</b>، وتنسخ هنا Phone Number ID و Access Token واسم القالب. ${c.wa_ready ? '<b style="color:var(--green)">✓ واتساب جاهز</b>' : '<b style="color:#c0392b">غير مضبوط بعد</b>'}</div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
        <input type="tel" id="cfgSiteNumber" dir="ltr" value="${escapeHtml(c.service_phone || '')}" style="width:200px;margin:0;">
        <button type="button" class="small secondary u-wa u-m0" id="cfgSiteNumberSave">💾 حفظ الرقم</button>
        <label class="toggle-switch" title="تشغيل / إيقاف إرسال الكود من رقم الموقع"><input type="checkbox" id="cfgWaOn" ${c.otp_channel === 'whatsapp' ? 'checked' : ''}><span class="toggle-slider"></span></label>
        <span style="font-size:12.5px;">${c.otp_channel === 'whatsapp' ? 'الإرسال من رقم الموقع: يعمل' : 'الإرسال من رقم الموقع: متوقف'}</span>
      </div>
      <div class="grid2 u-mt8">
        <div><label>Phone Number ID</label><input type="text" id="cfgWaPhoneId" dir="ltr" inputmode="numeric" value="${escapeHtml(c.wa_phone_id || '')}"></div>
        <div><label>اسم قالب الكود</label><input type="text" id="cfgWaTemplate" dir="ltr" placeholder="otp_code" value="${escapeHtml(c.wa_template || '')}"></div>
      </div>
      <label>Access Token</label><input type="password" id="cfgWaToken" dir="ltr" autocomplete="off"><div>${secretHint(c.wa_token_set)}</div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap;">
        <input type="tel" id="cfgWaTestPhone" placeholder="رقم للتجربة 01xxxxxxxxx" dir="ltr" style="width:190px;margin:0;">
        <button type="button" class="small secondary u-wa u-m0" id="cfgWaTest">🟢 رسالة واتساب تجريبية</button>
      </div>
    </div>
    <div style="padding:10px 0;">
      <strong class="u-fs135">مزود رسائل SMS</strong>
      <div style="font-size:11.5px;color:#888;line-height:1.8;margin:3px 0 6px;">تُرسل الرسائل عن طريق مزود رسائل (مثل SMS Misr / Victory Link / Twilio) باسم مرسل مسجّل لديه - وليس من رقم موبايل شخصي. الصق رابط الـ API الخاص به وضع <code>{phone}</code> مكان الرقم و <code>{message}</code> مكان الرسالة. رقم الخدمة يُكتب داخل نص الرسالة للتواصل.</div>
      <input type="text" id="cfgSmsUrl" dir="ltr" placeholder="https://provider.com/api/send?user=XX&pass=YY&sender=GRIFFINE&to={phone}&msg={message}">
      <div>${secretHint(c.sms_url_set)}</div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap;">
        <select id="cfgSmsMethod" class="u-wa u-m0"><option ${c.sms_method !== 'POST' ? 'selected' : ''}>GET</option><option ${c.sms_method === 'POST' ? 'selected' : ''}>POST</option></select>
        <input type="tel" id="cfgSmsTestPhone" placeholder="رقم للتجربة 01xxxxxxxxx" dir="ltr" style="width:190px;margin:0;">
        <button type="button" class="small secondary u-wa u-m0" id="cfgSmsTest">📨 رسالة تجريبية</button>
      </div>
    </div>
    <button type="button" id="cfgSecSave" style="width:auto;margin-top:10px;">حفظ إعدادات الدخول والأمان</button>
    <div id="cfgSecMsg" style="font-size:12.5px;margin-top:6px;"></div>`;

  // ---------- الدفع ورقم الخدمة
  payWrap.innerHTML = `
    <label>📱 رقم الخدمة (استقبال تحويلات فودافون كاش + رقم التواصل)</label>
    <input type="tel" id="cfgServicePhone" dir="ltr" value="${escapeHtml(c.service_phone || '')}">
    <label>🏦 عنوان/رقم إنستاباي (فارغ = نفس رقم الخدمة)</label>
    <input type="text" id="cfgInstapay" dir="ltr" value="${escapeHtml(c.instapay_address || '')}" placeholder="مثال: griffine@instapay">
    ${cfgToggle('cfgPayVodafone', c.pay_vodafone === '1', 'فودافون كاش + صورة التحويل', 'يحوّل العميل إلى رقم الخدمة ويرفع صورة التحويل، وتفعّل أنت بعد المراجعة.')}
    ${cfgToggle('cfgPayInstapay', c.pay_instapay === '1', 'إنستاباي + صورة التحويل', '')}
    ${cfgToggle('cfgPayPaymob', c.pay_paymob === '1', 'فيزا / ماستركارد / ميزة عن طريق Paymob', 'يتفعّل الاشتراك تلقائيًا فور تأكيد Paymob للدفع. ' + (c.paymob_ready ? '<b style="color:var(--green)">✓ البيانات كاملة</b>' : '<b style="color:#c0392b">البيانات ناقصة - لن يظهر للعملاء</b>'))}
    <div style="padding:10px 0;">
      <strong class="u-fs135">بيانات Paymob</strong>
      <div style="font-size:11.5px;color:#888;line-height:1.8;margin:3px 0 6px;">من لوحة Paymob: Settings ← Account Info (API Key و HMAC)، Developers ← Payment Integrations (Integration ID للكروت)، Developers ← iframes (Iframe ID). وفي صفحة الـ Integration نفسها اكتب هذا الرابط في الخانتين Transaction processed callback و Transaction response callback:</div>
      <code dir="ltr" style="display:block;background:rgba(0,0,0,.05);padding:6px 10px;border-radius:8px;font-size:12px;margin-bottom:8px;">${escapeHtml(c.paymob_callback_url)}</code>
      <label>API Key</label><input type="password" id="cfgPmKey" dir="ltr" autocomplete="off"><div>${secretHint(c.paymob_api_key_set)}</div>
      <label>HMAC Secret</label><input type="password" id="cfgPmHmac" dir="ltr" autocomplete="off"><div>${secretHint(c.paymob_hmac_set)}</div>
      <div class="grid2"><div><label>Integration ID (الكروت)</label><input type="text" id="cfgPmInt" dir="ltr" inputmode="numeric" value="${escapeHtml(c.paymob_integration || '')}"></div>
      <div><label>Iframe ID</label><input type="text" id="cfgPmIframe" dir="ltr" inputmode="numeric" value="${escapeHtml(c.paymob_iframe || '')}"></div></div>
      <label>Integration ID للتجديد التلقائي (MOTO) - اختياري</label>
      <input type="text" id="cfgPmMoto" dir="ltr" inputmode="numeric" value="${escapeHtml(c.paymob_moto_integration || '')}" placeholder="اطلبه من دعم Paymob + فعّل حفظ الكروت (Card Tokenization)">
      <div style="font-size:11.5px;color:#888;line-height:1.8;">لتفعيل التجديد التلقائي: اطلب من Paymob تفعيل حفظ الكروت (Tokenization) و Integration من نوع MOTO، واكتب رقمه هنا، وأضف Cron يوميًا على:<br><code dir="ltr">${escapeHtml((c.paymob_callback_url || '').replace('paymob_callback.php', 'renew_subscriptions.php?key=مفتاح_الكرون'))}</code></div>
    </div>
    <button type="button" id="cfgPaySave" style="width:auto;margin-top:6px;">حفظ طرق الدفع ورقم الخدمة</button>
    <div id="cfgPayMsg" style="font-size:12.5px;margin-top:6px;"></div>`;

  const msg = (id, t, ok) => { const m = document.getElementById(id); if (m) { m.textContent = t; m.style.color = ok ? 'var(--green)' : '#c0392b'; } };
  const chk = (id) => document.getElementById(id).checked ? '1' : '0';
  const val = (id) => document.getElementById(id).value.trim();
  const gateNew = document.getElementById('gateNew');
  if (gateNew) gateNew.onclick = async () => {
    if (c.admin_gate_url && !await gConfirm('سيتوقف الرابط القديم فورًا. هل أنت متأكد؟')) return;
    const r = await siteCfgAdminApi({ action: 'gate_new' });
    if (r && r.success) { renderSiteConfigAdmin(); alert('✅ تم تفعيل الرابط السري. انسخه واحفظه - من الآن سيكون دخول الإدارة منه فقط.'); } else alert((r && r.message) || 'تعذّر');
  };
  const gateOff = document.getElementById('gateOff');
  if (gateOff) gateOff.onclick = async () => { if (!await gConfirm('إيقاف الرابط السري؟ ستدخل حسابات الإدارة من صفحة الدخول العادية.')) return; const r = await siteCfgAdminApi({ action: 'gate_off' }); if (r && r.success) renderSiteConfigAdmin(); };
  const gateCopy = document.getElementById('gateCopy');
  if (gateCopy) gateCopy.onclick = () => { try { navigator.clipboard.writeText(c.admin_gate_url); gateCopy.textContent = '✓ اتنسخ'; } catch(e){} };
  // الإصدار 88: رقم الموقع + واتساب
  document.getElementById('cfgSiteNumberSave').onclick = async () => {
    const r = await siteCfgAdminApi({ action: 'save', service_phone: val('cfgSiteNumber') });
    if (r && r.success) { getSiteConfig(true); renderSiteConfigAdmin().then(() => msg('cfgSecMsg', '✓ تم حفظ رقم الموقع', true)); } else msg('cfgSecMsg', (r && r.message) || 'تعذّر الحفظ', false);
  };
  document.getElementById('cfgWaOn').onchange = async (e) => {
    const on = e.target.checked;
    if (on && !c.wa_ready && !(val('cfgWaPhoneId') && val('cfgWaTemplate') && (val('cfgWaToken') || c.wa_token_set))) { alert('اكتب Phone Number ID و Access Token واسم القالب الأول.'); e.target.checked = false; return; }
    const data = { action: 'save', otp_channel: on ? 'whatsapp' : 'email', wa_phone_id: val('cfgWaPhoneId'), wa_template: val('cfgWaTemplate') };
    if (val('cfgWaToken')) data.wa_token = val('cfgWaToken');
    const r = await siteCfgAdminApi(data);
    if (r && r.success) renderSiteConfigAdmin().then(() => msg('cfgSecMsg', on ? '✓ الكود سيُرسل من رقم الموقع على واتساب' : '✓ تم إيقاف الإرسال من رقم الموقع (الكود بالإيميل)', true));
    else { e.target.checked = !on; msg('cfgSecMsg', (r && r.message) || 'تعذّر الحفظ', false); }
  };
  document.getElementById('cfgWaTest').onclick = async () => {
    const d = { action: 'save', wa_phone_id: val('cfgWaPhoneId'), wa_template: val('cfgWaTemplate') }; if (val('cfgWaToken')) d.wa_token = val('cfgWaToken');
    await siteCfgAdminApi(d);
    const r = await siteCfgAdminApi({ action: 'wa_test', phone: val('cfgWaTestPhone') });
    msg('cfgSecMsg', (r && r.message) || 'تعذّر', r && r.success);
  };
  document.getElementById('cfgSmsTest').onclick = async () => {
    const r = await siteCfgAdminApi({ action: 'sms_test', phone: val('cfgSmsTestPhone') });
    msg('cfgSecMsg', (r && r.message) || 'تعذّر', r && r.success);
  };
  document.getElementById('cfgSecSave').onclick = async () => {
    const data = { action: 'save', admin_otp: chk('cfgAdminOtp'), otp_login: chk('cfgOtpLogin'), otp_channel: val('cfgOtpChannel'), sms_method: val('cfgSmsMethod'), wa_phone_id: val('cfgWaPhoneId'), wa_template: val('cfgWaTemplate') };
    if (val('cfgWaToken')) data.wa_token = val('cfgWaToken');
    if (val('cfgSmsUrl')) data.sms_url = val('cfgSmsUrl');
    if (data.admin_otp === '1' && c.admin_otp !== '1' && !await gConfirm('بعد التفعيل، سيحتاج دخول الإدارة إلى كود يصل على البريد. هل تأكدت أن البريد يعمل؟')) return;
    const r = await siteCfgAdminApi(data);
    if (r && r.success) { msg('cfgSecMsg', '✓ تم الحفظ', true); Object.assign(c, r.config); } else msg('cfgSecMsg', (r && r.message) || 'تعذّر الحفظ', false);
  };
  document.getElementById('cfgPaySave').onclick = async () => {
    const data = { action: 'save', service_phone: val('cfgServicePhone'), instapay_address: val('cfgInstapay'),
      pay_vodafone: chk('cfgPayVodafone'), pay_instapay: chk('cfgPayInstapay'), pay_paymob: chk('cfgPayPaymob'),
      paymob_integration: val('cfgPmInt'), paymob_iframe: val('cfgPmIframe'), paymob_moto_integration: val('cfgPmMoto') };
    if (val('cfgPmKey')) data.paymob_api_key = val('cfgPmKey');
    if (val('cfgPmHmac')) data.paymob_hmac = val('cfgPmHmac');
    const r = await siteCfgAdminApi(data);
    if (r && r.success) { getSiteConfig(true); renderSiteConfigAdmin().then(() => msg('cfgPayMsg', r.warning ? '⚠️ ' + r.warning : '✓ تم الحفظ', !r.warning)); }
    else msg('cfgPayMsg', (r && r.message) || 'تعذّر الحفظ', false);
  };
}

// الإصدار 148: برّه الدالة عشان «بحث لوحة التحكم» يلاقيها من غير ما الصفحة تتفتح
const ADMIN_SETTING_ITEMS = [
    { key:'require_email_verification', label:'تفعيل البريد الإلكتروني إلزامي', desc:'يجب أن يضغط العميل رابط التفعيل الذي يصله بالبريد قبل أن يتمكن من استخدام الموقع.' },
    { key:'require_valid_email_domain', label:'التحقق من صحة دومين الإيميل عند التسجيل', desc:'يرفض التسجيل بإيميل دومينه غير موجود فعليًا (حماية من الإيميلات الوهمية).' },
    { key:'require_payment_ref', label:'رقم عملية التحويل إلزامي', desc:'عند السداد بمحفظة أو تحويل بنكي، يجب أن يكتب العميل رقم/مرجع العملية.' },
    { key:'require_payment_proof', label:'إرفاق صورة إثبات التحويل إلزامي', desc:'عند السداد بمحفظة أو تحويل بنكي، يجب أن يرفع العميل صورة إثبات التحويل.' },
    { key:'require_card_details', label:'بيانات البطاقة إلزامية عند اختيار الدفع بالفيزا', desc:'اسم حامل البطاقة ورقمها وتاريخ انتهائها يبقوا مطلوبين إجباريًا.' },
    { key:'require_manual_activation', label:'مراجعة السداد يدويًا قبل تفعيل أي اشتراك مدفوع', desc:'أي اشتراك بمبلغ (غير التجربة المجانية) يبقى موقوفًا حتى تفعّله بنفسك من لوحة التحكم. إذا أوقفت هذه الخاصية، ستتفعّل الاشتراكات المدفوعة فورًا دون مراجعة.' },
    { key:'chat_enabled', label:'تشغيل الدردشة الفورية المدمجة', desc:'إذا أوقفته، لن يتمكن أحد من إرسال أو استقبال رسائل الشات إطلاقًا، حتى لو كانت الأيقونة ظاهرة.' },
    { key:'chat_icon_visible', label:'إظهار أيقونة الدردشة الفورية العائمة', desc:'تقدر تخفي الأيقونة من على كل صفحات الموقع من غير ما توقف الشات نفسه بالكامل.' },
  ];
// الإصدار 148: برّه الدالة عشان «بحث لوحة التحكم» يلاقيها من غير ما الصفحة تتفتح
const ADMIN_VIS_ITEMS = [
    { key:'hide_dac_screen', label:'إخفاء زرار خطط تعزيز المتوسط (DCA)', desc:'يشيل الزرار من الشاشة الرئيسية للعميل من غير ما يمسح أي بيانات أو خطط موجودة.' },
    { key:'hide_grid_screen', label:'إخفاء زرار خطط الشبكة (Grid)', desc:'' },
    { key:'hide_portfolio_screen', label:'إخفاء زرار ملخص المحفظة', desc:'' },
    { key:'hide_screener_screen', label:'إخفاء زرار كشاف الأسهم', desc:'' },
    { key:'hide_sub_history_screen', label:'إخفاء زرار سجل الاشتراك', desc:'' },
    { key:'hide_recommendations_screen', label:'إخفاء زرار التوصيات', desc:'' },
    { key:'hide_referral_screen', label:'إخفاء زرار ادعُ صديق (برنامج الإحالة)', desc:'' },
    { key:'hide_contact_screen', label:'إخفاء زرار بيانات التواصل', desc:'' },
    { key:'hide_testimonials_screen', label:'إخفاء زرار آراء العملاء', desc:'' },
    { key:'hide_articles_screen', label:'إخفاء زرار المقالات', desc:'' },
    { key:'hide_suggestions_screen', label:'إخفاء زرار شاركنا مقترحاتك', desc:'' },
    // الإصدار 96: كل الشاشات
    { key:'hide_watchlist_screen', label:'إخفاء قائمة المتابعة', desc:'' },
    { key:'hide_alerts_screen', label:'إخفاء تنبيهات الأسعار', desc:'يخفي الشاشة وكارت التنبيهات في الرئيسية.' },
    { key:'hide_stock_screen', label:'إخفاء صفحة السهم (السعر والشارت)', desc:'' },
    { key:'hide_curve_home', label:'إخفاء منحنى أداء المحفظة في الرئيسية', desc:'' },
    // الإصدار 144: كروت الرئيسية (وكمان من شريط «🛠 التحكم في الرئيسية» فوق الرئيسية عندك)
    { key:'hide_home_hero', label:'إخفاء كارت «قيمة المحفظة» في الرئيسية', desc:'' },
    { key:'hide_home_alerts', label:'إخفاء كارت «تنبيهات الأسعار» في الرئيسية (الشاشة نفسها بتفضل)', desc:'' },
    { key:'hide_home_quick', label:'إخفاء «الاختصارات» في الرئيسية', desc:'' },
    { key:'hide_home_recs', label:'إخفاء «أحدث التوصيات» في الرئيسية', desc:'' },
    { key:'hide_home_holdings', label:'إخفاء «استثماراتي» في الرئيسية', desc:'' },
    { key:'hide_trash_screen', label:'إخفاء سلة المحذوفات عن العملاء', desc:'الحذف يفضل ينتقل للسلة، ويقدر الأدمن يسترجع من سلته.' },
    { key:'hide_mizan_screen', label:'إخفاء «ميزان محفظتك AI» عن العملاء', desc:'الشاشة بتختفي من القائمة الجانبية ومن المحفظة والتقارير، والأدمن بيفضل يشوفها. رأي الذكاء الاصطناعي بيستخدم إعدادات ومفتاح «تحليلات بصيرة AI».' },
    { key:'hide_mizanai_screen', label:'إخفاء «ميزان GRIFFINE AI» (مخطِّط توزيع الاستثمار) عن العملاء', desc:'الشاشة بتختفي من القائمة والبحث، والأدمن بيفضل يشوفها. إعداداتها من زرار «ميزان GRIFFINE AI» في لوحة التحكم.' },
    { key:'hide_basira_screen', label:'إخفاء «بصيرة AI — تحليل الأسهم» عن العملاء', desc:'الشاشة بتختفي من القائمة والكشاف، والأدمن بيفضل يشوفها. إعداداتها من «تحليلات بصيرة AI» في لوحة التحكم.' },
    { key:'hide_opps_screen', label:'إخفاء «البحث عن فرص» في كشاف الأسهم عن العملاء', desc:'البحث عن فرص حسب المؤشرات الفنية مع إشعارات (لحد 4 فرص لكل مشترك).' },
    { key:'hide_trades_screen', label:'إخفاء «تقرير صفقاتي» عن العملاء', desc:'لو أظهرته: كل عميل يشوف صفقاته هو بس (الشراء والبيع والصفقات المقفولة والأرباح).' },
    // الإصدار 116: أيقونات الشريط العلوي (بتتطبق على الكل - حتى الأدمن)
    { key:'hide_install_icon', label:'إخفاء أيقونة «تثبيت التطبيق» (جنب أيقونة الوضع الليلي)', desc:'الأيقونة في الشريط العلوي بعد تسجيل الدخول. بتختفي لوحدها لو التطبيق متثبّت ومفتوح كتطبيق.' },
    { key:'hide_site_search', label:'إخفاء «البحث العام في الموقع»', desc:'أيقونة البحث في الشريط العلوي: بتدوّر على أي شاشة أو أداة أو خطة أو سهم وتفتحه مباشرة (وكمان Ctrl+K). الشاشات المخفية عن العملاء مبتظهرش في نتايجهم.' },
    { key:'hide_plan_watch', label:'إخفاء «متابعة خططك على آخر سعر» في شاشات الخطط', desc:'المربع اللي فوق خطط DCA وGrid: الخطط اللي سعرها عدّى هدف البيع، والمبلغ المرصود اللي خلص، ونسبة التركّز حسب ميزان المحفظة. الإخفاء بيطبّق على الكل.' },
  ];
async function renderAdminSettingsPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderAdminSettingsPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('manage_admin_settings')) return renderAdminHub();

  const settings = await getAdminSettings();

  const items = ADMIN_SETTING_ITEMS;

  const visibilityItems = ADMIN_VIS_ITEMS;

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('admin_settings','⚙️ الصلاحيات والإعدادات الإلزامية')}</div>
      <button class="secondary small" id="backToAdminFromSettingsBtn">🛡️ رجوع للوحة التحكم</button>
    </div>
    <div class="info">كل الأوامر والقواعد الإلزامية التي يفرضها الموقع على المستخدمين موجودة هنا. الافتراضي أن كل شيء مفعّل (كالوضع الحالي). إذا أردت إيقاف أي قاعدة، اضغط على المفتاح بجانبها.</div>
    <div class="section-card" id="settingsListWrap"></div>

    <h2 class="u-mt20">🔐 الدخول والأمان</h2>
    <div class="info">رابط سري لدخول الإدارة والموظفين، وكود تحقق (OTP) بالبريد أو برسالة SMS أو واتساب للإدارة و/أو العملاء. تفعيل الحساب الجديد بالبريد موجود أعلاه ("تفعيل البريد الإلكتروني إلزامي").</div>
    <div class="section-card" id="securityCfgWrap">جارٍ التحميل...</div>

    <h2 class="u-mt20">💳 طرق الدفع ورقم الخدمة</h2>
    <div class="info">رقم الخدمة هو رقم استقبال تحويلات فودافون كاش، ويظهر في صفحة الدفع وبيانات التواصل ورسائل كود الدخول. شغّل أو أوقف أي طريقة دفع، واكتب بيانات Paymob ليتفعّل الدفع بالكارت تلقائيًا.</div>
    <div class="section-card" id="paymentCfgWrap">جارٍ التحميل...</div>

    <h2 class="u-mt20">🏷️ رقم الإصدار المعروض</h2>
    <div class="info">يظهر لكل المستخدمين في صفحة «حسابي» (مثلًا V.5.09). لو تركته فارغًا يظهر الرقم التلقائي للإصدار. رقم البناء الداخلي يظهر بجانبه صغيرًا للتأكد أن الجهاز على آخر نسخة.</div>
    <div class="section-card"><div class="u-row"><input id="cfgVersionLabel" maxlength="30" dir="ltr" placeholder="الرقم التلقائي" class="u-m0"><button class="small u-wa" id="cfgVersionSave">💾 حفظ</button></div><div id="cfgVersionMsg" class="u-note u-mt6"></div></div>

    <h2 class="u-mt20">🌍 الأسواق وطرق الدفع لكل سوق</h2>
    <div class="info">فعّل الأسواق التي يعمل بها الموقع. السوق غير المفعّل لا يظهر في التسجيل ولا عند المستخدمين، ويمكنك تجهيز باقاته وطرق دفعه مسبقًا. كل حساب له بورصة واحدة يختارها عند التسجيل (لو سوق واحد مفعّل يكون تلقائيًا). مصر: فودافون كاش وإنستاباي وPaymob من القسم أعلاه، ويمكنك إضافة تحويل بنكي. Paymob بالجنيه فقط لذلك متاح لمصر فقط.</div>
    <div class="section-card" id="marketsCfgWrap">جارٍ التحميل...</div>

    ${window.__isSuperAdmin ? `<h2 class="u-mt20">🧹 حذف الأسهم المكتوبة غلط</h2>
    <div class="info">أي رمز سهم مش موجود في البورصة (في خطط أي مستخدم أو الأدمن، أو قائمة المتابعة، أو تنبيهات الأسعار) بيتمسح <b>نهائيًا</b> هو وخطته وصفقاته وإشعاراته، ومبيرجعش تاني — ماعدا الخطط اللي صاحبها اختار إنها «سهم غير مدرج في البورصة». ده بيحصل تلقائيًا كل 6 ساعات، والزرار ده بيعمله فورًا. لو مصدر الأسعار واقع مفيش أي حذف.</div>
    <div class="section-card"><button class="small danger u-wa" id="symAuditBtn">🧹 فحص وحذف الرموز الغلط الآن</button><div id="symAuditOut" class="u-mt10"></div></div>` : ''}

    ${gNpSettingsHtml()}

    <h2 class="u-mt20">إخفاء شاشات عن العميل</h2>
    <div class="info">فعّل أي مفتاح هنا لإخفاء الزر المقابل من الشاشة الرئيسية للعميل، دون حذف أي بيانات أو خطط موجودة بالفعل. الافتراضي أن كل الأزرار ظاهرة.</div>
    <div class="section-card" id="visibilityListWrap"></div>

    <h2 class="u-mt20">إعدادات محرك إشارات كشاف الأسهم</h2>
    <div class="info">العتبات والأوزان التي تحدد متى تكون الإشارة "شراء" أو "بيع" في أداة التحليل الفني. تقدر تعدّلها حسب استراتيجيتك.</div>
    <div class="section-card" id="screenerSettingsWrap"></div>

    ${window.__isSuperAdmin ? `
    <h2 class="u-mt20">نسخة احتياطية يدوية</h2>
    <div class="info">تقوم هوستنجر بنسخ احتياطي تلقائي أساسي للموقع كاملًا. هذا الزر مجرد نسخة تكميلية سريعة من بيانات الجداول الأساسية (بدون صور إثبات الدفع الكبيرة) يمكنك تحميلها فورًا متى شئت.</div>
    <div class="section-card">
      <a href="/admin_backup_export.php" target="_blank"><button type="button" class="u-wa">⬇️ تحميل نسخة احتياطية الآن</button></a>
    </div>` : ''}
  </div>`;

  // الإصدار 96: الأسواق المفعّلة + طرق الدفع لكل سوق
  (async () => {
    const wrap = document.getElementById('marketsCfgWrap'); if (!wrap) return;
    const [r, am] = await Promise.all([siteCfgAdminApi(), apiGet('/account_market.php').catch(() => null)]);
    if (!r || !r.success || !am || !wrap.isConnected) { wrap.textContent = 'تعذّر التحميل'; return; }
    const c = r.config, active = (c.active_markets || 'مصر').split(',');
    const mk = Object.entries(am.markets);
    const fld = (id, label, val, ph, long) => `<label class="u-fs12">${label}${long ? `<textarea id="${id}" rows="2" placeholder="${ph || ''}">${escapeHtml(val || '')}</textarea>` : `<input id="${id}" value="${escapeHtml(val || '')}" placeholder="${ph || ''}">`}</label>`;
    wrap.innerHTML = mk.map(([name, m]) => { const cc = m.code.toLowerCase(); return `
      <details class="mkt-cfg" ${active.includes(name) ? 'open' : ''}>
        <summary><label class="u-check mkt-on-lbl"><input type="checkbox" class="mktOn" value="${escapeHtml(name)}" ${active.includes(name) ? 'checked' : ''}> <b>${escapeHtml(name)}</b></label> <span class="u-muted u-fs12">— ${escapeHtml(m.ccyAr)} (${m.ccy})</span> ${active.includes(name) ? '<span class="tag tag-done">مفعّل</span>' : '<span class="tag">غير مفعّل</span>'}</summary>
        <div class="g-grid-filters u-mt8">
          <label class="u-check"><input type="checkbox" id="bank_on_${cc}" ${c['bank_on_' + cc] === '1' ? 'checked' : ''}> تحويل بنكي</label>
          ${fld('bank_name_' + cc, 'اسم البنك', c['bank_name_' + cc])}${fld('bank_holder_' + cc, 'اسم صاحب الحساب', c['bank_holder_' + cc])}${fld('bank_iban_' + cc, 'رقم الحساب / IBAN', c['bank_iban_' + cc], 'SA00 0000 ...')}
        </div>
        ${fld('bank_note_' + cc, 'ملاحظة للعميل (اختياري)', c['bank_note_' + cc], '', true)}
        <div class="g-grid-filters u-mt8">
          <label class="u-check"><input type="checkbox" id="extra_on_${cc}" ${c['extra_on_' + cc] === '1' ? 'checked' : ''}> طريقة إضافية</label>
          ${fld('extra_label_' + cc, 'اسم الطريقة', c['extra_label_' + cc], 'مثلًا STC Pay')}
        </div>
        ${fld('extra_details_' + cc, 'تفاصيل الدفع (الرقم / التعليمات)', c['extra_details_' + cc], '', true)}
      </details>`; }).join('') + `<button class="u-mt10 u-wa" id="mktSave">💾 حفظ الأسواق وطرق الدفع</button><div id="mktMsg" class="u-note u-mt6"></div>`;
    wrap.querySelectorAll('.mkt-on-lbl').forEach(l => l.addEventListener('click', e => e.stopPropagation()));
    document.getElementById('mktSave').onclick = async () => {
      const on = Array.from(wrap.querySelectorAll('.mktOn:checked')).map(x => x.value);
      if (!on.length) { document.getElementById('mktMsg').textContent = 'فعّل سوقًا واحدًا على الأقل.'; return; }
      const data = { action: 'save', active_markets: on.join(',') };
      mk.forEach(([, m]) => { const cc = m.code.toLowerCase();
        data['bank_on_' + cc] = document.getElementById('bank_on_' + cc).checked ? '1' : '0'; data['extra_on_' + cc] = document.getElementById('extra_on_' + cc).checked ? '1' : '0';
        ['bank_name', 'bank_holder', 'bank_iban', 'bank_note', 'extra_label', 'extra_details'].forEach(f => { data[f + '_' + cc] = document.getElementById(f + '_' + cc).value.trim(); }); });
      const rr = await siteCfgAdminApi(data);
      document.getElementById('mktMsg').textContent = rr && rr.success ? `تم الحفظ ✓ — الأسواق المفعّلة: ${on.join('، ')}` : ((rr && rr.message) || 'تعذّر الحفظ');
      if (rr && rr.success && window.GShell) GShell.loadAccountMarket(true);
    };
  })();
  // الإصدار 98: حذف الأسهم المكتوبة غلط نهائيًا (مدير الموقع)
  const sab = document.getElementById('symAuditBtn'); if (sab) sab.onclick = async () => {
    if (!await gConfirm('فحص كل رموز الأسهم وحذف أي رمز مش موجود في البورصة نهائيًا هو وخططه؟ (لا يمكن الاسترجاع)', { ok: 'فحص وحذف', danger: true })) return;
    const out = document.getElementById('symAuditOut'); sab.disabled = true; out.innerHTML = '<p class="u-muted">جارٍ الفحص والحذف... قد يستغرق دقيقة حسب عدد الأسهم.</p>';
    const r = await apiPost('/symbols_audit.php', { action: 'clean' }).catch(() => null); sab.disabled = false;
    if (!r || !r.success) { out.innerHTML = `<div class="error">${escapeHtml((r && r.message) || 'تعذّر الفحص')}</div>`; return; }
    out.innerHTML = !r.deleted.length ? `<div class="info">✅ كل الرموز صحيحة — تم فحص ${r.checked} رمز، ولم يُحذف شيء.</div>` :
      `<div class="info">🧹 تم حذف ${r.deleted.length} نهائيًا (من ${r.checked} رمز):</div>
      <div class="table-scroll"><table class="g-table"><thead><tr><th>الحساب</th><th>النوع</th><th>الرمز</th><th>السوق</th></tr></thead><tbody>
      ${r.deleted.map(x => `<tr><td dir="ltr">${escapeHtml(x.email || '-')}</td><td>${x.kind === 'Grid' ? 'خطوط الشبكة' : x.kind === 'DCA' ? 'تعزيز المتوسط' : escapeHtml(x.kind)}</td><td dir="ltr"><b>${escapeHtml(x.symbol)}</b></td><td>${escapeHtml(x.market)}</td></tr>`).join('')}
      </tbody></table></div>`;
  };
  gNpSettingsWire();   // الإصدار 101
  // الإصدار 96: رقم الإصدار المعروض
  siteCfgAdminApi().then(r => { const i = document.getElementById('cfgVersionLabel'); if (i && r && r.config) i.value = r.config.app_version_label || ''; });
  const vbtn = document.getElementById('cfgVersionSave'); if (vbtn) vbtn.onclick = async () => {
    const r = await siteCfgAdminApi({ action:'save', app_version_label: document.getElementById('cfgVersionLabel').value.trim() });
    document.getElementById('cfgVersionMsg').textContent = r && r.success ? 'تم الحفظ ✓ — يظهر لكل المستخدمين.' : ((r && r.message) || 'تعذّر الحفظ');
    if (window.GShell) GShell.__verP = null;
  };
  document.getElementById('backToAdminFromSettingsBtn').onclick=()=>goAdminHome();
  renderSiteConfigAdmin();   // الإصدار 84

  const screenerRes = await getScreenerSettings();
  const screenerSettings = (screenerRes && screenerRes.success) ? screenerRes.settings : {};
  const screenerFields = [
    { key:'rsi_period', label:'فترة RSI' },
    { key:'rsi_oversold', label:'حد التشبّع البيعي لـRSI (إشارة إيجابية تحته)' },
    { key:'rsi_overbought', label:'حد التشبّع الشرائي لـRSI (إشارة سلبية فوقه)' },
    { key:'ma_period', label:'فترة المتوسط المتحرك' },
    { key:'macd_fast', label:'MACD - الفترة السريعة' },
    { key:'macd_slow', label:'MACD - الفترة البطيئة' },
    { key:'macd_signal', label:'MACD - فترة خط الإشارة' },
    { key:'weight_rsi', label:'وزن RSI في الإشارة النهائية' },
    { key:'weight_macd', label:'وزن MACD في الإشارة النهائية' },
    { key:'weight_ma', label:'وزن المتوسط المتحرك في الإشارة النهائية' },
  ];
  document.getElementById('screenerSettingsWrap').innerHTML = screenerFields.map(f => `
    <div class="grid2" style="align-items:center;margin-bottom:8px;">
      <label class="u-m0">${escapeHtml(f.label)}</label>
      <input type="number" step="any" class="screenerSettingInput" data-key="${f.key}" value="${screenerSettings[f.key] ?? ''}">
    </div>`).join('') + `<button id="saveScreenerSettingsBtn" class="u-mt8">حفظ إعدادات المحرك</button><div id="screenerSettingsResult"></div>`;

  document.getElementById('saveScreenerSettingsBtn').onclick = async () => {
    const inputs = document.querySelectorAll('.screenerSettingInput');
    const results = await Promise.all(Array.from(inputs).map(inp => saveScreenerSetting(inp.dataset.key, inp.value)));
    document.getElementById('screenerSettingsResult').innerHTML = results.every(r=>r.success)
      ? '<div class="info u-mt8">✅ تم الحفظ.</div>'
      : `<div class="error u-mt8">${results.find(r=>!r.success)?.message || 'حصل خطأ في بعض القيم'}</div>`;
  };


  function renderList(){
    document.getElementById('settingsListWrap').innerHTML = items.map(it => `
      <div class="setting-row">
        <div>
          <div class="setting-label">${escapeHtml(it.label)}</div>
          <div class="setting-desc">${it.desc}</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" class="settingToggle" data-key="${it.key}" ${settings[it.key]!==false?'checked':''}>
          <span class="toggle-slider"></span>
        </label>
      </div>`).join('');

    document.querySelectorAll('.settingToggle').forEach(cb=>{
      cb.addEventListener('change', async (e)=>{
        const key = e.target.dataset.key;
        const value = e.target.checked;
        e.target.disabled = true;
        const r = await saveAdminSetting(key, value);
        e.target.disabled = false;
        if (r.success) {
          settings[key] = value;
        } else {
          e.target.checked = !value; // ارجع الوضع القديم لو فشل الحفظ
          alert(r.message || 'حصل خطأ في الحفظ');
        }
      });
    });
  }
  function renderVisibilityList(){
    document.getElementById('visibilityListWrap').innerHTML = visibilityItems.map(it => `
      <div class="setting-row">
        <div>
          <div class="setting-label">${escapeHtml(it.label)}</div>
          <div class="setting-desc">${it.desc}</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" class="visibilityToggle" data-key="${it.key}" ${settings[it.key]===true?'checked':''}>
          <span class="toggle-slider"></span>
        </label>
      </div>`).join('');

    document.querySelectorAll('.visibilityToggle').forEach(cb=>{
      cb.addEventListener('change', async (e)=>{
        const key = e.target.dataset.key;
        const value = e.target.checked;
        e.target.disabled = true;
        const r = await saveAdminSetting(key, value);
        e.target.disabled = false;
        if (r.success) {
          settings[key] = value;
        } else {
          e.target.checked = !value;
          alert(r.message || 'حصل خطأ في الحفظ');
        }
      });
    });
  }
  renderList();
  renderVisibilityList();
}

async function renderBlacklist(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderBlacklist());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('manage_blacklist')) return renderAdminHub();

  let items = [];
  const res = await getBlacklist();
  if (res && res.success) items = res.items;

  const typeLabel = { email:'إيميل', phone:'رقم هاتف', name:'اسم عميل' };

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('blacklist','🚫 القائمة السوداء')}</div>
      <button class="secondary small" id="backToAdminFromBlacklistBtn">🛡️ رجوع للوحة التحكم</button>
    </div>
    <div class="info">أي بريد أو رقم هاتف أو اسم عميل تضيفه هنا لا يستطيع تسجيل حساب جديد في الموقع إطلاقًا. وإن كان مسجّلًا مسبقًا وحاول إكمال اشتراك (باختيار باقة)، فسيُمنع من المتابعة أيضًا — ويبقى في شاشة اختيار الباقات.</div>

    <h2>إضافة للقائمة السوداء</h2>
    <div class="section-card">
      <form id="blacklistForm">
        <label>النوع</label>
        <select id="blType">
          <option value="email">إيميل</option>
          <option value="phone">رقم هاتف</option>
          <option value="name">اسم عميل</option>
        </select>
        <label>القيمة</label>
        <input type="text" id="blValue" required placeholder="مثال: test@example.com أو 01012345678 أو اسم العميل">
        <label>السبب (اختياري)</label>
        <input type="text" id="blReason" placeholder="ملاحظة داخلية لك فقط">
        <button type="submit">إضافة للقائمة السوداء</button>
      </form>
    </div>

    <h2 class="u-mt20">القائمة الحالية</h2>
    <div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="blacklistSearch" placeholder="🔍 ابحث بالقيمة أو السبب..."></div>
    </div>
    <div class="section-card" id="blacklistTableWrap"></div>
  </div>`;

  document.getElementById('backToAdminFromBlacklistBtn').onclick=()=>goAdminHome();

  function renderBlacklistTable(){
    const q = (document.getElementById('blacklistSearch')?.value || '').trim().toLowerCase();
    const visible = q ? items.filter(it => (it.value||'').toLowerCase().includes(q) || (it.reason||'').toLowerCase().includes(q)) : items;
    document.getElementById('blacklistTableWrap').innerHTML = items.length===0 ? '<p class="u-note">القائمة السوداء فارغة حاليًا.</p>'
      : (visible.length ? `<table>
      <thead><tr><th>النوع</th><th>القيمة</th><th>السبب</th><th>تاريخ الإضافة</th><th></th></tr></thead>
      <tbody>
        ${visible.map(it=>`<tr>
          <td>${typeLabel[it.type]||it.type}</td><td>${escapeHtml(it.value)}</td><td>${it.reason||'-'}</td>
          <td>${formatDateAr(it.createdAt ? it.createdAt.split(' ')[0] : '')}</td>
          <td><button class="small danger u-wa" data-gcall="__removeFromBlacklist" data-gargs="${gArgs([String(it.id)])}">حذف</button></td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p class="std-filter-empty">لا توجد نتائج مطابقة للبحث</p>');
  }
  renderBlacklistTable();
  const blSearchEl = document.getElementById('blacklistSearch');
  if (blSearchEl) blSearchEl.addEventListener('input', renderBlacklistTable);

  document.getElementById('blacklistForm').onsubmit = async (e) => {
    e.preventDefault();
    const type = document.getElementById('blType').value;
    const value = document.getElementById('blValue').value.trim();
    const reason = document.getElementById('blReason').value.trim();
    if(!value) return;
    const r = await addToBlacklist(type, value, reason);
    if (r.success){
      items.unshift({ id:String(r.id), type, value, reason, createdAt: new Date().toISOString().split('T')[0] });
      renderBlacklistTable();
      document.getElementById('blValue').value = '';
      document.getElementById('blReason').value = '';
    } else {
      alert(r.message || 'حصل خطأ');
    }
  };

  window.__removeFromBlacklist = async (id) => {
    if(!await gConfirm('هل أنت متأكد من إزالة هذا العنصر من القائمة السوداء؟')) return;
    const r = await removeFromBlacklist(id);
    if (r.success){
      items = items.filter(x=>x.id!==id);
      renderBlacklistTable();
    } else {
      alert(r.message || 'حصل خطأ');
    }
  };
}

/* ================== الفريق والصلاحيات ================== */
async function renderStaffManagementPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderStaffManagementPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('manage_staff')) return renderAdminHub();

  const res = await getStaffList();
  if (!res || !res.success) {
    if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}<div class="error">تعذّر تحميل بيانات الفريق.</div></div>`;
    return;
  }
  let staff = res.staff;
  const permissionKeys = res.permissionKeys; // { key: label }
  const jobTitles = res.jobTitles; // { key: label }
  const defaultsByJobTitle = res.defaultsByJobTitle;

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('staff_management','👥 الفريق والصلاحيات')}</div>
      <button class="secondary small" id="backToAdminFromStaffBtn">🛡️ رجوع للوحة التحكم</button>
    </div>
    <div class="info">
      كل عضو فريق تضيفه هنا يجب أن يكون لديه حساب عادي على الموقع مسبقًا (يسجّل ببريده أولًا). بعد إضافته بمسماه الوظيفي، تُحدَّد له صلاحيات افتراضية حسب المسمى، ويمكنك زيادة أو إنقاص أي صلاحية بنفسك في أي وقت من الجدول أدناه.
    </div>

    <h2>إضافة عضو فريق</h2>
    <div class="section-card">
      <form id="staffAddForm">
        <label>البريد (يجب أن يكون مسجّلًا به حساب بالفعل)</label>
        <input type="email" id="staffEmail" required placeholder="example@email.com">
        <label class="u-row">المسمى الوظيفي <button type="button" class="small secondary u-wa u-m0" id="staffEditTitlesBtn">🏷️ إضافة / تعديل المسميات</button></label>
        <select id="staffJobTitle">
          ${Object.keys(jobTitles).map(k=>`<option value="${escapeHtml(k)}">${escapeHtml(jobTitles[k])}</option>`).join('')}
        </select>
        <button type="submit">إضافة</button>
      </form>
      <div id="staffAddResult"></div>
    </div>

    <h2 class="u-mt20">أعضاء الفريق الحاليين</h2>
    <div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="staffSearch" placeholder="🔍 ابحث بالإيميل أو المسمى الوظيفي..."></div>
    </div>
    <div class="section-card" id="staffTableWrap"></div>
  </div>`;

  document.getElementById('staffEditTitlesBtn').onclick = () => renderJobTitlesPage();   // الإصدار 85
  document.getElementById('backToAdminFromStaffBtn').onclick=()=>goAdminHome();

  function permCheckboxesHtml(staffId, currentPerms){
    return Object.keys(permissionKeys).map(key=>{
      const checked = currentPerms.includes(key) ? 'checked' : '';
      return `<label style="display:inline-flex;align-items:center;gap:6px;margin:4px 12px 4px 0;font-weight:normal;">
        <input type="checkbox" class="staff-perm-cb" data-staff="${staffId}" value="${key}" ${checked}> ${permissionKeys[key]}
      </label>`;
    }).join('');
  }

  function renderStaffTable(){
    const q = (document.getElementById('staffSearch')?.value || '').trim().toLowerCase();
    const visible = q ? staff.filter(s => (s.email||'').toLowerCase().includes(q) || (jobTitles[s.jobTitle]||s.jobTitle||'').toLowerCase().includes(q)) : staff;
    document.getElementById('staffTableWrap').innerHTML = staff.length===0 ? '<p class="u-note">لا يوجد لديك أي عضو فريق مضاف بعد.</p>'
      : (visible.length ? visible.map(s=>`
      <div class="section-card" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center;">
          <div>${s.staffCode ? `<b class="tag" dir="ltr">${escapeHtml(s.staffCode)}</b> ` : ''}<strong>${escapeHtml(s.email)}</strong>${s.memberCode ? ` <span class="u-fs11 u-muted" dir="ltr">(${escapeHtml(s.memberCode)})</span>` : ''} — ${escapeHtml(jobTitles[s.jobTitle] || s.jobTitle || "")} ${s.active ? '' : '<span class="tag tag-wait">موقوف</span>'}</div>
          <span style="display:flex;gap:6px;flex-wrap:wrap;">${s.active
            ? `<button class="small danger u-wa" data-gcall="__removeStaff" data-gargs="${gArgs([String(s.id)])}">إيقاف (إزالة من الفريق)</button>`
            : `<button class="small btn-lightgreen u-wa" data-gcall="__staffMode" data-gargs="${gArgs([String(s.id), 'restore'])}">↩️ إرجاع للفريق</button>`}
          <button class="small danger u-wa" data-gcall="__staffMode" data-gargs="${gArgs([String(s.id), 'purge'])}">🗑️ حذف من الفريق نهائيًا</button></span>
        </div>
        <div class="u-mt8 u-fs12"><b>🔔 قنوات الإشعارات:</b> ${gNpCellHtml(s.email)}</div>
        <div class="u-mt10">${permCheckboxesHtml(s.id, s.permissions)}</div>
        <button class="small secondary u-wa u-mt8" data-gcall="__saveStaffPerms" data-gargs="${gArgs([String(s.id)])}">حفظ الصلاحيات</button>
      </div>
    `).join('') : '<p class="std-filter-empty">لا توجد نتائج مطابقة للبحث</p>');
    gNpWire(document.getElementById('staffTableWrap'));
  }
  await gNpLoad(true);
  renderStaffTable();
  const staffSearchEl = document.getElementById('staffSearch');
  if (staffSearchEl) staffSearchEl.addEventListener('input', renderStaffTable);

  document.getElementById('staffAddForm').onsubmit = async (e) => {
    e.preventDefault();
    const staffEmail = document.getElementById('staffEmail').value.trim().toLowerCase();
    const jobTitle = document.getElementById('staffJobTitle').value;
    const r = await addStaffMember(staffEmail, jobTitle);
    const resultEl = document.getElementById('staffAddResult');
    if (r.success) {
      resultEl.innerHTML = '';
      const fresh = await getStaffList();
      if (fresh.success) { staff = fresh.staff; renderStaffTable(); }
      document.getElementById('staffEmail').value = '';
    } else {
      resultEl.innerHTML = `<div class="error u-mt8">${r.message || 'حصل خطأ'}</div>`;
    }
  };

  window.__saveStaffPerms = async (staffId) => {
    const boxes = document.querySelectorAll(`.staff-perm-cb[data-staff="${staffId}"]`);
    const selected = Array.from(boxes).filter(b=>b.checked).map(b=>b.value);
    const r = await updateStaffPermissions(staffId, selected);
    if (r.success) { alert('تم حفظ الصلاحيات.'); } else { alert(r.message || 'حصل خطأ'); }
  };

  // الإصدار 85: إرجاع عضو موقوف للفريق بنفس صلاحياته، أو حذفه من الفريق نهائيًا
  window.__staffMode = async (staffId, mode) => {
    const who = (staff.find(x => String(x.id) === String(staffId)) || {}).email || '';
    const ok = mode === 'restore'
      ? await gConfirm(`إرجاع ${who} للفريق بنفس صلاحياته القديمة؟`, { ok: 'إرجاع للفريق' })
      : await gConfirm(`حذف ${who} من الفريق بكل صلاحياته؟ سيبقى حسابه العادي كعميل موجودًا، وينتقل إلى سلة المحذوفات ويمكنك استرجاعه منها.`, { ok: 'حذف', danger: true });
    if (!ok) return;
    const r = await apiPost('/staff_remove.php', { staffId, mode }).catch(() => null);
    if (!r || !r.success) { alert((r && r.message) || 'حصل خطأ'); return; }
    const fresh = await getStaffList();
    if (fresh.success) { staff = fresh.staff; renderStaffTable(); }
  };

  window.__removeStaff = async (staffId) => {
    if(!await gConfirm('هل أنت متأكد من إزالة هذا الشخص من الفريق؟ سيبقى حسابه العادي كعميل موجودًا، لكنه سيفقد صلاحيات لوحة التحكم.')) return;
    const r = await removeStaffMember(staffId);
    if (r.success) {
      const fresh = await getStaffList();
      if (fresh.success) { staff = fresh.staff; renderStaffTable(); }
    } else {
      alert(r.message || 'حصل خطأ');
    }
  };
}

/* ================== تنسيق الموقع (محتوى محدود، بدون بيانات جوهرية) ================== */
/* ================== قائمة كل الشاشات القابلة لتخصيص خلفيتها + المعاينة السريعة ================== */
const BG_SCREENS = [
  {v:'login', l:'🔐 شاشة تسجيل الدخول', fn:'renderLogin'},
  {v:'splash', l:'👋 شاشة الترحيب (الصفحة الأولى)', fn:'renderPublicHome'},
  {v:'public_pricing', l:'الباقات والأسعار', fn:'renderPublicPricing'},
  {v:'testimonials', l:'⭐ آراء العملاء', fn:'renderTestimonialsPage'},
  {v:'articles_list', l:'📰 مقالات', fn:'renderArticlesListPage'},
  {v:'article_detail', l:'📰 مقال', fn:'renderArticleDetailPage'},
  {v:'privacy_page', l:'سياسة الخصوصية', fn:'renderPrivacyPolicyPage'},
  {v:'home', l:'ابدأ من هنا', fn:'renderHome'},
  {v:'my_subscription_history', l:'📄 سجل اشتراكي', fn:'renderMySubscriptionHistory'},
  {v:'disclaimer_page', l:'⚠️ إخلاء المسؤولية (Disclaimer)', fn:'renderDisclaimerPage'},
  {v:'disclaimer_gate', l:'⚠️ إخلاء المسؤولية', fn:''},
  {v:'about_page', l:'عن GRIFFINE', fn:'renderAboutPage'},
  {v:'refund_policy_page', l:'سياسة استرداد الاشتراك', fn:'renderRefundPolicyPage'},
  {v:'suggestions_page', l:'💡 شاركنا مقترحاتك', fn:'renderSuggestionsPage'},
  {v:'contact_info', l:'بيانات التواصل', fn:'renderContactInfo'},
  {v:'admin_hub', l:'🛡️ لوحة التحكم', fn:'renderAdminHub'},
  {v:'admin_subscribers', l:'🛡️ لوحة تحكم المدير — المشتركون', fn:'renderAdminSubscribers'},
  {v:'archived_customers', l:'🗄️ أرشيف العملاء المحذوفين', fn:'renderArchivedCustomers'},
  {v:'plans_management', l:'💳 إدارة الخطط والأسعار', fn:'renderPlansManagementPage'},
  {v:'chat_admin', l:'💬 الدردشة الفورية', fn:'renderChatAdminPage'},
  {v:'admin_settings', l:'⚙️ الصلاحيات والإعدادات الإلزامية', fn:'renderAdminSettingsPage'},
  {v:'blacklist', l:'🚫 القائمة السوداء', fn:'renderBlacklist'},
  {v:'staff_management', l:'👥 الفريق والصلاحيات', fn:'renderStaffManagementPage'},
  {v:'hr', l:'🧑‍💼 شؤون الموظفين (HR)', fn:'renderHrPage'},
  {v:'job_titles', l:'🏷️ المسميات الوظيفية', fn:'renderJobTitlesPage'},
  {v:'site_design', l:'🎨 تنسيق الموقع', fn:'renderSiteDesignPage'},
  {v:'admin_reports', l:'📊 التقارير والإحصائيات', fn:'renderAdminReportsPage'},
  {v:'trades_report', l:'📈 تقرير الصفقات', fn:'renderTradesReportPage'},
  {v:'chat_faq', l:'💡 المساعد الذكي في الشات', fn:'renderFaqAdminPage'},
  {v:'recommendations_admin', l:'📢 توصية شراء / بيع', fn:'renderRecommendationsAdminPage'},
  {v:'recommendations_customer', l:'📢 التوصيات', fn:'renderRecommendationsCustomerPage'},
  {v:'content_admin', l:'📰 آراء العملاء والمقالات', fn:'renderContentAdminPage'},
  {v:'site_texts_admin', l:'📝 تعديل نصوص شاشات الموقع', fn:'renderSiteTextsAdminPage'},
  {v:'suggestions_admin', l:'💡 مقترحات العملاء لتطوير الموقع', fn:'renderSuggestionsAdminPage'},
  {v:'plans_list', l:'خططك الحالية (سهم لكل خطة)', fn:'renderPlansList'},
  {v:'portfolio', l:'📊 ملخص المحفظة', fn:'renderPortfolio'},
  {v:'diversification_report', l:'⚖️ ميزان محفظتك AI (توزيع التنوع)', fn:'renderDiversificationReport'},
  {v:'referral', l:'🎁 ادعُ صديق', fn:'renderReferralPage'},
  {v:'profile', l:'👤 الملف الشخصي', fn:'renderProfilePage'},
  {v:'grid_plans_list', l:'🔲 خطط الشبكة (Grid)', fn:'renderGridPlansList'},
  {v:'grid_plan_new', l:'+ خطة شبكة جديدة', fn:'renderGridPlanForm'},
  {v:'plan_type_chooser', l:'اختر نوع الخطة', fn:'renderPlanTypeChooser'},
  {v:'screener', l:'كشاف الأسهم — تحليل فني لسهم واحد', fn:'renderScreener'},
  {v:'register', l:'📝 إنشاء حساب جديد', fn:'renderRegister'},
  {v:'login_email', l:'✉️ تسجيل الدخول بالبريد وكلمة المرور', fn:'renderLoginEmail'},
  {v:'forgot_password', l:'🔑 نسيت كلمة المرور', fn:'renderForgotPassword'},
  {v:'reset_password', l:'🔑 إعادة تعيين كلمة المرور', fn:'renderResetPassword'},
  {v:'verify_email_prompt', l:'📧 طلب تأكيد البريد الإلكتروني', fn:'renderVerifyEmailPrompt'},
  {v:'verify_email_result', l:'📧 نتيجة تأكيد البريد الإلكتروني', fn:'renderVerifyEmailResult'},
  {v:'pending_activation', l:'⏳ بانتظار تفعيل الاشتراك', fn:'renderPendingActivation'},
  {v:'access_expired', l:'⛔ انتهاء صلاحية الاشتراك', fn:'renderAccessExpired'},
  {v:'public_plans_info', l:'ℹ️ تعريف الباقات للزوار', fn:'renderPublicPlansInfo'},
  {v:'subscription_plans', l:'💳 اختيار الباقة والاشتراك', fn:'renderSubscriptionPlans'},
  {v:'plan_change_checkout', l:'🔄 تأكيد تغيير الباقة', fn:'renderPlanChangeCheckout'},
  {v:'checkout_form', l:'💳 إتمام الاشتراك (نموذج الدفع)', fn:'renderCheckoutForm'},
  {v:'new_plan_form', l:'➕ خطة تعزيز متوسط جديدة (نموذج)', fn:'renderNewPlanForm'},
  {v:'plan_detail', l:'📈 تفاصيل خطة تعزيز المتوسط', fn:'renderPlanDetail'},
  {v:'edit_plan_settings', l:'⚙️ تعديل إعدادات خطة تعزيز المتوسط', fn:'renderEditPlanSettings'},
  {v:'grid_plan_detail', l:'🔲 تفاصيل خطة الشبكة', fn:'renderGridPlanDetail'},
  {v:'grid_edit_plan_settings', l:'⚙️ تعديل إعدادات خطة الشبكة', fn:'renderGridEditPlanSettings'}
];

// بيانات تجريبية للشاشات اللي بتحتاج بيانات عشان تتعرض (عشان المعاينة تشتغل على أي شاشة)
async function previewArgsFor(key){
  const email = await getSession();
  const today = new Date().toISOString().slice(0,10);
  const sampleSub = { planName:'باقة تجريبية', amount:100, currency:'EGP', startDate:today, endDate:today };
  switch (key) {
    case 'verify_email_prompt': return { args:[email || 'name@example.com'] };
    case 'pending_activation':
    case 'access_expired': return { args:[sampleSub] };
    case 'plan_change_checkout': return { args:[{ planName:'الباقة الجديدة', amount:200, currency:'EGP' }, sampleSub] };
    case 'checkout_form': return { args:[{ planName:'باقة تجريبية', amount:100, currency:'EGP', planId:0 }] };
    case 'reset_password':
    case 'verify_email_result': return { args:['preview-token'] };
    case 'plan_detail':
    case 'edit_plan_settings': {
      const plans = email ? await getPlans(email) : null;
      const sym = plans && Object.keys(plans)[0];
      return sym ? { args:[sym] } : { error:'لا توجد لديك خطط تعزيز متوسط لمعاينة هذه الشاشة — أنشئ خطة أولًا ثم عُد.' };
    }
    case 'grid_plan_detail':
    case 'grid_edit_plan_settings': {
      const grids = email ? await getGridPlans(email) : null;
      const sym = grids && Object.keys(grids)[0];
      return sym ? { args:[sym] } : { error:'لا توجد لديك خطط شبكة لمعاينة هذه الشاشة — أنشئ خطة أولًا ثم عُد.' };
    }
    default: return { args:[] };
  }
}

// بيفتح الشاشة الحقيقية للمعاينة: withPending=true بالصورة الجديدة اللي بعد ما اتحفظتش، false بشكلها الحالي كما هو
async function launchScreenPreview(key, withPending){
  const screen = BG_SCREENS.find(s => s.v === key);
  const resEl = document.getElementById('bgSaveResult');
  const fail = (msg) => { if (resEl) resEl.innerHTML = `<div class="error u-mt8">${msg}</div>`; };
  if (!screen || !screen.fn || typeof window[screen.fn] !== 'function') return fail('معاينة مباشرة غير متاحة لهذه الشاشة.');
  const pa = await previewArgsFor(key);
  if (pa.error) return fail(pa.error);
  window.__pageBackgroundsPreview = window.__pageBackgroundsPreview || {};
  const usePending = !!(withPending && window.__bgPendingImage);
  if (usePending) window.__pageBackgroundsPreview[key] = window.__bgPendingImage; else delete window.__pageBackgroundsPreview[key];
  window.__bgPreviewReturn = { key, label: screen.l, fn: screen.fn, args: pa.args, hasPending: usePending };
  window[screen.fn](...pa.args);
  showBgPreviewBar();
}

// زر عائم صغير للأدمن على أي شاشة معروفة: بيفتح "تنسيق الموقع" على نفس الشاشة عشان يعاين ويرفع خلفيتها
function updateBgShortcut(){
  // الزر العائم اتلغى بناءً على طلب صاحب الموقع - تعديل الخلفيات متاح من لوحة التحكم ← تنسيق الموقع
  const old = document.getElementById('bgShortcutBtn'); if (old) old.remove();
  return;
  let btn = document.getElementById('bgShortcutBtn');
  const key = window.__lastPageKey;
  const ok = window.__isAdmin && hasPermission('edit_site_design') && key && key !== 'site_design'
    && BG_SCREENS.some(s => s.v === key) && !document.getElementById('bgPreviewBar');
  if (!ok) { if (btn) btn.remove(); return; }
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'bgShortcutBtn'; btn.type = 'button'; btn.title = 'معاينة وتعديل خلفية هذه الشاشة'; btn.textContent = '🖼️';
    btn.onclick = () => { window.__bgDesignPreselect = window.__lastPageKey; renderSiteDesignPage(); };
    document.body.appendChild(btn);
  }
}

async function renderSiteDesignPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderSiteDesignPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('edit_site_design')) return renderAdminHub();

  const res = await getSiteContent();
  const content = (res && res.success) ? res.content : {};
  let customButtons = [];
  try { customButtons = JSON.parse(content.custom_buttons || '[]'); } catch(e) { customButtons = []; }

  const fontOptions = [
    {v:'', l:'افتراضي الموقع'}, {v:'Cairo', l:'Cairo'}, {v:'Tajawal', l:'Tajawal'},
    {v:'Almarai', l:'Almarai'}, {v:'Tahoma', l:'Tahoma'}, {v:'Arial', l:'Arial'}, {v:'Georgia', l:'Georgia'},
  ];
  const buttonTypeLabel = { whatsapp:'واتساب', phone:'اتصال هاتفي', email:'إيميل', url:'رابط' };

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('site_design','🎨 تنسيق الموقع')}</div>
      <button class="secondary small" id="backToAdminFromDesignBtn">🛡️ رجوع للوحة التحكم</button>
    </div>
    <div class="info">التعديلات هنا شكلية بحتة ولا تؤثر على بيانات العملاء أو الاشتراكات أو الأسعار. اترك أي حقل فارغًا ليبقى الشكل الافتراضي الحالي كما هو.</div>

    <h2>الألوان والخط العام</h2>
    <div class="section-card">
      <div class="grid2">
        <div><label>لون الخلفية</label><input type="color" id="bgColor" value="${content.bg_color || '#ffffff'}"><button type="button" class="small secondary u-wa u-mt4" id="clearBgColor">استخدام الافتراضي</button></div>
        <div><label>لون النص</label><input type="color" id="textColor" value="${content.text_color || '#222222'}"><button type="button" class="small secondary u-wa u-mt4" id="clearTextColor">استخدام الافتراضي</button></div>
      </div>
      <div class="grid2 u-mt10">
        <div><label>لون الأزرار والروابط الأساسي</label><input type="color" id="accentColor" value="${content.accent_color || '#1b8a5a'}"><button type="button" class="small secondary u-wa u-mt4" id="clearAccentColor">استخدام الافتراضي</button></div>
        <div><label>نوع الخط</label><select id="fontFamily">${fontOptions.map(f=>`<option value="${f.v}" ${content.font_family===f.v?'selected':''}>${f.l}</option>`).join('')}</select></div>
      </div>
      <label class="u-mt10">حجم الخط الأساسي (12-22)</label>
      <input type="number" id="fontSize" min="12" max="22" value="${content.font_size_base || 16}" style="max-width:120px;">
      <div class="grid2 u-mt10">
        <div><label>سماكة الخط</label><select id="fontWeight">
          <option value="" ${content.font_weight===''||!content.font_weight?'selected':''}>افتراضي</option>
          <option value="400" ${content.font_weight==='400'?'selected':''}>عادي (400)</option>
          <option value="500" ${content.font_weight==='500'?'selected':''}>متوسط (500)</option>
          <option value="600" ${content.font_weight==='600'?'selected':''}>شبه غامق (600)</option>
          <option value="700" ${content.font_weight==='700'?'selected':''}>غامق (700)</option>
        </select></div>
        <div></div>
      </div>
      <div class="u-mt14">
        <label>ثيمات جاهزة (اضغط لملء الحقول أعلاه، ثم احفظ)</label>
        <div id="themePresetsRow" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;"></div>
      </div>
      <button id="saveThemeBtn" class="u-mt12">حفظ الألوان والخط</button>
      <div id="themeSaveResult"></div>
    </div>

    <h2 class="u-mt20">بانر الصفحة الرئيسية (يظهر أعلى شاشة تسجيل الدخول)</h2>
    <div class="section-card">
      <label>نوع البانر</label>
      <select id="heroType">
        <option value="none" ${content.hero_banner_type==='none'?'selected':''}>بدون بانر</option>
        <option value="image" ${content.hero_banner_type==='image'?'selected':''}>صورة</option>
        <option value="video" ${content.hero_banner_type==='video'?'selected':''}>فيديو (رابط MP4 مباشر)</option>
      </select>
      <label>رابط الصورة أو الفيديو</label>
      <input type="text" id="heroUrl" value="${content.hero_banner_url || ''}" placeholder="https://...">
      <label>العنوان الرئيسي</label>
      <input type="text" id="heroTitle" maxlength="120" value="${content.hero_title || ''}" placeholder="مثال: تابع أسهمك بذكاء مع GRIFFINE">
      <label>العنوان الفرعي</label>
      <input type="text" id="heroSubtitle" maxlength="200" value="${content.hero_subtitle || ''}" placeholder="مثال: خطط تعزيز متوسط، كشاف فرص، وتنبيهات لحظية">
      <button id="saveHeroBtn" class="u-mt12">حفظ البانر</button>
      <div id="heroSaveResult"></div>
    </div>

    <h2 class="u-mt20">أزرار إجراء مخصصة (تظهر أسفل البانر)</h2>
    <div class="section-card">
      <div id="customButtonsWrap"></div>
      <h3 class="u-mt14">إضافة زرار جديد</h3>
      <label>نص الزرار</label>
      <input type="text" id="newBtnLabel" maxlength="40" placeholder="مثال: تواصل معنا واتساب">
      <label>نوع الإجراء</label>
      <select id="newBtnType">
        <option value="whatsapp">واتساب (رقم بدون + أو مسافات)</option>
        <option value="phone">اتصال هاتفي (رقم)</option>
        <option value="email">إيميل</option>
        <option value="url">رابط خارجي</option>
      </select>
      <label>القيمة</label>
      <input type="text" id="newBtnValue" placeholder="مثال: 201095125325 أو https://...">
      <button id="addBtnBtn" class="u-mt10">إضافة الزرار</button>
      <div id="btnSaveResult"></div>
    </div>

    <h2 class="u-mt20">شريط إعلان أعلى الموقع</h2>
    <div class="section-card">
      <label style="display:flex;align-items:center;gap:8px;font-weight:normal;">
        <input type="checkbox" id="annEnabled" ${content.announcement_enabled === '1' ? 'checked' : ''}> تفعيل شريط الإعلان
      </label>
      <label class="u-mt10">نص الإعلان (حد أقصى 300 حرف)</label>
      <textarea id="annText" rows="2" maxlength="300" placeholder="مثال: عرض خاص على الباقة السنوية لمدة أسبوع!">${content.announcement_text || ''}</textarea>
      <button id="saveAnnBtn" class="u-mt10">حفظ</button>
      <div id="annSaveResult"></div>
    </div>
    <h2 class="u-mt20">🖼️ خلفية شاشة محددة (اختياري)</h2>
    <div class="section-card">
      <div class="info">اختَر أي شاشة من الموقع وارفع لها صورة خلفية خاصة، وستظهر ممزوجة خلف محتوى الشاشة (مثل خلفية شاشتي الترحيب والدخول تمامًا). هذا التنسيق مستقل تمامًا عن الألوان والخط أعلاه — رفع صورة لشاشة معيّنة لا يغيّر شكل باقي الشاشات، وتغيير الألوان لا يؤثر على أي صورة مرفوعة. الأنسب للشاشات الرئيسية والتعريفية أكثر من شاشات الجداول الكبيرة (مثل المشتركين أو التقارير) حتى تبقى سهلة القراءة.</div>
      <label class="u-mt10">اختر الشاشة</label>
      <select id="bgScreenSelect"></select>
      <div id="bgPreviewWrap" class="u-mt12"></div>
      <input type="file" accept="image/*" id="bgUploadInput" style="display:none;">
      <div id="bgActionsRow" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
        <button id="bgPreviewCurrentBtn" type="button" class="secondary u-wa">👁️ عاين الشاشة الحالية</button>
        <button id="bgUploadBtn" class="secondary u-wa">📤 رفع صورة لهذه الشاشة</button>
        <button id="bgRemoveBtn" class="danger" style="width:auto;display:none;">إزالة الخلفية الحالية</button>
      </div>
      <div id="bgConfirmRow" style="display:none;flex-wrap:wrap;gap:8px;margin-top:10px;">
        <button id="bgPreviewRealBtn" type="button" class="secondary u-wa">👁️ عاين الشاشة الحقيقية</button>
        <button id="bgConfirmSaveBtn" type="button" class="u-wa">💾 حفظ كخلفية للشاشة</button>
        <button id="bgCancelBtn" type="button" class="btn-gray u-wa">إلغاء</button>
      </div>
      <div id="bgSaveResult"></div>
    </div>
  </div>`;

  document.getElementById('backToAdminFromDesignBtn').onclick=()=>goAdminHome();
  document.getElementById('clearBgColor').onclick=()=>{ document.getElementById('bgColor').value = '#ffffff'; window.__clearBg = true; };
  document.getElementById('clearTextColor').onclick=()=>{ document.getElementById('textColor').value = '#222222'; window.__clearText = true; };
  document.getElementById('clearAccentColor').onclick=()=>{ document.getElementById('accentColor').value = '#1b8a5a'; window.__clearAccent = true; };

  document.getElementById('saveThemeBtn').onclick = async () => {
    const bg = window.__clearBg ? '' : document.getElementById('bgColor').value;
    const text = window.__clearText ? '' : document.getElementById('textColor').value;
    const accent = window.__clearAccent ? '' : document.getElementById('accentColor').value;
    const font = document.getElementById('fontFamily').value;
    const size = document.getElementById('fontSize').value;
    const weight = document.getElementById('fontWeight').value;
    const results = await Promise.all([
      saveSiteContent('bg_color', bg), saveSiteContent('text_color', text),
      saveSiteContent('accent_color', accent), saveSiteContent('font_family', font),
      saveSiteContent('font_size_base', size), saveSiteContent('font_weight', weight),
    ]);
    document.getElementById('themeSaveResult').innerHTML = results.every(r=>r.success)
      ? '<div class="info u-mt8">✅ تم الحفظ. حدّث الصفحة عشان تشوف التغيير.</div>'
      : '<div class="error u-mt8">حصل خطأ في بعض القيم.</div>';
  };

  // ثيمات جاهزة - بس بتملأ الحقول فوق، مبتحفظش لوحدها (لازم زرار "حفظ الألوان والخط")
  const themePresets = [
    { name:'الافتراضي', bg:'#ffffff', text:'#222222', accent:'#1b8a5a', font:'', weight:'' },
    { name:'ذهبي GRIFFINE', bg:'#ffffff', text:'#1a2530', accent:'#b68d33', font:'Tajawal', weight:'500' },
    { name:'أزرق محيطي', bg:'#f3f8fb', text:'#0f2a3d', accent:'#1673b1', font:'Cairo', weight:'' },
    { name:'ليلي أنيق', bg:'#12181f', text:'#eef1f4', accent:'#3fae7c', font:'Tajawal', weight:'' },
    { name:'دافئ', bg:'#fbf6ee', text:'#3a2b1b', accent:'#c9722f', font:'Almarai', weight:'500' },
    { name:'بساطة رمادية', bg:'#fafafa', text:'#2b2b2b', accent:'#4a4a4a', font:'Tahoma', weight:'' },
  ];
  document.getElementById('themePresetsRow').innerHTML = themePresets.map((p,i)=>`
    <button type="button" class="secondary small themePresetBtn" data-i="${i}" style="width:auto;display:flex;align-items:center;gap:6px;">
      <span style="width:14px;height:14px;border-radius:50%;background:${p.accent};display:inline-block;border:1px solid rgba(0,0,0,.15);"></span>${escapeHtml(p.name)}
    </button>`).join('');
  document.querySelectorAll('.themePresetBtn').forEach(btn=>{
    btn.onclick = () => {
      const p = themePresets[parseInt(btn.dataset.i,10)];
      window.__clearBg = false; window.__clearText = false; window.__clearAccent = false;
      document.getElementById('bgColor').value = p.bg;
      document.getElementById('textColor').value = p.text;
      document.getElementById('accentColor').value = p.accent;
      document.getElementById('fontFamily').value = p.font;
      document.getElementById('fontWeight').value = p.weight;
    };
  });

  document.getElementById('saveHeroBtn').onclick = async () => {
    const results = await Promise.all([
      saveSiteContent('hero_banner_type', document.getElementById('heroType').value),
      saveSiteContent('hero_banner_url', document.getElementById('heroUrl').value.trim()),
      saveSiteContent('hero_title', document.getElementById('heroTitle').value.trim()),
      saveSiteContent('hero_subtitle', document.getElementById('heroSubtitle').value.trim()),
    ]);
    document.getElementById('heroSaveResult').innerHTML = results.every(r=>r.success)
      ? '<div class="info u-mt8">✅ تم الحفظ. هيظهر في صفحة تسجيل الدخول.</div>'
      : `<div class="error u-mt8">${results.find(r=>!r.success)?.message || 'حصل خطأ'}</div>`;
  };

  function renderCustomButtonsList(){
    document.getElementById('customButtonsWrap').innerHTML = customButtons.length ? customButtons.map((b,i)=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #eee;">
        <div>${escapeHtml(b.label)} <span style="color:#888;font-size:12px;">(${buttonTypeLabel[b.type]||b.type}: ${escapeHtml(b.value)})</span></div>
        <button class="small danger u-wa" data-gcall="__removeCustomBtn" data-gargs="${gArgs([i])}">حذف</button>
      </div>
    `).join('') : '<p class="u-note">لا يوجد أزرار مضافة.</p>';
  }
  renderCustomButtonsList();

  async function saveCustomButtons(){
    const r = await saveSiteContent('custom_buttons', JSON.stringify(customButtons));
    document.getElementById('btnSaveResult').innerHTML = r.success
      ? '<div class="info u-mt8">✅ تم الحفظ.</div>'
      : `<div class="error u-mt8">${r.message || 'حصل خطأ'}</div>`;
  }

  document.getElementById('addBtnBtn').onclick = async () => {
    const label = document.getElementById('newBtnLabel').value.trim();
    const type = document.getElementById('newBtnType').value;
    const value = document.getElementById('newBtnValue').value.trim();
    if (!label || !value) return;
    if (customButtons.length >= 6) { alert('أقصى عدد أزرار هو 6.'); return; }
    customButtons.push({ label, type, value });
    await saveCustomButtons();
    renderCustomButtonsList();
    document.getElementById('newBtnLabel').value = '';
    document.getElementById('newBtnValue').value = '';
  };

  window.__removeCustomBtn = async (i) => {
    customButtons.splice(i, 1);
    await saveCustomButtons();
    renderCustomButtonsList();
  };

  document.getElementById('saveAnnBtn').onclick = async () => {
    const enabled = document.getElementById('annEnabled').checked;
    const text = document.getElementById('annText').value.trim();
    const r1 = await saveSiteContent('announcement_enabled', enabled ? '1' : '0');
    const r2 = await saveSiteContent('announcement_text', text);
    const resultEl = document.getElementById('annSaveResult');
    resultEl.innerHTML = (r1.success && r2.success)
      ? '<div class="info u-mt8">✅ تم الحفظ. التغيير هيظهر لكل الزوار فورًا.</div>'
      : '<div class="error u-mt8">حصل خطأ أثناء الحفظ.</div>';
  };

  // خلفية شاشة محددة
  const bgScreens = BG_SCREENS;
  document.getElementById('bgScreenSelect').innerHTML = bgScreens.map(s=>`<option value="${s.v}">${s.l}</option>`).join('');
  window.__pageBackgroundsPreview = window.__pageBackgroundsPreview || {};

  function findScreen(key){ return bgScreens.find(s=>s.v===key); }

  function currentBgPreview(){
    const key = document.getElementById('bgScreenSelect').value;
    delete window.__pageBackgroundsPreview[key]; // نبدأ من غير معاينة معلّقة كل ما نغيّر الشاشة المختارة
    const img = window.__pageBackgrounds && window.__pageBackgrounds[key];
    document.getElementById('bgPreviewWrap').innerHTML = img
      ? `<img src="${img}" style="width:100%;max-width:360px;border-radius:10px;display:block;border:1px solid var(--border);">`
      : '<div class="u-note">لا يوجد صورة مرفوعة لهذه الشاشة — الشكل الافتراضي شغّال.</div>';
    document.getElementById('bgRemoveBtn').style.display = img ? 'inline-block' : 'none';
    document.getElementById('bgActionsRow').style.display = 'flex';
    document.getElementById('bgConfirmRow').style.display = 'none';
    document.getElementById('bgSaveResult').innerHTML = '';
  }
  currentBgPreview();
  document.getElementById('bgScreenSelect').onchange = currentBgPreview;

  async function saveBg(dataUrlOrEmpty){
    const key = document.getElementById('bgScreenSelect').value;
    const resEl = document.getElementById('bgSaveResult');
    resEl.innerHTML = '<div style="font-size:12.5px;color:#888;margin-top:6px;">جاري الحفظ...</div>';
    const r = await savePageBackground(key, dataUrlOrEmpty);
    if (r && r.success) {
      window.__pageBackgrounds = window.__pageBackgrounds || {};
      if (dataUrlOrEmpty) window.__pageBackgrounds[key] = dataUrlOrEmpty; else delete window.__pageBackgrounds[key];
      delete window.__pageBackgroundsPreview[key];
      currentBgPreview();
      resEl.innerHTML = '<div class="info u-mt8">✅ اتحفظت. هتظهر لكل الزوار فورًا.</div>';
    } else {
      resEl.innerHTML = `<div class="error u-mt8">${(r&&r.message)||'حصل خطأ في الحفظ'}</div>`;
    }
  }

  // بعد اختيار صورة: نعرضها كمعاينة "قبل/بعد" جنب بعض من غير ما نحفظها على السيرفر حتى ما تضغط "حفظ"
  document.getElementById('bgUploadBtn').onclick = () => document.getElementById('bgUploadInput').click();
  document.getElementById('bgUploadInput').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if (!file) return;
    const key = document.getElementById('bgScreenSelect').value;
    const beforeImg = window.__pageBackgrounds && window.__pageBackgrounds[key];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width*scale), h = Math.round(img.height*scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        let compressed = canvas.toDataURL('image/webp', 0.82);
        if (compressed.indexOf('data:image/webp') !== 0) compressed = canvas.toDataURL('image/jpeg', 0.82);
        window.__bgPendingImage = compressed;
        document.getElementById('bgPreviewWrap').innerHTML = `
          <div style="display:flex;gap:14px;flex-wrap:wrap;">
            <div><div style="font-size:12px;color:#888;margin-bottom:4px;">قبل (الحالي)</div>
              ${beforeImg ? `<img src="${beforeImg}" style="width:170px;height:110px;object-fit:cover;border-radius:8px;border:1px solid var(--border);">`
                : '<div style="width:170px;height:110px;border:1px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#999;text-align:center;padding:6px;">الشكل الافتراضي (بدون صورة)</div>'}
            </div>
            <div><div style="font-size:12px;color:#888;margin-bottom:4px;">بعد (الصورة الجديدة)</div>
              <img src="${compressed}" style="width:170px;height:110px;object-fit:cover;border-radius:8px;border:1px solid var(--border);">
            </div>
          </div>`;
        document.getElementById('bgActionsRow').style.display = 'none';
        document.getElementById('bgConfirmRow').style.display = 'flex';
        document.getElementById('bgSaveResult').innerHTML = '';
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  document.getElementById('bgRemoveBtn').onclick = () => saveBg('');
  document.getElementById('bgCancelBtn').onclick = () => { window.__bgPendingImage = null; currentBgPreview(); };
  document.getElementById('bgConfirmSaveBtn').onclick = () => { if (window.__bgPendingImage) saveBg(window.__bgPendingImage); };

  // معاينة الشاشة الحقيقية بالصورة الجديدة قبل الحفظ، مع إمكانية التبديل "قبل/بعد" ورجوع لتنسيق الموقع
  document.getElementById('bgPreviewRealBtn').onclick = () => launchScreenPreview(document.getElementById('bgScreenSelect').value, true);
  document.getElementById('bgPreviewCurrentBtn').onclick = () => launchScreenPreview(document.getElementById('bgScreenSelect').value, false);

  // لو جاي من الزر العائم 🖼️ على شاشة معينة: نختارها تلقائيًا وننزل لقسم الخلفية
  if (window.__bgDesignPreselect && bgScreens.some(s => s.v === window.__bgDesignPreselect)) {
    document.getElementById('bgScreenSelect').value = window.__bgDesignPreselect;
    currentBgPreview();
    document.getElementById('bgScreenSelect').scrollIntoView({ block:'center' });
  }
  window.__bgDesignPreselect = null;
}

function showBgPreviewBar(){
  const st = window.__bgPreviewReturn;
  if (!st) return;
  const sb = document.getElementById('bgShortcutBtn'); if (sb) sb.remove();
  let bar = document.getElementById('bgPreviewBar');
  if (!bar) { bar = document.createElement('div'); bar.id = 'bgPreviewBar'; document.body.appendChild(bar); }
  const isAfter = Object.prototype.hasOwnProperty.call(window.__pageBackgroundsPreview, st.key);
  const toggleHtml = st.hasPending ? `
    <span class="bgpv-toggle">
      <button type="button" class="bgpv-before ${!isAfter?'active':''}">قبل</button>
      <button type="button" class="bgpv-after ${isAfter?'active':''}">بعد</button>
    </span>` : '';
  bar.innerHTML = `
    <span class="bgpv-label">👁️ معاينة: ${escapeHtml(st.label)}${st.hasPending ? '' : ' (الشكل الحالي)'}</span>
    ${toggleHtml}
    <button type="button" class="bgpv-back">🔙 رجوع لتنسيق الموقع</button>`;
  const rerender = () => { window[st.fn](...(st.args || [])); showBgPreviewBar(); };
  if (st.hasPending) {
    bar.querySelector('.bgpv-before').onclick = () => { delete window.__pageBackgroundsPreview[st.key]; rerender(); };
    bar.querySelector('.bgpv-after').onclick = () => { window.__pageBackgroundsPreview[st.key] = window.__bgPendingImage; rerender(); };
  }
  bar.querySelector('.bgpv-back').onclick = () => {
    delete window.__pageBackgroundsPreview[st.key];
    window.__bgPreviewReturn = null;
    window.__bgDesignPreselect = st.key;
    hideBgPreviewBar();
    renderSiteDesignPage();
  };
}
function hideBgPreviewBar(){
  const bar = document.getElementById('bgPreviewBar');
  if (bar) bar.remove();
}

/* ================== التقارير والإحصائيات (أدمن) ====
============== */
async function renderAdminReportsPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderAdminReportsPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('view_reports')) return renderAdminHub();

  const mkt = gAdminMarket();   // الإصدار 96: التقارير حسب السوق
  const res = await getAdminReports(mkt);
  if (!res || !res.success) {
    if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}<div class="error">تعذّر تحميل التقارير.</div></div>`;
    return;
  }

  function barRow(label, value, maxValue, formatter){
    const pct = maxValue > 0 ? Math.max(4, Math.round((value / maxValue) * 100)) : 0;
    return `<div class="u-mb8">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;"><span>${label}</span><span>${formatter(value)}</span></div>
      <div style="background:#eee;border-radius:4px;height:10px;overflow:hidden;"><div style="background:var(--green);height:100%;width:${pct}%;"></div></div>
    </div>`;
  }

  // كل الأسواق وفيه إيرادات بأكتر من عملة ← الرسوم مش هتجمع عملات مختلفة (الملخص بيعرض كل سوق بعملته)
  const revMarkets = (res.summary || []).filter(x => x.revenue > 0);
  const mixed = !mkt && new Set(revMarkets.map(x => x.ccy)).size > 1;
  const ccyTxt = mkt ? (res.currency || '') : (revMarkets[0] ? revMarkets[0].ccy : '');
  const money = (v) => fmtMoney(v) + (ccyTxt ? ' ' + ccyTxt : '');
  const summaryHtml = (res.summary || []).length ? `<h2 class="u-mt20">ملخص الأسواق</h2><div class="section-card"><div class="table-scroll"><table class="g-table" id="mktSummary"><thead><tr><th>السوق</th><th>الحالة</th><th>المسجلين</th><th>المشتركين النشطين</th><th>كل الاشتراكات</th><th>الإيراد (الكل)</th><th>إيراد الشهر الحالي</th></tr></thead><tbody>
    ${res.summary.map(x => `<tr data-mkt="${escapeHtml(x.market)}" class="g-click"><td><b>${escapeHtml(x.market)}</b></td><td>${x.active ? 'مفعّل' : 'غير مفعّل'}</td><td class="g-num">${x.registered}</td><td class="g-num">${x.activeSubs}</td><td class="g-num">${x.subscribers}</td><td class="g-num">${fmtMoney(x.revenue)} ${x.ccy}</td><td class="g-num">${fmtMoney(x.revenueMonth)} ${x.ccy}</td></tr>`).join('')}
    </tbody></table></div><div class="u-hint u-mt6">اضغط على سوق لعرض تقاريره بالتفصيل. كل سوق بعملته - لا يتم جمع عملات مختلفة.</div></div>` : '';
  const maxRevenue = Math.max(1, ...res.revenueByMonth.map(r=>r.total));
  const maxSignups = Math.max(1, ...res.signupsByMonth.map(r=>r.count));
  const maxPlan = Math.max(1, ...res.byPlan.map(r=>r.total));

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('admin_reports','📊 التقارير والإحصائيات')}</div>
      ${adminNavButtonsHtml()}
    </div>
    ${gAdminMarketBarHtml('repMarket')}
    ${mkt ? `<div class="info">السوق: <b>${escapeHtml(mkt)}</b> — العملة: ${escapeHtml(res.currency || '')}</div>` : summaryHtml}

    <h2>لقطة سريعة</h2>
    <div class="summary-cards">
      <div class="summary-card"><div class="val">${res.activeCount}</div><div class="lbl">مشتركين نشطين</div></div>
      <div class="summary-card"><div class="val">${res.inactiveCount}</div><div class="lbl">مشتركين موقوفين</div></div>
    </div>

    <h2 class="u-mt20">الإيرادات شهريًا (آخر 12 شهر)</h2>
    <div class="section-card">
      ${mixed ? '<p class="u-note">الإيرادات بأكثر من عملة - اختر سوقًا من القائمة أعلاه لعرض الرسم بعملته.</p>' : res.revenueByMonth.length ? res.revenueByMonth.map(r=>barRow(r.month, r.total, maxRevenue, money)).join('') : '<p class="u-note">لا يوجد بيانات كافية بعد.</p>'}
    </div>

    <h2 class="u-mt20">اشتراكات جديدة شهريًا (آخر 12 شهر)</h2>
    <div class="section-card">
      ${res.signupsByMonth.length ? res.signupsByMonth.map(r=>barRow(r.month, r.count, maxSignups, v=>v)).join('') : '<p class="u-note">لا يوجد بيانات كافية بعد.</p>'}
    </div>

    <h2 class="u-mt20">الإيرادات حسب الباقة (كل الأوقات)</h2>
    <div class="section-card">
      ${mixed ? '<p class="u-note">اختر سوقًا لعرض الإيرادات حسب الباقة بعملته.</p>' : ''}${!mixed && res.byPlan.length ? res.byPlan.map(r=>barRow(`${escapeHtml(r.planName)} (${r.count})`, r.total, maxPlan, money)).join('') : (mixed ? '' : '<p class="u-note">لا يوجد بيانات كافية بعد.</p>')}
    </div>
  </div>`;
  wireAdminNavButtons();
  const rerender = () => { window.__navSilent = true; try { renderAdminReportsPage(); } finally { window.__navSilent = false; } };
  gWireAdminMarket('repMarket', rerender);
  app.querySelectorAll('#mktSummary tr[data-mkt]').forEach(tr => tr.addEventListener('click', () => { try { localStorage.setItem('gs_admin_market', tr.dataset.mkt); } catch(e){} rerender(); }));
}

/* الإصدار 128: شاشة «توصية شراء / بيع» للمحلل وشاشة التوصيات للعميل اتنقلوا لـ recs.js */

/* ================== لوحة إدارة المحتوى - آراء العملاء والمقالات (أدمن) ================== */
async function renderContentAdminPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderContentAdminPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  // الإصدار 85: آراء العملاء بصلاحية لوحدها (manage_testimonials) والمقالات (manage_content)
  const canTesti = hasPermission('manage_testimonials'), canArt = hasPermission('manage_content');
  if(!canTesti && !canArt) return renderAdminHub();

  const [testiRes, artRes] = await Promise.all([getTestimonials(), getArticlesAdmin()]);
  let testimonials = (testiRes && testiRes.success) ? testiRes.testimonials : [];
  let articles = (artRes && artRes.success) ? artRes.articles : [];

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('content_admin','📰 آراء العملاء والمقالات')}</div>
      ${adminNavButtonsHtml()}
    </div>

    <div id="testiSection" ${canTesti ? '' : 'style="display:none"'}>
    <h2>آراء العملاء (${testimonials.length})</h2>
    <div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="testiAdminSearch" placeholder="🔍 ابحث بالاسم أو نص الرأي..."></div>
    </div>
    <div class="section-card" id="testiAdminListWrap"></div>
    </div>

    <h2 class="u-mt20">إضافة/تعديل مقال</h2>
    <div class="section-card">
      <form id="artForm">
        <input type="hidden" id="art_id" value="">
        <label>العنوان</label>
        <input type="text" id="art_title" required maxlength="200">
        <label>ملخص قصير (يظهر في القائمة)</label>
        <input type="text" id="art_summary" maxlength="300">
        <label>محتوى المقال</label>
        <textarea id="art_body" rows="8" required></textarea>
        <label style="display:flex;align-items:center;gap:8px;font-weight:normal;">
          <input type="checkbox" id="art_published" checked> منشور (ظاهر للزوار)
        </label>
        <button type="submit" class="u-mt10">حفظ المقال</button>
        <button type="button" class="secondary" id="art_cancelEdit" style="display:none;">إلغاء التعديل</button>
      </form>
      <div id="artSaveResult"></div>
    </div>

    <h2 class="u-mt20">المقالات (${articles.length})</h2>
    <div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="artAdminSearch" placeholder="🔍 ابحث بعنوان المقال..."></div>
    </div>
    <div class="section-card" id="artAdminListWrap"></div>
  </div>`;

  wireAdminNavButtons();
  // الإصدار 85: من غير صلاحية المقالات ← قسم المقالات مايظهرش (السيرفر بيرفض أي تعديل كمان)
  if (!canArt) { let n = document.getElementById('testiSection').nextElementSibling; while (n) { n.style.display = 'none'; n = n.nextElementSibling; } }

  function renderTestiList(){
    const q = (document.getElementById('testiAdminSearch')?.value || '').trim().toLowerCase();
    const visible = q ? testimonials.filter(t => (t.displayName||'').toLowerCase().includes(q) || (t.comment||'').toLowerCase().includes(q)) : testimonials;
    document.getElementById('testiAdminListWrap').innerHTML = testimonials.length===0 ? '<p class="u-note">لا توجد آراء بعد.</p>'
      : (visible.length ? visible.map(t=>`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border-soft);gap:8px;">
        <div>
          <div>${'⭐'.repeat(t.rating)} — <strong>${escapeHtml(t.displayName)}</strong></div>
          <div style="font-size:12.5px;color:#555;">"${escapeHtml(t.comment)}"</div>
          <div class="u-fs11 u-muted">${formatDateAr(t.createdAt)}</div>
        </div>
        <button class="small danger u-wa" data-gcall="__deleteTestiAdmin" data-gargs="${gArgs([String(t.id)])}">حذف</button>
      </div>`).join('') : '<p class="std-filter-empty">لا توجد نتائج مطابقة للبحث</p>');
  }
  renderTestiList();
  const testiAdminSearchEl = document.getElementById('testiAdminSearch');
  if (testiAdminSearchEl) testiAdminSearchEl.addEventListener('input', renderTestiList);

  window.__deleteTestiAdmin = async (id) => {
    if (!await gConfirm('هل أنت متأكد من حذف هذا الرأي؟')) return;
    const r = await deleteTestimonial(id);
    if (r.success) { testimonials = testimonials.filter(x=>x.id!==id); renderTestiList(); }
    else alert(r.message || 'حصل خطأ');
  };

  function renderArticlesList(){
    const q = (document.getElementById('artAdminSearch')?.value || '').trim().toLowerCase();
    const visible = q ? articles.filter(a => (a.title||'').toLowerCase().includes(q)) : articles;
    document.getElementById('artAdminListWrap').innerHTML = articles.length===0 ? '<p class="u-note">لا توجد مقالات بعد.</p>'
      : (visible.length ? visible.map(a=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-soft);gap:8px;flex-wrap:wrap;">
        <div><strong>${escapeHtml(a.title)}</strong> ${a.published?'':'<span class="tag tag-wait">مسودة</span>'}</div>
        <div>
          <button class="small secondary u-wa" data-gcall="__editArticle" data-gargs="${gArgs([String(a.id)])}">تعديل</button>
          <button class="small danger u-wa" data-gcall="__deleteArticleAdmin" data-gargs="${gArgs([String(a.id)])}">حذف</button>
        </div>
      </div>`).join('') : '<p class="std-filter-empty">لا توجد نتائج مطابقة للبحث</p>');
  }
  renderArticlesList();
  const artAdminSearchEl = document.getElementById('artAdminSearch');
  if (artAdminSearchEl) artAdminSearchEl.addEventListener('input', renderArticlesList);

  window.__editArticle = (id) => {
    const a = articles.find(x=>x.id===id);
    if (!a) return;
    document.getElementById('art_id').value = a.id;
    document.getElementById('art_title').value = a.title;
    document.getElementById('art_summary').value = a.summary || '';
    document.getElementById('art_body').value = a.body;
    document.getElementById('art_published').checked = a.published;
    document.getElementById('art_cancelEdit').style.display = '';
    window.scrollTo(0,0);
  };
  document.getElementById('art_cancelEdit').onclick = () => {
    document.getElementById('artForm').reset();
    document.getElementById('art_id').value = '';
    document.getElementById('art_cancelEdit').style.display = 'none';
  };

  window.__deleteArticleAdmin = async (id) => {
    if (!await gConfirm('هل أنت متأكد من حذف هذا المقال؟')) return;
    const r = await deleteArticle(id);
    if (r.success) { articles = articles.filter(x=>x.id!==id); renderArticlesList(); }
    else alert(r.message || 'حصل خطأ');
  };

  document.getElementById('artForm').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      id: document.getElementById('art_id').value || 0,
      title: document.getElementById('art_title').value.trim(),
      summary: document.getElementById('art_summary').value.trim(),
      body: document.getElementById('art_body').value.trim(),
      published: document.getElementById('art_published').checked ? '1' : '0',
    };
    const r = await saveArticle(data);
    const resultEl = document.getElementById('artSaveResult');
    if (r.success) {
      resultEl.innerHTML = '<div class="info u-mt8">✅ تم الحفظ.</div>';
      document.getElementById('artForm').reset();
      document.getElementById('art_id').value = '';
      document.getElementById('art_cancelEdit').style.display = 'none';
      const fresh = await getArticlesAdmin();
      if (fresh.success) { articles = fresh.articles; renderArticlesList(); }
    } else {
      resultEl.innerHTML = `<div class="error u-mt8">${r.message || 'حصل خطأ'}</div>`;
    }
  };
}

/* ================== مقترحات العملاء لتطوير الموقع - عرض الأدمن ================== */
/* ================== تعديل نصوص شاشات الموقع (للأدمن) ================== */
/* سجل كل الشاشات اللي ممكن تتعدل عنوانها من هنا - أي شاشة جديدة تتضاف للموقع تضاف هنا كمان عشان تظهر في القائمة */
const SITE_SCREEN_TITLES_REGISTRY = [
  { key: 'public_home_tagline', label: 'شاشة الترحيب — العنوان الرئيسي', def: 'قرارات أذكى. محافظ أقوى.' },
  { key: 'public_home_motto', label: 'الشعار الفرعي أعلى صورة الجريفين (شاشة الترحيب + شاشة الدخول)', def: 'الانضباط يحسب لك الحرية' },
  { key: 'home', label: 'الشاشة الرئيسية (بعد تسجيل الدخول)', def: 'ابدأ من هنا' },
  { key: 'public_pricing', label: 'الباقات والأسعار (قبل تسجيل الدخول)', def: 'الباقات والأسعار' },
  { key: 'testimonials', label: 'آراء العملاء', def: '⭐ آراء العملاء' },
  { key: 'articles_list', label: 'قائمة المقالات', def: '📰 مقالات' },
  { key: 'article_detail', label: 'تفاصيل المقال', def: '📰 مقال' },
  { key: 'suggestions_page', label: 'شاركنا مقترحاتك (شاشة العميل)', def: '💡 شاركنا مقترحاتك' },
  { key: 'contact_info', label: 'تواصل معنا (بدون تسجيل دخول)', def: 'بيانات التواصل' },
  { key: 'my_subscription_history', label: 'سجل اشتراكي', def: '📄 سجل اشتراكي' },
  { key: 'disclaimer_page', label: 'إخلاء المسؤولية (صفحة كاملة)', def: '⚠️ إخلاء المسؤولية (Disclaimer)' },
  { key: 'disclaimer_gate', label: 'إخلاء المسؤولية (بوابة الموافقة الإلزامية)', def: '⚠️ إخلاء المسؤولية' },
  { key: 'about_page', label: 'عن GRIFFINE (عنوان الشاشة)', def: 'عن GRIFFINE' },
  { key: 'refund_policy_page', label: 'سياسة استرداد الاشتراك (عنوان الشاشة)', def: 'سياسة استرداد الاشتراك' },
  { key: 'privacy_page', label: 'سياسة الخصوصية (عنوان الشاشة)', def: 'سياسة الخصوصية' },
  { key: 'portfolio', label: 'ملخص المحفظة', def: '📊 ملخص المحفظة' },
  { key: 'diversification_report', label: 'تقرير تنويع المحفظة', def: '🎯 تقرير تنويع المحفظة' },
  { key: 'referral', label: 'ادعُ صديق', def: '🎁 ادعُ صديق' },
  { key: 'profile', label: 'الملف الشخصي', def: '👤 الملف الشخصي' },
  { key: 'plans_list', label: 'قائمة خطط تعزيز المتوسط (DCA)', def: 'خططك الحالية (سهم لكل خطة)' },
  { key: 'plan_type_chooser', label: 'اختيار نوع الخطة الجديدة', def: 'اختر نوع الخطة' },
  { key: 'grid_plans_list', label: 'قائمة خطط الشبكة (Grid)', def: '🔲 خطط الشبكة (Grid)' },
  { key: 'grid_plan_new', label: 'إضافة خطة شبكة جديدة', def: '+ خطة شبكة جديدة' },
  { key: 'screener', label: 'كشاف الأسهم', def: 'كشاف الأسهم — تحليل فني لسهم واحد' },
  { key: 'recommendations_customer', label: 'التوصيات (شاشة العميل)', def: '📢 التوصيات' },
  { key: 'admin_hub', label: 'لوحة التحكم الرئيسية (أدمن)', def: '🛡️ لوحة التحكم' },
  { key: 'admin_subscribers', label: 'لوحة تحكم المدير — المشتركون', def: '🛡️ لوحة تحكم المدير — المشتركون' },
  { key: 'archived_customers', label: 'أرشيف العملاء المحذوفين', def: '🗄️ أرشيف العملاء المحذوفين' },
  { key: 'plans_management', label: 'إدارة الخطط والأسعار (أدمن)', def: '💳 إدارة الخطط والأسعار' },
  { key: 'chat_admin', label: 'الدردشة الفورية (أدمن)', def: '💬 الدردشة الفورية' },
  { key: 'admin_settings', label: 'الصلاحيات والإعدادات الإلزامية', def: '⚙️ الصلاحيات والإعدادات الإلزامية' },
  { key: 'blacklist', label: 'القائمة السوداء', def: '🚫 القائمة السوداء' },
  { key: 'staff_management', label: 'الفريق والصلاحيات', def: '👥 الفريق والصلاحيات' },
  { key: 'site_design', label: 'تنسيق الموقع', def: '🎨 تنسيق الموقع' },
  { key: 'admin_reports', label: 'التقارير والإحصائيات', def: '📊 التقارير والإحصائيات' },
  { key: 'recommendations_admin', label: 'توصيات الشراء (أدمن)', def: '📢 توصيات الشراء' },
  { key: 'content_admin', label: 'آراء العملاء والمقالات (أدمن)', def: '📰 آراء العملاء والمقالات' },
  { key: 'site_texts_admin', label: 'تعديل نصوص شاشات الموقع (هذه الشاشة)', def: '📝 تعديل نصوص شاشات الموقع' },
  { key: 'suggestions_admin', label: 'مقترحات العملاء لتطوير الموقع (أدمن)', def: '💡 مقترحات العملاء لتطوير الموقع' },
];

async function renderSiteTextsAdminPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderSiteTextsAdminPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('manage_site_content')) return renderAdminHub();

  const res = await getAllPageContents();
  const contents = (res && res.success) ? (res.contents || {}) : {};

  const pages = [
    { key: 'about', label: 'عن GRIFFINE', hint: 'النص الذي يظهر في شاشة "عن GRIFFINE".' },
    { key: 'contact', label: 'تواصل معنا', hint: 'بيانات التواصل: البريد، أرقام الهاتف والواتساب، أو أي بيانات أخرى.' },
    { key: 'refund_policy', label: 'سياسة استرداد الاشتراك', hint: 'نص سياسة الاسترداد الكامل.' },
    { key: 'privacy', label: 'سياسة الخصوصية', hint: 'نص سياسة الخصوصية الكامل (يظهر في شاشة تسجيل الدخول وعلى الرابط /index.php?page=privacy). اتركه فارغًا لاستخدام النص الافتراضي.' },
    { key: 'terms', label: 'الشروط والأحكام', hint: 'نص الشروط والأحكام الكامل (يظهر في الصفحة العامة وعلى الرابط /index.php?page=terms). اتركه فارغًا لاستخدام النص الافتراضي.' },
    { key: 'suggestions', label: 'شاركنا مقترحاتك', hint: 'النص التعريفي الذي يظهر أعلى نموذج المقترحات.' },
  ];

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('site_texts_admin','📝 تعديل نصوص شاشات الموقع')}</div>
      ${adminNavButtonsHtml()}
    </div>
    <div class="info">من هنا تقدر تعدّل عنوان أي شاشة من شاشات الموقع (${SITE_SCREEN_TITLES_REGISTRY.length} شاشة)، وكذلك نص صفحات المحتوى الطويلة (عن الموقع، سياسة الاسترداد، تواصل معنا، مقترحاتك). إذا تركت الخانة فارغة، ستعرض الشاشة العنوان/النص الأصلي الافتراضي الخاص بها.</div>

    <h2 style="margin-top:18px;">🏷️ عناوين الشاشات</h2>
    <div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="screenTitlesSearch" placeholder="🔍 دوّر على اسم الشاشة..."></div>
    </div>
    <div id="screenTitlesEmpty" class="std-filter-empty" style="display:none;">لا توجد شاشة مطابقة للبحث</div>
    <div id="screenTitlesList">
      ${SITE_SCREEN_TITLES_REGISTRY.map(s => `
        <div class="section-card screen-title-row" data-q="${escapeHtml(s.label.toLowerCase())}" style="margin-bottom:10px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;">
          <div style="flex:1;min-width:220px;">
            <div style="font-size:13.5px;font-weight:700;">${escapeHtml(s.label)}</div>
            <div class="u-hint">الافتراضي: ${escapeHtml(s.def)}</div>
          </div>
          <input type="text" id="pt_${s.key}" placeholder="${escapeHtml(s.def)}" value="${escapeHtml(contents['title__'+s.key] || '')}" style="flex:2;min-width:200px;">
          <button class="secondary small u-wa" data-gcall="__savePageTitle" data-gargs="${gArgs([String(s.key)])}">💾 حفظ</button>
          <div id="ptResult_${s.key}" class="u-w100"></div>
        </div>
      `).join('')}
    </div>

    <h2 class="u-mt24">📄 نصوص الصفحات</h2>
    ${pages.map(p => `
      <h3 style="margin-top:18px;">${escapeHtml(p.label)}</h3>
      <div class="section-card">
        <div style="font-size:12.5px;color:#666;margin-bottom:8px;">${p.hint}</div>
        <textarea id="pc_${p.key}" rows="8" placeholder="اتركها فارغة لعرض النص الافتراضي...">${escapeHtml(contents[p.key] || '')}</textarea>
        <button class="secondary u-wa u-mt8" data-gcall="__savePageText" data-gargs="${gArgs([String(p.key)])}">💾 حفظ نص هذه الشاشة</button>
        <div id="pcResult_${p.key}"></div>
      </div>
    `).join('')}
  </div>`;
  wireAdminNavButtons();

  const titlesSearchInput = document.getElementById('screenTitlesSearch');
  if (titlesSearchInput) {
    titlesSearchInput.oninput = () => {
      const q = titlesSearchInput.value.trim().toLowerCase();
      let anyVisible = false;
      document.querySelectorAll('.screen-title-row').forEach(row => {
        const show = !q || (row.dataset.q || '').includes(q);
        row.style.display = show ? '' : 'none';
        if (show) anyVisible = true;
      });
      const empty = document.getElementById('screenTitlesEmpty');
      if (empty) empty.style.display = anyVisible ? 'none' : '';
    };
  }

  window.__savePageTitle = async (key) => {
    const resEl = document.getElementById('ptResult_' + key);
    const value = document.getElementById('pt_' + key).value;
    const r = await savePageContent('title__' + key, value);
    if (r && r.success) {
      resEl.innerHTML = '<div class="info u-mt6">✅ تم الحفظ، والعنوان اتحدّث فورًا في كل مكان في الموقع (القائمة المنسدلة وعنوان الشاشة نفسها).</div>';
      if (window.__pageTitles) { if (value && value.trim() !== '') window.__pageTitles[key] = value; else delete window.__pageTitles[key]; }
      await refreshTopNav(); // عشان القائمة المنسدلة (☰) تتحدث فورًا من غير ما تحتاج تعمل تحديث للصفحة
    } else {
      resEl.innerHTML = `<div class="error u-mt6">${(r&&r.message)||'حصل خطأ في الحفظ'}</div>`;
    }
  };

  window.__savePageText = async (key) => {
    const resEl = document.getElementById('pcResult_' + key);
    const content = document.getElementById('pc_' + key).value;
    const r = await savePageContent(key, content);
    if (r && r.success) {
      resEl.innerHTML = '<div class="info u-mt8">✅ تم الحفظ، والتعديل ظاهر للعملاء فورًا.</div>';
    } else {
      resEl.innerHTML = `<div class="error u-mt8">${(r&&r.message)||'حصل خطأ في الحفظ'}</div>`;
    }
  };
}

async function renderSuggestionsAdminPage(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderSuggestionsAdminPage());
  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>${pageTitle('suggestions_admin','💡 مقترحات العملاء لتطوير الموقع')}</div>${adminNavButtonsHtml()}</div>
    <div id="suggestionsListWrap">جارٍ التحميل...</div>
  </div>`;
  wireAdminNavButtons();

  const res = await apiGet('/suggestions_admin_list.php');
  const wrap = document.getElementById('suggestionsListWrap');
  if (!res || !res.success) {
    wrap.innerHTML = `<div class="error">${(res&&res.message)||'حصل خطأ في تحميل المقترحات — تأكد إنك شغّلت update_schema_25_suggestions.sql على قاعدة البيانات.'}</div>`;
    return;
  }
  const suggestions = res.suggestions;
  if (!suggestions.length) {
    wrap.innerHTML = '<p class="u-note">لا توجد لدينا أي اقتراحات من العملاء بعد.</p>';
    return;
  }

  function statusLabel(st){ return st==='reviewed' ? 'تمت المراجعة' : 'جديد'; }
  function suggestionCardsHtml(list){
    return list.map(s => `
    <div class="section-card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
        <div><strong>${escapeHtml(s.email)}</strong> <span style="color:#888;font-size:11.5px;">— ${formatDateTimeAr(s.createdAt)}</span></div>
        <span class="tag ${s.status==='reviewed'?'tag-done':'tag-next'}">${statusLabel(s.status)}</span>
      </div>
      <p style="font-size:13px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(s.message)}</p>
      ${s.attachment ? (
        s.attachmentType && s.attachmentType.startsWith('image/')
          ? `<img src="${escapeHtml(s.attachment)}" style="max-width:260px;border-radius:8px;margin-top:8px;display:block;">`
          : `<a href="${escapeHtml(s.attachment)}" download="${escapeHtml(s.attachmentName||'مرفق.pdf')}" style="display:inline-block;margin-top:8px;">📎 تحميل المرفق (${escapeHtml(s.attachmentName||'ملف')})</a>`
      ) : ''}
      <div class="topbar u-mt10">
        ${s.status!=='reviewed' ? `<button class="small secondary" data-gcall="__suggestionMarkReviewed" data-gargs="${gArgs([s.id])}">✅ وضع علامة "تمت المراجعة"</button>` : ''}
        <button class="small danger" data-gcall="__suggestionDelete" data-gargs="${gArgs([s.id])}">حذف</button>
      </div>
    </div>`).join('');
  }

  wrap.innerHTML = `<div class="std-filter-bar">
    <div class="std-filter-search"><input type="text" id="suggestionsSearch" placeholder="🔍 ابحث بالإيميل أو نص الاقتراح..."></div>
    <div class="std-filter-tabs">
      <button type="button" class="small secondary std-filter-tab btn-active" data-status="all">الكل</button>
      <button type="button" class="small secondary std-filter-tab" data-status="new">جديد</button>
      <button type="button" class="small secondary std-filter-tab" data-status="reviewed">تمت المراجعة</button>
    </div>
  </div>
  <div id="suggestionsCardsWrap"></div>`;

  function renderSuggestionCards(){
    const q = (document.getElementById('suggestionsSearch')?.value || '').trim().toLowerCase();
    const activeTab = document.querySelector('#suggestionsListWrap .std-filter-tab.btn-active');
    const statusFilter = activeTab ? activeTab.dataset.status : 'all';
    const visible = suggestions.filter(s => {
      const matchesQ = !q || (s.email||'').toLowerCase().includes(q) || (s.message||'').toLowerCase().includes(q);
      const matchesStatus = statusFilter==='all' || (statusFilter==='reviewed' ? s.status==='reviewed' : s.status!=='reviewed');
      return matchesQ && matchesStatus;
    });
    document.getElementById('suggestionsCardsWrap').innerHTML = visible.length ? suggestionCardsHtml(visible) : '<p class="std-filter-empty">لا توجد اقتراحات مطابقة</p>';
  }
  document.getElementById('suggestionsSearch').addEventListener('input', renderSuggestionCards);
  document.querySelectorAll('#suggestionsListWrap .std-filter-tab').forEach(tab=>{
    tab.onclick = () => {
      document.querySelectorAll('#suggestionsListWrap .std-filter-tab').forEach(t=>t.classList.remove('btn-active'));
      tab.classList.add('btn-active');
      renderSuggestionCards();
    };
  });
  renderSuggestionCards();

  window.__suggestionMarkReviewed = async (id) => {
    await apiPost('/suggestion_admin_update.php', { id, action: 'markReviewed' });
    renderSuggestionsAdminPage();
  };
  window.__suggestionDelete = async (id) => {
    if (!await gConfirm('هل أنت متأكد من حذف هذا الاقتراح؟')) return;
    await apiPost('/suggestion_admin_update.php', { id, action: 'delete' });
    renderSuggestionsAdminPage();
  };
}

