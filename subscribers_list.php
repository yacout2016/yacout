<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/uploads.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك بالدخول لهذه الصفحة."]);
    exit();
}
requirePermission($conn, 'manage_subscribers');

// الإصدار 96: كود كل عضو (Top-7 أولًا ، INV-n ، INV-n-E لو موظف كمان ، وكود الموظف)
require_once __DIR__ . '/codes_lib.php';
codes_ensure_all($conn);
$hasCodes = codes_ready($conn);
$result = $conn->query($hasCodes
    ? "SELECT s.*, u.inv_code, u.member_no, st.staff_code, st.active AS staff_active FROM subscribers s
       LEFT JOIN users u ON u.username = s.account_email LEFT JOIN staff_members st ON st.email = s.account_email
       WHERE s.archived = 0 ORDER BY (u.inv_code = 'Top-7') DESC, s.start_date DESC, s.id DESC"
    : "SELECT * FROM subscribers WHERE archived = 0 ORDER BY start_date DESC, id DESC");
$rows = [];
while ($r = $result->fetch_assoc()) {
    $rows[] = [
        "id" => (string)$r['id'],
        "accountEmail" => $r['account_email'],
        "memberCode" => $hasCodes ? codes_display($r['inv_code'] ?? '', $r['staff_code'] ?? '', !empty($r['staff_active'])) : '',
        "memberNo" => isset($r['member_no']) ? (int)$r['member_no'] : null,
        "staffCode" => $r['staff_code'] ?? null,
        "name" => $r['name'],
        "phone" => $r['phone'],
        "contactEmail" => $r['contact_email'],
        "planId" => $r['plan_id'],
        "planName" => $r['plan_name'],
        "amount" => (float)$r['amount'],
        "currency" => $r['currency'],
        "market" => $r['market'],
        "paymentMethod" => $r['payment_method'],
        "paymentRef" => $r['payment_ref'],
        "paymentProof" => upl_url($r['payment_proof']),
        "startDate" => $r['start_date'],
        "endDate" => $r['end_date'],
        "active" => (bool)$r['active'],
        "reminderEnabled" => (bool)$r['reminder_enabled'],
        "reminderIntervalDays" => (int)$r['reminder_interval_days'],
        "pendingPlanId" => $r['pending_plan_id'],
        "pendingPlanName" => $r['pending_plan_name'],
        "pendingAmount" => $r['pending_amount'] !== null ? (float)$r['pending_amount'] : null,
        "pendingPaymentMethod" => $r['pending_payment_method'],
        "pendingPaymentRef" => $r['pending_payment_ref'],
        "pendingPaymentProof" => upl_url($r['pending_payment_proof']),
        "isComp" => (bool)$r['is_comp'],
    ];
}
echo json_encode(["success" => true, "subscribers" => $rows]);
?>
