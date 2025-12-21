import { config } from 'dotenv';
config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
}

export const env = {
  discordToken: requireEnv('DISCORD_TOKEN'),
  clientId: requireEnv('DISCORD_CLIENT_ID'),
  dataPath: process.env.DATA_PATH || './data',
  tickIntervalMs: 60_000,
  roleUpdateCooldownMs: 30_000,
  chaosIntervalMs: 6 * 60 * 60 * 1000,
  chaosDurationMs: 60 * 60 * 1000,
  chaosChance: 0.05,
};
