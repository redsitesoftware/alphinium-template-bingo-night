import { ROOM_API_URL } from '../config';

export const RoomService = {
  createRoom: (hostName, themeId) =>
    fetch(`${ROOM_API_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName, themeId }),
    }).then(async r => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        const error = new Error(err.message || `Request failed with status ${r.status}`);
        error.status = r.status;
        throw error;
      }
      return r.json();
    }),

  joinRoom: (code, playerName) =>
    fetch(`${ROOM_API_URL}/rooms/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName }),
    }).then(async r => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        const error = new Error(err.message || `Request failed with status ${r.status}`);
        error.status = r.status;
        throw error;
      }
      return r.json();
    }),

  getRoom: (code) =>
    fetch(`${ROOM_API_URL}/rooms/${code}`).then(async r => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        const error = new Error(err.message || `Request failed with status ${r.status}`);
        error.status = r.status;
        throw error;
      }
      return r.json();
    }),
};
