// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Role Rules
// Licensed under MIT License

import type { MemberStats } from '../database/repositories/memberStatsRepo.js';
import { getTimePeriod, type TimePeriod } from '../utils/time.js';
import { getMapping, getRoles } from './roleStore.js';
import type { RoleMapping } from './types.js';

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

export function getMoodRole(mood: number, mapping: RoleMapping): string | null {
  if (mood >= 80) return mapping.mood.high2;
  if (mood >= 60) return mapping.mood.high1;
  if (mood >= 40) return mapping.mood.mid;
  if (mood >= 20) return mapping.mood.low1;
  return mapping.mood.low2;
}

export function getEnergyRole(energy: number, mapping: RoleMapping): string | null {
  if (energy < 15) return mapping.energy.low2;
  if (energy < 30) return mapping.energy.low1;
  if (energy < 60) return mapping.energy.mid;
  if (energy < 80) return mapping.energy.high1;
  return mapping.energy.high2;
}

export function getActivityRole(activity: number, mapping: RoleMapping): string | null {
  if (activity >= 80) return mapping.activity.high;
  if (activity >= 60) return mapping.activity.mid1;
  if (activity >= 40) return mapping.activity.mid2;
  if (activity >= 20) return mapping.activity.mid3 ?? mapping.activity.mid2;
  return mapping.activity.low;
}

export function getTimeRole(mapping: RoleMapping, period: TimePeriod = getTimePeriod()): string {
  switch (period) {
    case 'night': return mapping.time.night;
    case 'day': return mapping.time.day;
    case 'evening': return mapping.time.evening;
  }
}

export function calculateRoleAssignment(stats: MemberStats, preset: string = 'en'): RoleAssignment {
  const mapping = getMapping(preset);
  return {
    mood: getMoodRole(stats.mood, mapping),
    energy: getEnergyRole(stats.energy, mapping),
    activity: getActivityRole(stats.activity, mapping),
    time: getTimeRole(mapping),
  };
}

function getRolePriority(role: string, category: string): number {
  if (category === 'chaos') return 100;
  if (category === 'mood') {
    if (role.includes('3') || role.includes('3')) return 50;
    if (role.includes('2') || role.includes('2')) return 40;
    return 30;
  }
  if (category === 'energy') {
    if (role.includes('2') || role.includes('2')) return 45;
    if (role.includes('1') || role.includes('1')) return 35;
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

export function getMoodRoles(preset: string = 'en'): string[] {
  const mapping = getMapping(preset);
  return [mapping.mood.high2, mapping.mood.high1, mapping.mood.mid, mapping.mood.low1, mapping.mood.low2];
}

export function getEnergyRoles(preset: string = 'en'): string[] {
  const mapping = getMapping(preset);
  return [mapping.energy.high2, mapping.energy.high1, mapping.energy.mid, mapping.energy.low1, mapping.energy.low2];
}

export function getActivityRoles(preset: string = 'en'): string[] {
  const mapping = getMapping(preset);
  return [mapping.activity.high, mapping.activity.mid1, mapping.activity.mid2, mapping.activity.low];
}

export function getTimeRoles(preset: string = 'en'): string[] {
  const mapping = getMapping(preset);
  return [mapping.time.night, mapping.time.day, mapping.time.evening];
}

export function getChaosRoles(preset: string = 'en'): string[] {
  const mapping = getMapping(preset);
  return mapping.chaos;
}

export function getAllBotRoles(preset: string = 'en'): string[] {
  return [
    ...getMoodRoles(preset),
    ...getEnergyRoles(preset),
    ...getActivityRoles(preset),
    ...getTimeRoles(preset),
    ...getChaosRoles(preset),
  ];
}

export function getRoleCategory(roleName: string, preset: string = 'en'): string | null {
  if (getMoodRoles(preset).includes(roleName)) return 'mood';
  if (getEnergyRoles(preset).includes(roleName)) return 'energy';
  if (getActivityRoles(preset).includes(roleName)) return 'activity';
  if (getTimeRoles(preset).includes(roleName)) return 'time';
  if (getChaosRoles(preset).includes(roleName)) return 'chaos';
  return null;
}
