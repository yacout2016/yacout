<?php
/* =====================================================================
   GRIFFINE — broadcast_api.php (الإصدار 154 / 156) — «📢 الرسائل» (بدل domain_notice.php)
   الإصدار 156: أشخاص بالاسم (بحث بالاسم أو الإيميل · الأدمن أول واحد) + بريد داخلي مبسّط بين الأدمن والموظفين + 📥 الوارد
     - أي موظف (حتى من غير صلاحية) يبعت للأدمن والموظفين
     - المشتركين (بالاسم أو بالمجموعة) ← send_broadcast أو manage_admin_settings
     - الموظف بيشوف اللي بعته واللي وصله بس · الأدمن بيشوف كل حاجة
   العنوان والنص وزرار الإيميل بيكتبهم الأدمن · القنوات: إشعار جوه الموقع و/أو إيميل · مين يستلم (قائمة منسدلة)
   GET  ?view=sent|trash                     ← السجل + عدد كل فئة + الصلاحيات
   POST action=test                          ← إيميل تجربة لإيميلك بس
   POST action=create  ← بيسجّل الرسالة ويرجّع id   ·   POST action=batch&id=&after= ← بيبعت 25 مستخدم كل طلب
   POST action=trash|restore|purge&ids=1,2 · empty_trash  ← للأدمن بس (الإعدادات الإلزامية)
   الصلاحيات: الإرسال ← send_broadcast أو manage_admin_settings · المسح / الاسترجاع / الحذف النهائي ← manage_admin_settings بس
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/security_lib.php';
require_once __DIR__ . '/mailer.php';
function bc_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit(); }
if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) { http_response_code(403); bc_out(["success" => false, "message" => "غير مصرح لك."]); }
$perms = getCurrentUserPermissions($conn);
$isAdm = in_array('manage_admin_settings', $perms, true);
$canSend = $isAdm || in_array('send_broadcast', $perms, true);   // للمشتركين
$me = $_SESSION['user_email'];
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
if ($isPost) requireCsrf();
session_write_close();

$conn->query("CREATE TABLE IF NOT EXISTS broadcasts (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(200) NOT NULL, body TEXT NOT NULL,
    btn_label VARCHAR(80) NOT NULL DEFAULT '', btn_url VARCHAR(300) NOT NULL DEFAULT '', ch_app TINYINT NOT NULL DEFAULT 1, ch_mail TINYINT NOT NULL DEFAULT 1,
    audience VARCHAR(12) NOT NULL DEFAULT 'all', total INT NOT NULL DEFAULT 0, sent_app INT NOT NULL DEFAULT 0, sent_mail INT NOT NULL DEFAULT 0,
    status VARCHAR(10) NOT NULL DEFAULT 'sending', last_uid INT NOT NULL DEFAULT 0, created_by VARCHAR(190) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME NULL, deleted TINYINT NOT NULL DEFAULT 0, deleted_at DATETIME NULL, deleted_by VARCHAR(190) NULL, KEY ix_del (deleted, id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$conn->query("CREATE TABLE IF NOT EXISTS broadcast_recipients (id INT AUTO_INCREMENT PRIMARY KEY, broadcast_id INT NOT NULL, email VARCHAR(190) NOT NULL,
    KEY ix_b (broadcast_id, id), KEY ix_e (email)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

const BC_AUD = ['people' => '👤 أشخاص بالاسم', 'staff' => '🛡 كل الموظفين والإدارة', 'all' => 'كل المستخدمين', 'active' => 'المشتركين النشطين', 'paid' => 'الباقات المدفوعة بس', 'trial' => 'الباقة المجانية بس', 'expired' => 'اللي اشتراكهم خلص'];
function bc_where($aud){
    $act = "s.active = 1 AND COALESCE(s.archived, 0) = 0 AND (s.end_date IS NULL OR s.end_date >= CURDATE())";
    $sub = fn($c) => "EXISTS (SELECT 1 FROM subscribers s WHERE LOWER(s.account_email) = LOWER(u.username) AND $c)";
    $w = "COALESCE(u.archived, 0) = 0";
    if ($aud === 'staff') $w .= " AND u.is_admin = 1";
    elseif ($aud === 'active') $w .= " AND " . $sub($act);
    elseif ($aud === 'paid') $w .= " AND " . $sub("$act AND s.amount > 0");
    elseif ($aud === 'trial') $w .= " AND " . $sub("$act AND (s.plan_id = 'trial' OR s.amount = 0)");
    elseif ($aud === 'expired') $w .= " AND " . $sub("1 = 1") . " AND NOT " . $sub($act);
    return $w;
}
function bc_count($conn, $aud){ if ($aud === 'people') return 0; try { $r = $conn->query("SELECT COUNT(*) FROM users u WHERE " . bc_where($aud)); return $r ? (int)$r->fetch_row()[0] : 0; } catch (Throwable $e) { return 0; } }
function bc_paras($body){ return array_values(array_filter(array_map('trim', preg_split('/\R/u', (string)$body)), fn($x) => $x !== '')); }
function bc_button($b){ return ($b['btn_label'] !== '' && $b['btn_url'] !== '') ? ['label' => $b['btn_label'], 'url' => $b['btn_url']] : ['label' => 'افتح GRIFFINE', 'url' => MAIL_SITE_URL . '/index.php']; }
// الاسم الظاهر: الأدمن ← «الأدمن» · موظف ← اسمه في شؤون الموظفين · مشترك ← اسمه في آخر اشتراك · غير كده أول الإيميل
function bc_people($conn, $q, $staffOnly, $limit = 60){
    $nm = "COALESCE((SELECT h.full_name FROM hr_employees h WHERE LOWER(h.email) = LOWER(u.username) AND h.full_name <> '' ORDER BY h.id DESC LIMIT 1),
           (SELECT s.name FROM subscribers s WHERE LOWER(s.account_email) = LOWER(u.username) AND s.name <> '' ORDER BY s.id DESC LIMIT 1), '')";
    $w = "COALESCE(u.archived, 0) = 0" . ($staffOnly ? " AND u.is_admin = 1" : "");
    $sql = "SELECT * FROM (SELECT u.username email, u.is_admin, $nm name FROM users u WHERE $w) t";
    $types = ''; $args = [];
    if ($q !== '') { $sql .= " WHERE t.email LIKE ? OR t.name LIKE ?"; $like = '%' . $q . '%'; $types = 'ss'; $args = [$like, $like]; }
    $sql .= " ORDER BY (LOWER(t.email) = ?) DESC, t.is_admin DESC, t.name = '', t.name, t.email LIMIT " . (int)$limit;
    $types .= 's'; $args[] = strtolower(ADMIN_EMAIL);
    $st = $conn->prepare($sql); $st->bind_param($types, ...$args); $st->execute(); $res = $st->get_result(); $o = [];
    while ($x = $res->fetch_assoc()) {
        $own = strtolower($x['email']) === strtolower(ADMIN_EMAIL);
        $o[] = ['email' => $x['email'], 'name' => $own ? 'الأدمن' : ($x['name'] !== '' ? $x['name'] : explode('@', $x['email'])[0]), 'role' => $own ? 'admin' : ((int)$x['is_admin'] === 1 ? 'staff' : 'sub')];
    }
    $st->close(); return $o;
}
function bc_input($conn, $canSend){
    $c = fn($k, $n) => mb_substr(trim((string)($_POST[$k] ?? '')), 0, $n);
    $b = ['title' => $c('title', 200), 'body' => $c('body', 5000), 'btn_label' => $c('btn_label', 80), 'btn_url' => $c('btn_url', 300),
        'ch_app' => !empty($_POST['ch_app']) ? 1 : 0, 'ch_mail' => !empty($_POST['ch_mail']) ? 1 : 0,
        'audience' => array_key_exists($_POST['audience'] ?? '', BC_AUD) ? $_POST['audience'] : 'people', 'to' => []];
    if ($b['btn_url'] !== '' && !preg_match('#^https://#i', $b['btn_url'])) bc_out(["success" => false, "message" => "رابط الزرار لازم يبدأ بـ https://"]);
    if ($b['title'] === '' || $b['body'] === '') bc_out(["success" => false, "message" => "اكتب العنوان ونص الرسالة."]);
    if (!$canSend && !in_array($b['audience'], ['people', 'staff'], true)) bc_out(["success" => false, "message" => "الإرسال للمشتركين محتاج صلاحية «📢 إرسال رسالة لكل المستخدمين»."]);
    if ($b['audience'] === 'people') {
        $want = array_values(array_unique(array_filter(array_map(fn($x) => strtolower(trim($x)), explode(',', (string)($_POST['to'] ?? ''))))));
        if (!$want) bc_out(["success" => false, "message" => "اختار شخص واحد على الأقل."]);
        if (count($want) > 200) bc_out(["success" => false, "message" => "أقصى عدد 200 شخص — استخدم المجموعات للأكتر."]);
        $in = implode(',', array_fill(0, count($want), '?'));
        $st = $conn->prepare("SELECT username, is_admin FROM users WHERE COALESCE(archived, 0) = 0 AND LOWER(username) IN ($in)");
        $st->bind_param(str_repeat('s', count($want)), ...$want); $st->execute(); $res = $st->get_result();
        while ($x = $res->fetch_assoc()) {
            if (!$canSend && (int)$x['is_admin'] !== 1) bc_out(["success" => false, "message" => "الإرسال للمشتركين محتاج صلاحية «📢 إرسال رسالة لكل المستخدمين»."]);
            $b['to'][] = $x['username'];
        }
        $st->close();
        if (!$b['to']) bc_out(["success" => false, "message" => "الأشخاص دول مش موجودين."]);
    }
    return $b;
}
$action = $_POST['action'] ?? '';

if (!$isPost) {
    if (($_GET['action'] ?? '') === 'people') bc_out(["success" => true, "people" => bc_people($conn, mb_substr(trim((string)($_GET['q'] ?? '')), 0, 100), !$canSend)]);
    $view = in_array($_GET['view'] ?? '', ['sent', 'trash', 'inbox'], true) ? $_GET['view'] : 'sent';
    if ($view === 'trash' && !$isAdm) bc_out(["success" => false, "message" => "السلة للأدمن بس."]);
    $cols = "b.id, b.title, b.body, b.btn_label, b.btn_url, b.ch_app, b.ch_mail, b.audience, b.total, b.sent_app, b.sent_mail, b.status, b.created_by, b.created_at, b.finished_at, b.deleted_at, b.deleted_by";
    $toCol = ", (SELECT GROUP_CONCAT(r.email ORDER BY r.id SEPARATOR ',') FROM broadcast_recipients r WHERE r.broadcast_id = b.id) recips";
    if ($view === 'inbox') {   // اللي وصلني بالاسم أو كموظف (مجموعة الموظفين)
        $st = $conn->prepare("SELECT $cols $toCol FROM broadcasts b WHERE b.deleted = 0 AND b.created_by <> ? AND (EXISTS (SELECT 1 FROM broadcast_recipients r WHERE r.broadcast_id = b.id AND LOWER(r.email) = LOWER(?)) OR b.audience = 'staff') ORDER BY b.id DESC LIMIT 200");
        $st->bind_param("ss", $me, $me);
    } elseif ($isAdm) {
        $d = $view === 'trash' ? 1 : 0; $st = $conn->prepare("SELECT $cols $toCol FROM broadcasts b WHERE b.deleted = ? ORDER BY b.id DESC LIMIT 200"); $st->bind_param("i", $d);
    } else {   // الموظف بيشوف اللي بعته بس
        $st = $conn->prepare("SELECT $cols $toCol FROM broadcasts b WHERE b.deleted = 0 AND b.created_by = ? ORDER BY b.id DESC LIMIT 200"); $st->bind_param("s", $me);
    }
    $st->execute(); $res = $st->get_result(); $rows = []; while ($x = $res->fetch_assoc()) $rows[] = $x; $st->close();
    $aud = $canSend ? BC_AUD : array_intersect_key(BC_AUD, ['people' => 1, 'staff' => 1]);
    $cnt = []; foreach ($aud as $k => $l) $cnt[$k] = bc_count($conn, $k);
    $tr = 0; if ($isAdm) { $r = $conn->query("SELECT COUNT(*) FROM broadcasts WHERE deleted = 1"); $tr = $r ? (int)$r->fetch_row()[0] : 0; }
    bc_out(["success" => true, "view" => $view, "rows" => $rows, "audiences" => $aud, "counts" => $cnt, "canDelete" => $isAdm, "canSubs" => $canSend, "trashCount" => $tr, "me" => $me,
        "admin" => strtolower(ADMIN_EMAIL), "people" => bc_people($conn, '', !$canSend), "siteUrl" => MAIL_SITE_URL]);
}

if ($action === 'create') {
    $b = bc_input($conn, $canSend);
    if (!$b['ch_app'] && !$b['ch_mail']) bc_out(["success" => false, "message" => "اختار قناة واحدة على الأقل (إشعار أو إيميل)."]);
    $total = $b['audience'] === 'people' ? count($b['to']) : bc_count($conn, $b['audience']);
    if ($total === 0) bc_out(["success" => false, "message" => "مفيش مستخدمين في الفئة دي."]);
    $st = $conn->prepare("INSERT INTO broadcasts (title, body, btn_label, btn_url, ch_app, ch_mail, audience, total, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $st->bind_param("ssssiisis", $b['title'], $b['body'], $b['btn_label'], $b['btn_url'], $b['ch_app'], $b['ch_mail'], $b['audience'], $total, $me);
    $st->execute(); $id = $st->insert_id; $st->close();
    if ($b['to']) { $st = $conn->prepare("INSERT INTO broadcast_recipients (broadcast_id, email) VALUES (?, ?)"); foreach ($b['to'] as $e) { $st->bind_param("is", $id, $e); $st->execute(); } $st->close(); }
    bc_out(["success" => true, "id" => $id, "total" => $total]);
}
if ($action === 'batch') {
    $id = (int)($_POST['id'] ?? 0);
    $st = $conn->prepare("SELECT * FROM broadcasts WHERE id = ? AND deleted = 0"); $st->bind_param("i", $id); $st->execute(); $b = $st->get_result()->fetch_assoc(); $st->close();
    if (!$b) bc_out(["success" => false, "message" => "الرسالة مش موجودة."]);
    if (!$isAdm && strtolower((string)$b['created_by']) !== strtolower($me)) bc_out(["success" => false, "message" => "غير مصرح لك."]);
    if ($b['status'] === 'done') bc_out(["success" => true, "done" => true, "next" => (int)$b['last_uid'], "app" => (int)$b['sent_app'], "mail" => (int)$b['sent_mail'], "total" => (int)$b['total']]);
    $after = max((int)$b['last_uid'], (int)($_POST['after'] ?? 0));
    $st = $b['audience'] === 'people' ? $conn->prepare("SELECT r.id, r.email username, COALESCE((SELECT u.is_admin FROM users u WHERE LOWER(u.username) = LOWER(r.email) LIMIT 1), 0) is_admin FROM broadcast_recipients r WHERE r.broadcast_id = " . (int)$id . " AND r.id > ? ORDER BY r.id LIMIT 25")
        : $conn->prepare("SELECT u.id, u.username, u.is_admin FROM users u WHERE " . bc_where($b['audience']) . " AND u.id > ? ORDER BY u.id LIMIT 25");
    $st->bind_param("i", $after); $st->execute(); $res = $st->get_result(); $users = []; while ($x = $res->fetch_assoc()) $users[] = $x; $st->close();
    $app = 0; $mail = 0; $last = $after; $paras0 = bc_paras($b['body']); $btn = bc_button($b);
    $hasKind = false; try { $c = $conn->query("SHOW COLUMNS FROM user_alerts LIKE 'kind'"); $hasKind = $c && $c->num_rows > 0; } catch (Throwable $e) {}
    // البريد الداخلي: الموظف / الأدمن بيعرف الرسالة من مين
    $sender = $b['created_by'] ?? ''; $sp = bc_people($conn, (string)$sender, true, 1); $fromLine = '✉️ من: ' . ($sp && strtolower($sp[0]['email']) === strtolower($sender) ? $sp[0]['name'] . ' (' . $sender . ')' : $sender);
    foreach ($users as $u) {
        $last = (int)$u['id']; $email = (string)$u['username'];
        $internal = (int)($u['is_admin'] ?? 0) === 1;
        $paras = $internal ? array_merge([$fromLine], $paras0) : $paras0; $alertBody = mb_substr(($internal ? $fromLine . ' — ' : '') . implode(' ', $paras0), 0, 1000);
        if ((int)$b['ch_app'] === 1) { try {   // kind = 'bc' ← الإشعار بيظهر بشعار GRIFFINE
            $i = $hasKind ? $conn->prepare("INSERT INTO user_alerts (account_email, title, body, symbol, market, kind) VALUES (?, ?, ?, NULL, NULL, 'bc')") : $conn->prepare("INSERT INTO user_alerts (account_email, title, body, symbol, market) VALUES (?, ?, ?, NULL, NULL)");
            $i->bind_param("sss", $email, $b['title'], $alertBody); $i->execute(); $i->close(); $app++; } catch (Throwable $e) {} }
        if ((int)$b['ch_mail'] === 1) {
            $r = gm_safe(fn() => griffine_notify($conn, gm_customer_email($conn, $email), $b['title'], $b['title'], $paras, $btn, 'broadcast'));
            if (is_array($r) && !empty($r['ok'])) $mail++;
        }
    }
    $done = count($users) < 25;
    $st = $conn->prepare("UPDATE broadcasts SET sent_app = sent_app + ?, sent_mail = sent_mail + ?, last_uid = ?, status = IF(?, 'done', 'sending'), finished_at = IF(?, NOW(), finished_at) WHERE id = ?");
    $d = $done ? 1 : 0; $st->bind_param("iiiiii", $app, $mail, $last, $d, $d, $id); $st->execute(); $st->close();
    bc_out(["success" => true, "done" => $done, "next" => $last, "app" => (int)$b['sent_app'] + $app, "mail" => (int)$b['sent_mail'] + $mail, "total" => (int)$b['total']]);
}
if (in_array($action, ['trash', 'restore', 'purge', 'empty_trash'], true)) {
    if (!$isAdm) { http_response_code(403); bc_out(["success" => false, "message" => "المسح والاسترجاع للأدمن بس."]); }
    if ($action === 'empty_trash') { $conn->query("DELETE FROM broadcasts WHERE deleted = 1"); bc_out(["success" => true, "count" => $conn->affected_rows]); }
    $ids = array_values(array_filter(array_map('intval', explode(',', (string)($_POST['ids'] ?? ''))), fn($x) => $x > 0));
    if (!$ids || count($ids) > 500) bc_out(["success" => false, "message" => "اختار رسالة واحدة على الأقل."]);
    $in = implode(',', $ids);   // أرقام صحيحة بس (intval)
    if ($action === 'trash') { $st = $conn->prepare("UPDATE broadcasts SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id IN ($in)"); $st->bind_param("s", $me); $st->execute(); $n = $st->affected_rows; $st->close(); }
    elseif ($action === 'restore') { $conn->query("UPDATE broadcasts SET deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE deleted = 1 AND id IN ($in)"); $n = $conn->affected_rows; }
    else { $conn->query("DELETE FROM broadcasts WHERE deleted = 1 AND id IN ($in)"); $n = $conn->affected_rows; }
    bc_out(["success" => true, "count" => $n]);
}
bc_out(["success" => false, "message" => "طلب غير معروف."]);
?>
