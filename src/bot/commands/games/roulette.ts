// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Roulette Game
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

type RouletteChoice = 'red' | 'black' | 'green' | 'odd' | 'even' | 'low' | 'high';
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const ROULETTE_PAYOUTS: Record<RouletteChoice, number> = {
  red: 2,
  black: 2,
  green: 36,
  odd: 2,
  even: 2,
  low: 2,
  high: 2,
};

export async function handleRoulette(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const bet = interaction.options.getInteger('bet', true);
  const choice = interaction.options.getString('choice', true) as RouletteChoice;
  const guildId = interaction.guild!.id;
  const userId = interaction.user.id;

  if (bet <= 0) {
    await interaction.reply({ content: t(locale, 'games.betPositive'), flags: MessageFlags.Ephemeral });
    return;
  }

  const wallet = getWallet(guildId, userId);
  if (wallet.balance < bet) {
    await interaction.reply({ content: t(locale, 'games.insufficientBalance'), flags: MessageFlags.Ephemeral });
    return;
  }

  removeBalance(guildId, userId, bet);

  const result = Math.floor(Math.random() * 37);
  
  let won = false;
  if (choice === 'green') {
    won = result === 0;
  } else if (choice === 'red') {
    won = result !== 0 && RED_NUMBERS.includes(result);
  } else if (choice === 'black') {
    won = result !== 0 && !RED_NUMBERS.includes(result);
  } else if (choice === 'odd') {
    won = result !== 0 && result % 2 === 1;
  } else if (choice === 'even') {
    won = result !== 0 && result % 2 === 0;
  } else if (choice === 'low') {
    won = result >= 1 && result <= 18;
  } else if (choice === 'high') {
    won = result >= 19 && result <= 36;
  }

  const winnings = won ? bet * ROULETTE_PAYOUTS[choice] : 0;
  
  if (winnings > 0) {
    addBalance(guildId, userId, winnings);
    logTransaction(guildId, userId, 'gamble', winnings - bet, 'Roulette win');
  } else {
    logTransaction(guildId, userId, 'gamble', -bet, 'Roulette loss');
  }

  let resultColor: string;
  let emoji: string;
  if (result === 0) {
    resultColor = t(locale, 'games.roulette.green');
    emoji = '💚';
  } else if (RED_NUMBERS.includes(result)) {
    resultColor = t(locale, 'games.roulette.red');
    emoji = '🔴';
  } else {
    resultColor = t(locale, 'games.roulette.black');
    emoji = '⚫';
  }

  const choiceLocalized = t(locale, `games.roulette.${choice}`);

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'games.roulette.title'))
    .setDescription(
      `${emoji} ${t(locale, 'games.roulette.result', { number: result.toString(), color: resultColor })}\n` +
      `${t(locale, 'games.roulette.yourBet', { choice: choiceLocalized })}\n\n` +
      (won 
        ? t(locale, 'games.roulette.win', { amount: winnings.toLocaleString(), emoji: CURRENCY_EMOJI })
        : t(locale, 'games.roulette.lose', { amount: bet.toLocaleString(), emoji: CURRENCY_EMOJI }))
    )
    .setColor(won ? 0x2ECC71 : 0xE74C3C);

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
