'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { loadMessages, type MessageKey, type Messages } from '@/lib/i18n/messages';
import italianMessages from '@/lib/i18n/messages/it';
import {
  interpolateMessage,
  translateWithFallback,
  type MessageValues,
} from '@/lib/i18n/translate';

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: MessageKey, values?: MessageValues) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

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

  const t = useCallback(
    (key: MessageKey, values?: MessageValues) =>
      translateWithFallback(key, messages, italianMessages, values),
    [messages],
  );

  const value = useMemo(() => ({ locale, messages, setLocale, t }), [locale, messages, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}

export { DEFAULT_LOCALE };
export { interpolateMessage, translateWithFallback };
