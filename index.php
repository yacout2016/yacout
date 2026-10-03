<?php
/* الإصدار 84: رابط دخول الإدارة السري (?panel=<المفتاح>) - بيفتح بوابة الدخول لحسابات الإدارة 30 دقيقة
   وبيحوّل على طول لرابط نضيف (المفتاح ميفضلش في شريط العنوان ولا في سجل المتصفح).
   مفتاح غلط ← الصفحة الرئيسية عادي من غير أي رسالة (منكشفش إن فيه بوابة) */
if (isset($_GET['panel'])) {
    require_once __DIR__ . '/session_boot.php';
    session_start();
    include __DIR__ . '/db.php';
    require_once __DIR__ . '/security_lib.php';
    $ok = admin_gate_try_open($conn, (string)$_GET['panel']);
    header('Cache-Control: no-store');
    header('Referrer-Policy: no-referrer');
    header('Location: /index.php' . ($ok ? '?staff=1' : ''), true, 302);
    exit();
}
/* الإصدار 149: الزائر (من غير علامة الدخول g_in) بيحمّل ملفات الصفحة العامة بس (أسرع بكتير على الموبايل)
   — أول ما يسجّل دخول الصفحة بتتحمّل تاني كاملة. روابط بصيرة / الميزان المتشاركة بتتحمّل كاملة على طول. */
$gLite = empty($_COOKIE['g_in']) && !isset($_GET['basira']) && !isset($_GET['mizan']) && !isset($_GET['full']);
// منع أي تخزين مؤقت للملف ده خالص من المتصفح أو أي وسيط - ضمان حقيقي أقوى بكتير من meta tags
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: Sat, 01 Jan 2000 00:00:00 GMT");
// رؤوس أمان أساسية
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: SAMEORIGIN");
header("Referrer-Policy: strict-origin-when-cross-origin");
header("Permissions-Policy: camera=(), microphone=(), geolocation=()");
/* الإصدار 88: حماية CSP كاملة - السكربتات من ملفات الموقع نفسه بس (+ مكتبات PDF من cdnjs + شارت TradingView)
   لا يوجد أي سكربت أو onclick مكتوب جوه الصفحة ← أي كود متحقن مش هيشتغل */
header("Content-Security-Policy: default-src 'self'; "
    . "script-src 'self' https://cdnjs.cloudflare.com https://s3.tradingview.com; "
    . "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    . "font-src 'self' data: https://fonts.gstatic.com; "
    . "img-src 'self' data: blob: https:; "
    . "media-src 'self' blob:; "
    . "connect-src 'self'; "
    . "frame-src https://s.tradingview.com https://www.tradingview.com https://*.tradingview.com; "
    . "worker-src 'self'; manifest-src 'self'; "
    . "object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'");
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#F3F4F6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0A0F16" media="(prefers-color-scheme: dark)">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="GRIFFINE">
<meta name="copyright" content="© GRIFFINE — جميع الحقوق محفوظة">
<!-- © GRIFFINE (griffine.app) — جميع الحقوق محفوظة. الكود والتصميم والمحتوى ملك GRIFFINE، وممنوع نسخه أو إعادة استخدامه. -->
<meta name="description" content="GRIFFINE — خطط تعزيز المتوسط (DCA) والشبكة (Grid) ومتابعة محفظتك في البورصة المصرية والخليجية.">
<link rel="manifest" href="manifest.json">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<title>GRIFFINE — منصة تنظيم الاستثمار في الأسهم: خطط DCA وGrid وتوصيات وتحليلات</title>
<?php $gSite = 'https://' . (preg_match('/^(www\.)?griffine\.(app|com)$/i', $_SERVER['HTTP_HOST'] ?? '') ? strtolower($_SERVER['HTTP_HOST']) : 'www.griffine.app'); ?>
<!-- الإصدار 146: الظهور في جوجل والمشاركة على واتساب / فيسبوك (صورة + عنوان + وصف) -->
<link rel="canonical" href="<?php echo $gSite; ?>/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="GRIFFINE">
<meta property="og:locale" content="ar_AR">
<meta property="og:url" content="<?php echo $gSite; ?>/">
<meta property="og:title" content="GRIFFINE — نظّم استثمارك في البورصة بخطة واضحة">
<meta property="og:description" content="خطط تعزيز المتوسط (DCA) والشبكة (Grid)، توصيات وتحليلات، فرص بالمؤشرات الفنية، وتنبيهات فورية — البورصة المصرية والخليج.">
<meta property="og:image" content="<?php echo $gSite; ?>/icon-512.png">
<meta property="og:image:width" content="512"><meta property="og:image:height" content="512">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="GRIFFINE — نظّم استثمارك في البورصة بخطة واضحة">
<meta name="twitter:image" content="<?php echo $gSite; ?>/icon-512.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="theme-boot.js?v=153"></script>
<link rel="stylesheet" href="griffine.css?v=153">
<link rel="stylesheet" href="shell.css?v=153">
<link rel="stylesheet" href="landing.css?v=153">
<?php if (!$gLite): ?>
<link rel="stylesheet" href="basira.css?v=153">
<link rel="stylesheet" href="mizan.css?v=153">
<link rel="stylesheet" href="mizanai.css?v=153">
<?php endif; ?>
</head>
<body<?php echo $gLite ? ' data-glite="1"' : ''; ?>>
<div id="app"></div>
<!-- الإصدار 100: الشاشات الطارئة (صيانة / انقطاع النت / السيرفر / التحميل البطيء) - لازم تبقى قبل أي ملف تاني -->
<script src="emergency.js?v=153"></script>
<?php if ($gLite): ?>
<script src="lite-stubs.js?v=153"></script>
<?php endif; ?>

<script src="shell.js?v=153"></script>
<!-- الإصدار 72: استوديو التصميم - يطبّق الثيم وتعديلات الأدمن على كل الشاشات (شاشة التعديل نفسها studio-editor.js تُحمَّل للأدمن فقط) -->
<script src="studio.js?v=153"></script>
<!-- الإصدار 88: griffine.js قُسّم إلى ملفات حسب الأقسام (بالترتيب نفسه) - يجب أن يبقى app-init.js آخر ملف -->
<script src="app-core.js?v=153"></script>
<script src="app-public.js?v=153"></script>
<script src="app-subscribe.js?v=153"></script>
<?php if (!$gLite): ?>
<script src="app-admin.js?v=153"></script>
<script src="app-plans.js?v=153"></script>
<script src="app-screener.js?v=153"></script>
<?php endif; ?>
<script src="app-chat.js?v=153"></script>
<script src="app-nav.js?v=153"></script>
<?php if (!$gLite): ?>
<script src="hr.js?v=153"></script>
<script src="markets.js?v=153"></script>
<script src="trades.js?v=153"></script>
<script src="faq.js?v=153"></script>
<script src="trash.js?v=153"></script>
<?php endif; ?>
<script src="promo.js?v=153"></script>
<?php if (!$gLite): ?>
<script src="notify.js?v=153"></script>
<script src="ai_access.js?v=153"></script>
<script src="recs.js?v=153"></script>
<script src="opps.js?v=153"></script>
<?php endif; ?>
<script src="landing.js?v=153"></script>
<?php if (!$gLite): ?>
<script src="landing-admin.js?v=153"></script>
<script src="basira.js?v=153"></script>
<script src="mizan.js?v=153"></script>
<script src="mizanai.js?v=153"></script>
<script src="perks.js?v=153"></script>
<?php endif; ?>
<script src="periods.js?v=153"></script>
<?php if (!$gLite): ?>
<script src="admin-search.js?v=153"></script>
<script src="rd.js?v=153"></script>
<script src="mkt.js?v=153"></script>
<?php endif; ?>
<script src="app-init.js?v=153"></script>
</body>
</html>
