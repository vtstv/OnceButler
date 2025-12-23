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

  new SlashCommandBuilder()
    .setName('hug')
    .setDescription('Give someone a warm hug!')
    .addUserOption(opt => opt.setName('user').setDescription('User to hug').setRequired(true)),

  new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Challenge someone to a duel!')
    .addUserOption(opt => opt.setName('opponent').setDescription('User to challenge').setRequired(true)),

  // Giveaway commands
  new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption(opt => opt.setName('prize').setDescription('Prize description').setRequired(true))
        .addStringOption(opt => 
          opt.setName('duration')
            .setDescription('Duration')
            .setRequired(true)
            .addChoices(
              { name: '1 hour', value: '60' },
              { name: '6 hours', value: '360' },
              { name: '1 day', value: '1440' },
              { name: 'Custom (enter minutes)', value: 'custom' },
            ))
        .addStringOption(opt => 
          opt.setName('winners')
            .setDescription('Number of winners')
            .setRequired(true)
            .addChoices(
              { name: '1 winner', value: '1' },
              { name: '3 winners', value: '3' },
              { name: '5 winners', value: '5' },
              { name: 'Custom', value: 'custom' },
            ))
        .addIntegerOption(opt => opt.setName('custom_duration').setDescription('Custom duration in minutes (if custom selected)'))
        .addIntegerOption(opt => opt.setName('custom_winners').setDescription('Custom number of winners (if custom selected)'))
        .addRoleOption(opt => opt.setName('required_role').setDescription('Only this role can participate (optional)'))
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel for giveaway (default: current)')))
    .addSubcommand(sub =>
      sub.setName('end')
        .setDescription('End a giveaway early')
        .addStringOption(opt => opt.setName('message_id').setDescription('Giveaway message ID').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('reroll')
        .setDescription('Reroll winners for a giveaway')
        .addStringOption(opt => opt.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
        .addIntegerOption(opt => opt.setName('count').setDescription('Number of new winners (default: 1)')))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List active giveaways'))
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete a giveaway')
        .addStringOption(opt => opt.setName('message_id').setDescription('Giveaway message ID').setRequired(true))),

  // Economy commands
  new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Economy system commands')
    .addSubcommand(sub =>
      sub.setName('balance')
        .setDescription('Check your balance')
        .addUserOption(opt => opt.setName('user').setDescription('User to check (optional)')))
    .addSubcommand(sub =>
      sub.setName('daily')
        .setDescription('Claim your daily reward'))
    .addSubcommand(sub =>
      sub.setName('work')
        .setDescription('Work to earn money'))
    .addSubcommand(sub =>
      sub.setName('pay')
        .setDescription('Pay another user')
        .addUserOption(opt => opt.setName('user').setDescription('User to pay').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to pay').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('deposit')
        .setDescription('Deposit money to bank')
        .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to deposit').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('withdraw')
        .setDescription('Withdraw money from bank')
        .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to withdraw').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('leaderboard')
        .setDescription('View economy leaderboard'))
    .addSubcommand(sub =>
      sub.setName('shop')
        .setDescription('View available items in shop'))
    .addSubcommand(sub =>
      sub.setName('buy')
        .setDescription('Buy an item from shop')
        .addIntegerOption(opt => opt.setName('item_id').setDescription('Item ID to buy').setRequired(true)))
    .addSubcommandGroup(group =>
      group.setName('admin')
        .setDescription('Admin economy commands')
        .addSubcommand(sub =>
          sub.setName('give')
            .setDescription('Give money to a user')
            .addUserOption(opt => opt.setName('user').setDescription('User to give money').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to give').setRequired(true)))
        .addSubcommand(sub =>
          sub.setName('take')
            .setDescription('Take money from a user')
            .addUserOption(opt => opt.setName('user').setDescription('User to take money from').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to take').setRequired(true)))
        .addSubcommand(sub =>
          sub.setName('additem')
            .setDescription('Add item to shop')
            .addStringOption(opt => opt.setName('name').setDescription('Item name').setRequired(true))
            .addStringOption(opt => opt.setName('description').setDescription('Item description').setRequired(true))
            .addIntegerOption(opt => opt.setName('price').setDescription('Item price').setRequired(true))
            .addRoleOption(opt => opt.setName('role').setDescription('Role to give on purchase (optional)'))
            .addIntegerOption(opt => opt.setName('stock').setDescription('Stock limit (empty = unlimited)')))
        .addSubcommand(sub =>
          sub.setName('removeitem')
            .setDescription('Remove item from shop')
            .addIntegerOption(opt => opt.setName('item_id').setDescription('Item ID to remove').setRequired(true)))),
];
