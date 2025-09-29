'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cp-consent-v1';

export default function CookieConsent() {
  const [open, setOpen] = useState(false);

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
          Usiamo cookie tecnici e di misurazione anonima per migliorare il servizio.
          Proseguendo accetti la nostra{' '}
          <a className="underline" href="/legal/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>{' '}
          e i{' '}
          <a className="underline" href="/legal/terms" target="_blank" rel="noopener noreferrer">
            Termini
          </a>.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ consent: 'all', ts: Date.now() })); } catch {}
              setOpen(false);
            }}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Accetta
          </button>
          <button
            onClick={() => {
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ consent: 'necessary', ts: Date.now() })); } catch {}
              setOpen(false);
            }}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Solo necessari
          </button>
        </div>
      </div>
    </div>
  );
}
