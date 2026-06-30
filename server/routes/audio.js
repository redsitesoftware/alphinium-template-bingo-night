'use strict';

const https = require('https');
const express = require('express');

const router = express.Router();

// In-memory cache: label → Buffer
const audioCache = new Map();

// Bingo call labels contain letters, digits, hyphens and spaces (e.g. "B-7", "N-FREE", "Call Me Maybe")
const VALID_ITEM_RE = /^[A-Za-z0-9][A-Za-z0-9 '_.,\-]{0,199}$/;

/**
 * Fetch MP3 audio from ElevenLabs TTS for the given text label.
 * Returns a Buffer containing the MP3 data.
 * @param {string} label
 * @returns {Promise<Buffer>}
 */
function fetchFromElevenLabs(label) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  const body = JSON.stringify({
    text: label,
    model_id: 'eleven_monolingual_v1',
    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voiceId}`,
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`ElevenLabs returned status ${res.statusCode}`));
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

// GET /audio/:item
// Returns MP3 audio for the given bingo call label.
// - With ELEVENLABS_API_KEY: synthesises and streams audio/mpeg (cached in memory).
// - Without ELEVENLABS_API_KEY: responds 204 so the client falls back to browser TTS.
router.get('/:item', async (req, res) => {
  const item = req.params.item;

  if (!item || !VALID_ITEM_RE.test(item)) {
    return res.status(400).json({ error: 'Invalid bingo call item' });
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(204).end();
  }

  // Serve from cache if available
  if (audioCache.has(item)) {
    const cached = audioCache.get(item);
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', cached.length);
    return res.send(cached);
  }

  try {
    const mp3Buffer = await fetchFromElevenLabs(item);
    audioCache.set(item, mp3Buffer);
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', mp3Buffer.length);
    return res.send(mp3Buffer);
  } catch (err) {
    console.error('[audio] ElevenLabs TTS error:', err.message);
    return res.status(502).json({ error: 'TTS service unavailable' });
  }
});

module.exports = router;
module.exports.audioCache = audioCache;
