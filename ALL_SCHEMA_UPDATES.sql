-- ============================================================
-- GRIFFINE — ALL_SCHEMA_UPDATES.sql (الإصدار 102)
-- كل تحديثات قاعدة البيانات في ملف واحد.
-- آمن تشغّله أي عدد من المرات: بيضيف الناقص بس ومبيمسحش أي بيانات.
-- الاستخدام: phpMyAdmin ← اختار قاعدة البيانات ← تبويب SQL ← الصق الملف كله ← Go
-- الإصدار 69: جدول login_attempts (حماية من تخمين كلمات المرور).
-- الإصدار 71: مفيش تغييرات في قاعدة البيانات (إصلاحات واجهة فقط: الشريط الجانبي + شعار الدردشة + طباعة كل الشاشات PDF).
-- الإصدار 72: جدول ui_customizations (استوديو التصميم) + جدول email_log (سجل الإيميلات) + عمود admin_read_at (حالة قراءة الشات).
-- الإصدار 73: مفيش جداول جديدة - بس التأكد إن حساب مدير الموقع top72026@gmail.com متعلّم أدمن.
-- الإصدار 74: مفيش تغييرات في قاعدة البيانات (المشتركين والموظفين رجعوا في لوحة التحكم والقائمة الجانبية).
-- الإصدار 75: مفيش تغييرات في قاعدة البيانات (بطاقة قيمة المحفظة فاتحة في الوضع النهاري).
-- الإصدار 76: مفيش تغييرات في قاعدة البيانات (جلب أسعار السهم تلقائيًا في أداة التحليل الفني - market_quote.php).
-- الإصدار 77: مفيش تغييرات في قاعدة البيانات (مصدر الأسعار TradingView + إصلاح شات الموظفين).
-- الإصدار 78: مفيش تغييرات في قاعدة البيانات (الشات بيتبع الحساب الحالي بعد الدخول/الخروج).
-- الإصدار 79: مفيش تغييرات في قاعدة البيانات (استوديو التصميم: تقسيم النص على أكتر من سطر).
-- الإصدار 80: مفيش تغييرات في قاعدة البيانات (إشعارات رسائل الشات للأدمن).
-- الإصدار 81: مفيش تغييرات في قاعدة البيانات (رسالة العميل الجديدة بترجّع المحادثة المؤرشفة/المحذوفة للنشطة).
-- الإصدار 82: عمود allow_upload في chat_conversation_meta (الأدمن بيفتح رفع الملفات للعميل في الشات) + users.chat_visitor_id (نفس المحادثة من أي جهاز).
-- الإصدار 83: عمود max_upload_mb في chat_conversation_meta (أقصى حجم للمرفق بالميجا لكل محادثة - الأدمن بيكتبه جنب زرار فتح الرفع).
--              إعدادات تنبيهات الشات (صورة الأيقونة + الصوت) بتتخزّن في جدول ui_customizations الموجود (ui_key = 'chat_notify') - مفيش جدول جديد.
-- الإصدار 84: جدول site_config (رقم الخدمة + طرق الدفع + بيانات Paymob + رابط دخول الإدارة السري + إعدادات OTP)
--              + جدول payment_orders (عمليات الدفع الأونلاين Paymob).
-- الإصدار 85: شؤون الموظفين (HR): جداول job_titles (المسميات الوظيفية بقت بتتضاف وتتعدّل من لوحة التحكم)
--              + hr_employees + hr_documents + hr_attendance (الحضور الشهري وحساب الراتب).
-- الإصدار 86: مفيش تغييرات في قاعدة البيانات (ملف كلمات السر بقى جنب db.php + ملف RESET_ADMIN_LOGIN.sql منفصل للرجوع لدخول الإدارة العادي).
-- الإصدار 87: مفيش تغييرات في قاعدة البيانات (صور الشعار في جذر الموقع من غير فولدرات + إصلاح الدخول من المتصفح العادي - كوكي الجلسة القديم).
-- الإصدار 88: email_log (أرشيف + سلة محذوفات) + user_watchlist (قائمة المتابعة) + user_alerts (تنبيهات الأسعار)
--              + portfolio_snapshots (منحنى أداء المحفظة) + payment_cards / subscribers.auto_renew (التجديد التلقائي مع Paymob).
-- الإصدار 89: plan_trades (جدول الصفقات المنظم لتقارير الإدارة - بيتبني تلقائي مع حفظ الخطط)
--              + chat_faq (أسئلة وأجوبة المساعد الذكي في الشات - الأدمن بيديرها).
--              + custom_alerts (تنبيهات سعر مخصّصة: البورصة/العملة/السهم + أكبر أو أقل من + عدد مرات التذكير والفرق بينها)
--              + trash_bin (سلة المحذوفات - أي حاجة بتتمسح من الموقع بتتنسخ فيها ويمكن استرجاعها).
-- الإصدار 90: مفيش تغييرات في قاعدة البيانات (منحنى إجمالي المحفظة في الرئيسية بيظهر للأدمن وبيترسم فورًا من تاريخ الخطط).
-- الإصدار 91: عمود dismissed في user_alerts (تنبيهات الرئيسية بتفضل ظاهرة لحد ما تقفلها) + جداول المحفظة 10 صفوف + أسئلة المساعد كقائمة واضحة.
-- الإصدار 92: مفيش تغييرات في قاعدة البيانات (أرقام المحفظة بسعر السوق ومتطابقة في الرئيسية والمنحنى والتقارير + إشعار الإدارة لما العميل يطلب موظف + فلتر استثماراتي).
-- الإصدار 93: مفيش تغييرات في قاعدة البيانات (أسئلة المساعد الذكي في قائمة منسدلة من زرار ❓ جنب الترس).
-- الإصدار 94: مفيش تغييرات في قاعدة البيانات (كل حساب بيشوف إشعاراته بس + حماية عند تبديل الحساب + كل أسئلة المساعد في قائمة عمودية بتتمرر لفوق وتحت).
-- الإصدار 95: مفيش تغييرات في قاعدة البيانات (المساعد الذكي بيرد في كل مرة - كان بيسكت 15 دقيقة بعد رد موظف أو لو السؤال اتكرر).
-- الإصدار 96: تصحيح النصوص (DAC ← DCA ، Top7 المصرية) + أكواد الأعضاء + أسواق الحسابات (مصر / السعودية / الإمارات / قطر / الكويت) + باقات وطرق دفع لكل سوق
--              + ترتيب العناصر في استوديو التصميم وخط لكل ثيم (في ui_customizations - مفيش جدول جديد).
-- الإصدار 97: alert_targets.meta + rearmed (إشعارات الخطط بالكمية ومتوسط التكلفة والربح + تكرار بعد 24 ساعة لو السعر رجع وعدّى تاني)
--              + user_alerts.body بقى TEXT (نص الإشعار الكامل) + الأوقات بتتسجّل UTC وبتتعرض بتوقيت جهاز المستخدم.
-- الإصدار 98: جدول symbol_checks (الأسهم المكتوبة غلط بتتمسح نهائيًا هي وخططها، والرمز الممنوع مبيرجعش تاني).
-- الإصدار 99: مفيش تغييرات في قاعدة البيانات (حذف خطط الشبكة والخطط من القوائم ← سلة المحذوفات، والاسترجاع مبيكتبش فوق خطة جديدة لنفس السهم).
-- الإصدار 100: فهارس (Indexes) إضافية للسرعة مع عدد كبير من المستخدمين (10,000+) + إعدادات الشاشات الطارئة ووضع الصيانة والدعاية (في site_config - مفيش جداول جديدة).
-- الإصدار 101: جداول opportunities + opportunity_hits (البحث عن فرص حسب المؤشرات) + notify_prefs (قنوات الإشعارات لكل مشترك: الموقع / الإيميل / الواتساب).
-- الإصدار 102: مفيش تغييرات في قاعدة البيانات (تحديث تلقائي للأجهزة اللي شغالة بنسخة قديمة + قائمة استثماراتي 5 ظاهرين والباقي تمرير).
-- ============================================================

-- الإصدار 85: ترميز الاتصال UTF-8 عشان النصوص العربي اللي بتتضاف من الملف (زي المسميات الوظيفية) تتحفظ صح
SET NAMES utf8mb4;

-- ============================================================
-- GRIFFINE — كل تحديثات قاعدة البيانات (نسخة نضيفة بدون أي ملاحظات)
-- آمن 100% تشغّله عدد لا نهائي من المرات - مش هيطلع أي Note أو تحذير
-- شغّله كامل من phpMyAdmin (تبويب SQL) دفعة واحدة
-- ============================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS griffine_apply_schema $$
CREATE PROCEDURE griffine_apply_schema()
BEGIN

  -- ===== الجداول الأساسية =====
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users') THEN
    CREATE TABLE users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(191) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      is_admin TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscribers') THEN
    CREATE TABLE subscribers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      account_email VARCHAR(191) NOT NULL,
      name VARCHAR(191) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      contact_email VARCHAR(191) NOT NULL,
      national_id VARCHAR(50) NULL,
      address VARCHAR(500) NULL,
      plan_id VARCHAR(20) NOT NULL,
      plan_name VARCHAR(120) NOT NULL,
      amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      currency VARCHAR(50),
      market VARCHAR(50),
      payment_method VARCHAR(20),
      payment_ref VARCHAR(191),
      payment_proof LONGTEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      reminder_enabled TINYINT(1) NOT NULL DEFAULT 1,
      reminder_interval_days INT NOT NULL DEFAULT 2,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscribers' AND COLUMN_NAME='national_id') THEN
    ALTER TABLE subscribers ADD COLUMN national_id VARCHAR(50) NULL, ADD COLUMN address VARCHAR(500) NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='page_contents') THEN
    CREATE TABLE page_contents (
      page_key VARCHAR(50) NOT NULL PRIMARY KEY,
      content LONGTEXT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by VARCHAR(191) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='email_change_requests') THEN
    CREATE TABLE email_change_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      current_email VARCHAR(191) NOT NULL,
      requested_email VARCHAR(191) NOT NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME NULL,
      reviewed_by VARCHAR(191) NULL,
      review_note TEXT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reminder_defaults') THEN
    CREATE TABLE reminder_defaults (
      id INT PRIMARY KEY,
      start_before_days INT NOT NULL DEFAULT 6,
      interval_days INT NOT NULL DEFAULT 2
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reminder_defaults WHERE id=1) THEN
    INSERT INTO reminder_defaults (id, start_before_days, interval_days) VALUES (1, 6, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='password_resets') THEN
    CREATE TABLE password_resets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(191) NOT NULL,
      token VARCHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='blacklist') THEN
    CREATE TABLE blacklist (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('email','phone','name') NOT NULL,
      value VARCHAR(191) NOT NULL,
      reason VARCHAR(255) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='email_verifications') THEN
    CREATE TABLE email_verifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(191) NOT NULL,
      token VARCHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='admin_settings') THEN
    CREATE TABLE admin_settings (
      setting_key VARCHAR(64) PRIMARY KEY,
      setting_value TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='chat_messages') THEN
    CREATE TABLE chat_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      visitor_email VARCHAR(191) NULL,
      sender ENUM('visitor','admin') NOT NULL DEFAULT 'visitor',
      message TEXT NULL,
      attachment LONGTEXT NULL,
      attachment_name VARCHAR(255) NULL,
      visitor_id VARCHAR(64) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='chat_messages' AND COLUMN_NAME='visitor_id') THEN
    ALTER TABLE chat_messages ADD COLUMN visitor_id VARCHAR(64) NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='chat_messages' AND COLUMN_NAME='visitor_email' AND IS_NULLABLE='NO') THEN
    ALTER TABLE chat_messages MODIFY COLUMN visitor_email VARCHAR(191) NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='admin_presence') THEN
    CREATE TABLE admin_presence (
      id INT PRIMARY KEY,
      last_seen DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM admin_presence WHERE id=1) THEN
    INSERT INTO admin_presence (id, last_seen) VALUES (1, NULL);
  END IF;

  -- ===== أعمدة إضافية على subscribers =====
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscribers' AND COLUMN_NAME='pending_plan_id') THEN
    ALTER TABLE subscribers ADD COLUMN pending_plan_id VARCHAR(20) NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscribers' AND COLUMN_NAME='pending_plan_name') THEN
    ALTER TABLE subscribers ADD COLUMN pending_plan_name VARCHAR(120) NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscribers' AND COLUMN_NAME='pending_amount') THEN
    ALTER TABLE subscribers ADD COLUMN pending_amount DECIMAL(10,2) NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscribers' AND COLUMN_NAME='is_comp') THEN
    ALTER TABLE subscribers ADD COLUMN is_comp TINYINT(1) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscribers' AND COLUMN_NAME='pending_payment_method') THEN
    ALTER TABLE subscribers ADD COLUMN pending_payment_method VARCHAR(20) NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscribers' AND COLUMN_NAME='pending_payment_ref') THEN
    ALTER TABLE subscribers ADD COLUMN pending_payment_ref VARCHAR(191) NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscribers' AND COLUMN_NAME='pending_payment_proof') THEN
    ALTER TABLE subscribers ADD COLUMN pending_payment_proof LONGTEXT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscribers' AND COLUMN_NAME='archived') THEN
    ALTER TABLE subscribers ADD COLUMN archived TINYINT(1) NOT NULL DEFAULT 0;
  END IF;

  -- ===== أعمدة إضافية على users =====
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='archived') THEN
    ALTER TABLE users ADD COLUMN archived TINYINT(1) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='archived_at') THEN
    ALTER TABLE users ADD COLUMN archived_at DATETIME NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='email_verified') THEN
    ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0;
  END IF;

  -- ===== أعمدة إضافية على reminder_defaults =====
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reminder_defaults' AND COLUMN_NAME='grace_period_days') THEN
    ALTER TABLE reminder_defaults ADD COLUMN grace_period_days INT NOT NULL DEFAULT 3;
  END IF;

  -- ===== إعدادات الأدمن الافتراضية =====
  IF NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key='require_email_verification') THEN
    INSERT INTO admin_settings (setting_key, setting_value) VALUES ('require_email_verification', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key='require_valid_email_domain') THEN
    INSERT INTO admin_settings (setting_key, setting_value) VALUES ('require_valid_email_domain', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key='require_payment_ref') THEN
    INSERT INTO admin_settings (setting_key, setting_value) VALUES ('require_payment_ref', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key='require_payment_proof') THEN
    INSERT INTO admin_settings (setting_key, setting_value) VALUES ('require_payment_proof', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key='require_card_details') THEN
    INSERT INTO admin_settings (setting_key, setting_value) VALUES ('require_card_details', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key='require_manual_activation') THEN
    INSERT INTO admin_settings (setting_key, setting_value) VALUES ('require_manual_activation', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key='chat_enabled') THEN
    INSERT INTO admin_settings (setting_key, setting_value) VALUES ('chat_enabled', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key='chat_icon_visible') THEN
    INSERT INTO admin_settings (setting_key, setting_value) VALUES ('chat_icon_visible', 1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='chat_conversation_meta') THEN
    CREATE TABLE chat_conversation_meta (
      visitor_key VARCHAR(191) PRIMARY KEY,
      archived TINYINT(1) NOT NULL DEFAULT 0,
      deleted TINYINT(1) NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vapid_keys') THEN
    CREATE TABLE vapid_keys (
      id INT PRIMARY KEY,
      public_key VARCHAR(255) NOT NULL,
      private_key VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='push_subscriptions') THEN
    CREATE TABLE push_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      owner_key VARCHAR(191) NOT NULL,
      endpoint TEXT NOT NULL,
      endpoint_hash CHAR(64) NOT NULL,
      p256dh VARCHAR(255) NOT NULL,
      auth VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_sub (owner_key, endpoint_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscription_plans') THEN
    CREATE TABLE subscription_plans (
      id VARCHAR(20) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      period_label VARCHAR(50) NOT NULL,
      duration_days INT NOT NULL DEFAULT 30,
      badge VARCHAR(100) NULL,
      save_note VARCHAR(255) NULL,
      features TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id='monthly') THEN
    INSERT INTO subscription_plans (id, name, amount, period_label, duration_days, badge, save_note, features, is_active, sort_order)
    VALUES ('monthly', 'الخطة الشهرية', 100, 'شهريًا', 30, NULL, NULL, '["متابعة عدد غير محدود من الأسهم","خطط تعزيز متوسط كاملة","كشاف الأسهم وملخص المحفظة","تقارير وكشوف حساب PDF/Excel"]', 1, 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id='yearly') THEN
    INSERT INTO subscription_plans (id, name, amount, period_label, duration_days, badge, save_note, features, is_active, sort_order)
    VALUES ('yearly', 'الخطة السنوية', 1000, 'سنويًا', 365, 'الأكثر توفيرًا', 'وفّر 200 عن السعر الشهري (1200)', '["كل مزايا الخطة الشهرية","خصم 200 مقارنة بالاشتراك الشهري ×12","أولوية في الدعم الفني"]', 1, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id='trial') THEN
    INSERT INTO subscription_plans (id, name, amount, period_label, duration_days, badge, save_note, features, is_active, sort_order)
    VALUES ('trial', 'تجربة مجانية', 0, '٣٠ يوم', 30, 'ابدأ مجانًا', NULL, '["تجربة كل المزايا مجانًا","بدون أي التزام","تتحول لاشتراك مدفوع بعد انتهاء الفترة"]', 1, 3);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscribers' AND COLUMN_NAME='pending_duration_days') THEN
    ALTER TABLE subscribers ADD COLUMN pending_duration_days INT NULL;
  END IF;

  -- ===== الفريق والصلاحيات (بند 28) =====
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='staff_members') THEN
    CREATE TABLE staff_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(191) NOT NULL UNIQUE,
      job_title VARCHAR(50) NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='staff_permissions') THEN
    CREATE TABLE staff_permissions (
      staff_id INT NOT NULL,
      permission_key VARCHAR(64) NOT NULL,
      PRIMARY KEY (staff_id, permission_key),
      FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  -- ===== محتوى الموقع القابل للتعديل (لصلاحية "تنسيق الموقع") =====
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='site_content') THEN
    CREATE TABLE site_content (
      content_key VARCHAR(64) PRIMARY KEY,
      content_value TEXT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='announcement_enabled') THEN
    INSERT INTO site_content (content_key, content_value) VALUES ('announcement_enabled', '0');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='announcement_text') THEN
    INSERT INTO site_content (content_key, content_value) VALUES ('announcement_text', '');
  END IF;

  -- ===== إعدادات الشكل والبانر (بند 29) - كلها فاضية افتراضيًا = يفضل الشكل الحالي زي ما هو =====
  IF NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='bg_color') THEN
    INSERT INTO site_content (content_key, content_value) VALUES ('bg_color', '');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='text_color') THEN
    INSERT INTO site_content (content_key, content_value) VALUES ('text_color', '');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='accent_color') THEN
    INSERT INTO site_content (content_key, content_value) VALUES ('accent_color', '');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='font_family') THEN
    INSERT INTO site_content (content_key, content_value) VALUES ('font_family', '');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='font_size_base') THEN
    INSERT INTO site_content (content_key, content_value) VALUES ('font_size_base', '');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='hero_banner_type') THEN
    INSERT INTO site_content (content_key, content_value) VALUES ('hero_banner_type', 'none');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='hero_banner_url') THEN
    INSERT INTO site_content (content_key, content_value) VALUES ('hero_banner_url', '');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='hero_title') THEN
    INSERT INTO site_content (content_key, content_value) VALUES ('hero_title', '');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='hero_subtitle') THEN
    INSERT INTO site_content (content_key, content_value) VALUES ('hero_subtitle', '');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='custom_buttons') THEN
    INSERT INTO site_content (content_key, content_value) VALUES ('custom_buttons', '[]');
  END IF;

  -- ===== سجل أحداث الاشتراكات (لتقارير الأدمن وسجل اشتراك العميل - بند 29) =====
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscription_events') THEN
    CREATE TABLE subscription_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      account_email VARCHAR(191) NOT NULL,
      event_type VARCHAR(30) NOT NULL,
      plan_id VARCHAR(20) NULL,
      plan_name VARCHAR(120) NULL,
      amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      event_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  -- ===== توثيق الموافقة على إخلاء المسؤولية القانوني (بند 30) =====
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='disclaimer_acceptances') THEN
    CREATE TABLE disclaimer_acceptances (
      id INT AUTO_INCREMENT PRIMARY KEY,
      account_email VARCHAR(191) NOT NULL,
      disclaimer_version INT NOT NULL,
      accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_accept (account_email, disclaimer_version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  -- ===== إعدادات محرك إشارات التحليل الفني اليدوي (بند 31) =====
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='screener_settings') THEN
    CREATE TABLE screener_settings (
      setting_key VARCHAR(64) PRIMARY KEY,
      setting_value VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  -- ===== توصيات الشراء (بند 33) =====
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recommendations') THEN
    CREATE TABLE recommendations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      stock_name VARCHAR(120) NOT NULL,
      buy_from DECIMAL(12,3) NOT NULL,
      buy_to DECIMAL(12,3) NOT NULL,
      resistance1 DECIMAL(12,3) NULL, resistance1_pct DECIMAL(5,2) NULL,
      resistance2 DECIMAL(12,3) NULL, resistance2_pct DECIMAL(5,2) NULL,
      resistance3 DECIMAL(12,3) NULL, resistance3_pct DECIMAL(5,2) NULL,
      support1 DECIMAL(12,3) NULL,
      support2 DECIMAL(12,3) NULL,
      support3 DECIMAL(12,3) NULL,
      validity_hours INT NOT NULL DEFAULT 24,
      archived TINYINT(1) NOT NULL DEFAULT 0,
      archived_at DATETIME NULL,
      created_by VARCHAR(191) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recommendations' AND COLUMN_NAME='validity_hours') THEN
    ALTER TABLE recommendations ADD COLUMN validity_hours INT NOT NULL DEFAULT 24;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recommendations' AND COLUMN_NAME='archived') THEN
    ALTER TABLE recommendations ADD COLUMN archived TINYINT(1) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recommendations' AND COLUMN_NAME='archived_at') THEN
    ALTER TABLE recommendations ADD COLUMN archived_at DATETIME NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recommendations' AND COLUMN_NAME='status') THEN
    ALTER TABLE recommendations ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recommendation_settings') THEN
    CREATE TABLE recommendation_settings (
      setting_key VARCHAR(64) PRIMARY KEY,
      setting_value VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    INSERT INTO recommendation_settings (setting_key, setting_value) VALUES ('retention_hours', '24');
  END IF;

  -- ===== فهرسة الأداء (بند 41) - تسريع الاستعلامات الأكثر استخدامًا =====
  IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscribers' AND INDEX_NAME='idx_account_email') THEN
    ALTER TABLE subscribers ADD INDEX idx_account_email (account_email);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscribers' AND INDEX_NAME='idx_archived_active') THEN
    ALTER TABLE subscribers ADD INDEX idx_archived_active (archived, active);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='blacklist' AND INDEX_NAME='idx_type_value') THEN
    ALTER TABLE blacklist ADD INDEX idx_type_value (type, value);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='chat_messages' AND INDEX_NAME='idx_visitor_id') THEN
    ALTER TABLE chat_messages ADD INDEX idx_visitor_id (visitor_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='chat_messages' AND INDEX_NAME='idx_visitor_email') THEN
    ALTER TABLE chat_messages ADD INDEX idx_visitor_email (visitor_email);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscription_events' AND INDEX_NAME='idx_account_email') THEN
    ALTER TABLE subscription_events ADD INDEX idx_account_email (account_email);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscription_events' AND INDEX_NAME='idx_event_date') THEN
    ALTER TABLE subscription_events ADD INDEX idx_event_date (event_date);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recommendations' AND INDEX_NAME='idx_archived') THEN
    ALTER TABLE recommendations ADD INDEX idx_archived (archived);
  END IF;

  -- ===== آراء العملاء والمقالات (بند 42) =====
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='testimonials') THEN
    CREATE TABLE testimonials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_email VARCHAR(191) NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      rating TINYINT NOT NULL DEFAULT 5,
      comment_text VARCHAR(500) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='articles') THEN
    CREATE TABLE articles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      slug VARCHAR(200) NOT NULL UNIQUE,
      body TEXT NOT NULL,
      summary VARCHAR(300) NULL,
      published TINYINT(1) NOT NULL DEFAULT 1,
      created_by VARCHAR(191) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  -- ===== برنامج الإحالة (بند 43) =====
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='referral_code') THEN
    ALTER TABLE users ADD COLUMN referral_code VARCHAR(12) NULL UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='referrals') THEN
    CREATE TABLE referrals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      referrer_email VARCHAR(191) NOT NULL,
      referred_email VARCHAR(191) NOT NULL UNIQUE,
      rewarded TINYINT(1) NOT NULL DEFAULT 0,
      rewarded_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  -- ===== صورة أفاتار للمستخدم (Base64 - يا إما اختيار من مجموعة جاهزة يا إما رفع صورة شخصية) =====
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='avatar_data') THEN
    ALTER TABLE users ADD COLUMN avatar_data MEDIUMTEXT NULL;
  END IF;

  -- ===== جدول مقترحات تطوير الموقع من العملاء =====
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='suggestions') THEN
    CREATE TABLE suggestions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      account_email VARCHAR(191) NOT NULL,
      message TEXT NOT NULL,
      attachment_data MEDIUMTEXT NULL,
      attachment_name VARCHAR(255) NULL,
      attachment_type VARCHAR(100) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'new',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  -- ==== جدول خلفيات الشاشات (تنسيق الموقع - خلفية مخصصة لكل شاشة) ====
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='page_backgrounds') THEN
    CREATE TABLE page_backgrounds (
      page_key VARCHAR(60) NOT NULL PRIMARY KEY,
      image_data LONGTEXT NULL,
      updated_by VARCHAR(191) NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;



END $$

DELIMITER ;

CALL griffine_apply_schema();
DROP PROCEDURE griffine_apply_schema;

-- جدول مزامنة خطط العملاء بين الأجهزة
CREATE TABLE IF NOT EXISTS user_data_store (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_email VARCHAR(190) NOT NULL,
  data_key VARCHAR(50) NOT NULL,
  data_value LONGTEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_email_key (account_email, data_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 68: كل خطة سهم (DCA / Grid) في صف مستقل برقم نسخة - النقل من الجدول القديم بيحصل تلقائيًا أول ما العميل يفتح الموقع
CREATE TABLE IF NOT EXISTS user_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_email VARCHAR(190) NOT NULL,
  plan_type VARCHAR(20) NOT NULL,
  symbol VARCHAR(64) NOT NULL,
  data_value LONGTEXT NULL,
  version INT NOT NULL DEFAULT 1,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_plan (account_email, plan_type, symbol),
  KEY idx_plans_email (account_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 69: تسجيل محاولات الدخول الفاشلة (قفل مؤقت 15 دقيقة بعد 8 محاولات غلط)
CREATE TABLE IF NOT EXISTS login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  ip VARCHAR(45) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_la_email (email, created_at),
  KEY idx_la_ip (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 69: ربط اشتراك الإشعارات بحساب العميل (التوصيات بتتبعت للمشتركين النشطين بس)
DELIMITER $$
DROP PROCEDURE IF EXISTS griffine_v69 $$
CREATE PROCEDURE griffine_v69()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='push_subscriptions' AND COLUMN_NAME='account_email') THEN
    ALTER TABLE push_subscriptions ADD COLUMN account_email VARCHAR(190) NULL, ADD KEY idx_push_email (account_email);
  END IF;
END $$
DELIMITER ;
CALL griffine_v69();
DROP PROCEDURE griffine_v69;

-- الإصدار 71: لا توجد جداول أو أعمدة جديدة - الملف متوافق زي ما هو.

-- الإصدار 72: استوديو التصميم - صف لكل نوع تخصيص:
--   theme     → الثيم (اللون الرئيسي، الخط، الحجم، الحواف، شكل الأزرار، الجداول في سطر واحد)
--   overrides → تعديلات الشاشات (قاموس النصوص + نص عنصر بعينه + تنسيق أي عنصر)
CREATE TABLE IF NOT EXISTS ui_customizations (
  ui_key VARCHAR(50) NOT NULL PRIMARY KEY,
  data_value LONGTEXT NOT NULL,
  updated_by VARCHAR(190) NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 72: سجل كل إيميل بيتبعت من الموقع (اتبعت / فشل + السبب) - بيظهر في لوحة التحكم ← مركز الإيميلات
CREATE TABLE IF NOT EXISTS email_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  to_email VARCHAR(190) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  mail_type VARCHAR(40) NOT NULL DEFAULT 'general',
  status VARCHAR(10) NOT NULL,
  transport VARCHAR(10) NULL,
  error_text VARCHAR(500) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_email_log_created (created_at),
  KEY idx_email_log_to (to_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 72: حالة "اتقرت" لمحادثات الشات (آخر وقت الأدمن فتح المحادثة)
DELIMITER $$
DROP PROCEDURE IF EXISTS griffine_v72 $$
CREATE PROCEDURE griffine_v72()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='chat_conversation_meta' AND COLUMN_NAME='admin_read_at') THEN
    ALTER TABLE chat_conversation_meta ADD COLUMN admin_read_at DATETIME NULL;
  END IF;
END $$
DELIMITER ;
CALL griffine_v72();
DROP PROCEDURE griffine_v72;

-- الإصدار 73: لا توجد جداول أو أعمدة جديدة.
-- الإصدار 73: التأكد إن حساب مدير الموقع متعلّم أدمن (من غيرها السيرفر مبيدّيش صلاحيات المشتركين والموظفين)
UPDATE users SET is_admin = 1 WHERE LOWER(username) = 'top72026@gmail.com' AND archived = 0;

-- الإصدار 82: الشات - رفع الملفات/الصور مقفول افتراضيًا عند العميل، والأدمن/الموظف بيفتحه لكل محادثة لوحدها
DELIMITER $$
DROP PROCEDURE IF EXISTS griffine_v82 $$
CREATE PROCEDURE griffine_v82()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='chat_conversation_meta' AND COLUMN_NAME='allow_upload') THEN
    ALTER TABLE chat_conversation_meta ADD COLUMN allow_upload TINYINT(1) NOT NULL DEFAULT 0;
  END IF;
  -- معرّف محادثة ثابت لكل حساب (نفس المحادثة من أي جهاز - زي ماسنجر)
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='chat_visitor_id') THEN
    ALTER TABLE users ADD COLUMN chat_visitor_id VARCHAR(64) NULL, ADD KEY idx_users_chat_visitor (chat_visitor_id);
  END IF;
END $$
DELIMITER ;
CALL griffine_v82();
DROP PROCEDURE griffine_v82;

-- الإصدار 83: أقصى حجم لمرفقات الشات بالميجا لكل محادثة (فاضي = الافتراضي 8 ميجا، والحد الأعلى 2048)
DELIMITER $$
DROP PROCEDURE IF EXISTS griffine_v83 $$
CREATE PROCEDURE griffine_v83()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='chat_conversation_meta' AND COLUMN_NAME='max_upload_mb') THEN
    ALTER TABLE chat_conversation_meta ADD COLUMN max_upload_mb INT NULL DEFAULT NULL;
  END IF;
END $$
DELIMITER ;
CALL griffine_v83();
DROP PROCEDURE griffine_v83;

-- الإصدار 84: إعدادات نصية بيتحكم فيها الأدمن من لوحة التحكم (رقم الخدمة، طرق الدفع، Paymob، الدخول والأمان)
CREATE TABLE IF NOT EXISTS site_config (
  config_key VARCHAR(64) NOT NULL PRIMARY KEY,
  config_value TEXT NULL,
  updated_by VARCHAR(190) NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 84: عمليات الدفع الأونلاين (Paymob) - الاشتراك بيتفعّل تلقائي بعد تأكيد البوابة
CREATE TABLE IF NOT EXISTS payment_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(20) NOT NULL DEFAULT 'paymob',
  merchant_ref VARCHAR(40) NOT NULL,
  provider_order_id VARCHAR(40) NULL,
  provider_txn_id VARCHAR(40) NULL,
  kind VARCHAR(10) NOT NULL DEFAULT 'new',
  subscriber_id INT NOT NULL DEFAULT 0,
  account_email VARCHAR(190) NOT NULL,
  plan_id VARCHAR(64) NOT NULL,
  immediate TINYINT(1) NOT NULL DEFAULT 0,
  amount_cents INT NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME NULL,
  UNIQUE KEY uq_payment_merchant (merchant_ref),
  KEY idx_payment_provider_order (provider, provider_order_id),
  KEY idx_payment_email (account_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 85: المسميات الوظيفية (الأدمن بيضيف ويعدّل) + الصلاحيات الافتراضية لكل مسمى
CREATE TABLE IF NOT EXISTS job_titles (
  title_key VARCHAR(40) NOT NULL PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  default_perms TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO job_titles (title_key, label, default_perms, sort_order) VALUES
  ('site_manager', 'مدير موقع', '["manage_staff","manage_admin_settings","manage_subscribers","manage_plans","manage_blacklist","manage_reminders","view_chat","reply_chat","edit_site_design","view_reports","manage_recommendations","manage_content","manage_testimonials","manage_suggestions","manage_hr"]', 1),
  ('editor', 'مبرمج للتنسيق والتعديل', '["edit_site_design","manage_content","manage_testimonials"]', 2),
  ('customer_service', 'خدمة عملاء', '["view_chat","reply_chat"]', 3),
  ('sales', 'مندوب مبيعات', '["manage_subscribers","view_chat","reply_chat","view_reports","manage_recommendations"]', 4),
  ('accounts', 'مدير حسابات', '["manage_subscribers","manage_plans","manage_reminders","view_reports","manage_hr"]', 5);

-- الإصدار 85: بيانات الموظفين (شؤون الموظفين HR)
CREATE TABLE IF NOT EXISTS hr_employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  job_title VARCHAR(40) NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(190) NULL,
  national_id VARCHAR(20) NULL,
  salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  start_date DATE NULL,
  end_date DATE NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_by VARCHAR(190) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_hr_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 85: مستندات الموظف (صورة البطاقة، العقد، الشهادات ...) - الملفات نفسها في مجلد الرفع المحمي
CREATE TABLE IF NOT EXISTS hr_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  file_token VARCHAR(80) NOT NULL,
  file_name VARCHAR(150) NOT NULL,
  uploaded_by VARCHAR(190) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_hr_docs_emp (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 85: الحضور الشهري لكل موظف (أيام العمل / أيام الحضور / مكافأة / خصم) ← الراتب المستحق
CREATE TABLE IF NOT EXISTS hr_attendance (
  employee_id INT NOT NULL,
  month CHAR(7) NOT NULL,
  work_days DECIMAL(5,1) NOT NULL DEFAULT 26,
  present_days DECIMAL(5,1) NOT NULL DEFAULT 0,
  bonus DECIMAL(12,2) NOT NULL DEFAULT 0,
  deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  base_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  note VARCHAR(255) NULL,
  updated_by VARCHAR(190) NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (employee_id, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 85: آراء العملاء بقت صلاحية لوحدها (manage_testimonials) - أي حد كان عنده "آراء العملاء والمقالات" بياخدها تلقائي
INSERT IGNORE INTO staff_permissions (staff_id, permission_key)
  SELECT staff_id, 'manage_testimonials' FROM staff_permissions WHERE permission_key = 'manage_content';

-- الإصدار 88: مركز الإيميلات - أرشيف وسلة محذوفات
DELIMITER $$
DROP PROCEDURE IF EXISTS griffine_v88 $$
CREATE PROCEDURE griffine_v88()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='email_log' AND COLUMN_NAME='archived') THEN
    ALTER TABLE email_log ADD COLUMN archived TINYINT(1) NOT NULL DEFAULT 0, ADD COLUMN deleted TINYINT(1) NOT NULL DEFAULT 0;
  END IF;
END $$
DELIMITER ;
CALL griffine_v88();
DROP PROCEDURE griffine_v88;

-- الإصدار 88: قائمة المتابعة (أسهم العميل بأسعار تلقائية)
CREATE TABLE IF NOT EXISTS user_watchlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_email VARCHAR(190) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  market VARCHAR(20) NOT NULL DEFAULT 'مصر',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_watch (account_email, symbol, market)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 88: مستويات التنبيه من خطط العميل (سعر الشراء التالي / هدف البيع)
CREATE TABLE IF NOT EXISTS alert_targets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_email VARCHAR(190) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  market VARCHAR(20) NOT NULL DEFAULT 'مصر',
  plan_kind VARCHAR(5) NOT NULL DEFAULT 'DCA',
  side VARCHAR(4) NOT NULL DEFAULT 'buy',
  price DECIMAL(14,4) NOT NULL,
  label VARCHAR(150) NULL,
  triggered_at DATETIME NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_target (account_email, symbol, market, plan_kind, side),
  KEY idx_target_open (triggered_at, symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 88: تنبيهات العميل جوه الموقع (الجرس)
CREATE TABLE IF NOT EXISTS user_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_email VARCHAR(190) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body VARCHAR(500) NULL,
  symbol VARCHAR(20) NULL,
  market VARCHAR(20) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_alerts_user (account_email, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 88: لقطة يومية لقيمة المحفظة (منحنى الأداء في الرئيسية)
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  account_email VARCHAR(190) NOT NULL,
  snap_date DATE NOT NULL,
  currency VARCHAR(5) NOT NULL DEFAULT 'EGP',
  value DECIMAL(16,2) NOT NULL DEFAULT 0,
  cost DECIMAL(16,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (account_email, snap_date, currency)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 88: الكروت المحفوظة للتجديد التلقائي (التوكن من Paymob بس - مفيش أي رقم كارت عندنا)
CREATE TABLE IF NOT EXISTS payment_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_email VARCHAR(190) NOT NULL,
  provider VARCHAR(20) NOT NULL DEFAULT 'paymob',
  card_token VARCHAR(255) NOT NULL,
  masked_pan VARCHAR(25) NULL,
  brand VARCHAR(20) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_card_owner (account_email, provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 88: العميل بيشغّل / يوقف التجديد التلقائي
DELIMITER $$
DROP PROCEDURE IF EXISTS griffine_v88b $$
CREATE PROCEDURE griffine_v88b()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscribers' AND COLUMN_NAME='auto_renew') THEN
    ALTER TABLE subscribers ADD COLUMN auto_renew TINYINT(1) NOT NULL DEFAULT 0;
  END IF;
END $$
DELIMITER ;
CALL griffine_v88b();
DROP PROCEDURE griffine_v88b;

-- الإصدار 89: جدول الصفقات (كل شراء / بيع / صفقة مقفولة من خطط العملاء) لتقارير الإدارة
CREATE TABLE IF NOT EXISTS plan_trades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_email VARCHAR(190) NOT NULL,
  plan_kind VARCHAR(5) NOT NULL DEFAULT 'DCA',
  symbol VARCHAR(64) NOT NULL,
  market VARCHAR(20) NULL,
  trade_type VARCHAR(6) NOT NULL,
  qty DECIMAL(18,4) NOT NULL DEFAULT 0,
  price DECIMAL(16,4) NOT NULL DEFAULT 0,
  exit_price DECIMAL(16,4) NULL,
  profit DECIMAL(16,2) NULL,
  capital DECIMAL(16,2) NULL,
  trade_date DATE NULL,
  level INT NULL,
  KEY idx_trades_owner (account_email, plan_kind),
  KEY idx_trades_symbol (symbol),
  KEY idx_trades_date (trade_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 89: أسئلة وأجوبة المساعد الذكي في الشات
CREATE TABLE IF NOT EXISTS chat_faq (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(300) NOT NULL,
  keywords VARCHAR(500) NULL,
  answer TEXT NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  hits INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 89: تنبيهات سعر مخصّصة
CREATE TABLE IF NOT EXISTS custom_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_email VARCHAR(190) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  market VARCHAR(20) NOT NULL DEFAULT 'مصر',
  currency VARCHAR(5) NOT NULL DEFAULT 'EGP',
  cond VARCHAR(3) NOT NULL DEFAULT 'gte',
  target_price DECIMAL(14,4) NOT NULL,
  max_repeats TINYINT NOT NULL DEFAULT 1,
  repeat_minutes INT NOT NULL DEFAULT 60,
  sent_count TINYINT NOT NULL DEFAULT 0,
  last_sent_at DATETIME NULL,
  last_price DECIMAL(14,4) NULL,
  last_checked_at DATETIME NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  note VARCHAR(150) NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_custom_owner (account_email),
  KEY idx_custom_open (active, symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 89: سلة المحذوفات
CREATE TABLE IF NOT EXISTS trash_bin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  deleted_by VARCHAR(190) NOT NULL,
  owner_email VARCHAR(190) NULL,
  scope VARCHAR(10) NOT NULL DEFAULT 'user',
  item_type VARCHAR(30) NOT NULL,
  item_label VARCHAR(255) NOT NULL,
  payload LONGTEXT NOT NULL,
  deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  restored_at DATETIME NULL,
  restored_by VARCHAR(190) NULL,
  KEY idx_trash_by (deleted_by, restored_at),
  KEY idx_trash_owner (owner_email, restored_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- أسئلة مبدئية (بتتضاف مرة واحدة بس لو الجدول فاضي - الأدمن يعدّلها أو يمسحها من لوحة التحكم)
INSERT INTO chat_faq (question, keywords, answer, sort_order)
SELECT * FROM (
  SELECT 'ما هي الباقات والأسعار؟' AS q, 'سعر, اسعار, باقه, باقات, تكلفه, كام' AS k, 'تجد كل الباقات وأسعارها ومميزات كل باقة في صفحة «الاشتراك والباقات» من القائمة الجانبية. يمكنك البدء بالتجربة المجانية إن كانت متاحة لحسابك.' AS a, 1 AS o
  UNION ALL SELECT 'كيف أشترك؟', 'اشترك, اشتراك, تفعيل, ادفع, الدفع', 'افتح «الاشتراك والباقات»، اختر الباقة، ثم اختر طريقة الدفع: بطاقة بنكية (Paymob) أو فودافون كاش أو إنستاباي مع إرسال صورة التحويل. يتم التفعيل تلقائيًا للدفع بالبطاقة، وبعد المراجعة للتحويلات.', 2
  UNION ALL SELECT 'ما هي خطة تعزيز المتوسط (DCA)؟', 'dca, تعزيز, المتوسط, متوسط', 'خطة تعزيز المتوسط تقسّم رأس مالك على مستويات شراء متتالية كلما نزل السعر، فيقل متوسط تكلفة السهم، ثم تبيع عند هدف الربح. أنشئها من «خطط تعزيز المتوسط (DCA)» واتبع الخطوات.', 3
  UNION ALL SELECT 'ما هي خطة الشبكة (Grid)؟', 'grid, شبكه, جريد', 'خطة الشبكة تضع مستويات شراء وبيع على مسافات ثابتة داخل نطاق سعري، فتشتري عند كل مستوى أقل وتبيع عند المستوى الأعلى، وتتكرر الدورات لتحقيق أرباح صغيرة متكررة.', 4
  UNION ALL SELECT 'نسيت كلمة المرور', 'نسيت, كلمه المرور, كلمه السر, باسورد, password', 'من شاشة تسجيل الدخول اضغط «نسيت كلمة المرور» واكتب بريدك الإلكتروني، وسيصلك رابط لتعيين كلمة مرور جديدة.', 5
  UNION ALL SELECT 'هل الأسعار لحظية؟', 'لحظي, لحظيه, متاخره, تاخير, الاسعار', 'أسعار الأسهم في الموقع متأخرة حوالي 15 دقيقة عن السوق، وتُستخدم للمتابعة والتنبيهات فقط وليست توصية بالشراء أو البيع.', 6
) t WHERE NOT EXISTS (SELECT 1 FROM chat_faq);

-- الإصدار 91: تنبيهات الرئيسية بتفضل ظاهرة لحد ما العميل يقفلها (dismissed)
DELIMITER $$
DROP PROCEDURE IF EXISTS griffine_v91 $$
CREATE PROCEDURE griffine_v91()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_alerts' AND COLUMN_NAME='dismissed') THEN
    ALTER TABLE user_alerts ADD COLUMN dismissed TINYINT(1) NOT NULL DEFAULT 0;
  END IF;
END $$
DELIMITER ;
CALL griffine_v91();
DROP PROCEDURE griffine_v91;

-- الإصدار 91: الإشعارات القديمة كان فيها (DCA) / (Grid) بالإنجليزي وسط الجملة العربي فالنص بيتقلب ← أسماء عربية
UPDATE user_alerts SET body = REPLACE(REPLACE(body, 'في خطتك (DCA)', 'في خطة تعزيز المتوسط'), 'في خطتك (Grid)', 'في خطة خطوط الشبكة')
 WHERE body LIKE '%(DCA)%' OR body LIKE '%(Grid)%';

-- الإصدار 96: تصحيح النصوص المتخزّنة (صفحة عن GRIFFINE والعناوين وتعديلات الاستوديو)
UPDATE page_contents SET content = REPLACE(content, 'DAC', 'DCA') WHERE content LIKE BINARY '%DAC%';
UPDATE page_contents SET content = REPLACE(REPLACE(content, 'لشركة Top7،', 'لشركة Top7 المصرية،'), ' في الأسواق المصرية والخليجية', '')
 WHERE content LIKE '%Top7%' AND content NOT LIKE '%Top7 المصرية%';
UPDATE ui_customizations SET data_value = REPLACE(data_value, 'DAC', 'DCA') WHERE data_value LIKE BINARY '%DAC%';

-- الإصدار 96: أكواد الأعضاء (رقم تسلسل عام + INV / Top-7 + أكواد الموظفين GM / C / S / AC / N)
CREATE TABLE IF NOT EXISTS code_counters (
  prefix VARCHAR(10) NOT NULL PRIMARY KEY,
  last_no INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS member_code_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_email VARCHAR(190) NOT NULL,
  code VARCHAR(20) NOT NULL,
  kind VARCHAR(10) NOT NULL DEFAULT 'member',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_code_hist (account_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
DELIMITER $$
DROP PROCEDURE IF EXISTS griffine_v96 $$
CREATE PROCEDURE griffine_v96()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='member_no') THEN
    ALTER TABLE users ADD COLUMN member_no INT NULL, ADD COLUMN inv_code VARCHAR(20) NULL, ADD UNIQUE KEY uq_inv_code (inv_code);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='staff_members' AND COLUMN_NAME='staff_code') THEN
    ALTER TABLE staff_members ADD COLUMN staff_code VARCHAR(20) NULL, ADD UNIQUE KEY uq_staff_code (staff_code);
  END IF;
END $$
DELIMITER ;
CALL griffine_v96();
DROP PROCEDURE griffine_v96;
-- الحسابات الحالية بتاخد أكوادها تلقائيًا بترتيب تاريخ التسجيل أول ما الإدارة تفتح شاشة المشتركين (codes_lib.php)

-- الإصدار 96: أسواق الحسابات - كل حساب ليه سوق (كل الحسابات الحالية = مصر) + الباقات والتوصيات لكل سوق
DELIMITER $$
DROP PROCEDURE IF EXISTS griffine_v96m $$
CREATE PROCEDURE griffine_v96m()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='account_market') THEN
    ALTER TABLE users ADD COLUMN account_market VARCHAR(20) NOT NULL DEFAULT 'مصر';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscription_plans' AND COLUMN_NAME='market') THEN
    ALTER TABLE subscription_plans ADD COLUMN market VARCHAR(20) NOT NULL DEFAULT 'مصر';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recommendations')
     AND NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recommendations' AND COLUMN_NAME='market') THEN
    ALTER TABLE recommendations ADD COLUMN market VARCHAR(20) NOT NULL DEFAULT 'مصر';
  END IF;
END $$
DELIMITER ;
CALL griffine_v96m();
DROP PROCEDURE griffine_v96m;
UPDATE subscribers SET market = 'مصر' WHERE market IS NULL OR market = '';

-- ترتيب العناصر في استوديو التصميم وخط كل ثيم بيتخزّنوا في جدول ui_customizations الموجود - مفيش جدول جديد

-- الإصدار 97: إشعارات الخطط - بيانات الحساب في نص الإشعار (meta) + إعادة التسليح بعد ما السعر يرجع عكس الشرط (rearmed)
DELIMITER $$
DROP PROCEDURE IF EXISTS griffine_v97 $$
CREATE PROCEDURE griffine_v97()
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='alert_targets')
     AND NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='alert_targets' AND COLUMN_NAME='meta') THEN
    ALTER TABLE alert_targets ADD COLUMN meta TEXT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='alert_targets')
     AND NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='alert_targets' AND COLUMN_NAME='rearmed') THEN
    ALTER TABLE alert_targets ADD COLUMN rearmed TINYINT(1) NOT NULL DEFAULT 0;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_alerts' AND COLUMN_NAME='body' AND DATA_TYPE='varchar') THEN
    ALTER TABLE user_alerts MODIFY body TEXT NULL;
  END IF;
END $$
DELIMITER ;
CALL griffine_v97();
DROP PROCEDURE griffine_v97;

-- الإصدار 98: فحص رموز الأسهم - الرمز اللي مش موجود في البورصة بيتمسح نهائي هو وخططه (banned = 1 ← مبيرجعش تاني)
CREATE TABLE IF NOT EXISTS symbol_checks (
  symbol VARCHAR(64) NOT NULL,
  market VARCHAR(20) NOT NULL DEFAULT 'مصر',
  first_fail_at DATETIME NULL,
  last_fail_at DATETIME NULL,
  fails INT NOT NULL DEFAULT 0,
  banned TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (symbol, market)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- الإصدار 100: فهارس للسرعة مع عدد كبير من المستخدمين - كل فهرس بيتضاف بس لو الجدول موجود والفهرس مش موجود
DELIMITER $$
DROP PROCEDURE IF EXISTS griffine_idx $$
CREATE PROCEDURE griffine_idx(IN t VARCHAR(64), IN n VARCHAR(64), IN cols VARCHAR(255))
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=t)
     AND NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=t AND INDEX_NAME=n) THEN
    SET @s = CONCAT('ALTER TABLE `', t, '` ADD INDEX `', n, '` (', cols, ')');
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END $$
DELIMITER ;
CALL griffine_idx('user_alerts', 'idx_alerts_owner_id', 'account_email, id');
CALL griffine_idx('password_resets', 'idx_reset_token', 'token');
CALL griffine_idx('email_verifications', 'idx_verify_token', 'token');
CALL griffine_idx('email_change_requests', 'idx_ecr_email', 'current_email, status');
CALL griffine_idx('referrals', 'idx_ref_referrer', 'referrer_email');
CALL griffine_idx('subscription_events', 'idx_events_owner_date', 'account_email, event_date');
CALL griffine_idx('subscribers', 'idx_subs_end', 'active, end_date');
CALL griffine_idx('recommendations', 'idx_rec_archived_created', 'archived, created_at');
CALL griffine_idx('trash_bin', 'idx_trash_clean', 'restored_at, deleted_at');
CALL griffine_idx('users', 'idx_users_market', 'account_market');
CALL griffine_idx('chat_messages', 'idx_chat_created', 'created_at');
CALL griffine_idx('custom_alerts', 'idx_custom_sym_mkt', 'symbol, market, active');
DROP PROCEDURE griffine_idx;

-- الإصدار 101: البحث عن فرص حسب المؤشرات الفنية (لحد 4 فرص مفتوحة لكل مستخدم)
CREATE TABLE IF NOT EXISTS opportunities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_email VARCHAR(190) NOT NULL,
  opp_no INT NOT NULL DEFAULT 1,
  side VARCHAR(4) NOT NULL DEFAULT 'buy',
  timeframe VARCHAR(4) NOT NULL DEFAULT '1d',
  indicators TEXT NOT NULL,
  days TINYINT NOT NULL DEFAULT 1,
  ch_app TINYINT(1) NOT NULL DEFAULT 1,
  ch_email TINYINT(1) NOT NULL DEFAULT 1,
  max_sends TINYINT NOT NULL DEFAULT 1,
  send_gap INT NOT NULL DEFAULT 60,
  status VARCHAR(8) NOT NULL DEFAULT 'active',
  market VARCHAR(20) NOT NULL DEFAULT 'مصر',
  started_at DATETIME NULL,
  ends_at DATETIME NULL,
  sends_count TINYINT NOT NULL DEFAULT 0,
  last_sent_at DATETIME NULL,
  last_run_at DATETIME NULL,
  last_pass_at DATETIME NULL,
  scan_pos INT NOT NULL DEFAULT 0,
  pass_no INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_opp_owner (account_email, status),
  KEY idx_opp_run (status, last_pass_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS opportunity_hits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  opp_id INT NOT NULL,
  account_email VARCHAR(190) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(190) NULL,
  price DECIMAL(16,4) NOT NULL DEFAULT 0,
  pass_no INT NOT NULL DEFAULT 0,
  hit_at DATETIME NULL,
  notified TINYINT(1) NOT NULL DEFAULT 0,
  sent_no TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_opp_sym (opp_id, symbol),
  KEY idx_hit_notify (opp_id, notified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- الإصدار 101: قنوات الإشعارات لكل مشترك / موظف (الافتراضي: الموقع + الإيميل ، الواتساب مقفول)
CREATE TABLE IF NOT EXISTS notify_prefs (
  account_email VARCHAR(190) NOT NULL PRIMARY KEY,
  app TINYINT(1) NOT NULL DEFAULT 1,
  email TINYINT(1) NOT NULL DEFAULT 1,
  wa TINYINT(1) NOT NULL DEFAULT 0,
  wa_phone VARCHAR(30) NULL,
  user_visible TINYINT(1) NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT 'GRIFFINE database is up to date (v102)' AS result;
