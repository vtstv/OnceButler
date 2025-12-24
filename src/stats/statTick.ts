// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Stat Tick Processing
// Licensed under MIT License

import { Client, GuildMember } from 'discord.js';
import { getMemberStats, upsertMemberStats } from '../database/repositories/memberStatsRepo.js';
import { incrementVoiceTime, incrementOnlineTime, updateMemberProgress } from '../database/repositories/progressRepo.js';
import { getGuildSettings, isSetupComplete } from '../database/repositories/settingsRepo.js';
import { processTick, type StatModifiers, type StatRates } from './statEngine.js';
import { syncMemberRoles, clearExpiredChaosRole, checkAndGrantAchievements } from '../roles/roleEngine.js';
import { applyChaosEvent } from './chaosEngine.js';
import { isInVoice } from '../voice/voiceTracker.js';
import { cleanupExpiredTriggers } from '../database/repositories/triggersRepo.js';
import { handleVoiceXp } from '../bot/events/levelingEvents.js';

let tickCount = 0;

export async function processGuildTick(client: Client): Promise<void> {
  tickCount++;

  if (tickCount % 10 === 0) {
    cleanupExpiredTriggers();
  }

  for (const guild of client.guilds.cache.values()) {
    // Skip guilds that haven't completed setup
    if (!isSetupComplete(guild.id)) continue;

    const members = guild.members.cache.filter(m => !m.user.bot && isOnline(m));

    for (const member of members.values()) {
      try {
        await processMemberTick(member);
      } catch (err) {
        console.error(`Tick failed for ${member.user.tag}:`, err);
      }
    }
  }
}

async function processMemberTick(member: GuildMember): Promise<void> {
  const stats = getMemberStats(member.guild.id, member.id);
  const settings = getGuildSettings(member.guild.id);
  const inVoice = isInVoice(member);

  const modifiers: StatModifiers = {
    isIdle: member.presence?.status === 'idle',
    isAfk: member.voice?.selfMute === true || member.voice?.selfDeaf === true,
    isInVoice: inVoice,
  };

  const rates: StatRates = {
    gainMultiplier: settings.statGainMultiplier,
    drainMultiplier: settings.statDrainMultiplier,
  };

  processTick(stats, modifiers, rates);
  clearExpiredChaosRole(stats);
  
  // Only apply chaos events if enabled
  if (settings.enableChaosRoles) {
    applyChaosEvent(stats, settings.rolePreset);
  }
  
  upsertMemberStats(stats);

  incrementOnlineTime(member.guild.id, member.id, 1);
  if (inVoice) {
    incrementVoiceTime(member.guild.id, member.id, 1);
    // Award XP for voice time (every minute)
    await handleVoiceXp(member.guild.id, member.id, 1);
  }

  updateMemberProgress(member.guild.id, member.id, {
    peakMood: stats.mood,
    peakEnergy: stats.energy,
    peakActivity: stats.activity,
  });

  // Only check achievements if enabled
  if (settings.enableAchievements) {
    await checkAndGrantAchievements(member);
  }
  
  await syncMemberRoles(member, stats);
}

function isOnline(member: GuildMember): boolean {
  // If member is in voice channel, they're active regardless of presence status
  // This handles invisible users who are in voice
  if (member.voice?.channelId) {
    return true;
  }
  
  const status = member.presence?.status;
  return status === 'online' || status === 'idle' || status === 'dnd';
}
