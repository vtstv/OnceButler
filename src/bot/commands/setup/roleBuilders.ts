// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Role Builders
// Licensed under MIT License

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  Guild,
} from 'discord.js';
import type { GuildSettings } from '../../../database/repositories/settingsRepo.js';
import { getMapping } from '../../../roles/roleStore.js';
import { getAllBotRoles, getMoodRoles, getEnergyRoles, getActivityRoles, getTimeRoles, getChaosRoles, getAllPresetRoleNames } from '../../../roles/roleRules.js';
import type { RoleCategory } from '../../../roles/types.js';
import type { SetupView, RoleSubCategory } from './types.js';
import { ROLE_COLORS } from './types.js';

function getGuildRoles(guild: any): any[] {
  if (!guild?.roles?.cache) return [];
  if (Array.isArray(guild.roles.cache)) return guild.roles.cache;
  if (typeof guild.roles.cache.values === 'function') return Array.from(guild.roles.cache.values());
  return [];
}

export function buildRolesSettings(settings: GuildSettings, guild: any, subCategory: RoleSubCategory): SetupView {
  const preset = settings.rolePreset;
  const mapping = getMapping(preset);
  const allRoles = getAllPresetRoleNames();
  const allGuildRoles = getGuildRoles(guild);
  
  const existingRoles = allGuildRoles.filter((r: any) => allRoles.includes(r.name));
  const existingCount = existingRoles.length;
  const totalCount = getAllBotRoles(preset).length;
  
  if (subCategory === 'overview') {
    return buildRolesOverview(settings, guild, existingCount, totalCount, mapping, existingRoles, allGuildRoles);
  }
  
  return buildRoleCategoryEditor(settings, guild, subCategory as RoleCategory, mapping, allGuildRoles);
}

function buildRolesOverview(
  settings: GuildSettings, 
  guild: any, 
  existingCount: number, 
  totalCount: number, 
  mapping: any,
  existingRoles: any[],
  allGuildRoles: any[]
): SetupView {
  const preset = settings.rolePreset;
  
  const moodRoles = [mapping.mood.high2, mapping.mood.high1, mapping.mood.mid, mapping.mood.low1, mapping.mood.low2];
  const energyRoles = [mapping.energy.high2, mapping.energy.high1, mapping.energy.mid, mapping.energy.low1, mapping.energy.low2];
  const activityRoles = [mapping.activity.high, mapping.activity.mid1, mapping.activity.mid2, mapping.activity.mid3, mapping.activity.low].filter(Boolean);
  const timeRoles = [mapping.time.night, mapping.time.day, mapping.time.evening];
  const chaosRoles = mapping.chaos;
  
  const countExisting = (roles: string[]) => {
    return roles.filter(r => allGuildRoles.some((gr: any) => gr.name === r)).length;
  };
  
  const embed = new EmbedBuilder()
    .setTitle('🎭 Role Management')
    .setDescription(`Manage dynamic roles for your server.\n\n**Preset:** \`${preset.toUpperCase()}\` | **Created:** ${existingCount}/${totalCount}`)
    .setColor(0x5865F2)
    .addFields(
      { name: '😊 Mood Roles', value: `${countExisting(moodRoles)}/${moodRoles.length} created\n${moodRoles.slice(0,3).join(', ')}...`, inline: true },
      { name: '⚡ Energy Roles', value: `${countExisting(energyRoles)}/${energyRoles.length} created\n${energyRoles.slice(0,3).join(', ')}...`, inline: true },
      { name: '📊 Activity Roles', value: `${countExisting(activityRoles)}/${activityRoles.length} created\n${activityRoles.slice(0,3).join(', ')}...`, inline: true },
      { name: '🌙 Time Roles', value: `${countExisting(timeRoles)}/${timeRoles.length} created\n${timeRoles.join(', ')}`, inline: true },
      { name: '🎲 Chaos Roles', value: `${countExisting(chaosRoles)}/${chaosRoles.length} created\n${chaosRoles.slice(0,3).join(', ')}...`, inline: true },
    );

  const categorySelect = new StringSelectMenuBuilder()
    .setCustomId('setup_roles_category')
    .setPlaceholder('Select category to edit')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('😊 Mood Roles').setValue('mood').setDescription('Edit mood-based roles'),
      new StringSelectMenuOptionBuilder().setLabel('⚡ Energy Roles').setValue('energy').setDescription('Edit energy-based roles'),
      new StringSelectMenuOptionBuilder().setLabel('📊 Activity Roles').setValue('activity').setDescription('Edit activity-based roles'),
      new StringSelectMenuOptionBuilder().setLabel('🌙 Time Roles').setValue('time').setDescription('Edit time-of-day roles'),
      new StringSelectMenuOptionBuilder().setLabel('🎲 Chaos Roles').setValue('chaos').setDescription('Edit random chaos roles'),
    );

  const actionButtons = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_roles_create_all')
        .setLabel('📥 Create All Roles')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('setup_roles_delete_unused')
        .setLabel(existingCount > 0 ? `🗑️ Delete All Bot Roles (${existingCount})` : '🗑️ Delete All Bot Roles')
        .setStyle(existingCount > 0 ? ButtonStyle.Danger : ButtonStyle.Secondary)
        .setDisabled(existingCount === 0),
    );

  const backButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_cat_main')
        .setLabel('◀️ Back to Main')
        .setStyle(ButtonStyle.Secondary),
    );

  const components: ActionRowBuilder<any>[] = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categorySelect),
  ];

  if (existingCount > 0) {
    const roleOptions = existingRoles
      .slice(0, 25)
      .map((r: any) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name.slice(0, 100))
          .setValue(r.id)
          .setDescription(`Delete "${r.name.slice(0, 80)}" from server`)
          .setEmoji('🗑️')
      );

    const deleteSingleSelect = new StringSelectMenuBuilder()
      .setCustomId('setup_roles_delete_single')
      .setPlaceholder('🗑️ Delete a specific bot role...')
      .addOptions(roleOptions);

    components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(deleteSingleSelect));
  }

  components.push(actionButtons, backButton);

  return {
    embeds: [embed],
    components,
  };
}

function buildRoleCategoryEditor(
  settings: GuildSettings, 
  guild: any, 
  category: RoleCategory, 
  mapping: any,
  allGuildRoles?: any[]
): SetupView {
  const categoryNames: Record<string, string> = {
    mood: '😊 Mood Roles',
    energy: '⚡ Energy Roles',
    activity: '📊 Activity Roles',
    time: '🌙 Time Roles',
    chaos: '🎲 Chaos Roles',
  };
  
  const categoryDescriptions: Record<string, string> = {
    mood: 'Roles assigned based on user mood (40-100%)',
    energy: 'Roles assigned based on user energy level',
    activity: 'Roles assigned based on user activity',
    time: 'Roles assigned based on time of day',
    chaos: 'Random temporary roles for fun',
  };
  
  let roles: string[] = [];
  let roleLabels: string[] = [];
  
  switch (category) {
    case 'mood':
      roles = [mapping.mood.high2, mapping.mood.high1, mapping.mood.mid, mapping.mood.low1, mapping.mood.low2];
      roleLabels = ['Very Happy (80%+)', 'Happy (60-80%)', 'Neutral (40-60%)', 'Sad (20-40%)', 'Very Sad (<20%)'];
      break;
    case 'energy':
      roles = [mapping.energy.high2, mapping.energy.high1, mapping.energy.mid, mapping.energy.low1, mapping.energy.low2];
      roleLabels = ['Energized (80%+)', 'Active (60-80%)', 'Normal (40-60%)', 'Tired (15-40%)', 'Exhausted (<15%)'];
      break;
    case 'activity':
      roles = [mapping.activity.high, mapping.activity.mid1, mapping.activity.mid2, mapping.activity.mid3, mapping.activity.low].filter(Boolean);
      roleLabels = ['Very Active (80%+)', 'Active (60-80%)', 'Moderate (40-60%)', 'Low (20-40%)', 'Inactive (<20%)'].slice(0, roles.length);
      break;
    case 'time':
      roles = [mapping.time.night, mapping.time.day, mapping.time.evening];
      roleLabels = ['Night (0-6h)', 'Day (6-18h)', 'Evening (18-24h)'];
      break;
    case 'chaos':
      roles = mapping.chaos;
      roleLabels = roles.map((_: string, i: number) => `Chaos #${i + 1}`);
      break;
  }
  
  const guildRoles = allGuildRoles ?? getGuildRoles(guild);

  const roleStatus = roles.map((r: string) => {
    const exists = guildRoles.some((gr: any) => gr.name === r);
    return exists ? '✅' : '❌';
  });
  
  const embed = new EmbedBuilder()
    .setTitle(categoryNames[category])
    .setDescription(categoryDescriptions[category])
    .setColor(0x5865F2)
    .addFields(
      roles.map((r: string, i: number) => ({
        name: `${roleStatus[i]} ${roleLabels[i]}`,
        value: `\`${r}\``,
        inline: true,
      }))
    );

  const categoryExistingRoles = guildRoles.filter((gr: any) => roles.includes(gr.name));
  const categoryExistingCount = categoryExistingRoles.length;

  const actionButtons = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`setup_roles_create_${category}`)
        .setLabel(`📥 Create ${categoryNames[category].split(' ')[1]} Roles`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`setup_roles_delete_${category}`)
        .setLabel(categoryExistingCount > 0 
          ? `🗑️ Delete ${categoryNames[category].split(' ')[1]} Roles (${categoryExistingCount})` 
          : `🗑️ Delete ${categoryNames[category].split(' ')[1]} Roles`)
        .setStyle(categoryExistingCount > 0 ? ButtonStyle.Danger : ButtonStyle.Secondary)
        .setDisabled(categoryExistingCount === 0),
    );

  const backButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_roles_back')
        .setLabel('◀️ Back to Roles')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_cat_main')
        .setLabel('🏠 Main Menu')
        .setStyle(ButtonStyle.Secondary),
    );

  const components: ActionRowBuilder<any>[] = [];

  if (categoryExistingCount > 0) {
    const roleOptions = categoryExistingRoles
      .slice(0, 25)
      .map((r: any) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name.slice(0, 100))
          .setValue(r.id)
          .setDescription(`Delete "${r.name.slice(0, 80)}" from server`)
          .setEmoji('🗑️')
      );

    const deleteSingleSelect = new StringSelectMenuBuilder()
      .setCustomId('setup_roles_delete_single')
      .setPlaceholder(`🗑️ Delete a ${categoryNames[category].split(' ')[1]} role...`)
      .addOptions(roleOptions);

    components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(deleteSingleSelect));
  }

  components.push(actionButtons, backButton);

  return {
    embeds: [embed],
    components,
  };
}

function findGuildRole(guild: any, predicate: (r: any) => boolean): any {
  if (typeof guild?.roles?.cache?.find === 'function') {
    return guild.roles.cache.find(predicate);
  }
  return getGuildRoles(guild).find(predicate);
}

// Role creation/deletion helpers
export async function createRolesByCategory(guild: Guild, settings: GuildSettings, category: RoleCategory): Promise<string[]> {
  const preset = settings.rolePreset;
  let roles: string[] = [];
  
  switch (category) {
    case 'mood': roles = getMoodRoles(preset); break;
    case 'energy': roles = getEnergyRoles(preset); break;
    case 'activity': roles = getActivityRoles(preset); break;
    case 'time': roles = getTimeRoles(preset); break;
    case 'chaos': roles = getChaosRoles(preset); break;
  }
  
  const created: string[] = [];
  for (const roleName of roles) {
    const existing = findGuildRole(guild, (r: any) => r.name === roleName);
    if (!existing) {
      try {
        const options: any = { name: roleName, reason: 'OnceButler role creation' };
        if (settings.enableRoleColors && ROLE_COLORS[category]) {
          options.color = ROLE_COLORS[category];
        }
        await guild.roles.create(options);
        created.push(roleName);
      } catch (err) {
        console.error(`Failed to create role ${roleName}:`, err);
      }
    }
  }
  return created;
}

export async function deleteRolesByCategory(guild: Guild, settings: GuildSettings, category: RoleCategory): Promise<string[]> {
  let roles: string[] = [];
  
  switch (category) {
    case 'mood': roles = [...new Set([...getMoodRoles('en'), ...getMoodRoles('ru')])]; break;
    case 'energy': roles = [...new Set([...getEnergyRoles('en'), ...getEnergyRoles('ru')])]; break;
    case 'activity': roles = [...new Set([...getActivityRoles('en'), ...getActivityRoles('ru')])]; break;
    case 'time': roles = [...new Set([...getTimeRoles('en'), ...getTimeRoles('ru')])]; break;
    case 'chaos': roles = [...new Set([...getChaosRoles('en'), ...getChaosRoles('ru')])]; break;
  }
  
  const deleted: string[] = [];
  for (const roleName of roles) {
    const role = findGuildRole(guild, (r: any) => r.name === roleName);
    if (role) {
      try {
        await role.delete('OnceButler role cleanup');
        deleted.push(roleName);
      } catch (err) {
        console.error(`Failed to delete role ${roleName}:`, err);
      }
    }
  }
  return deleted;
}
