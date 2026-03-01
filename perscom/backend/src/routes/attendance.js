const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/attendance/personnel/:id — attendance history for a marine (visible to all authenticated users)
router.get('/personnel/:id', authenticate, (req, res) => {
  const db = getDb();

  const rows = db.prepare(`
    SELECT
      a.id,
      a.operation_id,
      a.created_at,
      o.title,
      o.type,
      o.start_date,
      u.display_name AS marked_by_name
    FROM attendance a
    JOIN operations o ON a.operation_id = o.id
    JOIN users u ON a.marked_by = u.id
    WHERE a.personnel_id = ?
    ORDER BY o.start_date DESC
  `).all(req.params.id);

  const total = rows.length;
  const ops = rows.filter(r => r.type === 'Operation').length;
  const trainings = rows.filter(r => r.type === 'Training').length;

  res.json({ total, ops, trainings, records: rows });
});

module.exports = router;
