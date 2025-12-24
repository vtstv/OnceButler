// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler - Slash commands registration
// Licensed under MIT License

import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { config } from 'dotenv';
config();

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;

const commands = [
  new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Manage OnceButler roles')
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
    .addSubcommand(sub =>
      sub.setName('preset')
        .setDescription('Set role names preset (language for role names)')
        .addStringOption(opt =>
          opt.setName('preset')
            .setDescription('Preset')
            .setRequired(true)
            .addChoices(
              { name: '🇺🇸 English roles', value: 'en' },
              { name: '🇷🇺 Русские роли', value: 'ru' },
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
    .setDescription('Configure OnceButler for this server (required before bot starts working)'),

  new SlashCommandBuilder()
    .setName('hug')
    .setDescription('Give someone a warm hug and share your mood!')
    .addUserOption(opt => opt.setName('user').setDescription('User to hug').setRequired(true)),

  new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Challenge another user to a duel!')
    .addUserOption(opt => opt.setName('opponent').setDescription('User to challenge').setRequired(true)),

  // Giveaway commands
  new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
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

  // Mini-games commands
  new SlashCommandBuilder()
    .setName('games')
    .setDescription('Casino mini-games')
    .addSubcommand(sub =>
      sub.setName('coinflip')
        .setDescription('Flip a coin and bet on the result')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet').setRequired(true))
        .addStringOption(opt => 
          opt.setName('choice')
            .setDescription('Heads or tails')
            .setRequired(true)
            .addChoices(
              { name: '🪙 Heads', value: 'heads' },
              { name: '🌙 Tails', value: 'tails' },
            )))
    .addSubcommand(sub =>
      sub.setName('slots')
        .setDescription('Play the slot machine')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('roulette')
        .setDescription('Play roulette')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet').setRequired(true))
        .addStringOption(opt =>
          opt.setName('choice')
            .setDescription('What to bet on')
            .setRequired(true)
            .addChoices(
              { name: '🔴 Red', value: 'red' },
              { name: '⚫ Black', value: 'black' },
              { name: '🟢 Green (0)', value: 'green' },
              { name: 'Odd', value: 'odd' },
              { name: 'Even', value: 'even' },
              { name: 'Low (1-18)', value: 'low' },
              { name: 'High (19-36)', value: 'high' },
            )))
    .addSubcommand(sub =>
      sub.setName('blackjack')
        .setDescription('Play blackjack against the dealer')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('dice')
        .setDescription('Roll two dice and guess the total')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet').setRequired(true))
        .addIntegerOption(opt => 
          opt.setName('target')
            .setDescription('Target total (2-12)')
            .setRequired(true)
            .setMinValue(2)
            .setMaxValue(12))),

  // Casino interactive menu
  new SlashCommandBuilder()
    .setName('casino')
    .setDescription('Open the interactive casino menu'),

  // Leveling commands
  new SlashCommandBuilder()
    .setName('level')
    .setDescription('Leveling system commands')
    .addSubcommand(sub =>
      sub.setName('rank')
        .setDescription('Check your or someone\'s level')
        .addUserOption(opt => opt.setName('user').setDescription('User to check (optional)')))
    .addSubcommand(sub =>
      sub.setName('leaderboard')
        .setDescription('View the level leaderboard'))
    .addSubcommand(sub =>
      sub.setName('setlevel')
        .setDescription('Set a user\'s level (Admin only)')
        .addUserOption(opt => opt.setName('user').setDescription('User to set level for').setRequired(true))
        .addIntegerOption(opt => opt.setName('level').setDescription('Level to set').setRequired(true).setMinValue(0).setMaxValue(1000))),

  // Reaction Roles commands
  new SlashCommandBuilder()
    .setName('reactionroles')
    .setDescription('Manage reaction role panels')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a new reaction role panel')
        .addStringOption(opt => opt.setName('title').setDescription('Panel title').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Panel description'))
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel for the panel (default: current)')))
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a role to a panel')
        .addIntegerOption(opt => opt.setName('panel_id').setDescription('Panel ID').setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('Emoji to react with').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all reaction role panels'))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a role from a panel')
        .addIntegerOption(opt => opt.setName('panel_id').setDescription('Panel ID').setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('Emoji to remove').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete a reaction role panel')
        .addIntegerOption(opt => opt.setName('panel_id').setDescription('Panel ID to delete').setRequired(true))),

  // Inventory commands
  new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Manage your inventory and equipment')
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View your inventory'))
    .addSubcommand(sub =>
      sub.setName('equip')
        .setDescription('Equip an item')
        .addIntegerOption(opt => opt.setName('item_id').setDescription('Item ID to equip').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('unequip')
        .setDescription('Unequip an item')
        .addIntegerOption(opt => opt.setName('item_id').setDescription('Item ID to unequip').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('use')
        .setDescription('Use a consumable item (potion)')
        .addIntegerOption(opt => opt.setName('item_id').setDescription('Item ID to use').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('shop')
        .setDescription('View the item shop'))
    .addSubcommand(sub =>
      sub.setName('buy')
        .setDescription('Buy an item from the shop')
        .addIntegerOption(opt => opt.setName('item_id').setDescription('Item ID to buy').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('stats')
        .setDescription('View combat stats from equipment')
        .addUserOption(opt => opt.setName('user').setDescription('User to check (optional)'))),

  // Image Generation
  new SlashCommandBuilder()
    .setName('imagine')
    .setDescription('Generate an image using AI')
    .addStringOption(option =>
      option
        .setName('prompt')
        .setDescription('What do you want to generate?')
        .setRequired(true)
        .setMaxLength(1000)
    )
    .addStringOption(option =>
      option
        .setName('aspect')
        .setDescription('Aspect ratio of the image')
        .setRequired(false)
        .addChoices(
          { name: '1:1 (Square)', value: '1:1' },
          { name: '16:9 (Landscape)', value: '16:9' },
          { name: '9:16 (Portrait)', value: '9:16' },
          { name: '4:3 (Standard)', value: '4:3' },
          { name: '3:4 (Portrait Standard)', value: '3:4' },
        )
    )
    .addIntegerOption(option =>
      option
        .setName('steps')
        .setDescription('Inference steps (Cloudflare only, 4-8)')
        .setRequired(false)
        .setMinValue(4)
        .setMaxValue(8)
    ),
];

const rest = new REST({ version: '10' }).setToken(token);

async function registerCommands(): Promise<void> {
  try {
    console.log('Registering slash commands...');
    const body = commands.map(cmd => cmd.toJSON());
    await rest.put(Routes.applicationCommands(clientId), { body });
    console.log('Slash commands registered successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to register commands:', error);
    process.exit(1);
  }
}

registerCommands();
