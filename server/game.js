/**
 * game.js — WebSocket game event handlers for Bingo Night.
 *
 * Export: registerGameHandlers(wss, rooms)
 * Called from index.js after the WebSocket server is created.
 */

const { getRoom, addClient, removeClient, broadcastToRoom, nextCall, getRoomState, getPlayer, getPlayerCard, savePlayerCard } = require('./rooms');
const { saveGame } = require('./gameHistory');
const { validateClaim } = require('./winLogic');

/** @type {Map<string, ReturnType<typeof setInterval>>} */
const autoCallers = new Map();

/**
 * Pop the next call, broadcast number-called, and handle game-ended.
 * @param {string} code  Room code (already uppercased)
 */
function callNumber(code) {
  const item = nextCall(code);
  if (item === null) return; // queue already empty

  const room = getRoom(code);
  if (!room) return;

  broadcastToRoom(code, {
    type: 'number-called',
    item,
    calledItems: room.calledItems,
    callQueueLength: room.callQueue.length,
  });

  if (room.callQueue.length === 0) {
    broadcastToRoom(code, { type: 'game-ended', calledItems: room.calledItems });
    stopAutoCallerForRoom(code);
    saveGame({
      code,
      players: room.players.map(p => p.name),
      calledItems: room.calledItems,
      winners: room.winners || [],
      startedAt: room.createdAt,
      endedAt: new Date(),
    });
  }
}

/**
 * Clear the auto-caller interval for a room, if one is running.
 * @param {string} code
 */
function stopAutoCallerForRoom(code) {
  if (autoCallers.has(code)) {
    clearInterval(autoCallers.get(code));
    autoCallers.delete(code);
    const room = getRoom(code);
    if (room) room.isCalling = false;
  }
}

/**
 * Register all WebSocket message handlers on the given wss instance.
 * @param {import('ws').WebSocketServer} wss
 */
function registerGameHandlers(wss) {
  wss.on('connection', (ws) => {
    let playerCode = null;
    let playerName = null;

    ws.on('message', (data) => {
      let msg;
      try {
        msg = JSON.parse(data);
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        return;
      }

      const { type, payload = {} } = msg;

      switch (type) {
        case 'join-room': {
          const code = payload.code?.toUpperCase();
          const name = payload.playerName;

          const room = getRoom(code);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            return;
          }

          playerCode = code;
          playerName = name;
          addClient(code, ws);

          // Register player if not already present (host joins without a players entry)
          if (name && name !== room.hostName) {
            const existing = getPlayer(code, name);
            if (!existing) {
              room.players.push({ name, joinedAt: new Date() });
            } else if (existing.disconnectedAt) {
              // Player reconnecting — clear the disconnect timestamp and notify the room
              delete existing.disconnectedAt;
              broadcastToRoom(code, { type: 'player-reconnected', playerName: name });
            }
          }

          broadcastToRoom(code, { type: 'room-state', ...getRoomState(code) });

          // If rejoining player has a stored card, send it back to them only
          const storedCard = name ? getPlayerCard(code, name) : null;
          if (storedCard) {
            ws.send(JSON.stringify({ type: 'player-card-restore', playerCard: storedCard }));
          }
          break;
        }

        case 'save-card': {
          const code = payload.code?.toUpperCase();
          const card = payload.card;

          if (!Array.isArray(card) || card.length !== 25) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid card: must be a 25-element array' }));
            return;
          }

          const saved = savePlayerCard(code, playerName, card);
          if (!saved) {
            ws.send(JSON.stringify({ type: 'error', message: 'Could not save card — room or player not found' }));
          }
          break;
        }

        case 'call-number': {
          const code = payload.code?.toUpperCase();
          const room = getRoom(code);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            return;
          }
          if (playerName !== room.hostName) {
            ws.send(JSON.stringify({ type: 'error', message: 'Only the host can call numbers' }));
            return;
          }
          callNumber(code);
          break;
        }

        case 'start-auto-caller': {
          const code = payload.code?.toUpperCase();
          const room = getRoom(code);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            return;
          }
          if (playerName !== room.hostName) {
            ws.send(JSON.stringify({ type: 'error', message: 'Only the host can start the auto-caller' }));
            return;
          }

          // Clear any existing timer before starting a new one
          stopAutoCallerForRoom(code);

          // Clamp interval to 5–60 s; fall back to room.callerInterval if not provided
          const raw = typeof payload.interval === 'number' ? payload.interval : room.callerInterval;
          const intervalSec = Math.min(60, Math.max(5, raw));
          room.callerInterval = intervalSec;

          room.isCalling = true;
          const timerId = setInterval(() => callNumber(code), intervalSec * 1000);
          autoCallers.set(code, timerId);

          broadcastToRoom(code, { type: 'caller-state', isCalling: true, callerInterval: intervalSec });
          break;
        }

        case 'stop-auto-caller': {
          const code = payload.code?.toUpperCase();
          const room = getRoom(code);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            return;
          }
          if (playerName !== room.hostName) {
            ws.send(JSON.stringify({ type: 'error', message: 'Only the host can stop the auto-caller' }));
            return;
          }
          stopAutoCallerForRoom(code);
          broadcastToRoom(code, { type: 'caller-state', isCalling: false, callerInterval: room.callerInterval });
          break;
        }

        case 'skip-call': {
          const code = payload.code?.toUpperCase();
          const room = getRoom(code);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            return;
          }
          if (playerName !== room.hostName) {
            ws.send(JSON.stringify({ type: 'error', message: 'Only the host can skip the current call' }));
            return;
          }

          // Fire the next item immediately
          callNumber(code);

          // If auto-caller is active, clear and restart the timer to reset the interval clock
          if (autoCallers.has(code)) {
            clearInterval(autoCallers.get(code));
            autoCallers.delete(code);
            const intervalSec = room.callerInterval;
            const newTimerId = setInterval(() => callNumber(code), intervalSec * 1000);
            autoCallers.set(code, newTimerId);
            broadcastToRoom(code, { type: 'caller-state', isCalling: true, callerInterval: intervalSec });
          }
          break;
        }

        case 'claim-bingo': {
          const code = payload.code?.toUpperCase();
          const claimType = payload.claimType; // 'line' or 'full-house'
          const room = getRoom(code);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            return;
          }
          const player = getPlayer(code, playerName);
          const card = player?.card;
          if (!card) {
            ws.send(JSON.stringify({ type: 'error', message: 'No card found — save your card first' }));
            return;
          }
          // Card saved as flat 25-element array; validateClaim expects 5x5 grid
          const grid = Array.isArray(card[0])
            ? card
            : [card.slice(0,5), card.slice(5,10), card.slice(10,15), card.slice(15,20), card.slice(20,25)];
          const result = validateClaim(grid, room.calledItems, claimType || 'line');
          if (result.valid) {
            if (!room.winners) room.winners = [];
            room.winners.push({ playerName, winType: claimType, pattern: result.pattern });
            broadcastToRoom(code, {
              type: 'winner-announced',
              winnerName: playerName,
              winType: claimType,
              prize: room.prize || '',
            });
          } else {
            ws.send(JSON.stringify({ type: 'claim-rejected', message: 'Claim not valid' }));
          }
          break;
        }

        default:
          ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${type}` }));
      }
    });

    ws.on('close', () => {
      if (!playerCode) return;
      removeClient(playerCode, ws);

      const room = getRoom(playerCode);
      if (room) {
        if (room.clients.size === 0) {
          stopAutoCallerForRoom(playerCode);
        }

        // Mark the player as disconnected and notify remaining clients
        if (playerName) {
          const player = getPlayer(playerCode, playerName);
          if (player) {
            player.disconnectedAt = new Date();
            broadcastToRoom(playerCode, { type: 'player-disconnected', playerName });
          }
        }
      }
    });
  });
}

module.exports = { registerGameHandlers };
