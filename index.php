<?php
// منع أي تخزين مؤقت للملف ده خالص من المتصفح أو أي وسيط - ضمان حقيقي أقوى بكتير من meta tags
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: Sat, 01 Jan 2000 00:00:00 GMT");
// رؤوس أمان أساسية
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: SAMEORIGIN");
header("Referrer-Policy: strict-origin-when-cross-origin");
header("Permissions-Policy: camera=(), microphone=(), geolocation=()");
header("Content-Security-Policy: object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'");
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
<meta name="description" content="GRIFFINE — خطط تعزيز المتوسط (DCA) والشبكة (Grid) ومتابعة محفظتك في البورصة المصرية والخليجية.">
<link rel="manifest" href="manifest.json">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<title>GRIFFINE — خطة تعزيز المتوسط</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@500;700;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script>(function(){try{if(localStorage.getItem('griffine_theme')==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();</script>
<link rel="stylesheet" href="griffine.css?v=80">
<link rel="stylesheet" href="shell.css?v=80">
</head>
<body>
<div id="app"></div>

<script src="shell.js?v=80"></script>
<!-- الإصدار 72: استوديو التصميم - بيطبّق الثيم وتعديلات الأدمن على كل الشاشات (شاشة التعديل نفسها studio-editor.js بتتحمّل للأدمن بس) -->
<script src="studio.js?v=80"></script>
<script src="griffine.js?v=80"></script>
</body>
</html>
