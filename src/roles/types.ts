export type RoleCategory = 'mood' | 'energy' | 'activity' | 'time' | 'chaos';

export interface RoleDefinition {
  roleId: string;
  category: RoleCategory;
  priority: number;
  temporary: boolean;
  durationMinutes: number | null;
}

export interface RoleStore {
  roles: RoleDefinition[];
}
