<?php
/* =====================================================================
   GRIFFINE — ai_access_lib.php (الإصدار 127) — مين يستخدم الذكاء الاصطناعي المدفوع ومين يستخدم المحرك المجاني
   ---------------------------------------------------------------------
   - الافتراضي: «الذكاء الاصطناعي المدفوع» مقفول ← بصيرة وميزان المحفظة وميزان GRIFFINE شغالين لكل المشتركين
     بالمحرك الداخلي المجاني (مفيش أي طلب مدفوع بيطلع من الموقع حتى لو فيه مفتاح متسجّل)
   - لو الأدمن فعّله (ai_paid_on = 1) + فيه مفتاح: Claude بيشتغل للأدمن + مشتركين الباقة الشاملة للـ AI (includes_ai)
     + أي مشترك الأدمن فاتحله «المدفوع» يدويًا — والباقي بيكمّل بالمجاني
   - أي خطأ / رصيد خلص / الحد اليومي للمشترك اتعدّى ← المحرك المجاني تلقائي (من غير أي رسالة للمشترك)
   - قدام كل مشترك: تشغيل / إيقاف لكل شاشة من التلاتة (لو مقفولة الشاشة بتختفي عنده) + الحد اليومي للمدفوع (فاضي = مفتوح)
   ===================================================================== */
const AI_SCREENS = ['basira' => 'hide_basira_screen', 'mizan' => 'hide_mizan_screen', 'mizanai' => 'hide_mizanai_screen'];
const AI_ACCOUNT_DEFAULT = 'Top72026@gmail.com';

function ai_ready($conn){
    static $r = null; if ($r !== null) return $r;
    try { $x = $conn->query("SHOW TABLES LIKE 'user_ai_access'"); $r = $x && $x->num_rows > 0; } catch (Throwable $e) { $r = false; }
    return $r;
}
function ai_paid_on($conn){ return site_config_get($conn, 'ai_paid_on') === '1'; }
function ai_account($conn){ $a = site_config_get($conn, 'ai_account_email'); return $a !== '' ? $a : AI_ACCOUNT_DEFAULT; }

// المستخدم الحالي (بيتحدد في أول كل API: بصيرة / ميزان / ميزان GRIFFINE)
function ai_set_user($email, $isAdmin){ $GLOBALS['GRIFFINE_AI_USER'] = ['email' => strtolower((string)$email), 'admin' => (bool)$isAdmin]; }
function ai_user(){ return $GLOBALS['GRIFFINE_AI_USER'] ?? ['email' => '', 'admin' => false]; }

function ai_get($conn, $email){
    $d = ['basira' => true, 'mizan' => true, 'mizanai' => true, 'paid' => null, 'limit' => null, 'used' => 0];
    if (!$email || !ai_ready($conn)) return $d;
    $st = $conn->prepare("SELECT basira, mizan, mizanai, paid, daily_limit, used_day, used_count FROM user_ai_access WHERE account_email = ?");
    $e = strtolower($email); $st->bind_param("s", $e); $st->execute(); $r = $st->get_result()->fetch_assoc(); $st->close();
    if (!$r) return $d;
    return ['basira' => (int)$r['basira'] === 1, 'mizan' => (int)$r['mizan'] === 1, 'mizanai' => (int)$r['mizanai'] === 1,
        'paid' => $r['paid'] === null ? null : (int)$r['paid'] === 1, 'limit' => $r['daily_limit'] === null ? null : (int)$r['daily_limit'],
        'used' => ($r['used_day'] === gmdate('Y-m-d')) ? (int)$r['used_count'] : 0];
}
function ai_set($conn, $email, $field, $value){
    if (!ai_ready($conn) || !in_array($field, ['basira', 'mizan', 'mizanai', 'paid', 'daily_limit'], true)) return false;
    $e = strtolower($email);
    $st = $conn->prepare("INSERT INTO user_ai_access (account_email) VALUES (?) ON DUPLICATE KEY UPDATE account_email = account_email"); $st->bind_param("s", $e); $st->execute(); $st->close();
    if (($field === 'paid' || $field === 'daily_limit') && ($value === null || $value === '')) { $u = $conn->prepare("UPDATE user_ai_access SET `$field` = NULL WHERE account_email = ?"); $u->bind_param("s", $e); }
    else { $v = $field === 'daily_limit' ? max(0, min(1000, (int)$value)) : ($value ? 1 : 0); $u = $conn->prepare("UPDATE user_ai_access SET `$field` = ? WHERE account_email = ?"); $u->bind_param("is", $v, $e); }
    $u->execute(); $u->close();
    return true;
}
// الشاشة مسموحة للمشترك؟ (الأدمن دايمًا)
function ai_screen_ok($conn, $email, $screen, $isAdmin = false){
    if ($isAdmin || !$email) return true;
    $p = ai_get($conn, $email); return !isset($p[$screen]) || $p[$screen];
}
// الإعدادات اللي بتروح للمتصفح: الشاشة المقفولة لمشترك بعينه بتتعامل كأنها مخفية
function ai_merge_hidden($conn, $email, $settings){
    if (!$email || !ai_ready($conn)) return $settings;
    $p = ai_get($conn, $email);
    foreach (AI_SCREENS as $k => $h) if (!$p[$k]) $settings[$h] = true;
    return $settings;
}
// عنده الباقة الشاملة للذكاء الاصطناعي (اشتراك نشط)؟
function ai_has_pro($conn, $email){
    static $c = []; $e = strtolower($email); if (isset($c[$e])) return $c[$e];
    $ok = false;
    if (!function_exists('perk_has') && is_file(__DIR__ . '/perks_lib.php')) require_once __DIR__ . '/perks_lib.php';
    if (function_exists('perk_has') && perk_has_col($conn)) { try { return $c[$e] = perk_has($conn, $e, 'ai_pro'); } catch (Throwable $e3) {} }   // الإصدار 135: «الذكاء المتقدم» ميزة في الباقة
    try {
        $st = $conn->prepare("SELECT 1 FROM subscribers s JOIN subscription_plans p ON p.id = s.plan_id WHERE LOWER(s.account_email) = ? AND s.active = 1 AND COALESCE(s.archived, 0) = 0 AND s.end_date >= CURDATE() AND p.includes_ai = 1 LIMIT 1");
        $st->bind_param("s", $e); $st->execute(); $ok = (bool)$st->get_result()->fetch_row(); $st->close();
    } catch (Throwable $e2) { $ok = false; }
    return $c[$e] = $ok;
}
/* المفتاح المدفوع للمستخدم الحالي — أو '' (يعني المحرك المجاني)
   الشروط: المدفوع مفعّل + فيه مفتاح + (أدمن أو باقة شاملة AI أو مفتوحله يدويًا) + لسه تحت حده اليومي */
function ai_paid_key($conn){
    if (!ai_paid_on($conn)) return '';
    $key = site_config_get($conn, 'basira_ai_key'); if ($key === '') return '';
    $u = ai_user(); if ($u['email'] === '') return '';
    if ($u['admin']) return $key;
    $p = ai_get($conn, $u['email']);
    $allowed = $p['paid'] === true || ($p['paid'] === null && ai_has_pro($conn, $u['email']));
    if (!$allowed) return '';
    if ($p['limit'] !== null && $p['used'] >= $p['limit']) return '';
    return $key;
}
// طلب مدفوع نجح ← عدّاد اليوم للمشترك
function ai_count_use($conn){
    $u = ai_user(); if ($u['email'] === '' || !ai_ready($conn)) return;
    $d = gmdate('Y-m-d'); $e = $u['email'];
    $st = $conn->prepare("INSERT INTO user_ai_access (account_email, used_day, used_count) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE used_count = IF(used_day = VALUES(used_day), used_count + 1, 1), used_day = VALUES(used_day)");
    $st->bind_param("ss", $e, $d); $st->execute(); $st->close();
}
// مستوى الخدمة الحالي (جزء من مفتاح التخزين المؤقت: المدفوع والمجاني ميتخلطوش)
function ai_tier($conn){ return ai_paid_key($conn) !== '' ? 'p' : 'f'; }
?>
