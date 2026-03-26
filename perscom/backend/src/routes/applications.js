const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb } = require('../config/database');
const { authenticate, requireStaff } = require('../middleware/auth');
const { addApprovedRoles, checkApplicantRoles } = require('../discord/bot');
const { announceApplicationApproved, announceApplicationDenied } = require('../discord/announcer');

const router = express.Router();

// ── POST /api/applications/check-discord (public) ────────────────────────────
// Check if a Discord user is eligible to apply.
router.post('/check-discord', async (req, res) => {
  const { discord_id } = req.body;
  if (!discord_id) {
    return res.status(400).json({ error: 'discord_id is required' });
  }

  try {
    // If bot is not available, allow through so the portal still works
    if (!process.env.DISCORD_BOT_TOKEN) {
      return res.json({ eligible: true, reason: null, has_personnel_role: false, in_guild: true });
    }

    const result = await checkApplicantRoles(discord_id);
    return res.json(result);
  } catch (err) {
    console.error('[APPLICATIONS] check-discord error:', err.message);
    return res.json({ eligible: true, reason: null, has_personnel_role: false, in_guild: true });
  }
});

// ── GET /api/applications/status (public) ────────────────────────────────────
// Returns the most recent application status for a discord_id.
router.get('/status', (req, res) => {
  const { discord_id } = req.query;
  if (!discord_id) {
    return res.status(400).json({ error: 'discord_id is required' });
  }

  try {
    const db = getDb();
    const app = db.prepare(`
      SELECT status, denial_reason, submitted_at
      FROM applications
      WHERE discord_id = ?
      ORDER BY submitted_at DESC
      LIMIT 1
    `).get(discord_id);

    if (!app) {
      return res.json({ status: 'none' });
    }

    return res.json({
      status: app.status,
      denial_reason: app.denial_reason,
      submitted_at: app.submitted_at,
    });
  } catch (err) {
    console.error('[APPLICATIONS] status error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/applications (public) ──────────────────────────────────────────
// Submit an application.
router.post('/', (req, res) => {
  const {
    discord_id,
    discord_username,
    discord_avatar,
    first_name,
    last_name,
    age,
    platform,
    desired_role,
    referred_by,
    reforger_experience,
    other_unit,
    other_unit_conflict,
    how_heard,
    why_join,
    long_term_commitment,
    na_timezone,
  } = req.body;

  if (!discord_id) {
    return res.status(400).json({ error: 'Discord ID is required' });
  }

  try {
    const db = getDb();

    // Check for existing pending or accepted application
    const existing = db.prepare(`
      SELECT id, status, reviewed_at
      FROM applications
      WHERE discord_id = ?
      ORDER BY submitted_at DESC
      LIMIT 1
    `).get(discord_id);

    if (existing) {
      if (existing.status === 'pending' || existing.status === 'accepted') {
        return res.status(409).json({
          error: existing.status === 'accepted'
            ? 'You already have an accepted application. Login to PERSCOM.'
            : 'You already have a pending application under review.',
        });
      }

      if (existing.status === 'rejected') {
        // Enforce 72-hour cooldown after rejection
        const reviewedAt = new Date(existing.reviewed_at);
        const hoursSince = (Date.now() - reviewedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 72) {
          const hoursRemaining = Math.ceil(72 - hoursSince);
          return res.status(429).json({
            error: `You must wait ${hoursRemaining} more hour(s) before reapplying.`,
          });
        }
      }
    }

    const result = db.prepare(`
      INSERT INTO applications (
        discord_id, discord_username, discord_avatar,
        first_name, last_name, age, platform,
        desired_role, referred_by, reforger_experience,
        other_unit, other_unit_conflict, how_heard, why_join,
        long_term_commitment, na_timezone, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      discord_id,
      discord_username || '',
      discord_avatar || null,
      first_name,
      last_name,
      age,
      platform,
      desired_role,
      referred_by || null,
      reforger_experience,
      other_unit || null,
      other_unit_conflict || null,
      how_heard,
      why_join,
      long_term_commitment ? 1 : 0,
      na_timezone ? 1 : 0,
    );

    return res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error('[APPLICATIONS] submit error:', err.message, err.stack);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ── POST /api/applications/staff-test (staff only) ───────────────────────────
// Bypasses all Discord role/cooldown checks so staff can test the full flow.
router.post('/staff-test', authenticate, requireStaff, (req, res) => {
  const {
    discord_id,
    discord_username,
    discord_avatar,
    first_name,
    last_name,
    age,
    platform,
    desired_role,
    referred_by,
    reforger_experience,
    other_unit,
    other_unit_conflict,
    how_heard,
    why_join,
    long_term_commitment,
    na_timezone,
  } = req.body;

  if (!discord_id || !first_name || !last_name) {
    return res.status(400).json({ error: 'discord_id, first_name, and last_name are required' });
  }

  try {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO applications (
        discord_id, discord_username, discord_avatar,
        first_name, last_name, age, platform,
        desired_role, referred_by, reforger_experience,
        other_unit, other_unit_conflict, how_heard, why_join,
        long_term_commitment, na_timezone, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      discord_id,
      discord_username || '',
      discord_avatar || null,
      first_name,
      last_name,
      age || 0,
      platform || 'PC',
      desired_role || 'Rifleman',
      referred_by || null,
      reforger_experience || '',
      other_unit || null,
      other_unit_conflict || null,
      how_heard || 'Staff Test',
      why_join || 'Staff test submission.',
      long_term_commitment ? 1 : 0,
      na_timezone ? 1 : 0,
    );
    return res.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error('[APPLICATIONS] staff-test error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/applications/mine (self — authenticated) ────────────────────────
// Returns the current user's most recent application by their discord_id.
// Only returns data when the user has a discord_id linked to their account.
router.get('/mine', authenticate, (req, res) => {
  const { discord_id } = req.user;
  if (!discord_id) {
    return res.json({ application: null });
  }
  try {
    const db = getDb();
    const app = db.prepare(`
      SELECT a.*, u.display_name as reviewed_by_name
      FROM applications a
      LEFT JOIN users u ON a.reviewed_by = u.id
      WHERE a.discord_id = ?
      ORDER BY a.submitted_at DESC
      LIMIT 1
    `).get(discord_id);
    return res.json({ application: app || null });
  } catch (err) {
    console.error('[APPLICATIONS] mine error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/applications (staff only) ───────────────────────────────────────
// Returns all applications, optionally filtered by status.
router.get('/', authenticate, requireStaff, (req, res) => {
  const { status } = req.query;

  try {
    const db = getDb();
    let query = `
      SELECT a.*, u.display_name as reviewed_by_name
      FROM applications a
      LEFT JOIN users u ON a.reviewed_by = u.id
    `;
    const params = [];

    if (status && ['pending', 'accepted', 'rejected', 'review'].includes(status)) {
      query += ' WHERE a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.submitted_at DESC';

    const apps = db.prepare(query).all(...params);
    return res.json(apps);
  } catch (err) {
    console.error('[APPLICATIONS] list error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/applications/:id (staff only) ───────────────────────────────────
router.get('/:id', authenticate, requireStaff, (req, res) => {
  try {
    const db = getDb();
    const app = db.prepare(`
      SELECT a.*, u.display_name as reviewed_by_name
      FROM applications a
      LEFT JOIN users u ON a.reviewed_by = u.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }

    return res.json(app);
  } catch (err) {
    console.error('[APPLICATIONS] get error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/applications/:id/review (staff only) ──────────────────────────
router.patch('/:id/review', authenticate, requireStaff, async (req, res) => {
  const { status, denial_reason } = req.body;

  const validStatuses = ['pending', 'accepted', 'rejected', 'review'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  if (status === 'rejected' && !denial_reason) {
    return res.status(400).json({ error: 'denial_reason is required when rejecting' });
  }

  try {
    const db = getDb();
    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);

    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    if (status === 'accepted') {
      const firstInitial = (app.first_name || '').charAt(0).toUpperCase();
      const lastName = app.last_name || '';
      const marineName = `${firstInitial}. ${lastName}`;

      // Check if a user already exists with this discord_id (e.g. staff testing their own app)
      const existingUser = db.prepare('SELECT id, personnel_id FROM users WHERE discord_id = ?').get(app.discord_id);

      let personnelId;

      if (existingUser) {
        // User already exists — reuse their personnel record if they have one,
        // otherwise create a new personnel record and link it.
        if (existingUser.personnel_id) {
          personnelId = existingUser.personnel_id;
        } else {
          const pResult = db.prepare(`
            INSERT INTO personnel (name, status, rank, rank_since, date_of_entry, member_status)
            VALUES (?, 'Marine', 'Recruit', ?, ?, 'Active')
          `).run(marineName, today, today);
          personnelId = pResult.lastInsertRowid;
          db.prepare('UPDATE users SET personnel_id = ? WHERE id = ?').run(personnelId, existingUser.id);
          db.prepare('UPDATE personnel SET user_id = ? WHERE id = ?').run(existingUser.id, personnelId);
        }
      } else {
        // Create personnel record
        const pResult = db.prepare(`
          INSERT INTO personnel (name, status, rank, rank_since, date_of_entry, member_status)
          VALUES (?, 'Marine', 'Recruit', ?, ?, 'Active')
        `).run(marineName, today, today);

        personnelId = pResult.lastInsertRowid;

        // Generate a random password for the new user
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const passwordHash = bcrypt.hashSync(randomPassword, 10);

        // Create users record
        const uResult = db.prepare(`
          INSERT INTO users (username, password_hash, display_name, role, discord_id, discord_username, discord_avatar, personnel_id)
          VALUES (?, ?, ?, 'marine', ?, ?, ?, ?)
        `).run(
          app.discord_id,
          passwordHash,
          marineName,
          app.discord_id,
          app.discord_username,
          app.discord_avatar,
          personnelId,
        );

        // Link personnel back to user
        db.prepare('UPDATE personnel SET user_id = ? WHERE id = ?')
          .run(uResult.lastInsertRowid, personnelId);
      }

      // Update application
      db.prepare(`
        UPDATE applications
        SET status = 'accepted', personnel_id = ?, reviewed_at = ?, reviewed_by = ?
        WHERE id = ?
      `).run(personnelId, now, req.user.id, app.id);

      // Log activity
      db.prepare(`
        INSERT INTO activity_log (action, details, user_id)
        VALUES ('APPLICATION_ACCEPTED', ?, ?)
      `).run(`Application #${app.id} — ${marineName} (${app.discord_username}) accepted`, req.user.id);

      // Discord announcements / role assignments (non-blocking)
      announceApplicationApproved(app.discord_id, marineName).catch(err => {
        console.error('[APPLICATIONS] announce approved error:', err.message);
      });
      addApprovedRoles(app.discord_id).catch(err => {
        console.error('[APPLICATIONS] addApprovedRoles error:', err.message);
      });

      return res.json({ success: true, personnel_id: personnelId, marine_name: marineName });

    } else if (status === 'rejected') {
      db.prepare(`
        UPDATE applications
        SET status = 'rejected', denial_reason = ?, reviewed_at = ?, reviewed_by = ?
        WHERE id = ?
      `).run(denial_reason, now, req.user.id, app.id);

      db.prepare(`
        INSERT INTO activity_log (action, details, user_id)
        VALUES ('APPLICATION_REJECTED', ?, ?)
      `).run(
        `Application #${app.id} — ${app.discord_username} rejected: ${denial_reason}`,
        req.user.id
      );

      announceApplicationDenied(app.discord_id, denial_reason).catch(err => {
        console.error('[APPLICATIONS] announce denied error:', err.message);
      });

      return res.json({ success: true });

    } else {
      // 'review' or 'pending' — just update status
      db.prepare(`
        UPDATE applications
        SET status = ?, reviewed_at = ?, reviewed_by = ?
        WHERE id = ?
      `).run(status, now, req.user.id, app.id);

      db.prepare(`
        INSERT INTO activity_log (action, details, user_id)
        VALUES ('APPLICATION_STATUS_CHANGED', ?, ?)
      `).run(
        `Application #${app.id} — ${app.discord_username} status → ${status}`,
        req.user.id
      );

      return res.json({ success: true });
    }
  } catch (err) {
    console.error('[APPLICATIONS] review error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
