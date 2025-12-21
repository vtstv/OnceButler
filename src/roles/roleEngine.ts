import { Guild, GuildMember, Role } from 'discord.js';
import { getMemberStats, upsertMemberStats, type MemberStats } from '../database/repositories/memberStatsRepo.js';
import { getMemberProgress } from '../database/repositories/progressRepo.js';
import { ACHIEVEMENTS, unlockAchievement, getUserAchievements, getAchievementRoles } from '../database/repositories/achievementsRepo.js';
import { env } from '../config/env.js';
import {
  calculateRoleAssignment,
  selectPriorityRoles,
  MOOD_ROLES,
  ENERGY_ROLES,
  ACTIVITY_ROLES,
  TIME_ROLES,
  CHAOS_ROLES,
} from './roleRules.js';

const MAX_ROLES_PER_USER = 2;
const ALL_MANAGED_ROLES = [...MOOD_ROLES, ...ENERGY_ROLES, ...ACTIVITY_ROLES, ...TIME_ROLES, ...CHAOS_ROLES];

const ROLE_COLORS: Record<string, number> = {
  mood: 0xFFD700,
  energy: 0x00FF7F,
  activity: 0x1E90FF,
  time: 0x9370DB,
  chaos: 0xFF4500,
  achievement: 0xFFFFFF,
};

function getCategoryColor(roleName: string): number {
  if (MOOD_ROLES.includes(roleName)) return ROLE_COLORS.mood;
  if (ENERGY_ROLES.includes(roleName)) return ROLE_COLORS.energy;
  if (ACTIVITY_ROLES.includes(roleName)) return ROLE_COLORS.activity;
  if (TIME_ROLES.includes(roleName)) return ROLE_COLORS.time;
  if (CHAOS_ROLES.includes(roleName)) return ROLE_COLORS.chaos;
  return ROLE_COLORS.achievement;
}

export async function syncMemberRoles(member: GuildMember, stats: MemberStats): Promise<void> {
  const now = Date.now();
  if (now - stats.lastRoleUpdate < env.roleUpdateCooldownMs) return;

  const assignment = calculateRoleAssignment(stats);
  const hasChaos = stats.chaosRole && stats.chaosExpires > now;
  
  const targetRoles = selectPriorityRoles(
    assignment,
    hasChaos ? stats.chaosRole : null,
    MAX_ROLES_PER_USER
  );

  const guild = member.guild;
  const currentRoleNames = member.roles.cache
    .filter(r => ALL_MANAGED_ROLES.includes(r.name))
    .map(r => r.name);

  const rolesToAdd = targetRoles.filter(name => !currentRoleNames.includes(name));
  const rolesToRemove = currentRoleNames.filter(name => !targetRoles.includes(name));

  if (rolesToAdd.length === 0 && rolesToRemove.length === 0) return;

  const addRoleObjects = rolesToAdd
    .map(name => guild.roles.cache.find(r => r.name === name))
    .filter((r): r is Role => r !== undefined);

  const removeRoleObjects = rolesToRemove
    .map(name => guild.roles.cache.find(r => r.name === name))
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
  const existingNames = guild.roles.cache.map(r => r.name);
  const allRoles = [...ALL_MANAGED_ROLES, ...getAchievementRoles()];

  for (const roleName of allRoles) {
    if (!existingNames.includes(roleName)) {
      try {
        await guild.roles.create({
          name: roleName,
          color: getCategoryColor(roleName),
          reason: 'OnceButler role creation',
        });
        console.log(`Created role: ${roleName}`);
      } catch (err) {
        console.error(`Failed to create role ${roleName}:`, err);
      }
    }
  }
}

export async function checkAndGrantAchievements(member: GuildMember): Promise<void> {
  const progress = getMemberProgress(member.guild.id, member.id);
  const stats = getMemberStats(member.guild.id, member.id);
  const currentAchievements = getUserAchievements(member.guild.id, member.id);

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
        const role = member.guild.roles.cache.find(r => r.name === achievement.roleReward);
        if (role && !member.roles.cache.has(role.id)) {
          try {
            await member.roles.add(role);
            console.log(`Granted achievement role ${achievement.roleReward} to ${member.user.tag}`);
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
