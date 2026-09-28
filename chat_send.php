<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/uploads.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "طريقة طلب غير صالحة."]);
    exit();
}
requireCsrf();

if (!getAdminSetting($conn, 'chat_enabled', true)) {
    echo json_encode(["success" => false, "message" => "خدمة الشات موقوفة حاليًا."]);
    exit();
}

$visitorId = trim($_POST['visitorId'] ?? '');
$visitorEmail = isset($_POST['email']) ? trim(strtolower($_POST['email'])) : (isset($_SESSION['user_email']) ? $_SESSION['user_email'] : null);
$message = trim($_POST['message'] ?? '');
$attachment = $_POST['attachment'] ?? null;
$attachmentName = trim($_POST['attachmentName'] ?? '');

if (empty($visitorId)) {
    echo json_encode(["success" => false, "message" => "تعذّر تحديد هوية المحادثة."]);
    exit();
}
if (!empty($visitorEmail) && !filter_var($visitorEmail, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["success" => false, "message" => "صيغة البريد الإلكتروني غير صحيحة."]);
    exit();
}
if (!empty($visitorEmail) && isBlacklisted($conn, 'email', $visitorEmail)) {
    echo json_encode(["success" => false, "message" => "تعذّر إرسال الرسالة حاليًا."]);
    exit();
}
if (empty($message) && empty($attachment)) {
    echo json_encode(["success" => false, "message" => "اكتب رسالة أو أرفق ملف."]);
    exit();
}

// المرفق بيتحفظ كملف (صورة أو PDF بحد أقصى ~8 ميجا)
if (!empty($attachment) && strlen($attachment) > 11000000) {
    echo json_encode(["success" => false, "message" => "حجم المرفق كبير جدًا."]);
    exit();
}
if (!empty($attachment)) {
    $attachment = upl_store($attachment, 'chat', true);
    if ($attachment === false) {
        echo json_encode(["success" => false, "message" => "نوع المرفق غير مدعوم. أرسل صورة أو ملف PDF."]);
        exit();
    }
}
$attachmentName = mb_substr($attachmentName, 0, 120);

$stmt = $conn->prepare("INSERT INTO chat_messages (visitor_id, visitor_email, sender, message, attachment, attachment_name) VALUES (?, ?, 'visitor', ?, ?, ?)");
$stmt->bind_param("sssss", $visitorId, $visitorEmail, $message, $attachment, $attachmentName);

if ($stmt->execute()) {
    $newId = $conn->insert_id; // لازم يتاخد قبل أي استعلام تاني (الإشعار بيعمل استعلامات)
    // نبعت إشعار Push حقيقي للأدمن (لو معاه اشتراك مسجّل)
    try {
        $preview = $message ? mb_substr($message, 0, 80) : 'أرسل مرفقًا';
        send_web_push($conn, 'admin', '💬 رسالة جديدة' . ($visitorEmail ? " من $visitorEmail" : ''), $preview, '/index.php');
    } catch (Exception $e) { /* الإشعار مش أساسي - نتجاهل أي فشل فيه */ }

    echo json_encode(["success" => true, "id" => $newId]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$stmt->close();
?>
