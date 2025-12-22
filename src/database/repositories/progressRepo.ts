// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Progress Repository
// Licensed under MIT License

import { getDb } from '../db.js';

export interface MemberProgress {
  guildId: string;
  userId: string;
  voiceMinutes: number;
  onlineMinutes: number;
  peakMood: number;
  peakEnergy: number;
  peakActivity: number;
}

export function getMemberProgress(guildId: string, userId: string): MemberProgress {
  const db = getDb();
  const row = db.prepare(`
    SELECT guild_id, user_id, voice_minutes, online_minutes, peak_mood, peak_energy, peak_activity
    FROM member_progress
    WHERE guild_id = ? AND user_id = ?
  `).get(guildId, userId) as any;

  if (!row) {
    return {
      guildId,
      userId,
      voiceMinutes: 0,
      onlineMinutes: 0,
      peakMood: 50,
      peakEnergy: 50,
      peakActivity: 50,
    };
  }

  return {
    guildId: row.guild_id,
    userId: row.user_id,
    voiceMinutes: row.voice_minutes,
    onlineMinutes: row.online_minutes,
    peakMood: row.peak_mood,
    peakEnergy: row.peak_energy,
    peakActivity: row.peak_activity,
  };
}

export function updateMemberProgress(
  guildId: string,
  userId: string,
  updates: Partial<{ voiceMinutes: number; onlineMinutes: number; peakMood: number; peakEnergy: number; peakActivity: number }>
): void {
  const db = getDb();
  const current = getMemberProgress(guildId, userId);

  const voiceMinutes = updates.voiceMinutes ?? current.voiceMinutes;
  const onlineMinutes = updates.onlineMinutes ?? current.onlineMinutes;
  const peakMood = Math.max(current.peakMood, updates.peakMood ?? 0);
  const peakEnergy = Math.max(current.peakEnergy, updates.peakEnergy ?? 0);
  const peakActivity = Math.max(current.peakActivity, updates.peakActivity ?? 0);

  db.prepare(`
    INSERT INTO member_progress (guild_id, user_id, voice_minutes, online_minutes, peak_mood, peak_energy, peak_activity)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      voice_minutes = excluded.voice_minutes,
      online_minutes = excluded.online_minutes,
      peak_mood = excluded.peak_mood,
      peak_energy = excluded.peak_energy,
      peak_activity = excluded.peak_activity
  `).run(guildId, userId, voiceMinutes, onlineMinutes, peakMood, peakEnergy, peakActivity);
}

export function incrementVoiceTime(guildId: string, userId: string, minutes: number): void {
  const progress = getMemberProgress(guildId, userId);
  updateMemberProgress(guildId, userId, { voiceMinutes: progress.voiceMinutes + minutes });
}

export function incrementOnlineTime(guildId: string, userId: string, minutes: number): void {
  const progress = getMemberProgress(guildId, userId);
  updateMemberProgress(guildId, userId, { onlineMinutes: progress.onlineMinutes + minutes });
}
