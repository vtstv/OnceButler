import { Guild, Role } from 'discord.js';
import { getRoles, saveRoles } from './roleStore.js';
import { getRoleCategory } from './roleRules.js';
import { getGuildRolePreset } from '../database/repositories/settingsRepo.js';
import type { RoleDefinition, RoleCategory } from './types.js';

export async function importRolesToGuild(guild: Guild): Promise<string[]> {
  const preset = getGuildRolePreset(guild.id);
  const roles = getRoles(preset);
  const created: string[] = [];
  const existingNames = guild.roles.cache.map((r: Role) => r.name);

  for (const def of roles) {
    if (!existingNames.includes(def.roleId)) {
      try {
        await guild.roles.create({
          name: def.roleId,
          reason: 'OnceButler role import',
        });
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
