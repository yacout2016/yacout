<?php
header('Content-Type: application/json');
include 'db.php';

$token = trim($_GET['token'] ?? $_POST['token'] ?? '');
if (empty($token)) {
    echo json_encode(["success" => false, "message" => "رابط غير صحيح."]);
    exit();
}

$stmt = $conn->prepare("SELECT id, email, expires_at, used FROM email_verifications WHERE token = ? LIMIT 1");
$stmt->bind_param("s", $token);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode(["success" => false, "message" => "رابط التفعيل غير صحيح."]);
    exit();
}
if ((int)$row['used'] === 1) {
    echo json_encode(["success" => true, "message" => "الحساب مفعّل بالفعل."]);
    exit();
}
if (strtotime($row['expires_at']) < time()) {
    echo json_encode(["success" => false, "message" => "انتهت صلاحية رابط التفعيل. اطلب رابط جديد."]);
    exit();
}

$conn->begin_transaction();
try {
    $upd = $conn->prepare("UPDATE users SET email_verified = 1 WHERE username = ?");
    $upd->bind_param("s", $row['email']);
    $upd->execute();
    $upd->close();

    $mark = $conn->prepare("UPDATE email_verifications SET used = 1 WHERE id = ?");
    $mark->bind_param("i", $row['id']);
    $mark->execute();
    $mark->close();

    $conn->commit();
    echo json_encode(["success" => true, "message" => "تم تفعيل حسابك بنجاح!"]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $e->getMessage()]);
}
?>
