import type { Locale } from '../config';
import type { MessageKey } from './it';

export type Messages = Record<MessageKey, string>;

const loaders: Record<Locale, () => Promise<{ default: Messages }>> = {
  it: () => import('./it'),
  en: () => import('./en'),
  fr: () => import('./fr'),
  es: () => import('./es'),
};

export async function loadMessages(locale: Locale): Promise<Messages> {
  return (await loaders[locale]()).default;
}

export type { MessageKey };
