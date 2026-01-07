// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Steam News Repository
// Licensed under MIT License

import { getDb } from '../database/db.js';

export interface ProcessedNewsRecord {
  gid: string;
  guildId: string;
  title: string;
  processedAt: number;
  channelId: string;
}

export function initSteamNewsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS steam_news_processed (
      gid TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      title TEXT NOT NULL,
      processed_at INTEGER NOT NULL,
      PRIMARY KEY (gid, guild_id, channel_id)
    );

    CREATE INDEX IF NOT EXISTS idx_steam_news_gid
    ON steam_news_processed(gid);

    CREATE INDEX IF NOT EXISTS idx_steam_news_guild
    ON steam_news_processed(guild_id);
  `);
}

export function isNewsProcessed(gid: string, guildId: string, channelId: string): boolean {
  const db = getDb();
  const row = db.prepare(`
    SELECT 1 FROM steam_news_processed 
    WHERE gid = ? AND guild_id = ? AND channel_id = ?
  `).get(gid, guildId, channelId);
  return !!row;
}

export function markNewsProcessed(gid: string, guildId: string, channelId: string, title: string): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO steam_news_processed (gid, guild_id, channel_id, title, processed_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(gid, guildId, channelId, title, Date.now());
}

export function getProcessedNewsForGuild(guildId: string, limit = 20): ProcessedNewsRecord[] {
  const db = getDb();
  return db.prepare(`
    SELECT gid, guild_id as guildId, channel_id as channelId, title, processed_at as processedAt
    FROM steam_news_processed
    WHERE guild_id = ?
    ORDER BY processed_at DESC
    LIMIT ?
  `).all(guildId, limit) as ProcessedNewsRecord[];
}

export function clearOldProcessedNews(daysToKeep = 30): number {
  const db = getDb();
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const result = db.prepare(`
    DELETE FROM steam_news_processed WHERE processed_at < ?
  `).run(cutoff);
  return result.changes;
}
