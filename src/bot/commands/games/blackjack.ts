// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Blackjack Game
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import {
  getWallet,
  addBalance,
  removeBalance,
  logTransaction,
} from '../../../database/repositories/economyRepo.js';
import { t, Locale } from '../../../utils/i18n.js';
import { CURRENCY_EMOJI, activeGames } from './types.js';

const CARD_VALUES: Record<string, number[]> = {
  'A': [1, 11], '2': [2], '3': [3], '4': [4], '5': [5], '6': [6], 
  '7': [7], '8': [8], '9': [9], '10': [10], 'J': [10], 'Q': [10], 'K': [10],
};
const CARD_SUITS = ['♠️', '♥️', '♦️', '♣️'];
const CARD_NAMES = Object.keys(CARD_VALUES);

function drawCard(): string {
  const name = CARD_NAMES[Math.floor(Math.random() * CARD_NAMES.length)];
  const suit = CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)];
  return `${name}${suit}`;
}

function getCardValue(card: string): number[] {
  const name = card.replace(/[♠️♥️♦️♣️]/g, '');
  return CARD_VALUES[name] || [0];
}

function calculateHand(cards: string[]): number {
  let total = 0;
  let aces = 0;
  
  for (const card of cards) {
    const values = getCardValue(card);
    if (values.length === 2) {
      aces++;
      total += 11;
    } else {
      total += values[0];
    }
  }
  
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  
  return total;
}

function formatHand(cards: string[], hideSecond = false): string {
  if (hideSecond && cards.length >= 2) {
    return `${cards[0]} | 🂠`;
  }
  return cards.join(' | ');
}

export async function handleBlackjack(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const bet = interaction.options.getInteger('bet', true);
  const guildId = interaction.guild!.id;
  const userId = interaction.user.id;
  const gameKey = `${guildId}_${userId}`;

  if (bet <= 0) {
    await interaction.reply({ content: t(locale, 'games.betPositive'), flags: MessageFlags.Ephemeral });
    return;
  }

  const wallet = getWallet(guildId, userId);
  if (wallet.balance < bet) {
    await interaction.reply({ content: t(locale, 'games.insufficientBalance'), flags: MessageFlags.Ephemeral });
    return;
  }

  if (activeGames.has(gameKey)) {
    await interaction.reply({ content: t(locale, 'games.blackjack.activeGame'), flags: MessageFlags.Ephemeral });
    return;
  }

  removeBalance(guildId, userId, bet);

  const playerCards = [drawCard(), drawCard()];
  const dealerCards = [drawCard(), drawCard()];

  const playerTotal = calculateHand(playerCards);
  const dealerTotal = calculateHand(dealerCards);

  if (playerTotal === 21) {
    const winnings = Math.floor(bet * 2.5);
    addBalance(guildId, userId, winnings);
    logTransaction(guildId, userId, 'gamble', winnings - bet, 'Blackjack win');

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'games.blackjack.title'))
      .setDescription(
        `**${t(locale, 'games.blackjack.yourHand')}:** ${formatHand(playerCards)} (${playerTotal})\n` +
        `**${t(locale, 'games.blackjack.dealerHand')}:** ${formatHand(dealerCards)} (${dealerTotal})\n\n` +
        t(locale, 'games.blackjack.blackjack', { amount: winnings.toLocaleString(), emoji: CURRENCY_EMOJI })
      )
      .setColor(0xF1C40F);

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  activeGames.set(gameKey, { bet, playerCards, dealerCards, guildId, userId, locale });

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
        .setCustomId(`blackjack_hit_${gameKey}`)
        .setLabel(t(locale, 'games.blackjack.hit'))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`blackjack_stand_${gameKey}`)
        .setLabel(t(locale, 'games.blackjack.stand'))
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.reply({ embeds: [embed], components: [buttons], flags: MessageFlags.Ephemeral });

  setTimeout(() => {
    if (activeGames.has(gameKey)) {
      activeGames.delete(gameKey);
      addBalance(guildId, userId, bet);
    }
  }, 60000);
}

export async function handleBlackjackButton(interaction: any): Promise<void> {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('blackjack_')) return;

  const parts = interaction.customId.split('_');
  const action = parts[1];
  const gameKey = parts.slice(2).join('_');

  const game = activeGames.get(gameKey);
  if (!game) {
    await interaction.reply({ content: t('en' as Locale, 'games.blackjack.expired'), flags: MessageFlags.Ephemeral });
    return;
  }

  const locale = game.locale;

  if (action === 'hit') {
    game.playerCards.push(drawCard());
    const playerTotal = calculateHand(game.playerCards);

    if (playerTotal > 21) {
      activeGames.delete(gameKey);
      logTransaction(game.guildId, game.userId, 'gamble', -game.bet, 'Blackjack loss');

      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'games.blackjack.title'))
        .setDescription(
          `**${t(locale, 'games.blackjack.yourHand')}:** ${formatHand(game.playerCards)} (${playerTotal})\n` +
          `**${t(locale, 'games.blackjack.dealerHand')}:** ${formatHand(game.dealerCards)} (${calculateHand(game.dealerCards)})\n\n` +
          t(locale, 'games.blackjack.bust', { amount: game.bet.toLocaleString(), emoji: CURRENCY_EMOJI })
        )
        .setColor(0xE74C3C);

      await interaction.update({ embeds: [embed], components: [] });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'games.blackjack.title'))
      .setDescription(
        `**${t(locale, 'games.blackjack.yourHand')}:** ${formatHand(game.playerCards)} (${playerTotal})\n` +
        `**${t(locale, 'games.blackjack.dealerHand')}:** ${formatHand(game.dealerCards, true)}\n\n` +
        t(locale, 'games.blackjack.choose')
      )
      .setColor(0x3498DB)
      .setFooter({ text: t(locale, 'games.blackjack.bet', { amount: game.bet.toLocaleString(), emoji: CURRENCY_EMOJI }) });

    const buttons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`blackjack_hit_${gameKey}`)
          .setLabel(t(locale, 'games.blackjack.hit'))
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`blackjack_stand_${gameKey}`)
          .setLabel(t(locale, 'games.blackjack.stand'))
          .setStyle(ButtonStyle.Secondary),
      );

    await interaction.update({ embeds: [embed], components: [buttons] });
  } else if (action === 'stand') {
    activeGames.delete(gameKey);

    while (calculateHand(game.dealerCards) < 17) {
      game.dealerCards.push(drawCard());
    }

    const playerTotal = calculateHand(game.playerCards);
    const dealerTotal = calculateHand(game.dealerCards);

    let result: string;
    let winnings = 0;
    let color: number;

    if (dealerTotal > 21) {
      winnings = game.bet * 2;
      result = t(locale, 'games.blackjack.dealerBusts', { amount: winnings.toLocaleString(), emoji: CURRENCY_EMOJI });
      color = 0x2ECC71;
    } else if (playerTotal > dealerTotal) {
      winnings = game.bet * 2;
      result = t(locale, 'games.blackjack.win', { amount: winnings.toLocaleString(), emoji: CURRENCY_EMOJI });
      color = 0x2ECC71;
    } else if (playerTotal < dealerTotal) {
      result = t(locale, 'games.blackjack.lose', { amount: game.bet.toLocaleString(), emoji: CURRENCY_EMOJI });
      color = 0xE74C3C;
    } else {
      winnings = game.bet;
      result = t(locale, 'games.blackjack.push', { amount: game.bet.toLocaleString(), emoji: CURRENCY_EMOJI });
      color = 0xF1C40F;
    }

    if (winnings > 0) {
      addBalance(game.guildId, game.userId, winnings);
      if (winnings > game.bet) {
        logTransaction(game.guildId, game.userId, 'gamble', winnings - game.bet, 'Blackjack win');
      }
    } else {
      logTransaction(game.guildId, game.userId, 'gamble', -game.bet, 'Blackjack loss');
    }

    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'games.blackjack.title'))
      .setDescription(
        `**${t(locale, 'games.blackjack.yourHand')}:** ${formatHand(game.playerCards)} (${playerTotal})\n` +
        `**${t(locale, 'games.blackjack.dealerHand')}:** ${formatHand(game.dealerCards)} (${dealerTotal})\n\n` +
        result
      )
      .setColor(color);

    await interaction.update({ embeds: [embed], components: [] });
  }
}
