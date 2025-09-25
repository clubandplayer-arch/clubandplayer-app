'use client';

import { useEffect } from 'react';

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  const { error, reset } = props;

  useEffect(() => {
    // Qui puoi inviare a Sentry/GTM; per ora solo console
    // eslint-disable-next-line no-console
    console.error('[error-boundary]', error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Si è verificato un errore</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-300">
        Qualcosa è andato storto durante il rendering di questa sezione.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl border px-4 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Riprova
        </button>
        <a
          href="/feed"
          className="rounded-xl border px-4 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Torna al feed
        </a>
      </div>

      {error?.digest ? <p className="mt-4 text-xs text-neutral-500">Code: {error.digest}</p> : null}
    </main>
  );
}
