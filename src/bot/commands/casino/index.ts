// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Casino Module
// Licensed under MIT License

import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { getWallet } from '../../../database/repositories/economyRepo.js';
import { getGuildSettings } from '../../../database/repositories/settingsRepo.js';
import { t, Locale } from '../../../utils/i18n.js';
import { buildCasinoMenu, buildCasinoComponents } from './menuBuilder.js';

export { handleCasinoInteraction, handleCasinoModal } from './interactions.js';
export { handleBlackjackCasinoButton } from './games/blackjack.js';

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
