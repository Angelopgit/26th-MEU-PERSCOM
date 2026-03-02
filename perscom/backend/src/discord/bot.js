const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
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
      GatewayIntentBits.GuildMembers, // Privileged — enable in Discord Developer Portal > Bot > Server Members Intent
    ],
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
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
      const addedRoles   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
      const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

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

module.exports = { startBot, getClient, getMemberRoles };
