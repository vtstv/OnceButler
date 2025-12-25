// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Voice Channel Management Command
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  VoiceChannel,
  GuildMember,
} from 'discord.js';
import { isTempVoiceChannel, getTempChannelOwner } from '../../voice/tempVoiceService.js';
import { getGuildSettings } from '../../database/repositories/settingsRepo.js';
import { t, Locale } from '../../utils/i18n.js';

export async function handleVoice(interaction: ChatInputCommandInteraction): Promise<void> {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;
  const settings = getGuildSettings(guildId);
  const locale = (settings.language || 'en') as Locale;

  // Check if temp voice is enabled
  if (!settings.enableTempVoice) {
    await interaction.reply({
      content: t(locale, 'voice.disabled'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Get user's current voice channel
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel as VoiceChannel | null;

  if (!voiceChannel) {
    await interaction.reply({
      content: t(locale, 'voice.notInChannel'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check if it's a temp channel
  if (!isTempVoiceChannel(voiceChannel.id)) {
    await interaction.reply({
      content: t(locale, 'voice.notTempChannel'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check if user is the owner
  const ownerId = getTempChannelOwner(voiceChannel.id);
  if (ownerId !== userId) {
    await interaction.reply({
      content: t(locale, 'voice.notOwner'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  switch (subcommand) {
    case 'rename':
      await handleRename(interaction, voiceChannel, locale);
      break;
    case 'limit':
      await handleLimit(interaction, voiceChannel, locale);
      break;
    case 'lock':
      await handleLock(interaction, voiceChannel, locale);
      break;
    case 'unlock':
      await handleUnlock(interaction, voiceChannel, locale);
      break;
    case 'kick':
      await handleKick(interaction, voiceChannel, locale);
      break;
    case 'permit':
      await handlePermit(interaction, voiceChannel, locale);
      break;
    case 'reject':
      await handleReject(interaction, voiceChannel, locale);
      break;
    case 'info':
      await handleInfo(interaction, voiceChannel, ownerId, locale);
      break;
  }
}

async function handleRename(interaction: ChatInputCommandInteraction, channel: VoiceChannel, locale: Locale): Promise<void> {
  const newName = interaction.options.getString('name', true);
  
  if (newName.length > 100) {
    await interaction.reply({
      content: t(locale, 'voice.rename.tooLong'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const oldName = channel.name;
    await channel.setName(newName);
    
    await interaction.reply({
      content: t(locale, 'voice.rename.success', { oldName, newName }),
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[Voice] Failed to rename channel:', error);
    await interaction.reply({
      content: t(locale, 'voice.rename.failed'),
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleLimit(interaction: ChatInputCommandInteraction, channel: VoiceChannel, locale: Locale): Promise<void> {
  const limit = interaction.options.getInteger('count', true);

  try {
    await channel.setUserLimit(limit);
    
    const message = limit === 0 
      ? t(locale, 'voice.limit.removed')
      : t(locale, 'voice.limit.success', { limit: limit.toString() });
    
    await interaction.reply({
      content: message,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[Voice] Failed to set limit:', error);
    await interaction.reply({
      content: t(locale, 'voice.limit.failed'),
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleLock(interaction: ChatInputCommandInteraction, channel: VoiceChannel, locale: Locale): Promise<void> {
  try {
    // Deny connect permission for @everyone
    await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
      Connect: false,
    });
    
    await interaction.reply({
      content: t(locale, 'voice.lock.success'),
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[Voice] Failed to lock channel:', error);
    await interaction.reply({
      content: t(locale, 'voice.lock.failed'),
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleUnlock(interaction: ChatInputCommandInteraction, channel: VoiceChannel, locale: Locale): Promise<void> {
  try {
    // Reset connect permission for @everyone
    await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
      Connect: null,
    });
    
    await interaction.reply({
      content: t(locale, 'voice.unlock.success'),
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[Voice] Failed to unlock channel:', error);
    await interaction.reply({
      content: t(locale, 'voice.unlock.failed'),
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleKick(interaction: ChatInputCommandInteraction, channel: VoiceChannel, locale: Locale): Promise<void> {
  const targetUser = interaction.options.getUser('user', true);
  
  // Can't kick yourself
  if (targetUser.id === interaction.user.id) {
    await interaction.reply({
      content: t(locale, 'voice.kick.self'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Find member in channel
  const targetMember = channel.members.get(targetUser.id);
  if (!targetMember) {
    await interaction.reply({
      content: t(locale, 'voice.kick.notInChannel'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await targetMember.voice.disconnect('Kicked by channel owner');
    
    await interaction.reply({
      content: t(locale, 'voice.kick.success', { user: targetUser.displayName }),
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[Voice] Failed to kick user:', error);
    await interaction.reply({
      content: t(locale, 'voice.kick.failed'),
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handlePermit(interaction: ChatInputCommandInteraction, channel: VoiceChannel, locale: Locale): Promise<void> {
  const targetUser = interaction.options.getUser('user', true);

  try {
    // Allow this user to connect even if channel is locked
    await channel.permissionOverwrites.edit(targetUser.id, {
      Connect: true,
      ViewChannel: true,
    });
    
    await interaction.reply({
      content: t(locale, 'voice.permit.success', { user: targetUser.displayName }),
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[Voice] Failed to permit user:', error);
    await interaction.reply({
      content: t(locale, 'voice.permit.failed'),
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleReject(interaction: ChatInputCommandInteraction, channel: VoiceChannel, locale: Locale): Promise<void> {
  const targetUser = interaction.options.getUser('user', true);
  
  // Can't reject yourself
  if (targetUser.id === interaction.user.id) {
    await interaction.reply({
      content: t(locale, 'voice.reject.self'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    // Deny connect permission for this user
    await channel.permissionOverwrites.edit(targetUser.id, {
      Connect: false,
    });
    
    // If user is in channel, kick them
    const targetMember = channel.members.get(targetUser.id);
    if (targetMember) {
      await targetMember.voice.disconnect('Rejected by channel owner');
    }
    
    await interaction.reply({
      content: t(locale, 'voice.reject.success', { user: targetUser.displayName }),
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[Voice] Failed to reject user:', error);
    await interaction.reply({
      content: t(locale, 'voice.reject.failed'),
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleInfo(interaction: ChatInputCommandInteraction, channel: VoiceChannel, ownerId: string, locale: Locale): Promise<void> {
  const owner = await interaction.guild!.members.fetch(ownerId).catch(() => null);
  
  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'voice.info.title', { name: channel.name }))
    .setColor(0x5865F2)
    .addFields(
      { name: t(locale, 'voice.info.owner'), value: owner ? `<@${ownerId}>` : 'Unknown', inline: true },
      { name: t(locale, 'voice.info.members'), value: `${channel.members.size}${channel.userLimit > 0 ? `/${channel.userLimit}` : ''}`, inline: true },
      { name: t(locale, 'voice.info.status'), value: isChannelLocked(channel) ? t(locale, 'voice.info.locked') : t(locale, 'voice.info.unlocked'), inline: true },
      { name: t(locale, 'voice.info.category'), value: channel.parent?.name ?? 'None', inline: true },
      { name: t(locale, 'voice.info.bitrate'), value: `${channel.bitrate / 1000}kbps`, inline: true },
    )
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}

function isChannelLocked(channel: VoiceChannel): boolean {
  const everyonePerms = channel.permissionOverwrites.cache.get(channel.guild.roles.everyone.id);
  if (!everyonePerms) return false;
  return everyonePerms.deny.has(PermissionFlagsBits.Connect);
}
