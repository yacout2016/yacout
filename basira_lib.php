<?php
/* =====================================================================
   GRIFFINE — basira_lib.php (الإصدار 114) — «بصيرة GRIFFINE AI»: تحليل آلي شامل لأي سهم
   ---------------------------------------------------------------------
   1) الأسعار: شموع يومية لآخر سنتين (نفس مصدر الأسعار المتأخرة في الموقع - opp_candles)
   2) المؤشرات: 12 مؤشر فني + التقاطعات + الدعم والمقاومة + التذبذب
   3) التوقع لكل فترة (أسبوع / شهر / 3 شهور / 6 شهور / سنة): احتمال الصعود والهبوط + النطاق المتوقع
   4) الأخبار: أخبار السهم والسوق (Google News RSS) + تقييم أثر كل خبر (إيجابي / سلبي / محايد)
   5) الذكاء الاصطناعي (اختياري - مفتاح Claude API من لوحة التحكم ← «تحليلات بصيرة AI»):
      بيكتب الرأي والعوامل والسيناريوهات من الأرقام اللي فوق. من غير مفتاح ← محرك آلي بيكتب الرأي من القواعد.
   الطلب للذكاء الاصطناعي HTTP مباشر (cURL) لأن ملفات الموقع بتترفع كملفات مفردة من غير مجلد مكتبات (vendor).
   النتيجة بتتخزن مؤقتًا لكل سهم (افتراضي 60 دقيقة) - فالتحليل الواحد بيتعمل مرة لكل المستخدمين في الفترة دي.
   تحليل آلي تعليمي - مش نصيحة استثمارية.
   ===================================================================== */
require_once __DIR__ . '/quote_lib.php';
require_once __DIR__ . '/opps_lib.php';
defined('BASIRA_NEWS_URL') || define('BASIRA_NEWS_URL', 'https://news.google.com/rss/search');
defined('BASIRA_AI_URL')   || define('BASIRA_AI_URL', 'https://api.anthropic.com/v1/messages');

const BS_MODELS = [
    'claude-opus-5-5'   => 'Claude Opus 5.5 — الأدق (الافتراضي)',
    'claude-sonnet-5-5' => 'Claude Sonnet 5.5 — أسرع وأوفر',
    'claude-haiku-4-5'  => 'Claude Haiku 4.5 — الأوفر',
];
const BS_HORIZONS = [['week', 'أسبوع', 5], ['month', 'شهر', 22], ['3m', '3 شهور', 66], ['6m', '6 شهور', 132], ['year', 'سنة', 252]];
const BS_MARKET_Q = ['مصر' => 'البورصة المصرية', 'السعودية' => 'السوق السعودية تداول', 'الإمارات' => 'سوق دبي المالي أبوظبي', 'قطر' => 'بورصة قطر', 'الكويت' => 'بورصة الكويت'];
const BS_INDEX = ['مصر' => 'EGX30', 'السعودية' => 'تاسي', 'الإمارات' => 'مؤشر سوق دبي', 'قطر' => 'مؤشر بورصة قطر', 'الكويت' => 'مؤشر السوق الأول'];

function bs_ready($conn){
    static $r = null; if ($r !== null) return $r;
    try { $x = $conn->query("SHOW TABLES LIKE 'basira_reports'"); $r = $x && $x->num_rows > 0; } catch (Throwable $e) { $r = false; }
    return $r;
}
function bs_defaults(){
    return [
        'name' => 'بصيرة', 'tagline' => 'تحليل آلي شامل لأي سهم: مؤشرات فنية + ذكاء اصطناعي + أخبار',
        'disclaimer' => 'ده تحليل آلي معتمد على المؤشرات الفنية والذكاء الاصطناعي والأخبار المنشورة، ومش نصيحة استثمارية ولا توصية بالشراء أو البيع. القرار قرارك، وممكن السوق يتحرك عكس أي توقع.',
        'ai_on' => true, 'model' => 'claude-opus-5-5', 'effort' => 'medium', 'ai_daily_max' => 150,
        'cache_min' => 60, 'scan_on' => true, 'scan_max' => 300, 'news_on' => true, 'news_max' => 8, 'watch_max' => 12, 'save_max' => 50, 'share_on' => true, 'plans_on' => true,
        'horizons' => ['week' => true, 'month' => true, '3m' => true, '6m' => true, 'year' => true],
        'ar_names' => '',   // سطر لكل سهم: SYMBOL=الاسم بالعربي (بيكمّل/بيغيّر القائمة الجاهزة)
    ];
}
function bs_cfg($conn){
    $d = bs_defaults();
    $j = json_decode(site_config_get($conn, 'basira_cfg') ?: 'null', true);
    if (is_array($j)) foreach ($d as $k => $v) if (array_key_exists($k, $j)) $d[$k] = is_array($v) ? array_merge($v, is_array($j[$k]) ? $j[$k] : []) : $j[$k];
    $d['cache_min'] = max(5, min(1440, (int)$d['cache_min'])); $d['news_max'] = max(0, min(20, (int)$d['news_max']));
    $d['watch_max'] = max(1, min(30, (int)$d['watch_max'])); $d['save_max'] = max(5, min(200, (int)$d['save_max']));
    $d['ai_daily_max'] = max(0, min(5000, (int)$d['ai_daily_max']));
    $d['scan_max'] = max(20, min(800, (int)$d['scan_max']));   // الإصدار 118: أقصى عدد أسهم في مسح السوق
    if (!isset(BS_MODELS[$d['model']])) $d['model'] = 'claude-opus-5-5';
    if (!in_array($d['effort'], ['low', 'medium', 'high'], true)) $d['effort'] = 'medium';
    return $d;
}
function bs_ar_custom($cfg){
    $m = [];
    foreach (preg_split('/\r?\n/', (string)$cfg['ar_names']) as $ln) {
        if (!preg_match('/^\s*([A-Za-z0-9.\-]{1,20})\s*[=:]\s*(.{1,80})$/u', $ln, $x)) continue;
        $m[strtoupper($x[1])] = trim($x[2]);
    }
    return $m;
}

// أسماء الأسهم بالعربي: القائمة الجاهزة (basira_names.json) + اللي الأدمن أضافه (بيغلب) - السيرفر هو اللي بيحدد الاسم (مش المتصفح)
function bs_names($cfg){
    static $base = null;
    if ($base === null) { $j = json_decode((string)@file_get_contents(__DIR__ . '/basira_names.json'), true); $base = is_array($j) ? $j : []; }
    $out = $base; $out['*'] = bs_ar_custom($cfg);
    return $out;
}
function bs_arname($cfg, $sym, $market){
    $n = bs_names($cfg); $s = strtoupper($sym);
    return $n['*'][$s] ?? ($n[$market][$s] ?? '');
}

/* ---------- المؤشرات ---------- */
function bs_last($a){ for ($i = count($a) - 1; $i >= 0; $i--) if ($a[$i] !== null) return $a[$i]; return null; }
function bs_round($a, $d = 4){ return array_map(fn($v) => $v === null ? null : round($v, $d), $a); }
function bs_compute($sym, $market){
    $C = opp_candles($sym, $market, '1d');
    if (!$C || count($C['c']) < 60) return ['ok' => false, 'message' => 'مفيش بيانات أسعار كفاية للسهم ده (محتاجين 60 يوم تداول على الأقل) — اتأكد من الرمز والبورصة.'];
    $n = count($C['c']); $c = $C['c']; $h = $C['h']; $l = $C['l']; $v = $C['v']; $L = $n - 1; $last = $c[$L]; $prev = $c[$L - 1];
    $s20 = opp_sma($c, 20); $s50 = opp_sma($c, 50); $s200 = $n >= 200 ? opp_sma($c, 200) : array_fill(0, $n, null);
    $e12 = opp_ema($c, 12); $e26 = opp_ema($c, 26);
    $macd = array_map(fn($a, $b) => ($a === null || $b === null) ? null : $a - $b, $e12, $e26);
    $sig = opp_ema(array_map(fn($x) => $x ?? 0, $macd), 9); foreach ($macd as $i => $x) if ($x === null) $sig[$i] = null;
    $hist = array_map(fn($a, $b) => ($a === null || $b === null) ? null : $a - $b, $macd, $sig);
    $rsi = opp_rsi($c, 14);
    $bbU = []; $bbL = [];
    foreach ($c as $i => $x) { if ($s20[$i] === null) { $bbU[] = null; $bbL[] = null; continue; } $sd = opp_std($c, 20, $i); $bbU[] = $s20[$i] + 2 * $sd; $bbL[] = $s20[$i] - 2 * $sd; }
    // ستوكاستيك 14 / 3
    $K = array_fill(0, $n, null);
    for ($i = 13; $i < $n; $i++) { $hh = max(array_slice($h, $i - 13, 14)); $ll = min(array_slice($l, $i - 13, 14)); $K[$i] = $hh > $ll ? ($c[$i] - $ll) / ($hh - $ll) * 100 : 50; }
    $Dk = opp_sma(array_map(fn($x) => $x ?? 0, $K), 3);
    // ويليامز %R
    $wr = $K[$L] !== null ? $K[$L] - 100 : null;
    // CCI 20
    $tp = array_map(fn($a, $b, $x) => ($a + $b + $x) / 3, $h, $l, $c); $tpS = opp_sma($tp, 20);
    $md = 0; for ($i = $L - 19; $i <= $L; $i++) $md += abs($tp[$i] - $tpS[$L]); $md /= 20;
    $cci = $md > 0 ? ($tp[$L] - $tpS[$L]) / (0.015 * $md) : 0;
    // ATR + ADX 14
    $tr = [0]; $pdm = [0]; $ndm = [0];
    for ($i = 1; $i < $n; $i++) { $tr[] = max($h[$i] - $l[$i], abs($h[$i] - $c[$i - 1]), abs($l[$i] - $c[$i - 1])); $up = $h[$i] - $h[$i - 1]; $dn = $l[$i - 1] - $l[$i]; $pdm[] = ($up > $dn && $up > 0) ? $up : 0; $ndm[] = ($dn > $up && $dn > 0) ? $dn : 0; }
    $atr = array_sum(array_slice($tr, 1, 14)) / 14; $sp = array_sum(array_slice($pdm, 1, 14)); $sn = array_sum(array_slice($ndm, 1, 14)); $st = array_sum(array_slice($tr, 1, 14)); $dx = []; $pdi = $ndi = 0;
    for ($i = 15; $i < $n; $i++) { $atr = ($atr * 13 + $tr[$i]) / 14; $st = $st - $st / 14 + $tr[$i]; $sp = $sp - $sp / 14 + $pdm[$i]; $sn = $sn - $sn / 14 + $ndm[$i];
        $pdi = $st > 0 ? 100 * $sp / $st : 0; $ndi = $st > 0 ? 100 * $sn / $st : 0; $dx[] = ($pdi + $ndi) > 0 ? 100 * abs($pdi - $ndi) / ($pdi + $ndi) : 0; }
    $adx = count($dx) >= 14 ? array_sum(array_slice($dx, -14)) / 14 : null;
    // OBV
    $obv = [0]; for ($i = 1; $i < $n; $i++) $obv[] = $obv[$i - 1] + ($c[$i] > $c[$i - 1] ? $v[$i] : ($c[$i] < $c[$i - 1] ? -$v[$i] : 0));
    $obvS = opp_sma($obv, 20);
    $vAvg = array_sum(array_slice($v, -20)) / 20; $vr = $vAvg > 0 ? $v[$L] / $vAvg * 100 : null;
    // التذبذب (انحراف العائد اليومي لآخر 60 يوم)
    $ret = []; for ($i = max(1, $n - 60); $i < $n; $i++) if ($c[$i - 1] > 0) $ret[] = log($c[$i] / $c[$i - 1]);
    $mu = array_sum($ret) / max(1, count($ret)); $var = 0; foreach ($ret as $r) $var += ($r - $mu) ** 2; $sigma = sqrt($var / max(1, count($ret) - 1));

    $sg = fn($x) => $x > 0 ? 1 : ($x < 0 ? -1 : 0);
    $I = [];
    $r14 = $rsi[$L];
    $I[] = ['key' => 'rsi', 'name' => 'RSI (14)', 'value' => $r14, 's' => $r14 < 30 ? 1 : ($r14 > 70 ? -1 : ($r14 > 55 ? 1 : ($r14 < 45 ? -1 : 0))), 'note' => $r14 < 30 ? 'تشبع بيعي — احتمال ارتداد' : ($r14 > 70 ? 'تشبع شرائي — احتمال تصحيح' : ($r14 > 55 ? 'زخم إيجابي' : ($r14 < 45 ? 'زخم سلبي' : 'منطقة متوازنة')))];
    $I[] = ['key' => 'macd', 'name' => 'MACD (12, 26, 9)', 'value' => $macd[$L], 's' => $sg($macd[$L] - $sig[$L]), 'note' => $macd[$L] > $sig[$L] ? 'فوق خط الإشارة — زخم صاعد' : 'تحت خط الإشارة — زخم هابط'];
    $I[] = ['key' => 'sma20', 'name' => 'المتوسط المتحرك 20', 'value' => $s20[$L], 's' => $sg($last - $s20[$L]), 'note' => $last > $s20[$L] ? 'السعر فوقه — اتجاه قصير صاعد' : 'السعر تحته — اتجاه قصير هابط'];
    $I[] = ['key' => 'sma50', 'name' => 'المتوسط المتحرك 50', 'value' => $s50[$L], 's' => $sg($last - $s50[$L]), 'note' => $last > $s50[$L] ? 'السعر فوقه — اتجاه متوسط صاعد' : 'السعر تحته — اتجاه متوسط هابط'];
    if ($s200[$L] !== null) $I[] = ['key' => 'sma200', 'name' => 'المتوسط المتحرك 200', 'value' => $s200[$L], 's' => $sg($last - $s200[$L]), 'note' => $last > $s200[$L] ? 'فوق متوسط السنة — اتجاه طويل صاعد' : 'تحت متوسط السنة — اتجاه طويل هابط'];
    $bbPos = ($bbU[$L] - $bbL[$L]) > 0 ? ($last - $bbL[$L]) / ($bbU[$L] - $bbL[$L]) * 100 : 50;
    $I[] = ['key' => 'bb', 'name' => 'بولينجر باند (20, 2)', 'value' => $bbPos, 's' => $last < $bbL[$L] ? 1 : ($last > $bbU[$L] ? -1 : 0), 'note' => $last < $bbL[$L] ? 'تحت الحد السفلي — احتمال ارتداد' : ($last > $bbU[$L] ? 'فوق الحد العلوي — احتمال تصحيح' : 'موقع السعر جوه النطاق (%)')];
    $I[] = ['key' => 'stoch', 'name' => 'ستوكاستيك (14, 3)', 'value' => $K[$L], 's' => $K[$L] < 20 ? 1 : ($K[$L] > 80 ? -1 : $sg($K[$L] - $Dk[$L])), 'note' => $K[$L] < 20 ? 'تشبع بيعي' : ($K[$L] > 80 ? 'تشبع شرائي' : ($K[$L] > $Dk[$L] ? '%K فوق %D' : '%K تحت %D'))];
    if ($adx !== null) $I[] = ['key' => 'adx', 'name' => 'ADX (14)', 'value' => $adx, 's' => $adx > 25 ? $sg($pdi - $ndi) : 0, 'note' => $adx > 25 ? ($pdi > $ndi ? 'اتجاه قوي صاعد' : 'اتجاه قوي هابط') : 'اتجاه ضعيف / عرضي'];
    $I[] = ['key' => 'cci', 'name' => 'CCI (20)', 'value' => $cci, 's' => $cci < -100 ? 1 : ($cci > 100 ? -1 : $sg($cci)), 'note' => $cci < -100 ? 'تشبع بيعي' : ($cci > 100 ? 'تشبع شرائي' : 'انحراف السعر عن متوسطه')];
    $I[] = ['key' => 'wr', 'name' => 'Williams %R (14)', 'value' => $wr, 's' => $wr < -80 ? 1 : ($wr > -20 ? -1 : 0), 'note' => $wr < -80 ? 'تشبع بيعي' : ($wr > -20 ? 'تشبع شرائي' : 'منطقة متوسطة')];
    $I[] = ['key' => 'obv', 'name' => 'OBV (تدفق السيولة)', 'value' => $obv[$L], 's' => $sg($obv[$L] - $obvS[$L]), 'note' => $obv[$L] > $obvS[$L] ? 'سيولة داخلة' : 'سيولة خارجة'];
    $I[] = ['key' => 'vol', 'name' => 'حجم التداول', 'value' => $vr, 's' => ($vr !== null && $vr > 120) ? $sg($last - $prev) : 0, 'note' => '% من متوسط 20 يوم' . (($vr !== null && $vr > 120) ? ($last >= $prev ? ' — حجم عالي مع صعود' : ' — حجم عالي مع هبوط') : '')];
    $pos = count(array_filter($I, fn($x) => $x['s'] > 0)); $neg = count(array_filter($I, fn($x) => $x['s'] < 0)); $cnt = count($I);
    $score = (int)round(50 + ($pos - $neg) / $cnt * 50);

    // التقاطعات (آخر 90 جلسة)
    $X = []; $from = max(1, $n - 90);
    for ($i = $from; $i < $n; $i++) {
        $d = fn($a, $b, $j) => ($a[$j] === null || $b[$j] === null) ? null : $a[$j] - $b[$j];
        $p0 = $d($s50, $s200, $i - 1); $p1 = $d($s50, $s200, $i);
        if ($p0 !== null && $p1 !== null && $p0 < 0 && $p1 >= 0) $X[] = ['i' => $i, 't' => 'تقاطع ذهبي', 'd' => 'المتوسط 50 عدّى فوق المتوسط 200', 'k' => 'pos'];
        if ($p0 !== null && $p1 !== null && $p0 > 0 && $p1 <= 0) $X[] = ['i' => $i, 't' => 'تقاطع الموت', 'd' => 'المتوسط 50 نزل تحت المتوسط 200', 'k' => 'neg'];
        $m0 = $d($macd, $sig, $i - 1); $m1 = $d($macd, $sig, $i);
        if ($m0 !== null && $m1 !== null && $m0 < 0 && $m1 >= 0) $X[] = ['i' => $i, 't' => 'MACD إيجابي', 'd' => 'خط MACD عدّى فوق خط الإشارة', 'k' => 'pos'];
        if ($m0 !== null && $m1 !== null && $m0 > 0 && $m1 <= 0) $X[] = ['i' => $i, 't' => 'MACD سلبي', 'd' => 'خط MACD نزل تحت خط الإشارة', 'k' => 'neg'];
        if ($s50[$i - 1] !== null && $c[$i - 1] < $s50[$i - 1] && $c[$i] >= $s50[$i]) $X[] = ['i' => $i, 't' => 'اختراق المتوسط 50', 'd' => 'السعر قفل فوق المتوسط 50', 'k' => 'pos'];
        if ($s50[$i - 1] !== null && $c[$i - 1] > $s50[$i - 1] && $c[$i] <= $s50[$i]) $X[] = ['i' => $i, 't' => 'كسر المتوسط 50', 'd' => 'السعر قفل تحت المتوسط 50', 'k' => 'neg'];
        if ($rsi[$i - 1] !== null && $rsi[$i - 1] < 30 && $rsi[$i] >= 30) $X[] = ['i' => $i, 't' => 'خروج RSI من التشبع البيعي', 'd' => 'RSI طلع فوق 30', 'k' => 'pos'];
        if ($rsi[$i - 1] !== null && $rsi[$i - 1] > 70 && $rsi[$i] <= 70) $X[] = ['i' => $i, 't' => 'خروج RSI من التشبع الشرائي', 'd' => 'RSI نزل تحت 70', 'k' => 'neg'];
    }
    $X = array_slice($X, -6);
    foreach ($X as &$x) { $x['days'] = $L - $x['i']; $x['date'] = gmdate('Y-m-d', $C['t'][$x['i']]); } unset($x);

    // الدعم والمقاومة (آخر 22 جلسة)
    $hi = max(array_slice($h, -22)); $lo = min(array_slice($l, -22)); $P = ($hi + $lo + $last) / 3;
    $lv = ['s2' => $P - ($hi - $lo), 's1' => 2 * $P - $hi, 'p' => $P, 'r1' => 2 * $P - $lo, 'r2' => $P + ($hi - $lo)];

    // التوقع لكل فترة: الاتجاه القصير (RSI/MACD/ستوكاستيك/20) للفترات القصيرة، والطويل (50/200/أداء السنة) للفترات الطويلة
    $short = 0; foreach ($I as $x) if (in_array($x['key'], ['rsi', 'macd', 'stoch', 'sma20', 'cci', 'wr', 'obv'], true)) $short += $x['s'];
    $long = 0; foreach ($I as $x) if (in_array($x['key'], ['sma50', 'sma200', 'adx'], true)) $long += $x['s'];
    $y1 = $n > 252 ? ($last / $c[$n - 253] - 1) : ($last / $c[0] - 1);
    $H = [];
    foreach (BS_HORIZONS as $k => [$key, $lab, $days]) {
        $wS = [0.75, 0.6, 0.4, 0.3, 0.2][$k]; $wL = 1 - $wS;
        $tilt = $wS * ($short / 7) * 22 + $wL * ($long / 3) * 22 + ($k >= 3 ? max(-6, min(6, $y1 * 20)) : 0);
        $up = (int)max(10, min(90, round(50 + $tilt)));
        $vol = $sigma * sqrt($days);
        $H[] = ['key' => $key, 'label' => $lab, 'days' => $days, 'up' => $up, 'dn' => 100 - $up, 'verdict' => $up >= 58 ? 'شراء' : ($up <= 42 ? 'بيع' : 'تعادل'),
            'lo' => $last * exp(-$vol * (1.1 - ($up - 50) / 120)), 'hi' => $last * exp($vol * (1.1 + ($up - 50) / 120))];
    }
    $keep = min(260, $n); $o = $n - $keep;
    return ['ok' => true, 'symbol' => $sym, 'market' => $market, 'last' => $last, 'prev' => $prev, 'chg' => $prev > 0 ? ($last / $prev - 1) * 100 : 0,
        'hi22' => $hi, 'lo22' => $lo, 'y1' => $y1 * 100, 'vol' => $sigma * 100, 'rsiNow' => $r14, 'atr' => $atr,
        'inds' => array_map(fn($x) => $x + ['value' => $x['value']], $I), 'pos' => $pos, 'neg' => $neg, 'neu' => $cnt - $pos - $neg, 'score' => $score,
        'cross' => array_map(fn($x) => ['t' => $x['t'], 'd' => $x['d'], 'k' => $x['k'], 'days' => $x['days'], 'date' => $x['date'], 'at' => $x['i'] - $o], $X),
        'levels' => $lv, 'horizons' => $H,
        'chart' => ['t' => array_slice($C['t'], $o), 'c' => bs_round(array_slice($c, $o)), 'v' => array_map('intval', array_slice($v, $o)),
            's20' => bs_round(array_slice($s20, $o)), 's50' => bs_round(array_slice($s50, $o)), 's200' => bs_round(array_slice($s200, $o)),
            'bbU' => bs_round(array_slice($bbU, $o)), 'bbL' => bs_round(array_slice($bbL, $o)), 'rsi' => bs_round(array_slice($rsi, $o), 2),
            'macd' => bs_round(array_slice($macd, $o)), 'sig' => bs_round(array_slice($sig, $o)), 'hist' => bs_round(array_slice($hist, $o))],
    ];
}

/* ---------- الأخبار ---------- */
const BS_POS_WORDS = ['ارتفاع', 'يرتفع', 'ترتفع', 'صعود', 'يصعد', 'نمو', 'ينمو', 'أرباح', 'ربح', 'قفزة', 'مكاسب', 'توزيع', 'كوبون', 'ترقية', 'رفع', 'قياسي', 'تحسن', 'إيجابي', 'صفقة', 'استحواذ', 'توسع', 'يتصدر',
    'surge', 'rise', 'rises', 'gain', 'gains', 'profit', 'upgrade', 'beat', 'record', 'dividend', 'growth', 'jump', 'rally', 'higher', 'expands', 'wins'];
const BS_NEG_WORDS = ['تراجع', 'يتراجع', 'تتراجع', 'هبوط', 'يهبط', 'خسائر', 'خسارة', 'انخفاض', 'ينخفض', 'خفض', 'ضغوط', 'غرامة', 'سلبي', 'تحقيق', 'دعوى', 'تعثر', 'أزمة', 'انكماش', 'تخارج', 'بيع مكثف', 'تحذير',
    'fall', 'falls', 'drop', 'drops', 'loss', 'losses', 'downgrade', 'miss', 'cut', 'decline', 'plunge', 'lower', 'fine', 'lawsuit', 'probe', 'slump', 'warning'];
function bs_sentiment($t){
    $s = mb_strtolower($t); $p = 0; $n = 0;
    foreach (BS_POS_WORDS as $w) if (mb_strpos($s, $w) !== false) $p++;
    foreach (BS_NEG_WORDS as $w) if (mb_strpos($s, $w) !== false) $n++;
    return $p > $n ? 'pos' : ($n > $p ? 'neg' : 'neu');
}
function bs_rss($q, $max){
    $url = BASIRA_NEWS_URL . '?q=' . rawurlencode($q) . '&hl=ar&gl=EG&ceid=EG:ar';
    $f = opp_cache_dir() . '/' . md5('bsn1|' . $url) . '.json';
    if (is_file($f) && time() - filemtime($f) < 2 * 3600) { $j = json_decode((string)@file_get_contents($f), true); if (is_array($j)) return array_slice($j, 0, $max); }
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; GRIFFINE/1.0; +https://griffine.store)']);
    $body = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    if ($body === false || $code >= 400) return [];
    $prev = libxml_use_internal_errors(true);
    $x = @simplexml_load_string($body, 'SimpleXMLElement', LIBXML_NOCDATA | LIBXML_NONET);
    libxml_use_internal_errors($prev);
    if (!$x || !isset($x->channel->item)) return [];
    $out = [];
    foreach ($x->channel->item as $it) {
        $link = trim((string)$it->link); $title = trim(html_entity_decode(strip_tags((string)$it->title), ENT_QUOTES, 'UTF-8'));
        if (!$title || !preg_match('#^https?://#i', $link)) continue;
        $src = trim((string)$it->source);
        if ($src && mb_substr($title, -mb_strlen($src) - 3) === ' - ' . $src) $title = trim(mb_substr($title, 0, -mb_strlen($src) - 3));
        $ts = strtotime((string)$it->pubDate) ?: null;
        $out[] = ['t' => mb_substr($title, 0, 220), 'url' => $link, 'src' => mb_substr($src ?: parse_url($link, PHP_URL_HOST), 0, 60), 'at' => $ts ? gmdate('c', $ts) : null, 'm' => bs_sentiment($title)];
        if (count($out) >= 20) break;
    }
    @file_put_contents($f, json_encode($out, JSON_UNESCAPED_UNICODE));
    return array_slice($out, 0, $max);
}
function bs_news($sym, $market, $name, $arName, $max){
    if ($max <= 0) return [];
    $q1 = trim(($arName ?: '') . ' OR ' . $sym . ($name && strcasecmp($name, $sym) ? ' OR "' . $name . '"' : ''), ' OR');
    $a = array_map(fn($x) => $x + ['k' => 'stock'], bs_rss($q1 . ' سهم', max(3, (int)ceil($max * 0.6))));
    $b = array_map(fn($x) => $x + ['k' => 'market'], bs_rss(BS_MARKET_Q[$market] ?? 'البورصة', max(2, $max - count($a))));
    $seen = []; $out = [];
    foreach (array_merge($a, $b) as $x) { $k = md5($x['t']); if (isset($seen[$k])) continue; $seen[$k] = 1; $out[] = $x; }
    return array_slice($out, 0, $max);
}

/* ---------- الذكاء الاصطناعي (Claude API) ---------- */
function bs_ai_counter($inc = false){
    $f = opp_cache_dir() . '/bs_ai_' . gmdate('Ymd') . '.cnt'; $n = is_file($f) ? (int)@file_get_contents($f) : 0;
    if ($inc) @file_put_contents($f, (string)(++$n));
    return $n;
}
function bs_ai_schema(){
    $str = ['type' => 'string'];
    $scen = ['type' => 'object', 'properties' => ['prob' => ['type' => 'integer'], 'text' => $str], 'required' => ['prob', 'text'], 'additionalProperties' => false];
    return ['type' => 'object', 'additionalProperties' => false,
        'required' => ['opinion', 'positives', 'negatives', 'bull', 'base', 'bear', 'horizons', 'news_summary', 'market_view'],
        'properties' => [
            'opinion' => $str, 'positives' => ['type' => 'array', 'items' => $str], 'negatives' => ['type' => 'array', 'items' => $str],
            'bull' => $scen, 'base' => $scen, 'bear' => $scen,
            'horizons' => ['type' => 'array', 'items' => ['type' => 'object', 'additionalProperties' => false, 'required' => ['key', 'up', 'note'],
                'properties' => ['key' => ['type' => 'string', 'enum' => ['week', 'month', '3m', '6m', 'year']], 'up' => ['type' => 'integer'], 'note' => $str]]],
            'news_summary' => $str, 'market_view' => $str,
        ]];
}
/* طلب واحد للـ Messages API - بيرجّع [مصفوفة الرأي أو null, رسالة خطأ] */
function bs_ai_call($key, $model, $effort, $system, $user, $maxTokens = 16000, $schema = null){
    $body = ['model' => $model, 'max_tokens' => $maxTokens, 'system' => $system,
        'messages' => [['role' => 'user', 'content' => $user]],
        'output_config' => ['format' => ['type' => 'json_schema', 'schema' => $schema ?: bs_ai_schema()]]];
    $hdr = ['Content-Type: application/json', 'x-api-key: ' . $key, 'anthropic-version: 2023-06-01'];
    if ($model !== 'claude-haiku-4-5') {
        $body['output_config']['effort'] = $effort;
        // لو مصنّف الأمان رفض الطلب ← السيرفر بيعيده تلقائيًا على موديل بديل مناسب
        $body['fallbacks'] = 'default'; $hdr[] = 'anthropic-beta: server-side-fallback-2026-07-01';
    }
    $ch = curl_init(BASIRA_AI_URL);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => $hdr, CURLOPT_TIMEOUT => 110, CURLOPT_CONNECTTIMEOUT => 10]);
    $raw = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
    if ($raw === false) return [null, 'تعذّر الاتصال بخدمة الذكاء الاصطناعي: ' . $err];
    $j = json_decode($raw, true);
    if ($code >= 400 || !is_array($j)) {
        $msg = is_array($j) ? ($j['error']['message'] ?? '') : '';
        $t = is_array($j) ? ($j['error']['type'] ?? '') : '';
        $ar = ['authentication_error' => 'مفتاح Claude API غير صحيح.', 'permission_error' => 'المفتاح مالوش صلاحية على الموديل ده.', 'rate_limit_error' => 'تم تجاوز حد الطلبات مؤقتًا.', 'overloaded_error' => 'الخدمة مشغولة حاليًا.', 'not_found_error' => 'الموديل غير متاح لهذا المفتاح.'];
        return [null, ($ar[$t] ?? 'خطأ من خدمة الذكاء الاصطناعي') . ($msg ? ' (' . mb_substr($msg, 0, 160) . ')' : '') . " [HTTP $code]"];
    }
    if (($j['stop_reason'] ?? '') === 'refusal') return [null, 'خدمة الذكاء الاصطناعي رفضت الطلب.'];
    if (($j['stop_reason'] ?? '') === 'max_tokens') return [null, 'رد الذكاء الاصطناعي اتقطع.'];
    $txt = '';
    foreach (($j['content'] ?? []) as $b) if (($b['type'] ?? '') === 'text') $txt .= $b['text'];
    $o = json_decode($txt, true);
    if (!is_array($o)) return [null, 'رد الذكاء الاصطناعي مش بالشكل المتوقع.'];
    return [$o, '', $j['model'] ?? $model];
}
function bs_ai_opinion($conn, $cfg, $A, $news, $names){
    $key = site_config_get($conn, 'basira_ai_key');
    if (empty($cfg['ai_on']) || $key === '') return null;
    if ($cfg['ai_daily_max'] > 0 && bs_ai_counter() >= $cfg['ai_daily_max']) return ['error' => 'وصلنا للحد اليومي لطلبات الذكاء الاصطناعي — الرأي اتكتب بالمحرك الآلي.'];
    $sum = ['symbol' => $A['symbol'], 'name' => $names, 'market' => $A['market'], 'last_price' => round($A['last'], 4), 'change_today_pct' => round($A['chg'], 2),
        'change_1y_pct' => round($A['y1'], 2), 'daily_volatility_pct' => round($A['vol'], 2), 'high_22d' => round($A['hi22'], 4), 'low_22d' => round($A['lo22'], 4),
        'indicators' => array_map(fn($x) => ['name' => $x['name'], 'value' => $x['value'] === null ? null : round($x['value'], 2), 'signal' => $x['s'] > 0 ? 'positive' : ($x['s'] < 0 ? 'negative' : 'neutral'), 'note' => $x['note']], $A['inds']),
        'score_0_100' => $A['score'], 'crossovers_recent' => array_map(fn($x) => $x['t'] . ' (' . $x['days'] . ' days ago)', $A['cross']),
        'support_resistance' => array_map(fn($v) => round($v, 4), $A['levels']),
        'rule_based_horizons' => array_map(fn($h) => ['key' => $h['key'], 'up_probability' => $h['up']], $A['horizons']),
        'news' => array_map(fn($n) => ['title' => $n['t'], 'source' => $n['src'], 'type' => $n['k'], 'tone' => $n['m']], $news)];
    $system = 'أنت محلل مالي آلي داخل منصة GRIFFINE. بتكتب تحليل تعليمي لسهم واحد بالعربية الفصحى المبسطة، معتمد فقط على البيانات اللي في رسالة المستخدم (مؤشرات فنية محسوبة وأخبار منشورة). '
        . 'متخترعش أرقام أو أخبار مش موجودة، ولو البيانات مش كفاية قول كده. التحليل مش نصيحة استثمارية - متستخدمش صيغة أمر (زي اشتري/بيع دلوقتي)، واستخدم لغة احتمالات. '
        . 'opinion: فقرة من 3 لـ 5 جمل عن الصورة العامة. positives وnegatives: من 3 لـ 5 نقاط قصيرة. bull/base/bear: احتمالات مجموعها 100 ونص قصير فيه مستوى سعري من الدعم والمقاومة. '
        . 'horizons: لكل فترة (week, month, 3m, 6m, year) احتمال الصعود من 5 لـ 95 وملاحظة قصيرة - ابدأ من rule_based_horizons وعدّل بحد أقصى 15 نقطة لو الأخبار أو السياق يستدعي. '
        . 'news_summary: جملتين عن أثر الأخبار. market_view: جملتين عن موقف السوق العام من البيانات المتاحة.';
    bs_ai_counter(true);
    $r = bs_ai_call($key, $cfg['model'], $cfg['effort'], $system, "بيانات السهم (JSON):\n" . json_encode($sum, JSON_UNESCAPED_UNICODE));
    if (!$r[0]) return ['error' => $r[1]];
    $o = $r[0]; $cl = fn($s, $n = 900) => mb_substr(trim(strip_tags((string)$s)), 0, $n);
    $list = fn($a) => array_values(array_slice(array_filter(array_map(fn($x) => $cl($x, 220), is_array($a) ? $a : [])), 0, 6));
    $sc = fn($x) => ['prob' => max(0, min(100, (int)($x['prob'] ?? 0))), 'text' => $cl($x['text'] ?? '', 260)];
    $hz = []; foreach ((is_array($o['horizons'] ?? null) ? $o['horizons'] : []) as $h) if (isset($h['key'])) $hz[$h['key']] = ['up' => max(5, min(95, (int)($h['up'] ?? 50))), 'note' => $cl($h['note'] ?? '', 200)];
    return ['opinion' => $cl($o['opinion'] ?? ''), 'positives' => $list($o['positives'] ?? []), 'negatives' => $list($o['negatives'] ?? []),
        'bull' => $sc($o['bull'] ?? []), 'base' => $sc($o['base'] ?? []), 'bear' => $sc($o['bear'] ?? []), 'horizons' => $hz,
        'news_summary' => $cl($o['news_summary'] ?? '', 500), 'market_view' => $cl($o['market_view'] ?? '', 500), 'model' => $r[2] ?? $cfg['model']];
}

/* ---------- المحرك الآلي (من غير ذكاء اصطناعي) ---------- */
function bs_rule_opinion($A, $news){
    $f = fn($v) => number_format($v, 2, '.', ',');
    $v = $A['score'] >= 58 ? 'إيجابية' : ($A['score'] <= 42 ? 'سلبية' : 'محايدة');
    $I = []; foreach ($A['inds'] as $x) $I[$x['key']] = $x;
    $above200 = isset($I['sma200']) ? $I['sma200']['s'] > 0 : null;
    $mom = ($I['macd']['s'] ?? 0) > 0;
    $pN = count(array_filter($news, fn($n) => $n['m'] === 'pos')); $nN = count(array_filter($news, fn($n) => $n['m'] === 'neg'));
    $op = 'بعد حساب ' . count($A['inds']) . ' مؤشر فني' . ($news ? ' وقراءة ' . count($news) . ' خبر' : '') . '، الصورة العامة للسهم ' . $v . ' (' . $A['pos'] . ' مؤشرات إيجابية مقابل ' . $A['neg'] . ' سلبية). '
        . ($above200 === null ? '' : 'السعر ' . ($above200 ? 'فوق' : 'تحت') . ' متوسط الـ200 يوم، ') . ($mom ? 'والزخم بيتحسن (MACD فوق خط الإشارة). ' : 'والزخم ضعيف (MACD تحت خط الإشارة). ')
        . 'أقرب دعم عند ' . $f($A['levels']['s1']) . ' وأقرب مقاومة عند ' . $f($A['levels']['r1']) . '، واختراق المقاومة بحجم تداول عالي يقوّي السيناريو الإيجابي، وكسر الدعم يضعفه.';
    $pos = []; $negs = [];
    foreach ($A['inds'] as $x) { if ($x['s'] > 0 && count($pos) < 4) $pos[] = $x['name'] . ': ' . $x['note']; if ($x['s'] < 0 && count($negs) < 4) $negs[] = $x['name'] . ': ' . $x['note']; }
    foreach ($A['cross'] as $x) { if ($x['k'] === 'pos' && count($pos) < 5) $pos[] = $x['t'] . ' من ' . $x['days'] . ' جلسة'; if ($x['k'] === 'neg' && count($negs) < 5) $negs[] = $x['t'] . ' من ' . $x['days'] . ' جلسة'; }
    if ($nN) $negs[] = 'فيه ' . $nN . ' خبر سلبي ممكن يضغط على السعر'; if ($pN) $pos[] = 'فيه ' . $pN . ' خبر إيجابي عن السهم أو السوق';
    if (!$negs) $negs[] = 'تقلبات السوق العام وأسعار الفائدة ممكن تغيّر الاتجاه';
    $m = $A['horizons'][1]['up'] ?? 50; $bull = (int)round($m * 0.55); $bear = (int)round((100 - $m) * 0.55);
    return ['opinion' => $op, 'positives' => $pos ?: ['مفيش إشارات إيجابية واضحة حاليًا'], 'negatives' => $negs,
        'bull' => ['prob' => $bull, 'text' => 'استهداف ' . $f($A['levels']['r2']) . ' لو اخترق ' . $f($A['levels']['r1'])],
        'base' => ['prob' => 100 - $bull - $bear, 'text' => 'تداول بين ' . $f($A['levels']['s1']) . ' و ' . $f($A['levels']['r1'])],
        'bear' => ['prob' => $bear, 'text' => 'ارتداد لـ ' . $f($A['levels']['s2']) . ' لو كسر ' . $f($A['levels']['s1'])],
        'horizons' => [], 'news_summary' => $news ? "الأخبار: $pN إيجابي و $nN سلبي و " . (count($news) - $pN - $nN) . ' محايد.' : 'مفيش أخبار متاحة حاليًا.',
        'market_view' => '', 'model' => null];
}

/* ---------- التحليل الكامل (بالتخزين المؤقت) ---------- */
// ملف التخزين: بيتغير لو الأدمن غيّر أي إعداد أو المفتاح (فالتغيير يبان فورًا)
function bs_cache_file($conn, $sym, $market){
    $cfg = bs_cfg($conn);
    $sig = md5(json_encode([$cfg, md5(site_config_get($conn, 'basira_ai_key'))]));   // أي تعديل في الإعدادات أو المفتاح ← تحليل جديد
    return opp_cache_dir() . '/' . md5("bs3|$sym|$market|$sig") . '.json';
}
function bs_analyze($conn, $sym, $market, $arName = '', $fresh = false){
    $cfg = bs_cfg($conn);
    $f = bs_cache_file($conn, $sym, $market);
    if (is_file($f)) {
        $age = time() - filemtime($f);
        if ($age < $cfg['cache_min'] * 60 && !($fresh && $age > 600)) { $j = json_decode((string)@file_get_contents($f), true); if (is_array($j) && !empty($j['ok'])) { $j['cached'] = true; return $j; } }
    }
    $A = bs_compute($sym, $market);
    if (empty($A['ok'])) return $A;
    $q = mq_get_quote($sym, $market, 'day');
    $name = !empty($q['success']) ? (string)($q['name'] ?? '') : '';
    if (!empty($q['success']) && (float)$q['last'] > 0) { $A['last'] = (float)$q['last']; if (!empty($q['prevClose'])) { $A['prev'] = (float)$q['prevClose']; $A['chg'] = ($A['last'] / $A['prev'] - 1) * 100; } }
    $A['name'] = $name; $A['arName'] = $arName; $A['currency'] = !empty($q['success']) ? ($q['currency'] ?? '') : '';
    $A['news'] = !empty($cfg['news_on']) ? bs_news($sym, $market, $name, $arName, $cfg['news_max']) : [];
    $ai = bs_ai_opinion($conn, $cfg, $A, $A['news'], trim($arName . ' ' . $name));
    $rule = bs_rule_opinion($A, $A['news']);
    if (is_array($ai) && empty($ai['error'])) {
        $A['ai'] = $ai + ['source' => 'ai'];
        foreach ($A['horizons'] as &$h) if (isset($ai['horizons'][$h['key']])) {   // الذكاء الاصطناعي بيعدّل الاحتمال بحد أقصى 15 نقطة
            $up = max($h['up'] - 15, min($h['up'] + 15, $ai['horizons'][$h['key']]['up'])); $h['up'] = $up; $h['dn'] = 100 - $up;
            $h['verdict'] = $up >= 58 ? 'شراء' : ($up <= 42 ? 'بيع' : 'تعادل'); $h['note'] = $ai['horizons'][$h['key']]['note'];
        } unset($h);
        if ($A['ai']['market_view'] === '') $A['ai']['market_view'] = $rule['market_view'];
    } else {
        $A['ai'] = $rule + ['source' => 'rules', 'aiError' => is_array($ai) ? ($ai['error'] ?? '') : ''];
    }
    $A['verdict'] = $A['score'] >= 58 ? 'صاعد — إيجابي' : ($A['score'] <= 42 ? 'هابط — سلبي' : 'محايد — عرضي');
    $A['at'] = gmdate('c'); $A['cached'] = false;
    @file_put_contents($f, json_encode($A, JSON_UNESCAPED_UNICODE));
    return $A;
}
/* تحليل خفيف لقائمة المتابعة (المؤشرات بس - من غير أخبار ولا ذكاء اصطناعي) */
function bs_quick($conn, $sym, $market){
    $full = bs_cache_file($conn, $sym, $market);
    if (is_file($full) && time() - filemtime($full) < 6 * 3600) { $j = json_decode((string)@file_get_contents($full), true); if (is_array($j) && !empty($j['ok'])) return ['ok' => true, 'score' => $j['score'], 'verdict' => $j['verdict'], 'last' => $j['last'], 'chg' => $j['chg'], 'week' => $j['horizons'][0]['verdict'] ?? ''] ; }
    $A = bs_compute($sym, $market); if (empty($A['ok'])) return ['ok' => false];
    return ['ok' => true, 'score' => $A['score'], 'verdict' => $A['score'] >= 58 ? 'صاعد — إيجابي' : ($A['score'] <= 42 ? 'هابط — سلبي' : 'محايد — عرضي'), 'last' => $A['last'], 'chg' => $A['chg'], 'week' => $A['horizons'][0]['verdict']];
}

/* =====================================================================
   الإصدار 118: «مسح السوق» في بصيرة — كل أسهم البورصة (أو قطاع) مترتبة حسب احتمال الصعود في الفترة المختارة
   ===================================================================== */
// الإصدار 123: كل قطاع مستقل — مفيش قطاعين مدموجين في اسم واحد (زي «الخدمات الاستهلاكية والسياحة» أو «المالية والبنوك»)
//   القطاع بيتحدد من الصناعة (industry) الأول، ولو مش معروفة ← القطاع العام (sector)
const BS_SECTORS = [
    'Finance' => 'الخدمات المالية', 'Consumer Non-Durables' => 'السلع الاستهلاكية', 'Producer Manufacturing' => 'التصنيع',
    'Non-Energy Minerals' => 'المعادن', 'Process Industries' => 'الصناعات التحويلية', 'Utilities' => 'المرافق',
    'Communications' => 'الاتصالات', 'Technology Services' => 'خدمات التكنولوجيا', 'Electronic Technology' => 'الإلكترونيات',
    'Health Technology' => 'الأدوية', 'Health Services' => 'الخدمات الطبية', 'Retail Trade' => 'تجارة التجزئة',
    'Distribution Services' => 'التوزيع', 'Transportation' => 'النقل', 'Industrial Services' => 'الخدمات الصناعية',
    'Energy Minerals' => 'البترول', 'Consumer Services' => 'الخدمات الاستهلاكية', 'Consumer Durables' => 'السلع المعمرة',
    'Commercial Services' => 'الخدمات التجارية', 'Miscellaneous' => 'متنوع', 'Government' => 'حكومي',
];
const BS_INDUSTRIES = [
    'Major Banks' => 'البنوك', 'Regional Banks' => 'البنوك', 'Savings Banks' => 'البنوك',
    'Real Estate Development' => 'العقارات', 'Real Estate Investment Trusts' => 'العقارات',
    'Life/Health Insurance' => 'التأمين', 'Property/Casualty Insurance' => 'التأمين', 'Multi-Line Insurance' => 'التأمين', 'Specialty Insurance' => 'التأمين', 'Insurance Brokers/Services' => 'التأمين',
    'Investment Banks/Brokers' => 'الخدمات المالية غير المصرفية', 'Investment Managers' => 'الخدمات المالية غير المصرفية', 'Financial Conglomerates' => 'الخدمات المالية غير المصرفية',
    'Finance/Rental/Leasing' => 'الخدمات المالية غير المصرفية', 'Investment Trusts/Mutual Funds' => 'الخدمات المالية غير المصرفية', 'Financial Publishing/Services' => 'الخدمات المالية غير المصرفية',
    'Hotels/Resorts/Cruiselines' => 'السياحة', 'Restaurants' => 'المطاعم', 'Casinos/Gaming' => 'الترفيه', 'Movies/Entertainment' => 'الترفيه',
    'Broadcasting' => 'الإعلام', 'Cable/Satellite TV' => 'الإعلام', 'Publishing: Newspapers' => 'الإعلام', 'Publishing: Books/Magazines' => 'الإعلام', 'Media Conglomerates' => 'الإعلام',
    'Other Consumer Services' => 'التعليم', 'Engineering & Construction' => 'المقاولات', 'Homebuilding' => 'المقاولات',
    'Oilfield Services/Equipment' => 'خدمات البترول', 'Contract Drilling' => 'خدمات البترول', 'Oil & Gas Pipelines' => 'خدمات البترول', 'Environmental Services' => 'الخدمات البيئية',
    'Construction Materials' => 'مواد البناء', 'Steel' => 'الحديد', 'Aluminum' => 'المعادن', 'Other Metals/Minerals' => 'المعادن', 'Precious Metals' => 'المعادن',
    'Chemicals: Agricultural' => 'الأسمدة', 'Chemicals: Major Diversified' => 'الكيماويات', 'Chemicals: Specialty' => 'الكيماويات', 'Industrial Specialties' => 'الكيماويات',
    'Textiles' => 'المنسوجات', 'Pulp & Paper' => 'الورق', 'Containers/Packaging' => 'التغليف', 'Agricultural Commodities/Milling' => 'الزراعة',
    'Food: Major Diversified' => 'الأغذية', 'Food: Specialty/Candy' => 'الأغذية', 'Food: Meat/Fish/Dairy' => 'الأغذية', 'Food Retail' => 'تجارة التجزئة',
    'Beverages: Non-Alcoholic' => 'المشروبات', 'Beverages: Alcoholic' => 'المشروبات', 'Tobacco' => 'التبغ', 'Apparel/Footwear' => 'الملابس', 'Household/Personal Care' => 'العناية الشخصية',
    'Oil Refining/Marketing' => 'تكرير البترول', 'Integrated Oil' => 'البترول', 'Oil & Gas Production' => 'البترول', 'Coal' => 'الفحم',
    'Electric Utilities' => 'الكهرباء', 'Gas Distributors' => 'توزيع الغاز', 'Water Utilities' => 'المياه', 'Alternative Power Generation' => 'الطاقة المتجددة',
    'Pharmaceuticals: Major' => 'الأدوية', 'Pharmaceuticals: Other' => 'الأدوية', 'Pharmaceuticals: Generic' => 'الأدوية', 'Medical Specialties' => 'المستلزمات الطبية',
    'Hospital/Nursing Management' => 'المستشفيات', 'Medical/Nursing Services' => 'الخدمات الطبية', 'Services to the Health Industry' => 'الخدمات الطبية',
    'Major Telecommunications' => 'الاتصالات', 'Wireless Telecommunications' => 'الاتصالات', 'Specialty Telecommunications' => 'الاتصالات',
    'Marine Shipping' => 'الشحن البحري', 'Airlines' => 'الطيران', 'Air Freight/Couriers' => 'النقل', 'Trucking' => 'النقل', 'Railroads' => 'النقل', 'Other Transportation' => 'النقل',
];
function bs_sector_ar($sector, $industry = ''){
    if (is_string($industry) && $industry !== '' && isset(BS_INDUSTRIES[$industry])) return BS_INDUSTRIES[$industry];
    return is_string($sector) && $sector !== '' ? (BS_SECTORS[$sector] ?? $sector) : 'غير محدد';
}

/* قائمة أسهم البورصة بالقطاع (طلب واحد لـ TradingView ومتخزنة 12 ساعة) - مترتبة بالقيمة السوقية (الكبار الأول) */
function bs_universe($conn, $market){
    $c = opp_mkt($market);
    $f = opp_cache_dir() . '/' . md5('bsuni123|' . $market) . '.json';
    if (is_file($f) && time() - filemtime($f) < 12 * 3600 && ($j = json_decode((string)@file_get_contents($f), true))) return $j;
    $out = [];
    $r = mq_http(TV_SCAN_BASE . $c['screener'] . '/scan', ['filter' => [], 'columns' => ['name', 'description', 'close', 'sector', 'market_cap_basic', 'industry'], 'range' => [0, 800], 'sort' => ['sortBy' => 'market_cap_basic', 'sortOrder' => 'desc']]);
    foreach (($r['data'] ?? []) as $row) {
        $d = $row['d'] ?? []; $sym = strtoupper((string)($d[0] ?? '')); if (!preg_match('/^[A-Z0-9.\-]{1,20}$/', $sym)) continue;
        $sec = bs_sector_ar($d[3] ?? '', $d[5] ?? '');
        $out[] = ['s' => $sym, 'n' => (string)($d[1] ?? $sym), 'sec' => $sec, 'cap' => is_numeric($d[4] ?? null) ? (float)$d[4] : 0];
    }
    if (!$out) { foreach (opp_universe($conn, $market) as $u) $out[] = ['s' => $u['s'], 'n' => $u['n'], 'sec' => 'غير محدد', 'cap' => 0]; return $out; }
    usort($out, fn($a, $b) => $b['cap'] <=> $a['cap']);
    @file_put_contents($f, json_encode($out, JSON_UNESCAPED_UNICODE));
    return $out;
}
/* تحليل مختصر لسهم واحد للمسح: نفس محرك «بصيرة» (المؤشرات + احتمال الصعود لكل فترة) من غير أخبار ولا ذكاء اصطناعي
   لو السهم اتحلّل كامل قريب (فيه تعديل الذكاء الاصطناعي) ← بناخد احتمالاته من التحليل الكامل */
function bs_scan_item($conn, $sym, $market){
    $cfg = bs_cfg($conn);
    $full = bs_cache_file($conn, $sym, $market);
    if (is_file($full) && time() - filemtime($full) < $cfg['cache_min'] * 60 && ($j = json_decode((string)@file_get_contents($full), true)) && !empty($j['ok'])) $A = $j + ['src' => ($j['ai']['source'] ?? '') === 'ai' ? 'ai' : 'rules'];
    else {
        $f = opp_cache_dir() . '/' . md5("bsscan118|$sym|$market") . '.json';
        if (is_file($f) && time() - filemtime($f) < max(60, $cfg['cache_min']) * 60 && ($j = json_decode((string)@file_get_contents($f), true))) return $j;
        $A = bs_compute($sym, $market);
        if (empty($A['ok'])) { $o = ['ok' => false]; @file_put_contents($f, json_encode($o)); return $o; }
        $A['src'] = 'rules';
    }
    $hz = []; foreach ($A['horizons'] as $h) $hz[$h['key']] = ['up' => (int)$h['up'], 'lo' => $h['lo'] ?? null, 'hi' => $h['hi'] ?? null, 'v' => $h['verdict'] ?? ''];
    $o = ['ok' => true, 'score' => (int)$A['score'], 'last' => $A['last'], 'chg' => $A['chg'], 'y1' => $A['y1'] ?? null, 'vol' => $A['vol'] ?? null, 'hz' => $hz, 'src' => $A['src'],
        's1' => $A['levels']['s1'] ?? null, 'r1' => $A['levels']['r1'] ?? null, 'pos' => $A['pos'] ?? 0, 'neg' => $A['neg'] ?? 0];
    if (!isset($f)) return $o;
    @file_put_contents($f, json_encode($o, JSON_UNESCAPED_UNICODE));
    return $o;
}

