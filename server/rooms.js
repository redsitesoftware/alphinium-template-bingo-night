const { customAlphabet } = require('nanoid');
const { WebSocket } = require('ws');

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const generateCode = customAlphabet(CODE_ALPHABET, 6);

/** @type {Map<string, object>} */
const rooms = new Map();

const CALLS_BY_THEME = {
  office: [
    'Synergy!', 'Circle back', 'Move the needle', 'Boil the ocean', 'Low-hanging fruit',
    'Deep dive', 'Pivot!', 'Blue sky thinking', 'Bandwidth', 'Take it offline',
    'Disruptive', 'Scalable solution', 'Touch base', 'Action items', 'Game changer',
    'Value add', 'Pain points', 'Drill down', 'Going forward', 'Leveraging',
    'Agile mindset', 'KPI', 'ROI focus', 'Stakeholder buy-in', 'Quick win',
    'Paradigm shift', 'Core competency', 'Thought leader', 'Ecosystem', 'Innovation hub',
  ],
  xmas: [
    'Santa Claus', 'Reindeer', 'Mistletoe', 'Eggnog', 'Stocking',
    'Gingerbread', 'Tinsel', 'Candy cane', 'Snowflake', 'Elf on the shelf',
    'Christmas tree', 'Jingle bells', 'Wrapping paper', 'Secret Santa', 'Mulled wine',
    'Nativity', 'Boxing Day', 'Turkey dinner', 'Crackers', 'Carol singing',
    'Baubles', 'Star on top', 'Ugly jumper', 'White Christmas', 'Naughty list',
    'Coal in stocking', 'Ho ho ho', 'Chimney', 'Sleigh bells', 'North Pole',
  ],
  aussie: [
    "G'day mate", 'Arvo', 'Servo', 'Brekkie', 'No worries',
    "She'll be right", 'Crikey', 'Strewth', 'Reckon', 'Thongs',
    'Sunnies', 'Bikkie', 'Ute', 'Barbie', 'Snag',
    'Dead set', 'Fair dinkum', 'Ripper', 'Drongo', 'Larrikin',
    'Dingo', 'Billabong', 'Bush tucker', 'Goon bag', 'Flat white',
    'Dag', 'Dropbear', 'Maccas', 'Bottle-o', 'Smoko',
  ],
  tech: [
    'Blockchain', 'AI/ML', 'Cloud native', 'DevOps', 'Kubernetes',
    'Microservices', 'API-first', 'Zero trust', 'LLM', 'Prompt engineer',
    'Digital twin', 'Edge computing', 'Serverless', 'Observability', 'GitOps',
    'Tech debt', 'Rubber duck', 'Stack overflow', 'npm install', 'It works locally',
    'Ship it', '10x engineer', 'Move fast', 'Agile sprint', 'Standup',
    'Pull request', 'Code review', 'Hot reload', 'Type safety', 'Ship or skip',
  ],
  classic: Array.from({ length: 30 }, (_, i) => {
    const calls = [
      "One! Number one — Kelly's eye!", 'Two — one little duck!',
      'Three — cup of tea!', 'Four — knock at the door!',
      'Five — man alive!', 'Six — half a dozen!',
      'Seven — lucky seven!', 'Eight — one fat lady!',
      "Nine — doctor's orders!", "Ten — (Prime Minister's) den!",
      'Eleven — legs eleven!', 'Twelve — one dozen!',
      'Thirteen — unlucky for some!', 'Fourteen — valentines day!',
      'Fifteen — young and keen!', 'Sixteen — sweet sixteen!',
      'Seventeen — dancing queen!', 'Eighteen — coming of age!',
      'Nineteen — goodbye teens!', 'Twenty — one score!',
      'Twenty-one — key of the door!', 'Twenty-two — two little ducks!',
      'Twenty-three — thee and me!', 'Twenty-four — two dozen!',
      'Twenty-five — duck and dive!', 'Twenty-six — pick and mix!',
      'Twenty-seven — gateway to heaven!', 'Twenty-eight — overweight!',
      'Twenty-nine — rise and shine!', 'Thirty — Burlington Bertie!',
    ];
    return calls[i] || `Number ${i + 1}!`;
  }),
};

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
  const pool = CALLS_BY_THEME[themeId] || CALLS_BY_THEME.office;
  const room = {
    code,
    hostName,
    themeId,
    players: [],
    createdAt: now,
    lastActivityAt: now,
    phase: 'lobby',
    callQueue: shuffled(pool),
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

/**
 * Pop the next item from callQueue into calledItems.
 * @param {string} code
 * @returns {string|null} The called item, or null if queue is empty
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
 * Return a serialisable snapshot of the room (excludes clients Set).
 * @param {string} code
 * @returns {object|null}
 */
function getRoomState(code) {
  const room = rooms.get(code);
  if (!room) return null;
  const { clients, ...state } = room;
  return state;
}

/**
 * Add a WebSocket client to a room's client set.
 * @param {string} code
 * @param {WebSocket} ws
 */
function addClient(code, ws) {
  const room = rooms.get(code);
  if (room) room.clients.add(ws);
}

/**
 * Remove a WebSocket client from a room's client set.
 * @param {string} code
 * @param {WebSocket} ws
 */
function removeClient(code, ws) {
  const room = rooms.get(code);
  if (room) room.clients.delete(ws);
}

/**
 * Broadcast a JSON payload to all OPEN clients in a room.
 * @param {string} code
 * @param {object} payload
 */
function broadcastToRoom(code, payload) {
  const room = rooms.get(code);
  if (!room) return;
  const message = JSON.stringify(payload);
  for (const client of room.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

module.exports = { rooms, createRoom, getRoom, joinRoom, nextCall, getRoomState, addClient, removeClient, broadcastToRoom };
