const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin, requireStaff } = require('../middleware/auth');
const { logActivity } = require('../utils/logActivity');

const router = express.Router();

const VALID_ROLES = ['admin', 'moderator', 'marine'];

// List all users (staff only — admins and moderators)
router.get('/', authenticate, requireStaff, (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.role,
           u.discord_id, u.discord_username, u.discord_avatar,
           u.personnel_id, u.created_at,
           p.name as personnel_name, p.rank as personnel_rank
    FROM users u
    LEFT JOIN personnel p ON u.personnel_id = p.id
    ORDER BY u.created_at DESC
  `).all();

  res.json(users);
});

// Change a user's role (admin only)
router.patch('/:id/role', authenticate, requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Prevent demoting yourself
  if (user.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot change your own role' });
  }

  const oldRole = user.role;
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);

  logActivity(
    'ROLE_CHANGED',
    `${user.display_name}: ${oldRole} → ${role}`,
    req.user.id
  );

  res.json({ success: true, id: user.id, role });
});

module.exports = router;
