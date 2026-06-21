const http = require('http');
const https = require('https');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const roomsRouter = require('./routes/rooms');
const { registerGameHandlers } = require('./game');

const app = express();
const PORT = process.env.PORT || 3001;

// In two-pod deployments nginx proxies /rooms to this server, so browser requests
// are same-origin and never trigger CORS.  The CORS middleware mainly matters for
// direct cross-origin calls (e.g. local dev or PO UAT tools hitting the server pod
// URL directly).  Default to '*' so those calls work without extra OPS config.
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

// ── Self-ping keep-alive ──────────────────────────────────────────────────────
// Alphinium's proxy expires idle pods when no real application traffic is seen.
// Health-check pings (intercepted by the proxy itself) do NOT reset the idle
// timer.  We must ping a real application route through the public URL so the
// request actually traverses the proxy.
//
// URL resolution priority:
//   1. SERVER_SELF_URL env var  — explicit OPS config; effective from boot.
//   2. Auto-detected from first proxied request's x-forwarded-host header.
//   3. localhost fallback        — local dev only; does NOT traverse the proxy.
//
// Set KEEP_ALIVE_INTERVAL_MS=0 to disable.
const _keepAliveMs = parseInt(process.env.KEEP_ALIVE_INTERVAL_MS || '50000', 10);
let _selfUrl = process.env.SERVER_SELF_URL || null;
let _keepAliveStarted = false;

function _startKeepAlive(baseUrl) {
  if (_keepAliveStarted || _keepAliveMs <= 0) return;
  if (_keepAliveStarted || _keepAliveMs <= 0) return;
  _keepAliveStarted = true;
  const pingUrl = `${baseUrl.replace(/\/$/, '')}/rooms`;
  const client = pingUrl.startsWith('https') ? https : http;
  console.log(`Keep-alive: pinging ${pingUrl} every ${_keepAliveMs}ms`);
  setInterval(() => {
    client.get(pingUrl, (res) => { res.resume(); }).on('error', () => {});
  }, _keepAliveMs);
}

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

// If SERVER_SELF_URL was set at boot, start the keep-alive immediately
// (no need to wait for the first request).
if (_selfUrl) _startKeepAlive(_selfUrl);

// Capture the pod's public URL from the first proxied request's Host header so
// the keep-alive can start even when SERVER_SELF_URL was not set by OPS.
app.use((req, _res, next) => {
  if (!_selfUrl && _keepAliveMs > 0) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const isLoopback = !host || host.startsWith('localhost') || host.startsWith('127.');
    if (!isLoopback) {
      const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      _selfUrl = `${proto}://${host}`;
      console.log(`Keep-alive: auto-detected self URL: ${_selfUrl}`);
      _startKeepAlive(_selfUrl);
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
  });
}

module.exports = app;
