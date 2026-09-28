/* GRIFFINE — كود الواجهة الأساسي (اتفصل من index.php في الإصدار 68) */
const GRIFFINE_LOGO_B64 = location.origin + '/img/griffine-logo-light.webp?v=84';   // الإصدار 84: ملف صورة (بيتخزّن في المتصفح) بدل Base64 جوه الكود
/* ================== حسابات مساعدة ================== */
function daysBetween(isoStart, isoEnd){
  if(!isoStart) return null;
  const start = new Date(isoStart);
  const end = isoEnd ? new Date(isoEnd) : new Date();
  return Math.floor((end - start) / 86400000);
}
function formatDateAr(iso){
  if(!iso) return '-';
  try{ return new Date(iso).toLocaleDateString('ar-EG'); }catch(e){ return iso; }
}
/* تاريخ + وقت كامل دايمًا (من غير منطق "النهارده" النسبي) - يُستخدم في سجلات زي الصفقات المغلقة */
function formatDateTimeAr(iso){
  if(!iso) return '-';
  try{
    const d = new Date(iso.includes('T') ? iso : iso.replace(' ','T'));
    if (isNaN(d.getTime())) return formatDateAr(iso);
    const timePart = d.toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit', hour12:true });
    return `${d.toLocaleDateString('ar-EG')} ${timePart}`;
  }catch(e){ return iso; }
}
/* تنسيق وقت رسائل الشات على طريقة واتساب/ماسنجر: النهارده يظهر الوقت بس، أي يوم تاني يظهر التاريخ + الوقت */
function formatChatTime(iso){
  if(!iso) return '';
  try{
    const d = new Date(iso.replace(' ','T'));
    if(isNaN(d.getTime())) return '';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now); yesterday.setDate(now.getDate()-1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const timePart = d.toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit', hour12:true });
    if (isToday) return timePart;
    if (isYesterday) return `أمس ${timePart}`;
    return `${d.toLocaleDateString('ar-EG')} ${timePart}`;
  }catch(e){ return ''; }
}
function fmt2(n){
  if(n==null || isNaN(n)) return '-';
  return Number(n).toFixed(2);
}
function fmtMoney(n){
  if(n==null || isNaN(n)) return '-';
  return Number(n).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
}
/* حساب الكمية: عدد صحيح من الأسهم عادةً، لكن لو المبلغ المخصص أقل من سعر الوحدة نفسها
   (زي الذهب أو أي أصل غالي بالجرام/الوحدة)، يرجع كسر عشري يمثل نسبة من الوحدة بدل ما يطلع صفر */
function computeQty(amount, price){
  if (!(price>0)) return 0;
  const raw = amount/price;
  if (raw >= 1) return Math.floor(raw);
  return +raw.toFixed(4);
}
function fmtQty(n){
  if(n==null || isNaN(n)) return '-';
  if (Number.isInteger(n)) return String(n);
  return Number(n).toFixed(4).replace(/0+$/,'').replace(/\.$/,'');
}
/* بعض تواريخ الأحداث (زي closedDate بتاعة الصفقات المغلقة) متخزنة بتاريخ+وقت كامل (ISO)،
   بينما فلتر الفترة (من تاريخ / إلى تاريخ) بيرجع تاريخ بسيط بس من غير وقت. المقارنة النصية المباشرة
   بينهم كانت بتفشل: أي حدث حصل النهاردة (بتاريخ+وقت) كان بيتقارن بـ"إلى" (تاريخ بس) ويطلع "أكبر" منه نصيًا
   فيتم استبعاده غلط من الفترة - عشان كده لازم ناخد أول 10 حروف بس (YYYY-MM-DD) من أي تاريخ قبل أي مقارنة فترات. */
function dateOnly(s){ return s ? String(s).slice(0,10) : s; }
/* يبني ملف إكسيل بصيغة MHTML (multipart) - الطريقة الموثوقة لتضمين صورة (زي شارت) داخل إكسيل،
   لأن إكسيل غالبًا لا يعرض صور data-URI العادية جوه جدول HTML */
function buildAndDownloadMhtmlXls(htmlBody, chartDataUrl, filename){
  const boundary = "----=_NextPart_Griffine_" + Date.now();
  const base64Data = chartDataUrl.split(',')[1] || '';
  const mhtml =
`MIME-Version: 1.0
Content-Type: multipart/related; boundary="${boundary}"

--${boundary}
Content-Type: text/html; charset="utf-8"
Content-Location: report.html

${htmlBody}

--${boundary}
Content-Type: image/png
Content-Transfer-Encoding: base64
Content-Location: chart.png

${base64Data}

--${boundary}--`;
  const blob = new Blob([mhtml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click(); URL.revokeObjectURL(url);
}
function computeSellTarget(avgCost, profitTarget){
  if(avgCost==null) return null;
  return avgCost*(1+(profitTarget||0)/100);
}

/* حساب القيم تلقائيًا بناءً على نسبة المخاطرة (الصيغة المعتمدة) */
/* حساب المعادلة الجديدة القائمة على مبادئ موثقة (Fixed Fractional Sizing + نسبة ربح:مخاطرة 2:1 + سقف زيادة 30% + تغطية 50% انخفاض) */
function computeRiskDerived(capital, riskPercent){
  const r = riskPercent;
  const dropPercent = +r.toFixed(2);
  const profitTarget = +(r*2).toFixed(2);
  const volumeIncrease = +Math.min(r, 30).toFixed(2);
  const seedAmount = +(capital*r/100).toFixed(2);
  let levelsCount = 7;
  if (r>0 && r<100) {
    levelsCount = Math.max(1, Math.ceil(Math.log(0.5)/Math.log(1-r/100)));
    levelsCount = Math.min(levelsCount, 60); // سقف أمان لمنع عدد غير عملي من المستويات عند نسب مخاطرة صغيرة جدًا
  }
  return { seedAmount, profitTarget, volumeIncrease, dropPercent, levelsCount };
}

/* التحقق من منطقية المدخلات اليدوية واقتراح تصحيح متوازن (نفس المعادلة الجديدة كمرجع) */
function validateManualInputs({ capital, seedAmount, profitTarget, dropPercent, volumeIncrease }){
  const issues = [];
  const impliedRisk = profitTarget>0 ? profitTarget/2 : 2.5;
  const suggestedDropPercent = +impliedRisk.toFixed(2);
  const suggestedVolumeIncrease = +Math.min(impliedRisk, 30).toFixed(2);
  const suggestedSeedAmount = +(capital*impliedRisk/100).toFixed(2);

  if (Math.abs(dropPercent - suggestedDropPercent) > suggestedDropPercent*0.4){
    issues.push({ field:'dropPercent', label:'نسبة الانخفاض لكل مستوى', current:dropPercent, suggested:suggestedDropPercent,
      message:`بناءً على نسبة الربح اللي حددتها (نسبة ربح:مخاطرة 2:1)، نسبة الانخفاض المتوازنة المقترحة هي ${suggestedDropPercent}%` });
  }
  if (Math.abs(volumeIncrease - suggestedVolumeIncrease) > suggestedVolumeIncrease*0.4){
    issues.push({ field:'volumeIncrease', label:'نسبة زيادة قيمة الشراء', current:volumeIncrease, suggested:suggestedVolumeIncrease,
      message:`نسبة زيادة الشراء المتوازنة المقترحة هي ${suggestedVolumeIncrease}% (بسقف أقصى 30%)` });
  }
  if (seedAmount && Math.abs(seedAmount - suggestedSeedAmount) > suggestedSeedAmount*0.6){
    issues.push({ field:'seedAmount', label:'مبلغ الشراء الأول', current:seedAmount, suggested:suggestedSeedAmount,
      message:`مبلغ الشراء الأول المتوازن المقترح بناءً على رأس المال هو ${suggestedSeedAmount}` });
  }
  if (dropPercent>0 && dropPercent*4 > 90){
    issues.push({ field:'dropPercent', label:'نسبة الانخفاض لكل مستوى', current:dropPercent, suggested:suggestedDropPercent,
      message:`نسبة الانخفاض دي كبيرة جدًا وممكن توصل بالسعر لصفر بسرعة كبيرة` });
  }
  return issues;
}

/* ================== توليد المستويات ================== */
function buildLevelsManual({ levels }) {
  const plan = [];
  for (let i=0;i<levels;i++){
    plan.push({ level:i+1, executed:false, actualQty:null, actualPrice:null, execDate:null, sells:[] });
  }
  return plan;
}
function buildLevelsAuto({ capital, volumeIncrease, seedAmount }) {
  const r = 1 + (volumeIncrease/100);
  const plan = []; let amount=seedAmount, cum=0, i=0;
  while (cum < capital && i < 200) {
    let thisAmount = amount;
    if (cum + thisAmount > capital) thisAmount = capital - cum;
    if (thisAmount <= 0) break;
    plan.push({ level:i+1, executed:false, actualQty:null, actualPrice:null, execDate:null, sells:[] });
    cum += thisAmount;
    amount = amount*r;
    i++;
    if (thisAmount < capital*0.0005) break;
  }
  return plan;
}

/* لو رأس المال بيسمح بمستويات أكتر من اللي موجودة حاليًا في الخطة (بعد زيادة رأس المال مثلاً)،
   يفتح مستويات إضافية تلقائيًا تتناسب مع رأس المال الجديد - بيرجع true لو أضاف حاجة */
function ensureEnoughLevels(planObj){
  const d = (planObj.dropPercent||0)/100, r = 1+(planObj.volumeIncrease||0)/100;
  let totalSpent=0, lastAmount=null, lastPrice=null, lastIdx=-1;
  planObj.levels.forEach((lv, idx) => {
    if (lv.executed) {
      const amt = lv.actualQty*lv.actualPrice;
      totalSpent += amt; lastAmount = amt; lastPrice = lv.actualPrice; lastIdx = idx;
    }
  });
  let price = (lastIdx===-1) ? planObj.currentPrice : lastPrice;
  let amount = (lastIdx===-1) ? planObj.seedAmount : lastAmount;
  let idx = lastIdx+1, runningTotal = totalSpent, added = false;
  while (idx < 300) {
    let thisPrice, thisAmount;
    if (idx === lastIdx+1 && lastIdx===-1) { thisPrice = planObj.currentPrice; thisAmount = planObj.seedAmount; }
    else { thisPrice = price*(1-d); if(thisPrice<=0) thisPrice = price*0.5; thisAmount = amount*r; }
    const qty = computeQty(thisAmount, thisPrice);
    const actualAmount = qty*thisPrice;
    if (runningTotal + actualAmount > planObj.capital + 1e-6) break;
    runningTotal += actualAmount;
    price = thisPrice; amount = thisAmount;
    if (idx >= planObj.levels.length) {
      planObj.levels.push({ level: idx+1, executed:false, actualQty:null, actualPrice:null, execDate:null, sells:[] });
      added = true;
    }
    idx++;
  }
  return added;
}

/* ================== محاكاة كاملة للخطة ================== */
function simulatePlan(planObj) {
  const { levels, capital, dropPercent, volumeIncrease, profitTarget, currentPrice } = planObj;
  const d = (dropPercent||0)/100, r = 1+(volumeIncrease||0)/100;

  let heldQty=0, heldCostBasis=0, totalBuyAmountSpent=0, totalBoughtQty=0;
  let totalSoldQty=0, totalSoldAmount=0, totalRealizedProfit=0;
  let lastBoughtIndex=-1, lastBoughtPrice=null, lastBoughtAmount=null;
  let lastSellDate=null, lastSellRowIndex=-1;

  const rows = [];
  levels.forEach((lv, idx) => {
    let row = { level: lv.level, executed: lv.executed, sells: [] };
    if (lv.executed) {
      const amount = lv.actualQty*lv.actualPrice;
      heldQty += lv.actualQty; heldCostBasis += amount;
      totalBuyAmountSpent += amount; totalBoughtQty += lv.actualQty;
      lastBoughtIndex = idx; lastBoughtPrice = lv.actualPrice; lastBoughtAmount = amount;
      row.price = lv.actualPrice; row.amount = +amount.toFixed(2); row.qty = lv.actualQty;
      row.execDate = lv.execDate;

      (lv.sells||[]).forEach((sell, sIdx) => {
        const avgCostNow = heldQty>1e-9 ? heldCostBasis/heldQty : 0;
        const s = Math.min(sell.qty, heldQty);
        const profitThis = (sell.price - avgCostNow) * s;
        heldCostBasis -= avgCostNow * s;
        heldQty -= s;
        totalSoldQty += s; totalSoldAmount += s*sell.price; totalRealizedProfit += profitThis;
        row.sells.push({ idx:sIdx, qty:s, price:sell.price, profit:+profitThis.toFixed(2), date: sell.date, avgCostAtSale:+avgCostNow.toFixed(4) });
        lastSellDate = sell.date; lastSellRowIndex = idx;
      });
    }
    row.cumHeldQty = +Math.max(heldQty,0).toFixed(4);
    row.cumAvgCost = heldQty>1e-9 ? +(heldCostBasis/heldQty).toFixed(4) : null;
    row.cumSellTarget = row.cumAvgCost!=null ? +computeSellTarget(row.cumAvgCost, profitTarget).toFixed(4) : null;
    row.projectedProfit = (row.cumSellTarget!=null && row.cumAvgCost!=null) ? +((row.cumSellTarget - row.cumAvgCost) * row.cumHeldQty).toFixed(2) : null;
    row.cumRealizedProfit = +totalRealizedProfit.toFixed(2);
    rows.push(row);
  });

  const isClosedEarly = totalBoughtQty>0 && heldQty <= totalBoughtQty*0.0005;
  if (isClosedEarly && lastSellRowIndex>=0) rows[lastSellRowIndex].tradeCloseDate = lastSellDate;
  rows.forEach(row => {
    if (row.executed) row.daysElapsed = daysBetween(row.execDate, isClosedEarly ? lastSellDate : null);
  });

  const avgCostCurrent = heldQty>1e-9 ? heldCostBasis/heldQty : (totalBoughtQty>0 ? totalBuyAmountSpent/totalBoughtQty : null);
  const sellTargetCurrent = avgCostCurrent!=null ? computeSellTarget(avgCostCurrent, profitTarget) : null;

  // المستويات المعلّقة: تكمل من كمية وسعر آخر مستوى اتنفذ فعليًا (مش من رقم نظري مقطوع الصلة)،
  // ولو أي مستوى هيخلي الإجمالي يتجاوز رأس المال، بيتوقف عرض المستويات من هنا (يُلغى هو واللي بعده تلقائيًا)
  let spacingClamped = false;
  let runningTotal = totalBuyAmountSpent;
  let priceCursor = (lastBoughtIndex===-1) ? currentPrice : lastBoughtPrice;
  let amountCursor = (lastBoughtIndex===-1) ? planObj.seedAmount : lastBoughtAmount;

  for (let idx=lastBoughtIndex+1; idx<levels.length; idx++) {
    let price, amount;
    if (idx === lastBoughtIndex+1 && lastBoughtIndex===-1) {
      price = currentPrice;
      amount = planObj.seedAmount;
    } else {
      price = priceCursor * (1-d);
      if (price <= 0) { price = priceCursor * 0.5; spacingClamped = true; }
      amount = amountCursor * r;
    }
    const qty = computeQty(amount, price);
    const actualAmount = qty*price;
    const maxQtyAtPrice = price>0 ? computeQty(Math.max(capital - runningTotal + 1e-6, 0), price) : 0;

    if (runningTotal + actualAmount > capital + 1e-6) {
      for (let j=idx; j<levels.length; j++) rows[j].trimmed = true;
      break; // تقليص تلقائي للمستوى ده وكل اللي بعده - تجاوز رأس المال
    }

    rows[idx].price = +price.toFixed(4);
    rows[idx].amount = +actualAmount.toFixed(2);
    rows[idx].qty = qty;
    rows[idx].maxQty = maxQtyAtPrice;
    rows[idx].isNext = (idx === lastBoughtIndex+1);
    runningTotal += actualAmount;
    priceCursor = price; amountCursor = amount;
  }

  const isClosed = totalBoughtQty>0 && heldQty <= totalBoughtQty*0.0005;

  return {
    rows, lastBoughtIndex, lastBoughtPrice, heldQty: Math.max(heldQty,0), avgCostCurrent, sellTargetCurrent,
    totalBuyAmountSpent, totalBoughtQty, totalSoldQty, totalSoldAmount, totalRealizedProfit, isClosed,
    avgExitPrice: totalSoldQty>0 ? totalSoldAmount/totalSoldQty : null,
    avgEntryPrice: totalBoughtQty>0 ? totalBuyAmountSpent/totalBoughtQty : null,
    spacingClamped,
  };
}

/* ================== الاتصال بالسيرفر (PHP + MySQL) ================== */
const API_BASE = ''; // ملفات الـPHP في نفس مجلد index.html على هوستنجر

async function apiPost(path, data, _retried){
  const form = new FormData();
  Object.keys(data||{}).forEach(k=>{ if(data[k]!=null) form.append(k, data[k]); });
  if (window.__csrfToken) form.append('csrf_token', window.__csrfToken);
  const res = await fetch(API_BASE+path, { method:'POST', body:form, credentials:'same-origin' });
  const out = await res.json();
  // لو السيرفر رفض الطلب لعدم تطابق توكن الجلسة (403 - نادرًا بيحصل بسبب تزامن أول تحميل للصفحة)،
  // بنجدد التوكن ونعيد نفس الطلب تلقائيًا مرة واحدة بدل ما المستخدم يضطر يضغط تاني بنفسه
  if (!_retried && res.status === 403 && out && out.success === false) {
    invalidateSessionCache();
    await getSession();
    return apiPost(path, data, true);
  }
  return out;
}
async function apiGet(path){
  const res = await fetch(API_BASE+path, { method:'GET', credentials:'same-origin' });
  return res.json();
}

window.__isAdmin = false;
window.__isSuperAdmin = false;
window.__myPermissions = [];
window.__csrfToken = null;
function hasPermission(key){ return window.__isSuperAdmin || window.__myPermissions.includes(key); }

/* =====================================================================
   الإصدار 84: نوافذ التأكيد والإدخال جوه التطبيق (Bottom Sheet) بدل نوافذ المتصفح القديمة
   confirm / prompt (شكلها بدائي ومبتدعمش العربي كويس، وبعضها كان "موافق/إلغاء" لاختيار حاجة ← الأدمن بيغلط)
     gConfirm(رسالة, {ok, cancel, danger})  ← true / false
     gChoice(رسالة, [اختيار1, اختيار2, ...])  ← رقم الاختيار (0..) أو null لو اتقفلت
     gPrompt(رسالة, قيمة افتراضية, {type})   ← النص أو null
   النص بيتعرض كنص عادي (textContent) - مفيش أي HTML بيتنفّذ
   ===================================================================== */
function gSheet(message, buttons, input){
  return new Promise((resolve) => {
    if (document.documentElement.classList.contains('gs-exporting')) { resolve(null); return; }   // أثناء تصوير الشاشات PDF
    const prev = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'g-sheet-wrap';
    wrap.innerHTML = `<div class="g-sheet" role="dialog" aria-modal="true"><div class="g-sheet-grab"></div><div class="g-sheet-msg"></div>${input ? `<input class="g-sheet-input" type="${input.type || 'text'}" dir="auto">` : ''}<div class="g-sheet-btns"></div></div>`;
    wrap.querySelector('.g-sheet-msg').textContent = String(message || '');
    const inp = wrap.querySelector('.g-sheet-input');
    if (inp) { inp.value = input.value == null ? '' : String(input.value); if (input.type === 'number') inp.inputMode = 'numeric'; }
    const done = (v) => { document.removeEventListener('keydown', onKey, true); wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 180); try { prev && prev.focus && prev.focus(); } catch(e){} resolve(v); };
    const box = wrap.querySelector('.g-sheet-btns');
    buttons.forEach((b) => {
      const el = document.createElement('button'); el.type = 'button';
      el.className = 'g-sheet-btn ' + (b.cls || '');
      el.textContent = b.label;
      el.onclick = () => done(typeof b.value === 'function' ? b.value(inp) : b.value);
      box.appendChild(el);
    });
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); done(buttons.find(b => b.cancel) ? (typeof buttons.find(b => b.cancel).value === 'function' ? null : buttons.find(b => b.cancel).value) : null); }
      else if (e.key === 'Enter' && inp && document.activeElement === inp) { e.preventDefault(); box.querySelector('.g-sheet-btn.primary')?.click(); }
    };
    document.addEventListener('keydown', onKey, true);
    wrap.addEventListener('click', (e) => { if (e.target === wrap) { const c = buttons.find(b => b.cancel); done(c ? (typeof c.value === 'function' ? null : c.value) : null); } });
    document.body.appendChild(wrap);
    requestAnimationFrame(() => { wrap.classList.add('open'); (inp || box.querySelector('.g-sheet-btn.primary') || box.firstChild).focus(); });
  });
}
function gConfirm(message, opts){
  opts = opts || {};
  return gSheet(message, [
    { label: opts.ok || 'تأكيد', value: true, cls: 'primary' + (opts.danger || /حذف|نهائي|⚠️/.test(message) ? ' danger' : '') },
    { label: opts.cancel || 'إلغاء', value: false, cls: 'ghost', cancel: true },
  ]).then(v => v === true);
}
function gChoice(message, labels){
  return gSheet(message, labels.map((l, i) => ({ label: l, value: i, cls: i === 0 ? 'primary' : '' })).concat([{ label: 'إلغاء', value: null, cls: 'ghost', cancel: true }]));
}
function gPrompt(message, def, opts){
  opts = opts || {};
  return gSheet(message, [
    { label: opts.ok || 'حفظ', value: (inp) => inp.value.trim(), cls: 'primary' },
    { label: 'إلغاء', value: null, cls: 'ghost', cancel: true },
  ], { value: def, type: opts.type });
}

async function getPageContent(key){ try{ return await apiGet('/get_page_content.php?key=' + encodeURIComponent(key)); }catch(e){ return {success:false}; } }
async function getAllPageContents(){ try{ return await apiGet('/get_page_content.php'); }catch(e){ return {success:false}; } }
async function savePageContent(key, content){ return apiPost('/save_page_content.php', { key, content }); }

/* نظام عناوين الشاشات القابلة للتعديل من لوحة التحكم:
   بيحمّل كل عناوين الشاشات المخصصة مرة واحدة عند فتح الموقع (مفتاح كل عنوان title__اسم_الشاشة)،
   وأي شاشة تقدر تنادي pageTitle('اسم_الشاشة', 'العنوان الافتراضي') وهي بترجع العنوان المخصص لو موجود وإلا الافتراضي. */
window.__pageTitles = {};
async function primePageTitles(){
  try{
    const r = await getAllPageContents();
    const contents = (r && r.success) ? (r.contents || {}) : {};
    const titles = {};
    Object.keys(contents).forEach(k => {
      if (k.indexOf('title__') === 0 && contents[k]) titles[k.slice(7)] = contents[k];
    });
    window.__pageTitles = titles;
  }catch(e){ window.__pageTitles = window.__pageTitles || {}; }
}
function pageTitle(screenKey, fallback){
  window.__lastPageKey = screenKey; // بيتسجّل هنا عشان نظام خلفيات الشاشات (applyScreenBackgroundToDom) يعرف احنا في أي شاشة
  const v = window.__pageTitles && window.__pageTitles[screenKey];
  return (v && String(v).trim() !== '') ? v : fallback;
}

/* نظام خلفيات الشاشات القابلة للتخصيص من لوحة التحكم (🎨 تنسيق الموقع ← خلفية شاشة محددة):
   بيحمّل كل خلفيات الشاشات مرة واحدة عند فتح الموقع، وبعد كل تغيير شاشة (لأي شاشة بتنادي pageTitle)
   بيتفحص تلقائيًا لو للشاشة الحالية خلفية مخصصة ويحطها ورا المحتوى بشكل حي ومدموج، من غير ما أي شاشة
   تحتاج تتعدّل بنفسها. الخلفيات لا تتأثر بالثيمات (الألوان/الخط) والعكس، وكل واحدة مستقلة عن التانية. */
window.__pageBackgrounds = {};
async function primePageBackgrounds(){
  try{
    const r = await getAllPageBackgrounds();
    window.__pageBackgrounds = (r && r.success) ? (r.images || {}) : {};
  }catch(e){ window.__pageBackgrounds = window.__pageBackgrounds || {}; }
}
function applyScreenBackgroundToDom(){
  const key = window.__lastPageKey;
  const containerEl = document.querySelector('#app > .container');
  if (!containerEl) return;
  // الشاشات دي ليها تصميم خاص بالخلفية بالفعل (شاشة الدخول، الترحيب، والرئيسية) فمنطبّقش الطبقة العامة فوقها
  if (key === 'login' || key === 'splash' || key === 'home') {
    containerEl.classList.remove('has-screen-bg');
    const stray = containerEl.querySelector(':scope > .screen-bg-layer');
    if (stray) stray.remove();
    return;
  }
  const pv = window.__pageBackgroundsPreview;
  const img = key ? ((pv && Object.prototype.hasOwnProperty.call(pv, key)) ? pv[key] : (window.__pageBackgrounds ? window.__pageBackgrounds[key] : null)) : null;
  let layer = containerEl.querySelector(':scope > .screen-bg-layer');
  if (!img) {
    if (layer) layer.remove();
    containerEl.classList.remove('has-screen-bg');
    return;
  }
  containerEl.classList.add('has-screen-bg');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'screen-bg-layer';
    containerEl.insertBefore(layer, containerEl.firstChild);
  }
  const existingImg = layer.querySelector('img');
  if (!existingImg || existingImg.getAttribute('src') !== img) {
    layer.innerHTML = '';
    const im = document.createElement('img');
    im.src = img; im.alt = ''; im.draggable = false;
    layer.appendChild(im);
  }
}
// بيراقب أي تغيير في محتوى الشاشة (كل شاشة بتستبدل innerHTML كله) ويطبّق الخلفية المناسبة بعدها تلقائيًا
function initScreenBackgroundWatcher(){
  const target = document.getElementById('app');
  if (!target) return;
  const obs = new MutationObserver(() => { applyScreenBackgroundToDom(); if (typeof updateBgShortcut === 'function') updateBgShortcut(); });
  obs.observe(target, { childList: true });
}

async function getPlans(email){ return await getSharedData('plans', email); }
async function savePlans(email,p){ await saveSharedData('plans', email, p); }
async function getGridPlans(email){ return await getSharedData('grid_plans', email); }
async function saveGridPlans(email,p){ await saveSharedData('grid_plans', email, p); }

/* بيانات الخطط (DCA/Grid) بقت متخزنة في قاعدة البيانات بدل المتصفح بس - عشان تظهر لنفس
   الحساب من أي جهاز (موبايل/لابتوب/تابلت). كل مرة تتقرا، بتتدمج بيانات الجهاز المحلية (لو
   فيها أسهم مش موجودة على السيرفر لسه) مع بيانات السيرفر - عشان محدش يفقد بياناته مهما كان
   ترتيب فتح الأجهزة المختلفة (دمج بدل ما جهاز يمسح بيانات جهاز تاني). */
// الأسهم اللي الجهاز شايفها من السيرفر + رقم نسخة كل سهم (بيتبعت مع الحفظ)
window.__planBase = window.__planBase || {};
function mergePlanMaps(serverMap, localMap, deletedList){
  const merged = Object.assign({}, serverMap||{});
  const deleted = new Set(deletedList||[]);
  let changed = false;
  Object.keys(localMap||{}).forEach(sym=>{
    // سهم اتمسح من جهاز تاني - منرجّعوش من النسخة المحلية القديمة
    if (!(sym in merged) && deleted.has(sym)) return;
    if (!(sym in merged)) { merged[sym] = localMap[sym]; changed = true; return; }
    const a = merged[sym], b = localMap[sym];
    const aCount = (a && a.closedTrades && a.closedTrades.length) || 0;
    const bCount = (b && b.closedTrades && b.closedTrades.length) || 0;
    // نفس السهم موجود في الاتنين - نفضّل النسخة اللي فيها صفقات مغلقة أكتر (الأكثر اكتمالًا / الحقيقية غالبًا)
    if (bCount > aCount) { merged[sym] = b; changed = true; }
  });
  return { merged, changed };
}
async function getSharedData(key, email){
  let serverMap = null, gotServer = false, deletedList = [];
  try {
    const r = await apiGet('/user_data_get.php?key='+encodeURIComponent(key));
    if (r && r.success) {
      serverMap = (r.value != null) ? JSON.parse(r.value) : {};
      deletedList = r.deleted || [];
      window.__planBase[key] = r.versions || {};
      gotServer = true;
    }
  } catch(e){}
  let localMap = {};
  try { localMap = JSON.parse(localStorage.getItem('griffine_'+key+':'+email)||'{}'); } catch(e){}
  if (!gotServer) return localMap; // السيرفر مش متاح دلوقتي (مشكلة نت مثلًا) - نرجع النسخة المحلية عشان الشغل ميتوقفش
  const { merged, changed } = mergePlanMaps(serverMap, localMap, deletedList);
  if (changed) { await saveSharedData(key, email, merged); }
  else { try { localStorage.setItem('griffine_'+key+':'+email, JSON.stringify(merged)); } catch(e){} }
  return merged;
}
async function saveSharedData(key, email, value){
  try {
    const r = await apiPost('/user_data_save.php', { key, value: JSON.stringify(value), base: JSON.stringify(window.__planBase[key] || {}) });
    if (r && r.success && r.versions) window.__planBase[key] = r.versions;
  } catch(e){}
  try { localStorage.setItem('griffine_'+key+':'+email, JSON.stringify(value)); } catch(e){}
}

/* الجلسة والدخول - بتتحقق من السيرفر بدل ما تكون محفوظة في المتصفح بس */
let __sessionPromise = null;
async function getSession(){
  // بنخزّن نتيجة الفحص في Promise واحد مشترك - كل استدعاء لـgetSession() في أي مكان بالموقع
  // بيستخدم نفس النتيجة، بدل ما كل واحد يبعت طلب لوحده ويحصل تسابق (Race Condition) بينهم
  if (!__sessionPromise) {
    __sessionPromise = (async () => {
      try{
        const r = await apiGet('/session_check.php');
        if (r.csrfToken) window.__csrfToken = r.csrfToken;
        if (r.logged_in) {
          window.__isAdmin = !!r.is_admin;
          window.__isSuperAdmin = !!r.is_super_admin;
          window.__myPermissions = r.permissions || [];
          window.__emailVerified = !!r.email_verified;
          if (window.__isAdmin && !window.__chatUnreadPollStarted) {
            window.__chatUnreadPollStarted = true;
            updateChatUnreadBadge();
            window.__chatUnreadPoll = setInterval(updateChatUnreadBadge, 8000);
          }
          return r.email;
        }
        // الإصدار 78: مش مسجّل دخول ← كل علامات الإدارة بتتمسح (كان __isSuperAdmin بيفضل من الحساب اللي قبله)
        window.__isAdmin = false;
        window.__isSuperAdmin = false;
        window.__myPermissions = [];
        return null;
      }catch(e){ return null; }
    })();
  }
  return __sessionPromise;
}
function invalidateSessionCache(){ __sessionPromise = null; }
async function setSession(email){
  // بيتسجل فعليًا في login.php/register.php - الاستدعاء ده بيتعامل بس مع الخروج (تسجيل خروج)
  invalidateSessionCache();
  if (!email) {
    try{ await apiPost('/logout.php', {}); }catch(e){}
    window.__isAdmin = false; window.__isSuperAdmin = false; window.__myPermissions = [];
    resetGuestChatIdentity();   // الإصدار 83: أيقونة الشات بعد الخروج تبدأ فاضية (مش محادثة الحساب)
  }
}
/* الإصدار 83: بعد تسجيل الخروج الجهاز ياخد معرّف زائر جديد - فالزائر (أو أي حد تاني على نفس الجهاز)
   ميشوفش محادثة الحساب اللي كان مسجّل. (قبل كده المعرّف القديم كان بيفضل وأيقونة الشات فيها المحادثة) */
function resetGuestChatIdentity(){
  try {
    const old = localStorage.getItem('griffine_visitor_id');
    if (old) { localStorage.removeItem('griffine_chat_started_' + old); localStorage.removeItem('griffine_chat_seen_admin_' + old); }
    localStorage.removeItem('griffine_visitor_id');
    localStorage.removeItem('griffine_chat_email');
  } catch(e){}
}

async function getSubscription(email){ try{ return JSON.parse(localStorage.getItem('griffine_subscription:'+email)||'null'); }catch(e){ return null; } }
async function saveSubscription(email, sub){ localStorage.setItem('griffine_subscription:'+email, JSON.stringify(sub)); }

/* المشتركون - بيتحفظوا فعليًا في قاعدة بيانات MySQL على السيرفر */
async function getAllSubscribers(){
  try{
    const r = await apiGet('/subscribers_list.php');
    return r.success ? r.subscribers : [];
  }catch(e){ return []; }
}
async function saveAllSubscribers(list){ /* غير مستخدمة بعد الربط بالسيرفر - كل تعديل بيروح مباشرة عن طريق الـAPI المخصص له */ }
async function addSubscriberRecord(record){
  return apiPost('/subscribers_add.php', {
    name: record.name, phone: record.phone, contactEmail: record.contactEmail,
    planId: record.planId, planName: record.planName, amount: record.amount,
    currency: record.currency, market: record.market,
    paymentMethod: record.paymentMethod, paymentRef: record.paymentRef,
    paymentProof: record.paymentProof, startDate: record.startDate, endDate: record.endDate,
  });
}
async function toggleSubscriberActive(id){ return apiPost('/subscribers_toggle_active.php', { id }); }
async function updateSubscriberReminder(id, enabled, intervalDays){
  return apiPost('/subscribers_update_reminder.php', { id, enabled: enabled?1:0, intervalDays });
}
async function deleteSubscriber(id){ return apiPost('/subscribers_delete.php', { id }); }
async function getArchivedCustomers(){ try{ return await apiGet('/subscribers_archived_list.php'); }catch(e){ return {success:false}; } }
async function restoreCustomer(accountEmail){ return apiPost('/subscribers_restore.php', { accountEmail }); }
async function purgeCustomer(accountEmail){ return apiPost('/subscribers_purge.php', { accountEmail }); }
async function forgotPassword(email){ return apiPost('/forgot_password.php', { email }); }
async function resetPassword(token, password){ return apiPost('/reset_password.php', { token, password }); }
async function sendReminderEmailsNow(){ return apiGet('/send_reminders.php'); }
async function getBlacklist(){ try{ return await apiGet('/blacklist_list.php'); }catch(e){ return {success:false}; } }
async function addToBlacklist(type, value, reason){ return apiPost('/blacklist_add.php', { type, value, reason }); }
async function removeFromBlacklist(id){ return apiPost('/blacklist_remove.php', { id }); }
async function resendVerificationEmail(){ return apiPost('/resend_verification.php', {}); }
async function verifyEmailToken(token){ return apiPost('/verify_email.php', { token }); }
async function getStaffList(){ try{ return await apiGet('/staff_list.php'); }catch(e){ return {success:false}; } }
async function addStaffMember(email, jobTitle){ return apiPost('/staff_add.php', { email, jobTitle }); }
async function updateStaffPermissions(staffId, permissions){ return apiPost('/staff_update_permissions.php', { staffId, permissions: permissions.join(',') }); }
async function removeStaffMember(staffId){ return apiPost('/staff_remove.php', { staffId }); }
async function getSiteContent(){ try{ return await apiGet('/site_content_get.php'); }catch(e){ return {success:false}; } }
async function saveSiteContent(key, value){ return apiPost('/site_content_save.php', { key, value }); }
async function getAllPageBackgrounds(){ try{ return await apiGet('/page_background_get.php'); }catch(e){ return {success:false}; } }
async function savePageBackground(key, image){ return apiPost('/page_background_save.php', { key, image }); }
async function getMySubscriptionHistory(){ try{ return await apiGet('/my_subscription_history.php'); }catch(e){ return {success:false}; } }
async function getAdminReports(){ try{ return await apiGet('/admin_reports.php'); }catch(e){ return {success:false}; } }
async function getDisclaimerStatus(){ try{ return await apiGet('/disclaimer_status.php'); }catch(e){ return {success:false}; } }
async function getPublicDisclaimerText(){ try{ return await apiGet('/disclaimer_text.php'); }catch(e){ return {success:false}; } }
async function acceptDisclaimer(){ return apiPost('/disclaimer_accept.php', { agreed: '1' }); }
async function getScreenerSettings(){ try{ return await apiGet('/screener_settings_get.php'); }catch(e){ return {success:false}; } }
async function saveScreenerSetting(key, value){ return apiPost('/screener_settings_save.php', { key, value }); }
async function getRecommendations(){ try{ return await apiGet('/recommendations_list.php'); }catch(e){ return {success:false}; } }
async function getRecommendationsLog(){ try{ return await apiGet('/recommendations_log.php'); }catch(e){ return {success:false}; } }
async function getTestimonials(){ try{ return await apiGet('/testimonials_list.php'); }catch(e){ return {success:false}; } }
async function addTestimonial(displayName, rating, comment){ return apiPost('/testimonials_add.php', { displayName, rating, comment }); }
async function deleteTestimonial(id){ return apiPost('/testimonials_delete.php', { id }); }
async function getArticles(){ try{ return await apiGet('/articles_list.php'); }catch(e){ return {success:false}; } }
async function getArticlesAdmin(){ try{ return await apiGet('/articles_admin_list.php'); }catch(e){ return {success:false}; } }
async function getArticle(slug){ try{ return await apiGet('/articles_get.php?slug='+encodeURIComponent(slug)); }catch(e){ return {success:false}; } }
async function saveArticle(data){ return apiPost('/articles_save.php', data); }
async function deleteArticle(id){ return apiPost('/articles_delete.php', { id }); }
async function getReferralInfo(){ try{ return await apiGet('/my_referral_info.php'); }catch(e){ return {success:false}; } }
async function addRecommendation(data){ return apiPost('/recommendations_add.php', data); }
async function clearRecommendationsNow(){ return apiPost('/recommendations_clear_now.php', {}); }
async function deleteRecommendation(id){ return apiPost('/recommendations_delete.php', { id }); }
async function getAdminSettings(){
  try{
    const r = await apiGet('/admin_settings_get.php');
    return (r && r.success) ? r.settings : {};
  }catch(e){ return {}; }
}
async function saveAdminSetting(key, value){ return apiPost('/admin_settings_save.php', { key, value: value?1:0 }); }
function getOrCreateVisitorId(){
  let id = localStorage.getItem('griffine_visitor_id');
  if (!id) {
    id = 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12);
    localStorage.setItem('griffine_visitor_id', id);
  }
  return id;
}
async function sendChatMessage(visitorId, email, message, attachment, attachmentName){
  return apiPost('/chat_send.php', { visitorId, email, message, attachment, attachmentName });
}
async function getChatHistory(visitorId){
  try{ return await apiGet('/chat_history.php?visitorId='+encodeURIComponent(visitorId)); }catch(e){ return {success:false}; }
}
async function getChatConversations(view){
  try{ return await apiGet('/chat_conversations_list.php?view=' + encodeURIComponent(view||'active')); }catch(e){ return {success:false}; }
}
async function archiveChatConversation(visitorId){ return apiPost('/chat_archive_conversation.php', { visitorId }); }
async function unarchiveChatConversation(visitorId){ return apiPost('/chat_unarchive_conversation.php', { visitorId }); }
async function deleteChatConversation(visitorId){ return apiPost('/chat_delete_conversation.php', { visitorId }); }
async function restoreChatConversation(visitorId){ return apiPost('/chat_restore_conversation.php', { visitorId }); }
async function purgeChatConversation(visitorId){ return apiPost('/chat_purge_conversation.php', { visitorId }); }
async function getPlansList(){ try{ return await apiGet('/plans_list.php'); }catch(e){ return {success:false}; } }
async function getPlansAdminList(){ try{ return await apiGet('/plans_admin_list.php'); }catch(e){ return {success:false}; } }
async function savePlan(plan){ return apiPost('/plans_save.php', plan); }
async function togglePlanActive(id){ return apiPost('/plans_toggle_active.php', { id }); }
async function deletePlan(id){ return apiPost('/plans_delete.php', { id }); }
async function sendChatAdminReply(visitorId, message, attachment, attachmentName){ return apiPost('/chat_admin_reply.php', { visitorId, message, attachment, attachmentName }); }
// الإصدار 82: الأدمن/الموظف بيفتح أو يقفل رفع الملفات للعميل في محادثة معيّنة
// الإصدار 83: + maxMb = أقصى حجم للمرفق بالميجا (allow = null ← من غير ما نغيّر حالة الفتح/القفل)
async function setChatUpload(visitorId, allow, maxMb){
  const data = { visitorId };
  if (allow !== null && allow !== undefined) data.allow = allow ? 1 : 0;
  if (maxMb) data.maxMb = maxMb;
  try{ return await apiPost('/chat_set_upload.php', data); }catch(e){ return {success:false, message:'تعذّر الاتصال'}; }
}
/* رسالة شات واحدة (العميل والإدارة) - الصور بتتعرض، وملفات PDF رابط تحميل */
function chatAttachmentHtml(m){
  if (!m.attachment) return '';
  const url = escapeHtml(m.attachment), name = escapeHtml(m.attachmentName || 'مرفق');
  const src = String(m.attachment) + ' ' + String(m.attachmentName || '');
  const isPdf = /\.pdf(\?|$|\s)/i.test(src) || /^data:application\/pdf/i.test(m.attachment);
  // الإصدار 83: فيديو بيتشغّل جوه الشات، وباقي الملفات (ZIP / Word / Excel ...) رابط تحميل
  const isVideo = /\.(mp4|webm|mov)(\?|$|\s)/i.test(src);
  const isDoc = /\.(zip|docx?|xlsx?|pptx)(\?|$|\s)/i.test(src);
  if (isVideo) return `<video class="chat-video" src="${url}" controls preload="metadata" playsinline></video><a class="chat-file" href="${url}" target="_blank" rel="noopener">🎬 ${name}</a>`;
  if (isPdf) return `<a class="chat-file" href="${url}" target="_blank" rel="noopener">📄 ${name}</a>`;
  if (isDoc) return `<a class="chat-file" href="${url}" target="_blank" rel="noopener">🗂️ ${name}</a>`;
  return `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${name}"></a>`;
}
function chatMsgHtml(m, extra){
  return `<div class="chat-msg ${escapeHtml(m.sender)}">${m.message ? escapeHtml(m.message).replace(/\n/g, '<br>') : ''}${chatAttachmentHtml(m)}<span class="chat-msg-time">${formatChatTime(m.createdAt)}${extra || ''}</span></div>`;
}
/* =====================================================================
   الإصدار 82 + 83: التحكم في رفع الملفات للعميل (نفس الشكل في صفحة الدردشة والرد السريع)
   - زرار "افتح للعميل رفع ملف/صورة" (فتح / قفل)
   - جنبه خانة "أقصى حجم للملف" بالميجا (مثلًا 100 أو 500) - بتتحفظ أول ما تغيّرها
   state = { on: مفتوح؟, mb: الحد بالميجا, onChange(state) }
   ===================================================================== */
const CHAT_DEFAULT_UPLOAD_MB = 8, CHAT_MAX_UPLOAD_CAP_MB = 2048;
const CHAT_FILE_ACCEPT = 'image/*,application/pdf,video/mp4,video/webm,video/quicktime,.mov,.zip,.doc,.docx,.xls,.xlsx,.pptx';
function chatUploadBtnHtml(id, on, mb){
  mb = +mb || CHAT_DEFAULT_UPLOAD_MB;
  return `<span class="chat-upload-ctl" id="${id}">
    <button type="button" class="small ${on ? 'btn-active' : 'secondary'} chat-upload-toggle" id="${id}Btn" style="width:auto;" title="العميل مايقدرش يبعت ملفات إلا لو فتحتها له">${on ? '📎 رفع الملفات مفتوح للعميل (اقفل)' : '📎 افتح للعميل رفع ملف/صورة'}</button>
    <label class="chat-maxmb" title="أقصى حجم للملف اللي العميل يقدر يرفعه في المحادثة دي">أقصى حجم <input type="number" id="${id}Mb" min="1" max="${CHAT_MAX_UPLOAD_CAP_MB}" step="1" value="${mb}" inputmode="numeric"> ميجا <span class="chat-maxmb-ok" id="${id}Ok"></span></label>
  </span>`;
}
function wireChatUploadBtn(id, visitorId, state){
  const wrap = document.getElementById(id); if (!wrap) return;
  const b = document.getElementById(id + 'Btn'), inp = document.getElementById(id + 'Mb'), ok = document.getElementById(id + 'Ok');
  const redraw = () => { wrap.outerHTML = chatUploadBtnHtml(id, state.on, state.mb); wireChatUploadBtn(id, visitorId, state); };
  const apply = (r) => { state.on = !!r.allowUpload; if (r.maxUploadMb) state.mb = +r.maxUploadMb; if (state.onChange) state.onChange(state); };
  b.onclick = async () => {
    b.disabled = true;
    const mbNow = Math.round(+inp.value);
    const r = await setChatUpload(visitorId, !state.on, (mbNow >= 1 && mbNow !== state.mb) ? mbNow : null);
    b.disabled = false;
    if (!r || !r.success) { alert((r && r.message) || 'تعذّر التغيير'); return; }
    apply(r); redraw();
  };
  inp.onchange = async () => {
    const mb = Math.round(+inp.value);
    if (!(mb >= 1 && mb <= CHAT_MAX_UPLOAD_CAP_MB)) { alert('اكتب حجم من 1 لـ ' + CHAT_MAX_UPLOAD_CAP_MB + ' ميجا'); inp.value = state.mb; return; }
    const r = await setChatUpload(visitorId, null, mb);
    if (!r || !r.success) { alert((r && r.message) || 'تعذّر الحفظ'); inp.value = state.mb; return; }
    apply(r);
    if (ok) { ok.textContent = '✓ اتحفظ'; setTimeout(() => { if (ok) ok.textContent = ''; }, 1800); }
  };
}
// تحديث الزرار من السيرفر (جهاز تاني / إنهاء المحادثة) - من غير ما نقاطع الأدمن وهو بيكتب الرقم
function syncChatUploadCtl(id, visitorId, state, res){
  if (!res || !res.success) return;
  const on = typeof res.allowUpload === 'boolean' ? res.allowUpload : state.on;
  const mb = +res.maxUploadMb || state.mb;
  if (on === state.on && mb === state.mb) return;
  const inp = document.getElementById(id + 'Mb');
  if (inp && document.activeElement === inp) return;
  state.on = on; state.mb = mb;
  const wrap = document.getElementById(id);
  if (wrap) { wrap.outerHTML = chatUploadBtnHtml(id, on, mb); wireChatUploadBtn(id, visitorId, state); }
}

/* الإصدار 83: رفع ملف الشات على أجزاء (2 ميجا للجزء) ← بيرجّع { success, token, name } أو { success:false, message }
   onProgress(0..1) لشريط التقدّم. كل جزء بيتعاد لحد 3 مرات لو النت قطع */
async function chatUploadFile(file, visitorId, onProgress){
  const CHUNK = 2 * 1024 * 1024;
  const uploadId = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  let offset = 0;
  while (offset < file.size) {
    const blob = file.slice(offset, offset + CHUNK);
    let r = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { r = await apiPost('/chat_upload_chunk.php', { visitorId, uploadId, offset, total: file.size, name: file.name, chunk: blob }); break; }
      catch(e){ r = { success:false, message:'النت فصل أثناء الرفع - جرّب تاني.' }; await new Promise(res => setTimeout(res, 1200 * (attempt + 1))); }
    }
    if (!r || !r.success) return r || { success:false, message:'تعذّر رفع الملف' };
    offset += blob.size;
    if (onProgress) onProgress(Math.min(1, offset / file.size));
    if (r.done) return r;
  }
  return { success:false, message:'تعذّر إكمال رفع الملف' };
}
function chatFileSizeLabel(bytes){ return bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + ' ميجا' : Math.max(1, Math.round(bytes / 1024)) + ' ك.ب'; }

/* إرفاق ملف من الإدارة: بيرجّع { get(), clear(), progress(p) } - الملف بيترفع وقت الإرسال (على أجزاء) */
function wireAdminAttach(inputId, chipId){
  let file = null;
  const input = document.getElementById(inputId), chip = document.getElementById(chipId);
  const draw = (p) => { if (!chip) return; chip.style.display = file ? '' : 'none';
    chip.innerHTML = file ? `<span>📎 ${escapeHtml(file.name)} <small>(${chatFileSizeLabel(file.size)})</small>${p != null ? ` <b class="chat-up-prog">⏳ ${Math.round(p * 100)}%</b>` : ''}</span> <button type="button" aria-label="إلغاء">✕</button>` : '';
    const x = chip.querySelector('button'); if (x) x.onclick = () => api.clear(); };
  const api = { get: () => ({ file, name: file ? file.name : '' }), clear: () => { file = null; if (input) input.value = ''; draw(); }, progress: (p) => draw(p) };
  if (input) input.addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > CHAT_MAX_UPLOAD_CAP_MB * 1024 * 1024) { alert('حجم الملف كبير - أقصى حجم ' + CHAT_MAX_UPLOAD_CAP_MB + ' ميجا.'); input.value = ''; return; }
    file = f; draw();
  });
  return api;
}
// إرسال رد الإدارة مع ملف (لو فيه): الملف بيترفع الأول وبعدين الرسالة
async function sendChatAdminReplyWithFile(visitorId, text, attachApi){
  const att = attachApi ? attachApi.get() : { file: null };
  let token = null, name = null;
  if (att.file) {
    const up = await chatUploadFile(att.file, visitorId, (p) => attachApi.progress(p));
    if (!up || !up.success) { attachApi.progress(null); return up || { success:false }; }
    token = up.token; name = up.name;
  }
  return apiPost('/chat_admin_reply.php', { visitorId, message: text, uploadToken: token, attachmentName: name });
}

/* =====================================================================
   الإصدار 83: تنبيهات الشات - زي ماسنجر: نقطة حمرا على الأيقونة + صوت (من غير أي إشعار Push على الشاشة)
   - الأدمن بيحدد من لوحة الدردشة: صورة أيقونة الشات + الصوت الافتراضي + يسمح للمشتركين يغيّروا ولا لأ
   - كل مستخدم (مشترك / زائر / موظف) يقدر من ⚙️ في الشات: يكتم الصوت أو يغيّره، ويغيّر صورة الأيقونة عنده
     (تفضيلات شخصية بتتحفظ على جهازه بس)
   ===================================================================== */
const CHAT_SOUNDS = { ding: '🔔 رنّة', pop: '💧 فقاعة', chime: '🎐 نغمة', bell: '🛎️ جرس', none: '🔇 بدون صوت' };
const CHAT_ICON_PRESETS = {
  bubble: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#1f8f5f"/><path d="M18 20h28a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H30l-9 7v-7h-3a4 4 0 0 1-4-4V24a4 4 0 0 1 4-4z" fill="#fff"/></svg>'),
  bell: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#f5b700"/><path d="M32 15a11 11 0 0 1 11 11v8l4 6H17l4-6v-8a11 11 0 0 1 11-11zm-5 28h10a5 5 0 0 1-10 0z" fill="#1a1a1a"/></svg>'),
  mail: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#2563eb"/><rect x="15" y="21" width="34" height="23" rx="3" fill="#fff"/><path d="M16 23l16 12 16-12" fill="none" stroke="#2563eb" stroke-width="3"/></svg>'),
};
window.__chatNotifyCfg = { icon: '', sound: 'ding', userIcon: true, userSound: true };
async function loadChatNotifyCfg(){
  try { const r = await apiGet('/chat_notify_get.php'); if (r && r.success && r.settings) window.__chatNotifyCfg = r.settings; } catch(e){}
  return window.__chatNotifyCfg;
}
function chatPrefs(){ try { return JSON.parse(localStorage.getItem('griffine_chat_prefs') || '{}') || {}; } catch(e){ return {}; } }
function saveChatPrefs(p){ try { localStorage.setItem('griffine_chat_prefs', JSON.stringify(p)); } catch(e){ alert('تعذّر حفظ التفضيل على الجهاز ده (مساحة المتصفح).'); } }
function chatEffectiveSound(){ const cfg = window.__chatNotifyCfg, p = chatPrefs(); return (cfg.userSound && p.sound && CHAT_SOUNDS[p.sound]) ? p.sound : (cfg.sound || 'ding'); }
function chatEffectiveIcon(){
  const cfg = window.__chatNotifyCfg, p = chatPrefs();
  if (cfg.userIcon && p.icon) { if (p.icon === 'logo') return null; if (CHAT_ICON_PRESETS[p.icon]) return CHAT_ICON_PRESETS[p.icon]; if (/^data:image\//.test(p.icon)) return p.icon; }
  return cfg.icon || null;   // null = شعار GRIFFINE (بيتبدّل مع الوضع الليلي/النهاري)
}
// صورة أيقونة الشات: شعار الموقع (بيتبع الثيم) أو صورة مخصّصة (من الأدمن أو من المستخدم نفسه)
function applyChatBubbleIcon(){
  const img = document.querySelector('#chatBubble img'); if (!img) return;
  const custom = chatEffectiveIcon();
  img.classList.toggle('brand-logo-img', !custom);
  img.classList.toggle('chat-custom-icon', !!custom);
  img.src = custom || griffineLogoSrc();
}
// الأصوات بتتعمل بـ Web Audio (من غير ملفات صوت) - والمتصفح بيسمح بالصوت بعد أول لمسة/ضغطة في الصفحة
let __chatAudioCtx = null;
function chatAudioCtx(){
  if (!__chatAudioCtx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { __chatAudioCtx = new C(); } catch(e){ return null; } }
  if (__chatAudioCtx.state === 'suspended') __chatAudioCtx.resume().catch(() => {});
  return __chatAudioCtx;
}
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if (__chatAudioCtx || document.getElementById('chatBubble')) chatAudioCtx(); }, { once: true, capture: true }));
function playChatSound(key){
  key = key || chatEffectiveSound();
  if (key === 'none' || !CHAT_SOUNDS[key]) return;
  const ctx = chatAudioCtx(); if (!ctx || ctx.state !== 'running') return;
  const notes = { ding: [[880, 0, .35]], pop: [[520, 0, .09], [780, .07, .1]], chime: [[659, 0, .3], [880, .14, .3], [1175, .28, .45]], bell: [[1320, 0, .6], [990, .02, .6]] }[key];
  const t0 = ctx.currentTime;
  notes.forEach(([f, at, dur]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = key === 'pop' ? 'triangle' : 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(0.25, t0 + at + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t0 + at); o.stop(t0 + at + dur + 0.05);
  });
}
// التنبيه نفسه: النقطة الحمرا (بيحطها صاحب الاستدعاء) + هزّة خفيفة للأيقونة + الصوت
function chatAlert(){
  playChatSound();
  const b = document.getElementById('chatBubble');
  if (b) { b.classList.remove('chat-ring'); void b.offsetWidth; b.classList.add('chat-ring'); }
}
/* شاشة ⚙️ "تنبيهات الشات" جوه لوحة الشات نفسها - onBack بيرجّع للمحادثة */
function renderChatPrefsPanel(panel, onBack, onClose){
  const cfg = window.__chatNotifyCfg, p = chatPrefs();
  const curSound = chatEffectiveSound();
  const curIcon = (cfg.userIcon && p.icon) ? p.icon : '';
  const iconOpt = (key, src, label) => `<button type="button" class="chat-icon-opt ${curIcon === key ? 'on' : ''}" data-icon="${key}" title="${label}"><img src="${src}" alt="${label}"><span>${label}</span></button>`;
  panel.innerHTML = `
    <div class="chat-header"><span>⚙️ تنبيهات الشات</span><span><button id="chatPrefsBack" style="font-size:13px;">◀ رجوع</button><button id="chatCloseBtn2">✕</button></span></div>
    <div class="chat-body chat-prefs">
      <p class="chat-prefs-note">التنبيه بيظهر كنقطة حمرا على أيقونة الشات بس (زي ماسنجر) - من غير رسائل منبثقة على الشاشة.</p>
      ${cfg.userSound ? `<div class="chat-prefs-sec"><strong>🔊 صوت التنبيه</strong>
        <div class="chat-sound-list">${Object.entries(CHAT_SOUNDS).map(([k, l]) => `<label class="chat-sound-opt"><input type="radio" name="chatSound" value="${k}" ${curSound === k ? 'checked' : ''}> ${l}</label>`).join('')}</div>
        <button type="button" class="small secondary" id="chatSoundTest" style="width:auto;">▶️ جرّب الصوت</button></div>` : `<p class="chat-prefs-note">صوت التنبيه: ${CHAT_SOUNDS[cfg.sound] || ''} (محدد من الإدارة)</p>`}
      ${cfg.userIcon ? `<div class="chat-prefs-sec"><strong>🖼️ صورة أيقونة الشات</strong>
        <div class="chat-icon-list">
          ${iconOpt('', cfg.icon || griffineLogoSrc(), 'الافتراضية')}
          ${cfg.icon ? iconOpt('logo', griffineLogoSrc(), 'شعار GRIFFINE') : ''}
          ${iconOpt('bubble', CHAT_ICON_PRESETS.bubble, 'فقاعة')}
          ${iconOpt('bell', CHAT_ICON_PRESETS.bell, 'جرس')}
          ${iconOpt('mail', CHAT_ICON_PRESETS.mail, 'رسالة')}
          ${/^data:image\//.test(curIcon) ? iconOpt(curIcon, curIcon, 'صورتي') : ''}
        </div>
        <label class="small secondary chat-icon-upload">📷 اختار صورة من جهازك<input type="file" id="chatIconFile" accept="image/*" style="display:none;"></label></div>` : ''}
    </div>`;
  document.getElementById('chatPrefsBack').onclick = onBack;
  document.getElementById('chatCloseBtn2').onclick = () => { panel.classList.remove('open'); if (onClose) onClose(); };
  panel.querySelectorAll('input[name="chatSound"]').forEach(r => r.onchange = () => { const q = chatPrefs(); q.sound = r.value; saveChatPrefs(q); playChatSound(r.value); });
  const test = document.getElementById('chatSoundTest'); if (test) test.onclick = () => { chatAudioCtx(); setTimeout(() => playChatSound(), 60); };
  panel.querySelectorAll('.chat-icon-opt').forEach(b => b.onclick = () => { const q = chatPrefs(); if (b.dataset.icon) q.icon = b.dataset.icon; else delete q.icon; saveChatPrefs(q); applyChatBubbleIcon(); renderChatPrefsPanel(panel, onBack, onClose); });
  const f = document.getElementById('chatIconFile');
  if (f) f.onchange = () => {
    const file = f.files[0]; if (!file) return;
    // بنصغّر الصورة لـ 128×128 عشان تتحفظ على الجهاز من غير ما تتقل
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const s = Math.min(img.width, img.height), ctx = c.getContext('2d');
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 128, 128);
      URL.revokeObjectURL(url);
      const q = chatPrefs(); q.icon = c.toDataURL('image/png'); saveChatPrefs(q);
      applyChatBubbleIcon(); renderChatPrefsPanel(panel, onBack, onClose);
    };
    img.onerror = () => { URL.revokeObjectURL(url); alert('الصورة دي مش مدعومة.'); };
    img.src = url;
  };
}

const CHAT_KIND = { subscriber: ['مشترك', 'sub'], member: ['مسجّل بدون اشتراك', 'mem'], guest: ['زائر - استفسار', 'guest'] };
function chatKindBadge(c){ const k = CHAT_KIND[c.kind]; return k ? `<span class="chat-kind ${k[1]}">${k[0]}</span>` : ''; }
async function sendChatAdminHeartbeat(){ try{ return await apiGet('/chat_admin_heartbeat.php'); }catch(e){ return {success:false}; } }
async function getChatAdminStatus(){ try{ return await apiGet('/chat_admin_status.php'); }catch(e){ return {online:false}; } }
async function endChatConversation(visitorId){ return apiPost('/chat_end_conversation.php', { visitorId }); }
// الإصدار 72: حالة "اتقرت" للشات بتتسجّل على السيرفر (مش على الجهاز بس) - فالعلامة الحمرا بتختفي من كل مكان
async function markChatRead(visitorId){ try{ return await apiPost('/chat_mark_read.php', { visitorId }); }catch(e){ return {success:false}; } }
async function markAllChatRead(){ try{ return await apiPost('/chat_mark_read.php', { all: 1 }); }catch(e){ return {success:false}; } }
// بعد أي تعليم كمقروء: نحدّث رقم لوحة التحكم + نقطة أيقونة الشات فورًا
function refreshChatUnreadIndicators(){ try{ updateChatUnreadBadge(); }catch(e){} try{ if (window.__adminBubbleCheck) window.__adminBubbleCheck(); }catch(e){} }
async function getMySubscription(){ try{ return await apiGet('/my_subscription.php'); }catch(e){ return {success:false}; } }
async function requestPlanChange(planId, planName, amount, durationDays, immediate, paymentMethod, paymentRef, paymentProof){
  return apiPost('/subscribers_request_change.php', { planId, planName, amount, durationDays, immediate: immediate?1:0, paymentMethod, paymentRef, paymentProof });
}
async function extendSubscriberDays(id, days){ return apiPost('/subscribers_extend.php', { id, days }); }
async function convertSubscriberFree(id, planId, planName){
  return apiPost('/subscribers_convert_free.php', { id, planId, planName });
}

function computeSubscriptionEndDate(startDateIso, planId){
  const d = new Date(startDateIso);
  if (planId==='yearly') d.setDate(d.getDate()+365);
  else d.setDate(d.getDate()+30); // شهري أو تجربة مجانية = 30 يوم
  return d.toISOString().split('T')[0];
}
async function getReminderDefaults(){
  try{
    const r = await apiGet('/reminder_defaults_get.php');
    return { startBeforeDays: r.startBeforeDays||6, intervalDays: r.intervalDays||2, gracePeriodDays: r.gracePeriodDays??3 };
  }catch(e){ return { startBeforeDays:6, intervalDays:2, gracePeriodDays:3 }; }
}
async function saveReminderDefaults(d){ return apiPost('/reminder_defaults_save.php', d); }
/* بيرجع true لو النهارده يوم مفروض يتبعت فيه تذكير للمشترك ده، حسب إعداداته */
function isReminderDueToday(subscriber, defaults){
  if (subscriber.reminderEnabled===false) return false;
  const intervalDays = subscriber.reminderIntervalDays || defaults.intervalDays;
  const startBeforeDays = defaults.startBeforeDays;
  const today = new Date(); today.setHours(0,0,0,0);
  const end = new Date(subscriber.endDate); end.setHours(0,0,0,0);
  const daysLeft = Math.round((end-today)/86400000);
  if (daysLeft < 0 || daysLeft > startBeforeDays) return false;
  const daysSinceWindowStart = startBeforeDays - daysLeft;
  return daysSinceWindowStart % intervalDays === 0;
}
// بعد الدخول: لو الزائر ضغط أيقونة من الشاشة الأولى نفتح الأداة دي، غير كده الرئيسية
async function openAfterLoginScreen(){
  const key = window.__afterLoginTarget; window.__afterLoginTarget = null;
  const targets = {
    screener:  { fn: renderScreener,       hide: 'hide_screener_screen' },
    dac:       { fn: renderPlansList,      hide: 'hide_dac_screen' },
    grid:      { fn: renderGridPlansList,  hide: 'hide_grid_screen' },
    portfolio: { fn: renderPortfolio,      hide: 'hide_portfolio_screen' },
    new:       { fn: renderPlanTypeChooser, hide: 'hide_dac_screen' },
    deleteAccount: { fn: () => GShell.renderDeleteAccount(), hide: '__none__' },
  };
  const item = key ? targets[key] : null;
  if (item) {
    let hidden = false;
    if (!window.__isAdmin) { const s = await getAdminSettings(); hidden = (s && s[item.hide] === true); }
    if (!hidden) { item.fn(); return; }
  }
  renderHome();
}
async function postLoginRedirect(email){
  await refreshTopNav();
  // حذف الحساب لازم يكون متاح لأي حد مسجّل (حتى من غير اشتراك أو تفعيل)
  if (window.__afterLoginTarget === 'deleteAccount') { window.__afterLoginTarget = null; return GShell.renderDeleteAccount(); }
  if (window.__isAdmin) { openAfterLoginScreen(); return; }
  if (!window.__emailVerified) { renderVerifyEmailPrompt(email); return; }
  if (!(await ensureDisclaimerAccepted(email))) return;
  const ok = await ensureAccess();
  if (ok) openAfterLoginScreen(); else window.__afterLoginTarget = null;
}

async function renderVerifyEmailPrompt(email){
  pushNav(() => renderVerifyEmailPrompt(email));
  window.__lastPageKey='verify_email_prompt'; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${email}</strong></div></div>
    <h2>فعّل بريدك الإلكتروني</h2>
    <div class="info">
      📩 بعتنالك رابط تفعيل على <strong>${email}</strong>. افتح إيميلك واضغط على الرابط عشان تقدر تستخدم الموقع.<br>
      لو ملقتش الرسالة، شوف مجلد الـSpam، أو اطلب رابط جديد تحت.
    </div>
    <button id="resendVerifyBtn">📤 إعادة إرسال رابط التفعيل</button>
    <button class="btn-gray" id="refreshVerifyBtn">🔄 اتفعّل بالفعل — تحديث الحالة</button>
    <div id="verifyResendResult"></div>
  </div>`;
  document.getElementById('refreshVerifyBtn').onclick=async()=>{ invalidateSessionCache(); await getSession(); postLoginRedirect(email); };
  document.getElementById('resendVerifyBtn').onclick=async()=>{
    const btn = document.getElementById('resendVerifyBtn');
    btn.disabled = true; btn.textContent = 'جاري الإرسال...';
    const r = await resendVerificationEmail();
    document.getElementById('verifyResendResult').innerHTML = `<div class="info" style="margin-top:10px;">${escapeHtml(r.message)}</div>`;
    btn.disabled = false; btn.textContent = '📤 إعادة إرسال رابط التفعيل';
  };
}

/* الحارس العام: يتأكد إن العميل عنده صلاحية استخدام الموقع دلوقتي، ولو لأ بيوجّهه للشاشة المناسبة ويرجع false */
async function ensureAccess(){
  if (window.__isAdmin) return true; // المدير مش عميل مشترك، مالوش قيود
  // حارس تفعيل البريد الإلكتروني - كان بيتفحص بس لحظة الدخول (postLoginRedirect)، فأي حد يوصل لشاشة تانية بعدها
  // (تحديث الصفحة، أو رجوع لاحق) كان بيعدي من غير ما يتفعّل بريده. دلوقتي بيتفحص هنا مركزيًا لأن كل الشاشات المحمية بتعدي من هنا.
  const emailForCheck = await getSession();
  if (emailForCheck && !window.__emailVerified) { renderVerifyEmailPrompt(emailForCheck); return false; }
  const r = await getMySubscription();
  const sub = (r && r.success) ? r.subscription : null;

  if (!sub) { renderSubscriptionPlans(); return false; }
  if (!sub.active) { renderPendingActivation(sub); return false; }

  const defaults = await getReminderDefaults();
  const today = new Date(); today.setHours(0,0,0,0);
  const end = new Date(sub.endDate); end.setHours(0,0,0,0);
  const graceEnd = new Date(end); graceEnd.setDate(graceEnd.getDate() + (defaults.gracePeriodDays||0));

  if (today > graceEnd) { renderAccessExpired(sub); return false; }
  return true;
}

async function renderPendingActivation(sub){
  pushNav(() => renderPendingActivation(sub));
  const email = await getSession();
  window.__lastPageKey='pending_activation'; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${email}</strong></div></div>
    <h2>بانتظار تفعيل الاشتراك</h2>
    <div class="info">
      📩 استلمنا طلب اشتراكك في <strong>${escapeHtml(sub.planName)}</strong> وبيانات السداد.<br>
      هيتم تفعيل حسابك فور مراجعة عملية التحويل من فريقنا (عادة خلال ساعات قليلة).
    </div>
    <div class="section-card">لو محتاج تتواصل معانا بخصوص السداد، تقدر تستخدم بيانات التواصل تحت.</div>
    <button class="secondary" id="goContactFromPendingBtn">📞 بيانات التواصل</button>
    <button class="btn-gray" id="refreshPendingBtn">🔄 تحديث الحالة</button>
  </div>`;
  document.getElementById('goContactFromPendingBtn').onclick=()=>renderContactInfo();
  document.getElementById('refreshPendingBtn').onclick=()=>postLoginRedirect(email);
}

async function renderAccessExpired(sub){
  pushNav(() => renderAccessExpired(sub));
  const email = await getSession();
  window.__lastPageKey='access_expired'; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${email}</strong></div></div>
    <h2>انتهت صلاحية اشتراكك</h2>
    <div class="error">
      اشتراكك في <strong>${escapeHtml(sub.planName)}</strong> انتهى يوم ${formatDateAr(sub.endDate)}، وانتهت كمان مدة السماح.<br>
      لازم تجدد اشتراكك عشان تقدر تستخدم الموقع تاني — متابعة الخطط، عرض البيانات، وكل صفحات الموقع موقوفة لحد التجديد.
    </div>
    <button id="renewNowBtn">💳 تجديد الاشتراك الآن</button>
    <button class="secondary" id="goContactFromExpiredBtn">📞 بيانات التواصل</button>
  </div>`;
  document.getElementById('renewNowBtn').onclick=()=>renderSubscriptionPlans();
  document.getElementById('goContactFromExpiredBtn').onclick=()=>renderContactInfo();
}

const app = document.getElementById('app');
const TOP7_LOGO_B64 = location.origin + '/img/top7-logo-light.webp?v=84';   // الإصدار 84: ملف صورة (بيتخزّن في المتصفح) بدل Base64 جوه الكود
const GRIFFINE_LOGO_DARK_B64 = location.origin + '/img/griffine-logo-dark.webp?v=84';   // الإصدار 84: ملف صورة (بيتخزّن في المتصفح) بدل Base64 جوه الكود
const TOP7_LOGO_DARK_B64 = location.origin + '/img/top7-logo-dark.webp?v=84';   // الإصدار 84: ملف صورة (بيتخزّن في المتصفح) بدل Base64 جوه الكود
/* الوضع الحالي (فاتح/ليلي) - الإصدار 71: بيتقري من الصفحة نفسها (data-theme) مش من التخزين بس،
   عشان الشعار يطلع صح حتى لو المتصفح مانع التخزين (وضع التصفح الخفي)
   (السكربت الصغير في index.php بيحط data-theme من التخزين قبل تحميل أي ملف، فالاتنين دايمًا متطابقين) */
function currentTheme(){ return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
function griffineLogoSrc(){ return currentTheme()==='dark' ? GRIFFINE_LOGO_DARK_B64 : GRIFFINE_LOGO_B64; }
function top7LogoSrc(){ return currentTheme()==='dark' ? TOP7_LOGO_DARK_B64 : TOP7_LOGO_B64; }
function logoHeader(){ return `<div class="logo-header"><img src="${griffineLogoSrc()}" alt="GRIFFINE" class="brand-logo-img"><h1>GRIFFINE</h1></div>`; }
function reportLogoHeaderHtml(){
  return `<div style="text-align:left;margin-bottom:14px;">
    <img src="${GRIFFINE_LOGO_B64}" style="height:55px;">
    <div style="font-weight:bold;letter-spacing:3px;font-size:15px;color:var(--green-dark);margin-top:4px;">GRIFFINE</div>
  </div>`;
}

/* ================== تسجيل الدخول / الحساب ================== */
/* ================== الصفحة الرئيسية العامة - أي زائر يقدر يتصفحها من غير حساب ================== */
// بيرجّع خلفية الشاشة المرفوعة من الأدمن (تنسيق الموقع) لو موجودة، وإلا الصورة الافتراضية المدمجة
function screenBgOr(key, fallbackUrl){
  const pv = window.__pageBackgroundsPreview;
  if (pv && Object.prototype.hasOwnProperty.call(pv, key)) return pv[key] || fallbackUrl;
  const v = window.__pageBackgrounds && window.__pageBackgrounds[key];
  return v || fallbackUrl;
}
// الشعار الفرعي اللي بيظهر فوق صورة الجريفين في شاشتي الترحيب والدخول (نص حقيقي قابل للتعديل من الأدمن)
function appMottoHtml(){
  return `<div class="ap-motto">${pageTitle('public_home_motto','الانضباط يحسب لك الحرية')}</div>`;
}

async function renderPublicHome(){
  pushNav(() => renderPublicHome());
  setBottomNavActive('home');
  setBackButtonVisible(false);

  const svg = (inner) => `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  // كل أيقونة بتفتح الأداة الحقيقية في الموقع (بعد تسجيل الدخول لو الزائر لسه مسجّلش)
  const tiles = [
    { act:'screener',  title:'نمِّ',  sub:'بثقة',           icon: svg('<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>') },
    { act:'dac',       title:'خطط',  sub:'بنظام DCA',      icon: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>') },
    { act:'grid',      title:'احسب', sub:'البيع والشراء',  icon: svg('<rect x="5" y="3" width="14" height="18" rx="2.5"/><rect x="8" y="6" width="8" height="3" rx=".6"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01" stroke-width="2.4"/>') },
    { act:'portfolio', title:'تابع', sub:'محفظتك',         icon: svg('<rect x="4" y="12" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="16" y="4" width="4" height="16" rx="1"/>') },
  ];
  const globe = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z"/></svg>';
  const arrow = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  const extra = siteHeroHtml();
  app.innerHTML = `<div class="wl-screen">
    <div class="wl-main">
      <div class="wl-lang"><span>العربية</span>${globe}</div>
      <div class="wl-logo"><img src="${griffineLogoSrc()}" alt="GRIFFINE"><div class="wl-wordmark">GRIFFINE</div></div>
      <div class="wl-tagline">${pageTitle('public_home_tagline','قرارات أذكى. محافظ أقوى.')}</div>
      <div class="wl-tiles">
        ${tiles.map(t => `<button type="button" class="wl-tile" data-act="${t.act}"><span class="wl-tile-ico">${t.icon}</span><span class="wl-tile-t">${escapeHtml(t.title)}</span><span class="wl-tile-s">${t.sub}</span></button>`).join('')}
      </div>
    </div>
    <div class="wl-art ${window.__pageBackgrounds && window.__pageBackgrounds['splash'] ? 'wl-custom' : ''}">
      ${window.__pageBackgrounds && window.__pageBackgrounds['splash']
        ? `<img src="${escapeHtml(window.__pageBackgrounds['splash'])}" alt="" draggable="false">`
        : `<picture><source media="(min-width:1024px)" srcset="login_hero.webp"><img src="welcome_hero.webp" alt="" draggable="false"></picture>`}
      ${appMottoHtml()}
    </div>
    <div class="wl-cta">
      <button type="button" class="wl-start" id="splashStartBtn">${arrow}<span>ابدأ الآن</span></button>
      <div class="wl-cap">لمستقبل مالي أفضل</div>
      <div class="wl-login">عندك حساب بالفعل؟ <a id="splashLoginLink">سجل دخول</a></div>
    </div>
  </div>${extra ? `<div class="container" style="margin-top:0;">${extra}</div>` : ''}`;

  document.getElementById('splashStartBtn').onclick = () => renderRegister();
  document.getElementById('splashLoginLink').onclick = () => renderLogin();
  document.querySelectorAll('.wl-tile').forEach(btn => {
    btn.onclick = async () => {
      window.__afterLoginTarget = btn.dataset.act;
      const email = await getSession();
      if (email) postLoginRedirect(email); else renderLogin();
    };
  });
}

// صفحة تعريفية عامة بفكرة "خطط تعزيز المتوسط" - للزوار قبل ما يسجّلوا حساب
async function renderPublicPlansInfo(){
  pushNav(() => renderPublicPlansInfo());
  window.__lastPageKey='public_plans_info'; app.innerHTML = `<div class="container">${logoHeader()}
    <h2>📈 خطط تعزيز متوسط الأسهم</h2>
    <div class="section-card">
      <p style="font-size:13.5px;color:#444;line-height:1.8;">
        خطة تعزيز المتوسط بتساعدك تدير عملية شراء سهم على مستويات سعرية متدرجة بدل ما تشتري كل الكمية بسعر واحد — كل ما السعر نزل لمستوى محدد، تشتري كمية إضافية، وده بيقلل متوسط سعر شرائك الإجمالي.
      </p>
      <ul style="font-size:13px;color:#555;padding-right:18px;line-height:2;">
        <li>تحدد أنت مستويات الشراء ومقدار كل دفعة</li>
        <li>الموقع بيحسب متوسط السعر والكمية الإجمالية تلقائيًا أول بأول</li>
        <li>تتابع حالة كل خطة (شغالة / مكتملة / مقفولة) من مكان واحد</li>
        <li>تقدر تحدد نقاط بيع وخروج بنسب مختلفة عند كل مستوى مقاومة</li>
      </ul>
    </div>
    <button id="plansInfoRegisterBtn" class="btn-active">✨ إنشاء حساب مجاني وابدأ خطتك</button>
  </div>`;
  document.getElementById('plansInfoRegisterBtn').onclick=()=>renderRegister();
}

// لأي زائر مسجّلش دخول لسه ويحاول يستخدم أداة فعلية (يحسب في الكشاف، يعمل خطة، يشترك) - بدل ما نرفض بصمت، نوجهه بلطف للتسجيل
function promptSignupToContinue(message, backFn){
  app.innerHTML = `<div class="container">${logoHeader()}
    <h2>سجّل حساب مجاني للمتابعة</h2>
    <div class="info">${message || 'لازم يكون عندك حساب عشان تقدر تستخدم الأداة دي.'}</div>
    <button id="promptRegisterBtn" class="btn-active">✨ إنشاء حساب مجاني</button>
    <button id="promptLoginBtn" class="secondary">عندي حساب بالفعل - تسجيل الدخول</button>
    <button id="promptBackBtn" class="btn-gray">رجوع</button>
  </div>`;
  document.getElementById('promptRegisterBtn').onclick=()=>renderRegister();
  document.getElementById('promptLoginBtn').onclick=()=>openLoginModal();
  document.getElementById('promptBackBtn').onclick=()=>{ if (backFn) backFn(); else renderPublicHome(); };
}

// نسخة عامة من صفحة الباقات - أي زائر يقدر يشوف الأسعار، وزرار "اشترك" بيوديه يسجّل حساب الأول
async function renderPublicPricing(){
  pushNav(() => renderPublicPricing());
  const email = await getSession();
  if (email) return renderSubscriptionPlans();

  const res = await getPlansList();
  const plans = (res && res.success) ? res.plans : [];

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>${pageTitle('public_pricing','الباقات والأسعار')}</div><button class="secondary small" id="pubBackBtn">🏠 الرئيسية</button></div>
    <div class="pricing-grid">
      ${plans.map(p=>`<div class="price-card ${p.badge?'featured':''}">
        ${p.badge?`<div class="price-badge">${escapeHtml(p.badge)}</div>`:''}
        <div class="price-plan-name">${escapeHtml(p.name)}</div>
        <div class="price-amount">${p.amount===0?'مجانًا':fmtMoney(p.amount)}<span> / ${escapeHtml(p.periodLabel)}</span></div>
        ${p.saveNote?`<div class="price-save">${escapeHtml(p.saveNote)}</div>`:''}
        <ul class="price-features">${(p.features||[]).map(f=>`<li>${escapeHtml(f)}</li>`).join('')}</ul>
        <button class="btn-active" onclick="renderRegister()">اشترك الآن</button>
      </div>`).join('')}
    </div>
    <p class="disclaimer">سجّل حساب مجاني الأول عشان تقدر تشترك في أي باقة.</p>
  </div>`;
  document.getElementById('pubBackBtn').onclick=()=>renderPublicHome();
}

/* ================== آراء العملاء - عرض عام + إضافة لأي عميل مسجّل دخول ================== */
async function renderTestimonialsPage(){
  pushNav(() => renderTestimonialsPage());
  const email = await getSession();
  const res = await getTestimonials();
  const items = (res && res.success) ? res.testimonials : [];

  app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>${pageTitle('testimonials','⭐ آراء العملاء')}</div><button class="secondary small" id="testiBackBtn">🏠 الرئيسية</button></div>

    ${email ? `
    <div class="section-card">
      <h3 style="margin-top:0;">شاركنا رأيك</h3>
      <label>اسمك (هيظهر مع رأيك)</label>
      <input type="text" id="testiName" maxlength="100" placeholder="مثال: أحمد م.">
      <label>التقييم</label>
      <select id="testiRating">
        <option value="5">⭐⭐⭐⭐⭐ ممتاز</option>
        <option value="4">⭐⭐⭐⭐ جيد جدًا</option>
        <option value="3">⭐⭐⭐ جيد</option>
        <option value="2">⭐⭐ مقبول</option>
        <option value="1">⭐ ضعيف</option>
      </select>
      <label>تعليقك (حد أقصى 500 حرف)</label>
      <textarea id="testiComment" rows="3" maxlength="500"></textarea>
      <button id="testiSubmitBtn" style="margin-top:10px;">إرسال</button>
      <div id="testiResult"></div>
    </div>` : `<div class="info">سجّل حساب مجاني عشان تقدر تضيف رأيك.</div>`}

    <h2 style="margin-top:20px;">آراء موجودة</h2>
    <div id="testiListWrap"></div>
  </div>`;
  document.getElementById('testiBackBtn').onclick=()=>{ email ? renderHome() : renderPublicHome(); };

  function renderList(list){
    document.getElementById('testiListWrap').innerHTML = list.length ? list.map(t=>`
      <div class="section-card" style="margin-bottom:10px;">
        <div>${'⭐'.repeat(t.rating)}</div>
        <div style="font-size:13.5px;color:#444;margin:6px 0;">"${escapeHtml(t.comment)}"</div>
        <div style="font-size:11.5px;color:#888;">— ${escapeHtml(t.displayName)} · ${formatDateAr(t.createdAt)}</div>
        ${window.__isAdmin && hasPermission('manage_content') ? `<button class="small danger" style="width:auto;margin-top:6px;" onclick="window.__deleteTesti('${t.id}')">حذف</button>` : ''}
      </div>`).join('') : '<p style="color:#888;font-size:13px;">لسه معندناش آراء منشورة.</p>';
  }
  renderList(items);

  window.__deleteTesti = async (id) => {
    if (!await gConfirm('متأكد إنك عايز تحذف الرأي ده؟')) return;
    const r = await deleteTestimonial(id);
    if (r.success) { const fresh = await getTestimonials(); renderList(fresh.success ? fresh.testimonials : []); }
    else alert(r.message || 'حصل خطأ');
  };

  if (email) {
    document.getElementById('testiSubmitBtn').onclick = async () => {
      const name = document.getElementById('testiName').value.trim();
      const rating = document.getElementById('testiRating').value;
      const comment = document.getElementById('testiComment').value.trim();
      const r = await addTestimonial(name, rating, comment);
      const resultEl = document.getElementById('testiResult');
      if (r.success) {
        resultEl.innerHTML = '<div class="info" style="margin-top:8px;">✅ شكرًا لمشاركة رأيك.</div>';
        document.getElementById('testiName').value = ''; document.getElementById('testiComment').value = '';
        const fresh = await getTestimonials();
        renderList(fresh.success ? fresh.testimonials : []);
      } else {
        resultEl.innerHTML = `<div class="error" style="margin-top:8px;">${r.message || 'حصل خطأ'}</div>`;
      }
    };
  }
}

/* ================== مقالات (محتوى تسويقي/SEO) - عرض عام ================== */
async function renderArticlesListPage(){
  pushNav(() => renderArticlesListPage());
  const email = await getSession();
  const res = await getArticles();
  const articles = (res && res.success) ? res.articles : [];

  app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>${pageTitle('articles_list','📰 مقالات')}</div><button class="secondary small" id="artBackBtn">🏠 الرئيسية</button></div>
    ${articles.length ? articles.map(a=>`
      <div class="section-card" style="margin-bottom:10px;cursor:pointer;" onclick="window.__openArticle('${a.slug}')">
        <strong style="color:var(--green-dark);">${escapeHtml(a.title)}</strong>
        <div style="font-size:12.5px;color:#666;margin-top:4px;">${escapeHtml(a.summary || '')}</div>
        <div style="font-size:11px;color:#888;margin-top:4px;">${formatDateAr(a.createdAt)}</div>
      </div>`).join('') : '<p style="color:#888;font-size:13px;">لسه معندناش مقالات منشورة.</p>'}
  </div>`;
  document.getElementById('artBackBtn').onclick=()=>{ email ? renderHome() : renderPublicHome(); };
  window.__openArticle = (slug) => renderArticleDetailPage(slug);
}

async function renderArticleDetailPage(slug){
  pushNav(() => renderArticleDetailPage(slug));
  const email = await getSession();
  const res = await getArticle(slug);
  if (!res || !res.success) {
    app.innerHTML = `<div class="container">${logoHeader()}<div class="error">المقال غير موجود.</div><button id="artNotFoundBackBtn" class="secondary">رجوع</button></div>`;
    document.getElementById('artNotFoundBackBtn').onclick=()=>renderArticlesListPage();
    return;
  }
  const a = res.article;
  app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>${pageTitle('article_detail','📰 مقال')}</div><button class="secondary small" id="artDetailBackBtn">رجوع للمقالات</button></div>
    <h2>${escapeHtml(a.title)}</h2>
    <div style="font-size:11px;color:#888;margin-bottom:10px;">${formatDateAr(a.createdAt)}</div>
    <div class="section-card" style="white-space:pre-wrap;line-height:1.9;font-size:14px;"></div>
  </div>`;
  app.querySelector('.section-card').textContent = a.body;
  document.getElementById('artDetailBackBtn').onclick=()=>renderArticlesListPage();
}

function closeLoginModal(){
  const el = document.getElementById('loginModalOverlay');
  if (el) el.remove();
}
// تسجيل الدخول دلوقتي بيبدأ من الشاشة الجديدة — النافذة المنبثقة القديمة اتلغت
/* ================== شاشات الدخول وإنشاء الحساب (تصميم موحّد - الإصدار 69) ==================
   كل الشاشات دي بنفس الشكل: صورة الغلاف فوق، الشعار، العنوان، والنموذج - وبتملى الشاشة من غير سكرول على الموبايل */
const AUTH_ICONS = {
  back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  mail: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7.5 8.5 6 8.5-6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="11" width="15" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg>',
  eye: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
};
function authScreen(o){
  const custom = window.__pageBackgrounds && window.__pageBackgrounds['login'];
  const pv = window.__pageBackgroundsPreview;
  const heroSrc = (pv && Object.prototype.hasOwnProperty.call(pv, 'login') && pv.login) || custom || 'login_hero.webp';
  const isCustom = heroSrc !== 'login_hero.webp';
  return `<div class="gl-screen gl-auth ${isCustom ? 'gl-custom-bg' : ''}">
    ${o.back ? `<button type="button" class="gl-back" id="glBackBtn" aria-label="رجوع">${AUTH_ICONS.back}</button>` : ''}
    <div class="gl-hero"><img src="${escapeHtml(heroSrc)}" alt="" draggable="false">${isCustom ? '' : appMottoHtml()}</div>
    <div class="gl-body">
      <div class="gl-logo"><img src="${griffineLogoSrc()}" alt="GRIFFINE"><div class="gl-wordmark">GRIFFINE</div></div>
      <h1 class="gl-title">${escapeHtml(o.title)}</h1>
      ${o.sub ? `<p class="gl-sub">${o.sub}</p>` : ''}
      ${o.error ? `<div class="gl-alert err" role="alert">${escapeHtml(o.error)}</div>` : ''}
      ${o.body}
      <p class="gl-terms">باستخدامك GRIFFINE أنت توافق على <a id="glTermsLink">إخلاء المسؤولية</a> و<a id="glPrivacyLink">سياسة الخصوصية</a>.</p>
    </div>
  </div>`;
}
function authField(id, type, label, icon, attrs){
  const isPw = type === 'password';
  return `<label class="gl-field" for="${id}"><span class="gl-field-label">${label}</span>
    <span class="gl-input">${icon}<input id="${id}" type="${type}" ${attrs || ''}>${isPw ? `<button type="button" class="gl-eye" data-for="${id}" aria-label="إظهار كلمة المرور">${AUTH_ICONS.eye}</button>` : ''}</span></label>`;
}
function wireAuthCommon(backTo, selfFn){
  const b = document.getElementById('glBackBtn'); if (b) b.onclick = backTo || (() => renderPublicHome());
  document.getElementById('glTermsLink').onclick = () => renderDisclaimerPage({ backTo: selfFn });
  document.getElementById('glPrivacyLink').onclick = () => renderPrivacyPolicyPage({ backTo: selfFn });
  document.querySelectorAll('.gl-eye').forEach(btn => btn.onclick = () => {
    const inp = document.getElementById(btn.dataset.for); if (!inp) return;
    const show = inp.type === 'password'; inp.type = show ? 'text' : 'password';
    btn.innerHTML = show ? AUTH_ICONS.eyeOff : AUTH_ICONS.eye;
    btn.setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
  });
}
function authBusy(btn, busy, label){ btn.disabled = busy; btn.innerHTML = busy ? '<span class="gl-spin" aria-hidden="true"></span>' + label : label; }

function openLoginModal(){ if (typeof closeLoginModal === 'function') closeLoginModal(); renderLogin(); }

// تسجيل الدخول (خطوة واحدة: الإيميل + كلمة المرور) - لو الإيميل محفوظ من قبل بيظهر كاسم بس والمطلوب كلمة المرور
async function renderLogin(error){
  pushNav(() => renderLogin());
  window.__lastPageKey = 'login';
  let remembered = ''; try { remembered = localStorage.getItem('griffine_remembered_email') || ''; } catch(e){}
  app.innerHTML = authScreen({
    back: true,
    title: window.__staffGate ? '🛡️ دخول الإدارة' : (remembered ? 'أهلاً بعودتك' : 'تسجيل الدخول'),
    sub: window.__staffGate ? 'دخول فريق الإدارة والموظفين (الرابط صالح 30 دقيقة).' : (remembered ? '' : 'ادخل ببريدك الإلكتروني وكلمة المرور.'),
    error,
    body: `<form id="loginForm" novalidate>
      ${remembered ? `<div class="gl-who"><span class="gl-who-av">${escapeHtml(remembered.charAt(0).toUpperCase())}</span><span class="gl-who-t">${escapeHtml(remembered)}</span><button type="button" class="gl-link" id="notMeLink">حساب آخر</button></div>
        <input type="hidden" id="email" value="${escapeHtml(remembered)}">`
      : authField('email', 'email', 'البريد الإلكتروني', AUTH_ICONS.mail, 'autocomplete="email" inputmode="email" required dir="ltr"')}
      ${authField('password', 'password', 'كلمة المرور', AUTH_ICONS.lock, 'autocomplete="current-password" required dir="ltr"')}
      <div class="gl-row-end"><button type="button" class="gl-link" id="goForgotPassword">نسيت كلمة المرور؟</button></div>
      <button type="submit" class="gl-btn gl-btn-primary" id="loginSubmit">تسجيل الدخول</button>
    </form>
    <div class="gl-divider"><span>جديد على GRIFFINE؟</span></div>
    <button type="button" class="gl-btn gl-btn-outline" id="goRegister">إنشاء حساب جديد</button>`
  });
  wireAuthCommon(() => renderPublicHome(), () => renderLogin());
  document.getElementById('goRegister').onclick = () => renderRegister();
  document.getElementById('goForgotPassword').onclick = () => renderForgotPassword();
  const notMe = document.getElementById('notMeLink');
  if (notMe) notMe.onclick = () => { try { localStorage.removeItem('griffine_remembered_email'); } catch(e){} window.__navSilent = true; try { renderLogin(); } finally { window.__navSilent = false; } };
  const pw = document.getElementById('password'); if (pw && remembered) setTimeout(() => pw.focus(), 50);
  document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    if (!email || !password) return renderLogin('اكتب البريد الإلكتروني وكلمة المرور.');
    const btn = document.getElementById('loginSubmit'); authBusy(btn, true, 'جاري الدخول...');
    try{
      const r = await apiPost('/login.php', { email, password });
      if (r && r.otpRequired) return renderOtpStep(email, r);   // الإصدار 84: كود التحقق
      if (!r.success) return renderLogin(r.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      await finishLogin(email, r);
    } catch(err){ renderLogin('تعذّر الاتصال بالسيرفر. تأكد من الإنترنت وحاول تاني.'); }
  };
}
/* بعد نجاح الدخول (بكلمة المرور أو بعد كود التحقق) */
async function finishLogin(email, r){
      try { localStorage.setItem('griffine_remembered_email', email); } catch(e){}
      if (r && r.csrfToken) window.__csrfToken = r.csrfToken;
      window.__staffGate = false;
      invalidateSessionCache();
      window.__isAdmin = !!r.is_admin;
      await refreshTopNav();
      // لو الجلسة متحفظتش في المتصفح (كوكيز قديمة/محظورة) - نقول كده بوضوح بدل ما نعرض شاشة غلط
      if (!(await getSession())) return renderLogin('تم التحقق من بياناتك لكن المتصفح مش محتفظ بالجلسة. امسح بيانات الموقع (الكوكيز) من إعدادات المتصفح وحاول تاني.');
      postLoginRedirect(email);
}
/* =====================================================================
   الإصدار 84: خطوة كود التحقق (OTP) - بيتبعت بالإيميل أو SMS حسب إعدادات الأدمن
   ===================================================================== */
function renderOtpStep(email, info, error){
  window.__lastPageKey = 'login_otp';
  app.innerHTML = authScreen({
    back: true,
    title: 'كود التحقق',
    sub: escapeHtml((info && info.message) || 'بعتنالك كود من 6 أرقام.'),
    error,
    body: `<form id="otpForm" novalidate>
      ${authField('otpCode', 'text', 'الكود (6 أرقام)', AUTH_ICONS.lock, 'autocomplete="one-time-code" inputmode="numeric" maxlength="6" pattern="[0-9]*" required dir="ltr"')}
      <button type="submit" class="gl-btn gl-btn-primary" id="otpSubmit">تأكيد</button>
    </form>
    <div class="gl-row-end" style="justify-content:space-between;margin-top:10px;"><button type="button" class="gl-link" id="otpResend">إعادة إرسال الكود</button><button type="button" class="gl-link" id="otpBack">رجوع لتسجيل الدخول</button></div>`
  });
  wireAuthCommon(() => renderLogin(), () => renderOtpStep(email, info));
  const inp = document.getElementById('otpCode'); if (inp) setTimeout(() => inp.focus(), 50);
  document.getElementById('otpBack').onclick = () => renderLogin();
  document.getElementById('otpResend').onclick = async () => {
    const r = await apiPost('/otp_verify.php', { resend: 1 }).catch(() => null);
    renderOtpStep(email, r && r.resent ? { message: r.message } : info, r && !r.resent ? r.message : '');
  };
  document.getElementById('otpForm').onsubmit = async (e) => {
    e.preventDefault();
    const code = (inp.value || '').replace(/\D/g, '');
    if (code.length !== 6) return renderOtpStep(email, info, 'اكتب الكود كامل (6 أرقام).');
    const btn = document.getElementById('otpSubmit'); authBusy(btn, true, 'جاري التحقق...');
    try {
      const r = await apiPost('/otp_verify.php', { code });
      if (r && r.success) return finishLogin(email, r);
      if (r && r.restart) return renderLogin((r && r.message) || 'سجّل الدخول تاني.');
      renderOtpStep(email, info, (r && r.message) || 'الكود غير صحيح.');
    } catch(err){ renderOtpStep(email, info, 'تعذّر الاتصال بالسيرفر.'); }
  };
}
// اسم قديم لنفس الشاشة (بتتنادى من أماكن تانية في الموقع)
async function renderLoginEmail(error){ return renderLogin(error); }

async function renderRegister(error){
  pushNav(() => renderRegister());
  window.__lastPageKey = 'register';
  let refCode = ''; try { refCode = localStorage.getItem('griffine_ref_code') || ''; } catch(e){}
  app.innerHTML = authScreen({
    back: true,
    title: 'إنشاء حساب جديد',
    sub: 'دقيقة واحدة وتبدأ تنظّم خططك ومحفظتك.',
    error,
    body: `<form id="regForm" novalidate>
      ${authField('email', 'email', 'البريد الإلكتروني', AUTH_ICONS.mail, 'autocomplete="email" inputmode="email" required dir="ltr"')}
      ${authField('password', 'password', 'كلمة المرور', AUTH_ICONS.lock, 'autocomplete="new-password" required minlength="8" dir="ltr"')}
      <div class="gl-hint" id="pwHint">8 أحرف على الأقل، وفيها حرف ورقم.</div>
      ${refCode ? `<div class="gl-alert ok">${AUTH_ICONS.check}<span>كود الدعوة <b dir="ltr">${escapeHtml(refCode)}</b> هيتسجّل مع حسابك.</span></div>` : ''}
      <label class="gl-check"><input type="checkbox" id="acceptDisclaimer"><span>قرأت <a id="viewDisclaimerLink">إخلاء المسؤولية</a> وأوافق عليه: الأدوات هنا للتحليل والتعليم، مش توصية استثمارية، والقرار والمسؤولية المالية عليّ بالكامل.</span></label>
      <button type="submit" class="gl-btn gl-btn-primary" id="regSubmit">إنشاء الحساب</button>
    </form>
    <div class="gl-foot-link">عندك حساب بالفعل؟ <button type="button" class="gl-link" id="goLogin">تسجيل الدخول</button></div>`
  });
  wireAuthCommon(() => renderPublicHome(), () => renderRegister());
  document.getElementById('goLogin').onclick = () => renderLogin();
  document.getElementById('viewDisclaimerLink').onclick = (e) => { e.preventDefault(); renderDisclaimerPage({ backTo: () => renderRegister() }); };
  const pwIn = document.getElementById('password'), hint = document.getElementById('pwHint');
  const pwOk = (v) => v.length >= 8 && /[0-9]/.test(v) && /[A-Za-z؀-ۿ]/.test(v);
  pwIn.addEventListener('input', () => { hint.classList.toggle('ok', pwOk(pwIn.value)); });
  document.getElementById('regForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = pwIn.value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return renderRegister('اكتب بريد إلكتروني صحيح.');
    if (!pwOk(password)) return renderRegister('كلمة المرور لازم تكون 8 أحرف على الأقل وفيها حرف ورقم.');
    if (!document.getElementById('acceptDisclaimer').checked) return renderRegister('لازم توافق على إخلاء المسؤولية عشان تكمّل التسجيل.');
    const btn = document.getElementById('regSubmit'); authBusy(btn, true, 'جاري إنشاء الحساب...');
    try{
      const r = await apiPost('/register.php', { email, password, acceptDisclaimer: '1', refCode });
      if (!r.success) return renderRegister(r.message || 'حصل خطأ أثناء إنشاء الحساب.');
      try { localStorage.setItem('griffine_remembered_email', email); } catch(e){}
      invalidateSessionCache();
      window.__isAdmin = !!r.is_admin;
      await refreshTopNav();
      postLoginRedirect(email);
    } catch(err){ renderRegister('تعذّر الاتصال بالسيرفر. تأكد من الإنترنت وحاول تاني.'); }
  };
}

async function renderForgotPassword(){
  pushNav(() => renderForgotPassword());
  window.__lastPageKey = 'forgot_password';
  app.innerHTML = authScreen({
    back: true,
    title: 'نسيت كلمة المرور؟',
    sub: 'اكتب بريدك المسجّل وهنبعتلك رابط تعيين كلمة مرور جديدة.',
    body: `<form id="forgotForm" novalidate>
      ${authField('fpEmail', 'email', 'البريد الإلكتروني', AUTH_ICONS.mail, 'autocomplete="email" inputmode="email" required dir="ltr"')}
      <div id="forgotResult"></div>
      <button type="submit" class="gl-btn gl-btn-primary" id="forgotSubmit">إرسال الرابط</button>
    </form>
    <div class="gl-foot-link"><button type="button" class="gl-link" id="backToLoginFromForgot">رجوع لتسجيل الدخول</button></div>`
  });
  wireAuthCommon(() => renderLogin(), () => renderForgotPassword());
  document.getElementById('backToLoginFromForgot').onclick = () => renderLogin();
  document.getElementById('forgotForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('fpEmail').value.trim().toLowerCase();
    const out = document.getElementById('forgotResult');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { out.innerHTML = '<div class="gl-alert err">اكتب بريد إلكتروني صحيح.</div>'; return; }
    const btn = document.getElementById('forgotSubmit'); authBusy(btn, true, 'جاري الإرسال...');
    let r; try { r = await forgotPassword(email); } catch(err){ r = { message: 'تعذّر الاتصال بالسيرفر.' }; }
    out.innerHTML = `<div class="gl-alert ok">${AUTH_ICONS.check}<span>${escapeHtml(r.message || 'لو البريد مسجّل عندنا هيوصلك رابط خلال دقائق.')}</span></div>`;
    authBusy(btn, false, 'إرسال الرابط');
  };
}

async function renderResetPassword(token){
  pushNav(() => renderResetPassword(token));
  window.__lastPageKey = 'reset_password';
  app.innerHTML = authScreen({
    back: false,
    title: 'كلمة مرور جديدة',
    sub: 'اختار كلمة مرور قوية (8 أحرف على الأقل، وفيها حرف ورقم).',
    body: `<form id="resetForm" novalidate>
      ${authField('rpPassword', 'password', 'كلمة المرور الجديدة', AUTH_ICONS.lock, 'autocomplete="new-password" required minlength="8" dir="ltr"')}
      ${authField('rpPassword2', 'password', 'تأكيد كلمة المرور', AUTH_ICONS.lock, 'autocomplete="new-password" required minlength="8" dir="ltr"')}
      <div id="resetResult"></div>
      <button type="submit" class="gl-btn gl-btn-primary" id="resetSubmit">حفظ كلمة المرور</button>
    </form>`
  });
  wireAuthCommon(null, () => renderResetPassword(token));
  document.getElementById('resetForm').onsubmit = async (e) => {
    e.preventDefault();
    const p1 = document.getElementById('rpPassword').value, p2 = document.getElementById('rpPassword2').value;
    const out = document.getElementById('resetResult');
    if (p1.length < 8 || !/[0-9]/.test(p1) || !/[A-Za-z؀-ۿ]/.test(p1)) { out.innerHTML = '<div class="gl-alert err">كلمة المرور لازم تكون 8 أحرف على الأقل وفيها حرف ورقم.</div>'; return; }
    if (p1 !== p2) { out.innerHTML = '<div class="gl-alert err">كلمتا المرور مش متطابقتين.</div>'; return; }
    const btn = document.getElementById('resetSubmit'); authBusy(btn, true, 'جاري الحفظ...');
    let r; try { r = await resetPassword(token, p1); } catch(err){ r = { success:false, message:'تعذّر الاتصال بالسيرفر.' }; }
    if (r.success) {
      try { history.replaceState(null, '', location.pathname); } catch(e){}
      out.innerHTML = `<div class="gl-alert ok">${AUTH_ICONS.check}<span>${escapeHtml(r.message || 'تم تغيير كلمة المرور.')}</span></div>`;
      btn.disabled = false; btn.textContent = 'تسجيل الدخول'; btn.type = 'button';
      btn.onclick = () => renderLogin();
      document.getElementById('resetForm').onsubmit = (ev) => { ev.preventDefault(); renderLogin(); };
    } else {
      out.innerHTML = `<div class="gl-alert err">${escapeHtml(r.message || 'الرابط غير صالح أو منتهي.')}</div>`;
      authBusy(btn, false, 'حفظ كلمة المرور');
    }
  };
}

// سياسة الخصوصية — النص الافتراضي تحت، والأدمن يقدر يستبدله بنص مخصص من "📝 تعديل نصوص شاشات الموقع"
async function renderPrivacyPolicyPage(options){
  pushNav(() => renderPrivacyPolicyPage(options));
  options = options || {};
  const email = await getSession();
  const pc = await getPageContent('privacy');
  const custom = (pc && pc.success && pc.content) ? pc.content : null;
  const p = 'font-size:13.5px;line-height:1.8;margin:0 0 12px;';
  const defaultHtml = `
      <h3>البيانات اللي بنجمعها</h3>
      <p style="${p}">بيانات حسابك (البريد الإلكتروني وكلمة المرور — وكلمة المرور بتتخزن مشفّرة). كمان بنحفظ بيانات الاشتراك اللي بتدخلها بنفسك، والخطط والصفقات اللي بتسجّلها داخل الموقع.</p>
      <h3>بنستخدمها في إيه</h3>
      <p style="${p}">تشغيل حسابك ومتابعة اشتراكك، وإرسال التنبيهات والإشعارات اللي فعّلتها، والرد على استفساراتك، وحماية الموقع من الاستخدام الخاطئ.</p>
      <h3>المشاركة</h3>
      <p style="${p}">مش بنبيع بياناتك، ومش بنشاركها مع أي طرف تاني إلا لو ده مطلوب قانونًا أو لازم لتشغيل خدمة أساسية (زي إرسال البريد الإلكتروني).</p>
      <h3>الحماية</h3>
      <p style="${p}">الموقع بيشتغل باتصال مشفّر (HTTPS) وبنحمي البيانات بإجراءات معقولة، لكن مفيش نظام آمن بنسبة 100%.</p>
      <h3>حقوقك وحذف الحساب</h3>
      <p style="${p}">تقدر تعدّل بياناتك من "الملف الشخصي"، وتحذف حسابك بنفسك في أي وقت من: حسابي ← حذف الحساب نهائيًا، أو من الرابط www.griffine.store/index.php?page=delete-account. الحذف بيمسح حسابك وخططك وصفقاتك وصورتك ومقترحاتك ومحادثاتك فورًا. بنحتفظ بس بسجل الاشتراكات والمبالغ المدفوعة (بدون اسمك ورقمك) لأغراض محاسبية، وبسجل الموافقة على إخلاء المسؤولية، وبإيميل الحساب داخل سجل الاشتراكات لمنع تكرار التجربة المجانية.</p>
      <p style="font-size:12px;color:var(--text-faint);margin:0;">ممكن نحدّث السياسة دي من وقت للتاني، وأي تحديث بيظهر هنا.</p>`;
  app.innerHTML = `<div class="container">${logoHeader()}
    <h2>${pageTitle('privacy_page','سياسة الخصوصية')}</h2>
    <div class="section-card">
      ${custom ? `<div style="font-size:13.5px;line-height:1.8;white-space:pre-wrap;">${escapeHtml(custom)}</div>` : defaultHtml}
    </div>
    <button class="btn-gray" id="privacyBackBtn">رجوع</button>
  </div>`;
  document.getElementById('privacyBackBtn').onclick = () => {
    if (options.backTo) return options.backTo();
    return email ? renderHome() : renderPublicHome();
  };
}

async function renderVerifyEmailResult(token){
  pushNav(() => renderVerifyEmailResult(token));
  window.__lastPageKey='verify_email_result'; app.innerHTML = `<div class="container">${logoHeader()}<h2>تفعيل البريد الإلكتروني</h2>
    <div id="verifyResultArea">جاري التحقق...</div></div>`;
  const r = await verifyEmailToken(token);
  const email = await getSession();
  document.getElementById('verifyResultArea').innerHTML = r.success
    ? `<div class="success-banner">✅ ${escapeHtml(r.message)}
        <button class="small" style="margin-top:10px;" id="continueAfterVerifyBtn">${email ? 'المتابعة إلى الموقع' : 'تسجيل الدخول'}</button>
      </div>`
    : `<div class="error">${escapeHtml(r.message)}</div>
       <button class="secondary" id="backToLoginAfterVerifyFail" style="margin-top:12px;">رجوع لتسجيل الدخول</button>`;
  const contBtn = document.getElementById('continueAfterVerifyBtn');
  if (contBtn) contBtn.onclick = () => { email ? postLoginRedirect(email) : renderLogin(); };
  const backBtn = document.getElementById('backToLoginAfterVerifyFail');
  if (backBtn) backBtn.onclick = () => renderLogin();
}
/* ================== الشاشة الرئيسية ================== */
async function renderHome(){
  if (window.GShell && GShell.enabled) return GShell.renderHome();
  pushNav(() => renderHome());
  setBottomNavActive('home');
  const email = await getSession();
  if(!email) return renderLogin();
  setBackButtonVisible(false);
  if(!(await ensureAccess())) return;
  const settings = await getAdminSettings();
  const hidden = (key) => settings[key] === true;
  app.innerHTML = `<div class="container">
    <div class="home-band">
      <div class="home-band-bg"><img src="${screenBgOr('home','login_hero.webp')}" alt="" draggable="false"></div>
      <div class="home-logo"><img src="${griffineLogoSrc()}" alt="GRIFFINE"><div class="home-wordmark">GRIFFINE</div></div>
      <div class="home-greet">
        <div style="font-size:13px;opacity:.85;">أهلًا بيك في GRIFFINE</div>
        <div style="font-size:20px;font-weight:800;margin-top:4px;">${email}</div>
        <div style="font-size:12.5px;opacity:.9;margin-top:10px;">استخدم القوائم في الشريط العلوي للتنقّل بين خطط الأسهم، المحفظة، والحساب — أو ابدأ من هنا مباشرة.</div>
      </div>
      <h2>${pageTitle('home','ابدأ من هنا')}</h2>
      <div class="action-grid cols-3">
        <button id="goNewPlanBtn" class="btn-lightgreen" style="margin-top:0;">+ خطة جديدة لسهم</button>
        <button id="goPlansListBtn" class="btn-lightgreen" style="margin-top:0;">📈 الأسهم والخطط</button>
        ${hidden('hide_portfolio_screen') ? '' : `<button id="goPortfolioBtn" class="btn-lightblue" style="margin-top:0;">📊 ملخص المحفظة</button>`}
        ${hidden('hide_screener_screen') ? '' : `<button id="goScreenerBtn" class="secondary" style="margin-top:0;">🔍 كشاف الأسهم</button>`}
      </div>
    </div>
  </div>`;
  document.getElementById('goNewPlanBtn').onclick=()=>renderPlanTypeChooser();
  document.getElementById('goPlansListBtn').onclick=()=>renderPlansList();
  if(document.getElementById('goPortfolioBtn')) document.getElementById('goPortfolioBtn').onclick=()=>renderPortfolio();
  if(document.getElementById('goScreenerBtn')) document.getElementById('goScreenerBtn').onclick=()=>renderScreener();
}

/* ================== سجل اشتراكي (تقرير العميل) ================== */
async function renderMySubscriptionHistory(){
  pushNav(() => renderMySubscriptionHistory());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;

  const res = await getMySubscriptionHistory();
  const events = (res && res.success) ? res.events : [];
  const typeLabel = { new_subscription:'اشتراك جديد', plan_change:'تغيير باقة', renewal:'تجديد', gift:'باقة هدية' };

  app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${email}</strong></div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button></div>
    <h2>${pageTitle('my_subscription_history','📄 سجل اشتراكي')}</h2>
    <div class="section-card">
      ${events.length ? `<table>
        <thead><tr><th>التاريخ</th><th>النوع</th><th>الباقة</th><th>المبلغ</th></tr></thead>
        <tbody>
          ${events.map(ev=>`<tr>
            <td>${formatDateAr(ev.eventDate)}</td>
            <td>${typeLabel[ev.eventType] || ev.eventType}</td>
            <td>${ev.planName || '-'}</td>
            <td>${ev.amount ? fmtMoney(ev.amount) : 'مجانًا'}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<p style="color:#888;font-size:13px;">لسه معندكش أي اشتراكات مسجّلة.</p>'}
    </div>
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();
}

/* ================== إخلاء المسؤولية - صفحة كاملة + بوابة موافقة إلزامية ================== */
async function renderDisclaimerPage(options){
  pushNav(() => renderDisclaimerPage(options));
  options = options || {};
  const res = await getPublicDisclaimerText();
  const text = (res && res.success) ? res.text : '';
  const email = await getSession();
  app.innerHTML = `<div class="container">${logoHeader()}
    <h2>${pageTitle('disclaimer_page','⚠️ إخلاء المسؤولية (Disclaimer)')}</h2>
    <div class="section-card" id="disclaimerTextWrap" style="line-height:1.9;font-size:14.5px;"></div>
    <button class="secondary small" id="disclaimerBackBtn" style="margin-top:14px;">رجوع</button>
  </div>`;
  document.getElementById('disclaimerTextWrap').textContent = text;
  document.getElementById('disclaimerBackBtn').onclick = () => {
    if (options.backTo) return options.backTo();
    if (email) return renderHome();
    return renderLogin();
  };
}

// بيتأكد إن العميل (مش الأدمن) وافق على النسخة الحالية من إخلاء المسؤولية قبل ما يكمل استخدام الموقع
async function ensureDisclaimerAccepted(email){
  if (window.__isAdmin) return true;
  const res = await getDisclaimerStatus();
  if (!res || !res.success) return true; // فشل مؤقت في السيرفر مش سبب كافي نقفل الموقع بسببه
  if (res.accepted) return true;
  renderDisclaimerGate(email, res.text);
  return false;
}

async function renderDisclaimerGate(email, text){
  app.innerHTML = `<div class="container">${logoHeader()}
    <h2>${pageTitle('disclaimer_gate','⚠️ إخلاء المسؤولية')}</h2>
    <div class="info">قبل ما تكمّل استخدام الموقع، لازم توافق على النص التالي:</div>
    <div class="section-card" id="gateTextWrap" style="max-height:280px;overflow-y:auto;line-height:1.9;font-size:14.5px;"></div>
    <label style="display:flex;align-items:flex-start;gap:8px;font-weight:normal;margin-top:14px;">
      <input type="checkbox" id="gateAccept" style="margin-top:3px;"> أوافق على إخلاء المسؤولية وأتحمل كامل المسؤولية عن قراراتي الاستثمارية
    </label>
    <button id="gateContinueBtn" style="margin-top:14px;" disabled>أوافق وأكمل</button>
    <button class="secondary small" id="gateLogoutBtn" style="margin-top:8px;">تسجيل خروج</button>
    <div id="gateResult"></div>
  </div>`;
  document.getElementById('gateTextWrap').textContent = text;
  document.getElementById('gateAccept').onchange = (e)=>{ document.getElementById('gateContinueBtn').disabled = !e.target.checked; };
  document.getElementById('gateLogoutBtn').onclick = async()=>{ await setSession(''); window.__screens = []; window.__screenIndex = -1; await refreshTopNav(); renderLogin(); };
  document.getElementById('gateContinueBtn').onclick = async () => {
    const r = await acceptDisclaimer();
    if (r.success) { postLoginRedirect(email); } else { document.getElementById('gateResult').innerHTML = `<div class="error" style="margin-top:8px;">${r.message||'حصل خطأ'}</div>`; }
  };
}

async function renderAboutPage(){
  pushNav(() => renderAboutPage());
  const email = await getSession();
  const pc = await getPageContent('about');
  const custom = (pc && pc.success && pc.content) ? pc.content : null;
  const defaultHtml = `
      <p style="font-size:13.5px;line-height:1.8;margin:0 0 12px;">GRIFFINE أداة لمتابعة خطط تعزيز متوسط الأسهم (DCA) وخطط الشبكة (Grid)، مع كشاف لفرص الشراء وملخص شامل لمحفظتك في مكان واحد.</p>
      <p style="font-size:13.5px;line-height:1.8;margin:0 0 12px;">التطبيق تابع لشركة Top7، ويهدف لتبسيط تخطيط ومتابعة استراتيجيات الشراء التدريجي للأسهم في الأسواق المصرية والخليجية.</p>
      <p style="font-size:12px;color:var(--text-faint);margin:0;">الأرقام والتقارير داخل GRIFFINE مبنية على بيانات تسجّلها بنفسك، ولا تُعد توصية استثمارية بأي شكل.</p>`;
  app.innerHTML = `<div class="container">
    <div class="logo-header"><img src="${griffineLogoSrc()}" alt="GRIFFINE" class="brand-logo-img"><h1>GRIFFINE</h1></div>
    <h2>${pageTitle('about_page','عن GRIFFINE')}</h2>
    <div class="section-card">
      ${custom ? `<div style="font-size:13.5px;line-height:1.8;white-space:pre-wrap;">${escapeHtml(custom)}</div>` : defaultHtml}
    </div>
    <button class="btn-gray" id="backHomeFromAboutBtn">🏠 رجوع للشاشة الرئيسية</button>
  </div>`;
  document.getElementById('backHomeFromAboutBtn').onclick=()=>{ email ? renderHome() : renderPublicHome(); };
}

async function renderRefundPolicyPage(){
  pushNav(() => renderRefundPolicyPage());
  const email = await getSession();
  const pc = await getPageContent('refund_policy');
  const custom = (pc && pc.success && pc.content) ? pc.content : null;
  const defaultHtml = `
      <p style="font-size:13.5px;line-height:1.8;margin:0 0 12px;">الاشتراك في GRIFFINE يمنحك وصولًا لأدوات المتابعة والتخطيط طوال مدة الباقة (شهرية أو سنوية) اللي اخترتها.</p>
      <p style="font-size:13.5px;line-height:1.8;margin:0 0 12px;">لو حابب تلغي اشتراكك أو تسترجع قيمته، تواصل معانا من صفحة "تواصل معنا" مع ذكر تاريخ الاشتراك وسبب الطلب، وهنرد عليك بأقرب وقت ممكن لمراجعة الطلب.</p>
      <p style="font-size:12px;color:var(--text-faint);margin:0;">المبالغ المستردة (لو تم الموافقة عليها) بترجع بنفس وسيلة الدفع المستخدمة وقت الاشتراك.</p>`;
  app.innerHTML = `<div class="container">
    <div class="logo-header"><img src="${griffineLogoSrc()}" alt="GRIFFINE" class="brand-logo-img"><h1>GRIFFINE</h1></div>
    <h2>${pageTitle('refund_policy_page','سياسة استرداد الاشتراك')}</h2>
    <div class="section-card">
      ${custom ? `<div style="font-size:13.5px;line-height:1.8;white-space:pre-wrap;">${escapeHtml(custom)}</div>` : defaultHtml}
    </div>
    <button class="btn-gray" id="backHomeFromRefundBtn">🏠 رجوع للشاشة الرئيسية</button>
  </div>`;
  document.getElementById('backHomeFromRefundBtn').onclick=()=>{ email ? renderHome() : renderPublicHome(); };
}

async function renderSuggestionsPage(){
  pushNav(() => renderSuggestionsPage());
  const email = await getSession();
  if(!email) return renderLogin();

  const pc = await getPageContent('suggestions');
  const introText = (pc && pc.success && pc.content) ? pc.content : 'اكتب أي فكرة تفيد الموقع، أو اشرح طريقة أو ميزة محتاجها — لو الاقتراح استخدمناه في تطوير الموقع، ممكن نكافئك بفترة اشتراك مجانية. تقدر ترفق صورة أو ملف PDF يوضّح فكرتك.';

  app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>${pageTitle('suggestions_page','💡 شاركنا مقترحاتك')}</div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button></div>
    <div class="info" style="white-space:pre-wrap;">${escapeHtml(introText)}</div>
    <form id="suggestionForm">
      <label>اقتراحك أو فكرتك</label>
      <textarea id="suggestionMessage" rows="6" required placeholder="مثال: حابب أقدر أصفّي الأسهم حسب القطاع في كشاف الأسهم..."></textarea>
      <label>إرفاق صورة أو PDF (اختياري)</label>
      <input type="file" accept="image/*,application/pdf" id="suggestionFile">
      <div id="suggestionFilePreview"></div>
      <button type="submit" style="margin-top:14px;">إرسال الاقتراح</button>
    </form>
    <div id="suggestionResult"></div>
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();

  let attachmentDataUrl = null;
  let attachmentName = null;
  document.getElementById('suggestionFile').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    const previewEl = document.getElementById('suggestionFilePreview');
    if (!file) { attachmentDataUrl = null; attachmentName = null; previewEl.innerHTML = ''; return; }
    attachmentName = file.name;
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        attachmentDataUrl = ev.target.result;
        previewEl.innerHTML = `<div class="info" style="margin-top:6px;">📎 ${escapeHtml(file.name)}</div>`;
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1000;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          canvas.width = img.width * scale; canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          attachmentDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          previewEl.innerHTML = `<img src="${attachmentDataUrl}" style="max-width:200px;border-radius:8px;margin-top:6px;">`;
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      previewEl.innerHTML = '<div class="error" style="margin-top:6px;">الملف لازم يكون صورة أو PDF بس.</div>';
      attachmentDataUrl = null; attachmentName = null;
    }
  });

  document.getElementById('suggestionForm').onsubmit = async (e) => {
    e.preventDefault();
    const message = document.getElementById('suggestionMessage').value.trim();
    const resultEl = document.getElementById('suggestionResult');
    if (!message) { resultEl.innerHTML = '<div class="error" style="margin-top:10px;">اكتب اقتراحك الأول.</div>'; return; }
    const r = await apiPost('/suggestion_submit.php', { message, attachment: attachmentDataUrl, attachmentName });
    if (r && r.success) {
      resultEl.innerHTML = '<div class="info" style="margin-top:10px;">✅ شكرًا لك! وصلنا اقتراحك وهنراجعه.</div>';
      document.getElementById('suggestionForm').reset();
      document.getElementById('suggestionFilePreview').innerHTML = '';
      attachmentDataUrl = null; attachmentName = null;
    } else {
      resultEl.innerHTML = `<div class="error" style="margin-top:10px;">${(r&&r.message)||'حصل خطأ في إرسال الاقتراح'}</div>`;
    }
  };
}

async function renderContactInfo(){
  pushNav(() => renderContactInfo());
  const email = await getSession();
  const pc = await getPageContent('contact');
  const custom = (pc && pc.success && pc.content) ? pc.content : null;
  // الإصدار 84: رقم التواصل = رقم الخدمة من لوحة التحكم
  const svcPhone = (await getSiteConfig()).servicePhone;
  const svcWa = String(svcPhone).replace(/\D/g, '').replace(/^00/, '').replace(/^0(1\d{9})$/, '20$1');
  const defaultHtml = `
      <p style="font-size:13px;color:#555;margin:0 0 10px;">تطبيق GRIFFINE تابع لشركة Top7</p>
      <div style="font-size:14px;margin:10px 0;"><strong>📧 البريد الإلكتروني:</strong> <a href="mailto:info@griffine.store" style="color:var(--green-dark);font-weight:600;">info@griffine.store</a></div>
      <div style="font-size:14px;margin:10px 0;"><strong>📱 رقم التواصل:</strong> <span dir="ltr">${escapeHtml(svcPhone)}</span></div>
      <div style="font-size:14px;margin:10px 0;display:flex;align-items:center;gap:8px;">
        <strong>واتساب:</strong>
        <a href="https://wa.me/${svcWa}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;color:var(--green-dark);font-weight:600;">
          <svg width="22" height="22" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="16" fill="#25D366"/>
            <path d="M22.6 9.4c-1.7-1.7-4-2.6-6.4-2.6-5 0-9 4-9 9 0 1.6.4 3.1 1.2 4.5L7 25l4.8-1.3c1.3.7 2.8 1.1 4.4 1.1 5 0 9-4 9-9 0-2.4-.9-4.7-2.6-6.4zm-6.4 13.8c-1.4 0-2.7-.4-3.9-1.1l-.3-.2-2.9.8.8-2.8-.2-.3c-.8-1.2-1.2-2.6-1.2-4.1 0-4.1 3.3-7.4 7.4-7.4 2 0 3.8.8 5.2 2.2 1.4 1.4 2.2 3.2 2.2 5.2.1 4.1-3.3 7.4-7.1 7.4zm4-5.5c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.7.9-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.2.2-.4.1-.1 0-.3 0-.4-.1-.1-.5-1.3-.7-1.7-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.2.9 2.4.1.2 1.6 2.4 3.8 3.4.5.2.9.4 1.3.5.5.2 1 .1 1.3.1.4-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1-.1-.1-.2-.1-.4-.2z" fill="#fff"/>
          </svg>
          <span dir="ltr">${escapeHtml(svcPhone)}</span>
        </a>
      </div>`;
  app.innerHTML = `<div class="container">
    <div class="logo-header"><img src="${top7LogoSrc()}" alt="Top7" style="height:70px;"></div>
    <div class="topbar"><div>${email ? `مرحبًا <strong>${email}</strong>` : pageTitle('contact_info','بيانات التواصل')}</div></div>
    <div style="text-align:left;margin-bottom:10px;">
      <img src="${griffineLogoSrc()}" alt="GRIFFINE" style="height:70px;">
      <div class="griffine-wordmark" style="font-weight:bold;letter-spacing:3px;font-size:16px;color:var(--green-dark);margin-top:4px;font-family:var(--font-head);">GRIFFINE</div>
    </div>
    <h2>بيانات التواصل</h2>
    <div class="section-card">
      ${custom ? `<div style="font-size:13.5px;line-height:1.8;white-space:pre-wrap;">${escapeHtml(custom)}</div>` : defaultHtml}
    </div>
    <button class="btn-gray" id="backHomeFromContactBtn">🏠 رجوع للشاشة الرئيسية</button>
  </div>`;
  document.getElementById('backHomeFromContactBtn').onclick=()=>{ email ? renderHome() : renderPublicHome(); };
}

/* ================== شاشة اشتراك العملاء (شكل وفكرة - التفعيل الفعلي والدفع سيتم ربطهم بعد إطلاق الموقع على السيرفر) ================== */
async function renderSubscriptionPlans(){
  pushNav(() => renderSubscriptionPlans());
  const email = await getSession();
  if(!email) return renderLogin();

  const marketToCurrency = { 'مصر':'جنيه مصري', 'السعودية':'ريال سعودي', 'الإمارات':'درهم إماراتي', 'قطر':'ريال قطري', 'الكويت':'دينار كويتي' };

  const myRes = await getMySubscription();
  const mySub = (myRes && myRes.success) ? myRes.subscription : null;
  const selectedMarket = (mySub && mySub.market) || 'مصر';

  window.__lastPageKey='subscription_plans'; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${email}</strong></div></div>

    <div id="currentPlanArea"></div>

    <h2>${mySub ? 'طلب ترقية أو تخفيض الباقة' : 'اختر باقة الاشتراك'}</h2>
    ${mySub ? `<div class="info">الباقة الجديدة اللي هتختارها هتتفعّل تلقائيًا فور ما باقتك الحالية تخلص (${formatDateAr(mySub.endDate)}) — مش هتدفع أو تتأثر خدمتك قبل كده.</div>` : ''}
    <div class="section-card">
      <label>الدولة / البورصة (لتحديد العملة)</label>
      <select id="subMarket" style="max-width:260px;">
        <option value="مصر">مصر (EGX) — جنيه مصري</option>
        <option value="السعودية">السعودية (تداول) — ريال سعودي</option>
        <option value="الإمارات">الإمارات — درهم إماراتي</option>
        <option value="قطر">قطر — ريال قطري</option>
        <option value="الكويت">الكويت — دينار كويتي</option>
      </select>
    </div>

    <div class="pricing-grid" id="pricingGrid"></div>

    <div id="subConfirmArea"></div>

    <button class="secondary" id="skipToHomeLink" style="margin-top:18px;">${mySub ? '🏠 رجوع للشاشة الرئيسية' : 'تخطي الآن والدخول على الموقع'}</button>
  </div>`;
  document.getElementById('skipToHomeLink').onclick=()=>renderHome();
  document.getElementById('subMarket').value = selectedMarket;

  if (mySub) {
    document.getElementById('currentPlanArea').innerHTML = `
      <div class="section-card" style="border:2px solid var(--green);">
        <strong style="color:var(--green-dark);">باقتك الحالية: ${escapeHtml(mySub.planName)}</strong>
        (${mySub.amount===0?'مجانًا':fmtMoney(mySub.amount)+' '+mySub.currency})<br>
        <span style="font-size:12.5px;color:#666;">من ${formatDateAr(mySub.startDate)} إلى ${formatDateAr(mySub.endDate)}</span>
        ${mySub.pendingPlanName ? `<div class="info" style="margin-top:8px;">📅 في انتظار التفعيل: <strong>${escapeHtml(mySub.pendingPlanName)}</strong> — هتتفعّل تلقائيًا يوم ${formatDateAr(mySub.endDate)}</div>` : ''}
      </div>`;
  }

  async function renderCards(){
    const market = document.getElementById('subMarket').value;
    const currency = marketToCurrency[market];
    const grid = document.getElementById('pricingGrid');
    grid.innerHTML = '<p style="text-align:center;color:#888;font-size:13px;grid-column:1/-1;">جاري تحميل الباقات...</p>';

    const res = await getPlansList();
    if (!res || !res.success || !res.plans.length) {
      grid.innerHTML = '<p style="text-align:center;color:#888;font-size:13px;grid-column:1/-1;">مفيش باقات متاحة دلوقتي، حاول تاني لاحقًا.</p>';
      return;
    }
    // التجربة المجانية مرة واحدة بس - متظهرش لحد عنده اشتراك بالفعل
    const plans = mySub ? res.plans.filter(p => Number(p.amount) > 0) : res.plans;

    grid.innerHTML = plans.map(p => `
      <div class="price-card ${p.badge==='الأكثر توفيرًا'?'featured':''} ${mySub && mySub.planId===p.id ? 'selected':''}" data-plan="${p.id}">
        ${p.badge ? `<div class="price-badge">${escapeHtml(p.badge)}</div>` : ''}
        <div class="price-plan-name">${escapeHtml(p.name)}</div>
        <div class="price-amount">${p.amount===0?'مجانًا':p.amount.toLocaleString('en-US')}<span> ${p.amount>0?currency:''}</span></div>
        <div style="font-size:12px;color:#888;">${escapeHtml(p.periodLabel)}</div>
        ${p.saveNote?`<div class="price-save">${p.saveNote.replace('عن السعر', 'جنيه عن السعر')}</div>`:'<div style="height:18px;"></div>'}
        <ul class="price-features">${(p.features||[]).map(f=>`<li>${f}</li>`).join('')}</ul>
        <button class="small choosePlanBtn" data-plan="${p.id}" style="width:100%;">
          ${mySub ? (mySub.planId===p.id ? 'باقتك الحالية' : 'طلب التحويل لهذه الباقة') : (p.amount===0?'ابدأ التجربة المجانية':'اشترك الآن')}
        </button>
      </div>`).join('');

    document.querySelectorAll('.choosePlanBtn').forEach(btn=>{
      btn.onclick = () => {
        const planId = btn.dataset.plan;
        const plan = plans.find(x=>x.id===planId);
        if (mySub) {
          if (mySub.planId===planId) return;
          renderPlanChangeCheckout({ planId, planName: plan.name, amount: plan.amount, durationDays: plan.durationDays, currency, market }, mySub);
        } else {
          renderCheckoutForm({ planId, planName: plan.name, amount: plan.amount, durationDays: plan.durationDays, currency, market });
        }
      };
    });
  }
  await renderCards();
  document.getElementById('subMarket').addEventListener('change', renderCards);
}

/* ================== شاشة تأكيد ودفع تغيير الباقة (ترقية/تخفيض) ================== */
async function renderPlanChangeCheckout(newPlan, currentSub){
  pushNav(() => renderPlanChangeCheckout(newPlan, currentSub));
  const email = await getSession();
  if(!email) return renderLogin();
  const settings = await getAdminSettings();
  const needRef = settings.require_payment_ref !== false;
  const needProof = settings.require_payment_proof !== false;
  const payCfg = await getSiteConfig(true);   // الإصدار 84: طرق الدفع ورقم الخدمة من لوحة التحكم

  const isUpgrade = newPlan.amount > currentSub.amount;
  let chosenMode = isUpgrade ? null : 'deferred'; // تخفيض دايمًا مؤجل، ترقية تحتاج اختيار

  window.__lastPageKey='plan_change_checkout'; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${email}</strong></div></div>

    <h2>تأكيد تغيير الباقة</h2>
    <div class="section-card">
      باقتك الحالية: <strong>${escapeHtml(currentSub.planName)}</strong> (سارية حتى ${formatDateAr(currentSub.endDate)})<br>
      الباقة الجديدة: <strong>${escapeHtml(newPlan.planName)}</strong> — ${newPlan.amount===0?'مجانًا':fmtMoney(newPlan.amount)+' '+newPlan.currency}
    </div>

    <div id="modeChoiceArea"></div>
    <div id="planChangePaymentArea"></div>
    <div class="muted-link"><a id="backToSubPlansLink">إلغاء والرجوع</a></div>
  </div>`;
  document.getElementById('backToSubPlansLink').onclick=()=>renderSubscriptionPlans();

  function renderModeChoice(){
    if (!isUpgrade){
      document.getElementById('modeChoiceArea').innerHTML = `
        <div class="info">📌 هتفضل مستفيد بكل مميزات باقتك الحالية (${escapeHtml(currentSub.planName)}) لحد ${formatDateAr(currentSub.endDate)}، وبعدها هتتحول تلقائيًا للباقة المخفضة (${escapeHtml(newPlan.planName)}).</div>`;
      renderPaymentSection();
      return;
    }
    document.getElementById('modeChoiceArea').innerHTML = `
      <div class="section-card">
        <label>اختر طريقة الانتقال</label>
        <div class="radio-row" style="flex-direction:column;align-items:stretch;gap:8px;">
          <label class="ms-item" style="border:1px solid #e7ebe9;border-radius:8px;padding:10px;">
            <input type="radio" name="switchMode" value="immediate"> <strong>انتقل الآن</strong> — هتفقد الأيام المتبقية من باقتك الحالية (${formatDateAr(currentSub.endDate)})
          </label>
          <label class="ms-item" style="border:1px solid #e7ebe9;border-radius:8px;padding:10px;">
            <input type="radio" name="switchMode" value="deferred" checked> <strong>ادفع الآن وانتقل لاحقًا</strong> — هتفضل مستفيد من باقتك الحالية لحد ${formatDateAr(currentSub.endDate)}، وبعدها هتتفعّل الباقة الجديدة تلقائيًا
          </label>
        </div>
      </div>`;
    chosenMode = 'deferred';
    document.querySelectorAll('input[name="switchMode"]').forEach(r=>{
      r.addEventListener('change', (e)=>{ chosenMode = e.target.value; renderPaymentSection(); });
    });
    renderPaymentSection();
  }

  function renderPaymentSection(){
    const modeNote = chosenMode==='immediate'
      ? `<div class="info">⚠️ عند التأكيد، هتتحول فورًا للباقة الجديدة، وأي أيام متبقية من باقتك الحالية هتتلغي.</div>`
      : '';
    if (newPlan.amount === 0){
      document.getElementById('planChangePaymentArea').innerHTML = `
        ${modeNote}
        <button id="confirmPlanChangeBtn">تأكيد التحويل للباقة المجانية</button>`;
      document.getElementById('confirmPlanChangeBtn').onclick = () => submitPlanChange(null, null, null);
      return;
    }
    document.getElementById('planChangePaymentArea').innerHTML = `
      ${modeNote}
      ${paymentMethodsHtml('pc', payCfg, needRef, needProof)}
      <button id="confirmPlanChangeBtn" style="margin-top:14px;">تأكيد ${chosenMode==='immediate'?'الانتقال الآن':'السداد'}</button>`;

    const pay = wirePaymentMethods('pc', payCfg);
    document.getElementById('confirmPlanChangeBtn').onclick = () => {
      const v = pay.get();
      if (!v.method) { alert('مفيش طريقة دفع متاحة دلوقتي.'); return; }
      submitPlanChange(v.method, v.ref, v.proof);
    };
  }

  async function submitPlanChange(method, ref, proof){
    if (newPlan.amount > 0 && (method==='vodafone' || method==='instapay')) {
      if ((needRef && !ref) || (needProof && !proof)) {
        alert('لازم تدخل رقم عملية التحويل وترفق صورة إثبات التحويل قبل تأكيد تغيير الباقة — مفيش تحويل بدون السداد والإشعار.');
        return;
      }
    }
    const btn = document.getElementById('confirmPlanChangeBtn');
    btn.disabled = true; btn.textContent = 'جاري الإرسال...';
    const r = await requestPlanChange(newPlan.planId, newPlan.planName, newPlan.amount, newPlan.durationDays, chosenMode==='immediate', method, ref, proof);
    if (r.success && r.redirect) { window.location.href = r.redirect; return; }   // الإصدار 84: Paymob
    if (r.success){
      window.__lastPageKey='plan_change_checkout'; app.innerHTML = `<div class="container">${logoHeader()}
        <div class="success-banner">✅ ${escapeHtml(r.message)}
          <button class="small" style="margin-top:10px;" id="continueAfterChangeBtn">المتابعة إلى الموقع</button>
        </div>
      </div>`;
      document.getElementById('continueAfterChangeBtn').onclick=()=>postLoginRedirect(email);
    } else {
      document.getElementById('planChangePaymentArea').insertAdjacentHTML('beforeend', `<div class="error" style="margin-top:10px;">${r.message||'حصل خطأ، حاول تاني'}</div>`);
      btn.disabled = false; btn.textContent = 'إعادة المحاولة';
    }
  }

  renderModeChoice();
}
/* =====================================================================
   الإصدار 84: طرق الدفع - بتتبني من إعدادات لوحة التحكم (رقم الخدمة + الطرق المفعّلة)
   - فودافون كاش + رقم العملية + صورة التحويل (رقم الخدمة)
   - إنستاباي + رقم العملية + صورة التحويل
   - فيزا / ماستركارد / ميزة أونلاين عن طريق Paymob (الاشتراك بيتفعّل تلقائي بعد الدفع)
   بيانات الكارت عمرها ما بتتكتب في موقعنا - بتتكتب في صفحة Paymob الآمنة بس
   ===================================================================== */
let __siteCfgPromise = null;
function getSiteConfig(force){
  if (force || !__siteCfgPromise) __siteCfgPromise = apiGet('/site_public_config.php').then(r => (r && r.success) ? r.config : null).catch(() => null)
    .then(c => c || { servicePhone: '00201095125325', instapayAddress: '00201095125325', payVodafone: true, payInstapay: true, payPaymob: false });
  return __siteCfgPromise;
}
const PAY_LABELS = { vodafone: 'فودافون كاش', instapay: 'إنستاباي', paymob: 'بطاقة بنكية (فيزا / ماستركارد / ميزة) - Paymob', wallet: 'محفظة إلكترونية', bank: 'تحويل بنكي', card: 'بطاقة (يدوي)', trial: 'تجربة مجانية' };
function payMethodLabel(m){ return PAY_LABELS[m] || m || '—'; }
function paymentMethodsHtml(p, cfg, needRef, needProof){
  const opts = [];
  if (cfg.payVodafone) opts.push(['vodafone', '📱 فودافون كاش (تحويل + صورة التحويل)']);
  if (cfg.payInstapay) opts.push(['instapay', '🏦 إنستاباي (تحويل + صورة التحويل)']);
  if (cfg.payPaymob) opts.push(['paymob', '💳 فيزا / ماستركارد / ميزة (دفع أونلاين فوري)']);
  if (!opts.length) return `<div class="error">مفيش طرق دفع متاحة دلوقتي - كلّمنا على ${escapeHtml(cfg.servicePhone)}.</div>`;
  return `
    <label>طريقة السداد</label>
    <select id="${p}Method">${opts.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select>
    <div id="${p}TransferFields">
      <div class="info" id="${p}PayNote"></div>
      <label>رقم/مرجع عملية التحويل ${needRef ? '<span style="color:#c0392b;">(إلزامي)</span>' : '(اختياري)'}</label>
      <input type="text" id="${p}Ref" placeholder="مثال: رقم العملية أو الرقم اللي حولت منه" dir="ltr">
      <label>إرفاق صورة إثبات التحويل ${needProof ? '<span style="color:#c0392b;">(إلزامي)</span>' : '(اختياري)'}</label>
      <input type="file" id="${p}Proof" accept="image/*,application/pdf">
      <div id="${p}ProofPreview" style="margin-top:8px;"></div>
    </div>
    <div id="${p}PaymobNote" class="info" style="display:none;">🔒 هتتحوّل لصفحة الدفع الآمنة بتاعة Paymob تكتب فيها بيانات الكارت (بياناتك مبتعدّيش على موقعنا خالص)، وأول ما الدفع يتم اشتراكك بيتفعّل تلقائي.</div>`;
}
/* بيربط الحقول ويرجّع get() ← { method, ref, proof } */
function wirePaymentMethods(p, cfg){
  const sel = document.getElementById(p + 'Method'); if (!sel) return { get: () => ({ method: null, ref: '', proof: null }) };
  let proof = null;
  const sync = () => {
    const m = sel.value, isT = m === 'vodafone' || m === 'instapay';
    document.getElementById(p + 'TransferFields').style.display = isT ? '' : 'none';
    document.getElementById(p + 'PaymobNote').style.display = m === 'paymob' ? '' : 'none';
    const num = m === 'instapay' ? (cfg.instapayAddress || cfg.servicePhone) : cfg.servicePhone;
    document.getElementById(p + 'PayNote').innerHTML = `💚 حوّل المبلغ ${m === 'instapay' ? 'عن طريق <strong>إنستاباي</strong> على' : 'على محفظة <strong>فودافون كاش</strong> رقم'}: <strong style="font-size:16px;letter-spacing:1px;" dir="ltr">${escapeHtml(num)}</strong><br><small>وبعدها اكتب رقم العملية وارفع صورة التحويل.</small>`;
  };
  sel.addEventListener('change', sync); sync();
  document.getElementById(p + 'Proof').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 6 * 1024 * 1024) { alert('الصورة كبيرة - أقصى حجم 6 ميجا.'); e.target.value = ''; return; }
    const rd = new FileReader();
    rd.onload = () => { proof = rd.result; document.getElementById(p + 'ProofPreview').innerHTML = /^data:image\//.test(proof) ? `<img src="${proof}" style="max-height:120px;border-radius:8px;border:1px solid #ddd;">` : '📄 ' + escapeHtml(f.name); };
    rd.readAsDataURL(f);
  });
  return { get: () => ({ method: sel.value, ref: (document.getElementById(p + 'Ref').value || '').trim(), proof }) };
}

async function renderCheckoutForm(planInfo){
  pushNav(() => renderCheckoutForm(planInfo));
  const email = await getSession();
  if(!email) return renderLogin();
  const settings = await getAdminSettings();
  const needRef = settings.require_payment_ref !== false;
  const needProof = settings.require_payment_proof !== false;
  const payCfg = await getSiteConfig(true);

  window.__lastPageKey='checkout_form'; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${email}</strong></div></div>

    <h2>إتمام الاشتراك</h2>
    <div class="section-card">
      <strong>${escapeHtml(planInfo.planName)}</strong> — ${planInfo.amount===0?'تجربة مجانية 30 يوم':fmtMoney(planInfo.amount)+' '+planInfo.currency}
    </div>

    <form id="checkoutForm">
      <label>الاسم بالكامل</label><input type="text" id="custName" required placeholder="مثال: أحمد محمد">
      <label>رقم الهاتف</label><input type="tel" id="custPhone" required placeholder="مثال: 01012345678">
      <label>البريد الإلكتروني للتواصل</label><input type="email" id="custEmail" required value="${email}">

      ${planInfo.amount>0 ? `
      ${paymentMethodsHtml('co', payCfg, needRef, needProof)}
      <div class="info" style="margin-top:10px;">⏳ التحويل (فودافون كاش / إنستاباي) بيتفعّل فور مراجعة السداد من فريقنا، والدفع بالبطاقة بيتفعّل فورًا.</div>
      ` : ''}

      <button type="submit">تأكيد الاشتراك</button>
    </form>
    <div class="muted-link"><a id="backToPlansLink">رجوع لاختيار خطة تانية</a></div>
  </div>`;
  document.getElementById('backToPlansLink').onclick=()=>renderSubscriptionPlans();

  const pay = planInfo.amount > 0 ? wirePaymentMethods('co', payCfg) : null;

  document.getElementById('checkoutForm').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const contactEmail = document.getElementById('custEmail').value.trim();
    const pv = pay ? pay.get() : { method: 'trial', ref: '', proof: null };
    const paymentMethod = pv.method || 'trial', paymentRef = pv.ref, paymentProofData = pv.proof;
    if (planInfo.amount > 0 && !pv.method) { alert('مفيش طريقة دفع متاحة دلوقتي.'); return; }
    if (planInfo.amount > 0 && (paymentMethod === 'vodafone' || paymentMethod === 'instapay')) {
      if ((needRef && !paymentRef) || (needProof && !paymentProofData)) {
        alert('لازم تدخل رقم عملية التحويل وترفق صورة إثبات التحويل قبل تأكيد الاشتراك — الاشتراك مايتفعّلش إلا بعد استلام السداد والإشعار.');
        return;
      }
    }

    const startDate = new Date().toISOString().split('T')[0];
    const durEnd = new Date(startDate); durEnd.setDate(durEnd.getDate() + (planInfo.durationDays || 30));
    const endDate = durEnd.toISOString().split('T')[0];

    const record = {
      id: 'sub_' + Date.now() + '_' + Math.floor(Math.random()*10000),
      accountEmail: email, name, phone, contactEmail,
      planId: planInfo.planId, planName: planInfo.planName, amount: planInfo.amount,
      currency: planInfo.currency, market: planInfo.market,
      paymentMethod, paymentRef, paymentProof: paymentProofData,
      startDate, endDate, createdAt: startDate,
      active: planInfo.amount===0, reminderEnabled: true, reminderIntervalDays: 2,
    };
    const submitBtn = e.target.querySelector('button[type="submit"]'); if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'جاري الإرسال...'; }
    const addRes = await addSubscriberRecord(record).catch(() => null);
    if (!addRes || !addRes.success) {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'تأكيد الاشتراك'; }
      alert((addRes && addRes.message) || 'حصل خطأ في الإرسال، حاول تاني.');
      return;
    }
    // الإصدار 84: الدفع بالبطاقة ← صفحة Paymob الآمنة
    if (addRes.redirect) { window.location.href = addRes.redirect; return; }
    await saveSubscription(email, { planId: planInfo.planId, planName: planInfo.planName, amount: planInfo.amount, currency: planInfo.currency, market: planInfo.market, startDate, endDate });

    window.__lastPageKey='checkout_form'; app.innerHTML = `<div class="container">${logoHeader()}
      <div class="success-banner">
        ✅ <strong>${planInfo.amount===0 ? 'تم تفعيل التجربة المجانية بنجاح!' : 'تم استلام طلب اشتراكك بنجاح!'}</strong><br>
        الخطة: ${escapeHtml(planInfo.planName)}<br>
        ${planInfo.amount===0
          ? `يبدأ: ${formatDateAr(startDate)} — ينتهي: ${formatDateAr(endDate)}`
          : `<span style="font-size:12.5px;color:#666;">هيتم تفعيل اشتراكك فور مراجعة السداد من فريقنا (عادة خلال ساعات قليلة).</span>`}
        <button class="small" style="margin-top:10px;" id="continueToHomeBtn2">المتابعة إلى الموقع</button>
      </div>
    </div>`;
    document.getElementById('continueToHomeBtn2').onclick=()=>postLoginRedirect(email);
  };
}

/* ================== لوحة تحكم المدير — كل المشتركين (للتجربة الآن، تُقيَّد بصلاحية مدير بعد إطلاق الموقع) ================== */
/* ================== شريط تنقّل لوحة التحكم - مبني حسب صلاحيات المستخدم الحالي ================== */
function adminNavButtonsHtml(){
  // كل زرار: id, الصلاحية المطلوبة (null = يظهر دايمًا), الأيقونة, النص، وأي HTML إضافي (زي البادج)
  const groups = [
    // الإصدار 73: المشتركين والموظفين أول قسم (كانوا ملهمش كارت في لوحة التحكم)
    { title: 'المشتركون والفريق', items: [
      { id:'goSubscribersBtn', perm:'manage_subscribers', icon:'👤', label:'المشتركون والاشتراكات' },
      { id:'goStaffBtn', perm:'manage_staff', icon:'👥', label:'الموظفين والصلاحيات' },
      { id:'goArchiveBtn', perm:'manage_subscribers', icon:'🗄️', label:'أرشيف العملاء المحذوفين' },
    ]},
    { title: 'التواصل والدعم', items: [
      { id:'goChatAdminBtn', perm:'view_chat', icon:'💬', label:'الدردشة الفورية', extra:`<span id="chatUnreadBadge" class="nav-badge" style="display:none;">0</span>` },
      { id:'goContentBtn', perm:'manage_content', icon:'📰', label:'آراء العملاء والمقالات' },
      { id:'goSuggestionsAdminBtn', perm:'manage_suggestions', icon:'💡', label:'مقترحات العملاء' },
    ]},
    { title: 'الإدارة المالية', items: [
      { id:'goPlansMgmtBtn', perm:'manage_plans', icon:'💳', label:'إدارة الخطط والأسعار' },
      { id:'goReportsBtn', perm:'view_reports', icon:'📊', label:'التقارير' },
      { id:'goRecommendationsBtn', perm:'manage_recommendations', icon:'📢', label:'توصيات الشراء' },
    ]},
    { title: 'الإدارة والصلاحيات', items: [
      { id:'goSettingsBtn', perm:'manage_admin_settings', icon:'⚙️', label:'الصلاحيات والإعدادات الإلزامية' },
      { id:'goEmailCenterBtn', perm:'manage_admin_settings', icon:'📧', label:'مركز الإيميلات (اختبار وسجل الإرسال)' },
      { id:'goBlacklistBtn', perm:'manage_blacklist', icon:'🚫', label:'القائمة السوداء' },
    ]},
    { title: 'المحتوى والتنسيق', items: [
      { id:'goStudioBtn', perm:'edit_site_design', icon:'🖌️', label:'استوديو التصميم (الثيمات وتعديل أي شاشة)' },
      { id:'goSiteDesignBtn', perm:'edit_site_design', icon:'🎨', label:'تنسيق الموقع' },
      { id:'goSiteTextsBtn', perm:'manage_site_content', icon:'📝', label:'نصوص شاشات الموقع' },
    ]},
    { title: 'التصدير والطباعة', items: [
      { id:'goExportScreensBtn', perm:'view_reports', icon:'🖨️', label:'طباعة صور كل الشاشات (PDF)' },
      { id:'goExportExcelBtn', perm:'manage_staff', superOnly:true, icon:'📊', label:'تصدير كل الحسابات والمدخلات (Excel)' },
    ]},
  ];

  const cardHtml = it => `<button class="admin-nav-card" id="${it.id}"><span class="nav-icon">${it.icon}</span><span class="nav-label">${escapeHtml(it.label)}</span>${it.extra||''}</button>`;

  const groupsHtml = groups.map(g => {
    const items = g.items.filter(it => (!it.perm || hasPermission(it.perm)) && (!it.superOnly || window.__isSuperAdmin));
    if (!items.length) return '';
    return `<div class="admin-nav-group">
      <div class="admin-nav-group-title">${escapeHtml(g.title)}</div>
      <div class="admin-nav-grid">${items.map(cardHtml).join('')}</div>
    </div>`;
  }).join('');

  return `<div class="admin-nav-groups">
    ${groupsHtml}
    <div class="admin-nav-grid"><button class="admin-nav-card" id="homeBtn"><span class="nav-icon">🏠</span><span class="nav-label">الشاشة الرئيسية</span></button></div>
  </div>`;
}
function wireAdminNavButtons(){
  if (window.__recLogTick) { clearInterval(window.__recLogTick); window.__recLogTick = null; }
  const map = {
    goSubscribersBtn: renderAdminSubscribers,
    goPlansMgmtBtn: renderPlansManagementPage,
    goChatAdminBtn: renderChatAdminPage,
    goSettingsBtn: renderAdminSettingsPage,
    goBlacklistBtn: renderBlacklist,
    goArchiveBtn: renderArchivedCustomers,
    goStaffBtn: renderStaffManagementPage,
    goSiteDesignBtn: renderSiteDesignPage,
    goStudioBtn: () => GStudio.openEditor(), // الإصدار 72: استوديو التصميم (studio.js)
    goEmailCenterBtn: () => GShell.renderEmailCenter(), // الإصدار 72: مركز الإيميلات (shell.js)
    goReportsBtn: renderAdminReportsPage,
    goRecommendationsBtn: renderRecommendationsAdminPage,
    goContentBtn: renderContentAdminPage,
    goSuggestionsAdminBtn: renderSuggestionsAdminPage,
    goSiteTextsBtn: renderSiteTextsAdminPage,
    goExportScreensBtn: () => GShell.exportScreensPdf(),
    goExportExcelBtn: () => { GShell.toast('جاري تجهيز ملف Excel... التحميل هيبدأ خلال ثواني', 'info'); location.href = 'admin_export_excel.php'; },
    homeBtn: renderHome,
  };
  Object.keys(map).forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.onclick = map[id];
  });
  updateChatUnreadBadge();
}
async function updateChatUnreadBadge(){
  const badge = document.getElementById('chatUnreadBadge');
  if (!badge || !hasPermission('view_chat')) return;
  try {
    const res = await apiGet('/chat_unread_count.php');
    if (res && res.success && res.unreadCount > 0) {
      badge.textContent = res.unreadCount > 9 ? '9+' : res.unreadCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  } catch (e) { /* الشبكة ممكن تفشل مرة، هتحاول تاني في الدورة الجاية */ }
}

// لوحة استقبال عامة لأي عضو فريق مالوش صلاحية "إدارة المشتركين" (يعني الصفحة الرئيسية بتاعت لوحة التحكم مش مناسبة له)
async function renderAdminHub(){
  pushNav(() => renderAdminHub());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('admin_hub','🛡️ لوحة التحكم')}</div>
      ${adminNavButtonsHtml()}
    </div>
    <div class="info">مرحبًا <strong>${email}</strong> — اختر من الأزرار فوق القسم اللي تقدر تدخله حسب صلاحياتك. لو مش شايف أي زرار غير "الشاشة الرئيسية"، يبقى معندكش أي صلاحية لسه — كلّم مدير الموقع يديك الصلاحية المناسبة.</div>
  </div>`;
  wireAdminNavButtons();
}

// زرار "رجوع للوحة التحكم" في كل الصفحات الفرعية بيستخدم ده - يودّي لصفحة المشتركين لو عنده صلاحيتها، وإلا لواجهة الاستقبال العامة
function goAdminHome(){
  if (hasPermission('manage_subscribers')) return renderAdminSubscribers();
  return renderAdminHub();
}

async function renderAdminSubscribers(){
  pushNav(() => renderAdminSubscribers());
  const email = await getSession(); // getSession() بتحدّث window.__isAdmin من السيرفر
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('manage_subscribers')) return renderAdminHub();
  let subscribers = await getAllSubscribers();
  let emailChangeRequests = [];
  try {
    const ecRes = await apiGet('/admin_list_email_change_requests.php');
    if (ecRes && ecRes.success) emailChangeRequests = ecRes.items.filter(r => r.status === 'pending');
  } catch (e) { /* لو حصل خطأ، القسم ده بس مش هيظهر، والباقي يفضل شغال عادي */ }
  function computeTotals(list){
    return list.reduce((s,r)=>s+(r.amount||0), 0);
  }

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('admin_subscribers','🛡️ لوحة تحكم المدير — المشتركون')}</div>
      ${adminNavButtonsHtml()}
    </div>
    <div class="info">🛡️ هذه اللوحة متصلة بقاعدة بيانات حقيقية — كل البيانات هنا فعلية.</div>

    ${emailChangeRequests.length ? `
    <h2 style="margin-top:20px;">✏️ طلبات تعديل البريد الإلكتروني (${emailChangeRequests.length})</h2>
    <div class="section-card">
      <table style="width:100%;">
        <thead><tr><th>البريد الحالي</th><th>البريد المطلوب</th><th>تاريخ الطلب</th><th></th></tr></thead>
        <tbody>
          ${emailChangeRequests.map(r => `<tr>
            <td>${escapeHtml(r.currentEmail)}</td><td>${escapeHtml(r.requestedEmail)}</td><td style="font-size:12px;">${escapeHtml(r.requestedAt)}</td>
            <td>
              <button class="secondary small" style="width:auto;" onclick="window.__reviewEmailChange(${r.id}, 'approved')">✅ موافقة</button>
              <button class="danger small" style="width:auto;" onclick="window.__reviewEmailChange(${r.id}, 'rejected')">❌ رفض</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <h2>إجماليات المشتركين</h2>
    <div class="summary-cards" id="adminSummaryCards"></div>

    <h2 style="margin-top:20px;">فترة العرض</h2>
    <div class="section-card">
      <div class="grid2">
        <div><label>من تاريخ</label><input type="date" id="admFrom"></div>
        <div><label>إلى تاريخ</label><input type="date" id="admTo"></div>
      </div>
      <div class="radio-row std-filter-tabs">
        <button class="small secondary period-preset std-filter-tab" id="admPresetDaily">اليوم</button>
        <button class="small secondary period-preset std-filter-tab" id="admPresetWeekly">آخر أسبوع</button>
        <button class="small secondary period-preset std-filter-tab" id="admPresetMonthly">آخر شهر</button>
        <button class="small secondary period-preset std-filter-tab btn-active" id="admPresetAll">كل الفترة</button>
      </div>
    </div>

    <h2 style="margin-top:20px;">إعدادات التذكيرات ومدة السماح (تطبّق على كل مشترك جديد، وتقدر تخصص كل مشترك لوحده تحت)</h2>
    <div class="section-card">
      <div class="grid2">
        <div><label>يبدأ التذكير قبل انتهاء الاشتراك بـ (أيام)</label><input type="number" id="remStartBefore" min="1"></div>
        <div><label>كل كام يوم يتكرر التذكير</label><input type="number" id="remInterval" min="1"></div>
      </div>
      <label>مدة السماح بعد انتهاء الاشتراك (أيام) — العميل بيفضل يستخدم الموقع خلالها لحد ما يجدد</label>
      <input type="number" id="remGracePeriod" min="0" style="max-width:150px;">
      <button class="small secondary" id="saveRemDefaultsBtn" style="width:auto;">حفظ الإعدادات الافتراضية</button>
      <div class="info" style="margin-top:8px;">
        ✅ إرسال تذكيرات الإيميل بقى شغال فعليًا (يشمل مشتركي الباقة المجانية كمان). عشان يبقى تلقائي يوميًا من غير ما تدوس أي زرار، لازم تظبط <strong>Cron Job</strong> من هوستنجر (تفاصيل في README_DEPLOY.md).
        الواتساب لسه هيتفعّل بعدين لحد ما نجهز ربط الـ API.
      </div>
      <button id="simulateRemindersBtn" class="secondary" style="margin-top:10px;">📨 معاينة: مين المستحق له تذكير النهارده</button>
      <button id="sendRemindersNowBtn" style="margin-top:8px;">📤 إرسال التذكيرات الآن فعليًا (إيميل)</button>
      <div id="reminderSimResult"></div>
    </div>

    <h2 style="margin-top:20px;">كل المشتركين</h2>
    <div class="section-card" id="subscribersTableWrap"></div>

    <h2 style="margin-top:24px;">طباعة / تصدير بيان</h2>
    <div class="section-card">
      <label>اختر المشتركين للبيان</label>
      <div class="ms-dropdown" id="admMsDropdown">
        <button type="button" class="ms-toggle" id="admMsToggleBtn">اختر المشتركين ▾</button>
        <div class="ms-panel" id="admMsPanel" style="display:none;">
          <label class="ms-item ms-all"><input type="checkbox" id="admSelectAll"> تحديد الكل</label>
          <div class="ms-sep"></div>
          <div id="admSubChecks"></div>
          <button type="button" class="small" id="admMsDoneBtn" style="width:100%;margin-top:8px;">تم</button>
        </div>
      </div>
      <button id="admPrintBtn" style="margin-top:14px;">🖨 طباعة بيان المشتركين (PDF)</button>
      <button id="admExportXlsBtn" class="secondary">⬇ تصدير Excel</button>
      <div style="font-size:11.5px;color:#888;margin-top:6px;">البيان بياخد في الاعتبار فترة العرض المحددة فوق + المشتركين المختارين هنا.</div>
    </div>

    <h2 style="margin-top:24px;">إضافة مشترك تجريبي</h2>
    <div class="section-card">
      <div class="info">⚠️ الموقع دلوقتي متصل بقاعدة بيانات حقيقية — أي بيانات هنا بتتحفظ فعليًا. استخدم الزرار ده للتجربة بس، واحذف السجل التجريبي بعدين من جدول المشتركين تحت.</div>
      <button class="small secondary" id="admAddTestBtn" style="margin-top:8px;">+ إضافة مشترك تجريبي عشوائي</button>
    </div>

    <p class="disclaimer">تنويه: هذه الأرقام لأغراض العرض والتجربة، ولا تُعد بيانات مالية رسمية حتى يتم ربط الموقع بنظام دفع وقاعدة بيانات حقيقية.</p>
  </div>`;

  wireAdminNavButtons();

  let currentFrom = null, currentTo = null;

  function isoDaysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0]; }
  function setActiveAdminPreset(btn){
    document.querySelectorAll('#admFrom, #admTo').forEach(()=>{});
    document.querySelectorAll('.period-preset').forEach(b=>b.classList.remove('btn-active'));
    if(btn) btn.classList.add('btn-active');
  }

  function filteredList(){
    return subscribers.filter(r => (!currentFrom || r.startDate>=currentFrom) && (!currentTo || r.startDate<=currentTo));
  }

  function renderSummary(list){
    const total = computeTotals(list);
    document.getElementById('adminSummaryCards').innerHTML = `
      <div class="summary-card"><div class="val">${list.length}</div><div class="lbl">عدد المشتركين (في الفترة المحددة)</div></div>
      <div class="summary-card"><div class="val">${fmtMoney(total)}</div><div class="lbl">إجمالي السداد لكل العملاء</div></div>
      <div class="summary-card"><div class="val">${list.filter(r=>r.planId==='monthly').length}</div><div class="lbl">مشتركين شهري</div></div>
      <div class="summary-card"><div class="val">${list.filter(r=>r.planId==='yearly').length}</div><div class="lbl">مشتركين سنوي</div></div>
      <div class="summary-card"><div class="val">${list.filter(r=>r.planId==='trial').length}</div><div class="lbl">تجربة مجانية</div></div>`;
  }

  function renderTable(list){
    document.getElementById('subscribersTableWrap').innerHTML = list.length ? `<table>
      <thead><tr>
        <th>الاسم</th><th>الهاتف</th><th>الإيميل</th><th>الخطة</th><th>بداية الخطة</th><th>تاريخ الانتهاء</th><th>قيمة السداد</th><th>طريقة السداد</th><th>الحالة</th><th>التذكيرات</th><th>صلاحيات خاصة</th><th></th>
      </tr></thead>
      <tbody>
        ${list.map(r=>{
          const isActive = r.active !== false;
          const remEnabled = r.reminderEnabled !== false;
          return `<tr>
          <td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.phone)}</td><td>${escapeHtml(r.contactEmail)}</td><td>${escapeHtml(r.planName)}${r.isComp?' <span class="tag" style="background:#e6f4ea;color:var(--green);">هدية</span>':''}</td>
          <td>${formatDateAr(r.startDate)}</td><td>${formatDateAr(r.endDate)}</td>
          <td>${r.amount===0?'مجانًا':fmtMoney(r.amount)+' '+r.currency}</td>
          <td>${r.paymentMethod ? escapeHtml(payMethodLabel(r.paymentMethod)) : '-'}
            ${r.paymentProof?`<br><button class="small secondary" style="width:auto;margin-top:4px;" onclick="window.__viewProof('${r.id}')">📎 عرض الإثبات</button>`:''}
          </td>
          <td>
            <span class="tag ${isActive?'tag-done':'tag-wait'}">${isActive?'مفعّل':'موقوف'}</span><br>
            <button class="small ${isActive?'danger':'secondary'}" style="width:auto;margin-top:4px;" onclick="window.__toggleSubActive('${r.id}')">${isActive?'إيقاف':'تفعيل'}</button>
          </td>
          <td>
            ${remEnabled ? `كل ${r.reminderIntervalDays||2} يوم` : '<span style="color:#c0392b;">موقوف</span>'}<br>
            <button class="small secondary" style="width:auto;margin-top:4px;" onclick="window.__editReminder('${r.id}')">تعديل</button>
          </td>
          <td>
            <button class="small secondary" style="width:auto;margin-bottom:4px;" onclick="window.__extendDays('${r.id}')">+ أيام مجانية</button><br>
            ${r.planId==='trial' ? `<button class="small btn-lightgreen" style="width:auto;margin-bottom:4px;" onclick="window.__convertFree('${r.id}')">تحويل لباقة مدفوعة مجانًا</button><br>` : ''}
          </td>
          <td><button class="small danger" style="width:auto;" onclick="window.__deleteSubRow('${r.id}')">🗄️ أرشفة</button></td>
        </tr>`}).join('')}
        <tr style="font-weight:bold;background:#f0f4f2;">
          <td colspan="6">الإجمالي</td><td>${fmtMoney(computeTotals(list))}</td><td colspan="5"></td>
        </tr>
      </tbody>
    </table>` : '<p style="color:#888;font-size:13px;">لا يوجد مشتركين في هذه الفترة.</p>';

    window.__viewProof = (id) => {
      const rec = list.find(x=>x.id===id) || subscribers.find(x=>x.id===id);
      if(!rec || !rec.paymentProof) return;
      const overlay = document.createElement('div');
      overlay.className = 'proof-modal-overlay';
      overlay.innerHTML = `<div class="proof-modal-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <strong>إثبات السداد — ${escapeHtml(rec.name)}</strong>
          <button class="small secondary" style="width:auto;" id="closeProofModalBtn">✕ إغلاق</button>
        </div>
        <img src="${escapeHtml(rec.paymentProof)}" style="max-width:100%;max-height:70vh;border-radius:8px;display:block;margin:0 auto;">
      </div>`;
      document.body.appendChild(overlay);
      overlay.onclick = (e) => { if(e.target===overlay) overlay.remove(); };
      document.getElementById('closeProofModalBtn').onclick = () => overlay.remove();
    };

    window.__toggleSubActive = async (id) => {
      await toggleSubscriberActive(id);
      subscribers = await getAllSubscribers();
      refreshAdmin();
    };

    window.__deleteSubRow = async (id) => {
      if(!await gConfirm('هيتم نقل العميل ده وكل تسجيلاته للأرشيف — تقدر تسترجعه أو تمسحه نهائي من صفحة الأرشيف. متأكد؟')) return;
      await deleteSubscriber(id);
      subscribers = await getAllSubscribers();
      refreshAdmin();
    };

    window.__extendDays = async (id) => {
      const rec = subscribers.find(x=>x.id===id);
      if(!rec) return;
      const val = await gPrompt(`كام يوم عايز تضيفه مجانًا لـ"${rec.name}"؟ (تاريخ الانتهاء الحالي: ${formatDateAr(rec.endDate)})`, '30', { type: 'number', ok: 'إضافة الأيام' });
      if(!val || isNaN(val) || +val===0) return;
      const r = await extendSubscriberDays(id, +val);
      if(r.success){
        alert(`تم — تاريخ الانتهاء الجديد: ${formatDateAr(r.newEndDate)}`);
        subscribers = await getAllSubscribers();
        refreshAdmin();
      } else {
        alert(r.message || 'حصل خطأ');
      }
    };


    window.__reviewEmailChange = async (id, decision) => {
      const msg = decision === 'approved' ? 'تأكيد الموافقة على تغيير البريد الإلكتروني؟ هيتغيّر في كل مكان (تسجيل الدخول، الاشتراك).' : 'تأكيد رفض الطلب؟';
      if (!await gConfirm(msg)) return;
      const res = await apiPost('/admin_review_email_change.php', { id, decision });
      if (res && res.success) { alert('تم التنفيذ بنجاح'); renderAdminSubscribers(); }
      else alert((res && res.message) || 'حصل خطأ');
    };

    window.__convertFree = async (id) => {
      const rec = subscribers.find(x=>x.id===id);
      if(!rec) return;
      // الإصدار 84: اختيار واضح بزرارين بدل "موافق = شهري / إلغاء = سنوي" (كان سهل الأدمن يغلط)
      const pick = await gChoice(`تحويل "${rec.name}" من التجربة المجانية لباقة مدفوعة بدون رسوم. اختار الباقة:`, ['الخطة الشهرية', 'الخطة السنوية']);
      if (pick === null) return;
      const planId = pick === 0 ? 'monthly' : 'yearly';
      const planName = pick === 0 ? 'الخطة الشهرية' : 'الخطة السنوية';
      const r = await convertSubscriberFree(id, planId, planName);
      if(r.success){
        alert(`تم التحويل — الخطة الجديدة سارية حتى ${formatDateAr(r.endDate)} بدون أي رسوم.`);
        subscribers = await getAllSubscribers();
        refreshAdmin();
      } else {
        alert(r.message || 'حصل خطأ');
      }
    };

    window.__editReminder = async (id) => {
      const rec = subscribers.find(x=>x.id===id);
      if(!rec) return;
      const currentInterval = rec.reminderIntervalDays || 2;
      const currentEnabled = rec.reminderEnabled !== false;
      const pick = await gChoice(`إعدادات تذكير "${rec.name}"\nحالة الإرسال الحالية: ${currentEnabled?'شغال كل '+currentInterval+' يوم':'موقوف'}`, ['تغيير عدد الأيام', currentEnabled ? 'إيقاف الإرسال' : 'تشغيل الإرسال']);
      if (pick === null) return;
      let newEnabled = currentEnabled, newInterval = currentInterval;
      if(pick === 0){
        const val = await gPrompt('كل كام يوم يتكرر التذكير لهذا المشترك؟', currentInterval, { type: 'number' });
        if(val && !isNaN(val) && +val>0){
          newInterval = +val;
          newEnabled = true;
        } else { return; }
      } else {
        newEnabled = !currentEnabled;
      }
      await updateSubscriberReminder(id, newEnabled, newInterval);
      subscribers = await getAllSubscribers();
      refreshAdmin();
    };
  }

  function renderMsChecks(list){
    document.getElementById('admSubChecks').innerHTML = list.map(r=>`
      <label class="ms-item"><input type="checkbox" class="admSubCheck" value="${r.id}"> ${escapeHtml(r.name)} — ${escapeHtml(r.planName)}</label>`).join('') ||
      '<div style="font-size:12px;color:#888;padding:6px;">لا يوجد مشتركين</div>';
  }

  let reminderDefaults = { startBeforeDays:6, intervalDays:2, gracePeriodDays:3 };
  async function loadReminderDefaultsUI(){
    reminderDefaults = await getReminderDefaults();
    document.getElementById('remStartBefore').value = reminderDefaults.startBeforeDays;
    document.getElementById('remInterval').value = reminderDefaults.intervalDays;
    document.getElementById('remGracePeriod').value = reminderDefaults.gracePeriodDays;
  }

  function refreshAdmin(){
    const list = filteredList();
    renderSummary(list);
    renderTable(list);
    renderMsChecks(list);
  }
  refreshAdmin();
  loadReminderDefaultsUI();

  document.getElementById('saveRemDefaultsBtn').onclick = async () => {
    const startBeforeDays = parseInt(document.getElementById('remStartBefore').value) || 6;
    const intervalDays = parseInt(document.getElementById('remInterval').value) || 2;
    const gracePeriodDays = parseInt(document.getElementById('remGracePeriod').value);
    const gpd = isNaN(gracePeriodDays) ? 3 : gracePeriodDays;
    await saveReminderDefaults({ startBeforeDays, intervalDays, gracePeriodDays: gpd });
    reminderDefaults = { startBeforeDays, intervalDays, gracePeriodDays: gpd };
    alert('اتحفظت الإعدادات الافتراضية بنجاح');
  };

  document.getElementById('simulateRemindersBtn').onclick = async () => {
    const due = subscribers.filter(r => r.active!==false && isReminderDueToday(r, reminderDefaults));
    document.getElementById('reminderSimResult').innerHTML = due.length ? `
      <div class="info" style="margin-top:10px;">
        <strong>📨 ${due.length} مشترك المفروض ياخد تذكير النهارده (${new Date().toLocaleDateString('ar-EG')}):</strong>
        <ul style="margin:8px 0 0;padding-right:18px;font-size:12.5px;">
          ${due.map(r=>`<li>${escapeHtml(r.name)} (${escapeHtml(r.contactEmail)} / ${escapeHtml(r.phone)}) — الاشتراك بينتهي ${formatDateAr(r.endDate)}</li>`).join('')}
        </ul>
      </div>` : `<div class="info" style="margin-top:10px;">مفيش أي مشترك مستحق له تذكير النهارده حسب الإعدادات الحالية.</div>`;
  };

  document.getElementById('sendRemindersNowBtn').onclick = async () => {
    const btn = document.getElementById('sendRemindersNowBtn');
    btn.disabled = true; btn.textContent = 'جاري الإرسال...';
    const r = await sendReminderEmailsNow();
    btn.disabled = false; btn.textContent = '📤 إرسال التذكيرات الآن فعليًا (إيميل)';
    if (r && r.success) {
      document.getElementById('reminderSimResult').innerHTML = `
        <div class="success-banner" style="margin-top:10px;">
          ✅ تم إرسال ${r.sentCount} إيميل تذكير فعليًا.
          ${r.log && r.log.length ? `<ul style="margin:8px 0 0;padding-right:18px;font-size:12.5px;">
            ${r.log.map(x=>`<li>${escapeHtml(x.name)} (${escapeHtml(x.email)}) — متبقي ${x.daysLeft} يوم — ${x.sent?'✅ اتبعت':'❌ فشل الإرسال'}</li>`).join('')}
          </ul>` : '<div style="font-size:12.5px;margin-top:6px;">مفيش أي مشترك مستحق له تذكير دلوقتي.</div>'}
        </div>`;
    } else {
      document.getElementById('reminderSimResult').innerHTML = `<div class="error" style="margin-top:10px;">${(r&&r.message)||'حصل خطأ في الإرسال'}</div>`;
    }
  };

  document.getElementById('admPresetDaily').onclick=()=>{ currentFrom=isoDaysAgo(0); currentTo=isoDaysAgo(0); document.getElementById('admFrom').value=currentFrom; document.getElementById('admTo').value=currentTo; setActiveAdminPreset(document.getElementById('admPresetDaily')); refreshAdmin(); };
  document.getElementById('admPresetWeekly').onclick=()=>{ currentFrom=isoDaysAgo(7); currentTo=isoDaysAgo(0); document.getElementById('admFrom').value=currentFrom; document.getElementById('admTo').value=currentTo; setActiveAdminPreset(document.getElementById('admPresetWeekly')); refreshAdmin(); };
  document.getElementById('admPresetMonthly').onclick=()=>{ currentFrom=isoDaysAgo(30); currentTo=isoDaysAgo(0); document.getElementById('admFrom').value=currentFrom; document.getElementById('admTo').value=currentTo; setActiveAdminPreset(document.getElementById('admPresetMonthly')); refreshAdmin(); };
  document.getElementById('admPresetAll').onclick=()=>{ currentFrom=null; currentTo=null; document.getElementById('admFrom').value=''; document.getElementById('admTo').value=''; setActiveAdminPreset(document.getElementById('admPresetAll')); refreshAdmin(); };
  ['admFrom','admTo'].forEach(id=>{
    document.getElementById(id).addEventListener('change', ()=>{
      currentFrom = document.getElementById('admFrom').value || null;
      currentTo = document.getElementById('admTo').value || null;
      setActiveAdminPreset(null);
      refreshAdmin();
    });
  });

  document.getElementById('admMsToggleBtn').onclick = (e) => {
    e.stopPropagation();
    const panel = document.getElementById('admMsPanel');
    panel.style.display = panel.style.display==='none' ? 'block' : 'none';
  };
  document.getElementById('admMsDoneBtn').onclick = () => { document.getElementById('admMsPanel').style.display='none'; };
  document.addEventListener('click', (e)=>{
    const dd = document.getElementById('admMsDropdown');
    if (dd && !dd.contains(e.target)) document.getElementById('admMsPanel').style.display = 'none';
  });
  document.getElementById('admSelectAll').addEventListener('change', (e)=>{
    document.querySelectorAll('.admSubCheck').forEach(cb=>{ cb.checked = e.target.checked; });
  });

  document.getElementById('admAddTestBtn').onclick = async () => {
    const names = ['محمد أحمد','سارة علي','خالد إبراهيم','منى سعيد','يوسف حسن'];
    const plansArr = [{id:'monthly',name:'الخطة الشهرية',amount:100},{id:'yearly',name:'الخطة السنوية',amount:1000},{id:'trial',name:'تجربة مجانية',amount:0}];
    const p = plansArr[Math.floor(Math.random()*plansArr.length)];
    const startDate = new Date().toISOString().split('T')[0];
    const record = {
      id: 'sub_' + Date.now() + '_' + Math.floor(Math.random()*10000),
      accountEmail: email, name: names[Math.floor(Math.random()*names.length)],
      phone: '010'+Math.floor(10000000+Math.random()*89999999),
      contactEmail: 'test'+Math.floor(Math.random()*1000)+'@example.com',
      planId: p.id, planName: p.name, amount: p.amount, currency:'جنيه مصري', market:'مصر',
      paymentMethod:'wallet', paymentRef:'TEST-'+Math.floor(Math.random()*99999),
      startDate, endDate: computeSubscriptionEndDate(startDate, p.id), createdAt: startDate,
    };
    await addSubscriberRecord(record);
    subscribers = await getAllSubscribers();
    refreshAdmin();
  };

  document.getElementById('admPrintBtn').onclick = () => {
    const selectedIds = Array.from(document.querySelectorAll('.admSubCheck:checked')).map(cb=>cb.value);
    const list = filteredList().filter(r => selectedIds.length===0 || selectedIds.includes(r.id));
    const total = computeTotals(list);
    const periodLabel = (currentFrom && currentTo) ? `${formatDateAr(currentFrom)} إلى ${formatDateAr(currentTo)}` : 'كل الفترة';
    const rowsHtml = list.map(r=>`<tr>
      <td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.phone)}</td><td>${escapeHtml(r.contactEmail)}</td><td>${escapeHtml(r.planName)}</td>
      <td>${formatDateAr(r.startDate)}</td><td>${formatDateAr(r.endDate)}</td>
      <td>${r.amount===0?'مجانًا':fmt2(r.amount)+' '+r.currency}</td>
    </tr>`).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>بيان المشتركين</title>
      <style>body{font-family:Tahoma,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin-top:14px;}
      th,td{border:1px solid #ccc;padding:7px;text-align:center;font-size:12px;} th{background:#14532d;color:#fff;}
      h1{color:#14532d;} .agg{margin-top:16px;font-size:14px;background:#f0f4f2;padding:10px;border-radius:8px;}</style></head>
      <body>
      ${reportLogoHeaderHtml()}
      <h1>GRIFFINE — بيان المشتركين</h1>
      <p>الفترة: ${periodLabel} | عدد المشتركين: ${list.length} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
      <table><thead><tr><th>الاسم</th><th>الهاتف</th><th>الإيميل</th><th>الخطة</th><th>بداية الخطة</th><th>تاريخ الانتهاء</th><th>قيمة السداد</th></tr></thead>
      <tbody>${rowsHtml}</tbody></table>
      <div class="agg"><strong>إجمالي السداد لكل العملاء:</strong> ${fmt2(total)}</div>
      <script>window.onload = () => window.print();<\/script>
      </body></html>`);
    w.document.close();
  };

  document.getElementById('admExportXlsBtn').onclick = () => {
    const selectedIds = Array.from(document.querySelectorAll('.admSubCheck:checked')).map(cb=>cb.value);
    const list = filteredList().filter(r => selectedIds.length===0 || selectedIds.includes(r.id));
    const total = computeTotals(list);
    const periodLabel = (currentFrom && currentTo) ? `${formatDateAr(currentFrom)} إلى ${formatDateAr(currentTo)}` : 'كل الفترة';

    const th = "background:#14532D;color:#ffffff;font-weight:bold;border:1px solid #000000;padding:6px 10px;text-align:center;";
    const td = "border:1px solid #999999;padding:5px 10px;text-align:center;";
    const totalTd = "border:1px solid #000000;padding:6px 10px;text-align:center;font-weight:bold;background:#E6F4EA;";
    const titleTd = "background:#14532D;color:#ffffff;font-weight:bold;font-size:16px;padding:10px;text-align:center;";

    const rowsHtml = list.map(r=>`<tr>
      <td style="${td}">${escapeHtml(r.name)}</td><td style="${td}">${escapeHtml(r.phone)}</td><td style="${td}">${escapeHtml(r.contactEmail)}</td>
      <td style="${td}">${escapeHtml(r.planName)}</td><td style="${td}">${formatDateAr(r.startDate)}</td><td style="${td}">${formatDateAr(r.endDate)}</td>
      <td style="${td}">${r.amount.toFixed(2)}</td>
    </tr>`).join('');

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>المشتركين</x:Name><x:WorksheetOptions><x:RTL/><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml></head><body dir="rtl">
      <table style="border-collapse:collapse;font-family:Tahoma,Arial;direction:rtl;" dir="rtl">
        <tr><td colspan="7" style="${titleTd}">GRIFFINE — بيان المشتركين</td></tr>
        <tr><td colspan="7" style="border:none;padding:6px;">الفترة: ${periodLabel} | عدد المشتركين: ${list.length}</td></tr>
        <tr><td colspan="7" style="border:none;"></td></tr>
        <tr>
          <td style="${th}">الاسم</td><td style="${th}">الهاتف</td><td style="${th}">الإيميل</td><td style="${th}">الخطة</td>
          <td style="${th}">بداية الخطة</td><td style="${th}">تاريخ الانتهاء</td><td style="${th}">قيمة السداد</td>
        </tr>
        ${rowsHtml}
        <tr><td colspan="6" style="${totalTd}">الإجمالي</td><td style="${totalTd}">${total.toFixed(2)}</td></tr>
      </table>
      </body></html>`;
    const blob = new Blob(['\ufeff'+html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `griffine_بيان_المشتركين.xls`;
    a.click(); URL.revokeObjectURL(url);
  };
}

/* ================== أرشيف العملاء المحذوفين ================== */
async function renderArchivedCustomers(){
  pushNav(() => renderArchivedCustomers());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('manage_subscribers')) return renderAdminHub();

  let archived = [];
  const res = await getArchivedCustomers();
  if (res && res.success) archived = res.archived;

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('archived_customers','🗄️ أرشيف العملاء المحذوفين')}</div>
      <button class="secondary small" id="backToAdminBtn">🛡️ رجوع للوحة التحكم</button>
    </div>
    <div class="info">العملاء هنا محذوفين من كل صفحات الموقع وتسجيلاته الحالية. تقدر تسترجعهم في أي وقت، أو تمسحهم نهائيًا بلا رجعة. لو أي حد منهم سجّل في الموقع تاني بنفس الإيميل، هيتعامل معاه كأنه أول مرة.</div>
    <div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="archivedSearch" placeholder="🔍 ابحث بالاسم أو الإيميل أو الهاتف..."></div>
    </div>
    <div class="section-card" id="archivedTableWrap"></div>
  </div>`;

  document.getElementById('backToAdminBtn').onclick=()=>goAdminHome();

  function renderArchivedTable(){
    const q = (document.getElementById('archivedSearch')?.value || '').trim().toLowerCase();
    const visible = q ? archived.filter(r => (r.name||'').toLowerCase().includes(q) || (r.accountEmail||'').toLowerCase().includes(q) || (r.phone||'').toLowerCase().includes(q)) : archived;
    document.getElementById('archivedTableWrap').innerHTML = archived.length===0 ? '<p style="color:#888;font-size:13px;">الأرشيف فاضي حاليًا.</p>'
      : (visible.length ? `<table>
      <thead><tr><th>الاسم</th><th>الإيميل</th><th>الهاتف</th><th>آخر باقة</th><th>بداية</th><th>نهاية</th><th></th></tr></thead>
      <tbody>
        ${visible.map(r=>`<tr>
          <td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.accountEmail)}</td><td>${escapeHtml(r.phone)}</td><td>${escapeHtml(r.planName)}</td>
          <td>${formatDateAr(r.startDate)}</td><td>${formatDateAr(r.endDate)}</td>
          <td>
            <button class="small btn-lightgreen" style="width:auto;" onclick="window.__restoreCustomer('${escapeHtml(r.accountEmail)}')">↩️ استرجاع</button>
            <button class="small danger" style="width:auto;" onclick="window.__purgeCustomer('${escapeHtml(r.accountEmail)}')">🗑️ حذف نهائي</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p class="std-filter-empty">مفيش نتائج مطابقة للبحث</p>');
  }
  renderArchivedTable();
  const archivedSearchEl = document.getElementById('archivedSearch');
  if (archivedSearchEl) archivedSearchEl.addEventListener('input', renderArchivedTable);

  window.__restoreCustomer = async (accountEmail) => {
    if(!await gConfirm(`استرجاع "${accountEmail}" من الأرشيف؟`)) return;
    const r = await restoreCustomer(accountEmail);
    if(r.success){
      archived = archived.filter(x=>x.accountEmail!==accountEmail);
      renderArchivedTable();
    } else {
      alert(r.message || 'حصل خطأ');
    }
  };

  window.__purgeCustomer = async (accountEmail) => {
    if(!await gConfirm(`⚠️ حذف "${accountEmail}" نهائيًا بلا رجعة، مع كل سجلاته. متأكد؟`)) return;
    const r = await purgeCustomer(accountEmail);
    if(r.success){
      archived = archived.filter(x=>x.accountEmail!==accountEmail);
      renderArchivedTable();
    } else {
      alert(r.message || 'حصل خطأ');
    }
  };
}

/* ================== القائمة السوداء ================== */
/* ================== صلاحيات وإعدادات إلزامية (تفعيل/إيقاف كل قاعدة إلزامية في الموقع) ================== */
/* ================== لوحة محادثات الشات (للمدير) ================== */
/* ================== إدارة الخطط والأسعار (صلاحيات الأدمن) ================== */
async function renderPlansManagementPage(){
  pushNav(() => renderPlansManagementPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('manage_plans')) return renderAdminHub();

  let plans = [];

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('plans_management','💳 إدارة الخطط والأسعار')}</div>
      <button class="secondary small" id="backToAdminFromPlansBtn">🛡️ رجوع للوحة التحكم</button>
    </div>
    <div class="info">أي تعديل هنا (سعر، إيقاف، حذف) بيأثر بس على الاشتراكات الجديدة من دلوقتي — مش بيغيّر حاجة في اشتراكات العملاء السارية حاليًا، لأن بياناتها بتتحفظ لوحدها وقت الاشتراك. تقدر تستخدم ده لعمل عروض وتخفيضات في أي وقت.</div>

    <h2>الخطط الحالية</h2>
    <div class="section-card" id="plansListWrap"></div>

    <h2 style="margin-top:20px;" id="formTitle">إضافة خطة جديدة</h2>
    <div class="section-card">
      <form id="planForm">
        <label>معرّف الخطة (حروف إنجليزية وأرقام بس، بدون مسافات - زي monthly)</label>
        <input type="text" id="planIdInput" required placeholder="مثال: quarterly">
        <label>اسم الخطة</label>
        <input type="text" id="planNameInput" required placeholder="مثال: الخطة ربع السنوية">
        <label>السعر</label>
        <input type="number" id="planAmountInput" step="0.01" min="0" required placeholder="0 للمجانية">
        <label>نص المدة المعروض للعميل (مثال: شهريًا / سنويًا / ٩٠ يوم)</label>
        <input type="text" id="planPeriodInput" required placeholder="مثال: كل 3 شهور">
        <label>عدد أيام الاشتراك الفعلي</label>
        <input type="number" id="planDurationInput" min="1" required placeholder="مثال: 90">
        <label>شارة اختيارية (تظهر فوق الكارت، زي "الأكثر توفيرًا")</label>
        <input type="text" id="planBadgeInput" placeholder="اختياري">
        <label>ملاحظة توفير اختيارية (تظهر تحت السعر)</label>
        <input type="text" id="planSaveNoteInput" placeholder="اختياري">
        <label>المميزات (سطر لكل ميزة)</label>
        <textarea id="planFeaturesInput" rows="4" placeholder="ميزة 1&#10;ميزة 2&#10;ميزة 3"></textarea>
        <label>ترتيب الظهور (رقم أصغر = يظهر الأول)</label>
        <input type="number" id="planSortInput" value="0">
        <button type="submit" id="planFormSubmitBtn">حفظ الخطة</button>
        <button type="button" class="secondary" id="planFormCancelBtn" style="display:none;">إلغاء التعديل</button>
      </form>
    </div>
  </div>`;

  document.getElementById('backToAdminFromPlansBtn').onclick=()=>goAdminHome();

  let editingId = null;
  function resetForm(){
    editingId = null;
    document.getElementById('formTitle').textContent = 'إضافة خطة جديدة';
    document.getElementById('planForm').reset();
    document.getElementById('planIdInput').disabled = false;
    document.getElementById('planFormSubmitBtn').textContent = 'حفظ الخطة';
    document.getElementById('planFormCancelBtn').style.display = 'none';
  }

  async function refreshPlansList(){
    const wrap = document.getElementById('plansListWrap');
    const res = await getPlansAdminList();
    plans = (res && res.success) ? res.plans : [];
    wrap.innerHTML = plans.length ? `<table>
      <thead><tr><th>الاسم</th><th>السعر</th><th>المدة</th><th>الحالة</th><th></th></tr></thead>
      <tbody>
        ${plans.map(p=>`<tr>
          <td>${escapeHtml(p.name)} ${p.badge?`<span class="tag" style="background:#e6f4ea;color:var(--green);">${escapeHtml(p.badge)}</span>`:''}</td>
          <td>${p.amount===0?'مجانًا':fmtMoney(p.amount)}</td>
          <td>${escapeHtml(p.periodLabel)} (${p.durationDays} يوم)</td>
          <td><span class="tag ${p.isActive?'tag-done':'tag-wait'}">${p.isActive?'مفعّلة':'موقوفة'}</span></td>
          <td style="white-space:nowrap;">
            <button class="small secondary" style="width:auto;" onclick="window.__editPlan('${p.id}')">تعديل</button>
            <button class="small ${p.isActive?'danger':'btn-lightgreen'}" style="width:auto;" onclick="window.__togglePlan('${p.id}')">${p.isActive?'إيقاف':'تفعيل'}</button>
            <button class="small danger" style="width:auto;" onclick="window.__deletePlan('${p.id}')">حذف</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p style="color:#888;font-size:13px;">مفيش خطط مضافة لسه.</p>';
  }
  await refreshPlansList();

  window.__editPlan = (id) => {
    const p = plans.find(x=>x.id===id);
    if (!p) return;
    editingId = id;
    document.getElementById('formTitle').textContent = 'تعديل خطة: ' + p.name;
    document.getElementById('planIdInput').value = p.id;
    document.getElementById('planIdInput').disabled = true; // مينفعش تغيّر المعرّف وقت التعديل
    document.getElementById('planNameInput').value = p.name;
    document.getElementById('planAmountInput').value = p.amount;
    document.getElementById('planPeriodInput').value = p.periodLabel;
    document.getElementById('planDurationInput').value = p.durationDays;
    document.getElementById('planBadgeInput').value = p.badge || '';
    document.getElementById('planSaveNoteInput').value = p.saveNote || '';
    document.getElementById('planFeaturesInput').value = (p.features||[]).join('\n');
    document.getElementById('planSortInput').value = p.sortOrder || 0;
    document.getElementById('planFormSubmitBtn').textContent = 'حفظ التعديلات';
    document.getElementById('planFormCancelBtn').style.display = 'inline-block';
    window.scrollTo({top: document.getElementById('formTitle').offsetTop, behavior:'smooth'});
  };

  window.__togglePlan = async (id) => {
    await togglePlanActive(id);
    refreshPlansList();
  };

  window.__deletePlan = async (id) => {
    if(!await gConfirm('حذف الخطة دي نهائيًا؟ العملاء الحاليين على الخطة دي مش هيتأثروا، لكن محدش هيقدر يشترك فيها تاني.')) return;
    await deletePlan(id);
    if (editingId===id) resetForm();
    refreshPlansList();
  };

  document.getElementById('planFormCancelBtn').onclick = resetForm;

  document.getElementById('planForm').onsubmit = async (e) => {
    e.preventDefault();
    const plan = {
      id: document.getElementById('planIdInput').value.trim(),
      name: document.getElementById('planNameInput').value.trim(),
      amount: parseFloat(document.getElementById('planAmountInput').value) || 0,
      periodLabel: document.getElementById('planPeriodInput').value.trim(),
      durationDays: parseInt(document.getElementById('planDurationInput').value) || 30,
      badge: document.getElementById('planBadgeInput').value.trim(),
      saveNote: document.getElementById('planSaveNoteInput').value.trim(),
      features: document.getElementById('planFeaturesInput').value.trim(),
      sortOrder: parseInt(document.getElementById('planSortInput').value) || 0,
    };
    const btn = document.getElementById('planFormSubmitBtn');
    btn.disabled = true;
    const r = await savePlan(plan);
    btn.disabled = false;
    if (r.success){
      resetForm();
      refreshPlansList();
    } else {
      alert(r.message || 'حصل خطأ في الحفظ');
    }
  };
}

async function renderChatAdminPage(){
  pushNav(() => renderChatAdminPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('view_chat')) return renderAdminHub();

  if (window.__chatAdminListPoll) clearInterval(window.__chatAdminListPoll);
  if (window.__chatAdminMsgPoll) clearInterval(window.__chatAdminMsgPoll);
  if (window.__chatAdminHeartbeat) clearInterval(window.__chatAdminHeartbeat);

  let conversations = [];
  let openVisitorId = null;
  let currentView = 'active'; // active | archived | trash

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('chat_admin','💬 الدردشة الفورية')} <span style="color:var(--green);font-size:11px;">🟢 إنت متصل الآن</span></div>
      <button class="secondary small" id="backToAdminFromChatBtn">🛡️ رجوع للوحة التحكم</button>
    </div>
    <div class="info">الشات هنا مباشر بينك وبين العميل. بيوصلك إيميل تنبيه على info@griffine.store أول ما عميل يبدأ محادثة جديدة (مش مع كل رسالة). لما تخلّص المحادثة دوس "📧 إنهاء وإرسال نسخة" وهتوصلك كاملة ومعاها الصور والملفات كمرفقات. فتح المحادثة بيعلّمها مقروءة تلقائيًا. العميل مايقدرش يبعت صور أو ملفات إلا لما تدوس "افتح للعميل رفع ملف/صورة"، وجنبه تكتب أقصى حجم للملف بالميجا (مثلًا 100 أو 500) - وبيتقفل تلقائيًا مع إنهاء المحادثة. التنبيهات نقطة حمرا + صوت على أيقونة الشات (من غير رسائل منبثقة). المحادثات بتتحدّث كل 3 ثواني.</div>
    <div class="radio-row std-filter-tabs" style="margin-bottom:10px;">
      <button class="small secondary period-preset std-filter-tab btn-active" id="tabActiveBtn">المحادثات النشطة</button>
      <button class="small secondary period-preset std-filter-tab" id="tabArchivedBtn">🗄️ الأرشيف</button>
      <button class="small secondary period-preset std-filter-tab" id="tabTrashBtn">🗑️ سلة المحذوفات</button>
      <button class="small secondary" id="chatMarkAllReadBtn" style="width:auto;margin-inline-start:auto;">✓ تعليم الكل كمقروء</button>
      ${hasPermission('manage_admin_settings') ? '<button class="small secondary" id="chatNotifySettingsBtn" style="width:auto;">🔔 إعدادات التنبيهات</button>' : ''}
    </div>
    <div class="section-card chat-notify-admin" id="chatNotifyAdminWrap" style="display:none;"></div>
    <div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="chatConvSearch" placeholder="🔍 ابحث بالإيميل أو آخر رسالة..."></div>
    </div>
    <div class="grid2" style="align-items:start;">
      <div class="section-card" id="conversationsListWrap" style="max-height:520px;overflow-y:auto;"></div>
      <div class="section-card" id="conversationDetailWrap"><p style="color:#888;font-size:13px;">اختر محادثة من القائمة.</p></div>
    </div>
  </div>`;
  document.getElementById('chatConvSearch').addEventListener('input', () => renderConvList());

  document.getElementById('backToAdminFromChatBtn').onclick=()=>{
    if (window.__chatAdminListPoll) { clearInterval(window.__chatAdminListPoll); window.__chatAdminListPoll = null; }
    if (window.__chatAdminMsgPoll) { clearInterval(window.__chatAdminMsgPoll); window.__chatAdminMsgPoll = null; }
    if (window.__chatAdminHeartbeat) { clearInterval(window.__chatAdminHeartbeat); window.__chatAdminHeartbeat = null; }
    goAdminHome();
  };

  function setTab(view){
    currentView = view;
    openVisitorId = null;
    document.getElementById('conversationDetailWrap').innerHTML = '<p style="color:#888;font-size:13px;">اختر محادثة من القائمة.</p>';
    document.querySelectorAll('.period-preset').forEach(b=>b.classList.remove('btn-active'));
    document.getElementById({active:'tabActiveBtn', archived:'tabArchivedBtn', trash:'tabTrashBtn'}[view]).classList.add('btn-active');
    refreshList();
  }
  document.getElementById('tabActiveBtn').onclick = () => setTab('active');
  document.getElementById('tabArchivedBtn').onclick = () => setTab('archived');
  document.getElementById('tabTrashBtn').onclick = () => setTab('trash');
  const notifyBtn = document.getElementById('chatNotifySettingsBtn');
  if (notifyBtn) notifyBtn.onclick = () => {
    const w = document.getElementById('chatNotifyAdminWrap');
    if (w.style.display === 'none') { w.style.display = ''; renderChatNotifyAdmin(w); } else w.style.display = 'none';
  };
  document.getElementById('chatMarkAllReadBtn').onclick = async () => {
    await markAllChatRead();
    await refreshList();
    refreshChatUnreadIndicators();
  };

  // "أنا متصل الآن" - بيتحدث كل 30 ثانية طول ما الصفحة دي مفتوحة عشان العملاء يشوفوا إنك موجود
  await sendChatAdminHeartbeat();
  window.__chatAdminHeartbeat = setInterval(sendChatAdminHeartbeat, 30000);

  function renderConvList(){
    const wrap = document.getElementById('conversationsListWrap');
    if (!wrap) return;
    const q = (document.getElementById('chatConvSearch')?.value || '').trim().toLowerCase();
    const visible = q ? conversations.filter(c => (c.email||'').toLowerCase().includes(q) || (c.lastMessage||'').toLowerCase().includes(q)) : conversations;
    if (!conversations.length) {
      wrap.innerHTML = `<p style="color:#888;font-size:13px;">${currentView==='trash'?'سلة المحذوفات فاضية.':currentView==='archived'?'الأرشيف فاضي.':'لا يوجد محادثات نشطة.'}</p>`;
    } else if (!visible.length) {
      wrap.innerHTML = '<p class="std-filter-empty">مفيش محادثات مطابقة للبحث</p>';
    } else {
      wrap.innerHTML = visible.map(c=>`
      <div class="plan-list-item ${c.visitorId===openVisitorId?'selected':''} ${c.unread?'chat-unread':''}" data-vid="${escapeHtml(c.visitorId)}" style="cursor:pointer;">
        <div><strong>${c.unread ? '<span class="chat-unread-dot" title="غير مقروءة"></span>' : ''}${escapeHtml(c.email || 'زائر بدون إيميل')}</strong> ${chatKindBadge(c)}${c.allowUpload ? ' <span title="رفع الملفات مفتوح للعميل">📎</span>' : ''}<div style="font-size:11px;color:#888;">${escapeHtml((c.lastMessage||'').substring(0,40))}${(c.lastMessage||'').length>40?'...':''}</div></div>
        <div style="font-size:10px;color:#aaa;">${formatChatTime(c.lastAt)}</div>
      </div>`).join('');
    }
    document.querySelectorAll('#conversationsListWrap .plan-list-item').forEach(el=>{
      el.onclick = () => renderConversationDetail(el.dataset.vid, conversations.find(c=>c.visitorId===el.dataset.vid));
    });
  }
  async function refreshList(){
    const wrap = document.getElementById('conversationsListWrap');
    if (!wrap) return; // الصفحة اتغيّرت
    const res = await getChatConversations(currentView);
    conversations = (res && res.success) ? res.conversations : [];
    renderConvList();
  }
  await refreshList();
  window.__chatAdminListPoll = setInterval(refreshList, 4000);

  async function renderConversationDetail(visitorId, convInfo){
    openVisitorId = visitorId;
    if (window.__chatAdminMsgPoll) clearInterval(window.__chatAdminMsgPoll);
    // فتح المحادثة = اتقرت (على السيرفر) ← العلامة الحمرا والرقم بيختفوا فورًا
    if (window.__adminChatSeen && convInfo) window.__adminChatSeen(convInfo.lastAt);
    if (currentView === 'active') {
      markChatRead(visitorId).then(() => {
        const c = conversations.find(x => x.visitorId === visitorId); if (c) c.unread = false;
        renderConvList(); refreshChatUnreadIndicators();
      });
    }
    const detail = document.getElementById('conversationDetailWrap');

    let actionsHtml = '';
    if (currentView === 'active') {
      actionsHtml = `
        <button class="small secondary" id="chatEndConvBtn" style="width:auto;">📧 إنهاء وإرسال نسخة</button>
        <button class="small secondary" id="chatArchiveBtn" style="width:auto;">🗄️ أرشفة</button>
        <button class="small danger" id="chatDeleteBtn" style="width:auto;">🗑️ حذف</button>`;
    } else if (currentView === 'archived') {
      actionsHtml = `
        <button class="small btn-lightgreen" id="chatUnarchiveBtn" style="width:auto;">↩️ رجوع للنشطة</button>
        <button class="small danger" id="chatDeleteBtn" style="width:auto;">🗑️ حذف</button>`;
    } else {
      actionsHtml = `
        <button class="small btn-lightgreen" id="chatRestoreBtn" style="width:auto;">↩️ استرجاع</button>
        <button class="small danger" id="chatPurgeBtn" style="width:auto;">🗑️ حذف نهائي</button>`;
    }

    // الإصدار 83: حالة الرفع + أقصى حجم بالميجا (بيتكتب جنب زرار الفتح)
    const upState = { on: !!(convInfo && convInfo.allowUpload), mb: +(convInfo && convInfo.maxUploadMb) || CHAT_DEFAULT_UPLOAD_MB,
      onChange: (st) => { const c = conversations.find(x => x.visitorId === visitorId); if (c) { c.allowUpload = st.on; c.maxUploadMb = st.mb; } renderConvList(); } };
    detail.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
        <div style="font-size:13px;font-weight:bold;">${escapeHtml((convInfo&&convInfo.email) || 'زائر بدون إيميل')} ${convInfo ? chatKindBadge(convInfo) : ''}</div>
        <div>${actionsHtml}</div>
      </div>
      ${currentView === 'active' ? `<div style="margin-bottom:8px;">${chatUploadBtnHtml('chatUploadToggle', upState.on, upState.mb)}</div>` : ''}
      <div id="chatAdminMsgs" class="chat-body" style="max-height:360px;overflow-y:auto;border-radius:8px;padding:10px;"></div>
      ${currentView === 'active' ? `
      <div class="chat-attach-chip" id="chatAdminAttachChip" style="display:none;"></div>
      <div style="display:flex;gap:6px;margin-top:10px;align-items:center;">
        <label class="chat-attach-label" for="chatAdminFile" title="إرسال صورة / PDF / فيديو / ملف للعميل">📎</label>
        <input type="file" id="chatAdminFile" accept="${CHAT_FILE_ACCEPT}" style="display:none;">
        <input type="text" id="chatAdminReplyInput" placeholder="اكتب الرد..." style="flex:1;margin:0;">
        <button id="chatAdminReplyBtn" style="width:auto;margin:0;">إرسال</button>
      </div>` : ''}`;
    wireChatUploadBtn('chatUploadToggle', visitorId, upState);
    const adminAttach = wireAdminAttach('chatAdminFile', 'chatAdminAttachChip');

    const endBtn = document.getElementById('chatEndConvBtn');
    if (endBtn) endBtn.onclick = async () => {
      if(!await gConfirm('هيتبعت نسخة كاملة من المحادثة دي على info@griffine.store. متأكد؟')) return;
      const r = await endChatConversation(visitorId);
      alert(r.message || (r.success ? 'تم إرسال نسخة المحادثة بالإيميل.' : 'حصل خطأ'));
      // الإصدار 82: إنهاء المحادثة بيقفل رفع الملفات عند العميل تلقائيًا
      syncChatUploadCtl('chatUploadToggle', visitorId, upState, { success: true, allowUpload: false });
      refreshList();
    };
    const archiveBtn = document.getElementById('chatArchiveBtn');
    if (archiveBtn) archiveBtn.onclick = async () => {
      await archiveChatConversation(visitorId);
      openVisitorId = null;
      detail.innerHTML = '<p style="color:#888;font-size:13px;">اختر محادثة من القائمة.</p>';
      refreshList();
    };
    const unarchiveBtn = document.getElementById('chatUnarchiveBtn');
    if (unarchiveBtn) unarchiveBtn.onclick = async () => {
      await unarchiveChatConversation(visitorId);
      openVisitorId = null;
      detail.innerHTML = '<p style="color:#888;font-size:13px;">اختر محادثة من القائمة.</p>';
      refreshList();
    };
    const deleteBtn = document.getElementById('chatDeleteBtn');
    if (deleteBtn) deleteBtn.onclick = async () => {
      if(!await gConfirm('هينقل المحادثة دي لسلة المحذوفات. تقدر تسترجعها بعدين. متأكد؟')) return;
      await deleteChatConversation(visitorId);
      openVisitorId = null;
      detail.innerHTML = '<p style="color:#888;font-size:13px;">اختر محادثة من القائمة.</p>';
      refreshList();
    };
    const restoreBtn = document.getElementById('chatRestoreBtn');
    if (restoreBtn) restoreBtn.onclick = async () => {
      await restoreChatConversation(visitorId);
      openVisitorId = null;
      detail.innerHTML = '<p style="color:#888;font-size:13px;">اختر محادثة من القائمة.</p>';
      refreshList();
    };
    const purgeBtn = document.getElementById('chatPurgeBtn');
    if (purgeBtn) purgeBtn.onclick = async () => {
      if(!await gConfirm('⚠️ حذف نهائي بلا رجعة لكل رسائل المحادثة دي. متأكد؟')) return;
      await purgeChatConversation(visitorId);
      openVisitorId = null;
      detail.innerHTML = '<p style="color:#888;font-size:13px;">اختر محادثة من القائمة.</p>';
      refreshList();
    };

    let lastCount = -1;
    async function refreshMsgs(){
      const msgsWrap = document.getElementById('chatAdminMsgs');
      if (!msgsWrap) return; // اتقفلت أو اتغيّرت المحادثة
      const res2 = await getChatHistory(visitorId);
      const msgs = (res2 && res2.success) ? res2.messages : [];
      // حالة رفع الملفات ممكن تتغيّر من جهاز تاني / إنهاء المحادثة
      syncChatUploadCtl('chatUploadToggle', visitorId, upState, res2);
      if (msgs.length === lastCount) return;
      // رسايل جديدة وصلت والمحادثة مفتوحة قدام الأدمن ← تتعلم مقروءة تلقائيًا
      // الإصدار 80: بس لو المحادثة قدام الأدمن فعلًا (الصفحة ظاهرة ومركّز عليها) - مش مفتوحة في تبويب منسي
      if (lastCount !== -1 && msgs.length > lastCount && currentView === 'active' && !document.hidden && document.hasFocus()) markChatRead(visitorId).then(refreshChatUnreadIndicators);
      lastCount = msgs.length;
      const wasNearBottom = (msgsWrap.scrollHeight - msgsWrap.scrollTop - msgsWrap.clientHeight) < 40;
      msgsWrap.innerHTML = msgs.length ? msgs.map(m => chatMsgHtml(m)).join('') : '<p style="font-size:12px;color:#888;">لا يوجد رسائل.</p>';
      if (wasNearBottom) msgsWrap.scrollTop = msgsWrap.scrollHeight;
    }
    await refreshMsgs();
    if (currentView === 'active') window.__chatAdminMsgPoll = setInterval(refreshMsgs, 3000);

    const replyBtn = document.getElementById('chatAdminReplyBtn');
    const sendReply = async () => {
      const text = document.getElementById('chatAdminReplyInput').value.trim();
      const att = adminAttach ? adminAttach.get() : { file: null };
      if (!text && !att.file) return;
      replyBtn.disabled = true;
      let r;
      try { r = await sendChatAdminReplyWithFile(visitorId, text, adminAttach); } catch(e){ r = { success:false, message:'حصل خطأ في الاتصال بالسيرفر، جرّب تاني.' }; }
      replyBtn.disabled = false;
      if (r && r.success){
        document.getElementById('chatAdminReplyInput').value = '';
        if (adminAttach) adminAttach.clear();
        lastCount = -1;
        refreshMsgs();
      } else {
        alert((r && r.message) || 'حصل خطأ');
      }
    };
    if (replyBtn) {
      replyBtn.onclick = sendReply;
      document.getElementById('chatAdminReplyInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendReply(); });
    }
  }
}

/* =====================================================================
   الإصدار 83: إعدادات تنبيهات الشات (للأدمن - صلاحية manage_admin_settings)
   - صورة أيقونة الشات لكل الموقع (بدل شعار GRIFFINE)
   - صوت التنبيه الافتراضي
   - السماح للمشتركين/الزوار يغيّروا الصورة أو الصوت أو يكتموه من ⚙️ في الشات
   ===================================================================== */
async function renderChatNotifyAdmin(wrap){
  const cfg = await loadChatNotifyCfg();
  wrap.innerHTML = `
    <div class="section-title">🔔 تنبيهات الشات</div>
    <p style="font-size:12px;color:#888;line-height:1.8;margin:4px 0 10px;">التنبيه بقى زي ماسنجر: نقطة حمرا على أيقونة الشات + صوت، من غير أي رسائل منبثقة (Push) على الشاشة.</p>
    <div class="chat-notify-grid">
      <div>
        <strong style="font-size:13px;">صورة أيقونة الشات</strong>
        <div style="display:flex;align-items:center;gap:10px;margin:8px 0;">
          <img src="${escapeHtml(cfg.icon || griffineLogoSrc())}" alt="أيقونة الشات" class="chat-notify-preview">
          <div style="display:flex;flex-direction:column;gap:6px;">
            <label class="small secondary chat-icon-upload">📷 رفع صورة جديدة<input type="file" id="cnIconFile" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none;"></label>
            ${cfg.icon ? '<button type="button" class="small secondary" id="cnIconClear" style="width:auto;">↩️ رجوع لشعار GRIFFINE</button>' : ''}
          </div>
        </div>
      </div>
      <div>
        <strong style="font-size:13px;">صوت التنبيه الافتراضي</strong>
        <div style="display:flex;gap:6px;align-items:center;margin:8px 0;">
          <select id="cnSound" style="margin:0;">${Object.entries(CHAT_SOUNDS).map(([k, l]) => `<option value="${k}" ${cfg.sound === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <button type="button" class="small secondary" id="cnSoundTest" style="width:auto;margin:0;">▶️</button>
        </div>
      </div>
    </div>
    <label class="chat-notify-check"><input type="checkbox" id="cnUserIcon" ${cfg.userIcon ? 'checked' : ''}> المشترك/الزائر يقدر يغيّر صورة أيقونة الشات عنده</label>
    <label class="chat-notify-check"><input type="checkbox" id="cnUserSound" ${cfg.userSound ? 'checked' : ''}> المشترك/الزائر يقدر يغيّر صوت التنبيه أو يكتمه (بدون صوت)</label>
    <div id="cnMsg" style="font-size:12px;margin-top:6px;"></div>`;
  const msg = (t, ok) => { const m = document.getElementById('cnMsg'); if (m) { m.textContent = t; m.style.color = ok ? 'var(--green)' : '#c0392b'; } };
  async function save(data){
    const r = await apiPost('/chat_notify_save.php', data).catch(() => null);
    if (!r || !r.success) { msg((r && r.message) || 'تعذّر الحفظ', false); return false; }
    window.__chatNotifyCfg = r.settings; applyChatBubbleIcon();
    return true;
  }
  document.getElementById('cnSound').onchange = async (e) => { if (await save({ sound: e.target.value })) { msg('✓ اتحفظ الصوت', true); playChatSound(e.target.value); } };
  document.getElementById('cnSoundTest').onclick = () => { chatAudioCtx(); setTimeout(() => playChatSound(document.getElementById('cnSound').value), 60); };
  document.getElementById('cnUserIcon').onchange = async (e) => { if (await save({ userIcon: e.target.checked ? 1 : 0 })) msg('✓ اتحفظ', true); };
  document.getElementById('cnUserSound').onchange = async (e) => { if (await save({ userSound: e.target.checked ? 1 : 0 })) msg('✓ اتحفظ', true); };
  const clr = document.getElementById('cnIconClear');
  if (clr) clr.onclick = async () => { if (await save({ clearIcon: 1 })) renderChatNotifyAdmin(wrap); };
  document.getElementById('cnIconFile').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) { alert('الصورة كبيرة - أقصى حجم 2 ميجا.'); e.target.value = ''; return; }
    const rd = new FileReader();
    rd.onload = async () => { msg('جاري الرفع...', true); if (await save({ icon: rd.result })) renderChatNotifyAdmin(wrap); };
    rd.readAsDataURL(f);
  };
}

/* =====================================================================
   الإصدار 84: لوحة التحكم ← "الدخول والأمان" + "طرق الدفع ورقم الخدمة"
   ===================================================================== */
async function siteCfgAdminApi(data){
  try { return data ? await apiPost('/site_config_admin.php', data) : await apiGet('/site_config_admin.php'); }
  catch(e){ return { success:false, message:'تعذّر الاتصال بالسيرفر' }; }
}
function cfgToggle(id, on, label, desc){
  return `<div class="setting-row">
    <div><div class="setting-label">${label}</div>${desc ? `<div class="setting-desc">${desc}</div>` : ''}</div>
    <label class="toggle-switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span class="toggle-slider"></span></label></div>`;
}
async function renderSiteConfigAdmin(){
  const secWrap = document.getElementById('securityCfgWrap'), payWrap = document.getElementById('paymentCfgWrap');
  if (!secWrap || !payWrap) return;
  const res = await siteCfgAdminApi();
  if (!res || !res.success) { secWrap.innerHTML = payWrap.innerHTML = `<p class="error">${escapeHtml((res && res.message) || 'تعذّر التحميل')}</p>`; return; }
  const c = res.config;
  const secretHint = (set) => set ? '<span style="color:var(--green);font-size:11.5px;">✓ متسجّل (اكتب قيمة جديدة لو عايز تغيّره، أو - لمسحه)</span>' : '<span style="color:#c0392b;font-size:11.5px;">مش متسجّل</span>';

  // ---------- الدخول والأمان
  secWrap.innerHTML = `
    <div style="padding:6px 0 12px;border-bottom:1px solid var(--border-soft);">
      <strong style="font-size:13.5px;">🛡️ رابط دخول الإدارة السري</strong>
      <div style="font-size:11.5px;color:#888;line-height:1.8;margin:3px 0 8px;">لما يتفعّل، حسابات الأدمن والموظفين مش هتقدر تدخل من صفحة الدخول العادية خالص - الدخول من الرابط ده بس (بيفتح بوابة الدخول 30 دقيقة). احفظ الرابط عندك في مكان آمن ومتبعتوش لحد غير فريقك.</div>
      ${c.admin_gate_url ? `<div class="gate-url" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;"><code id="gateUrl" dir="ltr" style="background:rgba(0,0,0,.05);padding:6px 10px;border-radius:8px;word-break:break-all;font-size:12px;">${escapeHtml(c.admin_gate_url)}</code>
        <button type="button" class="small secondary" id="gateCopy" style="width:auto;">📋 نسخ</button></div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;"><button type="button" class="small secondary" id="gateNew" style="width:auto;">🔄 رابط جديد (القديم يبطل)</button><button type="button" class="small danger" id="gateOff" style="width:auto;">إيقاف الرابط السري</button></div>`
      : `<button type="button" class="small" id="gateNew" style="width:auto;">تفعيل رابط دخول الإدارة السري</button>`}
    </div>
    ${cfgToggle('cfgAdminOtp', c.admin_otp === '1', 'كود تحقق (OTP) لحسابات الإدارة والموظفين', 'بعد كلمة المرور بيتبعت كود من 6 أرقام. ⚠️ اتأكد الأول إن الإيميل شغال من مركز الإيميلات قبل ما تفعّله' + (c.smtp_ready ? '' : ' — <b style="color:#c0392b">كلمة سر SMTP مش متسجّلة في griffine_config.php</b>'))}
    ${cfgToggle('cfgOtpLogin', c.otp_login === '1', 'كود تحقق (OTP) للعملاء عند تسجيل الدخول', 'حسب رغبتك: شغّله لأمان أعلى أو اقفله لدخول أسرع.')}
    <div style="padding:10px 0;border-bottom:1px solid var(--border-soft);">
      <strong style="font-size:13.5px;">طريقة إرسال الكود</strong>
      <select id="cfgOtpChannel" style="margin-top:6px;"><option value="email" ${c.otp_channel !== 'sms' ? 'selected' : ''}>📧 الإيميل (مجاني - شغال على طول)</option><option value="sms" ${c.otp_channel === 'sms' ? 'selected' : ''}>📱 رسالة SMS على رقم العميل (ولو فشلت بيتبعت بالإيميل)</option></select>
    </div>
    <div style="padding:10px 0;">
      <strong style="font-size:13.5px;">مزود رسائل SMS</strong>
      <div style="font-size:11.5px;color:#888;line-height:1.8;margin:3px 0 6px;">الرسائل بتتبعت عن طريق مزود رسائل (زي SMS Misr / Victory Link / Twilio) باسم مرسل متسجّل عنده - مش من رقم موبايل شخصي. الصق رابط الـ API بتاعه وحط <code>{phone}</code> مكان الرقم و <code>{message}</code> مكان الرسالة. رقم الخدمة بيتكتب جوه نص الرسالة للتواصل.</div>
      <input type="text" id="cfgSmsUrl" dir="ltr" placeholder="https://provider.com/api/send?user=XX&pass=YY&sender=GRIFFINE&to={phone}&msg={message}">
      <div>${secretHint(c.sms_url_set)}</div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap;">
        <select id="cfgSmsMethod" style="width:auto;margin:0;"><option ${c.sms_method !== 'POST' ? 'selected' : ''}>GET</option><option ${c.sms_method === 'POST' ? 'selected' : ''}>POST</option></select>
        <input type="tel" id="cfgSmsTestPhone" placeholder="رقم للتجربة 01xxxxxxxxx" dir="ltr" style="width:190px;margin:0;">
        <button type="button" class="small secondary" id="cfgSmsTest" style="width:auto;margin:0;">📨 رسالة تجريبية</button>
      </div>
    </div>
    <button type="button" id="cfgSecSave" style="width:auto;margin-top:10px;">حفظ إعدادات الدخول والأمان</button>
    <div id="cfgSecMsg" style="font-size:12.5px;margin-top:6px;"></div>`;

  // ---------- الدفع ورقم الخدمة
  payWrap.innerHTML = `
    <label>📱 رقم الخدمة (استقبال تحويلات فودافون كاش + رقم التواصل)</label>
    <input type="tel" id="cfgServicePhone" dir="ltr" value="${escapeHtml(c.service_phone || '')}">
    <label>🏦 عنوان/رقم إنستاباي (فاضي = نفس رقم الخدمة)</label>
    <input type="text" id="cfgInstapay" dir="ltr" value="${escapeHtml(c.instapay_address || '')}" placeholder="مثال: griffine@instapay">
    ${cfgToggle('cfgPayVodafone', c.pay_vodafone === '1', 'فودافون كاش + صورة التحويل', 'العميل بيحوّل على رقم الخدمة ويرفع صورة التحويل، وإنت بتفعّل بعد المراجعة.')}
    ${cfgToggle('cfgPayInstapay', c.pay_instapay === '1', 'إنستاباي + صورة التحويل', '')}
    ${cfgToggle('cfgPayPaymob', c.pay_paymob === '1', 'فيزا / ماستركارد / ميزة عن طريق Paymob', 'الاشتراك بيتفعّل تلقائي أول ما Paymob يأكد الدفع. ' + (c.paymob_ready ? '<b style="color:var(--green)">✓ البيانات كاملة</b>' : '<b style="color:#c0392b">البيانات ناقصة - مش هيظهر للعملاء</b>'))}
    <div style="padding:10px 0;">
      <strong style="font-size:13.5px;">بيانات Paymob</strong>
      <div style="font-size:11.5px;color:#888;line-height:1.8;margin:3px 0 6px;">من لوحة Paymob: Settings ← Account Info (API Key و HMAC)، Developers ← Payment Integrations (Integration ID للكروت)، Developers ← iframes (Iframe ID). وفي نفس صفحة الـ Integration اكتب الرابط ده في الخانتين Transaction processed callback و Transaction response callback:</div>
      <code dir="ltr" style="display:block;background:rgba(0,0,0,.05);padding:6px 10px;border-radius:8px;font-size:12px;margin-bottom:8px;">${escapeHtml(c.paymob_callback_url)}</code>
      <label>API Key</label><input type="password" id="cfgPmKey" dir="ltr" autocomplete="off"><div>${secretHint(c.paymob_api_key_set)}</div>
      <label>HMAC Secret</label><input type="password" id="cfgPmHmac" dir="ltr" autocomplete="off"><div>${secretHint(c.paymob_hmac_set)}</div>
      <div class="grid2"><div><label>Integration ID (الكروت)</label><input type="text" id="cfgPmInt" dir="ltr" inputmode="numeric" value="${escapeHtml(c.paymob_integration || '')}"></div>
      <div><label>Iframe ID</label><input type="text" id="cfgPmIframe" dir="ltr" inputmode="numeric" value="${escapeHtml(c.paymob_iframe || '')}"></div></div>
    </div>
    <button type="button" id="cfgPaySave" style="width:auto;margin-top:6px;">حفظ طرق الدفع ورقم الخدمة</button>
    <div id="cfgPayMsg" style="font-size:12.5px;margin-top:6px;"></div>`;

  const msg = (id, t, ok) => { const m = document.getElementById(id); if (m) { m.textContent = t; m.style.color = ok ? 'var(--green)' : '#c0392b'; } };
  const chk = (id) => document.getElementById(id).checked ? '1' : '0';
  const val = (id) => document.getElementById(id).value.trim();
  const gateNew = document.getElementById('gateNew');
  if (gateNew) gateNew.onclick = async () => {
    if (c.admin_gate_url && !await gConfirm('الرابط القديم هيبطل فورًا. متأكد؟')) return;
    const r = await siteCfgAdminApi({ action: 'gate_new' });
    if (r && r.success) { renderSiteConfigAdmin(); alert('✅ الرابط السري اتفعّل. انسخه واحفظه عندك - من دلوقتي دخول الإدارة منه بس.'); } else alert((r && r.message) || 'تعذّر');
  };
  const gateOff = document.getElementById('gateOff');
  if (gateOff) gateOff.onclick = async () => { if (!await gConfirm('إيقاف الرابط السري؟ حسابات الإدارة هتدخل من صفحة الدخول العادية.')) return; const r = await siteCfgAdminApi({ action: 'gate_off' }); if (r && r.success) renderSiteConfigAdmin(); };
  const gateCopy = document.getElementById('gateCopy');
  if (gateCopy) gateCopy.onclick = () => { try { navigator.clipboard.writeText(c.admin_gate_url); gateCopy.textContent = '✓ اتنسخ'; } catch(e){} };
  document.getElementById('cfgSmsTest').onclick = async () => {
    const r = await siteCfgAdminApi({ action: 'sms_test', phone: val('cfgSmsTestPhone') });
    msg('cfgSecMsg', (r && r.message) || 'تعذّر', r && r.success);
  };
  document.getElementById('cfgSecSave').onclick = async () => {
    const data = { action: 'save', admin_otp: chk('cfgAdminOtp'), otp_login: chk('cfgOtpLogin'), otp_channel: val('cfgOtpChannel'), sms_method: val('cfgSmsMethod') };
    if (val('cfgSmsUrl')) data.sms_url = val('cfgSmsUrl');
    if (data.admin_otp === '1' && c.admin_otp !== '1' && !await gConfirm('بعد التفعيل، دخول الإدارة هيحتاج كود بيوصل على الإيميل. اتأكدت إن الإيميل شغال؟')) return;
    const r = await siteCfgAdminApi(data);
    if (r && r.success) { msg('cfgSecMsg', '✓ اتحفظ', true); Object.assign(c, r.config); } else msg('cfgSecMsg', (r && r.message) || 'تعذّر الحفظ', false);
  };
  document.getElementById('cfgPaySave').onclick = async () => {
    const data = { action: 'save', service_phone: val('cfgServicePhone'), instapay_address: val('cfgInstapay'),
      pay_vodafone: chk('cfgPayVodafone'), pay_instapay: chk('cfgPayInstapay'), pay_paymob: chk('cfgPayPaymob'),
      paymob_integration: val('cfgPmInt'), paymob_iframe: val('cfgPmIframe') };
    if (val('cfgPmKey')) data.paymob_api_key = val('cfgPmKey');
    if (val('cfgPmHmac')) data.paymob_hmac = val('cfgPmHmac');
    const r = await siteCfgAdminApi(data);
    if (r && r.success) { getSiteConfig(true); renderSiteConfigAdmin().then(() => msg('cfgPayMsg', r.warning ? '⚠️ ' + r.warning : '✓ اتحفظ', !r.warning)); }
    else msg('cfgPayMsg', (r && r.message) || 'تعذّر الحفظ', false);
  };
}

async function renderAdminSettingsPage(){
  pushNav(() => renderAdminSettingsPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('manage_admin_settings')) return renderAdminHub();

  const settings = await getAdminSettings();

  const items = [
    { key:'require_email_verification', label:'تفعيل البريد الإلكتروني إلزامي', desc:'العميل لازم يضغط رابط التفعيل اللي بيوصله بالإيميل قبل ما يقدر يستخدم الموقع.' },
    { key:'require_valid_email_domain', label:'التحقق من صحة دومين الإيميل عند التسجيل', desc:'يرفض التسجيل بإيميل دومينه غير موجود فعليًا (حماية من الإيميلات الوهمية).' },
    { key:'require_payment_ref', label:'رقم عملية التحويل إلزامي', desc:'عند السداد بمحفظة أو تحويل بنكي، العميل لازم يكتب رقم/مرجع العملية.' },
    { key:'require_payment_proof', label:'إرفاق صورة إثبات التحويل إلزامي', desc:'عند السداد بمحفظة أو تحويل بنكي، العميل لازم يرفع صورة إثبات التحويل.' },
    { key:'require_card_details', label:'بيانات البطاقة إلزامية عند اختيار الدفع بالفيزا', desc:'اسم حامل البطاقة ورقمها وتاريخ انتهائها يبقوا مطلوبين إجباريًا.' },
    { key:'require_manual_activation', label:'مراجعة السداد يدويًا قبل تفعيل أي اشتراك مدفوع', desc:'أي اشتراك بمبلغ (غير التجربة المجانية) يفضل موقوف لحد ما تفعّله بنفسك من لوحة التحكم. لو أوقفت الخاصية دي، الاشتراكات المدفوعة هتتفعّل فورًا من غير مراجعة.' },
    { key:'chat_enabled', label:'تشغيل الدردشة الفورية المدمجة', desc:'لو أوقفته، محدش هيقدر يبعت أو يستقبل رسائل شات خالص، حتى لو الأيقونة ظاهرة.' },
    { key:'chat_icon_visible', label:'إظهار أيقونة الدردشة الفورية العائمة', desc:'تقدر تخفي الأيقونة من على كل صفحات الموقع من غير ما توقف الشات نفسه بالكامل.' },
  ];

  const visibilityItems = [
    { key:'hide_dac_screen', label:'إخفاء زرار خطط تعزيز المتوسط (DCA)', desc:'يشيل الزرار من الشاشة الرئيسية للعميل من غير ما يمسح أي بيانات أو خطط موجودة.' },
    { key:'hide_grid_screen', label:'إخفاء زرار خطط الشبكة (Grid)', desc:'' },
    { key:'hide_portfolio_screen', label:'إخفاء زرار ملخص المحفظة', desc:'' },
    { key:'hide_screener_screen', label:'إخفاء زرار كشاف الأسهم', desc:'' },
    { key:'hide_sub_history_screen', label:'إخفاء زرار سجل الاشتراك', desc:'' },
    { key:'hide_recommendations_screen', label:'إخفاء زرار التوصيات', desc:'' },
    { key:'hide_referral_screen', label:'إخفاء زرار ادعُ صديق (برنامج الإحالة)', desc:'' },
    { key:'hide_contact_screen', label:'إخفاء زرار بيانات التواصل', desc:'' },
    { key:'hide_testimonials_screen', label:'إخفاء زرار آراء العملاء', desc:'' },
    { key:'hide_articles_screen', label:'إخفاء زرار المقالات', desc:'' },
    { key:'hide_suggestions_screen', label:'إخفاء زرار شاركنا مقترحاتك', desc:'' },
  ];

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('admin_settings','⚙️ الصلاحيات والإعدادات الإلزامية')}</div>
      <button class="secondary small" id="backToAdminFromSettingsBtn">🛡️ رجوع للوحة التحكم</button>
    </div>
    <div class="info">كل الأوامر والقواعد الإلزامية اللي الموقع بيفرضها على المستخدمين موجودة هنا. الافتراضي إن كل حاجة مفعّلة (زي الوضع الحالي). لو حابب توقف أي قاعدة، دوس على المفتاح جنبها.</div>
    <div class="section-card" id="settingsListWrap"></div>

    <h2 style="margin-top:20px;">🔐 الدخول والأمان</h2>
    <div class="info">رابط سري لدخول الإدارة والموظفين، وكود تحقق (OTP) بالإيميل أو برسالة SMS للإدارة و/أو العملاء. تفعيل الحساب الجديد بالإيميل موجود فوق ("تفعيل البريد الإلكتروني إلزامي").</div>
    <div class="section-card" id="securityCfgWrap">جارٍ التحميل...</div>

    <h2 style="margin-top:20px;">💳 طرق الدفع ورقم الخدمة</h2>
    <div class="info">رقم الخدمة هو رقم استقبال تحويلات فودافون كاش، وبيظهر في صفحة الدفع وبيانات التواصل ورسائل كود الدخول. شغّل أو اقفل أي طريقة دفع، واكتب بيانات Paymob عشان الدفع بالكارت يتفعّل تلقائي.</div>
    <div class="section-card" id="paymentCfgWrap">جارٍ التحميل...</div>

    <h2 style="margin-top:20px;">إخفاء شاشات عن العميل</h2>
    <div class="info">فعّل أي مفتاح هنا عشان تخفي الزرار المقابل من الشاشة الرئيسية للعميل، من غير ما تمسح أي بيانات أو خطط موجودة بالفعل. الافتراضي إن كل الزراير ظاهرة.</div>
    <div class="section-card" id="visibilityListWrap"></div>

    <h2 style="margin-top:20px;">إعدادات محرك إشارات كشاف الأسهم</h2>
    <div class="info">العتبات والأوزان اللي بتحدد إمتى الإشارة تبقى "شراء" أو "بيع" في أداة التحليل الفني. تقدر تعدّلها حسب استراتيجيتك.</div>
    <div class="section-card" id="screenerSettingsWrap"></div>

    ${window.__isSuperAdmin ? `
    <h2 style="margin-top:20px;">نسخة احتياطية يدوية</h2>
    <div class="info">هوستنجر بتعمل نسخ احتياطي تلقائي أساسي للموقع كامل. الزرار ده بس نسخة تكميلية سريعة من بيانات الجداول الأساسية (من غير صور إثبات الدفع الكبيرة) تقدر تحمّلها فورًا وقت ما حبيت.</div>
    <div class="section-card">
      <a href="/admin_backup_export.php" target="_blank"><button type="button" style="width:auto;">⬇️ تحميل نسخة احتياطية الآن</button></a>
    </div>` : ''}
  </div>`;

  document.getElementById('backToAdminFromSettingsBtn').onclick=()=>goAdminHome();
  renderSiteConfigAdmin();   // الإصدار 84

  const screenerRes = await getScreenerSettings();
  const screenerSettings = (screenerRes && screenerRes.success) ? screenerRes.settings : {};
  const screenerFields = [
    { key:'rsi_period', label:'فترة RSI' },
    { key:'rsi_oversold', label:'حد التشبّع البيعي لـRSI (إشارة إيجابية تحته)' },
    { key:'rsi_overbought', label:'حد التشبّع الشرائي لـRSI (إشارة سلبية فوقه)' },
    { key:'ma_period', label:'فترة المتوسط المتحرك' },
    { key:'macd_fast', label:'MACD - الفترة السريعة' },
    { key:'macd_slow', label:'MACD - الفترة البطيئة' },
    { key:'macd_signal', label:'MACD - فترة خط الإشارة' },
    { key:'weight_rsi', label:'وزن RSI في الإشارة النهائية' },
    { key:'weight_macd', label:'وزن MACD في الإشارة النهائية' },
    { key:'weight_ma', label:'وزن المتوسط المتحرك في الإشارة النهائية' },
  ];
  document.getElementById('screenerSettingsWrap').innerHTML = screenerFields.map(f => `
    <div class="grid2" style="align-items:center;margin-bottom:8px;">
      <label style="margin:0;">${escapeHtml(f.label)}</label>
      <input type="number" step="any" class="screenerSettingInput" data-key="${f.key}" value="${screenerSettings[f.key] ?? ''}">
    </div>`).join('') + `<button id="saveScreenerSettingsBtn" style="margin-top:8px;">حفظ إعدادات المحرك</button><div id="screenerSettingsResult"></div>`;

  document.getElementById('saveScreenerSettingsBtn').onclick = async () => {
    const inputs = document.querySelectorAll('.screenerSettingInput');
    const results = await Promise.all(Array.from(inputs).map(inp => saveScreenerSetting(inp.dataset.key, inp.value)));
    document.getElementById('screenerSettingsResult').innerHTML = results.every(r=>r.success)
      ? '<div class="info" style="margin-top:8px;">✅ اتحفظ.</div>'
      : `<div class="error" style="margin-top:8px;">${results.find(r=>!r.success)?.message || 'حصل خطأ في بعض القيم'}</div>`;
  };


  function renderList(){
    document.getElementById('settingsListWrap').innerHTML = items.map(it => `
      <div class="setting-row">
        <div>
          <div class="setting-label">${escapeHtml(it.label)}</div>
          <div class="setting-desc">${it.desc}</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" class="settingToggle" data-key="${it.key}" ${settings[it.key]!==false?'checked':''}>
          <span class="toggle-slider"></span>
        </label>
      </div>`).join('');

    document.querySelectorAll('.settingToggle').forEach(cb=>{
      cb.addEventListener('change', async (e)=>{
        const key = e.target.dataset.key;
        const value = e.target.checked;
        e.target.disabled = true;
        const r = await saveAdminSetting(key, value);
        e.target.disabled = false;
        if (r.success) {
          settings[key] = value;
        } else {
          e.target.checked = !value; // ارجع الوضع القديم لو فشل الحفظ
          alert(r.message || 'حصل خطأ في الحفظ');
        }
      });
    });
  }
  function renderVisibilityList(){
    document.getElementById('visibilityListWrap').innerHTML = visibilityItems.map(it => `
      <div class="setting-row">
        <div>
          <div class="setting-label">${escapeHtml(it.label)}</div>
          <div class="setting-desc">${it.desc}</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" class="visibilityToggle" data-key="${it.key}" ${settings[it.key]===true?'checked':''}>
          <span class="toggle-slider"></span>
        </label>
      </div>`).join('');

    document.querySelectorAll('.visibilityToggle').forEach(cb=>{
      cb.addEventListener('change', async (e)=>{
        const key = e.target.dataset.key;
        const value = e.target.checked;
        e.target.disabled = true;
        const r = await saveAdminSetting(key, value);
        e.target.disabled = false;
        if (r.success) {
          settings[key] = value;
        } else {
          e.target.checked = !value;
          alert(r.message || 'حصل خطأ في الحفظ');
        }
      });
    });
  }
  renderList();
  renderVisibilityList();
}

async function renderBlacklist(){
  pushNav(() => renderBlacklist());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('manage_blacklist')) return renderAdminHub();

  let items = [];
  const res = await getBlacklist();
  if (res && res.success) items = res.items;

  const typeLabel = { email:'إيميل', phone:'رقم هاتف', name:'اسم عميل' };

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('blacklist','🚫 القائمة السوداء')}</div>
      <button class="secondary small" id="backToAdminFromBlacklistBtn">🛡️ رجوع للوحة التحكم</button>
    </div>
    <div class="info">أي إيميل أو رقم هاتف أو اسم عميل تضيفه هنا مايقدرش يسجل حساب جديد في الموقع خالص. ولو كان مسجّل بالفعل وحاول يكمّل اشتراك (يختار باقة)، هيتمنع من التقدم برضه — يفضل واقف في شاشة اختيار الباقات.</div>

    <h2>إضافة للقائمة السوداء</h2>
    <div class="section-card">
      <form id="blacklistForm">
        <label>النوع</label>
        <select id="blType">
          <option value="email">إيميل</option>
          <option value="phone">رقم هاتف</option>
          <option value="name">اسم عميل</option>
        </select>
        <label>القيمة</label>
        <input type="text" id="blValue" required placeholder="مثال: test@example.com أو 01012345678 أو اسم العميل">
        <label>السبب (اختياري)</label>
        <input type="text" id="blReason" placeholder="ملاحظة داخلية ليك بس">
        <button type="submit">إضافة للقائمة السوداء</button>
      </form>
    </div>

    <h2 style="margin-top:20px;">القائمة الحالية</h2>
    <div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="blacklistSearch" placeholder="🔍 ابحث بالقيمة أو السبب..."></div>
    </div>
    <div class="section-card" id="blacklistTableWrap"></div>
  </div>`;

  document.getElementById('backToAdminFromBlacklistBtn').onclick=()=>goAdminHome();

  function renderBlacklistTable(){
    const q = (document.getElementById('blacklistSearch')?.value || '').trim().toLowerCase();
    const visible = q ? items.filter(it => (it.value||'').toLowerCase().includes(q) || (it.reason||'').toLowerCase().includes(q)) : items;
    document.getElementById('blacklistTableWrap').innerHTML = items.length===0 ? '<p style="color:#888;font-size:13px;">القائمة السوداء فاضية حاليًا.</p>'
      : (visible.length ? `<table>
      <thead><tr><th>النوع</th><th>القيمة</th><th>السبب</th><th>تاريخ الإضافة</th><th></th></tr></thead>
      <tbody>
        ${visible.map(it=>`<tr>
          <td>${typeLabel[it.type]||it.type}</td><td>${escapeHtml(it.value)}</td><td>${it.reason||'-'}</td>
          <td>${formatDateAr(it.createdAt ? it.createdAt.split(' ')[0] : '')}</td>
          <td><button class="small danger" style="width:auto;" onclick="window.__removeFromBlacklist('${it.id}')">حذف</button></td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p class="std-filter-empty">مفيش نتائج مطابقة للبحث</p>');
  }
  renderBlacklistTable();
  const blSearchEl = document.getElementById('blacklistSearch');
  if (blSearchEl) blSearchEl.addEventListener('input', renderBlacklistTable);

  document.getElementById('blacklistForm').onsubmit = async (e) => {
    e.preventDefault();
    const type = document.getElementById('blType').value;
    const value = document.getElementById('blValue').value.trim();
    const reason = document.getElementById('blReason').value.trim();
    if(!value) return;
    const r = await addToBlacklist(type, value, reason);
    if (r.success){
      items.unshift({ id:String(r.id), type, value, reason, createdAt: new Date().toISOString().split('T')[0] });
      renderBlacklistTable();
      document.getElementById('blValue').value = '';
      document.getElementById('blReason').value = '';
    } else {
      alert(r.message || 'حصل خطأ');
    }
  };

  window.__removeFromBlacklist = async (id) => {
    if(!await gConfirm('متأكد إنك عايز تشيل العنصر ده من القائمة السوداء؟')) return;
    const r = await removeFromBlacklist(id);
    if (r.success){
      items = items.filter(x=>x.id!==id);
      renderBlacklistTable();
    } else {
      alert(r.message || 'حصل خطأ');
    }
  };
}

/* ================== الفريق والصلاحيات ================== */
async function renderStaffManagementPage(){
  pushNav(() => renderStaffManagementPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('manage_staff')) return renderAdminHub();

  const res = await getStaffList();
  if (!res || !res.success) {
    app.innerHTML = `<div class="container">${logoHeader()}<div class="error">تعذّر تحميل بيانات الفريق.</div></div>`;
    return;
  }
  let staff = res.staff;
  const permissionKeys = res.permissionKeys; // { key: label }
  const jobTitles = res.jobTitles; // { key: label }
  const defaultsByJobTitle = res.defaultsByJobTitle;

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('staff_management','👥 الفريق والصلاحيات')}</div>
      <button class="secondary small" id="backToAdminFromStaffBtn">🛡️ رجوع للوحة التحكم</button>
    </div>
    <div class="info">
      كل عضو فريق تضيفه هنا لازم يكون عنده حساب عادي على الموقع بالفعل (يسجّل بإيميله الأول). بعد ما تضيفه بمسماه الوظيفي، بتتحدد له صلاحيات افتراضية حسب المسمى، وتقدر تزود أو تنقص من أي صلاحية بنفسك في أي وقت من الجدول تحت.
    </div>

    <h2>إضافة عضو فريق</h2>
    <div class="section-card">
      <form id="staffAddForm">
        <label>الإيميل (لازم يكون مسجّل حساب بيه بالفعل)</label>
        <input type="email" id="staffEmail" required placeholder="example@email.com">
        <label>المسمى الوظيفي</label>
        <select id="staffJobTitle">
          ${Object.keys(jobTitles).map(k=>`<option value="${k}">${jobTitles[k]}</option>`).join('')}
        </select>
        <button type="submit">إضافة</button>
      </form>
      <div id="staffAddResult"></div>
    </div>

    <h2 style="margin-top:20px;">أعضاء الفريق الحاليين</h2>
    <div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="staffSearch" placeholder="🔍 ابحث بالإيميل أو المسمى الوظيفي..."></div>
    </div>
    <div class="section-card" id="staffTableWrap"></div>
  </div>`;

  document.getElementById('backToAdminFromStaffBtn').onclick=()=>goAdminHome();

  function permCheckboxesHtml(staffId, currentPerms){
    return Object.keys(permissionKeys).map(key=>{
      const checked = currentPerms.includes(key) ? 'checked' : '';
      return `<label style="display:inline-flex;align-items:center;gap:6px;margin:4px 12px 4px 0;font-weight:normal;">
        <input type="checkbox" class="staff-perm-cb" data-staff="${staffId}" value="${key}" ${checked}> ${permissionKeys[key]}
      </label>`;
    }).join('');
  }

  function renderStaffTable(){
    const q = (document.getElementById('staffSearch')?.value || '').trim().toLowerCase();
    const visible = q ? staff.filter(s => (s.email||'').toLowerCase().includes(q) || (jobTitles[s.jobTitle]||s.jobTitle||'').toLowerCase().includes(q)) : staff;
    document.getElementById('staffTableWrap').innerHTML = staff.length===0 ? '<p style="color:#888;font-size:13px;">لسه معندكش أي عضو فريق مضاف.</p>'
      : (visible.length ? visible.map(s=>`
      <div class="section-card" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center;">
          <div><strong>${escapeHtml(s.email)}</strong> — ${jobTitles[s.jobTitle] || s.jobTitle} ${s.active ? '' : '<span class="tag tag-wait">موقوف</span>'}</div>
          <button class="small danger" style="width:auto;" onclick="window.__removeStaff('${s.id}')">إزالة من الفريق</button>
        </div>
        <div style="margin-top:10px;">${permCheckboxesHtml(s.id, s.permissions)}</div>
        <button class="small secondary" style="width:auto;margin-top:8px;" onclick="window.__saveStaffPerms('${s.id}')">حفظ الصلاحيات</button>
      </div>
    `).join('') : '<p class="std-filter-empty">مفيش نتائج مطابقة للبحث</p>');
  }
  renderStaffTable();
  const staffSearchEl = document.getElementById('staffSearch');
  if (staffSearchEl) staffSearchEl.addEventListener('input', renderStaffTable);

  document.getElementById('staffAddForm').onsubmit = async (e) => {
    e.preventDefault();
    const staffEmail = document.getElementById('staffEmail').value.trim().toLowerCase();
    const jobTitle = document.getElementById('staffJobTitle').value;
    const r = await addStaffMember(staffEmail, jobTitle);
    const resultEl = document.getElementById('staffAddResult');
    if (r.success) {
      resultEl.innerHTML = '';
      const fresh = await getStaffList();
      if (fresh.success) { staff = fresh.staff; renderStaffTable(); }
      document.getElementById('staffEmail').value = '';
    } else {
      resultEl.innerHTML = `<div class="error" style="margin-top:8px;">${r.message || 'حصل خطأ'}</div>`;
    }
  };

  window.__saveStaffPerms = async (staffId) => {
    const boxes = document.querySelectorAll(`.staff-perm-cb[data-staff="${staffId}"]`);
    const selected = Array.from(boxes).filter(b=>b.checked).map(b=>b.value);
    const r = await updateStaffPermissions(staffId, selected);
    if (r.success) { alert('تم حفظ الصلاحيات.'); } else { alert(r.message || 'حصل خطأ'); }
  };

  window.__removeStaff = async (staffId) => {
    if(!await gConfirm('متأكد إنك عايز تشيل الشخص ده من الفريق؟ حسابه العادي كعميل هيفضل موجود، بس هيفقد صلاحيات لوحة التحكم.')) return;
    const r = await removeStaffMember(staffId);
    if (r.success) {
      const fresh = await getStaffList();
      if (fresh.success) { staff = fresh.staff; renderStaffTable(); }
    } else {
      alert(r.message || 'حصل خطأ');
    }
  };
}

/* ================== تنسيق الموقع (محتوى محدود، بدون بيانات جوهرية) ================== */
/* ================== قائمة كل الشاشات القابلة لتخصيص خلفيتها + المعاينة السريعة ================== */
const BG_SCREENS = [
  {v:'login', l:'🔐 شاشة تسجيل الدخول', fn:'renderLogin'},
  {v:'splash', l:'👋 شاشة الترحيب (الصفحة الأولى)', fn:'renderPublicHome'},
  {v:'public_pricing', l:'الباقات والأسعار', fn:'renderPublicPricing'},
  {v:'testimonials', l:'⭐ آراء العملاء', fn:'renderTestimonialsPage'},
  {v:'articles_list', l:'📰 مقالات', fn:'renderArticlesListPage'},
  {v:'article_detail', l:'📰 مقال', fn:'renderArticleDetailPage'},
  {v:'privacy_page', l:'سياسة الخصوصية', fn:'renderPrivacyPolicyPage'},
  {v:'home', l:'ابدأ من هنا', fn:'renderHome'},
  {v:'my_subscription_history', l:'📄 سجل اشتراكي', fn:'renderMySubscriptionHistory'},
  {v:'disclaimer_page', l:'⚠️ إخلاء المسؤولية (Disclaimer)', fn:'renderDisclaimerPage'},
  {v:'disclaimer_gate', l:'⚠️ إخلاء المسؤولية', fn:''},
  {v:'about_page', l:'عن GRIFFINE', fn:'renderAboutPage'},
  {v:'refund_policy_page', l:'سياسة استرداد الاشتراك', fn:'renderRefundPolicyPage'},
  {v:'suggestions_page', l:'💡 شاركنا مقترحاتك', fn:'renderSuggestionsPage'},
  {v:'contact_info', l:'بيانات التواصل', fn:'renderContactInfo'},
  {v:'admin_hub', l:'🛡️ لوحة التحكم', fn:'renderAdminHub'},
  {v:'admin_subscribers', l:'🛡️ لوحة تحكم المدير — المشتركون', fn:'renderAdminSubscribers'},
  {v:'archived_customers', l:'🗄️ أرشيف العملاء المحذوفين', fn:'renderArchivedCustomers'},
  {v:'plans_management', l:'💳 إدارة الخطط والأسعار', fn:'renderPlansManagementPage'},
  {v:'chat_admin', l:'💬 الدردشة الفورية', fn:'renderChatAdminPage'},
  {v:'admin_settings', l:'⚙️ الصلاحيات والإعدادات الإلزامية', fn:'renderAdminSettingsPage'},
  {v:'blacklist', l:'🚫 القائمة السوداء', fn:'renderBlacklist'},
  {v:'staff_management', l:'👥 الفريق والصلاحيات', fn:'renderStaffManagementPage'},
  {v:'site_design', l:'🎨 تنسيق الموقع', fn:'renderSiteDesignPage'},
  {v:'admin_reports', l:'📊 التقارير والإحصائيات', fn:'renderAdminReportsPage'},
  {v:'recommendations_admin', l:'📢 توصيات الشراء', fn:'renderRecommendationsAdminPage'},
  {v:'recommendations_customer', l:'📢 التوصيات', fn:'renderRecommendationsCustomerPage'},
  {v:'content_admin', l:'📰 آراء العملاء والمقالات', fn:'renderContentAdminPage'},
  {v:'site_texts_admin', l:'📝 تعديل نصوص شاشات الموقع', fn:'renderSiteTextsAdminPage'},
  {v:'suggestions_admin', l:'💡 مقترحات العملاء لتطوير الموقع', fn:'renderSuggestionsAdminPage'},
  {v:'plans_list', l:'خططك الحالية (سهم لكل خطة)', fn:'renderPlansList'},
  {v:'portfolio', l:'📊 ملخص المحفظة', fn:'renderPortfolio'},
  {v:'diversification_report', l:'🎯 تقرير تنويع المحفظة', fn:'renderDiversificationReport'},
  {v:'referral', l:'🎁 ادعُ صديق', fn:'renderReferralPage'},
  {v:'profile', l:'👤 الملف الشخصي', fn:'renderProfilePage'},
  {v:'grid_plans_list', l:'🔲 خطط الشبكة (Grid)', fn:'renderGridPlansList'},
  {v:'grid_plan_new', l:'+ خطة شبكة جديدة', fn:'renderGridPlanForm'},
  {v:'plan_type_chooser', l:'اختر نوع الخطة', fn:'renderPlanTypeChooser'},
  {v:'screener', l:'كشاف الأسهم — تحليل فني لسهم واحد', fn:'renderScreener'},
  {v:'register', l:'📝 إنشاء حساب جديد', fn:'renderRegister'},
  {v:'login_email', l:'✉️ تسجيل الدخول بالبريد وكلمة المرور', fn:'renderLoginEmail'},
  {v:'forgot_password', l:'🔑 نسيت كلمة المرور', fn:'renderForgotPassword'},
  {v:'reset_password', l:'🔑 إعادة تعيين كلمة المرور', fn:'renderResetPassword'},
  {v:'verify_email_prompt', l:'📧 طلب تأكيد البريد الإلكتروني', fn:'renderVerifyEmailPrompt'},
  {v:'verify_email_result', l:'📧 نتيجة تأكيد البريد الإلكتروني', fn:'renderVerifyEmailResult'},
  {v:'pending_activation', l:'⏳ بانتظار تفعيل الاشتراك', fn:'renderPendingActivation'},
  {v:'access_expired', l:'⛔ انتهاء صلاحية الاشتراك', fn:'renderAccessExpired'},
  {v:'public_plans_info', l:'ℹ️ تعريف الباقات للزوار', fn:'renderPublicPlansInfo'},
  {v:'subscription_plans', l:'💳 اختيار الباقة والاشتراك', fn:'renderSubscriptionPlans'},
  {v:'plan_change_checkout', l:'🔄 تأكيد تغيير الباقة', fn:'renderPlanChangeCheckout'},
  {v:'checkout_form', l:'💳 إتمام الاشتراك (نموذج الدفع)', fn:'renderCheckoutForm'},
  {v:'new_plan_form', l:'➕ خطة تعزيز متوسط جديدة (نموذج)', fn:'renderNewPlanForm'},
  {v:'plan_detail', l:'📈 تفاصيل خطة تعزيز المتوسط', fn:'renderPlanDetail'},
  {v:'edit_plan_settings', l:'⚙️ تعديل إعدادات خطة تعزيز المتوسط', fn:'renderEditPlanSettings'},
  {v:'grid_plan_detail', l:'🔲 تفاصيل خطة الشبكة', fn:'renderGridPlanDetail'},
  {v:'grid_edit_plan_settings', l:'⚙️ تعديل إعدادات خطة الشبكة', fn:'renderGridEditPlanSettings'}
];

// بيانات تجريبية للشاشات اللي بتحتاج بيانات عشان تتعرض (عشان المعاينة تشتغل على أي شاشة)
async function previewArgsFor(key){
  const email = await getSession();
  const today = new Date().toISOString().slice(0,10);
  const sampleSub = { planName:'باقة تجريبية', amount:100, currency:'EGP', startDate:today, endDate:today };
  switch (key) {
    case 'verify_email_prompt': return { args:[email || 'name@example.com'] };
    case 'pending_activation':
    case 'access_expired': return { args:[sampleSub] };
    case 'plan_change_checkout': return { args:[{ planName:'الباقة الجديدة', amount:200, currency:'EGP' }, sampleSub] };
    case 'checkout_form': return { args:[{ planName:'باقة تجريبية', amount:100, currency:'EGP', planId:0 }] };
    case 'reset_password':
    case 'verify_email_result': return { args:['preview-token'] };
    case 'plan_detail':
    case 'edit_plan_settings': {
      const plans = email ? await getPlans(email) : null;
      const sym = plans && Object.keys(plans)[0];
      return sym ? { args:[sym] } : { error:'مفيش خطط تعزيز متوسط عندك لمعاينة هذه الشاشة — أنشئ خطة أولاً وارجع.' };
    }
    case 'grid_plan_detail':
    case 'grid_edit_plan_settings': {
      const grids = email ? await getGridPlans(email) : null;
      const sym = grids && Object.keys(grids)[0];
      return sym ? { args:[sym] } : { error:'مفيش خطط شبكة عندك لمعاينة هذه الشاشة — أنشئ خطة أولاً وارجع.' };
    }
    default: return { args:[] };
  }
}

// بيفتح الشاشة الحقيقية للمعاينة: withPending=true بالصورة الجديدة اللي لسه ما اتحفظتش، false بشكلها الحالي زي ما هو
async function launchScreenPreview(key, withPending){
  const screen = BG_SCREENS.find(s => s.v === key);
  const resEl = document.getElementById('bgSaveResult');
  const fail = (msg) => { if (resEl) resEl.innerHTML = `<div class="error" style="margin-top:8px;">${msg}</div>`; };
  if (!screen || !screen.fn || typeof window[screen.fn] !== 'function') return fail('معاينة مباشرة غير متاحة لهذه الشاشة.');
  const pa = await previewArgsFor(key);
  if (pa.error) return fail(pa.error);
  window.__pageBackgroundsPreview = window.__pageBackgroundsPreview || {};
  const usePending = !!(withPending && window.__bgPendingImage);
  if (usePending) window.__pageBackgroundsPreview[key] = window.__bgPendingImage; else delete window.__pageBackgroundsPreview[key];
  window.__bgPreviewReturn = { key, label: screen.l, fn: screen.fn, args: pa.args, hasPending: usePending };
  window[screen.fn](...pa.args);
  showBgPreviewBar();
}

// زر عائم صغير للأدمن على أي شاشة معروفة: بيفتح "تنسيق الموقع" على نفس الشاشة عشان يعاين ويرفع خلفيتها
function updateBgShortcut(){
  // الزر العائم اتلغى بناءً على طلب صاحب الموقع - تعديل الخلفيات متاح من لوحة التحكم ← تنسيق الموقع
  const old = document.getElementById('bgShortcutBtn'); if (old) old.remove();
  return;
  let btn = document.getElementById('bgShortcutBtn');
  const key = window.__lastPageKey;
  const ok = window.__isAdmin && hasPermission('edit_site_design') && key && key !== 'site_design'
    && BG_SCREENS.some(s => s.v === key) && !document.getElementById('bgPreviewBar');
  if (!ok) { if (btn) btn.remove(); return; }
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'bgShortcutBtn'; btn.type = 'button'; btn.title = 'معاينة وتعديل خلفية هذه الشاشة'; btn.textContent = '🖼️';
    btn.onclick = () => { window.__bgDesignPreselect = window.__lastPageKey; renderSiteDesignPage(); };
    document.body.appendChild(btn);
  }
}

async function renderSiteDesignPage(){
  pushNav(() => renderSiteDesignPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('edit_site_design')) return renderAdminHub();

  const res = await getSiteContent();
  const content = (res && res.success) ? res.content : {};
  let customButtons = [];
  try { customButtons = JSON.parse(content.custom_buttons || '[]'); } catch(e) { customButtons = []; }

  const fontOptions = [
    {v:'', l:'افتراضي الموقع'}, {v:'Cairo', l:'Cairo'}, {v:'Tajawal', l:'Tajawal'},
    {v:'Almarai', l:'Almarai'}, {v:'Tahoma', l:'Tahoma'}, {v:'Arial', l:'Arial'}, {v:'Georgia', l:'Georgia'},
  ];
  const buttonTypeLabel = { whatsapp:'واتساب', phone:'اتصال هاتفي', email:'إيميل', url:'رابط' };

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('site_design','🎨 تنسيق الموقع')}</div>
      <button class="secondary small" id="backToAdminFromDesignBtn">🛡️ رجوع للوحة التحكم</button>
    </div>
    <div class="info">التعديلات هنا شكلية بحتة ومش بتأثر على بيانات العملاء أو الاشتراكات أو الأسعار. سيبك أي حقل فاضي يخلّي الشكل الافتراضي الحالي زي ما هو.</div>

    <h2>الألوان والخط العام</h2>
    <div class="section-card">
      <div class="grid2">
        <div><label>لون الخلفية</label><input type="color" id="bgColor" value="${content.bg_color || '#ffffff'}"><button type="button" class="small secondary" style="width:auto;margin-top:4px;" id="clearBgColor">استخدام الافتراضي</button></div>
        <div><label>لون النص</label><input type="color" id="textColor" value="${content.text_color || '#222222'}"><button type="button" class="small secondary" style="width:auto;margin-top:4px;" id="clearTextColor">استخدام الافتراضي</button></div>
      </div>
      <div class="grid2" style="margin-top:10px;">
        <div><label>لون الأزرار والروابط الأساسي</label><input type="color" id="accentColor" value="${content.accent_color || '#1b8a5a'}"><button type="button" class="small secondary" style="width:auto;margin-top:4px;" id="clearAccentColor">استخدام الافتراضي</button></div>
        <div><label>نوع الخط</label><select id="fontFamily">${fontOptions.map(f=>`<option value="${f.v}" ${content.font_family===f.v?'selected':''}>${f.l}</option>`).join('')}</select></div>
      </div>
      <label style="margin-top:10px;">حجم الخط الأساسي (12-22)</label>
      <input type="number" id="fontSize" min="12" max="22" value="${content.font_size_base || 16}" style="max-width:120px;">
      <div class="grid2" style="margin-top:10px;">
        <div><label>سماكة الخط</label><select id="fontWeight">
          <option value="" ${content.font_weight===''||!content.font_weight?'selected':''}>افتراضي</option>
          <option value="400" ${content.font_weight==='400'?'selected':''}>عادي (400)</option>
          <option value="500" ${content.font_weight==='500'?'selected':''}>متوسط (500)</option>
          <option value="600" ${content.font_weight==='600'?'selected':''}>شبه غامق (600)</option>
          <option value="700" ${content.font_weight==='700'?'selected':''}>غامق (700)</option>
        </select></div>
        <div></div>
      </div>
      <div style="margin-top:14px;">
        <label>ثيمات جاهزة (اضغط عشان تملأ الحقول فوق، وبعدين احفظ)</label>
        <div id="themePresetsRow" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;"></div>
      </div>
      <button id="saveThemeBtn" style="margin-top:12px;">حفظ الألوان والخط</button>
      <div id="themeSaveResult"></div>
    </div>

    <h2 style="margin-top:20px;">بانر الصفحة الرئيسية (يظهر فوق شاشة تسجيل الدخول)</h2>
    <div class="section-card">
      <label>نوع البانر</label>
      <select id="heroType">
        <option value="none" ${content.hero_banner_type==='none'?'selected':''}>بدون بانر</option>
        <option value="image" ${content.hero_banner_type==='image'?'selected':''}>صورة</option>
        <option value="video" ${content.hero_banner_type==='video'?'selected':''}>فيديو (رابط MP4 مباشر)</option>
      </select>
      <label>رابط الصورة أو الفيديو</label>
      <input type="text" id="heroUrl" value="${content.hero_banner_url || ''}" placeholder="https://...">
      <label>العنوان الرئيسي</label>
      <input type="text" id="heroTitle" maxlength="120" value="${content.hero_title || ''}" placeholder="مثال: تابع أسهمك بذكاء مع GRIFFINE">
      <label>العنوان الفرعي</label>
      <input type="text" id="heroSubtitle" maxlength="200" value="${content.hero_subtitle || ''}" placeholder="مثال: خطط تعزيز متوسط، كشاف فرص، وتنبيهات لحظية">
      <button id="saveHeroBtn" style="margin-top:12px;">حفظ البانر</button>
      <div id="heroSaveResult"></div>
    </div>

    <h2 style="margin-top:20px;">أزرار إجراء مخصصة (تظهر تحت البانر)</h2>
    <div class="section-card">
      <div id="customButtonsWrap"></div>
      <h3 style="margin-top:14px;">إضافة زرار جديد</h3>
      <label>نص الزرار</label>
      <input type="text" id="newBtnLabel" maxlength="40" placeholder="مثال: تواصل معنا واتساب">
      <label>نوع الإجراء</label>
      <select id="newBtnType">
        <option value="whatsapp">واتساب (رقم بدون + أو مسافات)</option>
        <option value="phone">اتصال هاتفي (رقم)</option>
        <option value="email">إيميل</option>
        <option value="url">رابط خارجي</option>
      </select>
      <label>القيمة</label>
      <input type="text" id="newBtnValue" placeholder="مثال: 201095125325 أو https://...">
      <button id="addBtnBtn" style="margin-top:10px;">إضافة الزرار</button>
      <div id="btnSaveResult"></div>
    </div>

    <h2 style="margin-top:20px;">شريط إعلان أعلى الموقع</h2>
    <div class="section-card">
      <label style="display:flex;align-items:center;gap:8px;font-weight:normal;">
        <input type="checkbox" id="annEnabled" ${content.announcement_enabled === '1' ? 'checked' : ''}> تفعيل شريط الإعلان
      </label>
      <label style="margin-top:10px;">نص الإعلان (حد أقصى 300 حرف)</label>
      <textarea id="annText" rows="2" maxlength="300" placeholder="مثال: عرض خاص على الباقة السنوية لمدة أسبوع!">${content.announcement_text || ''}</textarea>
      <button id="saveAnnBtn" style="margin-top:10px;">حفظ</button>
      <div id="annSaveResult"></div>
    </div>
    <h2 style="margin-top:20px;">🖼️ خلفية شاشة محددة (اختياري)</h2>
    <div class="section-card">
      <div class="info">اختَر أي شاشة من الموقع وارفع لها صورة خلفية خاصة، هتظهر ممزوجة خلف محتوى الشاشة (زي خلفية شاشتي الترحيب والدخول بالظبط). التنسيق ده مستقل تمامًا عن الألوان والخط فوق — رفع صورة لشاشة معينة ما يغيّرش شكل باقي الشاشات، وتغيير الألوان ما يأثرش على أي صورة مرفوعة. الأنسب للشاشات الرئيسية والتعريفية أكتر من شاشات الجداول الكبيرة (زي المشتركين أو التقارير) عشان تفضل سهلة القراءة.</div>
      <label style="margin-top:10px;">اختر الشاشة</label>
      <select id="bgScreenSelect"></select>
      <div id="bgPreviewWrap" style="margin-top:12px;"></div>
      <input type="file" accept="image/*" id="bgUploadInput" style="display:none;">
      <div id="bgActionsRow" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
        <button id="bgPreviewCurrentBtn" type="button" class="secondary" style="width:auto;">👁️ عاين الشاشة الحالية</button>
        <button id="bgUploadBtn" class="secondary" style="width:auto;">📤 رفع صورة لهذه الشاشة</button>
        <button id="bgRemoveBtn" class="danger" style="width:auto;display:none;">إزالة الخلفية الحالية</button>
      </div>
      <div id="bgConfirmRow" style="display:none;flex-wrap:wrap;gap:8px;margin-top:10px;">
        <button id="bgPreviewRealBtn" type="button" class="secondary" style="width:auto;">👁️ عاين الشاشة الحقيقية</button>
        <button id="bgConfirmSaveBtn" type="button" style="width:auto;">💾 حفظ كخلفية للشاشة</button>
        <button id="bgCancelBtn" type="button" class="btn-gray" style="width:auto;">إلغاء</button>
      </div>
      <div id="bgSaveResult"></div>
    </div>
  </div>`;

  document.getElementById('backToAdminFromDesignBtn').onclick=()=>goAdminHome();
  document.getElementById('clearBgColor').onclick=()=>{ document.getElementById('bgColor').value = '#ffffff'; window.__clearBg = true; };
  document.getElementById('clearTextColor').onclick=()=>{ document.getElementById('textColor').value = '#222222'; window.__clearText = true; };
  document.getElementById('clearAccentColor').onclick=()=>{ document.getElementById('accentColor').value = '#1b8a5a'; window.__clearAccent = true; };

  document.getElementById('saveThemeBtn').onclick = async () => {
    const bg = window.__clearBg ? '' : document.getElementById('bgColor').value;
    const text = window.__clearText ? '' : document.getElementById('textColor').value;
    const accent = window.__clearAccent ? '' : document.getElementById('accentColor').value;
    const font = document.getElementById('fontFamily').value;
    const size = document.getElementById('fontSize').value;
    const weight = document.getElementById('fontWeight').value;
    const results = await Promise.all([
      saveSiteContent('bg_color', bg), saveSiteContent('text_color', text),
      saveSiteContent('accent_color', accent), saveSiteContent('font_family', font),
      saveSiteContent('font_size_base', size), saveSiteContent('font_weight', weight),
    ]);
    document.getElementById('themeSaveResult').innerHTML = results.every(r=>r.success)
      ? '<div class="info" style="margin-top:8px;">✅ اتحفظ. حدّث الصفحة عشان تشوف التغيير.</div>'
      : '<div class="error" style="margin-top:8px;">حصل خطأ في بعض القيم.</div>';
  };

  // ثيمات جاهزة - بس بتملأ الحقول فوق، مبتحفظش لوحدها (لازم زرار "حفظ الألوان والخط")
  const themePresets = [
    { name:'الافتراضي', bg:'#ffffff', text:'#222222', accent:'#1b8a5a', font:'', weight:'' },
    { name:'ذهبي GRIFFINE', bg:'#ffffff', text:'#1a2530', accent:'#b68d33', font:'Tajawal', weight:'500' },
    { name:'أزرق محيطي', bg:'#f3f8fb', text:'#0f2a3d', accent:'#1673b1', font:'Cairo', weight:'' },
    { name:'ليلي أنيق', bg:'#12181f', text:'#eef1f4', accent:'#3fae7c', font:'Tajawal', weight:'' },
    { name:'دافئ', bg:'#fbf6ee', text:'#3a2b1b', accent:'#c9722f', font:'Almarai', weight:'500' },
    { name:'بساطة رمادية', bg:'#fafafa', text:'#2b2b2b', accent:'#4a4a4a', font:'Tahoma', weight:'' },
  ];
  document.getElementById('themePresetsRow').innerHTML = themePresets.map((p,i)=>`
    <button type="button" class="secondary small themePresetBtn" data-i="${i}" style="width:auto;display:flex;align-items:center;gap:6px;">
      <span style="width:14px;height:14px;border-radius:50%;background:${p.accent};display:inline-block;border:1px solid rgba(0,0,0,.15);"></span>${escapeHtml(p.name)}
    </button>`).join('');
  document.querySelectorAll('.themePresetBtn').forEach(btn=>{
    btn.onclick = () => {
      const p = themePresets[parseInt(btn.dataset.i,10)];
      window.__clearBg = false; window.__clearText = false; window.__clearAccent = false;
      document.getElementById('bgColor').value = p.bg;
      document.getElementById('textColor').value = p.text;
      document.getElementById('accentColor').value = p.accent;
      document.getElementById('fontFamily').value = p.font;
      document.getElementById('fontWeight').value = p.weight;
    };
  });

  document.getElementById('saveHeroBtn').onclick = async () => {
    const results = await Promise.all([
      saveSiteContent('hero_banner_type', document.getElementById('heroType').value),
      saveSiteContent('hero_banner_url', document.getElementById('heroUrl').value.trim()),
      saveSiteContent('hero_title', document.getElementById('heroTitle').value.trim()),
      saveSiteContent('hero_subtitle', document.getElementById('heroSubtitle').value.trim()),
    ]);
    document.getElementById('heroSaveResult').innerHTML = results.every(r=>r.success)
      ? '<div class="info" style="margin-top:8px;">✅ اتحفظ. هيظهر في صفحة تسجيل الدخول.</div>'
      : `<div class="error" style="margin-top:8px;">${results.find(r=>!r.success)?.message || 'حصل خطأ'}</div>`;
  };

  function renderCustomButtonsList(){
    document.getElementById('customButtonsWrap').innerHTML = customButtons.length ? customButtons.map((b,i)=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #eee;">
        <div>${escapeHtml(b.label)} <span style="color:#888;font-size:12px;">(${buttonTypeLabel[b.type]||b.type}: ${escapeHtml(b.value)})</span></div>
        <button class="small danger" style="width:auto;" onclick="window.__removeCustomBtn(${i})">حذف</button>
      </div>
    `).join('') : '<p style="color:#888;font-size:13px;">مفيش أزرار مضافة.</p>';
  }
  renderCustomButtonsList();

  async function saveCustomButtons(){
    const r = await saveSiteContent('custom_buttons', JSON.stringify(customButtons));
    document.getElementById('btnSaveResult').innerHTML = r.success
      ? '<div class="info" style="margin-top:8px;">✅ اتحفظ.</div>'
      : `<div class="error" style="margin-top:8px;">${r.message || 'حصل خطأ'}</div>`;
  }

  document.getElementById('addBtnBtn').onclick = async () => {
    const label = document.getElementById('newBtnLabel').value.trim();
    const type = document.getElementById('newBtnType').value;
    const value = document.getElementById('newBtnValue').value.trim();
    if (!label || !value) return;
    if (customButtons.length >= 6) { alert('أقصى عدد أزرار هو 6.'); return; }
    customButtons.push({ label, type, value });
    await saveCustomButtons();
    renderCustomButtonsList();
    document.getElementById('newBtnLabel').value = '';
    document.getElementById('newBtnValue').value = '';
  };

  window.__removeCustomBtn = async (i) => {
    customButtons.splice(i, 1);
    await saveCustomButtons();
    renderCustomButtonsList();
  };

  document.getElementById('saveAnnBtn').onclick = async () => {
    const enabled = document.getElementById('annEnabled').checked;
    const text = document.getElementById('annText').value.trim();
    const r1 = await saveSiteContent('announcement_enabled', enabled ? '1' : '0');
    const r2 = await saveSiteContent('announcement_text', text);
    const resultEl = document.getElementById('annSaveResult');
    resultEl.innerHTML = (r1.success && r2.success)
      ? '<div class="info" style="margin-top:8px;">✅ اتحفظ. التغيير هيظهر لكل الزوار فورًا.</div>'
      : '<div class="error" style="margin-top:8px;">حصل خطأ أثناء الحفظ.</div>';
  };

  // خلفية شاشة محددة
  const bgScreens = BG_SCREENS;
  document.getElementById('bgScreenSelect').innerHTML = bgScreens.map(s=>`<option value="${s.v}">${s.l}</option>`).join('');
  window.__pageBackgroundsPreview = window.__pageBackgroundsPreview || {};

  function findScreen(key){ return bgScreens.find(s=>s.v===key); }

  function currentBgPreview(){
    const key = document.getElementById('bgScreenSelect').value;
    delete window.__pageBackgroundsPreview[key]; // نبدأ من غير معاينة معلّقة كل ما نغيّر الشاشة المختارة
    const img = window.__pageBackgrounds && window.__pageBackgrounds[key];
    document.getElementById('bgPreviewWrap').innerHTML = img
      ? `<img src="${img}" style="width:100%;max-width:360px;border-radius:10px;display:block;border:1px solid var(--border);">`
      : '<div style="color:#888;font-size:13px;">مفيش صورة مرفوعة لهذه الشاشة — الشكل الافتراضي شغّال.</div>';
    document.getElementById('bgRemoveBtn').style.display = img ? 'inline-block' : 'none';
    document.getElementById('bgActionsRow').style.display = 'flex';
    document.getElementById('bgConfirmRow').style.display = 'none';
    document.getElementById('bgSaveResult').innerHTML = '';
  }
  currentBgPreview();
  document.getElementById('bgScreenSelect').onchange = currentBgPreview;

  async function saveBg(dataUrlOrEmpty){
    const key = document.getElementById('bgScreenSelect').value;
    const resEl = document.getElementById('bgSaveResult');
    resEl.innerHTML = '<div style="font-size:12.5px;color:#888;margin-top:6px;">جاري الحفظ...</div>';
    const r = await savePageBackground(key, dataUrlOrEmpty);
    if (r && r.success) {
      window.__pageBackgrounds = window.__pageBackgrounds || {};
      if (dataUrlOrEmpty) window.__pageBackgrounds[key] = dataUrlOrEmpty; else delete window.__pageBackgrounds[key];
      delete window.__pageBackgroundsPreview[key];
      currentBgPreview();
      resEl.innerHTML = '<div class="info" style="margin-top:8px;">✅ اتحفظت. هتظهر لكل الزوار فورًا.</div>';
    } else {
      resEl.innerHTML = `<div class="error" style="margin-top:8px;">${(r&&r.message)||'حصل خطأ في الحفظ'}</div>`;
    }
  }

  // بعد اختيار صورة: نعرضها كمعاينة "قبل/بعد" جنب بعض من غير ما نحفظها على السيرفر لحد ما تضغط "حفظ"
  document.getElementById('bgUploadBtn').onclick = () => document.getElementById('bgUploadInput').click();
  document.getElementById('bgUploadInput').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if (!file) return;
    const key = document.getElementById('bgScreenSelect').value;
    const beforeImg = window.__pageBackgrounds && window.__pageBackgrounds[key];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width*scale), h = Math.round(img.height*scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        let compressed = canvas.toDataURL('image/webp', 0.82);
        if (compressed.indexOf('data:image/webp') !== 0) compressed = canvas.toDataURL('image/jpeg', 0.82);
        window.__bgPendingImage = compressed;
        document.getElementById('bgPreviewWrap').innerHTML = `
          <div style="display:flex;gap:14px;flex-wrap:wrap;">
            <div><div style="font-size:12px;color:#888;margin-bottom:4px;">قبل (الحالي)</div>
              ${beforeImg ? `<img src="${beforeImg}" style="width:170px;height:110px;object-fit:cover;border-radius:8px;border:1px solid var(--border);">`
                : '<div style="width:170px;height:110px;border:1px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#999;text-align:center;padding:6px;">الشكل الافتراضي (بدون صورة)</div>'}
            </div>
            <div><div style="font-size:12px;color:#888;margin-bottom:4px;">بعد (الصورة الجديدة)</div>
              <img src="${compressed}" style="width:170px;height:110px;object-fit:cover;border-radius:8px;border:1px solid var(--border);">
            </div>
          </div>`;
        document.getElementById('bgActionsRow').style.display = 'none';
        document.getElementById('bgConfirmRow').style.display = 'flex';
        document.getElementById('bgSaveResult').innerHTML = '';
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  document.getElementById('bgRemoveBtn').onclick = () => saveBg('');
  document.getElementById('bgCancelBtn').onclick = () => { window.__bgPendingImage = null; currentBgPreview(); };
  document.getElementById('bgConfirmSaveBtn').onclick = () => { if (window.__bgPendingImage) saveBg(window.__bgPendingImage); };

  // معاينة الشاشة الحقيقية بالصورة الجديدة قبل الحفظ، مع إمكانية التبديل "قبل/بعد" ورجوع لتنسيق الموقع
  document.getElementById('bgPreviewRealBtn').onclick = () => launchScreenPreview(document.getElementById('bgScreenSelect').value, true);
  document.getElementById('bgPreviewCurrentBtn').onclick = () => launchScreenPreview(document.getElementById('bgScreenSelect').value, false);

  // لو جاي من الزر العائم 🖼️ على شاشة معينة: نختارها تلقائيًا وننزل لقسم الخلفية
  if (window.__bgDesignPreselect && bgScreens.some(s => s.v === window.__bgDesignPreselect)) {
    document.getElementById('bgScreenSelect').value = window.__bgDesignPreselect;
    currentBgPreview();
    document.getElementById('bgScreenSelect').scrollIntoView({ block:'center' });
  }
  window.__bgDesignPreselect = null;
}

function showBgPreviewBar(){
  const st = window.__bgPreviewReturn;
  if (!st) return;
  const sb = document.getElementById('bgShortcutBtn'); if (sb) sb.remove();
  let bar = document.getElementById('bgPreviewBar');
  if (!bar) { bar = document.createElement('div'); bar.id = 'bgPreviewBar'; document.body.appendChild(bar); }
  const isAfter = Object.prototype.hasOwnProperty.call(window.__pageBackgroundsPreview, st.key);
  const toggleHtml = st.hasPending ? `
    <span class="bgpv-toggle">
      <button type="button" class="bgpv-before ${!isAfter?'active':''}">قبل</button>
      <button type="button" class="bgpv-after ${isAfter?'active':''}">بعد</button>
    </span>` : '';
  bar.innerHTML = `
    <span class="bgpv-label">👁️ معاينة: ${escapeHtml(st.label)}${st.hasPending ? '' : ' (الشكل الحالي)'}</span>
    ${toggleHtml}
    <button type="button" class="bgpv-back">🔙 رجوع لتنسيق الموقع</button>`;
  const rerender = () => { window[st.fn](...(st.args || [])); showBgPreviewBar(); };
  if (st.hasPending) {
    bar.querySelector('.bgpv-before').onclick = () => { delete window.__pageBackgroundsPreview[st.key]; rerender(); };
    bar.querySelector('.bgpv-after').onclick = () => { window.__pageBackgroundsPreview[st.key] = window.__bgPendingImage; rerender(); };
  }
  bar.querySelector('.bgpv-back').onclick = () => {
    delete window.__pageBackgroundsPreview[st.key];
    window.__bgPreviewReturn = null;
    window.__bgDesignPreselect = st.key;
    hideBgPreviewBar();
    renderSiteDesignPage();
  };
}
function hideBgPreviewBar(){
  const bar = document.getElementById('bgPreviewBar');
  if (bar) bar.remove();
}

/* ================== التقارير والإحصائيات (أدمن) ====
============== */
async function renderAdminReportsPage(){
  pushNav(() => renderAdminReportsPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('view_reports')) return renderAdminHub();

  const res = await getAdminReports();
  if (!res || !res.success) {
    app.innerHTML = `<div class="container">${logoHeader()}<div class="error">تعذّر تحميل التقارير.</div></div>`;
    return;
  }

  function barRow(label, value, maxValue, formatter){
    const pct = maxValue > 0 ? Math.max(4, Math.round((value / maxValue) * 100)) : 0;
    return `<div style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;"><span>${label}</span><span>${formatter(value)}</span></div>
      <div style="background:#eee;border-radius:4px;height:10px;overflow:hidden;"><div style="background:var(--green);height:100%;width:${pct}%;"></div></div>
    </div>`;
  }

  const maxRevenue = Math.max(1, ...res.revenueByMonth.map(r=>r.total));
  const maxSignups = Math.max(1, ...res.signupsByMonth.map(r=>r.count));
  const maxPlan = Math.max(1, ...res.byPlan.map(r=>r.total));

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('admin_reports','📊 التقارير والإحصائيات')}</div>
      ${adminNavButtonsHtml()}
    </div>

    <h2>لقطة سريعة</h2>
    <div class="summary-cards">
      <div class="summary-card"><div class="val">${res.activeCount}</div><div class="lbl">مشتركين نشطين</div></div>
      <div class="summary-card"><div class="val">${res.inactiveCount}</div><div class="lbl">مشتركين موقوفين</div></div>
    </div>

    <h2 style="margin-top:20px;">الإيرادات شهريًا (آخر 12 شهر)</h2>
    <div class="section-card">
      ${res.revenueByMonth.length ? res.revenueByMonth.map(r=>barRow(r.month, r.total, maxRevenue, v=>fmtMoney(v))).join('') : '<p style="color:#888;font-size:13px;">لا يوجد بيانات كافية بعد.</p>'}
    </div>

    <h2 style="margin-top:20px;">اشتراكات جديدة شهريًا (آخر 12 شهر)</h2>
    <div class="section-card">
      ${res.signupsByMonth.length ? res.signupsByMonth.map(r=>barRow(r.month, r.count, maxSignups, v=>v)).join('') : '<p style="color:#888;font-size:13px;">لا يوجد بيانات كافية بعد.</p>'}
    </div>

    <h2 style="margin-top:20px;">الإيرادات حسب الباقة (كل الأوقات)</h2>
    <div class="section-card">
      ${res.byPlan.length ? res.byPlan.map(r=>barRow(`${escapeHtml(r.planName)} (${r.count})`, r.total, maxPlan, v=>fmtMoney(v))).join('') : '<p style="color:#888;font-size:13px;">لا يوجد بيانات كافية بعد.</p>'}
    </div>
  </div>`;
  wireAdminNavButtons();
}

/* ================== توصيات الشراء - لوحة الأدمن/الموظف ================== */
async function renderRecommendationsAdminPage(){
  pushNav(() => renderRecommendationsAdminPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('manage_recommendations')) return renderAdminHub();

  if (window.__recLogTick) { clearInterval(window.__recLogTick); window.__recLogTick = null; }

  const logRes = await getRecommendationsLog();
  let recs = (logRes && logRes.success) ? logRes.recommendations : [];

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('recommendations_admin','📢 توصيات الشراء')}</div>
      ${adminNavButtonsHtml()}
    </div>
    <div class="info">أي توصية تضيفها هنا بتوصل كإشعار كامل التفاصيل لكل زوار الموقع اللي فعّلوا الإشعارات، وبتظهر في شاشة "📢 التوصيات" المنفصلة عن الشات عند كل عميل — للعرض فقط. لكل توصية مدة صلاحية بتحددها إنت وقت الإرسال، وبعدها تتقفل تلقائيًا. تقدر تلغي أي توصية بعتها إنت بنفسك في أي وقت قبل انتهاء مدتها.</div>

    <h2>إضافة توصية جديدة</h2>
    <div class="section-card">
      <form id="addRecForm">
        <div class="grid2">
          <div><label>كود السهم</label><input type="text" id="rec_symbol" required placeholder="مثال: COMI"></div>
          <div><label>اسم السهم</label><input type="text" id="rec_name" required placeholder="مثال: البنك التجاري الدولي"></div>
        </div>
        <div class="grid2">
          <div><label>نقطة الشراء من</label><input type="number" step="any" id="rec_buyFrom" required></div>
          <div><label>نقطة الشراء إلى</label><input type="number" step="any" id="rec_buyTo" required></div>
        </div>
        <label>مدة صلاحية التوصية (بعدها تتقفل تلقائيًا ومتظهرش للعميل)</label>
        <select id="rec_validity">
          <option value="24">24 ساعة</option>
          <option value="48">48 ساعة</option>
          <option value="72">72 ساعة</option>
          <option value="168">أسبوع (168 ساعة)</option>
        </select>
        <h3 style="margin-top:12px;">نقاط المقاومة (الخروج/جني الأرباح)</h3>
        ${[1,2,3].map(i=>`<div class="grid2">
          <div><label>المقاومة ${i}</label><input type="number" step="any" id="rec_r${i}"></div>
          <div><label>نسبة الخروج عندها %</label><input type="number" step="any" id="rec_r${i}p" placeholder="مثال: 33"></div>
        </div>`).join('')}
        <h3 style="margin-top:12px;">نقاط الدعم / التعزيز</h3>
        <div class="grid2">
          <div><label>الدعم 1</label><input type="number" step="any" id="rec_s1"></div>
          <div><label>الدعم 2</label><input type="number" step="any" id="rec_s2"></div>
        </div>
        <label>الدعم 3</label><input type="number" step="any" id="rec_s3">
        <button type="submit" style="margin-top:12px;">📢 إرسال التوصية</button>
      </form>
      <div id="addRecResult"></div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;">
      <h2 style="margin:0;">سجل التوصيات (<span id="recCount">${recs.length}</span>)</h2>
      <button class="secondary small" id="clearNowBtn" style="width:auto;">🗑️ إلغاء كل النشطة الآن</button>
    </div>
    <div class="section-card" id="recListWrap"></div>
  </div>`;

  wireAdminNavButtons();

  const statusInfo = {
    active:    { label: 'نشطة',  color: 'var(--green)' },
    cancelled: { label: 'أُلغيت', color: '#c0392b' },
    expired:   { label: 'انتهت',  color: '#888' },
  };

  function remainingLabel(createdAt, validityHours){
    const expiresAt = new Date(createdAt.replace(' ', 'T')).getTime() + validityHours*3600*1000;
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0) return 'انتهت المدة';
    const h = Math.floor(diffMs/3600000), m = Math.floor((diffMs%3600000)/60000);
    return `متبقي ${h} س ${m} د`;
  }

  function renderList(){
    document.getElementById('recCount').textContent = recs.length;
    document.getElementById('recListWrap').innerHTML = recs.length ? recs.map(r=>{
      const canCancel = r.status === 'active' && (window.__isSuperAdmin || (r.createdBy && r.createdBy.toLowerCase() === email.toLowerCase()));
      const st = statusInfo[r.status] || statusInfo.active;
      const timeInfo = r.status === 'active' ? remainingLabel(r.createdAt, r.validityHours) : `أُغلقت: ${formatDateAr(r.archivedAt)}`;
      return `<div class="section-card" style="margin-bottom:10px;border-inline-start:4px solid ${st.color};">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
          <div><strong>${escapeHtml(r.stockName)} (${escapeHtml(r.symbol)})</strong> — شراء من ${r.buyFrom} إلى ${r.buyTo}
            <span style="font-size:11px;font-weight:bold;color:${st.color};margin-inline-start:8px;">${escapeHtml(st.label)}</span>
          </div>
          ${canCancel ? `<button class="small danger" style="width:auto;" onclick="window.__deleteRec('${r.id}')">🗑️ إلغاء الآن</button>` : ''}
        </div>
        <div style="font-size:12px;color:#888;margin-top:4px;">أُرسلت: ${formatDateAr(r.createdAt)} بواسطة ${escapeHtml(r.createdBy||'-')} — صلاحية ${r.validityHours} ساعة — <strong>${timeInfo}</strong></div>
      </div>`;
    }).join('') : '<p style="color:#888;font-size:13px;">مفيش أي توصيات في السجل لسه.</p>';
  }
  renderList();
  window.__recLogTick = setInterval(renderList, 60000); // تحديث العد التنازلي كل دقيقة

  window.__deleteRec = async (id) => {
    if (!await gConfirm('متأكد إنك عايز تلغي التوصية دي دلوقتي؟ هتختفي فورًا من عند كل العملاء.')) return;
    const r = await deleteRecommendation(id);
    if (r.success) {
      const fresh = await getRecommendationsLog();
      if (fresh.success) { recs = fresh.recommendations; renderList(); }
    } else {
      alert(r.message || 'حصل خطأ');
    }
  };

  document.getElementById('clearNowBtn').onclick = async () => {
    if (!await gConfirm('متأكد إنك عايز تلغي كل التوصيات النشطة دلوقتي؟')) return;
    const r = await clearRecommendationsNow();
    if (r.success) {
      const fresh = await getRecommendationsLog();
      if (fresh.success) { recs = fresh.recommendations; renderList(); }
    } else alert(r.message || 'حصل خطأ');
  };

  document.getElementById('addRecForm').onsubmit = async (e) => {
    e.preventDefault();
    const val = (id) => document.getElementById(id).value;
    const data = {
      symbol: val('rec_symbol').trim(), stockName: val('rec_name').trim(),
      buyFrom: val('rec_buyFrom'), buyTo: val('rec_buyTo'),
      validityHours: val('rec_validity'),
      resistance1: val('rec_r1'), resistance1Pct: val('rec_r1p'),
      resistance2: val('rec_r2'), resistance2Pct: val('rec_r2p'),
      resistance3: val('rec_r3'), resistance3Pct: val('rec_r3p'),
      support1: val('rec_s1'), support2: val('rec_s2'), support3: val('rec_s3'),
    };
    const r = await addRecommendation(data);
    const resultEl = document.getElementById('addRecResult');
    if (r.success) {
      resultEl.innerHTML = '<div class="info" style="margin-top:8px;">✅ اتبعتت التوصية.</div>';
      document.getElementById('addRecForm').reset();
      const fresh = await getRecommendationsLog();
      if (fresh.success) { recs = fresh.recommendations; renderList(); }
    } else {
      resultEl.innerHTML = `<div class="error" style="margin-top:8px;">${r.message || 'حصل خطأ'}</div>`;
    }
  };
}

/* ================== توصيات الشراء - شاشة العميل (عرض فقط، مفصولة عن الشات) ================== */
async function renderRecommendationsCustomerPage(){
  pushNav(() => renderRecommendationsCustomerPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;

  if (window.__recPoll) { clearInterval(window.__recPoll); window.__recPoll = null; }

  async function load(){
    const res = await getRecommendations();
    const recs = (res && res.success) ? res.recommendations : [];
    const listEl = document.getElementById('recCustomerList');
    if (!listEl) return;
    listEl.innerHTML = recs.length ? recs.map(r=>{
      const resistancesHtml = r.resistances.filter(x=>x.level!==null).map((x,i)=>
        `<div>المقاومة ${i+1}: <strong>${x.level}</strong>${x.pct!==null?` — بيع ${x.pct}%`:''}</div>`).join('');
      const supportsHtml = r.supports.filter(x=>x!==null).map((x,i)=>`<div>الدعم ${i+1}: <strong>${x}</strong></div>`).join('');
      return `<div class="section-card" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:15px;color:var(--green-dark);">${escapeHtml(r.stockName)} (${escapeHtml(r.symbol)})</strong>
          <span style="font-size:11px;color:#888;">${formatDateAr(r.createdAt)}</span>
        </div>
        <div style="margin-top:6px;">نقطة الشراء: <strong>${r.buyFrom} - ${r.buyTo}</strong></div>
        <div class="grid2" style="margin-top:8px;">
          <div><div class="section-title">المقاومة / الخروج</div>${resistancesHtml || '<span style="color:#888;font-size:12px;">-</span>'}</div>
          <div><div class="section-title">الدعم / التعزيز</div>${supportsHtml || '<span style="color:#888;font-size:12px;">-</span>'}</div>
        </div>
        <button class="small" style="width:auto;margin-top:10px;" onclick="window.__useForPlan('${r.symbol.replace(/'/g,"")}', ${r.buyFrom}, 'مصر')">حوّل لخطة</button>
      </div>`;
    }).join('') : '<p style="color:#888;font-size:13px;">مفيش توصيات حاليًا.</p>';
  }

  app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>${pageTitle('recommendations_customer','📢 التوصيات')}</div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button></div>
    <div class="info">شاشة عرض فقط للتوصيات اللي بتوصلك من الفريق — مش شات، ومش قابلة للكتابة فيها.</div>
    <div id="recCustomerList"></div>
  </div>`;
  document.getElementById('homeBtn').onclick=()=>{ if(window.__recPoll){clearInterval(window.__recPoll);window.__recPoll=null;} renderHome(); };

  window.__useForPlan = (symbol, price, market) => {
    if (window.__recPoll) { clearInterval(window.__recPoll); window.__recPoll = null; }
    window.__prefillPlan = { symbol, price, market };
    renderNewPlanForm();
  };

  await load();
  window.__recPoll = setInterval(load, 30000); // تحديث تلقائي كل 30 ثانية
}

/* ================== لوحة إدارة المحتوى - آراء العملاء والمقالات (أدمن) ================== */
async function renderContentAdminPage(){
  pushNav(() => renderContentAdminPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('manage_content')) return renderAdminHub();

  const [testiRes, artRes] = await Promise.all([getTestimonials(), getArticlesAdmin()]);
  let testimonials = (testiRes && testiRes.success) ? testiRes.testimonials : [];
  let articles = (artRes && artRes.success) ? artRes.articles : [];

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('content_admin','📰 آراء العملاء والمقالات')}</div>
      ${adminNavButtonsHtml()}
    </div>

    <h2>آراء العملاء (${testimonials.length})</h2>
    <div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="testiAdminSearch" placeholder="🔍 ابحث بالاسم أو نص الرأي..."></div>
    </div>
    <div class="section-card" id="testiAdminListWrap"></div>

    <h2 style="margin-top:20px;">إضافة/تعديل مقال</h2>
    <div class="section-card">
      <form id="artForm">
        <input type="hidden" id="art_id" value="">
        <label>العنوان</label>
        <input type="text" id="art_title" required maxlength="200">
        <label>ملخص قصير (يظهر في القائمة)</label>
        <input type="text" id="art_summary" maxlength="300">
        <label>محتوى المقال</label>
        <textarea id="art_body" rows="8" required></textarea>
        <label style="display:flex;align-items:center;gap:8px;font-weight:normal;">
          <input type="checkbox" id="art_published" checked> منشور (ظاهر للزوار)
        </label>
        <button type="submit" style="margin-top:10px;">حفظ المقال</button>
        <button type="button" class="secondary" id="art_cancelEdit" style="display:none;">إلغاء التعديل</button>
      </form>
      <div id="artSaveResult"></div>
    </div>

    <h2 style="margin-top:20px;">المقالات (${articles.length})</h2>
    <div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="artAdminSearch" placeholder="🔍 ابحث بعنوان المقال..."></div>
    </div>
    <div class="section-card" id="artAdminListWrap"></div>
  </div>`;

  wireAdminNavButtons();

  function renderTestiList(){
    const q = (document.getElementById('testiAdminSearch')?.value || '').trim().toLowerCase();
    const visible = q ? testimonials.filter(t => (t.displayName||'').toLowerCase().includes(q) || (t.comment||'').toLowerCase().includes(q)) : testimonials;
    document.getElementById('testiAdminListWrap').innerHTML = testimonials.length===0 ? '<p style="color:#888;font-size:13px;">مفيش آراء لسه.</p>'
      : (visible.length ? visible.map(t=>`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border-soft);gap:8px;">
        <div>
          <div>${'⭐'.repeat(t.rating)} — <strong>${escapeHtml(t.displayName)}</strong></div>
          <div style="font-size:12.5px;color:#555;">"${escapeHtml(t.comment)}"</div>
          <div style="font-size:11px;color:#888;">${formatDateAr(t.createdAt)}</div>
        </div>
        <button class="small danger" style="width:auto;" onclick="window.__deleteTestiAdmin('${t.id}')">حذف</button>
      </div>`).join('') : '<p class="std-filter-empty">مفيش نتائج مطابقة للبحث</p>');
  }
  renderTestiList();
  const testiAdminSearchEl = document.getElementById('testiAdminSearch');
  if (testiAdminSearchEl) testiAdminSearchEl.addEventListener('input', renderTestiList);

  window.__deleteTestiAdmin = async (id) => {
    if (!await gConfirm('متأكد إنك عايز تحذف الرأي ده؟')) return;
    const r = await deleteTestimonial(id);
    if (r.success) { testimonials = testimonials.filter(x=>x.id!==id); renderTestiList(); }
    else alert(r.message || 'حصل خطأ');
  };

  function renderArticlesList(){
    const q = (document.getElementById('artAdminSearch')?.value || '').trim().toLowerCase();
    const visible = q ? articles.filter(a => (a.title||'').toLowerCase().includes(q)) : articles;
    document.getElementById('artAdminListWrap').innerHTML = articles.length===0 ? '<p style="color:#888;font-size:13px;">مفيش مقالات لسه.</p>'
      : (visible.length ? visible.map(a=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-soft);gap:8px;flex-wrap:wrap;">
        <div><strong>${escapeHtml(a.title)}</strong> ${a.published?'':'<span class="tag tag-wait">مسودة</span>'}</div>
        <div>
          <button class="small secondary" style="width:auto;" onclick="window.__editArticle('${a.id}')">تعديل</button>
          <button class="small danger" style="width:auto;" onclick="window.__deleteArticleAdmin('${a.id}')">حذف</button>
        </div>
      </div>`).join('') : '<p class="std-filter-empty">مفيش نتائج مطابقة للبحث</p>');
  }
  renderArticlesList();
  const artAdminSearchEl = document.getElementById('artAdminSearch');
  if (artAdminSearchEl) artAdminSearchEl.addEventListener('input', renderArticlesList);

  window.__editArticle = (id) => {
    const a = articles.find(x=>x.id===id);
    if (!a) return;
    document.getElementById('art_id').value = a.id;
    document.getElementById('art_title').value = a.title;
    document.getElementById('art_summary').value = a.summary || '';
    document.getElementById('art_body').value = a.body;
    document.getElementById('art_published').checked = a.published;
    document.getElementById('art_cancelEdit').style.display = '';
    window.scrollTo(0,0);
  };
  document.getElementById('art_cancelEdit').onclick = () => {
    document.getElementById('artForm').reset();
    document.getElementById('art_id').value = '';
    document.getElementById('art_cancelEdit').style.display = 'none';
  };

  window.__deleteArticleAdmin = async (id) => {
    if (!await gConfirm('متأكد إنك عايز تحذف المقال ده؟')) return;
    const r = await deleteArticle(id);
    if (r.success) { articles = articles.filter(x=>x.id!==id); renderArticlesList(); }
    else alert(r.message || 'حصل خطأ');
  };

  document.getElementById('artForm').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      id: document.getElementById('art_id').value || 0,
      title: document.getElementById('art_title').value.trim(),
      summary: document.getElementById('art_summary').value.trim(),
      body: document.getElementById('art_body').value.trim(),
      published: document.getElementById('art_published').checked ? '1' : '0',
    };
    const r = await saveArticle(data);
    const resultEl = document.getElementById('artSaveResult');
    if (r.success) {
      resultEl.innerHTML = '<div class="info" style="margin-top:8px;">✅ اتحفظ.</div>';
      document.getElementById('artForm').reset();
      document.getElementById('art_id').value = '';
      document.getElementById('art_cancelEdit').style.display = 'none';
      const fresh = await getArticlesAdmin();
      if (fresh.success) { articles = fresh.articles; renderArticlesList(); }
    } else {
      resultEl.innerHTML = `<div class="error" style="margin-top:8px;">${r.message || 'حصل خطأ'}</div>`;
    }
  };
}

/* ================== مقترحات العملاء لتطوير الموقع - عرض الأدمن ================== */
/* ================== تعديل نصوص شاشات الموقع (للأدمن) ================== */
/* سجل كل الشاشات اللي ممكن تتعدل عنوانها من هنا - أي شاشة جديدة تتضاف للموقع تضاف هنا كمان عشان تظهر في القائمة */
const SITE_SCREEN_TITLES_REGISTRY = [
  { key: 'public_home_tagline', label: 'شاشة الترحيب — العنوان الرئيسي', def: 'قرارات أذكى. محافظ أقوى.' },
  { key: 'public_home_motto', label: 'الشعار الفرعي فوق صورة الجريفين (شاشة الترحيب + شاشة الدخول)', def: 'الانضباط يحسب لك الحرية' },
  { key: 'home', label: 'الشاشة الرئيسية (بعد تسجيل الدخول)', def: 'ابدأ من هنا' },
  { key: 'public_pricing', label: 'الباقات والأسعار (قبل تسجيل الدخول)', def: 'الباقات والأسعار' },
  { key: 'testimonials', label: 'آراء العملاء', def: '⭐ آراء العملاء' },
  { key: 'articles_list', label: 'قائمة المقالات', def: '📰 مقالات' },
  { key: 'article_detail', label: 'تفاصيل المقال', def: '📰 مقال' },
  { key: 'suggestions_page', label: 'شاركنا مقترحاتك (شاشة العميل)', def: '💡 شاركنا مقترحاتك' },
  { key: 'contact_info', label: 'تواصل معنا (بدون تسجيل دخول)', def: 'بيانات التواصل' },
  { key: 'my_subscription_history', label: 'سجل اشتراكي', def: '📄 سجل اشتراكي' },
  { key: 'disclaimer_page', label: 'إخلاء المسؤولية (صفحة كاملة)', def: '⚠️ إخلاء المسؤولية (Disclaimer)' },
  { key: 'disclaimer_gate', label: 'إخلاء المسؤولية (بوابة الموافقة الإلزامية)', def: '⚠️ إخلاء المسؤولية' },
  { key: 'about_page', label: 'عن GRIFFINE (عنوان الشاشة)', def: 'عن GRIFFINE' },
  { key: 'refund_policy_page', label: 'سياسة استرداد الاشتراك (عنوان الشاشة)', def: 'سياسة استرداد الاشتراك' },
  { key: 'privacy_page', label: 'سياسة الخصوصية (عنوان الشاشة)', def: 'سياسة الخصوصية' },
  { key: 'portfolio', label: 'ملخص المحفظة', def: '📊 ملخص المحفظة' },
  { key: 'diversification_report', label: 'تقرير تنويع المحفظة', def: '🎯 تقرير تنويع المحفظة' },
  { key: 'referral', label: 'ادعُ صديق', def: '🎁 ادعُ صديق' },
  { key: 'profile', label: 'الملف الشخصي', def: '👤 الملف الشخصي' },
  { key: 'plans_list', label: 'قائمة خطط تعزيز المتوسط (DCA)', def: 'خططك الحالية (سهم لكل خطة)' },
  { key: 'plan_type_chooser', label: 'اختيار نوع الخطة الجديدة', def: 'اختر نوع الخطة' },
  { key: 'grid_plans_list', label: 'قائمة خطط الشبكة (Grid)', def: '🔲 خطط الشبكة (Grid)' },
  { key: 'grid_plan_new', label: 'إضافة خطة شبكة جديدة', def: '+ خطة شبكة جديدة' },
  { key: 'screener', label: 'كشاف الأسهم', def: 'كشاف الأسهم — تحليل فني لسهم واحد' },
  { key: 'recommendations_customer', label: 'التوصيات (شاشة العميل)', def: '📢 التوصيات' },
  { key: 'admin_hub', label: 'لوحة التحكم الرئيسية (أدمن)', def: '🛡️ لوحة التحكم' },
  { key: 'admin_subscribers', label: 'لوحة تحكم المدير — المشتركون', def: '🛡️ لوحة تحكم المدير — المشتركون' },
  { key: 'archived_customers', label: 'أرشيف العملاء المحذوفين', def: '🗄️ أرشيف العملاء المحذوفين' },
  { key: 'plans_management', label: 'إدارة الخطط والأسعار (أدمن)', def: '💳 إدارة الخطط والأسعار' },
  { key: 'chat_admin', label: 'الدردشة الفورية (أدمن)', def: '💬 الدردشة الفورية' },
  { key: 'admin_settings', label: 'الصلاحيات والإعدادات الإلزامية', def: '⚙️ الصلاحيات والإعدادات الإلزامية' },
  { key: 'blacklist', label: 'القائمة السوداء', def: '🚫 القائمة السوداء' },
  { key: 'staff_management', label: 'الفريق والصلاحيات', def: '👥 الفريق والصلاحيات' },
  { key: 'site_design', label: 'تنسيق الموقع', def: '🎨 تنسيق الموقع' },
  { key: 'admin_reports', label: 'التقارير والإحصائيات', def: '📊 التقارير والإحصائيات' },
  { key: 'recommendations_admin', label: 'توصيات الشراء (أدمن)', def: '📢 توصيات الشراء' },
  { key: 'content_admin', label: 'آراء العملاء والمقالات (أدمن)', def: '📰 آراء العملاء والمقالات' },
  { key: 'site_texts_admin', label: 'تعديل نصوص شاشات الموقع (هذه الشاشة)', def: '📝 تعديل نصوص شاشات الموقع' },
  { key: 'suggestions_admin', label: 'مقترحات العملاء لتطوير الموقع (أدمن)', def: '💡 مقترحات العملاء لتطوير الموقع' },
];

async function renderSiteTextsAdminPage(){
  pushNav(() => renderSiteTextsAdminPage());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!window.__isAdmin) return renderHome();
  if(!hasPermission('manage_site_content')) return renderAdminHub();

  const res = await getAllPageContents();
  const contents = (res && res.success) ? (res.contents || {}) : {};

  const pages = [
    { key: 'about', label: 'عن GRIFFINE', hint: 'النص اللي بيظهر في شاشة "عن GRIFFINE".' },
    { key: 'contact', label: 'تواصل معنا', hint: 'بيانات التواصل: الإيميل، أرقام الهاتف والواتساب، أو أي بيانات تانية.' },
    { key: 'refund_policy', label: 'سياسة استرداد الاشتراك', hint: 'نص سياسة الاسترداد الكامل.' },
    { key: 'privacy', label: 'سياسة الخصوصية', hint: 'نص سياسة الخصوصية الكامل (بيظهر في شاشة تسجيل الدخول وعلى الرابط /index.php?page=privacy). سيبه فاضي لاستخدام النص الافتراضي.' },
    { key: 'suggestions', label: 'شاركنا مقترحاتك', hint: 'النص التعريفي اللي بيظهر فوق نموذج المقترحات.' },
  ];

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('site_texts_admin','📝 تعديل نصوص شاشات الموقع')}</div>
      ${adminNavButtonsHtml()}
    </div>
    <div class="info">من هنا تقدر تعدّل عنوان أي شاشة من شاشات الموقع (${SITE_SCREEN_TITLES_REGISTRY.length} شاشة)، وكمان نص صفحات المحتوى الطويلة (عن الموقع، سياسة الاسترداد، تواصل معنا، مقترحاتك). لو سبت الخانة فاضية، الشاشة هتعرض العنوان/النص الأصلي الافتراضي بتاعها.</div>

    <h2 style="margin-top:18px;">🏷️ عناوين الشاشات</h2>
    <div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="screenTitlesSearch" placeholder="🔍 دوّر على اسم الشاشة..."></div>
    </div>
    <div id="screenTitlesEmpty" class="std-filter-empty" style="display:none;">مفيش شاشة مطابقة للبحث</div>
    <div id="screenTitlesList">
      ${SITE_SCREEN_TITLES_REGISTRY.map(s => `
        <div class="section-card screen-title-row" data-q="${escapeHtml(s.label.toLowerCase())}" style="margin-bottom:10px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;">
          <div style="flex:1;min-width:220px;">
            <div style="font-size:13.5px;font-weight:700;">${escapeHtml(s.label)}</div>
            <div style="font-size:11.5px;color:#888;">الافتراضي: ${escapeHtml(s.def)}</div>
          </div>
          <input type="text" id="pt_${s.key}" placeholder="${escapeHtml(s.def)}" value="${escapeHtml(contents['title__'+s.key] || '')}" style="flex:2;min-width:200px;">
          <button class="secondary small" style="width:auto;" onclick="window.__savePageTitle('${s.key}')">💾 حفظ</button>
          <div id="ptResult_${s.key}" style="width:100%;"></div>
        </div>
      `).join('')}
    </div>

    <h2 style="margin-top:24px;">📄 نصوص الصفحات</h2>
    ${pages.map(p => `
      <h3 style="margin-top:18px;">${escapeHtml(p.label)}</h3>
      <div class="section-card">
        <div style="font-size:12.5px;color:#666;margin-bottom:8px;">${p.hint}</div>
        <textarea id="pc_${p.key}" rows="8" placeholder="اتركها فاضية لعرض النص الافتراضي...">${escapeHtml(contents[p.key] || '')}</textarea>
        <button class="secondary" style="width:auto;margin-top:8px;" onclick="window.__savePageText('${p.key}')">💾 حفظ نص هذه الشاشة</button>
        <div id="pcResult_${p.key}"></div>
      </div>
    `).join('')}
  </div>`;
  wireAdminNavButtons();

  const titlesSearchInput = document.getElementById('screenTitlesSearch');
  if (titlesSearchInput) {
    titlesSearchInput.oninput = () => {
      const q = titlesSearchInput.value.trim().toLowerCase();
      let anyVisible = false;
      document.querySelectorAll('.screen-title-row').forEach(row => {
        const show = !q || (row.dataset.q || '').includes(q);
        row.style.display = show ? '' : 'none';
        if (show) anyVisible = true;
      });
      const empty = document.getElementById('screenTitlesEmpty');
      if (empty) empty.style.display = anyVisible ? 'none' : '';
    };
  }

  window.__savePageTitle = async (key) => {
    const resEl = document.getElementById('ptResult_' + key);
    const value = document.getElementById('pt_' + key).value;
    const r = await savePageContent('title__' + key, value);
    if (r && r.success) {
      resEl.innerHTML = '<div class="info" style="margin-top:6px;">✅ تم الحفظ، والعنوان اتحدّث فورًا في كل مكان في الموقع (القائمة المنسدلة وعنوان الشاشة نفسها).</div>';
      if (window.__pageTitles) { if (value && value.trim() !== '') window.__pageTitles[key] = value; else delete window.__pageTitles[key]; }
      await refreshTopNav(); // عشان القائمة المنسدلة (☰) تتحدث فورًا من غير ما تحتاج تعمل تحديث للصفحة
    } else {
      resEl.innerHTML = `<div class="error" style="margin-top:6px;">${(r&&r.message)||'حصل خطأ في الحفظ'}</div>`;
    }
  };

  window.__savePageText = async (key) => {
    const resEl = document.getElementById('pcResult_' + key);
    const content = document.getElementById('pc_' + key).value;
    const r = await savePageContent(key, content);
    if (r && r.success) {
      resEl.innerHTML = '<div class="info" style="margin-top:8px;">✅ تم الحفظ، والتعديل ظاهر للعملاء فورًا.</div>';
    } else {
      resEl.innerHTML = `<div class="error" style="margin-top:8px;">${(r&&r.message)||'حصل خطأ في الحفظ'}</div>`;
    }
  };
}

async function renderSuggestionsAdminPage(){
  pushNav(() => renderSuggestionsAdminPage());
  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>${pageTitle('suggestions_admin','💡 مقترحات العملاء لتطوير الموقع')}</div>${adminNavButtonsHtml()}</div>
    <div id="suggestionsListWrap">جارٍ التحميل...</div>
  </div>`;
  wireAdminNavButtons();

  const res = await apiGet('/suggestions_admin_list.php');
  const wrap = document.getElementById('suggestionsListWrap');
  if (!res || !res.success) {
    wrap.innerHTML = `<div class="error">${(res&&res.message)||'حصل خطأ في تحميل المقترحات — تأكد إنك شغّلت update_schema_25_suggestions.sql على قاعدة البيانات.'}</div>`;
    return;
  }
  const suggestions = res.suggestions;
  if (!suggestions.length) {
    wrap.innerHTML = '<p style="color:#888;font-size:13px;">لسه معندناش أي اقتراحات من العملاء.</p>';
    return;
  }

  function statusLabel(st){ return st==='reviewed' ? 'تمت المراجعة' : 'جديد'; }
  function suggestionCardsHtml(list){
    return list.map(s => `
    <div class="section-card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
        <div><strong>${escapeHtml(s.email)}</strong> <span style="color:#888;font-size:11.5px;">— ${formatDateTimeAr(s.createdAt)}</span></div>
        <span class="tag ${s.status==='reviewed'?'tag-done':'tag-next'}">${statusLabel(s.status)}</span>
      </div>
      <p style="font-size:13px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(s.message)}</p>
      ${s.attachment ? (
        s.attachmentType && s.attachmentType.startsWith('image/')
          ? `<img src="${escapeHtml(s.attachment)}" style="max-width:260px;border-radius:8px;margin-top:8px;display:block;">`
          : `<a href="${escapeHtml(s.attachment)}" download="${escapeHtml(s.attachmentName||'مرفق.pdf')}" style="display:inline-block;margin-top:8px;">📎 تحميل المرفق (${escapeHtml(s.attachmentName||'ملف')})</a>`
      ) : ''}
      <div class="topbar" style="margin-top:10px;">
        ${s.status!=='reviewed' ? `<button class="small secondary" onclick="window.__suggestionMarkReviewed(${s.id})">✅ وضع علامة "تمت المراجعة"</button>` : ''}
        <button class="small danger" onclick="window.__suggestionDelete(${s.id})">حذف</button>
      </div>
    </div>`).join('');
  }

  wrap.innerHTML = `<div class="std-filter-bar">
    <div class="std-filter-search"><input type="text" id="suggestionsSearch" placeholder="🔍 ابحث بالإيميل أو نص الاقتراح..."></div>
    <div class="std-filter-tabs">
      <button type="button" class="small secondary std-filter-tab btn-active" data-status="all">الكل</button>
      <button type="button" class="small secondary std-filter-tab" data-status="new">جديد</button>
      <button type="button" class="small secondary std-filter-tab" data-status="reviewed">تمت المراجعة</button>
    </div>
  </div>
  <div id="suggestionsCardsWrap"></div>`;

  function renderSuggestionCards(){
    const q = (document.getElementById('suggestionsSearch')?.value || '').trim().toLowerCase();
    const activeTab = document.querySelector('#suggestionsListWrap .std-filter-tab.btn-active');
    const statusFilter = activeTab ? activeTab.dataset.status : 'all';
    const visible = suggestions.filter(s => {
      const matchesQ = !q || (s.email||'').toLowerCase().includes(q) || (s.message||'').toLowerCase().includes(q);
      const matchesStatus = statusFilter==='all' || (statusFilter==='reviewed' ? s.status==='reviewed' : s.status!=='reviewed');
      return matchesQ && matchesStatus;
    });
    document.getElementById('suggestionsCardsWrap').innerHTML = visible.length ? suggestionCardsHtml(visible) : '<p class="std-filter-empty">مفيش اقتراحات مطابقة</p>';
  }
  document.getElementById('suggestionsSearch').addEventListener('input', renderSuggestionCards);
  document.querySelectorAll('#suggestionsListWrap .std-filter-tab').forEach(tab=>{
    tab.onclick = () => {
      document.querySelectorAll('#suggestionsListWrap .std-filter-tab').forEach(t=>t.classList.remove('btn-active'));
      tab.classList.add('btn-active');
      renderSuggestionCards();
    };
  });
  renderSuggestionCards();

  window.__suggestionMarkReviewed = async (id) => {
    await apiPost('/suggestion_admin_update.php', { id, action: 'markReviewed' });
    renderSuggestionsAdminPage();
  };
  window.__suggestionDelete = async (id) => {
    if (!await gConfirm('متأكد إنك عايز تحذف الاقتراح ده؟')) return;
    await apiPost('/suggestion_admin_update.php', { id, action: 'delete' });
    renderSuggestionsAdminPage();
  };
}

/* ================== قائمة الخطط: قسم "تقرير سهم" (بحث + طباعة + تصدير) ==================
   نفس فكرة "تقرير سهم أو أكتر" في شاشة ملخص المحفظة بالظبط (قائمة منسدلة قابلة للبحث
   والفلترة بدل قائمة كروت مفتوحة طول الوقت، عشان لو عندك 100 خطة الشاشة متكبرش) - لكن
   هنا للـ DCA بس (نفس نوع الخطط اللي في الشاشة دي)، وبيستخدم نفس دوال الحساب العامة
   (computeAggregates / buildStockTransactionRows / buildCumulativeProfitPoints) اللي
   شاشة ملخص المحفظة بتستخدمها، عشان الأرقام تفضل متطابقة مع بعض دايمًا. */
function renderDacStockReportSectionHtml(plans, symbols){
  const allEntries = symbols.map(s=>({key:s, sym:s, type:'DCA'}));
  const agg = computeAggregates(plans, {}, allEntries, null, null);
  return `
    <h2 style="margin-top:24px;">تقرير سهم</h2>
    <div class="section-card">
      <div class="std-filter-daterow">
        <div><label>من تاريخ</label><input type="date" id="dacRptFrom"></div>
        <div><label>إلى تاريخ</label><input type="date" id="dacRptTo"></div>
      </div>
      <label style="display:block;margin-top:10px;">اختر الأسهم للتقرير (مفتوحة أو مقفولة)</label>
      <div class="ms-dropdown" id="dacRptMsDropdown">
        <button type="button" class="ms-toggle" id="dacRptMsToggleBtn">اختر الأسهم ▾</button>
        <div class="ms-panel" id="dacRptMsPanel" style="display:none;">
          <div class="std-filter-search" style="margin-bottom:8px;"><input type="text" id="dacRptSymSearchInput" placeholder="ابحث باسم السهم..."></div>
          <div class="std-filter-tabs" style="margin-bottom:8px;">
            <button type="button" class="small secondary dacRptStatusFilterBtn std-filter-tab btn-active" data-status="all">الكل</button>
            <button type="button" class="small secondary dacRptStatusFilterBtn std-filter-tab" data-status="مفتوحة">مفتوحة فقط</button>
            <button type="button" class="small secondary dacRptStatusFilterBtn std-filter-tab" data-status="مغلقة">مغلقة فقط</button>
          </div>
          <label class="ms-item ms-all"><input type="checkbox" id="dacRptSelectAll"> تحديد كل الأسهم</label>
          <div class="ms-sep"></div>
          <div id="dacRptSymbolChecks">
            ${agg.stockRows.map(r=>`<label class="ms-item" data-sym="${r.symbol.toLowerCase()}" data-status="${r.status}"><input type="checkbox" class="dacRptSymCheck" value="${escapeHtml(r.symbol)}"> ${escapeHtml(r.symbol)} <span style="color:#888;font-size:11px;">${r.status}</span></label>`).join('')}
          </div>
          <div id="dacRptSymNoMatch" style="display:none;font-size:12px;color:#888;padding:8px;text-align:center;">مفيش أسهم مطابقة</div>
          <button type="button" class="small" id="dacRptMsDoneBtn" style="width:100%;margin-top:8px;">تم</button>
        </div>
      </div>
      <button id="dacRptPrintBtn" style="margin-top:14px;">🖨 إصدار تقرير PDF للأسهم المحددة</button>
      <button id="dacRptExportXlsBtn" class="secondary">⬇ تصدير التقرير Excel</button>
      <div style="font-size:11.5px;color:#888;margin-top:6px;">تقدر تختار سهم واحد أو أكتر أو كل الأسهم (مفتوحة أو مقفولة) — سيب "من/إلى تاريخ" فاضيين لتقرير عن كل الفترة المتاحة.</div>
    </div>`;
}

function wireDacStockReportSection(plans, symbols){
  const allEntries = symbols.map(s=>({key:s, sym:s, type:'DCA'}));

  function updateDacRptToggleLabel(){
    const checked = Array.from(document.querySelectorAll('.dacRptSymCheck:checked')).map(cb=>cb.value);
    const btn = document.getElementById('dacRptMsToggleBtn');
    if(checked.length===0) btn.textContent = 'اختر الأسهم ▾';
    else if(checked.length===symbols.length) btn.textContent = `كل الأسهم (${symbols.length}) ▾`;
    else if(checked.length<=3) btn.textContent = checked.join('، ') + ' ▾';
    else btn.textContent = `${checked.length} أسهم مختارة ▾`;
  }

  document.getElementById('dacRptMsToggleBtn').onclick = (e) => {
    e.stopPropagation();
    const panel = document.getElementById('dacRptMsPanel');
    panel.style.display = panel.style.display==='none' ? 'block' : 'none';
  };
  document.getElementById('dacRptMsDoneBtn').onclick = () => { document.getElementById('dacRptMsPanel').style.display = 'none'; };
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('dacRptMsDropdown');
    if (dd && !dd.contains(e.target)) document.getElementById('dacRptMsPanel').style.display = 'none';
  });

  document.getElementById('dacRptSelectAll').addEventListener('change', (e)=>{
    document.querySelectorAll('.dacRptSymCheck').forEach(cb=>{ cb.checked = e.target.checked; });
    updateDacRptToggleLabel();
  });
  document.querySelectorAll('.dacRptSymCheck').forEach(cb=>{
    cb.addEventListener('change', updateDacRptToggleLabel);
  });

  function filterDacRptSymList(){
    const q = document.getElementById('dacRptSymSearchInput').value.trim().toLowerCase();
    const statusFilter = document.querySelector('.dacRptStatusFilterBtn.btn-active').dataset.status;
    let anyVisible = false;
    document.querySelectorAll('#dacRptSymbolChecks .ms-item').forEach(item=>{
      const matchesSym = !q || item.dataset.sym.includes(q);
      const matchesStatus = statusFilter === 'all' || item.dataset.status === statusFilter;
      const show = matchesSym && matchesStatus;
      item.style.display = show ? '' : 'none';
      if (show) anyVisible = true;
    });
    document.getElementById('dacRptSymNoMatch').style.display = anyVisible ? 'none' : 'block';
  }
  document.getElementById('dacRptSymSearchInput').addEventListener('input', filterDacRptSymList);
  document.querySelectorAll('.dacRptStatusFilterBtn').forEach(btn=>{
    btn.onclick = () => {
      document.querySelectorAll('.dacRptStatusFilterBtn').forEach(b=>b.classList.remove('btn-active'));
      btn.classList.add('btn-active');
      filterDacRptSymList();
    };
  });

  function buildDacReportDetailSections(selectedSyms, from, to){
    let sections = '';
    selectedSyms.forEach(sym=>{
      const p = plans[sym];
      const { rowsHtml, hasAny } = buildStockTransactionRows(p, from, to);
      sections += `<h2 style="color:#14532d;margin-top:26px;border-top:2px solid #eee;padding-top:16px;">تفاصيل عمليات: ${sym} (DCA — ${p.market||''} - ${p.currency||''})</h2>
      <table><thead><tr><th>التاريخ</th><th>العملية</th><th>المستوى</th><th>الكمية</th><th>السعر</th><th>الربح</th></tr></thead>
      <tbody>${hasAny ? rowsHtml : '<tr><td colspan="6">لا يوجد عمليات في هذه الفترة</td></tr>'}</tbody></table>`;
    });
    return sections;
  }

  document.getElementById('dacRptPrintBtn').onclick = () => {
    const selectedSyms = Array.from(document.querySelectorAll('.dacRptSymCheck:checked')).map(cb=>cb.value);
    if(selectedSyms.length===0){ alert('اختار سهم واحد على الأقل'); return; }
    const from = document.getElementById('dacRptFrom').value || null;
    const to = document.getElementById('dacRptTo').value || null;

    const reportAgg = computeAggregates(plans, {}, allEntries, from, to, selectedSyms);
    const combinedPoints = buildCumulativeProfitPoints(plans, from, to, selectedSyms, null);
    const groupLabel = selectedSyms.length===symbols.length ? 'كل الأسهم' : reportAgg.stockRows.map(r=>r.symbol).join('، ');
    const chartImg = renderCumulativeProfitChart(combinedPoints, 'الربح التراكمي — ' + groupLabel);
    const periodLabel = (from && to) ? `${formatDateAr(from)} إلى ${formatDateAr(to)}` : 'كل الفترة المتاحة';
    const detailSections = buildDacReportDetailSections(selectedSyms, from, to);

    const rowsHtml = reportAgg.stockRows.map(r=>`<tr>
      <td>${escapeHtml(r.symbol)}</td><td>${r.status}</td>
      <td>${fmt2(r.invested)}</td><td>${r.currentValue?fmt2(r.currentValue):'-'}</td>
      <td>${r.dropPercent!=null?r.dropPercent.toFixed(2)+'%':'-'}</td>
      <td>${fmt2(r.unrealized)}</td><td>${fmt2(r.realized)}</td>
      <td>${r.closedCount}</td><td>${fmt2(r.closedProfit)}</td>
    </tr>`).join('');

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير أسهم</title>
      <style>body{font-family:Tahoma,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin-top:8px;}
      th,td{border:1px solid #ccc;padding:6px;text-align:center;font-size:12px;} th{background:#14532d;color:#fff;}
      h1{color:#14532d;} .agg{margin-top:16px;font-size:14px;background:#f0f4f2;padding:12px;border-radius:8px;}
      .indicators{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;}
      .indicators div{flex:1;min-width:150px;background:#f8faf9;border:1px solid #e7ebe9;border-radius:8px;padding:10px;text-align:center;}
      .indicators .v{font-size:16px;font-weight:bold;color:#14532d;} .indicators .l{font-size:11px;color:#888;margin-top:3px;}
      img{max-width:100%;margin-top:16px;}</style></head>
      <body>
      ${reportLogoHeaderHtml()}
      <h1>GRIFFINE — تقرير أسهم وخطط: ${groupLabel}</h1>
      <p>الفترة: ${periodLabel} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>

      <div class="indicators">
        <div><div class="v">${fmt2(reportAgg.grandTotalInvestedEver)}</div><div class="l">كم استثمرت (${groupLabel})</div></div>
        <div><div class="v">${fmt2(reportAgg.grandTotalProfit)}</div><div class="l">كم ربحت أو خسرت</div></div>
        <div><div class="v">${reportAgg.overallProfitPercent.toFixed(2)}%</div><div class="l">نسبة الربح/الخسارة</div></div>
        <div><div class="v" style="font-size:12px;">${periodLabel}</div><div class="l">فترة التقرير</div></div>
      </div>

      <img src="${chartImg}" width="720" height="300">

      <table><thead><tr>
        <th>السهم</th><th>الحالة</th><th>المستثمر</th><th>القيمة الحالية</th><th>الانخفاض</th>
        <th>ربح غير محقق</th><th>ربح محقق</th><th>صفقات مغلقة</th><th>ربح الصفقات المغلقة</th>
      </tr></thead><tbody>
        ${rowsHtml}
        <tr style="font-weight:bold;background:#eef6f2;">
          <td>الإجمالي</td><td></td>
          <td>${fmt2(reportAgg.totalInvested)}</td><td>${fmt2(reportAgg.totalCurrentValue)}</td>
          <td>${reportAgg.avgDropRate!=null?reportAgg.avgDropRate.toFixed(2)+'%':'-'}</td>
          <td>${fmt2(reportAgg.totalUnrealized)}</td><td>${fmt2(reportAgg.totalRealized)}</td>
          <td>${reportAgg.totalClosedTradesCount}</td><td>${fmt2(reportAgg.totalClosedProfit)}</td>
        </tr>
      </tbody></table>

      ${detailSections}

      <script>window.onload = () => window.print();<\/script>
      </body></html>`);
    w.document.close();
  };

  document.getElementById('dacRptExportXlsBtn').onclick = () => {
    const selectedSyms = Array.from(document.querySelectorAll('.dacRptSymCheck:checked')).map(cb=>cb.value);
    if(selectedSyms.length===0){ alert('اختار سهم واحد على الأقل'); return; }
    const from = document.getElementById('dacRptFrom').value || null;
    const to = document.getElementById('dacRptTo').value || null;

    const reportAgg = computeAggregates(plans, {}, allEntries, from, to, selectedSyms);
    const combinedPoints = buildCumulativeProfitPoints(plans, from, to, selectedSyms, null);
    const groupLabel = selectedSyms.length===symbols.length ? 'كل الأسهم' : reportAgg.stockRows.map(r=>r.symbol).join('، ');
    const chartImg = renderCumulativeProfitChart(combinedPoints, 'الربح التراكمي — ' + groupLabel);
    const periodLabel = (from && to) ? `${formatDateAr(from)} إلى ${formatDateAr(to)}` : 'كل الفترة المتاحة';

    const th = "background:#14532D;color:#ffffff;font-weight:bold;border:1px solid #000000;padding:6px 10px;text-align:center;";
    const td = "border:1px solid #999999;padding:5px 10px;text-align:center;";
    const totalTd = "border:1px solid #000000;padding:6px 10px;text-align:center;font-weight:bold;background:#E6F4EA;";
    const titleTd = "background:#14532D;color:#ffffff;font-weight:bold;font-size:16px;padding:10px;text-align:center;";

    let body = `<table><tr><td colspan="9" style="${titleTd}">GRIFFINE — تقرير أسهم وخطط: ${groupLabel}</td></tr>
      <tr><td colspan="9" style="${td}">الفترة: ${periodLabel} | تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}</td></tr>
      <tr><td style="${th}">السهم</td><td style="${th}">الحالة</td><td style="${th}">المستثمر</td><td style="${th}">القيمة الحالية</td>
      <td style="${th}">الانخفاض</td><td style="${th}">ربح غير محقق</td><td style="${th}">ربح محقق</td>
      <td style="${th}">صفقات مغلقة</td><td style="${th}">ربح الصفقات المغلقة</td></tr>`;
    reportAgg.stockRows.forEach(r=>{
      body += `<tr><td style="${td}">${escapeHtml(r.symbol)}</td><td style="${td}">${r.status}</td>
        <td style="${td}">${fmt2(r.invested)}</td><td style="${td}">${r.currentValue?fmt2(r.currentValue):'-'}</td>
        <td style="${td}">${r.dropPercent!=null?r.dropPercent.toFixed(2)+'%':'-'}</td>
        <td style="${td}">${fmt2(r.unrealized)}</td><td style="${td}">${fmt2(r.realized)}</td>
        <td style="${td}">${r.closedCount}</td><td style="${td}">${fmt2(r.closedProfit)}</td></tr>`;
    });
    body += `<tr><td style="${totalTd}">الإجمالي</td><td style="${totalTd}"></td>
      <td style="${totalTd}">${fmt2(reportAgg.totalInvested)}</td><td style="${totalTd}">${fmt2(reportAgg.totalCurrentValue)}</td>
      <td style="${totalTd}">${reportAgg.avgDropRate!=null?reportAgg.avgDropRate.toFixed(2)+'%':'-'}</td>
      <td style="${totalTd}">${fmt2(reportAgg.totalUnrealized)}</td><td style="${totalTd}">${fmt2(reportAgg.totalRealized)}</td>
      <td style="${totalTd}">${reportAgg.totalClosedTradesCount}</td><td style="${totalTd}">${fmt2(reportAgg.totalClosedProfit)}</td></tr>
      </table>`;

    selectedSyms.forEach(sym=>{
      const p = plans[sym];
      const { rowsHtml, hasAny } = buildStockTransactionRows(p, from, to);
      body += `<table style="margin-top:20px;"><tr><td colspan="6" style="${titleTd}">تفاصيل عمليات: ${sym} (DCA)</td></tr>
        <tr><td style="${th}">التاريخ</td><td style="${th}">العملية</td><td style="${th}">المستوى</td><td style="${th}">الكمية</td><td style="${th}">السعر</td><td style="${th}">الربح</td></tr>
        ${hasAny ? rowsHtml.replace(/<td>/g, `<td style="${td}">`) : `<tr><td colspan="6" style="${td}">لا يوجد عمليات في هذه الفترة</td></tr>`}
        </table>`;
    });

    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>تقرير أسهم</x:Name><x:WorksheetOptions><x:RTL/><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml></head><body dir="rtl">${body}</body></html>`;
    buildAndDownloadMhtmlXls(html, chartImg, `griffine_تقرير_أسهم_وخطط.xls`);
  };
}

/* ================== قائمة الخطط ================== */
async function renderPlansList(){
  pushNav(() => renderPlansList());
  setBottomNavActive('plans');
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;
  const plans = await getPlans(email);
  const symbols = Object.keys(plans);

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${email}</strong></div></div>
    <button class="secondary small" id="homeBtn" style="width:auto;">🏠 الشاشة الرئيسية</button>
    <button id="newPlanBtn">+ خطة جديدة لسهم</button>
    <h2>${pageTitle('plans_list','خططك الحالية (سهم لكل خطة)')}</h2>
    ${symbols.length>0 ? `<div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="dacListSearch" placeholder="🔍 ابحث باسم السهم..."></div>
      <div class="std-filter-tabs">
        <button type="button" class="small secondary dacListFilterBtn std-filter-tab btn-active" data-status="all">الكل</button>
        <button type="button" class="small secondary dacListFilterBtn std-filter-tab" data-status="مفتوحة">مفتوحة فقط</button>
        <button type="button" class="small secondary dacListFilterBtn std-filter-tab" data-status="مقفولة">مقفولة فقط</button>
      </div>
    </div>` : ''}
    <div id="plansListArea" class="plans-list-scroll"></div>
    <div class="std-filter-empty" id="dacListEmpty" style="display:none;">مفيش خطط مطابقة للبحث/الفلتر</div>
    ${symbols.length>0 ? renderDacStockReportSectionHtml(plans, symbols) : ''}
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();
  document.getElementById('newPlanBtn').onclick=()=>renderNewPlanForm();
  if (symbols.length>0) wireDacStockReportSection(plans, symbols);

  const listArea = document.getElementById('plansListArea');
  if(symbols.length===0){
    listArea.innerHTML = `<p style="color:#888;font-size:13px;">لا يوجد خطط بعد. ابدأ بإنشاء خطة جديدة.</p>`;
  } else {
    listArea.innerHTML = symbols.map(sym=>{
      const p = plans[sym];
      if(!p.closedTrades) p.closedTrades=[];
      const sim = simulatePlan(p);
      const doneCount = p.levels.filter(l=>l.executed).length;
      // نفس المعيار بالظبط المستخدم في "ملخص المحفظة": الخطة "مقفولة" لو مفيش عندها
      // كمية محتفظ بيها دلوقتي (heldQty=0) وعندها صفقات مغلقة قبل كده - مش مجرد إن
      // الدورة الحالية لسه مبتداش (كان ده سبب ظهور ABUK/FAWRY كـ"مفتوحة" غلط رغم إنهم
      // مقفولين فعليًا وموجودين كده في تقرير المحفظة)
      const isOpenPosition = sim.heldQty > 0;
      const isActuallyClosed = !isOpenPosition && p.closedTrades.length > 0;
      const statusKey = isActuallyClosed ? 'مقفولة' : 'مفتوحة';
      return `<div class="plan-list-item" data-sym="${sym}" data-q="${sym.toLowerCase()}" data-status="${statusKey}">
        <div><strong>${sym}</strong><div style="font-size:11px;color:#888;">${doneCount}/${p.levels.length} مستويات — ${isActuallyClosed?'مقفولة ✅':'مفتوحة'} — ${p.market||''} — ${p.currency||''}</div></div>
        <div style="display:flex;align-items:center;gap:10px;">
          <button class="small secondary" style="width:auto;margin:0;" onclick="event.stopPropagation(); window.__editDacPlanFromList('${sym}')">⚙️ تعديل الخطة</button>
          <span>&#8250;</span>
        </div>
      </div>`;
    }).join('');
    listArea.querySelectorAll('.plan-list-item').forEach(el=>{
      el.onclick=()=>renderPlanDetail(el.dataset.sym);
    });
    window.__editDacPlanFromList = (sym) => renderEditPlanSettings(sym);

    // فلتر البحث + حالة الخطة (مفتوحة/مقفولة) - نفس الأسلوب اليدوي المستخدم في
    // شاشة "ملخص المحفظة" (تقرير سهم أو أكتر) لأنه مضبوط ومختبر ويشتغل صح
    function filterDacPlansList(){
      const q = document.getElementById('dacListSearch').value.trim().toLowerCase();
      const activeBtn = document.querySelector('.dacListFilterBtn.btn-active');
      const statusFilter = activeBtn ? activeBtn.dataset.status : 'all';
      let anyVisible = false;
      document.querySelectorAll('#plansListArea .plan-list-item').forEach(item=>{
        const matchesQ = !q || (item.dataset.q||'').includes(q);
        const matchesStatus = statusFilter==='all' || item.dataset.status===statusFilter;
        const show = matchesQ && matchesStatus;
        item.style.display = show ? '' : 'none';
        if (show) anyVisible = true;
      });
      document.getElementById('dacListEmpty').style.display = anyVisible ? 'none' : '';
    }
    document.getElementById('dacListSearch').addEventListener('input', filterDacPlansList);
    document.querySelectorAll('.dacListFilterBtn').forEach(btn=>{
      btn.onclick = () => {
        document.querySelectorAll('.dacListFilterBtn').forEach(b=>b.classList.remove('btn-active'));
        btn.classList.add('btn-active');
        filterDacPlansList();
      };
    });
  }
}

/* ================== ملخص المحفظة (كل الأسهم مجمّعة) ================== */
/* ================== ملخص المحفظة (كل الأسهم مجمّعة) ================== */

/* رسم شارت خطي بسيط (Canvas) لنسبة الربح التراكمية عبر الوقت - يرجع Data URL صورة PNG */
function renderCumulativeProfitChart(points, title){
  const canvas = document.createElement('canvas');
  canvas.width = 760; canvas.height = 300;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);

  const padL=55, padR=20, padT=30, padB=40;
  const w = canvas.width-padL-padR, h = canvas.height-padT-padB;

  ctx.fillStyle = '#14532d'; ctx.font = 'bold 14px Tahoma';
  ctx.fillText(title || 'الربح التراكمي', padL, 20);

  if (!points || points.length===0) {
    ctx.fillStyle = '#999'; ctx.font = '13px Tahoma';
    ctx.fillText('لا يوجد بيانات كافية لعرض الشارت في هذه الفترة', padL, padT+h/2);
    return canvas.toDataURL('image/png');
  }

  const values = points.map(p=>p.value);
  let minV = Math.min(0, ...values), maxV = Math.max(0, ...values);
  if (minV===maxV) { minV -= 1; maxV += 1; }
  const rangePad = (maxV-minV)*0.1 || 1;
  minV -= rangePad; maxV += rangePad;

  const xFor = i => padL + (points.length>1 ? (i/(points.length-1))*w : w/2);
  const yFor = v => padT + h - ((v-minV)/(maxV-minV))*h;

  // خط الصفر
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padL, yFor(0)); ctx.lineTo(padL+w, yFor(0)); ctx.stroke();
  ctx.fillStyle = '#888'; ctx.font = '10px Tahoma';
  ctx.fillText('0', 5, yFor(0)+3);
  ctx.fillText(maxV.toFixed(0), 5, padT+3);
  ctx.fillText(minV.toFixed(0), 5, padT+h);

  // المنحنى
  ctx.strokeStyle = '#1b8a5a'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  points.forEach((p,i)=>{ const x=xFor(i), y=yFor(p.value); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke();

  // نقاط
  ctx.fillStyle = '#14532d';
  points.forEach((p,i)=>{ const x=xFor(i), y=yFor(p.value); ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill(); });

  // تواريخ أول ونص وآخر نقطة
  ctx.fillStyle = '#666'; ctx.font = '10px Tahoma';
  if(points.length>0) ctx.fillText(points[0].label, padL-10, canvas.height-15);
  if(points.length>1) ctx.fillText(points[points.length-1].label, padL+w-40, canvas.height-15);
  if(points.length>2) ctx.fillText(points[Math.floor(points.length/2)].label, padL+w/2-20, canvas.height-15);

  return canvas.toDataURL('image/png');
}

/* يبني نقاط الشارت (نسبة ربح تراكمية %) من الصفقات المغلقة عبر كل الأسهم، مفلترة بفترة معينة */
/* يبني صفوف تفاصيل كل عمليات سهم معيّن (شراء/بيع/إغلاق صفقة) خلال فترة معينة - بترجع {rowsHtml, hasAny, periodProfit} */
function buildStockTransactionRows(p, from, to){
  const inRange = (dateStr) => (!from || !to) ? true : (dateStr && dateOnly(dateStr)>=from && dateOnly(dateStr)<=to);
  let rowsHtml = '', hasAny = false, periodProfit = 0;
  p.levels.forEach(lv=>{
    if(lv.executed && inRange(lv.execDate)){
      hasAny = true;
      rowsHtml += `<tr><td>${formatDateAr(lv.execDate)}</td><td>شراء</td><td>مستوى ${lv.level}</td><td>${lv.actualQty}</td><td>${fmt2(lv.actualPrice)}</td><td>-</td></tr>`;
    }
    (lv.sells||[]).forEach(s=>{
      if(inRange(s.date)){
        hasAny = true;
        rowsHtml += `<tr><td>${formatDateAr(s.date)}</td><td>بيع</td><td>مستوى ${lv.level}</td><td>${s.qty}</td><td>${fmt2(s.price)}</td><td>${fmt2(s.profit)}</td></tr>`;
      }
    });
  });
  (p.closedTrades||[]).forEach(ct=>{
    if(inRange(ct.closedDate)){
      hasAny = true;
      periodProfit += ct.profit;
      rowsHtml += `<tr style="font-weight:bold;background:#f0f4f2;"><td>${formatDateAr(ct.closedDate)}</td><td>إغلاق صفقة</td><td>-</td><td>${fmtQty(ct.totalQty)}</td><td>${fmt2(ct.avgEntry)} → ${fmt2(ct.avgExit)}</td><td>${fmt2(ct.profit)}</td></tr>`;
    }
  });
  return { rowsHtml, hasAny, periodProfit };
}

// نفس شكل buildStockTransactionRows بالظبط، بس لبيانات خطة شبكة (Grid) - الحالات المشتراة حاليًا + الدورات المكتملة (شراء+بيع)
function buildGridTransactionRows(g, from, to){
  const inRange = (dateStr) => (!from || !to) ? true : (dateStr && dateOnly(dateStr)>=from && dateOnly(dateStr)<=to);
  let rowsHtml = '', hasAny = false, periodProfit = 0;
  g.levels.forEach(lv=>{
    if(lv.status==='bought' && lv.executedDate && inRange(lv.executedDate)){
      hasAny = true;
      rowsHtml += `<tr><td>${formatDateAr(lv.executedDate)}</td><td>شراء (مفتوح)</td><td>${lv.plannedPrice}</td><td>${lv.executedQty}</td><td>${fmt2(lv.executedPrice)}</td><td>-</td></tr>`;
    }
  });
  (g.cycleHistory||[]).forEach(c=>{
    if(inRange(c.date)){
      hasAny = true;
      periodProfit += c.profit;
      rowsHtml += `<tr style="font-weight:bold;background:#f0f4f2;"><td>${formatDateAr(c.date)}</td><td>دورة مكتملة (شراء ثم بيع)</td><td>-</td><td>-</td><td>-</td><td>${fmt2(c.profit)}</td></tr>`;
    }
  });
  (g.manualExits||[]).forEach(m=>{
    if(inRange(m.date)){
      hasAny = true;
      rowsHtml += `<tr><td>${formatDateAr(m.date)}</td><td>بيع يدوي (خارج الاستراتيجية)</td><td>-</td><td>${m.qty}</td><td>${fmt2(m.price)}</td><td>-</td></tr>`;
    }
  });
  return { rowsHtml, hasAny, periodProfit };
}

function buildCumulativeProfitPoints(plans, from, to, onlySymbols, grids){
  const events = [];
  const symbolsToUse = onlySymbols || Object.keys(plans);
  symbolsToUse.forEach(sym=>{
    if(!plans[sym]) return;
    (plans[sym].closedTrades||[]).forEach(ct=>{
      if((!from || dateOnly(ct.closedDate)>=from) && (!to || dateOnly(ct.closedDate)<=to)){
        events.push({ date: ct.closedDate, profit: ct.profit });
      }
    });
  });
  if (grids) {
    const gridSymbolsToUse = onlySymbols || Object.keys(grids);
    gridSymbolsToUse.forEach(sym=>{
      if(!grids[sym]) return;
      (grids[sym].cycleHistory||[]).forEach(c=>{
        if((!from || dateOnly(c.date)>=from) && (!to || dateOnly(c.date)<=to)){
          events.push({ date: c.date, profit: c.profit });
        }
      });
    });
  }
  events.sort((a,b)=> a.date<b.date? -1 : a.date>b.date?1:0);

  let cumProfit=0;
  return events.map(e=>{
    cumProfit += e.profit;
    return { date: e.date, label: formatDateAr(e.date), value: cumProfit };
  });
}

// عام (مش مقصور على شاشة ملخص المحفظة) عشان أي شاشة تانية (زي "الأسهم والخطط") تقدر
// تستخدم بالظبط نفس حساب الإجماليات وحالة كل سهم (مفتوحة/مغلقة/جديدة) من غير ما تكرر
// نفس المنطق في نسخة تانية ممكن تختلف عنه بالغلط زي ما حصل قبل كده
const MARKET_TO_CURRENCY_MAP = { 'مصر':'جنيه مصري', 'السعودية':'ريال سعودي', 'الإمارات':'درهم إماراتي', 'قطر':'ريال قطري', 'الكويت':'دينار كويتي' };

function computeAggregates(plans, grids, allEntries, from, to, onlyKeys){
  let totalInvested = 0, totalCurrentValue = 0, totalUnrealized = 0, totalRealized = 0;
  let totalClosedTradesCount = 0, totalClosedCapital = 0, totalClosedProfit = 0;
  let dropSum = 0, dropCount = 0;
  let earliestDate = null;
  const stockRows = [];
  const entriesToUse = onlyKeys ? allEntries.filter(e=>onlyKeys.includes(e.key)) : allEntries;

  entriesToUse.forEach(entry=>{
    if (entry.type === 'DCA') {
      const sym = entry.sym;
      const p = plans[sym];
      if(!p.closedTrades) p.closedTrades = [];
      const sim = simulatePlan(p);
      const isOpenPosition = sim.heldQty > 0;
      const lastPrice = (p.manualLastPrice>0) ? p.manualLastPrice : sim.lastBoughtPrice;
      const currentValue = (isOpenPosition && lastPrice!=null) ? sim.heldQty*lastPrice : 0;
      const unrealized = (isOpenPosition && lastPrice!=null && sim.avgCostCurrent!=null) ? (lastPrice-sim.avgCostCurrent)*sim.heldQty : 0;
      const dropPercent = (isOpenPosition && lastPrice!=null && sim.avgCostCurrent>0) ? ((lastPrice-sim.avgCostCurrent)/sim.avgCostCurrent*100) : null;

      totalInvested += sim.totalBuyAmountSpent;
      totalCurrentValue += currentValue;
      totalUnrealized += unrealized;
      totalRealized += sim.totalRealizedProfit;
      if(dropPercent!=null){ dropSum += dropPercent; dropCount++; }
      if(p.startDate && (!earliestDate || p.startDate<earliestDate)) earliestDate = p.startDate;

      const closedInRange = (p.closedTrades||[]).filter(ct => (!from || dateOnly(ct.closedDate)>=from) && (!to || dateOnly(ct.closedDate)<=to));
      const closedAgg = closedInRange.reduce((acc,ct)=>({capital:acc.capital+ct.capitalUsed, profit:acc.profit+ct.profit}), {capital:0, profit:0});
      totalClosedTradesCount += closedInRange.length;
      totalClosedCapital += closedAgg.capital;
      totalClosedProfit += closedAgg.profit;

      stockRows.push({
        symbol: sym, planType: 'DCA', market: p.market||'', currency: p.currency||'',
        status: isOpenPosition ? 'مفتوحة' : (p.closedTrades.length ? 'مغلقة' : 'جديدة'),
        invested: sim.totalBuyAmountSpent, currentValue, dropPercent,
        unrealized, realized: sim.totalRealizedProfit,
        closedCount: closedInRange.length, closedProfit: closedAgg.profit
      });
    } else {
      // خطة شبكة (Grid)
      const sym = entry.sym;
      const g = grids[sym];
      if (!g.cycleHistory) g.cycleHistory = [];
      const boughtLevels = g.levels.filter(l=>l.status==='bought');
      const isOpenPosition = boughtLevels.length > 0;
      const invested = boughtLevels.reduce((s,l)=>s+(l.executedQty*l.executedPrice), 0);
      // مفيش تتبع سعر حي لخطط الشبكة على مستوى المحفظة - القيمة الحالية بتتساوى بالمستثمر (تحفظي، من غير افتراض ربح/خسارة غير محققة)
      const currentValue = invested;
      const unrealized = 0;
      const dropPercent = null;

      totalInvested += invested;
      totalCurrentValue += currentValue;
      if(g.createdAt){ const d = g.createdAt.split('T')[0]; if(!earliestDate || d<earliestDate) earliestDate = d; }

      const closedInRange = (g.cycleHistory||[]).filter(c => (!from || dateOnly(c.date)>=from) && (!to || dateOnly(c.date)<=to));
      const closedProfitSum = closedInRange.reduce((s,c)=>s+c.profit, 0);
      totalClosedTradesCount += closedInRange.length;
      totalClosedProfit += closedProfitSum;

      stockRows.push({
        symbol: sym, planType: 'Grid', market: g.market||'', currency: MARKET_TO_CURRENCY_MAP[g.market]||'',
        status: isOpenPosition ? 'مفتوحة' : (g.cycleHistory.length ? 'مغلقة' : 'جديدة'),
        invested, currentValue, dropPercent,
        unrealized, realized: 0,
        closedCount: closedInRange.length, closedProfit: closedProfitSum
      });
    }
  });

  const grandTotalProfit = totalUnrealized + totalRealized + totalClosedProfit;
  const grandTotalInvestedEver = totalInvested + totalClosedCapital;
  const overallProfitPercent = grandTotalInvestedEver>0 ? (grandTotalProfit/grandTotalInvestedEver*100) : 0;
  const avgDropRate = dropCount>0 ? (dropSum/dropCount) : null;
  const totalOpenPositionsCount = stockRows.filter(r=>r.status==='مفتوحة').length;

  return { totalInvested, totalCurrentValue, totalUnrealized, totalRealized, totalClosedTradesCount,
    totalClosedCapital, totalClosedProfit, avgDropRate, stockRows, grandTotalProfit,
    grandTotalInvestedEver, overallProfitPercent, earliestDate, totalOpenPositionsCount };
}

async function renderPortfolio(){
  pushNav(() => renderPortfolio());
  setBottomNavActive('portfolio');
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;
  const plans = await getPlans(email);
  const symbols = Object.keys(plans);
  const grids = await getGridPlans(email);
  const gridSymbols = Object.keys(grids);
  // كل الأسهم (DCA + Grid) بمفتاح مركّب "الرمز::النوع" عشان نضمن التفرقة حتى لو نفس الرمز كان في النوعين في أوقات مختلفة
  let allEntries = [...symbols.map(s=>({key:`${s}::DCA`, sym:s, type:'DCA'})), ...gridSymbols.map(s=>({key:`${s}::Grid`, sym:s, type:'Grid'}))];

  // المحفظة بتتعرض بعملة واحدة في المرة - مينفعش نجمع جنيه على ريال في إجمالي واحد
  const ccyOf = (e) => e.type==='DCA' ? (plans[e.sym].currency || MARKET_TO_CURRENCY_MAP[plans[e.sym].market] || '—') : (MARKET_TO_CURRENCY_MAP[grids[e.sym].market] || '—');
  const ccyList = [...new Set(allEntries.map(ccyOf))].sort((a,b)=>allEntries.filter(e=>ccyOf(e)===b).length - allEntries.filter(e=>ccyOf(e)===a).length);
  let selCcy = ''; try { selCcy = localStorage.getItem('gs_ccy') || ''; } catch(e){}
  if (!ccyList.includes(selCcy)) selCcy = ccyList[0] || '';
  if (ccyList.length > 1) allEntries = allEntries.filter(e => ccyOf(e) === selCcy);
  const ccyChipsHtml = ccyList.length > 1 ? `<div class="gs-seg" style="margin-bottom:16px;">${ccyList.map(c=>`<button type="button" class="${c===selCcy?'on':''}" data-ccy="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div>` : '';

  let agg = computeAggregates(plans, grids, allEntries, null, null);

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('portfolio','📊 ملخص المحفظة')}</div>
      <div><button class="secondary small" id="goDiversificationBtn">🎯 تقرير التنويع</button> <button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button></div>
    </div>

    ${ccyChipsHtml}
    <h2>إجماليات المحفظة${ccyList.length > 1 ? ` <span style="font-size:13px;color:var(--text-muted);font-weight:600;">(${escapeHtml(selCcy)})</span>` : ''}</h2>
    <div class="summary-cards" id="topSummaryCards"></div>

    <h2 style="margin-top:20px;">كل الأسهم (مفتوحة ومغلقة)</h2>
    <div class="section-card" id="portfolioTableWrap"></div>
    ${allEntries.length ? `<div class="topbar" style="margin-top:10px;">
      <button class="small secondary" id="exportPortfolioXlsBtn">⬇ تصدير Excel</button>
      <button class="small secondary" id="exportPortfolioPdfBtn">🖨 تصدير PDF (طباعة)</button>
    </div>` : ''}

    <h2 style="margin-top:24px;">فترة العرض (تؤثر على المؤشرات والشارت وكشف الحساب)</h2>
    <div class="section-card">
      <div class="grid2">
        <div><label>من تاريخ</label><input type="date" id="stmtFrom"></div>
        <div><label>إلى تاريخ</label><input type="date" id="stmtTo"></div>
      </div>
      <div class="radio-row std-filter-tabs">
        <button class="small secondary period-preset std-filter-tab" id="presetDaily">اليوم</button>
        <button class="small secondary period-preset std-filter-tab" id="presetWeekly">آخر أسبوع</button>
        <button class="small secondary period-preset std-filter-tab" id="presetMonthly">آخر شهر</button>
        <button class="small secondary period-preset std-filter-tab btn-active" id="presetAll">كل الفترة</button>
      </div>
      <button id="printStatementBtn" class="secondary">🖨 طباعة كشف الحساب للفترة</button>
      <button id="exportStatementXlsBtn" class="secondary">⬇ تصدير كشف الحساب Excel</button>
    </div>

    <div class="section-card" id="periodIndicators"></div>

    <h2 style="margin-top:20px;">منحنى الربح التراكمي (بالمبلغ)</h2>
    <div class="section-card" style="text-align:center;">
      <img id="profitChartImg" style="max-width:100%;border-radius:8px;">
    </div>

    <h2 style="margin-top:24px;">تقرير سهم أو أكتر</h2>
    <div class="section-card">
      <label>اختر الأسهم للتقرير</label>
      <div class="ms-dropdown" id="msDropdown">
        <button type="button" class="ms-toggle" id="msToggleBtn">اختر الأسهم ▾</button>
        <div class="ms-panel" id="msPanel" style="display:none;">
          <div class="std-filter-search" style="margin-bottom:8px;"><input type="text" id="reportSymSearchInput" placeholder="ابحث باسم السهم..."></div>
          <div class="std-filter-tabs" style="margin-bottom:8px;">
            <button type="button" class="small secondary reportStatusFilterBtn std-filter-tab btn-active" data-status="all">الكل</button>
            <button type="button" class="small secondary reportStatusFilterBtn std-filter-tab" data-status="مفتوحة">مفتوحة فقط</button>
            <button type="button" class="small secondary reportStatusFilterBtn std-filter-tab" data-status="مغلقة">مغلقة فقط</button>
          </div>
          <label class="ms-item ms-all"><input type="checkbox" id="reportSelectAll"> تحديد كل الأسهم</label>
          <div class="ms-sep"></div>
          <div id="reportSymbolChecks">
            ${allEntries.map(en=>{
              const row = agg.stockRows.find(r=>r.symbol===en.sym && r.planType===en.type);
              const st = row ? row.status : '';
              return `<label class="ms-item" data-sym="${en.sym.toLowerCase()}" data-status="${st}"><input type="checkbox" class="reportSymCheck" value="${en.key}"> ${en.sym} (${en.type}) <span style="color:#888;font-size:11px;">${st}</span></label>`;
            }).join('')}
          </div>
          <div id="reportSymNoMatch" style="display:none;font-size:12px;color:#888;padding:8px;text-align:center;">مفيش أسهم مطابقة</div>
          <button type="button" class="small" id="msDoneBtn" style="width:100%;margin-top:8px;">تم</button>
        </div>
      </div>
      <button id="printStockReportBtn" style="margin-top:14px;">🖨 إصدار تقرير PDF للأسهم المحددة</button>
      <button id="exportStockReportXlsBtn" class="secondary">⬇ تصدير التقرير Excel</button>
      <div style="font-size:11.5px;color:#888;margin-top:6px;">تقدر تختار سهم واحد أو أكتر أو كل الأسهم — التقرير هيستخدم نفس الفترة (من - إلى) المحددة فوق.</div>
    </div>

    <p class="disclaimer">تنويه: الأرقام هنا مبنية على بيانات كل الأسهم المسجّلة في حسابك ولا تُعد توصية استثمارية مضمونة.</p>
  </div>`;

  document.getElementById('reportSymSearchInput').addEventListener('input', filterReportSymList);
  document.querySelectorAll('.reportStatusFilterBtn').forEach(btn=>{
    btn.onclick = () => {
      document.querySelectorAll('.reportStatusFilterBtn').forEach(b=>b.classList.remove('btn-active'));
      btn.classList.add('btn-active');
      filterReportSymList();
    };
  });
  function filterReportSymList(){
    const q = document.getElementById('reportSymSearchInput').value.trim().toLowerCase();
    const statusFilter = document.querySelector('.reportStatusFilterBtn.btn-active').dataset.status;
    let anyVisible = false;
    document.querySelectorAll('#reportSymbolChecks .ms-item').forEach(item=>{
      const matchesSym = !q || item.dataset.sym.includes(q);
      const matchesStatus = statusFilter === 'all' || item.dataset.status === statusFilter;
      const show = matchesSym && matchesStatus;
      item.style.display = show ? '' : 'none';
      if (show) anyVisible = true;
    });
    document.getElementById('reportSymNoMatch').style.display = anyVisible ? 'none' : 'block';
  }

  document.getElementById('homeBtn').onclick=()=>renderHome();
  document.getElementById('goDiversificationBtn').onclick=()=>renderDiversificationReport();
  document.querySelectorAll('[data-ccy]').forEach(b => b.onclick = () => {
    try { localStorage.setItem('gs_ccy', b.dataset.ccy); } catch(e){}
    window.__navSilent = true; try { renderPortfolio(); } finally { window.__navSilent = false; }
  });

  function renderTopSummary(a){
    document.getElementById('topSummaryCards').innerHTML = `
      <div class="summary-card"><div class="val">${fmtMoney(a.totalInvested)}</div><div class="lbl">إجمالي المبلغ المستثمر حاليًا (مراكز مفتوحة)</div></div>
      <div class="summary-card"><div class="val">${fmtMoney(a.totalCurrentValue)}</div><div class="lbl">إجمالي قيمة الاستثمار الآن</div></div>
      <div class="summary-card"><div class="val ${a.avgDropRate==null?'':(a.avgDropRate<0?'neg':'pos')}">${a.avgDropRate!=null?a.avgDropRate.toFixed(2)+'%':'-'}</div><div class="lbl">معدل الانخفاض (متوسط المراكز المفتوحة)</div></div>
      <div class="summary-card">
        <div style="display:flex;align-items:stretch;justify-content:space-around;">
          <div style="flex:1;text-align:center;"><div class="val">${a.totalOpenPositionsCount}</div><div class="lbl">صفقات مفتوحة</div></div>
          <div style="width:1px;background:var(--border);margin:2px 10px;"></div>
          <div style="flex:1;text-align:center;"><div class="val">${a.totalClosedTradesCount}</div><div class="lbl">صفقات مغلقة</div></div>
        </div>
      </div>
      <div class="summary-card"><div class="val ${a.grandTotalProfit>=0?'pos':'neg'}">${fmtMoney(a.grandTotalProfit)}</div><div class="lbl">إجمالي الربح (محقق + غير محقق)</div></div>
      <div class="summary-card"><div class="val ${a.overallProfitPercent>=0?'pos':'neg'}">${a.overallProfitPercent.toFixed(2)}%</div><div class="lbl">نسبة الربح/الخسارة الإجمالية</div></div>`;
  }

  function renderTable(a){
    const r = a.stockRows;
    document.getElementById('portfolioTableWrap').innerHTML = r.length ? `<table id="portfolioTable">
      <thead><tr>
        <th>السهم</th><th>النوع</th><th>الحالة</th><th>المبلغ المستثمر</th><th>القيمة الحالية</th>
        <th>نسبة الانخفاض</th><th>ربح غير محقق</th><th>ربح محقق (مراكز مفتوحة)</th>
        <th>عدد صفقات مغلقة</th><th>ربح الصفقات المغلقة</th>
      </tr></thead>
      <tbody>
        ${r.map(x=>`<tr>
          <td>${escapeHtml(x.symbol)}</td><td><span class="tag ${x.planType==='DCA'?'tag-done':'tag-next'}">${x.planType}</span></td><td>${x.status}</td>
          <td>${fmtMoney(x.invested)}</td><td>${x.currentValue?fmtMoney(x.currentValue):'-'}</td>
          <td class="${x.dropPercent==null?'':(x.dropPercent<0?'neg':'pos')}">${x.dropPercent!=null?x.dropPercent.toFixed(2)+'%':'-'}</td>
          <td class="${x.unrealized<0?'neg':x.unrealized>0?'pos':''}">${fmtMoney(x.unrealized)}</td>
          <td class="${x.realized<0?'neg':x.realized>0?'pos':''}">${fmtMoney(x.realized)}</td>
          <td>${x.closedCount}</td>
          <td class="${x.closedProfit<0?'neg':x.closedProfit>0?'pos':''}">${fmtMoney(x.closedProfit)}</td>
        </tr>`).join('')}
        <tr style="font-weight:bold;background:#f0f4f2;">
          <td>الإجمالي</td><td></td><td></td>
          <td>${fmtMoney(a.totalInvested)}</td><td>${fmtMoney(a.totalCurrentValue)}</td>
          <td class="${a.avgDropRate==null?'':(a.avgDropRate<0?'neg':'pos')}">${a.avgDropRate!=null?a.avgDropRate.toFixed(2)+'%':'-'}</td>
          <td class="${a.totalUnrealized<0?'neg':'pos'}">${fmtMoney(a.totalUnrealized)}</td>
          <td class="${a.totalRealized<0?'neg':'pos'}">${fmtMoney(a.totalRealized)}</td>
          <td>${a.totalClosedTradesCount}</td>
          <td class="${a.totalClosedProfit<0?'neg':'pos'}">${fmtMoney(a.totalClosedProfit)}</td>
        </tr>
      </tbody>
    </table>` : '<p style="color:#888;font-size:13px;">لا يوجد أسهم مضافة بعد.</p>';
  }

  function renderIndicators(a, from, to){
    const periodLabel = (from && to) ? `${formatDateAr(from)} إلى ${formatDateAr(to)}` : (a.earliestDate ? `${formatDateAr(a.earliestDate)} إلى اليوم` : 'كل الفترة المتاحة');
    document.getElementById('periodIndicators').innerHTML = `
      <div class="summary-cards">
        <div class="summary-card"><div class="val">${fmtMoney(a.grandTotalInvestedEver)}</div><div class="lbl">كم استثمرت</div></div>
        <div class="summary-card"><div class="val ${a.grandTotalProfit>=0?'pos':'neg'}">${fmtMoney(a.grandTotalProfit)}</div><div class="lbl">كم ربحت أو خسرت</div></div>
        <div class="summary-card"><div class="val ${a.overallProfitPercent>=0?'pos':'neg'}">${a.overallProfitPercent.toFixed(2)}%</div><div class="lbl">نسبة الربح/الخسارة على المبلغ المستثمر</div></div>
        <div class="summary-card"><div class="val" style="font-size:13px;">${periodLabel}</div><div class="lbl">فترة الاستثمار / نسبة الربح خلال الفترة: ${a.overallProfitPercent.toFixed(2)}%</div></div>
      </div>`;
  }

  function refreshAll(from, to){
    agg = computeAggregates(plans, grids, allEntries, from, to);
    renderTopSummary(agg);
    renderTable(agg);
    renderIndicators(agg, from, to);
    const points = buildCumulativeProfitPoints(plans, from, to, null, grids);
    document.getElementById('profitChartImg').src = renderCumulativeProfitChart(points, 'الربح التراكمي ' + (from&&to?`(${formatDateAr(from)} - ${formatDateAr(to)})`:'(كل الفترة)'));
  }

  function isoDaysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0]; }
  function computeEarliestDate(){
    // بناخد أقدم تاريخ من: تاريخ بداية أي خطة حالية (مفتوحة)، أو تاريخ أي صفقة اتقفلت قبل كده (DCA أو Grid) -
    // مش بس تاريخ بداية الدورة الحالية، عشان "كل الفترة" تشمل فعلًا كل تاريخ الحساب مش بس آخر دورة مفتوحة
    let earliest = null;
    const consider = (d) => { const dd = dateOnly(d); if(dd && (!earliest || dd<earliest)) earliest = dd; };
    symbols.forEach(sym=>{
      consider(plans[sym].startDate);
      (plans[sym].closedTrades||[]).forEach(ct=>consider(ct.closedDate));
    });
    gridSymbols.forEach(sym=>{
      consider(grids[sym].createdAt);
      (grids[sym].cycleHistory||[]).forEach(c=>consider(c.date));
    });
    return earliest || isoDaysAgo(0);
  }
  function setActivePreset(btn){
    document.querySelectorAll('.period-preset').forEach(b=>b.classList.remove('btn-active'));
    if(btn) btn.classList.add('btn-active');
  }
  function applyPreset(fromVal, toVal, btn){
    document.getElementById('stmtFrom').value = fromVal;
    document.getElementById('stmtTo').value = toVal;
    setActivePreset(btn);
    refreshAll(fromVal||null, toVal||null);
  }

  // أول ما تفتح الصفحة: املأ الفترة بداية من تاريخ أول سهم في المحفظة لحد النهاردة تلقائيًا
  document.getElementById('stmtFrom').value = computeEarliestDate();
  document.getElementById('stmtTo').value = isoDaysAgo(0);
  refreshAll(document.getElementById('stmtFrom').value, document.getElementById('stmtTo').value);

  document.getElementById('presetDaily').onclick=()=>applyPreset(isoDaysAgo(0), isoDaysAgo(0), document.getElementById('presetDaily'));
  document.getElementById('presetWeekly').onclick=()=>applyPreset(isoDaysAgo(7), isoDaysAgo(0), document.getElementById('presetWeekly'));
  document.getElementById('presetMonthly').onclick=()=>applyPreset(isoDaysAgo(30), isoDaysAgo(0), document.getElementById('presetMonthly'));
  document.getElementById('presetAll').onclick=()=>applyPreset(computeEarliestDate(), isoDaysAgo(0), document.getElementById('presetAll'));

  ['stmtFrom','stmtTo'].forEach(id=>{
    document.getElementById(id).addEventListener('change', ()=>{
      setActivePreset(null); // فترة مخصصة - مفيش زرار جاهز متطابق
      const from = document.getElementById('stmtFrom').value || null;
      const to = document.getElementById('stmtTo').value || null;
      refreshAll(from, to);
    });
  });

  if(symbols.length){
    document.getElementById('exportPortfolioXlsBtn').onclick = () => {
      const th = "background:#14532D;color:#ffffff;font-weight:bold;border:1px solid #000000;padding:6px 10px;text-align:center;";
      const td = "border:1px solid #999999;padding:5px 10px;text-align:center;";
      const totalTd = "border:1px solid #000000;padding:6px 10px;text-align:center;font-weight:bold;background:#E6F4EA;";
      const titleTd = "background:#14532D;color:#ffffff;font-weight:bold;font-size:16px;padding:10px;text-align:center;";
      const numFmt = "mso-number-format:'#,##0.00';";
      const chartImg = document.getElementById('profitChartImg').src;
      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8">
      <xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>المحفظة</x:Name><x:WorksheetOptions><x:RTL/><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
      </head><body dir="rtl">
      <table style="border-collapse:collapse;font-family:Tahoma,Arial;direction:rtl;" dir="rtl">
        <tr><td colspan="10" style="${titleTd}">GRIFFINE — ملخص المحفظة</td></tr>
        <tr><td colspan="10" style="border:none;padding:6px;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</td></tr>
        <tr><td colspan="10" style="border:none;"></td></tr>
        <tr>
          <td style="${th}">السهم</td><td style="${th}">النوع</td><td style="${th}">الحالة</td><td style="${th}">المستثمر</td><td style="${th}">القيمة الحالية</td>
          <td style="${th}">نسبة الانخفاض</td><td style="${th}">ربح غير محقق</td><td style="${th}">ربح محقق</td>
          <td style="${th}">صفقات مغلقة</td><td style="${th}">ربح الصفقات المغلقة</td>
        </tr>
        ${agg.stockRows.map(r=>`<tr>
          <td style="${td}">${escapeHtml(r.symbol)}</td><td style="${td}">${r.planType}</td><td style="${td}">${r.status}</td>
          <td style="${td}${numFmt}">${r.invested.toFixed(2)}</td><td style="${td}${numFmt}">${r.currentValue.toFixed(2)}</td>
          <td style="${td}">${r.dropPercent!=null?r.dropPercent.toFixed(2)+'%':'-'}</td>
          <td style="${td}${numFmt}">${r.unrealized.toFixed(2)}</td><td style="${td}${numFmt}">${r.realized.toFixed(2)}</td>
          <td style="${td}">${r.closedCount}</td><td style="${td}${numFmt}">${r.closedProfit.toFixed(2)}</td>
        </tr>`).join('')}
        <tr>
          <td style="${totalTd}">الإجمالي</td><td style="${totalTd}"></td><td style="${totalTd}"></td>
          <td style="${totalTd}${numFmt}">${agg.totalInvested.toFixed(2)}</td><td style="${totalTd}${numFmt}">${agg.totalCurrentValue.toFixed(2)}</td>
          <td style="${totalTd}">${agg.avgDropRate!=null?agg.avgDropRate.toFixed(2)+'%':'-'}</td>
          <td style="${totalTd}${numFmt}">${agg.totalUnrealized.toFixed(2)}</td><td style="${totalTd}${numFmt}">${agg.totalRealized.toFixed(2)}</td>
          <td style="${totalTd}">${agg.totalClosedTradesCount}</td><td style="${totalTd}${numFmt}">${agg.totalClosedProfit.toFixed(2)}</td>
        </tr>
        <tr><td colspan="10" style="border:none;padding:10px;text-align:center;"><img src="chart.png" width="600" height="237"></td></tr>
      </table>
      </body></html>`;
      buildAndDownloadMhtmlXls(html, chartImg, `griffine_ملخص_المحفظة.xls`);
    };

    document.getElementById('exportPortfolioPdfBtn').onclick = () => {
      const chartImg = document.getElementById('profitChartImg').src;
      const w = window.open('', '_blank');
      const rowsHtml = agg.stockRows.map(r=>`<tr>
        <td>${escapeHtml(r.symbol)}</td><td>${r.planType}</td><td>${r.status}</td><td>${fmt2(r.invested)}</td><td>${fmt2(r.currentValue)}</td>
        <td>${r.dropPercent!=null?r.dropPercent.toFixed(2)+'%':'-'}</td><td>${fmt2(r.unrealized)}</td>
        <td>${fmt2(r.realized)}</td><td>${r.closedCount}</td><td>${fmt2(r.closedProfit)}</td>
      </tr>`).join('');
      w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>ملخص المحفظة</title>
        <style>body{font-family:Tahoma,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin-top:14px;}
        th,td{border:1px solid #ccc;padding:7px;text-align:center;font-size:12px;} th{background:#14532d;color:#fff;}
        h1{color:#14532d;} .agg{margin-top:16px;font-size:14px;background:#f0f4f2;padding:10px;border-radius:8px;}
        img{max-width:100%;margin-top:16px;}</style></head>
        <body>
        ${reportLogoHeaderHtml()}
        <h1>GRIFFINE — ملخص المحفظة</h1>
        <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
        <table><thead><tr><th>السهم</th><th>النوع</th><th>الحالة</th><th>المستثمر</th><th>القيمة الحالية</th><th>الانخفاض</th><th>ربح غير محقق</th><th>ربح محقق</th><th>صفقات مغلقة</th><th>ربح الصفقات المغلقة</th></tr></thead>
        <tbody>${rowsHtml}</tbody></table>
        <div class="agg"><strong>الإجمالي:</strong> مستثمر: ${fmt2(agg.totalInvested)} | قيمة حالية: ${fmt2(agg.totalCurrentValue)} |
        ربح إجمالي: ${fmt2(agg.grandTotalProfit)} (${agg.overallProfitPercent.toFixed(2)}%)</div>
        <img src="${chartImg}">
        <script>window.onload = () => window.print();<\/script>
        </body></html>`);
      w.document.close();
    };
  }

  function buildStatementSections(from, to){
    let sections = '', periodTotalProfit = 0;
    symbols.forEach(sym=>{
      const p = plans[sym];
      const { rowsHtml, hasAny, periodProfit } = buildStockTransactionRows(p, from, to);
      periodTotalProfit += periodProfit;
      if(hasAny){
        sections += `<h3 style="color:#14532d;margin-top:20px;">${sym} (DCA — ${p.market||''} - ${p.currency||''})</h3>
        <table><thead><tr><th>التاريخ</th><th>العملية</th><th>المستوى</th><th>الكمية</th><th>السعر</th><th>الربح</th></tr></thead>
        <tbody>${rowsHtml}</tbody></table>`;
      }
    });
    gridSymbols.forEach(sym=>{
      const g = grids[sym];
      const { rowsHtml, hasAny, periodProfit } = buildGridTransactionRows(g, from, to);
      periodTotalProfit += periodProfit;
      if(hasAny){
        sections += `<h3 style="color:#14532d;margin-top:20px;">${sym} (Grid — ${g.market||''})</h3>
        <table><thead><tr><th>التاريخ</th><th>العملية</th><th>المستوى</th><th>الكمية</th><th>السعر</th><th>الربح</th></tr></thead>
        <tbody>${rowsHtml}</tbody></table>`;
      }
    });
    return { sections, periodTotalProfit };
  }

  document.getElementById('printStatementBtn').onclick = () => {
    const from = document.getElementById('stmtFrom').value;
    const to = document.getElementById('stmtTo').value;
    if(!from || !to){ alert('اختار الفترة من وإلى الأول'); return; }
    const { sections, periodTotalProfit } = buildStatementSections(from, to);
    const stAgg = computeAggregates(plans, grids, allEntries, from, to);
    const stPoints = buildCumulativeProfitPoints(plans, from, to, null, grids);
    const stChartImg = renderCumulativeProfitChart(stPoints, 'الربح التراكمي — كل المحفظة');
    const periodLabel = `${formatDateAr(from)} إلى ${formatDateAr(to)}`;

    const rowsHtml = stAgg.stockRows.map(r=>`<tr>
      <td>${escapeHtml(r.symbol)}</td><td>${r.planType}</td><td>${r.status}</td>
      <td>${fmt2(r.invested)}</td><td>${r.currentValue?fmt2(r.currentValue):'-'}</td>
      <td>${r.dropPercent!=null?r.dropPercent.toFixed(2)+'%':'-'}</td>
      <td>${fmt2(r.unrealized)}</td><td>${fmt2(r.realized)}</td>
      <td>${r.closedCount}</td><td>${fmt2(r.closedProfit)}</td>
    </tr>`).join('');

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>كشف حساب المحفظة</title>
      <style>body{font-family:Tahoma,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin-top:8px;}
      th,td{border:1px solid #ccc;padding:6px;text-align:center;font-size:12px;} th{background:#14532d;color:#fff;}
      h1{color:#14532d;} h2{color:#14532d;} .agg{margin-top:20px;font-size:15px;background:#f0f4f2;padding:12px;border-radius:8px;}
      .indicators{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;}
      .indicators div{flex:1;min-width:150px;background:#f8faf9;border:1px solid #e7ebe9;border-radius:8px;padding:10px;text-align:center;}
      .indicators .v{font-size:16px;font-weight:bold;color:#14532d;} .indicators .l{font-size:11px;color:#888;margin-top:3px;}
      img{max-width:100%;margin-top:16px;}</style></head>
      <body>
      ${reportLogoHeaderHtml()}
      <h1>GRIFFINE — كشف حساب شامل للمحفظة</h1>
      <p>الفترة من ${periodLabel} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>

      <div class="indicators">
        <div><div class="v">${fmt2(stAgg.grandTotalInvestedEver)}</div><div class="l">إجمالي المستثمر (كل المحفظة)</div></div>
        <div><div class="v">${fmt2(stAgg.grandTotalProfit)}</div><div class="l">إجمالي الربح/الخسارة</div></div>
        <div><div class="v">${stAgg.overallProfitPercent.toFixed(2)}%</div><div class="l">نسبة الربح/الخسارة الإجمالية</div></div>
        <div><div class="v" style="font-size:12px;">${periodLabel}</div><div class="l">فترة الكشف</div></div>
      </div>

      <img src="${stChartImg}" width="720" height="300">

      <h2 style="margin-top:20px;">إجماليات كل الأسهم</h2>
      <table><thead><tr>
        <th>السهم</th><th>النوع</th><th>الحالة</th><th>المستثمر</th><th>القيمة الحالية</th><th>الانخفاض</th>
        <th>ربح غير محقق</th><th>ربح محقق</th><th>صفقات مغلقة</th><th>ربح الصفقات المغلقة</th>
      </tr></thead><tbody>
        ${rowsHtml}
        <tr style="font-weight:bold;background:#eef6f2;">
          <td>الإجمالي</td><td></td><td></td>
          <td>${fmt2(stAgg.totalInvested)}</td><td>${fmt2(stAgg.totalCurrentValue)}</td>
          <td>${stAgg.avgDropRate!=null?stAgg.avgDropRate.toFixed(2)+'%':'-'}</td>
          <td>${fmt2(stAgg.totalUnrealized)}</td><td>${fmt2(stAgg.totalRealized)}</td>
          <td>${stAgg.totalClosedTradesCount}</td><td>${fmt2(stAgg.totalClosedProfit)}</td>
        </tr>
      </tbody></table>

      <h2 style="margin-top:26px;">تفاصيل كل عمليات كل سهم</h2>
      ${sections || '<p>لا يوجد أي عمليات في هذه الفترة.</p>'}
      <div class="agg"><strong>إجمالي أرباح الصفقات المغلقة خلال الفترة:</strong> ${fmt2(periodTotalProfit)}</div>
      <script>window.onload = () => window.print();<\/script>
      </body></html>`);
    w.document.close();
  };

  document.getElementById('exportStatementXlsBtn').onclick = () => {
    const from = document.getElementById('stmtFrom').value;
    const to = document.getElementById('stmtTo').value;
    if(!from || !to){ alert('اختار الفترة من وإلى الأول'); return; }
    const th = "background:#14532D;color:#ffffff;font-weight:bold;border:1px solid #000000;padding:6px 10px;text-align:center;";
    const td = "border:1px solid #999999;padding:5px 10px;text-align:center;";
    const totalTd = "border:1px solid #000000;padding:6px 10px;text-align:center;font-weight:bold;background:#E6F4EA;";
    const titleTd = "background:#14532D;color:#ffffff;font-weight:bold;font-size:16px;padding:10px;text-align:center;";
    const sectionTd = "background:#eef6f2;color:#14532d;font-weight:bold;padding:8px;text-align:right;";

    const stAgg = computeAggregates(plans, grids, allEntries, from, to);
    const stPoints = buildCumulativeProfitPoints(plans, from, to, null, grids);
    const stChartImg = renderCumulativeProfitChart(stPoints, 'الربح التراكمي — كل المحفظة');
    const periodLabel = `${formatDateAr(from)} إلى ${formatDateAr(to)}`;

    const aggRowsHtml = stAgg.stockRows.map(r=>`<tr>
      <td style="${td}">${escapeHtml(r.symbol)}</td><td style="${td}">${r.planType}</td><td style="${td}">${r.status}</td>
      <td style="${td}">${r.invested.toFixed(2)}</td><td style="${td}">${r.currentValue.toFixed(2)}</td>
      <td style="${td}">${r.dropPercent!=null?r.dropPercent.toFixed(2)+'%':'-'}</td>
      <td style="${td}">${r.unrealized.toFixed(2)}</td><td style="${td}">${r.realized.toFixed(2)}</td>
      <td style="${td}">${r.closedCount}</td><td style="${td}">${r.closedProfit.toFixed(2)}</td>
    </tr>`).join('');

    let body = `<table style="border-collapse:collapse;font-family:Tahoma,Arial;direction:rtl;" dir="rtl">
      <tr><td colspan="10" style="${titleTd}">GRIFFINE — كشف حساب شامل للمحفظة</td></tr>
      <tr><td colspan="10" style="border:none;padding:6px;">الفترة من ${periodLabel} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</td></tr>
      <tr><td colspan="10" style="border:none;"></td></tr>
      <tr>
        <td style="${th}">السهم</td><td style="${th}">النوع</td><td style="${th}">الحالة</td><td style="${th}">المستثمر</td><td style="${th}">القيمة الحالية</td>
        <td style="${th}">نسبة الانخفاض</td><td style="${th}">ربح غير محقق</td><td style="${th}">ربح محقق</td>
        <td style="${th}">صفقات مغلقة</td><td style="${th}">ربح الصفقات المغلقة</td>
      </tr>
      ${aggRowsHtml}
      <tr>
        <td style="${totalTd}">الإجمالي</td><td style="${totalTd}"></td><td style="${totalTd}"></td>
        <td style="${totalTd}">${stAgg.totalInvested.toFixed(2)}</td><td style="${totalTd}">${stAgg.totalCurrentValue.toFixed(2)}</td>
        <td style="${totalTd}">${stAgg.avgDropRate!=null?stAgg.avgDropRate.toFixed(2)+'%':'-'}</td>
        <td style="${totalTd}">${stAgg.totalUnrealized.toFixed(2)}</td><td style="${totalTd}">${stAgg.totalRealized.toFixed(2)}</td>
        <td style="${totalTd}">${stAgg.totalClosedTradesCount}</td><td style="${totalTd}">${stAgg.totalClosedProfit.toFixed(2)}</td>
      </tr>
      <tr><td colspan="10" style="border:none;padding:10px;text-align:center;"><img src="chart.png" width="600" height="237"></td></tr>
      <tr><td colspan="10" style="border:none;"></td></tr>`;

    let periodTotalProfit = 0;
    symbols.forEach(sym=>{
      const p = plans[sym];
      const { rowsHtml, hasAny, periodProfit } = buildStockTransactionRows(p, from, to);
      periodTotalProfit += periodProfit;
      if(hasAny){
        body += `<tr><td colspan="10" style="${sectionTd}">تفاصيل عمليات: ${sym} (DCA — ${p.market||''} - ${p.currency||''})</td></tr>
          <tr><td style="${th}">التاريخ</td><td style="${th}">العملية</td><td style="${th}">المستوى</td><td style="${th}">الكمية</td><td style="${th}" colspan="3">السعر</td><td style="${th}" colspan="3">الربح</td></tr>
          ${rowsHtml.replace(/<td>/g, `<td style="${td}">`)}
          <tr><td colspan="10" style="border:none;padding:4px;"></td></tr>`;
      }
    });
    gridSymbols.forEach(sym=>{
      const g = grids[sym];
      const { rowsHtml, hasAny, periodProfit } = buildGridTransactionRows(g, from, to);
      periodTotalProfit += periodProfit;
      if(hasAny){
        body += `<tr><td colspan="10" style="${sectionTd}">تفاصيل عمليات: ${sym} (Grid — ${g.market||''})</td></tr>
          <tr><td style="${th}">التاريخ</td><td style="${th}">العملية</td><td style="${th}">المستوى</td><td style="${th}">الكمية</td><td style="${th}" colspan="3">السعر</td><td style="${th}" colspan="3">الربح</td></tr>
          ${rowsHtml.replace(/<td>/g, `<td style="${td}">`)}
          <tr><td colspan="10" style="border:none;padding:4px;"></td></tr>`;
      }
    });
    body += `<tr><td colspan="9" style="${th}">إجمالي أرباح الصفقات المغلقة خلال الفترة</td><td style="${th}">${periodTotalProfit.toFixed(2)}</td></tr></table>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>كشف حساب</x:Name><x:WorksheetOptions><x:RTL/><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml></head><body dir="rtl">${body}</body></html>`;
    buildAndDownloadMhtmlXls(html, stChartImg, `griffine_كشف_حساب.xls`);
  };

  function updateMsToggleLabel(){
    const checked = Array.from(document.querySelectorAll('.reportSymCheck:checked')).map(cb=>cb.value);
    const btn = document.getElementById('msToggleBtn');
    if(checked.length===0) btn.textContent = 'اختر الأسهم ▾';
    else if(checked.length===allEntries.length) btn.textContent = `كل الأسهم (${allEntries.length}) ▾`;
    else if(checked.length<=3) btn.textContent = checked.join('، ') + ' ▾';
    else btn.textContent = `${checked.length} أسهم مختارة ▾`;
  }

  document.getElementById('msToggleBtn').onclick = (e) => {
    e.stopPropagation();
    const panel = document.getElementById('msPanel');
    panel.style.display = panel.style.display==='none' ? 'block' : 'none';
  };
  document.getElementById('msDoneBtn').onclick = () => { document.getElementById('msPanel').style.display = 'none'; };
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('msDropdown');
    if (dd && !dd.contains(e.target)) document.getElementById('msPanel').style.display = 'none';
  });

  document.getElementById('reportSelectAll').addEventListener('change', (e)=>{
    document.querySelectorAll('.reportSymCheck').forEach(cb=>{ cb.checked = e.target.checked; });
    updateMsToggleLabel();
  });
  document.querySelectorAll('.reportSymCheck').forEach(cb=>{
    cb.addEventListener('change', updateMsToggleLabel);
  });

  function buildReportDetailSections(selectedKeys, from, to){
    let sections = '';
    selectedKeys.forEach(key=>{
      const [sym, type] = key.split('::');
      if (type === 'DCA') {
        const p = plans[sym];
        const { rowsHtml, hasAny } = buildStockTransactionRows(p, from, to);
        sections += `<h2 style="color:#14532d;margin-top:26px;border-top:2px solid #eee;padding-top:16px;">تفاصيل عمليات: ${sym} (DCA — ${p.market||''} - ${p.currency||''})</h2>
        <table><thead><tr><th>التاريخ</th><th>العملية</th><th>المستوى</th><th>الكمية</th><th>السعر</th><th>الربح</th></tr></thead>
        <tbody>${hasAny ? rowsHtml : '<tr><td colspan="6">لا يوجد عمليات في هذه الفترة</td></tr>'}</tbody></table>`;
      } else {
        const g = grids[sym];
        const { rowsHtml, hasAny } = buildGridTransactionRows(g, from, to);
        sections += `<h2 style="color:#14532d;margin-top:26px;border-top:2px solid #eee;padding-top:16px;">تفاصيل عمليات: ${sym} (Grid — ${g.market||''})</h2>
        <table><thead><tr><th>التاريخ</th><th>العملية</th><th>المستوى</th><th>الكمية</th><th>السعر</th><th>الربح</th></tr></thead>
        <tbody>${hasAny ? rowsHtml : '<tr><td colspan="6">لا يوجد عمليات في هذه الفترة</td></tr>'}</tbody></table>`;
      }
    });
    return sections;
  }

  document.getElementById('printStockReportBtn').onclick = () => {
    const selectedKeys = Array.from(document.querySelectorAll('.reportSymCheck:checked')).map(cb=>cb.value);
    if(selectedKeys.length===0){ alert('اختار سهم واحد على الأقل'); return; }
    const from = document.getElementById('stmtFrom').value || null;
    const to = document.getElementById('stmtTo').value || null;

    const reportAgg = computeAggregates(plans, grids, allEntries, from, to, selectedKeys);
    const plainSyms = [...new Set(selectedKeys.map(k=>k.split('::')[0]))];
    const combinedPoints = buildCumulativeProfitPoints(plans, from, to, plainSyms, grids);
    const groupLabel = selectedKeys.length===allEntries.length ? 'كل الأسهم' : reportAgg.stockRows.map(r=>`${escapeHtml(r.symbol)} (${r.planType})`).join('، ');
    const chartImg = renderCumulativeProfitChart(combinedPoints, 'الربح التراكمي — ' + groupLabel);
    const periodLabel = (from && to) ? `${formatDateAr(from)} إلى ${formatDateAr(to)}` : 'كل الفترة المتاحة';
    const detailSections = buildReportDetailSections(selectedKeys, from, to);

    const rowsHtml = reportAgg.stockRows.map(r=>`<tr>
      <td>${escapeHtml(r.symbol)}</td><td>${r.planType}</td><td>${r.status}</td>
      <td>${fmt2(r.invested)}</td><td>${r.currentValue?fmt2(r.currentValue):'-'}</td>
      <td>${r.dropPercent!=null?r.dropPercent.toFixed(2)+'%':'-'}</td>
      <td>${fmt2(r.unrealized)}</td><td>${fmt2(r.realized)}</td>
      <td>${r.closedCount}</td><td>${fmt2(r.closedProfit)}</td>
    </tr>`).join('');

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير أسهم</title>
      <style>body{font-family:Tahoma,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin-top:8px;}
      th,td{border:1px solid #ccc;padding:6px;text-align:center;font-size:12px;} th{background:#14532d;color:#fff;}
      h1{color:#14532d;} .agg{margin-top:16px;font-size:14px;background:#f0f4f2;padding:12px;border-radius:8px;}
      .indicators{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;}
      .indicators div{flex:1;min-width:150px;background:#f8faf9;border:1px solid #e7ebe9;border-radius:8px;padding:10px;text-align:center;}
      .indicators .v{font-size:16px;font-weight:bold;color:#14532d;} .indicators .l{font-size:11px;color:#888;margin-top:3px;}
      img{max-width:100%;margin-top:16px;}</style></head>
      <body>
      ${reportLogoHeaderHtml()}
      <h1>GRIFFINE — تقرير مجمّع: ${groupLabel}</h1>
      <p>الفترة: ${periodLabel} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>

      <div class="indicators">
        <div><div class="v">${fmt2(reportAgg.grandTotalInvestedEver)}</div><div class="l">كم استثمرت (${groupLabel})</div></div>
        <div><div class="v">${fmt2(reportAgg.grandTotalProfit)}</div><div class="l">كم ربحت أو خسرت</div></div>
        <div><div class="v">${reportAgg.overallProfitPercent.toFixed(2)}%</div><div class="l">نسبة الربح/الخسارة</div></div>
        <div><div class="v" style="font-size:12px;">${periodLabel}</div><div class="l">فترة التقرير</div></div>
      </div>

      <img src="${chartImg}" width="720" height="300">

      <table><thead><tr>
        <th>السهم</th><th>النوع</th><th>الحالة</th><th>المستثمر</th><th>القيمة الحالية</th><th>الانخفاض</th>
        <th>ربح غير محقق</th><th>ربح محقق</th><th>صفقات مغلقة</th><th>ربح الصفقات المغلقة</th>
      </tr></thead><tbody>
        ${rowsHtml}
        <tr style="font-weight:bold;background:#eef6f2;">
          <td>الإجمالي</td><td></td><td></td>
          <td>${fmt2(reportAgg.totalInvested)}</td><td>${fmt2(reportAgg.totalCurrentValue)}</td>
          <td>${reportAgg.avgDropRate!=null?reportAgg.avgDropRate.toFixed(2)+'%':'-'}</td>
          <td>${fmt2(reportAgg.totalUnrealized)}</td><td>${fmt2(reportAgg.totalRealized)}</td>
          <td>${reportAgg.totalClosedTradesCount}</td><td>${fmt2(reportAgg.totalClosedProfit)}</td>
        </tr>
      </tbody></table>

      ${detailSections}

      <script>window.onload = () => window.print();<\/script>
      </body></html>`);
    w.document.close();
  };

  document.getElementById('exportStockReportXlsBtn').onclick = () => {
    const selectedKeys = Array.from(document.querySelectorAll('.reportSymCheck:checked')).map(cb=>cb.value);
    if(selectedKeys.length===0){ alert('اختار سهم واحد على الأقل'); return; }
    const from = document.getElementById('stmtFrom').value || null;
    const to = document.getElementById('stmtTo').value || null;

    const reportAgg = computeAggregates(plans, grids, allEntries, from, to, selectedKeys);
    const plainSyms = [...new Set(selectedKeys.map(k=>k.split('::')[0]))];
    const combinedPoints = buildCumulativeProfitPoints(plans, from, to, plainSyms, grids);
    const groupLabel = selectedKeys.length===allEntries.length ? 'كل الأسهم' : reportAgg.stockRows.map(r=>`${escapeHtml(r.symbol)} (${r.planType})`).join('، ');
    const chartImg = renderCumulativeProfitChart(combinedPoints, 'الربح التراكمي — ' + groupLabel);
    const periodLabel = (from && to) ? `${formatDateAr(from)} إلى ${formatDateAr(to)}` : 'كل الفترة المتاحة';

    const th = "background:#14532D;color:#ffffff;font-weight:bold;border:1px solid #000000;padding:6px 10px;text-align:center;";
    const td = "border:1px solid #999999;padding:5px 10px;text-align:center;";
    const totalTd = "border:1px solid #000000;padding:6px 10px;text-align:center;font-weight:bold;background:#E6F4EA;";
    const titleTd = "background:#14532D;color:#ffffff;font-weight:bold;font-size:16px;padding:10px;text-align:center;";
    const sectionTd = "background:#eef6f2;color:#14532d;font-weight:bold;padding:8px;text-align:right;";

    const rowsHtml = reportAgg.stockRows.map(r=>`<tr>
      <td style="${td}">${escapeHtml(r.symbol)}</td><td style="${td}">${r.planType}</td><td style="${td}">${r.status}</td>
      <td style="${td}">${r.invested.toFixed(2)}</td><td style="${td}">${r.currentValue.toFixed(2)}</td>
      <td style="${td}">${r.dropPercent!=null?r.dropPercent.toFixed(2)+'%':'-'}</td>
      <td style="${td}">${r.unrealized.toFixed(2)}</td><td style="${td}">${r.realized.toFixed(2)}</td>
      <td style="${td}">${r.closedCount}</td><td style="${td}">${r.closedProfit.toFixed(2)}</td>
    </tr>`).join('');

    let detailRows = '';
    selectedKeys.forEach(key=>{
      const [sym, type] = key.split('::');
      const { rowsHtml: r2, hasAny } = type === 'DCA' ? buildStockTransactionRows(plans[sym], from, to) : buildGridTransactionRows(grids[sym], from, to);
      const marketLabel = type === 'DCA' ? `${plans[sym].market||''} - ${plans[sym].currency||''}` : `${grids[sym].market||''}`;
      detailRows += `<tr><td colspan="10" style="${sectionTd}">تفاصيل عمليات: ${sym} (${type} — ${marketLabel})</td></tr>
        <tr><td style="${th}">التاريخ</td><td style="${th}">العملية</td><td style="${th}">المستوى</td><td style="${th}">الكمية</td><td style="${th}" colspan="3">السعر</td><td style="${th}" colspan="3">الربح</td></tr>
        ${hasAny ? r2.replace(/<td>/g, `<td style="${td}">`) : `<tr><td colspan="10" style="${td}">لا يوجد عمليات في هذه الفترة</td></tr>`}
        <tr><td colspan="10" style="border:none;padding:4px;"></td></tr>`;
    });

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8">
      <xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>تقرير</x:Name><x:WorksheetOptions><x:RTL/><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
      </head><body dir="rtl">
      <table style="border-collapse:collapse;font-family:Tahoma,Arial;direction:rtl;" dir="rtl">
        <tr><td colspan="10" style="${titleTd}">GRIFFINE — تقرير مجمّع: ${groupLabel}</td></tr>
        <tr><td colspan="10" style="border:none;padding:6px;">الفترة: ${periodLabel} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</td></tr>
        <tr><td colspan="10" style="border:none;"></td></tr>
        <tr>
          <td style="${th}">السهم</td><td style="${th}">النوع</td><td style="${th}">الحالة</td><td style="${th}">المستثمر</td><td style="${th}">القيمة الحالية</td>
          <td style="${th}">نسبة الانخفاض</td><td style="${th}">ربح غير محقق</td><td style="${th}">ربح محقق</td>
          <td style="${th}">صفقات مغلقة</td><td style="${th}">ربح الصفقات المغلقة</td>
        </tr>
        ${rowsHtml}
        <tr>
          <td style="${totalTd}">الإجمالي</td><td style="${totalTd}"></td><td style="${totalTd}"></td>
          <td style="${totalTd}">${reportAgg.totalInvested.toFixed(2)}</td><td style="${totalTd}">${reportAgg.totalCurrentValue.toFixed(2)}</td>
          <td style="${totalTd}">${reportAgg.avgDropRate!=null?reportAgg.avgDropRate.toFixed(2)+'%':'-'}</td>
          <td style="${totalTd}">${reportAgg.totalUnrealized.toFixed(2)}</td><td style="${totalTd}">${reportAgg.totalRealized.toFixed(2)}</td>
          <td style="${totalTd}">${reportAgg.totalClosedTradesCount}</td><td style="${totalTd}">${reportAgg.totalClosedProfit.toFixed(2)}</td>
        </tr>
        <tr><td colspan="10" style="border:none;padding:10px;text-align:center;"><img src="chart.png" width="600" height="237"></td></tr>
        <tr><td colspan="10" style="border:none;"></td></tr>
        ${detailRows}
      </table>
      </body></html>`;
    buildAndDownloadMhtmlXls(html, chartImg, `griffine_تقرير_${groupLabel.substring(0,20)}.xls`);
  };
}

/* ================== تقرير تنويع المحفظة (خدمة جديدة - بند 43) ================== */
async function renderDiversificationReport(){
  pushNav(() => renderDiversificationReport());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;

  const plans = await getPlans(email);
  const symbols = Object.keys(plans);

  const rows = [];
  let totalExposure = 0;
  const byMarket = {};

  symbols.forEach(sym => {
    const p = plans[sym];
    if (!p.closedTrades) p.closedTrades = [];
    const sim = simulatePlan(p);
    const isOpen = sim.heldQty > 0;
    if (!isOpen) return; // التنويع بيتحسب على المراكز المفتوحة بس (اللي فعليًا محتفظ بيها دلوقتي)
    const lastPrice = (p.manualLastPrice > 0) ? p.manualLastPrice : sim.lastBoughtPrice;
    const value = (lastPrice != null) ? sim.heldQty * lastPrice : sim.totalBuyAmountSpent;
    rows.push({ symbol: sym, market: p.market || 'غير محدد', value });
    totalExposure += value;
    byMarket[p.market || 'غير محدد'] = (byMarket[p.market || 'غير محدد'] || 0) + value;
  });

  rows.sort((a,b) => b.value - a.value);
  const topHolding = rows[0];
  const topPct = (totalExposure > 0 && topHolding) ? (topHolding.value / totalExposure * 100) : 0;

  let riskLabel, riskColor, riskAdvice;
  if (rows.length === 0) {
    riskLabel = 'لا توجد مراكز مفتوحة حاليًا'; riskColor = '#888';
    riskAdvice = 'مفيش أسهم محتفظ بيها دلوقتي لنقيّم تنويعها.';
  } else if (topPct >= 50) {
    riskLabel = 'تركيز مرتفع جدًا'; riskColor = '#8b1e1e';
    riskAdvice = `${escapeHtml(topHolding.symbol)} لوحده بيمثّل ${topPct.toFixed(0)}% من محفظتك المفتوحة — ده تركيز عالي جدًا، أي تراجع في السهم ده هيأثر بقوة على محفظتك كلها.`;
  } else if (topPct >= 30) {
    riskLabel = 'تركيز مرتفع'; riskColor = '#c0392b';
    riskAdvice = `${escapeHtml(topHolding.symbol)} بيمثّل ${topPct.toFixed(0)}% من محفظتك — نسبة معقولة الاهتمام، فكّر تزوّد تنويعك على أسهم/قطاعات تانية.`;
  } else if (rows.length < 3) {
    riskLabel = 'عدد أسهم قليل'; riskColor = '#8a6d1b';
    riskAdvice = 'عدد الأسهم المفتوحة عندك قليل — التنويع مش بس نسبة، كمان عدد كافي من الأسهم المختلفة يقلل المخاطرة العشوائية.';
  } else {
    riskLabel = 'محفظة متنوعة نسبيًا'; riskColor = '#2e9e4f';
    riskAdvice = 'توزيع محفظتك المفتوحة معقول ومش متركّز في سهم واحد بشكل مبالغ فيه.';
  }

  const marketRows = Object.keys(byMarket).map(m => ({ market: m, value: byMarket[m], pct: totalExposure>0 ? byMarket[m]/totalExposure*100 : 0 }));

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>${pageTitle('diversification_report','🎯 تقرير تنويع المحفظة')}</div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button></div>
    <div class="info">التقرير ده بيحلل بس المراكز المفتوحة حاليًا (الأسهم اللي لسه محتفظ بيها)، بناءً على بيانات خططك المُدخلة عندك.</div>

    <div style="text-align:center;padding:16px;background:${riskColor}15;border-radius:12px;margin-bottom:16px;">
      <div style="font-size:12px;color:#666;">تقييم التنويع</div>
      <div style="font-size:22px;font-weight:bold;color:${riskColor};">${riskLabel}</div>
      <div style="font-size:13px;color:#555;margin-top:8px;max-width:500px;margin-inline:auto;">${riskAdvice}</div>
    </div>

    <h2>توزيع القيمة حسب السهم</h2>
    <div class="section-card">
      ${rows.length ? rows.map(r=>{
        const pct = totalExposure>0 ? (r.value/totalExposure*100) : 0;
        return `<div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;"><strong>${escapeHtml(r.symbol)}</strong><span>${pct.toFixed(1)}%</span></div>
          <div style="background:#eee;border-radius:4px;height:10px;overflow:hidden;"><div style="background:${pct>=40?'#c0392b':'var(--green)'};height:100%;width:${Math.min(pct,100)}%;"></div></div>
        </div>`;
      }).join('') : '<p style="color:#888;font-size:13px;">مفيش مراكز مفتوحة حاليًا.</p>'}
    </div>

    ${marketRows.length > 1 ? `<h2 style="margin-top:20px;">توزيع القيمة حسب السوق</h2>
    <div class="section-card">
      ${marketRows.map(m=>`<div>${escapeHtml(m.market)}: <strong>${m.pct.toFixed(1)}%</strong></div>`).join('')}
    </div>` : ''}

    <p class="disclaimer">تنويه: التقرير ده تحليلي بناءً على بياناتك المُدخلة بس، ومش توصية استثمارية. قرار التنويع من عدمه مسؤوليتك الكاملة.</p>
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();
}

/* ================== برنامج الإحالة - ادعُ صديق (خدمة جديدة - بند 43) ================== */
async function renderReferralPage(){
  pushNav(() => renderReferralPage());
  const email = await getSession();
  if(!email) return renderLogin();

  const res = await getReferralInfo();
  const info = (res && res.success) ? res : { code: '', totalReferred: 0, rewardedCount: 0, bonusDays: 15 };
  const link = `${location.origin}${location.pathname}?ref=${info.code}`;

  app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>${pageTitle('referral','🎁 ادعُ صديق')}</div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button></div>
    <div class="info">اقنع صاحبك يجرّب GRIFFINE — لما يشترك باقة مدفوعة، انتوا الاتنين تاخدوا ${info.bonusDays} يوم إضافي مجاني على اشتراككم الحالي تلقائيًا.</div>

    <h2>كود الإحالة بتاعك</h2>
    <div class="section-card" style="text-align:center;">
      <div style="font-size:26px;font-weight:bold;letter-spacing:4px;color:var(--green-dark);">${escapeHtml(info.code)}</div>
      <label style="margin-top:12px;">أو شارك الرابط المباشر</label>
      <input type="text" id="refLinkInput" readonly value="${link}">
      <button id="copyRefLinkBtn" style="margin-top:8px;">📋 نسخ الرابط</button>
      <div id="copyResult"></div>
    </div>

    <h2 style="margin-top:20px;">إحصائياتك</h2>
    <div class="summary-cards">
      <div class="summary-card"><div class="val">${info.totalReferred}</div><div class="lbl">إجمالي اللي سجّلوا بكودك</div></div>
      <div class="summary-card"><div class="val">${info.rewardedCount}</div><div class="lbl">مكافآت اتصرفت فعليًا</div></div>
    </div>
    <p class="disclaimer">المكافأة بتتفعّل تلقائيًا بس لما صاحبك يشترك باقة مدفوعة وتتفعّل فعليًا (مش عند التسجيل بس).</p>
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();
  document.getElementById('copyRefLinkBtn').onclick=async()=>{
    try {
      await navigator.clipboard.writeText(link);
      document.getElementById('copyResult').innerHTML = '<div class="info" style="margin-top:8px;">✅ اتنسخ الرابط.</div>';
    } catch(e) {
      document.getElementById('refLinkInput').select();
      document.getElementById('copyResult').innerHTML = '<div class="info" style="margin-top:8px;">حدد الرابط وانسخه يدويًا.</div>';
    }
  };
}

/* ================== الملف الشخصي - بيانات الحساب + تفضيل الشكل + المكان الوحيد لتسجيل الخروج ================== */
async function renderProfilePage(){
  pushNav(() => renderProfilePage());
  const email = await getSession();
  if(!email) return renderLogin();

  const subRes = await getMySubscription();
  const sub = (subRes && subRes.success) ? subRes.subscription : null;
  let theme = 'light'; try { theme = localStorage.getItem('griffine_theme') || 'light'; } catch(e){}
  let currentAvatar = null;
  try { const avatarRes = await apiGet('/avatar_get.php'); if (avatarRes && avatarRes.success) currentAvatar = avatarRes.avatar; } catch(e){ /* الأفاتار مش أساسية */ }
  const presets = presetAvatars();

  app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>${pageTitle('profile','👤 الملف الشخصي')}</div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button></div>

    <h2>الصورة الشخصية</h2>
    <div class="section-card" style="text-align:center;">
      <img id="currentAvatarPreview" src="${escapeHtml(currentAvatar || presets[0])}" alt="الصورة الشخصية" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:2px solid var(--border);margin-bottom:12px;">
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:12px;">
        ${presets.map((p,i)=>`<img src="${p}" class="avatarPresetOption" data-idx="${i}" alt="أفاتار ${i+1}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;cursor:pointer;border:2px solid transparent;">`).join('')}
      </div>
      <input type="file" accept="image/*" id="avatarUploadInput" style="display:none;">
      <button id="avatarUploadBtn" class="secondary" style="width:auto;">📤 رفع صورة شخصية</button>
      ${currentAvatar ? `<button id="avatarRemoveBtn" class="danger" style="width:auto;margin-inline-start:8px;">إزالة الصورة</button>` : ''}
      <div id="avatarResult"></div>
    </div>

    <h2 style="margin-top:20px;">بياناتك</h2>
    <div class="section-card">
      <div style="margin-bottom:6px;"><strong>البريد الإلكتروني:</strong> ${escapeHtml(email)}</div>
      <button id="requestEmailChangeToggleBtn" class="secondary small" style="width:auto;margin-bottom:12px;">✏️ طلب تعديل البريد الإلكتروني</button>
      <button id="requestPasswordChangeBtn" class="secondary small" style="width:auto;margin-bottom:12px;margin-inline-start:8px;">🔑 طلب تعديل كلمة المرور</button>
      <div id="passwordChangeResult"></div>
      <div id="emailChangeForm" style="display:none;margin-bottom:12px;padding:10px;border:1px solid var(--border);border-radius:8px;">
        <div style="font-size:12.5px;color:#666;margin-bottom:8px;">تعديل البريد الإلكتروني (بريد الدخول) يحتاج موافقة الأدمن أولًا. اكتب البريد الجديد وابعت الطلب، وهيتم مراجعته.</div>
        <input type="email" id="newEmailInput" placeholder="البريد الإلكتروني الجديد">
        <button id="submitEmailChangeBtn" class="secondary small" style="width:auto;margin-top:8px;">إرسال الطلب</button>
        <div id="emailChangeResult"></div>
      </div>
      ${sub ? `
        <label style="font-size:13px;color:#666;">الاسم</label>
        <input type="text" id="profileNameInput" value="${escapeHtml(sub.name || '')}" style="margin-bottom:10px;">
        <label style="font-size:13px;color:#666;">رقم الهاتف</label>
        <input type="tel" id="profilePhoneInput" value="${escapeHtml(sub.phone || '')}" style="margin-bottom:10px;">
        <div style="margin-bottom:10px;font-size:13px;"><strong>إيميل التواصل:</strong> ${escapeHtml(sub.contactEmail || '-')}</div>
        <label style="font-size:13px;color:#666;">الرقم القومي (اختياري)</label>
        <input type="text" id="profileNationalIdInput" value="${escapeHtml(sub.nationalId || '')}" style="margin-bottom:10px;">
        <label style="font-size:13px;color:#666;">العنوان (اختياري)</label>
        <input type="text" id="profileAddressInput" value="${escapeHtml(sub.address || '')}" style="margin-bottom:10px;">
        <button id="saveProfileDataBtn" class="secondary" style="margin-top:6px;">💾 حفظ التعديلات</button>
        <div id="profileSaveResult"></div>
      ` : '<div style="color:#888;font-size:13px;">لسه معملتش أي اشتراك.</div>'}
    </div>

    ${sub ? `
    <h2 style="margin-top:20px;">اشتراكك الحالي</h2>
    <div class="section-card">
      <div style="margin-bottom:6px;"><strong>الباقة:</strong> ${escapeHtml(sub.planName || '-')}</div>
      <div style="margin-bottom:6px;"><strong>الحالة:</strong> ${sub.active ? '<span class="tag tag-done">نشط</span>' : '<span class="tag tag-wait">بانتظار التفعيل</span>'}</div>
      <div style="margin-bottom:6px;"><strong>ينتهي في:</strong> ${formatDateAr(sub.endDate)}</div>
      ${sub.pendingPlanName ? `<div style="margin-top:6px;color:#8a6d1b;">📅 في انتظار التفعيل: ${escapeHtml(sub.pendingPlanName)}</div>` : ''}
    </div>` : ''}

    <h2 style="margin-top:20px;">مظهر الموقع</h2>
    <div class="section-card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span>الوضع الحالي: ${theme === 'dark' ? '🌙 ليلي' : '☀️ نهاري'}</span>
        <button id="toggleThemeFromProfile" class="secondary" style="width:auto;margin:0;">تبديل</button>
      </div>
    </div>

    <h2 style="margin-top:20px;">الحساب</h2>
    <div class="section-card">
      <button id="goSubHistoryFromProfileBtn" class="secondary" style="margin-top:0;">📄 سجل اشتراكي</button>
      <button id="goReferralFromProfileBtn" class="secondary" style="margin-top:10px;">🎁 ادعُ صديق</button>
      <button id="logoutFromProfileBtn" class="danger" style="margin-top:10px;">تسجيل الخروج</button>
    </div>
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();
  document.getElementById('goSubHistoryFromProfileBtn').onclick=()=>renderMySubscriptionHistory();
  document.getElementById('goReferralFromProfileBtn').onclick=()=>renderReferralPage();
  document.getElementById('toggleThemeFromProfile').onclick=()=>{
    const toggleBtn = document.getElementById('darkModeToggle');
    if (toggleBtn) toggleBtn.click();
    renderProfilePage();
  };
  document.getElementById('logoutFromProfileBtn').onclick=async()=>{ await setSession(''); window.__screens = []; window.__screenIndex = -1; await refreshTopNav(); renderLogin(); };
  document.getElementById('requestEmailChangeToggleBtn').onclick = () => {
    const form = document.getElementById('emailChangeForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  };
  document.getElementById('requestPasswordChangeBtn').onclick = async () => {
    const resEl = document.getElementById('passwordChangeResult');
    resEl.innerHTML = '<div style="font-size:12.5px;color:#888;margin-top:6px;">جاري الإرسال...</div>';
    const r = await forgotPassword(email);
    if (r && r.success) {
      resEl.innerHTML = `<div class="info" style="margin-top:6px;">✅ ${escapeHtml(r.message)}</div>`;
    } else {
      resEl.innerHTML = '<div class="error" style="margin-top:6px;">حصل خطأ في إرسال الطلب.</div>';
    }
  };
  document.getElementById('submitEmailChangeBtn').onclick = async () => {
    const resEl = document.getElementById('emailChangeResult');
    const newEmail = document.getElementById('newEmailInput').value.trim();
    if (!newEmail) { resEl.innerHTML = '<div class="error" style="margin-top:8px;">أدخل البريد الإلكتروني الجديد.</div>'; return; }
    const r = await apiPost('/request_email_change.php', { new_email: newEmail });
    if (r && r.success) {
      resEl.innerHTML = '<div class="info" style="margin-top:8px;">✅ تم إرسال طلبك، هيتم مراجعته من الأدمن.</div>';
    } else {
      resEl.innerHTML = `<div class="error" style="margin-top:8px;">${(r&&r.message)||'حصل خطأ'}</div>`;
    }
  };
  if (sub) {
    document.getElementById('saveProfileDataBtn').onclick = async () => {
      const resEl = document.getElementById('profileSaveResult');
      const name = document.getElementById('profileNameInput').value.trim();
      const phone = document.getElementById('profilePhoneInput').value.trim();
      const nationalId = document.getElementById('profileNationalIdInput').value.trim();
      const address = document.getElementById('profileAddressInput').value.trim();
      if (!name || !phone) { resEl.innerHTML = '<div class="error" style="margin-top:8px;">الاسم ورقم الهاتف مطلوبين.</div>'; return; }
      const r = await apiPost('/update_my_profile.php', { name, phone, national_id: nationalId, address });
      if (r && r.success) {
        resEl.innerHTML = '<div class="info" style="margin-top:8px;">✅ تم حفظ التعديلات.</div>';
      } else {
        resEl.innerHTML = `<div class="error" style="margin-top:8px;">${(r&&r.message)||'حصل خطأ في الحفظ'}</div>`;
      }
    };
  }

  async function saveAvatar(dataUrl){
    const resEl = document.getElementById('avatarResult');
    const r = await apiPost('/avatar_save.php', { avatar: dataUrl });
    if (r && r.success) {
      document.getElementById('currentAvatarPreview').src = dataUrl || presets[0];
      resEl.innerHTML = '<div class="info" style="margin-top:8px;">✅ اتحفظت الصورة.</div>';
      await refreshTopNavAvatar();
    } else {
      resEl.innerHTML = `<div class="error" style="margin-top:8px;">${(r&&r.message)||'حصل خطأ في حفظ الصورة'}</div>`;
    }
  }

  document.querySelectorAll('.avatarPresetOption').forEach(img=>{
    img.onclick = () => saveAvatar(img.src);
  });

  document.getElementById('avatarUploadBtn').onclick = () => document.getElementById('avatarUploadInput').click();
  document.getElementById('avatarUploadInput').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 200;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size/img.width, size/img.height);
        const w = img.width*scale, h = img.height*scale;
        ctx.drawImage(img, (size-w)/2, (size-h)/2, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        saveAvatar(compressed);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  const removeBtn = document.getElementById('avatarRemoveBtn');
  if (removeBtn) removeBtn.onclick = () => saveAvatar(null);
}


/* ================== خطط الشبكة (Grid Trading) - أداة جديدة منفصلة عن تعزيز المتوسط ================== */
async function renderGridPlansList(){
  pushNav(() => renderGridPlansList());
  setBottomNavActive('plans');
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;

  const grids = await getGridPlans(email);
  const activeSymbols = Object.keys(grids).filter(s => !grids[s].closed);
  const closedSymbols = Object.keys(grids).filter(s => grids[s].closed);

  const hasAnyGrid = activeSymbols.length + closedSymbols.length > 0;

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>${pageTitle('grid_plans_list','🔲 خطط الشبكة (Grid)')}</div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button></div>
    <div class="info">استراتيجية "الشبكة" مناسبة للأسهم المتذبذبة جوه نطاق سعري (مش في اتجاه هابط قوي مستمر) — بتشتري في المستويات النازلة وتبيع نفس الكمية لما ترجع تعلى، وتكرر الدورة. مفيش وقف خسارة تلقائي هنا (زي ما اتفقنا) — قرار البيع بخسارة قرارك الشخصي بره منطق الأداة.</div>

    <button id="goNewGridBtn" class="btn-lightgreen">+ خطة شبكة جديدة</button>

    ${hasAnyGrid ? `<div class="std-filter-bar">
      <div class="std-filter-search"><input type="text" id="gridListSearch" placeholder="🔍 ابحث باسم السهم..."></div>
    </div>` : ''}

    <h2 style="margin-top:20px;" id="gridActiveHeading">خططك النشطة</h2>
    <div id="gridListWrap"></div>

    ${closedSymbols.length ? `<h2 style="margin-top:20px;" id="gridClosedHeading">خطط مقفولة</h2><div id="gridClosedListWrap"></div>` : ''}
    <div class="std-filter-empty" id="gridListEmpty" style="display:none;">مفيش خطط مطابقة للبحث</div>
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();
  document.getElementById('goNewGridBtn').onclick=()=>renderGridPlanForm();

  const listWrap = document.getElementById('gridListWrap');
  if (!activeSymbols.length) {
    listWrap.innerHTML = '<p style="color:#888;font-size:13px;">لسه معملتش أي خطة شبكة نشطة.</p>';
  } else {
    listWrap.innerHTML = activeSymbols.map(sym => {
      const g = grids[sym];
      const bought = g.levels.filter(l=>l.status==='bought').length;
      const totalCycles = g.levels.reduce((s,l)=>s+(l.cycles||0),0);
      return `<div class="plan-list-item" data-q="${sym.toLowerCase()}" onclick="window.__openGrid('${sym}')">
        <div><strong>${escapeHtml(sym)}</strong> <span style="font-size:11px;color:#888;">(${escapeHtml(g.market||'')})</span></div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:12px;color:#666;">مستويات مشتراة: ${bought}/${g.levels.length} — دورات مكتملة: ${totalCycles}</div>
          <button class="small secondary" style="width:auto;margin:0;" onclick="event.stopPropagation(); window.__editGridFromList('${sym}')">⚙️ تعديل الخطة</button>
        </div>
      </div>`;
    }).join('');
  }
  if (closedSymbols.length) {
    document.getElementById('gridClosedListWrap').innerHTML = closedSymbols.map(sym => `
      <div class="plan-list-item" data-q="${sym.toLowerCase()}" onclick="window.__openGrid('${sym}')" style="opacity:.7;">
        <div><strong>${escapeHtml(sym)}</strong> <span class="tag tag-wait">مقفولة</span></div>
      </div>`).join('');
  }
  window.__openGrid = (sym) => renderGridPlanDetail(sym);
  window.__editGridFromList = (sym) => renderGridEditPlanSettings(sym);

  if (hasAnyGrid) {
    wireStdFilterBar({
      searchInputId:'gridListSearch', itemSelector:'.plan-list-item', emptyStateId:'gridListEmpty',
      onApply: () => {
        const activeHeading = document.getElementById('gridActiveHeading');
        if (activeHeading) activeHeading.style.display = Array.from(listWrap.querySelectorAll('.plan-list-item')).some(el=>el.style.display!=='none') ? '' : 'none';
        const closedWrap = document.getElementById('gridClosedListWrap');
        const closedHeading = document.getElementById('gridClosedHeading');
        if (closedWrap && closedHeading) closedHeading.style.display = Array.from(closedWrap.querySelectorAll('.plan-list-item')).some(el=>el.style.display!=='none') ? '' : 'none';
      }
    });
  }
}

async function renderGridPlanForm(){
  pushNav(() => renderGridPlanForm());
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;
  const prefill = window.__prefillGridPlan || {};
  window.__prefillGridPlan = null;

  app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>${pageTitle('grid_plan_new','+ خطة شبكة جديدة')}</div><button class="secondary small" id="backBtn">🔲 كل خطط الشبكة</button></div>
    <form id="gridForm">
      <label>كود السهم</label>
      <input type="text" id="g_symbol" required placeholder="مثال: COMI">
      <label>السوق</label>
      <select id="g_market">
        <option value="مصر">مصر (EGX)</option>
        <option value="السعودية">السعودية</option>
        <option value="الإمارات">الإمارات</option>
        <option value="قطر">قطر</option>
        <option value="الكويت">الكويت</option>
      </select>
      <label>رأس المال المخصص للسهم ده</label>
      <input type="number" step="any" id="g_capital" required placeholder="مثال: 10000">
      <label>نسبة المخاطرة % (بتحدد حجم كل صفقة تلقائيًا)</label>
      <input type="number" step="any" id="g_risk" required placeholder="مثال: 5">
      <div class="info" id="g_tradeSizePreview" style="display:none;"></div>
      <label>سعر السهم الحالي</label>
      <input type="number" step="any" id="g_currentPrice" placeholder="مثال: 19.50">
      <div class="grid2">
        <div><label>سقف النطاق (أعلى سعر)</label><input type="number" step="any" id="g_high" required></div>
        <div><label>قاع النطاق (أقل سعر)</label><input type="number" step="any" id="g_low" required></div>
      </div>
      <label>عدد المستويات (هيتحدد أوتوماتيك حسب رأس المال ونسبة المخاطرة، وتقدر تعدّله)</label>
      <input type="number" id="g_levels" required>

      <label style="margin-top:16px;">طريقة توزيع الكمية على المستويات</label>
      <div class="radio-row" style="display:flex;gap:16px;margin:6px 0 12px;flex-wrap:wrap;">
        <label style="display:flex;align-items:center;gap:5px;font-weight:normal;"><input type="radio" name="g_qtyMode" value="equal" checked> توزيع متساوٍ (تلقائي)</label>
        <label style="display:flex;align-items:center;gap:5px;font-weight:normal;"><input type="radio" name="g_qtyMode" value="manual"> تحديد يدوي لكل مستوى</label>
        <label style="display:flex;align-items:center;gap:5px;font-weight:normal;"><input type="radio" name="g_qtyMode" value="progressive"> زيادة الكمية بنسبة المخاطرة مع كل مستوى</label>
      </div>

      <label style="margin-top:10px;">نسبة ربح الخروج الكلي % (اختياري)</label>
      <input type="number" step="any" id="g_exitProfitPercent" placeholder="مثال: 10">
      <div style="font-size:11px;color:#888;margin-top:4px;">لو حددتها، الموقع هيوريك عند أي سعر تقدر تخرج من كل المستويات المفتوحة مع بعض وتحقق نسبة الربح دي على متوسط تكلفتك، وهيهايلايت المستوى الأقرب لسعر الخروج ده باللون الأخضر في جدول المستويات.</div>

      <button type="button" id="genLevelsBtn" class="secondary" style="margin-top:14px;">توليد جدول المستويات</button>
    </form>

    <div id="levelsPreviewWrap" style="display:none;margin-top:16px;">
      <h2>جدول المستويات — عدّل الكمية الإرشادية لو حابب</h2>
      <div class="section-card" style="overflow-x:auto;">
        <table>
          <thead><tr><th>#</th><th>السعر المخطط</th><th>الكمية الإرشادية</th></tr></thead>
          <tbody id="levelsPreviewBody"></tbody>
        </table>
      </div>
      <button id="createGridBtn" style="margin-top:14px;">إنشاء الخطة</button>
    </div>
    <div id="gridFormResult"></div>
  </div>`;
  document.getElementById('backBtn').onclick=()=>renderGridPlansList();
  if (prefill.symbol) document.getElementById('g_symbol').value = prefill.symbol;
  if (prefill.market) document.getElementById('g_market').value = prefill.market;
  if (prefill.price) document.getElementById('g_currentPrice').value = prefill.price;

  function updatePreview(){
    const capital = parseFloat(document.getElementById('g_capital').value);
    const risk = parseFloat(document.getElementById('g_risk').value);
    const preview = document.getElementById('g_tradeSizePreview');
    if (capital > 0 && risk > 0) {
      const tradeSize = capital * risk / 100;
      const maxLevels = Math.floor(capital / tradeSize);
      document.getElementById('g_levels').value = maxLevels;
      preview.style.display = '';
      preview.textContent = `حجم كل صفقة: ${tradeSize.toFixed(2)} — أقصى عدد مستويات ممكن (بحيث رأس المال يكفي لو اتنفذت كلها): ${maxLevels}`;
    } else {
      preview.style.display = 'none';
    }
  }
  document.getElementById('g_capital').addEventListener('input', updatePreview);
  document.getElementById('g_risk').addEventListener('input', updatePreview);

  let generatedLevels = [];
  document.getElementById('genLevelsBtn').onclick = () => {
    const capital = parseFloat(document.getElementById('g_capital').value);
    const risk = parseFloat(document.getElementById('g_risk').value);
    const high = parseFloat(document.getElementById('g_high').value);
    const low = parseFloat(document.getElementById('g_low').value);
    const numLevels = parseInt(document.getElementById('g_levels').value);
    const resultEl = document.getElementById('gridFormResult');
    if (!capital || !risk || high<=low || !numLevels || numLevels<1) {
      resultEl.innerHTML = '<div class="error" style="margin-top:10px;">تأكد إن رأس المال ونسبة المخاطرة والنطاق وعدد المستويات كلهم مدخلين صح (السقف أكبر من القاع).</div>';
      return;
    }
    resultEl.innerHTML = '';
    const tradeSize = capital * risk / 100;
    const step = (high - low) / numLevels;
    const qtyMode = document.querySelector('input[name="g_qtyMode"]:checked').value;
    const baseQty = tradeSize / (high - step);
    generatedLevels = [];
    for (let i = 0; i < numLevels; i++) {
      const price = Number((high - step * (i + 1)).toFixed(4));
      let guidedQty = null;
      if (qtyMode === 'equal') guidedQty = Number((tradeSize/price).toFixed(2));
      else if (qtyMode === 'progressive') guidedQty = Number((baseQty * Math.pow(1 + risk/100, i)).toFixed(2));
      generatedLevels.push({ plannedPrice: price, plannedQty: guidedQty });
    }
    document.getElementById('levelsPreviewBody').innerHTML = generatedLevels.map((lv,idx)=>`<tr>
      <td>${idx+1}</td>
      <td>${lv.plannedPrice}</td>
      <td><input type="number" step="any" min="0" id="prevQty_${idx}" value="${lv.plannedQty??''}" placeholder="أدخل الكمية" style="max-width:120px;"></td>
    </tr>`).join('');
    document.getElementById('levelsPreviewWrap').style.display = '';
  };

  document.getElementById('createGridBtn').onclick = async () => {
    const symbol = document.getElementById('g_symbol').value.trim().toUpperCase();
    const market = document.getElementById('g_market').value;
    const capital = parseFloat(document.getElementById('g_capital').value);
    const risk = parseFloat(document.getElementById('g_risk').value);
    const high = parseFloat(document.getElementById('g_high').value);
    const low = parseFloat(document.getElementById('g_low').value);
    const numLevels = generatedLevels.length;
    const resultEl = document.getElementById('gridFormResult');

    if (!symbol) {
      resultEl.innerHTML = '<div class="error" style="margin-top:10px;">أدخل كود السهم.</div>';
      return;
    }
    const existingDacPlans = await getPlans(email);
    if (existingDacPlans[symbol]) {
      resultEl.innerHTML = '<div class="error" style="margin-top:10px;">السهم ده عنده خطة تعزيز متوسط (DCA) بالفعل — مينفعش نفس السهم يكون في خطتين في نفس الوقت. احذف خطة الـDCA الأول لو عايز تبدأ خطة شبكة بدالها.</div>';
      return;
    }
    const tradeSize = capital * risk / 100;
    const step = (high - low) / numLevels;
    const levels = generatedLevels.map((glv, idx) => {
      const qtyInput = document.getElementById('prevQty_'+idx);
      const q = parseFloat(qtyInput.value);
      return {
        plannedPrice: glv.plannedPrice,
        plannedQty: (!isNaN(q) && q>0) ? q : null,
        executedQty: null, executedPrice: null, executedDate: null,
        status: 'empty', sellTargetPrice: null,
        sells: [],
        cycles: 0,
      };
    });
    const currentPrice = parseFloat(document.getElementById('g_currentPrice').value) || null;
    const grids = await getGridPlans(email);
    const exitProfitPercent = parseFloat(document.getElementById('g_exitProfitPercent').value);
    grids[symbol] = { symbol, market, currentPrice, capital, risk, tradeSize, rangeHigh: high, rangeLow: low, step, levels, manualExits: [], cycleHistory: [], closedTrades: [], closed: false, exitProfitPercent: (!isNaN(exitProfitPercent) && exitProfitPercent>0) ? exitProfitPercent : null, createdAt: new Date().toISOString() };
    await saveGridPlans(email, grids);
    renderGridPlanDetail(symbol);
  };
}

async function renderGridPlanDetail(symbol){
  pushNav(() => renderGridPlanDetail(symbol));
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;

  let grids = await getGridPlans(email);
  let g = grids[symbol];
  if (!g) return renderGridPlansList();
  if (!g.cycleHistory) g.cycleHistory = [];
  if (!g.closedTrades) g.closedTrades = [];
  g.levels.forEach(lv=>{ if(!lv.sells) lv.sells = []; });

  const totalProfit = g.cycleHistory.length ? g.cycleHistory[g.cycleHistory.length-1].cumulative : 0;

  function computeGridSummary(){
    const boughtLevels = g.levels.filter(l=>l.status==='bought' && l.executedQty>0);
    const heldQty = boughtLevels.reduce((s,l)=>s+l.executedQty, 0);
    const totalInvested = boughtLevels.reduce((s,l)=>s+(l.executedQty*l.executedPrice), 0);
    const avgCostCurrent = heldQty>0 ? totalInvested/heldQty : null;
    const avgSellTarget = heldQty>0 ? boughtLevels.reduce((s,l)=>s+(l.sellTargetPrice*l.executedQty), 0)/heldQty : null;
    const expectedProfitIfSoldNow = boughtLevels.reduce((s,l)=>s+((l.sellTargetPrice-l.executedPrice)*l.executedQty), 0);
    const exitTargetPrice = (avgCostCurrent!=null && g.exitProfitPercent) ? avgCostCurrent * (1 + g.exitProfitPercent/100) : null;
    return { heldQty, totalInvested, avgCostCurrent, avgSellTarget, expectedProfitIfSoldNow, exitTargetPrice };
  }
  let gsum = computeGridSummary();

  function computeClosedAgg(){
    return g.closedTrades.reduce((acc,ct)=>({ qty: acc.qty+ct.totalQty, capital: acc.capital+ct.capitalUsed, profit: acc.profit+ct.profit }), {qty:0, capital:0, profit:0});
  }
  let closedAgg = computeClosedAgg();
  let closedAggProfitPercent = closedAgg.capital>0 ? (closedAgg.profit/closedAgg.capital*100) : 0;

  window.__lastPageKey='grid_plan_detail'; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div style="background:var(--green-dark);color:#fff;padding:10px 16px;border-radius:10px;margin-bottom:14px;font-weight:700;font-size:15px;">
      🔲 ${escapeHtml(symbol)} — خطة شبكة <span style="font-weight:400;font-size:12.5px;opacity:.85;">(${escapeHtml(g.market||'')} — بدأت ${formatDateAr(g.createdAt)}) ${g.closed ? ' — مقفولة' : ''}</span>
    </div>
    <div class="topbar">
      <div></div>
      <div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button> <button class="secondary small" id="exportXlsGridBtn">⬇ تصدير Excel</button> <button class="secondary small" id="exportPdfGridBtn">🖨 تصدير PDF (طباعة)</button> <button class="secondary small" id="backBtn">🔲 كل خطط الشبكة</button></div>
    </div>

    <div class="section-card">
      <button class="small secondary" id="gridEditSettingsBtn" style="width:auto;">⚙️ تعديل إعدادات وخطة السهم</button>
    </div>

    <div class="section-card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <span>رأس المال الحالي المخصص للسهم:</span>
      <input type="number" step="any" id="gridCapitalInput" value="${g.capital}" style="max-width:160px;">
      <button class="small" id="gridUpdateCapitalBtn" style="width:auto;">تحديث</button>
    </div>

    <div class="section-card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <span>نسبة ربح الخروج الكلي % (لخروج كل المستويات المفتوحة مع بعض)</span>
      <input type="number" step="any" id="gridExitProfitInput" value="${g.exitProfitPercent??''}" placeholder="مثال: 10" style="max-width:160px;">
      <button class="small" id="gridUpdateExitProfitBtn" style="width:auto;">تحديث</button>
    </div>
    ${gsum.exitTargetPrice!=null ? `<div class="info">🎯 لو السعر وصل <strong>${fmt2(gsum.exitTargetPrice)}</strong>، بيع كل المستويات المفتوحة دلوقتي هيحقق نسبة ربح ${g.exitProfitPercent}% على متوسط تكلفتك — المستوى الأقرب لده متهايلايت بالأخضر في الجدول تحت.</div>` : ''}

    <div class="summary-cards">
      <div class="summary-card"><div class="val">${fmtMoney(gsum.avgCostCurrent)}</div><div class="lbl">متوسط التكلفة الحالي</div></div>
      <div class="summary-card"><div class="val">${fmtMoney(gsum.avgSellTarget)}</div><div class="lbl">هدف البيع (متوسط)</div></div>
      <div class="summary-card"><div class="val" id="gridHeldQty">${fmtQty(gsum.heldQty)}</div><div class="lbl">الكمية المتبقية حاليًا</div></div>
      <div class="summary-card"><div class="val">${fmtMoney(gsum.totalInvested)}</div><div class="lbl">إجمالي المبلغ المستثمر</div></div>
      <div class="summary-card"><div class="val ${gsum.expectedProfitIfSoldNow>=0?'pos':'neg'}">${fmtMoney(gsum.expectedProfitIfSoldNow)}</div><div class="lbl">الربح المتوقع لو البيع الآن</div></div>
      <div class="summary-card"><div class="val ${totalProfit>=0?'pos':'neg'}">${fmtMoney(totalProfit)}</div><div class="lbl">الربح المحقق حتى الآن</div></div>
    </div>

    <h2 style="margin-top:20px;">موقف السهم على آخر سعر</h2>
    <div class="section-card">
      <label>آخر سعر (اختياري - إدخال يدوي، لو فاضي هياخد آخر سعر شراء فعلي تم تنفيذه)</label>
      <input type="number" step="any" id="gridManualLastPriceInput" value="${g.manualLastPrice??''}" placeholder="مثال: 45.20" style="font-weight:bold;color:#111;font-size:16px;">
      <div class="summary-cards" style="margin-top:12px;">
        <div class="summary-card"><div class="val" id="gridStatusLastPriceUsed">-</div><div class="lbl">السعر المستخدم في الحساب</div></div>
        <div class="summary-card"><div class="val" id="gridStatusTotalValue">-</div><div class="lbl">إجمالي القيمة الحالية للكمية المملوكة</div></div>
        <div class="summary-card"><div class="val" id="gridStatusDropPercent">-</div><div class="lbl">نسبة الانخفاض عن متوسط التكلفة</div></div>
      </div>
      <div id="rangeAlertWrap" style="margin-top:10px;"><div id="rangeAlert"></div></div>
    </div>

    <h2 style="margin-top:20px;">منحنى الربح التراكمي</h2>
    <div class="section-card" id="curveWrap"></div>

    <h2 style="margin-top:20px;">مستويات الشبكة</h2>
    <div class="section-card" style="overflow-x:auto;">
      <table>
        <thead><tr><th>المستوى المخطط</th><th>الكمية الإرشادية</th><th>الحالة</th><th>الشراء الفعلي</th><th>هدف البيع</th><th>عمليات البيع الفعلي</th><th>دورات</th><th>الكمية المتبقية تراكمي</th><th>متوسط التكلفة تراكمي</th><th>هدف البيع تراكمي</th><th>الربح المحقق تراكمي</th></tr></thead>
        <tbody id="gridLevelsBody"></tbody>
      </table>
    </div>

    <h2 style="margin-top:20px;">سجل الصفقات المغلقة — ${symbol}</h2>
    <div id="gridClosedTradesWrap"></div>

    <h2 style="margin-top:20px;">بيع كل الكمية المتبقية في كل المستويات (خروج فوري من كل المراكز المفتوحة)</h2>
    <div class="section-card">
      <div class="info" id="gridSellAllInfo">مفيش كمية مشتراة حاليًا لبيعها.</div>
      <label>اكتب هنا السعر الفعلي اللي هتبيع بيه دلوقتي (هيتطبق على كل المستويات المفتوحة دفعة واحدة)</label>
      <input type="number" step="any" id="sellAllPrice" placeholder="مثال: 45.20" style="font-weight:bold;color:#111;font-size:16px;">
      <div style="font-size:11px;color:#888;margin-top:4px;">ده مش سعر تلقائي — لازم تكتب السعر اللي البورصة فيه دلوقتي بنفسك.</div>
      <button id="sellAllBtn" class="danger" style="margin-top:8px;">بيع كل الكمية المتبقية دلوقتي</button>
      <div id="sellAllResult"></div>
    </div>

    <h2 style="margin-top:20px;">${g.closed ? 'إعادة فتح الخطة' : 'إغلاق الخطة'}</h2>
    <div class="section-card">
      <p style="font-size:12.5px;color:#666;">${g.closed ? 'الخطة دي مقفولة حاليًا ومش بتظهر كنشطة. تقدر تفتحها تاني وقت ما حبيت.' : 'قفل الخطة بيوقف التنبيهات والتتبع النشط ليها من غير ما يمسح أي بيانات — تقدر تفتحها تاني وقت ما حبيت.'}</p>
      <button id="toggleCloseBtn" class="${g.closed ? '' : 'danger'}">${g.closed ? 'إعادة فتح الخطة' : 'إغلاق الخطة'}</button>
    </div>
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();
  document.getElementById('backBtn').onclick=()=>renderGridPlansList();
  document.getElementById('gridEditSettingsBtn').onclick=()=>renderGridEditPlanSettings(symbol);

  (function renderCurveInline(){
    const points = g.cycleHistory.map(c => ({ label: c.date, value: c.cumulative }));
    const chartImg = renderCumulativeProfitChart(points, `الربح التراكمي — ${symbol}`);
    document.getElementById('curveWrap').innerHTML = `<img src="${chartImg}" style="width:100%;border-radius:8px;">`;
  })();

  document.getElementById('exportXlsGridBtn').onclick = () => {
    const points = g.cycleHistory.map(c => ({ label: c.date, value: c.cumulative }));
    const chartImg = renderCumulativeProfitChart(points, `الربح التراكمي — ${symbol}`);
    const rowsHtml = g.levels.map(lv => `<tr>
      <td>${lv.plannedPrice}</td>
      <td>${lv.status==='empty'?'فاضي':'مشترى - بانتظار البيع'}</td>
      <td>${lv.executedPrice ?? ''}</td><td>${lv.executedQty ?? ''}</td>
      <td>${lv.sellTargetPrice!=null?lv.sellTargetPrice.toFixed(3):''}</td>
      <td>${(lv.sells||[]).map(s=>`${s.qty}@${s.price}`).join(', ')}</td><td>${lv.cycles||0}</td>
    </tr>`).join('');
    const html = `<html><head><meta charset="UTF-8"></head><body dir="rtl">
      ${reportLogoHeaderHtml()}
      <h1 style="color:#14532d;">GRIFFINE — تقرير خطة شبكة: ${symbol}</h1>
      <p>السوق: ${g.market||'-'} | رأس المال: ${g.capital} | حجم الصفقة: ${g.tradeSize} | النطاق: ${g.rangeLow} إلى ${g.rangeHigh} | تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}</p>
      <table border="1" style="width:100%;border-collapse:collapse;">
        <tr style="background:#14532d;color:#fff;"><th>المستوى المخطط</th><th>الحالة</th><th>سعر شراء فعلي</th><th>كمية شراء</th><th>هدف بيع</th><th>عمليات بيع فعلي</th><th>دورات</th></tr>
        ${rowsHtml}
      </table>
      <div style="margin-top:16px;font-size:14px;background:#f0f4f2;padding:10px;border-radius:8px;">
        <strong>الإجمالي:</strong> دورات مكتملة: ${g.levels.reduce((s,l)=>s+(l.cycles||0),0)} | الربح الإجمالي المحقق: ${totalProfit.toFixed(2)}
      </div>
      </body></html>`;
    buildAndDownloadMhtmlXls(html, chartImg, `griffine_${symbol}_تقرير_شبكة.xls`);
  };

  document.getElementById('exportPdfGridBtn').onclick = () => {
    const w = window.open('', '_blank');
    const rowsHtml = g.levels.map(lv => `<tr>
      <td>${lv.plannedPrice}</td>
      <td>${lv.status==='empty'?'فاضي':'مشترى - بانتظار البيع'}</td>
      <td>${lv.executedPrice ?? '-'}</td><td>${lv.executedQty ?? '-'}</td>
      <td>${lv.sellTargetPrice!=null?lv.sellTargetPrice.toFixed(3):'-'}</td>
      <td>${(lv.sells||[]).map(s=>`${s.qty}@${s.price}`).join(', ') || '-'}</td><td>${lv.cycles||0}</td>
    </tr>`).join('');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير خطة شبكة ${symbol}</title>
      <style>body{font-family:Tahoma,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin-top:14px;}
      th,td{border:1px solid #ccc;padding:8px;text-align:center;font-size:13px;} th{background:#14532d;color:#fff;}
      h1{color:#14532d;} .agg{margin-top:16px;font-size:14px;background:#f0f4f2;padding:10px;border-radius:8px;}</style></head>
      <body>
      ${reportLogoHeaderHtml()}
      <h1>GRIFFINE — تقرير خطة شبكة: ${symbol}</h1>
      <p>السوق: ${g.market||'-'} | رأس المال: ${g.capital} | حجم الصفقة: ${g.tradeSize} | النطاق: ${g.rangeLow} إلى ${g.rangeHigh} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
      <table><thead><tr><th>المستوى المخطط</th><th>الحالة</th><th>سعر شراء فعلي</th><th>كمية شراء</th><th>هدف بيع</th><th>عمليات بيع فعلي</th><th>دورات</th></tr></thead>
      <tbody>${rowsHtml}</tbody></table>
      <div class="agg"><strong>الإجمالي:</strong> دورات مكتملة: ${g.levels.reduce((s,l)=>s+(l.cycles||0),0)} | الربح الإجمالي المحقق: ${totalProfit.toFixed(2)}</div>
      <script>window.onload = () => window.print();<\/script>
      </body></html>`);
    w.document.close();
  };

  renderClosedTradesUI('gridClosedTradesWrap', () => g.closedTrades, {
    afterChange: async () => { await persist(); },
    onClearAll: async () => { g.closedTrades = []; await persist(); },
    onExportXlsx: (trades) => {
      const exAgg = trades.reduce((acc,t)=>({qty:acc.qty+t.totalQty, capital:acc.capital+t.capitalUsed, profit:acc.profit+t.profit}), {qty:0,capital:0,profit:0});
      const exPct = exAgg.capital>0 ? (exAgg.profit/exAgg.capital*100) : 0;
      const rowsHtml = trades.slice().reverse().map(ct=>`<tr>
        <td>${formatDateTimeAr(ct.closedDate)}</td><td>${fmtQty(ct.totalQty)}</td><td>${fmt2(ct.avgEntry)}</td>
        <td>${fmt2(ct.avgExit)}</td><td>${ct.profit.toFixed(2)}</td><td>${ct.profitPercent.toFixed(2)}%</td><td>${ct.capitalUsed.toFixed(2)}</td>
      </tr>`).join('');
      const html = `<html><head><meta charset="UTF-8"></head><body dir="rtl">
        ${reportLogoHeaderHtml()}
        <h1 style="color:#14532d;">GRIFFINE — سجل الصفقات المغلقة (شبكة): ${symbol}</h1>
        <p>تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}</p>
        <table border="1" style="width:100%;border-collapse:collapse;">
          <tr style="background:#14532d;color:#fff;"><th>تاريخ ووقت الإغلاق</th><th>الكمية</th><th>متوسط الدخول</th><th>متوسط الخروج</th><th>الربح</th><th>نسبة الربح</th><th>رأس المال المستخدم</th></tr>
          ${rowsHtml}
        </table>
        <div style="margin-top:16px;font-size:14px;background:#f0f4f2;padding:10px;border-radius:8px;">
          <strong>الإجمالي:</strong> الكمية: ${fmtQty(exAgg.qty)} | رأس المال: ${exAgg.capital.toFixed(2)} | الربح: ${exAgg.profit.toFixed(2)} | النسبة: ${exPct.toFixed(2)}%
        </div>
        </body></html>`;
      buildAndDownloadMhtmlXls(html, null, `griffine_${symbol}_صفقات_مغلقة_شبكة.xls`);
    },
    onExportPdf: (trades) => {
      const w = window.open('', '_blank');
      const exAgg = trades.reduce((acc,t)=>({qty:acc.qty+t.totalQty, capital:acc.capital+t.capitalUsed, profit:acc.profit+t.profit}), {qty:0,capital:0,profit:0});
      const exPct = exAgg.capital>0 ? (exAgg.profit/exAgg.capital*100) : 0;
      const rowsHtml = trades.slice().reverse().map(ct=>`<tr>
        <td>${formatDateTimeAr(ct.closedDate)}</td><td>${fmtQty(ct.totalQty)}</td><td>${fmt2(ct.avgEntry)}</td>
        <td>${fmt2(ct.avgExit)}</td><td>${fmt2(ct.profit)}</td><td>${ct.profitPercent.toFixed(2)}%</td><td>${fmt2(ct.capitalUsed)}</td>
      </tr>`).join('');
      w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>سجل صفقات مغلقة ${symbol}</title>
        <style>body{font-family:Tahoma,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin-top:14px;}
        th,td{border:1px solid #ccc;padding:8px;text-align:center;font-size:13px;} th{background:#14532d;color:#fff;}
        h1{color:#14532d;} .agg{margin-top:16px;font-size:14px;background:#f0f4f2;padding:10px;border-radius:8px;}</style></head>
        <body>
        ${reportLogoHeaderHtml()}
        <h1>GRIFFINE — سجل الصفقات المغلقة (شبكة): ${symbol}</h1>
        <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
        <table><thead><tr><th>تاريخ ووقت الإغلاق</th><th>الكمية</th><th>متوسط الدخول</th><th>متوسط الخروج</th><th>الربح</th><th>نسبة الربح</th><th>رأس المال المستخدم</th></tr></thead>
        <tbody>${rowsHtml}</tbody></table>
        <div class="agg"><strong>الإجمالي:</strong> الكمية: ${fmtQty(exAgg.qty)} | رأس المال: ${exAgg.capital.toFixed(2)} | الربح: ${exAgg.profit.toFixed(2)} | النسبة: ${exPct.toFixed(2)}%</div>
        <script>window.onload = () => window.print();<\/script>
        </body></html>`);
      w.document.close();
    },
  });

  document.getElementById('toggleCloseBtn').onclick = async () => {
    g.closed = !g.closed;
    await persist();
    renderGridPlanDetail(symbol);
  };

  document.getElementById('gridUpdateCapitalBtn').onclick = async () => {
    const newCap = parseFloat(document.getElementById('gridCapitalInput').value);
    if (!newCap || newCap<=0) { alert('أدخل رأس مال أكبر من صفر'); return; }
    g.capital = newCap;
    await persist();
    renderGridPlanDetail(symbol);
  };

  document.getElementById('gridUpdateExitProfitBtn').onclick = async () => {
    const val = parseFloat(document.getElementById('gridExitProfitInput').value);
    g.exitProfitPercent = (!isNaN(val) && val>0) ? val : null;
    await persist();
    renderGridPlanDetail(symbol);
  };

  document.getElementById('gridManualLastPriceInput').addEventListener('input', updateStatusCards);
  document.getElementById('gridManualLastPriceInput').addEventListener('change', async ()=>{
    const val = parseFloat(document.getElementById('gridManualLastPriceInput').value);
    g.manualLastPrice = isNaN(val) ? null : val;
    await persist();
  });
  function updateStatusCards(){
    gsum = computeGridSummary();
    const manualVal = parseFloat(document.getElementById('gridManualLastPriceInput').value);
    const lastPrice = !isNaN(manualVal) && document.getElementById('gridManualLastPriceInput').value !== '' ? manualVal : (() => {
      const executions = g.levels.flatMap(l => [l.executedPrice, ...(l.sells||[]).map(s=>s.price)]).filter(p => p != null);
      return executions.length ? executions[executions.length-1] : null;
    })();
    document.getElementById('gridStatusLastPriceUsed').textContent = lastPrice!=null ? fmtMoney(lastPrice) : '-';
    document.getElementById('gridStatusTotalValue').textContent = (lastPrice!=null && gsum.heldQty>0) ? fmtMoney(lastPrice*gsum.heldQty) : '-';
    const dropEl = document.getElementById('gridStatusDropPercent');
    if (lastPrice!=null && gsum.avgCostCurrent>0) {
      const pct = (lastPrice-gsum.avgCostCurrent)/gsum.avgCostCurrent*100;
      dropEl.textContent = pct.toFixed(2)+'%';
      dropEl.className = 'val ' + (pct<0?'neg':'pos');
    } else { dropEl.textContent = '-'; dropEl.className = 'val'; }

    const alertEl = document.getElementById('rangeAlert');
    if (lastPrice == null) {
      alertEl.innerHTML = '<p style="color:#888;font-size:13px;">لسه مفيش تنفيذ فعلي مسجّل.</p>';
    } else if (lastPrice < g.rangeLow) {
      alertEl.innerHTML = `<div class="error">⚠️ آخر سعر مسجّل (${lastPrice}) كسر قاع النطاق (${g.rangeLow}) — فرضية التذبذب ممكن تكون بطلت صحيحة. القرار قرارك الشخصي (الاحتفاظ لحد الارتداد، أو بيع كل الكمية من القسم تحت).</div>`;
    } else if (lastPrice > g.rangeHigh) {
      alertEl.innerHTML = `<div class="info">📈 آخر سعر مسجّل (${lastPrice}) كسر سقف النطاق (${g.rangeHigh}) لأعلى — ده تنبيه بس، ممكن تسيب الباقي يجري أو تراجع النطاق.</div>`;
    } else {
      alertEl.innerHTML = `<div class="info">آخر سعر مسجّل: <strong>${lastPrice}</strong> — لسه جوه النطاق (${g.rangeLow} - ${g.rangeHigh}).</div>`;
    }

    const sellAllInfo = document.getElementById('gridSellAllInfo');
    if (gsum.heldQty > 0) {
      sellAllInfo.textContent = `إجمالي الكمية المتبقية في كل المستويات المشتراة: ${fmtQty(gsum.heldQty)} — متوسط سعر الشراء: ${fmtMoney(gsum.avgCostCurrent)}`;
    } else {
      sellAllInfo.textContent = 'مفيش كمية مشتراة حاليًا لبيعها.';
    }
  }

  async function persist(){
    grids[symbol] = g;
    await saveGridPlans(email, grids);
  }

  // ترحيل دورة مكتملة لسجل الصفقات المغلقة + منحنى الربح، ويظهر إشعار للمستخدم زي ما بيحصل في DCA
  function closeCycle(lv, closeDate){
    lv.cycles = (lv.cycles || 0) + 1;
    const totalSoldQty = lv.sells.reduce((s,sl)=>s+sl.qty, 0);
    const totalCycleProfit = lv.sells.reduce((s,sl)=>s+((sl.price-lv.executedPrice)*sl.qty), 0);
    const avgExit = totalSoldQty>0 ? lv.sells.reduce((s,sl)=>s+(sl.price*sl.qty),0)/totalSoldQty : lv.executedPrice;
    const capitalUsed = totalSoldQty * lv.executedPrice;
    const prevCum = g.cycleHistory.length ? g.cycleHistory[g.cycleHistory.length-1].cumulative : 0;
    g.cycleHistory.push({ date: closeDate, profit: totalCycleProfit, cumulative: prevCum + totalCycleProfit });
    g.closedTrades.push({
      closedDate: closeDate, totalQty: totalSoldQty, avgEntry: lv.executedPrice, avgExit,
      profit: totalCycleProfit, profitPercent: capitalUsed>0 ? (totalCycleProfit/capitalUsed*100) : 0,
      capitalUsed,
    });
    lv.status = 'empty';
    lv.executedQty = null; lv.executedPrice = null; lv.executedDate = null; lv.sellTargetPrice = null; lv.sells = [];
  }

  // نسخة مجمّعة لغلق كل المستويات المفتوحة مع بعض كصفقة واحدة مغلقة (صف واحد في السجل) - تُستخدم بس مع "بيع كل الكمية المتبقية"
  function closeCycleCombined(levelsToClose, closeDate){
    let totalSoldQty = 0, totalCapitalUsed = 0, totalProfit = 0, totalExitValue = 0;
    levelsToClose.forEach(lv => {
      const lvSoldQty = lv.sells.reduce((s,sl)=>s+sl.qty, 0);
      const lvProfit = lv.sells.reduce((s,sl)=>s+((sl.price-lv.executedPrice)*sl.qty), 0);
      const lvExitValue = lv.sells.reduce((s,sl)=>s+(sl.price*sl.qty), 0);
      totalSoldQty += lvSoldQty;
      totalCapitalUsed += lvSoldQty * lv.executedPrice;
      totalProfit += lvProfit;
      totalExitValue += lvExitValue;
      lv.cycles = (lv.cycles || 0) + 1;
      lv.status = 'empty';
      lv.executedQty = null; lv.executedPrice = null; lv.executedDate = null; lv.sellTargetPrice = null; lv.sells = [];
    });
    const avgEntry = totalSoldQty>0 ? totalCapitalUsed/totalSoldQty : 0;
    const avgExit = totalSoldQty>0 ? totalExitValue/totalSoldQty : 0;
    const prevCum = g.cycleHistory.length ? g.cycleHistory[g.cycleHistory.length-1].cumulative : 0;
    g.cycleHistory.push({ date: closeDate, profit: totalProfit, cumulative: prevCum + totalProfit });
    g.closedTrades.push({
      closedDate: closeDate, totalQty: totalSoldQty, avgEntry, avgExit,
      profit: totalProfit, profitPercent: totalCapitalUsed>0 ? (totalProfit/totalCapitalUsed*100) : 0,
      capitalUsed: totalCapitalUsed,
    });
  }

  function renderLevels(){
    let exitHighlightIdx = null;
    if (gsum.exitTargetPrice != null) {
      let bestDiff = Infinity;
      g.levels.forEach((lv, idx) => {
        const diff = Math.abs(lv.plannedPrice - gsum.exitTargetPrice);
        if (diff < bestDiff) { bestDiff = diff; exitHighlightIdx = idx; }
      });
    }
    let cumQty = 0, cumInvested = 0, cumSellTargetWeighted = 0, cumRealizedProfit = 0;
    document.getElementById('gridLevelsBody').innerHTML = g.levels.map((lv, idx) => {
      if (lv.status === 'bought' && lv.executedQty > 0) {
        cumQty += lv.executedQty;
        cumInvested += lv.executedQty * lv.executedPrice;
        cumSellTargetWeighted += lv.sellTargetPrice * lv.executedQty;
        cumRealizedProfit += (lv.sells||[]).reduce((s,sl)=>s+((sl.price-lv.executedPrice)*sl.qty), 0);
      }
      const cumAvgCost = cumQty>0 ? cumInvested/cumQty : null;
      const cumSellTarget = cumQty>0 ? cumSellTargetWeighted/cumQty : null;

      let buyCell = '-';
      if (lv.status === 'empty') {
        buyCell = `<div class="trade-group">
          <div class="trade-fields">
            <input type="number" step="any" min="0.0001" placeholder="كمية${lv.plannedQty?` (إرشادي ${fmtQty(lv.plannedQty)})`:''}" value="${lv.plannedQty??''}" id="gridBuyQty_${idx}">
            <input type="number" step="any" placeholder="سعر" id="gridBuyPrice_${idx}">
          </div>
          <button class="trade-btn-buy" onclick="window.__gridBuyLevel(${idx})">تسجيل شراء فعلي</button>
        </div>`;
      } else if (window.__gridEditingBuy === (symbol+':'+idx)) {
        buyCell = `<div class="trade-group">
          <div class="trade-fields">
            <input type="number" step="any" min="0.0001" id="gridEditBuyQty_${idx}" value="${lv.executedQty}">
            <input type="number" step="any" id="gridEditBuyPrice_${idx}" value="${lv.executedPrice}">
          </div>
          <button class="trade-btn-buy" onclick="window.__gridUpdateBuy(${idx})">حفظ</button>
        </div>`;
      } else {
        buyCell = `<div class="buy-cell">الكمية: <strong>${fmtQty(lv.executedQty)}</strong> | السعر: <strong>${lv.executedPrice}</strong><br>
          <button class="small secondary" onclick="window.__gridStartEditBuy(${idx})">تعديل</button>
          <button class="small danger" onclick="window.__gridDeleteBuy(${idx})">حذف</button>
        </div>`;
      }

      let sellCell = '-';
      if (lv.status === 'bought') {
        sellCell = '';
        let cumSoldQty = 0, cumSoldValue = 0, cumProfit = 0;
        (lv.sells||[]).forEach((s, sIdx) => {
          cumSoldQty += s.qty; cumSoldValue += s.qty*s.price;
          const p = (s.price - lv.executedPrice) * s.qty;
          cumProfit += p;
          if (window.__gridEditingSell === (symbol+':'+idx+':'+sIdx)) {
            sellCell += `<div class="trade-group">
              <div class="trade-fields">
                <input type="number" step="any" min="0.0001" id="gridEditSellQty_${idx}_${sIdx}" value="${s.qty}">
                <input type="number" step="any" id="gridEditSellPrice_${idx}_${sIdx}" value="${s.price}">
              </div>
              <button class="trade-btn-sell" onclick="window.__gridUpdateSell(${idx}, ${sIdx})">حفظ</button>
              <button class="small danger" style="width:100%;margin-top:3px;" onclick="window.__gridRemoveSell(${idx}, ${sIdx})">حذف</button>
            </div>`;
          } else {
            sellCell += `<div class="sell-line"><span>الكمية: <strong>${fmtQty(s.qty)}</strong> | السعر: <strong>${s.price}</strong> (ربح ${fmt2(p)})</span>
              <button class="small secondary" onclick="window.__gridStartEditSell(${idx}, ${sIdx})">✎</button></div>`;
          }
        });
        if (cumSoldQty > 0) {
          const avgSellPrice = cumSoldValue / cumSoldQty;
          sellCell += `<div class="info" style="margin-top:4px;font-size:11px;padding:6px 8px;">تراكمي على المستوى ده: بيعت ${fmtQty(cumSoldQty)} بمتوسط سعر ${fmt2(avgSellPrice)} — ${cumProfit>=0?'ربح':'خسارة'} ${fmt2(Math.abs(cumProfit))} لحد دلوقتي</div>`;
        }
        if (lv.executedQty <= 1e-6) {
          sellCell += `<div class="success-banner" style="margin-top:6px;padding:8px;font-size:12px;">
            🎉 <strong>اتباعت الكمية كلها — الدورة جاهزة للترحيل!</strong><br>
            لسه تقدر تعدّل أي عملية بيع فوق لو لاقيت غلطة. لما تتأكد، اضغط ترحيل عشان تقفل الدورة وتبدأ دورة جديدة على المستوى ده.
            <button class="small" style="margin-top:6px;width:100%;" onclick="window.__gridArchiveCycle(${idx})">✅ ترحيل الدورة وبدء دورة جديدة</button>
          </div>`;
        } else {
        sellCell += `<div class="trade-group" style="margin-top:4px;">
          <div style="font-size:10px;color:#888;margin-bottom:3px;">أقصى كمية متاحة للبيع: ${fmtQty(lv.executedQty)}</div>
          <div class="trade-fields">
            <input type="number" step="any" min="0.0001" max="${lv.executedQty}" placeholder="كمية (أقصى ${fmtQty(lv.executedQty)})" id="gridSellQty_${idx}">
            <input type="number" step="any" placeholder="سعر" value="${lv.sellTargetPrice!=null?lv.sellTargetPrice.toFixed(3):''}" id="gridSellPrice_${idx}">
          </div>
          <button class="trade-btn-sell" onclick="window.__gridSellAtLevel(${idx}, ${lv.executedQty})">+ بيع</button>
        </div>`;
        }
      }

      return `<tr${idx===exitHighlightIdx ? ' style="background:#c8f0d8;"' : ''}>
        <td>${lv.plannedPrice}${idx===exitHighlightIdx ? ' <span class="tag" style="background:#1b8a5a;color:#fff;">🎯 نقطة خروج</span>' : ''}</td>
        <td>${lv.plannedQty!=null?fmtQty(lv.plannedQty):'-'}</td>
        <td>${lv.status==='empty'?'<span class="tag tag-wait">فاضي</span>':(lv.executedQty<=1e-6?'<span class="tag tag-done">جاهزة للترحيل</span>':'<span class="tag tag-next">مشترى - بانتظار البيع</span>')}</td>
        <td>${buyCell}</td>
        <td>${lv.sellTargetPrice!=null?lv.sellTargetPrice.toFixed(3):'-'}</td>
        <td>${sellCell}</td>
        <td>${lv.cycles||0}</td>
        <td>${cumQty>0?fmtQty(cumQty):'-'}</td>
        <td>${cumAvgCost!=null?fmt2(cumAvgCost):'-'}</td>
        <td>${cumSellTarget!=null?fmt2(cumSellTarget):'-'}</td>
        <td class="${cumRealizedProfit<0?'neg':cumRealizedProfit>0?'pos':''}">${fmt2(cumRealizedProfit)}</td>
      </tr>`;
    }).join('');

    updateStatusCards();
  }
  renderLevels();

  window.__gridBuyLevel = async (idx) => {
    const qty = parseFloat(document.getElementById('gridBuyQty_'+idx).value);
    const price = parseFloat(document.getElementById('gridBuyPrice_'+idx).value);
    if(!qty || qty<=0 || !price){ alert('أدخل الكمية والسعر (رقم أكبر من صفر - ممكن يكون كسر عشري)'); return; }
    const gridsNow = await getGridPlans(email);
    const gNow = gridsNow[symbol];
    const currentlyInvested = gNow.levels.filter(l=>l.status==='bought').reduce((s,l)=>s+(l.executedQty*l.executedPrice), 0);
    const newAmount = qty*price;
    const remainingBudget = gNow.capital - currentlyInvested;
    if (newAmount > remainingBudget + 1e-6) {
      alert(`⚠️ تجاوز حد رأس المال المخصص للسهم!\nالمبلغ اللي بتحاول تشتري بيه (${newAmount.toFixed(2)}) أكبر من المتاح.\nالمتبقي المتاح للشراء حاليًا هو: ${Math.max(remainingBudget,0).toFixed(2)} فقط، عشان إجمالي المشتريات لا يتجاوز ${gNow.capital} (رأس المال المخصص للسهم).\n\nلو عايز تشتري بمبلغ أكبر، زوّد رأس المال المخصص للسهم من الخانة أعلى الصفحة.`);
      return;
    }
    const lv = gNow.levels[idx];
    lv.executedQty = qty; lv.executedPrice = price; lv.executedDate = new Date().toISOString().slice(0,10);
    lv.status = 'bought'; lv.sells = [];
    lv.sellTargetPrice = Number((price + gNow.step).toFixed(4));
    grids = gridsNow; g = gNow;
    await persist();
    renderGridPlanDetail(symbol);
  };
  window.__gridStartEditBuy = (idx) => { window.__gridEditingBuy = symbol+':'+idx; renderLevels(); };
  window.__gridUpdateBuy = async (idx) => {
    const qty = parseFloat(document.getElementById('gridEditBuyQty_'+idx).value);
    const price = parseFloat(document.getElementById('gridEditBuyPrice_'+idx).value);
    if(!qty || qty<=0 || !price){ alert('أدخل الكمية والسعر (رقم أكبر من صفر - ممكن يكون كسر عشري)'); return; }
    const lv = g.levels[idx];
    const currentlyInvestedByOthers = g.levels.filter((l,i)=>i!==idx && l.status==='bought').reduce((s,l)=>s+(l.executedQty*l.executedPrice), 0);
    const newAmount = qty*price;
    const remainingBudget = g.capital - currentlyInvestedByOthers;
    if (newAmount > remainingBudget + 1e-6) {
      alert(`⚠️ تجاوز حد رأس المال المخصص للسهم!\nالمبلغ الجديد (${newAmount.toFixed(2)}) أكبر من المتاح.\nأقصى مبلغ ممكن لهذا المستوى حاليًا هو: ${Math.max(remainingBudget,0).toFixed(2)} فقط.`);
      return;
    }
    lv.executedQty = qty; lv.executedPrice = price;
    lv.sellTargetPrice = Number((price + g.step).toFixed(4));
    window.__gridEditingBuy = null;
    await persist();
    renderGridPlanDetail(symbol);
  };
  window.__gridDeleteBuy = async (idx) => {
    const lv = g.levels[idx];
    const hasSells = (lv.sells||[]).length > 0;
    const msg = hasSells
      ? 'المستوى ده فيه عمليات بيع مسجلة عليه، وحذف الشراء هيلغي عمليات البيع دي كمان. متأكد؟'
      : 'متأكد إنك عايز تلغي عملية الشراء دي؟';
    if(!await gConfirm(msg)) return;
    lv.status = 'empty';
    lv.executedQty = null; lv.executedPrice = null; lv.executedDate = null; lv.sellTargetPrice = null; lv.sells = [];
    window.__gridEditingBuy = null;
    await persist();
    renderGridPlanDetail(symbol);
  };

  window.__gridSellAtLevel = async (idx, maxQty) => {
    const qty = parseFloat(document.getElementById('gridSellQty_'+idx).value);
    const price = parseFloat(document.getElementById('gridSellPrice_'+idx).value);
    if(!qty || qty<=0 || !price){ alert('أدخل الكمية والسعر (رقم أكبر من صفر - ممكن يكون كسر عشري)'); return; }
    if(qty > maxQty + 1e-9){ alert(`العدد اللي كتبته (${qty}) أكبر من الكمية المتاحة للبيع (${maxQty}). العدد الأقصى المسموح به هو ${maxQty}.`); return; }
    const lv = g.levels[idx];
    if(!lv.sells) lv.sells = [];
    lv.sells.push({ qty, price, date: new Date().toISOString().slice(0,10) });
    lv.executedQty = Number((lv.executedQty - qty).toFixed(6));
    // ملاحظة: لو الكمية بقت صفر، المستوى بيفضل "بانتظار الترحيل" - الترحيل خطوة يدوية زي DCA بالظبط (زرار "ترحيل" هيظهر تحت)
    await persist();
    renderGridPlanDetail(symbol);
  };
  window.__gridArchiveCycle = async (idx) => {
    const lv = g.levels[idx];
    closeCycle(lv, new Date().toISOString());
    await persist();
    renderGridPlanDetail(symbol);
  };
  window.__gridStartEditSell = (idx, sIdx) => { window.__gridEditingSell = symbol+':'+idx+':'+sIdx; renderLevels(); };
  window.__gridUpdateSell = async (idx, sIdx) => {
    const qty = parseFloat(document.getElementById(`gridEditSellQty_${idx}_${sIdx}`).value);
    const price = parseFloat(document.getElementById(`gridEditSellPrice_${idx}_${sIdx}`).value);
    if(!qty || qty<=0 || !price){ alert('أدخل الكمية والسعر (رقم أكبر من صفر - ممكن يكون كسر عشري)'); return; }
    const lv = g.levels[idx];
    const oldQty = lv.sells[sIdx].qty;
    const maxAllowed = lv.executedQty + oldQty;
    if(qty > maxAllowed + 1e-9){
      alert(`العدد اللي كتبته (${qty}) أكبر من الكمية المتاحة (${maxAllowed}). العدد الأقصى المسموح به هو ${maxAllowed}.`);
      return;
    }
    const existingDate = lv.sells[sIdx].date;
    lv.sells[sIdx] = { qty, price, date: existingDate };
    lv.executedQty = Number((maxAllowed - qty).toFixed(6));
    window.__gridEditingSell = null;
    await persist();
    renderGridPlanDetail(symbol);
  };
  window.__gridRemoveSell = async (idx, sIdx) => {
    if(!await gConfirm('متأكد إنك عايز تحذف عملية البيع دي؟')) return;
    const lv = g.levels[idx];
    const removedQty = lv.sells[sIdx].qty;
    lv.sells.splice(sIdx,1);
    lv.executedQty = Number((lv.executedQty + removedQty).toFixed(6));
    window.__gridEditingSell = null;
    await persist();
    renderGridPlanDetail(symbol);
  };

  document.getElementById('sellAllBtn').onclick = async () => {
    const price = parseFloat(document.getElementById('sellAllPrice').value);
    const resultEl = document.getElementById('sellAllResult');
    if (!price || price<=0) { resultEl.innerHTML = '<div class="error" style="margin-top:8px;">أدخل سعر بيع صحيح.</div>'; return; }
    const boughtLevels = g.levels.filter(l=>l.status==='bought' && l.executedQty>0);
    if (!boughtLevels.length) { resultEl.innerHTML = '<div class="error" style="margin-top:8px;">مفيش كمية مشتراة حاليًا لبيعها.</div>'; return; }
    if (!await gConfirm(`هتبيع إجمالي ${fmtQty(boughtLevels.reduce((s,l)=>s+l.executedQty,0))} سهم بسعر ${price} على كل المستويات المفتوحة، وهترحّل كصفقة واحدة مغلقة. متأكد؟`)) return;
    const closeDate = new Date().toISOString().slice(0,10);
    const closeDateTime = new Date().toISOString();
    const totalQtySold = boughtLevels.reduce((s,l)=>s+l.executedQty, 0);
    boughtLevels.forEach(lv=>{
      lv.sells.push({ qty: lv.executedQty, price, date: closeDate });
    });
    closeCycleCombined(boughtLevels, closeDateTime);
    g.manualExits.push({ qty: totalQtySold, price, date: closeDate, note: 'بيع كل الكمية المتبقية في كل المستويات' });
    await persist();
    renderGridPlanDetail(symbol);
    setTimeout(()=>alert('✅ اتباعت كل الكمية المتبقية على كل المستويات، وترحّلت كصفقة واحدة مغلقة في السجل تحت.'), 150);
  };
}

/* ================== تعديل إعدادات وخطة سهم شبكة قائم - بنفس فلسفة تعديل خطة DCA ================== */
async function renderGridEditPlanSettings(symbol, error){
  pushNav(() => renderGridEditPlanSettings(symbol));
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;
  const grids = await getGridPlans(email);
  const g = grids[symbol];
  if(!g) return renderGridPlansList();
  const hasBought = g.levels.some(l=>l.status==='bought');

  if (hasBought) {
    window.__lastPageKey='grid_edit_plan_settings'; app.innerHTML = `<div class="container">${logoHeader()}<h2>تعديل إعدادات خطة ${symbol}</h2>
      <div class="error">فيه مستويات مشتراة حاليًا في الخطة دي، فمينفعش تغيّر النطاق أو عدد المستويات أو طريقة توزيع الكمية دلوقتي (ده هيبعثر حساب المستويات الحالية). بيع كل المستويات المفتوحة وارحّلها الأول (من شاشة الخطة)، وبعدين ارجع هنا وغيّر أي حاجة تحب.</div>
      <div class="info">لسه تقدر تعدّل رأس المال ونسبة ربح الخروج الكلي من شاشة الخطة نفسها من غير أي قيود.</div>
      <div class="muted-link"><a id="cancelBtn">رجوع لشاشة الخطة</a></div></div>`;
    document.getElementById('cancelBtn').onclick = () => renderGridPlanDetail(symbol);
    return;
  }

  window.__lastPageKey='grid_edit_plan_settings'; app.innerHTML = `<div class="container">${logoHeader()}<h2>تعديل إعدادات خطة ${symbol}</h2>
    <div class="info">مفيش مستويات مشتراة حاليًا في الخطة دي، فتقدر تغيّر أي حاجة بحرية كاملة — هيعاد توليد مستويات الشبكة من جديد بناءً على القيم الجديدة.</div>
    ${error?`<div class="error">${error}</div>`:''}
    <form id="gridEditForm">
      <label>السوق</label>
      <select id="ge_market">
        <option value="مصر">مصر (EGX)</option>
        <option value="السعودية">السعودية</option>
        <option value="الإمارات">الإمارات</option>
        <option value="قطر">قطر</option>
        <option value="الكويت">الكويت</option>
      </select>
      <label>رأس المال المخصص للسهم ده</label>
      <input type="number" step="any" id="ge_capital" required value="${g.capital}">
      <label>نسبة المخاطرة % (بتحدد حجم كل صفقة تلقائيًا)</label>
      <input type="number" step="any" id="ge_risk" required value="${g.risk}">
      <div class="info" id="ge_tradeSizePreview" style="display:none;"></div>
      <label>سعر السهم الحالي</label>
      <input type="number" step="any" id="ge_currentPrice" value="${g.currentPrice??''}">
      <div class="grid2">
        <div><label>سقف النطاق (أعلى سعر)</label><input type="number" step="any" id="ge_high" required value="${g.rangeHigh}"></div>
        <div><label>قاع النطاق (أقل سعر)</label><input type="number" step="any" id="ge_low" required value="${g.rangeLow}"></div>
      </div>
      <label>عدد المستويات</label>
      <input type="number" id="ge_levels" required value="${g.levels.length}">

      <label style="margin-top:16px;">طريقة توزيع الكمية على المستويات</label>
      <div class="radio-row" style="display:flex;gap:16px;margin:6px 0 12px;flex-wrap:wrap;">
        <label style="display:flex;align-items:center;gap:5px;font-weight:normal;"><input type="radio" name="ge_qtyMode" value="equal" checked> توزيع متساوٍ (تلقائي)</label>
        <label style="display:flex;align-items:center;gap:5px;font-weight:normal;"><input type="radio" name="ge_qtyMode" value="manual"> تحديد يدوي لكل مستوى</label>
        <label style="display:flex;align-items:center;gap:5px;font-weight:normal;"><input type="radio" name="ge_qtyMode" value="progressive"> زيادة الكمية بنسبة المخاطرة مع كل مستوى</label>
      </div>
      <button type="button" id="geGenLevelsBtn" class="secondary">توليد جدول المستويات الجديد</button>
    </form>

    <div id="geLevelsPreviewWrap" style="display:none;margin-top:16px;">
      <h2>جدول المستويات الجديد — عدّل الكمية الإرشادية لو حابب</h2>
      <div class="section-card" style="overflow-x:auto;">
        <table>
          <thead><tr><th>#</th><th>السعر المخطط</th><th>الكمية الإرشادية</th></tr></thead>
          <tbody id="geLevelsPreviewBody"></tbody>
        </table>
      </div>
      <button id="geSaveBtn" style="margin-top:14px;">حفظ التعديلات</button>
    </div>
    <div class="muted-link"><a id="cancelBtn">إلغاء والرجوع</a></div></div>`;

  document.getElementById('ge_market').value = g.market || 'مصر';
  document.getElementById('cancelBtn').onclick = () => renderGridPlanDetail(symbol);

  function updatePreview(){
    const capital = parseFloat(document.getElementById('ge_capital').value);
    const risk = parseFloat(document.getElementById('ge_risk').value);
    const preview = document.getElementById('ge_tradeSizePreview');
    if (capital > 0 && risk > 0) {
      const tradeSize = capital * risk / 100;
      preview.style.display = '';
      preview.textContent = `حجم كل صفقة: ${tradeSize.toFixed(2)}`;
    } else { preview.style.display = 'none'; }
  }
  document.getElementById('ge_capital').addEventListener('input', updatePreview);
  document.getElementById('ge_risk').addEventListener('input', updatePreview);
  updatePreview();

  let generatedLevels = [];
  document.getElementById('geGenLevelsBtn').onclick = () => {
    const capital = parseFloat(document.getElementById('ge_capital').value);
    const risk = parseFloat(document.getElementById('ge_risk').value);
    const high = parseFloat(document.getElementById('ge_high').value);
    const low = parseFloat(document.getElementById('ge_low').value);
    const numLevels = parseInt(document.getElementById('ge_levels').value);
    if (!capital || !risk || high<=low || !numLevels || numLevels<1) {
      alert('تأكد إن رأس المال ونسبة المخاطرة والنطاق وعدد المستويات كلهم مدخلين صح (السقف أكبر من القاع).');
      return;
    }
    const tradeSize = capital * risk / 100;
    const step = (high - low) / numLevels;
    const qtyMode = document.querySelector('input[name="ge_qtyMode"]:checked').value;
    const baseQty = tradeSize / (high - step);
    generatedLevels = [];
    for (let i = 0; i < numLevels; i++) {
      const price = Number((high - step * (i + 1)).toFixed(4));
      let guidedQty = null;
      if (qtyMode === 'equal') guidedQty = Number((tradeSize/price).toFixed(2));
      else if (qtyMode === 'progressive') guidedQty = Number((baseQty * Math.pow(1 + risk/100, i)).toFixed(2));
      generatedLevels.push({ plannedPrice: price, plannedQty: guidedQty });
    }
    document.getElementById('geLevelsPreviewBody').innerHTML = generatedLevels.map((lv,idx)=>`<tr>
      <td>${idx+1}</td>
      <td>${lv.plannedPrice}</td>
      <td><input type="number" step="any" min="0" id="gePrevQty_${idx}" value="${lv.plannedQty??''}" placeholder="أدخل الكمية" style="max-width:120px;"></td>
    </tr>`).join('');
    document.getElementById('geLevelsPreviewWrap').style.display = '';
  };

  document.getElementById('geSaveBtn').onclick = async () => {
    const market = document.getElementById('ge_market').value;
    const capital = parseFloat(document.getElementById('ge_capital').value);
    const risk = parseFloat(document.getElementById('ge_risk').value);
    const currentPrice = parseFloat(document.getElementById('ge_currentPrice').value) || null;
    const high = parseFloat(document.getElementById('ge_high').value);
    const low = parseFloat(document.getElementById('ge_low').value);
    const numLevels = generatedLevels.length;
    const tradeSize = capital * risk / 100;
    const step = (high - low) / numLevels;
    const levels = generatedLevels.map((glv, idx) => {
      const qtyInput = document.getElementById('gePrevQty_'+idx);
      const q = parseFloat(qtyInput.value);
      return {
        plannedPrice: glv.plannedPrice,
        plannedQty: (!isNaN(q) && q>0) ? q : null,
        executedQty: null, executedPrice: null, executedDate: null,
        status: 'empty', sellTargetPrice: null,
        sells: [], cycles: 0,
      };
    });
    const grids2 = await getGridPlans(email);
    grids2[symbol] = { ...grids2[symbol], market, currentPrice, capital, risk, tradeSize, rangeHigh: high, rangeLow: low, step, levels };
    await saveGridPlans(email, grids2);
    renderGridPlanDetail(symbol);
  };
}

/* ================== اختيار نوع الخطة - تعزيز متوسط (DCA) أو شبكة (Grid) ================== */
async function renderPlanTypeChooser(prefill){
  pushNav(() => renderPlanTypeChooser(prefill));
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>${pageTitle('plan_type_chooser','اختر نوع الخطة')}</div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button></div>
    <div class="info">اختر الأسلوب المناسب للسهم اللي في بالك — الفرق الأساسي: DCA مبنية على إيمانك إن السهم هيصعد على المدى الطويل، وGrid مبنية على إن السهم هيتذبذب جوه نطاق سعري معين.</div>

    <div class="section-card" onclick="window.__chooseDac()" style="cursor:pointer;">
      <div style="background:var(--green-dark);color:#fff;padding:8px 12px;border-radius:8px 8px 0 0;margin:-16px -18px 12px;font-weight:700;">📈 خطة تعزيز المتوسط (DCA)</div>
      <p style="font-size:13px;color:#555;text-align:right;margin-top:10px;">
        بتشتري كميات إضافية كل ما السعر ينزل، عشان تقلل متوسط سعر شرائك الإجمالي. مناسبة لسهم بتثق فيه على المدى الطويل وعايز "تشتري في الهبوط" بدل ما تخاف منه.
      </p>
      <button class="btn-active" style="margin-top:14px;">اختيار تعزيز المتوسط</button>
    </div>
    <div class="section-card" onclick="window.__chooseGrid()" style="cursor:pointer;margin-top:14px;">
      <div style="background:var(--green-dark);color:#fff;padding:8px 12px;border-radius:8px 8px 0 0;margin:-16px -18px 12px;font-weight:700;">🔲 خطة الشبكة (Grid)</div>
      <p style="font-size:13px;color:#555;text-align:right;">
        بتحدد نطاق سعري (سقف وقاع)، وتشتري وتبيع نفس الكمية كل ما السعر يتحرك بين المستويات، وتكرر الدورة. مناسبة لسهم متذبذب مش في اتجاه واضح، وبتربح من التذبذب نفسه.
      </p>
      <button class="btn-active" style="margin-top:14px;">اختيار الشبكة</button>
    </div>
  </div>`;
  document.getElementById('homeBtn').onclick=()=>renderHome();
  window.__chooseDac = () => { if (prefill) window.__prefillPlan = prefill; renderNewPlanForm(); };
  window.__chooseGrid = () => { if (prefill) window.__prefillGridPlan = prefill; renderGridPlanForm(); };
}

async function renderNewPlanForm(error, formState){
  pushNav(() => renderNewPlanForm());
  const email0 = await getSession();
  if(!email0) return renderLogin();
  if(!(await ensureAccess())) return;
  const today = new Date().toISOString().split('T')[0];
  const prefill = window.__prefillPlan || {};
  window.__prefillPlan = null;
  const fs = formState || {};

  window.__lastPageKey='new_plan_form'; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar">
      <button class="secondary small" id="homeBtnNewPlan">🏠 الشاشة الرئيسية</button>
      <button class="btn-lightgreen small" id="plansBtnNewPlan">📈 الأسهم والخطط</button>
    </div>
    <h2>خطة تعزيز متوسط جديدة</h2>
    ${error?`<div class="error">${error}</div>`:''}
    <form id="planForm">
      <label>اسم السهم</label><input type="text" id="symbol" required placeholder="مثال: ABUK" value="${fs.symbol??prefill.symbol??''}">
      <div class="grid2">
        <div><label>الدولة / البورصة</label>
          <select id="market">
            <option value="مصر">مصر (EGX)</option>
            <option value="السعودية">السعودية (تداول)</option>
            <option value="الإمارات">الإمارات</option>
            <option value="قطر">قطر</option>
            <option value="الكويت">الكويت</option>
          </select>
        </div>
        <div><label>العملة</label>
          <select id="currency">
            <option value="جنيه مصري">جنيه مصري</option>
            <option value="ريال سعودي">ريال سعودي</option>
            <option value="درهم إماراتي">درهم إماراتي</option>
            <option value="دينار كويتي">دينار كويتي</option>
            <option value="ريال قطري">ريال قطري</option>
          </select>
        </div>
      </div>
      <div class="grid2">
        <div><label>تاريخ بداية الاستثمار</label><input type="date" id="startDate" value="${today}"></div>
        <div></div>
      </div>
      <label>السعر الحالي</label><input type="number" step="any" id="currentPrice" required value="${fs.currentPrice??prefill.price??''}">
      <label>رأس المال المخطط للمضاربة (بالكامل)</label><input type="number" step="any" id="capital" required value="${fs.capital??''}">

      <label>نسبة المخاطرة المطلوبة (اختياري)</label>
      <div class="radio-row">
        <label><input type="radio" name="riskMode" value="auto" ${fs.riskMode!=='manual'?'checked':''}> استخدام نسبة مخاطرة (كل شيء يُحسب تلقائيًا)</label>
        <label><input type="radio" name="riskMode" value="manual" ${fs.riskMode==='manual'?'checked':''}> إدخال النسب يدويًا</label>
      </div>
      <div id="riskAutoField">
        <label>نسبة المخاطرة %</label><input type="number" step="any" id="riskPercent" value="${fs.riskPercent??5}">
        <div class="risk-preview" id="riskPreview"></div>
      </div>

      <div id="manualFields" style="display:${fs.riskMode==='manual'?'block':'none'};">
        <label>طريقة تحديد عدد المستويات</label>
        <div class="radio-row">
          <label><input type="radio" name="levelMode" value="manual" ${fs.levelMode!=='auto'?'checked':''}> يدوي (أحدد العدد)</label>
          <label><input type="radio" name="levelMode" value="auto" ${fs.levelMode==='auto'?'checked':''}> تلقائي (يحسبها البرنامج)</label>
        </div>
        <div id="manualLevelsField" style="display:${fs.levelMode==='auto'?'none':'block'};"><label>عدد المستويات</label><input type="number" id="levels" value="${fs.levels??7}"></div>
        <label>مبلغ الشراء الأول</label><input type="number" step="any" id="seedAmount" value="${fs.seedAmount??''}" placeholder="مثال: 1000">
        <div class="grid2">
          <div><label>نسبة الربح المستهدفة %</label><input type="number" step="any" id="profitTarget" value="${fs.profitTarget??5}"></div>
          <div><label>نسبة الانخفاض لكل مستوى %</label><input type="number" step="any" id="dropPercent" value="${fs.dropPercent??7.5}"></div>
          <div><label>نسبة زيادة قيمة الشراء لكل مستوى %</label><input type="number" step="any" id="volumeIncrease" value="${fs.volumeIncrease??10}"></div>
        </div>
        <div class="risk-preview" id="manualCoveragePreview"></div>
      </div>

      <label style="margin-top:10px;">نسبة ربح الخروج الكلي % (اختياري)</label>
      <input type="number" step="any" id="exitProfitPercent" value="${fs.exitProfitPercent??''}" placeholder="مثال: 10">
      <div style="font-size:11px;color:#888;margin-top:4px;">لو حددتها، الموقع هيوريك عند أي سعر تقدر تبيع كل الكمية المملوكة وتحقق نسبة الربح دي على متوسط تكلفتك، وهيهايلايت المستوى الأقرب لسعر الخروج ده باللون الأخضر في جدول المستويات.</div>

      <div id="suggestionsBox"></div>
      <button type="submit">إنشاء الخطة</button>
    </form>
    <div class="muted-link"><a id="backBtn">📈 كل خطط الـ DCA</a></div></div>`;

  function updateRiskPreview(){
    const capital = parseFloat(document.getElementById('capital').value) || 0;
    const riskPercent = parseFloat(document.getElementById('riskPercent').value) || 0;
    const d = computeRiskDerived(capital, riskPercent);
    document.getElementById('riskPreview').innerHTML = capital>0 ? `
      سيتم تلقائيًا: مبلغ الشراء الأول = <strong>${d.seedAmount}</strong> —
      نسبة الربح = <strong>${d.profitTarget}%</strong> —
      نسبة زيادة الشراء = <strong>${d.volumeIncrease}%</strong> —
      نسبة الانخفاض = <strong>${d.dropPercent}%</strong> — عدد المستويات المحسوب = <strong>${d.levelsCount}</strong> (يغطي انخفاض إجمالي حتى 50%)
    ` : 'أدخل رأس المال أولًا لمعاينة الحساب التلقائي';
  }
  document.getElementById('capital').addEventListener('input', updateRiskPreview);
  document.getElementById('riskPercent').addEventListener('input', updateRiskPreview);
  updateRiskPreview();

  function updateManualCoveragePreview(){
    const capital = parseFloat(document.getElementById('capital').value) || 0;
    const levelMode = document.querySelector('input[name="levelMode"]:checked').value;
    const dropPercent = parseFloat(document.getElementById('dropPercent').value) || 0;
    const volumeIncrease = parseFloat(document.getElementById('volumeIncrease').value) || 0;
    const seedAmount = parseFloat(document.getElementById('seedAmount').value) || 0;
    let count;
    if (levelMode==='manual') {
      count = parseInt(document.getElementById('levels').value) || 0;
    } else {
      count = (capital>0 && seedAmount>0) ? buildLevelsAuto({ capital, volumeIncrease, seedAmount }).length : 0;
    }
    const box = document.getElementById('manualCoveragePreview');
    if (count>0 && dropPercent>0) {
      const totalDrop = (1 - Math.pow(1-dropPercent/100, count)) * 100;
      box.innerHTML = `📊 بالنسب دي، الخطة هتغطي حتى <strong>المستوى ${count}</strong>، بنسبة انخفاض تراكمي حتى <strong>${totalDrop.toFixed(1)}%</strong> من السعر الأصلي.`;
    } else {
      box.innerHTML = 'أدخل عدد المستويات (أو مبلغ الشراء الأول لو تلقائي) ونسبة الانخفاض لمعاينة التغطية.';
    }
  }
  ['levels','dropPercent','volumeIncrease','seedAmount','capital'].forEach(id=>{
    document.getElementById(id).addEventListener('input', updateManualCoveragePreview);
  });
  document.querySelectorAll('input[name="levelMode"]').forEach(r=>{ r.addEventListener('change', updateManualCoveragePreview); });
  updateManualCoveragePreview();

  document.querySelectorAll('input[name="riskMode"]').forEach(r=>{
    r.onchange = (e)=>{
      const isAuto = e.target.value==='auto';
      document.getElementById('riskAutoField').style.display = isAuto?'block':'none';
      document.getElementById('manualFields').style.display = isAuto?'none':'block';
    };
  });
  document.querySelectorAll('input[name="levelMode"]').forEach(r=>{
    r.onchange = (e)=>{
      document.getElementById('manualLevelsField').style.display = e.target.value==='manual'?'block':'none';
    };
  });

  document.getElementById('homeBtnNewPlan').onclick=()=>renderHome();
  document.getElementById('plansBtnNewPlan').onclick=()=>renderPlansList();
  document.getElementById('backBtn').onclick=()=>renderPlansList();

  document.getElementById('planForm').onsubmit=async(e)=>{
    e.preventDefault();
    const email = await getSession();
    const symbol = document.getElementById('symbol').value.trim().toUpperCase();
    const currentPrice = parseFloat(document.getElementById('currentPrice').value);
    const capital = parseFloat(document.getElementById('capital').value);
    const currency = document.getElementById('currency').value;
    const market = document.getElementById('market').value;
    const startDate = document.getElementById('startDate').value;
    const riskMode = document.querySelector('input[name="riskMode"]:checked').value;

    const plans = await getPlans(email);
    if(plans[symbol]) return renderNewPlanForm('يوجد خطة بالفعل لهذا السهم — احذفها الأول لو عايز تبدأ من جديد');
    const existingGrids = await getGridPlans(email);
    if(existingGrids[symbol] && !existingGrids[symbol].closed) return renderNewPlanForm('السهم ده عنده خطة شبكة (Grid) نشطة بالفعل — مينفعش نفس السهم يكون في خطتين (تعزيز متوسط + شبكة) في نفس الوقت. اقفل خطة الشبكة الأول لو عايز تبدأ خطة تعزيز متوسط بدالها.');

    let levelMode, levelsCount, seedAmount, profitTarget, dropPercent, volumeIncrease, riskPercent=null;

    if (riskMode==='auto') {
      riskPercent = parseFloat(document.getElementById('riskPercent').value) || 0;
      if(riskPercent<=0) return renderNewPlanForm('أدخل نسبة مخاطرة صحيحة');
      const d = computeRiskDerived(capital, riskPercent);
      seedAmount = d.seedAmount; profitTarget = d.profitTarget; volumeIncrease = d.volumeIncrease; dropPercent = d.dropPercent;
      levelsCount = d.levelsCount;
      levelMode = 'manual';
    } else {
      levelMode = document.querySelector('input[name="levelMode"]:checked').value;
      levelsCount = parseInt(document.getElementById('levels').value);
      seedAmount = parseFloat(document.getElementById('seedAmount').value);
      profitTarget = parseFloat(document.getElementById('profitTarget').value) || 0;
      dropPercent = parseFloat(document.getElementById('dropPercent').value) || 0;
      volumeIncrease = parseFloat(document.getElementById('volumeIncrease').value) || 0;
      if(!seedAmount || seedAmount<=0) return renderNewPlanForm('أدخل مبلغ الشراء الأول', {symbol,currentPrice,capital,riskMode:'manual',levelMode,levels:levelsCount,seedAmount,profitTarget,dropPercent,volumeIncrease});

      if (!window.__bypassSuggestions) {
        const issues = validateManualInputs({ capital, seedAmount, profitTarget, dropPercent, volumeIncrease });
        if (issues.length){
          const box = document.getElementById('suggestionsBox');
          box.innerHTML = `<div class="suggest-box">
            <strong>⚠️ في مدخلات ممكن تكون غير متوازنة:</strong>
            ${issues.map(i=>`<div class="suggest-item">${escapeHtml(i.message)}<br>الحالي: <strong>${i.current}</strong> — المقترح: <strong>${i.suggested}</strong></div>`).join('')}
            <button type="button" class="small" id="applySuggestBtn" style="width:auto;">تطبيق كل المقترحات</button>
            <button type="button" class="small secondary" id="ignoreSuggestBtn" style="width:auto;">المتابعة بالقيم الحالية</button>
          </div>`;
          document.getElementById('applySuggestBtn').onclick = () => {
            const patch = {};
            issues.forEach(i=>{ patch[i.field] = i.suggested; });
            renderNewPlanForm(null, { symbol,currentPrice,capital,riskMode:'manual',levelMode,levels:levelsCount,
              seedAmount: patch.seedAmount??seedAmount, profitTarget, dropPercent: patch.dropPercent??dropPercent, volumeIncrease: patch.volumeIncrease??volumeIncrease });
          };
          document.getElementById('ignoreSuggestBtn').onclick = () => {
            window.__bypassSuggestions = true;
            document.getElementById('planForm').requestSubmit();
          };
          return;
        }
      }
      window.__bypassSuggestions = false;
    }

    let levels;
    if (levelMode==='manual') {
      levels = buildLevelsManual({ levels: levelsCount });
    } else {
      levels = buildLevelsAuto({ capital, volumeIncrease, seedAmount });
    }

    const exitProfitPercent = parseFloat(document.getElementById('exitProfitPercent').value);
    plans[symbol] = { symbol, currentPrice, capital, riskMode, riskPercent, profitTarget, dropPercent, volumeIncrease, seedAmount, currency, market, startDate, levelMode, levels, closedTrades: [], exitProfitPercent: (!isNaN(exitProfitPercent) && exitProfitPercent>0) ? exitProfitPercent : null };
    await savePlans(email, plans);
    renderPlanDetail(symbol);
  };
}

/* ================== تعديل إعدادات خطة سهم قائم ================== */
async function renderEditPlanSettings(symbol, error, formState){
  pushNav(() => renderEditPlanSettings(symbol));
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;
  const plans = await getPlans(email);
  const planObj = plans[symbol];
  if(!planObj) return renderPlansList();
  const hasExecuted = planObj.levels.some(lv=>lv.executed);
  const fs = formState || {};

  if (!hasExecuted) {
    // مفيش صفقات مفتوحة حاليًا - نفس حرية إنشاء خطة جديدة بالظبط (اختيار نسبة مخاطرة تلقائية أو إدخال يدوي كامل)
    window.__lastPageKey='edit_plan_settings'; app.innerHTML = `<div class="container">${logoHeader()}<h2>تعديل إعدادات خطة ${symbol}</h2>
      <div class="info">مفيش صفقات مفتوحة حاليًا لهذا السهم، فتقدر تغيّر أي حاجة في الخطة بحرية كاملة زي ما تعمل خطة جديدة بالظبط.</div>
      ${error?`<div class="error">${error}</div>`:''}
      <form id="editSettingsForm">
        <div class="grid2">
          <div><label>الدولة / البورصة</label>
            <select id="e_market">
              <option value="مصر">مصر (EGX)</option>
              <option value="السعودية">السعودية (تداول)</option>
              <option value="الإمارات">الإمارات</option>
              <option value="قطر">قطر</option>
              <option value="الكويت">الكويت</option>
            </select>
          </div>
          <div><label>العملة</label>
            <select id="e_currency">
              <option value="جنيه مصري">جنيه مصري</option>
              <option value="ريال سعودي">ريال سعودي</option>
              <option value="درهم إماراتي">درهم إماراتي</option>
              <option value="دينار كويتي">دينار كويتي</option>
              <option value="ريال قطري">ريال قطري</option>
            </select>
          </div>
        </div>
        <label>السعر الحالي</label><input type="number" step="any" id="e_currentPrice" value="${fs.currentPrice??planObj.currentPrice}" required>
        <label>رأس المال المخطط للمضاربة</label><input type="number" step="any" id="e_capital" value="${fs.capital??planObj.capital}" required>

        <label>نسبة المخاطرة المطلوبة (اختياري)</label>
        <div class="radio-row">
          <label><input type="radio" name="e_riskMode" value="auto" ${fs.riskMode!=='manual'?'checked':''}> استخدام نسبة مخاطرة (كل شيء يُحسب تلقائيًا)</label>
          <label><input type="radio" name="e_riskMode" value="manual" ${fs.riskMode==='manual'?'checked':''}> إدخال النسب يدويًا</label>
        </div>
        <div id="e_riskAutoField">
          <label>نسبة المخاطرة %</label><input type="number" step="any" id="e_riskPercent" value="${fs.riskPercent??planObj.riskPercent??5}">
          <div class="risk-preview" id="e_riskPreview"></div>
        </div>

        <div id="e_manualFields" style="display:${fs.riskMode==='manual'?'block':'none'};">
          <label>طريقة تحديد عدد المستويات</label>
          <div class="radio-row">
            <label><input type="radio" name="e_levelMode" value="manual" ${fs.levelMode!=='auto'?'checked':''}> يدوي (أحدد العدد)</label>
            <label><input type="radio" name="e_levelMode" value="auto" ${fs.levelMode==='auto'?'checked':''}> تلقائي (يحسبها البرنامج)</label>
          </div>
          <div id="e_manualLevelsField" style="display:${fs.levelMode==='auto'?'none':'block'};"><label>عدد المستويات</label><input type="number" id="e_levels" value="${fs.levels??planObj.levels.length}"></div>
          <label>مبلغ الشراء الأول</label><input type="number" step="any" id="e_seedAmount" value="${fs.seedAmount??planObj.seedAmount??''}">
          <div class="grid2">
            <div><label>نسبة الربح المستهدفة %</label><input type="number" step="any" id="e_profitTarget" value="${fs.profitTarget??planObj.profitTarget}"></div>
            <div><label>نسبة الانخفاض لكل مستوى %</label><input type="number" step="any" id="e_dropPercent" value="${fs.dropPercent??planObj.dropPercent}"></div>
            <div><label>نسبة زيادة قيمة الشراء لكل مستوى %</label><input type="number" step="any" id="e_volumeIncrease" value="${fs.volumeIncrease??planObj.volumeIncrease}"></div>
          </div>
          <div class="risk-preview" id="e_manualCoveragePreview"></div>
        </div>

        <div id="e_suggestionsBox"></div>
        <button type="submit">حفظ التعديلات</button>
      </form>
      <div class="muted-link"><a id="cancelBtn">إلغاء والرجوع</a></div></div>`;

    document.getElementById('e_market').value = planObj.market || 'مصر';
    document.getElementById('e_currency').value = planObj.currency || 'جنيه مصري';
    document.getElementById('cancelBtn').onclick = () => renderPlanDetail(symbol);

    function updateRiskPreview(){
      const capital = parseFloat(document.getElementById('e_capital').value) || 0;
      const riskPercent = parseFloat(document.getElementById('e_riskPercent').value) || 0;
      const d = computeRiskDerived(capital, riskPercent);
      document.getElementById('e_riskPreview').innerHTML = capital>0 ? `
        سيتم تلقائيًا: مبلغ الشراء الأول = <strong>${d.seedAmount}</strong> —
        نسبة الربح = <strong>${d.profitTarget}%</strong> —
        نسبة زيادة الشراء = <strong>${d.volumeIncrease}%</strong> —
        نسبة الانخفاض = <strong>${d.dropPercent}%</strong> — عدد المستويات المحسوب = <strong>${d.levelsCount}</strong> (يغطي انخفاض إجمالي حتى 50%)
      ` : 'أدخل رأس المال أولًا لمعاينة الحساب التلقائي';
    }
    document.getElementById('e_capital').addEventListener('input', updateRiskPreview);
    document.getElementById('e_riskPercent').addEventListener('input', updateRiskPreview);
    updateRiskPreview();

    document.querySelectorAll('input[name="e_riskMode"]').forEach(r=>{
      r.onchange = (e)=>{
        const isAuto = e.target.value==='auto';
        document.getElementById('e_riskAutoField').style.display = isAuto?'block':'none';
        document.getElementById('e_manualFields').style.display = isAuto?'none':'block';
      };
    });
    document.querySelectorAll('input[name="e_levelMode"]').forEach(r=>{
      r.onchange = (e)=>{
        document.getElementById('e_manualLevelsField').style.display = e.target.value==='manual'?'block':'none';
      };
    });

    function updateManualCoveragePreviewEdit(){
      const capital = parseFloat(document.getElementById('e_capital').value) || 0;
      const levelMode = document.querySelector('input[name="e_levelMode"]:checked').value;
      const dropPercent = parseFloat(document.getElementById('e_dropPercent').value) || 0;
      const volumeIncrease = parseFloat(document.getElementById('e_volumeIncrease').value) || 0;
      const seedAmount = parseFloat(document.getElementById('e_seedAmount').value) || 0;
      let count;
      if (levelMode==='manual') {
        count = parseInt(document.getElementById('e_levels').value) || 0;
      } else {
        count = (capital>0 && seedAmount>0) ? buildLevelsAuto({ capital, volumeIncrease, seedAmount }).length : 0;
      }
      const box = document.getElementById('e_manualCoveragePreview');
      if (count>0 && dropPercent>0) {
        const totalDrop = (1 - Math.pow(1-dropPercent/100, count)) * 100;
        box.innerHTML = `📊 بالنسب دي، الخطة هتغطي حتى <strong>المستوى ${count}</strong>، بنسبة انخفاض تراكمي حتى <strong>${totalDrop.toFixed(1)}%</strong> من السعر الأصلي.`;
      } else {
        box.innerHTML = 'أدخل عدد المستويات (أو مبلغ الشراء الأول لو تلقائي) ونسبة الانخفاض لمعاينة التغطية.';
      }
    }
    ['e_levels','e_dropPercent','e_volumeIncrease','e_seedAmount','e_capital'].forEach(id=>{
      document.getElementById(id).addEventListener('input', updateManualCoveragePreviewEdit);
    });
    document.querySelectorAll('input[name="e_levelMode"]').forEach(r=>{ r.addEventListener('change', updateManualCoveragePreviewEdit); });
    updateManualCoveragePreviewEdit();

    document.getElementById('editSettingsForm').onsubmit = async (e) => {
      e.preventDefault();
      const plans2 = await getPlans(email);
      const p = plans2[symbol];
      p.market = document.getElementById('e_market').value;
      p.currency = document.getElementById('e_currency').value;
      p.currentPrice = parseFloat(document.getElementById('e_currentPrice').value);
      p.capital = parseFloat(document.getElementById('e_capital').value);
      const riskMode = document.querySelector('input[name="e_riskMode"]:checked').value;

      let levelMode, levelsCount, seedAmount, profitTarget, dropPercent, volumeIncrease, riskPercent=null;

      if (riskMode==='auto') {
        riskPercent = parseFloat(document.getElementById('e_riskPercent').value) || 0;
        if(riskPercent<=0) return renderEditPlanSettings(symbol, 'أدخل نسبة مخاطرة صحيحة');
        const d = computeRiskDerived(p.capital, riskPercent);
        seedAmount = d.seedAmount; profitTarget = d.profitTarget; volumeIncrease = d.volumeIncrease; dropPercent = d.dropPercent;
        levelsCount = d.levelsCount;
        levelMode = 'manual';
      } else {
        levelMode = document.querySelector('input[name="e_levelMode"]:checked').value;
        levelsCount = parseInt(document.getElementById('e_levels').value);
        seedAmount = parseFloat(document.getElementById('e_seedAmount').value);
        profitTarget = parseFloat(document.getElementById('e_profitTarget').value) || 0;
        dropPercent = parseFloat(document.getElementById('e_dropPercent').value) || 0;
        volumeIncrease = parseFloat(document.getElementById('e_volumeIncrease').value) || 0;
        if(!seedAmount || seedAmount<=0) return renderEditPlanSettings(symbol, 'أدخل مبلغ الشراء الأول', {riskMode:'manual',levelMode,levels:levelsCount,seedAmount,profitTarget,dropPercent,volumeIncrease,capital:p.capital,currentPrice:p.currentPrice});

        if (!window.__bypassSuggestionsEdit) {
          const issues = validateManualInputs({ capital: p.capital, seedAmount, profitTarget, dropPercent, volumeIncrease });
          if (issues.length){
            const box = document.getElementById('e_suggestionsBox');
            box.innerHTML = `<div class="suggest-box">
              <strong>⚠️ في مدخلات ممكن تكون غير متوازنة:</strong>
              ${issues.map(i=>`<div class="suggest-item">${escapeHtml(i.message)}<br>الحالي: <strong>${i.current}</strong> — المقترح: <strong>${i.suggested}</strong></div>`).join('')}
              <button type="button" class="small" id="e_applySuggestBtn" style="width:auto;">تطبيق كل المقترحات</button>
              <button type="button" class="small secondary" id="e_ignoreSuggestBtn" style="width:auto;">المتابعة بالقيم الحالية</button>
            </div>`;
            document.getElementById('e_applySuggestBtn').onclick = () => {
              const patch = {};
              issues.forEach(i=>{ patch[i.field] = i.suggested; });
              renderEditPlanSettings(symbol, null, { riskMode:'manual', levelMode, levels:levelsCount,
                seedAmount: patch.seedAmount??seedAmount, profitTarget, dropPercent: patch.dropPercent??dropPercent, volumeIncrease: patch.volumeIncrease??volumeIncrease,
                capital:p.capital, currentPrice:p.currentPrice });
            };
            document.getElementById('e_ignoreSuggestBtn').onclick = () => {
              window.__bypassSuggestionsEdit = true;
              document.getElementById('editSettingsForm').requestSubmit();
            };
            return;
          }
        }
        window.__bypassSuggestionsEdit = false;
      }

      p.riskMode = riskMode; p.riskPercent = riskPercent;
      p.profitTarget = profitTarget; p.dropPercent = dropPercent; p.volumeIncrease = volumeIncrease; p.seedAmount = seedAmount;
      p.levelMode = levelMode;
      if(levelMode==='manual'){
        p.levels = buildLevelsManual({ levels: levelsCount });
      } else {
        p.levels = buildLevelsAuto({ capital: p.capital, volumeIncrease, seedAmount });
      }

      await savePlans(email, plans2);
      renderPlanDetail(symbol);
    };
    return;
  }

  // فيه صفقات مفتوحة حاليًا - تعديل محدود لباقي الإعدادات فقط (بدون تغيير هيكل المستويات)
  window.__lastPageKey='edit_plan_settings'; app.innerHTML = `<div class="container">${logoHeader()}<h2>تعديل إعدادات خطة ${symbol}</h2>
    ${error?`<div class="error">${error}</div>`:''}
    <div class="info">فيه مستويات منفذة حاليًا، فمينفعش تتغير طريقة تحديد عدد المستويات أو مبلغ الشراء الأول إلا بعد إغلاق كل الصفقات وترحيلها. باقي الإعدادات تقدر تعدّلها بحرية.</div>
    <form id="editSettingsForm">
      <div class="grid2">
        <div><label>الدولة / البورصة</label>
          <select id="e_market">
            <option value="مصر">مصر (EGX)</option>
            <option value="السعودية">السعودية (تداول)</option>
            <option value="الإمارات">الإمارات</option>
            <option value="قطر">قطر</option>
            <option value="الكويت">الكويت</option>
          </select>
        </div>
        <div><label>العملة</label>
          <select id="e_currency">
            <option value="جنيه مصري">جنيه مصري</option>
            <option value="ريال سعودي">ريال سعودي</option>
            <option value="درهم إماراتي">درهم إماراتي</option>
            <option value="دينار كويتي">دينار كويتي</option>
            <option value="ريال قطري">ريال قطري</option>
          </select>
        </div>
      </div>
      <label>رأس المال المخطط للمضاربة</label><input type="number" step="any" id="e_capital" value="${planObj.capital}" required>
      <label>نسبة المخاطرة %</label><input type="number" step="any" id="e_riskPercent" value="${planObj.riskPercent||''}" placeholder="اختياري">
      <div class="grid2">
        <div><label>نسبة الربح المستهدفة %</label><input type="number" step="any" id="e_profitTarget" value="${planObj.profitTarget}" required></div>
        <div><label>نسبة الانخفاض لكل مستوى %</label><input type="number" step="any" id="e_dropPercent" value="${planObj.dropPercent}" required></div>
        <div><label>نسبة زيادة قيمة الشراء لكل مستوى %</label><input type="number" step="any" id="e_volumeIncrease" value="${planObj.volumeIncrease}" required></div>
      </div>
      <div id="e_suggestionsBox"></div>
      <button type="submit">حفظ التعديلات</button>
    </form>
    <div class="muted-link"><a id="cancelBtn">إلغاء والرجوع</a></div></div>`;

  document.getElementById('e_market').value = planObj.market || 'مصر';
  document.getElementById('e_currency').value = planObj.currency || 'جنيه مصري';
  document.getElementById('cancelBtn').onclick = () => renderPlanDetail(symbol);

  document.getElementById('editSettingsForm').onsubmit = async (e) => {
    e.preventDefault();
    const plans2 = await getPlans(email);
    const p = plans2[symbol];

    p.market = document.getElementById('e_market').value;
    p.currency = document.getElementById('e_currency').value;
    p.capital = parseFloat(document.getElementById('e_capital').value);
    p.riskPercent = parseFloat(document.getElementById('e_riskPercent').value) || null;
    const profitTarget = parseFloat(document.getElementById('e_profitTarget').value) || 0;
    const dropPercent = parseFloat(document.getElementById('e_dropPercent').value) || 0;
    const volumeIncrease = parseFloat(document.getElementById('e_volumeIncrease').value) || 0;

    if (!window.__bypassSuggestionsEdit) {
      const issues = validateManualInputs({ capital: p.capital, seedAmount: p.seedAmount||0, profitTarget, dropPercent, volumeIncrease });
      if (issues.length){
        const box = document.getElementById('e_suggestionsBox');
        box.innerHTML = `<div class="suggest-box">
          <strong>⚠️ في مدخلات ممكن تكون غير متوازنة:</strong>
          ${issues.map(i=>`<div class="suggest-item">${escapeHtml(i.message)}<br>الحالي: <strong>${i.current}</strong> — المقترح: <strong>${i.suggested}</strong></div>`).join('')}
          <button type="button" class="small" id="e_applySuggestBtn" style="width:auto;">تطبيق كل المقترحات</button>
          <button type="button" class="small secondary" id="e_ignoreSuggestBtn" style="width:auto;">المتابعة بالقيم الحالية</button>
        </div>`;
        document.getElementById('e_applySuggestBtn').onclick = () => {
          issues.forEach(i=>{
            if(i.field==='dropPercent') document.getElementById('e_dropPercent').value = i.suggested;
            if(i.field==='volumeIncrease') document.getElementById('e_volumeIncrease').value = i.suggested;
          });
        };
        document.getElementById('e_ignoreSuggestBtn').onclick = () => {
          window.__bypassSuggestionsEdit = true;
          document.getElementById('editSettingsForm').requestSubmit();
        };
        return;
      }
    }
    window.__bypassSuggestionsEdit = false;

    p.profitTarget = profitTarget; p.dropPercent = dropPercent; p.volumeIncrease = volumeIncrease;

    await savePlans(email, plans2);
    renderPlanDetail(symbol);
  };
}

/* ================== تفاصيل خطة ================== */
async function renderPlanDetail(symbol){
  pushNav(() => renderPlanDetail(symbol));
  const email = await getSession();
  if(!email) return renderLogin();
  if(!(await ensureAccess())) return;
  const plans = await getPlans(email);
  const planObj = plans[symbol];
  if(!planObj) return renderPlansList();
  if(!planObj.closedTrades) planObj.closedTrades = [];
  planObj.levels.forEach(lv=>{ if(!lv.sells) lv.sells = []; });
  if (ensureEnoughLevels(planObj)) { await savePlans(email, plans); }

  const sim = simulatePlan(planObj);
  const exitTargetPrice = (sim.avgCostCurrent!=null && planObj.exitProfitPercent) ? sim.avgCostCurrent * (1 + planObj.exitProfitPercent/100) : null;

  let trimmedShown = false;
  const rowsToRender = sim.rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => {
      if (!r.trimmed) return true;
      if (!trimmedShown) { trimmedShown = true; return true; }
      return false;
    });
  let exitHighlightIdx = null;
  if (exitTargetPrice != null) {
    let bestDiff = Infinity;
    sim.rows.forEach((r, i) => {
      const diff = Math.abs(r.price - exitTargetPrice);
      if (diff < bestDiff) { bestDiff = diff; exitHighlightIdx = i; }
    });
  }
  const tableRows = rowsToRender.map(({ r, i: idx })=>{
    let statusTag = '<span class="tag tag-wait">لسه</span>';
    let rowClass = '';
    if(r.executed){ statusTag = '<span class="tag tag-done">تم الشراء</span>'; rowClass='executed'; }
    if(r.executed && r.cumHeldQty<=0 && r.sells.length){ statusTag += ' <span class="tag tag-sold">اتباعت كلها</span>'; }
    else if(r.executed && r.sells.length){ statusTag += ' <span class="tag tag-partial">بيع جزئي</span>'; }
    if(!r.executed && r.isNext){ statusTag = '<span class="tag tag-next">القادم</span>'; rowClass='pending-next'; }
    if(r.trimmed){ statusTag = '<span class="tag" style="background:#e2e2e2;color:#999;">ملغى — تجاوز رأس المال</span>'; }

    let buyCell = r.trimmed ? '<div style="font-size:11px;color:#999;">تم إلغاء هذا المستوى تلقائيًا لأن المبالغ اللي اشتريتها فعليًا في المستويات السابقة تجاوزت رأس المال المخصص</div>' : '-';
    if (!r.trimmed) {
    if (!r.executed && r.isNext) {
      if (sim.isClosed) {
        buyCell = `<div style="font-size:11px;color:#8a6d1b;">🔒 رحّل الصفقة الحالية المقفولة أولاً (الزر أعلى الجدول) قبل ما تقدر تضيف مستوى جديد</div>`;
      } else {
        buyCell = `<div class="trade-group">
          <div style="font-size:10px;color:#888;margin-bottom:3px;">أقصى كمية على هذا السعر: ${fmtQty(r.maxQty)}</div>
          <div class="trade-fields">
            <input type="number" step="any" min="0.0001" max="${r.maxQty}" placeholder="كمية (أقصى ${fmtQty(r.maxQty)})" id="buyQty_${idx}">
            <input type="number" step="any" placeholder="سعر" id="buyPrice_${idx}">
          </div>
          <button class="trade-btn-buy" onclick="window.__buyLevel('${symbol}', ${idx}, ${r.maxQty})">شراء</button>
        </div>`;
      }
    } else if (r.executed) {
      if (window.__editingBuy === (symbol+':'+idx)) {
        buyCell = `<div class="trade-group">
          <div class="trade-fields">
            <input type="number" step="any" min="0.0001" id="editBuyQty_${idx}" value="${r.qty}">
            <input type="number" step="any" id="editBuyPrice_${idx}" value="${r.price}">
          </div>
          <button class="trade-btn-buy" onclick="window.__updateBuy('${symbol}', ${idx})">حفظ</button>
        </div>`;
      } else {
        const isLast = (idx === sim.lastBoughtIndex);
        buyCell = `<div class="buy-cell">الكمية: <strong>${fmtQty(r.qty)}</strong> | السعر: <strong>${r.price}</strong><br>
          <button class="small secondary" onclick="window.__startEditBuy('${symbol}', ${idx})">تعديل</button>
          ${isLast ? `<button class="small danger" onclick="window.__deleteBuy('${symbol}', ${idx})">حذف</button>` : ''}
        </div>`;
      }
    }
    }

    let sellCell = '';
    if (r.executed) {
      r.sells.forEach(sInfo => {
        if (window.__editingSell === (symbol+':'+idx+':'+sInfo.idx)) {
          sellCell += `<div class="trade-group">
            <div class="trade-fields">
              <input type="number" step="any" min="0.0001" id="editSellQty_${idx}_${sInfo.idx}" value="${sInfo.qty}">
              <input type="number" step="any" id="editSellPrice_${idx}_${sInfo.idx}" value="${sInfo.price}">
            </div>
            <button class="trade-btn-sell" onclick="window.__updateSell('${symbol}', ${idx}, ${sInfo.idx})">حفظ</button>
            <button class="small danger" style="width:100%;margin-top:3px;" onclick="window.__removeSell('${symbol}', ${idx}, ${sInfo.idx})">حذف</button>
          </div>`;
        } else {
          sellCell += `<div class="sell-line"><span>الكمية: <strong>${fmtQty(sInfo.qty)}</strong> | السعر: <strong>${sInfo.price}</strong> (ربح ${sInfo.profit})</span>
            <button class="small secondary" onclick="window.__startEditSell('${symbol}', ${idx}, ${sInfo.idx})">✎</button></div>`;
        }
      });
      if (r.cumHeldQty > 0) {
        sellCell += `<div class="trade-group" style="margin-top:4px;">
          <div class="trade-fields">
            <input type="number" step="any" min="0.0001" max="${r.cumHeldQty}" placeholder="كمية (أقصى ${fmtQty(r.cumHeldQty)})" id="sellQty_${idx}">
            <input type="number" step="any" placeholder="سعر" id="sellPrice_${idx}">
          </div>
          <button class="trade-btn-sell" onclick="window.__sellAtLevel('${symbol}', ${idx}, ${r.cumHeldQty})">+ بيع</button>
        </div>`;
      }
    } else { sellCell = '-'; }

    return `<tr class="${rowClass}"${idx===exitHighlightIdx ? ' style="background:#c8f0d8;"' : ''}>
      <td>${r.level}${idx===exitHighlightIdx ? ' <span class="tag" style="background:#1b8a5a;color:#fff;">🎯 نقطة خروج</span>' : ''}</td>
      <td>${fmtQty(r.qty)}</td>
      <td>${fmt2(r.price)}</td>
      <td>${fmt2(r.amount)}</td>
      <td>${buyCell}</td>
      <td>${sellCell}</td>
      <td>${r.cumHeldQty!=null?fmtQty(r.cumHeldQty):'-'}</td>
      <td>${fmt2(r.cumAvgCost)}</td>
      <td>${fmt2(r.cumSellTarget)}</td>
      <td class="${r.cumRealizedProfit<0?'neg':r.cumRealizedProfit>0?'pos':''}">${fmt2(r.cumRealizedProfit)}</td>
      <td>${statusTag}</td>
      <td class="date-col">${r.execDate?formatDateAr(r.execDate):'-'}</td>
      <td class="date-col">${r.daysElapsed!=null?r.daysElapsed+' يوم':'-'}</td>
      <td class="date-col">${r.tradeCloseDate?formatDateAr(r.tradeCloseDate):'-'}</td>
    </tr>`;
  }).join('');

  const agg = planObj.closedTrades.reduce((acc,ct)=>({
    capital: acc.capital+ct.capitalUsed, profit: acc.profit+ct.profit, qty: acc.qty+ct.totalQty
  }), {capital:0, profit:0, qty:0});
  const aggProfitPercent = agg.capital>0 ? (agg.profit/agg.capital*100) : 0;

  window.__lastPageKey='plan_detail'; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div><strong>${symbol}</strong> — خطة تعزيز متوسط <span class="meta-line">(${planObj.market||''} — ${planObj.currency} — بدأت ${planObj.startDate||'-'})</span></div>
      <div><button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button> <button class="secondary small" id="delBtn">حذف الخطة</button> <button class="secondary small" id="backBtn">📈 كل خطط الـ DCA</button></div>
    </div>

    ${sim.isClosed ? `<div class="success-banner">
      🎉 <strong>تم بيع كل الكمية — الصفقة جاهزة للترحيل!</strong><br>
      إجمالي الكمية: ${fmtQty(sim.totalBoughtQty)} | متوسط الدخول: ${fmt2(sim.avgEntryPrice)} | متوسط الخروج: ${fmt2(sim.avgExitPrice)} |
      الربح الإجمالي: <strong>${sim.totalRealizedProfit.toFixed(2)}</strong> (${((sim.totalRealizedProfit/sim.totalBuyAmountSpent)*100).toFixed(2)}%)
      <div style="font-size:11.5px;color:#666;margin-top:6px;">لسه تقدر تعدّل أي عملية بيع فوق لو لاقيت غلطة في الكمية أو السعر. لما تتأكد إن كل حاجة صح، اضغط ترحيل عشان تقفل الصفقة وتبدأ دورة جديدة — الجدول مش هيقبل أي شراء جديد لحد ما ترحّل.</div>
      <button class="small" style="margin-top:8px;" id="archiveBtn">✅ ترحيل الصفقة وبدء دورة جديدة</button>
    </div>` : ''}

    <div class="section-card">
      <button class="small secondary" id="editSettingsBtn" style="width:auto;">⚙️ تعديل إعدادات وخطة السهم</button>
    </div>

    <div class="section-card">
      <div class="capital-edit">
        <span>رأس المال الحالي المخصص:</span>
        <input type="number" step="any" id="capitalInput" value="${planObj.capital}">
        <button class="small" id="updateCapitalBtn">تحديث</button>
      </div>
    </div>

    <div class="section-card">
      <div class="capital-edit">
        <span>نسبة ربح الخروج الكلي % (لخروج كل الكمية مع بعض):</span>
        <input type="number" step="any" id="exitProfitInput" value="${planObj.exitProfitPercent??''}" placeholder="مثال: 10">
        <button class="small" id="updateExitProfitBtn">تحديث</button>
      </div>
    </div>
    ${exitTargetPrice!=null ? `<div class="info">🎯 لو السعر وصل <strong>${fmt2(exitTargetPrice)}</strong>، بيع كل الكمية المملوكة دلوقتي هيحقق نسبة ربح ${planObj.exitProfitPercent}% على متوسط تكلفتك — المستوى الأقرب لده متهايلايت بالأخضر في الجدول تحت.</div>` : ''}

    <div class="summary-cards">
      <div class="summary-card"><div class="val">${fmtMoney(sim.avgCostCurrent)}</div><div class="lbl">متوسط التكلفة الحالي</div></div>
      <div class="summary-card"><div class="val">${fmtMoney(sim.sellTargetCurrent)}</div><div class="lbl">هدف البيع (${planObj.profitTarget}%)</div></div>
      <div class="summary-card"><div class="val">${sim.heldQty.toLocaleString('en-US')}</div><div class="lbl">الكمية المتبقية حاليًا</div></div>
      <div class="summary-card"><div class="val">${fmtMoney(sim.totalBuyAmountSpent)}</div><div class="lbl">إجمالي المبلغ المستثمر</div></div>
      <div class="summary-card"><div class="val ${(sim.avgCostCurrent!=null && sim.sellTargetCurrent!=null)?((sim.sellTargetCurrent-sim.avgCostCurrent)*sim.heldQty>=0?'pos':'neg'):''}">${(sim.avgCostCurrent!=null && sim.sellTargetCurrent!=null)?fmtMoney((sim.sellTargetCurrent-sim.avgCostCurrent)*sim.heldQty):'-'}</div><div class="lbl">الربح المتوقع لو البيع الآن</div></div>
      <div class="summary-card"><div class="val ${sim.totalRealizedProfit>=0?'pos':'neg'}">${fmtMoney(sim.totalRealizedProfit)}</div><div class="lbl">الربح المحقق حتى الآن</div></div>
    </div>

    <h2 style="margin-top:20px;">موقف السهم على آخر سعر</h2>
    <div class="section-card">
      <label>آخر سعر (اختياري - إدخال يدوي، لو فاضي هياخد سعر آخر مستوى شراء تم تنفيذه)</label>
      <input type="number" step="any" id="manualLastPriceInput" value="${planObj.manualLastPrice??''}" placeholder="مثال: 45.20" style="font-weight:bold;color:#111;font-size:16px;">
      <div class="summary-cards" style="margin-top:12px;">
        <div class="summary-card"><div class="val" id="statusLastPriceUsed">-</div><div class="lbl">السعر المستخدم في الحساب</div></div>
        <div class="summary-card"><div class="val" id="statusTotalValue">-</div><div class="lbl">إجمالي القيمة الحالية للكمية المملوكة</div></div>
        <div class="summary-card"><div class="val" id="statusDropPercent">-</div><div class="lbl">نسبة الانخفاض عن متوسط التكلفة</div></div>
      </div>
    </div>

    <h2 style="margin-top:20px;">جدول المستويات (تراكمي)</h2>
    <button class="secondary small" id="toggleDatesBtn" style="width:auto;">📅 إظهار/إخفاء أعمدة التواريخ</button>
    <div class="section-card" style="overflow-x:auto;">
      <table id="levelsTable" class="dates-hidden">
        <thead><tr>
          <th>المستوى</th><th>عدد الأسهم</th><th>سعر الشراء</th><th>قيمة الشراء</th>
          <th>الشراء الفعلي</th><th>عمليات البيع الفعلي</th>
          <th>الكمية المتبقية تراكمي</th><th>متوسط التكلفة تراكمي</th><th>هدف البيع تراكمي</th>
          <th>الربح المحقق تراكمي</th>
          <th>الحالة</th>
          <th class="date-col">تاريخ الشراء</th><th class="date-col">الأيام المنقضية</th><th class="date-col">تاريخ غلق الصفقة</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>

    <div class="info">طريقة تفعيل المستوى التالي: عند انخفاض السعر ${planObj.dropPercent}%</div>
    ${sim.spacingClamped ? `<div class="error">⚠️ الانخفاض المطلوب كبير جدًا بالنسبة للكمية الحالية في بعض المستويات، فتم تعديله تلقائيًا لمنع وصول السعر لصفر.</div>` : ''}

    <h2 style="margin-top:20px;">سجل الصفقات المغلقة — ${symbol}</h2>
    <div id="dacClosedTradesWrap"></div>

    <p class="disclaimer">تنويه: هذه الحسابات مبنية فقط على المدخلات اللي حددتها، ولا تُعد توصية استثمارية مضمونة.</p>
  </div>`;

  document.getElementById('homeBtn').onclick=()=>renderHome();
  document.getElementById('backBtn').onclick=()=>renderPlansList();
  document.getElementById('editSettingsBtn').onclick=()=>renderEditPlanSettings(symbol);
  document.getElementById('toggleDatesBtn').onclick=()=>{
    document.getElementById('levelsTable').classList.toggle('dates-hidden');
  };
  document.getElementById('delBtn').onclick=async()=>{
    if(!await gConfirm('متأكد إنك عايز تحذف خطة '+symbol+'؟')) return;
    const plans2 = await getPlans(email);
    delete plans2[symbol];
    await savePlans(email, plans2);
    renderPlansList();
  };
  document.getElementById('updateCapitalBtn').onclick=async()=>{
    const newCap = parseFloat(document.getElementById('capitalInput').value);
    if(!newCap || newCap<=0) return;
    const plans2 = await getPlans(email);
    plans2[symbol].capital = newCap;
    await savePlans(email, plans2);
    renderPlanDetail(symbol);
  };

  document.getElementById('updateExitProfitBtn').onclick=async()=>{
    const val = parseFloat(document.getElementById('exitProfitInput').value);
    const plans2 = await getPlans(email);
    plans2[symbol].exitProfitPercent = (!isNaN(val) && val>0) ? val : null;
    await savePlans(email, plans2);
    renderPlanDetail(symbol);
  };

  function updateStatusFields(){
    const manualVal = parseFloat(document.getElementById('manualLastPriceInput').value);
    const lastPriceUsed = (manualVal>0) ? manualVal : sim.lastBoughtPrice;
    const totalValueEl = document.getElementById('statusTotalValue');
    const lastPriceEl = document.getElementById('statusLastPriceUsed');
    const dropEl = document.getElementById('statusDropPercent');
    if (lastPriceUsed==null) {
      lastPriceEl.textContent = '-'; totalValueEl.textContent = '-'; dropEl.textContent = '-';
      return;
    }
    const totalValue = sim.heldQty * lastPriceUsed;
    lastPriceEl.textContent = fmtMoney(lastPriceUsed);
    totalValueEl.textContent = fmtMoney(totalValue);
    if (sim.avgCostCurrent!=null && sim.avgCostCurrent>0) {
      const dropPercent = ((lastPriceUsed - sim.avgCostCurrent) / sim.avgCostCurrent) * 100;
      dropEl.textContent = dropPercent.toFixed(2)+'%';
      dropEl.className = 'val ' + (dropPercent<0 ? 'neg' : 'pos');
    } else {
      dropEl.textContent = '-';
    }
  }
  document.getElementById('manualLastPriceInput').addEventListener('input', updateStatusFields);
  document.getElementById('manualLastPriceInput').addEventListener('change', async ()=>{
    const val = parseFloat(document.getElementById('manualLastPriceInput').value) || null;
    const plans2 = await getPlans(email);
    plans2[symbol].manualLastPrice = val;
    await savePlans(email, plans2);
  });
  updateStatusFields();

  if (sim.isClosed) {
    document.getElementById('archiveBtn').onclick = async () => {
      const plans2 = await getPlans(email);
      const p = plans2[symbol];
      const s = simulatePlan(p);
      p.closedTrades.push({
        closedDate: new Date().toISOString(),
        totalQty: s.totalBoughtQty, avgEntry: s.avgEntryPrice, avgExit: s.avgExitPrice,
        profit: s.totalRealizedProfit, profitPercent: (s.totalRealizedProfit/s.totalBuyAmountSpent)*100,
        capitalUsed: s.totalBuyAmountSpent
      });
      p.levels.forEach(lv=>{ lv.executed=false; lv.actualQty=null; lv.actualPrice=null; lv.execDate=null; lv.sells=[]; });
      await savePlans(email, plans2);
      renderPlanDetail(symbol);
    };
  }

  renderClosedTradesUI('dacClosedTradesWrap', () => planObj.closedTrades, {
    afterChange: async () => { const plans2 = await getPlans(email); plans2[symbol] = planObj; await savePlans(email, plans2); },
    onClearAll: async () => { planObj.closedTrades = []; const plans2 = await getPlans(email); plans2[symbol] = planObj; await savePlans(email, plans2); },
    onExportXlsx: (trades) => {
      try{
        const numFmt = "mso-number-format:'#,##0.00';";
        const intFmt = "mso-number-format:'#,##0';";
        const th = "background:#14532D;color:#ffffff;font-weight:bold;border:1px solid #000000;padding:6px 10px;text-align:center;";
        const td = "border:1px solid #999999;padding:5px 10px;text-align:center;";
        const tdLabel = "border:1px solid #999999;padding:5px 10px;font-weight:bold;background:#EEF6F2;text-align:right;";
        const totalTd = "border:1px solid #000000;padding:6px 10px;text-align:center;font-weight:bold;background:#E6F4EA;";
        const titleTd = "background:#14532D;color:#ffffff;font-weight:bold;font-size:16px;padding:10px;text-align:center;";
        const exAgg = trades.reduce((acc,t)=>({qty:acc.qty+t.totalQty, capital:acc.capital+t.capitalUsed, profit:acc.profit+t.profit}), {qty:0,capital:0,profit:0});
        const exPct = exAgg.capital>0 ? (exAgg.profit/exAgg.capital*100) : 0;

        let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8">
        <xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
        <x:Name>${symbol}</x:Name><x:WorksheetOptions><x:RTL/><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
        </head><body dir="rtl">
        <table style="border-collapse:collapse;font-family:Tahoma,Arial;direction:rtl;" dir="rtl">
          <tr><td colspan="7" style="${titleTd}">GRIFFINE — بيان الصفقات المغلقة</td></tr>
          <tr><td style="${tdLabel}">اسم السهم</td><td colspan="6" style="${td}">${symbol}</td></tr>
          <tr><td style="${tdLabel}">الدولة / البورصة</td><td colspan="6" style="${td}">${planObj.market||''}</td></tr>
          <tr><td style="${tdLabel}">العملة</td><td colspan="6" style="${td}">${planObj.currency||''}</td></tr>
          <tr><td style="${tdLabel}">تاريخ بداية الاستثمار</td><td colspan="6" style="${td}">${planObj.startDate||''}</td></tr>
          <tr><td style="${tdLabel}">تاريخ الطباعة</td><td colspan="6" style="${td}">${new Date().toLocaleDateString('ar-EG')}</td></tr>
          <tr><td colspan="7" style="border:none;"></td></tr>
          <tr>
            <td style="${th}">تاريخ ووقت الإغلاق</td><td style="${th}">الكمية</td><td style="${th}">متوسط الدخول</td>
            <td style="${th}">متوسط الخروج</td><td style="${th}">الربح</td><td style="${th}">نسبة الربح %</td><td style="${th}">رأس المال المستخدم</td>
          </tr>
          ${trades.slice().reverse().map(ct=>`<tr>
            <td style="${td}">${formatDateTimeAr(ct.closedDate)}</td>
            <td style="${td}${intFmt}">${fmtQty(ct.totalQty)}</td>
            <td style="${td}${numFmt}">${ct.avgEntry.toFixed(2)}</td>
            <td style="${td}${numFmt}">${ct.avgExit.toFixed(2)}</td>
            <td style="${td}${numFmt}">${ct.profit.toFixed(2)}</td>
            <td style="${td}${numFmt}">${ct.profitPercent.toFixed(2)}</td>
            <td style="${td}${numFmt}">${ct.capitalUsed.toFixed(2)}</td>
          </tr>`).join('')}
          <tr>
            <td style="${totalTd}">الإجمالي</td>
            <td style="${totalTd}${intFmt}">${fmtQty(exAgg.qty)}</td>
            <td style="${totalTd}"></td><td style="${totalTd}"></td>
            <td style="${totalTd}${numFmt}">${exAgg.profit.toFixed(2)}</td>
            <td style="${totalTd}${numFmt}">${exPct.toFixed(2)}</td>
            <td style="${totalTd}${numFmt}">${exAgg.capital.toFixed(2)}</td>
          </tr>
        </table>
        </body></html>`;

        const blob = new Blob(['\ufeff'+html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `griffine_${symbol}_صفقات_مغلقة.xls`;
        a.click(); URL.revokeObjectURL(url);
      }catch(err){
        alert('حصل خطأ في تصدير الإكسيل: '+err.message);
      }
    },
    onExportPdf: (trades) => {
      const w = window.open('', '_blank');
      const exAgg = trades.reduce((acc,t)=>({qty:acc.qty+t.totalQty, capital:acc.capital+t.capitalUsed, profit:acc.profit+t.profit}), {qty:0,capital:0,profit:0});
      const exPct = exAgg.capital>0 ? (exAgg.profit/exAgg.capital*100) : 0;
      const rowsHtml = trades.slice().reverse().map(ct=>`<tr>
        <td>${formatDateTimeAr(ct.closedDate)}</td><td>${fmtQty(ct.totalQty)}</td><td>${fmt2(ct.avgEntry)}</td>
        <td>${fmt2(ct.avgExit)}</td><td>${ct.profit.toFixed(2)}</td><td>${ct.profitPercent.toFixed(2)}%</td><td>${fmt2(ct.capitalUsed)}</td>
      </tr>`).join('');
      w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>بيان صفقات ${symbol}</title>
        <style>body{font-family:Tahoma,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin-top:14px;}
        th,td{border:1px solid #ccc;padding:8px;text-align:center;font-size:13px;} th{background:#14532d;color:#fff;}
        h1{color:#14532d;} .agg{margin-top:16px;font-size:14px;background:#f0f4f2;padding:10px;border-radius:8px;}</style></head>
        <body>
        ${reportLogoHeaderHtml()}
        <h1>GRIFFINE — بيان الصفقات المغلقة: ${symbol}</h1>
        <p>العملة: ${planObj.currency} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
        <table><thead><tr><th>تاريخ ووقت الإغلاق</th><th>الكمية</th><th>متوسط الدخول</th><th>متوسط الخروج</th><th>الربح</th><th>نسبة الربح</th><th>رأس المال المستخدم</th></tr></thead>
        <tbody>${rowsHtml}</tbody></table>
        <div class="agg"><strong>الإجمالي التراكمي:</strong> الكمية: ${fmtQty(exAgg.qty)} | رأس المال المستخدم: ${exAgg.capital.toFixed(2)} |
        الربح: ${exAgg.profit.toFixed(2)} | نسبة الربح: ${exPct.toFixed(2)}%</div>
        <script>window.onload = () => window.print();<\/script>
        </body></html>`);
      w.document.close();
    },
  });

  window.__buyLevel = async (sym, idx) => {
    const qty = parseFloat(document.getElementById('buyQty_'+idx).value);
    const price = parseFloat(document.getElementById('buyPrice_'+idx).value);
    if(!qty || qty<=0 || !price){ alert('أدخل الكمية والسعر (رقم أكبر من صفر - ممكن يكون كسر عشري)'); return; }
    const plans2 = await getPlans(email);
    const p = plans2[sym];
    const simBefore = simulatePlan(p);
    const newAmount = qty*price;
    const remainingBudget = p.capital - simBefore.totalBuyAmountSpent;
    if (newAmount > remainingBudget + 1e-6) {
      alert(`⚠️ تجاوز حد رأس المال المخصص للسهم!\nالمبلغ اللي بتحاول تشتري بيه (${newAmount.toFixed(2)}) أكبر من المتاح.\nالمتبقي المتاح للشراء حاليًا هو: ${Math.max(remainingBudget,0).toFixed(2)} فقط، عشان إجمالي المشتريات لا يتجاوز ${p.capital} (رأس المال المخصص للسهم).\n\nلو عايز تشتري بمبلغ أكبر، تقدر تزوّد رأس المال المخصص للسهم من الخانة أعلى الجدول، وهيعاد جدولة وحساب المستويات تلقائيًا لتفتح مستويات إضافية تتناسب مع رأس المال الجديد.`);
      return;
    }
    plans2[sym].levels[idx].executed = true;
    plans2[sym].levels[idx].actualQty = qty;
    plans2[sym].levels[idx].actualPrice = price;
    plans2[sym].levels[idx].execDate = new Date().toISOString().split('T')[0];
    plans2[sym].levels[idx].sells = [];
    await savePlans(email, plans2);
    renderPlanDetail(sym);
  };
  window.__startEditBuy = (sym, idx) => { window.__editingBuy = sym+':'+idx; renderPlanDetail(sym); };
  window.__updateBuy = async (sym, idx) => {
    const qty = parseFloat(document.getElementById('editBuyQty_'+idx).value);
    const price = parseFloat(document.getElementById('editBuyPrice_'+idx).value);
    if(!qty || qty<=0 || !price){ alert('أدخل الكمية والسعر (رقم أكبر من صفر - ممكن يكون كسر عشري)'); return; }
    const plans2 = await getPlans(email);
    const p = plans2[sym];
    const oldQty = p.levels[idx].actualQty, oldPrice = p.levels[idx].actualPrice;
    const oldAmount = (oldQty||0) * (oldPrice||0);
    const simBefore = simulatePlan(p);
    const spentByOthers = simBefore.totalBuyAmountSpent - oldAmount;
    const newAmount = qty*price;
    const remainingBudget = p.capital - spentByOthers;
    if (newAmount > remainingBudget + 1e-6) {
      alert(`⚠️ تجاوز حد رأس المال المخصص للسهم!\nالمبلغ الجديد (${newAmount.toFixed(2)}) أكبر من المتاح.\nأقصى مبلغ ممكن لهذا المستوى حاليًا هو: ${Math.max(remainingBudget,0).toFixed(2)} فقط، عشان إجمالي المشتريات لا يتجاوز ${p.capital}.\n\nلو عايز تشتري بمبلغ أكبر، زوّد رأس المال المخصص للسهم من الخانة أعلى الجدول، وهيعاد جدولة المستويات تلقائيًا.`);
      return;
    }
    plans2[sym].levels[idx].actualQty = qty;
    plans2[sym].levels[idx].actualPrice = price;
    await savePlans(email, plans2);
    window.__editingBuy = null;
    renderPlanDetail(sym);
  };
  window.__deleteBuy = async (sym, idx) => {
    const plans2 = await getPlans(email);
    const hasSells = (plans2[sym].levels[idx].sells||[]).length > 0;
    const msg = hasSells
      ? 'المستوى ده فيه عمليات بيع مسجلة عليه، وحذف الشراء هيلغي عمليات البيع دي كمان. متأكد؟'
      : 'متأكد إنك عايز تلغي عملية الشراء دي؟';
    if(!await gConfirm(msg)) return;
    plans2[sym].levels[idx].executed = false;
    plans2[sym].levels[idx].actualQty = null;
    plans2[sym].levels[idx].actualPrice = null;
    plans2[sym].levels[idx].execDate = null;
    plans2[sym].levels[idx].sells = [];
    await savePlans(email, plans2);
    window.__editingBuy = null;
    renderPlanDetail(sym);
  };

  window.__sellAtLevel = async (sym, idx, maxQty) => {
    const qty = parseFloat(document.getElementById('sellQty_'+idx).value);
    const price = parseFloat(document.getElementById('sellPrice_'+idx).value);
    if(!qty || qty<=0 || !price){ alert('أدخل الكمية والسعر (رقم أكبر من صفر - ممكن يكون كسر عشري)'); return; }
    if(qty > maxQty){ alert(`العدد اللي كتبته (${qty}) أكبر من الكمية المتاحة للبيع (${maxQty}). العدد الأقصى المسموح به هو ${maxQty}.`); return; }
    const plans2 = await getPlans(email);
    if(!plans2[sym].levels[idx].sells) plans2[sym].levels[idx].sells = [];
    plans2[sym].levels[idx].sells.push({ qty, price, date: new Date().toISOString().split('T')[0] });
    await savePlans(email, plans2);
    renderPlanDetail(sym);
  };
  window.__startEditSell = (sym, idx, sIdx) => { window.__editingSell = sym+':'+idx+':'+sIdx; renderPlanDetail(sym); };
  window.__updateSell = async (sym, idx, sIdx) => {
    const qty = parseFloat(document.getElementById(`editSellQty_${idx}_${sIdx}`).value);
    const price = parseFloat(document.getElementById(`editSellPrice_${idx}_${sIdx}`).value);
    if(!qty || qty<=0 || !price){ alert('أدخل الكمية والسعر (رقم أكبر من صفر - ممكن يكون كسر عشري)'); return; }

    const plans2 = await getPlans(email);
    const p = plans2[sym];
    // نتأكد إن الكمية الجديدة منطقية: نحسب أقصى كمية متاحة باستبعاد هذا البيع من الحساب أولًا
    const originalQty = p.levels[idx].sells[sIdx].qty;
    p.levels[idx].sells[sIdx].qty = 0; // مؤقتًا لحساب السقف
    const simCheck = simulatePlan(p);
    const maxAllowed = simCheck.rows[idx].cumHeldQty + 0; // الكمية المتاحة في هذا المستوى بعد استبعاد هذا البيع
    p.levels[idx].sells[sIdx].qty = originalQty; // استرجاع القيمة الأصلية لحين التأكيد

    if(qty > maxAllowed){
      alert(`العدد اللي كتبته (${qty}) أكبر من الكمية المتاحة (${maxAllowed}). العدد الأقصى المسموح به هو ${maxAllowed}.`);
      return;
    }

    const existingDate = p.levels[idx].sells[sIdx].date;
    p.levels[idx].sells[sIdx] = { qty, price, date: existingDate };
    await savePlans(email, plans2);
    window.__editingSell = null;
    renderPlanDetail(sym);
  };
  window.__removeSell = async (sym, idx, sIdx) => {
    if(!await gConfirm('متأكد إنك عايز تحذف عملية البيع دي؟')) return;
    const plans2 = await getPlans(email);
    plans2[sym].levels[idx].sells.splice(sIdx,1);
    await savePlans(email, plans2);
    window.__editingSell = null;
    renderPlanDetail(sym);
  };
}

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

/* ================== TradingView Widget (عرض بصري بس - مفيش أي سحب بيانات منه) ================== */
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
  pushNav(() => renderScreener());
  const email = await getSession();
  if (email && !(await ensureAccess())) return;

  app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar">
      <div>${pageTitle('screener','كشاف الأسهم — تحليل فني لسهم واحد')}</div>
      <button class="secondary small" id="homeBtn">🏠 الشاشة الرئيسية</button>
    </div>

    <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:8px 12px;font-size:12.5px;color:#7a5c00;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
      <span>⚠️ المعلومات أدناه هي أدوات تحليلية وليست توصيات استثمارية.</span>
      <a id="screenerDisclaimerLink" style="color:#7a5c00;text-decoration:underline;cursor:pointer;">التفاصيل الكاملة</a>
    </div>

    <div class="info">📊 اكتب رمز السهم واختار السوق والفترة، والأسعار (أعلى / أقل / آخر سعر) بتتجاب تلقائيًا ومتأخرة 15 دقيقة، وتقدر تعدّلها يدوي. البحث على كل السوق مرة واحدة مؤجل لحد ما نفعّل اشتراك بيانات حي. الشارت تحت للعرض والقراءة بس (مباشر من TradingView) — الحساب بياخد الأرقام الموجودة في الخانات تحت (التلقائية أو اللي عدّلتها إنت).</div>

    <h2>شارت مباشر (للقراءة والمرجعية)</h2>
    <div class="section-card">
      <label>رمز السهم على TradingView</label>
      <div style="display:flex;gap:8px;">
        <input type="text" id="tv_symbol" placeholder="مثال: EGX:COMI" style="flex:1;">
        <button type="button" id="tv_loadBtn" style="width:auto;">تحميل الشارت</button>
      </div>
      <div id="tvWidgetContainer" style="margin-top:10px;"></div>
    </div>

    <h2 style="margin-top:20px;">أداة التحليل الفني</h2>
    <div class="section-card">
      <div class="info" style="margin-bottom:10px;">هنا بتحسب مستويات الدعم والمقاومة بطريقتي فيبوناتشي ونقاط بيفوت مع بعض في نفس الوقت، من أعلى وأقل سعر خلال الفترة (+ آخر سعر إغلاق).</div>

      <div class="grid2">
        <div><label>اسم السهم / الرمز <span style="color:var(--danger);">*</span></label>
          <input type="text" id="ta_symbol" placeholder="مثال: COMI" dir="ltr" autocomplete="off"></div>
        <div><label>السوق</label>
          <select id="ta_market">${Object.keys(MARKET_TO_CURRENCY_MAP).map(m=>`<option value="${m}">${m}</option>`).join('')}</select></div>
      </div>

      <label style="margin-top:10px;">الفترة الزمنية</label>
      <select id="ta_hlPeriod">${Object.keys(TA_HL_PERIOD_LABELS).map(k=>`<option value="${k}" ${k==='month'?'selected':''}>${TA_HL_PERIOD_LABELS[k]}</option>`).join('')}</select>

      <!-- الإصدار 76: جلب أعلى/أقل/آخر سعر تلقائيًا (الخانات تحت بتفضل قابلة للتعديل اليدوي) -->
      <button type="button" class="secondary" id="ta_fetchBtn" style="margin-top:10px;">⚡ جلب الأسعار تلقائيًا</button>
      <div id="ta_fetchStatus" style="margin-top:8px;font-size:12.5px;"></div>

      <div class="grid2" style="margin-top:8px;">
        <div><label>أعلى قمة سعرية خلال الفترة <span style="color:var(--danger);">*</span></label><input type="number" step="any" id="ta_high" placeholder="مثال: 52.30"></div>
        <div><label>أقل قاع سعري خلال الفترة <span style="color:var(--danger);">*</span></label><input type="number" step="any" id="ta_low" placeholder="مثال: 44.10"></div>
      </div>
      <div style="margin-top:8px;">
        <label>آخر سعر إغلاق <span style="color:var(--danger);">*</span> <span class="ta-delay-badge" title="الأسعار التلقائية من مصدر بيانات مجاني متأخر">⏱ متأخر 15 دقيقة</span></label>
        <input type="number" step="any" id="ta_pivotClose" placeholder="مثال: 48.00">
        <div id="ta_closeNote" class="disclaimer" style="margin-top:4px;"></div>
      </div>

      <button id="ta_calcBtn" style="margin-top:12px;">🔍 احسب</button>
    </div>

    <div id="ta_resultsArea"></div>
  </div>`;

  document.getElementById('homeBtn').onclick=()=>{ email ? renderHome() : renderPublicHome(); };
  document.getElementById('screenerDisclaimerLink').onclick=()=>renderDisclaimerPage({ backTo: () => renderScreener() });

  document.getElementById('tv_loadBtn').onclick = () => renderTradingViewWidget(document.getElementById('tv_symbol').value.trim());
  renderTradingViewWidget('EGX:EGX30');

  /* ---------- الإصدار 76: جلب الأسعار تلقائيًا من السيرفر (market_quote.php) ----------
     بيتنفذ لما تكتب الرمز وتسيبه، أو تغيّر السوق أو الفترة، أو تدوس الزرار.
     القيم بتتكتب في الخانات، وتقدر تعدّلها يدوي بعدها عادي. */
  const taEl = (id) => document.getElementById(id);
  let taFetchSeq = 0, taSource = 'manual', taLastKey = '';
  const taStatus = (html, cls) => { const el = taEl('ta_fetchStatus'); if (el) el.innerHTML = html ? `<div class="${cls || 'info'}" style="margin:0;">${html}</div>` : ''; };
  // force = من الزرار (بيجيب دايمًا). التلقائي بيتجاهل نفس السهم/السوق/الفترة عشان ميكتبش فوق تعديلك اليدوي
  async function taFetchQuote(force){
    const symbol = taEl('ta_symbol').value.trim();
    if (!symbol) { taStatus('اكتب رمز السهم الأول (زي COMI).', 'error'); return; }
    const key = [symbol.toUpperCase(), taEl('ta_market').value, taEl('ta_hlPeriod').value].join('|');
    if (force !== true && key === taLastKey) return;
    taLastKey = key;
    if (!email) { promptSignupToContinue('سجّل حساب مجاني عشان تقدر تجيب الأسعار تلقائيًا وتستخدم أداة التحليل.', () => renderScreener()); return; }
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
    const range = r.partial ? `<b>أعلى وأقل سعر لفترة «${escapeHtml(TA_HL_PERIOD_LABELS[r.period] || '')}» مش متاحين من المصدر دلوقتي — اكتبهم يدوي أو اختار فترة تانية.</b><br>`
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
    if (!email) { promptSignupToContinue('سجّل حساب مجاني عشان تقدر تستخدم أداة التحليل وتشوف النتيجة.', () => renderScreener()); return; }
    const resultsArea = document.getElementById('ta_resultsArea');
    const symbol = document.getElementById('ta_symbol').value.trim();
    if (!symbol) {
      resultsArea.innerHTML = '<div class="error" style="margin-top:12px;">اسم السهم / الرمز حقل إلزامي.</div>';
      return;
    }
    const high = parseFloat(document.getElementById('ta_high').value);
    const low = parseFloat(document.getElementById('ta_low').value);
    const close = parseFloat(document.getElementById('ta_pivotClose').value);
    if (isNaN(high) || isNaN(low) || high <= low) {
      resultsArea.innerHTML = '<div class="error" style="margin-top:12px;">أدخل أعلى قمة وأقل قاع صحيحين (القمة أكبر من القاع).</div>';
      return;
    }
    if (isNaN(close)) {
      resultsArea.innerHTML = '<div class="error" style="margin-top:12px;">آخر سعر إغلاق حقل إلزامي (لازم لحساب نقاط بيفوت).</div>';
      return;
    }
    const periodLabel = TA_HL_PERIOD_LABELS[document.getElementById('ta_hlPeriod').value];
    const fib = ta_fibonacci(high, low);
    const pv = ta_pivotPoints(high, low, close);

    resultsArea.innerHTML = `<h2>نتيجة الحساب — ${escapeHtml(symbol)}</h2>
      <div class="section-card">
        <div style="font-size:12px;color:#888;margin-bottom:10px;">الفترة الزمنية: ${periodLabel} — أعلى: ${high.toFixed(2)} — أقل: ${low.toFixed(2)} — آخر إغلاق: ${close.toFixed(2)}</div>

        <div class="section-title">فيبوناتشي</div>
        <div class="grid2" style="margin-top:4px;">
          <div>
            <div style="font-size:11.5px;color:#888;">3 مستويات دعم</div>
            ${fib.supports.map((v,i)=>`<div>الدعم ${i+1}: <strong>${v.toFixed(2)}</strong></div>`).join('')}
          </div>
          <div>
            <div style="font-size:11.5px;color:#888;">3 مستويات مقاومة</div>
            ${fib.resistances.map((v,i)=>`<div>المقاومة ${i+1}: <strong>${v.toFixed(2)}</strong></div>`).join('')}
          </div>
        </div>

        <div class="section-title" style="margin-top:16px;">نقاط بيفوت (Pivot Points)</div>
        <div style="font-size:12px;color:#666;margin:4px 0 6px;">نقطة المحور (Pivot): <strong>${pv.pivot.toFixed(2)}</strong></div>
        <div class="grid2">
          <div>
            <div style="font-size:11.5px;color:#888;">3 مستويات دعم</div>
            ${pv.supports.map((v,i)=>`<div>الدعم ${i+1}: <strong>${v.toFixed(2)}</strong></div>`).join('')}
          </div>
          <div>
            <div style="font-size:11.5px;color:#888;">3 مستويات مقاومة</div>
            ${pv.resistances.map((v,i)=>`<div>المقاومة ${i+1}: <strong>${v.toFixed(2)}</strong></div>`).join('')}
          </div>
        </div>

        <button class="small" style="width:auto;margin-top:14px;" onclick="window.__useForPlan('${symbol.replace(/'/g,"")}', ${close.toFixed(2)}, '${taEl('ta_market').value.replace(/'/g,'')}')">أنشئ خطة لهذا السهم</button>
      </div>
      <p class="disclaimer">${taSource === 'auto' ? 'تنويه: الأرقام متجابة تلقائيًا من مصدر بيانات مجاني (متأخرة 15 دقيقة) - راجعها قبل أي قرار.' : 'تنويه: الحساب مبني على الأرقام اللي دخّلتها يدويًا.'}</p>`;
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

/* ================== شات الدردشة العائم ================== */
/* الإصدار 83: مفيش إشعارات منبثقة على الشاشة (Notification / Push) للشات خالص - زي ماسنجر:
   التنبيه = نقطة حمرا على أيقونة الشات + صوت (المستخدم يقدر يكتمه) ← chatAlert() */

/* الإصدار 78: الشات بيتظبط حسب الحساب الحالي - ولو الحساب اتغيّر (خروج / دخول بحساب تاني من غير تحديث الصفحة)
   بيتقفل ويتعمل من جديد. قبل كده كان بيفضل بوضع الحساب القديم: عميل يلاقي لوحة "محادثات العملاء"
   بتاعة الأدمن والسيرفر يرفض ← "غير مصرح لك". */
function chatWidgetMode(email){ return (email || 'guest') + '|' + ((window.__isAdmin && hasPermission('view_chat')) ? 'admin' : 'visitor'); }
function teardownChatWidget(){
  ['__chatBgPoll', '__chatPollInterval', '__adminBubblePoll', '__adminBubbleHeartbeat', '__chatQuickPoll'].forEach(k => { if (window[k]) { clearInterval(window[k]); window[k] = null; } });
  window.__adminBubbleCheck = null; window.__adminChatSeen = null;
  ['chatBubble', 'chatPanel'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
  window.__chatWidgetMode = null;
}
async function syncChatWidget(email){
  if (window.__chatWidgetMode === undefined) return;            // الشات لسه متعملش أول مرة (init هيعمله)
  if (window.__chatWidgetMode === chatWidgetMode(email)) return; // نفس الحساب ونفس الوضع
  teardownChatWidget();
  await initChatWidget(email);
}

async function initChatWidget(sessionEmail){
  window.__chatWidgetMode = chatWidgetMode(sessionEmail);
  const myMode = window.__chatWidgetMode;
  const [settings] = await Promise.all([getAdminSettings(), loadChatNotifyCfg()]);
  if (window.__chatWidgetMode !== myMode) return;   // الحساب اتغيّر أثناء التحميل
  if (settings.chat_enabled === false) return; // الشات موقوف خالص
  if (settings.chat_icon_visible === false) return; // الأيقونة مخفية

  // الإصدار 77: لوحة "محادثات العملاء" للي عنده صلاحية مشاهدة الشات بس.
  // أي موظف تاني (أو أدمن من غير الصلاحية دي) بيشوف شات العميل العادي ويقدر يكلّم الدعم
  // (قبل كده كانت بتفتحله لوحة الإدارة والسيرفر يرفض ← "حصل خطأ في تحميل المحادثات")
  const isAdminUser = window.__isAdmin && hasPermission('view_chat');

  const bubble = document.createElement('div');
  bubble.id = 'chatBubble';
  // الصورة: شعار GRIFFINE (بيتبدّل مع الوضع الليلي/النهاري) أو صورة مخصّصة من الأدمن / من المستخدم (الإصدار 83)
  bubble.innerHTML = `<img src="" alt="الدردشة الفورية"><span id="chatBadge"></span>`;
  document.body.appendChild(bubble);
  applyChatBubbleIcon();

  const panel = document.createElement('div');
  panel.id = 'chatPanel';
  document.body.appendChild(panel);

  if (isAdminUser) { initAdminBubble(bubble, panel); return; }

  /* =====================================================================
     شات العميل / الزائر (الإصدار 82 - على طريقة ماسنجر)
     - نقطة حمرا على الأيقونة لما يوصل رد جديد من الإدارة (حتى لو الرد وصل وإنت قافل الموقع)
     - الرسائل بتتحدّث كل 3 ثواني والشات مفتوح، وكل 8 ثواني في الخلفية
     - رفع الملفات والصور مقفول افتراضيًا - بيظهر 📎 بس لما الأدمن/الموظف يفتحه للمحادثة دي
     - "✓✓ اتشافت" تحت آخر رسالة ليك لما الإدارة تقراها
     - الزائر اللي لسه مسجّلش/اشتركش بيشوف "استفسار قبل الاشتراك"
     ===================================================================== */
  // المستخدم المسجّل ← معرّف محادثة ثابت للحساب من السيرفر (نفس المحادثة من أي جهاز). الزائر ← معرّف الجهاز
  let visitorId = getOrCreateVisitorId();
  if (sessionEmail) {
    try { const r = await apiGet('/chat_my_id.php?local=' + encodeURIComponent(visitorId)); if (r && r.success && r.visitorId) visitorId = r.visitorId; } catch(e){}
    if (window.__chatWidgetMode !== chatWidgetMode(sessionEmail)) return;   // الحساب اتغيّر أثناء التحميل
    // الإصدار 83: معرّف الجهاز بقى بتاع الحساب ← الجهاز ياخد معرّف زائر جديد عشان بعد الخروج الزائر ميشوفش محادثة الحساب
    if (visitorId === localStorage.getItem('griffine_visitor_id')) { try { localStorage.removeItem('griffine_visitor_id'); } catch(e){} }
  }
  let knownEmail = sessionEmail || localStorage.getItem('griffine_chat_email') || null;
  const startedKey = 'griffine_chat_started_' + visitorId;
  const seenKey = 'griffine_chat_seen_admin_' + visitorId;          // آخر رسالة من الإدارة اتشافت على الجهاز ده
  let hasStarted = localStorage.getItem(startedKey) === '1';
  let allowUpload = false, adminReadAt = null, maxUploadMb = CHAT_DEFAULT_UPLOAD_MB;
  let attachFile = null;   // الإصدار 83: الملف نفسه (بيترفع على أجزاء وقت الإرسال) بدل Base64
  let lastNotifiedId = +(localStorage.getItem(seenKey) || 0);
  const isGuest = !sessionEmail;
  const headerTitle = isGuest ? '💬 استفسار قبل الاشتراك' : '💬 تواصل مع GRIFFINE';
  // الإصدار 83: المحادثة طلعت بتاعة حساب (الزائر على جهاز كان مسجّل عليه حد) ← معرّف زائر جديد ونبدأ من الأول
  function handleNotOwner(res){
    if (!res || res.code !== 'not_owner' || !isGuest) return false;
    resetGuestChatIdentity();
    teardownChatWidget();
    initChatWidget(null);
    return true;
  }

  const markStarted = () => { if (!hasStarted) { hasStarted = true; try { localStorage.setItem(startedKey, '1'); } catch(e){} } };
  const seenAdminId = () => +(localStorage.getItem(seenKey) || 0);
  const maxAdminId = (msgs) => msgs.reduce((mx, m) => (m.sender === 'admin' && +m.id > mx ? +m.id : mx), 0);

  function updateBadge(hasUnread){
    const badge = document.getElementById('chatBadge');
    if (!badge) return;
    badge.style.display = hasUnread ? 'block' : 'none';
  }

  // فحص في الخلفية حتى والشات مقفول: رد جديد من الإدارة ← نقطة حمرا + صوت (من غير أي إشعار منبثق)
  async function backgroundCheck(){
    if (!hasStarted || panel.classList.contains('open')) return;
    const res = await getChatHistory(visitorId);
    if (handleNotOwner(res)) return;
    if (!res || !res.success) return;
    allowUpload = !!res.allowUpload; adminReadAt = res.adminReadAt || null; maxUploadMb = +res.maxUploadMb || CHAT_DEFAULT_UPLOAD_MB;
    const msgs = res.messages || [];
    const top = maxAdminId(msgs);
    if (top > seenAdminId()) {
      updateBadge(true);
      if (top > lastNotifiedId) { lastNotifiedId = top; chatAlert(); }
    }
  }
  if (hasStarted) backgroundCheck();
  window.__chatBgPoll = setInterval(backgroundCheck, 8000);

  function renderEmailGate(){
    panel.innerHTML = `
      <div class="chat-header"><span>${headerTitle}</span><span><button id="chatPrefsBtn" title="تنبيهات الشات (الصوت / الصورة)">⚙️</button><button id="chatCloseBtn">✕</button></span></div>
      <div class="chat-email-gate">
        <p style="font-size:13px;line-height:1.8;">${isGuest ? 'عندك سؤال عن GRIFFINE أو الاشتراك، أو مش عارف تشترك؟ ابعتلنا وفريقنا هيرد عليك.' : 'تقدر تبدأ تكلمنا على طول.'}<br><small style="opacity:.75">اكتب إيميلك لو حابب نرد عليك عليه كمان (اختياري).</small></p>
        <input type="email" id="chatEmailInput" placeholder="بريدك الإلكتروني (اختياري)" style="width:100%;padding:9px;border:1px solid #ddd;border-radius:8px;margin:8px 0;" dir="ltr">
        <button id="chatStartBtn" style="width:100%;">بدء المحادثة</button>
      </div>`;
    document.getElementById('chatCloseBtn').onclick = closeChat;
    document.getElementById('chatPrefsBtn').onclick = () => renderChatPrefsPanel(panel, renderEmailGate, closeChat);
    document.getElementById('chatStartBtn').onclick = async () => {
      const val = document.getElementById('chatEmailInput').value.trim().toLowerCase();
      if (val) {
        if (!val.includes('@')) { alert('اكتب إيميل صحيح أو سيب الخانة فاضية'); return; }
        knownEmail = val;
        localStorage.setItem('griffine_chat_email', knownEmail);
      }
      markStarted();
      renderChatConversation();
    };
  }

  // شريط الإرفاق (بيظهر بس لو الإدارة فتحت الرفع)
  function syncUploadUi(){
    const label = document.getElementById('chatAttachLabel');
    const note = document.getElementById('chatUploadNote');
    if (label) label.style.display = allowUpload ? '' : 'none';
    if (note) { note.style.display = allowUpload ? '' : 'none'; note.textContent = `📎 فريق الدعم فتحلك إرسال صورة أو PDF أو فيديو أو ملف (لحد ${maxUploadMb} ميجا)`; }
    if (!allowUpload && attachFile) { attachFile = null; renderAttachChip(); }
  }
  function renderAttachChip(progress){
    const chip = document.getElementById('chatAttachChip');
    if (!chip) return;
    chip.style.display = attachFile ? '' : 'none';
    chip.innerHTML = attachFile ? `<span>📎 ${escapeHtml(attachFile.name)} <small>(${chatFileSizeLabel(attachFile.size)})</small>${progress != null ? ` <b class="chat-up-prog">⏳ جاري الرفع ${Math.round(progress * 100)}%</b>` : ''}</span> <button type="button" id="chatAttachClear" aria-label="إلغاء المرفق">✕</button>` : '';
    const x = document.getElementById('chatAttachClear');
    if (x) x.onclick = () => { attachFile = null; const fi = document.getElementById('chatFileInput'); if (fi) fi.value = ''; renderAttachChip(); };
  }

  async function renderChatConversation(){
    if (window.__chatPollInterval) clearInterval(window.__chatPollInterval);
    updateBadge(false);
    const statusRes = await getChatAdminStatus();
    const isOnline = statusRes && statusRes.online;
    panel.innerHTML = `
      <div class="chat-header">
        <span>${headerTitle}</span>
        <span><button id="chatPrefsBtn" title="تنبيهات الشات (الصوت / الصورة)">⚙️</button><button id="chatCloseBtn">✕</button></span>
      </div>
      <div style="padding:6px 12px;font-size:11px;background:${isOnline?'#eafaf1':'#fdf6e3'};color:${isOnline?'var(--green)':'#8a6d1b'};text-align:center;">
        ${isOnline ? '🟢 فريق الدعم متصل الآن — هيردوا عليك في الحال' : '📩 هنرد عليك في أقرب وقت ممكن'}
      </div>
      <div class="chat-upload-note" id="chatUploadNote" style="display:none;">📎 فريق الدعم فتحلك إمكانية إرسال صورة أو ملف PDF</div>
      <div class="chat-body" id="chatBody"><div style="text-align:center;font-size:12px;color:#888;">جاري تحميل المحادثة...</div></div>
      <div class="chat-attach-chip" id="chatAttachChip" style="display:none;"></div>
      <div class="chat-input-area">
        <label class="chat-attach-label" id="chatAttachLabel" for="chatFileInput" style="display:none;" title="إرفاق صورة أو PDF">📎</label>
        <input type="file" id="chatFileInput" accept="${CHAT_FILE_ACCEPT}" style="display:none;">
        <input type="text" id="chatTextInput" placeholder="اكتب رسالتك...">
        <button id="chatSendBtn">إرسال</button>
      </div>`;
    document.getElementById('chatCloseBtn').onclick = closeChat;
    document.getElementById('chatPrefsBtn').onclick = () => { if (window.__chatPollInterval) { clearInterval(window.__chatPollInterval); window.__chatPollInterval = null; } renderChatPrefsPanel(panel, renderChatConversation, closeChat); };

    let lastSig = '';
    async function refreshMessages(){
      const body = document.getElementById('chatBody');
      if (!body) return; // البانل اتقفل
      const res = await getChatHistory(visitorId);
      if (handleNotOwner(res)) return;
      if (!res || !res.success) return;
      const msgs = res.messages || [];
      allowUpload = !!res.allowUpload; adminReadAt = res.adminReadAt || null; maxUploadMb = +res.maxUploadMb || CHAT_DEFAULT_UPLOAD_MB;
      syncUploadUi();
      if (msgs.length) markStarted();
      // الرسائل اتشافت (الشات مفتوح) ← النقطة الحمرا تختفي
      const top = maxAdminId(msgs);
      if (top > seenAdminId()) { try { localStorage.setItem(seenKey, String(top)); } catch(e){} }
      lastNotifiedId = Math.max(lastNotifiedId, top);
      updateBadge(false);
      // مفيش جديد ← منعيدش الرسم (عشان منقاطعش الكتابة)
      const sig = msgs.length + '|' + (msgs.length ? msgs[msgs.length - 1].id : '') + '|' + (adminReadAt || '');
      if (sig === lastSig) return;
      lastSig = sig;
      const wasNearBottom = (body.scrollHeight - body.scrollTop - body.clientHeight) < 60;
      if (msgs.length){
        const lastMine = [...msgs].reverse().find(m => m.sender === 'visitor');
        body.innerHTML = msgs.map(m => {
          let receipt = '';
          if (lastMine && m.id === lastMine.id) receipt = (adminReadAt && adminReadAt >= m.createdAt) ? ' <span class="chat-receipt seen">✓✓ اتشافت</span>' : ' <span class="chat-receipt">✓ اتبعت</span>';
          return chatMsgHtml(m, receipt);
        }).join('');
      } else {
        body.innerHTML = `<div style="text-align:center;font-size:12.5px;color:#888;line-height:1.8;">${isGuest ? 'اسألنا عن أي حاجة: الباقات، طريقة الاشتراك، أو إزاي تستخدم GRIFFINE 👋' : 'اكتب أول رسالة وابدأ المحادثة 👋'}</div>`;
      }
      if (wasNearBottom) body.scrollTop = body.scrollHeight;
    }
    await refreshMessages();
    window.__chatPollInterval = setInterval(refreshMessages, 3000);

    document.getElementById('chatFileInput').addEventListener('change', (e)=>{
      const file = e.target.files[0];
      if (!file) return;
      if (!allowUpload) { alert('رفع الملفات مقفول دلوقتي.'); e.target.value = ''; return; }
      // الإصدار 83: الحد اللي الأدمن كتبه للمحادثة دي (مثلًا 100 أو 500 ميجا)
      if (file.size > maxUploadMb * 1024 * 1024) { alert(`حجم الملف (${chatFileSizeLabel(file.size)}) أكبر من المسموح - أقصى حجم ${maxUploadMb} ميجا.`); e.target.value = ''; return; }
      attachFile = file; renderAttachChip();
    });

    async function doSend(){
      const input = document.getElementById('chatTextInput');
      const text = input.value.trim();
      if (!text && !attachFile) return;
      const btn = document.getElementById('chatSendBtn');
      btn.disabled = true;
      let r;
      try {
        // الملف بيترفع الأول على أجزاء (مع نسبة التقدّم) وبعدين الرسالة بتتبعت ومعاها token الملف
        let token = null, name = null;
        if (attachFile) {
          const up = await chatUploadFile(attachFile, visitorId, (p) => renderAttachChip(p));
          if (!up || !up.success) { r = up; } else { token = up.token; name = up.name; }
        }
        if (!r) r = await apiPost('/chat_send.php', { visitorId, email: knownEmail, message: text, uploadToken: token, attachmentName: name });
      } catch(e){ r = { success:false, message:'حصل خطأ في الاتصال بالسيرفر، جرّب تاني.' }; }
      btn.disabled = false;
      if (r && r.success){
        input.value = '';
        attachFile = null; document.getElementById('chatFileInput').value = ''; renderAttachChip();
        markStarted();
        lastSig = ''; // نجبر التحديث فورًا عشان رسالتنا تظهر على طول
        refreshMessages();
      } else {
        renderAttachChip();
        if (handleNotOwner(r)) return;
        alert((r && r.message) || 'حصل خطأ في الإرسال');
        if (r && /مقفول/.test(r.message || '')) { allowUpload = false; syncUploadUi(); }
        if (r && r.maxUploadMb) { maxUploadMb = +r.maxUploadMb; syncUploadUi(); }
      }
    }
    document.getElementById('chatSendBtn').onclick = doSend;
    document.getElementById('chatTextInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') doSend(); });
  }

  function closeChat(){
    panel.classList.remove('open');
    if (window.__chatPollInterval) { clearInterval(window.__chatPollInterval); window.__chatPollInterval = null; }
  }

  bubble.onclick = async () => {
    if (panel.classList.contains('open')) { closeChat(); return; }
    panel.classList.add('open');
    // لو المستخدم مسجل دخول، ناخد إيميله تلقائي بدل ما نسأله (لسه اختياري لغير المسجلين)
    if (!knownEmail) {
      const sessionEmail = await getSession();
      if (sessionEmail) { knownEmail = sessionEmail; localStorage.setItem('griffine_chat_email', knownEmail); }
    }
    if (hasStarted || knownEmail) renderChatConversation(); else renderEmailGate();
  };
}

/* الأيقونة العائمة للأدمن - نقطة حمرا بسيطة زي الماسنجر لما توصل رسالة جديدة من عميل، ورد سريع بدون الدخول للوحة التحكم */
function initAdminBubble(bubble, panel){
  // بنستخدم تاريخ السيرفر بس دايمًا (مش وقت المتصفح) عشان نتجنب أي فرق توقيت بين جهازك والسيرفر
  let lastSeenAt = localStorage.getItem('griffine_admin_chat_seen') || '1970-01-01 00:00:00';

  function updateBadge(hasUnread){
    const badge = document.getElementById('chatBadge');
    if (!badge) return;
    badge.style.display = hasUnread ? 'block' : 'none';
  }
  function markAllSeenFromConvs(convs){
    let maxAt = lastSeenAt;
    for (const c of convs) { if (c.lastAt && c.lastAt > maxAt) maxAt = c.lastAt; }
    lastSeenAt = maxAt;
    localStorage.setItem('griffine_admin_chat_seen', lastSeenAt);
    updateBadge(false);
  }

  // الإصدار 80: أي مكان بيفتح محادثة (صفحة الدردشة الكاملة / الرد السريع) بيبلّغ الأيقونة إن الرسالة اتشافت على الجهاز ده
  window.__adminChatSeen = (at) => {
    if (!at || at <= lastSeenAt) return;
    lastSeenAt = at;
    try { localStorage.setItem('griffine_admin_chat_seen', lastSeenAt); } catch(e){}
  };

  let notifiedAt = {}; // آخر وقت بعتنا فيه تنبيه لكل محادثة، عشان مانكررش تنبيهات لنفس الرسالة
  async function backgroundCheck(){
    try{
      const res = await getChatConversations('active');
      if (!res || !res.success) { console.error('chat backgroundCheck: فشل جلب المحادثات', res); return; }
      let anyUnread = false, anyNew = false;
      for (const c of res.conversations) {
        /* الإصدار 80: النقطة الحمرا والإشعار بيظهروا لو:
             - رسالة جديدة من العميل بعد آخر مرة فتحت لوحة الشات على الجهاز ده (lastSeenAt)، أو
             - المحادثة غير مقروءة على السيرفر (c.unread)
           (في 72-79 كانوا معتمدين على c.unread بس - ولو المحادثة كانت مفتوحة في جهاز/تبويب تاني
            كانت بتتعلّم مقروءة تلقائيًا والإشعار ميظهرش خالص) */
        const newHere = c.lastSender === 'visitor' && c.lastAt > lastSeenAt;
        const unreadServer = c.unread === true;
        if (!newHere && !unreadServer) continue;
        anyUnread = true;
        const isCurrentlyOpen = panel.classList.contains('open') && panel.dataset.openConv === c.visitorId;
        if (newHere && !isCurrentlyOpen && notifiedAt[c.visitorId] !== c.lastAt) {
          notifiedAt[c.visitorId] = c.lastAt;
          anyNew = true;
        }
      }
      updateBadge(anyUnread && !panel.classList.contains('open'));
      // الإصدار 83: رسالة جديدة ← نقطة حمرا + صوت بس (مفيش إشعار منبثق على الشاشة)
      if (anyNew) chatAlert();
    }catch(e){ console.error('chat backgroundCheck crashed:', e); }
  }
  window.__adminBubbleCheck = backgroundCheck;
  backgroundCheck();
  // الإصدار 80: فحص رسائل الأدمن بيفضل شغال والتبويب في الخلفية (عشان النقطة الحمرا والصوت يوصلوا وإنت على برنامج تاني)
  // - باقي الاستعلامات المتكررة بتقف والصفحة مخفية (shell.js) لتوفير البطارية والسيرفر
  window.__adminBubblePoll = (window.__nativeSetInterval || setInterval)(backgroundCheck, 10000);
  // heartbeat خفيف كمان من هنا عشان أي زائر يشوف "الأدمن متصل" حتى لو إنت في صفحة تانية غير لوحة الشات
  sendChatAdminHeartbeat();
  window.__adminBubbleHeartbeat = setInterval(sendChatAdminHeartbeat, 60000);

  function closeChat(){ panel.classList.remove('open'); panel.dataset.openConv=''; }

  async function renderConvList(){
    panel.innerHTML = `
      <div class="chat-header"><span>💬 محادثات العملاء</span><span><button id="chatPrefsBtn" title="تنبيهات الشات (الصوت / الصورة)">⚙️</button><button id="chatCloseBtn">✕</button></span></div>
      <div class="chat-body" id="chatBody" style="padding:0;"><div style="text-align:center;font-size:12px;color:#888;padding:14px;">جاري التحميل...</div></div>
      <div style="padding:8px;text-align:center;"><a href="#" id="chatFullPageLink" style="font-size:11.5px;color:var(--green-dark);">فتح لوحة الدردشة الفورية الكاملة</a></div>`;
    document.getElementById('chatCloseBtn').onclick = closeChat;
    document.getElementById('chatPrefsBtn').onclick = () => renderChatPrefsPanel(panel, renderConvList, closeChat);
    document.getElementById('chatFullPageLink').onclick = (e) => { e.preventDefault(); closeChat(); renderChatAdminPage(); };

    const res = await getChatConversations('active');
    const body = document.getElementById('chatBody');
    if (!res || !res.success) {
      console.error('renderConvList: فشل جلب المحادثات', res);
      // السبب الحقيقي من السيرفر (صلاحية / قاعدة بيانات) بدل رسالة عامة
      body.innerHTML = `<p style="color:#c0392b;font-size:12px;padding:14px;text-align:center;">${escapeHtml((res && res.message) || 'حصل خطأ في تحميل المحادثات، جرّب تاني.')}</p>
        <div style="text-align:center;"><button type="button" class="small secondary" id="chatRetryBtn" style="width:auto;">إعادة المحاولة</button></div>`;
      const rb = document.getElementById('chatRetryBtn'); if (rb) rb.onclick = renderConvList;
      return;
    }
    const convs = res.conversations;
    markAllSeenFromConvs(convs);
    body.innerHTML = convs.length ? convs.map(c=>`
      <div class="chat-conv-item" data-vid="${c.visitorId}">
        <div style="flex:1;"><strong style="font-size:12.5px;">${c.unread ? '<span class="chat-unread-dot"></span>' : ''}${escapeHtml(c.email || 'زائر بدون إيميل')}</strong> ${chatKindBadge(c)}<div style="font-size:11px;color:#888;">${escapeHtml((c.lastMessage||'').substring(0,35))}</div></div>
        <div style="font-size:10px;color:#aaa;white-space:nowrap;">${formatChatTime(c.lastAt)}</div>
      </div>`).join('') : '<p style="color:#888;font-size:12px;padding:14px;text-align:center;">مفيش محادثات لسه.</p>';
    document.querySelectorAll('.chat-conv-item').forEach(el=>{
      el.onclick = () => renderQuickThread(el.dataset.vid, convs.find(c=>c.visitorId===el.dataset.vid));
    });
  }

  async function renderQuickThread(visitorId, convInfo){
    panel.dataset.openConv = visitorId;
    if (window.__adminChatSeen && convInfo) window.__adminChatSeen(convInfo.lastAt);
    markChatRead(visitorId).then(refreshChatUnreadIndicators); // الإصدار 72
    const upState = { on: !!(convInfo && convInfo.allowUpload), mb: +(convInfo && convInfo.maxUploadMb) || CHAT_DEFAULT_UPLOAD_MB,
      onChange: (st) => { if (convInfo) { convInfo.allowUpload = st.on; convInfo.maxUploadMb = st.mb; } } };
    panel.innerHTML = `
      <div class="chat-header">
        <span>${escapeHtml((convInfo&&convInfo.email) || 'زائر')}</span>
        <span><button id="chatBackBtn" style="background:none;border:none;color:#fff;font-size:13px;cursor:pointer;">◀ رجوع</button><button id="chatCloseBtn">✕</button></span>
      </div>
      <div style="padding:6px 10px;border-bottom:1px solid var(--border-soft);display:flex;gap:6px;align-items:center;flex-wrap:wrap;">${convInfo ? chatKindBadge(convInfo) : ''} ${chatUploadBtnHtml('chatQuickUpload', upState.on, upState.mb)}</div>
      <div class="chat-body" id="chatBody"></div>
      <div class="chat-attach-chip" id="chatQuickAttachChip" style="display:none;"></div>
      <div class="chat-input-area">
        <label class="chat-attach-label" for="chatQuickFile" title="إرسال صورة / PDF / فيديو / ملف للعميل">📎</label>
        <input type="file" id="chatQuickFile" accept="${CHAT_FILE_ACCEPT}" style="display:none;">
        <input type="text" id="chatTextInput" placeholder="اكتب الرد...">
        <button id="chatSendBtn">إرسال</button>
      </div>`;
    document.getElementById('chatCloseBtn').onclick = closeChat;
    document.getElementById('chatBackBtn').onclick = () => { panel.dataset.openConv=''; renderConvList(); };
    wireChatUploadBtn('chatQuickUpload', visitorId, upState);
    const quickAttach = wireAdminAttach('chatQuickFile', 'chatQuickAttachChip');

    async function refresh(){
      const body = document.getElementById('chatBody');
      if (!body) return;
      try{
        const res = await getChatHistory(visitorId);
        if (!res || !res.success) { console.error('renderQuickThread refresh: فشل جلب الرسائل', res); return; }
        const msgs = res.messages;
        syncChatUploadCtl('chatQuickUpload', visitorId, upState, res);
        const sig = msgs.length + '|' + (msgs.length ? msgs[msgs.length - 1].id : '');
        if (sig === body.dataset.sig) return;   // مفيش جديد ← منعيدش الرسم
        body.dataset.sig = sig;
        const wasNearBottom = (body.scrollHeight - body.scrollTop - body.clientHeight) < 60;
        body.innerHTML = msgs.length ? msgs.map(m => chatMsgHtml(m)).join('') : '<p style="font-size:12px;color:#888;text-align:center;">لا يوجد رسائل.</p>';
        if (wasNearBottom) body.scrollTop = body.scrollHeight;
      }catch(e){ console.error('renderQuickThread refresh crashed:', e); }
    }
    await refresh();
    if (window.__chatQuickPoll) clearInterval(window.__chatQuickPoll);
    window.__chatQuickPoll = setInterval(refresh, 3000);

    async function doSend(){
      const text = document.getElementById('chatTextInput').value.trim();
      const att = quickAttach.get();
      if (!text && !att.file) return;
      const btn = document.getElementById('chatSendBtn');
      btn.disabled = true;
      try{
        const r = await sendChatAdminReplyWithFile(visitorId, text, quickAttach);
        if (r && r.success){
          document.getElementById('chatTextInput').value='';
          quickAttach.clear();
          await refresh();
        } else {
          alert((r && r.message) || 'حصل خطأ في الإرسال، جرّب تاني.');
          console.error('doSend failed:', r);
        }
      }catch(e){
        alert('حصل خطأ في الاتصال بالسيرفر، جرّب تاني.');
        console.error('doSend crashed:', e);
      }
      btn.disabled = false;
    }
    document.getElementById('chatSendBtn').onclick = doSend;
    document.getElementById('chatTextInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') doSend(); });
  }

  bubble.onclick = () => {
    if (panel.classList.contains('open')) { closeChat(); return; }
    panel.classList.add('open');
    if (window.__chatQuickPoll) { clearInterval(window.__chatQuickPoll); window.__chatQuickPoll = null; }
    renderConvList();
  };
}

/* ================== سجل تنقّل عام - زرار "رجوع" + أزرار البروزر نفسها (Back/Forward) ==================
   بدل ما زرار البروزر يخرج من الموقع، كل شاشة بندخلها بتتسجل كخطوة حقيقية في سجل تصفح المتصفح،
   وزرار البروزر Back/Forward بيرجّع/يقدّم بين شاشات الموقع نفسه (زي أي تطبيق SPA احترافي) */
window.__screens = [];      // كل شاشة اتزارت بالترتيب (array من دوال الرسم)
window.__screenIndex = -1;  // مكاننا الحالي جوه المصفوفة دي
window.__navSilent = false; // true وقت ما إحنا بنعيد رسم شاشة من التاريخ، عشان الشاشة الراجعة ميدخلش نفسها تاني كخطوة جديدة

/* ================== نظام فلترة موحّد - دالة عامة تفعّل مربع بحث و/أو تابات حالة لأي قائمة في الموقع ==================
   الاستخدام: كل عنصر في القائمة لازم يكون عليه data-q="نص البحث" وdata-status="القيمة" (اختياري لو فيه تابات حالة) */
function wireStdFilterBar(opts){
  const input = opts.searchInputId ? document.getElementById(opts.searchInputId) : null;
  const tabs = opts.tabsSelector ? Array.from(document.querySelectorAll(opts.tabsSelector)) : [];
  function apply(){
    const q = input ? input.value.trim().toLowerCase() : '';
    const activeTab = tabs.find(t=>t.classList.contains('btn-active'));
    const statusFilter = activeTab ? activeTab.dataset.status : null;
    let anyVisible = false;
    document.querySelectorAll(opts.itemSelector).forEach(item=>{
      const matchesQ = !q || (item.dataset.q||'').includes(q);
      const matchesStatus = !statusFilter || statusFilter==='all' || item.dataset.status===statusFilter;
      const show = matchesQ && matchesStatus;
      item.style.display = show ? '' : 'none';
      if (show) anyVisible = true;
    });
    if (opts.emptyStateId){
      const empty = document.getElementById(opts.emptyStateId);
      if (empty) empty.style.display = anyVisible ? 'none' : '';
    }
    if (opts.onApply) opts.onApply();
    return anyVisible;
  }
  if (input) input.addEventListener('input', apply);
  tabs.forEach(tab=>{
    tab.onclick = () => { tabs.forEach(t=>t.classList.remove('btn-active')); tab.classList.add('btn-active'); apply(); };
  });
  apply();
}


function pushNav(fn){
  // كل شاشة جديدة تفترض إن زرار الرجوع للخلف ظاهر بشكل افتراضي - والشاشة الرئيسية بتلغيه بعدين صراحة
  if (typeof setBackButtonVisible === 'function') setBackButtonVisible(true);
  if (window.__navSilent) return;
  window.__screenIndex++;
  window.__screens.length = window.__screenIndex; // امسح أي "تقدّم" قديم لو كنا رجعنا لورا وبعدين فتحنا مسار جديد
  window.__screens.push(fn);
  if (window.__screens.length > 100) { window.__screens.shift(); window.__screenIndex--; }
  try {
    if (window.__screenIndex === 0) history.replaceState({ griffineIdx: 0 }, '', location.href);
    else history.pushState({ griffineIdx: window.__screenIndex }, '', location.href);
  } catch(e){}
}

// زرار الرجوع بتاعنا بيسيب المتصفح نفسه يرجع خطوة - وده هيطلق popstate اللي هو المسؤول الوحيد عن إعادة الرسم
function goBack(){
  history.back();
}

// لو سجل التنقل ضاع (نادر)، نرجّع المستخدم لشاشته الرئيسية الصحيحة حسب حالة تسجيل دخوله -
// مسجّل دخول يرجعله renderHome() مش الصفحة العامة، عشان ميحسّش إنه اتسجّل خروج فجأة
async function fallbackHomeRender(){
  const email = await getSession().catch(() => null);
  return email ? renderHome() : renderPublicHome();
}
window.addEventListener('popstate', (e) => {
  if (!e.state || typeof e.state.griffineIdx !== 'number') {
    // خرجنا برا سجل شاشات الموقع (نادر) - ارجع للشاشة الرئيسية الصحيحة بدل ما نسيب حد يطلع برا الموقع من غير قصد
    window.__navSilent = true;
    fallbackHomeRender().finally(() => { window.__navSilent = false; });
    return;
  }
  const idx = e.state.griffineIdx;
  window.__screenIndex = idx;
  const fn = window.__screens[idx];
  window.__navSilent = true;
  if (fn) {
    try { fn(); } finally { window.__navSilent = false; }
  } else {
    fallbackHomeRender().finally(() => { window.__navSilent = false; });
  }
});

function initBackButton(){
  const btn = document.createElement('button');
  btn.id = 'globalBackBtn';
  btn.type = 'button';
  btn.className = 'gtopnav-icon-btn gtopnav-back-btn';
  // سهم عريض بيشاور لليمين (على طراز انستجرام/فيسبوك) - لأن اتجاه الموقع RTL فالرجوع بصريًا بيكون ناحية اليمين
  btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>';
  btn.title = 'رجوع للصفحة السابقة';
  btn.onclick = () => goBack();
  const row1 = document.getElementById('gtopnavRow1');
  if (row1) row1.appendChild(btn); else document.body.appendChild(btn);
}
// بتتحكم في ظهور/اختفاء زرار الرجوع للخلف - بيتخفي في الشاشة الرئيسية فقط بأمر مباشر من الشاشات نفسها
function setBackButtonVisible(visible){
  const btn = document.getElementById('globalBackBtn');
  if (btn) btn.style.display = visible ? '' : 'none';
}

// زرار تسجيل خروج ثابت في الشريط العلوي - بيظهر بس لو فيه مستخدم مسجّل دخول (refreshTopNav هي اللي بتتحكم في ظهوره)
function initLogoutButton(){
  const btn = document.createElement('button');
  btn.id = 'globalLogoutBtn';
  btn.type = 'button';
  btn.className = 'gtopnav-icon-btn';
  btn.innerHTML = '🚪';
  btn.title = 'تسجيل الخروج';
  btn.style.display = 'none';
  btn.onclick = async () => {
    await setSession('');
    window.__screens = [];
    window.__screenIndex = -1;
    await refreshTopNav();
    renderLogin();
  };
  const row1 = document.getElementById('gtopnavRow1');
  if (row1) row1.appendChild(btn); else document.body.appendChild(btn);
}

/* ================== تبديل الوضع الليلي - زرار ثابت في كل صفحات الموقع ================== */
function initDarkModeToggle(){
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const btn = document.createElement('button');
  btn.id = 'darkModeToggle';
  btn.type = 'button';
  btn.className = 'gtopnav-icon-btn';
  btn.textContent = isDark ? '☀️' : '🌙';
  btn.onclick = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (dark) { document.documentElement.removeAttribute('data-theme'); btn.textContent = '🌙'; }
    else { document.documentElement.setAttribute('data-theme', 'dark'); btn.textContent = '☀️'; }
    try { localStorage.setItem('griffine_theme', dark ? 'light' : 'dark'); } catch(e){}
    document.querySelectorAll('img[alt="GRIFFINE"], img.brand-logo-img, img[alt*="GRIFFINE"]').forEach(img=>{ img.src = griffineLogoSrc(); });
    document.querySelectorAll('img[alt="Top7"]').forEach(img=>{ img.src = top7LogoSrc(); });
  };
  const row1 = document.getElementById('gtopnavRow1');
  if (row1) row1.appendChild(btn); else document.body.appendChild(btn);
}

/* ================== الشريط العلوي الثابت بقوائم منسدلة - على طراز أمازون ================== */
async function refreshTopNav(){
  const email = await getSession();
  if (window.GShell && GShell.enabled) GShell.refresh(email);
  syncChatWidget(email); // الإصدار 78: الشات بيتبع الحساب الحالي بعد أي دخول/خروج
  const isAdmin = window.__isAdmin;
  if (isAdmin) updateChatUnreadBadge();
  const row1 = document.getElementById('gtopnavRow1');
  const row2 = document.getElementById('gtopnavRow2');
  if (!row1 || !row2) return;
  const settings = (email && !isAdmin) ? await getAdminSettings() : {};
  const hidden = (key) => settings[key] === true;

  // بيقسم اللابل لأيقونة + نص عشان نعرض الأيقونة في فقاعة دائرية زي قوائم فيسبوك (مستخدمة جوا كل قائمة منسدلة)
  function fbItemHtml(act, label){
    const m = label.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*(.*)$/u);
    const icon = m ? m[1] : '•';
    const text = m ? m[2] : label;
    return `<button type="button" class="gtopnav-fb-item" data-act="${act}"><span class="gtopnav-fb-icon">${icon}</span><span class="gtopnav-fb-label">${text}</span></button>`;
  }
  // عنوان قسم جوا القائمة المنسدلة الواحدة (زي عناوين الأقسام في قايمة فيسبوك)
  function sectionHtml(label, items){
    const visible = items.filter(it => !it.hideKey || !hidden(it.hideKey));
    if (!visible.length) return '';
    return `<div class="gtopnav-fb-section-title">${label}</div>${visible.map(it=>fbItemHtml(it.act, it.label)).join('')}`;
  }

  // كل عناصر التنقل التانوية (الرئيسية/حسابي/معلومات وتواصل + لوحة التحكم) بقت جوا قائمة منسدلة واحدة بس -
  // مقسّمة بعناوين أقسام جوا نفس القائمة، بدل ما تكون منتشرة كأزرار منفصلة في الشريط
  let panelHtml = sectionHtml('🏠 الرئيسية', [
    { act:'dac', label:'📈 خطط تعزيز المتوسط (DCA)', hideKey:'hide_dac_screen' },
    { act:'grid', label:'🔲 '+pageTitle('grid_plans_list','خطط الشبكة (Grid)'), hideKey:'hide_grid_screen' },
    { act:'screener', label:'🔍 '+pageTitle('screener','كشاف الأسهم'), hideKey:'hide_screener_screen' },
  ]);
  panelHtml += sectionHtml('👤 حسابي', [
    ...(email ? [{ act:'profile', label:'⚙️ '+pageTitle('profile','الملف الشخصي') }] : []),
    { act:'portfolio', label:'📊 '+pageTitle('portfolio','ملخص المحفظة') },
    { act:'subscription', label:'💳 الباقات والأسعار' },
  ]);
  panelHtml += sectionHtml('ℹ️ معلومات وتواصل', [
    { act:'about', label:'ℹ️ '+pageTitle('about_page','عن GRIFFINE') },
    { act:'contactPublic', label:'📞 '+pageTitle('contact_info','تواصل معنا') },
    { act:'articles', label:'📰 '+pageTitle('articles_list','مقالات'), hideKey:'hide_articles_screen' },
    { act:'testimonials', label:'⭐ '+pageTitle('testimonials','آراء العملاء'), hideKey:'hide_testimonials_screen' },
    { act:'suggestions', label:'💡 '+pageTitle('suggestions_page','شاركنا مقترحاتك'), hideKey:'hide_suggestions_screen' },
    { act:'refundPolicy', label:'📄 '+pageTitle('refund_policy_page','سياسة استرداد الاشتراك') },
  ]);
  if (isAdmin) panelHtml += sectionHtml('🛡️ الإدارة', [{ act:'adminPanel', label:'🛡️ '+pageTitle('admin_hub','لوحة التحكم') }]);

  const existingBack = document.getElementById('globalBackBtn');
  const existingTheme = document.getElementById('darkModeToggle');
  const existingLogout = document.getElementById('globalLogoutBtn');
  row1.innerHTML = `<div class="gtopnav-brand" id="gtopnavLogoBtn" style="cursor:pointer;">
      <img src="${griffineLogoSrc()}" class="gtopnav-logo" alt="GRIFFINE">
    </div>
    <div class="gtopnav-groups" id="gtopnavGroups">
      <div class="gtopnav-item" id="gtopnavMoreMenu">
        <button type="button" class="gtopnav-icon-btn" title="القائمة">☰</button>
        <div class="gtopnav-panel">${panelHtml}</div>
      </div>
    </div>
    <div class="gtopnav-main-icons">
      <button type="button" class="gtopnav-icon-btn" data-bn="home" title="الرئيسية">🏠</button>
      <button type="button" class="gtopnav-icon-btn" data-bn="plans" title="خططي">📈</button>
      <button type="button" class="gtopnav-icon-btn" data-bn="portfolio" title="ملخص المحفظة">📊</button>
    </div>
    <div class="gtopnav-spacer"></div>
    <div class="gtopnav-greet" id="gtopnavGreetBtn">
      ${email ? `<img id="gtopnavAvatarImg" src="" alt="" style="width:26px;height:26px;border-radius:50%;object-fit:cover;display:none;">` : ''}
      ${email ? `<span><strong>${email}</strong></span>` : `<span>مرحبًا بيك<br><strong>سجّل الدخول</strong></span>`}
    </div>`;
  if (existingBack) row1.appendChild(existingBack);
  if (existingTheme) row1.appendChild(existingTheme);
  if (existingLogout) { row1.appendChild(existingLogout); existingLogout.style.display = email ? '' : 'none'; }
  row2.innerHTML = '';
  document.getElementById('gtopnavGreetBtn').onclick = () => { email ? renderProfilePage() : openLoginModal(); };
  document.getElementById('gtopnavLogoBtn').onclick = () => { email ? renderHome() : renderPublicHome(); };
  if (email) refreshTopNavAvatar();
  wireTopNavMainIcons(row1, email);

  const actions = {
    newPlan: renderPlanTypeChooser, dac: renderPlansList, grid: renderGridPlansList,
    portfolio: renderPortfolio, screener: renderScreener, recommendations: renderRecommendationsCustomerPage,
    subscription: () => email ? renderSubscriptionPlans() : renderPublicPricing(), subHistory: renderMySubscriptionHistory, referral: renderReferralPage,
    profile: renderProfilePage, contact: renderContactInfo, testimonials: renderTestimonialsPage,
    articles: renderArticlesListPage, disclaimer: () => renderDisclaimerPage({ backTo: () => (email ? renderHome() : renderPublicHome()) }),
    about: renderAboutPage, refundPolicy: renderRefundPolicyPage, contactPublic: renderContactInfo,
    suggestions: renderSuggestionsPage,
    adminPanel: renderAdminSubscribers,
  };
  const groupsEl = document.getElementById('gtopnavGroups');
  groupsEl.querySelectorAll('.gtopnav-panel button, .gtopnav-item > button[data-act]').forEach(btn=>{
    btn.onclick = () => { closeAllNavDropdowns(); const fn = actions[btn.dataset.act]; if (fn) fn(); };
  });
  groupsEl.querySelectorAll('.gtopnav-item > button:not([data-act])').forEach(trigger=>{
    trigger.onclick = (e) => {
      e.stopPropagation();
      const item = trigger.parentElement;
      const wasOpen = item.classList.contains('open');
      closeAllNavPanels();
      if (!wasOpen) item.classList.add('open');
    };
  });
}
async function refreshTopNavAvatar(){
  const imgEl = document.getElementById('gtopnavAvatarImg');
  if (!imgEl) return;
  try{
    const r = await apiGet('/avatar_get.php');
    if (r && r.success && r.avatar) {
      imgEl.src = r.avatar;
      imgEl.style.display = '';
    }
  }catch(e){ /* الأفاتار مش أساسية - أي فشل هنا يتجاهل */ }
}
function closeAllNavPanels(){
  document.querySelectorAll('.gtopnav-item.open').forEach(el=>el.classList.remove('open'));
}
function closeAllNavDropdowns(){
  closeAllNavPanels();
  const row2 = document.getElementById('gtopnavRow2');
  if (row2) row2.classList.remove('mobile-open');
  syncNavBackdrop();
}
// بتظبط ظهور طبقة التعتيم خلف قائمة الموبايل المنسدلة - بتوضح إنها Overlay فوق الشاشة الحالية مش شاشة جديدة
function syncNavBackdrop(){
  const row2 = document.getElementById('gtopnavRow2');
  const backdrop = document.getElementById('gtopnavBackdrop');
  if (!row2 || !backdrop) return;
  backdrop.classList.toggle('show', row2.classList.contains('mobile-open'));
}
document.addEventListener('click', (e)=>{ if (!e.target.closest('.gtopnav-item') && !e.target.closest('#gtopnavGreetBtn') && !e.target.closest('.gtopnav-main-icons')) closeAllNavDropdowns(); });

// بتوصل ضغطات الأيقونات الثلاث السريعة (الرئيسية/خططي/المحفظة) اللي جنب الشعار فوق - بتتنفذ من refreshTopNav كل مرة لأن row1 بيتبني من جديد في كل تنقل
function wireTopNavMainIcons(row1, email){
  const icons = row1.querySelectorAll('.gtopnav-main-icons .gtopnav-icon-btn[data-bn]');
  icons.forEach(btn=>{
    btn.onclick = async (e) => {
      e.stopPropagation();
      const key = btn.dataset.bn;
      if (key !== 'plans') closeBottomSheet();
      const sess = (typeof email !== 'undefined' && email !== null) ? email : await getSession();
      closeAllNavDropdowns();
      if (key === 'home') { setBottomNavActive('home'); sess ? renderHome() : renderPublicHome(); return; }
      if (key === 'plans') { setBottomNavActive('plans'); toggleBottomSheet(); return; }
      if (key === 'portfolio') { setBottomNavActive('portfolio'); sess ? renderPortfolio() : renderLogin(); return; }
    };
  });
}

function initTopNav(){
  const nav = document.createElement('div');
  nav.className = 'gtopnav';
  nav.innerHTML = `<div class="gtopnav-row1" id="gtopnavRow1"></div><div class="gtopnav-row2" id="gtopnavRow2"></div>`;
  document.body.insertBefore(nav, document.body.firstChild);
  const backdrop = document.createElement('div');
  backdrop.className = 'gtopnav-backdrop';
  backdrop.id = 'gtopnavBackdrop';
  backdrop.onclick = () => closeAllNavDropdowns();
  document.body.insertBefore(backdrop, nav.nextSibling);
}

/* ================== شريط التنقل السفلي - 4 وجهات أساسية للموبايل، بديل سريع عن فتح القائمة العلوية كل مرة ================== */
function setBottomNavActive(key){
  document.querySelectorAll('.gtopnav-main-icons .gtopnav-icon-btn[data-bn]').forEach(b=>b.classList.toggle('active', b.dataset.bn===key));
}
function toggleBottomSheet(){
  const sheet = document.getElementById('gbottomnavSheet');
  if (!sheet) return;
  sheet.classList.toggle('show');
}
function closeBottomSheet(){
  const sheet = document.getElementById('gbottomnavSheet');
  if (sheet) sheet.classList.remove('show');
}
// بتنشئ شيت "خططي" السريع مرة واحدة بس - بيتفتح لما يدوس المستخدم على أيقونة 📈 خططي في الشريط العلوي
function initBottomNav(){
  if (document.getElementById('gbottomnavSheet')) return;
  const sheet = document.createElement('div');
  sheet.className = 'gbottomnav-sheet';
  sheet.id = 'gbottomnavSheet';
  sheet.innerHTML = `
    <button type="button" id="gbnSheetDac">📈 خطط تعزيز المتوسط (DCA)</button>
    <button type="button" id="gbnSheetGrid">🔲 خطط الشبكة (Grid)</button>
    <button type="button" id="gbnSheetScreener">🔍 كشاف الأسهم</button>
  `;
  document.body.appendChild(sheet);
  document.getElementById('gbnSheetDac').onclick = () => { closeBottomSheet(); renderPlansList(); };
  document.getElementById('gbnSheetGrid').onclick = () => { closeBottomSheet(); renderGridPlansList(); };
  document.getElementById('gbnSheetScreener').onclick = () => { closeBottomSheet(); renderScreener(); };

  document.addEventListener('click', (e)=>{
    if (!e.target.closest('#gbottomnavSheet') && !e.target.closest('[data-bn="plans"]')) closeBottomSheet();
  });
}


function initSiteFooter(){
  const footer = document.createElement('div');
  footer.id = 'siteFooter';
  footer.style.cssText = 'text-align:center;padding:14px 10px;font-size:12px;color:#888;border-top:1px solid #eee;margin-top:20px;';
  footer.innerHTML = `<a id="footerDisclaimerLink" style="color:#888;text-decoration:underline;cursor:pointer;">إخلاء المسؤولية</a>`;
  document.body.appendChild(footer);
  document.getElementById('footerDisclaimerLink').onclick = () => renderDisclaimerPage();
}

/* ================== شريط إعلان + شكل الموقع (لكل الزوار، حتى قبل تسجيل الدخول) ================== */
window.__siteContent = {};
/* ألوان وخط الموقع من لوحة التحكم (تنسيق الموقع)
   - الألوان بتتطبق على الوضع النهاري بس - الوضع الليلي ليه ألوانه الثابتة عشان النص ميختفيش أبدًا
   - لون الأزرار بيتطبق على الأزرار الأساسية بس، مش على كل زرار في الموقع (كان بيبوّظ شاشة الترحيب والأيقونات)
   - لون النص/الزر بيتحسب تلقائيًا (أبيض أو غامق) حسب درجة اللون عشان يفضل مقروء */
function applySiteTheme(content){
  const hex = (v) => (/^#[0-9a-f]{6}$/i.test(String(v||'').trim()) ? String(v).trim() : null);
  const lum = (h) => { const n = parseInt(h.slice(1), 16); const f = (c) => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }; return .2126*f(n>>16&255) + .7152*f(n>>8&255) + .0722*f(n&255); };
  const L = 'html:not([data-theme="dark"]) body.g-shell';
  let css = '';
  const bg = hex(content.bg_color), tx = hex(content.text_color), ac = hex(content.accent_color);
  if (bg && lum(bg) > 0.55) css += `${L}{--gs-bg:${bg};}`;
  if (tx && lum(tx) < 0.2) css += `${L}{--gs-text:${tx};}`;
  if (ac) {
    const onInk = lum(ac) > 0.45 ? '#0F172A' : '#FFFFFF';
    css += `${L}{--gs-ink:${ac};--gs-on-ink:${onInk};}`;
    if (lum(ac) < 0.4) css += `${L} #app a{color:${ac};}`;
  }
  const font = String(content.font_family || '').trim();
  if (/^[A-Za-z0-9 ]{2,40}$/.test(font)) css += `body,input,select,textarea,button{font-family:'${font}','IBM Plex Sans Arabic',Tahoma,sans-serif !important;}`;
  const fs = parseInt(content.font_size_base, 10);
  if (fs >= 12 && fs <= 22) css += `body.g-shell{font-size:${fs}px;}`;
  const fw = parseInt(content.font_weight, 10);
  if ([400,500,600,700].includes(fw)) css += `body.g-shell #app .section-card, body.g-shell #app label{font-weight:${fw};}`;
  let tag = document.getElementById('siteThemeOverride');
  if (!css) { if (tag) tag.remove(); return; }
  if (!tag) { tag = document.createElement('style'); tag.id = 'siteThemeOverride'; document.head.appendChild(tag); }
  tag.textContent = css;
}
async function initAnnouncementBanner(){
  try{
    const res = await getSiteContent();
    if (!res || !res.success) return;
    const content = res.content || {};
    window.__siteContent = content;
    applySiteTheme(content);
    if (content.announcement_enabled !== '1' || !content.announcement_text) return;
    const bar = document.createElement('div');
    bar.id = 'siteAnnouncementBar';
    bar.style.cssText = 'background:var(--green);color:#fff;text-align:center;padding:8px 36px 8px 12px;font-size:13px;position:relative;';
    bar.innerHTML = `<span></span><button id="announcementCloseBtn" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#fff;font-size:16px;cursor:pointer;">✕</button>`;
    bar.querySelector('span').textContent = content.announcement_text; // textContent - مش innerHTML - عشان محدش يقدر يحقن HTML من نص الإعلان
    document.body.prepend(bar);
    document.getElementById('announcementCloseBtn').onclick = () => bar.remove();
  }catch(e){ /* الإعلان مش أساسي - أي فشل هنا يتجاهل */ }
}

// بيرجع HTML البانر الرئيسي + الأزرار المخصصة، أو نص فاضي لو مفيش حاجة متظبطة
function siteHeroHtml(){
  const content = window.__siteContent || {};
  let buttons = [];
  try { buttons = JSON.parse(content.custom_buttons || '[]'); } catch(e) { buttons = []; }

  const hasMedia = content.hero_banner_type && content.hero_banner_type !== 'none' && content.hero_banner_url;
  const hasText = content.hero_title || content.hero_subtitle;
  if (!hasMedia && !hasText && buttons.length === 0) return '';

  function buttonHref(b){
    if (b.type === 'whatsapp') return `https://wa.me/${b.value.replace(/[^0-9]/g,'')}`;
    if (b.type === 'phone') return `tel:${b.value}`;
    if (b.type === 'email') return `mailto:${b.value}`;
    // روابط عادية بس (http/https) - أي بروتوكول تاني زي javascript: مرفوض
    return /^https?:\/\//i.test(String(b.value||'').trim()) ? b.value : '#';
  }

  let mediaHtml = '';
  if (hasMedia && content.hero_banner_type === 'image') {
    mediaHtml = `<img src="${escapeHtml(content.hero_banner_url)}" alt="" style="width:100%;border-radius:10px;margin-bottom:12px;">`;
  } else if (hasMedia && content.hero_banner_type === 'video') {
    mediaHtml = `<video src="${escapeHtml(content.hero_banner_url)}" autoplay muted loop playsinline style="width:100%;border-radius:10px;margin-bottom:12px;"></video>`;
  }

  const textHtml = hasText ? `
    ${content.hero_title ? `<h2 style="margin:0 0 4px;">${escapeHtml(content.hero_title)}</h2>` : ''}
    ${content.hero_subtitle ? `<p style="margin:0 0 10px;color:#666;">${escapeHtml(content.hero_subtitle)}</p>` : ''}
  ` : '';

  const buttonsHtml = buttons.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
    ${buttons.map(b=>`<a href="${escapeHtml(buttonHref(b))}" target="_blank" rel="noopener" class="secondary small" style="width:auto;display:inline-block;text-decoration:none;padding:8px 14px;">${escapeHtml(b.label)}</a>`).join('')}
  </div>` : '';

  return `<div style="margin-bottom:16px;">${mediaHtml}${textHtml}${buttonsHtml}</div>`;
}
/* ============ سجل صفقات مغلقة عام - قابل لإعادة الاستخدام بين DCA والشبكة ============
   بيدعم: ترتيب الأحدث أولًا، صفحات (10 لكل صفحة)، إخفاء/إظهار الجدول، أرشفة، سلة محذوفات قابلة للاسترجاع.
   getTrades() لازم يرجع نفس المصفوفة الحية (مش نسخة) عشان التعديل عن طريق مرجع الكائن يعكس فورًا. */
function renderClosedTradesUI(containerId, getTrades, opts){
  let page = 0;
  let view = 'active'; // active | archived | trash
  let hidden = false;
  const perPage = 10;

  function render(){
    const container = document.getElementById(containerId);
    if (!container) return;
    const all = getTrades();
    all.forEach((t,i)=>{ if(t.archived==null) t.archived=false; if(t.deleted==null) t.deleted=false; if(t.__uid==null) t.__uid = 'u'+i+'_'+Math.random().toString(36).slice(2,8); });
    const activeCount = all.filter(t=>!t.archived && !t.deleted).length;
    const archivedCount = all.filter(t=>t.archived && !t.deleted).length;
    const trashCount = all.filter(t=>t.deleted).length;

    if (hidden) {
      container.innerHTML = `<button class="small secondary" id="${containerId}_showBtn">👁 إظهار الصفقات المغلقة (${activeCount})</button>`;
      document.getElementById(containerId+'_showBtn').onclick = () => { hidden = false; render(); };
      return;
    }

    const filtered = all.filter(t => view==='active' ? (!t.archived && !t.deleted) : view==='archived' ? (t.archived && !t.deleted) : t.deleted);
    const ordered = filtered.slice().reverse();
    const totalPages = Math.max(1, Math.ceil(ordered.length / perPage));
    if (page >= totalPages) page = totalPages - 1;
    if (page < 0) page = 0;
    const pageItems = ordered.slice(page*perPage, page*perPage+perPage);

    const agg = filtered.reduce((acc,t)=>({qty:acc.qty+t.totalQty, capital:acc.capital+t.capitalUsed, profit:acc.profit+t.profit}), {qty:0,capital:0,profit:0});
    const aggProfitPercent = agg.capital>0 ? (agg.profit/agg.capital*100) : 0;

    let html = '';
    if (view === 'active') {
      html += `<div class="summary-cards">
        <div class="summary-card"><div class="val">${fmtQty(agg.qty)}</div><div class="lbl">إجمالي الأسهم المتداولة</div></div>
        <div class="summary-card"><div class="val">${fmtMoney(agg.capital)}</div><div class="lbl">إجمالي رأس المال المستخدم</div></div>
        <div class="summary-card"><div class="val ${agg.profit>=0?'pos':'neg'}">${fmtMoney(agg.profit)}</div><div class="lbl">إجمالي الربح/الخسارة</div></div>
        <div class="summary-card"><div class="val ${aggProfitPercent>=0?'pos':'neg'}">${aggProfitPercent.toFixed(2)}%</div><div class="lbl">نسبة الربح/الخسارة</div></div>
      </div>`;
    }
    html += `<div class="topbar" style="margin-top:10px;flex-wrap:wrap;">
      <button class="small secondary${view==='active'?' btn-active':''}" id="${containerId}_viewActive">النشطة (${activeCount})</button>
      <button class="small secondary${view==='archived'?' btn-active':''}" id="${containerId}_viewArchived">🗄️ الأرشيف (${archivedCount})</button>
      <button class="small secondary${view==='trash'?' btn-active':''}" id="${containerId}_viewTrash">🗑️ المحذوفة (${trashCount})</button>
      ${view==='active' ? `
        <button class="small secondary" id="${containerId}_hideBtn">🙈 إخفاء الصفقات المغلقة</button>
        ${opts.onExportXlsx ? `<button class="small secondary" id="${containerId}_exportXlsx">⬇ تصدير Excel</button>` : ''}
        ${opts.onExportPdf ? `<button class="small secondary" id="${containerId}_exportPdf">🖨 تصدير PDF (طباعة)</button>` : ''}
        <button class="small danger" id="${containerId}_clearAll">مسح كل الصفقات المغلقة</button>
      ` : ''}
    </div>`;

    if (!ordered.length) {
      html += `<p style="color:#888;font-size:12.5px;margin-top:10px;">${view==='active'?'لا يوجد صفقات مغلقة بعد.':view==='archived'?'الأرشيف فاضي.':'سلة المحذوفات فاضية.'}</p>`;
    } else {
      html += `<div class="section-card" style="overflow-x:auto;margin-top:10px;">
        <table>
          <thead><tr>
            <th>تاريخ ووقت الإغلاق</th><th>الكمية</th><th>متوسط الدخول</th><th>متوسط الخروج</th>
            <th>الربح</th><th>نسبة الربح</th><th>رأس المال المستخدم</th><th></th>
          </tr></thead>
          <tbody>
            ${pageItems.map(t=>`<tr>
              <td>${formatDateTimeAr(t.closedDate)}</td>
              <td>${fmtQty(t.totalQty)}</td>
              <td>${fmt2(t.avgEntry)}</td>
              <td>${fmt2(t.avgExit)}</td>
              <td class="${t.profit>=0?'pos':'neg'}">${fmt2(t.profit)}</td>
              <td class="${t.profitPercent>=0?'pos':'neg'}">${t.profitPercent.toFixed(2)}%</td>
              <td>${fmt2(t.capitalUsed)}</td>
              <td>
                ${view==='active' ? `
                  <button class="small secondary" data-act="archive" data-uid="${t.__uid}">🗄️ أرشفة</button>
                  <button class="small danger" data-act="delete" data-uid="${t.__uid}">حذف</button>
                ` : `
                  <button class="small" data-act="restore" data-uid="${t.__uid}">↩️ استرجاع</button>
                  ${view==='trash' ? `<button class="small danger" data-act="permadelete" data-uid="${t.__uid}">حذف نهائي</button>` : ''}
                `}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="display:flex;justify-content:center;align-items:center;gap:10px;margin-top:10px;">
        <button class="small secondary" id="${containerId}_prevPage" ${page<=0?'disabled':''}>◀ السابق</button>
        <span style="font-size:12px;color:var(--text-muted);">صفحة ${page+1} من ${totalPages} (${ordered.length} صفقة)</span>
        <button class="small secondary" id="${containerId}_nextPage" ${page>=totalPages-1?'disabled':''}>التالي ▶</button>
      </div>`;
    }

    container.innerHTML = html;

    document.getElementById(containerId+'_viewActive').onclick = () => { view='active'; page=0; render(); };
    document.getElementById(containerId+'_viewArchived').onclick = () => { view='archived'; page=0; render(); };
    document.getElementById(containerId+'_viewTrash').onclick = () => { view='trash'; page=0; render(); };
    const hideBtn = document.getElementById(containerId+'_hideBtn');
    if (hideBtn) hideBtn.onclick = () => { hidden = true; render(); };
    const clearBtn = document.getElementById(containerId+'_clearAll');
    if (clearBtn) clearBtn.onclick = async () => {
      if(!await gConfirm('متأكد إنك عايز تمسح كل سجل الصفقات المغلقة نهائيًا؟ الإجراء ده نهائي ومش هيتسجل في المحذوفات.')) return;
      await opts.onClearAll();
      render();
    };
    const exXlsx = document.getElementById(containerId+'_exportXlsx');
    if (exXlsx) exXlsx.onclick = () => opts.onExportXlsx(all.filter(t=>!t.archived && !t.deleted));
    const exPdf = document.getElementById(containerId+'_exportPdf');
    if (exPdf) exPdf.onclick = () => opts.onExportPdf(all.filter(t=>!t.archived && !t.deleted));
    const prevBtn = document.getElementById(containerId+'_prevPage');
    if (prevBtn) prevBtn.onclick = () => { page--; render(); };
    const nextBtn = document.getElementById(containerId+'_nextPage');
    if (nextBtn) nextBtn.onclick = () => { page++; render(); };

    container.querySelectorAll('button[data-act]').forEach(btn=>{
      btn.onclick = async () => {
        const uid = btn.dataset.uid;
        const trade = all.find(t=>String(t.__uid)===uid);
        if (!trade) return;
        if (btn.dataset.act === 'archive') trade.archived = true;
        else if (btn.dataset.act === 'delete') trade.deleted = true;
        else if (btn.dataset.act === 'restore') { trade.archived = false; trade.deleted = false; }
        else if (btn.dataset.act === 'permadelete') { if(!await gConfirm('حذف نهائي لا يمكن التراجع عنه. متأكد؟')) return; all.splice(all.indexOf(trade),1); }
        await opts.afterChange();
        render();
      };
    });
  }
  render();
}

function escapeHtml(s){
  // آمن للنص وللـ attributes (بيهرّب & < > " ')
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* مجموعة أفاتارات جاهزة - كلها SVG مولّدة محليًا (مفيش صور خارجية)، كل واحدة خلفية بلون مختلف ورمز بسيط */
function presetAvatars(){
  const items = [
    { bg: '#131921', glyph: '🦅' },
    { bg: '#007185', glyph: '📈' },
    { bg: '#f0c14b', glyph: '🐯' },
    { bg: '#1b8a5a', glyph: '🌿' },
    { bg: '#8e44ad', glyph: '🦁' },
    { bg: '#c0392b', glyph: '🐺' },
    { bg: '#2c3e50', glyph: '🦉' },
    { bg: '#e67e22', glyph: '🐉' },
  ];
  return items.map(it => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="50" fill="${it.bg}"/>
      <text x="50" y="62" font-size="46" text-anchor="middle">${it.glyph}</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  });
}

(async function init(){
  const params = new URLSearchParams(window.location.search);
  initScreenBackgroundWatcher(); // المراقبة شغالة من البداية حتى لشاشات روابط الإيميل
  const resetToken = params.get('reset_token');
  if (resetToken) { await primePageBackgrounds(); renderResetPassword(resetToken); return; }
  const verifyToken = params.get('verify_token');
  if (verifyToken) { await primePageBackgrounds(); renderVerifyEmailResult(verifyToken); return; }
  const refCode = params.get('ref');
  if (refCode) { try { localStorage.setItem('griffine_ref_code', refCode.toUpperCase()); } catch(e){} }
  await initAnnouncementBanner();
  initSiteFooter();
  initTopNav();
  initBottomNav();
  initDarkModeToggle();
  initBackButton();
  initLogoutButton();
  if (window.GShell) GShell.init();
  const [email] = await Promise.all([
    getSession(), // لازم يتنفذ الأول عشان window.__isAdmin يتحدد قبل ما الشات يتفعّل
    primePageTitles(), // تحميل عناوين الشاشات المخصصة من لوحة التحكم قبل أول عرض لأي شاشة
    primePageBackgrounds(), // تحميل خلفيات الشاشات المخصصة قبل أول عرض لأي شاشة
  ]);
  await refreshTopNav();
  initChatWidget(email);
  // رابط مباشر لسياسة الخصوصية: /index.php?page=privacy
  if (params.get('page') === 'privacy') { renderPrivacyPolicyPage(); return; }
  if (params.get('page') === 'delete-account') { window.__afterLoginTarget = 'deleteAccount'; if (email) { GShell.renderDeleteAccount(); } else { renderLogin(); } return; }
  // الإصدار 84: رابط دخول الإدارة السري ← شاشة "دخول الإدارة"
  if (params.get('staff') === '1') { try { history.replaceState(null, '', '/index.php'); } catch(e){} if (!email) { window.__staffGate = true; renderLogin(); return; } }
  // الإصدار 84: رجوع من صفحة الدفع Paymob
  const pay = params.get('pay');
  if (pay) { try { history.replaceState(null, '', '/index.php'); } catch(e){} setTimeout(() => alert(pay === 'ok' ? '✅ تم الدفع بنجاح واشتراكك اتفعّل.' : '❌ عملية الدفع ماتمتش. تقدر تحاول تاني أو تختار طريقة دفع تانية.'), 600); }
  if(email) postLoginRedirect(email); else renderPublicHome();
})();


