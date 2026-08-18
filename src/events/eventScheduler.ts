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
          // console.log(`[EVENT SCHEDULER] Triggering event ${event.id} (${event.eventName})`);
          await postEventNotification(client, event);
        } catch (err) {
          console.error(`[EVENT SCHEDULER] Failed to post event ${event.id}:`, err);
        }
      }
    }
  }
}

export function parseUtcDate(dateStr: string): Date {
  if (dateStr.endsWith('Z')) {
    return new Date(dateStr);
  }
  const iso = dateStr.includes('T') ? dateStr + 'Z' : dateStr.replace(' ', 'T') + 'Z';
  return new Date(iso);
}

export function shouldTriggerEvent(event: any, now: Date): boolean {
  const { schedule } = event;
  
  // For interval-based events
  if (schedule.intervalMinutes) {
    // If never triggered, trigger now
    if (!event.lastTriggeredAt) {
      return true;
    }
    
    // Parse lastTriggeredAt (stored as UTC string from SQLite)
    const lastTriggered = parseUtcDate(event.lastTriggeredAt);
    const timeSinceLastTrigger = now.getTime() - lastTriggered.getTime();
    const minutesSinceLastTrigger = timeSinceLastTrigger / (1000 * 60);
    
    // Only trigger if the full interval has passed (with 0.5 minute tolerance)
    if (minutesSinceLastTrigger >= schedule.intervalMinutes - 0.5) {
      return true;
    }
    
    return false;
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

    // Prevent duplicate triggers within 55 minutes
    if (event.lastTriggeredAt) {
      const lastTriggered = parseUtcDate(event.lastTriggeredAt);
      const timeSinceLastTrigger = now.getTime() - lastTriggered.getTime();
      const minutesSinceLastTrigger = timeSinceLastTrigger / (1000 * 60);
      
      if (minutesSinceLastTrigger < 55) {
        return false;
      }
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
