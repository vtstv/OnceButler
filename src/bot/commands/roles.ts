// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Roles Command
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} from 'discord.js';
import { getRoles, addRole, removeRole, loadRoles } from '../../roles/roleStore.js';
import { importRolesToGuild, exportRolesFromGuild } from '../../roles/roleImporter.js';
import { purgeAllRoles, countManagedRoles } from '../../roles/roleEngine.js';
import { getGuildRolePreset } from '../../database/repositories/settingsRepo.js';
import { t } from '../../utils/i18n.js';
import { getLocale, hasAdminPermission } from './utils.js';
import type { RoleCategory, RoleDefinition } from '../../roles/types.js';

export async function handleRolesCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  
  if (!hasAdminPermission(interaction)) {
    await interaction.reply({ content: t(locale, 'common.noPermission'), flags: MessageFlags.Ephemeral });
    return;
  }
  
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'list':
      await handleList(interaction);
      break;
    case 'add':
      await handleAdd(interaction);
      break;
    case 'remove':
      await handleRemove(interaction);
      break;
    case 'import':
      await handleImport(interaction);
      break;
    case 'export':
      await handleExport(interaction);
      break;
    case 'reload':
      await handleReload(interaction);
      break;
    case 'purge':
      await handlePurge(interaction);
      break;
  }
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  const preset = interaction.guild ? getGuildRolePreset(interaction.guild.id) : 'en';
  const roles = getRoles(preset);
  if (roles.length === 0) {
    await interaction.reply({ content: t(locale, 'roles.list.empty'), flags: MessageFlags.Ephemeral });
    return;
  }

  const grouped = roles.reduce((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {} as Record<string, RoleDefinition[]>);

  let response = `**${t(locale, 'roles.list.title')}** (preset: ${preset})\n`;
  for (const [cat, list] of Object.entries(grouped)) {
    response += `\n__${cat}__\n`;
    for (const r of list) {
      const temp = r.temporary ? `, ${t(locale, 'roles.list.temp')}` : '';
      response += `• ${r.roleId} (${t(locale, 'roles.list.priority')}: ${r.priority}${temp})\n`;
    }
  }

  await interaction.reply({ content: response, flags: MessageFlags.Ephemeral });
}

async function handleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  const name = interaction.options.getString('name', true);
  const category = interaction.options.getString('category', true) as RoleCategory;
  const priority = interaction.options.getInteger('priority', true);
  const temporary = interaction.options.getBoolean('temporary') ?? false;
  const duration = interaction.options.getInteger('duration') ?? null;

  addRole({ roleId: name, category, priority, temporary, durationMinutes: duration });
  await interaction.reply({ content: t(locale, 'roles.add.success', { name }), flags: MessageFlags.Ephemeral });
}

async function handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  const name = interaction.options.getString('name', true);
  const removed = removeRole(name);

  if (removed) {
    await interaction.reply({ content: t(locale, 'roles.remove.success', { name }), flags: MessageFlags.Ephemeral });
  } else {
    await interaction.reply({ content: t(locale, 'roles.remove.notFound', { name }), flags: MessageFlags.Ephemeral });
  }
}

async function handleImport(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  if (!interaction.guild) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const created = await importRolesToGuild(interaction.guild);

  if (created.length === 0) {
    await interaction.editReply(t(locale, 'roles.import.allExist'));
  } else {
    await interaction.editReply(t(locale, 'roles.import.success', { roles: created.join(', ') }));
  }
}

async function handleExport(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  if (!interaction.guild) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const exported = exportRolesFromGuild(interaction.guild);
  await interaction.reply({
    content: t(locale, 'roles.export.success', { count: exported.length.toString() }),
    flags: MessageFlags.Ephemeral,
  });
}

async function handleReload(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  const roles = loadRoles();
  await interaction.reply({ content: t(locale, 'roles.reload.success', { count: roles.length.toString() }), flags: MessageFlags.Ephemeral });
}

async function handlePurge(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getLocale(interaction);
  if (!interaction.guild) {
    await interaction.reply({ content: t(locale, 'common.serverOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const roleCount = countManagedRoles(interaction.guild);
  if (roleCount === 0) {
    await interaction.reply({ content: t(locale, 'roles.purge.noRoles'), flags: MessageFlags.Ephemeral });
    return;
  }

  const confirmButton = new ButtonBuilder()
    .setCustomId('purge_confirm')
    .setLabel(t(locale, 'roles.purge.confirmButton', { count: roleCount.toString() }))
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId('purge_cancel')
    .setLabel(t(locale, 'common.cancel'))
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

  const response = await interaction.reply({
    content: t(locale, 'roles.purge.warning', { count: roleCount.toString() }),
    components: [row],
    flags: MessageFlags.Ephemeral,
  });

  try {
    const buttonInteraction = await response.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 30_000,
    });

    if (buttonInteraction.customId === 'purge_confirm') {
      await buttonInteraction.update({ content: t(locale, 'roles.purge.inProgress'), components: [] });
      const deleted = await purgeAllRoles(interaction.guild);
      await buttonInteraction.editReply(t(locale, 'roles.purge.success', { count: deleted.toString() }));
    } else {
      await buttonInteraction.update({ content: t(locale, 'roles.purge.cancelled'), components: [] });
    }
  } catch {
    await interaction.editReply({ content: t(locale, 'roles.purge.timeout'), components: [] });
  }
}
