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
} from 'discord.js';
import { 
  getGuildSettings, 
  updateGuildSettings, 
  completeSetup,
  type GuildSettings,
} from '../../database/repositories/settingsRepo.js';
import { importRolesToGuild } from '../../roles/roleImporter.js';
import { t } from '../../utils/i18n.js';
import { getLocale, hasAdminPermission } from './utils.js';

type SetupCategory = 'main' | 'general' | 'features' | 'leaderboard';

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

function buildCategoryView(category: SetupCategory, settings: GuildSettings, guild: any): { embeds: EmbedBuilder[], components: ActionRowBuilder<any>[] } {
  switch (category) {
    case 'main':
      return buildMainMenu(settings, guild);
    case 'general':
      return buildGeneralSettings(settings);
    case 'features':
      return buildFeatureSettings(settings);
    case 'leaderboard':
      return buildLeaderboardSettings(settings, guild);
    default:
      return buildMainMenu(settings, guild);
  }
}

function buildMainMenu(settings: GuildSettings, guild: any): { embeds: EmbedBuilder[], components: ActionRowBuilder<any>[] } {
  const isComplete = settings.setupComplete;
  const leaderboardChannelName = settings.leaderboardChannelId 
    ? guild?.channels.cache.get(settings.leaderboardChannelId)?.name ?? 'Unknown'
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
    );

  const categoryButtons = new ActionRowBuilder<ButtonBuilder>()
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
    );

  const actionButtons = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_create_roles')
        .setLabel('📥 Create Roles')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_complete')
        .setLabel(isComplete ? '✅ Setup Complete' : '🚀 Complete Setup')
        .setStyle(isComplete ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(isComplete),
    );

  return {
    embeds: [embed],
    components: [categoryButtons, actionButtons],
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

async function startCollector(message: Message, userId: string, guildId: string): Promise<void> {
  const collector = message.createMessageComponentCollector({
    time: 300000, // 5 minutes
  });

  let currentCategory: SetupCategory = 'main';

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
        const view = buildCategoryView(currentCategory, settings, i.guild);
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
        }
        const newSettings = getGuildSettings(guildId);
        const view = buildCategoryView(currentCategory, newSettings, i.guild);
        await i.update({ embeds: view.embeds, components: view.components });
        return;
      }

      // Handle channel select
      if (i.isChannelSelectMenu()) {
        if (i.customId === 'setup_leaderboard_channel') {
          updateGuildSettings(guildId, { leaderboardChannelId: i.values[0] });
          const newSettings = getGuildSettings(guildId);
          const view = buildCategoryView(currentCategory, newSettings, i.guild);
          await i.update({ embeds: view.embeds, components: view.components });
        }
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
          case 'setup_create_roles':
            await i.deferUpdate();
            const created = await importRolesToGuild(i.guild!);
            
            const resultEmbed = new EmbedBuilder()
              .setTitle('📥 Role Import Complete')
              .setDescription(created.length > 0 
                ? `Created ${created.length} roles:\n${created.map(r => `• ${r}`).join('\n')}`
                : 'All roles already exist.')
              .setColor(0x00FF00);
            
            await i.followUp({ embeds: [resultEmbed], flags: MessageFlags.Ephemeral });
            return;
          case 'setup_complete':
            completeSetup(guildId);
            break;
        }

        const newSettings = getGuildSettings(guildId);
        const view = buildCategoryView(currentCategory, newSettings, i.guild);
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
