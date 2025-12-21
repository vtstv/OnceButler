import type { MemberStats } from '../database/repositories/memberStatsRepo.js';
import { getTimePeriod, type TimePeriod } from '../utils/time.js';

export interface RoleAssignment {
  mood: string | null;
  energy: string | null;
  activity: string | null;
  time: string;
}

interface RolePriority {
  role: string;
  priority: number;
}

export function getMoodRole(mood: number): string | null {
  if (mood >= 80) return 'Optimist 3';
  if (mood >= 60) return 'Optimist 2';
  if (mood >= 40) return 'Optimist 1';
  if (mood >= 20) return 'Feeling blue 1';
  return 'Feeling blue 2';
}

export function getEnergyRole(energy: number): string | null {
  if (energy < 15) return 'Worn-out 2';
  if (energy < 30) return 'Worn-out';
  if (energy < 60) return 'Stable Energy';
  if (energy < 80) return 'Power Rewind 1';
  return 'Power Rewind 2';
}

export function getActivityRole(activity: number): string | null {
  if (activity >= 80) return 'Come As One';
  if (activity >= 50) return 'Little Helper';
  if (activity >= 20) return 'Panovision';
  return 'Holding the team back';
}

export function getTimeRole(period: TimePeriod = getTimePeriod()): string {
  switch (period) {
    case 'night': return 'Lunar Oracle';
    case 'day': return 'Praise the Sun';
    case 'evening': return 'Two-Shift System';
  }
}

export function calculateRoleAssignment(stats: MemberStats): RoleAssignment {
  return {
    mood: getMoodRole(stats.mood),
    energy: getEnergyRole(stats.energy),
    activity: getActivityRole(stats.activity),
    time: getTimeRole(),
  };
}

function getRolePriority(role: string, category: string): number {
  if (category === 'chaos') return 100;
  if (category === 'mood') {
    if (role.includes('3')) return 50;
    if (role.includes('2')) return 40;
    return 30;
  }
  if (category === 'energy') {
    if (role.includes('2')) return 45;
    if (role.includes('1')) return 35;
    return 25;
  }
  if (category === 'activity') return 20;
  if (category === 'time') return 10;
  return 0;
}

export function selectPriorityRoles(
  assignment: RoleAssignment,
  chaosRole: string | null,
  maxRoles: number
): string[] {
  const candidates: RolePriority[] = [];

  if (assignment.mood) {
    candidates.push({ role: assignment.mood, priority: getRolePriority(assignment.mood, 'mood') });
  }
  if (assignment.energy) {
    candidates.push({ role: assignment.energy, priority: getRolePriority(assignment.energy, 'energy') });
  }
  if (assignment.activity) {
    candidates.push({ role: assignment.activity, priority: getRolePriority(assignment.activity, 'activity') });
  }
  if (assignment.time) {
    candidates.push({ role: assignment.time, priority: getRolePriority(assignment.time, 'time') });
  }
  if (chaosRole) {
    candidates.push({ role: chaosRole, priority: getRolePriority(chaosRole, 'chaos') });
  }

  candidates.sort((a, b) => b.priority - a.priority);

  const uniqueRoles = [...new Set(candidates.map(c => c.role))];
  return uniqueRoles.slice(0, maxRoles);
}

export const MOOD_ROLES = ['Optimist 3', 'Optimist 2', 'Optimist 1', 'Feeling blue 1', 'Feeling blue 2'];
export const ENERGY_ROLES = ['Power Rewind 2', 'Power Rewind 1', 'Stable Energy', 'Worn-out', 'Worn-out 2'];
export const ACTIVITY_ROLES = ['Come As One', 'Little Helper', 'Panovision', 'Holding the team back'];
export const TIME_ROLES = ['Lunar Oracle', 'Praise the Sun', 'Two-Shift System'];
export const CHAOS_ROLES = ['Worn-out', 'Lazy', 'Snooze Aficionado', 'Optimist 1', 'Unplanned Production'];

export function getRoleCategory(roleName: string): string | null {
  if (MOOD_ROLES.includes(roleName)) return 'mood';
  if (ENERGY_ROLES.includes(roleName)) return 'energy';
  if (ACTIVITY_ROLES.includes(roleName)) return 'activity';
  if (TIME_ROLES.includes(roleName)) return 'time';
  if (CHAOS_ROLES.includes(roleName)) return 'chaos';
  return null;
}
