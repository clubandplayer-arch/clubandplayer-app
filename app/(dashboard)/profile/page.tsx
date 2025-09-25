'use client';

import { useEffect, useState } from 'react';

type Me = { id: string; handle: string; name: string };

export default function AthletePrivateProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const r = await fetch('/api/athletes/me', { cache: 'no-store', credentials: 'include' });
        const dj = await r.json().catch(() => ({}));
        if (!r.ok || !dj?.athlete)
          throw new Error(dj?.error || 'Impossibile recuperare il profilo');
        setMe(dj.athlete);
      } catch (e: any) {
        setErr(e?.message || 'Errore inatteso');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-lg font-semibold">Il tuo profilo atleta</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Modifica e anteprima del profilo.
        </p>

        {loading ? (
          <div className="mt-4 h-16 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        ) : err ? (
          <div className="mt-4 rounded-lg border border-dashed p-3 text-sm text-red-600 dark:border-neutral-800">
            Errore: {err}
          </div>
        ) : me ? (
          <div className="mt-4 space-y-4">
            <div className="text-sm">
              <div className="font-medium">{me.name}</div>
              <div className="text-neutral-500">
                Handle pubblico: <code>/{`u/${me.handle}`}</code>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={`/u/${me.handle}`}
                className="rounded-md border px-3 py-2 text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Apri profilo pubblico
              </a>
              <a
                href="/feed"
                className="rounded-md border px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Torna al feed
              </a>
            </div>

            <div className="mt-6 rounded-lg border border-dashed p-4 text-sm text-neutral-500 dark:border-neutral-800">
              Editor dettagli atleta in arrivo (ruolo, piede, altezza, peso, link video).
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
