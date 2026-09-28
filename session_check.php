<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (isset($_SESSION['user_email'])) {
    $email = $_SESSION['user_email'];
    $verified = true;
    $stmt = $conn->prepare("SELECT email_verified FROM users WHERE username = ? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($row) $verified = (bool)$row['email_verified'];
    if (!getAdminSetting($conn, 'require_email_verification', true)) $verified = true;

    $isAdmin = (bool)($_SESSION['is_admin'] ?? false);
    $permissions = $isAdmin ? getCurrentUserPermissions($conn) : [];
    $isSuperAdmin = strtolower($email) === strtolower(ADMIN_EMAIL);

    echo json_encode([
        "logged_in" => true,
        "email" => $email,
        "is_admin" => $isAdmin,
        "is_super_admin" => $isSuperAdmin,
        "permissions" => $permissions,
        "email_verified" => $verified,
        "csrfToken" => csrf_token()
    ]);
} else {
    echo json_encode(["logged_in" => false, "csrfToken" => csrf_token()]);
}
?>
