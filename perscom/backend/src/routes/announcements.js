const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const announcements = db.prepare(`
    SELECT a.*, u.display_name as created_by_name
    FROM announcements a
    JOIN users u ON a.created_by = u.id
    ORDER BY a.created_at DESC
  `).all();
  res.json(announcements);
});

router.get('/latest', authenticate, (req, res) => {
  const db = getDb();
  const announcement = db.prepare(`
    SELECT a.*, u.display_name as created_by_name
    FROM announcements a
    JOIN users u ON a.created_by = u.id
    ORDER BY a.created_at DESC
    LIMIT 1
  `).get();
  res.json(announcement || null);
});

router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO announcements (title, message, created_by) VALUES (?, ?, ?)'
  ).run(title.trim(), message.trim(), req.user.id);

  const announcement = db.prepare(`
    SELECT a.*, u.display_name as created_by_name
    FROM announcements a
    JOIN users u ON a.created_by = u.id
    WHERE a.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(announcement);
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const ann = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
  if (!ann) return res.status(404).json({ error: 'Announcement not found' });

  db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
