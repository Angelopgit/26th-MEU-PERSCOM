const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '../../data/uploads');

// GET /api/ranks — list all ranks ordered by sort_order (any authenticated user)
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const ranks = db.prepare('SELECT * FROM ranks ORDER BY sort_order ASC, id ASC').all();
  res.json(ranks);
});

// POST /api/ranks — create new rank (admin only)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name, sort_order = 0, req_attendance = 0, req_ops = 0, req_trainings = 0 } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  const db = getDb();
  try {
    const result = db.prepare(
      'INSERT INTO ranks (name, sort_order, req_attendance, req_ops, req_trainings) VALUES (?, ?, ?, ?, ?)'
    ).run(name.trim(), sort_order, req_attendance, req_ops, req_trainings);
    const rank = db.prepare('SELECT * FROM ranks WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(rank);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Rank name already exists' });
    res.status(500).json({ error: 'Failed to create rank' });
  }
});

// PUT /api/ranks/:id — update rank name/requirements/order/discord_role (admin only)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { name, sort_order, req_attendance, req_ops, req_trainings, discord_role_id } = req.body;
  const db = getDb();
  const rank = db.prepare('SELECT * FROM ranks WHERE id = ?').get(req.params.id);
  if (!rank) return res.status(404).json({ error: 'Rank not found' });
  try {
    db.prepare(
      'UPDATE ranks SET name = ?, sort_order = ?, req_attendance = ?, req_ops = ?, req_trainings = ?, discord_role_id = ? WHERE id = ?'
    ).run(
      name ?? rank.name,
      sort_order ?? rank.sort_order,
      req_attendance ?? rank.req_attendance,
      req_ops ?? rank.req_ops,
      req_trainings ?? rank.req_trainings,
      discord_role_id !== undefined ? (discord_role_id || null) : rank.discord_role_id,
      rank.id
    );
    const updated = db.prepare('SELECT * FROM ranks WHERE id = ?').get(rank.id);
    res.json(updated);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Rank name already exists' });
    res.status(500).json({ error: 'Failed to update rank' });
  }
});

// DELETE /api/ranks/:id — delete rank (admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const rank = db.prepare('SELECT * FROM ranks WHERE id = ?').get(req.params.id);
  if (!rank) return res.status(404).json({ error: 'Rank not found' });
  if (rank.icon_url) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(rank.icon_url))); } catch {}
  }
  db.prepare('DELETE FROM ranks WHERE id = ?').run(rank.id);
  res.json({ success: true });
});

// POST /api/ranks/:id/icon — upload rank icon (admin only), resized to max 64×64px
router.post('/:id/icon', authenticate, requireAdmin, upload.rankIconUpload.single('icon'), upload.compressRankIcon, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const db = getDb();
  const rank = db.prepare('SELECT * FROM ranks WHERE id = ?').get(req.params.id);
  if (!rank) return res.status(404).json({ error: 'Rank not found' });
  if (rank.icon_url) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(rank.icon_url))); } catch {}
  }
  const url = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE ranks SET icon_url = ? WHERE id = ?').run(url, rank.id);
  res.json({ icon_url: url });
});

// DELETE /api/ranks/:id/icon — remove rank icon (admin only)
router.delete('/:id/icon', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const rank = db.prepare('SELECT * FROM ranks WHERE id = ?').get(req.params.id);
  if (!rank) return res.status(404).json({ error: 'Rank not found' });
  if (rank.icon_url) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(rank.icon_url))); } catch {}
  }
  db.prepare('UPDATE ranks SET icon_url = NULL WHERE id = ?').run(rank.id);
  res.json({ success: true });
});

module.exports = router;
