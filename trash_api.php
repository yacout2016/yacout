<?php
/* =====================================================================
   GRIFFINE — trash_api.php (الإصدار 89) — سلة المحذوفات
   GET  action=list&all=1   ← اللي أنا مسحته (مدير الموقع مع all=1 بيشوف كل المحذوفات)
   POST action=restore  id  ← استرجاع العنصر لمكانه
   POST action=purge    id  ← حذف نهائي
   POST action=empty        ← تفريغ سلتي (أو كل السلة لمدير الموقع مع all=1)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/trash_lib.php';

function tb_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit(); }
if (empty($_SESSION['user_email'])) { http_response_code(401); tb_out(["success" => false, "message" => "سجّل الدخول أولًا."]); }
if (!trash_ready($conn)) tb_out(["success" => false, "items" => [], "message" => "شغّل ملف ALL_SCHEMA_UPDATES.sql (الإصدار 89) أولًا."]);
$email = $_SESSION['user_email'];
$isSuper = !empty($_SESSION['is_admin']) && strtolower($email) === strtolower(ADMIN_EMAIL);
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
if ($isPost) requireCsrf();
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$all = $isSuper && (($_GET['all'] ?? $_POST['all'] ?? '') === '1');
trash_auto_clean($conn);

// شرط "اللي يخصّني": أنا اللي مسحته، أو عنصر بتاعي (كعميل) اتمسح
$mine = "(deleted_by = ? OR (owner_email = ? AND scope = 'user'))";
try {
    if ($action === 'list') {
        $sql = "SELECT id, deleted_by, owner_email, scope, item_type, item_label, deleted_at FROM trash_bin WHERE restored_at IS NULL" . ($all ? "" : " AND $mine") . " ORDER BY id DESC LIMIT 500";
        $st = $conn->prepare($sql); if (!$all) $st->bind_param("ss", $email, $email);
        $st->execute(); $res = $st->get_result(); $items = [];
        while ($r = $res->fetch_assoc()) { $r['id'] = (int)$r['id']; $items[] = $r; }
        $st->close();
        tb_out(["success" => true, "items" => $items, "isSuper" => $isSuper, "keepDays" => TRASH_KEEP_DAYS]);
    }
    if ($action === 'restore' && $isPost) {
        [$ok, $info] = trash_restore($conn, (int)($_POST['id'] ?? 0), $email, $isSuper);
        tb_out($ok ? ["success" => true, "type" => $info['item_type']] : ["success" => false, "message" => $info]);
    }
    if ($action === 'purge' && $isPost) {
        $id = (int)($_POST['id'] ?? 0);
        $st = $conn->prepare("SELECT * FROM trash_bin WHERE id = ?"); $st->bind_param("i", $id); $st->execute(); $row = $st->get_result()->fetch_assoc(); $st->close();
        if (!$row || !trash_can_touch($row, $email, $isSuper)) tb_out(["success" => false, "message" => "العنصر غير موجود."]);
        trash_purge_row($conn, $row);
        tb_out(["success" => true]);
    }
    if ($action === 'empty' && $isPost) {
        $sql = "SELECT id, payload FROM trash_bin WHERE restored_at IS NULL" . ($all ? "" : " AND $mine");
        $st = $conn->prepare($sql); if (!$all) $st->bind_param("ss", $email, $email);
        $st->execute(); $res = $st->get_result(); $n = 0;
        $rows = []; while ($r = $res->fetch_assoc()) $rows[] = $r; $st->close();
        foreach ($rows as $r) { trash_purge_row($conn, $r); $n++; }
        tb_out(["success" => true, "purged" => $n]);
    }
    tb_out(["success" => false, "message" => "طلب غير معروف."]);
} catch (Throwable $e) {
    error_log('GRIFFINE trash_api: ' . $e->getMessage());
    tb_out(["success" => false, "message" => "حدث خطأ في قاعدة البيانات."]);
}
?>
