// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Inventory Command
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ComponentType,
} from 'discord.js';
import { t, Locale } from '../../utils/i18n.js';
import { getGuildSettings } from '../../database/repositories/settingsRepo.js';
import { getWallet, removeBalance, logTransaction } from '../../database/repositories/economyRepo.js';
import { getMemberStats, upsertMemberStats } from '../../database/repositories/memberStatsRepo.js';
import {
  getInventory,
  getShopItemDefinitions,
  getItemDefinition,
  addToInventory,
  removeFromInventory,
  equipItem,
  unequipItem,
  getEquippedItems,
  getCombatStats,
  seedDefaultItems,
  ItemDefinition,
} from '../../database/repositories/inventoryRepo.js';
import { getLocale } from './utils.js';

const RARITY_COLORS: Record<string, number> = {
  common: 0x9E9E9E,
  uncommon: 0x4CAF50,
  rare: 0x2196F3,
  epic: 0x9C27B0,
  legendary: 0xFF9800,
};

const RARITY_EMOJI: Record<string, string> = {
  common: '⚪',
  uncommon: '🟢',
  rare: '🔵',
  epic: '🟣',
  legendary: '🟠',
};

const CURRENCY_EMOJI = '🪙';

export async function handleInventory(interaction: ChatInputCommandInteraction): Promise<void> {
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

  // Seed default items if not done
  seedDefaultItems();

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'view':
      await handleView(interaction, locale);
      break;
    case 'equip':
      await handleEquip(interaction, locale);
      break;
    case 'unequip':
      await handleUnequip(interaction, locale);
      break;
    case 'use':
      await handleUse(interaction, locale);
      break;
    case 'shop':
      await handleShop(interaction, locale);
      break;
    case 'buy':
      await handleBuy(interaction, locale);
      break;
    case 'stats':
      await handleStats(interaction, locale);
      break;
  }
}

async function handleView(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const guildId = interaction.guild!.id;
  const userId = interaction.user.id;
  const inventory = getInventory(guildId, userId);

  if (inventory.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle(t(locale, 'inventory.title'))
      .setDescription(t(locale, 'inventory.empty'))
      .setColor(0x9E9E9E)
      .setFooter({ text: t(locale, 'inventory.shopHint') });
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  const itemDetails = inventory.map(inv => {
    const itemDef = getItemDefinition(inv.itemId);
    if (!itemDef) return null;
    return { ...inv, definition: itemDef };
  }).filter(Boolean) as Array<{ definition: ItemDefinition; quantity: number; equipped: boolean }>;

  const equippedItems = itemDetails.filter(i => i.equipped);
  const unequippedItems = itemDetails.filter(i => !i.equipped);

  let description = '';

  if (equippedItems.length > 0) {
    description += `**${t(locale, 'inventory.equipped')}**\n`;
    description += equippedItems.map(item => {
      const emoji = RARITY_EMOJI[item.definition.rarity];
      return `${emoji} ${item.definition.name} ${getStatPreview(item.definition)}`;
    }).join('\n');
    description += '\n\n';
  }

  if (unequippedItems.length > 0) {
    description += `**${t(locale, 'inventory.backpack')}**\n`;
    description += unequippedItems.map(item => {
      const emoji = RARITY_EMOJI[item.definition.rarity];
      const qty = item.quantity > 1 ? ` x${item.quantity}` : '';
      return `${emoji} ${item.definition.name}${qty}`;
    }).join('\n');
  }

  const stats = getCombatStats(guildId, userId);
  
  const embed = new EmbedBuilder()
    .setTitle(`🎒 ${interaction.user.displayName}'s ${t(locale, 'inventory.title')}`)
    .setDescription(description)
    .setColor(0x5865F2)
    .addFields(
      { name: '⚔️ Attack', value: `+${stats.attackBonus}`, inline: true },
      { name: '🛡️ Defense', value: `+${stats.defenseBonus}`, inline: true },
      { name: '❤️ Health', value: `+${stats.healthBonus}`, inline: true },
      { name: '💥 Crit', value: `+${stats.critChanceBonus}%`, inline: true },
    );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleEquip(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const guildId = interaction.guild!.id;
  const userId = interaction.user.id;
  const itemId = interaction.options.getInteger('item_id', true);

  const result = equipItem(guildId, userId, itemId);
  
  if (!result.success) {
    await interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
    return;
  }

  const itemDef = getItemDefinition(itemId);
  await interaction.reply({ 
    content: `✅ ${t(locale, 'inventory.equipped')}: **${itemDef?.name ?? 'Item'}**`, 
    flags: MessageFlags.Ephemeral 
  });
}

async function handleUnequip(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const guildId = interaction.guild!.id;
  const userId = interaction.user.id;
  const itemId = interaction.options.getInteger('item_id', true);

  const success = unequipItem(guildId, userId, itemId);
  
  if (!success) {
    await interaction.reply({ content: `❌ ${t(locale, 'inventory.notEquipped')}`, flags: MessageFlags.Ephemeral });
    return;
  }

  const itemDef = getItemDefinition(itemId);
  await interaction.reply({ 
    content: `✅ ${t(locale, 'inventory.unequipped')}: **${itemDef?.name ?? 'Item'}**`, 
    flags: MessageFlags.Ephemeral 
  });
}

async function handleUse(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const guildId = interaction.guild!.id;
  const userId = interaction.user.id;
  const itemId = interaction.options.getInteger('item_id', true);

  const itemDef = getItemDefinition(itemId);
  if (!itemDef) {
    await interaction.reply({ content: `❌ ${t(locale, 'inventory.itemNotFound')}`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (itemDef.type !== 'potion') {
    await interaction.reply({ content: `❌ ${t(locale, 'inventory.notUsable')}`, flags: MessageFlags.Ephemeral });
    return;
  }

  const removed = removeFromInventory(guildId, userId, itemId, 1);
  if (!removed) {
    await interaction.reply({ content: `❌ ${t(locale, 'inventory.notOwned')}`, flags: MessageFlags.Ephemeral });
    return;
  }

  // Apply potion effects
  const stats = getMemberStats(guildId, userId);
  let effectText = '';

  if (itemDef.energyRestore > 0) {
    const oldEnergy = stats.energy;
    stats.energy = Math.min(100, stats.energy + itemDef.energyRestore);
    effectText += `⚡ Energy: ${oldEnergy} → ${stats.energy}\n`;
  }

  if (itemDef.moodRestore > 0) {
    const oldMood = stats.mood;
    stats.mood = Math.min(100, stats.mood + itemDef.moodRestore);
    effectText += `😊 Mood: ${oldMood} → ${stats.mood}\n`;
  }

  upsertMemberStats(stats);

  const embed = new EmbedBuilder()
    .setTitle(`✨ ${t(locale, 'inventory.used')}: ${itemDef.name}`)
    .setDescription(effectText || 'No effect')
    .setColor(RARITY_COLORS[itemDef.rarity]);

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleShop(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const guildId = interaction.guild!.id;
  const items = getShopItemDefinitions(guildId);
  const wallet = getWallet(guildId, interaction.user.id);

  if (items.length === 0) {
    await interaction.reply({ content: t(locale, 'inventory.shopEmpty'), flags: MessageFlags.Ephemeral });
    return;
  }

  // Group by type
  const weapons = items.filter(i => i.type === 'weapon');
  const armors = items.filter(i => i.type === 'armor');
  const accessories = items.filter(i => i.type === 'accessory');
  const potions = items.filter(i => i.type === 'potion');

  const formatItem = (item: ItemDefinition) => {
    const emoji = RARITY_EMOJI[item.rarity];
    const stats = getStatPreview(item);
    return `${emoji} **#${item.id}** ${item.name} — ${item.price.toLocaleString()} ${CURRENCY_EMOJI}\n   ${item.description} ${stats}`;
  };

  let description = `💰 **${t(locale, 'inventory.yourBalance')}:** ${wallet.balance.toLocaleString()} ${CURRENCY_EMOJI}\n\n`;

  if (weapons.length > 0) {
    description += `**⚔️ ${t(locale, 'inventory.weapons')}**\n${weapons.map(formatItem).join('\n')}\n\n`;
  }
  if (armors.length > 0) {
    description += `**🛡️ ${t(locale, 'inventory.armor')}**\n${armors.map(formatItem).join('\n')}\n\n`;
  }
  if (accessories.length > 0) {
    description += `**💍 ${t(locale, 'inventory.accessories')}**\n${accessories.map(formatItem).join('\n')}\n\n`;
  }
  if (potions.length > 0) {
    description += `**🧪 ${t(locale, 'inventory.potions')}**\n${potions.map(formatItem).join('\n')}`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🏪 ${t(locale, 'inventory.shop')}`)
    .setDescription(description)
    .setColor(0x9B59B6)
    .setFooter({ text: t(locale, 'inventory.buyHint') });

  await interaction.reply({ embeds: [embed] });
}

async function handleBuy(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const guildId = interaction.guild!.id;
  const userId = interaction.user.id;
  const itemId = interaction.options.getInteger('item_id', true);

  const itemDef = getItemDefinition(itemId);
  if (!itemDef || !itemDef.enabled) {
    await interaction.reply({ content: `❌ ${t(locale, 'inventory.itemNotFound')}`, flags: MessageFlags.Ephemeral });
    return;
  }

  const wallet = getWallet(guildId, userId);
  if (wallet.balance < itemDef.price) {
    await interaction.reply({ 
      content: `❌ ${t(locale, 'economy.insufficientBalance')} (${t(locale, 'inventory.need')} ${itemDef.price.toLocaleString()} ${CURRENCY_EMOJI})`, 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }

  // Deduct balance and add to inventory
  removeBalance(guildId, userId, itemDef.price);
  addToInventory(guildId, userId, itemId, 1);
  logTransaction(guildId, userId, 'purchase', -itemDef.price, `Bought ${itemDef.name}`);

  const embed = new EmbedBuilder()
    .setTitle(`🛒 ${t(locale, 'inventory.purchased')}!`)
    .setDescription(`${RARITY_EMOJI[itemDef.rarity]} **${itemDef.name}**\n${itemDef.description}`)
    .setColor(RARITY_COLORS[itemDef.rarity])
    .addFields(
      { name: t(locale, 'inventory.price'), value: `${itemDef.price.toLocaleString()} ${CURRENCY_EMOJI}`, inline: true },
      { name: t(locale, 'inventory.newBalance'), value: `${(wallet.balance - itemDef.price).toLocaleString()} ${CURRENCY_EMOJI}`, inline: true },
    );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleStats(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
  const guildId = interaction.guild!.id;
  const target = interaction.options.getUser('user') ?? interaction.user;
  
  const equipped = getEquippedItems(guildId, target.id);
  const stats = getCombatStats(guildId, target.id);

  let description = '';
  
  if (equipped.length === 0) {
    description = t(locale, 'inventory.noEquipment');
  } else {
    description = equipped.map(item => {
      const emoji = RARITY_EMOJI[item.definition.rarity];
      return `${emoji} **${item.definition.name}** (${item.definition.type})\n   ${getStatPreview(item.definition)}`;
    }).join('\n\n');
  }

  const embed = new EmbedBuilder()
    .setTitle(`⚔️ ${target.displayName}'s Combat Stats`)
    .setDescription(description)
    .setColor(0xFF6B35)
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      { name: '⚔️ Attack Bonus', value: `+${stats.attackBonus}`, inline: true },
      { name: '🛡️ Defense Bonus', value: `+${stats.defenseBonus}`, inline: true },
      { name: '❤️ Health Bonus', value: `+${stats.healthBonus}`, inline: true },
      { name: '💥 Crit Chance', value: `+${stats.critChanceBonus}%`, inline: true },
    )
    .setFooter({ text: t(locale, 'inventory.statsFooter') });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

function getStatPreview(item: ItemDefinition): string {
  const parts: string[] = [];
  if (item.attackBonus > 0) parts.push(`⚔️+${item.attackBonus}`);
  if (item.defenseBonus > 0) parts.push(`🛡️+${item.defenseBonus}`);
  if (item.healthBonus > 0) parts.push(`❤️+${item.healthBonus}`);
  if (item.critChanceBonus > 0) parts.push(`💥+${item.critChanceBonus}%`);
  if (item.energyRestore > 0) parts.push(`⚡+${item.energyRestore}`);
  if (item.moodRestore > 0) parts.push(`😊+${item.moodRestore}`);
  return parts.length > 0 ? `[${parts.join(' ')}]` : '';
}
