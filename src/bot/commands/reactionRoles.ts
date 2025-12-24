// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Reaction Roles Commands
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  TextChannel,
} from 'discord.js';
import { getGuildSettings } from '../../database/repositories/settingsRepo.js';
import { 
  createReactionRolePanel,
  getReactionRolePanels,
  addReactionRole,
  getReactionRolesByPanel,
  deleteReactionRolePanel,
} from '../../database/repositories/reactionRolesRepo.js';
import { t, Locale } from '../../utils/i18n.js';

export async function handleReactionRoles(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
    return;
  }

  const settings = getGuildSettings(interaction.guild.id);
  const locale = (settings.language || 'en') as Locale;
  
  if (!settings.enableReactionRoles) {
    await interaction.reply({ 
      content: '❌ Reaction roles are disabled on this server. An admin can enable it in `/setup`.', 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }

  if (!interaction.memberPermissions?.has('ManageRoles')) {
    await interaction.reply({ content: '❌ You need Manage Roles permission.', flags: MessageFlags.Ephemeral });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'create':
      await handleCreate(interaction, locale);
      break;
    case 'add':
      await handleAdd(interaction, locale);
      break;
    case 'list':
      await handleList(interaction, locale);
      break;
    case 'delete':
      await handleDelete(interaction, locale);
      break;
  }
}

async function handleCreate(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const title = interaction.options.getString('title', true);
  const description = interaction.options.getString('description');
  const channel = interaction.options.getChannel('channel') as TextChannel || interaction.channel as TextChannel;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description || 'React to get a role!')
    .setColor(0x5865F2)
    .setFooter({ text: 'Click a reaction to get the role' });

  try {
    const message = await channel.send({ embeds: [embed] });
    const panelId = createReactionRolePanel(
      interaction.guild!.id,
      channel.id,
      message.id,
      title,
      description
    );

    await interaction.reply({
      content: `✅ Reaction role panel created! (ID: ${panelId})\n` +
        `Use \`/reactionroles add panel_id:${panelId} emoji:😀 role:@Role\` to add roles.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    await interaction.reply({ content: '❌ Failed to create panel. Check bot permissions.', flags: MessageFlags.Ephemeral });
  }
}

async function handleAdd(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const panelId = interaction.options.getInteger('panel_id', true);
  const emoji = interaction.options.getString('emoji', true);
  const role = interaction.options.getRole('role', true);

  const panels = getReactionRolePanels(interaction.guild!.id);
  const panel = panels.find(p => p.id === panelId);

  if (!panel) {
    await interaction.reply({ content: '❌ Panel not found.', flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    const channel = interaction.guild!.channels.cache.get(panel.channelId) as TextChannel;
    if (!channel) throw new Error('Channel not found');

    const message = await channel.messages.fetch(panel.messageId);
    await message.react(emoji);

    addReactionRole(interaction.guild!.id, panelId, emoji, role.id);

    const existingRoles = getReactionRolesByPanel(panelId);
    const roleList = existingRoles.map(r => {
      const guildRole = interaction.guild!.roles.cache.get(r.roleId);
      return `${r.emoji} → ${guildRole?.name || 'Unknown'}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle(panel.title)
      .setDescription((panel.description || 'React to get a role!') + '\n\n' + roleList)
      .setColor(0x5865F2)
      .setFooter({ text: 'Click a reaction to get the role' });

    await message.edit({ embeds: [embed] });

    await interaction.reply({
      content: `✅ Added ${emoji} → ${role.name} to the panel!`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[ReactionRoles] Error adding role:', error);
    await interaction.reply({ content: '❌ Failed to add reaction role.', flags: MessageFlags.Ephemeral });
  }
}

async function handleList(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const panels = getReactionRolePanels(interaction.guild!.id);

  if (panels.length === 0) {
    await interaction.reply({ content: '📭 No reaction role panels found.', flags: MessageFlags.Ephemeral });
    return;
  }

  const lines = panels.map(p => {
    const roles = getReactionRolesByPanel(p.id);
    const channel = interaction.guild!.channels.cache.get(p.channelId);
    return `**ID: ${p.id}** — ${p.title}\n` +
      `  📍 ${channel?.name || 'Unknown'} | 🎭 ${roles.length} roles`;
  });

  const embed = new EmbedBuilder()
    .setTitle('🎭 Reaction Role Panels')
    .setDescription(lines.join('\n\n'))
    .setColor(0x5865F2);

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleDelete(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const panelId = interaction.options.getInteger('panel_id', true);

  const panels = getReactionRolePanels(interaction.guild!.id);
  const panel = panels.find(p => p.id === panelId);

  if (!panel) {
    await interaction.reply({ content: '❌ Panel not found.', flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    const channel = interaction.guild!.channels.cache.get(panel.channelId) as TextChannel;
    if (channel) {
      const message = await channel.messages.fetch(panel.messageId).catch(() => null);
      if (message) await message.delete().catch(() => {});
    }
  } catch { }

  deleteReactionRolePanel(panelId);

  await interaction.reply({
    content: `✅ Deleted panel **${panel.title}** (ID: ${panelId}).`,
    flags: MessageFlags.Ephemeral,
  });
}
