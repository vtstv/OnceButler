// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Achievements Repository
// Licensed under MIT License

import { getDb } from '../db.js';

export interface Achievement {
  guildId: string;
  userId: string;
  achievementId: string;
  unlockedAt: number;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  roleReward: string | null;
  requirement: {
    type: 'voice_hours' | 'mood_streak' | 'energy_max' | 'activity_max' | 'total_online_hours';
    value: number;
  };
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'voice_10h',
    name: 'Voice Rookie',
    description: '10 hours in voice channels',
    roleReward: 'Voice Rookie',
    requirement: { type: 'voice_hours', value: 10 },
  },
  {
    id: 'voice_50h',
    name: 'Voice Regular',
    description: '50 hours in voice channels',
    roleReward: 'Voice Regular',
    requirement: { type: 'voice_hours', value: 50 },
  },
  {
    id: 'voice_100h',
    name: 'Voice Veteran',
    description: '100 hours in voice channels',
    roleReward: 'Voice Veteran',
    requirement: { type: 'voice_hours', value: 100 },
  },
  {
    id: 'mood_master',
    name: 'Mood Master',
    description: 'Reached max mood (100)',
    roleReward: 'Mood Master',
    requirement: { type: 'mood_streak', value: 100 },
  },
  {
    id: 'energy_king',
    name: 'Energy King',
    description: 'Reached max energy (100)',
    roleReward: 'Energy King',
    requirement: { type: 'energy_max', value: 100 },
  },
  {
    id: 'hyperactive',
    name: 'Hyperactive',
    description: 'Reached max activity (100)',
    roleReward: 'Hyperactive',
    requirement: { type: 'activity_max', value: 100 },
  },
];

export function hasAchievement(guildId: string, userId: string, achievementId: string): boolean {
  const db = getDb();
  const row = db.prepare(`
    SELECT 1 FROM achievements
    WHERE guild_id = ? AND user_id = ? AND achievement_id = ?
  `).get(guildId, userId, achievementId);
  return !!row;
}

export function unlockAchievement(guildId: string, userId: string, achievementId: string): boolean {
  if (hasAchievement(guildId, userId, achievementId)) return false;

  const db = getDb();
  db.prepare(`
    INSERT INTO achievements (guild_id, user_id, achievement_id, unlocked_at)
    VALUES (?, ?, ?, ?)
  `).run(guildId, userId, achievementId, Date.now());
  return true;
}

export function getUserAchievements(guildId: string, userId: string): string[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT achievement_id FROM achievements
    WHERE guild_id = ? AND user_id = ?
  `).all(guildId, userId) as { achievement_id: string }[];
  return rows.map(r => r.achievement_id);
}

export function getAchievementRoles(): string[] {
  return ACHIEVEMENTS.filter(a => a.roleReward).map(a => a.roleReward!);
}
