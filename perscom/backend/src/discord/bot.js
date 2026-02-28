const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');

let client = null;

function getClient() {
  return client;
}

async function startBot() {
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.log('[PERSCOM] DISCORD_BOT_TOKEN not set, bot disabled');
    return;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  });

  client.commands = new Collection();

  // Load commands
  const commands = [
    require('./commands/promote'),
    require('./commands/demote'),
    require('./commands/lookup'),
    require('./commands/status'),
  ];

  for (const cmd of commands) {
    client.commands.set(cmd.data.name, cmd);
  }

  // Register slash commands with Discord API
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
      { body: commands.map(c => c.data.toJSON()) }
    );
    console.log('[PERSCOM] Slash commands registered');
  } catch (err) {
    console.error('[PERSCOM] Failed to register slash commands:', err.message);
  }

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Permission check: require "26th MEU Command Staff" role
    const member = interaction.member;
    if (process.env.DISCORD_ROLE_COMMAND_STAFF && !member.roles.cache.has(process.env.DISCORD_ROLE_COMMAND_STAFF)) {
      return interaction.reply({
        content: 'You must have the **26th MEU Command Staff** role to use this command.',
        ephemeral: true,
      });
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`[BOT] Error in /${interaction.commandName}:`, err);
      const reply = { content: 'An error occurred executing this command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  });

  client.once('ready', () => {
    console.log(`[PERSCOM] Discord bot online as ${client.user.tag}`);
  });

  await client.login(process.env.DISCORD_BOT_TOKEN);
}

module.exports = { startBot, getClient };
