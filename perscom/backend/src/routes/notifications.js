const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, requireStaff } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications — staff only, returns pending application count + active LOAs
router.get('/', authenticate, requireStaff, (req, res) => {
  const db = getDb();

  const { count: pending_applications } = db.prepare(
    "SELECT COUNT(*) as count FROM applications WHERE status = 'pending'"
  ).get();

  const active_loas = db.prepare(`
    SELECT p.id, p.name, p.rank, p.loa_start_date, p.loa_end_date, p.loa_reason
    FROM personnel p
    WHERE p.member_status = 'Leave of Absence'
    ORDER BY p.name ASC
  `).all();

  res.json({
    pending_applications,
    active_loas,
    total: pending_applications + active_loas.length,
  });
});

module.exports = router;
