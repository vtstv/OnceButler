// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Leveling Commands
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { getGuildSettings } from '../../database/repositories/settingsRepo.js';
import { 
  getMemberLevel, 
  getLevelingLeaderboard, 
  getXpForLevel,
  setMemberLevel,
} from '../../database/repositories/levelingRepo.js';
import { t, Locale } from '../../utils/i18n.js';

export async function handleLeveling(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
    return;
  }

  const settings = getGuildSettings(interaction.guild.id);
  const locale = (settings.language || 'en') as Locale;
  
  if (!settings.enableLeveling) {
    await interaction.reply({ 
      content: '❌ Leveling system is disabled on this server. An admin can enable it in `/setup`.', 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'rank':
      await handleRank(interaction, locale);
      break;
    case 'leaderboard':
      await handleLevelLeaderboard(interaction, locale);
      break;
    case 'setlevel':
      await handleSetLevel(interaction, locale);
      break;
  }
}

async function handleRank(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const guildId = interaction.guild!.id;

  const levelData = getMemberLevel(guildId, targetUser.id);
  const xpNeeded = getXpForLevel(levelData.level + 1);
  const progressPercent = Math.floor((levelData.xp / xpNeeded) * 100);
  const progressBar = createProgressBar(progressPercent);

  const leaderboard = getLevelingLeaderboard(guildId, 100);
  const rank = leaderboard.findIndex(m => m.oderId === targetUser.id) + 1 || '?';

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${targetUser.displayName}'s Level`)
    .setThumbnail(targetUser.displayAvatarURL())
    .setColor(0x3498DB)
    .addFields(
      { name: '🏆 Rank', value: `#${rank}`, inline: true },
      { name: '📈 Level', value: `${levelData.level}`, inline: true },
      { name: '✨ Total XP', value: levelData.totalXp.toLocaleString(), inline: true },
      { name: '📊 Progress', value: `${progressBar}\n${levelData.xp}/${xpNeeded} XP (${progressPercent}%)`, inline: false },
      { name: '💬 Messages', value: levelData.messagesCount.toLocaleString(), inline: true },
      { name: '🎤 Voice Time', value: `${levelData.voiceMinutes} min`, inline: true },
    )
    .setFooter({ text: `Level ${levelData.level + 1} requires ${xpNeeded - levelData.xp} more XP` });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleLevelLeaderboard(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const guildId = interaction.guild!.id;
  const leaderboard = getLevelingLeaderboard(guildId, 10);

  if (leaderboard.length === 0) {
    await interaction.reply({ content: '📭 No leveling data yet!', flags: MessageFlags.Ephemeral });
    return;
  }

  const lines = await Promise.all(leaderboard.map(async (entry, index) => {
    const member = await interaction.guild!.members.fetch(entry.oderId).catch(() => null);
    const name = member?.displayName || 'Unknown User';
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    return `${medal} **${name}** — Level ${entry.level} (${entry.totalXp.toLocaleString()} XP)`;
  }));

  const embed = new EmbedBuilder()
    .setTitle('📊 Level Leaderboard')
    .setDescription(lines.join('\n'))
    .setColor(0xF1C40F)
    .setFooter({ text: `Top ${leaderboard.length} members by XP` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleSetLevel(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({ content: '❌ Only administrators can use this command.', flags: MessageFlags.Ephemeral });
    return;
  }

  const targetUser = interaction.options.getUser('user', true);
  const level = interaction.options.getInteger('level', true);

  if (level < 0 || level > 1000) {
    await interaction.reply({ content: '❌ Level must be between 0 and 1000.', flags: MessageFlags.Ephemeral });
    return;
  }

  setMemberLevel(interaction.guild!.id, targetUser.id, level);

  await interaction.reply({ 
    content: `✅ Set ${targetUser}'s level to **${level}**.`, 
    flags: MessageFlags.Ephemeral 
  });
}

function createProgressBar(percent: number, length = 10): string {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}
