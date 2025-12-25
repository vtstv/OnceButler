// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Dice Game
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import {
  getWallet,
  addBalance,
  removeBalance,
  logTransaction,
} from '../../../database/repositories/economyRepo.js';
import { t, Locale } from '../../../utils/i18n.js';
import { CURRENCY_EMOJI } from './types.js';

export async function handleDice(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const bet = interaction.options.getInteger('bet', true);
  const target = interaction.options.getInteger('target', true);
  const guildId = interaction.guild!.id;
  const userId = interaction.user.id;

  if (bet <= 0) {
    await interaction.reply({ content: t(locale, 'games.betPositive'), flags: MessageFlags.Ephemeral });
    return;
  }

  if (target < 2 || target > 12) {
    await interaction.reply({ content: t(locale, 'games.dice.invalidTarget'), flags: MessageFlags.Ephemeral });
    return;
  }

  const wallet = getWallet(guildId, userId);
  if (wallet.balance < bet) {
    await interaction.reply({ content: t(locale, 'games.insufficientBalance'), flags: MessageFlags.Ephemeral });
    return;
  }

  removeBalance(guildId, userId, bet);

  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  const total = die1 + die2;

  const diceEmojis: Record<number, string> = {
    1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅',
  };

  const won = total === target;
  const multiplier = won ? getDiceMultiplier(target) : 0;
  const winnings = won ? bet * multiplier : 0;

  if (winnings > 0) {
    addBalance(guildId, userId, winnings);
    logTransaction(guildId, userId, 'gamble', winnings - bet, 'Dice win');
  } else {
    logTransaction(guildId, userId, 'gamble', -bet, 'Dice loss');
  }

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'games.dice.title'))
    .setDescription(
      `${diceEmojis[die1]} ${diceEmojis[die2]} ${t(locale, 'games.dice.result', { total: total.toString() })}\n\n` +
      `${t(locale, 'games.dice.betOn', { target: target.toString() })}\n\n` +
      (won 
        ? t(locale, 'games.dice.win', { amount: winnings.toLocaleString(), emoji: CURRENCY_EMOJI, multiplier: multiplier.toString() })
        : t(locale, 'games.dice.lose', { amount: bet.toLocaleString(), emoji: CURRENCY_EMOJI }))
    )
    .setColor(won ? 0x2ECC71 : 0xE74C3C);

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

function getDiceMultiplier(target: number): number {
  const odds: Record<number, number> = {
    2: 36, 3: 18, 4: 12, 5: 9, 6: 7.2, 7: 6,
    8: 7.2, 9: 9, 10: 12, 11: 18, 12: 36,
  };
  return odds[target] || 6;
}
