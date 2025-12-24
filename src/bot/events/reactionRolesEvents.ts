// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Reaction Roles Event Handlers
// Licensed under MIT License

import { 
  MessageReaction, 
  User, 
  PartialMessageReaction, 
  PartialUser,
  GuildMember,
} from 'discord.js';
import { getGuildSettings } from '../../database/repositories/settingsRepo.js';
import { getReactionRole } from '../../database/repositories/reactionRolesRepo.js';

export async function handleReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<void> {
  if (user.bot) return;
  
  try {
    if (reaction.partial) {
      await reaction.fetch();
    }
    if (user.partial) {
      await user.fetch();
    }
  } catch {
    return;
  }

  const guild = reaction.message.guild;
  if (!guild) return;

  const settings = getGuildSettings(guild.id);
  if (!settings.enableReactionRoles) return;

  const emoji = reaction.emoji.id 
    ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` 
    : reaction.emoji.name;
  
  if (!emoji) return;

  const reactionRole = getReactionRole(guild.id, reaction.message.id, emoji);
  if (!reactionRole) return;

  try {
    const member = await guild.members.fetch(user.id);
    if (!member) return;

    const role = guild.roles.cache.get(reactionRole.roleId);
    if (!role) return;

    if (!member.roles.cache.has(role.id)) {
      await member.roles.add(role, 'Reaction role');
    }
  } catch (error) {
    console.error('[ReactionRoles] Failed to add role:', error);
  }
}

export async function handleReactionRemove(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<void> {
  if (user.bot) return;
  
  try {
    if (reaction.partial) {
      await reaction.fetch();
    }
    if (user.partial) {
      await user.fetch();
    }
  } catch {
    return;
  }

  const guild = reaction.message.guild;
  if (!guild) return;

  const settings = getGuildSettings(guild.id);
  if (!settings.enableReactionRoles) return;

  const emoji = reaction.emoji.id 
    ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` 
    : reaction.emoji.name;
  
  if (!emoji) return;

  const reactionRole = getReactionRole(guild.id, reaction.message.id, emoji);
  if (!reactionRole) return;

  try {
    const member = await guild.members.fetch(user.id);
    if (!member) return;

    const role = guild.roles.cache.get(reactionRole.roleId);
    if (!role) return;

    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role, 'Reaction role removed');
    }
  } catch (error) {
    console.error('[ReactionRoles] Failed to remove role:', error);
  }
}
