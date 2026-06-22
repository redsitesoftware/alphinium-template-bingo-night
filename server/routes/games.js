'use strict';

const express = require('express');
const { getHistory } = require('../gameHistory');

const router = express.Router();

// GET /games/history — returns all completed games, newest first
router.get('/history', (_req, res) => {
  res.json(getHistory());
});

module.exports = router;
