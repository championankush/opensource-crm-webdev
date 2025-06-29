const express = require('express');
const db = require('../config/database');
const router = express.Router();

// GET /api/search?q=term
router.get('/', async (req, res) => {
  const q = req.query.q ? req.query.q.trim() : '';
  if (!q) return res.json({ contacts: [], leads: [], deals: [], tasks: [] });
  try {
    const like = `%${q}%`;
    const [contacts, leads, deals, tasks] = await Promise.all([
      db.all('SELECT id, first_name, last_name, email FROM contacts WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?', [like, like, like]),
      db.all('SELECT id, name, status FROM leads WHERE name LIKE ? OR status LIKE ?', [like, like]),
      db.all('SELECT id, title, stage FROM deals WHERE title LIKE ? OR stage LIKE ?', [like, like]),
      db.all('SELECT id, title, status FROM tasks WHERE title LIKE ? OR status LIKE ?', [like, like])
    ]);
    res.json({ contacts, leads, deals, tasks });
  } catch (err) {
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

module.exports = router; 