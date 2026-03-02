const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDb } = require('../../config/database');
const { logActivity } = require('../../utils/logActivity');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deactivate')
    .setDescription('Set a Marine\'s PERSCOM status to Inactive (manual removal)')
    .addUserOption(opt =>
      opt.setName('marine')
        .setDescription('The Discord user to deactivate')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for deactivation')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('marine');
    const reason = interaction.options.getString('reason') || 'Manually deactivated via bot command';

    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(targetUser.id);
    if (!user || !user.personnel_id) {
      return interaction.reply({ content: '⛔ This user is not registered on PERSCOM.', ephemeral: true });
    }

    const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(user.personnel_id);
    if (!person) {
      return interaction.reply({ content: '⛔ Personnel record not found.', ephemeral: true });
    }

    if (person.member_status === 'Inactive') {
      return interaction.reply({ content: `⚠️ **${person.name}** is already Inactive.`, ephemeral: true });
    }

    db.prepare(
      "UPDATE personnel SET member_status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(person.id);

    const invokerUser = db.prepare('SELECT id FROM users WHERE discord_id = ?').get(interaction.user.id);
    logActivity(
      'MEMBER_REMOVED',
      `${person.name} deactivated by ${interaction.user.username}: ${reason}`,
      invokerUser?.id || null
    );

    const embed = new EmbedBuilder()
      .setColor(0x6b7280)
      .setTitle('⬛ Marine Deactivated')
      .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
      .addFields(
        { name: 'Marine', value: person.name, inline: true },
        { name: 'Status', value: 'Inactive', inline: true },
        { name: 'Reason', value: reason },
      )
      .setFooter({ text: `Issued by ${interaction.user.displayName || interaction.user.username} · PERSCOM` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
