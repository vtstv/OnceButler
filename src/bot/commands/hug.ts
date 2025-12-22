// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Hug Command (Mood Contagion)
// Licensed under MIT License

import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { getMemberStats, upsertMemberStats } from '../../database/repositories/memberStatsRepo.js';
import { t } from '../../utils/i18n.js';
import { getLocale } from './utils.js';
import { randomInt } from '../../utils/random.js';

const HUG_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const hugCooldowns = new Map<string, number>();

export async function handleHug(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  
  if (!interaction.guild) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const target = interaction.options.getUser('user', true);
  
  // Can't hug yourself
  if (target.id === interaction.user.id) {
    await interaction.reply({ content: t(locale, 'hug.cantHugSelf'), flags: MessageFlags.Ephemeral });
    return;
  }

  // Can't hug bots
  if (target.bot) {
    await interaction.reply({ content: t(locale, 'hug.cantHugBot'), flags: MessageFlags.Ephemeral });
    return;
  }

  // Check cooldown
  const cooldownKey = `${interaction.guild.id}:${interaction.user.id}`;
  const lastHug = hugCooldowns.get(cooldownKey) ?? 0;
  const now = Date.now();
  
  if (now - lastHug < HUG_COOLDOWN_MS) {
    const remaining = Math.ceil((HUG_COOLDOWN_MS - (now - lastHug)) / 1000);
    await interaction.reply({ 
      content: t(locale, 'hug.cooldown', { seconds: remaining.toString() }), 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }

  const guildId = interaction.guild.id;
  const huggerStats = getMemberStats(guildId, interaction.user.id);
  const targetStats = getMemberStats(guildId, target.id);

  // Calculate mood transfer (5-15 points based on hugger's mood)
  const moodBonus = Math.floor(huggerStats.mood / 10) + randomInt(5, 10);
  const energyCost = randomInt(3, 8);

  // Update stats
  const oldTargetMood = targetStats.mood;
  targetStats.mood = Math.min(100, targetStats.mood + moodBonus);
  huggerStats.energy = Math.max(0, huggerStats.energy - energyCost);
  
  // Small mood boost for hugger too (giving makes you happy)
  huggerStats.mood = Math.min(100, huggerStats.mood + randomInt(1, 3));

  upsertMemberStats(huggerStats);
  upsertMemberStats(targetStats);

  // Set cooldown
  hugCooldowns.set(cooldownKey, now);

  // Pick a random funny phrase
  const phraseIndex = randomInt(1, 10);
  const phrase = t(locale, `hug.phrase${phraseIndex}`, { 
    hugger: `<@${interaction.user.id}>`,
    target: `<@${target.id}>` 
  });

  const lines = [
    `**🫶 ${t(locale, 'hug.title')}**`,
    '',
    phrase,
    '',
    `└─ ${target.displayName}: 🌟 ${t(locale, 'hug.moodGained', { amount: moodBonus.toString() })} (${oldTargetMood.toFixed(1)} → ${targetStats.mood.toFixed(1)})`,
    `└─ ${interaction.user.displayName}: ⚡ ${t(locale, 'hug.energySpent', { amount: energyCost.toString() })}`,
  ];

  await interaction.reply({ content: lines.join('\n') });
}
