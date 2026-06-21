// In-memory room store and data model

const ROOM_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;  // 5 minutes
const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;

/** @type {Map<string, object>} */
const rooms = new Map();

function generateCode() {
  let code;
  do {
    code = Array.from({ length: CODE_LENGTH }, () =>
      CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    ).join('');
  } while (rooms.has(code));
  return code;
}

function createRoom({ hostName, themeId = null }) {
  const now = new Date();
  const room = {
    code: generateCode(),
    hostName,
    themeId,
    players: [],
    createdAt: now,
    lastActivityAt: now,
    phase: 'lobby',
  };
  rooms.set(room.code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(code.toUpperCase()) || null;
}

function touchRoom(room) {
  room.lastActivityAt = new Date();
}

// Background expiry: remove rooms inactive >2h or phase=ended
setInterval(() => {
  const cutoff = Date.now() - ROOM_EXPIRY_MS;
  for (const [code, room] of rooms) {
    if (room.lastActivityAt.getTime() < cutoff || room.phase === 'ended') {
      rooms.delete(code);
    }
  }
}, CLEANUP_INTERVAL_MS);

module.exports = { createRoom, getRoom, touchRoom };
