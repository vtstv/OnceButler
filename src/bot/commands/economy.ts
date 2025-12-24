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
import { t, Locale } from '../../utils/i18n.js';
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
import { getLocale, hasAdminPermission } from './utils.js';

const CURRENCY_EMOJI = '🪙';
const CURRENCY_NAME = 'coins';

export async function handleEconomy(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
    return;
  }

  const locale = getLocale(interaction);
  const settings = getGuildSettings(interaction.guild.id);
  if (!settings.enableEconomy) {
    await interaction.reply({ 
      content: t(locale, 'economy.disabled'), 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }

  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand();

  // Handle admin subcommand group
  if (subcommandGroup === 'admin') {
    if (!hasAdminPermission(interaction)) {
      await interaction.reply({ content: t(locale, 'errors.adminOnly'), flags: MessageFlags.Ephemeral });
      return;
    }
    
    switch (subcommand) {
      case 'give':
        await handleAdminGive(interaction, locale);
        break;
      case 'take':
        await handleAdminTake(interaction, locale);
        break;
      case 'additem':
        await handleAdminAddItem(interaction, locale);
        break;
      case 'removeitem':
        await handleAdminRemoveItem(interaction, locale);
        break;
    }
    return;
  }

  switch (subcommand) {
    case 'balance':
      await handleBalance(interaction, locale);
      break;
    case 'daily':
      await handleDaily(interaction, locale);
      break;
    case 'work':
      await handleWork(interaction, locale);
      break;
    case 'pay':
      await handlePay(interaction, locale);
      break;
    case 'deposit':
      await handleDeposit(interaction, locale);
      break;
    case 'withdraw':
      await handleWithdraw(interaction, locale);
      break;
    case 'leaderboard':
      await handleLeaderboard(interaction, locale);
      break;
    case 'shop':
      await handleShop(interaction, locale);
      break;
    case 'buy':
      await handleBuy(interaction, locale);
      break;
  }
}

async function handleBalance(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const target = interaction.options.getUser('user') ?? interaction.user;
  const wallet = getWallet(interaction.guild!.id, target.id);

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'economy.balance.title', { user: target.username }))
    .setColor(0xF1C40F)
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      { name: t(locale, 'economy.balance.cash'), value: `${wallet.balance.toLocaleString()} ${CURRENCY_NAME}`, inline: true },
      { name: t(locale, 'economy.balance.bank'), value: `${wallet.bank.toLocaleString()} ${CURRENCY_NAME}`, inline: true },
      { name: t(locale, 'economy.balance.total'), value: `${(wallet.balance + wallet.bank).toLocaleString()} ${CURRENCY_NAME}`, inline: true },
      { name: t(locale, 'economy.balance.earned'), value: `${wallet.totalEarned.toLocaleString()} ${CURRENCY_NAME}`, inline: false },
    );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleDaily(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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
        content: t(locale, 'economy.daily.cooldown', { hours: hours.toString(), minutes: minutes.toString() }),
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
    .setTitle(t(locale, 'economy.daily.title'))
    .setDescription(t(locale, 'economy.daily.claimed', { amount: dailyAmount.toLocaleString(), emoji: CURRENCY_EMOJI }))
    .setColor(0x2ECC71)
    .setFooter({ text: t(locale, 'economy.daily.footer') });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleWork(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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
        content: t(locale, 'economy.work.cooldown', { minutes: minutes.toString() }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  const minWork = settings.economyWorkMin ?? 10;
  const maxWork = settings.economyWorkMax ?? 50;
  const workAmount = Math.floor(Math.random() * (maxWork - minWork + 1)) + minWork;

  const workKeys = ['economy.work.msg1', 'economy.work.msg2', 'economy.work.msg3', 'economy.work.msg4', 
                    'economy.work.msg5', 'economy.work.msg6', 'economy.work.msg7', 'economy.work.msg8'];
  const message = t(locale, workKeys[Math.floor(Math.random() * workKeys.length)]);

  addBalance(interaction.guild!.id, interaction.user.id, workAmount);
  updateWallet(interaction.guild!.id, interaction.user.id, { lastWork: new Date().toISOString() });
  logTransaction(interaction.guild!.id, interaction.user.id, 'work', workAmount, 'Work income');

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'economy.work.title'))
    .setDescription(`${message} **${workAmount.toLocaleString()}** ${CURRENCY_EMOJI} ${CURRENCY_NAME}!`)
    .setColor(0x3498DB)
    .setFooter({ text: t(locale, 'economy.work.footer') });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handlePay(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const target = interaction.options.getUser('user', true);
  const amount = interaction.options.getInteger('amount', true);

  if (target.id === interaction.user.id) {
    await interaction.reply({ content: t(locale, 'economy.cantPaySelf'), flags: MessageFlags.Ephemeral });
    return;
  }

  if (target.bot) {
    await interaction.reply({ content: t(locale, 'economy.cantPayBot'), flags: MessageFlags.Ephemeral });
    return;
  }

  if (amount <= 0) {
    await interaction.reply({ content: t(locale, 'economy.amountPositive'), flags: MessageFlags.Ephemeral });
    return;
  }

  const success = transferBalance(interaction.guild!.id, interaction.user.id, target.id, amount);

  if (!success) {
    await interaction.reply({ content: t(locale, 'economy.insufficientBalance'), flags: MessageFlags.Ephemeral });
    return;
  }

  logTransaction(interaction.guild!.id, interaction.user.id, 'pay', -amount, `Paid ${target.username}`);
  logTransaction(interaction.guild!.id, target.id, 'receive', amount, `Received from ${interaction.user.username}`);

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'economy.pay.title'))
    .setDescription(t(locale, 'economy.pay.desc', { amount: amount.toLocaleString(), emoji: CURRENCY_EMOJI, target: target.toString() }))
    .setColor(0x2ECC71);

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleDeposit(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const amount = interaction.options.getInteger('amount', true);

  if (amount <= 0) {
    await interaction.reply({ content: t(locale, 'economy.amountPositive'), flags: MessageFlags.Ephemeral });
    return;
  }

  const success = depositToBank(interaction.guild!.id, interaction.user.id, amount);

  if (!success) {
    await interaction.reply({ content: t(locale, 'economy.deposit.failed'), flags: MessageFlags.Ephemeral });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'economy.deposit.title'))
    .setDescription(t(locale, 'economy.deposit.desc', { amount: amount.toLocaleString(), emoji: CURRENCY_EMOJI }))
    .setColor(0x3498DB);

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleWithdraw(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const amount = interaction.options.getInteger('amount', true);

  if (amount <= 0) {
    await interaction.reply({ content: t(locale, 'economy.amountPositive'), flags: MessageFlags.Ephemeral });
    return;
  }

  const success = withdrawFromBank(interaction.guild!.id, interaction.user.id, amount);

  if (!success) {
    await interaction.reply({ content: t(locale, 'economy.withdraw.failed'), flags: MessageFlags.Ephemeral });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'economy.withdraw.title'))
    .setDescription(t(locale, 'economy.withdraw.desc', { amount: amount.toLocaleString(), emoji: CURRENCY_EMOJI }))
    .setColor(0x3498DB);

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleLeaderboard(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const topUsers = getTopBalances(interaction.guild!.id, 10);

  if (topUsers.length === 0) {
    await interaction.reply({ content: t(locale, 'economy.noData'), flags: MessageFlags.Ephemeral });
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
    .setTitle(t(locale, 'economy.leaderboard.title', { emoji: CURRENCY_EMOJI }))
    .setDescription(leaderboardText.join('\n'))
    .setColor(0xF1C40F)
    .setFooter({ text: t(locale, 'economy.leaderboard.footer', { count: topUsers.length.toString() }) });

  await interaction.reply({ embeds: [embed] });
}

async function handleShop(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const items = getShopItems(interaction.guild!.id);

  if (items.length === 0) {
    await interaction.reply({ 
      content: t(locale, 'economy.shopEmpty'), 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(t(locale, 'economy.shop.title'))
    .setColor(0x9B59B6)
    .setDescription(`${t(locale, 'economy.shop.desc')}\n\n` +
      items.map((item, i) => {
        const stockText = item.stock === -1 ? '∞' : item.stock.toString();
        const roleText = item.roleId ? ` → <@&${item.roleId}>` : '';
        return `**${item.id}.** ${item.name} — **${item.price.toLocaleString()}** ${CURRENCY_EMOJI}\n` +
               `   ${item.description}${roleText}\n` +
               `   📦 ${t(locale, 'economy.shop.stock')}: ${stockText}`;
      }).join('\n\n')
    );

  await interaction.reply({ embeds: [embed] });
}

async function handleBuy(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const itemId = interaction.options.getInteger('item_id', true);
  const item = getShopItem(itemId);

  if (!item || item.guildId !== interaction.guild!.id) {
    await interaction.reply({ content: t(locale, 'economy.itemNotFound'), flags: MessageFlags.Ephemeral });
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
    .setTitle(t(locale, 'economy.buy.title'))
    .setDescription(t(locale, 'economy.buy.desc', { item: item.name, price: item.price.toLocaleString(), emoji: CURRENCY_EMOJI }))
    .setColor(0x2ECC71);

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleAdminGive(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const target = interaction.options.getUser('user', true);
  const amount = interaction.options.getInteger('amount', true);

  if (amount <= 0) {
    await interaction.reply({ content: t(locale, 'economy.amountPositive'), flags: MessageFlags.Ephemeral });
    return;
  }

  addBalance(interaction.guild!.id, target.id, amount);
  logTransaction(interaction.guild!.id, target.id, 'admin', amount, `Given by ${interaction.user.username}`);

  await interaction.reply({
    content: t(locale, 'economy.admin.gave', { amount: amount.toLocaleString(), emoji: CURRENCY_EMOJI, target: target.toString() }),
    flags: MessageFlags.Ephemeral,
  });
}

async function handleAdminTake(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const target = interaction.options.getUser('user', true);
  const amount = interaction.options.getInteger('amount', true);

  if (amount <= 0) {
    await interaction.reply({ content: t(locale, 'economy.amountPositive'), flags: MessageFlags.Ephemeral });
    return;
  }

  const success = removeBalance(interaction.guild!.id, target.id, amount);

  if (!success) {
    await interaction.reply({ content: t(locale, 'economy.userNoBalance'), flags: MessageFlags.Ephemeral });
    return;
  }

  logTransaction(interaction.guild!.id, target.id, 'admin', -amount, `Taken by ${interaction.user.username}`);

  await interaction.reply({
    content: t(locale, 'economy.admin.took', { amount: amount.toLocaleString(), emoji: CURRENCY_EMOJI, target: target.toString() }),
    flags: MessageFlags.Ephemeral,
  });
}

async function handleAdminAddItem(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const name = interaction.options.getString('name', true);
  const description = interaction.options.getString('description', true);
  const price = interaction.options.getInteger('price', true);
  const role = interaction.options.getRole('role');
  const stock = interaction.options.getInteger('stock') ?? -1;

  if (price <= 0) {
    await interaction.reply({ content: t(locale, 'economy.amountPositive'), flags: MessageFlags.Ephemeral });
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
    .setTitle(t(locale, 'economy.admin.itemAdded'))
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

async function handleAdminRemoveItem(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const itemId = interaction.options.getInteger('item_id', true);

  const item = getShopItem(itemId);
  if (!item || item.guildId !== interaction.guild!.id) {
    await interaction.reply({ content: t(locale, 'economy.itemNotFound'), flags: MessageFlags.Ephemeral });
    return;
  }

  deleteShopItem(itemId);

  await interaction.reply({
    content: t(locale, 'economy.admin.itemRemoved', { name: item.name, id: itemId.toString() }),
    flags: MessageFlags.Ephemeral,
  });
}
