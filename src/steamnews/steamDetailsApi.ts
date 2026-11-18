// Copyright (c) 2026 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Steam App Details API Client
// Licensed under MIT License

export interface SteamAppDetails {
  appId: number;
  name: string;
  headerImage?: string;
  shortDescription?: string;
}

export const ONCE_HUMAN_APP_ID = 2139460;
export const ONCE_HUMAN_NAME = 'Once Human';

export async function fetchSteamAppDetails(appId: number): Promise<SteamAppDetails | null> {
  // Once Human is our primary game
  if (appId === ONCE_HUMAN_APP_ID) {
    return {
      appId,
      name: ONCE_HUMAN_NAME,
      headerImage: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
    };
  }

  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'OnceButler/1.0',
      },
    });

    if (response.ok) {
      const data = await response.json() as any;
      const appData = data?.[appId.toString()];
      if (appData?.success && appData?.data?.name) {
        return {
          appId,
          name: appData.data.name,
          headerImage: appData.data.header_image,
          shortDescription: appData.data.short_description,
        };
      }
    }
  } catch (err) {
    console.warn(`[STEAM API] Failed to fetch store details for AppID ${appId}:`, err);
  }

  // Fallback: Verify if Steam News API has news for this app
  try {
    const newsUrl = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=1`;
    const newsResponse = await fetch(newsUrl, {
      headers: { 'Accept': 'application/json' },
    });
    if (newsResponse.ok) {
      const newsData = await newsResponse.json() as any;
      if (newsData?.appnews?.newsitems) {
        return {
          appId,
          name: `Steam App ${appId}`,
          headerImage: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
        };
      }
    }
  } catch (newsErr) {
    console.warn(`[STEAM API] News verification fallback failed for AppID ${appId}:`, newsErr);
  }

  return null;
}
