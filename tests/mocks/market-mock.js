// TradingView scanner + Yahoo mock with settable prices: GET /set?sym=COMI&price=80
const http = require('http'); const prices = { COMI: 80, HRHO: 20, TMGH: 55, CRVX: 12 };
http.createServer((req, res) => { let body = ''; req.on('data', c => body += c); req.on('end', () => {
  const u = new URL(req.url, 'http://x'); const send = (o, c = 200) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/set') { prices[u.searchParams.get('sym')] = +u.searchParams.get('price'); return send({ ok: true, prices }); }
  if (/\/scan$/.test(u.pathname)) { const j = JSON.parse(body || '{}'); const t = j.symbols.tickers[0]; const sym = t.split(':')[1]; const p = prices[sym];
    if (!p) return send({ data: [] });
    const vals = { description: sym + ' Co', close: p, change_abs: 1, high: p * 1.02, low: p * 0.98, currency: 'EGP', update_mode: 'delayed_streaming_900', 'High.1M': p * 1.1, 'Low.1M': p * 0.9, 'High.3M': p * 1.2, 'Low.3M': p * 0.8 };
    return send({ data: [{ s: t, d: j.columns.map(c => vals[c] ?? p) }] }); }
  // Yahoo chart (الإصدار 91): أسعار إغلاق يومية لآخر 400 يوم - خط من 70% لحد السعر الحالي
  const ym = u.pathname.match(/^\/([A-Z0-9-]+)\.CA$/);
  if (ym && prices[ym[1]] && u.searchParams.get('interval') === '1d') {
    const p = prices[ym[1]], n = 400, now = Math.floor(Date.now() / 86400000) * 86400, ts = [], c = [];
    for (let i = n - 1; i >= 0; i--) { ts.push(now - i * 86400); c.push(+(p * (0.7 + 0.3 * (n - 1 - i) / (n - 1))).toFixed(3)); }
    return send({ chart: { result: [{ meta: { currency: 'EGP', longName: ym[1] + ' Co' }, timestamp: ts, indicators: { quote: [{ high: c.map(x => x * 1.01), low: c.map(x => x * 0.99), close: c }] } }] } });
  }
  send({ chart: { result: null } });
}); }).listen(8098, () => console.log('market mock 8098'));
