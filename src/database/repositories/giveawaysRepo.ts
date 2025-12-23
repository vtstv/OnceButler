// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Giveaways Repository
// Licensed under MIT License

import { getDb } from '../db.js';

export interface Giveaway {
  id: number;
  guildId: string;
  channelId: string;
  messageId: string;
  hostId: string;
  prize: string;
  winnersCount: number;
  endsAt: string;
  ended: boolean;
  winners: string[];
  participants: string[];
  createdAt: string;
}

export interface GiveawayParticipant {
  giveawayId: number;
  userId: string;
  joinedAt: string;
}

// ==================== GIVEAWAYS CRUD ====================

export function createGiveaway(
  guildId: string,
  channelId: string,
  messageId: string,
  hostId: string,
  prize: string,
  winnersCount: number,
  endsAt: Date
): number {
  const db = getDb();
  const result = db.prepare(
    `INSERT INTO giveaways (guild_id, channel_id, message_id, host_id, prize, winners_count, ends_at, ended)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(guildId, channelId, messageId, hostId, prize, winnersCount, endsAt.toISOString());
  return result.lastInsertRowid as number;
}

export function getGiveaway(id: number): Giveaway | null {
  const db = getDb();
  const row = db.prepare(
    `SELECT id, guild_id, channel_id, message_id, host_id, prize, winners_count, ends_at, ended, winners, created_at
     FROM giveaways WHERE id = ?`
  ).get(id) as any;
  return row ? mapRowToGiveaway(row) : null;
}

export function getGiveawayByMessage(messageId: string): Giveaway | null {
  const db = getDb();
  const row = db.prepare(
    `SELECT id, guild_id, channel_id, message_id, host_id, prize, winners_count, ends_at, ended, winners, created_at
     FROM giveaways WHERE message_id = ?`
  ).get(messageId) as any;
  return row ? mapRowToGiveaway(row) : null;
}

export function getActiveGiveaways(guildId?: string): Giveaway[] {
  const db = getDb();
  let query = `SELECT id, guild_id, channel_id, message_id, host_id, prize, winners_count, ends_at, ended, winners, created_at
               FROM giveaways WHERE ended = 0`;
  const params: any[] = [];
  
  if (guildId) {
    query += ` AND guild_id = ?`;
    params.push(guildId);
  }
  
  query += ` ORDER BY ends_at ASC`;
  
  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(mapRowToGiveaway);
}

export function getExpiredGiveaways(): Giveaway[] {
  const db = getDb();
  const now = new Date().toISOString();
  const rows = db.prepare(
    `SELECT id, guild_id, channel_id, message_id, host_id, prize, winners_count, ends_at, ended, winners, created_at
     FROM giveaways WHERE ended = 0 AND ends_at <= ?`
  ).all(now) as any[];
  return rows.map(mapRowToGiveaway);
}

export function endGiveaway(id: number, winners: string[]): boolean {
  const db = getDb();
  const result = db.prepare(
    `UPDATE giveaways SET ended = 1, winners = ? WHERE id = ?`
  ).run(JSON.stringify(winners), id);
  return result.changes > 0;
}

export function deleteGiveaway(id: number): boolean {
  const db = getDb();
  db.prepare(`DELETE FROM giveaway_participants WHERE giveaway_id = ?`).run(id);
  const result = db.prepare(`DELETE FROM giveaways WHERE id = ?`).run(id);
  return result.changes > 0;
}

// ==================== PARTICIPANTS ====================

export function addParticipant(giveawayId: number, userId: string): boolean {
  const db = getDb();
  try {
    db.prepare(
      `INSERT OR IGNORE INTO giveaway_participants (giveaway_id, user_id) VALUES (?, ?)`
    ).run(giveawayId, userId);
    return true;
  } catch {
    return false;
  }
}

export function removeParticipant(giveawayId: number, userId: string): boolean {
  const db = getDb();
  const result = db.prepare(
    `DELETE FROM giveaway_participants WHERE giveaway_id = ? AND user_id = ?`
  ).run(giveawayId, userId);
  return result.changes > 0;
}

export function getParticipants(giveawayId: number): string[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT user_id FROM giveaway_participants WHERE giveaway_id = ?`
  ).all(giveawayId) as { user_id: string }[];
  return rows.map(r => r.user_id);
}

export function getParticipantCount(giveawayId: number): number {
  const db = getDb();
  const row = db.prepare(
    `SELECT COUNT(*) as count FROM giveaway_participants WHERE giveaway_id = ?`
  ).get(giveawayId) as { count: number };
  return row.count;
}

export function isParticipant(giveawayId: number, userId: string): boolean {
  const db = getDb();
  const row = db.prepare(
    `SELECT 1 FROM giveaway_participants WHERE giveaway_id = ? AND user_id = ?`
  ).get(giveawayId, userId);
  return !!row;
}

// ==================== HELPERS ====================

function mapRowToGiveaway(row: any): Giveaway {
  return {
    id: row.id,
    guildId: row.guild_id,
    channelId: row.channel_id,
    messageId: row.message_id,
    hostId: row.host_id,
    prize: row.prize,
    winnersCount: row.winners_count,
    endsAt: row.ends_at,
    ended: row.ended === 1,
    winners: row.winners ? JSON.parse(row.winners) : [],
    participants: [],
    createdAt: row.created_at,
  };
}

// ==================== WINNER SELECTION ====================

export function selectWinners(giveawayId: number, count: number): string[] {
  const participants = getParticipants(giveawayId);
  if (participants.length === 0) return [];
  
  const winners: string[] = [];
  const pool = [...participants];
  
  const actualCount = Math.min(count, pool.length);
  
  for (let i = 0; i < actualCount; i++) {
    const index = Math.floor(Math.random() * pool.length);
    winners.push(pool[index]);
    pool.splice(index, 1);
  }
  
  return winners;
}
