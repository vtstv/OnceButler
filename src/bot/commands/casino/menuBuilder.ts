// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Casino Menu Builder
// Licensed under MIT License

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';
import { t, Locale } from '../../../utils/i18n.js';
import { CURRENCY_EMOJI, BET_PRESETS, getDiceMultiplier } from './types.js';

export function buildCasinoMenu(balance: number, locale: Locale): EmbedBuilder {
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

export function buildCasinoComponents(locale: Locale): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
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

export function buildBetSelection(game: string, balance: number, locale: Locale): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
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

export function buildGameOptions(game: string, locale: Locale): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
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

export function buildReplayButtons(game: string, locale: Locale): ActionRowBuilder<ButtonBuilder>[] {
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
