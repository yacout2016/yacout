<?php
/* =====================================================================
   GRIFFINE — symbols_lib.php (الإصدار 98) — حذف الأسهم المكتوبة غلط نهائيًا
   ---------------------------------------------------------------------
   أي رمز سهم في خطط المستخدمين (تعزيز المتوسط / خطوط الشبكة) أو قائمة المتابعة أو تنبيهات الأسعار
   مش موجود في البورصة ← بيتمسح نهائي هو وخطته وصفقاته وإشعاراته (مفيش سلة محذوفات)
   ماعدا الخطط اللي صاحبها اختار إنها "سهم غير مدرج في البورصة" (listed = false) - دي مبتتفحصش ومفيش عليها إشعارات
   والرمز بيتسجّل في symbol_checks كممنوع فمبيرجعش تاني لو جهاز قديم حفظ الخطط.
   - sym_clean($conn, 'now')  : من زرار مدير الموقع ← حذف فوري لكل رمز مش موجود
   - sym_clean($conn, 'auto') : تلقائي (Cron + فتح لوحة التحكم) كل 6 ساعات ← الرمز لازم يفشل
                                في فحصين بينهم 6 ساعات على الأقل قبل الحذف (عشان سهم موقوف مؤقتًا أو خطأ عابر)
   حماية: قبل أي حذف بنتأكد إن مصدر الأسعار شغال لكل سوق (سهم مرجعي) - لو واقع مفيش حذف خالص.
   ===================================================================== */
require_once __DIR__ . '/quote_lib.php';

const SYM_REF = ['مصر' => 'COMI', 'السعودية' => '2222', 'الإمارات' => 'EMAAR', 'قطر' => 'QNBK', 'الكويت' => 'NBK'];

function sym_ready($conn){
    static $r = null; if ($r !== null) return $r;
    try { $x = $conn->query("SHOW TABLES LIKE 'symbol_checks'"); $r = $x && $x->num_rows > 0; } catch (Throwable $e) { $r = false; }
    return $r;
}
function sym_market($m){ return isset(MQ_MARKETS[$m]) ? $m : 'مصر'; }
// الرمز موجود في البورصة؟ (الرمز نفسه، أو من غير رقم في الآخر لو خطتين لنفس السهم زي CRVX-2)
function sym_valid($sym, $mkt){
    $raw = strtoupper(trim((string)$sym));
    $cands = [$raw]; $base = preg_replace('/[\s\-_]*\d+$/', '', $raw); if ($base !== '' && $base !== $raw) $cands[] = $base;
    foreach ($cands as $c) {
        if (!preg_match('/^[A-Z0-9.\-]{1,20}$/', $c)) continue;
        $q = mq_get_quote($c, $mkt, 'day');
        if (!empty($q['success']) && is_numeric($q['last'] ?? null) && (float)$q['last'] > 0) return true;
    }
    return false;
}
// الرموز الممنوعة (اتمسحت قبل كده) - plans_save بيرفض يرجّعها
function sym_banned_set($conn){
    static $set = null; if ($set !== null) return $set;
    $set = [];
    if (!sym_ready($conn)) return $set;
    $res = $conn->query("SELECT symbol, market FROM symbol_checks WHERE banned = 1");
    while ($r = $res->fetch_assoc()) $set[strtoupper($r['symbol']) . '|' . $r['market']] = true;
    return $set;
}
function sym_is_banned($conn, $sym, $mkt){ $s = sym_banned_set($conn); return isset($s[strtoupper((string)$sym) . '|' . sym_market($mkt)]); }

// حذف نهائي لكل حاجة مرتبطة برمز غلط عند حساب معيّن (أو كل الحسابات لو $email = null)
function sym_purge($conn, $sym, $mkt, $email = null, $userPlanIds = []){
    $n = 0;
    foreach ($userPlanIds as $id) { $d = $conn->prepare("DELETE FROM user_plans WHERE id = ?"); $d->bind_param("i", $id); $d->execute(); $n += $d->affected_rows; $d->close(); }
    $w = $email !== null ? " AND account_email = ?" : "";
    foreach (['plan_trades' => "symbol = ?", 'alert_targets' => "symbol = ? AND market = ?", 'user_alerts' => "symbol = ? AND (market = ? OR market IS NULL)",
              'user_watchlist' => "symbol = ? AND market = ?", 'custom_alerts' => "symbol = ? AND market = ?"] as $table => $cond) {
        try {
            $x = $conn->query("SHOW TABLES LIKE '$table'"); if (!$x || !$x->num_rows) continue;
            $args = [$sym]; $types = 's';
            if (strpos($cond, 'market') !== false) { $args[] = $mkt; $types .= 's'; }
            if ($email !== null) { $args[] = $email; $types .= 's'; }
            $d = $conn->prepare("DELETE FROM `$table` WHERE $cond$w"); $d->bind_param($types, ...$args); $d->execute(); $d->close();
        } catch (Throwable $e) { error_log("GRIFFINE sym_purge $table: " . $e->getMessage()); }
    }
    return $n;
}

/* الفحص والحذف. يرجّع ['success', 'deleted' => [...], 'waiting' => [...], 'message'] */
function sym_clean($conn, $mode = 'auto'){
    @set_time_limit(300);
    if (!sym_ready($conn)) return ["success" => false, "message" => "شغّل ALL_SCHEMA_UPDATES.sql (الإصدار 98) أولًا."];
    // كل الرموز: الخطط + قائمة المتابعة + تنبيهات الأسعار
    $plans = []; $pairs = [];
    $res = $conn->query("SELECT id, account_email, plan_type, symbol, data_value FROM user_plans WHERE plan_type IN ('plans', 'grid_plans') LIMIT 10000");
    while ($r = $res->fetch_assoc()) {
        $d = json_decode((string)$r['data_value'], true); $m = sym_market(is_array($d) ? ($d['market'] ?? '') : '');
        if (is_array($d) && array_key_exists('listed', $d) && $d['listed'] === false) continue;   // سهم غير مدرج اختاره المستخدم بنفسه ← مبيتفحصش ومبيتمسحش
        $k = strtoupper($r['symbol']) . '|' . $m; $plans[$k][] = $r; $pairs[$k] = [$r['symbol'], $m];
    }
    foreach (['user_watchlist', 'custom_alerts'] as $t) {
        try { $x = $conn->query("SHOW TABLES LIKE '$t'"); if (!$x || !$x->num_rows) continue;
            $res = $conn->query("SELECT DISTINCT symbol, market FROM `$t`" . ($t === 'custom_alerts' ? " WHERE deleted_at IS NULL" : ""));
            while ($r = $res->fetch_assoc()) { $m = sym_market($r['market']); $pairs[strtoupper($r['symbol']) . '|' . $m] = [$r['symbol'], $m]; } } catch (Throwable $e) {}
    }
    // مصدر الأسعار شغال؟
    foreach (array_unique(array_map(fn($p) => $p[1], $pairs)) as $m) {
        if (!sym_valid(SYM_REF[$m] ?? 'COMI', $m)) return ["success" => false, "message" => "مصدر الأسعار غير متاح الآن لسوق {$m} - لم يُحذف أي شيء. حاول لاحقًا."];
    }
    $deleted = []; $waiting = [];
    foreach ($pairs as $k => [$sym, $m]) {
        $ok = sym_valid($sym, $m);
        if ($ok) { $u = $conn->prepare("DELETE FROM symbol_checks WHERE symbol = ? AND market = ? AND banned = 0"); $u->bind_param("ss", $sym, $m); $u->execute(); $u->close(); continue; }
        // سجل الفشل
        $u = $conn->prepare("INSERT INTO symbol_checks (symbol, market, first_fail_at, last_fail_at, fails) VALUES (?, ?, NOW(), NOW(), 1)
            ON DUPLICATE KEY UPDATE fails = fails + 1, last_fail_at = NOW()"); $u->bind_param("ss", $sym, $m); $u->execute(); $u->close();
        $st = $conn->prepare("SELECT fails, first_fail_at, banned FROM symbol_checks WHERE symbol = ? AND market = ?"); $st->bind_param("ss", $sym, $m); $st->execute();
        $c = $st->get_result()->fetch_assoc(); $st->close();
        $due = $mode === 'now' || (int)$c['banned'] === 1 || ((int)$c['fails'] >= 2 && strtotime($c['first_fail_at'] . ' UTC') <= time() - 6 * 3600);
        $rows = $plans[$k] ?? [];
        if (!$due) { $waiting[] = ["symbol" => $sym, "market" => $m, "plans" => count($rows)]; continue; }
        $b = $conn->prepare("UPDATE symbol_checks SET banned = 1 WHERE symbol = ? AND market = ?"); $b->bind_param("ss", $sym, $m); $b->execute(); $b->close();
        $accounts = array_values(array_unique(array_column($rows, 'account_email')));
        sym_purge($conn, $sym, $m, null, array_map(fn($r) => (int)$r['id'], $rows));
        foreach ($rows as $r) $deleted[] = ["email" => $r['account_email'], "kind" => $r['plan_type'] === 'grid_plans' ? 'Grid' : 'DCA', "symbol" => $r['symbol'], "market" => $m];
        if (!$rows) $deleted[] = ["email" => '', "kind" => 'متابعة/تنبيه', "symbol" => $sym, "market" => $m];
        // إعادة بناء جدول الصفقات لأصحاب الخطط
        if ($accounts) { try { require_once __DIR__ . '/plans_store.php'; require_once __DIR__ . '/trades_lib.php';
            foreach ($rows as $r) trades_rebuild($conn, $r['account_email'], $r['plan_type']); } catch (Throwable $e) {} }
    }
    try { $conn->query("REPLACE INTO site_config (config_key, config_value) VALUES ('symbols_clean_at', '" . time() . "')"); } catch (Throwable $e) {}
    return ["success" => true, "deleted" => $deleted, "waiting" => $waiting, "checked" => count($pairs)];
}
// التشغيل التلقائي: كل 6 ساعات بالكتير
function sym_auto_due($conn){
    try { $r = $conn->query("SELECT config_value FROM site_config WHERE config_key = 'symbols_clean_at'")->fetch_assoc(); return !$r || (int)$r['config_value'] < time() - 6 * 3600; } catch (Throwable $e) { return false; }
}
?>
