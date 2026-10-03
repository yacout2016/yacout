<?php
/* =====================================================================
   GRIFFINE — track.php (الإصدار 151) — تحليلات الزوار (من غير أي خدمة خارجية ومن غير تكلفة)
   POST ev (pv / err / slow / miss) + screen + src + vid + ms + x  ← بيتسجل في site_events
   - مفيش أي بيانات شخصية: معرّف عشوائي للجهاز (vid) + نوع الجهاز والمتصفح والبلد (من لغة المتصفح)
   - الأدمن والموظفين مش بيتحسبوا. أقصى 300 طلب في الدقيقة لكل جهاز. البيانات بتتمسح بعد 90 يوم.
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/session_boot.php';
session_start();
$isAdmin = !empty($_SESSION['is_admin']); $email = $_SESSION['user_email'] ?? null;
session_write_close();
include 'db.php';
require_once __DIR__ . '/rate_lib.php'; rate_guard($conn, 'trk', 300);
require_once __DIR__ . '/rd_lib.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || $isAdmin) { echo '{"success":true}'; exit(); }
rd_ready($conn);
$ev = (string)($_POST['ev'] ?? '');
if (!in_array($ev, ['pv', 'err', 'slow', 'miss', 'sig'], true)) { echo '{"success":false}'; exit(); }
$clip = fn($k, $n) => mb_substr(trim(preg_replace('/[\x00-\x1F]/u', ' ', (string)($_POST[$k] ?? ''))), 0, $n);
$vid = preg_replace('/[^a-z0-9_]/i', '', $clip('vid', 40)) ?: 'anon';
$scr = preg_replace('/[^A-Za-z0-9_:\-]/', '', $clip('screen', 60));
$src = preg_replace('/[^a-z0-9_\-.]/i', '', strtolower($clip('src', 40))) ?: 'direct';
$ms = max(0, min(600000, (int)($_POST['ms'] ?? 0)));
$x = $clip('x', 200);
$ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
$d = rd_device($ua); $br = rd_browser($ua); $os = rd_os($ua); $cty = rd_country();
$logged = $email ? 1 : 0;
$st = $conn->prepare("INSERT INTO site_events (day, ev, vid, screen, src, device, browser, os, country, logged, ms, x) VALUES (CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
$st->bind_param("ssssssssiis", $ev, $vid, $scr, $src, $d, $br, $os, $cty, $logged, $ms, $x); $st->execute(); $st->close();
if (mt_rand(1, 400) === 1) $conn->query("DELETE FROM site_events WHERE day < CURDATE() - INTERVAL 90 DAY");
echo '{"success":true}';
?>
