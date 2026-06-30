'use strict';

const request = require('supertest');
const https = require('https');
const { EventEmitter } = require('events');

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a minimal fake https.request that returns status `statusCode` and
 * emits `chunks` on the response stream.
 */
function makeFakeHttpsRequest(statusCode, chunks = []) {
  return jest.fn((_options, callback) => {
    const res = new EventEmitter();
    res.statusCode = statusCode;
    res.resume = jest.fn();

    const reqEmitter = new EventEmitter();
    reqEmitter.write = jest.fn();
    reqEmitter.end = jest.fn(() => {
      callback(res);
      chunks.forEach((c) => res.emit('data', Buffer.from(c)));
      res.emit('end');
    });

    return reqEmitter;
  });
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('GET /audio/:item', () => {
  let app;

  beforeEach(() => {
    // Isolate modules so cache and env vars are fresh per test
    jest.resetModules();
    jest.restoreAllMocks();
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_VOICE_ID;
    app = require('../index');
  });

  // ── validation ──────────────────────────────────────────────────────────────

  it('returns 400 for an empty item param (just a slash)', async () => {
    // Express won't even match '/:item' with an empty segment, so this is more
    // of a sanity check on the route boundary.
    const res = await request(app).get('/audio/');
    expect([400, 404]).toContain(res.status);
  });

  it('returns 400 for an item containing invalid characters', async () => {
    const res = await request(app).get('/audio/<script>');
    expect(res.status).toBe(400);
  });

  // ── no API key → 204 ────────────────────────────────────────────────────────

  it('returns 204 when ELEVENLABS_API_KEY is not set', async () => {
    const res = await request(app).get('/audio/B-7');
    expect(res.status).toBe(204);
  });

  it('returns 204 for multi-word labels when no API key', async () => {
    const res = await request(app).get('/audio/N-FREE');
    expect(res.status).toBe(204);
  });

  // ── with API key → MP3 ──────────────────────────────────────────────────────

  it('returns 200 audio/mpeg when ELEVENLABS_API_KEY is set and TTS succeeds', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-key-123';

    const fakeAudio = Buffer.from('fake-mp3-data');
    jest.spyOn(https, 'request').mockImplementation(
      makeFakeHttpsRequest(200, [fakeAudio])
    );

    jest.resetModules();
    app = require('../index');

    const res = await request(app).get('/audio/B-7');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/audio\/mpeg/);
    expect(res.body).toBeDefined();
  });

  it('uses ELEVENLABS_VOICE_ID env var when set', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-key-123';
    process.env.ELEVENLABS_VOICE_ID = 'custom-voice-id';

    let capturedPath = '';
    const fakeAudio = Buffer.from('fake-mp3-data');
    jest.spyOn(https, 'request').mockImplementation((options, callback) => {
      capturedPath = options.path;
      return makeFakeHttpsRequest(200, [fakeAudio])(options, callback);
    });

    jest.resetModules();
    app = require('../index');

    await request(app).get('/audio/I-23');
    expect(capturedPath).toContain('custom-voice-id');
  });

  it('serves from cache on repeated requests without calling ElevenLabs again', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-key-123';

    const fakeAudio = Buffer.from('cached-mp3');
    const mockRequest = makeFakeHttpsRequest(200, [fakeAudio]);
    jest.spyOn(https, 'request').mockImplementation(mockRequest);

    jest.resetModules();
    app = require('../index');

    // First request — populates cache
    const res1 = await request(app).get('/audio/G-50');
    expect(res1.status).toBe(200);

    // Second request — should hit cache, not call ElevenLabs again
    const res2 = await request(app).get('/audio/G-50');
    expect(res2.status).toBe(200);

    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('returns 502 when ElevenLabs API returns a non-200 status', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-key-123';

    jest.spyOn(https, 'request').mockImplementation(
      makeFakeHttpsRequest(401, [])
    );

    jest.resetModules();
    app = require('../index');

    const res = await request(app).get('/audio/O-72');
    expect(res.status).toBe(502);
  });
});
