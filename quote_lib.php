<?php
/* =====================================================================
   GRIFFINE — quote_lib.php (الإصدار 88) — مصدر أسعار الأسهم كدالة واحدة mq_get_quote()
   اتفصل من market_quote.php عشان يستخدمه: أداة التحليل الفني + صفحة السهم + قائمة المتابعة + تنبيهات الأسعار
   المصدر الأساسي TradingView (متأخر 15 دقيقة) + Yahoo احتياطي - وكاش 5 دقايق
   ===================================================================== */
// ---------------------------------------------------------------------
// 01. الإعدادات
// ---------------------------------------------------------------------
defined('TV_SCAN_BASE')      || define('TV_SCAN_BASE', 'https://scanner.tradingview.com/');
defined('MARKET_QUOTE_BASE') || define('MARKET_QUOTE_BASE', 'https://query1.finance.yahoo.com/v8/finance/chart/');
const MQ_CACHE_SECONDS = 300;

// السوق ← [سوق TradingView، البورصات (بالترتيب)، لواحق Yahoo]
const MQ_MARKETS = [
    'مصر'      => ['egypt',  ['EGX'],        ['.CA']],
    'السعودية' => ['ksa',    ['TADAWUL'],    ['.SR']],
    'الإمارات' => ['uae',    ['DFM', 'ADX'], ['.AE', '.AD']],
    'قطر'      => ['qatar',  ['QSE'],        ['.QA']],
    'الكويت'   => ['kuwait', ['KSE'],        ['.KW']],
];
// الفترة ← [عمود أعلى في TradingView، عمود أقل، مدى Yahoo، عدد أيام Yahoo]
const MQ_PERIODS = [
    'day'     => ['high',                'low',                '5d',  1],
    'week'    => [null,                  null,                 '1mo', 7],
    'month'   => ['High.1M',             'Low.1M',             '1mo', 31],
    '2months' => [null,                  null,                 '3mo', 62],
    '3months' => ['High.3M',             'Low.3M',             '3mo', 93],
    '6months' => ['High.6M',             'Low.6M',             '6mo', 184],
    'year'    => ['price_52_week_high',  'price_52_week_low',  '1y',  366],
];



function mq_http($url, $postJson = null){
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 6, CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; GRIFFINE/1.0; +https://griffine.store)',
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ];
    if ($postJson !== null) {
        $opts[CURLOPT_POST] = true;
        $opts[CURLOPT_POSTFIELDS] = json_encode($postJson);
        $opts[CURLOPT_HTTPHEADER] = ['Accept: application/json', 'Content-Type: application/json', 'Origin: https://www.tradingview.com', 'Referer: https://www.tradingview.com/'];
    }
    curl_setopt_array($ch, $opts);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body === false || $code >= 400) return null;
    $j = json_decode($body, true);
    return is_array($j) ? $j : null;
}

function tv_scan($screener, $ticker, $cols){
    $j = mq_http(TV_SCAN_BASE . $screener . '/scan', ["symbols" => ["tickers" => [$ticker], "query" => ["types" => []]], "columns" => $cols]);
    $row = $j['data'][0]['d'] ?? null;
    if (!is_array($row) || count($row) !== count($cols)) return null;
    return array_combine($cols, $row);
}

function yahoo_rows($sym, $range){
    $j = mq_http(MARKET_QUOTE_BASE . rawurlencode($sym) . '?range=' . $range . '&interval=1d&includePrePost=false');
    $res = $j['chart']['result'][0] ?? null;
    if (!$res || empty($res['timestamp'])) return null;
    $q = $res['indicators']['quote'][0] ?? [];
    $rows = [];
    foreach ($res['timestamp'] as $i => $t) {
        $h = $q['high'][$i] ?? null; $l = $q['low'][$i] ?? null; $c = $q['close'][$i] ?? null;
        if ($h === null || $l === null || $c === null) continue;
        $rows[] = ['t' => (int)$t, 'h' => (float)$h, 'l' => (float)$l, 'c' => (float)$c];
    }
    return $rows ? ['rows' => $rows, 'name' => $res['meta']['longName'] ?? ($res['meta']['shortName'] ?? $sym), 'currency' => $res['meta']['currency'] ?? null] : null;
}

/* بيرجّع السعر ك array: success, symbol, name, currency, high, low, last, prevClose, delayMinutes ... (نفس شكل market_quote.php) */
function mq_get_quote($rawSymbol, $market = 'مصر', $period = 'day'){
    // ---------------------------------------------------------------------
    // 02. التحقق من الطلب + التخزين المؤقت
    // ---------------------------------------------------------------------

    $rawSymbol = strtoupper(trim((string)$rawSymbol)); $market = trim((string)$market); $period = trim((string)$period);
    if (!preg_match('/^[A-Z0-9.\-:]{1,20}$/', $rawSymbol)) return ["success" => false, "message" => 'اكتب رمز السهم بالإنجليزية (مثل COMI).'];
    if (!isset(MQ_PERIODS[$period])) $period = 'month';
    if (!isset(MQ_MARKETS[$market])) $market = 'مصر';
    [$tvScreener, $tvExchanges, $yhSuffixes] = MQ_MARKETS[$market];
    [$tvHighCol, $tvLowCol, $yhRange, $yhDays] = MQ_PERIODS[$period];

    // الرمز لوحده (من غير لاحقة أو بورصة لو المستخدم كتبها)
    $base = preg_replace('/^[A-Z]+:/', '', preg_replace('/\.[A-Z]{2}$/', '', $rawSymbol));

    $cacheDir = sys_get_temp_dir() . '/griffine_quotes';
    if (!is_dir($cacheDir)) @mkdir($cacheDir, 0700, true);
    $cacheFile = $cacheDir . '/' . md5("v77|$rawSymbol|$market|$period") . '.json';
    if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < MQ_CACHE_SECONDS && ($c = @file_get_contents($cacheFile)) && is_array($cj = json_decode($c, true))) return $cj;

    // ---------------------------------------------------------------------
    // 03. أدوات الطلب من النت
    // ---------------------------------------------------------------------
    $num = function($v){ return (is_numeric($v) && $v > 0) ? (float)$v : null; };

    // ---------------------------------------------------------------------
    // 04. المصدر 1: TradingView
    //     (أعمدة الفترة في طلب لوحده - لو عمود منهم مش مدعوم، الطلب الأساسي ميتأثرش)
    // ---------------------------------------------------------------------
    $tv = null; $tvTicker = null;
    $candTickers = strpos($rawSymbol, ':') !== false ? [$rawSymbol] : array_map(function($ex) use ($base){ return "$ex:$base"; }, $tvExchanges);
    foreach ($candTickers as $t) {
        $core = tv_scan($tvScreener, $t, ['description', 'close', 'change_abs', 'high', 'low', 'currency', 'update_mode']);
        if ($core && $num($core['close'])) { $tv = $core; $tvTicker = $t; break; }
    }
    $tvPeriod = null;
    if ($tv && $tvHighCol && $tvHighCol !== 'high') {
        $tvPeriod = tv_scan($tvScreener, $tvTicker, [$tvHighCol, $tvLowCol]);
    }
    // التأخير من TradingView نفسه (delayed_streaming_900 = 900 ثانية = 15 دقيقة)
    $delayMin = 15;
    if ($tv && preg_match('/(\d+)$/', (string)$tv['update_mode'], $m)) $delayMin = (int)round($m[1] / 60);
    elseif ($tv && $tv['update_mode'] === 'streaming') $delayMin = 0;

    // ---------------------------------------------------------------------
    // 05. المصدر 2: Yahoo (شموع يومية) - للأسبوع والشهرين، أو لو TradingView مرجّعش
    // ---------------------------------------------------------------------
    $needYahoo = !$tv || !$tvHighCol || ($tvHighCol !== 'high' && !$tvPeriod);
    $yh = null; $yhSymbol = null;
    if ($needYahoo) {
        $cands = preg_match('/\.[A-Z]{2}$/', $rawSymbol) ? [$rawSymbol] : array_map(function($s) use ($base){ return $base . $s; }, $yhSuffixes);
        foreach ($cands as $s) {
            $r = yahoo_rows($s, $yhRange);
            if (!$r) continue;
            $lastRow = end($r['rows']);
            // الشموع لازم تكون حديثة (آخر شمعة من أقل من 6 أيام - إجازة نهاية الأسبوع + عطلة)
            if ($lastRow['t'] < time() - 6 * 86400) continue;
            // ولو TradingView شغال: إغلاق آخر شمعة لازم يبقى قريب من آخر سعر (فرق أقل من 15%) - غير كده البيانات مش مظبوطة
            if ($tv && abs($lastRow['c'] - (float)$tv['close']) / (float)$tv['close'] > 0.15) continue;
            $yh = $r; $yhSymbol = $s; break;
        }
    }

    // ---------------------------------------------------------------------
    // 06. تجميع النتيجة حسب الفترة
    // ---------------------------------------------------------------------
    $high = null; $low = null; $last = null; $prev = null; $sources = []; $name = null; $currency = null; $symbolShown = $base; $days = null;

    if ($tv) {
        $last = (float)$tv['close'];
        $prev = is_numeric($tv['change_abs']) ? round($last - (float)$tv['change_abs'], 4) : null;
        $name = $tv['description'] ?: $base; $currency = $tv['currency']; $symbolShown = $tvTicker;
        $sources[] = 'TradingView';
        if ($period === 'day') { $high = $num($tv['high']); $low = $num($tv['low']); $days = 1; }
        elseif ($tvPeriod && $num($tvPeriod[$tvHighCol]) && $num($tvPeriod[$tvLowCol])) { $high = (float)$tvPeriod[$tvHighCol]; $low = (float)$tvPeriod[$tvLowCol]; }
    }
    if (($high === null || $low === null) && $yh) {
        $rows = $yh['rows'];
        $cut = time() - $yhDays * 86400;
        $win = $period === 'day' ? [end($rows)] : array_values(array_filter($rows, function($r) use ($cut){ return $r['t'] >= $cut; }));
        if ($win) {
            $high = max(array_column($win, 'h')); $low = min(array_column($win, 'l')); $days = count($win);
            if ($last === null) { $last = end($rows)['c']; $prev = count($rows) >= 2 ? $rows[count($rows) - 2]['c'] : null; $name = $yh['name']; $currency = $yh['currency']; $symbolShown = $yhSymbol; }
            $sources[] = 'Yahoo Finance';
        }
    }

    if ($last === null) return ["success" => false, "message" => 'لم نجد أسعارًا لهذا الرمز. تأكد من الرمز والسوق، أو اكتب الأرقام يدويًا.'];
    // آخر سعر لازم يبقى جوه النطاق (الفترة بتشمل النهارده)
    if ($high !== null) $high = max($high, $last);
    if ($low !== null) $low = min($low, $last);

    $outArr = [
        "success" => true,
        "symbol" => $symbolShown,
        "name" => $name,
        "currency" => $currency,
        "period" => $period,
        "days" => $days,
        "high" => $high !== null ? round($high, 4) : null,
        "low" => $low !== null ? round($low, 4) : null,
        "last" => round($last, 4),
        "prevClose" => $prev,
        "partial" => ($high === null || $low === null),   // آخر سعر بس (أعلى/أقل للفترة دي مش متاحين)
        "delayMinutes" => $delayMin,
        "source" => implode(' + ', array_unique($sources)),
        "lastTime" => date('c'),
        "fetchedAt" => date('c'),
    ];
    @file_put_contents($cacheFile, json_encode($outArr, JSON_UNESCAPED_UNICODE));
    return $outArr;
}

/* الإصدار 91: أسعار الإغلاق اليومية التاريخية (لمنحنى أداء المحفظة الحقيقي)
   اسم الخطة ممكن يكون مش رمز البورصة بالظبط (RAYA-2 / ABUK3) ← بنجرّب الاسم وبعدين من غير الرقم في الآخر
   بيرجّع ['ticker' => ..., 'rows' => [['2026-07-01', 12.3], ...]] أو null - كاش 6 ساعات */
function mq_history($rawSymbol, $market = 'مصر', $range = '1y'){
    $rawSymbol = strtoupper(trim((string)$rawSymbol));
    if (!preg_match('/^[A-Z0-9.\-_ ]{1,24}$/', $rawSymbol)) return null;
    if (!in_array($range, ['3mo', '6mo', '1y', '2y', '5y'], true)) $range = '1y';
    $m = MQ_MARKETS[$market] ?? MQ_MARKETS['مصر'];
    $cacheDir = sys_get_temp_dir() . '/griffine_quotes'; if (!is_dir($cacheDir)) @mkdir($cacheDir, 0700, true);
    $cacheFile = $cacheDir . '/' . md5("hist91|$rawSymbol|$market|$range") . '.json';
    if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < 6 * 3600 && ($c = @file_get_contents($cacheFile)) !== false) { $cj = json_decode($c, true); return $cj ?: null; }
    $cands = [$rawSymbol];
    $base = preg_replace('/[\s\-_]*\d+$/', '', $rawSymbol); if ($base !== '' && $base !== $rawSymbol) $cands[] = $base;
    $out = null;
    foreach ($cands as $cand) {
        foreach ($m[2] as $suffix) {
            $y = yahoo_rows($cand . $suffix, $range);
            if ($y && count($y['rows']) >= 2) {
                $rows = [];
                foreach ($y['rows'] as $r) $rows[] = [gmdate('Y-m-d', $r['t']), round($r['c'], 4)];
                $out = ['ticker' => $cand . $suffix, 'rows' => $rows]; break 2;
            }
        }
    }
    @file_put_contents($cacheFile, json_encode($out));
    return $out;
}
?>
