import { CANONICAL_LANGUAGES, DEFAULT_INTERFACE_LANGUAGE_CODE } from '@/lib/preferences/languages';

export const LOCALE_COOKIE_NAME = 'cp_locale';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const ACTIVE_LOCALES = CANONICAL_LANGUAGES.filter(
  (language) => language.isSupported && language.isActive,
).map((language) => language.code) as Array<'it' | 'en' | 'fr' | 'es'>;

export type Locale = (typeof ACTIVE_LOCALES)[number];

export const DEFAULT_LOCALE = DEFAULT_INTERFACE_LANGUAGE_CODE as Locale;

export function normalizeLocale(value?: string | null): Locale | null {
  const base = value?.trim().toLowerCase().replace(/_/g, '-').split('-')[0];
  return ACTIVE_LOCALES.includes(base as Locale) ? (base as Locale) : null;
}

export function resolveLocale(input: {
  profileLocale?: string | null;
  localLocale?: string | null;
  browserLocale?: string | null;
}): Locale {
  return (
    normalizeLocale(input.profileLocale) ??
    normalizeLocale(input.localLocale) ??
    normalizeLocale(input.browserLocale) ??
    DEFAULT_LOCALE
  );
}
