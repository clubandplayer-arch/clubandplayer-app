import type { Locale } from './config';

const intlLocales: Record<Locale, string> = { it: 'it-IT', en: 'en-GB', fr: 'fr-FR', es: 'es-ES' };

export const formatDate = (value: Date | string | number, locale: Locale, options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(intlLocales[locale], options).format(new Date(value));

export const formatNumber = (value: number, locale: Locale, options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat(intlLocales[locale], options).format(value);
