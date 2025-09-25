'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logga per debug: in prod puoi collegare un logger/telemetria
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-2xl border bg-white p-6 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-lg font-semibold">Si è verificato un errore</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">
          Prova a ricaricare oppure torna indietro. Se il problema persiste, contatta il supporto.
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => reset()}
            className="rounded-md border px-3 py-1.5 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Riprova
          </button>
          <a
            href="/feed"
            className="rounded-md border px-3 py-1.5 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Torna al feed
          </a>
        </div>
      </div>
    </div>
  );
}
