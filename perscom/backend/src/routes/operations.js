const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '../../data/uploads');

function getOpWithCreator(db, id) {
  return db.prepare(`
    SELECT o.*, u.display_name as created_by_name
    FROM operations o JOIN users u ON o.created_by = u.id
    WHERE o.id = ?
  `).get(id);
}

router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const operations = db.prepare(`
    SELECT o.*, u.display_name as created_by_name
    FROM operations o
    JOIN users u ON o.created_by = u.id
    ORDER BY o.start_date DESC
  `).all();
  res.json(operations);
});

router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, description, start_date, end_date } = req.body;
  if (!title || !start_date) {
    return res.status(400).json({ error: 'Title and start date are required' });
  }

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO operations (title, description, start_date, end_date, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(title.trim(), description || null, start_date, end_date || null, req.user.id);

  db.prepare('INSERT INTO activity_log (action, details, user_id) VALUES (?, ?, ?)').run(
    'OPERATION_CREATED',
    `Operation: ${title}`,
    req.user.id
  );

  res.status(201).json(getOpWithCreator(db, result.lastInsertRowid));
});

router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { title, description, start_date, end_date } = req.body;
  const db = getDb();

  const op = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id);
  if (!op) return res.status(404).json({ error: 'Operation not found' });

  db.prepare(
    'UPDATE operations SET title = ?, description = ?, start_date = ?, end_date = ? WHERE id = ?'
  ).run(
    title || op.title,
    description !== undefined ? description : op.description,
    start_date || op.start_date,
    end_date !== undefined ? end_date : op.end_date,
    req.params.id
  );

  res.json(getOpWithCreator(db, req.params.id));
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const op = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id);
  if (!op) return res.status(404).json({ error: 'Operation not found' });

  if (op.image_url) {
    const filePath = path.join(UPLOAD_DIR, path.basename(op.image_url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM operations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Upload image for an operation (admin only)
router.post('/:id/image', authenticate, requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });

  const db = getDb();
  const op = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id);
  if (!op) return res.status(404).json({ error: 'Operation not found' });

  if (op.image_url) {
    const oldFile = path.join(UPLOAD_DIR, path.basename(op.image_url));
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE operations SET image_url = ? WHERE id = ?').run(imageUrl, req.params.id);

  db.prepare('INSERT INTO activity_log (action, details, user_id) VALUES (?, ?, ?)').run(
    'OPERATION_UPDATED',
    `Image added to: ${op.title}`,
    req.user.id
  );

  res.json({ image_url: imageUrl });
});

// Delete image from operation (admin only)
router.delete('/:id/image', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const op = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id);
  if (!op) return res.status(404).json({ error: 'Operation not found' });
  if (!op.image_url) return res.status(404).json({ error: 'No image attached' });

  const filePath = path.join(UPLOAD_DIR, path.basename(op.image_url));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('UPDATE operations SET image_url = NULL WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
