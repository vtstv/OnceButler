// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Event Notifications Setup Builder
// Licensed under MIT License

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelType,
} from 'discord.js';
import type { GuildSettings } from '../../../../database/repositories/settingsRepo.js';
import type { SetupView } from '../types.js';
import { getEventNotifications } from '../../../../database/repositories/eventNotificationsRepo.js';
import { EVENT_PRESETS } from '../../../../events/types.js';

export function buildEventNotificationsSettings(settings: GuildSettings, guild: any): SetupView {
  const events = getEventNotifications(guild.id);
  
  const embed = new EmbedBuilder()
    .setTitle('📅 Event Notifications Settings')
    .setDescription(
      'Configure automatic notifications for game events like loot resets.\n\n' +
      '**How it works:**\n' +
      '• Events trigger at scheduled times (e.g., every 4 hours)\n' +
      '• Bot posts notification in configured channel\n' +
      '• Previous notification is deleted when new one posts\n' +
      '• Mentions configured role to alert players'
    )
    .setColor(0x5865F2);

  if (events.length === 0) {
    embed.addFields({
      name: '📋 Configured Events',
      value: 'No events configured yet. Add an event using the button below.',
      inline: false,
    });
  } else {
    const eventsList = events.map(e => {
      const status = e.enabled ? '✅' : '❌';
      const channel = guild.channels.cache.get(e.channelId);
      const role = e.roleId ? guild.roles.cache.get(e.roleId) : null;
      const schedule = `${e.schedule.hours.join(', ')}:00 ${e.schedule.timezone}`;
      
      return `${status} **${e.eventName}** (ID: ${e.id})\n` +
             `└ Channel: ${channel ? `<#${channel.id}>` : 'Unknown'}\n` +
             `└ Role: ${role ? `<@&${role.id}>` : 'None'}\n` +
             `└ Schedule: ${schedule}`;
    }).join('\n\n');

    embed.addFields({
      name: '📋 Configured Events',
      value: eventsList,
      inline: false,
    });
  }

  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_events_add')
        .setLabel('➕ Add Event')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('setup_events_manage')
        .setLabel('📋 Manage Events')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(events.length === 0),
      new ButtonBuilder()
        .setCustomId('setup_back')
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary),
    );

  return {
    embeds: [embed],
    components: [row1],
  };
}

export function buildEventNotificationsAdd(guildId: string): SetupView {
  const embed = new EmbedBuilder()
    .setTitle('➕ Add Event Notification')
    .setDescription('Select a preset event type to configure.')
    .setColor(0x00FF00);

  const presetOptions = Object.entries(EVENT_PRESETS).map(([key, preset]) => ({
    label: preset.eventName,
    value: key,
    description: `Schedule: ${preset.defaultSchedule.hours.join(', ')}:00 ${preset.defaultSchedule.timezone}`,
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('setup_events_select_preset')
    .setPlaceholder('Select event type')
    .addOptions(presetOptions);

  const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const row2 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_events_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary),
    );

  return {
    embeds: [embed],
    components: [row1, row2],
  };
}

export function buildEventNotificationsWizard(
  step: number,
  wizardData: any
): SetupView {
  switch (step) {
    case 1: // Select channel
      return buildWizardStepChannel(wizardData);
    case 2: // Select role (optional)
      return buildWizardStepRole(wizardData);
    case 3: // Customize message
      return buildWizardStepMessage(wizardData);
    case 4: // Customize schedule
      return buildWizardStepSchedule(wizardData);
    case 5: // Confirm
      return buildWizardStepConfirm(wizardData);
    default:
      return buildEventNotificationsAdd(wizardData.guildId);
  }
}

function buildWizardStepEventName(wizardData: any): SetupView {
  const preset = EVENT_PRESETS[wizardData.presetKey];
  
  const embed = new EmbedBuilder()
    .setTitle(`➕ Add Custom Event — Step 1/5`)
    .setDescription(
      'Enter a custom name for this event.\n\n' +
      'Click the button below to set a custom name, or use the default.'
    )
    .setColor(0x5865F2);

  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_events_wizard_name_custom')
        .setLabel('✏️ Set Custom Name')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_events_wizard_name_default')
        .setLabel(`Use Default: "${preset.eventName}"`)
        .setStyle(ButtonStyle.Secondary),
    );

  const row2 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_events_wizard_name_continue')
        .setLabel('Continue →')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!wizardData.eventName),
      new ButtonBuilder()
        .setCustomId('setup_events_wizard_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger),
    );

  if (wizardData.eventName) {
    embed.addFields({
      name: '✅ Event Name Set',
      value: wizardData.eventName,
      inline: false,
    });
  }

  return {
    embeds: [embed],
    components: [row1, row2],
  };
}

function buildWizardStepChannel(wizardData: any): SetupView {
  const preset = EVENT_PRESETS[wizardData.presetKey];
  const eventName = wizardData.eventName || preset.eventName;
  
  const embed = new EmbedBuilder()
    .setTitle(`➕ Add Event: ${eventName} — Step 1/5`)
    .setDescription('Select the channel where notifications will be posted.')
    .setColor(0x5865F2);

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId('setup_events_wizard_channel')
    .setPlaceholder('Select notification channel')
    .setChannelTypes(ChannelType.GuildText);

  const row1 = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect);

  const row2 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_events_wizard_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary),
    );

  return {
    embeds: [embed],
    components: [row1, row2],
  };
}

function buildWizardStepRole(wizardData: any): SetupView {
  const preset = EVENT_PRESETS[wizardData.presetKey];
  const eventName = wizardData.eventName || preset.eventName;
  
  const embed = new EmbedBuilder()
    .setTitle(`➕ Add Event: ${eventName} — Step 2/5`)
    .setDescription('Select a role to mention in notifications (optional).')
    .setColor(0x5865F2);

  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId('setup_events_wizard_role')
    .setPlaceholder('Select role to mention (optional)');

  const row1 = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleSelect);

  const row2 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_events_wizard_skip_role')
        .setLabel('Skip (No Role)')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_events_wizard_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger),
    );

  return {
    embeds: [embed],
    components: [row1, row2],
  };
}

function buildWizardStepMessage(wizardData: any): SetupView {
  const preset = EVENT_PRESETS[wizardData.presetKey];
  const eventName = wizardData.eventName || preset.eventName;
  
  const embed = new EmbedBuilder()
    .setTitle(`➕ Add Event: ${eventName} — Step 3/5`)
    .setDescription(
      'Customize the notification message.\n\n' +
      '**Available variables:**\n' +
      '• `{role}` - Mentions the configured role\n' +
      '• `{eventName}` - Event name\n\n' +
      `**Default message:**\n${preset.defaultMessage}`
    )
    .setColor(0x5865F2);

  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_events_wizard_message_custom')
        .setLabel('✏️ Customize Message')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_events_wizard_message_default')
        .setLabel('Use Default')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_events_wizard_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger),
    );

  return {
    embeds: [embed],
    components: [row1],
  };
}

function buildWizardStepSchedule(wizardData: any): SetupView {
  const preset = EVENT_PRESETS[wizardData.presetKey];
  const eventName = wizardData.eventName || preset.eventName;
  const isCustom = wizardData.presetKey === 'custom';
  
  const embed = new EmbedBuilder()
    .setTitle(`➕ Add Event: ${eventName} — Step 4/5`)
    .setDescription(
      (isCustom 
        ? 'Set the event schedule (when notifications will be posted).\n\n'
        : 'Customize the event schedule.\n\n') +
      `**Default schedule:**\n` +
      `Hours: ${preset.defaultSchedule.hours.join(', ')}:00\n` +
      `Timezone: ${preset.defaultSchedule.timezone}`
    )
    .setColor(0x5865F2);

  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_events_wizard_schedule_custom')
        .setLabel('✏️ Customize Schedule')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_events_wizard_schedule_default')
        .setLabel('Use Default')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_events_wizard_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger),
    );

  return {
    embeds: [embed],
    components: [row1],
  };
}

function buildWizardStepConfirm(wizardData: any): SetupView {
  const preset = EVENT_PRESETS[wizardData.presetKey];
  const eventName = wizardData.eventName || preset.eventName;
  const message = wizardData.messageTemplate || preset.defaultMessage;
  const schedule = wizardData.schedule || preset.defaultSchedule;
  
  const embed = new EmbedBuilder()
    .setTitle(`➕ Add Event: ${eventName} — Step 5/5 (Confirm)`)
    .setDescription('Review your event configuration and confirm.')
    .setColor(0x00FF00)
    .addFields(
      { name: 'Event Name', value: eventName, inline: true },
      { name: 'Channel', value: wizardData.channelId ? `<#${wizardData.channelId}>` : 'Not set', inline: true },
      { name: 'Role', value: wizardData.roleId ? `<@&${wizardData.roleId}>` : 'None', inline: true },
      { name: 'Message', value: message, inline: false },
      { name: 'Schedule', value: `${schedule.hours.join(', ')}:00 ${schedule.timezone}`, inline: false },
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_events_wizard_confirm')
        .setLabel('✅ Create Event')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('setup_events_wizard_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger),
    );

  return {
    embeds: [embed],
    components: [row1],
  };
}

export function buildEventNotificationsManage(guildId: string, guild: any): SetupView {
  const events = getEventNotifications(guildId);
  
  const embed = new EmbedBuilder()
    .setTitle('📋 Manage Event Notifications')
    .setDescription('Select an event to edit or delete.')
    .setColor(0x5865F2);

  if (events.length === 0) {
    embed.setDescription('No events configured.');
  }

  const options = events.map(e => {
    const status = e.enabled ? '✅' : '❌';
    const channel = guild.channels.cache.get(e.channelId);
    return {
      label: `${status} ${e.eventName}`,
      value: e.id.toString(),
      description: `Channel: ${channel?.name || 'Unknown'} | ID: ${e.id}`,
    };
  });

  const components: any[] = [];

  if (options.length > 0) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('setup_events_select_event')
      .setPlaceholder('Select event to manage')
      .addOptions(options);

    components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu));
  }

  const row2 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_back')
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary),
    );

  components.push(row2);

  return {
    embeds: [embed],
    components,
  };
}

export function buildEventNotificationEdit(event: any, guild: any): SetupView {
  const channel = guild.channels.cache.get(event.channelId);
  const role = event.roleId ? guild.roles.cache.get(event.roleId) : null;
  const schedule = `${event.schedule.hours.join(', ')}:00 ${event.schedule.timezone}`;
  
  const embed = new EmbedBuilder()
    .setTitle(`✏️ Edit Event: ${event.eventName}`)
    .setDescription(`Event ID: ${event.id}`)
    .setColor(0x5865F2)
    .addFields(
      { name: 'Status', value: event.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Channel', value: channel ? `<#${channel.id}>` : 'Unknown', inline: true },
      { name: 'Role', value: role ? `<@&${role.id}>` : 'None', inline: true },
      { name: 'Message', value: event.messageTemplate, inline: false },
      { name: 'Schedule', value: schedule, inline: false },
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`setup_events_toggle_${event.id}`)
        .setLabel(event.enabled ? 'Disable' : 'Enable')
        .setStyle(event.enabled ? ButtonStyle.Secondary : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`setup_events_test_${event.id}`)
        .setLabel('🧪 Test')
        .setStyle(ButtonStyle.Primary),
    );

  const row2 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`setup_events_edit_name_${event.id}`)
        .setLabel('✏️ Edit Name')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`setup_events_delete_${event.id}`)
        .setLabel('🗑️ Delete')
        .setStyle(ButtonStyle.Danger),
    );

  const row3 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_events_manage')
        .setLabel('◀️ Back to List')
        .setStyle(ButtonStyle.Secondary),
    );

  return {
    embeds: [embed],
    components: [row1, row2, row3],
  };
}
