<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/chat_read_state.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'view_chat');

$view = trim($_GET['view'] ?? 'active'); // active | archived | trash

$filter = $view === 'trash' ? "COALESCE(cm.deleted, 0) = 1"
    : ($view === 'archived' ? "COALESCE(cm.archived, 0) = 1 AND COALESCE(cm.deleted, 0) = 0"
    : "COALESCE(cm.archived, 0) = 0 AND COALESCE(cm.deleted, 0) = 0");
$sql = chat_conversations_sql($conn, $filter) . " ORDER BY t.last_at DESC";

// الإصدار 77: أي خطأ في قاعدة البيانات بيرجع رسالة واضحة (مش صفحة خطأ فاضية) ويتسجّل في اللوج
try {
    $result = $conn->query($sql);
    $rows = [];
    while ($r = $result->fetch_assoc()) {
        $rows[] = [
            "visitorId" => $r['visitor_id'] ?: $r['conv_key'],
            "email" => $r['visitor_email'],
            "lastAt" => $r['last_at'],
            "lastMessage" => $r['last_message'],
            "lastSender" => $r['last_sender'],
            // الإصدار 72: غير مقروءة = رسالة من العميل بعد آخر مرة الأدمن فتح المحادثة
            "unread" => (int)$r['unread'] === 1,
            "allowUpload" => (int)$r['allow_upload'] === 1,   // الإصدار 82: رفع الملفات مفتوح للعميل؟
            "maxUploadMb" => ((int)$r['max_upload_mb'] > 0) ? chat_clamp_mb($r['max_upload_mb']) : CHAT_DEFAULT_UPLOAD_MB, // الإصدار 83
        ];
    }

    /* الإصدار 82: نوع كل محادثة ← مشترك (اشتراك نشط) / مسجّل من غير اشتراك / زائر (استفسار قبل الاشتراك) */
    $emails = array_values(array_unique(array_filter(array_map(function($x){ return $x['email'] ? strtolower($x['email']) : null; }, $rows))));
    $subs = []; $users = [];
    if ($emails) {
        $in = implode(',', array_fill(0, count($emails), '?')); $types = str_repeat('s', count($emails));
        $st = $conn->prepare("SELECT LOWER(account_email) e FROM subscribers WHERE active = 1 AND archived = 0 AND end_date >= CURDATE() AND LOWER(account_email) IN ($in)");
        $st->bind_param($types, ...$emails); $st->execute(); $rs = $st->get_result();
        while ($x = $rs->fetch_assoc()) $subs[$x['e']] = true;
        $st->close();
        $st = $conn->prepare("SELECT LOWER(username) e FROM users WHERE archived = 0 AND LOWER(username) IN ($in)");
        $st->bind_param($types, ...$emails); $st->execute(); $rs = $st->get_result();
        while ($x = $rs->fetch_assoc()) $users[$x['e']] = true;
        $st->close();
    }
    foreach ($rows as &$row) {
        $e = $row['email'] ? strtolower($row['email']) : '';
        $row['kind'] = isset($subs[$e]) ? 'subscriber' : (isset($users[$e]) ? 'member' : 'guest');
    }
    unset($row);

    echo json_encode(["success" => true, "conversations" => $rows]);
} catch (Throwable $e) {
    error_log('GRIFFINE chat_conversations_list: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "تعذّر تحميل المحادثات من قاعدة البيانات - شغّل ملف ALL_SCHEMA_UPDATES.sql ولو المشكلة فضلت ابعت الرسالة دي للدعم الفني."]);
}
?>
