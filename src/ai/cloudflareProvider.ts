// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - Cloudflare Workers AI Provider
// Licensed under MIT License

import { AIResponse, ChatRequest, TranslationRequest, DEFAULT_MODELS, AI_CONFIG, LANGUAGE_CODES } from './types.js';

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4/accounts';

interface CloudflareAIResponse {
  success: boolean;
  result?: {
    response?: string;
  };
  errors?: Array<{ message: string }>;
}

export async function cloudflareChat(
  accountId: string,
  apiKey: string,
  request: ChatRequest
): Promise<AIResponse> {
  const model = DEFAULT_MODELS.cloudflare;
  const url = `${CLOUDFLARE_API_BASE}/${accountId}/ai/run/${model}`;

  try {
    const messages: Array<{ role: string; content: string }> = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    
    messages.push({ role: 'user', content: request.prompt });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        max_tokens: request.maxTokens ?? AI_CONFIG.maxTokens,
        temperature: request.temperature ?? AI_CONFIG.temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CLOUDFLARE AI] API Error:', response.status, errorText);
      return {
        success: false,
        error: `Cloudflare API error: ${response.status}`,
        provider: 'cloudflare',
      };
    }

    const data = await response.json() as CloudflareAIResponse;

    if (!data.success || !data.result?.response) {
      const errorMsg = data.errors?.[0]?.message ?? 'Unknown error';
      console.error('[CLOUDFLARE AI] Response error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
        provider: 'cloudflare',
      };
    }

    return {
      success: true,
      content: data.result.response,
      provider: 'cloudflare',
    };
  } catch (error) {
    console.error('[CLOUDFLARE AI] Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      provider: 'cloudflare',
    };
  }
}

export async function cloudflareTranslate(
  accountId: string,
  apiKey: string,
  request: TranslationRequest
): Promise<AIResponse> {
  const targetLang = LANGUAGE_CODES[request.targetLanguage.toLowerCase()] ?? request.targetLanguage;
  
  const prompt = `Translate the following text to ${targetLang}. 
Only output the translation, nothing else. Do not add any explanations or notes.
Preserve the original formatting, including line breaks and paragraphs.

Text to translate:
${request.text}`;

  return cloudflareChat(accountId, apiKey, {
    prompt,
    systemPrompt: 'You are a professional translator. Translate accurately while preserving the original tone and style. Only output the translation.',
    maxTokens: AI_CONFIG.translationMaxTokens,
    temperature: 0.3,
  });
}
