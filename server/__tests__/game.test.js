'use strict';

const http = require('http');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const { registerGameHandlers } = require('../game');
const { rooms, createRoom } = require('../rooms');

// ─── Test server setup ───────────────────────────────────────────────────────

let server;
let serverUrl;
const openClients = [];

beforeAll((done) => {
  const app = express();
  server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  registerGameHandlers(wss);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    serverUrl = `ws://127.0.0.1:${port}`;
    done();
  });
});

afterAll((done) => {
  server.close(done);
});

beforeEach(() => {
  rooms.clear();
  openClients.length = 0;
});

afterEach(async () => {
  await Promise.all(openClients.map((c) => c.close()));
});

// ─── WS client helper ────────────────────────────────────────────────────────

function createTestClient() {
  const ws = new WebSocket(serverUrl);
  const queue = [];
  const waiters = [];

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (waiters.length > 0) {
      waiters.shift()(msg);
    } else {
      queue.push(msg);
    }
  });

  /**
   * Resolve with the next incoming message, or reject after timeoutMs.
   * @param {number} [timeoutMs=2000]
   */
  function nextMessage(timeoutMs = 2000) {
    if (queue.length > 0) return Promise.resolve(queue.shift());
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`WS message timeout after ${timeoutMs}ms`)),
        timeoutMs,
      );
      waiters.push((msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
    });
  }

  function send(payload) {
    ws.send(JSON.stringify(payload));
  }

  function connected() {
    return new Promise((resolve, reject) => {
      if (ws.readyState === WebSocket.OPEN) { resolve(); return; }
      ws.once('open', resolve);
      ws.once('error', reject);
    });
  }

  function close() {
    return new Promise((resolve) => {
      if (ws.readyState === WebSocket.CLOSED) { resolve(); return; }
      ws.once('close', resolve);
      ws.close();
    });
  }

  const client = { ws, nextMessage, send, connected, close };
  openClients.push(client);
  return client;
}

/** Wait ms milliseconds. */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── join-room ───────────────────────────────────────────────────────────────

describe('join-room', () => {
  it('single client receives room-state with correct code, players, and calledItems', async () => {
    const room = createRoom('Alice', 'office');
    const client = createTestClient();
    await client.connected();

    client.send({ type: 'join-room', payload: { code: room.code, playerName: 'Bob' } });
    const msg = await client.nextMessage();

    expect(msg.type).toBe('room-state');
    expect(msg.code).toBe(room.code);
    expect(msg.players).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Bob' })]),
    );
    expect(Array.isArray(msg.calledItems)).toBe(true);
    expect(msg.calledItems).toHaveLength(0);
  });

  it('second client joining causes both clients to receive updated room-state', async () => {
    const room = createRoom('Alice', 'office');
    const host = createTestClient();
    const guest = createTestClient();
    await host.connected();
    await guest.connected();

    // Host joins (host name matches room.hostName — not added to players array)
    host.send({ type: 'join-room', payload: { code: room.code, playerName: 'Alice' } });
    await host.nextMessage(); // consume initial room-state broadcast

    // Guest joins — triggers broadcast to both clients
    guest.send({ type: 'join-room', payload: { code: room.code, playerName: 'Bob' } });

    const [hostMsg, guestMsg] = await Promise.all([
      host.nextMessage(),
      guest.nextMessage(),
    ]);

    for (const msg of [hostMsg, guestMsg]) {
      expect(msg.type).toBe('room-state');
      expect(msg.players).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'Bob' })]),
      );
    }
  });

  it('unknown room code causes client to receive an error message', async () => {
    const client = createTestClient();
    await client.connected();

    client.send({ type: 'join-room', payload: { code: 'XXXXXX', playerName: 'Ghost' } });
    const msg = await client.nextMessage();

    expect(msg.type).toBe('error');
    expect(msg.message).toMatch(/room not found/i);
  });
});

// ─── call-number ─────────────────────────────────────────────────────────────

describe('call-number', () => {
  it('host call-number broadcasts number-called to all room clients', async () => {
    const room = createRoom('Host', 'office');
    const host = createTestClient();
    const guest = createTestClient();
    await host.connected();
    await guest.connected();

    host.send({ type: 'join-room', payload: { code: room.code, playerName: 'Host' } });
    await host.nextMessage(); // room-state

    guest.send({ type: 'join-room', payload: { code: room.code, playerName: 'Guest' } });
    // Both receive room-state after guest joins
    await host.nextMessage();
    await guest.nextMessage();

    host.send({ type: 'call-number', payload: { code: room.code } });

    const [hostMsg, guestMsg] = await Promise.all([
      host.nextMessage(),
      guest.nextMessage(),
    ]);

    for (const msg of [hostMsg, guestMsg]) {
      expect(msg.type).toBe('number-called');
      expect(msg.item).toBeDefined();
      expect(Array.isArray(msg.calledItems)).toBe(true);
      expect(msg.calledItems).toHaveLength(1);
    }
  });

  it('non-host call-number receives error and does not broadcast to others', async () => {
    const room = createRoom('Host', 'office');
    const host = createTestClient();
    const nonHost = createTestClient();
    await host.connected();
    await nonHost.connected();

    host.send({ type: 'join-room', payload: { code: room.code, playerName: 'Host' } });
    await host.nextMessage(); // room-state

    nonHost.send({ type: 'join-room', payload: { code: room.code, playerName: 'NotHost' } });
    await host.nextMessage(); // room-state broadcast
    await nonHost.nextMessage(); // room-state

    nonHost.send({ type: 'call-number', payload: { code: room.code } });
    const errorMsg = await nonHost.nextMessage();

    expect(errorMsg.type).toBe('error');
    expect(errorMsg.message).toMatch(/host/i);

    // Host must NOT receive any number-called broadcast
    await expect(host.nextMessage(300)).rejects.toThrow('timeout');
  });
});

// ─── auto-caller ─────────────────────────────────────────────────────────────

describe('auto-caller', () => {
  it('start-auto-caller broadcasts caller-state with isCalling:true and the resolved interval', async () => {
    const room = createRoom('Host', 'office');
    const host = createTestClient();
    await host.connected();

    host.send({ type: 'join-room', payload: { code: room.code, playerName: 'Host' } });
    await host.nextMessage(); // room-state

    host.send({ type: 'start-auto-caller', payload: { code: room.code, interval: 10 } });
    const msg = await host.nextMessage(2000);

    expect(msg.type).toBe('caller-state');
    expect(msg.isCalling).toBe(true);
    expect(msg.callerInterval).toBe(10);
    expect(room.isCalling).toBe(true);
    expect(room.callerInterval).toBe(10);
  });

  it('stop-auto-caller broadcasts caller-state with isCalling:false and halts calling', async () => {
    const room = createRoom('Host', 'office');
    room.callQueue = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    room.calledItems = [];

    const host = createTestClient();
    await host.connected();

    host.send({ type: 'join-room', payload: { code: room.code, playerName: 'Host' } });
    await host.nextMessage(); // room-state

    host.send({ type: 'start-auto-caller', payload: { code: room.code, interval: 10 } });
    await host.nextMessage(2000); // caller-state (isCalling: true)

    host.send({ type: 'stop-auto-caller', payload: { code: room.code } });
    const stopMsg = await host.nextMessage(2000);

    expect(stopMsg.type).toBe('caller-state');
    expect(stopMsg.isCalling).toBe(false);
    expect(room.isCalling).toBe(false);

    const calledCountAfterStop = room.calledItems.length;
    await wait(500);
    expect(room.calledItems.length).toBe(calledCountAfterStop);
  });
});

// ─── interval validation ──────────────────────────────────────────────────────

describe('interval validation', () => {
  async function startAndGetCallerState(room, interval) {
    const host = createTestClient();
    await host.connected();
    host.send({ type: 'join-room', payload: { code: room.code, playerName: 'Host' } });
    await host.nextMessage(); // room-state
    host.send({ type: 'start-auto-caller', payload: { code: room.code, interval } });
    const msg = await host.nextMessage(2000);
    return { host, msg };
  }

  it('interval below 5 is clamped to 5', async () => {
    const room = createRoom('Host', 'office');
    const { msg } = await startAndGetCallerState(room, 3);

    expect(msg.type).toBe('caller-state');
    expect(msg.callerInterval).toBe(5);
    expect(room.callerInterval).toBe(5);
  });

  it('interval above 60 is clamped to 60', async () => {
    const room = createRoom('Host', 'office');
    const { msg } = await startAndGetCallerState(room, 120);

    expect(msg.type).toBe('caller-state');
    expect(msg.callerInterval).toBe(60);
    expect(room.callerInterval).toBe(60);
  });

  it('valid interval within 5–60 is preserved exactly', async () => {
    const room = createRoom('Host', 'office');
    const { msg } = await startAndGetCallerState(room, 15);

    expect(msg.type).toBe('caller-state');
    expect(msg.callerInterval).toBe(15);
    expect(room.callerInterval).toBe(15);
  });

  it('missing interval falls back to room.callerInterval', async () => {
    const room = createRoom('Host', 'office');
    room.callerInterval = 20;

    const host = createTestClient();
    await host.connected();
    host.send({ type: 'join-room', payload: { code: room.code, playerName: 'Host' } });
    await host.nextMessage(); // room-state

    // Send start-auto-caller with no interval field
    host.send({ type: 'start-auto-caller', payload: { code: room.code } });
    const msg = await host.nextMessage(2000);

    expect(msg.type).toBe('caller-state');
    expect(msg.callerInterval).toBe(20);
  });
});

// ─── skip-call ───────────────────────────────────────────────────────────────

describe('skip-call', () => {
  it('skip-call fires number-called immediately and resets the timer (broadcasts caller-state)', async () => {
    const room = createRoom('Host', 'office');
    room.callQueue = ['A', 'B', 'C', 'D', 'E'];
    room.calledItems = [];

    const host = createTestClient();
    const guest = createTestClient();
    await host.connected();
    await guest.connected();

    host.send({ type: 'join-room', payload: { code: room.code, playerName: 'Host' } });
    await host.nextMessage(); // room-state

    guest.send({ type: 'join-room', payload: { code: room.code, playerName: 'Guest' } });
    await host.nextMessage(); // room-state broadcast
    await guest.nextMessage(); // room-state

    // Start auto-caller
    host.send({ type: 'start-auto-caller', payload: { code: room.code, interval: 10 } });
    await host.nextMessage(2000); // caller-state (isCalling: true)
    await guest.nextMessage(2000); // caller-state (isCalling: true)

    const calledBefore = room.calledItems.length;

    // skip-call: should immediately fire number-called to all clients, then caller-state
    host.send({ type: 'skip-call', payload: { code: room.code } });

    const [hostNum, guestNum] = await Promise.all([
      host.nextMessage(2000),
      guest.nextMessage(2000),
    ]);
    expect(hostNum.type).toBe('number-called');
    expect(guestNum.type).toBe('number-called');
    expect(room.calledItems.length).toBe(calledBefore + 1);

    // caller-state should follow (timer was reset)
    const [hostState, guestState] = await Promise.all([
      host.nextMessage(2000),
      guest.nextMessage(2000),
    ]);
    expect(hostState.type).toBe('caller-state');
    expect(hostState.isCalling).toBe(true);
    expect(guestState.type).toBe('caller-state');
    expect(guestState.isCalling).toBe(true);
  });

  it('skip-call without active auto-caller fires number-called but does not send caller-state', async () => {
    const room = createRoom('Host', 'office');
    room.callQueue = ['A', 'B', 'C'];
    room.calledItems = [];

    const host = createTestClient();
    await host.connected();
    host.send({ type: 'join-room', payload: { code: room.code, playerName: 'Host' } });
    await host.nextMessage(); // room-state

    // skip-call when auto-caller is NOT running
    host.send({ type: 'skip-call', payload: { code: room.code } });
    const msg = await host.nextMessage(2000);

    expect(msg.type).toBe('number-called');
    expect(room.calledItems).toHaveLength(1);

    // No caller-state should follow
    await expect(host.nextMessage(300)).rejects.toThrow('timeout');
  });

  it('non-host skip-call receives error and does not trigger a call', async () => {
    const room = createRoom('Host', 'office');
    room.callQueue = ['A', 'B', 'C'];
    room.calledItems = [];

    const host = createTestClient();
    const nonHost = createTestClient();
    await host.connected();
    await nonHost.connected();

    host.send({ type: 'join-room', payload: { code: room.code, playerName: 'Host' } });
    await host.nextMessage(); // room-state

    nonHost.send({ type: 'join-room', payload: { code: room.code, playerName: 'Guest' } });
    await host.nextMessage(); // room-state broadcast
    await nonHost.nextMessage(); // room-state

    nonHost.send({ type: 'skip-call', payload: { code: room.code } });
    const errorMsg = await nonHost.nextMessage(2000);

    expect(errorMsg.type).toBe('error');
    expect(errorMsg.message).toMatch(/host/i);
    expect(room.calledItems).toHaveLength(0);
  });
});

// ─── game-ended ──────────────────────────────────────────────────────────────

describe('game-ended', () => {
  it('exhausting the call queue broadcasts game-ended to all room clients', async () => {
    const room = createRoom('Host', 'office');
    // Shorten queue so we can drain it quickly
    room.callQueue = ['Item1', 'Item2'];
    room.calledItems = [];

    const host = createTestClient();
    const guest = createTestClient();
    await host.connected();
    await guest.connected();

    host.send({ type: 'join-room', payload: { code: room.code, playerName: 'Host' } });
    await host.nextMessage(); // room-state

    guest.send({ type: 'join-room', payload: { code: room.code, playerName: 'Guest' } });
    await host.nextMessage(); // room-state broadcast after guest joins
    await guest.nextMessage(); // room-state

    // First call
    host.send({ type: 'call-number', payload: { code: room.code } });
    const call1Host = await host.nextMessage();
    const call1Guest = await guest.nextMessage();
    expect(call1Host.type).toBe('number-called');
    expect(call1Guest.type).toBe('number-called');

    // Second call — empties the queue, triggers game-ended
    host.send({ type: 'call-number', payload: { code: room.code } });
    const call2Host = await host.nextMessage();
    const call2Guest = await guest.nextMessage();
    expect(call2Host.type).toBe('number-called');
    expect(call2Guest.type).toBe('number-called');

    // Both clients should now receive game-ended
    const endHost = await host.nextMessage();
    const endGuest = await guest.nextMessage();

    expect(endHost.type).toBe('game-ended');
    expect(endGuest.type).toBe('game-ended');
    expect(endHost.calledItems).toEqual(['Item1', 'Item2']);
  });
});

// ─── disconnect ──────────────────────────────────────────────────────────────

describe('disconnect', () => {
  it('disconnected client is removed from the room client registry', async () => {
    const room = createRoom('Host', 'office');
    const client = createTestClient();
    await client.connected();

    client.send({ type: 'join-room', payload: { code: room.code, playerName: 'Host' } });
    await client.nextMessage(); // room-state

    expect(room.clients.size).toBe(1);

    await client.close();
    await wait(50); // allow server close-event handler to fire

    expect(room.clients.size).toBe(0);
  });

  it('auto-caller is stopped when the last client disconnects', async () => {
    const room = createRoom('Host', 'office');
    room.callQueue = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    room.calledItems = [];

    const host = createTestClient();
    await host.connected();

    host.send({ type: 'join-room', payload: { code: room.code, playerName: 'Host' } });
    await host.nextMessage(); // room-state

    host.send({ type: 'start-auto-caller', payload: { code: room.code, interval: 10 } });
    await host.nextMessage(2000); // caller-state (isCalling: true)

    expect(room.isCalling).toBe(true);

    await host.close();
    await wait(100); // allow server close-event handler to fire

    expect(room.isCalling).toBe(false);
  });
});
