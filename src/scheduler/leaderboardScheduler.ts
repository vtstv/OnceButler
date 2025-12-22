// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Leaderboard Scheduler
// Licensed under MIT License

import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { getDb } from '../database/db.js';
import { getGuildSettings } from '../database/repositories/settingsRepo.js';
import { getAllGuildMembers } from '../database/repositories/memberStatsRepo.js';
import { t } from '../utils/i18n.js';

interface GuildLeaderboardState {
  lastPost: number;
}

const guildStates = new Map<string, GuildLeaderboardState>();

export async function processAutoLeaderboards(client: Client): Promise<void> {
  const db = getDb();
  
  // Get all guilds with auto-leaderboard enabled
  const guilds = db.prepare(`
    SELECT guildId, leaderboardChannelId, leaderboardIntervalMinutes 
    FROM guild_settings 
    WHERE enableAutoLeaderboard = 1 AND leaderboardChannelId IS NOT NULL
  `).all() as { guildId: string; leaderboardChannelId: string; leaderboardIntervalMinutes: number }[];

  const now = Date.now();

  for (const guildData of guilds) {
    const state = guildStates.get(guildData.guildId) ?? { lastPost: 0 };
    const intervalMs = guildData.leaderboardIntervalMinutes * 60 * 1000;

    if (now - state.lastPost < intervalMs) {
      continue; // Not time yet
    }

    try {
      const guild = client.guilds.cache.get(guildData.guildId);
      if (!guild) continue;

      const channel = guild.channels.cache.get(guildData.leaderboardChannelId) as TextChannel;
      if (!channel || !channel.isTextBased()) continue;

      await postLeaderboard(channel, guildData.guildId);
      
      state.lastPost = now;
      guildStates.set(guildData.guildId, state);
    } catch (err) {
      console.error(`[LEADERBOARD] Failed to post for guild ${guildData.guildId}:`, err);
    }
  }
}

async function postLeaderboard(channel: TextChannel, guildId: string): Promise<void> {
  const settings = getGuildSettings(guildId);
  const locale = settings.language as 'en' | 'ru' | 'de';
  const allStats = getAllGuildMembers(guildId);

  if (allStats.length === 0) return;

  // Sort by activity
  const sorted = allStats
    .sort((a, b) => b.activity - a.activity)
    .slice(0, 10);

  const lines: string[] = [];
  const medals = ['🥇', '🥈', '🥉'];

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const member = channel.guild.members.cache.get(s.userId);
    const name = member?.displayName ?? `User ${s.userId.slice(-4)}`;
    const rank = i < 3 ? medals[i] : `\`${i + 1}.\``;
    
    // Clean formatted line with proper spacing
    const activityStr = s.activity.toFixed(1).padStart(5);
    const moodStr = s.mood.toFixed(1).padStart(5);
    const energyStr = s.energy.toFixed(1).padStart(5);
    
    lines.push(`${rank} **${name}**`);
    lines.push(`    ╰ 🎯 \`${activityStr}\`  😊 \`${moodStr}\`  ⚡ \`${energyStr}\``);
  }

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${t(locale, 'leaderboard.autoTitle')}`)
    .setColor(0x5865F2)
    .setDescription(lines.join('\n'))
    .setFooter({ text: t(locale, 'leaderboard.autoFooter') })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}
