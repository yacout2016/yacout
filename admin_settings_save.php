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
requirePermission($conn, 'manage_admin_settings');

requireCsrf();

$allowedKeys = [
    'require_email_verification', 'require_valid_email_domain',
    'require_payment_ref', 'require_payment_proof',
    'require_card_details', 'require_manual_activation',
    'chat_enabled', 'chat_icon_visible',
    'hide_dac_screen', 'hide_grid_screen', 'hide_portfolio_screen',
    'hide_screener_screen', 'hide_sub_history_screen', 'hide_recommendations_screen',
    'hide_referral_screen', 'hide_contact_screen', 'hide_testimonials_screen',
    'hide_articles_screen',
    'hide_suggestions_screen',
    'hide_watchlist_screen', 'hide_alerts_screen', 'hide_stock_screen', 'hide_curve_home', 'hide_trash_screen', 'hide_trades_screen',   // الإصدار 96
    'hide_opps_screen',   // الإصدار 101
];

$key = trim($_POST['key'] ?? '');
$value = intval($_POST['value'] ?? 1) ? 1 : 0;

if (!in_array($key, $allowedKeys, true)) {
    echo json_encode(["success" => false, "message" => "إعداد غير معروف."]);
    exit();
}

$stmt = $conn->prepare("INSERT INTO admin_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
$stmt->bind_param("sii", $key, $value, $value);
if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$stmt->close();
?>
