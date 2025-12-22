// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler - Version command
// Licensed under MIT License

import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { BOT_VERSION } from '../../config/version.js';
import os from 'os';
import process from 'process';
import { getLocale } from './utils.js';
import { t } from '../../utils/i18n.js';

export async function handleVersion(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  const uptime = process.uptime();
  const uptimeFormatted = formatUptime(uptime);
  
  const rss = Math.round(process.memoryUsage().rss / 1024 / 1024);

  const lines = [
    '**🤖 OnceButler Version**',
    '',
    `📦 **Version:** v${BOT_VERSION}`,
    `⏱️ **Uptime:** ${uptimeFormatted}`,
    `💾 **Memory:** ${rss} MB`,
    `📊 **Platform:** ${os.type()} ${os.release()}`,
    `🟢 **Node.js:** ${process.version}`,
    `⚙️ **Environment:** ${process.env.NODE_ENV || 'development'}`,
    '',
    '-# Made with ❤️ by Murr (murr01) • Bot ID: ' + interaction.client.user?.id,
  ];

  await interaction.reply({ content: lines.join('\n'), flags: MessageFlags.Ephemeral });
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.length > 0 ? parts.join(' ') : 'Just started';
}
