/**
 * Twitch Drops Notifier Module
 * 
 * This module provides automated notifications for new Twitch drops campaigns.
 * It integrates with the OnceButler Discord bot to periodically check for new
 * drops and send formatted notifications to configured channels.
 */

// API client
export { fetchAllDrops } from './twitchDropsApi.js';

// Repository functions
export {
  initTwitchDropsTable,
  isCampaignPosted,
  markCampaignPosted,
  getPostedCampaignsForGuild,
  clearOldPostedCampaigns
} from './twitchDropsRepo.js';

// Service functions
export { initTwitchDrops, processTwitchDrops } from './twitchDropsService.js';

// Type exports
export type {
  TwitchDrop,
  TwitchDropsCampaign,
  TwitchDropsAPIResponse,
  TwitchDropsConfig,
  PostedCampaignRecord
} from './types.js';
