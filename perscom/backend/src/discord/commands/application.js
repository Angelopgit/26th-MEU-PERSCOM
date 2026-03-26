const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDb } = require('../../config/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('application')
    .setDescription('Look up the PERSCOM application for a Discord user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(opt =>
      opt.setName('user').setDescription('The Discord user to look up').setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    await interaction.deferReply({ ephemeral: true });

    const db = getDb();
    const app = db.prepare(`
      SELECT a.*, u.display_name as reviewed_by_name
      FROM applications a
      LEFT JOIN users u ON a.reviewed_by = u.id
      WHERE a.discord_id = ?
      ORDER BY a.submitted_at DESC LIMIT 1
    `).get(target.id);

    if (!app) {
      return interaction.editReply({ content: `❌ No application found for <@${target.id}>.` });
    }

    const statusColors = { pending: 0xf59e0b, accepted: 0x22c55e, rejected: 0xef4444, review: 0xf59e0b };
    const statusLabels = { pending: '🟡 Pending', accepted: '✅ Accepted', rejected: '❌ Rejected', review: '🟠 Further Review' };

    const avatarUrl = app.discord_avatar
      ? `https://cdn.discordapp.com/avatars/${app.discord_id}/${app.discord_avatar}.png?size=64`
      : null;

    const embed = new EmbedBuilder()
      .setColor(statusColors[app.status] || 0x3b82f6)
      .setAuthor({ name: '📋 APPLICATION — 26th MEU (SOC)' })
      .setTitle(`${app.first_name} ${app.last_name}`)
      .setDescription(`Discord: <@${app.discord_id}> | Status: **${statusLabels[app.status]}**`)
      .addFields(
        { name: 'Age',                 value: String(app.age),                inline: true },
        { name: 'Platform',            value: app.platform,                   inline: true },
        { name: 'Desired Role',        value: app.desired_role,               inline: true },
        { name: 'Reforger Experience', value: app.reforger_experience,        inline: true },
        { name: 'How Heard',           value: app.how_heard,                  inline: true },
        { name: 'Why Join',            value: (app.why_join || '').slice(0, 512), inline: false },
        { name: 'Submitted',           value: new Date(app.submitted_at).toLocaleDateString(), inline: true },
      )
      .setFooter({ text: `PERSCOM — Application #${app.id}` })
      .setTimestamp();

    if (avatarUrl) embed.setThumbnail(avatarUrl);
    if (app.denial_reason) embed.addFields({ name: '❌ Denial Reason', value: app.denial_reason, inline: false });
    if (app.reviewed_by_name) embed.addFields({ name: 'Reviewed By', value: app.reviewed_by_name, inline: true });

    return interaction.editReply({ embeds: [embed] });
  },
};
