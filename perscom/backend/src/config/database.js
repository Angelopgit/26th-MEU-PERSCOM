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
const bcrypt = require('bcryptjs');

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

  // 1st Squad — 1st Fireteam (Alpha)
  ['ft-1-1',     'sq-1',      '1st Fireteam (Alpha)',    'fireteam',  null,     3],
  ['role-ft11-1','ft-1-1',    'Team Leader',             'role',      null,     0],
  ['role-ft11-2','ft-1-1',    'Automatic Rifleman',      'role',      null,     1],
  ['role-ft11-3','ft-1-1',    'Anti-Tank',               'role',      null,     2],
  ['role-ft11-4','ft-1-1',    'Rifleman',                'role',      null,     3],

  // 1st Squad — 2nd Fireteam (Bravo)
  ['ft-1-2',     'sq-1',      '2nd Fireteam (Bravo)',    'fireteam',  null,     4],
  ['role-ft12-1','ft-1-2',    'Team Leader',             'role',      null,     0],
  ['role-ft12-2','ft-1-2',    'Automatic Rifleman',      'role',      null,     1],
  ['role-ft12-3','ft-1-2',    'Anti-Tank',               'role',      null,     2],
  ['role-ft12-4','ft-1-2',    'Rifleman',                'role',      null,     3],

  // 1st Squad — 3rd Fireteam (Charlie)
  ['ft-1-3',     'sq-1',      '3rd Fireteam (Charlie)',  'fireteam',  null,     5],
  ['role-ft13-1','ft-1-3',    'Team Leader',             'role',      null,     0],
  ['role-ft13-2','ft-1-3',    'Automatic Rifleman',      'role',      null,     1],
  ['role-ft13-3','ft-1-3',    'Anti-Tank',               'role',      null,     2],
  ['role-ft13-4','ft-1-3',    'Rifleman',                'role',      null,     3],

  // 2nd Squad
  ['sq-2',       'plt-outlaw','2nd Squad',               'squad',     null,     2],
  ['role-sq2-sl','sq-2',      'Squad Leader',            'role',      null,     0],
  ['role-sq2-as','sq-2',      'Asst. Squad Leader',      'role',      null,     1],
  ['role-sq2-co','sq-2',      'Corpsman',                'role',      null,     2],

  // 2nd Squad — 1st Fireteam (Alpha)
  ['ft-2-1',     'sq-2',      '1st Fireteam (Alpha)',    'fireteam',  null,     3],
  ['role-ft21-1','ft-2-1',    'Team Leader',             'role',      null,     0],
  ['role-ft21-2','ft-2-1',    'Automatic Rifleman',      'role',      null,     1],
  ['role-ft21-3','ft-2-1',    'Anti-Tank',               'role',      null,     2],
  ['role-ft21-4','ft-2-1',    'Rifleman',                'role',      null,     3],

  // 2nd Squad — 2nd Fireteam (Bravo)
  ['ft-2-2',     'sq-2',      '2nd Fireteam (Bravo)',    'fireteam',  null,     4],
  ['role-ft22-1','ft-2-2',    'Team Leader',             'role',      null,     0],
  ['role-ft22-2','ft-2-2',    'Automatic Rifleman',      'role',      null,     1],
  ['role-ft22-3','ft-2-2',    'Anti-Tank',               'role',      null,     2],
  ['role-ft22-4','ft-2-2',    'Rifleman',                'role',      null,     3],

  // 2nd Squad — 3rd Fireteam (Charlie)
  ['ft-2-3',     'sq-2',      '3rd Fireteam (Charlie)',  'fireteam',  null,     5],
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

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_id INTEGER NOT NULL,
      personnel_id INTEGER NOT NULL,
      marked_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(operation_id, personnel_id),
      FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE,
      FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE,
      FOREIGN KEY (marked_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS document_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS document_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL CHECK(file_type IN ('pdf','docx')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS spotlight_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      image_url TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ranks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      icon_url TEXT,
      req_attendance INTEGER NOT NULL DEFAULT 0,
      req_ops INTEGER NOT NULL DEFAULT 0,
      req_trainings INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add columns to existing tables (idempotent — catches error if column exists)
  try { database.exec("ALTER TABLE personnel ADD COLUMN member_status TEXT NOT NULL DEFAULT 'Active'"); } catch {}
  try { database.exec('ALTER TABLE operations ADD COLUMN image_url TEXT'); } catch {}
  try { database.exec('ALTER TABLE personnel ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL'); } catch {}
  try { database.exec("ALTER TABLE operations ADD COLUMN type TEXT NOT NULL DEFAULT 'Operation'"); } catch {}
  try { database.exec('ALTER TABLE ranks ADD COLUMN discord_role_id TEXT'); } catch {}

  // LOA metadata
  try { database.exec('ALTER TABLE personnel ADD COLUMN loa_start_date DATE'); } catch {}
  try { database.exec('ALTER TABLE personnel ADD COLUMN loa_end_date DATE'); } catch {}
  try { database.exec('ALTER TABLE personnel ADD COLUMN loa_reason TEXT'); } catch {}

  // Discord event message tracking
  try { database.exec('ALTER TABLE operations ADD COLUMN discord_message_id TEXT'); } catch {}

  // Start time for operations/trainings
  try { database.exec('ALTER TABLE operations ADD COLUMN start_time TEXT'); } catch {}

  // Rename fireteams to include phonetic designations (Alpha/Bravo/Charlie)
  database.prepare("UPDATE orbat_slots SET name = '1st Fireteam (Alpha)'   WHERE id = 'ft-1-1' AND name = '1st Fireteam'").run();
  database.prepare("UPDATE orbat_slots SET name = '2nd Fireteam (Bravo)'   WHERE id = 'ft-1-2' AND name = '2nd Fireteam'").run();
  database.prepare("UPDATE orbat_slots SET name = '3rd Fireteam (Charlie)' WHERE id = 'ft-1-3' AND name = '3rd Fireteam'").run();
  database.prepare("UPDATE orbat_slots SET name = '1st Fireteam (Alpha)'   WHERE id = 'ft-2-1' AND name = '1st Fireteam'").run();
  database.prepare("UPDATE orbat_slots SET name = '2nd Fireteam (Bravo)'   WHERE id = 'ft-2-2' AND name = '2nd Fireteam'").run();
  database.prepare("UPDATE orbat_slots SET name = '3rd Fireteam (Charlie)' WHERE id = 'ft-2-3' AND name = '3rd Fireteam'").run();

  // Event RSVP table
  database.exec(`
    CREATE TABLE IF NOT EXISTS event_rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_id INTEGER NOT NULL,
      discord_user_id TEXT NOT NULL,
      discord_username TEXT,
      status TEXT NOT NULL CHECK(status IN ('attending', 'tentative', 'not_attending')),
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(operation_id, discord_user_id),
      FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
    );
  `);

  // Applications table
  database.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL,
      discord_username TEXT NOT NULL,
      discord_avatar TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      age INTEGER NOT NULL,
      platform TEXT NOT NULL,
      desired_role TEXT NOT NULL,
      referred_by TEXT,
      reforger_experience TEXT NOT NULL,
      other_unit TEXT,
      other_unit_conflict TEXT,
      how_heard TEXT NOT NULL,
      why_join TEXT NOT NULL,
      long_term_commitment INTEGER NOT NULL DEFAULT 0,
      na_timezone INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','review')),
      denial_reason TEXT,
      personnel_id INTEGER,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME,
      reviewed_by INTEGER,
      FOREIGN KEY (personnel_id) REFERENCES personnel(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );
  `);

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

  // Seed fallback admin account — password-based, no Discord required.
  // Safe to redeploy: INSERT is skipped if username already exists.
  const fallbackAdmin = database.prepare("SELECT id FROM users WHERE username = 'gunny'").get();
  if (!fallbackAdmin) {
    const hash = bcrypt.hashSync('Semper#Fi26!', 10);
    const today = new Date().toISOString().split('T')[0];

    const pResult = database.prepare(
      "INSERT INTO personnel (name, status, rank, rank_since, date_of_entry, member_status) VALUES (?, ?, ?, ?, ?, ?)"
    ).run('Gunny, Tommy', 'Marine', 'Gunnery Sergeant', today, today, 'Active');

    const uResult = database.prepare(
      "INSERT INTO users (username, password_hash, display_name, role, personnel_id) VALUES (?, ?, ?, ?, ?)"
    ).run('gunny', hash, 'Gunny, Tommy', 'admin', pResult.lastInsertRowid);

    database.prepare("UPDATE personnel SET user_id = ? WHERE id = ?")
      .run(uResult.lastInsertRowid, pResult.lastInsertRowid);

    console.log('[PERSCOM] Fallback admin "gunny" seeded');
  }

  // Seed default ranks if table is empty
  const rankCount = database.prepare('SELECT COUNT(*) as cnt FROM ranks').get();
  if (rankCount.cnt === 0) {
    const insertRank = database.prepare(
      'INSERT INTO ranks (name, sort_order, req_attendance, req_ops, req_trainings) VALUES (?, ?, ?, ?, ?)'
    );
    const defaultRanks = [
      ['Recruit',            0,  0,  0,  0],
      ['Private',            1,  1,  0,  1],
      ['Private First Class',2,  3,  1,  2],
      ['Lance Corporal',     3,  5,  2,  3],
      ['Corporal',           4, 10,  4,  5],
      ['Sergeant',           5, 15,  6,  8],
      ['Staff Sergeant',     6, 25, 10, 12],
      ['Gunnery Sergeant',   7, 35, 15, 18],
    ];
    for (const r of defaultRanks) insertRank.run(...r);
    console.log('[PERSCOM] Default ranks seeded');
  }

  // Seed rank_progression_enabled setting if not present
  const rpSetting = database.prepare("SELECT value FROM settings WHERE key = 'rank_progression_enabled'").get();
  if (!rpSetting) {
    database.prepare("INSERT INTO settings (key, value) VALUES ('rank_progression_enabled', 'false')").run();
  }

  console.log('[PERSCOM] Database initialized');
}

module.exports = { getDb, initializeDatabase };
