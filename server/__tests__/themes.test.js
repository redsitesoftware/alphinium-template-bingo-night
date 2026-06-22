'use strict';

const request = require('supertest');
const app = require('../index');
const { rooms } = require('../rooms');
const { getTheme } = require('../themes');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build an array of N distinct string items. */
function makeCalls(n) {
  return Array.from({ length: n }, (_, i) => `Call item ${i + 1}`);
}

beforeEach(() => {
  rooms.clear();
  // Remove any custom themes registered in previous tests by replacing the
  // registry contents.  Built-in themes are re-registered on module load, so
  // we only need to clean up anything added after startup.
});

// ---------------------------------------------------------------------------
// GET /themes
// ---------------------------------------------------------------------------

describe('GET /themes', () => {
  it('returns 200 with an array', async () => {
    const res = await request(app).get('/themes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('every item has id and name but NOT calls', async () => {
    const res = await request(app).get('/themes');
    expect(res.body.length).toBeGreaterThan(0);
    for (const theme of res.body) {
      expect(theme).toHaveProperty('id');
      expect(theme).toHaveProperty('name');
      expect(theme).not.toHaveProperty('calls');
    }
  });

  it('includes all six built-in themes', async () => {
    const res = await request(app).get('/themes');
    const ids = res.body.map((t) => t.id);
    for (const builtIn of ['office', 'xmas', 'aussie', 'tech', 'classic', 'emoji']) {
      expect(ids).toContain(builtIn);
    }
  });
});

// ---------------------------------------------------------------------------
// POST /themes
// ---------------------------------------------------------------------------

describe('POST /themes', () => {
  it('valid body (≥25 unique calls) → 201 and theme appears in GET /themes', async () => {
    const payload = {
      id: `custom-${Date.now()}`,
      name: 'My Custom Theme',
      calls: makeCalls(25),
    };

    const createRes = await request(app).post('/themes').send(payload);
    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({ id: payload.id, name: payload.name });

    const listRes = await request(app).get('/themes');
    const ids = listRes.body.map((t) => t.id);
    expect(ids).toContain(payload.id);
  });

  it('missing calls → 400', async () => {
    const res = await request(app).post('/themes').send({ id: 'bad', name: 'Bad' });
    expect(res.status).toBe(400);
  });

  it('calls with fewer than 25 items → 400', async () => {
    const res = await request(app)
      .post('/themes')
      .send({ id: 'short', name: 'Short', calls: makeCalls(24) });
    expect(res.status).toBe(400);
  });

  it('duplicate id → 400', async () => {
    const payload = { id: `dup-${Date.now()}`, name: 'Dup', calls: makeCalls(25) };
    await request(app).post('/themes').send(payload);
    const res = await request(app).post('/themes').send(payload);
    expect(res.status).toBe(400);
  });

  it('newly created theme can be used in POST /rooms', async () => {
    const themeId = `room-test-${Date.now()}`;
    await request(app)
      .post('/themes')
      .send({ id: themeId, name: 'Room Test Theme', calls: makeCalls(25) });

    const roomRes = await request(app)
      .post('/rooms')
      .send({ hostName: 'Alice', themeId });

    expect(roomRes.status).toBe(201);
    expect(roomRes.body.themeId).toBe(themeId);
  });
});

// ---------------------------------------------------------------------------
// createRoom — invalid themeId falls back to default (no 500)
// ---------------------------------------------------------------------------

describe('POST /rooms with invalid themeId', () => {
  it('falls back to default theme and returns 201 (not 500)', async () => {
    const res = await request(app)
      .post('/rooms')
      .send({ hostName: 'Bob', themeId: 'totally-nonexistent-theme' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('code');
    expect(res.body.callQueue).toBeDefined();
    expect(res.body.callQueue.length).toBeGreaterThan(0);
  });
});
