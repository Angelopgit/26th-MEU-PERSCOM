const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../config/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('attendance')
    .setDescription('Mark a Marine as attended an Operation or Training')
    .addUserOption(opt =>
      opt.setName('marine')
        .setDescription('The Discord user to mark attendance for')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('operation_id')
        .setDescription('The ID number of the Operation or Training (shown in PERSCOM panel)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('marine');
    const opId = interaction.options.getInteger('operation_id');
    const db = getDb();

    const registerUrl = `${process.env.FRONTEND_URL || 'https://26thmeu.org/perscom'}/login`;

    // Validate marine
    const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(targetUser.id);
    if (!user || !user.personnel_id) {
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('🪖 Not Registered on PERSCOM')
        .setDescription(`<@${targetUser.id}> does not have a PERSCOM account.`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
        .setFooter({ text: 'PERSCOM — 26th MEU (SOC)' })
        .setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Register on PERSCOM').setStyle(ButtonStyle.Link).setURL(registerUrl).setEmoji('🪖')
      );
      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // Validate operation
    const op = db.prepare('SELECT * FROM operations WHERE id = ?').get(opId);
    if (!op) {
      return interaction.reply({
        content: `❌ No Operation or Training found with ID **#${opId}**.`,
        ephemeral: true,
      });
    }

    const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(user.personnel_id);

    // Mark attendance
    try {
      db.prepare(
        'INSERT INTO attendance (operation_id, personnel_id, marked_by) VALUES (?, ?, ?)'
      ).run(opId, user.personnel_id, 1); // marked_by = system user id 1
    } catch {
      return interaction.reply({
        content: `⚠️ **${person.name}** is already marked as attended **${op.title}**.`,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle('✅ Attendance Marked')
      .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
      .addFields(
        { name: '🪖 Marine',    value: person.name,    inline: true },
        { name: `${op.type === 'Training' ? '🎯' : '⚔️'} ${op.type}`, value: `#${op.id} — ${op.title}`, inline: true },
        { name: '📅 Date',      value: op.start_date,  inline: true },
      )
      .setFooter({ text: 'PERSCOM — 26th MEU (SOC)' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
