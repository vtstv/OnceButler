// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Setup Command
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
  Message,
  RoleSelectMenuBuilder,
} from 'discord.js';
import { 
  getGuildSettings, 
  updateGuildSettings, 
  completeSetup,
  type GuildSettings,
} from '../../database/repositories/settingsRepo.js';
import { importRolesToGuild } from '../../roles/roleImporter.js';
import { getMapping, getRoles } from '../../roles/roleStore.js';
import { getAllBotRoles, getMoodRoles, getEnergyRoles, getActivityRoles, getTimeRoles, getChaosRoles } from '../../roles/roleRules.js';
import { t } from '../../utils/i18n.js';
import { getLocale, hasAdminPermission } from './utils.js';
import type { RoleCategory } from '../../roles/types.js';
import type { Guild } from 'discord.js';
import { buildWelcomeSettings, formatWelcomeMessage, DEFAULT_WELCOME_MESSAGES, DEFAULT_LEAVE_MESSAGES } from './setup/welcomeBuilder.js';
import { buildCustomRolesSettings, buildCustomRoleAddWizard, buildCustomRoleManage, buildCustomRuleEdit } from './setup/customRolesBuilder.js';
import { 
  createCustomRoleRule, 
  getCustomRoleRuleById, 
  toggleCustomRoleRule, 
  deleteCustomRoleRule,
  type CustomRoleRule 
} from '../../database/repositories/customRolesRepo.js';

type SetupCategory = 'main' | 'general' | 'features' | 'leaderboard' | 'stats' | 'roles' | 'welcome' | 'customRoles';
type RoleSubCategory = 'overview' | 'mood' | 'energy' | 'activity' | 'time' | 'chaos';

const ROLE_COLORS: Record<string, number> = {
  mood: 0xFFD700,
  energy: 0x00FF7F,
  activity: 0x1E90FF,
  time: 0x9370DB,
  chaos: 0xFF4500,
};

async function createRolesByCategory(guild: Guild, settings: GuildSettings, category: RoleCategory): Promise<string[]> {
  const preset = settings.rolePreset;
  let roles: string[] = [];
  
  switch (category) {
    case 'mood': roles = getMoodRoles(preset); break;
    case 'energy': roles = getEnergyRoles(preset); break;
    case 'activity': roles = getActivityRoles(preset); break;
    case 'time': roles = getTimeRoles(preset); break;
    case 'chaos': roles = getChaosRoles(preset); break;
  }
  
  const created: string[] = [];
  for (const roleName of roles) {
    if (!guild.roles.cache.find(r => r.name === roleName)) {
      try {
        const options: any = { name: roleName, reason: 'OnceButler role creation' };
        if (settings.enableRoleColors && ROLE_COLORS[category]) {
          options.color = ROLE_COLORS[category];
        }
        await guild.roles.create(options);
        created.push(roleName);
      } catch (err) {
        console.error(`Failed to create role ${roleName}:`, err);
      }
    }
  }
  return created;
}

async function deleteRolesByCategory(guild: Guild, settings: GuildSettings, category: RoleCategory): Promise<string[]> {
  const preset = settings.rolePreset;
  let roles: string[] = [];
  
  switch (category) {
    case 'mood': roles = getMoodRoles(preset); break;
    case 'energy': roles = getEnergyRoles(preset); break;
    case 'activity': roles = getActivityRoles(preset); break;
    case 'time': roles = getTimeRoles(preset); break;
    case 'chaos': roles = getChaosRoles(preset); break;
  }
  
  const deleted: string[] = [];
  for (const roleName of roles) {
    const role = guild.roles.cache.find(r => r.name === roleName);
    if (role) {
      try {
        await role.delete('OnceButler role cleanup');
        deleted.push(roleName);
      } catch (err) {
        console.error(`Failed to delete role ${roleName}:`, err);
      }
    }
  }
  return deleted;
}

export async function handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!hasAdminPermission(interaction)) {
    const locale = getLocale(interaction);
    await interaction.reply({ content: t(locale, 'errors.adminOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const settings = getGuildSettings(interaction.guild.id);
  
  const message = await interaction.reply({ 
    ...buildCategoryView('main', settings, interaction.guild),
    flags: MessageFlags.Ephemeral,
    fetchReply: true 
  });

  await startCollector(message, interaction.user.id, interaction.guild.id);
}

function buildCategoryView(category: SetupCategory, settings: GuildSettings, guild: any, roleSubCategory?: RoleSubCategory): { embeds: EmbedBuilder[], components: ActionRowBuilder<any>[] } {
  switch (category) {
    case 'main':
      return buildMainMenu(settings, guild);
    case 'general':
      return buildGeneralSettings(settings);
    case 'features':
      return buildFeatureSettings(settings);
    case 'leaderboard':
      return buildLeaderboardSettings(settings, guild);
    case 'stats':
      return buildStatSettings(settings);
    case 'roles':
      return buildRolesSettings(settings, guild, roleSubCategory ?? 'overview');
    case 'welcome':
      return buildWelcomeSettings(settings, guild);
    case 'customRoles':
      return buildCustomRolesSettings(settings, guild);
    default:
      return buildMainMenu(settings, guild);
  }
}

function buildMainMenu(settings: GuildSettings, guild: any): { embeds: EmbedBuilder[], components: ActionRowBuilder<any>[] } {
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
          settings.enableRoleColors ? '✅ Role Colors' : '❌ Role Colors',
          settings.enableChaosRoles ? '✅ Chaos Roles' : '❌ Chaos Roles',
          settings.enableAchievements ? '✅ Achievements' : '❌ Achievements',
        ].join(' | '), 
        inline: false 
      },
      {
        name: '📊 Auto Leaderboard',
        value: settings.enableAutoLeaderboard 
          ? `✅ Every ${settings.leaderboardIntervalMinutes}min → #${leaderboardChannelName}`
          : '❌ Disabled',
        inline: false
      },
      {
        name: '📈 Stat Rates',
        value: `Gain: \`${settings.statGainMultiplier}x\` | Loss: \`${settings.statDrainMultiplier}x\``,
        inline: false
      },
      {
        name: '👋 Welcome/Leave',
        value: settings.enableWelcome 
          ? `✅ Enabled → #${welcomeChannelName}`
          : '❌ Disabled',
        inline: false
      },
    );

  const categoryButtons1 = new ActionRowBuilder<ButtonBuilder>()
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
        .setCustomId('setup_cat_leaderboard')
        .setLabel('📊 Leaderboard')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_cat_stats')
        .setLabel('📈 Stats')
        .setStyle(ButtonStyle.Primary),
    );

  const categoryButtons2 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_cat_roles')
        .setLabel('🎭 Roles')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_cat_welcome')
        .setLabel('👋 Welcome')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_cat_customRoles')
        .setLabel('🔧 Custom Rules')
        .setStyle(ButtonStyle.Primary),
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
    components: [categoryButtons1, categoryButtons2, actionButtons],
  };
}

function buildGeneralSettings(settings: GuildSettings): { embeds: EmbedBuilder[], components: ActionRowBuilder<any>[] } {
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

function buildFeatureSettings(settings: GuildSettings): { embeds: EmbedBuilder[], components: ActionRowBuilder<any>[] } {
  const embed = new EmbedBuilder()
    .setTitle('🎮 Feature Settings')
    .setDescription('Toggle bot features on or off.')
    .setColor(0x5865F2)
    .addFields(
      { name: '🎨 Role Colors', value: settings.enableRoleColors ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: '🎲 Chaos Roles', value: settings.enableChaosRoles ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: '🏆 Achievements', value: settings.enableAchievements ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: '💰 Economy', value: settings.enableEconomy ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: '🎉 Giveaways', value: settings.enableGiveaways ? '✅ Enabled' : '❌ Disabled', inline: true },
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

  const toggleButtons2 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_toggle_economy')
        .setLabel(settings.enableEconomy ? '💰 Disable Economy' : '💰 Enable Economy')
        .setStyle(settings.enableEconomy ? ButtonStyle.Secondary : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('setup_toggle_giveaways')
        .setLabel(settings.enableGiveaways ? '🎉 Disable Giveaways' : '🎉 Enable Giveaways')
        .setStyle(settings.enableGiveaways ? ButtonStyle.Secondary : ButtonStyle.Success),
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
    components: [toggleButtons, toggleButtons2, backButton],
  };
}

function buildLeaderboardSettings(settings: GuildSettings, guild: any): { embeds: EmbedBuilder[], components: ActionRowBuilder<any>[] } {
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
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect),
      backButton,
    ],
  };
}

function buildStatSettings(settings: GuildSettings): { embeds: EmbedBuilder[], components: ActionRowBuilder<any>[] } {
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

function buildRolesSettings(settings: GuildSettings, guild: any, subCategory: RoleSubCategory): { embeds: EmbedBuilder[], components: ActionRowBuilder<any>[] } {
  const preset = settings.rolePreset;
  const mapping = getMapping(preset);
  const allRoles = getAllBotRoles(preset);
  
  // Count existing roles in guild
  const existingRoles = guild?.roles.cache.filter((r: any) => allRoles.includes(r.name)) ?? new Map();
  const existingCount = existingRoles.size;
  const totalCount = allRoles.length;
  
  if (subCategory === 'overview') {
    return buildRolesOverview(settings, guild, existingCount, totalCount, mapping);
  }
  
  return buildRoleCategoryEditor(settings, guild, subCategory as RoleCategory, mapping);
}

function buildRolesOverview(settings: GuildSettings, guild: any, existingCount: number, totalCount: number, mapping: any): { embeds: EmbedBuilder[], components: ActionRowBuilder<any>[] } {
  const preset = settings.rolePreset;
  
  const moodRoles = [mapping.mood.high2, mapping.mood.high1, mapping.mood.mid, mapping.mood.low1, mapping.mood.low2];
  const energyRoles = [mapping.energy.high2, mapping.energy.high1, mapping.energy.mid, mapping.energy.low1, mapping.energy.low2];
  const activityRoles = [mapping.activity.high, mapping.activity.mid1, mapping.activity.mid2, mapping.activity.mid3, mapping.activity.low].filter(Boolean);
  const timeRoles = [mapping.time.night, mapping.time.day, mapping.time.evening];
  const chaosRoles = mapping.chaos;
  
  const countExisting = (roles: string[]) => {
    return roles.filter(r => guild?.roles.cache.find((gr: any) => gr.name === r)).length;
  };
  
  const embed = new EmbedBuilder()
    .setTitle('🎭 Role Management')
    .setDescription(`Manage dynamic roles for your server.\n\n**Preset:** \`${preset.toUpperCase()}\` | **Created:** ${existingCount}/${totalCount}`)
    .setColor(0x5865F2)
    .addFields(
      { name: '😊 Mood Roles', value: `${countExisting(moodRoles)}/${moodRoles.length} created\n${moodRoles.slice(0,3).join(', ')}...`, inline: true },
      { name: '⚡ Energy Roles', value: `${countExisting(energyRoles)}/${energyRoles.length} created\n${energyRoles.slice(0,3).join(', ')}...`, inline: true },
      { name: '📊 Activity Roles', value: `${countExisting(activityRoles)}/${activityRoles.length} created\n${activityRoles.slice(0,3).join(', ')}...`, inline: true },
      { name: '🌙 Time Roles', value: `${countExisting(timeRoles)}/${timeRoles.length} created\n${timeRoles.join(', ')}`, inline: true },
      { name: '🎲 Chaos Roles', value: `${countExisting(chaosRoles)}/${chaosRoles.length} created\n${chaosRoles.slice(0,3).join(', ')}...`, inline: true },
    );

  const categorySelect = new StringSelectMenuBuilder()
    .setCustomId('setup_roles_category')
    .setPlaceholder('Select category to edit')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('😊 Mood Roles').setValue('mood').setDescription('Edit mood-based roles'),
      new StringSelectMenuOptionBuilder().setLabel('⚡ Energy Roles').setValue('energy').setDescription('Edit energy-based roles'),
      new StringSelectMenuOptionBuilder().setLabel('📊 Activity Roles').setValue('activity').setDescription('Edit activity-based roles'),
      new StringSelectMenuOptionBuilder().setLabel('🌙 Time Roles').setValue('time').setDescription('Edit time-of-day roles'),
      new StringSelectMenuOptionBuilder().setLabel('🎲 Chaos Roles').setValue('chaos').setDescription('Edit random chaos roles'),
    );

  const actionButtons = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_roles_create_all')
        .setLabel('📥 Create All Roles')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('setup_roles_delete_unused')
        .setLabel('🗑️ Delete Bot Roles')
        .setStyle(ButtonStyle.Danger),
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
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categorySelect),
      actionButtons,
      backButton,
    ],
  };
}

function buildRoleCategoryEditor(settings: GuildSettings, guild: any, category: RoleCategory, mapping: any): { embeds: EmbedBuilder[], components: ActionRowBuilder<any>[] } {
  const categoryNames: Record<string, string> = {
    mood: '😊 Mood Roles',
    energy: '⚡ Energy Roles',
    activity: '📊 Activity Roles',
    time: '🌙 Time Roles',
    chaos: '🎲 Chaos Roles',
  };
  
  const categoryDescriptions: Record<string, string> = {
    mood: 'Roles assigned based on user mood (40-100%)',
    energy: 'Roles assigned based on user energy level',
    activity: 'Roles assigned based on user activity',
    time: 'Roles assigned based on time of day',
    chaos: 'Random temporary roles for fun',
  };
  
  let roles: string[] = [];
  let roleLabels: string[] = [];
  
  switch (category) {
    case 'mood':
      roles = [mapping.mood.high2, mapping.mood.high1, mapping.mood.mid, mapping.mood.low1, mapping.mood.low2];
      roleLabels = ['Very Happy (80%+)', 'Happy (60-80%)', 'Neutral (40-60%)', 'Sad (20-40%)', 'Very Sad (<20%)'];
      break;
    case 'energy':
      roles = [mapping.energy.high2, mapping.energy.high1, mapping.energy.mid, mapping.energy.low1, mapping.energy.low2];
      roleLabels = ['Energized (80%+)', 'Active (60-80%)', 'Normal (40-60%)', 'Tired (15-40%)', 'Exhausted (<15%)'];
      break;
    case 'activity':
      roles = [mapping.activity.high, mapping.activity.mid1, mapping.activity.mid2, mapping.activity.mid3, mapping.activity.low].filter(Boolean);
      roleLabels = ['Very Active (80%+)', 'Active (60-80%)', 'Moderate (40-60%)', 'Low (20-40%)', 'Inactive (<20%)'].slice(0, roles.length);
      break;
    case 'time':
      roles = [mapping.time.night, mapping.time.day, mapping.time.evening];
      roleLabels = ['Night (0-6h)', 'Day (6-18h)', 'Evening (18-24h)'];
      break;
    case 'chaos':
      roles = mapping.chaos;
      roleLabels = roles.map((_, i) => `Chaos #${i + 1}`);
      break;
  }
  
  const roleStatus = roles.map(r => {
    const exists = guild?.roles.cache.find((gr: any) => gr.name === r);
    return exists ? '✅' : '❌';
  });
  
  const embed = new EmbedBuilder()
    .setTitle(categoryNames[category])
    .setDescription(categoryDescriptions[category])
    .setColor(0x5865F2)
    .addFields(
      roles.map((r, i) => ({
        name: `${roleStatus[i]} ${roleLabels[i]}`,
        value: `\`${r}\``,
        inline: true,
      }))
    );

  const actionButtons = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`setup_roles_create_${category}`)
        .setLabel(`📥 Create ${categoryNames[category].split(' ')[1]} Roles`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`setup_roles_delete_${category}`)
        .setLabel(`🗑️ Delete ${categoryNames[category].split(' ')[1]} Roles`)
        .setStyle(ButtonStyle.Danger),
    );

  const backButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_roles_back')
        .setLabel('◀️ Back to Roles')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_cat_main')
        .setLabel('🏠 Main Menu')
        .setStyle(ButtonStyle.Secondary),
    );

  return {
    embeds: [embed],
    components: [actionButtons, backButton],
  };
}

async function startCollector(message: Message, userId: string, guildId: string): Promise<void> {
  const collector = message.createMessageComponentCollector({
    time: 300000, // 5 minutes
  });

  let currentCategory: SetupCategory = 'main';
  let currentRoleSubCategory: RoleSubCategory = 'overview';

  collector.on('collect', async (i) => {
    if (i.user.id !== userId) {
      await i.reply({ content: 'This menu is not for you.', flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      const settings = getGuildSettings(guildId);

      // Handle category navigation
      if (i.isButton() && i.customId.startsWith('setup_cat_')) {
        currentCategory = i.customId.replace('setup_cat_', '') as SetupCategory;
        currentRoleSubCategory = 'overview';
        const view = buildCategoryView(currentCategory, settings, i.guild, currentRoleSubCategory);
        await i.update({ embeds: view.embeds, components: view.components });
        return;
      }

      // Handle roles back button
      if (i.isButton() && i.customId === 'setup_roles_back') {
        currentRoleSubCategory = 'overview';
        const view = buildCategoryView('roles', settings, i.guild, currentRoleSubCategory);
        await i.update({ embeds: view.embeds, components: view.components });
        return;
      }

      // Handle select menus
      if (i.isStringSelectMenu()) {
        switch (i.customId) {
          case 'setup_language':
            updateGuildSettings(guildId, { language: i.values[0] });
            break;
          case 'setup_preset':
            updateGuildSettings(guildId, { rolePreset: i.values[0] });
            break;
          case 'setup_maxroles':
            updateGuildSettings(guildId, { maxRolesPerUser: parseInt(i.values[0]) });
            break;
          case 'setup_leaderboard_interval':
            updateGuildSettings(guildId, { leaderboardIntervalMinutes: parseInt(i.values[0]) });
            break;
          case 'setup_stat_gain':
            updateGuildSettings(guildId, { statGainMultiplier: parseFloat(i.values[0]) });
            break;
          case 'setup_stat_drain':
            updateGuildSettings(guildId, { statDrainMultiplier: parseFloat(i.values[0]) });
            break;
          case 'setup_roles_category':
            currentRoleSubCategory = i.values[0] as RoleSubCategory;
            const roleView = buildCategoryView('roles', settings, i.guild, currentRoleSubCategory);
            await i.update({ embeds: roleView.embeds, components: roleView.components });
            return;
        }
        const newSettings = getGuildSettings(guildId);
        const view = buildCategoryView(currentCategory, newSettings, i.guild, currentRoleSubCategory);
        await i.update({ embeds: view.embeds, components: view.components });
        return;
      }

      // Handle channel select
      if (i.isChannelSelectMenu()) {
        if (i.customId === 'setup_leaderboard_channel') {
          updateGuildSettings(guildId, { leaderboardChannelId: i.values[0] });
        } else if (i.customId === 'setup_welcome_channel') {
          updateGuildSettings(guildId, { welcomeChannelId: i.values[0] });
        }
        const newSettings = getGuildSettings(guildId);
        const view = buildCategoryView(currentCategory, newSettings, i.guild, currentRoleSubCategory);
        await i.update({ embeds: view.embeds, components: view.components });
        return;
      }

      // Handle toggle buttons
      if (i.isButton()) {
        switch (i.customId) {
          case 'setup_toggle_colors':
            updateGuildSettings(guildId, { enableRoleColors: !settings.enableRoleColors });
            break;
          case 'setup_toggle_chaos':
            updateGuildSettings(guildId, { enableChaosRoles: !settings.enableChaosRoles });
            break;
          case 'setup_toggle_achievements':
            updateGuildSettings(guildId, { enableAchievements: !settings.enableAchievements });
            break;
          case 'setup_toggle_autoleaderboard':
            updateGuildSettings(guildId, { enableAutoLeaderboard: !settings.enableAutoLeaderboard });
            break;
          case 'setup_toggle_welcome':
            updateGuildSettings(guildId, { enableWelcome: !settings.enableWelcome });
            break;
          case 'setup_toggle_economy':
            updateGuildSettings(guildId, { enableEconomy: !settings.enableEconomy });
            break;
          case 'setup_toggle_giveaways':
            updateGuildSettings(guildId, { enableGiveaways: !settings.enableGiveaways });
            break;
          case 'setup_complete':
            completeSetup(guildId);
            break;
          
          // Role management buttons
          case 'setup_roles_create_all': {
            await i.deferUpdate();
            const created = await importRolesToGuild(i.guild!);
            const resultEmbed = new EmbedBuilder()
              .setTitle('📥 Role Import Complete')
              .setDescription(created.length > 0 
                ? `Created ${created.length} roles:\n${created.map(r => `• ${r}`).join('\n')}`
                : 'All roles already exist.')
              .setColor(0x00FF00);
            await i.followUp({ embeds: [resultEmbed], flags: MessageFlags.Ephemeral });
            const newSettings = getGuildSettings(guildId);
            const view = buildCategoryView('roles', newSettings, i.guild, currentRoleSubCategory);
            await i.editReply({ embeds: view.embeds, components: view.components });
            return;
          }
          
          case 'setup_roles_delete_unused': {
            await i.deferUpdate();
            const preset = settings.rolePreset;
            const botRoles = getAllBotRoles(preset);
            const deleted: string[] = [];
            for (const roleName of botRoles) {
              const role = i.guild!.roles.cache.find(r => r.name === roleName);
              if (role) {
                try {
                  await role.delete('OnceButler role cleanup');
                  deleted.push(roleName);
                } catch (err) {
                  console.error(`Failed to delete role ${roleName}:`, err);
                }
              }
            }
            const resultEmbed = new EmbedBuilder()
              .setTitle('🗑️ Role Cleanup Complete')
              .setDescription(deleted.length > 0 
                ? `Deleted ${deleted.length} roles:\n${deleted.map(r => `• ${r}`).join('\n')}`
                : 'No bot roles found to delete.')
              .setColor(0xFF6600);
            await i.followUp({ embeds: [resultEmbed], flags: MessageFlags.Ephemeral });
            const newSettings = getGuildSettings(guildId);
            const view = buildCategoryView('roles', newSettings, i.guild, currentRoleSubCategory);
            await i.editReply({ embeds: view.embeds, components: view.components });
            return;
          }
        }
        
        // Handle category-specific role creation/deletion
        if (i.customId.startsWith('setup_roles_create_') && i.customId !== 'setup_roles_create_all') {
          const category = i.customId.replace('setup_roles_create_', '') as RoleCategory;
          await i.deferUpdate();
          const created = await createRolesByCategory(i.guild!, settings, category);
          const resultEmbed = new EmbedBuilder()
            .setTitle(`📥 ${category.charAt(0).toUpperCase() + category.slice(1)} Roles Created`)
            .setDescription(created.length > 0 
              ? `Created ${created.length} roles:\n${created.map(r => `• ${r}`).join('\n')}`
              : 'All roles in this category already exist.')
            .setColor(0x00FF00);
          await i.followUp({ embeds: [resultEmbed], flags: MessageFlags.Ephemeral });
          const newSettings = getGuildSettings(guildId);
          const view = buildCategoryView('roles', newSettings, i.guild, currentRoleSubCategory);
          await i.editReply({ embeds: view.embeds, components: view.components });
          return;
        }
        
        if (i.customId.startsWith('setup_roles_delete_') && i.customId !== 'setup_roles_delete_unused') {
          const category = i.customId.replace('setup_roles_delete_', '') as RoleCategory;
          await i.deferUpdate();
          const deleted = await deleteRolesByCategory(i.guild!, settings, category);
          const resultEmbed = new EmbedBuilder()
            .setTitle(`🗑️ ${category.charAt(0).toUpperCase() + category.slice(1)} Roles Deleted`)
            .setDescription(deleted.length > 0 
              ? `Deleted ${deleted.length} roles:\n${deleted.map(r => `• ${r}`).join('\n')}`
              : 'No roles found to delete in this category.')
            .setColor(0xFF6600);
          await i.followUp({ embeds: [resultEmbed], flags: MessageFlags.Ephemeral });
          const newSettings = getGuildSettings(guildId);
          const view = buildCategoryView('roles', newSettings, i.guild, currentRoleSubCategory);
          await i.editReply({ embeds: view.embeds, components: view.components });
          return;
        }

        // Handle Custom Role Rules buttons
        if (i.customId === 'setup_customroles_add') {
          // Start wizard at step 0
          currentCategory = 'customRoles';
          const wizardView = buildCustomRoleAddWizard(0, guildId, {});
          await i.update({ embeds: wizardView.embeds, components: wizardView.components });
          return;
        }
        
        if (i.customId === 'setup_customroles_manage') {
          const manageView = buildCustomRoleManage(guildId);
          await i.update({ embeds: manageView.embeds, components: manageView.components });
          return;
        }

        if (i.customId.startsWith('setup_customroles_toggle_')) {
          const ruleId = parseInt(i.customId.replace('setup_customroles_toggle_', ''));
          toggleCustomRoleRule(ruleId);
          const rule = getCustomRoleRuleById(ruleId);
          if (rule) {
            const editView = buildCustomRuleEdit(rule);
            await i.update({ embeds: editView.embeds, components: editView.components });
          }
          return;
        }

        if (i.customId.startsWith('setup_customroles_delete_')) {
          const ruleId = parseInt(i.customId.replace('setup_customroles_delete_', ''));
          deleteCustomRoleRule(ruleId);
          const newSettings = getGuildSettings(guildId);
          const view = buildCategoryView('customRoles', newSettings, i.guild, currentRoleSubCategory);
          await i.update({ embeds: view.embeds, components: view.components });
          return;
        }

        if (i.customId === 'setup_customroles_wizard_cancel') {
          const newSettings = getGuildSettings(guildId);
          const view = buildCategoryView('customRoles', newSettings, i.guild, currentRoleSubCategory);
          await i.update({ embeds: view.embeds, components: view.components });
          return;
        }

        const newSettings = getGuildSettings(guildId);
        const view = buildCategoryView(currentCategory, newSettings, i.guild, currentRoleSubCategory);
        await i.update({ embeds: view.embeds, components: view.components });
      }
    } catch (error: any) {
      // Ignore interaction timeout errors (user took too long)
      if (error.code === 10062) {
        console.warn(`[SETUP] Interaction expired for ${i.user.tag}`);
        return;
      }
      console.error('[SETUP] Error handling interaction:', error);
    }
  });

  collector.on('end', () => {
    // Optionally disable components after timeout
  });
}
