/**
 * API client for TwithDropsNotifier API
 * Handles HTTP communication with the external drops API service
 */

import type { TwitchDropsAPIResponse, TwitchDropsConfig } from './types.js';

/**
 * Fetches all monitored drops from the TwithDropsNotifier API
 * 
 * @param config - API configuration including URL, API key, and check interval
 * @returns Promise resolving to API response or null on failure
 * 
 */
export async function fetchAllDrops(config: TwitchDropsConfig): Promise<TwitchDropsAPIResponse | null> {
  try {
    // Construct the full API endpoint URL
    const apiUrl = `${config.apiUrl}/api/drops/all`;
    
    // Make GET request with Bearer token authentication
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    // Handle non-200 responses
    if (!response.ok) {
      console.error(`[TwitchDropsAPI] API request failed: ${response.status} ${response.statusText}`, {
        apiUrl,
        status: response.status,
      });
      return null;
    }

    // Parse JSON response
    const data = await response.json() as TwitchDropsAPIResponse;
    
    return data;
  } catch (error) {
    // Handle network errors, timeouts, and JSON parsing errors
    if (error instanceof Error) {
      console.error(`[TwitchDropsAPI] Error fetching drops:`, {
        apiUrl: config.apiUrl,
        error: error.message,
        name: error.name,
      });
    } else {
      console.error(`[TwitchDropsAPI] Unknown error fetching drops:`, {
        apiUrl: config.apiUrl,
        error,
      });
    }
    return null;
  }
}
