// Copyright (c) 2026 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Guild Steam Games Repository
// Licensed under MIT License

import { getDb } from '../db.js';
import { getGuildSettings, updateGuildSettings } from './settingsRepo.js';

export interface GuildSteamGame {
  id: number;
  guildId: string;
  appId: number;
  gameName: string;
  channelId: string;
  isActive: boolean;
  createdAt: number;
}

export const ONCE_HUMAN_APP_ID = 2139460;
export const ONCE_HUMAN_NAME = 'Once Human';

export function getGuildSteamGames(guildId: string): GuildSteamGame[] {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT id, guild_id as guildId, app_id as appId, game_name as gameName, 
             channel_id as channelId, is_active as isActive, created_at as createdAt
      FROM guild_steam_games
      WHERE guild_id = ?
      ORDER BY id ASC
    `).all(guildId) as any[];

    return rows.map(r => ({
      ...r,
      isActive: Boolean(r.isActive),
    }));
  } catch (error) {
    console.error(`[STEAM GAMES REPO] Failed to get games for guild ${guildId}:`, error);
    return [];
  }
}

export function getActiveGuildSteamGames(guildId: string): GuildSteamGame[] {
  return getGuildSteamGames(guildId).filter(g => g.isActive);
}

export function addGuildSteamGame(
  guildId: string,
  appId: number,
  gameName: string,
  channelId: string
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO guild_steam_games (guild_id, app_id, game_name, channel_id, is_active, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
    ON CONFLICT(guild_id, app_id) DO UPDATE SET
      game_name = excluded.game_name,
      channel_id = excluded.channel_id,
      is_active = 1
  `).run(guildId, appId, gameName, channelId, Date.now());

  updateGuildSettings(guildId, { steamNewsCustomized: true });
}

export function removeGuildSteamGame(guildId: string, appId: number): boolean {
  try {
    const db = getDb();
    const result = db.prepare(`
      DELETE FROM guild_steam_games 
      WHERE guild_id = ? AND app_id = ?
    `).run(guildId, appId);

    updateGuildSettings(guildId, { steamNewsCustomized: true });
    return result.changes > 0;
  } catch (error) {
    console.error(`[STEAM GAMES REPO] Failed to delete game ${appId} for guild ${guildId}:`, error);
    return false;
  }
}

export function toggleGuildSteamGame(guildId: string, appId: number, isActive: boolean): void {
  const db = getDb();
  db.prepare(`
    UPDATE guild_steam_games 
    SET is_active = ? 
    WHERE guild_id = ? AND app_id = ?
  `).run(isActive ? 1 : 0, guildId, appId);

  updateGuildSettings(guildId, { steamNewsCustomized: true });
}

/**
 * Returns effective games for a guild. If guild has enabled steam news with a channel and api key,
 * but no games registered in the table yet, automatically defaults to Once Human.
 * If the guild explicitly customized their games (and e.g. deleted Once Human), it respects their choice.
 */
export function getEffectiveGuildSteamGames(guildId: string): Array<{
  appId: number;
  gameName: string;
  channelId: string;
}> {
  const customGames = getActiveGuildSteamGames(guildId);
  if (customGames.length > 0) {
    return customGames.map(g => ({
      appId: g.appId,
      gameName: g.gameName,
      channelId: g.channelId,
    }));
  }

  const settings = getGuildSettings(guildId);
  if (settings.steamNewsCustomized) {
    return [];
  }

  // Fallback to legacy Once Human if steam news is enabled in guild settings
  if (settings.enableSteamNews && settings.steamNewsChannelId) {
    return [{
      appId: ONCE_HUMAN_APP_ID,
      gameName: ONCE_HUMAN_NAME,
      channelId: settings.steamNewsChannelId,
    }];
  }

  return [];
}
