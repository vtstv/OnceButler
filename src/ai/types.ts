// Copyright (c) 2025 Murr (https://github.com/vtstv)
// OnceButler Discord Bot - AI Module Types
// Licensed under MIT License

export type AIProvider = 'cloudflare' | 'gemini';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  accountId?: string; // Required for Cloudflare
  model?: string;
}

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  provider: AIProvider;
  tokensUsed?: number;
}

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface ChatRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export const LANGUAGE_CODES: Record<string, string> = {
  'ru': 'Russian',
  'en': 'English',
  'de': 'German',
  'fr': 'French',
  'es': 'Spanish',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese',
  'ar': 'Arabic',
  'tr': 'Turkish',
  'pl': 'Polish',
  'nl': 'Dutch',
  'uk': 'Ukrainian',
  'cs': 'Czech',
  'sv': 'Swedish',
  'fi': 'Finnish',
  'da': 'Danish',
  'no': 'Norwegian',
  'el': 'Greek',
  'he': 'Hebrew',
  'hi': 'Hindi',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
};

export const DEFAULT_MODELS = {
  cloudflare: '@cf/meta/llama-3.1-8b-instruct',
  gemini: 'gemini-2.5-flash',
};

export const AI_CONFIG = {
  maxTokens: 2048,
  temperature: 0.7,
  translationMaxTokens: 4096,
};
