const express = require('express');
const { createRoom, getRoom, touchRoom, rooms } = require('../rooms');

const router = express.Router();

// GET /rooms — lightweight status/keep-alive endpoint
router.get('/', (_req, res) => {
  res.json({ activeRooms: rooms.size });
});

// POST /rooms — create a new room
router.post('/', (req, res) => {
  const { hostName, themeId, prize } = req.body;

  if (!hostName) {
    return res.status(400).json({ error: 'hostName is required' });
  }

  const room = createRoom({ hostName, themeId, prize });
  return res.status(201).json(room);
});

// POST /rooms/:code/join — join an existing room
router.post('/:code/join', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerName } = req.body;

  if (!playerName) {
    return res.status(400).json({ error: 'playerName is required' });
  }

  const room = getRoom(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.phase === 'ended') {
    return res.status(409).json({ error: 'Room has ended' });
  }

  room.players.push({ name: playerName, joinedAt: new Date() });
  touchRoom(room);

  return res.status(200).json(room);
});

// GET /rooms/:code — get current room state
router.get('/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = getRoom(code);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  touchRoom(room);
  return res.status(200).json(room);
});

module.exports = router;
