<?php
/* GRIFFINE — rd_lib.php (الإصدار 151) — أدوات «البحث والتطوير» (التحليلات والاقتراحات بقواعد ثابتة) */
function rd_ready($conn){
    static $ok = null; if ($ok !== null) return $ok;
    try {
        $conn->query("CREATE TABLE IF NOT EXISTS site_events (id BIGINT AUTO_INCREMENT PRIMARY KEY, ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP, day DATE NOT NULL, ev VARCHAR(12) NOT NULL,
            vid VARCHAR(40) NOT NULL, screen VARCHAR(60) NOT NULL DEFAULT '', src VARCHAR(40) NOT NULL DEFAULT 'direct', device VARCHAR(10) NOT NULL DEFAULT '', browser VARCHAR(20) NOT NULL DEFAULT '',
            os VARCHAR(20) NOT NULL DEFAULT '', country VARCHAR(4) NOT NULL DEFAULT '', logged TINYINT NOT NULL DEFAULT 0, ms INT NOT NULL DEFAULT 0, x VARCHAR(200) NOT NULL DEFAULT '',
            KEY ix_day_ev (day, ev), KEY ix_vid (vid)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $ok = true;
    } catch (Throwable $e) { $ok = false; }
    return $ok;
}
function rd_device($ua){ return preg_match('/iPad|Tablet/i', $ua) ? 'tablet' : (preg_match('/Mobi|Android|iPhone/i', $ua) ? 'mobile' : 'desktop'); }
function rd_browser($ua){
    foreach (['Edg' => 'Edge', 'OPR' => 'Opera', 'SamsungBrowser' => 'Samsung', 'FBAN|FBAV|FB_IAB' => 'Facebook', 'Instagram' => 'Instagram', 'TikTok|musical_ly|BytedanceWebview' => 'TikTok',
              'CriOS|Chrome' => 'Chrome', 'FxiOS|Firefox' => 'Firefox', 'Safari' => 'Safari'] as $re => $n) if (preg_match('/' . $re . '/i', $ua)) return $n;
    return 'other';
}
function rd_os($ua){ foreach (['Android' => 'Android', 'iPhone|iPad|iOS' => 'iOS', 'Windows' => 'Windows', 'Mac OS' => 'Mac', 'Linux' => 'Linux'] as $re => $n) if (preg_match('/' . $re . '/i', $ua)) return $n; return 'other'; }
// البلد: من هيدر الـ CDN لو موجود، وإلا من منطقة لغة المتصفح (ar-EG ← EG)
function rd_country(){
    foreach (['HTTP_CF_IPCOUNTRY', 'HTTP_X_COUNTRY_CODE', 'HTTP_X_GEO_COUNTRY'] as $h) if (!empty($_SERVER[$h]) && preg_match('/^[A-Z]{2}$/', $_SERVER[$h])) return $_SERVER[$h];
    if (preg_match('/[a-z]{2}-([A-Z]{2})/', (string)($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? ''), $m)) return $m[1];
    return '';
}
?>
