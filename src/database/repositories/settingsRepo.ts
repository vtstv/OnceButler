// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Settings Repository
// Licensed under MIT License

import { getDb } from '../db.js';

export interface GuildSettings {
  guildId: string;
  language: string;
  managerRoles: string[];
  rolePreset: string;
}

const DEFAULT_SETTINGS: Omit<GuildSettings, 'guildId'> = {
  language: 'en',
  managerRoles: [],
  rolePreset: 'en',
};

export function getGuildSettings(guildId: string): GuildSettings {
  const db = getDb();
  const row = db.prepare(`
    SELECT language, managerRoles, rolePreset FROM guild_settings WHERE guildId = ?
  `).get(guildId) as { language: string; managerRoles: string; rolePreset: string } | undefined;

  if (!row) {
    return { guildId, ...DEFAULT_SETTINGS };
  }

  return {
    guildId,
    language: row.language,
    managerRoles: row.managerRoles ? JSON.parse(row.managerRoles) : [],
    rolePreset: row.rolePreset ?? 'en',
  };
}

export function getGuildLanguage(guildId: string): string {
  const db = getDb();
  const row = db.prepare(`SELECT language FROM guild_settings WHERE guildId = ?`).get(guildId) as { language: string } | undefined;
  return row?.language ?? 'en';
}

export function setGuildLanguage(guildId: string, language: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO guild_settings (guildId, language, managerRoles, rolePreset)
    VALUES (?, ?, '[]', 'en')
    ON CONFLICT(guildId) DO UPDATE SET language = excluded.language
  `).run(guildId, language);
}

export function getGuildRolePreset(guildId: string): string {
  const db = getDb();
  const row = db.prepare(`SELECT rolePreset FROM guild_settings WHERE guildId = ?`).get(guildId) as { rolePreset: string } | undefined;
  return row?.rolePreset ?? 'en';
}

export function setGuildRolePreset(guildId: string, preset: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO guild_settings (guildId, language, managerRoles, rolePreset)
    VALUES (?, 'en', '[]', ?)
    ON CONFLICT(guildId) DO UPDATE SET rolePreset = excluded.rolePreset
  `).run(guildId, preset);
}

export function getManagerRoles(guildId: string): string[] {
  const db = getDb();
  const row = db.prepare(`SELECT managerRoles FROM guild_settings WHERE guildId = ?`).get(guildId) as { managerRoles: string } | undefined;
  return row?.managerRoles ? JSON.parse(row.managerRoles) : [];
}

export function addManagerRole(guildId: string, roleId: string): boolean {
  const db = getDb();
  const current = getManagerRoles(guildId);
  if (current.includes(roleId)) return false;
  
  current.push(roleId);
  db.prepare(`
    INSERT INTO guild_settings (guildId, language, managerRoles, rolePreset)
    VALUES (?, 'en', ?, 'en')
    ON CONFLICT(guildId) DO UPDATE SET managerRoles = excluded.managerRoles
  `).run(guildId, JSON.stringify(current));
  return true;
}

export function removeManagerRole(guildId: string, roleId: string): boolean {
  const db = getDb();
  const current = getManagerRoles(guildId);
  const index = current.indexOf(roleId);
  if (index === -1) return false;
  
  current.splice(index, 1);
  db.prepare(`UPDATE guild_settings SET managerRoles = ? WHERE guildId = ?`).run(JSON.stringify(current), guildId);
  return true;
}

export function isManager(guildId: string, memberRoleIds: string[]): boolean {
  const managerRoles = getManagerRoles(guildId);
  return memberRoleIds.some(roleId => managerRoles.includes(roleId));
}
