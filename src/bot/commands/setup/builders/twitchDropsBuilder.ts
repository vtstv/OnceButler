// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Twitch Drops Setup Builder
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

export function buildTwitchDropsSettings(settings: GuildSettings, guild: any): SetupView {
  const channelName = settings.twitchDropsChannelId
    ? guild?.channels.cache.get(settings.twitchDropsChannelId)?.name ?? 'Unknown'
    : 'Not set';

  const hasApiKey = !!settings.twitchDropsApiKey;
  const hasApiUrl = !!settings.twitchDropsApiUrl;
  const isConfigured = settings.twitchDropsChannelId && hasApiKey && hasApiUrl;

  const embed = new EmbedBuilder()
    .setTitle('🎮 Twitch Drops Notifier')
    .setDescription(
      'Automatically checks for new Twitch drops campaigns and posts notifications to your server. ' +
      'Monitors all games configured in the TwithDropsNotifier API.'
    )
    .setColor(0x9146FF) // Twitch purple
    .addFields(
      { 
        name: '📊 Status', 
        value: settings.enableTwitchDrops ? '✅ Enabled' : '❌ Disabled', 
        inline: true 
      },
      { 
        name: '📢 Channel', 
        value: settings.twitchDropsChannelId ? `#${channelName}` : '❌ Not set', 
        inline: true 
      },
      { 
        name: '🔑 API Key', 
        value: hasApiKey ? '✅ Configured' : '❌ Not set', 
        inline: true 
      },
      { 
        name: '🌐 API URL', 
        value: settings.twitchDropsApiUrl || '❌ Not set', 
        inline: true 
      },
      { 
        name: '⏱️ Check Interval', 
        value: settings.twitchDropsCheckInterval >= 60 
          ? `Every ${settings.twitchDropsCheckInterval / 60} hour(s)` 
          : `Every ${settings.twitchDropsCheckInterval} minutes`, 
        inline: true 
      },
      {
        name: '🔧 Features',
        value: [
          '• Multi-game support',
          '• Automatic duplicate prevention',
          '• Campaign details with drops',
          '• Reward images',
          '• Discord timestamp formatting',
        ].join('\n'),
        inline: false
      },
      {
        name: '⚠️ Requirements',
        value: !isConfigured 
          ? '1. Select a channel for notifications\n2. Set API URL\n3. Set API key (click button below)'
          : '✅ All configured!',
        inline: false
      },
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_toggle_twitchdrops')
        .setLabel(settings.enableTwitchDrops ? '⏸️ Disable' : '▶️ Enable')
        .setStyle(settings.enableTwitchDrops ? ButtonStyle.Danger : ButtonStyle.Success)
        .setDisabled(!isConfigured && !settings.enableTwitchDrops),
      new ButtonBuilder()
        .setCustomId('setup_twitchdrops_apiurl_modal')
        .setLabel('🌐 Set API URL')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_twitchdrops_apikey_modal')
        .setLabel('🔑 Set API Key')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_twitchdrops_test')
        .setLabel('🧪 Test')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!isConfigured),
      new ButtonBuilder()
        .setCustomId('setup_back')
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary),
    );

  const channelSelect = new ActionRowBuilder<ChannelSelectMenuBuilder>()
    .addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_twitchdrops_channel')
        .setPlaceholder('📢 Select channel for notifications')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    );

  const intervalSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('setup_twitchdrops_interval')
        .setPlaceholder('⏱️ Check interval')
        .addOptions([
          { label: 'Every hour', value: '60', description: 'Recommended', default: settings.twitchDropsCheckInterval === 60 },
          { label: 'Every 6 hours', value: '360', description: 'Less frequent' },
          { label: 'Every 12 hours', value: '720', description: 'Twice daily' },
          { label: 'Every 24 hours', value: '1440', description: 'Daily check' },
        ])
    );

  return {
    embeds: [embed],
    components: [row1, channelSelect, intervalSelect],
  };
}
