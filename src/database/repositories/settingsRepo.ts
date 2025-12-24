// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Settings Repository
// Licensed under MIT License

import { getDb } from '../db.js';

export interface GuildSettings {
  guildId: string;
  language: string;
  managerRoles: string[];
  rolePreset: string;
  setupComplete: boolean;
  enableRoleColors: boolean;
  enableChaosRoles: boolean;
  enableAchievements: boolean;
  maxRolesPerUser: number;
  enableAutoLeaderboard: boolean;
  leaderboardChannelId: string | null;
  leaderboardIntervalMinutes: number;
  leaderboardMessageId: string | null;
  statGainMultiplier: number;
  statDrainMultiplier: number;
  // Welcome/Leave module
  enableWelcome: boolean;
  welcomeChannelId: string | null;
  welcomeMessage: string | null;
  leaveMessage: string | null;
  // Economy module
  enableEconomy: boolean;
  economyCurrencyName: string;
  economyCurrencyEmoji: string;
  economyDailyAmount: number;
  economyWorkMin: number;
  economyWorkMax: number;
  economyDailyReward: number;
  economyWorkCooldown: number;
  economyBankInterest: number;
  economyTransferFee: number;
  // Giveaways module
  enableGiveaways: boolean;
  giveawayMinDuration: number;
  giveawayMaxDuration: number;
  giveawayMaxWinners: number;
  giveawayDmWinners: boolean;
  // Reaction Roles module
  enableReactionRoles: boolean;
  reactionRolesChannelId: string | null;
  // Leveling module
  enableLeveling: boolean;
  levelingXpPerMessage: number;
  levelingXpPerVoiceMinute: number;
  levelingXpCooldown: number;
  levelingAnnouncementChannelId: string | null;
  levelingStackRoles: boolean;
}

const DEFAULT_SETTINGS: Omit<GuildSettings, 'guildId'> = {
  language: 'en',
  managerRoles: [],
  rolePreset: 'en',
  setupComplete: false,
  enableRoleColors: true,
  enableChaosRoles: true,
  enableAchievements: true,
  maxRolesPerUser: 2,
  enableAutoLeaderboard: false,
  leaderboardChannelId: null,
  leaderboardIntervalMinutes: 60,
  leaderboardMessageId: null,
  statGainMultiplier: 1.0,
  statDrainMultiplier: 0.5,
  // Welcome/Leave module
  enableWelcome: false,
  welcomeChannelId: null,
  welcomeMessage: null,
  leaveMessage: null,
  // Economy module
  enableEconomy: false,
  economyCurrencyName: 'coins',
  economyCurrencyEmoji: '🪙',
  economyDailyAmount: 100,
  economyWorkMin: 10,
  economyWorkMax: 50,
  economyDailyReward: 100,
  economyWorkCooldown: 30,
  economyBankInterest: 0.01,
  economyTransferFee: 0,
  // Giveaways module
  enableGiveaways: true,
  giveawayMinDuration: 5,
  giveawayMaxDuration: 10080,
  giveawayMaxWinners: 10,
  giveawayDmWinners: true,
  // Reaction Roles module
  enableReactionRoles: false,
  reactionRolesChannelId: null,
  // Leveling module
  enableLeveling: false,
  levelingXpPerMessage: 15,
  levelingXpPerVoiceMinute: 5,
  levelingXpCooldown: 60,
  levelingAnnouncementChannelId: null,
  levelingStackRoles: false,
};

export function getGuildSettings(guildId: string): GuildSettings {
  const db = getDb();
  const row = db.prepare(`
    SELECT language, managerRoles, rolePreset, setupComplete, 
           enableRoleColors, enableChaosRoles, enableAchievements, maxRolesPerUser,
           enableAutoLeaderboard, leaderboardChannelId, leaderboardIntervalMinutes, leaderboardMessageId,
           statGainMultiplier, statDrainMultiplier,
           enableWelcome, welcomeChannelId, welcomeMessage, leaveMessage,
           enableEconomy, economyCurrencyName, economyCurrencyEmoji, economyDailyAmount, economyWorkMin, economyWorkMax,
           economyDailyReward, economyWorkCooldown, economyBankInterest, economyTransferFee,
           enableGiveaways, giveawayMinDuration, giveawayMaxDuration, giveawayMaxWinners, giveawayDmWinners,
           enableReactionRoles, reactionRolesChannelId,
           enableLeveling, levelingXpPerMessage, levelingXpPerVoiceMinute, levelingXpCooldown, 
           levelingAnnouncementChannelId, levelingStackRoles
    FROM guild_settings WHERE guildId = ?
  `).get(guildId) as any;

  if (!row) {
    return { guildId, ...DEFAULT_SETTINGS };
  }

  return {
    guildId,
    language: row.language,
    managerRoles: row.managerRoles ? JSON.parse(row.managerRoles) : [],
    rolePreset: row.rolePreset ?? 'en',
    setupComplete: row.setupComplete === 1,
    enableRoleColors: row.enableRoleColors !== 0,
    enableChaosRoles: row.enableChaosRoles !== 0,
    enableAchievements: row.enableAchievements !== 0,
    maxRolesPerUser: row.maxRolesPerUser ?? 2,
    enableAutoLeaderboard: row.enableAutoLeaderboard === 1,
    leaderboardChannelId: row.leaderboardChannelId ?? null,
    leaderboardIntervalMinutes: row.leaderboardIntervalMinutes ?? 60,
    leaderboardMessageId: row.leaderboardMessageId ?? null,
    statGainMultiplier: row.statGainMultiplier ?? 1.0,
    statDrainMultiplier: row.statDrainMultiplier ?? 0.5,
    enableWelcome: row.enableWelcome === 1,
    welcomeChannelId: row.welcomeChannelId ?? null,
    welcomeMessage: row.welcomeMessage ?? null,
    leaveMessage: row.leaveMessage ?? null,
    enableEconomy: row.enableEconomy === 1,
    economyCurrencyName: row.economyCurrencyName ?? 'coins',
    economyCurrencyEmoji: row.economyCurrencyEmoji ?? '🪙',
    economyDailyAmount: row.economyDailyAmount ?? 100,
    economyWorkMin: row.economyWorkMin ?? 10,
    economyWorkMax: row.economyWorkMax ?? 50,
    economyDailyReward: row.economyDailyReward ?? 100,
    economyWorkCooldown: row.economyWorkCooldown ?? 30,
    economyBankInterest: row.economyBankInterest ?? 0.01,
    economyTransferFee: row.economyTransferFee ?? 0,
    enableGiveaways: row.enableGiveaways !== 0,
    giveawayMinDuration: row.giveawayMinDuration ?? 5,
    giveawayMaxDuration: row.giveawayMaxDuration ?? 10080,
    giveawayMaxWinners: row.giveawayMaxWinners ?? 10,
    giveawayDmWinners: row.giveawayDmWinners !== 0,
    enableReactionRoles: row.enableReactionRoles === 1,
    reactionRolesChannelId: row.reactionRolesChannelId ?? null,
    enableLeveling: row.enableLeveling === 1,
    levelingXpPerMessage: row.levelingXpPerMessage ?? 15,
    levelingXpPerVoiceMinute: row.levelingXpPerVoiceMinute ?? 5,
    levelingXpCooldown: row.levelingXpCooldown ?? 60,
    levelingAnnouncementChannelId: row.levelingAnnouncementChannelId ?? null,
    levelingStackRoles: row.levelingStackRoles === 1,
  };
}

export function isSetupComplete(guildId: string): boolean {
  return getGuildSettings(guildId).setupComplete;
}

export function completeSetup(guildId: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO guild_settings (guildId, language, managerRoles, rolePreset, setupComplete)
    VALUES (?, 'en', '[]', 'en', 1)
    ON CONFLICT(guildId) DO UPDATE SET setupComplete = 1
  `).run(guildId);
}

export function updateGuildSettings(guildId: string, updates: Partial<Omit<GuildSettings, 'guildId' | 'managerRoles'>>): void {
  const db = getDb();
  const current = getGuildSettings(guildId);
  
  const merged = { ...current, ...updates };
  
  db.prepare(`
    INSERT INTO guild_settings (guildId, language, managerRoles, rolePreset, setupComplete, 
                                enableRoleColors, enableChaosRoles, enableAchievements, maxRolesPerUser,
                                enableAutoLeaderboard, leaderboardChannelId, leaderboardIntervalMinutes, leaderboardMessageId,
                                statGainMultiplier, statDrainMultiplier,
                                enableWelcome, welcomeChannelId, welcomeMessage, leaveMessage,
                                enableEconomy, economyCurrencyName, economyCurrencyEmoji, economyDailyAmount, economyWorkMin, economyWorkMax,
                                economyDailyReward, economyWorkCooldown, economyBankInterest, economyTransferFee,
                                enableGiveaways, giveawayMinDuration, giveawayMaxDuration, giveawayMaxWinners, giveawayDmWinners,
                                enableReactionRoles, reactionRolesChannelId,
                                enableLeveling, levelingXpPerMessage, levelingXpPerVoiceMinute, levelingXpCooldown, 
                                levelingAnnouncementChannelId, levelingStackRoles)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(guildId) DO UPDATE SET 
      language = excluded.language,
      rolePreset = excluded.rolePreset,
      setupComplete = excluded.setupComplete,
      enableRoleColors = excluded.enableRoleColors,
      enableChaosRoles = excluded.enableChaosRoles,
      enableAchievements = excluded.enableAchievements,
      maxRolesPerUser = excluded.maxRolesPerUser,
      enableAutoLeaderboard = excluded.enableAutoLeaderboard,
      leaderboardChannelId = excluded.leaderboardChannelId,
      leaderboardIntervalMinutes = excluded.leaderboardIntervalMinutes,
      leaderboardMessageId = excluded.leaderboardMessageId,
      statGainMultiplier = excluded.statGainMultiplier,
      statDrainMultiplier = excluded.statDrainMultiplier,
      enableWelcome = excluded.enableWelcome,
      welcomeChannelId = excluded.welcomeChannelId,
      welcomeMessage = excluded.welcomeMessage,
      leaveMessage = excluded.leaveMessage,
      enableEconomy = excluded.enableEconomy,
      economyCurrencyName = excluded.economyCurrencyName,
      economyCurrencyEmoji = excluded.economyCurrencyEmoji,
      economyDailyAmount = excluded.economyDailyAmount,
      economyWorkMin = excluded.economyWorkMin,
      economyWorkMax = excluded.economyWorkMax,
      economyDailyReward = excluded.economyDailyReward,
      economyWorkCooldown = excluded.economyWorkCooldown,
      economyBankInterest = excluded.economyBankInterest,
      economyTransferFee = excluded.economyTransferFee,
      enableGiveaways = excluded.enableGiveaways,
      giveawayMinDuration = excluded.giveawayMinDuration,
      giveawayMaxDuration = excluded.giveawayMaxDuration,
      giveawayMaxWinners = excluded.giveawayMaxWinners,
      giveawayDmWinners = excluded.giveawayDmWinners,
      enableReactionRoles = excluded.enableReactionRoles,
      reactionRolesChannelId = excluded.reactionRolesChannelId,
      enableLeveling = excluded.enableLeveling,
      levelingXpPerMessage = excluded.levelingXpPerMessage,
      levelingXpPerVoiceMinute = excluded.levelingXpPerVoiceMinute,
      levelingXpCooldown = excluded.levelingXpCooldown,
      levelingAnnouncementChannelId = excluded.levelingAnnouncementChannelId,
      levelingStackRoles = excluded.levelingStackRoles
  `).run(
    guildId,
    merged.language,
    JSON.stringify(merged.managerRoles),
    merged.rolePreset,
    merged.setupComplete ? 1 : 0,
    merged.enableRoleColors ? 1 : 0,
    merged.enableChaosRoles ? 1 : 0,
    merged.enableAchievements ? 1 : 0,
    merged.maxRolesPerUser,
    merged.enableAutoLeaderboard ? 1 : 0,
    merged.leaderboardChannelId,
    merged.leaderboardIntervalMinutes,
    merged.leaderboardMessageId,
    merged.statGainMultiplier,
    merged.statDrainMultiplier,
    merged.enableWelcome ? 1 : 0,
    merged.welcomeChannelId,
    merged.welcomeMessage,
    merged.leaveMessage,
    merged.enableEconomy ? 1 : 0,
    merged.economyCurrencyName,
    merged.economyCurrencyEmoji,
    merged.economyDailyAmount,
    merged.economyWorkMin,
    merged.economyWorkMax,
    merged.economyDailyReward,
    merged.economyWorkCooldown,
    merged.economyBankInterest,
    merged.economyTransferFee,
    merged.enableGiveaways ? 1 : 0,
    merged.giveawayMinDuration,
    merged.giveawayMaxDuration,
    merged.giveawayMaxWinners,
    merged.giveawayDmWinners ? 1 : 0,
    merged.enableReactionRoles ? 1 : 0,
    merged.reactionRolesChannelId,
    merged.enableLeveling ? 1 : 0,
    merged.levelingXpPerMessage,
    merged.levelingXpPerVoiceMinute,
    merged.levelingXpCooldown,
    merged.levelingAnnouncementChannelId,
    merged.levelingStackRoles ? 1 : 0
  );
}

export function getGuildLanguage(guildId: string): string {
  const db = getDb();
  const row = db.prepare(`SELECT language FROM guild_settings WHERE guildId = ?`).get(guildId) as { language: string } | undefined;
  return row?.language ?? 'en';
}

export function setGuildLanguage(guildId: string, language: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO guild_settings (guildId, language, managerRoles, rolePreset)
    VALUES (?, ?, '[]', 'en')
    ON CONFLICT(guildId) DO UPDATE SET language = excluded.language
  `).run(guildId, language);
}

export function getGuildRolePreset(guildId: string): string {
  const db = getDb();
  const row = db.prepare(`SELECT rolePreset FROM guild_settings WHERE guildId = ?`).get(guildId) as { rolePreset: string } | undefined;
  return row?.rolePreset ?? 'en';
}

export function setGuildRolePreset(guildId: string, preset: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO guild_settings (guildId, language, managerRoles, rolePreset)
    VALUES (?, 'en', '[]', ?)
    ON CONFLICT(guildId) DO UPDATE SET rolePreset = excluded.rolePreset
  `).run(guildId, preset);
}

export function getManagerRoles(guildId: string): string[] {
  const db = getDb();
  const row = db.prepare(`SELECT managerRoles FROM guild_settings WHERE guildId = ?`).get(guildId) as { managerRoles: string } | undefined;
  return row?.managerRoles ? JSON.parse(row.managerRoles) : [];
}

export function addManagerRole(guildId: string, roleId: string): boolean {
  const db = getDb();
  const current = getManagerRoles(guildId);
  if (current.includes(roleId)) return false;
  
  current.push(roleId);
  db.prepare(`
    INSERT INTO guild_settings (guildId, language, managerRoles, rolePreset)
    VALUES (?, 'en', ?, 'en')
    ON CONFLICT(guildId) DO UPDATE SET managerRoles = excluded.managerRoles
  `).run(guildId, JSON.stringify(current));
  return true;
}

export function removeManagerRole(guildId: string, roleId: string): boolean {
  const db = getDb();
  const current = getManagerRoles(guildId);
  const index = current.indexOf(roleId);
  if (index === -1) return false;
  
  current.splice(index, 1);
  db.prepare(`UPDATE guild_settings SET managerRoles = ? WHERE guildId = ?`).run(JSON.stringify(current), guildId);
  return true;
}

export function isManager(guildId: string, memberRoleIds: string[]): boolean {
  const managerRoles = getManagerRoles(guildId);
  return memberRoleIds.some(roleId => managerRoles.includes(roleId));
}
