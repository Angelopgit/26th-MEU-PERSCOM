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

// Pre-register a marine by Discord ID (admin only).
// Creates the personnel + user record so the next Discord OAuth login succeeds directly
// without requiring the user to complete the /register form themselves.
router.post('/discord/pre-register', authenticate, requireAdmin, (req, res) => {
  const { discord_id, display_name, role = 'marine' } = req.body;

  if (!discord_id || !display_name || display_name.trim().length < 2) {
    return res.status(400).json({ error: 'discord_id and display_name are required.' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
  }

  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE discord_id = ?').get(discord_id);
  if (existing) {
    return res.status(409).json({ error: 'A user with that Discord ID is already registered.' });
  }

  const today = new Date().toISOString().split('T')[0];

  const pResult = db.prepare(
    'INSERT INTO personnel (name, status, rank, rank_since, date_of_entry, member_status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(display_name.trim(), 'Marine', 'Recruit', today, today, 'Active');

  const personnelId = pResult.lastInsertRowid;

  const uResult = db.prepare(
    'INSERT INTO users (display_name, role, discord_id, personnel_id) VALUES (?, ?, ?, ?)'
  ).run(display_name.trim(), role, discord_id, personnelId);

  const userId = uResult.lastInsertRowid;

  db.prepare('UPDATE personnel SET user_id = ? WHERE id = ?').run(userId, personnelId);

  logActivity(
    'MARINE_REGISTERED',
    `${display_name.trim()} pre-registered by admin (Discord ID: ${discord_id})`,
    req.user.id
  );

  res.json({ success: true, user_id: userId, personnel_id: personnelId, discord_id, display_name: display_name.trim(), role });
});

// Look up a user by Discord ID — admin diagnostic tool for troubleshooting login failures
router.get('/discord/:discord_id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const user = db.prepare(`
    SELECT u.id, u.display_name, u.role, u.discord_id, u.discord_username,
           u.discord_avatar, u.personnel_id, u.created_at,
           p.name AS personnel_name, p.rank AS personnel_rank, p.member_status
    FROM users u
    LEFT JOIN personnel p ON u.personnel_id = p.id
    WHERE u.discord_id = ?
  `).get(req.params.discord_id);

  if (!user) {
    return res.json({ registered: false, discord_id: req.params.discord_id });
  }
  res.json({ registered: true, ...user });
});

module.exports = router;
