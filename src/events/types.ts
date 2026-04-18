// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Event Notifications Types
// Licensed under MIT License

export interface EventSchedule {
  hours?: number[]; // For hourly events (0-23)
  minutes?: number; // Specific minute (0-59) for hourly events, default 0
  intervalMinutes?: number; // For interval-based events (e.g., every 5 minutes)
  timezone: string;
}

export interface EventNotificationConfig {
  id: number;
  guildId: string;
  eventType: string;
  eventName: string;
  channelId: string;
  roleId: string | null;
  messageTemplate: string;
  schedule: EventSchedule;
  enabled: boolean;
  lastMessageId: string | null;
  previousMessageIds: string[];
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventPreset {
  eventType: string;
  eventName: string;
  defaultMessage: string;
  defaultSchedule: EventSchedule;
}

export const EVENT_PRESETS: Record<string, EventPreset> = {
  lootReset: {
    eventType: 'lootReset',
    eventName: 'Loot Reset',
    defaultMessage: '🎁 Loot has respawned! {role}',
    defaultSchedule: {
      hours: [0, 4, 8, 12, 16, 20],
      minutes: 0,
      timezone: 'GMT',
    },
  },
  bossSpawn: {
    eventType: 'bossSpawn',
    eventName: 'Boss Spawn',
    defaultMessage: '⚔️ Boss has spawned! {role}',
    defaultSchedule: {
      hours: [0, 6, 12, 18],
      minutes: 0,
      timezone: 'GMT',
    },
  },
  dailyReset: {
    eventType: 'dailyReset',
    eventName: 'Daily Reset',
    defaultMessage: '🔄 Daily quests have reset! {role}',
    defaultSchedule: {
      hours: [0],
      minutes: 0,
      timezone: 'GMT',
    },
  },
  halfHourEvent: {
    eventType: 'halfHourEvent',
    eventName: 'Half Hour Event',
    defaultMessage: '⏰ Half hour event! {role}',
    defaultSchedule: {
      hours: [12, 16, 20],
      minutes: 30,
      timezone: 'GMT',
    },
  },
  testEvent: {
    eventType: 'testEvent',
    eventName: 'Test Event (Every 5 min)',
    defaultMessage: '🧪 Test notification {role}',
    defaultSchedule: {
      intervalMinutes: 5,
      timezone: 'GMT',
    },
  },
  custom: {
    eventType: 'custom',
    eventName: 'Custom Event',
    defaultMessage: '📢 Event notification {role}',
    defaultSchedule: {
      hours: [12],
      minutes: 0,
      timezone: 'GMT',
    },
  },
};
