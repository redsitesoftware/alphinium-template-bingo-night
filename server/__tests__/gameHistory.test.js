'use strict';

// Reset module between tests so history array is fresh each time
let saveGame, getHistory;

beforeEach(() => {
  jest.resetModules();
  ({ saveGame, getHistory } = require('../gameHistory'));
});

const SAMPLE = {
  code: 'ABC123',
  players: ['Alice', 'Bob'],
  calledItems: ['Synergy!', 'Pivot!', 'Deep dive'],
  winners: ['Alice'],
  startedAt: '2024-01-01T10:00:00.000Z',
  endedAt: '2024-01-01T10:05:30.000Z',
};

describe('saveGame()', () => {
  it('returns a record with all expected fields', () => {
    const record = saveGame(SAMPLE);
    expect(record).toMatchObject({
      code: SAMPLE.code,
      players: SAMPLE.players,
      calledItems: SAMPLE.calledItems,
      winners: SAMPLE.winners,
      startedAt: SAMPLE.startedAt,
      endedAt: SAMPLE.endedAt,
    });
  });

  it('assigns a non-empty string id', () => {
    const record = saveGame(SAMPLE);
    expect(typeof record.id).toBe('string');
    expect(record.id.length).toBeGreaterThan(0);
  });

  it('calculates durationMs correctly', () => {
    const record = saveGame(SAMPLE);
    const expected = new Date(SAMPLE.endedAt) - new Date(SAMPLE.startedAt);
    expect(record.durationMs).toBe(expected); // 330000 ms
  });

  it('adds the record to history', () => {
    saveGame(SAMPLE);
    expect(getHistory()).toHaveLength(1);
  });

  it('each call gets a unique id', () => {
    const r1 = saveGame(SAMPLE);
    const r2 = saveGame({ ...SAMPLE, code: 'XYZ999' });
    expect(r1.id).not.toBe(r2.id);
  });
});

describe('getHistory()', () => {
  it('returns an empty array initially', () => {
    expect(getHistory()).toEqual([]);
  });

  it('returns records newest first', () => {
    const first = saveGame({ ...SAMPLE, code: 'FIRST1' });
    const second = saveGame({ ...SAMPLE, code: 'SCND22' });
    const hist = getHistory();
    expect(hist[0].id).toBe(second.id);
    expect(hist[1].id).toBe(first.id);
  });

  it('returns all saved records', () => {
    saveGame(SAMPLE);
    saveGame({ ...SAMPLE, code: 'CODE22' });
    saveGame({ ...SAMPLE, code: 'CODE33' });
    expect(getHistory()).toHaveLength(3);
  });
});
