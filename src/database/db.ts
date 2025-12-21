import Database from 'better-sqlite3';
import { join } from 'path';
import { env } from '../config/env.js';
import { ensureDir } from '../utils/file.js';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    ensureDir(env.dataPath);
    const dbPath = join(env.dataPath, 'bot.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
