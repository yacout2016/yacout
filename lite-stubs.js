/* =====================================================================
   GRIFFINE — lite-stubs.js (الإصدار 149) — بيتحمّل في صفحة الزائر الخفيفة بس (قبل باقي الملفات)
   ---------------------------------------------------------------------
   صفحة الزائر مافيهاش ملفات الخطط ولوحة التحكم وبصيرة والميزان … (أخف بكتير على الموبايل).
   أي شاشة من دول لو اتطلبت ← شاشة تسجيل الدخول (هي كده كده محتاجة حساب)، وبعد الدخول الموقع بيتحمّل كامل
   ويفتح الشاشة المطلوبة. الدوال المساعدة بترجع قيم فاضية من غير أخطاء.
   ===================================================================== */
(function(){
  'use strict';
  const TARGET = { renderPlansList: 'dac', renderGridPlansList: 'grid', renderPortfolio: 'portfolio', renderPlanTypeChooser: 'new', renderScreener: 'screener' };
  const SCREENS = ['renderAdminBasira', 'renderAdminHub', 'renderAdminLandingPage', 'renderAdminMizanAi', 'renderAdminReportsPage', 'renderAdminSettingsPage', 'renderAdminSubscribers',
    'renderAlertsPage', 'renderArchivedCustomers', 'renderBasira', 'renderBlacklist', 'renderChatAdminPage', 'renderContentAdminPage', 'renderDiversificationReport', 'renderEditPlanSettings',
    'renderFaqAdminPage', 'renderGridEditPlanSettings', 'renderGridPlanDetail', 'renderGridPlanForm', 'renderGridPlansList', 'renderHrPage', 'renderJobTitlesPage', 'renderMizanAi', 'renderNewPlanForm',
    'renderOpportunities', 'renderPlanDetail', 'renderPlanTypeChooser', 'renderPlansList', 'renderPlansManagementPage', 'renderPortfolio', 'renderProfilePage', 'renderRecommendationsAdminPage',
    'renderRecommendationsCustomerPage', 'renderReferralPage', 'renderScreener', 'renderSiteDesignPage', 'renderSiteTextsAdminPage', 'renderStaffManagementPage', 'renderStockPage',
    'renderSuggestionsAdminPage', 'renderTradesReportPage', 'renderTrashPage', 'renderWatchlistPage', 'renderBasiraShared', 'renderMizanAiShared', 'goAdminHome', 'renderAdminPeriods', 'renderHomeEdit'];
  SCREENS.forEach(n => { if (typeof window[n] !== 'function') window[n] = function(){
    if (TARGET[n]) window.__afterLoginTarget = TARGET[n];
    if (/Shared$/.test(n)) { location.href = location.pathname + location.search + (location.search ? '&' : '?') + 'full=1'; return; }
    return typeof renderLogin === 'function' ? renderLogin() : null;
  }; });
  const NOOP = ['mkAfterHome', 'mkPortfolioCurve', 'mkLimitList', 'updateChatUnreadBadge', 'updateBgShortcut'];
  NOOP.forEach(n => { if (typeof window[n] !== 'function') window[n] = function(){}; });
  if (typeof window.mkEnsureLivePrices !== 'function') window.mkEnsureLivePrices = async function(){};
  if (typeof window.computeAggregates !== 'function') window.computeAggregates = function(){ return { stockRows: [] }; };
  if (typeof window.gNpMineCard !== 'function') window.gNpMineCard = function(){ return ''; };
  if (typeof window.gPerkState !== 'function') window.gPerkState = function(){ return null; };
  if (typeof window.gPerksLoad !== 'function') window.gPerksLoad = async function(){ return null; };
  if (typeof window.siteCfgAdminApi !== 'function') window.siteCfgAdminApi = async function(){ return { success: false }; };
  if (!window.MARKET_TO_CURRENCY_MAP) window.MARKET_TO_CURRENCY_MAP = {};
})();
