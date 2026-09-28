<?php
/* =====================================================================
   GRIFFINE — chat_upload_chunk.php (الإصدار 83)
   رفع مرفقات الشات الكبيرة على أجزاء (كل جزء ~2 ميجا)
   ---------------------------------------------------------------------
   ليه على أجزاء؟ عشان الأدمن يقدر يسمح بملف 100 أو 500 ميجا من غير ما نصطدم بحدود
   PHP على الاستضافة (upload_max_filesize / post_max_size) ومن غير ما الملف كله يتحمّل في الذاكرة.

   POST: visitorId, uploadId (32 حرف hex), offset (بداية الجزء), total (حجم الملف كله),
         name (اسم الملف الأصلي), chunk (الجزء نفسه كملف)
   - العميل/الزائر: لازم الرفع يكون مفتوح للمحادثة دي + الحجم الكلي ≤ الحد اللي الأدمن كتبه
   - الأدمن/الموظف (reply_chat): الحد الأعلى العام 2048 ميجا
   آخر جزء ← الملف بيتفحص (نوعه الحقيقي من محتواه) ويتحفظ، والسيرفر بيرجّع token
   بيتبعت بعد كده مع الرسالة (chat_send.php / chat_admin_reply.php). الـtoken مربوط بالجلسة دي
   وبالمحادثة دي بس - محدش يقدر يستخدم ملف مرفوع من جلسة تانية.
   ===================================================================== */
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/uploads.php';
require_once __DIR__ . '/chat_read_state.php';

function up_fail($msg, $extra = []){ echo json_encode(["success" => false, "message" => $msg] + $extra); exit(); }

// ---------------------------------------------------------------------
// 1) المدخلات
// ---------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') up_fail("طريقة طلب غير صالحة.");
requireCsrf();
if (!getAdminSetting($conn, 'chat_enabled', true)) up_fail("خدمة الشات موقوفة حاليًا.");

$visitorId = trim($_POST['visitorId'] ?? '');
$uploadId  = strtolower(trim($_POST['uploadId'] ?? ''));
$offset    = (int)($_POST['offset'] ?? -1);
$total     = (int)($_POST['total'] ?? 0);
$name      = mb_substr(trim(preg_replace('/[\\\\\/:*?"<>|\r\n]/', '', (string)($_POST['name'] ?? ''))), 0, 120);
if ($visitorId === '' || !preg_match('/^[a-f0-9]{32}$/', $uploadId) || $offset < 0 || $total < 1) up_fail("بيانات الرفع ناقصة.");
if (empty($_FILES['chunk']) || $_FILES['chunk']['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($_FILES['chunk']['tmp_name'])) up_fail("الجزء ده موصلش كامل - جرّب تاني.");
$chunkSize = (int)$_FILES['chunk']['size'];
if ($chunkSize < 1 || $chunkSize > 8 * 1024 * 1024) up_fail("حجم الجزء غير صالح.");

// ---------------------------------------------------------------------
// 2) الصلاحية والحد الأقصى
// ---------------------------------------------------------------------
$isStaff = !empty($_SESSION['user_email']) && !empty($_SESSION['is_admin']) && in_array('reply_chat', getCurrentUserPermissions($conn), true);
if ($isStaff) {
    $limitMb = CHAT_MAX_UPLOAD_CAP_MB;
} else {
    if (!preg_match('/^[a-zA-Z0-9_-]{20,64}$/', $visitorId)) up_fail("معرّف المحادثة غير صالح.");
    if (!chat_visitor_can_access($conn, $visitorId)) up_fail("المحادثة دي مش متاحة.", ["code" => "not_owner"]);
    if (!chat_upload_allowed($conn, $visitorId)) up_fail("رفع الملفات والصور مقفول دلوقتي.");
    $limitMb = chat_max_upload_mb($conn, $visitorId);
}
if ($total > $limitMb * 1024 * 1024) up_fail("حجم الملف أكبر من المسموح - أقصى حجم $limitMb ميجا.", ["maxUploadMb" => $limitMb]);

// ---------------------------------------------------------------------
// 3) تجميع الأجزاء في ملف مؤقت
// ---------------------------------------------------------------------
$dir = upl_dir();
if (!$dir) up_fail("مفيش مكان لحفظ الملفات على السيرفر.");
$part = $dir . '/tmp_' . $uploadId . '.part';

if ($offset === 0) {
    // تنظيف أي رفع قديم متساب من أكتر من 6 ساعات
    foreach ((array)glob($dir . '/tmp_*.part') as $old) { if (is_file($old) && filemtime($old) < time() - 6 * 3600) @unlink($old); }
    @unlink($part);
    $_SESSION['chat_up'][$uploadId] = ['v' => $visitorId, 'total' => $total];
}
$meta = $_SESSION['chat_up'][$uploadId] ?? null;
if (!$meta || $meta['v'] !== $visitorId || (int)$meta['total'] !== $total) up_fail("الرفع ده مش معروف - ابدأ من الأول.");

clearstatcache(true, $part);
$have = is_file($part) ? filesize($part) : 0;
if ($have !== $offset) up_fail("ترتيب الأجزاء اتلخبط - ابدأ الرفع من الأول.", ["expectedOffset" => $have]);
if ($have + $chunkSize > $total) { @unlink($part); unset($_SESSION['chat_up'][$uploadId]); up_fail("حجم الملف مش مطابق."); }

$in = fopen($_FILES['chunk']['tmp_name'], 'rb');
$out = fopen($part, 'ab');
if (!$in || !$out) up_fail("تعذّر حفظ الجزء على السيرفر.");
stream_copy_to_stream($in, $out);
fclose($in); fclose($out);
clearstatcache(true, $part);
$have = filesize($part);

if ($have < $total) { echo json_encode(["success" => true, "done" => false, "received" => $have]); exit(); }

// ---------------------------------------------------------------------
// 4) آخر جزء ← فحص النوع الحقيقي وحفظ الملف
// ---------------------------------------------------------------------
unset($_SESSION['chat_up'][$uploadId]);
$ext = upl_detect_file($part, $name);
if (!$ext || !in_array($ext, UPL_CHAT_EXTS, true)) {
    @unlink($part);
    up_fail("نوع الملف غير مدعوم. المسموح: صور، PDF، فيديو (MP4/WebM/MOV)، ملفات ZIP ومستندات Word/Excel/PowerPoint.");
}
$final = 'chat_' . bin2hex(random_bytes(16)) . '.' . $ext;
if (!@rename($part, $dir . '/' . $final)) { @unlink($part); up_fail("تعذّر حفظ الملف على السيرفر."); }

$token = 'file:' . $final;
$_SESSION['chat_files'][$token] = $visitorId;   // الملف ده ينفع يتبعت في المحادثة دي بس ومن الجلسة دي بس
if ($name === '') $name = 'مرفق.' . $ext;
elseif (!preg_match('/\.[a-z0-9]{2,5}$/i', $name)) $name .= '.' . $ext;
echo json_encode(["success" => true, "done" => true, "token" => $token, "name" => $name, "size" => $total]);
?>
