// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Main Menu Builder
// Licensed under MIT License

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import type { GuildSettings } from '../../../database/repositories/settingsRepo.js';
import type { SetupView } from './types.js';

export function buildMainMenu(settings: GuildSettings, guild: any): SetupView {
  const isComplete = settings.setupComplete;
  const leaderboardChannelName = settings.leaderboardChannelId 
    ? guild?.channels.cache.get(settings.leaderboardChannelId)?.name ?? 'Unknown'
    : 'Not set';
  const welcomeChannelName = settings.welcomeChannelId
    ? guild?.channels.cache.get(settings.welcomeChannelId)?.name ?? 'Unknown'
    : 'Not set';

  const embed = new EmbedBuilder()
    .setTitle('⚙️ OnceButler Setup')
    .setDescription(isComplete 
      ? '✅ Setup is complete. Select a category to modify settings.'
      : '🔧 Configure the bot before it starts managing roles. Select a category below.')
    .setColor(isComplete ? 0x00FF00 : 0xFFAA00)
    .addFields(
      { 
        name: '🌐 General Settings', 
        value: `Language: \`${settings.language.toUpperCase()}\` | Preset: \`${settings.rolePreset.toUpperCase()}\` | Max Roles: \`${settings.maxRolesPerUser}\``, 
        inline: false 
      },
      { 
        name: '🎮 Features', 
        value: [
          settings.enableRoleColors ? '✅ Colors' : '❌ Colors',
          settings.enableChaosRoles ? '✅ Chaos' : '❌ Chaos',
          settings.enableAchievements ? '✅ Achievements' : '❌ Achievements',
        ].join(' | '), 
        inline: false 
      },
      {
        name: '📊 Auto Leaderboard',
        value: settings.enableAutoLeaderboard 
          ? `✅ Every ${settings.leaderboardIntervalMinutes}min → #${leaderboardChannelName}`
          : '❌ Disabled',
        inline: true
      },
      {
        name: '👋 Welcome/Leave',
        value: settings.enableWelcome
          ? `✅ → #${welcomeChannelName}`
          : '❌ Disabled',
        inline: true
      },
      {
        name: '💰 Economy',
        value: settings.enableEconomy
          ? `✅ Daily: ${settings.economyDailyReward} coins`
          : '❌ Disabled',
        inline: true
      },
      {
        name: '🎉 Giveaways',
        value: settings.enableGiveaways
          ? `✅ Max ${settings.giveawayMaxWinners} winners`
          : '❌ Disabled',
        inline: true
      },
      {
        name: '🎭 Reaction Roles',
        value: settings.enableReactionRoles ? '✅ Enabled' : '❌ Disabled',
        inline: true
      },
      {
        name: '📈 Leveling',
        value: settings.enableLeveling 
          ? `✅ ${settings.levelingXpPerMessage} XP/msg`
          : '❌ Disabled',
        inline: true
      },
      {
        name: '🎨 Image Gen',
        value: settings.enableImageGen 
          ? `✅ ${settings.imageGenUserDailyLimit}/user`
          : '❌ Disabled',
        inline: true
      },
      {
        name: '� Temp Voice',
        value: settings.enableTempVoice 
          ? '✅ Enabled'
          : '❌ Disabled',
        inline: true
      },
      {
        name: '�📈 Stat Rates',
        value: `Gain: \`${settings.statGainMultiplier}x\` | Loss: \`${settings.statDrainMultiplier}x\``,
        inline: false
      },
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_cat_general')
        .setLabel('🌐 General')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_cat_features')
        .setLabel('🎮 Features')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_cat_stats')
        .setLabel('📈 Stats')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_cat_roles')
        .setLabel('🎭 Roles')
        .setStyle(ButtonStyle.Primary),
    );

  const row2 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_cat_leaderboard')
        .setLabel('📊 Leaderboard')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_cat_welcome')
        .setLabel('👋 Welcome')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_cat_customRoles')
        .setLabel('🔧 Custom Roles')
        .setStyle(ButtonStyle.Secondary),
    );

  const row3 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_cat_economy')
        .setLabel('💰 Economy')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_cat_giveaways')
        .setLabel('🎉 Giveaways')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_cat_reactionRoles')
        .setLabel('🎭 Reactions')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_cat_leveling')
        .setLabel('📈 Leveling')
        .setStyle(ButtonStyle.Secondary),
    );

  const row4 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_cat_imageGen')
        .setLabel('🎨 Image Gen')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_cat_tempVoice')
        .setLabel('🔊 Temp Voice')
        .setStyle(ButtonStyle.Secondary),
    );

  const actionButtons = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_complete')
        .setLabel(isComplete ? '✅ Setup Complete' : '🚀 Complete Setup')
        .setStyle(isComplete ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(isComplete),
    );

  return {
    embeds: [embed],
    components: [row1, row2, row3, row4, actionButtons],
  };
}
