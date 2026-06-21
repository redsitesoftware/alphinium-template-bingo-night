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

    // Self-ping keep-alive: prevents pod from being cleaned up due to inactivity.
    // Interval is configurable via KEEP_ALIVE_INTERVAL_MS (0 to disable).
    const keepAliveMs = parseInt(process.env.KEEP_ALIVE_INTERVAL_MS || '50000', 10);
    if (keepAliveMs > 0) {
      setInterval(() => {
        http.get(`http://localhost:${PORT}/health`, (res) => {
          res.resume();
        }).on('error', () => {});
      }, keepAliveMs);
    }
  });
}

module.exports = app;
