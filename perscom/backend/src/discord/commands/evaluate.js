const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDb } = require('../../config/database');
const { logActivity } = require('../../utils/logActivity');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('evaluate')
    .setDescription('Submit a 30-day performance evaluation for a Marine')
    .addUserOption(opt =>
      opt.setName('marine')
        .setDescription('The Discord user to evaluate')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('behavior')
        .setDescription('Did the Marine meet conduct/behavior standards?')
        .setRequired(true)
        .addChoices(
          { name: '✅ Yes — Meets Standards', value: 'yes' },
          { name: '❌ No — Does Not Meet Standards', value: 'no' },
        )
    )
    .addStringOption(opt =>
      opt.setName('attendance')
        .setDescription('Did the Marine meet attendance requirements?')
        .setRequired(true)
        .addChoices(
          { name: '✅ Yes — Attendance Met', value: 'yes' },
          { name: '❌ No — Attendance Not Met', value: 'no' },
        )
    )
    .addStringOption(opt =>
      opt.setName('notes')
        .setDescription('Optional evaluation notes')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('marine');
    const behaviorMeets = interaction.options.getString('behavior') === 'yes' ? 1 : 0;
    const attendanceMet = interaction.options.getString('attendance') === 'yes' ? 1 : 0;
    const notes = interaction.options.getString('notes') || null;

    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(targetUser.id);
    if (!user || !user.personnel_id) {
      return interaction.reply({ content: '⛔ This user is not registered on PERSCOM.', ephemeral: true });
    }

    const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(user.personnel_id);
    if (!person || person.status !== 'Marine') {
      return interaction.reply({ content: '⛔ This person is not an active Marine.', ephemeral: true });
    }

    // Find the evaluator's user record
    const evaluatorUser = db.prepare('SELECT id FROM users WHERE discord_id = ?').get(interaction.user.id);
    if (!evaluatorUser) {
      return interaction.reply({ content: '⛔ You must be registered on PERSCOM to submit evaluations.', ephemeral: true });
    }

    const today = new Date().toISOString().split('T')[0];

    db.prepare(
      'INSERT INTO evaluations (personnel_id, evaluator_id, behavior_meets, attendance_met, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(person.id, evaluatorUser.id, behaviorMeets, attendanceMet, notes);

    logActivity(
      'EVALUATION_CONDUCTED',
      `Evaluated ${person.name} (behavior: ${behaviorMeets ? 'Pass' : 'Fail'}, attendance: ${attendanceMet ? 'Pass' : 'Fail'}) via Discord by ${interaction.user.username}`,
      evaluatorUser.id
    );

    const embed = new EmbedBuilder()
      .setColor(behaviorMeets && attendanceMet ? 0x22c55e : 0xf59e0b)
      .setTitle('📋 Evaluation Submitted')
      .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
      .addFields(
        { name: 'Marine', value: `${person.rank ? `${person.rank} ` : ''}${person.name}`, inline: true },
        { name: 'Date', value: today, inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: 'Behavior/Conduct', value: behaviorMeets ? '✅ Meets Standards' : '❌ Does Not Meet', inline: true },
        { name: 'Attendance', value: attendanceMet ? '✅ Met' : '❌ Not Met', inline: true },
      )
      .setFooter({ text: `Evaluated by ${interaction.user.displayName || interaction.user.username} · PERSCOM` })
      .setTimestamp();

    if (notes) embed.addFields({ name: 'Notes', value: notes });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
