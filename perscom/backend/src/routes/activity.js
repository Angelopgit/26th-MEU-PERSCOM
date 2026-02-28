const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 25);
  const offset = (page - 1) * limit;
  const { action, search } = req.query;

  let where = 'WHERE 1=1';
  const params = [];

  if (action) {
    where += ' AND a.action = ?';
    params.push(action);
  }
  if (search) {
    where += ' AND (a.details LIKE ? OR u.display_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const total = db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM activity_log a
    LEFT JOIN users u ON a.user_id = u.id
    ${where}
  `).get(...params).cnt;

  const rows = db.prepare(`
    SELECT a.id, a.action, a.details, a.created_at,
           u.display_name AS user_name
    FROM activity_log a
    LEFT JOIN users u ON a.user_id = u.id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ total, page, limit, pages: Math.ceil(total / limit), rows });
});

module.exports = router;
