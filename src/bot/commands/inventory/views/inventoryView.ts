// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Inventory View Builder
// Licensed under MIT License

import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { t, Locale } from '../../../../utils/i18n.js';
import {
  getInventory,
  getItemDefinition,
  getCombatStats,
  ItemDefinition,
} from '../../../../database/repositories/inventoryRepo.js';
import { ViewData, ViewState, RARITY_COLORS, RARITY_EMOJI, TYPE_EMOJI, getStatPreview } from '../types.js';

export function buildInventoryView(
  guildId: string, 
  userId: string, 
  locale: Locale,
  state: ViewState
): ViewData {
  const inventory = getInventory(guildId, userId);
  const stats = getCombatStats(guildId, userId);

  const itemDetails = inventory.map(inv => {
    const itemDef = getItemDefinition(inv.itemId);
    if (!itemDef) return null;
    return { ...inv, definition: itemDef };
  }).filter(Boolean) as Array<{ definition: ItemDefinition; quantity: number; equipped: boolean; itemId: number }>;

  const filteredItems = state.category === 'all' 
    ? itemDetails 
    : itemDetails.filter(i => i.definition.type === state.category);

  const equippedItems = filteredItems.filter(i => i.equipped);
  const unequippedItems = filteredItems.filter(i => !i.equipped);

  let description = '';

  if (equippedItems.length > 0) {
    description += `**${t(locale, 'inventory.equipped')}**\n`;
    description += equippedItems.map(item => {
      const emoji = RARITY_EMOJI[item.definition.rarity];
      const typeEmoji = TYPE_EMOJI[item.definition.type];
      return `${emoji} ${typeEmoji} **${item.definition.name}** ${getStatPreview(item.definition)}`;
    }).join('\n');
    description += '\n\n';
  }

  if (unequippedItems.length > 0) {
    description += `**${t(locale, 'inventory.backpack')}**\n`;
    description += unequippedItems.map(item => {
      const emoji = RARITY_EMOJI[item.definition.rarity];
      const typeEmoji = TYPE_EMOJI[item.definition.type];
      const qty = item.quantity > 1 ? ` x${item.quantity}` : '';
      return `${emoji} ${typeEmoji} ${item.definition.name}${qty}`;
    }).join('\n');
  }

  if (description === '') {
    description = t(locale, 'inventory.empty');
  }

  const embed = new EmbedBuilder()
    .setTitle(`🎒 ${t(locale, 'inventory.title')}`)
    .setDescription(description)
    .setColor(0x5865F2)
    .addFields(
      { name: '⚔️ Attack', value: `+${stats.attackBonus}`, inline: true },
      { name: '🛡️ Defense', value: `+${stats.defenseBonus}`, inline: true },
      { name: '❤️ Health', value: `+${stats.healthBonus}`, inline: true },
      { name: '💥 Crit', value: `+${stats.critChanceBonus}%`, inline: true },
    );

  const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

  const categorySelect = new StringSelectMenuBuilder()
    .setCustomId('inv_category')
    .setPlaceholder(t(locale, 'inventory.selectCategory'))
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel(t(locale, 'inventory.allCategories')).setValue('category:all').setEmoji('📦').setDefault(state.category === 'all'),
      new StringSelectMenuOptionBuilder().setLabel(t(locale, 'inventory.weapons')).setValue('category:weapon').setEmoji('⚔️').setDefault(state.category === 'weapon'),
      new StringSelectMenuOptionBuilder().setLabel(t(locale, 'inventory.armor')).setValue('category:armor').setEmoji('🛡️').setDefault(state.category === 'armor'),
      new StringSelectMenuOptionBuilder().setLabel(t(locale, 'inventory.accessories')).setValue('category:accessory').setEmoji('💍').setDefault(state.category === 'accessory'),
      new StringSelectMenuOptionBuilder().setLabel(t(locale, 'inventory.potions')).setValue('category:potion').setEmoji('🧪').setDefault(state.category === 'potion'),
    );
  components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categorySelect));

  if (filteredItems.length > 0) {
    const itemOptions = filteredItems.slice(0, 25).map(item => {
      const equipped = item.equipped ? ' [E]' : '';
      const qty = item.quantity > 1 ? ` x${item.quantity}` : '';
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${item.definition.name}${equipped}${qty}`)
        .setValue(`item:${item.itemId}`)
        .setDescription(item.definition.description.slice(0, 50))
        .setEmoji(TYPE_EMOJI[item.definition.type]);
    });

    const itemSelect = new StringSelectMenuBuilder()
      .setCustomId('inv_item')
      .setPlaceholder(t(locale, 'inventory.selectItem'))
      .addOptions(itemOptions);
    components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(itemSelect));
  }

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('mode_inventory').setLabel(t(locale, 'inventory.viewInventoryBtn')).setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId('mode_shop').setLabel(t(locale, 'inventory.viewShopBtn')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('mode_stats').setLabel(t(locale, 'inventory.viewStatsBtn')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('refresh').setLabel(t(locale, 'inventory.refreshBtn')).setStyle(ButtonStyle.Secondary),
  );
  components.push(navRow);

  return { embeds: [embed], components };
}

export function buildInventoryItemDetail(
  guildId: string,
  userId: string,
  locale: Locale,
  state: ViewState
): ViewData {
  const inventory = getInventory(guildId, userId);
  const invItem = inventory.find(i => i.itemId === state.selectedItemId);
  const itemDef = state.selectedItemId ? getItemDefinition(state.selectedItemId) : null;

  if (!invItem || !itemDef) {
    return buildInventoryView(guildId, userId, locale, { ...state, selectedItemId: null });
  }

  const embed = new EmbedBuilder()
    .setTitle(`${RARITY_EMOJI[itemDef.rarity]} ${itemDef.name}`)
    .setDescription(itemDef.description)
    .setColor(RARITY_COLORS[itemDef.rarity])
    .addFields(
      { name: 'Type', value: `${TYPE_EMOJI[itemDef.type]} ${itemDef.type}`, inline: true },
      { name: 'Rarity', value: itemDef.rarity, inline: true },
      { name: 'Quantity', value: invItem.quantity.toString(), inline: true },
    );

  const statsFields = [];
  if (itemDef.attackBonus > 0) statsFields.push({ name: '⚔️ Attack', value: `+${itemDef.attackBonus}`, inline: true });
  if (itemDef.defenseBonus > 0) statsFields.push({ name: '🛡️ Defense', value: `+${itemDef.defenseBonus}`, inline: true });
  if (itemDef.healthBonus > 0) statsFields.push({ name: '❤️ Health', value: `+${itemDef.healthBonus}`, inline: true });
  if (itemDef.critChanceBonus > 0) statsFields.push({ name: '💥 Crit', value: `+${itemDef.critChanceBonus}%`, inline: true });
  if (itemDef.energyRestore > 0) statsFields.push({ name: '⚡ Energy', value: `+${itemDef.energyRestore}`, inline: true });
  if (itemDef.moodRestore > 0) statsFields.push({ name: '😊 Mood', value: `+${itemDef.moodRestore}`, inline: true });
  
  if (statsFields.length > 0) {
    embed.addFields(statsFields);
  }

  if (invItem.equipped) {
    embed.setFooter({ text: '✅ Currently equipped' });
  }

  const components: ActionRowBuilder<ButtonBuilder>[] = [];
  const actionRow = new ActionRowBuilder<ButtonBuilder>();

  if (itemDef.type === 'potion') {
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`use:${itemDef.id}`)
        .setLabel(t(locale, 'inventory.useBtn'))
        .setStyle(ButtonStyle.Success)
        .setEmoji('🧪')
    );
  } else {
    if (invItem.equipped) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`unequip:${itemDef.id}`)
          .setLabel(t(locale, 'inventory.unequipBtn'))
          .setStyle(ButtonStyle.Danger)
          .setEmoji('📤')
      );
    } else {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`equip:${itemDef.id}`)
          .setLabel(t(locale, 'inventory.equipBtn'))
          .setStyle(ButtonStyle.Success)
          .setEmoji('📥')
      );
    }
  }

  actionRow.addComponents(
    new ButtonBuilder()
      .setCustomId('back')
      .setLabel(t(locale, 'inventory.backBtn'))
      .setStyle(ButtonStyle.Secondary)
  );

  components.push(actionRow);

  return { embeds: [embed], components };
}
