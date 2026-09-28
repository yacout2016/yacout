// TradingView scanner + Yahoo mock with settable prices: GET /set?sym=COMI&price=80
const http = require('http'); const prices = { COMI: 80, HRHO: 20, TMGH: 55 };
http.createServer((req, res) => { let body = ''; req.on('data', c => body += c); req.on('end', () => {
  const u = new URL(req.url, 'http://x'); const send = (o, c = 200) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/set') { prices[u.searchParams.get('sym')] = +u.searchParams.get('price'); return send({ ok: true, prices }); }
  if (/\/scan$/.test(u.pathname)) { const j = JSON.parse(body || '{}'); const t = j.symbols.tickers[0]; const sym = t.split(':')[1]; const p = prices[sym];
    if (!p) return send({ data: [] });
    const vals = { description: sym + ' Co', close: p, change_abs: 1, high: p * 1.02, low: p * 0.98, currency: 'EGP', update_mode: 'delayed_streaming_900', 'High.1M': p * 1.1, 'Low.1M': p * 0.9, 'High.3M': p * 1.2, 'Low.3M': p * 0.8 };
    return send({ data: [{ s: t, d: j.columns.map(c => vals[c] ?? p) }] }); }
  send({ chart: { result: null } });
}); }).listen(8098, () => console.log('market mock 8098'));
