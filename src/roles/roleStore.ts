// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Role Store
// Licensed under MIT License

import { join } from 'path';
import { env } from '../config/env.js';
import { readJson, writeJson, fileExists } from '../utils/file.js';
import type { RoleDefinition, RoleStore, RoleMapping, AchievementMapping } from './types.js';

const presetCache = new Map<string, RoleStore>();
let cachedRoles: RoleDefinition[] = [];
const rolesFilePath = (preset?: string): string => {
  if (preset && preset !== 'en') {
    return join(env.dataPath, `roles_${preset}.json`);
  }
  return join(env.dataPath, 'roles.json');
};

export function loadPreset(preset: string): RoleStore {
  if (presetCache.has(preset)) {
    return presetCache.get(preset)!;
  }
  
  const path = rolesFilePath(preset);
  if (!fileExists(path)) {
    // Fall back to English preset
    return loadPreset('en');
  }
  
  const data = readJson<RoleStore>(path);
  const store = data ?? { roles: getDefaultRoles(), mapping: getDefaultMapping(), achievements: getDefaultAchievements() };
  presetCache.set(preset, store);
  return store;
}

export function getMapping(preset: string = 'en'): RoleMapping {
  const store = loadPreset(preset);
  return store.mapping ?? getDefaultMapping();
}

export function getAchievementNames(preset: string = 'en'): AchievementMapping {
  const store = loadPreset(preset);
  return store.achievements ?? getDefaultAchievements();
}

export function loadRoles(preset: string = 'en'): RoleDefinition[] {
  const store = loadPreset(preset);
  cachedRoles = store.roles;
  return cachedRoles;
}

export function getRoles(preset: string = 'en'): RoleDefinition[] {
  const store = loadPreset(preset);
  return store.roles;
}

export function saveRoles(roles: RoleDefinition[]): void {
  cachedRoles = roles;
  writeJson(rolesFilePath(), { roles });
}

export function addRole(role: RoleDefinition): void {
  const roles = getRoles().filter(r => r.roleId !== role.roleId);
  roles.push(role);
  saveRoles(roles);
}

export function removeRole(roleId: string): boolean {
  const roles = getRoles();
  const filtered = roles.filter(r => r.roleId !== roleId);
  if (filtered.length === roles.length) return false;
  saveRoles(filtered);
  return true;
}

export function getRolesByCategory(category: string, preset: string = 'en'): RoleDefinition[] {
  return getRoles(preset).filter(r => r.category === category);
}

export function clearPresetCache(): void {
  presetCache.clear();
}

export function getAvailablePresets(): string[] {
  return ['en', 'ru'];
}

function getDefaultMapping(): RoleMapping {
  return {
    mood: { high2: 'Optimist 3', high1: 'Optimist 2', mid: 'Optimist 1', low1: 'Feeling blue 1', low2: 'Feeling blue 2' },
    energy: { high2: 'Power Rewind 2', high1: 'Power Rewind 1', mid: 'Stable Energy', low1: 'Worn-out', low2: 'Worn-out 2' },
    activity: { high: 'Come As One', mid1: 'Little Helper', mid2: 'Panovision', low: 'Holding the team back' },
    time: { night: 'Lunar Oracle', day: 'Praise the Sun', evening: 'Two-Shift System' },
    chaos: ['Worn-out', 'Lazy', 'Snooze Aficionado', 'Optimist 1', 'Unplanned Production'],
  };
}

function getDefaultAchievements(): AchievementMapping {
  return {
    voice_rookie: 'Voice Rookie',
    voice_regular: 'Voice Regular',
    voice_veteran: 'Voice Veteran',
    mood_master: 'Mood Master',
    energy_king: 'Energy King',
    hyperactive: 'Hyperactive',
  };
}

function getDefaultRoles(): RoleDefinition[] {
  return [
    { roleId: 'Optimist 3', category: 'mood', priority: 5, temporary: false, durationMinutes: null },
    { roleId: 'Optimist 2', category: 'mood', priority: 4, temporary: false, durationMinutes: null },
    { roleId: 'Optimist 1', category: 'mood', priority: 3, temporary: false, durationMinutes: null },
    { roleId: 'Feeling blue 1', category: 'mood', priority: 2, temporary: false, durationMinutes: null },
    { roleId: 'Feeling blue 2', category: 'mood', priority: 1, temporary: false, durationMinutes: null },

    { roleId: 'Power Rewind 2', category: 'energy', priority: 5, temporary: false, durationMinutes: null },
    { roleId: 'Power Rewind 1', category: 'energy', priority: 4, temporary: false, durationMinutes: null },
    { roleId: 'Stable Energy', category: 'energy', priority: 3, temporary: false, durationMinutes: null },
    { roleId: 'Worn-out', category: 'energy', priority: 2, temporary: false, durationMinutes: null },
    { roleId: 'Worn-out 2', category: 'energy', priority: 1, temporary: false, durationMinutes: null },

    { roleId: 'Come As One', category: 'activity', priority: 4, temporary: false, durationMinutes: null },
    { roleId: 'Little Helper', category: 'activity', priority: 3, temporary: false, durationMinutes: null },
    { roleId: 'Panovision', category: 'activity', priority: 2, temporary: false, durationMinutes: null },
    { roleId: 'Holding the team back', category: 'activity', priority: 1, temporary: false, durationMinutes: null },

    { roleId: 'Lunar Oracle', category: 'time', priority: 1, temporary: false, durationMinutes: null },
    { roleId: 'Praise the Sun', category: 'time', priority: 2, temporary: false, durationMinutes: null },
    { roleId: 'Two-Shift System', category: 'time', priority: 3, temporary: false, durationMinutes: null },

    { roleId: 'Lazy', category: 'chaos', priority: 1, temporary: true, durationMinutes: 60 },
    { roleId: 'Snooze Aficionado', category: 'chaos', priority: 1, temporary: true, durationMinutes: 60 },
    { roleId: 'Unplanned Production', category: 'chaos', priority: 1, temporary: true, durationMinutes: 60 },
  ];
}
