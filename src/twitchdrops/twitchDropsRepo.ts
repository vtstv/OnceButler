// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Twitch Drops Repository
// Licensed under MIT License

import { getDb } from '../database/db.js';
import type { PostedCampaignRecord } from './types.js';

/**
 * Initialize the twitch_drops_posted table with composite primary key
 */
export function initTwitchDropsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS twitch_drops_posted (
      campaign_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      campaign_name TEXT NOT NULL,
      game_name TEXT NOT NULL,
      posted_at INTEGER NOT NULL,
      PRIMARY KEY (campaign_id, guild_id, channel_id)
    );

    CREATE INDEX IF NOT EXISTS idx_twitch_drops_campaign
    ON twitch_drops_posted(campaign_id);

    CREATE INDEX IF NOT EXISTS idx_twitch_drops_guild
    ON twitch_drops_posted(guild_id);

    CREATE INDEX IF NOT EXISTS idx_twitch_drops_guild_channel
    ON twitch_drops_posted(guild_id, channel_id);
  `);
}

/**
 * Check if a campaign has already been posted to a specific guild/channel combination
 */
export function isCampaignPosted(campaignId: string, guildId: string, channelId: string): boolean {
  const db = getDb();
  const row = db.prepare(`
    SELECT 1 FROM twitch_drops_posted 
    WHERE campaign_id = ? AND guild_id = ? AND channel_id = ?
  `).get(campaignId, guildId, channelId);
  return !!row;
}

/**
 * Mark a campaign as posted to a specific guild/channel combination
 */
export function markCampaignPosted(
  campaignId: string,
  guildId: string,
  channelId: string,
  campaignName: string,
  gameName: string
): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO twitch_drops_posted 
    (campaign_id, guild_id, channel_id, campaign_name, game_name, posted_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(campaignId, guildId, channelId, campaignName, gameName, Date.now());
}

/**
 * Get posted campaigns for a specific guild, ordered by most recent first
 */
export function getPostedCampaignsForGuild(guildId: string, limit = 20): PostedCampaignRecord[] {
  const db = getDb();
  return db.prepare(`
    SELECT 
      campaign_id as campaignId,
      guild_id as guildId,
      channel_id as channelId,
      campaign_name as campaignName,
      game_name as gameName,
      posted_at as postedAt
    FROM twitch_drops_posted
    WHERE guild_id = ?
    ORDER BY posted_at DESC
    LIMIT ?
  `).all(guildId, limit) as PostedCampaignRecord[];
}

/**
 * Clear old posted campaign records older than the specified number of days
 * @returns Number of records deleted
 */
export function clearOldPostedCampaigns(daysToKeep = 30): number {
  const db = getDb();
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const result = db.prepare(`
    DELETE FROM twitch_drops_posted WHERE posted_at < ?
  `).run(cutoff);
  return result.changes;
}
