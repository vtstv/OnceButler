// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - New Modules Setup Builders
// Licensed under MIT License

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} from 'discord.js';
import type { GuildSettings } from '../../../database/repositories/settingsRepo.js';
import type { SetupView } from './types.js';
import { getReactionRolePanels } from '../../../database/repositories/reactionRolesRepo.js';
import { getLevelRoles } from '../../../database/repositories/levelingRepo.js';

export function buildReactionRolesSettings(settings: GuildSettings, guild: any): SetupView {
  const panels = getReactionRolePanels(settings.guildId);
  
  const embed = new EmbedBuilder()
    .setTitle('🎭 Reaction Roles Settings')
    .setDescription('Let members self-assign roles by reacting to messages.')
    .setColor(0x5865F2)
    .addFields(
      { 
        name: '📊 Status', 
        value: settings.enableReactionRoles ? '✅ Enabled' : '❌ Disabled', 
        inline: true 
      },
      { 
        name: '📋 Active Panels', 
        value: `${panels.length} panels`, 
        inline: true 
      },
      {
        name: '💡 How to use',
        value: '1. Enable reaction roles\n2. Use `/reactionroles create` to create a panel\n3. Use `/reactionroles add` to add emoji-role pairs',
        inline: false
      }
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_toggle_reactionroles')
        .setLabel(settings.enableReactionRoles ? '✅ Enabled' : '❌ Disabled')
        .setStyle(settings.enableReactionRoles ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_back')
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary),
    );

  return {
    embeds: [embed],
    components: [row1],
  };
}

export function buildLevelingSettings(settings: GuildSettings, guild: any): SetupView {
  const levelRoles = getLevelRoles(settings.guildId);
  const announcementChannel = settings.levelingAnnouncementChannelId
    ? guild?.channels.cache.get(settings.levelingAnnouncementChannelId)?.name ?? 'Unknown'
    : 'Not set';
  
  const embed = new EmbedBuilder()
    .setTitle('📈 Leveling System Settings')
    .setDescription('Members gain XP from messages and voice activity.')
    .setColor(0x3498DB)
    .addFields(
      { 
        name: '📊 Status', 
        value: settings.enableLeveling ? '✅ Enabled' : '❌ Disabled', 
        inline: true 
      },
      { 
        name: '💬 XP per Message', 
        value: `${settings.levelingXpPerMessage} XP`, 
        inline: true 
      },
      { 
        name: '🎤 XP per Voice Min', 
        value: `${settings.levelingXpPerVoiceMinute} XP`, 
        inline: true 
      },
      { 
        name: '⏱️ XP Cooldown', 
        value: `${settings.levelingXpCooldown} seconds`, 
        inline: true 
      },
      { 
        name: '📢 Announcements', 
        value: `#${announcementChannel}`, 
        inline: true 
      },
      { 
        name: '🔄 Stack Roles', 
        value: settings.levelingStackRoles ? '✅ Yes' : '❌ No (replace)', 
        inline: true 
      },
      { 
        name: '🎭 Level Roles', 
        value: levelRoles.length > 0 
          ? levelRoles.slice(0, 5).map(lr => {
              const role = guild?.roles.cache.get(lr.roleId);
              return `Level ${lr.level} → ${role?.name || 'Unknown'}`;
            }).join('\n') + (levelRoles.length > 5 ? `\n... and ${levelRoles.length - 5} more` : '')
          : 'No level roles configured', 
        inline: false 
      },
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_toggle_leveling')
        .setLabel(settings.enableLeveling ? '✅ Enabled' : '❌ Disabled')
        .setStyle(settings.enableLeveling ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_toggle_leveling_stack')
        .setLabel(settings.levelingStackRoles ? '🔄 Stack: ON' : '🔄 Stack: OFF')
        .setStyle(ButtonStyle.Secondary),
    );

  const xpMessageSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('setup_leveling_xp_message')
        .setPlaceholder('💬 XP per Message')
        .addOptions([
          { label: '5 XP', value: '5', description: 'Low XP gain' },
          { label: '10 XP', value: '10', description: 'Moderate XP gain' },
          { label: '15 XP', value: '15', description: 'Default', default: settings.levelingXpPerMessage === 15 },
          { label: '25 XP', value: '25', description: 'High XP gain' },
          { label: '50 XP', value: '50', description: 'Very high XP gain' },
        ])
    );

  const xpCooldownSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('setup_leveling_cooldown')
        .setPlaceholder('⏱️ XP Cooldown')
        .addOptions([
          { label: '30 seconds', value: '30', description: 'Fast XP gain' },
          { label: '60 seconds', value: '60', description: 'Default', default: settings.levelingXpCooldown === 60 },
          { label: '120 seconds', value: '120', description: 'Slow XP gain' },
          { label: '300 seconds', value: '300', description: '5 minutes' },
        ])
    );

  const channelSelect = new ActionRowBuilder<ChannelSelectMenuBuilder>()
    .addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_leveling_channel')
        .setPlaceholder('📢 Level-up Announcements Channel')
        .setChannelTypes(ChannelType.GuildText)
    );

  const backRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_back')
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary),
    );

  return {
    embeds: [embed],
    components: [row1, xpMessageSelect, xpCooldownSelect, channelSelect, backRow],
  };
}
