/**
 * announcer.js — Public-facing announcement embeds to #bot-commands
 *
 * These are visible to all server members (not just Command Staff).
 * They @ mention the affected marine and use rich, aesthetic embeds.
 *
 * Log channel (Command Staff only) is handled separately by logger.js
 */

const { EmbedBuilder } = require('discord.js');
const { getClient } = require('./bot');

const RANK_ORDER = [
  'Recruit', 'Private', 'Private First Class', 'Lance Corporal', 'Corporal',
  'Sergeant', 'Staff Sergeant', 'Gunnery Sergeant', 'Master Sergeant',
  'First Sergeant', 'Master Gunnery Sergeant', 'Sergeant Major',
  'Second Lieutenant', 'First Lieutenant', 'Captain', 'Major',
  'Lieutenant Colonel', 'Colonel',
];

function buildAvatarUrl(discordId, avatarHash) {
  if (!discordId || !avatarHash) return null;
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png?size=128`;
}

async function getChannel() {
  const client = getClient();
  if (!client) return null;
  const channelId = process.env.DISCORD_BOT_COMMANDS_CHANNEL_ID;
  if (!channelId) return null;
  try {
    return await client.channels.fetch(channelId);
  } catch {
    return null;
  }
}

// ── Rank Change (Promotion / Demotion) ────────────────────────────────────────
async function announceRankChange(discordUserId, marineName, oldRank, newRank, byName, discordAvatarHash = null) {
  const channel = await getChannel();
  if (!channel) return;

  const oldIdx = RANK_ORDER.indexOf(oldRank);
  const newIdx = RANK_ORDER.indexOf(newRank);
  const isPromotion = newIdx > oldIdx;

  const embed = new EmbedBuilder()
    .setColor(isPromotion ? 0x22c55e : 0xef4444)
    .setAuthor({ name: `${isPromotion ? '🟢 PROMOTION' : '🔴 DEMOTION'} — 26th MEU (SOC)` })
    .setTitle(marineName)
    .setDescription(`<@${discordUserId}> has been **${isPromotion ? 'promoted' : 'demoted'}**.`)
    .addFields(
      { name: 'Previous Rank', value: oldRank || '—', inline: true },
      { name: 'New Rank',      value: `**${newRank}**`, inline: true },
      { name: 'Authorized By', value: byName || 'PERSCOM System', inline: true },
    )
    .setFooter({ text: 'PERSCOM — 26th MEU (SOC)' })
    .setTimestamp();

  const thumb = buildAvatarUrl(discordUserId, discordAvatarHash);
  if (thumb) embed.setThumbnail(thumb);

  await channel.send({ content: `<@${discordUserId}>`, embeds: [embed] }).catch(err => {
    console.error('[ANNOUNCER] rank change:', err.message);
  });
}

// ── Award Granted ─────────────────────────────────────────────────────────────
async function announceAward(discordUserId, marineName, awardName, byName, discordAvatarHash = null) {
  const channel = await getChannel();
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0xd4af37)
    .setAuthor({ name: '⭐ AWARD GRANTED — 26th MEU (SOC)' })
    .setTitle(marineName)
    .setDescription(`<@${discordUserId}> has been awarded **${awardName}**.`)
    .addFields(
      { name: 'Award',      value: awardName, inline: true },
      { name: 'Awarded By', value: byName || 'PERSCOM System', inline: true },
    )
    .setFooter({ text: 'PERSCOM — 26th MEU (SOC)' })
    .setTimestamp();

  const thumb = buildAvatarUrl(discordUserId, discordAvatarHash);
  if (thumb) embed.setThumbnail(thumb);

  await channel.send({ content: `<@${discordUserId}>`, embeds: [embed] }).catch(err => {
    console.error('[ANNOUNCER] award:', err.message);
  });
}

// ── Award Revoked ─────────────────────────────────────────────────────────────
async function announceAwardRevoked(discordUserId, marineName, awardName, byName) {
  const channel = await getChannel();
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x6b7280)
    .setAuthor({ name: '🔕 AWARD REVOKED — 26th MEU (SOC)' })
    .setTitle(marineName)
    .setDescription(`<@${discordUserId}> award **${awardName}** has been revoked.`)
    .addFields(
      { name: 'Award',      value: awardName, inline: true },
      { name: 'Revoked By', value: byName || 'PERSCOM System', inline: true },
    )
    .setFooter({ text: 'PERSCOM — 26th MEU (SOC)' })
    .setTimestamp();

  await channel.send({ content: `<@${discordUserId}>`, embeds: [embed] }).catch(err => {
    console.error('[ANNOUNCER] award revoked:', err.message);
  });
}

// ── ORBAT Assignment ──────────────────────────────────────────────────────────
async function announceOrbatAssignment(discordUserId, marineName, slotName, unitPath, byName, discordAvatarHash = null) {
  const channel = await getChannel();
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x6366f1)
    .setAuthor({ name: '📋 ORBAT ASSIGNMENT — 26th MEU (SOC)' })
    .setTitle(marineName)
    .setDescription(`<@${discordUserId}> has been assigned a new position.`)
    .addFields(
      { name: 'Position',    value: slotName || '—', inline: true },
      { name: 'Unit',        value: unitPath || '—', inline: true },
      { name: 'Assigned By', value: byName || 'PERSCOM System', inline: true },
    )
    .setFooter({ text: 'PERSCOM — 26th MEU (SOC)' })
    .setTimestamp();

  const thumb = buildAvatarUrl(discordUserId, discordAvatarHash);
  if (thumb) embed.setThumbnail(thumb);

  await channel.send({ content: `<@${discordUserId}>`, embeds: [embed] }).catch(err => {
    console.error('[ANNOUNCER] ORBAT assignment:', err.message);
  });
}

// ── Status Change ─────────────────────────────────────────────────────────────
async function announceStatusChange(discordUserId, marineName, oldStatus, newStatus, byName) {
  const channel = await getChannel();
  if (!channel) return;

  const colors = { Active: 0x22c55e, 'Leave of Absence': 0xf59e0b, Inactive: 0x6b7280 };

  const embed = new EmbedBuilder()
    .setColor(colors[newStatus] || 0x3b82f6)
    .setAuthor({ name: '📝 STATUS UPDATE — 26th MEU (SOC)' })
    .setTitle(marineName)
    .setDescription(`<@${discordUserId}> member status has been updated.`)
    .addFields(
      { name: 'Previous',   value: oldStatus || '—', inline: true },
      { name: 'New Status', value: `**${newStatus}**`, inline: true },
      { name: 'Updated By', value: byName || 'PERSCOM System', inline: true },
    )
    .setFooter({ text: 'PERSCOM — 26th MEU (SOC)' })
    .setTimestamp();

  await channel.send({ content: `<@${discordUserId}>`, embeds: [embed] }).catch(err => {
    console.error('[ANNOUNCER] status change:', err.message);
  });
}

module.exports = {
  announceRankChange,
  announceAward,
  announceAwardRevoked,
  announceOrbatAssignment,
  announceStatusChange,
};
