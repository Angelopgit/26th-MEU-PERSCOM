const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/documents — all authenticated users (including guests)
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT d.*, u.display_name AS author
    FROM documents d
    LEFT JOIN users u ON u.id = d.created_by
    ORDER BY d.created_at DESC
  `).all();
  res.json(rows);
});

// GET /api/documents/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const doc = db.prepare(`
    SELECT d.*, u.display_name AS author
    FROM documents d
    LEFT JOIN users u ON u.id = d.created_by
    WHERE d.id = ?
  `).get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

// POST /api/documents — admin only
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, content } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO documents (title, content, created_by) VALUES (?, ?, ?)'
  ).run(title.trim(), content || '', req.user.id);

  db.prepare(
    "INSERT INTO activity_log (action, details, user_id) VALUES ('DOCUMENT_CREATED', ?, ?)"
  ).run(`Document created: "${title.trim()}"`, req.user.id);

  res.status(201).json({ id: result.lastInsertRowid, title: title.trim(), content: content || '' });
});

// PUT /api/documents/:id — admin only
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { title, content } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM documents WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Document not found' });

  db.prepare(
    "UPDATE documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(title.trim(), content || '', req.params.id);

  db.prepare(
    "INSERT INTO activity_log (action, details, user_id) VALUES ('DOCUMENT_UPDATED', ?, ?)"
  ).run(`Document updated: "${title.trim()}"`, req.user.id);

  res.json({ success: true });
});

// DELETE /api/documents/:id — admin only
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT title FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  db.prepare(
    "INSERT INTO activity_log (action, details, user_id) VALUES ('DOCUMENT_DELETED', ?, ?)"
  ).run(`Document deleted: "${doc.title}"`, req.user.id);

  res.json({ success: true });
});

module.exports = router;
