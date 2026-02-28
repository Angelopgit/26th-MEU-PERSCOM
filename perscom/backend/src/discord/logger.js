const { getClient } = require('./bot');

async function logToDiscord(message) {
  const client = getClient();
  if (!client || !process.env.DISCORD_LOG_CHANNEL_ID) return;

  try {
    const channel = await client.channels.fetch(process.env.DISCORD_LOG_CHANNEL_ID);
    if (channel) {
      await channel.send({
        embeds: [{
          description: message,
          color: 0x3b82f6,
          timestamp: new Date().toISOString(),
          footer: { text: 'PERSCOM System' },
        }],
      });
    }
  } catch (err) {
    console.error('[PERSCOM] Failed to send Discord log:', err.message);
  }
}

module.exports = { logToDiscord };
