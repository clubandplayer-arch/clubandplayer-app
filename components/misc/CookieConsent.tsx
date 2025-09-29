'use client';

import { useEffect, useState } from 'react';
<<<<<<< HEAD

const STORAGE_KEY = 'cp-consent-v1';
=======
import Link from 'next/link';

const KEY = 'cp.cookie-consent.v1';
>>>>>>> ebeaf98 (feat(gdpr): cookie consent banner + legal pages (privacy/terms))

export default function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
<<<<<<< HEAD
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) setOpen(true);
    } catch {
      // ignora
    }
=======
    // Mostra solo in produzione; se vuoi sempre: rimuovi il check
    if (process.env.NODE_ENV !== 'production') return;
    const v = localStorage.getItem(KEY);
    if (!v) setOpen(true);
>>>>>>> ebeaf98 (feat(gdpr): cookie consent banner + legal pages (privacy/terms))
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
<<<<<<< HEAD
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
=======
      <div className="mx-auto mb-4 w-[min(92%,900px)] rounded-xl border border-neutral-200 bg-white p-4 shadow-lg
                      dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-neutral-700 dark:text-neutral-200">
          Usiamo cookie tecnici e, previo consenso, cookie per statistiche anonime.
          Leggi la <Link href="/legal/privacy" className="text-blue-600 dark:text-blue-400 underline">Privacy</Link> e i
          <Link href="/legal/terms" className="text-blue-600 dark:text-blue-400 underline"> Termini</Link>.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => { localStorage.setItem(KEY, 'accept'); setOpen(false); }}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Accetto
          </button>
          <button
            onClick={() => { localStorage.setItem(KEY, 'reject'); setOpen(false); }}
>>>>>>> ebeaf98 (feat(gdpr): cookie consent banner + legal pages (privacy/terms))
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Solo necessari
          </button>
        </div>
      </div>
    </div>
  );
}
