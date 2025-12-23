// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Economy Commands
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
  User,
} from 'discord.js';
import {
  getWallet,
  addBalance,
  removeBalance,
  transferBalance,
  depositToBank,
  withdrawFromBank,
  getTopBalances,
  getShopItems,
  getShopItem,
  purchaseItem,
  logTransaction,
  updateWallet,
  createShopItem,
  deleteShopItem,
} from '../../database/repositories/economyRepo.js';
import { getGuildSettings, updateGuildSettings } from '../../database/repositories/settingsRepo.js';
import { t } from '../../utils/i18n.js';
import { getLocale, hasAdminPermission } from './utils.js';

const CURRENCY_EMOJI = '🪙';
const CURRENCY_NAME = 'coins';

export async function handleEconomy(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
    return;
  }

  const settings = getGuildSettings(interaction.guild.id);
  if (!settings.enableEconomy) {
    await interaction.reply({ 
      content: '❌ Economy is disabled on this server. An admin can enable it in `/setup`.', 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }

  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand();

  // Handle admin subcommand group
  if (subcommandGroup === 'admin') {
    if (!hasAdminPermission(interaction)) {
      await interaction.reply({ content: '❌ You need admin permissions to use this command.', flags: MessageFlags.Ephemeral });
      return;
    }
    
    switch (subcommand) {
      case 'give':
        await handleAdminGive(interaction);
        break;
      case 'take':
        await handleAdminTake(interaction);
        break;
      case 'additem':
        await handleAdminAddItem(interaction);
        break;
      case 'removeitem':
        await handleAdminRemoveItem(interaction);
        break;
    }
    return;
  }

  switch (subcommand) {
    case 'balance':
      await handleBalance(interaction);
      break;
    case 'daily':
      await handleDaily(interaction);
      break;
    case 'work':
      await handleWork(interaction);
      break;
    case 'pay':
      await handlePay(interaction);
      break;
    case 'deposit':
      await handleDeposit(interaction);
      break;
    case 'withdraw':
      await handleWithdraw(interaction);
      break;
    case 'leaderboard':
      await handleLeaderboard(interaction);
      break;
    case 'shop':
      await handleShop(interaction);
      break;
    case 'buy':
      await handleBuy(interaction);
      break;
  }
}

async function handleBalance(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser('user') ?? interaction.user;
  const wallet = getWallet(interaction.guild!.id, target.id);

  const embed = new EmbedBuilder()
    .setTitle(`${CURRENCY_EMOJI} ${target.username}'s Wallet`)
    .setColor(0xF1C40F)
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      { name: '💰 Cash', value: `${wallet.balance.toLocaleString()} ${CURRENCY_NAME}`, inline: true },
      { name: '🏦 Bank', value: `${wallet.bank.toLocaleString()} ${CURRENCY_NAME}`, inline: true },
      { name: '📊 Total', value: `${(wallet.balance + wallet.bank).toLocaleString()} ${CURRENCY_NAME}`, inline: true },
      { name: '💵 Total Earned', value: `${wallet.totalEarned.toLocaleString()} ${CURRENCY_NAME}`, inline: false },
    );

  await interaction.reply({ embeds: [embed] });
}

async function handleDaily(interaction: ChatInputCommandInteraction): Promise<void> {
  const settings = getGuildSettings(interaction.guild!.id);
  const wallet = getWallet(interaction.guild!.id, interaction.user.id);

  // Check cooldown (24 hours)
  if (wallet.lastDaily) {
    const lastDaily = new Date(wallet.lastDaily);
    const nextDaily = new Date(lastDaily.getTime() + 24 * 60 * 60 * 1000);
    
    if (Date.now() < nextDaily.getTime()) {
      const timeLeft = nextDaily.getTime() - Date.now();
      const hours = Math.floor(timeLeft / (60 * 60 * 1000));
      const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
      
      await interaction.reply({
        content: `⏰ You've already claimed your daily reward!\nCome back in **${hours}h ${minutes}m**.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  const dailyAmount = settings.economyDailyAmount ?? 100;
  
  addBalance(interaction.guild!.id, interaction.user.id, dailyAmount);
  updateWallet(interaction.guild!.id, interaction.user.id, { lastDaily: new Date().toISOString() });
  logTransaction(interaction.guild!.id, interaction.user.id, 'daily', dailyAmount, 'Daily reward');

  const embed = new EmbedBuilder()
    .setTitle('📅 Daily Reward')
    .setDescription(`You claimed your daily reward of **${dailyAmount.toLocaleString()}** ${CURRENCY_EMOJI} ${CURRENCY_NAME}!`)
    .setColor(0x2ECC71)
    .setFooter({ text: 'Come back tomorrow for more!' });

  await interaction.reply({ embeds: [embed] });
}

async function handleWork(interaction: ChatInputCommandInteraction): Promise<void> {
  const settings = getGuildSettings(interaction.guild!.id);
  const wallet = getWallet(interaction.guild!.id, interaction.user.id);

  // Check cooldown (1 hour)
  if (wallet.lastWork) {
    const lastWork = new Date(wallet.lastWork);
    const nextWork = new Date(lastWork.getTime() + 60 * 60 * 1000);
    
    if (Date.now() < nextWork.getTime()) {
      const timeLeft = nextWork.getTime() - Date.now();
      const minutes = Math.floor(timeLeft / (60 * 1000));
      
      await interaction.reply({
        content: `⏰ You're tired! Rest for **${minutes} minutes** before working again.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  const minWork = settings.economyWorkMin ?? 10;
  const maxWork = settings.economyWorkMax ?? 50;
  const workAmount = Math.floor(Math.random() * (maxWork - minWork + 1)) + minWork;

  const workMessages = [
    `You worked as a programmer and earned`,
    `You delivered pizzas and made`,
    `You fixed someone's computer and got`,
    `You walked some dogs and received`,
    `You washed cars and earned`,
    `You helped at a local shop and made`,
    `You tutored students and got`,
    `You streamed games and received`,
  ];

  const message = workMessages[Math.floor(Math.random() * workMessages.length)];

  addBalance(interaction.guild!.id, interaction.user.id, workAmount);
  updateWallet(interaction.guild!.id, interaction.user.id, { lastWork: new Date().toISOString() });
  logTransaction(interaction.guild!.id, interaction.user.id, 'work', workAmount, 'Work income');

  const embed = new EmbedBuilder()
    .setTitle('💼 Work Complete')
    .setDescription(`${message} **${workAmount.toLocaleString()}** ${CURRENCY_EMOJI} ${CURRENCY_NAME}!`)
    .setColor(0x3498DB)
    .setFooter({ text: 'You can work again in 1 hour' });

  await interaction.reply({ embeds: [embed] });
}

async function handlePay(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser('user', true);
  const amount = interaction.options.getInteger('amount', true);

  if (target.id === interaction.user.id) {
    await interaction.reply({ content: '❌ You cannot pay yourself!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (target.bot) {
    await interaction.reply({ content: '❌ You cannot pay bots!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (amount <= 0) {
    await interaction.reply({ content: '❌ Amount must be positive!', flags: MessageFlags.Ephemeral });
    return;
  }

  const success = transferBalance(interaction.guild!.id, interaction.user.id, target.id, amount);

  if (!success) {
    await interaction.reply({ content: '❌ Insufficient balance!', flags: MessageFlags.Ephemeral });
    return;
  }

  logTransaction(interaction.guild!.id, interaction.user.id, 'pay', -amount, `Paid ${target.username}`);
  logTransaction(interaction.guild!.id, target.id, 'receive', amount, `Received from ${interaction.user.username}`);

  const embed = new EmbedBuilder()
    .setTitle('💸 Payment Sent')
    .setDescription(`You sent **${amount.toLocaleString()}** ${CURRENCY_EMOJI} to ${target}!`)
    .setColor(0x2ECC71);

  await interaction.reply({ embeds: [embed] });
}

async function handleDeposit(interaction: ChatInputCommandInteraction): Promise<void> {
  const amount = interaction.options.getInteger('amount', true);

  if (amount <= 0) {
    await interaction.reply({ content: '❌ Amount must be positive!', flags: MessageFlags.Ephemeral });
    return;
  }

  const success = depositToBank(interaction.guild!.id, interaction.user.id, amount);

  if (!success) {
    await interaction.reply({ content: '❌ Insufficient cash balance!', flags: MessageFlags.Ephemeral });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🏦 Deposit Complete')
    .setDescription(`You deposited **${amount.toLocaleString()}** ${CURRENCY_EMOJI} to your bank!`)
    .setColor(0x3498DB);

  await interaction.reply({ embeds: [embed] });
}

async function handleWithdraw(interaction: ChatInputCommandInteraction): Promise<void> {
  const amount = interaction.options.getInteger('amount', true);

  if (amount <= 0) {
    await interaction.reply({ content: '❌ Amount must be positive!', flags: MessageFlags.Ephemeral });
    return;
  }

  const success = withdrawFromBank(interaction.guild!.id, interaction.user.id, amount);

  if (!success) {
    await interaction.reply({ content: '❌ Insufficient bank balance!', flags: MessageFlags.Ephemeral });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🏦 Withdrawal Complete')
    .setDescription(`You withdrew **${amount.toLocaleString()}** ${CURRENCY_EMOJI} from your bank!`)
    .setColor(0x3498DB);

  await interaction.reply({ embeds: [embed] });
}

async function handleLeaderboard(interaction: ChatInputCommandInteraction): Promise<void> {
  const topUsers = getTopBalances(interaction.guild!.id, 10);

  if (topUsers.length === 0) {
    await interaction.reply({ content: '📭 No economy data yet!', flags: MessageFlags.Ephemeral });
    return;
  }

  const leaderboardText = await Promise.all(
    topUsers.map(async (entry, i) => {
      const total = entry.balance + entry.bank;
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
      try {
        const user = await interaction.client.users.fetch(entry.userId);
        return `${medal} ${user.username} — **${total.toLocaleString()}** ${CURRENCY_EMOJI}`;
      } catch {
        return `${medal} Unknown User — **${total.toLocaleString()}** ${CURRENCY_EMOJI}`;
      }
    })
  );

  const embed = new EmbedBuilder()
    .setTitle(`${CURRENCY_EMOJI} Economy Leaderboard`)
    .setDescription(leaderboardText.join('\n'))
    .setColor(0xF1C40F)
    .setFooter({ text: `Top ${topUsers.length} richest members` });

  await interaction.reply({ embeds: [embed] });
}

async function handleShop(interaction: ChatInputCommandInteraction): Promise<void> {
  const items = getShopItems(interaction.guild!.id);

  if (items.length === 0) {
    await interaction.reply({ 
      content: '🏪 The shop is empty! Admins can add items in `/setup`.', 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🏪 Server Shop')
    .setColor(0x9B59B6)
    .setDescription('Use `/economy buy <item_id>` to purchase an item.\n\n' +
      items.map((item, i) => {
        const stockText = item.stock === -1 ? '∞' : item.stock.toString();
        const roleText = item.roleId ? ` → <@&${item.roleId}>` : '';
        return `**${item.id}.** ${item.name} — **${item.price.toLocaleString()}** ${CURRENCY_EMOJI}\n` +
               `   ${item.description}${roleText}\n` +
               `   📦 Stock: ${stockText}`;
      }).join('\n\n')
    );

  await interaction.reply({ embeds: [embed] });
}

async function handleBuy(interaction: ChatInputCommandInteraction): Promise<void> {
  const itemId = interaction.options.getInteger('item_id', true);
  const item = getShopItem(itemId);

  if (!item || item.guildId !== interaction.guild!.id) {
    await interaction.reply({ content: '❌ Item not found!', flags: MessageFlags.Ephemeral });
    return;
  }

  const result = purchaseItem(interaction.guild!.id, interaction.user.id, itemId);

  if (!result.success) {
    await interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
    return;
  }

  // If item gives a role, add it
  if (item.roleId) {
    try {
      const member = await interaction.guild!.members.fetch(interaction.user.id);
      const role = interaction.guild!.roles.cache.get(item.roleId);
      if (role) {
        await member.roles.add(role, `Purchased from shop: ${item.name}`);
      }
    } catch (error) {
      console.error('[Economy] Failed to add role:', error);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('🛒 Purchase Complete')
    .setDescription(`You bought **${item.name}** for **${item.price.toLocaleString()}** ${CURRENCY_EMOJI}!`)
    .setColor(0x2ECC71);

  await interaction.reply({ embeds: [embed] });
}

async function handleAdminGive(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!hasAdminPermission(interaction)) {
    const locale = getLocale(interaction);
    await interaction.reply({ content: t(locale, 'errors.adminOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const target = interaction.options.getUser('user', true);
  const amount = interaction.options.getInteger('amount', true);

  if (amount <= 0) {
    await interaction.reply({ content: '❌ Amount must be positive!', flags: MessageFlags.Ephemeral });
    return;
  }

  addBalance(interaction.guild!.id, target.id, amount);
  logTransaction(interaction.guild!.id, target.id, 'admin', amount, `Given by ${interaction.user.username}`);

  await interaction.reply({
    content: `✅ Gave **${amount.toLocaleString()}** ${CURRENCY_EMOJI} to ${target}.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleAdminTake(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!hasAdminPermission(interaction)) {
    const locale = getLocale(interaction);
    await interaction.reply({ content: t(locale, 'errors.adminOnly'), flags: MessageFlags.Ephemeral });
    return;
  }

  const target = interaction.options.getUser('user', true);
  const amount = interaction.options.getInteger('amount', true);

  if (amount <= 0) {
    await interaction.reply({ content: '❌ Amount must be positive!', flags: MessageFlags.Ephemeral });
    return;
  }

  const success = removeBalance(interaction.guild!.id, target.id, amount);

  if (!success) {
    await interaction.reply({ content: '❌ User does not have enough balance!', flags: MessageFlags.Ephemeral });
    return;
  }

  logTransaction(interaction.guild!.id, target.id, 'admin', -amount, `Taken by ${interaction.user.username}`);

  await interaction.reply({
    content: `✅ Took **${amount.toLocaleString()}** ${CURRENCY_EMOJI} from ${target}.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleAdminAddItem(interaction: ChatInputCommandInteraction): Promise<void> {
  const name = interaction.options.getString('name', true);
  const description = interaction.options.getString('description', true);
  const price = interaction.options.getInteger('price', true);
  const role = interaction.options.getRole('role');
  const stock = interaction.options.getInteger('stock') ?? -1;

  if (price <= 0) {
    await interaction.reply({ content: '❌ Price must be positive!', flags: MessageFlags.Ephemeral });
    return;
  }

  const itemId = createShopItem(
    interaction.guild!.id,
    name,
    description,
    price,
    role?.id ?? null,
    stock
  );

  const embed = new EmbedBuilder()
    .setTitle('🛍️ Shop Item Added')
    .setColor(0x2ECC71)
    .addFields(
      { name: 'ID', value: `#${itemId}`, inline: true },
      { name: 'Name', value: name, inline: true },
      { name: 'Price', value: `${price.toLocaleString()} ${CURRENCY_EMOJI}`, inline: true },
      { name: 'Description', value: description },
      { name: 'Role Reward', value: role ? `${role}` : 'None', inline: true },
      { name: 'Stock', value: stock === -1 ? 'Unlimited' : stock.toString(), inline: true },
    );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleAdminRemoveItem(interaction: ChatInputCommandInteraction): Promise<void> {
  const itemId = interaction.options.getInteger('item_id', true);

  const item = getShopItem(itemId);
  if (!item || item.guildId !== interaction.guild!.id) {
    await interaction.reply({ content: '❌ Item not found!', flags: MessageFlags.Ephemeral });
    return;
  }

  deleteShopItem(itemId);

  await interaction.reply({
    content: `✅ Removed item **${item.name}** (ID: #${itemId}) from the shop.`,
    flags: MessageFlags.Ephemeral,
  });
}
