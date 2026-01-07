// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Steam News Setup Builder
// Licensed under MIT License

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} from 'discord.js';
import type { GuildSettings } from '../../../../database/repositories/settingsRepo.js';
import type { SetupView } from '../types.js';

export function buildSteamNewsSettings(settings: GuildSettings, guild: any): SetupView {
  const channelName = settings.steamNewsChannelId
    ? guild?.channels.cache.get(settings.steamNewsChannelId)?.name ?? 'Unknown'
    : 'Not set';

  const hasApiKey = !!settings.steamNewsGeminiKey;
  const isConfigured = settings.steamNewsChannelId && hasApiKey;

  const embed = new EmbedBuilder()
    .setTitle('📰 Steam News - Once Human')
    .setDescription(
      'Автоматически получает новости об обновлениях Once Human из Steam, ' +
      'переводит их на русский язык с помощью Google Gemini AI и публикует в выбранный канал.'
    )
    .setColor(0x1B2838)
    .addFields(
      { 
        name: '📊 Status', 
        value: settings.enableSteamNews ? '✅ Enabled' : '❌ Disabled', 
        inline: true 
      },
      { 
        name: '📢 Channel', 
        value: settings.steamNewsChannelId ? `#${channelName}` : '❌ Not set', 
        inline: true 
      },
      { 
        name: '🤖 Gemini API', 
        value: hasApiKey ? '✅ Configured' : '❌ Not set', 
        inline: true 
      },
      { 
        name: '⏱️ Check Interval', 
        value: settings.steamNewsCheckInterval >= 60 
          ? `Every ${settings.steamNewsCheckInterval / 60} hour(s)` 
          : `Every ${settings.steamNewsCheckInterval} minutes`, 
        inline: true 
      },
      {
        name: '🎮 Game',
        value: 'Once Human (Steam AppID: 2139460)',
        inline: true
      },
      {
        name: '🔧 Features',
        value: [
          '• Automatic translation to Russian',
          '• Smart filtering of update news',
          '• Excludes RaidZone Mode content',
          '• Duplicate prevention',
          '• Concise summary format',
        ].join('\n'),
        inline: false
      },
      {
        name: '⚠️ Requirements',
        value: !isConfigured 
          ? '1. Select a channel for news\n2. Set Gemini API key (click button below)'
          : '✅ All configured!',
        inline: false
      },
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_toggle_steamnews')
        .setLabel(settings.enableSteamNews ? '⏸️ Disable' : '▶️ Enable')
        .setStyle(settings.enableSteamNews ? ButtonStyle.Danger : ButtonStyle.Success)
        .setDisabled(!isConfigured && !settings.enableSteamNews),
      new ButtonBuilder()
        .setCustomId('setup_steamnews_apikey_modal')
        .setLabel('🔑 Set Gemini API Key')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_steamnews_test')
        .setLabel('🧪 Test')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!isConfigured),
      new ButtonBuilder()
        .setCustomId('setup_steamnews_force')
        .setLabel('🚀 Post Now')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!isConfigured || !settings.enableSteamNews),
    );
  
  const row2 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_back')
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary),
    );

  const channelSelect = new ActionRowBuilder<ChannelSelectMenuBuilder>()
    .addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_steamnews_channel')
        .setPlaceholder('📢 Select channel for news')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    );

  const intervalSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('setup_steamnews_interval')
        .setPlaceholder('⏱️ Check interval')
        .addOptions([
          { label: 'Every hour', value: '60', description: 'Recommended', default: settings.steamNewsCheckInterval === 60 },
          { label: 'Every 6 hours', value: '360', description: 'Less frequent' },
          { label: 'Every 24 hours', value: '1440', description: 'Daily check' },
        ])
    );

  return {
    embeds: [embed],
    components: [row1, row2, channelSelect, intervalSelect],
  };
}
