// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Button Handlers
// Licensed under MIT License

import {
  MessageFlags,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  TextChannel,
} from 'discord.js';
import type { ButtonInteraction } from 'discord.js';
import { getGuildSettings, updateGuildSettings, completeSetup } from '../../../../database/repositories/settingsRepo.js';
import { 
  createCustomRoleRule, 
  getCustomRoleRuleById, 
  toggleCustomRoleRule, 
  deleteCustomRoleRule,
  type CustomRoleRule,
} from '../../../../database/repositories/customRolesRepo.js';
import { importRolesToGuild } from '../../../../roles/roleImporter.js';
import { getAllBotRoles } from '../../../../roles/roleRules.js';
import type { RoleCategory } from '../../../../roles/types.js';
import type { SetupCategory, RoleSubCategory } from '../types.js';
import { buildCategoryView } from './viewBuilder.js';
import { buildCustomRoleAddWizard, buildCustomRoleManage, buildCustomRuleEdit } from '../customRolesBuilder.js';
import { formatWelcomeMessage, DEFAULT_WELCOME_MESSAGES, DEFAULT_LEAVE_MESSAGES } from '../welcomeBuilder.js';
import { createRolesByCategory, deleteRolesByCategory } from '../roleBuilders.js';
import { buildLevelingAddRole, buildLevelingManageRoles, buildReactionRolesManage } from '../newModulesBuilders.js';
import type { ButtonResult, LevelingRoleData } from './types.js';

export async function handleButton(
  i: ButtonInteraction,
  guildId: string,
  settings: any,
  currentCategory: SetupCategory,
  currentRoleSubCategory: RoleSubCategory,
  wizardStep: number,
  wizardData: Partial<CustomRoleRule>,
  levelingRoleToAdd: LevelingRoleData
): Promise<ButtonResult> {
  const result = await handleToggleButtons(i, guildId, settings);
  if (result) return result;

  const modalResult = await handleModalButtons(i, settings);
  if (modalResult) return modalResult;

  const moduleResult = await handleModuleButtons(i, guildId, settings, currentRoleSubCategory);
  if (moduleResult) return moduleResult;

  const wizardResult = await handleWizardButtons(i, guildId, settings, currentRoleSubCategory, wizardData);
  if (wizardResult) return wizardResult;

  const roleResult = await handleRoleManagementButtons(i, guildId, settings, currentRoleSubCategory);
  if (roleResult) return roleResult;

  const dynamicResult = await handleDynamicButtons(i, guildId, settings, currentRoleSubCategory);
  if (dynamicResult) return dynamicResult;

  return { shouldReturn: false };
}

async function handleToggleButtons(
  i: ButtonInteraction,
  guildId: string,
  settings: any
): Promise<ButtonResult | null> {
  const toggleMappings: Record<string, string> = {
    'setup_toggle_colors': 'enableRoleColors',
    'setup_toggle_chaos': 'enableChaosRoles',
    'setup_toggle_achievements': 'enableAchievements',
    'setup_toggle_autoleaderboard': 'enableAutoLeaderboard',
    'setup_toggle_welcome': 'enableWelcome',
    'setup_toggle_economy': 'enableEconomy',
    'setup_toggle_giveaways': 'enableGiveaways',
    'setup_toggle_giveaway_dm': 'giveawayDmWinners',
    'setup_toggle_reactionroles': 'enableReactionRoles',
    'setup_toggle_leveling': 'enableLeveling',
    'setup_toggle_leveling_stack': 'levelingStackRoles',
    'setup_toggle_leveling_announce': 'levelingAnnounceLevelUp',
    'setup_toggle_imagegen': 'enableImageGen',
    'setup_toggle_tempvoice': 'enableTempVoice',
    'setup_toggle_steamnews': 'enableSteamNews',
  };

  const settingKey = toggleMappings[i.customId];
  if (settingKey) {
    updateGuildSettings(guildId, { [settingKey]: !settings[settingKey] });
    return { shouldReturn: false };
  }

  return null;
}

async function handleModalButtons(
  i: ButtonInteraction,
  settings: any
): Promise<ButtonResult | null> {
  switch (i.customId) {
    case 'setup_tempvoice_name_modal': {
      const modal = new ModalBuilder()
        .setCustomId('setup_tempvoice_name_modal')
        .setTitle('📝 Channel Name Template');
      
      const nameInput = new TextInputBuilder()
        .setCustomId('name_template')
        .setLabel('Name Template')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('🔊 {user}')
        .setValue(settings.tempVoiceNameTemplate)
        .setRequired(true)
        .setMaxLength(50);
      
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput));
      await i.showModal(modal);
      return { shouldReturn: true };
    }

    case 'setup_imagegen_api': {
      const modal = new ModalBuilder()
        .setCustomId('setup_imagegen_api_modal')
        .setTitle('🔑 Cloudflare API Key');
      
      const apiKeyInput = new TextInputBuilder()
        .setCustomId('api_key')
        .setLabel('API Key')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter your Cloudflare API Token')
        .setRequired(true)
        .setMaxLength(100);
      
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(apiKeyInput));
      await i.showModal(modal);
      return { shouldReturn: true };
    }

    case 'setup_imagegen_account': {
      const modal = new ModalBuilder()
        .setCustomId('setup_imagegen_account_modal')
        .setTitle('🆔 Cloudflare Account ID');
      
      const accountInput = new TextInputBuilder()
        .setCustomId('account_id')
        .setLabel('Account ID')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter your Cloudflare Account ID')
        .setRequired(true)
        .setMaxLength(50);
      
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(accountInput));
      await i.showModal(modal);
      return { shouldReturn: true };
    }

    case 'setup_steamnews_apikey_modal': {
      const modal = new ModalBuilder()
        .setCustomId('setup_steamnews_gemini_modal')
        .setTitle('🔑 Gemini API Key');
      
      const apiKeyInput = new TextInputBuilder()
        .setCustomId('gemini_key')
        .setLabel('Gemini API Key')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter your Google Gemini API key')
        .setRequired(true)
        .setMaxLength(100);
      
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(apiKeyInput));
      await i.showModal(modal);
      return { shouldReturn: true };
    }
  }

  return null;
}

async function handleModuleButtons(
  i: ButtonInteraction,
  guildId: string,
  settings: any,
  currentRoleSubCategory: RoleSubCategory
): Promise<ButtonResult | null> {
  switch (i.customId) {
    case 'setup_leveling_add_role': {
      const addView = buildLevelingAddRole(settings);
      await i.update({ embeds: addView.embeds, components: addView.components });
      return { shouldReturn: true, levelingRoleToAdd: {} };
    }

    case 'setup_leveling_manage_roles': {
      const manageView = buildLevelingManageRoles(settings, i.guild!);
      await i.update({ embeds: manageView.embeds, components: manageView.components });
      return { shouldReturn: true };
    }

    case 'setup_reactionroles_manage': {
      const manageView = buildReactionRolesManage(guildId, i.guild!);
      await i.update({ embeds: manageView.embeds, components: manageView.components });
      return { shouldReturn: true };
    }

    case 'setup_complete':
      completeSetup(guildId);
      return { shouldReturn: false };

    case 'setup_back': {
      const view = buildCategoryView('main', settings, i.guild!, currentRoleSubCategory);
      await i.update({ embeds: view.embeds, components: view.components });
      return { shouldReturn: true, category: 'main' };
    }

    case 'setup_welcome_test':
      return handleWelcomeTest(i, settings);

    case 'setup_steamnews_test':
      return handleSteamNewsTest(i, guildId, settings);

    case 'setup_steamnews_force':
      return handleSteamNewsForce(i, guildId, settings);
  }

  return null;
}

async function handleWelcomeTest(
  i: ButtonInteraction,
  settings: any
): Promise<ButtonResult> {
  if (!settings.welcomeChannelId) {
    await i.reply({ content: '❌ Please select a welcome channel first!', flags: MessageFlags.Ephemeral });
    return { shouldReturn: true };
  }
  
  const welcomeChannel = i.guild!.channels.cache.get(settings.welcomeChannelId) as TextChannel;
  if (!welcomeChannel) {
    await i.reply({ content: '❌ Welcome channel not found!', flags: MessageFlags.Ephemeral });
    return { shouldReturn: true };
  }
  
  const memberCount = i.guild!.memberCount;
  const welcomeMsg = formatWelcomeMessage(settings.welcomeMessage || DEFAULT_WELCOME_MESSAGES.en, i.member as any, i.guild!.name, memberCount);
  const leaveMsg = formatWelcomeMessage(settings.leaveMessage || DEFAULT_LEAVE_MESSAGES.en, i.member as any, i.guild!.name, memberCount);
  
  const testEmbed = new EmbedBuilder()
    .setTitle('🧪 Test Messages Preview')
    .setColor(0x5865F2)
    .addFields(
      { name: '👋 Welcome Message', value: welcomeMsg, inline: false },
      { name: '🚪 Leave Message', value: leaveMsg, inline: false },
    )
    .setFooter({ text: 'This is a preview - no message was sent' });
  
  await i.reply({ embeds: [testEmbed], flags: MessageFlags.Ephemeral });
  return { shouldReturn: true };
}

async function handleWizardButtons(
  i: ButtonInteraction,
  guildId: string,
  settings: any,
  currentRoleSubCategory: RoleSubCategory,
  wizardData: Partial<CustomRoleRule>
): Promise<ButtonResult | null> {
  switch (i.customId) {
    case 'setup_customroles_wizard_confirm': {
      if (!wizardData.roleId || !wizardData.roleName || !wizardData.statType || !wizardData.operator || wizardData.value === undefined) {
        await i.reply({ content: '❌ Missing required fields. Please start over.', flags: MessageFlags.Ephemeral });
        return { shouldReturn: true };
      }
      
      try {
        const roleName = wizardData.roleName;
        createCustomRoleRule(
          guildId,
          wizardData.roleId,
          wizardData.roleName,
          wizardData.statType,
          wizardData.operator,
          wizardData.value,
          wizardData.isTemporary ?? false,
          wizardData.durationMinutes ?? null,
          i.user.id
        );
        const newSettings = getGuildSettings(guildId);
        const view = buildCategoryView('customRoles', newSettings, i.guild!, currentRoleSubCategory);
        await i.update({ embeds: view.embeds, components: view.components });
        await i.followUp({ content: `✅ Custom role rule created for **${roleName}**!`, flags: MessageFlags.Ephemeral });
      } catch (err) {
        console.error('[CustomRoles] Error creating rule:', err);
        if (!i.replied && !i.deferred) {
          await i.reply({ content: '❌ Failed to create rule.', flags: MessageFlags.Ephemeral });
        }
      }
      return { shouldReturn: true, wizardStep: 0, wizardData: {} };
    }

    case 'setup_customroles_add': {
      const wizardView = buildCustomRoleAddWizard(0, guildId, {});
      await i.update({ embeds: wizardView.embeds, components: wizardView.components });
      return { shouldReturn: true, category: 'customRoles' };
    }

    case 'setup_customroles_manage': {
      const manageView = buildCustomRoleManage(guildId);
      await i.update({ embeds: manageView.embeds, components: manageView.components });
      return { shouldReturn: true };
    }

    case 'setup_customroles_wizard_cancel': {
      const newSettings = getGuildSettings(guildId);
      const view = buildCategoryView('customRoles', newSettings, i.guild!, currentRoleSubCategory);
      await i.update({ embeds: view.embeds, components: view.components });
      return { shouldReturn: true };
    }
  }

  return null;
}

async function handleRoleManagementButtons(
  i: ButtonInteraction,
  guildId: string,
  settings: any,
  currentRoleSubCategory: RoleSubCategory
): Promise<ButtonResult | null> {
  switch (i.customId) {
    case 'setup_roles_create_all': {
      await i.deferUpdate();
      const created = await importRolesToGuild(i.guild!);
      const resultEmbed = new EmbedBuilder()
        .setTitle('📥 Role Import Complete')
        .setDescription(created.length > 0 
          ? `Created ${created.length} roles:\n${created.map((r: string) => `• ${r}`).join('\n')}`
          : 'All roles already exist.')
        .setColor(0x00FF00);
      await i.followUp({ embeds: [resultEmbed], flags: MessageFlags.Ephemeral });
      const newSettings = getGuildSettings(guildId);
      const view = buildCategoryView('roles', newSettings, i.guild!, currentRoleSubCategory);
      await i.editReply({ embeds: view.embeds, components: view.components });
      return { shouldReturn: true };
    }

    case 'setup_roles_delete_unused': {
      await i.deferUpdate();
      const preset = settings.rolePreset;
      const botRoles = getAllBotRoles(preset);
      const deleted: string[] = [];
      
      for (const roleName of botRoles) {
        const role = i.guild!.roles.cache.find((r: any) => r.name === roleName);
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
      const view = buildCategoryView('roles', newSettings, i.guild!, currentRoleSubCategory);
      await i.editReply({ embeds: view.embeds, components: view.components });
      return { shouldReturn: true };
    }
  }

  return null;
}

async function handleDynamicButtons(
  i: ButtonInteraction,
  guildId: string,
  settings: any,
  currentRoleSubCategory: RoleSubCategory
): Promise<ButtonResult | null> {
  if (i.customId.startsWith('setup_customroles_toggle_')) {
    const ruleId = parseInt(i.customId.replace('setup_customroles_toggle_', ''));
    toggleCustomRoleRule(ruleId);
    const rule = getCustomRoleRuleById(ruleId);
    if (rule) {
      const editView = buildCustomRuleEdit(rule);
      await i.update({ embeds: editView.embeds, components: editView.components });
    }
    return { shouldReturn: true };
  }

  if (i.customId.startsWith('setup_customroles_delete_')) {
    const ruleId = parseInt(i.customId.replace('setup_customroles_delete_', ''));
    deleteCustomRoleRule(ruleId);
    const newSettings = getGuildSettings(guildId);
    const view = buildCategoryView('customRoles', newSettings, i.guild!, currentRoleSubCategory);
    await i.update({ embeds: view.embeds, components: view.components });
    return { shouldReturn: true };
  }

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
    const view = buildCategoryView('roles', newSettings, i.guild!, currentRoleSubCategory);
    await i.editReply({ embeds: view.embeds, components: view.components });
    return { shouldReturn: true };
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
    const view = buildCategoryView('roles', newSettings, i.guild!, currentRoleSubCategory);
    await i.editReply({ embeds: view.embeds, components: view.components });
    return { shouldReturn: true };
  }

  return null;
}

async function handleSteamNewsTest(
  i: ButtonInteraction,
  guildId: string,
  settings: any
): Promise<ButtonResult> {
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  
  try {
    const { fetchSteamNews, cleanSteamContent, filterRaidZoneContent, isUpdateNews } = await import('../../../../steamnews/steamNewsApi.js');
    const { translateAndSummarize } = await import('../../../../steamnews/geminiService.js');
    const { ONCE_HUMAN_CONFIG } = await import('../../../../steamnews/types.js');
    
    const newsItems = await fetchSteamNews(ONCE_HUMAN_CONFIG);
    if (newsItems.length === 0) {
      await i.editReply({ content: '❌ Failed to fetch Steam news. Check your connection.' });
      return { shouldReturn: true };
    }
    
    const updateNews = newsItems.filter(item => isUpdateNews(item, ONCE_HUMAN_CONFIG));
    if (updateNews.length === 0) {
      await i.editReply({ content: '⚠️ No update news found. Try again later.' });
      return { shouldReturn: true };
    }
    
    const latest = updateNews[0];
    const cleaned = filterRaidZoneContent(cleanSteamContent(latest.contents));
    
    if (!settings.steamNewsGeminiKey) {
      await i.editReply({ content: '❌ Gemini API key not set.' });
      return { shouldReturn: true };
    }
    
    const translated = await translateAndSummarize(cleaned, settings.steamNewsGeminiKey);
    if (!translated) {
      await i.editReply({ content: '❌ Failed to translate with Gemini. Check your API key.' });
      return { shouldReturn: true };
    }
    
    // Format as regular message (same as actual posts)
    const header = `# 📰 ${latest.title}\n🔗 <${latest.url}>\n\n`;
    const footer = `\n\n─────────────────────────────\n*Test successful! | Once Human*`;
    
    // Split into chunks if needed (Discord message limit is 2000)
    const maxLength = 1900;
    const messages: string[] = [];
    let remaining = translated;
    let isFirst = true;
    
    while (remaining.length > 0) {
      let chunk: string;
      const availableLength = isFirst ? maxLength - header.length : maxLength;
      
      if (remaining.length <= availableLength) {
        chunk = remaining;
        remaining = '';
      } else {
        let breakPoint = remaining.lastIndexOf('\n', availableLength);
        if (breakPoint < availableLength * 0.5) {
          breakPoint = remaining.lastIndexOf(' ', availableLength);
        }
        if (breakPoint < availableLength * 0.3) {
          breakPoint = availableLength;
        }
        chunk = remaining.slice(0, breakPoint);
        remaining = remaining.slice(breakPoint).trim();
      }
      
      if (isFirst) {
        messages.push(header + chunk + (remaining.length === 0 ? footer : ''));
        isFirst = false;
      } else {
        messages.push(chunk + (remaining.length === 0 ? footer : ''));
      }
    }
    
    // Send first message as reply, rest as follow-ups
    await i.editReply({ content: messages[0] });
    
    // Send additional messages if content was split
    for (let idx = 1; idx < messages.length; idx++) {
      await i.followUp({ content: messages[idx], flags: MessageFlags.Ephemeral });
    }
  } catch (error) {
    console.error('[STEAM NEWS TEST]', error);
    await i.editReply({ content: `❌ Error: ${(error as Error).message}` });
  }
  
  return { shouldReturn: true };
}

async function handleSteamNewsForce(
  i: ButtonInteraction,
  guildId: string,
  settings: any
): Promise<ButtonResult> {
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  
  try {
    const { processSteamNews } = await import('../../../../steamnews/index.js');
    
    await processSteamNews(i.client);
    
    await i.editReply({ 
      content: '✅ Steam News check completed! If there are new updates, they have been posted to the configured channel.' 
    });
  } catch (error) {
    console.error('[STEAM NEWS FORCE]', error);
    await i.editReply({ content: `❌ Error: ${(error as Error).message}` });
  }
  
  return { shouldReturn: true };
}
