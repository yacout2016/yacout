/* =====================================================================
   GRIFFINE — app-screener.js (الإصدار 88) — كشاف الأسهم والتحليل الفني
   (اتفصل من griffine.js - كل الملفات بتتحمّل بالترتيب في index.php وبتشارك نفس المتغيرات العامة)
   ===================================================================== */
/* ================== كشاف الأسهم (شكل وفكرة فقط - بدون ربط بيانات حي حاليًا) ================== */
/* ================== محرك حسابات التحليل الفني (رياضيات عادية على بيانات يدخلها العميل) ================== */
function ta_sma(values, period){
  if (values.length < period) return null;
  const slice = values.slice(values.length - period);
  return slice.reduce((a,b)=>a+b,0) / period;
}
function ta_emaSeries(values, period){
  if (values.length < period) return [];
  const k = 2/(period+1);
  const out = [];
  let ema = values.slice(0, period).reduce((a,b)=>a+b,0) / period; // seed = SMA
  out.push(ema);
  for (let i = period; i < values.length; i++){
    ema = values[i]*k + ema*(1-k);
    out.push(ema);
  }
  return out; // out[0] corresponds to values[period-1]
}
function ta_rsi(values, period){
  if (values.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++){
    const diff = values[i] - values[i-1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains/period, avgLoss = losses/period;
  for (let i = period+1; i < values.length; i++){
    const diff = values[i] - values[i-1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain*(period-1) + gain) / period; // تنعيم وايلدر Wilder's smoothing
    avgLoss = (avgLoss*(period-1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain/avgLoss;
  return 100 - (100/(1+rs));
}
function ta_macd(values, fast, slow, signalPeriod){
  if (values.length < slow + signalPeriod) return null;
  const emaFast = ta_emaSeries(values, fast);
  const emaSlow = ta_emaSeries(values, slow);
  // نحاذي السلسلتين على آخر نقطة مشتركة (emaSlow دايمًا أقصر لأن فترته أطول)
  const offset = emaFast.length - emaSlow.length;
  const macdLine = emaSlow.map((v,i)=> emaFast[i+offset] - v);
  const signalLine = ta_emaSeries(macdLine, signalPeriod);
  const macdLast = macdLine[macdLine.length-1];
  const signalLast = signalLine[signalLine.length-1];
  return { macd: macdLast, signal: signalLast, histogram: macdLast - signalLast };
}
function ta_fibonacci(high, low){
  const diff = high - low;
  return {
    supports: [ high - diff*0.382, high - diff*0.5, high - diff*0.618 ],
    resistances: [ high + diff*0.236, high + diff*0.382, high + diff*0.618 ],
  };
}
function ta_pivotPoints(high, low, close){
  const p = (high+low+close)/3;
  return {
    pivot: p,
    supports: [ 2*p-high, p-(high-low), low-2*(high-p) ],
    resistances: [ 2*p-low, p+(high-low), high+2*(p-low) ],
  };
}
function ta_bollinger(values, period, k){
  if (values.length < period) return null;
  const slice = values.slice(values.length-period);
  const mean = slice.reduce((a,b)=>a+b,0)/period;
  const variance = slice.reduce((a,b)=>a+(b-mean)*(b-mean),0)/period;
  const sd = Math.sqrt(variance);
  return { mid: mean, upper: mean+k*sd, lower: mean-k*sd };
}
function ta_momentum(values, period){
  if (values.length < period+1) return null;
  return values[values.length-1] - values[values.length-1-period];
}
function ta_roc(values, period){
  if (values.length < period+1) return null;
  const prev = values[values.length-1-period];
  if (prev === 0) return null;
  return (values[values.length-1] - prev) / prev * 100;
}
function ta_wma(values, period){
  if (values.length < period) return null;
  const slice = values.slice(values.length-period);
  let weightedSum = 0, weightTotal = 0;
  for (let i=0;i<period;i++){ const w = i+1; weightedSum += slice[i]*w; weightTotal += w; }
  return weightedSum/weightTotal;
}
// تقريب لـStochastic %K معتمد على أسعار الإغلاق بس (مش أعلى/أقل كل شمعة فعليًا - تبسيط مقصود لأن الإدخال يدوي)
function ta_stochasticApprox(values, period){
  if (values.length < period) return null;
  const slice = values.slice(values.length-period);
  const hi = Math.max(...slice), lo = Math.min(...slice);
  if (hi === lo) return 50;
  return (values[values.length-1]-lo)/(hi-lo)*100;
}
// تقريب لـWilliams %R بنفس منطق التبسيط أعلاه
function ta_williamsRApprox(values, period){
  if (values.length < period) return null;
  const slice = values.slice(values.length-period);
  const hi = Math.max(...slice), lo = Math.min(...slice);
  if (hi === lo) return -50;
  return (hi-values[values.length-1])/(hi-lo)*-100;
}
function ta_cmo(values, period){
  if (values.length < period+1) return null;
  let up=0, down=0;
  for (let i=values.length-period;i<values.length;i++){
    const diff = values[i]-values[i-1];
    if (diff>0) up+=diff; else down-=diff;
  }
  if (up+down === 0) return 0;
  return (up-down)/(up+down)*100;
}
function ta_trix(values, period){
  if (values.length < period*3) return null;
  const e1 = ta_emaSeries(values, period);
  if (e1.length < period) return null;
  const e2 = ta_emaSeries(e1, period);
  if (e2.length < period) return null;
  const e3 = ta_emaSeries(e2, period);
  if (e3.length < 2) return null;
  const last = e3[e3.length-1], prev = e3[e3.length-2];
  if (prev === 0) return null;
  return (last-prev)/prev*100;
}
function ta_gradeLabel(score){
  if (score >= 0.6) return { label: 'شراء قوي', color: '#0b6b2c' };
  if (score >= 0.2) return { label: 'شراء', color: '#2e9e4f' };
  if (score > -0.2) return { label: 'متعادل', color: '#888' };
  if (score > -0.6) return { label: 'بيع', color: '#c0392b' };
  return { label: 'بيع قوي', color: '#8b1e1e' };
}

/* ================== TradingView Widget (عرض بصري بس - لا يوجد أي سحب بيانات منه) ================== */
function loadTradingViewScript(callback){
  if (window.TradingView) { callback(); return; }
  const existing = document.getElementById('tvScriptTag');
  if (existing) { existing.addEventListener('load', callback); return; }
  const script = document.createElement('script');
  script.id = 'tvScriptTag';
  script.src = 'https://s3.tradingview.com/tv.js';
  script.onload = callback;
  document.head.appendChild(script);
}
function renderTradingViewWidget(symbol){
  const container = document.getElementById('tvWidgetContainer');
  if (!container) return;
  // شروط TradingView للأدوات المجانية بتلزم بظهور رابط الإسناد تحت الشارت
  const tvSym = String(symbol || 'EGX:EGX30').replace(/[^A-Za-z0-9:._-]/g, '');
  container.innerHTML = '<div id="tvWidgetInner" style="height:400px;"></div><div class="tradingview-widget-copyright" style="font-size:12px;margin-top:6px;text-align:left;direction:ltr;"><a href="https://www.tradingview.com/symbols/' + encodeURIComponent(tvSym.replace(':','-')) + '/" rel="noopener nofollow" target="_blank">Chart by TradingView</a></div>';
  loadTradingViewScript(() => {
    try {
      new TradingView.widget({
        autosize: true,
        symbol: symbol || 'EGX:EGX30',
        interval: 'D',
        timezone: 'Africa/Cairo',
        theme: (document.documentElement.getAttribute('data-theme') === 'dark') ? 'dark' : 'light',
        style: '1',
        locale: 'ar',
        container_id: 'tvWidgetInner',
      });
    } catch(e) { container.innerHTML = '<div class="error">تعذّر تحميل الشارت.</div>'; }
  });
}

/* ================== كشاف الأسهم — تحليل فني لسهم واحد (بيانات تدخلها إنت) ================== */
const TA_INDICATORS = {
  rsi:   { label: 'RSI - مؤشر القوة النسبية', needsSeries: true },
  macd:  { label: 'MACD', needsSeries: true },
  sma:   { label: 'SMA - متوسط متحرك بسيط', needsSeries: true },
  ema:   { label: 'EMA - متوسط متحرك أسي', needsSeries: true },
  boll:  { label: 'Bollinger Bands - نطاقات بولينجر', needsSeries: true },
  mom:   { label: 'Momentum - الزخم', needsSeries: true },
  roc:   { label: 'ROC - معدل التغيّر', needsSeries: true },
  wma:   { label: 'WMA - متوسط متحرك موزون', needsSeries: true },
  stoch: { label: 'Stochastic Oscillator (تقريبي)', needsSeries: true },
  willr: { label: 'Williams %R (تقريبي)', needsSeries: true },
  cmo:   { label: 'CMO - مؤشر تشاندي للزخم', needsSeries: true },
  trix:  { label: 'TRIX', needsSeries: true },
};
const TA_PERIOD_LABELS = { '1m':'شهر', '2m':'شهرين', '3m':'3 شهور', '1y':'سنة' };
const TA_TIMEFRAME_LABELS = { '5min':'5 دقائق', '15min':'ربع ساعة', '30min':'نص ساعة', '1h':'ساعة', '2h':'ساعتين', '3h':'3 ساعات', '4h':'4 ساعات', 'day':'يوم', 'week':'أسبوع', 'month':'شهر' };
// الفترة الزمنية اللي حصل خلالها أعلى/أقل سعر مُدخل في أداة فيبوناتشي/بيفوت (وصفية بس للعرض في النتيجة - مش جزء من معادلة الحساب نفسها)
const TA_HL_PERIOD_LABELS = { day:'يوم', week:'أسبوع', month:'شهر', '2months':'شهرين', '3months':'3 شهور', '6months':'6 شهور', year:'سنة' };

async function renderScreener(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderScreener());
  const email = await getSession();
  if (email && !(await ensureAccess())) return;

  if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('screener','كشاف الأسهم — تحليل فني لسهم واحد')}</div>
      <button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button>
    </div>

    <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:8px 12px;font-size:12.5px;color:#7a5c00;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
      <span>⚠️ المعلومات أدناه هي أدوات تحليلية وليست توصيات استثمارية.</span>
      <a id="screenerDisclaimerLink" style="color:#7a5c00;text-decoration:underline;cursor:pointer;">التفاصيل الكاملة</a>
    </div>

    ${(window.__isAdmin || !(window.GShell && GShell.settings && GShell.settings.hide_basira_screen === true)) ? `<div class="section-card opp-entry bs-entry">
      <div><b>🔮 بصيرة AI — تحليل شامل لأي سهم</b><div class="u-fs12 u-muted">مؤشرات فنية + ذكاء اصطناعي + أخبار، وتوقع لأسبوع وشهر و3 و6 شهور وسنة — تحليل آلي وليس نصيحة استثمارية.</div></div>
      <button class="u-wa" id="goBasiraFromScreener">🔮 حلّل سهم</button>
    </div>` : ''}
    ${(window.__isAdmin || !(window.GShell && GShell.settings && GShell.settings.hide_opps_screen === true)) ? `<div class="section-card opp-entry">
      <div><b>🎯 البحث عن فرص حسب المؤشرات</b><div class="u-fs12 u-muted">اختار شراء أو بيع ومن 1 لـ 5 مؤشرات بإعداداتها، والموقع يدوّر في كل أسهم البورصة ويبعتلك إشعار وإيميل بالأسهم اللي انطبقت عليها الشروط. <b>ليست توصية استثمارية</b> — مجرد استخدام للمؤشرات المتاحة.</div></div>
      <button class="u-wa" id="goOppsBtn">🎯 البحث عن فرص</button>
    </div>` : ''}
    <div class="info">📊 اكتب رمز السهم واختر السوق والفترة، وستُجلب الأسعار (أعلى / أقل / آخر سعر) تلقائيًا متأخرة 15 دقيقة، ويمكنك تعديلها يدويًا. الشارت أدناه للعرض والقراءة فقط (مباشرة من TradingView) — الحساب يعتمد على الأرقام الموجودة في الخانات أدناه (التلقائية أو التي عدّلتها أنت).</div>

    <h2>شارت مباشر (للقراءة والمرجعية)</h2>
    <div class="section-card">
      <label>رمز السهم على TradingView</label>
      <div style="display:flex;gap:8px;">
        <input type="text" id="tv_symbol" placeholder="مثال: EGX:COMI" style="flex:1;">
        <button type="button" id="tv_loadBtn" class="u-wa">تحميل الشارت</button>
      </div>
      <div id="tvWidgetContainer" class="u-mt10"></div>
    </div>

    <h2 class="u-mt20">أداة التحليل الفني</h2>
    <div class="section-card">
      <div class="info u-mb10">هنا تُحسب مستويات الدعم والمقاومة بطريقتي فيبوناتشي ونقاط بيفوت معًا في الوقت نفسه، من أعلى وأقل سعر خلال الفترة (+ آخر سعر إغلاق).</div>

      <div class="grid2">
        <div><label>اسم السهم / الرمز <span class="u-danger">*</span></label>
          <input type="text" id="ta_symbol" placeholder="مثال: COMI" dir="ltr" autocomplete="off"></div>
        <div><label>السوق</label>
          <select id="ta_market">${Object.keys(MARKET_TO_CURRENCY_MAP).map(m=>`<option value="${m}">${m}</option>`).join('')}</select></div>
      </div>

      <label class="u-mt10">الفترة الزمنية</label>
      <select id="ta_hlPeriod">${Object.keys(TA_HL_PERIOD_LABELS).map(k=>`<option value="${k}" ${k==='month'?'selected':''}>${TA_HL_PERIOD_LABELS[k]}</option>`).join('')}</select>

      <!-- الإصدار 76: جلب أعلى/أقل/آخر سعر تلقائيًا (الخانات أدناه تبقى قابلة للتعديل اليدوي) -->
      <button type="button" class="secondary u-mt10" id="ta_fetchBtn">⚡ جلب الأسعار تلقائيًا</button>
      <button type="button" class="secondary u-mt10" id="ta_stockPageBtn">📈 صفحة السهم (شارت + خطتك + متابعة)</button>
      <div id="ta_fetchStatus" style="margin-top:8px;font-size:12.5px;"></div>

      <div class="grid2 u-mt8">
        <div><label>أعلى قمة سعرية خلال الفترة <span class="u-danger">*</span></label><input type="number" step="any" id="ta_high" placeholder="مثال: 52.30"></div>
        <div><label>أقل قاع سعري خلال الفترة <span class="u-danger">*</span></label><input type="number" step="any" id="ta_low" placeholder="مثال: 44.10"></div>
      </div>
      <div class="u-mt8">
        <label>آخر سعر إغلاق <span class="u-danger">*</span> <span class="ta-delay-badge" title="الأسعار التلقائية من مصدر بيانات مجاني متأخر">⏱ متأخر 15 دقيقة</span></label>
        <input type="number" step="any" id="ta_pivotClose" placeholder="مثال: 48.00">
        <div id="ta_closeNote" class="disclaimer u-mt4"></div>
      </div>

      <button id="ta_calcBtn" class="u-mt12">🔍 احسب</button>
    </div>

    <div id="ta_resultsArea"></div>
  </div>`;

  { const gb = document.getElementById('goOppsBtn'); if (gb) gb.onclick = () => renderOpportunities(); }   // الإصدار 101
  { const bb = document.getElementById('goBasiraFromScreener'); if (bb) bb.onclick = () => renderBasira(document.getElementById('scrSymbol') ? document.getElementById('scrSymbol').value.trim() : ''); }   // الإصدار 114
  document.getElementById('homeBtn').onclick=()=>{ email ? renderHome() : renderPublicHome(); };
  document.getElementById('screenerDisclaimerLink').onclick=()=>renderDisclaimerPage({ backTo: () => renderScreener() });

  document.getElementById('tv_loadBtn').onclick = () => renderTradingViewWidget(document.getElementById('tv_symbol').value.trim());
  renderTradingViewWidget('EGX:EGX30');

  /* ---------- الإصدار 76: جلب الأسعار تلقائيًا من السيرفر (market_quote.php) ----------
     بيتنفذ لما تكتب الرمز وتسيبه، أو تغيّر السوق أو الفترة، أو تدوس الزرار.
     القيم بتتكتب في الخانات، وتقدر تعدّلها يدوي بعدها عادي. */
  const taEl = (id) => document.getElementById(id);
  let taFetchSeq = 0, taSource = 'manual', taLastKey = '';
  const taStatus = (html, cls) => { const el = taEl('ta_fetchStatus'); if (el) el.innerHTML = html ? `<div class="${cls || 'info'} u-m0">${html}</div>` : ''; };
  // force = من الزرار (بيجيب دايمًا). التلقائي بيتجاهل نفس السهم/السوق/الفترة عشان ميكتبش فوق تعديلك اليدوي
  // الإصدار 88: صفحة السهم الموحّدة
  setTimeout(() => { const b = document.getElementById('ta_stockPageBtn'); if (b) b.onclick = () => { const sym = (taEl('ta_symbol') && taEl('ta_symbol').value || '').trim().toUpperCase(); if (!sym) { alert('اكتب رمز السهم الأول.'); return; } renderStockPage(sym, taEl('ta_market').value); }; }, 0);
  async function taFetchQuote(force){
    const symbol = taEl('ta_symbol').value.trim();
    if (!symbol) { taStatus('اكتب رمز السهم أولًا (مثل COMI).', 'error'); return; }
    const key = [symbol.toUpperCase(), taEl('ta_market').value, taEl('ta_hlPeriod').value].join('|');
    if (force !== true && key === taLastKey) return;
    taLastKey = key;
    if (!email) { promptSignupToContinue('سجّل حسابًا مجانيًا لتتمكن من جلب الأسعار تلقائيًا واستخدام أداة التحليل.', () => renderScreener()); return; }
    const my = ++taFetchSeq;
    const btn = taEl('ta_fetchBtn'); btn.disabled = true;
    taStatus('⏳ جاري جلب الأسعار...');
    let r;
    try { r = await apiGet('/market_quote.php?symbol=' + encodeURIComponent(symbol) + '&market=' + encodeURIComponent(taEl('ta_market').value) + '&period=' + encodeURIComponent(taEl('ta_hlPeriod').value)); }
    catch(e){ r = { success:false, message:'تعذّر الاتصال بمصدر الأسعار. اكتب الأرقام يدوي.' }; }
    if (my !== taFetchSeq || !taEl('ta_fetchBtn')) return;   // طلب أحدث بدأ أو الشاشة اتقفلت
    btn.disabled = false;
    if (!r || !r.success) { taSource = 'manual'; taLastKey = ''; taStatus('⚠️ ' + escapeHtml((r && r.message) || 'تعذّر جلب الأسعار.') + ' — تقدر تكتب الأرقام يدوي.', 'error'); return; }
    const f = (v) => (v == null ? '' : Number(v).toFixed(2));
    // أعلى/أقل ممكن ميبقوش متاحين لفترة معيّنة (partial) ← بنكتب آخر سعر بس ونسيب الباقي للعميل
    if (r.high != null) taEl('ta_high').value = f(r.high);
    if (r.low != null) taEl('ta_low').value = f(r.low);
    taEl('ta_pivotClose').value = f(r.last);
    taSource = 'auto';
    const delay = (r.delayMinutes == null ? 15 : r.delayMinutes);
    const delayTxt = delay > 0 ? `متأخر ${delay} دقيقة` : 'لحظي';
    const badge = document.querySelector('.ta-delay-badge'); if (badge) badge.textContent = '⏱ ' + delayTxt;
    const t = new Date(r.fetchedAt || r.lastTime);
    const when = isNaN(t) ? '' : t.toLocaleString('ar-EG', { dateStyle:'medium', timeStyle:'short' });
    const range = r.partial ? `<b>أعلى وأقل سعر لفترة «${escapeHtml(TA_HL_PERIOD_LABELS[r.period] || '')}» غير متاحة من المصدر الآن — اكتبها يدويًا أو اختر فترة أخرى.</b><br>`
      : `${escapeHtml(TA_HL_PERIOD_LABELS[r.period] || '')}: أعلى ${f(r.high)} · أقل ${f(r.low)} · `;
    taStatus(`✅ ${escapeHtml(r.name || r.symbol)} (${escapeHtml(r.symbol)}) — ${range}آخر سعر ${f(r.last)}${r.prevClose != null ? ` · الإغلاق السابق ${f(r.prevClose)}` : ''}<br><small>المصدر: ${escapeHtml(r.source)} — الأسعار ${delayTxt}. تقدر تعدّل أي رقم يدوي.</small>`, r.partial ? 'error' : 'info');
    taEl('ta_closeNote').textContent = `⏱ آخر سعر ${delayTxt}${when ? ' — وقت الجلب: ' + when : ''}`;
  }
  taEl('ta_fetchBtn').onclick = () => taFetchQuote(true);
  taEl('ta_symbol').addEventListener('change', () => { if (taEl('ta_symbol').value.trim()) taFetchQuote(); });
  taEl('ta_symbol').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); taFetchQuote(true); } });
  ['ta_market', 'ta_hlPeriod'].forEach(id => taEl(id).addEventListener('change', () => { if (taEl('ta_symbol').value.trim()) taFetchQuote(); }));
  // أي تعديل يدوي في الأرقام ← المصدر يبقى يدوي
  ['ta_high', 'ta_low', 'ta_pivotClose'].forEach(id => taEl(id).addEventListener('input', () => { taSource = 'manual'; taEl('ta_closeNote').textContent = ''; }));

  document.getElementById('ta_calcBtn').onclick = () => {
    if (!email) { promptSignupToContinue('سجّل حسابًا مجانيًا لتتمكن من استخدام أداة التحليل ورؤية النتيجة.', () => renderScreener()); return; }
    const resultsArea = document.getElementById('ta_resultsArea');
    const symbol = document.getElementById('ta_symbol').value.trim();
    if (!symbol) {
      resultsArea.innerHTML = '<div class="error u-mt12">اسم السهم / الرمز حقل إلزامي.</div>';
      return;
    }
    const high = parseFloat(document.getElementById('ta_high').value);
    const low = parseFloat(document.getElementById('ta_low').value);
    const close = parseFloat(document.getElementById('ta_pivotClose').value);
    if (isNaN(high) || isNaN(low) || high <= low) {
      resultsArea.innerHTML = '<div class="error u-mt12">أدخل أعلى قمة وأقل قاع صحيحين (القمة أكبر من القاع).</div>';
      return;
    }
    if (isNaN(close)) {
      resultsArea.innerHTML = '<div class="error u-mt12">آخر سعر إغلاق حقل إلزامي (ضروري لحساب نقاط بيفوت).</div>';
      return;
    }
    const periodLabel = TA_HL_PERIOD_LABELS[document.getElementById('ta_hlPeriod').value];
    const fib = ta_fibonacci(high, low);
    const pv = ta_pivotPoints(high, low, close);

    resultsArea.innerHTML = `<h2>نتيجة الحساب — ${escapeHtml(symbol)}</h2>
      <div class="section-card">
        <div style="font-size:12px;color:#888;margin-bottom:10px;">الفترة الزمنية: ${periodLabel} — أعلى: ${high.toFixed(2)} — أقل: ${low.toFixed(2)} — آخر إغلاق: ${close.toFixed(2)}</div>

        <div class="section-title">فيبوناتشي</div>
        <div class="grid2 u-mt4">
          <div>
            <div class="u-hint">3 مستويات دعم</div>
            ${fib.supports.map((v,i)=>`<div>الدعم ${i+1}: <strong>${v.toFixed(2)}</strong></div>`).join('')}
          </div>
          <div>
            <div class="u-hint">3 مستويات مقاومة</div>
            ${fib.resistances.map((v,i)=>`<div>المقاومة ${i+1}: <strong>${v.toFixed(2)}</strong></div>`).join('')}
          </div>
        </div>

        <div class="section-title" style="margin-top:16px;">نقاط بيفوت (Pivot Points)</div>
        <div style="font-size:12px;color:#666;margin:4px 0 6px;">نقطة المحور (Pivot): <strong>${pv.pivot.toFixed(2)}</strong></div>
        <div class="grid2">
          <div>
            <div class="u-hint">3 مستويات دعم</div>
            ${pv.supports.map((v,i)=>`<div>الدعم ${i+1}: <strong>${v.toFixed(2)}</strong></div>`).join('')}
          </div>
          <div>
            <div class="u-hint">3 مستويات مقاومة</div>
            ${pv.resistances.map((v,i)=>`<div>المقاومة ${i+1}: <strong>${v.toFixed(2)}</strong></div>`).join('')}
          </div>
        </div>

        <button class="small" style="width:auto;margin-top:14px;" data-gcall="__useForPlan" data-gargs="${gArgs([String(symbol), Number(close.toFixed(2)), String(taEl('ta_market').value)])}">أنشئ خطة لهذا السهم</button>
      </div>
      <p class="disclaimer">${taSource === 'auto' ? 'تنويه: الأرقام متجابة تلقائيًا من مصدر بيانات مجاني (متأخرة 15 دقيقة) - راجعها قبل أي قرار.' : 'تنويه: الحساب مبني على الأرقام التي أدخلتها يدويًا.'}</p>`;
  };

  window.__useForPlan = (symbol, price, market) => {
    renderPlanTypeChooser({ symbol, price, market });
  };
}


document.addEventListener('click', (e)=>{
  const btn = e.target.closest('button.secondary');
  if(!btn) return;
  document.querySelectorAll('button.secondary.btn-active').forEach(b=>b.classList.remove('btn-active'));
  btn.classList.add('btn-active');
});

