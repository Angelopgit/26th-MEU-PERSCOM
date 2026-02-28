const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logoUpload } = require('../middleware/upload');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '../../data/uploads');

// GET /api/settings/logo — public, returns current logo URL or null
router.get('/logo', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('logo_url');
  res.json({ logo_url: row ? row.value : null });
});

// POST /api/settings/logo — admin only, upload new logo
router.post('/logo', authenticate, requireAdmin, logoUpload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const db = getDb();
  const ext = path.extname(req.file.originalname).toLowerCase();

  // Remove any previously stored logo files with different extensions
  ['logo.jpg', 'logo.jpeg', 'logo.png', 'logo.gif', 'logo.webp'].forEach((f) => {
    if (f !== `logo${ext}`) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, f)); } catch {}
    }
  });

  const url = `/uploads/logo${ext}`;
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('logo_url', url);
  res.json({ logo_url: url });
});

// DELETE /api/settings/logo — admin only, remove logo
router.delete('/logo', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('logo_url');
  if (row) {
    const filePath = path.join(UPLOAD_DIR, path.basename(row.value));
    try { fs.unlinkSync(filePath); } catch {}
    db.prepare('DELETE FROM settings WHERE key = ?').run('logo_url');
  }
  res.json({ success: true });
});

module.exports = router;
