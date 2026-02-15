/**
 * Type definitions for Twitch Drops Notifier module
 */

/**
 * Represents a single drop within a campaign
 */
export interface TwitchDrop {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  requiredMinutesWatched: number;
  benefitEdges: Array<{
    benefit: {
      id: string;
      name: string;
      imageAssetURL?: string;
    };
  }>;
}

/**
 * Represents a Twitch drops campaign
 */
export interface TwitchDropsCampaign {
  id: string;
  name: string;
  status: string;
  game: {
    id: string;
    displayName: string;
  };
  startAt: string;
  endAt: string;
  timeBasedDrops?: TwitchDrop[];
}

/**
 * API response structure from TwithDropsNotifier API
 */
export interface TwitchDropsAPIResponse {
  success: boolean;
  games: Array<{
    gameName: string;
    campaigns: TwitchDropsCampaign[];
  }>;
  timestamp: string;
}

/**
 * Configuration for Twitch Drops module
 */
export interface TwitchDropsConfig {
  apiUrl: string;
  apiKey: string;
  checkIntervalMinutes: number;
}

/**
 * Database record for tracking posted campaigns
 */
export interface PostedCampaignRecord {
  campaignId: string;
  guildId: string;
  channelId: string;
  campaignName: string;
  gameName: string;
  postedAt: number;
}
