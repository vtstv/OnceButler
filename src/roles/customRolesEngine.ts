// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Custom Role Rules Engine
// Licensed under MIT License

import { Guild, GuildMember } from 'discord.js';
import {
  getEnabledRulesForGuild,
  getRoleAssignment,
  createRoleAssignment,
  deleteRoleAssignmentByRule,
  getExpiredAssignments,
  deleteRoleAssignment,
  evaluateRule,
  type CustomRoleRule,
} from '../database/repositories/customRolesRepo.js';
import { getMemberStats } from '../database/repositories/memberStatsRepo.js';
import { getMemberProgress } from '../database/repositories/progressRepo.js';

/**
 * Evaluates and applies custom role rules for a guild member
 */
export async function evaluateCustomRolesForMember(guild: Guild, member: GuildMember): Promise<void> {
  if (member.user.bot) return;

  const rules = getEnabledRulesForGuild(guild.id);
  if (rules.length === 0) return;

  const stats = getMemberStats(guild.id, member.id);
  const progress = getMemberProgress(guild.id, member.id);

  for (const rule of rules) {
    try {
      await processRule(guild, member, rule, stats, progress);
    } catch (error) {
      console.error(`[CustomRoles] Error processing rule ${rule.id} for ${member.id}:`, error);
    }
  }
}

/**
 * Process a single rule for a member
 */
async function processRule(
  guild: Guild,
  member: GuildMember,
  rule: CustomRoleRule,
  stats: { mood: number; energy: number; activity: number },
  progress: { voiceMinutes: number; onlineMinutes: number }
): Promise<void> {
  // Get the stat value based on rule type
  let statValue: number;
  switch (rule.statType) {
    case 'mood':
      statValue = stats.mood;
      break;
    case 'energy':
      statValue = stats.energy;
      break;
    case 'activity':
      statValue = stats.activity;
      break;
    case 'voiceMinutes':
      statValue = progress.voiceMinutes;
      break;
    case 'onlineMinutes':
      statValue = progress.onlineMinutes;
      break;
    default:
      return;
  }

  const conditionMet = evaluateRule(rule, statValue);
  const existingAssignment = getRoleAssignment(guild.id, member.id, rule.id);
  const hasRole = member.roles.cache.has(rule.roleId);

  if (conditionMet && !existingAssignment) {
    // Condition met, no existing assignment -> add role
    await assignRole(guild, member, rule);
  } else if (!conditionMet && existingAssignment && !rule.isTemporary) {
    // Condition no longer met for permanent roles -> remove role
    await removeRole(guild, member, rule);
  }
  // For temporary roles, removal is handled by cleanupExpiredAssignments
}

/**
 * Assign a role to a member based on a rule
 */
async function assignRole(guild: Guild, member: GuildMember, rule: CustomRoleRule): Promise<void> {
  const role = guild.roles.cache.get(rule.roleId);
  if (!role) {
    console.warn(`[CustomRoles] Role ${rule.roleId} not found in guild ${guild.id}`);
    return;
  }

  // Check if bot can manage this role
  const botMember = guild.members.me;
  if (!botMember || role.position >= botMember.roles.highest.position) {
    console.warn(`[CustomRoles] Cannot assign role ${role.name} - insufficient permissions`);
    return;
  }

  // Calculate expiry time for temporary roles
  let expiresAt: Date | null = null;
  if (rule.isTemporary && rule.durationMinutes) {
    expiresAt = new Date(Date.now() + rule.durationMinutes * 60 * 1000);
  }

  try {
    await member.roles.add(role, `Custom rule: ${rule.statType} ${rule.operator} ${rule.value}`);
    createRoleAssignment(guild.id, member.id, rule.id, rule.roleId, expiresAt);
    console.log(`[CustomRoles] Assigned ${role.name} to ${member.user.tag}`);
  } catch (error) {
    console.error(`[CustomRoles] Failed to assign role ${role.name} to ${member.user.tag}:`, error);
  }
}

/**
 * Remove a role from a member based on a rule
 */
async function removeRole(guild: Guild, member: GuildMember, rule: CustomRoleRule): Promise<void> {
  const role = guild.roles.cache.get(rule.roleId);
  if (!role) return;

  const botMember = guild.members.me;
  if (!botMember || role.position >= botMember.roles.highest.position) {
    return;
  }

  try {
    if (member.roles.cache.has(rule.roleId)) {
      await member.roles.remove(role, `Custom rule condition no longer met`);
    }
    deleteRoleAssignmentByRule(guild.id, member.id, rule.id);
    console.log(`[CustomRoles] Removed ${role.name} from ${member.user.tag}`);
  } catch (error) {
    console.error(`[CustomRoles] Failed to remove role ${role.name} from ${member.user.tag}:`, error);
  }
}

/**
 * Clean up expired temporary role assignments
 */
export async function cleanupExpiredAssignments(guild: Guild): Promise<number> {
  const expired = getExpiredAssignments().filter((a: { guildId: string }) => a.guildId === guild.id);
  let cleaned = 0;

  for (const assignment of expired) {
    try {
      const member = await guild.members.fetch(assignment.userId).catch(() => null);
      const role = guild.roles.cache.get(assignment.roleId);

      if (member && role) {
        const botMember = guild.members.me;
        if (botMember && role.position < botMember.roles.highest.position) {
          await member.roles.remove(role, 'Temporary custom role expired');
        }
      }

      deleteRoleAssignment(assignment.id);
      cleaned++;
    } catch (error) {
      console.error(`[CustomRoles] Error cleaning expired assignment ${assignment.id}:`, error);
    }
  }

  return cleaned;
}

/**
 * Evaluate all members in a guild (useful for tick scheduler)
 */
export async function evaluateAllMembersInGuild(guild: Guild): Promise<void> {
  const rules = getEnabledRulesForGuild(guild.id);
  if (rules.length === 0) return;

  // Clean up expired assignments first
  await cleanupExpiredAssignments(guild);

  // Fetch all members (may be expensive for large guilds)
  try {
    const members = await guild.members.fetch();
    for (const member of members.values()) {
      if (!member.user.bot) {
        await evaluateCustomRolesForMember(guild, member);
      }
    }
  } catch (error) {
    console.error(`[CustomRoles] Error fetching members for ${guild.name}:`, error);
  }
}
