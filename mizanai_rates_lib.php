<?php
/* =====================================================================
   GRIFFINE — mizanai_rates_lib.php (الإصدار 130) — العوائد السنوية لكل أصل «أونلاين» (مجاني بالكامل)
   - أسهم: متوسط عائد مؤشر البورصة (سنة + 3 سنين) من بيانات السوق المجانية
   - صناديق أسهم: عائد المؤشر ناقص متوسط مصاريف الصناديق
   - ذهب: نمو سعر الذهب بالعملة المحلية آخر 3 سنين (أوقية الذهب بالدولار × سعر الدولار)
   - شهادات / توفير / حساب يومي / صناديق نقدية / دخل ثابت: سعر الفائدة الأساسي من موقع البنك المركزي ± فرق ثابت (الأدمن بيظبطه)
     الإصدار 131: أكتر من مصدر مجاني بالترتيب (البنك المركزي ← البنك الأهلي ← بنك مصر ← أي موقع الأدمن يضيفه):
       مصدر «policy» = سعر الفائدة الأساسي ، مصدر «cds» = عائد الشهادات مباشرة من البنك
       لو كل المصادر فشلت ← سعر الفائدة الاحتياطي من لوحة التحكم ← وإلا المستثمر بيكتب النسبة يدوي
   - عقار: مفيش مصدر مجاني موثوق ← تقدير الأدمن لو كاتبه، وإلا المستثمر بيكتبه يدوي
   - أي رقم مش متاح ← null (الشاشة بتطلب من المستثمر يكتبه يدوي)
   - التحديث: تلقائي كل N يوم (افتراضي 30) + «حدّث الآن» مرة واحدة في اليوم لكل سوق + سجل بكل تحديث
   - المستثمر: تلقائي أو يدوي — الأرقام اليدوية محفوظة على حسابه (لكل سوق)
   ===================================================================== */
require_once __DIR__ . '/quote_lib.php';
require_once __DIR__ . '/markets_core.php';

const MR_ASSETS = ['stocks', 'equity_funds', 'fixed_funds', 'money_funds', 'realestate', 'gold', 'cds', 'daily_bank', 'savings'];
const MR_RATE_ASSETS = ['cds' => 'sp_cds', 'savings' => 'sp_savings', 'daily_bank' => 'sp_daily', 'money_funds' => 'sp_money', 'fixed_funds' => 'sp_fixed'];

function mr_defaults(){
    return [
        'auto_days' => 30, 'fund_fee' => 2, 're_est' => '',
        // الفرق عن سعر الفائدة الأساسي (نقاط مئوية — بالسالب = أقل منه)
        'sp_cds' => -3, 'sp_savings' => -6, 'sp_daily' => -8, 'sp_money' => -4, 'sp_fixed' => -3,
        // لكل سوق: رمز المؤشر + صفحة البنك المركزي + الكلمة اللي جنب سعر الفائدة + سعر احتياطي لو الصفحة ماتفتحتش
        'markets' => [
            'مصر'      => ['index' => '^CASE30',  'url' => '', 'kw' => '', 'fb' => '', 'sources' => implode("\n", [
                'البنك المركزي المصري | https://www.cbe.org.eg/en/monetary-policy | Overnight Deposit | policy',
                'البنك المركزي المصري (عربي) | https://www.cbe.org.eg/ar/monetary-policy | الإيداع لليلة واحدة | policy',
                'البنك الأهلي المصري | https://www.nbe.com.eg/NBE/E/#/EN/ProductCategory?inParams=%7B%22CategoryID%22%3A%22CertificatesID%22%7D | 3 Years | cds',
                'بنك مصر | https://www.banquemisr.com/en/Home/SAVINGS/Certificates | 3 years | cds'])],
            'السعودية' => ['index' => '^TASI.SR', 'url' => '', 'kw' => '', 'fb' => '', 'sources' => 'البنك المركزي السعودي | https://www.sama.gov.sa/en-US/Pages/default.aspx | Repo | policy'],
            'الإمارات' => ['index' => '^DFMGI',   'url' => '', 'kw' => '', 'fb' => '', 'sources' => ''],
            'قطر'      => ['index' => '^QSI',     'url' => '', 'kw' => '', 'fb' => '', 'sources' => ''],
            'الكويت'   => ['index' => '^BKP',     'url' => '', 'kw' => '', 'fb' => '', 'sources' => ''],
        ],
    ];
}
function mr_cfg($conn){
    $d = mr_defaults(); $j = json_decode((string)(site_config_get($conn, 'mizanai_rates_cfg') ?: 'null'), true);
    if (!is_array($j)) return $d;
    foreach (['auto_days' => [1, 365], 'fund_fee' => [0, 10], 'sp_cds' => [-30, 30], 'sp_savings' => [-30, 30], 'sp_daily' => [-30, 30], 'sp_money' => [-30, 30], 'sp_fixed' => [-30, 30]] as $k => [$lo, $hi])
        if (isset($j[$k]) && is_numeric($j[$k])) $d[$k] = max($lo, min($hi, (float)$j[$k]));
    if (isset($j['re_est'])) $d['re_est'] = is_numeric($j['re_est']) && $j['re_est'] !== '' ? (string)max(-20, min(60, (float)$j['re_est'])) : '';
    foreach ($d['markets'] as $m => $v) if (isset($j['markets'][$m]) && is_array($j['markets'][$m])) foreach ($v as $f => $x) if (isset($j['markets'][$m][$f])) {
        $val = trim((string)$j['markets'][$m][$f]);
        if ($f === 'url' && $val !== '' && !preg_match('#^https?://#i', $val)) $val = '';
        if ($f === 'fb') $val = is_numeric($val) ? (string)max(0, min(60, (float)$val)) : '';
        $d['markets'][$m][$f] = mb_substr($val, 0, $f === 'sources' ? 3000 : 300);
    }
    return $d;
}
function mr_live_all($conn){ $j = json_decode((string)(site_config_get($conn, 'mizanai_live') ?: '{}'), true); return is_array($j) ? $j : []; }
function mr_live_save($conn, $all){ site_config_set($conn, 'mizanai_live', json_encode($all, JSON_UNESCAPED_UNICODE), 'system'); }

function mr_raw($url){
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12, CURLOPT_CONNECTTIMEOUT => 6, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 4,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; GRIFFINE/1.0; +https://www.griffine.app)', CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS]);
    $b = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return ($code >= 200 && $code < 300 && is_string($b)) ? $b : null;
}
/* إغلاقات شهرية آخر 5 سنين لأي رمز */
function mr_monthly($sym){
    $j = mq_http(MARKET_QUOTE_BASE . rawurlencode($sym) . '?range=5y&interval=1mo&includePrePost=false');
    $r = $j['chart']['result'][0] ?? null; if (!$r || empty($r['timestamp'])) return null;
    $c = []; foreach ($r['timestamp'] as $i => $t) { $v = $r['indicators']['quote'][0]['close'][$i] ?? null; if ($v !== null && $v > 0) $c[(int)$t] = (float)$v; }
    return count($c) >= 13 ? $c : null;
}
/* عائد سنوي % : متوسط (آخر سنة + متوسط 3 سنين) */
function mr_cagr($series){
    $v = array_values($series); $n = count($v); if ($n < 13) return null;
    $last = $v[$n - 1]; $y1 = $v[$n - 13]; $one = ($last / $y1 - 1) * 100;
    if ($n >= 37) { $three = (pow($last / $v[$n - 37], 1 / 3) - 1) * 100; return ($one + $three) / 2; }
    return $one;
}
/* الإصدار 131: المصادر — سطر لكل مصدر: الاسم | الرابط | الكلمة اللي جنب النسبة | policy أو cds
   (رابط + كلمة الإصدار 130 القديمة لو متسجلة بتبقى أول مصدر) */
function mr_sources($M){
    $out = [];
    if (!empty($M['url']) && !empty($M['kw'])) $out[] = ['name' => 'المصدر المحفوظ', 'url' => $M['url'], 'kw' => $M['kw'], 'kind' => 'policy'];
    foreach (preg_split('/\R/u', (string)($M['sources'] ?? '')) as $ln) {
        $p = array_map('trim', explode('|', $ln)); if (count($p) < 3) continue;
        if (!preg_match('#^https?://#i', $p[1]) || $p[2] === '') continue;
        $out[] = ['name' => mb_substr($p[0] ?: 'مصدر', 0, 60), 'url' => $p[1], 'kw' => mb_substr($p[2], 0, 80), 'kind' => strtolower($p[3] ?? 'policy') === 'cds' ? 'cds' : 'policy'];
        if (count($out) >= 8) break;
    }
    return $out;
}
/* سعر الفائدة الأساسي من صفحة البنك المركزي: أول نسبة % بعد الكلمة المحددة */
function mr_policy_rate($url, $kw){
    if ($url === '' || $kw === '') return null;
    $h = mr_raw($url); if (!$h) return null;
    $t = html_entity_decode(preg_replace('/\s+/u', ' ', strip_tags(preg_replace('#<(script|style)\b[^>]*>.*?</\1>#is', ' ', $h))), ENT_QUOTES, 'UTF-8');
    $p = mb_stripos($t, $kw); if ($p === false) return null;
    if (preg_match('/(\d{1,2}(?:\.\d{1,3})?)\s*%/u', mb_substr($t, $p, 400), $m)) { $v = (float)$m[1]; return ($v > 0 && $v < 60) ? $v : null; }
    return null;
}
/* تحديث سوق واحد (من النت) — بيرجّع [rates, src] وأي رقم مش متاح null */
function mr_fetch($conn, $market, $prev = null){
    $C = mr_cfg($conn); $M = $C['markets'][$market] ?? ['index' => '', 'url' => '', 'kw' => '', 'fb' => ''];
    $R = array_fill_keys(MR_ASSETS, null); $S = array_fill_keys(MR_ASSETS, ''); $clamp = fn($v) => $v === null ? null : round(max(-20, min(60, $v)), 1);
    // الأسهم + صناديق الأسهم
    $ix = $M['index'] !== '' ? mr_monthly($M['index']) : null;
    if ($ix && ($g = mr_cagr($ix)) !== null) { $R['stocks'] = $clamp($g); $S['stocks'] = 'متوسط عائد مؤشر البورصة (' . $M['index'] . ') آخر سنة و3 سنين';
        $R['equity_funds'] = $clamp($g - $C['fund_fee']); $S['equity_funds'] = 'عائد المؤشر ناقص ' . $C['fund_fee'] . '% مصاريف صناديق'; }
    // الذهب بالعملة المحلية
    $ccy = function_exists('mc_ccy') ? mc_ccy($market) : 'EGP';
    $gold = mr_monthly('GC=F'); $fx = $ccy === 'USD' ? null : mr_monthly($ccy . '=X');
    if ($gold) { $loc = [];
        if ($fx) { $fxv = $fx; foreach ($gold as $t => $g) { $best = null; foreach ($fxv as $ft => $fv) { if ($best === null || abs($ft - $t) < abs($best - $t)) $best = $ft; } if ($best !== null && abs($best - $t) < 20 * 86400) $loc[$t] = $g * $fxv[$best]; } }
        elseif ($ccy === 'USD') $loc = $gold;
        if (count($loc) >= 13 && ($g = mr_cagr($loc)) !== null) { $R['gold'] = $clamp($g); $S['gold'] = 'نمو سعر الذهب بال' . (function_exists('mk_ccy_ar') ? mk_ccy_ar($ccy) : $ccy) . ' آخر 3 سنين'; } }
    // الأصول المرتبطة بسعر الفائدة — الإصدار 131: أكتر من مصدر بالترتيب لحد ما واحد ينجح
    $pol = null; $polSrc = ''; $cds = null; $cdsSrc = ''; $tried = [];
    foreach (mr_sources($M) as $src) {
        if ($src['kind'] === 'policy' && $pol !== null) continue;
        if ($src['kind'] === 'cds' && ($cds !== null || $pol !== null)) continue;   // سعر الفائدة الأساسي كفاية لكل الأصول
        $v = mr_policy_rate($src['url'], $src['kw']);
        $tried[] = ['name' => $src['name'], 'kind' => $src['kind'], 'ok' => $v !== null, 'v' => $v];
        if ($v === null) continue;
        if ($src['kind'] === 'policy') { $pol = $v; $polSrc = 'سعر الفائدة من ' . $src['name']; } else { $cds = $v; $cdsSrc = 'عائد الشهادات من ' . $src['name']; }
    }
    if ($pol === null && $cds === null && $M['fb'] !== '') { $pol = (float)$M['fb']; $polSrc = 'سعر الفائدة من لوحة التحكم'; $tried[] = ['name' => 'سعر الفائدة الاحتياطي (لوحة التحكم)', 'kind' => 'policy', 'ok' => true, 'v' => $pol]; }
    if ($pol !== null) foreach (MR_RATE_ASSETS as $a => $sk) { $R[$a] = $clamp($pol + $C[$sk]); $S[$a] = $polSrc . ' (' . $pol . '%) ' . ($C[$sk] >= 0 ? '+ ' : '− ') . abs($C[$sk]); }
    elseif ($cds !== null) foreach (MR_RATE_ASSETS as $a => $sk) {   // عائد الشهادات من بنك ← باقي الأصول بنفس الفروق عن الشهادات
        $d = $C[$sk] - $C['sp_cds']; $R[$a] = $clamp($cds + $d); $S[$a] = $a === 'cds' ? $cdsSrc . ' (' . $cds . '%)' : $cdsSrc . ' (' . $cds . '%) ' . ($d >= 0 ? '+ ' : '− ') . abs($d); }
    $GLOBALS['__mr_tried'] = $tried;
    // العقار
    if ($C['re_est'] !== '') { $R['realestate'] = (float)$C['re_est']; $S['realestate'] = 'تقدير لوحة التحكم'; }
    // اللي فشل ← آخر رقم ناجح لو عمره أقل من 90 يوم
    if (is_array($prev)) foreach (MR_ASSETS as $a) if ($R[$a] === null && isset($prev['rates'][$a]) && $prev['rates'][$a] !== null && (time() - (int)($prev['ok_at'][$a] ?? 0)) < 90 * 86400) {
        $R[$a] = $prev['rates'][$a]; $S[$a] = 'آخر تحديث ناجح ' . date('Y-m-d', (int)$prev['ok_at'][$a]); }
    return [$R, $S, $pol];
}
/* الأرقام الحالية لسوق: بتتحدث تلقائي لو قدمت ($force = «حدّث الآن» — مرة في اليوم لكل سوق) */
function mr_get($conn, $market, $force = false, $trigger = 'auto', $by = ''){
    $all = mr_live_all($conn); $cur = $all[$market] ?? null; $C = mr_cfg($conn);
    $age = $cur ? time() - (int)$cur['at'] : PHP_INT_MAX;
    $due = !$cur || $age >= $C['auto_days'] * 86400 || ($force && date('Y-m-d', (int)$cur['at']) !== date('Y-m-d'));
    if ($trigger === 'admin') $due = true;
    $fresh = false;
    if ($due) {
        $lk = 'gf_mr_' . md5($market); $got = 0;
        try { $r = $conn->query("SELECT GET_LOCK('" . $conn->real_escape_string($lk) . "', 0)"); $got = (int)($r ? $r->fetch_row()[0] : 0); } catch (Throwable $e) { $got = 1; }
        if ($got) {
            try {
                @set_time_limit(90);
                [$R, $S, $pol] = mr_fetch($conn, $market, $cur);
                $ok = $cur['ok_at'] ?? []; foreach (MR_ASSETS as $a) if ($R[$a] !== null && strpos($S[$a], 'آخر تحديث ناجح') !== 0) $ok[$a] = time();
                $new = ['rates' => $R, 'src' => $S, 'policy' => $pol, 'at' => time(), 'ok_at' => $ok, 'trigger' => $trigger, 'tried' => $GLOBALS['__mr_tried'] ?? []];
                $all = mr_live_all($conn); $all[$market] = $new; mr_live_save($conn, $all);
                try { $old = $cur ? json_encode($cur['rates']) : null; $nr = json_encode($R); $ns = json_encode($S, JSON_UNESCAPED_UNICODE);
                    $st = $conn->prepare("INSERT INTO mizan_rates_log (market, old_rates, new_rates, sources, trigger_kind, created_by) VALUES (?, ?, ?, ?, ?, ?)"); $st->bind_param("ssssss", $market, $old, $nr, $ns, $trigger, $by); $st->execute(); $st->close(); } catch (Throwable $e) {}
                $cur = $new; $fresh = true;
            } finally { try { $conn->query("SELECT RELEASE_LOCK('" . $conn->real_escape_string($lk) . "')"); } catch (Throwable $e) {} }
        }
    }
    if (!$cur) $cur = ['rates' => array_fill_keys(MR_ASSETS, null), 'src' => array_fill_keys(MR_ASSETS, ''), 'at' => 0];
    $next = $cur['at'] ? (int)$cur['at'] + $C['auto_days'] * 86400 : 0;
    return ['rates' => $cur['rates'], 'src' => $cur['src'], 'at' => $cur['at'] ? date('Y-m-d H:i:s', (int)$cur['at']) : null, 'next' => $next ? date('Y-m-d', $next) : null,
        'fresh' => $fresh, 'todayDone' => $cur['at'] && date('Y-m-d', (int)$cur['at']) === date('Y-m-d'), 'autoDays' => (int)$C['auto_days'],
        'missing' => array_values(array_keys(array_filter($cur['rates'], fn($v) => $v === null)))];
}
/* أرقام المستثمر المحفوظة على حسابه (لكل سوق): الوضع + الأرقام اليدوية / الخانات اللي كتبها لأنها مش متاحة أونلاين */
function mr_user_get($conn, $email, $market){
    try { $st = $conn->prepare("SELECT mode, rates, updated_at FROM mizan_user_rates WHERE account_email = ? AND market = ?"); $st->bind_param("ss", $email, $market); $st->execute(); $r = $st->get_result()->fetch_assoc(); $st->close(); } catch (Throwable $e) { $r = null; }
    if (!$r) return ['mode' => 'auto', 'rates' => new stdClass(), 'at' => null];
    $x = json_decode((string)$r['rates'], true);
    return ['mode' => $r['mode'] === 'manual' ? 'manual' : 'auto', 'rates' => is_array($x) && $x ? $x : new stdClass(), 'at' => $r['updated_at']];
}
function mr_user_save($conn, $email, $market, $mode, $rates){
    $clean = []; foreach (MR_ASSETS as $a) if (isset($rates[$a]) && $rates[$a] !== '' && is_numeric($rates[$a])) $clean[$a] = round(max(-50, min(100, (float)$rates[$a])), 2);
    $mode = $mode === 'manual' ? 'manual' : 'auto'; $j = json_encode($clean);
    $st = $conn->prepare("INSERT INTO mizan_user_rates (account_email, market, mode, rates) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE mode = VALUES(mode), rates = VALUES(rates), updated_at = NOW()");
    $st->bind_param("ssss", $email, $market, $mode, $j); $st->execute(); $st->close();
    return ['mode' => $mode, 'rates' => $clean ?: new stdClass()];
}
function mr_ready($conn){
    static $r = null; if ($r !== null) return $r;
    try { $x = $conn->query("SHOW TABLES LIKE 'mizan_user_rates'"); $r = $x && $x->num_rows > 0; } catch (Throwable $e) { $r = false; }
    return $r;
}
?>
