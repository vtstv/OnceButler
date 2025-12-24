// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Image Generation Repository
// Licensed under MIT License

import { getDb } from '../db.js';

export interface ImageGenUsage {
  guildId: string;
  userId: string;
  generationsToday: number;
  lastGenerationAt: number;
  totalGenerations: number;
}

export interface GuildImageGenStats {
  guildId: string;
  generationsToday: number;
  totalGenerations: number;
  lastResetDate: string;
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getImageGenUsage(guildId: string, userId: string): ImageGenUsage {
  const db = getDb();
  const today = getTodayDateString();
  
  const row = db.prepare(`
    SELECT generationsToday, lastGenerationAt, totalGenerations, lastResetDate
    FROM imagegen_usage
    WHERE guildId = ? AND userId = ?
  `).get(guildId, userId) as any;

  if (!row) {
    return {
      guildId,
      userId,
      generationsToday: 0,
      lastGenerationAt: 0,
      totalGenerations: 0,
    };
  }

  // Reset daily count if it's a new day
  if (row.lastResetDate !== today) {
    return {
      guildId,
      userId,
      generationsToday: 0,
      lastGenerationAt: row.lastGenerationAt,
      totalGenerations: row.totalGenerations,
    };
  }

  return {
    guildId,
    userId,
    generationsToday: row.generationsToday,
    lastGenerationAt: row.lastGenerationAt,
    totalGenerations: row.totalGenerations,
  };
}

export function incrementImageGenUsage(guildId: string, userId: string): void {
  const db = getDb();
  const now = Date.now();
  const today = getTodayDateString();

  db.prepare(`
    INSERT INTO imagegen_usage (guildId, userId, generationsToday, lastGenerationAt, totalGenerations, lastResetDate)
    VALUES (?, ?, 1, ?, 1, ?)
    ON CONFLICT(guildId, userId) DO UPDATE SET
      generationsToday = CASE 
        WHEN lastResetDate != ? THEN 1 
        ELSE generationsToday + 1 
      END,
      lastGenerationAt = ?,
      totalGenerations = totalGenerations + 1,
      lastResetDate = ?
  `).run(guildId, userId, now, today, today, now, today);
}

export function getGuildImageGenStats(guildId: string): GuildImageGenStats {
  const db = getDb();
  const today = getTodayDateString();
  
  const row = db.prepare(`
    SELECT generationsToday, totalGenerations, lastResetDate
    FROM imagegen_guild_stats
    WHERE guildId = ?
  `).get(guildId) as any;

  if (!row) {
    return {
      guildId,
      generationsToday: 0,
      totalGenerations: 0,
      lastResetDate: today,
    };
  }

  // Reset daily count if it's a new day
  if (row.lastResetDate !== today) {
    return {
      guildId,
      generationsToday: 0,
      totalGenerations: row.totalGenerations,
      lastResetDate: today,
    };
  }

  return {
    guildId,
    generationsToday: row.generationsToday,
    totalGenerations: row.totalGenerations,
    lastResetDate: row.lastResetDate,
  };
}

export function incrementGuildImageGenStats(guildId: string): void {
  const db = getDb();
  const today = getTodayDateString();

  db.prepare(`
    INSERT INTO imagegen_guild_stats (guildId, generationsToday, totalGenerations, lastResetDate)
    VALUES (?, 1, 1, ?)
    ON CONFLICT(guildId) DO UPDATE SET
      generationsToday = CASE 
        WHEN lastResetDate != ? THEN 1 
        ELSE generationsToday + 1 
      END,
      totalGenerations = totalGenerations + 1,
      lastResetDate = ?
  `).run(guildId, today, today, today);
}

export function getTopImageGenerators(guildId: string, limit: number = 10): Array<{ userId: string; total: number }> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT userId, totalGenerations as total
    FROM imagegen_usage
    WHERE guildId = ?
    ORDER BY totalGenerations DESC
    LIMIT ?
  `).all(guildId, limit) as Array<{ userId: string; total: number }>;
  
  return rows;
}
