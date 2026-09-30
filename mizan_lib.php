<?php
/* =====================================================================
   GRIFFINE — mizan_lib.php (الإصدار 115) — «ميزان محفظتك AI»: تحليل تنويع المحفظة الفعلية للمستثمر
   ---------------------------------------------------------------------
   المدخل: المراكز المفتوحة من خطط المستخدم (الرمز / السوق / الكمية / متوسط التكلفة) - لعملة واحدة
   1) الأسعار: آخر سعر (متأخر 15 دقيقة) + أسعار الإغلاق اليومية لآخر سنة (نفس مصدر الموقع)
   2) القطاع: من TradingView (عمود sector) ← مترجم للعربي، ومخزن 7 أيام
   3) النسب المالية:
      - الوزن لكل سهم / قطاع ، مؤشر التركيز HHI = Σ الوزن² ، عدد الأسهم الفعلي = 1 ÷ HHI ، أكبر سهم / أكبر 3
      - التذبذب السنوي لكل سهم وللمحفظة (الانحراف المعياري للعائد اليومي × √252) بأوزان المحفظة الحالية
      - الارتباط بين الأسهم (بيرسون على العوائد اليومية) + متوسط الارتباط + الأزواج شديدة الارتباط
      - نسبة التنويع = Σ (الوزن × تذبذب السهم) ÷ تذبذب المحفظة (أكبر من 1 = التنويع بيقلل المخاطرة فعلًا)
      - أقصى تراجع (Max Drawdown) وعائد سنة للمحفظة بأوزانها الحالية ، الربح/الخسارة غير المحققة
   4) درجة الخطورة (0-100) + تنبيهات + اقتراحات إعادة توازن (بالمبالغ)
   5) الذكاء الاصطناعي (نفس إعدادات ومفتاح «بصيرة» من لوحة التحكم): ملخص + قوة + مخاطر + خطوات + شركات مرشحة
      (الشركات المرشحة من قائمة أسهم السوق بس - وكل واحدة بتفتح في «بصيرة»). من غير مفتاح ← محرك آلي.
   تحليل تعليمي - مش نصيحة استثمارية.
   ===================================================================== */
require_once __DIR__ . '/basira_lib.php';

const MZ_SECTORS = [
    'Finance' => 'المالية والبنوك', 'Consumer Non-Durables' => 'سلع استهلاكية', 'Producer Manufacturing' => 'التصنيع',
    'Non-Energy Minerals' => 'مواد البناء والمعادن', 'Process Industries' => 'الكيماويات والأسمدة', 'Utilities' => 'المرافق',
    'Communications' => 'الاتصالات', 'Technology Services' => 'خدمات التكنولوجيا', 'Electronic Technology' => 'التكنولوجيا الإلكترونية',
    'Health Technology' => 'الأدوية والرعاية الصحية', 'Health Services' => 'الخدمات الصحية', 'Retail Trade' => 'تجارة التجزئة',
    'Distribution Services' => 'التوزيع', 'Transportation' => 'النقل', 'Industrial Services' => 'الخدمات الصناعية والمقاولات',
    'Energy Minerals' => 'الطاقة والبترول', 'Consumer Services' => 'الخدمات الاستهلاكية والسياحة', 'Consumer Durables' => 'السلع المعمرة',
    'Commercial Services' => 'الخدمات التجارية', 'Miscellaneous' => 'متنوع', 'Government' => 'حكومي',
];

function mz_sector($sym, $market){
    $f = opp_cache_dir() . '/' . md5("mzsec1|$sym|$market") . '.json';
    if (is_file($f) && time() - filemtime($f) < 7 * 86400) { $j = json_decode((string)@file_get_contents($f), true); if (is_array($j)) return $j['s']; }
    $m = MQ_MARKETS[$market] ?? MQ_MARKETS['مصر']; $s = '';
    foreach ($m[1] as $ex) { $r = tv_scan($m[0], "$ex:$sym", ['sector']); if ($r && is_string($r['sector'] ?? null) && $r['sector'] !== '') { $s = $r['sector']; break; } }
    $ar = $s !== '' ? (MZ_SECTORS[$s] ?? $s) : 'غير محدد';
    if ($s !== '') @file_put_contents($f, json_encode(['s' => $ar], JSON_UNESCAPED_UNICODE));
    return $ar;
}

function mz_std($a){ $n = count($a); if ($n < 2) return 0.0; $m = array_sum($a) / $n; $v = 0; foreach ($a as $x) $v += ($x - $m) ** 2; return sqrt($v / ($n - 1)); }
function mz_corr($a, $b){
    $k = array_keys(array_intersect_key($a, $b)); $n = count($k); if ($n < 30) return null;
    $x = array_map(fn($d) => $a[$d], $k); $y = array_map(fn($d) => $b[$d], $k);
    $mx = array_sum($x) / $n; $my = array_sum($y) / $n; $sxy = $sx = $sy = 0;
    for ($i = 0; $i < $n; $i++) { $dx = $x[$i] - $mx; $dy = $y[$i] - $my; $sxy += $dx * $dy; $sx += $dx * $dx; $sy += $dy * $dy; }
    return ($sx > 0 && $sy > 0) ? $sxy / sqrt($sx * $sy) : null;
}
function mz_mdd($series){ $peak = null; $mdd = 0; foreach ($series as $v) { if ($peak === null || $v > $peak) $peak = $v; if ($peak > 0) $mdd = min($mdd, $v / $peak - 1); } return $mdd * 100; }

/* المراكز → الأرقام (من غير ذكاء اصطناعي) */
function mz_metrics($conn, $cfg, $positions){
    $H = []; $total = 0; $cost = 0;
    foreach ($positions as $p) {
        $C = opp_candles($p['s'], $p['m'], '1d');
        $q = mq_get_quote($p['s'], $p['m'], 'day');
        $last = (!empty($q['success']) && ($q['last'] ?? 0) > 0) ? (float)$q['last'] : ($C && $C['c'] ? (float)end($C['c']) : (float)$p['avg']);
        $rets = []; $closes = [];
        if ($C && count($C['c']) > 2) {
            $n = count($C['c']); $from = max(1, $n - 252);
            for ($i = $from; $i < $n; $i++) { $prev = $C['c'][$i - 1]; if ($prev > 0 && $C['c'][$i] > 0) { $d = gmdate('Y-m-d', (int)$C['t'][$i]); $rets[$d] = $C['c'][$i] / $prev - 1; $closes[$d] = $C['c'][$i]; } }
        }
        $cl = array_values($closes);
        $val = $p['q'] * $last; $cst = $p['q'] * $p['avg'];
        $H[] = ['s' => $p['s'], 'm' => $p['m'], 't' => $p['t'], 'q' => $p['q'], 'avg' => $p['avg'], 'last' => $last, 'value' => $val, 'cost' => $cst,
            'pnl' => $val - $cst, 'pnlPct' => $cst > 0 ? ($val / $cst - 1) * 100 : 0, 'name' => bs_arname($cfg, $p['s'], $p['m']), 'sector' => mz_sector($p['s'], $p['m']),
            'vol' => count($rets) >= 20 ? mz_std(array_values($rets)) * sqrt(252) * 100 : null,
            'y1' => count($cl) >= 200 ? ($last / $cl[0] - 1) * 100 : null, 'mdd' => $cl ? mz_mdd($cl) : null, '_r' => $rets];
        $total += $val; $cost += $cst;
    }
    if ($total <= 0) return null;
    foreach ($H as &$h) $h['w'] = $h['value'] / $total * 100; unset($h);
    usort($H, fn($a, $b) => $b['value'] <=> $a['value']);
    $n = count($H);
    $hhi = array_sum(array_map(fn($h) => ($h['w'] / 100) ** 2, $H));
    $sec = []; foreach ($H as $h) $sec[$h['sector']] = ($sec[$h['sector']] ?? 0) + $h['w']; arsort($sec);
    $secHhi = array_sum(array_map(fn($w) => ($w / 100) ** 2, $sec));
    // عائد المحفظة اليومي بالأوزان الحالية
    $dates = []; foreach ($H as $h) foreach ($h['_r'] as $d => $_) $dates[$d] = 1; ksort($dates);
    $pr = []; foreach (array_keys($dates) as $d) { $r = 0; foreach ($H as $h) $r += ($h['w'] / 100) * ($h['_r'][$d] ?? 0); $pr[$d] = $r; }
    $volP = count($pr) >= 20 ? mz_std(array_values($pr)) * sqrt(252) * 100 : null;
    $idx = [1.0]; foreach ($pr as $r) $idx[] = end($idx) * (1 + $r);
    $mddP = count($idx) > 20 ? mz_mdd($idx) : null; $y1P = count($pr) >= 200 ? (end($idx) - 1) * 100 : null;
    // الارتباط
    $pairs = []; $cs = [];
    for ($i = 0; $i < $n; $i++) for ($j = $i + 1; $j < $n; $j++) { $c = mz_corr($H[$i]['_r'], $H[$j]['_r']); if ($c === null) continue; $cs[] = $c; $pairs[] = ['a' => $H[$i]['s'], 'b' => $H[$j]['s'], 'c' => round($c, 2)]; }
    usort($pairs, fn($a, $b) => $b['c'] <=> $a['c']);
    $avgCorr = $cs ? array_sum($cs) / count($cs) : null;
    $wVol = 0; $wv = 0; foreach ($H as $h) if ($h['vol'] !== null) { $wVol += $h['w'] / 100 * $h['vol']; $wv += $h['w'] / 100; }
    $divRatio = ($volP && $wv > 0.5) ? ($wVol / $wv) / $volP : null;
    // درجة الخطورة: التركّز 35% + القطاع 20% + الارتباط 20% + التذبذب 25%
    $maxSec = $sec ? reset($sec) : 100;
    $cConc = min(100, $hhi * 200); $cSec = min(100, $maxSec * 1.25); $cCorr = $avgCorr === null ? ($n > 1 ? 50 : 100) : max(0, min(100, $avgCorr * 125)); $cVol = $volP === null ? 50 : min(100, $volP * 2.5);
    $risk = (int)round(0.35 * $cConc + 0.2 * $cSec + 0.2 * $cCorr + 0.25 * $cVol);
    $top3 = array_sum(array_map(fn($h) => $h['w'], array_slice($H, 0, 3)));
    foreach ($H as &$h) unset($h['_r']); unset($h);
    return ['holdings' => $H, 'n' => $n, 'total' => $total, 'cost' => $cost, 'pnl' => $total - $cost, 'pnlPct' => $cost > 0 ? ($total / $cost - 1) * 100 : 0,
        'hhi' => $hhi, 'effN' => $hhi > 0 ? 1 / $hhi : 0, 'top1' => $H[0]['w'], 'top3' => $top3, 'sectors' => $sec, 'secHhi' => $secHhi,
        'volP' => $volP, 'mddP' => $mddP, 'y1P' => $y1P, 'avgCorr' => $avgCorr, 'pairs' => array_slice($pairs, 0, 6), 'divRatio' => $divRatio,
        'risk' => $risk, 'parts' => ['conc' => round($cConc), 'sector' => round($cSec), 'corr' => round($cCorr), 'vol' => round($cVol)]];
}

/* تنبيهات + اقتراحات إعادة التوازن (بالقواعد) */
function mz_rules($M){
    $f = fn($v) => number_format($v, 2, '.', ','); $f0 = fn($v) => number_format($v, 0, '.', ',');
    $A = []; $H = $M['holdings']; $n = $M['n'];
    $cap = $n >= 4 ? 25 : ($n === 3 ? 40 : 60);   // الحد المقترح لوزن السهم الواحد حسب عدد الأسهم
    if ($n === 1) $A[] = ['k' => 'neg', 't' => 'سهم واحد بس', 'd' => 'المحفظة كلها في ' . $H[0]['s'] . ' — أي خبر سلبي عن الشركة يأثر على 100% من استثمارك.'];
    elseif ($M['top1'] >= 40) $A[] = ['k' => 'neg', 't' => 'تركّز عالي في سهم واحد', 'd' => $H[0]['s'] . ' لوحده ' . $f($M['top1']) . '% من المحفظة (الحد المقترح أقل من 40%).'];
    elseif ($M['top1'] >= 25 && $n >= 4) $A[] = ['k' => 'warn', 't' => 'أكبر سهم وزنه مرتفع', 'd' => $H[0]['s'] . ' = ' . $f($M['top1']) . '% — مقبول بس يستحق المتابعة.'];
    if ($M['hhi'] > 0.3 && $n > 1) $A[] = ['k' => 'neg', 't' => 'تنويع ضعيف', 'd' => 'مؤشر التركّز HHI = ' . $f($M['hhi']) . ' ← المحفظة كأنها ' . $f($M['effN']) . ' سهم بس فعليًا.'];
    elseif ($n > 1 && $M['hhi'] <= 0.2) $A[] = ['k' => 'pos', 't' => 'توزيع الأوزان كويس', 'd' => 'HHI = ' . $f($M['hhi']) . ' (أقل من 0.2 ممتاز) — عدد الأسهم الفعلي ' . $f($M['effN']) . '.'];
    $ms = array_key_first($M['sectors']); $msw = $M['sectors'][$ms] ?? 0;
    if ($n > 1 && count($M['sectors']) === 1) $A[] = ['k' => 'neg', 't' => 'كل الأسهم في قطاع واحد', 'd' => 'كل المحفظة في «' . $ms . '» — التنويع بين أسهم نفس القطاع أضعف بكتير من التنويع بين قطاعات.'];
    elseif ($msw >= 50) $A[] = ['k' => 'warn', 't' => 'قطاع مسيطر', 'd' => '«' . $ms . '» = ' . $f($msw) . '% من المحفظة.'];
    foreach (array_slice(array_values(array_filter($M['pairs'], fn($p) => $p['c'] >= 0.8)), 0, 2) as $p) $A[] = ['k' => 'warn', 't' => 'سهمين بيتحركوا مع بعض', 'd' => $p['a'] . ' و ' . $p['b'] . ' ارتباطهم ' . $f($p['c']) . ' — وجودهم مع بعض مش بيضيف تنويع حقيقي.'];
    if ($M['volP'] !== null && $M['volP'] >= 35) $A[] = ['k' => 'warn', 't' => 'تذبذب المحفظة عالي', 'd' => 'التذبذب السنوي ' . $f($M['volP']) . '% — ممكن القيمة تتحرك بقوة في شهور قليلة.'];
    if ($M['divRatio'] !== null && $M['divRatio'] >= 1.25) $A[] = ['k' => 'pos', 't' => 'التنويع بيقلل المخاطرة فعلًا', 'd' => 'نسبة التنويع ' . $f($M['divRatio']) . ' ← تذبذب المحفظة أقل من متوسط تذبذب أسهمها.'];
    foreach ($H as $h) if ($h['pnlPct'] <= -20) $A[] = ['k' => 'warn', 't' => $h['s'] . ': خسارة غير محققة كبيرة', 'd' => 'نازل ' . $f(abs($h['pnlPct'])) . '% عن متوسط تكلفتك — راجع مستويات الخطة والمبلغ المرصود ليها.'];
    // إعادة التوازن
    $moves = []; $free = 0;
    foreach ($H as $h) if ($h['w'] > $cap + 0.5) { $amt = ($h['w'] - $cap) / 100 * $M['total']; $free += $amt; $moves[] = ['s' => $h['s'], 'k' => 'reduce', 'amt' => $amt, 't' => 'خفّف ' . $h['s'] . ' بحوالي ' . $f0($amt) . ' (من ' . $f($h['w']) . '% لـ ' . $cap . '%) — مثلًا بتقليل المبلغ المرصود لخطته أو البيع الجزئي عند هدف ربح.']; }
    if ($free > 0) {
        $low = array_values(array_filter($H, fn($h) => $h['w'] < $cap - 5));
        usort($low, fn($a, $b) => $a['w'] <=> $b['w']);
        $tgt = array_slice($low, 0, 2);
        foreach ($tgt as $h) { $amt = $free / count($tgt); $moves[] = ['s' => $h['s'], 'k' => 'add', 'amt' => $amt, 't' => 'وجّه حوالي ' . $f0($amt) . ' للسهم الأقل وزنًا ' . $h['s'] . ' (' . $f($h['w']) . '%) بزيادة المبلغ المرصود لخطته.']; }
        if (count($M['sectors']) < 3) $moves[] = ['s' => '', 'k' => 'new', 'amt' => $free, 't' => 'أو ابدأ خطة لسهم في قطاع مش موجود عندك (شوف الشركات المرشحة تحت) عشان تنوّع بين القطاعات.'];
    }
    if (!$moves) $moves[] = ['s' => '', 'k' => 'hold', 'amt' => 0, 't' => 'الأوزان الحالية في الحدود المقترحة — مفيش حاجة محتاجة إعادة توازن دلوقتي.'];
    return ['alerts' => $A, 'moves' => $moves, 'cap' => $cap];
}

function mz_ai_schema(){
    $str = ['type' => 'string'];
    return ['type' => 'object', 'additionalProperties' => false, 'required' => ['summary', 'strengths', 'risks', 'moves', 'market_view', 'candidates'],
        'properties' => ['summary' => $str, 'strengths' => ['type' => 'array', 'items' => $str], 'risks' => ['type' => 'array', 'items' => $str],
            'moves' => ['type' => 'array', 'items' => ['type' => 'object', 'additionalProperties' => false, 'required' => ['symbol', 'action', 'text'],
                'properties' => ['symbol' => $str, 'action' => ['type' => 'string', 'enum' => ['reduce', 'add', 'hold', 'watch', 'new']], 'text' => $str]]],
            'market_view' => $str,
            'candidates' => ['type' => 'array', 'items' => ['type' => 'object', 'additionalProperties' => false, 'required' => ['symbol', 'reason'], 'properties' => ['symbol' => $str, 'reason' => $str]]]]];
}

/* قائمة الشركات اللي ممكن تترشح (من أسهم الأسواق اللي فيها المحفظة - غير المملوكة) */
function mz_pool($cfg, $M){
    $names = bs_names($cfg); $held = array_column($M['holdings'], 's'); $pool = [];
    foreach (array_unique(array_column($M['holdings'], 'm')) as $mk) foreach (($names[$mk] ?? []) as $s => $nm) if (!in_array($s, $held, true) && count($pool) < 60) $pool[$s] = ['n' => $nm, 'm' => $mk];
    return $pool;
}

function mz_ai($conn, $cfg, $M, $R, $pool){
    $key = site_config_get($conn, 'basira_ai_key');
    if (empty($cfg['ai_on']) || $key === '') return null;
    if ($cfg['ai_daily_max'] > 0 && bs_ai_counter() >= $cfg['ai_daily_max']) return ['error' => 'وصلنا للحد اليومي لطلبات الذكاء الاصطناعي — التحليل اتكتب بالمحرك الآلي.'];
    $r2 = fn($v) => $v === null ? null : round($v, 2);
    $in = ['holdings' => array_map(fn($h) => ['symbol' => $h['s'], 'name' => $h['name'], 'market' => $h['m'], 'sector' => $h['sector'], 'plan_type' => $h['t'], 'weight_pct' => $r2($h['w']),
            'unrealized_pct' => $r2($h['pnlPct']), 'volatility_annual_pct' => $r2($h['vol']), 'return_1y_pct' => $r2($h['y1']), 'max_drawdown_1y_pct' => $r2($h['mdd'])], $M['holdings']),
        'portfolio' => ['stocks_count' => $M['n'], 'hhi' => $r2($M['hhi']), 'effective_n' => $r2($M['effN']), 'top1_pct' => $r2($M['top1']), 'top3_pct' => $r2($M['top3']),
            'sector_weights_pct' => array_map($r2, $M['sectors']), 'volatility_annual_pct' => $r2($M['volP']), 'max_drawdown_1y_pct' => $r2($M['mddP']), 'return_1y_pct' => $r2($M['y1P']),
            'avg_correlation' => $r2($M['avgCorr']), 'top_correlated_pairs' => $M['pairs'], 'diversification_ratio' => $r2($M['divRatio']), 'risk_score_0_100' => $M['risk'], 'unrealized_pct' => $r2($M['pnlPct']),
            'suggested_max_weight_pct' => $R['cap']],
        'rule_alerts' => array_map(fn($a) => $a['t'] . ': ' . $a['d'], $R['alerts']),
        'candidate_pool' => array_map(fn($s, $x) => ['symbol' => $s, 'name' => $x['n'], 'market' => $x['m']], array_keys($pool), array_values($pool))];
    $system = 'أنت محلل محافظ استثمارية آلي داخل منصة GRIFFINE. المستثمر بيستثمر في الأسهم بخطط تعزيز متوسط (DCA) أو شبكة (Grid)، وكل خطة ليها مبلغ مرصود؛ مفيش حد خسارة في الخطط. '
        . 'حلل تنويع محفظته الفعلية بالعربية الفصحى المبسطة معتمدًا فقط على الأرقام في رسالة المستخدم (نظرية المحفظة الحديثة: الأوزان، HHI، الارتباط، التذبذب، أقصى تراجع، توزيع القطاعات). '
        . 'متخترعش أرقام. ده تحليل تعليمي مش نصيحة استثمارية - متستخدمش صيغة أمر مطلق، واستخدم لغة اقتراح. '
        . 'summary: فقرة من 3 لـ 5 جمل عن مستوى التنويع والمخاطرة. strengths وrisks: من 2 لـ 5 نقاط قصيرة. '
        . 'moves: من 1 لـ 5 خطوات إعادة توازن عملية (symbol = رمز سهم من المحفظة أو من candidate_pool، أو فاضي لخطوة عامة) - الخطوات تكون بتعديل المبلغ المرصود للخطط أو بدء خطة جديدة أو البيع الجزئي عند هدف ربح. '
        . 'market_view: جملتين عن أثر وضع السوق والقطاعات على المحفظة. candidates: من 0 لـ 4 شركات من candidate_pool بس (بنفس الرمز) في قطاعات مش موجودة أو ضعيفة في المحفظة، مع سبب قصير.';
    bs_ai_counter(true);
    $r = bs_ai_call($key, $cfg['model'], $cfg['effort'], $system, "بيانات المحفظة (JSON):\n" . json_encode($in, JSON_UNESCAPED_UNICODE), 12000, mz_ai_schema());
    if (!$r[0]) return ['error' => $r[1]];
    $o = $r[0]; $cl = fn($s, $n = 900) => mb_substr(trim(strip_tags((string)$s)), 0, $n);
    $list = fn($a) => array_values(array_slice(array_filter(array_map(fn($x) => $cl($x, 240), is_array($a) ? $a : [])), 0, 6));
    $held = array_column($M['holdings'], 's'); $ok = fn($s) => $s === '' || in_array($s, $held, true) || isset($pool[$s]);
    $moves = []; foreach ((is_array($o['moves'] ?? null) ? $o['moves'] : []) as $m) { $s = strtoupper($cl($m['symbol'] ?? '', 20)); if (!$ok($s)) $s = '';
        $moves[] = ['s' => $s, 'k' => in_array($m['action'] ?? '', ['reduce', 'add', 'hold', 'watch', 'new'], true) ? $m['action'] : 'watch', 't' => $cl($m['text'] ?? '', 300)]; if (count($moves) >= 5) break; }
    $cands = []; foreach ((is_array($o['candidates'] ?? null) ? $o['candidates'] : []) as $c) { $s = strtoupper($cl($c['symbol'] ?? '', 20)); if (!isset($pool[$s]) || isset($cands[$s])) continue;
        $cands[$s] = ['s' => $s, 'n' => $pool[$s]['n'], 'm' => $pool[$s]['m'], 'r' => $cl($c['reason'] ?? '', 220)]; if (count($cands) >= 4) break; }
    return ['summary' => $cl($o['summary'] ?? ''), 'strengths' => $list($o['strengths'] ?? []), 'risks' => $list($o['risks'] ?? []), 'moves' => $moves,
        'market_view' => $cl($o['market_view'] ?? '', 500), 'candidates' => array_values($cands), 'model' => $r[2] ?? $cfg['model']];
}

function mz_rule_text($M, $R, $pool){
    $f = fn($v) => number_format($v, 2, '.', ',');
    $lvl = $M['risk'] >= 65 ? 'عالية' : ($M['risk'] >= 45 ? 'متوسطة' : 'منخفضة');
    $s = 'محفظتك فيها ' . $M['n'] . ($M['n'] === 1 ? ' سهم' : ' أسهم') . ' في ' . count($M['sectors']) . (count($M['sectors']) === 1 ? ' قطاع' : ' قطاعات') . '، ودرجة الخطورة ' . $lvl . ' (' . $M['risk'] . ' من 100). '
        . 'أكبر سهم ' . $M['holdings'][0]['s'] . ' بوزن ' . $f($M['top1']) . '%، ومؤشر التركّز HHI = ' . $f($M['hhi']) . ' يعني المحفظة كأنها ' . $f($M['effN']) . ' سهم فعليًا. '
        . ($M['volP'] !== null ? 'التذبذب السنوي للمحفظة ' . $f($M['volP']) . '%' . ($M['mddP'] !== null ? ' وأقصى تراجع حصل في السنة ' . $f(abs($M['mddP'])) . '%' : '') . '. ' : '')
        . ($M['avgCorr'] !== null ? 'متوسط الارتباط بين أسهمك ' . $f($M['avgCorr']) . ($M['avgCorr'] >= 0.6 ? ' (عالي — الأسهم بتتحرك مع بعض).' : ' (معقول).') : '');
    $st = []; $rk = [];
    foreach ($R['alerts'] as $a) { if ($a['k'] === 'pos') $st[] = $a['t'] . ' — ' . $a['d']; else $rk[] = $a['t'] . ' — ' . $a['d']; }
    if (!$st) $st[] = 'كل الخطط ليها مبلغ مرصود محدد، فالتعرض لكل سهم معروف مسبقًا.';
    if (!$rk) $rk[] = 'تقلبات السوق العام وأسعار الفائدة بتأثر على كل الأسهم مع بعض.';
    $cands = []; $held = array_column($M['holdings'], 's');
    foreach (array_slice($pool, 0, 4, true) as $sym => $x) $cands[] = ['s' => $sym, 'n' => $x['n'], 'm' => $x['m'], 'r' => 'من أسهم ' . $x['m'] . ' — حلّلها في بصيرة وشوف لو قطاعها بيضيف تنويع لمحفظتك.'];
    return ['summary' => $s, 'strengths' => array_slice($st, 0, 5), 'risks' => array_slice($rk, 0, 5), 'moves' => [], 'market_view' => '', 'candidates' => $cands, 'model' => null];
}

function mz_analyze($conn, $email, $positions, $ccy, $fresh = false){
    $cfg = bs_cfg($conn);
    $sig = md5(json_encode([$email, $positions, $ccy, $cfg, md5(site_config_get($conn, 'basira_ai_key'))]));
    $f = opp_cache_dir() . '/' . md5("mz1|$sig") . '.json';
    if (!$fresh && is_file($f) && time() - filemtime($f) < $cfg['cache_min'] * 60 && ($j = json_decode((string)@file_get_contents($f), true))) { $j['cached'] = true; return $j; }
    $M = mz_metrics($conn, $cfg, $positions);
    if (!$M) return ['ok' => false, 'message' => 'مفيش مراكز مفتوحة بقيمة حالية نقدر نحللها.'];
    $R = mz_rules($M); $pool = mz_pool($cfg, $M);
    $ai = mz_ai($conn, $cfg, $M, $R, $pool); $aiErr = '';
    if (!$ai || isset($ai['error'])) { $aiErr = $ai['error'] ?? ''; $ai = mz_rule_text($M, $R, $pool); $ai['auto'] = true; }
    $out = ['ok' => true, 'ccy' => $ccy, 'at' => gmdate('c'), 'm' => $M, 'alerts' => $R['alerts'], 'moves' => $R['moves'], 'cap' => $R['cap'], 'ai' => $ai, 'aiErr' => $aiErr,
        'config' => ['name' => $cfg['name'], 'disclaimer' => $cfg['disclaimer']]];
    @file_put_contents($f, json_encode($out, JSON_UNESCAPED_UNICODE));
    return $out;
}
