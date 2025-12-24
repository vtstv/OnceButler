// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Inventory Legacy Direct Handlers
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { t, Locale } from '../../../utils/i18n.js';
import { getWallet, removeBalance, logTransaction } from '../../../database/repositories/economyRepo.js';
import { getMemberStats, upsertMemberStats } from '../../../database/repositories/memberStatsRepo.js';
import {
  getItemDefinition,
  equipItem,
  unequipItem,
  removeFromInventory,
  addToInventory,
  getEquippedItems,
  getCombatStats,
} from '../../../database/repositories/inventoryRepo.js';
import { RARITY_COLORS, RARITY_EMOJI, CURRENCY_EMOJI, getStatPreview } from './types.js';

export async function handleStatsDirect(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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

export async function handleEquipDirect(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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
    content: t(locale, 'inventory.equipSuccess', { item: itemDef?.name ?? 'Item' }), 
    flags: MessageFlags.Ephemeral 
  });
}

export async function handleUnequipDirect(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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
    content: t(locale, 'inventory.unequipSuccess', { item: itemDef?.name ?? 'Item' }), 
    flags: MessageFlags.Ephemeral 
  });
}

export async function handleUseDirect(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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

export async function handleBuyDirect(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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
