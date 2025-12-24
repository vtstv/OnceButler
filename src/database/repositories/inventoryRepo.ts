// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Inventory Repository
// Licensed under MIT License

import { getDb } from '../db.js';

export type ItemType = 'weapon' | 'armor' | 'potion' | 'accessory';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface InventoryItem {
  id: number;
  guildId: string;
  userId: string;
  itemId: number;
  quantity: number;
  equipped: boolean;
  acquiredAt: string;
}

export interface ItemDefinition {
  id: number;
  guildId: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  price: number;
  // Combat stats
  attackBonus: number;
  defenseBonus: number;
  healthBonus: number;
  critChanceBonus: number;
  // Potion effects (one-time use)
  energyRestore: number;
  moodRestore: number;
  // Metadata
  isDefault: boolean;
  enabled: boolean;
  createdAt: string;
}

// ==================== ITEM DEFINITIONS ====================

export function createItemDefinition(
  guildId: string,
  name: string,
  description: string,
  type: ItemType,
  rarity: ItemRarity,
  price: number,
  stats: {
    attackBonus?: number;
    defenseBonus?: number;
    healthBonus?: number;
    critChanceBonus?: number;
    energyRestore?: number;
    moodRestore?: number;
  } = {},
  isDefault: boolean = false
): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO item_definitions 
    (guild_id, name, description, type, rarity, price, attack_bonus, defense_bonus, 
     health_bonus, crit_chance_bonus, energy_restore, mood_restore, is_default, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    guildId, name, description, type, rarity, price,
    stats.attackBonus ?? 0, stats.defenseBonus ?? 0,
    stats.healthBonus ?? 0, stats.critChanceBonus ?? 0,
    stats.energyRestore ?? 0, stats.moodRestore ?? 0,
    isDefault ? 1 : 0
  );
  return result.lastInsertRowid as number;
}

export function getItemDefinition(id: number): ItemDefinition | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM item_definitions WHERE id = ?
  `).get(id) as any;
  return row ? mapRowToItemDef(row) : null;
}

export function getShopItemDefinitions(guildId: string): ItemDefinition[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM item_definitions 
    WHERE (guild_id = ? OR is_default = 1) AND enabled = 1
    ORDER BY type, price ASC
  `).all(guildId) as any[];
  return rows.map(mapRowToItemDef);
}

export function getAllItemDefinitions(guildId: string): ItemDefinition[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM item_definitions 
    WHERE guild_id = ? OR is_default = 1
    ORDER BY type, rarity, price ASC
  `).all(guildId) as any[];
  return rows.map(mapRowToItemDef);
}

export function deleteItemDefinition(id: number): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM item_definitions WHERE id = ? AND is_default = 0`).run(id);
  return result.changes > 0;
}

// ==================== INVENTORY ====================

export function getInventory(guildId: string, userId: string): InventoryItem[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM user_inventory 
    WHERE guild_id = ? AND user_id = ?
    ORDER BY equipped DESC, acquired_at DESC
  `).all(guildId, userId) as any[];
  return rows.map(mapRowToInventory);
}

export function getInventoryItem(guildId: string, userId: string, itemId: number): InventoryItem | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM user_inventory 
    WHERE guild_id = ? AND user_id = ? AND item_id = ?
  `).get(guildId, userId, itemId) as any;
  return row ? mapRowToInventory(row) : null;
}

export function addToInventory(guildId: string, userId: string, itemId: number, quantity: number = 1): void {
  const db = getDb();
  const existing = getInventoryItem(guildId, userId, itemId);
  
  if (existing) {
    db.prepare(`
      UPDATE user_inventory SET quantity = quantity + ? 
      WHERE guild_id = ? AND user_id = ? AND item_id = ?
    `).run(quantity, guildId, userId, itemId);
  } else {
    db.prepare(`
      INSERT INTO user_inventory (guild_id, user_id, item_id, quantity, equipped)
      VALUES (?, ?, ?, ?, 0)
    `).run(guildId, userId, itemId, quantity);
  }
}

export function removeFromInventory(guildId: string, userId: string, itemId: number, quantity: number = 1): boolean {
  const db = getDb();
  const existing = getInventoryItem(guildId, userId, itemId);
  
  if (!existing || existing.quantity < quantity) return false;
  
  if (existing.quantity === quantity) {
    db.prepare(`DELETE FROM user_inventory WHERE guild_id = ? AND user_id = ? AND item_id = ?`)
      .run(guildId, userId, itemId);
  } else {
    db.prepare(`
      UPDATE user_inventory SET quantity = quantity - ? 
      WHERE guild_id = ? AND user_id = ? AND item_id = ?
    `).run(quantity, guildId, userId, itemId);
  }
  return true;
}

export function equipItem(guildId: string, userId: string, itemId: number): { success: boolean; error?: string } {
  const db = getDb();
  const item = getInventoryItem(guildId, userId, itemId);
  if (!item) return { success: false, error: 'Item not in inventory' };
  
  const itemDef = getItemDefinition(itemId);
  if (!itemDef) return { success: false, error: 'Item definition not found' };
  
  if (itemDef.type === 'potion') {
    return { success: false, error: 'Potions cannot be equipped, use /inventory use' };
  }
  
  // Unequip other items of the same type
  db.prepare(`
    UPDATE user_inventory SET equipped = 0 
    WHERE guild_id = ? AND user_id = ? AND item_id IN (
      SELECT id FROM item_definitions WHERE type = ?
    )
  `).run(guildId, userId, itemDef.type);
  
  // Equip this item
  db.prepare(`
    UPDATE user_inventory SET equipped = 1 
    WHERE guild_id = ? AND user_id = ? AND item_id = ?
  `).run(guildId, userId, itemId);
  
  return { success: true };
}

export function unequipItem(guildId: string, userId: string, itemId: number): boolean {
  const db = getDb();
  const result = db.prepare(`
    UPDATE user_inventory SET equipped = 0 
    WHERE guild_id = ? AND user_id = ? AND item_id = ?
  `).run(guildId, userId, itemId);
  return result.changes > 0;
}

export function getEquippedItems(guildId: string, userId: string): (InventoryItem & { definition: ItemDefinition })[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT ui.*, id.name, id.description, id.type, id.rarity, id.price,
           id.attack_bonus, id.defense_bonus, id.health_bonus, id.crit_chance_bonus,
           id.energy_restore, id.mood_restore, id.is_default, id.enabled, id.created_at as def_created_at
    FROM user_inventory ui
    JOIN item_definitions id ON ui.item_id = id.id
    WHERE ui.guild_id = ? AND ui.user_id = ? AND ui.equipped = 1
  `).all(guildId, userId) as any[];
  
  return rows.map(row => ({
    ...mapRowToInventory(row),
    definition: {
      id: row.item_id,
      guildId: row.guild_id,
      name: row.name,
      description: row.description,
      type: row.type as ItemType,
      rarity: row.rarity as ItemRarity,
      price: row.price,
      attackBonus: row.attack_bonus,
      defenseBonus: row.defense_bonus,
      healthBonus: row.health_bonus,
      critChanceBonus: row.crit_chance_bonus,
      energyRestore: row.energy_restore,
      moodRestore: row.mood_restore,
      isDefault: row.is_default === 1,
      enabled: row.enabled === 1,
      createdAt: row.def_created_at,
    }
  }));
}

export function getCombatStats(guildId: string, userId: string): {
  attackBonus: number;
  defenseBonus: number;
  healthBonus: number;
  critChanceBonus: number;
} {
  const equipped = getEquippedItems(guildId, userId);
  return {
    attackBonus: equipped.reduce((sum, item) => sum + item.definition.attackBonus, 0),
    defenseBonus: equipped.reduce((sum, item) => sum + item.definition.defenseBonus, 0),
    healthBonus: equipped.reduce((sum, item) => sum + item.definition.healthBonus, 0),
    critChanceBonus: equipped.reduce((sum, item) => sum + item.definition.critChanceBonus, 0),
  };
}

// ==================== DEFAULT ITEMS ====================

export function seedDefaultItems(guildId: string = 'global'): void {
  const db = getDb();
  
  // Check if already seeded
  const existing = db.prepare(`SELECT COUNT(*) as count FROM item_definitions WHERE is_default = 1`).get() as any;
  if (existing.count > 0) return;

  const defaultItems: Array<{
    name: string;
    description: string;
    type: ItemType;
    rarity: ItemRarity;
    price: number;
    stats: {
      attackBonus?: number;
      defenseBonus?: number;
      healthBonus?: number;
      critChanceBonus?: number;
      energyRestore?: number;
      moodRestore?: number;
    };
  }> = [
    // WEAPONS
    { name: '🗡️ Wooden Sword', description: 'A basic training sword', type: 'weapon', rarity: 'common', price: 100, stats: { attackBonus: 5 } },
    { name: '⚔️ Iron Sword', description: 'A sturdy iron blade', type: 'weapon', rarity: 'uncommon', price: 300, stats: { attackBonus: 12 } },
    { name: '🔱 Steel Trident', description: 'Triple the damage potential', type: 'weapon', rarity: 'rare', price: 750, stats: { attackBonus: 20, critChanceBonus: 5 } },
    { name: '🪓 Battle Axe', description: 'Heavy but devastating', type: 'weapon', rarity: 'rare', price: 900, stats: { attackBonus: 28 } },
    { name: '⚡ Lightning Blade', description: 'Crackles with electric energy', type: 'weapon', rarity: 'epic', price: 2000, stats: { attackBonus: 35, critChanceBonus: 10 } },
    { name: '🔥 Inferno Sword', description: 'Burns with eternal flame', type: 'weapon', rarity: 'legendary', price: 5000, stats: { attackBonus: 50, critChanceBonus: 15 } },

    // ARMOR
    { name: '🥋 Leather Vest', description: 'Basic protection', type: 'armor', rarity: 'common', price: 100, stats: { defenseBonus: 5 } },
    { name: '🛡️ Chainmail', description: 'Interlocking metal rings', type: 'armor', rarity: 'uncommon', price: 350, stats: { defenseBonus: 12, healthBonus: 5 } },
    { name: '🦺 Knight Armor', description: 'Full plate protection', type: 'armor', rarity: 'rare', price: 800, stats: { defenseBonus: 22, healthBonus: 10 } },
    { name: '💎 Crystal Armor', description: 'Magically enhanced protection', type: 'armor', rarity: 'epic', price: 1800, stats: { defenseBonus: 35, healthBonus: 15 } },
    { name: '🐉 Dragon Scale Mail', description: 'Made from actual dragon scales', type: 'armor', rarity: 'legendary', price: 4500, stats: { defenseBonus: 50, healthBonus: 25 } },

    // ACCESSORIES
    { name: '💍 Lucky Ring', description: 'Brings good fortune', type: 'accessory', rarity: 'common', price: 150, stats: { critChanceBonus: 3 } },
    { name: '📿 Power Amulet', description: 'Enhances combat prowess', type: 'accessory', rarity: 'uncommon', price: 400, stats: { attackBonus: 5, defenseBonus: 5 } },
    { name: '👑 Crown of Valor', description: 'Worn by champions', type: 'accessory', rarity: 'rare', price: 1000, stats: { attackBonus: 10, healthBonus: 10, critChanceBonus: 5 } },
    { name: '🌟 Star Pendant', description: 'Blessed by the cosmos', type: 'accessory', rarity: 'epic', price: 2500, stats: { attackBonus: 15, defenseBonus: 15, critChanceBonus: 8 } },
    { name: '🔮 Orb of Eternity', description: 'Contains infinite power', type: 'accessory', rarity: 'legendary', price: 6000, stats: { attackBonus: 25, defenseBonus: 25, healthBonus: 20, critChanceBonus: 12 } },

    // POTIONS
    { name: '🧪 Minor Energy Potion', description: 'Restores 15 energy', type: 'potion', rarity: 'common', price: 50, stats: { energyRestore: 15 } },
    { name: '🧪 Energy Potion', description: 'Restores 30 energy', type: 'potion', rarity: 'uncommon', price: 120, stats: { energyRestore: 30 } },
    { name: '🧪 Greater Energy Potion', description: 'Restores 50 energy', type: 'potion', rarity: 'rare', price: 250, stats: { energyRestore: 50 } },
    { name: '💊 Mood Booster', description: 'Restores 20 mood', type: 'potion', rarity: 'common', price: 60, stats: { moodRestore: 20 } },
    { name: '💊 Greater Mood Booster', description: 'Restores 40 mood', type: 'potion', rarity: 'uncommon', price: 150, stats: { moodRestore: 40 } },
    { name: '✨ Elixir of Restoration', description: 'Restores 50 energy and 50 mood', type: 'potion', rarity: 'epic', price: 500, stats: { energyRestore: 50, moodRestore: 50 } },
  ];

  for (const item of defaultItems) {
    createItemDefinition('global', item.name, item.description, item.type, item.rarity, item.price, item.stats, true);
  }
}

// ==================== HELPERS ====================

function mapRowToItemDef(row: any): ItemDefinition {
  return {
    id: row.id,
    guildId: row.guild_id,
    name: row.name,
    description: row.description,
    type: row.type as ItemType,
    rarity: row.rarity as ItemRarity,
    price: row.price,
    attackBonus: row.attack_bonus,
    defenseBonus: row.defense_bonus,
    healthBonus: row.health_bonus,
    critChanceBonus: row.crit_chance_bonus,
    energyRestore: row.energy_restore,
    moodRestore: row.mood_restore,
    isDefault: row.is_default === 1,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  };
}

function mapRowToInventory(row: any): InventoryItem {
  return {
    id: row.id,
    guildId: row.guild_id,
    userId: row.user_id,
    itemId: row.item_id,
    quantity: row.quantity,
    equipped: row.equipped === 1,
    acquiredAt: row.acquired_at,
  };
}
