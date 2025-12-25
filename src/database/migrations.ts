// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Database Migrations
// Licensed under MIT License

import { getDb } from './db.js';

export function runMigrations(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS member_stats (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      mood REAL DEFAULT 50,
      energy REAL DEFAULT 50,
      activity REAL DEFAULT 50,
      last_role_update INTEGER DEFAULT 0,
      last_chaos_event INTEGER DEFAULT 0,
      chaos_role TEXT DEFAULT NULL,
      chaos_expires INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_member_stats_guild
    ON member_stats(guild_id);

    CREATE TABLE IF NOT EXISTS member_progress (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      voice_minutes INTEGER DEFAULT 0,
      online_minutes INTEGER DEFAULT 0,
      peak_mood REAL DEFAULT 50,
      peak_energy REAL DEFAULT 50,
      peak_activity REAL DEFAULT 50,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS achievements (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      unlocked_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS custom_triggers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      stat_type TEXT NOT NULL,
      modifier REAL NOT NULL,
      active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      expires_at INTEGER DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_triggers_guild
    ON custom_triggers(guild_id, active);

    CREATE TABLE IF NOT EXISTS guild_settings (
      guildId TEXT PRIMARY KEY,
      language TEXT DEFAULT 'en',
      managerRoles TEXT DEFAULT '[]',
      rolePreset TEXT DEFAULT 'en',
      setupComplete INTEGER DEFAULT 0,
      enableRoleColors INTEGER DEFAULT 1,
      enableChaosRoles INTEGER DEFAULT 1,
      enableAchievements INTEGER DEFAULT 1,
      maxRolesPerUser INTEGER DEFAULT 2
    );
  `);

  // Create custom role rules table
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_role_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      role_name TEXT NOT NULL,
      stat_type TEXT NOT NULL,
      operator TEXT NOT NULL,
      value REAL NOT NULL,
      is_temporary INTEGER DEFAULT 0,
      duration_minutes INTEGER DEFAULT NULL,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_custom_role_rules_guild
    ON custom_role_rules(guild_id, enabled);

    CREATE TABLE IF NOT EXISTS custom_role_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rule_id INTEGER NOT NULL,
      role_id TEXT NOT NULL,
      assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT DEFAULT NULL,
      UNIQUE(guild_id, user_id, rule_id)
    );

    CREATE INDEX IF NOT EXISTS idx_custom_role_assignments_guild_user
    ON custom_role_assignments(guild_id, user_id);

    CREATE INDEX IF NOT EXISTS idx_custom_role_assignments_expires
    ON custom_role_assignments(expires_at);
  `);

  // Giveaways tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL UNIQUE,
      host_id TEXT NOT NULL,
      prize TEXT NOT NULL,
      winners_count INTEGER DEFAULT 1,
      ends_at TEXT NOT NULL,
      ended INTEGER DEFAULT 0,
      winners TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_giveaways_guild
    ON giveaways(guild_id, ended);

    CREATE INDEX IF NOT EXISTS idx_giveaways_ends
    ON giveaways(ends_at, ended);

    CREATE TABLE IF NOT EXISTS giveaway_participants (
      giveaway_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (giveaway_id, user_id),
      FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE
    );
  `);

  // Economy tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS economy_wallets (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      balance INTEGER DEFAULT 0,
      bank INTEGER DEFAULT 0,
      total_earned INTEGER DEFAULT 0,
      last_daily TEXT DEFAULT NULL,
      last_work TEXT DEFAULT NULL,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_economy_wallets_guild
    ON economy_wallets(guild_id);

    CREATE TABLE IF NOT EXISTS economy_shop (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price INTEGER NOT NULL,
      role_id TEXT DEFAULT NULL,
      stock INTEGER DEFAULT -1,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_economy_shop_guild
    ON economy_shop(guild_id, enabled);

    CREATE TABLE IF NOT EXISTS economy_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_economy_transactions_user
    ON economy_transactions(guild_id, user_id);
  `);

  // Migration: add new columns if they don't exist
  const migrations = [
    `ALTER TABLE guild_settings ADD COLUMN rolePreset TEXT DEFAULT 'en'`,
    `ALTER TABLE guild_settings ADD COLUMN setupComplete INTEGER DEFAULT 0`,
    `ALTER TABLE guild_settings ADD COLUMN enableRoleColors INTEGER DEFAULT 1`,
    `ALTER TABLE guild_settings ADD COLUMN enableChaosRoles INTEGER DEFAULT 1`,
    `ALTER TABLE guild_settings ADD COLUMN enableAchievements INTEGER DEFAULT 1`,
    `ALTER TABLE guild_settings ADD COLUMN maxRolesPerUser INTEGER DEFAULT 2`,
    `ALTER TABLE guild_settings ADD COLUMN enableAutoLeaderboard INTEGER DEFAULT 0`,
    `ALTER TABLE guild_settings ADD COLUMN leaderboardChannelId TEXT DEFAULT NULL`,
    `ALTER TABLE guild_settings ADD COLUMN leaderboardIntervalMinutes INTEGER DEFAULT 60`,
    `ALTER TABLE guild_settings ADD COLUMN leaderboardMessageId TEXT DEFAULT NULL`,
    `ALTER TABLE guild_settings ADD COLUMN statGainMultiplier REAL DEFAULT 1.0`,
    `ALTER TABLE guild_settings ADD COLUMN statDrainMultiplier REAL DEFAULT 0.5`,
    // Welcome/Leave module
    `ALTER TABLE guild_settings ADD COLUMN enableWelcome INTEGER DEFAULT 0`,
    `ALTER TABLE guild_settings ADD COLUMN welcomeChannelId TEXT DEFAULT NULL`,
    `ALTER TABLE guild_settings ADD COLUMN welcomeMessage TEXT DEFAULT NULL`,
    `ALTER TABLE guild_settings ADD COLUMN leaveMessage TEXT DEFAULT NULL`,
    // Economy module
    `ALTER TABLE guild_settings ADD COLUMN enableEconomy INTEGER DEFAULT 0`,
    `ALTER TABLE guild_settings ADD COLUMN economyCurrencyName TEXT DEFAULT 'coins'`,
    `ALTER TABLE guild_settings ADD COLUMN economyCurrencyEmoji TEXT DEFAULT '🪙'`,
    `ALTER TABLE guild_settings ADD COLUMN economyDailyAmount INTEGER DEFAULT 100`,
    `ALTER TABLE guild_settings ADD COLUMN economyWorkMin INTEGER DEFAULT 10`,
    `ALTER TABLE guild_settings ADD COLUMN economyWorkMax INTEGER DEFAULT 50`,
    // Giveaways module
    `ALTER TABLE guild_settings ADD COLUMN enableGiveaways INTEGER DEFAULT 1`,
    // Additional economy settings
    `ALTER TABLE guild_settings ADD COLUMN economyDailyReward INTEGER DEFAULT 100`,
    `ALTER TABLE guild_settings ADD COLUMN economyWorkCooldown INTEGER DEFAULT 30`,
    `ALTER TABLE guild_settings ADD COLUMN economyBankInterest REAL DEFAULT 0.01`,
    `ALTER TABLE guild_settings ADD COLUMN economyTransferFee REAL DEFAULT 0`,
    // Additional giveaway settings
    `ALTER TABLE guild_settings ADD COLUMN giveawayMinDuration INTEGER DEFAULT 5`,
    `ALTER TABLE guild_settings ADD COLUMN giveawayMaxDuration INTEGER DEFAULT 10080`,
    `ALTER TABLE guild_settings ADD COLUMN giveawayMaxWinners INTEGER DEFAULT 10`,
    `ALTER TABLE guild_settings ADD COLUMN giveawayDmWinners INTEGER DEFAULT 1`,
    // Reaction Roles module
    `ALTER TABLE guild_settings ADD COLUMN enableReactionRoles INTEGER DEFAULT 0`,
    `ALTER TABLE guild_settings ADD COLUMN reactionRolesChannelId TEXT DEFAULT NULL`,
    // Leveling module
    `ALTER TABLE guild_settings ADD COLUMN enableLeveling INTEGER DEFAULT 0`,
    `ALTER TABLE guild_settings ADD COLUMN levelingXpPerMessage INTEGER DEFAULT 15`,
    `ALTER TABLE guild_settings ADD COLUMN levelingXpPerVoiceMinute INTEGER DEFAULT 5`,
    `ALTER TABLE guild_settings ADD COLUMN levelingXpCooldown INTEGER DEFAULT 60`,
    `ALTER TABLE guild_settings ADD COLUMN levelingAnnouncementChannelId TEXT DEFAULT NULL`,
    `ALTER TABLE guild_settings ADD COLUMN levelingAnnounceLevelUp INTEGER DEFAULT 1`,
    `ALTER TABLE guild_settings ADD COLUMN levelingStackRoles INTEGER DEFAULT 0`,
  ];

  for (const migration of migrations) {
    try {
      db.exec(migration);
    } catch {
      // Column already exists
    }
  }

  // Reaction Roles tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS reaction_role_panels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_reaction_role_panels_guild
    ON reaction_role_panels(guild_id);

    CREATE TABLE IF NOT EXISTS reaction_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      panel_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      role_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (panel_id) REFERENCES reaction_role_panels(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_reaction_roles_panel
    ON reaction_roles(panel_id);
  `);

  // Leveling tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS member_levels (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      total_xp INTEGER DEFAULT 0,
      messages_count INTEGER DEFAULT 0,
      voice_minutes INTEGER DEFAULT 0,
      last_xp_gain TEXT DEFAULT NULL,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_member_levels_guild
    ON member_levels(guild_id);

    CREATE INDEX IF NOT EXISTS idx_member_levels_xp
    ON member_levels(guild_id, total_xp DESC);

    CREATE TABLE IF NOT EXISTS level_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      role_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, level)
    );

    CREATE INDEX IF NOT EXISTS idx_level_roles_guild
    ON level_roles(guild_id);
  `);

  // Inventory & Items tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS item_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      type TEXT NOT NULL,
      rarity TEXT DEFAULT 'common',
      price INTEGER NOT NULL,
      attack_bonus INTEGER DEFAULT 0,
      defense_bonus INTEGER DEFAULT 0,
      health_bonus INTEGER DEFAULT 0,
      crit_chance_bonus INTEGER DEFAULT 0,
      energy_restore INTEGER DEFAULT 0,
      mood_restore INTEGER DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_item_definitions_guild
    ON item_definitions(guild_id, enabled);

    CREATE TABLE IF NOT EXISTS user_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      equipped INTEGER DEFAULT 0,
      acquired_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, user_id, item_id),
      FOREIGN KEY (item_id) REFERENCES item_definitions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_user_inventory_user
    ON user_inventory(guild_id, user_id);

    CREATE INDEX IF NOT EXISTS idx_user_inventory_equipped
    ON user_inventory(guild_id, user_id, equipped);

    -- Image Generation tables
    CREATE TABLE IF NOT EXISTS imagegen_usage (
      guildId TEXT NOT NULL,
      userId TEXT NOT NULL,
      generationsToday INTEGER DEFAULT 0,
      lastGenerationAt INTEGER DEFAULT 0,
      totalGenerations INTEGER DEFAULT 0,
      lastResetDate TEXT,
      PRIMARY KEY (guildId, userId)
    );

    CREATE TABLE IF NOT EXISTS imagegen_guild_stats (
      guildId TEXT PRIMARY KEY,
      generationsToday INTEGER DEFAULT 0,
      totalGenerations INTEGER DEFAULT 0,
      lastResetDate TEXT
    );
  `);

  // Add image generation settings columns
  const imageGenColumns = [
    { name: 'enableImageGen', sql: 'ALTER TABLE guild_settings ADD COLUMN enableImageGen INTEGER DEFAULT 0' },
    { name: 'imageGenProvider', sql: "ALTER TABLE guild_settings ADD COLUMN imageGenProvider TEXT DEFAULT 'gemini'" },
    { name: 'imageGenApiKey', sql: 'ALTER TABLE guild_settings ADD COLUMN imageGenApiKey TEXT DEFAULT NULL' },
    { name: 'imageGenAccountId', sql: 'ALTER TABLE guild_settings ADD COLUMN imageGenAccountId TEXT DEFAULT NULL' },
    { name: 'imageGenChannelId', sql: 'ALTER TABLE guild_settings ADD COLUMN imageGenChannelId TEXT DEFAULT NULL' },
    { name: 'imageGenUserDailyLimit', sql: 'ALTER TABLE guild_settings ADD COLUMN imageGenUserDailyLimit INTEGER DEFAULT 5' },
    { name: 'imageGenGuildDailyLimit', sql: 'ALTER TABLE guild_settings ADD COLUMN imageGenGuildDailyLimit INTEGER DEFAULT 50' },
  ];

  for (const col of imageGenColumns) {
    try {
      db.exec(col.sql);
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) throw e;
    }
  }

  // Add temp voice channels settings columns
  const tempVoiceColumns = [
    { name: 'enableTempVoice', sql: 'ALTER TABLE guild_settings ADD COLUMN enableTempVoice INTEGER DEFAULT 0' },
    { name: 'tempVoiceTriggerChannelId', sql: 'ALTER TABLE guild_settings ADD COLUMN tempVoiceTriggerChannelId TEXT DEFAULT NULL' },
    { name: 'tempVoiceCategoryId', sql: 'ALTER TABLE guild_settings ADD COLUMN tempVoiceCategoryId TEXT DEFAULT NULL' },
    { name: 'tempVoiceNameTemplate', sql: "ALTER TABLE guild_settings ADD COLUMN tempVoiceNameTemplate TEXT DEFAULT '🔊 {user}'" },
    { name: 'tempVoiceUserLimit', sql: 'ALTER TABLE guild_settings ADD COLUMN tempVoiceUserLimit INTEGER DEFAULT 0' },
  ];

  for (const col of tempVoiceColumns) {
    try {
      db.exec(col.sql);
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) throw e;
    }
  }
}
