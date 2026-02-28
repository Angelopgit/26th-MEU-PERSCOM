const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../config/database');

const formatDuration = (days) => {
  if (!days || days < 0) return 'N/A';
  if (days < 30)  return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo ${days % 30}d`;
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  return m > 0 ? `${y}y ${m}mo` : `${y}y`;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lookup')
    .setDescription("Look up a Marine's PERSCOM profile")
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
      const registerUrl = `${process.env.FRONTEND_URL || 'https://26thmeu.org/perscom'}/login`;
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('🪖 Not Registered on PERSCOM')
        .setDescription(`<@${targetUser.id}> does not have a PERSCOM account.\nTo join the roster, sign in with Discord on the PERSCOM portal.`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
        .setFooter({ text: 'PERSCOM — 26th MEU (SOC)' })
        .setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Register on PERSCOM').setStyle(ButtonStyle.Link).setURL(registerUrl).setEmoji('🪖')
      );
      return interaction.reply({ embeds: [embed], components: [row] });
    }

    const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(user.personnel_id);
    if (!person) {
      return interaction.reply({ content: '⛔ Personnel record not found.', ephemeral: true });
    }

    // Counts
    const awardsRows = db.prepare(
      'SELECT name FROM awards WHERE personnel_id = ? ORDER BY awarded_at DESC LIMIT 5'
    ).all(person.id);
    const awardsTotal = db.prepare('SELECT COUNT(*) as cnt FROM awards WHERE personnel_id = ?').get(person.id);
    const evals = db.prepare('SELECT COUNT(*) as cnt FROM evaluations WHERE personnel_id = ?').get(person.id);

    // ORBAT assignment — slot the marine is assigned to + parent unit name
    const orbat = db.prepare(`
      SELECT s.name AS position_title, s.callsign, p.name AS parent_name
      FROM orbat_slots s
      LEFT JOIN orbat_slots p ON s.parent_id = p.id
      WHERE s.personnel_id = ?
      LIMIT 1
    `).get(person.id);

    // Qualifications / MOS
    const quals = db.prepare(
      'SELECT name FROM qualifications WHERE personnel_id = ? ORDER BY id DESC LIMIT 5'
    ).all(person.id).map(q => q.name);

    // TIS / TIG
    const now = new Date();
    const tisDays = person.date_of_entry
      ? Math.floor((now - new Date(person.date_of_entry)) / 86400000) : 0;
    const tigDays = person.rank_since
      ? Math.floor((now - new Date(person.rank_since))   / 86400000) : tisDays;

    // Build awards display
    const awardsDisplay = awardsRows.length
      ? awardsRows.map(a => `• ${a.name}`).join('\n') + (awardsTotal.cnt > 5 ? `\n*+${awardsTotal.cnt - 5} more*` : '')
      : 'None on record';

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setAuthor({ name: '26th MEU (SOC) — PERSCOM', iconURL: targetUser.displayAvatarURL({ size: 32 }) })
      .setTitle(`🪖 ${person.name}`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: '⭐ Rank',          value: person.rank          || 'N/A',    inline: true },
        { name: '🏷️ Status',       value: person.member_status || 'Active', inline: true },
        { name: '🎖️ Type',         value: person.status        || 'N/A',    inline: true },
        { name: '⏱️ Time in Service', value: formatDuration(tisDays),        inline: true },
        { name: '📅 Time in Grade',   value: formatDuration(tigDays),        inline: true },
        { name: '📆 Date of Entry',   value: person.date_of_entry || 'N/A', inline: true },
      );

    if (orbat) {
      embed.addFields({
        name: '🗺️ ORBAT Assignment',
        value: `**${orbat.parent_name || 'Unknown Unit'}**\n${orbat.position_title || 'Unassigned'}${orbat.callsign ? ` (${orbat.callsign})` : ''}`,
        inline: false,
      });
    }

    embed.addFields(
      { name: `🏅 Awards (${awardsTotal.cnt})`, value: awardsDisplay, inline: true },
      { name: '📋 Evaluations',                 value: `${evals.cnt}`, inline: true },
    );

    if (quals.length) {
      embed.addFields({ name: '🔰 Qualifications', value: quals.join('\n'), inline: false });
    }

    embed
      .setFooter({ text: 'PERSCOM — 26th MEU (SOC)' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
