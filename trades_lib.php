<?php
/* =====================================================================
   GRIFFINE — trades_lib.php (الإصدار 89) — جدول الصفقات الحقيقي plan_trades
   ---------------------------------------------------------------------
   الخطط نفسها بتفضل محفوظة زي ما هي (user_plans - JSON لكل سهم)، والجدول ده "نسخة منظمة" منها
   بتتبني تلقائي مع كل حفظ: كل شراء اتنفّذ، كل بيع، وكل صفقة مقفولة (دورة) - عشان تقارير الإدارة
   تتعمل بـ SQL مباشرة (عدد الصفقات، أحجام الشراء والبيع، الأرباح المحققة، حسب السهم أو العميل أو الفترة).
   ===================================================================== */

function trades_table_ready($conn){
    static $r = null; if ($r !== null) return $r;
    try { $x = $conn->query("SHOW TABLES LIKE 'plan_trades'"); $r = $x && $x->num_rows > 0; } catch (Throwable $e) { $r = false; }
    return $r;
}
function tr_date($v){ $d = substr((string)$v, 0, 10); return preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) ? $d : null; }
function tr_num($v){ return is_numeric($v) ? (float)$v : null; }

// بيحوّل خطة واحدة (DCA أو Grid) لصفوف صفقات
function trades_from_plan($kind, $sym, $p){
    $rows = [];
    $market = is_object($p) && isset($p->market) ? mb_substr((string)$p->market, 0, 20) : '';
    $levels = (is_object($p) && isset($p->levels) && is_array($p->levels)) ? $p->levels : [];
    foreach ($levels as $i => $lv) {
        if (!is_object($lv)) continue;
        $lvlNo = isset($lv->level) ? (int)$lv->level : $i + 1;
        if ($kind === 'DCA') {
            if (!empty($lv->executed) && tr_num($lv->actualQty ?? null) && tr_num($lv->actualPrice ?? null))
                $rows[] = ['buy', (float)$lv->actualQty, (float)$lv->actualPrice, null, null, null, tr_date($lv->execDate ?? ''), $lvlNo];
        } else {
            if (($lv->status ?? '') === 'bought' && tr_num($lv->executedQty ?? null) && tr_num($lv->executedPrice ?? null))
                $rows[] = ['buy', (float)$lv->executedQty, (float)$lv->executedPrice, null, null, null, tr_date($lv->executedDate ?? ''), $lvlNo];
        }
        foreach ((isset($lv->sells) && is_array($lv->sells)) ? $lv->sells : [] as $s) {
            if (is_object($s) && tr_num($s->qty ?? null) && tr_num($s->price ?? null))
                $rows[] = ['sell', (float)$s->qty, (float)$s->price, null, null, null, tr_date($s->date ?? ''), $lvlNo];
        }
    }
    // الصفقات المقفولة (دورات كاملة اترحّلت للسجل)
    foreach ((is_object($p) && isset($p->closedTrades) && is_array($p->closedTrades)) ? $p->closedTrades : [] as $c) {
        if (!is_object($c)) continue;
        $rows[] = ['closed', tr_num($c->totalQty ?? null) ?? 0, tr_num($c->avgEntry ?? null) ?? 0, tr_num($c->avgExit ?? null),
            tr_num($c->profit ?? null), tr_num($c->capitalUsed ?? null), tr_date($c->closedDate ?? ''), null];
    }
    return [$market, $rows];
}

// إعادة بناء صفقات حساب واحد لنوع خطط واحد (plans = DCA / grid_plans = Grid)
function trades_rebuild($conn, $email, $key){
    if (!trades_table_ready($conn) || !plans_table_ready($conn)) return 0;
    $kind = $key === 'grid_plans' ? 'Grid' : 'DCA';
    $st = $conn->prepare("SELECT symbol, data_value FROM user_plans WHERE account_email = ? AND plan_type = ? AND deleted = 0");
    $st->bind_param("ss", $email, $key); $st->execute(); $res = $st->get_result();
    $plans = []; while ($r = $res->fetch_assoc()) $plans[$r['symbol']] = json_decode($r['data_value']);
    $st->close();
    $conn->begin_transaction();
    try {
        $d = $conn->prepare("DELETE FROM plan_trades WHERE account_email = ? AND plan_kind = ?"); $d->bind_param("ss", $email, $kind); $d->execute(); $d->close();
        $ins = $conn->prepare("INSERT INTO plan_trades (account_email, plan_kind, symbol, market, trade_type, qty, price, exit_price, profit, capital, trade_date, level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $n = 0;
        foreach ($plans as $sym => $p) {
            [$market, $rows] = trades_from_plan($kind, (string)$sym, $p);
            foreach ($rows as [$type, $qty, $price, $exit, $profit, $capital, $date, $level]) {
                $s = (string)$sym;
                $ins->bind_param("sssssdddddsi", $email, $kind, $s, $market, $type, $qty, $price, $exit, $profit, $capital, $date, $level);
                $ins->execute(); $n++;
            }
        }
        $ins->close();
        $conn->commit();
        return $n;
    } catch (Throwable $e) { $conn->rollback(); error_log('GRIFFINE trades_rebuild: ' . $e->getMessage()); return 0; }
}
?>
