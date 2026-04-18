// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Event Scheduler
// Licensed under MIT License

import type { Client } from 'discord.js';
import { getEnabledEventNotifications } from '../database/repositories/eventNotificationsRepo.js';
import { postEventNotification } from './eventService.js';

let schedulerInterval: NodeJS.Timeout | null = null;
let clientRef: Client | null = null;

export function startEventScheduler(client: Client): void {
  if (schedulerInterval) return;
  clientRef = client;

  console.log('[EVENT SCHEDULER] Starting event notification scheduler');

  // Check every minute
  schedulerInterval = setInterval(async () => {
    try {
      await checkAndTriggerEvents(client);
    } catch (err) {
      console.error('[EVENT SCHEDULER] Error:', err);
    }
  }, 60 * 1000);

  // Run immediately on start
  checkAndTriggerEvents(client).catch(err => {
    console.error('[EVENT SCHEDULER] Initial check error:', err);
  });
}

export function stopEventScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[EVENT SCHEDULER] Stopped');
  }
}

export async function checkAndTriggerEvents(client: Client): Promise<void> {
  const now = new Date();

  for (const guild of client.guilds.cache.values()) {
    const events = getEnabledEventNotifications(guild.id);

    for (const event of events) {
      if (shouldTriggerEvent(event, now)) {
        try {
          await postEventNotification(client, event);
        } catch (err) {
          console.error(`[EVENT SCHEDULER] Failed to post event ${event.id}:`, err);
        }
      }
    }
  }
}

function shouldTriggerEvent(event: any, now: Date): boolean {
  const { schedule } = event;
  
  // Get current time in the event's timezone
  const currentHour = getHourInTimezone(now, schedule.timezone);
  const currentMinute = now.getUTCMinutes();

  // Check if current hour matches any scheduled hour
  if (!schedule.hours.includes(currentHour)) {
    return false;
  }

  // Only trigger at minute 0 (start of the hour)
  if (currentMinute !== 0) {
    return false;
  }

  return true;
}

function getHourInTimezone(date: Date, timezone: string): number {
  if (timezone === 'GMT' || timezone === 'UTC') {
    return date.getUTCHours();
  }
  
  // For other timezones, you could use Intl.DateTimeFormat or a library
  // For now, we only support GMT as specified in requirements
  return date.getUTCHours();
}

// Manual trigger for testing
export async function triggerEventManually(eventId: number): Promise<void> {
  if (!clientRef) {
    throw new Error('Event scheduler not initialized');
  }

  const { getEventNotificationById } = await import('../database/repositories/eventNotificationsRepo.js');
  const event = getEventNotificationById(eventId);
  
  if (!event) {
    throw new Error('Event not found');
  }

  if (!event.enabled) {
    throw new Error('Event is disabled');
  }

  await postEventNotification(clientRef, event);
}
