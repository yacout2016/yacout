<?php
/* =====================================================================
   GRIFFINE — paymob_lib.php (الإصدار 84) — بوابة الدفع Paymob (Visa / Mastercard / Meeza)
   ---------------------------------------------------------------------
   الخطوات (Paymob Accept API):
     1) auth/tokens (API Key)            ← توكن مؤقت
     2) ecommerce/orders                 ← رقم طلب عند Paymob
     3) acceptance/payment_keys          ← مفتاح دفع للعميل ده
     4) العميل بيتحوّل لصفحة الدفع الآمنة بتاعة Paymob (iframe) - بيانات الكارت عمرها ما بتعدّي على موقعنا
     5) Paymob بيرجّع على paymob_callback.php ← نتحقق من التوقيع (HMAC) ← الاشتراك يتفعّل تلقائي
   البيانات (API Key / Integration ID / Iframe ID / HMAC) بيكتبها الأدمن من لوحة التحكم ← الدفع ورقم الخدمة
   ===================================================================== */
if (!defined('PAYMOB_BASE')) define('PAYMOB_BASE', 'https://accept.paymob.com');

function paymob_ready($conn){
    return site_config_get($conn, 'paymob_api_key') !== '' && site_config_get($conn, 'paymob_integration') !== ''
        && site_config_get($conn, 'paymob_iframe') !== '' && site_config_get($conn, 'paymob_hmac') !== '';
}
function paymob_enabled($conn){ return site_config_on($conn, 'pay_paymob') && paymob_ready($conn); }

function paymob_http($path, $payload){
    $ch = curl_init(rtrim(PAYMOB_BASE, '/') . $path);
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $j = json_decode((string)$body, true);
    if ($code < 200 || $code >= 300 || !is_array($j)) {
        error_log("GRIFFINE paymob $path HTTP $code " . mb_substr((string)$body, 0, 300));
        return null;
    }
    return $j;
}

/* بيبدأ عملية دفع ويرجّع [رابط صفحة الدفع, رسالة خطأ]
   $ctx = kind (new | change), subscriber_id, account_email, plan_id, immediate, amount, name, phone, email */
function paymob_start($conn, $ctx){
    if (!paymob_enabled($conn)) return [null, 'الدفع بالبطاقة مش متاح دلوقتي.'];
    $cents = (int)round(((float)$ctx['amount']) * 100);
    if ($cents <= 0) return [null, 'المبلغ غير صالح.'];

    $auth = paymob_http('/api/auth/tokens', ['api_key' => site_config_get($conn, 'paymob_api_key')]);
    if (!$auth || empty($auth['token'])) return [null, 'تعذّر الاتصال ببوابة الدفع (راجع API Key).'];
    $token = $auth['token'];

    // سجل الطلب عندنا الأول (عشان نعرف نطبّق إيه لما Paymob يرجّع)
    $merchantRef = 'G' . date('ymdHis') . bin2hex(random_bytes(3));
    $st = $conn->prepare("INSERT INTO payment_orders (provider, merchant_ref, kind, subscriber_id, account_email, plan_id, immediate, amount_cents, status)
        VALUES ('paymob', ?, ?, ?, ?, ?, ?, ?, 'pending')");
    $sid = (int)($ctx['subscriber_id'] ?? 0); $imm = (int)!empty($ctx['immediate']);
    $st->bind_param("ssissii", $merchantRef, $ctx['kind'], $sid, $ctx['account_email'], $ctx['plan_id'], $imm, $cents);
    $st->execute(); $localId = $conn->insert_id; $st->close();

    $order = paymob_http('/api/ecommerce/orders', [
        'auth_token' => $token, 'delivery_needed' => false, 'amount_cents' => $cents, 'currency' => 'EGP',
        'merchant_order_id' => $merchantRef, 'items' => [],
    ]);
    if (!$order || empty($order['id'])) return [null, 'تعذّر إنشاء طلب الدفع.'];
    $orderId = (string)$order['id'];
    $up = $conn->prepare("UPDATE payment_orders SET provider_order_id = ? WHERE id = ?");
    $up->bind_param("si", $orderId, $localId); $up->execute(); $up->close();

    $nameParts = preg_split('/\s+/u', trim((string)($ctx['name'] ?? 'GRIFFINE Client')), 2);
    $billing = [
        'first_name' => $nameParts[0] ?: 'NA', 'last_name' => $nameParts[1] ?? 'NA',
        'email' => $ctx['email'] ?: $ctx['account_email'], 'phone_number' => $ctx['phone'] ?: 'NA',
        'apartment' => 'NA', 'floor' => 'NA', 'street' => 'NA', 'building' => 'NA', 'shipping_method' => 'NA',
        'postal_code' => 'NA', 'city' => 'NA', 'country' => 'EG', 'state' => 'NA',
    ];
    $key = paymob_http('/api/acceptance/payment_keys', [
        'auth_token' => $token, 'amount_cents' => $cents, 'expiration' => 3600, 'order_id' => $orderId,
        'billing_data' => $billing, 'currency' => 'EGP', 'integration_id' => (int)site_config_get($conn, 'paymob_integration'),
    ]);
    if (!$key || empty($key['token'])) return [null, 'تعذّر تجهيز صفحة الدفع (راجع Integration ID).'];
    return [rtrim(PAYMOB_BASE, '/') . '/api/acceptance/iframes/' . rawurlencode(site_config_get($conn, 'paymob_iframe')) . '?payment_token=' . rawurlencode($key['token']), ''];
}

/* التحقق من توقيع Paymob (HMAC-SHA512) - نفس ترتيب الحقول اللي Paymob بيحسب بيه
   $t = بيانات العملية (من obj في الـ POST، أو من باراميترات الرابط في الـ GET) */
function paymob_hmac_valid($conn, $t, $hmac){
    $secret = site_config_get($conn, 'paymob_hmac');
    if ($secret === '' || !is_string($hmac) || $hmac === '') return false;
    $b = function($v){ return is_bool($v) ? ($v ? 'true' : 'false') : (string)$v; };
    $fields = [
        $t['amount_cents'] ?? '', $t['created_at'] ?? '', $t['currency'] ?? '', $t['error_occured'] ?? '',
        $t['has_parent_transaction'] ?? '', $t['id'] ?? '', $t['integration_id'] ?? '', $t['is_3d_secure'] ?? '',
        $t['is_auth'] ?? '', $t['is_capture'] ?? '', $t['is_refunded'] ?? '', $t['is_standalone_payment'] ?? '',
        $t['is_voided'] ?? '', $t['order'] ?? '', $t['owner'] ?? '', $t['pending'] ?? '',
        $t['source_data_pan'] ?? '', $t['source_data_sub_type'] ?? '', $t['source_data_type'] ?? '', $t['success'] ?? '',
    ];
    $str = implode('', array_map($b, $fields));
    return hash_equals(hash_hmac('sha512', $str, $secret), strtolower($hmac));
}
// بيانات العملية من الـ POST (JSON) ← نفس شكل باراميترات الـ GET
function paymob_flatten_obj($o){
    return [
        'amount_cents' => $o['amount_cents'] ?? '', 'created_at' => $o['created_at'] ?? '', 'currency' => $o['currency'] ?? '',
        'error_occured' => $o['error_occured'] ?? '', 'has_parent_transaction' => $o['has_parent_transaction'] ?? '',
        'id' => $o['id'] ?? '', 'integration_id' => $o['integration_id'] ?? '', 'is_3d_secure' => $o['is_3d_secure'] ?? '',
        'is_auth' => $o['is_auth'] ?? '', 'is_capture' => $o['is_capture'] ?? '', 'is_refunded' => $o['is_refunded'] ?? '',
        'is_standalone_payment' => $o['is_standalone_payment'] ?? '', 'is_voided' => $o['is_voided'] ?? '',
        'order' => is_array($o['order'] ?? null) ? ($o['order']['id'] ?? '') : ($o['order'] ?? ''),
        'owner' => $o['owner'] ?? '', 'pending' => $o['pending'] ?? '',
        'source_data_pan' => $o['source_data']['pan'] ?? '', 'source_data_sub_type' => $o['source_data']['sub_type'] ?? '',
        'source_data_type' => $o['source_data']['type'] ?? '', 'success' => $o['success'] ?? '',
    ];
}

/* تطبيق عملية دفع ناجحة (مرة واحدة بس حتى لو Paymob بعت أكتر من إشعار) ← بيرجّع true لو الاشتراك اتفعّل */
function paymob_apply_success($conn, $providerOrderId, $txnId, $amountCents){
    $st = $conn->prepare("SELECT * FROM payment_orders WHERE provider = 'paymob' AND provider_order_id = ? LIMIT 1");
    $st->bind_param("s", $providerOrderId); $st->execute();
    $po = $st->get_result()->fetch_assoc(); $st->close();
    if (!$po) return false;
    if ($po['status'] === 'paid') return true;
    if ((int)$amountCents !== (int)$po['amount_cents']) { error_log("GRIFFINE paymob amount mismatch order $providerOrderId"); return false; }

    // "قفل" الطلب: بس أول إشعار بيغيّر الحالة من pending لـ paid
    $lock = $conn->prepare("UPDATE payment_orders SET status = 'paid', provider_txn_id = ?, paid_at = NOW() WHERE id = ? AND status <> 'paid'");
    $lock->bind_param("si", $txnId, $po['id']); $lock->execute();
    $changed = $lock->affected_rows; $lock->close();
    if ($changed !== 1) return true;

    $ref = 'Paymob #' . $txnId;
    $email = $po['account_email'];
    if ($po['kind'] === 'new') {
        $u = $conn->prepare("UPDATE subscribers SET active = 1, payment_method = 'paymob', payment_ref = ? WHERE id = ? AND account_email = ?");
        $u->bind_param("sis", $ref, $po['subscriber_id'], $email); $u->execute(); $u->close();
        $s = $conn->prepare("SELECT name, plan_name, end_date FROM subscribers WHERE id = ?"); $s->bind_param("i", $po['subscriber_id']); $s->execute();
        $sub = $s->get_result()->fetch_assoc(); $s->close();
        maybeRewardReferral($conn, $email);
        if ($sub) mail_subscription_toggled($conn, $email, $sub['name'], $sub['plan_name'], true, $sub['end_date']);
        return true;
    }
    // تغيير باقة: الباقة والسعر والمدة من قاعدة البيانات
    $p = $conn->prepare("SELECT id, name, amount, duration_days FROM subscription_plans WHERE id = ? LIMIT 1");
    $p->bind_param("s", $po['plan_id']); $p->execute(); $plan = $p->get_result()->fetch_assoc(); $p->close();
    if (!$plan) return false;
    $amount = (float)$plan['amount']; $days = (int)$plan['duration_days'];
    if ((int)$po['immediate'] === 1) {
        $start = date('Y-m-d'); $end = date('Y-m-d', strtotime("$start +$days days"));
        $u = $conn->prepare("UPDATE subscribers SET plan_id=?, plan_name=?, amount=?, start_date=?, end_date=?, payment_method='paymob', payment_ref=?, payment_proof=NULL, active=1,
            pending_plan_id=NULL, pending_plan_name=NULL, pending_amount=NULL, pending_duration_days=NULL, pending_payment_method=NULL, pending_payment_ref=NULL, pending_payment_proof=NULL
            WHERE id=? AND account_email=?");
        $u->bind_param("ssdsssis", $plan['id'], $plan['name'], $amount, $start, $end, $ref, $po['subscriber_id'], $email); $u->execute(); $u->close();
        logSubscriptionEvent($conn, $email, 'plan_change', $plan['id'], $plan['name'], $amount);
        mail_plan_change_requested($conn, $email, $plan['name'], "تم الدفع بنجاح والانتقال للباقة الجديدة ({$plan['name']}) حتى $end.");
    } else {
        $u = $conn->prepare("UPDATE subscribers SET pending_plan_id=?, pending_plan_name=?, pending_amount=?, pending_duration_days=?, pending_payment_method='paymob', pending_payment_ref=?, pending_payment_proof=NULL
            WHERE id=? AND account_email=?");
        $u->bind_param("ssdisis", $plan['id'], $plan['name'], $amount, $days, $ref, $po['subscriber_id'], $email); $u->execute(); $u->close();
        mail_plan_change_requested($conn, $email, $plan['name'], "تم الدفع بنجاح - الباقة الجديدة ({$plan['name']}) هتتفعّل تلقائيًا بعد انتهاء باقتك الحالية.");
    }
    return true;
}
?>
