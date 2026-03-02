const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '../../data/uploads');

// GET /api/spotlight — all authenticated users
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM spotlight_images ORDER BY created_at DESC').all();
  res.json(rows);
});

// POST /api/spotlight — admin only
router.post('/', authenticate, requireAdmin, upload.spotlightUpload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });
  const db = getDb();
  const imageUrl = `/uploads/${req.file.filename}`;
  const result = db.prepare(
    'INSERT INTO spotlight_images (title, image_url, created_by) VALUES (?, ?, ?)'
  ).run(req.body.title || null, imageUrl, req.user.id);
  res.status(201).json({ id: result.lastInsertRowid, title: req.body.title || null, image_url: imageUrl });
});

// DELETE /api/spotlight/:id — admin only
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const img = db.prepare('SELECT * FROM spotlight_images WHERE id = ?').get(req.params.id);
  if (!img) return res.status(404).json({ error: 'Image not found' });

  const filePath = path.join(UPLOAD_DIR, path.basename(img.image_url));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM spotlight_images WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
