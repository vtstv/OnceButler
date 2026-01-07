// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Google Gemini AI Provider
// Licensed under MIT License

import { AIResponse, ChatRequest, TranslationRequest, DEFAULT_MODELS, AI_CONFIG, LANGUAGE_CODES } from './types.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
    code?: number;
  };
}

export async function geminiChat(
  apiKey: string,
  request: ChatRequest
): Promise<AIResponse> {
  const model = DEFAULT_MODELS.gemini;
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

  try {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    
    // Add system instruction as first user message if provided
    if (request.systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: `System instruction: ${request.systemPrompt}\n\nNow respond to the following:` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will follow those instructions.' }],
      });
    }
    
    contents.push({
      role: 'user',
      parts: [{ text: request.prompt }],
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: request.maxTokens ?? AI_CONFIG.maxTokens,
          temperature: request.temperature ?? AI_CONFIG.temperature,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GEMINI AI] API Error:', response.status, errorText);
      return {
        success: false,
        error: `Gemini API error: ${response.status}`,
        provider: 'gemini',
      };
    }

    const data = await response.json() as GeminiResponse;

    if (data.error) {
      console.error('[GEMINI AI] Response error:', data.error.message);
      return {
        success: false,
        error: data.error.message ?? 'Unknown error',
        provider: 'gemini',
      };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return {
        success: false,
        error: 'No response generated',
        provider: 'gemini',
      };
    }

    return {
      success: true,
      content: text,
      provider: 'gemini',
    };
  } catch (error) {
    console.error('[GEMINI AI] Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      provider: 'gemini',
    };
  }
}

export async function geminiTranslate(
  apiKey: string,
  request: TranslationRequest
): Promise<AIResponse> {
  const targetLang = LANGUAGE_CODES[request.targetLanguage.toLowerCase()] ?? request.targetLanguage;
  
  const prompt = `Translate the following text to ${targetLang}. 
Only output the translation, nothing else. Do not add any explanations or notes.
Preserve the original formatting, including line breaks and paragraphs.

Text to translate:
${request.text}`;

  return geminiChat(apiKey, {
    prompt,
    systemPrompt: 'You are a professional translator. Translate accurately while preserving the original tone and style. Only output the translation.',
    maxTokens: AI_CONFIG.translationMaxTokens,
    temperature: 0.3,
  });
}
