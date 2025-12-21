import { join } from 'path';
import { env } from '../config/env.js';
import { readJson, writeJson } from '../utils/file.js';
import type { RoleDefinition, RoleStore } from './types.js';

let cachedRoles: RoleDefinition[] = [];
const rolesFilePath = (): string => join(env.dataPath, 'roles.json');

export function loadRoles(): RoleDefinition[] {
  const data = readJson<RoleStore>(rolesFilePath());
  cachedRoles = data?.roles ?? getDefaultRoles();
  return cachedRoles;
}

export function getRoles(): RoleDefinition[] {
  if (cachedRoles.length === 0) loadRoles();
  return cachedRoles;
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

export function getRolesByCategory(category: string): RoleDefinition[] {
  return getRoles().filter(r => r.category === category);
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
