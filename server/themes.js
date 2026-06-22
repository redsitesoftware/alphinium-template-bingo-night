/**
 * Minimal theme registry for the Bingo Night server.
 *
 * Each theme exposes a `calls` array — the pool of items that will be
 * shuffled into a room's callQueue when the room is created.
 *
 * Add new themes here as the game content expands.
 */

/** @type {Map<string, {id:string, name:string, calls:string[]}>} */
const themeRegistry = new Map();

/**
 * Register a theme so it can be looked up by ID.
 * @param {{id:string, name:string, calls:string[]}} theme
 */
function registerTheme(theme) {
  themeRegistry.set(theme.id, theme);
}

/**
 * Retrieve a theme by ID.
 * @param {string} id
 * @returns {{id:string, name:string, calls:string[]}|null}
 */
function getTheme(id) {
  return themeRegistry.get(id) || null;
}

// ── Built-in themes ───────────────────────────────────────────────────────────

registerTheme({
  id: 'classic',
  name: 'Classic Bingo',
  calls: Array.from({ length: 75 }, (_, i) => String(i + 1)),
});

registerTheme({
  id: 'pub-quiz',
  name: 'Pub Quiz Night',
  calls: [
    'Question 1', 'Question 2', 'Question 3', 'Question 4', 'Question 5',
    'Question 6', 'Question 7', 'Question 8', 'Question 9', 'Question 10',
    'Question 11', 'Question 12', 'Question 13', 'Question 14', 'Question 15',
    'Question 16', 'Question 17', 'Question 18', 'Question 19', 'Question 20',
  ],
});

/**
 * List all registered themes (id, name, emoji — no calls array).
 * @returns {{ id: string, name: string, emoji?: string }[]}
 */
function listThemes() {
  return Array.from(themeRegistry.values()).map(({ id, name, emoji }) =>
    emoji !== undefined ? { id, name, emoji } : { id, name }
  );
}

module.exports = { getTheme, registerTheme, listThemes, themeRegistry };
