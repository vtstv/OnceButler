// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Steam News Service
// Licensed under MIT License

import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { ONCE_HUMAN_CONFIG, type SteamNewsItem } from './types.js';
import { fetchSteamNews, isUpdateNews, shouldExcludeNews, cleanSteamContent, filterRaidZoneContent } from './steamNewsApi.js';
import { translateAndSummarize } from './geminiService.js';
import { isNewsProcessed, markNewsProcessed, initSteamNewsTable } from './steamNewsRepo.js';
import { getGuildSettings } from '../database/repositories/settingsRepo.js';

let initialized = false;

export function initSteamNews(): void {
  if (initialized) return;
  initSteamNewsTable();
  initialized = true;
  console.log('[STEAM NEWS] Initialized');
}

export async function processSteamNews(client: Client): Promise<void> {
  initSteamNews();
  console.log('[STEAM NEWS] Starting check...');
  
  const guildsWithNews = getGuildsWithSteamNews(client);
  if (guildsWithNews.length === 0) {
    console.log('[STEAM NEWS] No configured guilds found');
    return;
  }
  console.log(`[STEAM NEWS] Checking for ${guildsWithNews.length} configured guild(s)`);

  const newsItems = await fetchSteamNews(ONCE_HUMAN_CONFIG);
  if (newsItems.length === 0) {
    console.log('[STEAM NEWS] No news items fetched');
    return;
  }

  const updateNews = newsItems.filter(item => 
    isUpdateNews(item, ONCE_HUMAN_CONFIG) && !shouldExcludeNews(item, ONCE_HUMAN_CONFIG)
  );

  if (updateNews.length === 0) {
    console.log('[STEAM NEWS] No relevant update news found');
    return;
  }

  for (const guild of guildsWithNews) {
    await processNewsForGuild(client, guild.guildId, guild.channelId, guild.geminiApiKey, updateNews);
  }
}

interface GuildNewsConfig {
  guildId: string;
  channelId: string;
  geminiApiKey: string;
}

function getGuildsWithSteamNews(client: Client): GuildNewsConfig[] {
  const result: GuildNewsConfig[] = [];
  
  for (const guild of client.guilds.cache.values()) {
    const settings = getGuildSettings(guild.id);
    if (settings.enableSteamNews && settings.steamNewsChannelId && settings.steamNewsGeminiKey) {
      result.push({
        guildId: guild.id,
        channelId: settings.steamNewsChannelId,
        geminiApiKey: settings.steamNewsGeminiKey,
      });
    }
  }
  
  return result;
}

async function processNewsForGuild(
  client: Client,
  guildId: string,
  channelId: string,
  geminiApiKey: string,
  newsItems: SteamNewsItem[]
): Promise<void> {
  const channel = await client.channels.fetch(channelId).catch(() => null) as TextChannel | null;
  if (!channel || !channel.isTextBased()) {
    console.log(`[STEAM NEWS] Channel ${channelId} not found for guild ${guildId}`);
    return;
  }

  for (const item of newsItems) {
    if (isNewsProcessed(item.gid, guildId, channelId)) {
      continue;
    }

    try {
      const cleanedContent = filterRaidZoneContent(cleanSteamContent(item.contents));
      const translated = await translateAndSummarize(cleanedContent, geminiApiKey);
      
      if (!translated) {
        console.log(`[STEAM NEWS] Failed to translate news ${item.gid}`);
        continue;
      }

      // Build formatted message instead of embed
      const messages = buildNewsMessages(item, translated);
      for (const msg of messages) {
        await channel.send(msg);
        await delay(500);
      }
      
      markNewsProcessed(item.gid, guildId, channelId, item.title);
      console.log(`[STEAM NEWS] Posted news "${item.title}" to ${channel.name} in guild ${guildId}`);
      
      await delay(2000);
    } catch (error) {
      console.error(`[STEAM NEWS] Error processing news ${item.gid}:`, error);
    }
  }
}

function buildNewsMessages(item: SteamNewsItem, translatedContent: string): string[] {
  const header = `# 📰 ${item.title}\n🔗 <${item.url}>\n\n`;
  const footer = `\n\n─────────────────────────────\n*Once Human | Новости*`;
  
  const messages: string[] = [];
  const maxLength = 1900; // Leave room for header/footer
  
  // First message with header
  let remaining = translatedContent;
  let isFirst = true;
  
  while (remaining.length > 0) {
    let chunk: string;
    const availableLength = isFirst ? maxLength - header.length : maxLength;
    
    if (remaining.length <= availableLength) {
      chunk = remaining;
      remaining = '';
    } else {
      // Find a good break point (newline or space)
      let breakPoint = remaining.lastIndexOf('\n', availableLength);
      if (breakPoint < availableLength * 0.5) {
        breakPoint = remaining.lastIndexOf(' ', availableLength);
      }
      if (breakPoint < availableLength * 0.3) {
        breakPoint = availableLength;
      }
      chunk = remaining.slice(0, breakPoint);
      remaining = remaining.slice(breakPoint).trim();
    }
    
    if (isFirst) {
      messages.push(header + chunk + (remaining.length === 0 ? footer : ''));
      isFirst = false;
    } else {
      messages.push(chunk + (remaining.length === 0 ? footer : ''));
    }
  }
  
  return messages;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
