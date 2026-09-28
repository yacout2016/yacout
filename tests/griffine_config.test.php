<?php
// GRIFFINE — إعدادات بيئة الاختبار المحلية فقط (قاعدة MariaDB تجريبية + محاكيات محلية)
// انسخه باسم griffine_config.php جوه فولدر نسخة الاختبار (مش الموقع الحقيقي أبدًا)
define('DB_HOST', 'localhost'); define('DB_USER', 'gt'); define('DB_PASS', 'gt'); define('DB_NAME', 'gtest');
define('MAIL_SMTP_PASS', 'test'); define('CRON_KEY', 'test_cron_key');
define('TV_SCAN_BASE', 'http://127.0.0.1:8098/'); define('MARKET_QUOTE_BASE', 'http://127.0.0.1:8098/');
define('PAYMOB_BASE', 'http://127.0.0.1:8097'); define('WA_GRAPH_BASE', 'http://127.0.0.1:8097/wa');
