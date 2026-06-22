'use strict';

const express = require('express');
const { getTheme, registerTheme, listThemes } = require('../themes');

const router = express.Router();

// GET /themes — list all registered themes (no calls array in response)
router.get('/', (_req, res) => {
  res.json(listThemes());
});

// POST /themes — register a custom word-list theme
//
// TODO: production deployments should add admin auth middleware before this
//       handler to prevent unauthenticated theme creation.
//
// Body: { id: string, name: string, calls: string[], emoji?: string }
// Returns 201 { id, name, emoji } on success (no calls in response).
// Returns 400 with descriptive error on validation failure.
router.post('/', (req, res) => {
  const { id, name, calls, emoji } = req.body;

  if (!id || typeof id !== 'string' || id.trim() === '') {
    return res.status(400).json({ error: 'id is required and must be a non-empty string' });
  }

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'name is required and must be a non-empty string' });
  }

  if (!Array.isArray(calls) || calls.length === 0) {
    return res.status(400).json({ error: 'calls must be a non-empty array of strings' });
  }

  const uniqueCalls = [...new Set(calls.filter(c => typeof c === 'string' && c.trim() !== ''))];
  if (uniqueCalls.length < 25) {
    return res.status(400).json({
      error: `calls must contain at least 25 unique non-empty strings (got ${uniqueCalls.length})`,
    });
  }

  if (getTheme(id.trim())) {
    return res.status(400).json({ error: `Theme id '${id.trim()}' is already registered` });
  }

  const theme = {
    id: id.trim(),
    name: name.trim(),
    calls: uniqueCalls,
    ...(emoji !== undefined && { emoji }),
  };

  registerTheme(theme);

  const response = { id: theme.id, name: theme.name };
  if (theme.emoji !== undefined) response.emoji = theme.emoji;

  return res.status(201).json(response);
});

module.exports = router;
