// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Economy Repository
// Licensed under MIT License

import { getDb } from '../db.js';

export interface UserWallet {
  guildId: string;
  userId: string;
  balance: number;
  bank: number;
  totalEarned: number;
  lastDaily: string | null;
  lastWork: string | null;
}

export interface ShopItem {
  id: number;
  guildId: string;
  name: string;
  description: string;
  price: number;
  roleId: string | null;
  stock: number; // -1 = unlimited
  enabled: boolean;
  createdAt: string;
}

export interface Transaction {
  id: number;
  guildId: string;
  userId: string;
  type: 'daily' | 'work' | 'pay' | 'receive' | 'purchase' | 'admin' | 'gamble';
  amount: number;
  description: string;
  createdAt: string;
}

// ==================== WALLET CRUD ====================

export function getWallet(guildId: string, userId: string): UserWallet {
  const db = getDb();
  const row = db.prepare(
    `SELECT guild_id, user_id, balance, bank, total_earned, last_daily, last_work
     FROM economy_wallets WHERE guild_id = ? AND user_id = ?`
  ).get(guildId, userId) as any;
  
  if (!row) {
    return {
      guildId,
      userId,
      balance: 0,
      bank: 0,
      totalEarned: 0,
      lastDaily: null,
      lastWork: null,
    };
  }
  
  return {
    guildId: row.guild_id,
    userId: row.user_id,
    balance: row.balance,
    bank: row.bank,
    totalEarned: row.total_earned,
    lastDaily: row.last_daily,
    lastWork: row.last_work,
  };
}

export function updateWallet(guildId: string, userId: string, updates: Partial<Omit<UserWallet, 'guildId' | 'userId'>>): void {
  const db = getDb();
  const current = getWallet(guildId, userId);
  const merged = { ...current, ...updates };
  
  db.prepare(
    `INSERT INTO economy_wallets (guild_id, user_id, balance, bank, total_earned, last_daily, last_work)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(guild_id, user_id) DO UPDATE SET
       balance = excluded.balance,
       bank = excluded.bank,
       total_earned = excluded.total_earned,
       last_daily = excluded.last_daily,
       last_work = excluded.last_work`
  ).run(guildId, userId, merged.balance, merged.bank, merged.totalEarned, merged.lastDaily, merged.lastWork);
}

export function addBalance(guildId: string, userId: string, amount: number): number {
  const wallet = getWallet(guildId, userId);
  const newBalance = wallet.balance + amount;
  const newTotalEarned = amount > 0 ? wallet.totalEarned + amount : wallet.totalEarned;
  updateWallet(guildId, userId, { balance: newBalance, totalEarned: newTotalEarned });
  return newBalance;
}

export function removeBalance(guildId: string, userId: string, amount: number): boolean {
  const wallet = getWallet(guildId, userId);
  if (wallet.balance < amount) return false;
  updateWallet(guildId, userId, { balance: wallet.balance - amount });
  return true;
}

export function transferBalance(guildId: string, fromId: string, toUserId: string, amount: number): boolean {
  const fromWallet = getWallet(guildId, fromId);
  if (fromWallet.balance < amount) return false;
  
  const toWallet = getWallet(guildId, toUserId);
  
  updateWallet(guildId, fromId, { balance: fromWallet.balance - amount });
  updateWallet(guildId, toUserId, { 
    balance: toWallet.balance + amount,
    totalEarned: toWallet.totalEarned + amount
  });
  
  return true;
}

export function depositToBank(guildId: string, userId: string, amount: number): boolean {
  const wallet = getWallet(guildId, userId);
  if (wallet.balance < amount) return false;
  
  updateWallet(guildId, userId, {
    balance: wallet.balance - amount,
    bank: wallet.bank + amount
  });
  return true;
}

export function withdrawFromBank(guildId: string, userId: string, amount: number): boolean {
  const wallet = getWallet(guildId, userId);
  if (wallet.bank < amount) return false;
  
  updateWallet(guildId, userId, {
    balance: wallet.balance + amount,
    bank: wallet.bank - amount
  });
  return true;
}

export function getTopBalances(guildId: string, limit: number = 10): Array<{ userId: string; balance: number; bank: number }> {
  const db = getDb();
  const rows = db.prepare(
    `SELECT user_id, balance, bank FROM economy_wallets 
     WHERE guild_id = ? ORDER BY (balance + bank) DESC LIMIT ?`
  ).all(guildId, limit) as any[];
  
  return rows.map(r => ({ userId: r.user_id, balance: r.balance, bank: r.bank }));
}

// ==================== SHOP CRUD ====================

export function createShopItem(
  guildId: string,
  name: string,
  description: string,
  price: number,
  roleId: string | null = null,
  stock: number = -1
): number {
  const db = getDb();
  const result = db.prepare(
    `INSERT INTO economy_shop (guild_id, name, description, price, role_id, stock, enabled)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  ).run(guildId, name, description, price, roleId, stock);
  return result.lastInsertRowid as number;
}

export function getShopItem(id: number): ShopItem | null {
  const db = getDb();
  const row = db.prepare(
    `SELECT id, guild_id, name, description, price, role_id, stock, enabled, created_at
     FROM economy_shop WHERE id = ?`
  ).get(id) as any;
  return row ? mapRowToShopItem(row) : null;
}

export function getShopItems(guildId: string, enabledOnly: boolean = true): ShopItem[] {
  const db = getDb();
  let query = `SELECT id, guild_id, name, description, price, role_id, stock, enabled, created_at
               FROM economy_shop WHERE guild_id = ?`;
  if (enabledOnly) query += ` AND enabled = 1`;
  query += ` ORDER BY price ASC`;
  
  const rows = db.prepare(query).all(guildId) as any[];
  return rows.map(mapRowToShopItem);
}

export function updateShopItem(id: number, updates: Partial<Pick<ShopItem, 'name' | 'description' | 'price' | 'stock' | 'enabled'>>): boolean {
  const db = getDb();
  const setParts: string[] = [];
  const values: any[] = [];
  
  if (updates.name !== undefined) { setParts.push('name = ?'); values.push(updates.name); }
  if (updates.description !== undefined) { setParts.push('description = ?'); values.push(updates.description); }
  if (updates.price !== undefined) { setParts.push('price = ?'); values.push(updates.price); }
  if (updates.stock !== undefined) { setParts.push('stock = ?'); values.push(updates.stock); }
  if (updates.enabled !== undefined) { setParts.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }
  
  if (setParts.length === 0) return false;
  
  values.push(id);
  const result = db.prepare(`UPDATE economy_shop SET ${setParts.join(', ')} WHERE id = ?`).run(...values);
  return result.changes > 0;
}

export function deleteShopItem(id: number): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM economy_shop WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function purchaseItem(guildId: string, userId: string, itemId: number): { success: boolean; error?: string } {
  const item = getShopItem(itemId);
  if (!item) return { success: false, error: 'Item not found' };
  if (!item.enabled) return { success: false, error: 'Item is not available' };
  if (item.stock === 0) return { success: false, error: 'Item is out of stock' };
  
  const wallet = getWallet(guildId, userId);
  if (wallet.balance < item.price) return { success: false, error: 'Insufficient balance' };
  
  // Deduct balance
  removeBalance(guildId, userId, item.price);
  
  // Reduce stock if not unlimited
  if (item.stock > 0) {
    updateShopItem(itemId, { stock: item.stock - 1 });
  }
  
  // Log transaction
  logTransaction(guildId, userId, 'purchase', -item.price, `Purchased ${item.name}`);
  
  return { success: true };
}

// ==================== TRANSACTIONS ====================

export function logTransaction(
  guildId: string,
  userId: string,
  type: Transaction['type'],
  amount: number,
  description: string
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO economy_transactions (guild_id, user_id, type, amount, description)
     VALUES (?, ?, ?, ?, ?)`
  ).run(guildId, userId, type, amount, description);
}

export function getTransactions(guildId: string, userId: string, limit: number = 10): Transaction[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT id, guild_id, user_id, type, amount, description, created_at
     FROM economy_transactions WHERE guild_id = ? AND user_id = ?
     ORDER BY created_at DESC LIMIT ?`
  ).all(guildId, userId, limit) as any[];
  
  return rows.map(r => ({
    id: r.id,
    guildId: r.guild_id,
    userId: r.user_id,
    type: r.type,
    amount: r.amount,
    description: r.description,
    createdAt: r.created_at,
  }));
}

// ==================== HELPERS ====================

function mapRowToShopItem(row: any): ShopItem {
  return {
    id: row.id,
    guildId: row.guild_id,
    name: row.name,
    description: row.description,
    price: row.price,
    roleId: row.role_id,
    stock: row.stock,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  };
}
