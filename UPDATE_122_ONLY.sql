-- GRIFFINE — تحديث الإصدار 122 فقط (ميزان GRIFFINE AI - جدول الدراسات المحفوظة)
-- آمن تشغّله أكتر من مرة
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS mizan_studies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_email VARCHAR(190) NOT NULL,
  mode VARCHAR(10) NOT NULL DEFAULT 'stocks',
  title VARCHAR(200) NOT NULL DEFAULT '',
  data MEDIUMTEXT NOT NULL,
  share_token VARCHAR(40) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_mz_owner (account_email, id),
  UNIQUE KEY uq_mz_share (share_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT 'GRIFFINE database is up to date (v122)' AS result;
