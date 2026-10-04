<?php
/* =====================================================================
   GRIFFINE — seo_api.php (الإصدار 157) — لوحة التحكم ← «🔎 الظهور في جوجل»
   GET  ← الإعدادات الحالية (عنوان البحث + التعريف + أكواد التحقق من Google / Bing)
   POST action=save ← بيحفظ في site_config (seo_cfg) + ملف صغير griffine_seo.json بيقراه index.php من غير قاعدة البيانات
   الصلاحية: الإعدادات الإلزامية أو تعديل تصميم الموقع
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/security_lib.php';
function seo_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit(); }
if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) { http_response_code(403); seo_out(["success" => false, "message" => "غير مصرح لك."]); }
$perms = getCurrentUserPermissions($conn);
if (!in_array('manage_admin_settings', $perms, true) && !in_array('edit_site_design', $perms, true)) { http_response_code(403); seo_out(["success" => false, "message" => "غير مصرح لك."]); }
$me = $_SESSION['user_email'];
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
if ($isPost) requireCsrf();
session_write_close();

// نفس المسار اللي بيقراه index.php (برا public_html لو ينفع)
function seo_cache_path(){ $d = dirname(__DIR__); return (is_dir($d) && is_writable($d)) ? $d . '/griffine_seo.json' : __DIR__ . '/griffine_seo.json'; }
function seo_get($conn){
    $v = null; try { $r = $conn->query("SELECT config_value FROM site_config WHERE config_key = 'seo_cfg'"); if ($r && ($x = $r->fetch_row())) $v = json_decode((string)$x[0], true); } catch (Throwable $e) {}
    return is_array($v) ? $v : [];
}
// بيقبل الكود لوحده أو الـ meta tag كله (بياخد content="...")
function seo_code($s){
    $s = trim((string)$s);
    if (preg_match('/content\s*=\s*["\']([^"\']+)["\']/i', $s, $m)) $s = $m[1];
    return preg_match('/^[A-Za-z0-9_\-]{10,100}$/', $s) ? $s : '';
}

if (!$isPost) {
    $c = seo_get($conn);
    seo_out(["success" => true, "cfg" => $c, "site" => 'https://www.griffine.app', "cacheOk" => is_file(seo_cache_path())]);
}
if (($_POST['action'] ?? '') !== 'save') seo_out(["success" => false, "message" => "طلب غير معروف."]);

$clip = fn($k, $n) => trim(preg_replace('/\s+/u', ' ', mb_substr((string)($_POST[$k] ?? ''), 0, $n)));
$gIn = trim((string)($_POST['google'] ?? '')); $bIn = trim((string)($_POST['bing'] ?? ''));
$c = ['title' => $clip('title', 90), 'desc' => $clip('desc', 300), 'google' => seo_code($gIn), 'bing' => seo_code($bIn), 'at' => date('Y-m-d H:i'), 'by' => $me];
if ($gIn !== '' && $c['google'] === '') seo_out(["success" => false, "message" => "كود جوجل مش مظبوط — انسخ الـ meta tag كله أو الكود اللي جوه content."]);
if ($bIn !== '' && $c['bing'] === '') seo_out(["success" => false, "message" => "كود Bing مش مظبوط — انسخ الـ meta tag كله أو الكود اللي جوه content."]);
$j = json_encode($c, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$st = $conn->prepare("INSERT INTO site_config (config_key, config_value, updated_by) VALUES ('seo_cfg', ?, ?) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_by = VALUES(updated_by)");
$st->bind_param("ss", $j, $me); $st->execute(); $st->close();
$ok = @file_put_contents(seo_cache_path(), $j, LOCK_EX) !== false;
seo_out(["success" => true, "cfg" => $c, "message" => $ok ? "✅ اتحفظ — هيظهر في الصفحة الرئيسية على طول." : "اتحفظ في قاعدة البيانات، بس السيرفر رفض كتابة الملف — كلّم الدعم."]);
?>
