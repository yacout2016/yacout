<?php
/* =====================================================================
   GRIFFINE — domain_notice.php (الإصدار 153) — «📢 إبلاغ كل المستخدمين بالرابط الجديد»
   الموقع اتنقل من الدومين القديم لـ www.griffine.app — الزرار ده بيبعت لكل مستخدم (مش مؤرشف):
     إشعار جوه الموقع (الجرس) + إيميل فيه الرابط الجديد وطلب تسجيل الدخول من جديد
   GET              ← عدد المستخدمين + هل اتبعت قبل كده (إمتى / مين / كام)
   POST action=send&after=<آخر id>  ← بيبعت على دفعات (25 مستخدم كل طلب) والصفحة بتكمّل لوحدها لحد ما يخلص
   الصلاحية: الإعدادات الإلزامية (manage_admin_settings)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/security_lib.php';
require_once __DIR__ . '/mailer.php';
function dn_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit(); }
if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) { http_response_code(403); dn_out(["success" => false, "message" => "غير مصرح لك."]); }
requirePermission($conn, 'manage_admin_settings');
$me = $_SESSION['user_email'];
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
if ($isPost) requireCsrf();
session_write_close();

const DN_URL = 'https://www.griffine.app';
function dn_state($conn){
    $v = null; try { $r = $conn->query("SELECT config_value FROM site_config WHERE config_key = 'domain_notice'"); if ($r && ($x = $r->fetch_row())) $v = json_decode((string)$x[0], true); } catch (Throwable $e) {}
    return is_array($v) ? $v : null;
}
function dn_save($conn, $v, $me){
    $j = json_encode($v, JSON_UNESCAPED_UNICODE);
    $st = $conn->prepare("INSERT INTO site_config (config_key, config_value, updated_by) VALUES ('domain_notice', ?, ?) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_by = VALUES(updated_by)");
    $st->bind_param("ss", $j, $me); $st->execute(); $st->close();
}
$total = 0; try { $r = $conn->query("SELECT COUNT(*) FROM users WHERE COALESCE(archived, 0) = 0"); $total = $r ? (int)$r->fetch_row()[0] : 0; } catch (Throwable $e) {}

if (!$isPost) dn_out(["success" => true, "total" => $total, "url" => DN_URL, "last" => dn_state($conn)]);
if (($_POST['action'] ?? '') !== 'send') dn_out(["success" => false, "message" => "طلب غير معروف."]);

$after = max(0, (int)($_POST['after'] ?? 0));
$title = '🌐 GRIFFINE اتنقل لرابط جديد';
$body = 'رابط الموقع الجديد: www.griffine.app — افتحه وسجّل دخولك من جديد بنفس الإيميل وكلمة السر. حسابك وخططك وكل بياناتك زي ما هي.';
$st = $conn->prepare("SELECT id, username FROM users WHERE COALESCE(archived, 0) = 0 AND id > ? ORDER BY id LIMIT 25");
$st->bind_param("i", $after); $st->execute(); $res = $st->get_result(); $users = []; while ($x = $res->fetch_assoc()) $users[] = $x; $st->close();
$app = 0; $mail = 0; $last = $after;
foreach ($users as $u) {
    $last = (int)$u['id']; $email = (string)$u['username'];
    try { $i = $conn->prepare("INSERT INTO user_alerts (account_email, title, body, symbol, market) VALUES (?, ?, ?, NULL, NULL)"); $i->bind_param("sss", $email, $title, $body); $i->execute(); $i->close(); $app++; } catch (Throwable $e) {}
    $ok = gm_safe(function() use ($conn, $email, $title){
        return griffine_notify($conn, gm_customer_email($conn, $email), 'GRIFFINE اتنقل لرابط جديد: www.griffine.app', $title,
            ['أهلًا بيك،', 'منصة GRIFFINE اتنقلت لرابط جديد: www.griffine.app', 'افتح الرابط الجديد وسجّل دخولك من جديد بنفس الإيميل وكلمة السر — حسابك وخططك وكل بياناتك زي ما هي.', 'لو كنت مثبّت التطبيق على الموبايل، احذفه وثبّته تاني من الرابط الجديد.'],
            ['label' => 'افتح www.griffine.app', 'url' => DN_URL . '/index.php'], 'domain_notice');
    });
    if (is_array($ok) && !empty($ok['ok'])) $mail++;
}
$done = count($users) < 25;
$s = ($after === 0 || !($cur = dn_state($conn)) || empty($cur['running'])) ? ['app' => 0, 'mail' => 0] : $cur;
$s['app'] = (int)($s['app'] ?? 0) + $app; $s['mail'] = (int)($s['mail'] ?? 0) + $mail;
$s['running'] = !$done; $s['by'] = $me; $s['at'] = date('Y-m-d H:i'); $s['total'] = $total;
dn_save($conn, $s, $me);
dn_out(["success" => true, "done" => $done, "next" => $last, "batch" => count($users), "app" => $s['app'], "mail" => $s['mail'], "total" => $total]);
?>
