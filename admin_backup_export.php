<?php
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (!isset($_SESSION['user_email']) || strtolower($_SESSION['user_email']) !== strtolower(ADMIN_EMAIL)) {
    http_response_code(403);
    echo "غير مصرح لك. النسخ الاحتياطي اليدوي متاح فقط لمدير الموقع الأصلي.";
    exit();
}

// كل جداول GRIFFINE - نسخة احتياطية تكميلية بجانب نسخ هوستنجر التلقائية، مش بديل عنها
$tables = [
    'users', 'subscribers', 'subscription_plans', 'subscription_events',
    'reminder_defaults', 'blacklist', 'admin_settings', 'staff_members',
    'staff_permissions', 'site_content', 'screener_settings', 'recommendations',
    'recommendation_settings', 'disclaimer_acceptances', 'chat_conversation_meta',
];

header('Content-Type: application/sql; charset=utf-8');
header('Content-Disposition: attachment; filename="griffine_backup_' . date('Y-m-d_His') . '.sql"');

echo "-- نسخة احتياطية يدوية من GRIFFINE - " . date('Y-m-d H:i:s') . "\n";
echo "-- تنويه: دي نسخة تكميلية بس، هوستنجر بتعمل نسخ احتياطي تلقائي أساسي للموقع كامل\n";
echo "SET FOREIGN_KEY_CHECKS=0;\n\n";

foreach ($tables as $table) {
    $check = $conn->query("SHOW TABLES LIKE '" . $conn->real_escape_string($table) . "'");
    if (!$check || $check->num_rows === 0) continue;

    $createRes = $conn->query("SHOW CREATE TABLE `$table`");
    if ($createRes) {
        $createRow = $createRes->fetch_row();
        echo "DROP TABLE IF EXISTS `$table`;\n";
        echo $createRow[1] . ";\n\n";
    }

    $dataRes = $conn->query("SELECT * FROM `$table`");
    if ($dataRes && $dataRes->num_rows > 0) {
        $fields = $dataRes->fetch_fields();
        $skipCol = ($table === 'subscribers') ? 'payment_proof' : null; // صور الإثبات كبيرة الحجم - مستبعدة من النسخة السريعة دي بس، وموجودة في نسخة هوستنجر الكاملة
        $colIndexes = [];
        $colNames = [];
        foreach ($fields as $i => $f) {
            if ($f->name === $skipCol) continue;
            $colIndexes[] = $i;
            $colNames[] = "`{$f->name}`";
        }
        while ($row = $dataRes->fetch_assoc()) {
            $rowValues = array_values($row);
            $values = [];
            foreach ($colIndexes as $i) {
                $v = $rowValues[$i];
                $values[] = $v === null ? 'NULL' : "'" . $conn->real_escape_string($v) . "'";
            }
            echo "INSERT INTO `$table` (" . implode(',', $colNames) . ") VALUES (" . implode(',', $values) . ");\n";
        }
        echo "\n";
    }
}

echo "SET FOREIGN_KEY_CHECKS=1;\n";
?>
