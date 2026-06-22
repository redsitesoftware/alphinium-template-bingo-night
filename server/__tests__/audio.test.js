'use strict';

const request = require('supertest');

// We need to control ELEVENLABS_API_KEY before requiring the app/module.
// Use jest.isolateModules so each describe block starts fresh.

describe('GET /audio/:item — no ELEVENLABS_API_KEY', () => {
  let app;

  beforeAll(() => {
    delete process.env.ELEVENLABS_API_KEY;
    jest.isolateModules(() => {
      app = require('../index');
    });
  });

  it('returns 204 for a valid item when API key is absent', async () => {
    const res = await request(app).get('/audio/B-7');
    expect(res.status).toBe(204);
  });

  it('returns 400 for an invalid item', async () => {
    const res = await request(app).get('/audio/INVALID');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for a badly-formatted item', async () => {
    const res = await request(app).get('/audio/X-BADFORMAT');
    expect(res.status).toBe(400);
  });
});

// jest.mock() factory cannot reference outer-scope variables that aren't prefixed
// with "mock".  Use mockFakeMP3 so Jest allows it.
const mockFakeMP3 = Buffer.from('fake-mp3-data');

jest.mock('https', () => {
  const EventEmitter = require('events');
  return {
    request: (_opts, callback) => {
      const mockRes = new EventEmitter();
      mockRes.statusCode = 200;

      const mockReq = new EventEmitter();
      mockReq.write = jest.fn();
      mockReq.end = jest.fn(() => {
        setImmediate(() => {
          callback(mockRes);
          mockRes.emit('data', mockFakeMP3);
          mockRes.emit('end');
        });
      });

      return mockReq;
    },
    get: jest.fn(),
  };
});

describe('GET /audio/:item — with ELEVENLABS_API_KEY', () => {
  let app;
  let audioRouter;

  beforeAll(() => {
    process.env.ELEVENLABS_API_KEY = 'test-key-123';
    jest.isolateModules(() => {
      audioRouter = require('../routes/audio');
      app = require('../index');
    });
  });

  afterAll(() => {
    delete process.env.ELEVENLABS_API_KEY;
  });

  beforeEach(() => {
    audioRouter._audioCache.clear();
  });

  it('returns 200 with audio/mpeg content-type for a valid item', async () => {
    const res = await request(app).get('/audio/B-7');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/audio\/mpeg/);
  });

  it('returns 400 for an invalid item even with API key set', async () => {
    const res = await request(app).get('/audio/NOTVALID');
    expect(res.status).toBe(400);
  });

  it('caches response so cache grows by 1 on first call and stays same on second', async () => {
    expect(audioRouter._audioCache.size).toBe(0);
    await request(app).get('/audio/I-23');
    expect(audioRouter._audioCache.size).toBe(1);
    await request(app).get('/audio/I-23');
    expect(audioRouter._audioCache.size).toBe(1);
  });

  it('handles N-FREE as a valid item', async () => {
    const res = await request(app).get('/audio/N-FREE');
    expect(res.status).toBe(200);
  });
});

