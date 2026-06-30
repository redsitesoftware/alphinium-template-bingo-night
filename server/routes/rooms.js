const express = require('express');
const { createRoom, getRoom, touchRoom, rooms } = require('../rooms');
const { generatePlayerCard, validateClaim } = require('../winLogic');

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

// GET /rooms/:code/card?playerName=X — get or generate a player's unique card
router.get('/:code/card', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerName } = req.query;

  if (!playerName) {
    return res.status(400).json({ error: 'playerName query param is required' });
  }

  const room = getRoom(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  let player = room.players.find(p => p.name === playerName);
  if (!player) {
    player = { name: playerName, joinedAt: new Date() };
    room.players.push(player);
  }

  if (!player.card) {
    const existingCards = room.players
      .filter(p => p !== player && p.card)
      .map(p => p.card);
    player.card = generatePlayerCard(room.themeId, existingCards);
  }

  touchRoom(room);
  return res.status(200).json({ card: player.card });
});

// POST /rooms/:code/claim — server-side win validation (prevents cheating)
router.post('/:code/claim', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerName, claimType } = req.body;

  if (!playerName || !claimType) {
    return res.status(400).json({ error: 'playerName and claimType are required' });
  }

  if (claimType !== 'line' && claimType !== 'full-house') {
    return res.status(400).json({ error: 'claimType must be "line" or "full-house"' });
  }

  const room = getRoom(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const player = room.players.find(p => p.name === playerName);
  if (!player || !player.card) {
    return res.status(404).json({ error: 'Player card not found — request a card first via GET /rooms/:code/card' });
  }

  const result = validateClaim(player.card, room.calledItems, claimType);
  touchRoom(room);
  return res.status(200).json(result);
});

module.exports = router;
