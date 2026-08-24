'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ACTIVE_LOCALES, type Locale } from '@/lib/i18n/config';
import { persistAuthenticatedLocale, persistLocaleCookie } from '@/lib/i18n/persistence';
import { CANONICAL_LANGUAGES } from '@/lib/preferences/languages';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { useI18n } from './I18nProvider';

const labels = new Map(CANONICAL_LANGUAGES.map((language) => [language.code, language.nativeName]));

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  async function choose(nextLocale: Locale) {
    const previousLocale = locale;
    setOpen(false);
    setSaveError(false);
    await setLocale(nextLocale);
    persistLocaleCookie(nextLocale);
    try {
      await persistAuthenticatedLocale(supabaseBrowser(), nextLocale);
    } catch {
      // Keep the immediate local choice; remote persistence can be retried.
      setSaveError(true);
      if (!document.cookie.includes(`cp_locale=${nextLocale}`)) await setLocale(previousLocale);
    } finally {
      router.refresh();
    }
  }

  return (
    <div ref={menuRef} className="fixed right-3 top-3 z-[100001] md:right-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t('language.select')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      >
        <span aria-hidden>🌐</span><span className="hidden sm:inline">{labels.get(locale)}</span><span aria-hidden>▾</span>
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 mt-2 min-w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {ACTIVE_LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              role="menuitemradio"
              aria-checked={code === locale}
              onClick={() => void choose(code)}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              {labels.get(code)}{code === locale ? ' ✓' : ''}
            </button>
          ))}
        </div>
      ) : null}
      {saveError ? <p role="status" className="absolute right-0 mt-2 w-72 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 shadow">{t('language.saveError')}</p> : null}
    </div>
  );
}
