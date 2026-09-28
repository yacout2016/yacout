<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/uploads.php';

if (!isset($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "يرجى تسجيل الدخول."]);
    exit();
}

$email = $_SESSION['user_email'];
$avatar = isset($_POST['avatar']) && $_POST['avatar'] !== '' ? $_POST['avatar'] : null;

// لو الأفاتار مش فاضي، لازم يكون data URI صورة، وبحد أقصى ~700 كيلوبايت بعد التحويل لـ base64
if ($avatar !== null) {
    if (!preg_match('/^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,/', $avatar)) {
        echo json_encode(["success" => false, "message" => "صيغة الصورة غير مدعومة."]);
        exit();
    }
    if (strlen($avatar) > 700000) {
        echo json_encode(["success" => false, "message" => "حجم الصورة كبير جدًا — جرّب صورة أصغر."]);
        exit();
    }
}

// الصورة المرفوعة بتتحفظ كملف، والأفاتارات الجاهزة (SVG صغير) بتفضل زي ما هي
$prevSt = $conn->prepare("SELECT avatar_data FROM users WHERE username = ? LIMIT 1");
$previous = null;
if ($prevSt) { $prevSt->bind_param("s", $email); $prevSt->execute(); $pr = $prevSt->get_result()->fetch_assoc(); $previous = $pr ? $pr['avatar_data'] : null; $prevSt->close(); }
if ($avatar !== null) {
    $avatar = upl_store($avatar, 'avatar');
    if ($avatar === false) {
        echo json_encode(["success" => false, "message" => "صيغة الصورة غير مدعومة."]);
        exit();
    }
}

$stmt = $conn->prepare("UPDATE users SET avatar_data = ? WHERE username = ?");
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "عمود الصورة الشخصية مش موجود في قاعدة البيانات لسه — شغّل ملف update_schema_24_avatar.sql الأول."]);
    exit();
}
$stmt->bind_param("ss", $avatar, $email);
$ok = $stmt->execute();
$stmt->close();
if ($ok && $previous !== $avatar) upl_delete($previous);

echo json_encode(["success" => (bool)$ok]);
?>
