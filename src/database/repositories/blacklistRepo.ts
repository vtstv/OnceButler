// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Blacklist Repository
// Licensed under MIT License

import { getDb } from '../db.js';

export function isBlacklisted(guildId: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT 1 FROM blacklist WHERE guild_id = ?').get(guildId);
  return !!row;
}

export function addToBlacklist(guildId: string, reason?: string): void {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO blacklist (guild_id, reason, added_at) VALUES (?, ?, ?)').run(
    guildId,
    reason || 'No reason provided',
    Date.now()
  );
}

export function removeFromBlacklist(guildId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM blacklist WHERE guild_id = ?').run(guildId);
}

export function getBlacklist(): Array<{ guild_id: string; reason: string; added_at: number }> {
  const db = getDb();
  return db.prepare('SELECT guild_id, reason, added_at FROM blacklist ORDER BY added_at DESC').all() as Array<{
    guild_id: string;
    reason: string;
    added_at: number;
  }>;
}
