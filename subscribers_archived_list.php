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
requirePermission($conn, 'manage_subscribers');

// نجيب آخر سجل اشتراك (مؤرشف) لكل حساب مؤرشف
$result = $conn->query("
    SELECT s.* FROM subscribers s
    INNER JOIN (
        SELECT account_email, MAX(id) AS max_id
        FROM subscribers
        WHERE archived = 1
        GROUP BY account_email
    ) latest ON s.account_email = latest.account_email AND s.id = latest.max_id
    ORDER BY s.id DESC
");

$rows = [];
while ($r = $result->fetch_assoc()) {
    $rows[] = [
        "id" => (string)$r['id'],
        "accountEmail" => $r['account_email'],
        "name" => $r['name'],
        "phone" => $r['phone'],
        "contactEmail" => $r['contact_email'],
        "planName" => $r['plan_name'],
        "startDate" => $r['start_date'],
        "endDate" => $r['end_date'],
    ];
}
echo json_encode(["success" => true, "archived" => $rows]);
?>
