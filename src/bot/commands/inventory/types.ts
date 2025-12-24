// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Inventory Types and Constants
// Licensed under MIT License

import { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, EmbedBuilder } from 'discord.js';
import { ItemDefinition, ItemType } from '../../../database/repositories/inventoryRepo.js';

export interface ViewData {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[];
}

export const RARITY_COLORS: Record<string, number> = {
  common: 0x9E9E9E,
  uncommon: 0x4CAF50,
  rare: 0x2196F3,
  epic: 0x9C27B0,
  legendary: 0xFF9800,
};

export const RARITY_EMOJI: Record<string, string> = {
  common: '⚪',
  uncommon: '🟢',
  rare: '🔵',
  epic: '🟣',
  legendary: '🟠',
};

export const TYPE_EMOJI: Record<string, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💍',
  potion: '🧪',
};

export const CURRENCY_EMOJI = '🪙';
export const COLLECTOR_TIMEOUT = 5 * 60 * 1000;

export type ViewMode = 'inventory' | 'shop' | 'stats' | 'item_detail';

export interface ViewState {
  mode: ViewMode;
  category: ItemType | 'all';
  selectedItemId: number | null;
  page: number;
}

export function getStatPreview(item: ItemDefinition): string {
  const parts: string[] = [];
  if (item.attackBonus > 0) parts.push(`⚔️+${item.attackBonus}`);
  if (item.defenseBonus > 0) parts.push(`🛡️+${item.defenseBonus}`);
  if (item.healthBonus > 0) parts.push(`❤️+${item.healthBonus}`);
  if (item.critChanceBonus > 0) parts.push(`💥+${item.critChanceBonus}%`);
  if (item.energyRestore > 0) parts.push(`⚡+${item.energyRestore}`);
  if (item.moodRestore > 0) parts.push(`😊+${item.moodRestore}`);
  return parts.length > 0 ? `[${parts.join(' ')}]` : '';
}
