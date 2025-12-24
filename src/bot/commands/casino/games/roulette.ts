// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Roulette Game
// Licensed under MIT License

import { EmbedBuilder } from 'discord.js';
import { getWallet, addBalance, removeBalance, logTransaction } from '../../../../database/repositories/economyRepo.js';
import { t } from '../../../../utils/i18n.js';
import { GameSession, CURRENCY_EMOJI, RED_NUMBERS, ROULETTE_PAYOUTS } from '../types.js';
import { buildReplayButtons } from '../menuBuilder.js';

export async function playRoulette(interaction: any, session: GameSession): Promise<void> {
  const { guildId, userId, bet, choice, locale } = session;
  
  const wallet = getWallet(guildId, userId);
  if (wallet.balance < bet) {
    await interaction.reply({ content: t(locale, 'games.insufficientBalance'), flags: 64 });
    return;
  }

  removeBalance(guildId, userId, bet);

  const number = Math.floor(Math.random() * 37);
  let color: 'red' | 'black' | 'green';
  
  if (number === 0) {
    color = 'green';
  } else if (RED_NUMBERS.includes(number)) {
    color = 'red';
  } else {
    color = 'black';
  }

  let won = false;
  switch (choice) {
    case 'red': won = color === 'red'; break;
    case 'black': won = color === 'black'; break;
    case 'green': won = number === 0; break;
    case 'odd': won = number !== 0 && number % 2 === 1; break;
    case 'even': won = number !== 0 && number % 2 === 0; break;
    case 'low': won = number >= 1 && number <= 18; break;
    case 'high': won = number >= 19 && number <= 36; break;
  }

  const winnings = won ? bet * ROULETTE_PAYOUTS[choice!] : 0;
  if (winnings > 0) {
    addBalance(guildId, userId, winnings);
    logTransaction(guildId, userId, 'gamble', winnings - bet, 'Roulette win');
  } else {
    logTransaction(guildId, userId, 'gamble', -bet, 'Roulette loss');
  }

  const colorEmoji = color === 'red' ? '🔴' : color === 'black' ? '⚫' : '🟢';
  const colorLocalized = t(locale, `games.roulette.${color}`);
  const newWallet = getWallet(guildId, userId);

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'games.roulette.title'))
    .setDescription(
      `${t(locale, 'games.roulette.landed', { colorEmoji, number: number.toString(), color: colorLocalized })}\n\n` +
      `${t(locale, 'games.roulette.betOn', { choice: choice || '' })}\n\n` +
      (won 
        ? t(locale, 'games.roulette.win', { amount: winnings.toLocaleString(), emoji: CURRENCY_EMOJI })
        : t(locale, 'games.roulette.lose', { amount: bet.toLocaleString(), emoji: CURRENCY_EMOJI })) +
      `\n\n💰 **${t(locale, 'casino.balance')}:** ${newWallet.balance.toLocaleString()} ${CURRENCY_EMOJI}`
    )
    .setColor(won ? 0x2ECC71 : 0xE74C3C);

  const components = buildReplayButtons('roulette', locale);
  await interaction.update({ embeds: [embed], components });
}
