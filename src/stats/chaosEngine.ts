import type { MemberStats } from '../database/repositories/memberStatsRepo.js';
import { env } from '../config/env.js';
import { chance, pickRandom } from '../utils/random.js';
import { CHAOS_ROLES } from '../roles/roleRules.js';

export function applyChaosEvent(stats: MemberStats): void {
  const now = Date.now();

  if (now - stats.lastChaosEvent < env.chaosIntervalMs) return;
  if (!chance(env.chaosChance)) return;

  const chaosRole = pickRandom(CHAOS_ROLES);
  if (!chaosRole) return;

  stats.chaosRole = chaosRole;
  stats.chaosExpires = now + env.chaosDurationMs;
  stats.lastChaosEvent = now;
}
