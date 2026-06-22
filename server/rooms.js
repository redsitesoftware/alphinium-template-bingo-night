const { customAlphabet } = require('nanoid');
const { WebSocket } = require('ws');
const { getTheme } = require('./themes');

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const _rawCode = customAlphabet(CODE_ALPHABET, 6);

/** @type {Map<string, object>} */
const rooms = new Map();

const DEFAULT_THEME_ID = 'office';

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate a unique 6-char alphanumeric room code (A-Z0-9).
 * Retries on collision.
 */
function generateCode() {
  let code;
  do {
    code = _rawCode();
  } while (rooms.has(code));
  return code;
}

/**
 * Fisher-Yates shuffle — returns a new shuffled array.
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Create a new room and store it.
 * @param {string|{hostName:string,themeId?:string,prize?:string}} hostNameOrOpts
 * @param {string} [themeId]
 * @returns {object} The created room
 */
function createRoom(hostNameOrOpts, themeId) {
  // Support both createRoom('Alice','t1') and createRoom({hostName:'Alice',themeId:'t1',prize:'...'})
  let hostName;
  let prize;
  if (typeof hostNameOrOpts === 'object') {
    ({ hostName, themeId, prize } = hostNameOrOpts);
  } else {
    hostName = hostNameOrOpts;
  }

  const code = generateCode();
  const now = new Date();
  const resolvedPool = (getTheme(themeId) || getTheme(DEFAULT_THEME_ID)).calls;
  const room = {
    code,
    hostName,
    themeId: themeId || null,
    prize: prize || null,
    players: [],
    createdAt: now,
    lastActivityAt: now,
    phase: 'lobby',
    callQueue: shuffled(resolvedPool),
    calledItems: [],
    isCalling: false,
    callerInterval: 10,
    clients: new Set(),
  };
  rooms.set(code, room);
  return room;
}

/**
 * Generate a 5×5 bingo card for a player and store it on the player object.
 * Idempotent — returns existing card if player already has one.
 * Guarantees uniqueness among cards already assigned in the room.
 * @param {string} code
 * @param {string} playerName
 * @returns {string[][]|null} 5×5 grid, or null if room/player not found
 */
function generateCard(code, playerName) {
  const room = rooms.get(code);
  if (!room) return null;

  const player = room.players.find(p => p.name === playerName)
    || (playerName === room.hostName ? { name: playerName, _isHost: true } : null);
  if (!player) return null;

  // Return existing card (idempotent)
  if (player.card) return player.card;

  const pool = (getTheme(room.themeId) || getTheme(DEFAULT_THEME_ID)).calls;
  const existingGrids = room.players
    .filter(p => p.card)
    .map(p => JSON.stringify(p.card));

  // Try to generate a unique card (up to 20 attempts)
  for (let attempt = 0; attempt < 20; attempt++) {
    const shuffledPool = shuffle(pool);
    const flat = shuffledPool.slice(0, 25);
    const grid = [
      flat.slice(0, 5),
      flat.slice(5, 10),
      flat.slice(10, 15),
      flat.slice(15, 20),
      flat.slice(20, 25),
    ];
    if (!existingGrids.includes(JSON.stringify(grid))) {
      player.card = grid;
      // If player is host and not in players array, add a synthetic host tracker
      if (player._isHost && !room.players.find(p => p.name === playerName)) {
        room.players.push(player);
      }
      room.lastActivityAt = new Date();
      return grid;
    }
  }

  // Fallback: return the last generated grid even if not unique
  const fallbackFlat = shuffle(pool).slice(0, 25);
  player.card = [
    fallbackFlat.slice(0, 5),
    fallbackFlat.slice(5, 10),
    fallbackFlat.slice(10, 15),
    fallbackFlat.slice(15, 20),
    fallbackFlat.slice(20, 25),
  ];
  room.lastActivityAt = new Date();
  return player.card;
}

/**
 * Validate a bingo claim against the room's called items.
 * @param {string[][]} grid  5×5 bingo card
 * @param {string[]} calledItems  Items called so far
 * @param {'line'|'full-house'} claimType
 * @returns {{ valid: boolean, pattern: string[] }}
 */
function validateClaim(grid, calledItems, claimType) {
  const called = new Set(calledItems);
  const flat = grid.flat();

  if (claimType === 'full-house') {
    const valid = flat.every(cell => called.has(cell));
    return { valid, pattern: valid ? flat : [] };
  }

  if (claimType === 'line') {
    // Check rows
    for (const row of grid) {
      if (row.every(cell => called.has(cell))) {
        return { valid: true, pattern: row };
      }
    }
    // Check columns
    for (let col = 0; col < 5; col++) {
      const column = grid.map(row => row[col]);
      if (column.every(cell => called.has(cell))) {
        return { valid: true, pattern: column };
      }
    }
    // Check diagonals
    const diag1 = [grid[0][0], grid[1][1], grid[2][2], grid[3][3], grid[4][4]];
    if (diag1.every(cell => called.has(cell))) {
      return { valid: true, pattern: diag1 };
    }
    const diag2 = [grid[0][4], grid[1][3], grid[2][2], grid[3][1], grid[4][0]];
    if (diag2.every(cell => called.has(cell))) {
      return { valid: true, pattern: diag2 };
    }

    return { valid: false, pattern: [] };
  }

  return { valid: false, pattern: [] };
}

/**
 * Get a room by code and update lastActivityAt.
 * @param {string} code
 * @returns {object|undefined}
 */
function getRoom(code) {
  const room = rooms.get(code);
  if (room) {
    room.lastActivityAt = new Date();
  }
  return room;
}

/** Touch lastActivityAt without a full getRoom lookup (used by routes). */
function touchRoom(room) {
  room.lastActivityAt = new Date();
}

/**
 * Add a player to a room.
 * @param {string} code
 * @param {string} playerName
 * @returns {object|null} Updated room or null if not found
 */
function joinRoom(code, playerName) {
  const room = rooms.get(code);
  if (!room) return null;
  room.players.push({ name: playerName, card: null, joinedAt: new Date() });
  room.lastActivityAt = new Date();
  return room;
}

/**
 * Persist a player's bingo card (25-element string array) against their entry.
 * @param {string} code  Room code
 * @param {string} name  Player name
 * @param {string[]} card  Flat 25-element array
 * @returns {boolean} true if saved, false if room/player not found
 */
function savePlayerCard(code, name, card) {
  const room = rooms.get(code);
  if (!room) return false;
  const player = room.players.find(p => p.name === name);
  if (!player) return false;
  player.card = card;
  room.lastActivityAt = new Date();
  return true;
}

/**
 * Retrieve a player's stored bingo card.
 * @param {string} code  Room code
 * @param {string} name  Player name
 * @returns {string[]|null} The card array, or null if not found/unset
 */
function getPlayerCard(code, name) {
  const room = rooms.get(code);
  if (!room) return null;
  const player = room.players.find(p => p.name === name);
  return player?.card ?? null;
}

/**
 * Pop the next item from callQueue into calledItems.
 * @param {string} code
 * @returns {*} The called item, or null if queue is empty or room not found
 */
function nextCall(code) {
  const room = rooms.get(code);
  if (!room || room.callQueue.length === 0) return null;
  const item = room.callQueue.shift();
  room.calledItems.push(item);
  room.lastActivityAt = new Date();
  return item;
}

/**
 * Return a serialisable snapshot of a room (excludes the clients Set).
 * @param {string} code
 * @returns {object|null}
 */
function getRoomState(code) {
  const room = rooms.get(code);
  if (!room) return null;
  const { clients, ...state } = room;  // eslint-disable-line no-unused-vars
  return state;
}

/**
 * Add a WebSocket client to the room's client set.
 * @param {string} code
 * @param {import('ws').WebSocket} ws
 */
function addClient(code, ws) {
  const room = rooms.get(code);
  if (room) room.clients.add(ws);
}

/**
 * Remove a WebSocket client from the room's client set.
 * @param {string} code
 * @param {import('ws').WebSocket} ws
 */
function removeClient(code, ws) {
  const room = rooms.get(code);
  if (room) room.clients.delete(ws);
}

/**
 * Generate (or retrieve) a unique 5×5 bingo card for a player.
 * Cards are stored on the player object; subsequent calls return the same card.
 * Retries up to 100 times to produce a grid distinct from all other players in the room.
 * @param {string} code Room code
 * @param {string} playerName
 * @returns {{ grid: string[][] }|null} null if room or player not found
 */
function generateCard(code, playerName) {
  const room = rooms.get(code);
  if (!room) return null;

  const player = room.players.find((p) => p.name === playerName);
  if (!player) return null;

  if (player.card) return player.card;

  const pool = CALLS_BY_THEME[room.themeId] || CALLS_BY_THEME.office;

  const existingKeys = new Set(
    room.players
      .filter((p) => p.card)
      .map((p) => p.card.grid.flat().join('|'))
  );

  let grid;
  let attempts = 0;
  do {
    const picks = shuffle(pool).slice(0, 25);
    grid = [picks.slice(0, 5), picks.slice(5, 10), picks.slice(10, 15), picks.slice(15, 20), picks.slice(20, 25)];
    attempts += 1;
  } while (existingKeys.has(grid.flat().join('|')) && attempts < 100);

  player.card = { grid };
  room.lastActivityAt = new Date();
  return player.card;
}

/**
 * Broadcast a JSON payload to all OPEN clients in the room.
 * @param {string} code
 * @param {object} payload
 */
function broadcastToRoom(code, payload) {
  const room = rooms.get(code);
  if (!room) return;
  const message = JSON.stringify(payload);
  for (const client of room.clients) {
    if (client.readyState === 1 /* WebSocket.OPEN */) {
      client.send(message);
    }
  }
}

/**
 * Delete rooms that are expired (>2h inactive) or ended.
 * Called on a background interval every 5 minutes.
 */
function pruneExpiredRooms() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  for (const [code, room] of rooms) {
    if (room.phase === 'ended' || room.lastActivityAt < twoHoursAgo) {
      rooms.delete(code);
    }
  }
}

// Run expiry cleanup every 5 minutes
setInterval(pruneExpiredRooms, 5 * 60 * 1000);

/**
 * Find a player entry in a room by name.
 * @param {string} code
 * @param {string} playerName
 * @returns {object|null}
 */
function getPlayer(code, playerName) {
  const room = rooms.get(code);
  if (!room) return null;
  return room.players.find(p => p.name === playerName) || null;
}

module.exports = {
  rooms,
  generateCode,
  createRoom,
  getRoom,
  touchRoom,
  joinRoom,
  savePlayerCard,
  getPlayerCard,
  nextCall,
  generateCard,
  getRoomState,
  addClient,
  removeClient,
  broadcastToRoom,
  generateCard,
  validateClaim,
  pruneExpiredRooms,
  getPlayer,
};
