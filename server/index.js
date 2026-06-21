const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { createRoom, getRoom, joinRoom } = require('./rooms');
const { registerGameHandlers } = require('./game');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:8081';

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// POST /rooms — create a new room
app.post('/rooms', (req, res) => {
  const { hostName, themeId } = req.body;
  if (!hostName || !themeId) {
    return res.status(400).json({ error: 'hostName and themeId are required' });
  }
  const room = createRoom(hostName, themeId);
  res.status(201).json(room);
});

// GET /rooms/:code — get room details
app.get('/rooms/:code', (req, res) => {
  const room = getRoom(req.params.code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

// POST /rooms/:code/join — join a room
app.post('/rooms/:code/join', (req, res) => {
  const { playerName } = req.body;
  if (!playerName) {
    return res.status(400).json({ error: 'playerName is required' });
  }
  const room = joinRoom(req.params.code.toUpperCase(), playerName);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

registerGameHandlers(wss);

server.listen(PORT, () => {
  console.log(`Bingo Night server listening on port ${PORT}`);
});
