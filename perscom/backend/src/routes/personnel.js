const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/logActivity');
const { syncRankToDiscord } = require('../discord/sync');

const router = express.Router();

const RANKS = [
  'Recruit',
  'Private',
  'Private First Class',
  'Lance Corporal',
  'Corporal',
  'Sergeant',
  'Staff Sergeant',
  'Gunnery Sergeant',
  'Master Sergeant',
  'First Sergeant',
  'Master Gunnery Sergeant',
  'Sergeant Major',
  'Second Lieutenant',
  'First Lieutenant',
  'Captain',
  'Major',
  'Lieutenant Colonel',
  'Colonel',
];

const VALID_MEMBER_STATUSES = ['Active', 'Leave of Absence', 'Inactive'];

function getPersonWithDetails(db, id) {
  const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(id);
  if (!person) return null;
  const awards = db.prepare('SELECT * FROM awards WHERE personnel_id = ? ORDER BY awarded_at DESC').all(id);
  const lastEval = db.prepare(
    'SELECT * FROM evaluations WHERE personnel_id = ? ORDER BY evaluated_at DESC LIMIT 1'
  ).get(id);
  return { ...person, awards, last_evaluation: lastEval || null };
}

// List all personnel
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { search, status, member_status } = req.query;

  let query = 'SELECT * FROM personnel WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (member_status) {
    query += ' AND member_status = ?';
    params.push(member_status);
  }

  query += ' ORDER BY status DESC, name ASC';

  const personnel = db.prepare(query).all(...params);
  const awardStmt = db.prepare('SELECT * FROM awards WHERE personnel_id = ? ORDER BY awarded_at DESC');
  const evalStmt = db.prepare(
    'SELECT * FROM evaluations WHERE personnel_id = ? ORDER BY evaluated_at DESC LIMIT 1'
  );

  const result = personnel.map((p) => ({
    ...p,
    awards: awardStmt.all(p.id),
    last_evaluation: evalStmt.get(p.id) || null,
  }));

  res.json(result);
});

// Get single personnel with full details + Discord profile
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(req.params.id);
  if (!person) return res.status(404).json({ error: 'Personnel not found' });

  const awards = db.prepare(
    'SELECT * FROM awards WHERE personnel_id = ? ORDER BY awarded_at DESC'
  ).all(person.id);

  const qualifications = db.prepare(
    'SELECT * FROM qualifications WHERE personnel_id = ? ORDER BY awarded_at DESC'
  ).all(person.id);

  const evaluations = db.prepare(`
    SELECT e.*, u.display_name as evaluator_name
    FROM evaluations e
    JOIN users u ON e.evaluator_id = u.id
    WHERE e.personnel_id = ?
    ORDER BY e.evaluated_at DESC
  `).all(person.id);

  // Fetch linked Discord profile
  const linkedUser = db.prepare(
    'SELECT discord_id, discord_username, discord_avatar FROM users WHERE personnel_id = ?'
  ).get(person.id);

  res.json({
    ...person,
    awards,
    qualifications,
    evaluations,
    discord: linkedUser || null,
  });
});

// Create personnel
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name, status, rank, date_of_entry, member_status } = req.body;
  if (!name || !date_of_entry) {
    return res.status(400).json({ error: 'Name and date of entry are required' });
  }
  if (status === 'Marine' && !rank) {
    return res.status(400).json({ error: 'Rank is required for Marines' });
  }

  const db = getDb();
  const ms = VALID_MEMBER_STATUSES.includes(member_status) ? member_status : 'Active';
  const result = db.prepare(
    'INSERT INTO personnel (name, status, rank, rank_since, date_of_entry, member_status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    name.trim(),
    status || 'Civilian',
    status === 'Marine' ? (rank || 'Recruit') : null,
    status === 'Marine' ? date_of_entry : null,
    date_of_entry,
    ms
  );

  logActivity(
    'PERSONNEL_ADDED',
    `${name} added as ${status || 'Civilian'}${rank ? ` (${rank})` : ''}`,
    req.user.id
  );

  res.status(201).json(getPersonWithDetails(db, result.lastInsertRowid));
});

// Update personnel
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { name, status, rank, date_of_entry } = req.body;
  const db = getDb();

  const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(req.params.id);
  if (!person) return res.status(404).json({ error: 'Personnel not found' });

  const newName = name || person.name;
  const newStatus = status || person.status;
  const newRank = rank !== undefined ? rank : person.rank;
  const newDateOfEntry = date_of_entry || person.date_of_entry;
  const today = new Date().toISOString().split('T')[0];

  const rankChanged = newRank !== person.rank;
  const newRankSince = rankChanged ? today : person.rank_since;

  db.prepare(`
    UPDATE personnel
    SET name = ?, status = ?, rank = ?, rank_since = ?, date_of_entry = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newName, newStatus, newRank, newRankSince, newDateOfEntry, req.params.id);

  if (rankChanged) {
    const oldRankIdx = RANKS.indexOf(person.rank);
    const newRankIdx = RANKS.indexOf(newRank);
    const action = newRankIdx > oldRankIdx ? 'PROMOTED' : 'DEMOTED';
    logActivity(action, `${person.name}: ${person.rank || 'N/A'} → ${newRank || 'N/A'}`, req.user.id);

    // Sync Discord roles if the marine has a linked Discord account
    const linkedUser = db.prepare('SELECT discord_id FROM users WHERE personnel_id = ?').get(req.params.id);
    if (linkedUser?.discord_id) {
      syncRankToDiscord(linkedUser.discord_id, person.rank, newRank).catch(err => {
        console.error('[SYNC] Discord role sync failed:', err.message);
      });
    }
  }

  res.json(getPersonWithDetails(db, req.params.id));
});

// Update member status (Active / Leave of Absence / Inactive) — both roles
router.patch('/:id/member-status', authenticate, (req, res) => {
  const { member_status } = req.body;
  if (!VALID_MEMBER_STATUSES.includes(member_status)) {
    return res.status(400).json({ error: 'Invalid member_status value' });
  }

  const db = getDb();
  const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(req.params.id);
  if (!person) return res.status(404).json({ error: 'Personnel not found' });

  db.prepare(
    'UPDATE personnel SET member_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(member_status, req.params.id);

  logActivity('STATUS_CHANGED', `${person.name}: ${person.member_status} → ${member_status}`, req.user.id);

  res.json({ success: true, member_status });
});

// Delete personnel
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(req.params.id);
  if (!person) return res.status(404).json({ error: 'Personnel not found' });

  db.prepare('DELETE FROM personnel WHERE id = ?').run(req.params.id);
  logActivity('PERSONNEL_REMOVED', `${person.name} removed from roster`, req.user.id);

  res.json({ success: true });
});

// Promote one rank
router.post('/:id/promote', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(req.params.id);
  if (!person) return res.status(404).json({ error: 'Personnel not found' });
  if (person.status !== 'Marine') return res.status(400).json({ error: 'Only Marines can be promoted' });

  const idx = RANKS.indexOf(person.rank);
  if (idx === -1 || idx >= RANKS.length - 1) {
    return res.status(400).json({ error: 'Cannot promote further' });
  }

  const newRank = RANKS[idx + 1];
  const today = new Date().toISOString().split('T')[0];

  db.prepare(
    'UPDATE personnel SET rank = ?, rank_since = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(newRank, today, req.params.id);

  logActivity('PROMOTED', `${person.name}: ${person.rank} → ${newRank}`, req.user.id);

  // Sync Discord roles
  const linkedUser = db.prepare('SELECT discord_id FROM users WHERE personnel_id = ?').get(req.params.id);
  if (linkedUser?.discord_id) {
    syncRankToDiscord(linkedUser.discord_id, person.rank, newRank).catch(err => {
      console.error('[SYNC] Discord role sync failed:', err.message);
    });
  }

  res.json(getPersonWithDetails(db, req.params.id));
});

// Demote one rank
router.post('/:id/demote', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(req.params.id);
  if (!person) return res.status(404).json({ error: 'Personnel not found' });
  if (person.status !== 'Marine') return res.status(400).json({ error: 'Only Marines can be demoted' });

  const idx = RANKS.indexOf(person.rank);
  if (idx <= 0) return res.status(400).json({ error: 'Cannot demote further' });

  const newRank = RANKS[idx - 1];
  const today = new Date().toISOString().split('T')[0];

  db.prepare(
    'UPDATE personnel SET rank = ?, rank_since = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(newRank, today, req.params.id);

  logActivity('DEMOTED', `${person.name}: ${person.rank} → ${newRank}`, req.user.id);

  // Sync Discord roles
  const linkedUser = db.prepare('SELECT discord_id FROM users WHERE personnel_id = ?').get(req.params.id);
  if (linkedUser?.discord_id) {
    syncRankToDiscord(linkedUser.discord_id, person.rank, newRank).catch(err => {
      console.error('[SYNC] Discord role sync failed:', err.message);
    });
  }

  res.json(getPersonWithDetails(db, req.params.id));
});

// Add award
router.post('/:id/awards', authenticate, requireAdmin, (req, res) => {
  const { name, awarded_at } = req.body;
  if (!name) return res.status(400).json({ error: 'Award name required' });

  const db = getDb();
  const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(req.params.id);
  if (!person) return res.status(404).json({ error: 'Personnel not found' });

  const result = db.prepare(
    'INSERT INTO awards (personnel_id, name, awarded_at) VALUES (?, ?, ?)'
  ).run(req.params.id, name.trim(), awarded_at || new Date().toISOString().split('T')[0]);

  logActivity('AWARD_GRANTED', `${person.name} awarded ${name}`, req.user.id);

  const award = db.prepare('SELECT * FROM awards WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(award);
});

// Remove award
router.delete('/:id/awards/:awardId', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const award = db.prepare('SELECT * FROM awards WHERE id = ? AND personnel_id = ?').get(
    req.params.awardId,
    req.params.id
  );
  if (!award) return res.status(404).json({ error: 'Award not found' });

  db.prepare('DELETE FROM awards WHERE id = ?').run(req.params.awardId);
  res.json({ success: true });
});

// Get qualifications for a marine
router.get('/:id/qualifications', authenticate, (req, res) => {
  const db = getDb();
  const person = db.prepare('SELECT id FROM personnel WHERE id = ?').get(req.params.id);
  if (!person) return res.status(404).json({ error: 'Personnel not found' });

  const quals = db.prepare(
    'SELECT * FROM qualifications WHERE personnel_id = ? ORDER BY awarded_at DESC'
  ).all(req.params.id);
  res.json(quals);
});

// Add qualification (both roles)
router.post('/:id/qualifications', authenticate, (req, res) => {
  const { name, awarded_at } = req.body;
  if (!name) return res.status(400).json({ error: 'Qualification name required' });

  const db = getDb();
  const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(req.params.id);
  if (!person) return res.status(404).json({ error: 'Personnel not found' });

  const result = db.prepare(
    'INSERT INTO qualifications (personnel_id, name, awarded_at, awarded_by_name) VALUES (?, ?, ?, ?)'
  ).run(
    req.params.id,
    name.trim(),
    awarded_at || new Date().toISOString().split('T')[0],
    req.user.display_name
  );

  logActivity('QUALIFICATION_ADDED', `${person.name} qualified: ${name}`, req.user.id);

  const qual = db.prepare('SELECT * FROM qualifications WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(qual);
});

// Remove qualification (both roles)
router.delete('/:id/qualifications/:qualId', authenticate, (req, res) => {
  const db = getDb();
  const qual = db.prepare(
    'SELECT * FROM qualifications WHERE id = ? AND personnel_id = ?'
  ).get(req.params.qualId, req.params.id);
  if (!qual) return res.status(404).json({ error: 'Qualification not found' });

  db.prepare('DELETE FROM qualifications WHERE id = ?').run(req.params.qualId);
  res.json({ success: true });
});

module.exports = router;
