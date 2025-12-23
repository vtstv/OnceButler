// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - General Settings Builder
// Licensed under MIT License

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import type { GuildSettings } from '../../../database/repositories/settingsRepo.js';
import type { SetupView } from './types.js';

export function buildGeneralSettings(settings: GuildSettings): SetupView {
  const embed = new EmbedBuilder()
    .setTitle('🌐 General Settings')
    .setDescription('Configure language, role preset, and role limits.')
    .setColor(0x5865F2)
    .addFields(
      { name: '🌐 Language', value: `\`${settings.language.toUpperCase()}\``, inline: true },
      { name: '🎭 Role Preset', value: `\`${settings.rolePreset.toUpperCase()}\``, inline: true },
      { name: '👥 Max Roles', value: `\`${settings.maxRolesPerUser}\``, inline: true },
    );

  const languageSelect = new StringSelectMenuBuilder()
    .setCustomId('setup_language')
    .setPlaceholder('Select Language')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('🇺🇸 English').setValue('en').setDefault(settings.language === 'en'),
      new StringSelectMenuOptionBuilder().setLabel('🇷🇺 Русский').setValue('ru').setDefault(settings.language === 'ru'),
      new StringSelectMenuOptionBuilder().setLabel('🇩🇪 Deutsch').setValue('de').setDefault(settings.language === 'de'),
    );

  const presetSelect = new StringSelectMenuBuilder()
    .setCustomId('setup_preset')
    .setPlaceholder('Select Role Preset')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('🇺🇸 English Roles').setValue('en').setDefault(settings.rolePreset === 'en'),
      new StringSelectMenuOptionBuilder().setLabel('🇷🇺 Russian Roles').setValue('ru').setDefault(settings.rolePreset === 'ru'),
    );

  const maxRolesSelect = new StringSelectMenuBuilder()
    .setCustomId('setup_maxroles')
    .setPlaceholder('Max Roles Per User')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('1 Role').setValue('1').setDefault(settings.maxRolesPerUser === 1),
      new StringSelectMenuOptionBuilder().setLabel('2 Roles').setValue('2').setDefault(settings.maxRolesPerUser === 2),
      new StringSelectMenuOptionBuilder().setLabel('3 Roles').setValue('3').setDefault(settings.maxRolesPerUser === 3),
      new StringSelectMenuOptionBuilder().setLabel('4 Roles').setValue('4').setDefault(settings.maxRolesPerUser === 4),
      new StringSelectMenuOptionBuilder().setLabel('5 Roles').setValue('5').setDefault(settings.maxRolesPerUser === 5),
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
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(languageSelect),
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(presetSelect),
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(maxRolesSelect),
      backButton,
    ],
  };
}

export function buildFeatureSettings(settings: GuildSettings): SetupView {
  const embed = new EmbedBuilder()
    .setTitle('🎮 Feature Settings')
    .setDescription('Toggle bot features on or off.')
    .setColor(0x5865F2)
    .addFields(
      { name: '🎨 Role Colors', value: settings.enableRoleColors ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: '🎲 Chaos Roles', value: settings.enableChaosRoles ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: '🏆 Achievements', value: settings.enableAchievements ? '✅ Enabled' : '❌ Disabled', inline: true },
    );

  const toggleButtons = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_toggle_colors')
        .setLabel(settings.enableRoleColors ? '🎨 Disable Colors' : '🎨 Enable Colors')
        .setStyle(settings.enableRoleColors ? ButtonStyle.Secondary : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('setup_toggle_chaos')
        .setLabel(settings.enableChaosRoles ? '🎲 Disable Chaos' : '🎲 Enable Chaos')
        .setStyle(settings.enableChaosRoles ? ButtonStyle.Secondary : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('setup_toggle_achievements')
        .setLabel(settings.enableAchievements ? '🏆 Disable Achievements' : '🏆 Enable Achievements')
        .setStyle(settings.enableAchievements ? ButtonStyle.Secondary : ButtonStyle.Success),
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
    components: [toggleButtons, backButton],
  };
}

export function buildStatSettings(settings: GuildSettings): SetupView {
  const embed = new EmbedBuilder()
    .setTitle('📈 Stat Rate Settings')
    .setDescription('Configure how fast users gain and lose stats.\n\n' +
      '**Gain Rate** — affects voice chat bonus, mood boost, etc.\n' +
      '**Loss Rate** — affects energy drain, mood decay, etc.\n\n' +
      '💡 Lower loss rate = stats persist longer!')
    .setColor(0x5865F2)
    .addFields(
      { name: '⬆️ Gain Rate', value: `\`${settings.statGainMultiplier}x\``, inline: true },
      { name: '⬇️ Loss Rate', value: `\`${settings.statDrainMultiplier}x\``, inline: true },
    );

  const gainSelect = new StringSelectMenuBuilder()
    .setCustomId('setup_stat_gain')
    .setPlaceholder('Select Gain Rate')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('0.25x — Very Slow').setValue('0.25').setDefault(settings.statGainMultiplier === 0.25),
      new StringSelectMenuOptionBuilder().setLabel('0.5x — Slow').setValue('0.5').setDefault(settings.statGainMultiplier === 0.5),
      new StringSelectMenuOptionBuilder().setLabel('0.75x — Moderate').setValue('0.75').setDefault(settings.statGainMultiplier === 0.75),
      new StringSelectMenuOptionBuilder().setLabel('1.0x — Normal').setValue('1.0').setDefault(settings.statGainMultiplier === 1.0),
      new StringSelectMenuOptionBuilder().setLabel('1.25x — Fast').setValue('1.25').setDefault(settings.statGainMultiplier === 1.25),
      new StringSelectMenuOptionBuilder().setLabel('1.5x — Very Fast').setValue('1.5').setDefault(settings.statGainMultiplier === 1.5),
      new StringSelectMenuOptionBuilder().setLabel('2.0x — Rapid').setValue('2.0').setDefault(settings.statGainMultiplier === 2.0),
    );

  const drainSelect = new StringSelectMenuBuilder()
    .setCustomId('setup_stat_drain')
    .setPlaceholder('Select Loss Rate')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('0.1x — Minimal Loss').setValue('0.1').setDefault(settings.statDrainMultiplier === 0.1),
      new StringSelectMenuOptionBuilder().setLabel('0.25x — Very Slow').setValue('0.25').setDefault(settings.statDrainMultiplier === 0.25),
      new StringSelectMenuOptionBuilder().setLabel('0.5x — Slow (default)').setValue('0.5').setDefault(settings.statDrainMultiplier === 0.5),
      new StringSelectMenuOptionBuilder().setLabel('0.75x — Moderate').setValue('0.75').setDefault(settings.statDrainMultiplier === 0.75),
      new StringSelectMenuOptionBuilder().setLabel('1.0x — Normal').setValue('1.0').setDefault(settings.statDrainMultiplier === 1.0),
      new StringSelectMenuOptionBuilder().setLabel('1.5x — Fast').setValue('1.5').setDefault(settings.statDrainMultiplier === 1.5),
      new StringSelectMenuOptionBuilder().setLabel('2.0x — Very Fast').setValue('2.0').setDefault(settings.statDrainMultiplier === 2.0),
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
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(gainSelect),
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(drainSelect),
      backButton,
    ],
  };
}

export function buildLeaderboardSettings(settings: GuildSettings, guild: any): SetupView {
  const leaderboardChannelName = settings.leaderboardChannelId 
    ? guild?.channels.cache.get(settings.leaderboardChannelId)?.name ?? 'Unknown'
    : 'Not set';

  const embed = new EmbedBuilder()
    .setTitle('📊 Auto Leaderboard Settings')
    .setDescription('Configure automatic leaderboard posting.')
    .setColor(0x5865F2)
    .addFields(
      { name: '📊 Status', value: settings.enableAutoLeaderboard ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: '⏱️ Interval', value: `${settings.leaderboardIntervalMinutes} minutes`, inline: true },
      { name: '📢 Channel', value: `#${leaderboardChannelName}`, inline: true },
    );

  const toggleButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_toggle_autoleaderboard')
        .setLabel(settings.enableAutoLeaderboard ? '📊 Disable Auto Leaderboard' : '📊 Enable Auto Leaderboard')
        .setStyle(settings.enableAutoLeaderboard ? ButtonStyle.Danger : ButtonStyle.Success),
    );

  const intervalSelect = new StringSelectMenuBuilder()
    .setCustomId('setup_leaderboard_interval')
    .setPlaceholder('Select Interval')
    .setDisabled(!settings.enableAutoLeaderboard)
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('30 minutes').setValue('30').setDefault(settings.leaderboardIntervalMinutes === 30),
      new StringSelectMenuOptionBuilder().setLabel('1 hour').setValue('60').setDefault(settings.leaderboardIntervalMinutes === 60),
      new StringSelectMenuOptionBuilder().setLabel('2 hours').setValue('120').setDefault(settings.leaderboardIntervalMinutes === 120),
      new StringSelectMenuOptionBuilder().setLabel('4 hours').setValue('240').setDefault(settings.leaderboardIntervalMinutes === 240),
      new StringSelectMenuOptionBuilder().setLabel('8 hours').setValue('480').setDefault(settings.leaderboardIntervalMinutes === 480),
      new StringSelectMenuOptionBuilder().setLabel('12 hours').setValue('720').setDefault(settings.leaderboardIntervalMinutes === 720),
      new StringSelectMenuOptionBuilder().setLabel('24 hours').setValue('1440').setDefault(settings.leaderboardIntervalMinutes === 1440),
    );

  const { ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId('setup_leaderboard_channel')
    .setPlaceholder('Select Channel')
    .setChannelTypes(ChannelType.GuildText)
    .setDisabled(!settings.enableAutoLeaderboard);

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
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(intervalSelect),
      new ActionRowBuilder().addComponents(channelSelect),
      backButton,
    ],
  };
}
