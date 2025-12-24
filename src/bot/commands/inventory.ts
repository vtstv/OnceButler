// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Interactive Inventory Command
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ButtonInteraction,
  StringSelectMenuInteraction,
  APIEmbed,
  JSONEncodable,
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
  ItemType,
} from '../../database/repositories/inventoryRepo.js';
import { getLocale } from './utils.js';

// Simple view data interface to avoid Discord.js type issues
interface ViewData {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[];
}

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

const TYPE_EMOJI: Record<string, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💍',
  potion: '🧪',
};

const CURRENCY_EMOJI = '🪙';
const COLLECTOR_TIMEOUT = 5 * 60 * 1000; // 5 minutes

type ViewMode = 'inventory' | 'shop' | 'stats' | 'item_detail';

interface ViewState {
  mode: ViewMode;
  category: ItemType | 'all';
  selectedItemId: number | null;
  page: number;
}

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

  // Legacy slash command handling for direct actions
  switch (subcommand) {
    case 'view':
      await startInteractiveSession(interaction, locale, 'inventory');
      break;
    case 'shop':
      await startInteractiveSession(interaction, locale, 'shop');
      break;
    case 'stats':
      await handleStatsDirect(interaction, locale);
      break;
    case 'equip':
      await handleEquipDirect(interaction, locale);
      break;
    case 'unequip':
      await handleUnequipDirect(interaction, locale);
      break;
    case 'use':
      await handleUseDirect(interaction, locale);
      break;
    case 'buy':
      await handleBuyDirect(interaction, locale);
      break;
  }
}

// ==================== INTERACTIVE SESSION ====================

async function startInteractiveSession(
  interaction: ChatInputCommandInteraction, 
  locale: Locale,
  initialMode: 'inventory' | 'shop'
): Promise<void> {
  const guildId = interaction.guild!.id;
  const userId = interaction.user.id;

  const state: ViewState = {
    mode: initialMode,
    category: 'all',
    selectedItemId: null,
    page: 0,
  };

  const viewData = buildView(guildId, userId, locale, state);
  const reply = await interaction.reply({
    embeds: viewData.embeds,
    components: viewData.components,
    fetchReply: true,
  });

  const collector = reply.createMessageComponentCollector({
    filter: (i) => i.user.id === userId,
    time: COLLECTOR_TIMEOUT,
  });

  collector.on('collect', async (i: ButtonInteraction | StringSelectMenuInteraction) => {
    try {
      await handleInteraction(i, guildId, userId, locale, state);
    } catch (error) {
      console.error('Inventory interaction error:', error);
    }
  });

  collector.on('end', async () => {
    try {
      const disabledView = buildView(guildId, userId, locale, state);
      disabledView.components.forEach(row => {
        row.components.forEach(c => c.setDisabled(true));
      });
      await interaction.editReply({
        embeds: disabledView.embeds,
        components: disabledView.components,
      });
    } catch {
      // Message might be deleted
    }
  });
}

async function handleInteraction(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  guildId: string,
  userId: string,
  locale: Locale,
  state: ViewState
): Promise<void> {
  await interaction.deferUpdate();

  if (interaction.isStringSelectMenu()) {
    const [action, value] = interaction.values[0].split(':');
    
    switch (action) {
      case 'category':
        state.category = value as ItemType | 'all';
        state.selectedItemId = null;
        state.page = 0;
        break;
      case 'item':
        state.selectedItemId = parseInt(value);
        break;
    }
  } else if (interaction.isButton()) {
    const [action, value] = interaction.customId.split(':');
    
    switch (action) {
      case 'mode_inventory':
        state.mode = 'inventory';
        state.selectedItemId = null;
        break;
      case 'mode_shop':
        state.mode = 'shop';
        state.selectedItemId = null;
        break;
      case 'mode_stats':
        state.mode = 'stats';
        state.selectedItemId = null;
        break;
      case 'back':
        state.selectedItemId = null;
        break;
      case 'equip':
        await doEquip(guildId, userId, parseInt(value));
        state.selectedItemId = null;
        break;
      case 'unequip':
        await doUnequip(guildId, userId, parseInt(value));
        state.selectedItemId = null;
        break;
      case 'use':
        await doUse(guildId, userId, parseInt(value));
        state.selectedItemId = null;
        break;
      case 'buy':
        await doBuy(guildId, userId, parseInt(value));
        break;
      case 'refresh':
        // Just refresh, state stays the same
        break;
    }
  }

  const viewData = buildView(guildId, userId, locale, state);
  await interaction.editReply({
    embeds: viewData.embeds,
    components: viewData.components,
  });
}

// ==================== VIEW BUILDERS ====================

function buildView(
  guildId: string, 
  userId: string, 
  locale: Locale, 
  state: ViewState
): ViewData {
  switch (state.mode) {
    case 'inventory':
      return state.selectedItemId 
        ? buildInventoryItemDetail(guildId, userId, locale, state)
        : buildInventoryView(guildId, userId, locale, state);
    case 'shop':
      return state.selectedItemId
        ? buildShopItemDetail(guildId, userId, locale, state)
        : buildShopView(guildId, userId, locale, state);
    case 'stats':
      return buildStatsView(guildId, userId, locale);
    default:
      return buildInventoryView(guildId, userId, locale, state);
  }
}

function buildInventoryView(
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

  // Filter by category
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

  // Category selector
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

  // Item selector (if has items)
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

  // Navigation buttons
  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('mode_inventory').setLabel(t(locale, 'inventory.viewInventoryBtn')).setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId('mode_shop').setLabel(t(locale, 'inventory.viewShopBtn')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('mode_stats').setLabel(t(locale, 'inventory.viewStatsBtn')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('refresh').setLabel(t(locale, 'inventory.refreshBtn')).setStyle(ButtonStyle.Secondary),
  );
  components.push(navRow);

  return { embeds: [embed], components };
}

function buildInventoryItemDetail(
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

  // Add stats if applicable
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

function buildShopView(
  guildId: string,
  userId: string,
  locale: Locale,
  state: ViewState
): ViewData {
  const items = getShopItemDefinitions(guildId);
  const wallet = getWallet(guildId, userId);

  // Filter by category
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

  // Category selector
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

  // Item selector to buy
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

  // Navigation buttons
  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('mode_inventory').setLabel(t(locale, 'inventory.viewInventoryBtn')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('mode_shop').setLabel(t(locale, 'inventory.viewShopBtn')).setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId('mode_stats').setLabel(t(locale, 'inventory.viewStatsBtn')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('refresh').setLabel(t(locale, 'inventory.refreshBtn')).setStyle(ButtonStyle.Secondary),
  );
  components.push(navRow);

  return { embeds: [embed], components };
}

function buildShopItemDetail(
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

  // Add stats
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

function buildStatsView(
  guildId: string,
  userId: string,
  locale: Locale
): ViewData {
  const equipped = getEquippedItems(guildId, userId);
  const stats = getCombatStats(guildId, userId);

  let description = '';
  
  if (equipped.length === 0) {
    description = t(locale, 'inventory.noEquipment');
  } else {
    description = equipped.map(item => {
      const emoji = RARITY_EMOJI[item.definition.rarity];
      const typeEmoji = TYPE_EMOJI[item.definition.type];
      return `${emoji} ${typeEmoji} **${item.definition.name}**\n   ${getStatPreview(item.definition)}`;
    }).join('\n\n');
  }

  const embed = new EmbedBuilder()
    .setTitle(`⚔️ Combat Stats`)
    .setDescription(description)
    .setColor(0xFF6B35)
    .addFields(
      { name: '⚔️ Total Attack', value: `+${stats.attackBonus}`, inline: true },
      { name: '🛡️ Total Defense', value: `+${stats.defenseBonus}`, inline: true },
      { name: '❤️ Total Health', value: `+${stats.healthBonus}`, inline: true },
      { name: '💥 Total Crit', value: `+${stats.critChanceBonus}%`, inline: true },
    )
    .setFooter({ text: t(locale, 'inventory.statsFooter') });

  const components: ActionRowBuilder<ButtonBuilder>[] = [];
  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('mode_inventory').setLabel(t(locale, 'inventory.viewInventoryBtn')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('mode_shop').setLabel(t(locale, 'inventory.viewShopBtn')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('mode_stats').setLabel(t(locale, 'inventory.viewStatsBtn')).setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId('refresh').setLabel(t(locale, 'inventory.refreshBtn')).setStyle(ButtonStyle.Secondary),
  );
  components.push(navRow);

  return { embeds: [embed], components };
}

// ==================== ACTIONS ====================

async function doEquip(guildId: string, userId: string, itemId: number): Promise<boolean> {
  const result = equipItem(guildId, userId, itemId);
  return result.success;
}

async function doUnequip(guildId: string, userId: string, itemId: number): Promise<boolean> {
  return unequipItem(guildId, userId, itemId);
}

async function doUse(guildId: string, userId: string, itemId: number): Promise<boolean> {
  const itemDef = getItemDefinition(itemId);
  if (!itemDef || itemDef.type !== 'potion') return false;

  const removed = removeFromInventory(guildId, userId, itemId, 1);
  if (!removed) return false;

  const stats = getMemberStats(guildId, userId);

  if (itemDef.energyRestore > 0) {
    stats.energy = Math.min(100, stats.energy + itemDef.energyRestore);
  }

  if (itemDef.moodRestore > 0) {
    stats.mood = Math.min(100, stats.mood + itemDef.moodRestore);
  }

  upsertMemberStats(stats);
  return true;
}

async function doBuy(guildId: string, userId: string, itemId: number): Promise<boolean> {
  const itemDef = getItemDefinition(itemId);
  if (!itemDef || !itemDef.enabled) return false;

  const wallet = getWallet(guildId, userId);
  if (wallet.balance < itemDef.price) return false;

  removeBalance(guildId, userId, itemDef.price);
  addToInventory(guildId, userId, itemId, 1);
  logTransaction(guildId, userId, 'purchase', -itemDef.price, `Bought ${itemDef.name}`);
  return true;
}

// ==================== LEGACY DIRECT HANDLERS ====================

async function handleStatsDirect(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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

async function handleEquipDirect(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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

async function handleUnequipDirect(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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

async function handleUseDirect(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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

async function handleBuyDirect(interaction: ChatInputCommandInteraction, locale: Locale): Promise<void> {
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

// ==================== HELPERS ====================

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
