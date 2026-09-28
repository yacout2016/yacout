<?php
/* =====================================================================
   GRIFFINE — chat_faq_api.php (الإصدار 89) — أسئلة المساعد الذكي في الشات
   GET  action=public          ← (للكل) هل المساعد شغال + أهم 6 أسئلة تظهر كاقتراحات في الشات
   --- الإدارة (manage_content أو manage_admin_settings) ---
   GET  action=list            ← كل الأسئلة + حالة المساعد
   POST action=save            id?, question, keywords, answer, active, sort_order
   POST action=delete          id
   POST action=toggle          enabled=1|0
   POST action=test            text ← تجربة: أي سؤال هيتطابق
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/trash_lib.php';   // الإصدار 89: سلة المحذوفات
require_once __DIR__ . '/chat_faq_lib.php';

function faq_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit(); }
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
if (!faq_table_ready($conn)) faq_out(["success" => false, "items" => [], "message" => "شغّل ملف ALL_SCHEMA_UPDATES.sql (الإصدار 89) أولًا."]);

if ($action === 'public') {
    session_write_close();
    $on = site_config_on($conn, 'chat_bot');
    $items = [];
    if ($on) {
        $res = $conn->query("SELECT id, question FROM chat_faq WHERE active = 1 ORDER BY sort_order, hits DESC, id LIMIT 50");   // الإصدار 94: كل الأسئلة (القائمة بتتمرر لفوق وتحت)
        while ($r = $res->fetch_assoc()) $items[] = ["id" => (int)$r['id'], "question" => $r['question']];
    }
    faq_out(["success" => true, "enabled" => $on, "items" => $items]);
}

$perms = (!empty($_SESSION['user_email']) && !empty($_SESSION['is_admin'])) ? getCurrentUserPermissions($conn) : [];
if (!in_array('manage_content', $perms, true) && !in_array('manage_admin_settings', $perms, true)) { http_response_code(403); faq_out(["success" => false, "message" => "لا توجد صلاحية كافية."]); }
$by = $_SESSION['user_email'];
session_write_close();
if ($isPost) requireCsrf();

try {
    if ($action === 'list') {
        $res = $conn->query("SELECT id, question, keywords, answer, active, sort_order, hits, updated_at FROM chat_faq ORDER BY sort_order, id");
        $items = [];
        while ($r = $res->fetch_assoc()) { foreach (['id', 'active', 'sort_order', 'hits'] as $k) $r[$k] = (int)$r[$k]; $items[] = $r; }
        faq_out(["success" => true, "enabled" => site_config_on($conn, 'chat_bot'), "items" => $items]);
    }
    if ($action === 'save' && $isPost) {
        $id = (int)($_POST['id'] ?? 0);
        $q = mb_substr(trim((string)($_POST['question'] ?? '')), 0, 300);
        $k = mb_substr(trim((string)($_POST['keywords'] ?? '')), 0, 500);
        $a = mb_substr(trim((string)($_POST['answer'] ?? '')), 0, 4000);
        $act = !empty($_POST['active']) && $_POST['active'] !== '0' ? 1 : 0;
        $so = (int)($_POST['sort_order'] ?? 0);
        if ($q === '' || $a === '') faq_out(["success" => false, "message" => "اكتب السؤال والإجابة."]);
        if ($id > 0) { $st = $conn->prepare("UPDATE chat_faq SET question = ?, keywords = ?, answer = ?, active = ?, sort_order = ? WHERE id = ?"); $st->bind_param("sssiii", $q, $k, $a, $act, $so, $id); }
        else { $st = $conn->prepare("INSERT INTO chat_faq (question, keywords, answer, active, sort_order) VALUES (?, ?, ?, ?, ?)"); $st->bind_param("sssii", $q, $k, $a, $act, $so); }
        $st->execute(); $newId = $id ?: $conn->insert_id; $st->close();
        faq_out(["success" => true, "id" => $newId]);
    }
    if ($action === 'delete' && $isPost) {
        $id = (int)($_POST['id'] ?? 0);
        $__r = trash_rows($conn, 'chat_faq', 'id = ?', 'i', [$id]); trash_put($conn, 'faq', 'سؤال المساعد: ' . ($__r[0]['question'] ?? '#' . $id), ['chat_faq' => $__r]);
        $st = $conn->prepare("DELETE FROM chat_faq WHERE id = ?"); $st->bind_param("i", $id); $st->execute(); $st->close();
        faq_out(["success" => true]);
    }
    if ($action === 'toggle' && $isPost) {
        site_config_set($conn, 'chat_bot', ($_POST['enabled'] ?? '') === '1' ? '1' : '0', $by);
        faq_out(["success" => true, "enabled" => site_config_on($conn, 'chat_bot')]);
    }
    if ($action === 'test' && $isPost) {
        $t = (string)($_POST['text'] ?? '');
        if (faq_is_handoff($t)) faq_out(["success" => true, "handoff" => true]);
        $m = faq_match($conn, $t);
        faq_out(["success" => true, "match" => $m ? ["id" => (int)$m['id'], "question" => $m['question'], "answer" => $m['answer']] : null]);
    }
    faq_out(["success" => false, "message" => "طلب غير معروف."]);
} catch (Throwable $e) {
    error_log('GRIFFINE chat_faq_api: ' . $e->getMessage());
    faq_out(["success" => false, "message" => "حدث خطأ في قاعدة البيانات."]);
}
?>
