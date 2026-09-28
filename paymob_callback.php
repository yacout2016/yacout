<?php
/* =====================================================================
   GRIFFINE — paymob_callback.php (الإصدار 84)
   الرابط ده بيتكتب في لوحة Paymob في الخانتين:
     - Transaction processed callback  (POST - Paymob بيبلّغ السيرفر بنتيجة العملية)
     - Transaction response callback   (GET  - العميل بيرجع للموقع بعد الدفع)
   في الحالتين: نتحقق من التوقيع HMAC الأول - أي طلب من غير توقيع صحيح بيترفض
   ===================================================================== */
include 'db.php';
require_once __DIR__ . '/security_lib.php';
require_once __DIR__ . '/paymob_lib.php';

$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
try {
    if ($isPost) {
        // إشعار السيرفر (JSON)
        $j = json_decode(file_get_contents('php://input'), true);
        $obj = $j['obj'] ?? null;
        // الإصدار 88: إشعار حفظ الكارت (TOKEN) - للتجديد التلقائي
        if (($j['type'] ?? '') === 'TOKEN' && is_array($obj)) {
            if (!paymob_token_hmac_valid($conn, $obj, $_GET['hmac'] ?? '')) { http_response_code(403); echo 'bad signature'; exit(); }
            paymob_save_card($conn, $obj);
            echo 'ok'; exit();
        }
        $t = is_array($obj) ? paymob_flatten_obj($obj) : null;
        if (!$t || !paymob_hmac_valid($conn, $t, $_GET['hmac'] ?? '')) { http_response_code(403); echo 'bad signature'; exit(); }
        $ok = in_array($t['success'], [true, 'true'], true) && !in_array($t['pending'], [true, 'true'], true);
        if ($ok) paymob_apply_success($conn, (string)$t['order'], (string)$t['id'], (int)$t['amount_cents']);
        else {
            $f = $conn->prepare("UPDATE payment_orders SET status = 'failed' WHERE provider='paymob' AND provider_order_id = ? AND status = 'pending'");
            $oid = (string)$t['order']; $f->bind_param("s", $oid); $f->execute(); $f->close();
        }
        echo 'ok';
        exit();
    }
    // رجوع العميل (GET)
    $t = [];
    foreach (['amount_cents','created_at','currency','error_occured','has_parent_transaction','id','integration_id','is_3d_secure','is_auth','is_capture','is_refunded','is_standalone_payment','is_voided','order','owner','pending','source_data_pan','source_data_sub_type','source_data_type','success'] as $k) {
        $src = str_replace('source_data_', 'source_data.', $k);
        $t[$k] = $_GET[$k] ?? ($_GET[$src] ?? ($_GET[str_replace('.', '_', $src)] ?? ''));
    }
    $valid = paymob_hmac_valid($conn, $t, $_GET['hmac'] ?? '');
    $ok = $valid && $t['success'] === 'true' && $t['pending'] !== 'true'
        && paymob_apply_success($conn, (string)$t['order'], (string)$t['id'], (int)$t['amount_cents']);
    header('Location: /index.php?pay=' . ($ok ? 'ok' : 'fail'), true, 302);
} catch (Throwable $e) {
    error_log('GRIFFINE paymob_callback: ' . $e->getMessage());
    if ($isPost) { http_response_code(500); echo 'error'; }
    else header('Location: /index.php?pay=fail', true, 302);
}
?>
