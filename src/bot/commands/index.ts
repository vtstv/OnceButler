import { Interaction, MessageFlags } from 'discord.js';
import { commands } from './definitions.js';
import { handleRolesCommand } from './roles.js';
import { handleStats, handleLeaderboard } from './stats.js';
import { handleTriggerCommand } from './triggers.js';
import { handleAchievements } from './achievements.js';
import { handleSettingsCommand } from './settings.js';

export { commands };

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
