// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Dice Game
// Licensed under MIT License

import { EmbedBuilder } from 'discord.js';
import { getWallet, addBalance, removeBalance, logTransaction } from '../../../../database/repositories/economyRepo.js';
import { t } from '../../../../utils/i18n.js';
import { GameSession, CURRENCY_EMOJI, getDiceMultiplier } from '../types.js';
import { buildReplayButtons } from '../menuBuilder.js';

export async function playDice(interaction: any, session: GameSession): Promise<void> {
  const { guildId, userId, bet, target, locale } = session;
  
  const wallet = getWallet(guildId, userId);
  if (wallet.balance < bet) {
    await interaction.reply({ content: t(locale, 'games.insufficientBalance'), flags: 64 });
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
  const multiplier = won ? getDiceMultiplier(target!) : 0;
  const winnings = won ? bet * multiplier : 0;

  if (winnings > 0) {
    addBalance(guildId, userId, winnings);
    logTransaction(guildId, userId, 'gamble', winnings - bet, 'Dice win');
  } else {
    logTransaction(guildId, userId, 'gamble', -bet, 'Dice loss');
  }

  const newWallet = getWallet(guildId, userId);

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'games.dice.title'))
    .setDescription(
      `${diceEmojis[die1]} ${diceEmojis[die2]} ${t(locale, 'games.dice.result', { total: total.toString() })}\n\n` +
      `${t(locale, 'games.dice.betOn', { target: target!.toString() })}\n\n` +
      (won 
        ? t(locale, 'games.dice.win', { amount: winnings.toLocaleString(), emoji: CURRENCY_EMOJI, multiplier: multiplier.toString() })
        : t(locale, 'games.dice.lose', { amount: bet.toLocaleString(), emoji: CURRENCY_EMOJI })) +
      `\n\n💰 **${t(locale, 'casino.balance')}:** ${newWallet.balance.toLocaleString()} ${CURRENCY_EMOJI}`
    )
    .setColor(won ? 0x2ECC71 : 0xE74C3C);

  const components = buildReplayButtons('dice', locale);
  await interaction.update({ embeds: [embed], components });
}
