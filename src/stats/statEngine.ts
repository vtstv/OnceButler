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

export interface StatRates {
  gainMultiplier: number;
  drainMultiplier: number;
}

const DEFAULT_RATES: StatRates = {
  gainMultiplier: 1.0,
  drainMultiplier: 0.5,
};

function getActivityMultiplier(activity: number): number {
  if (activity >= 80) return 0.3;
  if (activity >= 60) return 0.5;
  if (activity >= 40) return 0.7;
  if (activity >= 20) return 0.85;
  return 1.0;
}

export function applyBaseDrain(stats: MemberStats, rates: StatRates = DEFAULT_RATES): void {
  const multiplier = getActivityMultiplier(stats.activity) * rates.drainMultiplier;
  stats.energy = clamp(stats.energy - 1 * multiplier, 0, 100);
  stats.mood = clamp(stats.mood - 0.5 * multiplier, 0, 100);
  stats.activity = clamp(stats.activity - 0.3 * multiplier, 0, 100);
}

export function applyIdleModifiers(stats: MemberStats, modifiers: StatModifiers, rates: StatRates = DEFAULT_RATES): void {
  if (modifiers.isIdle || modifiers.isAfk) {
    stats.energy = clamp(stats.energy - 1 * rates.drainMultiplier, 0, 100);
    stats.activity = clamp(stats.activity - 1 * rates.drainMultiplier, 0, 100);
  }
}

export function applyVoiceModifiers(stats: MemberStats, modifiers: StatModifiers, rates: StatRates = DEFAULT_RATES): void {
  if (modifiers.isInVoice) {
    stats.mood = clamp(stats.mood + 0.5 * rates.gainMultiplier, 0, 100);
    stats.activity = clamp(stats.activity + 1.0 * rates.gainMultiplier, 0, 100);
    stats.energy = clamp(stats.energy + 1.5 * rates.gainMultiplier, 0, 100);
  }
}

export function applyTimeOfDayEffects(stats: MemberStats, rates: StatRates = DEFAULT_RATES): void {
  const hour = getCurrentHour();

  if (isNight(hour)) {
    stats.mood = clamp(stats.mood - 0.5 * rates.drainMultiplier, 0, 100);
    stats.energy = clamp(stats.energy + 0.5 * rates.gainMultiplier, 0, 100);
  } else if (isDay(hour)) {
    stats.mood = clamp(stats.mood + 0.3 * rates.gainMultiplier, 0, 100);
  } else if (isEvening(hour)) {
    stats.energy = clamp(stats.energy - 0.3 * rates.drainMultiplier, 0, 100);
  }
}

export function applyCustomTriggers(stats: MemberStats): void {
  const triggers = getActiveTriggers(stats.guildId);

  for (const trigger of triggers) {
    const current = stats[trigger.statType];
    stats[trigger.statType] = clamp(current + trigger.modifier, 0, 100);
  }
}

export function processTick(stats: MemberStats, modifiers: StatModifiers, rates: StatRates = DEFAULT_RATES): void {
  applyBaseDrain(stats, rates);
  applyIdleModifiers(stats, modifiers, rates);
  applyVoiceModifiers(stats, modifiers, rates);
  applyTimeOfDayEffects(stats, rates);
  applyCustomTriggers(stats);
}
