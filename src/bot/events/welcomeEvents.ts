// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Welcome/Leave Event Handler
// Licensed under MIT License

import { GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { getGuildSettings } from '../../database/repositories/settingsRepo.js';
import { formatWelcomeMessage, DEFAULT_WELCOME_MESSAGES, DEFAULT_LEAVE_MESSAGES } from '../commands/setup/welcomeBuilder.js';

export async function handleGuildMemberAdd(member: GuildMember): Promise<void> {
  const settings = getGuildSettings(member.guild.id);
  
  if (!settings.enableWelcome || !settings.welcomeChannelId) {
    return;
  }

  const channel = member.guild.channels.cache.get(settings.welcomeChannelId);
  if (!channel || !(channel instanceof TextChannel)) {
    return;
  }

  // Get message template
  const lang = settings.language as 'en' | 'ru' | 'de';
  const template = settings.welcomeMessage || DEFAULT_WELCOME_MESSAGES[lang] || DEFAULT_WELCOME_MESSAGES.en;
  
  // Format the message
  const formattedMessage = formatWelcomeMessage(
    template,
    member.user,
    member.guild.name,
    member.guild.memberCount
  );

  // Create embed
  const embed = new EmbedBuilder()
    .setColor(0x57F287) // Green
    .setTitle('👋 Welcome!')
    .setDescription(formattedMessage)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp()
    .setFooter({ text: `Member #${member.guild.memberCount}` });

  try {
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(`[Welcome] Failed to send welcome message in ${member.guild.name}:`, error);
  }
}

export async function handleGuildMemberRemove(member: GuildMember): Promise<void> {
  const settings = getGuildSettings(member.guild.id);
  
  if (!settings.enableWelcome || !settings.welcomeChannelId) {
    return;
  }

  const channel = member.guild.channels.cache.get(settings.welcomeChannelId);
  if (!channel || !(channel instanceof TextChannel)) {
    return;
  }

  // Get message template
  const lang = settings.language as 'en' | 'ru' | 'de';
  const template = settings.leaveMessage || DEFAULT_LEAVE_MESSAGES[lang] || DEFAULT_LEAVE_MESSAGES.en;
  
  // Format the message
  const formattedMessage = formatWelcomeMessage(
    template,
    member.user,
    member.guild.name,
    member.guild.memberCount
  );

  // Create embed
  const embed = new EmbedBuilder()
    .setColor(0xED4245) // Red
    .setTitle('👋 Goodbye!')
    .setDescription(formattedMessage)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp()
    .setFooter({ text: `Members: ${member.guild.memberCount}` });

  try {
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(`[Welcome] Failed to send leave message in ${member.guild.name}:`, error);
  }
}
