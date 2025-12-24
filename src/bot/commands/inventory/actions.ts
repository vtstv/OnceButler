// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Inventory Actions
// Licensed under MIT License

import {
  equipItem,
  unequipItem,
  removeFromInventory,
  getItemDefinition,
  addToInventory,
} from '../../../database/repositories/inventoryRepo.js';
import { getWallet, removeBalance, logTransaction } from '../../../database/repositories/economyRepo.js';
import { getMemberStats, upsertMemberStats } from '../../../database/repositories/memberStatsRepo.js';

export async function doEquip(guildId: string, userId: string, itemId: number): Promise<boolean> {
  const result = equipItem(guildId, userId, itemId);
  return result.success;
}

export async function doUnequip(guildId: string, userId: string, itemId: number): Promise<boolean> {
  return unequipItem(guildId, userId, itemId);
}

export async function doUse(guildId: string, userId: string, itemId: number): Promise<boolean> {
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

export async function doBuy(guildId: string, userId: string, itemId: number): Promise<boolean> {
  const itemDef = getItemDefinition(itemId);
  if (!itemDef || !itemDef.enabled) return false;

  const wallet = getWallet(guildId, userId);
  if (wallet.balance < itemDef.price) return false;

  removeBalance(guildId, userId, itemDef.price);
  addToInventory(guildId, userId, itemId, 1);
  logTransaction(guildId, userId, 'purchase', -itemDef.price, `Bought ${itemDef.name}`);
  return true;
}
