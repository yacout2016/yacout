<?php
/* =====================================================================
   GRIFFINE — rec_img.php (الإصدار 129) — صورة رسم التوصية / فيبوناتشي
   - بتتعرض في إيميل التوصية وإشعار الموبايل (من غير تسجيل دخول) — الرابط فيه مفتاح سري 32 حرف لكل توصية
   - الملف نفسه في مجلد الرفع المحمي (برّه الموقع أو مقفول بـ .htaccess)
   ===================================================================== */
require_once __DIR__ . '/uploads.php';
$k = (string)($_GET['k'] ?? ''); $n = (string)($_GET['n'] ?? '');
if (!preg_match('/^[a-f0-9]{32}$/', $k) || !in_array($n, ['chart', 'fib'], true)) { http_response_code(404); exit; }
$d = upl_dir(); $f = $d ? "$d/rec/{$k}_{$n}.png" : '';
if (!$f || !is_file($f)) { http_response_code(404); exit; }
header('Content-Type: image/png');
header('Content-Length: ' . filesize($f));
header('Cache-Control: public, max-age=604800, immutable');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'none'; sandbox");
readfile($f);
