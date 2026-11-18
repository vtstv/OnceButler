// Copyright (c) 2026 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Gemini Models Service
// Licensed under MIT License

export interface GeminiModelInfo {
  id: string;
  name: string;
  description: string;
  isRecommended: boolean;
}

export const DEFAULT_FALLBACK_MODELS: GeminiModelInfo[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast, accurate, and cost-efficient (Default & Recommended)',
    isRecommended: true,
  },
  {
    id: 'gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite Preview',
    description: 'Ultra-low latency next-generation model',
    isRecommended: true,
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    description: 'High capability balanced preview model',
    isRecommended: false,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Maximum reasoning and complex context capability',
    isRecommended: false,
  },
];

interface CacheEntry {
  models: GeminiModelInfo[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const EXCLUDED_KEYWORDS = [
  'tts',
  'robotics',
  'embedding',
  'audio',
  'computer-use',
  'image',
  'imagen',
  'customtools',
  'medlm',
];

export async function fetchAvailableGeminiModels(
  apiKey: string,
  forceRefresh = false
): Promise<GeminiModelInfo[]> {
  const cacheKey = apiKey.slice(-8); // Key by tail of API key
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.models;
  }

  if (!apiKey) {
    return DEFAULT_FALLBACK_MODELS;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.warn(`[GEMINI MODELS] API returned ${response.status}. Using fallback models.`);
      return cached?.models ?? DEFAULT_FALLBACK_MODELS;
    }

    const data = await response.json() as any;
    const rawModels: any[] = data.models ?? [];

    const discovered: GeminiModelInfo[] = [];
    const seenIds = new Set<string>();

    for (const m of rawModels) {
      const fullId: string = m.name ?? '';
      const cleanId = fullId.replace(/^models\//, '');
      const lower = cleanId.toLowerCase();

      // Must be a Gemini text model supporting generateContent
      if (!lower.includes('gemini')) continue;
      if (Array.isArray(m.supportedGenerationMethods) && !m.supportedGenerationMethods.includes('generateContent')) {
        continue;
      }
      if (EXCLUDED_KEYWORDS.some(kw => lower.includes(kw))) {
        continue;
      }

      if (seenIds.has(cleanId)) continue;
      seenIds.add(cleanId);

      const displayName = m.displayName ?? formatModelDisplayName(cleanId);
      const isRec = cleanId.includes('2.5-flash') || cleanId.includes('3.1-flash-lite');

      discovered.push({
        id: cleanId,
        name: displayName,
        description: m.description ? cleanDescription(m.description) : `Google Gemini model (${cleanId})`,
        isRecommended: isRec,
      });
    }

    if (discovered.length > 0) {
      // Sort recommended models first, then alphabetical
      discovered.sort((a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        return a.id.localeCompare(b.id);
      });

      cache.set(cacheKey, { models: discovered, timestamp: now });
      return discovered;
    }
  } catch (error) {
    console.error('[GEMINI MODELS] Error fetching models from Google API:', error);
  }

  return cached?.models ?? DEFAULT_FALLBACK_MODELS;
}

function formatModelDisplayName(id: string): string {
  return id
    .replace(/^gemini-/, 'Gemini ')
    .replace(/-/g, ' ')
    .replace(/\bpreview\b/i, 'Preview')
    .replace(/\bflash\b/i, 'Flash')
    .replace(/\blite\b/i, 'Lite')
    .replace(/\bpro\b/i, 'Pro');
}

function cleanDescription(desc: string): string {
  if (desc.length > 95) {
    return desc.slice(0, 92) + '...';
  }
  return desc;
}
