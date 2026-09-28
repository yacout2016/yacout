<?php
header('Content-Type: application/json');
include 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "طريقة طلب غير صالحة."]);
    exit();
}

$token = trim($_POST['token'] ?? '');
$password = $_POST['password'] ?? '';

if (empty($token) || empty($password)) {
    echo json_encode(["success" => false, "message" => "بيانات ناقصة."]);
    exit();
}
if (!isStrongPassword($password)) {
    echo json_encode(["success" => false, "message" => "كلمة المرور لازم تكون 8 أحرف على الأقل وفيها حرف ورقم."]);
    exit();
}

$stmt = $conn->prepare("SELECT id, email, expires_at, used FROM password_resets WHERE token = ? LIMIT 1");
$stmt->bind_param("s", $token);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row || (int)$row['used'] === 1 || strtotime($row['expires_at']) < time()) {
    echo json_encode(["success" => false, "message" => "الرابط غير صالح أو منتهي الصلاحية. اطلب رابط جديد."]);
    exit();
}

// الحساب لازم يكون مش مؤرشف عشان نغير الباسورد بتاعه
$u = $conn->prepare("SELECT id FROM users WHERE username = ? AND archived = 0 LIMIT 1");
$u->bind_param("s", $row['email']);
$u->execute();
$userResult = $u->get_result();
$u->close();

if ($userResult->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "الرابط غير صالح."]);
    exit();
}

$hashed = password_hash($password, PASSWORD_DEFAULT);

$conn->begin_transaction();
try {
    $upd = $conn->prepare("UPDATE users SET password = ? WHERE username = ?");
    $upd->bind_param("ss", $hashed, $row['email']);
    $upd->execute();
    $upd->close();

    $mark = $conn->prepare("UPDATE password_resets SET used = 1 WHERE id = ?");
    $mark->bind_param("i", $row['id']);
    $mark->execute();
    $mark->close();

    $conn->commit();
    echo json_encode(["success" => true, "message" => "تم تغيير كلمة المرور بنجاح. تقدر تسجّل دخول دلوقتي."]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $e->getMessage()]);
}
?>
