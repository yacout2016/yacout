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
<link rel="manifest" href="manifest.json">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<?php
/* الإصدار 157: «🔎 الظهور في جوجل» — العنوان والتعريف وأكواد التحقق (Google / Bing) من لوحة التحكم
   بتتقري من ملف صغير (griffine_seo.json) من غير قاعدة البيانات — ولو مش موجود بيتعرض النص الافتراضي */
$gSeo = [];
foreach ([dirname(__DIR__) . '/griffine_seo.json', __DIR__ . '/griffine_seo.json'] as $__f) { if (is_file($__f)) { $__j = json_decode((string)@file_get_contents($__f), true); if (is_array($__j)) { $gSeo = $__j; break; } } }
$gE = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
$gTitle = !empty($gSeo['title']) ? $gSeo['title'] : 'GRIFFINE جريفين — منصة تنظيم الاستثمار في البورصة: خطط DCA وGrid وتوصيات';
$gDesc = !empty($gSeo['desc']) ? $gSeo['desc'] : 'جريفين GRIFFINE منصة عربية لتنظيم استثمارك في البورصة المصرية والخليجية: خطط تعزيز المتوسط (DCA) والشبكة (Grid)، توصيات محللين، تحليلات بصيرة AI، فرص بالمؤشرات الفنية، وتنبيهات أسعار فورية. ابدأ مجانًا.';
$gSite = 'https://www.griffine.app';
?>
<title><?php echo $gE($gTitle); ?></title>
<meta name="description" content="<?php echo $gE($gDesc); ?>">
<meta name="robots" content="index, follow, max-image-preview:large">
<?php if (!empty($gSeo['google'])): ?><meta name="google-site-verification" content="<?php echo $gE($gSeo['google']); ?>">
<?php endif; if (!empty($gSeo['bing'])): ?><meta name="msvalidate.01" content="<?php echo $gE($gSeo['bing']); ?>">
<?php endif; ?>
<!-- الإصدار 146: الظهور في جوجل والمشاركة على واتساب / فيسبوك (صورة + عنوان + وصف) -->
<link rel="canonical" href="<?php echo $gSite; ?>/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="GRIFFINE">
<meta property="og:locale" content="ar_AR">
<meta property="og:url" content="<?php echo $gSite; ?>/">
<meta property="og:title" content="<?php echo $gE($gTitle); ?>">
<meta property="og:description" content="<?php echo $gE($gDesc); ?>">
<meta property="og:image" content="<?php echo $gSite; ?>/icon-512.png">
<meta property="og:image:width" content="512"><meta property="og:image:height" content="512">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="<?php echo $gE($gTitle); ?>">
<meta name="twitter:description" content="<?php echo $gE($gDesc); ?>">
<meta name="twitter:image" content="<?php echo $gSite; ?>/icon-512.png">
<!-- الإصدار 157: تعريف الموقع لجوجل (اسم + شعار + وصف) — بيساعد إن اسم GRIFFINE وشعاره يظهروا في نتايج البحث -->
<script type="application/ld+json"><?php echo json_encode(['@context' => 'https://schema.org', '@graph' => [
    ['@type' => 'Organization', '@id' => $gSite . '/#org', 'name' => 'GRIFFINE', 'alternateName' => ['جريفين', 'Griffine'], 'url' => $gSite . '/', 'logo' => $gSite . '/icon-512.png', 'email' => 'info@griffine.app', 'description' => $gDesc],
    ['@type' => 'WebSite', '@id' => $gSite . '/#site', 'name' => 'GRIFFINE', 'alternateName' => 'جريفين', 'url' => $gSite . '/', 'inLanguage' => 'ar', 'publisher' => ['@id' => $gSite . '/#org']],
    ['@type' => 'WebApplication', 'name' => 'GRIFFINE', 'url' => $gSite . '/', 'applicationCategory' => 'FinanceApplication', 'operatingSystem' => 'Web, Android, iOS', 'inLanguage' => 'ar', 'description' => $gDesc,
        'offers' => ['@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'EGP', 'description' => 'باقة مجانية للبداية']],
]], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG); ?></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="theme-boot.js?v=158"></script>
<link rel="stylesheet" href="griffine.css?v=158">
<link rel="stylesheet" href="shell.css?v=158">
<link rel="stylesheet" href="landing.css?v=158">
<?php if (!$gLite): ?>
<link rel="stylesheet" href="basira.css?v=158">
<link rel="stylesheet" href="mizan.css?v=158">
<link rel="stylesheet" href="mizanai.css?v=158">
<?php endif; ?>
</head>
<body<?php echo $gLite ? ' data-glite="1"' : ''; ?>>
<noscript><div style="max-width:760px;margin:40px auto;padding:20px;font-family:Tahoma,sans-serif;direction:rtl;line-height:2">
<h1>GRIFFINE جريفين — نظّم استثمارك في البورصة بخطة واضحة</h1>
<p><?php echo $gE($gDesc); ?></p>
<ul><li>خطط تعزيز المتوسط (DCA) وخطط الشبكة (Grid) بمستويات شراء وبيع محسوبة</li><li>توصيات محللين بنقاط دخول وأهداف ووقف خسارة</li><li>بصيرة AI لتحليل الأسهم وميزان GRIFFINE AI لتوزيع الاستثمار</li><li>البحث عن الفرص بالمؤشرات الفنية وتنبيهات الأسعار على الموقع والإيميل والواتساب</li></ul>
<p>📚 دليل المستثمر: <a href="guide.html">كل الشروحات</a> · <a href="dca-strategy.html">تعزيز المتوسط DCA</a> · <a href="grid-trading.html">استراتيجية الشبكة Grid</a> · <a href="technical-indicators.html">المؤشرات الفنية</a> · <a href="investment-strategies.html">استراتيجيات الاستثمار</a> · <a href="portfolio-diversification.html">تنويع المحفظة</a> · <a href="ai-stock-analysis.html">تحليل الأسهم بالذكاء الاصطناعي</a> · <a href="stock-recommendations.html">توصيات الأسهم</a> · <a href="stock-alerts.html">تنبيهات الأسعار</a> · <a href="egypt-gulf-stocks.html">البورصة المصرية والخليج</a></p>
<p>شغّل JavaScript في المتصفح عشان تستخدم الموقع. للتواصل: info@griffine.app</p></div></noscript>

<div id="app"></div>
<!-- الإصدار 100: الشاشات الطارئة (صيانة / انقطاع النت / السيرفر / التحميل البطيء) - لازم تبقى قبل أي ملف تاني -->
<script src="emergency.js?v=158"></script>
<?php if ($gLite): ?>
<script src="lite-stubs.js?v=158"></script>
<?php endif; ?>

<script src="shell.js?v=158"></script>
<!-- الإصدار 72: استوديو التصميم - يطبّق الثيم وتعديلات الأدمن على كل الشاشات (شاشة التعديل نفسها studio-editor.js تُحمَّل للأدمن فقط) -->
<script src="studio.js?v=158"></script>
<!-- الإصدار 88: griffine.js قُسّم إلى ملفات حسب الأقسام (بالترتيب نفسه) - يجب أن يبقى app-init.js آخر ملف -->
<script src="app-core.js?v=158"></script>
<script src="app-public.js?v=158"></script>
<script src="app-subscribe.js?v=158"></script>
<?php if (!$gLite): ?>
<script src="app-admin.js?v=158"></script>
<script src="app-plans.js?v=158"></script>
<script src="app-screener.js?v=158"></script>
<?php endif; ?>
<script src="app-chat.js?v=158"></script>
<script src="app-nav.js?v=158"></script>
<?php if (!$gLite): ?>
<script src="hr.js?v=158"></script>
<script src="markets.js?v=158"></script>
<script src="trades.js?v=158"></script>
<script src="faq.js?v=158"></script>
<script src="trash.js?v=158"></script>
<?php endif; ?>
<script src="promo.js?v=158"></script>
<?php if (!$gLite): ?>
<script src="notify.js?v=158"></script>
<script src="ai_access.js?v=158"></script>
<script src="recs.js?v=158"></script>
<script src="opps.js?v=158"></script>
<?php endif; ?>
<script src="landing.js?v=158"></script>
<?php if (!$gLite): ?>
<script src="landing-admin.js?v=158"></script>
<script src="basira.js?v=158"></script>
<script src="mizan.js?v=158"></script>
<script src="mizanai.js?v=158"></script>
<script src="perks.js?v=158"></script>
<?php endif; ?>
<script src="periods.js?v=158"></script>
<?php if (!$gLite): ?>
<script src="admin-search.js?v=158"></script>
<script src="rd.js?v=158"></script>
<script src="mkt.js?v=158"></script>
<?php endif; ?>
<script src="app-init.js?v=158"></script>
</body>
</html>
