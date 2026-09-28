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
// permissions[] بتوصل كقائمة مفاتيح مفصولة بفاصلة (المفاتيح المطلوب تفعيلها بس - الباقي بيتشال)
$permissionsRaw = trim($_POST['permissions'] ?? '');
if ($staffId <= 0) {
    echo json_encode(["success" => false, "message" => "معرّف غير صحيح."]);
    exit();
}

$validKeys = array_keys(getAllPermissionKeys());
$requested = array_values(array_intersect($validKeys, array_filter(array_map('trim', explode(',', $permissionsRaw)))));

$check = $conn->prepare("SELECT id FROM staff_members WHERE id = ?");
$check->bind_param("i", $staffId);
$check->execute();
if ($check->get_result()->num_rows === 0) {
    $check->close();
    echo json_encode(["success" => false, "message" => "عضو الفريق غير موجود."]);
    exit();
}
$check->close();

$conn->begin_transaction();
try {
    $del = $conn->prepare("DELETE FROM staff_permissions WHERE staff_id = ?");
    $del->bind_param("i", $staffId);
    $del->execute();
    $del->close();

    if (!empty($requested)) {
        $ins = $conn->prepare("INSERT INTO staff_permissions (staff_id, permission_key) VALUES (?, ?)");
        foreach ($requested as $key) {
            $ins->bind_param("is", $staffId, $key);
            $ins->execute();
        }
        $ins->close();
    }

    $conn->commit();
    echo json_encode(["success" => true]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $e->getMessage()]);
}
?>
