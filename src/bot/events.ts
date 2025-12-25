// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler - Discord event handlers
// Licensed under MIT License

import { Client, Events, GuildMember, MessageFlags } from 'discord.js';
import { handleVoiceStateUpdate } from '../voice/voiceTracker.js';
import { handleTempVoiceUpdate, initTempVoiceService } from '../voice/tempVoiceService.js';
import { startTickScheduler } from '../scheduler/tickScheduler.js';
import { ensureRolesExist } from '../roles/roleEngine.js';
import { handleInteraction, handleGiveawayButton, handleBlackjackButton, handleCasinoInteraction, handleCasinoModal, handleBlackjackCasinoButton } from './slashCommands.js';
import { getMemberStats, upsertMemberStats, boostActivityOnMessage } from '../database/repositories/memberStatsRepo.js';
import { chance, randomInt } from '../utils/random.js';
import { handleGuildMemberAdd, handleGuildMemberRemove } from './events/welcomeEvents.js';
import { handleReactionAdd, handleReactionRemove } from './events/reactionRolesEvents.js';
import { handleMessageXp } from './events/levelingEvents.js';
import { updateGuildSettings, getGuildSettings } from '../database/repositories/settingsRepo.js';

export function registerEvents(client: Client): void {
  client.once(Events.ClientReady, async (c) => {
    console.log(`Logged in as ${c.user.tag}`);

    // Initialize temp voice service
    initTempVoiceService();

    for (const guild of c.guilds.cache.values()) {
      await ensureRolesExist(guild);
    }

    startTickScheduler(client);
  });

  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    handleVoiceStateUpdate(oldState, newState);
    await handleTempVoiceUpdate(oldState, newState);
  });

  client.on(Events.GuildMemberAdd, async (member) => {
    handleMemberJoin(member);
    await handleGuildMemberAdd(member);
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    if (member.partial) return;
    await handleGuildMemberRemove(member);
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    
    // Boost activity on message (helps invisible users maintain stats)
    boostActivityOnMessage(message.guild.id, message.author.id, 2.0);
    
    await handleMessageXp(message);
  });

  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    await handleReactionAdd(reaction, user);
  });

  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    await handleReactionRemove(reaction, user);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('giveaway_')) {
        await handleGiveawayButton(interaction);
        return;
      }
      if (interaction.customId.startsWith('blackjack_')) {
        await handleBlackjackButton(interaction);
        return;
      }
      if (interaction.customId.startsWith('casino_blackjack_')) {
        await handleBlackjackCasinoButton(interaction);
        return;
      }
      if (interaction.customId.startsWith('casino_')) {
        await handleCasinoInteraction(interaction);
        return;
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('casino_')) {
        await handleCasinoInteraction(interaction);
        return;
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'casino_custom_bet_modal') {
        await handleCasinoModal(interaction);
        return;
      }
      if (interaction.customId === 'setup_giveaway_custom_winners_modal') {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          const winners = parseInt(interaction.fields.getTextInputValue('winners'));
          if (isNaN(winners) || winners < 1 || winners > 100) {
            await interaction.reply({ content: '❌ Please enter a number between 1 and 100.', flags: MessageFlags.Ephemeral });
            return;
          }
          updateGuildSettings(guildId, { giveawayMaxWinners: winners });
          await interaction.reply({ content: `✅ Max winners set to **${winners}**!`, flags: MessageFlags.Ephemeral });
        } catch (error) {
          console.error('[MODAL] Error handling giveaway winners modal:', error);
          if (!interaction.replied) {
            await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
          }
        }
        return;
      }
      if (interaction.customId.startsWith('setup_welcome_modal_')) {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          const isWelcome = interaction.customId === 'setup_welcome_modal_welcome';
          const message = interaction.fields.getTextInputValue('message');
          
          if (isWelcome) {
            updateGuildSettings(guildId, { welcomeMessage: message });
          } else {
            updateGuildSettings(guildId, { leaveMessage: message });
          }

          await interaction.reply({
            content: `✅ ${isWelcome ? 'Welcome' : 'Leave'} message updated!`,
            flags: MessageFlags.Ephemeral,
          });
        } catch (error) {
          console.error('[MODAL] Error handling welcome modal:', error);
          if (!interaction.replied) {
            await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
          }
        }
        return;
      }
      if (interaction.customId === 'setup_imagegen_api_modal') {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          const apiKey = interaction.fields.getTextInputValue('api_key');
          updateGuildSettings(guildId, { imageGenApiKey: apiKey });
          await interaction.reply({ content: '✅ API Key saved!', flags: MessageFlags.Ephemeral });
        } catch (error) {
          console.error('[MODAL] Error handling imagegen api modal:', error);
          if (!interaction.replied) {
            await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
          }
        }
        return;
      }
      if (interaction.customId === 'setup_imagegen_account_modal') {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          const accountId = interaction.fields.getTextInputValue('account_id');
          updateGuildSettings(guildId, { imageGenAccountId: accountId });
          await interaction.reply({ content: '✅ Account ID saved!', flags: MessageFlags.Ephemeral });
        } catch (error) {
          console.error('[MODAL] Error handling imagegen account modal:', error);
          if (!interaction.replied) {
            await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
          }
        }
        return;
      }
      if (interaction.customId === 'setup_tempvoice_name_modal') {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          const nameTemplate = interaction.fields.getTextInputValue('name_template');
          updateGuildSettings(guildId, { tempVoiceNameTemplate: nameTemplate });
          await interaction.reply({ content: '✅ Name template saved!', flags: MessageFlags.Ephemeral });
        } catch (error) {
          console.error('[MODAL] Error handling tempvoice name modal:', error);
          if (!interaction.replied) {
            await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
          }
        }
        return;
      }
    }

    await handleInteraction(interaction);
  });

  client.on(Events.GuildCreate, async (guild) => {
    await ensureRolesExist(guild);
  });
}

function handleMemberJoin(member: GuildMember): void {
  if (member.user.bot) return;

  const stats = getMemberStats(member.guild.id, member.id);

  if (chance(0.10)) stats.mood += 5;
  if (chance(0.05)) stats.energy -= 5;
  if (chance(0.01)) {
    const stat = ['mood', 'energy', 'activity'][randomInt(0, 2)] as 'mood' | 'energy' | 'activity';
    stats[stat] += randomInt(-10, 10);
  }

  stats.mood = Math.max(0, Math.min(100, stats.mood));
  stats.energy = Math.max(0, Math.min(100, stats.energy));
  stats.activity = Math.max(0, Math.min(100, stats.activity));

  upsertMemberStats(stats);
}
