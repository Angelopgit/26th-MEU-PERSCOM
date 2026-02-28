const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDb } = require('../../config/database');
const { logActivity } = require('../../utils/logActivity');
const { announceStatusChange } = require('../announcer');

const STATUS_META = {
  'Active':           { color: 0x22c55e, emoji: '🟢', label: 'Active Duty' },
  'Leave of Absence': { color: 0xf59e0b, emoji: '🟡', label: 'Leave of Absence' },
  'Inactive':         { color: 0x6b7280, emoji: '⚫', label: 'Inactive' },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription("Change a Marine's member status")
    .addUserOption(opt =>
      opt.setName('marine')
        .setDescription('The Discord user to update')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('status')
        .setDescription('New member status')
        .setRequired(true)
        .addChoices(
          { name: 'Active',           value: 'Active' },
          { name: 'Leave of Absence', value: 'Leave of Absence' },
          { name: 'Inactive',         value: 'Inactive' },
        )
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('marine');
    const newStatus  = interaction.options.getString('status');
    const db         = getDb();

    const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(targetUser.id);
    if (!user || !user.personnel_id) {
      return interaction.reply({
        content: `⛔ **${targetUser.username}** is not registered on PERSCOM.`,
        ephemeral: true,
      });
    }

    const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(user.personnel_id);
    if (!person) {
      return interaction.reply({ content: '⛔ Personnel record not found.', ephemeral: true });
    }

    if (person.member_status === newStatus) {
      return interaction.reply({
        content: `ℹ️ **${person.name}** is already **${newStatus}**.`,
        ephemeral: true,
      });
    }

    const oldStatus = person.member_status;
    db.prepare(
      'UPDATE personnel SET member_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(newStatus, person.id);

    const invokerUser = db.prepare('SELECT id FROM users WHERE discord_id = ?').get(interaction.user.id);
    logActivity(
      'STATUS_CHANGED',
      `${person.name}: ${oldStatus} → ${newStatus} (via Discord by ${interaction.user.username})`,
      invokerUser?.id || null
    );

    // Public announcement in #bot-commands
    await announceStatusChange(
      targetUser.id,
      person.name,
      oldStatus,
      newStatus,
      interaction.user.displayName || interaction.user.username,
      user.discord_avatar
    );

    // Ephemeral confirmation to Command Staff
    const meta = STATUS_META[newStatus] || { color: 0x3b82f6, emoji: '🔵', label: newStatus };
    const embed = new EmbedBuilder()
      .setColor(meta.color)
      .setTitle(`${meta.emoji} Status Updated`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
      .addFields(
        { name: 'Marine',          value: person.name, inline: true },
        { name: 'Previous Status', value: oldStatus,   inline: true },
        { name: 'New Status',      value: newStatus,   inline: true },
      )
      .setFooter({ text: `Issued by ${interaction.user.displayName || interaction.user.username} · PERSCOM` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
