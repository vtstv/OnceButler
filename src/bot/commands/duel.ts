// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Duel Command
// Licensed under MIT License

import { 
  ChatInputCommandInteraction, 
  EmbedBuilder, 
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ButtonInteraction,
} from 'discord.js';
import { getMemberStats, upsertMemberStats } from '../../database/repositories/memberStatsRepo.js';
import { getCombatStats, getEquippedItems } from '../../database/repositories/inventoryRepo.js';
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

  // Create challenge embed
  const challengeEmbed = new EmbedBuilder()
    .setColor(0xFF4500) // Orange-red for battle
    .setTitle(t(locale, 'duel.challengeTitle'))
    .setDescription(t(locale, 'duel.challengeDesc', {
      challenger: challenger.displayName,
      opponent: opponent.displayName,
      bet: betAmount.toString()
    }))
    .addFields(
      { name: challenger.displayName, value: `⚡ ${challengerStats.energy}`, inline: true },
      { name: opponent.displayName, value: `⚡ ${opponentStats.energy}`, inline: true }
    )
    .setFooter({ text: t(locale, 'duel.expiresIn', { seconds: '60' }) })
    .setTimestamp();

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
    content: `<@${opponent.id}>`,
    embeds: [challengeEmbed], 
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
      const declineEmbed = new EmbedBuilder()
        .setColor(0x808080)
        .setTitle(t(locale, 'duel.declinedTitle'))
        .setDescription(t(locale, 'duel.declined', { opponent: opponent.displayName }));
      
      await buttonInteraction.update({ embeds: [declineEmbed], components: [] });
      return;
    }

    // Opponent accepted - FIGHT!
    await buttonInteraction.deferUpdate();
    
    // Check opponent's energy
    const freshOpponentStats = getMemberStats(guildId, opponent.id);
    if (freshOpponentStats.energy < MIN_ENERGY_TO_DUEL) {
      const noEnergyEmbed = new EmbedBuilder()
        .setColor(0x808080)
        .setDescription(t(locale, 'duel.opponentNoEnergy', { opponent: opponent.displayName }));
      
      await interaction.editReply({ embeds: [noEnergyEmbed], components: [] });
      return;
    }

    // Execute duel
    const result = executeDuel(guildId, challenger.id, opponent.id, betAmount, locale);
    
    // Set cooldown for both
    duelCooldowns.set(cooldownKey, now);
    duelCooldowns.set(`${guildId}:${opponent.id}`, now);

    const resultEmbed = new EmbedBuilder()
      .setColor(result.winnerId === challenger.id ? 0x00FF00 : 0xFF0000)
      .setTitle(t(locale, 'duel.resultTitle'))
      .setDescription(result.narrative)
      .addFields(
        { 
          name: `🏆 ${result.winnerId === challenger.id ? challenger.displayName : opponent.displayName}`, 
          value: `+${result.prize} ⚡`, 
          inline: true 
        },
        { 
          name: `💀 ${result.winnerId === challenger.id ? opponent.displayName : challenger.displayName}`, 
          value: `-${result.loss} ⚡`, 
          inline: true 
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [resultEmbed], components: [] });

  } catch (error) {
    // Timeout
    const timeoutEmbed = new EmbedBuilder()
      .setColor(0x808080)
      .setTitle(t(locale, 'duel.timeoutTitle'))
      .setDescription(t(locale, 'duel.timeout', { opponent: opponent.displayName }));
    
    await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
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

  // Get equipped item bonuses
  const challengerCombat = getCombatStats(guildId, challengerId);
  const opponentCombat = getCombatStats(guildId, opponentId);

  // Calculate base power (energy + mood bonus)
  const challengerBasePower = challengerStats.energy + (challengerStats.mood / 5);
  const opponentBasePower = opponentStats.energy + (opponentStats.mood / 5);

  // Apply item bonuses: attack adds to power, defense reduces incoming damage
  const challengerAttack = challengerBasePower + challengerCombat.attackBonus;
  const opponentAttack = opponentBasePower + opponentCombat.attackBonus;

  // Calculate effective power after defense reduction
  const challengerEffectivePower = Math.max(1, challengerAttack - (opponentCombat.defenseBonus * 0.5));
  const opponentEffectivePower = Math.max(1, opponentAttack - (challengerCombat.defenseBonus * 0.5));

  // Check for critical hits
  const challengerCritRoll = randomInt(1, 100);
  const opponentCritRoll = randomInt(1, 100);
  const challengerCrit = challengerCritRoll <= challengerCombat.critChanceBonus;
  const opponentCrit = opponentCritRoll <= opponentCombat.critChanceBonus;

  // Apply crit multiplier and random factor
  const challengerPower = (challengerEffectivePower + randomInt(0, 30)) * (challengerCrit ? 1.5 : 1);
  const opponentPower = (opponentEffectivePower + randomInt(0, 30)) * (opponentCrit ? 1.5 : 1);

  const challengerWins = challengerPower > opponentPower;
  
  const winnerId = challengerWins ? challengerId : opponentId;
  const loserId = challengerWins ? opponentId : challengerId;
  const winnerStats = challengerWins ? challengerStats : opponentStats;
  const loserStats = challengerWins ? opponentStats : challengerStats;
  const winnerCrit = challengerWins ? challengerCrit : opponentCrit;
  const winnerCombat = challengerWins ? challengerCombat : opponentCombat;
  const loserCombat = challengerWins ? opponentCombat : challengerCombat;

  // Calculate actual loss (can't lose more than you have)
  const actualLoss = Math.min(loserStats.energy, betAmount);
  const prize = Math.floor(actualLoss * 0.8); // 80% goes to winner (20% "tax")

  // Health bonus affects how much energy winner keeps
  const healthBonusMultiplier = 1 + (winnerCombat.healthBonus / 100);
  const adjustedPrize = Math.floor(prize * healthBonusMultiplier);

  // Update stats
  winnerStats.energy = Math.min(100, winnerStats.energy + adjustedPrize);
  winnerStats.mood = Math.min(100, winnerStats.mood + randomInt(3, 8)); // Winner feels good
  
  loserStats.energy = Math.max(0, loserStats.energy - actualLoss);
  loserStats.mood = Math.max(0, loserStats.mood - randomInt(2, 5)); // Loser feels bad

  upsertMemberStats(winnerStats);
  upsertMemberStats(loserStats);

  // Build narrative with equipment info
  const phraseIndex = randomInt(1, 8);
  let narrative = t(locale, `duel.battle${phraseIndex}`);
  
  // Add crit info
  if (winnerCrit) {
    narrative += '\n\n💥 **CRITICAL HIT!**';
  }
  
  // Add equipment summary
  const winnerItems = getEquippedItems(guildId, winnerId);
  const loserItems = getEquippedItems(guildId, loserId);
  if (winnerItems.length > 0 || loserItems.length > 0) {
    narrative += '\n\n⚔️ **Equipment:**';
    if (winnerItems.length > 0) {
      narrative += `\n🏆 ${winnerItems.map(i => i.definition.name).join(', ')}`;
    }
    if (loserItems.length > 0) {
      narrative += `\n💀 ${loserItems.map(i => i.definition.name).join(', ')}`;
    }
  }

  return {
    winnerId,
    loserId,
    prize: adjustedPrize,
    loss: actualLoss,
    narrative,
  };
}
