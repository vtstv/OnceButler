// Copyright (c) 2026 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Gemini Service for Steam News
// Licensed under MIT License

import type { SteamNewsItem } from './types.js';
import { getSelectedSteamNewsModel, DEFAULT_STEAM_NEWS_MODEL } from '../database/repositories/botSettingsRepo.js';

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason?: string;
  }>;
  error?: { message: string; code?: number };
}

// Built-in fallback order if primary model fails
const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview',
];

export function buildNewsPrompt(
  content: string,
  publishTimestamp: number,
  appId: number = 2139460,
  gameName: string = 'Once Human',
  mode: 'localized' | 'original' = 'localized'
): string {
  const publishYear = new Date(publishTimestamp * 1000).getUTCFullYear();
  const defaultDiscordTimestamp = `<t:${publishTimestamp}:F> (<t:${publishTimestamp}:R>)`;

  // Original language prompt (no translation)
  if (mode === 'original') {
    if (appId === 2139460) {
      return `You are a news curator for Once Human for a Discord channel.

STEAM ARTICLE METADATA:
- Steam publication timestamp: ${defaultDiscordTimestamp} (current year: ${publishYear})

TASK: Create a STRUCTURED SUMMARY of the news in its ORIGINAL language (do NOT translate to Russian; keep the original language of the text).

Response format:
1. **📋 BRIEF SUMMARY** (2-3 sentences) - core update essence
2. **🗓️ UPDATE TIME** - copy Discord timestamps from the text as is (format <t:timestamp:F> (<t:timestamp:R>)). If there is no specific maintenance/update time in the text, use the Steam publication timestamp: ${defaultDiscordTimestamp}
3. **✨ KEY CHANGES** - list of main updates/features (5-10 bullet points maximum)
4. **🎁 REWARDS** - ONLY if compensations/maintenance bonuses are mentioned. COMPLETELY OMIT this section if no rewards are mentioned
5. **⚙️ TECHNICAL DETAILS** - patch sizes, server maintenance duration

RULES:
- Keep the summary in the ORIGINAL language of the news article (do NOT translate)
- Use emoji and **bold text**
- Consolidate similar items, do not duplicate
- EXCLUDE: RaidZone Mode, Custom Server, ban tables, shop/store promotion information
- Discord timestamps are already formatted as <t:TIMESTAMP:F> - DO NOT alter them, simply copy them
- In the "UPDATE TIME" section ALWAYS use Discord timestamp (<t:TIMESTAMP:F>). NEVER write an arbitrary past year (e.g. 2024)!
- Do NOT write "None" or "Not specified" - simply omit the section if there is no content

Generate a message under 2000 characters total. This is a strict limit and must not be exceeded (count all characters including spaces and line breaks).
Be concise yet informative!

News text:
${content}

Respond ONLY with the formatted summary.`;
    }

    return `You are a news curator for ${gameName} for a Discord channel.

STEAM ARTICLE METADATA:
- Steam publication timestamp: ${defaultDiscordTimestamp} (current year: ${publishYear})

TASK: Create a STRUCTURED SUMMARY of the news in its ORIGINAL language (do NOT translate to Russian; keep the original language of the text).

Response format:
1. **📋 BRIEF SUMMARY** (2-3 sentences) - core update essence
2. **🗓️ UPDATE TIME** - copy Discord timestamps from the text as is (format <t:timestamp:F> (<t:timestamp:R>)). If there is no specific maintenance/update time in the text, use the Steam publication timestamp: ${defaultDiscordTimestamp}
3. **✨ KEY CHANGES** - list of main new features, balance changes, and content (5-10 bullet points maximum)
4. **⚙️ TECHNICAL FIXES** - bug fixes, optimizations, stability improvements

RULES:
- Keep the summary in the ORIGINAL language of the news article (do NOT translate)
- Use emoji and **bold text**
- Consolidate similar items, do not duplicate
- Discord timestamps are already formatted as <t:TIMESTAMP:F> - DO NOT alter them, simply copy them
- In the "UPDATE TIME" section ALWAYS use Discord timestamp (<t:TIMESTAMP:F>). NEVER write an arbitrary past year!
- Do NOT write "None" or "Not specified" - simply omit the section if there is no content

Generate a message under 2000 characters total. This is a strict limit and must not be exceeded (count all characters including spaces and line breaks).
Be concise yet informative!

News text:
${content}

Respond ONLY with the formatted summary.`;
  }

  // Specific prompt for Once Human (AppID 2139460)
  if (appId === 2139460) {
    return `Ты - помощник по обработке новостей для игры Once Human для Discord-канала.

МЕТАДАННЫЕ СТАТЬИ STEAM:
- Дата публикации новости в Steam: ${defaultDiscordTimestamp} (актуальный год: ${publishYear})

ЗАДАЧА: Создать СТРУКТУРИРОВАННЫЙ SUMMARY новости на русском языке.

Формат ответа:
1. **📋 КРАТКОЕ РЕЗЮМЕ** (2-3 предложения) - суть обновления
2. **🗓️ ВРЕМЯ ОБНОВЛЕНИЯ** - скопируй Discord timestamps из текста как есть (формат <t:число:F> (<t:число:R>)). Если в тексте нет точного времени техработ, используй дату публикации новости: ${defaultDiscordTimestamp}
3. **✨ КЛЮЧЕВЫЕ ИЗМЕНЕНИЯ** - список основных нововведений (5-10 пунктов максимум)
4. **🎁 НАГРАДЫ** - ТОЛЬКО если есть компенсации/бонусы. ПОЛНОСТЬЮ ПРОПУСТИ эту секцию, если наград нет
5. **⚙️ ТЕХНИЧЕСКИЕ ДЕТАЛИ** - размеры обновления, длительность обслуживания

ПРАВИЛА:
- Переводи на русский
- Используй эмодзи и **жирный текст**
- Объединяй похожие пункты, не дублируй
- ИСКЛЮЧАЙ: RaidZone Mode, Custom Server, таблицы банов, информацию о магазине
- Discord timestamps уже готовы в формате <t:ЧИСЛО:F> - НЕ МЕНЯЙ их, просто копируй
- В секции "ВРЕМЯ ОБНОВЛЕНИЯ" ВСЕГДА используй Discord timestamp (<t:ЧИСЛО:F>). КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать произвольный прошлый год (например, 2024)!
- НЕ ПИШИ "не указаны" - просто не включай секцию, если контента нет

Generate a message under 2000 characters total. This is a strict limit and must not be exceeded (count all characters including spaces and line breaks).
Будь лаконичен, но информативен!

Текст новости:
${content}

Ответь ТОЛЬКО отформатированным summary.`;
  }

  // Universal default prompt for any other game
  return `Ты - помощник по обработке новостей для игры ${gameName} для Discord-канала.

МЕТАДАННЫЕ СТАТЬИ STEAM:
- Дата публикации новости в Steam: ${defaultDiscordTimestamp} (актуальный год: ${publishYear})

ЗАДАЧА: Создать СТРУКТУРИРОВАННЫЙ SUMMARY новости на русском языке.

Формат ответа:
1. **📋 КРАТКОЕ РЕЗЮМЕ** (2-3 предложения) - суть обновления
2. **🗓️ ВРЕМЯ ОБНОВЛЕНИЯ** - скопируй Discord timestamps из текста как есть (формат <t:число:F> (<t:число:R>)). Если в тексте нет точного времени техработ, используй дату публикации новости: ${defaultDiscordTimestamp}
3. **✨ КЛЮЧЕВЫЕ ИЗМЕНЕНИЯ** - список основных нововведений, изменений баланса и контента (5-10 пунктов максимум)
4. **⚙️ ТЕХНИЧЕСКИЕ ИСПРАВЛЕНИЯ** - исправления ошибок, оптимизация, стабильность работы

ПРАВИЛА:
- Переводи на русский
- Используй эмодзи и **жирный текст**
- Объединяй похожие пункты, не дублируй
- Discord timestamps уже готовы в формате <t:ЧИСЛО:F> - НЕ МЕНЯЙ их, просто копируй
- В секции "ВРЕМЯ ОБНОВЛЕНИЯ" ВСЕГДА используй Discord timestamp (<t:ЧИСЛО:F>). КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать произвольный прошлый год!
- НЕ ПИШИ "не указаны" - просто не включай секцию, если контента нет

Generate a message under 2000 characters total. This is a strict limit and must not be exceeded (count all characters including spaces and line breaks).
Будь лаконичен, но информативен!

Текст новости:
${content}

Ответь ТОЛЬКО отформатированным summary.`;
}

export async function translateAndSummarize(
  content: string,
  apiKey: string,
  newsItem?: SteamNewsItem | { date?: number; appid?: number },
  gameName?: string,
  customModel?: string,
  mode: 'localized' | 'original' = 'localized'
): Promise<string | null> {
  const publishTimestamp = newsItem?.date ?? Math.floor(Date.now() / 1000);
  const appId = (newsItem as any)?.appid ?? 2139460;
  const prompt = buildNewsPrompt(content, publishTimestamp, appId, gameName ?? 'Once Human', mode);

  // Determine model hierarchy: customModel -> selectedGlobalModel -> fallbacks
  const primaryModel = customModel || getSelectedSteamNewsModel() || DEFAULT_STEAM_NEWS_MODEL;
  const modelsToTry = [
    primaryModel,
    ...FALLBACK_MODELS.filter(m => m !== primaryModel),
  ];

  for (const model of modelsToTry) {
    const result = await tryModel(model, apiKey, prompt);
    if (result.text) {
      console.log(`[GEMINI] Successfully processed news with ${model}`);
      return result.text;
    }
    console.warn(`[GEMINI] ${model} failed (${result.error ?? 'unknown'}), trying next fallback...`);
  }

  console.error('[GEMINI] All models failed or rate limited');
  return null;
}

export async function testGeminiModel(
  model: string,
  apiKey: string
): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  const testPrompt = 'Say "OK" if you receive this message.';
  const res = await tryModel(model, apiKey, testPrompt, 8000);
  const latencyMs = Date.now() - start;

  if (res.text) {
    return { success: true, latencyMs };
  }
  return { success: false, latencyMs, error: res.error ?? 'Model failed or did not return text' };
}

async function tryModel(
  model: string,
  apiKey: string,
  prompt: string,
  timeoutMs = 15000
): Promise<{ text: string | null; error?: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Helper to execute request with optional thinkingConfig
  const executeRequest = async (useThinkingBudgetZero: boolean) => {
    const generationConfig: Record<string, any> = {
      temperature: 0.2,
      maxOutputTokens: 2500,
    };

    if (useThinkingBudgetZero) {
      // Disabling thinking/reasoning significantly decreases latency and token consumption
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    });

    const data = (await response.json()) as GeminiResponse;
    return { response, data };
  };

  try {
    let { response, data } = await executeRequest(true);

    // If model rejected thinkingConfig with 400 (e.g. thinking not supported), retry without it
    if (response.status === 400 && data.error?.message?.toLowerCase().includes('thinking')) {
      const fallbackAttempt = await executeRequest(false);
      response = fallbackAttempt.response;
      data = fallbackAttempt.data;
    }

    if (data.error) {
      console.error(`[GEMINI] ${model} Error (${response.status}):`, data.error.message);
      return { text: null, error: data.error.message };
    }

    const candidate = data.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const text = candidate?.content?.parts?.[0]?.text;

    if (finishReason && finishReason !== 'STOP') {
      console.warn(`[GEMINI] ${model} interrupted. Reason: ${finishReason}`);
      return { text: null, error: `Interrupted (${finishReason})` };
    }

    if (!text) {
      console.error(`[GEMINI] No text in response from ${model}`);
      return { text: null, error: 'Empty text in response' };
    }

    return { text: text.trim() };
  } catch (error: any) {
    const isTimeout = error.name === 'TimeoutError' || error.message?.includes('timeout') || error.name === 'AbortError';
    const errMessage = isTimeout ? `Timeout after ${timeoutMs / 1000}s` : (error.message ?? 'Unknown fetch error');
    console.error(`[GEMINI] Request to ${model} failed:`, errMessage);
    return { text: null, error: errMessage };
  }
}
