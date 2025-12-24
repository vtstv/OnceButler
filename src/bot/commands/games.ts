// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Mini-Games Commands
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
} from '../../database/repositories/economyRepo.js';
import { getGuildSettings } from '../../database/repositories/settingsRepo.js';
import { t, Locale } from '../../utils/i18n.js';

const CURRENCY_EMOJI = '🪙';

export async function handleGames(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
    return;
  }

  const settings = getGuildSettings(interaction.guild.id);
  const locale = (settings.language || 'en') as Locale;
  
  if (!settings.enableEconomy) {
    await interaction.reply({ 
      content: t(locale, 'games.disabled'), 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'coinflip':
      await handleCoinflip(interaction, locale);
      break;
    case 'slots':
      await handleSlots(interaction, locale);
      break;
    case 'roulette':
      await handleRoulette(interaction, locale);
      break;
    case 'blackjack':
      await handleBlackjack(interaction, locale);
      break;
    case 'dice':
      await handleDice(interaction, locale);
      break;
  }
}

// ==================== COINFLIP ====================

async function handleCoinflip(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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

// ==================== SLOTS ====================

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

async function handleSlots(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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

// ==================== ROULETTE ====================

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

async function handleRoulette(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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

  const winnings = won ? bet * ROULETTE_PAYOUTS[choice] : 0;
  if (winnings > 0) {
    addBalance(guildId, userId, winnings);
    logTransaction(guildId, userId, 'gamble', winnings - bet, 'Roulette win');
  } else {
    logTransaction(guildId, userId, 'gamble', -bet, 'Roulette loss');
  }

  const colorEmoji = color === 'red' ? '🔴' : color === 'black' ? '⚫' : '🟢';
  const colorLocalized = t(locale, `games.roulette.${color}`);
  
  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'games.roulette.title'))
    .setDescription(
      `${t(locale, 'games.roulette.landed', { colorEmoji, number: number.toString(), color: colorLocalized })}\n\n` +
      `${t(locale, 'games.roulette.betOn', { choice })}\n\n` +
      (won 
        ? t(locale, 'games.roulette.win', { amount: winnings.toLocaleString(), emoji: CURRENCY_EMOJI })
        : t(locale, 'games.roulette.lose', { amount: bet.toLocaleString(), emoji: CURRENCY_EMOJI }))
    )
    .setColor(won ? 0x2ECC71 : 0xE74C3C);

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// ==================== BLACKJACK ====================

const CARD_VALUES: Record<string, number[]> = {
  'A': [1, 11], '2': [2], '3': [3], '4': [4], '5': [5], '6': [6], 
  '7': [7], '8': [8], '9': [9], '10': [10], 'J': [10], 'Q': [10], 'K': [10],
};
const CARD_SUITS = ['♠️', '♥️', '♦️', '♣️'];
const CARD_NAMES = Object.keys(CARD_VALUES);

interface BlackjackGame {
  bet: number;
  playerCards: string[];
  dealerCards: string[];
  guildId: string;
  userId: string;
  locale: Locale;
}

const activeGames = new Map<string, BlackjackGame>();

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

async function handleBlackjack(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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

// ==================== DICE ====================

async function handleDice(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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
