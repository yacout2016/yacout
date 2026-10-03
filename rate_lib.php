<?php
/* =====================================================================
   GRIFFINE — rate_lib.php (الإصدار 150) — حماية من سحب البيانات بالبوتات
   ---------------------------------------------------------------------
   حد أقصى لعدد الطلبات من نفس الجهاز (IP) في الدقيقة على الملفات اللي بترجّع بيانات (أسعار / مسح / تحليلات).
   الأرقام واسعة جدًا على المستخدم العادي (حتى مسح السوق كله)، وبتوقف البوتات اللي بتسحب آلاف الطلبات.
   الأدمن والموظفين مستثنيين. الجدول: rate_limits (بيتعمل لوحده لو مش موجود).
   ===================================================================== */
function rate_ready($conn){
    static $ok = null; if ($ok !== null) return $ok;
    try { $conn->query("CREATE TABLE IF NOT EXISTS rate_limits (k VARCHAR(100) NOT NULL PRIMARY KEY, n INT NOT NULL DEFAULT 0, win INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); $ok = true; }
    catch (Throwable $e) { $ok = false; }
    return $ok;
}
// بيرجع true لو مسموح، وغير كده بيرد 429 ويقفل الطلب
function rate_guard($conn, $bucket, $max = 240, $win = 60){
    if (!empty($_SESSION['is_admin'])) return true;
    if (!$conn || !rate_ready($conn)) return true;
    $ip = function_exists('clientIp') ? clientIp() : substr($_SERVER['REMOTE_ADDR'] ?? '0', 0, 45);
    $slot = (int)floor(time() / $win);
    $k = substr($bucket . '|' . $ip, 0, 100);
    try {
        $st = $conn->prepare("INSERT INTO rate_limits (k, n, win) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE n = IF(win = VALUES(win), n + 1, 1), win = VALUES(win)");
        $st->bind_param("si", $k, $slot); $st->execute(); $st->close();
        $st = $conn->prepare("SELECT n FROM rate_limits WHERE k = ?"); $st->bind_param("s", $k); $st->execute();
        $n = (int)(($st->get_result()->fetch_row() ?: [0])[0]); $st->close();
        if (mt_rand(1, 500) === 1) $conn->query("DELETE FROM rate_limits WHERE win < " . ($slot - 5));   // تنضيف خفيف
        if ($n > $max) {
            http_response_code(429); header('Retry-After: ' . $win); header('Content-Type: application/json; charset=utf-8');
            echo json_encode(["success" => false, "rateLimited" => true, "message" => "طلبات كتير جدًا في وقت قصير — استنى دقيقة وجرّب تاني."], JSON_UNESCAPED_UNICODE);
            exit();
        }
    } catch (Throwable $e) {}
    return true;
}
?>
