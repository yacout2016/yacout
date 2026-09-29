<?php
/* =====================================================================
   GRIFFINE — symbols_audit.php (الإصدار 97) — مراجعة رموز الأسهم في كل الخطط
   ---------------------------------------------------------------------
   - scan  (GET)  : بيفحص كل رموز الأسهم في خطط كل الحسابات (DCA + Grid) مع مصدر الأسعار
                    ويرجّع قائمة الرموز اللي مش موجودة في البورصة (مدير الموقع بيراجعها الأول)
   - trash (POST) : بينقل الخطط المختارة لسلة المحذوفات (صاحب الخطة يقدر يرجّعها) - مفيش حذف نهائي
   حماية: قبل الفحص بنتأكد إن مصدر الأسعار شغال (سهم مرجعي لكل سوق) - لو مش شغال الفحص بيتلغي
   عشان منعتبرش كل الرموز غلط بسبب انقطاع النت.
   مدير الموقع فقط.
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/quote_lib.php';
require_once __DIR__ . '/trash_lib.php';
require_once __DIR__ . '/plans_store.php';
require_once __DIR__ . '/trades_lib.php';

function sa_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit(); }
$email = $_SESSION['user_email'] ?? '';
if (!$email || empty($_SESSION['is_admin']) || strtolower($email) !== strtolower(ADMIN_EMAIL)) { http_response_code(403); sa_out(["success" => false, "message" => "لمدير الموقع فقط."]); }

// سهم مرجعي معروف لكل سوق (لو مصدر الأسعار مش بيرجّع سعره ← المصدر واقع)
const SA_REF = ['مصر' => 'COMI', 'السعودية' => '2222', 'الإمارات' => 'EMAAR', 'قطر' => 'QNBK', 'الكويت' => 'NBK'];

// الرمز صحيح؟ (زي markets_api prices: الرمز نفسه، أو من غير رقم في الآخر لو خطتين لنفس السهم زي CRVX-2)
function sa_valid($sym, $mkt){
    $raw = strtoupper(trim((string)$sym));
    $cands = [$raw]; $base = preg_replace('/[\s\-_]*\d+$/', '', $raw); if ($base !== '' && $base !== $raw) $cands[] = $base;
    foreach ($cands as $c) {
        if (!preg_match('/^[A-Z0-9.\-]{1,20}$/', $c)) continue;
        $q = mq_get_quote($c, $mkt, 'day');
        if (!empty($q['success']) && is_numeric($q['last'] ?? null) && (float)$q['last'] > 0) return true;
    }
    return false;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($action === 'scan') {
    @set_time_limit(300);
    $res = $conn->query("SELECT id, account_email, plan_type, symbol, data_value FROM user_plans WHERE deleted = 0 AND plan_type IN ('plans', 'grid_plans') ORDER BY account_email, symbol LIMIT 5000");
    $rows = []; $pairs = [];
    while ($r = $res->fetch_assoc()) {
        $d = json_decode((string)$r['data_value'], true);
        $mkt = is_array($d) && isset(MQ_MARKETS[$d['market'] ?? '']) ? $d['market'] : 'مصر';
        $r['market'] = $mkt; unset($r['data_value']); $rows[] = $r;
        $pairs[strtoupper($r['symbol']) . '|' . $mkt] = [$r['symbol'], $mkt];
    }
    // مصدر الأسعار شغال للأسواق المطلوبة؟
    $markets = array_unique(array_map(fn($p) => $p[1], $pairs));
    foreach ($markets as $m) {
        if (!sa_valid(SA_REF[$m] ?? 'COMI', $m)) sa_out(["success" => false, "message" => "مصدر الأسعار غير متاح الآن لسوق {$m} - لم يتم اعتبار أي رمز غلط. حاول لاحقًا."]);
    }
    $ok = []; foreach ($pairs as $k => [$s, $m]) $ok[$k] = sa_valid($s, $m);
    $bad = [];
    foreach ($rows as $r) if (!$ok[strtoupper($r['symbol']) . '|' . $r['market']]) $bad[] = [
        "id" => (int)$r['id'], "email" => $r['account_email'], "kind" => $r['plan_type'] === 'grid_plans' ? 'Grid' : 'DCA', "symbol" => $r['symbol'], "market" => $r['market']];
    sa_out(["success" => true, "checkedPlans" => count($rows), "checkedSymbols" => count($pairs), "invalid" => $bad]);
}

if ($action === 'trash' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    $ids = array_values(array_unique(array_filter(array_map('intval', explode(',', (string)($_POST['ids'] ?? ''))), fn($i) => $i > 0)));
    if (!$ids || count($ids) > 2000) sa_out(["success" => false, "message" => "اختر خططًا أولًا."]);
    $moved = 0; $touched = [];
    foreach ($ids as $id) {
        $st = $conn->prepare("SELECT * FROM user_plans WHERE id = ? AND deleted = 0 AND plan_type IN ('plans', 'grid_plans')"); $st->bind_param("i", $id); $st->execute();
        $r = $st->get_result()->fetch_assoc(); $st->close();
        if (!$r) continue;
        $d = json_decode((string)$r['data_value'], true); $mkt = is_array($d) && isset(MQ_MARKETS[$d['market'] ?? '']) ? $d['market'] : 'مصر';
        if (sa_valid($r['symbol'], $mkt)) continue;   // حماية: رمز صحيح مبيتنقلش حتى لو اتبعت بالغلط
        trash_put($conn, 'plan', ($r['plan_type'] === 'grid_plans' ? 'خطة خطوط الشبكة: ' : 'خطة تعزيز المتوسط: ') . $r['symbol'] . ' (رمز غير موجود في البورصة)',
            ['user_plans' => [['account_email' => $r['account_email'], 'plan_type' => $r['plan_type'], 'symbol' => $r['symbol'], 'data_value' => $r['data_value'], 'version' => $r['version'], 'deleted' => 0]]], [], $r['account_email']);
        $u = $conn->prepare("UPDATE user_plans SET deleted = 1, version = version + 1 WHERE id = ?"); $u->bind_param("i", $id); $u->execute(); $u->close();
        $a = $conn->prepare("DELETE FROM alert_targets WHERE account_email = ? AND symbol = ? AND plan_kind = ?"); $k = $r['plan_type'] === 'grid_plans' ? 'Grid' : 'DCA';
        $a->bind_param("sss", $r['account_email'], $r['symbol'], $k); $a->execute(); $a->close();
        $touched[$r['account_email'] . '|' . $r['plan_type']] = [$r['account_email'], $r['plan_type']];
        $moved++;
    }
    foreach ($touched as [$em, $pt]) { try { trades_rebuild($conn, $em, $pt); } catch (Throwable $e) {} }
    sa_out(["success" => true, "moved" => $moved]);
}

sa_out(["success" => false, "message" => "طلب غير معروف."]);
?>
