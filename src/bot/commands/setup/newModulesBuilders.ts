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
  RoleSelectMenuBuilder,
  ChannelType,
} from 'discord.js';
import type { GuildSettings } from '../../../database/repositories/settingsRepo.js';
import type { SetupView } from './types.js';
import { getReactionRolePanels, getReactionRolesByPanel } from '../../../database/repositories/reactionRolesRepo.js';
import { getLevelRoles, removeLevelRole } from '../../../database/repositories/levelingRepo.js';

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
      const rolesList = roles.slice(0, 3).map(r => {
        const role = guild?.roles.cache.get(r.roleId);
        return `${r.emoji} → ${role?.name || 'Unknown'}`;
      }).join(', ');
      return `**#${p.id}** ${p.title}\n   📍 #${channel?.name || 'unknown'}\n   🎭 ${rolesList || 'No roles'}${roles.length > 3 ? ` (+${roles.length - 3} more)` : ''}`;
    }).join('\n\n');
    embed.addFields({ name: 'Panels', value: panelsList });
  }

  const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];

  if (panels.length > 0) {
    const panelSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('setup_reactionroles_select_panel')
          .setPlaceholder('🗑️ Select a panel to delete')
          .addOptions(
            panels.slice(0, 25).map(p => {
              const roles = getReactionRolesByPanel(p.id);
              return {
                label: `#${p.id} - ${p.title}`,
                value: p.id.toString(),
                description: `${roles.length} roles configured`,
              };
            })
          )
      );
    components.push(panelSelect);
  }

  const backRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_cat_reactionroles')
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary),
    );
  components.push(backRow);

  return {
    embeds: [embed],
    components,
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
        .setLabel(settings.enableLeveling ? '⏸️ Disable Leveling' : '▶️ Enable Leveling')
        .setStyle(settings.enableLeveling ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('setup_toggle_leveling_stack')
        .setLabel(settings.levelingStackRoles ? '🔄 Stack: ON' : '🔄 Stack: OFF')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!settings.enableLeveling),
      new ButtonBuilder()
        .setCustomId('setup_leveling_add_role')
        .setLabel('➕ Add Level Role')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!settings.enableLeveling),
      new ButtonBuilder()
        .setCustomId('setup_leveling_manage_roles')
        .setLabel('📋 Manage Roles')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!settings.enableLeveling || levelRoles.length === 0),
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

export function buildLevelingAddRole(settings: GuildSettings): SetupView {
  const embed = new EmbedBuilder()
    .setTitle('➕ Add Level Role')
    .setDescription('Select a role to assign at a specific level.')
    .setColor(0x3498DB);

  const roleSelect = new ActionRowBuilder<RoleSelectMenuBuilder>()
    .addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('setup_leveling_role_select')
        .setPlaceholder('Select a role')
    );

  const levelSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('setup_leveling_level_select')
        .setPlaceholder('Select level to assign role at')
        .addOptions([
          { label: 'Level 1', value: '1' },
          { label: 'Level 5', value: '5' },
          { label: 'Level 10', value: '10' },
          { label: 'Level 15', value: '15' },
          { label: 'Level 20', value: '20' },
          { label: 'Level 25', value: '25' },
          { label: 'Level 30', value: '30' },
          { label: 'Level 40', value: '40' },
          { label: 'Level 50', value: '50' },
          { label: 'Level 75', value: '75' },
          { label: 'Level 100', value: '100' },
        ])
    );

  const backRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_cat_leveling')
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary),
    );

  return {
    embeds: [embed],
    components: [roleSelect, levelSelect, backRow],
  };
}

export function buildLevelingManageRoles(settings: GuildSettings, guild: any): SetupView {
  const levelRoles = getLevelRoles(settings.guildId);
  
  const embed = new EmbedBuilder()
    .setTitle('📋 Manage Level Roles')
    .setDescription('Select a level role to remove it.')
    .setColor(0x3498DB);

  if (levelRoles.length === 0) {
    embed.addFields({ name: 'No Level Roles', value: 'No level roles configured yet.' });
  } else {
    const rolesList = levelRoles.map(lr => {
      const role = guild?.roles.cache.get(lr.roleId);
      return `Level ${lr.level} → ${role?.name || 'Unknown Role'}`;
    }).join('\n');
    embed.addFields({ name: 'Current Level Roles', value: rolesList });
  }

  const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];

  if (levelRoles.length > 0) {
    const roleSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('setup_leveling_delete_role')
          .setPlaceholder('🗑️ Select a role to remove')
          .addOptions(
            levelRoles.slice(0, 25).map(lr => {
              const role = guild?.roles.cache.get(lr.roleId);
              return {
                label: `Level ${lr.level} - ${role?.name || 'Unknown'}`,
                value: lr.id.toString(),
                description: `Remove role at level ${lr.level}`,
              };
            })
          )
      );
    components.push(roleSelect);
  }

  const backRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_cat_leveling')
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary),
    );
  components.push(backRow);

  return {
    embeds: [embed],
    components,
  };
}
