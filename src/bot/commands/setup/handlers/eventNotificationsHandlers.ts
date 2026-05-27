// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Event Notifications Handlers
// Licensed under MIT License

import {
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import type { ButtonInteraction, StringSelectMenuInteraction, ChannelSelectMenuInteraction, RoleSelectMenuInteraction } from 'discord.js';
import { getGuildSettings, updateGuildSettings } from '../../../../database/repositories/settingsRepo.js';
import {
  createEventNotification,
  getEventNotificationById,
  updateEventNotification,
  deleteEventNotification,
  toggleEventNotification,
} from '../../../../database/repositories/eventNotificationsRepo.js';
import { triggerEventManually } from '../../../../events/eventScheduler.js';
import { EVENT_PRESETS } from '../../../../events/types.js';
import {
  buildEventNotificationsSettings,
  buildEventNotificationsAdd,
  buildEventNotificationsWizard,
  buildEventNotificationsManage,
  buildEventNotificationEdit,
} from '../builders/eventNotificationsBuilder.js';
import type { ButtonResult, SelectMenuResult } from './types.js';
import type { RoleSubCategory } from '../types.js';
import { setWizardState } from './wizardStateCache.js';

export async function handleEventNotificationsButton(
  i: ButtonInteraction,
  guildId: string,
  settings: any,
  currentRoleSubCategory: RoleSubCategory,
  wizardData: any
): Promise<ButtonResult | null> {
  // Check if there's cached wizard state and merge it
  const { getWizardState } = await import('./wizardStateCache.js');
  const cachedState = getWizardState(i.user.id, guildId);
  if (cachedState) {
    wizardData = { ...wizardData, ...cachedState };
  }
  
  // Toggle module
  if (i.customId === 'setup_events_toggle_module') {
    updateGuildSettings(guildId, { enableEventNotifications: !settings.enableEventNotifications });
    const newSettings = getGuildSettings(guildId);
    const { buildCategoryView } = await import('./viewBuilder.js');
    const view = buildCategoryView('eventNotifications', newSettings, i.guild!, currentRoleSubCategory);
    await i.update({ embeds: view.embeds, components: view.components });
    return { shouldReturn: true };
  }

  // Keep old messages setting
  if (i.customId === 'setup_events_keep_old') {
    const modal = new ModalBuilder()
      .setCustomId('setup_events_keep_old_modal')
      .setTitle('Keep Old Messages');

    const keepInput = new TextInputBuilder()
      .setCustomId('keep_old_messages')
      .setLabel('Number of old messages to keep (0-10)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., 0, 1, 2, 3')
      .setValue(settings.eventNotificationsKeepOldMessages.toString())
      .setRequired(true)
      .setMaxLength(2);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(keepInput));
    await i.showModal(modal);
    return { shouldReturn: true };
  }

  // Main buttons
  if (i.customId === 'setup_events_add') {
    const addView = buildEventNotificationsAdd(guildId);
    await i.update({ embeds: addView.embeds, components: addView.components });
    return { shouldReturn: true, wizardData: { guildId } };
  }

  if (i.customId === 'setup_events_manage') {
    const manageView = buildEventNotificationsManage(guildId, i.guild!);
    await i.update({ embeds: manageView.embeds, components: manageView.components });
    return { shouldReturn: true };
  }

  if (i.customId === 'setup_events_cancel' || i.customId === 'setup_events_wizard_cancel') {
    const newSettings = getGuildSettings(guildId);
    const { buildCategoryView } = await import('./viewBuilder.js');
    const view = buildCategoryView('eventNotifications', newSettings, i.guild!, currentRoleSubCategory);
    await i.update({ embeds: view.embeds, components: view.components });
    return { shouldReturn: true, wizardData: {} };
  }

  // Wizard buttons
  if (i.customId === 'setup_events_wizard_skip_role') {
    const newWizardData = { ...wizardData, roleId: null };
    const wizardView = buildEventNotificationsWizard(3, newWizardData);
    await i.update({ embeds: wizardView.embeds, components: wizardView.components });
    return { shouldReturn: true, wizardData: newWizardData, wizardStep: 3 };
  }

  if (i.customId === 'setup_events_wizard_message_default') {
    const preset = EVENT_PRESETS[wizardData.presetKey];
    const newWizardData = { ...wizardData, messageTemplate: preset.defaultMessage };
    const wizardView = buildEventNotificationsWizard(4, newWizardData);
    await i.update({ embeds: wizardView.embeds, components: wizardView.components });
    return { shouldReturn: true, wizardData: newWizardData, wizardStep: 4 };
  }

  if (i.customId === 'setup_events_wizard_message_custom') {
    const preset = EVENT_PRESETS[wizardData.presetKey];
    
    // Store wizard state for modal submission
    setWizardState(i.user.id, guildId, { ...wizardData, wizardStep: 3 });
    
    const modal = new ModalBuilder()
      .setCustomId('setup_events_message_modal')
      .setTitle('Customize Message');

    const messageInput = new TextInputBuilder()
      .setCustomId('message')
      .setLabel('Notification Message')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Variables: {role}, {eventName}')
      .setValue(wizardData.messageTemplate || preset.defaultMessage)
      .setRequired(true)
      .setMaxLength(500);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput));
    await i.showModal(modal);
    return { shouldReturn: true };
  }

  if (i.customId === 'setup_events_wizard_schedule_default') {
    const preset = EVENT_PRESETS[wizardData.presetKey];
    const newWizardData = { ...wizardData, schedule: preset.defaultSchedule };
    const wizardView = buildEventNotificationsWizard(5, newWizardData);
    await i.update({ embeds: wizardView.embeds, components: wizardView.components });
    return { shouldReturn: true, wizardData: newWizardData, wizardStep: 5 };
  }

  if (i.customId === 'setup_events_wizard_schedule_custom') {
    // Check if there's a schedule from modal in cache first
    const { getWizardState, clearWizardState } = await import('./wizardStateCache.js');
    const cachedState = getWizardState(i.user.id, guildId);
    
    if (cachedState && cachedState.schedule) {
      // User already set schedule via modal, apply it and continue
      const newWizardData = { ...wizardData, schedule: cachedState.schedule };
      clearWizardState(i.user.id, guildId);
      const wizardView = buildEventNotificationsWizard(5, newWizardData);
      await i.update({ embeds: wizardView.embeds, components: wizardView.components });
      return { shouldReturn: true, wizardData: newWizardData, wizardStep: 5 };
    }
    
    // Show modal for first time
    const preset = EVENT_PRESETS[wizardData.presetKey];
    const currentSchedule = wizardData.schedule || preset.defaultSchedule;
    
    // Store wizard state for modal submission
    setWizardState(i.user.id, guildId, { ...wizardData, wizardStep: 4 });
    
    const modal = new ModalBuilder()
      .setCustomId('setup_events_schedule_modal')
      .setTitle('Customize Schedule');

    const hoursInput = new TextInputBuilder()
      .setCustomId('hours')
      .setLabel('Hours (comma-separated, 0-23)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('0, 4, 8, 12, 16, 20')
      .setValue(currentSchedule.hours.join(', '))
      .setRequired(true)
      .setMaxLength(100);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(hoursInput));
    await i.showModal(modal);
    return { shouldReturn: true };
  }

  if (i.customId === 'setup_events_wizard_confirm') {
    if (!wizardData.channelId || !wizardData.presetKey) {
      await i.reply({ content: '❌ Missing required fields. Please start over.', flags: MessageFlags.Ephemeral });
      return { shouldReturn: true };
    }

    const preset = EVENT_PRESETS[wizardData.presetKey];
    const eventName = wizardData.eventName || preset.eventName;
    const messageTemplate = wizardData.messageTemplate || preset.defaultMessage;
    const schedule = wizardData.schedule || preset.defaultSchedule;

    try {
      createEventNotification(
        guildId,
        preset.eventType,
        eventName,
        wizardData.channelId,
        wizardData.roleId || null,
        messageTemplate,
        schedule
      );

      const newSettings = getGuildSettings(guildId);
      const { buildCategoryView } = await import('./viewBuilder.js');
      const view = buildCategoryView('eventNotifications', newSettings, i.guild!, currentRoleSubCategory);
      await i.update({ embeds: view.embeds, components: view.components });
      await i.followUp({ content: '✅ Event notification created!', flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error('[EVENT NOTIFICATIONS] Error creating:', err);
      await i.reply({ content: '❌ Failed to create event notification.', flags: MessageFlags.Ephemeral });
    }

    return { shouldReturn: true, wizardData: {} };
  }

  // Event management buttons
  if (i.customId.startsWith('setup_events_toggle_')) {
    const eventId = parseInt(i.customId.replace('setup_events_toggle_', ''));
    toggleEventNotification(eventId);
    const event = getEventNotificationById(eventId);
    if (event) {
      const editView = buildEventNotificationEdit(event, i.guild!);
      await i.update({ embeds: editView.embeds, components: editView.components });
    }
    return { shouldReturn: true };
  }

  if (i.customId.startsWith('setup_events_test_')) {
    const eventId = parseInt(i.customId.replace('setup_events_test_', ''));
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
      await triggerEventManually(eventId);
      await i.editReply({ content: '✅ Event notification triggered successfully!' });
    } catch (err) {
      console.error('[EVENT NOTIFICATIONS] Test error:', err);
      await i.editReply({ content: `❌ Error: ${(err as Error).message}` });
    }
    
    return { shouldReturn: true };
  }

  if (i.customId.startsWith('setup_events_delete_')) {
    const eventId = parseInt(i.customId.replace('setup_events_delete_', ''));
    deleteEventNotification(eventId);
    const manageView = buildEventNotificationsManage(guildId, i.guild!);
    await i.update({ embeds: manageView.embeds, components: manageView.components });
    await i.followUp({ content: '✅ Event notification deleted!', flags: MessageFlags.Ephemeral });
    return { shouldReturn: true };
  }

  if (i.customId.startsWith('setup_events_edit_name_')) {
    const eventId = parseInt(i.customId.replace('setup_events_edit_name_', ''));
    const event = getEventNotificationById(eventId);
    
    if (!event) {
      await i.reply({ content: '❌ Event not found.', flags: MessageFlags.Ephemeral });
      return { shouldReturn: true };
    }
    
    const modal = new ModalBuilder()
      .setCustomId(`setup_events_edit_name_modal_${eventId}`)
      .setTitle('Edit Event Name');

    const nameInput = new TextInputBuilder()
      .setCustomId('event_name')
      .setLabel('Event Name')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter new event name')
      .setValue(event.eventName)
      .setRequired(true)
      .setMaxLength(50);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput));
    await i.showModal(modal);
    return { shouldReturn: true };
  }

  if (i.customId.startsWith('setup_events_edit_message_')) {
    const eventId = parseInt(i.customId.replace('setup_events_edit_message_', ''));
    const event = getEventNotificationById(eventId);
    
    if (!event) {
      await i.reply({ content: '❌ Event not found.', flags: MessageFlags.Ephemeral });
      return { shouldReturn: true };
    }
    
    const modal = new ModalBuilder()
      .setCustomId(`setup_events_edit_message_modal_${eventId}`)
      .setTitle('Edit Event Message');

    const messageInput = new TextInputBuilder()
      .setCustomId('message')
      .setLabel('Notification Message')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Variables: {role}, {eventName}')
      .setValue(event.messageTemplate)
      .setRequired(true)
      .setMaxLength(500);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput));
    await i.showModal(modal);
    return { shouldReturn: true };
  }

  if (i.customId.startsWith('setup_events_edit_schedule_')) {
    const eventId = parseInt(i.customId.replace('setup_events_edit_schedule_', ''));
    const event = getEventNotificationById(eventId);
    
    if (!event) {
      await i.reply({ content: '❌ Event not found.', flags: MessageFlags.Ephemeral });
      return { shouldReturn: true };
    }
    
    // For interval-based events
    if (event.schedule.intervalMinutes) {
      const modal = new ModalBuilder()
        .setCustomId(`setup_events_edit_schedule_modal_${eventId}`)
        .setTitle('Edit Schedule (Interval)');

      const intervalInput = new TextInputBuilder()
        .setCustomId('interval_minutes')
        .setLabel('Interval in minutes')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 5, 10, 15, 30, 60')
        .setValue(event.schedule.intervalMinutes.toString())
        .setRequired(true)
        .setMaxLength(10);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(intervalInput));
      await i.showModal(modal);
      return { shouldReturn: true };
    }
    
    // For hourly events
    if (event.schedule.hours) {
      const modal = new ModalBuilder()
        .setCustomId(`setup_events_edit_schedule_modal_${eventId}`)
        .setTitle('Edit Schedule (Hours)');

      const hoursInput = new TextInputBuilder()
        .setCustomId('hours')
        .setLabel('Hours (comma-separated, 0-23)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 0, 4, 8, 12, 16, 20')
        .setValue(event.schedule.hours.join(', '))
        .setRequired(true)
        .setMaxLength(100);

      const minutesInput = new TextInputBuilder()
        .setCustomId('minutes')
        .setLabel('Minutes (0-59)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 0, 15, 30, 45')
        .setValue((event.schedule.minutes ?? 0).toString())
        .setRequired(true)
        .setMaxLength(2);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(hoursInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(minutesInput)
      );
      await i.showModal(modal);
      return { shouldReturn: true };
    }
    
    await i.reply({ content: '❌ Unknown schedule type.', flags: MessageFlags.Ephemeral });
    return { shouldReturn: true };
  }

  return null;
}

export async function handleEventNotificationsSelectMenu(
  i: StringSelectMenuInteraction,
  guildId: string,
  wizardData: any
): Promise<SelectMenuResult | null> {
  if (i.customId === 'setup_events_select_preset') {
    const presetKey = i.values[0];
    let newWizardData = { ...wizardData, presetKey };
    
    // For custom events, generate a unique name
    if (presetKey === 'custom') {
      const { getEventNotifications } = await import('../../../../database/repositories/eventNotificationsRepo.js');
      const existingEvents = getEventNotifications(guildId);
      const customEvents = existingEvents.filter(e => e.eventName.startsWith('Custom Event'));
      const nextNumber = customEvents.length + 1;
      newWizardData.eventName = `Custom Event #${nextNumber}`;
    }
    
    // Start with channel selection (step 1)
    const wizardView = buildEventNotificationsWizard(1, newWizardData);
    await i.update({ embeds: wizardView.embeds, components: wizardView.components });
    return { shouldReturn: true, wizardData: newWizardData, wizardStep: 1 };
  }

  if (i.customId === 'setup_events_select_event') {
    const eventId = parseInt(i.values[0]);
    const event = getEventNotificationById(eventId);
    
    if (event) {
      const editView = buildEventNotificationEdit(event, i.guild!);
      await i.update({ embeds: editView.embeds, components: editView.components });
    } else {
      await i.reply({ content: '❌ Event not found.', flags: MessageFlags.Ephemeral });
    }
    
    return { shouldReturn: true };
  }

  return null;
}

export async function handleEventNotificationsChannelSelect(
  i: ChannelSelectMenuInteraction,
  wizardData: any
): Promise<SelectMenuResult | null> {
  if (i.customId === 'setup_events_wizard_channel') {
    const channelId = i.values[0];
    const newWizardData = { ...wizardData, channelId };
    const wizardView = buildEventNotificationsWizard(2, newWizardData);
    await i.update({ embeds: wizardView.embeds, components: wizardView.components });
    return { shouldReturn: true, wizardData: newWizardData, wizardStep: 2 };
  }

  return null;
}

export async function handleEventNotificationsRoleSelect(
  i: RoleSelectMenuInteraction,
  wizardData: any
): Promise<SelectMenuResult | null> {
  if (i.customId === 'setup_events_wizard_role') {
    const role = i.roles.first()!;
    const newWizardData = { ...wizardData, roleId: role.id };
    const wizardView = buildEventNotificationsWizard(3, newWizardData);
    await i.update({ embeds: wizardView.embeds, components: wizardView.components });
    return { shouldReturn: true, wizardData: newWizardData, wizardStep: 3 };
  }

  return null;
}
