// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Setup Types
// Licensed under MIT License

import { EmbedBuilder, ActionRowBuilder } from 'discord.js';
import type { GuildSettings } from '../../../database/repositories/settingsRepo.js';
import type { CustomRoleRule } from '../../../database/repositories/customRolesRepo.js';

export type SetupCategory = 'main' | 'general' | 'features' | 'leaderboard' | 'stats' | 'roles' | 'welcome' | 'customRoles' | 'economy' | 'giveaways' | 'reactionRoles' | 'leveling' | 'imageGen';
export type RoleSubCategory = 'overview' | 'mood' | 'energy' | 'activity' | 'time' | 'chaos';

export interface SetupView {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<any>[];
}

export interface SetupState {
  currentCategory: SetupCategory;
  currentRoleSubCategory: RoleSubCategory;
  wizardStep?: number;
  wizardData?: Partial<CustomRoleRule>;
}

export const ROLE_COLORS: Record<string, number> = {
  mood: 0xFFD700,
  energy: 0x00FF7F,
  activity: 0x1E90FF,
  time: 0x9370DB,
  chaos: 0xFF4500,
};
