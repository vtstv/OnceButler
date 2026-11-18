// Copyright (c) 2026 Murr (https://github.com/vtstv)
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
import { getGuildSteamGames } from '../../../../database/repositories/guildSteamGamesRepo.js';
import { getSelectedSteamNewsModel } from '../../../../database/repositories/botSettingsRepo.js';
import type { SetupView } from '../types.js';

export function buildSteamNewsSettings(settings: GuildSettings, guild: any): SetupView {
  const channelName = settings.steamNewsChannelId
    ? guild?.channels.cache.get(settings.steamNewsChannelId)?.name ?? 'Unknown'
    : 'Not set';

  const hasApiKey = !!settings.steamNewsGeminiKey;
  const isConfigured = settings.steamNewsChannelId && hasApiKey;
  const currentModel = getSelectedSteamNewsModel();
  const isOriginal = settings.steamNewsMode === 'original';

  const games = guild?.id ? getGuildSteamGames(guild.id) : [];

  let gamesDisplay = '❌ Игры не настроены. Нажмите «➕ Add Game», чтобы добавить.';
  if (games.length > 0) {
    gamesDisplay = games
      .map(g => {
        const cName = guild?.channels.cache.get(g.channelId)?.name;
        const cText = cName ? `#${cName}` : (settings.steamNewsChannelId ? `#${channelName}` : '❌ Not set');
        return `• **${g.gameName}** (\`${g.appId}\`) ➔ ${cText}`;
      })
      .join('\n');
  } else if (!settings.steamNewsCustomized && settings.enableSteamNews && settings.steamNewsChannelId) {
    gamesDisplay = `• **Once Human** (\`2139460\`) ➔ #${channelName} *(Текущая игра)*`;
  }

  const embed = new EmbedBuilder()
    .setTitle('📰 Steam News — Настройка обновлений')
    .setDescription(
      'Автоматически получает новости об обновлениях игр из Steam, ' +
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
        name: '📢 Default Channel', 
        value: settings.steamNewsChannelId ? `#${channelName}` : '❌ Not set', 
        inline: true 
      },
      { 
        name: '🤖 Gemini Model', 
        value: `\`${currentModel}\``, 
        inline: true 
      },
      { 
        name: '🔑 Gemini API Key', 
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
        name: '🌐 Format Mode', 
        value: isOriginal ? '🔤 Original Language' : '🇷🇺 Localized', 
        inline: true 
      },
      {
        name: `🎮 Monitored Games (${games.length > 0 ? games.length : 1})`,
        value: gamesDisplay,
        inline: false
      },
      {
        name: '🔧 Features',
        value: [
          isOriginal 
            ? '• Summary in original language (no RU translation)' 
            : '• Automatic translation to Russian & structured summary',
          '• Specialized prompt for Once Human (RaidZone exclusion, maintenance timestamps)',
          '• Smart update filtering & duplicate prevention',
          '• Multi-game support with custom Steam AppIDs',
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
      new ButtonBuilder()
        .setCustomId('setup_steamnews_add_game_modal')
        .setLabel('➕ Add Game (AppID)')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('setup_toggle_steamnews_mode')
        .setLabel(isOriginal ? '🌐 Mode: 🔤 Original Language' : '🌐 Mode: 🇷🇺 Localized')
        .setStyle(ButtonStyle.Secondary),
    );

  const channelSelect = new ActionRowBuilder<ChannelSelectMenuBuilder>()
    .addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_steamnews_channel')
        .setPlaceholder('📢 Select default channel for news')
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

  const components: ActionRowBuilder<any>[] = [row1, row2, channelSelect, intervalSelect];

  if (games.length > 0) {
    const removeGameSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('setup_steamnews_remove_game')
          .setPlaceholder('🗑️ Remove a monitored game...')
          .addOptions(
            games.slice(0, 25).map(g => ({
              label: g.gameName.slice(0, 100),
              value: g.appId.toString(),
              description: `AppID: ${g.appId}`,
              emoji: '🎮',
            }))
          )
      );
    components.push(removeGameSelect);
  }

  return {
    embeds: [embed],
    components,
  };
}
