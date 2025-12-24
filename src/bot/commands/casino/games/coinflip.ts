// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Coinflip Game
// Licensed under MIT License

import { EmbedBuilder } from 'discord.js';
import { getWallet, addBalance, removeBalance, logTransaction } from '../../../../database/repositories/economyRepo.js';
import { t } from '../../../../utils/i18n.js';
import { GameSession, CURRENCY_EMOJI } from '../types.js';
import { buildReplayButtons } from '../menuBuilder.js';

export async function playCoinflip(interaction: any, session: GameSession): Promise<void> {
  const { guildId, userId, bet, choice, locale } = session;
  
  const wallet = getWallet(guildId, userId);
  if (wallet.balance < bet) {
    await interaction.reply({ content: t(locale, 'games.insufficientBalance'), flags: 64 });
    return;
  }

  removeBalance(guildId, userId, bet);

  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const won = result === choice;
  const winnings = won ? bet * 2 : 0;

  if (won) {
    addBalance(guildId, userId, winnings);
    logTransaction(guildId, userId, 'gamble', bet, 'Coinflip win');
  } else {
    logTransaction(guildId, userId, 'gamble', -bet, 'Coinflip loss');
  }

  const emoji = result === 'heads' ? '🪙' : '🌙';
  const newWallet = getWallet(guildId, userId);
  const choiceLocalized = t(locale, `games.coinflip.${choice}`);
  const resultLocalized = t(locale, `games.coinflip.${result}`);

  const embed = new EmbedBuilder()
    .setTitle(`${emoji} ${t(locale, 'games.coinflip.title')}`)
    .setDescription(
      `${t(locale, 'games.coinflip.result', { choice: choiceLocalized, result: resultLocalized })}\n\n` +
      (won 
        ? t(locale, 'games.coinflip.win', { amount: winnings.toLocaleString(), emoji: CURRENCY_EMOJI })
        : t(locale, 'games.coinflip.lose', { amount: bet.toLocaleString(), emoji: CURRENCY_EMOJI })) +
      `\n\n💰 **${t(locale, 'casino.balance')}:** ${newWallet.balance.toLocaleString()} ${CURRENCY_EMOJI}`
    )
    .setColor(won ? 0x2ECC71 : 0xE74C3C);

  const components = buildReplayButtons('coinflip', locale);
  await interaction.update({ embeds: [embed], components });
}
