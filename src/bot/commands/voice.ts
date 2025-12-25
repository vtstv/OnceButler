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

export async function handleVoice(interaction: ChatInputCommandInteraction): Promise<void> {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;
  const settings = getGuildSettings(guildId);

  // Check if temp voice is enabled
  if (!settings.enableTempVoice) {
    await interaction.reply({
      content: '❌ Временные голосовые каналы отключены на этом сервере.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Get user's current voice channel
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel as VoiceChannel | null;

  if (!voiceChannel) {
    await interaction.reply({
      content: '❌ Вы должны находиться в голосовом канале.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check if it's a temp channel
  if (!isTempVoiceChannel(voiceChannel.id)) {
    await interaction.reply({
      content: '❌ Эта команда работает только во временных голосовых каналах.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check if user is the owner
  const ownerId = getTempChannelOwner(voiceChannel.id);
  if (ownerId !== userId) {
    await interaction.reply({
      content: '❌ Только владелец канала может управлять им.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  switch (subcommand) {
    case 'rename':
      await handleRename(interaction, voiceChannel);
      break;
    case 'limit':
      await handleLimit(interaction, voiceChannel);
      break;
    case 'lock':
      await handleLock(interaction, voiceChannel);
      break;
    case 'unlock':
      await handleUnlock(interaction, voiceChannel);
      break;
    case 'kick':
      await handleKick(interaction, voiceChannel);
      break;
    case 'permit':
      await handlePermit(interaction, voiceChannel);
      break;
    case 'reject':
      await handleReject(interaction, voiceChannel);
      break;
    case 'info':
      await handleInfo(interaction, voiceChannel, ownerId);
      break;
  }
}

async function handleRename(interaction: ChatInputCommandInteraction, channel: VoiceChannel): Promise<void> {
  const newName = interaction.options.getString('name', true);
  
  if (newName.length > 100) {
    await interaction.reply({
      content: '❌ Название канала не может быть длиннее 100 символов.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const oldName = channel.name;
    await channel.setName(newName);
    
    await interaction.reply({
      content: `✅ Канал переименован: **${oldName}** → **${newName}**`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[Voice] Failed to rename channel:', error);
    await interaction.reply({
      content: '❌ Не удалось переименовать канал.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleLimit(interaction: ChatInputCommandInteraction, channel: VoiceChannel): Promise<void> {
  const limit = interaction.options.getInteger('count', true);

  try {
    await channel.setUserLimit(limit);
    
    const message = limit === 0 
      ? '✅ Лимит пользователей убран.'
      : `✅ Установлен лимит: **${limit}** пользователей.`;
    
    await interaction.reply({
      content: message,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[Voice] Failed to set limit:', error);
    await interaction.reply({
      content: '❌ Не удалось установить лимит.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleLock(interaction: ChatInputCommandInteraction, channel: VoiceChannel): Promise<void> {
  try {
    // Deny connect permission for @everyone
    await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
      Connect: false,
    });
    
    await interaction.reply({
      content: '🔒 Канал закрыт. Новые пользователи не могут присоединиться.',
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[Voice] Failed to lock channel:', error);
    await interaction.reply({
      content: '❌ Не удалось закрыть канал.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleUnlock(interaction: ChatInputCommandInteraction, channel: VoiceChannel): Promise<void> {
  try {
    // Reset connect permission for @everyone
    await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
      Connect: null,
    });
    
    await interaction.reply({
      content: '🔓 Канал открыт. Все могут присоединиться.',
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[Voice] Failed to unlock channel:', error);
    await interaction.reply({
      content: '❌ Не удалось открыть канал.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleKick(interaction: ChatInputCommandInteraction, channel: VoiceChannel): Promise<void> {
  const targetUser = interaction.options.getUser('user', true);
  
  // Can't kick yourself
  if (targetUser.id === interaction.user.id) {
    await interaction.reply({
      content: '❌ Вы не можете выгнать себя.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Find member in channel
  const targetMember = channel.members.get(targetUser.id);
  if (!targetMember) {
    await interaction.reply({
      content: '❌ Этот пользователь не находится в вашем канале.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await targetMember.voice.disconnect('Kicked by channel owner');
    
    await interaction.reply({
      content: `✅ Пользователь **${targetUser.displayName}** был выгнан из канала.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[Voice] Failed to kick user:', error);
    await interaction.reply({
      content: '❌ Не удалось выгнать пользователя.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handlePermit(interaction: ChatInputCommandInteraction, channel: VoiceChannel): Promise<void> {
  const targetUser = interaction.options.getUser('user', true);

  try {
    // Allow this user to connect even if channel is locked
    await channel.permissionOverwrites.edit(targetUser.id, {
      Connect: true,
      ViewChannel: true,
    });
    
    await interaction.reply({
      content: `✅ Пользователь **${targetUser.displayName}** теперь может присоединиться к каналу.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[Voice] Failed to permit user:', error);
    await interaction.reply({
      content: '❌ Не удалось добавить разрешение.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleReject(interaction: ChatInputCommandInteraction, channel: VoiceChannel): Promise<void> {
  const targetUser = interaction.options.getUser('user', true);
  
  // Can't reject yourself
  if (targetUser.id === interaction.user.id) {
    await interaction.reply({
      content: '❌ Вы не можете забанить себя.',
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
      content: `✅ Пользователь **${targetUser.displayName}** заблокирован и не может присоединиться.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[Voice] Failed to reject user:', error);
    await interaction.reply({
      content: '❌ Не удалось заблокировать пользователя.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleInfo(interaction: ChatInputCommandInteraction, channel: VoiceChannel, ownerId: string): Promise<void> {
  const owner = await interaction.guild!.members.fetch(ownerId).catch(() => null);
  
  const embed = new EmbedBuilder()
    .setTitle(`🔊 ${channel.name}`)
    .setColor(0x5865F2)
    .addFields(
      { name: '👑 Владелец', value: owner ? `<@${ownerId}>` : 'Unknown', inline: true },
      { name: '👥 Участников', value: `${channel.members.size}${channel.userLimit > 0 ? `/${channel.userLimit}` : ''}`, inline: true },
      { name: '🔒 Статус', value: isChannelLocked(channel) ? 'Закрыт' : 'Открыт', inline: true },
      { name: '📁 Категория', value: channel.parent?.name ?? 'None', inline: true },
      { name: '🎚️ Битрейт', value: `${channel.bitrate / 1000}kbps`, inline: true },
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
