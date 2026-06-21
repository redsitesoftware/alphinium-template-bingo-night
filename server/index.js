const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const roomsRouter = require('./routes/rooms');
const { registerGameHandlers } = require('./game');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:8081';

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

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
    // Set SERVER_SELF_URL to the pod's public base URL (e.g.
    // https://...-server.user-pods.alphinium.io) via .alphinium/config.yaml env_vars.
    // If not set, falls back to localhost (useful for local dev where there is no proxy).
    //
    // Set KEEP_ALIVE_INTERVAL_MS to 0 to disable.
    const keepAliveMs = parseInt(process.env.KEEP_ALIVE_INTERVAL_MS || '50000', 10);
    if (keepAliveMs > 0) {
      const selfUrl = process.env.SERVER_SELF_URL;
      if (selfUrl) {
        // External ping through the proxy on a real application route.
        const https = require('https');
        const pingUrl = `${selfUrl.replace(/\/$/, '')}/rooms`;
        setInterval(() => {
          const client = pingUrl.startsWith('https') ? https : http;
          client.get(pingUrl, (res) => { res.resume(); }).on('error', () => {});
        }, keepAliveMs);
        console.log(`Keep-alive: pinging ${pingUrl} every ${keepAliveMs}ms`);
      } else {
        // Fallback for local dev: ping localhost directly.
        setInterval(() => {
          http.get(`http://localhost:${PORT}/rooms`, (res) => { res.resume(); }).on('error', () => {});
        }, keepAliveMs);
        console.log(`Keep-alive: pinging localhost:${PORT}/rooms every ${keepAliveMs}ms (set SERVER_SELF_URL for proxy-aware pinging)`);
      }
    }
  });
}

module.exports = app;
