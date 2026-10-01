<?php
/* =====================================================================
   GRIFFINE — mizanai_lib.php (الإصدار 122) — «ميزان GRIFFINE AI»: مخطِّط توزيع الاستثمار
   ---------------------------------------------------------------------
   3 أوضاع (الحسابات نفسها في المتصفح - mizanai.js):
     1) توزيع مبلغ على قطاعات الأسهم + الشركات المرشحة في كل قطاع (بتفتح في بصيرة) + خطة DCA / Grid لكل شركة
     2) توزيع شامل للأصول (أسهم / عقار / شهادات / ادخار / ذهب / مصاريف) — مبلغ ثابت أو شهري + النمو المتوقع
     3) فحص توزيعة حالية ← مراكز الخطورة والتركيز وخطوات إعادة التوزيع
   السيرفر بيدي:
     - إحصائيات القطاعات الحقيقية للبورصة: أكبر شركات كل قطاع ← نفس محرك «بصيرة» (درجة الاتجاه + التذبذب + احتمال الصعود)
       ← درجة القطاع + اتجاهه + مخاطرته + الشركات المرشحة (مخزنة 60 دقيقة لكل بورصة)
     - رأي الذكاء الاصطناعي على الدراسة (نفس مفتاح وإعدادات بصيرة) ← ولو مش متاح المتصفح بيكتب الرأي بالقواعد
     - الإعدادات من لوحة التحكم (العوائد السنوية الافتراضية للأصول + نسب الأصول لكل مستوى مخاطرة + التنويه)
   دراسة آلية تعليمية - مش نصيحة استثمارية.
   ===================================================================== */
require_once __DIR__ . '/basira_lib.php';

function mza_defaults(){
    return [
        'name' => 'ميزان', 'disclaimer' => 'التوزيع ده دراسة آلية تعليمية معتمدة على تحليل السوق والمؤشرات والذكاء الاصطناعي، ومش نصيحة استثمارية. العوائد المتوقعة افتراضات ممكن متتحققش، والقرار قرارك.',
        'ai_on' => true, 'save_max' => 50, 'share_on' => true, 'sectors_max' => 12, 'per_sector' => 3,
        // الإصدار 123: أصول منفصلة (حساب بعائد يومي / توفير بعائد سنوي / صناديق نقدية / دخل ثابت / أسهم) - مجموع كل مستوى 100
        'rates' => ['stocks' => 22, 'equity_funds' => 20, 'fixed_funds' => 18, 'money_funds' => 17, 'realestate' => 18, 'gold' => 15, 'cds' => 19, 'daily_bank' => 15, 'savings' => 16],
        'profiles' => [
            'low'  => ['stocks' => 5,  'equity_funds' => 5,  'fixed_funds' => 15, 'money_funds' => 15, 'realestate' => 10, 'gold' => 10, 'cds' => 25, 'daily_bank' => 5, 'savings' => 10],
            'mid'  => ['stocks' => 20, 'equity_funds' => 10, 'fixed_funds' => 10, 'money_funds' => 8,  'realestate' => 15, 'gold' => 10, 'cds' => 15, 'daily_bank' => 4, 'savings' => 8],
            'high' => ['stocks' => 40, 'equity_funds' => 15, 'fixed_funds' => 5,  'money_funds' => 5,  'realestate' => 15, 'gold' => 10, 'cds' => 5,  'daily_bank' => 2, 'savings' => 3],
        ],
    ];
}
function mza_cfg($conn){
    $d = mza_defaults();
    $j = json_decode(site_config_get($conn, 'mizanai_cfg') ?: 'null', true);
    if (is_array($j)) foreach ($d as $k => $v) {
        if (!array_key_exists($k, $j)) continue;
        if ($k === 'profiles') { foreach ($v as $r => $pv) if (is_array($j[$k][$r] ?? null) && isset($j[$k][$r]['money_funds'])) foreach ($pv as $a => $x) if (isset($j[$k][$r][$a])) $d[$k][$r][$a] = max(0, min(100, (float)$j[$k][$r][$a])); }
        elseif ($k === 'rates') { foreach ($v as $a => $x) if (isset($j[$k][$a])) $d[$k][$a] = max(-50, min(100, (float)$j[$k][$a])); }
        elseif (is_bool($v)) $d[$k] = !empty($j[$k]);
        elseif (is_int($v)) $d[$k] = (int)$j[$k];
        else $d[$k] = mb_substr((string)$j[$k], 0, 1500);
    }
    $d['save_max'] = max(5, min(200, $d['save_max'])); $d['sectors_max'] = max(4, min(20, $d['sectors_max'])); $d['per_sector'] = max(1, min(5, $d['per_sector']));
    return $d;
}
function mza_ready($conn){
    static $r = null; if ($r !== null) return $r;
    try { $x = $conn->query("SHOW TABLES LIKE 'mizan_studies'"); $r = $x && $x->num_rows > 0; } catch (Throwable $e) { $r = false; }
    return $r;
}

/* إحصائيات القطاعات: أكبر القطاعات بالقيمة السوقية ← أكبر شركات كل قطاع ← محرك بصيرة لكل شركة */
function mza_sectors($conn, $market){
    $cfg = mza_cfg($conn); $bcfg = bs_cfg($conn);
    $f = opp_cache_dir() . '/' . md5('mza122|' . $market . '|' . $cfg['sectors_max'] . '|' . $cfg['per_sector']) . '.json';
    if (is_file($f) && time() - filemtime($f) < 3600 && ($j = json_decode((string)@file_get_contents($f), true))) { $j['cached'] = true; return $j; }
    $U = bs_universe($conn, $market); $names = bs_names($bcfg);
    $by = [];
    foreach ($U as $u) { if ($u['sec'] === 'غير محدد' && count($U) > 20) continue; $by[$u['sec']][] = $u; }
    uksort($by, fn($a, $b) => array_sum(array_column($by[$b], 'cap')) <=> array_sum(array_column($by[$a], 'cap')) ?: count($by[$b]) <=> count($by[$a]));
    $out = [];
    foreach (array_slice($by, 0, $cfg['sectors_max'], true) as $sec => $list) {
        $cos = [];
        foreach (array_slice($list, 0, $cfg['per_sector'] + 1) as $u) {
            $q = bs_scan_item($conn, $u['s'], $market); if (empty($q['ok'])) continue;
            $vol = $q['vol'] !== null ? (float)$q['vol'] * sqrt(252) : null;   // التذبذب السنوي %
            $cos[] = ['s' => $u['s'], 'n' => $names['*'][$u['s']] ?? ($names[$market][$u['s']] ?? $u['n']), 'score' => (int)$q['score'], 'last' => $q['last'],
                'up' => (int)($q['hz']['month']['up'] ?? 50), 'up3' => (int)($q['hz']['3m']['up'] ?? 50), 'upY' => (int)($q['hz']['year']['up'] ?? 50), 'vol' => $vol !== null ? round($vol, 1) : null, 'y1' => $q['y1'] !== null ? round($q['y1'], 1) : null];
            if (count($cos) >= $cfg['per_sector']) break;
        }
        if (!$cos) continue;
        usort($cos, fn($a, $b) => $b['score'] <=> $a['score']);
        $n = count($cos); $score = (int)round(array_sum(array_column($cos, 'score')) / $n); $up = array_sum(array_column($cos, 'up')) / $n;
        $vols = array_values(array_filter(array_column($cos, 'vol'), fn($v) => $v !== null)); $vol = $vols ? array_sum($vols) / count($vols) : 30;
        $y1s = array_values(array_filter(array_column($cos, 'y1'), fn($v) => $v !== null)); $y1 = $y1s ? array_sum($y1s) / count($y1s) : null;
        foreach ($cos as &$c) $c['plan'] = (($c['vol'] ?? 30) >= 40 || ($c['up'] > 44 && $c['up'] < 56 && ($c['vol'] ?? 30) >= 28)) ? 'Grid' : 'DCA'; unset($c);
        $trend = $up >= 56 ? 'صاعد' : ($up <= 44 ? 'هابط' : 'عرضي'); $risk = $vol < 25 ? 'منخفض' : ($vol < 40 ? 'متوسط' : 'مرتفع');
        $why = 'متوسط درجة بصيرة لأكبر شركاته ' . $score . '/100، واحتمال الصعود خلال شهر ' . round($up) . '% (اتجاه ' . $trend . ')، والتذبذب السنوي حوالي ' . round($vol) . '% (مخاطرة ' . $risk . ')' . ($y1 !== null ? '، وعائد السنة الماضية ' . ($y1 >= 0 ? '+' : '') . round($y1, 1) . '%' : '') . '.';
        $out[] = ['k' => md5($sec), 'n' => $sec, 'score' => $score, 'up' => round($up, 1), 'vol' => round($vol, 1), 'y1' => $y1 !== null ? round($y1, 1) : null, 'trend' => $trend, 'risk' => $risk, 'why' => $why, 'count' => count($list), 'co' => $cos];
    }
    $res = ['market' => $market, 'at' => gmdate('c'), 'sectors' => $out];
    if ($out) @file_put_contents($f, json_encode($res, JSON_UNESCAPED_UNICODE));
    return $res;
}

/* رأي الذكاء الاصطناعي على الدراسة (ملخص الأرقام بس - من غير بيانات المستخدم) */
function mza_ai_schema(){
    $str = ['type' => 'string'];
    return ['type' => 'object', 'additionalProperties' => false, 'required' => ['summary', 'strengths', 'risks', 'steps'],
        'properties' => ['summary' => $str, 'strengths' => ['type' => 'array', 'items' => $str], 'risks' => ['type' => 'array', 'items' => $str], 'steps' => ['type' => 'array', 'items' => $str]]];
}
function mza_ai($conn, $mode, $summary){
    $cfg = mza_cfg($conn); $bcfg = bs_cfg($conn);
    $key = site_config_get($conn, 'basira_ai_key');
    if (empty($cfg['ai_on']) || empty($bcfg['ai_on']) || $key === '') return null;
    $sig = md5(json_encode([$mode, $summary, $bcfg['model']]));
    $f = opp_cache_dir() . '/' . md5("mzai122|$sig") . '.json';
    if (is_file($f) && time() - filemtime($f) < 3600 && ($j = json_decode((string)@file_get_contents($f), true))) return $j;
    if ($bcfg['ai_daily_max'] > 0 && bs_ai_counter() >= $bcfg['ai_daily_max']) return ['error' => 'وصلنا للحد اليومي لطلبات الذكاء الاصطناعي.'];
    $what = ['stocks' => 'توزيع مبلغ على قطاعات البورصة وشركات مرشحة', 'assets' => 'توزيع شامل على الأصول (أسهم وعقار وشهادات وادخار وذهب وسيولة) مع توقع النمو', 'check' => 'فحص توزيعة استثمار حالية وخطوات إعادة التوزيع'][$mode] ?? 'دراسة توزيع استثمار';
    $system = 'أنت مستشار توزيع استثمارات آلي داخل منصة GRIFFINE. اكتب بالعربية الفصحى المبسطة رأيًا تعليميًا على ' . $what . '، معتمدًا فقط على الأرقام في رسالة المستخدم (نظرية المحفظة الحديثة، التنويع، مستوى المخاطرة، الفائدة المركبة). '
        . 'متخترعش أرقام ولا أخبار. ده مش نصيحة استثمارية - استخدم لغة اقتراح واحتمالات. summary: فقرة من 3 لـ 5 جمل. strengths وrisks: من 2 لـ 4 نقاط قصيرة. steps: من 2 لـ 4 خطوات تنفيذ عملية (زي الدخول على مراحل بخطط DCA أو المراجعة كل 3 شهور).';
    bs_ai_counter(true);
    $r = bs_ai_call($key, $bcfg['model'], $bcfg['effort'], $system, "بيانات الدراسة (JSON):\n" . json_encode($summary, JSON_UNESCAPED_UNICODE), 6000, mza_ai_schema());
    if (!$r[0]) return ['error' => $r[1]];
    $o = $r[0]; $cl = fn($s, $n = 900) => mb_substr(trim(strip_tags((string)$s)), 0, $n);
    $list = fn($a) => array_values(array_slice(array_filter(array_map(fn($x) => $cl($x, 220), is_array($a) ? $a : [])), 0, 5));
    $out = ['summary' => $cl($o['summary'] ?? ''), 'strengths' => $list($o['strengths'] ?? []), 'risks' => $list($o['risks'] ?? []), 'steps' => $list($o['steps'] ?? []), 'model' => $r[2] ?? $bcfg['model']];
    @file_put_contents($f, json_encode($out, JSON_UNESCAPED_UNICODE));
    return $out;
}
