// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Gemini Translation Service
// Licensed under MIT License

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
  error?: { message: string; code?: number };
}

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

export async function translateAndSummarize(
  content: string,
  apiKey: string
): Promise<string | null> {
  const prompt = `Ты - помощник по обработке новостей для игры Once Human для Discord-канала.

ЗАДАЧА: Создать СТРУКТУРИРОВАННОЕ SUMMARY новости на русском языке.

ФОРМАТ ОТВЕТА:
1. **📋 КРАТКОЕ РЕЗЮМЕ** (2-3 предложения) - суть обновления
2. **🗓️ ВРЕМЯ ОБНОВЛЕНИЯ** - скопируй Discord timestamps из текста как есть (формат <t:число:F>)
3. **✨ КЛЮЧЕВЫЕ ИЗМЕНЕНИЯ** - список основных нововведений (5-10 пунктов максимум)
4. **🎁 НАГРАДЫ** - ТОЛЬКО если есть компенсации/бонусы. ПОЛНОСТЬЮ ПРОПУСТИ эту секцию, если наград нет
5. **🔧 ИСПРАВЛЕНИЯ БАГОВ** - ТОЛЬКО если есть исправления. ПОЛНОСТЬЮ ПРОПУСТИ эту секцию, если багфиксов нет

ПРАВИЛА:
- Переводи на русский
- Используй эмодзи и **жирный текст**
- Объединяй похожие пункты, не дублируй
- ИСКЛЮЧАЙ: RaidZone Mode, таблицы банов, информацию о магазине
- Discord timestamps уже готовы в формате <t:ЧИСЛО:F> - НЕ МЕНЯЙ их, просто копируй
- НЕ ПИШИ "Не указаны" - просто не включай секцию, если контента нет

ПОЛНОСТЬЮ ИСКЛЮЧИ:
- Любые упоминания RaidZone Mode
- Таблицы с банами игроков

Generate a message under 2000 characters total. This is a strict limit and must not be exceeded (count all characters including spaces and line breaks).
Будь лаконичен, но информативен!

Текст новости:
${content}

Ответь ТОЛЬКО отформатированным summary.`;

  for (const model of GEMINI_MODELS) {
    const result = await tryModel(model, apiKey, prompt);
    if (result) return result;
  }

  console.error('[GEMINI] All models failed or rate limited');
  return null;
}

async function tryModel(model: string, apiKey: string, prompt: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4000,
        },
      }),
    });

    const data = await response.json() as GeminiResponse;
    
    if (data.error) {
      if (data.error.code === 429) {
        console.log(`[GEMINI] Rate limited on ${model}, trying next...`);
        return null;
      }
      console.error(`[GEMINI] Error on ${model}:`, data.error.message);
      return null;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error(`[GEMINI] No text in response from ${model}`);
      return null;
    }

    console.log(`[GEMINI] Successfully used ${model}`);
    return text.trim();
  } catch (error) {
    console.error(`[GEMINI] Request to ${model} failed:`, error);
    return null;
  }
}
