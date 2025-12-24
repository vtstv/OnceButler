// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Leveling System Repository
// Licensed under MIT License

import { getDb } from '../db.js';

export interface MemberLevel {
  guildId: string;
  oderId: string;
  xp: number;
  level: number;
  totalXp: number;
  messagesCount: number;
  voiceMinutes: number;
  lastXpGain: string | null;
}

export interface LevelRole {
  id: number;
  guildId: string;
  level: number;
  roleId: string;
  createdAt: string;
}

export function getMemberLevel(guildId: string, userId: string): MemberLevel {
  const db = getDb();
  const row = db.prepare(`
    SELECT guild_id as guildId, user_id as oderId, xp, level, total_xp as totalXp,
           messages_count as messagesCount, voice_minutes as voiceMinutes, 
           last_xp_gain as lastXpGain
    FROM member_levels
    WHERE guild_id = ? AND user_id = ?
  `).get(guildId, userId) as MemberLevel | undefined;

  if (row) return row;

  return {
    guildId,
    oderId: userId,
    xp: 0,
    level: 0,
    totalXp: 0,
    messagesCount: 0,
    voiceMinutes: 0,
    lastXpGain: null,
  };
}

export function getXpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5) + 50 * level);
}

export function getLevelFromXp(totalXp: number): { level: number; currentXp: number; neededXp: number } {
  let level = 0;
  let remaining = totalXp;
  
  while (remaining >= getXpForLevel(level + 1)) {
    remaining -= getXpForLevel(level + 1);
    level++;
  }
  
  return {
    level,
    currentXp: remaining,
    neededXp: getXpForLevel(level + 1),
  };
}

export function addXp(guildId: string, userId: string, amount: number, source: 'message' | 'voice'): { leveledUp: boolean; oldLevel: number; newLevel: number } {
  const db = getDb();
  const current = getMemberLevel(guildId, userId);
  const oldLevel = current.level;
  
  const newTotalXp = current.totalXp + amount;
  const levelData = getLevelFromXp(newTotalXp);
  
  const messageIncrement = source === 'message' ? 1 : 0;
  const voiceIncrement = source === 'voice' ? 1 : 0;

  db.prepare(`
    INSERT INTO member_levels (guild_id, user_id, xp, level, total_xp, messages_count, voice_minutes, last_xp_gain)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      xp = ?,
      level = ?,
      total_xp = ?,
      messages_count = messages_count + ?,
      voice_minutes = voice_minutes + ?,
      last_xp_gain = datetime('now')
  `).run(
    guildId, userId, levelData.currentXp, levelData.level, newTotalXp, messageIncrement, voiceIncrement,
    levelData.currentXp, levelData.level, newTotalXp, messageIncrement, voiceIncrement
  );

  return {
    leveledUp: levelData.level > oldLevel,
    oldLevel,
    newLevel: levelData.level,
  };
}

export function getLevelingLeaderboard(guildId: string, limit = 10): MemberLevel[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT guild_id as guildId, user_id as oderId, xp, level, total_xp as totalXp,
           messages_count as messagesCount, voice_minutes as voiceMinutes, 
           last_xp_gain as lastXpGain
    FROM member_levels
    WHERE guild_id = ?
    ORDER BY total_xp DESC
    LIMIT ?
  `).all(guildId, limit) as MemberLevel[];
  return rows;
}

export function setMemberLevel(guildId: string, userId: string, level: number): void {
  const db = getDb();
  const xpNeeded = Array.from({ length: level }, (_, i) => getXpForLevel(i + 1))
    .reduce((a, b) => a + b, 0);
  
  db.prepare(`
    INSERT INTO member_levels (guild_id, user_id, xp, level, total_xp, messages_count, voice_minutes)
    VALUES (?, ?, 0, ?, ?, 0, 0)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      xp = 0,
      level = ?,
      total_xp = ?
  `).run(guildId, userId, level, xpNeeded, level, xpNeeded);
}

export function getLevelRoles(guildId: string): LevelRole[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, guild_id as guildId, level, role_id as roleId, created_at as createdAt
    FROM level_roles
    WHERE guild_id = ?
    ORDER BY level ASC
  `).all(guildId) as LevelRole[];
  return rows;
}

export function addLevelRole(guildId: string, level: number, roleId: string): number {
  const db = getDb();
  const existing = db.prepare(`
    SELECT id FROM level_roles WHERE guild_id = ? AND level = ?
  `).get(guildId, level);
  
  if (existing) {
    db.prepare(`UPDATE level_roles SET role_id = ? WHERE guild_id = ? AND level = ?`).run(roleId, guildId, level);
    return (existing as any).id;
  }
  
  const result = db.prepare(`
    INSERT INTO level_roles (guild_id, level, role_id)
    VALUES (?, ?, ?)
  `).run(guildId, level, roleId);
  return result.lastInsertRowid as number;
}

export function removeLevelRole(id: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM level_roles WHERE id = ?`).run(id);
}

export function getLevelRolesForLevel(guildId: string, level: number): LevelRole[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, guild_id as guildId, level, role_id as roleId, created_at as createdAt
    FROM level_roles
    WHERE guild_id = ? AND level <= ?
    ORDER BY level ASC
  `).all(guildId, level) as LevelRole[];
  return rows;
}

export function canGainXp(guildId: string, userId: string, cooldownSeconds: number): boolean {
  const db = getDb();
  const row = db.prepare(`
    SELECT last_xp_gain FROM member_levels WHERE guild_id = ? AND user_id = ?
  `).get(guildId, userId) as { last_xp_gain: string | null } | undefined;
  
  if (!row || !row.last_xp_gain) return true;
  
  const lastGain = new Date(row.last_xp_gain + 'Z').getTime();
  const now = Date.now();
  return now - lastGain >= cooldownSeconds * 1000;
}
