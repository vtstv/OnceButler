// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Mini-Games Commands
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { getGuildSettings } from '../../../database/repositories/settingsRepo.js';
import { t, Locale } from '../../../utils/i18n.js';
import { handleCoinflip } from './coinflip.js';
import { handleSlots } from './slots.js';
import { handleRoulette } from './roulette.js';
import { handleBlackjack, handleBlackjackButton } from './blackjack.js';
import { handleDice } from './dice.js';

export { handleBlackjackButton };

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
