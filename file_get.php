<?php
/* عرض الملفات المرفوعة (صور/PDF) مع التحقق من الصلاحية:
   - bg (خلفيات الشاشات): لأي زائر
   - chat (مرفقات الدردشة): لأي حد معاه الرابط (اسم الملف عشوائي 128-bit مستحيل تخمينه)
   - avatar (الصور الشخصية): لأي حساب مسجّل دخول
   - proof (إثباتات الدفع) و sugg (مرفقات المقترحات): فريق الإدارة بس، أو صاحب الملف نفسه */
require_once __DIR__ . '/session_boot.php';
session_start();
require_once __DIR__ . '/uploads.php';

$f = $_GET['f'] ?? '';
if (!preg_match('/^(proof|avatar|chat|sugg|bg)_[a-f0-9]{32}\.(png|jpg|webp|gif|pdf)$/', $f, $m)) { http_response_code(404); exit; }
$cat = $m[1]; $ext = $m[2];

$loggedIn = !empty($_SESSION['user_email']);
$isStaff = $loggedIn && !empty($_SESSION['is_admin']);
$allowed = false;
if ($cat === 'bg' || $cat === 'chat') $allowed = true;
elseif ($cat === 'avatar') $allowed = $loggedIn;
elseif ($cat === 'proof' || $cat === 'sugg') {
    $allowed = $isStaff;
    if (!$allowed && $loggedIn) {
        // صاحب الملف يقدر يشوف ملفه
        include __DIR__ . '/db.php';
        $token = 'file:' . $f;
        $email = $_SESSION['user_email'];
        if ($cat === 'proof') {
            $st = $conn->prepare("SELECT id FROM subscribers WHERE account_email = ? AND (payment_proof = ? OR pending_payment_proof = ?) LIMIT 1");
            $st->bind_param("sss", $email, $token, $token);
        } else {
            $st = $conn->prepare("SELECT id FROM suggestions WHERE account_email = ? AND attachment_data = ? LIMIT 1");
            $st->bind_param("ss", $email, $token);
        }
        $st->execute();
        $allowed = $st->get_result()->num_rows > 0;
        $st->close();
    }
}
if (!$allowed) { http_response_code(403); exit; }

$dir = upl_dir();
$path = $dir ? $dir . '/' . $f : '';
if (!$path || !is_file($path)) { http_response_code(404); exit; }

$types = ['png' => 'image/png', 'jpg' => 'image/jpeg', 'webp' => 'image/webp', 'gif' => 'image/gif', 'pdf' => 'application/pdf'];
header('Content-Type: ' . $types[$ext]);
header('Content-Length: ' . filesize($path));
header('X-Content-Type-Options: nosniff');
if ($ext === 'pdf') {
    header('Content-Disposition: attachment; filename="' . $f . '"');
} else {
    header("Content-Security-Policy: default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
    header('Content-Disposition: inline; filename="' . $f . '"');
}
header('Cache-Control: ' . ($cat === 'bg' ? 'public, max-age=2592000, immutable' : 'private, max-age=86400'));
readfile($path);
