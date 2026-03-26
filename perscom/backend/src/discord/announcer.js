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

async function getChannel(channelIdOverride) {
  const client = getClient();
  if (!client) return null;
  const channelId = channelIdOverride || process.env.DISCORD_BOT_COMMANDS_CHANNEL_ID;
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
async function announceStatusChange(discordUserId, marineName, oldStatus, newStatus, byName, loaStart, loaEnd, loaReason) {
  const channel = await getChannel();
  if (!channel) return;

  const colors = { Active: 0x22c55e, 'Leave of Absence': 0xf59e0b, Inactive: 0x6b7280 };

  const fields = [
    { name: 'Previous',   value: oldStatus || '—', inline: true },
    { name: 'New Status', value: `**${newStatus}**`, inline: true },
    { name: 'Updated By', value: byName || 'PERSCOM System', inline: true },
  ];

  if (newStatus === 'Leave of Absence') {
    if (loaStart) fields.push({ name: 'LOA Start', value: loaStart, inline: true });
    if (loaEnd)   fields.push({ name: 'LOA End',   value: loaEnd,   inline: true });
    if (loaReason) fields.push({ name: 'Reason', value: loaReason, inline: false });
  }

  const embed = new EmbedBuilder()
    .setColor(colors[newStatus] || 0x3b82f6)
    .setAuthor({ name: '📝 STATUS UPDATE — 26th MEU (SOC)' })
    .setTitle(marineName)
    .setDescription(`<@${discordUserId}> member status has been updated.`)
    .addFields(...fields)
    .setFooter({ text: 'PERSCOM — 26th MEU (SOC)' })
    .setTimestamp();

  await channel.send({ content: `<@${discordUserId}>`, embeds: [embed] }).catch(err => {
    console.error('[ANNOUNCER] status change:', err.message);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a Unix timestamp from a date string (YYYY-MM-DD) and optional time
 * string (HH:MM) that is entered in Eastern Time (America/New_York).
 * Handles EST (UTC-5) and EDT (UTC-4) automatically so that Discord's
 * <t:UNIX:F> renders the correct moment in each viewer's local timezone.
 */
function toUnixTimestamp(dateStr, timeStr) {
  if (!dateStr) return null;
  const time = timeStr || '00:00';
  // Step 1: parse the naive date+time as if it were UTC
  const naiveMs = Date.parse(`${dateStr}T${time}:00Z`);
  if (isNaN(naiveMs)) return null;
  const naiveDate = new Date(naiveMs);
  // Step 2: find what Eastern Time shows for that UTC moment (determines offset)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(naiveDate);
  const p = {};
  parts.forEach(x => { p[x.type] = x.value; });
  const etAsUtcMs = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  // Step 3: the difference is the ET offset; apply it to get true UTC for the ET input
  const offsetMs = naiveMs - etAsUtcMs;
  return Math.floor((naiveMs + offsetMs) / 1000);
}

// ── Event Announcement (RSVP) ─────────────────────────────────────────────────
// Posts to the dedicated events channel and adds RSVP reactions.
// Returns the Discord message ID so it can be stored on the operation record.
async function announceEvent(operation) {
  const channelId = process.env.DISCORD_EVENT_CHANNEL_ID;
  if (!channelId) return null;

  const channel = await getChannel(channelId);
  if (!channel) return null;

  const isTraining = operation.type === 'Training';
  const color = isTraining ? 0xf59e0b : 0x3b82f6;
  const typeLabel = isTraining ? '🎯 TRAINING' : '⚔️ OPERATION';

  // Build Discord local-time timestamps
  const startUnix = toUnixTimestamp(operation.start_date, operation.start_time);
  const endUnix   = toUnixTimestamp(operation.end_date,   operation.start_time); // end has no time

  const startValue = startUnix
    ? `<t:${startUnix}:F>\n<t:${startUnix}:R>`
    : operation.start_date;

  const fields = [
    { name: 'Type',  value: typeLabel,   inline: true },
    { name: 'Start', value: startValue,  inline: true },
  ];

  if (operation.end_date) {
    const endValue = endUnix ? `<t:${endUnix}:D>` : operation.end_date;
    fields.push({ name: 'End', value: endValue, inline: true });
  }

  fields.push({
    name: '\u200b',
    value: '**React below to RSVP:**\n✅ Attending  🟡 Tentative  ❌ Not Attending',
    inline: false,
  });

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: '📋 NEW EVENT — 26th MEU (SOC)' })
    .setTitle(operation.title)
    .addFields(...fields)
    .setFooter({ text: 'PERSCOM — 26th MEU (SOC)' })
    .setTimestamp();

  if (operation.description) {
    embed.setDescription(operation.description);
  }

  try {
    const msg = await channel.send({ embeds: [embed] });
    await msg.react('✅');
    await msg.react('🟡');
    await msg.react('❌');
    return msg.id;
  } catch (err) {
    console.error('[ANNOUNCER] event announce:', err.message);
    return null;
  }
}

// ── Application Approved ──────────────────────────────────────────────────────
async function announceApplicationApproved(discordUserId, marineName) {
  const channelId = process.env.DISCORD_RECRUIT_HALL_CHANNEL_ID;
  const channel = await getChannel(channelId);
  if (!channel) return;
  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setAuthor({ name: '✅ APPLICATION APPROVED — 26th MEU (SOC)' })
    .setTitle(marineName)
    .setDescription(`<@${discordUserId}> your application has been **approved**! Welcome to the 26th MEU (SOC).`)
    .addFields(
      { name: 'Next Step', value: 'Report to this channel and attend a **School of Infantry** class.', inline: false },
      { name: 'Your Rank', value: 'E1 | Recruit', inline: true },
    )
    .setFooter({ text: 'PERSCOM — 26th MEU (SOC)' })
    .setTimestamp();
  await channel.send({
    content: `<@${discordUserId}> — **Application Approved** — Report to #recruit-hall and attend a School of Infantry class.`,
    embeds: [embed],
  }).catch(err => {
    console.error('[ANNOUNCER] app approved:', err.message);
  });
}

// ── Application Denied ────────────────────────────────────────────────────────
async function announceApplicationDenied(discordUserId, reason) {
  const channelId = process.env.DISCORD_RECRUIT_HALL_CHANNEL_ID;
  const channel = await getChannel(channelId);
  if (!channel) return;
  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setAuthor({ name: '❌ APPLICATION DENIED — 26th MEU (SOC)' })
    .setDescription(`<@${discordUserId}> your application has been reviewed and was not accepted at this time.`)
    .addFields(
      { name: 'Reason', value: reason || 'No reason provided.', inline: false },
      { name: 'Reapply', value: 'You may reapply in **72 hours**.', inline: false },
    )
    .setFooter({ text: 'PERSCOM — 26th MEU (SOC)' })
    .setTimestamp();
  await channel.send({
    content: `<@${discordUserId}> — Application Denied. You may reapply in 72 hours.`,
    embeds: [embed],
  }).catch(err => {
    console.error('[ANNOUNCER] app denied:', err.message);
  });
}

module.exports = {
  announceRankChange,
  announceAward,
  announceAwardRevoked,
  announceOrbatAssignment,
  announceStatusChange,
  announceEvent,
  announceApplicationApproved,
  announceApplicationDenied,
};
