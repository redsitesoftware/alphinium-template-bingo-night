'use strict';

/**
 * winLogic.js — Server-side bingo card generation and win validation.
 *
 * Exports:
 *   generatePlayerCard(themeId, existingCards)  → 25-element string array
 *   validateClaim(card, calledItems, claimType) → { valid, pattern }
 */

const CALLS_BY_THEME = {
  office: [
    'Synergy!', 'Circle back', 'Move the needle', 'Boil the ocean', 'Low-hanging fruit',
    'Deep dive', 'Pivot!', 'Blue sky thinking', 'Bandwidth', 'Take it offline',
    'Disruptive', 'Scalable solution', 'Touch base', 'Action items', 'Game changer',
    'Value add', 'Pain points', 'Drill down', 'Going forward', 'Leveraging',
    'Agile mindset', 'KPI', 'ROI focus', 'Stakeholder buy-in', 'Quick win',
    'Paradigm shift', 'Core competency', 'Thought leader', 'Ecosystem', 'Innovation hub',
  ],
  xmas: [
    'Santa Claus', 'Reindeer', 'Mistletoe', 'Eggnog', 'Stocking',
    'Gingerbread', 'Tinsel', 'Candy cane', 'Snowflake', 'Elf on the shelf',
    'Christmas tree', 'Jingle bells', 'Wrapping paper', 'Secret Santa', 'Mulled wine',
    'Nativity', 'Boxing Day', 'Turkey dinner', 'Crackers', 'Carol singing',
    'Baubles', 'Star on top', 'Ugly jumper', 'White Christmas', 'Naughty list',
    'Coal in stocking', 'Ho ho ho', 'Chimney', 'Sleigh bells', 'North Pole',
  ],
  aussie: [
    "G'day mate", 'Arvo', 'Servo', 'Brekkie', 'No worries',
    "She'll be right", 'Crikey', 'Strewth', 'Reckon', 'Thongs',
    'Sunnies', 'Bikkie', 'Ute', 'Barbie', 'Snag',
    'Dead set', 'Fair dinkum', 'Ripper', 'Drongo', 'Larrikin',
    'Dingo', 'Billabong', 'Bush tucker', 'Goon bag', 'Flat white',
    'Dag', 'Dropbear', 'Maccas', 'Bottle-o', 'Smoko',
  ],
  tech: [
    'Blockchain', 'AI/ML', 'Cloud native', 'DevOps', 'Kubernetes',
    'Microservices', 'API-first', 'Zero trust', 'LLM', 'Prompt engineer',
    'Digital twin', 'Edge computing', 'Serverless', 'Observability', 'GitOps',
    'Tech debt', 'Rubber duck', 'Stack overflow', 'npm install', 'It works locally',
    'Ship it', '10x engineer', 'Move fast', 'Agile sprint', 'Standup',
    'Pull request', 'Code review', 'Hot reload', 'Type safety', 'Ship or skip',
  ],
  classic: Array.from({ length: 30 }, (_, i) => {
    const calls = [
      "One! Number one — Kelly's eye!", 'Two — one little duck!',
      'Three — cup of tea!', 'Four — knock at the door!',
      'Five — man alive!', 'Six — half a dozen!',
      'Seven — lucky seven!', 'Eight — one fat lady!',
      "Nine — doctor's orders!", "Ten — (Prime Minister's) den!",
      'Eleven — legs eleven!', 'Twelve — one dozen!',
      'Thirteen — unlucky for some!', 'Fourteen — valentines day!',
      'Fifteen — young and keen!', 'Sixteen — sweet sixteen!',
      'Seventeen — dancing queen!', 'Eighteen — coming of age!',
      'Nineteen — goodbye teens!', 'Twenty — one score!',
      'Twenty-one — key of the door!', 'Twenty-two — two little ducks!',
      'Twenty-three — thee and me!', 'Twenty-four — two dozen!',
      'Twenty-five — duck and dive!', 'Twenty-six — pick and mix!',
      'Twenty-seven — gateway to heaven!', 'Twenty-eight — overweight!',
      'Twenty-nine — rise and shine!', 'Thirty — Burlington Bertie!',
    ];
    return calls[i] || `Number ${i + 1}!`;
  }),
};

/**
 * Fisher-Yates shuffle — returns a new shuffled copy.
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate a unique 5×5 bingo card (25 items) for the given theme.
 * The centre square (index 12) is always 'FREE'.
 * Retries up to 10 times to avoid duplicating an existing player's card,
 * then falls back to the last generated candidate.
 *
 * @param {string} [themeId]
 * @param {string[][]} [existingCards]  Cards already assigned to other players.
 * @returns {string[]}  25-element array.
 */
function generatePlayerCard(themeId, existingCards = []) {
  const pool = CALLS_BY_THEME[themeId] || CALLS_BY_THEME.office;

  const existingKeys = new Set(existingCards.map(c => c.join('|')));

  let candidate;
  let attempts = 0;

  do {
    const picks = shuffle(pool).slice(0, 24);
    picks.splice(12, 0, 'FREE'); // centre is always FREE
    candidate = picks;
    attempts += 1;
  } while (existingKeys.has(candidate.join('|')) && attempts < 10);

  return candidate;
}

// ── Win-pattern definitions ───────────────────────────────────────────────────

/** All winning line patterns (row, column, diagonal) as arrays of indices. */
const LINE_PATTERNS = [
  // Rows
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // Columns
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // Diagonals
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

const ALL_INDICES = Array.from({ length: 25 }, (_, i) => i);

/**
 * Validate a player's bingo claim against the server's ground truth.
 *
 * @param {string[]} card         25-element card array for the player.
 * @param {string[]} calledItems  Items called so far in the room.
 * @param {'line'|'full-house'} claimType
 * @returns {{ valid: boolean, pattern: number[] }}
 *   pattern contains the winning cell indices (empty array when invalid).
 */
function validateClaim(card, calledItems, claimType) {
  const calledSet = new Set(calledItems);

  const isCovered = (idx) => card[idx] === 'FREE' || calledSet.has(card[idx]);

  if (claimType === 'line') {
    for (const pattern of LINE_PATTERNS) {
      if (pattern.every(isCovered)) {
        return { valid: true, pattern };
      }
    }
    return { valid: false, pattern: [] };
  }

  if (claimType === 'full-house') {
    if (ALL_INDICES.every(isCovered)) {
      return { valid: true, pattern: ALL_INDICES };
    }
    return { valid: false, pattern: [] };
  }

  return { valid: false, pattern: [] };
}

module.exports = { generatePlayerCard, validateClaim, CALLS_BY_THEME };
