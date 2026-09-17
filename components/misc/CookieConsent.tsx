'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { legalCopy } from '@/lib/i18n/legal';

const STORAGE_KEY = 'cp-consent-v1';

export default function CookieConsent() {
  const { locale, t } = useI18n();
  const copy = legalCopy[locale].common;
  const [open, setOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);

  function saveChoice(consent: 'all' | 'necessary') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ consent, ts: Date.now() }));
      setOpen(false);
      window.location.reload();
    } catch {
      setSaveError(true);
    }
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) setOpen(true);
    } catch {
      // ignora
    }
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto mb-4 w-[min(900px,92%)] rounded-xl border bg-white p-4 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-neutral-700 dark:text-neutral-200">
          {copy.cookieNotice} {copy.cookieRead}{' '}
          <a className="underline" href="/legal/privacy" target="_blank" rel="noopener noreferrer">{t('common.privacy')}</a>{' '}
          {copy.cookieAnd}{' '}
          <a className="underline" href="/legal/terms" target="_blank" rel="noopener noreferrer">{t('common.terms')}</a>. {copy.cookieChange}
        </p>
        {saveError && <p role="alert" className="mt-2 text-sm">{copy.cookieSaveError}</p>}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => saveChoice('all')}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {copy.cookieAccept}
          </button>
          <button
            onClick={() => saveChoice('necessary')}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {copy.cookieNecessary}
          </button>
        </div>
      </div>
    </div>
  );
}
