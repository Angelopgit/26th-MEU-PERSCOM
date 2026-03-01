const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { logActivity } = require('../utils/logActivity');

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
  const { title, description, start_date, end_date, type } = req.body;
  if (!title || !start_date) {
    return res.status(400).json({ error: 'Title and start date are required' });
  }

  const opType = ['Operation', 'Training'].includes(type) ? type : 'Operation';
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO operations (title, description, start_date, end_date, created_by, type) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(title.trim(), description || null, start_date, end_date || null, req.user.id, opType);

  logActivity('OPERATION_CREATED', `${opType}: ${title}`, req.user.id);

  res.status(201).json(getOpWithCreator(db, result.lastInsertRowid));
});

router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { title, description, start_date, end_date, type } = req.body;
  const db = getDb();

  const op = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id);
  if (!op) return res.status(404).json({ error: 'Operation not found' });

  const opType = ['Operation', 'Training'].includes(type) ? type : (op.type || 'Operation');

  db.prepare(
    'UPDATE operations SET title = ?, description = ?, start_date = ?, end_date = ?, type = ? WHERE id = ?'
  ).run(
    title || op.title,
    description !== undefined ? description : op.description,
    start_date || op.start_date,
    end_date !== undefined ? end_date : op.end_date,
    opType,
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

  logActivity('OPERATION_UPDATED', `Image added to: ${op.title}`, req.user.id);

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

// ── Attendance endpoints ───────────────────────────────────────────────────

// GET /api/operations/:id/attendance — list who attended
router.get('/:id/attendance', authenticate, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT a.id, a.personnel_id, a.created_at,
           p.name AS marine_name, p.rank,
           u.display_name AS marked_by_name
    FROM attendance a
    JOIN personnel p ON a.personnel_id = p.id
    JOIN users u ON a.marked_by = u.id
    WHERE a.operation_id = ?
    ORDER BY p.name ASC
  `).all(req.params.id);
  res.json(rows);
});

// POST /api/operations/:id/attendance — mark a marine as attended (admin/mod)
router.post('/:id/attendance', authenticate, requireAdmin, (req, res) => {
  const { personnel_id } = req.body;
  if (!personnel_id) return res.status(400).json({ error: 'personnel_id required' });

  const db = getDb();
  const op = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id);
  if (!op) return res.status(404).json({ error: 'Operation not found' });

  const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(personnel_id);
  if (!person) return res.status(404).json({ error: 'Personnel not found' });

  try {
    db.prepare(
      'INSERT INTO attendance (operation_id, personnel_id, marked_by) VALUES (?, ?, ?)'
    ).run(req.params.id, personnel_id, req.user.id);
  } catch {
    return res.status(409).json({ error: 'Already marked as attended' });
  }

  logActivity('ATTENDANCE_MARKED', `${person.name} marked present for: ${op.title}`, req.user.id);
  res.status(201).json({ success: true });
});

// DELETE /api/operations/:id/attendance/:personnel_id — remove attendance (admin/mod)
router.delete('/:id/attendance/:personnel_id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const result = db.prepare(
    'DELETE FROM attendance WHERE operation_id = ? AND personnel_id = ?'
  ).run(req.params.id, req.params.personnel_id);

  if (result.changes === 0) return res.status(404).json({ error: 'Attendance record not found' });
  res.json({ success: true });
});

module.exports = router;
