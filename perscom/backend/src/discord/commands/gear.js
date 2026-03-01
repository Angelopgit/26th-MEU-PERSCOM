const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDb } = require('../../config/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gear')
    .setDescription('Display a PERSCOM gear loadout')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Loadout name to search (leave blank to list all)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const db = getDb();
    const query = interaction.options.getString('name') || '';

    if (!query) {
      // List all loadouts
      const loadouts = db.prepare('SELECT id, name, description FROM gear_loadouts ORDER BY sort_order, name').all();
      if (!loadouts.length) {
        return interaction.reply({ content: '📦 No gear loadouts have been configured yet.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle('📦 PERSCOM Gear Loadouts')
        .setDescription(loadouts.map(l => `**#${l.id}** — ${l.name}${l.description ? `\n> ${l.description}` : ''}`).join('\n\n'))
        .setFooter({ text: 'Use /gear name:<loadout> to see full details — PERSCOM 26th MEU (SOC)' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // Search for a matching loadout
    const loadout = db.prepare(
      "SELECT * FROM gear_loadouts WHERE name LIKE ? ORDER BY sort_order LIMIT 1"
    ).get(`%${query}%`);

    if (!loadout) {
      return interaction.reply({
        content: `❌ No loadout found matching **"${query}"**.`,
        ephemeral: true,
      });
    }

    const items = db.prepare(
      'SELECT name, description FROM gear_items WHERE loadout_id = ? ORDER BY sort_order, name'
    ).all(loadout.id);

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle(`📦 ${loadout.name}`)
      .setFooter({ text: 'PERSCOM — 26th MEU (SOC)' })
      .setTimestamp();

    if (loadout.description) {
      embed.setDescription(loadout.description);
    }

    if (items.length) {
      const itemList = items.map(i => `• **${i.name}**${i.description ? ` — ${i.description}` : ''}`).join('\n');
      embed.addFields({ name: `🔧 Items (${items.length})`, value: itemList.slice(0, 1024), inline: false });
    } else {
      embed.addFields({ name: 'Items', value: 'No items in this loadout.', inline: false });
    }

    return interaction.reply({ embeds: [embed] });
  },
};
