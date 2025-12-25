// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Stat Tick Processing
// Licensed under MIT License

import { Client, GuildMember } from 'discord.js';
import { getMemberStats, upsertMemberStats, getAllGuildMembers } from '../database/repositories/memberStatsRepo.js';
import { incrementVoiceTime, incrementOnlineTime, updateMemberProgress } from '../database/repositories/progressRepo.js';
import { getGuildSettings, isSetupComplete } from '../database/repositories/settingsRepo.js';
import { processTick, applyBaseDrain, type StatModifiers, type StatRates } from './statEngine.js';
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

    const settings = getGuildSettings(guild.id);
    const rates: StatRates = {
      gainMultiplier: settings.statGainMultiplier,
      drainMultiplier: settings.statDrainMultiplier,
    };

    // Process ONLINE members (full tick with gains)
    const onlineMembers = guild.members.cache.filter(m => !m.user.bot && isOnline(m));
    const onlineUserIds = new Set(onlineMembers.map(m => m.id));

    for (const member of onlineMembers.values()) {
      try {
        await processMemberTick(member);
      } catch (err) {
        console.error(`Tick failed for ${member.user.tag}:`, err);
      }
    }

    // Process OFFLINE members (drain only - stats decay when not active)
    const allDbMembers = getAllGuildMembers(guild.id);
    for (const stats of allDbMembers) {
      // Skip if already processed as online
      if (onlineUserIds.has(stats.userId)) continue;
      
      // Apply drain to offline members
      applyBaseDrain(stats, rates);
      clearExpiredChaosRole(stats);
      upsertMemberStats(stats);
    }
  }
}

async function processMemberTick(member: GuildMember): Promise<void> {
  const stats = getMemberStats(member.guild.id, member.id);
  const settings = getGuildSettings(member.guild.id);
  const inVoice = isInVoice(member);
  const presenceStatus = member.presence?.status;

  const modifiers: StatModifiers = {
    isIdle: presenceStatus === 'idle',
    isAfk: member.voice?.selfMute === true || member.voice?.selfDeaf === true,
    isInVoice: inVoice,
    isOnlinePresence: presenceStatus === 'online' || presenceStatus === 'idle' || presenceStatus === 'dnd',
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
