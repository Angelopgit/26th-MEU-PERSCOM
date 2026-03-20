const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDb } = require('../../config/database');
const { announceEvent } = require('../announcer');

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
        `Posted **${posted.length}** event${posted.length !== 1 ? 's' : ''} to <#${process.env.DISCORD_EVENT_CHANNEL_ID}>.` +
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
