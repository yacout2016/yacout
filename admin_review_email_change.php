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

requireCsrf();

$id = intval($_POST['id'] ?? 0);
$decision = $_POST['decision'] ?? ''; // approved | rejected
$note = trim($_POST['note'] ?? '') ?: null;

if ($id <= 0 || !in_array($decision, ['approved', 'rejected'], true)) {
    echo json_encode(["success" => false, "message" => "بيانات غير صحيحة."]);
    exit();
}

$stmt = $conn->prepare("SELECT * FROM email_change_requests WHERE id = ? AND status = 'pending'");
$stmt->bind_param("i", $id);
$stmt->execute();
$req = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$req) {
    echo json_encode(["success" => false, "message" => "الطلب غير موجود أو تمت مراجعته بالفعل."]);
    exit();
}

$reviewer = $_SESSION['user_email'];
$now = date('Y-m-d H:i:s');

if ($decision === 'rejected') {
    $stmt = $conn->prepare("UPDATE email_change_requests SET status='rejected', reviewed_at=?, reviewed_by=?, review_note=? WHERE id=?");
    $stmt->bind_param("sssi", $now, $reviewer, $note, $id);
    $stmt->execute();
    mail_email_change_reviewed($conn, $req['current_email'], $req['requested_email'], false, $note); // الإصدار 72
    echo json_encode(["success" => true]);
    exit();
}

// الموافقة: نغيّر الإيميل في كل الجداول اللي بتمثّل هوية/ربط نشط للحساب — مش سجلات تاريخية (زي طلبات قديمة أو موافقات قانونية سابقة، دي بتفضل كما هي كتوثيق لوقتها)
$oldEmail = $req['current_email'];
$newEmail = $req['requested_email'];

// تأكيد أخير إن الإيميل الجديد بعد متاح (تحسبًا لأي تغيير من وقت تقديم الطلب)
$check = $conn->prepare("SELECT id FROM users WHERE username = ?");
$check->bind_param("s", $newEmail);
$check->execute();
if ($check->get_result()->fetch_assoc()) {
    echo json_encode(["success" => false, "message" => "البريد الإلكتروني الجديد أصبح مستخدمًا لحساب آخر، ولا يمكن إكمال الموافقة."]);
    exit();
}
$check->close();

$conn->begin_transaction();
try {
    $tables = [
        ['users', 'username'],
        ['subscribers', 'account_email'],
        ['user_data_store', 'account_email'],
        ['staff_members', 'email'],
        ['password_resets', 'email'],
        ['email_verifications', 'email'],
    ];
    foreach ($tables as [$table, $col]) {
        $tblCheck = $conn->query("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='$table'");
        if ($tblCheck->num_rows === 0) continue; // الجدول ده ممكن يكون غير موجود في كل نسخة
        $stmt = $conn->prepare("UPDATE `$table` SET `$col` = ? WHERE `$col` = ?");
        $stmt->bind_param("ss", $newEmail, $oldEmail);
        $stmt->execute();
        $stmt->close();
    }
    $tblCheck = $conn->query("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='referrals'");
    if ($tblCheck->num_rows > 0) {
        $conn->query("UPDATE referrals SET referrer_email = '" . $conn->real_escape_string($newEmail) . "' WHERE referrer_email = '" . $conn->real_escape_string($oldEmail) . "'");
        $conn->query("UPDATE referrals SET referred_email = '" . $conn->real_escape_string($newEmail) . "' WHERE referred_email = '" . $conn->real_escape_string($oldEmail) . "'");
    }

    $stmt = $conn->prepare("UPDATE email_change_requests SET status='approved', reviewed_at=?, reviewed_by=?, review_note=? WHERE id=?");
    $stmt->bind_param("sssi", $now, $reviewer, $note, $id);
    $stmt->execute();
    $stmt->close();

    $conn->commit();
    mail_email_change_reviewed($conn, $oldEmail, $newEmail, true, $note); // الإصدار 72
    echo json_encode(["success" => true]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "حصل خطأ أثناء تنفيذ التغيير، اترجعنا للوضع الأصلي."]);
}
?>
