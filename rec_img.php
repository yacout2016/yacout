<?php
/* =====================================================================
   GRIFFINE — rec_img.php (الإصدار 129) — صورة رسم التوصية / فيبوناتشي
   - بتتعرض في إيميل التوصية وإشعار الموبايل (من غير تسجيل دخول) — الرابط فيه مفتاح سري 32 حرف لكل توصية
   - الملف نفسه في مجلد الرفع المحمي (برّه الموقع أو مقفول بـ .htaccess)
   ===================================================================== */
require_once __DIR__ . '/uploads.php';
$k = (string)($_GET['k'] ?? ''); $n = (string)($_GET['n'] ?? '');
if (!preg_match('/^[a-f0-9]{32}$/', $k) || !in_array($n, ['chart', 'fib', 'ext'], true)) { http_response_code(404); exit; }
// الإصدار 148: مرفق خارجي من المحلل (صورة أو PDF)
if ($n === 'ext') {
    $d = upl_dir(); $hit = null;
    foreach (['png' => 'image/png', 'jpg' => 'image/jpeg', 'webp' => 'image/webp', 'pdf' => 'application/pdf'] as $t => $mime) if ($d && is_file("$d/rec/{$k}_ext.$t")) { $hit = ["$d/rec/{$k}_ext.$t", $mime, $t]; break; }
    if (!$hit) { http_response_code(404); exit; }
    header('Content-Type: ' . $hit[1]);
    header('Content-Length: ' . filesize($hit[0]));
    header('Cache-Control: public, max-age=604800, immutable');
    header('X-Content-Type-Options: nosniff');
    if ($hit[2] === 'pdf') header('Content-Disposition: inline; filename="griffine-recommendation.pdf"');
    header("Content-Security-Policy: default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" . ($hit[2] === 'pdf' ? ' allow-scripts' : ''));
    readfile($hit[0]); exit;
}
$d = upl_dir(); $f = $d ? "$d/rec/{$k}_{$n}.png" : '';
if (!$f || !is_file($f)) { http_response_code(404); exit; }
header('Content-Type: image/png');
header('Content-Length: ' . filesize($f));
header('Cache-Control: public, max-age=604800, immutable');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'none'; sandbox");
readfile($f);
