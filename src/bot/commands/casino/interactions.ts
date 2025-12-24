// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Casino Interaction Handler
// Licensed under MIT License

import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';
import { getWallet } from '../../../database/repositories/economyRepo.js';
import { getGuildSettings } from '../../../database/repositories/settingsRepo.js';
import { t, Locale } from '../../../utils/i18n.js';
import { gameSessions, CURRENCY_EMOJI, getGameTitle } from './types.js';
import { buildCasinoMenu, buildCasinoComponents, buildBetSelection, buildGameOptions } from './menuBuilder.js';
import { playCoinflip, playSlots, playRoulette, playDice, playBlackjack } from './games/index.js';

async function playGame(interaction: ButtonInteraction | StringSelectMenuInteraction | any, session: any): Promise<void> {
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
              .setStyle(2)
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
          .setStyle(2)
      );
    
    await interaction.update({ embeds: [embed], components: [...options, backRow] });
  }
}
