import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { env } from '../config/env.js';

export function createClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.GuildMember],
  });
}

export async function loginClient(client: Client): Promise<void> {
  await client.login(env.discordToken);
}
