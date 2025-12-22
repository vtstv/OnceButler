// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Role Types
// Licensed under MIT License

export type RoleCategory = 'mood' | 'energy' | 'activity' | 'time' | 'chaos';

export interface RoleDefinition {
  roleId: string;
  category: RoleCategory;
  priority: number;
  temporary: boolean;
  durationMinutes: number | null;
}

export interface RoleMapping {
  mood: {
    high2: string;
    high1: string;
    mid: string;
    low1: string;
    low2: string;
  };
  energy: {
    high2: string;
    high1: string;
    mid: string;
    low1: string;
    low2: string;
  };
  activity: {
    high: string;
    mid1: string;
    mid2: string;
    low: string;
  };
  time: {
    night: string;
    day: string;
    evening: string;
  };
  chaos: string[];
}

export interface AchievementMapping {
  voice_rookie: string;
  voice_regular: string;
  voice_veteran: string;
  mood_master: string;
  energy_king: string;
  hyperactive: string;
}

export interface RoleStore {
  roles: RoleDefinition[];
  mapping?: RoleMapping;
  achievements?: AchievementMapping;
}
