// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Tick Scheduler
// Licensed under MIT License

import { Client } from 'discord.js';
import { env } from '../config/env.js';
import { processGuildTick } from '../stats/statTick.js';

let tickInterval: NodeJS.Timeout | null = null;

export function startTickScheduler(client: Client): void {
  if (tickInterval) return;

  console.log(`Starting tick scheduler (interval: ${env.tickIntervalMs}ms)`);

  tickInterval = setInterval(async () => {
    try {
      await processGuildTick(client);
    } catch (err) {
      console.error('Tick scheduler error:', err);
    }
  }, env.tickIntervalMs);
}

export function stopTickScheduler(): void {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
    console.log('Tick scheduler stopped');
  }
}
