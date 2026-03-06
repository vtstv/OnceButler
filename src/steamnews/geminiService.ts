// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Gemini Translation Service
// Licensed under MIT License

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason?: string;
  }>;
  error?: { message: string; code?: number };
}

// Model fallback order: fastest to most capable
const GEMINI_MODELS = [
  'gemini-3.1-flash-lite-preview',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
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
          temperature: 0.2,
          maxOutputTokens: 4000,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_ONLY_HIGH',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_ONLY_HIGH',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH',
          },
        ],
      }),
    });

    const data = (await response.json()) as GeminiResponse;

    if (data.error) {
      console.error(`[GEMINI] ${model} Error:`, data.error.message);
      return null;
    }

    const candidate = data.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const text = candidate?.content?.parts?.[0]?.text;

    // Check finish reason - only STOP is acceptable
    if (finishReason && finishReason !== 'STOP') {
      console.warn(`[GEMINI] ${model} interrupted. Reason: ${finishReason}`);

      if (finishReason === 'MAX_TOKENS') {
        console.warn(`[GEMINI] ${model} hit token limit - trying next model`);
      } else if (finishReason === 'SAFETY') {
        console.warn(`[GEMINI] ${model} blocked by safety filter - trying next model`);
      } else if (finishReason === 'RECITATION') {
        console.warn(`[GEMINI] ${model} blocked due to recitation - trying next model`);
      } else {
        console.warn(`[GEMINI] ${model} stopped with reason: ${finishReason} - trying next model`);
      }
      return null;
    }

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