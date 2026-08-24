'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { loadMessages, type MessageKey, type Messages } from '@/lib/i18n/messages';
import italianMessages from '@/lib/i18n/messages/it';

type Values = Record<string, string | number>;
type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: MessageKey, values?: Values) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function interpolateMessage(message: string, values?: Values): string {
  if (!values) return message;
  return message.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}

export function I18nProvider({ initialLocale, initialMessages, children }: {
  initialLocale: Locale;
  initialMessages: Messages;
  children: React.ReactNode;
}) {
  const [locale, setCurrentLocale] = useState(initialLocale);
  const [messages, setMessages] = useState(initialMessages);

  const setLocale = useCallback(async (nextLocale: Locale) => {
    if (nextLocale === locale) return;
    const nextMessages = await loadMessages(nextLocale);
    setMessages(nextMessages);
    setCurrentLocale(nextLocale);
    document.documentElement.lang = nextLocale;
  }, [locale]);

  const t = useCallback((key: MessageKey, values?: Values) => {
    const message = messages[key] ?? initialMessages[key] ?? key;
    return interpolateMessage(message, values);
  }, [initialMessages, messages]);

  const value = useMemo(() => ({ locale, messages, setLocale, t }), [locale, messages, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}

export function translateWithFallback(
  key: string,
  messages: Partial<Messages>,
  fallbackMessages: Messages,
): string {
  return messages[key as MessageKey] ?? fallbackMessages[key as MessageKey] ?? italianMessages[key as MessageKey] ?? key;
}

export { DEFAULT_LOCALE };
