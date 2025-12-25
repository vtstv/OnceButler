// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Temporary Voice Channels Service
// Licensed under MIT License

import { 
  VoiceState, 
  ChannelType, 
  PermissionFlagsBits,
  GuildMember,
  VoiceChannel,
  CategoryChannel,
} from 'discord.js';
import { getGuildSettings } from '../database/repositories/settingsRepo.js';
import { getDb } from '../database/db.js';

// Track temp channels in memory for quick lookup
const tempChannels = new Map<string, { ownerId: string; createdAt: number }>();

/**
 * Initialize temp voice service - load existing temp channels from DB
 */
export function initTempVoiceService(): void {
  const db = getDb();
  
  // Create table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS temp_voice_channels (
      channel_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_temp_voice_guild
    ON temp_voice_channels(guild_id);
  `);
  
  // Load existing temp channels into memory
  const rows = db.prepare(`SELECT channel_id, owner_id, created_at FROM temp_voice_channels`).all() as any[];
  for (const row of rows) {
    tempChannels.set(row.channel_id, { 
      ownerId: row.owner_id, 
      createdAt: row.created_at 
    });
  }
  
  console.log(`[TempVoice] Loaded ${tempChannels.size} temp channels from DB`);
}

/**
 * Handle voice state update for temp voice channels
 */
export async function handleTempVoiceUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
  const settings = getGuildSettings(newState.guild.id);
  
  // Skip if module is disabled
  if (!settings.enableTempVoice) return;
  
  // User joined a channel
  if (newState.channelId && !oldState.channelId) {
    await handleVoiceJoin(newState);
  }
  // User switched channels
  else if (newState.channelId && oldState.channelId && newState.channelId !== oldState.channelId) {
    await handleVoiceJoin(newState);
    await handleVoiceLeave(oldState);
  }
  // User left a channel
  else if (!newState.channelId && oldState.channelId) {
    await handleVoiceLeave(oldState);
  }
}

/**
 * Handle user joining a voice channel
 */
async function handleVoiceJoin(state: VoiceState): Promise<void> {
  const settings = getGuildSettings(state.guild.id);
  
  // Check if user joined the trigger channel
  if (state.channelId !== settings.tempVoiceTriggerChannelId) return;
  
  const member = state.member;
  if (!member) return;
  
  // Get category for new channel
  const categoryId = settings.tempVoiceCategoryId;
  if (!categoryId) {
    console.log(`[TempVoice] No category set for guild ${state.guild.id}`);
    return;
  }
  
  try {
    const category = await state.guild.channels.fetch(categoryId) as CategoryChannel | null;
    if (!category || category.type !== ChannelType.GuildCategory) {
      console.log(`[TempVoice] Category ${categoryId} not found or invalid`);
      return;
    }
    
    // Create temp channel
    const channelName = settings.tempVoiceNameTemplate
      .replace('{user}', member.displayName)
      .replace('{username}', member.user.username);
    
    const userLimit = settings.tempVoiceUserLimit;
    
    const newChannel = await state.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: category,
      userLimit: userLimit > 0 ? userLimit : undefined,
      permissionOverwrites: [
        // Owner can manage their channel
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.DeafenMembers,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.PrioritySpeaker,
          ],
        },
      ],
    });
    
    // Move user to new channel
    await member.voice.setChannel(newChannel);
    
    // Track channel
    const now = Date.now();
    tempChannels.set(newChannel.id, { ownerId: member.id, createdAt: now });
    
    // Save to DB
    const db = getDb();
    db.prepare(`
      INSERT INTO temp_voice_channels (channel_id, guild_id, owner_id, created_at)
      VALUES (?, ?, ?, ?)
    `).run(newChannel.id, state.guild.id, member.id, now);
    
    console.log(`[TempVoice] Created channel "${channelName}" for ${member.user.tag}`);
  } catch (error) {
    console.error('[TempVoice] Failed to create temp channel:', error);
  }
}

/**
 * Handle user leaving a voice channel
 */
async function handleVoiceLeave(state: VoiceState): Promise<void> {
  const channelId = state.channelId;
  if (!channelId) return;
  
  // Check if it's a temp channel
  if (!tempChannels.has(channelId)) return;
  
  try {
    const channel = await state.guild.channels.fetch(channelId) as VoiceChannel | null;
    if (!channel) {
      // Channel already deleted
      cleanupTempChannel(channelId);
      return;
    }
    
    // Check if channel is empty
    if (channel.members.size === 0) {
      await channel.delete('Temporary voice channel - empty');
      cleanupTempChannel(channelId);
      console.log(`[TempVoice] Deleted empty channel "${channel.name}"`);
    }
  } catch (error) {
    // Channel might already be deleted
    cleanupTempChannel(channelId);
  }
}

/**
 * Remove temp channel from tracking
 */
function cleanupTempChannel(channelId: string): void {
  tempChannels.delete(channelId);
  
  const db = getDb();
  db.prepare(`DELETE FROM temp_voice_channels WHERE channel_id = ?`).run(channelId);
}

/**
 * Check if a channel is a temp voice channel
 */
export function isTempVoiceChannel(channelId: string): boolean {
  return tempChannels.has(channelId);
}

/**
 * Get temp channel owner
 */
export function getTempChannelOwner(channelId: string): string | null {
  return tempChannels.get(channelId)?.ownerId ?? null;
}

/**
 * Clean up orphaned temp channels (channels that no longer exist)
 */
export async function cleanupOrphanedChannels(guildId: string, guild: any): Promise<number> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT channel_id FROM temp_voice_channels WHERE guild_id = ?
  `).all(guildId) as { channel_id: string }[];
  
  let cleaned = 0;
  
  for (const row of rows) {
    try {
      const channel = await guild.channels.fetch(row.channel_id);
      if (!channel) {
        cleanupTempChannel(row.channel_id);
        cleaned++;
      }
    } catch {
      cleanupTempChannel(row.channel_id);
      cleaned++;
    }
  }
  
  return cleaned;
}
