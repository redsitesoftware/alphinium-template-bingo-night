'use strict';

const request = require('supertest');
const app = require('../index');
const { rooms, generateCode, createRoom, pruneExpiredRooms } = require('../rooms');

beforeEach(() => {
  rooms.clear();
});

// ---------------------------------------------------------------------------
// Room model — generateCode()
// ---------------------------------------------------------------------------

describe('generateCode()', () => {
  it('returns a 6-char A-Z0-9 string', () => {
    const code = generateCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('retries on collision', () => {
    // Use jest.isolateModules + jest.doMock so nanoid is controlled
    let result;
    jest.isolateModules(() => {
      let calls = 0;
      jest.doMock('nanoid', () => ({
        customAlphabet: () => () => {
          calls += 1;
          return calls === 1 ? 'AAAAAA' : 'BBBBBB';
        },
      }));

      const { rooms: freshRooms, generateCode: freshGenerateCode } = require('../rooms');
      // Pre-populate with the first code that will be "generated"
      freshRooms.set('AAAAAA', { code: 'AAAAAA' });

      result = freshGenerateCode();
      expect(result).toBe('BBBBBB');
      expect(calls).toBe(2);
    });
  });
});

// ---------------------------------------------------------------------------
// Room model — createRoom()
// ---------------------------------------------------------------------------

describe('createRoom()', () => {
  it('stores room and returns correct shape', () => {
    const room = createRoom('Alice', 'classic');

    expect(room).toMatchObject({
      code: expect.stringMatching(/^[A-Z0-9]{6}$/),
      hostName: 'Alice',
      themeId: 'classic',
      players: [],
      phase: 'lobby',
    });
    expect(room.createdAt).toBeInstanceOf(Date);
    expect(room.lastActivityAt).toBeInstanceOf(Date);
    expect(rooms.get(room.code)).toBe(room);
  });
});

// ---------------------------------------------------------------------------
// Room model — pruneExpiredRooms()
// ---------------------------------------------------------------------------

describe('pruneExpiredRooms()', () => {
  it('removes rooms with lastActivityAt more than 2 hours ago', () => {
    const room = createRoom('Bob', 'classic');
    // Wind back lastActivityAt by 3 hours
    room.lastActivityAt = new Date(Date.now() - 3 * 60 * 60 * 1000);

    pruneExpiredRooms();

    expect(rooms.has(room.code)).toBe(false);
  });

  it('removes rooms with phase === "ended"', () => {
    const room = createRoom('Carol', 'classic');
    room.phase = 'ended';

    pruneExpiredRooms();

    expect(rooms.has(room.code)).toBe(false);
  });

  it('keeps rooms with recent activity', () => {
    const room = createRoom('Dave', 'classic');
    // lastActivityAt is set to now on creation — should survive

    pruneExpiredRooms();

    expect(rooms.has(room.code)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------

describe('GET /health', () => {
  it('returns 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});

// ---------------------------------------------------------------------------
// POST /rooms
// ---------------------------------------------------------------------------

describe('POST /rooms', () => {
  it('returns 201 with code, hostName, themeId, empty players, and phase lobby', async () => {
    const res = await request(app)
      .post('/rooms')
      .send({ hostName: 'Eve', themeId: 'space' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      code: expect.stringMatching(/^[A-Z0-9]{6}$/),
      hostName: 'Eve',
      themeId: 'space',
      players: [],
      phase: 'lobby',
    });
  });

  it('returns 400 when hostName is missing', async () => {
    const res = await request(app)
      .post('/rooms')
      .send({ themeId: 'space' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// POST /rooms/:code/join
// ---------------------------------------------------------------------------

describe('POST /rooms/:code/join', () => {
  it('returns 200 and player appears in room.players', async () => {
    const { body: created } = await request(app)
      .post('/rooms')
      .send({ hostName: 'Host', themeId: 'classic' });

    const res = await request(app)
      .post(`/rooms/${created.code}/join`)
      .send({ playerName: 'Frank' });

    expect(res.status).toBe(200);
    expect(res.body.players).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Frank' })])
    );
  });

  it('returns 404 for an unknown code', async () => {
    const res = await request(app)
      .post('/rooms/ZZZZZZ/join')
      .send({ playerName: 'Ghost' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when playerName is missing', async () => {
    const { body: created } = await request(app)
      .post('/rooms')
      .send({ hostName: 'Host', themeId: 'classic' });

    const res = await request(app)
      .post(`/rooms/${created.code}/join`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 409 when room phase is ended', async () => {
    const { body: created } = await request(app)
      .post('/rooms')
      .send({ hostName: 'Host', themeId: 'classic' });

    // Manually end the room
    rooms.get(created.code).phase = 'ended';

    const res = await request(app)
      .post(`/rooms/${created.code}/join`)
      .send({ playerName: 'LatePlayer' });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// GET /rooms/:code
// ---------------------------------------------------------------------------

describe('GET /rooms/:code', () => {
  it('returns 200 with the room state for a valid code', async () => {
    const { body: created } = await request(app)
      .post('/rooms')
      .send({ hostName: 'Ivan', themeId: 'ocean' });

    const res = await request(app).get(`/rooms/${created.code}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: created.code,
      hostName: 'Ivan',
      phase: 'lobby',
    });
  });

  it('returns 404 for an unknown code', async () => {
    const res = await request(app).get('/rooms/ZZZZZZ');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// GET /rooms/:code/card
// ---------------------------------------------------------------------------

describe('GET /rooms/:code/card', () => {
  it('returns 400 when playerName query param is missing', async () => {
    const { body: created } = await request(app)
      .post('/rooms')
      .send({ hostName: 'Host', themeId: 'office' });

    const res = await request(app).get(`/rooms/${created.code}/card`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 for an unknown room code', async () => {
    const res = await request(app).get('/rooms/ZZZZZZ/card?playerName=Alice');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns a 25-element card array with FREE at index 12', async () => {
    const { body: created } = await request(app)
      .post('/rooms')
      .send({ hostName: 'Host', themeId: 'office' });

    const res = await request(app)
      .get(`/rooms/${created.code}/card?playerName=Alice`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.card)).toBe(true);
    expect(res.body.card).toHaveLength(25);
    expect(res.body.card[12]).toBe('FREE');
  });

  it('returns the same card on repeated requests for the same player', async () => {
    const { body: created } = await request(app)
      .post('/rooms')
      .send({ hostName: 'Host', themeId: 'classic' });

    const res1 = await request(app)
      .get(`/rooms/${created.code}/card?playerName=Bob`);
    const res2 = await request(app)
      .get(`/rooms/${created.code}/card?playerName=Bob`);

    expect(res1.body.card).toEqual(res2.body.card);
  });

  it('returns different cards for different players', async () => {
    const { body: created } = await request(app)
      .post('/rooms')
      .send({ hostName: 'Host', themeId: 'office' });

    const resA = await request(app)
      .get(`/rooms/${created.code}/card?playerName=Alice`);
    const resB = await request(app)
      .get(`/rooms/${created.code}/card?playerName=Bob`);

    expect(resA.body.card.join('|')).not.toBe(resB.body.card.join('|'));
  });
});

// ---------------------------------------------------------------------------
// POST /rooms/:code/claim
// ---------------------------------------------------------------------------

describe('POST /rooms/:code/claim', () => {
  it('returns 400 when playerName is missing', async () => {
    const { body: created } = await request(app)
      .post('/rooms')
      .send({ hostName: 'Host', themeId: 'office' });

    const res = await request(app)
      .post(`/rooms/${created.code}/claim`)
      .send({ claimType: 'line' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when claimType is missing', async () => {
    const { body: created } = await request(app)
      .post('/rooms')
      .send({ hostName: 'Host', themeId: 'office' });

    const res = await request(app)
      .post(`/rooms/${created.code}/claim`)
      .send({ playerName: 'Alice' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for an invalid claimType', async () => {
    const { body: created } = await request(app)
      .post('/rooms')
      .send({ hostName: 'Host', themeId: 'office' });

    const res = await request(app)
      .post(`/rooms/${created.code}/claim`)
      .send({ playerName: 'Alice', claimType: 'bingo' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 for an unknown room code', async () => {
    const res = await request(app)
      .post('/rooms/ZZZZZZ/claim')
      .send({ playerName: 'Alice', claimType: 'line' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 when the player has no stored card', async () => {
    const { body: created } = await request(app)
      .post('/rooms')
      .send({ hostName: 'Host', themeId: 'office' });

    const res = await request(app)
      .post(`/rooms/${created.code}/claim`)
      .send({ playerName: 'NoCardPlayer', claimType: 'line' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns valid:false when no winning line is present', async () => {
    const { body: created } = await request(app)
      .post('/rooms')
      .send({ hostName: 'Host', themeId: 'office' });

    // Get a card for the player
    await request(app)
      .get(`/rooms/${created.code}/card?playerName=Alice`);

    // No numbers have been called — claim should be invalid
    const res = await request(app)
      .post(`/rooms/${created.code}/claim`)
      .send({ playerName: 'Alice', claimType: 'line' });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.pattern).toEqual([]);
  });

  it('returns valid:true with winning pattern when a full row has been called', async () => {
    const { body: created } = await request(app)
      .post('/rooms')
      .send({ hostName: 'Host', themeId: 'office' });

    // Get player card
    const { body: cardBody } = await request(app)
      .get(`/rooms/${created.code}/card?playerName=Alice`);
    const card = cardBody.card;

    // Manually seed calledItems with row 1 (indices 0-4), skipping FREE at 12
    const room = rooms.get(created.code);
    room.calledItems = [card[0], card[1], card[2], card[3], card[4]].filter(i => i !== 'FREE');

    const res = await request(app)
      .post(`/rooms/${created.code}/claim`)
      .send({ playerName: 'Alice', claimType: 'line' });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.pattern).toEqual([0, 1, 2, 3, 4]);
  });

  it('returns valid:true with all 25 indices for a valid full-house', async () => {
    const { body: created } = await request(app)
      .post('/rooms')
      .send({ hostName: 'Host', themeId: 'office' });

    const { body: cardBody } = await request(app)
      .get(`/rooms/${created.code}/card?playerName=Alice`);
    const card = cardBody.card;

    // Call every non-FREE square
    const room = rooms.get(created.code);
    room.calledItems = card.filter(c => c !== 'FREE');

    const res = await request(app)
      .post(`/rooms/${created.code}/claim`)
      .send({ playerName: 'Alice', claimType: 'full-house' });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.pattern).toHaveLength(25);
  });

  it('returns valid:false for full-house when card is not complete', async () => {
    const { body: created } = await request(app)
      .post('/rooms')
      .send({ hostName: 'Host', themeId: 'office' });

    const { body: cardBody } = await request(app)
      .get(`/rooms/${created.code}/card?playerName=Alice`);
    const card = cardBody.card;

    // Only call the first row
    const room = rooms.get(created.code);
    room.calledItems = [card[0], card[1], card[2], card[3], card[4]];

    const res = await request(app)
      .post(`/rooms/${created.code}/claim`)
      .send({ playerName: 'Alice', claimType: 'full-house' });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.pattern).toEqual([]);
  });
});
