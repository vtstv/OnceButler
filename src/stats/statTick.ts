import { Client, GuildMember } from 'discord.js';
import { getMemberStats, upsertMemberStats } from '../database/repositories/memberStatsRepo.js';
import { incrementVoiceTime, incrementOnlineTime, updateMemberProgress } from '../database/repositories/progressRepo.js';
import { getGuildRolePreset } from '../database/repositories/settingsRepo.js';
import { processTick, type StatModifiers } from './statEngine.js';
import { syncMemberRoles, clearExpiredChaosRole, checkAndGrantAchievements } from '../roles/roleEngine.js';
import { applyChaosEvent } from './chaosEngine.js';
import { isInVoice } from '../voice/voiceTracker.js';
import { cleanupExpiredTriggers } from '../database/repositories/triggersRepo.js';

let tickCount = 0;

export async function processGuildTick(client: Client): Promise<void> {
  tickCount++;

  if (tickCount % 10 === 0) {
    cleanupExpiredTriggers();
  }

  for (const guild of client.guilds.cache.values()) {
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
  const preset = getGuildRolePreset(member.guild.id);
  const inVoice = isInVoice(member);

  const modifiers: StatModifiers = {
    isIdle: member.presence?.status === 'idle',
    isAfk: member.voice?.selfMute === true || member.voice?.selfDeaf === true,
    isInVoice: inVoice,
  };

  processTick(stats, modifiers);
  clearExpiredChaosRole(stats);
  applyChaosEvent(stats, preset);
  upsertMemberStats(stats);

  incrementOnlineTime(member.guild.id, member.id, 1);
  if (inVoice) {
    incrementVoiceTime(member.guild.id, member.id, 1);
  }

  updateMemberProgress(member.guild.id, member.id, {
    peakMood: stats.mood,
    peakEnergy: stats.energy,
    peakActivity: stats.activity,
  });

  await checkAndGrantAchievements(member);
  await syncMemberRoles(member, stats);
}

function isOnline(member: GuildMember): boolean {
  const status = member.presence?.status;
  return status === 'online' || status === 'idle' || status === 'dnd';
}
