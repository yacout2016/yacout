/* =====================================================================
   GRIFFINE — recs.js (الإصدار 128) — «توصية شراء / بيع»
   01. شاشة المحلل: البورصة والعملة + الكود ← الاسم وآخر سعر تلقائي + المدة ← المحوري والدعم والمقاومة
       + قرار المحلل (منطقة الدخول / 3 أهداف بنسب بيع / وقف على مرحلة أو مرحلتين) + بصيرة السريعة + «دوّر على فرصة»
       + الملاحظة + معاينة الرسالة + القنوات (المنصة / الإيميل / الواتساب) + الإرسال على دفعات + رسائل المتابعة
   02. شاشة العميل: كارت منسّق لكل توصية + رسائل المتابعة تحتها
   ===================================================================== */
(function(){
  'use strict';
  const E = (s) => escapeHtml(String(s == null ? '' : s));
  const N = (v, d) => (v == null || v === '' || isNaN(+v)) ? '—' : (+v).toLocaleString('en-US', { maximumFractionDigits: d == null ? 3 : d });
  const P = (v) => (v == null || isNaN(v)) ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
  const toast = (m, k) => { if (window.GShell && GShell.toast) GShell.toast(m, k || 'ok'); };
  const $ = (id) => document.getElementById(id);
  const TFL = { day: 'يومي', week: 'أسبوعي', month: 'شهري', '3m': '3 شهور', '6m': '6 شهور', year: 'سنة' };
  const KIND = { target: '🎯 تحقق هدف', stop: '🛑 تعديل وقف الخسارة', close: '✅ إغلاق التوصية', note: '📝 ملاحظة' };
  let META = null, LV = null, TYPE = 'buy';

  /* ============ 01. شاشة المحلل ============ */
  window.renderRecommendationsAdminPage = async function(){
    const __tok = screenToken();
    pushNav(() => renderRecommendationsAdminPage());
    const email = await getSession();
    if (!email) return renderLogin();
    if (!window.__isAdmin) return renderHome();
    if (!hasPermission('manage_recommendations')) return renderAdminHub();
    if (window.__recLogTick) { clearInterval(window.__recLogTick); window.__recLogTick = null; }
    const [meta, logRes] = await Promise.all([apiGet('/recs_api.php?action=meta').catch(() => null), getRecommendationsLog()]);
    if (screenStale(__tok)) return;
    if (!meta || !meta.success) { app.innerHTML = `<div class="container"><div class="section-card error">${E((meta && meta.message) || 'تعذّر التحميل')}</div></div>`; return; }
    META = meta; LV = null; TYPE = 'buy';
    let recs = (logRes && logRes.success) ? logRes.recommendations : [];
    let analyst = ''; try { analyst = localStorage.getItem('gs_rec_analyst') || ''; } catch(e){}
    const mk0 = gAdminMarket() && meta.markets.some(m => m.name === gAdminMarket()) ? gAdminMarket() : meta.markets[0].name;
    app.innerHTML = `<div class="container wide rc-screen">${logoHeader()}<span class="gs-page-title" hidden>📢 توصية شراء / بيع</span>
      <div class="topbar"><div>${pageTitle('recommendations_admin', '📢 توصية شراء / بيع')}</div>${adminNavButtonsHtml()}</div>
      <div class="rc-work">
        <div class="section-card rc-form">
          <div class="rc-type" id="rcType"><button type="button" data-t="buy" class="on">📈 توصية شراء</button><button type="button" data-t="sell">📉 توصية بيع</button></div>
          <div class="rc-grid">
            <div><label for="rcMkt">البورصة</label><select id="rcMkt" data-g-mkt="skip">${meta.markets.map(m => `<option value="${E(m.name)}" ${m.name === mk0 ? 'selected' : ''}>${E(m.name)} — ${E(m.ccy)}</option>`).join('')}</select></div>
            <div><label for="rcSym">كود السهم</label><input id="rcSym" dir="ltr" autocomplete="off" placeholder="مثال: COMI" maxlength="20"></div>
            <div class="wide"><label for="rcName">اسم السهم ${gTipI('بيتملى تلقائي من الكود — وتقدر تعدّله')}</label><input id="rcName" placeholder="بيظهر تلقائي بعد كتابة الكود"></div>
            <div><label for="rcTf">المدة ${gTipI('المستويات (المحوري والدعم والمقاومة) بتتحسب من أعلى وأقل وإغلاق الفترة دي')}</label><select id="rcTf">${meta.tf.map(t => `<option value="${t.k}">${E(t.l)}</option>`).join('')}</select></div>
            <div><label for="rcValid">صلاحية التوصية</label><select id="rcValid">${meta.valid.map(v => `<option value="${v.h}">${E(v.l)}</option>`).join('')}</select></div>
          </div>
          <h3 class="rc-h" id="rcEntryH">💰 منطقة الشراء</h3>
          <div class="rc-grid">
            <div><label for="rcFrom">من</label><input id="rcFrom" type="number" step="any" dir="ltr"></div>
            <div><label for="rcTo">إلى</label><input id="rcTo" type="number" step="any" dir="ltr"></div>
            <div id="rcSellPctW" hidden><label for="rcSellPct">نسبة البيع من الكمية %</label><input id="rcSellPct" type="number" min="1" max="100" value="100" dir="ltr"></div>
          </div>
          <div class="rc-row"><button type="button" class="secondary small" id="rcSuggest">✨ املأ الاقتراح من المستويات</button><span class="u-muted u-fs12" id="rcSugNote">اختار السهم والمدة الأول</span></div>
          <h3 class="rc-h" id="rcTgH">🎯 نقاط جني الأرباح (بيع على مراحل)</h3>
          <table class="rc-tg g-no-enh"><thead><tr><th>#</th><th>السعر</th><th id="rcPctTh">نسبة البيع %</th><th>من الدخول</th></tr></thead><tbody>
            ${[1, 2, 3].map(i => `<tr><td>${i}</td><td><input id="rcT${i}" type="number" step="any" dir="ltr"></td><td class="rc-pc"><input id="rcT${i}p" type="number" min="0" max="100" step="any" dir="ltr" value="${[50, 25, 25][i - 1]}"></td><td class="n" id="rcT${i}g">—</td></tr>`).join('')}
          </tbody><tfoot><tr><td></td><td></td><td class="rc-pc"><b id="rcPctSum">100%</b></td><td></td></tr></tfoot></table>
          <h3 class="rc-h" id="rcStH">🛑 وقف الخسارة</h3>
          <div class="rc-grid">
            <div><label for="rcS1" id="rcS1L">السعر</label><input id="rcS1" type="number" step="any" dir="ltr"></div>
            <div class="rc-buyonly"><label for="rcS1p">نسبة البيع عنده %</label><input id="rcS1p" type="number" min="1" max="100" value="100" dir="ltr"></div>
            <div class="n rc-loss" id="rcS1g"></div>
          </div>
          <label class="u-check rc-buyonly"><input type="checkbox" id="rcTwo"> وقف خسارة على مرحلتين</label>
          <div class="rc-grid" id="rcStop2" hidden>
            <div><label for="rcS2">وقف 2 — السعر</label><input id="rcS2" type="number" step="any" dir="ltr"></div>
            <div><label for="rcS2p">نسبة البيع عنده %</label><input id="rcS2p" type="number" min="1" max="100" value="50" dir="ltr"></div>
            <div class="n rc-loss" id="rcS2g"></div>
          </div>
          <div class="rc-rr" id="rcRR"></div>
          <div class="rc-grid">
            <div class="wide"><label for="rcNote">ملاحظة المحلل (اختياري)</label><textarea id="rcNote" rows="2" maxlength="600" placeholder="مثال: الدخول على مراحل مع تأكيد الاختراق بحجم تداول"></textarea></div>
            <div><label for="rcAnalyst">اسم المحلل</label><input id="rcAnalyst" value="${E(analyst)}" placeholder="بيظهر في الرسالة"></div>
            <div><label>قنوات الإرسال</label><div class="rc-ch">
              <label class="u-check"><input type="checkbox" id="rcChApp" checked> 🔔 المنصة</label>
              <label class="u-check"><input type="checkbox" id="rcChEmail" checked> ✉️ الإيميل</label>
              ${meta.waOn ? '<label class="u-check"><input type="checkbox" id="rcChWa"> 🟢 واتساب</label>' : ''}</div></div>
          </div>
          <h3 class="rc-h">👁 معاينة الرسالة اللي هتوصل للمشترك</h3>
          <div id="rcPreview"></div>
          <div class="rc-row"><button type="button" class="rc-send" id="rcSend">📢 إرسال التوصية</button><span id="rcMsg" class="u-note"></span></div>
          <div id="rcProg" hidden></div>
        </div>
        <aside class="section-card rc-side" id="rcSide">
          <div class="rc-side-empty">اكتب كود السهم عشان تظهر بياناته والمستويات هنا.</div>
        </aside>
      </div>
      <div class="rc-loghead"><h2 class="u-m0">سجل التوصيات (<span id="recCount">${recs.length}</span>)</h2>${gAdminMarketBarHtml('recMarketF')}<button class="secondary small u-wa" id="clearNowBtn">🗑️ إلغاء كل النشطة الآن</button></div>
      <div id="recListWrap"></div>
    </div>`;
    wireAdminNavButtons();
    wireForm(__tok);
    const renderList = () => {
      const mf = gAdminMarket(), shown = mf ? recs.filter(r => (r.market || 'مصر') === mf) : recs;
      $('recCount').textContent = shown.length;
      $('recListWrap').innerHTML = shown.length ? shown.map(r => logCard(r, email)).join('') : '<div class="section-card u-note">لا توجد توصيات في السجل بعد.</div>';
    };
    const reload = async () => { const f = await getRecommendationsLog(); if (f && f.success) { recs = f.recommendations; renderList(); } };
    renderList(); gWireAdminMarket('recMarketF', renderList);
    window.__recLogTick = setInterval(renderList, 60000);
    $('recListWrap').addEventListener('click', async (e) => {
      const d = e.target.closest('[data-rc-del]'), u = e.target.closest('[data-rc-upd]');
      if (d) { if (!await gConfirm('إلغاء التوصية دي الآن؟ هتختفي عند كل العملاء.')) return; const r = await deleteRecommendation(d.dataset.rcDel); if (r.success) reload(); else toast(r.message || 'حصل خطأ', 'err'); }
      if (u) updateModal(recs.find(x => String(x.id) === u.dataset.rcUpd), reload);
    });
    $('clearNowBtn').onclick = async () => { if (!await gConfirm('إلغاء كل التوصيات النشطة الآن؟')) return; const r = await clearRecommendationsNow(); if (r.success) reload(); else toast(r.message || 'حصل خطأ', 'err'); };
    window.__rcReload = reload;
    if (META.queue > 0) pump();
  };

  function wireForm(tok){
    const ids = ['rcFrom', 'rcTo', 'rcT1', 'rcT2', 'rcT3', 'rcT1p', 'rcT2p', 'rcT3p', 'rcS1', 'rcS1p', 'rcS2', 'rcS2p', 'rcName', 'rcNote', 'rcAnalyst', 'rcSellPct', 'rcValid'];
    ids.forEach(id => $(id).addEventListener('input', paint));
    $('rcValid').addEventListener('change', paint);
    $('rcType').onclick = (e) => { const b = e.target.closest('button[data-t]'); if (!b) return; TYPE = b.dataset.t; $('rcType').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); setType(); };
    $('rcTwo').onchange = () => { $('rcStop2').hidden = !$('rcTwo').checked; if ($('rcTwo').checked && +$('rcS1p').value === 100) $('rcS1p').value = 50; if (!$('rcTwo').checked) $('rcS1p').value = 100; paint(); };
    let t = null;
    const look = () => { clearTimeout(t); t = setTimeout(() => loadLevels(tok), 450); };
    $('rcSym').addEventListener('input', () => { $('rcSym').value = $('rcSym').value.toUpperCase().replace(/[^A-Z0-9.\-]/g, ''); look(); });
    $('rcMkt').onchange = () => { if ($('rcSym').value) loadLevels(tok); };
    $('rcTf').onchange = () => { if ($('rcSym').value) loadLevels(tok); };
    $('rcSuggest').onclick = () => fillSuggest();
    $('rcSend').onclick = send;
    setType();
  }
  function setType(){
    const buy = TYPE === 'buy';
    $('rcEntryH').textContent = buy ? '💰 منطقة الشراء' : '💰 منطقة البيع';
    $('rcTgH').textContent = buy ? '🎯 نقاط جني الأرباح (بيع على مراحل)' : '📉 مستويات الهبوط المتوقعة';
    $('rcStH').textContent = buy ? '🛑 وقف الخسارة' : '⚠️ التوصية تعتبر فاشلة لو السعر عدّى لفوق';
    $('rcS1L').textContent = buy ? 'السعر' : 'سعر الفشل';
    $('rcSellPctW').hidden = buy;
    document.querySelectorAll('.rc-buyonly').forEach(x => { x.hidden = !buy; });
    document.querySelectorAll('.rc-pc').forEach(x => { x.hidden = !buy; }); $('rcPctTh').hidden = !buy;
    if (!buy) { $('rcTwo').checked = false; $('rcStop2').hidden = true; }
    $('rcSend').textContent = buy ? '📢 إرسال توصية الشراء' : '📢 إرسال توصية البيع';
    paint();
  }
  async function loadLevels(tok){
    const sym = $('rcSym').value.trim(), mkt = $('rcMkt').value, tf = $('rcTf').value, side = $('rcSide');
    if (sym.length < 2) { LV = null; side.innerHTML = '<div class="rc-side-empty">اكتب كود السهم عشان تظهر بياناته والمستويات هنا.</div>'; return; }
    side.innerHTML = '<div class="gs-skel" style="height:260px"></div>';
    const r = await apiGet(`/recs_api.php?action=levels&symbol=${encodeURIComponent(sym)}&market=${encodeURIComponent(mkt)}&tf=${tf}`).catch(() => null);
    if ((tok && screenStale(tok)) || $('rcSym').value.trim() !== sym) return;
    if (!r || !r.success) { LV = null; side.innerHTML = `<div class="error">${E((r && r.message) || 'تعذّر جلب بيانات السهم')}</div>`; $('rcSugNote').textContent = ''; paint(); return; }
    LV = r;
    if (!$('rcName').value.trim() || $('rcName').dataset.auto === '1') { $('rcName').value = r.name || r.nameEn || sym; $('rcName').dataset.auto = '1'; }
    $('rcName').oninput = () => { $('rcName').dataset.auto = '0'; paint(); };
    const l = r.levels, chip = (k, lab, cls) => l ? `<button type="button" class="rc-lv ${cls}" data-v="${l[k]}" title="اضغط عشان تحطه في الخانة اللي واقف فيها">${lab} <b class="n">${N(l[k])}</b></button>` : '';
    side.innerHTML = `<div class="rc-quote"><div><b class="rc-sym n">${E(r.symbol)}</b> <span>${E(r.name || r.nameEn)}</span></div>
        <div class="rc-px"><b class="n">${N(r.last)}</b> <small>${E(r.currency)}</small> ${r.chg != null ? `<span class="n ${r.chg >= 0 ? 'pos' : 'neg'}">${P(r.chg)}</span>` : ''}</div>
        <small class="u-muted">آخر سعر — متأخر حوالي 15 دقيقة</small></div>
      ${l ? `<h4>المستويات — ${E(r.tfLabel)} ${gTipI('محوري كلاسيكي: P = (أعلى + أقل + إغلاق) ÷ 3 للفترة المكتملة اللي فاتت. اضغط على أي مستوى عشان يتحط في الخانة اللي آخر مرة وقفت فيها')}</h4>
      <div class="rc-lvs">${chip('r3', 'مقاومة 3', 'r')}${chip('r2', 'مقاومة 2', 'r')}${chip('r1', 'مقاومة 1', 'r')}${chip('p', 'المحوري', 'p')}${chip('s1', 'دعم 1', 's')}${chip('s2', 'دعم 2', 's')}${chip('s3', 'دعم 3', 's')}</div>
      <div class="u-fs12 u-muted">أعلى الفترة <b class="n">${N(l.high)}</b> — أقل الفترة <b class="n">${N(l.low)}</b> — التذبذب اليومي (ATR) <b class="n">${N(r.atr)}</b></div>` : '<div class="u-muted u-fs12">مفيش تاريخ أسعار كفاية لحساب المستويات.</div>'}
      <div class="rc-tools"><button type="button" class="secondary small" id="rcBsQuick">🔮 تحليل بصيرة سريع</button><button type="button" class="secondary small" id="rcFind">🔍 دوّر على فرصة</button></div>
      <div id="rcBsBox"></div>`;
    $('rcSugNote').textContent = l ? 'بيحط منطقة دخول وأهداف ووقف مقترحين — وانت تعدّل براحتك' : '';
    side.querySelectorAll('.rc-lv').forEach(b => b.onclick = () => { const f = window.__rcLastFocus && $(window.__rcLastFocus) ? $(window.__rcLastFocus) : null; if (!f) return toast('اضغط على خانة السعر الأول وبعدين على المستوى', 'err'); f.value = b.dataset.v; paint(); });
    $('rcBsQuick').onclick = () => basiraQuick(r.symbol, r.market);
    $('rcFind').onclick = () => findOpp(r.market);
    paint();
  }
  document.addEventListener('focusin', (e) => { if (e.target && /^rc(From|To|T[123]|S[12])$/.test(e.target.id || '')) window.__rcLastFocus = e.target.id; });
  function fillSuggest(){
    if (!LV || !LV.suggest) return toast('اختار السهم والمدة الأول', 'err');
    const s = LV.suggest[TYPE];
    $('rcFrom').value = s.from; $('rcTo').value = s.to;
    s.targets.forEach(([v, p], i) => { $('rcT' + (i + 1)).value = v; if (p != null) $('rcT' + (i + 1) + 'p').value = p; });
    $('rcS1').value = s.stop; paint();
  }
  const val = (id) => { const x = $(id); return x && x.value !== '' ? +x.value : null; };
  function paint(){
    const buy = TYPE === 'buy', f = val('rcFrom'), t = val('rcTo'), mid = f && t ? (f + t) / 2 : (f || t);
    let sum = 0, gain = 0;
    [1, 2, 3].forEach(i => { const v = val('rcT' + i), p = val('rcT' + i + 'p') || 0; $('rcT' + i + 'g').textContent = v && mid ? P((v / mid - 1) * 100) : '—'; $('rcT' + i + 'g').className = 'n ' + (v && mid ? ((v > mid) === buy ? 'pos' : 'neg') : ''); if (v) { sum += p; gain += (v / mid - 1) * p; } });
    $('rcPctSum').textContent = sum.toFixed(0) + '%'; $('rcPctSum').className = Math.abs(sum - 100) < 0.01 ? 'pos' : 'neg';
    const s1 = val('rcS1'), s2 = $('rcTwo').checked ? val('rcS2') : null;
    $('rcS1g').textContent = s1 && mid ? (buy ? 'خسارة ' : 'تحرك ') + P((s1 / mid - 1) * 100) : ''; $('rcS2g').textContent = s2 && mid ? 'خسارة ' + P((s2 / mid - 1) * 100) : '';
    let rr = '';
    if (buy && mid && s1 && sum) { const risk = $('rcTwo').checked && s2 ? ((mid - s1) * (val('rcS1p') || 0) + (mid - s2) * (val('rcS2p') || 0)) / 100 : (mid - s1); const rew = gain / 100 * mid; rr = risk > 0 ? `العائد المتوقع ${P(gain)} مقابل مخاطرة ${P(-risk / mid * 100)} — نسبة العائد للمخاطرة <b class="n">1 : ${(rew / risk).toFixed(2)}</b>` : ''; }
    $('rcRR').innerHTML = rr;
    $('rcPreview').innerHTML = cardHtml(formObj(), { preview: true });
  }
  function formObj(){
    const buy = TYPE === 'buy';
    return { type: TYPE, symbol: $('rcSym').value.trim() || 'SYMBOL', stockName: $('rcName').value.trim() || 'اسم السهم', market: $('rcMkt').value, currency: (META.markets.find(m => m.name === $('rcMkt').value) || {}).ccy,
      timeframe: $('rcTf').value, buyFrom: val('rcFrom'), buyTo: val('rcTo'), sellPct: buy ? null : val('rcSellPct'),
      resistances: [1, 2, 3].map(i => ({ level: val('rcT' + i), pct: buy ? val('rcT' + i + 'p') : null })),
      stop1: val('rcS1'), stop1Pct: buy ? val('rcS1p') : null, stop2: buy && $('rcTwo').checked ? val('rcS2') : null, stop2Pct: buy && $('rcTwo').checked ? val('rcS2p') : null,
      note: $('rcNote').value.trim(), analyst: $('rcAnalyst').value.trim(), validityHours: +$('rcValid').value, createdAt: null, updates: [] };
  }
  async function send(){
    const o = formObj(), msg = $('rcMsg');
    if (!LV) return toast('اكتب كود سهم صحيح الأول', 'err');
    const ch = { chApp: $('rcChApp').checked ? '1' : '0', chEmail: $('rcChEmail').checked ? '1' : '0', chWa: $('rcChWa') && $('rcChWa').checked ? '1' : '0' };
    if (ch.chApp + ch.chEmail + ch.chWa === '000') return toast('اختار قناة إرسال واحدة على الأقل', 'err');
    if (!await gConfirm(`إرسال ${o.type === 'buy' ? 'توصية شراء' : 'توصية بيع'} ${o.symbol} لكل مشتركين بورصة ${o.market}؟`)) return;
    try { localStorage.setItem('gs_rec_analyst', o.analyst); } catch(e){}
    const body = Object.assign({ action: 'send', type: o.type, symbol: o.symbol, stockName: o.stockName, market: o.market, timeframe: o.timeframe, from: o.buyFrom ?? '', to: o.buyTo ?? '', validityHours: o.validityHours,
      sellPct: o.sellPct ?? '', stop1: o.stop1 ?? '', stop1pct: o.stop1Pct ?? '', stop2: o.stop2 ?? '', stop2pct: o.stop2Pct ?? '', note: o.note, analyst: o.analyst, last: LV.last ?? '',
      lv_p: LV.levels ? LV.levels.p : '', lv_s1: LV.levels ? LV.levels.s1 : '', lv_s2: LV.levels ? LV.levels.s2 : '', lv_s3: LV.levels ? LV.levels.s3 : '' }, ch);
    o.resistances.forEach((x, i) => { body['t' + (i + 1)] = x.level ?? ''; body['t' + (i + 1) + 'pct'] = x.pct ?? ''; });
    $('rcSend').disabled = true; msg.textContent = '⏳ جارٍ الإرسال…';
    const r = await apiPost('/recs_api.php', body).catch(() => null);
    $('rcSend').disabled = false;
    if (!r || !r.success) { msg.textContent = (r && r.message) || 'تعذّر الإرسال'; return toast(msg.textContent, 'err'); }
    msg.textContent = `✅ اتبعتت — ${r.recipients} مشترك (إشعار المنصة: ${r.app})${r.queued ? ` — ${r.queued} إيميل / واتساب في الطريق` : ''}`;
    toast('تم إرسال التوصية ✓');
    if (window.__rcReload) window.__rcReload();
    if (r.queued) pump();
  }
  // الإيميل والواتساب بيتبعتوا على دفعات (15 في الطلب) لحد ما الطابور يخلص
  let pumping = false;
  async function pump(){
    if (pumping) return; pumping = true; const box = $('rcProg'); let total = null;
    try {
      for (let k = 0; k < 400; k++) {
        const r = await apiPost('/recs_api.php', { action: 'pump' }).catch(() => null);
        if (!r || !r.success || !$('rcProg')) break;
        if (total === null) total = r.left + r.done;
        box.hidden = false; const pc = total ? Math.round((total - r.left) / total * 100) : 100;
        box.innerHTML = `<div class="rc-progbar"><i style="width:${pc}%"></i></div><small class="u-muted">إرسال الإيميل / الواتساب: ${total - r.left} من ${total}</small>`;
        if (!r.left) { box.innerHTML += ' <b class="pos">✓ خلص</b>'; break; }
      }
    } finally { pumping = false; }
  }
  function logCard(r, email){
    const st = { active: ['نشطة', 'pos'], cancelled: ['أُلغيت', 'neg'], expired: ['انتهت', 'u-muted'], closed: ['اتقفلت', 'u-muted'] }[r.status] || ['نشطة', 'pos'];
    const can = r.status === 'active' && (window.__isSuperAdmin || (r.createdBy && r.createdBy.toLowerCase() === String(email).toLowerCase()));
    return `<div class="section-card rc-log rc-${r.type || 'buy'}"><div class="u-row"><div><b>${r.type === 'sell' ? '📉 بيع' : '📈 شراء'} — ${E(r.stockName)} (${E(r.symbol)})</b> <span class="${st[1]} u-fs12">${st[0]}</span> <span class="g-mkt-tag">🌍 ${E(r.market || 'مصر')}</span></div>
      <span>${r.status === 'active' ? `<button class="small secondary u-wa" data-rc-upd="${E(r.id)}">➕ إرسال تحديث</button> ` : ''}${can ? `<button class="small danger u-wa" data-rc-del="${E(r.id)}">🗑️ إلغاء</button>` : ''}</span></div>
      <div class="u-fs12 u-muted">${r.type === 'sell' ? 'البيع' : 'الشراء'} ${N(r.buyFrom)} – ${N(r.buyTo)} — ${TFL[r.timeframe] || ''} — أُرسلت ${formatDateAr(r.createdAt)} بواسطة ${E(r.analyst || r.createdBy || '-')}${(r.updates || []).length ? ` — ${r.updates.length} تحديث` : ''}</div></div>`;
  }
  function updateModal(r, done){
    if (!r) return;
    const ov = document.createElement('div'); ov.className = 'rc-ov';
    ov.innerHTML = `<div class="rc-dlg" role="dialog" aria-label="إرسال تحديث"><h3>➕ تحديث على ${E(r.symbol)} — ${E(r.stockName)}</h3>
      <label>نوع التحديث</label><select id="rcUKind">${Object.entries(KIND).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
      <label>نص الرسالة</label><textarea id="rcUMsg" rows="3" maxlength="800" placeholder="مثال: الهدف الأول اتحقق عند ${N(r.resistances && r.resistances[0] && r.resistances[0].level)} — ارفع وقف الخسارة لسعر الدخول"></textarea>
      <div class="rc-ch"><label class="u-check"><input type="checkbox" id="rcUApp" checked> 🔔 المنصة</label><label class="u-check"><input type="checkbox" id="rcUEmail"> ✉️ الإيميل</label>${META.waOn ? '<label class="u-check"><input type="checkbox" id="rcUWa"> 🟢 واتساب</label>' : ''}</div>
      <p class="u-fs12 u-muted">«إغلاق التوصية» بيقفلها وبتختفي من التوصيات النشطة عند العملاء.</p>
      <div class="rc-row"><button type="button" id="rcUSend">إرسال</button><button type="button" class="secondary" id="rcUCancel">إلغاء</button></div></div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    $('rcUCancel').onclick = close;
    $('rcUSend').onclick = async () => {
      const m = $('rcUMsg').value.trim(); if (!m) return toast('اكتب نص التحديث', 'err');
      const x = await apiPost('/recs_api.php', { action: 'update', id: r.id, kind: $('rcUKind').value, message: m, chApp: $('rcUApp').checked ? '1' : '0', chEmail: $('rcUEmail').checked ? '1' : '0', chWa: $('rcUWa') && $('rcUWa').checked ? '1' : '0' }).catch(() => null);
      if (!x || !x.success) return toast((x && x.message) || 'تعذّر الإرسال', 'err');
      toast(`تم إرسال التحديث ✓ (${x.recipients} مشترك)`); close(); if (done) done(); if (x.queued) pump();
    };
  }
  async function basiraQuick(sym, mkt){
    const box = $('rcBsBox'); box.innerHTML = '<div class="gs-skel" style="height:120px"></div>';
    const r = await apiGet('/basira_api.php?action=analyze&symbol=' + encodeURIComponent(sym) + '&market=' + encodeURIComponent(mkt)).catch(() => null);
    if (!r || !r.success) { box.innerHTML = `<div class="u-fs12 neg">${E((r && r.message) || 'بصيرة مش متاحة دلوقتي')}</div>`; return; }
    const R = r.report, a = R.ai || {}, sc = R.score;
    box.innerHTML = `<div class="rc-bs"><div><b>🔮 بصيرة:</b> الدرجة <b class="n ${sc >= 58 ? 'pos' : sc <= 42 ? 'neg' : ''}">${sc}/100</b></div>
      <div class="rc-hz">${(R.horizons || []).map(h => `<span>${E(h.label || h.key)}: <b class="n">${h.up}%</b></span>`).join('')}</div>
      <p class="u-fs12">${E(String(a.opinion || '').slice(0, 320))}${String(a.opinion || '').length > 320 ? '…' : ''}</p>
      <button type="button" class="gs-link" id="rcBsFull">التحليل الكامل في بصيرة ↗</button></div>`;
    $('rcBsFull').onclick = () => { if (typeof renderBasira === 'function') renderBasira(sym, mkt); };
  }
  async function findOpp(mkt){
    const ov = document.createElement('div'); ov.className = 'rc-ov';
    ov.innerHTML = `<div class="rc-dlg rc-find" role="dialog" aria-label="دوّر على فرصة"><h3>🔍 فرص ${E(mkt)} — مترتبة حسب درجة بصيرة واحتمال الصعود</h3><div id="rcFindBody"><div class="gs-skel" style="height:220px"></div></div>
      <div class="rc-row"><button type="button" class="secondary" id="rcFindClose">إغلاق</button></div></div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove(); ov.addEventListener('click', (e) => { if (e.target === ov) close(); }); $('rcFindClose').onclick = close;
    const r = await apiGet('/basira_api.php?action=scan&market=' + encodeURIComponent(mkt) + '&offset=0&limit=15').catch(() => null);
    const body = $('rcFindBody'); if (!body) return;
    if (!r || !r.success) { body.innerHTML = `<div class="neg">${E((r && r.message) || 'المسح مش متاح دلوقتي')}</div>`; return; }
    const it = (r.items || []).slice().sort((x, y) => ((y.score || 0) - (x.score || 0)));
    body.innerHTML = it.length ? `<table class="std-table g-no-enh rc-ftab"><thead><tr><th>السهم</th><th>القطاع</th><th>آخر سعر</th><th>بصيرة</th><th></th></tr></thead><tbody>${it.map(x => `<tr><td><b class="n">${E(x.symbol)}</b> <small>${E(x.ar || x.name)}</small></td><td>${E(x.sector)}</td><td class="n">${N(x.last)}</td><td class="n">${x.score != null ? x.score : '—'}</td><td><button type="button" class="small u-wa" data-pick="${E(x.symbol)}">اختيار</button></td></tr>`).join('')}</tbody></table>` : '<div class="u-muted">مفيش نتايج.</div>';
    body.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { $('rcSym').value = b.dataset.pick; $('rcName').value = ''; $('rcName').dataset.auto = '1'; close(); loadLevels(); });
  }

  /* ============ كارت التوصية (المعاينة + شاشة العميل) ============ */
  function cardHtml(r, opt){
    opt = opt || {};
    const buy = r.type !== 'sell', ccy = r.currency || '';
    const tg = (r.resistances || []).filter(x => x && x.level != null);
    const lastIdx = tg.length - 1;
    return `<div class="rc-card rc-${buy ? 'buy' : 'sell'}">
      <div class="rc-card-h"><span class="rc-badge">${buy ? '📈 توصية شراء' : '📉 توصية بيع'}</span><b class="n rc-sym">${E(r.symbol)}</b><span class="rc-name">${E(r.stockName)}</span></div>
      <div class="rc-meta">${TFL[r.timeframe] ? 'المدة: ' + TFL[r.timeframe] + ' — ' : ''}${E(r.market || 'مصر')}${ccy ? ' (' + E(ccy) + ')' : ''}</div>
      <div class="rc-line rc-entry"><span>${buy ? '💰 الشراء من' : '💰 البيع من'}</span><b class="n">${N(r.buyFrom)}</b><span>إلى</span><b class="n">${N(r.buyTo)}</b>${!buy && r.sellPct ? `<span>— بيع <b class="n">${N(r.sellPct, 0)}%</b> من الكمية</span>` : ''}</div>
      ${tg.length ? (buy ? `<div class="rc-sub">🎯 جني الأرباح</div>${tg.map((x, i) => `<div class="rc-line rc-tp"><span>نقطة بيع ${i + 1}</span><b class="n">${N(x.level)}</b>${x.pct != null ? `<span class="rc-pct">بيع <b class="n">${N(x.pct, 0)}%</b>${i === lastIdx && tg.length > 1 ? ' (باقي الكمية)' : ''}</span>` : ''}</div>`).join('')}`
        : `<div class="rc-line"><span>📉 مستويات الهبوط المتوقعة</span><b class="n">${tg.map(x => N(x.level)).join(' ← ')}</b></div>`) : ''}
      ${r.stop1 ? (buy ? `<div class="rc-line rc-sl"><span>🛑 وقف الخسارة${r.stop2 ? ' 1' : ''}</span><b class="n">${N(r.stop1)}</b><span class="rc-pct">بيع <b class="n">${N(r.stop1Pct == null ? 100 : r.stop1Pct, 0)}%</b></span></div>${r.stop2 ? `<div class="rc-line rc-sl"><span>🛑 وقف الخسارة 2</span><b class="n">${N(r.stop2)}</b><span class="rc-pct">بيع <b class="n">${N(r.stop2Pct, 0)}%</b></span></div>` : ''}`
        : `<div class="rc-line rc-sl"><span>⚠️ التوصية تعتبر فاشلة لو السعر عدّى لفوق</span><b class="n">${N(r.stop1)}</b></div>`) : ''}
      ${r.note ? `<div class="rc-note">📝 ${E(r.note)}</div>` : ''}
      <div class="rc-foot">المحلل: ${E(r.analyst || 'فريق GRIFFINE')}${r.createdAt ? ' — ' + formatDateAr(r.createdAt) : ''} — تحليل تعليمي وليس أمر شراء أو بيع</div>
      ${(r.updates || []).length ? `<div class="rc-upds">${r.updates.map(u => `<div class="rc-upd"><b>${E(KIND[u.kind] || '📝 تحديث')}</b> <small class="u-muted">${formatDateAr(u.at)}</small><div>${E(u.message)}</div></div>`).join('')}</div>` : ''}
      ${opt.actions || ''}</div>`;
  }

  /* ============ 02. شاشة العميل ============ */
  window.renderRecommendationsCustomerPage = async function(){
    const __tok = screenToken();
    pushNav(() => renderRecommendationsCustomerPage());
    const email = await getSession();
    if (!email) return renderLogin();
    if (!(await ensureAccess())) return;
    if (window.__recPoll) { clearInterval(window.__recPoll); window.__recPoll = null; }
    if (screenStale(__tok)) return;
    app.innerHTML = `<div class="container">${logoHeader()}
      <div class="topbar"><div>${pageTitle('recommendations_customer', '📢 التوصيات')}</div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button></div>
      <div class="info">توصيات الشراء والبيع من فريق المحللين — وتحت كل توصية التحديثات أول بأول. تحليل تعليمي والقرار قرارك.</div>
      <div id="recCustomerList"><div class="gs-skel" style="height:200px"></div></div></div>`;
    $('homeBtn').onclick = () => { if (window.__recPoll) { clearInterval(window.__recPoll); window.__recPoll = null; } renderHome(); };
    const load = async () => {
      const res = await getRecommendations(), el = $('recCustomerList'); if (!el) return;
      const recs = (res && res.success) ? res.recommendations : [];
      el.innerHTML = recs.length ? recs.map(r => cardHtml(r, { actions: r.type !== 'sell' ? `<button class="small u-wa u-mt8" data-plan="${E(r.symbol)}" data-px="${E(r.buyFrom)}" data-mkt="${E(r.market || 'مصر')}">حوّل لخطة</button>` : '' })).join('')
        : `<div class="section-card u-note">${res && res.requiresSubscription ? 'التوصيات متاحة للمشتركين.' : 'لا توجد توصيات حاليًا.'}</div>`;
      el.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => { if (window.__recPoll) { clearInterval(window.__recPoll); window.__recPoll = null; } window.__prefillPlan = { symbol: b.dataset.plan, price: +b.dataset.px, market: b.dataset.mkt }; renderNewPlanForm(); });
    };
    await load();
    window.__recPoll = setInterval(load, 30000);
  };
  window.gRecCardHtml = cardHtml;
})();
