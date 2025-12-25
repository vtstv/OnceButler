// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Setup Module Index
// Licensed under MIT License

// Types
export * from './types.js';

// Main Menu
export { buildMainMenu } from './mainMenu.js';

// General Settings Builders
export {
  buildGeneralSettings,
  buildFeatureSettings,
  buildStatSettings,
  buildLeaderboardSettings,
} from './generalBuilders.js';

// Role Management Builders
export {
  buildRolesSettings,
  createRolesByCategory,
  deleteRolesByCategory,
} from './roleBuilders.js';

// Welcome/Leave Module
export {
  buildWelcomeSettings,
  formatWelcomeMessage,
  DEFAULT_WELCOME_MESSAGES,
  DEFAULT_LEAVE_MESSAGES,
} from './welcomeBuilder.js';

// Custom Role Rules Module
export {
  buildCustomRolesSettings,
  buildCustomRoleAddWizard,
  buildCustomRoleManage,
  buildCustomRuleEdit,
} from './customRolesBuilder.js';

// Economy & Giveaways Module
export {
  buildEconomySettings,
  buildGiveawaySettings,
} from './economyGiveawayBuilders.js';

// New Modules (Reaction Roles, Leveling, Image Gen, Temp Voice)
export {
  buildReactionRolesSettings,
  buildLevelingSettings,
  buildImageGenSettings,
  buildTempVoiceSettings,
} from './newModulesBuilders.js';
