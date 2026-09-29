<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/markets_core.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'manage_recommendations');
requireCsrf();

$symbol = trim($_POST['symbol'] ?? '');
$stockName = trim($_POST['stockName'] ?? '');
$buyFrom = floatval($_POST['buyFrom'] ?? 0);
$buyTo = floatval($_POST['buyTo'] ?? 0);
$validityHours = intval($_POST['validityHours'] ?? 24);

if (empty($symbol) || empty($stockName) || $buyFrom <= 0 || $buyTo <= 0 || $buyTo < $buyFrom) {
    echo json_encode(["success" => false, "message" => "بيانات الشراء ناقصة أو غير صحيحة."]);
    exit();
}
if (!in_array($validityHours, [24, 48, 72, 168], true)) {
    echo json_encode(["success" => false, "message" => "مدة صلاحية غير معروفة."]);
    exit();
}

$r1 = $_POST['resistance1'] !== '' ? floatval($_POST['resistance1']) : null;
$r1p = $_POST['resistance1Pct'] !== '' ? floatval($_POST['resistance1Pct']) : null;
$r2 = $_POST['resistance2'] !== '' ? floatval($_POST['resistance2']) : null;
$r2p = $_POST['resistance2Pct'] !== '' ? floatval($_POST['resistance2Pct']) : null;
$r3 = $_POST['resistance3'] !== '' ? floatval($_POST['resistance3']) : null;
$r3p = $_POST['resistance3Pct'] !== '' ? floatval($_POST['resistance3Pct']) : null;
$s1 = $_POST['support1'] !== '' ? floatval($_POST['support1']) : null;
$s2 = $_POST['support2'] !== '' ? floatval($_POST['support2']) : null;
$s3 = $_POST['support3'] !== '' ? floatval($_POST['support3']) : null;

$createdBy = $_SESSION['user_email'];
// سوق التوصية: بتظهر بس لحسابات السوق ده (الافتراضي مصر)
$recMarket = trim((string)($_POST['market'] ?? ''));
if (!mc_valid($recMarket)) $recMarket = 'مصر';

$stmt = $conn->prepare("INSERT INTO recommendations
    (symbol, stock_name, buy_from, buy_to, resistance1, resistance1_pct, resistance2, resistance2_pct, resistance3, resistance3_pct, support1, support2, support3, validity_hours, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
$stmt->bind_param(
    "ssddddddddddias",
    $symbol, $stockName, $buyFrom, $buyTo, $r1, $r1p, $r2, $r2p, $r3, $r3p, $s1, $s2, $s3, $validityHours, $createdBy
);

if ($stmt->execute()) {
    $newId = $conn->insert_id;
    if (mc_col($conn, 'recommendations', 'market')) { $mu = $conn->prepare("UPDATE recommendations SET market = ? WHERE id = ?"); $mu->bind_param("si", $recMarket, $newId); $mu->execute(); $mu->close(); }
    $pushBody = buildRecommendationPushBody(
        $stockName, $symbol, $buyFrom, $buyTo,
        [$s1, $s2, $s3],
        [["level"=>$r1,"pct"=>$r1p], ["level"=>$r2,"pct"=>$r2p], ["level"=>$r3,"pct"=>$r3p]]
    );
    broadcast_web_push_to_customers($conn, "📢 توصية شراء: $stockName ($symbol)", $pushBody, '/index.php', mc_col($conn, 'recommendations', 'market') ? $recMarket : null);
    echo json_encode(["success" => true, "id" => $newId]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$stmt->close();
?>
