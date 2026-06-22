const http = require('http');
const https = require('https');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const roomsRouter = require('./routes/rooms');
const themesRouter = require('./routes/themes');
const { registerGameHandlers } = require('./game');

const app = express();
const PORT = process.env.PORT || 3001;

// In two-pod deployments nginx proxies /rooms to this server, so browser requests
// are same-origin and never trigger CORS.  The CORS middleware mainly matters for
// direct cross-origin calls (e.g. local dev or PO UAT tools hitting the server pod
// URL directly).  Default to '*' so those calls work without extra OPS config.
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

// ── Self-ping keep-alive ──────────────────────────────────────────────────────
// Priority for resolving the base URL used by the keep-alive:
//   1. SERVER_SELF_URL env var — explicit OPS config, starts working immediately on boot.
//   2. EXPO_PUBLIC_ROOM_API_URL env var — OPS sets this on the app pod; if also declared
//      on the server pod it gives us the same URL without a second variable to manage.
//   3. Auto-detected from the first proxied request's x-forwarded-host header.
//   4. localhost fallback — local dev only; does NOT traverse the proxy.
//
// Set KEEP_ALIVE_INTERVAL_MS=0 to disable.
const _keepAliveMs = parseInt(process.env.KEEP_ALIVE_INTERVAL_MS || '50000', 10);
let _keepAliveTimer = null;
let _resolvedSelfUrl = process.env.SERVER_SELF_URL || process.env.EXPO_PUBLIC_ROOM_API_URL || null;

function startKeepAlive(baseUrl) {
  if (_keepAliveMs <= 0) return;
  if (_keepAliveTimer) { clearInterval(_keepAliveTimer); _keepAliveTimer = null; }
  const pingUrl = `${baseUrl.replace(/\/$/, '')}/rooms`;
  const client = pingUrl.startsWith('https') ? https : http;
  _keepAliveTimer = setInterval(() => {
    client.get(pingUrl, (res) => { res.resume(); }).on('error', () => {});
  }, _keepAliveMs);
  console.log(`Keep-alive: pinging ${pingUrl} every ${_keepAliveMs}ms`);
}

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

// Middleware: learn the pod's public URL from the first external request's Host header.
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
app.use('/themes', themesRouter);

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

registerGameHandlers(wss);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Bingo Night server listening on port ${PORT}`);

    if (_keepAliveMs <= 0) return;

    if (_resolvedSelfUrl) {
      // SERVER_SELF_URL was explicitly set — start keep-alive immediately.
      startKeepAlive(_resolvedSelfUrl);
    } else {
      // No explicit URL — fall back to localhost until a real external request arrives.
      // Once the first external request is received, the middleware above switches to
      // the discovered public URL automatically.
      _keepAliveTimer = setInterval(() => {
        http.get(`http://localhost:${PORT}/rooms`, (res) => { res.resume(); }).on('error', () => {});
      }, _keepAliveMs);
      console.log(`Keep-alive: no SERVER_SELF_URL or EXPO_PUBLIC_ROOM_API_URL set — pinging localhost:${PORT}/rooms every ${_keepAliveMs}ms (will switch to external URL on first external request)`);
    }
  });
}

module.exports = app;
