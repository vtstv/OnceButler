// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Custom Roles Setup Handlers
// Licensed under MIT License

import {
  RoleSelectMenuInteraction,
  StringSelectMenuInteraction,
  ButtonInteraction,
  MessageFlags,
} from 'discord.js';
import { 
  createCustomRoleRule, 
  type CustomRoleRule 
} from '../../../../database/repositories/customRolesRepo.js';
import { buildCustomRoleAddWizard } from '../customRolesBuilder.js';
import type { SetupView } from '../types.js';

export interface WizardState {
  step: number;
  data: Partial<CustomRoleRule>;
}

export function handleWizardRoleSelect(
  interaction: RoleSelectMenuInteraction,
  wizardState: WizardState,
  guildId: string
): { view: SetupView; newState: WizardState } {
  const role = interaction.roles.first()!;
  
  const newData = {
    ...wizardState.data,
    roleId: role.id,
    roleName: role.name,
  };
  
  const newState: WizardState = {
    step: 1, // Move to next step
    data: newData,
  };
  
  return {
    view: buildCustomRoleAddWizard(1, guildId, newData),
    newState,
  };
}

export function handleWizardStatSelect(
  interaction: StringSelectMenuInteraction,
  wizardState: WizardState,
  guildId: string
): { view: SetupView; newState: WizardState } {
  const statType = interaction.values[0] as 'mood' | 'energy' | 'activity' | 'voiceMinutes' | 'onlineMinutes';
  
  const newData = {
    ...wizardState.data,
    statType,
  };
  
  const newState: WizardState = {
    step: 2,
    data: newData,
  };
  
  return {
    view: buildCustomRoleAddWizard(2, guildId, newData),
    newState,
  };
}

export function handleWizardOperatorSelect(
  interaction: StringSelectMenuInteraction,
  wizardState: WizardState,
  guildId: string
): { view: SetupView; newState: WizardState } {
  const operator = interaction.values[0] as '>=' | '>' | '<=' | '<' | '==';
  
  const newData = {
    ...wizardState.data,
    operator,
  };
  
  const newState: WizardState = {
    step: 3,
    data: newData,
  };
  
  return {
    view: buildCustomRoleAddWizard(3, guildId, newData),
    newState,
  };
}

export function handleWizardValueSelect(
  interaction: StringSelectMenuInteraction,
  wizardState: WizardState,
  guildId: string
): { view: SetupView; newState: WizardState } {
  const value = parseInt(interaction.values[0]);
  
  const newData = {
    ...wizardState.data,
    value,
  };
  
  const newState: WizardState = {
    step: 4,
    data: newData,
  };
  
  return {
    view: buildCustomRoleAddWizard(4, guildId, newData),
    newState,
  };
}

export function handleWizardOptionsSelect(
  interaction: StringSelectMenuInteraction,
  wizardState: WizardState,
  guildId: string
): { view: SetupView; newState: WizardState } {
  const optionValue = interaction.values[0];
  const isTemporary = optionValue !== 'permanent';
  const durationMinutes = isTemporary ? parseInt(optionValue) : undefined;
  
  const newData = {
    ...wizardState.data,
    isTemporary,
    durationMinutes,
  };
  
  const newState: WizardState = {
    step: 5,
    data: newData,
  };
  
  return {
    view: buildCustomRoleAddWizard(5, guildId, newData),
    newState,
  };
}

export async function handleWizardConfirm(
  interaction: ButtonInteraction,
  wizardState: WizardState,
  guildId: string
): Promise<{ success: boolean; ruleId?: number; error?: string }> {
  const data = wizardState.data;
  
  // Validate all required fields
  if (!data.roleId || !data.roleName || !data.statType || !data.operator || data.value === undefined) {
    return { success: false, error: 'Missing required fields' };
  }
  
  try {
    const ruleId = createCustomRoleRule(
      guildId,
      data.roleId,
      data.roleName,
      data.statType,
      data.operator,
      data.value,
      data.isTemporary ?? false,
      data.durationMinutes ?? null,
      interaction.user.id
    );
    
    return { success: true, ruleId };
  } catch (error) {
    console.error('[CustomRoles] Error creating rule:', error);
    return { success: false, error: 'Failed to create rule' };
  }
}
