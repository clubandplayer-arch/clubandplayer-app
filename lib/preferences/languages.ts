export type CanonicalLanguage = {
  code: string;
  name: string;
  nativeName: string;
  isSupported: boolean;
  isActive: boolean;
  displayOrder: number;
};

export const DEFAULT_INTERFACE_LANGUAGE_CODE = 'it';

export const CANONICAL_LANGUAGES = [
  { code: 'it', name: 'Italian', nativeName: 'Italiano', isSupported: true, isActive: true, displayOrder: 10 },
  { code: 'en', name: 'English', nativeName: 'English', isSupported: true, isActive: true, displayOrder: 20 },
  { code: 'fr', name: 'French', nativeName: 'Français', isSupported: true, isActive: true, displayOrder: 30 },
  { code: 'es', name: 'Spanish', nativeName: 'Español', isSupported: true, isActive: true, displayOrder: 40 },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', isSupported: false, isActive: false, displayOrder: 50 },
  { code: 'de', name: 'German', nativeName: 'Deutsch', isSupported: false, isActive: false, displayOrder: 60 },
] as const satisfies readonly CanonicalLanguage[];

const languageByCode = new Map<string, CanonicalLanguage>(
  CANONICAL_LANGUAGES.map((language) => [language.code, language]),
);

function normalizeLanguageCode(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase().replace(/_/g, '-') || null;
  if (!normalized) return null;
  return normalized.split('-')[0] || null;
}

function getUsableLanguage(value?: string | null): CanonicalLanguage | null {
  const code = normalizeLanguageCode(value);
  if (!code) return null;
  const language = languageByCode.get(code) ?? null;
  return language?.isSupported && language.isActive ? language : null;
}

/**
 * Resolves interface language independently from every profile country field.
 * The fallback is deliberately not persisted: supported browser/device locale,
 * then Italian while the current web interface is Italian-first.
 */
export function resolvePreferredLanguage(input?: {
  preferredLanguageCode?: string | null;
  browserLocale?: string | null;
}): CanonicalLanguage {
  return (
    getUsableLanguage(input?.preferredLanguageCode) ??
    getUsableLanguage(input?.browserLocale) ??
    languageByCode.get(DEFAULT_INTERFACE_LANGUAGE_CODE)!
  );
}
