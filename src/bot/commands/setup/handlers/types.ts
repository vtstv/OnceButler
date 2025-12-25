// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Setup Handler Types
// Licensed under MIT License

import type { CustomRoleRule } from '../../../../database/repositories/customRolesRepo.js';
import type { SetupCategory, RoleSubCategory } from '../types.js';

export interface SelectMenuResult {
  shouldReturn: boolean;
  wizardStep?: number;
  wizardData?: Partial<CustomRoleRule>;
  levelingRoleToAdd?: LevelingRoleData;
}

export interface ButtonResult {
  shouldReturn: boolean;
  wizardStep?: number;
  wizardData?: Partial<CustomRoleRule>;
  category?: SetupCategory;
  levelingRoleToAdd?: LevelingRoleData;
}

export interface LevelingRoleData {
  roleId?: string;
  level?: number;
}

export interface CollectorState {
  currentCategory: SetupCategory;
  currentRoleSubCategory: RoleSubCategory;
  wizardStep: number;
  wizardData: Partial<CustomRoleRule>;
  levelingRoleToAdd: LevelingRoleData;
}
