const http = require('http');
const https = require('https');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const roomsRouter = require('./routes/rooms');
const gamesRouter = require('./routes/games');
const audioRouter = require('./routes/audio');
const { registerGameHandlers } = require('./game');

const app = express();
const PORT = process.env.PORT || 3001;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Keep-alive ping: prevents the Alphinium proxy from expiring the pod due to inactivity.
//
// The proxy intercepts GET /health itself and never forwards it to Express, so a
// localhost:/health ping does not count as application traffic and will not reset the
// proxy-level idle timeout.  We must hit the pod's public external URL on a real
// application route (GET /rooms) so the request actually traverses the proxy.
//
// Priority for resolving the base URL used by the keep-alive:
//   1. SERVER_SELF_URL env var — explicit OPS config, starts working immediately on boot.
//   2. EXPO_PUBLIC_ROOM_API_URL env var — OPS sets this on the app pod; if also declared
//      on the server pod it gives us the same URL without a second variable to manage.
//   3. Auto-detected from the first proxied request's x-forwarded-host header.
//   4. localhost fallback — local dev only; does NOT traverse the proxy.
//
// For Alphinium preview/prod deployments, set SERVER_SELF_URL or EXPO_PUBLIC_ROOM_API_URL
// (both declared in .alphinium/config.yaml) so the keep-alive is proxy-aware from boot.
// Without either, the server falls back to localhost until the first external request
// arrives, which may allow the proxy idle timer to expire before UAT runs.
//
// Set KEEP_ALIVE_INTERVAL_MS to 0 to disable.

let _resolvedSelfUrl = process.env.SERVER_SELF_URL || process.env.EXPO_PUBLIC_ROOM_API_URL || null;
let _keepAliveTimer = null;
const _keepAliveMs = parseInt(process.env.KEEP_ALIVE_INTERVAL_MS || '50000', 10);

function startKeepAlive(baseUrl) {
  if (_keepAliveMs <= 0) return;
  if (_keepAliveTimer) { clearInterval(_keepAliveTimer); _keepAliveTimer = null; }
  const pingUrl = `${baseUrl.replace(/\/$/, '')}/rooms`;
  _keepAliveTimer = setInterval(() => {
    const client = pingUrl.startsWith('https') ? https : http;
    client.get(pingUrl, (res) => { res.resume(); }).on('error', () => {});
  }, _keepAliveMs);
  console.log(`Keep-alive: pinging ${pingUrl} every ${_keepAliveMs}ms`);
}

// Middleware: learn the pod's public URL from the first external request's Host header.
// Only switches once — subsequent requests from the same host are no-ops.
app.use((req, _res, next) => {
  if (!_resolvedSelfUrl && _keepAliveMs > 0) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    if (host && !host.startsWith('localhost') && !host.startsWith('127.')) {
      const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      _resolvedSelfUrl = `${proto}://${host}`;
      console.log(`Keep-alive: auto-discovered self URL from request: ${_resolvedSelfUrl}`);
      startKeepAlive(_resolvedSelfUrl);
    }
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/rooms', roomsRouter);
app.use('/games', gamesRouter);
app.use('/audio', audioRouter);

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

registerGameHandlers(wss);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Bingo Night server listening on port ${PORT}`);

    if (_keepAliveMs <= 0) return;

    if (_resolvedSelfUrl) {
      startKeepAlive(_resolvedSelfUrl);
    } else {
      // No explicit URL — fall back to localhost until a real external request arrives.
      _keepAliveTimer = setInterval(() => {
        http.get(`http://localhost:${PORT}/rooms`, (res) => { res.resume(); }).on('error', () => {});
      }, _keepAliveMs);
      console.log(`Keep-alive: no SERVER_SELF_URL or EXPO_PUBLIC_ROOM_API_URL set — pinging localhost:${PORT}/rooms every ${_keepAliveMs}ms (will switch to external URL on first external request)`);
    }
  });
}

module.exports = app;

// feat: add max-players cap and waiting room queue
