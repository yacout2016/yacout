/* =====================================================================
   GRIFFINE — recs.js (الإصدار 128 / 129) — «توصية شراء / بيع»
   01. شاشة المحلل (الإصدار 129): يمين = السهم والسعر المحوري والرسم البياني بالمؤشرات — شمال = رسالة التوصية جنبه على طول
       + «تحليل السهم» و«مسح السوق» جنب الكود + «انقل المستويات للتوصية» (منطقة دخول ≤ 1% من المحوري / الأهداف من المقاومات / الوقف من الدعوم)
       + وقف الخسارة مرحلة واحدة أو 3 مراحل + الصلاحية من ساعة لـ 12 شهر («طويلة المدى» من أسبوعين)
       + المرفقات: الرسم / رأي بصيرة AI / المؤشرات / فيبوناتشي + اسم المحلل مقفول إلا بصلاحية
       + القنوات + الإرسال على دفعات + رسائل المتابعة
   02. شاشة العميل: كارت لكل توصية (الرسم + فيبوناتشي + بصيرة + المؤشرات + «انتهت» لما الصلاحية تخلص) + التحديثات تحتها
   03. لوحة التحكم: نصوص وأزرار وافتراضيات الشاشة (renderAdminRecsCfg)
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
  const KIND_ALL = Object.assign({ expired: '⏰ انتهت صلاحية التوصية' }, KIND);
  // تقريب السعر حسب حجمه (أسهم بقروش وأسهم بمئات)
  const rd = (v) => { if (v == null || isNaN(v)) return null; const a = Math.abs(v), d = a < 1 ? 4 : a < 10 ? 3 : 2; return +(+v).toFixed(d); };
  let META = null, LV = null, TYPE = 'buy', CFG = {}, IND = [], AI = null, LAST_SVG = { main: '', fib: '' };

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
    META = meta; LV = null; TYPE = 'buy'; AI = null; CFG = meta.cfg || {};
    IND = String(CFG.ind_default || 'sma20,sma50,rsi').split(',').filter(k => meta.ind && meta.ind[k]);
    let recs = (logRes && logRes.success) ? logRes.recommendations : [];
    let analyst = meta.analystName || ''; if (meta.canRename) { try { analyst = localStorage.getItem('gs_rec_analyst') || analyst; } catch(e){} }
    const mk0 = gAdminMarket() && meta.markets.some(m => m.name === gAdminMarket()) ? gAdminMarket() : meta.markets[0].name;
    const C = CFG, chk = (id, on, label) => `<label class="u-check"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}> ${E(label)}</label>`;
    app.innerHTML = `<div class="container wide rc-screen">${logoHeader()}<span class="gs-page-title" hidden>${E(C.t_title)}</span>
      <div class="topbar"><div>${pageTitle('recommendations_admin', C.t_title)}</div>${adminNavButtonsHtml()}</div>
      ${hasPermission('edit_site_design') ? '<div class="rc-row rc-cfglink"><button type="button" class="gs-link" id="rcCfgLink">⚙️ نصوص وإعدادات الشاشة دي</button></div>' : ''}
      <div class="rc-work">
        <section class="section-card rc-stock" id="rcStockPane">
          <h3 class="rc-ph">${E(C.t_stock_panel)}</h3>
          <div class="rc-grid">
            <div><label for="rcMkt">البورصة</label><select id="rcMkt" data-g-mkt="skip">${meta.markets.map(m => `<option value="${E(m.name)}" ${m.name === mk0 ? 'selected' : ''}>${E(m.name)} — ${E(m.ccy)}</option>`).join('')}</select></div>
            <div><label for="rcSym">كود السهم</label><input id="rcSym" dir="ltr" autocomplete="off" placeholder="مثال: COMI" maxlength="20"></div>
            <div><label for="rcTf">المدة ${gTipI('المستويات (المحوري والدعم والمقاومة) بتتحسب من أعلى وأقل وإغلاق الفترة دي')}</label><select id="rcTf">${meta.tf.map(t => `<option value="${t.k}">${E(t.l)}</option>`).join('')}</select></div>
            <div class="wide rc-symtools"><button type="button" class="secondary small" id="rcBtnAnalyze">${E(C.t_btn_analyze)}</button><button type="button" class="small rc-scanbtn" id="rcBtnScan">${E(C.t_btn_scan)}</button></div>
            <div class="wide"><label for="rcName">اسم السهم ${gTipI('بيتملى تلقائي من الكود — وتقدر تعدّله')}</label><input id="rcName" placeholder="بيظهر تلقائي بعد كتابة الكود"></div>
          </div>
          <div id="rcSide"><div class="rc-side-empty">اكتب كود السهم عشان تظهر بياناته والمستويات هنا.</div></div>
          <div class="rc-row rc-transfer"><button type="button" class="rc-trbtn" id="rcSuggest">${E(C.t_btn_transfer)}</button><span class="u-muted u-fs12" id="rcSugNote">اختار السهم والمدة الأول</span></div>
          <h3 class="rc-h">${E(C.t_chart)}</h3>
          <div class="rc-indbar"><select id="rcIndAdd" aria-label="أضف مؤشر"></select><div class="rc-indchips" id="rcIndChips"></div></div>
          <div id="rcChart" class="rc-chart"><div class="rc-side-empty">الرسم بيظهر بعد اختيار السهم.</div></div>
          <div id="rcCross" class="rc-cross"></div>
          <div id="rcFibWrap" hidden><h4 class="rc-fibh">📐 فيبوناتشي — الأهداف ووقف الخسارة</h4><div id="rcFib" class="rc-chart"></div></div>
          <div id="rcBsBox"></div>
        </section>
        <section class="section-card rc-form">
          <h3 class="rc-ph">${E(C.t_msg_panel)}</h3>
          <div class="rc-type" id="rcType"><button type="button" data-t="buy" class="on">${E(C.t_buy_tab)}</button><button type="button" data-t="sell">${E(C.t_sell_tab)}</button></div>
          <div class="rc-grid">
            <div class="wide"><label for="rcValid">صلاحية التوصية ${gTipI('بعد المدة دي التوصية بتتقفل تلقائي ويوصل للمشتركين إشعار إنها انتهت')}</label>
              <div class="rc-valrow"><select id="rcValid">${meta.valid.map(v => `<option value="${v.h}" data-long="${v.long ? 1 : 0}" ${v.h === 24 ? 'selected' : ''}>${E(v.l)}</option>`).join('')}</select><span class="rc-longtag rc-off" id="rcLong" aria-live="polite">${E(C.t_long_term)} ${gTipI('بتتفعل تلقائي من أول صلاحية ' + ((meta.valid.find(v => v.long) || {}).l || 'أسبوعين') + ' وطالع — وبتظهر للمشترك على التوصية')}</span></div></div>
          </div>
          <h3 class="rc-h" id="rcEntryH">${E(C.t_entry_buy)}</h3>
          <div class="rc-grid">
            <div><label for="rcFrom">من</label><input id="rcFrom" type="number" step="any" dir="ltr"></div>
            <div><label for="rcTo">إلى</label><input id="rcTo" type="number" step="any" dir="ltr"></div>
            <div id="rcSellPctW" hidden><label for="rcSellPct">نسبة البيع من الكمية %</label><input id="rcSellPct" type="number" min="1" max="100" value="100" dir="ltr"></div>
            <div class="wide u-fs12 u-muted" id="rcBandNote"></div>
          </div>
          <h3 class="rc-h" id="rcTgH">${E(C.t_targets_buy)}</h3>
          <table class="rc-tg g-no-enh"><thead><tr><th>#</th><th>السعر</th><th id="rcPctTh">نسبة البيع %</th><th>من الدخول</th></tr></thead><tbody>
            ${[1, 2, 3].map(i => `<tr><td>${i}</td><td><input id="rcT${i}" type="number" step="any" dir="ltr"></td><td class="rc-pc"><input id="rcT${i}p" type="number" min="0" max="100" step="any" dir="ltr" value="${C['tp' + i]}"></td><td class="n" id="rcT${i}g">—</td></tr>`).join('')}
          </tbody><tfoot><tr><td></td><td></td><td class="rc-pc"><b id="rcPctSum">100%</b></td><td></td></tr></tfoot></table>
          <h3 class="rc-h" id="rcStH">${E(C.t_stop_buy)}</h3>
          <div class="rc-stopmode rc-buyonly" id="rcStopMode">
            <label class="u-check"><input type="radio" name="rcStopMode" id="rcStop1Mode" value="1" checked> ${E(C.t_stop_one)}</label>
            <label class="u-check"><input type="radio" name="rcStopMode" id="rcStop3Mode" value="3"> ${E(C.t_stop_three)}</label>
          </div>
          <div class="rc-grid">
            <div><label for="rcS1" id="rcS1L">السعر</label><input id="rcS1" type="number" step="any" dir="ltr"></div>
            <div class="rc-buyonly"><label for="rcS1p">نسبة البيع عنده %</label><input id="rcS1p" type="number" min="1" max="100" value="100" dir="ltr"></div>
            <div class="n rc-loss" id="rcS1g"></div>
          </div>
          <div id="rcStopMore" hidden>
            ${[2, 3].map(i => `<div class="rc-grid"><div><label for="rcS${i}">مرحلة ${i} — السعر</label><input id="rcS${i}" type="number" step="any" dir="ltr"></div>
              <div><label for="rcS${i}p">نسبة البيع عنده %</label><input id="rcS${i}p" type="number" min="1" max="100" value="${C['st' + i]}" dir="ltr"></div><div class="n rc-loss" id="rcS${i}g"></div></div>`).join('')}
          </div>
          <div class="rc-rr" id="rcRR"></div>
          <div class="rc-grid">
            <div class="wide"><label for="rcNote">ملاحظة المحلل (اختياري)</label><textarea id="rcNote" rows="2" maxlength="600" placeholder="مثال: الدخول على مراحل مع تأكيد الاختراق بحجم تداول"></textarea></div>
            <div class="wide"><label for="rcAnalyst">اسم ${E(C.t_analyst)} اللي هيظهر للمتداول ${meta.canRename ? '' : gTipI('الاسم بينزل من حسابك المسجّل. تغييره محتاج صلاحية «تغيير اسم المحلل» من الأدمن')}</label>
              <input id="rcAnalyst" value="${E(analyst)}" placeholder="${E(C.t_team)}" ${meta.canRename ? '' : 'readonly class="rc-locked"'}>${meta.canRename ? '' : '<small class="u-muted">🔒 مقفول — بيتبعت باسمك المسجّل في الموقع</small>'}</div>
          </div>
          <h3 class="rc-h">${E(C.t_attach)}</h3>
          <div class="rc-ch rc-att">${chk('rcAttChart', C.att_chart, C.t_att_chart)}${chk('rcAttAi', C.att_ai, C.t_att_ai)}${chk('rcAttInd', C.att_ind, C.t_att_ind)}${chk('rcAttFib', C.att_fib, C.t_att_fib)}</div>
          <h3 class="rc-h">${E(C.t_channels)}</h3>
          <div class="rc-ch">
            <label class="u-check"><input type="checkbox" id="rcChApp" checked> 🔔 المنصة</label>
            <label class="u-check"><input type="checkbox" id="rcChEmail" checked> ✉️ الإيميل</label>
            ${meta.waOn ? '<label class="u-check"><input type="checkbox" id="rcChWa"> 🟢 واتساب (رسالة بسيطة)</label>' : ''}</div>
          <h3 class="rc-h">${E(C.t_preview)}</h3>
          <div id="rcPreview"></div>
          ${meta.approvalOn && !meta.canApprove ? `<div class="rc-pendnote">⏳ ${E(C.t_pending_note)}</div>` : ''}
          <div class="rc-row"><button type="button" class="secondary rc-pvbtn" id="rcPreviewBtn">${E(C.t_btn_preview)}</button><button type="button" class="secondary" id="rcDraft">${E(C.t_btn_draft)}</button>
            <button type="button" class="rc-send" id="rcSend">${E(C.t_send_buy)}</button><span id="rcMsg" class="u-note"></span></div>
          <div id="rcProg" hidden></div>
        </section>
      </div>
      <div class="rc-loghead"><h2 class="u-m0">سجل التوصيات (<span id="recCount">${recs.length}</span>)</h2><span class="rc-pendbadge" id="recPendBadge" hidden></span>${gAdminMarketBarHtml('recMarketF')}<button class="secondary small u-wa" id="clearNowBtn">🗑️ إلغاء كل النشطة الآن</button></div>
      <div id="recListWrap"></div>
    </div>`;
    wireAdminNavButtons();
    if ($('rcCfgLink')) $('rcCfgLink').onclick = () => renderAdminRecsCfg();
    wireForm(__tok);
    const renderList = () => {
      window.__rcActiveSyms = recs.filter(r => r.status === 'active').map(r => r.symbol);
      const mf = gAdminMarket(), shown = mf ? recs.filter(r => (r.market || 'مصر') === mf) : recs;
      $('recCount').textContent = shown.length;
      const ord = { pending: 0, draft: 1, rejected: 2 }, sorted = shown.slice().sort((a, b) => (ord[a.status] ?? 3) - (ord[b.status] ?? 3));
      const np = shown.filter(r => r.status === 'pending').length, pb = $('recPendBadge'); if (pb) { pb.hidden = !np; pb.textContent = `⏳ ${np} بانتظار الموافقة`; }
      $('recListWrap').innerHTML = sorted.length ? sorted.map(r => logCard(r, email)).join('') : '<div class="section-card u-note">لا توجد توصيات في السجل بعد.</div>';
    };
    const reload = async () => { const f = await getRecommendationsLog(); if (f && f.success) { recs = f.recommendations; renderList(); } };
    renderList(); gWireAdminMarket('recMarketF', renderList);
    window.__recLogTick = setInterval(renderList, 60000);
    $('recListWrap').addEventListener('click', async (e) => {
      const d = e.target.closest('[data-rc-del]'), u = e.target.closest('[data-rc-upd]');
      // الإصدار 131: معاينة / إرسال المسودة أو الموافقة / رفض / حذف للسلة
      const pv = e.target.closest('[data-rc-pv]'), pub = e.target.closest('[data-rc-pub]'), rej = e.target.closest('[data-rc-rej]'), tr = e.target.closest('[data-rc-trash]');
      const act = async (body, ok) => { const x = await apiPost('/recs_api.php', body).catch(() => null); if (!x || !x.success) return toast((x && x.message) || 'حصل خطأ', 'err'); toast(ok(x)); reload(); if (x.queued) pump(); };
      if (pv) previewSaved(pv.dataset.rcPv);
      if (pub) { const r0 = recs.find(x => String(x.id) === pub.dataset.rcPub); if (!await gConfirm(r0 && r0.status === 'pending' ? `الموافقة على توصية ${r0.symbol} وإرسالها لكل المشتركين؟` : 'إرسال المسودة دي؟')) return;
        act({ action: 'publish', id: pub.dataset.rcPub }, (x) => x.status === 'pending' ? 'اتبعتت للمراجعة ✓' : `اتبعتت ✓ (${x.recipients} مشترك)`); }
      if (rej) { const why = await gPrompt('سبب الرفض (هيوصل للمحلل):', '', { ok: '❌ رفض' }); if (why === null || why === undefined) return; act({ action: 'reject', id: rej.dataset.rcRej, reason: why }, () => 'اترفضت التوصية واتبلّغ المحلل'); }
      if (tr) { if (!await gConfirm('حذف التوصية دي؟ هتتنقل لسلة المحذوفات وتقدر ترجّعها أو تمسحها نهائي من هناك.', { ok: '🗑 نقل للسلة', danger: true })) return; act({ action: 'trash', id: tr.dataset.rcTrash }, () => 'اتنقلت لسلة المحذوفات'); }
      if (d) { if (!await gConfirm('إلغاء التوصية دي الآن؟ هتختفي عند كل العملاء.')) return; const r = await deleteRecommendation(d.dataset.rcDel); if (r.success) reload(); else toast(r.message || 'حصل خطأ', 'err'); }
      if (u) updateModal(recs.find(x => String(x.id) === u.dataset.rcUpd), reload);
    });
    $('clearNowBtn').onclick = async () => { if (!await gConfirm('إلغاء كل التوصيات النشطة الآن؟')) return; const r = await clearRecommendationsNow(); if (r.success) reload(); else toast(r.message || 'حصل خطأ', 'err'); };
    window.__rcReload = reload;
    if (META.queue > 0) pump();
  };

  function wireForm(tok){
    const ids = ['rcFrom', 'rcTo', 'rcT1', 'rcT2', 'rcT3', 'rcT1p', 'rcT2p', 'rcT3p', 'rcS1', 'rcS1p', 'rcS2', 'rcS2p', 'rcS3', 'rcS3p', 'rcName', 'rcNote', 'rcAnalyst', 'rcSellPct'];
    ids.forEach(id => $(id).addEventListener('input', paint));
    ['rcValid', 'rcAttChart', 'rcAttAi', 'rcAttInd', 'rcAttFib'].forEach(id => $(id).addEventListener('change', paint));
    $('rcType').onclick = (e) => { const b = e.target.closest('button[data-t]'); if (!b) return; TYPE = b.dataset.t; $('rcType').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); setType(); };
    document.querySelectorAll('input[name="rcStopMode"]').forEach(x => x.onchange = () => setStopMode());
    let t = null;
    const look = () => { clearTimeout(t); t = setTimeout(() => loadLevels(tok), 450); };
    $('rcSym').addEventListener('input', () => { $('rcSym').value = $('rcSym').value.toUpperCase().replace(/[^A-Z0-9.\-]/g, ''); look(); });
    $('rcMkt').onchange = () => { if ($('rcSym').value) loadLevels(tok); };
    $('rcTf').onchange = () => { if ($('rcSym').value) loadLevels(tok); };
    $('rcSuggest').onclick = () => fillSuggest();
    $('rcBtnAnalyze').onclick = () => { if (!LV) return toast('اكتب كود السهم الأول', 'err'); basiraQuick(LV.symbol, LV.market, true); };
    $('rcBtnScan').onclick = () => findOpp($('rcMkt').value);
    $('rcIndAdd').onchange = () => { const k = $('rcIndAdd').value; if (k && !IND.includes(k)) IND.push(k); paintInd(); paint(); };
    $('rcIndChips').onclick = (e) => { const b = e.target.closest('[data-ind]'); if (!b) return; IND = IND.filter(k => k !== b.dataset.ind); paintInd(); paint(); };
    $('rcSend').onclick = () => send('send');
    $('rcDraft').onclick = () => send('draft');
    $('rcPreviewBtn').onclick = previewForm;
    paintInd(); setType();
  }
  function paintInd(){
    const all = META.ind || {};
    $('rcIndAdd').innerHTML = `<option value="">➕ أضف مؤشر للرسم…</option>` + Object.keys(all).filter(k => !IND.includes(k)).map(k => `<option value="${k}">${E(all[k])}</option>`).join('');
    $('rcIndChips').innerHTML = IND.map(k => `<button type="button" class="rc-indchip" data-ind="${k}" title="شيل المؤشر">${E(all[k])} ✕</button>`).join('') || '<span class="u-muted u-fs12">مفيش مؤشرات — اختار من القائمة</span>';
  }
  function setType(){
    const buy = TYPE === 'buy', C = CFG;
    $('rcEntryH').textContent = buy ? C.t_entry_buy : C.t_entry_sell;
    $('rcTgH').textContent = buy ? C.t_targets_buy : C.t_targets_sell;
    $('rcStH').textContent = buy ? C.t_stop_buy : C.t_stop_sell;
    $('rcS1L').textContent = buy ? 'السعر' : 'سعر الفشل';
    $('rcSellPctW').hidden = buy;
    document.querySelectorAll('.rc-buyonly').forEach(x => { x.hidden = !buy; });
    document.querySelectorAll('.rc-pc').forEach(x => { x.hidden = !buy; }); $('rcPctTh').hidden = !buy;
    if (!buy) { $('rcStop1Mode').checked = true; }
    setStopMode(true);
    $('rcSend').textContent = META.approvalOn && !META.canApprove ? C.t_send_review : (buy ? C.t_send_buy : C.t_send_sell);
    paint();
  }
  // وقف الخسارة: مرحلة واحدة (كسر أول دعم — 100%) أو 3 مراحل (S1 / S2 / S3 بنسب)
  function setStopMode(silent){
    const three = TYPE === 'buy' && $('rcStop3Mode').checked;
    $('rcStopMore').hidden = !three;
    if (three) { if (+$('rcS1p').value === 100) $('rcS1p').value = CFG.st1; const l = LV && LV.levels; if (l) { if (!$('rcS2').value) $('rcS2').value = rd(l.s2); if (!$('rcS3').value) $('rcS3').value = rd(l.s3); } }
    else $('rcS1p').value = 100;
    if (!silent) paint();
  }
  async function loadLevels(tok){
    const sym = $('rcSym').value.trim(), mkt = $('rcMkt').value, tf = $('rcTf').value, side = $('rcSide');
    if (sym.length < 2) { LV = null; side.innerHTML = '<div class="rc-side-empty">اكتب كود السهم عشان تظهر بياناته والمستويات هنا.</div>'; paint(); return; }
    side.innerHTML = '<div class="gs-skel" style="height:200px"></div>';
    const r = await apiGet(`/recs_api.php?action=levels&symbol=${encodeURIComponent(sym)}&market=${encodeURIComponent(mkt)}&tf=${tf}`).catch(() => null);
    if ((tok && screenStale(tok)) || $('rcSym').value.trim() !== sym) return;
    if (!r || !r.success) { LV = null; side.innerHTML = `<div class="error">${E((r && r.message) || 'تعذّر جلب بيانات السهم')}</div>`; $('rcSugNote').textContent = ''; paint(); return; }
    const sameSym = AI && AI.sym === r.symbol && AI.mkt === r.market;
    LV = r;
    if (!$('rcName').value.trim() || $('rcName').dataset.auto === '1') { $('rcName').value = r.name || r.nameEn || sym; $('rcName').dataset.auto = '1'; }
    $('rcName').oninput = () => { $('rcName').dataset.auto = '0'; paint(); };
    const l = r.levels, chip = (k, lab, cls) => l ? `<button type="button" class="rc-lv ${cls}" data-v="${rd(l[k])}" title="اضغط عشان تحطه في الخانة اللي واقف فيها">${lab} <b class="n">${N(rd(l[k]))}</b></button>` : '';
    side.innerHTML = `<div class="rc-quote"><div><b class="rc-sym n">${E(r.symbol)}</b> <span>${E(r.name || r.nameEn)}</span></div>
        <div class="rc-px"><b class="n">${N(r.last)}</b> <small>${E(r.currency)}</small> ${r.chg != null ? `<span class="n ${r.chg >= 0 ? 'pos' : 'neg'}">${P(r.chg)}</span>` : ''}</div>
        <small class="u-muted">آخر سعر — متأخر حوالي 15 دقيقة</small></div>
      ${l ? `<h4>المستويات — ${E(r.tfLabel)} ${gTipI('محوري كلاسيكي: P = (أعلى + أقل + إغلاق) ÷ 3 للفترة المكتملة اللي فاتت. اضغط على أي مستوى عشان يتحط في الخانة اللي آخر مرة وقفت فيها')}</h4>
      <div class="rc-lvs">${chip('s3', 'دعم 3', 's')}${chip('s2', 'دعم 2', 's')}${chip('s1', 'دعم 1', 's')}${chip('p', 'المحوري', 'p')}${chip('r1', 'مقاومة 1', 'r')}${chip('r2', 'مقاومة 2', 'r')}${chip('r3', 'مقاومة 3', 'r')}</div>
      <div class="u-fs12 u-muted">أعلى الفترة <b class="n">${N(l.high)}</b> — أقل الفترة <b class="n">${N(l.low)}</b> — التذبذب اليومي (ATR) <b class="n">${N(r.atr)}</b></div>` : '<div class="u-muted u-fs12">مفيش تاريخ أسعار كفاية لحساب المستويات.</div>'}`;
    $('rcSugNote').textContent = l ? CFG.t_transfer_hint : '';
    side.querySelectorAll('.rc-lv').forEach(b => b.onclick = () => { const f = window.__rcLastFocus && $(window.__rcLastFocus) ? $(window.__rcLastFocus) : null; if (!f) return toast('اضغط على خانة السعر الأول وبعدين على المستوى', 'err'); f.value = b.dataset.v; paint(); });
    paint();
    if (!sameSym) basiraQuick(r.symbol, r.market, false);   // رأي بصيرة AI بيتجاب تلقائي مع اختيار السهم (ومرفق افتراضيًا)
  }
  document.addEventListener('focusin', (e) => { if (e.target && /^rc(From|To|T[123]|S[123])$/.test(e.target.id || '')) window.__rcLastFocus = e.target.id; });
  // «انقل المستويات للتوصية»: منطقة الدخول من المحوري بفرق ≤ نسبة النطاق (1%) + الأهداف = المقاومات + الوقف = الدعوم
  function fillSuggest(){
    if (!LV || !LV.levels) return toast('اختار السهم والمدة الأول', 'err');
    const l = LV.levels, band = (+CFG.entry_band || 1) / 100, buy = TYPE === 'buy';
    // المستويات اللي بعد منطقة الدخول بس (لو مقاومة / دعم واقع على حد المنطقة بالظبط بيتخطاه للي بعده)
    const R = ['r1', 'r2', 'r3'].map(k => rd(l[k])), Sx = ['s1', 's2', 's3'].map(k => rd(l[k]));
    // لو المستويات اللي بعد المنطقة أقل من المطلوب ← بيكمّل بخطوة التذبذب (ATR) بعد آخر مستوى
    const step = Math.max(+LV.atr || 0, l.p * 0.005);
    const pick = (arr, ok, n, dir, seed) => { const a = arr.filter(ok); while (a.length < n) a.push(rd((a.length ? a[a.length - 1] : seed) + dir * step)); return a.slice(0, n); };
    if (buy) {
      const from = rd(l.p * (1 - band)), to = rd(l.p); $('rcFrom').value = from; $('rcTo').value = to;
      pick(R, v => v > to, 3, 1, to).forEach((v, i) => { $('rcT' + (i + 1)).value = v ?? ''; $('rcT' + (i + 1) + 'p').value = CFG['tp' + (i + 1)]; });
      const st = pick(Sx, v => v < from, 3, -1, from); $('rcS1').value = st[0] ?? '';
      if ($('rcStop3Mode').checked) { $('rcS2').value = st[1] ?? ''; $('rcS3').value = st[2] ?? ''; [1, 2, 3].forEach(i => { $('rcS' + i + 'p').value = CFG['st' + i]; }); }
      else $('rcS1p').value = 100;
    } else {
      const from = rd(l.p), to = rd(l.p * (1 + band)); $('rcFrom').value = from; $('rcTo').value = to;
      pick(Sx, v => v < from, 3, -1, from).forEach((v, i) => { $('rcT' + (i + 1)).value = v ?? ''; });
      $('rcS1').value = pick(R, v => v > to, 1, 1, to)[0] ?? '';
    }
    paint(); toast('اتنقلت المستويات — عدّل أي خانة براحتك');
  }
  const val = (id) => { const x = $(id); return x && x.value !== '' ? +x.value : null; };
  function stopsCount(){ return TYPE === 'buy' && $('rcStop3Mode').checked ? 3 : 1; }
  function paint(){
    const buy = TYPE === 'buy', f = val('rcFrom'), t = val('rcTo'), mid = f && t ? (f + t) / 2 : (f || t);
    let sum = 0, gain = 0;
    [1, 2, 3].forEach(i => { const v = val('rcT' + i), p = val('rcT' + i + 'p') || 0; $('rcT' + i + 'g').textContent = v && mid ? P((v / mid - 1) * 100) : '—'; $('rcT' + i + 'g').className = 'n ' + (v && mid ? ((v > mid) === buy ? 'pos' : 'neg') : ''); if (v) { sum += p; gain += (v / mid - 1) * p; } });
    $('rcPctSum').textContent = sum.toFixed(0) + '%'; $('rcPctSum').className = Math.abs(sum - 100) < 0.01 ? 'pos' : 'neg';
    const ns = stopsCount(); let risk = 0, spc = 0;
    [1, 2, 3].forEach(i => { const s = i <= ns ? val('rcS' + i) : null, g = $('rcS' + i + 'g'); if (g) g.textContent = s && mid ? (buy ? 'خسارة ' : 'تحرك ') + P((s / mid - 1) * 100) : '';
      if (buy && s && mid) { const p = ns === 1 ? 100 : (val('rcS' + i + 'p') || 0); risk += (mid - s) * p / 100; spc += p; } });
    let rr = '';
    if (buy && mid && risk > 0 && sum) { const rew = gain / 100 * mid; rr = `العائد المتوقع ${P(gain)} مقابل مخاطرة ${P(-risk / mid * 100)} — نسبة العائد للمخاطرة <b class="n">1 : ${(rew / risk).toFixed(2)}</b>`; }
    if (buy && ns === 3 && Math.abs(spc - 100) > 0.01) rr += ` <span class="neg">— مجموع نسب مراحل الوقف ${spc.toFixed(0)}% (لازم 100%)</span>`;
    const s1v = val('rcS1'); if (s1v && f && t && (buy ? s1v >= Math.min(f, t) : s1v <= Math.max(f, t))) rr += ` <span class="neg">⚠️ ${buy ? 'وقف الخسارة لازم يبقى أقل من منطقة الشراء' : 'سعر الفشل لازم يبقى أعلى من منطقة البيع'}</span>`;
    $('rcRR').innerHTML = rr;
    const lp = LV && LV.levels && LV.levels.p; $('rcBandNote').textContent = lp && f && t ? `الفرق بين حدود المنطقة ${P((t / f - 1) * 100).replace('+', '')} — والمحوري ${N(rd(lp))}` : '';
    const opt = $('rcValid').selectedOptions[0]; $('rcLong').classList.toggle('rc-off', !(opt && opt.dataset.long === '1'));   // مطفية لحد ما المدة توصل «طويلة المدى»
    drawAll();
    $('rcPreview').innerHTML = cardHtml(formObj(), { preview: true });
  }
  function formObj(){
    const buy = TYPE === 'buy', ns = stopsCount(), att = attList();
    return { type: TYPE, symbol: $('rcSym').value.trim() || 'SYMBOL', stockName: $('rcName').value.trim() || 'اسم السهم', market: $('rcMkt').value, currency: (META.markets.find(m => m.name === $('rcMkt').value) || {}).ccy,
      timeframe: $('rcTf').value, buyFrom: val('rcFrom'), buyTo: val('rcTo'), sellPct: buy ? null : val('rcSellPct'),
      resistances: [1, 2, 3].map(i => ({ level: val('rcT' + i), pct: buy ? val('rcT' + i + 'p') : null })),
      stop1: val('rcS1'), stop1Pct: buy ? (ns === 1 ? 100 : val('rcS1p')) : null, stop2: ns === 3 ? val('rcS2') : null, stop2Pct: ns === 3 ? val('rcS2p') : null, stop3: ns === 3 ? val('rcS3') : null, stop3Pct: ns === 3 ? val('rcS3p') : null,
      note: $('rcNote').value.trim(), analyst: $('rcAnalyst').value.trim(), validityHours: +$('rcValid').value, long: !!($('rcValid').selectedOptions[0] && $('rcValid').selectedOptions[0].dataset.long === '1'),
      attach: att, aiText: att.includes('ai') ? aiText() : '', indicators: att.includes('ind') ? indNotes() : [], createdAt: null, updates: [] };
  }
  function attList(){ return [['rcAttChart', 'chart'], ['rcAttAi', 'ai'], ['rcAttInd', 'ind'], ['rcAttFib', 'fib']].filter(([id]) => $(id) && $(id).checked).map(x => x[1]); }
  function aiText(){ return AI && AI.text ? AI.text : ''; }

  /* ---------- الرسم البياني والمؤشرات (SVG بيتحوّل PNG وقت الإرسال) ---------- */
  const sma = (a, n) => a.map((_, i) => i < n - 1 ? null : a.slice(i - n + 1, i + 1).reduce((x, y) => x + y, 0) / n);
  const ema = (a, n) => { const k = 2 / (n + 1), o = []; let e = null; a.forEach((v, i) => { if (i < n - 1) { o.push(null); return; } e = e == null ? a.slice(0, n).reduce((x, y) => x + y, 0) / n : v * k + e * (1 - k); o.push(e); }); return o; };
  function rsi(c, n){ const o = c.map(() => null); if (c.length <= n) return o; let g = 0, l = 0; for (let i = 1; i <= n; i++) { const d = c[i] - c[i - 1]; if (d > 0) g += d; else l -= d; } let ag = g / n, al = l / n; o[n] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    for (let i = n + 1; i < c.length; i++) { const d = c[i] - c[i - 1]; ag = (ag * (n - 1) + Math.max(d, 0)) / n; al = (al * (n - 1) + Math.max(-d, 0)) / n; o[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); } return o; }
  function macd(c){ const a = ema(c, 12), b = ema(c, 26), line = c.map((_, i) => a[i] != null && b[i] != null ? a[i] - b[i] : null), first = line.findIndex(v => v != null);
    const sig = line.map(() => null); if (first >= 0) { const e = ema(line.slice(first), 9); e.forEach((v, i) => { sig[first + i] = v; }); } return { line, sig, hist: line.map((v, i) => v != null && sig[i] != null ? v - sig[i] : null) }; }
  function stoch(h, l, c){ const k = c.map((v, i) => { if (i < 13) return null; const hh = Math.max(...h.slice(i - 13, i + 1)), ll = Math.min(...l.slice(i - 13, i + 1)); return hh === ll ? 50 : (v - ll) / (hh - ll) * 100; });
    const d = k.map((_, i) => i < 15 || k[i - 2] == null ? null : (k[i] + k[i - 1] + k[i - 2]) / 3); return { k, d }; }
  function bb(c){ const m = sma(c, 20); return { m, up: m.map((v, i) => v == null ? null : v + 2 * Math.sqrt(c.slice(i - 19, i + 1).reduce((s, x) => s + (x - v) ** 2, 0) / 20)), lo: m.map((v, i) => v == null ? null : v - 2 * Math.sqrt(c.slice(i - 19, i + 1).reduce((s, x) => s + (x - v) ** 2, 0) / 20)) }; }
  // آخر تقاطع لـ a فوق / تحت b خلال آخر L شمعة
  function crossAt(a, b, L){ for (let i = a.length - 1; i > 0 && i >= a.length - L; i--) { const bb2 = typeof b === 'number' ? b : b[i], bp = typeof b === 'number' ? b : b[i - 1]; if (a[i] == null || a[i - 1] == null || bb2 == null || bp == null) continue;
    if (a[i - 1] <= bp && a[i] > bb2) return { i, up: true }; if (a[i - 1] >= bp && a[i] < bb2) return { i, up: false }; } return null; }
  function series(){
    const B = LV && LV.bars; if (!B || !B.c || B.c.length < 5) return null;
    const c = B.c, o = B.o && B.o.length === c.length ? B.o : c.map((v, i) => i ? c[i - 1] : v);
    const S = { t: B.t, o, h: B.h, l: B.l, c, iv: B.iv || 'يومي', n: c.length };
    S.sma20 = sma(c, 20); S.sma50 = sma(c, 50); S.sma200 = sma(c, 200); S.ema20 = ema(c, 20); S.bb = bb(c); S.rsi = rsi(c, 14); S.macd = macd(c); S.stoch = stoch(B.h, B.l, c);
    return S;
  }
  // ملاحظات المؤشرات (القيمة + التقاطع) — بتترفق في الرسالة لو المحلل اختار «أرفق المؤشرات»
  function indNotes(){
    const S = series(); if (!S) return [];
    const last = (a) => { for (let i = a.length - 1; i >= 0; i--) if (a[i] != null) return a[i]; return null; }, f2 = (v) => v == null ? '' : (+v).toFixed(2), out = [], c = S.c[S.n - 1], all = META.ind || {}, iv = S.iv === 'يومي' ? 'جلسة' : 'أسبوع';
    const ago = (x) => S.n - 1 - x.i === 0 ? 'آخر ' + iv : `من ${S.n - 1 - x.i} ${iv}`;
    IND.forEach(k => {
      if (k === 'sma20' || k === 'sma50' || k === 'sma200' || k === 'ema20') { const a = k === 'ema20' ? S.ema20 : S[k], v = last(a); if (v == null) return;
        const x = crossAt(S.c, a, 5); out.push({ k, l: all[k], v: f2(v), n: x ? `السعر اخترقه ${x.up ? 'لفوق' : 'لتحت'} ${ago(x)}` : (c >= v ? 'السعر فوقه' : 'السعر تحته') }); }
      if (k === 'bb') { const u = last(S.bb.up), lo = last(S.bb.lo); if (u == null) return; out.push({ k, l: all[k], v: f2(lo) + ' – ' + f2(u), n: c > u ? 'السعر فوق الحد العلوي (تشبّع)' : c < lo ? 'السعر تحت الحد السفلي' : 'السعر جوه النطاق' }); }
      if (k === 'rsi') { const v = last(S.rsi); if (v == null) return; const x = crossAt(S.rsi, 30, 5) || crossAt(S.rsi, 70, 5);
        out.push({ k, l: 'RSI (14)', v: f2(v), n: (v >= 70 ? 'تشبّع شرائي' : v <= 30 ? 'تشبّع بيعي' : v >= 50 ? 'زخم صاعد' : 'زخم هابط') + (x ? ` — عدّى ${x.up ? 'لفوق' : 'لتحت'} مستوى ${S.rsi[x.i] >= 50 ? 70 : 30} ${ago(x)}` : '') }); }
      if (k === 'macd') { const x = crossAt(S.macd.line, S.macd.sig, 8), v = last(S.macd.line); if (v == null) return; out.push({ k, l: 'MACD', v: f2(v), n: x ? `تقاطع ${x.up ? 'إيجابي' : 'سلبي'} مع خط الإشارة ${ago(x)}` : (v >= last(S.macd.sig) ? 'فوق خط الإشارة' : 'تحت خط الإشارة') }); }
      if (k === 'stoch') { const v = last(S.stoch.k); if (v == null) return; const x = crossAt(S.stoch.k, S.stoch.d, 5); out.push({ k, l: 'ستوكاستك', v: f2(v), n: (v >= 80 ? 'تشبّع شرائي' : v <= 20 ? 'تشبّع بيعي' : 'منطقة محايدة') + (x ? ` — تقاطع ${x.up ? 'لفوق' : 'لتحت'} ${ago(x)}` : '') }); }
      if (k === 'fib') { const F = fibLevels(S), t1 = val('rcT1'), s1 = val('rcS1'); if (!F) return; const near = (v) => { if (v == null) return ''; let b = F.lv[0]; F.lv.forEach(x => { if (Math.abs(x.v - v) < Math.abs(b.v - v)) b = x; }); return b.l; };
        out.push({ k, l: 'فيبوناتشي', v: f2(F.lo) + ' – ' + f2(F.hi), n: [t1 != null ? 'الهدف 1 عند ' + near(t1) : '', s1 != null ? 'الوقف عند ' + near(s1) : ''].filter(Boolean).join(' — ') || 'مستويات التصحيح والامتداد' }); }
    });
    const gx = IND.includes('sma20') && IND.includes('sma50') ? crossAt(S.sma20, S.sma50, 10) : null;
    if (gx) out.unshift({ k: 'cross', l: gx.up ? 'تقاطع ذهبي' : 'تقاطع الموت', v: '', n: `SMA 20 ${gx.up ? 'فوق' : 'تحت'} SMA 50 ${ago(gx)}` });
    return out;
  }
  function fibLevels(S){
    const w = Math.min(90, S.n), st = S.n - w; let hi = -Infinity, lo = Infinity, hiI = 0, loI = 0;
    for (let i = st; i < S.n; i++) { if (S.h[i] > hi) { hi = S.h[i]; hiI = i; } if (S.l[i] < lo) { lo = S.l[i]; loI = i; } }
    if (!(hi > lo)) return null;
    const up = hiI > loI, R = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1], X = [1.272, 1.618], d = hi - lo, lv = [];
    R.forEach(r => lv.push({ v: up ? hi - d * r : lo + d * r, l: (r * 100).toFixed(1).replace('.0', '') + '%', ext: false }));
    X.forEach(r => lv.push({ v: up ? lo + d * r : hi - d * r, l: 'امتداد ' + (r * 100).toFixed(1) + '%', ext: true }));
    return { hi, lo, up, st, lv };
  }
  function lvLines(){
    const buy = TYPE === 'buy', L = [];
    const f = val('rcFrom'), t = val('rcTo'); if (f && t) L.push({ zone: [Math.min(f, t), Math.max(f, t)] });
    [1, 2, 3].forEach(i => { const v = val('rcT' + i); if (v) L.push({ v, c: buy ? '#059669' : '#B45309', l: (buy ? 'هدف ' : 'هبوط ') + i }); });
    for (let i = 1; i <= stopsCount(); i++) { const v = val('rcS' + i); if (v) L.push({ v, c: '#DC2626', l: buy ? 'وقف' + (stopsCount() > 1 ? ' ' + i : '') : 'فشل' }); }
    const p = LV && LV.levels && LV.levels.p; if (p) L.push({ v: p, c: '#C9A227', l: 'P', dot: true });
    return L;
  }
  function drawAll(){
    const S = series(), box = $('rcChart'); if (!box) return;
    if (!S) { LAST_SVG = { main: '', fib: '' }; box.innerHTML = '<div class="rc-side-empty">الرسم بيظهر بعد اختيار السهم.</div>'; $('rcCross').innerHTML = ''; $('rcFibWrap').hidden = true; return; }
    LAST_SVG.main = svgMain(S); box.innerHTML = LAST_SVG.main;
    const notes = indNotes(); $('rcCross').innerHTML = notes.map(x => `<span class="rc-xn"><b>${E(x.l)}</b>${x.v ? ' <span class="n">' + E(x.v) + '</span>' : ''} — ${E(x.n)}</span>`).join('');
    const showFib = IND.includes('fib') || $('rcAttFib').checked; $('rcFibWrap').hidden = !showFib;
    LAST_SVG.fib = showFib ? svgFib(S) : ''; if (showFib) $('rcFib').innerHTML = LAST_SVG.fib;
  }
  const W = 760, PR = 92;   // عرض الرسم + هامش أسعار يمين
  function frame(S, from, priceVals, H){
    let lo = Infinity, hi = -Infinity; for (let i = from; i < S.n; i++) { lo = Math.min(lo, S.l[i]); hi = Math.max(hi, S.h[i]); }
    priceVals.forEach(v => { if (v != null && isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
    const pad = (hi - lo) * 0.06 || hi * 0.02; lo -= pad; hi += pad;
    const cw = W - PR - 10, n = S.n - from, x = (i) => 10 + (i - from + 0.5) * cw / n, y = (v) => 14 + (hi - v) / (hi - lo) * (H - 34);
    return { lo, hi, cw, n, x, y };
  }
  function txt(x, y, s, c, sz, anchor){ return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${sz || 11}" fill="${c}" text-anchor="${anchor || 'start'}">${E(s)}</text>`; }
  function candles(S, from, F){
    let g = ''; const bw = Math.max(1.5, F.cw / F.n * 0.62);
    for (let i = from; i < S.n; i++) { const up = S.c[i] >= S.o[i], col = up ? '#059669' : '#DC2626', x = F.x(i);
      g += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${F.y(S.h[i]).toFixed(1)}" y2="${F.y(S.l[i]).toFixed(1)}" stroke="${col}" stroke-width="1"/><rect x="${(x - bw / 2).toFixed(1)}" y="${F.y(Math.max(S.o[i], S.c[i])).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, Math.abs(F.y(S.o[i]) - F.y(S.c[i]))).toFixed(1)}" fill="${col}"/>`; }
    return g;
  }
  function path(a, from, F, col, w, dash){ let d = '', pen = false; for (let i = from; i < a.length; i++) { if (a[i] == null) { pen = false; continue; } d += (pen ? 'L' : 'M') + F.x(i).toFixed(1) + ' ' + F.y(a[i]).toFixed(1); pen = true; }
    return d ? `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w || 1.6}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>` : ''; }
  function levelsSvg(F, L){
    let g = ''; const x2 = 10 + F.cw;
    L.forEach(o => { if (o.zone) { const a = F.y(o.zone[1]), b = F.y(o.zone[0]); g += `<rect x="10" y="${a.toFixed(1)}" width="${F.cw.toFixed(1)}" height="${Math.max(2, b - a).toFixed(1)}" fill="#2563EB" opacity=".13"/>` + txt(x2 + 4, (a + b) / 2 + 4, (TYPE === 'buy' ? 'شراء ' : 'بيع ') + N(rd(o.zone[0])) + '–' + N(rd(o.zone[1])), '#1D4ED8', 10.5); return; }
      if (o.v < F.lo || o.v > F.hi) return; const y = F.y(o.v);
      g += `<line x1="10" x2="${x2}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${o.c}" stroke-width="1.2" stroke-dasharray="${o.dot ? '2 3' : '6 4'}"/>` + txt(x2 + 4, y + 4, o.l + ' ' + N(rd(o.v)), o.c, 10.5); });
    return g;
  }
  function svgMain(S){
    const from = Math.max(0, S.n - (S.n > 130 ? 130 : S.n)), subs = IND.filter(k => k === 'rsi' || k === 'macd' || k === 'stoch'), MH = 300, SH = 74, H = MH + subs.length * SH + 22;
    const L = lvLines(), F = frame(S, from, L.map(o => o.zone ? o.zone[0] : o.v).concat(L.filter(o => o.zone).map(o => o.zone[1])), MH);
    let g = `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`;
    for (let k = 0; k <= 4; k++) { const v = F.lo + (F.hi - F.lo) * k / 4, y = F.y(v); g += `<line x1="10" x2="${10 + F.cw}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#EEF1F5"/>`; }
    if (IND.includes('bb')) g += path(S.bb.up, from, F, '#94A3B8', 1, '3 3') + path(S.bb.lo, from, F, '#94A3B8', 1, '3 3') + path(S.bb.m, from, F, '#CBD5E1', 1);
    g += levelsSvg(F, L) + candles(S, from, F);
    const ov = [['sma20', '#2563EB', 'SMA 20'], ['sma50', '#F59E0B', 'SMA 50'], ['sma200', '#7C3AED', 'SMA 200'], ['ema20', '#0EA5E9', 'EMA 20']].filter(o => IND.includes(o[0]));
    ov.forEach(o => { g += path(S[o[0]], from, F, o[1], 1.8); });
    let lx = 14; [[S.iv + ' · ' + (LV.symbol || ''), '#0F172A']].concat(ov.map(o => [o[2], o[1]])).concat(IND.includes('bb') ? [['بولينجر 20', '#64748B']] : []).forEach(([s, c]) => { g += txt(lx, 12, s, c, 11); lx += s.length * 6.4 + 14; });
    // التقاطعات على الرسم
    const mark = (x, up, label) => { if (!x || x.i < from) return; const cx = F.x(x.i), cy = F.y(S.c[x.i]); g += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="8" fill="none" stroke="#7C3AED" stroke-width="2.4"/>` + txt(cx, cy + (up ? 24 : -14), label, '#6D28D9', 11, 'middle'); };
    if (IND.includes('sma20') && IND.includes('sma50')) { const x = crossAt(S.sma20, S.sma50, 30); if (x) mark(x, x.up, x.up ? 'تقاطع ذهبي' : 'تقاطع الموت'); }
    if (IND.includes('sma50') && IND.includes('sma200')) { const x = crossAt(S.sma50, S.sma200, 60); if (x) mark(x, x.up, x.up ? 'تقاطع ذهبي 50/200' : 'تقاطع الموت 50/200'); }
    for (let k = 0; k <= 4; k++) { const v = F.lo + (F.hi - F.lo) * k / 4; g += txt(6 + F.cw, F.y(v) - 3, N(rd(v)), '#94A3B8', 9.5, 'end'); }   // أرقام المحور جوه الرسم عشان متتداخلش مع أسماء المستويات
    let top = MH;
    subs.forEach(k => {
      const y0 = top + 6, h = SH - 14, yy = (v, a, b) => y0 + (b - v) / (b - a) * h;
      g += `<rect x="10" y="${y0}" width="${F.cw}" height="${h}" fill="#F8FAFC" stroke="#EEF1F5"/>`;
      const sp = (a, mn, mx, col) => { let d = '', pen = false; for (let i = from; i < a.length; i++) { if (a[i] == null) { pen = false; continue; } d += (pen ? 'L' : 'M') + F.x(i).toFixed(1) + ' ' + yy(a[i], mn, mx).toFixed(1); pen = true; } return d ? `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.5"/>` : ''; };
      if (k === 'rsi') { g += `<line x1="10" x2="${10 + F.cw}" y1="${yy(70, 0, 100)}" y2="${yy(70, 0, 100)}" stroke="#FCA5A5" stroke-dasharray="3 3"/><line x1="10" x2="${10 + F.cw}" y1="${yy(30, 0, 100)}" y2="${yy(30, 0, 100)}" stroke="#86EFAC" stroke-dasharray="3 3"/>` + sp(S.rsi, 0, 100, '#7C3AED') + txt(W - 6, y0 + 12, 'RSI 14', '#7C3AED', 10, 'end'); }
      if (k === 'stoch') { g += `<line x1="10" x2="${10 + F.cw}" y1="${yy(80, 0, 100)}" y2="${yy(80, 0, 100)}" stroke="#FCA5A5" stroke-dasharray="3 3"/><line x1="10" x2="${10 + F.cw}" y1="${yy(20, 0, 100)}" y2="${yy(20, 0, 100)}" stroke="#86EFAC" stroke-dasharray="3 3"/>` + sp(S.stoch.k, 0, 100, '#0EA5E9') + sp(S.stoch.d, 0, 100, '#F59E0B') + txt(W - 6, y0 + 12, 'ستوكاستك', '#0369A1', 10, 'end'); }
      if (k === 'macd') { const vals = S.macd.line.concat(S.macd.sig, S.macd.hist).slice(0).filter((v, i) => v != null); let mn = Math.min(...vals), mx = Math.max(...vals); if (!(mx > mn)) { mx = 1; mn = -1; }
        const bw = Math.max(1, F.cw / F.n * 0.6); for (let i = from; i < S.n; i++) { const v = S.macd.hist[i]; if (v == null) continue; const a = yy(Math.max(v, 0), mn, mx), b = yy(Math.min(v, 0), mn, mx); g += `<rect x="${(F.x(i) - bw / 2).toFixed(1)}" y="${a.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0.6, b - a).toFixed(1)}" fill="${v >= 0 ? '#86EFAC' : '#FCA5A5'}"/>`; }
        g += sp(S.macd.line, mn, mx, '#2563EB') + sp(S.macd.sig, mn, mx, '#F59E0B') + txt(W - 6, y0 + 12, 'MACD', '#1D4ED8', 10, 'end'); }
      top += SH;
    });
    // تواريخ تحت الرسم
    for (let k = 0; k < 5; k++) { const i = Math.min(S.n - 1, from + Math.round((S.n - 1 - from) * k / 4)), d = new Date((S.t[i] || 0) * 1000); g += txt(F.x(i), H - 6, `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`, '#94A3B8', 10, 'middle'); }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" direction="ltr" font-family="IBM Plex Sans Arabic, Tahoma, Arial, sans-serif" class="rc-svg">${g}</svg>`;
  }
  function svgFib(S){
    const Fb = fibLevels(S); if (!Fb) return '';
    const H = 300, L = lvLines().filter(o => !o.dot), F = frame(S, Fb.st, Fb.lv.map(x => x.v).concat(L.map(o => o.zone ? o.zone[0] : o.v)), H);
    let g = `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`;
    Fb.lv.forEach(x => { if (x.v < F.lo || x.v > F.hi) return; const y = F.y(x.v); g += `<line x1="10" x2="${10 + F.cw}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${x.ext ? '#059669' : '#C9A227'}" stroke-width="1.1"${x.ext ? ' stroke-dasharray="4 3"' : ''}/>` + txt(14, y - 3, x.l + ' ' + N(rd(x.v)), x.ext ? '#047857' : '#8A6D10', 10); });
    g += candles(S, Fb.st, F) + levelsSvg(F, L);
    g += txt(14, 12, 'فيبوناتشي · ' + (Fb.up ? 'من القاع للقمة' : 'من القمة للقاع') + ' · ' + (LV.symbol || ''), '#0F172A', 11);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" direction="ltr" font-family="IBM Plex Sans Arabic, Tahoma, Arial, sans-serif" class="rc-svg">${g}</svg>`;
  }
  // SVG ← PNG (ضعف الدقة) عشان يترفق في الإيميل والإشعار
  function svgToPng(svg){
    return new Promise((res) => {
      if (!svg) return res('');
      const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/), w = m ? +m[1] : W, h = m ? +m[2] : 300, img = new Image();
      img.onload = () => { try { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/png')); } catch (e) { res(''); } };
      img.onerror = () => res('');
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  // بيانات التوصية زي ما هي في الشاشة (للإرسال / المسودة / المعاينة) — مع صور الرسم وفيبوناتشي
  async function buildBody(action){
    const o = formObj();
    const ch = { chApp: $('rcChApp').checked ? '1' : '0', chEmail: $('rcChEmail').checked ? '1' : '0', chWa: $('rcChWa') && $('rcChWa').checked ? '1' : '0' };
    const [imgChart, imgFib] = await Promise.all([o.attach.includes('chart') ? svgToPng(LAST_SVG.main) : '', o.attach.includes('fib') ? svgToPng(LAST_SVG.fib || svgFib(series())) : '']);
    const body = Object.assign({ action, type: o.type, symbol: o.symbol, stockName: o.stockName, market: o.market, timeframe: o.timeframe, from: o.buyFrom ?? '', to: o.buyTo ?? '', validityHours: o.validityHours,
      sellPct: o.sellPct ?? '', stop1: o.stop1 ?? '', stop1pct: o.stop1Pct ?? '', stop2: o.stop2 ?? '', stop2pct: o.stop2Pct ?? '', stop3: o.stop3 ?? '', stop3pct: o.stop3Pct ?? '', note: o.note, analyst: o.analyst, last: LV.last ?? '',
      lv_p: LV.levels ? LV.levels.p : '', lv_s1: LV.levels ? LV.levels.s1 : '', lv_s2: LV.levels ? LV.levels.s2 : '', lv_s3: LV.levels ? LV.levels.s3 : '',
      attach: o.attach.join(','), aiText: o.aiText, indicators: JSON.stringify(o.indicators), img_chart: imgChart, img_fib: imgFib }, ch);
    o.resistances.forEach((x, i) => { body['t' + (i + 1)] = x.level ?? ''; body['t' + (i + 1) + 'pct'] = x.pct ?? ''; });
    return { o, ch, body };
  }
  async function send(mode){
    const msg = $('rcMsg');
    if (!LV) return toast('اكتب كود سهم صحيح الأول', 'err');
    const o = formObj(), review = META.approvalOn && !META.canApprove;
    const chk = { chApp: $('rcChApp').checked, chEmail: $('rcChEmail').checked, chWa: $('rcChWa') && $('rcChWa').checked };
    if (!chk.chApp && !chk.chEmail && !chk.chWa) return toast('اختار قناة إرسال واحدة على الأقل', 'err');
    if (mode === 'send' && o.attach.includes('ai') && !o.aiText) { if (!await gConfirm('رأي بصيرة AI لسه ما وصلش — تبعت من غيره؟')) return; }
    if (mode === 'send' && !await gConfirm(review ? `إرسال ${o.type === 'buy' ? 'توصية الشراء' : 'توصية البيع'} ${o.symbol} للمراجعة؟ هتتبعت للمشتركين بعد الموافقة.` : `إرسال ${o.type === 'buy' ? 'توصية شراء' : 'توصية بيع'} ${o.symbol} لكل مشتركين بورصة ${o.market}؟`)) return;
    if (META.canRename) { try { localStorage.setItem('gs_rec_analyst', o.analyst); } catch(e){} }
    $('rcSend').disabled = $('rcDraft').disabled = true; msg.textContent = '⏳ جارٍ تجهيز الرسم…';
    const { body } = await buildBody('send'); if (mode === 'draft') body.mode = 'draft';
    msg.textContent = mode === 'draft' ? '⏳ جارٍ الحفظ…' : '⏳ جارٍ الإرسال…';
    const r = await apiPost('/recs_api.php', body).catch(() => null);
    $('rcSend').disabled = $('rcDraft').disabled = false;
    if (!r || !r.success) { msg.textContent = (r && r.message) || 'تعذّر الإرسال'; return toast(msg.textContent, 'err'); }
    if (r.status === 'draft') { msg.textContent = '💾 اتحفظت مسودة — هتلاقيها في السجل تحت (معاينة / PDF / إرسال / حذف)'; toast('اتحفظت المسودة ✓'); }
    else if (r.status === 'pending') { msg.textContent = '📨 اتبعتت للمراجعة — هتتبعت للمشتركين أول ما الأدمن يوافق'; toast('التوصية اتبعتت للمراجعة ✓'); }
    else { msg.textContent = `✅ اتبعتت — ${r.recipients} مشترك (إشعار المنصة: ${r.app})${r.queued ? ` — ${r.queued} إيميل / واتساب في الطريق` : ''}`; toast('تم إرسال التوصية ✓'); }
    if (window.__rcReload) window.__rcReload();
    if (r.queued) pump();
  }
  // الإصدار 131: معاينة قبل الإرسال — الإشعار + الإيميل + الواتساب (نفس اللي بيتبعت بالظبط) + PDF + مشاركة
  async function previewForm(){
    if (!LV) return toast('اكتب كود سهم صحيح الأول', 'err');
    const b = $('rcPreviewBtn'); b.disabled = true;
    const { body, o } = await buildBody('preview');
    const r = await apiPost('/recs_api.php', body).catch(() => null); b.disabled = false;
    if (!r || !r.success) return toast((r && r.message) || 'تعذّر تجهيز المعاينة', 'err');
    previewModal(r, { card: cardHtml(o, { preview: true }), label: `${o.symbol} — ${o.stockName}` });
  }
  async function previewSaved(id, actions){
    const r = await apiGet('/recs_api.php?action=preview_id&id=' + encodeURIComponent(id)).catch(() => null);
    if (!r || !r.success) return toast((r && r.message) || 'تعذّر تجهيز المعاينة', 'err');
    previewModal(r, Object.assign({ label: r.title }, actions || {}));
  }
  function emailBody(html){ try { const d = new DOMParser().parseFromString(html, 'text/html'); return d.body ? d.body.innerHTML : html; } catch(e){ return html; } }
  function pvParts(p, opt){
    const lines = (p.app || []).map(l => `<div class="rcpv-l">${E(l).replace(/\n/g, '<br>')}</div>`).join('');
    return {
      app: `<div class="rcpv-push"><div class="rcpv-ph"><span>GRIFFINE</span><span>الآن</span></div><b>${E(p.push.title)}</b><div class="rcpv-pb">${E(String(p.push.body || '').split('\n').slice(0, 3).join(' · '))}</div>${p.push.image ? `<img src="${E(p.push.image)}" alt="">` : ''}</div>
        <div class="rcpv-inapp"><div class="rcpv-cap">جوه التطبيق (الإشعارات + شاشة التوصيات)</div>${opt.card || `<div class="rcpv-card"><b>${E(p.title)}</b>${lines}</div>`}</div>`,
      email: emailBody(p.email),
      wa: `<div class="rcpv-wa"><div class="rcpv-wah">GRIFFINE</div><div class="rcpv-bub">${E(p.wa)}</div></div>`,
    };
  }
  const PV_TABS = [['app', '🔔 إشعار التطبيق'], ['email', '✉️ الإيميل'], ['wa', '🟢 واتساب']];
  function previewModal(p, opt){
    opt = opt || {}; const parts = pvParts(p, opt);
    const ov = document.createElement('div'); ov.className = 'rc-ov';
    ov.innerHTML = `<div class="rc-dlg rc-pv" role="dialog" aria-label="معاينة التوصية">
      <div class="rc-scanhead">👁 معاينة التوصية — ${E(opt.label || p.title)} <button type="button" class="rc-x" id="rcPvClose" aria-label="إغلاق">✕</button></div>
      <div class="rc-pvtabs" id="rcPvTabs">${PV_TABS.map(([k, l], i) => `<button type="button" data-k="${k}" class="${i ? '' : 'on'}">${l}</button>`).join('')}</div>
      <div class="rc-pvbody">
        <div data-pane="app">${parts.app}</div>
        <div data-pane="email" hidden><iframe class="rcpv-mail" sandbox title="الإيميل"></iframe></div>
        <div data-pane="wa" hidden>${parts.wa}<p class="u-fs12 u-muted">الواتساب رسالة بسيطة زي ما هي (من غير صور) ومعاها لينك التفاصيل.</p></div>
      </div>
      <div class="rc-row rc-pvact"><button type="button" class="secondary small" id="rcPvPdf">⬇ PDF للشكل ده</button><button type="button" class="secondary small" id="rcPvPdfAll">⬇ PDF بالثلاث أشكال</button><button type="button" class="small" id="rcPvShare">📤 مشاركة للمراجعة</button>${opt.extra || ''}</div>
    </div>`;
    document.body.appendChild(ov);
    ov.querySelector('.rcpv-mail').srcdoc = p.email;
    let cur = 'app';
    const close = () => ov.remove(); ov.addEventListener('click', (e) => { if (e.target === ov) close(); }); $('rcPvClose').onclick = close;
    $('rcPvTabs').onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b) return; cur = b.dataset.k; $('rcPvTabs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); ov.querySelectorAll('[data-pane]').forEach(x => { x.hidden = x.dataset.pane !== cur; }); };
    const report = (keys, share) => {
      const w = window.open('', '_blank'); if (!w) return toast('افتح النوافذ المنبثقة للموقع عشان الـ PDF', 'err');
      const css = document.getElementById('rcPvCss') ? document.getElementById('rcPvCss').textContent : '';
      w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>معاينة توصية — ${E(opt.label || p.title)}</title><style>body{font-family:IBM Plex Sans Arabic,Tahoma,sans-serif;margin:10px;color:#111;background:#fff}h2{font-size:17px;margin:18px 0 8px;padding-bottom:6px;border-bottom:2px solid #C9A227}.rc-pvsec{page-break-inside:avoid;margin-bottom:18px}${PV_CSS}</style></head><body>
        <h1 style="font-size:19px;margin:0 0 4px">معاينة التوصية قبل الإرسال</h1><div style="color:#555;font-size:13px">${E(p.title)} — ${new Date().toLocaleString('ar-EG')}</div>
        ${keys.map(k => `<div class="rc-pvsec"><h2>${PV_TABS.find(t => t[0] === k)[1]}</h2>${parts[k]}</div>`).join('')}</body></html>`);
      w.document.close(); gReportReady(w);
      if (share) setTimeout(() => { const bs = w.document.querySelectorAll('#gReportBar button'); if (bs[2]) gReportPdf(w, true, bs[2]); }, 400);
    };
    $('rcPvPdf').onclick = () => report([cur], false);
    $('rcPvPdfAll').onclick = () => report(['app', 'email', 'wa'], false);
    $('rcPvShare').onclick = () => report(['app', 'email', 'wa'], true);
    if (opt.wire) opt.wire(ov, close);
  }
  // شكل المعاينة (جوه الموقع وجوه نافذة الـ PDF)
  const PV_CSS = `.rcpv-push{max-width:380px;background:#1f2a3d;color:#fff;border-radius:16px;padding:10px 12px;margin:0 auto 12px}.rcpv-ph{display:flex;justify-content:space-between;font-size:11px;opacity:.75}.rcpv-push b{display:block;font-size:14px;margin:2px 0}.rcpv-pb{font-size:12.5px;opacity:.9}.rcpv-push img{width:100%;border-radius:10px;margin-top:8px;background:#fff}
    .rcpv-cap{font-size:12px;color:#64748B;margin:4px 0 6px}.rcpv-card{border:1px solid #E5E7EB;border-radius:12px;padding:10px 12px}.rcpv-l{font-size:13.5px;padding:3px 0;border-top:1px solid #F1F5F9}
    .rcpv-wa{max-width:420px;margin:0 auto;background:#e9dfd4;border-radius:14px;padding:12px}.rcpv-wah{background:#075e54;color:#fff;margin:-12px -12px 12px;padding:10px 12px;border-radius:14px 14px 0 0;font-weight:700}.rcpv-bub{background:#fff;border-radius:10px 0 10px 10px;padding:10px 12px;font-size:14px;white-space:pre-wrap;word-break:break-word;color:#111}`;
  (function(){ if (document.getElementById('rcPvCss')) return; const st = document.createElement('style'); st.id = 'rcPvCss'; st.textContent = PV_CSS; document.head.appendChild(st); })();

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
    const st = { active: ['نشطة', 'pos'], cancelled: ['أُلغيت', 'neg'], expired: ['⏰ انتهت', 'u-muted'], closed: ['اتقفلت', 'u-muted'], draft: ['💾 مسودة', 'u-muted'], pending: ['⏳ بانتظار الموافقة', 'rc-st-pend'], rejected: ['❌ مرفوضة', 'neg'] }[r.status] || ['نشطة', 'pos'];
    const mine = r.createdBy && r.createdBy.toLowerCase() === String(email).toLowerCase();
    const can = r.status === 'active' && (window.__isSuperAdmin || mine), canAppr = !!(META && META.canApprove);
    const pre = ['draft', 'pending', 'rejected'].includes(r.status);
    const btn = (k, l, cls) => `<button class="small ${cls || 'secondary'} u-wa" data-rc-${k}="${E(r.id)}">${l}</button>`;
    const acts = [btn('pv', '👁 معاينة'),
      r.status === 'active' ? btn('upd', '➕ إرسال تحديث') : '',
      r.status === 'draft' && (mine || canAppr) ? btn('pub', META && META.approvalOn && !canAppr ? '📨 إرسال للمراجعة' : '📢 إرسال', '') : '',
      r.status === 'pending' && canAppr ? btn('pub', '✅ موافقة وإرسال', '') + ' ' + btn('rej', '❌ رفض', 'danger') : '',
      pre && (mine || canAppr) ? btn('trash', '🗑 حذف', 'danger') : '',
      can ? btn('del', '🗑️ إلغاء', 'danger') : ''].filter(Boolean).join(' ');
    return `<div class="section-card rc-log rc-${r.type || 'buy'}${pre ? ' rc-log-pre' : ''}" data-st="${E(r.status)}"><div class="u-row"><div><b>${r.type === 'sell' ? '📉 بيع' : '📈 شراء'} — ${E(r.stockName)} (${E(r.symbol)})</b> <span class="${st[1]} u-fs12">${st[0]}</span>${r.long ? ` <span class="rc-longtag">${E(CFG.t_long_term || 'طويلة المدى')}</span>` : ''} <span class="g-mkt-tag">🌍 ${E(r.market || 'مصر')}</span></div>
      <span class="rc-logacts">${acts}</span></div>
      <div class="u-fs12 u-muted">${r.type === 'sell' ? 'البيع' : 'الشراء'} ${N(r.buyFrom)} – ${N(r.buyTo)} — ${TFL[r.timeframe] || ''} — ${pre ? 'اتعملت' : 'أُرسلت'} ${formatDateAr(r.createdAt)} بواسطة ${E(r.analyst || '-')}${r.analyst && r.createdBy ? ` <small>(${E(r.createdBy)})</small>` : ''}${r.status === 'active' && r.expiresAt ? ` — تنتهي ${formatDateAr(r.expiresAt)}` : ''}${r.approvedBy && r.status === 'active' && r.approvedBy.toLowerCase() !== String(r.createdBy || '').toLowerCase() ? ` — وافق عليها ${E(r.approvedBy)}` : ''}${(r.updates || []).length ? ` — ${r.updates.length} تحديث` : ''}</div>
      ${r.status === 'rejected' && r.rejectReason ? `<div class="u-fs12 neg">سبب الرفض: ${E(r.rejectReason)}</div>` : ''}</div>`;
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
  // رأي بصيرة: تلقائي مع اختيار السهم (scroll = لما المحلل يدوس «تحليل السهم»)
  async function basiraQuick(sym, mkt, scroll){
    const box = $('rcBsBox'); if (!box) return;
    box.innerHTML = '<div class="rc-bs"><b>🤖 بصيرة AI</b> <span class="u-muted u-fs12">بتحلل السهم…</span><div class="gs-skel" style="height:70px;margin-top:6px"></div></div>';
    if (scroll) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const r = await apiGet('/basira_api.php?action=analyze&symbol=' + encodeURIComponent(sym) + '&market=' + encodeURIComponent(mkt)).catch(() => null);
    if (!$('rcBsBox') || !LV || LV.symbol !== sym) return;
    if (!r || !r.success) { AI = { sym, mkt, text: '' }; box.innerHTML = `<div class="u-fs12 neg">${E((r && r.message) || 'بصيرة مش متاحة دلوقتي')}</div>`; paint(); return; }
    const R = r.report, a = R.ai || {}, sc = R.score, op = String(a.opinion || '').trim();
    AI = { sym, mkt, score: sc, text: (sc != null ? `درجة بصيرة ${sc}/100. ` : '') + op.slice(0, 700) + (op.length > 700 ? '…' : '') };
    box.innerHTML = `<div class="rc-bs"><div><b>🤖 بصيرة AI:</b> الدرجة <b class="n ${sc >= 58 ? 'pos' : sc <= 42 ? 'neg' : ''}">${sc}/100</b> <small class="u-muted">(${$('rcAttAi').checked ? 'هيترفق في التوصية' : 'مش هيترفق'})</small></div>
      <div class="rc-hz">${(R.horizons || []).map(h => `<span>${E(h.label || h.key)}: <b class="n">${h.up}%</b></span>`).join('')}</div>
      <p class="u-fs12">${E(op.slice(0, 420))}${op.length > 420 ? '…' : ''}</p>
      <button type="button" class="gs-link" id="rcBsFull">التحليل الكامل في بصيرة ↗</button></div>`;
    $('rcBsFull').onclick = () => { if (typeof renderBasira === 'function') renderBasira(sym, mkt); };
    paint();
  }
  // الإصدار 130: «مسح السوق» = نفس مسح بصيرة (نفس الشكل والألوان) — كل البورصة أو قطاع، حسب المدة المختارة،
  // وبيجيب الصاعد والهابط والمحايد (الهابط مهم لتوصية بيع أو لإغلاق توصية شغالة)
  const SC_HZ = [['day', 'يوم'], ['week', 'أسبوع'], ['month', 'شهر'], ['3m', '3 شهور'], ['6m', '6 شهور'], ['year', 'سنة']];
  const TF2HZ = { day: 'day', week: 'week', month: 'month', '3m': '3m', '6m': '6m', year: 'year' };
  const dirOf = (u) => u >= 58 ? 'up' : u <= 42 ? 'down' : 'flat';
  async function findOpp(mkt){
    const S = { items: [], total: 0, run: 0, hz: TF2HZ[$('rcTf').value] || 'week', dir: 'all', market: mkt };
    const active = new Set((window.__rcActiveSyms || []).map(x => String(x).toUpperCase()));
    const ov = document.createElement('div'); ov.className = 'rc-ov';
    ov.innerHTML = `<div class="rc-dlg rc-find rc-scan" role="dialog" aria-label="مسح السوق">
      <div class="rc-scanhead">📊 مسح السوق — الصاعد والهابط والمحايد <button type="button" class="rc-x" id="rcFindClose" aria-label="إغلاق">✕</button></div>
      <div class="bs-card bs-scan"><div class="bs-scrow">
        <div><label for="rcScMkt">البورصة</label><select id="rcScMkt" data-g-mkt="skip">${(META.markets || []).map(m => `<option value="${E(m.name)}" ${m.name === mkt ? 'selected' : ''}>${E(m.name)}</option>`).join('')}</select></div>
        <div><label for="rcScSec">القطاع</label><select id="rcScSec"><option value="">كل البورصة</option></select></div>
        <div><label>المتوقع خلال ${gTipI('بتتحدد تلقائي من «المدة» اللي في التوصية — وتقدر تغيّرها هنا')}</label><div class="bs-seg" id="rcScHz">${SC_HZ.map(([k, l]) => `<button type="button" data-k="${k}" class="${k === S.hz ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <div class="bs-scbtns"><button type="button" class="bs-go" id="rcScGo">📊 ابدأ المسح</button><button type="button" class="secondary small" id="rcScStop" hidden>⏹ إيقاف</button></div>
      </div>
      <div class="bs-scprog" id="rcScProg" hidden><div class="bs-scbar"><i id="rcScBar"></i></div><small id="rcScTxt"></small></div>
      <small class="u-muted bs-scnote">نفس محرك بصيرة (12 مؤشر + التقاطعات + الدعم والمقاومة + التذبذب) على كل أسهم البورصة. «هبوط محتمل» مناسب لتوصية بيع أو لإغلاق توصية شغالة على السهم.</small></div>
      <div class="rc-dirtabs" id="rcScDir"></div>
      <div class="bs-card" id="rcScRes" hidden><div class="bs-scbody"><table class="bs-sctable g-no-enh rc-sctable"><thead><tr><th>#</th><th>السهم</th><th>القطاع</th><th>آخر سعر</th><th id="rcScHzTh">احتمال الصعود</th><th>الاتجاه</th><th>المتوقع</th><th>بصيرة</th><th></th></tr></thead><tbody id="rcScBody"></tbody></table></div></div>
    </div>`;
    document.body.appendChild(ov);
    const close = () => { S.run++; ov.remove(); }; ov.addEventListener('click', (e) => { if (e.target === ov) close(); }); $('rcFindClose').onclick = close;
    const hzL = () => (SC_HZ.find(h => h[0] === S.hz) || [0, ''])[1];
    const upOf = (x) => (x.hz && x.hz[S.hz] ? x.hz[S.hz].up : 50);
    const paint = () => {
      const all = S.items.slice().sort((a, b) => upOf(b) - upOf(a) || (b.score || 0) - (a.score || 0)), cnt = { all: all.length, up: 0, down: 0, flat: 0 };
      all.forEach(x => cnt[dirOf(upOf(x))]++);
      $('rcScDir').innerHTML = [['all', 'الكل'], ['up', '🟢 صاعد'], ['down', '🔴 هابط'], ['flat', '⚪ محايد']].map(([k, l]) => `<button type="button" data-d="${k}" class="rc-dir-${k}${S.dir === k ? ' on' : ''}">${l} <b class="n">${cnt[k]}</b></button>`).join('');
      $('rcScHzTh').textContent = `احتمال الصعود (${hzL()})`;
      let L = S.dir === 'all' ? all : all.filter(x => dirOf(upOf(x)) === S.dir); if (S.dir === 'down') L = L.slice().reverse();
      $('rcScBody').innerHTML = L.map((x, i) => { const h = (x.hz || {})[S.hz] || {}, u = h.up == null ? 50 : h.up, d = dirOf(u), v = d === 'up' ? 'pos' : d === 'down' ? 'neg' : 'neu', act = active.has(String(x.symbol).toUpperCase());
        return `<tr><td class="n">${i + 1}</td><td><b class="n">${E(x.symbol)}</b>${act ? ' <span class="rc-actb" title="فيه توصية شغالة على السهم ده">📢 توصية شغالة</span>' : ''}<small class="bs-scname">${E(x.ar || x.name)}</small></td>
          <td><span class="bs-scsec">${E(x.sector)}</span></td><td><span class="n">${N(x.last, 2)}</span><small class="n ${x.chg >= 0 ? 'pos' : 'neg'}">${P(x.chg)}</small></td>
          <td><div class="bs-scup"><div class="bs-scbar sm"><i class="${v}" style="width:${u}%"></i></div><b class="n ${v}">${u}%</b></div></td>
          <td><span class="bs-chip ${v === 'pos' ? 'bs-c-pos' : v === 'neg' ? 'bs-c-neg' : 'bs-c-neu'}">${d === 'up' ? 'صعود محتمل' : d === 'down' ? 'هبوط محتمل' : 'عرضي'}</span></td>
          <td class="n">${h.lo != null ? N(h.lo, 2) + ' — ' + N(h.hi, 2) : '—'}</td><td class="n">${x.score != null ? x.score : '—'}</td>
          <td><button type="button" class="small u-wa" data-pick="${E(x.symbol)}" data-d="${d}">${d === 'down' ? 'توصية بيع' : 'اختيار'}</button></td></tr>`; }).join('') || `<tr><td colspan="9" class="u-muted">${S.items.length ? 'مفيش أسهم في الاتجاه ده.' : 'دوس «ابدأ المسح».'}</td></tr>`;
    };
    $('rcScDir').onclick = (e) => { const b = e.target.closest('[data-d]'); if (!b) return; S.dir = b.dataset.d; paint(); };
    $('rcScHz').onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b) return; S.hz = b.dataset.k; $('rcScHz').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); paint(); };
    $('rcScBody').onclick = (e) => { const b = e.target.closest('[data-pick]'); if (!b) return;
      if (b.dataset.d === 'down' && TYPE !== 'sell') { const t = $('rcType').querySelector('button[data-t="sell"]'); if (t) t.click(); }
      if (b.dataset.d === 'up' && TYPE !== 'buy') { const t = $('rcType').querySelector('button[data-t="buy"]'); if (t) t.click(); }
      if ($('rcMkt').value !== S.market && [...$('rcMkt').options].some(o => o.value === S.market)) $('rcMkt').value = S.market;
      $('rcSym').value = b.dataset.pick; $('rcName').value = ''; $('rcName').dataset.auto = '1'; close(); loadLevels(); };
    const loadSecs = async () => { const sec = $('rcScSec'); sec.innerHTML = '<option value="">كل البورصة</option>';
      const r = await apiGet(`/basira_api.php?action=scan&market=${encodeURIComponent($('rcScMkt').value)}&limit=0`).catch(() => null);
      if (!document.body.contains(ov)) return;
      if (r && r.success) sec.innerHTML = `<option value="">كل البورصة (${r.total} سهم)</option>` + r.sectors.map(x => `<option value="${E(x.name)}">${E(x.name)} (${x.n})</option>`).join('');
      else if (r && r.message) $('rcScTxt').textContent = r.message, $('rcScProg').hidden = false; };
    $('rcScMkt').onchange = () => { S.run++; loadSecs(); };
    const done = (m) => { $('rcScStop').hidden = true; $('rcScGo').disabled = false; if (m) $('rcScTxt').textContent = m; };
    $('rcScStop').onclick = () => { S.run++; done('اتوقف المسح — النتايج اللي اتحللت ظاهرة تحت.'); };
    $('rcScGo').onclick = async () => {
      const my = ++S.run, market = $('rcScMkt').value, sector = $('rcScSec').value; S.items = []; S.market = market;
      $('rcScGo').disabled = true; $('rcScStop').hidden = false; $('rcScProg').hidden = false; $('rcScRes').hidden = false; $('rcScBar').style.width = '0%'; $('rcScTxt').textContent = 'جارٍ تحميل قائمة الأسهم…'; paint();
      let off = 0, fails = 0;
      while (true) {
        const r = await apiGet(`/basira_api.php?action=scan&market=${encodeURIComponent(market)}&sector=${encodeURIComponent(sector)}&offset=${off}&limit=10`).catch(() => null);
        if (my !== S.run || !document.body.contains(ov)) return;
        if (!r || !r.success) { if (++fails > 2) return done((r && r.message) || 'تعذّر إكمال المسح — حاول تاني.'); continue; }
        S.items = S.items.concat(r.items.filter(x => x.ok)); off += r.items.length;
        $('rcScBar').style.width = (r.total ? Math.min(100, off / r.total * 100) : 100).toFixed(1) + '%'; $('rcScTxt').textContent = `تم تحليل ${off} من ${r.total} سهم…`; paint();
        if (!r.items.length || off >= r.total) break;
      }
      done(`✅ اكتمل المسح: ${S.items.length} سهم — مترتبين حسب احتمال الصعود خلال ${hzL()}.`);
    };
    await loadSecs();
    $('rcScGo').click();   // المسح بيبدأ على طول على كل البورصة بالمدة المختارة
  }

  /* ============ كارت التوصية (المعاينة + شاشة العميل) ============ */
  function cardHtml(r, opt){
    opt = opt || {};
    const buy = r.type !== 'sell', ccy = r.currency || '', C = CFG;
    const tg = (r.resistances || []).filter(x => x && x.level != null);
    const lastIdx = tg.length - 1, att = r.attach || [], expired = r.status === 'expired';
    const stops = [1, 2, 3].filter(i => r['stop' + i]); const multi = stops.length > 1;
    const chart = opt.preview ? (att.includes('chart') && LAST_SVG.main ? `<div class="rc-cimg">${LAST_SVG.main}</div>` : '') : (r.chartUrl ? `<div class="rc-cimg"><img src="${E(r.chartUrl)}" alt="الرسم البياني" loading="lazy"></div>` : '');
    const fib = opt.preview ? (att.includes('fib') && LAST_SVG.fib ? `<div class="rc-cimg">${LAST_SVG.fib}</div>` : '') : (r.fibUrl ? `<div class="rc-cimg"><img src="${E(r.fibUrl)}" alt="فيبوناتشي" loading="lazy"></div>` : '');
    const ind = (r.indicators || []).length ? `<div class="rc-inds">${r.indicators.map(x => `<span class="rc-xn"><b>${E(x.l)}</b>${x.v ? ' <span class="n">' + E(x.v) + '</span>' : ''}${x.n ? ' — ' + E(x.n) : ''}</span>`).join('')}</div>` : '';
    return `<div class="rc-card rc-${buy ? 'buy' : 'sell'}${expired ? ' rc-expired' : ''}">
      <div class="rc-card-h"><span class="rc-badge">${buy ? '📈 توصية شراء' : '📉 توصية بيع'}</span><b class="n rc-sym">${E(r.symbol)}</b><span class="rc-name">${E(r.stockName)}</span>${r.long ? `<span class="rc-longtag">${E(C.t_long_term || '🕰️ توصية طويلة المدى')}</span>` : ''}${expired ? `<span class="rc-exptag">${E(C.t_expired_title || '⏰ انتهت صلاحية التوصية')}</span>` : ''}</div>
      <div class="rc-meta">${TFL[r.timeframe] ? 'المدة: ' + TFL[r.timeframe] + ' — ' : ''}${E(r.market || 'مصر')}${ccy ? ' (' + E(ccy) + ')' : ''}${r.expiresAt && !expired ? ' — صالحة حتى ' + formatDateAr(r.expiresAt) : ''}</div>
      ${chart}
      <div class="rc-line rc-entry"><span>${buy ? '💰 الشراء من' : '💰 البيع من'}</span><b class="n">${N(r.buyFrom)}</b><span>إلى</span><b class="n">${N(r.buyTo)}</b>${!buy && r.sellPct ? `<span>— بيع <b class="n">${N(r.sellPct, 0)}%</b> من الكمية</span>` : ''}</div>
      ${tg.length ? (buy ? `<div class="rc-sub">🎯 جني الأرباح</div>${tg.map((x, i) => `<div class="rc-line rc-tp"><span>نقطة بيع ${i + 1}</span><b class="n">${N(x.level)}</b>${x.pct != null ? `<span class="rc-pct">بيع <b class="n">${N(x.pct, 0)}%</b>${i === lastIdx && tg.length > 1 ? ' (باقي الكمية)' : ''}</span>` : ''}</div>`).join('')}`
        : `<div class="rc-line"><span>📉 مستويات الهبوط المتوقعة</span><b class="n">${tg.map(x => N(x.level)).join(' ← ')}</b></div>`) : ''}
      ${r.stop1 ? (buy ? stops.map(i => `<div class="rc-line rc-sl"><span>🛑 وقف الخسارة${multi ? ' ' + i : ''}</span><b class="n">${N(r['stop' + i])}</b><span class="rc-pct">بيع <b class="n">${N(r['stop' + i + 'Pct'] == null ? 100 : r['stop' + i + 'Pct'], 0)}%</b></span></div>`).join('')
        : `<div class="rc-line rc-sl"><span>⚠️ التوصية تعتبر فاشلة لو السعر عدّى لفوق</span><b class="n">${N(r.stop1)}</b></div>`) : ''}
      ${fib}${ind}
      ${r.aiText ? `<div class="rc-ai"><b>🤖 رأي بصيرة AI</b><div>${E(r.aiText)}</div></div>` : ''}
      ${r.note ? `<div class="rc-note">📝 ${E(r.note)}</div>` : ''}
      <div class="rc-foot">${E(C.t_analyst || 'المحلل')}: ${E(r.analyst || C.t_team || 'فريق GRIFFINE')}${r.createdAt ? ' — ' + formatDateAr(r.createdAt) : ''} — ${E(C.t_disclaimer || 'تحليل تعليمي وليس أمر شراء أو بيع')}</div>
      ${(r.updates || []).length ? `<div class="rc-upds">${r.updates.map(u => `<div class="rc-upd${u.kind === 'expired' ? ' rc-upd-exp' : ''}"><b>${E(u.kind === 'expired' ? (C.t_expired_title || KIND_ALL.expired) : (KIND_ALL[u.kind] || '📝 تحديث'))}</b> <small class="u-muted">${formatDateAr(u.at)}</small><div>${E(u.message)}</div></div>`).join('')}</div>` : ''}
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
      <div class="info">توصيات الشراء والبيع من فريق المحللين — وتحت كل توصية التحديثات أول بأول. التوصية بتنتهي بعد مدة صلاحيتها. تحليل تعليمي والقرار قرارك.</div>
      <div id="recCustomerList"><div class="gs-skel" style="height:200px"></div></div></div>`;
    $('homeBtn').onclick = () => { if (window.__recPoll) { clearInterval(window.__recPoll); window.__recPoll = null; } renderHome(); };
    const load = async () => {
      const res = await apiGet('/recommendations_list.php?expired=1').catch(() => null), el = $('recCustomerList'); if (!el) return;
      const recs = (res && res.success) ? res.recommendations : [];
      if (res && res.cfg) CFG = res.cfg;
      el.innerHTML = recs.length ? recs.map(r => cardHtml(r, { actions: r.type !== 'sell' && r.status !== 'expired' ? `<button class="small u-wa u-mt8" data-plan="${E(r.symbol)}" data-px="${E(r.buyFrom)}" data-mkt="${E(r.market || 'مصر')}">حوّل لخطة</button>` : '' })).join('')
        : `<div class="section-card u-note">${res && res.requiresSubscription ? 'التوصيات متاحة للمشتركين.' : 'لا توجد توصيات حاليًا.'}</div>`;
      el.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => { if (window.__recPoll) { clearInterval(window.__recPoll); window.__recPoll = null; } window.__prefillPlan = { symbol: b.dataset.plan, price: +b.dataset.px, market: b.dataset.mkt }; renderNewPlanForm(); });
    };
    await load();
    window.__recPoll = setInterval(load, 30000);
  };
  window.gRecCardHtml = cardHtml;

  /* ============ 03. لوحة التحكم: نصوص وأزرار وافتراضيات شاشة التوصيات ============ */
  window.renderAdminRecsCfg = async function(){
    const __tok = screenToken(); pushNav(() => renderAdminRecsCfg()); window.__lastPageKey = 'admin_recs_cfg';
    const r = await apiGet('/recs_api.php?action=admin_get').catch(() => null);
    if (screenStale(__tok)) return;
    if (!r || !r.success) { app.innerHTML = `<div class="container"><div class="section-card error">${E((r && r.message) || 'غير مصرح')}</div></div>`; return; }
    const c = r.config, d = r.defaults;
    const F = [
      ['h', 'عناوين الشاشة والأزرار'], ['t_title', 'اسم الشاشة'], ['t_buy_tab', 'زرار توصية شراء'], ['t_sell_tab', 'زرار توصية بيع'], ['t_stock_panel', 'عنوان جزء السهم والسعر المحوري'], ['t_msg_panel', 'عنوان جزء رسالة التوصية'],
      ['t_btn_analyze', 'زرار تحليل السهم'], ['t_btn_scan', 'زرار مسح السوق'], ['t_btn_transfer', 'زرار نقل المستويات'], ['t_transfer_hint', 'شرح نقل المستويات', 'area'],
      ['t_entry_buy', 'عنوان منطقة الشراء'], ['t_entry_sell', 'عنوان منطقة البيع'], ['t_targets_buy', 'عنوان نقاط جني الأرباح'], ['t_targets_sell', 'عنوان مستويات الهبوط'],
      ['t_stop_buy', 'عنوان وقف الخسارة'], ['t_stop_sell', 'عنوان «التوصية فاشلة» في البيع'], ['t_stop_one', 'اختيار وقف مرحلة واحدة'], ['t_stop_three', 'اختيار وقف 3 مراحل'],
      ['t_chart', 'عنوان الرسم البياني'], ['t_attach', 'عنوان المرفقات'], ['t_att_chart', 'مرفق الرسم'], ['t_att_ai', 'مرفق رأي بصيرة'], ['t_att_ind', 'مرفق المؤشرات'], ['t_att_fib', 'مرفق فيبوناتشي'],
      ['t_channels', 'عنوان قنوات الإرسال'], ['t_preview', 'عنوان المعاينة'], ['t_send_buy', 'زرار إرسال الشراء'], ['t_send_sell', 'زرار إرسال البيع'], ['t_analyst', 'كلمة «المحلل» في الرسالة'],
      ['t_btn_preview', 'زرار المعاينة قبل الإرسال'], ['t_btn_draft', 'زرار حفظ مسودة'], ['t_send_review', 'زرار الإرسال للمراجعة (لما الموافقة شغالة)'], ['t_pending_note', 'ملاحظة الموافقة عند المحلل', 'area'],
      ['h', 'موافقة الأدمن قبل الإرسال'], ['approval_on', 'كل توصيات المحللين تروح للأدمن (أو اللي معاه صلاحية «مراجعة واعتماد التوصيات») يوافق عليها الأول، وبعدين تتبعت للمشتركين', 'bool'],
      ['h', 'الرسالة والإشعارات'], ['t_long_term', 'علامة التوصية طويلة المدى'], ['t_expired_title', 'عنوان إشعار انتهاء الصلاحية'], ['t_expired_body', 'نص إشعار انتهاء الصلاحية', 'area'],
      ['t_disclaimer', 'التنويه في آخر الرسالة', 'area'], ['t_team', 'الاسم لو المحلل مالوش اسم مسجّل'], ['t_email_cta', 'زرار الإيميل'], ['t_email_foot', 'آخر الإيميل', 'area'], ['t_wa_link', 'سطر اللينك في الواتساب'],
      ['h', 'الافتراضيات'], ['entry_band', 'نطاق منطقة الدخول من النقطة المحورية %', 'num'], ['tp1', 'نسبة البيع عند الهدف 1 %', 'num'], ['tp2', 'نسبة البيع عند الهدف 2 %', 'num'], ['tp3', 'نسبة البيع عند الهدف 3 %', 'num'],
      ['st1', 'وقف 3 مراحل — نسبة المرحلة 1 %', 'num'], ['st2', 'نسبة المرحلة 2 %', 'num'], ['st3', 'نسبة المرحلة 3 %', 'num'], ['long_hours', '«طويلة المدى» من صلاحية', 'valid'],
      ['att_chart', 'إرفاق الرسم مختار افتراضيًا', 'bool'], ['att_ai', 'إرفاق رأي بصيرة مختار افتراضيًا', 'bool'], ['att_ind', 'إرفاق المؤشرات مختار افتراضيًا', 'bool'], ['att_fib', 'إرفاق فيبوناتشي مختار افتراضيًا', 'bool'], ['ind_default', 'المؤشرات الظاهرة في الرسم افتراضيًا', 'ind'],
    ];
    const sel = String(c.ind_default || '').split(',');
    const row = ([k, l, t]) => k === 'h' ? `<h3 class="u-mt14">${E(l)}</h3>` : t === 'bool' ? `<label class="u-check"><input type="checkbox" data-k="${k}" ${c[k] ? 'checked' : ''}> ${E(l)}</label>`
      : t === 'area' ? `<label>${E(l)}</label><textarea data-k="${k}" rows="2" placeholder="${E(d[k])}">${E(c[k])}</textarea>`
      : t === 'valid' ? `<div class="mz-adm-f"><label>${E(l)}</label><select data-k="${k}" data-num="1">${r.valid.map(v => `<option value="${v.h}" ${+c[k] === v.h ? 'selected' : ''}>${E(v.l)}</option>`).join('')}</select></div>`
      : t === 'ind' ? `<div><label>${E(l)}</label><div class="rc-ch" data-k="${k}" data-ind="1">${Object.entries(r.ind).map(([ik, il]) => `<label class="u-check"><input type="checkbox" value="${ik}" ${sel.includes(ik) ? 'checked' : ''}> ${E(il)}</label>`).join('')}</div></div>`
      : `<div class="mz-adm-f"><label>${E(l)} ${t === 'num' ? `<small class="u-muted">(الافتراضي ${E(d[k])})</small>` : ''}</label><input data-k="${k}" ${t === 'num' ? 'type="number" step="any" dir="ltr"' : ''} value="${E(c[k])}" placeholder="${E(d[k])}"></div>`;
    app.innerHTML = `<div class="container"><div class="u-row"><h2>📢 شاشة التوصيات — النصوص والإعدادات</h2><button class="secondary u-wa" id="rcaBack">← لوحة التحكم</button></div>
      <div class="info">كل نصوص وأزرار شاشة «توصية شراء / بيع» ورسالة التوصية (الإشعار / الإيميل / الواتساب) والافتراضيات من هنا. الخانة الفاضية بترجع للنص الافتراضي. صلاحية «تغيير اسم المحلل» من «الفريق والصلاحيات».</div>
      <div class="section-card mz-adm">${F.map(row).join('')}</div>
      <div class="u-row" style="justify-content:flex-start;gap:8px"><button class="u-wa" id="rcSaveCfg">💾 حفظ</button><button class="secondary u-wa" id="rcResetCfg">↺ رجوع للافتراضي</button><button class="secondary u-wa" id="rcOpenScreen">📢 افتح شاشة التوصيات</button><span class="u-note" id="rcCfgMsg"></span></div></div>`;
    $('rcaBack').onclick = () => goAdminHome();
    $('rcOpenScreen').onclick = () => renderRecommendationsAdminPage();
    const msg = (t) => { $('rcCfgMsg').textContent = t; };
    $('rcSaveCfg').onclick = async () => {
      const o = {};
      app.querySelectorAll('[data-k]').forEach(i => { const k = i.dataset.k;
        if (i.dataset.ind) o[k] = [...i.querySelectorAll('input:checked')].map(x => x.value).join(',');
        else o[k] = i.type === 'checkbox' ? i.checked : (i.type === 'number' || i.dataset.num ? +i.value : i.value); });
      const x = await apiPost('/recs_api.php', { action: 'admin_save', config: JSON.stringify(o) }).catch(() => null);
      msg(x && x.success ? 'تم الحفظ ✓' : ((x && x.message) || 'تعذّر الحفظ')); if (x && x.success) toast('تم حفظ إعدادات شاشة التوصيات ✓'); else toast((x && x.message) || 'تعذّر الحفظ', 'err');
    };
    $('rcResetCfg').onclick = async () => { if (!await gConfirm('رجوع كل النصوص والإعدادات للافتراضي؟')) return; const x = await apiPost('/recs_api.php', { action: 'admin_save', config: 'null' }).catch(() => null); if (x && x.success) renderAdminRecsCfg(); };
  };
})();
