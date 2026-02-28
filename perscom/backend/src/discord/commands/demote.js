const { SlashCommandBuilder } = require('discord.js');
const { getDb } = require('../../config/database');
const { logActivity } = require('../../utils/logActivity');
const { syncRankToDiscord } = require('../sync');

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
      return interaction.reply({
        content: `**${targetUser.username}** is not registered on PERSCOM.`,
        ephemeral: true,
      });
    }

    const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(user.personnel_id);
    if (!person || person.status !== 'Marine') {
      return interaction.reply({ content: 'This person is not a Marine.', ephemeral: true });
    }

    const idx = RANKS.indexOf(person.rank);
    if (idx <= 0) {
      return interaction.reply({ content: `**${person.name}** is already at the lowest rank.`, ephemeral: true });
    }

    const newRank = RANKS[idx - 1];
    const today = new Date().toISOString().split('T')[0];

    db.prepare(
      'UPDATE personnel SET rank = ?, rank_since = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(newRank, today, person.id);

    const invokerUser = db.prepare('SELECT id FROM users WHERE discord_id = ?').get(interaction.user.id);
    logActivity(
      'DEMOTED',
      `${person.name}: ${person.rank} → ${newRank} (via Discord by ${interaction.user.username})`,
      invokerUser?.id || null
    );

    // Sync Discord roles
    await syncRankToDiscord(targetUser.id, person.rank, newRank);

    return interaction.reply({
      content: `**${person.name}** demoted from **${person.rank}** to **${newRank}**.`,
    });
  },
};
