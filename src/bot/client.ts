// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler - Discord client initialization
// Licensed under MIT License

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { env } from '../config/env.js';

export let client: Client;

export function createClient(): Client {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.GuildMember, Partials.Message, Partials.Reaction],
  });
  return client;
}

export async function loginClient(client: Client): Promise<void> {
  await client.login(env.discordToken);
}
