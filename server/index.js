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

// Keep-alive ping: prevents the Alphinium proxy from expiring the pod due to inactivity.
//
// The proxy intercepts GET /health itself and never forwards it to Express, so a
// localhost:/health ping does not count as application traffic and will not reset the
// proxy-level idle timeout.  We must hit the pod's public external URL on a real
// application route (GET /rooms) so the request actually traverses the proxy.
//
// SERVER_SELF_URL can be set explicitly via .alphinium/config.yaml env_vars.
// If not set, the server auto-discovers its public URL from the Host header of the
// first non-localhost request it receives.  This means the keep-alive becomes
// proxy-aware automatically after the first real external request, with no manual
// OPS intervention required.
//
// Set KEEP_ALIVE_INTERVAL_MS to 0 to disable.

let _resolvedSelfUrl = process.env.SERVER_SELF_URL || null;
let _keepAliveTimer = null;
const _keepAliveMs = parseInt(process.env.KEEP_ALIVE_INTERVAL_MS || '50000', 10);

function startKeepAlive(baseUrl) {
  if (_keepAliveTimer || _keepAliveMs <= 0) return;
  const https = require('https');
  const pingUrl = `${baseUrl.replace(/\/$/, '')}/rooms`;
  _keepAliveTimer = setInterval(() => {
    const client = pingUrl.startsWith('https') ? https : http;
    client.get(pingUrl, (res) => { res.resume(); }).on('error', () => {});
  }, _keepAliveMs);
  console.log(`Keep-alive: pinging ${pingUrl} every ${_keepAliveMs}ms`);
}

// Middleware: learn the pod's public URL from the first external request's Host header.
app.use((req, _res, next) => {
  if (!_resolvedSelfUrl && _keepAliveMs > 0) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    // Only use non-localhost hosts so local dev doesn't accidentally lock in 'localhost'.
    if (host && !host.startsWith('localhost') && !host.startsWith('127.')) {
      const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      _resolvedSelfUrl = `${proto}://${host}`;
      console.log(`Keep-alive: auto-discovered self URL from request: ${_resolvedSelfUrl}`);
      startKeepAlive(_resolvedSelfUrl);
    }
  }
  next();
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
      // SERVER_SELF_URL was explicitly set — start keep-alive immediately.
      startKeepAlive(_resolvedSelfUrl);
    } else {
      // No explicit URL — fall back to localhost until a real external request arrives.
      // Once the first external request is received, the middleware above switches to
      // the discovered public URL automatically.
      _keepAliveTimer = setInterval(() => {
        http.get(`http://localhost:${PORT}/rooms`, (res) => { res.resume(); }).on('error', () => {});
      }, _keepAliveMs);
      console.log(`Keep-alive: pinging localhost:${PORT}/rooms every ${_keepAliveMs}ms (will switch to external URL on first external request)`);
    }
  });
}

module.exports = app;
