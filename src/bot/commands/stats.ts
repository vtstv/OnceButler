// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Stats Command
// Licensed under MIT License

import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { getMemberStats, getAllGuildMembers } from '../../database/repositories/memberStatsRepo.js';
import { getMemberProgress } from '../../database/repositories/progressRepo.js';
import { t } from '../../utils/i18n.js';
import { getLocale, createProgressBar } from './utils.js';

export async function handleStats(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  // Use deferReply + editReply as workaround for ephemeral embed display issue
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const stats = getMemberStats(interaction.guild.id, interaction.user.id);
  const progress = getMemberProgress(interaction.guild.id, interaction.user.id);

  const moodBar = createProgressBar(stats.mood);
  const energyBar = createProgressBar(stats.energy);
  const activityBar = createProgressBar(stats.activity);

  const voiceHours = Math.floor(progress.voiceMinutes / 60);
  const voiceMins = progress.voiceMinutes % 60;
  const onlineHours = Math.floor(progress.onlineMinutes / 60);
  const onlineMins = progress.onlineMinutes % 60;

  const lines = [
    `**📊 ${t(locale, 'stats.title', { user: interaction.user.displayName })}**`,
    '',
    `😊 **${t(locale, 'stats.mood')}** ${moodBar} ${stats.mood.toFixed(1)}`,
    `⚡ **${t(locale, 'stats.energy')}** ${energyBar} ${stats.energy.toFixed(1)}`,
    `🎯 **${t(locale, 'stats.activity')}** ${activityBar} ${stats.activity.toFixed(1)}`,
    '',
    `🎤 ${t(locale, 'stats.voiceTime')}: ${voiceHours}${t(locale, 'common.hours')} ${voiceMins}${t(locale, 'common.minutes')}`,
    `🟢 ${t(locale, 'stats.onlineTime')}: ${onlineHours}${t(locale, 'common.hours')} ${onlineMins}${t(locale, 'common.minutes')}`,
  ];

  if (stats.chaosRole && stats.chaosExpires > Date.now()) {
    const remaining = Math.ceil((stats.chaosExpires - Date.now()) / 60000);
    lines.push('', `🎲 **${t(locale, 'stats.chaosEffect')}:** ${stats.chaosRole} (${remaining}${t(locale, 'common.minutesShort')} ${t(locale, 'common.left')})`);
  }

  await interaction.editReply({ content: lines.join('\n') });
}

export async function handleLeaderboard(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  if (!interaction.guild) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const stat = interaction.options.getString('stat', true) as 'mood' | 'energy' | 'activity';
  const allStats = getAllGuildMembers(interaction.guild.id);

  const sorted = allStats
    .sort((a, b) => b[stat] - a[stat])
    .slice(0, 10);

  if (sorted.length === 0) {
    await interaction.reply({ content: t(locale, 'leaderboard.noMembers'), flags: MessageFlags.Ephemeral });
    return;
  }

  const statEmoji = { mood: '😊', energy: '⚡', activity: '🎯' }[stat];
  const statName = t(locale, `stats.${stat}` as 'stats.mood' | 'stats.energy' | 'stats.activity');
  
  const header = `**${statEmoji} ${statName} ${t(locale, 'leaderboard.title')}**\n`;
  const entries: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const member = interaction.guild.members.cache.get(s.userId);
    const name = member?.displayName ?? `User ${s.userId.slice(-4)}`;
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    entries.push(`${medal} **${name}** — ${s[stat].toFixed(1)}`);
  }

  await interaction.reply({ content: header + entries.join('\n') });
}
