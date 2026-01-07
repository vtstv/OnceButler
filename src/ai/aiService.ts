// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - AI Service
// Licensed under MIT License

import { AIConfig, AIResponse, ChatRequest, TranslationRequest, AIProvider } from './types.js';
import { cloudflareChat, cloudflareTranslate } from './cloudflareProvider.js';
import { geminiChat, geminiTranslate } from './geminiProvider.js';

export async function chat(config: AIConfig, request: ChatRequest): Promise<AIResponse> {
  console.log(`[AI SERVICE] Chat request using ${config.provider}`);
  
  switch (config.provider) {
    case 'cloudflare':
      if (!config.accountId) {
        return {
          success: false,
          error: 'Cloudflare Account ID is required',
          provider: 'cloudflare',
        };
      }
      return cloudflareChat(config.accountId, config.apiKey, request);
    
    case 'gemini':
      return geminiChat(config.apiKey, request);
    
    default:
      return {
        success: false,
        error: `Unknown provider: ${config.provider}`,
        provider: config.provider,
      };
  }
}

export async function translate(config: AIConfig, request: TranslationRequest): Promise<AIResponse> {
  console.log(`[AI SERVICE] Translation request using ${config.provider} to ${request.targetLanguage}`);
  
  switch (config.provider) {
    case 'cloudflare':
      if (!config.accountId) {
        return {
          success: false,
          error: 'Cloudflare Account ID is required',
          provider: 'cloudflare',
        };
      }
      return cloudflareTranslate(config.accountId, config.apiKey, request);
    
    case 'gemini':
      return geminiTranslate(config.apiKey, request);
    
    default:
      return {
        success: false,
        error: `Unknown provider: ${config.provider}`,
        provider: config.provider,
      };
  }
}

export function isProviderConfigured(
  provider: AIProvider,
  apiKey: string | null,
  accountId: string | null
): boolean {
  if (!apiKey) return false;
  if (provider === 'cloudflare' && !accountId) return false;
  return true;
}
