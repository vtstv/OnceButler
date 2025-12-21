import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export type Locale = 'en' | 'ru' | 'de';

type Translations = Record<string, string>;

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '..', 'locales');

const cache: Record<Locale, Translations> = {} as Record<Locale, Translations>;

function loadLocale(locale: Locale): Translations {
  if (cache[locale]) return cache[locale];
  
  const filePath = join(localesDir, `${locale}.json`);
  if (!existsSync(filePath)) {
    console.warn(`Locale file not found: ${filePath}, falling back to en`);
    return loadLocale('en');
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    cache[locale] = JSON.parse(content);
    return cache[locale];
  } catch (err) {
    console.error(`Failed to load locale ${locale}:`, err);
    if (locale !== 'en') return loadLocale('en');
    return {};
  }
}

// Preload all locales
export function initLocales(): void {
  const locales: Locale[] = ['en', 'ru', 'de'];
  for (const locale of locales) {
    loadLocale(locale);
  }
  console.log('Localization files loaded.');
}

export function t(locale: Locale, key: string, replacements?: Record<string, string>): string {
  const translations = loadLocale(locale);
  let value = translations[key] ?? loadLocale('en')[key] ?? key;

  if (replacements) {
    for (const [k, v] of Object.entries(replacements)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }

  return value;
}

export function isValidLocale(locale: string): locale is Locale {
  return ['en', 'ru', 'de'].includes(locale);
}

export function getLocaleName(locale: Locale): string {
  const names: Record<Locale, string> = {
    en: 'English',
    ru: 'Русский',
    de: 'Deutsch',
  };
  return names[locale] ?? locale;
}
