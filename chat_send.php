<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/uploads.php';
require_once __DIR__ . '/chat_read_state.php';

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

// الإصدار 82: رفع الملفات مقفول افتراضيًا - لازم الأدمن/الموظف يفتحه للمحادثة دي من شاشة الشات
if (!empty($attachment) && !chat_upload_allowed($conn, $visitorId)) {
    echo json_encode(["success" => false, "message" => "رفع الملفات والصور مقفول دلوقتي. اكتب رسالتك وفريق الدعم هيفتحلك الرفع لو محتاج تبعت ملف."]);
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

    // الإصدار 81: رسالة جديدة من العميل بترجّع المحادثة للمحادثات النشطة (زي ماسنجر/واتساب)
    // قبل كده لو الأدمن أرشف أو حذف المحادثة، أي رسالة جديدة من نفس العميل كانت بتفضل مستخبية
    // في الأرشيف/سلة المحذوفات - من غير نقطة حمرا ولا إشعار، والأدمن يفتكر إن الرسالة موصلتش
    try {
        $re = $conn->prepare("INSERT INTO chat_conversation_meta (visitor_key, archived, deleted) VALUES (?, 0, 0)
            ON DUPLICATE KEY UPDATE archived = 0, deleted = 0");
        $re->bind_param("s", $visitorId);
        $re->execute(); $re->close();
    } catch (Throwable $e) { error_log('GRIFFINE chat_send reactivate: ' . $e->getMessage()); }
    // نبعت إشعار Push حقيقي للأدمن (لو معاه اشتراك مسجّل)
    try {
        $preview = $message ? mb_substr($message, 0, 80) : 'أرسل مرفقًا';
        send_web_push($conn, 'admin', '💬 رسالة جديدة' . ($visitorEmail ? " من $visitorEmail" : ''), $preview, '/index.php');
    } catch (Exception $e) { /* الإشعار مش أساسي - نتجاهل أي فشل فيه */ }

    // الإصدار 72: أول رسالة في محادثة جديدة ← إيميل تنبيه على info@griffine.store (مش مع كل رسالة)
    try {
        $cnt = $conn->prepare("SELECT COUNT(*) AS c FROM chat_messages WHERE COALESCE(visitor_id, visitor_email) = ?");
        $cnt->bind_param("s", $visitorId); $cnt->execute();
        $isFirst = ((int)$cnt->get_result()->fetch_assoc()['c']) === 1; $cnt->close();
        if ($isFirst) {
            griffine_notify($conn, MAIL_ADMIN_TO, 'محادثة شات جديدة' . ($visitorEmail ? " من $visitorEmail" : ''), 'عميل بدأ محادثة جديدة',
                ['العميل: ' . ($visitorEmail ?: 'زائر بدون إيميل'), 'الرسالة: ' . ($message !== '' ? mb_substr($message, 0, 500) : '(أرسل مرفق)'), 'رد عليه من لوحة التحكم ← الدردشة الفورية.'],
                ['label' => 'فتح الدردشة', 'url' => MAIL_SITE_URL . '/index.php'], 'chat_new', ['reply_to' => $visitorEmail]);
        }
    } catch (Throwable $e) { /* الإيميل مش أساسي */ }

    echo json_encode(["success" => true, "id" => $newId]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$stmt->close();
?>
