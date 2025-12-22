// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Command Definitions
// Licensed under MIT License

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Manage OnceButler roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List all managed roles'))
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add or update a role definition')
        .addStringOption(opt => opt.setName('name').setDescription('Role name').setRequired(true))
        .addStringOption(opt =>
          opt.setName('category')
            .setDescription('Role category')
            .setRequired(true)
            .addChoices(
              { name: 'mood', value: 'mood' },
              { name: 'energy', value: 'energy' },
              { name: 'activity', value: 'activity' },
              { name: 'time', value: 'time' },
              { name: 'chaos', value: 'chaos' },
            ))
        .addIntegerOption(opt => opt.setName('priority').setDescription('Priority (higher = better)').setRequired(true))
        .addBooleanOption(opt => opt.setName('temporary').setDescription('Is temporary role'))
        .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes (for temp roles)')))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a role from JSON storage')
        .addStringOption(opt => opt.setName('name').setDescription('Role name').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('import').setDescription('Import roles from JSON to Discord'))
    .addSubcommand(sub =>
      sub.setName('export').setDescription('Export Discord roles to JSON'))
    .addSubcommand(sub =>
      sub.setName('reload').setDescription('Reload role definitions from disk'))
    .addSubcommand(sub =>
      sub.setName('purge').setDescription('Delete ALL bot-managed roles from Discord')),

  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View your current stats'),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leaderboard')
    .addStringOption(opt =>
      opt.setName('stat')
        .setDescription('Stat to rank by')
        .setRequired(true)
        .addChoices(
          { name: 'Mood', value: 'mood' },
          { name: 'Energy', value: 'energy' },
          { name: 'Activity', value: 'activity' },
        )),

  new SlashCommandBuilder()
    .setName('trigger')
    .setDescription('Manage custom stat triggers')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a new trigger')
        .addStringOption(opt => opt.setName('name').setDescription('Trigger name').setRequired(true))
        .addStringOption(opt =>
          opt.setName('stat')
            .setDescription('Stat to modify')
            .setRequired(true)
            .addChoices(
              { name: 'Mood', value: 'mood' },
              { name: 'Energy', value: 'energy' },
              { name: 'Activity', value: 'activity' },
            ))
        .addNumberOption(opt => opt.setName('modifier').setDescription('Stat modifier per tick (can be negative)').setRequired(true))
        .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes (empty = permanent)')))
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List all triggers'))
    .addSubcommand(sub =>
      sub.setName('stop')
        .setDescription('Stop a trigger')
        .addIntegerOption(opt => opt.setName('id').setDescription('Trigger ID').setRequired(true))),

  new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('View your achievements'),

  new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Bot settings for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('language')
        .setDescription('Set bot language for this server')
        .addStringOption(opt =>
          opt.setName('lang')
            .setDescription('Language')
            .setRequired(true)
            .addChoices(
              { name: '🇺🇸 English', value: 'en' },
              { name: '🇷🇺 Русский', value: 'ru' },
              { name: '🇩🇪 Deutsch', value: 'de' },
            )))
    .addSubcommandGroup(group =>
      group.setName('managers')
        .setDescription('Manage bot manager roles')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Add a manager role')
            .addRoleOption(opt => opt.setName('role').setDescription('Role to add').setRequired(true)))
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a manager role')
            .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true)))
        .addSubcommand(sub =>
          sub.setName('list')
            .setDescription('List all manager roles'))),

  new SlashCommandBuilder()
    .setName('version')
    .setDescription('Display bot version and system information'),

  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure OnceButler for this server (required before bot starts working)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];
