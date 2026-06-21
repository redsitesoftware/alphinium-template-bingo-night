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
// Startup sequence:
//   1. SERVER_SELF_URL set   → ping the external URL immediately from boot.
//   2. SERVER_SELF_URL unset → ping localhost on boot (keeps the process warm);
//      switch to the real external URL on the first proxied request whose
//      x-forwarded-host header reveals the pod's public address.
//
// _startKeepAlive always clears any running timer before starting the new one
// so the localhost → external transition is atomic and race-free.
//
// Set KEEP_ALIVE_INTERVAL_MS=0 to disable.
const _keepAliveMs = parseInt(process.env.KEEP_ALIVE_INTERVAL_MS || '50000', 10);
let _keepAliveTimer = null;
let _keepAliveUrl = null;

function _startKeepAlive(baseUrl) {
  if (_keepAliveMs <= 0) return;
  const pingUrl = `${baseUrl.replace(/\/$/, '')}/rooms`;
  if (pingUrl === _keepAliveUrl) return;
  if (_keepAliveTimer) {
    clearInterval(_keepAliveTimer);
    _keepAliveTimer = null;
  }
  _keepAliveUrl = pingUrl;
  const client = pingUrl.startsWith('https') ? https : http;
  console.log(`Keep-alive: pinging ${pingUrl} every ${_keepAliveMs}ms`);
  _keepAliveTimer = setInterval(() => {
    client.get(pingUrl, (res) => { res.resume(); }).on('error', () => {});
  }, _keepAliveMs);
}

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

// Switch the keep-alive from the localhost warm-up timer to the real external
// URL on the first proxied request.  Uses x-forwarded-host (set by Alphinium's
// proxy) to detect the pod's public address.  Only switches once — subsequent
// requests from the same host are no-ops.
app.use((req, _res, next) => {
  if (_keepAliveMs > 0) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const isLoopback = !host || host.startsWith('localhost') || host.startsWith('127.');
    if (!isLoopback && _keepAliveUrl && _keepAliveUrl.includes('localhost')) {
      const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      const externalUrl = `${proto}://${host}`;
      console.log(`Keep-alive: switching to auto-detected URL: ${externalUrl}`);
      _startKeepAlive(externalUrl);
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
    // Start keep-alive immediately.  SERVER_SELF_URL is the preferred source;
    // without it we fall back to localhost so the timer infrastructure is ready
    // and the middleware can atomically switch to the real external URL on the
    // first proxied request (clearing the localhost timer via clearInterval).
    const selfUrl = process.env.SERVER_SELF_URL || `http://localhost:${PORT}`;
    _startKeepAlive(selfUrl);
  });
}

module.exports = app;
