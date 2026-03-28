const { Client, GatewayIntentBits, Partials, Collection, REST, Routes } = require('discord.js');
const { getDb } = require('../config/database');
const { logActivity } = require('../utils/logActivity');

let client = null;

function getClient() {
  return client;
}

const RANKS = [
  'Recruit', 'Private', 'Private First Class', 'Lance Corporal', 'Corporal',
  'Sergeant', 'Staff Sergeant', 'Gunnery Sergeant', 'Master Sergeant',
  'First Sergeant', 'Master Gunnery Sergeant', 'Sergeant Major',
  'Second Lieutenant', 'First Lieutenant', 'Captain', 'Major',
  'Lieutenant Colonel', 'Colonel',
];

async function startBot() {
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.log('[PERSCOM] DISCORD_BOT_TOKEN not set, bot disabled');
    return;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,        // Privileged — enable in Discord Developer Portal > Bot > Server Members Intent
      GatewayIntentBits.GuildMessageReactions, // For event RSVP reactions
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.User], // Required to receive reactions on older messages
  });

  client.commands = new Collection();

  const commands = [
    require('./commands/promote'),
    require('./commands/demote'),
    require('./commands/lookup'),
    require('./commands/status'),
    require('./commands/attendance'),
    require('./commands/gear'),
    require('./commands/evaluate'),
    require('./commands/deactivate'),
    require('./commands/event_refresh'),
    require('./commands/application'),
  ];

  for (const cmd of commands) {
    client.commands.set(cmd.data.name, cmd);
  }

  // Register slash commands with Discord API
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
      { body: commands.map(c => c.data.toJSON()) }
    );
    console.log('[PERSCOM] Slash commands registered');
  } catch (err) {
    console.error('[PERSCOM] Failed to register slash commands:', err.message);
  }

  // ── Slash command handler ──────────────────────────────────────────────────
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const member = interaction.member;
    if (process.env.DISCORD_ROLE_COMMAND_STAFF && !member.roles.cache.has(process.env.DISCORD_ROLE_COMMAND_STAFF)) {
      return interaction.reply({
        content: '❌ You must have the **26th MEU Command Staff** role to use this command.',
        ephemeral: true,
      });
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`[BOT] Error in /${interaction.commandName}:`, err);
      const reply = { content: '⚠️ An error occurred executing this command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  });

  // ── Bidirectional rank sync — Discord role changes → PERSCOM ──────────────
  // When someone manually adds/removes a rank role on Discord, sync it back to PERSCOM.
  // Also handles S-1 role removal → downgrade PERSCOM moderator to marine.
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
      const addedRoles   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
      const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

      // ── S-1 role removed → downgrade PERSCOM moderator to marine ──────────
      const DISCORD_ROLE_MODERATOR = process.env.DISCORD_ROLE_MODERATOR;
      if (DISCORD_ROLE_MODERATOR && removedRoles.has(DISCORD_ROLE_MODERATOR)) {
        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(newMember.user.id);
        if (user && user.role === 'moderator') {
          db.prepare("UPDATE users SET role = 'marine' WHERE id = ?").run(user.id);
          logActivity(
            'ROLE_CHANGED',
            `${user.display_name}: moderator → marine (S-1 Discord role removed)`,
            null
          );
          console.log(`[BOT] ${user.display_name} downgraded to marine — S-1 role removed on Discord`);
        }
      }

      // ── S-1 role added → upgrade PERSCOM role to moderator ────────────────
      if (DISCORD_ROLE_MODERATOR && addedRoles.has(DISCORD_ROLE_MODERATOR)) {
        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(newMember.user.id);
        if (user && user.role === 'marine') {
          db.prepare("UPDATE users SET role = 'moderator' WHERE id = ?").run(user.id);
          logActivity(
            'ROLE_CHANGED',
            `${user.display_name}: marine → moderator (S-1 Discord role added)`,
            null
          );
          console.log(`[BOT] ${user.display_name} upgraded to moderator — S-1 role added on Discord`);
        }
      }

      const addedRankRole = addedRoles.find(r => RANKS.includes(r.name));
      if (!addedRankRole && !removedRoles.find(r => RANKS.includes(r.name))) return;

      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(newMember.user.id);
      if (!user || !user.personnel_id) return;

      const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(user.personnel_id);
      if (!person || person.status !== 'Marine') return;

      if (addedRankRole) {
        const newRank = addedRankRole.name;
        // Guard: if PERSCOM already has this rank, the update came FROM PERSCOM — skip
        if (newRank === person.rank) return;

        const oldRank = person.rank;
        const today = new Date().toISOString().split('T')[0];

        db.prepare(
          'UPDATE personnel SET rank = ?, rank_since = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(newRank, today, person.id);

        logActivity(
          'PROMOTED',
          `${person.name}: ${oldRank} → ${newRank} (via Discord role change)`,
          null
        );

        // Public announcement
        const { announceRankChange } = require('./announcer');
        announceRankChange(
          newMember.user.id,
          person.name,
          oldRank,
          newRank,
          'Discord Role Manager',
          user.discord_avatar
        ).catch(() => {});
      }
    } catch (err) {
      console.error('[BOT] GuildMemberUpdate error:', err.message);
    }
  });

  // ── Auto-inactivate when a member leaves the server ───────────────────────
  client.on('guildMemberRemove', async (member) => {
    try {
      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(member.user.id);
      if (!user?.personnel_id) return;
      const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(user.personnel_id);
      if (!person || person.member_status === 'Inactive') return;
      db.prepare(
        "UPDATE personnel SET member_status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(user.personnel_id);
      logActivity(
        'MEMBER_REMOVED',
        `${person.name} left the Discord server — automatically marked Inactive`,
        null
      );
      console.log(`[BOT] ${person.name} left server — marked Inactive`);
    } catch (err) {
      console.error('[BOT] guildMemberRemove error:', err.message);
    }
  });

  // ── RSVP reaction handler ─────────────────────────────────────────────────
  // Maps emoji to status. Bot's own reactions (✅🟡❌) are ignored.
  const RSVP_EMOJI_MAP = { '✅': 'attending', '🟡': 'tentative', '❌': 'not_attending' };

  async function handleRsvpReaction(reaction, user, adding) {
    if (user.bot) return;

    // Fetch partial reaction/message if needed
    if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
    if (reaction.message.partial) { try { await reaction.message.fetch(); } catch { return; } }

    const status = RSVP_EMOJI_MAP[reaction.emoji.name];
    if (!status) return;

    const db = getDb();
    const op = db.prepare(
      'SELECT id, start_date FROM operations WHERE discord_message_id = ?'
    ).get(reaction.message.id);
    if (!op) return;

    if (adding) {
      // Remove other RSVP emoji reactions from this user on this message (enforce single choice)
      for (const [emoji, otherStatus] of Object.entries(RSVP_EMOJI_MAP)) {
        if (otherStatus !== status) {
          const otherReaction = reaction.message.reactions.cache.find(r => r.emoji.name === emoji);
          if (otherReaction) {
            otherReaction.users.remove(user.id).catch(() => {});
          }
          // Also clear from DB in case it was set before bot could remove it
          db.prepare(
            "DELETE FROM event_rsvps WHERE operation_id = ? AND discord_user_id = ? AND status = ?"
          ).run(op.id, user.id, otherStatus);
        }
      }

      db.prepare(`
        INSERT INTO event_rsvps (operation_id, discord_user_id, discord_username, status, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(operation_id, discord_user_id) DO UPDATE SET status = excluded.status, discord_username = excluded.discord_username, updated_at = CURRENT_TIMESTAMP
      `).run(op.id, user.id, user.username, status);
    } else {
      // Only remove if the stored status matches (prevents ghost deletes from cleanup above)
      db.prepare(
        'DELETE FROM event_rsvps WHERE operation_id = ? AND discord_user_id = ? AND status = ?'
      ).run(op.id, user.id, status);
    }
  }

  client.on('messageReactionAdd',    (reaction, user) => handleRsvpReaction(reaction, user, true).catch(() => {}));
  client.on('messageReactionRemove', (reaction, user) => handleRsvpReaction(reaction, user, false).catch(() => {}));

  client.once('ready', () => {
    console.log(`[PERSCOM] Discord bot online as ${client.user.tag}`);
  });

  await client.login(process.env.DISCORD_BOT_TOKEN);
}

/**
 * Fetch a Discord member's roles for display in the PERSCOM panel.
 * Returns array of { id, name, color } sorted by position (highest first).
 */
async function getMemberRoles(discordUserId) {
  if (!client || !process.env.DISCORD_GUILD_ID) return [];
  try {
    const guild  = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const member = await guild.members.fetch(discordUserId);
    return member.roles.cache
      .filter(r => r.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .map(r => ({
        id:    r.id,
        name:  r.name,
        color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#4a6fa5',
      }));
  } catch {
    return [];
  }
}

/**
 * Fetch all guild roles for the configured Discord server.
 * Returns array of { id, name, color } sorted by position (highest first).
 */
async function getGuildRoles() {
  if (!client || !process.env.DISCORD_GUILD_ID) return [];
  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    await guild.roles.fetch();
    return guild.roles.cache
      .filter(r => r.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .map(r => ({
        id:    r.id,
        name:  r.name,
        color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#4a6fa5',
      }));
  } catch {
    return [];
  }
}

/**
 * Check if a Discord user is eligible to apply:
 * - Must be in the guild
 * - Must have the DISCORD_ROLE_VERIFIED role
 * - Must NOT have the DISCORD_ROLE_PERSONNEL role
 * Returns { eligible, reason, in_guild, has_personnel_role }
 */
async function checkApplicantRoles(discordId) {
  if (!client || !process.env.DISCORD_GUILD_ID) {
    return { eligible: false, reason: 'Bot not available', in_guild: false, has_personnel_role: false };
  }
  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    let member;
    try {
      member = await guild.members.fetch(discordId);
    } catch {
      return { eligible: false, reason: 'not_in_guild', in_guild: false, has_personnel_role: false };
    }
    const roleIds = member.roles.cache.map(r => r.id);
    const hasPersonnel = process.env.DISCORD_ROLE_PERSONNEL && roleIds.includes(process.env.DISCORD_ROLE_PERSONNEL);
    const hasVerified = !process.env.DISCORD_ROLE_VERIFIED || roleIds.includes(process.env.DISCORD_ROLE_VERIFIED);
    if (hasPersonnel) {
      return { eligible: false, reason: 'already_personnel', in_guild: true, has_personnel_role: true };
    }
    if (!hasVerified) {
      return { eligible: false, reason: 'not_verified', in_guild: true, has_personnel_role: false };
    }
    return { eligible: true, reason: null, in_guild: true, has_personnel_role: false };
  } catch (err) {
    return { eligible: false, reason: 'bot_error', in_guild: false, has_personnel_role: false };
  }
}

/**
 * Add approved roles to a Discord member when their application is accepted.
 * Adds: DISCORD_ROLE_PERSONNEL, DISCORD_ROLE_RECRUIT, DISCORD_ROLE_ENLISTED
 */
async function addApprovedRoles(discordId) {
  if (!client || !process.env.DISCORD_GUILD_ID) return;
  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const member = await guild.members.fetch(discordId);
    const rolesToAdd = [
      process.env.DISCORD_ROLE_PERSONNEL,
      process.env.DISCORD_ROLE_RECRUIT,
      process.env.DISCORD_ROLE_ENLISTED,
    ].filter(Boolean);
    for (const roleId of rolesToAdd) {
      await member.roles.add(roleId).catch(() => {});
    }
  } catch (err) {
    console.error('[BOT] addApprovedRoles error:', err.message);
  }
}

/**
 * Add or remove a specific Discord role from a guild member.
 * Used to sync PERSCOM role changes (e.g., grant/revoke S-1 role when moderator is set).
 */
async function setMemberRole(discordUserId, roleId, add = true) {
  if (!client || !process.env.DISCORD_GUILD_ID || !roleId || !discordUserId) return false;
  try {
    const guild  = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const member = await guild.members.fetch(discordUserId);
    if (add) {
      await member.roles.add(roleId);
    } else {
      await member.roles.remove(roleId);
    }
    console.log(`[BOT] ${add ? 'Added' : 'Removed'} role ${roleId} ${add ? 'to' : 'from'} ${discordUserId}`);
    return true;
  } catch (err) {
    console.error(`[BOT] setMemberRole error (add=${add}):`, err.message);
    return false;
  }
}

module.exports = { startBot, getClient, getMemberRoles, getGuildRoles, checkApplicantRoles, addApprovedRoles, setMemberRole };
