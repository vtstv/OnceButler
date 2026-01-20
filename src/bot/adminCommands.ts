// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Admin DM Commands
// Licensed under MIT License

import { Client, Message, EmbedBuilder } from 'discord.js';
import { env } from '../config/env.js';
import { addToBlacklist, removeFromBlacklist, getBlacklist } from '../database/repositories/blacklistRepo.js';

export function handleAdminDM(client: Client, message: Message): void {
  console.log(`[ADMIN DM] Received DM from ${message.author.tag} (${message.author.id}): ${message.content}`);
  
  if (message.author.id !== env.adminId) {
    console.log(`[ADMIN DM] User is not admin. Expected: ${env.adminId}`);
    return;
  }
  
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  console.log(`[ADMIN DM] Executing command: ${command}`);

  switch (command) {
    case 'servers':
      handleServersCommand(client, message);
      break;
    case 'blacklist':
      handleBlacklistCommand(client, message, args);
      break;
    case 'leave':
      handleLeaveCommand(client, message, args);
      break;
    case 'register':
      handleRegisterCommand(client, message);
      break;
    case 'help':
      handleHelpCommand(message);
      break;
    default:
      message.reply('Unknown command. Use `!help` for available commands.');
  }
}

function handleServersCommand(client: Client, message: Message): void {
  const guilds = client.guilds.cache.map((g) => ({
    id: g.id,
    name: g.name,
    members: g.memberCount,
  }));

  if (guilds.length === 0) {
    message.reply('Bot is not in any servers.');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🌐 Bot Servers (${guilds.length})`)
    .setColor(0x5865f2)
    .setDescription(
      guilds
        .map((g, i) => `**${i + 1}.** ${g.name}\n└ ID: \`${g.id}\`\n└ Members: ${g.members}`)
        .join('\n\n')
    )
    .setTimestamp();

  message.reply({ embeds: [embed] });
}

function handleBlacklistCommand(client: Client, message: Message, args: string[]): void {
  const action = args[0]?.toLowerCase();

  if (action === 'add') {
    const guildId = args[1];
    const reason = args.slice(2).join(' ') || 'No reason provided';

    if (!guildId) {
      message.reply('Usage: `!blacklist add <guild_id> [reason]`');
      return;
    }

    addToBlacklist(guildId, reason);
    message.reply(`✅ Guild \`${guildId}\` added to blacklist.\nReason: ${reason}`);

    const guild = client.guilds.cache.get(guildId);
    if (guild) {
      guild.leave().catch(() => {});
      message.reply(`🚪 Left guild: **${guild.name}**`);
    }
  } else if (action === 'remove') {
    const guildId = args[1];

    if (!guildId) {
      message.reply('Usage: `!blacklist remove <guild_id>`');
      return;
    }

    removeFromBlacklist(guildId);
    message.reply(`✅ Guild \`${guildId}\` removed from blacklist.`);
  } else if (action === 'list') {
    const blacklist = getBlacklist();

    if (blacklist.length === 0) {
      message.reply('Blacklist is empty.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🚫 Blacklisted Guilds (${blacklist.length})`)
      .setColor(0xed4245)
      .setDescription(
        blacklist
          .map(
            (b, i) =>
              `**${i + 1}.** \`${b.guild_id}\`\n└ Reason: ${b.reason}\n└ Added: <t:${Math.floor(b.added_at / 1000)}:R>`
          )
          .join('\n\n')
      )
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } else {
    message.reply('Usage: `!blacklist <add|remove|list> [guild_id] [reason]`');
  }
}

function handleLeaveCommand(client: Client, message: Message, args: string[]): void {
  const guildId = args[0];

  if (!guildId) {
    message.reply('Usage: `!leave <guild_id>`');
    return;
  }

  const guild = client.guilds.cache.get(guildId);

  if (!guild) {
    message.reply(`❌ Bot is not in guild \`${guildId}\``);
    return;
  }

  const guildName = guild.name;
  guild
    .leave()
    .then(() => message.reply(`✅ Left guild: **${guildName}** (\`${guildId}\`)`))
    .catch((err) => message.reply(`❌ Failed to leave guild: ${err.message}`));
}

function handleHelpCommand(message: Message): void {
  const embed = new EmbedBuilder()
    .setTitle('🛠️ Admin Commands')
    .setColor(0x5865f2)
    .setDescription('Available admin commands for bot management')
    .addFields(
      { name: '!servers', value: 'List all servers the bot is in' },
      { name: '!blacklist add <id> [reason]', value: 'Add a server to blacklist and leave it' },
      { name: '!blacklist remove <id>', value: 'Remove a server from blacklist' },
      { name: '!blacklist list', value: 'Show all blacklisted servers' },
      { name: '!leave <id>', value: 'Leave a specific server' },
      { name: '!register', value: 'Register/update slash commands' },
      { name: '!help', value: 'Show this help message' }
    )
    .setTimestamp();

  message.reply({ embeds: [embed] });
}

async function handleRegisterCommand(client: Client, message: Message): Promise<void> {
  await message.reply('🔄 Registering slash commands...');
  
  try {
    const { commands } = await import('./commands/index.js');
    const { REST, Routes } = await import('discord.js');
    
    const rest = new REST({ version: '10' }).setToken(env.discordToken);
    
    await rest.put(
      Routes.applicationCommands(env.clientId),
      { body: commands.map(cmd => cmd.toJSON()) }
    );
    
    await message.reply(`✅ Successfully registered ${commands.length} slash commands!`);
    console.log(`[ADMIN] Registered ${commands.length} commands via DM`);
  } catch (error) {
    console.error('[ADMIN] Failed to register commands:', error);
    await message.reply(`❌ Failed to register commands: ${(error as Error).message}`);
  }
}
