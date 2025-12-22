// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Role Importer
// Licensed under MIT License

import { Guild, Role } from 'discord.js';
import { getRoles, saveRoles } from './roleStore.js';
import { getRoleCategory } from './roleRules.js';
import { getGuildRolePreset, getGuildSettings } from '../database/repositories/settingsRepo.js';
import type { RoleDefinition, RoleCategory } from './types.js';
import {
  getMoodRoles,
  getEnergyRoles,
  getActivityRoles,
  getTimeRoles,
  getChaosRoles,
} from './roleRules.js';

const ROLE_COLORS: Record<string, number> = {
  mood: 0xFFD700,
  energy: 0x00FF7F,
  activity: 0x1E90FF,
  time: 0x9370DB,
  chaos: 0xFF4500,
};

function getCategoryColor(roleName: string, preset: string): number | undefined {
  if (getMoodRoles(preset).includes(roleName)) return ROLE_COLORS.mood;
  if (getEnergyRoles(preset).includes(roleName)) return ROLE_COLORS.energy;
  if (getActivityRoles(preset).includes(roleName)) return ROLE_COLORS.activity;
  if (getTimeRoles(preset).includes(roleName)) return ROLE_COLORS.time;
  if (getChaosRoles(preset).includes(roleName)) return ROLE_COLORS.chaos;
  return undefined;
}

export async function importRolesToGuild(guild: Guild): Promise<string[]> {
  const settings = getGuildSettings(guild.id);
  const preset = settings.rolePreset;
  const roles = getRoles(preset);
  const created: string[] = [];
  const existingNames = guild.roles.cache.map((r: Role) => r.name);

  for (const def of roles) {
    if (!existingNames.includes(def.roleId)) {
      try {
        const roleOptions: { name: string; colors?: { primaryColor: number }; reason: string } = {
          name: def.roleId,
          reason: 'OnceButler role import',
        };
        
        // Add color if enabled in settings
        if (settings.enableRoleColors) {
          const color = getCategoryColor(def.roleId, preset);
          if (color) {
            roleOptions.colors = { primaryColor: color };
          }
        }
        
        await guild.roles.create(roleOptions as Parameters<typeof guild.roles.create>[0]);
        created.push(def.roleId);
      } catch (err) {
        console.error(`Failed to import role ${def.roleId}:`, err);
      }
    }
  }

  return created;
}

export function exportRolesFromGuild(guild: Guild): RoleDefinition[] {
  const preset = getGuildRolePreset(guild.id);
  const existingDefs = getRoles(preset);
  const exported: RoleDefinition[] = [];

  for (const role of guild.roles.cache.values()) {
    const existing = existingDefs.find(d => d.roleId === role.name);
    if (existing) {
      exported.push(existing);
    } else {
      const category = getRoleCategory(role.name, preset);
      if (category) {
        exported.push({
          roleId: role.name,
          category: category as RoleCategory,
          priority: 1,
          temporary: false,
          durationMinutes: null,
        });
      }
    }
  }

  saveRoles(exported);
  return exported;
}
