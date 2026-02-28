/**
 * logger.js — Command Staff log channel (private, staff-eyes-only)
 *
 * Sends operational audit embeds to DISCORD_LOG_CHANNEL_ID.
 * That channel should be restricted to the Command Staff role only.
 */

const { EmbedBuilder } = require('discord.js');
const { getClient } = require('./bot');

const ACTION_META = {
  PROMOTED:            { color: 0x22c55e, emoji: '⬆️' },
  DEMOTED:             { color: 0xef4444, emoji: '⬇️' },
  AWARD_GRANTED:       { color: 0xd4af37, emoji: '⭐' },
  AWARD_REVOKED:       { color: 0x6b7280, emoji: '🔕' },
  PERSONNEL_ADDED:     { color: 0x3b82f6, emoji: '➕' },
  PERSONNEL_REMOVED:   { color: 0x6b7280, emoji: '➖' },
  ORBAT_ASSIGNED:      { color: 0x6366f1, emoji: '📋' },
  STATUS_CHANGED:      { color: 0xf59e0b, emoji: '📝' },
  MARINE_REGISTERED:   { color: 0x22c55e, emoji: '🪖' },
  QUALIFICATION_ADDED: { color: 0x60a5fa, emoji: '✅' },
};

async function logToDiscord(message) {
  const client = getClient();
  if (!client || !process.env.DISCORD_LOG_CHANNEL_ID) return;

  // Extract action key if message is prefixed like "[PROMOTED] ..."
  const actionMatch = message.match(/^\[([A-Z_]+)\]/);
  const actionKey = actionMatch?.[1];
  const meta = ACTION_META[actionKey] || { color: 0x3b82f6, emoji: '🔵' };

  const embed = new EmbedBuilder()
    .setColor(meta.color)
    .setDescription(`${meta.emoji}  ${message}`)
    .setFooter({ text: 'PERSCOM — Command Staff Log' })
    .setTimestamp();

  try {
    const channel = await client.channels.fetch(process.env.DISCORD_LOG_CHANNEL_ID);
    if (channel) await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('[PERSCOM] Failed to send Discord log:', err.message);
  }
}

module.exports = { logToDiscord };
