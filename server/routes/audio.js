'use strict';

const https = require('https');
const express = require('express');

const router = express.Router();

// Valid bingo call pattern: letter-number (B-7, I-23, N-FREE, etc.)
const VALID_ITEM_RE = /^[A-Za-z]-(\d+|FREE)$/i;

// In-memory cache: label → Buffer of MP3 bytes
const audioCache = new Map();

const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // ElevenLabs "Rachel" voice

/**
 * Fetch TTS audio from ElevenLabs and return a Buffer of MP3 bytes.
 */
function fetchElevenLabsTTS(text) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
    const body = JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voiceId}`,
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Accept: 'audio/mpeg',
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`ElevenLabs API returned ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * GET /audio/:item
 *
 * Returns an MP3 for the given bingo call label (e.g. B-7, I-23, N-FREE).
 *
 * - ELEVENLABS_API_KEY set   → synthesise via ElevenLabs, cache result, stream MP3
 * - ELEVENLABS_API_KEY unset → 204 No Content (client falls back to browser TTS)
 * - Unknown item format      → 400 Bad Request
 */
router.get('/:item', async (req, res) => {
  const item = req.params.item.toUpperCase();

  if (!VALID_ITEM_RE.test(item)) {
    return res.status(400).json({ error: 'Invalid bingo call item' });
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(204).end();
  }

  if (audioCache.has(item)) {
    const cached = audioCache.get(item);
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', cached.length);
    return res.end(cached);
  }

  try {
    // Make label more natural for speech: "B 7" instead of "B-7", "N FREE" etc.
    const spokenLabel = item.replace('-', ' ');
    const mp3Buffer = await fetchElevenLabsTTS(spokenLabel);
    audioCache.set(item, mp3Buffer);
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', mp3Buffer.length);
    return res.end(mp3Buffer);
  } catch (err) {
    console.error('ElevenLabs TTS error:', err.message);
    return res.status(502).json({ error: 'TTS service error' });
  }
});

module.exports = router;
module.exports._audioCache = audioCache; // exposed for testing
