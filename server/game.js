/**
 * game.js — WebSocket game event handlers for Bingo Night.
 *
 * Export: registerGameHandlers(wss, rooms)
 * Called from index.js after the WebSocket server is created.
 */

const { getRoom, addClient, removeClient, broadcastToRoom, nextCall, getRoomState, getPlayer } = require('./rooms');

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

          const intervalSec = typeof payload.interval === 'number' && payload.interval > 0
            ? payload.interval
            : room.callerInterval;

          room.isCalling = true;
          const timerId = setInterval(() => callNumber(code), intervalSec * 1000);
          autoCallers.set(code, timerId);
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
