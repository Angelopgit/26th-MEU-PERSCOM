const { getClient } = require('./bot');
const { getDb } = require('../config/database');

/**
 * Auto-match a PERSCOM rank name to a Discord role in the guild.
 * Priority: exact → role-contains-rank (shortest) → rank-contains-role (longest).
 * The priority order prevents "Private" from stealing the match for "Private First Class"
 * when the Discord role is named "E2 Private First Class".
 */
async function findRoleByRankName(guild, rankName) {
  if (!rankName) return null;
  const roles = guild.roles.cache;
  const lower = rankName.toLowerCase();

  // 1. Exact name match
  const exact = roles.find(r => r.name.toLowerCase() === lower);
  if (exact) return exact;

  // 2. Discord role name contains the rank name — pick shortest (most specific)
  //    e.g. "E2 Private First Class" contains "Private First Class" ✓
  //    Avoids "E2 Private First Class" stealing the match for "Private" (it would
  //    also contain "private" but we pick the shortest, which is "Private" itself)
  const containsRank = roles.filter(r => r.name.toLowerCase().includes(lower));
  if (containsRank.size > 0) {
    return containsRank.reduce((best, r) => r.name.length < best.name.length ? r : best);
  }

  // 3. Rank name contains the role name — pick longest role (most specific reverse match)
  const rankContains = roles.filter(r => lower.includes(r.name.toLowerCase()) && r.name.length > 2);
  if (rankContains.size > 0) {
    return rankContains.reduce((best, r) => r.name.length > best.name.length ? r : best);
  }

  return null;
}

/**
 * After a PERSCOM rank change, update the user's Discord roles.
 * Removes the old rank role and adds the new rank role by name matching.
 */
async function syncRankToDiscord(discordUserId, oldRank, newRank) {
  const client = getClient();
  if (!client || !process.env.DISCORD_GUILD_ID) return;

  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const member = await guild.members.fetch(discordUserId);

    if (oldRank) {
      const oldRole = await findRoleByRankName(guild, oldRank);
      if (oldRole) {
        await member.roles.remove(oldRole.id).catch(() => {});
      }
    }

    if (newRank) {
      const newRole = await findRoleByRankName(guild, newRank);
      if (newRole) {
        await member.roles.add(newRole.id).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[SYNC] Discord role sync failed:', err.message);
  }
}

/**
 * Full sync: iterate all marine users and ensure their Discord roles
 * match their PERSCOM rank. Called on demand by admins.
 */
async function fullSync() {
  const client = getClient();
  if (!client || !process.env.DISCORD_GUILD_ID) return { synced: 0, errors: 0 };

  const db = getDb();
  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);

  // Pre-fetch all members to avoid rate-limiting individual fetches
  await guild.members.fetch();

  const marines = db.prepare(`
    SELECT u.discord_id, p.rank
    FROM users u
    JOIN personnel p ON u.personnel_id = p.id
    WHERE u.discord_id IS NOT NULL AND p.status = 'Marine'
  `).all();

  // Build a set of all rank names in the system for cleanup
  const RANKS = [
    'Recruit', 'Private', 'Private First Class', 'Lance Corporal', 'Corporal',
    'Sergeant', 'Staff Sergeant', 'Gunnery Sergeant', 'Master Sergeant',
    'First Sergeant', 'Master Gunnery Sergeant', 'Sergeant Major',
    'Second Lieutenant', 'First Lieutenant', 'Captain', 'Major',
    'Lieutenant Colonel', 'Colonel',
  ];

  // Map rank names to Discord role objects
  const rankRoleMap = new Map();
  for (const rank of RANKS) {
    const role = await findRoleByRankName(guild, rank);
    if (role) rankRoleMap.set(rank, role);
  }

  const allRankRoleIds = new Set([...rankRoleMap.values()].map(r => r.id));
  let synced = 0;
  let errors = 0;

  for (const marine of marines) {
    try {
      const member = guild.members.cache.get(marine.discord_id);
      if (!member) continue;

      const desiredRole = rankRoleMap.get(marine.rank);

      // Remove all rank roles that don't match
      for (const roleId of allRankRoleIds) {
        if (roleId !== desiredRole?.id && member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId);
        }
      }

      // Add the correct rank role
      if (desiredRole && !member.roles.cache.has(desiredRole.id)) {
        await member.roles.add(desiredRole.id);
      }

      synced++;
    } catch (err) {
      console.error(`[SYNC] Failed for ${marine.discord_id}:`, err.message);
      errors++;
    }
  }

  return { synced, errors };
}

module.exports = { syncRankToDiscord, fullSync, findRoleByRankName };
