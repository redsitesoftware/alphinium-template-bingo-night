const http = require('http');
const https = require('https');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const roomsRouter = require('./routes/rooms');
const { registerGameHandlers } = require('./game');

const app = express();
const PORT = process.env.PORT || 3001;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

// ── Self-ping keep-alive ──────────────────────────────────────────────────────
// Alphinium's proxy expires idle pods when no real application traffic is seen.
// Health-check pings (intercepted by the proxy itself) do NOT reset the idle
// timer.  We must ping a real application route through the public URL so the
// request actually traverses the proxy.
//
// Priority for resolving the base URL:
//   1. SERVER_SELF_URL env var — explicit OPS config, starts working immediately on boot.
//   2. EXPO_PUBLIC_ROOM_API_URL env var — OPS sets this on the app pod.
//   3. Auto-detected from the first proxied request's x-forwarded-host header.
//   4. localhost fallback — local dev only; does NOT traverse the proxy.
//
// Set KEEP_ALIVE_INTERVAL_MS=0 to disable.

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
      _keepAliveTimer = setInterval(() => {
        http.get(`http://localhost:${PORT}/rooms`, (res) => { res.resume(); }).on('error', () => {});
      }, _keepAliveMs);
      console.log(`Keep-alive: no SERVER_SELF_URL or EXPO_PUBLIC_ROOM_API_URL set — pinging localhost:${PORT}/rooms every ${_keepAliveMs}ms (will switch to external URL on first external request)`);
    }
  });
}

module.exports = app;

