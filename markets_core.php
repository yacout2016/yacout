<?php
/* =====================================================================
   GRIFFINE — markets_core.php (الإصدار 96) — أسواق الحسابات
   ---------------------------------------------------------------------
   - كل حساب ليه سوق واحد بيختاره وقت التسجيل (الافتراضي مصر) ومبيتغيّرش بعد كده
   - كل حاجة في الحساب بعملة سوقه: الخطط، المحفظة، التقارير، الباقات، الدفع
   - الأدمن بيحدد الأسواق المفعّلة (active_markets) - الافتراضي مصر بس
     السوق المتقفل مبيظهرش في التسجيل ولا عند المستخدمين، والأدمن يقدر يجهّز باقاته ودفعه من بدري
   - بيانات الدفع لكل سوق (تحويل بنكي + طريقة إضافية + Paymob لو متاح) في site_config
   ===================================================================== */
require_once __DIR__ . '/security_lib.php';

const MC_MARKETS = [
    'مصر'      => ['code' => 'EG', 'ccy' => 'EGP', 'ccyAr' => 'جنيه مصري',   'short' => 'جنيه'],
    'السعودية' => ['code' => 'SA', 'ccy' => 'SAR', 'ccyAr' => 'ريال سعودي',  'short' => 'ريال'],
    'الإمارات' => ['code' => 'AE', 'ccy' => 'AED', 'ccyAr' => 'درهم إماراتي', 'short' => 'درهم'],
    'قطر'      => ['code' => 'QA', 'ccy' => 'QAR', 'ccyAr' => 'ريال قطري',   'short' => 'ريال'],
    'الكويت'   => ['code' => 'KW', 'ccy' => 'KWD', 'ccyAr' => 'دينار كويتي', 'short' => 'دينار'],
];
function mc_valid($m){ return is_string($m) && isset(MC_MARKETS[$m]); }
function mc_code($m){ return MC_MARKETS[$m]['code'] ?? 'EG'; }
function mc_ccy($m){ return MC_MARKETS[$m]['ccy'] ?? 'EGP'; }
function mc_ready($conn){
    static $r = null; if ($r !== null) return $r;
    try { $x = $conn->query("SHOW COLUMNS FROM users LIKE 'account_market'"); $r = $x && $x->num_rows > 0; } catch (Throwable $e) { $r = false; }
    return $r;
}
function mc_col($conn, $table, $col){
    static $cache = []; $k = "$table.$col"; if (isset($cache[$k])) return $cache[$k];
    try { $x = $conn->query("SHOW COLUMNS FROM `$table` LIKE '" . $conn->real_escape_string($col) . "'"); $cache[$k] = $x && $x->num_rows > 0; } catch (Throwable $e) { $cache[$k] = false; }
    return $cache[$k];
}
// الأسواق المفعّلة (بالترتيب الثابت) - مصر دايمًا لو مفيش حاجة
function mc_active($conn){
    $raw = site_config_get($conn, 'active_markets');
    $list = array_values(array_filter(array_map('trim', explode(',', (string)$raw)), 'mc_valid'));
    if (!$list) $list = ['مصر'];
    return array_values(array_filter(array_keys(MC_MARKETS), fn($m) => in_array($m, $list, true)));
}
function mc_account_market($conn, $email){
    if (!$email || !mc_ready($conn)) return 'مصر';
    $st = $conn->prepare("SELECT account_market FROM users WHERE username = ? LIMIT 1"); $st->bind_param("s", $email); $st->execute();
    $r = $st->get_result()->fetch_assoc(); $st->close();
    return mc_valid($r['account_market'] ?? '') ? $r['account_market'] : 'مصر';
}
// بيانات الدفع لسوق (من غير أسرار)
function mc_payment($conn, $m){
    $c = strtolower(mc_code($m));
    $p = [
        'bank'  => site_config_on($conn, "bank_on_$c"),
        'bankName' => site_config_get($conn, "bank_name_$c"), 'bankHolder' => site_config_get($conn, "bank_holder_$c"),
        'bankIban' => site_config_get($conn, "bank_iban_$c"), 'bankNote' => site_config_get($conn, "bank_note_$c"),
        'extra' => site_config_on($conn, "extra_on_$c"), 'extraLabel' => site_config_get($conn, "extra_label_$c"), 'extraDetails' => site_config_get($conn, "extra_details_$c"),
        'paymob' => false,   // Paymob بالجنيه المصري بس ← متاح لسوق مصر فقط
    ];
    if ($m === 'مصر') { $p['vodafone'] = site_config_on($conn, 'pay_vodafone'); $p['instapay'] = site_config_on($conn, 'pay_instapay'); $p['paymob'] = site_config_on($conn, 'pay_paymob'); }
    else { $p['vodafone'] = false; $p['instapay'] = false; }
    return $p;
}
// هل طريقة الدفع مسموحة لسوق الحساب؟
function mc_method_allowed($conn, $m, $method){
    $p = mc_payment($conn, $m);
    if ($method === 'free') return true;
    if ($method === 'vodafone') return !empty($p['vodafone']);
    if ($method === 'instapay') return !empty($p['instapay']);
    if ($method === 'bank') return !empty($p['bank']);
    if ($method === 'wallet') return !empty($p['extra']);
    if ($method === 'paymob' || $method === 'card') return !empty($p['paymob']);
    return false;
}
?>
