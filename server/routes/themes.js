const express = require('express');
const { themeRegistry } = require('../themes');

const router = express.Router();

// GET /themes — list all available themes (no calls array exposed)
router.get('/', (_req, res) => {
  const themes = Array.from(themeRegistry.values()).map(({ id, name, emoji }) => {
    const entry = { id, name };
    if (emoji) entry.emoji = emoji;
    return entry;
  });
  res.json(themes);
});

module.exports = router;
