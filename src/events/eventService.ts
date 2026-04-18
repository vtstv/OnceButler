// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Event Service
// Licensed under MIT License

import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import type { EventNotificationConfig } from './types.js';
import { updateLastMessageId } from '../database/repositories/eventNotificationsRepo.js';

export async function postEventNotification(
  client: Client,
  event: EventNotificationConfig
): Promise<void> {
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

  // Delete previous message if exists
  if (event.lastMessageId) {
    try {
      const oldMessage = await channel.messages.fetch(event.lastMessageId).catch(() => null);
      if (oldMessage) {
        await oldMessage.delete();
      }
    } catch (err) {
      console.error(`[EVENT] Failed to delete old message:`, err);
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
    updateLastMessageId(event.id, sentMessage.id);
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
  const currentHour = now.getUTCHours();
  const { schedule } = event;

  // Find next scheduled hour
  let nextHour: number | null = null;

  for (const hour of schedule.hours) {
    if (hour > currentHour) {
      nextHour = hour;
      break;
    }
  }

  // If no hour found today, use first hour tomorrow
  if (nextHour === null) {
    nextHour = schedule.hours[0];
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(nextHour, 0, 0, 0);
    return tomorrow;
  }

  // Set to next hour today
  const nextTime = new Date(now);
  nextTime.setUTCHours(nextHour, 0, 0, 0);
  return nextTime;
}
