const { customAlphabet } = require('nanoid');

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
 * Create a new room and store it.
 * @param {string} hostName
 * @param {string} themeId
 * @returns {object} The created room
 */
function createRoom(hostName, themeId) {
  const code = createUniqueCode();
  const now = new Date();
  const room = {
    code,
    hostName,
    themeId,
    players: [],
    createdAt: now,
    lastActivityAt: now,
    phase: 'lobby',
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

module.exports = { rooms, createRoom, getRoom, joinRoom };
