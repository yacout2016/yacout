<?php
// اتصال قاعدة البيانات — نفس بيانات هوستنجر اللي جهزتها
// الأخطاء بتتسجّل في لوج السيرفر بس - متظهرش للزوار (كانت بتكشف مسارات وتفاصيل تقنية)
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

/* =====================================================================
   كلمات السر (قاعدة البيانات، إيميل info@، مفتاح الـ Cron) في ملف griffine_config.php
   اللي بتعمله مرة واحدة جنب db.php في public_html (من griffine_config.sample.php) - والتحديثات مبتلمسوش.
   الملف ده (db.php) كود بس من غير أي سر، فبيتحدّث مع كل إصدار من غير ما يمسح كلمات السر.
   ترتيب البحث: فولدر فوق الموقع (لو نقلته هناك بعدين) ← جنب db.php في public_html
   ===================================================================== */
foreach ([dirname(__DIR__) . '/griffine_config.php', __DIR__ . '/griffine_config.php'] as $__cfg) {
    if (is_file($__cfg)) { require_once $__cfg; break; }
}
unset($__cfg);
if (!defined('DB_NAME')) {
    error_log('GRIFFINE: griffine_config.php غير موجود (لا خارج public_html ولا داخله) - راجع griffine_config.sample.php');
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "message" => "الخدمة غير متاحة الآن، حاول بعد قليل."]);
    exit();
}

mysqli_report(MYSQLI_REPORT_OFF);
$conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    error_log('GRIFFINE DB connect error: ' . $conn->connect_error);
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "الخدمة غير متاحة الآن، حاول بعد قليل."]);
    exit();
}
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$conn->set_charset("utf8mb4");
// الإصدار 97: كل الأوقات بتتسجّل بتوقيت جرينتش (UTC) صراحةً، والواجهة بتعرضها بتوقيت جهاز المستخدم
try { $conn->query("SET time_zone = '+00:00'"); } catch (Throwable $e) {}
date_default_timezone_set('UTC');

// إيميل المدير الأصلي — الصلاحية الكاملة بتتطلب كمان is_admin = 1 في قاعدة البيانات (التسجيل عمره ما بيدي أدمن)
define('ADMIN_EMAIL', 'top72026@gmail.com');

// ===================== إعدادات الإيميل (الإصدار 72) =====================
// كل إيميلات الموقع بتتبعت من info@griffine.app عن طريق mailer.php
// كلمة سر الصندوق (MAIL_SMTP_PASS) ومفتاح الـ Cron في griffine_config.php (الإصدار 84)
define('MAIL_FROM', 'info@griffine.app');
define('MAIL_FROM_NAME', 'GRIFFINE');
define('MAIL_ADMIN_TO', 'info@griffine.app');
define('MAIL_SITE_URL', 'https://www.griffine.app');   // الإصدار 153: الدومين الجديد
define('MAIL_SMTP_HOST', 'smtp.hostinger.com');
define('MAIL_SMTP_PORT', 465);
if (!defined('MAIL_SMTP_USER')) define('MAIL_SMTP_USER', 'info@griffine.app');   // الإصدار 152: الصندوق الجديد (كلمة سره MAIL_SMTP_PASS في griffine_config.php)
if (!defined('MAIL_SMTP_PASS')) define('MAIL_SMTP_PASS', '');   // بتتعرّف في griffine_config.php
if (!defined('CRON_KEY')) define('CRON_KEY', '');
require_once __DIR__ . '/mailer.php';

// بيتأكد هل قيمة معينة (إيميل/رقم/اسم) موجودة في القائمة السوداء أو لأ
function isBlacklisted($conn, $type, $value){
    if (empty($value)) return false;
    if ($type === 'email') $value = strtolower($value);
    $stmt = $conn->prepare("SELECT id FROM blacklist WHERE type = ? AND LOWER(value) = LOWER(?) LIMIT 1");
    $stmt->bind_param("ss", $type, $value);
    $stmt->execute();
    $found = $stmt->get_result()->num_rows > 0;
    $stmt->close();
    return $found;
}

// تحقق إضافي إن الدومين بتاع الإيميل موجود فعليًا وله سجلات بريد (يمنع إيميلات وهمية بدومين غير موجود)
function isEmailDomainValid($email){
    $parts = explode('@', $email);
    if (count($parts) !== 2) return false;
    $domain = $parts[1];
    return checkdnsrr($domain, 'MX') || checkdnsrr($domain, 'A');
}

// بيبني توكن تفعيل جديد للإيميل، يحفظه، ويبعت إيميل التفعيل
function sendVerificationEmail($conn, $email){
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));

    $ins = $conn->prepare("INSERT INTO email_verifications (email, token, expires_at) VALUES (?, ?, ?)");
    $ins->bind_param("sss", $email, $token, $expiresAt);
    $ins->execute();
    $ins->close();

    // الإصدار 72: عن طريق mailer.php (من info@griffine.app + سجل الإيميلات)
    $verifyLink = MAIL_SITE_URL . "/index.php?verify_token=" . $token;
    $r = griffine_notify($conn, $email, 'تفعيل بريدك الإلكتروني - GRIFFINE', 'مرحبًا بك في GRIFFINE!',
        ['اضغط على الزر أدناه لتفعيل حسابك (الرابط صالح لمدة 24 ساعة).', 'إذا لم تكن مسجّلًا لدينا، فتجاهل هذه الرسالة.'],
        ['label' => 'تفعيل الحساب', 'url' => $verifyLink], 'verification');
    return $r['ok'];
}
// بيرجع كل إعدادات الأدمن (تفعيل/إيقاف القواعد الإلزامية) كمصفوفة key=>bool
function getAllAdminSettings($conn){
    // بتتقري مرة واحدة بس في كل طلب (كانت بتتقري من قاعدة البيانات مع كل استدعاء)
    static $cache = null;
    if ($cache !== null) return $cache;
    $defaults = [
        'require_email_verification' => true,
        'require_valid_email_domain' => true,
        'require_payment_ref' => true,
        'require_payment_proof' => true,
        'require_card_details' => true,
        'require_manual_activation' => true,
        'chat_enabled' => true,
        'chat_icon_visible' => true,
        'hide_dac_screen' => false,
        'hide_grid_screen' => false,
        'hide_portfolio_screen' => false,
        'hide_screener_screen' => false,
        'hide_sub_history_screen' => false,
        'hide_recommendations_screen' => false,
        'hide_referral_screen' => false,
        'hide_contact_screen' => false,
        'hide_testimonials_screen' => false,
        'hide_articles_screen' => false,
        'hide_suggestions_screen' => false,
        // الإصدار 96: كل الشاشات قابلة للإخفاء من لوحة التحكم
        'hide_watchlist_screen' => false,
        'hide_alerts_screen' => false,
        'hide_stock_screen' => false,
        'hide_curve_home' => false,
        'hide_trash_screen' => false,
        'hide_trades_screen' => true,     // تقرير صفقاتي للعميل - مخفي لحد ما الأدمن يظهره
        'hide_opps_screen' => false,      // الإصدار 101: البحث عن فرص في كشاف الأسهم
        'hide_basira_screen' => false,    // الإصدار 114: تحليلات بصيرة AI
        'hide_mizanai_screen' => false,   // الإصدار 122: ميزان GRIFFINE AI (مخطِّط التوزيع)
        'hide_mizan_screen' => false,     // الإصدار 116: ميزان محفظتك AI
        'hide_install_icon' => false,     // الإصدار 116: أيقونة تثبيت التطبيق
        'hide_site_search' => false,      // الإصدار 116: البحث العام
        'hide_plan_watch' => false,       // الإصدار 119: متابعة خططك على آخر سعر
        'hide_home_hero' => false, 'hide_home_quick' => false, 'hide_home_alerts' => false, 'hide_home_recs' => false, 'hide_home_holdings' => false,   // الإصدار 144: كروت الرئيسية
    ];
    $result = @$conn->query("SELECT setting_key, setting_value FROM admin_settings");
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $defaults[$row['setting_key']] = (bool)$row['setting_value'];
        }
    }
    $cache = $defaults;
    return $defaults;
}

/* ============================================================
   أمان تسجيل الدخول
   ============================================================ */
// كلمة مرور مقبولة: 8 أحرف على الأقل وفيها حرف ورقم
function isStrongPassword($pw){
    return is_string($pw) && mb_strlen($pw) >= 8 && preg_match('/[0-9]/', $pw) && preg_match('/[A-Za-z\x{0600}-\x{06FF}]/u', $pw);
}
function clientIp(){
    return substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45);
}
// بيرجع عدد الدقائق المتبقية لو المحاولات كتير (0 = مسموح)
function loginLockedMinutes($conn, $email){
    $r = @$conn->query("SHOW TABLES LIKE 'login_attempts'");
    if (!$r || $r->num_rows === 0) return 0;
    $ip = clientIp();
    $st = $conn->prepare("SELECT
        SUM(email = ? AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)) AS by_email,
        SUM(ip = ? AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)) AS by_ip
        FROM login_attempts WHERE created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
    $st->bind_param("ss", $email, $ip); $st->execute();
    $row = $st->get_result()->fetch_assoc(); $st->close();
    return ((int)$row['by_email'] >= 8 || (int)$row['by_ip'] >= 25) ? 15 : 0;
}
function recordLoginFailure($conn, $email){
    $r = @$conn->query("SHOW TABLES LIKE 'login_attempts'");
    if (!$r || $r->num_rows === 0) return;
    $ip = clientIp();
    $st = $conn->prepare("INSERT INTO login_attempts (email, ip) VALUES (?, ?)");
    $st->bind_param("ss", $email, $ip); $st->execute(); $st->close();
    @$conn->query("DELETE FROM login_attempts WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 DAY)");
}
function clearLoginFailures($conn, $email){
    $r = @$conn->query("SHOW TABLES LIKE 'login_attempts'");
    if (!$r || $r->num_rows === 0) return;
    $st = $conn->prepare("DELETE FROM login_attempts WHERE email = ?");
    $st->bind_param("s", $email); $st->execute(); $st->close();
}

// هل العميل عنده اشتراك شغال (نشط ولسه مخلصش + مدة السماح) - بيتفحص من السيرفر للمحتوى المدفوع
function hasActiveSubscription($conn, $email){
    $st = $conn->prepare("SELECT active, end_date FROM subscribers WHERE account_email = ? AND archived = 0 ORDER BY id DESC LIMIT 1");
    $st->bind_param("s", $email); $st->execute();
    $sub = $st->get_result()->fetch_assoc(); $st->close();
    if (!$sub || (int)$sub['active'] !== 1) return false;
    $grace = 0;
    $g = @$conn->query("SELECT grace_period_days FROM reminder_defaults WHERE id = 1");
    if ($g && ($gr = $g->fetch_assoc())) $grace = (int)$gr['grace_period_days'];
    return strtotime($sub['end_date'] . ' +' . $grace . ' days') >= strtotime(date('Y-m-d'));
}
// هل الحساب ده استخدم أي اشتراك قبل كده (التجربة المجانية مرة واحدة بس)
function hasEverSubscribed($conn, $email){
    $st = $conn->prepare("SELECT id FROM subscribers WHERE account_email = ? LIMIT 1");
    $st->bind_param("s", $email); $st->execute();
    $found = $st->get_result()->num_rows > 0; $st->close();
    return $found;
}

// بيرجع قيمة إعداد واحد بس (true/false)
function getAdminSetting($conn, $key, $default = true){
    $all = getAllAdminSettings($conn);
    return $all[$key] ?? $default;
}

/* ============================================================
   حماية CSRF - توكن مربوط بالجلسة، لازم يترفق مع أي طلب POST
   بيغيّر حاجة في قاعدة البيانات (إضافة/تعديل/حذف)
   ============================================================ */

// بيرجع توكن CSRF الحالي بتاع الجلسة، وبيولّد واحد جديد أول مرة لو غير موجود
function csrf_token(){
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

// بيتحقق إن التوكن اللي جه مع الطلب (POST field أو Header) مطابق لتوكن الجلسة
// لو مش مطابق، بيرفض الطلب فورًا برسالة JSON ويوقف التنفيذ
function requireCsrf(){
    $sent = $_POST['csrf_token'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (empty($_SESSION['csrf_token']) || empty($sent) || !hash_equals($_SESSION['csrf_token'], $sent)) {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "انتهت صلاحية الجلسة، حدّث الصفحة وحاول مرة أخرى."]);
        exit();
    }
}

/* ============================================================
   نظام الفريق والصلاحيات المرنة (بند 28)
   - "السوبر أدمن" الأصلي (ADMIN_EMAIL) عنده كل الصلاحيات دايمًا، مش محتاج
     يتسجل في جدول staff_members خالص.
   - أي عضو فريق تاني (اللي بتضيفه من لوحة "الفريق والصلاحيات") صلاحياته
     بتتحدد سطر بسطر في staff_permissions - ده اللي بيتحقق منه requirePermission().
   ============================================================ */

// كل مفاتيح الصلاحيات المتاحة في النظام - مصدر واحد للحقيقة، هنا بس
function getAllPermissionKeys(){
    return [
        'manage_staff'          => 'إدارة الفريق والصلاحيات',
        'manage_admin_settings' => 'الإعدادات الإلزامية للنظام',
        'manage_subscribers'    => 'إدارة المشتركين والعملاء',
        'manage_plans'          => 'إدارة الباقات والأسعار',
        'manage_blacklist'      => 'القائمة السوداء',
        'manage_reminders'      => 'إعدادات تذكيرات الاشتراك',
        'view_chat'             => 'مشاهدة محادثات الشات',
        'reply_chat'            => 'الرد على العملاء وإدارة المحادثات',
        'edit_site_design'      => 'تنسيق محتوى الموقع (بدون بيانات جوهرية)',
        'view_reports'          => 'مشاهدة التقارير والإحصائيات',
        'manage_recommendations'=> 'إرسال ومراجعة توصيات الشراء للعملاء',
        'rec_needs_review'      => '⏳ توصياته لازم الأدمن يوافق عليها قبل ما تتبعت للمشتركين (للمحلل المالي — الإصدار 132)',
        'rec_approve'           => '✅ مُراجِع التوصيات: يوافق على توصيات المحللين أو يرفضها (للأدمن / مدير الموقع — مش للمحلل)',
        'rec_custom_analyst_name'=> 'تغيير اسم المحلل الظاهر في التوصية (كتابة اسم آخر) — من غيرها التوصية بتتبعت باسمه المسجّل (الإصدار 129)',
        'manage_testimonials'   => 'مشاهدة وإدارة آراء العملاء (حذف التجاوزات) - الإصدار 85',
        'manage_content'        => 'إدارة المقالات (نشر وتعديل وحذف)',
        'manage_site_content'   => 'تعديل نصوص شاشات الموقع (عن جريفين، التواصل، سياسة الاسترداد، المقترحات)',
        'manage_suggestions'    => 'مراجعة مقترحات العملاء والرد عليها (الإصدار 84)',
        'manage_hr'             => 'شؤون الموظفين HR: البيانات والرواتب والحضور والمستندات (الإصدار 85)',
        'send_broadcast'        => '📢 إرسال رسائل للمشتركين (بالاسم أو بالمجموعة) — من غير مسح (المسح والسلة للأدمن بس) · الرسائل بين الإدارة والموظفين متاحة لكل الموظفين — الإصدار 154',
    ];
}

/* المسميات الوظيفية (الإصدار 85): بقت في جدول job_titles والأدمن بيضيف ويعدّل من لوحة التحكم
   (الفريق والصلاحيات / شؤون الموظفين). لو الجدول بعد متعملش بترجع القائمة الأصلية. */
function defaultJobTitlesSeed(){
    return [
        'site_manager'     => ['مدير موقع', ['manage_staff','manage_admin_settings','manage_subscribers','manage_plans','manage_blacklist','manage_reminders','view_chat','reply_chat','edit_site_design','view_reports','manage_recommendations','manage_content','manage_testimonials','manage_suggestions','manage_hr']],
        'editor'           => ['مبرمج للتنسيق والتعديل', ['edit_site_design','manage_content','manage_testimonials']],
        'customer_service' => ['خدمة عملاء', ['view_chat','reply_chat']],
        'sales'            => ['مندوب مبيعات', ['manage_subscribers','view_chat','reply_chat','view_reports','manage_recommendations']],
        'accounts'         => ['مدير حسابات', ['manage_subscribers','manage_plans','manage_reminders','view_reports']],
        'financial_analyst'=> ['محلل مالي', ['manage_recommendations', 'rec_needs_review']],   // الإصدار 129 (132: توصياته بتتراجع افتراضيًا)
    ];
}
function jobTitlesTable(){
    static $rows = null;
    if ($rows !== null) return $rows;
    global $conn;
    $rows = [];
    try {
        $res = $conn->query("SELECT title_key, label, default_perms FROM job_titles ORDER BY sort_order, label");
        while ($res && ($r = $res->fetch_assoc())) {
            $perms = json_decode((string)$r['default_perms'], true);
            $rows[$r['title_key']] = [$r['label'], is_array($perms) ? $perms : []];
        }
    } catch (Throwable $e) { $rows = []; }
    if (!$rows) $rows = defaultJobTitlesSeed();
    return $rows;
}

// كل المسميات الوظيفية المتاحة، وأسماؤها المعروضة
function getAllJobTitles(){
    $out = [];
    foreach (jobTitlesTable() as $k => $v) $out[$k] = $v[0];
    return $out;
}

// الصلاحيات الافتراضية لكل مسمى وظيفي - دي بس نقطة بداية عند الإضافة،
// وبعد كده الأدمن يقدر يزوّد أو ينقص لأي شخص بنفسه من غير ما يتقيّد بيها
function getDefaultPermissionsForJobTitle($jobTitle){
    $t = jobTitlesTable();
    return isset($t[$jobTitle]) ? $t[$jobTitle][1] : [];
}

// بيرجع كل صلاحيات المستخدم المسجّل دخوله حاليًا (مصفوفة مفاتيح)
function getCurrentUserPermissions($conn){
    if (empty($_SESSION['user_email'])) return [];
    $email = $_SESSION['user_email'];

    // المدير الأصلي: لازم الإيميل يطابق ADMIN_EMAIL *و* الحساب نفسه متعلّم أدمن في قاعدة البيانات
    // (قبل كده أي حد يسجّل بإيميل المدير لو الحساب اتمسح/اتأرشف كان بياخد كل الصلاحيات)
    if (strtolower($email) === strtolower(ADMIN_EMAIL)) {
        $st = $conn->prepare("SELECT is_admin FROM users WHERE username = ? AND archived = 0 LIMIT 1");
        $st->bind_param("s", $email); $st->execute();
        $row = $st->get_result()->fetch_assoc(); $st->close();
        if ($row && (int)$row['is_admin'] === 1) return array_keys(getAllPermissionKeys());
        return [];
    }
    if (empty($_SESSION['is_admin'])) return [];

    $stmt = $conn->prepare("SELECT sp.permission_key FROM staff_members s
        INNER JOIN staff_permissions sp ON sp.staff_id = s.id
        WHERE s.email = ? AND s.active = 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $perms = [];
    while ($row = $result->fetch_assoc()) $perms[] = $row['permission_key'];
    $stmt->close();
    return $perms;
}

// بيرفض الطلب فورًا لو المستخدم الحالي مالوش صلاحية $key المطلوبة
function requirePermission($conn, $key){
    $perms = getCurrentUserPermissions($conn);
    if (!in_array($key, $perms, true)) {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "لا توجد صلاحية كافية لتنفيذ هذه العملية."]);
        exit();
    }
}

// بيسجّل حدث اشتراك (اشتراك جديد/تغيير باقة/هدية/تجديد) في سجل الأحداث - ده مصدر بيانات التقارير
// وسجل اشتراك العميل. لا يوقف التنفيذ لو فشل - التسجيل مش أساسي زي عملية الاشتراك نفسها
function logSubscriptionEvent($conn, $accountEmail, $eventType, $planId, $planName, $amount){
    try {
        $today = date('Y-m-d');
        $stmt = $conn->prepare("INSERT INTO subscription_events (account_email, event_type, plan_id, plan_name, amount, event_date) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssds", $accountEmail, $eventType, $planId, $planName, $amount, $today);
        $stmt->execute();
        $stmt->close();
    } catch (Exception $e) { /* تجاهل - التسجيل مش أساسي */ }
}

/* ============================================================
   إخلاء المسؤولية القانوني (بند 30)
   - النص والرقم هنا هما "المصدر الوحيد للحقيقة" - أي تعديل جوهري على النص
     لازم يترفق بزيادة DISCLAIMER_VERSION عشان كل العملاء يُطلب منهم الموافقة
     على النص الجديد تاني، حتى لو وافقوا على نسخة قديمة قبل كده.
   ============================================================ */
define('DISCLAIMER_VERSION', 1);

function getDisclaimerText(){
    return "المعلومات والفرص المقدمة عبر هذا الموقع هي لأغراض تعليمية وتحليلية فقط، ولا تُعد بأي حال من الأحوال توصية استثمارية أو نصيحة للبيع أو الشراء. نحن لا نضمن أي أرباح، وتظل كافة القرارات الاستثمارية، وكذلك التبعات المالية (سواء أرباح أو خسائر)، مسؤولية العميل وحده بالكامل. إن دور الموقع هو توفير أدوات مساعدة لتمكين العميل من إدارة أصوله المالية والبحث عن الفرص وفق رؤيته الخاصة. باستخدامك لهذا الموقع، أنت تقر بأنك تدرك مخاطر الاستثمار في الأسهم وتتحمل المسؤولية الكاملة عن قراراتك المالية.";
}

// بيتحقق هل الإيميل ده وافق على النسخة الحالية من إخلاء المسؤولية ولا لأ
function hasAcceptedDisclaimer($conn, $email){
    $version = DISCLAIMER_VERSION;
    $stmt = $conn->prepare("SELECT id FROM disclaimer_acceptances WHERE account_email = ? AND disclaimer_version = ? LIMIT 1");
    $stmt->bind_param("si", $email, $version);
    $stmt->execute();
    $found = $stmt->get_result()->num_rows > 0;
    $stmt->close();
    return $found;
}

// بيسجّل موافقة الإيميل على النسخة الحالية (بتاريخ ووقت المطابقة الفعليين)
function recordDisclaimerAcceptance($conn, $email){
    $version = DISCLAIMER_VERSION;
    $stmt = $conn->prepare("INSERT IGNORE INTO disclaimer_acceptances (account_email, disclaimer_version) VALUES (?, ?)");
    $stmt->bind_param("si", $email, $version);
    $stmt->execute();
    $stmt->close();
}

/* ============================================================
   إعدادات محرك إشارات التحليل الفني اليدوي (بند 31)
   العميل بيدخل سلسلة أسعار إغلاق + أعلى/أقل قمة يدويًا (مش بيانات حية)،
   والحسابات (RSI/MACD/متوسط متحرك/فيبوناتشي) بتتم في المتصفح بمعادلات
   رياضية عادية - العتبات والأوزان دي بس اللي قابلة للتعديل من الأدمن.
   ============================================================ */
function getScreenerSettings($conn){
    $defaults = [
        'rsi_period' => '14',
        'rsi_oversold' => '30',
        'rsi_overbought' => '70',
        'ma_period' => '20',
        'macd_fast' => '12',
        'macd_slow' => '26',
        'macd_signal' => '9',
        'weight_rsi' => '1',
        'weight_macd' => '1',
        'weight_ma' => '1',
    ];
    $result = @$conn->query("SELECT setting_key, setting_value FROM screener_settings");
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $defaults[$row['setting_key']] = $row['setting_value'];
        }
    }
    return $defaults;
}

/* ============================================================
   توصيات الشراء (بند 33)
   ============================================================ */
function getRecommendationRetentionHours($conn){
    $result = @$conn->query("SELECT setting_value FROM recommendation_settings WHERE setting_key = 'retention_hours'");
    if ($result && ($row = $result->fetch_assoc())) return (int)$row['setting_value'];
    return 24;
}

/* ============================================================
   برنامج الإحالة (بند 43)
   ============================================================ */
define('REFERRAL_BONUS_DAYS', 15);

// بيولّد كود إحالة قصير وفريد (6 حروف/أرقام) لحساب معين
function generateReferralCode($conn, $email){
    do {
        $code = strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
        $check = $conn->prepare("SELECT id FROM users WHERE referral_code = ? LIMIT 1");
        $check->bind_param("s", $code);
        $check->execute();
        $exists = $check->get_result()->num_rows > 0;
        $check->close();
    } while ($exists);

    $stmt = $conn->prepare("UPDATE users SET referral_code = ? WHERE username = ?");
    $stmt->bind_param("ss", $code, $email);
    $stmt->execute();
    $stmt->close();
    return $code;
}

// بيسجّل إحالة جديدة وقت التسجيل - لو الكود صحيح وينتمي لحساب حقيقي غير حساب المسجّل الجديد نفسه
function recordReferral($conn, $refCode, $referredEmail){
    if (empty($refCode)) return;
    $stmt = $conn->prepare("SELECT username FROM users WHERE referral_code = ? LIMIT 1");
    $stmt->bind_param("s", $refCode);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row || strtolower($row['username']) === strtolower($referredEmail)) return;

    $ins = $conn->prepare("INSERT IGNORE INTO referrals (referrer_email, referred_email) VALUES (?, ?)");
    $ins->bind_param("ss", $row['username'], $referredEmail);
    $ins->execute();
    $ins->close();
}

// بيدّي مكافأة الإحالة (أيام إضافية) للطرفين - بس أول ما العميل المُحال يبقى مشترك فعليًا بمبلغ حقيقي ومُفعّل
// بتتنادى بعد أي عملية تفعيل اشتراك (اشتراك جديد أو موافقة أدمن يدوية)
function maybeRewardReferral($conn, $referredEmail){
    $stmt = $conn->prepare("SELECT id, referrer_email FROM referrals WHERE referred_email = ? AND rewarded = 0 LIMIT 1");
    $stmt->bind_param("s", $referredEmail);
    $stmt->execute();
    $refRow = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$refRow) return;

    $subStmt = $conn->prepare("SELECT amount, active FROM subscribers WHERE account_email = ? AND archived = 0 ORDER BY id DESC LIMIT 1");
    $subStmt->bind_param("s", $referredEmail);
    $subStmt->execute();
    $sub = $subStmt->get_result()->fetch_assoc();
    $subStmt->close();
    if (!$sub || (float)$sub['amount'] <= 0 || (int)$sub['active'] !== 1) return; // مكافأة بس لاشتراك مدفوع ومفعّل فعليًا

    $bonusDays = REFERRAL_BONUS_DAYS;
    foreach ([$refRow['referrer_email'], $referredEmail] as $emailToReward) {
        $upd = $conn->prepare("UPDATE subscribers SET end_date = DATE_ADD(end_date, INTERVAL ? DAY) WHERE account_email = ? AND active = 1");
        $upd->bind_param("is", $bonusDays, $emailToReward);
        $upd->execute();
        $upd->close();
    }

    $mark = $conn->prepare("UPDATE referrals SET rewarded = 1, rewarded_at = NOW() WHERE id = ?");
    $mark->bind_param("i", $refRow['id']);
    $mark->execute();
    $mark->close();
}

// بيأرشف (مش بيمسح نهائي) أي توصية عدّت مدة صلاحيتها الخاصة بيها - بينفّذ كل مرة حد يفتح شاشة التوصيات (تنظيف كسول)
function cleanupExpiredRecommendations($conn){
    // الإصدار 129: التوصية اللي صلاحيتها خلصت بتتقفل + إشعار «انتهت صلاحية التوصية» لمشتركين السوق (مرة واحدة بس)
    try { require_once __DIR__ . '/recs_lib.php'; if (function_exists('rc_expire_sweep') && rc_ready($conn)) { rc_expire_sweep($conn); return; } } catch (Throwable $e) {}
    $conn->query("UPDATE recommendations SET archived = 1, archived_at = NOW(), status = 'expired'
        WHERE archived = 0 AND created_at < DATE_SUB(NOW(), INTERVAL validity_hours HOUR)");
}

// الإصدار 129: بتتنادى من استعلام الإشعارات (مرة كل دقيقة بالكتير) عشان إشعار «انتهت صلاحية التوصية» يوصل في وقته
function rc_expire_tick($conn){
    $f = sys_get_temp_dir() . '/griffine_rc_tick_' . md5(__DIR__);
    if (is_file($f) && time() - filemtime($f) < 60) return;
    @touch($f);
    try { $x = $conn->query("SELECT 1 FROM recommendations WHERE archived = 0 AND created_at < DATE_SUB(NOW(), INTERVAL validity_hours HOUR) LIMIT 1"); if ($x && $x->num_rows) cleanupExpiredRecommendations($conn); } catch (Throwable $e) {}
}

// بيبني نص إشعار كامل بكل بيانات التوصية (مش عنوان عام) عشان يظهر في إشعار الموبايل نفسه
function buildRecommendationPushBody($stockName, $symbol, $buyFrom, $buyTo, $supports, $resistances){
    $lines = [];
    $lines[] = "دخول: $buyFrom - $buyTo";
    $supportsClean = array_filter($supports, fn($v) => $v !== null);
    if (!empty($supportsClean)) $lines[] = "دعم: " . implode(', ', $supportsClean);
    $resParts = [];
    foreach ($resistances as $r) {
        if ($r['level'] === null) continue;
        $resParts[] = $r['pct'] !== null ? "{$r['level']} (خروج {$r['pct']}%)" : (string)$r['level'];
    }
    if (!empty($resParts)) $lines[] = "مقاومة: " . implode(', ', $resParts);
    return implode(' | ', $lines);
}

/* ============================================================
   Web Push حقيقية (VAPID + RFC 8291) - مبنية بالكامل من الصفر
   بدون أي مكتبة أو خدمة خارجية، بتستخدم OpenSSL المتاح في PHP بس

   ============================================================ */

function b64url_encode($data){
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function b64url_decode($data){
    $pad = strlen($data) % 4;
    if ($pad) $data .= str_repeat('=', 4 - $pad);
    return base64_decode(strtr($data, '-_', '+/'));
}
function der_length_encode($len){
    if ($len < 128) return chr($len);
    $bytes = '';
    while ($len > 0) { $bytes = chr($len & 0xFF) . $bytes; $len >>= 8; }
    return chr(0x80 | strlen($bytes)) . $bytes;
}
function raw_ec_private_key_to_pem($privateKeyRaw){
    $version = "\x02\x01\x01";
    $privKeyOctet = "\x04\x20" . $privateKeyRaw;
    $curveOid = "\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07"; // prime256v1
    $params = "\xa0\x0a" . $curveOid;
    $seqBody = $version . $privKeyOctet . $params;
    $seq = "\x30" . der_length_encode(strlen($seqBody)) . $seqBody;
    return "-----BEGIN EC PRIVATE KEY-----\n" . chunk_split(base64_encode($seq), 64, "\n") . "-----END EC PRIVATE KEY-----\n";
}
function raw_ec_public_key_to_pem($publicKeyRaw){
    $algIdSeq = "\x30\x13" . "\x06\x07\x2a\x86\x48\xce\x3d\x02\x01" . "\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07";
    $bitString = "\x03" . der_length_encode(strlen($publicKeyRaw)+1) . "\x00" . $publicKeyRaw;
    $body = $algIdSeq . $bitString;
    $seq = "\x30" . der_length_encode(strlen($body)) . $body;
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($seq), 64, "\n") . "-----END PUBLIC KEY-----\n";
}
function der_to_jose($der){
    $offset = 0;
    if (ord($der[$offset++]) !== 0x30) throw new Exception('DER format غير متوقع');
    if ((ord($der[1]) & 0x80) !== 0) {
        $lenBytes = ord($der[1]) & 0x7F;
        $offset = 2 + $lenBytes;
    } else {
        $offset = 2;
    }
    if (ord($der[$offset++]) !== 0x02) throw new Exception('متوقع INTEGER لـ R');
    $rLen = ord($der[$offset++]);
    $r = substr($der, $offset, $rLen);
    $offset += $rLen;
    if (ord($der[$offset++]) !== 0x02) throw new Exception('متوقع INTEGER لـ S');
    $sLen = ord($der[$offset++]);
    $s = substr($der, $offset, $sLen);
    $r = ltrim($r, "\x00"); $s = ltrim($s, "\x00");
    $r = str_pad($r, 32, "\x00", STR_PAD_LEFT);
    $s = str_pad($s, 32, "\x00", STR_PAD_LEFT);
    return $r . $s;
}

function generate_vapid_keys(){
    $key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    if (!$key) throw new Exception('فشل توليد مفاتيح VAPID: ' . openssl_error_string());
    $details = openssl_pkey_get_details($key);
    $x = $details['ec']['x']; $y = $details['ec']['y']; $d = $details['ec']['d'];
    $publicKeyRaw = "\x04" . str_pad($x, 32, "\x00", STR_PAD_LEFT) . str_pad($y, 32, "\x00", STR_PAD_LEFT);
    $privateKeyRaw = str_pad($d, 32, "\x00", STR_PAD_LEFT);
    return ['publicKey' => b64url_encode($publicKeyRaw), 'privateKey' => b64url_encode($privateKeyRaw)];
}

function get_vapid_keys($conn){
    $result = $conn->query("SELECT public_key, private_key FROM vapid_keys WHERE id = 1");
    $row = $result ? $result->fetch_assoc() : null;
    if ($row) return ['publicKey' => $row['public_key'], 'privateKey' => $row['private_key']];

    // أول مرة - نولّد ونحفظ
    $keys = generate_vapid_keys();
    $stmt = $conn->prepare("INSERT INTO vapid_keys (id, public_key, private_key) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE public_key=public_key");
    $stmt->bind_param("ss", $keys['publicKey'], $keys['privateKey']);
    $stmt->execute();
    $stmt->close();
    return $keys;
}

function build_vapid_jwt($audience, $subject, $privateKeyB64Url){
    $header = ['typ' => 'JWT', 'alg' => 'ES256'];
    $payload = ['aud' => $audience, 'exp' => time() + 12*3600, 'sub' => $subject];
    $signingInput = b64url_encode(json_encode($header)) . '.' . b64url_encode(json_encode($payload));

    $pem = raw_ec_private_key_to_pem(b64url_decode($privateKeyB64Url));
    $pkey = openssl_pkey_get_private($pem);
    if (!$pkey) throw new Exception('فشل تحميل مفتاح VAPID الخاص: ' . openssl_error_string());

    $signature = '';
    if (!openssl_sign($signingInput, $signature, $pkey, OPENSSL_ALGO_SHA256)) {
        throw new Exception('فشل توقيع VAPID: ' . openssl_error_string());
    }
    return $signingInput . '.' . b64url_encode(der_to_jose($signature));
}

function hkdf_extract($salt, $ikm){ return hash_hmac('sha256', $ikm, $salt, true); }
function hkdf_expand($prk, $info, $length){
    $t = ''; $okm = ''; $i = 1;
    while (strlen($okm) < $length) {
        $t = hash_hmac('sha256', $t . $info . chr($i), $prk, true);
        $okm .= $t; $i++;
    }
    return substr($okm, 0, $length);
}

// بيشفّر رسالة حسب RFC 8291 (aes128gcm) - بيرجع الـbody الجاهز للإرسال
function webpush_encrypt_payload($payload, $p256dhB64Url, $authB64Url){
    $uaPublicRaw = b64url_decode($p256dhB64Url);
    $authSecret = b64url_decode($authB64Url);

    $ephKeyRes = openssl_pkey_new(['curve_name'=>'prime256v1','private_key_type'=>OPENSSL_KEYTYPE_EC]);
    $ephDetails = openssl_pkey_get_details($ephKeyRes);
    $asPublicRaw = "\x04" . str_pad($ephDetails['ec']['x'],32,"\x00",STR_PAD_LEFT) . str_pad($ephDetails['ec']['y'],32,"\x00",STR_PAD_LEFT);

    $uaPublicPem = raw_ec_public_key_to_pem($uaPublicRaw);
    $uaPublicKeyRes = openssl_pkey_get_public($uaPublicPem);
    $ecdhSecret = openssl_pkey_derive($uaPublicKeyRes, $ephKeyRes, 32);

    $prk = hkdf_extract($authSecret, $ecdhSecret);
    $keyInfo = "WebPush: info\x00" . $uaPublicRaw . $asPublicRaw;
    $ikm = hkdf_expand($prk, $keyInfo, 32);

    $salt = random_bytes(16);
    $prk2 = hkdf_extract($salt, $ikm);
    $cek = hkdf_expand($prk2, "Content-Encoding: aes128gcm\x00", 16);
    $nonce = hkdf_expand($prk2, "Content-Encoding: nonce\x00", 12);

    $paddedPayload = $payload . "\x02";
    $tag = '';
    $ciphertext = openssl_encrypt($paddedPayload, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
    if ($ciphertext === false) throw new Exception('فشل تشفير الإشعار: ' . openssl_error_string());
    $encryptedRecord = $ciphertext . $tag;

    $recordSizeField = pack('N', 4096);
    $keyIdLen = chr(strlen($asPublicRaw));
    return $salt . $recordSizeField . $keyIdLen . $asPublicRaw . $encryptedRecord;
}

// بيبعت إشعار push فعلي لاشتراك واحد (endpoint معين)
function send_single_push($conn, $endpoint, $p256dh, $auth, $title, $body, $url, $image = null){
    $vapid = get_vapid_keys($conn);
    $urlParts = parse_url($endpoint);
    $audience = $urlParts['scheme'] . '://' . $urlParts['host'];
    $jwt = build_vapid_jwt($audience, 'mailto:info@griffine.app', $vapid['privateKey']);

    $payload = json_encode(['title' => $title, 'body' => $body, 'url' => $url] + ($image ? ['image' => $image] : []));   // الإصدار 129: صورة الرسم في الإشعار (أندرويد / كروم)
    $encryptedBody = webpush_encrypt_payload($payload, $p256dh, $auth);

    $headers = [
        'Content-Type: application/octet-stream',
        'Content-Encoding: aes128gcm',
        'TTL: 86400',
        'Authorization: vapid t=' . $jwt . ', k=' . $vapid['publicKey'],
    ];

    $ch = curl_init($endpoint);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $encryptedBody);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_exec($ch);
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return $statusCode;
}

// بيبعت إشعار لكل اشتراكات owner_key معينة (زائر بعينه، أو 'admin')
function send_web_push($conn, $ownerKey, $title, $body, $url = '/index.php', $image = null){
    $stmt = $conn->prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE owner_key = ?");
    $stmt->bind_param("s", $ownerKey);
    $stmt->execute();
    $result = $stmt->get_result();
    $sent = 0;
    while ($row = $result->fetch_assoc()) {
        try {
            $status = send_single_push($conn, $row['endpoint'], $row['p256dh'], $row['auth'], $title, $body, $url, $image);
            if ($status === 404 || $status === 410) {
                // الاشتراك ده مبقاش موجود (المستخدم ألغى الإذن أو غيّر جهاز) - نمسحه
                $del = $conn->prepare("DELETE FROM push_subscriptions WHERE id = ?");
                $del->bind_param("i", $row['id']);
                $del->execute();
                $del->close();
            } else if ($status >= 200 && $status < 300) {
                $sent++;
            }
        } catch (Exception $e) { /* تجاهل فشل اشتراك واحد ونكمل الباقي */ }
    }
    $stmt->close();
    return $sent;
}

// بيبعت إشعار لكل الأجهزة اللي فعّلت الإشعارات على الموقع (عدا المدير نفسه) - مستخدمة لتوصيات الشراء
// ملحوظة: النظام الحالي بيسجل الإشعار تحت مفتاح واحد لكل زائر/متصفح (مش لكل حساب عميل مسجّل تحديدًا)
// يعني ده بيوصل لأي حد فعّل إشعارات الموقع، مش بالضرورة كل عميل مسجّل حساب
function broadcast_web_push_to_customers($conn, $title, $body, $url = '/index.php', $market = null, $image = null){
    // التوصيات محتوى مدفوع: الإشعار بتفاصيلها بيوصل بس للأجهزة المربوطة بحساب اشتراكه شغال
    $hasEmailCol = ($c = @$conn->query("SHOW COLUMNS FROM push_subscriptions LIKE 'account_email'")) && $c->num_rows > 0;
    if (!$hasEmailCol) return 0;
    $result = $conn->query("SELECT DISTINCT owner_key, account_email FROM push_subscriptions WHERE owner_key != 'admin' AND account_email IS NOT NULL");
    $sent = 0; $checked = [];
    while ($row = $result->fetch_assoc()) {
        $em = $row['account_email'];
        if (!isset($checked[$em])) $checked[$em] = hasActiveSubscription($conn, $em);
        if (!$checked[$em]) continue;
        // توصية سوق معيّن بتوصل بس لحسابات السوق ده
        if ($market !== null && function_exists('mc_account_market') && mc_account_market($conn, $em) !== $market) continue;
        $sent += send_web_push($conn, $row['owner_key'], $title, $body, $url, $image);
    }
    return $sent;
}
?>
