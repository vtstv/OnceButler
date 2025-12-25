// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Member Stats Repository
// Licensed under MIT License

import { getDb } from '../db.js';

export interface MemberStats {
  guildId: string;
  userId: string;
  mood: number;
  energy: number;
  activity: number;
  lastRoleUpdate: number;
  lastChaosEvent: number;
  chaosRole: string | null;
  chaosExpires: number;
}

export function getMemberStats(guildId: string, userId: string): MemberStats {
  const db = getDb();
  const row = db.prepare(`
    SELECT guild_id, user_id, mood, energy, activity,
           last_role_update, last_chaos_event, chaos_role, chaos_expires
    FROM member_stats
    WHERE guild_id = ? AND user_id = ?
  `).get(guildId, userId) as any;

  if (!row) {
    return {
      guildId,
      userId,
      mood: 30,
      energy: 30,
      activity: 0,
      lastRoleUpdate: 0,
      lastChaosEvent: 0,
      chaosRole: null,
      chaosExpires: 0,
    };
  }

  return {
    guildId: row.guild_id,
    userId: row.user_id,
    mood: row.mood,
    energy: row.energy,
    activity: row.activity,
    lastRoleUpdate: row.last_role_update,
    lastChaosEvent: row.last_chaos_event,
    chaosRole: row.chaos_role,
    chaosExpires: row.chaos_expires,
  };
}

export function upsertMemberStats(stats: MemberStats): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO member_stats (guild_id, user_id, mood, energy, activity,
                              last_role_update, last_chaos_event, chaos_role, chaos_expires)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      mood = excluded.mood,
      energy = excluded.energy,
      activity = excluded.activity,
      last_role_update = excluded.last_role_update,
      last_chaos_event = excluded.last_chaos_event,
      chaos_role = excluded.chaos_role,
      chaos_expires = excluded.chaos_expires
  `).run(
    stats.guildId,
    stats.userId,
    stats.mood,
    stats.energy,
    stats.activity,
    stats.lastRoleUpdate,
    stats.lastChaosEvent,
    stats.chaosRole,
    stats.chaosExpires
  );
}

/**
 * Boost activity stat when user sends a message
 * This helps invisible users maintain activity through chat participation
 */
export function boostActivityOnMessage(guildId: string, userId: string, amount: number = 2.0): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO member_stats (guild_id, user_id, mood, energy, activity)
    VALUES (?, ?, 30, 30, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      activity = MIN(100, activity + ?)
  `).run(guildId, userId, Math.min(100, amount), amount);
}

export function getAllGuildMembers(guildId: string): MemberStats[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT guild_id, user_id, mood, energy, activity,
           last_role_update, last_chaos_event, chaos_role, chaos_expires
    FROM member_stats
    WHERE guild_id = ?
  `).all(guildId) as any[];

  return rows.map(row => ({
    guildId: row.guild_id,
    userId: row.user_id,
    mood: row.mood,
    energy: row.energy,
    activity: row.activity,
    lastRoleUpdate: row.last_role_update,
    lastChaosEvent: row.last_chaos_event,
    chaosRole: row.chaos_role,
    chaosExpires: row.chaos_expires,
  }));
}
