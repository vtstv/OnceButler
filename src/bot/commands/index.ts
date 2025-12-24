// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler - Command handler
// Licensed under MIT License

import { Interaction, MessageFlags } from 'discord.js';
import { commands } from './definitions.js';
import { handleRolesCommand } from './roles.js';
import { handleStats, handleLeaderboard } from './stats.js';
import { handleTriggerCommand } from './triggers.js';
import { handleAchievements } from './achievements.js';
import { handleSettingsCommand } from './settings.js';
import { handleVersion } from './version.js';
import { handleSetup } from './setup.js';
import { handleHug } from './hug.js';
import { handleDuel } from './duel.js';
import { handleGiveaway, handleGiveawayButton } from './giveaway.js';
import { handleEconomy } from './economy.js';
import { handleGames, handleBlackjackButton } from './games.js';
import { handleCasino, handleCasinoInteraction, handleCasinoModal, handleBlackjackCasinoButton } from './casino.js';
import { handleLeveling } from './leveling.js';
import { handleReactionRoles } from './reactionRoles.js';
import { handleInventory } from './inventory.js';

export { commands };
export { handleGiveawayButton, handleBlackjackButton, handleCasinoInteraction, handleCasinoModal, handleBlackjackCasinoButton };

export async function handleInteraction(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  console.log(`[CMD] ${interaction.user.tag} (${interaction.user.id}) used /${interaction.commandName} in ${interaction.guild?.name ?? 'DM'}`);

  try {
    switch (interaction.commandName) {
      case 'roles':
        await handleRolesCommand(interaction);
        break;
      case 'stats':
        await handleStats(interaction);
        break;
      case 'leaderboard':
        await handleLeaderboard(interaction);
        break;
      case 'trigger':
        await handleTriggerCommand(interaction);
        break;
      case 'achievements':
        await handleAchievements(interaction);
        break;
      case 'settings':
        await handleSettingsCommand(interaction);
        break;
      case 'version':
        await handleVersion(interaction);
        break;
      case 'setup':
        await handleSetup(interaction);
        break;
      case 'hug':
        await handleHug(interaction);
        break;
      case 'duel':
        await handleDuel(interaction);
        break;
      case 'giveaway':
        await handleGiveaway(interaction);
        break;
      case 'economy':
        await handleEconomy(interaction);
        break;
      case 'games':
        await handleGames(interaction);
        break;
      case 'casino':
        await handleCasino(interaction);
        break;
      case 'level':
        await handleLeveling(interaction);
        break;
      case 'reactionroles':
        await handleReactionRoles(interaction);
        break;
      case 'inventory':
        await handleInventory(interaction);
        break;
    }
    console.log(`[CMD] /${interaction.commandName} completed successfully`);
  } catch (error) {
    console.error(`[CMD] /${interaction.commandName} failed:`, error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'An error occurred while processing your command.', flags: MessageFlags.Ephemeral });
      }
    } catch (replyError) {
      console.error('[CMD] Failed to send error reply:', replyError);
    }
  }
}
