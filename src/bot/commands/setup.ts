// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Setup Command
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { getGuildSettings } from '../../database/repositories/settingsRepo.js';
import { t } from '../../utils/i18n.js';
import { getLocale, hasAdminPermission } from './utils.js';
import { buildCategoryView, startCollector } from './setup/handlers/index.js';

export async function handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({ content: t('en', 'common.serverOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  if (!hasAdminPermission(interaction)) {
    const locale = getLocale(interaction);
    await interaction.reply({ content: t(locale, 'errors.adminOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const settings = getGuildSettings(interaction.guild.id);
  
  const message = await interaction.reply({ 
    ...buildCategoryView('main', settings, interaction.guild),
    flags: MessageFlags.Ephemeral,
    fetchReply: true 
  });

  await startCollector(message, interaction.user.id, interaction.guild.id);
}
