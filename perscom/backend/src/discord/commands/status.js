const { SlashCommandBuilder } = require('discord.js');
const { getDb } = require('../../config/database');
const { logActivity } = require('../../utils/logActivity');

const VALID_STATUSES = ['Active', 'Leave of Absence', 'Inactive'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Change a Marine\'s member status')
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
          { name: 'Active', value: 'Active' },
          { name: 'Leave of Absence', value: 'Leave of Absence' },
          { name: 'Inactive', value: 'Inactive' },
        )
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('marine');
    const newStatus = interaction.options.getString('status');
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

    if (person.member_status === newStatus) {
      return interaction.reply({
        content: `**${person.name}** is already **${newStatus}**.`,
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

    return interaction.reply({
      content: `**${person.name}** status changed from **${oldStatus}** to **${newStatus}**.`,
    });
  },
};
