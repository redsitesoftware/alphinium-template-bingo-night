'use strict';

const request = require('supertest');
const express = require('express');
const { saveGame, getHistory, resetHistory } = require('../gameHistory');

// ─── Shared helpers ──────────────────────────────────────────────────────────

function makeGameOpts(overrides = {}) {
  const now = new Date();
  const startedAt = new Date(now.getTime() - 60_000).toISOString();
  const endedAt = now.toISOString();
  return {
    code: 'TEST',
    players: ['Alice', 'Bob'],
    calledItems: ['B1', 'I16', 'N31'],
    winners: ['Alice'],
    startedAt,
    endedAt,
    ...overrides,
  };
}

// ─── Unit tests: gameHistory store ──────────────────────────────────────────

describe('gameHistory store — unit tests', () => {
  beforeEach(() => {
    resetHistory();
  });

  test('saveGame() returns a record containing all input fields', () => {
    const opts = makeGameOpts();
    const record = saveGame(opts);

    expect(record.code).toBe(opts.code);
    expect(record.players).toEqual(opts.players);
    expect(record.calledItems).toEqual(opts.calledItems);
    expect(record.winners).toEqual(opts.winners);
    expect(record.startedAt).toBe(opts.startedAt);
    expect(record.endedAt).toBe(opts.endedAt);
  });

  test('saveGame() returns a record with a non-empty id', () => {
    const record = saveGame(makeGameOpts());
    expect(typeof record.id).toBe('string');
    expect(record.id.length).toBeGreaterThan(0);
  });

  test('saveGame() computes durationMs correctly', () => {
    const startedAt = '2024-01-01T12:00:00.000Z';
    const endedAt   = '2024-01-01T12:01:30.000Z'; // 90 000 ms later
    const record = saveGame(makeGameOpts({ startedAt, endedAt }));
    expect(record.durationMs).toBe(90_000);
  });

  test('getHistory() returns records newest-first after a single save', () => {
    const record = saveGame(makeGameOpts());
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(record.id);
  });

  test('getHistory() returns records newest-first after multiple saves', () => {
    const first  = saveGame(makeGameOpts({ code: 'AAA' }));
    const second = saveGame(makeGameOpts({ code: 'BBB' }));

    const history = getHistory();
    expect(history).toHaveLength(2);
    // Most recent save should be first
    expect(history[0].id).toBe(second.id);
    expect(history[1].id).toBe(first.id);
  });

  test('multiple saves accumulate correctly', () => {
    saveGame(makeGameOpts({ code: 'R1' }));
    saveGame(makeGameOpts({ code: 'R2' }));
    saveGame(makeGameOpts({ code: 'R3' }));
    expect(getHistory()).toHaveLength(3);
  });

  test('getHistory() returns an empty array before any saves', () => {
    expect(getHistory()).toEqual([]);
  });
});

// ─── Integration tests: GET /games/history ───────────────────────────────────

describe('GET /games/history — integration tests', () => {
  let app;

  beforeAll(() => {
    // Build a minimal Express app wired to the games router (mirrors index.js)
    app = express();
    app.use(express.json());
    const gamesRouter = require('../routes/games');
    app.use('/games', gamesRouter);
  });

  beforeEach(() => {
    resetHistory();
  });

  test('returns 200 with an array', async () => {
    const res = await request(app).get('/games/history');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns empty array when no games have been played', async () => {
    const res = await request(app).get('/games/history');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns saved records after saveGame() is called directly', async () => {
    const record = saveGame(makeGameOpts({ code: 'INT1' }));
    const res = await request(app).get('/games/history');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(record.id);
    expect(res.body[0].code).toBe('INT1');
  });

  test('returns multiple records newest-first', async () => {
    const first  = saveGame(makeGameOpts({ code: 'INT2' }));
    const second = saveGame(makeGameOpts({ code: 'INT3' }));
    const res = await request(app).get('/games/history');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe(second.id);
    expect(res.body[1].id).toBe(first.id);
  });
});
