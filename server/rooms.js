const { customAlphabet } = require('nanoid');
const themes = require('./themes');

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const generateCode = customAlphabet(CODE_ALPHABET, 6);

/** @type {Map<string, object>} */
const rooms = new Map();

/**
 * Generate a unique 6-char alphanumeric room code (A-Z0-9).
 * Retries on collision.
 */
function createUniqueCode() {
  let code;
  do {
    code = generateCode();
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
 * @param {string|{hostName:string,themeId?:string}} hostNameOrOpts
 * @param {string} [themeId]
 * @returns {object} The created room
 */
function createRoom(hostNameOrOpts, themeId) {
  // Support both createRoom('Alice','t1') and createRoom({hostName:'Alice',themeId:'t1'})
  let hostName;
  if (typeof hostNameOrOpts === 'object') {
    ({ hostName, themeId } = hostNameOrOpts);
  } else {
    hostName = hostNameOrOpts;
  }

  const code = createUniqueCode();
  const now = new Date();

  const themeData = themeId ? themes.getTheme(themeId) : null;
  const callPool = themeData ? themeData.calls : [];

  const room = {
    code,
    hostName,
    themeId: themeId || null,
    players: [],
    createdAt: now,
    lastActivityAt: now,
    phase: 'lobby',
    callQueue: shuffle(callPool),
    calledItems: [],
    isCalling: false,
    callerInterval: 10,
    clients: new Set(),
  };
  rooms.set(code, room);
  return room;
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
  room.players.push({ name: playerName, joinedAt: new Date() });
  room.lastActivityAt = new Date();
  return room;
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

module.exports = {
  rooms,
  createRoom,
  getRoom,
  touchRoom,
  joinRoom,
  nextCall,
  getRoomState,
  addClient,
  removeClient,
  broadcastToRoom,
};
