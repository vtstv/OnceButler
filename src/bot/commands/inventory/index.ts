// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Inventory Module
// Licensed under MIT License

import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  MessageFlags,
} from 'discord.js';
import { t, Locale } from '../../../utils/i18n.js';
import { getGuildSettings } from '../../../database/repositories/settingsRepo.js';
import { seedDefaultItems, ItemType } from '../../../database/repositories/inventoryRepo.js';
import { getLocale } from '../utils.js';

import { ViewState, ViewData, COLLECTOR_TIMEOUT } from './types.js';
import {
  buildInventoryView,
  buildInventoryItemDetail,
  buildShopView,
  buildShopItemDetail,
  buildStatsView,
} from './views/index.js';
import { doEquip, doUnequip, doUse, doBuy } from './actions.js';
import {
  handleStatsDirect,
  handleEquipDirect,
  handleUnequipDirect,
  handleUseDirect,
  handleBuyDirect,
} from './handlers.js';

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
        break;
    }
  }

  const viewData = buildView(guildId, userId, locale, state);
  await interaction.editReply({
    embeds: viewData.embeds,
    components: viewData.components,
  });
}

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
    flags: MessageFlags.Ephemeral,
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

  seedDefaultItems();

  const subcommand = interaction.options.getSubcommand();

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
