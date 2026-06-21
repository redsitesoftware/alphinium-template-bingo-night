const express = require('express');
const { createRoom, getRoom, touchRoom } = require('../rooms');

const router = express.Router();

// POST /rooms — create a new room
router.post('/', (req, res) => {
  const { hostName, themeId } = req.body;

  if (!hostName) {
    return res.status(400).json({ error: 'hostName is required' });
  }

  const room = createRoom({ hostName, themeId });
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
