// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Triggers Repository
// Licensed under MIT License

import { getDb } from '../db.js';

export interface CustomTrigger {
  id: number;
  guildId: string;
  name: string;
  statType: 'mood' | 'energy' | 'activity';
  modifier: number;
  active: boolean;
  createdAt: number;
  expiresAt: number | null;
}

export function createTrigger(
  guildId: string,
  name: string,
  statType: 'mood' | 'energy' | 'activity',
  modifier: number,
  durationMinutes: number | null
): number {
  const db = getDb();
  const now = Date.now();
  const expiresAt = durationMinutes ? now + durationMinutes * 60 * 1000 : null;

  const result = db.prepare(`
    INSERT INTO custom_triggers (guild_id, name, stat_type, modifier, active, created_at, expires_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `).run(guildId, name, statType, modifier, now, expiresAt);

  return result.lastInsertRowid as number;
}

export function getActiveTriggers(guildId: string): CustomTrigger[] {
  const db = getDb();
  const now = Date.now();

  const rows = db.prepare(`
    SELECT id, guild_id, name, stat_type, modifier, active, created_at, expires_at
    FROM custom_triggers
    WHERE guild_id = ? AND active = 1 AND (expires_at IS NULL OR expires_at > ?)
  `).all(guildId, now) as any[];

  return rows.map(row => ({
    id: row.id,
    guildId: row.guild_id,
    name: row.name,
    statType: row.stat_type,
    modifier: row.modifier,
    active: !!row.active,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

export function deactivateTrigger(triggerId: number): boolean {
  const db = getDb();
  const result = db.prepare(`
    UPDATE custom_triggers SET active = 0 WHERE id = ?
  `).run(triggerId);
  return result.changes > 0;
}

export function listGuildTriggers(guildId: string): CustomTrigger[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, guild_id, name, stat_type, modifier, active, created_at, expires_at
    FROM custom_triggers
    WHERE guild_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(guildId) as any[];

  return rows.map(row => ({
    id: row.id,
    guildId: row.guild_id,
    name: row.name,
    statType: row.stat_type,
    modifier: row.modifier,
    active: !!row.active,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

export function cleanupExpiredTriggers(): void {
  const db = getDb();
  db.prepare(`
    UPDATE custom_triggers SET active = 0
    WHERE active = 1 AND expires_at IS NOT NULL AND expires_at <= ?
  `).run(Date.now());
}
