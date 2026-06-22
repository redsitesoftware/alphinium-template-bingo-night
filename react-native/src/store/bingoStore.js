/**
 * bingoStore.js — Bingo Night game state
 * Zustand store. Full 5x5 bingo card, WebSocket caller, dauber marking.
 */
import { create } from 'zustand';

// In deployed (non-localhost) browser environments, fall back to the page's own origin
// so that WS connections work even when EXPO_PUBLIC_WS_HOST was not injected at build time.
const _envHost = process.env.EXPO_PUBLIC_WS_HOST;
const SERVER_HOST = _envHost ||
  (typeof window !== 'undefined' &&
   !window.location.hostname.startsWith('localhost') &&
   !window.location.hostname.startsWith('127.')
    ? window.location.host
    : 'localhost:3001');
// Use secure WebSocket for non-localhost hosts (deployed pods run behind HTTPS)
const WS_PROTOCOL = (SERVER_HOST.startsWith('localhost') || SERVER_HOST.startsWith('127.')) ? 'ws' : 'wss';

// --- Themed bingo call sets ---
export const THEMES = [
  { id: 'office',    label: 'Office Life',    emoji: '💼' },
  { id: 'xmas',      label: 'Christmas',      emoji: '🎄' },
  { id: 'aussie',    label: 'Aussie Slang',   emoji: '🦘' },
  { id: 'tech',      label: 'Tech Buzzwords', emoji: '🤖' },
  { id: 'classic',   label: 'Classic Bingo',  emoji: '🎱' },
];

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
    'She\'ll be right', 'Crikey', 'Strewth', 'Reckon', 'Thongs',
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
  classic: [
    ...Array.from({ length: 30 }, (_, i) => {
      const n = i + 1;
      const calls = [
        `One! Number one — Kelly's eye!`, `Two — one little duck!`,
        `Three — cup of tea!`, `Four — knock at the door!`,
        `Five — man alive!`, `Six — half a dozen!`,
        `Seven — lucky seven!`, `Eight — one fat lady!`,
        `Nine — doctor's orders!`, `Ten — (Prime Minister's) den!`,
        `Eleven — legs eleven!`, `Twelve — one dozen!`,
        `Thirteen — unlucky for some!`, `Fourteen — valentines day!`,
        `Fifteen — young and keen!`, `Sixteen — sweet sixteen!`,
        `Seventeen — dancing queen!`, `Eighteen — coming of age!`,
        `Nineteen — goodbye teens!`, `Twenty — one score!`,
        `Twenty-one — key of the door!`, `Twenty-two — two little ducks!`,
        `Twenty-three — thee and me!`, `Twenty-four — two dozen!`,
        `Twenty-five — duck and dive!`, `Twenty-six — pick and mix!`,
        `Twenty-seven — gateway to heaven!`, `Twenty-eight — overweight!`,
        `Twenty-nine — rise and shine!`, `Thirty — Burlington Bertie!`,
      ];
      return calls[i] || `Number ${n}!`;
    }),
  ],
};

// Generate a random 5x5 bingo card for a given theme
function generateCard(themeId) {
  const pool = [...(CALLS_BY_THEME[themeId] || CALLS_BY_THEME.office)];
  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // 5x5 = 25 squares; center is FREE
  const squares = pool.slice(0, 24);
  squares.splice(12, 0, 'FREE');  // insert FREE in center
  return squares;
}

// Check win conditions (lines + diagonals + corners + full house)
function checkWin(marked, card) {
  const grid = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => marked.has(r * 5 + c) || card[r * 5 + c] === 'FREE')
  );

  const wins = [];
  // Rows
  for (let r = 0; r < 5; r++) {
    if (grid[r].every(Boolean)) wins.push(`Row ${r + 1}`);
  }
  // Columns
  for (let c = 0; c < 5; c++) {
    if (grid.every(row => row[c])) wins.push(`Column ${c + 1}`);
  }
  // Diagonals
  if ([0,1,2,3,4].every(i => grid[i][i])) wins.push('Diagonal');
  if ([0,1,2,3,4].every(i => grid[i][4-i])) wins.push('Diagonal');
  // Full house
  if (grid.flat().every(Boolean)) wins.push('FULL HOUSE');
  return wins;
}

export const useBingoStore = create((set, get) => ({
  // Session
  phase: 'home',          // home | setup | card | calling | win | fullhouse
  themeId: 'office',
  dauberColor: '#EF4444',
  playerName: '',
  sessionCode: '',
  isHost: false,

  // Card
  card: [],               // 25 strings
  marked: new Set(),      // indices of daubed squares
  wins: [],               // array of win descriptions

  // Calling
  calledItems: [],        // items called so far (most recent last)
  callQueue: [],          // remaining items to call
  isCalling: false,
  callInterval: null,

  // WebSocket
  ws: null,
  wsConnected: false,

  // Actions
  setTheme: (themeId) => set({ themeId }),
  setDauber: (color) => set({ dauberColor: color }),
  setPlayerName: (name) => set({ playerName: name }),

  startAsHost: (name, themeId) => {
    const code = Math.random().toString(36).substr(2, 4).toUpperCase();
    const card = generateCard(themeId);
    const pool = [...(CALLS_BY_THEME[themeId] || CALLS_BY_THEME.office)];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    set({
      phase: 'card',
      isHost: true,
      playerName: name,
      sessionCode: code,
      themeId,
      card,
      marked: new Set([12]), // FREE center
      wins: [],
      calledItems: [],
      callQueue: pool,
      isCalling: false,
    });
    get().connectWS(code, name);
  },

  joinAsPlayer: (code, name, themeId) => {
    const card = generateCard(themeId);
    set({
      phase: 'card',
      isHost: false,
      playerName: name,
      sessionCode: code.toUpperCase(),
      themeId,
      card,
      marked: new Set([12]),
      wins: [],
      calledItems: [],
      callQueue: [],
    });
    get().connectWS(code.toUpperCase(), name);
  },

  // WebSocket actions
  connectWS: (code, playerName) => {
    const { ws: existing } = get();
    if (existing) {
      existing.onopen = null;
      existing.onmessage = null;
      existing.onclose = null;
      existing.onerror = null;
      existing.close();
    }

    // Connect via /rooms — nginx proxies this path to the Node.js server in both single and two-pod mode
    const ws = new WebSocket(`${WS_PROTOCOL}://${SERVER_HOST}/rooms`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join-room', payload: { code, playerName } }));
      set({ wsConnected: true });
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'room-state':
          set({
            calledItems: msg.calledItems ?? [],
            callQueue: msg.callQueue ?? [],
          });
          break;

        case 'number-called':
          set({
            calledItems: msg.calledItems ?? [...get().calledItems, msg.item],
            callQueue: Array(msg.callQueueLength ?? 0).fill(null),
          });
          break;

        case 'game-ended':
          set({
            phase: 'ended',
            calledItems: msg.calledItems ?? get().calledItems,
            callQueue: [],
            isCalling: false,
          });
          break;

        default:
          break;
      }
    };

    ws.onclose = () => {
      set({ wsConnected: false });
    };

    ws.onerror = () => {
      set({ wsConnected: false });
    };

    set({ ws });
  },

  disconnectWS: () => {
    const { ws } = get();
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
    }
    set({ ws: null, wsConnected: false });
  },

  // Daub a square
  daubeSquare: (index) => {
    const { marked, card, calledItems, wins: prevWins } = get();
    // Only allow daubing called items (or FREE)
    const item = card[index];
    if (item !== 'FREE' && !calledItems.includes(item)) return;
    if (marked.has(index)) return;

    const newMarked = new Set(marked);
    newMarked.add(index);

    const newWins = checkWin(newMarked, card);
    const isFullHouse = newWins.includes('FULL HOUSE');
    const hasNewWin = newWins.length > prevWins.length;

    set({
      marked: newMarked,
      wins: newWins,
      phase: isFullHouse ? 'fullhouse' : hasNewWin ? 'win' : get().phase,
    });
  },

  // Call next item (host action)
  callNext: () => {
    const { callQueue, calledItems } = get();
    if (callQueue.length === 0) return null;
    const [next, ...rest] = callQueue;
    set({
      calledItems: [...calledItems, next],
      callQueue: rest,
    });
    return next;
  },

  startAutoCalling: () => {
    set({ isCalling: true });
  },

  stopAutoCalling: () => {
    set({ isCalling: false });
  },

  continueAfterWin: () => set({ phase: 'calling' }),

  resetGame: () => {
    get().disconnectWS();
    set({
      phase: 'home',
      card: [],
      marked: new Set(),
      wins: [],
      calledItems: [],
      callQueue: [],
      isCalling: false,
      sessionCode: '',
    });
  },
}));
