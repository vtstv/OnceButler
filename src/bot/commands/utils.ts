// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Command Utilities
// Licensed under MIT License

import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits } from 'discord.js';
import { getGuildLanguage, isManager } from '../../database/repositories/settingsRepo.js';
import { isValidLocale, type Locale } from '../../utils/i18n.js';

export function getLocale(interaction: ChatInputCommandInteraction): Locale {
  if (!interaction.guildId) return 'en';
  const lang = getGuildLanguage(interaction.guildId);
  return isValidLocale(lang) ? lang : 'en';
}

export function hasAdminPermission(interaction: ChatInputCommandInteraction): boolean {
  if (!interaction.guild || !interaction.member) return false;
  const member = interaction.member as GuildMember;
  
  // Server admin always has permission
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  
  // Check if member has a manager role
  let memberRoleIds: string[];
  if ('cache' in member.roles) {
    memberRoleIds = member.roles.cache.map(r => r.id);
  } else {
    memberRoleIds = member.roles as unknown as string[];
  }
  
  return isManager(interaction.guild.id, memberRoleIds);
}

export function createProgressBar(value: number): string {
  const clampedValue = Math.max(0, Math.min(100, value));
  const filled = Math.round(clampedValue / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}
