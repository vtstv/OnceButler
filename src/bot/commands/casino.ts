// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Casino Interactive Menu
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
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
const BET_PRESETS = [10, 50, 100, 500, 1000];

interface GameSession {
  game: string;
  bet: number;
  choice?: string;
  target?: number;
  guildId: string;
  userId: string;
  locale: Locale;
}

const gameSessions = new Map<string, GameSession>();

export async function handleCasino(interaction: ChatInputCommandInteraction): Promise<void> {
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

  const wallet = getWallet(interaction.guild.id, interaction.user.id);
  const embed = buildCasinoMenu(wallet.balance, locale);
  const components = buildCasinoComponents(locale);

  await interaction.reply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });
}

function buildCasinoMenu(balance: number, locale: Locale): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(t(locale, 'casino.title'))
    .setDescription(
      `${t(locale, 'casino.welcome')}\n\n` +
      `💰 **${t(locale, 'casino.balance')}:** ${balance.toLocaleString()} ${CURRENCY_EMOJI}`
    )
    .setColor(0x9B59B6)
    .addFields(
      { name: t(locale, 'casino.coinflip'), value: t(locale, 'casino.coinflipDesc'), inline: true },
      { name: t(locale, 'casino.slots'), value: t(locale, 'casino.slotsDesc'), inline: true },
      { name: t(locale, 'casino.roulette'), value: t(locale, 'casino.rouletteDesc'), inline: true },
      { name: t(locale, 'casino.blackjack'), value: t(locale, 'casino.blackjackDesc'), inline: true },
      { name: t(locale, 'casino.dice'), value: t(locale, 'casino.diceDesc'), inline: true },
    )
    .setFooter({ text: t(locale, 'casino.selectGame') });
}

function buildCasinoComponents(locale: Locale): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
  const gameSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('casino_game_select')
        .setPlaceholder('🎮 ' + t(locale, 'casino.selectGame'))
        .addOptions([
          { label: t(locale, 'casino.coinflip'), value: 'coinflip', description: t(locale, 'casino.coinflipDesc') },
          { label: t(locale, 'casino.slots'), value: 'slots', description: t(locale, 'casino.slotsDesc') },
          { label: t(locale, 'casino.roulette'), value: 'roulette', description: t(locale, 'casino.rouletteDesc') },
          { label: t(locale, 'casino.blackjack'), value: 'blackjack', description: t(locale, 'casino.blackjackDesc') },
          { label: t(locale, 'casino.dice'), value: 'dice', description: t(locale, 'casino.diceDesc') },
        ])
    );

  return [gameSelect];
}

function buildBetSelection(game: string, balance: number, locale: Locale): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
  const betRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      ...BET_PRESETS.filter(b => b <= balance).slice(0, 4).map(bet =>
        new ButtonBuilder()
          .setCustomId(`casino_bet_${bet}`)
          .setLabel(`${bet}`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🪙')
      ),
      new ButtonBuilder()
        .setCustomId('casino_bet_custom')
        .setLabel(t(locale, 'casino.custom'))
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✏️')
    );

  const quickBets = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('casino_bet_allin')
        .setLabel(t(locale, 'casino.allIn'))
        .setStyle(ButtonStyle.Danger)
        .setEmoji('💸'),
      new ButtonBuilder()
        .setCustomId('casino_bet_half')
        .setLabel(t(locale, 'casino.half'))
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('➗'),
      new ButtonBuilder()
        .setCustomId('casino_back')
        .setLabel(t(locale, 'casino.back'))
        .setStyle(ButtonStyle.Secondary)
    );

  return [betRow, quickBets];
}

function buildGameOptions(game: string, locale: Locale): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
  switch (game) {
    case 'coinflip':
      return [new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('casino_choice_heads')
            .setLabel('Heads')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🪙'),
          new ButtonBuilder()
            .setCustomId('casino_choice_tails')
            .setLabel('Tails')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🌙'),
        )];
    case 'roulette':
      return [
        new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder().setCustomId('casino_choice_red').setLabel('Red').setStyle(ButtonStyle.Danger).setEmoji('🔴'),
            new ButtonBuilder().setCustomId('casino_choice_black').setLabel('Black').setStyle(ButtonStyle.Secondary).setEmoji('⚫'),
            new ButtonBuilder().setCustomId('casino_choice_green').setLabel('Green').setStyle(ButtonStyle.Success).setEmoji('🟢'),
          ),
        new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder().setCustomId('casino_choice_odd').setLabel('Odd').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('casino_choice_even').setLabel('Even').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('casino_choice_low').setLabel('Low (1-18)').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('casino_choice_high').setLabel('High (19-36)').setStyle(ButtonStyle.Secondary),
          )
      ];
    case 'dice':
      return [new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('casino_dice_target')
            .setPlaceholder('Select target total (2-12)')
            .addOptions(
              Array.from({ length: 11 }, (_, i) => ({
                label: `${i + 2}`,
                value: `${i + 2}`,
                description: `Bet on total of ${i + 2} (${getDiceMultiplier(i + 2)}x payout)`,
              }))
            )
        )];
    default:
      return [];
  }
}

function getDiceMultiplier(target: number): number {
  const odds: Record<number, number> = {
    2: 36, 3: 18, 4: 12, 5: 9, 6: 7.2, 7: 6,
    8: 7.2, 9: 9, 10: 12, 11: 18, 12: 36,
  };
  return odds[target] || 6;
}

export async function handleCasinoInteraction(interaction: ButtonInteraction | StringSelectMenuInteraction): Promise<void> {
  const guildId = interaction.guild!.id;
  const userId = interaction.user.id;
  const sessionKey = `${guildId}_${userId}`;
  const settings = getGuildSettings(guildId);
  const locale = (settings.language || 'en') as Locale;
  const wallet = getWallet(guildId, userId);

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'casino_game_select') {
      const game = interaction.values[0];
      gameSessions.set(sessionKey, { game, bet: 0, guildId, userId, locale });
      
      const embed = new EmbedBuilder()
        .setTitle(getGameTitle(game))
        .setDescription(`${t(locale, 'casino.selectBet')}\n\n💰 **${t(locale, 'casino.balance')}:** ${wallet.balance.toLocaleString()} ${CURRENCY_EMOJI}`)
        .setColor(0x9B59B6);
      
      const components = buildBetSelection(game, wallet.balance, locale);
      await interaction.update({ embeds: [embed], components });
      return;
    }

    if (interaction.customId === 'casino_dice_target') {
      const session = gameSessions.get(sessionKey);
      if (!session) return;
      session.target = parseInt(interaction.values[0]);
      await playGame(interaction, session);
      return;
    }
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId === 'casino_back') {
      gameSessions.delete(sessionKey);
      const embed = buildCasinoMenu(wallet.balance, locale);
      const components = buildCasinoComponents(locale);
      await interaction.update({ embeds: [embed], components });
      return;
    }

    if (customId.startsWith('casino_bet_')) {
      const session = gameSessions.get(sessionKey);
      if (!session) return;

      const betType = customId.replace('casino_bet_', '');
      let bet: number;

      if (betType === 'custom') {
        const modal = new ModalBuilder()
          .setCustomId('casino_custom_bet_modal')
          .setTitle('Custom Bet Amount');
        
        const betInput = new TextInputBuilder()
          .setCustomId('bet_amount')
          .setLabel(`Enter bet amount (max: ${wallet.balance})`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Enter a number')
          .setRequired(true)
          .setMaxLength(10);
        
        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(betInput));
        await interaction.showModal(modal);
        return;
      } else if (betType === 'allin') {
        bet = wallet.balance;
      } else if (betType === 'half') {
        bet = Math.floor(wallet.balance / 2);
      } else {
        bet = parseInt(betType);
      }

      if (bet <= 0 || bet > wallet.balance) {
        await interaction.reply({ content: t(locale, 'games.insufficientBalance'), flags: MessageFlags.Ephemeral });
        return;
      }

      session.bet = bet;
      
      if (session.game === 'slots' || session.game === 'blackjack') {
        await playGame(interaction, session);
      } else {
        const embed = new EmbedBuilder()
          .setTitle(getGameTitle(session.game))
          .setDescription(`**${t(locale, 'casino.bet')}:** ${bet.toLocaleString()} ${CURRENCY_EMOJI}\n\n${t(locale, 'casino.makeChoice')}`)
          .setColor(0x9B59B6);
        
        const options = buildGameOptions(session.game, locale);
        const backRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('casino_back')
              .setLabel(t(locale, 'casino.cancel'))
              .setStyle(ButtonStyle.Secondary)
          );
        
        await interaction.update({ embeds: [embed], components: [...options, backRow] });
      }
      return;
    }

    if (customId.startsWith('casino_choice_')) {
      const session = gameSessions.get(sessionKey);
      if (!session) return;
      session.choice = customId.replace('casino_choice_', '');
      await playGame(interaction, session);
      return;
    }

    if (customId.startsWith('casino_replay_')) {
      const game = customId.replace('casino_replay_', '');
      gameSessions.set(sessionKey, { game, bet: 0, guildId, userId, locale });
      
      const newWallet = getWallet(guildId, userId);
      const embed = new EmbedBuilder()
        .setTitle(getGameTitle(game))
        .setDescription(`${t(locale, 'casino.selectBet')}\n\n💰 **${t(locale, 'casino.balance')}:** ${newWallet.balance.toLocaleString()} ${CURRENCY_EMOJI}`)
        .setColor(0x9B59B6);
      
      const components = buildBetSelection(game, newWallet.balance, locale);
      await interaction.update({ embeds: [embed], components });
      return;
    }

    if (customId === 'casino_menu') {
      gameSessions.delete(sessionKey);
      const newWallet = getWallet(guildId, userId);
      const embed = buildCasinoMenu(newWallet.balance, locale);
      const components = buildCasinoComponents(locale);
      await interaction.update({ embeds: [embed], components });
      return;
    }

    if (customId === 'casino_slots_spin') {
      const session = gameSessions.get(sessionKey);
      if (!session) return;
      await playSlots(interaction, session, true);
      return;
    }
  }
}

export async function handleCasinoModal(interaction: any): Promise<void> {
  if (interaction.customId !== 'casino_custom_bet_modal') return;

  const guildId = interaction.guild!.id;
  const userId = interaction.user.id;
  const sessionKey = `${guildId}_${userId}`;
  const session = gameSessions.get(sessionKey);
  
  if (!session) {
    await interaction.reply({ content: 'Session expired. Please start again.', flags: MessageFlags.Ephemeral });
    return;
  }

  const wallet = getWallet(guildId, userId);
  const betInput = interaction.fields.getTextInputValue('bet_amount');
  const bet = parseInt(betInput);

  if (isNaN(bet) || bet <= 0) {
    await interaction.reply({ content: '❌ Invalid bet amount!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (bet > wallet.balance) {
    await interaction.reply({ content: t(session.locale, 'games.insufficientBalance'), flags: MessageFlags.Ephemeral });
    return;
  }

  session.bet = bet;

  if (session.game === 'slots' || session.game === 'blackjack') {
    await interaction.deferUpdate();
    await playGame(interaction, session);
  } else {
    const embed = new EmbedBuilder()
      .setTitle(getGameTitle(session.game))
      .setDescription(`**${t(session.locale, 'casino.bet')}:** ${bet.toLocaleString()} ${CURRENCY_EMOJI}\n\n${t(session.locale, 'casino.makeChoice')}`)
      .setColor(0x9B59B6);
    
    const options = buildGameOptions(session.game, session.locale);
    const backRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('casino_back')
          .setLabel(t(session.locale, 'casino.cancel'))
          .setStyle(ButtonStyle.Secondary)
      );
    
    await interaction.update({ embeds: [embed], components: [...options, backRow] });
  }
}

function getGameTitle(game: string): string {
  const titles: Record<string, string> = {
    coinflip: '🪙 Coinflip',
    slots: '🎰 Slot Machine',
    roulette: '🎡 Roulette',
    blackjack: '🃏 Blackjack',
    dice: '🎲 Dice',
  };
  return titles[game] || 'Casino Game';
}

async function playGame(interaction: ButtonInteraction | StringSelectMenuInteraction | any, session: GameSession): Promise<void> {
  switch (session.game) {
    case 'coinflip':
      await playCoinflip(interaction, session);
      break;
    case 'slots':
      await playSlots(interaction, session);
      break;
    case 'roulette':
      await playRoulette(interaction, session);
      break;
    case 'blackjack':
      await playBlackjack(interaction, session);
      break;
    case 'dice':
      await playDice(interaction, session);
      break;
  }
}

async function playCoinflip(interaction: any, session: GameSession): Promise<void> {
  const { guildId, userId, bet, choice, locale } = session;
  
  const wallet = getWallet(guildId, userId);
  if (wallet.balance < bet) {
    await interaction.reply({ content: t(locale, 'games.insufficientBalance'), flags: MessageFlags.Ephemeral });
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

const SLOT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🎰'];
const SLOT_PAYOUTS: Record<string, number> = {
  '🍒': 2, '🍋': 3, '🍊': 4, '🍇': 5, '💎': 10, '7️⃣': 25, '🎰': 50,
};

async function playSlots(interaction: any, session: GameSession, isRespin = false): Promise<void> {
  const { guildId, userId, bet, locale } = session;
  
  const wallet = getWallet(guildId, userId);
  if (wallet.balance < bet) {
    await interaction.reply({ content: t(locale, 'games.insufficientBalance'), flags: MessageFlags.Ephemeral });
    return;
  }

  removeBalance(guildId, userId, bet);

  // Spinning animation
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

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const ROULETTE_PAYOUTS: Record<string, number> = {
  red: 2, black: 2, green: 36, odd: 2, even: 2, low: 2, high: 2,
};

async function playRoulette(interaction: any, session: GameSession): Promise<void> {
  const { guildId, userId, bet, choice, locale } = session;
  
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

async function playDice(interaction: any, session: GameSession): Promise<void> {
  const { guildId, userId, bet, target, locale } = session;
  
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

function buildReplayButtons(game: string, locale: Locale): ActionRowBuilder<ButtonBuilder>[] {
  return [new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`casino_replay_${game}`)
        .setLabel(t(locale, 'casino.playAgain'))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('casino_menu')
        .setLabel(t(locale, 'casino.casinoMenu'))
        .setStyle(ButtonStyle.Secondary),
    )];
}

// ==================== BLACKJACK ====================

interface BlackjackGame {
  bet: number;
  playerCards: string[];
  dealerCards: string[];
  guildId: string;
  userId: string;
  locale: Locale;
}

const blackjackGames = new Map<string, BlackjackGame>();
const CARD_VALUES: Record<string, number> = {
  'A': 11, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10,
};
const CARD_SUITS = ['♠️', '♥️', '♦️', '♣️'];
const CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

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

async function playBlackjack(interaction: any, session: GameSession): Promise<void> {
  const { guildId, userId, bet, locale } = session;
  const gameKey = `${guildId}_${userId}`;
  
  const wallet = getWallet(guildId, userId);
  if (wallet.balance < bet) {
    await interaction.reply({ content: t(locale, 'games.insufficientBalance'), flags: MessageFlags.Ephemeral });
    return;
  }

  if (blackjackGames.has(gameKey)) {
    await interaction.reply({ content: t(locale, 'games.blackjack.activeGame'), flags: MessageFlags.Ephemeral });
    return;
  }

  removeBalance(guildId, userId, bet);

  const playerCards = [drawCard(), drawCard()];
  const dealerCards = [drawCard(), drawCard()];

  const playerTotal = calculateHand(playerCards);

  // Check for natural blackjack
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

  // Timeout after 60 seconds
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
    await interaction.reply({ content: t('en', 'games.blackjack.expired'), flags: MessageFlags.Ephemeral });
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

    // Dealer draws until 17+
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
