-- ============================================================
-- GRIFFINE — ALL_SCHEMA_UPDATES.sql (الإصدار 71)
-- كل تحديثات قاعدة البيانات في ملف واحد.
-- آمن تشغّله أي عدد من المرات: بيضيف الناقص بس ومبيمسحش أي بيانات.
-- الاستخدام: phpMyAdmin ← اختار قاعدة البيانات ← تبويب SQL ← الصق الملف كله ← Go
-- الإصدار 69: جدول login_attempts (حماية من تخمين كلمات المرور).
-- الإصدار 71: مفيش تغييرات في قاعدة البيانات (إصلاحات واجهة فقط: الشريط الجانبي + شعار الدردشة + طباعة كل الشاشات PDF).
-- ============================================================

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

SELECT 'GRIFFINE database is up to date (v71)' AS result;
