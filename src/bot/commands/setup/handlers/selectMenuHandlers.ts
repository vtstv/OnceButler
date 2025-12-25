// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Select Menu Handlers
// Licensed under MIT License

import {
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import type { StringSelectMenuInteraction, ChannelSelectMenuInteraction, RoleSelectMenuInteraction } from 'discord.js';
import { getGuildSettings, updateGuildSettings } from '../../../../database/repositories/settingsRepo.js';
import type { CustomRoleRule } from '../../../../database/repositories/customRolesRepo.js';
import { getCustomRoleRuleById } from '../../../../database/repositories/customRolesRepo.js';
import { addLevelRole, removeLevelRole } from '../../../../database/repositories/levelingRepo.js';
import { deleteReactionRolePanel, getReactionRolePanels } from '../../../../database/repositories/reactionRolesRepo.js';
import type { RoleSubCategory, SetupCategory } from '../types.js';
import { buildCategoryView } from './viewBuilder.js';
import { buildCustomRoleAddWizard, buildCustomRuleEdit } from '../customRolesBuilder.js';
import { DEFAULT_WELCOME_MESSAGES, DEFAULT_LEAVE_MESSAGES } from '../welcomeBuilder.js';
import { buildLevelingManageRoles, buildReactionRolesManage } from '../newModulesBuilders.js';
import type { SelectMenuResult, LevelingRoleData } from './types.js';

export async function handleStringSelectMenu(
  i: StringSelectMenuInteraction,
  guildId: string,
  settings: any,
  currentCategory: SetupCategory,
  currentRoleSubCategory: RoleSubCategory,
  wizardStep: number,
  wizardData: Partial<CustomRoleRule>,
  levelingRoleToAdd: LevelingRoleData
): Promise<SelectMenuResult> {
  switch (i.customId) {
    case 'setup_language':
      updateGuildSettings(guildId, { language: i.values[0] });
      return { shouldReturn: false };

    case 'setup_preset':
      updateGuildSettings(guildId, { rolePreset: i.values[0] });
      return { shouldReturn: false };

    case 'setup_maxroles':
      updateGuildSettings(guildId, { maxRolesPerUser: parseInt(i.values[0]) });
      return { shouldReturn: false };

    case 'setup_leaderboard_interval':
      updateGuildSettings(guildId, { leaderboardIntervalMinutes: parseInt(i.values[0]) });
      return { shouldReturn: false };

    case 'setup_stat_gain':
      updateGuildSettings(guildId, { statGainMultiplier: parseFloat(i.values[0]) });
      return { shouldReturn: false };

    case 'setup_stat_drain':
      updateGuildSettings(guildId, { statDrainMultiplier: parseFloat(i.values[0]) });
      return { shouldReturn: false };

    case 'setup_roles_category': {
      const roleView = buildCategoryView('roles', settings, i.guild!, i.values[0] as RoleSubCategory);
      await i.update({ embeds: roleView.embeds, components: roleView.components });
      return { shouldReturn: true };
    }

    case 'setup_welcome_message_type':
      return handleWelcomeMessageType(i, settings, currentRoleSubCategory, guildId);

    case 'setup_customroles_wizard_stat':
      return handleCustomRolesWizardStat(i, wizardData);

    case 'setup_customroles_wizard_operator':
      return handleCustomRolesWizardOperator(i, wizardData);

    case 'setup_customroles_wizard_value':
      return handleCustomRolesWizardValue(i, wizardData);

    case 'setup_customroles_wizard_options':
      return handleCustomRolesWizardOptions(i, wizardData);

    case 'setup_economy_daily':
      updateGuildSettings(guildId, { economyDailyReward: parseInt(i.values[0]) });
      return { shouldReturn: false };

    case 'setup_economy_work_cooldown':
      updateGuildSettings(guildId, { economyWorkCooldown: parseInt(i.values[0]) });
      return { shouldReturn: false };

    case 'setup_giveaway_max_winners':
      return handleGiveawayMaxWinners(i, guildId);

    case 'setup_giveaway_max_duration':
      updateGuildSettings(guildId, { giveawayMaxDuration: parseInt(i.values[0]) });
      return { shouldReturn: false };

    case 'setup_leveling_xp_message':
      updateGuildSettings(guildId, { levelingXpPerMessage: parseInt(i.values[0]) });
      return { shouldReturn: false };

    case 'setup_leveling_cooldown':
      updateGuildSettings(guildId, { levelingXpCooldown: parseInt(i.values[0]) });
      return { shouldReturn: false };

    case 'setup_imagegen_provider':
      updateGuildSettings(guildId, { imageGenProvider: i.values[0] as 'cloudflare' | 'together' | 'gemini' });
      return { shouldReturn: false };

    case 'setup_imagegen_user_limit':
      updateGuildSettings(guildId, { imageGenUserDailyLimit: parseInt(i.values[0]) });
      return { shouldReturn: false };

    case 'setup_imagegen_guild_limit':
      updateGuildSettings(guildId, { imageGenGuildDailyLimit: parseInt(i.values[0]) });
      return { shouldReturn: false };

    case 'setup_tempvoice_limit':
      updateGuildSettings(guildId, { tempVoiceUserLimit: parseInt(i.values[0]) });
      return { shouldReturn: false };

    case 'setup_leveling_level_select':
      return handleLevelingLevelSelect(i, guildId, currentRoleSubCategory, levelingRoleToAdd);

    case 'setup_leveling_delete_role':
      return handleLevelingDeleteRole(i, settings);

    case 'setup_reactionroles_select_panel':
      return handleReactionRolesSelectPanel(i, guildId);

    case 'setup_customroles_select':
      return handleCustomRolesSelect(i);
  }
  return { shouldReturn: false };
}

export async function handleChannelSelectMenu(
  i: ChannelSelectMenuInteraction,
  guildId: string,
  currentCategory: SetupCategory,
  currentRoleSubCategory: RoleSubCategory
): Promise<void> {
  const channelId = i.values[0];
  
  const channelMappings: Record<string, string> = {
    'setup_leaderboard_channel': 'leaderboardChannelId',
    'setup_welcome_channel': 'welcomeChannelId',
    'setup_leveling_channel': 'levelingAnnouncementChannelId',
    'setup_imagegen_channel': 'imageGenChannelId',
    'setup_tempvoice_trigger': 'tempVoiceTriggerChannelId',
    'setup_tempvoice_category': 'tempVoiceCategoryId',
  };

  const settingKey = channelMappings[i.customId];
  if (settingKey) {
    updateGuildSettings(guildId, { [settingKey]: channelId });
  }

  const newSettings = getGuildSettings(guildId);
  const view = buildCategoryView(currentCategory, newSettings, i.guild!, currentRoleSubCategory);
  await i.update({ embeds: view.embeds, components: view.components });
}

export async function handleRoleSelectMenu(
  i: RoleSelectMenuInteraction,
  guildId: string,
  currentRoleSubCategory: RoleSubCategory,
  wizardData: Partial<CustomRoleRule>,
  levelingRoleToAdd: LevelingRoleData
): Promise<SelectMenuResult> {
  if (i.customId === 'setup_customroles_wizard_role') {
    const role = i.roles.first()!;
    const newWizardData = { ...wizardData, roleId: role.id, roleName: role.name };
    const wizardView = buildCustomRoleAddWizard(1, guildId, newWizardData);
    await i.update({ embeds: wizardView.embeds, components: wizardView.components });
    return { shouldReturn: true, wizardStep: 1, wizardData: newWizardData };
  }

  if (i.customId === 'setup_leveling_role_select') {
    const role = i.roles.first()!;
    const newLevelingData = { ...levelingRoleToAdd, roleId: role.id };
    
    if (newLevelingData.level) {
      addLevelRole(guildId, newLevelingData.level, newLevelingData.roleId);
      const newSettings = getGuildSettings(guildId);
      const view = buildCategoryView('leveling', newSettings, i.guild!, currentRoleSubCategory);
      await i.update({ embeds: view.embeds, components: view.components });
      await i.followUp({ content: `✅ Level role added for **${role.name}**!`, flags: MessageFlags.Ephemeral });
      return { shouldReturn: true, levelingRoleToAdd: {} };
    }
    
    await i.reply({ content: `Role **${role.name}** selected. Now select a level.`, flags: MessageFlags.Ephemeral });
    return { shouldReturn: true, levelingRoleToAdd: newLevelingData };
  }

  return { shouldReturn: false };
}

async function handleWelcomeMessageType(
  i: StringSelectMenuInteraction,
  settings: any,
  currentRoleSubCategory: RoleSubCategory,
  guildId: string
): Promise<SelectMenuResult> {
  const value = i.values[0];
  
  if (value === 'reset') {
    updateGuildSettings(guildId, { welcomeMessage: null, leaveMessage: null });
    const newSettings = getGuildSettings(guildId);
    const view = buildCategoryView('welcome', newSettings, i.guild!, currentRoleSubCategory);
    await i.update({ embeds: view.embeds, components: view.components });
  } else {
    const isWelcome = value === 'welcome';
    const currentMessage = isWelcome 
      ? (settings.welcomeMessage || DEFAULT_WELCOME_MESSAGES.en)
      : (settings.leaveMessage || DEFAULT_LEAVE_MESSAGES.en);

    const modal = new ModalBuilder()
      .setCustomId(`setup_welcome_modal_${value}`)
      .setTitle(isWelcome ? '✏️ Edit Welcome Message' : '✏️ Edit Leave Message');

    const messageInput = new TextInputBuilder()
      .setCustomId('message')
      .setLabel(isWelcome ? 'Welcome Message' : 'Leave Message')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Variables: {user}, {username}, {server}, {memberCount}')
      .setValue(currentMessage)
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput));
    await i.showModal(modal);
  }
  return { shouldReturn: true };
}

async function handleCustomRolesWizardStat(
  i: StringSelectMenuInteraction,
  wizardData: Partial<CustomRoleRule>
): Promise<SelectMenuResult> {
  const newWizardData = { ...wizardData, statType: i.values[0] as any };
  const wizardView = buildCustomRoleAddWizard(2, i.guild!.id, newWizardData);
  await i.update({ embeds: wizardView.embeds, components: wizardView.components });
  return { shouldReturn: true, wizardStep: 2, wizardData: newWizardData };
}

async function handleCustomRolesWizardOperator(
  i: StringSelectMenuInteraction,
  wizardData: Partial<CustomRoleRule>
): Promise<SelectMenuResult> {
  const newWizardData = { ...wizardData, operator: i.values[0] as any };
  const wizardView = buildCustomRoleAddWizard(3, i.guild!.id, newWizardData);
  await i.update({ embeds: wizardView.embeds, components: wizardView.components });
  return { shouldReturn: true, wizardStep: 3, wizardData: newWizardData };
}

async function handleCustomRolesWizardValue(
  i: StringSelectMenuInteraction,
  wizardData: Partial<CustomRoleRule>
): Promise<SelectMenuResult> {
  const newWizardData = { ...wizardData, value: parseInt(i.values[0]) };
  const wizardView = buildCustomRoleAddWizard(4, i.guild!.id, newWizardData);
  await i.update({ embeds: wizardView.embeds, components: wizardView.components });
  return { shouldReturn: true, wizardStep: 4, wizardData: newWizardData };
}

async function handleCustomRolesWizardOptions(
  i: StringSelectMenuInteraction,
  wizardData: Partial<CustomRoleRule>
): Promise<SelectMenuResult> {
  const optionValue = i.values[0];
  const isTemporary = optionValue !== 'permanent';
  const newWizardData = { 
    ...wizardData, 
    isTemporary,
    durationMinutes: isTemporary ? parseInt(optionValue) : undefined
  };
  const wizardView = buildCustomRoleAddWizard(5, i.guild!.id, newWizardData);
  await i.update({ embeds: wizardView.embeds, components: wizardView.components });
  return { shouldReturn: true, wizardStep: 5, wizardData: newWizardData };
}

async function handleGiveawayMaxWinners(
  i: StringSelectMenuInteraction,
  guildId: string
): Promise<SelectMenuResult> {
  const value = i.values[0];
  
  if (value === 'custom') {
    const modal = new ModalBuilder()
      .setCustomId('setup_giveaway_custom_winners_modal')
      .setTitle('Custom Max Winners');
    
    const winnersInput = new TextInputBuilder()
      .setCustomId('winners')
      .setLabel('Enter max winners (1-100)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter a number')
      .setRequired(true)
      .setMaxLength(3);
    
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(winnersInput));
    await i.showModal(modal);
    return { shouldReturn: true };
  }
  
  updateGuildSettings(guildId, { giveawayMaxWinners: parseInt(value) });
  return { shouldReturn: false };
}

async function handleLevelingLevelSelect(
  i: StringSelectMenuInteraction,
  guildId: string,
  currentRoleSubCategory: RoleSubCategory,
  levelingRoleToAdd: LevelingRoleData
): Promise<SelectMenuResult> {
  const newLevelingData = { ...levelingRoleToAdd, level: parseInt(i.values[0]) };
  
  if (newLevelingData.roleId && newLevelingData.level) {
    addLevelRole(guildId, newLevelingData.level, newLevelingData.roleId);
    const newSettings = getGuildSettings(guildId);
    const view = buildCategoryView('leveling', newSettings, i.guild!, currentRoleSubCategory);
    await i.update({ embeds: view.embeds, components: view.components });
    await i.followUp({ content: `✅ Level role added!`, flags: MessageFlags.Ephemeral });
    return { shouldReturn: true, levelingRoleToAdd: {} };
  }
  
  await i.reply({ content: 'Please select a role first.', flags: MessageFlags.Ephemeral });
  return { shouldReturn: true, levelingRoleToAdd: newLevelingData };
}

async function handleLevelingDeleteRole(
  i: StringSelectMenuInteraction,
  settings: any
): Promise<SelectMenuResult> {
  const roleId = parseInt(i.values[0]);
  removeLevelRole(roleId);
  const manageView = buildLevelingManageRoles(settings, i.guild!);
  await i.update({ embeds: manageView.embeds, components: manageView.components });
  return { shouldReturn: true };
}

async function handleReactionRolesSelectPanel(
  i: StringSelectMenuInteraction,
  guildId: string
): Promise<SelectMenuResult> {
  const panelId = parseInt(i.values[0]);
  const panels = getReactionRolePanels(guildId);
  const panel = panels.find(p => p.id === panelId);
  
  if (panel) {
    try {
      const channel = i.guild!.channels.cache.get(panel.channelId) as any;
      if (channel) {
        const message = await channel.messages.fetch(panel.messageId).catch(() => null);
        if (message) await message.delete().catch(() => {});
      }
    } catch {}
    deleteReactionRolePanel(panelId);
    await i.followUp({ content: `✅ Deleted panel **${panel.title}** (ID: ${panelId})`, flags: MessageFlags.Ephemeral });
  }
  
  const manageView = buildReactionRolesManage(guildId, i.guild!);
  await i.update({ embeds: manageView.embeds, components: manageView.components });
  return { shouldReturn: true };
}

async function handleCustomRolesSelect(
  i: StringSelectMenuInteraction
): Promise<SelectMenuResult> {
  const ruleId = parseInt(i.values[0]);
  const rule = getCustomRoleRuleById(ruleId);
  
  if (rule) {
    const editView = buildCustomRuleEdit(rule);
    await i.update({ embeds: editView.embeds, components: editView.components });
  } else {
    await i.reply({ content: '❌ Rule not found.', flags: MessageFlags.Ephemeral });
  }
  
  return { shouldReturn: true };
}
