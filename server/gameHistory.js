'use strict';

const { nanoid } = require('nanoid');

/** @type {Array<object>} In-memory store of completed game records, newest first. */
const history = [];

/**
 * Save a completed game record to the in-memory history.
 *
 * @param {object} opts
 * @param {string}   opts.code        - Room code
 * @param {string[]} opts.players     - Player name strings
 * @param {string[]} opts.calledItems - Called strings in order
 * @param {string[]} opts.winners     - Winner name strings (may be empty)
 * @param {string}   opts.startedAt   - ISO date string
 * @param {string}   opts.endedAt     - ISO date string
 * @returns {object} The saved game record
 */
function saveGame({ code, players, calledItems, winners, startedAt, endedAt }) {
  const record = {
    id: nanoid(),
    code,
    players,
    calledItems,
    winners,
    startedAt,
    endedAt,
    durationMs: new Date(endedAt) - new Date(startedAt),
  };
  history.unshift(record);
  return record;
}

/**
 * Return the full history array, most recent first.
 * @returns {object[]}
 */
function getHistory() {
  return history;
}

module.exports = { saveGame, getHistory };
