/**
 * bingoStore.js — Bingo Night game state
 * Zustand store. Full 5x5 bingo card, WebSocket caller, dauber marking.
 */
import { create } from 'zustand';
import { playCallAudio } from '../services/AudioService';

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
const HTTP_PROTOCOL = WS_PROTOCOL === 'wss' ? 'https' : 'http';
// Exported so AudioService callers can reference it without duplicating the derivation logic
export const SERVER_BASE_URL = `${HTTP_PROTOCOL}://${SERVER_HOST}`;
const THEMES_API_URL = `${HTTP_PROTOCOL}://${SERVER_HOST}/themes`;

// Persist audioMuted to localStorage (web) so the preference survives page reloads
const AUDIO_MUTED_KEY = 'bingoNight_audioMuted';
function loadAudioMuted() {
  try {
    return localStorage.getItem(AUDIO_MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}
function saveAudioMuted(value) {
  try {
    localStorage.setItem(AUDIO_MUTED_KEY, String(value));
  } catch {
    // localStorage unavailable (e.g. native) — skip
  }
}

// Fallback theme list displayed when the server is unreachable
const FALLBACK_THEMES = [
  { id: 'office',  name: 'Office Life',    emoji: '💼' },
  { id: 'xmas',    name: 'Christmas',      emoji: '🎄' },
  { id: 'aussie',  name: 'Aussie Slang',   emoji: '🦘' },
  { id: 'tech',    name: 'Tech Buzzwords', emoji: '🤖' },
  { id: 'classic', name: 'Classic Bingo',  emoji: '🎱' },
];

// Minimal call pools used only when the server is unreachable and a card must be generated
const _FALLBACK_CALLS = {
  office: [
    'Synergy!', 'Circle back', 'Move the needle', 'Boil the ocean', 'Low-hanging fruit',
    'Deep dive', 'Pivot!', 'Blue sky thinking', 'Bandwidth', 'Take it offline',
    'Disruptive', 'Scalable solution', 'Touch base', 'Action items', 'Game changer',
    'Value add', 'Pain points', 'Drill down', 'Going forward', 'Leveraging',
    'Agile mindset', 'KPI', 'ROI focus', 'Stakeholder buy-in', 'Quick win',
  ],
};

/** Fetch calls for a single theme from the server. Returns null on failure. */
async function fetchThemeCalls(themeId) {
  try {
    const res = await fetch(`${THEMES_API_URL}/${themeId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.calls) && data.calls.length >= 24 ? data.calls : null;
  } catch {
    return null;
  }
}

// Generate a random 5x5 bingo card from a call pool array
function generateCard(calls) {
  const pool = [...calls];
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
  phase: 'home',          // home | setup | card | calling | win | fullhouse | spectating
  themeId: 'office',
  dauberColor: '#EF4444',
  playerName: '',
  sessionCode: '',
  isHost: false,
  isSpectator: false,

  // Themes (fetched from server)
  themes: FALLBACK_THEMES,
  themesLoading: false,

  // Card
  card: [],               // 25 strings
  marked: new Set(),      // indices of daubed squares
  wins: [],               // array of win descriptions

  // Calling
  calledItems: [],        // items called so far (most recent last)
  callQueue: [],          // remaining items to call
  isCalling: false,
  callInterval: null,
  callerInterval: 10,     // seconds between auto-calls (synced from server)

  // Audio
  audioMuted: loadAudioMuted(),

  // WebSocket
  ws: null,
  wsConnected: false,
  isReconnecting: false,

  // Actions
  setTheme: (themeId) => set({ themeId }),
  setDauber: (color) => set({ dauberColor: color }),
  setPlayerName: (name) => set({ playerName: name }),
  toggleAudioMuted: () => {
    const next = !get().audioMuted;
    saveAudioMuted(next);
    set({ audioMuted: next });
  },

  /** Fetch theme list from the server. Falls back to FALLBACK_THEMES on error. */
  fetchThemes: async () => {
    set({ themesLoading: true });
    try {
      const res = await fetch(THEMES_API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const themes = await res.json();
      if (Array.isArray(themes) && themes.length > 0) {
        set({ themes, themesLoading: false });
        return;
      }
      throw new Error('Empty theme list');
    } catch (err) {
      console.warn('[bingoStore] fetchThemes failed, using fallback:', err.message);
      set({ themes: FALLBACK_THEMES, themesLoading: false });
    }
  },

  startAsHost: async (name, themeId) => {
    const code = Math.random().toString(36).substr(2, 4).toUpperCase();
    const calls = (await fetchThemeCalls(themeId)) || _FALLBACK_CALLS.office;
    const card = generateCard(calls);
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
      callQueue: [],
      isCalling: false,
    });
    get().connectWS(code, name);
  },

  joinAsSpectator: (code) => {
    set({
      phase: 'spectating',
      isHost: false,
      isSpectator: true,
      playerName: '',
      sessionCode: code.toUpperCase(),
      card: [],
      marked: new Set(),
      wins: [],
      calledItems: [],
      callQueue: [],
      isCalling: false,
    });
  },

  joinAsPlayer: async (code, name, themeId) => {
    const calls = (await fetchThemeCalls(themeId)) || _FALLBACK_CALLS.office;
    const card = generateCard(calls);
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
  _intentionalClose: false,
  _reconnectDelay: 1000,
  _reconnectTimer: null,

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
      const { card } = get();
      set({ wsConnected: true, isReconnecting: false, _reconnectDelay: 1000 });
      ws.send(JSON.stringify({ type: 'join-room', payload: { code, playerName } }));
      if (card && card.length > 0) {
        ws.send(JSON.stringify({ type: 'save-card', payload: { code, playerName, card } }));
      }
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
            isCalling: msg.isCalling ?? get().isCalling,
            callerInterval: msg.callerInterval ?? get().callerInterval,
            // Restore card from server on reconnect path; keep local card otherwise
            ...(msg.playerCard && msg.playerCard.length > 0 ? { card: msg.playerCard } : {}),
          });
          break;

        case 'caller-state':
          set({ isCalling: msg.isCalling, callerInterval: msg.callerInterval });
          break;

        case 'number-called': {
          const newItem = msg.item;
          set({
            calledItems: msg.calledItems ?? [...get().calledItems, newItem],
            callQueue: Array(msg.callQueueLength ?? 0).fill(null),
          });
          // Play audio only for active players (not spectators, not pre-deal)
          const { isSpectator, card, audioMuted } = get();
          if (!isSpectator && card.length > 0 && newItem) {
            playCallAudio(newItem, SERVER_BASE_URL, audioMuted);
          }
          break;
        }

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
      if (get()._intentionalClose) return;

      // Unexpected disconnect — schedule exponential backoff reconnect
      const delay = get()._reconnectDelay;
      set({ isReconnecting: true });
      const timer = setTimeout(() => {
        if (!get()._intentionalClose) {
          const nextDelay = Math.min(delay * 2, 30000);
          set({ _reconnectDelay: nextDelay, _reconnectTimer: null });
          get().connectWS(code, playerName);
        }
      }, delay);
      set({ _reconnectTimer: timer });
    };

    ws.onerror = () => {
      set({ wsConnected: false });
    };

    set({ ws, _intentionalClose: false });
  },

  disconnectWS: () => {
    const { ws, _reconnectTimer } = get();
    // Signal onclose not to retry before closing
    set({ _intentionalClose: true, isReconnecting: false });
    if (_reconnectTimer) {
      clearTimeout(_reconnectTimer);
      set({ _reconnectTimer: null });
    }
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
      isSpectator: false,
    });
  },
}));
