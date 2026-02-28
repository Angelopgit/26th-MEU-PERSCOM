const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ── Loadouts ──────────────────────────────────────────────────────────────────

// GET /api/gear-loadouts — all authenticated users (including guests)
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const loadouts = db.prepare(`
    SELECT gl.*, u.display_name AS author
    FROM gear_loadouts gl
    LEFT JOIN users u ON u.id = gl.created_by
    ORDER BY gl.sort_order ASC, gl.created_at ASC
  `).all();

  // Attach items to each loadout
  const items = db.prepare(
    'SELECT * FROM gear_items ORDER BY loadout_id, sort_order ASC'
  ).all();

  const result = loadouts.map((l) => ({
    ...l,
    items: items.filter((i) => i.loadout_id === l.id),
  }));

  res.json(result);
});

// POST /api/gear-loadouts — admin only
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  const db = getDb();
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM gear_loadouts').get();
  const sort_order = (maxOrder.m ?? -1) + 1;

  const result = db.prepare(
    'INSERT INTO gear_loadouts (name, description, sort_order, created_by) VALUES (?, ?, ?, ?)'
  ).run(name.trim(), description?.trim() || '', sort_order, req.user.id);

  db.prepare(
    "INSERT INTO activity_log (action, details, user_id) VALUES ('LOADOUT_CREATED', ?, ?)"
  ).run(`Gear loadout created: "${name.trim()}"`, req.user.id);

  res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), description: description?.trim() || '', items: [] });
});

// PUT /api/gear-loadouts/:id — admin only
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM gear_loadouts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Loadout not found' });

  db.prepare(
    'UPDATE gear_loadouts SET name = ?, description = ? WHERE id = ?'
  ).run(name.trim(), description?.trim() || '', req.params.id);

  res.json({ success: true });
});

// DELETE /api/gear-loadouts/:id — admin only (cascade deletes items)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const loadout = db.prepare('SELECT name FROM gear_loadouts WHERE id = ?').get(req.params.id);
  if (!loadout) return res.status(404).json({ error: 'Loadout not found' });

  db.prepare('DELETE FROM gear_loadouts WHERE id = ?').run(req.params.id);
  db.prepare(
    "INSERT INTO activity_log (action, details, user_id) VALUES ('LOADOUT_DELETED', ?, ?)"
  ).run(`Gear loadout deleted: "${loadout.name}"`, req.user.id);

  res.json({ success: true });
});

// ── Items ─────────────────────────────────────────────────────────────────────

// POST /api/gear-loadouts/:id/items — admin only
router.post('/:id/items', authenticate, requireAdmin, (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Item name is required' });

  const db = getDb();
  const loadout = db.prepare('SELECT id FROM gear_loadouts WHERE id = ?').get(req.params.id);
  if (!loadout) return res.status(404).json({ error: 'Loadout not found' });

  const maxOrder = db.prepare(
    'SELECT MAX(sort_order) as m FROM gear_items WHERE loadout_id = ?'
  ).get(req.params.id);
  const sort_order = (maxOrder.m ?? -1) + 1;

  const result = db.prepare(
    'INSERT INTO gear_items (loadout_id, name, description, sort_order) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, name.trim(), description?.trim() || '', sort_order);

  res.status(201).json({
    id: result.lastInsertRowid,
    loadout_id: Number(req.params.id),
    name: name.trim(),
    description: description?.trim() || '',
    sort_order,
  });
});

// DELETE /api/gear-loadouts/:id/items/:itemId — admin only
router.delete('/:id/items/:itemId', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM gear_items WHERE id = ? AND loadout_id = ?').run(
    req.params.itemId,
    req.params.id
  );
  res.json({ success: true });
});

module.exports = router;
