const http = require('http');
const https = require('https');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const roomsRouter = require('./routes/rooms');
const gamesRouter = require('./routes/games');
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

function startKeepAlive(baseUrl) {
  _startKeepAlive(baseUrl);
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
app.use('/games', gamesRouter);

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
