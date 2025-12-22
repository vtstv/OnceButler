// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Stats Command
// Licensed under MIT License

import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
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

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'stats.title', { user: interaction.user.displayName }))
    .setColor(0x5865F2)
    .addFields(
      { name: `😊 ${t(locale, 'stats.mood')}`, value: `${moodBar} ${stats.mood.toFixed(1)}`, inline: false },
      { name: `⚡ ${t(locale, 'stats.energy')}`, value: `${energyBar} ${stats.energy.toFixed(1)}`, inline: false },
      { name: `🎯 ${t(locale, 'stats.activity')}`, value: `${activityBar} ${stats.activity.toFixed(1)}`, inline: false },
      { name: `🎤 ${t(locale, 'stats.voiceTime')}`, value: `${Math.floor(progress.voiceMinutes / 60)}${t(locale, 'common.hours')} ${progress.voiceMinutes % 60}${t(locale, 'common.minutes')}`, inline: true },
      { name: `🟢 ${t(locale, 'stats.onlineTime')}`, value: `${Math.floor(progress.onlineMinutes / 60)}${t(locale, 'common.hours')} ${progress.onlineMinutes % 60}${t(locale, 'common.minutes')}`, inline: true },
    )
    .setTimestamp();

  if (stats.chaosRole && stats.chaosExpires > Date.now()) {
    const remaining = Math.ceil((stats.chaosExpires - Date.now()) / 60000);
    embed.addFields({ name: `🎲 ${t(locale, 'stats.chaosEffect')}`, value: `${stats.chaosRole} (${remaining}${t(locale, 'common.minutesShort')} ${t(locale, 'common.left')})`, inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
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
  const lines: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const member = interaction.guild.members.cache.get(s.userId);
    const name = member?.displayName ?? `User ${s.userId.slice(-4)}`;
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    lines.push(`${medal} **${name}** — ${s[stat].toFixed(1)}`);
  }

  const embed = new EmbedBuilder()
    .setTitle(`${statEmoji} ${statName} ${t(locale, 'leaderboard.title')}`)
    .setColor(0x5865F2)
    .setDescription(lines.join('\n'))
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
