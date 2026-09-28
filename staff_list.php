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

$result = $conn->query("SELECT * FROM staff_members ORDER BY created_at DESC");
$staff = [];
$ids = [];
while ($r = $result->fetch_assoc()) {
    $staff[$r['id']] = [
        "id" => (string)$r['id'],
        "email" => $r['email'],
        "jobTitle" => $r['job_title'],
        "active" => (bool)$r['active'],
        "createdAt" => $r['created_at'],
        "permissions" => [],
    ];
    $ids[] = $r['id'];
}

if (!empty($ids)) {
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $types = str_repeat('i', count($ids));
    $permStmt = $conn->prepare("SELECT staff_id, permission_key FROM staff_permissions WHERE staff_id IN ($placeholders)");
    $permStmt->bind_param($types, ...$ids);
    $permStmt->execute();
    $permResult = $permStmt->get_result();
    while ($p = $permResult->fetch_assoc()) {
        $staff[$p['staff_id']]['permissions'][] = $p['permission_key'];
    }
    $permStmt->close();
}

echo json_encode([
    "success" => true,
    "staff" => array_values($staff),
    "permissionKeys" => getAllPermissionKeys(),
    "jobTitles" => getAllJobTitles(),
    "defaultsByJobTitle" => array_combine(
        array_keys(getAllJobTitles()),
        array_map('getDefaultPermissionsForJobTitle', array_keys(getAllJobTitles()))
    ),
]);
?>
