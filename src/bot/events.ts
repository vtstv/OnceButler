// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler - Discord event handlers
// Licensed under MIT License

import { Client, Events, GuildMember, MessageFlags } from 'discord.js';
import { handleVoiceStateUpdate } from '../voice/voiceTracker.js';
import { handleTempVoiceUpdate, initTempVoiceService } from '../voice/tempVoiceService.js';
import { startTickScheduler } from '../scheduler/tickScheduler.js';
import { startEventScheduler } from '../events/eventScheduler.js';
import { ensureRolesExist } from '../roles/roleEngine.js';
import { handleInteraction, handleGiveawayButton, handleBlackjackButton, handleCasinoInteraction, handleCasinoModal, handleBlackjackCasinoButton } from './slashCommands.js';
import { getMemberStats, upsertMemberStats, boostActivityOnMessage } from '../database/repositories/memberStatsRepo.js';
import { chance, randomInt } from '../utils/random.js';
import { handleGuildMemberAdd, handleGuildMemberRemove } from './events/welcomeEvents.js';
import { handleReactionAdd, handleReactionRemove } from './events/reactionRolesEvents.js';
import { handleMessageXp } from './events/levelingEvents.js';
import { updateGuildSettings, getGuildSettings } from '../database/repositories/settingsRepo.js';
import { handleAdminDM } from './adminCommands.js';
import { isBlacklisted } from '../database/repositories/blacklistRepo.js';

export function registerEvents(client: Client): void {
  client.once(Events.ClientReady, async (c) => {
    console.log(`Logged in as ${c.user.tag}`);

    initTempVoiceService();

    startTickScheduler(client);
    startEventScheduler(client);
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

    if (!message.guild) {
      handleAdminDM(client, message);
      return;
    }
    
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
      if (interaction.customId === 'setup_steamnews_gemini_modal') {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          const geminiKey = interaction.fields.getTextInputValue('gemini_key');
          updateGuildSettings(guildId, { steamNewsGeminiKey: geminiKey });
          await interaction.reply({ content: '✅ Gemini API Key saved!', flags: MessageFlags.Ephemeral });
        } catch (error) {
          console.error('[MODAL] Error handling steamnews gemini modal:', error);
          if (!interaction.replied) {
            await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
          }
        }
        return;
      }
      if (interaction.customId === 'setup_twitchdrops_apiurl_modal') {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          const apiUrl = interaction.fields.getTextInputValue('api_url');
          updateGuildSettings(guildId, { twitchDropsApiUrl: apiUrl });
          await interaction.reply({ content: '✅ Twitch Drops API URL saved!', flags: MessageFlags.Ephemeral });
        } catch (error) {
          console.error('[MODAL] Error handling twitchdrops apiurl modal:', error);
          if (!interaction.replied) {
            await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
          }
        }
        return;
      }
      if (interaction.customId === 'setup_twitchdrops_apikey_modal') {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          const apiKey = interaction.fields.getTextInputValue('api_key');
          updateGuildSettings(guildId, { twitchDropsApiKey: apiKey });
          await interaction.reply({ content: '✅ Twitch Drops API Key saved!', flags: MessageFlags.Ephemeral });
        } catch (error) {
          console.error('[MODAL] Error handling twitchdrops apikey modal:', error);
          if (!interaction.replied) {
            await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
          }
        }
        return;
      }
      if (interaction.customId === 'setup_ai_apikey_modal') {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          const apiKey = interaction.fields.getTextInputValue('api_key');
          updateGuildSettings(guildId, { aiApiKey: apiKey });
          await interaction.reply({ content: '✅ AI API Key saved!', flags: MessageFlags.Ephemeral });
        } catch (error) {
          console.error('[MODAL] Error handling AI api modal:', error);
          if (!interaction.replied) {
            await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
          }
        }
        return;
      }
      if (interaction.customId === 'setup_ai_accountid_modal') {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          const accountId = interaction.fields.getTextInputValue('account_id');
          updateGuildSettings(guildId, { aiAccountId: accountId });
          await interaction.reply({ content: '✅ Cloudflare Account ID saved!', flags: MessageFlags.Ephemeral });
        } catch (error) {
          console.error('[MODAL] Error handling AI account modal:', error);
          if (!interaction.replied) {
            await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
          }
        }
        return;
      }
      if (interaction.customId === 'setup_events_keep_old_modal') {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          
          const keepOldMessages = parseInt(interaction.fields.getTextInputValue('keep_old_messages'));
          
          if (isNaN(keepOldMessages) || keepOldMessages < 0 || keepOldMessages > 10) {
            await interaction.reply({ content: '❌ Please enter a number between 0 and 10.', flags: MessageFlags.Ephemeral });
            return;
          }
          
          updateGuildSettings(guildId, { eventNotificationsKeepOldMessages: keepOldMessages });
          
          let description: string;
          if (keepOldMessages === 0) {
            description = 'All old messages will be deleted immediately when a new event notification is posted.';
          } else if (keepOldMessages === 1) {
            description = 'The last message will be kept, older messages will be deleted.';
          } else {
            description = `The last ${keepOldMessages} messages will be kept, older messages will be deleted.`;
          }
          
          await interaction.reply({ 
            content: `✅ Keep old messages set to: **${keepOldMessages}**\n\n${description}`,
            flags: MessageFlags.Ephemeral 
          });
        } catch (error) {
          console.error('[MODAL] Error handling keep old messages modal:', error);
          if (!interaction.replied) {
            await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
          }
        }
        return;
      }
      if (interaction.customId.startsWith('setup_events_edit_name_modal_')) {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          
          const eventId = parseInt(interaction.customId.replace('setup_events_edit_name_modal_', ''));
          const newName = interaction.fields.getTextInputValue('event_name');
          
          const { updateEventNotification, getEventNotificationById } = await import('../database/repositories/eventNotificationsRepo.js');
          
          updateEventNotification(eventId, { eventName: newName });
          
          await interaction.reply({ 
            content: `✅ Event name updated to: **${newName}**`,
            flags: MessageFlags.Ephemeral 
          });
        } catch (error) {
          console.error('[MODAL] Error handling edit event name modal:', error);
          if (!interaction.replied) {
            await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
          }
        }
        return;
      }
      if (interaction.customId.startsWith('setup_events_edit_message_modal_')) {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          
          const eventId = parseInt(interaction.customId.replace('setup_events_edit_message_modal_', ''));
          const newMessage = interaction.fields.getTextInputValue('message');
          
          const { updateEventNotification } = await import('../database/repositories/eventNotificationsRepo.js');
          
          updateEventNotification(eventId, { messageTemplate: newMessage });
          
          await interaction.reply({ 
            content: `✅ Event message updated!`,
            flags: MessageFlags.Ephemeral 
          });
        } catch (error) {
          console.error('[MODAL] Error handling edit event message modal:', error);
          if (!interaction.replied) {
            await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
          }
        }
        return;
      }
      if (interaction.customId.startsWith('setup_events_edit_schedule_modal_')) {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          
          const eventId = parseInt(interaction.customId.replace('setup_events_edit_schedule_modal_', ''));
          const { updateEventNotification, getEventNotificationById } = await import('../database/repositories/eventNotificationsRepo.js');
          
          const event = getEventNotificationById(eventId);
          if (!event) {
            await interaction.reply({ content: '❌ Event not found.', flags: MessageFlags.Ephemeral });
            return;
          }
          
          // Check if it's interval-based or hourly
          if (event.schedule.intervalMinutes) {
            const intervalMinutes = parseInt(interaction.fields.getTextInputValue('interval_minutes'));
            
            if (isNaN(intervalMinutes) || intervalMinutes < 1) {
              await interaction.reply({ content: '❌ Please enter a valid interval (minimum 1 minute).', flags: MessageFlags.Ephemeral });
              return;
            }
            
            updateEventNotification(eventId, { 
              schedule: { intervalMinutes, timezone: 'GMT' }
            });
            
            await interaction.reply({ 
              content: `✅ Schedule updated to: Every ${intervalMinutes} minutes`,
              flags: MessageFlags.Ephemeral 
            });
          } else {
            const hoursStr = interaction.fields.getTextInputValue('hours');
            const minutesStr = interaction.fields.getTextInputValue('minutes');
            
            const hours = hoursStr.split(',').map(h => parseInt(h.trim())).filter(h => !isNaN(h) && h >= 0 && h <= 23);
            const minutes = parseInt(minutesStr);
            
            if (hours.length === 0) {
              await interaction.reply({ content: '❌ Please enter valid hours (0-23).', flags: MessageFlags.Ephemeral });
              return;
            }
            
            if (isNaN(minutes) || minutes < 0 || minutes > 59) {
              await interaction.reply({ content: '❌ Please enter valid minutes (0-59).', flags: MessageFlags.Ephemeral });
              return;
            }
            
            updateEventNotification(eventId, { 
              schedule: { hours, minutes, timezone: 'GMT' }
            });
            
            const minuteStr = minutes.toString().padStart(2, '0');
            const times = hours.map(h => `${h}:${minuteStr}`).join(', ');
            
            await interaction.reply({ 
              content: `✅ Schedule updated to: ${times} GMT`,
              flags: MessageFlags.Ephemeral 
            });
          }
        } catch (error) {
          console.error('[MODAL] Error handling edit event schedule modal:', error);
          if (!interaction.replied) {
            await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
          }
        }
        return;
      }
      if (interaction.customId === 'setup_events_name_modal') {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          
          const { setWizardState } = await import('../bot/commands/setup/handlers/wizardStateCache.js');
          
          const eventName = interaction.fields.getTextInputValue('event_name');
          
          // Save the event name to wizard state cache so the collector can pick it up
          setWizardState(interaction.user.id, guildId, { eventName, fromModal: true });
          
          await interaction.reply({ 
            content: `✅ Event name set to: **${eventName}**\n\n⚠️ Click the **"✏️ Set Custom Name"** button again in the setup message above to apply the name.`,
            flags: MessageFlags.Ephemeral 
          });
        } catch (error) {
          console.error('[MODAL] Error handling events name modal:', error);
          if (!interaction.replied) {
            await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
          }
        }
        return;
      }
      if (interaction.customId === 'setup_events_message_modal') {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          
          const { getWizardState, setWizardState } = await import('../bot/commands/setup/handlers/wizardStateCache.js');
          const { buildEventNotificationsWizard } = await import('../bot/commands/setup/builders/eventNotificationsBuilder.js');
          
          const wizardState = getWizardState(interaction.user.id, guildId);
          if (!wizardState) {
            await interaction.reply({ content: '❌ Wizard session expired. Please start over.', flags: MessageFlags.Ephemeral });
            return;
          }
          
          const message = interaction.fields.getTextInputValue('message');
          const newWizardData = { ...wizardState, messageTemplate: message, wizardStep: 4 };
          
          // Update wizard state instead of clearing it
          setWizardState(interaction.user.id, guildId, newWizardData);
          
          const wizardView = buildEventNotificationsWizard(4, newWizardData);
          await interaction.reply({ 
            content: '✅ Message saved! Continue with the wizard below:',
            embeds: wizardView.embeds,
            components: wizardView.components,
            flags: MessageFlags.Ephemeral 
          });
        } catch (error) {
          console.error('[MODAL] Error handling events message modal:', error);
          if (!interaction.replied) {
            await interaction.reply({ content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral });
          }
        }
        return;
      }
      if (interaction.customId === 'setup_events_schedule_modal') {
        try {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.reply({ content: 'Error: Not in a server.', flags: MessageFlags.Ephemeral });
            return;
          }
          
          const { setWizardState } = await import('../bot/commands/setup/handlers/wizardStateCache.js');
          
          const hoursStr = interaction.fields.getTextInputValue('hours');
          const hours = hoursStr.split(',').map(h => parseInt(h.trim())).filter(h => !isNaN(h) && h >= 0 && h <= 23);
          
          if (hours.length === 0) {
            await interaction.reply({ content: '❌ Please enter valid hours (0-23).', flags: MessageFlags.Ephemeral });
            return;
          }
          
          // Save schedule to wizard state cache
          setWizardState(interaction.user.id, guildId, { 
            schedule: { hours, timezone: 'GMT' },
            fromModal: true 
          });
          
          await interaction.reply({ 
            content: `✅ Schedule saved: ${hours.join(', ')}:00 GMT\n\n⚠️ Click the **"✏️ Customize Schedule"** button again in the setup message above to apply the schedule.`,
            flags: MessageFlags.Ephemeral 
          });
        } catch (error) {
          console.error('[MODAL] Error handling events schedule modal:', error);
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
    if (isBlacklisted(guild.id)) {
      console.log(`[BLACKLIST] Attempted to join blacklisted guild: ${guild.name} (${guild.id})`);
      await guild.leave();
      return;
    }
    console.log(`[GUILD] Joined new guild: ${guild.name} (${guild.id})`);
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
