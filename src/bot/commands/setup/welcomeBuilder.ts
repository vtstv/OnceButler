// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Welcome/Leave Settings Builder
// Licensed under MIT License

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} from 'discord.js';
import type { GuildSettings } from '../../../database/repositories/settingsRepo.js';
import { t } from '../../../utils/i18n.js';
import type { SetupView } from './types.js';

export function buildWelcomeSettings(settings: GuildSettings, guild: any): SetupView {
  const welcomeChannelName = settings.welcomeChannelId
    ? guild?.channels.cache.get(settings.welcomeChannelId)?.name ?? 'Unknown'
    : 'Not set';

  const embed = new EmbedBuilder()
    .setTitle('👋 Welcome/Leave Messages')
    .setDescription('Configure welcome and leave messages for new members.\n\n' +
      '**Variables you can use:**\n' +
      '`{user}` — Mention the user\n' +
      '`{username}` — Username\n' +
      '`{server}` — Server name\n' +
      '`{memberCount}` — Member count')
    .setColor(0x5865F2)
    .addFields(
      { name: '📊 Status', value: settings.enableWelcome ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: '📢 Channel', value: `#${welcomeChannelName}`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { 
        name: '👋 Welcome Message', 
        value: settings.welcomeMessage ? `\`\`\`${settings.welcomeMessage.slice(0, 100)}${settings.welcomeMessage.length > 100 ? '...' : ''}\`\`\`` : '`Default message`', 
        inline: false 
      },
      { 
        name: '🚪 Leave Message', 
        value: settings.leaveMessage ? `\`\`\`${settings.leaveMessage.slice(0, 100)}${settings.leaveMessage.length > 100 ? '...' : ''}\`\`\`` : '`Default message`', 
        inline: false 
      },
    );

  const toggleButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_toggle_welcome')
        .setLabel(settings.enableWelcome ? '👋 Disable Welcome' : '👋 Enable Welcome')
        .setStyle(settings.enableWelcome ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('setup_welcome_test')
        .setLabel('🧪 Test Messages')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!settings.enableWelcome),
    );

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId('setup_welcome_channel')
    .setPlaceholder('Select Welcome Channel')
    .setChannelTypes(ChannelType.GuildText)
    .setDisabled(!settings.enableWelcome);

  const messageTypeSelect = new StringSelectMenuBuilder()
    .setCustomId('setup_welcome_message_type')
    .setPlaceholder('Edit Message...')
    .setDisabled(!settings.enableWelcome)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('✏️ Edit Welcome Message')
        .setValue('welcome')
        .setDescription('Customize the welcome message'),
      new StringSelectMenuOptionBuilder()
        .setLabel('✏️ Edit Leave Message')
        .setValue('leave')
        .setDescription('Customize the leave message'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🔄 Reset to Default')
        .setValue('reset')
        .setDescription('Reset both messages to default'),
    );

  const backButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_cat_main')
        .setLabel('◀️ Back to Main')
        .setStyle(ButtonStyle.Secondary),
    );

  return {
    embeds: [embed],
    components: [
      toggleButton,
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect),
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(messageTypeSelect),
      backButton,
    ],
  };
}

// Default messages for each language
export const DEFAULT_WELCOME_MESSAGES: Record<string, string> = {
  en: '👋 Welcome to **{server}**, {user}! You are member #{memberCount}!',
  ru: '👋 Добро пожаловать на **{server}**, {user}! Ты участник #{memberCount}!',
  de: '👋 Willkommen auf **{server}**, {user}! Du bist Mitglied #{memberCount}!',
};

export const DEFAULT_LEAVE_MESSAGES: Record<string, string> = {
  en: '🚪 **{username}** has left the server. We now have {memberCount} members.',
  ru: '🚪 **{username}** покинул(а) сервер. Теперь нас {memberCount} участников.',
  de: '🚪 **{username}** hat den Server verlassen. Wir haben jetzt {memberCount} Mitglieder.',
};

export function formatWelcomeMessage(
  template: string,
  user: { toString(): string; username: string },
  server: string,
  memberCount: number
): string {
  return template
    .replace(/{user}/g, user.toString())
    .replace(/{username}/g, user.username)
    .replace(/{server}/g, server)
    .replace(/{memberCount}/g, memberCount.toString());
}
