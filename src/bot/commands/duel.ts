// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Duel Command
// Licensed under MIT License

import { 
  ChatInputCommandInteraction, 
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ButtonInteraction,
} from 'discord.js';
import { getMemberStats, upsertMemberStats } from '../../database/repositories/memberStatsRepo.js';
import { t, type Locale } from '../../utils/i18n.js';
import { getLocale } from './utils.js';
import { randomInt } from '../../utils/random.js';

const DUEL_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const DUEL_TIMEOUT_MS = 60 * 1000; // 1 minute to accept
const MIN_ENERGY_TO_DUEL = 10;
const duelCooldowns = new Map<string, number>();

export async function handleDuel(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  
  if (!interaction.guild) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const opponent = interaction.options.getUser('opponent', true);
  const challenger = interaction.user;
  const guildId = interaction.guild.id;

  // Validation checks
  if (opponent.id === challenger.id) {
    await interaction.reply({ content: t(locale, 'duel.cantDuelSelf'), flags: MessageFlags.Ephemeral });
    return;
  }

  if (opponent.bot) {
    await interaction.reply({ content: t(locale, 'duel.cantDuelBot'), flags: MessageFlags.Ephemeral });
    return;
  }

  // Check cooldown
  const cooldownKey = `${guildId}:${challenger.id}`;
  const lastDuel = duelCooldowns.get(cooldownKey) ?? 0;
  const now = Date.now();
  
  if (now - lastDuel < DUEL_COOLDOWN_MS) {
    const remaining = Math.ceil((DUEL_COOLDOWN_MS - (now - lastDuel)) / 60000);
    await interaction.reply({ 
      content: t(locale, 'duel.cooldown', { minutes: remaining.toString() }), 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }

  // Check energy
  const challengerStats = getMemberStats(guildId, challenger.id);
  const opponentStats = getMemberStats(guildId, opponent.id);

  if (challengerStats.energy < MIN_ENERGY_TO_DUEL) {
    await interaction.reply({ 
      content: t(locale, 'duel.notEnoughEnergy', { required: MIN_ENERGY_TO_DUEL.toString() }), 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }

  // Calculate bet amount (10-30% of challenger's energy)
  const betAmount = Math.max(MIN_ENERGY_TO_DUEL, Math.floor(challengerStats.energy * (randomInt(10, 30) / 100)));

  // Create challenge message
  const challengeText = [
    `**⚔️ ${t(locale, 'duel.challengeTitle')}**`,
    '',
    t(locale, 'duel.challengeDesc', {
      challenger: challenger.displayName,
      opponent: opponent.displayName,
      bet: betAmount.toString()
    }),
    '',
    `├─ ${challenger.displayName}: ⚡ ${challengerStats.energy.toFixed(1)}`,
    `└─ ${opponent.displayName}: ⚡ ${opponentStats.energy.toFixed(1)}`,
    '',
    `-# ${t(locale, 'duel.expiresIn', { seconds: '60' })}`,
  ].join('\n');

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('duel_accept')
      .setLabel(t(locale, 'duel.accept'))
      .setStyle(ButtonStyle.Success)
      .setEmoji('⚔️'),
    new ButtonBuilder()
      .setCustomId('duel_decline')
      .setLabel(t(locale, 'duel.decline'))
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🏃')
  );

  const response = await interaction.reply({ 
    content: `<@${opponent.id}>\n\n${challengeText}`,
    components: [buttons],
    fetchReply: true
  });

  try {
    const buttonInteraction = await response.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i: ButtonInteraction) => i.user.id === opponent.id,
      time: DUEL_TIMEOUT_MS,
    });

    if (buttonInteraction.customId === 'duel_decline') {
      const declineText = [
        `**🏃 ${t(locale, 'duel.declinedTitle')}**`,
        '',
        t(locale, 'duel.declined', { opponent: opponent.displayName }),
      ].join('\n');
      
      await buttonInteraction.update({ content: declineText, components: [] });
      return;
    }

    // Opponent accepted - FIGHT!
    await buttonInteraction.deferUpdate();
    
    // Check opponent's energy
    const freshOpponentStats = getMemberStats(guildId, opponent.id);
    if (freshOpponentStats.energy < MIN_ENERGY_TO_DUEL) {
      const noEnergyText = t(locale, 'duel.opponentNoEnergy', { opponent: opponent.displayName });
      
      await interaction.editReply({ content: noEnergyText, components: [] });
      return;
    }

    // Execute duel
    const result = executeDuel(guildId, challenger.id, opponent.id, betAmount, locale);
    
    // Set cooldown for both
    duelCooldowns.set(cooldownKey, now);
    duelCooldowns.set(`${guildId}:${opponent.id}`, now);

    const winnerName = result.winnerId === challenger.id ? challenger.displayName : opponent.displayName;
    const loserName = result.winnerId === challenger.id ? opponent.displayName : challenger.displayName;

    const resultText = [
      `**⚔️ ${t(locale, 'duel.resultTitle')}**`,
      '',
      result.narrative,
      '',
      `🏆 **${winnerName}** +${result.prize} ⚡`,
      `💀 **${loserName}** -${result.loss} ⚡`,
    ].join('\n');

    await interaction.editReply({ content: resultText, components: [] });

  } catch (error) {
    // Timeout
    const timeoutText = [
      `**⏰ ${t(locale, 'duel.timeoutTitle')}**`,
      '',
      t(locale, 'duel.timeout', { opponent: opponent.displayName }),
    ].join('\n');
    
    await interaction.editReply({ content: timeoutText, components: [] });
  }
}

interface DuelResult {
  winnerId: string;
  loserId: string;
  prize: number;
  loss: number;
  narrative: string;
}

function executeDuel(
  guildId: string, 
  challengerId: string, 
  opponentId: string, 
  betAmount: number,
  locale: Locale
): DuelResult {
  const challengerStats = getMemberStats(guildId, challengerId);
  const opponentStats = getMemberStats(guildId, opponentId);

  // Calculate fight power (energy + mood bonus + random factor)
  const challengerPower = challengerStats.energy + (challengerStats.mood / 5) + randomInt(0, 30);
  const opponentPower = opponentStats.energy + (opponentStats.mood / 5) + randomInt(0, 30);

  const challengerWins = challengerPower > opponentPower;
  
  const winnerId = challengerWins ? challengerId : opponentId;
  const loserId = challengerWins ? opponentId : challengerId;
  const winnerStats = challengerWins ? challengerStats : opponentStats;
  const loserStats = challengerWins ? opponentStats : challengerStats;

  // Calculate actual loss (can't lose more than you have)
  const actualLoss = Math.min(loserStats.energy, betAmount);
  const prize = Math.floor(actualLoss * 0.8); // 80% goes to winner (20% "tax")

  // Update stats
  winnerStats.energy = Math.min(100, winnerStats.energy + prize);
  winnerStats.mood = Math.min(100, winnerStats.mood + randomInt(3, 8)); // Winner feels good
  
  loserStats.energy = Math.max(0, loserStats.energy - actualLoss);
  loserStats.mood = Math.max(0, loserStats.mood - randomInt(2, 5)); // Loser feels bad

  upsertMemberStats(winnerStats);
  upsertMemberStats(loserStats);

  // Pick random battle narrative
  const phraseIndex = randomInt(1, 8);
  const narrative = t(locale, `duel.battle${phraseIndex}`);

  return {
    winnerId,
    loserId,
    prize,
    loss: actualLoss,
    narrative,
  };
}
