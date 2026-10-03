<?php
/* =====================================================================
   GRIFFINE — mkt_api.php (الإصدار 152) — لوحة التحكم ← «📣 التسويق» (من غير ذكاء اصطناعي ومن غير تكلفة)
   GET  ?action=get&days=7|30|90 ← الإعدادات (روابط الحسابات بس — مفيش كلمات سر) + كل البنود + أداء كل منصة/حملة
                                    + «📝 مطلوب منك» (مهام بقواعد ثابتة)
   POST save_cfg / add (post|task) / update (حالة / تاريخ) / del
   كل حاجة بتتسجل بتاريخها (سجل النشاط) — الجدول mkt_items بيتعمل لوحده
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/security_lib.php';
require_once __DIR__ . '/rd_lib.php';
function mk_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit(); }
if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) { http_response_code(403); mk_out(["success" => false, "message" => "غير مصرح لك."]); }
$perms = getCurrentUserPermissions($conn);
if (!in_array('manage_admin_settings', $perms, true) && !in_array('manage_plans', $perms, true)) { http_response_code(403); mk_out(["success" => false, "message" => "غير مصرح لك."]); }
$me = $_SESSION['user_email'];
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
if ($isPost) requireCsrf();
session_write_close();
rd_ready($conn);
$conn->query("CREATE TABLE IF NOT EXISTS mkt_items (id INT AUTO_INCREMENT PRIMARY KEY, kind VARCHAR(10) NOT NULL, platform VARCHAR(20) NOT NULL DEFAULT '', title VARCHAR(200) NOT NULL,
    body TEXT NULL, campaign VARCHAR(40) NOT NULL DEFAULT '', status VARCHAR(12) NOT NULL DEFAULT 'todo', due DATE NULL, url VARCHAR(300) NOT NULL DEFAULT '', auto_key VARCHAR(60) NULL,
    created_by VARCHAR(190) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, done_at DATETIME NULL, UNIQUE KEY ux_auto (auto_key)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
const MK_PLATFORMS = ['tiktok', 'facebook', 'instagram', 'whatsapp', 'youtube', 'x', 'other'];
function mk_cfg($conn){
    $v = null; try { $r = $conn->query("SELECT config_value FROM site_config WHERE config_key = 'mkt_cfg'"); if ($r && ($x = $r->fetch_row())) $v = json_decode((string)$x[0], true); } catch (Throwable $e) {}
    return is_array($v) ? $v : ['links' => []];
}
$action = $_GET['action'] ?? $_POST['action'] ?? 'get';
$clip = fn($k, $n) => mb_substr(trim((string)($_POST[$k] ?? '')), 0, $n);

if ($isPost && $action === 'save_cfg') {
    $links = [];
    foreach (MK_PLATFORMS as $p) { $u = $clip('link_' . $p, 300); if ($u !== '' && preg_match('#^https?://#i', $u)) $links[$p] = $u; }
    $v = json_encode(['links' => $links], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $st = $conn->prepare("INSERT INTO site_config (config_key, config_value, updated_by) VALUES ('mkt_cfg', ?, ?) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_by = VALUES(updated_by)");
    $st->bind_param("ss", $v, $me); $st->execute(); $st->close();
    mk_out(["success" => true, "message" => "✅ اتحفظت روابط الحسابات."]);
}
if ($isPost && $action === 'add') {
    $kind = in_array($_POST['kind'] ?? '', ['post', 'task'], true) ? $_POST['kind'] : 'post';
    $pf = in_array($_POST['platform'] ?? '', MK_PLATFORMS, true) ? $_POST['platform'] : '';
    $t = $clip('title', 200); if ($t === '') mk_out(["success" => false, "message" => "اكتب العنوان."]);
    $b = $clip('body', 5000); $cmp = preg_replace('/[^a-z0-9_\-]/', '', strtolower($clip('campaign', 40)));
    $due = preg_match('/^\d{4}-\d{2}-\d{2}$/', $_POST['due'] ?? '') ? $_POST['due'] : null; $st0 = in_array($_POST['status'] ?? '', ['todo', 'scheduled', 'done'], true) ? $_POST['status'] : 'todo';
    $st = $conn->prepare("INSERT INTO mkt_items (kind, platform, title, body, campaign, status, due, created_by, done_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, IF(? = 'done', NOW(), NULL))");
    $st->bind_param("sssssssss", $kind, $pf, $t, $b, $cmp, $st0, $due, $me, $st0); $st->execute(); $id = $st->insert_id; $st->close();
    mk_out(["success" => true, "id" => $id, "message" => $kind === 'task' ? '✅ اتضافت المهمة' : '✅ اتحفظ البوست في الجدول']);
}
if ($isPost && $action === 'update') {
    $id = (int)($_POST['id'] ?? 0); $s = $_POST['status'] ?? '';
    if (!in_array($s, ['todo', 'scheduled', 'done'], true)) mk_out(["success" => false, "message" => "حالة غير صحيحة."]);
    $url = $clip('url', 300); if ($url !== '' && !preg_match('#^https?://#i', $url)) $url = '';
    $st = $conn->prepare("UPDATE mkt_items SET status = ?, done_at = IF(? = 'done', COALESCE(done_at, NOW()), NULL), url = IF(? <> '', ?, url) WHERE id = ?");
    $st->bind_param("ssssi", $s, $s, $url, $url, $id); $st->execute(); $st->close();
    mk_out(["success" => true]);
}
if ($isPost && $action === 'del') {
    $id = (int)($_POST['id'] ?? 0); $st = $conn->prepare("DELETE FROM mkt_items WHERE id = ?"); $st->bind_param("i", $id); $st->execute(); $st->close();
    mk_out(["success" => true]);
}
if ($action !== 'get') mk_out(["success" => false, "message" => "طلب غير معروف."]);

$days = (int)($_GET['days'] ?? 30); if (!in_array($days, [7, 30, 90], true)) $days = 30;
$from = date('Y-m-d', strtotime('-' . ($days - 1) . ' days'));
$rows = function($sql, $types = '', ...$a) use ($conn){ $st = $conn->prepare($sql); if ($types) $st->bind_param($types, ...$a); $st->execute(); $r = $st->get_result(); $o = []; while ($x = $r->fetch_assoc()) $o[] = $x; $st->close(); return $o; };
// أداء كل مصدر / حملة: زوار + تسجيلات (من track.php: ev = sig)
$perf = $rows("SELECT src k, COUNT(DISTINCT IF(ev = 'pv', vid, NULL)) v, COUNT(DISTINCT IF(ev = 'sig', vid, NULL)) s FROM site_events WHERE day >= ? AND ev IN ('pv', 'sig') GROUP BY src ORDER BY v DESC LIMIT 30", "s", $from);
$weekly = $rows("SELECT YEARWEEK(day, 6) w, MIN(day) d, COUNT(DISTINCT IF(ev = 'pv', vid, NULL)) v, COUNT(DISTINCT IF(ev = 'sig', vid, NULL)) s FROM site_events WHERE day >= ? GROUP BY YEARWEEK(day, 6) ORDER BY w", "s", date('Y-m-d', strtotime('-83 days')));
$items = $rows("SELECT id, kind, platform, title, body, campaign, status, due, url, auto_key, created_by, created_at, done_at FROM mkt_items ORDER BY (status = 'done'), COALESCE(due, DATE(created_at)) DESC, id DESC LIMIT 300");
$postsDone7 = 0; foreach ($items as $x) if ($x['kind'] === 'post' && $x['status'] === 'done' && $x['done_at'] && strtotime($x['done_at']) >= strtotime('-7 days')) $postsDone7++;
$cfg = mk_cfg($conn);

// ===== «📝 مطلوب منك» — مهام بقواعد ثابتة (بتتضاف مرة لكل أسبوع / حالة) =====
$wk = date('o-W');
$auto = function($key, $title, $body, $pf = '') use ($conn, $me){
    $st = $conn->prepare("INSERT IGNORE INTO mkt_items (kind, platform, title, body, status, due, auto_key, created_by) VALUES ('task', ?, ?, ?, 'todo', CURDATE(), ?, 'المسوّق الآلي')");
    $st->bind_param("ssss", $pf, $title, $body, $key); $st->execute(); $st->close();
};
foreach (['tiktok' => 'تيك توك', 'facebook' => 'فيسبوك', 'instagram' => 'إنستجرام'] as $p => $nm)
    if (empty($cfg['links'][$p])) $auto("link-$p", "ضيف رابط حسابك على $nm", "عشان التقارير والروابط تبقى كاملة (الرابط بس — مفيش كلمة سر).", $p);
if ($postsDone7 < 3) $auto("posts-$wk", 'انشر 3 بوستات على الأقل الأسبوع ده', 'استخدم «✨ اقترح محتوى» وعلّم على البوست «اتنشر» بعد ما تنشره — الانتظام أهم من الكمية.');
$auto("reply-$wk", 'رد على كل التعليقات والرسائل خلال 24 ساعة', 'الرد السريع بيرفع الوصول والثقة على كل المنصات.');
$auto("story-$wk", 'ستوري يومي (إنستجرام / فيسبوك) بلقطة من الموقع', 'سعر سهم النهارده، أو فرصة من البحث عن فرص، أو سؤال للمتابعين.', 'instagram');
$best = null; foreach ($perf as $x) if ($x['k'] !== 'direct' && (int)$x['v'] >= 10 && (!$best || (int)$x['v'] > (int)$best['v'])) $best = $x;
if ($best) $auto("best-$wk-" . $best['k'], "ركّز على «{$best['k']}» — جايب أكتر زوار ({$best['v']})", 'زوّد عدد البوستات هناك وجرّب إعلان صغير (100-200 جنيه) على أحسن بوست.');
foreach ($perf as $x) if ($x['k'] !== 'direct' && (int)$x['v'] >= 20 && (int)$x['s'] === 0)
    $auto("conv-$wk-" . $x['k'], "«{$x['k']}» جايب زوار ومفيش تسجيلات", 'غيّر الدعوة للفعل في البوستات: «ابدأ مجانًا 20 يوم» + رابط مباشر لشاشة التسجيل.');
$reviews = 0; try { $r = $conn->query("SELECT COUNT(*) FROM testimonials WHERE COALESCE(approved, 1) = 1"); $reviews = $r ? (int)$r->fetch_row()[0] : 0; } catch (Throwable $e) {}
if ($reviews < 4) $auto("reviews-$wk", 'اطلب من 3 مشتركين يكتبوا رأيهم في الموقع', 'آراء العملاء الحقيقية بتظهر في الصفحة العامة وبترفع التسجيل.');
$items = $rows("SELECT id, kind, platform, title, body, campaign, status, due, url, auto_key, created_by, created_at, done_at FROM mkt_items ORDER BY (status = 'done'), COALESCE(due, DATE(created_at)) DESC, id DESC LIMIT 300");

mk_out(["success" => true, "days" => $days, "cfg" => $cfg, "items" => $items, "perf" => $perf, "weekly" => $weekly, "postsDone7" => $postsDone7]);
?>
