// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Shop View Builder
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
import { getWallet } from '../../../../database/repositories/economyRepo.js';
import {
  getShopItemDefinitions,
  getItemDefinition,
  ItemDefinition,
} from '../../../../database/repositories/inventoryRepo.js';
import { ViewData, ViewState, RARITY_COLORS, RARITY_EMOJI, TYPE_EMOJI, CURRENCY_EMOJI, getStatPreview } from '../types.js';

export function buildShopView(
  guildId: string,
  userId: string,
  locale: Locale,
  state: ViewState
): ViewData {
  const items = getShopItemDefinitions(guildId);
  const wallet = getWallet(guildId, userId);

  const filteredItems = state.category === 'all'
    ? items
    : items.filter(i => i.type === state.category);

  const formatItem = (item: ItemDefinition) => {
    const emoji = RARITY_EMOJI[item.rarity];
    const typeEmoji = TYPE_EMOJI[item.type];
    const affordable = wallet.balance >= item.price ? '✅' : '❌';
    return `${emoji} ${typeEmoji} **${item.name}** — ${item.price.toLocaleString()} ${CURRENCY_EMOJI} ${affordable}\n   ${getStatPreview(item)}`;
  };

  let description = `💰 **${t(locale, 'inventory.yourBalance')}:** ${wallet.balance.toLocaleString()} ${CURRENCY_EMOJI}\n\n`;

  if (filteredItems.length === 0) {
    description += t(locale, 'inventory.noItems');
  } else {
    description += filteredItems.slice(0, 10).map(formatItem).join('\n');
    if (filteredItems.length > 10) {
      description += `\n\n*...and ${filteredItems.length - 10} more items*`;
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`🏪 ${t(locale, 'inventory.shop')}`)
    .setDescription(description)
    .setColor(0x9B59B6);

  const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

  const categorySelect = new StringSelectMenuBuilder()
    .setCustomId('shop_category')
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
      const affordable = wallet.balance >= item.price ? '✅' : '❌';
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${item.name} - ${item.price.toLocaleString()} ${affordable}`)
        .setValue(`item:${item.id}`)
        .setDescription(item.description.slice(0, 50))
        .setEmoji(TYPE_EMOJI[item.type]);
    });

    const itemSelect = new StringSelectMenuBuilder()
      .setCustomId('shop_item')
      .setPlaceholder(t(locale, 'inventory.selectItem'))
      .addOptions(itemOptions);
    components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(itemSelect));
  }

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('mode_inventory').setLabel(t(locale, 'inventory.viewInventoryBtn')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('mode_shop').setLabel(t(locale, 'inventory.viewShopBtn')).setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId('mode_stats').setLabel(t(locale, 'inventory.viewStatsBtn')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('refresh').setLabel(t(locale, 'inventory.refreshBtn')).setStyle(ButtonStyle.Secondary),
  );
  components.push(navRow);

  return { embeds: [embed], components };
}

export function buildShopItemDetail(
  guildId: string,
  userId: string,
  locale: Locale,
  state: ViewState
): ViewData {
  const itemDef = state.selectedItemId ? getItemDefinition(state.selectedItemId) : null;
  const wallet = getWallet(guildId, userId);

  if (!itemDef) {
    return buildShopView(guildId, userId, locale, { ...state, selectedItemId: null });
  }

  const canAfford = wallet.balance >= itemDef.price;

  const embed = new EmbedBuilder()
    .setTitle(`${RARITY_EMOJI[itemDef.rarity]} ${itemDef.name}`)
    .setDescription(itemDef.description)
    .setColor(RARITY_COLORS[itemDef.rarity])
    .addFields(
      { name: 'Type', value: `${TYPE_EMOJI[itemDef.type]} ${itemDef.type}`, inline: true },
      { name: 'Rarity', value: itemDef.rarity, inline: true },
      { name: t(locale, 'inventory.price'), value: `${itemDef.price.toLocaleString()} ${CURRENCY_EMOJI}`, inline: true },
      { name: t(locale, 'inventory.yourBalance'), value: `${wallet.balance.toLocaleString()} ${CURRENCY_EMOJI}`, inline: true },
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

  if (!canAfford) {
    embed.setFooter({ text: `❌ ${t(locale, 'inventory.need')} ${(itemDef.price - wallet.balance).toLocaleString()} ${CURRENCY_EMOJI} more` });
  }

  const components: ActionRowBuilder<ButtonBuilder>[] = [];
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`buy:${itemDef.id}`)
      .setLabel(`${t(locale, 'inventory.buyBtn')} (${itemDef.price.toLocaleString()} ${CURRENCY_EMOJI})`)
      .setStyle(ButtonStyle.Success)
      .setEmoji('🛒')
      .setDisabled(!canAfford),
    new ButtonBuilder()
      .setCustomId('back')
      .setLabel(t(locale, 'inventory.backBtn'))
      .setStyle(ButtonStyle.Secondary)
  );
  components.push(actionRow);

  return { embeds: [embed], components };
}
