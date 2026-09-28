<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (!isset($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "يرجى تسجيل الدخول."]);
    exit();
}

$email = $_SESSION['user_email'];

$stmt = $conn->prepare("SELECT referral_code FROM users WHERE username = ? LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

$code = $row['referral_code'] ?? null;
if (!$code) $code = generateReferralCode($conn, $email);

$countStmt = $conn->prepare("SELECT COUNT(*) as total, SUM(rewarded) as rewarded FROM referrals WHERE referrer_email = ?");
$countStmt->bind_param("s", $email);
$countStmt->execute();
$counts = $countStmt->get_result()->fetch_assoc();
$countStmt->close();

echo json_encode([
    "success" => true,
    "code" => $code,
    "totalReferred" => (int)($counts['total'] ?? 0),
    "rewardedCount" => (int)($counts['rewarded'] ?? 0),
    "bonusDays" => REFERRAL_BONUS_DAYS,
]);
?>
