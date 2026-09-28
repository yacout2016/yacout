<?php
/* =====================================================================
   GRIFFINE — chat_end_conversation.php
   "إنهاء وإرسال نسخة": بيبعت المحادثة كاملة على info@griffine.store
   الإصدار 72:
     - الصور وملفات PDF اللي اتبعتت في الشات بتتبعت كمرفقات حقيقية في الإيميل
       (قبل كده كان بيتكتب "(مرفق ملف)" بس والصورة مبتوصلش)
     - الإرسال عن طريق mailer.php (من info@griffine.store + سجل الإيميلات)
     - الرد على الإيميل بيروح للعميل مباشرة (Reply-To)
   ===================================================================== */
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/uploads.php';

// ---------------------------------------------------------------------
// 1) الصلاحيات
// ---------------------------------------------------------------------
if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'reply_chat');
requireCsrf();

$visitorId = trim($_POST['visitorId'] ?? '');
if (empty($visitorId)) {
    echo json_encode(["success" => false, "message" => "بيانات ناقصة."]);
    exit();
}

// ---------------------------------------------------------------------
// 2) قراءة المرفق (ملف على السيرفر file:... أو Base64 قديم) ← [اسم، نوع، محتوى]
// ---------------------------------------------------------------------
function chat_attachment_bytes($stored, $name, $index){
    if (!$stored) return null;
    $mime = null; $bin = null;
    if (strpos($stored, 'file:') === 0) {
        $file = substr($stored, 5);
        if (!preg_match('/^[a-z]+_[a-f0-9]{32}\.[a-z]+$/', $file)) return null;
        $dir = upl_dir();
        if (!$dir || !is_file($dir . '/' . $file)) return null;
        $bin = @file_get_contents($dir . '/' . $file);
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $mime = array_search($ext, UPL_TYPES, true) ?: 'application/octet-stream';
    } elseif (preg_match('#^data:([a-z0-9/+.-]+);base64,#i', $stored, $m)) {
        $mime = strtolower($m[1]);
        $bin = base64_decode(substr($stored, strlen($m[0])), true);
    }
    if (!$bin) return null;
    $ext = UPL_TYPES[$mime] ?? 'bin';
    $clean = trim(preg_replace('/[\\\\\/:*?"<>|\r\n]/', '', (string)$name));
    if ($clean === '') $clean = 'مرفق-' . $index . '.' . $ext;
    elseif (!preg_match('/\.[a-z0-9]{2,4}$/i', $clean)) $clean .= '.' . $ext;
    return ['name' => $index . '-' . $clean, 'mime' => $mime, 'data' => $bin];
}

// ---------------------------------------------------------------------
// 3) تجميع المحادثة
// ---------------------------------------------------------------------
$stmt = $conn->prepare("SELECT * FROM chat_messages WHERE COALESCE(visitor_id, visitor_email) = ? ORDER BY id ASC");
$stmt->bind_param("s", $visitorId);
$stmt->execute();
$result = $stmt->get_result();

$visitorEmail = null;
$lines = [];          // سطور المحادثة (نص)
$attachments = [];    // المرفقات الحقيقية
$missing = 0;         // مرفقات مش لاقيين ملفها
while ($r = $result->fetch_assoc()) {
    if ($r['visitor_email']) $visitorEmail = $r['visitor_email'];
    $who = $r['sender'] === 'admin' ? 'الإدارة' : 'العميل';
    $text = trim((string)$r['message']);
    if (!empty($r['attachment'])) {
        $att = chat_attachment_bytes($r['attachment'], $r['attachment_name'], count($attachments) + 1);
        if ($att) { $attachments[] = $att; $text .= ($text ? ' ' : '') . '📎 [مرفق رقم ' . count($attachments) . ': ' . $att['name'] . ']'; }
        else { $missing++; $text .= ($text ? ' ' : '') . '📎 [مرفق - الملف مش متاح على السيرفر]'; }
    }
    $lines[] = "[" . $r['created_at'] . "] $who: " . ($text !== '' ? $text : '—');
}
$stmt->close();

if (!$lines) {
    echo json_encode(["success" => false, "message" => "لا يوجد رسائل في هذه المحادثة."]);
    exit();
}

// ---------------------------------------------------------------------
// 4) الإرسال
// ---------------------------------------------------------------------
$who = $visitorEmail ?: 'زائر بدون إيميل';
$paragraphs = [
    "محادثة الشات كاملة مع: $who",
    "معرّف المحادثة: $visitorId",
    "عدد الرسائل: " . count($lines) . " · المرفقات: " . count($attachments) . ($missing ? " (+$missing مش متاح)" : ''),
    implode("\n", $lines),
];
if ($attachments) $paragraphs[] = 'الصور والملفات متضافة كمرفقات في الإيميل ده بنفس الترقيم.';

$res = griffine_notify($conn, MAIL_ADMIN_TO, "نسخة محادثة شات - $who", 'نسخة كاملة من محادثة الشات', $paragraphs, null, 'chat_transcript', [
    'attachments' => $attachments,
    'reply_to' => $visitorEmail,
]);

echo json_encode([
    "success" => $res['ok'],
    "mailed" => $res['ok'],
    "attachments" => count($attachments),
    "message" => $res['ok']
        ? "تم إرسال نسخة المحادثة" . ($attachments ? " ومعاها " . count($attachments) . " مرفق" : "") . " على " . MAIL_ADMIN_TO
        : "تعذّر إرسال الإيميل: " . ($res['error'] ?: 'خطأ غير معروف') . " — راجع مركز الإيميلات في لوحة التحكم.",
]);
?>
