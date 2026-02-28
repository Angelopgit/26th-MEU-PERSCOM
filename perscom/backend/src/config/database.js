// Uses Node.js built-in SQLite (node:sqlite) — stable in Node.js 24+
// No native bindings required. No Python or MSVC needed.

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.error('\n[PERSCOM] ERROR: node:sqlite module not available.');
  console.error('[PERSCOM] Requires Node.js 22.5.0 or later (stable in Node.js 24+).');
  console.error('[PERSCOM] On Node 22.x, prefix scripts with: node --experimental-sqlite\n');
  process.exit(1);
}

const path = require('path');
const fs = require('fs');

// Allow Railway volume path override via env var (default: local data/ directory)
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/perscom.db');

let db;

function getDb() {
  if (!db) {
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
  }
  return db;
}

// ── ORBAT predefined structure ───────────────────────────────────────────────
// Each entry: [id, parent_id, name, type, callsign, sort_order]
// Roles (type='role') can be assigned to a personnel_id
const ORBAT_STRUCTURE = [
  // Top-level hierarchy
  ['meu-1',      null,        '26th MEU (SOC)',          'meu',       null,     0],
  ['bat-1',      'meu-1',     '1st Battalion',           'battalion', null,     0],
  ['co-1',       'bat-1',     'Alpha Company',           'company',   null,     0],
  ['plt-outlaw', 'co-1',      'Outlaw Platoon',          'platoon',   'Outlaw', 0],

  // Platoon Command Element (Callsign: Odin)
  ['cmd-odin',   'plt-outlaw','Odin Command Element',    'command',   'Odin',   0],
  ['role-odin-1','cmd-odin',  'Platoon Leader',          'role',      null,     0],
  ['role-odin-2','cmd-odin',  'Platoon Sergeant',        'role',      null,     1],
  ['role-odin-3','cmd-odin',  'Platoon RTO',             'role',      null,     2],
  ['role-odin-4','cmd-odin',  'Platoon Corpsman',        'role',      null,     3],

  // 1st Squad
  ['sq-1',       'plt-outlaw','1st Squad',               'squad',     null,     1],
  ['role-sq1-sl','sq-1',      'Squad Leader',            'role',      null,     0],
  ['role-sq1-as','sq-1',      'Asst. Squad Leader',      'role',      null,     1],
  ['role-sq1-co','sq-1',      'Corpsman',                'role',      null,     2],

  // 1st Squad — 1st Fireteam
  ['ft-1-1',     'sq-1',      '1st Fireteam',            'fireteam',  null,     3],
  ['role-ft11-1','ft-1-1',    'Team Leader',             'role',      null,     0],
  ['role-ft11-2','ft-1-1',    'Automatic Rifleman',      'role',      null,     1],
  ['role-ft11-3','ft-1-1',    'Anti-Tank',               'role',      null,     2],
  ['role-ft11-4','ft-1-1',    'Rifleman',                'role',      null,     3],

  // 1st Squad — 2nd Fireteam
  ['ft-1-2',     'sq-1',      '2nd Fireteam',            'fireteam',  null,     4],
  ['role-ft12-1','ft-1-2',    'Team Leader',             'role',      null,     0],
  ['role-ft12-2','ft-1-2',    'Automatic Rifleman',      'role',      null,     1],
  ['role-ft12-3','ft-1-2',    'Anti-Tank',               'role',      null,     2],
  ['role-ft12-4','ft-1-2',    'Rifleman',                'role',      null,     3],

  // 1st Squad — 3rd Fireteam
  ['ft-1-3',     'sq-1',      '3rd Fireteam',            'fireteam',  null,     5],
  ['role-ft13-1','ft-1-3',    'Team Leader',             'role',      null,     0],
  ['role-ft13-2','ft-1-3',    'Automatic Rifleman',      'role',      null,     1],
  ['role-ft13-3','ft-1-3',    'Anti-Tank',               'role',      null,     2],
  ['role-ft13-4','ft-1-3',    'Rifleman',                'role',      null,     3],

  // 2nd Squad
  ['sq-2',       'plt-outlaw','2nd Squad',               'squad',     null,     2],
  ['role-sq2-sl','sq-2',      'Squad Leader',            'role',      null,     0],
  ['role-sq2-as','sq-2',      'Asst. Squad Leader',      'role',      null,     1],
  ['role-sq2-co','sq-2',      'Corpsman',                'role',      null,     2],

  // 2nd Squad — 1st Fireteam
  ['ft-2-1',     'sq-2',      '1st Fireteam',            'fireteam',  null,     3],
  ['role-ft21-1','ft-2-1',    'Team Leader',             'role',      null,     0],
  ['role-ft21-2','ft-2-1',    'Automatic Rifleman',      'role',      null,     1],
  ['role-ft21-3','ft-2-1',    'Anti-Tank',               'role',      null,     2],
  ['role-ft21-4','ft-2-1',    'Rifleman',                'role',      null,     3],

  // 2nd Squad — 2nd Fireteam
  ['ft-2-2',     'sq-2',      '2nd Fireteam',            'fireteam',  null,     4],
  ['role-ft22-1','ft-2-2',    'Team Leader',             'role',      null,     0],
  ['role-ft22-2','ft-2-2',    'Automatic Rifleman',      'role',      null,     1],
  ['role-ft22-3','ft-2-2',    'Anti-Tank',               'role',      null,     2],
  ['role-ft22-4','ft-2-2',    'Rifleman',                'role',      null,     3],

  // 2nd Squad — 3rd Fireteam
  ['ft-2-3',     'sq-2',      '3rd Fireteam',            'fireteam',  null,     5],
  ['role-ft23-1','ft-2-3',    'Team Leader',             'role',      null,     0],
  ['role-ft23-2','ft-2-3',    'Automatic Rifleman',      'role',      null,     1],
  ['role-ft23-3','ft-2-3',    'Anti-Tank',               'role',      null,     2],
  ['role-ft23-4','ft-2-3',    'Rifleman',                'role',      null,     3],

  // 2nd Marine Air Wing (Aviation Element — separate from ground)
  ['avn-maw',    null,        '2nd Marine Air Wing',     'aviation',  null,     0],
  ['role-avn-co','avn-maw',   'Commanding Officer',      'role',      null,     0],
  ['role-avn-xo','avn-maw',   'Flight Executive Officer','role',      null,     1],
  ['role-avn-p1','avn-maw',   'Pilot',                   'role',      null,     2],
  ['role-avn-p2','avn-maw',   'Pilot',                   'role',      null,     3],
  ['role-avn-p3','avn-maw',   'Pilot',                   'role',      null,     4],
  ['role-avn-p4','avn-maw',   'Pilot',                   'role',      null,     5],
  ['role-avn-p5','avn-maw',   'Pilot',                   'role',      null,     6],
  ['role-avn-p6','avn-maw',   'Pilot',                   'role',      null,     7],
];

function initializeDatabase() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'moderator')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS personnel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Civilian' CHECK(status IN ('Civilian', 'Marine')),
      member_status TEXT NOT NULL DEFAULT 'Active' CHECK(member_status IN ('Active', 'Leave of Absence', 'Inactive')),
      rank TEXT,
      rank_since DATE,
      date_of_entry DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS awards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      personnel_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      awarded_at DATE NOT NULL DEFAULT (date('now')),
      FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS qualifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      personnel_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      awarded_at DATE NOT NULL DEFAULT (date('now')),
      awarded_by_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      start_date DATE NOT NULL,
      end_date DATE,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      personnel_id INTEGER NOT NULL,
      evaluator_id INTEGER NOT NULL,
      behavior_meets INTEGER NOT NULL DEFAULT 0,
      attendance_met INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE,
      FOREIGN KEY (evaluator_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS orbat_slots (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      callsign TEXT,
      sort_order INTEGER DEFAULT 0,
      personnel_id INTEGER,
      FOREIGN KEY (parent_id) REFERENCES orbat_slots(id),
      FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS gear_loadouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS gear_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loadout_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (loadout_id) REFERENCES gear_loadouts(id) ON DELETE CASCADE
    );
  `);

  // Add columns to existing tables (idempotent — catches error if column exists)
  try { database.exec("ALTER TABLE personnel ADD COLUMN member_status TEXT NOT NULL DEFAULT 'Active'"); } catch {}
  try { database.exec('ALTER TABLE operations ADD COLUMN image_url TEXT'); } catch {}
  try { database.exec('ALTER TABLE personnel ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL'); } catch {}

  // ── Discord OAuth migration ────────────────────────────────────────────────
  // Migrate users table to support Discord auth and marine role.
  //
  // IMPORTANT: SQLite 3.25+ automatically rewrites FK references in OTHER tables
  // when you ALTER TABLE RENAME. So "REFERENCES users(id)" in operations, personnel,
  // etc. gets rewritten to "REFERENCES users_old(id)" during the rename, and then
  // breaks after DROP TABLE users_old. We fix this two ways:
  //   1. Use PRAGMA legacy_alter_table = ON to prevent FK rewriting during migration
  //   2. Repair any already-corrupted schemas from previous runs

  // Step 0: Repair corrupted FK references from a previous migration that
  // rewrote "REFERENCES users(id)" → "REFERENCES users_old(id)" in other tables.
  // node:sqlite blocks PRAGMA writable_schema, so we recreate each corrupted table.
  try {
    const corruptedTables = database.prepare(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND sql LIKE '%users_old%'"
    ).all();

    if (corruptedTables.length > 0) {
      console.log(`[PERSCOM] Repairing ${corruptedTables.length} table(s) with corrupted FK references to users_old...`);
      database.exec('PRAGMA foreign_keys = OFF');
      database.exec('PRAGMA legacy_alter_table = ON');

      for (const t of corruptedTables) {
        const fixedSql = t.sql.replace(/users_old/g, 'users');
        const tempName = `${t.name}__repair`;

        database.exec(`ALTER TABLE "${t.name}" RENAME TO "${tempName}"`);
        database.exec(fixedSql);
        database.exec(`INSERT INTO "${t.name}" SELECT * FROM "${tempName}"`);
        database.exec(`DROP TABLE "${tempName}"`);
        console.log(`[PERSCOM]   Fixed: ${t.name}`);
      }

      database.exec('PRAGMA legacy_alter_table = OFF');
      database.exec('PRAGMA foreign_keys = ON');
      console.log('[PERSCOM] FK references repaired');
    }
  } catch (repairErr) {
    console.error('[PERSCOM] FK repair failed — delete perscom.db to reset:', repairErr.message);
  }

  // Step 1: Clean up any leftover users_old from partial migrations
  try { database.exec('DROP TABLE IF EXISTS users_old'); } catch {}

  // Step 2: Check if migration is needed
  const userCols = database.prepare('PRAGMA table_info(users)').all();
  const hasDiscordId = userCols.some(c => c.name === 'discord_id');

  if (!hasDiscordId) {
    database.exec('PRAGMA foreign_keys = OFF');
    // Prevent SQLite from rewriting FK references in other tables during rename
    database.exec('PRAGMA legacy_alter_table = ON');

    database.exec('ALTER TABLE users RENAME TO users_old');

    database.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'moderator', 'marine')),
        discord_id TEXT UNIQUE,
        discord_username TEXT,
        discord_avatar TEXT,
        discord_access_token TEXT,
        discord_refresh_token TEXT,
        personnel_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE SET NULL
      )
    `);

    database.exec(
      'INSERT INTO users (id, username, password_hash, display_name, role, created_at) SELECT id, username, password_hash, display_name, role, created_at FROM users_old'
    );

    database.exec('DROP TABLE users_old');

    database.exec('PRAGMA legacy_alter_table = OFF');
    database.exec('PRAGMA foreign_keys = ON');
    console.log('[PERSCOM] Users table migrated for Discord OAuth');
  }

  // Seed ORBAT structure if empty
  const orbatCount = database.prepare('SELECT COUNT(*) as cnt FROM orbat_slots').get();
  if (orbatCount.cnt === 0) {
    const insertSlot = database.prepare(
      'INSERT OR IGNORE INTO orbat_slots (id, parent_id, name, type, callsign, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const slot of ORBAT_STRUCTURE) {
      insertSlot.run(...slot);
    }
    console.log('[PERSCOM] ORBAT structure seeded');
  }

  console.log('[PERSCOM] Database initialized');
}

module.exports = { getDb, initializeDatabase };
