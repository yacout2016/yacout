<?php
/* =====================================================================
   GRIFFINE — perks_lib.php (الإصدار 135) — مميزات كل باقة
   ---------------------------------------------------------------------
   - قائمة مميزات ثابتة (14) + مميزات / شاشات بيضيفها الأدمن (perks_cfg.custom)
   - كل باقة ليها مميزاتها في subscription_plans.perks (JSON) — فاضي = الاختيارات الافتراضية
   - الباقة المجانية (trial): أول full_days يوم (20) كل المميزات مفتوحة عشان المستثمر يتعرّف على كل حاجة،
     وباقي مدة الباقة (10 أيام) مميزات الباقة المجانية بس — والحساب الجديد من غير اشتراك بياخد نفس الشيء من يوم التسجيل
   - المميزات بتتحسب لحظة بلحظة من الباقة الحالية (تغيير الباقة من الأدمن أو انتهاء الاشتراك بيبان فورًا)
   - الأدمن والموظفين: كل المميزات
   ===================================================================== */
const PERK_FREE_PLAN = 'trial';
const PERK_BUILTIN = [
    'dca'        => ['l' => 'خطة الداك (DCA) — تعزيز المتوسط', 'ic' => '📉'],
    'grid'       => ['l' => 'خطة الجريد (Grid)', 'ic' => '🧮'],
    'portfolio'  => ['l' => 'المحفظة والتقارير وكشوف PDF / Excel', 'ic' => '📊'],
    'opps'       => ['l' => 'فرصة — البحث عن فرص بالمؤشرات', 'ic' => '🎯'],
    'basira'     => ['l' => 'بصيرة AI — تحليل سهم', 'ic' => '🔮'],
    'basira_scan'=> ['l' => 'بصيرة — مسح السوق', 'ic' => '📡'],
    'mizan'      => ['l' => 'ميزان محفظتك AI', 'ic' => '⚖️'],
    'mizanai'    => ['l' => 'ميزان GRIFFINE AI — توزيع الاستثمار', 'ic' => '🧭'],
    'recs_short' => ['l' => 'توصيات محللين قصيرة المدى', 'ic' => '⚡'],
    'recs_long'  => ['l' => 'توصيات محللين طويلة المدى (من أسبوعين)', 'ic' => '🕰️'],
    'screener'   => ['l' => 'كشاف الأسهم — البيفت بوينت وتحليل السهم', 'ic' => '🔭'],
    'alerts'     => ['l' => 'تنبيهات الأسعار', 'ic' => '🔔'],
    'watchlist'  => ['l' => 'قائمة المتابعة', 'ic' => '⭐'],
    'ai_pro'     => ['l' => 'الذكاء الاصطناعي المتقدم (Claude)', 'ic' => '✨'],
];

function perk_cfg($conn){
    static $c = null; if ($c !== null) return $c;
    $d = ['custom' => [], 'full_days' => 20, 'full_ai' => false, 'hidden' => []];
    $raw = function_exists('site_config_get') ? site_config_get($conn, 'perks_cfg') : '';
    if ($raw === '') { try { $st = $conn->prepare("SELECT config_value FROM site_config WHERE config_key = 'perks_cfg'"); $st->execute(); $r = $st->get_result()->fetch_row(); $st->close(); $raw = $r ? (string)$r[0] : ''; } catch (Throwable $e) {} }
    $j = $raw !== '' ? json_decode($raw, true) : null;
    if (is_array($j)) $d = array_merge($d, array_intersect_key($j, $d));
    $d['full_days'] = max(0, min(365, (int)$d['full_days'])); $d['full_ai'] = !empty($d['full_ai']);
    $d['hidden'] = array_values(array_filter(is_array($d['hidden']) ? $d['hidden'] : [], 'is_string'));   // الإصدار 137: مميزات مخفية عن كل المشتركين
    $d['custom'] = array_values(array_filter(is_array($d['custom']) ? $d['custom'] : [], fn($x) => is_array($x) && preg_match('/^c_[a-z0-9]{4,12}$/', $x['k'] ?? '') && trim($x['l'] ?? '') !== ''));
    return $c = $d;
}
function perk_cfg_save($conn, $cfg, $by = null){
    $v = json_encode($cfg, JSON_UNESCAPED_UNICODE);
    $st = $conn->prepare("INSERT INTO site_config (config_key, config_value, updated_by) VALUES ('perks_cfg', ?, ?) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_by = VALUES(updated_by)");
    $st->bind_param("ss", $v, $by); $st->execute(); $st->close();
    if (function_exists('site_config_all')) site_config_all($conn, true);
}
// القائمة كاملة: الثابتة + اللي الأدمن ضافها ({k, l, ic, screen, custom})
function perk_catalog($conn){
    $out = []; $hid = perk_cfg($conn)['hidden'];
    foreach (PERK_BUILTIN as $k => $p) $out[] = ['k' => $k, 'l' => $p['l'], 'ic' => $p['ic'], 'screen' => '', 'custom' => false, 'hidden' => in_array($k, $hid, true)];
    foreach (perk_cfg($conn)['custom'] as $c) $out[] = ['k' => $c['k'], 'l' => (string)$c['l'], 'ic' => '➕', 'screen' => preg_match('/^render[A-Za-z0-9]{2,60}$/', $c['screen'] ?? '') ? $c['screen'] : '', 'custom' => true, 'hidden' => in_array($c['k'], $hid, true)];
    return $out;
}
// الإصدار 137: اللي المشترك يشوفه (من غير المخفي)
function perk_catalog_public($conn){ return array_values(array_filter(perk_catalog($conn), fn($p) => !$p['hidden'])); }
function perk_hidden($conn){ return perk_cfg($conn)['hidden']; }
function perk_keys_all($conn){ return array_column(perk_catalog($conn), 'k'); }

// الاختيارات الافتراضية لكل باقة (لحد ما الأدمن يحفظ اختياراته)
function perk_defaults($planId, $amount, $includesAi){
    $all = array_keys(PERK_BUILTIN);
    if ($planId === PERK_FREE_PLAN || (float)$amount <= 0) return ['dca', 'watchlist', 'alerts', 'recs_short'];
    if ($includesAi) return $all;
    if ($planId === 'monthly') return ['dca', 'grid', 'portfolio', 'opps', 'basira', 'screener', 'mizan', 'recs_short', 'alerts', 'watchlist'];
    return array_values(array_diff($all, ['ai_pro']));   // السنوية وأي باقة مدفوعة تانية
}
function perk_has_col($conn){
    static $h = null; if ($h !== null) return $h;
    try { $r = $conn->query("SHOW COLUMNS FROM subscription_plans LIKE 'perks'"); $h = $r && $r->num_rows > 0; } catch (Throwable $e) { $h = false; }
    return $h;
}
function perk_plan_row($conn, $planId){
    static $c = [];
    if (array_key_exists($planId, $c)) return $c[$planId];
    $st = $conn->prepare("SELECT * FROM subscription_plans WHERE id = ? LIMIT 1"); $st->bind_param("s", $planId); $st->execute();
    $r = $st->get_result()->fetch_assoc(); $st->close();
    return $c[$planId] = $r ?: null;
}
// مميزات باقة (من الصف) ← [keys], + هل هي الافتراضية
function perk_plan_keys($conn, $row, &$isDefault = null){
    $valid = perk_keys_all($conn);
    $raw = $row['perks'] ?? null;
    if ($raw !== null && $raw !== '') {
        $j = json_decode($raw, true);
        if (is_array($j)) { $isDefault = false; return array_values(array_intersect($valid, $j)); }
    }
    $isDefault = true;
    return perk_defaults((string)($row['id'] ?? ''), (float)($row['amount'] ?? 0), !empty($row['includes_ai']));
}
function perk_grace($conn){
    static $g = null; if ($g !== null) return $g;
    $g = 0; try { $r = @$conn->query("SELECT grace_period_days FROM reminder_defaults WHERE id = 1"); if ($r && ($x = $r->fetch_assoc())) $g = (int)$x['grace_period_days']; } catch (Throwable $e) {}
    return $g;
}
function perk_days_between($from, $to){ return (int)floor((strtotime(substr($to, 0, 10)) - strtotime(substr($from, 0, 10))) / 86400); }

/* حالة المشترك: phase = admin | paid | full (فترة التعرّف: كل حاجة) | basic (الباقة المجانية) | none (مفيش باقة شغالة)
   + keys (المميزات الشغالة) + plan / planName + daysLeft (للمرحلة الحالية) + reason للـ none (nosub | pending | expired) */
function perk_state($conn, $email, $isAdmin = false){
    static $cache = [];
    $e = strtolower((string)$email); $ck = $e . '|' . ($isAdmin ? 1 : 0);
    if (isset($cache[$ck])) return $cache[$ck];
    $all = perk_keys_all($conn);
    if ($isAdmin) return $cache[$ck] = ['phase' => 'admin', 'keys' => $all, 'plan' => '', 'planName' => 'الإدارة', 'daysLeft' => null];
    $cfg = perk_cfg($conn); $today = date('Y-m-d');
    $fullKeys = $cfg['full_ai'] ? $all : array_values(array_diff($all, ['ai_pro']));
    $free = perk_plan_row($conn, PERK_FREE_PLAN);
    $freeName = $free['name'] ?? 'الباقة المجانية';
    $freeKeys = $free ? perk_plan_keys($conn, $free) : perk_defaults(PERK_FREE_PLAN, 0, false);
    $freeTotal = max((int)($free['duration_days'] ?? 30), $cfg['full_days']);
    $sub = null;
    if ($e !== '') {
        $st = $conn->prepare("SELECT plan_id, plan_name, active, start_date, end_date FROM subscribers WHERE LOWER(account_email) = ? AND archived = 0 ORDER BY id DESC LIMIT 1");
        $st->bind_param("s", $e); $st->execute(); $sub = $st->get_result()->fetch_assoc(); $st->close();
    }
    $out = null;
    if ($sub && (int)$sub['active'] === 1 && strtotime($sub['end_date'] . ' +' . perk_grace($conn) . ' days') >= strtotime($today)) {
        $row = perk_plan_row($conn, $sub['plan_id']);
        $left = max(0, perk_days_between($today, $sub['end_date']));
        if ($sub['plan_id'] === PERK_FREE_PLAN) {
            // البداية: يوم التسجيل لو الحساب جديد (عشان اختيار الباقة المجانية بعد كام يوم مايرجّعش فترة التعرّف من الأول)
            $base = $sub['start_date'];
            $st = $conn->prepare("SELECT created_at FROM users WHERE LOWER(username) = ? LIMIT 1"); $st->bind_param("s", $e); $st->execute(); $u = $st->get_result()->fetch_assoc(); $st->close();
            if (!empty($u['created_at']) && perk_days_between($u['created_at'], $sub['start_date']) >= 0 && perk_days_between($u['created_at'], $today) < $freeTotal) $base = substr($u['created_at'], 0, 10);
            $d = perk_days_between($base, $today);
            $out = $d < $cfg['full_days']
                ? ['phase' => 'full', 'keys' => $fullKeys, 'daysLeft' => $cfg['full_days'] - $d, 'freeLeft' => $left]
                : ['phase' => 'basic', 'keys' => $freeKeys, 'daysLeft' => $left];
            $out += ['plan' => PERK_FREE_PLAN, 'planName' => $sub['plan_name'] ?: $freeName];
        } else {
            $out = ['phase' => 'paid', 'keys' => $row ? perk_plan_keys($conn, $row) : array_values(array_diff($all, ['ai_pro'])), 'plan' => $sub['plan_id'], 'planName' => $sub['plan_name'], 'daysLeft' => $left];
        }
    } elseif (!$sub || ((int)$sub['active'] !== 1 && strtotime($sub['end_date']) >= strtotime($today))) {
        // حساب جديد (أو طلبه لسه بيتراجع): الباقة المجانية من يوم التسجيل
        $reg = null;
        if ($e !== '') { $st = $conn->prepare("SELECT created_at FROM users WHERE LOWER(username) = ? LIMIT 1"); $st->bind_param("s", $e); $st->execute(); $u = $st->get_result()->fetch_assoc(); $st->close(); $reg = $u['created_at'] ?? null; }
        $d = $reg ? perk_days_between($reg, $today) : 0;
        $reason = $sub ? 'pending' : 'nosub';
        if ($d < $cfg['full_days']) $out = ['phase' => 'full', 'keys' => $fullKeys, 'daysLeft' => $cfg['full_days'] - $d, 'freeLeft' => $freeTotal - $d];
        elseif ($d < $freeTotal) $out = ['phase' => 'basic', 'keys' => $freeKeys, 'daysLeft' => $freeTotal - $d];
        else $out = ['phase' => 'none', 'keys' => [], 'daysLeft' => 0, 'reason' => $reason];
        $out += ['plan' => PERK_FREE_PLAN, 'planName' => $freeName, 'reason' => $reason];
    } else {
        $out = ['phase' => 'none', 'keys' => [], 'plan' => $sub['plan_id'] ?? '', 'planName' => $sub['plan_name'] ?? '', 'daysLeft' => 0, 'reason' => (int)$sub['active'] === 1 ? 'expired' : 'pending'];
    }
    // الإصدار 138: تعديلات الأدمن لمشترك بعينه (ميزات إضافية فوق باقته / ميزات متشالة) — بتفضل معاه حتى لو باقته اتغيرت
    $out['base'] = $out['keys']; $out['plus'] = []; $out['minus'] = [];
    if (in_array($out['phase'], ['full', 'basic', 'paid'], true)) {
        $ov = perk_user_ov($conn, $e);
        $out['plus'] = array_values(array_diff($ov['plus'], $out['base'])); $out['minus'] = array_values(array_intersect($ov['minus'], $out['base']));
        $out['keys'] = array_values(array_diff(array_unique(array_merge($out['base'], $out['plus'])), $out['minus']));
    }
    $out['keys'] = array_values(array_diff($out['keys'], perk_hidden($conn)));   // الإصدار 137: المخفي مقفول عند الكل
    return $cache[$ck] = $out;
}
function perk_ov_ready($conn){
    static $r = null; if ($r !== null) return $r;
    try { $x = $conn->query("SHOW TABLES LIKE 'user_perks'"); $r = $x && $x->num_rows > 0; } catch (Throwable $e) { $r = false; }
    return $r;
}
function perk_user_ov($conn, $email){
    $d = ['plus' => [], 'minus' => []];
    if ($email === '' || !perk_ov_ready($conn)) return $d;
    $st = $conn->prepare("SELECT plus_keys, minus_keys FROM user_perks WHERE account_email = ?"); $e = strtolower($email); $st->bind_param("s", $e); $st->execute();
    $r = $st->get_result()->fetch_assoc(); $st->close();
    if (!$r) return $d;
    $valid = perk_keys_all($conn);
    $j = fn($v) => array_values(array_intersect($valid, is_array($x = json_decode((string)$v, true)) ? $x : []));
    return ['plus' => $j($r['plus_keys']), 'minus' => $j($r['minus_keys'])];
}
function perk_user_ov_save($conn, $email, $plus, $minus){
    $e = strtolower($email);
    if (!$plus && !$minus) { $st = $conn->prepare("DELETE FROM user_perks WHERE account_email = ?"); $st->bind_param("s", $e); $st->execute(); $st->close(); return; }
    $p = json_encode(array_values($plus)); $m = json_encode(array_values($minus));
    $st = $conn->prepare("INSERT INTO user_perks (account_email, plus_keys, minus_keys) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE plus_keys = VALUES(plus_keys), minus_keys = VALUES(minus_keys)");
    $st->bind_param("sss", $e, $p, $m); $st->execute(); $st->close();
}
// الإصدار 138: الحساب الجديد بيتسجّل على الباقة المجانية تلقائي (يظهر في جدول المشتركين والأدمن يقدر يغيّرها)
function perk_auto_free($conn, $email, $start = null){
    try {
        $e = strtolower($email);
        $c = $conn->prepare("SELECT id FROM subscribers WHERE LOWER(account_email) = ? LIMIT 1"); $c->bind_param("s", $e); $c->execute(); $has = (bool)$c->get_result()->fetch_row(); $c->close();
        if ($has) return false;
        $pl = perk_plan_row($conn, PERK_FREE_PLAN); if (!$pl) return false;
        $start = $start ?: date('Y-m-d'); $end = date('Y-m-d', strtotime($start . ' +' . max(1, (int)$pl['duration_days']) . ' days'));
        $name = explode('@', $e)[0]; $mkt = 'مصر';
        try { $m = $conn->prepare("SELECT account_market FROM users WHERE LOWER(username) = ?"); $m->bind_param("s", $e); $m->execute(); $mr = $m->get_result()->fetch_row(); $m->close(); if ($mr && $mr[0]) $mkt = $mr[0]; } catch (Throwable $x) {}
        $st = $conn->prepare("INSERT INTO subscribers (account_email, name, phone, contact_email, plan_id, plan_name, amount, market, start_date, end_date, active) VALUES (?, ?, '', ?, ?, ?, 0, ?, ?, ?, 1)");
        $pid = PERK_FREE_PLAN; $pn = $pl['name'];
        $st->bind_param("ssssssss", $e, $name, $e, $pid, $pn, $mkt, $start, $end); $st->execute(); $st->close();
        if (function_exists('logSubscriptionEvent')) logSubscriptionEvent($conn, $e, 'free_auto', $pid, $pn, 0);
        return true;
    } catch (Throwable $x) { return false; }
}
function perk_has($conn, $email, $k, $isAdmin = false){
    if ($isAdmin) return true;
    return in_array($k, perk_state($conn, $email, false)['keys'], true);
}
function perk_label($conn, $k){ foreach (perk_catalog($conn) as $p) if ($p['k'] === $k) return $p['l']; return $k; }
// رسالة الرفض (نفس شكل requiresSubscription اللي الشاشات بتفهمه)
function perk_denied($conn, $email, $k){
    if (in_array($k, perk_hidden($conn), true)) return ["success" => false, "hidden" => true, "perkHidden" => $k, "message" => "الميزة دي غير متاحة حاليًا."];
    $s = perk_state($conn, $email);
    $msg = $s['phase'] === 'none'
        ? 'الميزة دي متاحة للمشتركين — اختار باقتك من «الباقات والأسعار».'
        : '🔒 «' . perk_label($conn, $k) . '» مش ضمن باقتك الحالية (' . $s['planName'] . ') — تقدر ترقّي باقتك من «الباقات والأسعار».';
    return ["success" => false, "requiresSubscription" => true, "perkLocked" => $k, "message" => $msg];
}
// كل المشتركين اللي عندهم الميزة دي في سوق معيّن (للتوصيات) — بيشمل الحسابات الجديدة اللي في الباقة المجانية
function perk_recipients($conn, $k, $market = null){
    $cands = [];
    $res = $conn->query("SELECT DISTINCT LOWER(account_email) e FROM subscribers WHERE archived = 0");
    while ($r = $res->fetch_assoc()) if ($r['e']) $cands[$r['e']] = 1;
    $days = max((int)(perk_plan_row($conn, PERK_FREE_PLAN)['duration_days'] ?? 30), perk_cfg($conn)['full_days']);
    $st = $conn->prepare("SELECT LOWER(username) e FROM users WHERE is_admin = 0 AND COALESCE(archived, 0) = 0 AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)");
    $st->bind_param("i", $days); $st->execute(); $rs = $st->get_result();
    while ($r = $rs->fetch_assoc()) if ($r['e']) $cands[$r['e']] = 1;
    $st->close();
    $out = [];
    foreach (array_keys($cands) as $e) {
        if (!perk_has($conn, $e, $k)) continue;
        if ($market !== null && function_exists('mc_account_market') && mc_account_market($conn, $e) !== $market) continue;
        $out[] = $e;
    }
    return $out;
}
?>
