import { Client, Events, GuildMember } from 'discord.js';
import { handleVoiceStateUpdate } from '../voice/voiceTracker.js';
import { startTickScheduler } from '../scheduler/tickScheduler.js';
import { ensureRolesExist } from '../roles/roleEngine.js';
import { handleInteraction } from './slashCommands.js';
import { getMemberStats, upsertMemberStats } from '../database/repositories/memberStatsRepo.js';
import { chance, randomInt } from '../utils/random.js';

export function registerEvents(client: Client): void {
  client.once(Events.ClientReady, async (c) => {
    console.log(`Logged in as ${c.user.tag}`);

    for (const guild of c.guilds.cache.values()) {
      await ensureRolesExist(guild);
    }

    startTickScheduler(client);
  });

  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    handleVoiceStateUpdate(oldState, newState);
  });

  client.on(Events.GuildMemberAdd, (member) => {
    handleMemberJoin(member);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    await handleInteraction(interaction);
  });

  client.on(Events.GuildCreate, async (guild) => {
    await ensureRolesExist(guild);
  });
}

function handleMemberJoin(member: GuildMember): void {
  if (member.user.bot) return;

  const stats = getMemberStats(member.guild.id, member.id);

  if (chance(0.10)) stats.mood += 5;
  if (chance(0.05)) stats.energy -= 5;
  if (chance(0.01)) {
    const stat = ['mood', 'energy', 'activity'][randomInt(0, 2)] as 'mood' | 'energy' | 'activity';
    stats[stat] += randomInt(-10, 10);
  }

  stats.mood = Math.max(0, Math.min(100, stats.mood));
  stats.energy = Math.max(0, Math.min(100, stats.energy));
  stats.activity = Math.max(0, Math.min(100, stats.activity));

  upsertMemberStats(stats);
}
