<?php
/* =====================================================================
   GRIFFINE — opps_lib.php (الإصدار 101) — البحث عن فرص حسب المؤشرات الفنية
   ---------------------------------------------------------------------
   ⚠️ ليست توصية استثمارية - مجرد تطبيق شروط المؤشرات اللي المستخدم اختارها على أسعار متأخرة 15 دقيقة.
   - الفرصة = شراء أو بيع + إطار زمني + من 1 لـ 5 مؤشرات (لازم كلهم يتحققوا مع بعض)
   - البحث بيتم في كل أسهم بورصة حساب المستخدم (قائمة الأسهم من TradingView) - الأسعار التاريخية من Yahoo
   - الفحص: اليومي/الأسبوعي/الشهري كل ~3 ساعات وقت التداول (مرتين-تلاتة في اليوم) ، الساعة كل ساعة ، الـ4 ساعات كل 4 ساعات
   - الأسهم كتير فالفحص بيكمّل من مكانه في التشغيلة الجاية (scan_pos) - والأسعار محفوظة مؤقتًا ومشتركة بين كل المستخدمين
   - بعد كل دورة كاملة: الأسهم الجديدة اللي الشرط اتحقق عليها ← إشعار (حسب قنوات الفرصة وقنوات المستخدم) لحد 3 مرات وبينهم الفترة المحددة
   ===================================================================== */
require_once __DIR__ . '/quote_lib.php';
require_once __DIR__ . '/notify_lib.php';

const OPP_MAX_OPEN = 4;
const OPP_TF = ['1d' => 'يومي', '1wk' => 'أسبوعي', '1mo' => 'شهري', '4h' => '4 ساعات', '1h' => 'ساعة'];
const OPP_TYPES = ['rsi', 'macd', 'sma', 'ema', 'bb', 'stoch', 'vol', 'macross'];
const OPP_NAMES = ['rsi' => 'RSI', 'macd' => 'MACD', 'sma' => 'المتوسط المتحرك البسيط (SMA)', 'ema' => 'المتوسط المتحرك الأسي (EMA)', 'bb' => 'بولينجر باند', 'stoch' => 'ستوكاستيك', 'vol' => 'حجم التداول', 'macross' => 'تقاطع متوسطين'];
// إعدادات السوق: المنطقة الزمنية + أيام الإجازة (0 = الأحد ... 6 = السبت) + وقت الجلسة المحلي
const OPP_MKT = [
    'مصر'      => ['tz' => 'Africa/Cairo', 'off' => [5, 6], 'open' => '10:00', 'close' => '14:30', 'screener' => 'egypt'],
    'السعودية' => ['tz' => 'Asia/Riyadh',  'off' => [5, 6], 'open' => '10:00', 'close' => '15:00', 'screener' => 'ksa'],
    'الإمارات' => ['tz' => 'Asia/Dubai',   'off' => [6, 0], 'open' => '10:00', 'close' => '15:00', 'screener' => 'uae'],
    'قطر'      => ['tz' => 'Asia/Qatar',   'off' => [5, 6], 'open' => '09:30', 'close' => '13:15', 'screener' => 'qatar'],
    'الكويت'   => ['tz' => 'Asia/Kuwait',  'off' => [5, 6], 'open' => '09:00', 'close' => '12:40', 'screener' => 'kuwait'],
];

function opp_ready($conn){
    static $r = null; if ($r !== null) return $r;
    try { $x = $conn->query("SHOW TABLES LIKE 'opportunities'"); $r = $x && $x->num_rows > 0; } catch (Throwable $e) { $r = false; }
    return $r;
}
function opp_cache_dir(){ $d = sys_get_temp_dir() . '/griffine_quotes'; if (!is_dir($d)) @mkdir($d, 0700, true); return $d; }

/* ---------- أيام وساعات التداول ---------- */
function opp_mkt($m){ return OPP_MKT[$m] ?? OPP_MKT['مصر']; }
function opp_is_trading_day($m, $ts = null){ $c = opp_mkt($m); $d = new DateTime('@' . ($ts ?? time())); $d->setTimezone(new DateTimeZone($c['tz'])); return !in_array((int)$d->format('w'), $c['off'], true); }
function opp_in_window($m, $ts = null){
    // من بداية الجلسة لحد ساعة ونص بعد الإقفال (عشان سعر الإقفال يدخل الفحص)
    $c = opp_mkt($m); $d = new DateTime('@' . ($ts ?? time())); $d->setTimezone(new DateTimeZone($c['tz']));
    if (in_array((int)$d->format('w'), $c['off'], true)) return false;
    $hm = (int)$d->format('H') * 60 + (int)$d->format('i');
    [$oh, $om] = array_map('intval', explode(':', $c['open'])); [$ch, $cm] = array_map('intval', explode(':', $c['close']));
    return $hm >= $oh * 60 + $om && $hm <= $ch * 60 + $cm + 90;
}
// نهاية آخر يوم تداول بعد N أيام تداول (من النهارده لو يوم تداول) ← بتوقيت UTC
function opp_ends_at($m, $days){
    $c = opp_mkt($m); $tz = new DateTimeZone($c['tz']); $d = new DateTime('now', $tz); $left = max(1, min(5, (int)$days)); $guard = 0;
    while ($guard++ < 20) {
        if (!in_array((int)$d->format('w'), $c['off'], true)) { $left--; if ($left === 0) break; }
        $d->modify('+1 day');
    }
    $d->setTime(23, 59, 0); $d->setTimezone(new DateTimeZone('UTC'));
    return $d->format('Y-m-d H:i:s');
}

/* ---------- قائمة أسهم البورصة ---------- */
function opp_universe($conn, $market){
    $c = opp_mkt($market);
    $f = opp_cache_dir() . '/' . md5('univ101|' . $market) . '.json';
    if (is_file($f) && time() - filemtime($f) < 24 * 3600 && ($j = json_decode((string)@file_get_contents($f), true))) return $j;
    $out = [];
    $r = mq_http(TV_SCAN_BASE . $c['screener'] . '/scan', ['filter' => [], 'columns' => ['name', 'description', 'close'], 'range' => [0, 800], 'sort' => ['sortBy' => 'name', 'sortOrder' => 'asc']]);
    foreach (($r['data'] ?? []) as $row) {
        $sym = strtoupper((string)($row['d'][0] ?? '')); if (!preg_match('/^[A-Z0-9.\-]{1,20}$/', $sym)) continue;
        $out[] = ['s' => $sym, 'n' => (string)($row['d'][1] ?? $sym)];
    }
    if (!$out) {   // المصدر مش متاح ← الأسهم المعروفة في الموقع للسوق ده
        foreach (['user_plans' => "SELECT DISTINCT symbol FROM user_plans WHERE deleted = 0 LIMIT 500", 'user_watchlist' => "SELECT DISTINCT symbol FROM user_watchlist WHERE market = '" . $conn->real_escape_string($market) . "' LIMIT 500"] as $q) {
            try { $res = $conn->query($q); while ($x = $res->fetch_assoc()) { $s = strtoupper($x['symbol']); if (preg_match('/^[A-Z0-9.\-]{1,20}$/', $s)) $out[$s] = ['s' => $s, 'n' => $s]; } } catch (Throwable $e) {}
        }
        $out = array_values($out);
        return $out;   // مبنحفظش القائمة البديلة
    }
    @file_put_contents($f, json_encode($out));
    return $out;
}

/* ---------- الشموع (أسعار تاريخية) ---------- */
function opp_yahoo($ysym, $interval, $range){
    $j = mq_http(MARKET_QUOTE_BASE . rawurlencode($ysym) . '?range=' . $range . '&interval=' . $interval . '&includePrePost=false');
    $res = $j['chart']['result'][0] ?? null; if (!$res || empty($res['timestamp'])) return null;
    $q = $res['indicators']['quote'][0] ?? []; $o = ['t' => [], 'h' => [], 'l' => [], 'c' => [], 'v' => []];
    foreach ($res['timestamp'] as $i => $t) {
        $c = $q['close'][$i] ?? null; if ($c === null) continue;
        $o['t'][] = (int)$t; $o['c'][] = (float)$c; $o['h'][] = (float)($q['high'][$i] ?? $c); $o['l'][] = (float)($q['low'][$i] ?? $c); $o['v'][] = (float)($q['volume'][$i] ?? 0);
    }
    return count($o['c']) >= 2 ? $o : null;
}
function opp_candles($sym, $market, $tf){
    $m = MQ_MARKETS[$market] ?? MQ_MARKETS['مصر'];
    $ttl = in_array($tf, ['1h', '4h'], true) ? 50 * 60 : 3 * 3600;
    $f = opp_cache_dir() . '/' . md5("c101|$sym|$market|$tf") . '.json';
    if (is_file($f) && time() - filemtime($f) < $ttl) { $j = json_decode((string)@file_get_contents($f), true); return $j ?: null; }
    [$interval, $range] = ['1d' => ['1d', '2y'], '1wk' => ['1wk', '5y'], '1mo' => ['1mo', '10y'], '1h' => ['60m', '60d'], '4h' => ['60m', '120d']][$tf] ?? ['1d', '2y'];
    $out = null;
    foreach ($m[2] as $suffix) { $out = opp_yahoo($sym . $suffix, $interval, $range); if ($out) break; }
    if ($out && $tf === '4h') {   // تجميع كل 4 شموع ساعة في شمعة
        $g = ['t' => [], 'h' => [], 'l' => [], 'c' => [], 'v' => []]; $n = count($out['c']);
        for ($i = 0; $i < $n; $i += 4) { $e = min($n, $i + 4);
            $g['t'][] = $out['t'][$e - 1]; $g['c'][] = $out['c'][$e - 1]; $g['h'][] = max(array_slice($out['h'], $i, $e - $i)); $g['l'][] = min(array_slice($out['l'], $i, $e - $i)); $g['v'][] = array_sum(array_slice($out['v'], $i, $e - $i)); }
        $out = $g;
    }
    @file_put_contents($f, json_encode($out));
    return $out;
}

/* ---------- المؤشرات ---------- */
function opp_sma($a, $p){ $o = array_fill(0, count($a), null); $s = 0; foreach ($a as $i => $v) { $s += $v; if ($i >= $p) $s -= $a[$i - $p]; if ($i >= $p - 1) $o[$i] = $s / $p; } return $o; }
function opp_ema($a, $p){ $o = array_fill(0, count($a), null); $k = 2 / ($p + 1); $e = null; foreach ($a as $i => $v) { if ($v === null) continue; if ($e === null) { if ($i >= $p - 1) { $e = array_sum(array_slice($a, $i - $p + 1, $p)) / $p; $o[$i] = $e; } continue; } $e = $v * $k + $e * (1 - $k); $o[$i] = $e; } return $o; }
function opp_rsi($c, $p){
    $n = count($c); $o = array_fill(0, $n, null); if ($n <= $p) return $o;
    $g = 0; $l = 0; for ($i = 1; $i <= $p; $i++) { $d = $c[$i] - $c[$i - 1]; if ($d > 0) $g += $d; else $l -= $d; }
    $ag = $g / $p; $al = $l / $p; $o[$p] = $al == 0 ? 100 : 100 - 100 / (1 + $ag / $al);
    for ($i = $p + 1; $i < $n; $i++) { $d = $c[$i] - $c[$i - 1]; $ag = ($ag * ($p - 1) + max($d, 0)) / $p; $al = ($al * ($p - 1) + max(-$d, 0)) / $p; $o[$i] = $al == 0 ? 100 : 100 - 100 / (1 + $ag / $al); }
    return $o;
}
function opp_std($a, $p, $i){ $s = array_slice($a, $i - $p + 1, $p); $m = array_sum($s) / $p; $v = 0; foreach ($s as $x) $v += ($x - $m) ** 2; return sqrt($v / $p); }
// تقاطع a لـ b لفوق (up) أو لتحت خلال آخر L شموع
function opp_crossed($a, $b, $L, $up){
    $n = count($a);
    for ($i = max(1, $n - $L); $i < $n; $i++) {
        $a0 = $a[$i - 1]; $a1 = $a[$i]; $b0 = is_array($b) ? $b[$i - 1] : $b; $b1 = is_array($b) ? $b[$i] : $b;
        if ($a0 === null || $a1 === null || $b0 === null || $b1 === null) continue;
        if ($up ? ($a0 <= $b0 && $a1 > $b1) : ($a0 >= $b0 && $a1 < $b1)) return true;
    }
    return false;
}
function opp_num($p, $k, $def, $min, $max){ $v = isset($p[$k]) && is_numeric($p[$k]) ? (float)$p[$k] : $def; return max($min, min($max, $v)); }
/* شرط مؤشر واحد على الشموع ← true / false (بيانات مش كفاية = false) */
function opp_eval_one($ind, $C){
    $t = $ind['t'] ?? ''; $p = $ind['p'] ?? []; $cond = $ind['c'] ?? '';
    $c = $C['c']; $n = count($c); if ($n < 3) return false; $last = $n - 1;
    switch ($t) {
        case 'rsi':
            $per = (int)opp_num($p, 'period', 14, 2, 100); $lvl = opp_num($p, 'level', 30, 1, 99); $r = opp_rsi($c, $per); if ($r[$last] === null) return false;
            if ($cond === 'below') return $r[$last] < $lvl; if ($cond === 'above') return $r[$last] > $lvl;
            if ($cond === 'cross_up') return opp_crossed($r, $lvl, (int)opp_num($p, 'lookback', 3, 1, 20), true);
            if ($cond === 'cross_down') return opp_crossed($r, $lvl, (int)opp_num($p, 'lookback', 3, 1, 20), false);
            return false;
        case 'macd':
            $f = (int)opp_num($p, 'fast', 12, 2, 100); $s = (int)opp_num($p, 'slow', 26, 3, 200); $g = (int)opp_num($p, 'signal', 9, 2, 50); if ($f >= $s) return false;
            $ef = opp_ema($c, $f); $es = opp_ema($c, $s); $m = []; foreach ($c as $i => $_) $m[$i] = ($ef[$i] !== null && $es[$i] !== null) ? $ef[$i] - $es[$i] : null;
            $vals = array_values(array_filter($m, fn($x) => $x !== null)); if (count($vals) < $g + 2) return false;
            $sigv = opp_ema($vals, $g); $off = $n - count($vals); $sig = array_fill(0, $n, null); foreach ($sigv as $i => $x) $sig[$i + $off] = $x;
            if ($m[$last] === null || $sig[$last] === null) return false;
            $L = (int)opp_num($p, 'lookback', 3, 1, 20);
            if ($cond === 'cross_up') return opp_crossed($m, $sig, $L, true); if ($cond === 'cross_down') return opp_crossed($m, $sig, $L, false);
            if ($cond === 'above') return $m[$last] > $sig[$last]; if ($cond === 'below') return $m[$last] < $sig[$last];
            return false;
        case 'sma': case 'ema':
            $per = (int)opp_num($p, 'period', $t === 'sma' ? 50 : 20, 2, 300); $ma = $t === 'sma' ? opp_sma($c, $per) : opp_ema($c, $per); if ($ma[$last] === null) return false;
            $L = (int)opp_num($p, 'lookback', 3, 1, 20);
            if ($cond === 'above') return $c[$last] > $ma[$last]; if ($cond === 'below') return $c[$last] < $ma[$last];
            if ($cond === 'cross_up') return opp_crossed($c, $ma, $L, true); if ($cond === 'cross_down') return opp_crossed($c, $ma, $L, false);
            return false;
        case 'bb':
            $per = (int)opp_num($p, 'period', 20, 5, 100); $k = opp_num($p, 'std', 2, 0.5, 4); if ($n < $per) return false;
            $mid = array_sum(array_slice($c, $n - $per, $per)) / $per; $sd = opp_std($c, $per, $last);
            if ($cond === 'touch_lower') return min($c[$last], $C['l'][$last] ?? $c[$last]) <= $mid - $k * $sd;
            if ($cond === 'touch_upper') return max($c[$last], $C['h'][$last] ?? $c[$last]) >= $mid + $k * $sd;
            return false;
        case 'stoch':
            $kp = (int)opp_num($p, 'k', 14, 3, 100); $dp = (int)opp_num($p, 'd', 3, 1, 20); $sm = (int)opp_num($p, 'smooth', 3, 1, 20); $lvl = opp_num($p, 'level', 20, 1, 99);
            if ($n < $kp + $dp + $sm) return false;
            $raw = array_fill(0, $n, null);
            for ($i = $kp - 1; $i < $n; $i++) { $hh = max(array_slice($C['h'], $i - $kp + 1, $kp)); $ll = min(array_slice($C['l'], $i - $kp + 1, $kp)); $raw[$i] = $hh == $ll ? 50 : ($c[$i] - $ll) / ($hh - $ll) * 100; }
            $rv = array_values(array_filter($raw, fn($x) => $x !== null)); $K = opp_sma($rv, $sm); $Kv = array_values(array_filter($K, fn($x) => $x !== null)); $D = opp_sma($Kv, $dp);
            $Kv = array_slice($Kv, count($Kv) - count($D)); $D = array_values($D);
            $kk = end($Kv); $L = (int)opp_num($p, 'lookback', 3, 1, 20);
            if ($cond === 'below') return $kk < $lvl; if ($cond === 'above') return $kk > $lvl;
            $recentLow = min(array_slice($Kv, -max(1, $L + 1))); $recentHigh = max(array_slice($Kv, -max(1, $L + 1)));
            if ($cond === 'below_cross_up') return $recentLow < $lvl && opp_crossed($Kv, $D, $L, true);
            if ($cond === 'above_cross_down') return $recentHigh > $lvl && opp_crossed($Kv, $D, $L, false);
            return false;
        case 'vol':
            $per = (int)opp_num($p, 'period', 20, 2, 100); $ratio = opp_num($p, 'ratio', 150, 100, 1000); $v = $C['v'] ?? []; if (count($v) < $per + 1) return false;
            $avg = array_sum(array_slice($v, count($v) - $per - 1, $per)) / $per; if ($avg <= 0) return false;
            return end($v) >= $avg * $ratio / 100;
        case 'macross':
            $f = (int)opp_num($p, 'fast', 50, 2, 300); $s = (int)opp_num($p, 'slow', 200, 3, 400); if ($f >= $s) return false;
            $a = opp_sma($c, $f); $b = opp_sma($c, $s); if ($b[$last] === null) return false; $L = (int)opp_num($p, 'lookback', 3, 1, 30);
            if ($cond === 'cross_up') return opp_crossed($a, $b, $L, true); if ($cond === 'cross_down') return opp_crossed($a, $b, $L, false);
            if ($cond === 'above') return $a[$last] > $b[$last]; if ($cond === 'below') return $a[$last] < $b[$last];
            return false;
    }
    return false;
}
function opp_eval_all($inds, $C){ foreach ($inds as $ind) if (!opp_eval_one($ind, $C)) return false; return true; }

/* ---------- التحقق من الإعدادات + التعارض ---------- */
const OPP_CONDS = ['rsi' => ['below', 'above', 'cross_up', 'cross_down'], 'macd' => ['cross_up', 'cross_down', 'above', 'below'], 'sma' => ['above', 'below', 'cross_up', 'cross_down'],
    'ema' => ['above', 'below', 'cross_up', 'cross_down'], 'bb' => ['touch_lower', 'touch_upper'], 'stoch' => ['below_cross_up', 'above_cross_down', 'below', 'above'], 'vol' => ['above'], 'macross' => ['cross_up', 'cross_down', 'above', 'below']];
// تصنيف المؤشر: rev = ارتداد من تشبع ، trend = مع الاتجاه ، '' = محايد
function opp_class($side, $ind){
    $t = $ind['t']; $c = $ind['c']; $p = $ind['p'] ?? []; $buy = $side === 'buy';
    if ($t === 'rsi') { $l = (float)($p['level'] ?? 30); return ($buy && in_array($c, ['below', 'cross_up'], true) && $l <= 35) || (!$buy && in_array($c, ['above', 'cross_down'], true) && $l >= 65) ? 'rev' : ''; }
    if ($t === 'stoch') { $l = (float)($p['level'] ?? 20); return ($buy && $l <= 25 && in_array($c, ['below', 'below_cross_up'], true)) || (!$buy && $l >= 75 && in_array($c, ['above', 'above_cross_down'], true)) ? 'rev' : ''; }
    if ($t === 'bb') return ($buy && $c === 'touch_lower') || (!$buy && $c === 'touch_upper') ? 'rev' : '';
    if (in_array($t, ['sma', 'ema', 'macross'], true)) return ($buy && in_array($c, ['above', 'cross_up'], true)) || (!$buy && in_array($c, ['below', 'cross_down'], true)) ? 'trend' : '';
    return '';
}
function opp_validate($side, $tf, $inds){
    if (!in_array($side, ['buy', 'sell'], true)) return 'اختار نوع الفرصة (شراء أو بيع).';
    if (!isset(OPP_TF[$tf])) return 'إطار زمني غير معروف.';
    if (!is_array($inds) || count($inds) < 1 || count($inds) > 5) return 'اختار من مؤشر واحد لحد 5 مؤشرات.';
    $seen = []; $rev = []; $trend = [];
    foreach ($inds as $i => $ind) {
        $t = $ind['t'] ?? ''; if (!in_array($t, OPP_TYPES, true)) return 'مؤشر غير معروف في الخانة ' . ($i + 1) . '.';
        if (!in_array($ind['c'] ?? '', OPP_CONDS[$t], true)) return 'شرط غير صالح لمؤشر ' . OPP_NAMES[$t] . '.';
        $p = $ind['p'] ?? [];
        if (in_array($t, ['macd', 'macross'], true) && (float)($p['fast'] ?? 0) >= (float)($p['slow'] ?? 1)) return 'في ' . OPP_NAMES[$t] . ' لازم الفترة السريعة تكون أقل من البطيئة.';
        $key = $t . json_encode($p) . ($ind['c'] ?? ''); if (isset($seen[$key])) return 'المؤشر ' . OPP_NAMES[$t] . ' متكرر بنفس الإعدادات.'; $seen[$key] = 1;
        $cl = opp_class($side, $ind); if ($cl === 'rev') $rev[] = OPP_NAMES[$t]; if ($cl === 'trend') $trend[] = OPP_NAMES[$t];
    }
    if ($rev && $trend) return 'الإعدادات متعارضة: ' . implode(' و', $rev) . ' (' . ($side === 'buy' ? 'تشبع بيعي / ارتداد من القاع' : 'تشبع شرائي / ارتداد من القمة') . ') مع ' . implode(' و', $trend) . ' (' . ($side === 'buy' ? 'اتجاه صاعد' : 'اتجاه هابط') . ') نادرًا ما يتحققوا في نفس الوقت — غيّر إعدادات واحد منهم.';
    return '';
}

/* ---------- التشغيل ---------- */
function opp_due($o){
    $gap = ['1h' => 55 * 60, '4h' => 3.5 * 3600][$o['timeframe']] ?? 3 * 3600;
    return empty($o['last_pass_at']) || strtotime($o['last_pass_at'] . ' UTC') <= time() - $gap || (int)$o['scan_pos'] > 0;
}
/* بيفحص الفرص (كلها أو فرصة واحدة) لحد $budget ثانية - يرجّع عدد الإشعارات */
function opp_run($conn, $budget = 40, $onlyId = null, $force = false){
    if (!opp_ready($conn)) return 0;
    @set_time_limit($budget + 30);
    $t0 = microtime(true); $sent = 0;
    $conn->query("UPDATE opportunities SET status = 'expired' WHERE status IN ('active', 'paused') AND ends_at < UTC_TIMESTAMP()");
    $sql = "SELECT * FROM opportunities WHERE status = 'active'" . ($onlyId ? " AND id = " . (int)$onlyId : "") . " ORDER BY last_pass_at IS NOT NULL, last_pass_at LIMIT 200";
    $res = $conn->query($sql); $list = []; while ($r = $res->fetch_assoc()) $list[] = $r;
    foreach ($list as $o) {
        if (microtime(true) - $t0 > $budget) break;
        if (!$force && (!opp_in_window($o['market']) || !opp_due($o))) continue;
        $inds = json_decode($o['indicators'], true) ?: [];
        $univ = opp_universe($conn, $o['market']); $n = count($univ); if (!$n) continue;
        $pos = (int)$o['scan_pos']; $pass = (int)$o['pass_no'] + ($pos === 0 ? 1 : 0);
        for (; $pos < $n; $pos++) {
            if (microtime(true) - $t0 > $budget) break;
            $u = $univ[$pos]; $C = opp_candles($u['s'], $o['market'], $o['timeframe']);
            if (!$C || !opp_eval_all($inds, $C)) continue;
            $price = end($C['c']);
            $st = $conn->prepare("INSERT INTO opportunity_hits (opp_id, account_email, symbol, name, price, pass_no, hit_at) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
                ON DUPLICATE KEY UPDATE price = VALUES(price), pass_no = VALUES(pass_no), hit_at = UTC_TIMESTAMP(), name = VALUES(name)");
            $st->bind_param("isssdi", $o['id'], $o['account_email'], $u['s'], $u['n'], $price, $pass); $st->execute(); $st->close();
        }
        $done = $pos >= $n;
        $u = $conn->prepare("UPDATE opportunities SET scan_pos = ?, pass_no = ?, last_run_at = UTC_TIMESTAMP()" . ($done ? ", last_pass_at = UTC_TIMESTAMP()" : "") . " WHERE id = ?");
        $sp = $done ? 0 : $pos; $u->bind_param("iii", $sp, $pass, $o['id']); $u->execute(); $u->close();
        if ($done) $sent += opp_notify($conn, $o['id']);
    }
    return $sent;
}
// إشعار بالأسهم الجديدة (اللي متبعتش عنها قبل كده) - لحد max_sends مرة وبينهم send_gap دقيقة
function opp_notify($conn, $id){
    $st = $conn->prepare("SELECT * FROM opportunities WHERE id = ?"); $st->bind_param("i", $id); $st->execute(); $o = $st->get_result()->fetch_assoc(); $st->close();
    if (!$o || (int)$o['sends_count'] >= (int)$o['max_sends']) return 0;
    if (!empty($o['last_sent_at']) && strtotime($o['last_sent_at'] . ' UTC') > time() - (int)$o['send_gap'] * 60) return 0;
    $h = $conn->prepare("SELECT symbol, name, price FROM opportunity_hits WHERE opp_id = ? AND notified = 0 ORDER BY symbol LIMIT 60"); $h->bind_param("i", $id); $h->execute(); $rs = $h->get_result(); $rows = []; while ($r = $rs->fetch_assoc()) $rows[] = $r; $h->close();
    if (!$rows) return 0;
    $no = (int)$o['sends_count'] + 1; $isBuy = $o['side'] === 'buy';
    $inds = json_decode($o['indicators'], true) ?: [];
    $title = ($isBuy ? '🟢' : '🔴') . ' فرصة ' . (int)$o['opp_no'] . ': ' . count($rows) . ' سهم انطبقت عليه شروط ' . ($isBuy ? 'الشراء' : 'البيع');
    $lines = array_map(fn($r) => '• ' . opp_ltr($r['symbol']) . ($r['name'] && $r['name'] !== $r['symbol'] ? ' — ' . $r['name'] : '') . ' — آخر سعر ' . opp_ltr(rtrim(rtrim(number_format((float)$r['price'], 4, '.', ','), '0'), '.')), $rows);
    $body = implode("\n", $lines) . "\nالمؤشرات: " . implode(' + ', array_map(fn($x) => OPP_NAMES[$x['t']] ?? $x['t'], $inds)) . ' — الإطار ' . (OPP_TF[$o['timeframe']] ?? '') . ".\nتنبيه رقم " . opp_ltr($no) . ' من ' . opp_ltr((int)$o['max_sends']) . ".\n⚠️ ليست توصية استثمارية — مجرد تطبيق للمؤشرات اللي اخترتها على أسعار متأخرة 15 دقيقة.";
    $title = gm_bidi($title); $body = gm_bidi($body);
    // قنوات الفرصة (الموقع / الإيميل) + قنوات المستخدم من الإدارة (بما فيها الواتساب)
    $p = np_get($conn, $o['account_email']);
    if ($p['app'] && (int)$o['ch_app'] === 1) { try { $i = $conn->prepare("INSERT INTO user_alerts (account_email, title, body, symbol, market) VALUES (?, ?, ?, NULL, ?)"); $i->bind_param("ssss", $o['account_email'], $title, $body, $o['market']); $i->execute(); $i->close(); } catch (Throwable $e) {} }
    if ($p['email'] && (int)$o['ch_email'] === 1 && function_exists('griffine_notify')) { try { griffine_notify($conn, $o['account_email'], $title, $title, explode("\n", $body), ['label' => 'فتح الفرص في GRIFFINE', 'url' => MAIL_SITE_URL . '/index.php'], 'opportunity'); } catch (Throwable $e) {} }
    if ($p['wa'] && np_wa_on($conn)) { $ph = np_phone($conn, $o['account_email'], $p); if ($ph !== '') wa_send_notify($conn, $ph, $title . ' — ' . $body); }
    $u = $conn->prepare("UPDATE opportunity_hits SET notified = 1, sent_no = ? WHERE opp_id = ? AND notified = 0"); $u->bind_param("ii", $no, $id); $u->execute(); $u->close();
    $u = $conn->prepare("UPDATE opportunities SET sends_count = sends_count + 1, last_sent_at = UTC_TIMESTAMP() WHERE id = ?"); $u->bind_param("i", $id); $u->execute(); $u->close();
    return 1;
}
function opp_ltr($s){ return "\u{2066}" . $s . "\u{2069}"; }
?>
