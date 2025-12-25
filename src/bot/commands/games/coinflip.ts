// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Coinflip Game
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

export async function handleCoinflip(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const bet = interaction.options.getInteger('bet', true);
  const choice = interaction.options.getString('choice', true) as 'heads' | 'tails';
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

  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const won = result === choice;
  const winnings = won ? bet : -bet;

  if (won) {
    addBalance(guildId, userId, bet);
    logTransaction(guildId, userId, 'gamble', bet, 'Coinflip win');
  } else {
    removeBalance(guildId, userId, bet);
    logTransaction(guildId, userId, 'gamble', -bet, 'Coinflip loss');
  }

  const emoji = result === 'heads' ? '🪙' : '🌙';
  const choiceLocalized = t(locale, `games.coinflip.${choice}`);
  const resultLocalized = t(locale, `games.coinflip.${result}`);
  
  const embed = new EmbedBuilder()
    .setTitle(`${emoji} ${t(locale, 'games.coinflip.title')}`)
    .setDescription(
      `${t(locale, 'games.coinflip.result', { choice: choiceLocalized, result: resultLocalized })}\n\n` +
      (won 
        ? t(locale, 'games.coinflip.win', { amount: bet.toLocaleString(), emoji: CURRENCY_EMOJI })
        : t(locale, 'games.coinflip.lose', { amount: bet.toLocaleString(), emoji: CURRENCY_EMOJI }))
    )
    .setColor(won ? 0x2ECC71 : 0xE74C3C);

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
