const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDb } = require('../../config/database');
const { announceEvent } = require('../announcer');
const { getClient } = require('../bot');

/**
 * Delete all messages in a channel, handling both bulk-delete (< 14 days)
 * and individual delete (>= 14 days) in batches until the channel is empty.
 */
async function purgeChannel(channel) {
  let deleted = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const messages = await channel.messages.fetch({ limit: 100 });
    if (messages.size === 0) break;

    // bulkDelete only works for messages newer than 14 days
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const fresh = messages.filter(m => m.createdTimestamp > cutoff);
    const stale = messages.filter(m => m.createdTimestamp <= cutoff);

    if (fresh.size > 0) {
      await channel.bulkDelete(fresh, true).catch(() => {});
    }
    for (const msg of stale.values()) {
      await msg.delete().catch(() => {});
    }

    deleted += messages.size;
    if (messages.size < 100) break; // no more pages
  }
  return deleted;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event_refresh')
    .setDescription('Re-post all upcoming operations and trainings to the events channel with RSVP reactions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Require admin Discord IDs if configured, otherwise fall back to Command Staff role (already enforced by bot.js)
    const adminIds = (process.env.DISCORD_ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (adminIds.length > 0 && !adminIds.includes(interaction.user.id)) {
      return interaction.reply({
        content: '⛔ This command is restricted to PERSCOM administrators.',
        ephemeral: true,
      });
    }

    if (!process.env.DISCORD_EVENT_CHANNEL_ID) {
      return interaction.reply({
        content: '⚠️ `DISCORD_EVENT_CHANNEL_ID` is not configured in the server environment.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const db = getDb();

    // Purge the events channel before reposting
    const client = getClient();
    if (client) {
      try {
        const channel = await client.channels.fetch(process.env.DISCORD_EVENT_CHANNEL_ID);
        if (channel) await purgeChannel(channel);
      } catch (err) {
        console.error('[EVENT_REFRESH] purge error:', err.message);
      }
    }

    // Clear stored discord_message_id so stale IDs don't linger
    db.prepare('UPDATE operations SET discord_message_id = NULL').run();

    // Fetch all upcoming (active) operations — end_date is null or in the future
    const upcomingOps = db.prepare(`
      SELECT * FROM operations
      WHERE end_date IS NULL OR date(end_date) >= date('now')
      ORDER BY start_date ASC
    `).all();

    if (upcomingOps.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x6b7280)
            .setTitle('📋 No Upcoming Events')
            .setDescription('There are no active or upcoming operations/trainings in PERSCOM.')
            .setFooter({ text: 'PERSCOM — 26th MEU (SOC)' })
            .setTimestamp(),
        ],
      });
    }

    const posted = [];
    const failed = [];

    for (const op of upcomingOps) {
      const msgId = await announceEvent(op);
      if (msgId) {
        db.prepare('UPDATE operations SET discord_message_id = ? WHERE id = ?').run(msgId, op.id);
        posted.push(op);
      } else {
        failed.push(op);
      }
    }

    const typeIcon = (op) => op.type === 'Training' ? '🎯' : '⚔️';

    const embed = new EmbedBuilder()
      .setColor(posted.length > 0 ? 0x22c55e : 0xef4444)
      .setTitle('📋 Event Refresh Complete')
      .setDescription(
        `Channel cleared and **${posted.length}** event${posted.length !== 1 ? 's' : ''} reposted to <#${process.env.DISCORD_EVENT_CHANNEL_ID}>.` +
        (failed.length > 0 ? `\n⚠️ **${failed.length}** failed to post.` : '')
      )
      .setFooter({ text: `Issued by ${interaction.user.displayName || interaction.user.username} · PERSCOM` })
      .setTimestamp();

    if (posted.length > 0) {
      embed.addFields({
        name: 'Posted',
        value: posted.map(op => `${typeIcon(op)} **${op.title}** — ${op.start_date}`).join('\n'),
        inline: false,
      });
    }

    if (failed.length > 0) {
      embed.addFields({
        name: 'Failed',
        value: failed.map(op => `${typeIcon(op)} ${op.title}`).join('\n'),
        inline: false,
      });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
