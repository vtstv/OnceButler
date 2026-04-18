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
  
  // Check if already triggered recently to prevent duplicates
  if (event.lastTriggeredAt) {
    const lastTriggered = new Date(event.lastTriggeredAt);
    const timeSinceLastTrigger = now.getTime() - lastTriggered.getTime();
    const minutesSinceLastTrigger = timeSinceLastTrigger / (1000 * 60);
    
    // For interval-based events, check if interval has passed
    if (schedule.intervalMinutes) {
      // Allow some tolerance (1 minute) to account for scheduler timing
      if (minutesSinceLastTrigger < schedule.intervalMinutes - 1) {
        return false;
      }
      return true;
    }
    
    // For hourly events, prevent triggering within 55 minutes
    if (minutesSinceLastTrigger < 55) {
      return false;
    }
  }
  
  // For interval-based events, trigger if no lastTriggeredAt or interval passed
  if (schedule.intervalMinutes) {
    return true;
  }
  
  // For hourly events with specific times
  if (schedule.hours) {
    const currentHour = getHourInTimezone(now, schedule.timezone);
    const currentMinute = now.getUTCMinutes();
    const targetMinute = schedule.minutes ?? 0;

    // Check if current hour matches any scheduled hour
    if (!schedule.hours.includes(currentHour)) {
      return false;
    }

    // Check if current minute matches target minute
    if (currentMinute !== targetMinute) {
      return false;
    }

    return true;
  }

  return false;
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
