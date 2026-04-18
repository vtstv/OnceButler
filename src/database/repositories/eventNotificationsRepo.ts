// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Event Notifications Repository
// Licensed under MIT License

import { getDb } from '../db.js';
import type { EventNotificationConfig, EventSchedule } from '../../events/types.js';

export function getEventNotifications(guildId: string): EventNotificationConfig[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM event_notifications
    WHERE guildId = ?
    ORDER BY eventType, id
  `).all(guildId) as any[];

  return rows.map(row => ({
    id: row.id,
    guildId: row.guildId,
    eventType: row.eventType,
    eventName: row.eventName,
    channelId: row.channelId,
    roleId: row.roleId,
    messageTemplate: row.messageTemplate,
    schedule: JSON.parse(row.schedule),
    enabled: row.enabled === 1,
    lastMessageId: row.lastMessageId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export function getEnabledEventNotifications(guildId: string): EventNotificationConfig[] {
  return getEventNotifications(guildId).filter(e => e.enabled);
}

export function getEventNotificationById(id: number): EventNotificationConfig | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM event_notifications WHERE id = ?
  `).get(id) as any;

  if (!row) return null;

  return {
    id: row.id,
    guildId: row.guildId,
    eventType: row.eventType,
    eventName: row.eventName,
    channelId: row.channelId,
    roleId: row.roleId,
    messageTemplate: row.messageTemplate,
    schedule: JSON.parse(row.schedule),
    enabled: row.enabled === 1,
    lastMessageId: row.lastMessageId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createEventNotification(
  guildId: string,
  eventType: string,
  eventName: string,
  channelId: string,
  roleId: string | null,
  messageTemplate: string,
  schedule: EventSchedule
): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO event_notifications (
      guildId, eventType, eventName, channelId, roleId, 
      messageTemplate, schedule, enabled, createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
  `).run(
    guildId,
    eventType,
    eventName,
    channelId,
    roleId,
    messageTemplate,
    JSON.stringify(schedule)
  );

  return result.lastInsertRowid as number;
}

export function updateEventNotification(
  id: number,
  updates: {
    eventName?: string;
    channelId?: string;
    roleId?: string | null;
    messageTemplate?: string;
    schedule?: EventSchedule;
    enabled?: boolean;
  }
): void {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.eventName !== undefined) {
    fields.push('eventName = ?');
    values.push(updates.eventName);
  }
  if (updates.channelId !== undefined) {
    fields.push('channelId = ?');
    values.push(updates.channelId);
  }
  if (updates.roleId !== undefined) {
    fields.push('roleId = ?');
    values.push(updates.roleId);
  }
  if (updates.messageTemplate !== undefined) {
    fields.push('messageTemplate = ?');
    values.push(updates.messageTemplate);
  }
  if (updates.schedule !== undefined) {
    fields.push('schedule = ?');
    values.push(JSON.stringify(updates.schedule));
  }
  if (updates.enabled !== undefined) {
    fields.push('enabled = ?');
    values.push(updates.enabled ? 1 : 0);
  }

  if (fields.length === 0) return;

  fields.push("updatedAt = datetime('now')");
  values.push(id);

  db.prepare(`
    UPDATE event_notifications
    SET ${fields.join(', ')}
    WHERE id = ?
  `).run(...values);
}

export function deleteEventNotification(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM event_notifications WHERE id = ?').run(id);
}

export function updateLastMessageId(id: number, messageId: string | null): void {
  const db = getDb();
  db.prepare(`
    UPDATE event_notifications
    SET lastMessageId = ?, updatedAt = datetime('now')
    WHERE id = ?
  `).run(messageId, id);
}

export function toggleEventNotification(id: number): void {
  const db = getDb();
  db.prepare(`
    UPDATE event_notifications
    SET enabled = NOT enabled, updatedAt = datetime('now')
    WHERE id = ?
  `).run(id);
}
