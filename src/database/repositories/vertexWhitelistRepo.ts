// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Vertex AI Whitelist Repository
// Licensed under MIT License

import { getDb } from '../db.js';

export interface VertexWhitelistEntry {
  guild_id: string;
  added_at: number;
  added_by: string;
  note: string;
}

export function addToVertexWhitelist(guildId: string, addedBy: string, note: string = ''): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO vertex_whitelist (guild_id, added_at, added_by, note)
    VALUES (?, ?, ?, ?)
  `).run(guildId, Date.now(), addedBy, note);
}

export function removeFromVertexWhitelist(guildId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM vertex_whitelist WHERE guild_id = ?').run(guildId);
}

export function isInVertexWhitelist(guildId: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT 1 FROM vertex_whitelist WHERE guild_id = ?').get(guildId);
  return !!row;
}

export function getVertexWhitelist(): VertexWhitelistEntry[] {
  const db = getDb();
  return db.prepare('SELECT * FROM vertex_whitelist ORDER BY added_at DESC').all() as VertexWhitelistEntry[];
}
