// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Slots Game
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

const SLOT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🎰'];
const SLOT_PAYOUTS: Record<string, number> = {
  '🍒': 2,
  '🍋': 3,
  '🍊': 4,
  '🍇': 5,
  '💎': 10,
  '7️⃣': 25,
  '🎰': 50,
};

export async function handleSlots(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const bet = interaction.options.getInteger('bet', true);
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

  const reels = [
    SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
    SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
    SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
  ];

  let multiplier = 0;
  let winType = '';

  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    multiplier = SLOT_PAYOUTS[reels[0]] || 5;
    winType = t(locale, 'games.slots.jackpot');
  } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
    multiplier = 1.5;
    winType = t(locale, 'games.slots.twoOfKind');
  }

  const winnings = Math.floor(bet * multiplier);
  if (winnings > 0) {
    addBalance(guildId, userId, winnings);
    logTransaction(guildId, userId, 'gamble', winnings - bet, 'Slots win');
  } else {
    logTransaction(guildId, userId, 'gamble', -bet, 'Slots loss');
  }

  const slotDisplay = `┏━━━━━━━━━━━┓\n┃ ${reels.join(' │ ')} ┃\n┗━━━━━━━━━━━┛`;

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'games.slots.title'))
    .setDescription(
      `${slotDisplay}\n\n` +
      (multiplier > 0 
        ? `${winType}\n${t(locale, 'games.slots.win', { amount: winnings.toLocaleString(), emoji: CURRENCY_EMOJI })}`
        : t(locale, 'games.slots.lose', { amount: bet.toLocaleString(), emoji: CURRENCY_EMOJI }))
    )
    .setColor(multiplier > 0 ? 0x2ECC71 : 0xE74C3C);

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
