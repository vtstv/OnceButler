// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Setup Collector Handler
// Licensed under MIT License

import {
  Message,
  MessageFlags,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  TextChannel,
} from 'discord.js';
import { 
  getGuildSettings, 
  updateGuildSettings, 
  completeSetup,
} from '../../../../database/repositories/settingsRepo.js';
import { importRolesToGuild } from '../../../../roles/roleImporter.js';
import { getAllBotRoles } from '../../../../roles/roleRules.js';
import type { RoleCategory } from '../../../../roles/types.js';
import type { CustomRoleRule } from '../../../../database/repositories/customRolesRepo.js';
import { 
  createCustomRoleRule, 
  getCustomRoleRuleById, 
  toggleCustomRoleRule, 
  deleteCustomRoleRule,
} from '../../../../database/repositories/customRolesRepo.js';

import type { SetupCategory, RoleSubCategory } from '../types.js';
import { buildCategoryView } from './viewBuilder.js';
import { 
  buildCustomRoleAddWizard, 
  buildCustomRoleManage, 
  buildCustomRuleEdit 
} from '../customRolesBuilder.js';
import { 
  formatWelcomeMessage, 
  DEFAULT_WELCOME_MESSAGES, 
  DEFAULT_LEAVE_MESSAGES 
} from '../welcomeBuilder.js';
import { createRolesByCategory, deleteRolesByCategory } from '../roleBuilders.js';
import { buildLevelingAddRole, buildLevelingManageRoles, buildReactionRolesManage } from '../newModulesBuilders.js';
import { addLevelRole, removeLevelRole } from '../../../../database/repositories/levelingRepo.js';
import { deleteReactionRolePanel, getReactionRolePanels } from '../../../../database/repositories/reactionRolesRepo.js';

export async function startCollector(message: Message, userId: string, guildId: string): Promise<void> {
  const collector = message.createMessageComponentCollector({
    time: 300000, // 5 minutes
  });

  let currentCategory: SetupCategory = 'main';
  let currentRoleSubCategory: RoleSubCategory = 'overview';
  let wizardStep = 0;
  let wizardData: Partial<CustomRoleRule> = {};
  let levelingRoleToAdd: { roleId?: string; level?: number } = {};

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
        const view = buildCategoryView(currentCategory, settings, i.guild!, currentRoleSubCategory);
        await i.update({ embeds: view.embeds, components: view.components });
        return;
      }

      // Handle roles back button
      if (i.isButton() && i.customId === 'setup_roles_back') {
        currentRoleSubCategory = 'overview';
        const view = buildCategoryView('roles', settings, i.guild!, currentRoleSubCategory);
        await i.update({ embeds: view.embeds, components: view.components });
        return;
      }

      // Handle select menus
      if (i.isStringSelectMenu()) {
        const handled = await handleStringSelectMenu(i, guildId, settings, currentCategory, currentRoleSubCategory, wizardStep, wizardData, levelingRoleToAdd);
        if (handled.shouldReturn) {
          if (handled.wizardStep !== undefined) wizardStep = handled.wizardStep;
          if (handled.wizardData) wizardData = handled.wizardData;
          if (handled.levelingRoleToAdd !== undefined) levelingRoleToAdd = handled.levelingRoleToAdd;
          return;
        }
        const newSettings = getGuildSettings(guildId);
        const view = buildCategoryView(currentCategory, newSettings, i.guild!, currentRoleSubCategory);
        await i.update({ embeds: view.embeds, components: view.components });
        return;
      }

      // Handle channel select
      if (i.isChannelSelectMenu()) {
        if (i.customId === 'setup_leaderboard_channel') {
          updateGuildSettings(guildId, { leaderboardChannelId: i.values[0] });
        } else if (i.customId === 'setup_welcome_channel') {
          updateGuildSettings(guildId, { welcomeChannelId: i.values[0] });
        } else if (i.customId === 'setup_leveling_channel') {
          updateGuildSettings(guildId, { levelingAnnouncementChannelId: i.values[0] });
        } else if (i.customId === 'setup_imagegen_channel') {
          updateGuildSettings(guildId, { imageGenChannelId: i.values[0] });
        } else if (i.customId === 'setup_tempvoice_trigger') {
          updateGuildSettings(guildId, { tempVoiceTriggerChannelId: i.values[0] });
        } else if (i.customId === 'setup_tempvoice_category') {
          updateGuildSettings(guildId, { tempVoiceCategoryId: i.values[0] });
        }
        const newSettings = getGuildSettings(guildId);
        const view = buildCategoryView(currentCategory, newSettings, i.guild!, currentRoleSubCategory);
        await i.update({ embeds: view.embeds, components: view.components });
        return;
      }

      // Handle role select for wizard
      if (i.isRoleSelectMenu()) {
        if (i.customId === 'setup_customroles_wizard_role') {
          const role = i.roles.first()!;
          wizardData = { ...wizardData, roleId: role.id, roleName: role.name };
          wizardStep = 1;
          const wizardView = buildCustomRoleAddWizard(wizardStep, guildId, wizardData);
          await i.update({ embeds: wizardView.embeds, components: wizardView.components });
          return;
        }
        if (i.customId === 'setup_leveling_role_select') {
          const role = i.roles.first()!;
          const newLevelingData = { ...levelingRoleToAdd, roleId: role.id };
          if (newLevelingData.level) {
            addLevelRole(guildId, newLevelingData.level, newLevelingData.roleId);
            levelingRoleToAdd = {};
            const newSettings = getGuildSettings(guildId);
            const view = buildCategoryView('leveling', newSettings, i.guild!, currentRoleSubCategory);
            await i.update({ embeds: view.embeds, components: view.components });
            await i.followUp({ content: `✅ Level role added for **${role.name}**!`, flags: MessageFlags.Ephemeral });
          } else {
            levelingRoleToAdd = newLevelingData;
            await i.reply({ content: `Role **${role.name}** selected. Now select a level.`, flags: MessageFlags.Ephemeral });
          }
          return;
        }
      }

      // Handle buttons
      if (i.isButton()) {
        const buttonResult = await handleButton(i, guildId, settings, currentCategory, currentRoleSubCategory, wizardStep, wizardData, levelingRoleToAdd);
        if (buttonResult.shouldReturn) {
          if (buttonResult.wizardStep !== undefined) wizardStep = buttonResult.wizardStep;
          if (buttonResult.wizardData !== undefined) wizardData = buttonResult.wizardData;
          if (buttonResult.category) currentCategory = buttonResult.category;
          if (buttonResult.levelingRoleToAdd !== undefined) levelingRoleToAdd = buttonResult.levelingRoleToAdd;
          return;
        }

        const newSettings = getGuildSettings(guildId);
        const view = buildCategoryView(currentCategory, newSettings, i.guild!, currentRoleSubCategory);
        await i.update({ embeds: view.embeds, components: view.components });
      }
    } catch (error: any) {
      if (error.code === 10062) {
        console.warn(`[SETUP] Interaction expired for ${i.user.tag}`);
        return;
      }
      console.error('[SETUP] Error handling interaction:', error);
    }
  });

  collector.on('end', () => {
    // Components auto-expire
  });
}

interface SelectMenuResult {
  shouldReturn: boolean;
  wizardStep?: number;
  wizardData?: Partial<CustomRoleRule>;
  levelingRoleToAdd?: { roleId?: string; level?: number };
}

async function handleStringSelectMenu(
  i: any,
  guildId: string,
  settings: any,
  currentCategory: SetupCategory,
  currentRoleSubCategory: RoleSubCategory,
  wizardStep: number,
  wizardData: Partial<CustomRoleRule>,
  levelingRoleToAdd: { roleId?: string; level?: number }
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
    case 'setup_welcome_message_type': {
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
    case 'setup_customroles_wizard_stat': {
      const newWizardData = { ...wizardData, statType: i.values[0] as any };
      const wizardView = buildCustomRoleAddWizard(2, guildId, newWizardData);
      await i.update({ embeds: wizardView.embeds, components: wizardView.components });
      return { shouldReturn: true, wizardStep: 2, wizardData: newWizardData };
    }
    case 'setup_customroles_wizard_operator': {
      const newWizardData = { ...wizardData, operator: i.values[0] as any };
      const wizardView = buildCustomRoleAddWizard(3, guildId, newWizardData);
      await i.update({ embeds: wizardView.embeds, components: wizardView.components });
      return { shouldReturn: true, wizardStep: 3, wizardData: newWizardData };
    }
    case 'setup_customroles_wizard_value': {
      const newWizardData = { ...wizardData, value: parseInt(i.values[0]) };
      const wizardView = buildCustomRoleAddWizard(4, guildId, newWizardData);
      await i.update({ embeds: wizardView.embeds, components: wizardView.components });
      return { shouldReturn: true, wizardStep: 4, wizardData: newWizardData };
    }
    case 'setup_customroles_wizard_options': {
      const optionValue = i.values[0];
      const isTemporary = optionValue !== 'permanent';
      const newWizardData = { 
        ...wizardData, 
        isTemporary,
        durationMinutes: isTemporary ? parseInt(optionValue) : undefined
      };
      const wizardView = buildCustomRoleAddWizard(5, guildId, newWizardData);
      await i.update({ embeds: wizardView.embeds, components: wizardView.components });
      return { shouldReturn: true, wizardStep: 5, wizardData: newWizardData };
    }
    // Economy settings
    case 'setup_economy_daily':
      updateGuildSettings(guildId, { economyDailyReward: parseInt(i.values[0]) });
      return { shouldReturn: false };
    case 'setup_economy_work_cooldown':
      updateGuildSettings(guildId, { economyWorkCooldown: parseInt(i.values[0]) });
      return { shouldReturn: false };
    // Giveaway settings
    case 'setup_giveaway_max_winners': {
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
    case 'setup_giveaway_max_duration':
      updateGuildSettings(guildId, { giveawayMaxDuration: parseInt(i.values[0]) });
      return { shouldReturn: false };
    // Leveling settings
    case 'setup_leveling_xp_message':
      updateGuildSettings(guildId, { levelingXpPerMessage: parseInt(i.values[0]) });
      return { shouldReturn: false };
    case 'setup_leveling_cooldown':
      updateGuildSettings(guildId, { levelingXpCooldown: parseInt(i.values[0]) });
      return { shouldReturn: false };
    // Image Generation settings
    case 'setup_imagegen_provider':
      updateGuildSettings(guildId, { imageGenProvider: i.values[0] as 'cloudflare' | 'together' | 'gemini' });
      return { shouldReturn: false };
    case 'setup_imagegen_user_limit':
      updateGuildSettings(guildId, { imageGenUserDailyLimit: parseInt(i.values[0]) });
      return { shouldReturn: false };
    case 'setup_imagegen_guild_limit':
      updateGuildSettings(guildId, { imageGenGuildDailyLimit: parseInt(i.values[0]) });
      return { shouldReturn: false };
    // Temp Voice settings
    case 'setup_tempvoice_limit':
      updateGuildSettings(guildId, { tempVoiceUserLimit: parseInt(i.values[0]) });
      return { shouldReturn: false };
    case 'setup_leveling_level_select': {
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
    case 'setup_leveling_delete_role': {
      const roleId = parseInt(i.values[0]);
      removeLevelRole(roleId);
      const manageView = buildLevelingManageRoles(settings, i.guild!);
      await i.update({ embeds: manageView.embeds, components: manageView.components });
      return { shouldReturn: true };
    }
    case 'setup_reactionroles_select_panel': {
      const panelId = parseInt(i.values[0]);
      const panels = getReactionRolePanels(guildId);
      const panel = panels.find(p => p.id === panelId);
      if (panel) {
        // Try to delete the message first
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
    // Custom roles management
    case 'setup_customroles_select': {
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
  }
  return { shouldReturn: false };
}

interface ButtonResult {
  shouldReturn: boolean;
  wizardStep?: number;
  wizardData?: Partial<CustomRoleRule>;
  category?: SetupCategory;
  levelingRoleToAdd?: { roleId?: string; level?: number };
}

async function handleButton(
  i: any,
  guildId: string,
  settings: any,
  currentCategory: SetupCategory,
  currentRoleSubCategory: RoleSubCategory,
  wizardStep: number,
  wizardData: Partial<CustomRoleRule>,
  levelingRoleToAdd: { roleId?: string; level?: number }
): Promise<ButtonResult> {
  switch (i.customId) {
    case 'setup_toggle_colors':
      updateGuildSettings(guildId, { enableRoleColors: !settings.enableRoleColors });
      return { shouldReturn: false };
    case 'setup_toggle_chaos':
      updateGuildSettings(guildId, { enableChaosRoles: !settings.enableChaosRoles });
      return { shouldReturn: false };
    case 'setup_toggle_achievements':
      updateGuildSettings(guildId, { enableAchievements: !settings.enableAchievements });
      return { shouldReturn: false };
    case 'setup_toggle_autoleaderboard':
      updateGuildSettings(guildId, { enableAutoLeaderboard: !settings.enableAutoLeaderboard });
      return { shouldReturn: false };
    case 'setup_toggle_welcome':
      updateGuildSettings(guildId, { enableWelcome: !settings.enableWelcome });
      return { shouldReturn: false };
    case 'setup_toggle_economy':
      updateGuildSettings(guildId, { enableEconomy: !settings.enableEconomy });
      return { shouldReturn: false };
    case 'setup_toggle_giveaways':
      updateGuildSettings(guildId, { enableGiveaways: !settings.enableGiveaways });
      return { shouldReturn: false };
    case 'setup_toggle_giveaway_dm':
      updateGuildSettings(guildId, { giveawayDmWinners: !settings.giveawayDmWinners });
      return { shouldReturn: false };
    case 'setup_toggle_reactionroles':
      updateGuildSettings(guildId, { enableReactionRoles: !settings.enableReactionRoles });
      return { shouldReturn: false };
    case 'setup_toggle_leveling':
      updateGuildSettings(guildId, { enableLeveling: !settings.enableLeveling });
      return { shouldReturn: false };
    case 'setup_toggle_leveling_stack':
      updateGuildSettings(guildId, { levelingStackRoles: !settings.levelingStackRoles });
      return { shouldReturn: false };
    case 'setup_toggle_leveling_announce':
      updateGuildSettings(guildId, { levelingAnnounceLevelUp: !settings.levelingAnnounceLevelUp });
      return { shouldReturn: false };
    case 'setup_toggle_imagegen':
      updateGuildSettings(guildId, { enableImageGen: !settings.enableImageGen });
      return { shouldReturn: false };
    case 'setup_toggle_tempvoice':
      updateGuildSettings(guildId, { enableTempVoice: !settings.enableTempVoice });
      return { shouldReturn: false };
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

    case 'setup_welcome_test': {
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

  // Handle dynamic button patterns
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

  return { shouldReturn: false };
}
