// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Steam News API Client
// Licensed under MIT License

import type { SteamNewsResponse, SteamNewsItem, SteamNewsConfig } from './types.js';

export async function fetchSteamNews(config: SteamNewsConfig): Promise<SteamNewsItem[]> {
  const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${config.appId}&count=${config.maxNewsToCheck}`;
  
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`Steam API returned ${response.status}`);
    }
    
    const data = await response.json() as SteamNewsResponse;
    return data.appnews?.newsitems ?? [];
  } catch (error) {
    console.error('[STEAM NEWS] Failed to fetch news:', error);
    return [];
  }
}

export function isUpdateNews(item: SteamNewsItem, config: SteamNewsConfig): boolean {
  const title = item.title.toLowerCase();
  const content = item.contents.toLowerCase();
  
  return config.updateKeywords.some(keyword => 
    title.includes(keyword.toLowerCase()) || 
    content.includes(keyword.toLowerCase())
  );
}

export function shouldExcludeNews(item: SteamNewsItem, config: SteamNewsConfig): boolean {
  const title = item.title.toLowerCase();
  
  if (title.includes('fair play announcement')) return true;
  if (title.includes('dev blog') && !title.includes('update')) return true;
  
  return false;
}

export function cleanSteamContent(content: string): string {
  return content
    .replace(/\[h2\]/g, '## ')
    .replace(/\[\/h2\]/g, '\n')
    .replace(/\[h3\]/g, '### ')
    .replace(/\[\/h3\]/g, '\n')
    .replace(/\[p\]/g, '')
    .replace(/\[\/p\]/g, '\n')
    .replace(/\[b\]/g, '**')
    .replace(/\[\/b\]/g, '**')
    .replace(/\[i\]/g, '*')
    .replace(/\[\/i\]/g, '*')
    .replace(/\[u\]/g, '__')
    .replace(/\[\/u\]/g, '__')
    .replace(/\[list\]/g, '')
    .replace(/\[\/list\]/g, '')
    .replace(/\[\*\]/g, '• ')
    .replace(/\[img\s*src="[^"]*"\s*\]\[\/img\]/g, '')
    .replace(/\[img\][^\[]*\[\/img\]/g, '')
    .replace(/\[url=[^\]]*\]([^\[]*)\[\/url\]/g, '$1')
    .replace(/\[dynamiclink\s*href="[^"]*"\s*\]\[\/dynamiclink\]/g, '')
    .replace(/\[table[^\]]*\][\s\S]*?\[\/table\]/g, '[таблица опущена]')
    .replace(/\[tr\]|\[\/tr\]|\[td\]|\[\/td\]/g, '')
    .replace(/\{STEAM_CLAN_IMAGE\}[^\s]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function filterRaidZoneContent(content: string): string {
  const lines = content.split('\n');
  const filtered: string[] = [];
  let skipSection = false;
  
  for (const line of lines) {
    const lower = line.toLowerCase();
    
    if (lower.includes('raidzone mode') || lower.includes('raidzone')) {
      skipSection = true;
      continue;
    }
    
    if (skipSection && (line.startsWith('## ') || line.startsWith('### '))) {
      if (!lower.includes('raidzone')) {
        skipSection = false;
      }
    }
    
    if (!skipSection) {
      filtered.push(line);
    }
  }
  
  return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
