'use strict';

const { validateClaim, generatePlayerCard, CALLS_BY_THEME } = require('../winLogic');

// ── generatePlayerCard ────────────────────────────────────────────────────────

describe('generatePlayerCard()', () => {
  it('returns a 25-element array', () => {
    const card = generatePlayerCard('office');
    expect(card).toHaveLength(25);
  });

  it('places FREE at index 12', () => {
    const card = generatePlayerCard('office');
    expect(card[12]).toBe('FREE');
  });

  it('contains no duplicate values (other than FREE)', () => {
    const card = generatePlayerCard('classic');
    const nonFree = card.filter(c => c !== 'FREE');
    expect(new Set(nonFree).size).toBe(nonFree.length);
  });

  it('all non-FREE squares come from the theme pool', () => {
    const themeId = 'tech';
    const pool = new Set(CALLS_BY_THEME[themeId]);
    const card = generatePlayerCard(themeId);
    for (const item of card) {
      if (item !== 'FREE') expect(pool.has(item)).toBe(true);
    }
  });

  it('generates a different card when an identical one already exists', () => {
    // Force same RNG by generating two cards and checking they can differ
    const first = generatePlayerCard('office', []);
    const second = generatePlayerCard('office', [first]);
    // They should not be identical (extremely unlikely to collide twice in a row)
    expect(second.join('|')).not.toBe(first.join('|'));
  });

  it('falls back to office pool for unknown themeId', () => {
    const card = generatePlayerCard('unknown-theme');
    const officePool = new Set(CALLS_BY_THEME.office);
    const nonFree = card.filter(c => c !== 'FREE');
    for (const item of nonFree) {
      expect(officePool.has(item)).toBe(true);
    }
  });
});

// ── validateClaim — line ──────────────────────────────────────────────────────

describe('validateClaim() — line', () => {
  function makeCard(items) {
    // Build a 25-element card where items fills positions and FREE is at 12
    const card = [...items];
    card.splice(12, 0, 'FREE');
    return card;
  }

  it('returns valid:true and the winning row pattern when row 1 is fully called', () => {
    const pool = CALLS_BY_THEME.office;
    const card = makeCard(pool.slice(0, 24));
    // Row 1 = indices 0-4
    const calledItems = [card[0], card[1], card[2], card[3], card[4]];
    const result = validateClaim(card, calledItems, 'line');
    expect(result.valid).toBe(true);
    expect(result.pattern).toEqual([0, 1, 2, 3, 4]);
  });

  it('returns valid:true for a complete column', () => {
    const pool = CALLS_BY_THEME.office;
    const card = makeCard(pool.slice(0, 24));
    // Column 1 = indices 0, 5, 10, 15, 20
    const calledItems = [card[0], card[5], card[10], card[15], card[20]];
    const result = validateClaim(card, calledItems, 'line');
    expect(result.valid).toBe(true);
    expect(result.pattern).toEqual([0, 5, 10, 15, 20]);
  });

  it('returns valid:true for the main diagonal', () => {
    const pool = CALLS_BY_THEME.office;
    const card = makeCard(pool.slice(0, 24));
    // Main diagonal = 0, 6, 12(FREE), 18, 24
    const calledItems = [card[0], card[6], card[18], card[24]];
    const result = validateClaim(card, calledItems, 'line');
    expect(result.valid).toBe(true);
    expect(result.pattern).toEqual([0, 6, 12, 18, 24]);
  });

  it('returns valid:true for the anti-diagonal', () => {
    const pool = CALLS_BY_THEME.office;
    const card = makeCard(pool.slice(0, 24));
    // Anti-diagonal = 4, 8, 12(FREE), 16, 20
    const calledItems = [card[4], card[8], card[16], card[20]];
    const result = validateClaim(card, calledItems, 'line');
    expect(result.valid).toBe(true);
    expect(result.pattern).toEqual([4, 8, 12, 16, 20]);
  });

  it('returns valid:false when no line is complete', () => {
    const pool = CALLS_BY_THEME.office;
    const card = makeCard(pool.slice(0, 24));
    // Only 2 items called — cannot form a line
    const calledItems = [card[0], card[1]];
    const result = validateClaim(card, calledItems, 'line');
    expect(result.valid).toBe(false);
    expect(result.pattern).toEqual([]);
  });

  it('returns valid:false for an empty calledItems list', () => {
    const pool = CALLS_BY_THEME.office;
    const card = makeCard(pool.slice(0, 24));
    const result = validateClaim(card, [], 'line');
    expect(result.valid).toBe(false);
    expect(result.pattern).toEqual([]);
  });
});

// ── validateClaim — full-house ────────────────────────────────────────────────

describe('validateClaim() — full-house', () => {
  it('returns valid:true when all 25 squares are covered', () => {
    const pool = CALLS_BY_THEME.office;
    const card = [...pool.slice(0, 24)];
    card.splice(12, 0, 'FREE');
    const calledItems = card.filter(c => c !== 'FREE');
    const result = validateClaim(card, calledItems, 'full-house');
    expect(result.valid).toBe(true);
    expect(result.pattern).toHaveLength(25);
    expect(result.pattern).toEqual(Array.from({ length: 25 }, (_, i) => i));
  });

  it('returns valid:false when not all squares are covered', () => {
    const pool = CALLS_BY_THEME.office;
    const card = [...pool.slice(0, 24)];
    card.splice(12, 0, 'FREE');
    // Only call the first row
    const calledItems = [card[0], card[1], card[2], card[3], card[4]];
    const result = validateClaim(card, calledItems, 'full-house');
    expect(result.valid).toBe(false);
    expect(result.pattern).toEqual([]);
  });
});

// ── validateClaim — invalid claimType ────────────────────────────────────────

describe('validateClaim() — invalid claimType', () => {
  it('returns valid:false for an unknown claimType', () => {
    const card = Array(25).fill('X');
    card[12] = 'FREE';
    const result = validateClaim(card, ['X'], 'bingo');
    expect(result.valid).toBe(false);
    expect(result.pattern).toEqual([]);
  });
});
