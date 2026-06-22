const express = require('express');
const { listThemes, getTheme } = require('../themes');

const router = express.Router();

// GET /themes — list available themes (id, name, emoji — no calls array)
router.get('/', (_req, res) => {
  res.json(listThemes());
});

// GET /themes/:id — full theme including calls (for client-side card generation)
router.get('/:id', (req, res) => {
  const theme = getTheme(req.params.id);
  if (!theme) return res.status(404).json({ error: 'Theme not found' });
  res.json(theme);
});

module.exports = router;
