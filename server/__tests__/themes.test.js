'use strict';

const request = require('supertest');
const app = require('../index');
const { themeRegistry } = require('../themes');

// Helper: generate an array of N distinct strings
const makeCalls = (n) => Array.from({ length: n }, (_, i) => `Call ${i + 1}`);

beforeEach(() => {
  // Remove any custom themes added during tests; preserve built-ins
  for (const id of themeRegistry.keys()) {
    if (!['classic', 'pub-quiz'].includes(id)) {
      themeRegistry.delete(id);
    }
  }
});

// ---------------------------------------------------------------------------
// GET /themes
// ---------------------------------------------------------------------------

describe('GET /themes', () => {
  it('returns 200 with an array of theme summaries', async () => {
    const res = await request(app).get('/themes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('each entry has id and name but no calls array', async () => {
    const res = await request(app).get('/themes');
    for (const theme of res.body) {
      expect(theme).toHaveProperty('id');
      expect(theme).toHaveProperty('name');
      expect(theme).not.toHaveProperty('calls');
    }
  });
});

// ---------------------------------------------------------------------------
// POST /themes — validation failures → 400
// ---------------------------------------------------------------------------

describe('POST /themes — validation', () => {
  it('rejects missing id', async () => {
    const res = await request(app).post('/themes').send({ name: 'Test', calls: makeCalls(25) });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects empty id', async () => {
    const res = await request(app).post('/themes').send({ id: '  ', name: 'Test', calls: makeCalls(25) });
    expect(res.status).toBe(400);
  });

  it('rejects missing name', async () => {
    const res = await request(app).post('/themes').send({ id: 'x', calls: makeCalls(25) });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects empty name', async () => {
    const res = await request(app).post('/themes').send({ id: 'x', name: '', calls: makeCalls(25) });
    expect(res.status).toBe(400);
  });

  it('rejects missing calls', async () => {
    const res = await request(app).post('/themes').send({ id: 'x', name: 'X' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects calls with fewer than 25 unique entries', async () => {
    const res = await request(app).post('/themes').send({ id: 'x', name: 'X', calls: makeCalls(24) });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/25/);
  });

  it('rejects duplicate calls that deduplicate below 25', async () => {
    const calls = [...makeCalls(24), 'Call 1']; // 25 items but only 24 unique
    const res = await request(app).post('/themes').send({ id: 'x', name: 'X', calls });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate theme id', async () => {
    const res = await request(app)
      .post('/themes')
      .send({ id: 'classic', name: 'Clash', calls: makeCalls(25) });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already registered/);
  });
});

// ---------------------------------------------------------------------------
// POST /themes — success → 201
// ---------------------------------------------------------------------------

describe('POST /themes — success', () => {
  it('returns 201 with id and name (no calls)', async () => {
    const res = await request(app)
      .post('/themes')
      .send({ id: 'meeting-bingo', name: 'Team Meeting Bingo', calls: makeCalls(25) });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 'meeting-bingo', name: 'Team Meeting Bingo' });
    expect(res.body).not.toHaveProperty('calls');
  });

  it('includes emoji in response when provided', async () => {
    const res = await request(app)
      .post('/themes')
      .send({ id: 'emoji-theme', name: 'Emoji Theme', calls: makeCalls(25), emoji: '🎉' });
    expect(res.status).toBe(201);
    expect(res.body.emoji).toBe('🎉');
  });

  it('newly registered theme appears in GET /themes', async () => {
    await request(app)
      .post('/themes')
      .send({ id: 'new-theme', name: 'New Theme', calls: makeCalls(25) });

    const list = await request(app).get('/themes');
    const found = list.body.find(t => t.id === 'new-theme');
    expect(found).toBeDefined();
    expect(found.name).toBe('New Theme');
    expect(found).not.toHaveProperty('calls');
  });

  it('accepts 25+ unique calls after deduplication', async () => {
    const calls = [...makeCalls(25), 'Call 1', 'Call 2']; // 27 items, 25 unique
    const res = await request(app)
      .post('/themes')
      .send({ id: 'dedup-theme', name: 'Dedup Theme', calls });
    expect(res.status).toBe(201);
  });

  it('trims whitespace from id and name', async () => {
    const res = await request(app)
      .post('/themes')
      .send({ id: '  trimmed  ', name: '  Trimmed Name  ', calls: makeCalls(25) });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('trimmed');
    expect(res.body.name).toBe('Trimmed Name');
  });
});
