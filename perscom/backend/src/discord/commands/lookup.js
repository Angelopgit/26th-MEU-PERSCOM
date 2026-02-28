const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDb } = require('../../config/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lookup')
    .setDescription('Look up a Marine\'s PERSCOM profile')
    .addUserOption(opt =>
      opt.setName('marine')
        .setDescription('The Discord user to look up')
        .setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('marine');
    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(targetUser.id);
    if (!user || !user.personnel_id) {
      return interaction.reply({
        content: `**${targetUser.username}** is not registered on PERSCOM.`,
        ephemeral: true,
      });
    }

    const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(user.personnel_id);
    if (!person) {
      return interaction.reply({ content: 'Personnel record not found.', ephemeral: true });
    }

    const awards = db.prepare('SELECT COUNT(*) as cnt FROM awards WHERE personnel_id = ?').get(person.id);
    const evals = db.prepare('SELECT COUNT(*) as cnt FROM evaluations WHERE personnel_id = ?').get(person.id);

    // Calculate TIS and TIG
    const now = new Date();
    const tisMs = person.date_of_entry ? now - new Date(person.date_of_entry) : 0;
    const tigMs = person.rank_since ? now - new Date(person.rank_since) : tisMs;
    const tisDays = Math.floor(tisMs / 86400000);
    const tigDays = Math.floor(tigMs / 86400000);

    const formatDuration = (days) => {
      if (days < 30) return `${days}d`;
      if (days < 365) return `${Math.floor(days / 30)}mo`;
      const y = Math.floor(days / 365);
      const m = Math.floor((days % 365) / 30);
      return m > 0 ? `${y}y ${m}mo` : `${y}y`;
    };

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle(person.name)
      .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: 'Rank', value: person.rank || 'N/A', inline: true },
        { name: 'Status', value: person.member_status || 'Active', inline: true },
        { name: 'Type', value: person.status, inline: true },
        { name: 'Time in Service', value: formatDuration(tisDays), inline: true },
        { name: 'Time in Grade', value: formatDuration(tigDays), inline: true },
        { name: 'Date of Entry', value: person.date_of_entry || 'N/A', inline: true },
        { name: 'Awards', value: `${awards.cnt}`, inline: true },
        { name: 'Evaluations', value: `${evals.cnt}`, inline: true },
      )
      .setFooter({ text: 'PERSCOM — 26th MEU (SOC)' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
