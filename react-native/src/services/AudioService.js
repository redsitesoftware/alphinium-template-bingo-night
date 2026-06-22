/**
 * AudioService — Audio playback for bingo number announcements.
 *
 * Priority:
 *   1. GET {serverBaseUrl}/audio/{item} → play MP3 (server-generated via ElevenLabs)
 *   2. 204 or fetch failure → Web Speech API (web) or expo-speech (native)
 *
 * Respects the `audioMuted` flag — returns immediately if muted.
 * Spectator sessions and pre-deal states are gated in bingoStore, not here.
 */
import { Platform } from 'react-native';

/**
 * Strip trailing punctuation that would sound awkward in TTS.
 * e.g. "Synergy!" → "Synergy"
 */
function toSpeechLabel(item) {
  return item.replace(/[!.,?]+$/, '').trim();
}

/**
 * Speak a label via the browser's Web Speech API (web only).
 * No-ops silently if the API is unavailable.
 */
function webSpeechFallback(label) {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    // Cancel any in-progress utterance so the new one plays immediately
    window.speechSynthesis.cancel();
    const utter = new window.SpeechSynthesisUtterance(label);
    window.speechSynthesis.speak(utter);
  }
}

/**
 * Speak a label via expo-speech (native only).
 * Imported dynamically so the web bundle is unaffected.
 */
function nativeSpeechFallback(label) {
  try {
    // Dynamic require keeps the import out of the web bundle
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Speech = require('expo-speech');
    Speech.speak(label);
  } catch {
    // expo-speech not installed — silently skip
  }
}

/**
 * Play audio for the given bingo item.
 *
 * @param {string} item           The called bingo label (e.g. "Synergy!")
 * @param {string} serverBaseUrl  Base URL of the game server (e.g. "https://host:3001")
 * @param {boolean} audioMuted    When true, returns immediately without playing
 */
export async function playCallAudio(item, serverBaseUrl, audioMuted) {
  if (audioMuted) return;

  const label = toSpeechLabel(item);

  // --- Try server audio ---
  try {
    const url = `${serverBaseUrl}/audio/${encodeURIComponent(item)}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status === 200) {
      if (Platform.OS === 'web') {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const audio = new Audio(objectUrl);
        audio.play().catch(() => {
          // Autoplay blocked or other error — fall through to TTS
          URL.revokeObjectURL(objectUrl);
          webSpeechFallback(label);
        });
        audio.addEventListener('ended', () => URL.revokeObjectURL(objectUrl), { once: true });
        audio.addEventListener('error', () => {
          URL.revokeObjectURL(objectUrl);
          webSpeechFallback(label);
        }, { once: true });
        return;
      } else {
        // Native: expo-av
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { Audio } = require('expo-av');
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          const { sound } = await Audio.Sound.createAsync({ uri: objectUrl });
          await sound.playAsync();
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              sound.unloadAsync().catch(() => {});
              URL.revokeObjectURL(objectUrl);
            }
          });
          return;
        } catch {
          // expo-av unavailable or failed — fall through to TTS
        }
      }
    }
    // 204 (no ElevenLabs key) or other non-200 → fall through to TTS
  } catch {
    // Network failure — fall through to TTS
  }

  // --- TTS fallback ---
  if (Platform.OS === 'web') {
    webSpeechFallback(label);
  } else {
    nativeSpeechFallback(label);
  }
}
