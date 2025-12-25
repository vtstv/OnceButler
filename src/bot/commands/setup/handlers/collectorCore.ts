// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Collector Core
// Licensed under MIT License

import { Message, MessageFlags } from 'discord.js';
import { getGuildSettings } from '../../../../database/repositories/settingsRepo.js';
import type { CustomRoleRule } from '../../../../database/repositories/customRolesRepo.js';
import type { SetupCategory, RoleSubCategory } from '../types.js';
import { buildCategoryView } from './viewBuilder.js';
import { handleStringSelectMenu, handleChannelSelectMenu, handleRoleSelectMenu } from './selectMenuHandlers.js';
import { handleButton } from './buttonHandlers.js';
import type { CollectorState, LevelingRoleData } from './types.js';

export async function startCollector(message: Message, userId: string, guildId: string): Promise<void> {
  const collector = message.createMessageComponentCollector({
    time: 300000, // 5 minutes
  });

  const state: CollectorState = {
    currentCategory: 'main',
    currentRoleSubCategory: 'overview',
    wizardStep: 0,
    wizardData: {},
    levelingRoleToAdd: {},
  };

  collector.on('collect', async (i) => {
    if (i.user.id !== userId) {
      await i.reply({ content: 'This menu is not for you.', flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      const settings = getGuildSettings(guildId);

      if (handleCategoryNavigation(i, state)) {
        const view = buildCategoryView(state.currentCategory, settings, i.guild!, state.currentRoleSubCategory);
        await i.update({ embeds: view.embeds, components: view.components });
        return;
      }

      if (i.isStringSelectMenu()) {
        const result = await handleStringSelectMenu(
          i, guildId, settings, 
          state.currentCategory, state.currentRoleSubCategory,
          state.wizardStep, state.wizardData, state.levelingRoleToAdd
        );
        applySelectMenuResult(state, result);
        if (result.shouldReturn) return;
        
        const newSettings = getGuildSettings(guildId);
        const view = buildCategoryView(state.currentCategory, newSettings, i.guild!, state.currentRoleSubCategory);
        await i.update({ embeds: view.embeds, components: view.components });
        return;
      }

      if (i.isChannelSelectMenu()) {
        await handleChannelSelectMenu(i, guildId, state.currentCategory, state.currentRoleSubCategory);
        return;
      }

      if (i.isRoleSelectMenu()) {
        const result = await handleRoleSelectMenu(
          i, guildId, state.currentRoleSubCategory,
          state.wizardData, state.levelingRoleToAdd
        );
        applySelectMenuResult(state, result);
        if (result.shouldReturn) return;
      }

      if (i.isButton()) {
        const result = await handleButton(
          i, guildId, settings,
          state.currentCategory, state.currentRoleSubCategory,
          state.wizardStep, state.wizardData, state.levelingRoleToAdd
        );
        applyButtonResult(state, result);
        if (result.shouldReturn) return;

        const newSettings = getGuildSettings(guildId);
        const view = buildCategoryView(state.currentCategory, newSettings, i.guild!, state.currentRoleSubCategory);
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

function handleCategoryNavigation(i: any, state: CollectorState): boolean {
  if (i.isButton() && i.customId.startsWith('setup_cat_')) {
    state.currentCategory = i.customId.replace('setup_cat_', '') as SetupCategory;
    state.currentRoleSubCategory = 'overview';
    return true;
  }

  if (i.isButton() && i.customId === 'setup_roles_back') {
    state.currentRoleSubCategory = 'overview';
    state.currentCategory = 'roles';
    return true;
  }

  return false;
}

function applySelectMenuResult(
  state: CollectorState, 
  result: { wizardStep?: number; wizardData?: Partial<CustomRoleRule>; levelingRoleToAdd?: LevelingRoleData }
): void {
  if (result.wizardStep !== undefined) state.wizardStep = result.wizardStep;
  if (result.wizardData) state.wizardData = result.wizardData;
  if (result.levelingRoleToAdd !== undefined) state.levelingRoleToAdd = result.levelingRoleToAdd;
}

function applyButtonResult(
  state: CollectorState,
  result: { wizardStep?: number; wizardData?: Partial<CustomRoleRule>; category?: SetupCategory; levelingRoleToAdd?: LevelingRoleData }
): void {
  if (result.wizardStep !== undefined) state.wizardStep = result.wizardStep;
  if (result.wizardData !== undefined) state.wizardData = result.wizardData;
  if (result.category) state.currentCategory = result.category;
  if (result.levelingRoleToAdd !== undefined) state.levelingRoleToAdd = result.levelingRoleToAdd;
}
