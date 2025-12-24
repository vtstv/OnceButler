// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Reaction Roles Repository
// Licensed under MIT License

import { getDb } from '../db.js';

export interface ReactionRole {
  id: number;
  guildId: string;
  channelId: string;
  messageId: string;
  emoji: string;
  roleId: string;
  createdAt: string;
}

export interface ReactionRolePanel {
  id: number;
  guildId: string;
  channelId: string;
  messageId: string;
  title: string;
  description: string | null;
  createdAt: string;
}

export function createReactionRolePanel(
  guildId: string,
  channelId: string,
  messageId: string,
  title: string,
  description: string | null
): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO reaction_role_panels (guild_id, channel_id, message_id, title, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(guildId, channelId, messageId, title, description);
  return result.lastInsertRowid as number;
}

export function getReactionRolePanels(guildId: string): ReactionRolePanel[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, guild_id as guildId, channel_id as channelId, message_id as messageId, 
           title, description, created_at as createdAt
    FROM reaction_role_panels
    WHERE guild_id = ?
    ORDER BY created_at DESC
  `).all(guildId) as ReactionRolePanel[];
  return rows;
}

export function getReactionRolePanelByMessage(guildId: string, messageId: string): ReactionRolePanel | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, guild_id as guildId, channel_id as channelId, message_id as messageId, 
           title, description, created_at as createdAt
    FROM reaction_role_panels
    WHERE guild_id = ? AND message_id = ?
  `).get(guildId, messageId) as ReactionRolePanel | undefined;
  return row || null;
}

export function deleteReactionRolePanel(panelId: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM reaction_roles WHERE panel_id = ?`).run(panelId);
  db.prepare(`DELETE FROM reaction_role_panels WHERE id = ?`).run(panelId);
}

export function addReactionRole(
  guildId: string,
  panelId: number,
  emoji: string,
  roleId: string
): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO reaction_roles (guild_id, panel_id, emoji, role_id)
    VALUES (?, ?, ?, ?)
  `).run(guildId, panelId, emoji, roleId);
  return result.lastInsertRowid as number;
}

export function getReactionRolesByPanel(panelId: number): ReactionRole[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, guild_id as guildId, panel_id as panelId, emoji, role_id as roleId, created_at as createdAt
    FROM reaction_roles
    WHERE panel_id = ?
  `).all(panelId) as any[];
  return rows;
}

export function getReactionRole(guildId: string, messageId: string, emoji: string): ReactionRole | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT rr.id, rr.guild_id as guildId, p.channel_id as channelId, p.message_id as messageId, 
           rr.emoji, rr.role_id as roleId, rr.created_at as createdAt
    FROM reaction_roles rr
    JOIN reaction_role_panels p ON rr.panel_id = p.id
    WHERE rr.guild_id = ? AND p.message_id = ? AND rr.emoji = ?
  `).get(guildId, messageId, emoji) as ReactionRole | undefined;
  return row || null;
}

export function removeReactionRole(id: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM reaction_roles WHERE id = ?`).run(id);
}

export function getAllReactionRoles(guildId: string): (ReactionRole & { panelId: number })[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT rr.id, rr.guild_id as guildId, p.channel_id as channelId, p.message_id as messageId, 
           rr.emoji, rr.role_id as roleId, rr.created_at as createdAt, rr.panel_id as panelId
    FROM reaction_roles rr
    JOIN reaction_role_panels p ON rr.panel_id = p.id
    WHERE rr.guild_id = ?
  `).all(guildId) as any[];
  return rows;
}
