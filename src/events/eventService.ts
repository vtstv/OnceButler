// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Event Service
// Licensed under MIT License

import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import type { EventNotificationConfig } from './types.js';
import { updateEventTrigger } from '../database/repositories/eventNotificationsRepo.js';
import { getGuildSettings } from '../database/repositories/settingsRepo.js';

export async function postEventNotification(
  client: Client,
  event: EventNotificationConfig
): Promise<void> {
  // Update lastTriggeredAt IMMEDIATELY to prevent duplicate triggers
  updateEventTrigger(event.id, event.lastMessageId || '', event.previousMessageIds);
  
  const guild = client.guilds.cache.get(event.guildId);
  if (!guild) {
    console.error(`[EVENT] Guild ${event.guildId} not found`);
    return;
  }

  const channel = guild.channels.cache.get(event.channelId) as TextChannel;
  if (!channel || !channel.isTextBased()) {
    console.error(`[EVENT] Channel ${event.channelId} not found or not text-based`);
    return;
  }

  const settings = getGuildSettings(event.guildId);
  const keepOldMessages = settings.eventNotificationsKeepOldMessages || 1;

  // Manage old messages
  const previousMessageIds = [...event.previousMessageIds];
  
  // Add current message to previous list if it exists
  if (event.lastMessageId) {
    previousMessageIds.push(event.lastMessageId);
  }

  // Delete messages that exceed the keep limit
  while (previousMessageIds.length > keepOldMessages) {
    const oldMessageId = previousMessageIds.shift();
    if (oldMessageId) {
      try {
        const oldMessage = await channel.messages.fetch(oldMessageId).catch(() => null);
        if (oldMessage) {
          await oldMessage.delete();
        }
      } catch (err) {
        console.error(`[EVENT] Failed to delete old message ${oldMessageId}:`, err);
      }
    }
  }

  // Format message
  const message = formatEventMessage(event);

  // Calculate next event time
  const nextEventTime = getNextEventTime(event);

  // Create embed
  const embed = new EmbedBuilder()
    .setTitle(`${event.eventName}`)
    .setDescription(message)
    .setColor(0x00FF7F)
    .setTimestamp();

  if (nextEventTime) {
    embed.addFields({
      name: '⏰ Next Event',
      value: `<t:${Math.floor(nextEventTime.getTime() / 1000)}:R>`,
      inline: false,
    });
  }

  // Send new message
  try {
    const sentMessage = await channel.send({ embeds: [embed] });
    // Update with the new message ID
    updateEventTrigger(event.id, sentMessage.id, previousMessageIds);
    console.log(`[EVENT] Posted ${event.eventType} notification in ${guild.name}`);
  } catch (err) {
    console.error(`[EVENT] Failed to send message:`, err);
  }
}

function formatEventMessage(event: EventNotificationConfig): string {
  let message = event.messageTemplate;

  // Replace {role} with role mention
  if (event.roleId) {
    message = message.replace('{role}', `<@&${event.roleId}>`);
  } else {
    message = message.replace('{role}', '');
  }

  // Replace {eventName}
  message = message.replace('{eventName}', event.eventName);

  return message.trim();
}

function getNextEventTime(event: EventNotificationConfig): Date | null {
  const now = new Date();
  const { schedule } = event;

  // For interval-based events
  if (schedule.intervalMinutes) {
    const nextTime = new Date(now);
    nextTime.setMinutes(nextTime.getMinutes() + schedule.intervalMinutes);
    nextTime.setSeconds(0, 0);
    return nextTime;
  }

  // For hourly events with specific times
  if (schedule.hours) {
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const targetMinute = schedule.minutes ?? 0;

    // Find next scheduled hour
    let nextHour: number | null = null;
    let isToday = true;

    for (const hour of schedule.hours) {
      // If hour is later today, or same hour but minute hasn't passed yet
      if (hour > currentHour || (hour === currentHour && targetMinute > currentMinute)) {
        nextHour = hour;
        break;
      }
    }

    // If no hour found today, use first hour tomorrow
    if (nextHour === null) {
      nextHour = schedule.hours[0];
      isToday = false;
    }

    // Set to next scheduled time
    const nextTime = new Date(now);
    if (!isToday) {
      nextTime.setUTCDate(nextTime.getUTCDate() + 1);
    }
    nextTime.setUTCHours(nextHour, targetMinute, 0, 0);
    return nextTime;
  }

  return null;
}
