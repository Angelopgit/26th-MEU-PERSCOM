const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, authenticateAny } = require('../middleware/auth');
const { logActivity } = require('../utils/logActivity');

const router = express.Router();

function isDIorStaff(user) {
  return user.is_di === 1 || user.is_di === true ||
    user.role === 'admin' || user.role === 'moderator';
}

function parseRecurDays(raw) {
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

// Compute next N upcoming dates for a recurring class (returns YYYY-MM-DD strings)
function getNextOccurrences(recurDaysRaw, count = 4) {
  const days = parseRecurDays(recurDaysRaw);
  if (!days.length) return [];
  const results = [];
  const now = new Date();
  for (let i = 0; i <= 28 && results.length < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    if (days.includes(d.getDay()) || days.includes(String(d.getDay()))) {
      results.push(d.toISOString().split('T')[0]);
    }
  }
  return results;
}

// GET /api/soi/classes — list all active classes with enrollment counts
router.get('/classes', authenticateAny, (req, res) => {
  const db = getDb();
  const classes = db.prepare(`
    SELECT sc.*,
      u.display_name  AS instructor_name,
      u.discord_id    AS instructor_discord_id,
      u.discord_avatar AS instructor_avatar,
      COUNT(CASE WHEN se.status = 'enrolled' THEN 1 END) AS enrolled_count
    FROM soi_classes sc
    LEFT JOIN users u ON sc.instructor_id = u.id
    LEFT JOIN soi_enrollments se ON sc.id = se.class_id
    WHERE sc.status != 'cancelled'
    GROUP BY sc.id
    ORDER BY sc.is_recurring DESC, sc.scheduled_date ASC, sc.created_at DESC
  `).all();

  const enriched = classes.map(c => ({
    ...c,
    recur_days: parseRecurDays(c.recur_days),
    next_occurrences: c.is_recurring ? getNextOccurrences(c.recur_days) : null,
  }));

  res.json(enriched);
});

// GET /api/soi/my — current user's SOI status and enrollments
router.get('/my', authenticateAny, (req, res) => {
  const db = getDb();
  const enrollments = db.prepare(`
    SELECT se.id, se.class_id, se.status, se.enrolled_at,
      sc.title, sc.scheduled_date, sc.scheduled_time, sc.is_recurring,
      sc.recur_days, sc.duration_minutes, u.display_name AS instructor_name
    FROM soi_enrollments se
    JOIN soi_classes sc ON se.class_id = sc.id
    LEFT JOIN users u ON sc.instructor_id = u.id
    WHERE se.user_id = ?
    ORDER BY se.enrolled_at DESC
  `).all(req.user.id);

  res.json({
    enrollments,
    soi_complete: enrollments.some(e => e.status === 'completed'),
  });
});

// GET /api/soi/classes/:id/roster — class roster (DI or staff)
router.get('/classes/:id/roster', authenticate, (req, res) => {
  if (!isDIorStaff(req.user)) {
    return res.status(403).json({ error: 'Drill Instructor or Staff access required' });
  }
  const db = getDb();
  const cls = db.prepare('SELECT * FROM soi_classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  // DIs can only view their own class rosters (staff can view all)
  if (req.user.is_di && !['admin', 'moderator'].includes(req.user.role) &&
      cls.instructor_id !== req.user.id) {
    return res.status(403).json({ error: 'Access restricted to class instructor' });
  }

  const roster = db.prepare(`
    SELECT se.id, se.user_id, se.status, se.enrolled_at,
      u.display_name, u.discord_id, u.discord_avatar,
      p.rank, p.name AS personnel_name
    FROM soi_enrollments se
    JOIN users u ON se.user_id = u.id
    LEFT JOIN personnel p ON u.personnel_id = p.id
    WHERE se.class_id = ?
    ORDER BY se.enrolled_at ASC
  `).all(req.params.id);

  res.json({ class: cls, roster });
});

// POST /api/soi/classes — create class (DI or staff only)
router.post('/classes', authenticate, (req, res) => {
  if (!isDIorStaff(req.user)) {
    return res.status(403).json({ error: 'Drill Instructor or Staff access required' });
  }

  const { title, description, scheduled_date, scheduled_time, duration_minutes,
          max_capacity, is_recurring, recur_days } = req.body;

  if (!title?.trim() || !scheduled_time) {
    return res.status(400).json({ error: 'Title and time are required' });
  }
  if (!is_recurring && !scheduled_date) {
    return res.status(400).json({ error: 'Date required for non-recurring classes' });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO soi_classes
      (title, description, instructor_id, scheduled_date, scheduled_time,
       duration_minutes, max_capacity, is_recurring, recur_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(),
    description?.trim() || null,
    req.user.id,
    is_recurring ? null : (scheduled_date || null),
    scheduled_time,
    duration_minutes || 90,
    max_capacity || 10,
    is_recurring ? 1 : 0,
    JSON.stringify(Array.isArray(recur_days) ? recur_days : [])
  );

  logActivity('SOI_CLASS_CREATED', `${req.user.display_name} created SOI class: ${title.trim()}`, req.user.id);

  const created = db.prepare(`
    SELECT sc.*, u.display_name AS instructor_name
    FROM soi_classes sc LEFT JOIN users u ON sc.instructor_id = u.id
    WHERE sc.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ ...created, recur_days: parseRecurDays(created.recur_days), enrolled_count: 0 });
});

// PUT /api/soi/classes/:id — update class
router.put('/classes/:id', authenticate, (req, res) => {
  if (!isDIorStaff(req.user)) {
    return res.status(403).json({ error: 'Drill Instructor or Staff access required' });
  }
  const db = getDb();
  const cls = db.prepare('SELECT * FROM soi_classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  if (req.user.is_di && !['admin', 'moderator'].includes(req.user.role) &&
      cls.instructor_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own classes' });
  }

  const { title, description, scheduled_date, scheduled_time, duration_minutes,
          max_capacity, is_recurring, recur_days, status } = req.body;

  const newIsRecurring = is_recurring !== undefined ? (is_recurring ? 1 : 0) : cls.is_recurring;

  db.prepare(`
    UPDATE soi_classes SET
      title = ?, description = ?, scheduled_date = ?, scheduled_time = ?,
      duration_minutes = ?, max_capacity = ?, is_recurring = ?, recur_days = ?,
      status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title?.trim() ?? cls.title,
    description?.trim() ?? cls.description,
    newIsRecurring ? null : (scheduled_date ?? cls.scheduled_date),
    scheduled_time ?? cls.scheduled_time,
    duration_minutes ?? cls.duration_minutes,
    max_capacity ?? cls.max_capacity,
    newIsRecurring,
    JSON.stringify(Array.isArray(recur_days) ? recur_days : parseRecurDays(cls.recur_days)),
    status ?? cls.status,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM soi_classes WHERE id = ?').get(req.params.id);
  res.json({ ...updated, recur_days: parseRecurDays(updated.recur_days) });
});

// DELETE /api/soi/classes/:id
router.delete('/classes/:id', authenticate, (req, res) => {
  if (!isDIorStaff(req.user)) {
    return res.status(403).json({ error: 'Drill Instructor or Staff access required' });
  }
  const db = getDb();
  const cls = db.prepare('SELECT * FROM soi_classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  if (req.user.is_di && !['admin', 'moderator'].includes(req.user.role) &&
      cls.instructor_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own classes' });
  }

  db.prepare('DELETE FROM soi_classes WHERE id = ?').run(req.params.id);
  logActivity('SOI_CLASS_DELETED', `${req.user.display_name} deleted SOI class: ${cls.title}`, req.user.id);
  res.json({ success: true });
});

// POST /api/soi/classes/:id/enroll — enroll current user
router.post('/classes/:id/enroll', authenticateAny, (req, res) => {
  const db = getDb();
  const cls = db.prepare('SELECT * FROM soi_classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  if (cls.status === 'cancelled') return res.status(400).json({ error: 'Class is cancelled' });
  if (cls.status === 'completed') return res.status(400).json({ error: 'Class already completed' });

  const { count } = db.prepare(
    "SELECT COUNT(*) as count FROM soi_enrollments WHERE class_id = ? AND status = 'enrolled'"
  ).get(req.params.id);

  if (count >= cls.max_capacity) {
    return res.status(400).json({ error: 'Class is full' });
  }

  try {
    db.prepare('INSERT INTO soi_enrollments (class_id, user_id) VALUES (?, ?)').run(
      req.params.id, req.user.id
    );

    // Mark full if at capacity
    if (count + 1 >= cls.max_capacity) {
      db.prepare("UPDATE soi_classes SET status = 'full' WHERE id = ?").run(req.params.id);
    }

    logActivity('SOI_ENROLLED', `${req.user.display_name} enrolled in: ${cls.title}`, req.user.id);
    res.status(201).json({ success: true });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Already enrolled in this class' });
    }
    res.status(500).json({ error: 'Enrollment failed' });
  }
});

// DELETE /api/soi/classes/:id/enroll — withdraw current user
router.delete('/classes/:id/enroll', authenticateAny, (req, res) => {
  const db = getDb();
  const enrollment = db.prepare(
    'SELECT * FROM soi_enrollments WHERE class_id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!enrollment) return res.status(404).json({ error: 'Not enrolled in this class' });
  if (enrollment.status === 'completed') {
    return res.status(400).json({ error: 'Cannot withdraw from a completed class' });
  }

  db.prepare('DELETE FROM soi_enrollments WHERE class_id = ? AND user_id = ?').run(
    req.params.id, req.user.id
  );

  // Re-open class if it was full
  const cls = db.prepare('SELECT * FROM soi_classes WHERE id = ?').get(req.params.id);
  if (cls?.status === 'full') {
    db.prepare("UPDATE soi_classes SET status = 'open' WHERE id = ?").run(req.params.id);
  }

  res.json({ success: true });
});

// POST /api/soi/classes/:id/graduate/:userId — mark student as completed (DI or staff)
router.post('/classes/:id/graduate/:userId', authenticate, (req, res) => {
  if (!isDIorStaff(req.user)) {
    return res.status(403).json({ error: 'Drill Instructor or Staff access required' });
  }
  const db = getDb();
  const enrollment = db.prepare(
    'SELECT * FROM soi_enrollments WHERE class_id = ? AND user_id = ?'
  ).get(req.params.id, req.params.userId);

  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

  db.prepare("UPDATE soi_enrollments SET status = 'completed' WHERE class_id = ? AND user_id = ?")
    .run(req.params.id, req.params.userId);

  const user = db.prepare('SELECT display_name FROM users WHERE id = ?').get(req.params.userId);
  const cls  = db.prepare('SELECT title FROM soi_classes WHERE id = ?').get(req.params.id);
  logActivity('SOI_GRADUATED', `${user?.display_name} graduated SOI: ${cls?.title}`, req.user.id);

  res.json({ success: true });
});

// POST /api/soi/classes/:id/no-show/:userId — mark no-show (DI or staff)
router.post('/classes/:id/no-show/:userId', authenticate, (req, res) => {
  if (!isDIorStaff(req.user)) {
    return res.status(403).json({ error: 'Drill Instructor or Staff access required' });
  }
  const db = getDb();
  const enrollment = db.prepare(
    'SELECT * FROM soi_enrollments WHERE class_id = ? AND user_id = ?'
  ).get(req.params.id, req.params.userId);
  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

  db.prepare("UPDATE soi_enrollments SET status = 'no_show' WHERE class_id = ? AND user_id = ?")
    .run(req.params.id, req.params.userId);

  res.json({ success: true });
});

module.exports = router;
