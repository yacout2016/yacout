<?php
/* عرض الملفات المرفوعة (صور/PDF) مع التحقق من الصلاحية:
   - bg (خلفيات الشاشات): لأي زائر
   - chat (مرفقات الدردشة): لأي حد معاه الرابط (اسم الملف عشوائي 128-bit مستحيل تخمينه)
   - avatar (الصور الشخصية): لأي حساب مسجّل دخول
   - proof (إثباتات الدفع) و sugg (مرفقات المقترحات): فريق الإدارة بس، أو صاحب الملف نفسه */
require_once __DIR__ . '/session_boot.php';
session_start();
require_once __DIR__ . '/uploads.php';

$f = $_GET['f'] ?? '';
// الإصدار 83: مرفقات الشات بقت تقبل فيديو وملفات مضغوطة ومستندات Office (الأنواع دي للشات بس)
if (!preg_match('/^(proof|avatar|chat|sugg|bg|hr)_[a-f0-9]{32}\.(png|jpg|webp|gif|pdf|mp4|webm|mov|zip|docx|xlsx|pptx|doc|xls)$/', $f, $m)) { http_response_code(404); exit; }
$cat = $m[1]; $ext = $m[2];
if (!in_array($cat, ['chat', 'hr'], true) && !in_array($ext, ['png', 'jpg', 'webp', 'gif', 'pdf'], true)) { http_response_code(404); exit; }

$loggedIn = !empty($_SESSION['user_email']);
$isStaff = $loggedIn && !empty($_SESSION['is_admin']);
$allowed = false;
if ($cat === 'bg' || $cat === 'chat') $allowed = true;
elseif ($cat === 'hr') {
    // الإصدار 85: مستندات الموظفين - لفريق الإدارة اللي عنده صلاحية شؤون الموظفين بس
    if ($isStaff) { include __DIR__ . '/db.php'; $allowed = in_array('manage_hr', getCurrentUserPermissions($conn), true); }
}
elseif ($cat === 'avatar') $allowed = $loggedIn;
elseif ($cat === 'proof' || $cat === 'sugg') {
    $allowed = $isStaff;
    if (!$allowed && $loggedIn) {
        // صاحب الملف يقدر يشوف ملفه
        include __DIR__ . '/db.php';
        $token = 'file:' . $f;
        $email = $_SESSION['user_email'];
        if ($cat === 'proof') {
            $st = $conn->prepare("SELECT id FROM subscribers WHERE account_email = ? AND (payment_proof = ? OR pending_payment_proof = ?) LIMIT 1");
            $st->bind_param("sss", $email, $token, $token);
        } else {
            $st = $conn->prepare("SELECT id FROM suggestions WHERE account_email = ? AND attachment_data = ? LIMIT 1");
            $st->bind_param("ss", $email, $token);
        }
        $st->execute();
        $allowed = $st->get_result()->num_rows > 0;
        $st->close();
    }
}
if (!$allowed) { http_response_code(403); exit; }
// الجلسة مش محتاجينها تاني - نفكّ قفلها عشان تحميل ملف كبير (فيديو 500 ميجا) ميوقفش باقي طلبات الموقع
session_write_close();

$dir = upl_dir();
$path = $dir ? $dir . '/' . $f : '';
if (!$path || !is_file($path)) { http_response_code(404); exit; }

$types = UPL_MIME_BY_EXT;
$isImage = in_array($ext, ['png', 'jpg', 'webp', 'gif'], true);
$isVideo = in_array($ext, ['mp4', 'webm', 'mov'], true);
$size = filesize($path);
header('Content-Type: ' . $types[$ext]);
header('X-Content-Type-Options: nosniff');
header('Accept-Ranges: bytes');
if ($isImage || $isVideo) {
    // الصور والفيديو بيتعرضوا جوه الشات - ومقفولين بـ CSP عشان محدش يشغّل حاجة من خلالهم
    header("Content-Security-Policy: default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox");
    header('Content-Disposition: inline; filename="' . $f . '"');
} else {
    // PDF وباقي الملفات بتتحمّل تحميل (مش بتتفتح جوه الموقع)
    header('Content-Disposition: attachment; filename="' . $f . '"');
}
header('Cache-Control: ' . ($cat === 'bg' ? 'public, max-age=2592000, immutable' : 'private, max-age=86400'));

// الإصدار 83: دعم Range عشان الفيديو يشتغل ويتقدّم فيه (خصوصًا على الآيفون) من غير ما يتحمّل كله
$start = 0; $end = $size - 1;
if (isset($_SERVER['HTTP_RANGE']) && preg_match('/^bytes=(\d*)-(\d*)$/', trim($_SERVER['HTTP_RANGE']), $r)) {
    if ($r[1] === '' && $r[2] !== '') { $start = max(0, $size - (int)$r[2]); }
    else { $start = (int)$r[1]; if ($r[2] !== '') $end = min($end, (int)$r[2]); }
    if ($start > $end || $start >= $size) { http_response_code(416); header("Content-Range: bytes */$size"); exit; }
    http_response_code(206);
    header("Content-Range: bytes $start-$end/$size");
}
header('Content-Length: ' . ($end - $start + 1));
if ($start === 0 && $end === $size - 1) { readfile($path); exit; }
$fh = fopen($path, 'rb');
fseek($fh, $start);
$left = $end - $start + 1;
while ($left > 0 && !feof($fh)) { $buf = fread($fh, min(1048576, $left)); if ($buf === false) break; echo $buf; $left -= strlen($buf); flush(); }
fclose($fh);
