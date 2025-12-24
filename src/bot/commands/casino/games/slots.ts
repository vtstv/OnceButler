// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Slots Game
// Licensed under MIT License

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getWallet, addBalance, removeBalance, logTransaction } from '../../../../database/repositories/economyRepo.js';
import { t } from '../../../../utils/i18n.js';
import { GameSession, CURRENCY_EMOJI, SLOT_SYMBOLS, SLOT_PAYOUTS } from '../types.js';

export async function playSlots(interaction: any, session: GameSession, isRespin = false): Promise<void> {
  const { guildId, userId, bet, locale } = session;
  
  const wallet = getWallet(guildId, userId);
  if (wallet.balance < bet) {
    await interaction.reply({ content: t(locale, 'games.insufficientBalance'), flags: 64 });
    return;
  }

  removeBalance(guildId, userId, bet);

  const spinningEmbed = new EmbedBuilder()
    .setTitle('🎰 Slot Machine')
    .setDescription(
      `**Bet:** ${bet.toLocaleString()} ${CURRENCY_EMOJI}\n\n` +
      `┏━━━━━━━━━━━┓\n` +
      `┃ 🔄 │ 🔄 │ 🔄 ┃\n` +
      `┗━━━━━━━━━━━┛\n\n` +
      `*Spinning...*`
    )
    .setColor(0xF1C40F);

  if (isRespin) {
    await interaction.update({ embeds: [spinningEmbed], components: [] });
  } else {
    await interaction.update({ embeds: [spinningEmbed], components: [] });
  }

  await new Promise(resolve => setTimeout(resolve, 1500));

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

  const newWallet = getWallet(guildId, userId);
  const slotDisplay = `┏━━━━━━━━━━━┓\n┃ ${reels.join(' │ ')} ┃\n┗━━━━━━━━━━━┛`;

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'games.slots.title'))
    .setDescription(
      `${slotDisplay}\n\n` +
      (multiplier > 0 
        ? `${winType}\n${t(locale, 'games.slots.win', { amount: winnings.toLocaleString(), emoji: CURRENCY_EMOJI })}`
        : t(locale, 'games.slots.lose', { amount: bet.toLocaleString(), emoji: CURRENCY_EMOJI })) +
      `\n\n💰 **${t(locale, 'casino.balance')}:** ${newWallet.balance.toLocaleString()} ${CURRENCY_EMOJI}`
    )
    .setColor(multiplier > 0 ? 0x2ECC71 : 0xE74C3C);

  const spinButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('casino_slots_spin')
        .setLabel(`🎰 ${bet} ${CURRENCY_EMOJI}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(newWallet.balance < bet),
      new ButtonBuilder()
        .setCustomId('casino_replay_slots')
        .setLabel(t(locale, 'casino.selectBet'))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('casino_menu')
        .setLabel(t(locale, 'casino.casinoMenu'))
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [spinButton] });
}
