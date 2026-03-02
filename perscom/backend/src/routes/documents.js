const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { logActivity } = require('../utils/logActivity');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '../../data/uploads');

function getDocWithImages(db, id) {
  const doc = db.prepare(`
    SELECT d.*, u.display_name AS author
    FROM documents d
    LEFT JOIN users u ON u.id = d.created_by
    WHERE d.id = ?
  `).get(id);
  if (!doc) return null;
  doc.images = db.prepare('SELECT id, image_url FROM document_images WHERE document_id = ? ORDER BY id ASC').all(id);
  doc.files = db.prepare('SELECT id, file_url, file_name, file_type FROM document_files WHERE document_id = ? ORDER BY id ASC').all(id);
  return doc;
}

// GET /api/documents — all authenticated users (including guests)
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT d.*, u.display_name AS author
    FROM documents d
    LEFT JOIN users u ON u.id = d.created_by
    ORDER BY d.created_at DESC
  `).all();
  // Attach images and files to each document
  for (const row of rows) {
    row.images = db.prepare('SELECT id, image_url FROM document_images WHERE document_id = ? ORDER BY id ASC').all(row.id);
    row.files = db.prepare('SELECT id, file_url, file_name, file_type FROM document_files WHERE document_id = ? ORDER BY id ASC').all(row.id);
  }
  res.json(rows);
});

// GET /api/documents/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const doc = getDocWithImages(db, req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

// POST /api/documents — admin only
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, content } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  try {
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO documents (title, content, created_by) VALUES (?, ?, ?)'
    ).run(title.trim(), content || '', req.user.id);

    logActivity('DOCUMENT_CREATED', `Document created: "${title.trim()}"`, req.user.id);

    res.status(201).json(getDocWithImages(db, result.lastInsertRowid));
  } catch (err) {
    console.error('[DOCUMENTS] POST error:', err.message);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// PUT /api/documents/:id — admin only
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { title, content } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM documents WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    db.prepare(
      'UPDATE documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(title.trim(), content || '', req.params.id);

    logActivity('DOCUMENT_UPDATED', `Document updated: "${title.trim()}"`, req.user.id);

    res.json({ success: true });
  } catch (err) {
    console.error('[DOCUMENTS] PUT error:', err.message);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /api/documents/:id — admin only
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const doc = db.prepare('SELECT title FROM documents WHERE id = ?').get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Clean up any associated image files
    const images = db.prepare('SELECT image_url FROM document_images WHERE document_id = ?').all(req.params.id);
    for (const img of images) {
      const filePath = path.join(UPLOAD_DIR, path.basename(img.image_url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
    logActivity('DOCUMENT_DELETED', `Document deleted: "${doc.title}"`, req.user.id);

    res.json({ success: true });
  } catch (err) {
    console.error('[DOCUMENTS] DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// POST /api/documents/:id/images — upload image (admin only)
router.post('/:id/images', authenticate, requireAdmin, upload.documentUpload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });

  const db = getDb();
  const doc = db.prepare('SELECT id FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const imageUrl = `/uploads/${req.file.filename}`;
  const result = db.prepare(
    'INSERT INTO document_images (document_id, image_url) VALUES (?, ?)'
  ).run(req.params.id, imageUrl);

  res.status(201).json({ id: result.lastInsertRowid, image_url: imageUrl });
});

// POST /api/documents/:id/files — upload PDF or DOCX (admin only)
router.post('/:id/files', authenticate, requireAdmin, upload.docFileUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const db = getDb();
  const doc = db.prepare('SELECT id FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const ext = require('path').extname(req.file.originalname).toLowerCase().replace('.', '');
  const fileUrl = `/uploads/${req.file.filename}`;
  const result = db.prepare(
    'INSERT INTO document_files (document_id, file_url, file_name, file_type) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, fileUrl, req.file.originalname, ext);

  res.status(201).json({ id: result.lastInsertRowid, file_url: fileUrl, file_name: req.file.originalname, file_type: ext });
});

// DELETE /api/documents/:id/files/:fileId — delete uploaded file (admin only)
router.delete('/:id/files/:fileId', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const file = db.prepare(
    'SELECT * FROM document_files WHERE id = ? AND document_id = ?'
  ).get(req.params.fileId, req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const filePath = require('path').join(UPLOAD_DIR, require('path').basename(file.file_url));
  if (require('fs').existsSync(filePath)) require('fs').unlinkSync(filePath);

  db.prepare('DELETE FROM document_files WHERE id = ?').run(req.params.fileId);
  res.json({ success: true });
});

// DELETE /api/documents/:id/images/:imageId — delete image (admin only)
router.delete('/:id/images/:imageId', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const img = db.prepare(
    'SELECT * FROM document_images WHERE id = ? AND document_id = ?'
  ).get(req.params.imageId, req.params.id);
  if (!img) return res.status(404).json({ error: 'Image not found' });

  const filePath = path.join(UPLOAD_DIR, path.basename(img.image_url));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM document_images WHERE id = ?').run(req.params.imageId);
  res.json({ success: true });
});

module.exports = router;
