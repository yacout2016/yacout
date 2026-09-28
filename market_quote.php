<?php
/* =====================================================================
   GRIFFINE — market_quote.php (الإصدار 76) — أسعار سهم تلقائيًا لأداة التحليل الفني
   ---------------------------------------------------------------------
   GET ?symbol=ABUK&market=مصر&period=month
   بيرجّع: أعلى سعر + أقل سعر خلال الفترة + آخر سعر (متأخر ~15 دقيقة) + الإغلاق السابق
   المصدر: Yahoo Finance (بيانات مجانية متأخرة) - بيتنادى من السيرفر عشان المتصفح ميتمنعش (CORS)
   - نتيجة كل سهم/فترة بتتخزن 10 دقايق (أخف على السيرفر وأسرع)
   - لو السهم مش موجود في المصدر ← رسالة واضحة والعميل يكتب الأرقام يدوي (الخانات بتفضل قابلة للتعديل)
   - للمشتركين المسجلين بس (نفس شرط الأداة نفسها)

   فهرس:
     01. الإعدادات (رموز الأسواق + الفترات)
     02. التحقق من الطلب
     03. التخزين المؤقت
     04. الجلب من المصدر
     05. حساب أعلى / أقل / آخر سعر خلال الفترة
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

// ---------------------------------------------------------------------
// 01. الإعدادات
// ---------------------------------------------------------------------
defined('MARKET_QUOTE_BASE') || define('MARKET_QUOTE_BASE', 'https://query1.finance.yahoo.com/v8/finance/chart/');
const MQ_CACHE_SECONDS = 600;     // 10 دقايق
const MQ_DELAY_MINUTES = 15;      // البيانات المجانية متأخرة حوالي 15 دقيقة

// السوق ← لاحقة الرمز في المصدر (أول لاحقة هي الأساسية، والباقي بديل لو ملقيناش بيانات)
const MQ_MARKETS = [
    'مصر'      => ['.CA'],
    'السعودية' => ['.SR'],
    'الإمارات' => ['.AE', '.AD'],   // سوق دبي ثم أبوظبي
    'قطر'      => ['.QA'],
    'الكويت'   => ['.KW'],
];
// الفترة ← [مدى الطلب من المصدر، عدد الأيام اللي بنحسب منها]
const MQ_PERIODS = [
    'day'     => ['5d', 1],
    'month'   => ['1mo', 31],
    '2months' => ['3mo', 62],
    '3months' => ['3mo', 93],
    '6months' => ['6mo', 184],
    'year'    => ['1y', 366],
];

function mq_fail($msg, $code = 200){ http_response_code($code); echo json_encode(["success" => false, "message" => $msg], JSON_UNESCAPED_UNICODE); exit(); }

// ---------------------------------------------------------------------
// 02. التحقق من الطلب
// ---------------------------------------------------------------------
if (!isset($_SESSION['user_email'])) mq_fail('سجّل دخول الأول.', 403);

$rawSymbol = strtoupper(trim($_GET['symbol'] ?? ''));
$market = trim($_GET['market'] ?? 'مصر');
$period = trim($_GET['period'] ?? 'month');
if (!preg_match('/^[A-Z0-9.\-]{1,15}$/', $rawSymbol)) mq_fail('اكتب رمز السهم بالإنجليزي (زي COMI).');
if (!isset(MQ_PERIODS[$period])) $period = 'month';
if (!isset(MQ_MARKETS[$market])) $market = 'مصر';

// لو المستخدم كتب الرمز بلاحقته (زي FAB.AD) بنستخدمه زي ما هو
$candidates = strpos($rawSymbol, '.') !== false ? [$rawSymbol] : array_map(function($sfx) use ($rawSymbol){ return $rawSymbol . $sfx; }, MQ_MARKETS[$market]);

// ---------------------------------------------------------------------
// 03. التخزين المؤقت (ملف صغير في مجلد مؤقت)
// ---------------------------------------------------------------------
function mq_cache_file($key){
    $dir = sys_get_temp_dir() . '/griffine_quotes';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    return $dir . '/' . md5($key) . '.json';
}
$cacheKey = implode('|', [$rawSymbol, $market, $period]);
$cf = mq_cache_file($cacheKey);
if (is_file($cf) && (time() - filemtime($cf)) < MQ_CACHE_SECONDS) {
    $cached = @file_get_contents($cf);
    if ($cached) { echo $cached; exit(); }
}

// ---------------------------------------------------------------------
// 04. الجلب من المصدر
// ---------------------------------------------------------------------
function mq_fetch($url){
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; GRIFFINE/1.0; +https://griffine.store)',
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body === false || $code >= 500) return null;
    $j = json_decode($body, true);
    return is_array($j) ? $j : null;
}

[$range, $days] = MQ_PERIODS[$period];
$data = null; $usedSymbol = null;
foreach ($candidates as $sym) {
    $j = mq_fetch(MARKET_QUOTE_BASE . rawurlencode($sym) . '?range=' . $range . '&interval=1d&includePrePost=false');
    $res = $j['chart']['result'][0] ?? null;
    if ($res && !empty($res['timestamp']) && !empty($res['indicators']['quote'][0])) { $data = $res; $usedSymbol = $sym; break; }
}
if (!$data) mq_fail('مش لاقيين أسعار للرمز ده في مصدر البيانات. اتأكد من الرمز والسوق، أو اكتب الأرقام يدوي.');

// ---------------------------------------------------------------------
// 05. أعلى / أقل خلال الفترة + آخر سعر + الإغلاق السابق
// ---------------------------------------------------------------------
$ts = $data['timestamp'];
$q = $data['indicators']['quote'][0];
$meta = $data['meta'] ?? [];
$cutoff = time() - $days * 86400;

// الأيام اللي فيها بيانات كاملة (بنشيل الأيام الفاضية)
$rows = [];
foreach ($ts as $i => $t) {
    $h = $q['high'][$i] ?? null; $l = $q['low'][$i] ?? null; $c = $q['close'][$i] ?? null;
    if ($h === null || $l === null || $c === null) continue;
    $rows[] = ['t' => (int)$t, 'h' => (float)$h, 'l' => (float)$l, 'c' => (float)$c];
}
if (!$rows) mq_fail('مصدر البيانات مرجّعش أسعار للفترة دي. اكتب الأرقام يدوي.');

// "يوم" = آخر جلسة بس، غير كده = كل الأيام جوه الفترة
$window = $period === 'day' ? [end($rows)] : array_values(array_filter($rows, function($r) use ($cutoff){ return $r['t'] >= $cutoff; }));
if (!$window) $window = [end($rows)];

$high = max(array_column($window, 'h'));
$low = min(array_column($window, 'l'));
$last = isset($meta['regularMarketPrice']) ? (float)$meta['regularMarketPrice'] : end($rows)['c'];
$lastTime = isset($meta['regularMarketTime']) ? (int)$meta['regularMarketTime'] : end($rows)['t'];
$prevClose = isset($meta['chartPreviousClose']) && $period === 'day' ? (float)$meta['chartPreviousClose']
           : (count($rows) >= 2 ? $rows[count($rows) - 2]['c'] : null);
// آخر سعر لازم يدخل في النطاق (لو السعر اتحرك بعد آخر شمعة)
$high = max($high, $last); $low = min($low, $last);

$out = json_encode([
    "success" => true,
    "symbol" => $usedSymbol,
    "name" => $meta['longName'] ?? ($meta['shortName'] ?? $usedSymbol),
    "currency" => $meta['currency'] ?? null,
    "period" => $period,
    "days" => count($window),
    "high" => round($high, 4),
    "low" => round($low, 4),
    "last" => round($last, 4),
    "prevClose" => $prevClose !== null ? round($prevClose, 4) : null,
    "lastTime" => date('c', $lastTime),
    "delayMinutes" => MQ_DELAY_MINUTES,
    "source" => "Yahoo Finance",
    "fetchedAt" => date('c'),
], JSON_UNESCAPED_UNICODE);
@file_put_contents($cf, $out);
echo $out;
?>
