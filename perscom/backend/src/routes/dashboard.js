const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticate, (req, res) => {
  const db = getDb();

  const totalPersonnel = db.prepare('SELECT COUNT(*) as c FROM personnel').get().c;
  const marines = db.prepare("SELECT COUNT(*) as c FROM personnel WHERE status = 'Marine'").get().c;
  const civilians = db.prepare("SELECT COUNT(*) as c FROM personnel WHERE status = 'Civilian'").get().c;

  // Count Marines with evals due (none in last 30 days)
  const allMarines = db.prepare("SELECT id FROM personnel WHERE status = 'Marine'").all();
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  let pendingEvals = 0;
  for (const m of allMarines) {
    const lastEval = db.prepare(
      'SELECT evaluated_at FROM evaluations WHERE personnel_id = ? ORDER BY evaluated_at DESC LIMIT 1'
    ).get(m.id);
    if (!lastEval || lastEval.evaluated_at < thirtyDaysAgo) {
      pendingEvals++;
    }
  }

  const activeOps = db.prepare(
    "SELECT COUNT(*) as c FROM operations WHERE end_date IS NULL OR date(end_date) >= date('now')"
  ).get().c;

  const recentActivity = db.prepare(`
    SELECT al.*, u.display_name as user_name
    FROM activity_log al
    LEFT JOIN users u ON al.user_id = u.id
    ORDER BY al.created_at DESC
    LIMIT 10
  `).all();

  const latestAnnouncement = db.prepare(`
    SELECT a.*, u.display_name as created_by_name
    FROM announcements a
    JOIN users u ON a.created_by = u.id
    ORDER BY a.created_at DESC
    LIMIT 1
  `).get();

  // Next upcoming operation or training
  const nextOp = db.prepare(`
    SELECT id, title, type, start_date, image_url
    FROM operations
    WHERE date(start_date) >= date('now')
    ORDER BY start_date ASC
    LIMIT 1
  `).get() || null;

  // Personnel growth — cumulative count by registration date
  const growthRows = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM personnel
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all();
  let cumulative = 0;
  const personnelGrowth = growthRows.map(r => {
    cumulative += r.count;
    return { date: r.date, total: cumulative };
  });

  res.json({
    totalPersonnel,
    marines,
    civilians,
    pendingEvals,
    activeOps,
    recentActivity,
    latestAnnouncement: latestAnnouncement || null,
    nextOp,
    personnelGrowth,
  });
});

module.exports = router;
