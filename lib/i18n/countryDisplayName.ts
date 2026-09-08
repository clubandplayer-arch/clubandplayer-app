export function localizeCountryOption(code: string, fallback: string, locale: string, otherLabel: string): string {
  if (code === 'OTHER') return otherLabel;
  try {
    return new Intl.DisplayNames(locale, { type: 'region' }).of(code) || fallback;
  } catch {
    return fallback;
  }
}
