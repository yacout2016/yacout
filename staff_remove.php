<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'manage_staff');
requireCsrf();

$staffId = intval($_POST['staffId'] ?? 0);
// الإصدار 85: mode = remove (إيقاف - زي الأول) | restore (إرجاع للفريق بنفس صلاحياته) | purge (حذف من الفريق نهائيًا)
$mode = $_POST['mode'] ?? 'remove';
if (!in_array($mode, ['remove', 'restore', 'purge'], true)) $mode = 'remove';
if ($staffId <= 0) {
    echo json_encode(["success" => false, "message" => "معرّف غير صحيح."]);
    exit();
}

$stmt = $conn->prepare("SELECT email FROM staff_members WHERE id = ?");
$stmt->bind_param("i", $staffId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode(["success" => false, "message" => "عضو الفريق غير موجود."]);
    exit();
}

// محدش يشيل نفسه ولا المدير الأصلي للموقع
if ($mode !== 'restore' && (strtolower($row['email']) === strtolower($_SESSION['user_email']) || strtolower($row['email']) === strtolower(ADMIN_EMAIL))) {
    echo json_encode(["success" => false, "message" => "لا يمكنك إزالة نفسك أو المدير الأصلي للموقع من الفريق."]);
    exit();
}

$conn->begin_transaction();
try {
    if ($mode === 'restore') {
        // الحساب لازم يكون بعد موجود ومش مؤرشف
        $chk = $conn->prepare("SELECT id FROM users WHERE username = ? AND archived = 0 LIMIT 1");
        $chk->bind_param("s", $row['email']); $chk->execute();
        $exists = $chk->get_result()->num_rows > 0; $chk->close();
        if (!$exists) { $conn->rollback(); echo json_encode(["success" => false, "message" => "حساب هذا الشخص غير موجود (أو تم حذفه) - يجب أن يسجّل حسابًا أولًا."]); exit(); }
        $a = $conn->prepare("UPDATE staff_members SET active = 1 WHERE id = ?"); $a->bind_param("i", $staffId); $a->execute(); $a->close();
        $u = $conn->prepare("UPDATE users SET is_admin = 1 WHERE username = ?"); $u->bind_param("s", $row['email']); $u->execute(); $u->close();
        $conn->commit();
        echo json_encode(["success" => true]);
        exit();
    }
    if ($mode === 'purge') {
        // حذف من الفريق نهائيًا (بصلاحياته) - حسابه العادي كعميل يفضل كما هو
        $d = $conn->prepare("DELETE FROM staff_permissions WHERE staff_id = ?"); $d->bind_param("i", $staffId); $d->execute(); $d->close();
        $d = $conn->prepare("DELETE FROM staff_members WHERE id = ?"); $d->bind_param("i", $staffId); $d->execute(); $d->close();
        $u = $conn->prepare("UPDATE users SET is_admin = 0 WHERE username = ?"); $u->bind_param("s", $row['email']); $u->execute(); $u->close();
        $conn->commit();
        echo json_encode(["success" => true]);
        exit();
    }
    $upd = $conn->prepare("UPDATE staff_members SET active = 0 WHERE id = ?");
    $upd->bind_param("i", $staffId);
    $upd->execute();
    $upd->close();

    // بيرجع حساب عادي تاني (مش أدمن) - حسابه الأصلي كعميل يفضل موجود من غير أي مساس
    $u = $conn->prepare("UPDATE users SET is_admin = 0 WHERE username = ?");
    $u->bind_param("s", $row['email']);
    $u->execute();
    $u->close();

    $conn->commit();
    echo json_encode(["success" => true]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $e->getMessage()]);
}
?>
