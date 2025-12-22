// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Stat Engine
// Licensed under MIT License

import type { MemberStats } from '../database/repositories/memberStatsRepo.js';
import { getActiveTriggers } from '../database/repositories/triggersRepo.js';
import { clamp } from '../utils/random.js';
import { getCurrentHour, isNight, isDay, isEvening } from '../utils/time.js';

export interface StatModifiers {
  isIdle: boolean;
  isAfk: boolean;
  isInVoice: boolean;
}

function getActivityMultiplier(activity: number): number {
  if (activity >= 80) return 0.3;
  if (activity >= 60) return 0.5;
  if (activity >= 40) return 0.7;
  if (activity >= 20) return 0.85;
  return 1.0;
}

export function applyBaseDrain(stats: MemberStats): void {
  const multiplier = getActivityMultiplier(stats.activity);
  stats.energy = clamp(stats.energy - 1 * multiplier, 0, 100);
  stats.mood = clamp(stats.mood - 0.5 * multiplier, 0, 100);
  stats.activity = clamp(stats.activity - 0.3 * multiplier, 0, 100);
}

export function applyIdleModifiers(stats: MemberStats, modifiers: StatModifiers): void {
  if (modifiers.isIdle || modifiers.isAfk) {
    stats.energy = clamp(stats.energy - 1, 0, 100);
    stats.activity = clamp(stats.activity - 1, 0, 100);
  }
}

export function applyVoiceModifiers(stats: MemberStats, modifiers: StatModifiers): void {
  if (modifiers.isInVoice) {
    stats.mood = clamp(stats.mood + 0.5, 0, 100);
    stats.activity = clamp(stats.activity + 1.0, 0, 100); // Higher activity gain for voice participation
    stats.energy = clamp(stats.energy + 1.5, 0, 100); // Voice chat restores energy
  }
}

export function applyTimeOfDayEffects(stats: MemberStats): void {
  const hour = getCurrentHour();

  if (isNight(hour)) {
    stats.mood = clamp(stats.mood - 0.5, 0, 100);
    stats.energy = clamp(stats.energy + 0.5, 0, 100);
  } else if (isDay(hour)) {
    stats.mood = clamp(stats.mood + 0.3, 0, 100);
  } else if (isEvening(hour)) {
    stats.energy = clamp(stats.energy - 0.3, 0, 100);
  }
}

export function applyCustomTriggers(stats: MemberStats): void {
  const triggers = getActiveTriggers(stats.guildId);

  for (const trigger of triggers) {
    const current = stats[trigger.statType];
    stats[trigger.statType] = clamp(current + trigger.modifier, 0, 100);
  }
}

export function processTick(stats: MemberStats, modifiers: StatModifiers): void {
  applyBaseDrain(stats);
  applyIdleModifiers(stats, modifiers);
  applyVoiceModifiers(stats, modifiers);
  applyTimeOfDayEffects(stats);
  applyCustomTriggers(stats);
}
