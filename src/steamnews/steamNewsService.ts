// Copyright (c) 2026 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Steam News Service
// Licensed under MIT License

import { Client, TextChannel } from 'discord.js';
import { ONCE_HUMAN_CONFIG, getGameConfig, type SteamNewsItem } from './types.js';
import { fetchSteamNews, isUpdateNews, shouldExcludeNews, cleanSteamContent, filterRaidZoneContent } from './steamNewsApi.js';
import { translateAndSummarize } from './geminiService.js';
import { isNewsProcessed, markNewsProcessed, initSteamNewsTable } from './steamNewsRepo.js';
import { getGuildSettings } from '../database/repositories/settingsRepo.js';
import { getEffectiveGuildSteamGames } from '../database/repositories/guildSteamGamesRepo.js';
import { replaceDatesWithTimestamps, parseDateToUnix } from './dateParser.js';

let initialized = false;

export function initSteamNews(): void {
  if (initialized) return;
  initSteamNewsTable();
  initialized = true;
  console.log('[STEAM NEWS] Initialized');
}

/**
 * Sanitizes Gemini output to ensure date field uses valid Discord timestamp
 * and replaces any raw text or hallucinated dates/years (like 2024).
 */
export function sanitizeNewsDates(translatedContent: string, publishTimestamp: number): string {
  const defaultTs = `<t:${publishTimestamp}:F> (<t:${publishTimestamp}:R>)`;
  const publishYear = new Date(publishTimestamp * 1000).getUTCFullYear();

  // Look for section 2: "2. **🗓️ ВРЕМЯ ОБНОВЛЕНИЯ**" or "**🗓️ UPDATE TIME**" followed by text
  const timeSectionRegex = /((\d+\.\s*)?\*{0,2}🗓️?\s*(?:ВРЕМЯ ОБНОВЛЕНИЯ|UPDATE TIME|MAINTENANCE TIME)\*{0,2}\s*[\r\n]+)([^\r\n#]+)/i;

  return translatedContent.replace(timeSectionRegex, (match, header, numPrefix, contentLine) => {
    const trimmed = contentLine.trim();

    // If the line already has a Discord timestamp <t:...>, keep it
    if (trimmed.includes('<t:')) {
      return `${header}${trimmed}`;
    }

    // Try to parse the content line with publication year
    const parsedUnix = parseDateToUnix(trimmed, publishYear);
    if (parsedUnix) {
      return `${header}<t:${parsedUnix}:F> (<t:${parsedUnix}:R>)`;
    }

    // Otherwise fallback to publishTimestamp
    return `${header}${defaultTs}`;
  });
}

interface GuildGameTarget {
  guildId: string;
  appId: number;
  gameName: string;
  channelId: string;
  geminiApiKey: string;
  mode: 'localized' | 'original';
}

function getGuildGameTargets(client: Client): GuildGameTarget[] {
  const targets: GuildGameTarget[] = [];

  for (const guild of client.guilds.cache.values()) {
    const settings = getGuildSettings(guild.id);
    if (!settings.enableSteamNews || !settings.steamNewsGeminiKey) {
      continue;
    }

    const effectiveGames = getEffectiveGuildSteamGames(guild.id);
    for (const game of effectiveGames) {
      if (game.channelId) {
        targets.push({
          guildId: guild.id,
          appId: game.appId,
          gameName: game.gameName,
          channelId: game.channelId,
          geminiApiKey: settings.steamNewsGeminiKey,
          mode: settings.steamNewsMode ?? 'localized',
        });
      }
    }
  }

  return targets;
}

export async function processSteamNews(client: Client): Promise<void> {
  initSteamNews();

  const targets = getGuildGameTargets(client);
  if (targets.length === 0) {
    return;
  }

  // Group targets by appId to fetch news from Steam once per game
  const distinctAppIds = Array.from(new Set(targets.map(t => t.appId)));

  for (const appId of distinctAppIds) {
    const config = getGameConfig(appId);
    const newsItems = await fetchSteamNews(config);
    if (newsItems.length === 0) {
      continue;
    }

    const updateNews = newsItems.filter(item =>
      isUpdateNews(item, config) && !shouldExcludeNews(item, config)
    );

    if (updateNews.length === 0) {
      continue;
    }

    const appTargets = targets.filter(t => t.appId === appId);
    for (const target of appTargets) {
      await processNewsForTarget(client, target, updateNews);
    }
  }
}

/**
 * Force post latest news to a specific guild, ignoring already-posted check.
 * Defaults to Once Human (2139460) if not specified for backward compatibility.
 */
export async function forceSteamNewsPost(
  client: Client,
  guildId: string,
  channelId: string,
  geminiApiKey: string,
  appId: number = 2139460,
  gameName: string = 'Once Human'
): Promise<number> {
  initSteamNews();
  console.log(`[STEAM NEWS] Force posting ${gameName} (AppID: ${appId}) to guild ${guildId}`);

  const config = getGameConfig(appId);
  const newsItems = await fetchSteamNews(config);
  if (newsItems.length === 0) {
    console.log('[STEAM NEWS] No news items fetched');
    return 0;
  }

  const updateNews = newsItems.filter(item =>
    isUpdateNews(item, config) && !shouldExcludeNews(item, config)
  );

  const settings = getGuildSettings(guildId);
  const target: GuildGameTarget = {
    guildId,
    appId,
    gameName,
    channelId,
    geminiApiKey,
    mode: settings.steamNewsMode ?? 'localized',
  };

  if (updateNews.length === 0) {
    console.log('[STEAM NEWS] No relevant update news found');
    const fallback = newsItems.find(item => !shouldExcludeNews(item, config)) ?? newsItems[0];
    if (!fallback) return 0;
    console.log('[STEAM NEWS] Fallback: posting latest available news item');
    return await processNewsForTarget(client, target, [fallback], true);
  }

  return await processNewsForTarget(client, target, [updateNews[0]], true);
}

async function processNewsForTarget(
  client: Client,
  target: GuildGameTarget,
  newsItems: SteamNewsItem[],
  forcePost = false
): Promise<number> {
  const channel = await client.channels.fetch(target.channelId).catch(() => null) as TextChannel | null;
  if (!channel || !channel.isTextBased()) {
    console.log(`[STEAM NEWS] Channel ${target.channelId} not found for guild ${target.guildId}`);
    return 0;
  }

  let postedCount = 0;

  for (const item of newsItems) {
    // Skip already processed unless force mode
    if (!forcePost && isNewsProcessed(item.gid, target.guildId, target.channelId)) {
      continue;
    }

    try {
      // Content filtering: filter RaidZone only for Once Human (2139460)
      const rawCleaned = cleanSteamContent(item.contents);
      const cleanedContent = target.appId === 2139460
        ? filterRaidZoneContent(rawCleaned)
        : rawCleaned;

      const contentWithTimestamps = replaceDatesWithTimestamps(cleanedContent, item.date);
      const translated = await translateAndSummarize(
        contentWithTimestamps,
        target.geminiApiKey,
        { ...item, appid: target.appId },
        target.gameName,
        undefined,
        target.mode
      );

      if (!translated) {
        console.log(`[STEAM NEWS] Failed to translate news ${item.gid} for ${target.gameName}`);
        continue;
      }

      // Sanitize dates in the summary to prevent hallucinated raw text or outdated years
      const sanitizedContent = sanitizeNewsDates(translated, item.date);

      // Build formatted messages
      const messages = buildNewsMessages(item, sanitizedContent, target.gameName);
      for (const msg of messages) {
        await channel.send(msg);
        await delay(500);
      }

      markNewsProcessed(item.gid, target.guildId, target.channelId, item.title);
      console.log(`[STEAM NEWS] Posted ${target.gameName} news "${item.title}" to #${channel.name} in guild ${target.guildId}`);
      postedCount++;

      await delay(2000);
    } catch (error) {
      console.error(`[STEAM NEWS] Error processing news ${item.gid} for ${target.gameName}:`, error);
    }
  }

  return postedCount;
}

export function buildNewsMessages(
  item: SteamNewsItem,
  translatedContent: string,
  gameName: string = 'Once Human'
): string[] {
  const header = `# 📰 ${item.title}\n🔗 <${item.url}>\n\n`;
  const footer = `\n\n─────────────────────────────\n*${gameName} | Новости*`;

  const messages: string[] = [];
  const maxLength = 1900; // Leave room for header/footer

  let remaining = translatedContent;
  let isFirst = true;

  while (remaining.length > 0) {
    let chunk: string;
    const availableLength = isFirst ? maxLength - header.length : maxLength;

    if (remaining.length <= availableLength) {
      chunk = remaining;
      remaining = '';
    } else {
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
