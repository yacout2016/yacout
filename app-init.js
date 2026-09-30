/* =====================================================================
   GRIFFINE — app-init.js (الإصدار 88) — تشغيل الموقع (آخر ملف - بعد تحميل كل الملفات)
   (اتفصل من griffine.js - كل الملفات بتتحمّل بالترتيب في index.php وبتشارك نفس المتغيرات العامة)
   ===================================================================== */
(async function init(){
  const params = new URLSearchParams(window.location.search);
  initScreenBackgroundWatcher(); // المراقبة شغالة من البداية حتى لشاشات روابط الإيميل
  const resetToken = params.get('reset_token');
  if (resetToken) { await primePageBackgrounds(); renderResetPassword(resetToken); return; }
  const verifyToken = params.get('verify_token');
  if (verifyToken) { await primePageBackgrounds(); renderVerifyEmailResult(verifyToken); return; }
  const refCode = params.get('ref');
  if (refCode) { try { localStorage.setItem('griffine_ref_code', refCode.toUpperCase()); } catch(e){} }
  await initAnnouncementBanner();
  initSiteFooter();
  initTopNav();
  initBottomNav();
  initDarkModeToggle();
  initBackButton();
  initLogoutButton();
  if (window.GShell) GShell.init();
  const [email] = await Promise.all([
    getSession(), // لازم يتنفذ الأول عشان window.__isAdmin يتحدد قبل ما الشات يتفعّل
    primePageTitles(), // تحميل عناوين الشاشات المخصصة من لوحة التحكم قبل أول عرض لأي شاشة
    primePageBackgrounds(), // تحميل خلفيات الشاشات المخصصة قبل أول عرض لأي شاشة
  ]);
  await refreshTopNav();
  initChatWidget(email);
  // الإصدار 114: رابط تحليل «بصيرة» متشارك (للقراءة بس - من غير تسجيل دخول)
  const bsTok = params.get('basira');
  if (bsTok && typeof renderBasiraShared === 'function') { renderBasiraShared(bsTok); return; }
  // رابط مباشر لسياسة الخصوصية: /index.php?page=privacy
  if (params.get('page') === 'privacy') { renderPrivacyPolicyPage(); return; }
  if (params.get('page') === 'delete-account') { window.__afterLoginTarget = 'deleteAccount'; if (email) { GShell.renderDeleteAccount(); } else { renderLogin(); } return; }
  // الإصدار 84: رابط دخول الإدارة السري ← شاشة "دخول الإدارة"
  if (params.get('staff') === '1') { try { history.replaceState(null, '', '/index.php'); } catch(e){} if (!email) { window.__staffGate = true; renderLogin(); return; } }
  // الإصدار 84: رجوع من صفحة الدفع Paymob
  const pay = params.get('pay');
  if (pay) { try { history.replaceState(null, '', '/index.php'); } catch(e){} setTimeout(() => alert(pay === 'ok' ? '✅ تم الدفع بنجاح وتم تفعيل اشتراكك.' : '❌ لم تتم عملية الدفع. يمكنك المحاولة مرة أخرى أو اختيار طريقة دفع أخرى.'), 600); }
  if(email) postLoginRedirect(email); else renderPublicHome();
})();



