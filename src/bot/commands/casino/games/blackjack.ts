// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Blackjack Game
// Licensed under MIT License

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ButtonInteraction } from 'discord.js';
import { getWallet, addBalance, removeBalance, logTransaction } from '../../../../database/repositories/economyRepo.js';
import { t } from '../../../../utils/i18n.js';
import { GameSession, CURRENCY_EMOJI, CARD_VALUES, CARD_SUITS, CARD_RANKS, blackjackGames } from '../types.js';
import { buildReplayButtons } from '../menuBuilder.js';

function drawCard(): string {
  const rank = CARD_RANKS[Math.floor(Math.random() * CARD_RANKS.length)];
  const suit = CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)];
  return `${rank}${suit}`;
}

function getCardValue(card: string): number {
  const rank = card.replace(/[♠️♥️♦️♣️]/g, '');
  return CARD_VALUES[rank] || 10;
}

function calculateHand(cards: string[]): number {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    const value = getCardValue(card);
    total += value;
    if (card.startsWith('A')) aces++;
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

function formatHand(cards: string[], hideSecond = false): string {
  if (hideSecond && cards.length > 1) {
    return `${cards[0]} 🎴`;
  }
  return cards.join(' ');
}

export async function playBlackjack(interaction: any, session: GameSession): Promise<void> {
  const { guildId, userId, bet, locale } = session;
  const gameKey = `${guildId}_${userId}`;
  
  const wallet = getWallet(guildId, userId);
  if (wallet.balance < bet) {
    await interaction.reply({ content: t(locale, 'games.insufficientBalance'), flags: 64 });
    return;
  }

  if (blackjackGames.has(gameKey)) {
    await interaction.reply({ content: t(locale, 'games.blackjack.activeGame'), flags: 64 });
    return;
  }

  removeBalance(guildId, userId, bet);

  const playerCards = [drawCard(), drawCard()];
  const dealerCards = [drawCard(), drawCard()];

  const playerTotal = calculateHand(playerCards);

  if (playerTotal === 21) {
    const winnings = Math.floor(bet * 2.5);
    addBalance(guildId, userId, winnings);
    logTransaction(guildId, userId, 'gamble', winnings - bet, 'Blackjack win');

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'games.blackjack.title'))
      .setDescription(
        `**${t(locale, 'games.blackjack.yourHand')}:** ${formatHand(playerCards)} (${playerTotal})\n` +
        `**${t(locale, 'games.blackjack.dealerHand')}:** ${formatHand(dealerCards)} (${calculateHand(dealerCards)})\n\n` +
        t(locale, 'games.blackjack.blackjack', { amount: winnings.toLocaleString(), emoji: CURRENCY_EMOJI })
      )
      .setColor(0xF1C40F);

    const components = buildReplayButtons('blackjack', locale);
    await interaction.update({ embeds: [embed], components });
    return;
  }

  blackjackGames.set(gameKey, { bet, playerCards, dealerCards, guildId, userId, locale });

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'games.blackjack.title'))
    .setDescription(
      `**${t(locale, 'games.blackjack.yourHand')}:** ${formatHand(playerCards)} (${playerTotal})\n` +
      `**${t(locale, 'games.blackjack.dealerHand')}:** ${formatHand(dealerCards, true)}\n\n` +
      t(locale, 'games.blackjack.choose')
    )
    .setColor(0x3498DB)
    .setFooter({ text: t(locale, 'games.blackjack.bet', { amount: bet.toLocaleString(), emoji: CURRENCY_EMOJI }) });

  const buttons = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('casino_blackjack_hit')
        .setLabel(t(locale, 'games.blackjack.hit'))
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🃏'),
      new ButtonBuilder()
        .setCustomId('casino_blackjack_stand')
        .setLabel(t(locale, 'games.blackjack.stand'))
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✋'),
    );

  await interaction.update({ embeds: [embed], components: [buttons] });

  setTimeout(() => {
    if (blackjackGames.has(gameKey)) {
      blackjackGames.delete(gameKey);
      addBalance(guildId, userId, bet);
    }
  }, 60000);
}

export async function handleBlackjackCasinoButton(interaction: ButtonInteraction): Promise<void> {
  const guildId = interaction.guild!.id;
  const userId = interaction.user.id;
  const gameKey = `${guildId}_${userId}`;
  const action = interaction.customId.replace('casino_blackjack_', '');

  const game = blackjackGames.get(gameKey);
  if (!game) {
    await interaction.reply({ content: t('en', 'games.blackjack.expired'), flags: 64 });
    return;
  }

  const { bet, playerCards, dealerCards, locale } = game;

  if (action === 'hit') {
    playerCards.push(drawCard());
    const playerTotal = calculateHand(playerCards);

    if (playerTotal > 21) {
      blackjackGames.delete(gameKey);
      logTransaction(guildId, userId, 'gamble', -bet, 'Blackjack loss');
      
      const newWallet = getWallet(guildId, userId);

      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'games.blackjack.title'))
        .setDescription(
          `**${t(locale, 'games.blackjack.yourHand')}:** ${formatHand(playerCards)} (${playerTotal})\n` +
          `**${t(locale, 'games.blackjack.dealerHand')}:** ${formatHand(dealerCards)} (${calculateHand(dealerCards)})\n\n` +
          t(locale, 'games.blackjack.bust', { amount: bet.toLocaleString(), emoji: CURRENCY_EMOJI }) +
          `\n\n💰 **${t(locale, 'casino.balance')}:** ${newWallet.balance.toLocaleString()} ${CURRENCY_EMOJI}`
        )
        .setColor(0xE74C3C);

      const components = buildReplayButtons('blackjack', locale);
      await interaction.update({ embeds: [embed], components });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'games.blackjack.title'))
      .setDescription(
        `**${t(locale, 'games.blackjack.yourHand')}:** ${formatHand(playerCards)} (${playerTotal})\n` +
        `**${t(locale, 'games.blackjack.dealerHand')}:** ${formatHand(dealerCards, true)}\n\n` +
        t(locale, 'games.blackjack.choose')
      )
      .setColor(0x3498DB)
      .setFooter({ text: t(locale, 'games.blackjack.bet', { amount: bet.toLocaleString(), emoji: CURRENCY_EMOJI }) });

    const buttons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('casino_blackjack_hit')
          .setLabel(t(locale, 'games.blackjack.hit'))
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🃏'),
        new ButtonBuilder()
          .setCustomId('casino_blackjack_stand')
          .setLabel(t(locale, 'games.blackjack.stand'))
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('✋'),
      );

    await interaction.update({ embeds: [embed], components: [buttons] });
  } else if (action === 'stand') {
    blackjackGames.delete(gameKey);

    while (calculateHand(dealerCards) < 17) {
      dealerCards.push(drawCard());
    }

    const playerTotal = calculateHand(playerCards);
    const dealerTotal = calculateHand(dealerCards);

    let result: string;
    let winnings = 0;
    let color: number;

    if (dealerTotal > 21) {
      winnings = bet * 2;
      result = t(locale, 'games.blackjack.dealerBusts', { amount: winnings.toLocaleString(), emoji: CURRENCY_EMOJI });
      color = 0x2ECC71;
    } else if (playerTotal > dealerTotal) {
      winnings = bet * 2;
      result = t(locale, 'games.blackjack.win', { amount: winnings.toLocaleString(), emoji: CURRENCY_EMOJI });
      color = 0x2ECC71;
    } else if (playerTotal < dealerTotal) {
      result = t(locale, 'games.blackjack.lose', { amount: bet.toLocaleString(), emoji: CURRENCY_EMOJI });
      color = 0xE74C3C;
    } else {
      winnings = bet;
      result = t(locale, 'games.blackjack.push', { amount: bet.toLocaleString(), emoji: CURRENCY_EMOJI });
      color = 0xF1C40F;
    }

    if (winnings > 0) {
      addBalance(guildId, userId, winnings);
      if (winnings > bet) {
        logTransaction(guildId, userId, 'gamble', winnings - bet, 'Blackjack win');
      }
    } else {
      logTransaction(guildId, userId, 'gamble', -bet, 'Blackjack loss');
    }

    const newWallet = getWallet(guildId, userId);

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'games.blackjack.title'))
      .setDescription(
        `**${t(locale, 'games.blackjack.yourHand')}:** ${formatHand(playerCards)} (${playerTotal})\n` +
        `**${t(locale, 'games.blackjack.dealerHand')}:** ${formatHand(dealerCards)} (${dealerTotal})\n\n` +
        `${result}\n\n` +
        `💰 **${t(locale, 'casino.balance')}:** ${newWallet.balance.toLocaleString()} ${CURRENCY_EMOJI}`
      )
      .setColor(color);

    const components = buildReplayButtons('blackjack', locale);
    await interaction.update({ embeds: [embed], components });
  }
}
