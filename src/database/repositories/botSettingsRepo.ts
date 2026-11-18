// Copyright (c) 2026 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Global Bot Settings Repository
// Licensed under MIT License

import { getDb } from '../db.js';

export const DEFAULT_STEAM_NEWS_MODEL = 'gemini-2.5-flash';

export function getGlobalSetting(key: string, defaultValue = ''): string {
  try {
    const db = getDb();
    const row = db.prepare('SELECT value FROM bot_global_settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : defaultValue;
  } catch (error) {
    console.error(`[BOT SETTINGS] Failed to get setting ${key}:`, error);
    return defaultValue;
  }
}

export function setGlobalSetting(key: string, value: string): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO bot_global_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, value, Date.now());
  } catch (error) {
    console.error(`[BOT SETTINGS] Failed to set setting ${key}:`, error);
  }
}

export function getSelectedSteamNewsModel(): string {
  return getGlobalSetting('steam_news_gemini_model', DEFAULT_STEAM_NEWS_MODEL);
}

export function setSelectedSteamNewsModel(model: string): void {
  setGlobalSetting('steam_news_gemini_model', model);
}
