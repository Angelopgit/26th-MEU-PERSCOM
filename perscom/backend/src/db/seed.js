require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { getDb, initializeDatabase } = require('../config/database');

initializeDatabase();
const db = getDb();

console.log('[SEED] Clearing all data...');
db.exec(`
  DELETE FROM activity_log;
  DELETE FROM evaluations;
  DELETE FROM awards;
  DELETE FROM qualifications;
  DELETE FROM announcements;
  DELETE FROM operations;
  DELETE FROM personnel;
  DELETE FROM users;
  DELETE FROM settings;
  UPDATE orbat_slots SET personnel_id = NULL;
`);

// ── Admin accounts ────────────────────────────────────────────────────────────
console.log('[SEED] Creating admin accounts...');

const adminHash = bcrypt.hashSync('Admin@1234', 10);
db.prepare(
  'INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
).run('command', adminHash, 'Command Staff', 'admin');

const modHash = bcrypt.hashSync('Mod@1234', 10);
db.prepare(
  'INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
).run('drillsgt', modHash, 'Drill Instructor', 'moderator');

console.log('');
console.log('╔══════════════════════════════════════════╗');
console.log('║       PERSCOM — DATABASE RESET           ║');
console.log('╠══════════════════════════════════════════╣');
console.log('║  Admin:       command   / Admin@1234     ║');
console.log('║  Moderator:   drillsgt  / Mod@1234       ║');
console.log('╠══════════════════════════════════════════╣');
console.log('║  All personnel, operations, awards,      ║');
console.log('║  evaluations and activity cleared.       ║');
console.log('║  ORBAT slots reset (structure intact).   ║');
console.log('╚══════════════════════════════════════════╝');
