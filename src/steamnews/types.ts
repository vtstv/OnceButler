// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Steam News Types
// Licensed under MIT License

export interface SteamNewsItem {
  gid: string;
  title: string;
  url: string;
  is_external_url: boolean;
  author: string;
  contents: string;
  feedlabel: string;
  date: number;
  feedname: string;
  feed_type: number;
  appid: number;
  tags?: string[];
}

export interface SteamNewsResponse {
  appnews: {
    appid: number;
    newsitems: SteamNewsItem[];
    count: number;
  };
}

export interface ProcessedNews {
  gid: string;
  guildId: string;
  title: string;
  processedAt: number;
  postedChannelIds: string[];
}

export interface SteamNewsConfig {
  appId: number;
  checkIntervalMinutes: number;
  maxNewsToCheck: number;
  excludePatterns: string[];
  updateKeywords: string[];
}

export const ONCE_HUMAN_CONFIG: SteamNewsConfig = {
  appId: 2139460,
  checkIntervalMinutes: 60,
  maxNewsToCheck: 5,
  excludePatterns: [
    'RaidZone Mode',
    'RaidZone',
    'Fair Play Announcement',
  ],
  updateKeywords: [
    'Update',
    'Version',
    'Patch',
    'Maintenance',
    'Content',
    'Feature',
    'Bug Fix',
    'Hotfix',
  ],
};
