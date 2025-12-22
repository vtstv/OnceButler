// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Achievements Command
// Licensed under MIT License

import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { getUserAchievements, ACHIEVEMENTS } from '../../database/repositories/achievementsRepo.js';
import { t } from '../../utils/i18n.js';
import { getLocale } from './utils.js';

// Map achievement IDs to locale keys
const achievementLocaleMap: Record<string, { name: string; desc: string }> = {
  'voice_10h': { name: 'achievements.voiceRookie', desc: 'achievements.voiceRookieDesc' },
  'voice_50h': { name: 'achievements.voiceRegular', desc: 'achievements.voiceRegularDesc' },
  'voice_100h': { name: 'achievements.voiceVeteran', desc: 'achievements.voiceVeteranDesc' },
  'mood_master': { name: 'achievements.moodMaster', desc: 'achievements.moodMasterDesc' },
  'energy_king': { name: 'achievements.energyKing', desc: 'achievements.energyKingDesc' },
  'hyperactive': { name: 'achievements.hyperactive', desc: 'achievements.hyperactiveDesc' },
};

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
    const localeKeys = achievementLocaleMap[a.id];
    const name = localeKeys ? t(locale, localeKeys.name) : a.name;
    const description = localeKeys ? t(locale, localeKeys.desc) : a.description;
    const reward = a.roleReward ? ` → 🏷️ ${a.roleReward}` : '';
    return `${icon} **${name}** — ${description}${reward}`;
  });

  const unlocked = userAchievements.length;
  const total = ACHIEVEMENTS.length;

  const content = [
    `**🏆 ${t(locale, 'achievements.title', { unlocked: unlocked.toString(), total: total.toString() })}**`,
    '',
    lines.join('\n'),
  ].join('\n');

  await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}
