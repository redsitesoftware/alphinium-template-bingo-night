'use strict';

const express = require('express');
const { getTheme, registerTheme, listThemes } = require('../themes');

const router = express.Router();

// GET /themes — list all themes (id and name only, no calls)
router.get('/', (_req, res) => {
  res.json(listThemes());
});

// POST /themes — register a custom theme
router.post('/', (req, res) => {
  const { id, name, calls } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'id and name are required' });
  }

  if (!Array.isArray(calls)) {
    return res.status(400).json({ error: 'calls must be an array' });
  }

  const unique = new Set(calls);
  if (unique.size < 25) {
    return res.status(400).json({ error: 'calls must contain at least 25 unique items' });
  }

  if (getTheme(id)) {
    return res.status(400).json({ error: `Theme with id "${id}" already exists` });
  }

  registerTheme({ id, name, calls: [...unique] });

  return res.status(201).json({ id, name });
});

module.exports = router;
