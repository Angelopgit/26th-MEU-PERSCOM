const { getDb } = require('../config/database');

// Lazy-require to avoid circular dependency at startup
let logToDiscord = null;

function logActivity(action, details, userId) {
  const db = getDb();
  db.prepare('INSERT INTO activity_log (action, details, user_id) VALUES (?, ?, ?)').run(action, details, userId);

  // Fire-and-forget Discord log
  if (!logToDiscord) {
    try {
      logToDiscord = require('../discord/logger').logToDiscord;
    } catch {
      logToDiscord = () => Promise.resolve();
    }
  }
  logToDiscord(`**${action}** ${details}`).catch(() => {});
}

module.exports = { logActivity };
