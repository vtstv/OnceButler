// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Custom Role Rules Repository
// Licensed under MIT License

import { getDb } from '../db.js';

export interface CustomRoleRule {
  id: number;
  guildId: string;
  roleId: string;
  roleName: string;
  statType: 'mood' | 'energy' | 'activity' | 'voiceMinutes' | 'onlineMinutes';
  operator: '>=' | '>' | '<=' | '<' | '==';
  value: number;
  isTemporary: boolean;
  durationMinutes: number | null;
  enabled: boolean;
  createdAt: string;
  createdBy: string;
}

export interface CustomRoleAssignment {
  id: number;
  guildId: string;
  userId: string;
  ruleId: number;
  roleId: string;
  assignedAt: string;
  expiresAt: string | null;
}

// ==================== RULES CRUD ====================

export function createCustomRoleRule(
  guildId: string,
  roleId: string,
  roleName: string,
  statType: CustomRoleRule['statType'],
  operator: CustomRoleRule['operator'],
  value: number,
  isTemporary: boolean,
  durationMinutes: number | null,
  createdBy: string
): number {
  const db = getDb();
  const result = db.prepare(
    `INSERT INTO custom_role_rules 
     (guild_id, role_id, role_name, stat_type, operator, value, is_temporary, duration_minutes, enabled, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
  ).run(guildId, roleId, roleName, statType, operator, value, isTemporary ? 1 : 0, durationMinutes, createdBy);
  return result.lastInsertRowid as number;
}

export function getCustomRoleRules(guildId: string): CustomRoleRule[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT id, guild_id, role_id, role_name, stat_type, operator, value, 
            is_temporary, duration_minutes, enabled, created_at, created_by
     FROM custom_role_rules WHERE guild_id = ? ORDER BY created_at DESC`
  ).all(guildId) as any[];

  return rows.map(mapRowToRule);
}

export function getCustomRoleRuleById(id: number): CustomRoleRule | null {
  const db = getDb();
  const row = db.prepare(
    `SELECT id, guild_id, role_id, role_name, stat_type, operator, value, 
            is_temporary, duration_minutes, enabled, created_at, created_by
     FROM custom_role_rules WHERE id = ?`
  ).get(id) as any;

  return row ? mapRowToRule(row) : null;
}

export function getEnabledRulesForGuild(guildId: string): CustomRoleRule[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT id, guild_id, role_id, role_name, stat_type, operator, value, 
            is_temporary, duration_minutes, enabled, created_at, created_by
     FROM custom_role_rules WHERE guild_id = ? AND enabled = 1`
  ).all(guildId) as any[];

  return rows.map(mapRowToRule);
}

export function updateCustomRoleRule(id: number, updates: Partial<Pick<CustomRoleRule, 'enabled' | 'value' | 'operator'>>): boolean {
  const db = getDb();
  const setParts: string[] = [];
  const values: any[] = [];

  if (updates.enabled !== undefined) {
    setParts.push('enabled = ?');
    values.push(updates.enabled ? 1 : 0);
  }
  if (updates.value !== undefined) {
    setParts.push('value = ?');
    values.push(updates.value);
  }
  if (updates.operator !== undefined) {
    setParts.push('operator = ?');
    values.push(updates.operator);
  }

  if (setParts.length === 0) return false;

  values.push(id);
  const result = db.prepare(
    `UPDATE custom_role_rules SET ${setParts.join(', ')} WHERE id = ?`
  ).run(...values);
  return result.changes > 0;
}

export function toggleCustomRoleRule(id: number): boolean {
  const db = getDb();
  const result = db.prepare(
    `UPDATE custom_role_rules SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END WHERE id = ?`
  ).run(id);
  return result.changes > 0;
}

export function deleteCustomRoleRule(id: number): boolean {
  const db = getDb();
  // First delete all assignments for this rule
  db.prepare(`DELETE FROM custom_role_assignments WHERE rule_id = ?`).run(id);
  // Then delete the rule
  const result = db.prepare(`DELETE FROM custom_role_rules WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function deleteAllCustomRoleRulesForGuild(guildId: string): number {
  const db = getDb();
  db.prepare(`DELETE FROM custom_role_assignments WHERE guild_id = ?`).run(guildId);
  const result = db.prepare(`DELETE FROM custom_role_rules WHERE guild_id = ?`).run(guildId);
  return result.changes;
}

// ==================== ASSIGNMENTS ====================

export function createRoleAssignment(
  guildId: string,
  userId: string,
  ruleId: number,
  roleId: string,
  expiresAt: Date | null
): number {
  const db = getDb();
  const result = db.prepare(
    `INSERT OR REPLACE INTO custom_role_assignments 
     (guild_id, user_id, rule_id, role_id, expires_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(guildId, userId, ruleId, roleId, expiresAt?.toISOString() || null);
  return result.lastInsertRowid as number;
}

export function getRoleAssignment(guildId: string, userId: string, ruleId: number): CustomRoleAssignment | null {
  const db = getDb();
  const row = db.prepare(
    `SELECT id, guild_id, user_id, rule_id, role_id, assigned_at, expires_at
     FROM custom_role_assignments WHERE guild_id = ? AND user_id = ? AND rule_id = ?`
  ).get(guildId, userId, ruleId) as any;

  return row ? mapRowToAssignment(row) : null;
}

export function getUserAssignments(guildId: string, userId: string): CustomRoleAssignment[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT id, guild_id, user_id, rule_id, role_id, assigned_at, expires_at
     FROM custom_role_assignments WHERE guild_id = ? AND user_id = ?`
  ).all(guildId, userId) as any[];

  return rows.map(mapRowToAssignment);
}

export function deleteRoleAssignment(id: number): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM custom_role_assignments WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function deleteRoleAssignmentByRule(guildId: string, userId: string, ruleId: number): boolean {
  const db = getDb();
  const result = db.prepare(
    `DELETE FROM custom_role_assignments WHERE guild_id = ? AND user_id = ? AND rule_id = ?`
  ).run(guildId, userId, ruleId);
  return result.changes > 0;
}

export function getExpiredAssignments(): CustomRoleAssignment[] {
  const db = getDb();
  const now = new Date().toISOString();
  const rows = db.prepare(
    `SELECT id, guild_id, user_id, rule_id, role_id, assigned_at, expires_at
     FROM custom_role_assignments WHERE expires_at IS NOT NULL AND expires_at <= ?`
  ).all(now) as any[];

  return rows.map(mapRowToAssignment);
}

// ==================== EVALUATION ====================

export function evaluateRule(rule: CustomRoleRule, statValue: number): boolean {
  switch (rule.operator) {
    case '>=': return statValue >= rule.value;
    case '>': return statValue > rule.value;
    case '<=': return statValue <= rule.value;
    case '<': return statValue < rule.value;
    case '==': return statValue === rule.value;
    default: return false;
  }
}

// ==================== HELPERS ====================

function mapRowToRule(row: any): CustomRoleRule {
  return {
    id: row.id,
    guildId: row.guild_id,
    roleId: row.role_id,
    roleName: row.role_name,
    statType: row.stat_type,
    operator: row.operator,
    value: row.value,
    isTemporary: row.is_temporary === 1,
    durationMinutes: row.duration_minutes,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

function mapRowToAssignment(row: any): CustomRoleAssignment {
  return {
    id: row.id,
    guildId: row.guild_id,
    userId: row.user_id,
    ruleId: row.rule_id,
    roleId: row.role_id,
    assignedAt: row.assigned_at,
    expiresAt: row.expires_at,
  };
}
