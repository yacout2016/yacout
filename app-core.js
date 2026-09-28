/* =====================================================================
   GRIFFINE — app-core.js (الإصدار 88) — الأساس: الحسابات، الاتصال بالسيرفر، الجلسة، النوافذ، الأدوات المشتركة
   (اتفصل من griffine.js - كل الملفات بتتحمّل بالترتيب في index.php وبتشارك نفس المتغيرات العامة)
   ===================================================================== */
/* GRIFFINE — كود الواجهة الأساسي (اتفصل من index.php في الإصدار 68) */
const GRIFFINE_LOGO_B64 = location.origin + '/griffine-logo-light.webp?v=95';   // الإصدار 84: ملف صورة (بيتخزّن في المتصفح) بدل Base64 جوه الكود
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
      message:`بناءً على نسبة الربح التي حددتها (نسبة ربح:مخاطرة 2:1)، نسبة الانخفاض المتوازنة المقترحة هي ${suggestedDropPercent}%` });
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
      message:`نسبة الانخفاض هذه كبيرة جدًا وقد تصل بالسعر إلى الصفر بسرعة كبيرة` });
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
   الإصدار 88: منع "تعليق" الشاشات - لو ضغطت على شاشة وبعدها بسرعة على شاشة تانية (مثلًا الموظفين ← الرئيسية)،
   الشاشة الأولى كانت بتكمّل تحميل بياناتها وترسم نفسها فوق الشاشة الجديدة (فتفضل واقف على الموظفين
   ومحتاج تدوس رجوع مرتين). دلوقتي كل شاشة بتاخد "رقم" أول ما تفتح، ومبترسمش لو فيه شاشة أحدث اتفتحت بعدها.
   ===================================================================== */
function screenToken(){ return (window.GShell && typeof GShell.seq === 'number') ? GShell.seq : 0; }
function screenStale(t){ return !!(window.GShell && typeof GShell.seq === 'number' && GShell.seq !== t); }

/* =====================================================================
   الإصدار 88: حماية CSP كاملة - لا يوجد أي onclick مكتوب جوه الـ HTML
   الأزرار بقت data-gcall="اسم الدالة" + data-gargs='[المدخلات JSON]' ومستمع واحد للضغطات بينفّذها.
   بيسمح بس بدوال window.__xxx اللي الموقع نفسه بيعرّفها (+ renderRegister) - أي HTML متحقن مش هيقدر ينفّذ كود.
   ===================================================================== */
/* =====================================================================
   الإصدار 88: نافذة التقرير (طباعة / PDF / مشاركة)
   التقارير بتفتح في نافذة جديدة - وبدل سكربت الطباعة اللي جوه النافذة (ممنوع مع CSP الكاملة)
   بنضيف شريط أزرار من الصفحة الأصلية: 🖨️ طباعة · ⬇️ تحميل PDF · 📤 مشاركة (واتساب / إيميل / أي تطبيق على الموبايل)
   ===================================================================== */
// الإصدار 89: نفس أدوات shell.css (u-*) - نوافذ التقارير مبتحمّلش ملفات CSS الموقع
const G_UTIL_CSS = ".u-wa{ width:auto !important; } .u-w100{ width:100% !important; } .u-m0{ margin:0 !important; } .u-mt0{ margin-top:0 !important; } .u-mt4{ margin-top:4px !important; } .u-mt6{ margin-top:6px !important; } .u-mt8{ margin-top:8px !important; } .u-mt10{ margin-top:10px !important; } .u-mt12{ margin-top:12px !important; } .u-mt14{ margin-top:14px !important; } .u-mt20{ margin-top:20px !important; } .u-mt24{ margin-top:24px !important; } .u-mb6{ margin-bottom:6px !important; } .u-mb8{ margin-bottom:8px !important; } .u-mb10{ margin-bottom:10px !important; } .u-bn{ border:none !important; } .u-tc{ text-align:center !important; } .u-ox{ overflow-x:auto; } .u-fs11{ font-size:11px !important; } .u-fs12{ font-size:12px !important; } .u-fs13{ font-size:13px !important; } .u-fs135{ font-size:13.5px !important; } .u-muted{ color:#888 !important; } .u-note{ color:#888 !important; font-size:13px !important; } .u-hint{ color:#888 !important; font-size:11.5px !important; } .u-danger{ color:#C0392B !important; } .u-pos{ color:#0E9F6E !important; } .u-neg{ color:#E02424 !important; } .u-row{ display:flex; justify-content:space-between; align-items:center; gap:8px; } .u-check{ display:flex; align-items:center; gap:5px; font-weight:normal; } .u-prose{ font-size:13.5px; line-height:1.8; white-space:pre-wrap; } .g-num{font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}";
function gReportReady(w){
  try {
    const d = w.document;
    const bar = d.createElement('div');
    bar.id = 'gReportBar';
    bar.setAttribute('style', 'position:sticky;top:0;z-index:9;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-start;padding:10px;margin:-10px -10px 14px;background:#fff;border-bottom:1px solid #e5e7eb;font-family:Tahoma,Arial,sans-serif;direction:rtl');
    const mk = (label, fn) => { const b = d.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('style', 'padding:8px 16px;border-radius:10px;border:1px solid #d1d5db;background:#111827;color:#fff;font-weight:700;cursor:pointer;font-size:14px'); b.addEventListener('click', fn); bar.appendChild(b); return b; };
    const st = d.createElement('style'); st.textContent = '@media print{#gReportBar{display:none !important}} ' + G_UTIL_CSS; d.head.appendChild(st);   // الإصدار 89: أدوات التنسيق (u-*) جوه نافذة التقرير
    mk('🖨️ طباعة', () => w.print());
    const pdfBtn = mk('⬇️ تحميل PDF', () => gReportPdf(w, false, pdfBtn));
    const shBtn = mk('📤 مشاركة', () => gReportPdf(w, true, shBtn));
    d.body.insertBefore(bar, d.body.firstChild);
    w.focus();
  } catch(e){ console.error('gReportReady', e); }
}
function gLoadScriptIn(doc, src){
  return new Promise((res, rej) => { const s = doc.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('تعذّر تحميل ' + src)); doc.head.appendChild(s); });
}
async function gReportPdf(w, share, btn){
  const d = w.document, old = btn.textContent;
  btn.disabled = true; btn.textContent = '⏳ جاري التجهيز...';
  try {
    // المكتبات بتتحمّل في الصفحة الأصلية (نفس اللي بيستخدمها تصدير الشاشات) وبتصوّر نافذة التقرير من هناك
    if (!window.html2canvas) await gLoadScriptIn(document, 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    if (!window.jspdf) await gLoadScriptIn(document, 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    // نسخة مخفية من التقرير جوه الصفحة الأصلية (html2canvas بيعلّق لو صوّر نافذة اتكتبت بـ document.write)
    // والتنسيقات بتاعة التقرير متقصورة على النسخة دي بس (مبتأثرش على شكل الموقع)
    const host = document.createElement('div');
    host.id = 'gRepHost';
    host.setAttribute('style', 'position:fixed;left:-12000px;top:0;width:900px;padding:24px;background:#fff;color:#111;direction:rtl;font-family:Tahoma,Arial,sans-serif;z-index:-1');
    let css = '';
    [...d.styleSheets].forEach(sh => { try { [...sh.cssRules].forEach(r => { if (r.selectorText) css += r.selectorText.split(',').map(x => '#gRepHost ' + x.trim().replace(/^body\b/, '')).join(',') + '{' + r.style.cssText + '}'; }); } catch(e){} });
    const clone = d.body.cloneNode(true); const cb = clone.querySelector('#gReportBar'); if (cb) cb.remove();
    host.innerHTML = '<style>' + css + '</style>' + clone.innerHTML;
    document.body.appendChild(host);
    let canvas;
    try { canvas = await window.html2canvas(host, { scale: 2, backgroundColor: '#ffffff', useCORS: true }); } finally { host.remove(); }
    const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pw = 210, ph = 297, imgH = canvas.height * pw / canvas.width;
    const img = canvas.toDataURL('image/jpeg', 0.92);
    let y = 0; pdf.addImage(img, 'JPEG', 0, 0, pw, imgH);
    while (imgH - y > ph) { y += ph; pdf.addPage(); pdf.addImage(img, 'JPEG', 0, -y, pw, imgH); }
    const name = ((d.title || 'GRIFFINE-report').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'GRIFFINE-report') + '.pdf';
    const blob = pdf.output('blob');
    const file = new File([blob], name, { type: 'application/pdf' });
    const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); };
    let shared = false;
    if (share && w.navigator.canShare && w.navigator.canShare({ files: [file] })) {
      try { await w.navigator.share({ files: [file], title: d.title || 'GRIFFINE', text: d.title || '' }); shared = true; }
      catch(err){ if (err && err.name === 'AbortError') shared = true; }   // المستخدم قفل نافذة المشاركة بنفسه
    }
    if (!shared) {
      if (share) w.alert('المشاركة المباشرة غير متاحة في هذا المتصفح - سيتم تحميل الملف ويمكنك إرساله عبر واتساب أو البريد.');
      download();
    }
  } catch(e){ if (e && e.name !== 'AbortError') w.alert('تعذّر تجهيز الملف: ' + (e.message || e)); }
  btn.disabled = false; btn.textContent = old;
}
function gArgs(arr){ return escapeHtml(JSON.stringify(arr)); }
const G_CALL_ALLOW = ['renderRegister'];
document.addEventListener('click', (e) => {
  const el = e.target.closest && e.target.closest('[data-gcall]');
  if (!el) return;
  const name = el.getAttribute('data-gcall');
  if (!(/^__[A-Za-z0-9_]+$/.test(name) || G_CALL_ALLOW.includes(name))) return;
  const fn = window[name]; if (typeof fn !== 'function') return;
  if (el.getAttribute('data-gstop') === '1') e.stopPropagation();
  let args = []; try { args = JSON.parse(el.getAttribute('data-gargs') || '[]'); } catch(err){}
  fn.apply(null, Array.isArray(args) ? args : []);
});

/* =====================================================================
   الإصدار 84: نوافذ التأكيد والإدخال جوه التطبيق (Bottom Sheet) بدل نوافذ المتصفح القديمة
   confirm / prompt (شكلها بدائي ومبتدعمش العربي كويس، وبعضها كان "موافق/إلغاء" لاختيار حاجة ← الأدمن بيغلط)
     gConfirm(رسالة, {ok, cancel, danger})  ← true / false
     gChoice(رسالة, [اختيار1, اختيار2, ...])  ← رقم الاختيار (0..) أو null لو اتقفلت
     gPrompt(رسالة, قيمة افتراضية, {type})   ← النص أو null
   النص بيتعرض كنص عادي (textContent) - لا يوجد أي HTML بيتنفّذ
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
   فيها أسهم مش موجودة على السيرفر بعد) مع بيانات السيرفر - عشان محدش يفقد بياناته مهما كان
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
  const bot = m.sender === 'admin' && typeof m.message === 'string' && (m.message.indexOf('🤖 مساعد') === 0 || m.message.indexOf('🔔 تنبيه سعر') === 0);   // الإصدار 89: رد المساعد الذكي
  return `<div class="chat-msg ${escapeHtml(m.sender)}${bot ? ' bot' : ''}">${m.message ? escapeHtml(m.message).replace(/\n/g, '<br>') : ''}${chatAttachmentHtml(m)}<span class="chat-msg-time">${formatChatTime(m.createdAt)}${extra || ''}</span></div>`;
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
    <button type="button" class="small ${on ? 'btn-active' : 'secondary'} chat-upload-toggle u-wa" id="${id}Btn" title="العميل مايقدرش يبعت ملفات إلا لو فتحتها له">${on ? '📎 رفع الملفات مفتوح للعميل (اقفل)' : '📎 افتح للعميل رفع ملف/صورة'}</button>
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
    if (ok) { ok.textContent = '✓ تم الحفظ'; setTimeout(() => { if (ok) ok.textContent = ''; }, 1800); }
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
   onProgress(0..1) لشريط التقدّم. كل جزء بيتعاد حتى 3 مرات لو النت قطع */
async function chatUploadFile(file, visitorId, onProgress){
  const CHUNK = 2 * 1024 * 1024;
  const uploadId = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  let offset = 0;
  while (offset < file.size) {
    const blob = file.slice(offset, offset + CHUNK);
    let r = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { r = await apiPost('/chat_upload_chunk.php', { visitorId, uploadId, offset, total: file.size, name: file.name, chunk: blob }); break; }
      catch(e){ r = { success:false, message:'انقطع الإنترنت أثناء الرفع - حاول مرة أخرى.' }; await new Promise(res => setTimeout(res, 1200 * (attempt + 1))); }
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
function saveChatPrefs(p){ try { localStorage.setItem('griffine_chat_prefs', JSON.stringify(p)); } catch(e){ alert('تعذّر حفظ التفضيل على هذا الجهاز (مساحة المتصفح).'); } }
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
    <div class="chat-header"><span>⚙️ تنبيهات الشات</span><span><button id="chatPrefsBack" class="u-fs13">◀ رجوع</button><button id="chatCloseBtn2">✕</button></span></div>
    <div class="chat-body chat-prefs">
      <p class="chat-prefs-note">يظهر التنبيه كنقطة حمراء على أيقونة الشات فقط (مثل ماسنجر) - دون رسائل منبثقة على الشاشة.</p>
      ${cfg.userSound ? `<div class="chat-prefs-sec"><strong>🔊 صوت التنبيه</strong>
        <div class="chat-sound-list">${Object.entries(CHAT_SOUNDS).map(([k, l]) => `<label class="chat-sound-opt"><input type="radio" name="chatSound" value="${k}" ${curSound === k ? 'checked' : ''}> ${l}</label>`).join('')}</div>
        <button type="button" class="small secondary u-wa" id="chatSoundTest">▶️ جرّب الصوت</button></div>` : `<p class="chat-prefs-note">صوت التنبيه: ${CHAT_SOUNDS[cfg.sound] || ''} (محدد من الإدارة)</p>`}
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
  // الإصدار 85: الحساب الجديد بعد التفعيل بيدخل الموقع كامل (الرئيسية + القائمة الجانبية) بدل ما يتحبس في شاشة الباقات
  const ok = await ensureAccess({ soft: true });
  if (ok) openAfterLoginScreen(); else window.__afterLoginTarget = null;
}

async function renderVerifyEmailPrompt(email){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderVerifyEmailPrompt(email));
  window.__lastPageKey='verify_email_prompt'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${email}</strong></div></div>
    <h2>فعّل بريدك الإلكتروني</h2>
    <div class="info">
      📩 أرسلنا إليك رابط تفعيل على <strong>${email}</strong>. افتح بريدك واضغط على الرابط لتتمكن من استخدام الموقع.<br>
      إذا لم تجد الرسالة، فتحقق من مجلد الـSpam، أو اطلب رابطًا جديدًا أدناه.
    </div>
    <button id="resendVerifyBtn">📤 إعادة إرسال رابط التفعيل</button>
    <button class="btn-gray" id="refreshVerifyBtn">🔄 تم التفعيل بالفعل — تحديث الحالة</button>
    <div id="verifyResendResult"></div>
  </div>`;
  document.getElementById('refreshVerifyBtn').onclick=async()=>{ invalidateSessionCache(); await getSession(); postLoginRedirect(email); };
  document.getElementById('resendVerifyBtn').onclick=async()=>{
    const btn = document.getElementById('resendVerifyBtn');
    btn.disabled = true; btn.textContent = 'جاري الإرسال...';
    const r = await resendVerificationEmail();
    document.getElementById('verifyResendResult').innerHTML = `<div class="info u-mt10">${escapeHtml(r.message)}</div>`;
    btn.disabled = false; btn.textContent = '📤 إعادة إرسال رابط التفعيل';
  };
}

/* الحارس العام: يتأكد إن العميل عنده صلاحية استخدام الموقع دلوقتي، ولو لأ بيوجّهه للشاشة المناسبة ويرجع false */
/* opts.soft (الإصدار 85): للشاشة الرئيسية وبعد الدخول - الحساب الجديد (من غير اشتراك / بانتظار التفعيل / منتهي)
   بيدخل الموقع عادي بالقائمة الجانبية والشريط السفلي، وبيرجع { soft: 'nosub' | 'pending' | 'expired', sub }
   عشان الرئيسية تعرض كارت "اختار باقتك". الشاشات المدفوعة (من غير soft) بتفضل تحوّل لشاشة الباقات زي الأول */
async function ensureAccess(opts){
  const soft = !!(opts && opts.soft);
  if (window.__isAdmin) return true; // المدير مش عميل مشترك، مالوش قيود
  // حارس تفعيل البريد الإلكتروني - كان بيتفحص بس لحظة الدخول (postLoginRedirect)، فأي حد يوصل لشاشة تانية بعدها
  // (تحديث الصفحة، أو رجوع لاحق) كان بيعدي من غير ما يتفعّل بريده. دلوقتي بيتفحص هنا مركزيًا لأن كل الشاشات المحمية بتعدي من هنا.
  const emailForCheck = await getSession();
  if (emailForCheck && !window.__emailVerified) { renderVerifyEmailPrompt(emailForCheck); return false; }
  const r = await getMySubscription();
  const sub = (r && r.success) ? r.subscription : null;

  if (!sub) { if (soft) return { soft: 'nosub', sub: null }; renderSubscriptionPlans(); return false; }
  if (!sub.active) { if (soft) return { soft: 'pending', sub }; renderPendingActivation(sub); return false; }

  const defaults = await getReminderDefaults();
  const today = new Date(); today.setHours(0,0,0,0);
  const end = new Date(sub.endDate); end.setHours(0,0,0,0);
  const graceEnd = new Date(end); graceEnd.setDate(graceEnd.getDate() + (defaults.gracePeriodDays||0));

  if (today > graceEnd) { if (soft) return { soft: 'expired', sub }; renderAccessExpired(sub); return false; }
  return true;
}
// كارت الرئيسية للحساب اللي بعد ماشتركش (الإصدار 85)
function accessGateCardHtml(acc){
  if (!acc || !acc.soft) return '';
  const t = {
    nosub:   ['🎉 أهلًا بك في GRIFFINE!', 'تم تفعيل حسابك. اختر باقتك (أو ابدأ التجربة المجانية) لتفتح خطط DCA و Grid والمحفظة والتوصيات.', 'اختار باقتك'],
    pending: ['⏳ اشتراكك بانتظار التفعيل', 'استلمنا طلبك وسيتفعّل فور مراجعة السداد. يمكنك تصفح الموقع حتى يتفعّل.', 'حالة الطلب'],
    expired: ['⌛ اشتراكك انتهى', 'جدّد اشتراكك لتعود إلى خططك ومحفظتك.', 'تجديد الاشتراك'],
  }[acc.soft];
  return `<div class="section-card gs-gate-card"><div style="font-weight:800;font-size:15px;margin-bottom:4px;">${t[0]}</div><div style="font-size:13px;line-height:1.8;opacity:.85;">${t[1]}</div>
    <button type="button" id="gsGateBtn" style="width:auto;margin-top:10px;">${t[2]}</button></div>`;
}
function wireAccessGateCard(acc){
  const b = document.getElementById('gsGateBtn'); if (!b || !acc) return;
  b.onclick = () => acc.soft === 'pending' ? renderPendingActivation(acc.sub) : acc.soft === 'expired' ? renderAccessExpired(acc.sub) : renderSubscriptionPlans();
}

async function renderPendingActivation(sub){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderPendingActivation(sub));
  const email = await getSession();
  window.__lastPageKey='pending_activation'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${email}</strong></div></div>
    <h2>بانتظار تفعيل الاشتراك</h2>
    <div class="info">
      📩 استلمنا طلب اشتراكك في <strong>${escapeHtml(sub.planName)}</strong> وبيانات السداد.<br>
      سيتم تفعيل حسابك فور مراجعة عملية التحويل من فريقنا (عادة خلال ساعات قليلة).
    </div>
    <div class="section-card">إذا احتجت إلى التواصل معنا بخصوص السداد، يمكنك استخدام بيانات التواصل أدناه.</div>
    <button class="secondary" id="goContactFromPendingBtn">📞 بيانات التواصل</button>
    <button class="btn-gray" id="refreshPendingBtn">🔄 تحديث الحالة</button>
  </div>`;
  document.getElementById('goContactFromPendingBtn').onclick=()=>renderContactInfo();
  document.getElementById('refreshPendingBtn').onclick=()=>postLoginRedirect(email);
}

async function renderAccessExpired(sub){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderAccessExpired(sub));
  const email = await getSession();
  window.__lastPageKey='access_expired'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${email}</strong></div></div>
    <h2>انتهت صلاحية اشتراكك</h2>
    <div class="error">
      اشتراكك في <strong>${escapeHtml(sub.planName)}</strong> انتهى يوم ${formatDateAr(sub.endDate)}، وانتهت أيضًا مدة السماح.<br>
      يجب تجديد اشتراكك لتتمكن من استخدام الموقع مرة أخرى — متابعة الخطط وعرض البيانات وكل صفحات الموقع موقوفة حتى التجديد.
    </div>
    <button id="renewNowBtn">💳 تجديد الاشتراك الآن</button>
    <button class="secondary" id="goContactFromExpiredBtn">📞 بيانات التواصل</button>
  </div>`;
  document.getElementById('renewNowBtn').onclick=()=>renderSubscriptionPlans();
  document.getElementById('goContactFromExpiredBtn').onclick=()=>renderContactInfo();
}

const app = document.getElementById('app');
const TOP7_LOGO_B64 = location.origin + '/top7-logo-light.webp?v=95';   // الإصدار 84: ملف صورة (بيتخزّن في المتصفح) بدل Base64 جوه الكود
const GRIFFINE_LOGO_DARK_B64 = location.origin + '/griffine-logo-dark.webp?v=95';   // الإصدار 84: ملف صورة (بيتخزّن في المتصفح) بدل Base64 جوه الكود
const TOP7_LOGO_DARK_B64 = location.origin + '/top7-logo-dark.webp?v=95';   // الإصدار 84: ملف صورة (بيتخزّن في المتصفح) بدل Base64 جوه الكود
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

