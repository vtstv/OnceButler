// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Twitch Drops Service
// Licensed under MIT License

import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import type { TwitchDropsCampaign, TwitchDropsConfig } from './types.js';
import { fetchAllDrops } from './twitchDropsApi.js';
import { initTwitchDropsTable, isCampaignPosted, markCampaignPosted } from './twitchDropsRepo.js';
import { getGuildSettings } from '../database/repositories/settingsRepo.js';

let initialized = false;

/**
 * Initialize the Twitch Drops module
 */
export function initTwitchDrops(): void {
  if (initialized) return;
  initTwitchDropsTable();
  initialized = true;
  console.log('[TWITCH DROPS] Initialized');
}

/**
 * Main processing function for Twitch Drops
 * Checks all guilds with the module enabled and posts new campaigns
 */
export async function processTwitchDrops(client: Client): Promise<void> {
  initTwitchDrops();
  console.log('[TWITCH DROPS] Starting check...');
  
  const guildsWithDrops = getGuildsWithTwitchDrops(client);
  if (guildsWithDrops.length === 0) {
    console.log('[TWITCH DROPS] No configured guilds found');
    return;
  }
  console.log(`[TWITCH DROPS] Checking for ${guildsWithDrops.length} configured guild(s)`);

  // Process each guild independently
  for (const guild of guildsWithDrops) {
    try {
      await processDropsForGuild(client, guild);
    } catch (error) {
      console.error(`[TWITCH DROPS] Error processing guild ${guild.guildId}:`, error);
      // Continue processing other guilds
    }
  }
}

/**
 * Interface for guild configuration
 */
interface GuildDropsConfig {
  guildId: string;
  channelId: string;
  config: TwitchDropsConfig;
}

/**
 * Get all guilds with Twitch Drops module enabled
 */
function getGuildsWithTwitchDrops(client: Client): GuildDropsConfig[] {
  const result: GuildDropsConfig[] = [];
  
  for (const guild of client.guilds.cache.values()) {
    const settings = getGuildSettings(guild.id);
    if (settings.enableTwitchDrops && settings.twitchDropsChannelId && settings.twitchDropsApiKey) {
      result.push({
        guildId: guild.id,
        channelId: settings.twitchDropsChannelId,
        config: {
          apiUrl: settings.twitchDropsApiUrl,
          apiKey: settings.twitchDropsApiKey,
          checkIntervalMinutes: settings.twitchDropsCheckInterval,
        },
      });
    }
  }
  
  return result;
}

/**
 * Process drops for a single guild
 */
async function processDropsForGuild(
  client: Client,
  guildConfig: GuildDropsConfig
): Promise<void> {
  const { guildId, channelId, config } = guildConfig;

  // Fetch drops from API
  const apiResponse = await fetchAllDrops(config);
  if (!apiResponse || !apiResponse.success) {
    console.log(`[TWITCH DROPS] No valid response for guild ${guildId}`);
    return;
  }

  // Get the channel
  const channel = await client.channels.fetch(channelId).catch(() => null) as TextChannel | null;
  if (!channel || !channel.isTextBased()) {
    console.error(`[TWITCH DROPS] Channel ${channelId} not found for guild ${guildId}`);
    return;
  }

  // Process each game's campaigns
  for (const game of apiResponse.games) {
    try {
      // Filter out already-posted campaigns
      const newCampaigns = filterNewCampaigns(game.campaigns, guildId, channelId);
      
      if (newCampaigns.length === 0) {
        continue;
      }

      // Build and send embed for this game
      const embed = buildGameEmbed(game.gameName, newCampaigns);
      await channel.send({ embeds: [embed] });
      
      // Mark campaigns as posted
      for (const campaign of newCampaigns) {
        markCampaignPosted(campaign.id, guildId, channelId, campaign.name, game.gameName);
      }
      
      console.log(`[TWITCH DROPS] Posted ${newCampaigns.length} campaign(s) for ${game.gameName} to guild ${guildId}`);
      
      // Small delay between game notifications
      await delay(1000);
    } catch (error) {
      console.error(`[TWITCH DROPS] Error processing game ${game.gameName} for guild ${guildId}:`, error);
      // Continue with next game
    }
  }
}

/**
 * Filter out campaigns that have already been posted
 */
function filterNewCampaigns(
  campaigns: TwitchDropsCampaign[],
  guildId: string,
  channelId: string
): TwitchDropsCampaign[] {
  return campaigns.filter(campaign => !isCampaignPosted(campaign.id, guildId, channelId));
}

/**
 * Build Discord embed for a game's campaigns
 */
function buildGameEmbed(gameName: string, campaigns: TwitchDropsCampaign[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x9146FF) // Twitch purple
    .setTitle(`🎮 New Twitch Drops: ${gameName}`)
    .setDescription(`${campaigns.length} active campaign(s) available!`)
    .setTimestamp()
    .setFooter({ text: 'Twitch Drops Notifier' });

  // Add a field for each campaign
  for (const campaign of campaigns) {
    const fieldValue = buildCampaignFieldValue(campaign);
    embed.addFields({
      name: campaign.name,
      value: fieldValue,
      inline: false,
    });
  }

  return embed;
}

/**
 * Build a single campaign embed (for testing/preview)
 */
export function buildCampaignEmbed(gameName: string, campaign: TwitchDropsCampaign): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x9146FF) // Twitch purple
    .setTitle(`🎮 ${gameName} - Active Drops`)
    .setDescription(campaign.name)
    .setTimestamp()
    .setFooter({ text: 'Twitch Drops Notifier' });

  const fieldValue = buildCampaignFieldValue(campaign);
  embed.addFields({
    name: 'Campaign Details',
    value: fieldValue,
    inline: false,
  });

  return embed;
}

/**
 * Build the field value for a campaign
 */
function buildCampaignFieldValue(campaign: TwitchDropsCampaign): string {
  const lines: string[] = [];
  
  // Campaign status
  lines.push(`Status: ${campaign.status}`);
  
  // Period formatting
  const startDate = new Date(campaign.startAt);
  const endDate = new Date(campaign.endAt);
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  lines.push(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`);
  
  // Drops section
  if (campaign.timeBasedDrops && campaign.timeBasedDrops.length > 0) {
    lines.push('Drops:');
    
    for (const drop of campaign.timeBasedDrops) {
      const rewards = drop.benefitEdges.map(edge => edge.benefit.name).join(', ');
      lines.push(`⏱️ ${rewards} - Watch ${drop.requiredMinutesWatched} minutes`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Utility function to add delay between operations
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
