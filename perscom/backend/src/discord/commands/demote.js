const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../config/database');
const { logActivity } = require('../../utils/logActivity');
const { syncRankToDiscord } = require('../sync');
const { announceRankChange } = require('../announcer');

const RANKS = [
  'Recruit', 'Private', 'Private First Class', 'Lance Corporal', 'Corporal',
  'Sergeant', 'Staff Sergeant', 'Gunnery Sergeant', 'Master Sergeant',
  'First Sergeant', 'Master Gunnery Sergeant', 'Sergeant Major',
  'Second Lieutenant', 'First Lieutenant', 'Captain', 'Major',
  'Lieutenant Colonel', 'Colonel',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('demote')
    .setDescription('Demote a registered Marine by one rank')
    .addUserOption(opt =>
      opt.setName('marine')
        .setDescription('The Discord user to demote')
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
    if (!person || person.status !== 'Marine') {
      return interaction.reply({ content: '⛔ This person is not an active Marine.', ephemeral: true });
    }

    const idx = RANKS.indexOf(person.rank);
    if (idx <= 0) {
      return interaction.reply({
        content: `⛔ **${person.name}** is already at the lowest rank (**${person.rank}**).`,
        ephemeral: true,
      });
    }

    const oldRank = person.rank;
    const newRank = RANKS[idx - 1];
    const today = new Date().toISOString().split('T')[0];

    db.prepare(
      'UPDATE personnel SET rank = ?, rank_since = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(newRank, today, person.id);

    const invokerUser = db.prepare('SELECT id FROM users WHERE discord_id = ?').get(interaction.user.id);
    logActivity(
      'DEMOTED',
      `${person.name}: ${oldRank} → ${newRank} (via Discord by ${interaction.user.username})`,
      invokerUser?.id || null
    );

    // Sync Discord roles
    await syncRankToDiscord(targetUser.id, oldRank, newRank);

    // Public announcement in #bot-commands
    await announceRankChange(
      targetUser.id,
      person.name,
      oldRank,
      newRank,
      interaction.user.displayName || interaction.user.username,
      user.discord_avatar
    );

    // Ephemeral confirmation to Command Staff
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('📉 Demotion Confirmed')
      .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
      .addFields(
        { name: 'Marine', value: person.name, inline: true },
        { name: 'Previous Rank', value: oldRank, inline: true },
        { name: 'New Rank', value: newRank, inline: true },
      )
      .setFooter({ text: `Issued by ${interaction.user.displayName || interaction.user.username} · PERSCOM` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
