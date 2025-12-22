// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Role Engine
// Licensed under MIT License

import { Guild, GuildMember, Role } from 'discord.js';
import { getMemberStats, upsertMemberStats, type MemberStats } from '../database/repositories/memberStatsRepo.js';
import { getMemberProgress } from '../database/repositories/progressRepo.js';
import { ACHIEVEMENTS, unlockAchievement, getUserAchievements } from '../database/repositories/achievementsRepo.js';
import { getGuildRolePreset, getGuildSettings, isSetupComplete } from '../database/repositories/settingsRepo.js';
import { env } from '../config/env.js';
import {
  calculateRoleAssignment,
  selectPriorityRoles,
  getMoodRoles,
  getEnergyRoles,
  getActivityRoles,
  getTimeRoles,
  getChaosRoles,
  getAllBotRoles,
} from './roleRules.js';
import { getAchievementNames } from './roleStore.js';

const ROLE_COLORS: Record<string, number> = {
  mood: 0xFFD700,
  energy: 0x00FF7F,
  activity: 0x1E90FF,
  time: 0x9370DB,
  chaos: 0xFF4500,
  achievement: 0xFFFFFF,
};

function getCategoryColor(roleName: string, preset: string): number {
  if (getMoodRoles(preset).includes(roleName)) return ROLE_COLORS.mood;
  if (getEnergyRoles(preset).includes(roleName)) return ROLE_COLORS.energy;
  if (getActivityRoles(preset).includes(roleName)) return ROLE_COLORS.activity;
  if (getTimeRoles(preset).includes(roleName)) return ROLE_COLORS.time;
  if (getChaosRoles(preset).includes(roleName)) return ROLE_COLORS.chaos;
  return ROLE_COLORS.achievement;
}

export async function syncMemberRoles(member: GuildMember, stats: MemberStats): Promise<void> {
  // Don't assign roles if setup is not complete
  if (!isSetupComplete(member.guild.id)) return;

  const now = Date.now();
  if (now - stats.lastRoleUpdate < env.roleUpdateCooldownMs) return;

  const settings = getGuildSettings(member.guild.id);
  const preset = settings.rolePreset;
  const assignment = calculateRoleAssignment(stats, preset);
  
  // Check if chaos roles are enabled
  const hasChaos = settings.enableChaosRoles && stats.chaosRole && stats.chaosExpires > now;
  
  const targetRoles = selectPriorityRoles(
    assignment,
    hasChaos ? stats.chaosRole : null,
    settings.maxRolesPerUser
  );

  const guild = member.guild;
  const allManagedRoles = getAllBotRoles(preset);
  const currentRoleNames = member.roles.cache
    .filter((r: Role) => allManagedRoles.includes(r.name))
    .map((r: Role) => r.name);

  const rolesToAdd = targetRoles.filter((name: string) => !currentRoleNames.includes(name));
  const rolesToRemove = currentRoleNames.filter((name: string) => !targetRoles.includes(name));

  if (rolesToAdd.length === 0 && rolesToRemove.length === 0) return;

  const addRoleObjects = rolesToAdd
    .map((name: string) => guild.roles.cache.find((r: Role) => r.name === name))
    .filter((r): r is Role => r !== undefined);

  const removeRoleObjects = rolesToRemove
    .map((name: string) => guild.roles.cache.find((r: Role) => r.name === name))
    .filter((r): r is Role => r !== undefined);

  try {
    if (removeRoleObjects.length > 0) {
      await member.roles.remove(removeRoleObjects);
    }
    if (addRoleObjects.length > 0) {
      await member.roles.add(addRoleObjects);
    }

    stats.lastRoleUpdate = now;
    upsertMemberStats(stats);
  } catch (err) {
    console.error(`Failed to sync roles for ${member.user.tag}:`, err);
  }
}

export async function ensureRolesExist(guild: Guild): Promise<void> {
  // Don't create roles if setup is not complete
  if (!isSetupComplete(guild.id)) return;

  const settings = getGuildSettings(guild.id);
  const preset = settings.rolePreset;
  const existingNames = guild.roles.cache.map((r: Role) => r.name);
  const allRoles = [...getAllBotRoles(preset)];
  
  // Add achievement roles only if achievements are enabled
  if (settings.enableAchievements) {
    allRoles.push(...getAchievementRolesForPreset(preset));
  }

  for (const roleName of allRoles) {
    if (!existingNames.includes(roleName)) {
      try {
        const roleOptions: { name: string; colors?: { primaryColor: number }; reason: string } = {
          name: roleName,
          reason: 'OnceButler role creation',
        };
        
        // Only add color if enabled in settings
        if (settings.enableRoleColors) {
          roleOptions.colors = { primaryColor: getCategoryColor(roleName, preset) };
        }
        
        await guild.roles.create(roleOptions as Parameters<typeof guild.roles.create>[0]);
        console.log(`Created role: ${roleName}`);
      } catch (err) {
        console.error(`Failed to create role ${roleName}:`, err);
      }
    }
  }
}

function getAchievementRolesForPreset(preset: string): string[] {
  const achNames = getAchievementNames(preset);
  return Object.values(achNames);
}

export async function checkAndGrantAchievements(member: GuildMember): Promise<void> {
  const preset = getGuildRolePreset(member.guild.id);
  const progress = getMemberProgress(member.guild.id, member.id);
  const stats = getMemberStats(member.guild.id, member.id);
  const currentAchievements = getUserAchievements(member.guild.id, member.id);
  const achNames = getAchievementNames(preset);

  for (const achievement of ACHIEVEMENTS) {
    if (currentAchievements.includes(achievement.id)) continue;

    let qualified = false;
    const req = achievement.requirement;

    switch (req.type) {
      case 'voice_hours':
        qualified = progress.voiceMinutes >= req.value * 60;
        break;
      case 'mood_streak':
        qualified = stats.mood >= req.value;
        break;
      case 'energy_max':
        qualified = stats.energy >= req.value;
        break;
      case 'activity_max':
        qualified = stats.activity >= req.value;
        break;
      case 'total_online_hours':
        qualified = progress.onlineMinutes >= req.value * 60;
        break;
    }

    if (qualified) {
      const unlocked = unlockAchievement(member.guild.id, member.id, achievement.id);
      if (unlocked && achievement.roleReward) {
        // Get localized role name from preset
        const roleRewardName = achNames[achievement.id as keyof typeof achNames] ?? achievement.roleReward;
        const role = member.guild.roles.cache.find((r: Role) => r.name === roleRewardName);
        if (role && !member.roles.cache.has(role.id)) {
          try {
            await member.roles.add(role);
            console.log(`Granted achievement role ${roleRewardName} to ${member.user.tag}`);
          } catch (err) {
            console.error(`Failed to grant achievement role:`, err);
          }
        }
      }
    }
  }
}

export function clearExpiredChaosRole(stats: MemberStats): boolean {
  if (stats.chaosRole && stats.chaosExpires <= Date.now()) {
    stats.chaosRole = null;
    stats.chaosExpires = 0;
    return true;
  }
  return false;
}

export function getAllManagedRoleNames(guildId: string): string[] {
  const preset = getGuildRolePreset(guildId);
  return [...getAllBotRoles(preset), ...getAchievementRolesForPreset(preset)];
}

export async function purgeAllRoles(guild: Guild): Promise<{ deleted: number; failed: number }> {
  const allRoleNames = getAllManagedRoleNames(guild.id);
  let deleted = 0;
  let failed = 0;

  for (const roleName of allRoleNames) {
    const role = guild.roles.cache.find((r: Role) => r.name === roleName);
    if (role) {
      try {
        await role.delete('OnceButler role purge');
        deleted++;
      } catch (err) {
        console.error(`Failed to delete role ${roleName}:`, err);
        failed++;
      }
    }
  }

  return { deleted, failed };
}

export function countManagedRoles(guild: Guild): number {
  const allRoleNames = getAllManagedRoleNames(guild.id);
  return guild.roles.cache.filter((r: Role) => allRoleNames.includes(r.name)).size;
}
