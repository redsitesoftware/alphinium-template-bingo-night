const express = require('express');
const { createRoom, getRoom, touchRoom, rooms, generateCard, validateClaim, broadcastToRoom } = require('../rooms');

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

// GET /rooms/:code/card?playerName=<name> — get or generate a bingo card for a player
router.get('/:code/card', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerName } = req.query;

  if (!playerName) {
    return res.status(400).json({ error: 'playerName is required' });
  }

  const room = getRoom(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const isKnownPlayer = room.players.find(p => p.name === playerName)
    || playerName === room.hostName;
  if (!isKnownPlayer) {
    return res.status(404).json({ error: 'Player not found in room' });
  }

  const grid = generateCard(code, playerName);
  if (!grid) {
    return res.status(500).json({ error: 'Could not generate card' });
  }

  return res.status(200).json({ grid });
});

// POST /rooms/:code/claim — validate a bingo win claim and broadcast winner-announced on success
router.post('/:code/claim', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerName, claimType } = req.body;

  if (!playerName) {
    return res.status(400).json({ error: 'playerName is required' });
  }
  if (!claimType || !['line', 'full-house'].includes(claimType)) {
    return res.status(400).json({ error: 'claimType must be "line" or "full-house"' });
  }

  const room = getRoom(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const player = room.players.find(p => p.name === playerName)
    || (playerName === room.hostName
      ? room.players.find(p => p.name === room.hostName)
      : null);

  if (!player || !player.card) {
    return res.status(404).json({ error: 'Player card not found — call GET /card first' });
  }

  const result = validateClaim(player.card, room.calledItems, claimType);

  if (result.valid) {
    broadcastToRoom(code, {
      type: 'winner-announced',
      winnerName: playerName,
      winType: claimType,
      prize: room.prize,
      calledItems: room.calledItems,
    });
  }

  return res.status(200).json(result);
});

module.exports = router;
