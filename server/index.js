const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const roomsRouter = require('./routes/rooms');
const { registerGameHandlers } = require('./game');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:8081';

// Auto-detect the pod's external base URL from the first proxied request.
// Used by the keep-alive when SERVER_SELF_URL is not explicitly set.
let _detectedSelfUrl = null;

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

// Capture the external URL from the first request that comes through the proxy.
app.use((req, _res, next) => {
  if (!_detectedSelfUrl && !process.env.SERVER_SELF_URL) {
    const host = req.get('x-forwarded-host') || req.get('host');
    const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
    // Only detect if this looks like an external hostname (not a loopback address).
    const hostname = host ? host.split(':')[0] : '';
    const isLoopback = !hostname || hostname === 'localhost' || hostname === '127.0.0.1'
      || hostname === '::1' || hostname === '0.0.0.0';
    if (!isLoopback) {
      _detectedSelfUrl = `${proto}://${host}`;
      console.log(`Keep-alive: auto-detected external URL: ${_detectedSelfUrl}`);
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

    // Keep-alive ping: prevents the Alphinium proxy from expiring the pod due to inactivity.
    //
    // The proxy intercepts GET /health itself and never forwards it to Express, so a
    // localhost:/health ping does not count as application traffic and will not reset the
    // proxy-level idle timeout.  We must hit the pod's public external URL on a real
    // application route (GET /rooms) so the request actually traverses the proxy.
    //
    // Priority for the base URL used by the keep-alive:
    //   1. SERVER_SELF_URL env var (explicit OPS config, always preferred)
    //   2. Auto-detected from the first proxied request's Host header
    //   3. localhost fallback (local dev only — does NOT traverse the proxy)
    //
    // Set KEEP_ALIVE_INTERVAL_MS to 0 to disable.
    const keepAliveMs = parseInt(process.env.KEEP_ALIVE_INTERVAL_MS || '50000', 10);
    if (keepAliveMs > 0) {
      const https = require('https');
      setInterval(() => {
        const selfUrl = process.env.SERVER_SELF_URL || _detectedSelfUrl;
        const pingUrl = selfUrl
          ? `${selfUrl.replace(/\/$/, '')}/rooms`
          : `http://localhost:${PORT}/rooms`;
        const client = pingUrl.startsWith('https') ? https : http;
        client.get(pingUrl, (res) => { res.resume(); }).on('error', () => {});
      }, keepAliveMs);

      if (process.env.SERVER_SELF_URL) {
        const pingUrl = `${process.env.SERVER_SELF_URL.replace(/\/$/, '')}/rooms`;
        console.log(`Keep-alive: pinging ${pingUrl} every ${keepAliveMs}ms`);
      } else {
        console.log(`Keep-alive: will auto-detect external URL from first proxied request (fallback: localhost:${PORT}/rooms), interval ${keepAliveMs}ms`);
      }
    }
  });
}

module.exports = app;
