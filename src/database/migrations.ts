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
  ];

  for (const migration of migrations) {
    try {
      db.exec(migration);
    } catch {
      // Column already exists
    }
  }
}
