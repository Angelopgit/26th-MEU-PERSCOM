const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utils/logActivity');
const { announceOrbatAssignment } = require('../discord/announcer');

const router = express.Router();

// Get full ORBAT tree with personnel assignments
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const slots = db.prepare(`
    SELECT
      o.id, o.parent_id, o.name, o.type, o.callsign, o.sort_order,
      o.personnel_id,
      p.name AS personnel_name,
      p.rank AS personnel_rank,
      p.member_status AS personnel_member_status
    FROM orbat_slots o
    LEFT JOIN personnel p ON o.personnel_id = p.id
    ORDER BY o.sort_order ASC
  `).all();
  res.json(slots);
});

// Assign a marine to a slot (both roles can assign)
router.post('/assign', authenticate, (req, res) => {
  const { slotId, personnelId } = req.body;
  if (!slotId) return res.status(400).json({ error: 'slotId is required' });

  const db = getDb();
  const slot = db.prepare('SELECT * FROM orbat_slots WHERE id = ?').get(slotId);
  if (!slot) return res.status(404).json({ error: 'Slot not found' });
  if (slot.type !== 'role') return res.status(400).json({ error: 'Only role slots can be assigned' });

  let person = null;
  if (personnelId) {
    person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(personnelId);
    if (!person) return res.status(404).json({ error: 'Personnel not found' });
  }

  db.prepare('UPDATE orbat_slots SET personnel_id = ? WHERE id = ?').run(
    personnelId || null,
    slotId
  );

  logActivity(
    'ORBAT_ASSIGNED',
    person ? `${person.name} assigned to ${slot.name}` : `${slot.name} slot cleared`,
    req.user.id
  );

  // Announce to #bot-commands if a marine was assigned (not cleared)
  if (person) {
    const linkedUser = db.prepare('SELECT discord_id, discord_avatar FROM users WHERE personnel_id = ?').get(person.id);
    if (linkedUser?.discord_id) {
      // Fetch parent unit name for context
      const parentSlot = slot.parent_id
        ? db.prepare('SELECT name FROM orbat_slots WHERE id = ?').get(slot.parent_id)
        : null;
      announceOrbatAssignment(
        linkedUser.discord_id,
        person.name,
        slot.name,
        parentSlot?.name || 'Unknown Unit',
        req.user.display_name,
        linkedUser.discord_avatar
      ).catch(() => {});
    }
  }

  // Return updated slot
  const updated = db.prepare(`
    SELECT o.*, p.name AS personnel_name, p.rank AS personnel_rank, p.member_status AS personnel_member_status
    FROM orbat_slots o
    LEFT JOIN personnel p ON o.personnel_id = p.id
    WHERE o.id = ?
  `).get(slotId);
  res.json(updated);
});

// Unassign a slot
router.delete('/assign/:slotId', authenticate, (req, res) => {
  const db = getDb();
  const slot = db.prepare('SELECT * FROM orbat_slots WHERE id = ?').get(req.params.slotId);
  if (!slot) return res.status(404).json({ error: 'Slot not found' });

  db.prepare('UPDATE orbat_slots SET personnel_id = NULL WHERE id = ?').run(req.params.slotId);

  logActivity('ORBAT_ASSIGNED', `${slot.name} slot cleared`, req.user.id);

  res.json({ success: true });
});

module.exports = router;
