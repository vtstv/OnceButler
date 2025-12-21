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
      mood: 50,
      energy: 50,
      activity: 50,
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
