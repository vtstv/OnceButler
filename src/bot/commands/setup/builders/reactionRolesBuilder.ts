// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Reaction Roles Setup Builder
// Licensed under MIT License

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';
import type { GuildSettings } from '../../../../database/repositories/settingsRepo.js';
import type { SetupView } from '../types.js';
import { getReactionRolePanels, getReactionRolesByPanel } from '../../../../database/repositories/reactionRolesRepo.js';

export function buildReactionRolesSettings(settings: GuildSettings, guild: any): SetupView {
  const panels = getReactionRolePanels(settings.guildId);
  
  let panelsList = '';
  if (panels.length > 0) {
    panelsList = panels.slice(0, 5).map(p => {
      const roles = getReactionRolesByPanel(p.id);
      const channel = guild?.channels.cache.get(p.channelId);
      return `**#${p.id}** ${p.title}\n   📍 #${channel?.name || 'unknown'} | 🎭 ${roles.length} roles`;
    }).join('\n');
    if (panels.length > 5) {
      panelsList += `\n... and ${panels.length - 5} more`;
    }
  } else {
    panelsList = '_No panels created yet_';
  }

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
        name: '📜 Panels',
        value: panelsList,
        inline: false
      },
      {
        name: '💡 Quick Actions',
        value: '• Create panel: `/reactionroles create`\n• Add role: `/reactionroles add`\n• List panels: `/reactionroles list`',
        inline: false
      }
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_toggle_reactionroles')
        .setLabel(settings.enableReactionRoles ? '⏸️ Disable Reaction Roles' : '▶️ Enable Reaction Roles')
        .setStyle(settings.enableReactionRoles ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('setup_reactionroles_manage')
        .setLabel('📋 Manage Panels')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!settings.enableReactionRoles || panels.length === 0),
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

export function buildReactionRolesManage(guildId: string, guild: any): SetupView {
  const panels = getReactionRolePanels(guildId);

  const embed = new EmbedBuilder()
    .setTitle('📋 Manage Reaction Role Panels')
    .setDescription('Select a panel to view details or delete it.')
    .setColor(0x5865F2);

  if (panels.length === 0) {
    embed.addFields({ name: 'No Panels', value: 'No reaction role panels created yet.\nUse `/reactionroles create` to create one.' });
  } else {
    const panelsList = panels.map(p => {
      const roles = getReactionRolesByPanel(p.id);
      const channel = guild?.channels.cache.get(p.channelId);
      return `**#${p.id}** ${p.title}\n📍 #${channel?.name || 'unknown'} | 🎭 ${roles.length} roles`;
    }).join('\n\n');
    embed.addFields({ name: 'Panels', value: panelsList });
  }

  const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];

  if (panels.length > 0) {
    const panelSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('setup_reactionroles_panel_select')
          .setPlaceholder('🗑️ Select a panel to delete')
          .addOptions(
            panels.slice(0, 25).map(p => ({
              label: p.title,
              value: p.id.toString(),
              description: `Panel #${p.id}`,
            }))
          )
      );
    components.push(panelSelect);
  }

  const backRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_cat_reactionRoles')
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary),
    );
  components.push(backRow);

  return {
    embeds: [embed],
    components,
  };
}
