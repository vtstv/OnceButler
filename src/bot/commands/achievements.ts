// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Achievements Command
// Licensed under MIT License

import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { getUserAchievements, ACHIEVEMENTS } from '../../database/repositories/achievementsRepo.js';
import { t } from '../../utils/i18n.js';
import { getLocale } from './utils.js';

export async function handleAchievements(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  if (!interaction.guild) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const userAchievements = getUserAchievements(interaction.guild.id, interaction.user.id);

  const lines = ACHIEVEMENTS.map(a => {
    const unlocked = userAchievements.includes(a.id);
    const icon = unlocked ? '✅' : '🔒';
    const reward = a.roleReward ? ` → 🏷️ ${a.roleReward}` : '';
    return `${icon} **${a.name}** — ${a.description}${reward}`;
  });

  const unlocked = userAchievements.length;
  const total = ACHIEVEMENTS.length;

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'achievements.title', { unlocked: unlocked.toString(), total: total.toString() }))
    .setColor(unlocked === total ? 0xFFD700 : 0x5865F2)
    .setDescription(lines.join('\n'))
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
