// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Wizard State Cache
// Licensed under MIT License

// Temporary storage for wizard state during modal submissions
const wizardStateCache = new Map<string, any>();

export function setWizardState(userId: string, guildId: string, data: any): void {
  const key = `${userId}:${guildId}`;
  wizardStateCache.set(key, { ...data, timestamp: Date.now() });
  
  // Auto-cleanup after 10 minutes
  setTimeout(() => {
    wizardStateCache.delete(key);
  }, 600000);
}

export function getWizardState(userId: string, guildId: string): any | null {
  const key = `${userId}:${guildId}`;
  const state = wizardStateCache.get(key);
  
  if (!state) return null;
  
  // Check if expired (10 minutes)
  if (Date.now() - state.timestamp > 600000) {
    wizardStateCache.delete(key);
    return null;
  }
  
  return state;
}

export function clearWizardState(userId: string, guildId: string): void {
  const key = `${userId}:${guildId}`;
  wizardStateCache.delete(key);
}
