<?php
/* =====================================================================
   GRIFFINE — chat_my_id.php (الإصدار 82)
   معرّف المحادثة الثابت للحساب - عشان المستخدم المسجّل يشوف نفس المحادثة من أي جهاز (زي ماسنجر)
   GET ?local=<معرّف الجهاز الحالي>
   - لو الحساب ليه معرّف ← بيرجّعه
   - لو لأ ← بياخد معرّف الجهاز الحالي (عشان محادثته القديمة متضيعش) أو يعمل واحد جديد عشوائي
   (الزائر اللي مش مسجّل بيفضل بمعرّف جهازه كما هو)
   ===================================================================== */
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (empty($_SESSION['user_email'])) { echo json_encode(["success" => false]); exit(); }
$email = $_SESSION['user_email'];
$local = trim($_GET['local'] ?? '');
$validLocal = preg_match('/^[a-zA-Z0-9_-]{20,64}$/', $local) ? $local : null;

try {
    $st = $conn->prepare("SELECT chat_visitor_id FROM users WHERE username = ? LIMIT 1");
    $st->bind_param("s", $email); $st->execute();
    $row = $st->get_result()->fetch_assoc(); $st->close();
    if ($row && !empty($row['chat_visitor_id'])) { echo json_encode(["success" => true, "visitorId" => $row['chat_visitor_id']]); exit(); }

    // المعرّف الحالي للجهاز غير ممكن يكون مربوط بحساب تاني
    $id = null;
    if ($validLocal) {
        $chk = $conn->prepare("SELECT 1 FROM users WHERE chat_visitor_id = ? LIMIT 1");
        $chk->bind_param("s", $validLocal); $chk->execute();
        if ($chk->get_result()->num_rows === 0) $id = $validLocal;
        $chk->close();
    }
    if (!$id) $id = 'u_' . bin2hex(random_bytes(16));
    $up = $conn->prepare("UPDATE users SET chat_visitor_id = ? WHERE username = ?");
    $up->bind_param("ss", $id, $email); $up->execute(); $up->close();
    echo json_encode(["success" => true, "visitorId" => $id]);
} catch (Throwable $e) {
    // ملف SQL بعد متشغّلش (العمود غير موجود) ← الشات يكمّل بمعرّف الجهاز زي الأول
    echo json_encode(["success" => true, "visitorId" => $validLocal]);
}
?>
