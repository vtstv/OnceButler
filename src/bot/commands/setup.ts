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
  ComponentType,
  MessageFlags,
  ButtonInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import { 
  getGuildSettings, 
  updateGuildSettings, 
  completeSetup,
  isSetupComplete,
} from '../../database/repositories/settingsRepo.js';
import { importRolesToGuild } from '../../roles/roleImporter.js';
import { t } from '../../utils/i18n.js';
import { getLocale, hasAdminPermission } from './utils.js';

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
  
  await showSetupMenu(interaction, settings);
}

async function showSetupMenu(
  interaction: ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction, 
  settings: ReturnType<typeof getGuildSettings>
): Promise<void> {
  const locale = interaction.guild ? (await import('../../database/repositories/settingsRepo.js')).getGuildLanguage(interaction.guild.id) : 'en';
  const isComplete = settings.setupComplete;

  const embed = new EmbedBuilder()
    .setTitle('⚙️ OnceButler Setup')
    .setDescription(isComplete 
      ? '✅ Setup is complete. You can modify settings below.'
      : '🔧 Configure the bot before it starts managing roles.')
    .setColor(isComplete ? 0x00FF00 : 0xFFAA00)
    .addFields(
      { 
        name: '🌐 Language', 
        value: `\`${settings.language.toUpperCase()}\``, 
        inline: true 
      },
      { 
        name: '🎭 Role Preset', 
        value: `\`${settings.rolePreset.toUpperCase()}\``, 
        inline: true 
      },
      { 
        name: '👥 Max Roles', 
        value: `\`${settings.maxRolesPerUser}\``, 
        inline: true 
      },
      { 
        name: '🎨 Role Colors', 
        value: settings.enableRoleColors ? '✅ Enabled' : '❌ Disabled', 
        inline: true 
      },
      { 
        name: '🎲 Chaos Roles', 
        value: settings.enableChaosRoles ? '✅ Enabled' : '❌ Disabled', 
        inline: true 
      },
      { 
        name: '🏆 Achievements', 
        value: settings.enableAchievements ? '✅ Enabled' : '❌ Disabled', 
        inline: true 
      },
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

  const actionButtons = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_create_roles')
        .setLabel('📥 Create Roles')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_complete')
        .setLabel(isComplete ? '✅ Setup Complete' : '🚀 Complete Setup')
        .setStyle(isComplete ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(isComplete),
    );

  const components = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(languageSelect),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(presetSelect),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(maxRolesSelect),
    toggleButtons,
    actionButtons,
  ];

  let message;
  if (interaction.isCommand()) {
    message = await interaction.reply({ 
      embeds: [embed], 
      components, 
      flags: MessageFlags.Ephemeral,
      fetchReply: true 
    });
  } else {
    await interaction.update({ embeds: [embed], components });
    message = interaction.message;
  }

  // Collector for interactions
  const collector = message.createMessageComponentCollector({
    time: 300000, // 5 minutes
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== interaction.user.id) {
      await i.reply({ content: 'This menu is not for you.', flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      const guildId = interaction.guild!.id;
      const currentSettings = getGuildSettings(guildId);

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
        }
        await showSetupMenu(i, getGuildSettings(guildId));
      } else if (i.isButton()) {
        switch (i.customId) {
          case 'setup_toggle_colors':
            updateGuildSettings(guildId, { enableRoleColors: !currentSettings.enableRoleColors });
            await showSetupMenu(i, getGuildSettings(guildId));
            break;
          case 'setup_toggle_chaos':
            updateGuildSettings(guildId, { enableChaosRoles: !currentSettings.enableChaosRoles });
            await showSetupMenu(i, getGuildSettings(guildId));
            break;
          case 'setup_toggle_achievements':
            updateGuildSettings(guildId, { enableAchievements: !currentSettings.enableAchievements });
            await showSetupMenu(i, getGuildSettings(guildId));
            break;
          case 'setup_create_roles':
            await i.deferUpdate();
            const created = await importRolesToGuild(interaction.guild!);
            const updatedSettings = getGuildSettings(guildId);
            
            const resultEmbed = new EmbedBuilder()
              .setTitle('📥 Role Import Complete')
              .setDescription(created.length > 0 
                ? `Created ${created.length} roles:\n${created.map(r => `• ${r}`).join('\n')}`
                : 'All roles already exist.')
              .setColor(0x00FF00);
            
            await i.followUp({ embeds: [resultEmbed], flags: MessageFlags.Ephemeral });
            break;
          case 'setup_complete':
            completeSetup(guildId);
            await showSetupMenu(i, getGuildSettings(guildId));
            break;
        }
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
