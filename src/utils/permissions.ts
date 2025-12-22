// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Permission Utilities
// Licensed under MIT License

import { GuildMember, PermissionFlagsBits } from 'discord.js';

export function isAdmin(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}
