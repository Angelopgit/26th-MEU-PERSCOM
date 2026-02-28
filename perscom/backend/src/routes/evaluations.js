const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Evaluation status for all Marines (DUE / OVERDUE / CURRENT)
router.get('/status', authenticate, (req, res) => {
  const db = getDb();
  const marines = db.prepare("SELECT * FROM personnel WHERE status = 'Marine' ORDER BY name ASC").all();
  const now = new Date();

  const result = marines.map((marine) => {
    const lastEval = db.prepare(
      'SELECT * FROM evaluations WHERE personnel_id = ? ORDER BY evaluated_at DESC LIMIT 1'
    ).get(marine.id);

    let evalStatus = 'DUE';
    let daysSince = null;

    if (lastEval) {
      const evalDate = new Date(lastEval.evaluated_at);
      daysSince = Math.floor((now - evalDate) / (24 * 60 * 60 * 1000));
      evalStatus = daysSince > 30 ? 'OVERDUE' : 'CURRENT';
    }

    return {
      ...marine,
      last_evaluation: lastEval || null,
      days_since_eval: daysSince,
      eval_status: evalStatus,
    };
  });

  res.json(result);
});

// All evaluations (optionally filtered by personnel)
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { personnel_id } = req.query;

  let query = `
    SELECT e.*, p.name as personnel_name, p.rank, u.display_name as evaluator_name
    FROM evaluations e
    JOIN personnel p ON e.personnel_id = p.id
    JOIN users u ON e.evaluator_id = u.id
  `;
  const params = [];

  if (personnel_id) {
    query += ' WHERE e.personnel_id = ?';
    params.push(personnel_id);
  }

  query += ' ORDER BY e.evaluated_at DESC';

  res.json(db.prepare(query).all(...params));
});

// Create evaluation
router.post('/', authenticate, (req, res) => {
  const { personnel_id, behavior_meets, attendance_met, notes } = req.body;
  if (!personnel_id) return res.status(400).json({ error: 'Personnel ID required' });

  const db = getDb();
  const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(personnel_id);
  if (!person) return res.status(404).json({ error: 'Personnel not found' });

  const result = db.prepare(
    'INSERT INTO evaluations (personnel_id, evaluator_id, behavior_meets, attendance_met, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(
    personnel_id,
    req.user.id,
    behavior_meets ? 1 : 0,
    attendance_met ? 1 : 0,
    notes || null
  );

  db.prepare('INSERT INTO activity_log (action, details, user_id) VALUES (?, ?, ?)').run(
    'EVALUATION_CONDUCTED',
    `Evaluated ${person.name}`,
    req.user.id
  );

  const evaluation = db.prepare(`
    SELECT e.*, p.name as personnel_name, u.display_name as evaluator_name
    FROM evaluations e
    JOIN personnel p ON e.personnel_id = p.id
    JOIN users u ON e.evaluator_id = u.id
    WHERE e.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(evaluation);
});

module.exports = router;
