// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - View Builder
// Licensed under MIT License

import type { GuildSettings } from '../../../../database/repositories/settingsRepo.js';
import type { SetupCategory, RoleSubCategory, SetupView } from '../types.js';
import { buildMainMenu } from '../mainMenu.js';
import { 
  buildGeneralSettings, 
  buildFeatureSettings, 
  buildStatSettings, 
  buildLeaderboardSettings 
} from '../generalBuilders.js';
import { buildRolesSettings } from '../roleBuilders.js';
import { buildWelcomeSettings } from '../welcomeBuilder.js';
import { buildCustomRolesSettings } from '../customRolesBuilder.js';
import { buildEconomySettings, buildGiveawaySettings } from '../economyGiveawayBuilders.js';
import { buildReactionRolesSettings, buildLevelingSettings, buildImageGenSettings } from '../newModulesBuilders.js';

export function buildCategoryView(
  category: SetupCategory, 
  settings: GuildSettings, 
  guild: any, 
  roleSubCategory?: RoleSubCategory
): SetupView {
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
    case 'economy':
      return buildEconomySettings(settings);
    case 'giveaways':
      return buildGiveawaySettings(settings);
    case 'reactionRoles':
      return buildReactionRolesSettings(settings, guild);
    case 'leveling':
      return buildLevelingSettings(settings, guild);
    case 'imageGen':
      return buildImageGenSettings(settings, guild);
    default:
      return buildMainMenu(settings, guild);
  }
}
